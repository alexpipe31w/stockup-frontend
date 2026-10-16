import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { login as loginApi } from '../services/api';

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
  loginFn: (email: string, password: string) => Promise<UserData>;
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

/** Verifica si el token ya expiró en el cliente */
function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  // exp es en segundos, Date.now() en ms
  return payload.exp * 1000 < Date.now();
}

function getInitialToken(): string | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  // Si el token expiró, limpiar localStorage y no restaurar sesión
  if (isTokenExpired(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
  return token;
}

function getInitialUser(): UserData | null {
  const token = localStorage.getItem('token');
  if (!token || isTokenExpired(token)) return null;

  // Leer datos del JWT directamente — no de localStorage.user
  // Esto evita que alguien edite el rol en DevTools
  const payload = decodeJwt(token);
  if (!payload) return null;

  return {
    userId: payload.sub,
    email: payload.email,
    role: payload.role ?? 'user', // nunca defaultear a 'admin'
    storeId: payload.storeId ?? '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getInitialToken);
  const [user, setUser]   = useState<UserData | null>(getInitialUser);

  // Cierre de sesion entre pestanas: el evento `storage` solo se dispara en las OTRAS
  // pestanas. Si otra pestana borra `token` (logout o 401) o `sa_token`, esta tambien sale.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      const cleared = e.key === null; // localStorage.clear()
      if ((cleared || e.key === 'token') && !e.newValue) {
        setToken(null);
        setUser(null);
      }
      if ((cleared || e.key === 'sa_token') && !e.newValue
          && window.location.pathname.startsWith('/superadmin')
          && !window.location.pathname.startsWith('/superadmin/login')) {
        window.location.replace('/superadmin/login');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const loginFn = async (email: string, password: string): Promise<UserData> => {
    const res = await loginApi(email, password);
    const { access_token } = res.data;

    // Leer user data del JWT — no confiar en los campos extra del response
    const payload = decodeJwt(access_token);
    const userObj: UserData = {
      userId:  payload.sub,
      email:   payload.email,
      role:    payload.role ?? 'user',
      storeId: payload.storeId ?? '',
    };

    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userObj));
    // El superadmin ya no entra por aquí (la API lo rechaza): solo por /superadmin/login con código.
    setToken(access_token);
    setUser(userObj);
    return userObj;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // En un equipo compartido, el siguiente usuario no hereda el acceso a /superadmin.
    localStorage.removeItem('sa_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      storeId: user?.storeId ?? '',
      loginFn,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);