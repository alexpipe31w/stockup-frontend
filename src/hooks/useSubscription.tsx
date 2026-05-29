import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './useAuth';
import { getMySubscription } from '../services/api';

interface SubscriptionCtx {
  isActive: boolean;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SubscriptionCtx>({
  isActive: true,
  loading: true,
  error: false,
  refresh: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const fetched = useRef(false);

  const refresh = useCallback(async () => {
    if (!user?.storeId) return;
    try {
      const res = await getMySubscription();
      setIsActive(res.data.subscriptionStatus === 'active');
      setError(false);
    } catch {
      // En error de red conservamos el estado previo para no expulsar al usuario
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.storeId]);

  useEffect(() => {
    // Superadmin no tiene suscripción
    if (!user?.storeId || user?.role === 'superadmin') {
      setIsActive(true);
      setLoading(false);
      fetched.current = false;
      return;
    }
    if (fetched.current) return;
    fetched.current = true;
    refresh();
  }, [user?.storeId, user?.role, refresh]);

  // Resetear al cerrar sesión
  useEffect(() => {
    if (!user) {
      setIsActive(true);
      setLoading(true);
      setError(false);
      fetched.current = false;
    }
  }, [user]);

  return (
    <Ctx.Provider value={{ isActive, loading, error, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSubscription = () => useContext(Ctx);
