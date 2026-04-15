import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MarkdownPreview } from '@/components/markdown-preview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  Shield,
  Flame,
  Zap,
  Bug,
  Skull,
  Trophy,
  Hash,
  Brain,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

interface PublicPhase {
  id: string;
  title: string;
  content: string;
  order: number;
  unlockType: 'none' | 'password' | 'llm';
  hasPassword: boolean;
  question: string;
  createdAt: string;
  updatedAt: string;
}

interface PublicGuide {
  guide: {
    id: string;
    title: string;
    description: string;
    ctfName: string;
    category: string;
    difficulty: string;
    published: boolean;
    author: { username: string };
    createdAt: string;
  };
  phases: PublicPhase[];
}

const PROGRESS_KEY = 'ctfguide_progress';

const PUBLIC_API = (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

function loadProgress(slug: string): Set<string> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return new Set();
    const data = JSON.parse(raw);
    return new Set(data[slug] || []);
  } catch {
    return new Set();
  }
}

function saveProgress(slug: string, unlockedIds: Set<string>) {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[slug] = Array.from(unlockedIds);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
  } catch {
    // Silently fail
  }
}

export function PublicView() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation('common');
  const [guide, setGuide] = useState<PublicGuide | null>(null);
  const [unlockedPhases, setUnlockedPhases] = useState<Set<string>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [verifying, setVerifying] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const difficultyConfig: Record<string, { icon: typeof Shield; labelKey: string; color: string }> = {
    beginner: { icon: Shield, labelKey: 'publicView.difficultyBeginner', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    easy: { icon: Zap, labelKey: 'publicView.difficultyEasy', color: 'bg-lime-500/10 text-lime-600 border-lime-500/20' },
    medium: { icon: Flame, labelKey: 'publicView.difficultyMedium', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    hard: { icon: Bug, labelKey: 'publicView.difficultyHard', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
    insane: { icon: Skull, labelKey: 'publicView.difficultyInsane', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  };

  const categoryEmojis: Record<string, string> = {
    web: '🌐',
    pwn: '💥',
    reverse: '🔧',
    crypto: '🔐',
    forensics: '🔍',
    misc: '🎯',
    osint: '🕵️',
    blockchain: '⛓️',
  };

  // Add unlocked phase and persist
  const addUnlocked = useCallback((phaseId: string) => {
    setUnlockedPhases((prev) => {
      const next = new Set([...prev, phaseId]);
      if (slug) saveProgress(slug, next);
      return next;
    });
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    fetch(`${PUBLIC_API}/public/guide/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: PublicGuide) => {
        setGuide(data);
        // Load persisted progress
        const saved = loadProgress(slug);
        // Auto-unlock phases with no unlock type
        const autoUnlocked = data.phases
          .filter((p) => p.unlockType === 'none')
          .map((p) => p.id);
        const initial = new Set([...saved, ...autoUnlocked]);
        setUnlockedPhases(initial);
        if (slug) saveProgress(slug, initial);
        // Auto-expand first accessible phase
        if (data.phases.length > 0) {
          const firstAccessible = data.phases.find((p) => initial.has(p.id));
          if (firstAccessible) {
            setExpandedPhases(new Set([firstAccessible.id]));
          }
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [slug]);

  const verifyPhase = async (phase: PublicPhase) => {
    const userInput = userInputs[phase.id] || '';
    if (!userInput.trim()) {
      toast.error(t('publicView.errorEnterAnswer'));
      return;
    }

    setVerifying((prev) => new Set([...prev, phase.id]));
    try {
      const body: Record<string, string> = {};
      if (phase.unlockType === 'password') {
        body.password = userInput;
      } else if (phase.unlockType === 'llm') {
        body.answer = userInput;
      }

      const res = await fetch(`${PUBLIC_API}/public/phase/${phase.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.valid) {
        addUnlocked(phase.id);
        setExpandedPhases((prev) => new Set([...prev, phase.id]));
        setUserInputs((prev) => {
          const next = { ...prev };
          delete next[phase.id];
          return next;
        });
        toast.success(t('publicView.successUnlocked'));
      } else {
        toast.error(
          phase.unlockType === 'password'
            ? t('publicView.errorWrongPassword')
            : t('publicView.errorWrongAnswer'),
        );
      }
    } catch {
      toast.error(t('publicView.errorVerifyFailed'));
    } finally {
      setVerifying((prev) => {
        const next = new Set(prev);
        next.delete(phase.id);
        return next;
      });
    }
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const resetProgress = () => {
    if (!slug) return;
    setUnlockedPhases(new Set());
    setExpandedPhases(new Set());
    setUserInputs({});
    saveProgress(slug, new Set());
    // Re-auto-unlock free phases
    if (guide) {
      const autoUnlocked = guide.phases
        .filter((p) => p.unlockType === 'none')
        .map((p) => p.id);
      const initial = new Set(autoUnlocked);
      setUnlockedPhases(initial);
      saveProgress(slug, initial);
      if (autoUnlocked.length > 0) {
        setExpandedPhases(new Set([autoUnlocked[0]]));
      }
    }
    toast.success(t('publicView.progressReset'));
  };

  const isPhaseLocked = (phase: PublicPhase) => {
    return phase.unlockType !== 'none' && !unlockedPhases.has(phase.id);
  };

  // Count progress
  const lockedCount = guide
    ? guide.phases.filter((p) => p.unlockType !== 'none' && !unlockedPhases.has(p.id)).length
    : 0;
  const totalLocked = guide
    ? guide.phases.filter((p) => p.unlockType !== 'none').length
    : 0;
  const hasProgress = totalLocked > 0 && lockedCount < totalLocked;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">{t('publicView.loadingGuide')}</p>
        </div>
      </div>
    );
  }

  if (notFound || !guide) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Trophy className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 text-2xl font-bold">{t('publicView.notFound')}</h1>
          <p className="text-muted-foreground">{t('publicView.notFoundDescription')}</p>
        </div>
      </div>
    );
  }

  const diff = difficultyConfig[guide.guide.difficulty] || difficultyConfig.beginner;
  const DiffIcon = diff.icon;
  const emoji = categoryEmojis[guide.guide.category] || '🏁';

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="relative border-b bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="outline" className={diff.color}>
              <DiffIcon className="mr-1 h-3 w-3" />
              {t(diff.labelKey)}
            </Badge>
            <Badge variant="secondary">
              {emoji} {guide.guide.category}
            </Badge>
          </div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight">{guide.guide.title}</h1>
          <p className="mb-4 text-lg text-muted-foreground">{guide.guide.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                {guide.guide.ctfName}
              </span>
              <span>{t('publicView.by')} {guide.guide.author.username}</span>
              <span>{new Date(guide.guide.createdAt).toLocaleDateString()}</span>
            </div>
            {hasProgress && (
              <Button variant="outline" size="sm" onClick={resetProgress}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                {t('publicView.resetProgress')}
              </Button>
            )}
          </div>
          {/* Progress bar */}
          {totalLocked > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{t('publicView.progress')}: {totalLocked - lockedCount}/{totalLocked}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${((totalLocked - lockedCount) / totalLocked) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phase content */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="space-y-4">
          {guide.phases.map((phase, index) => {
            const locked = isPhaseLocked(phase);
            const isExpanded = expandedPhases.has(phase.id);

            return (
              <Card
                key={phase.id}
                className={`overflow-hidden transition-all ${
                  locked
                    ? 'border-dashed opacity-80'
                    : unlockedPhases.has(phase.id)
                    ? 'border-primary/20'
                    : ''
                }`}
              >
                <CardHeader
                  className="cursor-pointer py-3"
                  onClick={() => {
                    if (!locked) togglePhase(phase.id);
                  }}
                >
                  <div className="flex items-center gap-3">
                    {locked ? (
                      phase.unlockType === 'password' ? (
                        <Lock className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Brain className="h-4 w-4 text-purple-500" />
                      )
                    ) : unlockedPhases.has(phase.id) ? (
                      <Unlock className="h-4 w-4 text-green-500" />
                    ) : (
                      <Unlock className="h-4 w-4 text-muted-foreground" />
                    )}

                    <CardTitle className="text-base">
                      <span className="text-primary">{t('publicView.phase')} {index + 1}</span>
                      <span className="mx-2 text-muted-foreground">—</span>
                      {phase.title}
                    </CardTitle>

                    <div className="ml-auto flex items-center gap-2">
                      {locked && phase.unlockType === 'llm' && (
                        <Badge variant="secondary" className="text-xs">
                          <Brain className="mr-1 h-3 w-3" />
                          {t('editor.unlockAiQuestion')}
                        </Badge>
                      )}
                      {!locked && (
                        isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && !locked && (
                  <CardContent className="border-t pt-4">
                    <MarkdownPreview content={phase.content} />
                  </CardContent>
                )}

                {locked && (
                  <CardContent className="border-t bg-muted/30 pt-4">
                    {phase.unlockType === 'password' && (
                      <>
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-muted-foreground">
                            {t('publicView.enterPassword')}
                          </span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Input
                            type="password"
                            placeholder={t('publicView.phasePasswordPlaceholder')}
                            value={userInputs[phase.id] || ''}
                            onChange={(e) =>
                              setUserInputs((prev) => ({
                                ...prev,
                                [phase.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') verifyPhase(phase);
                            }}
                            className="max-w-xs"
                          />
                          <Button
                            size="sm"
                            onClick={() => verifyPhase(phase)}
                            disabled={verifying.has(phase.id)}
                          >
                            <Unlock className="mr-1 h-3.5 w-3.5" />
                            {t('publicView.unlock')}
                          </Button>
                        </div>
                      </>
                    )}

                    {phase.unlockType === 'llm' && (
                      <>
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-purple-500" />
                          <span className="text-sm text-muted-foreground">
                            {t('publicView.answerQuestion')}
                          </span>
                        </div>
                        {phase.question && (
                          <div className="mt-3 rounded-md border bg-background p-3">
                            <p className="text-sm font-medium">{phase.question}</p>
                          </div>
                        )}
                        <div className="mt-3 flex gap-2">
                          <Input
                            type="text"
                            placeholder={t('publicView.yourAnswerPlaceholder')}
                            value={userInputs[phase.id] || ''}
                            onChange={(e) =>
                              setUserInputs((prev) => ({
                                ...prev,
                                [phase.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') verifyPhase(phase);
                            }}
                            className="max-w-md"
                          />
                          <Button
                            size="sm"
                            onClick={() => verifyPhase(phase)}
                            disabled={verifying.has(phase.id)}
                          >
                            {verifying.has(phase.id) ? (
                              <>
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                {t('publicView.checking')}
                              </>
                            ) : (
                              <>
                                <Brain className="mr-1 h-3.5 w-3.5" />
                                {t('publicView.submit')}
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {guide.phases.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Trophy className="mx-auto mb-4 h-12 w-12" />
            <p>{t('publicView.noPhases')}</p>
          </div>
        )}
      </div>
    </div>
  );
}