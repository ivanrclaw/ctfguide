import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { MarkdownPreview } from '@/components/markdown-preview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Eye,
  Lock,
  GripVertical,
  Share2,
  ArrowLeft,
  Copy,
  Check,
  Brain,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Phase {
  id: string;
  title: string;
  content: string;
  password: string;
  order: number;
  unlockType: 'none' | 'password' | 'llm';
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

interface Guide {
  id: string;
  title: string;
  description: string;
  ctfName: string;
  category: string;
  difficulty: string;
  published: boolean;
  slug: string | null;
  authorId: string;
  phases: Phase[];
}

function SortablePhaseItem({
  phase,
  index,
  isActive,
  onClick,
  onDelete,
}: {
  phase: Phase;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: phase.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted'
      } ${isDragging ? 'shadow-lg' : ''}`}
      onClick={onClick}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3 shrink-0 opacity-40" />
      </span>
      <div className="flex-1 truncate">
        <span className="font-medium">{index + 1}.</span> {phase.title}
      </div>
      {phase.unlockType === 'password' && <Lock className="h-3 w-3 shrink-0" />}
      {phase.unlockType === 'llm' && <Brain className="h-3 w-3 shrink-0" />}
      <Button
        variant="ghost"
        size="sm"
        className={`h-5 w-5 shrink-0 p-0 opacity-0 group-hover:opacity-100 ${
          isActive ? 'hover:bg-primary-foreground/20' : ''
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function Editor() {
  const { guideId } = useParams<{ guideId: string }>();
  const navigate = useNavigate();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  const activePhase = phases.find((p) => p.id === activePhaseId);

  // Auto-save: track pending changes with ref and debounce timer
  const pendingChanges = useRef<Map<string, Partial<Phase>>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmounted = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchGuide = useCallback(async () => {
    if (!guideId) return;
    try {
      const data = await api.get<Guide>(`/guides/${guideId}`);
      setGuide(data);
      const sorted = (data.phases || []).sort((a, b) => a.order - b.order);
      setPhases(sorted);
      if (sorted.length > 0) {
        setActivePhaseId(sorted[0].id);
      }
      if (data.slug) {
        setShareUrl(`${window.location.origin}/view/${data.slug}`);
      }
    } catch {
      toast.error('Failed to load guide');
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [guideId, navigate]);

  useEffect(() => {
    fetchGuide();
  }, [fetchGuide]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmounted.current = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Flush pending changes to server
  const flushChanges = useCallback(async () => {
    if (isUnmounted.current) return;
    const changes = new Map(pendingChanges.current);
    if (changes.size === 0) return;
    pendingChanges.current.clear();
    setSaveStatus('saving');

    try {
      await Promise.all(
        Array.from(changes.entries()).map(([phaseId, update]) =>
          api.patch(`/phases/${phaseId}`, update),
        ),
      );
      if (!isUnmounted.current) setSaveStatus('saved');
    } catch {
      if (!isUnmounted.current) {
        setSaveStatus('unsaved');
        toast.error('Auto-save failed');
      }
    }
  }, []);

  // Schedule auto-save with debounce
  const scheduleSave = useCallback(() => {
    setSaveStatus('unsaved');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushChanges, 1500);
  }, [flushChanges]);

  const updatePhaseContent = (phaseId: string, field: string, value: string) => {
    setPhases((prev) =>
      prev.map((p) => (p.id === phaseId ? { ...p, [field]: value } : p)),
    );
    // Queue change for auto-save
    const existing = pendingChanges.current.get(phaseId) || {};
    pendingChanges.current.set(phaseId, { ...existing, [field]: value });
    scheduleSave();
  };

  const addPhase = async () => {
    if (!guideId) return;
    try {
      const order = phases.length;
      const phase = await api.post<Phase>('/phases/guide/' + guideId, {
        title: `Phase ${order + 1}`,
        content: '',
        password: '',
        order,
        unlockType: 'none',
        question: '',
        answer: '',
      });
      setPhases((prev) => [...prev, phase]);
      setActivePhaseId(phase.id);
    } catch {
      toast.error('Failed to create phase');
    }
  };

  const deletePhase = async (phaseId: string) => {
    if (!confirm('Delete this phase?')) return;
    try {
      await api.delete(`/phases/${phaseId}`);
      pendingChanges.current.delete(phaseId);
      setPhases((prev) => prev.filter((p) => p.id !== phaseId));
      if (activePhaseId === phaseId) {
        const remaining = phases.filter((p) => p.id !== phaseId);
        setActivePhaseId(remaining[0]?.id || null);
      }
      toast.success('Phase deleted');
    } catch {
      toast.error('Failed to delete phase');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = phases.findIndex((p) => p.id === active.id);
    const newIndex = phases.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic reorder
    const reordered = [...phases];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    const withNewOrder = reordered.map((p, i) => ({ ...p, order: i }));
    setPhases(withNewOrder);

    // Persist to server
    try {
      await api.post(`/phases/guide/${guideId}/reorder`, {
        phaseIds: withNewOrder.map((p) => p.id),
      });
    } catch {
      toast.error('Failed to reorder phases');
      setPhases(phases); // revert
    }
  };

  const publish = async () => {
    if (!guideId) return;
    try {
      const { slug } = await api.post<{ slug: string }>(`/phases/guide/${guideId}/publish`, {});
      const url = `${window.location.origin}/view/${slug}`;
      setShareUrl(url);
      setGuide((prev) => (prev ? { ...prev, published: true, slug } : prev));
      toast.success('Guide published!');
    } catch {
      toast.error('Failed to publish guide');
    }
  };

  const unpublish = async () => {
    if (!guideId) return;
    try {
      await api.post(`/phases/guide/${guideId}/unpublish`, {});
      setShareUrl(null);
      setGuide((prev) => (prev ? { ...prev, published: false, slug: null } : prev));
      toast.success('Guide unpublished');
    } catch {
      toast.error('Failed to unpublish guide');
    }
  };

  const copyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{guide?.title}</h1>
            <p className="text-xs text-muted-foreground">{guide?.ctfName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Save status indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {saveStatus === 'saved' && (
              <>
                <Cloud className="h-3.5 w-3.5 text-green-500" />
                <span className="text-green-600">Saved</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <Cloud className="h-3.5 w-3.5 animate-pulse text-blue-500" />
                <span className="text-blue-600">Saving...</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <CloudOff className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-orange-600">Unsaved</span>
              </>
            )}
          </div>
          {guide?.published ? (
            <>
              <div className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm">
                <Share2 className="h-3.5 w-3.5" />
                <span className="max-w-[200px] truncate text-muted-foreground">{shareUrl}</span>
                <Button variant="ghost" size="sm" className="ml-1 h-6 w-6 p-0" onClick={copyShareUrl}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={unpublish}>
                Unpublish
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={publish}>
              <Share2 className="mr-1 h-4 w-4" />
              Publish & Share
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Phase list with drag & drop */}
        <div className="w-64 shrink-0 border-r bg-muted/30 overflow-y-auto">
          <div className="flex items-center justify-between p-3">
            <span className="text-sm font-medium">Phases</span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={addPhase}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={phases.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0.5 px-1">
                {phases.map((phase, index) => (
                  <SortablePhaseItem
                    key={phase.id}
                    phase={phase}
                    index={index}
                    isActive={activePhaseId === phase.id}
                    onClick={() => setActivePhaseId(phase.id)}
                    onDelete={() => deletePhase(phase.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {phases.length === 0 && (
            <div className="px-2 py-4 text-center text-xs text-muted-foreground">
              No phases yet. Click + to add one.
            </div>
          )}
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-hidden">
          {activePhase ? (
            <div className="flex h-full flex-col">
              {/* Phase header */}
              <div className="border-b px-4 py-2">
                <div className="flex items-center gap-3">
                  <Input
                    value={activePhase.title}
                    onChange={(e) => updatePhaseContent(activePhase.id, 'title', e.target.value)}
                    className="h-8 border-none text-lg font-semibold shadow-none focus-visible:ring-0"
                    placeholder="Phase title"
                  />
                </div>
                {/* Unlock type selector */}
                <div className="mt-2 flex items-end gap-4">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Unlock method</Label>
                    <Select
                      value={activePhase.unlockType}
                      onValueChange={(val) =>
                        updatePhaseContent(activePhase.id, 'unlockType', val)
                      }
                    >
                      <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="flex items-center gap-1.5">
                            <Eye className="h-3 w-3" /> Free access
                          </span>
                        </SelectItem>
                        <SelectItem value="password">
                          <span className="flex items-center gap-1.5">
                            <Lock className="h-3 w-3" /> Password
                          </span>
                        </SelectItem>
                        <SelectItem value="llm">
                          <span className="flex items-center gap-1.5">
                            <Brain className="h-3 w-3" /> AI Question
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {activePhase.unlockType === 'password' && (
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">Password</Label>
                      <Input
                        value={activePhase.password}
                        onChange={(e) =>
                          updatePhaseContent(activePhase.id, 'password', e.target.value)
                        }
                        className="h-8 w-40 text-xs"
                        placeholder="Password"
                        type="text"
                      />
                    </div>
                  )}

                  {activePhase.unlockType === 'llm' && (
                    <>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">Question</Label>
                        <Input
                          value={activePhase.question}
                          onChange={(e) =>
                            updatePhaseContent(activePhase.id, 'question', e.target.value)
                          }
                          className="h-8 w-48 text-xs"
                          placeholder="Question for the user"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">Expected answer</Label>
                        <Input
                          value={activePhase.answer}
                          onChange={(e) =>
                            updatePhaseContent(activePhase.id, 'answer', e.target.value)
                          }
                          className="h-8 w-48 text-xs"
                          placeholder="Reference answer (AI will compare)"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Split view: editor + preview */}
              <div className="flex flex-1 overflow-hidden">
                {/* Markdown editor */}
                <div className="flex-1 overflow-y-auto border-r">
                  <textarea
                    value={activePhase.content}
                    onChange={(e) =>
                      updatePhaseContent(activePhase.id, 'content', e.target.value)
                    }
                    className="h-full w-full resize-none bg-background p-4 font-mono text-sm outline-none"
                    placeholder={"Write your markdown here...\n\n# Phase 1: Reconnaissance\n\n## Steps\n1. Scan the target with nmap\n2. Enumerate directories\n3. Find the vulnerability\n\n```bash\nnmap -sV -sC target\n```"}
                    spellCheck={false}
                  />
                </div>

                {/* Preview */}
                <div className="flex-1 overflow-y-auto bg-muted/20 p-4">
                  <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    Preview
                  </div>
                  {activePhase.content ? (
                    <MarkdownPreview content={activePhase.content} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <p>Start writing to see a preview</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="mb-2 text-lg">Select a phase to edit</p>
                <p className="text-sm">Or create a new one from the sidebar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}