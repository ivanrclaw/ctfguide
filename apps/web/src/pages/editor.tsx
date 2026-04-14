import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { MarkdownPreview } from '@/components/markdown-preview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Trash2,
  Save,
  Eye,
  Lock,
  GripVertical,
  Share2,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface Phase {
  id: string;
  title: string;
  content: string;
  password: string;
  order: number;
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

export function Editor() {
  const { guideId } = useParams<{ guideId: string }>();
  const navigate = useNavigate();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activePhase = phases.find((p) => p.id === activePhaseId);

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

  const addPhase = async () => {
    if (!guideId) return;
    try {
      const order = phases.length;
      const phase = await api.post<Phase>('/phases/guide/' + guideId, {
        title: `Phase ${order + 1}`,
        content: '',
        password: '',
        order,
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

  const updatePhaseContent = (phaseId: string, field: 'content' | 'title' | 'password', value: string) => {
    setPhases((prev) =>
      prev.map((p) => (p.id === phaseId ? { ...p, [field]: value } : p)),
    );
  };

  const savePhase = async (phase: Phase) => {
    setIsSaving(true);
    try {
      await api.patch(`/phases/${phase.id}`, {
        title: phase.title,
        content: phase.content,
        password: phase.password,
      });
      toast.success('Phase saved');
    } catch {
      toast.error('Failed to save phase');
    } finally {
      setIsSaving(false);
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
        <div className="flex items-center gap-2">
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
        {/* Sidebar: Phase list */}
        <div className="w-64 shrink-0 border-r bg-muted/30 overflow-y-auto">
          <div className="flex items-center justify-between p-3">
            <span className="text-sm font-medium">Phases</span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={addPhase}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-0.5 px-1">
            {phases.map((phase, index) => (
              <div
                key={phase.id}
                className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                  activePhaseId === phase.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => setActivePhaseId(phase.id)}
              >
                <GripVertical className="h-3 w-3 shrink-0 opacity-40" />
                <div className="flex-1 truncate">
                  <span className="font-medium">{index + 1}.</span> {phase.title}
                </div>
                {phase.password && (
                  <Lock className="h-3 w-3 shrink-0" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 shrink-0 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePhase(phase.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {phases.length === 0 && (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                No phases yet. Click + to add one.
              </div>
            )}
          </div>
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-hidden">
          {activePhase ? (
            <div className="flex h-full flex-col">
              {/* Phase header */}
              <div className="flex items-center gap-3 border-b px-4 py-2">
                <Input
                  value={activePhase.title}
                  onChange={(e) => {
                    updatePhaseContent(activePhase.id, 'title', e.target.value);
                  }}
                  className="h-8 border-none text-lg font-semibold shadow-none focus-visible:ring-0"
                  placeholder="Phase title"
                />
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={activePhase.password}
                    onChange={(e) => {
                      updatePhaseContent(activePhase.id, 'password', e.target.value);
                    }}
                    className="h-7 w-40 text-xs"
                    placeholder="Password (optional)"
                    type="text"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => savePhase(activePhase)}
                  disabled={isSaving}
                >
                  <Save className="mr-1 h-3.5 w-3.5" />
                  Save
                </Button>
              </div>

              {/* Split view: editor + preview */}
              <div className="flex flex-1 overflow-hidden">
                {/* Markdown editor */}
                <div className="flex-1 overflow-y-auto border-r">
                  <textarea
                    value={activePhase.content}
                    onChange={(e) => {
                      updatePhaseContent(activePhase.id, 'content', e.target.value);
                    }}
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