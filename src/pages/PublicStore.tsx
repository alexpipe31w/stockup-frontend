import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicStoreProducts, createPublicOrder } from '../services/api';

interface ProductVariant {
  variantId: string;
  name: string;
  salePrice: string | number | null;
  stock: number;
}
interface MenuOption {
  optionId: string;
  name: string;
  priceDelta: string | number;
}
interface MenuGroup {
  groupId: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: MenuOption[];
}
interface PublicProduct {
  productId: string;
  name: string;
  description: string | null;
  salePrice: string | number;
  stock: number;
  imageUrl: string | null;
  images: string[];
  hasVariants: boolean;
  variants: ProductVariant[];
  // Solo con el módulo de restaurante
  kind?: 'stock' | 'prepared';
  prepMinutes?: number | null;
  categoryId?: string | null;
  optionGroups?: MenuGroup[];
}
interface PublicCategory {
  categoryId: string;
  name: string;
  description: string | null;
}
interface StoreProducts {
  name: string;
  paymentMethods: string[];
  products: PublicProduct[];
  kitchenEnabled?: boolean;
  menuTitle?: string | null;
  categories?: PublicCategory[];
}

/** Una línea del carrito. El precio NO se guarda: se calcula siempre con el menú cargado. */
interface CartLine {
  productId: string;
  optionIds: string[]; // ordenados
  note: string;
  quantity: number;
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

// Dos líneas iguales (mismo producto, opciones y nota) se suman; distintas quedan separadas.
const lineKey = (productId: string, optionIds: string[], note: string) =>
  `${productId}|${[...optionIds].sort().join(',')}|${note.trim()}`;

/** UUID v4 para la idempotencia del pedido (randomUUID no existe fuera de https). */
function uuidV4(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const maxQty = (p: PublicProduct) => (p.kind === 'prepared' ? 999 : p.stock);

/** Precio unitario de una línea con el menú actual; null si algo de la línea ya no existe. */
function unitPrice(p: PublicProduct | undefined, optionIds: string[]): number | null {
  if (!p) return null;
  const opts = new Map((p.optionGroups ?? []).flatMap(g => g.options.map(o => [o.optionId, o] as const)));
  let total = Number(p.salePrice);
  for (const id of optionIds) {
    const o = opts.get(id);
    if (!o) return null;
    total += Number(o.priceDelta);
  }
  return total;
}

function groupHint(g: MenuGroup): string {
  if (g.minSelect >= 1 && g.minSelect === g.maxSelect) return g.minSelect === 1 ? 'Elige 1' : `Elige ${g.minSelect}`;
  if (g.minSelect >= 1) return `Elige de ${g.minSelect} a ${g.maxSelect}`;
  return g.maxSelect === 1 ? 'Opcional' : `Hasta ${g.maxSelect}`;
}

export default function PublicStore() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<StoreProducts | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [picking, setPicking] = useState<PublicProduct | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pay, setPay] = useState('');
  const [error, setError] = useState('');
  const [faults, setFaults] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Misma clave en los reintentos del MISMO carrito; un carrito distinto es otro pedido.
  const idemKey = useRef(uuidV4());
  useEffect(() => {
    idemKey.current = uuidV4();
  }, [cart]);

  const loadProducts = (s: string) =>
    getPublicStoreProducts(s).then(r => {
      setData(r.data);
      return r.data as StoreProducts;
    });

  useEffect(() => {
    if (!slug) return;
    loadProducts(slug)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const byId = useMemo(() => new Map((data?.products ?? []).map(p => [p.productId, p])), [data]);

  const addLine = (productId: string, optionIds: string[], note: string, quantity = 1) =>
    setCart(c => {
      const key = lineKey(productId, optionIds, note);
      const prev = c[key];
      return { ...c, [key]: { productId, optionIds: [...optionIds].sort(), note: note.trim(), quantity: (prev?.quantity ?? 0) + quantity } };
    });

  const setLineQty = (key: string, q: number) =>
    setCart(c => {
      const n = { ...c };
      if (q <= 0) delete n[key];
      else n[key] = { ...n[key], quantity: q };
      return n;
    });

  const lines = useMemo(() => Object.entries(cart), [cart]);
  const qtyOf = (productId: string) => lines.filter(([, l]) => l.productId === productId).reduce((s, [, l]) => s + l.quantity, 0);
  const total = useMemo(
    () => lines.reduce((s, [, l]) => s + (unitPrice(byId.get(l.productId), l.optionIds) ?? 0) * l.quantity, 0),
    [lines, byId],
  );
  const totalItems = useMemo(() => lines.reduce((s, [, l]) => s + l.quantity, 0), [lines]);

  /** Tras un "menú cambiado": quita las líneas cuyo producto u opciones ya no se ofrecen. */
  const pruneCart = (fresh: StoreProducts) => {
    const freshById = new Map(fresh.products.map(p => [p.productId, p]));
    setCart(c => Object.fromEntries(Object.entries(c).filter(([, l]) => unitPrice(freshById.get(l.productId), l.optionIds) !== null)));
  };

  const submit = async () => {
    if (!slug) return;
    setError('');
    setFaults([]);
    if (!name.trim() || name.trim().length < 2) {
      setError('Ingresa tu nombre.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 7) {
      setError('Ingresa un número de teléfono válido.');
      return;
    }
    if (lines.length === 0) {
      setError('Agrega al menos un producto.');
      return;
    }
    setSubmitting(true);
    try {
      await createPublicOrder(slug, {
        customerName: name.trim(),
        customerPhone: phone.trim(),
        items: lines.map(([, l]) => ({
          productId: l.productId,
          quantity: l.quantity,
          ...(data?.kitchenEnabled && { optionIds: l.optionIds, ...(l.note && { note: l.note }) }),
        })),
        paymentMethod: pay || undefined,
        expectedTotal: total,
        idempotencyKey: idemKey.current,
      });
      setDone(true);
    } catch (err: any) {
      const body = err?.response?.data;
      if (err?.response?.status === 409 && body?.code === 'MENU_CHANGED') {
        setError('Algo de tu pedido cambió (se agotó o cambió de precio). Revisa tu carrito.');
        try {
          pruneCart(await loadProducts(slug));
        } catch (reloadErr) {
          console.error('[PublicStore] recargar menú', reloadErr);
        }
      } else if (body?.code === 'MENU_INVALID' && Array.isArray(body.faults)) {
        setFaults(body.faults);
      } else {
        const m = body?.message;
        setError((Array.isArray(m) ? m.join('. ') : m) || 'No se pudo registrar el pedido. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Secciones del menú en su orden; lo que no tiene sección va al final, en "Otros".
  const sections = useMemo(() => {
    const products = data?.products ?? [];
    if (!data?.categories?.length) return [{ id: 'all', title: null as string | null, description: null as string | null, products }];
    const out = data.categories
      .map(c => ({ id: c.categoryId, title: c.name as string | null, description: c.description, products: products.filter(p => p.categoryId === c.categoryId) }))
      .filter(s => s.products.length > 0);
    const known = new Set(data.categories.map(c => c.categoryId));
    const rest = products.filter(p => !p.categoryId || !known.has(p.categoryId));
    if (rest.length) out.push({ id: 'otros', title: 'Otros', description: null, products: rest });
    return out;
  }, [data]);

  if (loading)
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#D4FF00] border-t-transparent animate-spin" />
      </div>
    );

  if (notFound || !data)
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-2">Negocio no encontrado</h1>
          <p className="text-sm text-gray-400">Verifica que el link sea correcto.</p>
        </div>
      </div>
    );

  if (done)
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center px-4">
        <div className="bg-[#111117] rounded-2xl p-8 border border-white/10 max-w-md w-full text-center">
          <h1 className="text-xl font-bold mb-2">¡Pedido registrado!</h1>
          <p className="text-sm text-gray-400">
            El negocio te contactará por WhatsApp para coordinar la entrega y el pago.
          </p>
        </div>
      </div>
    );

  const ic =
    'w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#0A0A0F] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#D4FF00]/30';

  const productCard = (p: PublicProduct) => {
    const hasOptions = (p.optionGroups?.length ?? 0) > 0;
    const simpleKey = lineKey(p.productId, [], '');
    const qty = hasOptions ? qtyOf(p.productId) : cart[simpleKey]?.quantity ?? 0;
    return (
      <div key={p.productId} className="bg-[#111117] rounded-2xl p-4 border border-white/10 flex flex-col">
        {(p.imageUrl || p.images?.[0]) && (
          <img
            src={p.imageUrl || p.images[0]}
            alt={p.name}
            className="h-36 w-full object-cover rounded-xl mb-3 bg-[#0A0A0F]"
          />
        )}
        <p className="font-semibold leading-tight">{p.name}</p>
        {p.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-sm font-bold text-[#D4FF00]">{fmtCOP(Number(p.salePrice))}</span>
          {p.kind === 'prepared'
            ? p.prepMinutes ? <span className="text-xs text-gray-500">~{p.prepMinutes} min</span> : null
            : <span className="text-xs text-gray-500">{p.stock} disp.</span>}
        </div>

        <div className="mt-auto flex items-center justify-between pt-3">
          {hasOptions ? (
            <button
              type="button"
              onClick={() => setPicking(p)}
              className="w-full py-2 rounded-xl text-sm font-semibold bg-[#D4FF00]/10 border border-[#D4FF00]/40 text-[#D4FF00] hover:bg-[#D4FF00]/20 transition"
            >
              {qty ? `Agregar otro (${qty} en tu pedido)` : 'Elegir y agregar'}
            </button>
          ) : qty === 0 ? (
            <button
              type="button"
              onClick={() => addLine(p.productId, [], '')}
              className="w-full py-2 rounded-xl text-sm font-semibold bg-[#D4FF00]/10 border border-[#D4FF00]/40 text-[#D4FF00] hover:bg-[#D4FF00]/20 transition"
            >
              Agregar
            </button>
          ) : (
            <div className="flex items-center gap-3 w-full justify-center">
              <button
                type="button"
                onClick={() => setLineQty(simpleKey, qty - 1)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-lg border border-white/10 bg-[#0A0A0F] text-gray-300 hover:border-white/20 transition"
              >
                −
              </button>
              <span className="font-semibold tabular-nums w-6 text-center">{qty}</span>
              <button
                type="button"
                onClick={() => setLineQty(simpleKey, Math.min(qty + 1, maxQty(p)))}
                disabled={qty >= maxQty(p)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-lg border border-white/10 bg-[#0A0A0F] text-gray-300 hover:border-white/20 disabled:opacity-30 transition"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Líneas con opciones o nota: se listan aparte para poder ver y cambiar cada una.
  const detailedLines = lines.filter(([, l]) => l.optionIds.length > 0 || l.note);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Header */}
      <div className="bg-[#111117] border-b border-white/10 px-4 py-5 text-center">
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#D4FF00] uppercase mb-2">Powered by Stockup</p>
        <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
        <p className="text-sm text-gray-400 mt-1">{data.menuTitle || 'Elige tus productos y deja tu pedido en línea'}</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-28">
        {/* Productos */}
        {data.products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-500">No hay productos disponibles por ahora</p>
          </div>
        ) : (
          sections.map(s => (
            <section key={s.id} className="space-y-3">
              {s.title && (
                <div>
                  <h2 className="text-lg font-bold">{s.title}</h2>
                  {s.description && <p className="text-xs text-gray-500">{s.description}</p>}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{s.products.map(productCard)}</div>
            </section>
          ))
        )}

        {detailedLines.length > 0 && (
          <div className="bg-[#111117] rounded-2xl p-5 border border-white/10 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tu pedido</p>
            {detailedLines.map(([key, l]) => {
              const p = byId.get(l.productId);
              const unit = unitPrice(p, l.optionIds);
              const optNames = (p?.optionGroups ?? []).flatMap(g => g.options).filter(o => l.optionIds.includes(o.optionId)).map(o => o.name);
              return (
                <div key={key} className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{l.quantity}× {p?.name ?? 'Producto'}</p>
                    {optNames.length > 0 && <p className="text-xs text-gray-400">{optNames.join(' · ')}</p>}
                    {l.note && <p className="text-xs text-gray-500 italic">“{l.note}”</p>}
                  </div>
                  <span className="text-sm tabular-nums text-gray-300">{unit !== null ? fmtCOP(unit * l.quantity) : '—'}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label="Quitar uno" onClick={() => setLineQty(key, l.quantity - 1)}
                      className="w-7 h-7 rounded-lg border border-white/10 text-gray-300">−</button>
                    <button type="button" aria-label="Agregar uno" onClick={() => setLineQty(key, Math.min(l.quantity + 1, 999))}
                      className="w-7 h-7 rounded-lg border border-white/10 text-gray-300">+</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Datos del cliente */}
        <div className="bg-[#111117] rounded-2xl p-5 border border-white/10 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tus datos</p>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Tu nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Carlos Pérez" className={ic} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Tu número de WhatsApp *</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ej: 300 123 4567" className={ic} />
          </div>

          {data.paymentMethods.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Método de pago (opcional)</label>
              <select value={pay} onChange={e => setPay(e.target.value)} className={ic}>
                <option value="">Sin preferencia</option>
                {data.paymentMethods.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(error || faults.length > 0) && (
            <div role="alert" className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 space-y-1">
              {error && <p>{error}</p>}
              {faults.map(f => <p key={f}>• {f}</p>)}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-600">
          Tu pedido quedará pendiente · El negocio te contactará para confirmar
        </p>
      </div>

      {/* Barra fija de pedido */}
      <div className="fixed bottom-0 inset-x-0 bg-[#111117] border-t border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            onClick={submit}
            disabled={submitting || lines.length === 0}
            className="w-full py-3 rounded-xl bg-[#D4FF00] text-[#0A0A0F] font-bold text-sm hover:brightness-95 disabled:opacity-40 transition flex items-center justify-center gap-2"
          >
            {submitting && <span className="w-4 h-4 rounded-full border-2 border-[#0A0A0F] border-t-transparent animate-spin" />}
            {submitting
              ? 'Enviando...'
              : `Hacer pedido${totalItems ? ` · ${totalItems} ítem${totalItems > 1 ? 's' : ''} · ${fmtCOP(total)}` : ''}`}
          </button>
        </div>
      </div>

      {picking && (
        <OptionPicker
          product={picking}
          onClose={() => setPicking(null)}
          onAdd={(optionIds, note, quantity) => {
            addLine(picking.productId, optionIds, note, quantity);
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}

// ── Selector de opciones de un producto ──────────────────────────────────────

function OptionPicker({ product, onClose, onAdd }: {
  product: PublicProduct;
  onClose: () => void;
  onAdd: (optionIds: string[], note: string, quantity: number) => void;
}) {
  const groups = product.optionGroups ?? [];
  const [chosen, setChosen] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState(1);

  const toggle = (g: MenuGroup, optionId: string) =>
    setChosen(c => {
      const cur = c[g.groupId] ?? [];
      if (g.maxSelect === 1) return { ...c, [g.groupId]: cur[0] === optionId && g.minSelect === 0 ? [] : [optionId] };
      if (cur.includes(optionId)) return { ...c, [g.groupId]: cur.filter(x => x !== optionId) };
      if (cur.length >= g.maxSelect) return c;
      return { ...c, [g.groupId]: [...cur, optionId] };
    });

  const optionIds = groups.flatMap(g => chosen[g.groupId] ?? []);
  const missing = groups.filter(g => (chosen[g.groupId]?.length ?? 0) < g.minSelect);
  const unit = unitPrice(product, optionIds) ?? Number(product.salePrice);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="bg-[#111117] border border-white/10 w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold leading-tight">{product.name}</h2>
            <p className="text-sm text-[#D4FF00] font-semibold">{fmtCOP(Number(product.salePrice))}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        {groups.map(g => {
          const sel = chosen[g.groupId] ?? [];
          const full = g.maxSelect > 1 && sel.length >= g.maxSelect;
          return (
            <fieldset key={g.groupId} className="space-y-2">
              <legend className="flex items-center justify-between w-full text-sm font-semibold">
                <span>{g.name}</span>
                <span className={`text-xs font-normal ${sel.length < g.minSelect ? 'text-[#D4FF00]' : 'text-gray-500'}`}>{groupHint(g)}</span>
              </legend>
              {g.options.map(o => {
                const on = sel.includes(o.optionId);
                const delta = Number(o.priceDelta);
                return (
                  <label key={o.optionId}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition cursor-pointer ${on ? 'border-[#D4FF00]/60 bg-[#D4FF00]/10' : 'border-white/10'} ${!on && full ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    <input
                      type={g.maxSelect === 1 ? 'radio' : 'checkbox'}
                      name={g.groupId}
                      checked={on}
                      disabled={!on && full}
                      onChange={() => toggle(g, o.optionId)}
                      onClick={() => {
                        // Un radio marcado no dispara onChange: así se puede desmarcar uno opcional.
                        if (g.maxSelect === 1 && on && g.minSelect === 0) toggle(g, o.optionId);
                      }}
                    />
                    <span className="flex-1 text-sm">{o.name}</span>
                    {delta > 0 && <span className="text-xs text-gray-400">+{fmtCOP(delta)}</span>}
                  </label>
                );
              })}
            </fieldset>
          );
        })}

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nota para la cocina (opcional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 300))} rows={2} maxLength={300}
            placeholder="Ej: sin cebolla"
            className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#0A0A0F] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#D4FF00]/30 resize-none" />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Menos" onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-xl border border-white/10 text-gray-300">−</button>
            <span className="w-6 text-center font-semibold tabular-nums">{quantity}</span>
            <button type="button" aria-label="Más" onClick={() => setQuantity(q => Math.min(maxQty(product), q + 1))}
              className="w-9 h-9 rounded-xl border border-white/10 text-gray-300">+</button>
          </div>
          <button
            type="button"
            disabled={missing.length > 0}
            onClick={() => onAdd(optionIds, note, quantity)}
            className="flex-1 py-3 rounded-xl bg-[#D4FF00] text-[#0A0A0F] font-bold text-sm disabled:opacity-40"
          >
            {missing.length > 0 ? `Falta elegir ${missing[0].name.toLowerCase()}` : `Agregar · ${fmtCOP(unit * quantity)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
