import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './useAuth';
import { getMySubscription, READ_ONLY_EVENT } from '../services/api';

interface SubscriptionCtx {
  isActive: boolean;
  /** Impago (store.apiBlocked): se puede ver todo pero la API rechaza los cambios con 402. */
  readOnly: boolean;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SubscriptionCtx>({
  isActive: true,
  readOnly: false,
  loading: true,
  error: false,
  refresh: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const fetched = useRef(false);

  const refresh = useCallback(async () => {
    if (!user?.storeId) return;
    try {
      const res = await getMySubscription();
      setIsActive(res.data.subscriptionStatus === 'active');
      setReadOnly(res.data.apiBlocked === true);
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
      setReadOnly(false);
      setLoading(true);
      setError(false);
      fetched.current = false;
    }
  }, [user]);

  // La tienda puede quedar bloqueada a mitad de sesión: el primer 402 enciende el aviso.
  useEffect(() => {
    const onReadOnly = () => setReadOnly(true);
    window.addEventListener(READ_ONLY_EVENT, onReadOnly);
    return () => window.removeEventListener(READ_ONLY_EVENT, onReadOnly);
  }, []);

  return (
    <Ctx.Provider value={{ isActive, readOnly, loading, error, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSubscription = () => useContext(Ctx);
