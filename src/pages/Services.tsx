import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getServices, createService, updateService, deleteService } from '../services/api';

interface Service {
  serviceId: string;
  name: string;
  description: string;
  price: number | null;
  isActive: boolean;
}

const emptyForm = { name: '', description: '', price: '' };

export default function Services() {
  const { storeId } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await getServices(storeId);
      setServices(res.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description,
      price: s.price !== null ? String(s.price) : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
        const payload = {
          name: form.name,
          description: form.description || undefined,
          price: form.price ? Number(form.price) : undefined,
        };
      if (editing) {
        await updateService(editing.serviceId, payload);
      } else {
        await createService(payload);
      }
      setShowModal(false);
      await load();
    } catch {} finally {
      setSaving(false);
    }
  };
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const handleDelete = async () => {
      if (!confirmDeleteId) return;
      setDeletingId(confirmDeleteId);
      try {
        await deleteService(confirmDeleteId);
        await load();
      } catch {} finally {
        setDeletingId(null);
        setConfirmDeleteId(null);
      }
    };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Servicios</h1>
          <p className="text-slate-500 mt-1">Gestiona los servicios que ofrece tu negocio</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition"
          style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo servicio
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
              <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <p className="text-slate-700 font-medium">No hay servicios aún</p>
          <p className="text-slate-400 text-sm">Crea tu primer servicio para que la IA lo ofrezca a tus clientes</p>
          <button
            onClick={openCreate}
            className="mt-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
          >
            Crear servicio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.serviceId} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{s.name}</h3>
                  <p className="text-slate-400 text-sm mt-1 line-clamp-2">{s.description || 'Sin descripción'}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ml-2 ${s.isActive ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                  {s.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div>
                {s.price !== null && s.price !== undefined ? (
                  <div className="text-2xl font-bold text-slate-800">
                    ${Number(s.price).toLocaleString('es-CO')}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-orange-500">Precio variable</span>
                    <span className="px-2 py-0.5 bg-orange-50 text-orange-400 text-xs rounded-full">cotización</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-50">
                <button
                  onClick={() => openEdit(s)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => setConfirmDeleteId(s.serviceId)}
                  disabled={deletingId === s.serviceId}
                  className="flex-1 py-2 rounded-lg border border-red-100 text-red-400 text-sm font-medium hover:bg-red-50 transition disabled:opacity-50"
                >
                  {deletingId === s.serviceId ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">
                {editing ? 'Editar servicio' : 'Nuevo servicio'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ej: Corte de cabello"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  placeholder="Describe el servicio..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Precio <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Dejar vacío si el precio varía"
                  min="0"
                />
                {!form.price && (
                  <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                    <span>💬</span>
                    Sin precio fijo, la IA informará que varía y transferirá a un asesor para cotizar
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
              >
                {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
            {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 mb-2">¿Eliminar servicio?</h3>
            <p className="text-sm text-slate-500 mb-5">
              Esta acción desactivará el servicio permanentemente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={!!deletingId}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50">
                {deletingId ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
