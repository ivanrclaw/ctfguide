import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Radio,
  Users,
  CheckCircle2,
  Timer,
  ArrowLeft,
  Play,
  Square,
  BarChart3,
  Wifi,
  WifiOff,
  Monitor,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

const API = (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');
const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

interface Participant {
  id: string;
  name: string;
  isOnline: boolean;
  unlockedPhaseIndex: number;
  unlockedCount: number;
  progress: number;
  connectedAt: string;
}

interface SessionStats {
  sessionId: string;
  code: string;
  status: 'waiting' | 'running' | 'finished';
  totalPhases: number;
  totalParticipants: number;
  onlineParticipants: number;
  participants: Participant[];
}

export function HostLiveSession() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { t } = useTranslation('common');
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionCode, setSessionCode] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSessionInfo = useCallback(async () => {
    if (!sessionId) return;
    try {
      const token = localStorage.getItem('ctfguide_token');
      const res = await fetch(`${API}/live-sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch session');
      const data = await res.json();
      setSessionCode(data.code);
    } catch {
      toast.error(t('liveSession.failedLoad'));
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigate, t]);

  const fetchStats = useCallback(async () => {
    if (!sessionId) return;
    try {
      const token = localStorage.getItem('ctfguide_token');
      const res = await fetch(`${API}/live-sessions/${sessionId}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch {
      // Silently fail - WS or next poll will handle
    }
  }, [sessionId]);

  // Setup WebSocket + polling connection
  useEffect(() => {
    fetchSessionInfo();
    fetchStats();

    const token = localStorage.getItem('ctfguide_token');
    if (!token || !sessionId) return;

    // WebSocket for real-time events
    const socket = io(`${WS_URL}/live-sessions`, {
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      socket.emit('host:join', { sessionId });
    });

    socket.on('session:stats', (data: SessionStats) => {
      setStats(data);
    });

    socket.on('session:participantJoined', () => {
      fetchStats();
    });

    socket.on('session:participantProgress', () => {
      fetchStats();
    });

    socketRef.current = socket;

    // Polling fallback: refresh stats every 3 seconds
    pollRef.current = setInterval(() => {
      fetchStats();
    }, 3000);

    return () => {
      socket.disconnect();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId, fetchSessionInfo, fetchStats]);

  const startSession = async () => {
    if (!sessionId) return;
    try {
      const token = localStorage.getItem('ctfguide_token');
      const res = await fetch(`${API}/live-sessions/${sessionId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to start session');

      if (socketRef.current) {
        socketRef.current.emit('session:started', { sessionId });
      }

      toast.success(t('liveSession.sessionStarted'));
    } catch {
      toast.error(t('liveSession.failedStart'));
    }
  };

  const finishSession = async () => {
    if (!sessionId) return;
    try {
      const token = localStorage.getItem('ctfguide_token');
      const res = await fetch(`${API}/live-sessions/${sessionId}/finish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to finish session');

      if (socketRef.current) {
        socketRef.current.emit('session:finished', { sessionId });
      }

      toast.success(t('liveSession.sessionFinished'));
    } catch {
      toast.error(t('liveSession.failedFinish'));
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    toast.success(t('liveSession.codeCopied'));
  };

  if (loading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">{t('liveSession.loading')}</p>
        </div>
      </div>
    );
  }

  const statusColors = {
    waiting: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    running: 'bg-green-500/10 text-green-600 border-green-500/20',
    finished: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  };

  const statusLabels = {
    waiting: t('liveSession.waitingStudents'),
    running: t('liveSession.inProgress'),
    finished: t('liveSession.finished'),
  };

  const projectorUrl = `${window.location.origin}/live/projector/${sessionCode}`;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Radio className="h-6 w-6 text-primary animate-pulse" />
              {t('liveSession.title')}
            </h1>
            <p className="text-muted-foreground">{t('liveSession.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="text-lg px-4 py-1.5 tracking-widest font-mono cursor-pointer hover:bg-primary/5"
            onClick={copyCode}
          >
            {sessionCode}
            <Copy className="ml-2 h-3.5 w-3.5" />
          </Badge>
          <Badge variant="outline" className={statusColors[stats.status]}>
            {stats.status === 'waiting' && <Timer className="mr-1 h-3 w-3" />}
            {stats.status === 'running' && <Play className="mr-1 h-3 w-3" />}
            {statusLabels[stats.status]}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open(projectorUrl, '_blank')}
          >
            <Monitor className="h-4 w-4" />
            {t('liveSession.projectorView')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('liveSession.totalStudents')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalParticipants}</p>
            <p className="text-xs text-muted-foreground">
              {stats.onlineParticipants} {t('liveSession.online')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('liveSession.totalPhases')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalPhases}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {t('liveSession.avgProgress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {stats.totalParticipants > 0
                ? Math.round(
                    stats.participants.reduce((sum, p) => sum + p.progress, 0) /
                      stats.participants.length,
                  )
                : 0}
              %
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      {stats.status === 'waiting' && (
        <div className="mb-6 flex gap-3">
          <Button onClick={startSession} className="gap-2" size="lg">
            <Play className="h-4 w-4" />
            {t('liveSession.startSession')}
          </Button>
        </div>
      )}
      {stats.status === 'running' && (
        <div className="mb-6 flex gap-3">
          <Button onClick={finishSession} variant="destructive" className="gap-2" size="lg">
            <Square className="h-4 w-4" />
            {t('liveSession.endSession')}
          </Button>
        </div>
      )}

      {/* Participants Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('liveSession.participantsProgress')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.participants.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>{t('liveSession.noStudentsYet')}</p>
              <p className="text-sm">{t('liveSession.shareCode')} {sessionCode}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.participants.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 rounded-lg border p-3 transition-colors"
                >
                  <span className="w-6 text-sm text-muted-foreground font-mono">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{p.name}</span>
                      {p.isOnline ? (
                        <Wifi className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5 text-gray-400" />
                      )}
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <span className="font-medium">{p.unlockedCount}/{stats.totalPhases}</span>
                    <span className="ml-1 text-muted-foreground">{t('liveSession.phases')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
