# Business Hours & Business Info — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist full business info + weekly hours in the Store model; validate appointment times against those hours in backend (hard block for AI, overridable for admin) and frontend (calendar shading + modal warning); inject all business data into the AI system prompt automatically.

**Architecture:** JSON `businessHours` field + 20 flat fields added to the `Store` model via `prisma db push`. A shared utility `isWithinBusinessHours()` lives in both backend (`src/utils/business-hours.util.ts`) and frontend (`src/utils/businessHours.ts`). `AppointmentsService.create()` fetches the store and rejects out-of-hours times unless `forceSchedule: true` (admin only). `buildSystemPrompt()` receives the store object and builds a complete business-info block. The CalendarView computes its hour range dynamically and shades closed/break cells.

**Tech Stack:** NestJS + Prisma + class-validator (backend); React + TypeScript + `Intl.DateTimeFormat` (frontend — no extra libs needed).

---

## File Map

### Backend — `C:\Users\alexp\Desktop\proyectos\whatsapp-crm`
| File | Action |
|---|---|
| `prisma/schema.prisma` | Add 21 fields to Store model |
| `src/stores/dto/create-store.dto.ts` | Add all new fields with validators |
| `src/stores/dto/update-store.dto.ts` | No change (extends CreateStoreDto via PartialType) |
| `src/appointments/dto/create-appointment.dto.ts` | Add `forceSchedule?: boolean` |
| `src/utils/business-hours.util.ts` | **Create** — `isWithinBusinessHours`, `formatBusinessHoursForAI`, `getEarliestOpenHour`, `getLatestCloseHour` |
| `src/appointments/appointments.service.ts` | Add store fetch + hours validation in `create()` |
| `src/ai/ai.service.ts` | Add store fetch in `generateReply()`, pass to `buildSystemPrompt()`, build info block |

### Frontend — `C:\Users\alexp\Desktop\proyectos\stockup-frontend`
| File | Action |
|---|---|
| `src/utils/businessHours.ts` | **Create** — same logic as backend util, plus `getCellState`, `getHoursRangeLabel`, `DEFAULT_BUSINESS_HOURS` |
| `src/services/api.ts` | Add `getStore()`, `updateStore()` exports; add `forceSchedule?` to `createAppointment` |
| `src/pages/Config.tsx` | Rewrite `NegocioSection` with 5 grouped cards |
| `src/pages/Appointments.tsx` | Fetch businessHours on mount, pass to CalendarView + modal; dynamic range; cell shading; warning banner |

---

## Task 1 — Backend: Prisma schema + DTOs

**Files:**
- Modify: `whatsapp-crm/prisma/schema.prisma`
- Modify: `whatsapp-crm/src/stores/dto/create-store.dto.ts`
- Modify: `whatsapp-crm/src/appointments/dto/create-appointment.dto.ts`

- [ ] **Step 1: Add 21 fields to the Store model in schema.prisma**

In `prisma/schema.prisma`, insert the block below after line 56 (`adminPhone String? ...`) and before `waSessionId`:

```prisma
  // Información del negocio
  description     String?  @map("description")
  address         String?  @map("address")
  neighborhood    String?  @map("neighborhood")
  directions      String?  @map("directions")
  googleMapsUrl   String?  @map("google_maps_url")

  // Contacto y redes
  email           String?  @map("email")
  website         String?  @map("website")
  instagram       String?  @map("instagram")
  facebook        String?  @map("facebook")
  tiktok          String?  @map("tiktok")

  // Pagos
  paymentMethods  String[] @map("payment_methods")
  paymentAccount  String?  @map("payment_account")
  requiresDeposit Boolean  @default(false) @map("requires_deposit")
  depositAmount   String?  @map("deposit_amount")

  // Políticas
  minAdvanceMinutes  Int?     @map("min_advance_minutes")
  cancellationPolicy String?  @map("cancellation_policy")
  hasDelivery        Boolean  @default(false) @map("has_delivery")
  deliveryZone       String?  @map("delivery_zone")
  hasParking         Boolean  @default(false) @map("has_parking")

  // Horarios de atención
  businessHours   Json?    @map("business_hours")
```

- [ ] **Step 2: Run prisma db push**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
npx prisma db push
npx prisma generate
```

Expected output: `✔  Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Replace create-store.dto.ts**

Replace the entire file `src/stores/dto/create-store.dto.ts`:

```typescript
import { IsString, IsOptional, IsBoolean, IsArray, IsInt, IsObject, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStoreDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsString() @IsOptional() ownerName?: string;
  @IsString() @IsOptional() adminPhone?: string;

  // Información del negocio
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() neighborhood?: string;
  @IsString() @IsOptional() directions?: string;
  @IsString() @IsOptional() googleMapsUrl?: string;

  // Contacto y redes
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() website?: string;
  @IsString() @IsOptional() instagram?: string;
  @IsString() @IsOptional() facebook?: string;
  @IsString() @IsOptional() tiktok?: string;

  // Pagos
  @IsArray() @IsString({ each: true }) @IsOptional() paymentMethods?: string[];
  @IsString() @IsOptional() paymentAccount?: string;
  @IsBoolean() @IsOptional() @Type(() => Boolean) requiresDeposit?: boolean;
  @IsString() @IsOptional() depositAmount?: string;

  // Políticas
  @IsInt() @Min(0) @IsOptional() @Type(() => Number) minAdvanceMinutes?: number;
  @IsString() @IsOptional() cancellationPolicy?: string;
  @IsBoolean() @IsOptional() @Type(() => Boolean) hasDelivery?: boolean;
  @IsString() @IsOptional() deliveryZone?: string;
  @IsBoolean() @IsOptional() @Type(() => Boolean) hasParking?: boolean;

  // Horarios
  @IsObject() @IsOptional() businessHours?: Record<string, any>;
}
```

`update-store.dto.ts` stays as-is (`PartialType(CreateStoreDto)`) — it auto-picks up the new fields.

- [ ] **Step 4: Add forceSchedule to create-appointment.dto.ts**

Add `IsBoolean` to the import at line 2:

```typescript
import {
  IsString, IsOptional, IsEnum, IsDateString,
  IsInt, IsNumber, IsUUID, Min, Max, MaxLength,
  IsPositive, IsBoolean,
} from 'class-validator';
```

Add at the bottom of the class (before the closing `}`):

```typescript
  // Admin puede forzar citas fuera del horario configurado; la IA nunca puede
  @IsBoolean() @IsOptional() @Type(() => Boolean)
  forceSchedule?: boolean;
```

- [ ] **Step 5: Build check**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
git add prisma/schema.prisma src/stores/dto/create-store.dto.ts src/appointments/dto/create-appointment.dto.ts
git commit -m "feat: add business info, hours and forceSchedule fields to Store/Appointment DTOs"
```

---

## Task 2 — Backend: business-hours.util.ts

**Files:**
- Create: `whatsapp-crm/src/utils/business-hours.util.ts`

- [ ] **Step 1: Create the utility file**

Create `src/utils/business-hours.util.ts`:

```typescript
export interface TimeSlot   { open: string; close: string }
export interface DaySchedule { isOpen: boolean; shift1: TimeSlot | null; shift2: TimeSlot | null }
export interface BusinessHoursJson {
  mon: DaySchedule; tue: DaySchedule; wed: DaySchedule; thu: DaySchedule;
  fri: DaySchedule; sat: DaySchedule; sun: DaySchedule;
}

const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves',
  fri: 'Viernes', sat: 'Sábados', sun: 'Domingos',
};

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getLocalComponents(date: Date, tz: string): { dayKey: string; totalMinutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const wd = parts.find(p => p.type === 'weekday')!.value.toLowerCase(); // "Mon" → "mon"
  const h  = parseInt(parts.find(p => p.type === 'hour')!.value);
  const m  = parseInt(parts.find(p => p.type === 'minute')!.value);
  return { dayKey: wd, totalMinutes: (h === 24 ? 0 : h) * 60 + m };
}

export function isWithinBusinessHours(
  scheduledAt: Date,
  hours: BusinessHoursJson,
  tz = 'America/Bogota',
): boolean {
  const { dayKey, totalMinutes } = getLocalComponents(scheduledAt, tz);
  const day = (hours as any)[dayKey] as DaySchedule | undefined;
  if (!day?.isOpen) return false;
  const inSlot = (s: TimeSlot | null) =>
    s ? totalMinutes >= toMin(s.open) && totalMinutes < toMin(s.close) : false;
  return inSlot(day.shift1) || inSlot(day.shift2);
}

function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suf = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}${suf}` : `${h12}:${String(m).padStart(2, '0')}${suf}`;
}

export function formatBusinessHoursForAI(hours: BusinessHoursJson): string {
  return DAY_KEYS.map(key => {
    const day = hours[key];
    if (!day.isOpen) return `${DAY_LABELS[key]}: Cerrado`;
    const s1 = day.shift1 ? `${fmt12(day.shift1.open)}–${fmt12(day.shift1.close)}` : '';
    const s2 = day.shift2 ? ` y ${fmt12(day.shift2.open)}–${fmt12(day.shift2.close)}` : '';
    return `${DAY_LABELS[key]}: ${s1}${s2}`;
  }).join('\n');
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
```

- [ ] **Step 2: Build check**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/business-hours.util.ts
git commit -m "feat: business-hours util — isWithinBusinessHours, formatForAI, hour range helpers"
```

---

## Task 3 — Backend: AppointmentsService validation

**Files:**
- Modify: `whatsapp-crm/src/appointments/appointments.service.ts`

- [ ] **Step 1: Add import**

Add to the imports at the top of `appointments.service.ts`:

```typescript
import { isWithinBusinessHours } from '../utils/business-hours.util';
```

- [ ] **Step 2: Modify create() to fetch store and validate hours**

Replace the `create()` method (lines 151–191) with:

```typescript
async create(storeId: string, dto: CreateAppointmentDto, performedById?: string) {
  const scheduledAt = new Date(dto.scheduledAt);
  const endsAt      = this.computeEndsAt(scheduledAt, dto.durationMinutes, dto.endsAt);

  // Validate against business hours (AI can never override; admin can with forceSchedule)
  const store = await this.prisma.store.findUnique({ where: { storeId } });
  if (store?.businessHours) {
    const isAI   = dto.source === AppointmentSource.AI;
    const forced = !!dto.forceSchedule && !isAI;
    if (!forced && !isWithinBusinessHours(scheduledAt, store.businessHours as any)) {
      throw new BadRequestException(
        'La hora solicitada está fuera del horario de atención del negocio.',
      );
    }
  }

  return this.prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.create({
      data: {
        storeId,
        customerId:       dto.customerId,
        serviceId:        dto.serviceId        ?? null,
        serviceVariantId: dto.serviceVariantId ?? null,
        type:             dto.type             ?? 'cita',
        status:           AppointmentStatus.PENDING,
        priority:         dto.priority         ?? 'NORMAL',
        source:           dto.source           ?? AppointmentSource.MANUAL,
        scheduledAt,
        endsAt,
        durationMinutes:  dto.durationMinutes  ?? null,
        description:      dto.description      ?? null,
        address:          dto.address          ?? null,
        notes:            dto.notes            ?? null,
        internalNotes:    dto.internalNotes    ?? null,
        agreedPrice:      dto.agreedPrice      ?? null,
      },
      include: APPOINTMENT_INCLUDE,
    });

    await tx.appointmentTimeline.create({
      data: {
        appointmentId: appointment.appointmentId,
        action:        'CREATED',
        newStatus:     AppointmentStatus.PENDING,
        note:          `Cita creada${dto.source === 'AI' ? ' automáticamente por el asistente' : ''}`,
        isPublic:      true,
        performedById: performedById ?? null,
      },
    });

    return appointment;
  });
}
```

- [ ] **Step 3: Build check**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/appointments/appointments.service.ts
git commit -m "feat: validate appointment time against business hours in AppointmentsService.create()"
```

---

## Task 4 — Backend: AI service — store data + system prompt

**Files:**
- Modify: `whatsapp-crm/src/ai/ai.service.ts`

- [ ] **Step 1: Add import**

Add to the imports at the top of `ai.service.ts`:

```typescript
import { formatBusinessHoursForAI } from '../utils/business-hours.util';
```

- [ ] **Step 2: Add store to Promise.all in generateReply()**

In `generateReply()` (around line 521), the existing `Promise.all` destructures 4 values. Replace it to add the store fetch as a 5th element:

```typescript
const [conversationRow, orders, appointments, history, store] = await Promise.all([
  this.prisma.conversation.findFirst({
    where:   { conversationId, storeId },
    include: {
      customer: {
        select: {
          customerId: true, name: true, cedula: true, city: true, phone: true,
          lastConversationSummary: true,
        },
      },
    },
  }),
  this.prisma.order.findMany({
    where: { storeId, customer: { conversations: { some: { conversationId } } } },
    include: { orderItems: { include: { product: { select: { name: true, salePrice: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  }),
  this.prisma.appointment.findMany({
    where: { storeId, customer: { conversations: { some: { conversationId } } } },
    include: {
      service:        { select: { name: true } },
      serviceVariant: { select: { name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 5,
  }),
  this.prisma.message.findMany({
    where:   { conversationId },
    orderBy: { createdAt: 'asc' },
    take:    MAX_HISTORY_MESSAGES,
  }),
  this.prisma.store.findUnique({ where: { storeId } }),
]);
```

- [ ] **Step 3: Pass store to buildSystemPrompt()**

At line ~624, update the call:

```typescript
const enrichedSystemPrompt = this.buildSystemPrompt(
  config.systemPrompt, customer, orders, appointments,
  products, services, fechaActual, horaActual,
  history, userMessage, addressAlreadyGiven, settings,
  customer.lastConversationSummary ?? null,
  store,
);
```

- [ ] **Step 4: Add store parameter and business info + hours sections to buildSystemPrompt()**

Update the function signature at line 1417 — add `store: any = null` as the last parameter:

```typescript
private buildSystemPrompt(
  basePrompt: string,
  customer: any,
  orders: any[],
  appointments: any[],
  products: any[],
  services: any[],
  fechaActual: string,
  horaActual: string,
  history: any[],
  latestMessage: string,
  addressAlreadyGiven: boolean,
  settings: StoreSettings,
  lastConversationSummary: string | null = null,
  store: any = null,
): string {
```

Insert the following block right before the existing `return [...]` at line ~1654:

```typescript
    // ── Información del negocio ───────────────────────────────────────────────
    const negocioLines: string[] = [];
    if (store) {
      if (store.description)        negocioLines.push(store.description);
      if (store.address)            negocioLines.push(`📍 Dirección: ${store.address}${store.neighborhood ? `, ${store.neighborhood}` : ''}`);
      if (store.directions)         negocioLines.push(`🗺️ Cómo llegar: ${store.directions}`);
      if (store.googleMapsUrl)      negocioLines.push(`🔗 Google Maps: ${store.googleMapsUrl}`);
      if (store.email)              negocioLines.push(`📧 Email: ${store.email}`);
      if (store.website)            negocioLines.push(`🌐 Web: ${store.website}`);
      if (store.instagram)          negocioLines.push(`📸 Instagram: @${store.instagram}`);
      if (store.facebook)           negocioLines.push(`📘 Facebook: ${store.facebook}`);
      if (store.tiktok)             negocioLines.push(`🎵 TikTok: @${store.tiktok}`);
      if ((store.paymentMethods as string[])?.length > 0)
        negocioLines.push(`💳 Formas de pago: ${(store.paymentMethods as string[]).join(', ')}`);
      if (store.paymentAccount)     negocioLines.push(`🏦 Nequi/Cuenta: ${store.paymentAccount}`);
      if (store.requiresDeposit)    negocioLines.push(`💰 Se requiere anticipo de ${store.depositAmount ?? 'un monto a convenir'} para confirmar la cita.`);
      if (store.cancellationPolicy) negocioLines.push(`❌ Cancelaciones: ${store.cancellationPolicy}`);
      if (store.hasDelivery)        negocioLines.push(`🚗 Servicio a domicilio${store.deliveryZone ? ` en: ${store.deliveryZone}` : ''}.`);
      if (store.hasParking)         negocioLines.push(`🅿️ Contamos con parqueadero disponible.`);
      if (store.minAdvanceMinutes) {
        const h = Math.round(store.minAdvanceMinutes / 60);
        negocioLines.push(`⏰ Citas con mínimo ${h} hora${h !== 1 ? 's' : ''} de anticipación.`);
      }
    }
    const negocioSection = negocioLines.length > 0
      ? `INFORMACIÓN DEL NEGOCIO:\n${negocioLines.join('\n')}`
      : '';

    // ── Horarios ──────────────────────────────────────────────────────────────
    const horariosSection = store?.businessHours
      ? `HORARIO DE ATENCIÓN:\n${formatBusinessHoursForAI(store.businessHours as any)}\n\nREGLA CRÍTICA DE HORARIOS: NUNCA agendes citas fuera del horario de atención. Si el cliente pide una hora no disponible, sugiere la hora válida más cercana. Si el día solicitado está cerrado, sugiere el próximo día hábil.`
      : '';
```

Replace the `return [...]` statement (currently at line ~1654) with:

```typescript
    const sections = [
      basePrompt, sep, clienteSection, sep, contextoPrevio, sep,
      datosSection, sep, ordenesSection, sep, citasSection, sep,
      catalogoSection, sep, flujoSection, sep, agendamientoSection, sep,
      audioSection, sep, antiBucleSection, sep, formatoSection, sep,
      `FECHA Y HORA ACTUAL: ${fechaActual}, ${horaActual} (Colombia).`,
    ];
    if (negocioSection)  sections.splice(1, 0, negocioSection);
    if (horariosSection) sections.splice(negocioSection ? 2 : 1, 0, horariosSection);
    return sections.join('\n');
```

- [ ] **Step 5: Build check and start dev server**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
npx tsc --noEmit
npm run start:dev
```

Expected: server starts without errors.

- [ ] **Step 6: Commit**

```bash
git add src/ai/ai.service.ts
git commit -m "feat: inject business info and hours into AI system prompt from Store model"
```

---

## Task 5 — Frontend: utility + api.ts

**Files:**
- Create: `stockup-frontend/src/utils/businessHours.ts`
- Modify: `stockup-frontend/src/services/api.ts`

- [ ] **Step 1: Create src/utils/businessHours.ts**

```typescript
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

// Returns cell state for calendar rendering
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
```

- [ ] **Step 2: Add getStore, updateStore to api.ts**

In `src/services/api.ts`, after the existing `updateStoreTheme` lines (~342), add:

```typescript
export const getStore    = (storeId: string) =>
  api.get(`/stores/${storeId}`);

export const updateStore = (storeId: string, data: Record<string, any>) =>
  api.patch(`/stores/${storeId}`, data);
```

Also update the `createAppointment` export to include `forceSchedule`:

```typescript
export const createAppointment = (data: {
  customerId: string;
  serviceId?: string;
  serviceVariantId?: string;
  type?: string;
  priority?: string;
  source?: string;
  scheduledAt: string;
  endsAt?: string;
  durationMinutes?: number;
  description?: string;
  address?: string;
  notes?: string;
  internalNotes?: string;
  agreedPrice?: number;
  forceSchedule?: boolean;
}) => api.post('/appointments', data);
```

- [ ] **Step 3: Build check**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/utils/businessHours.ts src/services/api.ts
git commit -m "feat: frontend businessHours utility + getStore/updateStore api helpers"
```

---

## Task 6 — Frontend: Config.tsx — NegocioSection rewrite

**Files:**
- Modify: `stockup-frontend/src/pages/Config.tsx`

- [ ] **Step 1: Add imports at the top of Config.tsx**

Add after the existing imports:

```typescript
import {
  BusinessHoursJson, DaySchedule, DAY_KEYS, DAY_LABELS, DEFAULT_BUSINESS_HOURS,
} from '../utils/businessHours';
import { getStore, updateStore } from '../services/api';
```

- [ ] **Step 2: Add PAYMENT_OPTS and ADVANCE_OPTS constants before NegocioSection**

Insert before the `function NegocioSection` line (line ~30):

```typescript
const PAYMENT_OPTS = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'nequi',         label: 'Nequi' },
  { value: 'daviplata',     label: 'Daviplata' },
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'debito',        label: 'Tarjeta débito' },
  { value: 'credito',       label: 'Tarjeta crédito' },
];

const ADVANCE_OPTS = [
  { value: 30,   label: '30 minutos' },
  { value: 60,   label: '1 hora' },
  { value: 120,  label: '2 horas' },
  { value: 240,  label: '4 horas' },
  { value: 1440, label: '24 horas' },
];
```

- [ ] **Step 3: Replace NegocioSection (lines 30–~165) with the full rewrite**

Replace the entire `NegocioSection` function with:

```typescript
function NegocioSection({ storeId }: { storeId: string }) {
  const [form, setForm] = useState({
    name: '', phone: '', ownerName: '', adminPhone: '',
    description: '', address: '', neighborhood: '', directions: '', googleMapsUrl: '',
    email: '', website: '', instagram: '', facebook: '', tiktok: '',
    paymentMethods: [] as string[],
    paymentAccount: '',
    requiresDeposit: false,
    depositAmount: '',
    minAdvanceMinutes: 120,
    cancellationPolicy: '',
    hasDelivery: false,
    deliveryZone: '',
    hasParking: false,
    businessHours: DEFAULT_BUSINESS_HOURS as BusinessHoursJson,
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    getStore(storeId).then(res => {
      const d = res.data;
      setForm({
        name:               d.name               ?? '',
        phone:              d.phone              ?? '',
        ownerName:          d.ownerName          ?? '',
        adminPhone:         d.adminPhone         ?? '',
        description:        d.description        ?? '',
        address:            d.address            ?? '',
        neighborhood:       d.neighborhood       ?? '',
        directions:         d.directions         ?? '',
        googleMapsUrl:      d.googleMapsUrl       ?? '',
        email:              d.email              ?? '',
        website:            d.website            ?? '',
        instagram:          d.instagram          ?? '',
        facebook:           d.facebook           ?? '',
        tiktok:             d.tiktok             ?? '',
        paymentMethods:     d.paymentMethods     ?? [],
        paymentAccount:     d.paymentAccount     ?? '',
        requiresDeposit:    d.requiresDeposit    ?? false,
        depositAmount:      d.depositAmount      ?? '',
        minAdvanceMinutes:  d.minAdvanceMinutes  ?? 120,
        cancellationPolicy: d.cancellationPolicy ?? '',
        hasDelivery:        d.hasDelivery        ?? false,
        deliveryZone:       d.deliveryZone       ?? '',
        hasParking:         d.hasParking         ?? false,
        businessHours:      d.businessHours      ?? DEFAULT_BUSINESS_HOURS,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [storeId]);

  const setf = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));

  const togglePayment = (val: string) =>
    setf('paymentMethods', form.paymentMethods.includes(val)
      ? form.paymentMethods.filter(v => v !== val)
      : [...form.paymentMethods, val]);

  const setDay = (key: string, patch: Partial<DaySchedule>) =>
    setForm(p => ({
      ...p,
      businessHours: {
        ...p.businessHours,
        [key]: { ...p.businessHours[key as keyof BusinessHoursJson], ...patch },
      },
    }));

  const setShift = (key: string, shift: 'shift1' | 'shift2', field: 'open' | 'close', val: string) =>
    setForm(p => {
      const day = { ...p.businessHours[key as keyof BusinessHoursJson] };
      const existing = day[shift] ?? { open: '08:00', close: '18:00' };
      return {
        ...p,
        businessHours: { ...p.businessHours, [key]: { ...day, [shift]: { ...existing, [field]: val } } },
      };
    });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await updateStore(storeId, {
        name: form.name, phone: form.phone,
        ownerName:          form.ownerName          || undefined,
        adminPhone:         form.adminPhone         || undefined,
        description:        form.description        || undefined,
        address:            form.address            || undefined,
        neighborhood:       form.neighborhood       || undefined,
        directions:         form.directions         || undefined,
        googleMapsUrl:      form.googleMapsUrl      || undefined,
        email:              form.email              || undefined,
        website:            form.website            || undefined,
        instagram:          form.instagram          || undefined,
        facebook:           form.facebook           || undefined,
        tiktok:             form.tiktok             || undefined,
        paymentMethods:     form.paymentMethods,
        paymentAccount:     form.paymentAccount     || undefined,
        requiresDeposit:    form.requiresDeposit,
        depositAmount:      form.depositAmount      || undefined,
        minAdvanceMinutes:  form.minAdvanceMinutes,
        cancellationPolicy: form.cancellationPolicy || undefined,
        hasDelivery:        form.hasDelivery,
        deliveryZone:       form.deliveryZone       || undefined,
        hasParking:         form.hasParking,
        businessHours:      form.businessHours,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  const ic = 'w-full px-4 py-3 rounded-xl border border-border-default bg-surface-elevated focus:outline-none focus:ring-2 focus:bg-surface transition text-sm text-txt-primary placeholder:text-txt-tertiary';
  const ta = `${ic} resize-none`;
  const card = 'bg-surface rounded-2xl shadow-sm border border-border-subtle p-6 space-y-4';

  const CardHeader = ({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) => (
    <div className="flex items-center gap-3 pb-3 border-b border-border-subtle">
      <div className="w-9 h-9 rounded-xl bg-surface-overlay flex items-center justify-center flex-shrink-0 text-lime">{icon}</div>
      <div>
        <h2 className="font-semibold text-txt-primary text-sm">{title}</h2>
        <p className="text-xs text-txt-tertiary">{sub}</p>
      </div>
    </div>
  );

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button type="button" onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-lime' : 'bg-surface-overlay'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
    </button>
  );

  return (
    <form onSubmit={handleSave} className="space-y-5">

      {/* Card 1 — Información básica */}
      <div className={card}>
        <CardHeader
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
          title="Información básica" sub="Nombre, descripción y ubicación del negocio"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">Nombre del negocio *</label>
            <input value={form.name} onChange={e => setf('name', e.target.value)} placeholder="Mi Negocio" className={ic} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">Propietario</label>
            <input value={form.ownerName} onChange={e => setf('ownerName', e.target.value)} placeholder="Nombre del dueño" className={ic} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-txt-secondary mb-1">Descripción del negocio</label>
          <textarea value={form.description} onChange={e => setf('description', e.target.value)}
            placeholder="¿Qué ofreces? La IA usará esto para presentarse ante los clientes." rows={3} className={ta} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">Dirección</label>
            <input value={form.address} onChange={e => setf('address', e.target.value)} placeholder="Calle 10 #5-20" className={ic} />
          </div>
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">Barrio / Ciudad</label>
            <input value={form.neighborhood} onChange={e => setf('neighborhood', e.target.value)} placeholder="El Poblado, Medellín" className={ic} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-txt-secondary mb-1">Indicaciones de llegada</label>
          <textarea value={form.directions} onChange={e => setf('directions', e.target.value)}
            placeholder="Frente al parque, segundo piso..." rows={2} className={ta} />
        </div>
        <div>
          <label className="block text-xs font-medium text-txt-secondary mb-1">Link Google Maps</label>
          <input value={form.googleMapsUrl} onChange={e => setf('googleMapsUrl', e.target.value)} placeholder="https://maps.app.goo.gl/..." className={ic} />
        </div>
      </div>

      {/* Card 2 — Contacto y redes */}
      <div className={card}>
        <CardHeader
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>}
          title="Contacto y redes sociales" sub="Cómo pueden encontrarte los clientes"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">Teléfono WhatsApp *</label>
            <input value={form.phone} onChange={e => setf('phone', e.target.value)} placeholder="+573001234567" className={ic} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">Teléfono admin (notificaciones)</label>
            <input value={form.adminPhone} onChange={e => setf('adminPhone', e.target.value)} placeholder="+573001234567" className={ic} />
          </div>
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">Email de contacto</label>
            <input value={form.email} onChange={e => setf('email', e.target.value)} placeholder="contacto@negocio.com" className={ic} type="email" />
          </div>
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">Sitio web</label>
            <input value={form.website} onChange={e => setf('website', e.target.value)} placeholder="https://minegocio.com" className={ic} />
          </div>
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">Instagram</label>
            <div className="flex">
              <span className="flex items-center px-3 bg-surface-overlay border border-r-0 border-border-default rounded-l-xl text-txt-tertiary text-sm">@</span>
              <input value={form.instagram} onChange={e => setf('instagram', e.target.value)} placeholder="minegocio" className={`${ic} rounded-l-none`} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">Facebook</label>
            <input value={form.facebook} onChange={e => setf('facebook', e.target.value)} placeholder="facebook.com/minegocio" className={ic} />
          </div>
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">TikTok</label>
            <div className="flex">
              <span className="flex items-center px-3 bg-surface-overlay border border-r-0 border-border-default rounded-l-xl text-txt-tertiary text-sm">@</span>
              <input value={form.tiktok} onChange={e => setf('tiktok', e.target.value)} placeholder="minegocio" className={`${ic} rounded-l-none`} />
            </div>
          </div>
        </div>
      </div>

      {/* Card 3 — Pagos */}
      <div className={card}>
        <CardHeader
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
          title="Métodos de pago" sub="La IA informará al cliente cómo puede pagar"
        />
        <div className="flex flex-wrap gap-2">
          {PAYMENT_OPTS.map(opt => (
            <button key={opt.value} type="button" onClick={() => togglePayment(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                form.paymentMethods.includes(opt.value)
                  ? 'bg-lime/20 border-lime text-lime'
                  : 'bg-surface-elevated border-border-default text-txt-secondary hover:border-border-default'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
        {(form.paymentMethods.includes('nequi') || form.paymentMethods.includes('transferencia') || form.paymentMethods.includes('daviplata')) && (
          <div>
            <label className="block text-xs font-medium text-txt-secondary mb-1">Número Nequi / cuenta bancaria</label>
            <input value={form.paymentAccount} onChange={e => setf('paymentAccount', e.target.value)}
              placeholder="3001234567 — Bancolombia 123-456789" className={ic} />
          </div>
        )}
        <div className="flex items-center gap-3">
          <Toggle value={form.requiresDeposit} onChange={() => setf('requiresDeposit', !form.requiresDeposit)} />
          <span className="text-sm text-txt-primary">Requiere anticipo para confirmar cita</span>
        </div>
        {form.requiresDeposit && (
          <input value={form.depositAmount} onChange={e => setf('depositAmount', e.target.value)}
            placeholder="Monto del anticipo (ej: 50000 o 30%)" className={ic} />
        )}
      </div>

      {/* Card 4 — Políticas */}
      <div className={card}>
        <CardHeader
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
          title="Políticas del negocio" sub="Reglas de cancelación, anticipación y servicios extra"
        />
        <div>
          <label className="block text-xs font-medium text-txt-secondary mb-1">Anticipación mínima para agendar</label>
          <select value={form.minAdvanceMinutes} onChange={e => setf('minAdvanceMinutes', Number(e.target.value))} className={ic}>
            {ADVANCE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-txt-secondary mb-1">Política de cancelación</label>
          <textarea value={form.cancellationPolicy} onChange={e => setf('cancellationPolicy', e.target.value)}
            placeholder="Cancela con al menos 2 horas de anticipación..." rows={2} className={ta} />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Toggle value={form.hasDelivery} onChange={() => setf('hasDelivery', !form.hasDelivery)} />
            <span className="text-sm text-txt-primary">Servicio a domicilio disponible</span>
          </div>
          {form.hasDelivery && (
            <input value={form.deliveryZone} onChange={e => setf('deliveryZone', e.target.value)}
              placeholder="Zona de cobertura (ej: Barrio El Centro, comunas 10 y 11)" className={ic} />
          )}
          <div className="flex items-center gap-3">
            <Toggle value={form.hasParking} onChange={() => setf('hasParking', !form.hasParking)} />
            <span className="text-sm text-txt-primary">Parqueadero disponible</span>
          </div>
        </div>
      </div>

      {/* Card 5 — Horarios de atención */}
      <div className={card}>
        <CardHeader
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          title="Horarios de atención" sub="El calendario y la IA respetarán estos horarios"
        />
        <div className="space-y-2">
          {DAY_KEYS.map(key => {
            const day = form.businessHours[key];
            return (
              <div key={key} className={`flex flex-wrap items-center gap-3 py-2 px-3 rounded-xl border transition ${day.isOpen ? 'border-border-default bg-surface-elevated' : 'border-border-subtle bg-surface opacity-60'}`}>
                <Toggle value={day.isOpen} onChange={() => setDay(key, { isOpen: !day.isOpen })} />
                <span className="text-sm font-medium text-txt-primary w-20 flex-shrink-0">{DAY_LABELS[key]}</span>
                {day.isOpen ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <input type="time" value={day.shift1?.open ?? '08:00'}
                        onChange={e => setShift(key, 'shift1', 'open', e.target.value)}
                        className="px-2 py-1 rounded-lg border border-border-default bg-surface text-sm text-txt-primary" />
                      <span className="text-txt-tertiary text-xs">→</span>
                      <input type="time" value={day.shift1?.close ?? '12:00'}
                        onChange={e => setShift(key, 'shift1', 'close', e.target.value)}
                        className="px-2 py-1 rounded-lg border border-border-default bg-surface text-sm text-txt-primary" />
                    </div>
                    <button type="button"
                      onClick={() => setDay(key, { shift2: day.shift2 ? null : { open: '14:00', close: '18:00' } })}
                      className={`text-xs px-2 py-1 rounded-lg border transition flex-shrink-0 ${day.shift2 ? 'border-lime text-lime bg-lime/10' : 'border-border-default text-txt-tertiary hover:bg-surface-overlay'}`}>
                      {day.shift2 ? '− Tarde' : '+ Tarde'}
                    </button>
                    {day.shift2 && (
                      <div className="flex items-center gap-1.5">
                        <input type="time" value={day.shift2.open}
                          onChange={e => setShift(key, 'shift2', 'open', e.target.value)}
                          className="px-2 py-1 rounded-lg border border-border-default bg-surface text-sm text-txt-primary" />
                        <span className="text-txt-tertiary text-xs">→</span>
                        <input type="time" value={day.shift2.close}
                          onChange={e => setShift(key, 'shift2', 'close', e.target.value)}
                          className="px-2 py-1 rounded-lg border border-border-default bg-surface text-sm text-txt-primary" />
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-txt-tertiary italic">Cerrado</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-400 px-1">{error}</p>}
      <button type="submit" disabled={saving}
        className="w-full py-3 rounded-2xl font-semibold text-[#0A0A0F] transition disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}>
        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Build check + browser test**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
npx tsc --noEmit
npm start
```

Open `http://localhost:3000/config` → tab Negocio. Verify:
- 5 cards visibles con todos los campos
- Los toggles de pagos cambian color al activarse
- "+ Tarde" en los horarios muestra/oculta el segundo turno
- "Guardar cambios" no da error TypeScript

- [ ] **Step 5: Commit**

```bash
git add src/pages/Config.tsx
git commit -m "feat: expand NegocioSection with 5 cards — info, contact, payments, policies, hours"
```

---

## Task 7 — Frontend: Appointments.tsx — calendar + modal

**Files:**
- Modify: `stockup-frontend/src/pages/Appointments.tsx`

- [ ] **Step 1: Add imports**

Add to the existing imports at the top of `Appointments.tsx`:

```typescript
import {
  BusinessHoursJson, getCellState, getEarliestOpenHour, getLatestCloseHour,
  isWithinBusinessHours, getHoursRangeLabel,
} from '../utils/businessHours';
import { getStore } from '../services/api';
```

- [ ] **Step 2: Add businessHours state and fetch in Appointments component**

In the `Appointments` function (around line 1135), add after the existing `useState` declarations:

```typescript
const [businessHours, setBusinessHours] = useState<BusinessHoursJson | null>(null);

useEffect(() => {
  if (!storeId) return;
  getStore(storeId as string)
    .then(res => { if (res.data?.businessHours) setBusinessHours(res.data.businessHours); })
    .catch(() => {});
}, [storeId]);
```

- [ ] **Step 3: Pass businessHours to CalendarView and NewAppointmentModal**

In the JSX return of `Appointments`, find the `CalendarView` usage and update:

```tsx
{view === 'calendar' && (
  <CalendarView
    appointments={filtered}
    selected={selected}
    onSelect={setSelected}
    businessHours={businessHours}
  />
)}
```

Find the `NewAppointmentModal` usage and update:

```tsx
{showNewAppt && (
  <NewAppointmentModal
    storeId={storeId as string}
    businessHours={businessHours}
    onCreated={() => { setShowNewAppt(false); load(); }}
    onClose={() => setShowNewAppt(false)}
  />
)}
```

- [ ] **Step 4: Update CalendarView signature and internals**

Replace the `CalendarView` function signature (line 1011):

```typescript
function CalendarView({ appointments, selected, onSelect, businessHours }: {
  appointments: Appointment[];
  selected: Appointment | null;
  onSelect: (a: Appointment | null) => void;
  businessHours: BusinessHoursJson | null;
}) {
```

Replace the `CELL_H` line and grid initialization block (lines 1019–1032) with:

```typescript
  const CELL_H = 60;

  // Dynamic hour range from business hours; fallback to 7am–10pm
  const calendarHours = businessHours
    ? Array.from(
        { length: getLatestCloseHour(businessHours) - getEarliestOpenHour(businessHours) + 1 },
        (_, i) => i + getEarliestOpenHour(businessHours),
      )
    : Array.from({ length: 16 }, (_, i) => i + 7);

  // Index appointments by day × hour
  const grid: Record<number, Record<number, Appointment[]>> = {};
  for (let d = 0; d < 7; d++) {
    grid[d] = {};
    for (const h of calendarHours) grid[d][h] = [];
  }

  appointments.forEach(a => {
    const date   = new Date(a.scheduledAt);
    const dayIdx = weekDays.findIndex(d => sameDay(d, date));
    if (dayIdx === -1) return;
    const h       = date.getHours();
    const earliest = calendarHours[0];
    const latest   = calendarHours[calendarHours.length - 1];
    const slot = h < earliest ? earliest : h > latest ? latest : h;
    grid[dayIdx][slot]?.push(a);
  });
```

In the day headers section (around line 1060), update the column header rendering to shade closed days:

```tsx
        {weekDays.map((d, i) => {
          const today  = i === todayIdx;
          const closed = businessHours ? getCellState(d, 0, businessHours) === 'closed-day' : false;
          return (
            <div key={i} className={`py-2 text-center border-r border-border-subtle last:border-r-0 ${today ? 'bg-blue-50/20' : closed ? 'bg-surface-overlay/40' : ''}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wide ${today ? 'text-blue-500' : closed ? 'text-txt-disabled' : 'text-txt-tertiary'}`}>{WEEKDAYS[i]}</p>
              <p className={`text-xl font-black leading-tight ${today ? 'text-blue-600' : closed ? 'text-txt-disabled' : 'text-txt-primary'}`}>
                {d.toLocaleDateString('es-CO',{day:'numeric'})}
              </p>
              {closed && <p className="text-[9px] text-txt-disabled uppercase tracking-wide mt-0.5">Cerrado</p>}
            </div>
          );
        })}
```

In the grid rows (around line 1076), replace `{HOURS.map(hour => (` with `{calendarHours.map(hour => (` and update the cell rendering to apply shading:

```tsx
          {weekDays.map((day, dayIdx) => {
            const appts    = grid[dayIdx]?.[hour] ?? [];
            const isToday_ = dayIdx === todayIdx;
            const showNow  = isToday_ && nowHour === hour;
            const state    = businessHours ? getCellState(day, hour, businessHours) : 'open';

            const cellBg =
              state === 'closed-day'   ? 'bg-surface-overlay/50 cursor-not-allowed' :
              state === 'break'        ? 'bg-surface-overlay/30' :
              state === 'out-of-hours' ? 'bg-surface-overlay/40 cursor-not-allowed' :
              isToday_                 ? 'bg-blue-50/20' : '';

            return (
              <div key={dayIdx}
                className={`border-r border-slate-50 last:border-r-0 relative px-0.5 py-0.5 ${cellBg}`}>
                {/* "now" line */}
                {showNow && (
                  <div className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                    style={{ top: `${(nowMin / 60) * 100}%` }}>
                    <div className="w-2 h-2 rounded-full bg-blue-500 -ml-1 flex-shrink-0" />
                    <div className="flex-1 h-px bg-blue-500" />
                  </div>
                )}
                {appts.map(appt => {
                  const cfg      = SC[appt.status];
                  const isSel    = selected?.appointmentId === appt.appointmentId;
                  const nameLabel = appt.service?.name ?? appt.customer.name ?? appt.type;
                  return (
                    <button key={appt.appointmentId} onClick={() => onSelect(isSel ? null : appt)}
                      className="w-full text-left rounded-lg px-1.5 py-1 mb-0.5 transition-all text-[10px]"
                      style={{
                        background: isSel ? cfg.bar : cfg.bg,
                        color:      isSel ? '#fff'  : cfg.color,
                        border:     `1.5px solid ${cfg.bar}`,
                        boxShadow:  isSel ? `0 2px 8px ${cfg.bar}55` : 'none',
                      }}>
                      <p className="font-bold truncate leading-tight">{fmtTime(appt.scheduledAt)}</p>
                      <p className="truncate leading-tight opacity-90">{nameLabel}</p>
                    </button>
                  );
                })}
              </div>
            );
          })}
```

- [ ] **Step 5: Update NewAppointmentModal signature + add warning logic**

Update the function signature:

```typescript
function NewAppointmentModal({ storeId, businessHours, onCreated, onClose }: {
  storeId: string;
  businessHours: BusinessHoursJson | null;
  onCreated: () => void;
  onClose: () => void;
}) {
```

Add state for the warning after the existing state declarations:

```typescript
const [outOfHoursWarning, setOutOfHoursWarning] = useState(false);
```

Replace the existing `handleSubmit` function with a two-function pattern:

```typescript
const doSubmit = async (force = false) => {
  if (!form.customerId || !form.scheduledAt) {
    setError('Cliente y fecha/hora son obligatorios.');
    return;
  }
  if (businessHours && !force) {
    if (!isWithinBusinessHours(new Date(form.scheduledAt), businessHours)) {
      setOutOfHoursWarning(true);
      return;
    }
  }
  setSaving(true); setError(''); setOutOfHoursWarning(false);
  try {
    await createAppointment({
      customerId:      form.customerId,
      serviceId:       form.serviceId       || undefined,
      scheduledAt:     new Date(form.scheduledAt).toISOString(),
      durationMinutes: form.durationMinutes  ? Number(form.durationMinutes) : undefined,
      description:     form.description     || undefined,
      address:         form.address         || undefined,
      agreedPrice:     form.agreedPrice      ? Number(form.agreedPrice) : undefined,
      notes:           form.notes           || undefined,
      priority:        form.priority,
      source:          'MANUAL',
      forceSchedule:   force || undefined,
    });
    onCreated();
  } catch (err: any) {
    setError(err?.response?.data?.message || 'Error al crear la cita.');
  } finally {
    setSaving(false);
  }
};

const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); doSubmit(false); };
```

In the modal JSX, add the warning banner right before the submit button (search for the existing submit button `disabled={saving}`). Insert:

```tsx
{outOfHoursWarning && (
  <div className="rounded-xl bg-warning/10 border border-warning/30 p-4 space-y-3">
    <p className="text-sm font-semibold text-warning flex items-center gap-2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      Fuera del horario de atención
    </p>
    <p className="text-xs text-txt-secondary">
      Esta hora está fuera del horario configurado.{' '}
      {businessHours && (
        <>Horario del día: <span className="font-medium">{getHoursRangeLabel(businessHours, (() => {
          const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', weekday: 'short' }).formatToParts(new Date(form.scheduledAt));
          return (parts.find(p => p.type === 'weekday')?.value ?? 'Mon').toLowerCase() as any;
        })())}</span>.</>
      )}{' '}
      ¿Deseas guardar de todas formas?
    </p>
    <div className="flex gap-2">
      <button type="button" onClick={() => setOutOfHoursWarning(false)}
        className="flex-1 py-2 rounded-xl text-xs font-semibold bg-surface-overlay text-txt-secondary hover:bg-border-default transition">
        Cancelar
      </button>
      <button type="button" onClick={() => doSubmit(true)}
        className="flex-1 py-2 rounded-xl text-xs font-semibold bg-warning/20 text-warning hover:bg-warning/30 transition">
        Guardar de todas formas
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 6: Build check + browser test**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
npx tsc --noEmit
npm start
```

Manual tests:
1. `/config` → Negocio → set Lun–Vie 8am–12pm / 2pm–7pm, Sáb 9am–2pm, Dom cerrado → Guardar
2. `/appointments` → Calendar view → grid shows 8am–7pm range, Domingo columna gris con "Cerrado"
3. "Nueva cita" → set hora domingo → Guardar → banner warning aparece → "Guardar de todas formas" → cita creada
4. "Nueva cita" → set hora martes 1pm (almuerzo) → Guardar → banner warning → cancelar → hora corregida a 2pm → Guardar → cita creada sin warning

- [ ] **Step 7: Commit**

```bash
git add src/pages/Appointments.tsx
git commit -m "feat: dynamic calendar hours + closed-day shading + out-of-hours warning modal"
```

---

## Task 8 — Deploy

- [ ] **Step 1: Push backend to production**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
git push origin main
```

Monitor InstaPods dashboard → deploy log. The build command runs `prisma db push` automáticamente.

Verify health check after deploy:
```
GET https://whatsapp-crm.ash-1.instapods.app/health
```

- [ ] **Step 2: Push frontend to production**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
git push origin main
```

Vercel auto-despliega desde `main`. Verificar en Vercel dashboard que el build pase (sin errores TypeScript/ESLint).

- [ ] **Step 3: Smoke test en producción**
1. `https://stockup-frontend.vercel.app/config` → Negocio → configurar horarios de prueba → Guardar
2. `https://stockup-frontend.vercel.app/appointments` → Calendario → verificar rango y días cerrados
3. Crear cita fuera de horario → confirmar que aparece el warning
4. Mandar WhatsApp al número conectado: *"¿cuál es su horario?"* → IA responde con los horarios configurados
5. Mandar: *"quiero una cita el domingo"* → IA sugiere el próximo día hábil
