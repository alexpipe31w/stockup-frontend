import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicStore, getPublicAvailability, bookPublicAppointment } from '../services/api';

interface StaffSlots { staffId: string | null; name: string; slots: string[]; occupiedSlots?: string[]; }
interface ServiceVariantOption { variantId: string; name: string; priceOverride?: number | null; estimatedMinutes?: number | null; }
interface ServiceOption {
  serviceId: string; name: string; description?: string | null; basePrice?: number | null;
  minPrice?: number | null; maxPrice?: number | null; priceType?: string;
  unitLabel?: string | null; estimatedMinutes?: number | null;
  imageUrl?: string | null;
  hasVariants: boolean; variants: ServiceVariantOption[];
}
interface StoreInfo  { name: string; staffLabel: string; hasStaff: boolean; services: ServiceOption[]; }
interface SlotChoice { staffId: string | null; staffName: string; date: string; time: string; }

const toISO    = (d: Date) => d.toISOString().slice(0, 10);
const fmtSlot  = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};
const fmtCOP   = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const fmtPrice = (s: ServiceOption): string | null => {
  if (s.priceType === 'VARIABLE' || (!s.basePrice && !s.minPrice)) return null;
  if (s.minPrice && s.maxPrice) return `${fmtCOP(Number(s.minPrice))} – ${fmtCOP(Number(s.maxPrice))}`;
  if (s.basePrice) return fmtCOP(Number(s.basePrice));
  return null;
};
const addDays  = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const fmtDay   = (d: Date) => d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
const today0   = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

export default function PublicCalendar() {
  const { slug }                          = useParams<{ slug: string }>();
  const [store,    setStore]              = useState<StoreInfo | null>(null);
  const [date,     setDate]               = useState<Date>(today0);
  const [staff,    setStaff]              = useState<StaffSlots[]>([]);
  const [loading,  setLoading]            = useState(true);
  const [loadSlots, setLoadSlots]         = useState(false);
  const [notFound, setNotFound]           = useState(false);

  const [serviceId,  setServiceId]  = useState('');
  const [variantId,  setVariantId]  = useState('');
  const [slotChoice, setSlotChoice] = useState<SlotChoice | null>(null);

  useEffect(() => {
    if (!slug) return;
    getPublicStore(slug)
      .then(r => setStore(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const fetchSlots = useCallback(async (d: Date) => {
    if (!slug) return;
    setLoadSlots(true);
    try {
      const r = await getPublicAvailability(slug, toISO(d));
      setStaff(r.data.staff ?? []);
    } catch {
      setStaff([]);
    } finally {
      setLoadSlots(false);
    }
  }, [slug]);

  useEffect(() => { if (store) fetchSlots(date); }, [store, date, fetchSlots]);

  const base    = today0();
  const canBack = date > base;
  const canFwd  = addDays(date, 1) <= addDays(base, 30);

  const prev = () => canBack && setDate(d => addDays(d, -1));
  const next = () => canFwd  && setDate(d => addDays(d,  1));

  const selectedService = store?.services.find(s => s.serviceId === serviceId) ?? null;

  const handleServiceChange = (id: string) => {
    setServiceId(id);
    setVariantId('');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#D4FF00] border-t-transparent animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="text-xl font-bold text-white mb-2">Negocio no encontrado</h1>
        <p className="text-sm text-gray-400">Verifica que el link sea correcto.</p>
      </div>
    </div>
  );

  const staffLabel = (store?.staffLabel ?? 'Profesional').toLowerCase();

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Header */}
      <div className="bg-[#111117] border-b border-white/10 px-4 py-5 text-center">
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#D4FF00] uppercase mb-2">Powered by Stockup</p>
        <h1 className="text-2xl font-bold tracking-tight">{store?.name}</h1>
        <p className="text-sm text-gray-400 mt-1">
          Agenda tu cita en línea — elige {staffLabel}, fecha y hora
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Service picker */}
        {store && store.services.length > 0 && (
          <div className="bg-[#111117] rounded-2xl p-5 border border-white/10">
            <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">¿Qué servicio necesitas?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleServiceChange('')}
                className={`text-left px-4 py-3 rounded-xl border text-sm transition ${
                  serviceId === ''
                    ? 'border-[#D4FF00]/60 bg-[#D4FF00]/10 text-[#D4FF00]'
                    : 'border-white/10 bg-[#0A0A0F] text-gray-400 hover:border-white/20'
                }`}
              >
                <span className="font-medium">Sin preferencia</span>
              </button>
              {store.services.map(s => {
                const price = fmtPrice(s);
                const mins  = s.estimatedMinutes ? `${s.estimatedMinutes} min` : null;
                const isSelected = serviceId === s.serviceId;
                return (
                  <button
                    key={s.serviceId}
                    type="button"
                    onClick={() => handleServiceChange(s.serviceId)}
                    className={`text-left px-4 py-3 rounded-xl border text-sm transition ${
                      isSelected
                        ? 'border-[#D4FF00]/60 bg-[#D4FF00]/10'
                        : 'border-white/10 bg-[#0A0A0F] hover:border-white/20'
                    }`}
                  >
                    {s.imageUrl && (
                      <img
                        src={s.imageUrl}
                        alt={s.name}
                        className="h-28 w-full object-cover rounded-lg mb-2 bg-[#0A0A0F]"
                      />
                    )}
                    <p className={`font-semibold leading-tight ${isSelected ? 'text-[#D4FF00]' : 'text-white'}`}>{s.name}</p>
                    {s.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {price && <span className={`text-xs font-bold ${isSelected ? 'text-[#D4FF00]' : 'text-[#D4FF00]/80'}`}>{price}</span>}
                      {mins  && <span className="text-xs text-gray-500">{mins}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedService && selectedService.hasVariants && selectedService.variants.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">Elige una opción:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedService.variants.map(v => (
                    <button
                      key={v.variantId}
                      type="button"
                      onClick={() => setVariantId(v.variantId)}
                      className={`px-3 py-1.5 rounded-xl text-sm border transition ${
                        variantId === v.variantId
                          ? 'border-[#D4FF00]/60 bg-[#D4FF00]/10 text-[#D4FF00]'
                          : 'border-white/10 bg-[#0A0A0F] text-gray-300 hover:border-white/20'
                      }`}
                    >
                      {v.name}
                      {v.priceOverride != null && (
                        <span className="ml-1.5 text-xs text-[#D4FF00]/80">{fmtCOP(Number(v.priceOverride))}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Date navigator */}
        <div className="flex items-center justify-between bg-[#111117] rounded-2xl px-5 py-4 border border-white/10">
          <button onClick={prev} disabled={!canBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-xl text-gray-400 hover:bg-white/10 disabled:opacity-20 transition">
            ‹
          </button>
          <div className="text-center">
            <p className="font-semibold capitalize">{fmtDay(date)}</p>
            {toISO(date) === toISO(base) && (
              <span className="text-xs text-[#D4FF00] font-medium">Hoy</span>
            )}
          </div>
          <button onClick={next} disabled={!canFwd}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-xl text-gray-400 hover:bg-white/10 disabled:opacity-20 transition">
            ›
          </button>
        </div>

        {/* Slots */}
        {loadSlots ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-[#D4FF00] border-t-transparent animate-spin" />
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-sm text-gray-500">Sin disponibilidad para este día</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {staff.map((s, i) => (
              <div key={s.staffId ?? i} className="bg-[#111117] rounded-2xl p-5 border border-white/10">
                <p className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-[#D4FF00] text-lg">✂</span>
                  {s.name}
                </p>
                {s.slots.length === 0 && (!s.occupiedSlots || s.occupiedSlots.length === 0) ? (
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
          </div>
        )}

        <p className="text-center text-xs text-gray-600 pb-6">
          Horarios orientativos · Toca un horario para agendar al instante
        </p>
      </div>

      {slotChoice && slug && (
        <BookingModal
          slug={slug}
          slot={slotChoice}
          serviceId={serviceId || undefined}
          serviceName={selectedService?.name}
          variantId={variantId || undefined}
          variantName={selectedService?.variants.find(v => v.variantId === variantId)?.name}
          onClose={() => setSlotChoice(null)}
        />
      )}
    </div>
  );
}

// ─── Modal de agendamiento ───────────────────────────────────────────────────

function BookingModal({ slug, slot, serviceId, serviceName, variantId, variantName, onClose }: {
  slug: string;
  slot: SlotChoice;
  serviceId?: string;
  serviceName?: string;
  variantId?: string;
  variantName?: string;
  onClose: () => void;
}) {
  const [name,  setName]  = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState('');
  const [done,   setDone]     = useState<{ scheduledAt: string; staff: string | null; service: string | null } | null>(null);

  const fmtDate = (d: Date) => d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtTime = (d: Date) => d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) { setError('Ingresa tu nombre completo.'); return; }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 7) { setError('Ingresa un número de teléfono válido.'); return; }

    setSaving(true); setError('');
    try {
      const scheduledAt = `${slot.date}T${slot.time}:00-05:00`;
      const res = await bookPublicAppointment(slug, {
        customerName:  name.trim(),
        customerPhone: phone.trim(),
        serviceId,
        serviceVariantId: variantId,
        staffId:       slot.staffId ?? undefined,
        scheduledAt,
        notes:         notes.trim() || undefined,
      });
      setDone({
        scheduledAt: res.data?.scheduledAt ?? scheduledAt,
        staff:       res.data?.staff ?? slot.staffName,
        service:     res.data?.service ?? variantName ?? serviceName ?? null,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo agendar la cita. Intenta con otro horario.');
    } finally {
      setSaving(false);
    }
  };

  const ic = 'w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#0A0A0F] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#D4FF00]/30';

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div className="bg-[#111117] rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto border border-white/10">
        {done ? (
          <div className="p-8 text-center">
            <p className="text-5xl mb-4">✅</p>
            <h2 className="text-lg font-bold text-white mb-2">¡Listo, {name.split(' ')[0]}!</h2>
            <p className="text-sm text-gray-400 mb-5">
              Tu cita quedó registrada y está pendiente de confirmación. Te escribiremos por WhatsApp para confirmarla.
            </p>
            <div className="bg-[#0A0A0F] rounded-2xl p-4 text-left text-sm space-y-1.5 border border-white/10 mb-6">
              {done.service && <p><span className="text-gray-500">Servicio:</span> <span className="font-medium">{done.service}</span></p>}
              {done.staff   && <p><span className="text-gray-500">Atiende:</span> <span className="font-medium">{done.staff}</span></p>}
              <p><span className="text-gray-500">Fecha:</span> <span className="font-medium capitalize">{fmtDate(new Date(done.scheduledAt))}</span></p>
              <p><span className="text-gray-500">Hora:</span> <span className="font-medium">{fmtTime(new Date(done.scheduledAt))}</span></p>
            </div>
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-[#D4FF00] text-[#0A0A0F] font-bold text-sm hover:brightness-95 transition">
              Listo
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-[#111117] z-10">
              <div>
                <h2 className="text-base font-bold text-white">Confirma tu cita</h2>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">
                  {fmtDay_(slot)} · {slot.time} {slot.staffName ? `· ${slot.staffName}` : ''}
                </p>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4">
              {(serviceName || variantName) && (
                <div className="text-xs text-gray-400 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                  Servicio seleccionado: <span className="text-white font-medium">{variantName ?? serviceName}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Tu nombre completo *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Carlos Pérez" className={ic} required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Tu número de WhatsApp *</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ej: 300 123 4567" className={ic} required />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Notas (opcional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Cuéntanos algo más sobre lo que necesitas..."
                  rows={2} className={ic} />
              </div>

              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                  {error}
                </div>
              )}

              <button type="submit" disabled={saving}
                className="w-full py-3 rounded-xl bg-[#D4FF00] text-[#0A0A0F] font-bold text-sm hover:brightness-95 disabled:opacity-50 transition flex items-center justify-center gap-2">
                {saving && <span className="w-4 h-4 rounded-full border-2 border-[#0A0A0F] border-t-transparent animate-spin" />}
                {saving ? 'Agendando...' : 'Confirmar cita'}
              </button>
              <p className="text-center text-[11px] text-gray-600">
                Tu cita quedará pendiente de confirmación por nuestro equipo.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function fmtDay_(slot: SlotChoice) {
  return new Date(`${slot.date}T12:00:00-05:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
}
