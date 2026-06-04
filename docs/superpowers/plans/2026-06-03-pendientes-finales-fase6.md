# Pendientes Finales + FASE 6 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar los 4 pendientes del backlog (adminPhone UI, edición de citas, nueva cita manual, plantillas barbería) y ejecutar la FASE 6 (PWA + Capacitor iOS/Android).

**Architecture:** Cambios en su mayoría de frontend (React 19 + TypeScript + Tailwind en CRA 5). El único cambio de backend es agregar `adminPhone` al DTO de stores. Para PWA usamos un service worker manual en `public/sw.js` registrado desde `index.tsx`. Capacitor envuelve el build de CRA (`build/`) como app nativa.

**Tech Stack:** React 19 + TypeScript + Tailwind (CRA 5) | NestJS 11 + Prisma (backend) | @capacitor/core + @capacitor/cli + @capacitor/android + @capacitor/ios

**Repos:**
- Frontend: `C:\Users\alexp\Desktop\proyectos\stockup-frontend`
- Backend: `C:\Users\alexp\Desktop\proyectos\whatsapp-crm`

---

## Task 1: Backend — adminPhone en DTO de tienda

**Files:**
- Modify: `C:\Users\alexp\Desktop\proyectos\whatsapp-crm\src\stores\dto\create-store.dto.ts`

El campo `adminPhone` ya existe en el modelo Prisma `Store` (`admin_phone`), pero el DTO no lo expone. El `StoresService.update()` ya hace `prisma.store.update({ data: safeData })` con todos los campos del DTO, así que solo falta agregarlo al DTO.

- [ ] **Step 1: Modificar `create-store.dto.ts`**

```typescript
// C:\Users\alexp\Desktop\proyectos\whatsapp-crm\src\stores\dto\create-store.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsString()
  @IsOptional()
  ownerName?: string;

  @IsString()
  @IsOptional()
  adminPhone?: string;
}
```

- [ ] **Step 2: Verificar que TypeScript compila sin errores**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 3: Commit backend**

```bash
cd C:\Users\alexp\Desktop\proyectos\whatsapp-crm
git add src/stores/dto/create-store.dto.ts
git commit -m "feat(stores): expose adminPhone field in DTO"
```

---

## Task 2: Frontend — adminPhone en sección Negocio de Config

**Files:**
- Modify: `C:\Users\alexp\Desktop\proyectos\stockup-frontend\src\pages\Config.tsx`

La sección `NegocioSection` (línea ~238) carga y guarda `name`, `phone`, `ownerName`. Hay que agregar `adminPhone` al form state, leerlo del GET `/stores/:id`, enviarlo en el PATCH y mostrarlo como un cuarto campo.

- [ ] **Step 1: Ampliar el form state y el efecto de carga**

Ubicar la función `NegocioSection` en `Config.tsx`. Cambiar el `useState` inicial y el `useEffect` de carga:

```tsx
// Antes (línea ~239):
const [form, setForm] = useState({ name: '', phone: '', ownerName: '' });

// Después:
const [form, setForm] = useState({ name: '', phone: '', ownerName: '', adminPhone: '' });
```

```tsx
// En el useEffect (línea ~246), cambiar el setForm:
setForm({
  name:       res.data.name       ?? '',
  phone:      res.data.phone      ?? '',
  ownerName:  res.data.ownerName  ?? '',
  adminPhone: res.data.adminPhone ?? '',
});
```

- [ ] **Step 2: Incluir adminPhone en el PATCH**

En `handleSave` (línea ~258), el `api.patch` ya pasa el objeto `form` completo, pero actualmente es:

```tsx
await api.patch(`/stores/${storeId}`, { name: form.name, phone: form.phone, ownerName: form.ownerName });
```

Cambiar a:

```tsx
await api.patch(`/stores/${storeId}`, {
  name:       form.name,
  phone:      form.phone,
  ownerName:  form.ownerName,
  adminPhone: form.adminPhone || undefined,
});
```

- [ ] **Step 3: Agregar el campo de input en el formulario JSX**

Dentro del `<form>`, después del bloque del campo `ownerName` (cerca de línea 319) y antes del bloque de error, agregar:

```tsx
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1.5">
    Teléfono personal del admin
    <span className="ml-2 text-xs font-normal text-slate-400">(opcional)</span>
  </label>
  <input
    value={form.adminPhone}
    onChange={e => setForm({ ...form, adminPhone: e.target.value })}
    placeholder="+573001234567"
    className={inputClass}
  />
  <p className="text-xs text-slate-400 mt-1.5">
    Notificaciones de citas (pagos, solicitudes cancel/reagenda, reportes diarios) llegan a este número por WhatsApp.
  </p>
</div>
```

- [ ] **Step 4: Verificar que TypeScript compila**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 5: Commit frontend**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
git add src/pages/Config.tsx
git commit -m "feat(config): add adminPhone field in Negocio settings"
```

---

## Task 3: Editar cita desde el detail panel

**Files:**
- Modify: `C:\Users\alexp\Desktop\proyectos\stockup-frontend\src\pages\Appointments.tsx`

El `DetailPanel` (línea ~191) actualmente solo permite cambiar estado y ver/confirmar pagos. Hay que agregar una tercera pestaña "Editar" con un formulario inline para `scheduledAt`, `endsAt`, `durationMinutes`, `description`, `address`, `agreedPrice`, `notes`, `internalNotes`.

- [ ] **Step 1: Agregar pestaña 'editar' al tipo y estado**

En `DetailPanel`, cambiar el tipo de `activeDetailTab`:

```tsx
// Antes (línea ~197):
const [activeDetailTab, setActiveDetailTab] = useState<'detalle' | 'pago'>('detalle');

// Después:
const [activeDetailTab, setActiveDetailTab] = useState<'detalle' | 'pago' | 'editar'>('detalle');
```

Agregar estado para el formulario de edición justo después de los estados existentes:

```tsx
const [editForm, setEditForm] = useState({
  scheduledAt:    '',
  endsAt:         '',
  durationMinutes:'',
  description:    '',
  address:        '',
  agreedPrice:    '',
  notes:          '',
  internalNotes:  '',
});
const [editSaving, setEditSaving] = useState(false);
const [editSaved,  setEditSaved]  = useState(false);
```

- [ ] **Step 2: Inicializar editForm cuando cambia el appointment**

En el `useEffect` que ya existe para resetear tabs (línea ~202), agregar inicialización del editForm:

```tsx
useEffect(() => {
  setActiveDetailTab('detalle');
  setPaymentForm({ paymentMethod: '', paymentAmount: '', paymentNotes: '' });
  setEditForm({
    scheduledAt:     appt.scheduledAt ? appt.scheduledAt.slice(0, 16) : '',
    endsAt:          appt.endsAt      ? appt.endsAt.slice(0, 16)      : '',
    durationMinutes: appt.durationMinutes != null ? String(appt.durationMinutes) : '',
    description:     appt.description    ?? '',
    address:         appt.address        ?? '',
    agreedPrice:     appt.agreedPrice    != null ? String(appt.agreedPrice) : '',
    notes:           appt.notes          ?? '',
    internalNotes:   appt.internalNotes  ?? '',
  });
}, [appt.appointmentId]);
```

- [ ] **Step 3: Agregar handler de guardado de edición**

Dentro de `DetailPanel`, después del `handleResolveAction`, agregar:

```tsx
const handleEditSave = async () => {
  setEditSaving(true);
  setEditSaved(false);
  try {
    const payload: Record<string, any> = {};
    if (editForm.scheduledAt)     payload.scheduledAt     = new Date(editForm.scheduledAt).toISOString();
    if (editForm.endsAt)          payload.endsAt          = new Date(editForm.endsAt).toISOString();
    if (editForm.durationMinutes) payload.durationMinutes = Number(editForm.durationMinutes);
    payload.description   = editForm.description   || null;
    payload.address       = editForm.address       || null;
    payload.agreedPrice   = editForm.agreedPrice   ? Number(editForm.agreedPrice) : null;
    payload.notes         = editForm.notes         || null;
    payload.internalNotes = editForm.internalNotes || null;
    await onUpdate(appt.appointmentId, payload);
    setEditSaved(true);
    setTimeout(() => setEditSaved(false), 3000);
  } finally {
    setEditSaving(false);
  }
};
```

- [ ] **Step 4: Agregar la pestaña "Editar" al tab selector**

Localizar el bloque `{(['detalle', 'pago'] as const).map(tab => (` (línea ~275). Cambiar a:

```tsx
{(['detalle', 'pago', 'editar'] as const).map(tab => (
  <button
    key={tab}
    onClick={() => setActiveDetailTab(tab)}
    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition capitalize ${
      activeDetailTab === tab
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-slate-500 hover:text-slate-700'
    }`}
  >
    {tab === 'detalle' ? 'Detalle' : tab === 'pago' ? 'Pago' : 'Editar'}
  </button>
))}
```

- [ ] **Step 5: Agregar el contenido de la pestaña Editar**

Después del bloque `{/* payment tab */}` y antes del cierre del `</div>` del body, agregar:

```tsx
{/* edit tab */}
{activeDetailTab === 'editar' && (
  <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha y hora</label>
      <input
        type="datetime-local"
        value={editForm.scheduledAt}
        onChange={e => setEditForm(f => ({ ...f, scheduledAt: e.target.value }))}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1 block">Hora de fin</label>
      <input
        type="datetime-local"
        value={editForm.endsAt}
        onChange={e => setEditForm(f => ({ ...f, endsAt: e.target.value }))}
        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1 block">Duración (minutos)</label>
      <input
        type="number"
        min={5}
        max={1440}
        value={editForm.durationMinutes}
        onChange={e => setEditForm(f => ({ ...f, durationMinutes: e.target.value }))}
        placeholder="60"
        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1 block">Descripción</label>
      <textarea
        rows={2}
        value={editForm.description}
        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
        placeholder="Tipo de servicio, detalles..."
        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1 block">Dirección</label>
      <input
        value={editForm.address}
        onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
        placeholder="Calle 123..."
        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1 block">Precio acordado (COP)</label>
      <input
        type="number"
        min={0}
        value={editForm.agreedPrice}
        onChange={e => setEditForm(f => ({ ...f, agreedPrice: e.target.value }))}
        placeholder="0"
        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1 block">Notas al cliente</label>
      <textarea
        rows={2}
        value={editForm.notes}
        onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
        placeholder="Instrucciones, preparación..."
        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1 block">Notas internas</label>
      <textarea
        rows={2}
        value={editForm.internalNotes}
        onChange={e => setEditForm(f => ({ ...f, internalNotes: e.target.value }))}
        placeholder="Solo visible para el admin..."
        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <button
      onClick={handleEditSave}
      disabled={editSaving}
      className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition btn-gradient"
    >
      {editSaving ? 'Guardando...' : 'Guardar cambios'}
    </button>
    {editSaved && (
      <p className="text-xs text-green-600 font-medium text-center flex items-center justify-center gap-1.5">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Cita actualizada correctamente
      </p>
    )}
  </div>
)}
```

- [ ] **Step 6: Verificar compilación TypeScript**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 7: Commit**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
git add src/pages/Appointments.tsx
git commit -m "feat(appointments): add edit tab in detail panel"
```

---

## Task 4: Botón "Nueva cita" — crear cita manual desde el panel

**Files:**
- Modify: `C:\Users\alexp\Desktop\proyectos\stockup-frontend\src\pages\Appointments.tsx`

Necesitamos:
1. Un componente `NewAppointmentModal` que cargue clientes y servicios
2. Un botón "Nueva cita" en el header de `Appointments`
3. Un handler `handleCreate` en el componente principal

Importaciones adicionales requeridas: `useAuth` (para `storeId`), `createAppointment`, `getCustomers`, `getServices`.

- [ ] **Step 1: Agregar los imports necesarios**

Al inicio de `Appointments.tsx`, agregar a los imports de api:

```tsx
// Línea actual:
import {
  getAppointments, getAppointmentStats,
  updateAppointment, getAppointmentTimeline,
} from '../services/api';

// Cambiar a:
import {
  getAppointments, getAppointmentStats,
  updateAppointment, getAppointmentTimeline,
  createAppointment, getCustomers, getServices,
} from '../services/api';
import { useAuth } from '../hooks/useAuth';
```

- [ ] **Step 2: Agregar tipos Customer y Service para el modal**

Después de la interfaz `Appointment` existente, agregar:

```tsx
interface CustomerOption { customerId: string; name: string | null; phone: string; }
interface ServiceOption  { serviceId:  string; name: string; }
```

- [ ] **Step 3: Agregar el componente `NewAppointmentModal`**

Antes de `// ─── List View`, agregar el componente completo:

```tsx
// ─── New Appointment Modal ─────────────────────────────────────────────────────

function NewAppointmentModal({ storeId, onCreated, onClose }: {
  storeId: string;
  onCreated: () => void;
  onClose: () => void;
}) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [services,  setServices]  = useState<ServiceOption[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(true);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const defaultDT = tomorrow.toISOString().slice(0, 16);

  const [form, setForm] = useState({
    customerId:      '',
    serviceId:       '',
    scheduledAt:     defaultDT,
    durationMinutes: '60',
    description:     '',
    address:         '',
    agreedPrice:     '',
    notes:           '',
    priority:        'NORMAL' as const,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    Promise.all([getCustomers(storeId), getServices()])
      .then(([cr, sr]) => {
        setCustomers(cr.data);
        setServices(sr.data);
      })
      .catch(() => {})
      .finally(() => setLoadingOpts(false));
  }, [storeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.scheduledAt) {
      setError('Cliente y fecha/hora son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
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
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al crear la cita.');
    } finally {
      setSaving(false);
    }
  };

  const ic = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-slate-800">Nueva cita manual</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {loadingOpts ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin text-blue-600" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cliente *</label>
              <select
                value={form.customerId}
                onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}
                className={ic}
                required
              >
                <option value="">Seleccionar cliente...</option>
                {customers.map(c => (
                  <option key={c.customerId} value={c.customerId}>
                    {c.name ? `${c.name} — ${c.phone}` : c.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Servicio</label>
              <select
                value={form.serviceId}
                onChange={e => setForm(f => ({ ...f, serviceId: e.target.value }))}
                className={ic}
              >
                <option value="">Sin servicio específico</option>
                {services.map(s => (
                  <option key={s.serviceId} value={s.serviceId}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fecha y hora *</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                  className={ic}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Duración (min)</label>
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={form.durationMinutes}
                  onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
                  className={ic}
                  placeholder="60"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Precio acordado (COP)</label>
                <input
                  type="number"
                  min={0}
                  value={form.agreedPrice}
                  onChange={e => setForm(f => ({ ...f, agreedPrice: e.target.value }))}
                  className={ic}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prioridad</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))}
                  className={ic}
                >
                  <option value="LOW">Baja</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descripción</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Detalles del servicio..."
                className={`${ic} resize-none`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dirección</label>
              <input
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Calle, barrio..."
                className={ic}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notas al cliente</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Instrucciones, recordatorios..."
                className={`${ic} resize-none`}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2.5 text-xs">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !form.customerId || !form.scheduledAt}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition btn-gradient"
              >
                {saving ? 'Creando...' : 'Crear cita'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Agregar estado y handler en el componente `Appointments`**

En la función `Appointments()`, dentro del bloque de `useState`, después del `const [view, setView]`, agregar:

```tsx
const [showNewAppt, setShowNewAppt] = useState(false);
const { storeId } = useAuth();
```

- [ ] **Step 5: Agregar el botón "Nueva cita" en el header**

Dentro del `<div className="flex items-center gap-2">` que contiene el view toggle y el botón "Actualizar" (línea ~802), agregar el botón antes del view toggle:

```tsx
<button
  onClick={() => setShowNewAppt(true)}
  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold btn-gradient"
>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
  Nueva cita
</button>
```

- [ ] **Step 6: Renderizar el modal al final del return**

Antes del cierre del `</div>` raíz de `Appointments`, agregar:

```tsx
{showNewAppt && (
  <NewAppointmentModal
    storeId={storeId}
    onCreated={load}
    onClose={() => setShowNewAppt(false)}
  />
)}
```

- [ ] **Step 7: Verificar compilación TypeScript**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 8: Commit**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
git add src/pages/Appointments.tsx
git commit -m "feat(appointments): add manual appointment creation modal"
```

---

## Task 5: Plantillas barbería en Servicios

**Files:**
- Modify: `C:\Users\alexp\Desktop\proyectos\stockup-frontend\src\pages\Services.tsx`

Agregar un botón "Plantillas" que abra un modal con servicios predefinidos para barbería/salón. Al hacer clic en una plantilla, se llama `createService` con los datos pre-llenados.

- [ ] **Step 1: Definir las plantillas como constante**

Al inicio de `Services.tsx`, después de las constantes `PRICE_TYPE_OPTIONS` (alrededor de línea 59), agregar:

```tsx
const BARBERIA_TEMPLATES: Array<{
  name: string; category: string; description: string;
  priceType: PriceType; basePrice: number; estimatedMinutes: number;
}> = [
  { name: 'Corte de cabello',        category: 'Corte',     description: 'Corte de cabello con tijeras o máquina',     priceType: 'FIXED',   basePrice: 20000,  estimatedMinutes: 30 },
  { name: 'Corte + Barba',           category: 'Combo',     description: 'Corte de cabello y arreglo de barba',        priceType: 'FIXED',   basePrice: 35000,  estimatedMinutes: 45 },
  { name: 'Arreglo de barba',        category: 'Barba',     description: 'Perfilado y arreglo de barba con navaja',    priceType: 'FIXED',   basePrice: 15000,  estimatedMinutes: 20 },
  { name: 'Tinte de cabello',        category: 'Color',     description: 'Coloración completa con tinte profesional',  priceType: 'VARIABLE',basePrice: 80000,  estimatedMinutes: 90 },
  { name: 'Mechas / highlights',     category: 'Color',     description: 'Mechas parciales o completas',               priceType: 'VARIABLE',basePrice: 100000, estimatedMinutes: 120},
  { name: 'Manicure',                category: 'Uñas',      description: 'Limpieza y esmaltado de uñas de manos',      priceType: 'FIXED',   basePrice: 25000,  estimatedMinutes: 45 },
  { name: 'Pedicure',                category: 'Uñas',      description: 'Limpieza y esmaltado de uñas de pies',       priceType: 'FIXED',   basePrice: 30000,  estimatedMinutes: 60 },
  { name: 'Manicure + Pedicure',     category: 'Uñas',      description: 'Combo manicure y pedicure',                  priceType: 'FIXED',   basePrice: 50000,  estimatedMinutes: 90 },
  { name: 'Alisado / keratina',      category: 'Tratamientos', description: 'Alisado con keratina o formol',           priceType: 'VARIABLE',basePrice: 150000, estimatedMinutes: 180},
  { name: 'Hidratación capilar',     category: 'Tratamientos', description: 'Mascarilla nutritiva + baño de crema',    priceType: 'FIXED',   basePrice: 45000,  estimatedMinutes: 60 },
  { name: 'Maquillaje',              category: 'Estética',  description: 'Maquillaje social o artístico',              priceType: 'VARIABLE',basePrice: 60000,  estimatedMinutes: 60 },
  { name: 'Depilación con cera',     category: 'Depilación',description: 'Depilación zona a convenir',                 priceType: 'VARIABLE',basePrice: 20000,  estimatedMinutes: 30 },
];
```

- [ ] **Step 2: Agregar estado para el modal de plantillas**

En el componente principal de `Services.tsx` (busca la función `export default function Services()`), agregar el estado:

```tsx
const [showTemplates, setShowTemplates] = useState(false);
const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);
```

- [ ] **Step 3: Agregar el handler de aplicar plantilla**

```tsx
const handleApplyTemplate = async (tpl: typeof BARBERIA_TEMPLATES[0]) => {
  setApplyingTemplate(tpl.name);
  try {
    await createService({
      name:             tpl.name,
      category:         tpl.category,
      description:      tpl.description,
      priceType:        tpl.priceType,
      basePrice:        tpl.basePrice,
      estimatedMinutes: tpl.estimatedMinutes,
    });
    await loadServices();
    setShowTemplates(false);
  } catch {
    // silently ignore if service already exists
  } finally {
    setApplyingTemplate(null);
  }
};
```

Nota: `loadServices` es la función de carga ya existente en el componente (normalmente se llama `load` o similar — verifica el nombre real en el código).

- [ ] **Step 4: Agregar el botón "Plantillas" en el header del componente**

Localizar el botón principal "Nuevo servicio" (tiene el `PlusIcon` y algo como "Nuevo servicio"). Antes de ese botón, agregar:

```tsx
<button
  onClick={() => setShowTemplates(true)}
  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
  Plantillas
</button>
```

- [ ] **Step 5: Agregar el modal de plantillas**

Al final del return del componente `Services`, antes del cierre del JSX raíz, agregar:

```tsx
{showTemplates && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800">Plantillas de servicios</h2>
          <p className="text-xs text-slate-400 mt-0.5">Barbería, salón de belleza y estética — un clic para agregar</p>
        </div>
        <button
          onClick={() => setShowTemplates(false)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {BARBERIA_TEMPLATES.map(tpl => {
          const isApplying = applyingTemplate === tpl.name;
          return (
            <button
              key={tpl.name}
              onClick={() => handleApplyTemplate(tpl)}
              disabled={isApplying}
              className="text-left p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition group disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">{tpl.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{tpl.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{tpl.category}</span>
                    <span className="text-xs font-medium text-emerald-600">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(tpl.basePrice)}
                    </span>
                    <span className="text-xs text-slate-400">{tpl.estimatedMinutes} min</span>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100">
                  {isApplying ? (
                    <svg className="animate-spin text-blue-500" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
        <p className="text-xs text-slate-400 text-center">
          Cada plantilla crea un nuevo servicio. Puedes editarlo después desde el panel de servicios.
        </p>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 6: Verificar el nombre real de la función de carga**

En `Services.tsx` buscar la función de recarga de servicios. Si se llama diferente a `loadServices`, reemplazar el nombre en `handleApplyTemplate`. Buscar: `getServices().then(` o `setServices(` para localizarla.

- [ ] **Step 7: Verificar compilación TypeScript**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 8: Commit**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
git add src/pages/Services.tsx
git commit -m "feat(services): add barberia/salon service templates modal"
```

---

## Task 6: PWA — manifest.json + service worker

**Files:**
- Modify: `C:\Users\alexp\Desktop\proyectos\stockup-frontend\public\manifest.json`
- Create: `C:\Users\alexp\Desktop\proyectos\stockup-frontend\public\sw.js`
- Modify: `C:\Users\alexp\Desktop\proyectos\stockup-frontend\src\index.tsx`

- [ ] **Step 1: Actualizar manifest.json con branding de Stockup**

Reemplazar todo el contenido de `public/manifest.json`:

```json
{
  "short_name": "Stockup",
  "name": "Stockup Mensajes — CRM WhatsApp",
  "description": "Gestiona tu negocio, clientes y citas desde WhatsApp",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    },
    {
      "src": "logo192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "any maskable"
    },
    {
      "src": "logo512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "any maskable"
    }
  ],
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#2563eb",
  "background_color": "#f8fafc",
  "lang": "es",
  "categories": ["business", "productivity"]
}
```

- [ ] **Step 2: Crear el service worker `public/sw.js`**

Crear el archivo `C:\Users\alexp\Desktop\proyectos\stockup-frontend\public\sw.js`:

```javascript
const CACHE_NAME = 'stockup-v1';
const STATIC_ASSETS = [
  '/',
  '/static/js/main.chunk.js',
  '/static/css/main.chunk.css',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: network-first, no cache
  if (url.pathname.startsWith('/api') || url.hostname !== self.location.hostname) {
    return;
  }

  // Navigate requests: network-first, fall back to /index.html for SPA
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
```

- [ ] **Step 3: Registrar el service worker en `src/index.tsx`**

Modificar `src/index.tsx` para agregar el registro del SW al final del archivo:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();

// Register service worker for PWA support
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {});
  });
}
```

- [ ] **Step 4: Verificar compilación TypeScript**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
npx tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 5: Commit**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
git add public/manifest.json public/sw.js src/index.tsx
git commit -m "feat(pwa): update manifest, add service worker"
```

---

## Task 7: FASE 6 — Capacitor iOS/Android

**Files:**
- Modify: `C:\Users\alexp\Desktop\proyectos\stockup-frontend\package.json`
- Create: `C:\Users\alexp\Desktop\proyectos\stockup-frontend\capacitor.config.ts`

- [ ] **Step 1: Instalar Capacitor**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
npm install @capacitor/core
npm install -D @capacitor/cli
npm install @capacitor/android @capacitor/ios
```

Esperado: packages instalados sin errores críticos (warnings son ok).

- [ ] **Step 2: Crear `capacitor.config.ts`**

```typescript
// C:\Users\alexp\Desktop\proyectos\stockup-frontend\capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stockup.mensajes',
  appName: 'Stockup Mensajes',
  webDir: 'build',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
```

- [ ] **Step 3: Agregar scripts de Capacitor en `package.json`**

En la sección `"scripts"` de `package.json`, agregar:

```json
"cap:sync":    "npx cap sync",
"cap:android": "npm run build && npx cap sync android && npx cap open android",
"cap:ios":     "npm run build && npx cap sync ios && npx cap open ios",
"cap:build":   "npm run build && npx cap sync"
```

El bloque scripts completo queda:

```json
"scripts": {
  "start":       "react-scripts start",
  "build":       "react-scripts build",
  "test":        "react-scripts test",
  "eject":       "react-scripts eject",
  "cap:sync":    "npx cap sync",
  "cap:android": "npm run build && npx cap sync android && npx cap open android",
  "cap:ios":     "npm run build && npx cap sync ios && npx cap open ios",
  "cap:build":   "npm run build && npx cap sync"
}
```

- [ ] **Step 4: Inicializar plataformas Android e iOS**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
npx cap add android
npx cap add ios
```

Esperado: directorios `android/` e `ios/` creados.

> **Nota:** `npx cap add ios` requiere macOS. En Windows, solo `android` funcionará localmente. Para iOS, se compila en un Mac o via CI.

- [ ] **Step 5: Hacer build y sincronizar**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
npm run build
npx cap sync
```

Esperado: "Sync finished in Xs" sin errores.

- [ ] **Step 6: Verificar `.gitignore` para no incluir directorios nativos en el commit inicial**

Agregar al `.gitignore` si no está:

```
# Capacitor
/android
/ios
```

> Los directorios `android/` e `ios/` son generados y se regeneran con `npx cap sync`. En producción se configuran en CI/CD.

- [ ] **Step 7: Commit**

```bash
cd C:\Users\alexp\Desktop\proyectos\stockup-frontend
git add package.json package-lock.json capacitor.config.ts .gitignore
git commit -m "feat(pwa): add Capacitor config for iOS/Android packaging"
```

---

## Verificación final

- [ ] Abrir `https://stockup-frontend.vercel.app` después de deploy, ir a Configuración → Negocio: confirmar campo "Teléfono personal del admin"
- [ ] Abrir Agendamientos: confirmar botón "Nueva cita" en el header
- [ ] Click en una cita → pestaña "Editar": confirmar campos editables
- [ ] Abrir Servicios: confirmar botón "Plantillas" → modal con 12 servicios de barbería
- [ ] En Chrome DevTools → Application → Manifest: confirmar que muestra "Stockup Mensajes" y theme `#2563eb`
- [ ] En Chrome DevTools → Application → Service Workers: confirmar que `sw.js` está registrado (en production build)
- [ ] Ejecutar `npm run cap:build` localmente: confirmar que copia el build a `android/app/src/main/assets/public/`

---

## Resumen de archivos tocados

| Archivo | Cambio |
|---|---|
| `whatsapp-crm/src/stores/dto/create-store.dto.ts` | + campo `adminPhone` |
| `stockup-frontend/src/pages/Config.tsx` | + campo adminPhone en NegocioSection |
| `stockup-frontend/src/pages/Appointments.tsx` | + pestaña Editar en DetailPanel + modal Nueva cita |
| `stockup-frontend/src/pages/Services.tsx` | + modal Plantillas barbería |
| `stockup-frontend/public/manifest.json` | branding Stockup + PWA config |
| `stockup-frontend/public/sw.js` | nuevo service worker |
| `stockup-frontend/src/index.tsx` | registro del SW |
| `stockup-frontend/capacitor.config.ts` | nuevo config Capacitor |
| `stockup-frontend/package.json` | + @capacitor/*, scripts cap:* |
