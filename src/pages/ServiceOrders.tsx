import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getServiceOrders, createManualOrder, createCustomer, getCustomers } from '../services/api';
import { Briefcase, Calendar, CreditCard, TrendingUp, Search, Download, Plus, X } from 'lucide-react';
import { exportCashReport } from '../utils/exportExcel';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

const PAY_LABELS: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', nequi: 'Nequi',
  daviplata: 'Daviplata', CASH: 'Efectivo', TRANSFER: 'Transferencia',
  CARD: 'Tarjeta', OTHER: 'Otro',
};

const PAY_COLORS: Record<string, string> = {
  efectivo: 'bg-green-100 text-green-700', CASH: 'bg-green-100 text-green-700',
  transferencia: 'bg-blue-100 text-blue-700', TRANSFER: 'bg-blue-100 text-blue-700',
  nequi: 'bg-purple-100 text-purple-700', daviplata: 'bg-red-100 text-red-700',
  CARD: 'bg-indigo-100 text-indigo-700', OTHER: 'bg-surface-overlay text-txt-tertiary',
};

interface ServiceOrder {
  orderId: string;
  total: string;
  createdAt: string;
  appointmentId: string | null;
  manualPaymentMethod: string | null;
  notes: string | null;
  customer: { name: string | null; phone: string } | null;
  orderItems: { description: string | null; quantity: number; unitPrice: string; service: { name: string } | null }[];
}

interface CustomerOption { customerId: string; name: string | null; phone: string; }

// ── Manual Service Modal ──────────────────────────────────────────────────────
function ManualServiceModal({ storeId, onClose, onCreated }: {
  storeId: string; onClose: () => void; onCreated: () => void;
}) {
  const [customers,     setCustomers]  = useState<CustomerOption[]>([]);
  const [custSearch,    setCustSearch] = useState('');
  const [selCustomer,   setSelCust]    = useState<CustomerOption | null>(null);
  const [custMode,      setCustMode]   = useState<'search' | 'new'>('search');
  const [newPhone,      setNewPhone]   = useState('');
  const [newName,       setNewName]    = useState('');
  const [description,   setDesc]       = useState('');
  const [price,         setPrice]      = useState('');
  const [payMethod,     setPayMethod]  = useState('CASH');
  const [notes,         setNotes]      = useState('');
  const [submitting,    setSubmitting] = useState(false);
  const [error,         setError]      = useState('');

  useEffect(() => {
    getCustomers(storeId).then(r => setCustomers(r.data ?? []));
  }, [storeId]);

  const filtered = customers.filter(c => {
    const q = custSearch.toLowerCase();
    return !q || c.phone.includes(q) || (c.name ?? '').toLowerCase().includes(q);
  }).slice(0, 8);

  const submit = async () => {
    if (custMode === 'search' && !selCustomer) return setError('Selecciona un cliente.');
    if (custMode === 'new' && !newPhone.trim()) return setError('El teléfono del cliente es obligatorio.');
    if (!description.trim()) return setError('Escribe una descripción del servicio.');
    if (!price || Number(price) <= 0) return setError('El precio debe ser mayor a 0.');
    setError(''); setSubmitting(true);
    try {
      let customerId = selCustomer?.customerId ?? '';
      if (custMode === 'new') {
        const r = await createCustomer({ phone: newPhone.trim(), name: newName.trim() || undefined });
        customerId = r.data.customerId;
      }
      await createManualOrder({
        customerId,
        type: 'service',
        items: [{ description: description.trim(), quantity: 1, unitPrice: Number(price) }],
        manualPaymentMethod: payMethod,
        notes: notes.trim() || undefined,
        idempotencyKey: `svc-manual-${storeId}-${Date.now()}`,
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al registrar el servicio.');
    } finally {
      setSubmitting(false);
    }
  };

  const PAY_METHODS = [
    { value: 'CASH',     label: 'Efectivo' },
    { value: 'TRANSFER', label: 'Transferencia' },
    { value: 'CARD',     label: 'Tarjeta' },
    { value: 'OTHER',    label: 'Otro' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between sticky top-0 bg-surface z-10">
          <div>
            <h2 className="font-bold text-txt-primary">Nueva venta de servicio</h2>
            <p className="text-xs text-txt-tertiary">Registra un servicio cobrado manualmente</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-txt-tertiary hover:bg-surface-overlay">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Cliente */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Cliente</label>
              <div className="flex gap-1 bg-surface-overlay rounded-lg p-0.5">
                <button onClick={() => { setCustMode('search'); setNewPhone(''); setNewName(''); }}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition ${custMode === 'search' ? 'bg-surface text-txt-primary shadow-sm' : 'text-txt-tertiary hover:text-txt-secondary'}`}>
                  Existente
                </button>
                <button onClick={() => { setCustMode('new'); setSelCust(null); setCustSearch(''); }}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition ${custMode === 'new' ? 'bg-surface text-txt-primary shadow-sm' : 'text-txt-tertiary hover:text-txt-secondary'}`}>
                  Nuevo
                </button>
              </div>
            </div>

            {custMode === 'search' ? (
              selCustomer ? (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-medium text-txt-primary text-sm">{selCustomer.name ?? 'Sin nombre'}</p>
                    <p className="text-xs text-txt-secondary font-mono">{selCustomer.phone}</p>
                  </div>
                  <button onClick={() => { setSelCust(null); setCustSearch(''); }} className="text-xs text-blue-600 hover:underline">Cambiar</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={custSearch} onChange={e => setCustSearch(e.target.value)}
                    placeholder="Buscar por nombre o teléfono..."
                    className="w-full px-4 py-2.5 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30"
                  />
                  {custSearch && filtered.length > 0 && (
                    <div className="absolute w-full bg-surface border border-border-default rounded-xl shadow-lg mt-1 overflow-hidden z-10">
                      {filtered.map(c => (
                        <button key={c.customerId} onClick={() => { setSelCust(c); setCustSearch(''); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-surface-elevated transition">
                          <p className="text-sm font-medium text-txt-primary">{c.name ?? 'Sin nombre'}</p>
                          <p className="text-xs text-txt-tertiary font-mono">{c.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {custSearch && filtered.length === 0 && (
                    <p className="mt-2 text-xs text-txt-tertiary">Sin coincidencias. Cambia a "Nuevo" para crear el cliente.</p>
                  )}
                </div>
              )
            ) : (
              <div className="space-y-2">
                <input
                  value={newPhone} onChange={e => setNewPhone(e.target.value)}
                  placeholder="Teléfono (obligatorio)"
                  className="w-full px-4 py-2.5 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30"
                />
                <input
                  value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Nombre (opcional)"
                  className="w-full px-4 py-2.5 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30"
                />
              </div>
            )}
          </div>

          {/* Descripción del servicio */}
          <div>
            <label className="block text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-2">Servicio</label>
            <input
              value={description} onChange={e => setDesc(e.target.value)}
              placeholder="Ej: Corte de cabello, manicure, mantenimiento..."
              className="w-full px-4 py-2.5 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30"
            />
          </div>

          {/* Precio */}
          <div>
            <label className="block text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-2">Precio</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-txt-tertiary font-medium">$</span>
              <input
                type="number" min="0" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-2.5 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30"
              />
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-2">Método de pago</label>
            <div className="grid grid-cols-4 gap-2">
              {PAY_METHODS.map(m => (
                <button key={m.value} onClick={() => setPayMethod(m.value)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium border transition ${payMethod === m.value ? 'border-lime bg-lime/10 text-lime' : 'border-border-default text-txt-secondary hover:bg-surface-overlay'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-2">Notas (opcional)</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Observaciones adicionales..."
              className="w-full px-4 py-2.5 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-txt-secondary border border-border-default hover:bg-surface-overlay transition">
            Cancelar
          </button>
          <button onClick={submit}
            disabled={submitting || (custMode === 'search' ? !selCustomer : !newPhone.trim()) || !description.trim() || !price || Number(price) <= 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#0A0A0F] transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#D4FF00,#A3CC00)' }}>
            {submitting ? 'Registrando...' : 'Registrar servicio'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ServiceOrders() {
  const { storeId } = useAuth();
  const [orders,      setOrders]      = useState<ServiceOrder[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [showModal,   setShowModal]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getServiceOrders(storeId)
      .then(r => setOrders(r.data ?? []))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || (o.customer?.name ?? '').toLowerCase().includes(q)
      || (o.customer?.phone ?? '').includes(q)
      || (o.notes ?? '').toLowerCase().includes(q)
      || o.orderItems.some(i => (i.service?.name ?? i.description ?? '').toLowerCase().includes(q));
    const method = (o.manualPaymentMethod ?? '').toLowerCase();
    const matchMethod = filterMethod === 'all' || method === filterMethod || method.startsWith(filterMethod);
    return matchSearch && matchMethod;
  });

  const totalRevenue = filtered.reduce((s, o) => s + Number(o.total), 0);
  const todayRevenue = filtered
    .filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + Number(o.total), 0);

  const byMethod = filtered.reduce<Record<string, number>>((acc, o) => {
    const m = (o.manualPaymentMethod ?? 'otro').toLowerCase();
    acc[m] = (acc[m] ?? 0) + Number(o.total);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-canvas">
      {showModal && (
        <ManualServiceModal
          storeId={storeId}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load(); }}
        />
      )}

      {/* Header */}
      <div className="bg-surface border-b border-border-subtle px-4 md:px-6 py-4 md:py-5 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <h1 className="text-xl font-bold text-txt-primary flex items-center gap-2">
                <Briefcase size={20} className="text-lime" />
                Órdenes de Servicios
              </h1>
              <p className="text-sm text-txt-tertiary mt-0.5">
                Servicios cobrados — generados automáticamente al confirmar pago de citas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#0A0A0F] transition"
                style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
              >
                <Plus size={15} /> Nueva venta manual
              </button>
              <button
                onClick={() => exportCashReport([], orders, 'Servicios')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border-default text-txt-secondary hover:bg-surface-overlay transition"
              >
                <Download size={15} /> Exportar
              </button>
            </div>
          </div>

          {/* KPIs */}
          {!loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-surface-elevated rounded-xl p-3 border border-border-subtle">
                <p className="text-xs text-txt-tertiary font-medium flex items-center gap-1">
                  <TrendingUp size={12} /> Total filtrado
                </p>
                <p className="text-lg font-bold text-txt-primary mt-0.5">{fmt(totalRevenue)}</p>
              </div>
              <div className="bg-surface-elevated rounded-xl p-3 border border-border-subtle">
                <p className="text-xs text-txt-tertiary font-medium flex items-center gap-1">
                  <Calendar size={12} /> Hoy
                </p>
                <p className="text-lg font-bold text-lime mt-0.5">{fmt(todayRevenue)}</p>
              </div>
              <div className="bg-surface-elevated rounded-xl p-3 border border-border-subtle">
                <p className="text-xs text-txt-tertiary font-medium flex items-center gap-1">
                  <Briefcase size={12} /> Servicios
                </p>
                <p className="text-lg font-bold text-txt-primary mt-0.5">{filtered.length}</p>
              </div>
              <div className="bg-surface-elevated rounded-xl p-3 border border-border-subtle">
                <p className="text-xs text-txt-tertiary font-medium flex items-center gap-1">
                  <CreditCard size={12} /> Métodos
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(byMethod).map(([m, v]) => (
                    <span key={m} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface text-txt-secondary">
                      {PAY_LABELS[m] ?? m}: {fmt(v)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar cliente, servicio..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30"
              />
            </div>
            <select
              value={filterMethod}
              onChange={e => setFilterMethod(e.target.value)}
              className="px-3 py-2 text-sm border border-border-default bg-surface text-txt-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30"
            >
              <option value="all">Todos los métodos</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="nequi">Nequi</option>
              <option value="daviplata">Daviplata</option>
              <option value="card">Tarjeta</option>
            </select>
            {(search || filterMethod !== 'all') && (
              <button onClick={() => { setSearch(''); setFilterMethod('all'); }}
                className="text-xs text-blue-600 hover:underline">
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 rounded-full border-2 border-lime border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-txt-tertiary">
            <Briefcase size={40} strokeWidth={1} />
            <p className="text-sm">
              {search || filterMethod !== 'all'
                ? 'Sin resultados para este filtro'
                : 'Aún no hay servicios cobrados. Se registran automáticamente al confirmar el pago de una cita.'}
            </p>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-border-subtle overflow-hidden shadow-sm">
            {/* Cabecera tabla */}
            <div className="hidden md:grid grid-cols-[1.5fr_1.2fr_1fr_1fr_1fr_100px] px-5 py-3 bg-surface-elevated border-b border-border-subtle text-xs font-semibold text-txt-tertiary uppercase tracking-wide">
              <span>Cliente</span>
              <span>Servicio</span>
              <span>Fecha</span>
              <span>Método de pago</span>
              <span className="text-right">Total</span>
              <span className="text-right">Ref. cita</span>
            </div>

            <div className="divide-y divide-border-subtle">
              {filtered.map(o => {
                const serviceName = o.orderItems[0]?.service?.name
                  ?? o.orderItems[0]?.description
                  ?? 'Servicio';
                const method = (o.manualPaymentMethod ?? 'otro').toLowerCase();

                return (
                  <div key={o.orderId}
                    className="grid grid-cols-1 md:grid-cols-[1.5fr_1.2fr_1fr_1fr_1fr_100px] px-5 py-4 items-center gap-2 md:gap-3 hover:bg-surface-elevated transition">

                    {/* Cliente */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-txt-inverse font-bold text-sm flex-shrink-0">
                        {(o.customer?.name?.[0] ?? o.customer?.phone?.[0] ?? '?').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-txt-primary truncate">
                          {o.customer?.name ?? 'Sin nombre'}
                        </p>
                        <p className="text-xs text-txt-tertiary font-mono">{o.customer?.phone}</p>
                      </div>
                    </div>

                    {/* Servicio */}
                    <div className="flex items-center gap-2 min-w-0">
                      <Briefcase size={14} className="text-lime flex-shrink-0" />
                      <span className="text-sm text-txt-primary truncate">{serviceName}</span>
                    </div>

                    {/* Fecha */}
                    <div>
                      <p className="text-sm text-txt-primary">{fmtDate(o.createdAt)}</p>
                      <p className="text-xs text-txt-tertiary">{fmtTime(o.createdAt)}</p>
                    </div>

                    {/* Método */}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${PAY_COLORS[method] ?? PAY_COLORS[o.manualPaymentMethod ?? ''] ?? 'bg-surface-overlay text-txt-tertiary'}`}>
                      <CreditCard size={11} className="inline mr-1" />
                      {PAY_LABELS[method] ?? PAY_LABELS[o.manualPaymentMethod ?? ''] ?? o.manualPaymentMethod ?? 'N/A'}
                    </span>

                    {/* Total */}
                    <p className="text-base font-bold text-txt-primary md:text-right">
                      {fmt(Number(o.total))}
                    </p>

                    {/* Ref cita */}
                    <div className="md:text-right">
                      {o.appointmentId ? (
                        <span className="text-xs font-mono text-txt-tertiary bg-surface-elevated px-2 py-0.5 rounded-lg">
                          #{o.appointmentId.slice(-6).toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-xs text-txt-disabled">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pie de tabla */}
            <div className="px-5 py-3 bg-surface-elevated border-t border-border-subtle flex items-center justify-between">
              <p className="text-xs text-txt-tertiary">
                {filtered.length} servicio{filtered.length !== 1 ? 's' : ''} cobrado{filtered.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm font-bold text-txt-primary">
                Total: <span className="text-lime">{fmt(totalRevenue)}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
