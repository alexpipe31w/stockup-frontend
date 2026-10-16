import { useCallback, useEffect, useRef, useState } from 'react';
import { getKitchenOrders, transitionKitchenOrder } from '../services/api';
import type { KitchenStatus, KitchenTicket } from '../services/api';

const POLL_MS = 4000;
const GONE: KitchenStatus[] = ['delivered', 'cancelled'];

/**
 * Tablero de cocina por sondeo (cada 4 s). Une por pedido (gana el más nuevo), quita lo
 * entregado/cancelado y, sin conexión, conserva el último tablero y reintenta solo.
 * `watch`: estados cuyos pedidos nuevos deben sonar.
 */
export function useKitchenBoard(watch: KitchenStatus[]) {
  const [tickets, setTickets] = useState<Map<string, KitchenTicket>>(new Map());
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const next = useRef<string | undefined>(undefined);
  const seen = useRef<Set<string>>(new Set());
  const first = useRef(true);
  const watchKey = watch.join(',');

  const merge = useCallback(
    (incoming: KitchenTicket[]) => {
      let fresh = 0;
      setTickets((prev) => {
        const map = new Map(prev);
        for (const t of incoming) {
          const old = map.get(t.orderId);
          if (old && old.updatedAt > t.updatedAt) continue;
          if (GONE.includes(t.status)) {
            map.delete(t.orderId);
            continue;
          }
          map.set(t.orderId, t);
          const mark = `${t.orderId}:${t.status}`;
          if (watchKey.split(',').includes(t.status) && !seen.current.has(mark)) {
            seen.current.add(mark);
            if (!first.current) fresh++;
          }
        }
        return map;
      });
      if (fresh) setNewCount((c) => c + fresh);
    },
    [watchKey],
  );

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await getKitchenOrders(next.current);
        if (!alive) return;
        next.current = res.data.next;
        merge(res.data.orders);
        first.current = false;
        setOnline(true);
      } catch (err) {
        console.error('[cocina] sondeo', err);
        if (alive) setOnline(false);
      } finally {
        if (alive) setLoading(false);
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [merge]);

  /** Mueve un pedido. En 409 aplica el estado actual que devuelve el servidor. */
  const act = useCallback(
    async (t: KitchenTicket, data: { status: KitchenStatus; estimatedTime?: number; reason?: string }) => {
      try {
        await transitionKitchenOrder(t.orderId, data);
        merge([{ ...t, ...data, status: data.status, updatedAt: new Date().toISOString() }]);
        return null;
      } catch (err: any) {
        const body = err?.response?.data;
        if (err?.response?.status === 409 && body?.status) {
          merge([{ ...t, status: body.status, updatedAt: new Date().toISOString() }]);
          return 'Este pedido ya cambió';
        }
        const m = body?.message;
        console.error('[cocina] transición', err);
        return (Array.isArray(m) ? m.join('. ') : m) || 'No se pudo mover el pedido';
      }
    },
    [merge],
  );

  return { tickets: Array.from(tickets.values()), online, loading, newCount, act };
}
