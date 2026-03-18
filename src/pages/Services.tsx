import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getServices, createService, updateService, deleteService,
  addServiceVariant, updateServiceVariant, deleteServiceVariant,
} from '../services/api';
import type { PriceType, ServiceVariantPayload } from '../services/api';

// ── Icons ─────────────────────────────────────────────────────────────────────
const PlusIcon   = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>);
const EditIcon   = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);
const TrashIcon  = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>);
const CloseIcon  = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>);
const SaveIcon   = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>);
const WrenchIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>);
const ClockIcon  = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>);
const TagIcon    = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>);

// ── Types ─────────────────────────────────────────────────────────────────────
interface ServiceVariant {
  variantId:        string;
  name:             string;
  description:      string | null;
  priceOverride:    string | null;
  priceModifier:    string | null;
  estimatedMinutes: number | null;
  sortOrder:        number;
  isActive:         boolean;
}

interface Service {
  serviceId:        string;
  name:             string;
  description:      string | null;
  category:         string | null;
  imageUrl:         string | null;
  priceType:        PriceType;
  basePrice:        string | null;
  minPrice:         string | null;
  maxPrice:         string | null;
  costPrice:        string | null;
  unitLabel:        string | null;
  hasVariants:      boolean;
  estimatedMinutes: number | null;
  customFields:     Record<string, any> | null;
  isActive:         boolean;
  variants:         ServiceVariant[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: string | number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n));

const fmtMinutes = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`;
};

const PRICE_TYPE_OPTIONS: { value: PriceType; label: string; hint: string }[] = [
  { value: 'FIXED',    label: 'Precio fijo',     hint: 'Un precio fijo por cada vez que se realiza' },
  { value: 'PER_HOUR', label: 'Por hora',         hint: 'Se multiplica por las horas trabajadas' },
  { value: 'PER_DAY',  label: 'Por día',          hint: 'Se multiplica por los días de servicio' },
  { value: 'PER_UNIT', label: 'Por unidad',       hint: 'Se multiplica por la cantidad de unidades' },
  { value: 'VARIABLE', label: 'Precio variable',  hint: 'Sin precio fijo — el admin cotiza cada caso' },
];

const PRICE_TYPE_COLORS: Record<PriceType, string> = {
  FIXED:    'bg-blue-50 text-blue-700',
  PER_HOUR: 'bg-purple-50 text-purple-700',
  PER_DAY:  'bg-indigo-50 text-indigo-700',
  PER_UNIT: 'bg-teal-50 text-teal-700',
  VARIABLE: 'bg-orange-50 text-orange-600',
};

const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  FIXED:    'Fijo',
  PER_HOUR: 'Por hora',
  PER_DAY:  'Por día',
  PER_UNIT: 'Por unidad',
  VARIABLE: 'Variable',
};

// ── Función para calcular precio efectivo de variante ─────────────────────────
function resolveVariantPrice(service: Service, variant: ServiceVariant): string {
  if (variant.priceOverride) return fmt(variant.priceOverride);
  if (variant.priceModifier && service.basePrice) {
    const mod = Number(variant.priceModifier);
    const base = Number(service.basePrice);
    return `${fmt(base * (1 + mod / 100))} (${mod > 0 ? '+' : ''}${mod}%)`;
  }
  return service.basePrice ? fmt(service.basePrice) : '—';
}

// ── Service Card ──────────────────────────────────────────────────────────────
function ServiceCard({ service, onEdit, onDelete }: {
  service:  Service;
  onEdit:   (s: Service) => void;
  onDelete: (s: Service) => void;
}) {
  const activeVariants = service.variants?.filter(v => v.isActive) ?? [];

  const priceDisplay = () => {
    if (service.priceType === 'VARIABLE') {
      const rango = service.minPrice && service.maxPrice
        ? `${fmt(service.minPrice)} – ${fmt(service.maxPrice)}`
        : null;
      return (
        <div>
          <span className="text-base font-bold text-orange-500">Cotización</span>
          {rango && <p className="text-xs text-slate-400 mt-0.5">{rango}</p>}
        </div>
      );
    }
    if (!service.basePrice) return <span className="text-slate-400 text-sm">Sin precio</span>;
    const unidad = service.unitLabel ? `/${service.unitLabel}` : '';
    return (
      <div>
        <span className="text-xl font-bold text-slate-800">{fmt(service.basePrice)}</span>
        <span className="text-xs text-slate-400 ml-1">{unidad}</span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition">
      {/* Imagen o placeholder */}
      {service.imageUrl ? (
        <div className="h-36 overflow-hidden">
          <img src={service.imageUrl} alt={service.name}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      ) : (
        <div className="h-20 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <span className="text-slate-300"><WrenchIcon /></span>
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 leading-tight truncate">{service.name}</p>
            {service.category && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                <TagIcon /> {service.category}
              </span>
            )}
          </div>
          <span className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${PRICE_TYPE_COLORS[service.priceType]}`}>
            {PRICE_TYPE_LABELS[service.priceType]}
          </span>
        </div>

        {/* Descripción */}
        {service.description && (
          <p className="text-xs text-slate-500 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: service.description.replace(/<[^>]+>/g, ' ') }} />
        )}

        {/* Precio */}
        <div className="mt-auto pt-2 border-t border-slate-50">
          {priceDisplay()}
        </div>

        {/* Duración */}
        {service.estimatedMinutes && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <ClockIcon /> {fmtMinutes(service.estimatedMinutes)}
          </div>
        )}

        {/* Variantes */}
        {service.hasVariants && activeVariants.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activeVariants.slice(0, 3).map(v => (
              <span key={v.variantId}
                className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">
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

        {/* Acciones */}
        <div className="flex gap-2 mt-1">
          <button onClick={() => onEdit(service)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
            <EditIcon /> Editar
          </button>
          <button onClick={() => onDelete(service)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-red-400 bg-red-50 hover:bg-red-100 transition">
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Variant Row ───────────────────────────────────────────────────────────────
function VariantRow({ variant, service, onUpdate, onRemove }: {
  variant:  ServiceVariant;
  service:  Service;
  onUpdate: (id: string, data: Partial<ServiceVariantPayload>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({
    name:             variant.name,
    description:      variant.description ?? '',
    priceOverride:    variant.priceOverride ?? '',
    priceModifier:    variant.priceModifier ?? '',
    estimatedMinutes: variant.estimatedMinutes ? String(variant.estimatedMinutes) : '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return;
    if (form.priceOverride && form.priceModifier) return; // no pueden ir juntos
    setSaving(true);
    await onUpdate(variant.variantId, {
      name:             form.name.trim(),
      description:      form.description.trim() || undefined,
      priceOverride:    form.priceOverride ? Number(form.priceOverride) : undefined,
      priceModifier:    form.priceModifier ? Number(form.priceModifier) : undefined,
      estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined,
    });
    setSaving(false);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">{variant.name}</p>
          {variant.description && (
            <p className="text-xs text-slate-400 truncate">{variant.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 ml-2 flex-shrink-0">
          <span className="text-sm font-semibold text-slate-700">
            {resolveVariantPrice(service, variant)}
          </span>
          {variant.estimatedMinutes && (
            <span className="flex items-center gap-0.5 text-xs text-slate-400">
              <ClockIcon /> {fmtMinutes(variant.estimatedMinutes)}
            </span>
          )}
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

  const bothPrices = !!(form.priceOverride && form.priceModifier);

  return (
    <div className="px-3 py-3 bg-blue-50/40 rounded-xl space-y-2 border border-blue-100">
      <div className="grid grid-cols-2 gap-2">
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Nombre *"
          className="col-span-2 px-2 py-1.5 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Descripción (opcional)"
          className="col-span-2 px-2 py-1.5 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <div>
          <label className="text-xs text-slate-500 block mb-0.5">Precio fijo (override)</label>
          <input value={form.priceOverride} onChange={e => setForm(f => ({ ...f, priceOverride: e.target.value, priceModifier: '' }))}
            type="number" placeholder="Ej: 80000"
            className={`w-full px-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${bothPrices ? 'border-red-300' : 'border-blue-300'}`} />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-0.5">% sobre precio base</label>
          <input value={form.priceModifier} onChange={e => setForm(f => ({ ...f, priceModifier: e.target.value, priceOverride: '' }))}
            type="number" placeholder="Ej: 30 (+30%)"
            className={`w-full px-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 ${bothPrices ? 'border-red-300' : 'border-blue-300'}`} />
        </div>
        <input value={form.estimatedMinutes} onChange={e => setForm(f => ({ ...f, estimatedMinutes: e.target.value }))}
          type="number" placeholder="Duración (minutos)"
          className="px-2 py-1.5 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>
      {bothPrices && (
        <p className="text-xs text-red-500">Solo usa precio fijo O porcentaje, no ambos.</p>
      )}
      <div className="flex gap-1">
        <button onClick={save} disabled={saving || !form.name.trim() || bothPrices}
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

// ── Service Modal ─────────────────────────────────────────────────────────────
interface ServiceForm {
  name:             string;
  description:      string;
  category:         string;
  imageUrl:         string;
  priceType:        PriceType;
  basePrice:        string;
  minPrice:         string;
  maxPrice:         string;
  costPrice:        string;
  unitLabel:        string;
  hasVariants:      boolean;
  estimatedMinutes: string;
}

const EMPTY_SERVICE_FORM: ServiceForm = {
  name: '', description: '', category: '', imageUrl: '',
  priceType: 'FIXED', basePrice: '', minPrice: '', maxPrice: '',
  costPrice: '', unitLabel: '', hasVariants: false, estimatedMinutes: '',
};

const EMPTY_VARIANT_FORM = {
  name: '', description: '', priceOverride: '', priceModifier: '', estimatedMinutes: '',
};

function ServiceModal({ service, onClose, onSaved }: {
  service:  Service | null;
  onClose:  () => void;
  onSaved:  (s: Service) => void;
}) {
  const isEdit = !!service;

  const [form, setForm] = useState<ServiceForm>(service ? {
    name:             service.name,
    description:      service.description ?? '',
    category:         service.category ?? '',
    imageUrl:         service.imageUrl ?? '',
    priceType:        service.priceType,
    basePrice:        service.basePrice ?? '',
    minPrice:         service.minPrice ?? '',
    maxPrice:         service.maxPrice ?? '',
    costPrice:        service.costPrice ?? '',
    unitLabel:        service.unitLabel ?? '',
    hasVariants:      service.hasVariants,
    estimatedMinutes: service.estimatedMinutes ? String(service.estimatedMinutes) : '',
  } : EMPTY_SERVICE_FORM);

  const [variants,      setVariants]     = useState<ServiceVariant[]>(service?.variants ?? []);
  const [newVariant,    setNewVariant]   = useState(EMPTY_VARIANT_FORM);
  const [addingVar,     setAddingVar]    = useState(false);
  const [saving,        setSaving]       = useState(false);
  const [error,         setError]        = useState('');
  const [tab,           setTab]          = useState<'info' | 'variants'>('info');

  // Custom fields
  const [cfKey,     setCfKey]    = useState('');
  const [cfValue,   setCfValue]  = useState('');
  const [cfFields,  setCfFields] = useState<Record<string, string>>(
    service?.customFields ? Object.fromEntries(
      Object.entries(service.customFields).map(([k, v]) => [k, String(v)])
    ) : {}
  );

  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 50); }, []);

  const set = (k: keyof ServiceForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  const selectedPriceType = PRICE_TYPE_OPTIONS.find(o => o.value === form.priceType);

  // ── Guardar servicio ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('El nombre es requerido');
    if (form.priceType !== 'VARIABLE' && !form.basePrice) return setError('El precio base es requerido para este tipo de precio');
    setSaving(true); setError('');
    try {
      const payload: any = {
        name:             form.name.trim(),
        description:      form.description.trim() || undefined,
        category:         form.category.trim() || undefined,
        imageUrl:         form.imageUrl.trim() || undefined,
        priceType:        form.priceType,
        basePrice:        form.basePrice ? Number(form.basePrice) : undefined,
        minPrice:         form.minPrice ? Number(form.minPrice) : undefined,
        maxPrice:         form.maxPrice ? Number(form.maxPrice) : undefined,
        costPrice:        form.costPrice ? Number(form.costPrice) : undefined,
        unitLabel:        form.unitLabel.trim() || undefined,
        hasVariants:      form.hasVariants,
        estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined,
        customFields:     Object.keys(cfFields).length > 0 ? cfFields : undefined,
      };
      const res = isEdit
        ? await updateService(service!.serviceId, payload)
        : await createService(payload);
      onSaved({ ...res.data, variants });
      onClose();
    } catch {
      setError('Error al guardar. Verifica los datos.');
    } finally {
      setSaving(false);
    }
  };

  // ── Variantes ─────────────────────────────────────────────────────────────
  const handleAddVariant = async () => {
    if (!isEdit || !newVariant.name.trim()) return;
    if (newVariant.priceOverride && newVariant.priceModifier) return setError('Una variante no puede tener precio fijo y porcentaje al mismo tiempo');
    setAddingVar(true); setError('');
    try {
      const res = await addServiceVariant(service!.serviceId, {
        name:             newVariant.name.trim(),
        description:      newVariant.description.trim() || undefined,
        priceOverride:    newVariant.priceOverride ? Number(newVariant.priceOverride) : undefined,
        priceModifier:    newVariant.priceModifier ? Number(newVariant.priceModifier) : undefined,
        estimatedMinutes: newVariant.estimatedMinutes ? Number(newVariant.estimatedMinutes) : undefined,
      });
      setVariants(v => [...v, res.data]);
      setNewVariant(EMPTY_VARIANT_FORM);
    } catch {
      setError('Error al agregar variante');
    } finally {
      setAddingVar(false);
    }
  };

  const handleUpdateVariant = async (variantId: string, data: Partial<ServiceVariantPayload>) => {
    const res = await updateServiceVariant(variantId, data);
    setVariants(v => v.map(x => x.variantId === variantId ? res.data : x));
  };

  const handleRemoveVariant = async (variantId: string) => {
    await deleteServiceVariant(variantId);
    setVariants(v => v.filter(x => x.variantId !== variantId));
  };

  // ── Custom fields ─────────────────────────────────────────────────────────
  const addCf = () => {
    if (!cfKey.trim() || !cfValue.trim()) return;
    setCfFields(f => ({ ...f, [cfKey.trim()]: cfValue.trim() }));
    setCfKey(''); setCfValue('');
  };

  const removeCf = (key: string) => {
    const updated = { ...cfFields };
    delete updated[key];
    setCfFields(updated);
  };

  // ── Margen live ───────────────────────────────────────────────────────────
  const liveMargin = form.basePrice && form.costPrice
    ? Math.round(((Number(form.basePrice) - Number(form.costPrice)) / Number(form.basePrice)) * 100)
    : null;

  // ── Servicio ficticio para VariantRow (necesita service para resolver precio) ──
  const serviceForVariant: Service = {
    ...(service ?? {} as any),
    priceType: form.priceType,
    basePrice: form.basePrice || null,
    unitLabel: form.unitLabel || null,
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-bold text-slate-800">{isEdit ? 'Editar servicio' : 'Nuevo servicio'}</h2>
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

          {/* ── TAB INFO ─────────────────────────────────────────────────── */}
          {tab === 'info' && (
            <>
              {/* Preview imagen */}
              {form.imageUrl && (
                <div className="h-36 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                  <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Nombre *</label>
                <input ref={nameRef} type="text" value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Ej: Corte de cabello, Instalación de paneles, Bartender"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>

              {/* Categoría + URL imagen */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1 flex items-center gap-1">
                    <TagIcon /> Categoría
                  </label>
                  <input type="text" value={form.category}
                    onChange={e => set('category', e.target.value)}
                    placeholder="Ej: Cortes, Reparaciones, Eventos"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">URL imagen</label>
                  <input type="text" value={form.imageUrl}
                    onChange={e => set('imageUrl', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Descripción</label>
                <textarea value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={3} maxLength={50000}
                  placeholder="Describe el servicio para que la IA lo pueda explicar a los clientes..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none" />
                <p className="text-xs text-slate-400 text-right mt-0.5">{form.description.length.toLocaleString()} / 50.000</p>
              </div>

              {/* Tipo de precio */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Modelo de precio *</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {PRICE_TYPE_OPTIONS.map(opt => (
                    <label key={opt.value}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition ${form.priceType === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="priceType" value={opt.value}
                        checked={form.priceType === opt.value}
                        onChange={() => set('priceType', opt.value)}
                        className="text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                        <p className="text-xs text-slate-400">{opt.hint}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRICE_TYPE_COLORS[opt.value]}`}>
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Precio base + unidad */}
              {form.priceType !== 'VARIABLE' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                      Precio base *
                      {form.priceType !== 'FIXED' && form.unitLabel && (
                        <span className="ml-1 font-normal normal-case text-blue-600">/{form.unitLabel}</span>
                      )}
                    </label>
                    <input type="number" value={form.basePrice}
                      onChange={e => set('basePrice', e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  </div>
                  {form.priceType !== 'FIXED' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                        Etiqueta de unidad
                      </label>
                      <input type="text" value={form.unitLabel}
                        onChange={e => set('unitLabel', e.target.value)}
                        placeholder="hora, día, m², panel, persona"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                    </div>
                  )}
                </div>
              )}

              {/* Rango de referencia (VARIABLE) */}
              {form.priceType === 'VARIABLE' && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    💬 Rango de referencia (opcional — orienta al admin al cotizar)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Precio mínimo</label>
                      <input type="number" value={form.minPrice}
                        onChange={e => set('minPrice', e.target.value)}
                        placeholder="50000"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Precio máximo</label>
                      <input type="number" value={form.maxPrice}
                        onChange={e => set('maxPrice', e.target.value)}
                        placeholder="200000"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                    </div>
                  </div>
                </div>
              )}

              {/* Costo + margen */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                  Precio de costo <span className="font-normal normal-case">(para analytics)</span>
                </label>
                <input type="number" value={form.costPrice}
                  onChange={e => set('costPrice', e.target.value)}
                  placeholder="Costo interno del servicio"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                {liveMargin !== null && (
                  <p className={`text-xs font-semibold mt-1 ${liveMargin >= 40 ? 'text-green-600' : liveMargin >= 20 ? 'text-amber-600' : 'text-red-500'}`}>
                    Margen estimado: {liveMargin}%
                  </p>
                )}
              </div>

              {/* Duración estimada */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1 flex items-center gap-1">
                    <ClockIcon /> Duración estimada (min)
                  </label>
                  <input type="number" value={form.estimatedMinutes}
                    onChange={e => set('estimatedMinutes', e.target.value)}
                    placeholder="Ej: 60 = 1h, 90 = 1h 30min"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  {form.estimatedMinutes && Number(form.estimatedMinutes) > 0 && (
                    <p className="text-xs text-blue-600 mt-0.5">{fmtMinutes(Number(form.estimatedMinutes))}</p>
                  )}
                </div>

                {/* Tiene variantes */}
                <div className="flex flex-col justify-end pb-1">
                  <div className="flex items-center justify-between py-2 px-3 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-xs text-slate-600 font-medium">Tiene variantes</span>
                    <button type="button" onClick={() => set('hasVariants', !form.hasVariants)}
                      className="w-10 h-5 rounded-full transition relative flex-shrink-0"
                      style={form.hasVariants ? { background: 'linear-gradient(135deg,#9333ea,#2563eb)' } : { background: '#e2e8f0' }}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.hasVariants ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {form.hasVariants && (
                    <p className="text-xs text-slate-400 mt-1">Ej: Básico/Premium, 2h/4h/Full day</p>
                  )}
                </div>
              </div>

              {/* Campos personalizados */}
              <div className="space-y-2 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Campos personalizados
                  </label>
                  <span className="text-xs text-slate-400">Para la IA y el equipo</span>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-6">
                  {Object.entries(cfFields).map(([k, v]) => (
                    <span key={k}
                      className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                      <span className="font-medium">{k}:</span> {v}
                      <button onClick={() => removeCf(k)} className="hover:text-red-500 ml-0.5">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input value={cfKey} onChange={e => setCfKey(e.target.value)}
                    placeholder="Campo (requiereVisita)"
                    className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input value={cfValue} onChange={e => setCfValue(e.target.value)}
                    placeholder="Valor (true)"
                    className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <button onClick={addCf} type="button"
                    className="px-2 py-1.5 text-xs bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition">
                    +
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button onClick={handleSubmit} disabled={saving}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition"
                style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
                {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear servicio'}
              </button>
            </>
          )}

          {/* ── TAB VARIANTES ──────────────────────────────────────────────── */}
          {tab === 'variants' && (
            <>
              <div className="text-xs text-slate-400 space-y-0.5">
                <p>Cada variante puede tener su propio precio o un porcentaje sobre el precio base.</p>
                <p className="text-blue-600">
                  {selectedPriceType?.hint}
                  {form.basePrice && ` — Precio base: ${fmt(form.basePrice)}`}
                </p>
              </div>

              {variants.filter(v => v.isActive).length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-6">Sin variantes aún</p>
              ) : (
                <div className="space-y-1">
                  {variants.filter(v => v.isActive).map(v => (
                    <VariantRow key={v.variantId} variant={v} service={serviceForVariant}
                      onUpdate={handleUpdateVariant}
                      onRemove={handleRemoveVariant} />
                  ))}
                </div>
              )}

              {/* Nueva variante */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nueva variante</p>
                <div className="grid grid-cols-2 gap-2">
                  <input value={newVariant.name}
                    onChange={e => setNewVariant(v => ({ ...v, name: e.target.value }))}
                    placeholder="Nombre * (ej: Básica, Express, Premium)"
                    className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  <input value={newVariant.description}
                    onChange={e => setNewVariant(v => ({ ...v, description: e.target.value }))}
                    placeholder="Descripción (opcional)"
                    className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Precio fijo</label>
                    <input value={newVariant.priceOverride}
                      onChange={e => setNewVariant(v => ({ ...v, priceOverride: e.target.value, priceModifier: '' }))}
                      type="number" placeholder="Ej: 80000"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">% sobre base</label>
                    <input value={newVariant.priceModifier}
                      onChange={e => setNewVariant(v => ({ ...v, priceModifier: e.target.value, priceOverride: '' }))}
                      type="number" placeholder="Ej: 30 (+30%)"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  </div>
                  <input value={newVariant.estimatedMinutes}
                    onChange={e => setNewVariant(v => ({ ...v, estimatedMinutes: e.target.value }))}
                    type="number" placeholder="Duración (min)"
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button onClick={handleAddVariant}
                  disabled={addingVar || !newVariant.name.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition"
                  style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
                  {addingVar ? 'Agregando...' : <><PlusIcon /> Agregar variante</>}
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
export default function Services() {
  const [services,       setServices]      = useState<Service[]>([]);
  const [loading,        setLoading]       = useState(true);
  const [search,         setSearch]        = useState('');
  const [filterType,     setFilterType]    = useState<PriceType | 'all'>('all');
  const [filterCat,      setFilterCat]     = useState('');
  const [modalService,   setModalService]  = useState<Service | null | 'new'>(null);
  const [deleteTarget,   setDeleteTarget]  = useState<Service | null>(null);
  const [deleting,       setDeleting]      = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getServices()
      .then(res => setServices(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (saved: Service) => {
    setServices(prev => {
      const exists = prev.find(s => s.serviceId === saved.serviceId);
      return exists
        ? prev.map(s => s.serviceId === saved.serviceId ? saved : s)
        : [saved, ...prev];
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteService(deleteTarget.serviceId);
    setServices(prev => prev.filter(s => s.serviceId !== deleteTarget.serviceId));
    setDeleteTarget(null);
    setDeleting(false);
  };

  // Categorías únicas para filtro
  const categories = Array.from(new Set(services.map(s => s.category).filter(Boolean))) as string[];

  const filtered = services.filter(s => {
    const q           = search.toLowerCase();
    const matchSearch = !q ||
      s.name.toLowerCase().includes(q) ||
      (s.category ?? '').toLowerCase().includes(q) ||
      (s.description ?? '').replace(/<[^>]+>/g, ' ').toLowerCase().includes(q);
    const matchType = filterType === 'all' || s.priceType === filterType;
    const matchCat  = !filterCat || s.category === filterCat;
    return matchSearch && matchType && matchCat;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Servicios</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {loading ? '...' : `${services.length} servicio${services.length !== 1 ? 's' : ''} activo${services.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button onClick={() => setModalService('new')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
              <PlusIcon /> Nuevo servicio
            </button>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o descripción..."
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-64" />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600">
              <option value="all">Todos los tipos</option>
              {PRICE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {categories.length > 0 && (
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600">
                <option value="">Todas las categorías</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {(search || filterType !== 'all' || filterCat) && (
              <button onClick={() => { setSearch(''); setFilterType('all'); setFilterCat(''); }}
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
            <WrenchIcon />
            <p className="text-sm">
              {search || filterType !== 'all' || filterCat
                ? 'Sin resultados para este filtro'
                : 'Sin servicios aún'}
            </p>
            {!search && filterType === 'all' && !filterCat && (
              <button onClick={() => setModalService('new')}
                className="mt-1 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg,#2563eb,#9333ea)' }}>
                Crear primer servicio
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(s => (
              <ServiceCard key={s.serviceId} service={s}
                onEdit={svc => setModalService(svc)}
                onDelete={setDeleteTarget} />
            ))}
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {modalService !== null && (
        <ServiceModal
          service={modalService === 'new' ? null : modalService}
          onClose={() => setModalService(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Confirm eliminar */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 mb-2">¿Eliminar servicio?</h3>
            <p className="text-sm text-slate-500 mb-5">
              <span className="font-semibold">{deleteTarget.name}</span> será desactivado junto con todas sus variantes.
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
