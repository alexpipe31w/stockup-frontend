import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getCategories, updateCategory, getProducts,
  getOptionGroups, createOptionGroup, updateOptionGroup, deleteOptionGroup,
  createOption, updateOption, deleteOption,
} from '../services/api';
import type { OptionGroupDto, MenuOptionDto } from '../services/api';
import { useStoreFlags } from '../hooks/useStoreFlags';

// ── Icons ─────────────────────────────────────────────────────────────────────
const PlusIcon  = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>);
const TrashIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>);
const UpIcon    = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>);
const DownIcon  = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>);

interface Category { categoryId: string; name: string; description: string | null; sortOrder: number }

const ic = 'w-full px-3 py-2 rounded-xl border border-border-default bg-surface-elevated focus:outline-none focus:ring-2 focus:bg-surface transition text-sm text-txt-primary placeholder:text-txt-tertiary';
const card = 'bg-surface rounded-2xl shadow-sm border border-border-subtle p-5 space-y-4';
const cop = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

/** El mensaje del servidor tal cual (class-validator lo manda como lista). */
function serverMessage(err: any, fallback: string): string {
  const m = err?.response?.data?.message;
  if (Array.isArray(m)) return m.join('. ');
  return typeof m === 'string' && m ? m : fallback;
}

function Switch({ value, onChange, disabled }: { value: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onChange} disabled={disabled} aria-pressed={value}
      className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${value ? 'bg-lime' : 'bg-border-default'}`}>
      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : ''}`} />
    </button>
  );
}

export default function Menu() {
  const { kitchenEnabled, loading: flagsLoading } = useStoreFlags();
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<OptionGroupDto[]>([]);
  const [products, setProducts] = useState<{ productId: string; name: string; hasVariants: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OptionGroupDto | null>(null);
  const [newGroup, setNewGroup] = useState({ name: '', required: false, maxSelect: 1 });

  const load = useCallback(async () => {
    try {
      const [c, g, p] = await Promise.all([getCategories(), getOptionGroups(), getProducts()]);
      setCategories(c.data);
      setProducts((p.data as any[]).filter((x) => x.isActive !== false && !x.hasVariants)
        .map((x) => ({ productId: x.productId, name: x.name, hasVariants: x.hasVariants })));
      setGroups(g.data);
    } catch (err) {
      setError(serverMessage(err, 'No se pudo cargar el menú'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Ejecuta una escritura, muestra el error del servidor y recarga lo guardado. */
  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setBusy(true); setError('');
    try {
      await fn();
    } catch (err) {
      setError(serverMessage(err, fallback));
    } finally {
      await load();
      setBusy(false);
    }
  };

  // ── Secciones ───────────────────────────────────────────────────────────
  const moveCategory = (idx: number, dir: -1 | 1) => {
    const next = [...categories];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    // Se renumeran todas: con órdenes repetidos (todas en 0) un simple intercambio no movería nada.
    const changed = next.map((c, i) => ({ c, i })).filter(({ c, i }) => c.sortOrder !== i);
    setCategories(next.map((c, i) => ({ ...c, sortOrder: i })));
    run(() => Promise.all(changed.map(({ c, i }) => updateCategory(c.categoryId, { sortOrder: i }))), 'No se pudo reordenar');
  };

  const saveDescription = (c: Category, description: string) => {
    if ((c.description ?? '') === description.trim()) return;
    run(() => updateCategory(c.categoryId, { description: description.trim() }), 'No se pudo guardar la descripción');
  };

  // ── Grupos ──────────────────────────────────────────────────────────────
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name.trim()) return setError('Ponle un nombre al grupo');
    const minSelect = newGroup.required ? 1 : 0;
    const maxSelect = Math.max(newGroup.maxSelect, minSelect, 1);
    run(async () => {
      await createOptionGroup({ name: newGroup.name.trim(), minSelect, maxSelect, sortOrder: groups.length });
      setNewGroup({ name: '', required: false, maxSelect: 1 });
    }, 'No se pudo crear el grupo');
  };

  const handleDeleteGroup = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    run(() => deleteOptionGroup(target.groupId), 'No se pudo eliminar el grupo');
  };

  if (loading || flagsLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-canvas pb-24 md:pb-6">
      <div className="bg-surface border-b border-border-subtle px-6 py-5 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-txt-primary">Menú</h1>
          <p className="text-sm text-txt-tertiary mt-0.5">Secciones del menú y opciones que el cliente elige (término, adiciones, sabores)</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {!kitchenEnabled && (
          <div className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-txt-primary">
            El módulo de restaurante está apagado: puedes ver el menú, pero para editarlo actívalo en{' '}
            <Link to="/config" className="font-semibold text-lime underline">Configuración</Link>.
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-2xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error flex items-start justify-between gap-3">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-xs font-semibold">Cerrar</button>
          </div>
        )}

        {/* Secciones */}
        <section className={card}>
          <div>
            <h2 className="font-semibold text-txt-primary text-sm">Secciones</h2>
            <p className="text-xs text-txt-tertiary">Son las categorías de Productos, en el orden en que salen en la tienda</p>
          </div>
          {categories.length === 0 ? (
            <p className="text-sm text-txt-tertiary">Aún no hay categorías. Créalas desde Productos.</p>
          ) : (
            <ul className="space-y-2">
              {categories.map((c, idx) => (
                <li key={c.categoryId} className="flex items-start gap-3 rounded-xl border border-border-subtle px-3 py-2">
                  <div className="flex flex-col gap-1 pt-1">
                    <button type="button" aria-label="Subir" disabled={busy || idx === 0} onClick={() => moveCategory(idx, -1)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-txt-tertiary hover:bg-surface-overlay disabled:opacity-30"><UpIcon /></button>
                    <button type="button" aria-label="Bajar" disabled={busy || idx === categories.length - 1} onClick={() => moveCategory(idx, 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-txt-tertiary hover:bg-surface-overlay disabled:opacity-30"><DownIcon /></button>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-txt-primary">{c.name}</p>
                    <input defaultValue={c.description ?? ''} maxLength={300} placeholder="Descripción (opcional)"
                      onBlur={(e) => saveDescription(c, e.target.value)} className={ic} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Grupos de opciones */}
        <section className="space-y-4">
          <div>
            <h2 className="font-semibold text-txt-primary text-sm">Grupos de opciones</h2>
            <p className="text-xs text-txt-tertiary">Se asignan a cada producto desde Productos. El precio extra se suma al del producto.</p>
          </div>

          {groups.map((g) => (
            <GroupCard key={g.groupId} group={g} products={products} busy={busy} run={run} onDelete={() => setDeleteTarget(g)} />
          ))}

          <form onSubmit={handleCreateGroup} className={card}>
            <h3 className="font-semibold text-txt-primary text-sm">Nuevo grupo</h3>
            <input value={newGroup.name} onChange={(e) => setNewGroup((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ej: Término de la carne, Adiciones, Sabores" maxLength={80} className={ic} />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <label className="flex items-center gap-3 text-sm text-txt-primary">
                <Switch value={newGroup.required} onChange={() => setNewGroup((p) => ({ ...p, required: !p.required }))} />
                Obligatorio
              </label>
              <label className="flex items-center gap-2 text-sm text-txt-primary">
                Máximo a elegir
                <input type="number" min={1} max={20} value={newGroup.maxSelect}
                  onChange={(e) => setNewGroup((p) => ({ ...p, maxSelect: Number(e.target.value) || 1 }))}
                  className="w-20 px-3 py-2 rounded-xl border border-border-default bg-surface-elevated text-sm text-txt-primary" />
              </label>
            </div>
            <button type="submit" disabled={busy || !kitchenEnabled}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[#0A0A0F] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}>
              <PlusIcon /> Crear grupo
            </button>
          </form>
        </section>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4">
          <div role="dialog" aria-modal="true" className="bg-surface rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-txt-primary mb-2">¿Eliminar grupo?</h3>
            <p className="text-sm text-txt-secondary mb-5">
              <span className="font-semibold">{deleteTarget.name}</span> y sus {deleteTarget.options.length} opciones dejarán de
              ofrecerse en {deleteTarget.productIds.length} producto{deleteTarget.productIds.length !== 1 ? 's' : ''}. Los pedidos ya hechos no cambian.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-surface-overlay text-txt-secondary hover:bg-border-default transition">
                Cancelar
              </button>
              <button onClick={handleDeleteGroup}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tarjeta de un grupo ───────────────────────────────────────────────────────

function GroupCard({ group: g, products, busy, run, onDelete }: {
  group: OptionGroupDto;
  products: { productId: string; name: string; hasVariants: boolean }[];
  busy: boolean;
  run: (fn: () => Promise<unknown>, fallback: string) => Promise<void>;
  onDelete: () => void;
}) {
  const required = g.minSelect >= 1;
  const [newOption, setNewOption] = useState({ name: '', price: '' });

  const patch = (data: Parameters<typeof updateOptionGroup>[1]) =>
    run(() => updateOptionGroup(g.groupId, data), 'No se pudo guardar el grupo');

  const toggleRequired = () =>
    patch(required ? { minSelect: 0 } : { minSelect: 1, maxSelect: Math.max(g.maxSelect, 1) });

  const saveNumber = (key: 'minSelect' | 'maxSelect', raw: string) => {
    const n = Number(raw);
    if (!Number.isInteger(n) || n === g[key]) return;
    patch({ [key]: n });
  };

  const addOption = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newOption.name.trim();
    const priceDelta = newOption.price.trim() === '' ? 0 : Number(newOption.price);
    if (!name || !Number.isInteger(priceDelta) || priceDelta < 0) return;
    run(async () => {
      await createOption(g.groupId, { name, priceDelta });
      setNewOption({ name: '', price: '' });
    }, 'No se pudo añadir la opción');
  };

  const toggleSoldOut = (o: MenuOptionDto) =>
    run(() => updateOption(o.optionId, { available: !o.available }), 'No se pudo cambiar la opción');

  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-3">
        <input defaultValue={g.name} maxLength={80} aria-label="Nombre del grupo"
          onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== g.name && patch({ name: e.target.value.trim() })}
          className={`${ic} font-semibold`} />
        <button type="button" onClick={onDelete} disabled={busy} aria-label={`Eliminar ${g.name}`}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-txt-tertiary hover:text-error hover:bg-error/10 flex-shrink-0 disabled:opacity-50">
          <TrashIcon />
        </button>
      </div>
      <p className="text-xs text-txt-tertiary">Conecta una opción a un producto para combos: si el producto se agota, la opción también, y al venderse descuenta su stock.</p>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-txt-primary">
        <label className="flex items-center gap-3">
          <Switch value={required} onChange={toggleRequired} disabled={busy} />
          Obligatorio
        </label>
        <label className="flex items-center gap-2">
          Mínimo
          <input type="number" min={0} max={20} defaultValue={g.minSelect} key={`min-${g.minSelect}`}
            onBlur={(e) => saveNumber('minSelect', e.target.value)}
            className="w-16 px-2 py-1.5 rounded-lg border border-border-default bg-surface-elevated text-sm" />
        </label>
        <label className="flex items-center gap-2">
          Máximo
          <input type="number" min={1} max={20} defaultValue={g.maxSelect} key={`max-${g.maxSelect}`}
            onBlur={(e) => saveNumber('maxSelect', e.target.value)}
            className="w-16 px-2 py-1.5 rounded-lg border border-border-default bg-surface-elevated text-sm" />
        </label>
        <label className="flex items-center gap-2" title={required ? 'Un grupo obligatorio siempre lo pregunta la IA' : undefined}>
          <input type="checkbox" checked={required || g.aiAsks} disabled={required || busy}
            onChange={() => patch({ aiAsks: !g.aiAsks })} />
          La IA lo pregunta
        </label>
        <span className="text-xs text-txt-tertiary">
          En {g.productIds.length} producto{g.productIds.length !== 1 ? 's' : ''}
        </span>
      </div>

      <ul className="divide-y divide-border-subtle rounded-xl border border-border-subtle">
        {g.options.length === 0 && (
          <li className="px-3 py-2 text-sm text-txt-tertiary">Sin opciones todavía</li>
        )}
        {g.options.map((o) => (
          <li key={o.optionId} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
            <span className={`flex-1 min-w-0 truncate text-sm ${o.available ? 'text-txt-primary' : 'text-txt-tertiary line-through'}`}>{o.name}</span>
            <span className="text-sm text-txt-secondary tabular-nums">
              {Number(o.priceDelta) > 0 ? `+${cop(Number(o.priceDelta))}` : 'Sin costo'}
            </span>
            <select value={o.linkedProductId ?? ''} disabled={busy}
              aria-label={`Producto que descuenta ${o.name}`}
              onChange={(e) => run(() => updateOption(o.optionId, { linkedProductId: e.target.value || null }), 'No se pudo conectar la opción')}
              className="max-w-[11rem] px-2 py-1.5 rounded-lg border border-border-default bg-surface-elevated text-xs text-txt-secondary">
              <option value="">Sin producto</option>
              {o.linkedProduct && !products.some((p) => p.productId === o.linkedProduct!.productId) && (
                <option value={o.linkedProduct.productId}>{o.linkedProduct.name}</option>
              )}
              {products.map((p) => <option key={p.productId} value={p.productId}>{p.name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-xs text-txt-secondary">
              <Switch value={!o.available} onChange={() => toggleSoldOut(o)} disabled={busy} />
              Agotado
            </label>
            <button type="button" aria-label={`Eliminar ${o.name}`} disabled={busy}
              onClick={() => run(() => deleteOption(o.optionId), 'No se pudo eliminar la opción')}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-txt-tertiary hover:text-error hover:bg-error/10 disabled:opacity-50">
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={addOption} className="flex flex-col sm:flex-row sm:items-center gap-2">
        <input value={newOption.name} onChange={(e) => setNewOption((p) => ({ ...p, name: e.target.value }))}
          placeholder="Nueva opción" maxLength={80} className={`${ic} sm:flex-1 sm:w-auto`} />
        <input value={newOption.price} onChange={(e) => setNewOption((p) => ({ ...p, price: e.target.value.replace(/\D/g, '') }))}
          inputMode="numeric" placeholder="Precio extra (0)" aria-label="Precio extra en pesos" className={`${ic} sm:w-40`} />
        <button type="submit" disabled={busy || !newOption.name.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-default text-sm font-semibold text-txt-secondary hover:bg-surface-elevated disabled:opacity-50">
          <PlusIcon /> Añadir
        </button>
      </form>
    </div>
  );
}
