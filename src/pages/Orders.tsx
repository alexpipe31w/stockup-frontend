import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getOrders, updateOrderStatus, createManualOrder, getCustomers, getProducts, createCustomer } from '../services/api';

// ── Icons ─────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── Plus Icon ─────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
  </svg>
);

// ── Manual Order Modal ────────────────────────────────────────────────────────
interface ProductOption { productId: string; name: string; salePrice: number; stock: number | null; }
interface ManualItem { productId: string; description: string; quantity: number; unitPrice: number; }
interface CustomerOption { customerId: string; name: string | null; phone: string; }

function ManualOrderModal({ storeId, onClose, onCreated }: {
  storeId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [customers, setCustomers]       = useState<CustomerOption[]>([]);
  const [customerSearch, setCSearch]    = useState('');
  const [selectedCustomer, setSelCust]  = useState<CustomerOption | null>(null);
  const [customerMode, setCustMode]     = useState<'search' | 'new'>('search');
  const [newPhone, setNewPhone]         = useState('');
  const [newName, setNewName]           = useState('');
  const [items, setItems]               = useState<ManualItem[]>([{ productId: '', description: '', quantity: 1, unitPrice: 0 }]);
  const [payMethod, setPayMethod]       = useState('CASH');
  const [discountPct, setDiscountPct]   = useState(0);
  const [notes, setNotes]               = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');
  const [products, setProducts]         = useState<ProductOption[]>([]);

  useEffect(() => {
    getCustomers(storeId).then((r) => setCustomers(r.data));
    getProducts().then((r) => {
      const active = (r.data ?? []).filter((p: any) => p.isActive !== false);
      setProducts(active);
    });
  }, [storeId]);

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return !q || c.phone.includes(q) || (c.name ?? '').toLowerCase().includes(q);
  }).slice(0, 8);

  const subtotal      = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountAmt   = Math.round(subtotal * (discountPct / 100) * 100) / 100;
  const total         = subtotal - discountAmt;

  const addItem    = () => setItems((p) => [...p, { productId: '', description: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof ManualItem, val: string | number) =>
    setItems((p) => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const selectProduct = (idx: number, productId: string) => {
    if (!productId || productId === 'custom') {
      setItems(p => p.map((it, i) => i === idx
        ? { ...it, productId: productId === 'custom' ? 'custom' : '', description: '', unitPrice: 0 }
        : it));
    } else {
      const prod = products.find(p => p.productId === productId);
      if (prod) {
        setItems(p => p.map((it, i) => i === idx
          ? { ...it, productId: prod.productId, description: prod.name, unitPrice: prod.salePrice }
          : it));
      }
    }
  };

  const submit = async () => {
    if (customerMode === 'search' && !selectedCustomer) return setError('Selecciona un cliente.');
    if (customerMode === 'new' && !newPhone.trim()) return setError('El teléfono del cliente es obligatorio.');
    if (items.some((i) => !i.productId && !i.description.trim())) return setError('Selecciona un producto o escribe una descripción para cada ítem.');
    if (items.some((i) => i.unitPrice <= 0)) return setError('El precio de cada ítem debe ser mayor a 0.');
    setError(''); setSubmitting(true);
    try {
      let customerId = selectedCustomer?.customerId ?? '';
      if (customerMode === 'new') {
        const r = await createCustomer({ phone: newPhone.trim(), name: newName.trim() || undefined });
        customerId = r.data.customerId;
      }
      await createManualOrder({
        customerId,
        items:               items.map((i) => ({
          productId:   (i.productId && i.productId !== 'custom') ? i.productId : undefined,
          description: i.description.trim() || undefined,
          quantity:    i.quantity,
          unitPrice:   i.unitPrice,
        })),
        notes:               notes.trim() || undefined,
        discountPercent:     discountPct || undefined,
        manualPaymentMethod: payMethod,
        idempotencyKey:      `manual-${storeId}-${Date.now()}`,
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al crear la orden.');
    } finally {
      setSubmitting(false);
    }
  };

  const PAY_METHODS = [
    { value: 'CASH',     label: 'Efectivo' },
    { value: 'TRANSFER', label: 'Transferencia' },
    { value: 'CARD',     label: 'Tarjeta' },
    { value: 'OTHER',    label: 'Otro' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between sticky top-0 bg-surface z-10">
          <div>
            <h2 className="font-bold text-txt-primary">Nueva venta manual</h2>
            <p className="text-xs text-txt-tertiary">Registra una venta en efectivo o transferencia</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-txt-tertiary hover:bg-surface-overlay">
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Cliente */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">Cliente</label>
              <div className="flex gap-1 bg-surface-overlay rounded-lg p-0.5">
                <button onClick={() => { setCustMode('search'); setNewPhone(''); setNewName(''); }}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition ${customerMode === 'search' ? 'bg-surface text-txt-primary shadow-sm' : 'text-txt-tertiary hover:text-txt-secondary'}`}>
                  Existente
                </button>
                <button onClick={() => { setCustMode('new'); setSelCust(null); setCSearch(''); }}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition ${customerMode === 'new' ? 'bg-surface text-txt-primary shadow-sm' : 'text-txt-tertiary hover:text-txt-secondary'}`}>
                  Nuevo
                </button>
              </div>
            </div>

            {customerMode === 'search' ? (
              selectedCustomer ? (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-medium text-txt-primary text-sm">{selectedCustomer.name ?? 'Sin nombre'}</p>
                    <p className="text-xs text-txt-secondary font-mono">{selectedCustomer.phone}</p>
                  </div>
                  <button onClick={() => { setSelCust(null); setCSearch(''); }} className="text-xs text-blue-600 hover:underline">Cambiar</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={customerSearch}
                    onChange={(e) => setCSearch(e.target.value)}
                    placeholder="Buscar por nombre o teléfono..."
                    className="w-full px-4 py-2.5 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30"
                  />
                  {customerSearch && filteredCustomers.length > 0 && (
                    <div className="absolute w-full bg-surface border border-border-default rounded-xl shadow-lg mt-1 overflow-hidden z-10">
                      {filteredCustomers.map((c) => (
                        <button key={c.customerId} onClick={() => { setSelCust(c); setCSearch(''); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-surface-elevated transition">
                          <p className="text-sm font-medium text-txt-primary">{c.name ?? 'Sin nombre'}</p>
                          <p className="text-xs text-txt-tertiary font-mono">{c.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {customerSearch && filteredCustomers.length === 0 && (
                    <p className="mt-2 text-xs text-txt-tertiary">Sin coincidencias. Cambia a "Nuevo" para crear el cliente.</p>
                  )}
                </div>
              )
            ) : (
              <div className="space-y-2">
                <input
                  value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Teléfono (obligatorio)"
                  className="w-full px-4 py-2.5 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30"
                />
                <input
                  value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre (opcional)"
                  className="w-full px-4 py-2.5 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30"
                />
              </div>
            )}
          </div>

          {/* Ítems */}
          <div>
            <label className="block text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-2">Productos / Servicios</label>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="space-y-1.5 p-3 bg-surface-elevated border border-border-default rounded-xl">
                  <div className="grid grid-cols-[1fr_32px] gap-2 items-start">
                    <select
                      value={item.productId}
                      onChange={(e) => selectProduct(i, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border-default bg-surface text-txt-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-lime/30"
                    >
                      <option value="">Selecciona un producto...</option>
                      {products.map(p => (
                        <option key={p.productId} value={p.productId}>
                          {p.name}
                          {p.stock !== null ? ` (stock: ${p.stock})` : ''}
                        </option>
                      ))}
                      <option value="custom">✏️ Ítem personalizado</option>
                    </select>
                    <button
                      onClick={() => items.length > 1 && removeItem(i)}
                      disabled={items.length === 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 disabled:opacity-30 transition mt-0.5"
                    >
                      <TrashIcon />
                    </button>
                  </div>

                  {(!item.productId || item.productId === 'custom') && (
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(i, 'description', e.target.value)}
                      placeholder="Descripción del ítem..."
                      className="w-full px-3 py-2 text-sm border border-border-default bg-surface text-txt-primary placeholder:text-txt-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-lime/30"
                    />
                  )}

                  {item.productId && item.productId !== 'custom' && item.description && (
                    <p className="text-xs text-txt-secondary px-1">{item.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-txt-tertiary mb-0.5">Cantidad</label>
                      <input
                        type="number" min={1} value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 text-sm border border-border-default bg-surface text-txt-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-lime/30 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-txt-tertiary mb-0.5">Precio unitario</label>
                      <input
                        type="number" min={0} value={item.unitPrice || ''}
                        onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm border border-border-default bg-surface text-txt-primary placeholder:text-txt-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-lime/30"
                        placeholder="Precio"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addItem}
              className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition">
              <PlusIcon /> Agregar ítem
            </button>
          </div>

          {/* Método de pago + descuento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-2">Método de pago</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PAY_METHODS.map((m) => (
                  <button key={m.value} type="button"
                    onClick={() => setPayMethod(m.value)}
                    className={`py-2 rounded-lg text-xs font-medium transition ${
                      payMethod === m.value ? 'text-[#0A0A0F]' : 'bg-surface-overlay text-txt-secondary hover:bg-border-default'
                    }`}
                    style={payMethod === m.value ? { background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' } : {}}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-2">Descuento (%)</label>
              <input
                type="number" min={0} max={100} value={discountPct || ''}
                onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="w-full px-3 py-2 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-lime/30"
                placeholder="0%"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-2">Notas (opcional)</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Notas adicionales del pedido..."
              className="w-full px-3 py-2 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-lg focus:outline-none focus:ring-2 focus:ring-lime/30 resize-none"
            />
          </div>

          {/* Resumen */}
          <div className="bg-surface-elevated rounded-xl px-4 py-3 space-y-1">
            <div className="flex justify-between text-sm text-txt-secondary">
              <span>Subtotal</span><span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(subtotal)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento ({discountPct}%)</span>
                <span>-{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-txt-primary border-t border-border-default pt-1 mt-1">
              <span>Total</span>
              <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(total)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          {/* Botones */}
          <div className="flex gap-2 pt-1">
            <button onClick={submit} disabled={submitting || (customerMode === 'search' ? !selectedCustomer : !newPhone.trim())}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#0A0A0F] disabled:opacity-50 transition"
              style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}> 
              {submitting ? 'Registrando...' : 'Registrar venta'}
            </button>
            <button onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-overlay text-txt-secondary hover:bg-border-default transition">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  orderId:             string;
  type:                string;
  status:              string;
  total:               string;
  subtotal:            string;
  discountAmount:      string;
  discountPercent:     string | null;
  notes:               string | null;
  estimatedTime:       number | null;
  deliveryAddress:     string | null;
  isManual:            boolean;
  manualPaymentMethod: string | null;
  createdAt:           string;
  customer:    { customerId: string; name: string | null; phone: string };
  orderItems:  OrderItem[];
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
  const c = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-surface-overlay text-txt-secondary' };
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
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between sticky top-0 bg-surface z-10">
          <div>
            <p className="text-xs text-txt-tertiary font-mono">#{order.orderId.slice(0, 8).toUpperCase()}</p>
            <p className="font-bold text-txt-primary">
              {order.customer.name ?? order.customer.phone}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-txt-tertiary hover:bg-surface-overlay transition">
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Status + tipo */}
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={order.status} />
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface-overlay text-txt-secondary font-medium">
              {TYPE_CONFIG[order.type] ?? order.type}
            </span>
            {order.isManual && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                Venta manual · {
                  { CASH: 'Efectivo', TRANSFER: 'Transferencia', CARD: 'Tarjeta', OTHER: 'Otro' }
                  [order.manualPaymentMethod ?? ''] ?? order.manualPaymentMethod
                }
              </span>
            )}
            <span className="text-xs text-txt-tertiary">{fmtDate(order.createdAt)}</span>
          </div>

          {/* Info rápida */}
          <div className="grid grid-cols-2 gap-3">
            {order.estimatedTime && (
              <div className="bg-surface-elevated rounded-xl px-4 py-3">
                <p className="text-xs text-txt-tertiary mb-0.5">Tiempo estimado</p>
                <p className="font-semibold text-txt-primary">{order.estimatedTime} min</p>
              </div>
            )}
            {order.deliveryAddress && (
              <div className="bg-surface-elevated rounded-xl px-4 py-3">
                <p className="text-xs text-txt-tertiary mb-0.5">Dirección</p>
                <p className="font-semibold text-txt-primary text-sm">{order.deliveryAddress}</p>
              </div>
            )}
            <div className="bg-surface-elevated rounded-xl px-4 py-3">
              <p className="text-xs text-txt-tertiary mb-0.5">Teléfono</p>
              <p className="font-semibold text-txt-primary font-mono text-sm">{order.customer.phone}</p>
            </div>
            <div className="bg-surface-elevated rounded-xl px-4 py-3">
              <p className="text-xs text-txt-tertiary mb-0.5">Total</p>
              <p className="font-bold text-txt-primary">{fmt(order.total)}</p>
            </div>
          </div>

          {/* Ítems */}
          <div>
            <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-2">Ítems del pedido</p>
            <div className="border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle">
              {order.orderItems.map((item) => {
                const name = item.product?.name ?? item.service?.name ?? item.description ?? '—';
                return (
                  <div key={item.itemId} className="px-4 py-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-txt-primary">{name}</p>
                      <p className="text-xs text-txt-tertiary">x{item.quantity} · {fmt(item.unitPrice)} c/u</p>
                    </div>
                    <p className="font-semibold text-txt-primary">
                      {fmt(Number(item.unitPrice) * item.quantity)}
                    </p>
                  </div>
                );
              })}
              {Number(order.discountAmount) > 0 && (
                <>
                  <div className="px-4 py-2 flex justify-between bg-surface-elevated text-sm text-txt-secondary">
                    <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
                  </div>
                  <div className="px-4 py-2 flex justify-between bg-surface-elevated text-sm text-green-600">
                    <span>Descuento ({order.discountPercent}%)</span>
                    <span>-{fmt(order.discountAmount)}</span>
                  </div>
                </>
              )}
              <div className="px-4 py-3 flex justify-between bg-surface-elevated">
                <p className="text-sm font-semibold text-txt-secondary">Total</p>
                <p className="font-bold text-txt-primary">{fmt(order.total)}</p>
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
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#0A0A0F] disabled:opacity-50 transition"
                  style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
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
  const [showManual, setShowManual] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getOrders(storeId)
      .then((res) => setOrders((res.data ?? []).filter((o: Order) => o.type !== 'service')))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (orderId: string, status: string) => {
    await updateOrderStatus(orderId, status);
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
    <div className="min-h-screen bg-canvas">

      {/* Header */}
      <div className="bg-surface border-b border-border-subtle px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div>
              <h1 className="text-xl font-bold text-txt-primary">Órdenes</h1>
              <p className="text-sm text-txt-tertiary mt-0.5">
                {loading ? '...' : `${orders.length} pedidos en total`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowManual(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[#0A0A0F] transition"
                style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
              >
                <PlusIcon /> Nueva venta manual
              </button>

              {/* Búsqueda */}
              <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary">
                <SearchIcon />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cliente, ID, dirección..."
                className="pl-9 pr-4 py-2 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30 transition w-72"
              />
            </div>
            </div>
          </div>

          {/* Filtros de estado como pills */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus('')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                !filterStatus ? 'text-white' : 'bg-surface-overlay text-txt-secondary hover:bg-border-default'
              }`}
              style={!filterStatus ? { background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' } : {}}
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
                  style={filterStatus === key ? { background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' } : {}}
                >
                  {cfg.label} ({counts[key]})
                </button>
              ) : null
            )}

            {/* Filtro tipo */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="ml-auto px-3 py-1 text-xs border border-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30 bg-surface text-txt-secondary"
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
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-txt-tertiary">
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
          <div className="bg-surface rounded-2xl shadow-sm border border-border-subtle overflow-hidden">

            {/* Tabla header */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] px-6 py-3 bg-surface-elevated border-b border-border-subtle text-xs font-semibold text-txt-secondary uppercase tracking-wide">
              <span>Cliente</span>
              <span>Tipo</span>
              <span>Estado</span>
              <span>Total</span>
              <span>Fecha</span>
              <span>Detalle</span>
            </div>

            <div className="divide-y divide-border-subtle">
              {filtered.map((order) => (
                <div
                  key={order.orderId}
                  className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] px-6 py-4 items-center gap-2 hover:bg-surface-elevated transition"
                >
                  {/* Cliente */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[#0A0A0F] font-bold text-sm flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
                    >
                      {(order.customer.name ?? order.customer.phone)[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-txt-primary text-sm truncate">
                        {order.customer.name ?? order.customer.phone}
                      </p>
                      <p className="text-xs text-txt-tertiary font-mono">
                        #{order.orderId.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Tipo */}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-overlay text-txt-secondary font-medium w-fit">
                    {TYPE_CONFIG[order.type] ?? order.type}
                  </span>

                  {/* Estado */}
                  <StatusBadge status={order.status} />

                  {/* Total */}
                  <p className="font-semibold text-txt-primary text-sm">{fmt(order.total)}</p>

                  {/* Fecha */}
                  <p className="text-xs text-txt-tertiary">{fmtDate(order.createdAt)}</p>

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
            <div className="px-6 py-3 bg-surface-elevated border-t border-border-subtle flex items-center justify-between">
              <p className="text-xs text-txt-tertiary">
                Mostrando <span className="font-semibold text-txt-secondary">{filtered.length}</span> de{' '}
                <span className="font-semibold text-txt-secondary">{orders.length}</span> órdenes
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

      {/* Manual order modal */}
      {showManual && (
        <ManualOrderModal
          storeId={storeId}
          onClose={() => setShowManual(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}

