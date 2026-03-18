import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  addVariant, updateVariant, deleteVariant,
  getCategories, createCategory,
} from '../services/api';

// ── Icons ─────────────────────────────────────────────────────────────────────
const SearchIcon  = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>);
const PlusIcon    = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>);
const EditIcon    = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);
const TrashIcon   = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>);
const CloseIcon   = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);
const ImageIcon   = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>);
const TruckIcon   = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>);
const SaveIcon    = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>);
const TagIcon     = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>);
const BoxIcon     = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>);

// ── Types ─────────────────────────────────────────────────────────────────────
interface Category {
  categoryId: string;
  name:       string;
  slug:       string;
}

interface Variant {
  variantId:   string;
  name:        string;
  sku:         string | null;
  salePrice:   string | null;
  costPrice:   string | null;
  profitMargin: string | null;
  stock:       number;
  attributes:  Record<string, string>;
  imageUrl:    string | null;
  weight:      string | null;
  sortOrder:   number;
  isActive:    boolean;
}

interface Product {
  productId:        string;
  sku:              string | null;
  name:             string;
  description:      string | null;
  salePrice:        string;
  costPrice:        string;
  profitMargin:     string | null;
  stock:            number;
  hasVariants:      boolean;
  imageUrl:         string | null;
  hasShipping:      boolean;
  weight:           string | null;
  shippingStandard: string | null;
  shippingExpress:  string | null;
  isActive:         boolean;
  createdAt:        string;
  categoryId:       string | null;
  category:         Category | null;
  variants:         Variant[];
}

interface VariantForm {
  name:       string;
  sku:        string;
  salePrice:  string;
  costPrice:  string;
  stock:      string;
  imageUrl:   string;
  weight:     string;
  attributes: Record<string, string>;
  sortOrder:  string;
}

const EMPTY_VARIANT: VariantForm = {
  name: '', sku: '', salePrice: '', costPrice: '',
  stock: '0', imageUrl: '', weight: '', attributes: {}, sortOrder: '0',
};

interface FormState {
  name:             string;
  sku:              string;
  categoryId:       string;
  description:      string;
  salePrice:        string;
  costPrice:        string;
  stock:            string;
  hasVariants:      boolean;
  imageUrl:         string;
  hasShipping:      boolean;
  weight:           string;
  shippingStandard: string;
  shippingExpress:  string;
}

const EMPTY_FORM: FormState = {
  name: '', sku: '', categoryId: '', description: '',
  salePrice: '', costPrice: '', stock: '0',
  hasVariants: false, imageUrl: '',
  hasShipping: false, weight: '', shippingStandard: '', shippingExpress: '',
};

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (n: string | number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n));

const margin = (sale: string | number, cost: string | number): number | null => {
  const s = Number(sale), c = Number(cost);
  if (!s || !c || s <= 0) return null;
  return Math.round(((s - c) / s) * 100);
};

// ── Profit Badge ──────────────────────────────────────────────────────────────
function ProfitBadge({ sale, cost }: { sale: string | number; cost: string | number }) {
  const m = margin(sale, cost);
  if (m === null) return null;
  const color = m >= 40 ? 'text-green-700 bg-green-50' : m >= 20 ? 'text-amber-700 bg-amber-50' : 'text-red-600 bg-red-50';
  return <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${color}`}>{m}%</span>;
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete }: {
  product: Product;
  onEdit:  (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  const activeVariants = product.variants?.filter(v => v.isActive) ?? [];
  const hasVars        = product.hasVariants && activeVariants.length > 0;
  const minPrice       = hasVars ? Math.min(...activeVariants.map(v => Number(v.salePrice ?? product.salePrice))) : Number(product.salePrice);
  const maxPrice       = hasVars ? Math.max(...activeVariants.map(v => Number(v.salePrice ?? product.salePrice))) : Number(product.salePrice);
  const totalStock     = hasVars ? activeVariants.reduce((s, v) => s + v.stock, 0) : product.stock;
  const profitM        = margin(product.salePrice, product.costPrice);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition">
      {/* Imagen */}
      <div className="h-44 bg-slate-50 flex items-center justify-center overflow-hidden relative">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <span className="text-slate-300"><ImageIcon /></span>
        )}
        {hasVars && (
          <span className="absolute top-2 right-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full font-medium">
            {activeVariants.length} variantes
          </span>
        )}
        {product.category && (
          <span className="absolute top-2 left-2 text-xs bg-white/90 text-slate-600 px-2 py-0.5 rounded-full font-medium border border-slate-200">
            {product.category.name}
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-2">
        <div>
          <p className="font-semibold text-slate-800 leading-tight">{product.name}</p>
          {product.sku && <p className="text-xs text-slate-400 font-mono">SKU: {product.sku}</p>}
        </div>

        {product.description && (
          <p className="text-xs text-slate-500 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: product.description.replace(/<[^>]+>/g, ' ') }} />
        )}

        {/* Precios */}
        <div className="flex items-center gap-3 mt-auto pt-2 border-t border-slate-50">
          <div>
            <p className="text-xs text-slate-400">Venta</p>
            <p className="font-bold text-slate-800 text-sm">
              {hasVars && minPrice !== maxPrice ? `${fmt(minPrice)} – ${fmt(maxPrice)}` : fmt(minPrice)}
            </p>
          </div>
          {!hasVars && (
            <div>
              <p className="text-xs text-slate-400">Costo</p>
              <p className="text-sm text-slate-500">{fmt(product.costPrice)}</p>
            </div>
          )}
          {!hasVars && profitM !== null && (
            <ProfitBadge sale={product.salePrice} cost={product.costPrice} />
          )}
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-400">Stock</p>
            <p className={`font-semibold text-sm ${totalStock === 0 ? 'text-red-500' : totalStock < 5 ? 'text-orange-500' : 'text-green-600'}`}>
              {totalStock}
            </p>
          </div>
        </div>

        {/* Chips variantes */}
        {hasVars && (
          <div className="flex flex-wrap gap-1">
            {activeVariants.slice(0, 3).map(v => (
              <span key={v.variantId} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {v.name}
              </span>
            ))}
            {activeVariants.length > 3 && (
              <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">
                +{activeVariants.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Envío */}
        {product.hasShipping && (
          <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg w-fit">
            <TruckIcon />
            {product.shippingStandard && Number(product.shippingStandard) > 0
              ? `Envío ${fmt(product.shippingStandard)}`
              : 'Envío disponible'}
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

// ── Variant Row ───────────────────────────────────────────────────────────────
function VariantRow({ variant, onUpdate, onRemove }: {
  variant:  Variant;
  onUpdate: (id: string, data: Partial<VariantForm>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState<VariantForm>({
    name:       variant.name,
    sku:        variant.sku ?? '',
    salePrice:  variant.salePrice ?? '',
    costPrice:  variant.costPrice ?? '',
    stock:      String(variant.stock),
    imageUrl:   variant.imageUrl ?? '',
    weight:     variant.weight ?? '',
    attributes: variant.attributes ?? {},
    sortOrder:  String(variant.sortOrder ?? 0),
  });
  const [saving, setSaving] = useState(false);
  const [newAttrKey, setNewAttrKey]     = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  const save = async () => {
    setSaving(true);
    await onUpdate(variant.variantId, form);
    setSaving(false);
    setEditing(false);
  };

  const addAttr = () => {
    if (!newAttrKey.trim() || !newAttrValue.trim()) return;
    setForm(f => ({ ...f, attributes: { ...f.attributes, [newAttrKey.trim()]: newAttrValue.trim() } }));
    setNewAttrKey(''); setNewAttrValue('');
  };

  const removeAttr = (key: string) => {
    const updated = { ...form.attributes };
    delete updated[key];
    setForm(f => ({ ...f, attributes: updated }));
  };

  if (!editing) {
    const attrKeys = Object.keys(variant.attributes ?? {});
    return (
      <div className="px-3 py-2.5 rounded-xl hover:bg-slate-50 transition">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-2 text-sm">
          <div>
            <p className="font-medium text-slate-700 truncate">{variant.name}</p>
            {attrKeys.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {attrKeys.map(k => (
                  <span key={k} className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100">
                    {k}: {variant.attributes[k]}
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className="text-slate-500 font-mono text-xs">{variant.sku ?? '—'}</p>
          <div>
            <p className="font-semibold text-slate-800">{variant.salePrice ? fmt(variant.salePrice) : 'Base'}</p>
            {variant.costPrice && (
              <div className="flex items-center gap-1">
                <p className="text-xs text-slate-400">{fmt(variant.costPrice)}</p>
                <ProfitBadge sale={variant.salePrice ?? 0} cost={variant.costPrice} />
              </div>
            )}
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
      </div>
    );
  }

  return (
    <div className="px-3 py-3 bg-blue-50/40 rounded-xl space-y-2 border border-blue-100">
      <div className="grid grid-cols-2 gap-2">
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Nombre de variante *"
          className="col-span-2 px-2 py-1.5 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
          placeholder="SKU"
          className="px-2 py-1.5 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
          type="number" placeholder="Stock"
          className="px-2 py-1.5 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: e.target.value }))}
          type="number" placeholder="Precio venta"
          className="px-2 py-1.5 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))}
          type="number" placeholder="Precio costo"
          className="px-2 py-1.5 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
          type="number" step="0.01" placeholder="Peso (kg)"
          className="px-2 py-1.5 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
          placeholder="URL imagen"
          className="px-2 py-1.5 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      {/* Atributos */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-1">Atributos (color, talla, etc.)</p>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {Object.entries(form.attributes).map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              {k}: {v}
              <button onClick={() => removeAttr(k)} className="hover:text-red-500">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input value={newAttrKey} onChange={e => setNewAttrKey(e.target.value)}
            placeholder="Atributo (ej: color)"
            className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <input value={newAttrValue} onChange={e => setNewAttrValue(e.target.value)}
            placeholder="Valor (ej: Rojo)"
            className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <button onClick={addAttr} type="button"
            className="px-2 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
            +
          </button>
        </div>
      </div>

      <div className="flex gap-1 pt-1">
        <button onClick={save} disabled={saving || !form.name.trim()}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50 transition"
          style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
          {saving ? <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> : <><SaveIcon /> Guardar</>}
        </button>
        <button onClick={() => setEditing(false)}
          className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-200 transition">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Product Modal ─────────────────────────────────────────────────────────────
function ProductModal({ product, categories, onClose, onSaved, onCategoryCreated }: {
  product:           Product | null;
  categories:        Category[];
  onClose:           () => void;
  onSaved:           (p: Product) => void;
  onCategoryCreated: (c: Category) => void;
}) {
  const isEdit = !!product;

  const [form, setForm] = useState<FormState>(product ? {
    name:             product.name,
    sku:              product.sku ?? '',
    categoryId:       product.categoryId ?? '',
    description:      product.description ?? '',
    salePrice:        product.salePrice,
    costPrice:        product.costPrice,
    stock:            String(product.stock),
    hasVariants:      product.hasVariants,
    imageUrl:         product.imageUrl ?? '',
    hasShipping:      product.hasShipping,
    weight:           product.weight ?? '',
    shippingStandard: product.shippingStandard ?? '',
    shippingExpress:  product.shippingExpress ?? '',
  } : EMPTY_FORM);

  const [variants,       setVariants]       = useState<Variant[]>(product?.variants ?? []);
  const [newVariant,     setNewVariant]      = useState<VariantForm>(EMPTY_VARIANT);
  const [newAttrKey,     setNewAttrKey]      = useState('');
  const [newAttrValue,   setNewAttrValue]    = useState('');
  const [addingVariant,  setAddingVariant]   = useState(false);
  const [saving,         setSaving]          = useState(false);
  const [error,          setError]           = useState('');
  const [tab,            setTab]             = useState<'info' | 'variants'>('info');
  const [newCatName,     setNewCatName]      = useState('');
  const [creatingCat,    setCreatingCat]     = useState(false);
  const [showCatInput,   setShowCatInput]    = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 50); }, []);

  const set = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }));

  // ── Crear categoría rápida ────────────────────────────────────────────────
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const res = await createCategory(newCatName.trim());
      onCategoryCreated(res.data);
      set('categoryId', res.data.categoryId);
      setNewCatName('');
      setShowCatInput(false);
    } catch {
      setError('Error al crear categoría');
    } finally {
      setCreatingCat(false);
    }
  };

  // ── Guardar producto ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim())    return setError('El nombre es requerido');
    if (!form.salePrice)      return setError('El precio de venta es requerido');
    setSaving(true); setError('');
    try {
      const payload: any = {
        name:             form.name.trim(),
        sku:              form.sku.trim() || undefined,
        categoryId:       form.categoryId || undefined,
        description:      form.description.trim() || undefined,
        salePrice:        Number(form.salePrice),
        costPrice:        form.costPrice ? Number(form.costPrice) : undefined,
        stock:            form.hasVariants ? undefined : Number(form.stock) || 0,
        hasVariants:      form.hasVariants,
        imageUrl:         form.imageUrl.trim() || undefined,
        hasShipping:      form.hasShipping,
        weight:           form.weight ? Number(form.weight) : undefined,
        shippingStandard: form.shippingStandard ? Number(form.shippingStandard) : undefined,
        shippingExpress:  form.shippingExpress  ? Number(form.shippingExpress)  : undefined,
      };
      const res = isEdit
        ? await updateProduct(product!.productId, payload)
        : await createProduct(payload);
      onSaved({ ...res.data, variants });
      onClose();
    } catch {
      setError('Error al guardar. Verifica los datos.');
    } finally {
      setSaving(false);
    }
  };

  // ── Atributos nueva variante ───────────────────────────────────────────────
  const addNewVariantAttr = () => {
    if (!newAttrKey.trim() || !newAttrValue.trim()) return;
    setNewVariant(v => ({ ...v, attributes: { ...v.attributes, [newAttrKey.trim()]: newAttrValue.trim() } }));
    setNewAttrKey(''); setNewAttrValue('');
  };

  // ── Agregar variante ──────────────────────────────────────────────────────
  const handleAddVariant = async () => {
    if (!isEdit || !newVariant.name.trim()) return;
    setAddingVariant(true);
    try {
      const res = await addVariant(product!.productId, {
        name:       newVariant.name.trim(),
        sku:        newVariant.sku.trim() || undefined,
        salePrice:  newVariant.salePrice ? Number(newVariant.salePrice) : undefined,
        costPrice:  newVariant.costPrice ? Number(newVariant.costPrice) : undefined,
        stock:      Number(newVariant.stock) || 0,
        imageUrl:   newVariant.imageUrl.trim() || undefined,
        weight:     newVariant.weight ? Number(newVariant.weight) : undefined,
        attributes: newVariant.attributes,
        sortOrder:  Number(newVariant.sortOrder) || 0,
      });
      setVariants(v => [...v, res.data]);
      setNewVariant(EMPTY_VARIANT);
      setNewAttrKey(''); setNewAttrValue('');
    } catch {
      setError('Error al agregar variante');
    } finally {
      setAddingVariant(false);
    }
  };

  const handleUpdateVariant = async (variantId: string, data: Partial<VariantForm>) => {
    const res = await updateVariant(variantId, {
      name:       data.name,
      sku:        data.sku || undefined,
      salePrice:  data.salePrice ? Number(data.salePrice) : undefined,
      costPrice:  data.costPrice ? Number(data.costPrice) : undefined,
      stock:      data.stock !== undefined ? Number(data.stock) : undefined,
      imageUrl:   data.imageUrl || undefined,
      weight:     data.weight ? Number(data.weight) : undefined,
      attributes: data.attributes,
      sortOrder:  data.sortOrder !== undefined ? Number(data.sortOrder) : undefined,
    });
    setVariants(v => v.map(x => x.variantId === variantId ? res.data : x));
  };

  const handleRemoveVariant = async (variantId: string) => {
    await deleteVariant(variantId);
    setVariants(v => v.filter(x => x.variantId !== variantId));
  };

  // ── Margen en tiempo real ─────────────────────────────────────────────────
  const liveMargin = form.salePrice && form.costPrice
    ? margin(form.salePrice, form.costPrice)
    : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-bold text-slate-800">{isEdit ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition">
            <CloseIcon />
          </button>
        </div>

        {/* Tabs */}
        {isEdit && (
          <div className="flex border-b border-slate-100 px-6">
            {(['info', 'variants'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                {t === 'info' ? 'Información' : `Variantes (${variants.filter(v => v.isActive).length})`}
              </button>
            ))}
          </div>
        )}

        <div className="px-6 py-5 space-y-4">
          {/* ── TAB INFO ───────────────────────────────────────────────────── */}
          {tab === 'info' && (
            <>
              {/* Preview imagen */}
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

              {/* SKU + Categoría */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">SKU</label>
                  <input type="text" value={form.sku}
                    onChange={e => set('sku', e.target.value)}
                    placeholder="Ej: CAM-001"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1 flex items-center gap-1">
                    <TagIcon /> Categoría
                  </label>
                  <div className="flex gap-1">
                    <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700">
                      <option value="">Sin categoría</option>
                      {categories.map(c => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowCatInput(s => !s)}
                      title="Nueva categoría"
                      className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 transition">
                      <PlusIcon />
                    </button>
                  </div>
                  {showCatInput && (
                    <div className="flex gap-1 mt-1.5">
                      <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                        placeholder="Nueva categoría"
                        className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <button onClick={handleCreateCategory} disabled={creatingCat || !newCatName.trim()}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                        {creatingCat ? '...' : 'Crear'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* URL imagen */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">URL de imagen</label>
                <input type="text" value={form.imageUrl}
                  onChange={e => set('imageUrl', e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>

              {/* Tiene variantes */}
              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <BoxIcon />
                  <span>Este producto tiene variantes</span>
                  <span className="text-xs text-slate-400">(tallas, colores, etc.)</span>
                </div>
                <button onClick={() => set('hasVariants', !form.hasVariants)}
                  className="w-11 h-6 rounded-full transition relative flex-shrink-0"
                  style={form.hasVariants ? { background: 'linear-gradient(135deg,#9333ea,#2563eb)' } : { background: '#e2e8f0' }}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.hasVariants ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Precio + Stock (solo sin variantes) */}
              {!form.hasVariants && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Precio venta *</label>
                      <input type="number" value={form.salePrice}
                        onChange={e => set('salePrice', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Precio costo</label>
                      <input type="number" value={form.costPrice}
                        onChange={e => set('costPrice', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Stock</label>
                      <input type="number" value={form.stock}
                        onChange={e => set('stock', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                    </div>
                  </div>
                  {liveMargin !== null && (
                    <p className={`text-xs font-semibold ${liveMargin >= 40 ? 'text-green-600' : liveMargin >= 20 ? 'text-amber-600' : 'text-red-500'}`}>
                      Margen de ganancia: {liveMargin}%
                    </p>
                  )}
                </div>
              )}

              {/* Precio base (con variantes) */}
              {form.hasVariants && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Precio base de referencia *</label>
                  <input type="number" value={form.salePrice}
                    onChange={e => set('salePrice', e.target.value)}
                    placeholder="Precio de referencia"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  <p className="text-xs text-slate-400 mt-1">Cada variante puede tener su propio precio en la pestaña Variantes.</p>
                </div>
              )}

              {/* Descripción */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Descripción</label>
                <textarea value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Describe el producto para que la IA pueda informar a clientes..."
                  rows={3}
                  maxLength={50000}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none" />
                <p className="text-xs text-slate-400 text-right mt-0.5">{form.description.length.toLocaleString()} / 50.000</p>
              </div>

              {/* Envío */}
              <div className="space-y-3 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <TruckIcon /> <span>Configuración de envío</span>
                  </div>
                  <button onClick={() => set('hasShipping', !form.hasShipping)}
                    className="w-11 h-6 rounded-full transition relative flex-shrink-0"
                    style={form.hasShipping ? { background: 'linear-gradient(135deg,#2563eb,#0ea5e9)' } : { background: '#e2e8f0' }}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.hasShipping ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>

                {form.hasShipping && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Peso (kg)</label>
                      <input type="number" step="0.01" value={form.weight}
                        onChange={e => set('weight', e.target.value)}
                        placeholder="1.5"
                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Envío estándar</label>
                      <input type="number" value={form.shippingStandard}
                        onChange={e => set('shippingStandard', e.target.value)}
                        placeholder="5000"
                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Envío express</label>
                      <input type="number" value={form.shippingExpress}
                        onChange={e => set('shippingExpress', e.target.value)}
                        placeholder="12000"
                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button onClick={handleSubmit} disabled={saving}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition"
                style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
                {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </>
          )}

          {/* ── TAB VARIANTES ──────────────────────────────────────────────── */}
          {tab === 'variants' && (
            <>
              <p className="text-xs text-slate-400">Cada variante tiene su propio precio, stock y atributos.</p>

              {variants.filter(v => v.isActive).length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-6">Sin variantes aún</p>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    <span>Nombre</span><span>SKU</span><span>Precio</span><span>Stock</span><span />
                  </div>
                  {variants.filter(v => v.isActive).map(v => (
                    <VariantRow key={v.variantId} variant={v}
                      onUpdate={handleUpdateVariant}
                      onRemove={handleRemoveVariant} />
                  ))}
                </div>
              )}

              {/* Agregar variante */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nueva variante</p>
                <div className="grid grid-cols-2 gap-2">
                  <input value={newVariant.name}
                    onChange={e => setNewVariant(v => ({ ...v, name: e.target.value }))}
                    placeholder="Nombre * (ej: Talla M / Rojo)"
                    className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  <input value={newVariant.sku}
                    onChange={e => setNewVariant(v => ({ ...v, sku: e.target.value }))}
                    placeholder="SKU (opcional)"
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  <input value={newVariant.stock}
                    onChange={e => setNewVariant(v => ({ ...v, stock: e.target.value }))}
                    placeholder="Stock" type="number"
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  <input value={newVariant.salePrice}
                    onChange={e => setNewVariant(v => ({ ...v, salePrice: e.target.value }))}
                    placeholder="Precio venta" type="number"
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  <input value={newVariant.costPrice}
                    onChange={e => setNewVariant(v => ({ ...v, costPrice: e.target.value }))}
                    placeholder="Precio costo" type="number"
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  <input value={newVariant.weight}
                    onChange={e => setNewVariant(v => ({ ...v, weight: e.target.value }))}
                    placeholder="Peso kg" type="number" step="0.01"
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  <input value={newVariant.imageUrl}
                    onChange={e => setNewVariant(v => ({ ...v, imageUrl: e.target.value }))}
                    placeholder="URL imagen"
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>

                {/* Atributos nueva variante */}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Atributos</p>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {Object.entries(newVariant.attributes).map(([k, v]) => (
                      <span key={k} className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        {k}: {v}
                        <button onClick={() => {
                          const a = { ...newVariant.attributes };
                          delete a[k];
                          setNewVariant(nv => ({ ...nv, attributes: a }));
                        }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input value={newAttrKey} onChange={e => setNewAttrKey(e.target.value)}
                      placeholder="Atributo (color, talla…)"
                      className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <input value={newAttrValue} onChange={e => setNewAttrValue(e.target.value)}
                      placeholder="Valor (Rojo, M…)"
                      className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <button onClick={addNewVariantAttr} type="button"
                      className="px-2 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">+</button>
                  </div>
                </div>

                <button onClick={handleAddVariant}
                  disabled={addingVariant || !newVariant.name.trim()}
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
  const [products,       setProducts]        = useState<Product[]>([]);
  const [categories,     setCategories]      = useState<Category[]>([]);
  const [loading,        setLoading]         = useState(true);
  const [search,         setSearch]          = useState('');
  const [filterCat,      setFilterCat]       = useState('');
  const [filterShipping, setFilterShipping]  = useState<'all'|'yes'|'no'>('all');
  const [filterStock,    setFilterStock]     = useState<'all'|'low'|'out'>('all');
  const [modalProduct,   setModalProduct]    = useState<Product | null | 'new'>(null);
  const [deleteTarget,   setDeleteTarget]    = useState<Product | null>(null);
  const [deleting,       setDeleting]        = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getProducts(), getCategories()])
      .then(([prodRes, catRes]) => {
        setProducts(prodRes.data);
        setCategories(catRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (saved: Product) => {
    setProducts(prev => {
      const exists = prev.find(p => p.productId === saved.productId);
      return exists
        ? prev.map(p => p.productId === saved.productId ? saved : p)
        : [saved, ...prev];
    });
  };

  const handleCategoryCreated = (cat: Category) => {
    setCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteProduct(deleteTarget.productId);
    setProducts(prev => prev.filter(p => p.productId !== deleteTarget.productId));
    setDeleteTarget(null);
    setDeleting(false);
  };

  const filtered = products.filter(p => {
    const q           = search.toLowerCase();
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.sku ?? '').toLowerCase().includes(q) ||
      (p.description ?? '').replace(/<[^>]+>/g, ' ').toLowerCase().includes(q) ||
      p.variants?.some(v =>
        v.name.toLowerCase().includes(q) ||
        Object.values(v.attributes ?? {}).some(a => a.toLowerCase().includes(q))
      );
    const matchCat      = !filterCat || p.categoryId === filterCat;
    const matchShipping = filterShipping === 'all' ||
      (filterShipping === 'yes' && p.hasShipping) ||
      (filterShipping === 'no' && !p.hasShipping);
    const totalStock    = p.hasVariants && p.variants?.length
      ? p.variants.filter(v => v.isActive).reduce((s, v) => s + v.stock, 0)
      : p.stock;
    const matchStock    = filterStock === 'all' ||
      (filterStock === 'out' && totalStock === 0) ||
      (filterStock === 'low' && totalStock > 0 && totalStock < 5);
    return matchSearch && matchCat && matchShipping && matchStock;
  });

  const statsTotal     = products.length;
  const statsLowStock  = products.filter(p => {
    const s = p.hasVariants ? p.variants?.filter(v => v.isActive).reduce((a, v) => a + v.stock, 0) : p.stock;
    return (s ?? 0) > 0 && (s ?? 0) < 5;
  }).length;
  const statsOutStock  = products.filter(p => {
    const s = p.hasVariants ? p.variants?.filter(v => v.isActive).reduce((a, v) => a + v.stock, 0) : p.stock;
    return (s ?? 0) === 0;
  }).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Productos</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {loading ? '...' : `${statsTotal} producto${statsTotal !== 1 ? 's' : ''} activo${statsTotal !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button onClick={() => setModalProduct('new')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
              <PlusIcon /> Nuevo producto
            </button>
          </div>

          {/* Stats rápidas */}
          {!loading && (
            <div className="flex gap-4 mb-4">
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{statsTotal}</span> total
              </div>
              {statsLowStock > 0 && (
                <div className="text-xs text-orange-600">
                  <span className="font-semibold">{statsLowStock}</span> con stock bajo
                </div>
              )}
              {statsOutStock > 0 && (
                <div className="text-xs text-red-500">
                  <span className="font-semibold">{statsOutStock}</span> sin stock
                </div>
              )}
            </div>
          )}

          {/* Filtros */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon /></span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, SKU, atributo..."
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-64" />
            </div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600">
              <option value="">Todas las categorías</option>
              {categories.map(c => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
            </select>
            <select value={filterShipping} onChange={e => setFilterShipping(e.target.value as any)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600">
              <option value="all">Todos</option>
              <option value="yes">Con envío</option>
              <option value="no">Sin envío</option>
            </select>
            <select value={filterStock} onChange={e => setFilterStock(e.target.value as any)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600">
              <option value="all">Todo stock</option>
              <option value="low">Stock bajo (&lt;5)</option>
              <option value="out">Sin stock</option>
            </select>
            {(search || filterCat || filterShipping !== 'all' || filterStock !== 'all') && (
              <button onClick={() => { setSearch(''); setFilterCat(''); setFilterShipping('all'); setFilterStock('all'); }}
                className="text-xs text-blue-600 hover:underline">
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <svg className="animate-spin text-blue-600" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
            <BoxIcon />
            <p className="text-sm">
              {search || filterCat || filterShipping !== 'all' || filterStock !== 'all'
                ? 'Sin resultados para este filtro'
                : 'Sin productos aún'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => (
              <ProductCard key={p.productId} product={p}
                onEdit={prod => setModalProduct(prod)}
                onDelete={setDeleteTarget} />
            ))}
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {modalProduct !== null && (
        <ProductModal
          product={modalProduct === 'new' ? null : modalProduct}
          categories={categories}
          onClose={() => setModalProduct(null)}
          onSaved={handleSaved}
          onCategoryCreated={handleCategoryCreated}
        />
      )}

      {/* Confirm eliminar */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 mb-2">¿Eliminar producto?</h3>
            <p className="text-sm text-slate-500 mb-5">
              <span className="font-semibold">{deleteTarget.name}</span> será desactivado
              junto con todas sus variantes.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50">
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
