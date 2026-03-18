import React, { useState, useEffect, useCallback } from 'react';
import {
  getAppointments, getAppointmentStats,
  updateAppointment, getAppointmentTimeline,
} from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';
type AppointmentPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
type AppointmentSource  = 'AI' | 'MANUAL' | 'WHATSAPP' | 'API';

interface Customer {
  customerId: string;
  name:       string | null;
  phone:      string;
  cedula:     string | null;
  city:       string | null;
}

interface ServiceInfo  { name: string; }
interface VariantInfo  { name: string; }

interface TimelineEntry {
  timelineId:     string;
  action:         string;
  previousStatus: AppointmentStatus | null;
  newStatus:      AppointmentStatus | null;
  note:           string | null;
  isPublic:       boolean;
  performedById:  string | null;
  createdAt:      string;
}

interface Appointment {
  appointmentId:    string;
  type:             string;
  status:           AppointmentStatus;
  priority:         AppointmentPriority;
  source:           AppointmentSource;
  scheduledAt:      string;
  endsAt:           string | null;
  durationMinutes:  number | null;
  description:      string | null;
  address:          string | null;
  notes:            string | null;
  internalNotes:    string | null;
  agreedPrice:      string | null;
  confirmedAt:      string | null;
  completedAt:      string | null;
  cancelledAt:      string | null;
  cancelReason:     string | null;
  createdAt:        string;
  customer:         Customer;
  service:          ServiceInfo | null;
  serviceVariant:   VariantInfo | null;
}

interface Stats {
  total:          number;
  pending:        number;
  confirmed:      number;
  todayCount:     number;
  upcomingWeek:   number;
  inProgress:     number;
  completedTotal: number;
  cancelledTotal: number;
  noShowTotal:    number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; bg: string; tailwind: string }> = {
  PENDING:     { label: 'Pendiente',    color: '#b45309', bg: '#fef3c7', tailwind: 'bg-amber-50 text-amber-700' },
  CONFIRMED:   { label: 'Confirmada',   color: '#1d4ed8', bg: '#dbeafe', tailwind: 'bg-blue-50 text-blue-700' },
  IN_PROGRESS: { label: 'En curso',     color: '#7c3aed', bg: '#ede9fe', tailwind: 'bg-purple-50 text-purple-700' },
  COMPLETED:   { label: 'Completada',   color: '#15803d', bg: '#dcfce7', tailwind: 'bg-green-50 text-green-700' },
  CANCELLED:   { label: 'Cancelada',    color: '#b91c1c', bg: '#fee2e2', tailwind: 'bg-red-50 text-red-700' },
  NO_SHOW:     { label: 'No se presentó', color: '#6b7280', bg: '#f3f4f6', tailwind: 'bg-slate-100 text-slate-500' },
  RESCHEDULED: { label: 'Reagendada',   color: '#0e7490', bg: '#ecfeff', tailwind: 'bg-cyan-50 text-cyan-700' },
};

const PRIORITY_CONFIG: Record<AppointmentPriority, { label: string; tailwind: string; dot: string }> = {
  LOW:    { label: 'Baja',     tailwind: 'text-slate-400', dot: 'bg-slate-300' },
  NORMAL: { label: 'Normal',   tailwind: 'text-slate-500', dot: 'bg-slate-400' },
  HIGH:   { label: 'Alta',     tailwind: 'text-orange-500', dot: 'bg-orange-400' },
  URGENT: { label: 'Urgente',  tailwind: 'text-red-600', dot: 'bg-red-500' },
};

const SOURCE_LABELS: Record<AppointmentSource, string> = {
  AI:       '🤖 IA',
  MANUAL:   '👤 Manual',
  WHATSAPP: '💬 WhatsApp',
  API:      '🔌 API',
};

// Transiciones de estado válidas
const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING:     ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:   ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED:   [],
  CANCELLED:   [],
  NO_SHOW:     [],
  RESCHEDULED: ['CONFIRMED', 'CANCELLED'],
};

const fmt = (n: string | number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n));

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CO', {
  weekday: 'short', day: 'numeric', month: 'short',
  timeZone: 'America/Bogota',
});

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('es-CO', {
  hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota',
});

const fmtDateTime = (iso: string) => new Date(iso).toLocaleDateString('es-CO', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota',
});

const fmtMinutes = (mins: number) => {
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`;
};

const isToday = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
};

const isPast = (iso: string) => new Date(iso) < new Date();

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.tailwind}`}>
      {cfg.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: AppointmentPriority }) {
  const cfg = PRIORITY_CONFIG[priority];
  if (priority === 'NORMAL') return null;
  return (
    <span title={cfg.label} className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
  );
}

function StatsCard({ icon, label, value, color }: {
  icon: string; label: string; value: number; color: string;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex-1 min-w-[110px] shadow-sm">
      <div className="text-xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

// ─── Timeline Panel ───────────────────────────────────────────────────────────

function TimelinePanel({ appointmentId, onClose }: { appointmentId: string; onClose: () => void }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAppointmentTimeline(appointmentId)
      .then(res => setEntries(res.data))
      .finally(() => setLoading(false));
  }, [appointmentId]);

  const ACTION_ICONS: Record<string, string> = {
    CREATED:       '✨',
    CONFIRMED:     '✅',
    IN_PROGRESS:   '⚙️',
    COMPLETED:     '🎉',
    CANCELLED:     '❌',
    NO_SHOW:       '👻',
    RESCHEDULED:   '🔄',
    NOTE_ADDED:    '📝',
    UPDATED:       '✏️',
    REMINDER_SENT: '🔔',
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Historial</p>
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">Cerrar</button>
      </div>
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-2">Cargando...</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-2">Sin historial aún</p>
      ) : (
        <div className="space-y-3">
          {entries.map((e, i) => (
            <div key={e.timelineId} className="flex gap-2.5">
              <div className="flex flex-col items-center">
                <span className="text-base leading-none">{ACTION_ICONS[e.action] ?? '•'}</span>
                {i < entries.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-700">
                    {e.newStatus ? STATUS_CONFIG[e.newStatus]?.label : e.action}
                  </span>
                  {!e.isPublic && (
                    <span className="text-xs bg-slate-100 text-slate-400 px-1.5 rounded">Solo admin</span>
                  )}
                </div>
                {e.note && <p className="text-xs text-slate-500 mt-0.5">{e.note}</p>}
                <p className="text-xs text-slate-400 mt-0.5">{fmtDateTime(e.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

function CancelModal({ onConfirm, onClose, loading }: {
  onConfirm: (reason: string) => void;
  onClose:   () => void;
  loading:   boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <h3 className="font-bold text-slate-800 mb-2">Cancelar cita</h3>
        <p className="text-sm text-slate-500 mb-3">Indica el motivo de cancelación (requerido).</p>
        <textarea value={reason} onChange={e => setReason(e.target.value)}
          rows={3} placeholder="Ej: El cliente canceló, no hay disponibilidad..."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-red-500 transition mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
            Cancelar
          </button>
          <button onClick={() => onConfirm(reason)} disabled={!reason.trim() || loading}
            className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition">
            {loading ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ appt, onUpdate, onClose }: {
  appt:     Appointment;
  onUpdate: (id: string, data: any) => Promise<void>;
  onClose:  () => void;
}) {
  const [updating,      setUpdating]      = useState(false);
  const [showTimeline,  setShowTimeline]  = useState(false);
  const [showCancel,    setShowCancel]    = useState(false);
  const transitions = VALID_TRANSITIONS[appt.status] ?? [];

  const handleStatus = async (newStatus: AppointmentStatus, cancelReason?: string) => {
    if (newStatus === 'CANCELLED' && !cancelReason) { setShowCancel(true); return; }
    setUpdating(true);
    await onUpdate(appt.appointmentId, {
      status: newStatus,
      ...(cancelReason ? { cancelReason } : {}),
    });
    setUpdating(false);
    setShowCancel(false);
  };

  const internalSection = appt.internalNotes || appt.cancelReason;

  return (
    <>
      <div className="w-80 bg-white border border-slate-100 rounded-2xl shadow-sm flex-shrink-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <StatusBadge status={appt.status} />
              <PriorityDot priority={appt.priority} />
              {appt.priority !== 'NORMAL' && (
                <span className={`text-xs font-medium ${PRIORITY_CONFIG[appt.priority].tailwind}`}>
                  {PRIORITY_CONFIG[appt.priority].label}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800 leading-tight mt-1 truncate">
              {appt.service ? `${appt.service.name}${appt.serviceVariant ? ` — ${appt.serviceVariant.name}` : ''}` : appt.type}
            </p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition ml-2 flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
          {/* Fecha y hora */}
          <div className="bg-slate-50 rounded-xl px-3 py-2.5">
            <p className="text-xs text-slate-400 mb-0.5">📅 Fecha y hora</p>
            <p className="text-sm font-semibold text-slate-800">{fmtDate(appt.scheduledAt)}</p>
            <p className="text-sm text-slate-600">{fmtTime(appt.scheduledAt)}{appt.endsAt ? ` → ${fmtTime(appt.endsAt)}` : ''}</p>
            {appt.durationMinutes && (
              <p className="text-xs text-slate-400 mt-0.5">⏱ {fmtMinutes(appt.durationMinutes)}</p>
            )}
          </div>

          {/* Cliente */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Cliente</p>
            <p className="text-sm font-medium text-slate-800">{appt.customer.name ?? 'Sin nombre'}</p>
            <p className="text-xs text-slate-500">{appt.customer.phone}</p>
            {appt.customer.cedula && <p className="text-xs text-slate-500">CC: {appt.customer.cedula}</p>}
            {appt.customer.city && <p className="text-xs text-slate-500">{appt.customer.city}</p>}
          </div>

          {/* Descripción */}
          {appt.description && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">📝 Descripción</p>
              <p className="text-sm text-slate-700">{appt.description}</p>
            </div>
          )}

          {/* Dirección */}
          {appt.address && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">📍 Dirección</p>
              <p className="text-sm text-slate-700">{appt.address}</p>
            </div>
          )}

          {/* Notas del cliente */}
          {appt.notes && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">🗒️ Notas</p>
              <p className="text-sm text-slate-700">{appt.notes}</p>
            </div>
          )}

          {/* Precio acordado */}
          {appt.agreedPrice && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">💰 Precio acordado</p>
              <p className="text-sm font-semibold text-slate-800">{fmt(appt.agreedPrice)}</p>
            </div>
          )}

          {/* Solo admin */}
          {internalSection && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 space-y-2">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Solo admin</p>
              {appt.internalNotes && <p className="text-xs text-amber-800">{appt.internalNotes}</p>}
              {appt.cancelReason && (
                <div>
                  <p className="text-xs font-semibold text-red-600">Motivo de cancelación</p>
                  <p className="text-xs text-red-700">{appt.cancelReason}</p>
                </div>
              )}
            </div>
          )}

          {/* Origen */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{SOURCE_LABELS[appt.source] ?? appt.source}</span>
            <span>{fmtDate(appt.createdAt)}</span>
          </div>

          {/* Acciones de estado */}
          {transitions.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Cambiar estado</p>
              <div className="flex flex-col gap-1.5">
                {transitions.map(s => (
                  <button key={s} onClick={() => handleStatus(s)} disabled={updating}
                    className="w-full py-2 px-3 rounded-xl text-xs font-medium text-left disabled:opacity-50 transition"
                    style={{
                      background: STATUS_CONFIG[s].bg,
                      color: STATUS_CONFIG[s].color,
                    }}>
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <button onClick={() => setShowTimeline(s => !s)}
            className="w-full text-xs text-blue-600 hover:text-blue-800 text-left py-1 flex items-center gap-1 transition">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            {showTimeline ? 'Ocultar historial' : 'Ver historial'}
          </button>

          {showTimeline && (
            <TimelinePanel appointmentId={appt.appointmentId} onClose={() => setShowTimeline(false)} />
          )}
        </div>
      </div>

      {showCancel && (
        <CancelModal
          onConfirm={(reason) => handleStatus('CANCELLED', reason)}
          onClose={() => setShowCancel(false)}
          loading={updating}
        />
      )}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats,        setStats]        = useState<Stats>({
    total: 0, pending: 0, confirmed: 0, todayCount: 0,
    upcomingWeek: 0, inProgress: 0, completedTotal: 0, cancelledTotal: 0, noShowTotal: 0,
  });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [search,       setSearch]       = useState('');
  const [selected,     setSelected]     = useState<Appointment | null>(null);

  // ── Carga ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType)   params.type   = filterType;

      const [apptRes, statsRes] = await Promise.all([
        getAppointments(params),
        getAppointmentStats(),
      ]);
      setAppointments(apptRes.data);
      setStats(statsRes.data);
    } catch {
      setError('Error cargando agendamientos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType]);

  useEffect(() => { load(); }, [load]);

  // ── Actualizar cita ────────────────────────────────────────────────────────
  const handleUpdate = async (id: string, data: any) => {
    await updateAppointment(id, data);
    setAppointments(prev =>
      prev.map(a => a.appointmentId === id ? { ...a, ...data } : a)
    );
    setSelected(prev => prev?.appointmentId === id ? { ...prev, ...data } : prev);
  };

  // ── Filtro local por búsqueda ──────────────────────────────────────────────
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Agendamientos</h1>
              <p className="text-sm text-slate-400 mt-0.5">Citas y servicios gestionados por la IA y el equipo</p>
            </div>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
              <svg className={loading ? 'animate-spin' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
              Actualizar
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-3 flex-wrap mb-4">
            <StatsCard icon="📋" label="Total"        value={stats.total}        color="text-slate-800" />
            <StatsCard icon="⏳" label="Pendientes"   value={stats.pending}      color="text-amber-600" />
            <StatsCard icon="✅" label="Confirmadas"  value={stats.confirmed}    color="text-blue-600" />
            <StatsCard icon="⚙️" label="En curso"     value={stats.inProgress}   color="text-purple-600" />
            <StatsCard icon="📅" label="Hoy"          value={stats.todayCount}   color="text-indigo-600" />
            <StatsCard icon="🔜" label="Esta semana"  value={stats.upcomingWeek} color="text-green-600" />
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar cliente, tipo, servicio..."
                className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-56" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600">
              <option value="">Todos los estados</option>
              {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600">
              <option value="">Todos los tipos</option>
              <option value="cita">Cita</option>
              <option value="visita_tecnica">Visita técnica</option>
              <option value="otro">Otro</option>
            </select>
            {(search || filterStatus || filterType) && (
              <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); }}
                className="text-xs text-blue-600 hover:underline">
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-4 items-start">
          {/* Tabla */}
          <div className="flex-1 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden min-w-0">
            {loading ? (
              <div className="flex items-center justify-center h-64 text-slate-400">
                <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                <span className="text-4xl">📅</span>
                <p className="text-sm">
                  {search || filterStatus || filterType
                    ? 'Sin resultados para este filtro'
                    : 'No hay agendamientos aún'}
                </p>
                {!search && !filterStatus && !filterType && (
                  <p className="text-xs text-center max-w-xs">
                    La IA los crea automáticamente cuando un cliente agenda por WhatsApp.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['', 'Cliente', 'Servicio / Tipo', 'Fecha', 'Hora', 'Duración', 'Estado', ''].map((h, i) => (
                        <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(appt => {
                      const isSelected = selected?.appointmentId === appt.appointmentId;
                      const todayAppt  = isToday(appt.scheduledAt);
                      const pastAppt   = isPast(appt.scheduledAt) && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appt.status);

                      return (
                        <tr key={appt.appointmentId}
                          onClick={() => setSelected(isSelected ? null : appt)}
                          className={`border-b border-slate-50 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50' : pastAppt ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-slate-50'
                          }`}>
                          {/* Prioridad dot */}
                          <td className="pl-4 pr-2 py-3 w-4">
                            <PriorityDot priority={appt.priority} />
                          </td>

                          {/* Cliente */}
                          <td className="px-3 py-3">
                            <p className="text-sm font-medium text-slate-800 whitespace-nowrap">
                              {appt.customer.name ?? 'Sin nombre'}
                            </p>
                            <p className="text-xs text-slate-400">{appt.customer.phone}</p>
                          </td>

                          {/* Servicio / Tipo */}
                          <td className="px-3 py-3 max-w-[180px]">
                            {appt.service ? (
                              <div>
                                <p className="text-sm font-medium text-slate-700 truncate">{appt.service.name}</p>
                                {appt.serviceVariant && (
                                  <p className="text-xs text-slate-400 truncate">{appt.serviceVariant.name}</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-600">{appt.type}</p>
                            )}
                          </td>

                          {/* Fecha */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <p className={`text-sm font-medium ${todayAppt ? 'text-blue-600' : 'text-slate-700'}`}>
                              {todayAppt ? '🔵 Hoy' : fmtDate(appt.scheduledAt)}
                            </p>
                          </td>

                          {/* Hora */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <p className="text-sm font-semibold text-slate-800">{fmtTime(appt.scheduledAt)}</p>
                            {appt.endsAt && (
                              <p className="text-xs text-slate-400">{fmtTime(appt.endsAt)}</p>
                            )}
                          </td>

                          {/* Duración */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            {appt.durationMinutes ? (
                              <span className="text-xs text-slate-500">{fmtMinutes(appt.durationMinutes)}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Estado */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <StatusBadge status={appt.status} />
                          </td>

                          {/* Chevron */}
                          <td className="px-4 py-3">
                            <svg className="text-slate-300" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Panel detalle */}
          {selected && (
            <DetailPanel
              appt={selected}
              onUpdate={handleUpdate}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
