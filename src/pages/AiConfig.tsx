import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAiConfig, saveAiConfig } from '../services/api';

type AIProvider = 'groq' | 'openai' | 'together' | 'mistral' | 'anthropic';

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
      { value: 'llama-3.3-70b-versatile',             name: 'Llama 3.3 70B',  tag: 'BALANCEADO',     tagColor: '#2563eb', speed: '280 t/s',  desc: 'Modelo probado. Buen equilibrio calidad/velocidad.' },
      { value: 'llama-3.1-8b-instant',                name: 'Llama 3.1 8B',   tag: 'ECONÓMICO',      tagColor: '#64748b', speed: '560 t/s',  desc: 'Ultra rápido y de bajo costo. Alto volumen.' },
      { value: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', tag: 'NUEVO',       tagColor: '#ea580c', speed: '750 t/s',  desc: 'Llama 4 multimodal. Muy rápido.' },
      { value: 'qwen/qwen3-32b',                      name: 'Qwen3 32B',       tag: 'PREVIEW',        tagColor: '#0891b2', speed: '400 t/s',  desc: 'Excelente en idiomas y razonamiento.' },
    ],
  },
  openai: {
    name:    'OpenAI',
    color:   '#10a37f',
    docsUrl: 'platform.openai.com',
    keyHint: 'sk-xxxxxxxxxxxxxxxxxxxx',
    models: [
      { value: 'gpt-4o',        name: 'GPT-4o',       tag: 'RECOMENDADO',   tagColor: '#2563eb', desc: 'El más capaz. Entiende contexto complejo.' },
      { value: 'gpt-4o-mini',   name: 'GPT-4o mini',  tag: 'ECONÓMICO',     tagColor: '#64748b', desc: 'Rápido y barato. Ideal para alto volumen.' },
      { value: 'gpt-4.1',       name: 'GPT-4.1',      tag: 'NUEVO',         tagColor: '#ea580c', desc: 'Mayor ventana de contexto que GPT-4o.' },
      { value: 'o4-mini',       name: 'o4-mini',      tag: 'RAZONAMIENTO',  tagColor: '#7c3aed', desc: 'Razonamiento paso a paso. Respuestas más precisas.' },
    ],
  },
  together: {
    name:    'Together AI',
    color:   '#6366f1',
    docsUrl: 'api.together.xyz',
    keyHint: 'xxxxxxxxxxxxxxxxxxxx',
    models: [
      { value: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B Turbo', tag: 'RECOMENDADO', tagColor: '#2563eb', desc: 'El mejor equilibrio en Together.' },
      { value: 'meta-llama/Llama-3.1-8B-Instruct-Turbo',  name: 'Llama 3.1 8B Turbo',  tag: 'ECONÓMICO',   tagColor: '#64748b', desc: 'Muy rápido y barato.' },
      { value: 'Qwen/Qwen2.5-72B-Instruct-Turbo',         name: 'Qwen 2.5 72B',         tag: 'ALTERNATIVA', tagColor: '#0891b2', desc: 'Fuerte en matemáticas e idiomas.' },
      { value: 'deepseek-ai/DeepSeek-V3',                  name: 'DeepSeek V3',           tag: 'NUEVO',       tagColor: '#ea580c', desc: 'Modelo chino de alto rendimiento.' },
    ],
  },
  mistral: {
    name:    'Mistral',
    color:   '#ff7000',
    docsUrl: 'console.mistral.ai',
    keyHint: 'xxxxxxxxxxxxxxxxxxxx',
    models: [
      { value: 'mistral-large-latest',  name: 'Mistral Large',  tag: 'MÁS CAPAZ',  tagColor: '#2563eb', desc: 'El modelo más potente de Mistral.' },
      { value: 'mistral-small-latest',  name: 'Mistral Small',  tag: 'ECONÓMICO',  tagColor: '#64748b', desc: 'Rápido y eficiente para producción.' },
      { value: 'open-mixtral-8x22b',    name: 'Mixtral 8x22B',  tag: 'OPEN SOURCE', tagColor: '#7c3aed', desc: 'MoE de alto rendimiento, open source.' },
      { value: 'codestral-latest',      name: 'Codestral',      tag: 'CÓDIGO',     tagColor: '#059669', desc: 'Especializado en código y técnico.' },
    ],
  },
  anthropic: {
    name:    'Anthropic',
    color:   '#c97f4a',
    docsUrl: 'console.anthropic.com',
    keyHint: 'sk-ant-xxxxxxxxxxxxxxxxxxxx',
    models: [
      { value: 'claude-opus-4-8',           name: 'Claude Opus 4',   tag: 'MÁS INTELIGENTE', tagColor: '#7c3aed', desc: 'El más capaz de Claude. Para casos complejos.' },
      { value: 'claude-sonnet-4-6',         name: 'Claude Sonnet 4', tag: 'RECOMENDADO',     tagColor: '#2563eb', desc: 'Mejor equilibrio inteligencia/velocidad.' },
      { value: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4',  tag: 'ECONÓMICO',       tagColor: '#64748b', desc: 'El más rápido de Claude. Ideal para volumen.' },
      { value: 'claude-sonnet-3-5',         name: 'Claude Sonnet 3.5', tag: 'ANTERIOR',      tagColor: '#94a3b8', desc: 'Versión anterior. Altamente confiable.' },
    ],
  },
};

export default function AiConfig() {
  const { storeId } = useAuth();
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [form, setForm] = useState({
    aiProvider:   'groq' as AIProvider,
    apiKey:       '',
    model:        'llama-3.3-70b-versatile',
    systemPrompt: '',
    temperature:  0.7,
    maxTokens:    500,
  });

  useEffect(() => {
    getAiConfig(storeId)
      .then((res) => {
        if (res.data) {
          const d = res.data;
          const provider = (d.aiProvider ?? 'groq') as AIProvider;
          setForm({
            aiProvider:   provider,
            apiKey:       d.apiKey ?? d.groqApiKey ?? '',
            model:        d.model ?? PROVIDERS[provider].models[0].value,
            systemPrompt: d.systemPrompt ?? '',
            temperature:  d.temperature ?? 0.7,
            maxTokens:    d.maxTokens ?? 500,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId]);

  const handleProviderChange = (p: AIProvider) => {
    setForm(f => ({
      ...f,
      aiProvider: p,
      model:      PROVIDERS[p].models[0].value,
      apiKey:     '',
    }));
  };

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

  const pInfo    = PROVIDERS[form.aiProvider];
  const whisperOk = form.aiProvider === 'groq' || form.aiProvider === 'openai';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <svg className="animate-spin text-blue-600" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 11-6.219-8.56"/>
      </svg>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Configuración de IA</h1>
        <p className="text-slate-500 mt-1">Personaliza el asistente para tu tienda — elige el proveedor y modelo</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Selector de provider */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Proveedor de IA</h2>
              <p className="text-xs text-slate-400">Elige dónde se ejecutan las respuestas de tu asistente</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(Object.keys(PROVIDERS) as AIProvider[]).map((p) => {
              const selected = form.aiProvider === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleProviderChange(p)}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition flex flex-col items-center gap-1 ${
                    selected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-100 hover:border-slate-200 text-slate-600'
                  }`}
                >
                  <span style={{ color: selected ? PROVIDERS[p].color : undefined }}>
                    {PROVIDERS[p].name}
                  </span>
                </button>
              );
            })}
          </div>

          {!whisperOk && (
            <p className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Transcripción de audio (Whisper) no disponible con {pInfo.name}. Solo Groq y OpenAI soportan audios de WhatsApp.
            </p>
          )}
        </div>

        {/* API Key */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">{pInfo.name} API Key</h2>
              <p className="text-xs text-slate-400">Obtén tu key en {pInfo.docsUrl}</p>
            </div>
          </div>
          <input
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            placeholder={pInfo.keyHint}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition font-mono text-sm"
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
              <h2 className="font-semibold text-slate-800">Modelo</h2>
              <p className="text-xs text-slate-400">Modelos disponibles en {pInfo.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pInfo.models.map((m) => {
              const selected = form.model === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setForm({ ...form, model: m.value })}
                  className={`p-3.5 rounded-xl border-2 text-left transition ${
                    selected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-semibold text-sm ${selected ? 'text-blue-700' : 'text-slate-700'}`}>
                      {m.name}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white"
                      style={{ backgroundColor: m.tagColor }}
                    >
                      {m.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-tight">{m.desc}</p>
                  {m.speed && (
                    <p className={`text-xs font-medium mt-1.5 ${selected ? 'text-blue-500' : 'text-slate-400'}`}>
                      {m.speed}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-400">
              Modelo: <span className="font-mono text-slate-600 font-medium">{form.model}</span>
            </p>
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
            onClick={() => setForm({ ...form, systemPrompt: `Eres un asistente de ventas amable y profesional de esta tienda. Tu objetivo es ayudar a los clientes con información sobre productos, precios y pedidos. Siempre responde en español, de forma breve y clara. Si el cliente quiere hacer un pedido, pide su nombre, dirección y producto. Si no puedes resolver algo, ofrece conectarlos con un asesor humano.` })}
            className="w-full mb-3 px-4 py-2.5 rounded-xl border border-dashed border-blue-300 text-blue-600 text-sm hover:bg-blue-50 transition flex items-center justify-center gap-2"
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
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm resize-none"
          />
          <p className="text-xs text-slate-400 mt-2">{form.systemPrompt.length} caracteres</p>
        </div>

        {/* Temperatura y tokens */}
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
                <span className="text-sm font-bold text-blue-600">{form.temperature}</span>
              </div>
              <input
                type="range"
                min="0" max="1" step="0.1"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
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
                <span className="text-sm font-bold text-blue-600">{form.maxTokens}</span>
              </div>
              <input
                type="range"
                min="100" max="2000" step="100"
                value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Respuestas cortas</span>
                <span>Respuestas largas</span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 rounded-xl text-white font-semibold text-base transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
              Guardando...
            </span>
          ) : saved ? (
            <span className="flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              ¡Guardado!
            </span>
          ) : 'Guardar configuración'}
        </button>
      </form>
    </div>
  );
}
