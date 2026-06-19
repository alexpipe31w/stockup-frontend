import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicStoreProducts, createPublicOrder } from '../services/api';

interface ProductVariant {
  variantId: string;
  name: string;
  salePrice: string | number | null;
  stock: number;
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
}
interface StoreProducts {
  name: string;
  paymentMethods: string[];
  products: PublicProduct[];
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function PublicStore() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<StoreProducts | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pay, setPay] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getPublicStoreProducts(slug)
      .then(r => setData(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const setQty = (id: string, q: number) =>
    setCart(c => {
      const n = { ...c };
      if (q <= 0) delete n[id];
      else n[id] = q;
      return n;
    });

  const items = useMemo(
    () => Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity })),
    [cart],
  );
  const total = useMemo(
    () =>
      (data?.products ?? [])
        .filter(p => cart[p.productId])
        .reduce((s, p) => s + Number(p.salePrice) * cart[p.productId], 0),
    [data, cart],
  );
  const totalItems = useMemo(() => Object.values(cart).reduce((s, q) => s + q, 0), [cart]);

  const submit = async () => {
    if (!slug) return;
    setError('');
    if (!name.trim() || name.trim().length < 2) {
      setError('Ingresa tu nombre.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 7) {
      setError('Ingresa un número de teléfono válido.');
      return;
    }
    if (items.length === 0) {
      setError('Agrega al menos un producto.');
      return;
    }
    setSubmitting(true);
    try {
      await createPublicOrder(slug, {
        customerName: name.trim(),
        customerPhone: phone.trim(),
        items,
        paymentMethod: pay || undefined,
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo registrar el pedido. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

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
          <p className="text-5xl mb-4">🔍</p>
          <h1 className="text-xl font-bold text-white mb-2">Negocio no encontrado</h1>
          <p className="text-sm text-gray-400">Verifica que el link sea correcto.</p>
        </div>
      </div>
    );

  if (done)
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center px-4">
        <div className="bg-[#111117] rounded-2xl p-8 border border-white/10 max-w-md w-full text-center">
          <p className="text-5xl mb-4">🎉</p>
          <h1 className="text-xl font-bold mb-2">¡Pedido registrado!</h1>
          <p className="text-sm text-gray-400">
            El negocio te contactará por WhatsApp para coordinar la entrega y el pago.
          </p>
        </div>
      </div>
    );

  const ic =
    'w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#0A0A0F] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#D4FF00]/30';

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Header */}
      <div className="bg-[#111117] border-b border-white/10 px-4 py-5 text-center">
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#D4FF00] uppercase mb-2">Powered by Stockup</p>
        <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
        <p className="text-sm text-gray-400 mt-1">Elige tus productos y deja tu pedido en línea</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-28">
        {/* Productos */}
        {data.products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-sm text-gray-500">No hay productos disponibles por ahora</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.products.map(p => {
              const qty = cart[p.productId] ?? 0;
              return (
                <div key={p.productId} className="bg-[#111117] rounded-2xl p-4 border border-white/10 flex flex-col">
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-36 w-full object-cover rounded-xl mb-3 bg-[#0A0A0F]"
                    />
                  )}
                  <p className="font-semibold leading-tight">{p.name}</p>
                  {p.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm font-bold text-[#D4FF00]">{fmtCOP(Number(p.salePrice))}</span>
                    <span className="text-xs text-gray-500">{p.stock} disp.</span>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-3">
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => setQty(p.productId, 1)}
                        className="w-full py-2 rounded-xl text-sm font-semibold bg-[#D4FF00]/10 border border-[#D4FF00]/40 text-[#D4FF00] hover:bg-[#D4FF00]/20 transition"
                      >
                        Agregar
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 w-full justify-center">
                        <button
                          type="button"
                          onClick={() => setQty(p.productId, qty - 1)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl text-lg border border-white/10 bg-[#0A0A0F] text-gray-300 hover:border-white/20 transition"
                        >
                          −
                        </button>
                        <span className="font-semibold tabular-nums w-6 text-center">{qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(p.productId, Math.min(qty + 1, p.stock))}
                          disabled={qty >= p.stock}
                          className="w-9 h-9 flex items-center justify-center rounded-xl text-lg border border-white/10 bg-[#0A0A0F] text-gray-300 hover:border-white/20 disabled:opacity-30 transition"
                        >
                          +
                        </button>
                      </div>
                    )}
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

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
              {error}
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
            disabled={submitting || items.length === 0}
            className="w-full py-3 rounded-xl bg-[#D4FF00] text-[#0A0A0F] font-bold text-sm hover:brightness-95 disabled:opacity-40 transition flex items-center justify-center gap-2"
          >
            {submitting && <span className="w-4 h-4 rounded-full border-2 border-[#0A0A0F] border-t-transparent animate-spin" />}
            {submitting
              ? 'Enviando...'
              : `Hacer pedido${totalItems ? ` · ${totalItems} ítem${totalItems > 1 ? 's' : ''} · ${fmtCOP(total)}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
