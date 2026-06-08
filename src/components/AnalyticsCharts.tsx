import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, MessageCircle, CalendarCheck, ShoppingBag } from 'lucide-react';

// ── Paleta compartida (recharts necesita colores explícitos, no clases Tailwind) ─
const LIME       = '#D4FF00';
const LIME_DARK  = '#A3CC00';
const BLUE       = '#3B82F6';
const GRID       = '#1E1E28';
const TXT_MUTED  = '#5A5A6A';
const SURFACE_EL = '#1C1C24';

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-elevated border border-border-default rounded-xl px-3 py-2 shadow-lg text-xs">
      {label && <p className="text-txt-tertiary mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-txt-primary font-semibold">
          {formatter ? formatter(p.value, p.name) : p.value}
        </p>
      ))}
    </div>
  );
}

// ── Card wrapper común ────────────────────────────────────────────────────────
function ChartCard({ title, icon, children, empty }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; empty?: boolean;
}) {
  return (
    <div className="bg-surface rounded-2xl border border-border-subtle p-5">
      <p className="text-sm font-semibold text-txt-primary mb-4 flex items-center gap-2">
        {icon}{title}
      </p>
      {empty ? (
        <div className="h-40 flex items-center justify-center">
          <p className="text-xs text-txt-tertiary">Sin datos suficientes para este período</p>
        </div>
      ) : children}
    </div>
  );
}

// ── 1. Tendencia ──────────────────────────────────────────────────────────────
type SeriesPoint = { date: string; revenue: number; appointments: number; conversations: number };
const TREND_METRICS = [
  { id: 'revenue',       label: 'Ingresos',        color: LIME, fmt: (v: number) => `$${fmtCOP(v)}` },
  { id: 'appointments',  label: 'Citas',           color: BLUE, fmt: (v: number) => String(v) },
  { id: 'conversations', label: 'Conversaciones',  color: '#A78BFA', fmt: (v: number) => String(v) },
] as const;

export function TrendCard({ series }: { series: SeriesPoint[] }) {
  const [metric, setMetric] = useState<typeof TREND_METRICS[number]['id']>('revenue');
  const active = TREND_METRICS.find(m => m.id === metric)!;
  const empty = series.length < 2 || series.every(p => p.revenue === 0 && p.appointments === 0 && p.conversations === 0);

  return (
    <ChartCard title="Tendencia" icon={<TrendingUp size={16} className="text-txt-tertiary" />} empty={empty}>
      <div className="flex items-center gap-1.5 mb-3">
        {TREND_METRICS.map(m => (
          <button key={m.id} onClick={() => setMetric(m.id)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              metric === m.id ? 'bg-surface-overlay text-txt-primary' : 'text-txt-tertiary hover:text-txt-secondary'
            }`}>
            {m.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${active.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={active.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={active.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fill: TXT_MUTED, fontSize: 10 }} axisLine={{ stroke: GRID }} tickLine={false}
            tickFormatter={(d: string) => d.slice(5).replace('-', '/')} minTickGap={24} />
          <YAxis hide />
          <Tooltip content={<ChartTooltip formatter={active.fmt} />} cursor={{ stroke: GRID }} />
          <Area type="monotone" dataKey={active.id} stroke={active.color} strokeWidth={2}
            fill={`url(#grad-${active.id})`} animationDuration={500} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ── 2. Comparativa entre períodos ─────────────────────────────────────────────
type ComparisonStat = { current: number; previous: number; pctChange: number };
const COMPARISON_LABELS: Record<string, { label: string; fmt: (v: number) => string }> = {
  revenue:      { label: 'Ingresos',        fmt: (v) => `$${fmtCOP(v)}` },
  appointments: { label: 'Citas creadas',   fmt: (v) => String(v) },
  customers:    { label: 'Clientes nuevos', fmt: (v) => String(v) },
};

export function ComparisonCard({ comparison }: { comparison: Record<string, ComparisonStat> }) {
  return (
    <ChartCard title="Vs. período anterior" icon={<TrendingUp size={16} className="text-txt-tertiary" />}>
      <div className="space-y-4">
        {Object.entries(comparison).map(([key, stat]) => {
          const meta = COMPARISON_LABELS[key] ?? { label: key, fmt: String };
          const up   = stat.pctChange > 0;
          const flat = stat.pctChange === 0;
          const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
          const tone = flat ? 'text-txt-tertiary' : up ? 'text-success' : 'text-error';
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-txt-tertiary">{meta.label}</p>
                <p className="text-lg font-bold text-txt-primary leading-tight">{meta.fmt(stat.current)}</p>
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0 ${tone} ${flat ? 'bg-surface-overlay' : up ? 'bg-success/10' : 'bg-error/10'}`}>
                <Icon size={12} />
                {Math.abs(stat.pctChange)}%
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

// ── 3. Patrones de actividad (hora del día / día de la semana) ────────────────
const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function intensityColor(value: number, max: number): string {
  if (max === 0 || value === 0) return SURFACE_EL;
  const ratio = value / max;
  // Interpola entre el tono de superficie y el lima de acento
  const r = Math.round(0x24 + (0xD4 - 0x24) * ratio);
  const g = Math.round(0x24 + (0xFF - 0x24) * ratio);
  const b = Math.round(0x2E + (0x00 - 0x2E) * ratio);
  return `rgb(${r},${g},${b})`;
}

export function ActivityPatternsCard({ byHour, byWeekday }: { byHour: number[]; byWeekday: number[] }) {
  const empty = byHour.every(v => v === 0) && byWeekday.every(v => v === 0);
  const maxHour = Math.max(...byHour, 1);
  const maxDay  = Math.max(...byWeekday, 1);
  const peakHour = byHour.indexOf(maxHour);
  const peakDay  = WEEKDAY_LABELS[byWeekday.indexOf(maxDay)];

  return (
    <ChartCard title="Patrones de actividad" empty={empty}>
      {!empty && (
        <p className="text-xs text-txt-tertiary mb-3">
          Tu pico es <span className="text-txt-primary font-semibold">{peakDay}</span> alrededor de las{' '}
          <span className="text-txt-primary font-semibold">{String(peakHour).padStart(2, '0')}:00</span>
        </p>
      )}
      <div className="space-y-4">
        <div>
          <p className="text-[11px] text-txt-tertiary mb-1.5 uppercase tracking-wide">Por hora del día</p>
          <div className="flex items-end gap-[3px] h-12">
            {byHour.map((v, h) => (
              <div key={h} title={`${h}:00 — ${v}`} className="flex-1 rounded-sm transition-all"
                style={{ height: `${Math.max((v / maxHour) * 100, 6)}%`, background: intensityColor(v, maxHour) }} />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-txt-tertiary mt-1">
            <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
          </div>
        </div>
        <div>
          <p className="text-[11px] text-txt-tertiary mb-1.5 uppercase tracking-wide">Por día de la semana</p>
          <div className="flex items-end gap-2 h-12">
            {byWeekday.map((v, d) => (
              <div key={d} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-sm transition-all" style={{ height: `${Math.max((v / maxDay) * 100, 6)}%`, background: intensityColor(v, maxDay) }} />
                <span className="text-[10px] text-txt-tertiary">{WEEKDAY_LABELS[d]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

// ── 4. Embudo IA → venta ──────────────────────────────────────────────────────
export function FunnelCard({ funnel }: { funnel: { conversations: number; withAppointment: number; withPurchase: number } }) {
  const { conversations, withAppointment, withPurchase } = funnel;
  const empty = conversations === 0;
  const stages = [
    { label: 'Escribieron',  value: conversations,   icon: MessageCircle, color: LIME },
    { label: 'Agendaron',    value: withAppointment, icon: CalendarCheck, color: BLUE },
    { label: 'Compraron',    value: withPurchase,    icon: ShoppingBag,   color: '#A78BFA' },
  ];
  const max = conversations || 1;

  return (
    <ChartCard title="Embudo: cliente que escribe → cliente que compra" empty={empty}>
      <div className="space-y-3">
        {stages.map((s, i) => {
          const pct       = Math.round((s.value / max) * 100);
          const prevValue = i === 0 ? null : stages[i - 1].value;
          const convPct   = prevValue ? Math.round((s.value / prevValue) * 100) : null;
          const Icon = s.icon;
          return (
            <div key={s.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-txt-secondary flex items-center gap-1.5">
                  <Icon size={13} style={{ color: s.color }} /> {s.label}
                </span>
                <span className="text-xs text-txt-primary font-semibold">
                  {s.value} {convPct !== null && <span className="text-txt-tertiary font-normal">({convPct}% del paso anterior)</span>}
                </span>
              </div>
              <div className="bg-surface-overlay rounded-full h-2.5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, s.value > 0 ? 4 : 0)}%`, background: s.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

// ── 5. Productos vs Servicios (dona) ──────────────────────────────────────────
export function RevenueDonut({ products, services }: { products: number; services: number }) {
  const total = products + services;
  const empty = total <= 0;
  const data = [
    { name: 'Productos', value: products, color: LIME },
    { name: 'Servicios', value: services, color: BLUE },
  ];

  return (
    <ChartCard title="Productos vs. servicios" empty={empty}>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={38} outerRadius={56}
              paddingAngle={3} stroke="none" animationDuration={500}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip content={<ChartTooltip formatter={(v: number) => `$${fmtCOP(v)}`} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2 min-w-0">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className="text-txt-secondary">{d.name}</span>
              <span className="text-txt-primary font-semibold">
                {total > 0 ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

// ── 6. Ranking top (productos / servicios / staff) ────────────────────────────
export function TopBarChart({ title, items, valueFmt }: {
  title: string;
  items: { name: string; value: number; sub?: string }[];
  valueFmt?: (v: number) => string;
}) {
  const empty = items.length === 0;

  return (
    <ChartCard title={title} empty={empty}>
      <ResponsiveContainer width="100%" height={Math.max(items.length * 34, 60)}>
        <BarChart data={items} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="topbar-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={LIME_DARK} />
              <stop offset="100%" stopColor={LIME} />
            </linearGradient>
          </defs>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={92} tick={{ fill: TXT_MUTED, fontSize: 11 }}
            axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: SURFACE_EL }}
            content={<ChartTooltip formatter={(v: number) => valueFmt ? valueFmt(v) : String(v)} />} />
          <Bar dataKey="value" fill="url(#topbar-grad)" radius={[0, 6, 6, 0]} animationDuration={500} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
