import React, { useState, useEffect, useCallback } from 'react';
import {
  getAppointments, getAppointmentStats,
  updateAppointment, getAppointmentTimeline,
} from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type AppointmentStatus   = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';
type AppointmentPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
type AppointmentSource   = 'AI' | 'MANUAL' | 'WHATSAPP' | 'API';
type ViewMode            = 'list' | 'calendar';

interface Customer     { customerId: string; name: string | null; phone: string; cedula: string | null; city: string | null; }
interface ServiceInfo  { name: string; }
interface VariantInfo  { name: string; }
interface TimelineEntry {
  timelineId: string; action: string;
  previousStatus: AppointmentStatus | null; newStatus: AppointmentStatus | null;
  note: string | null; isPublic: boolean; createdAt: string;
}
interface Appointment {
  appointmentId:   string; type: string;
  status:          AppointmentStatus; priority: AppointmentPriority; source: AppointmentSource;
  scheduledAt:     string; endsAt: string | null; durationMinutes: number | null;
  description:     string | null; address: string | null; notes: string | null;
  internalNotes:   string | null; agreedPrice: string | null;
  cancelReason:    string | null; createdAt: string;
  customer:        Customer; service: ServiceInfo | null; serviceVariant: VariantInfo | null;
}
interface Stats {
  total: number; pending: number; confirmed: number; todayCount: number;
  upcomingWeek: number; inProgress: number; completedTotal: number;
  cancelledTotal: number; noShowTotal: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SC: Record<AppointmentStatus, { label: string; color: string; bg: string; bar: string; tw: string }> = {
  PENDING:     { label: 'Pendiente',      color: '#92400e', bg: '#fef3c7', bar: '#f59e0b', tw: 'bg-amber-50 text-amber-700' },
  CONFIRMED:   { label: 'Confirmada',     color: '#1e40af', bg: '#dbeafe', bar: '#3b82f6', tw: 'bg-blue-50 text-blue-700' },
  IN_PROGRESS: { label: 'En curso',       color: '#5b21b6', bg: '#ede9fe', bar: '#8b5cf6', tw: 'bg-purple-50 text-purple-700' },
  COMPLETED:   { label: 'Completada',     color: '#14532d', bg: '#dcfce7', bar: '#22c55e', tw: 'bg-green-50 text-green-700' },
  CANCELLED:   { label: 'Cancelada',      color: '#991b1b', bg: '#fee2e2', bar: '#ef4444', tw: 'bg-red-50 text-red-700' },
  NO_SHOW:     { label: 'No se presentó', color: '#374151', bg: '#f3f4f6', bar: '#9ca3af', tw: 'bg-slate-100 text-slate-500' },
  RESCHEDULED: { label: 'Reagendada',     color: '#164e63', bg: '#ecfeff', bar: '#06b6d4', tw: 'bg-cyan-50 text-cyan-700' },
};

const PC: Record<AppointmentPriority, { label: string; dot: string }> = {
  LOW:    { label: 'Baja',    dot: '#d1d5db' },
  NORMAL: { label: 'Normal',  dot: '#9ca3af' },
  HIGH:   { label: 'Alta',    dot: '#f97316' },
  URGENT: { label: 'Urgente', dot: '#ef4444' },
};

const SRC: Record<AppointmentSource, string> = {
  AI: '🤖 IA', MANUAL: '👤 Manual', WHATSAPP: '💬 WhatsApp', API: '🔌 API',
};

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING:     ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:   ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], CANCELLED: [], NO_SHOW: [],
  RESCHEDULED: ['CONFIRMED', 'CANCELLED'],
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HOURS    = Array.from({ length: 16 }, (_, i) => i + 7); // 7am–10pm

// ─── Date utils ───────────────────────────────────────────────────────────────

const fmtTime     = (s: string) => new Date(s).toLocaleTimeString('es-CO',   { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
const fmtDateFull = (s: string) => new Date(s).toLocaleDateString('es-CO',   { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' });
const fmtDT       = (s: string) => new Date(s).toLocaleString('es-CO',       { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
const fmtMins     = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h${r ? ` ${r}m` : ''}` : `${r}m`; };
const fmtCOP      = (n: string | number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n));

const isToday     = (s: string) => { const d = new Date(s), n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate(); };
const isPastUnres = (a: Appointment) => new Date(a.scheduledAt) < new Date() && !['COMPLETED','CANCELLED','NO_SHOW'].includes(a.status);
const sameDay     = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function getMonday(d: Date): Date {
  const r = new Date(d); r.setHours(0,0,0,0);
  const day = r.getDay(); r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
  return r;
}
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

// ─── Small components ─────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: AppointmentStatus }) => {
  const c = SC[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${c.tw}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.bar }} />
      {c.label}
    </span>
  );
};

const PriorityDot = ({ priority }: { priority: AppointmentPriority }) =>
  priority === 'NORMAL' ? null : (
    <span title={PC[priority].label} className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: PC[priority].dot }} />
  );

const Avatar = ({ name, phone }: { name: string | null; phone: string }) => (
  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
    style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
    {name?.[0]?.toUpperCase() ?? phone[1]}
  </div>
);

// ─── Timeline ────────────────────────────────────────────────────────────────

const TICONS: Record<string, string> = {
  CREATED:'✨', CONFIRMED:'✅', IN_PROGRESS:'⚙️', COMPLETED:'🎉',
  CANCELLED:'❌', NO_SHOW:'👻', RESCHEDULED:'🔄', NOTE_ADDED:'📝', UPDATED:'✏️',
};

function TimelinePanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getAppointmentTimeline(id).then(r => setEntries(r.data)).finally(() => setLoading(false)); }, [id]);
  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historial</p>
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">Cerrar</button>
      </div>
      {loading ? <p className="text-xs text-slate-400 text-center py-2">Cargando...</p>
      : entries.length === 0 ? <p className="text-xs text-slate-400 text-center py-2">Sin historial</p>
      : entries.map((e, i) => (
        <div key={e.timelineId} className="flex gap-2 mb-2">
          <div className="flex flex-col items-center">
            <span className="text-sm leading-none">{TICONS[e.action] ?? '•'}</span>
            {i < entries.length - 1 && <div className="w-px flex-1 bg-slate-100 mt-1" />}
          </div>
          <div className="flex-1 pb-1">
            <p className="text-xs font-medium text-slate-700">
              {e.newStatus ? SC[e.newStatus]?.label : e.action}
              {!e.isPublic && <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">Admin</span>}
            </p>
            {e.note && <p className="text-xs text-slate-500">{e.note}</p>}
            <p className="text-[10px] text-slate-400">{fmtDT(e.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

function CancelModal({ onConfirm, onClose, saving }: { onConfirm:(r:string)=>void; onClose:()=>void; saving:boolean }) {
  const [r, setR] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="font-bold text-slate-800 mb-1">Cancelar cita</h3>
        <p className="text-sm text-slate-500 mb-3">Motivo de cancelación (requerido)</p>
        <textarea value={r} onChange={e => setR(e.target.value)} rows={3}
          placeholder="Ej: Cliente canceló, sin disponibilidad..."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Volver</button>
          <button onClick={() => onConfirm(r)} disabled={!r.trim() || saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition">
            {saving ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ appt, onUpdate, onClose }: {
  appt: Appointment; onUpdate:(id:string,data:any)=>Promise<void>; onClose:()=>void;
}) {
  const [saving,       setSaving]       = useState(false);
  const [showTL,       setShowTL]       = useState(false);
  const [showCancel,   setShowCancel]   = useState(false);
  const cfg = SC[appt.status];
  const transitions = TRANSITIONS[appt.status] ?? [];

  const doStatus = async (s: AppointmentStatus, cancelReason?: string) => {
    if (s === 'CANCELLED' && !cancelReason) { setShowCancel(true); return; }
    setSaving(true);
    await onUpdate(appt.appointmentId, { status: s, ...(cancelReason ? { cancelReason } : {}) });
    setSaving(false); setShowCancel(false);
  };

  const label = appt.service
    ? `${appt.service.name}${appt.serviceVariant ? ` · ${appt.serviceVariant.name}` : ''}`
    : appt.type;

  return (
    <>
      {/* NOTA UI: Se removió el w-72 para que ocupe el w-full del contenedor padre 
        y h-full para asegurar que el scroll interno funcione perfecto.
      */}
      <div className="w-full h-full bg-white flex flex-col flex-shrink-0">
        {/* status bar */}
        <div className="h-1.5 flex-shrink-0" style={{ background: cfg.bar }} />

        {/* header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex items-start gap-2 flex-shrink-0">
          <Avatar name={appt.customer.name} phone={appt.customer.phone} />
          <div className="flex-1 min-w-0 mt-0.5">
            <p className="text-sm font-bold text-slate-800 truncate leading-tight">{label}</p>
            <p className="text-xs text-slate-400 truncate">{appt.customer.name ?? appt.customer.phone}</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex-shrink-0 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* body (Área scrolleable) */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-sm">

          {/* status + priority */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={appt.status} />
            {appt.priority !== 'NORMAL' && (
              <span className="text-xs font-semibold" style={{ color: PC[appt.priority].dot }}>
                ● {PC[appt.priority].label}
              </span>
            )}
          </div>

          {/* datetime */}
          <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
            <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1.5"><span className="text-base">📅</span> Fecha y hora</p>
            <p className="font-semibold text-slate-800 mt-1">{fmtDateFull(appt.scheduledAt)}</p>
            <p className="text-slate-600 text-sm">
              {fmtTime(appt.scheduledAt)}{appt.endsAt ? ` → ${fmtTime(appt.endsAt)}` : ''}
              {appt.durationMinutes && <span className="text-slate-400 ml-1.5">({fmtMins(appt.durationMinutes)})</span>}
            </p>
          </div>

          {/* cliente */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cliente</p>
            <p className="font-medium text-slate-800">{appt.customer.name ?? 'Sin nombre'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{appt.customer.phone}</p>
            {appt.customer.cedula && <p className="text-xs text-slate-400 mt-0.5">CC {appt.customer.cedula}</p>}
            {appt.customer.city   && <p className="text-xs text-slate-400 mt-0.5">{appt.customer.city}</p>}
          </div>

          {/* detalles */}
          {[
            appt.description && ['📝 Descripción', appt.description],
            appt.address     && ['📍 Dirección',   appt.address],
            appt.notes       && ['🗒️ Notas',       appt.notes],
            appt.agreedPrice && ['💰 Precio acordado', fmtCOP(appt.agreedPrice)],
          ].filter(Boolean).map(([k, v]: any) => (
            <div key={k}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{k}</p>
              <p className="text-slate-700 text-sm bg-slate-50 p-2.5 rounded-lg border border-slate-100">{v}</p>
            </div>
          ))}

          {/* notas internas / cancelación */}
          {(appt.internalNotes || appt.cancelReason) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Solo admin</p>
              {appt.internalNotes && <p className="text-xs text-amber-800">{appt.internalNotes}</p>}
              {appt.cancelReason && (
                <>
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mt-2 mb-0.5">Cancelación</p>
                  <p className="text-xs text-red-700">{appt.cancelReason}</p>
                </>
              )}
            </div>
          )}

          {/* fuente */}
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
            <span>Origen: {SRC[appt.source] ?? appt.source}</span>
            <span>{fmtDT(appt.createdAt)}</span>
          </div>

          {/* transiciones */}
          {transitions.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cambiar estado</p>
              <div className="flex flex-col gap-2">
                {transitions.map(s => (
                  <button key={s} onClick={() => doStatus(s)} disabled={saving}
                    className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-left transition-all flex items-center gap-2 hover:shadow-sm disabled:opacity-50"
                    style={{ background: SC[s].bg, color: SC[s].color }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm" style={{ background: SC[s].bar }} />
                    {SC[s].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* historial */}
          <div className="pt-2">
            <button onClick={() => setShowTL(v => !v)}
              className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl text-xs font-medium text-slate-600 flex items-center justify-center gap-1.5 border border-slate-200">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              {showTL ? 'Ocultar historial' : 'Ver historial completo'}
            </button>
            {showTL && <TimelinePanel id={appt.appointmentId} onClose={() => setShowTL(false)} />}
          </div>
        </div>
      </div>

      {showCancel && (
        <CancelModal onConfirm={r => doStatus('CANCELLED', r)} onClose={() => setShowCancel(false)} saving={saving} />
      )}
    </>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ appointments, selected, onSelect }: {
  appointments: Appointment[]; selected: Appointment | null; onSelect:(a:Appointment|null)=>void;
}) {
  if (appointments.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 py-24 h-full">
      <span className="text-5xl drop-shadow-sm">📅</span>
      <p className="text-base font-semibold text-slate-600">Sin agendamientos</p>
      <p className="text-sm max-w-sm text-center">La IA los crea automáticamente cuando un cliente agenda por WhatsApp.</p>
    </div>
  );

  const groups: Map<string, Appointment[]> = new Map();
  [...appointments]
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .forEach(a => {
      const k = fmtDateFull(a.scheduledAt);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(a);
    });

  return (
    <div className="flex-1 min-w-0 space-y-6">
      {Array.from(groups.entries()).map(([dateLabel, appts]: [string, Appointment[]]) => {
        const today = isToday(appts[0].scheduledAt);
        return (
          <div key={dateLabel}>
            <div className="flex items-center gap-3 mb-3 sticky top-0 bg-white z-10 py-1">
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${today ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                {today ? '🔵 Hoy' : dateLabel}
              </span>
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{appts.length} cita{appts.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-2.5">
              {appts.map((appt: Appointment) => {
                const isSel  = selected?.appointmentId === appt.appointmentId;
                const past   = isPastUnres(appt);
                const label  = appt.service ? `${appt.service.name}${appt.serviceVariant ? ` · ${appt.serviceVariant.name}` : ''}` : appt.type;
                const cfg    = SC[appt.status];

                return (
                  <button key={appt.appointmentId} onClick={() => onSelect(isSel ? null : appt)}
                    className={`w-full text-left rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isSel  ? 'border-blue-500 shadow-md ring-4 ring-blue-50'
                      : past ? 'border-red-100 bg-red-50/20 hover:border-red-200'
                             : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                    }`}>
                    <div className="h-1.5" style={{ background: cfg.bar }} />

                    <div className="px-5 py-3.5 flex items-center gap-4">
                      {/* time */}
                      <div className="flex-shrink-0 w-16 text-center">
                        <p className="text-lg font-black text-slate-800 leading-none">{fmtTime(appt.scheduledAt)}</p>
                        {appt.durationMinutes && <p className="text-[10px] font-medium text-slate-400 mt-1 bg-slate-50 rounded-full py-0.5">{fmtMins(appt.durationMinutes)}</p>}
                      </div>
                      <div className="w-px h-12 bg-slate-200 flex-shrink-0" />

                      {/* info */}
                      <Avatar name={appt.customer.name} phone={appt.customer.phone} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 justify-between">
                          <p className="text-sm font-bold text-slate-800 truncate">{label}</p>
                          <StatusBadge status={appt.status} />
                        </div>
                        <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                          {appt.customer.name ?? 'Sin nombre'} · {appt.customer.phone}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {appt.address    && <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">📍 {appt.address.slice(0,30)}{appt.address.length>30?'…':''}</span>}
                          {appt.agreedPrice && <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">💰 {fmtCOP(appt.agreedPrice)}</span>}
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{SRC[appt.source]}</span>
                          {appt.priority !== 'NORMAL' && (
                            <span className="text-[10px] font-bold bg-slate-50 px-1.5 py-0.5 rounded" style={{ color: PC[appt.priority].dot }}>
                              ● {PC[appt.priority].label}
                            </span>
                          )}
                        </div>
                      </div>
                      <PriorityDot priority={appt.priority} />
                      <svg className={`flex-shrink-0 transition-transform ${isSel ? 'text-blue-500 transform rotate-90' : 'text-slate-300'}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({ appointments, selected, onSelect }: {
  appointments: Appointment[]; selected: Appointment | null; onSelect:(a:Appointment|null)=>void;
}) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd   = addDays(weekStart, 6);
  const weekLabel = `${weekStart.toLocaleDateString('es-CO',{day:'numeric',month:'short'})} – ${weekEnd.toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric'})}`;

  const CELL_H = 65; // Ligeramente más alto para que respiren las tarjetas

  const grid: Record<number, Record<number, Appointment[]>> = {};
  for (let d = 0; d < 7; d++) { grid[d] = {}; for (const h of HOURS) grid[d][h] = []; }

  appointments.forEach(a => {
    const date   = new Date(a.scheduledAt);
    const dayIdx = weekDays.findIndex(d => sameDay(d, date));
    if (dayIdx === -1) return;
    const h    = date.getHours();
    const slot = h < 7 ? 7 : h > 22 ? 22 : h;
    grid[dayIdx][slot]?.push(a);
  });

  const todayIdx = weekDays.findIndex(d => sameDay(d, new Date()));
  const nowHour  = new Date().getHours();
  const nowMin   = new Date().getMinutes();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white h-full">

      {/* nav */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 flex-shrink-0 bg-slate-50/50">
        <button onClick={() => setWeekStart(getMonday(new Date()))}
          className="px-4 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm">
          Hoy
        </button>
        <div className="flex gap-1">
          {[{n:-7,icon:'‹'},{n:7,icon:'›'}].map(({n,icon}) => (
            <button key={n} onClick={() => setWeekStart(d => addDays(d, n))}
              className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-slate-200 hover:bg-slate-50 hover:text-blue-600 text-lg font-bold text-slate-500 transition-colors shadow-sm">
              {icon}
            </button>
          ))}
        </div>
        <span className="text-sm font-bold text-slate-700 ml-2">{weekLabel}</span>
      </div>

      {/* day headers */}
      <div className="flex-shrink-0 border-b border-slate-200 shadow-sm z-10 bg-white"
        style={{ display:'grid', gridTemplateColumns:'56px repeat(7,1fr)' }}>
        <div className="border-r border-slate-200" />
        {weekDays.map((d, i) => {
          const today = i === todayIdx;
          return (
            <div key={i} className={`py-2.5 text-center border-r border-slate-200 last:border-r-0 ${today ? 'bg-blue-50/50' : ''}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${today ? 'text-blue-600' : 'text-slate-500'}`}>{WEEKDAYS[i]}</p>
              <p className={`text-xl font-black leading-tight mt-0.5 ${today ? 'text-blue-600' : 'text-slate-800'}`}>
                {d.toLocaleDateString('es-CO',{day:'numeric'})}
              </p>
            </div>
          );
        })}
      </div>

      {/* grid (Scrollable Area) */}
      <div className="flex-1 overflow-y-auto overscroll-contain relative">
        <div className="absolute inset-0">
          {HOURS.map(hour => (
            <div key={hour} className="border-b border-slate-100/80 hover:bg-slate-50/30 transition-colors"
              style={{ display:'grid', gridTemplateColumns:'56px repeat(7,1fr)', height: CELL_H }}>
              {/* hour label */}
              <div className="flex items-start justify-end pr-3 pt-1 border-r border-slate-200 bg-slate-50/30">
                <span className="text-[10px] text-slate-500 font-bold">
                  {hour > 12 ? `${hour-12}pm` : hour === 12 ? '12pm' : `${hour}am`}
                </span>
              </div>
              {/* cells */}
              {weekDays.map((_, dayIdx) => {
                const appts   = grid[dayIdx]?.[hour] ?? [];
                const isToday_= dayIdx === todayIdx;
                const showNow = isToday_ && nowHour === hour;

                return (
                  <div key={dayIdx}
                    className={`border-r border-slate-100/80 last:border-r-0 relative p-1 ${isToday_ ? 'bg-blue-50/10' : ''}`}>

                    {/* "now" line */}
                    {showNow && (
                      <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                        style={{ top: `${(nowMin / 60) * 100}%` }}>
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 -ml-1.5 flex-shrink-0 shadow-sm border-2 border-white" />
                        <div className="flex-1 h-0.5 bg-blue-600 shadow-sm" />
                      </div>
                    )}

                    <div className="flex flex-col gap-1 h-full overflow-hidden">
                      {appts.map(appt => {
                        const cfg    = SC[appt.status];
                        const isSel  = selected?.appointmentId === appt.appointmentId;
                        const nameLabel = appt.service?.name ?? appt.customer.name ?? appt.type;
                        return (
                          <button key={appt.appointmentId} onClick={() => onSelect(isSel ? null : appt)}
                            className="w-full text-left rounded-md px-2 py-1.5 transition-all text-[10px] relative overflow-hidden group"
                            style={{
                              background: isSel ? cfg.bar : cfg.bg,
                              color:      isSel ? '#fff'  : cfg.color,
                              border:     `1px solid ${isSel ? cfg.bar : cfg.bar + '40'}`,
                              boxShadow:  isSel ? `0 4px 12px ${cfg.bar}40` : '0 1px 2px rgba(0,0,0,0.05)',
                              zIndex:     isSel ? 10 : 1
                            }}>
                            <div className="absolute left-0 top-0 bottom-0 w-1 opacity-50 group-hover:opacity-100 transition-opacity" style={{ background: cfg.bar }} />
                            <p className="font-extrabold truncate leading-tight ml-1">{fmtTime(appt.scheduledAt)}</p>
                            <p className="font-medium truncate leading-tight opacity-90 ml-1 mt-0.5">{nameLabel}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats,        setStats]        = useState<Stats>({ total:0, pending:0, confirmed:0, todayCount:0, upcomingWeek:0, inProgress:0, completedTotal:0, cancelledTotal:0, noShowTotal:0 });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [search,       setSearch]       = useState('');
  const [selected,     setSelected]     = useState<Appointment | null>(null);
  const [view,         setView]         = useState<ViewMode>('list');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p: Record<string,string> = {};
      if (filterStatus) p.status = filterStatus;
      if (filterType)   p.type   = filterType;
      const [aR, sR] = await Promise.all([getAppointments(p), getAppointmentStats()]);
      setAppointments(aR.data); setStats(sR.data);
    } catch { setError('Error cargando agendamientos.'); }
    finally { setLoading(false); }
  }, [filterStatus, filterType]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (id: string, data: any) => {
    await updateAppointment(id, data);
    setAppointments(p => p.map(a => a.appointmentId === id ? { ...a, ...data } : a));
    setSelected(p => p?.appointmentId === id ? { ...p, ...data } : p);
  };

  const filtered = appointments.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (a.customer.name ?? '').toLowerCase().includes(q) ||
      a.customer.phone.includes(q) ||
      a.type.toLowerCase().includes(q) ||
      (a.service?.name ?? '').toLowerCase().includes(q) ||
      (a.description ?? '').toLowerCase().includes(q)
    );
  });

  const STATS_CARDS = [
    { icon:'📋', label:'Total',        value: stats.total,        accent:'#1e293b' },
    { icon:'⏳', label:'Pendientes',   value: stats.pending,      accent:'#d97706' },
    { icon:'✅', label:'Confirmadas',  value: stats.confirmed,    accent:'#2563eb' },
    { icon:'⚙️', label:'En curso',     value: stats.inProgress,   accent:'#7c3aed' },
    { icon:'📅', label:'Hoy',          value: stats.todayCount,   accent:'#4f46e5' },
    { icon:'🔜', label:'Esta semana',  value: stats.upcomingWeek, accent:'#16a34a' },
  ];

  return (
    // CAMBIO CLAVE: h-screen y overflow-hidden previenen que toda la página scrollee,
    // forzando a los elementos hijos (flex-1) a scrollear internamente.
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">

      {/* header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-5 shadow-sm flex-shrink-0 z-20">
        <div className="max-w-[1600px] mx-auto">

          {/* title row */}
          <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Agendamientos</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">
                {loading ? 'Cargando datos...' : `${appointments.length} cita${appointments.length !== 1 ? 's' : ''} encontrada${appointments.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* view toggle */}
              <div className="flex items-center bg-slate-100/80 border border-slate-200 rounded-xl p-1 shadow-inner">
                {([
                  { k:'list'     as ViewMode, icon:'☰',  label:'Lista'       },
                  { k:'calendar' as ViewMode, icon:'🗓', label:'Calendario'  },
                ]).map(({ k, icon, label }) => (
                  <button key={k} onClick={() => setView(k)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      view === k 
                        ? 'bg-white shadow-sm text-blue-600 border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}>
                    <span className="text-base leading-none">{icon}</span> {label}
                  </button>
                ))}
              </div>
              <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold rounded-xl shadow-sm transition-colors">
                ↻ Actualizar
              </button>
            </div>
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            {STATS_CARDS.map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="text-2xl bg-slate-50 p-2 rounded-xl border border-slate-100">{s.icon}</div>
                <div>
                  <p className="text-2xl font-black leading-none mb-1" style={{ color: s.accent }}>{s.value}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input type="text" placeholder="Buscar por cliente, servicio, teléfono..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-shadow" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer">
              <option value="">Todos los estados</option>
              {Object.keys(SC).map(k => <option key={k} value={k}>{SC[k as AppointmentStatus].label}</option>)}
            </select>
          </div>

        </div>
      </div>

      {/* MAIN CONTENT AREA
        flex-1 y min-h-0 son vitales para que el scroll interno de los hijos funcione.
      */}
      <div className="flex-1 min-h-0 w-full max-w-[1600px] mx-auto p-4 md:p-6 flex gap-6 overflow-hidden">
        
        {/* Left/Main view (Lista o Calendario) */}
        <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden relative">
          {error && <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-bold z-50 shadow-md border border-red-200">{error}</div>}
          
          {view === 'list' ? (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/30">
              <ListView appointments={filtered} selected={selected} onSelect={setSelected} />
            </div>
          ) : (
            <CalendarView appointments={filtered} selected={selected} onSelect={setSelected} />
          )}
        </div>

        {/* Right panel (Detalles) 
          Ahora vive dentro de la misma grilla flexible, sin estar sobrepuesto (remontado).
        */}
        {selected && (
          <div className="w-80 lg:w-96 flex-shrink-0 flex flex-col h-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-right-8 duration-200">
            <DetailPanel appt={selected} onUpdate={handleUpdate} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>

    </div>
  );
}