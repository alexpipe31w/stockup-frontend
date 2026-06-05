export interface TimeSlot    { open: string; close: string }
export interface DaySchedule { isOpen: boolean; shift1: TimeSlot | null; shift2: TimeSlot | null }
export interface BusinessHoursJson {
  mon: DaySchedule; tue: DaySchedule; wed: DaySchedule; thu: DaySchedule;
  fri: DaySchedule; sat: DaySchedule; sun: DaySchedule;
}

export const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'] as const;
export type  DayKey   = typeof DAY_KEYS[number];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves',
  fri: 'Viernes', sat: 'Sábado', sun: 'Domingo',
};

export const DEFAULT_BUSINESS_HOURS: BusinessHoursJson = {
  mon: { isOpen: true,  shift1: { open: '08:00', close: '12:00' }, shift2: { open: '14:00', close: '18:00' } },
  tue: { isOpen: true,  shift1: { open: '08:00', close: '12:00' }, shift2: { open: '14:00', close: '18:00' } },
  wed: { isOpen: true,  shift1: { open: '08:00', close: '12:00' }, shift2: { open: '14:00', close: '18:00' } },
  thu: { isOpen: true,  shift1: { open: '08:00', close: '12:00' }, shift2: { open: '14:00', close: '18:00' } },
  fri: { isOpen: true,  shift1: { open: '08:00', close: '12:00' }, shift2: { open: '14:00', close: '18:00' } },
  sat: { isOpen: true,  shift1: { open: '09:00', close: '14:00' }, shift2: null },
  sun: { isOpen: false, shift1: null, shift2: null },
};

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getLocalComponents(date: Date): { dayKey: DayKey; totalMinutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const wd = (parts.find(p => p.type === 'weekday')?.value ?? 'Mon').toLowerCase() as DayKey;
  const h  = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0');
  const m  = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
  return { dayKey: wd, totalMinutes: (h === 24 ? 0 : h) * 60 + m };
}

export function isWithinBusinessHours(date: Date, hours: BusinessHoursJson): boolean {
  const { dayKey, totalMinutes } = getLocalComponents(date);
  const day = hours[dayKey];
  if (!day?.isOpen) return false;
  const inSlot = (s: TimeSlot | null) =>
    s ? totalMinutes >= toMin(s.open) && totalMinutes < toMin(s.close) : false;
  return inSlot(day.shift1) || inSlot(day.shift2);
}

export function getEarliestOpenHour(hours: BusinessHoursJson): number {
  let min = 7;
  for (const key of DAY_KEYS) {
    const d = hours[key];
    if (d.isOpen && d.shift1) {
      const h = parseInt(d.shift1.open.split(':')[0]);
      if (h < min) min = h;
    }
  }
  return min;
}

export function getLatestCloseHour(hours: BusinessHoursJson): number {
  let max = 22;
  for (const key of DAY_KEYS) {
    const d = hours[key];
    if (!d.isOpen) continue;
    const closeShift = d.shift2 ?? d.shift1;
    if (closeShift) {
      const h = parseInt(closeShift.close.split(':')[0]);
      if (h > max) max = h;
    }
  }
  return max;
}

export function getCellState(
  date: Date,
  hour: number,
  hours: BusinessHoursJson,
): 'open' | 'closed-day' | 'out-of-hours' | 'break' {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota', weekday: 'short',
  }).formatToParts(date);
  const dayKey = (parts.find(p => p.type === 'weekday')?.value ?? 'Mon').toLowerCase() as DayKey;
  const day = hours[dayKey];
  if (!day.isOpen) return 'closed-day';

  const h1Open  = day.shift1 ? parseInt(day.shift1.open.split(':')[0])  : null;
  const h1Close = day.shift1 ? parseInt(day.shift1.close.split(':')[0]) : null;
  const h2Open  = day.shift2 ? parseInt(day.shift2.open.split(':')[0])  : null;
  const h2Close = day.shift2 ? parseInt(day.shift2.close.split(':')[0]) : null;

  if (h1Open !== null && h1Close !== null && hour >= h1Open && hour < h1Close) return 'open';
  if (h2Open !== null && h2Close !== null && hour >= h2Open && hour < h2Close) return 'open';
  if (h1Close !== null && h2Open !== null && hour >= h1Close && hour < h2Open) return 'break';
  return 'out-of-hours';
}

export function getHoursRangeLabel(hours: BusinessHoursJson, dayKey: DayKey): string {
  const day = hours[dayKey];
  if (!day.isOpen) return 'Cerrado';
  const s1 = day.shift1 ? `${day.shift1.open}–${day.shift1.close}` : '';
  const s2 = day.shift2 ? ` / ${day.shift2.open}–${day.shift2.close}` : '';
  return `${s1}${s2}`;
}
