import { useEffect, useState } from 'react';
import api from '../services/api';

interface BlockedContact {
  blockedId: string;
  phone: string;
  label: string | null;
  createdAt: string;
}

const emptyForm = { phone: '', label: '' };

export default function Blocked() {
  const [contacts, setContacts] = useState<BlockedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/blocked');
      setContacts(res.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Auto-agregar + si el usuario empieza a escribir dígitos sin él
    if (val && !val.startsWith('+')) val = `+${val}`;
    setForm({ ...form, phone: val });
  };

  const handleBlock = async () => {
    if (!form.phone) return;

    // Validar que tenga código de país (mínimo 11 dígitos: código + número local)
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 11) {
      setError('Incluye el código de país completo. Ej: +573001234567 (Colombia)');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await api.post('/blocked', { phone: form.phone, label: form.label || undefined });
      setShowModal(false);
      setForm(emptyForm);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al bloquear número');
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (id: string) => {
    if (!window.confirm('¿Desbloquear este número?')) return;
    setRemovingId(id);
    try {
      await api.delete(`/blocked/${id}`);
      await load();
    } catch {} finally {
      setRemovingId(null);
    }
  };

  const labelColor = (label: string | null) => {
    if (!label) return 'bg-slate-100 text-slate-500';
    const l = label.toLowerCase();
    if (l.includes('empleado')) return 'bg-blue-50 text-blue-600';
    if (l.includes('distribuidor') || l.includes('proveedor')) return 'bg-purple-50 text-purple-600';
    return 'bg-orange-50 text-orange-500';
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contactos excluidos</h1>
          <p className="text-slate-500 mt-1">Números que el bot ignora — empleados, distribuidores, proveedores</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setError(''); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Agregar número
        </button>
      </div>

      {/* Info !stop */}
      <div className="mb-5 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" className="flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-blue-700 text-sm">
          <strong>Tip:</strong> También puedes silenciar el bot en cualquier conversación enviando el mensaje{' '}
          <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs">!stop</code>{' '}
          desde el número del cliente. La conversación quedará en modo humano permanentemente.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {contacts.length === 0 ? (
            <div className="p-16 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </div>
              <p className="text-slate-700 font-medium">No hay números excluidos</p>
              <p className="text-slate-400 text-sm">Agrega empleados, distribuidores o proveedores para que el bot los ignore</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Número</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Etiqueta</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Agregado</th>
                  <th className="px-6 py-4"/>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => (
                  <tr key={c.blockedId} className={`${i < contacts.length - 1 ? 'border-b border-slate-50' : ''} hover:bg-slate-50 transition`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.22 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                          </svg>
                        </div>
                        <span className="font-semibold text-slate-800 text-sm">{c.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.label ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${labelColor(c.label)}`}>
                          {c.label}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(c.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleUnblock(c.blockedId)}
                        disabled={removingId === c.blockedId}
                        className="text-red-400 hover:text-red-600 text-sm font-medium disabled:opacity-50 transition"
                      >
                        {removingId === c.blockedId ? '...' : 'Desbloquear'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">Excluir número</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Número de teléfono *
                </label>
                <input
                  value={form.phone}
                  onChange={handlePhoneChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="+573001234567"
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Incluye el código de país. Ej: <strong>+57</strong>3001234567 para Colombia
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Etiqueta <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <select
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="">Sin etiqueta</option>
                  <option value="Empleado">Empleado</option>
                  <option value="Distribuidor">Distribuidor</option>
                  <option value="Proveedor">Proveedor</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleBlock}
                disabled={saving || !form.phone}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
              >
                {saving ? 'Guardando...' : 'Excluir número'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
