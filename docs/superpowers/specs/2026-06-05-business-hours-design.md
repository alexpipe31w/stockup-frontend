# Business Hours & Business Info — Design Spec
**Fecha:** 2026-06-05  
**Proyecto:** Stockup Messages (frontend + backend)  
**Estado:** Aprobado

---

## Resumen

Agregar gestión de información completa del negocio y horarios de atención. Los horarios se usan para: (1) adaptar el calendario de citas, (2) bloquear creación de citas fuera de horario, (3) dar contexto a la IA para responder preguntas de clientes y recomendar horarios válidos.

---

## 1. Data Model — Backend (`whatsapp-crm`)

### Campos nuevos en modelo `Store` (prisma db push)

```prisma
// Información del negocio
description     String?   // descripción breve de qué hace el negocio
address         String?   // dirección física
neighborhood    String?   // barrio / ciudad
directions      String?   // indicaciones de cómo llegar (texto libre)
googleMapsUrl   String?   // link de Google Maps

// Contacto y redes
email           String?
website         String?
instagram       String?
facebook        String?
tiktok          String?

// Pagos
paymentMethods  String[]  // ["efectivo","nequi","daviplata","transferencia","debito","credito"]
paymentAccount  String?   // número Nequi / cuenta bancaria
requiresDeposit Boolean   @default(false)
depositAmount   String?   // monto o porcentaje (ej: "20000" o "30%")

// Políticas
minAdvanceMinutes Int?    // tiempo mínimo de anticipación en minutos (ej: 120)
cancellationPolicy String? // texto libre
hasDelivery     Boolean   @default(false)
deliveryZone    String?   // zona de cobertura para domicilios
hasParking      Boolean   @default(false)

// Horarios de atención
businessHours   Json?     // estructura DaySchedule por día
```

### Estructura JSON de `businessHours`

```typescript
type TimeSlot = { open: string; close: string };  // "HH:mm" 24h
type DaySchedule = {
  isOpen: boolean;
  shift1: TimeSlot | null;
  shift2: TimeSlot | null;  // null = jornada corrida (sin almuerzo)
};
type BusinessHours = {
  mon: DaySchedule;
  tue: DaySchedule;
  wed: DaySchedule;
  thu: DaySchedule;
  fri: DaySchedule;
  sat: DaySchedule;
  sun: DaySchedule;
};
```

**Ejemplo:**
```json
{
  "mon": { "isOpen": true,  "shift1": { "open": "08:00", "close": "12:00" }, "shift2": { "open": "14:00", "close": "19:00" } },
  "sat": { "isOpen": true,  "shift1": { "open": "09:00", "close": "14:00" }, "shift2": null },
  "sun": { "isOpen": false, "shift1": null, "shift2": null }
}
```

**Backwards compatibility:** Si `businessHours` es `null`, todas las validaciones se saltan — el comportamiento existente no cambia.

---

## 2. Backend — `whatsapp-crm`

### 2.1 UpdateStoreDto

Agregar todos los campos nuevos con `@IsOptional()`. `paymentMethods` usa `@IsArray() @IsString({ each: true })`. `businessHours` usa `@IsObject()`.

### 2.2 Utilidad `src/utils/business-hours.util.ts`

Función pura exportable:

```typescript
export function isWithinBusinessHours(
  scheduledAt: Date,
  businessHours: BusinessHours,
  timezone = 'America/Bogota'
): boolean
```

- Convierte `scheduledAt` a hora local del negocio (timezone)
- Determina el día de la semana (`mon`–`sun`)
- Si `isOpen: false` → retorna `false`
- Compara contra `shift1` (y `shift2` si existe)
- Retorna `true` si la hora cae dentro de cualquier franja activa

También exporta:

```typescript
export function formatBusinessHoursForAI(hours: BusinessHours): string
// Retorna texto legible: "Lunes a Viernes: 8:00am–12:00pm y 2:00pm–7:00pm\nSábados: 9:00am–2:00pm\nDomingos: Cerrado"

export function getEarliestOpenTime(hours: BusinessHours): string  // "08:00"
export function getLatestCloseTime(hours: BusinessHours): string   // "19:00"
```

### 2.3 AppointmentsService.create()

Antes de `prisma.appointment.create()`:

```typescript
if (store.businessHours) {
  const ok = isWithinBusinessHours(data.scheduledAt, store.businessHours);
  if (!ok) {
    throw new BadRequestException(
      'La hora solicitada está fuera del horario de atención del negocio.'
    );
  }
}
```

El store se obtiene del mismo fetch que ya hace el servicio para validar `storeId`.

### 2.4 AI System Prompt — `ai.service.ts` → `buildSystemPrompt()`

Sección nueva inyectada automáticamente cuando `store.businessHours` existe:

```
INFORMACIÓN DEL NEGOCIO:
[description si existe]
Dirección: [address], [neighborhood]
Cómo llegar: [directions]
Google Maps: [googleMapsUrl]

CONTACTO:
Email: [email] | Web: [website]
Instagram: @[instagram] | Facebook: [facebook]

PAGOS ACEPTADOS: Efectivo, Nequi, Daviplata (número: XXXX)
[Si requiresDeposit] Se requiere depósito de [depositAmount] para confirmar la cita.

POLÍTICAS:
- Las citas deben agendarse con mínimo [minAdvanceMinutes/60]h de anticipación.
- [cancellationPolicy]
[Si hasDelivery] - Ofrecemos servicio a domicilio en: [deliveryZone]
[Si hasParking] - Contamos con parqueadero disponible.

HORARIO DE ATENCIÓN:
Lunes a Viernes: 8:00am–12:00pm y 2:00pm–7:00pm
Sábados: 9:00am–2:00pm
Domingos: Cerrado

REGLA CRÍTICA DE HORARIOS:
- NUNCA agendes citas fuera del horario de atención.
- Si el cliente pide una hora no disponible, sugiere la hora válida más cercana.
- Si el día solicitado está cerrado, sugiere el próximo día hábil.
```

Solo se inyectan los campos que no son `null`/`undefined`.

---

## 3. Frontend — Config (`stockup-frontend`)

### Pestaña "Negocio" — estructura de cards

El form hace un solo `PATCH /stores/:storeId` con todos los campos. Un botón "Guardar cambios" al final de la página.

#### Card 1 — Información básica
`name` (ya existe), `ownerName` (ya existe), `description` (textarea), `address`, `neighborhood`, `directions` (textarea), `googleMapsUrl`

#### Card 2 — Contacto y redes sociales
`phone` (ya existe), `adminPhone` (ya existe), `email`, `website`, `instagram` (con prefijo `@`), `facebook`, `tiktok`

#### Card 3 — Métodos de pago
Checkboxes: Efectivo · Nequi · Daviplata · Transferencia bancaria · Tarjeta débito · Tarjeta crédito  
Campo texto: número Nequi / cuenta (condicional: aparece si Nequi o Transferencia están marcados)  
Toggle + campo: "Requiere depósito" → monto o porcentaje

#### Card 4 — Políticas
Select "Anticipación mínima": 30 min / 1 hora / 2 horas / 4 horas / 24 horas  
Textarea "Política de cancelación"  
Toggle "Servicio a domicilio" → campo "Zona de cobertura" (condicional)  
Toggle "Parqueadero disponible"

#### Card 5 — Horarios de atención
Tabla con 7 filas (Lun–Dom). Cada fila:

```
[toggle isOpen] Lunes   [08:00] → [12:00]   [+ tarde toggle]  [14:00] → [19:00]
[toggle isOpen] Domingo  —— CERRADO ——
```

- Si `isOpen` está apagado: la fila se desactiva con opacidad reducida
- Si "+ tarde" está apagado: los inputs de shift2 se ocultan
- Copiar horario: botón "Aplicar lun–vie a todos los días hábiles"

---

## 4. Frontend — Calendario de Citas (`Appointments.tsx`)

### Rango horario dinámico

```typescript
// Reemplaza el array HOURS hardcodeado
const calendarHours = useMemo(() => {
  if (!businessHours) return range(7, 22);  // fallback actual
  const earliest = getEarliestOpenTime(businessHours);  // "08:00" → 8
  const latest   = getLatestCloseTime(businessHours);   // "19:00" → 19
  return range(earliest, latest + 1);
}, [businessHours]);
```

### Visualización de celdas

Cada celda del grid `[día][hora]` evalúa su estado:

| Estado | Estilo |
|--------|--------|
| Dentro de horario (shift1 o shift2) | Normal — interactivo |
| Fuera de horario (antes/después del negocio) | `bg-surface-overlay/50 cursor-not-allowed` |
| Entre shift1 y shift2 (almuerzo) | `bg-surface-overlay/40` con patrón de rayas sutiles |
| Día cerrado (isOpen: false) | `bg-surface-overlay/60 cursor-not-allowed` + label "Cerrado" centrado en la columna |
| Sin businessHours configurado | Todo normal (backwards compatible) |

### Obtener businessHours en Appointments

`useAuth()` ya provee el `storeId`. Se agrega un `useEffect` que hace `GET /stores/:storeId` al montar la página y extrae `businessHours`. Si la tienda no tiene configurado, no cambia nada.

---

## 5. Frontend — Modal "Nueva Cita"

### Validación en submit

```typescript
if (businessHours && !isWithinBusinessHoursClient(form.scheduledAt, businessHours)) {
  setOutOfHoursWarning(true);  // muestra banner
  return;  // no envía todavía
}
submitAppointment();
```

### Banner de advertencia

```
⚠️ Esta hora está fuera del horario de atención.
   El negocio atiende [horario del día solicitado].
   
   [Cancelar]   [Guardar de todas formas]
```

- "Cancelar" → vuelve al form para corregir la hora
- "Guardar de todas formas" → llama `submitAppointment()` sin re-validar en frontend (el backend deja pasar porque reconoce que es admin — *ver nota*)

> **Nota de implementación:** El backend actualmente no distingue si la petición viene del admin o de la IA. Para el override del admin, se agrega un campo opcional `forceSchedule: boolean` en el DTO de creación. Si `true`, el backend salta la validación de horario. El frontend solo lo envía cuando el admin confirma el banner.

---

## 6. Flujo completo — IA + cliente por WhatsApp

1. Cliente pide cita para el domingo a las 3pm
2. IA tiene en su system prompt: "Domingos: Cerrado"
3. IA responde: *"Los domingos estamos cerrados. ¿Te parece bien el lunes a las 3pm?"*
4. Si el LLM falla y extrae la cita de todas formas → backend lanza `BadRequestException` → la IA recibe el error y responde al cliente que ese horario no está disponible
5. Red de seguridad doble: system prompt + validación backend

---

## 7. Archivos a crear / modificar

### Backend (`whatsapp-crm`)
| Archivo | Acción |
|---------|--------|
| `prisma/schema.prisma` | Agregar campos al modelo `Store` |
| `src/stores/dto/update-store.dto.ts` | Agregar campos nuevos |
| `src/utils/business-hours.util.ts` | **Crear** — funciones puras de validación y formato |
| `src/appointments/appointments.service.ts` | Agregar validación en `create()` |
| `src/ai/ai.service.ts` | Inyectar info del negocio + horarios en `buildSystemPrompt()` |

### Frontend (`stockup-frontend`)
| Archivo | Acción |
|---------|--------|
| `src/pages/Config.tsx` | Expandir pestaña Negocio con 5 cards |
| `src/pages/Appointments.tsx` | Rango dinámico + celdas bloqueadas + validación modal |
| `src/services/api.ts` | Actualizar tipo de respuesta de `getStore` / `updateStore` |
| `src/utils/businessHours.ts` | **Crear** — `isWithinBusinessHoursClient()` (misma lógica, sin timezone lib) |

---

## 8. Out of scope

- Excepciones de días festivos (se puede agregar después)
- Múltiples turnos/empleados con disponibilidad independiente
- Bloqueo de slots ya ocupados (collision detection — feature separada)
- Vista de disponibilidad pública para clientes
