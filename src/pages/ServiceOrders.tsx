import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getServiceOrders } from '../services/api';
import { Scissors, Calendar, CreditCard, TrendingUp, Search, Download } from 'lucide-react';
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

export default function ServiceOrders() {
  const { storeId } = useAuth();
  const [orders,  setOrders]  = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filterMethod, setFilterMethod] = useState('all');

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

  // Agrupa por método de pago para el resumen
  const byMethod = filtered.reduce<Record<string, number>>((acc, o) => {
    const m = (o.manualPaymentMethod ?? 'otro').toLowerCase();
    acc[m] = (acc[m] ?? 0) + Number(o.total);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-surface border-b border-border-subtle px-4 md:px-6 py-4 md:py-5 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <h1 className="text-xl font-bold text-txt-primary flex items-center gap-2">
                <Scissors size={20} className="text-lime" />
                Órdenes de Servicios
              </h1>
              <p className="text-sm text-txt-tertiary mt-0.5">
                Servicios cobrados — generados automáticamente al confirmar pago de citas
              </p>
            </div>
            <button
              onClick={() => exportCashReport([], orders, 'Servicios')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#0A0A0F] transition"
              style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
            >
              <Download size={15} /> Exportar Excel
            </button>
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
                  <Scissors size={12} /> Servicios
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
            <Scissors size={40} strokeWidth={1} />
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
                      <Scissors size={14} className="text-lime flex-shrink-0" />
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
