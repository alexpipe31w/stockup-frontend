import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api, { getMySubscription, createCheckout, getStore, updateStore, getStaff, createStaff, updateStaff, deleteStaff } from '../services/api';
import AiConfigPage from './AiConfig';
import {
  BusinessHoursJson, DaySchedule, DAY_KEYS, DAY_LABELS, DEFAULT_BUSINESS_HOURS,
} from '../utils/businessHours';
import FloatingSaveBar from '../components/FloatingSaveBar';

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'negocio' | 'ia' | 'excluidos' | 'suscripcion' | 'equipo';

interface BlockedContact {
  blockedId: string;
  phone: string;
  label: string | null;
  createdAt: string;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <svg className="animate-spin" style={{ color: 'var(--color-primary)' }} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 11-6.219-8.56"/>
      </svg>
    </div>
  );
}

// ── TAB: NEGOCIO ───────────────────────────────────────────────────────────

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

// ── Shared UI components ───────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-lime' : 'bg-surface-overlay'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function BusinessHoursEditor({
  hours,
  onChange,
}: {
  hours: BusinessHoursJson;
  onChange: (h: BusinessHoursJson) => void;
}) {
  const setDay = (key: string, patch: Partial<DaySchedule>) =>
    onChange({ ...hours, [key]: { ...hours[key as keyof BusinessHoursJson], ...patch } });

  const setShift = (key: string, shift: 'shift1' | 'shift2', field: 'open' | 'close', val: string) => {
    const day = { ...hours[key as keyof BusinessHoursJson] };
    const existing = day[shift] ?? { open: '08:00', close: '18:00' };
    onChange({ ...hours, [key]: { ...day, [shift]: { ...existing, [field]: val } } });
  };

  return (
    <div className="space-y-2">
      {DAY_KEYS.map(key => {
        const day = hours[key];
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
  );
}

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
    requiresCustomerAddress: false,
    requiresCustomerCedula: false,
    businessHours: DEFAULT_BUSINESS_HOURS as BusinessHoursJson,
    staffLabel: 'Barbero',
    slug: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');
  const [initial, setInitial] = useState('');   // snapshot del form cargado para detectar cambios

  useEffect(() => {
    getStore(storeId).then(res => {
      const d = res.data;
      const loaded = {
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
        requiresCustomerAddress: d.requiresCustomerAddress ?? false,
        requiresCustomerCedula:  d.requiresCustomerCedula  ?? false,
        businessHours:      d.businessHours      ?? DEFAULT_BUSINESS_HOURS,
        staffLabel:         d.staffLabel         ?? 'Barbero',
        slug:               d.slug               ?? '',
      };
      setForm(loaded);
      setInitial(JSON.stringify(loaded));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [storeId]);

  const setf = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));

  const togglePayment = (val: string) =>
    setf('paymentMethods', form.paymentMethods.includes(val)
      ? form.paymentMethods.filter(v => v !== val)
      : [...form.paymentMethods, val]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
        requiresCustomerAddress: form.requiresCustomerAddress,
        requiresCustomerCedula:  form.requiresCustomerCedula,
        businessHours:      form.businessHours,
        staffLabel:         form.staffLabel      || undefined,
        slug:               form.slug            || undefined,
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

      {/* Card 4.5 — Datos del cliente que la IA debe pedir */}
      <div className={card}>
        <CardHeader
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          title="Datos del cliente" sub="¿Qué información debe pedir la IA al agendar una cita?"
        />
        <p className="text-xs text-txt-secondary -mt-1">
          Actívalo solo si tu negocio realmente necesita ese dato (ej: visitas a domicilio, instalaciones,
          entregas o trámites). Si tus clientes asisten a tu local, déjalo apagado — así la IA nunca
          lo pedirá ni lo guardará por error.
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Toggle value={form.requiresCustomerAddress} onChange={() => setf('requiresCustomerAddress', !form.requiresCustomerAddress)} />
            <span className="text-sm text-txt-primary">Requiere dirección del cliente</span>
          </div>
          <p className="text-xs text-txt-secondary -mt-2 ml-12">
            Actívalo si haces visitas a domicilio, entregas o instalaciones. La IA pedirá y guardará
            la dirección física para agendar la cita.
          </p>
          <div className="flex items-center gap-3">
            <Toggle value={form.requiresCustomerCedula} onChange={() => setf('requiresCustomerCedula', !form.requiresCustomerCedula)} />
            <span className="text-sm text-txt-primary">Requiere cédula / documento del cliente</span>
          </div>
          <p className="text-xs text-txt-secondary -mt-2 ml-12">
            Actívalo si necesitas el número de documento para contratos, garantías o trámites
            con el cliente.
          </p>
        </div>
      </div>

      {/* Card 5 — Tipo de personal */}
      <div className={card}>
        <CardHeader
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          title="Tipo de personal" sub="¿Cómo se llama el personal en tu negocio?"
        />
        <div className="flex flex-wrap gap-2 mb-3">
          {['Barbero', 'Estilista', 'Técnico', 'Asesor'].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setf('staffLabel', opt)}
              className={`py-1.5 px-4 rounded-xl border text-sm font-medium transition ${
                form.staffLabel === opt
                  ? 'border-lime bg-lime/10 text-lime'
                  : 'border-border-default text-txt-secondary hover:bg-surface-overlay'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <input
          value={form.staffLabel}
          onChange={e => setf('staffLabel', e.target.value)}
          placeholder="O escribe otro (ej: Colorista, Nutricionista...)"
          className={ic}
        />
      </div>

      {/* Link público del calendario */}
      <div className={card}>
        <p className="text-sm font-semibold text-txt-primary mb-1">Link público del calendario</p>
        <p className="text-xs text-txt-secondary mb-3">
          Comparte este link para que tus clientes vean tu disponibilidad sin necesidad de registrarse.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-txt-tertiary whitespace-nowrap flex-shrink-0">…/cal/</span>
          <input
            value={form.slug}
            onChange={e => setf('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="mi-negocio"
            maxLength={100}
            className={ic}
          />
        </div>
        {form.slug && (
          <div className="mt-2 flex items-center gap-2 p-2 bg-surface-elevated rounded-lg border border-border-default">
            <span className="text-xs text-txt-secondary truncate flex-1 font-mono">
              {window.location.origin}/cal/{form.slug}
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/cal/${form.slug}`);
              }}
              className="text-xs text-lime hover:underline flex-shrink-0 font-medium"
            >
              Copiar
            </button>
          </div>
        )}
      </div>

      {/* Card 6 — Horarios de atención */}
      <div className={card}>
        <CardHeader
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          title="Horarios de atención" sub="El calendario y la IA respetarán estos horarios"
        />
        <BusinessHoursEditor
          hours={form.businessHours}
          onChange={h => setf('businessHours', h)}
        />
      </div>

      {error && <p className="text-sm text-red-400 px-1">{error}</p>}
      <button type="submit" disabled={saving}
        className="w-full py-3 rounded-2xl font-semibold text-[#0A0A0F] transition disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}>
        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
      </button>

      <FloatingSaveBar
        dirty={initial !== '' && JSON.stringify(form) !== initial}
        saving={saving}
        saved={saved}
        onSave={() => handleSave()}
      />
    </form>
  );
}


// ── TAB: EXCLUIDOS ─────────────────────────────────────────────────────────

const emptyBlockedForm = { phone: '', label: '' };

function ExcluidosSection() {
  const [contacts, setContacts] = useState<BlockedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyBlockedForm);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/blocked');
      setContacts(res.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val && !val.startsWith('+')) val = `+${val}`;
    setForm({ ...form, phone: val });
  };

  const handleBlock = async () => {
    if (!form.phone) return;
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 11) {
      setError('Incluye el código de país completo. Ej: +573001234567 (Colombia)');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/blocked', { phone: form.phone, label: form.label || undefined });
      setShowModal(false);
      setForm(emptyBlockedForm);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al bloquear número');
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (id: string) => {
    if (!window.confirm('¿Desbloquear este número?')) return;
    setRemovingId(id);
    try {
      await api.delete(`/blocked/${id}`);
      await load();
    } catch {} finally {
      setRemovingId(null);
    }
  };

  const labelColor = (label: string | null) => {
    if (!label) return 'bg-surface-overlay text-txt-secondary';
    const l = label.toLowerCase();
    if (l.includes('empleado')) return 'bg-blue-50 text-blue-600';
    if (l.includes('distribuidor') || l.includes('proveedor')) return 'bg-purple-50 text-purple-600';
    return 'bg-orange-50 text-orange-500';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-txt-primary">Contactos excluidos</h2>
          <p className="text-sm text-txt-tertiary mt-0.5">Números que el bot ignora — empleados, distribuidores, proveedores</p>
        </div>
        <button
          onClick={() => { setForm(emptyBlockedForm); setError(''); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-txt-inverse gradient-brand"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Agregar
        </button>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" className="flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-blue-700 text-sm">
          <strong>Tip:</strong> También puedes silenciar el bot enviando{' '}
          <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs">!stop</code>{' '}
          desde el número del cliente.
        </p>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
          {contacts.length === 0 ? (
            <div className="p-16 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </div>
              <p className="text-txt-primary font-medium">No hay números excluidos</p>
              <p className="text-txt-tertiary text-sm">Agrega empleados, distribuidores o proveedores para que el bot los ignore</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-txt-tertiary uppercase tracking-wider">Número</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-txt-tertiary uppercase tracking-wider">Etiqueta</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-txt-tertiary uppercase tracking-wider hidden sm:table-cell">Agregado</th>
                  <th className="px-6 py-4"/>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => (
                  <tr key={c.blockedId} className={`${i < contacts.length - 1 ? 'border-b border-slate-50' : ''} hover:bg-surface-elevated transition`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-surface-overlay flex items-center justify-center flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.22 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                          </svg>
                        </div>
                        <span className="font-semibold text-txt-primary text-sm">{c.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.label ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${labelColor(c.label)}`}>{c.label}</span>
                      ) : (
                        <span className="text-txt-disabled text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-txt-tertiary text-sm hidden sm:table-cell">
                      {new Date(c.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleUnblock(c.blockedId)}
                        disabled={removingId === c.blockedId}
                        className="text-red-400 hover:text-red-600 text-sm font-medium disabled:opacity-50 transition"
                      >
                        {removingId === c.blockedId ? '...' : 'Desbloquear'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal agregar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-txt-primary">Excluir número</h2>
              <button onClick={() => setShowModal(false)} className="text-txt-tertiary hover:text-txt-secondary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-txt-primary mb-1.5">Número de teléfono *</label>
                <input
                  value={form.phone}
                  onChange={handlePhoneChange}
                  className="w-full px-4 py-3 rounded-xl border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:ring-2 focus:ring-lime/30 text-sm"
                  placeholder="+573001234567"
                />
                <p className="text-xs text-txt-tertiary mt-1.5">Incluye el código de país. Ej: <strong>+57</strong>3001234567</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-txt-primary mb-1.5">
                  Etiqueta <span className="text-txt-tertiary font-normal">(opcional)</span>
                </label>
                <select
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border-default text-txt-primary focus:outline-none focus:ring-2 text-sm bg-surface"
                >
                  <option value="">Sin etiqueta</option>
                  <option value="Empleado">Empleado</option>
                  <option value="Distribuidor">Distribuidor</option>
                  <option value="Proveedor">Proveedor</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-border-default text-txt-secondary text-sm font-semibold hover:bg-surface-elevated transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleBlock}
                disabled={saving || !form.phone}
                className="flex-1 py-3 rounded-xl text-txt-inverse gradient-brand"
              >
                {saving ? 'Guardando...' : 'Excluir número'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TAB: SUSCRIPCIÓN ───────────────────────────────────────────────────────

interface SubPayment {
  paymentId: string;
  mpPaymentId: string | null;
  amount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface SubData {
  subscriptionStatus: string;
  subscriptionEnd: string | null;
  apiBlocked: boolean;
  currentPrice: number;
  currency: string;
  subscription: {
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    priceAmount: number;
    payments: SubPayment[];
  } | null;
}

function paymentStatusLabel(s: string) {
  if (s === 'approved') return { label: 'Pagado', cls: 'bg-emerald-100 text-emerald-700' };
  if (s === 'pending')  return { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' };
  if (s === 'rejected') return { label: 'Rechazado', cls: 'bg-red-100 text-red-700' };
  return { label: s, cls: 'bg-surface-overlay text-txt-secondary' };
}

function subStatusInfo(s: string) {
  if (s === 'active')   return { label: 'Activa', cls: 'bg-emerald-100 text-emerald-700' };
  if (s === 'pending')  return { label: 'Pendiente de pago', cls: 'bg-amber-100 text-amber-700' };
  if (s === 'expired')  return { label: 'Vencida', cls: 'bg-red-100 text-red-700' };
  return { label: 'Sin suscripción', cls: 'bg-surface-overlay text-txt-secondary' };
}

function SuscripcionSection() {
  const [data, setData] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMySubscription()
      .then(res => setData(res.data))
      .catch(() => setError('No se pudo cargar la suscripción'))
      .finally(() => setLoading(false));
  }, []);

  const handleRenew = async () => {
    setPayLoading(true);
    setError('');
    try {
      const res = await createCheckout();
      window.location.href = res.data.initPoint;
    } catch {
      setError('Error al generar el enlace de pago. Intenta de nuevo.');
      setPayLoading(false);
    }
  };

  if (loading) return <Spinner />;

  if (!data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm">
        {error || 'No se pudo cargar la información de suscripción.'}
      </div>
    );
  }

  const status = subStatusInfo(data.subscriptionStatus);
  const isActive = data.subscriptionStatus === 'active';
  const payments = data.subscription?.payments ?? [];

  return (
    <div className="space-y-5">
      {/* Estado actual */}
      <div className="bg-surface rounded-2xl border border-border-default p-6 shadow-sm">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-semibold text-txt-tertiary uppercase tracking-wide mb-2">Estado de tu plan</p>
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${status.cls}`}>
              {status.label}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-txt-tertiary mb-1">Plan mensual</p>
            <p className="text-2xl font-bold text-txt-primary">
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(data.currentPrice)}
            </p>
          </div>
        </div>

        {isActive && data.subscription?.currentPeriodEnd && (
          <div className="grid grid-cols-2 gap-4 bg-surface-elevated rounded-xl p-4 mb-5">
            <div>
              <p className="text-xs text-txt-tertiary mb-0.5">Desde</p>
              <p className="text-sm font-medium text-txt-primary">
                {new Date(data.subscription.currentPeriodStart!).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-xs text-txt-tertiary mb-0.5">Vence el</p>
              <p className="text-sm font-medium text-txt-primary">
                {new Date(data.subscription.currentPeriodEnd).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {data.apiBlocked && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Tu cuenta está bloqueada. Renueva tu suscripción para reactivarla.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleRenew}
          disabled={payLoading}
          className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #009ee3, #003087)' }}
        >
          {payLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Redirigiendo a MercadoPago...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="2"/>
                <path d="M2 10h20" stroke="white" strokeWidth="2"/>
              </svg>
              {isActive ? 'Renovar suscripción' : 'Activar suscripción — Pagar con MercadoPago'}
            </>
          )}
        </button>
      </div>

      {/* Historial de pagos */}
      <div className="bg-surface rounded-2xl border border-border-default shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle">
          <h3 className="font-semibold text-txt-primary text-sm">Historial de pagos</h3>
        </div>

        {payments.length === 0 ? (
          <div className="px-6 py-8 text-center text-txt-tertiary text-sm">
            Aún no tienes pagos registrados
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {payments.map(p => {
              const st = paymentStatusLabel(p.status);
              const date = p.paidAt ?? p.createdAt;
              return (
                <div key={p.paymentId} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      p.status === 'approved' ? 'bg-emerald-100' :
                      p.status === 'pending' ? 'bg-amber-100' : 'bg-red-100'
                    }`}>
                      {p.status === 'approved' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : p.status === 'pending' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-txt-primary">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(p.amount))}
                        {' '}— Plan mensual
                      </p>
                      <p className="text-xs text-txt-tertiary">
                        {new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                        {p.mpPaymentId && <span className="ml-2 font-mono text-txt-disabled">#{p.mpPaymentId.slice(-8)}</span>}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── TAB: EQUIPO ────────────────────────────────────────────────────────────────

interface StaffMember {
  staffId: string;
  name: string;
  isActive: boolean;
  schedule: BusinessHoursJson | null;
  commissionPercentage: number | null;
  createdAt: string;
}

function EquipoSection({ storeId }: { storeId: string }) {
  const [staff,      setStaff]      = useState<StaffMember[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState<StaffMember | null>(null);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [staffLabel, setStaffLabel] = useState('profesional');
  const [error,      setError]      = useState('');

  useEffect(() => {
    Promise.all([getStaff(), getStore(storeId)])
      .then(([sr, storeR]) => {
        setStaff(sr.data);
        setStaffLabel((storeR.data?.staffLabel ?? 'profesional').toLowerCase());
      })
      .catch(() => setError('Error cargando el equipo'))
      .finally(() => setLoading(false));
  }, [storeId]);

  const staffLabelCap = staffLabel.charAt(0).toUpperCase() + staffLabel.slice(1);

  const handleDelete = async (id: string) => {
    if (!window.confirm(`¿Desactivar a este ${staffLabel}?`)) return;
    setDeleting(id);
    try {
      await deleteStaff(id);
      setStaff(p => p.filter(s => s.staffId !== id));
    } catch {
      setError('Error al desactivar');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div className="text-sm text-txt-secondary p-4">Cargando equipo...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-txt-secondary">
          {staff.length === 0
            ? `Aún no tienes ${staffLabel}s registrados.`
            : `${staff.length} ${staffLabel}${staff.length !== 1 ? 's' : ''} activo${staff.length !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#0A0A0F] transition"
          style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
        >
          + Agregar {staffLabelCap}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {staff.length > 0 && (
        <div className="rounded-2xl border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated">
              <tr>
                <th className="text-left px-4 py-3 text-txt-secondary font-medium">Nombre</th>
                <th className="text-left px-4 py-3 text-txt-secondary font-medium hidden sm:table-cell">Horario</th>
                <th className="text-left px-4 py-3 text-txt-secondary font-medium hidden md:table-cell">Comisión</th>
                <th className="text-right px-4 py-3 text-txt-secondary font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {staff.map(s => (
                <tr key={s.staffId} className="bg-surface hover:bg-surface-elevated transition">
                  <td className="px-4 py-3 text-txt-primary font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-txt-secondary hidden sm:table-cell">
                    {s.schedule ? 'Horario propio' : 'Hereda del negocio'}
                  </td>
                  <td className="px-4 py-3 text-txt-secondary hidden md:table-cell">
                    {s.commissionPercentage != null ? `${s.commissionPercentage}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditing(s); setShowModal(true); }}
                        className="px-3 py-1.5 rounded-lg text-xs border border-border-default text-txt-secondary hover:bg-surface-overlay transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(s.staffId)}
                        disabled={deleting === s.staffId}
                        className="px-3 py-1.5 rounded-lg text-xs border border-red-800/50 text-red-400 hover:bg-red-900/20 transition disabled:opacity-50"
                      >
                        {deleting === s.staffId ? '...' : 'Desactivar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <StaffModal
          staffLabel={staffLabelCap}
          editing={editing}
          onClose={() => setShowModal(false)}
          onSaved={(updated) => {
            if (editing) {
              setStaff(p => p.map(s => s.staffId === updated.staffId ? updated : s));
            } else {
              setStaff(p => [...p, updated]);
            }
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function StaffModal({
  staffLabel, editing, onClose, onSaved,
}: {
  staffLabel: string;
  editing: StaffMember | null;
  onClose: () => void;
  onSaved: (s: StaffMember) => void;
}) {
  const [name,           setName]           = useState(editing?.name ?? '');
  const [hasOwnSchedule, setHasOwnSchedule] = useState(!!editing?.schedule);
  const [schedule,       setSchedule]       = useState<BusinessHoursJson>(
    (editing?.schedule as BusinessHoursJson | null) ?? DEFAULT_BUSINESS_HOURS,
  );
  const [commission,     setCommission]     = useState<string>(
    editing?.commissionPercentage != null ? String(editing.commissionPercentage) : '',
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    const commissionVal = commission.trim() !== '' ? Number(commission) : null;
    if (commissionVal !== null && (isNaN(commissionVal) || commissionVal < 0 || commissionVal > 100)) {
      setError('La comisión debe ser un número entre 0 y 100.'); return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        name: name.trim(),
        schedule: hasOwnSchedule ? schedule : null,
        commissionPercentage: commissionVal,
      };
      const res = editing
        ? await updateStaff(editing.staffId, payload)
        : await createStaff(payload);
      onSaved(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const ic = 'w-full px-4 py-3 rounded-xl border border-border-default bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-lime/30 text-sm text-txt-primary placeholder:text-txt-tertiary';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle sticky top-0 bg-surface z-10">
          <h2 className="text-base font-bold text-txt-primary">
            {editing ? `Editar ${staffLabel}` : `Nuevo ${staffLabel}`}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-txt-tertiary hover:bg-surface-overlay">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-txt-secondary mb-1.5">Nombre *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={`Nombre del ${staffLabel.toLowerCase()}`}
              className={ic}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-txt-secondary mb-1.5">Comisión (%)</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={commission}
                onChange={e => setCommission(e.target.value)}
                placeholder="Ej: 30"
                className={ic + ' pr-8'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-tertiary text-sm">%</span>
            </div>
            <p className="text-xs text-txt-tertiary mt-1">Opcional. Aparece en las analíticas para calcular ganancias por {staffLabel.toLowerCase()}.</p>
          </div>

          <div className="flex items-center gap-3">
            <Toggle value={hasOwnSchedule} onChange={() => setHasOwnSchedule(p => !p)} />
            <span className="text-sm text-txt-primary">Tiene horario propio</span>
          </div>

          {hasOwnSchedule ? (
            <div>
              <p className="text-xs text-txt-secondary mb-2">Define cuándo atiende este {staffLabel.toLowerCase()}:</p>
              <BusinessHoursEditor hours={schedule} onChange={setSchedule} />
            </div>
          ) : (
            <p className="text-sm text-txt-tertiary italic">Hereda el horario del negocio</p>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border-default text-sm text-txt-secondary hover:bg-surface-overlay transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#0A0A0F] disabled:opacity-60 transition"
              style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : `Crear ${staffLabel}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main: Config ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'negocio',
    label: 'Negocio',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'ia',
    label: 'Asistente IA',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 010 2h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 010-2h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/>
      </svg>
    ),
  },
  {
    id: 'excluidos',
    label: 'Excluidos',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
    ),
  },
  {
    id: 'suscripcion',
    label: 'Suscripción',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M2 10h20"/>
      </svg>
    ),
  },
  {
    id: 'equipo',
    label: 'Equipo',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
];

export default function Config() {
  const { storeId } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('negocio');

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-txt-primary">Configuración</h1>
        <p className="text-txt-secondary mt-1 text-sm">Personaliza tu plataforma desde un solo lugar</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface-overlay rounded-2xl mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 min-w-max items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-surface text-txt-primary shadow-sm'
                : 'text-txt-secondary hover:text-txt-primary'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'negocio'     && <NegocioSection    storeId={storeId} />}
      {activeTab === 'ia'          && <AiConfigPage />}
      {activeTab === 'excluidos'   && <ExcluidosSection />}
      {activeTab === 'suscripcion' && <SuscripcionSection />}
      {activeTab === 'equipo'      && <EquipoSection     storeId={storeId} />}
    </div>
  );
}
