# Staff Suspension — Design Spec
**Date:** 2026-06-11  
**Status:** Approved

## Overview

Allows store owners to temporarily suspend a staff member (barber, stylist, etc.) for a defined date range. During suspension: no new appointments can be booked with that staff member, the AI informs clients they are unavailable and offers an alternative, and the public calendar hides their slots. The suspension lifts automatically when the end date passes.

This is distinct from `isActive=false` (logical deletion). A suspended staff member remains visible in analytics and the system; only new bookings are blocked.

---

## 1. Data Model

Two nullable fields added to the existing `Staff` model:

```prisma
suspendedFrom  DateTime?  @map("suspended_from")
suspendedUntil DateTime?  @map("suspended_until")
```

**Suspended condition:** `suspendedFrom <= now <= suspendedUntil`

Both fields are `null` when the staff member is active. Applied via `STARTUP_MIGRATIONS` in `PrismaService.onModuleInit()`:

```sql
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "suspended_from" TIMESTAMP;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "suspended_until" TIMESTAMP;
```

---

## 2. Backend

### 2.1 StaffService — new methods

**`suspend(staffId, storeId, from, until)`**
- Validates `from < until` and `until > today`
- Updates `suspendedFrom` and `suspendedUntil` on the staff record (filtered by `storeId` — multi-tenant safe)
- Queries upcoming PENDING/CONFIRMED appointments for this staff within the suspension period
- If any exist: sends WhatsApp message to `store.adminPhone` listing them (client name, service, date/time) with message: "⚠️ [staffLabel] [nombre] suspendido del [from] al [until]. Tiene [N] citas pendientes que requieren reasignación: [lista]"
- If no appointments: no notification needed

**`unsuspend(staffId, storeId)`**
- Sets `suspendedFrom = null` and `suspendedUntil = null`
- Multi-tenant safe: filters by `storeId`

### 2.2 StaffController — new endpoints

| Method | Route | Description |
|---|---|---|
| `PATCH` | `/staff/:id/suspend` | Suspend staff for a date range |
| `PATCH` | `/staff/:id/unsuspend` | Manually lift suspension |

Both protected by `JwtAuthGuard`. `storeId` always from JWT, never from body.

**`SuspendStaffDto`:**
```ts
@IsDateString() from: string;   // ISO date, >= today
@IsDateString() until: string;  // ISO date, > from
```

### 2.3 Cron — auto-lift

New cron in `reports.service.ts` (or a dedicated `StaffService.autoLiftSuspensions()`):

```
Schedule: 30 6 * * *  (1:30am Colombia / 6:30am UTC)
```

Finds all staff where `suspendedUntil < now` and `suspendedUntil IS NOT NULL`, sets both fields to `null`. Idempotent — safe to run multiple times.

---

## 3. AI Behavior

### 3.1 `buildSystemPrompt` — staff block changes

Active (non-suspended) staff appear as before with their schedules and availability.

Suspended staff appear in a **separate block**:

```
STAFF TEMPORALMENTE NO DISPONIBLE:
- Luis Rodríguez: no disponible, regresa el [fecha larga en español, ej. "lunes 22 de junio"].
  NO ofrezcas citas con él durante este período.
```

**Explicit rule injected into the prompt:**
> "Si un cliente pide específicamente a un [staffLabel] de la lista de NO DISPONIBLES, responde: 'En este momento [staffLabel] [nombre] no está disponible, regresa el [fecha]. ¿Te puedo agendar con [nombre de otro staff activo]?' Nunca ofrezcas horarios de staff suspendido. Si no hay otro [staffLabel] disponible, responde: 'En este momento no tenemos otro [staffLabel] disponible. ¿Quieres que te agende para cuando [nombre] regrese el [fecha]?'"

### 3.2 `computeSlotsForAI` and `computeSlots`

Both filter out suspended staff before computing slots. The suspension check:

```ts
const now = new Date();
const isCurrentlySuspended = (s: Staff) =>
  s.suspendedFrom && s.suspendedUntil &&
  s.suspendedFrom <= now && now <= s.suspendedUntil;

const activeStaff = allStaff.filter(s => s.isActive && !isCurrentlySuspended(s));
```

This ensures suspended staff never appear in the availability injected to the AI or on the public calendar.

---

## 4. Public Calendar (`/cal/:slug`)

Suspended staff still appear in the staff list (so clients know they exist) but with:
- Badge: **"No disponible hasta [fecha]"** (amber/yellow color)
- No time chips — empty slot area with a short note: "Regresa el [fecha]"

This is informational only; no booking is possible for them during the suspension.

---

## 5. Frontend

### 5.1 `Config.tsx` — Tab "Equipo"

Each staff card gains:
- **Active state:** green badge "Activo" + button "Suspender"
- **Suspended state:** amber badge "Suspendido hasta [fecha]" + button "Levantar suspensión"

"Levantar suspensión" calls `/unsuspend` directly without a modal (shows an inline confirm or toast).  
"Suspender" opens `SuspendStaffModal`.

### 5.2 `SuspendStaffModal.tsx` (new component)

```
┌─ Suspender a Luis Rodríguez ──────────────────┐
│                                               │
│  Desde:  [date input  min=hoy]                │
│  Hasta:  [date input  min=mañana]             │
│                                               │
│  [Cancelar]          [Confirmar suspensión]   │
└───────────────────────────────────────────────┘
```

- Native `<input type="date">` with dark mode classes: `bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary`
- Client-side validation: `from < until`, both ≥ today; shows inline error if invalid
- On confirm: calls `suspendStaff(staffId, from, until)` → success toast → refreshes staff list
- Loading state on confirm button while request is in flight

### 5.3 `api.ts` — new functions

```ts
suspendStaff(staffId: string, from: string, until: string): Promise<void>
// PATCH /staff/:id/suspend  { from, until }

unsuspendStaff(staffId: string): Promise<void>
// PATCH /staff/:id/unsuspend
```

---

## 6. Edge Cases

| Case | Behavior |
|---|---|
| `until` is today | Rejected — `until` must be at least tomorrow |
| Admin manually lifts before `until` | `unsuspend` clears both fields; cron finds nothing to lift (idempotent) |
| No other active staff when AI offers alternative | "No tenemos otro [staffLabel] disponible. ¿Quieres agendar para cuando [nombre] regrese el [fecha]?" |
| Existing appointments during suspension | Kept intact; admin notified via WhatsApp to manage manually |
| Staff with `isActive=false` | Unaffected — independent state |
| Suspension start = today | Allowed — suspension is immediate |
| Staff suspended + queried for past analytics | Still counted normally — suspension doesn't affect historical data |

---

## 7. Files Changed

| File | Change |
|---|---|
| `prisma/schema.prisma` | 2 nullable fields on Staff |
| `src/prisma/prisma.service.ts` | STARTUP_MIGRATIONS — 2 ALTER TABLE |
| `src/staff/staff.service.ts` | `suspend()`, `unsuspend()`, `autoLiftSuspensions()` methods |
| `src/staff/staff.controller.ts` | `PATCH /:id/suspend`, `PATCH /:id/unsuspend` |
| `src/reports/reports.service.ts` | New cron `30 6 * * *` calls `autoLiftSuspensions()` |
| `src/ai/ai.service.ts` | `buildSystemPrompt` suspended block + rule; `computeSlotsForAI` filter |
| `src/public/public.service.ts` | `computeSlots` excludes suspended staff |
| `src/pages/Config.tsx` | Badges + buttons in Equipo tab |
| `src/components/SuspendStaffModal.tsx` | New modal component |
| `src/api.ts` | `suspendStaff()`, `unsuspendStaff()` |
