import { useCallback, useEffect, useState } from 'react';
import {
  getPromotions, createPromotion, updatePromotion, deletePromotion,
} from '../../services/api';
import type { PromotionDto, PromotionType, PromotionInput } from '../../services/api';
import { serverMessage } from '../../utils/serverMessage';

// ── Icons ─────────────────────────────────────────────────────────────────────
const TrashIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>);

const ic = 'w-full px-3 py-2 rounded-xl border border-border-default bg-surface-elevated focus:outline-none focus:ring-2 focus:bg-surface transition text-sm text-txt-primary placeholder:text-txt-tertiary';
const card = 'bg-surface rounded-2xl shadow-sm border border-border-subtle p-5 space-y-4';

interface Props {
  products: { productId: string; name: string }[];
  categories: { categoryId: string; name: string }[];
  disabled: boolean;
  onError: (msg: string) => void;
}

// Orden de las casillas (lunes primero); el valor es el día del servidor (0 = domingo).
const DAYS: { value: number; short: string; label: string }[] = [
  { value: 1, short: 'L', label: 'Lunes' },
  { value: 2, short: 'M', label: 'Martes' },
  { value: 3, short: 'X', label: 'Miércoles' },
  { value: 4, short: 'J', label: 'Jueves' },
  { value: 5, short: 'V', label: 'Viernes' },
  { value: 6, short: 'S', label: 'Sábado' },
  { value: 0, short: 'D', label: 'Domingo' },
];
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const TYPES: { value: PromotionType; label: string }[] = [
  { value: 'percent', label: '% de descuento' },
  { value: 'amount', label: '$ menos' },
  { value: 'buy_n_pay_m', label: 'Lleva N paga M' },
  { value: 'fixed_price', label: 'Precio especial' },
];

interface Form {
  name: string;
  type: PromotionType;
  value: string;
  buyN: string;
  payM: string;
  days: number[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  productIds: string[];
  categoryIds: string[];
}

const emptyForm = (): Form => ({
  name: '', type: 'percent', value: '', buyN: '2', payM: '1', days: [],
  startTime: '', endTime: '', startDate: '', endDate: '', productIds: [], categoryIds: [],
});

const money = (n: number) => `$${n.toLocaleString('es-CO')}`;

/** Misma frase que arma el servidor; la que vale es la que devuelve tras guardar. */
function previewText(f: Form, names: { products: string[]; categories: string[] }): string {
  const days = f.days.length === 0 || f.days.length === 7
    ? 'Todos los días'
    : (() => {
        const t = [...f.days].sort((a, b) => a - b).map((d) => DAY_NAMES[d]).join(', ');
        return t.charAt(0).toUpperCase() + t.slice(1);
      })();
  const hours = f.startTime && f.endTime ? `de ${f.startTime} a ${f.endTime}` : 'todo el día';
  const v = Number(f.value);
  let effect: string;
  switch (f.type) {
    case 'percent': effect = `${v || 0}% de descuento`; break;
    case 'amount': effect = `${money(v || 0)} menos`; break;
    case 'buy_n_pay_m': effect = `${f.buyN || 0}x${f.payM || 0}`; break;
    default: effect = `a ${money(v || 0)}`;
  }
  const targets = [...names.categories, ...names.products];
  return `${days}, ${hours}: ${effect} en ${targets.length ? targets.join(', ') : 'productos sin definir'}`;
}

/** Fecha ISO del servidor -> YYYY-MM-DD en hora de Bogotá. */
function bogotaDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(iso));
}

function Switch({ value, onChange, disabled, label }: { value: boolean; onChange: () => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" onClick={onChange} disabled={disabled} aria-pressed={value} aria-label={label}
      className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${value ? 'bg-lime' : 'bg-border-default'}`}>
      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : ''}`} />
    </button>
  );
}

export default function PromotionsPanel({ products, categories, disabled, onError }: Props) {
  const [promos, setPromos] = useState<PromotionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await getPromotions();
      setPromos(r.data);
    } catch (err) {
      onError(serverMessage(err, 'No se pudieron cargar las promociones'));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { load(); }, [load]);

  const busy = disabled || pending;

  /** Escritura con el error del servidor mostrado en el panel y la lista recargada. */
  const run = async (fn: () => Promise<unknown>, fallback: string): Promise<boolean> => {
    setPending(true); onError('');
    let ok = false;
    try {
      await fn();
      ok = true;
    } catch (err) {
      onError(serverMessage(err, fallback));
    } finally {
      await load();
      setPending(false);
    }
    return ok;
  };

  const toggleActive = (p: PromotionDto) =>
    run(() => updatePromotion(p.promotionId, { active: !p.active }), 'No se pudo cambiar la promoción');

  const remove = (p: PromotionDto) => {
    setConfirmId(null);
    run(() => deletePromotion(p.promotionId), 'No se pudo eliminar la promoción');
  };

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleIn = (k: 'days' | 'productIds' | 'categoryIds', v: any) =>
    setForm((f) => ({ ...f, [k]: (f[k] as any[]).includes(v) ? (f[k] as any[]).filter((x) => x !== v) : [...(f[k] as any[]), v] }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) return setFormError('Ponle un nombre a la promoción');
    if (form.productIds.length === 0 && form.categoryIds.length === 0) return setFormError('Elige al menos una sección o un producto');
    if (!!form.startTime !== !!form.endTime) return setFormError('El horario necesita hora de inicio y de fin, o ninguna');
    if (form.type === 'buy_n_pay_m') {
      if (!(Number(form.buyN) > Number(form.payM) && Number(form.payM) >= 1)) return setFormError('"Lleva N" debe ser mayor que "paga M"');
    } else if (!(Number(form.value) > 0)) {
      return setFormError('Indica el valor de la promoción');
    }

    const body: PromotionInput = {
      name: form.name.trim(),
      type: form.type,
      daysOfWeek: form.days,
      productIds: form.productIds,
      categoryIds: form.categoryIds,
    };
    if (form.type === 'buy_n_pay_m') { body.buyN = Number(form.buyN); body.payM = Number(form.payM); }
    else body.value = Number(form.value);
    if (form.startTime && form.endTime) { body.startTime = form.startTime; body.endTime = form.endTime; }
    if (form.startDate) body.startsAt = `${form.startDate}T00:00:00-05:00`;
    if (form.endDate) body.endsAt = `${form.endDate}T00:00:00-05:00`;

    const ok = await run(() => createPromotion(body), 'No se pudo crear la promoción');
    if (ok) setForm(emptyForm());
  };

  const preview = previewText(form, {
    products: products.filter((p) => form.productIds.includes(p.productId)).map((p) => p.name),
    categories: categories.filter((c) => form.categoryIds.includes(c.categoryId)).map((c) => c.name),
  });

  const chip = (on: boolean) =>
    `inline-flex items-center justify-center min-w-[2.25rem] h-9 px-2 rounded-xl border text-sm font-semibold cursor-pointer transition ${on ? 'bg-lime text-white border-lime' : 'bg-surface-elevated text-txt-secondary border-border-default'} ${busy ? 'opacity-50 cursor-not-allowed' : ''}`;

  return (
    <section className={card} aria-labelledby="promos-title">
      <div>
        <h2 id="promos-title" className="font-semibold text-txt-primary text-sm">Promociones</h2>
        <p className="text-xs text-txt-tertiary">Se aplican solas en la tienda y en los pedidos por WhatsApp, según día, horario y fechas</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" /></div>
      ) : promos.length === 0 ? (
        <p className="text-sm text-txt-tertiary">Aún no hay promociones.</p>
      ) : (
        <ul className="space-y-2">
          {promos.map((p) => (
            <li key={p.promotionId} className="rounded-xl border border-border-subtle bg-surface-elevated p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-txt-primary break-words">{p.name}</p>
                  <p className="text-xs text-txt-secondary mt-0.5 break-words">{p.summary}</p>
                  {(p.startsAt || p.endsAt) && (
                    <p className="text-xs text-txt-tertiary mt-0.5">
                      {p.startsAt ? `Desde ${bogotaDate(p.startsAt)}` : ''}{p.startsAt && p.endsAt ? ' ' : ''}{p.endsAt ? `hasta ${bogotaDate(p.endsAt)}` : ''}
                    </p>
                  )}
                </div>
                <Switch value={p.active} onChange={() => toggleActive(p)} disabled={busy} label={`${p.active ? 'Desactivar' : 'Activar'} ${p.name}`} />
                <button type="button" onClick={() => setConfirmId(p.promotionId)} disabled={busy} aria-label={`Eliminar ${p.name}`}
                  className="p-2 rounded-lg text-txt-tertiary hover:text-error hover:bg-error/10 transition disabled:opacity-50">
                  <TrashIcon />
                </button>
              </div>
              {confirmId === p.promotionId && (
                <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-txt-primary flex-1 min-w-[10rem]">¿Eliminar esta promoción? Los pedidos ya hechos no cambian.</span>
                  <button type="button" onClick={() => setConfirmId(null)}
                    className="px-3 py-1.5 rounded-xl text-sm font-medium bg-surface-overlay text-txt-secondary hover:bg-border-default transition">
                    Cancelar
                  </button>
                  <button type="button" onClick={() => remove(p)} disabled={busy}
                    className="px-3 py-1.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50">
                    Eliminar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="space-y-4 border-t border-border-subtle pt-4" aria-label="Nueva promoción">
        <h3 className="text-sm font-semibold text-txt-primary">Nueva promoción</h3>

        <div>
          <label htmlFor="promo-name" className="block text-xs font-medium text-txt-secondary mb-1">Nombre</label>
          <input id="promo-name" className={ic} value={form.name} maxLength={80} disabled={busy}
            onChange={(e) => set('name', e.target.value)} placeholder="Jueves de 2x1" />
        </div>

        <fieldset>
          <legend className="block text-xs font-medium text-txt-secondary mb-1">Tipo</legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TYPES.map((t) => (
              <button key={t.value} type="button" aria-pressed={form.type === t.value} disabled={busy}
                onClick={() => set('type', t.value)}
                className={`px-3 py-2 rounded-xl border text-sm font-medium transition disabled:opacity-50 ${form.type === t.value ? 'bg-lime text-white border-lime' : 'bg-surface-elevated text-txt-secondary border-border-default'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        {form.type === 'buy_n_pay_m' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="promo-buyn" className="block text-xs font-medium text-txt-secondary mb-1">Lleva (N)</label>
              <input id="promo-buyn" type="number" inputMode="numeric" min={2} className={ic} value={form.buyN} disabled={busy}
                onChange={(e) => set('buyN', e.target.value)} />
            </div>
            <div>
              <label htmlFor="promo-paym" className="block text-xs font-medium text-txt-secondary mb-1">Paga (M)</label>
              <input id="promo-paym" type="number" inputMode="numeric" min={1} className={ic} value={form.payM} disabled={busy}
                onChange={(e) => set('payM', e.target.value)} />
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="promo-value" className="block text-xs font-medium text-txt-secondary mb-1">
              {form.type === 'percent' ? 'Porcentaje de descuento' : form.type === 'amount' ? 'Valor a descontar (COP)' : 'Precio especial (COP)'}
            </label>
            <input id="promo-value" type="number" inputMode="numeric" min={1} className={ic} value={form.value} disabled={busy}
              onChange={(e) => set('value', e.target.value)} />
          </div>
        )}

        <fieldset>
          <legend className="block text-xs font-medium text-txt-secondary mb-1">Días <span className="text-txt-tertiary font-normal">(ninguno = todos los días)</span></legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <label key={d.value} className={chip(form.days.includes(d.value))}>
                <input type="checkbox" className="sr-only" aria-label={d.label} checked={form.days.includes(d.value)} disabled={busy}
                  onChange={() => toggleIn('days', d.value)} />
                <span aria-hidden="true">{d.short}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <fieldset>
            <legend className="block text-xs font-medium text-txt-secondary mb-1">Horario <span className="text-txt-tertiary font-normal">(opcional)</span></legend>
            <div className="grid grid-cols-2 gap-2">
              <input type="time" aria-label="Hora de inicio" className={ic} value={form.startTime} disabled={busy}
                onChange={(e) => set('startTime', e.target.value)} />
              <input type="time" aria-label="Hora de fin" className={ic} value={form.endTime} disabled={busy}
                onChange={(e) => set('endTime', e.target.value)} />
            </div>
          </fieldset>
          <fieldset>
            <legend className="block text-xs font-medium text-txt-secondary mb-1">Fechas <span className="text-txt-tertiary font-normal">(opcional)</span></legend>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" aria-label="Desde" className={ic} value={form.startDate} disabled={busy}
                onChange={(e) => set('startDate', e.target.value)} />
              <input type="date" aria-label="Hasta" className={ic} value={form.endDate} disabled={busy}
                onChange={(e) => set('endDate', e.target.value)} />
            </div>
          </fieldset>
        </div>

        <fieldset>
          <legend className="block text-xs font-medium text-txt-secondary mb-1">Aplica a</legend>
          {categories.length === 0 && products.length === 0 ? (
            <p className="text-xs text-txt-tertiary">Aún no hay secciones ni productos.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-xl border border-border-default bg-surface-elevated p-2 space-y-0.5">
              {categories.length > 0 && <p className="px-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-txt-tertiary">Secciones</p>}
              {categories.map((c) => (
                <label key={c.categoryId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-txt-primary hover:bg-surface-overlay cursor-pointer">
                  <input type="checkbox" checked={form.categoryIds.includes(c.categoryId)} disabled={busy}
                    onChange={() => toggleIn('categoryIds', c.categoryId)} />
                  <span className="min-w-0 break-words">{c.name}</span>
                </label>
              ))}
              {products.length > 0 && <p className="px-2 pt-2 text-[11px] font-semibold uppercase tracking-wide text-txt-tertiary">Productos</p>}
              {products.map((p) => (
                <label key={p.productId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-txt-primary hover:bg-surface-overlay cursor-pointer">
                  <input type="checkbox" checked={form.productIds.includes(p.productId)} disabled={busy}
                    onChange={() => toggleIn('productIds', p.productId)} />
                  <span className="min-w-0 break-words">{p.name}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="rounded-xl bg-surface-overlay px-3 py-2 text-xs text-txt-secondary" aria-live="polite">
          <span className="font-semibold text-txt-primary">Vista previa: </span>{preview}
        </div>

        {formError && <p role="alert" className="text-xs text-error">{formError}</p>}

        <button type="submit" disabled={busy}
          className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium bg-lime text-white hover:opacity-90 transition disabled:opacity-50">
          Crear promoción
        </button>
      </form>
    </section>
  );
}
