import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useKitchenBoard } from '../hooks/useKitchenBoard';
import {
  getKitchenContext, getKitchenMenu, setKitchenOptionAvailability, setKitchenProductAvailability,
} from '../services/api';
import type { KitchenMenu, KitchenStatus, KitchenTicket } from '../services/api';

// Pantalla de cocina (módulo restaurante): tablero por columnas, tiempos con color,
// sonido al entrar un pedido y agotados. Sin emojis.

interface Ctx { storeName: string; kitchenRequiresAcceptance: boolean; role: string }

const COLUMNS: { status: KitchenStatus; title: string }[] = [
  { status: 'pending', title: 'Nuevos' },
  { status: 'confirmed', title: 'Por hacer' },
  { status: 'preparing', title: 'En preparación' },
  { status: 'ready', title: 'Listos' },
];

const minutesSince = (iso: string, now: number) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

function borderFor(t: KitchenTicket, now: number): string {
  if (!t.estimatedTime) return 'border-l-sky-500';
  const ratio = minutesSince(t.confirmedAt ?? t.createdAt, now) / t.estimatedTime;
  if (ratio >= 1) return 'border-l-red-500';
  if (ratio >= 0.8) return 'border-l-amber-400';
  return 'border-l-sky-500';
}

function errorMessage(err: any, fallback: string) {
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m.join('. ') : m) || fallback;
}

export default function Kitchen() {
  const navigate = useNavigate();
  const { logout } = useAuth() as any;
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [ctxError, setCtxError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const [toast, setToast] = useState('');
  const [accepting, setAccepting] = useState<KitchenTicket | null>(null);
  const [rejecting, setRejecting] = useState<{ ticket: KitchenTicket; mode: 'reject' | 'cancel' } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [mobileCol, setMobileCol] = useState<KitchenStatus>('confirmed');

  useEffect(() => {
    getKitchenContext()
      .then((r) => setCtx(r.data))
      .catch((err) => setCtxError(errorMessage(err, 'No se pudo abrir la pantalla de cocina')));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const staff = !!ctx && ctx.role !== 'cocina';
  const watch: KitchenStatus[] = staff && ctx?.kitchenRequiresAcceptance ? ['pending'] : ['confirmed'];
  const { tickets, online, loading, newCount, act } = useKitchenBoard(watch);

  // Pitido corto (dos veces) cuando entra un pedido nuevo, si el usuario activó el sonido.
  useEffect(() => {
    if (!newCount || !sound || !audio.current) return;
    const ac = audio.current;
    [0, 0.25].forEach((offset) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.2;
      osc.connect(gain).connect(ac.destination);
      osc.start(ac.currentTime + offset);
      osc.stop(ac.currentTime + offset + 0.15);
    });
  }, [newCount, sound]);

  const enableSound = () => {
    try {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      audio.current = new Ctor();
      setSound(true);
    } catch (err) {
      console.error('[cocina] sonido', err);
    }
  };

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 4000);
  };

  const run = useCallback(
    async (t: KitchenTicket, data: { status: KitchenStatus; estimatedTime?: number; reason?: string }) => {
      const err = await act(t, data);
      if (err) showToast(err);
    },
    [act],
  );

  const columns = useMemo(() => {
    const showNew = staff && (ctx?.kitchenRequiresAcceptance || tickets.some((t) => t.status === 'pending'));
    return COLUMNS.filter((c) => c.status !== 'pending' || showNew);
  }, [staff, ctx, tickets]);

  if (ctxError) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold">{ctxError}</p>
        <button onClick={() => { logout(); navigate('/login'); }} className="px-4 py-2 rounded-xl border border-white/20 text-sm">Salir</button>
      </div>
    );
  }
  if (!ctx || loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#D4FF00] border-t-transparent animate-spin" />
      </div>
    );
  }

  const ticketsOf = (s: KitchenStatus) =>
    tickets.filter((t) => t.status === s).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const actionsFor = (t: KitchenTicket) => {
    switch (t.status) {
      case 'pending':
        return staff ? (
          <div className="flex gap-2">
            <button onClick={() => setAccepting(t)} className="flex-1 py-3 rounded-xl bg-[#D4FF00] text-[#0A0A0F] font-bold">Aceptar</button>
            <button onClick={() => setRejecting({ ticket: t, mode: 'reject' })} className="px-4 py-3 rounded-xl border border-white/20 font-semibold">Rechazar</button>
          </div>
        ) : null;
      case 'confirmed':
        return <button onClick={() => run(t, { status: 'preparing' })} className="w-full py-3 rounded-xl bg-[#D4FF00] text-[#0A0A0F] font-bold">Empezar</button>;
      case 'preparing':
        return <button onClick={() => run(t, { status: 'ready' })} className="w-full py-3 rounded-xl bg-[#D4FF00] text-[#0A0A0F] font-bold">Listo</button>;
      case 'ready':
        return staff ? (
          <button onClick={() => run(t, { status: 'delivered' })} className="w-full py-3 rounded-xl bg-[#D4FF00] text-[#0A0A0F] font-bold">
            {t.delivery === 'domicilio' ? 'Despachado' : 'Entregado'}
          </button>
        ) : <p className="text-xs text-gray-400 text-center">Esperando entrega</p>;
      default:
        return null;
    }
  };

  const ticketCard = (t: KitchenTicket) => {
    const elapsed = minutesSince(t.confirmedAt ?? t.createdAt, now);
    return (
      <article key={t.orderId} className={`rounded-2xl bg-[#111117] border border-white/10 border-l-4 ${borderFor(t, now)} p-4 space-y-3`}>
        <header className="flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-bold">{t.number} · {t.customerName}</p>
            <p className="text-xs text-gray-400">
              {t.delivery === 'domicilio' ? `Domicilio${t.deliveryAddress ? `: ${t.deliveryAddress}` : ''}` : 'Recoge'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums">{elapsed} min</p>
            {t.estimatedTime ? <p className="text-xs text-gray-400">de {t.estimatedTime}</p> : null}
          </div>
        </header>
        <ul className="space-y-2">
          {t.items.map((i, idx) => (
            <li key={idx}>
              <p className="font-semibold">{i.quantity}× {i.description}</p>
              {i.options.length > 0 && <p className="text-sm text-gray-300">{i.options.join(' · ')}</p>}
              {i.note && <p className="text-sm font-semibold text-[#0A0A0F] bg-amber-300 rounded-lg px-2 py-1 mt-1">{i.note}</p>}
            </li>
          ))}
        </ul>
        {t.notes && <p className="text-xs text-gray-400">{t.notes}</p>}
        {actionsFor(t)}
        {staff && t.status !== 'pending' && (
          <button onClick={() => setRejecting({ ticket: t, mode: 'cancel' })} className="w-full text-xs text-gray-400 underline">Cancelar pedido</button>
        )}
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-[#111117]">
        <div>
          <h1 className="text-lg font-bold">{ctx.storeName}</h1>
          <p className="text-xs text-gray-400">
            Cocina · {new Date(now).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!online && <span role="status" className="text-xs font-semibold text-amber-300">Sin conexión, reintentando</span>}
          <button onClick={() => setShowMenu(true)} className="px-3 py-2 rounded-xl border border-white/20 text-sm">Agotados</button>
          {staff ? (
            <button onClick={() => navigate('/dashboard')} className="px-3 py-2 rounded-xl border border-white/20 text-sm">Panel</button>
          ) : (
            <button onClick={() => { logout(); navigate('/login'); }} className="px-3 py-2 rounded-xl border border-white/20 text-sm">Salir</button>
          )}
        </div>
      </header>

      {!sound && (
        <button onClick={enableSound} className="w-full py-3 bg-[#D4FF00] text-[#0A0A0F] font-bold">
          Toca para activar el sonido
        </button>
      )}

      {/* Pestañas en móvil */}
      <nav className="md:hidden flex border-b border-white/10">
        {columns.map((c) => (
          <button key={c.status} onClick={() => setMobileCol(c.status)}
            className={`flex-1 py-3 text-sm font-semibold ${mobileCol === c.status ? 'text-[#D4FF00] border-b-2 border-[#D4FF00]' : 'text-gray-400'}`}>
            {c.title} ({ticketsOf(c.status).length})
          </button>
        ))}
      </nav>

      <main className={`flex-1 grid gap-4 p-4 ${columns.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        {columns.map((c) => (
          <section key={c.status} className={`${mobileCol === c.status ? 'flex' : 'hidden'} md:flex flex-col gap-3 min-w-0`}>
            <h2 className="hidden md:block text-sm font-semibold text-gray-400 uppercase tracking-wide">
              {c.title} ({ticketsOf(c.status).length})
            </h2>
            {ticketsOf(c.status).map(ticketCard)}
            {ticketsOf(c.status).length === 0 && <p className="text-sm text-gray-500">Nada por aquí</p>}
          </section>
        ))}
      </main>

      {toast && (
        <div role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold">{toast}</div>
      )}

      {accepting && (
        <AcceptModal ticket={accepting} onClose={() => setAccepting(null)}
          onAccept={(minutes) => { const t = accepting; setAccepting(null); run(t, { status: 'confirmed', estimatedTime: minutes }); }} />
      )}
      {rejecting && (
        <ReasonModal mode={rejecting.mode} onClose={() => setRejecting(null)}
          onConfirm={(reason) => { const t = rejecting.ticket; setRejecting(null); run(t, { status: 'cancelled', ...(reason && { reason }) }); }} />
      )}
      {showMenu && <SoldOutPanel onClose={() => setShowMenu(false)} onError={showToast} />}
    </div>
  );
}

function AcceptModal({ ticket, onClose, onAccept }: { ticket: KitchenTicket; onClose: () => void; onAccept: (m: number) => void }) {
  const [minutes, setMinutes] = useState(String(ticket.suggestedMinutes));
  const n = Number(minutes);
  const valid = Number.isInteger(n) && n >= 1 && n <= 600;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div role="dialog" aria-modal="true" className="bg-[#111117] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <h3 className="text-lg font-bold">Aceptar {ticket.number}</h3>
        <p className="text-sm text-gray-400">¿En cuántos minutos estará listo?</p>
        <div className="flex flex-wrap gap-2">
          {[10, 15, 20, 30, 45].map((m) => (
            <button key={m} onClick={() => setMinutes(String(m))}
              className={`px-3 py-2 rounded-xl border text-sm ${Number(minutes) === m ? 'border-[#D4FF00] text-[#D4FF00]' : 'border-white/20'}`}>{m}</button>
          ))}
        </div>
        <input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))}
          aria-label="Minutos" className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#0A0A0F]" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/20">Volver</button>
          <button disabled={!valid} onClick={() => onAccept(n)} className="flex-1 py-3 rounded-xl bg-[#D4FF00] text-[#0A0A0F] font-bold disabled:opacity-40">Aceptar</button>
        </div>
      </div>
    </div>
  );
}

function ReasonModal({ mode, onClose, onConfirm }: { mode: 'reject' | 'cancel'; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  const required = mode === 'reject';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div role="dialog" aria-modal="true" className="bg-[#111117] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <h3 className="text-lg font-bold">{required ? 'Rechazar pedido' : 'Cancelar pedido'}</h3>
        <p className="text-sm text-gray-400">
          {required ? 'El motivo se le envía al cliente.' : 'Si escribes un motivo, se le envía al cliente.'}
        </p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 300))} rows={3}
          placeholder="Ej: se acabó la carne" className="w-full px-3 py-2 rounded-xl border border-white/10 bg-[#0A0A0F] resize-none" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/20">Volver</button>
          <button disabled={required && !reason.trim()} onClick={() => onConfirm(reason.trim())}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold disabled:opacity-40">
            {required ? 'Rechazar' : 'Cancelar pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SoldOutPanel({ onClose, onError }: { onClose: () => void; onError: (m: string) => void }) {
  const [menu, setMenu] = useState<KitchenMenu | null>(null);

  useEffect(() => {
    getKitchenMenu().then((r) => setMenu(r.data)).catch((err) => onError(errorMessage(err, 'No se pudo cargar el menú')));
  }, [onError]);

  const toggleProduct = async (id: string, available: boolean) => {
    setMenu((m) => m && { ...m, products: m.products.map((p) => (p.productId === id ? { ...p, available } : p)) });
    try {
      await setKitchenProductAvailability(id, available);
    } catch (err) {
      setMenu((m) => m && { ...m, products: m.products.map((p) => (p.productId === id ? { ...p, available: !available } : p)) });
      onError(errorMessage(err, 'No se pudo cambiar el plato'));
    }
  };
  const toggleOption = async (id: string, available: boolean) => {
    setMenu((m) => m && { ...m, options: m.options.map((o) => (o.optionId === id ? { ...o, available } : o)) });
    try {
      await setKitchenOptionAvailability(id, available);
    } catch (err) {
      setMenu((m) => m && { ...m, options: m.options.map((o) => (o.optionId === id ? { ...o, available: !available } : o)) });
      onError(errorMessage(err, 'No se pudo cambiar la opción'));
    }
  };

  const row = (key: string, label: string, available: boolean, onToggle: () => void) => (
    <li key={key} className="flex items-center justify-between gap-3 py-2">
      <span className={available ? '' : 'line-through text-gray-500'}>{label}</span>
      <button onClick={onToggle} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${available ? 'border border-white/20' : 'bg-red-500 text-white'}`}>
        {available ? 'Marcar agotado' : 'Agotado'}
      </button>
    </li>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()} className="w-full max-w-md h-full overflow-y-auto bg-[#111117] border-l border-white/10 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Agotados</h3>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg border border-white/20 text-sm">Cerrar</button>
        </div>
        {!menu ? <p className="text-sm text-gray-400">Cargando…</p> : (
          <>
            <section>
              <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-1">Platos</h4>
              <ul className="divide-y divide-white/10">
                {menu.products.map((p) => row(p.productId, p.name, p.available, () => toggleProduct(p.productId, !p.available)))}
              </ul>
            </section>
            {menu.options.length > 0 && (
              <section>
                <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-1">Opciones</h4>
                <ul className="divide-y divide-white/10">
                  {menu.options.map((o) => row(o.optionId, `${o.groupName}: ${o.name}`, o.available, () => toggleOption(o.optionId, !o.available)))}
                </ul>
              </section>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
