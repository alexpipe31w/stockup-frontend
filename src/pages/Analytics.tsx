import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

// ── Icons ─────────────────────────────────────────────────────────────────────
const SparkIcon  = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>);
const SendIcon   = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>);
const UserIcon   = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const CartIcon   = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>);
const MoneyIcon  = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>);
const ChatIcon   = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>);
const BoxIcon    = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>);
const RefreshIcon= () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>);

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

// API key viene del backend (configurada por tienda en AiConfig)

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Mini Bar Chart ────────────────────────────────────────────────────────────
function BarChart({ data, label }: { data: { name: string; value: number }[]; label: string }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p className="text-sm font-semibold text-slate-700 mb-4">{label}</p>
      <div className="space-y-2">
        {data.slice(0, 6).map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <p className="text-xs text-slate-500 w-24 truncate flex-shrink-0">{d.name}</p>
            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(d.value / max) * 100}%`,
                  background: 'linear-gradient(90deg,#2563eb,#9333ea)',
                }}
              />
            </div>
            <p className="text-xs font-semibold text-slate-700 w-16 text-right flex-shrink-0">{d.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chat message bubble ───────────────────────────────────────────────────────
function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
          IA
        </div>
      )}
      <div
        className={`max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-slate-100 text-slate-800 rounded-tr-sm'
            : 'text-white rounded-tl-sm'
        }`}
        style={!isUser ? { background: 'linear-gradient(135deg,#2563eb,#9333ea)' } : {}}
      >
        {content}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const { storeId } = useAuth();

  // stats data
  const [stats,    setStats]    = useState<any>(null);
  const [loading,  setLoading]  = useState(true);

  // AI chat
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input,    setInput]    = useState('');
  const [thinking, setThinking] = useState(false);
  const [context,  setContext]  = useState('');

  const bottomRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Load stats ─────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, customersRes, convsRes, productsRes] = await Promise.all([
        api.get(`/orders/store/${storeId}`).catch(() => ({ data: [] })),
        api.get(`/customers/store/${storeId}`).catch(() => ({ data: [] })),
        api.get(`/conversations/store/${storeId}`).catch(() => ({ data: [] })),
        api.get(`/products/store/${storeId}`).catch(() => ({ data: [] })),
      ]);

      const orders:    any[] = ordersRes.data    ?? [];
      const customers: any[] = customersRes.data ?? [];
      const convs:     any[] = convsRes.data     ?? [];
      const products:  any[] = productsRes.data  ?? [];

      // ── Calcular métricas ──────────────────────────────────────────────────
      const delivered = orders.filter((o: any) => o.status === 'delivered');
      const revenue   = delivered.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
      const cost      = delivered.reduce((s: number, o: any) => {
        return s + (o.items ?? []).reduce((ss: number, it: any) =>
          ss + Number(it.product?.costPrice ?? 0) * (it.quantity ?? 1), 0);
      }, 0);
      const profit = revenue - cost;

      const statusCount = orders.reduce((acc: any, o: any) => {
        acc[o.status] = (acc[o.status] ?? 0) + 1; return acc;
      }, {});

      // top productos por cantidad vendida
      const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
      delivered.forEach((o: any) => {
        (o.items ?? []).forEach((it: any) => {
          const id = it.productId ?? it.product?.productId ?? Math.random();
          const name = it.product?.name ?? it.description ?? 'Sin nombre';
          if (!productSales[id]) productSales[id] = { name, qty: 0, revenue: 0 };
          productSales[id].qty     += it.quantity ?? 1;
          productSales[id].revenue += Number(it.unitPrice ?? 0) * (it.quantity ?? 1);
        });
      });
      const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 6);

      // ciudades de clientes
      const cityCount: Record<string, number> = {};
      customers.forEach((c: any) => {
        const city = c.city ?? 'Sin ciudad';
        cityCount[city] = (cityCount[city] ?? 0) + 1;
      });
      const topCities = Object.entries(cityCount).map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value).slice(0, 6);

      // conversaciones por estado
      const convStatus: Record<string, number> = {};
      convs.forEach((c: any) => { convStatus[c.status] = (convStatus[c.status] ?? 0) + 1; });

      // stock bajo
      const lowStock = products.filter((p: any) => {
        const total = p.variants?.length
          ? p.variants.reduce((s: number, v: any) => s + (v.stock ?? 0), 0)
          : (p.stock ?? 0);
        return total < 5;
      });

      const computed = {
        revenue, profit, cost,
        totalOrders:    orders.length,
        deliveredOrders: delivered.length,
        totalCustomers:  customers.length,
        totalConvs:      convs.length,
        totalProducts:   products.length,
        lowStockCount:   lowStock.length,
        statusCount, topProducts, topCities, convStatus,
        orders, customers, convs, products,
      };
      setStats(computed);

      // Construir contexto para la IA
      const ctx = `
DATOS DEL NEGOCIO (StoreId: ${storeId}):

VENTAS Y FINANZAS:
- Pedidos totales: ${orders.length}
- Pedidos entregados: ${delivered.length}
- Ingresos totales (entregados): ${fmt(revenue)}
- Ganancia estimada: ${fmt(profit)}
- Pedidos por estado: ${JSON.stringify(statusCount)}

CLIENTES:
- Total clientes: ${customers.length}
- Top ciudades: ${JSON.stringify(topCities.slice(0,5))}

CONVERSACIONES WhatsApp:
- Total: ${convs.length}
- Por estado: ${JSON.stringify(convStatus)}

PRODUCTOS:
- Total activos: ${products.length}
- Productos con stock bajo (<5): ${lowStock.length}
- Top productos más vendidos: ${JSON.stringify(topProducts.slice(0,5))}
`.trim();
      setContext(ctx);

    } catch (err) {
      console.error('Error cargando stats:', err);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ── AI Chat con Groq ───────────────────────────────────────────────────────
  const askGroq = async (userMessage: string) => {
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setThinking(true);

    try {
      // ✅ Llama al backend — la API key nunca sale del servidor
      const res = await api.post('/analytics/ai-advisor', {
        storeId,
        context,
        messages: newMessages,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (err: any) {
      const msg = err.response?.data?.message ?? err.message;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${msg}`,
      }]);
    } finally {
      setThinking(false);
    }
  };

  const quickQuestions = [
    '¿Cuál es mi situación financiera actual?',
    '¿Qué productos debo reabastecer urgente?',
    '¿Cómo puedo mejorar mis ventas?',
    '¿Qué dice el análisis de mis clientes?',
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Analíticas</h1>
            <p className="text-sm text-slate-400 mt-0.5">Resumen del negocio + asesor IA</p>
          </div>
          <button onClick={loadStats} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition disabled:opacity-50">
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
            {/* ── KPI Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Ingresos totales" value={fmt(stats.revenue)}
                sub={`${stats.deliveredOrders} pedidos entregados`}
                icon={<MoneyIcon />} color="bg-green-500" />
              <StatCard label="Ganancia estimada" value={fmt(stats.profit)}
                sub={`Margen: ${stats.revenue > 0 ? Math.round((stats.profit / stats.revenue) * 100) : 0}%`}
                icon={<SparkIcon />} color="bg-purple-500" />
              <StatCard label="Clientes" value={String(stats.totalCustomers)}
                sub={`${stats.totalConvs} conversaciones`}
                icon={<UserIcon />} color="bg-blue-500" />
              <StatCard label="Pedidos" value={String(stats.totalOrders)}
                sub={`${stats.totalProducts} productos activos`}
                icon={<CartIcon />} color="bg-orange-500" />
            </div>

            {/* ── Segunda fila KPIs ──────────────────────────────────────── */}
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
                  <div key={status} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
                    <div className={`w-2 h-10 rounded-full ${colors[status] ?? 'bg-slate-300'}`} />
                    <div>
                      <p className="text-xs text-slate-400">{labels[status] ?? status}</p>
                      <p className="text-2xl font-bold text-slate-800">{count}</p>
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

            {/* ── Charts ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BarChart
                label="🏆 Productos más vendidos (unidades)"
                data={stats.topProducts.map((p: any) => ({ name: p.name, value: p.qty }))}
              />
              <BarChart
                label="📍 Clientes por ciudad"
                data={stats.topCities}
              />
            </div>

            {/* ── Conversaciones breakdown ───────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <ChatIcon /> Conversaciones WhatsApp
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { key: 'active',        label: 'IA activa',       color: 'text-green-600 bg-green-50'  },
                  { key: 'pending_human', label: 'Esperan humano',  color: 'text-orange-600 bg-orange-50'},
                  { key: 'human',         label: 'Con asesor',      color: 'text-blue-600 bg-blue-50'    },
                  { key: 'closed',        label: 'Cerradas',        color: 'text-slate-500 bg-slate-50'  },
                ].map(s => (
                  <div key={s.key} className={`rounded-xl px-4 py-3 ${s.color}`}>
                    <p className="text-2xl font-bold">{stats.convStatus[s.key] ?? 0}</p>
                    <p className="text-xs font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── AI Advisor ────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3"
                style={{ background: 'linear-gradient(135deg,#2563eb10,#9333ea10)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                  style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
                  <SparkIcon />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Asesor IA</p>
                  <p className="text-xs text-slate-400">Powered by Groq · Llama 3.3 70B</p>
                </div>
              </div>

              {/* Chat area */}
              <div className="h-80 overflow-y-auto px-6 py-4 bg-slate-50">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <p className="text-sm text-slate-400 text-center">
                      Pregúntale al asesor IA sobre tus ventas, clientes, productos o estrategia.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {quickQuestions.map((q, i) => (
                        <button key={i} onClick={() => askGroq(q)}
                          className="px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition shadow-sm">
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
                          style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
                          IA
                        </div>
                        <div className="flex gap-1 px-4 py-3 rounded-2xl rounded-tl-sm"
                          style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
                          {[0,1,2].map(i => (
                            <span key={i} className="w-2 h-2 bg-white/70 rounded-full animate-bounce"
                              style={{ animationDelay: `${i * 150}ms` }} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="px-6 py-4 border-t border-slate-100 bg-white">
                <div className="flex gap-3">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && input.trim()) { e.preventDefault(); askGroq(input); } }}
                    placeholder="Ej: ¿Cuáles son mis productos más rentables?"
                    disabled={thinking}
                    className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50"
                  />
                  <button onClick={() => input.trim() && askGroq(input)}
                    disabled={thinking || !input.trim()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
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
