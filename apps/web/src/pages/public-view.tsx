import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
} from 'lucide-react';
import { toast } from 'sonner';

interface PublicPhase {
  id: string;
  title: string;
  content: string;
  order: number;
  hasPassword: boolean;
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

const difficultyConfig: Record<string, { icon: typeof Shield; label: string; color: string }> = {
  beginner: { icon: Shield, label: 'Beginner', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  easy: { icon: Zap, label: 'Easy', color: 'bg-lime-500/10 text-lime-600 border-lime-500/20' },
  medium: { icon: Flame, label: 'Medium', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  hard: { icon: Bug, label: 'Hard', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  insane: { icon: Skull, label: 'Insane', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
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

const PUBLIC_API = (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

export function PublicView() {
  const { slug } = useParams<{ slug: string }>();
  const [guide, setGuide] = useState<PublicGuide | null>(null);
  const [unlockedPhases, setUnlockedPhases] = useState<Set<string>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [passwordInputs, setPasswordInputs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`${PUBLIC_API}/public/guide/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: PublicGuide) => {
        setGuide(data);
        // Auto-expand first phase if it has no password
        if (data.phases.length > 0 && !data.phases[0].hasPassword) {
          setUnlockedPhases(new Set([data.phases[0].id]));
          setExpandedPhases(new Set([data.phases[0].id]));
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [slug]);

  const verifyPassword = async (phaseId: string) => {
    const password = passwordInputs[phaseId] || '';
    try {
      const res = await fetch(`${PUBLIC_API}/public/phase/${phaseId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.valid) {
        setUnlockedPhases((prev) => new Set([...prev, phaseId]));
        setExpandedPhases((prev) => new Set([...prev, phaseId]));
        setPasswordInputs((prev) => {
          const next = { ...prev };
          delete next[phaseId];
          return next;
        });
        toast.success('Phase unlocked!');
      } else {
        toast.error('Wrong password');
      }
    } catch {
      toast.error('Error verifying password');
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading guide...</p>
        </div>
      </div>
    );
  }

  if (notFound || !guide) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Trophy className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 text-2xl font-bold">Guide Not Found</h1>
          <p className="text-muted-foreground">This guide may have been removed or is not published.</p>
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
              {diff.label}
            </Badge>
            <Badge variant="secondary">
              {emoji} {guide.guide.category}
            </Badge>
          </div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight">{guide.guide.title}</h1>
          <p className="mb-4 text-lg text-muted-foreground">{guide.guide.description}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Hash className="h-3.5 w-3.5" />
              {guide.guide.ctfName}
            </span>
            <span>by {guide.guide.author.username}</span>
            <span>{new Date(guide.guide.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Phase content */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="space-y-4">
          {guide.phases.map((phase, index) => {
            const isUnlocked = unlockedPhases.has(phase.id);
            const isExpanded = expandedPhases.has(phase.id);

            return (
              <Card
                key={phase.id}
                className={`overflow-hidden transition-all ${
                  !isUnlocked && phase.hasPassword
                    ? 'border-dashed opacity-80'
                    : isUnlocked
                    ? 'border-primary/20'
                    : ''
                }`}
              >
                <CardHeader
                  className="cursor-pointer py-3"
                  onClick={() => {
                    if (isUnlocked || !phase.hasPassword) togglePhase(phase.id);
                  }}
                >
                  <div className="flex items-center gap-3">
                    {isUnlocked ? (
                      <Unlock className="h-4 w-4 text-green-500" />
                    ) : phase.hasPassword ? (
                      <Lock className="h-4 w-4 text-orange-500" />
                    ) : (
                      <Unlock className="h-4 w-4 text-muted-foreground" />
                    )}

                    <CardTitle className="text-base">
                      <span className="text-primary">Phase {index + 1}</span>
                      <span className="mx-2 text-muted-foreground">—</span>
                      {phase.title}
                    </CardTitle>

                    <div className="ml-auto">
                      {(isUnlocked || !phase.hasPassword) &&
                        (isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        ))}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (isUnlocked || !phase.hasPassword) && (
                  <CardContent className="border-t pt-4">
                    <MarkdownPreview content={phase.content} />
                  </CardContent>
                )}

                {!isUnlocked && phase.hasPassword && (
                  <CardContent className="border-t bg-muted/30 pt-4">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-muted-foreground">
                        Enter the password to unlock this phase
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Input
                        type="password"
                        placeholder="Phase password"
                        value={passwordInputs[phase.id] || ''}
                        onChange={(e) =>
                          setPasswordInputs((prev) => ({
                            ...prev,
                            [phase.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') verifyPassword(phase.id);
                        }}
                        className="max-w-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => verifyPassword(phase.id)}
                      >
                        <Unlock className="mr-1 h-3.5 w-3.5" />
                        Unlock
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {guide.phases.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Trophy className="mx-auto mb-4 h-12 w-12" />
            <p>This guide has no phases yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}