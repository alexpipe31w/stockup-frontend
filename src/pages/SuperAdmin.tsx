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
} from '../services/api';

type Tab = 'dashboard' | 'stores' | 'users' | 'audit';

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
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[action] ?? 'bg-slate-100 text-slate-600'}`}>
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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'stores', label: 'Tiendas' },
    { key: 'users', label: 'Usuarios' },
    { key: 'audit', label: 'Auditoría' },
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
            <span className="text-slate-500 text-sm ml-2">Stockup Messages</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm hidden sm:block">{adminEmail}</span>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition text-sm"
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
                  : 'border-transparent text-slate-400 hover:text-slate-200'
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
          <div className="flex items-center justify-center py-20 text-slate-500">
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
                      <div className="text-slate-400 text-sm mt-1">{card.label}</div>
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
                            <th key={h} className="px-4 py-3 text-left text-slate-400 font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stores.map(store => (
                          <tr key={store.storeId} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                            <td className="px-4 py-3 font-medium text-white">{store.name}</td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-xs">{store.phone}</td>
                            <td className="px-4 py-3 text-slate-300">{store.ownerName ?? '—'}</td>
                            <td className="px-4 py-3 text-slate-300 text-center">{store._count.users}</td>
                            <td className="px-4 py-3 text-slate-300 text-center">{store._count.conversations}</td>
                            <td className="px-4 py-3 text-slate-300 text-center">{store._count.orders}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${store.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {store.isActive ? 'Activa' : 'Bloqueada'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(store.createdAt)}</td>
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
                            <td colSpan={9} className="px-4 py-10 text-center text-slate-500">No hay tiendas registradas</td>
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
                            <th key={h} className="px-4 py-3 text-left text-slate-400 font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(user => (
                          <tr key={user.userId} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                            <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                            <td className="px-4 py-3 text-slate-300 text-xs">{user.email}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/20 text-violet-400">
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-300 text-xs">{user.store?.name ?? '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                {user.isActive ? 'Activo' : 'Bloqueado'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(user.createdAt)}</td>
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
                                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-700 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-10 text-center text-slate-500">No hay usuarios registrados</td>
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
                            <th key={h} className="px-4 py-3 text-left text-slate-400 font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {audit.map(log => (
                          <tr key={log.logId} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                            <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                            <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                            <td className="px-4 py-3 text-slate-400 text-xs">{log.targetType}</td>
                            <td className="px-4 py-3 text-slate-300 font-mono text-xs">{log.targetId.slice(0, 8)}…</td>
                            <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">
                              {JSON.stringify(log.details)}
                            </td>
                          </tr>
                        ))}
                        {audit.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-10 text-center text-slate-500">Sin registros de auditoría</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-semibold text-lg mb-2">Confirmar eliminación</h3>
            <p className="text-slate-400 text-sm mb-6">
              Esta acción es irreversible. El usuario y todos sus datos serán eliminados permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition text-sm font-medium"
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
