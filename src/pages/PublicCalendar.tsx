import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicStore, getPublicAvailability } from '../services/api';

interface StaffSlots { staffId: string | null; name: string; slots: string[]; }
interface StoreInfo  { name: string; staffLabel: string; hasStaff: boolean; }

const toISO    = (d: Date) => d.toISOString().slice(0, 10);
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
          Consulta la disponibilidad de nuestros {staffLabel}s
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
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
                {s.slots.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">Sin disponibilidad este día</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {s.slots.map(slot => (
                      <span key={slot}
                        className="px-3 py-1.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white hover:bg-white/10 transition">
                        {slot}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-600 pb-6">
          Horarios orientativos · Confirma tu cita escribiéndonos directamente
        </p>
      </div>
    </div>
  );
}
