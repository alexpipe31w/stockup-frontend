import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import api, { getRevenueTrends, getConversationInsights, getDailyReports, generateReport } from '../services/api';
import { CheckCircle2, XCircle, Ghost } from 'lucide-react';

// ── Icons ─────────────────────────────────────────────────────────────────────
const SparkIcon   = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>);
const SendIcon    = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>);
const UserIcon    = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const CartIcon    = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>);
const MoneyIcon   = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>);
const ChatIcon    = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>);
const RefreshIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>);
const TrendIcon   = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>);
const HeartIcon   = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>);

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-txt-tertiary font-medium">{label}</p>
        <p className="text-xl font-bold text-txt-primary leading-tight">{value}</p>
        {sub && <p className="text-xs text-txt-tertiary mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Mini Bar Chart (horizontal) ───────────────────────────────────────────────
function BarChart({ data, label }: { data: { name: string; value: number }[]; label: string }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm p-5">
      <p className="text-sm font-semibold text-txt-primary mb-4">{label}</p>
      <div className="space-y-2">
        {data.slice(0, 6).map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <p className="text-xs text-txt-secondary w-24 truncate flex-shrink-0">{d.name}</p>
            <div className="flex-1 bg-surface-overlay rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(d.value / max) * 100}%`, background: 'linear-gradient(90deg, #D4FF00, #A3CC00)' }} />
            </div>
            <p className="text-xs font-semibold text-txt-primary w-16 text-right flex-shrink-0">{d.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Revenue Trend Chart (vertical bars, SVG) ──────────────────────────────────
function TrendChart({ data }: { data: { labels: string[]; revenue: number[]; orders: number[] } | null }) {
  const [view, setView] = useState<'revenue' | 'orders'>('revenue');
  if (!data) return null;
  const values  = view === 'revenue' ? data.revenue : data.orders;
  const max     = Math.max(...values, 1);
  const barW    = Math.max(12, Math.floor(560 / (data.labels.length + 1)));
  const gap     = Math.max(2, Math.floor(barW * 0.2));
  const height  = 120;

  return (
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-txt-primary flex items-center gap-2"><TrendIcon /> Tendencia de {view === 'revenue' ? 'ingresos' : 'pedidos'}</p>
        <div className="flex rounded-lg border border-border-default overflow-hidden text-xs">
          <button onClick={() => setView('revenue')} className={`px-3 py-1 transition ${view === 'revenue' ? 'text-white' : 'text-txt-secondary hover:bg-surface-elevated'}`}
            style={view === 'revenue' ? { background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' } : {}}>
            Ingresos
          </button>
          <button onClick={() => setView('orders')} className={`px-3 py-1 transition ${view === 'orders' ? 'text-white' : 'text-txt-secondary hover:bg-surface-elevated'}`}
            style={view === 'orders' ? { background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' } : {}}>
            Pedidos
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg width={Math.max(560, data.labels.length * (barW + gap) + gap)} height={height + 30} className="min-w-full">
          {values.map((v, i) => {
            const barH = max > 0 ? Math.max(2, (v / max) * height) : 2;
            const x    = gap + i * (barW + gap);
            const y    = height - barH;
            return (
              <g key={i}>
                <defs>
                  <linearGradient id={`bar-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4FF00" stopOpacity="0.9"/>
                    <stop offset="100%" stopColor="#A3CC00" stopOpacity="0.7"/>
                  </linearGradient>
                </defs>
                <rect x={x} y={y} width={barW} height={barH} rx="3" fill={`url(#bar-${i})`} />
                {v > 0 && (
                  <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="9" fill="#64748b">
                    {view === 'revenue' ? (v >= 1000 ? `${Math.round(v/1000)}k` : v) : v}
                  </text>
                )}
                <text x={x + barW / 2} y={height + 16} textAnchor="middle" fontSize="9" fill="#94a3b8">
                  {data.labels[i]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Sentiment Panel ───────────────────────────────────────────────────────────
interface Insights {
  analyzed:   number;
  satisfied:  number;
  neutral:    number;
  frustrated: number;
  topics:     string[];
  alerts:     string[];
  positives:  string[];
  summary:    string;
}

function SentimentPanel({ insights, loading, onAnalyze }: {
  insights:  Insights | null;
  loading:   boolean;
  onAnalyze: () => void;
}) {
  return (
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-txt-primary flex items-center gap-2"><HeartIcon /> Satisfacción de clientes</p>
        <button onClick={onAnalyze} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-white disabled:opacity-50 transition"
          style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}> 
          {loading
            ? <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Analizando...</>
            : <><SparkIcon /> Analizar conversaciones</>}
        </button>
      </div>

      {!insights ? (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-txt-tertiary">
          <HeartIcon />
          <p className="text-sm text-center">Haz click en "Analizar conversaciones" para ver el análisis de satisfacción basado en los resúmenes de WhatsApp.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-txt-tertiary">Basado en {insights.analyzed} conversaciones archivadas</p>

          {/* Distribución de sentimiento */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Satisfechos', value: insights.satisfied,  color: 'bg-green-100 text-green-700',  bar: '#22c55e' },
              { label: 'Neutros',     value: insights.neutral,    color: 'bg-surface-overlay text-txt-secondary',  bar: '#94a3b8' },
              { label: 'Frustrados',  value: insights.frustrated, color: 'bg-red-100 text-red-600',      bar: '#ef4444' },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                <p className="text-2xl font-bold">{s.value}%</p>
                <p className="text-xs font-medium">{s.label}</p>
                <div className="mt-2 h-1.5 bg-surface/50 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.value}%`, backgroundColor: s.bar }} />
                </div>
              </div>
            ))}
          </div>

          {/* Resumen ejecutivo */}
          {insights.summary && (
            <div className="bg-surface-elevated rounded-xl p-3">
              <p className="text-xs text-txt-secondary leading-relaxed">{insights.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Temas frecuentes */}
            {insights.topics.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-2">Temas frecuentes</p>
                <ul className="space-y-1">
                  {insights.topics.map((t, i) => (
                    <li key={i} className="text-xs text-txt-secondary flex items-start gap-1.5">
                      <span className="text-blue-400 mt-0.5">•</span>{t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Alertas */}
            {insights.alerts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Alertas</p>
                <ul className="space-y-1">
                  {insights.alerts.map((a, i) => (
                    <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                      <span className="mt-0.5">⚠</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Aspectos positivos */}
            {insights.positives.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Lo que funciona</p>
                <ul className="space-y-1">
                  {insights.positives.map((p, i) => (
                    <li key={i} className="text-xs text-green-700 flex items-start gap-1.5">
                      <span className="mt-0.5">✓</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Chat Bubble ───────────────────────────────────────────────────────────────
function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}> IA</div>
      )}
      <div className={`max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
        isUser ? 'bg-surface-overlay text-txt-primary rounded-tr-sm' : 'text-white rounded-tl-sm'
      }`} style={!isUser ? { background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' } : {}}>
        {content}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const { storeId } = useAuth();

  const [stats,     setStats]     = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [trends,    setTrends]    = useState<any>(null);
  const [insights,  setInsights]  = useState<Insights | null>(null);
  const [insLoading,setInsLoading]= useState(false);
  const [context,   setContext]   = useState('');

  const [dailyReports,     setDailyReports]     = useState<any[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);

  const [messages,  setMessages]  = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input,     setInput]     = useState('');
  const [thinking,  setThinking]  = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Cargar stats + trends ──────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, customersRes, convsRes, productsRes, trendsRes] = await Promise.all([
        api.get(`/orders/store/${storeId}`).catch(() => ({ data: [] })),
        api.get(`/customers/store/${storeId}`).catch(() => ({ data: [] })),
        api.get(`/conversations/store/${storeId}`).catch(() => ({ data: [] })),
        api.get(`/products/store/${storeId}`).catch(() => ({ data: [] })),
        getRevenueTrends(30).catch(() => ({ data: null })),
      ]);

      const orders:    any[] = ordersRes.data    ?? [];
      const customers: any[] = customersRes.data ?? [];
      const convs:     any[] = convsRes.data     ?? [];
      const products:  any[] = productsRes.data  ?? [];

      setTrends(trendsRes.data);

      const delivered   = orders.filter((o: any) => o.status === 'delivered');
      const revenue     = delivered.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
      const totalRevenue= orders.filter((o: any) => o.status !== 'cancelled')
        .reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);

      // Ganancia estimada desde costPrice
      const cost = delivered.reduce((s: number, o: any) => {
        return s + (o.orderItems ?? o.items ?? []).reduce((ss: number, it: any) =>
          ss + Number(it.product?.costPrice ?? 0) * (it.quantity ?? 1), 0);
      }, 0);

      const statusCount: Record<string, number> = {};
      orders.forEach((o: any) => { statusCount[o.status] = (statusCount[o.status] ?? 0) + 1; });

      const productSales: Record<string, { name: string; qty: number }> = {};
      delivered.forEach((o: any) => {
        (o.orderItems ?? o.items ?? []).forEach((it: any) => {
          const id   = it.productId ?? it.product?.productId ?? String(Math.random());
          const name = it.product?.name ?? it.description ?? 'Sin nombre';
          if (!productSales[id]) productSales[id] = { name, qty: 0 };
          productSales[id].qty += it.quantity ?? 1;
        });
      });
      const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 6);

      const cityCount: Record<string, number> = {};
      customers.forEach((c: any) => {
        const city = c.city ?? 'Sin ciudad';
        cityCount[city] = (cityCount[city] ?? 0) + 1;
      });
      const topCities = Object.entries(cityCount).map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value).slice(0, 6);

      const convStatus: Record<string, number> = {};
      convs.forEach((c: any) => { convStatus[c.status] = (convStatus[c.status] ?? 0) + 1; });

      const lowStock = products.filter((p: any) => {
        const total = p.variants?.length
          ? p.variants.reduce((s: number, v: any) => s + (v.stock ?? 0), 0)
          : (p.stock ?? 0);
        return total < 5;
      });

      // Clientes con summary (para info del advisor)
      const withSummary = customers.filter((c: any) => c.lastConversationSummary).length;
      // Top clientes por gasto
      const topBySpent = [...customers].sort((a: any, b: any) => Number(b.totalSpent) - Number(a.totalSpent)).slice(0, 3);

      setStats({
        revenue, totalRevenue, cost, profit: revenue - cost,
        totalOrders: orders.length, deliveredOrders: delivered.length,
        totalCustomers: customers.length, totalConvs: convs.length,
        totalProducts: products.length, lowStockCount: lowStock.length,
        statusCount, topProducts, topCities, convStatus, withSummary, topBySpent,
      });

      // Contexto enriquecido para el AI Advisor
      const ctx = `DATOS DEL NEGOCIO:

VENTAS Y FINANZAS:
- Pedidos totales: ${orders.length} | Entregados: ${delivered.length}
- Ingresos (entregados): ${fmt(revenue)} | Ganancia estimada: ${fmt(revenue - cost)}
- Estado de pedidos: ${JSON.stringify(statusCount)}

CLIENTES:
- Total: ${customers.length} | Con resúmenes de conversación: ${withSummary}
- Top por gasto: ${topBySpent.map((c: any) => `${c.name ?? c.phone} ($${Number(c.totalSpent).toLocaleString('es-CO')})`).join(', ')}
- Ciudades: ${topCities.slice(0, 5).map(c => `${c.name}(${c.value})`).join(', ')}

CONVERSACIONES WhatsApp:
- Total: ${convs.length} | Por estado: ${JSON.stringify(convStatus)}

PRODUCTOS:
- Activos: ${products.length} | Stock bajo (<5): ${lowStock.length}
- Top vendidos: ${topProducts.slice(0, 5).map(p => `${p.name}(${p.qty}u)`).join(', ')}`.trim();

      setContext(ctx);
    } catch (err) {
      console.error('Error cargando analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadStats();
    getDailyReports(30)
      .then(r => setDailyReports(r.data ?? []))
      .catch(() => {});
  }, [loadStats]);

  // ── Analizar conversaciones ────────────────────────────────────────────────
  const analyzeConversations = async () => {
    setInsLoading(true);
    try {
      const res = await getConversationInsights();
      setInsights(res.data);
    } catch (err: any) {
      console.error('Error en insights:', err);
    } finally {
      setInsLoading(false);
    }
  };

  // ── AI Advisor ─────────────────────────────────────────────────────────────
  const askGroq = async (userMessage: string) => {
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setThinking(true);

    // Enriquecer el contexto con datos de satisfacción si ya están cargados
    const enrichedContext = insights
      ? `${context}\n\nANÁLISIS DE SATISFACCIÓN (${insights.analyzed} conversaciones):\n- Satisfechos: ${insights.satisfied}% | Neutros: ${insights.neutral}% | Frustrados: ${insights.frustrated}%\n- Temas frecuentes: ${insights.topics.join(', ')}\n- Alertas: ${insights.alerts.join(', ')}`
      : context;

    try {
      const res = await api.post('/analytics/ai-advisor', { storeId, context: enrichedContext, messages: newMessages });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.response?.data?.message ?? err.message}` }]);
    } finally {
      setThinking(false);
    }
  };

  const quickQuestions = [
    '¿Cuál es mi situación financiera actual?',
    '¿Qué productos debo reabastecer urgente?',
    '¿Cómo puedo mejorar la satisfacción de mis clientes?',
    '¿Cuál es mi cliente más valioso y por qué?',
  ];

  return (
    <div className="min-h-screen bg-canvas">

      {/* Header */}
      <div className="bg-surface border-b border-border-subtle px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-txt-primary">Analíticas</h1>
            <p className="text-sm text-txt-tertiary mt-0.5">Resumen del negocio + satisfacción + asesor IA</p>
          </div>
          <button onClick={loadStats} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-surface-overlay text-txt-secondary hover:bg-border-default transition disabled:opacity-50">
            <RefreshIcon /> Actualizar
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <svg className="animate-spin text-blue-600" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>
        ) : stats && (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Ingresos totales"   value={fmt(stats.revenue)}
                sub={`${stats.deliveredOrders} pedidos entregados`} icon={<MoneyIcon />} color="bg-green-500" />
              <StatCard label="Ganancia estimada"  value={fmt(stats.profit)}
                sub={`Margen: ${stats.revenue > 0 ? Math.round((stats.profit / stats.revenue) * 100) : 0}%`}
                icon={<SparkIcon />} color="bg-purple-500" />
              <StatCard label="Clientes"           value={String(stats.totalCustomers)}
                sub={`${stats.withSummary} con historial de conversación`} icon={<UserIcon />} color="bg-blue-500" />
              <StatCard label="Pedidos"            value={String(stats.totalOrders)}
                sub={`${stats.totalProducts} productos activos`} icon={<CartIcon />} color="bg-orange-500" />
            </div>

            {/* ── Estados de pedidos ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(stats.statusCount).map(([status, count]: any) => {
                const labels: Record<string,string> = {
                  pending:'Pendientes', confirmed:'Confirmados', preparing:'Preparando',
                  ready:'Listos', delivered:'Entregados', cancelled:'Cancelados',
                };
                const colors: Record<string,string> = {
                  pending:'bg-yellow-400', confirmed:'bg-blue-400', preparing:'bg-orange-400',
                  ready:'bg-teal-400', delivered:'bg-green-500', cancelled:'bg-red-400',
                };
                return (
                  <div key={status} className="bg-surface rounded-2xl border border-border-subtle shadow-sm p-4 flex items-center gap-3">
                    <div className={`w-2 h-10 rounded-full ${colors[status] ?? 'bg-slate-300'}`} />
                    <div>
                      <p className="text-xs text-txt-tertiary">{labels[status] ?? status}</p>
                      <p className="text-2xl font-bold text-txt-primary">{count}</p>
                    </div>
                  </div>
                );
              })}
              {stats.lowStockCount > 0 && (
                <div className="bg-red-50 rounded-2xl border border-red-100 shadow-sm p-4 flex items-center gap-3">
                  <div className="w-2 h-10 rounded-full bg-red-500" />
                  <div>
                    <p className="text-xs text-red-400">Stock bajo</p>
                    <p className="text-2xl font-bold text-red-600">{stats.lowStockCount}</p>
                    <p className="text-xs text-red-400">productos</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Tendencia de ingresos ── */}
            <TrendChart data={trends} />

            {/* ── Charts productos + ciudades ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BarChart label="🏆 Productos más vendidos (unidades)"
                data={stats.topProducts.map((p: any) => ({ name: p.name, value: p.qty }))} />
              <BarChart label="📍 Clientes por ciudad" data={stats.topCities} />
            </div>

            {/* ── Conversaciones + Satisfacción ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Conversaciones breakdown */}
              <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm p-5">
                <p className="text-sm font-semibold text-txt-primary mb-4 flex items-center gap-2">
                  <ChatIcon /> Conversaciones WhatsApp
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'active',        label: 'IA activa',      color: 'text-green-600 bg-green-50'  },
                    { key: 'pending_human', label: 'Esperan humano', color: 'text-orange-600 bg-orange-50'},
                    { key: 'human',         label: 'Con asesor',     color: 'text-blue-600 bg-blue-50'    },
                    { key: 'closed',        label: 'Cerradas',       color: 'text-txt-secondary bg-surface-elevated'  },
                  ].map(s => (
                    <div key={s.key} className={`rounded-xl px-4 py-3 ${s.color}`}>
                      <p className="text-2xl font-bold">{stats.convStatus[s.key] ?? 0}</p>
                      <p className="text-xs font-medium mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Satisfacción — panel compacto en grid */}
              <SentimentPanel
                insights={insights}
                loading={insLoading}
                onAnalyze={analyzeConversations}
              />
            </div>

            {/* ── Daily Report Section ── */}
            <div className="bg-surface rounded-2xl p-6 shadow-sm border border-border-subtle">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-txt-primary">Reporte del Día</h2>
                    <p className="text-xs text-txt-tertiary">Enviado automáticamente a las 9pm Colombia vía WA y email</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setGeneratingReport(true);
                    try {
                      await generateReport();
                    } catch {
                      // ignore
                    } finally {
                      setGeneratingReport(false);
                    }
                  }}
                  disabled={generatingReport}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60 transition"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
                >
                  {generatingReport ? 'Generando...' : 'Generar ahora'}
                </button>
              </div>

              {dailyReports.length === 0 ? (
                <p className="text-sm text-txt-tertiary text-center py-8">
                  Aún no hay reportes generados. El primero se enviará automáticamente esta noche a las 9pm.
                </p>
              ) : (
                <div className="space-y-3">
                  {dailyReports.slice(0, 10).map((r: any) => {
                    const d    = r.appointmentsData ?? {};
                    const p    = r.paymentsData ?? {};
                    const date = new Date(r.date).toLocaleDateString('es-CO', {
                      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                    });
                    const fmtMoney = (n: number) => `$${n.toLocaleString('es-CO')}`;
                    return (
                      <div key={r.reportId} className="p-3 bg-surface-elevated rounded-xl border border-border-subtle">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-txt-primary">{date}</span>
                          <span className="text-sm font-bold text-emerald-600">
                            {fmtMoney(p.confirmed ?? 0)}
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs text-txt-secondary">
                          <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-success" /> {d.completed ?? 0} completadas</span>
                          <span className="flex items-center gap-1"><XCircle size={11} className="text-error" /> {d.cancelled ?? 0} canceladas</span>
                          <span className="flex items-center gap-1"><Ghost size={11} className="text-txt-tertiary" /> {d.noShow ?? 0} no-show</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── AI Advisor ── */}
            <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border-subtle flex items-center gap-3"
                style={{ background: 'rgba(212,255,0,0.06)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                  style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}> 
                  <SparkIcon />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-txt-primary">Asesor IA</p>
                  <p className="text-xs text-txt-tertiary">
                    Powered by Groq · Llama 3.3 70B
                    {insights && ` · Incluye análisis de ${insights.analyzed} conversaciones`}
                  </p>
                </div>
              </div>

              <div className="h-80 overflow-y-auto px-6 py-4 bg-surface-elevated">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <p className="text-sm text-txt-tertiary text-center">
                      Pregúntale al asesor sobre tus ventas, clientes o estrategia.
                      {!insights && ' Analiza las conversaciones primero para preguntas de satisfacción.'}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {quickQuestions.map((q, i) => (
                        <button key={i} onClick={() => askGroq(q)}
                          className="px-3 py-2 text-xs rounded-xl bg-surface border border-border-default text-txt-secondary hover:border-blue-300 hover:text-blue-600 transition shadow-sm">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)}
                    {thinking && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold mr-0"
                          style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}> IA</div>
                        <div className="flex gap-1 px-4 py-3 rounded-2xl rounded-tl-sm"
                          style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}> 
                          {[0,1,2].map(i => (
                            <span key={i} className="w-2 h-2 bg-surface/70 rounded-full animate-bounce"
                              style={{ animationDelay: `${i * 150}ms` }} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </>
                )}
              </div>

              <div className="px-6 py-4 border-t border-border-subtle bg-surface">
                <div className="flex gap-3">
                  <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && input.trim()) { e.preventDefault(); askGroq(input); } }}
                    placeholder="Ej: ¿Qué problema se repite más en las conversaciones?"
                    disabled={thinking}
                    className="flex-1 px-4 py-2.5 text-sm border border-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30 transition disabled:opacity-50"
                  />
                  <button onClick={() => input.trim() && askGroq(input)}
                    disabled={thinking || !input.trim()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}> 
                    <SendIcon />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
