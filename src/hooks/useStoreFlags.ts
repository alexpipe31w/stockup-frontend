import { useCallback, useEffect, useState } from 'react';
import { getStore } from '../services/api';
import { useAuth } from './useAuth';

export interface StoreFlags {
  kitchenEnabled: boolean;
  menuTitle: string | null;
}

// Una sola petición por tienda y carga de página: la barra lateral, Productos y
// Configuración comparten el resultado. reload() la repite y avisa a todos.
let cache: { storeId: string; promise: Promise<StoreFlags> } | null = null;
const listeners = new Set<(f: StoreFlags) => void>();

const OFF: StoreFlags = { kitchenEnabled: false, menuTitle: null };

function load(storeId: string, force = false): Promise<StoreFlags> {
  if (!force && cache?.storeId === storeId) return cache.promise;
  const promise = getStore(storeId)
    .then((res) => ({
      kitchenEnabled: !!res.data?.kitchenEnabled,
      menuTitle: res.data?.menuTitle ?? null,
    }))
    .catch((err) => {
      console.error('[useStoreFlags]', err);
      if (cache?.promise === promise) cache = null; // el próximo montaje lo reintenta
      return OFF;
    });
  cache = { storeId, promise };
  return promise;
}

export function useStoreFlags() {
  const { user } = useAuth();
  const storeId = user?.storeId;
  const [flags, setFlags] = useState<StoreFlags>(OFF);
  const [loading, setLoading] = useState(!!storeId);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    let alive = true;
    load(storeId).then((f) => {
      if (!alive) return;
      setFlags(f);
      setLoading(false);
    });
    const onChange = (f: StoreFlags) => alive && setFlags(f);
    listeners.add(onChange);
    return () => {
      alive = false;
      listeners.delete(onChange);
    };
  }, [storeId]);

  const reload = useCallback(async () => {
    if (!storeId) return;
    const f = await load(storeId, true);
    listeners.forEach((fn) => fn(f));
  }, [storeId]);

  return { ...flags, loading, reload };
}
