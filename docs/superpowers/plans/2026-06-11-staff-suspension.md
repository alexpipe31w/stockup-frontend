# Staff Suspension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow store owners to temporarily suspend a staff member for a date range; the AI informs clients of unavailability + offers an alternative, and the public calendar shows the return date.

**Architecture:** Two nullable columns (`suspended_from`, `suspended_until`) on the `staff` table applied via `STARTUP_MIGRATIONS`. A callback pattern (`setNotifyFn`) decouples `StaffService` from `WhatsappService`. A daily cron (`30 6 * * *` UTC) auto-lifts expired suspensions. AI and public calendar filter suspended staff from slot computation.

**Tech Stack:** NestJS 11, Prisma 6, PostgreSQL (InstaPods local), React 19 + TypeScript, Tailwind CSS dark mode, Baileys (WhatsApp).

**Repos:**
- Backend: `C:\Users\alexp\Desktop\proyectos\whatsapp-crm`
- Frontend: `C:\Users\alexp\Desktop\proyectos\stockup-frontend`

---

## Task 1 — Schema + STARTUP_MIGRATIONS (Backend)

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/prisma/prisma.service.ts`

- [ ] **Step 1: Add fields to Staff model in schema.prisma**

Open `prisma/schema.prisma` and add after `commissionPercentage`:

```prisma
suspendedFrom  DateTime? @map("suspended_from")
suspendedUntil DateTime? @map("suspended_until")
```

The Staff model should look like:
```prisma
model Staff {
  staffId   String   @id @default(uuid()) @map("staff_id")
  storeId   String   @map("store_id")
  name      String   @db.VarChar(100)
  isActive  Boolean  @default(true) @map("is_active")
  schedule             Json?  @map("schedule")
  commissionPercentage Float? @map("commission_percentage")
  suspendedFrom        DateTime? @map("suspended_from")
  suspendedUntil       DateTime? @map("suspended_until")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt      @map("updated_at")
  store        Store         @relation(fields: [storeId], references: [storeId], onDelete: Cascade)
  appointments Appointment[]
  @@index([storeId, isActive])
  @@map("staff")
}
```

- [ ] **Step 2: Add STARTUP_MIGRATIONS entries in prisma.service.ts**

In `src/prisma/prisma.service.ts`, add two new entries to the `STARTUP_MIGRATIONS` array:

```ts
const STARTUP_MIGRATIONS = [
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS commission_percentage DOUBLE PRECISION`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS suspended_from TIMESTAMP`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP`,
];
```

- [ ] **Step 3: Regenerate Prisma client locally**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
npx prisma generate
```

Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 4: Commit**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
git add prisma/schema.prisma src/prisma/prisma.service.ts
git commit -m "feat(staff): add suspended_from/until columns via STARTUP_MIGRATIONS"
```

---

## Task 2 — SuspendStaffDto (Backend)

**Files:**
- Create: `src/staff/dto/suspend-staff.dto.ts`

- [ ] **Step 1: Create the DTO file**

```ts
// src/staff/dto/suspend-staff.dto.ts
import { IsDateString } from 'class-validator';

export class SuspendStaffDto {
  @IsDateString()
  from: string;   // ISO date string, e.g. "2026-06-15"

  @IsDateString()
  until: string;  // ISO date string, e.g. "2026-06-22" — must be > from and > today
}
```

- [ ] **Step 2: Commit**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
git add src/staff/dto/suspend-staff.dto.ts
git commit -m "feat(staff): add SuspendStaffDto"
```

---

## Task 3 — StaffService: suspend, unsuspend, autoLiftSuspensions, notifyFn (Backend)

**Files:**
- Modify: `src/staff/staff.service.ts`

- [ ] **Step 1: Replace staff.service.ts with updated version**

```ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { SuspendStaffDto } from './dto/suspend-staff.dto';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);
  private notifyFn?: (storeId: string, phone: string, message: string) => Promise<void>;

  constructor(private readonly prisma: PrismaService) {}

  // Registered by WhatsappService.onModuleInit() to avoid circular dependency
  setNotifyFn(fn: (storeId: string, phone: string, message: string) => Promise<void>) {
    this.notifyFn = fn;
  }

  findAll(storeId: string) {
    return this.prisma.staff.findMany({
      where:   { storeId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: {
        staffId:              true,
        name:                 true,
        isActive:             true,
        schedule:             true,
        commissionPercentage: true,
        suspendedFrom:        true,
        suspendedUntil:       true,
        createdAt:            true,
      },
    });
  }

  create(storeId: string, dto: CreateStaffDto) {
    return this.prisma.staff.create({
      data: {
        storeId,
        name:                 dto.name,
        schedule:             dto.schedule ?? Prisma.JsonNull,
        commissionPercentage: dto.commissionPercentage ?? null,
      },
      select: {
        staffId:              true,
        name:                 true,
        isActive:             true,
        schedule:             true,
        commissionPercentage: true,
        suspendedFrom:        true,
        suspendedUntil:       true,
        createdAt:            true,
      },
    });
  }

  async update(staffId: string, storeId: string, dto: UpdateStaffDto) {
    await this.verifyOwnership(staffId, storeId);
    return this.prisma.staff.update({
      where: { staffId },
      data:  {
        ...(dto.name                 !== undefined && { name:                 dto.name }),
        ...(dto.isActive             !== undefined && { isActive:             dto.isActive }),
        ...(dto.schedule             !== undefined && { schedule:             dto.schedule ?? Prisma.JsonNull }),
        ...(dto.commissionPercentage !== undefined && { commissionPercentage: dto.commissionPercentage }),
      },
      select: {
        staffId:              true,
        name:                 true,
        isActive:             true,
        schedule:             true,
        commissionPercentage: true,
        suspendedFrom:        true,
        suspendedUntil:       true,
        createdAt:            true,
      },
    });
  }

  async remove(staffId: string, storeId: string) {
    await this.verifyOwnership(staffId, storeId);
    return this.prisma.staff.update({
      where: { staffId },
      data:  { isActive: false },
    });
  }

  async suspend(staffId: string, storeId: string, dto: SuspendStaffDto): Promise<void> {
    const from  = new Date(dto.from);
    const until = new Date(dto.until);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (until <= from)  throw new BadRequestException('"until" debe ser posterior a "from"');
    if (until <= today) throw new BadRequestException('"until" debe ser al menos mañana');

    const staff = await this.prisma.staff.findFirst({ where: { staffId, storeId, isActive: true } });
    if (!staff) throw new NotFoundException('Profesional no encontrado');

    await this.prisma.staff.update({
      where: { staffId },
      data:  { suspendedFrom: from, suspendedUntil: until },
    });

    // Notify admin via WhatsApp if there are upcoming appointments
    await this.notifyAdminOfSuspension(staff, storeId, from, until);
  }

  async unsuspend(staffId: string, storeId: string): Promise<void> {
    const staff = await this.prisma.staff.findFirst({ where: { staffId, storeId, isActive: true } });
    if (!staff) throw new NotFoundException('Profesional no encontrado');

    await this.prisma.staff.update({
      where: { staffId },
      data:  { suspendedFrom: null, suspendedUntil: null },
    });
  }

  // Called by cron in reports.service.ts — lifts suspensions whose until date has passed
  async autoLiftSuspensions(): Promise<void> {
    const now = new Date();
    const result = await this.prisma.staff.updateMany({
      where: {
        suspendedUntil: { not: null, lt: now },
        isActive: true,
      },
      data: { suspendedFrom: null, suspendedUntil: null },
    });
    if (result.count > 0) {
      this.logger.log(`[AutoLift] ${result.count} suspensión(es) levantada(s) automáticamente`);
    }
  }

  private async notifyAdminOfSuspension(
    staff: { name: string },
    storeId: string,
    from: Date,
    until: Date,
  ): Promise<void> {
    if (!this.notifyFn) return;

    const store = await this.prisma.store.findUnique({
      where:  { storeId },
      select: { adminPhone: true, staffLabel: true },
    });
    if (!store?.adminPhone) return;

    const appts = await this.prisma.appointment.findMany({
      where: {
        storeId,
        staffId:     staff['staffId' as keyof typeof staff] as string,
        status:      { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { gte: from, lte: until },
      },
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: { scheduledAt: 'asc' },
    });

    const staffLabel = (store.staffLabel ?? 'Profesional');
    const fmtDate = (d: Date) => d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Bogota' });
    const fmtTime = (d: Date) => d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' });

    if (appts.length === 0) {
      await this.notifyFn(storeId, store.adminPhone,
        `⏸️ ${staffLabel} *${staff.name}* suspendido del ${fmtDate(from)} al ${fmtDate(until)}. Sin citas pendientes en ese período.`
      );
      return;
    }

    const lista = appts
      .map(a => `• ${a.customer?.name ?? 'Cliente'} — ${fmtDate(a.scheduledAt)} ${fmtTime(a.scheduledAt)}`)
      .join('\n');

    await this.notifyFn(storeId, store.adminPhone,
      `⚠️ ${staffLabel} *${staff.name}* suspendido del ${fmtDate(from)} al ${fmtDate(until)}.\n\nTiene *${appts.length} cita(s) pendiente(s)* que requieren reasignación:\n${lista}\n\nRevísalas en el panel de citas.`
    );
  }

  private async verifyOwnership(staffId: string, storeId: string) {
    const staff = await this.prisma.staff.findUnique({ where: { staffId } });
    if (!staff)                    throw new NotFoundException('Profesional no encontrado');
    if (staff.storeId !== storeId) throw new ForbiddenException();
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/staff/staff.service.ts
git commit -m "feat(staff): suspend/unsuspend/autoLiftSuspensions + notifyFn callback"
```

---

## Task 4 — StaffController: new endpoints (Backend)

**Files:**
- Modify: `src/staff/staff.controller.ts`

- [ ] **Step 1: Replace staff.controller.ts with updated version**

```ts
import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { SuspendStaffDto } from './dto/suspend-staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.staffService.findAll(req.user.storeId);
  }

  @Post()
  create(@Body() dto: CreateStaffDto, @Request() req: any) {
    return this.staffService.create(req.user.storeId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto, @Request() req: any) {
    return this.staffService.update(id, req.user.storeId, dto);
  }

  @Patch(':id/suspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  suspend(@Param('id') id: string, @Body() dto: SuspendStaffDto, @Request() req: any) {
    return this.staffService.suspend(id, req.user.storeId, dto);
  }

  @Patch(':id/unsuspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsuspend(@Param('id') id: string, @Request() req: any) {
    return this.staffService.unsuspend(id, req.user.storeId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.staffService.remove(id, req.user.storeId);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/staff/staff.controller.ts
git commit -m "feat(staff): PATCH /:id/suspend and /:id/unsuspend endpoints"
```

---

## Task 5 — Module wiring: WhatsappModule imports StaffModule, registers notifyFn (Backend)

**Files:**
- Modify: `src/whatsapp/whatsapp.module.ts`
- Modify: `src/whatsapp/whatsapp.service.ts`

- [ ] **Step 1: Add StaffModule to WhatsappModule imports**

In `src/whatsapp/whatsapp.module.ts`, add `StaffModule` to the imports array:

```ts
import { Module, forwardRef } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { CustomersModule } from '../customers/customers.module';
import { BlockedModule } from '../blocked/blocked.module';
import { AdminAssistantModule } from '../admin-assistant/admin-assistant.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    ConversationsModule,
    forwardRef(() => MessagesModule),
    CustomersModule,
    BlockedModule,
    AdminAssistantModule,
    StaffModule,
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
```

- [ ] **Step 2: Inject StaffService in WhatsappService and register notifyFn**

In `src/whatsapp/whatsapp.service.ts`:

1. Add import at the top:
```ts
import { StaffService } from '../staff/staff.service';
```

2. In the constructor, add `private readonly staffService: StaffService` parameter alongside the existing ones.

3. In `onModuleInit()`, after the existing `setNotifyFn` call, add:
```ts
this.staffService.setNotifyFn((storeId, phone, message) =>
  this.sendMessage(storeId, phone, message),
);
```

The `onModuleInit` block should look like:
```ts
async onModuleInit(): Promise<void> {
  this.aiService.setSendFn((storeId, phone, message) =>
    this.sendMessage(storeId, phone, message),
  );
  this.adminAssistant.setNotifyFn((storeId, phone, message) =>
    this.sendMessage(storeId, phone, message),
  );
  this.staffService.setNotifyFn((storeId, phone, message) =>
    this.sendMessage(storeId, phone, message),
  );
  // ... rest of onModuleInit unchanged
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/whatsapp/whatsapp.module.ts src/whatsapp/whatsapp.service.ts
git commit -m "feat(staff): wire StaffService notifyFn in WhatsappModule"
```

---

## Task 6 — Cron auto-lift in ReportsService (Backend)

**Files:**
- Modify: `src/reports/reports.module.ts`
- Modify: `src/reports/reports.service.ts`

- [ ] **Step 1: Add StaffModule to ReportsModule imports**

In `src/reports/reports.module.ts`:

```ts
import { Module, forwardRef } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    EmailModule,
    forwardRef(() => WhatsappModule),
    StaffModule,
  ],
  controllers: [ReportsController],
  providers:   [ReportsService],
  exports:     [ReportsService],
})
export class ReportsModule {}
```

- [ ] **Step 2: Inject StaffService and add auto-lift cron in reports.service.ts**

In `src/reports/reports.service.ts`:

1. Add import:
```ts
import { StaffService } from '../staff/staff.service';
```

2. Add `private readonly staffService: StaffService` to the constructor.

3. Add new cron method after the existing `@Cron('30 11 * * *')` method:
```ts
// 1:30am Colombia = 6:30am UTC
@Cron('30 6 * * *', { name: 'auto-lift-suspensions', timeZone: 'UTC' })
async autoLiftStaffSuspensions(): Promise<void> {
  await this.staffService.autoLiftSuspensions();
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/reports/reports.module.ts src/reports/reports.service.ts
git commit -m "feat(staff): daily cron auto-lifts expired suspensions"
```

---

## Task 7 — AI: buildSystemPrompt suspended block + computeSlotsForAI filter (Backend)

**Files:**
- Modify: `src/ai/ai.service.ts`

This task has 3 sub-changes in the same file: (a) update the staff cache select to include suspension fields, (b) filter suspended staff in computeSlotsForAI, (c) add suspended block in buildSystemPrompt.

- [ ] **Step 1: Update staff cache select to include suspension fields**

Find the staff `findMany` inside the staff cache block in `generateResponse` (around line 1194). It currently selects `{ staffId, name, schedule }`. Change it to also include `suspendedFrom` and `suspendedUntil`:

```ts
return this.prisma.staff
  .findMany({
    where:   { storeId, isActive: true },
    orderBy: { createdAt: 'asc' },
    select:  { staffId: true, name: true, schedule: true, suspendedFrom: true, suspendedUntil: true },
  })
```

- [ ] **Step 2: Filter suspended staff from computeSlotsForAI**

Find `computeSlotsForAI` (around line 1039). Its signature currently is:
```ts
private async computeSlotsForAI(
  storeId: string,
  date: Date,
  activeStaff: { staffId: string; name: string; schedule: any }[],
  store: { businessHours: any },
)
```

Update the `activeStaff` type and add filtering at the top of the method body:

```ts
private async computeSlotsForAI(
  storeId: string,
  date: Date,
  activeStaff: { staffId: string; name: string; schedule: any; suspendedFrom?: Date | null; suspendedUntil?: Date | null }[],
  store: { businessHours: any },
): Promise<{ name: string; slots: string[]; occupied: string[] }[]> {
  // Filter out currently suspended staff — they have no real availability to offer
  const now = new Date();
  const nonSuspended = activeStaff.filter(s =>
    !(s.suspendedFrom && s.suspendedUntil && s.suspendedFrom <= now && now <= s.suspendedUntil)
  );

  // ... rest of function unchanged but using `nonSuspended` instead of `activeStaff`
```

Then replace the `const members = activeStaff.length > 0` line to use `nonSuspended`:
```ts
const members = nonSuspended.length > 0
  ? nonSuspended
  : [{ staffId: null as any, name: (store as any).name ?? 'Negocio', schedule: null }];
```

- [ ] **Step 3: Add suspended staff block in buildSystemPrompt**

Find `buildSystemPrompt` (around line 2754). Update its `activeStaff` parameter type:

```ts
activeStaff: Array<{ staffId: string; name: string; schedule?: any; suspendedFrom?: Date | null; suspendedUntil?: Date | null }> = [],
```

Find where `staffBlock` is built (around line 2950). Before the `staffBlock` declaration, add a helper and split staff into active vs suspended:

```ts
const now = new Date();
const isSuspendedNow = (s: { suspendedFrom?: Date | null; suspendedUntil?: Date | null }) =>
  !!(s.suspendedFrom && s.suspendedUntil && s.suspendedFrom <= now && now <= s.suspendedUntil);

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DAYS_ES   = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const fmtSuspendDate = (d: Date) => {
  const local = new Date(d.getTime() - 5 * 60 * 60 * 1000); // UTC-5
  return `${DAYS_ES[local.getDay()]} ${local.getDate()} de ${MONTHS_ES[local.getMonth()]}`;
};

const availableStaff  = activeStaff.filter(s => !isSuspendedNow(s));
const suspendedStaff  = activeStaff.filter(s => isSuspendedNow(s));
```

Then change the `staffBlock` to use `availableStaff` instead of `activeStaff`:

```ts
const staffBlock = availableStaff.length > 0
  ? `\nEQUIPO DISPONIBLE (${staffLabelCap}s):\n${availableStaff.map((s) => {
      const schedLine = s.schedule
        ? `\n    Horario: ${formatBusinessHoursForAI(s.schedule as any).split('\n').join(', ')}`
        : '';
      return `- ${s.name} (id: ${s.staffId})${schedLine}`;
    }).join('\n')}\n\nREGLA OBLIGATORIA DE AGENDAMIENTO CON EQUIPO:\n1. SIEMPRE pregunta: "¿Con qué ${staffLabel} quieres tu cita? Tenemos disponibles: ${availableStaff.map(s => s.name).join(', ')}"\n2. El cliente DEBE elegir un ${staffLabel} antes de confirmar.\n3. Una vez elegido, NO preguntes de nuevo.\n4. ANTES de proponer, dar por agendada o confirmar una fecha con un ${staffLabel}, verifica SIEMPRE su horario (arriba, "Horario: ...") para ese día de la semana específico. Si el horario muestra "Cerrado" o no incluye ese día, el ${staffLabel} NO trabaja ese día — NO lo ofrezcas para esa fecha, NO digas que la cita quedó agendada/confirmada con él, y avísale al cliente de inmediato proponiendo otro día u otro ${staffLabel} que sí esté disponible. Revisa esto ANTES de responder, nunca después de haber prometido algo.\n5. Si el ${staffLabel} elegido no está disponible en ese horario, avisa y sugiere otro horario o ${staffLabel} alternativo — nunca confirmes primero y corrijas después.\n6. Cuando el cliente pregunte por el horario de un ${staffLabel} específico, usa el horario indicado arriba para responderle con precisión.`
  : '';
```

Then add the suspended block right after `staffBlock`:

```ts
const suspendedBlock = suspendedStaff.length > 0
  ? `\nSTAFF TEMPORALMENTE NO DISPONIBLE:\n${suspendedStaff.map(s =>
      `- ${s.name}: no disponible, regresa el ${fmtSuspendDate(s.suspendedUntil!)}. NO ofrezcas citas con esta persona.`
    ).join('\n')}\n\nSi un cliente pide específicamente a alguien de esta lista, responde: "En este momento ${staffLabel} [nombre] no está disponible, regresa el [fecha].${availableStaff.length > 0 ? ` ¿Te puedo agendar con ${availableStaff.map(s => s.name).join(' o ')}?"` : ' ¿Quieres que te agende para cuando regrese?"'}`
  : '';
```

Finally, in the return string of `buildSystemPrompt`, add `suspendedBlock` right after `staffBlock` (find where `${staffBlock}` appears in the template and append `${suspendedBlock}`).

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/ai/ai.service.ts
git commit -m "feat(staff): AI ignores suspended staff for slots + suspended block in prompt"
```

---

## Task 8 — Public service: include suspended staff in availability response (Backend)

**Files:**
- Modify: `src/public/public.service.ts`

The public calendar must show suspended staff with a "regresa el [fecha]" badge instead of slots. The backend must include them in the response.

- [ ] **Step 1: Update the SlotResult type to include suspension fields**

Find the `SlotResult` interface or type in `src/public/public.service.ts` (if it's a local type). Add `suspended` and `suspendedUntil`:

```ts
interface SlotResult {
  staffId: string | null;
  name: string;
  slots: string[];
  occupiedSlots: string[];
  suspended?: boolean;
  suspendedUntil?: string;  // ISO string
}
```

If `SlotResult` is defined elsewhere (e.g. exported from a types file), update it there.

- [ ] **Step 2: Update the staff query in getAvailability to include suspension fields**

Find the `prisma.staff.findMany` call in `getAvailability` (around line 175). Currently selects `{ staffId, name, schedule }`. Add the new fields:

```ts
const activeStaff = await this.prisma.staff.findMany({
  where:   { storeId: store.storeId, isActive: true },
  orderBy: { createdAt: 'asc' },
  select:  { staffId: true, name: true, schedule: true, suspendedFrom: true, suspendedUntil: true },
});
```

- [ ] **Step 3: Add suspension check in the staff loop**

In the `for (const member of activeStaff)` loop inside `getAvailability`, add a suspension check before computing slots:

```ts
for (const member of activeStaff) {
  // Check suspension
  const now = new Date();
  if (member.suspendedFrom && member.suspendedUntil &&
      member.suspendedFrom <= now && now <= member.suspendedUntil) {
    results.push({
      staffId:       member.staffId,
      name:          member.name,
      slots:         [],
      occupiedSlots: [],
      suspended:     true,
      suspendedUntil: member.suspendedUntil.toISOString(),
    });
    continue;
  }

  // Original slot computation (unchanged)
  const hours = (member.schedule ?? store.businessHours) as Record<string, any> | null;
  // ...
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/public/public.service.ts
git commit -m "feat(staff): public availability API includes suspended staff with return date"
```

---

## Task 9 — Frontend: api.ts new functions

**Files:**
- Modify: `src/services/api.ts`

- [ ] **Step 1: Add suspendStaff and unsuspendStaff functions**

In `src/services/api.ts`, after the existing `deleteStaff` function, add:

```ts
export const suspendStaff = (id: string, from: string, until: string) =>
  api.patch(`/staff/${id}/suspend`, { from, until });

export const unsuspendStaff = (id: string) =>
  api.patch(`/staff/${id}/unsuspend`);
```

- [ ] **Step 2: Commit**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
git add src/services/api.ts
git commit -m "feat(staff): suspendStaff and unsuspendStaff API functions"
```

---

## Task 10 — Frontend: SuspendStaffModal.tsx (new component)

**Files:**
- Create: `src/components/SuspendStaffModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
import React, { useState } from 'react';
import { suspendStaff } from '../services/api';

interface Props {
  staffId: string;
  staffName: string;
  staffLabel: string;
  onClose: () => void;
  onSuspended: () => void;
}

export default function SuspendStaffModal({ staffId, staffName, staffLabel, onClose, onSuspended }: Props) {
  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [from,    setFrom]    = useState(today);
  const [until,   setUntil]   = useState(tomorrow);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleConfirm = async () => {
    if (!from || !until) { setError('Completa ambas fechas'); return; }
    if (until <= from)   { setError('"Hasta" debe ser posterior a "Desde"'); return; }
    if (until <= today)  { setError('"Hasta" debe ser al menos mañana'); return; }

    setLoading(true);
    setError('');
    try {
      await suspendStaff(staffId, from, until);
      onSuspended();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error al suspender');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl border border-border-default w-full max-w-sm p-6 space-y-5">
        <h3 className="text-lg font-semibold text-txt-primary">
          Suspender a {staffName}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-txt-secondary mb-1">Desde</label>
            <input
              type="date"
              value={from}
              min={today}
              onChange={e => setFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm border border-border-default bg-surface-elevated text-txt-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-txt-secondary mb-1">Hasta</label>
            <input
              type="date"
              value={until}
              min={tomorrow}
              onChange={e => setUntil(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm border border-border-default bg-surface-elevated text-txt-primary"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <p className="text-xs text-txt-tertiary">
          El {staffLabel.toLowerCase()} quedará marcado como no disponible durante este período. Las citas existentes no se cancelan automáticamente.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm border border-border-default text-txt-secondary hover:bg-surface-overlay transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 transition disabled:opacity-50"
          >
            {loading ? 'Suspendiendo...' : 'Confirmar suspensión'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
git add src/components/SuspendStaffModal.tsx
git commit -m "feat(staff): SuspendStaffModal component"
```

---

## Task 11 — Frontend: Config.tsx EquipoSection updates

**Files:**
- Modify: `src/pages/Config.tsx`

- [ ] **Step 1: Update StaffMember interface to include suspension fields**

Find the `interface StaffMember` (around line 977). Add two new fields:

```ts
interface StaffMember {
  staffId: string;
  name: string;
  isActive: boolean;
  schedule: BusinessHoursJson | null;
  commissionPercentage: number | null;
  suspendedFrom: string | null;
  suspendedUntil: string | null;
  createdAt: string;
}
```

- [ ] **Step 2: Add imports and state for suspend modal**

At the top of `Config.tsx`, add the import:
```ts
import SuspendStaffModal from '../components/SuspendStaffModal';
```

Inside `EquipoSection`, add new state variables after the existing ones:
```ts
const [suspending,       setSuspending]       = useState<string | null>(null);    // staffId being suspended
const [unsuspending,     setUnsuspending]     = useState<string | null>(null);    // staffId being unsuspended
const [suspendTarget,    setSuspendTarget]    = useState<StaffMember | null>(null); // opens modal
```

Add the import at the top of `Config.tsx`:
```ts
import { getStaff, getStore, createStaff, updateStaff, deleteStaff, suspendStaff, unsuspendStaff } from '../services/api';
```

(Remove the old individual imports if they were destructured separately.)

- [ ] **Step 3: Add handleUnsuspend function inside EquipoSection**

After `handleDelete`, add:

```ts
const handleUnsuspend = async (id: string) => {
  if (!window.confirm(`¿Levantar la suspensión de este ${staffLabel}?`)) return;
  setUnsuspending(id);
  try {
    await unsuspendStaff(id);
    setStaff(p => p.map(s => s.staffId === id ? { ...s, suspendedFrom: null, suspendedUntil: null } : s));
  } catch {
    setError('Error al levantar la suspensión');
  } finally {
    setUnsuspending(null);
  }
};
```

- [ ] **Step 4: Add suspension status helper inside EquipoSection**

```ts
const isCurrentlySuspended = (s: StaffMember): boolean => {
  if (!s.suspendedFrom || !s.suspendedUntil) return false;
  const now   = new Date();
  const from  = new Date(s.suspendedFrom);
  const until = new Date(s.suspendedUntil);
  return from <= now && now <= until;
};

const fmtSuspendDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Bogota',
  });
};
```

- [ ] **Step 5: Update the table row to show badge and buttons**

Find the staff table row (inside `staff.map(s => ...)`) and update the "Nombre" cell and "Acciones" cell:

**Nombre cell** — add suspension badge below the name:
```tsx
<td className="px-4 py-3">
  <div>
    <span className="text-txt-primary font-medium">{s.name}</span>
    {isCurrentlySuspended(s) && (
      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30">
        Suspendido hasta {fmtSuspendDate(s.suspendedUntil!)}
      </span>
    )}
  </div>
</td>
```

**Acciones cell** — add suspend/unsuspend buttons:
```tsx
<td className="px-4 py-3 text-right">
  <div className="flex items-center justify-end gap-2">
    <button
      onClick={() => { setEditing(s); setShowModal(true); }}
      className="px-3 py-1.5 rounded-lg text-xs border border-border-default text-txt-secondary hover:bg-surface-overlay transition"
    >
      Editar
    </button>
    {isCurrentlySuspended(s) ? (
      <button
        onClick={() => handleUnsuspend(s.staffId)}
        disabled={unsuspending === s.staffId}
        className="px-3 py-1.5 rounded-lg text-xs border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition disabled:opacity-50"
      >
        {unsuspending === s.staffId ? '...' : 'Levantar suspensión'}
      </button>
    ) : (
      <button
        onClick={() => setSuspendTarget(s)}
        disabled={suspending === s.staffId}
        className="px-3 py-1.5 rounded-lg text-xs border border-border-default text-txt-secondary hover:bg-surface-overlay transition disabled:opacity-50"
      >
        Suspender
      </button>
    )}
    <button
      onClick={() => handleDelete(s.staffId)}
      disabled={deleting === s.staffId}
      className="px-3 py-1.5 rounded-lg text-xs border border-red-800/50 text-red-400 hover:bg-red-900/20 transition disabled:opacity-50"
    >
      {deleting === s.staffId ? '...' : 'Desactivar'}
    </button>
  </div>
</td>
```

- [ ] **Step 6: Add SuspendStaffModal to the render output**

After the existing `{showModal && <StaffModal ... />}` block, add:

```tsx
{suspendTarget && (
  <SuspendStaffModal
    staffId={suspendTarget.staffId}
    staffName={suspendTarget.name}
    staffLabel={staffLabelCap}
    onClose={() => setSuspendTarget(null)}
    onSuspended={() => {
      // Re-fetch staff list to get updated suspendedFrom/Until
      getStaff().then(r => setStaff(r.data)).catch(() => {});
      setSuspendTarget(null);
    }}
  />
)}
```

- [ ] **Step 7: Verify TypeScript compiles — no unused vars**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
npx tsc --noEmit
```

Fix any unused variable warnings (Vercel CI=true treats them as errors).

- [ ] **Step 8: Commit**

```bash
git add src/pages/Config.tsx
git commit -m "feat(staff): suspend/unsuspend buttons and badge in Equipo tab"
```

---

## Task 12 — Frontend: PublicCalendar.tsx suspended badge

**Files:**
- Modify: `src/pages/PublicCalendar.tsx`

- [ ] **Step 1: Update StaffSlots interface**

Find `interface StaffSlots` (line 5). Add `suspended` and `suspendedUntil`:

```ts
interface StaffSlots {
  staffId: string | null;
  name: string;
  slots: string[];
  occupiedSlots?: string[];
  suspended?: boolean;
  suspendedUntil?: string;  // ISO string
}
```

- [ ] **Step 2: Add date formatter helper**

Add near the top of the component (outside JSX):

```ts
const fmtReturnDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota',
  });
```

- [ ] **Step 3: Update the staff card rendering to handle suspended state**

Find the `staff.map((s, i) => ...)` block (around line 215). Replace the card content with a version that checks `s.suspended`:

```tsx
{staff.map((s, i) => (
  <div key={s.staffId ?? i} className="bg-[#111117] rounded-2xl p-5 border border-white/10">
    <p className="font-semibold text-white mb-3 flex items-center gap-2">
      <span className="text-[#D4FF00] text-lg">✂</span>
      {s.name}
      {s.suspended && (
        <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-normal">
          No disponible
        </span>
      )}
    </p>
    {s.suspended ? (
      <p className="text-xs text-amber-400/80 italic">
        Regresa el {s.suspendedUntil ? fmtReturnDate(s.suspendedUntil) : 'pronto'}
      </p>
    ) : s.slots.length === 0 && (!s.occupiedSlots || s.occupiedSlots.length === 0) ? (
      <p className="text-xs text-gray-500 italic">Sin disponibilidad este día</p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {s.slots.map(slot => (
          <button
            key={slot}
            type="button"
            onClick={() => setSlotChoice({ staffId: s.staffId, staffName: s.name, date: toISO(date), time: slot })}
            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 hover:border-green-500/50 transition"
          >
            {fmtSlot(slot)}
          </button>
        ))}
        {s.occupiedSlots?.map(slot => (
          <span
            key={`occ-${slot}`}
            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-red-500/10 border border-red-500/20 text-red-400/60 cursor-not-allowed"
            title="Horario ocupado"
          >
            {fmtSlot(slot)}
          </span>
        ))}
      </div>
    )}
  </div>
))}
```

- [ ] **Step 4: Verify TypeScript compiles — no unused vars**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/PublicCalendar.tsx
git commit -m "feat(staff): public calendar shows suspended badge + return date"
```

---

## Task 13 — Push both repos to production

- [ ] **Step 1: Push backend**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
git push origin main
```

InstaPods auto-deploys from `main`. The build runs `npx prisma db push --accept-data-loss && npx prisma generate && npm run build`, but the new columns are covered by `STARTUP_MIGRATIONS` in `onModuleInit()` — they'll be applied before the first request.

- [ ] **Step 2: Push frontend**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
git push origin main
```

Vercel auto-deploys. `CI=true` so no unused vars/imports allowed.

- [ ] **Step 3: Verify health check**

```bash
curl https://whatsapp-crm.ash-1.instapods.app/health
```

Expected: 200 OK.

- [ ] **Step 4: Smoke test in the app**

1. Go to `/config` → tab "Equipo"
2. Click "Suspender" on any staff member → modal opens
3. Set dates and confirm → badge "Suspendido hasta [fecha]" appears
4. Click "Levantar suspensión" → badge disappears
5. Go to `/cal/:slug` → suspended staff shows amber badge + "Regresa el [fecha]"
6. Send a WhatsApp message asking for the suspended staff → AI responds with unavailability + offers alternative

---

## Self-Review Checklist

- [x] Schema changes covered (Task 1)
- [x] STARTUP_MIGRATIONS for new columns (Task 1)
- [x] `SuspendStaffDto` with validation (Task 2)
- [x] `suspend()` validates dates, notifies admin, is multi-tenant safe (Task 3)
- [x] `unsuspend()` clears fields, multi-tenant safe (Task 3)
- [x] `autoLiftSuspensions()` idempotent via `updateMany` (Task 3)
- [x] `notifyFn` callback decouples StaffService from WhatsappService (Tasks 3, 5)
- [x] New endpoints in controller with `JwtAuthGuard` (Task 4)
- [x] WhatsappModule imports StaffModule + registers notifyFn (Task 5)
- [x] ReportsModule imports StaffModule + daily cron auto-lift (Task 6)
- [x] AI staff cache includes `suspendedFrom/Until` (Task 7)
- [x] `computeSlotsForAI` filters suspended staff (Task 7)
- [x] `buildSystemPrompt` shows suspended block + rule (Task 7)
- [x] Public service includes suspended staff with return date (Task 8)
- [x] `suspendStaff`/`unsuspendStaff` in api.ts (Task 9)
- [x] `SuspendStaffModal` component with dark mode inputs (Task 10)
- [x] Config.tsx badges, buttons, modal wiring (Task 11)
- [x] PublicCalendar suspended badge + return date (Task 12)
- [x] Push + smoke test (Task 13)
