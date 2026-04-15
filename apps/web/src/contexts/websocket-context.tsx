import { createContext, useContext, ReactNode, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let alive = true;

    const connect = () => {
      const token = localStorage.getItem('ctfguide_token');
      if (!token) {
        // No token - disconnect and cleanup
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
          if (alive) {
            setSocket(null);
            setConnected(false);
          }
        }
        return;
      }

      // If already connected, skip
      if (socketRef.current?.connected) return;

      // If socket exists but disconnected (failed), clean it up first
      if (socketRef.current && !socketRef.current.connected) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      // WebSocket needs the server origin, NOT the /api prefix.
      // The /api prefix is for REST routes; socket.io uses path: '/api/socket.io' + namespace '/collaboration'
      const wsUrl = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

      const socketInstance = io(`${wsUrl}/collaboration`, {
        path: '/api/socket.io',
        transports: ['websocket', 'polling'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      socketInstance.on('connect', () => {
        if (alive) setConnected(true);
      });

      socketInstance.on('disconnect', () => {
        if (alive) setConnected(false);
      });

      socketInstance.on('connect_error', () => {
        if (alive) setConnected(false);
      });

      socketRef.current = socketInstance;
      if (alive) setSocket(socketInstance);
    };

    // Initial attempt
    connect();

    // Listen for auth-change events
    const handleAuthChange = () => {
      setTimeout(() => {
        if (!alive) return;
        // Force disconnect and reconnect
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
        setSocket(null);
        setConnected(false);
        connect();
      }, 200);
    };

    window.addEventListener('auth-change', handleAuthChange);

    // Poll every 3s to handle edge cases where event is missed
    const interval = setInterval(() => {
      if (!alive) return;
      const token = localStorage.getItem('ctfguide_token');
      // No token but have socket → disconnect
      if (!token && socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
        return;
      }
      // Have token but no socket → connect
      if (token && !socketRef.current) {
        connect();
        return;
      }
      // Have token and socket but disconnected (failed) and not reconnecting → try again
      if (token && socketRef.current && !socketRef.current.connected) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
        connect();
      }
    }, 3000);

    return () => {
      alive = false;
      window.removeEventListener('auth-change', handleAuthChange);
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ socket, connected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// Helper: emit auth-change event from AuthContext
export function notifyAuthChange() {
  window.dispatchEvent(new Event('auth-change'));
}