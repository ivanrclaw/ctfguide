import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  ImageIcon,
} from 'lucide-react';
import { ExportGuide } from '@/components/export-guide';
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
import { CollaboratorsPanel } from '@/components/collaborators-panel';
import { useAuth } from '@/contexts/auth-context';
import { useWebSocket } from '@/contexts/websocket-context';

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
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { socket } = useWebSocket();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [onlineCollaborators, setOnlineCollaborators] = useState<Array<{userId: string; username: string}>>([]);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const activePhase = phases.find((p) => p.id === activePhaseId);

  // Auto-save: track pending changes with ref and debounce timer
  const pendingChanges = useRef<Map<string, Partial<Phase>>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmounted = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      toast.error(t('editor.errorLoadGuide'));
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [guideId, navigate, t]);

  useEffect(() => {
    fetchGuide();
  }, [fetchGuide]);

  // WebSocket collaboration lifecycle
  useEffect(() => {
    if (!socket || !guideId || !guide) return;

    // Join the guide room
    socket.emit('guide:join', { guideId });

    // Listen for collaborators joining
    socket.on('collaborator:joined', (data) => {
      setOnlineCollaborators((prev) => {
        if (prev.some((c) => c.userId === data.userId)) return prev;
        return [...prev, { userId: data.userId, username: data.username }];
      });
    });

    // Listen for collaborators leaving
    socket.on('collaborator:left', (data) => {
      setOnlineCollaborators((prev) => prev.filter((c) => c.userId !== data.userId));
    });

    // Listen for initial collaborator list
    socket.on('guide:collaborators', (collaborators) => {
      setOnlineCollaborators(collaborators);
    });

    // Listen for real-time updates from other users
    socket.on('guide:updated', (data) => {
      const { content } = data;
      if (content?.type === 'phase:update' && content?.phaseId && content?.field) {
        setPhases((prev) =>
          prev.map((p) =>
            p.id === content.phaseId ? { ...p, [content.field]: content.value } : p
          )
        );
      } else if (content?.type === 'phase:reorder' && content?.phaseIds) {
        // Reorder phases based on new order
        setPhases((prev) => {
          const orderMap = new Map<string, number>(content.phaseIds.map((id: string, i: number) => [id, i]));
          return [...prev]
            .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
            .map((p, i) => ({ ...p, order: i }));
        });
      } else if (content?.type === 'phase:added' && content?.phase) {
        setPhases((prev) => [...prev, content.phase]);
      } else if (content?.type === 'phase:deleted' && content?.phaseId) {
        setPhases((prev) => prev.filter((p) => p.id !== content.phaseId));
      }
    });

    // Leave on cleanup
    return () => {
      socket.emit('guide:leave');
      socket.off('collaborator:joined');
      socket.off('collaborator:left');
      socket.off('guide:collaborators');
      socket.off('guide:updated');
    };
  }, [socket, guideId, guide]);

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
        toast.error(t('editor.errorAutoSave'));
      }
    }
  }, [t]);

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
    // Broadcast change to other collaborators in real-time
    if (socket?.connected) {
      socket.emit('guide:update', {
        guideId,
        content: { type: 'phase:update', phaseId, field, value },
      });
    }
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
      if (socket?.connected) {
        socket.emit('guide:update', {
          guideId,
          content: { type: 'phase:added', phase },
        });
      }
      setPhases((prev) => [...prev, phase]);
      setActivePhaseId(phase.id);
    } catch {
      toast.error(t('editor.errorCreatePhase'));
    }
  };

  const deletePhase = async (phaseId: string) => {
    if (!confirm(t('editor.confirmDeletePhase'))) return;
    try {
      await api.delete(`/phases/${phaseId}`);
      if (socket?.connected) {
        socket.emit('guide:update', {
          guideId,
          content: { type: 'phase:deleted', phaseId },
        });
      }
      pendingChanges.current.delete(phaseId);
      setPhases((prev) => prev.filter((p) => p.id !== phaseId));
      if (activePhaseId === phaseId) {
        const remaining = phases.filter((p) => p.id !== phaseId);
        setActivePhaseId(remaining[0]?.id || null);
      }
      toast.success(t('editor.successPhaseDeleted'));
    } catch {
      toast.error(t('editor.errorDeletePhase'));
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
      if (socket?.connected) {
        socket.emit('guide:update', {
          guideId,
          content: { type: 'phase:reorder', phaseIds: withNewOrder.map((p) => p.id) },
        });
      }
    } catch {
      toast.error(t('editor.errorReorderPhases'));
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
      toast.success(t('editor.successPublished'));
    } catch {
      toast.error(t('editor.errorPublishFailed'));
    }
  };

  const unpublish = async () => {
    if (!guideId) return;
    try {
      await api.post(`/phases/guide/${guideId}/unpublish`, {});
      setShareUrl(null);
      setGuide((prev) => (prev ? { ...prev, published: false, slug: null } : prev));
      toast.success(t('editor.successUnpublished'));
    } catch {
      toast.error(t('editor.errorUnpublishFailed'));
    }
  };

  const copyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('editor.errorInvalidImageType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('editor.errorImageTooLarge'));
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(
        (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api') + '/uploads/image',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('ctfguide_token')}`,
          },
          body: formData,
        },
      );
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      // Insert markdown image at cursor position
      const imageMarkdown = `![${file.name}](${data.url})`;
      if (activePhaseId && textareaRef.current) {
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentContent = phases.find((p) => p.id === activePhaseId)?.content || '';
        const newContent =
          currentContent.substring(0, start) +
          imageMarkdown +
          currentContent.substring(end);
        updatePhaseContent(activePhaseId, 'content', newContent);
      } else if (activePhaseId) {
        const currentContent = phases.find((p) => p.id === activePhaseId)?.content || '';
        updatePhaseContent(activePhaseId, 'content', currentContent + '\n' + imageMarkdown);
      }
      toast.success(t('editor.successImageUploaded'));
    } catch {
      toast.error(t('editor.errorImageUpload'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(uploadImage);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingImage(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if leaving the drop zone itself
    if (e.currentTarget === e.target) {
      setIsDraggingImage(false);
    }
  };

  const handlePasteImage = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    items.forEach((item) => {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) uploadImage(file);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">{t('editor.loadingEditor')}</p>
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
            {t('editor.back')}
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
                <span className="text-green-600">{t('editor.saved')}</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <Cloud className="h-3.5 w-3.5 animate-pulse text-blue-500" />
                <span className="text-blue-600">{t('editor.saving')}</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <CloudOff className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-orange-600">{t('editor.unsaved')}</span>
              </>
            )}
          </div>
          {onlineCollaborators.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="flex -space-x-1">
                {onlineCollaborators.map((c) => (
                  <div
                    key={c.userId}
                    className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white ring-1 ring-background"
                    title={c.username}
                  >
                    {c.username[0].toUpperCase()}
                  </div>
                ))}
              </div>
              <span>{onlineCollaborators.length} online</span>
            </div>
          )}
          {/* Export dropdown */}
          {guide && <ExportGuide guide={guide} />}
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
                {t('editor.unpublish')}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={publish}>
              <Share2 className="mr-1 h-4 w-4" />
              {t('editor.publishAndShare')}
            </Button>
          )}
          {guide?.authorId === user?.id && (
            <CollaboratorsPanel
              guideId={guide!.id}
              onInviteSent={() => fetchGuide()}
            />
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Phase list with drag & drop */}
        <div className="w-64 shrink-0 border-r bg-muted/30 overflow-y-auto">
          <div className="flex items-center justify-between p-3">
            <span className="text-sm font-medium">{t('editor.phases')}</span>
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
              {t('editor.noPhases')}
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
                    placeholder={t('editor.phaseTitlePlaceholder')}
                  />
                </div>
                {/* Unlock type selector */}
                <div className="mt-2 flex items-end gap-4">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">{t('editor.unlockMethod')}</Label>
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
                            <Eye className="h-3 w-3" /> {t('editor.unlockNone')}
                          </span>
                        </SelectItem>
                        <SelectItem value="password">
                          <span className="flex items-center gap-1.5">
                            <Lock className="h-3 w-3" /> {t('editor.unlockPassword')}
                          </span>
                        </SelectItem>
                        <SelectItem value="llm">
                          <span className="flex items-center gap-1.5">
                            <Brain className="h-3 w-3" /> {t('editor.unlockAiQuestion')}
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {activePhase.unlockType === 'password' && (
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">{t('editor.passwordLabel')}</Label>
                      <Input
                        value={activePhase.password}
                        onChange={(e) =>
                          updatePhaseContent(activePhase.id, 'password', e.target.value)
                        }
                        className="h-8 w-40 text-xs"
                        placeholder={t('editor.passwordPlaceholder')}
                        type="text"
                      />
                    </div>
                  )}

                  {activePhase.unlockType === 'llm' && (
                    <>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">{t('editor.questionLabel')}</Label>
                        <Input
                          value={activePhase.question}
                          onChange={(e) =>
                            updatePhaseContent(activePhase.id, 'question', e.target.value)
                          }
                          className="h-8 w-48 text-xs"
                          placeholder={t('editor.questionPlaceholder')}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">{t('editor.expectedAnswer')}</Label>
                        <Input
                          value={activePhase.answer}
                          onChange={(e) =>
                            updatePhaseContent(activePhase.id, 'answer', e.target.value)
                          }
                          className="h-8 w-48 text-xs"
                          placeholder={t('editor.expectedAnswerPlaceholder')}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Split view: editor + preview */}
              <div className="flex flex-1 overflow-hidden">
                {/* Markdown editor with image drag & drop */}
                <div
                  className={`relative flex-1 overflow-y-auto border-r ${
                    isDraggingImage ? 'bg-primary/5' : ''
                  }`}
                  onDrop={handleImageDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  {/* Drop overlay */}
                  {isDraggingImage && (
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg m-2">
                      <div className="flex flex-col items-center gap-2 text-primary">
                        <ImageIcon className="h-10 w-10" />
                        <span className="text-sm font-medium">{t('editor.dropImage')}</span>
                      </div>
                    </div>
                  )}
                  {/* Uploading indicator */}
                  {isUploadingImage && (
                    <div className="absolute top-2 right-2 z-20 flex items-center gap-2 rounded-md bg-background border px-3 py-1.5 text-xs shadow-md">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      {t('editor.uploadingImage')}
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    value={activePhase.content}
                    onChange={(e) =>
                      updatePhaseContent(activePhase.id, 'content', e.target.value)
                    }
                    onPaste={handlePasteImage}
                    className="h-full w-full resize-none bg-background p-4 font-mono text-sm outline-none"
                    placeholder={t('editor.writeMarkdownPlaceholder')}
                    spellCheck={false}
                  />
                  {/* Image upload button */}
                  <div className="absolute bottom-3 right-3">
                    <label
                      className="flex cursor-pointer items-center gap-1.5 rounded-md bg-background border px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm hover:bg-muted transition-colors"
                      title={t('editor.uploadImage')}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      {t('editor.addImage')}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadImage(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Preview */}
                <div className="flex-1 overflow-y-auto bg-muted/20 p-4">
                  <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {t('editor.preview')}
                  </div>
                  {activePhase.content ? (
                    <MarkdownPreview content={activePhase.content} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <p>{t('editor.startWritingPreview')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="mb-2 text-lg">{t('editor.selectPhaseToEdit')}</p>
                <p className="text-sm">{t('editor.createPhaseFromSidebar')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}