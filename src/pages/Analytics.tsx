import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAnalyticsSummary } from '../services/api';
import { TrendingUp, ShoppingBag, Scissors, Users, CreditCard, Download } from 'lucide-react';
import { exportCashReport } from '../utils/exportExcel';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Summary {
  period: string; from: string; to: string;
  revenue:  { total: number; products: number; services: number };
  orders:   { total: number; products: number; services: number };
  customers:{ total: number; new: number };
  byPaymentMethod: { method: string; label: string; amount: number; count: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  topServices: { name: string; quantity: number; revenue: number }[];
  byStaff: { staffId: string; name: string; appointments: number; revenue: number }[];
  recentOrders: {
    orderId: string; createdAt: string; type: string;
    description: string; amount: number; paymentMethod: string;
  }[];
}

type Period = 'today' | 'week' | 'month' | 'last_month';
type TabId  = 'dashboard' | 'reports';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today',      label: 'Hoy' },
  { id: 'week',       label: 'Esta semana' },
  { id: 'month',      label: 'Este mes' },
  { id: 'last_month', label: 'Mes anterior' },
];

const PAY_COLORS: Record<string, string> = {
  CASH:       'bg-green-100 text-green-700',
  TRANSFER:   'bg-blue-100 text-blue-700',
  CARD:       'bg-indigo-100 text-indigo-700',
  OTHER:      'bg-gray-100 text-gray-600',
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, accent = false }: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className="bg-surface rounded-2xl border border-border-subtle p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ? 'bg-lime/20 text-lime' : 'bg-surface-elevated text-txt-secondary'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-txt-tertiary font-medium">{label}</p>
        <p className="text-xl font-bold text-txt-primary leading-tight">{value}</p>
        {sub && <p className="text-xs text-txt-tertiary mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Mini Bar ──────────────────────────────────────────────────────────────────
function MiniBar({ items }: { items: { name: string; value: number; sub?: string }[] }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <p className="text-xs text-txt-secondary w-28 truncate flex-shrink-0">{item.name}</p>
          <div className="flex-1 bg-surface-overlay rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(item.value / max) * 100}%`, background: 'linear-gradient(90deg,#D4FF00,#A3CC00)' }} />
          </div>
          <p className="text-xs font-semibold text-txt-primary w-12 text-right flex-shrink-0">
            {item.sub ?? item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab({ data }: { data: Summary }) {
  const { revenue, orders, customers, byPaymentMethod, topProducts, topServices, byStaff } = data;
  const topStaff = byStaff[0]?.appointments ?? 1;

  return (
    <div className="space-y-5">
      {/* Row 1 — KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Ingresos totales"   value={fmt(revenue.total)}   sub={`${orders.total} ventas`}        icon={<TrendingUp size={20} />} accent />
        <KpiCard label="Ventas productos"   value={fmt(revenue.products)} sub={`${orders.products} órdenes`}   icon={<ShoppingBag size={20} />} />
        <KpiCard label="Ventas servicios"   value={fmt(revenue.services)} sub={`${orders.services} servicios`} icon={<Scissors size={20} />} />
        <KpiCard label="Clientes nuevos"    value={String(customers.new)} sub={`${customers.total} en total`}  icon={<Users size={20} />} />
      </div>

      {/* Row 2 — Productos vs Servicios breakdown */}
      {(revenue.total > 0) && (
        <div className="bg-surface rounded-2xl border border-border-subtle p-5">
          <p className="text-sm font-semibold text-txt-primary mb-3">Distribución de ingresos</p>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 bg-surface-overlay rounded-full h-3 overflow-hidden flex">
              <div className="h-full transition-all duration-500"
                style={{ width: `${(revenue.products / revenue.total) * 100}%`, background: 'linear-gradient(90deg,#D4FF00,#A3CC00)' }} />
              <div className="h-full transition-all duration-500 bg-blue-500/60"
                style={{ width: `${(revenue.services / revenue.total) * 100}%` }} />
            </div>
          </div>
          <div className="flex gap-4 text-xs text-txt-secondary">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#D4FF00' }} />
              Productos {revenue.total > 0 ? Math.round((revenue.products / revenue.total) * 100) : 0}%
              &nbsp;({fmt(revenue.products)})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500/60 flex-shrink-0" />
              Servicios {revenue.total > 0 ? Math.round((revenue.services / revenue.total) * 100) : 0}%
              &nbsp;({fmt(revenue.services)})
            </span>
          </div>
        </div>
      )}

      {/* Row 3 — Métodos de pago */}
      {byPaymentMethod.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border-subtle p-5">
          <p className="text-sm font-semibold text-txt-primary mb-3 flex items-center gap-2">
            <CreditCard size={16} className="text-txt-tertiary" /> Métodos de pago
          </p>
          <div className="flex flex-wrap gap-2">
            {byPaymentMethod.map(m => (
              <div key={m.method} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${PAY_COLORS[m.method] ?? 'bg-surface-overlay text-txt-secondary'}`}>
                <span>{m.label}</span>
                <span className="font-bold">{fmt(m.amount)}</span>
                <span className="opacity-60">({m.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 4 — Top productos + top servicios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topProducts.length > 0 && (
          <div className="bg-surface rounded-2xl border border-border-subtle p-5">
            <p className="text-sm font-semibold text-txt-primary mb-4">🛍 Top productos</p>
            <MiniBar items={topProducts.map(p => ({ name: p.name, value: p.quantity, sub: `${p.quantity} uds · ${fmt(p.revenue)}` }))} />
          </div>
        )}
        {topServices.length > 0 && (
          <div className="bg-surface rounded-2xl border border-border-subtle p-5">
            <p className="text-sm font-semibold text-txt-primary mb-4">✂ Top servicios</p>
            <MiniBar items={topServices.map(s => ({ name: s.name, value: s.quantity, sub: `${s.quantity} · ${fmt(s.revenue)}` }))} />
          </div>
        )}
      </div>

      {/* Row 5 — Por empleado */}
      {byStaff.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border-subtle p-5">
          <p className="text-sm font-semibold text-txt-primary mb-4">👥 Rendimiento por profesional</p>
          <div className="space-y-3">
            {byStaff.map(s => (
              <div key={s.staffId} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-lime/20 text-lime flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {s.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-txt-primary truncate">{s.name}</p>
                    <p className="text-xs text-txt-secondary flex-shrink-0 ml-2">{s.appointments} citas</p>
                  </div>
                  <div className="bg-surface-overlay rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${topStaff > 0 ? (s.appointments / topStaff) * 100 : 0}%`, background: 'linear-gradient(90deg,#D4FF00,#A3CC00)' }} />
                  </div>
                </div>
                {s.revenue > 0 && (
                  <p className="text-sm font-bold text-txt-primary flex-shrink-0 w-24 text-right">{fmt(s.revenue)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────
function ReportsTab({ data }: { data: Summary }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [search,     setSearch]     = useState('');

  const filtered = data.recentOrders.filter(o => {
    const matchType   = typeFilter === 'all' || o.type === typeFilter;
    const matchSearch = !search || o.description.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const totalProducts = filtered.filter(o => o.type !== 'service').reduce((s, o) => s + o.amount, 0);
  const totalServices = filtered.filter(o => o.type === 'service').reduce((s, o) => s + o.amount, 0);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar descripción..."
          className="px-3 py-2 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30 flex-1 min-w-[180px] max-w-xs"
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-border-default bg-surface text-txt-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30">
          <option value="all">Todos los tipos</option>
          <option value="product">Solo productos</option>
          <option value="service">Solo servicios</option>
        </select>
        <button
          onClick={() => exportCashReport(filtered.map(o => ({
            createdAt: o.createdAt, total: String(o.amount),
            manualPaymentMethod: o.paymentMethod,
            customer: null, orderItems: [{ description: o.description, quantity: 1, unitPrice: String(o.amount), service: null }],
            notes: null, appointmentId: null, orderId: o.orderId,
          })), [], 'Reporte')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#0A0A0F] transition"
          style={{ background: 'linear-gradient(135deg,#D4FF00,#A3CC00)' }}
        >
          <Download size={14} /> Exportar Excel
        </button>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-txt-tertiary">
          <p className="text-sm">Sin ventas para este período y filtro</p>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border-subtle overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr] px-5 py-3 bg-surface-elevated border-b border-border-subtle text-xs font-semibold text-txt-tertiary uppercase tracking-wide">
            <span>Fecha</span><span>Descripción</span><span>Tipo</span><span>Método</span><span className="text-right">Monto</span>
          </div>
          <div className="divide-y divide-border-subtle">
            {filtered.map(o => (
              <div key={o.orderId} className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr_1fr_1fr] px-5 py-3 items-center gap-2 hover:bg-surface-elevated transition">
                <p className="text-xs text-txt-secondary">{fmtDate(o.createdAt)}</p>
                <p className="text-sm text-txt-primary truncate">{o.description}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${o.type === 'service' ? 'bg-blue-100 text-blue-700' : 'bg-lime/20 text-lime'}`}>
                  {o.type === 'service' ? 'Servicio' : 'Producto'}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${PAY_COLORS[o.paymentMethod?.toUpperCase()] ?? 'bg-surface-overlay text-txt-secondary'}`}>
                  {o.paymentMethod}
                </span>
                <p className="text-sm font-bold text-txt-primary md:text-right">{fmt(o.amount)}</p>
              </div>
            ))}
          </div>
          {/* Footer totals */}
          <div className="px-5 py-3 bg-surface-elevated border-t border-border-subtle space-y-1">
            <div className="flex justify-between text-xs text-txt-secondary">
              <span>Productos</span><span>{fmt(totalProducts)}</span>
            </div>
            <div className="flex justify-between text-xs text-txt-secondary">
              <span>Servicios</span><span>{fmt(totalServices)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-txt-primary border-t border-border-default pt-1 mt-1">
              <span>Total ({filtered.length} registros)</span>
              <span className="text-lime">{fmt(totalProducts + totalServices)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Analytics() {
  const { storeId }                   = useAuth();
  const [period,  setPeriod]          = useState<Period>('month');
  const [tab,     setTab]             = useState<TabId>('dashboard');
  const [data,    setData]            = useState<Summary | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error,   setError]           = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    getAnalyticsSummary(period)
      .then(r => setData(r.data))
      .catch(() => setError('Error cargando analíticas'))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // storeId kept to satisfy auth context usage — avoids "unused variable" if linter checks hooks
  void storeId;

  const TABS: { id: TabId; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'reports',   label: 'Reportes' },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-surface border-b border-border-subtle px-4 md:px-6 py-4 md:py-5 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <h1 className="text-xl font-bold text-txt-primary flex items-center gap-2">
                <TrendingUp size={20} className="text-lime" /> Analíticas
              </h1>
              <p className="text-sm text-txt-tertiary mt-0.5">
                {data ? `${data.from} → ${data.to}` : 'Cargando...'}
              </p>
            </div>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1 flex-wrap">
            {PERIODS.map(p => (
              <button key={p.id} onClick={() => setPeriod(p.id)}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition ${period === p.id ? 'text-[#0A0A0F]' : 'text-txt-secondary hover:bg-surface-overlay'}`}
                style={period === p.id ? { background: 'linear-gradient(135deg,#D4FF00,#A3CC00)' } : {}}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface border-b border-border-subtle px-4 md:px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${tab === t.id ? 'border-lime text-lime' : 'border-transparent text-txt-tertiary hover:text-txt-secondary'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 rounded-full border-2 border-lime border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : data ? (
          tab === 'dashboard'
            ? <DashboardTab data={data} />
            : <ReportsTab   data={data} />
        ) : null}
      </div>
    </div>
  );
}
