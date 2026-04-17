import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
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
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionCode, setSessionCode] = useState('');
  const socketRef = useRef<Socket | null>(null);

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
      toast.error('Failed to load session');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigate]);

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
      // Silently fail - WS will handle updates
    }
  }, [sessionId]);

  // Setup WebSocket connection
  useEffect(() => {
    fetchSessionInfo();
    fetchStats();

    const token = localStorage.getItem('ctfguide_token');
    if (!token || !sessionId) return;

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
      // Stats will be updated by the server
      fetchStats();
    });

    socket.on('session:participantProgress', () => {
      fetchStats();
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
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

      toast.success('Session started! Students can now begin.');
    } catch {
      toast.error('Failed to start session');
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

      toast.success('Session finished');
    } catch {
      toast.error('Failed to finish session');
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading session...</p>
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
    waiting: 'Waiting for students',
    running: 'In Progress',
    finished: 'Finished',
  };

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
              Live Session
            </h1>
            <p className="text-muted-foreground">Real-time progress dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-4 py-1.5 tracking-widest font-mono">
            {sessionCode}
          </Badge>
          <Badge variant="outline" className={statusColors[stats.status]}>
            {stats.status === 'waiting' && <Timer className="mr-1 h-3 w-3" />}
            {stats.status === 'running' && <Play className="mr-1 h-3 w-3" />}
            {statusLabels[stats.status]}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalParticipants}</p>
            <p className="text-xs text-muted-foreground">
              {stats.onlineParticipants} online
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Total Phases
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
              Avg Progress
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
            Start Session — Students can begin solving
          </Button>
        </div>
      )}
      {stats.status === 'running' && (
        <div className="mb-6 flex gap-3">
          <Button onClick={finishSession} variant="destructive" className="gap-2" size="lg">
            <Square className="h-4 w-4" />
            End Session
          </Button>
        </div>
      )}

      {/* Participants Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.participants.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No students have joined yet.</p>
              <p className="text-sm">Share the session code: {sessionCode}</p>
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
                    <span className="ml-1 text-muted-foreground">phases</span>
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
