import { useEffect, useState } from 'react';
import { getUsers, deleteUser } from '../services/api';

interface User {
  userId: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  store?: { name: string; phone: string } | null;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este usuario?')) return;
    setDeletingId(id);
    setError('');
    try {
      await deleteUser(id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el usuario');
    } finally {
      setDeletingId(null);
    }
  };

  const roleLabel = (role: string) => {
    const map: Record<string, string> = { admin: 'Admin', superadmin: 'Super Admin', agent: 'Agente' };
    return map[role] || role;
  };

  const roleColor = (role: string) => {
    if (role === 'superadmin') return 'bg-purple-50 text-purple-600';
    if (role === 'admin') return 'bg-blue-50 text-blue-600';
    return 'bg-surface-overlay text-txt-secondary';
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-txt-primary">Usuarios</h1>
          <p className="text-txt-secondary mt-1">Las cuentas con acceso al panel de tu tienda</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20 text-txt-tertiary">
          <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
          {users.length === 0 ? (
            <div className="p-16 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <p className="text-txt-primary font-medium">No hay usuarios</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-txt-tertiary uppercase tracking-wider">Usuario</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-txt-tertiary uppercase tracking-wider">Tienda</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-txt-tertiary uppercase tracking-wider">Rol</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-txt-tertiary uppercase tracking-wider">Estado</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-txt-tertiary uppercase tracking-wider">Creado</th>
                  <th className="px-6 py-4"/>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.userId} className={`${i < users.length - 1 ? 'border-b border-slate-50' : ''} hover:bg-surface-elevated transition`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[#0A0A0F] text-sm font-bold"
                          style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}> 
                          {u.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-txt-primary text-sm">{u.name}</div>
                          <div className="text-txt-tertiary text-xs">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.store ? (
                        <div>
                          <div className="text-txt-primary text-sm font-medium">{u.store.name}</div>
                          <div className="text-txt-tertiary text-xs">{u.store.phone}</div>
                        </div>
                      ) : (
                        <span className="text-txt-disabled text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleColor(u.role)}`}>
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-semibold ${u.isActive ? 'text-green-600' : 'text-txt-tertiary'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-slate-300'}`}/>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-txt-tertiary text-sm">
                      {new Date(u.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(u.userId)}
                        disabled={deletingId === u.userId}
                        className="text-red-400 hover:text-red-600 text-sm font-medium disabled:opacity-50 transition"
                      >
                        {deletingId === u.userId ? '...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
