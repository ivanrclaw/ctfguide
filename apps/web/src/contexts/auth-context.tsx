import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  username: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ctfguide_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get<AuthUser>('/auth/me')
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('ctfguide_token');
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; user: AuthUser }>('/auth/login', { email, password });
    localStorage.setItem('ctfguide_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const res = await api.post<{ access_token: string; user: AuthUser }>('/auth/register', { email, username, password });
    localStorage.setItem('ctfguide_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ctfguide_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}