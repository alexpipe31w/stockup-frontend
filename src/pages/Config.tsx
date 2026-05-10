import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getStoreTheme, updateStoreTheme, getAiConfig, saveAiConfig } from '../services/api';
import api from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'apariencia' | 'negocio' | 'ia' | 'excluidos';

interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

interface BlockedContact {
  blockedId: string;
  phone: string;
  label: string | null;
  createdAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const PALETTES = [
  { name: 'Azul/Morado',    primary: '#2563eb', secondary: '#9333ea', accent: '#f59e0b' },
  { name: 'Verde/Cyan',     primary: '#16a34a', secondary: '#0891b2', accent: '#f97316' },
  { name: 'Rojo/Morado',    primary: '#dc2626', secondary: '#9333ea', accent: '#f59e0b' },
  { name: 'Naranja/Indigo', primary: '#ea580c', secondary: '#7c3aed', accent: '#0891b2' },
  { name: 'Cyan/Violeta',   primary: '#0891b2', secondary: '#7c3aed', accent: '#f59e0b' },
  { name: 'Rosa/Violeta',   primary: '#db2777', secondary: '#7c3aed', accent: '#f59e0b' },
  { name: 'Gris/Cyan',      primary: '#475569', secondary: '#0891b2', accent: '#f59e0b' },
  { name: 'Violeta/Rosa',   primary: '#7c3aed', secondary: '#db2777', accent: '#f59e0b' },
];

const MODEL_GROUPS = [
  {
    label: '⚡ Producción',
    models: [
      { value: 'openai/gpt-oss-20b',                      name: 'GPT OSS 20B',      tag: 'MÁS RÁPIDO',      tagColor: '#059669', speed: '1000 t/s', desc: 'El más rápido disponible. Respuestas instantáneas en WhatsApp.' },
      { value: 'openai/gpt-oss-120b',                     name: 'GPT OSS 120B',     tag: 'MÁS INTELIGENTE', tagColor: '#7c3aed', speed: '500 t/s',  desc: 'Mayor razonamiento. Ideal para catálogos complejos o negociación.' },
      { value: 'llama-3.3-70b-versatile',                 name: 'Llama 3.3 70B',    tag: 'BALANCEADO',      tagColor: '#2563eb', speed: '280 t/s',  desc: 'Modelo probado y confiable. Buen equilibrio calidad/velocidad.' },
      { value: 'llama-3.1-8b-instant',                    name: 'Llama 3.1 8B',     tag: 'ECONÓMICO',       tagColor: '#64748b', speed: '560 t/s',  desc: 'Ultra rápido y de bajo costo. Para negocios con alto volumen.' },
    ],
  },
  {
    label: '🔬 Preview (nuevos)',
    models: [
      { value: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', tag: 'NUEVO',    tagColor: '#ea580c', speed: '750 t/s', desc: 'Llama 4 con soporte de imágenes. Muy rápido.' },
      { value: 'qwen/qwen3-32b',                            name: 'Qwen3 32B',         tag: 'PREVIEW',  tagColor: '#0891b2', speed: '400 t/s', desc: 'Alibaba Cloud. Excelente en idiomas y razonamiento.' },
      { value: 'moonshotai/kimi-k2-instruct-0905',          name: 'Kimi K2',           tag: 'PREVIEW',  tagColor: '#0891b2', speed: '200 t/s', desc: 'Contexto gigante de 262K tokens. Conversaciones muy largas.' },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function applyThemeLive(primary: string, secondary: string, accent: string) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', primary);
  root.style.setProperty('--color-primary-dark', primary);
  root.style.setProperty('--color-primary-light', primary);
  root.style.setProperty('--color-secondary', secondary);
  root.style.setProperty('--color-accent', accent);
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

// ── TAB: APARIENCIA ────────────────────────────────────────────────────────

function AparienciaSection({ storeId }: { storeId: string }) {
  const [colors, setColors] = useState<ThemeColors>({
    primaryColor: '#2563eb', secondaryColor: '#9333ea', accentColor: '#f59e0b',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    getStoreTheme(storeId)
      .then(res => {
        const { primaryColor, secondaryColor, accentColor } = res.data;
        setColors({
          primaryColor:   primaryColor   ?? '#2563eb',
          secondaryColor: secondaryColor ?? '#9333ea',
          accentColor:    accentColor    ?? '#f59e0b',
        });
      })
      .catch(() => {})
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

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      {/* Paletas predefinidas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-800 mb-1">Paletas predefinidas</h2>
        <p className="text-sm text-slate-400 mb-4">Haz clic en una paleta para aplicarla al instante</p>
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
                  isActive ? 'border-slate-800 shadow-md' : 'border-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex gap-1.5 mb-2">
                  <span className="w-5 h-5 rounded-full border border-white/30 shadow-sm" style={{ background: p.primary }} />
                  <span className="w-5 h-5 rounded-full border border-white/30 shadow-sm" style={{ background: p.secondary }} />
                  <span className="w-5 h-5 rounded-full border border-white/30 shadow-sm" style={{ background: p.accent }} />
                </div>
                <p className="text-xs font-medium text-slate-700">{p.name}</p>
                {isActive && <p className="text-[10px] text-slate-400 mt-0.5">Actual</p>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color personalizado */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-800 mb-1">Color personalizado</h2>
        <p className="text-sm text-slate-400 mb-4">Define colores exactos con el selector o escribe un código hex</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            { key: 'primaryColor',   label: 'Color principal' },
            { key: 'secondaryColor', label: 'Color secundario' },
            { key: 'accentColor',    label: 'Color de acento' },
          ] as { key: keyof ThemeColors; label: string }[]).map(({ key, label }) => (
            <div key={key}>
              <label className="text-sm font-medium text-slate-700 block mb-2">{label}</label>
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 flex-shrink-0">
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={e => handleColorChange(key, e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="w-10 h-10 rounded-xl border-2 border-slate-200 shadow-sm cursor-pointer"
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
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="#000000"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Vista previa */}
        <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
          <p className="text-xs text-slate-400 mb-3 font-medium uppercase tracking-wide">Vista previa</p>
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
            <div className="w-8 h-8 rounded-xl shadow-sm" style={{ background: colors.primaryColor }} />
            <div className="w-8 h-8 rounded-xl shadow-sm" style={{ background: colors.secondaryColor }} />
          </div>
        </div>
      </div>

      {/* Guardar */}
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            Guardado correctamente
          </span>
        )}
        {saveError && (
          <span className="text-sm text-red-500 font-medium flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Error al guardar — despliega el backend actualizado
          </span>
        )}
      </div>
    </div>
  );
}

// ── TAB: NEGOCIO ───────────────────────────────────────────────────────────

function NegocioSection({ storeId }: { storeId: string }) {
  const [form, setForm] = useState({ name: '', phone: '', ownerName: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/stores/${storeId}`)
      .then(res => {
        setForm({
          name:      res.data.name      ?? '',
          phone:     res.data.phone     ?? '',
          ownerName: res.data.ownerName ?? '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.patch(`/stores/${storeId}`, { name: form.name, phone: form.phone, ownerName: form.ownerName });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:bg-white transition text-sm text-slate-800';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">Información del negocio</h2>
          <p className="text-xs text-slate-400">Datos básicos de tu tienda — la IA los usa para presentarse</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre del negocio</label>
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Mi Tienda"
            className={inputClass}
            style={{ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono WhatsApp</label>
          <input
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="+573001234567"
            className={inputClass}
          />
          <p className="text-xs text-slate-400 mt-1.5">Número con código de país — ej: +573001234567</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre del propietario</label>
          <input
            value={form.ownerName}
            onChange={e => setForm({ ...form, ownerName: e.target.value })}
            placeholder="Juan Pérez"
            className={inputClass}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-white font-medium text-sm shadow-sm transition-all disabled:opacity-60 btn-gradient"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Guardado correctamente
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

// ── TAB: ASISTENTE IA ──────────────────────────────────────────────────────

function IASection({ storeId }: { storeId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    groqApiKey: '',
    model: 'openai/gpt-oss-20b',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 500,
  });

  useEffect(() => {
    getAiConfig(storeId)
      .then(res => {
        if (res.data) setForm({
          groqApiKey:   res.data.groqApiKey   ?? '',
          model:        res.data.model        ?? 'openai/gpt-oss-20b',
          systemPrompt: res.data.systemPrompt ?? '',
          temperature:  res.data.temperature  ?? 0.7,
          maxTokens:    res.data.maxTokens    ?? 500,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveAiConfig(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* API Key */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Groq API Key</h2>
            <p className="text-xs text-slate-400">Obtén tu key gratis en console.groq.com</p>
          </div>
        </div>
        <input
          type="password"
          value={form.groqApiKey}
          onChange={e => setForm({ ...form, groqApiKey: e.target.value })}
          placeholder="gsk_xxxxxxxxxxxxxxxxxxxx"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:bg-white transition font-mono text-sm"
        />
      </div>

      {/* Modelo */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2">
              <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 010 2h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 010-2h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Modelo de IA</h2>
            <p className="text-xs text-slate-400">Elige según velocidad vs inteligencia — todos gratis en Groq</p>
          </div>
        </div>

        <div className="space-y-4">
          {MODEL_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{group.label}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.models.map(m => {
                  const selected = form.model === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setForm({ ...form, model: m.value })}
                      className={`p-3.5 rounded-xl border-2 text-left transition ${
                        selected ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold text-sm ${selected ? 'text-blue-700' : 'text-slate-700'}`}>{m.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white" style={{ backgroundColor: m.tagColor }}>{m.tag}</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-tight">{m.desc}</p>
                      <p className={`text-xs font-medium mt-1.5 ${selected ? 'text-blue-500' : 'text-slate-400'}`}>{m.speed}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-xs text-slate-400">Modelo: <span className="font-mono text-slate-600 font-medium">{form.model}</span></p>
        </div>
      </div>

      {/* System Prompt */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Instrucciones del asistente</h2>
            <p className="text-xs text-slate-400">Define cómo debe comportarse y responder la IA</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setForm({ ...form, systemPrompt: 'Eres un asistente de ventas amable y profesional de esta tienda. Tu objetivo es ayudar a los clientes con información sobre productos, precios y pedidos. Siempre responde en español, de forma breve y clara. Si el cliente quiere hacer un pedido, pide su nombre, dirección y producto. Si no puedes resolver algo, ofrece conectarlos con un asesor humano.' })}
          className="w-full mb-3 px-4 py-2.5 rounded-xl border border-dashed border-blue-300 text-blue-600 text-sm hover:bg-blue-50 transition flex items-center justify-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Usar prompt sugerido
        </button>

        <textarea
          value={form.systemPrompt}
          onChange={e => setForm({ ...form, systemPrompt: e.target.value })}
          rows={8}
          placeholder="Eres un asistente de ventas de [nombre tienda]. Responde siempre en español..."
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:bg-white transition text-sm resize-none"
        />
        <p className="text-xs text-slate-400 mt-2">{form.systemPrompt.length} caracteres</p>
      </div>

      {/* Parámetros */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Parámetros avanzados</h2>
            <p className="text-xs text-slate-400">Controla la creatividad y longitud de las respuestas</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Temperatura</label>
              <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>{form.temperature}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.1"
              value={form.temperature}
              onChange={e => setForm({ ...form, temperature: parseFloat(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Preciso y directo</span>
              <span>Creativo y variado</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Máximo de palabras</label>
              <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>{form.maxTokens}</span>
            </div>
            <input
              type="range" min="100" max="2000" step="100"
              value={form.maxTokens}
              onChange={e => setForm({ ...form, maxTokens: parseInt(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Respuestas cortas</span>
              <span>Respuestas largas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Guardar */}
      <button
        type="submit"
        disabled={saving}
        className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-60 btn-gradient"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            Guardando...
          </span>
        ) : saved ? (
          <span className="flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            ¡Guardado!
          </span>
        ) : 'Guardar configuración de IA'}
      </button>
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
    if (!label) return 'bg-slate-100 text-slate-500';
    const l = label.toLowerCase();
    if (l.includes('empleado')) return 'bg-blue-50 text-blue-600';
    if (l.includes('distribuidor') || l.includes('proveedor')) return 'bg-purple-50 text-purple-600';
    return 'bg-orange-50 text-orange-500';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-800">Contactos excluidos</h2>
          <p className="text-sm text-slate-400 mt-0.5">Números que el bot ignora — empleados, distribuidores, proveedores</p>
        </div>
        <button
          onClick={() => { setForm(emptyBlockedForm); setError(''); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold btn-gradient"
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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {contacts.length === 0 ? (
            <div className="p-16 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </div>
              <p className="text-slate-700 font-medium">No hay números excluidos</p>
              <p className="text-slate-400 text-sm">Agrega empleados, distribuidores o proveedores para que el bot los ignore</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Número</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Etiqueta</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Agregado</th>
                  <th className="px-6 py-4"/>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => (
                  <tr key={c.blockedId} className={`${i < contacts.length - 1 ? 'border-b border-slate-50' : ''} hover:bg-slate-50 transition`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.22 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                          </svg>
                        </div>
                        <span className="font-semibold text-slate-800 text-sm">{c.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.label ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${labelColor(c.label)}`}>{c.label}</span>
                      ) : (
                        <span className="text-slate-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm hidden sm:table-cell">
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">Excluir número</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Número de teléfono *</label>
                <input
                  value={form.phone}
                  onChange={handlePhoneChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 text-sm"
                  placeholder="+573001234567"
                />
                <p className="text-xs text-slate-400 mt-1.5">Incluye el código de país. Ej: <strong>+57</strong>3001234567</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Etiqueta <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <select
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 text-sm bg-white"
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
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleBlock}
                disabled={saving || !form.phone}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50 btn-gradient"
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

// ── Main: Config ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'apariencia',
    label: 'Apariencia',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="4"/>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
      </svg>
    ),
  },
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
];

export default function Config() {
  const { storeId } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('apariencia');

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>
        <p className="text-slate-500 mt-1 text-sm">Personaliza tu plataforma desde un solo lugar</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 min-w-max items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'apariencia' && <AparienciaSection storeId={storeId} />}
      {activeTab === 'negocio'    && <NegocioSection    storeId={storeId} />}
      {activeTab === 'ia'         && <IASection         storeId={storeId} />}
      {activeTab === 'excluidos'  && <ExcluidosSection />}
    </div>
  );
}
