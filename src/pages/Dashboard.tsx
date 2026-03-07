import React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getDashboard } from '../services/api';

// Íconos SVG
const Icons = {
  users: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  chat: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  orders: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  revenue: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  bot: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>,
  human: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  menu: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
};

interface DashboardData {
  clientes: { total: number; nuevosHoy: number };
  conversaciones: { total: number; activas: number; esperandoHumano: number; cerradas: number };
  mensajes: { total: number; porIA: number; porHumano: number };
  ordenes: { total: number; pendientes: number; confirmadas: number; entregadas: number; canceladas: number; revenueTotal: number };
  campanas: { total: number; enviadas: number };
  conversacionesRecientes: any[];
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { logout, storeId } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard(storeId)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [storeId]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="white"/>
            </svg>
          </div>
          <span className="font-bold text-slate-800 text-lg">Stockup Messages</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition text-sm font-medium"
        >
          {Icons.logout} Salir
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Título */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">Resumen general de tu tienda</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <svg className="animate-spin text-blue-600" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>
        ) : data ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<span className="text-blue-600">{Icons.users}</span>}
                label="Clientes totales"
                value={data.clientes.total}
                sub={`+${data.clientes.nuevosHoy} hoy`}
                color="bg-blue-50"
              />
              <StatCard
                icon={<span className="text-purple-600">{Icons.chat}</span>}
                label="Conversaciones activas"
                value={data.conversaciones.activas}
                sub={`${data.conversaciones.esperandoHumano} esperando humano`}
                color="bg-purple-50"
              />
              <StatCard
                icon={<span className="text-orange-600">{Icons.orders}</span>}
                label="Órdenes pendientes"
                value={data.ordenes.pendientes}
                sub={`${data.ordenes.total} totales`}
                color="bg-orange-50"
              />
              <StatCard
                icon={<span className="text-green-600">{Icons.revenue}</span>}
                label="Revenue total"
                value={fmt(data.ordenes.revenueTotal)}
                sub={`${data.ordenes.entregadas} entregadas`}
                color="bg-green-50"
              />
              <StatCard
                icon={<span className="text-indigo-600">{Icons.bot}</span>}
                label="Mensajes por IA"
                value={data.mensajes.porIA}
                sub={`${data.mensajes.total} mensajes totales`}
                color="bg-indigo-50"
              />
              <StatCard
                icon={<span className="text-pink-600">{Icons.human}</span>}
                label="Atención humana"
                value={data.conversaciones.esperandoHumano}
                sub="Requieren intervención"
                color="bg-pink-50"
              />
              <StatCard
                icon={<span className="text-teal-600">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.22 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                </span>}
                label="Campañas enviadas"
                value={data.campanas.enviadas}
                sub={`${data.campanas.total} creadas`}
                color="bg-teal-50"
              />
              <StatCard
                icon={<span className="text-red-600">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </span>}
                label="Órdenes confirmadas"
                value={data.ordenes.confirmadas}
                sub={`${data.ordenes.canceladas} canceladas`}
                color="bg-red-50"
              />
            </div>

            {/* Conversaciones recientes */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Conversaciones recientes</h2>
                <span className="text-xs text-slate-400">{data.conversacionesRecientes.length} conversaciones</span>
              </div>
              <div className="divide-y divide-slate-50">
                {data.conversacionesRecientes.length === 0 ? (
                  <p className="text-center text-slate-400 py-10">Sin conversaciones aún</p>
                ) : data.conversacionesRecientes.map((conv: any) => (
                  <div key={conv.conversationId} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
                    >
                      {conv.customer?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">
                        {conv.customer?.name ?? conv.customer?.phone}
                      </p>
                      <p className="text-sm text-slate-400 truncate">
                        {conv.messages?.[0]?.content ?? 'Sin mensajes'}
                      </p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium flex-shrink-0 ${
                      conv.status === 'active' ? 'bg-green-100 text-green-700' :
                      conv.status === 'pending_human' ? 'bg-orange-100 text-orange-700' :
                      conv.status === 'human' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {conv.status === 'active' ? 'Activa' :
                       conv.status === 'pending_human' ? 'Espera humano' :
                       conv.status === 'human' ? 'Con asesor' : 'Cerrada'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-center text-slate-400 py-20">Error cargando datos</p>
        )}
      </main>
    </div>
  );
}
