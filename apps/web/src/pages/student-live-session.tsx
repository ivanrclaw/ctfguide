import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
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
  Radio,
  Users,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

const PUBLIC_API = (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');
const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

interface Phase {
  id: string;
  title: string;
  content: string;
  order: number;
  unlockType: 'none' | 'password' | 'llm';
  hasPassword: boolean;
  question: string;
}

interface GuideInfo {
  id: string;
  title: string;
  description: string;
  ctfName: string;
  category: string;
  difficulty: string;
}

export function StudentLiveSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const { code, name } = useParams<{ code: string; name: string }>();
  const { t } = useTranslation('common');

  const [phases, setPhases] = useState<Phase[]>([]);
  const [guide, setGuide] = useState<GuideInfo | null>(null);
  const [unlockedPhases, setUnlockedPhases] = useState<Set<string>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [verifying, setVerifying] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'running' | 'finished'>('waiting');

  const socketRef = useRef<Socket | null>(null);
  const participantRef = useRef<any>(location.state?.participant || null);

  const decodedName = decodeURIComponent(name || '');

  const difficultyConfig: Record<string, { icon: typeof Shield; labelKey: string; color: string }> = {
    beginner: { icon: Shield, labelKey: 'publicView.difficultyBeginner', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    easy: { icon: Zap, labelKey: 'publicView.difficultyEasy', color: 'bg-lime-500/10 text-lime-600 border-lime-500/20' },
    medium: { icon: Flame, labelKey: 'publicView.difficultyMedium', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    hard: { icon: Bug, labelKey: 'publicView.difficultyHard', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
    insane: { icon: Skull, labelKey: 'publicView.difficultyInsane', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  };

  // Fetch guide phases
  useEffect(() => {
    if (!code) return;

    // Load phases via session context
    const loadSessionPhases = async () => {
      try {
        const sessionRes = await fetch(`${PUBLIC_API}/public/live-sessions/${code}`);
        if (!sessionRes.ok) {
          navigate('/live/join');
          return;
        }
        const sessionData = await sessionRes.json();
        setGuide(sessionData.guide);
        setSessionStatus(sessionData.status);

        // Fetch phases via the dedicated endpoint
        const phasesRes = await fetch(`${PUBLIC_API}/public/live-sessions/${code}/phases`);
        if (phasesRes.ok) {
          const phasesData = await phasesRes.json();
          setPhases(phasesData);
        }
      } catch {
        toast.error('Failed to load session');
        navigate('/live/join');
      } finally {
        setIsLoading(false);
      }
    };

    // If we have session info from state, use it
    if (location.state?.session?.guide) {
      setGuide(location.state.session.guide);
      setSessionStatus(location.state.session.status);
      // Fetch phases via dedicated endpoint
      fetch(`${PUBLIC_API}/public/live-sessions/${code}/phases`)
        .then((res) => res.ok ? res.json() : Promise.reject())
        .then((data) => {
          setPhases(data);
        })
        .catch(() => {
          toast.error('Failed to load guide phases');
        })
        .finally(() => setIsLoading(false));
    } else {
      loadSessionPhases();
    }
  }, [code, navigate, location.state]);

  // Setup WebSocket
  useEffect(() => {
    if (!code || !name) return;

    const socket = io(`${WS_URL}/live-sessions`, {
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],
      query: { name: decodedName },
      reconnection: true,
    });

    socket.on('connect', () => {
      if (participantRef.current) {
        socket.emit('student:join', {
          sessionId: participantRef.current.sessionId,
          name: decodedName,
          participantId: participantRef.current.id,
        });
      }
    });

    socket.on('session:started', () => {
      setSessionStatus('running');
      toast.success('Session started! You can now begin solving.');
    });

    socket.on('session:finished', () => {
      setSessionStatus('finished');
      toast.info('Session has ended.');
    });

    socket.on('session:participantProgress', (data: any) => {
      if (data.name === decodedName) {
        // Update own progress if needed
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [code, name, decodedName]);

  const addUnlocked = useCallback((phaseId: string) => {
    setUnlockedPhases((prev) => new Set([...prev, phaseId]));
  }, []);

  const verifyPhase = async (phase: Phase) => {
    const userInput = userInputs[phase.id] || '';
    if (!userInput.trim()) {
      toast.error(t('publicView.errorEnterAnswer'));
      return;
    }

    if (sessionStatus !== 'running' && phase.unlockType !== 'none') {
      toast.error('Session is not running yet');
      return;
    }

    setVerifying((prev) => new Set([...prev, phase.id]));
    try {
      const body: Record<string, string> = { name: decodedName };
      if (phase.unlockType === 'password') {
        body.password = userInput;
      } else if (phase.unlockType === 'llm') {
        body.answer = userInput;
      }

      const res = await fetch(
        `${PUBLIC_API}/public/live-sessions/${code}/phase/${phase.id}/unlock`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();

      if (data.valid) {
        addUnlocked(phase.id);
        setExpandedPhases((prev) => new Set([...prev, phase.id]));
        setUserInputs((prev) => {
          const next = { ...prev };
          delete next[phase.id];
          return next;
        });

        // Emit to WebSocket
        if (socketRef.current && participantRef.current) {
          socketRef.current.emit('student:answer', {
            sessionId: participantRef.current.sessionId,
            name: decodedName,
            phaseId: phase.id,
            valid: true,
            unlockedPhaseIndex: data.unlockedPhaseIndex,
          });
        }

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

  const isPhaseLocked = (phase: Phase) => {
    return phase.unlockType !== 'none' && !unlockedPhases.has(phase.id);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!guide || phases.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Trophy className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 text-2xl font-bold">Guide not found</h1>
          <Button onClick={() => navigate('/live/join')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Join
          </Button>
        </div>
      </div>
    );
  }

  const diff = difficultyConfig[guide.difficulty] || difficultyConfig.beginner;
  const DiffIcon = diff.icon;
  const totalLocked = phases.filter((p) => p.unlockType !== 'none').length;
  const unlockedCount = phases.filter((p) => p.unlockType !== 'none' && unlockedPhases.has(p.id)).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative border-b bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">Live Session</span>
            {sessionStatus === 'waiting' && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                Waiting to start...
              </Badge>
            )}
            {sessionStatus === 'running' && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Active
              </Badge>
            )}
            {sessionStatus === 'finished' && (
              <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">
                Finished
              </Badge>
            )}
          </div>

          <h1 className="mb-2 text-3xl font-bold tracking-tight">{guide.title}</h1>
          <p className="mb-3 text-muted-foreground">{guide.description}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Hash className="h-3.5 w-3.5" />
              {guide.ctfName}
            </span>
            <Badge variant="outline" className={diff.color}>
              <DiffIcon className="mr-1 h-3 w-3" />
              {t(diff.labelKey)}
            </Badge>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {decodedName}
            </span>
          </div>

          {totalLocked > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progress: {unlockedCount}/{totalLocked}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${totalLocked > 0 ? (unlockedCount / totalLocked) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Phases */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="space-y-4">
          {phases.map((phase, index) => {
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
                      <span className="text-primary">Phase {index + 1}</span>
                      <span className="mx-2 text-muted-foreground">—</span>
                      {phase.title}
                    </CardTitle>

                    <div className="ml-auto flex items-center gap-2">
                      {locked && phase.unlockType === 'llm' && (
                        <Badge variant="secondary" className="text-xs">
                          <Brain className="mr-1 h-3 w-3" />
                          AI Question
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
                          <span className="text-sm text-muted-foreground">Enter password to unlock</span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Input
                            type="password"
                            placeholder="Password"
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
                            disabled={sessionStatus !== 'running'}
                          />
                          <Button
                            size="sm"
                            onClick={() => verifyPhase(phase)}
                            disabled={verifying.has(phase.id) || sessionStatus !== 'running'}
                          >
                            {verifying.has(phase.id) ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Unlock className="mr-1 h-3.5 w-3.5" />
                            )}
                            Unlock
                          </Button>
                        </div>
                      </>
                    )}

                    {phase.unlockType === 'llm' && (
                      <>
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-purple-500" />
                          <span className="text-sm text-muted-foreground">Answer the question</span>
                        </div>
                        {phase.question && (
                          <div className="mt-3 rounded-md border bg-background p-3">
                            <p className="text-sm font-medium">{phase.question}</p>
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <Input
                            type="text"
                            placeholder="Your answer"
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
                            disabled={sessionStatus !== 'running'}
                          />
                          <Button
                            size="sm"
                            onClick={() => verifyPhase(phase)}
                            disabled={verifying.has(phase.id) || sessionStatus !== 'running'}
                          >
                            {verifying.has(phase.id) ? (
                              <>
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                Checking...
                              </>
                            ) : (
                              <>
                                <Brain className="mr-1 h-3.5 w-3.5" />
                                Submit
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
      </div>
    </div>
  );
}
