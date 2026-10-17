import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  login as loginApi, logoutSession, restoreSession, setAccessToken, SESSION_ENDED_EVENT,
} from '../services/api';

interface UserData {
  userId: string;
  email: string;
  role: string;
  storeId: string;
}

interface AuthContextType {
  token: string | null;
  user: UserData | null;
  storeId: string;
  /** false mientras se recupera la sesión con la cookie al abrir el panel. */
  ready: boolean;
  loginFn: (email: string, password: string) => Promise<UserData>;
  setSession: (accessToken: string) => UserData;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

/** Decodifica el payload del JWT sin verificarlo (la verificación la hace el backend) */
function decodeJwt(token: string): any {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/** Datos del usuario leídos del JWT, no de campos sueltos que se puedan editar en DevTools. */
function userFromToken(token: string): UserData | null {
  const payload = decodeJwt(token);
  if (!payload?.sub) return null;
  return {
    userId: payload.sub,
    email: payload.email,
    role: payload.role ?? 'user', // nunca defaultear a 'admin'
    storeId: payload.storeId ?? '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser]   = useState<UserData | null>(null);
  const [ready, setReady] = useState(false);

  // El access token vive en memoria: al recargar se pide otro con la cookie de la sesión.
  useEffect(() => {
    let cancelled = false;
    restoreSession('store').then((t) => {
      if (cancelled) return;
      if (t) {
        setToken(t);
        setUser(userFromToken(t));
      }
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Sesión terminada fuera de este componente: refresh rechazado o logout en otra pestaña.
  useEffect(() => {
    const onEnded = (e: Event) => {
      const scope = (e as CustomEvent).detail;
      if (scope === 'store') {
        setToken(null);
        setUser(null);
      }
      if (scope === 'sa'
          && window.location.pathname.startsWith('/superadmin')
          && !window.location.pathname.startsWith('/superadmin/login')) {
        window.location.replace('/superadmin/login');
      }
    };
    window.addEventListener(SESSION_ENDED_EVENT, onEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onEnded);
  }, []);

  const loginFn = async (email: string, password: string): Promise<UserData> => {
    const res = await loginApi(email, password);
    return setSession(res.data.access_token);
  };

  /** Guarda un access emitido por la API (login o registro) como la sesión actual. */
  const setSession = (access_token: string): UserData => {
    const userObj = userFromToken(access_token);
    if (!userObj) throw new Error('Token sin datos de usuario');
    setAccessToken(access_token, 'store');
    // El superadmin ya no entra por aquí (la API lo rechaza): solo por /superadmin/login con código.
    setToken(access_token);
    setUser(userObj);
    return userObj;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    void logoutSession('store');
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      storeId: user?.storeId ?? '',
      ready,
      loginFn,
      setSession,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
