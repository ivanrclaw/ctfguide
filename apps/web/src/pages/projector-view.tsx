import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Badge } from '@/components/ui/badge';
import {
  Radio,
  Users,
  CheckCircle2,
  Trophy,
  Wifi,
  WifiOff,
  Monitor,
} from 'lucide-react';

const PUBLIC_API = (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');
const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

interface Participant {
  name: string;
  isOnline: boolean;
  unlockedCount: number;
  progress: number;
}

interface ProjectorInfo {
  sessionId: string;
  code: string;
  status: 'waiting' | 'running' | 'finished';
  title: string;
  ctfName: string;
  category: string;
  difficulty: string;
  totalPhases: number;
  totalParticipants: number;
  onlineParticipants: number;
  participants: Participant[];
}

export function ProjectorView() {
  const { code } = useParams<{ code: string }>();
  const [info, setInfo] = useState<ProjectorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchInfo = useCallback(async () => {
    if (!code) return;
    try {
      const res = await fetch(`${PUBLIC_API}/public/live-sessions/${code}/projector-info`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setInfo(data);
    } catch {
      // Silently fail - polling or WS will retry
    } finally {
      if (loading) setLoading(false);
    }
  }, [code, loading]);

  // Initial fetch
  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  // WebSocket + polling
  useEffect(() => {
    if (!code || !info) return;

    // Connect without auth token (projector is public)
    const socket = io(`${WS_URL}/live-sessions`, {
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socket.on('connect', () => {
      socket.emit('projector:join', { sessionId: info.sessionId });
    });

    socket.on('projector:info', (data: ProjectorInfo) => {
      setInfo(data);
    });

    socket.on('session:participantJoined', () => {
      fetchInfo();
    });

    socket.on('session:participantProgress', () => {
      fetchInfo();
    });

    socket.on('session:started', () => {
      fetchInfo();
    });

    socket.on('session:finished', () => {
      fetchInfo();
    });

    socketRef.current = socket;

    // Polling fallback every 3s
    pollRef.current = setInterval(() => {
      fetchInfo();
    }, 3000);

    return () => {
      socket.disconnect();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [code, info?.sessionId, fetchInfo]);

  if (loading || !info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-2xl text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  const joinUrl = `${window.location.origin}/live/join`;
  const statusColors = {
    waiting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    running: 'bg-green-500/20 text-green-400 border-green-500/30',
    finished: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const statusLabels = {
    waiting: 'Waiting for students',
    running: 'In Progress',
    finished: 'Finished',
  };

  const difficultyEmojis: Record<string, string> = {
    beginner: '🟢',
    easy: '🔵',
    medium: '🟠',
    hard: '🔴',
    insane: '🟣',
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar */}
      <div className="border-b border-gray-800 bg-gray-900 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Radio className="h-6 w-6 text-blue-400 animate-pulse" />
            <h1 className="text-2xl font-bold">{info.title}</h1>
            <span className="text-lg text-gray-400">{info.ctfName}</span>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className={`text-lg px-4 py-1.5 ${statusColors[info.status]}`}>
              {statusLabels[info.status]}
            </Badge>
            {difficultyEmojis[info.difficulty] && (
              <span className="text-2xl">{difficultyEmojis[info.difficulty]}</span>
            )}
          </div>
        </div>
      </div>

      {/* WAITING STATE: Show join info */}
      {info.status === 'waiting' && (
        <div className="flex flex-col items-center justify-center px-8 py-16">
          {/* Join URL and code */}
          <div className="text-center mb-16">
            <Monitor className="mx-auto mb-8 h-24 w-24 text-blue-400" />
            <h2 className="text-4xl font-bold mb-4">Join the Session!</h2>
            <p className="text-2xl text-gray-400 mb-8">Go to:</p>
            <div className="rounded-2xl bg-gray-800 px-12 py-6 mb-8">
              <p className="text-5xl font-bold text-blue-400 tracking-wide">{joinUrl}</p>
            </div>
            <p className="text-xl text-gray-400 mb-4">And enter the code:</p>
            <div className="rounded-2xl bg-blue-600 px-16 py-8 inline-block">
              <p className="text-8xl font-bold tracking-widest font-mono">{info.code}</p>
            </div>
          </div>

          {/* Live participant count */}
          <div className="flex items-center gap-4 text-2xl text-gray-400">
            <Users className="h-8 w-8" />
            <span>{info.totalParticipants} student{info.totalParticipants !== 1 ? 's' : ''} joined</span>
            <span className="text-green-400">({info.onlineParticipants} online)</span>
          </div>

          {/* Participants list */}
          {info.participants.length > 0 && (
            <div className="mt-12 w-full max-w-4xl">
              <h3 className="text-xl text-gray-400 mb-4 text-center">Participants</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {info.participants.map((p, i) => (
                  <div
                    key={p.name}
                    className="rounded-xl bg-gray-800 p-4 text-center transition-all"
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {p.isOnline ? (
                        <Wifi className="h-4 w-4 text-green-400" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-gray-600" />
                      )}
                      <span className="font-semibold text-lg truncate">{p.name}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RUNNING STATE: Show leaderboard + progress */}
      {info.status === 'running' && (
        <div className="flex flex-col items-center px-8 py-12">
          {/* Stats bar */}
          <div className="w-full max-w-6xl mb-8 grid grid-cols-3 gap-6">
            <div className="rounded-2xl bg-gray-800 p-6 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-blue-400" />
              <p className="text-4xl font-bold">{info.totalParticipants}</p>
              <p className="text-sm text-gray-400">Students</p>
            </div>
            <div className="rounded-2xl bg-gray-800 p-6 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-400" />
              <p className="text-4xl font-bold">{info.totalPhases}</p>
              <p className="text-sm text-gray-400">Phases</p>
            </div>
            <div className="rounded-2xl bg-gray-800 p-6 text-center">
              <Trophy className="mx-auto mb-2 h-8 w-8 text-yellow-400" />
              <p className="text-4xl font-bold">
                {info.totalParticipants > 0
                  ? Math.round(
                      info.participants.reduce((sum, p) => sum + p.progress, 0) /
                        info.participants.length,
                    )
                  : 0}
                %
              </p>
              <p className="text-sm text-gray-400">Avg Progress</p>
            </div>
          </div>

          {/* Session code (small, for reference) */}
          <div className="mb-8 flex items-center gap-3">
            <span className="text-sm text-gray-500">Session code:</span>
            <Badge variant="outline" className="text-xl px-4 py-1 font-mono tracking-widest">
              {info.code}
            </Badge>
          </div>

          {/* Leaderboard */}
          <div className="w-full max-w-4xl">
            <h2 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-400" />
              Leaderboard
            </h2>
            <div className="space-y-3">
              {info.participants
                .sort((a, b) => b.unlockedCount - a.unlockedCount)
                .map((p, i) => (
                  <div
                    key={p.name}
                    className={`flex items-center gap-4 rounded-xl p-4 transition-all ${
                      i === 0
                        ? 'bg-yellow-500/10 border border-yellow-500/30'
                        : i === 1
                        ? 'bg-gray-400/10 border border-gray-400/30'
                        : i === 2
                        ? 'bg-orange-500/10 border border-orange-500/30'
                        : 'bg-gray-800/50 border border-gray-800'
                    }`}
                  >
                    <span className="w-10 text-2xl font-bold text-center">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xl truncate">{p.name}</span>
                        {p.isOnline ? (
                          <Wifi className="h-4 w-4 text-green-400" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div className="h-3 rounded-full bg-gray-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            p.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-2xl font-bold">{p.unlockedCount}/{info.totalPhases}</span>
                      <p className="text-sm text-gray-400">{p.progress}%</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* FINISHED STATE */}
      {info.status === 'finished' && (
        <div className="flex flex-col items-center px-8 py-16">
          <Trophy className="mb-8 h-32 w-32 text-yellow-400" />
          <h1 className="text-6xl font-bold mb-4">Session Complete!</h1>
          <p className="text-2xl text-gray-400 mb-12">{info.title}</p>

          {/* Final leaderboard */}
          <div className="w-full max-w-4xl">
            <div className="space-y-3">
              {info.participants
                .sort((a, b) => b.unlockedCount - a.unlockedCount)
                .slice(0, 10)
                .map((p, i) => (
                  <div
                    key={p.name}
                    className={`flex items-center gap-4 rounded-xl p-4 ${
                      i === 0
                        ? 'bg-yellow-500/20 border-2 border-yellow-500/40'
                        : i === 1
                        ? 'bg-gray-400/10 border border-gray-400/30'
                        : i === 2
                        ? 'bg-orange-500/10 border border-orange-500/30'
                        : 'bg-gray-800/50 border border-gray-800'
                    }`}
                  >
                    <span className="w-10 text-3xl font-bold text-center">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </span>
                    <span className="font-bold text-2xl flex-1">{p.name}</span>
                    <span className="text-2xl font-bold text-primary">
                      {p.unlockedCount}/{info.totalPhases}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
