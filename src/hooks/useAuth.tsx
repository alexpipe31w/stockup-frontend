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

// ⚠️ Cambia este storeId por el tuyo
const STORE_ID = '236081f4-1d02-48a4-827f-7e71b7ea7ec5';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );
  const [user, setUser] = useState<any>(null);

  const loginFn = async (email: string, password: string) => {
    const res = await loginApi(email, password);
    const { access_token, user } = res.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
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
