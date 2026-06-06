import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAiConfig, saveAiConfig, getAiPoolStatus } from '../services/api';

type AIProvider = 'groq' | 'openai' | 'together' | 'mistral' | 'anthropic' | 'gemini';

interface ProviderInfo {
  name:    string;
  color:   string;
  docsUrl: string;
  keyHint: string;
  models:  Array<{ value: string; name: string; tag: string; tagColor: string; desc: string; speed?: string }>;
}

const PROVIDERS: Record<AIProvider, ProviderInfo> = {
  groq: {
    name:    'Groq',
    color:   '#f97316',
    docsUrl: 'console.groq.com',
    keyHint: 'gsk_xxxxxxxxxxxxxxxxxxxx',
    models: [
      { value: 'llama-3.3-70b-versatile',                    name: 'Llama 3.3 70B',  tag: 'BALANCEADO',     tagColor: '#D4FF00', speed: '280 t/s', desc: 'Modelo probado. Buen equilibrio calidad/velocidad.' },
      { value: 'llama-3.1-8b-instant',                       name: 'Llama 3.1 8B',   tag: 'ECONÓMICO',      tagColor: '#64748b', speed: '560 t/s', desc: 'Ultra rápido y de bajo costo. Alto volumen.' },
      { value: 'meta-llama/llama-4-scout-17b-16e-instruct',  name: 'Llama 4 Scout',  tag: 'NUEVO',          tagColor: '#ea580c', speed: '750 t/s', desc: 'Llama 4 multimodal. Muy rápido.' },
      { value: 'qwen/qwen3-32b',                             name: 'Qwen3 32B',       tag: 'PREVIEW',        tagColor: '#0891b2', speed: '400 t/s', desc: 'Excelente en idiomas y razonamiento.' },
    ],
  },
  openai: {
    name:    'OpenAI',
    color:   '#10a37f',
    docsUrl: 'platform.openai.com',
    keyHint: 'sk-xxxxxxxxxxxxxxxxxxxx',
    models: [
      { value: 'gpt-4o',      name: 'GPT-4o',      tag: 'RECOMENDADO',  tagColor: '#D4FF00', desc: 'El más capaz. Entiende contexto complejo.' },
      { value: 'gpt-4o-mini', name: 'GPT-4o mini', tag: 'ECONÓMICO',    tagColor: '#64748b', desc: 'Rápido y barato. Ideal para alto volumen.' },
      { value: 'gpt-4.1',     name: 'GPT-4.1',     tag: 'NUEVO',        tagColor: '#ea580c', desc: 'Mayor ventana de contexto que GPT-4o.' },
      { value: 'o4-mini',     name: 'o4-mini',     tag: 'RAZONAMIENTO', tagColor: '#7c3aed', desc: 'Razonamiento paso a paso. Respuestas más precisas.' },
    ],
  },
  together: {
    name:    'Together AI',
    color:   '#6366f1',
    docsUrl: 'api.together.xyz',
    keyHint: 'xxxxxxxxxxxxxxxxxxxx',
    models: [
      { value: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B Turbo', tag: 'RECOMENDADO', tagColor: '#D4FF00', desc: 'El mejor equilibrio en Together.' },
      { value: 'meta-llama/Llama-3.1-8B-Instruct-Turbo',  name: 'Llama 3.1 8B Turbo',  tag: 'ECONÓMICO',   tagColor: '#64748b', desc: 'Muy rápido y barato.' },
      { value: 'Qwen/Qwen2.5-72B-Instruct-Turbo',         name: 'Qwen 2.5 72B',         tag: 'ALTERNATIVA', tagColor: '#0891b2', desc: 'Fuerte en matemáticas e idiomas.' },
      { value: 'deepseek-ai/DeepSeek-V3',                  name: 'DeepSeek V3',          tag: 'NUEVO',       tagColor: '#ea580c', desc: 'Modelo chino de alto rendimiento.' },
    ],
  },
  mistral: {
    name:    'Mistral',
    color:   '#ff7000',
    docsUrl: 'console.mistral.ai',
    keyHint: 'xxxxxxxxxxxxxxxxxxxx',
    models: [
      { value: 'mistral-large-latest', name: 'Mistral Large', tag: 'MÁS CAPAZ',  tagColor: '#D4FF00', desc: 'El modelo más potente de Mistral.' },
      { value: 'mistral-small-latest', name: 'Mistral Small', tag: 'ECONÓMICO',  tagColor: '#64748b', desc: 'Rápido y eficiente para producción.' },
      { value: 'open-mixtral-8x22b',   name: 'Mixtral 8x22B', tag: 'OPEN SOURCE', tagColor: '#7c3aed', desc: 'MoE de alto rendimiento, open source.' },
      { value: 'codestral-latest',     name: 'Codestral',     tag: 'CÓDIGO',     tagColor: '#059669', desc: 'Especializado en código y técnico.' },
    ],
  },
  anthropic: {
    name:    'Anthropic',
    color:   '#c97f4a',
    docsUrl: 'console.anthropic.com',
    keyHint: 'sk-ant-xxxxxxxxxxxxxxxxxxxx',
    models: [
      { value: 'claude-opus-4-8',           name: 'Claude Opus 4',    tag: 'MÁS INTELIGENTE', tagColor: '#7c3aed', desc: 'El más capaz de Claude. Para casos complejos.' },
      { value: 'claude-sonnet-4-6',         name: 'Claude Sonnet 4',  tag: 'RECOMENDADO',     tagColor: '#D4FF00', desc: 'Mejor equilibrio inteligencia/velocidad.' },
      { value: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4',   tag: 'ECONÓMICO',       tagColor: '#64748b', desc: 'El más rápido de Claude. Ideal para volumen.' },
      { value: 'claude-sonnet-3-5',         name: 'Claude Sonnet 3.5', tag: 'ANTERIOR',       tagColor: '#94a3b8', desc: 'Versión anterior. Altamente confiable.' },
    ],
  },
  gemini: {
    name:    'Google Gemini',
    color:   '#4285F4',
    docsUrl: 'aistudio.google.com/app/apikey',
    keyHint: 'AIzaSy...',
    models: [
      { value: 'gemini-2.0-flash',       name: 'Gemini 2.0 Flash',    tag: 'GRATIS',       tagColor: '#22c55e', speed: 'Muy rápido', desc: 'El más rápido de Google. Generoso tier gratuito.' },
      { value: 'gemini-1.5-flash',       name: 'Gemini 1.5 Flash',    tag: 'GRATIS',       tagColor: '#22c55e', speed: 'Rápido',     desc: 'Flash de primera generación. Muy confiable.' },
      { value: 'gemini-1.5-flash-8b',    name: 'Gemini 1.5 Flash 8B', tag: 'ULTRA GRATIS', tagColor: '#16a34a', speed: 'Ultra',      desc: 'Más ligero. Ideal para volumen extremo.' },
      { value: 'gemini-1.5-pro',         name: 'Gemini 1.5 Pro',      tag: 'CAPAZ',        tagColor: '#4285F4', speed: 'Normal',     desc: 'Modelo pro de Google. Más inteligente.' },
    ],
  },
};

const SUGGESTED_PROMPT = `Eres un asistente de ventas amable y profesional de esta tienda. Tu objetivo es ayudar a los clientes con información sobre productos, precios y pedidos. Siempre responde en español, de forma breve y clara. Si el cliente quiere hacer un pedido, pide su nombre, dirección y producto. Si no puedes resolver algo, ofrece conectarlos con un asesor humano.`;

const cardClass = 'bg-surface rounded-2xl p-6 shadow-sm border border-border-subtle';
const sectionIcon = 'w-9 h-9 rounded-xl bg-surface-elevated flex items-center justify-center flex-shrink-0';

interface CartridgeForm { provider: AIProvider; apiKey: string; model: string }

interface CartridgeSnapshot {
  provider:  string;
  maskedKey: string;
  model:     string;
  status:    'active' | 'unused' | 'exhausted';
}
interface PoolSnapshot {
  hasPool:    boolean;
  cartridges: CartridgeSnapshot[];
  resetAt:    number | null;
}

const STATUS_LABEL: Record<CartridgeSnapshot['status'], { label: string; dot: string; text: string }> = {
  active:    { label: 'Activo',    dot: 'bg-success',       text: 'text-success' },
  unused:    { label: 'En espera', dot: 'bg-txt-tertiary',  text: 'text-txt-tertiary' },
  exhausted: { label: 'Agotado',   dot: 'bg-red-500 animate-pulse', text: 'text-red-400' },
};

function useCountdown(resetAt: number | null): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!resetAt) { setLabel(''); return; }
    const tick = () => {
      const diff = Math.max(0, resetAt - Date.now());
      if (diff === 0) { setLabel('Recargando...'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(`${m}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resetAt]);
  return label;
}

export default function AiConfig() {
  const { storeId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [cartridges, setCartridges] = useState<CartridgeForm[]>([]);
  const [pool, setPool] = useState<PoolSnapshot | null>(null);
  const countdown = useCountdown(pool?.resetAt ?? null);
  const [form, setForm] = useState({
    aiProvider:   'groq' as AIProvider,
    apiKey:       '',
    model:        'llama-3.3-70b-versatile',
    systemPrompt: '',
    temperature:  0.7,
    maxTokens:    500,
  });

  const fetchPool = useCallback(() => {
    getAiPoolStatus().then(r => setPool(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    getAiConfig(storeId)
      .then((res) => {
        if (res.data) {
          const d        = res.data;
          const provider = (d.aiProvider ?? 'groq') as AIProvider;
          setForm({
            aiProvider:   provider,
            apiKey:       d.apiKey ?? d.groqApiKey ?? '',
            model:        d.model ?? PROVIDERS[provider].models[0].value,
            systemPrompt: d.systemPrompt ?? '',
            temperature:  d.temperature ?? 0.7,
            maxTokens:    d.maxTokens ?? 500,
          });
          if (d.cartridges && Array.isArray(d.cartridges)) {
            setCartridges(d.cartridges.map((c: any) => ({
              provider: c.provider as AIProvider,
              apiKey:   c.apiKey ?? '',
              model:    c.model  ?? '',
            })));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetchPool();
    const id = setInterval(fetchPool, 30_000);
    return () => clearInterval(id);
  }, [storeId, fetchPool]);

  const handleProviderChange = (p: AIProvider) => {
    setForm(f => ({ ...f, aiProvider: p, model: PROVIDERS[p].models[0].value, apiKey: '' }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveAiConfig({
        ...form,
        cartridges: cartridges.filter(c => c.apiKey.trim()).map(c => ({
          provider: c.provider,
          apiKey:   c.apiKey.trim(),
          model:    c.model || PROVIDERS[c.provider]?.models[0]?.value || '',
        })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const pInfo     = PROVIDERS[form.aiProvider];
  const whisperOk = form.aiProvider === 'groq' || form.aiProvider === 'openai';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-lime border-t-transparent animate-spin" />
    </div>
  );

  return (
    <form onSubmit={handleSave} className="space-y-5">

      {/* ── Proveedor ── */}
      <div className={cardClass}>
        <div className="flex items-center gap-3 mb-5">
          <div className={sectionIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4FF00" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-txt-primary">Proveedor de IA</h2>
            <p className="text-xs text-txt-tertiary">Elige dónde se ejecutan las respuestas de tu asistente</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(Object.keys(PROVIDERS) as AIProvider[]).map((p) => {
            const sel = form.aiProvider === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handleProviderChange(p)}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition ${
                  sel
                    ? 'border-lime bg-lime/10 text-lime'
                    : 'border-border-subtle hover:border-border-default text-txt-secondary hover:text-txt-primary'
                }`}
              >
                <span style={{ color: sel ? undefined : PROVIDERS[p].color }}>
                  {PROVIDERS[p].name}
                </span>
              </button>
            );
          })}
        </div>

        {!whisperOk && (
          <p className="mt-3 text-xs text-warning bg-warning/10 border border-warning/20 rounded-xl px-3 py-2">
            Transcripción de audio (Whisper) no disponible con {pInfo.name}. Solo Groq y OpenAI soportan audios de WhatsApp.
          </p>
        )}
      </div>

      {/* ── API Key ── */}
      <div className={cardClass}>
        <div className="flex items-center gap-3 mb-4">
          <div className={sectionIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-txt-primary">{pInfo.name} API Key</h2>
            <p className="text-xs text-txt-tertiary">Obtén tu key en {pInfo.docsUrl}</p>
          </div>
        </div>
        <input
          type="password"
          value={form.apiKey}
          onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          placeholder={pInfo.keyHint}
          className="w-full px-4 py-3 rounded-xl border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:ring-2 focus:ring-lime/30 transition font-mono text-sm"
        />
      </div>

      {/* ── Cartuchos adicionales ── */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-txt-primary text-sm">Cartuchos adicionales</h3>
            <p className="text-xs text-txt-tertiary mt-0.5">
              Se usan 2 en paralelo. Cuando uno agota su límite, el siguiente entra automáticamente.
            </p>
          </div>
          {cartridges.length < 5 && (
            <button
              type="button"
              onClick={() => setCartridges(c => [...c, { provider: 'gemini', apiKey: '', model: 'gemini-2.0-flash' }])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border-default text-txt-secondary hover:bg-surface-elevated transition"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Agregar cartucho
            </button>
          )}
        </div>

        {cartridges.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border-default text-txt-tertiary text-xs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="16 2 12 7 8 2"/></svg>
            Sin cartuchos adicionales. El asistente usa solo el provider principal. Agrega cartuchos para garantizar disponibilidad continua.
          </div>
        ) : (
          <div className="space-y-3">
            {cartridges.map((c, idx) => (
              <div key={idx} className="flex flex-wrap items-start gap-3 p-4 rounded-xl border border-border-default bg-surface-elevated">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="w-6 h-6 rounded-full bg-surface-overlay flex items-center justify-center text-[10px] font-bold text-txt-tertiary">
                    {idx + 2}
                  </span>
                </div>
                {/* Provider */}
                <div className="flex-shrink-0">
                  <label className="block text-[10px] font-medium text-txt-tertiary mb-1">Provider</label>
                  <select
                    value={c.provider}
                    onChange={e => {
                      const p = e.target.value as AIProvider;
                      const defaultModel = PROVIDERS[p]?.models[0]?.value ?? '';
                      setCartridges(prev => prev.map((x, i) => i === idx ? { ...x, provider: p, model: defaultModel } : x));
                    }}
                    className="px-3 py-2 rounded-lg border border-border-default bg-surface text-sm text-txt-primary focus:outline-none"
                  >
                    {(Object.keys(PROVIDERS) as AIProvider[]).map(p => (
                      <option key={p} value={p}>{PROVIDERS[p].name}</option>
                    ))}
                  </select>
                </div>
                {/* API Key */}
                <div className="flex-1 min-w-48">
                  <label className="block text-[10px] font-medium text-txt-tertiary mb-1">API Key</label>
                  <input
                    type="password"
                    value={c.apiKey}
                    onChange={e => setCartridges(prev => prev.map((x, i) => i === idx ? { ...x, apiKey: e.target.value } : x))}
                    placeholder={PROVIDERS[c.provider]?.keyHint}
                    className="w-full px-3 py-2 rounded-lg border border-border-default bg-surface text-sm text-txt-primary placeholder:text-txt-tertiary focus:outline-none font-mono"
                  />
                </div>
                {/* Model */}
                <div className="flex-shrink-0">
                  <label className="block text-[10px] font-medium text-txt-tertiary mb-1">Modelo</label>
                  <select
                    value={c.model}
                    onChange={e => setCartridges(prev => prev.map((x, i) => i === idx ? { ...x, model: e.target.value } : x))}
                    className="px-3 py-2 rounded-lg border border-border-default bg-surface text-sm text-txt-primary focus:outline-none"
                  >
                    {(PROVIDERS[c.provider]?.models ?? []).map(m => (
                      <option key={m.value} value={m.value}>{m.name}</option>
                    ))}
                  </select>
                </div>
                {/* Remove */}
                <button
                  type="button"
                  onClick={() => setCartridges(prev => prev.filter((_, i) => i !== idx))}
                  className="flex-shrink-0 mt-5 w-8 h-8 flex items-center justify-center rounded-lg text-txt-tertiary hover:bg-red-50 hover:text-red-500 transition"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pool status indicator (conteo) */}
        <div className="mt-3 flex items-center gap-2 text-xs text-txt-tertiary">
          <div className={`w-2 h-2 rounded-full ${cartridges.filter(c => c.apiKey.trim()).length + 1 >= 2 ? 'bg-success' : 'bg-warning'}`} />
          {cartridges.filter(c => c.apiKey.trim()).length + 1} cartucho{cartridges.filter(c => c.apiKey.trim()).length + 1 !== 1 ? 's' : ''} configurado{cartridges.filter(c => c.apiKey.trim()).length + 1 !== 1 ? 's' : ''} en total
          {cartridges.filter(c => c.apiKey.trim()).length + 1 >= 2
            ? ' — Alta disponibilidad activa'
            : ' — Agrega al menos 1 cartucho más para redundancia'}
        </div>
      </div>

      {/* ── Monitor de uso en tiempo real ── */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={sectionIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4FF00" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-txt-primary text-sm">Monitor de cartuchos</h3>
              <p className="text-xs text-txt-tertiary mt-0.5">Estado en vivo — actualiza cada 30 seg</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchPool}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border-default text-txt-tertiary hover:bg-surface-elevated transition"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            Actualizar
          </button>
        </div>

        {!pool || !pool.hasPool ? (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border-default text-txt-tertiary text-xs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Sin actividad reciente. El monitor se activa cuando el asistente recibe mensajes.
          </div>
        ) : (
          <div className="space-y-2">
            {pool.cartridges.map((c, i) => {
              const st = STATUS_LABEL[c.status];
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                    c.status === 'exhausted'
                      ? 'border-red-500/30 bg-red-500/5'
                      : c.status === 'active'
                      ? 'border-success/30 bg-success/5'
                      : 'border-border-default bg-surface-elevated'
                  }`}
                >
                  {/* Número */}
                  <span className="w-6 h-6 rounded-full bg-surface-overlay flex items-center justify-center text-[10px] font-bold text-txt-tertiary flex-shrink-0">
                    {i + 1}
                  </span>
                  {/* Provider + key */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-txt-primary capitalize">{c.provider}</span>
                      <span className="font-mono text-xs text-txt-tertiary">{c.maskedKey}</span>
                    </div>
                    <p className="text-[10px] text-txt-tertiary truncate">{c.model}</p>
                  </div>
                  {/* Status badge */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.text} bg-current/10`}
                       style={{ backgroundColor: c.status === 'active' ? 'rgba(var(--color-success-rgb,34,197,94),0.12)' : c.status === 'exhausted' ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)' }}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
                    {st.label}
                  </div>
                </div>
              );
            })}

            {/* Timer de reset */}
            {pool.cartridges.some(c => c.status === 'exhausted') && pool.resetAt && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/8 border border-red-500/20 text-xs">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span className="text-txt-secondary">Límites se recargan en:</span>
                <span className="font-mono font-bold text-red-400">{countdown}</span>
                <span className="text-txt-tertiary ml-auto">— los cartuchos agotados vuelven automáticamente</span>
              </div>
            )}
            {!pool.cartridges.some(c => c.status === 'exhausted') && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-txt-tertiary">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Límites se recargan en: <span className="font-mono font-medium">{countdown}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modelo ── */}
      <div className={cardClass}>
        <div className="flex items-center gap-3 mb-5">
          <div className={sectionIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4FF00" strokeWidth="2">
              <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 010 2h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 010-2h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-txt-primary">Modelo</h2>
            <p className="text-xs text-txt-tertiary">Modelos disponibles en {pInfo.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {pInfo.models.map((m) => {
            const sel = form.model === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setForm({ ...form, model: m.value })}
                className={`p-3.5 rounded-xl border-2 text-left transition ${
                  sel
                    ? 'border-lime bg-lime/10'
                    : 'border-border-subtle hover:border-border-default bg-surface-elevated'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-semibold text-sm ${sel ? 'text-lime' : 'text-txt-primary'}`}>
                    {m.name}
                  </span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-[#0A0A0F]"
                    style={{ backgroundColor: m.tagColor }}
                  >
                    {m.tag}
                  </span>
                </div>
                <p className="text-xs text-txt-tertiary leading-tight">{m.desc}</p>
                {m.speed && (
                  <p className={`text-xs font-medium mt-1.5 ${sel ? 'text-lime' : 'text-txt-tertiary'}`}>
                    {m.speed}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 px-3 py-2 bg-surface-elevated rounded-xl border border-border-subtle">
          <p className="text-xs text-txt-tertiary">
            Modelo: <span className="font-mono text-txt-secondary font-medium">{form.model}</span>
          </p>
        </div>
      </div>

      {/* ── System Prompt ── */}
      <div className={cardClass}>
        <div className="flex items-center gap-3 mb-4">
          <div className={sectionIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4FF00" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-txt-primary">Instrucciones del asistente</h2>
            <p className="text-xs text-txt-tertiary">Define cómo debe comportarse y responder la IA</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setForm({ ...form, systemPrompt: SUGGESTED_PROMPT })}
          className="w-full mb-3 px-4 py-2.5 rounded-xl border border-dashed border-border-default text-txt-secondary text-sm hover:border-lime/50 hover:text-lime transition flex items-center justify-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Usar prompt sugerido
        </button>

        <textarea
          value={form.systemPrompt}
          onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
          rows={8}
          placeholder="Eres un asistente de ventas de [nombre tienda]. Responde siempre en español..."
          className="w-full px-4 py-3 rounded-xl border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:ring-2 focus:ring-lime/30 transition text-sm resize-none"
        />
        <p className="text-xs text-txt-tertiary mt-2">{form.systemPrompt.length} caracteres</p>
      </div>

      {/* ── Parámetros avanzados ── */}
      <div className={cardClass}>
        <div className="flex items-center gap-3 mb-5">
          <div className={sectionIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4FF00" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-txt-primary">Parámetros avanzados</h2>
            <p className="text-xs text-txt-tertiary">Controla la creatividad y longitud de las respuestas</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-txt-primary">Temperatura</label>
              <span className="text-sm font-bold text-lime">{form.temperature}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.1"
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
              className="w-full accent-lime"
            />
            <div className="flex justify-between text-xs text-txt-tertiary mt-1">
              <span>Preciso y directo</span>
              <span>Creativo y variado</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-txt-primary">Máximo de palabras</label>
              <span className="text-sm font-bold text-lime">{form.maxTokens}</span>
            </div>
            <input
              type="range" min="100" max="2000" step="100"
              value={form.maxTokens}
              onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) })}
              className="w-full accent-lime"
            />
            <div className="flex justify-between text-xs text-txt-tertiary mt-1">
              <span>Respuestas cortas</span>
              <span>Respuestas largas</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Guardar ── */}
      <button
        type="submit"
        disabled={saving}
        className="w-full py-4 rounded-xl text-[#0A0A0F] font-semibold text-base transition-all disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            Guardando...
          </span>
        ) : saved ? (
          <span className="flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            ¡Guardado!
          </span>
        ) : 'Guardar configuración'}
      </button>
    </form>
  );
}
