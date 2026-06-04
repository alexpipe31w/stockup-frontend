import React, { useState, useEffect, useCallback } from 'react';
import {
  getAppointments, getAppointmentStats,
  updateAppointment, getAppointmentTimeline,
  createAppointment, getCustomers, getServices,
} from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  Bot, User, MessageSquare, Plug, Sparkles, CheckCircle, Loader,
  PartyPopper, XCircle, Ghost, RefreshCw, FileText, PenLine,
  CalendarDays, DollarSign, CreditCard,
  AlertTriangle, Check, X, Clock,
} from 'lucide-react';

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
  // Payment fields
  paymentStatus?:      string | null;
  paymentMethod?:      string | null;
  paymentAmount?:      number | null;
  paymentNotes?:       string | null;
  paymentConfirmedAt?: string | null;
  paymentProofUrl?:    string | null;
  // Pending action fields
  pendingAction?:      string | null;
  pendingActionReason?: string | null;
  pendingActionData?:  Record<string, any> | null;
}
interface CustomerOption { customerId: string; name: string | null; phone: string; }
interface ServiceOption  { serviceId:  string; name: string; }
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
  NO_SHOW:     { label: 'No se presentó', color: '#374151', bg: '#f3f4f6', bar: '#9ca3af', tw: 'bg-surface-overlay text-txt-secondary' },
  RESCHEDULED: { label: 'Reagendada',     color: '#164e63', bg: '#ecfeff', bar: '#06b6d4', tw: 'bg-cyan-50 text-cyan-700' },
};

const PC: Record<AppointmentPriority, { label: string; dot: string }> = {
  LOW:    { label: 'Baja',    dot: '#d1d5db' },
  NORMAL: { label: 'Normal',  dot: '#9ca3af' },
  HIGH:   { label: 'Alta',    dot: '#f97316' },
  URGENT: { label: 'Urgente', dot: '#ef4444' },
};

const SRC_ICON: Record<AppointmentSource, React.ElementType> = {
  AI: Bot, MANUAL: User, WHATSAPP: MessageSquare, API: Plug,
};
const SRC_LABEL: Record<AppointmentSource, string> = {
  AI: 'IA', MANUAL: 'Manual', WHATSAPP: 'WhatsApp', API: 'API',
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
  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#0A0A0F] text-xs font-bold flex-shrink-0"
    style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}> 
    {name?.[0]?.toUpperCase() ?? phone[1]}
  </div>
);

// ─── Timeline ────────────────────────────────────────────────────────────────

const TICONS: Record<string, React.ElementType> = {
  CREATED: Sparkles, CONFIRMED: CheckCircle, IN_PROGRESS: Loader,
  COMPLETED: PartyPopper, CANCELLED: XCircle, NO_SHOW: Ghost,
  RESCHEDULED: RefreshCw, NOTE_ADDED: FileText, UPDATED: PenLine,
};
const TICON_COLOR: Record<string, string> = {
  CREATED: 'text-lime', CONFIRMED: 'text-info', IN_PROGRESS: 'text-warning',
  COMPLETED: 'text-success', CANCELLED: 'text-error', NO_SHOW: 'text-txt-tertiary',
  RESCHEDULED: 'text-info', NOTE_ADDED: 'text-txt-secondary', UPDATED: 'text-txt-secondary',
};

function TimelinePanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getAppointmentTimeline(id).then(r => setEntries(r.data)).finally(() => setLoading(false)); }, [id]);
  return (
    <div className="mt-3 pt-3 border-t border-border-subtle">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-txt-tertiary uppercase tracking-wider">Historial</p>
        <button onClick={onClose} className="text-xs text-txt-tertiary hover:text-txt-secondary">Cerrar</button>
      </div>
      {loading ? <p className="text-xs text-txt-tertiary text-center py-2">Cargando...</p>
      : entries.length === 0 ? <p className="text-xs text-txt-tertiary text-center py-2">Sin historial</p>
      : entries.map((e, i) => (
        <div key={e.timelineId} className="flex gap-2 mb-2">
          <div className="flex flex-col items-center">
            {(() => { const Icon = TICONS[e.action]; return Icon ? <Icon size={14} className={TICON_COLOR[e.action] ?? 'text-txt-tertiary'} /> : <span className="w-1.5 h-1.5 rounded-full bg-txt-tertiary" />; })()}
            {i < entries.length - 1 && <div className="w-px flex-1 bg-surface-overlay mt-1" />}
          </div>
          <div className="flex-1 pb-1">
            <p className="text-xs font-medium text-txt-primary">
              {e.newStatus ? SC[e.newStatus]?.label : e.action}
              {!e.isPublic && <span className="ml-1.5 text-[10px] bg-surface-overlay text-txt-tertiary px-1.5 py-0.5 rounded">Admin</span>}
            </p>
            {e.note && <p className="text-xs text-txt-secondary">{e.note}</p>}
            <p className="text-[10px] text-txt-tertiary">{fmtDT(e.createdAt)}</p>
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
      <div className="bg-surface rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="font-bold text-txt-primary mb-1">Cancelar cita</h3>
        <p className="text-sm text-txt-secondary mb-3">Motivo de cancelación (requerido)</p>
        <textarea value={r} onChange={e => setR(e.target.value)} rows={3}
          placeholder="Ej: Cliente canceló, sin disponibilidad..."
          className="w-full px-3 py-2 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-surface-overlay text-txt-secondary hover:bg-border-default transition">Volver</button>
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
  const [saving,          setSaving]          = useState(false);
  const [showTL,          setShowTL]          = useState(false);
  const [showCancel,      setShowCancel]      = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'detalle' | 'pago' | 'editar'>('detalle');
  const [editForm, setEditForm] = useState({
    scheduledAt:     '',
    endsAt:          '',
    durationMinutes: '',
    description:     '',
    address:         '',
    agreedPrice:     '',
    notes:           '',
    internalNotes:   '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editSaved,  setEditSaved]  = useState(false);
  const [paymentForm,     setPaymentForm]     = useState({ paymentMethod: '', paymentAmount: '', paymentNotes: '' });
  const [resolvingAction, setResolvingAction] = useState(false);

  // Reset tabs and payment form when the appointment changes
  useEffect(() => {
    setActiveDetailTab('detalle');
    setPaymentForm({ paymentMethod: '', paymentAmount: '', paymentNotes: '' });
    setEditForm({
      scheduledAt:     appt.scheduledAt ? appt.scheduledAt.slice(0, 16) : '',
      endsAt:          appt.endsAt      ? appt.endsAt.slice(0, 16)      : '',
      durationMinutes: appt.durationMinutes != null ? String(appt.durationMinutes) : '',
      description:     appt.description    ?? '',
      address:         appt.address        ?? '',
      agreedPrice:     appt.agreedPrice    != null ? String(appt.agreedPrice) : '',
      notes:           appt.notes          ?? '',
      internalNotes:   appt.internalNotes  ?? '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appt.appointmentId]);

  const cfg = SC[appt.status];
  const transitions = TRANSITIONS[appt.status] ?? [];

  const doStatus = async (s: AppointmentStatus, cancelReason?: string) => {
    if (s === 'CANCELLED' && !cancelReason) { setShowCancel(true); return; }
    setSaving(true);
    await onUpdate(appt.appointmentId, { status: s, ...(cancelReason ? { cancelReason } : {}) });
    setSaving(false); setShowCancel(false);
  };

  const handleConfirmPayment = async () => {
    setSaving(true);
    try {
      await onUpdate(appt.appointmentId, {
        paymentStatus: 'PAID',
        ...(paymentForm.paymentMethod && { paymentMethod: paymentForm.paymentMethod }),
        ...(paymentForm.paymentAmount && { paymentAmount: Number(paymentForm.paymentAmount) }),
        ...(paymentForm.paymentNotes  && { paymentNotes:  paymentForm.paymentNotes }),
      });
      setPaymentForm({ paymentMethod: '', paymentAmount: '', paymentNotes: '' });
    } catch (err: any) {
      console.error('Error confirming payment:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleResolveAction = async (resolution: 'approved' | 'rejected') => {
    if (resolvingAction) return;
    setResolvingAction(true);
    try {
      await onUpdate(appt.appointmentId, {
        pendingActionResolution: resolution,
        ...(resolution === 'rejected' && { rejectionReason: 'Solicitud rechazada por el admin' }),
      });
      onClose();
    } finally {
      setResolvingAction(false);
    }
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    setEditSaved(false);
    try {
      const payload: Record<string, any> = {};
      if (editForm.scheduledAt)     payload.scheduledAt     = new Date(editForm.scheduledAt).toISOString();
      if (editForm.endsAt)          payload.endsAt          = new Date(editForm.endsAt).toISOString();
      if (editForm.durationMinutes) payload.durationMinutes = Number(editForm.durationMinutes);
      payload.description   = editForm.description   || null;
      payload.address       = editForm.address       || null;
      payload.agreedPrice   = editForm.agreedPrice   ? Number(editForm.agreedPrice) : null;
      payload.notes         = editForm.notes         || null;
      payload.internalNotes = editForm.internalNotes || null;
      await onUpdate(appt.appointmentId, payload);
      setEditSaved(true);
      setTimeout(() => setEditSaved(false), 3000);
    } finally {
      setEditSaving(false);
    }
  };

  const label = appt.service
    ? `${appt.service.name}${appt.serviceVariant ? ` · ${appt.serviceVariant.name}` : ''}`
    : appt.type;

  return (
    <>
      <div className="w-72 xl:w-80 bg-surface border border-border-subtle rounded-2xl shadow-lg flex-shrink-0 overflow-hidden flex flex-col">
        {/* status bar */}
        <div className="h-1.5" style={{ background: cfg.bar }} />

        {/* header */}
        <div className="px-4 pt-3 pb-2.5 border-b border-border-subtle flex items-start gap-2">
          <Avatar name={appt.customer.name} phone={appt.customer.phone} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-txt-primary truncate leading-tight">{label}</p>
            <p className="text-xs text-txt-tertiary truncate">{appt.customer.name ?? appt.customer.phone}</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-txt-tertiary hover:bg-surface-overlay flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Detail tab selector */}
        <div className="flex border-b border-border-subtle px-4">
          {(['detalle', 'pago', 'editar'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveDetailTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition capitalize ${
                activeDetailTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-txt-secondary hover:text-txt-primary'
              }`}
            >
              {tab === 'detalle' ? 'Detalle' : tab === 'pago' ? 'Pago' : 'Editar'}
            </button>
          ))}
        </div>

        {/* body */}
        {activeDetailTab === 'detalle' && (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">

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
            <div className="bg-surface-elevated rounded-xl px-3 py-2.5">
              <p className="text-xs text-txt-tertiary mb-0.5 flex items-center gap-1"><CalendarDays size={11} /> Fecha y hora</p>
              <p className="font-semibold text-txt-primary">{fmtDateFull(appt.scheduledAt)}</p>
              <p className="text-txt-secondary text-sm">
                {fmtTime(appt.scheduledAt)}{appt.endsAt ? ` → ${fmtTime(appt.endsAt)}` : ''}
                {appt.durationMinutes && <span className="text-txt-tertiary ml-1.5">({fmtMins(appt.durationMinutes)})</span>}
              </p>
            </div>

            {/* cliente */}
            <div>
              <p className="text-[10px] font-bold text-txt-tertiary uppercase tracking-wider mb-1.5">Cliente</p>
              <p className="font-medium text-txt-primary">{appt.customer.name ?? 'Sin nombre'}</p>
              <p className="text-xs text-txt-secondary">{appt.customer.phone}</p>
              {appt.customer.cedula && <p className="text-xs text-txt-tertiary">CC {appt.customer.cedula}</p>}
              {appt.customer.city   && <p className="text-xs text-txt-tertiary">{appt.customer.city}</p>}
            </div>

            {/* detalles */}
            {[
              appt.description && ['Descripción', appt.description],
              appt.address && ['Dirección', appt.address],
              appt.notes && ['Notas', appt.notes],
              appt.agreedPrice && ['Precio acordado', fmtCOP(appt.agreedPrice)],
            ].filter(Boolean).map(([k, v]: any) => (
              <div key={k}>
                <p className="text-[10px] font-bold text-txt-tertiary uppercase tracking-wider mb-0.5">{k}</p>
                <p className="text-txt-primary text-sm">{v}</p>
              </div>
            ))}

            {/* notas internas / cancelación */}
            {(appt.internalNotes || appt.cancelReason) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Solo admin</p>
                {appt.internalNotes && <p className="text-xs text-amber-800">{appt.internalNotes}</p>}
                {appt.cancelReason && (
                  <>
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mt-1.5 mb-0.5">Cancelación</p>
                    <p className="text-xs text-red-700">{appt.cancelReason}</p>
                  </>
                )}
              </div>
            )}

            {/* fuente */}
            <div className="flex items-center justify-between text-xs text-txt-tertiary">
              <span><span className="inline-flex items-center gap-1">{(() => { const Icon = SRC_ICON[appt.source]; return Icon ? <Icon size={11} /> : null; })()}{SRC_LABEL[appt.source] ?? appt.source}</span></span>
              <span>{fmtDT(appt.createdAt)}</span>
            </div>

            {/* pending action card */}
            {appt.pendingAction && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  <AlertTriangle size={14} className="text-warning inline mr-1" /> Solicitud de {appt.pendingAction === 'CANCEL_REQUESTED' ? 'cancelación' : 'reprogramación'}
                </p>
                {appt.pendingActionReason && (
                  <p className="text-xs text-amber-700 mb-2">
                    Motivo: "{String(appt.pendingActionReason).slice(0, 150)}"
                  </p>
                )}
                {appt.pendingAction === 'RESCHEDULE_REQUESTED' &&
                 (appt.pendingActionData as any)?.newDate && (
                  <p className="text-xs text-amber-700 mb-2">
                    Nueva fecha: {(appt.pendingActionData as any).newDate}
                    {(appt.pendingActionData as any).newTime
                      ? ` a las ${(appt.pendingActionData as any).newTime}`
                      : ''}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleResolveAction('approved')}
                    disabled={resolvingAction}
                    className="flex-1 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 disabled:opacity-50 transition"
                  >
                    <Check size={13} className="inline mr-1" />Aprobar
                  </button>
                  <button
                    onClick={() => handleResolveAction('rejected')}
                    disabled={resolvingAction}
                    className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-50 transition"
                  >
                    <X size={13} className="inline mr-1" />Rechazar
                  </button>
                </div>
              </div>
            )}

            {/* transiciones */}
            {transitions.length > 0 && (
              <div className="border-t border-border-subtle pt-3">
                <p className="text-[10px] font-bold text-txt-tertiary uppercase tracking-wider mb-2">Cambiar estado</p>
                <div className="flex flex-col gap-1.5">
                  {transitions.map(s => (
                    <button key={s} onClick={() => doStatus(s)} disabled={saving}
                      className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-left transition flex items-center gap-2 disabled:opacity-50"
                      style={{ background: SC[s].bg, color: SC[s].color }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SC[s].bar }} />
                      {SC[s].label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* historial */}
            <button onClick={() => setShowTL(v => !v)}
              className="w-full text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1.5 py-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              {showTL ? 'Ocultar historial' : 'Ver historial'}
            </button>
            {showTL && <TimelinePanel id={appt.appointmentId} onClose={() => setShowTL(false)} />}
          </div>
        )}

        {/* payment tab */}
        {activeDetailTab === 'pago' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            {/* Payment status badge */}
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                appt.paymentStatus === 'PAID'     ? 'bg-green-100 text-green-700' :
                appt.paymentStatus === 'PARTIAL'  ? 'bg-yellow-100 text-yellow-700' :
                appt.paymentStatus === 'REFUNDED' ? 'bg-blue-100 text-blue-700' :
                                                     'bg-surface-overlay text-txt-secondary'
              }`}>
                {appt.paymentStatus === 'PAID'     ? 'Pagado' :
                 appt.paymentStatus === 'PARTIAL'  ? 'Parcial' :
                 appt.paymentStatus === 'REFUNDED' ? '↩️ Reembolsado' : '⏳ Pendiente'}
              </span>
              {appt.paymentConfirmedAt && (
                <span className="text-xs text-txt-tertiary">
                  Confirmado el {new Date(appt.paymentConfirmedAt).toLocaleDateString('es-CO')}
                </span>
              )}
            </div>

            {appt.paymentStatus !== 'PAID' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-txt-secondary mb-1 block">Método de pago</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={e => setPaymentForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-border-default bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-lime/30"
                  >
                    <option value="">Seleccionar...</option>
                    {['efectivo','transferencia','tarjeta','nequi','daviplata','otro'].map(m => (
                      <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-txt-secondary mb-1 block">Monto pagado</label>
                  <input
                    type="number"
                    value={paymentForm.paymentAmount}
                    onChange={e => setPaymentForm(f => ({ ...f, paymentAmount: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-border-default bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-lime/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-txt-secondary mb-1 block">Notas</label>
                  <textarea
                    rows={2}
                    value={paymentForm.paymentNotes}
                    onChange={e => setPaymentForm(f => ({ ...f, paymentNotes: e.target.value }))}
                    placeholder="Referencia, número de transacción..."
                    className="w-full px-3 py-2 rounded-xl border border-border-default bg-surface-elevated text-sm resize-none focus:outline-none focus:ring-2 focus:ring-lime/30"
                  />
                </div>
                {appt.paymentProofUrl && (
                  <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                    <CreditCard size={12} className="inline mr-1" /> Comprobante detectado por IA: "{String(appt.paymentProofUrl).slice(0, 100)}"
                  </div>
                )}
                <button
                  onClick={handleConfirmPayment}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
                >
                  {saving ? 'Guardando...' : 'Confirmar pago'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* edit tab */}
        {activeDetailTab === 'editar' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
            <div>
              <label className="text-xs font-medium text-txt-secondary mb-1 block">Fecha y hora</label>
              <input
                type="datetime-local"
                value={editForm.scheduledAt}
                onChange={e => setEditForm(f => ({ ...f, scheduledAt: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-border-default bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-lime/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-txt-secondary mb-1 block">Hora de fin</label>
              <input
                type="datetime-local"
                value={editForm.endsAt}
                onChange={e => setEditForm(f => ({ ...f, endsAt: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-border-default bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-lime/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-txt-secondary mb-1 block">Duración (minutos)</label>
              <input
                type="number"
                min={5}
                max={1440}
                value={editForm.durationMinutes}
                onChange={e => setEditForm(f => ({ ...f, durationMinutes: e.target.value }))}
                placeholder="60"
                className="w-full px-3 py-2 rounded-xl border border-border-default bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-lime/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-txt-secondary mb-1 block">Descripción</label>
              <textarea
                rows={2}
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Tipo de servicio, detalles..."
                className="w-full px-3 py-2 rounded-xl border border-border-default bg-surface-elevated text-sm resize-none focus:outline-none focus:ring-2 focus:ring-lime/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-txt-secondary mb-1 block">Dirección</label>
              <input
                value={editForm.address}
                onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Calle 123..."
                className="w-full px-3 py-2 rounded-xl border border-border-default bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-lime/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-txt-secondary mb-1 block">Precio acordado (COP)</label>
              <input
                type="number"
                min={0}
                value={editForm.agreedPrice}
                onChange={e => setEditForm(f => ({ ...f, agreedPrice: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl border border-border-default bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-lime/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-txt-secondary mb-1 block">Notas al cliente</label>
              <textarea
                rows={2}
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Instrucciones, recordatorios..."
                className="w-full px-3 py-2 rounded-xl border border-border-default bg-surface-elevated text-sm resize-none focus:outline-none focus:ring-2 focus:ring-lime/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-txt-secondary mb-1 block">Notas internas</label>
              <textarea
                rows={2}
                value={editForm.internalNotes}
                onChange={e => setEditForm(f => ({ ...f, internalNotes: e.target.value }))}
                placeholder="Solo visible para el admin..."
                className="w-full px-3 py-2 rounded-xl border border-border-default bg-surface-elevated text-sm resize-none focus:outline-none focus:ring-2 focus:ring-lime/30"
              />
            </div>
            <button
              onClick={handleEditSave}
              disabled={editSaving}
              className="w-full py-2.5 rounded-xl text-txt-inverse gradient-brand"
            >
              {editSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            {editSaved && (
              <p className="text-xs text-green-600 font-medium text-center flex items-center justify-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Cita actualizada correctamente
              </p>
            )}
          </div>
        )}
      </div>

      {showCancel && (
        <CancelModal onConfirm={r => doStatus('CANCELLED', r)} onClose={() => setShowCancel(false)} saving={saving} />
      )}
    </>
  );
}

// ─── New Appointment Modal ─────────────────────────────────────────────────────

function NewAppointmentModal({ storeId, onCreated, onClose }: {
  storeId: string;
  onCreated: () => void;
  onClose: () => void;
}) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [services,  setServices]  = useState<ServiceOption[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(true);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const defaultDT = tomorrow.toISOString().slice(0, 16);

  const [form, setForm] = useState({
    customerId:      '',
    serviceId:       '',
    scheduledAt:     defaultDT,
    durationMinutes: '60',
    description:     '',
    address:         '',
    agreedPrice:     '',
    notes:           '',
    priority:        'NORMAL' as AppointmentPriority,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    Promise.all([getCustomers(storeId), getServices()])
      .then(([cr, sr]) => {
        setCustomers(cr.data);
        setServices(sr.data);
      })
      .catch(() => {})
      .finally(() => setLoadingOpts(false));
  }, [storeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.scheduledAt) {
      setError('Cliente y fecha/hora son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createAppointment({
        customerId:      form.customerId,
        serviceId:       form.serviceId       || undefined,
        scheduledAt:     new Date(form.scheduledAt).toISOString(),
        durationMinutes: form.durationMinutes  ? Number(form.durationMinutes) : undefined,
        description:     form.description     || undefined,
        address:         form.address         || undefined,
        agreedPrice:     form.agreedPrice      ? Number(form.agreedPrice) : undefined,
        notes:           form.notes           || undefined,
        priority:        form.priority,
        source:          'MANUAL',
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al crear la cita.');
    } finally {
      setSaving(false);
    }
  };

  const ic = 'w-full px-3 py-2 rounded-xl border border-border-default bg-surface-elevated text-sm focus:outline-none focus:ring-2 focus:ring-lime/30 text-txt-primary';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle sticky top-0 bg-surface z-10">
          <h2 className="text-base font-bold text-txt-primary">Nueva cita manual</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-txt-tertiary hover:bg-surface-overlay">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {loadingOpts ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin text-blue-600" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-txt-secondary mb-1.5">Cliente *</label>
              <select
                value={form.customerId}
                onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}
                className={ic}
                required
              >
                <option value="">Seleccionar cliente...</option>
                {customers.map(c => (
                  <option key={c.customerId} value={c.customerId}>
                    {c.name ? `${c.name} — ${c.phone}` : c.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-txt-secondary mb-1.5">Servicio</label>
              <select
                value={form.serviceId}
                onChange={e => setForm(f => ({ ...f, serviceId: e.target.value }))}
                className={ic}
              >
                <option value="">Sin servicio específico</option>
                {services.map(s => (
                  <option key={s.serviceId} value={s.serviceId}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-txt-secondary mb-1.5">Fecha y hora *</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                  className={ic}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-txt-secondary mb-1.5">Duración (min)</label>
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={form.durationMinutes}
                  onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
                  className={ic}
                  placeholder="60"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-txt-secondary mb-1.5">Precio acordado (COP)</label>
                <input
                  type="number"
                  min={0}
                  value={form.agreedPrice}
                  onChange={e => setForm(f => ({ ...f, agreedPrice: e.target.value }))}
                  className={ic}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-txt-secondary mb-1.5">Prioridad</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value as AppointmentPriority }))}
                  className={ic}
                >
                  <option value="LOW">Baja</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-txt-secondary mb-1.5">Descripción</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Detalles del servicio..."
                className={`${ic} resize-none`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-txt-secondary mb-1.5">Dirección</label>
              <input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Calle, barrio..."
                className={ic}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-txt-secondary mb-1.5">Notas al cliente</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Instrucciones, recordatorios..."
                className={`${ic} resize-none`}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2.5 text-xs">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-border-default text-txt-secondary text-sm font-semibold hover:bg-surface-elevated transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !form.customerId || !form.scheduledAt}
                className="flex-1 py-2.5 rounded-xl text-txt-inverse gradient-brand"
              >
                {saving ? 'Creando...' : 'Crear cita'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ appointments, selected, onSelect }: {
  appointments: Appointment[]; selected: Appointment | null; onSelect:(a:Appointment|null)=>void;
}) {
  if (appointments.length === 0) return (
    <div className="flex-1 bg-surface border border-border-subtle rounded-2xl flex flex-col items-center justify-center gap-3 text-txt-tertiary py-24">
      <CalendarDays size={48} className="text-txt-disabled mx-auto" strokeWidth={1} />
      <p className="text-sm font-medium">Sin agendamientos</p>
      <p className="text-xs max-w-xs text-center">La IA los crea automáticamente cuando un cliente agenda por WhatsApp.</p>
    </div>
  );

  // Agrupar por fecha
  const groups: Map<string, Appointment[]> = new Map();
  [...appointments]
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .forEach(a => {
      const k = fmtDateFull(a.scheduledAt);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(a);
    });

  return (
    <div className="flex-1 min-w-0 space-y-5">
      {Array.from(groups.entries()).map(([dateLabel, appts]: [string, Appointment[]]) => {
        const today = isToday(appts[0].scheduledAt);
        return (
          <div key={dateLabel}>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${today ? 'bg-blue-600 text-white' : 'bg-surface-overlay text-txt-secondary'}`}>
                {today ? <span className="text-info font-semibold">Hoy</span> : dateLabel}
              </span>
              <div className="flex-1 h-px bg-surface-overlay" />
              <span className="text-xs text-txt-tertiary">{appts.length} cita{appts.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-2">
              {appts.map((appt: Appointment) => {
                const isSel  = selected?.appointmentId === appt.appointmentId;
                const past   = isPastUnres(appt);
                const label  = appt.service ? `${appt.service.name}${appt.serviceVariant ? ` · ${appt.serviceVariant.name}` : ''}` : appt.type;
                const cfg    = SC[appt.status];

                return (
                  <button key={appt.appointmentId} onClick={() => onSelect(isSel ? null : appt)}
                    className={`w-full text-left rounded-2xl border transition-all overflow-hidden ${
                      isSel  ? 'border-blue-400 shadow-md ring-2 ring-blue-100'
                      : past ? 'border-red-100 bg-red-50/20 hover:border-red-200'
                             : 'border-border-subtle bg-surface hover:border-border-default hover:shadow-sm'
                    }`}>
                    {/* color bar */}
                    <div className="h-1" style={{ background: cfg.bar }} />

                    <div className="px-4 py-3 flex items-center gap-4">
                      {/* time */}
                      <div className="flex-shrink-0 w-16 text-center">
                        <p className="text-base font-bold text-txt-primary leading-none">{fmtTime(appt.scheduledAt)}</p>
                        {appt.durationMinutes && <p className="text-[10px] text-txt-tertiary mt-0.5">{fmtMins(appt.durationMinutes)}</p>}
                      </div>
                      <div className="w-px h-10 bg-surface-overlay flex-shrink-0" />

                      {/* info */}
                      <Avatar name={appt.customer.name} phone={appt.customer.phone} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 justify-between">
                          <p className="text-sm font-semibold text-txt-primary truncate">{label}</p>
                          <StatusBadge status={appt.status} />
                        </div>
                        <p className="text-xs text-txt-secondary truncate mt-0.5">
                          {appt.customer.name ?? 'Sin nombre'} · {appt.customer.phone}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {appt.address    && <span className="text-[10px] text-txt-tertiary">📍 {appt.address.slice(0,30)}{appt.address.length>30?'…':''}</span>}
                          {appt.agreedPrice && <span className="text-[10px] text-txt-tertiary flex items-center gap-0.5"><DollarSign size={9} />{fmtCOP(appt.agreedPrice)}</span>}
                          <span className="text-[10px] text-txt-disabled">{SRC_LABEL[appt.source] ?? appt.source}</span>
                          {appt.priority !== 'NORMAL' && (
                            <span className="text-[10px] font-semibold" style={{ color: PC[appt.priority].dot }}>
                              ● {PC[appt.priority].label}
                            </span>
                          )}
                        </div>
                      </div>
                      <PriorityDot priority={appt.priority} />
                      <svg className="text-txt-disabled flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

  const CELL_H = 60;

  // Index appointments by day × hour
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
    <div className="flex-1 bg-surface border border-border-subtle rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">

      {/* nav */}
      <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2 flex-shrink-0">
        <button onClick={() => setWeekStart(getMonday(new Date()))}
          className="px-3 py-1.5 text-xs font-semibold border border-border-default rounded-lg hover:bg-surface-elevated transition">
          Hoy
        </button>
        {[{n:-7,icon:'‹'},{n:7,icon:'›'}].map(({n,icon}) => (
          <button key={n} onClick={() => setWeekStart(d => addDays(d, n))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border-default hover:bg-surface-elevated text-base font-bold text-txt-secondary transition">
            {icon}
          </button>
        ))}
        <span className="text-sm font-semibold text-txt-primary ml-1">{weekLabel}</span>
      </div>

      {/* day headers */}
      <div className="flex-shrink-0 border-b border-border-subtle"
        style={{ display:'grid', gridTemplateColumns:'48px repeat(7,1fr)' }}>
        <div className="border-r border-border-subtle" />
        {weekDays.map((d, i) => {
          const today = i === todayIdx;
          return (
            <div key={i} className={`py-2 text-center border-r border-border-subtle last:border-r-0 ${today ? 'bg-blue-50' : ''}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wide ${today ? 'text-blue-500' : 'text-txt-tertiary'}`}>{WEEKDAYS[i]}</p>
              <p className={`text-xl font-black leading-tight ${today ? 'text-blue-600' : 'text-txt-primary'}`}>
                {d.toLocaleDateString('es-CO',{day:'numeric'})}
              </p>
            </div>
          );
        })}
      </div>

      {/* grid */}
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ minHeight: 0 }}>
        <div className="relative">
          {HOURS.map(hour => (
            <div key={hour} className="border-b border-slate-50"
              style={{ display:'grid', gridTemplateColumns:'48px repeat(7,1fr)', height: CELL_H }}>
              {/* hour label */}
              <div className="flex items-start justify-end pr-2 pt-1 border-r border-border-subtle">
                <span className="text-[10px] text-txt-tertiary font-medium">
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
                    className={`border-r border-slate-50 last:border-r-0 relative px-0.5 py-0.5 ${isToday_ ? 'bg-blue-50/20' : ''}`}>

                    {/* "now" line */}
                    {showNow && (
                      <div className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                        style={{ top: `${(nowMin / 60) * 100}%` }}>
                        <div className="w-2 h-2 rounded-full bg-blue-500 -ml-1 flex-shrink-0" />
                        <div className="flex-1 h-px bg-blue-500" />
                      </div>
                    )}

                    {appts.map(appt => {
                      const cfg    = SC[appt.status];
                      const isSel  = selected?.appointmentId === appt.appointmentId;
                      const nameLabel = appt.service?.name ?? appt.customer.name ?? appt.type;
                      return (
                        <button key={appt.appointmentId} onClick={() => onSelect(isSel ? null : appt)}
                          className="w-full text-left rounded-lg px-1.5 py-1 mb-0.5 transition-all text-[10px]"
                          style={{
                            background: isSel ? cfg.bar : cfg.bg,
                            color:      isSel ? '#fff'  : cfg.color,
                            border:     `1.5px solid ${cfg.bar}`,
                            boxShadow:  isSel ? `0 2px 8px ${cfg.bar}55` : 'none',
                          }}>
                          <p className="font-bold truncate leading-tight">{fmtTime(appt.scheduledAt)}</p>
                          <p className="truncate leading-tight opacity-90">{nameLabel}</p>
                        </button>
                      );
                    })}
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
  const [filterStatus,       setFilterStatus]       = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filterType,         setFilterType]         = useState('');
  const [filterPendingAction, setFilterPendingAction] = useState('');
  const [search,             setSearch]             = useState('');
  const [selected,           setSelected]           = useState<Appointment | null>(null);
  const [view,               setView]               = useState<ViewMode>('list');
  const [showNewAppt, setShowNewAppt] = useState(false);
  const { storeId } = useAuth();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const p: Record<string,string> = {};
      if (filterStatus)        p.status           = filterStatus;
      if (filterType)          p.type             = filterType;
      if (filterPendingAction) p.hasPendingAction = filterPendingAction;
      const [aR, sR] = await Promise.all([getAppointments(p), getAppointmentStats()]);
      setAppointments(aR.data); setStats(sR.data);
    } catch { setError('Error cargando agendamientos.'); }
    finally { setLoading(false); }
  }, [filterStatus, filterType, filterPendingAction]);

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

  const STATS_CARDS: { Icon: React.ElementType; label: string; value: number; color: string }[] = [
    { Icon: FileText,    label:'Total',       value: stats.total,        color: 'text-txt-secondary' },
    { Icon: Clock,       label:'Pendientes',  value: stats.pending,      color: 'text-warning' },
    { Icon: CheckCircle, label:'Confirmadas', value: stats.confirmed,    color: 'text-info' },
    { Icon: Loader,      label:'En curso',    value: stats.inProgress,   color: 'text-lime' },
    { Icon: CalendarDays,label:'Hoy',         value: stats.todayCount,   color: 'text-success' },
    { Icon: RefreshCw,   label:'Esta semana', value: stats.upcomingWeek, color: 'text-txt-secondary' },
  ];

  return (
    <div className="min-h-screen bg-canvas flex flex-col">

      {/* header */}
      <div className="bg-surface border-b border-border-subtle px-6 py-5 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto">

          {/* title row */}
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div>
              <h1 className="text-xl font-bold text-txt-primary">Agendamientos</h1>
              <p className="text-sm text-txt-tertiary mt-0.5">
                {loading ? '...' : `${appointments.length} cita${appointments.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNewAppt(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-txt-inverse gradient-brand"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Nueva cita
              </button>
              {/* view toggle */}
              <div className="flex items-center bg-surface-overlay rounded-xl p-1">
                {([
                  { k:'list'     as ViewMode, icon:'☰',  label:'Lista'       },
                  { k:'calendar' as ViewMode, icon:'🗓', label:'Calendario'  },
                ]).map(({ k, icon, label }) => (
                  <button key={k} onClick={() => setView(k)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      view === k ? 'bg-surface shadow-sm text-txt-primary' : 'text-txt-secondary hover:text-txt-primary'
                    }`}>
                    {icon} {label}
                  </button>
                ))}
              </div>
              <button onClick={load} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-border-default text-txt-secondary hover:bg-surface-elevated disabled:opacity-50 transition">
                <svg className={loading ? 'animate-spin' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Actualizar
              </button>
            </div>
          </div>

          {/* stats */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
            {STATS_CARDS.map(({ Icon, label, value, color }) => (
              <div key={label} className="bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <Icon size={14} className={color} strokeWidth={1.5} />
                  <span className={`text-lg font-bold leading-none ${color}`}>{value}</span>
                </div>
                <p className="text-[10px] text-txt-tertiary mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary" width="14" height="14"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar cliente, servicio..."
                className="pl-8 pr-4 py-2 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30 transition w-56" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-border-default rounded-xl bg-surface text-txt-secondary focus:outline-none focus:ring-2 focus:ring-lime/30">
              <option value="">Todos los estados</option>
              {(Object.keys(SC) as AppointmentStatus[]).map(s => (
                <option key={s} value={s}>{SC[s].label}</option>
              ))}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm border border-border-default rounded-xl bg-surface text-txt-secondary focus:outline-none focus:ring-2 focus:ring-lime/30">
              <option value="">Todos los tipos</option>
              <option value="cita">Cita</option>
              <option value="visita_tecnica">Visita técnica</option>
              <option value="corte">Corte</option>
              <option value="otro">Otro</option>
            </select>
            {/* Pending actions badge */}
            {appointments.filter((a: Appointment) => a.pendingAction).length > 0 && (
              <button
                onClick={() => setFilterPendingAction(v => v === 'true' ? '' : 'true')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterPendingAction === 'true'
                    ? 'bg-red-500 text-white'
                    : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                }`}
              >
                <span className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  {appointments.filter((a: Appointment) => a.pendingAction).length}
                </span>
                Solicitudes pendientes
              </button>
            )}
            {(search || filterStatus || filterType || filterPendingAction) && (
              <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); setFilterPendingAction(''); }}
                className="text-xs text-blue-600 hover:underline">Limpiar</button>
            )}
          </div>
        </div>
      </div>

      {/* content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 flex flex-col" style={{ minHeight: 0 }}>
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm mb-4 flex-shrink-0">{error}</div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <svg className="animate-spin text-blue-600" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>
        ) : (
          <div className="flex gap-4 items-start flex-1" style={{ minHeight: 600 }}>
            {view === 'list'
              ? <ListView     appointments={filtered} selected={selected} onSelect={setSelected} />
              : <CalendarView appointments={filtered} selected={selected} onSelect={setSelected} />
            }
            {selected && (
              <DetailPanel appt={selected} onUpdate={handleUpdate} onClose={() => setSelected(null)} />
            )}
          </div>
        )}
      </div>
      {showNewAppt && (
        <NewAppointmentModal
          storeId={storeId}
          onCreated={load}
          onClose={() => setShowNewAppt(false)}
        />
      )}
    </div>
  );
}

