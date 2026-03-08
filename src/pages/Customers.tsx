import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getCustomers, updateCustomer } from '../services/api';

// ── SVG Icons ────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const EditIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const SaveIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const CancelIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.22 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);
const CityIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────
interface Customer {
  customerId: string;
  storeId: string;
  phone: string;
  name: string | null;
  city: string | null;
  createdAt: string;
}

interface EditState {
  name: string;
  city: string;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ customer }: { customer: Customer }) {
  const letter = customer.name?.[0]?.toUpperCase() ?? customer.phone[1];
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
    >
      {letter}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Customers() {
  const { storeId } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: '', city: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    getCustomers(storeId)
      .then((res) => setCustomers(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Foco en el input de nombre al abrir edición
  useEffect(() => {
    if (editingId) setTimeout(() => nameRef.current?.focus(), 50);
  }, [editingId]);

  // Ciudades únicas para el filtro
  const cities = Array.from(
    new Set(customers.map((c) => c.city).filter(Boolean) as string[])
  ).sort();

  // Filtrado combinado: búsqueda por nombre/teléfono + ciudad
  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.phone.toLowerCase().includes(q) ||
      (c.name ?? '').toLowerCase().includes(q) ||
      (c.city ?? '').toLowerCase().includes(q);
    const matchCity = !filterCity || c.city === filterCity;
    return matchSearch && matchCity;
  });

  const startEdit = (c: Customer) => {
    setSaveError('');
    setEditingId(c.customerId);
    setEditState({ name: c.name ?? '', city: c.city ?? '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSaveError('');
  };

  const saveEdit = async (customerId: string) => {
    setSaving(true);
    setSaveError('');
    try {
      await updateCustomer(customerId, {
        name: editState.name.trim() || undefined,
        city: editState.city.trim() || undefined,
      });
      setCustomers((prev) =>
        prev.map((c) =>
          c.customerId === customerId
            ? { ...c, name: editState.name.trim() || null, city: editState.city.trim() || null }
            : c
        )
      );
      setEditingId(null);
    } catch {
      setSaveError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (date: string) =>
    new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Clientes</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {loading ? '...' : `${customers.length} registrados`}
            </p>
          </div>

          {/* Búsqueda + filtro ciudad */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, teléfono o ciudad..."
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-72"
              />
            </div>

            {cities.length > 0 && (
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white text-slate-700"
              >
                <option value="">Todas las ciudades</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-6 py-6">

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <svg className="animate-spin text-blue-600" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>

        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <p className="text-sm">
              {search || filterCity ? 'Sin resultados para esa búsqueda' : 'Sin clientes aún'}
            </p>
          </div>

        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

            {/* Tabla header */}
            <div className="grid grid-cols-[2fr_1.5fr_1.2fr_1.2fr_auto] px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span className="flex items-center gap-1.5"><UserIcon /> Cliente</span>
              <span className="flex items-center gap-1.5"><PhoneIcon /> Teléfono</span>
              <span className="flex items-center gap-1.5"><CityIcon /> Ciudad</span>
              <span className="flex items-center gap-1.5"><CalendarIcon /> Registrado</span>
              <span>Acciones</span>
            </div>

            {/* Filas */}
            <div className="divide-y divide-slate-50">
              {filtered.map((c) => {
                const isEditing = editingId === c.customerId;
                return (
                  <div
                    key={c.customerId}
                    className={`grid grid-cols-[2fr_1.5fr_1.2fr_1.2fr_auto] px-6 py-4 items-center gap-2 transition ${
                      isEditing ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Nombre */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar customer={c} />
                      {isEditing ? (
                        <input
                          ref={nameRef}
                          value={editState.name}
                          onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                          placeholder="Nombre del cliente"
                          className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(c.customerId);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                      ) : (
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">
                            {c.name ?? <span className="text-slate-400 font-normal italic">Sin nombre</span>}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Teléfono */}
                    <p className="text-sm text-slate-600 font-mono">{c.phone}</p>

                    {/* Ciudad */}
                    {isEditing ? (
                      <input
                        value={editState.city}
                        onChange={(e) => setEditState((s) => ({ ...s, city: e.target.value }))}
                        placeholder="Ciudad"
                        className="px-3 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(c.customerId);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                    ) : (
                      <p className="text-sm text-slate-600">
                        {c.city ?? <span className="text-slate-300 italic">—</span>}
                      </p>
                    )}

                    {/* Fecha */}
                    <p className="text-sm text-slate-400">{fmt(c.createdAt)}</p>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 justify-end">
                      {isEditing ? (
                        <>
                          {saveError && (
                            <span className="text-xs text-red-500 mr-2">{saveError}</span>
                          )}
                          <button
                            onClick={() => saveEdit(c.customerId)}
                            disabled={saving}
                            title="Guardar"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white disabled:opacity-50 transition"
                            style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
                          >
                            {saving ? (
                              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <path d="M21 12a9 9 0 11-6.219-8.56"/>
                              </svg>
                            ) : (
                              <SaveIcon />
                            )}
                          </button>
                          <button
                            onClick={cancelEdit}
                            title="Cancelar"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 bg-slate-100 hover:bg-slate-200 transition"
                          >
                            <CancelIcon />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEdit(c)}
                          title="Editar"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                          <EditIcon />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer con conteo */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Mostrando <span className="font-semibold text-slate-600">{filtered.length}</span> de{' '}
                <span className="font-semibold text-slate-600">{customers.length}</span> clientes
              </p>
              {(search || filterCity) && (
                <button
                  onClick={() => { setSearch(''); setFilterCity(''); }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
