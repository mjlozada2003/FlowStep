import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';

import type { AuthSession } from '@/services/api/auth';

const STORAGE_KEY = 'flowstep_auth_session';

function getStoredSession(): AuthSession | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.accessToken === 'string') {
          return parsed;
        }
      }
    } catch {}
  }
  return null;
}

interface AuthContextValue {
  session: AuthSession | null;
  token: string | null;
  user: AuthSession['user'] | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSessionState] = useState<AuthSession | null>(getStoredSession);

  const setSession = useCallback((newSession: AuthSession) => {
    setSessionState(newSession);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      } catch {}
    }
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      token: session?.accessToken ?? null,
      user: session?.user ?? null,
      setSession,
      clearSession,
    }),
    [session, setSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider.');
  }

  return context;
}
