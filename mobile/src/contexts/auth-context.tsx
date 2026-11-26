import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Platform, View } from 'react-native';

import type { AuthSession } from '@/services/api/auth';

const STORAGE_KEY = 'flowstep_auth_session';

function parseStoredSession(saved: string | null): AuthSession | null {
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.accessToken === 'string') {
        return parsed;
      }
    } catch (error) {
      console.error('No se pudo leer la sesión almacenada.', error);
    }
  }
  return null;
}

function getWebStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return parseStoredSession(window.localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    console.error('No se pudo acceder al almacenamiento web de la sesión.', error);
    return null;
  }
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
  const [session, setSessionState] = useState<AuthSession | null>(
    Platform.OS === 'web' ? getWebStoredSession : null,
  );
  const [isHydrated, setIsHydrated] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (active) {
          setSessionState(parseStoredSession(saved));
        }
      })
      .catch((error: unknown) => {
        console.error('No se pudo leer la sesión almacenada.', error);
      })
      .finally(() => {
        if (active) {
          setIsHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const setSession = useCallback((newSession: AuthSession) => {
    setSessionState(newSession);
    if (Platform.OS === 'web') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      } catch (error) {
        console.error('No se pudo guardar la sesión.', error);
      }
    } else {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSession)).catch(
        (error: unknown) => {
          console.error('No se pudo guardar la sesión.', error);
        },
      );
    }
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
    if (Platform.OS === 'web') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('No se pudo eliminar la sesión almacenada.', error);
      }
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch((error: unknown) => {
        console.error('No se pudo eliminar la sesión almacenada.', error);
      });
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

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider.');
  }

  return context;
}
