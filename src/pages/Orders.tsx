import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getOrders } from '../services/api';
import api from '../services/api';

// ── Icons ─────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrderItem {
  itemId: string;
  quantity: number;
  unitPrice: string;
  description: string | null;
  product: { name: string } | null;
  service: { name: string } | null;
}

interface Order {
  orderId: string;
  type: string;
  status: string;
  total: string;
  notes: string | null;
  estimatedTime: number | null;
  deliveryAddress: string | null;
  createdAt: string;
  customer: { customerId: string; name: string | null; phone: string };
  orderItems: OrderItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; cls: string; next: string | null }> = {
  pending:   { label: 'Pendiente',    cls: 'bg-yellow-100 text-yellow-700',  next: 'confirmed' },
  confirmed: { label: 'Confirmado',   cls: 'bg-blue-100 text-blue-700',      next: 'preparing' },
  preparing: { label: 'Preparando',   cls: 'bg-indigo-100 text-indigo-700',  next: 'ready' },
  ready:     { label: 'Listo',        cls: 'bg-purple-100 text-purple-700',  next: 'delivered' },
  delivered: { label: 'Entregado',    cls: 'bg-green-100 text-green-700',    next: null },
  cancelled: { label: 'Cancelado',    cls: 'bg-red-100 text-red-700',        next: null },
};

const TYPE_CONFIG: Record<string, string> = {
  product: 'Producto',
  food:    'Comida',
  service: 'Servicio',
};

const fmt = (n: string | number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
    .format(Number(n));

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' };
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${c.cls}`}>{c.label}</span>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────
function OrderDetail({
  order, onClose, onStatusChange,
}: {
  order: Order;
  onClose: () => void;
  onStatusChange: (orderId: string, status: string) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);
  const cfg = STATUS_CONFIG[order.status];

  const advance = async () => {
    if (!cfg?.next) return;
    setUpdating(true);
    await onStatusChange(order.orderId, cfg.next);
    setUpdating(false);
  };

  const cancel = async () => {
    setUpdating(true);
    await onStatusChange(order.orderId, 'cancelled');
    setUpdating(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <p className="text-xs text-slate-400 font-mono">#{order.orderId.slice(0, 8).toUpperCase()}</p>
            <p className="font-bold text-slate-800">
              {order.customer.name ?? order.customer.phone}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition">
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Status + tipo */}
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={order.status} />
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              {TYPE_CONFIG[order.type] ?? order.type}
            </span>
            <span className="text-xs text-slate-400">{fmtDate(order.createdAt)}</span>
          </div>

          {/* Info rápida */}
          <div className="grid grid-cols-2 gap-3">
            {order.estimatedTime && (
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400 mb-0.5">Tiempo estimado</p>
                <p className="font-semibold text-slate-800">{order.estimatedTime} min</p>
              </div>
            )}
            {order.deliveryAddress && (
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400 mb-0.5">Dirección</p>
                <p className="font-semibold text-slate-800 text-sm">{order.deliveryAddress}</p>
              </div>
            )}
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">Teléfono</p>
              <p className="font-semibold text-slate-800 font-mono text-sm">{order.customer.phone}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400 mb-0.5">Total</p>
              <p className="font-bold text-slate-800">{fmt(order.total)}</p>
            </div>
          </div>

          {/* Ítems */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ítems del pedido</p>
            <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50">
              {order.orderItems.map((item) => {
                const name = item.product?.name ?? item.service?.name ?? item.description ?? '—';
                return (
                  <div key={item.itemId} className="px-4 py-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{name}</p>
                      <p className="text-xs text-slate-400">x{item.quantity} · {fmt(item.unitPrice)} c/u</p>
                    </div>
                    <p className="font-semibold text-slate-700">
                      {fmt(Number(item.unitPrice) * item.quantity)}
                    </p>
                  </div>
                );
              })}
              <div className="px-4 py-3 flex justify-between bg-slate-50">
                <p className="text-sm font-semibold text-slate-600">Total</p>
                <p className="font-bold text-slate-800">{fmt(order.total)}</p>
              </div>
            </div>
          </div>

          {/* Notas */}
          {order.notes && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-yellow-700 mb-1">Notas</p>
              <p className="text-sm text-yellow-800">{order.notes}</p>
            </div>
          )}

          {/* Acciones de estado */}
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <div className="flex gap-2 pt-1">
              {cfg?.next && (
                <button
                  onClick={advance}
                  disabled={updating}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
                >
                  {updating ? 'Actualizando...' : `Marcar como ${STATUS_CONFIG[cfg.next]?.label}`}
                </button>
              )}
              <button
                onClick={cancel}
                disabled={updating}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Orders() {
  const { storeId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getOrders(storeId)
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (orderId: string, status: string) => {
    await api.patch(`/orders/${orderId}/status`, { status });
    setOrders((prev) =>
      prev.map((o) => o.orderId === orderId ? { ...o, status } : o)
    );
    setSelected((prev) => prev?.orderId === orderId ? { ...prev, status } : prev);
  };

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      o.orderId.toLowerCase().includes(q) ||
      (o.customer.name ?? '').toLowerCase().includes(q) ||
      o.customer.phone.toLowerCase().includes(q) ||
      (o.deliveryAddress ?? '').toLowerCase().includes(q);
    const matchStatus = !filterStatus || o.status === filterStatus;
    const matchType   = !filterType   || o.type   === filterType;
    return matchSearch && matchStatus && matchType;
  });

  // Conteos rápidos por estado
  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Órdenes</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {loading ? '...' : `${orders.length} pedidos en total`}
              </p>
            </div>

            {/* Búsqueda */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cliente, ID, dirección..."
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-72"
              />
            </div>
          </div>

          {/* Filtros de estado como pills */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus('')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                !filterStatus ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
              style={!filterStatus ? { background: 'linear-gradient(135deg, #2563eb, #9333ea)' } : {}}
            >
              Todas ({orders.length})
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) =>
              counts[key] ? (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    filterStatus === key ? 'text-white' : `${cfg.cls} opacity-80 hover:opacity-100`
                  }`}
                  style={filterStatus === key ? { background: 'linear-gradient(135deg, #2563eb, #9333ea)' } : {}}
                >
                  {cfg.label} ({counts[key]})
                </button>
              ) : null
            )}

            {/* Filtro tipo */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="ml-auto px-3 py-1 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600"
            >
              <option value="">Todos los tipos</option>
              <option value="product">Producto</option>
              <option value="food">Comida</option>
              <option value="service">Servicio</option>
            </select>
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
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <p className="text-sm">{search || filterStatus || filterType ? 'Sin resultados' : 'Sin órdenes aún'}</p>
            {(search || filterStatus || filterType) && (
              <button
                onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); }}
                className="text-xs text-blue-600 hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>

        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

            {/* Tabla header */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span>Cliente</span>
              <span>Tipo</span>
              <span>Estado</span>
              <span>Total</span>
              <span>Fecha</span>
              <span>Detalle</span>
            </div>

            <div className="divide-y divide-slate-50">
              {filtered.map((order) => (
                <div
                  key={order.orderId}
                  className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] px-6 py-4 items-center gap-2 hover:bg-slate-50 transition"
                >
                  {/* Cliente */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
                    >
                      {(order.customer.name ?? order.customer.phone)[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">
                        {order.customer.name ?? order.customer.phone}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        #{order.orderId.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Tipo */}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium w-fit">
                    {TYPE_CONFIG[order.type] ?? order.type}
                  </span>

                  {/* Estado */}
                  <StatusBadge status={order.status} />

                  {/* Total */}
                  <p className="font-semibold text-slate-800 text-sm">{fmt(order.total)}</p>

                  {/* Fecha */}
                  <p className="text-xs text-slate-400">{fmtDate(order.createdAt)}</p>

                  {/* Botón detalle */}
                  <button
                    onClick={() => setSelected(order)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition whitespace-nowrap"
                  >
                    Ver detalle
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Mostrando <span className="font-semibold text-slate-600">{filtered.length}</span> de{' '}
                <span className="font-semibold text-slate-600">{orders.length}</span> órdenes
              </p>
              {(search || filterStatus || filterType) && (
                <button
                  onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <OrderDetail
          order={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
