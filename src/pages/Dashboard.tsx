import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getDashboard, getWhatsAppStatus, getAppointmentStats } from '../services/api';

const Icons = {
  users:   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  chat:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  orders:  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  revenue: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  bot:     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>,
  human:   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  calendar:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  whatsapp:<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
};

interface DashboardData {
  clientes: { total: number; nuevosHoy: number };
  conversaciones: { total: number; activas: number; esperandoHumano: number; cerradas: number };
  mensajes: { total: number; porIA: number; porHumano: number };
  ordenes: { total: number; pendientes: number; confirmadas: number; entregadas: number; canceladas: number; revenueTotal: number };
  campanas: { total: number; enviadas: number };
  conversacionesRecientes: any[];
}

interface AppointmentStats {
  total?: number;
  pending?: number;
  confirmed?: number;
  today?: number;
  upcoming?: number;
}

function StatCard({ icon, label, value, sub, colorClass }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; colorClass: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function WAStatusBadge({ storeId }: { storeId: string }) {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');

  useEffect(() => {
    getWhatsAppStatus(storeId)
      .then(res => setStatus(res.data?.status === 'connected' ? 'connected' : 'disconnected'))
      .catch(() => setStatus('disconnected'));
  }, [storeId]);

  if (status === 'loading') return null;

  return (
    <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full ${
      status === 'connected'
        ? 'bg-green-100 text-green-700'
        : 'bg-red-100 text-red-600'
    }`}>
      <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-green-700 opacity-80">{Icons.whatsapp}</span>
      WhatsApp {status === 'connected' ? 'conectado' : 'desconectado'}
    </div>
  );
}

export default function Dashboard() {
  const { storeId } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [apptStats, setApptStats] = useState<AppointmentStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  useEffect(() => {
    Promise.all([
      getDashboard(storeId),
      getAppointmentStats().catch(() => ({ data: null })),
    ]).then(([dashRes, apptRes]) => {
      setData(dashRes.data);
      if (apptRes.data) setApptStats(apptRes.data);
    }).finally(() => setLoading(false));
  }, [storeId]);

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Cabecera + WA status */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-slate-500 mt-0.5 text-sm">Resumen general de tu negocio</p>
          </div>
          <WAStatusBadge storeId={storeId} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <svg className="animate-spin text-primary" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                sub={data.clientes.nuevosHoy > 0 ? `+${data.clientes.nuevosHoy} hoy` : 'Sin nuevos hoy'}
                colorClass="bg-blue-50"
              />
              <StatCard
                icon={<span className="text-purple-600">{Icons.chat}</span>}
                label="Conversaciones activas"
                value={data.conversaciones.activas}
                sub={`${data.conversaciones.esperandoHumano} esperando asesor`}
                colorClass="bg-purple-50"
              />
              <StatCard
                icon={<span className="text-orange-600">{Icons.orders}</span>}
                label="Órdenes pendientes"
                value={data.ordenes.pendientes}
                sub={`${data.ordenes.total} en total`}
                colorClass="bg-orange-50"
              />
              <StatCard
                icon={<span className="text-green-600">{Icons.revenue}</span>}
                label="Revenue total"
                value={fmt(data.ordenes.revenueTotal)}
                sub={`${data.ordenes.entregadas} entregadas`}
                colorClass="bg-green-50"
              />
              <StatCard
                icon={<span className="text-indigo-600">{Icons.bot}</span>}
                label="Mensajes por IA"
                value={data.mensajes.porIA}
                sub={`de ${data.mensajes.total} mensajes totales`}
                colorClass="bg-indigo-50"
              />
              <StatCard
                icon={<span className="text-pink-600">{Icons.human}</span>}
                label="Requieren atención"
                value={data.conversaciones.esperandoHumano}
                sub="Esperando intervención humana"
                colorClass="bg-pink-50"
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
                colorClass="bg-teal-50"
              />
              {apptStats ? (
                <StatCard
                  icon={<span className="text-violet-600">{Icons.calendar}</span>}
                  label="Citas pendientes"
                  value={apptStats.pending ?? apptStats.total ?? 0}
                  sub={apptStats.today !== undefined ? `${apptStats.today} hoy` : `${apptStats.confirmed ?? 0} confirmadas`}
                  colorClass="bg-violet-50"
                />
              ) : (
                <StatCard
                  icon={<span className="text-red-600">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  </span>}
                  label="Órdenes confirmadas"
                  value={data.ordenes.confirmadas}
                  sub={`${data.ordenes.canceladas} canceladas`}
                  colorClass="bg-red-50"
                />
              )}
            </div>

            {/* Conversaciones recientes */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Conversaciones recientes</h2>
                <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
                  {data.conversacionesRecientes.length} conversaciones
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {data.conversacionesRecientes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-slate-300 mb-2">{Icons.chat}</div>
                    <p className="text-slate-400 text-sm">Sin conversaciones aún</p>
                  </div>
                ) : data.conversacionesRecientes.map((conv: any) => (
                  <div key={conv.conversationId} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
                    >
                      {conv.customer?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">
                        {conv.customer?.name ?? conv.customer?.phone ?? 'Cliente'}
                      </p>
                      <p className="text-sm text-slate-400 truncate">
                        {conv.messages?.[0]?.content ?? 'Sin mensajes'}
                      </p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium flex-shrink-0 ${
                      conv.status === 'active'         ? 'bg-green-100 text-green-700' :
                      conv.status === 'pending_human'  ? 'bg-orange-100 text-orange-700' :
                      conv.status === 'human'          ? 'bg-blue-100 text-blue-700' :
                                                         'bg-slate-100 text-slate-500'
                    }`}>
                      {conv.status === 'active'        ? 'Activa' :
                       conv.status === 'pending_human' ? 'Espera asesor' :
                       conv.status === 'human'         ? 'Con asesor' : 'Cerrada'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-slate-400">Error cargando el dashboard</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Reintentar
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
