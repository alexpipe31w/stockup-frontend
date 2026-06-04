import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getStoreTheme, updateStoreTheme } from '../services/api';

interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

const PALETTES = [
  { name: 'Azul/Morado',  primary: '#2563eb', secondary: '#9333ea', accent: '#f59e0b' },
  { name: 'Verde/Cyan',   primary: '#16a34a', secondary: '#0891b2', accent: '#f97316' },
  { name: 'Rojo/Morado',  primary: '#dc2626', secondary: '#9333ea', accent: '#f59e0b' },
  { name: 'Naranja/Indigo', primary: '#ea580c', secondary: '#7c3aed', accent: '#0891b2' },
  { name: 'Cyan/Violeta', primary: '#0891b2', secondary: '#7c3aed', accent: '#f59e0b' },
  { name: 'Rosa/Violeta', primary: '#db2777', secondary: '#7c3aed', accent: '#f59e0b' },
  { name: 'Gris/Cyan',    primary: '#475569', secondary: '#0891b2', accent: '#f59e0b' },
  { name: 'Violeta/Rosa', primary: '#7c3aed', secondary: '#db2777', accent: '#f59e0b' },
];

function applyThemeLive(primary: string, secondary: string, accent: string) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', primary);
  root.style.setProperty('--color-primary-dark', primary);
  root.style.setProperty('--color-primary-light', primary);
  root.style.setProperty('--color-secondary', secondary);
  root.style.setProperty('--color-accent', accent);
}

export default function Settings() {
  const { storeId } = useAuth();
  const [colors, setColors] = useState<ThemeColors>({
    primaryColor: '#2563eb',
    secondaryColor: '#9333ea',
    accentColor: '#f59e0b',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) { setLoading(false); return; }
    getStoreTheme(storeId)
      .then(res => {
        const { primaryColor, secondaryColor, accentColor } = res.data;
        setColors({
          primaryColor:   primaryColor   ?? '#2563eb',
          secondaryColor: secondaryColor ?? '#9333ea',
          accentColor:    accentColor    ?? '#f59e0b',
        });
      })
      .catch(() => { /* Usa paleta por defecto si el endpoint aún no existe */ })
      .finally(() => setLoading(false));
  }, [storeId]);

  const applyPalette = (p: typeof PALETTES[0]) => {
    const next = { primaryColor: p.primary, secondaryColor: p.secondary, accentColor: p.accent };
    setColors(next);
    applyThemeLive(p.primary, p.secondary, p.accent);
  };

  const handleColorChange = (field: keyof ThemeColors, value: string) => {
    const next = { ...colors, [field]: value };
    setColors(next);
    applyThemeLive(next.primaryColor, next.secondaryColor, next.accentColor);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(false);
    try {
      await updateStoreTheme(storeId, colors);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 4000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin" style={{ color: 'var(--color-primary)' }} width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-txt-primary">Configuración</h1>
        <p className="text-txt-secondary mt-1 text-sm">Personaliza la apariencia de tu plataforma</p>
      </div>

      {/* Paletas predefinidas */}
      <div className="bg-surface rounded-2xl shadow-sm border border-border-subtle p-6 mb-6">
        <h2 className="font-semibold text-txt-primary mb-1">Paletas predefinidas</h2>
        <p className="text-sm text-txt-tertiary mb-4">Haz clic en una paleta para aplicarla al instante</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PALETTES.map((p) => {
            const isActive =
              colors.primaryColor === p.primary &&
              colors.secondaryColor === p.secondary &&
              colors.accentColor === p.accent;
            return (
              <button
                key={p.name}
                onClick={() => applyPalette(p)}
                className={`rounded-xl p-3 border-2 transition-all text-left ${
                  isActive ? 'border-slate-800 shadow-md' : 'border-border-subtle hover:border-slate-300'
                }`}
              >
                {/* Preview de colores */}
                <div className="flex gap-1.5 mb-2">
                  <span className="w-5 h-5 rounded-full border border-white/30 shadow-sm" style={{ background: p.primary }} />
                  <span className="w-5 h-5 rounded-full border border-white/30 shadow-sm" style={{ background: p.secondary }} />
                  <span className="w-5 h-5 rounded-full border border-white/30 shadow-sm" style={{ background: p.accent }} />
                </div>
                <p className="text-xs font-medium text-txt-primary">{p.name}</p>
                {isActive && (
                  <p className="text-[10px] text-txt-tertiary mt-0.5">Actual</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color personalizado */}
      <div className="bg-surface rounded-2xl shadow-sm border border-border-subtle p-6 mb-6">
        <h2 className="font-semibold text-txt-primary mb-1">Color personalizado</h2>
        <p className="text-sm text-txt-tertiary mb-4">Define colores exactos con el selector o escribe un código hex</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            { key: 'primaryColor',   label: 'Color principal' },
            { key: 'secondaryColor', label: 'Color secundario' },
            { key: 'accentColor',    label: 'Color de acento' },
          ] as { key: keyof ThemeColors; label: string }[]).map(({ key, label }) => (
            <div key={key}>
              <label className="text-sm font-medium text-txt-primary block mb-2">{label}</label>
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 flex-shrink-0">
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={e => handleColorChange(key, e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="w-10 h-10 rounded-xl border-2 border-border-default shadow-sm cursor-pointer"
                    style={{ background: colors[key] }}
                  />
                </div>
                <input
                  type="text"
                  value={colors[key]}
                  onChange={e => {
                    const v = e.target.value;
                    if (/^#([0-9A-Fa-f]{0,6})$/.test(v)) handleColorChange(key, v);
                  }}
                  maxLength={7}
                  className="flex-1 border border-border-default bg-surface-elevated text-txt-primary rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="#000000"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Preview live */}
        <div className="mt-6 p-4 rounded-xl bg-surface-elevated border border-border-subtle">
          <p className="text-xs text-txt-tertiary mb-3 font-medium uppercase tracking-wide">Vista previa</p>
          <div className="flex flex-wrap gap-3">
            <div
              className="px-4 py-2 rounded-xl text-white text-sm font-medium shadow-sm"
              style={{ background: `linear-gradient(135deg, ${colors.primaryColor}, ${colors.secondaryColor})` }}
            >
              Botón principal
            </div>
            <div
              className="px-4 py-2 rounded-xl text-white text-sm font-medium shadow-sm"
              style={{ background: colors.accentColor }}
            >
              Acento
            </div>
            <div
              className="w-8 h-8 rounded-xl shadow-sm"
              style={{ background: colors.primaryColor }}
            />
            <div
              className="w-8 h-8 rounded-xl shadow-sm"
              style={{ background: colors.secondaryColor }}
            />
          </div>
        </div>
      </div>

      {/* Botón guardar */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl text-white font-medium text-sm shadow-sm transition-all disabled:opacity-60 btn-gradient"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Guardado correctamente
          </span>
        )}
        {saveError && (
          <span className="text-sm text-red-500 font-medium flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Error al guardar — despliega el backend actualizado
          </span>
        )}
      </div>
    </div>
  );
}

