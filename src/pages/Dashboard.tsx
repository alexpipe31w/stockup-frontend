import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Users, MessageCircle, ShoppingCart, DollarSign, Bot, UserCheck,
  Megaphone, CalendarDays, TrendingUp, AlertCircle, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getDashboard, getWhatsAppStatus, getAppointmentStats } from '../services/api';

interface DashboardData {
  clientes: { total: number; nuevosHoy: number };
  conversaciones: { total: number; activas: number; esperandoHumano: number; cerradas: number };
  mensajes: { total: number; porIA: number; porHumano: number };
  ordenes: { total: number; pendientes: number; confirmadas: number; entregadas: number; canceladas: number; revenueTotal: number };
  campanas: { total: number; enviadas: number };
  conversacionesRecientes: any[];
}

interface AppointmentStats {
  total?: number; pending?: number; confirmed?: number; today?: number; upcoming?: number;
}

const kpiConfig = [
  { key: 'clientes',    label: 'Clientes',         icon: Users,        color: 'text-info' },
  { key: 'chats',       label: 'Chats activos',     icon: MessageCircle,color: 'text-whatsapp' },
  { key: 'ordenes',     label: 'Órdenes pendientes',icon: ShoppingCart, color: 'text-warning' },
  { key: 'revenue',     label: 'Revenue total',     icon: DollarSign,   color: 'text-lime' },
  { key: 'ia',          label: 'Mensajes por IA',   icon: Bot,          color: 'text-info' },
  { key: 'atencion',    label: 'Esperando asesor',  icon: UserCheck,    color: 'text-error' },
  { key: 'campanas',    label: 'Campañas enviadas',  icon: Megaphone,    color: 'text-warning' },
  { key: 'citas',       label: 'Citas pendientes',   icon: CalendarDays, color: 'text-success' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const convStatusStyle: Record<string, string> = {
  active:        'bg-success/10 text-success',
  pending_human: 'bg-warning/10 text-warning',
  human:         'bg-info/10 text-info',
  closed:        'bg-surface-overlay text-txt-tertiary',
};
const convStatusLabel: Record<string, string> = {
  active: 'IA activa', pending_human: 'Espera asesor', human: 'Con asesor', closed: 'Cerrada',
};

function WAStatus({ storeId }: { storeId: string }) {
  const [status, setStatus] = useState<'connected' | 'disconnected' | null>(null);

  useEffect(() => {
    getWhatsAppStatus(storeId)
      .then(res => setStatus(res.data?.status === 'connected' ? 'connected' : 'disconnected'))
      .catch(() => setStatus('disconnected'));
  }, [storeId]);

  if (!status) return null;
  return (
    <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full ${
      status === 'connected' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
    }`}>
      <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-success animate-pulse' : 'bg-error'}`} />
      WhatsApp {status === 'connected' ? 'conectado' : 'desconectado'}
    </div>
  );
}

function KPICard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: any; color: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-surface border border-border-subtle rounded-2xl p-4 md:p-5 hover:border-border-default hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center mb-3">
        <Icon size={20} strokeWidth={1.5} className={color} />
      </div>
      <p className="text-2xl font-bold text-txt-primary tracking-tight">{value}</p>
      <p className="text-xs text-txt-secondary mt-1 font-medium">{label}</p>
      {sub && <p className="text-[11px] text-txt-tertiary mt-0.5">{sub}</p>}
    </motion.div>
  );
}

export default function Dashboard() {
  const { storeId } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [apptStats, setApptStats] = useState<AppointmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadData = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(false);
    Promise.all([
      getDashboard(storeId),
      getAppointmentStats().catch(() => ({ data: null })),
    ]).then(([dashRes, apptRes]) => {
      setData(dashRes.data);
      if (apptRes.data) setApptStats(apptRes.data);
      setError(false);
    }).catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => {
    loadData();
    return () => abortRef.current?.abort();
  }, [loadData]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

  const kpis = data ? [
    { label: 'Clientes',           value: data.clientes.total,         sub: data.clientes.nuevosHoy > 0 ? `+${data.clientes.nuevosHoy} hoy` : undefined, icon: Users,        color: 'text-info' },
    { label: 'Chats activos',      value: data.conversaciones.activas, sub: `${data.conversaciones.esperandoHumano} esperando asesor`,                     icon: MessageCircle,color: 'text-whatsapp' },
    { label: 'Órdenes pendientes', value: data.ordenes.pendientes,      sub: `${data.ordenes.total} en total`,                                             icon: ShoppingCart, color: 'text-warning' },
    { label: 'Revenue total',      value: fmt(data.ordenes.revenueTotal),sub: `${data.ordenes.entregadas} entregadas`,                                     icon: DollarSign,   color: 'text-lime' },
    { label: 'Mensajes por IA',    value: data.mensajes.porIA,          sub: `de ${data.mensajes.total} totales`,                                          icon: Bot,          color: 'text-info' },
    { label: 'Esperando asesor',   value: data.conversaciones.esperandoHumano, sub: 'Intervención manual',                                                  icon: UserCheck,    color: 'text-error' },
    { label: 'Campañas enviadas',  value: data.campanas.enviadas,       sub: `${data.campanas.total} creadas`,                                             icon: Megaphone,    color: 'text-warning' },
    { label: 'Citas pendientes',   value: apptStats?.pending ?? apptStats?.total ?? data.ordenes.confirmadas, sub: apptStats?.today !== undefined ? `${apptStats.today} hoy` : `${data.ordenes.confirmadas} confirmadas`, icon: CalendarDays, color: 'text-success' },
  ] : [];

  return (
    <div className="min-h-screen pb-24 md:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="px-4 md:px-6 pt-4 md:pt-6 pb-4"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-txt-primary capitalize">
              Dashboard
            </h1>
            <p className="text-sm text-txt-secondary mt-0.5 capitalize">{dateStr}</p>
          </div>
          <WAStatus storeId={storeId} />
        </div>
      </motion.div>

      {/* KPI Grid */}
      {loading ? (
        <div className="px-4 md:px-6 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-surface border border-border-subtle rounded-2xl p-4 h-28 skeleton-shimmer" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center">
            <AlertCircle size={24} className="text-error" />
          </div>
          <p className="text-txt-secondary font-medium">No pudimos cargar el dashboard</p>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-txt-inverse text-sm font-semibold"
          >
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      ) : (
        <>
          <motion.div
            className="px-4 md:px-6 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {kpis.map((kpi) => (
              <KPICard key={kpi.label} {...kpi} />
            ))}
          </motion.div>

          {/* Conversaciones recientes */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="px-4 md:px-6 mt-6"
          >
            <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden">
              <div className="px-4 md:px-5 py-4 border-b border-border-subtle flex items-center justify-between">
                <h3 className="font-semibold text-txt-primary text-base">Conversaciones recientes</h3>
                <span className="text-[11px] text-txt-tertiary bg-surface-elevated px-2.5 py-1 rounded-full">
                  {data?.conversacionesRecientes.length ?? 0}
                </span>
              </div>
              <div className="divide-y divide-border-subtle">
                {data?.conversacionesRecientes.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle size={32} className="text-txt-disabled mx-auto mb-2" strokeWidth={1} />
                    <p className="text-txt-tertiary text-sm">Sin conversaciones aún</p>
                  </div>
                ) : data?.conversacionesRecientes.map((conv: any) => (
                  <div key={conv.conversationId} className="flex items-center gap-3 px-4 md:px-5 py-3.5 hover:bg-surface-elevated transition">
                    <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center text-txt-inverse font-bold text-sm flex-shrink-0">
                      {conv.customer?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-txt-primary truncate">
                        {conv.customer?.name ?? conv.customer?.phone ?? 'Cliente'}
                      </p>
                      <p className="text-xs text-txt-secondary truncate mt-0.5">
                        {conv.messages?.[0]?.content ?? 'Sin mensajes'}
                      </p>
                    </div>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${convStatusStyle[conv.status] ?? 'bg-surface-overlay text-txt-tertiary'}`}>
                      {convStatusLabel[conv.status] ?? conv.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
