import { createContext, useContext, useState, ReactNode } from 'react';
import { login as loginApi } from '../services/api';

interface AuthContextType {
  token: string | null;
  user: any;
  storeId: string;
  loginFn: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const STORE_ID = '236081f4-1d02-48a4-827f-7e71b7ea7ec5';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const loginFn = async (email: string, password: string) => {
    const res = await loginApi(email, password);
    const { access_token, userId, email: userEmail } = res.data;

    // Construir objeto user con rol desde el backend
    const userObj = { userId, email: userEmail, role: res.data.role ?? 'admin' };

    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userObj));
    setToken(access_token);
    setUser(userObj);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, storeId: STORE_ID, loginFn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
