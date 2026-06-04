import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getMySubscription, createCheckout } from '../services/api';
import api from '../services/api';
import AiConfigPage from './AiConfig';

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'negocio' | 'ia' | 'excluidos' | 'suscripcion';

interface BlockedContact {
  blockedId: string;
  phone: string;
  label: string | null;
  createdAt: string;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <svg className="animate-spin" style={{ color: 'var(--color-primary)' }} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 11-6.219-8.56"/>
      </svg>
    </div>
  );
}

// ── TAB: NEGOCIO ───────────────────────────────────────────────────────────

function NegocioSection({ storeId }: { storeId: string }) {
  const [form, setForm] = useState({ name: '', phone: '', ownerName: '', adminPhone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/stores/${storeId}`)
      .then(res => {
        setForm({
          name:       res.data.name       ?? '',
          phone:      res.data.phone      ?? '',
          ownerName:  res.data.ownerName  ?? '',
          adminPhone: res.data.adminPhone ?? '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.patch(`/stores/${storeId}`, {
        name:       form.name,
        phone:      form.phone,
        ownerName:  form.ownerName,
        adminPhone: form.adminPhone || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-border-default bg-surface-elevated focus:outline-none focus:ring-2 focus:bg-surface transition text-sm text-txt-primary';

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-border-subtle p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-txt-primary">Información del negocio</h2>
          <p className="text-xs text-txt-tertiary">Datos básicos de tu tienda — la IA los usa para presentarse</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-txt-primary mb-1.5">Nombre del negocio</label>
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Mi Tienda"
            className={inputClass}
            style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-txt-primary mb-1.5">Teléfono WhatsApp</label>
          <input
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="+573001234567"
            className={inputClass}
          />
          <p className="text-xs text-txt-tertiary mt-1.5">Número con código de país — ej: +573001234567</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-txt-primary mb-1.5">Nombre del propietario</label>
          <input
            value={form.ownerName}
            onChange={e => setForm({ ...form, ownerName: e.target.value })}
            placeholder="Juan Pérez"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-txt-primary mb-1.5">
            Teléfono personal del admin
            <span className="ml-2 text-xs font-normal text-txt-tertiary">(opcional)</span>
          </label>
          <input
            value={form.adminPhone}
            onChange={e => setForm({ ...form, adminPhone: e.target.value })}
            placeholder="+573001234567"
            className={inputClass}
          />
          <p className="text-xs text-txt-tertiary mt-1.5">
            Notificaciones de citas (pagos, solicitudes cancel/reagenda, reportes diarios) llegan a este número por WhatsApp.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-white font-medium text-sm shadow-sm transition-all disabled:opacity-60 btn-gradient"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Guardado correctamente
            </span>
          )}
        </div>
      </form>
    </div>
  );
}


// ── TAB: EXCLUIDOS ─────────────────────────────────────────────────────────

const emptyBlockedForm = { phone: '', label: '' };

function ExcluidosSection() {
  const [contacts, setContacts] = useState<BlockedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyBlockedForm);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/blocked');
      setContacts(res.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val && !val.startsWith('+')) val = `+${val}`;
    setForm({ ...form, phone: val });
  };

  const handleBlock = async () => {
    if (!form.phone) return;
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 11) {
      setError('Incluye el código de país completo. Ej: +573001234567 (Colombia)');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/blocked', { phone: form.phone, label: form.label || undefined });
      setShowModal(false);
      setForm(emptyBlockedForm);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al bloquear número');
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (id: string) => {
    if (!window.confirm('¿Desbloquear este número?')) return;
    setRemovingId(id);
    try {
      await api.delete(`/blocked/${id}`);
      await load();
    } catch {} finally {
      setRemovingId(null);
    }
  };

  const labelColor = (label: string | null) => {
    if (!label) return 'bg-surface-overlay text-txt-secondary';
    const l = label.toLowerCase();
    if (l.includes('empleado')) return 'bg-blue-50 text-blue-600';
    if (l.includes('distribuidor') || l.includes('proveedor')) return 'bg-purple-50 text-purple-600';
    return 'bg-orange-50 text-orange-500';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-txt-primary">Contactos excluidos</h2>
          <p className="text-sm text-txt-tertiary mt-0.5">Números que el bot ignora — empleados, distribuidores, proveedores</p>
        </div>
        <button
          onClick={() => { setForm(emptyBlockedForm); setError(''); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold btn-gradient"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Agregar
        </button>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" className="flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-blue-700 text-sm">
          <strong>Tip:</strong> También puedes silenciar el bot enviando{' '}
          <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs">!stop</code>{' '}
          desde el número del cliente.
        </p>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
          {contacts.length === 0 ? (
            <div className="p-16 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </div>
              <p className="text-txt-primary font-medium">No hay números excluidos</p>
              <p className="text-txt-tertiary text-sm">Agrega empleados, distribuidores o proveedores para que el bot los ignore</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-txt-tertiary uppercase tracking-wider">Número</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-txt-tertiary uppercase tracking-wider">Etiqueta</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-txt-tertiary uppercase tracking-wider hidden sm:table-cell">Agregado</th>
                  <th className="px-6 py-4"/>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => (
                  <tr key={c.blockedId} className={`${i < contacts.length - 1 ? 'border-b border-slate-50' : ''} hover:bg-surface-elevated transition`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-surface-overlay flex items-center justify-center flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.22 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                          </svg>
                        </div>
                        <span className="font-semibold text-txt-primary text-sm">{c.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.label ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${labelColor(c.label)}`}>{c.label}</span>
                      ) : (
                        <span className="text-txt-disabled text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-txt-tertiary text-sm hidden sm:table-cell">
                      {new Date(c.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleUnblock(c.blockedId)}
                        disabled={removingId === c.blockedId}
                        className="text-red-400 hover:text-red-600 text-sm font-medium disabled:opacity-50 transition"
                      >
                        {removingId === c.blockedId ? '...' : 'Desbloquear'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal agregar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-txt-primary">Excluir número</h2>
              <button onClick={() => setShowModal(false)} className="text-txt-tertiary hover:text-txt-secondary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-txt-primary mb-1.5">Número de teléfono *</label>
                <input
                  value={form.phone}
                  onChange={handlePhoneChange}
                  className="w-full px-4 py-3 rounded-xl border border-border-default text-txt-primary focus:outline-none focus:ring-2 text-sm"
                  placeholder="+573001234567"
                />
                <p className="text-xs text-txt-tertiary mt-1.5">Incluye el código de país. Ej: <strong>+57</strong>3001234567</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-txt-primary mb-1.5">
                  Etiqueta <span className="text-txt-tertiary font-normal">(opcional)</span>
                </label>
                <select
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border-default text-txt-primary focus:outline-none focus:ring-2 text-sm bg-surface"
                >
                  <option value="">Sin etiqueta</option>
                  <option value="Empleado">Empleado</option>
                  <option value="Distribuidor">Distribuidor</option>
                  <option value="Proveedor">Proveedor</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-border-default text-txt-secondary text-sm font-semibold hover:bg-surface-elevated transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleBlock}
                disabled={saving || !form.phone}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50 btn-gradient"
              >
                {saving ? 'Guardando...' : 'Excluir número'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TAB: SUSCRIPCIÓN ───────────────────────────────────────────────────────

interface SubPayment {
  paymentId: string;
  mpPaymentId: string | null;
  amount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface SubData {
  subscriptionStatus: string;
  subscriptionEnd: string | null;
  apiBlocked: boolean;
  currentPrice: number;
  currency: string;
  subscription: {
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    priceAmount: number;
    payments: SubPayment[];
  } | null;
}

function paymentStatusLabel(s: string) {
  if (s === 'approved') return { label: 'Pagado', cls: 'bg-emerald-100 text-emerald-700' };
  if (s === 'pending')  return { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' };
  if (s === 'rejected') return { label: 'Rechazado', cls: 'bg-red-100 text-red-700' };
  return { label: s, cls: 'bg-surface-overlay text-txt-secondary' };
}

function subStatusInfo(s: string) {
  if (s === 'active')   return { label: 'Activa', cls: 'bg-emerald-100 text-emerald-700' };
  if (s === 'pending')  return { label: 'Pendiente de pago', cls: 'bg-amber-100 text-amber-700' };
  if (s === 'expired')  return { label: 'Vencida', cls: 'bg-red-100 text-red-700' };
  return { label: 'Sin suscripción', cls: 'bg-surface-overlay text-txt-secondary' };
}

function SuscripcionSection() {
  const [data, setData] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMySubscription()
      .then(res => setData(res.data))
      .catch(() => setError('No se pudo cargar la suscripción'))
      .finally(() => setLoading(false));
  }, []);

  const handleRenew = async () => {
    setPayLoading(true);
    setError('');
    try {
      const res = await createCheckout();
      window.location.href = res.data.initPoint;
    } catch {
      setError('Error al generar el enlace de pago. Intenta de nuevo.');
      setPayLoading(false);
    }
  };

  if (loading) return <Spinner />;

  if (!data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm">
        {error || 'No se pudo cargar la información de suscripción.'}
      </div>
    );
  }

  const status = subStatusInfo(data.subscriptionStatus);
  const isActive = data.subscriptionStatus === 'active';
  const payments = data.subscription?.payments ?? [];

  return (
    <div className="space-y-5">
      {/* Estado actual */}
      <div className="bg-surface rounded-2xl border border-border-default p-6 shadow-sm">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-txt-tertiary uppercase tracking-wide mb-2">Estado de tu plan</p>
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${status.cls}`}>
              {status.label}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-txt-tertiary mb-1">Plan mensual</p>
            <p className="text-2xl font-bold text-txt-primary">
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(data.currentPrice)}
            </p>
          </div>
        </div>

        {isActive && data.subscription?.currentPeriodEnd && (
          <div className="grid grid-cols-2 gap-4 bg-surface-elevated rounded-xl p-4 mb-5">
            <div>
              <p className="text-xs text-txt-tertiary mb-0.5">Desde</p>
              <p className="text-sm font-medium text-txt-primary">
                {new Date(data.subscription.currentPeriodStart!).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-xs text-txt-tertiary mb-0.5">Vence el</p>
              <p className="text-sm font-medium text-txt-primary">
                {new Date(data.subscription.currentPeriodEnd).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {data.apiBlocked && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Tu cuenta está bloqueada. Renueva tu suscripción para reactivarla.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleRenew}
          disabled={payLoading}
          className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #009ee3, #003087)' }}
        >
          {payLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Redirigiendo a MercadoPago...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="2"/>
                <path d="M2 10h20" stroke="white" strokeWidth="2"/>
              </svg>
              {isActive ? 'Renovar suscripción' : 'Activar suscripción — Pagar con MercadoPago'}
            </>
          )}
        </button>
      </div>

      {/* Historial de pagos */}
      <div className="bg-surface rounded-2xl border border-border-default shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle">
          <h3 className="font-semibold text-txt-primary text-sm">Historial de pagos</h3>
        </div>

        {payments.length === 0 ? (
          <div className="px-6 py-8 text-center text-txt-tertiary text-sm">
            Aún no tienes pagos registrados
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {payments.map(p => {
              const st = paymentStatusLabel(p.status);
              const date = p.paidAt ?? p.createdAt;
              return (
                <div key={p.paymentId} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      p.status === 'approved' ? 'bg-emerald-100' :
                      p.status === 'pending' ? 'bg-amber-100' : 'bg-red-100'
                    }`}>
                      {p.status === 'approved' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : p.status === 'pending' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-txt-primary">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(p.amount))}
                        {' '}— Plan mensual
                      </p>
                      <p className="text-xs text-txt-tertiary">
                        {new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                        {p.mpPaymentId && <span className="ml-2 font-mono text-txt-disabled">#{p.mpPaymentId.slice(-8)}</span>}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main: Config ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'negocio',
    label: 'Negocio',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'ia',
    label: 'Asistente IA',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 010 2h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 010-2h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/>
      </svg>
    ),
  },
  {
    id: 'excluidos',
    label: 'Excluidos',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
    ),
  },
  {
    id: 'suscripcion',
    label: 'Suscripción',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M2 10h20"/>
      </svg>
    ),
  },
];

export default function Config() {
  const { storeId } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('negocio');

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-txt-primary">Configuración</h1>
        <p className="text-txt-secondary mt-1 text-sm">Personaliza tu plataforma desde un solo lugar</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface-overlay rounded-2xl mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 min-w-max items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-surface text-txt-primary shadow-sm'
                : 'text-txt-secondary hover:text-txt-primary'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'negocio'     && <NegocioSection    storeId={storeId} />}
      {activeTab === 'ia'          && <AiConfigPage />}
      {activeTab === 'excluidos'   && <ExcluidosSection />}
      {activeTab === 'suscripcion' && <SuscripcionSection />}
    </div>
  );
}
