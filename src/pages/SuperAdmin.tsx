import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSuperAdminDashboard,
  getSuperAdminStores,
  getSuperAdminUsers,
  getSuperAdminAudit,
  toggleSuperAdminStore,
  toggleSuperAdminUser,
  deleteSuperAdminUser,
  getSuperAdminSubscriptionConfig,
  updateSuperAdminSubscriptionConfig,
  getSuperAdminSubscriptions,
} from '../services/api';

type Tab = 'dashboard' | 'stores' | 'users' | 'audit' | 'subscriptions';

interface DashboardStats {
  totalStores: number;
  activeStores: number;
  blockedStores: number;
  totalUsers: number;
  blockedUsers: number;
}

interface Store {
  storeId: string;
  name: string;
  phone: string;
  ownerName: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; conversations: number; orders: number };
}

interface User {
  userId: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  store: { storeId: string; name: string; phone: string } | null;
}

interface AuditLog {
  logId: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, any>;
  createdAt: string;
}

interface SubscriptionConfig {
  configId: string;
  priceAmount: number;
  currency: string;
  updatedAt?: string;
  updatedBy?: string;
}

interface SubRecord {
  subscriptionId: string;
  storeId: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  priceAmount: number;
  updatedAt: string;
  store: { name: string; phone: string; ownerName: string | null };
  payments: { status: string; amount: number; paidAt: string | null }[];
}

function decodeJwt(token: string): any {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  const payload = decodeJwt(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 > Date.now() && payload.role === 'superadmin';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    USER_BLOCKED: 'bg-red-100 text-red-700',
    USER_UNBLOCKED: 'bg-green-100 text-green-700',
    USER_DELETED: 'bg-red-200 text-red-800',
    STORE_BLOCKED: 'bg-orange-100 text-orange-700',
    STORE_UNBLOCKED: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[action] ?? 'bg-surface-overlay text-txt-secondary'}`}>
      {action}
    </span>
  );
}

export default function SuperAdmin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [subConfig, setSubConfig] = useState<SubscriptionConfig | null>(null);
  const [subs, setSubs] = useState<SubRecord[]>([]);
  const [editPrice, setEditPrice] = useState('');
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);

  const token = localStorage.getItem('sa_token');
  const adminEmail = token ? decodeJwt(token)?.email : '';

  useEffect(() => {
    if (!isTokenValid(token)) {
      navigate('/superadmin/login', { replace: true });
    }
  }, [token, navigate]);

  const loadTab = useCallback(async (t: Tab) => {
    setLoading(true);
    setError('');
    try {
      if (t === 'dashboard') {
        const res = await getSuperAdminDashboard();
        setStats(res.data);
      } else if (t === 'stores') {
        const res = await getSuperAdminStores();
        setStores(res.data);
      } else if (t === 'users') {
        const res = await getSuperAdminUsers();
        setUsers(res.data);
      } else if (t === 'audit') {
        const res = await getSuperAdminAudit();
        setAudit(res.data);
      } else if (t === 'subscriptions') {
        const [cfgRes, subsRes] = await Promise.all([
          getSuperAdminSubscriptionConfig(),
          getSuperAdminSubscriptions(),
        ]);
        setSubConfig(cfgRes.data);
        setEditPrice(String(cfgRes.data.priceAmount));
        setSubs(subsRes.data);
      }
    } catch (e: any) {
      if (e.response?.status === 401 || e.response?.status === 403) {
        localStorage.removeItem('sa_token');
        navigate('/superadmin/login', { replace: true });
        return;
      }
      setError('Error al cargar datos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (isTokenValid(token)) loadTab(tab);
  }, [tab, loadTab, token]);

  const handleToggleStore = async (storeId: string) => {
    try {
      await toggleSuperAdminStore(storeId);
      setStores(prev => prev.map(s => s.storeId === storeId ? { ...s, isActive: !s.isActive } : s));
    } catch {
      setError('Error al actualizar tienda');
    }
  };

  const handleToggleUser = async (userId: string) => {
    try {
      await toggleSuperAdminUser(userId);
      setUsers(prev => prev.map(u => u.userId === userId ? { ...u, isActive: !u.isActive } : u));
    } catch {
      setError('Error al actualizar usuario');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteSuperAdminUser(userId);
      setUsers(prev => prev.filter(u => u.userId !== userId));
      setConfirmDelete(null);
    } catch {
      setError('Error al eliminar usuario');
    }
  };

  const logout = () => {
    localStorage.removeItem('sa_token');
    navigate('/superadmin/login', { replace: true });
  };

  const handleSavePrice = async () => {
    const price = Number(editPrice);
    if (!price || price <= 0) return;
    setPriceLoading(true);
    try {
      const res = await updateSuperAdminSubscriptionConfig(price);
      setSubConfig(res.data);
      setEditingPrice(false);
    } catch {
      setError('Error al actualizar el precio');
    } finally {
      setPriceLoading(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'stores', label: 'Tiendas' },
    { key: 'users', label: 'Usuarios' },
    { key: 'audit', label: 'Auditoría' },
    { key: 'subscriptions', label: 'Suscripciones' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <span className="font-bold text-white">Superadmin</span>
            <span className="text-txt-secondary text-sm ml-2">Stockup Messages</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-txt-tertiary text-sm hidden sm:block">{adminEmail}</span>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-txt-tertiary hover:text-red-400 hover:bg-red-500/10 transition text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Salir
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-slate-900 border-b border-slate-800 px-6">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                tab === t.key
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-txt-tertiary hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-txt-secondary">
            <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : (
          <>
            {/* ── DASHBOARD ── */}
            {tab === 'dashboard' && stats && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Resumen del sistema</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { label: 'Total tiendas', value: stats.totalStores, color: 'from-violet-500 to-indigo-500' },
                    { label: 'Tiendas activas', value: stats.activeStores, color: 'from-emerald-500 to-green-500' },
                    { label: 'Tiendas bloqueadas', value: stats.blockedStores, color: 'from-red-500 to-rose-500' },
                    { label: 'Total usuarios', value: stats.totalUsers, color: 'from-blue-500 to-cyan-500' },
                    { label: 'Usuarios bloqueados', value: stats.blockedUsers, color: 'from-orange-500 to-amber-500' },
                  ].map(card => (
                    <div key={card.label} className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                      <div className={`text-3xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
                        {card.value}
                      </div>
                      <div className="text-txt-tertiary text-sm mt-1">{card.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TIENDAS ── */}
            {tab === 'stores' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Tiendas ({stores.length})</h2>
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          {['Tienda', 'Teléfono', 'Dueño', 'Usuarios', 'Conversaciones', 'Órdenes', 'Estado', 'Creada', 'Acción'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-txt-tertiary font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stores.map(store => (
                          <tr key={store.storeId} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                            <td className="px-4 py-3 font-medium text-white">{store.name}</td>
                            <td className="px-4 py-3 text-txt-tertiary font-mono text-xs">{store.phone}</td>
                            <td className="px-4 py-3 text-txt-disabled">{store.ownerName ?? '—'}</td>
                            <td className="px-4 py-3 text-txt-disabled text-center">{store._count.users}</td>
                            <td className="px-4 py-3 text-txt-disabled text-center">{store._count.conversations}</td>
                            <td className="px-4 py-3 text-txt-disabled text-center">{store._count.orders}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${store.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {store.isActive ? 'Activa' : 'Bloqueada'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-txt-tertiary text-xs whitespace-nowrap">{fmtDate(store.createdAt)}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleToggleStore(store.storeId)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                  store.isActive
                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                }`}
                              >
                                {store.isActive ? 'Bloquear' : 'Activar'}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {stores.length === 0 && (
                          <tr>
                            <td colSpan={9} className="px-4 py-10 text-center text-txt-secondary">No hay tiendas registradas</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── USUARIOS ── */}
            {tab === 'users' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Usuarios ({users.length})</h2>
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          {['Nombre', 'Email', 'Rol', 'Tienda', 'Estado', 'Registrado', 'Acciones'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-txt-tertiary font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(user => (
                          <tr key={user.userId} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                            <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                            <td className="px-4 py-3 text-txt-disabled text-xs">{user.email}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/20 text-violet-400">
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-txt-disabled text-xs">{user.store?.name ?? '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {user.isActive ? 'Activo' : 'Bloqueado'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-txt-tertiary text-xs whitespace-nowrap">{fmtDate(user.createdAt)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleUser(user.userId)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                                    user.isActive
                                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                      : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                  }`}
                                >
                                  {user.isActive ? 'Bloquear' : 'Activar'}
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(user.userId)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-700 text-txt-tertiary hover:bg-red-500/20 hover:text-red-400 transition"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-10 text-center text-txt-secondary">No hay usuarios registrados</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUSCRIPCIONES ── */}
            {tab === 'subscriptions' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Suscripciones</h2>

                {/* Precio global */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-semibold text-txt-tertiary uppercase tracking-wide">Precio del plan mensual</p>
                      <p className="text-txt-secondary text-xs mt-0.5">Se aplica a todos los nuevos pagos de la plataforma</p>
                    </div>
                    {subConfig?.updatedBy && (
                      <p className="text-txt-secondary text-xs">Editado por {subConfig.updatedBy}</p>
                    )}
                  </div>

                  {editingPrice ? (
                    <div className="flex items-center gap-3 mt-4">
                      <div className="flex items-center gap-2 bg-slate-900 rounded-xl border border-slate-600 px-4 py-2 flex-1 max-w-xs">
                        <span className="text-txt-tertiary text-sm font-medium">COP $</span>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          className="bg-transparent text-white text-xl font-bold w-full outline-none"
                          min="1000"
                          step="1000"
                        />
                      </div>
                      <button
                        onClick={handleSavePrice}
                        disabled={priceLoading}
                        className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition disabled:opacity-60"
                      >
                        {priceLoading ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => { setEditingPrice(false); setEditPrice(String(subConfig?.priceAmount ?? 24000)); }}
                        className="px-4 py-2.5 rounded-xl bg-slate-700 text-txt-disabled text-sm font-medium hover:bg-slate-600 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 mt-4">
                      <span className="text-4xl font-bold text-white">
                        ${Number(subConfig?.priceAmount ?? 24000).toLocaleString('es-CO')}
                      </span>
                      <span className="text-txt-tertiary text-sm">COP / mes</span>
                      <button
                        onClick={() => setEditingPrice(true)}
                        className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 text-txt-disabled text-sm font-medium hover:bg-slate-600 transition"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Editar precio
                      </button>
                    </div>
                  )}
                </div>

                {/* Tabla de suscripciones */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-700">
                    <h3 className="text-white font-semibold">Tiendas suscritas ({subs.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          {['Tienda', 'Teléfono', 'Estado', 'Inicio', 'Vence', 'Monto', 'Último pago'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-txt-tertiary font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {subs.map(sub => {
                          const lastPay = sub.payments[0];
                          return (
                            <tr key={sub.subscriptionId} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                              <td className="px-4 py-3 font-medium text-white">{sub.store.name}</td>
                              <td className="px-4 py-3 text-txt-tertiary font-mono text-xs">{sub.store.phone}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  sub.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                                  sub.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {sub.status === 'active' ? 'Activa' : sub.status === 'pending' ? 'Pendiente' : 'Vencida'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-txt-tertiary text-xs">
                                {sub.currentPeriodStart ? fmtDate(sub.currentPeriodStart) : '—'}
                              </td>
                              <td className="px-4 py-3 text-txt-disabled text-xs">
                                {sub.currentPeriodEnd ? fmtDate(sub.currentPeriodEnd) : '—'}
                              </td>
                              <td className="px-4 py-3 text-txt-disabled text-xs">
                                ${Number(sub.priceAmount).toLocaleString('es-CO')}
                              </td>
                              <td className="px-4 py-3">
                                {lastPay ? (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    lastPay.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                                    lastPay.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-red-500/20 text-red-400'
                                  }`}>
                                    {lastPay.status === 'approved' ? 'Aprobado' : lastPay.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                                  </span>
                                ) : <span className="text-txt-secondary text-xs">Sin pagos</span>}
                              </td>
                            </tr>
                          );
                        })}
                        {subs.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-10 text-center text-txt-secondary">No hay suscripciones registradas</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── AUDITORÍA ── */}
            {tab === 'audit' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Log de auditoría (últimas {audit.length} acciones)</h2>
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          {['Fecha', 'Acción', 'Tipo', 'Target', 'Detalles'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-txt-tertiary font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {audit.map(log => (
                          <tr key={log.logId} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                            <td className="px-4 py-3 text-txt-tertiary text-xs whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                            <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                            <td className="px-4 py-3 text-txt-tertiary text-xs">{log.targetType}</td>
                            <td className="px-4 py-3 text-txt-disabled font-mono text-xs">{log.targetId.slice(0, 8)}…</td>
                            <td className="px-4 py-3 text-txt-tertiary text-xs max-w-xs truncate">
                              {JSON.stringify(log.details)}
                            </td>
                          </tr>
                        ))}
                        {audit.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-10 text-center text-txt-secondary">Sin registros de auditoría</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal confirmar eliminación */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-semibold text-lg mb-2">Confirmar eliminación</h3>
            <p className="text-txt-tertiary text-sm mb-6">
              Esta acción es irreversible. El usuario y todos sus datos serán eliminados permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 text-txt-disabled hover:bg-slate-600 transition text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteUser(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition text-sm font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
