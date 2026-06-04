import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getCustomers, updateCustomer } from '../services/api';

// ── Icons ─────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const CancelIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────
interface Customer {
  customerId:       string;
  storeId:          string;
  phone:            string;
  name:             string | null;
  cedula:           string | null;
  city:             string | null;
  totalOrders:      number;
  totalSpent:       number | string;
  firstOrderDate:   string | null;
  lastOrderDate:    string | null;
  acceptsMarketing: boolean;
  createdAt:        string;
}

interface EditState {
  name:             string;
  cedula:           string;
  city:             string;
  acceptsMarketing: boolean;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ customer }: { customer: Customer }) {
  const letter = customer.name?.[0]?.toUpperCase() ?? customer.phone[1];
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-[#0A0A0F] font-bold text-sm flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
    >
      {letter}
    </div>
  );
}

const Empty = () => <span className="text-txt-disabled italic text-xs">—</span>;

const fmt = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

const fmtMoney = (val: number | string) =>
  `$${Number(val).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-sm px-5 py-4 flex flex-col gap-1">
      <p className="text-xs text-txt-tertiary font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color ?? '#1e293b' }}>{value}</p>
      {sub && <p className="text-xs text-txt-tertiary">{sub}</p>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Customers() {
  const { storeId } = useAuth();
  const [customers,   setCustomers]  = useState<Customer[]>([]);
  const [loading,     setLoading]    = useState(true);
  const [search,      setSearch]     = useState('');
  const [filterCity,  setFilterCity] = useState('');
  const [filterMkt,   setFilterMkt]  = useState<'all' | 'yes' | 'no'>('all');
  const [editingId,   setEditingId]  = useState<string | null>(null);
  const [editState,   setEditState]  = useState<EditState>({ name: '', cedula: '', city: '', acceptsMarketing: true });
  const [saving,      setSaving]     = useState(false);
  const [saveError,   setSaveError]  = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    getCustomers(storeId)
      .then((res) => setCustomers(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [storeId]); // eslint-disable-line
  useEffect(() => { if (editingId) setTimeout(() => nameRef.current?.focus(), 50); }, [editingId]);

  const cities = Array.from(new Set(customers.map((c) => c.city).filter(Boolean) as string[])).sort();

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.phone.toLowerCase().includes(q) ||
      (c.name   ?? '').toLowerCase().includes(q) ||
      (c.cedula ?? '').toLowerCase().includes(q) ||
      (c.city   ?? '').toLowerCase().includes(q);
    const matchCity = !filterCity || c.city === filterCity;
    const matchMkt  = filterMkt === 'all' || (filterMkt === 'yes' ? c.acceptsMarketing : !c.acceptsMarketing);
    return matchSearch && matchCity && matchMkt;
  });

  const startEdit = (c: Customer) => {
    setSaveError('');
    setEditingId(c.customerId);
    setEditState({ name: c.name ?? '', cedula: c.cedula ?? '', city: c.city ?? '', acceptsMarketing: c.acceptsMarketing });
  };
  const cancelEdit = () => { setEditingId(null); setSaveError(''); };

  const saveEdit = async (customerId: string) => {
    setSaving(true); setSaveError('');
    try {
      await updateCustomer(customerId, {
        name:             editState.name.trim()   || undefined,
        cedula:           editState.cedula.trim() || undefined,
        city:             editState.city.trim()   || undefined,
        acceptsMarketing: editState.acceptsMarketing,
      });
      setCustomers((prev) =>
        prev.map((c) =>
          c.customerId === customerId
            ? { ...c, name: editState.name.trim() || null, cedula: editState.cedula.trim() || null,
                city: editState.city.trim() || null, acceptsMarketing: editState.acceptsMarketing }
            : c
        )
      );
      setEditingId(null);
    } catch {
      setSaveError('Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent, customerId: string) => {
    if (e.key === 'Enter')  saveEdit(customerId);
    if (e.key === 'Escape') cancelEdit();
  };

  // Stats
  const totalRevenue  = customers.reduce((s, c) => s + Number(c.totalSpent), 0);
  const withMarketing = customers.filter((c) => c.acceptsMarketing).length;
  const topCustomer   = [...customers].sort((a, b) => Number(b.totalSpent) - Number(a.totalSpent))[0];
  const avgSpent      = customers.length ? totalRevenue / customers.filter(c => Number(c.totalSpent) > 0).length : 0;

  return (
    <div className="min-h-screen bg-canvas">

      {/* Header */}
      <div className="bg-surface border-b border-border-subtle px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
            <div>
              <h1 className="text-xl font-bold text-txt-primary">Clientes</h1>
              <p className="text-sm text-txt-tertiary mt-0.5">
                {loading ? '...' : `${customers.length} registrados`}
              </p>
            </div>
          </div>

          {/* Stats */}
          {!loading && customers.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <StatCard label="Total clientes"    value={customers.length}             sub={`${customers.filter(c => c.name).length} identificados`} />
              <StatCard label="Ingresos totales"  value={fmtMoney(totalRevenue)}       sub={`Prom. ${fmtMoney(avgSpent || 0)} por cliente activo`} color="#059669" />
              <StatCard label="Acepta marketing"  value={withMarketing}                sub={`de ${customers.length} clientes`} color="#2563eb" />
              <StatCard
                label="Top cliente"
                value={topCustomer?.name ?? topCustomer?.phone ?? '—'}
                sub={topCustomer ? fmtMoney(topCustomer.totalSpent) : undefined}
                color="#9333ea"
              />
            </div>
          )}

          {/* Filtros */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary"><SearchIcon /></span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, teléfono, cédula o ciudad..."
                className="pl-9 pr-4 py-2 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30 w-80"
              />
            </div>
            {cities.length > 0 && (
              <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)}
                className="px-3 py-2 text-sm border border-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30 bg-surface text-txt-primary">
                <option value="">Todas las ciudades</option>
                {cities.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            )}
            <select value={filterMkt} onChange={(e) => setFilterMkt(e.target.value as any)}
              className="px-3 py-2 text-sm border border-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30 bg-surface text-txt-primary">
              <option value="all">Todos</option>
              <option value="yes">Acepta marketing</option>
              <option value="no">No acepta marketing</option>
            </select>
            {(search || filterCity || filterMkt !== 'all') && (
              <button onClick={() => { setSearch(''); setFilterCity(''); setFilterMkt('all'); }}
                className="text-xs text-blue-600 hover:underline">
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <svg className="animate-spin text-blue-600" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>

        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-txt-tertiary">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            <p className="text-sm">{search || filterCity ? 'Sin resultados' : 'Sin clientes aún'}</p>
          </div>

        ) : (
          <div className="bg-surface rounded-2xl shadow-sm border border-border-subtle overflow-hidden">

            {/* Header tabla */}
            <div className="grid grid-cols-[2fr_1.2fr_1.2fr_1fr_1fr_1fr_auto] px-6 py-3 bg-surface-elevated border-b border-border-subtle text-xs font-semibold text-txt-secondary uppercase tracking-wide">
              <span>Cliente</span>
              <span>Teléfono</span>
              <span>Pedidos / Gasto</span>
              <span>Cédula</span>
              <span>Ciudad</span>
              <span>Marketing</span>
              <span>Acciones</span>
            </div>

            <div className="divide-y divide-border-subtle">
              {filtered.map((c) => {
                const isEditing = editingId === c.customerId;
                const spent     = Number(c.totalSpent);
                return (
                  <div
                    key={c.customerId}
                    className={`grid grid-cols-[2fr_1.2fr_1.2fr_1fr_1fr_1fr_auto] px-6 py-4 items-center gap-3 transition ${
                      isEditing ? 'bg-blue-50/40' : 'hover:bg-surface-elevated'
                    }`}
                  >
                    {/* Cliente */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar customer={c} />
                      {isEditing ? (
                        <input
                          ref={nameRef}
                          value={editState.name}
                          onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                          placeholder="Nombre del cliente"
                          onKeyDown={(e) => handleKey(e, c.customerId)}
                          className="flex-1 px-3 py-1.5 text-sm border border-blue-300 bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-lime/30"
                        />
                      ) : (
                        <div className="min-w-0">
                          <p className="font-medium text-txt-primary truncate text-sm">
                            {c.name ?? <span className="text-txt-tertiary font-normal italic">Sin nombre</span>}
                          </p>
                          {c.lastOrderDate && (
                            <p className="text-xs text-txt-tertiary">Último pedido: {fmt(c.lastOrderDate)}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Teléfono */}
                    <p className="text-sm text-txt-secondary font-mono">{c.phone}</p>

                    {/* Pedidos / Gasto */}
                    <div>
                      <p className="text-sm font-semibold text-txt-primary">
                        {spent > 0 ? fmtMoney(spent) : <Empty />}
                      </p>
                      <p className="text-xs text-txt-tertiary">
                        {c.totalOrders > 0 ? `${c.totalOrders} pedido${c.totalOrders !== 1 ? 's' : ''}` : 'Sin pedidos'}
                      </p>
                    </div>

                    {/* Cédula */}
                    {isEditing ? (
                      <input
                        value={editState.cedula}
                        onChange={(e) => setEditState((s) => ({ ...s, cedula: e.target.value }))}
                        placeholder="N° cédula"
                        onKeyDown={(e) => handleKey(e, c.customerId)}
                        className="px-3 py-1.5 text-sm border border-blue-300 bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-lime/30 font-mono"
                      />
                    ) : (
                      <p className="text-sm text-txt-secondary font-mono">{c.cedula ?? <Empty />}</p>
                    )}

                    {/* Ciudad */}
                    {isEditing ? (
                      <input
                        value={editState.city}
                        onChange={(e) => setEditState((s) => ({ ...s, city: e.target.value }))}
                        placeholder="Ciudad"
                        onKeyDown={(e) => handleKey(e, c.customerId)}
                        className="px-3 py-1.5 text-sm border border-blue-300 bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-lime/30"
                      />
                    ) : (
                      <p className="text-sm text-txt-secondary">{c.city ?? <Empty />}</p>
                    )}

                    {/* Marketing */}
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={() => setEditState((s) => ({ ...s, acceptsMarketing: !s.acceptsMarketing }))}
                        className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                          editState.acceptsMarketing ? 'bg-blue-500' : 'bg-border-default'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-surface rounded-full shadow transition-transform ${
                          editState.acceptsMarketing ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.acceptsMarketing ? 'bg-green-100 text-green-700' : 'bg-surface-overlay text-txt-secondary'
                      }`}>
                        {c.acceptsMarketing ? 'Activo' : 'No'}
                      </span>
                    )}

                    {/* Acciones */}
                    <div className="flex items-center gap-1 justify-end">
                      {isEditing ? (
                        <>
                          {saveError && <span className="text-xs text-red-500 mr-1">{saveError}</span>}
                          <button
                            onClick={() => saveEdit(c.customerId)}
                            disabled={saving}
                            title="Guardar"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#0A0A0F] disabled:opacity-50 transition"
                            style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
                          >
                            {saving
                              ? <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                              : <SaveIcon />}
                          </button>
                          <button onClick={cancelEdit} title="Cancelar"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-txt-secondary bg-surface-overlay hover:bg-border-default transition">
                            <CancelIcon />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => startEdit(c)} title="Editar"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-txt-secondary hover:text-blue-600 hover:bg-blue-50 transition">
                          <EditIcon />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-3 bg-surface-elevated border-t border-border-subtle flex items-center justify-between">
              <p className="text-xs text-txt-tertiary">
                Mostrando <span className="font-semibold text-txt-secondary">{filtered.length}</span> de{' '}
                <span className="font-semibold text-txt-secondary">{customers.length}</span> clientes
              </p>
              {(search || filterCity || filterMkt !== 'all') && (
                <button onClick={() => { setSearch(''); setFilterCity(''); setFilterMkt('all'); }}
                  className="text-xs text-blue-600 hover:underline">
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

