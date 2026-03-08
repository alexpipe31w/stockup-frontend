import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getProducts } from '../services/api';
import api from '../services/api';

// ── Icons ─────────────────────────────────────────────────────────────────────
const SearchIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>);
const PlusIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>);
const EditIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);
const TrashIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>);
const CloseIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);
const ImageIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>);
const TruckIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>);
const SaveIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>);

// ── Types ─────────────────────────────────────────────────────────────────────
interface Variant {
  variantId: string;
  name:      string;
  sku:       string | null;
  costPrice: string;
  salePrice: string;
  stock:     number;
  isActive:  boolean;
}
interface VariantForm { name: string; sku: string; costPrice: string; salePrice: string; stock: string; }
const EMPTY_VARIANT: VariantForm = { name: '', sku: '', costPrice: '', salePrice: '', stock: '0' };

interface Product {
  productId:   string;
  sku:         string | null;
  name:        string;
  costPrice:   string;
  salePrice:   string;
  stock:       number;
  description: string | null;
  imageUrl:    string | null;
  hasShipping: boolean;
  isActive:    boolean;
  createdAt:   string;
  variants:    Variant[];
}
interface FormState {
  sku: string; name: string; costPrice: string; salePrice: string;
  stock: string; description: string; imageUrl: string; hasShipping: boolean;
}
const EMPTY_FORM: FormState = {
  sku: '', name: '', costPrice: '', salePrice: '',
  stock: '0', description: '', imageUrl: '', hasShipping: false,
};

const fmt = (n: string | number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n));

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete }: { product: Product; onEdit: (p: Product) => void; onDelete: (p: Product) => void; }) {
  const hasVariants = product.variants?.length > 0;
  const minPrice = hasVariants ? Math.min(...product.variants.map(v => Number(v.salePrice))) : Number(product.salePrice);
  const maxPrice = hasVariants ? Math.max(...product.variants.map(v => Number(v.salePrice))) : Number(product.salePrice);
  const totalStock = hasVariants ? product.variants.reduce((s, v) => s + v.stock, 0) : product.stock;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition">
      <div className="h-44 bg-slate-50 flex items-center justify-center overflow-hidden relative">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <span className="text-slate-300"><ImageIcon /></span>
        )}
        {hasVariants && (
          <span className="absolute top-2 right-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full font-medium">
            {product.variants.length} variantes
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-2">
        <div>
          <p className="font-semibold text-slate-800 leading-tight">{product.name}</p>
          {product.sku && <p className="text-xs text-slate-400 font-mono">SKU: {product.sku}</p>}
        </div>
        {product.description && <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>}

        <div className="flex items-center gap-3 mt-auto pt-2 border-t border-slate-50">
          <div>
            <p className="text-xs text-slate-400">Venta</p>
            <p className="font-bold text-slate-800 text-sm">
              {hasVariants && minPrice !== maxPrice ? `${fmt(minPrice)} – ${fmt(maxPrice)}` : fmt(minPrice)}
            </p>
          </div>
          {!hasVariants && (
            <div>
              <p className="text-xs text-slate-400">Costo</p>
              <p className="text-sm text-slate-500">{fmt(product.costPrice)}</p>
            </div>
          )}
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-400">Stock</p>
            <p className={`font-semibold text-sm ${totalStock === 0 ? 'text-red-500' : totalStock < 5 ? 'text-orange-500' : 'text-green-600'}`}>
              {totalStock}
            </p>
          </div>
        </div>

        {hasVariants && (
          <div className="flex flex-wrap gap-1">
            {product.variants.slice(0, 3).map(v => (
              <span key={v.variantId} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{v.name}</span>
            ))}
            {product.variants.length > 3 && (
              <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">+{product.variants.length - 3}</span>
            )}
          </div>
        )}

        {product.hasShipping && (
          <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg w-fit">
            <TruckIcon /> Envío disponible
          </div>
        )}

        <div className="flex gap-2 mt-1">
          <button onClick={() => onEdit(product)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
            <EditIcon /> Editar
          </button>
          <button onClick={() => onDelete(product)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-red-400 bg-red-50 hover:bg-red-100 transition">
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Variant Row (editable inline) ─────────────────────────────────────────────
function VariantRow({ variant, onUpdate, onRemove }: {
  variant: Variant;
  onUpdate: (variantId: string, data: Partial<VariantForm>) => Promise<void>;
  onRemove: (variantId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<VariantForm>({
    name: variant.name, sku: variant.sku ?? '',
    costPrice: String(variant.costPrice), salePrice: String(variant.salePrice),
    stock: String(variant.stock),
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onUpdate(variant.variantId, form);
    setSaving(false);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-sm">
        <p className="font-medium text-slate-700 truncate">{variant.name}</p>
        <p className="text-slate-500 font-mono text-xs">{variant.sku ?? '—'}</p>
        <div>
          <p className="font-semibold text-slate-800">{fmt(variant.salePrice)}</p>
          <p className="text-xs text-slate-400">{fmt(variant.costPrice)}</p>
        </div>
        <p className={`font-semibold text-xs ${variant.stock === 0 ? 'text-red-500' : variant.stock < 5 ? 'text-orange-500' : 'text-green-600'}`}>
          {variant.stock} uds
        </p>
        <div className="flex gap-1">
          <button onClick={() => setEditing(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition">
            <EditIcon />
          </button>
          <button onClick={() => onRemove(variant.variantId)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition">
            <TrashIcon />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-2 px-3 py-2 bg-blue-50/40 rounded-xl">
      {(['name','sku','salePrice','stock'] as const).map((k) => (
        <input key={k} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
          placeholder={k} type={['salePrice','stock'].includes(k) ? 'number' : 'text'}
          className="w-full px-2 py-1 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
      ))}
      <div className="flex gap-1">
        <button onClick={save} disabled={saving}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
          {saving ? <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> : <SaveIcon />}
        </button>
        <button onClick={() => setEditing(false)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 transition">
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

// ── Product Modal ─────────────────────────────────────────────────────────────
function ProductModal({ storeId, product, onClose, onSaved }: {
  storeId: string; product: Product | null; onClose: () => void; onSaved: (p: Product) => void;
}) {
  const isEdit = !!product;
  const [form, setForm] = useState<FormState>(product ? {
    sku: product.sku ?? '', name: product.name,
    costPrice: String(product.costPrice), salePrice: String(product.salePrice),
    stock: String(product.stock), description: product.description ?? '',
    imageUrl: product.imageUrl ?? '', hasShipping: product.hasShipping,
  } : EMPTY_FORM);
  const [variants, setVariants] = useState<Variant[]>(product?.variants ?? []);
  const [newVariant, setNewVariant] = useState<VariantForm>(EMPTY_VARIANT);
  const [addingVariant, setAddingVariant] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'info' | 'variants'>('info');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 50); }, []);
  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('El nombre es requerido');
    if (!form.salePrice || !form.costPrice) return setError('Los precios son requeridos');
    setSaving(true); setError('');
    try {
      const payload = {
        storeId, sku: form.sku.trim() || undefined, name: form.name.trim(),
        costPrice: Number(form.costPrice), salePrice: Number(form.salePrice),
        stock: Number(form.stock) || 0, description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined, hasShipping: form.hasShipping,
      };
      const res = isEdit
        ? await api.patch(`/products/${product!.productId}`, payload)
        : await api.post('/products', payload);
      onSaved({ ...res.data, variants });
      onClose();
    } catch { setError('Error al guardar. Verifica los datos.'); }
    finally { setSaving(false); }
  };

  const handleAddVariant = async () => {
    if (!isEdit || !newVariant.name.trim() || !newVariant.salePrice || !newVariant.costPrice) return;
    setAddingVariant(true);
    try {
      const res = await api.post(`/products/${product!.productId}/variants`, {
        name: newVariant.name.trim(), sku: newVariant.sku.trim() || undefined,
        costPrice: Number(newVariant.costPrice), salePrice: Number(newVariant.salePrice),
        stock: Number(newVariant.stock) || 0,
      });
      setVariants(v => [...v, res.data]);
      setNewVariant(EMPTY_VARIANT);
    } catch {} finally { setAddingVariant(false); }
  };

  const handleUpdateVariant = async (variantId: string, data: any) => {
    const res = await api.patch(`/products/variants/${variantId}`, {
      ...data,
      costPrice: data.costPrice ? Number(data.costPrice) : undefined,
      salePrice: data.salePrice ? Number(data.salePrice) : undefined,
      stock: data.stock !== undefined ? Number(data.stock) : undefined,
    });
    setVariants(v => v.map(x => x.variantId === variantId ? res.data : x));
  };

  const handleRemoveVariant = async (variantId: string) => {
    await api.delete(`/products/variants/${variantId}`);
    setVariants(v => v.filter(x => x.variantId !== variantId));
  };


  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-bold text-slate-800">{isEdit ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition">
            <CloseIcon />
          </button>
        </div>

        {/* Tabs — variantes solo en edición */}
        {isEdit && (
          <div className="flex border-b border-slate-100 px-6">
            {(['info','variants'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                {t === 'info' ? 'Información' : `Variantes (${variants.length})`}
              </button>
            ))}
          </div>
        )}

        <div className="px-6 py-5 space-y-4">
          {tab === 'info' && (
            <>
              {form.imageUrl && (
                <div className="h-40 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                  <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Nombre *</label>
                <input ref={nameRef} type="text" value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Ej: Camiseta básica"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* SKU */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">SKU</label>
                  <input type="text" value={form.sku}
                    onChange={e => set('sku', e.target.value)}
                    placeholder="Ej: CAM-001"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
                {/* URL imagen */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">URL de imagen</label>
                  <input type="text" value={form.imageUrl}
                    onChange={e => set('imageUrl', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Precio venta */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Precio venta *</label>
                  <input type="number" value={form.salePrice}
                    onChange={e => set('salePrice', e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
                {/* Precio costo */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Precio costo *</label>
                  <input type="number" value={form.costPrice}
                    onChange={e => set('costPrice', e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
                {/* Stock */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Stock base</label>
                  <input type="number" value={form.stock}
                    onChange={e => set('stock', e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Descripción</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Describe el producto para que la IA pueda informar a clientes..."
                  rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none" />
              </div>
              <div className="flex items-center justify-between py-2 px-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-700"><TruckIcon /><span>Envío disponible</span></div>
                <button onClick={() => set('hasShipping', !form.hasShipping)}
                  className="w-11 h-6 rounded-full transition relative"
                  style={form.hasShipping ? { background: 'linear-gradient(135deg,#2563eb,#9333ea)' } : { background: '#e2e8f0' }}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.hasShipping ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button onClick={handleSubmit} disabled={saving}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition"
                style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
                {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </>
          )}

          {tab === 'variants' && (
            <>
              <p className="text-xs text-slate-400">Cada variante tiene su propio precio y stock independiente.</p>

              {variants.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-6">Sin variantes aún</p>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    <span>Nombre</span><span>SKU</span><span>Precio</span><span>Stock</span><span></span>
                  </div>
                  {variants.map(v => (
                    <VariantRow key={v.variantId} variant={v}
                      onUpdate={handleUpdateVariant} onRemove={handleRemoveVariant} />
                  ))}
                </div>
              )}

              {/* Agregar nueva variante */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Nueva variante</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input value={newVariant.name} onChange={e => setNewVariant(v => ({ ...v, name: e.target.value }))}
                    placeholder="Nombre (ej: Talla M / Rojo)"
                    className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  <input value={newVariant.sku} onChange={e => setNewVariant(v => ({ ...v, sku: e.target.value }))}
                    placeholder="SKU (opcional)"
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  <input value={newVariant.stock} onChange={e => setNewVariant(v => ({ ...v, stock: e.target.value }))}
                    placeholder="Stock" type="number"
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  <input value={newVariant.salePrice} onChange={e => setNewVariant(v => ({ ...v, salePrice: e.target.value }))}
                    placeholder="Precio venta *" type="number"
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  <input value={newVariant.costPrice} onChange={e => setNewVariant(v => ({ ...v, costPrice: e.target.value }))}
                    placeholder="Precio costo *" type="number"
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
                <button onClick={handleAddVariant} disabled={addingVariant || !newVariant.name.trim() || !newVariant.salePrice || !newVariant.costPrice}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition"
                  style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
                  {addingVariant ? 'Agregando...' : <><PlusIcon /> Agregar variante</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Products() {
  const { storeId } = useAuth();
  const [products, setProducts]         = useState<Product[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterShipping, setFilterShipping] = useState<'all'|'yes'|'no'>('all');
  const [filterStock, setFilterStock]   = useState<'all'|'low'|'out'>('all');
  const [modalProduct, setModalProduct] = useState<Product | null | 'new'>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getProducts(storeId).then(res => setProducts(res.data)).finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (saved: Product) => {
    setProducts(prev => {
      const exists = prev.find(p => p.productId === saved.productId);
      return exists ? prev.map(p => p.productId === saved.productId ? saved : p) : [saved, ...prev];
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await api.delete(`/products/${deleteTarget.productId}`);
    setProducts(prev => prev.filter(p => p.productId !== deleteTarget.productId));
    setDeleteTarget(null);
    setDeleting(false);
  };

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) ||
      (p.sku ?? '').toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      p.variants?.some(v => v.name.toLowerCase().includes(q));
    const matchShipping = filterShipping === 'all' || (filterShipping === 'yes' && p.hasShipping) || (filterShipping === 'no' && !p.hasShipping);
    const totalStock = p.variants?.length ? p.variants.reduce((s,v) => s+v.stock,0) : p.stock;
    const matchStock = filterStock === 'all' || (filterStock === 'out' && totalStock === 0) || (filterStock === 'low' && totalStock > 0 && totalStock < 5);
    return matchSearch && matchShipping && matchStock;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Productos</h1>
            <p className="text-sm text-slate-400 mt-0.5">{loading ? '...' : `${products.length} productos activos`}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon /></span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, SKU, variante..."
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-64" />
            </div>
            <select value={filterShipping} onChange={e => setFilterShipping(e.target.value as any)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600">
              <option value="all">Todos</option><option value="yes">Con envío</option><option value="no">Sin envío</option>
            </select>
            <select value={filterStock} onChange={e => setFilterStock(e.target.value as any)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600">
              <option value="all">Todo stock</option><option value="low">Stock bajo (&lt;5)</option><option value="out">Sin stock</option>
            </select>
            <button onClick={() => setModalProduct('new')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
              <PlusIcon /> Nuevo producto
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <svg className="animate-spin text-blue-600" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
            <p className="text-sm">{search || filterShipping !== 'all' || filterStock !== 'all' ? 'Sin resultados' : 'Sin productos aún'}</p>
            {(search || filterShipping !== 'all' || filterStock !== 'all') && (
              <button onClick={() => { setSearch(''); setFilterShipping('all'); setFilterStock('all'); }} className="text-xs text-blue-600 hover:underline">Limpiar filtros</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => <ProductCard key={p.productId} product={p} onEdit={prod => setModalProduct(prod)} onDelete={setDeleteTarget} />)}
          </div>
        )}
      </div>

      {modalProduct !== null && (
        <ProductModal storeId={storeId} product={modalProduct === 'new' ? null : modalProduct}
          onClose={() => setModalProduct(null)} onSaved={handleSaved} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 mb-2">¿Eliminar producto?</h3>
            <p className="text-sm text-slate-500 mb-5"><span className="font-semibold">{deleteTarget.name}</span> será desactivado junto con todas sus variantes.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50">
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
