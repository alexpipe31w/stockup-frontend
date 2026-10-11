import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getCampaigns, createCampaign, sendCampaign, resumeCampaigns, getWhatsAppHealth, type WhatsAppHealth } from '../services/api';

// ── Icons ─────────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────
interface Campaign {
  campaignId:  string;
  name:        string;
  message:     string;
  status:      string;
  sentCount:   number;
  scheduledAt: string | null;
  createdAt:   string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Borrador',  cls: 'bg-surface-overlay text-txt-secondary' },
  scheduled: { label: 'Programada', cls: 'bg-blue-100 text-blue-700' },
  sending:   { label: 'Enviando',  cls: 'bg-yellow-100 text-yellow-700' },
  sent:      { label: 'Enviada',   cls: 'bg-green-100 text-green-700' },
  failed:    { label: 'Fallida',   cls: 'bg-red-100 text-red-600' },
};

const fmtWhen = (d: string) =>
  new Date(d).toLocaleString('es-CO', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Mensaje del servidor (409 pausa, 400 sin destinatarios…) o uno genérico. */
const errorMessage = (err: unknown, fallback: string) => {
  const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof msg === 'string' ? msg : fallback;
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Modal nueva campaña ───────────────────────────────────────────────────────
function CampaignModal({
  storeId, onClose, onSaved,
}: {
  storeId: string;
  onClose: () => void;
  onSaved: (c: Campaign) => void;
}) {
  const [name, setName]       = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const charCount = message.length;
  const smsCount  = Math.ceil(charCount / 160) || 1;

  const handleSubmit = async () => {
    if (!name.trim())    return setError('El nombre es requerido');
    if (!message.trim()) return setError('El mensaje es requerido');
    setSaving(true);
    setError('');
    try {
      const res = await createCampaign({ name: name.trim(), message: message.trim() });
      onSaved(res.data);
      onClose();
    } catch {
      setError('Error al crear la campaña');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="font-bold text-txt-primary">Nueva campaña</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-txt-tertiary hover:bg-surface-overlay transition">
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide block mb-1">
              Nombre de la campaña
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Promo fin de semana"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-txt-secondary uppercase tracking-wide block mb-1">
              Mensaje
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe el mensaje que recibirán todos tus clientes..."
              rows={5}
              className="w-full px-3 py-2 text-sm border border-border-default bg-surface-elevated text-txt-primary placeholder:text-txt-tertiary rounded-xl focus:outline-none focus:ring-2 focus:ring-lime/30 transition resize-none"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-txt-tertiary">{charCount} caracteres</p>
              <p className="text-xs text-txt-tertiary">{smsCount} segmento{smsCount > 1 ? 's' : ''} WhatsApp</p>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-[#0A0A0F] disabled:opacity-50 transition"
            style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
          >
            {saving ? 'Creando...' : 'Crear campaña'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Campaigns() {
  const { storeId } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending]     = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState<Campaign | null>(null);
  const [health, setHealth]       = useState<WhatsAppHealth | null>(null);
  const [notice, setNotice]       = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [confirmResume, setConfirmResume] = useState(false);
  const [resuming, setResuming]   = useState(false);

  const loadHealth = useCallback(() => {
    getWhatsAppHealth(storeId).then((r) => setHealth(r.data)).catch(() => {});
  }, [storeId]);

  useEffect(() => { loadHealth(); }, [loadHealth]);

  const handleResume = async () => {
    setResuming(true);
    try {
      await resumeCampaigns();
      setNotice({ kind: 'ok', text: 'Campañas reanudadas. Lo pendiente sigue saliendo con el ritmo y el tope diario.' });
    } catch (err) {
      setNotice({ kind: 'error', text: errorMessage(err, 'No se pudieron reanudar las campañas') });
    } finally {
      setResuming(false);
      setConfirmResume(false);
      loadHealth();
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    getCampaigns(storeId).then((res) => setCampaigns(res.data)).finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async (campaign: Campaign) => {
    setSending(campaign.campaignId);
    try {
      // El envío sale en segundo plano: el servidor responde 'sending' ("Enviando")
      // y la campaña pasa a 'sent' cuando termina.
      const res = await sendCampaign(campaign.campaignId);
      setCampaigns((prev) =>
        prev.map((c) => c.campaignId === campaign.campaignId ? { ...c, status: res.data?.status ?? 'sending' } : c)
      );
      // Sale poco a poco: tope diario por número y solo en horario permitido.
      const { recipients, estimatedDays, startsAt } = res.data ?? {};
      // Sin estimación (el servidor no pudo calcularla) no se inventa una cifra.
      if (typeof recipients === 'number' && typeof estimatedDays === 'number') {
        const start = startsAt && new Date(startsAt).getTime() > Date.now() + 60_000 ? ` Empieza el ${fmtWhen(startsAt)}` : '';
        const plural = estimatedDays === 1 ? 'día hábil' : 'días hábiles';
        setNotice({
          kind: 'ok',
          text: `Enviando a ${recipients} cliente${recipients === 1 ? '' : 's'}. Saldrá en ~${estimatedDays} ${plural}.${start}`,
        });
      }
    } catch (err) {
      setNotice({ kind: 'error', text: errorMessage(err, 'No se pudo enviar la campaña') });
      loadHealth();
    } finally {
      setSending(null);
      setConfirmSend(null);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">

      {/* Header */}
      <div className="bg-surface border-b border-border-subtle px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-txt-primary">Campañas</h1>
            <p className="text-sm text-txt-tertiary mt-0.5">
              {loading ? '...' : `${campaigns.length} campañas creadas`}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[#0A0A0F]"
            style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
          >
            <PlusIcon /> Nueva campaña
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {health?.campaignsPaused && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between text-sm text-orange-700 bg-orange-50 rounded-xl px-4 py-3">
            <span>
              Campañas en pausa para proteger tu número{health.campaignsPaused.reason ? `: ${health.campaignsPaused.reason}` : ''}.
              Revisa que WhatsApp esté bien antes de reanudar.
            </span>
            <button
              onClick={() => setConfirmResume(true)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium border border-orange-300 hover:bg-orange-100 transition"
            >
              Reanudar campañas
            </button>
          </div>
        )}
        {notice && (
          <div className={`mb-4 flex items-start justify-between gap-3 text-sm rounded-xl px-4 py-3 ${
            notice.kind === 'ok' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'
          }`}>
            <span>{notice.text}</span>
            <button onClick={() => setNotice(null)} aria-label="Cerrar aviso" className="flex-shrink-0 opacity-70 hover:opacity-100">
              <CloseIcon />
            </button>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <svg className="animate-spin text-blue-600" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>

        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-txt-tertiary">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.22 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
            <p className="text-sm">Sin campañas aún — crea tu primera campaña masiva</p>
          </div>

        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {campaigns.map((c) => {
              const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft;
              const isSending = sending === c.campaignId;
              return (
                <div key={c.campaignId} className="bg-surface rounded-2xl border border-border-subtle shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition">

                  {/* Name + status */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-txt-primary leading-tight">{c.name}</p>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex-shrink-0 ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Message preview */}
                  <p className="text-sm text-txt-secondary line-clamp-3 bg-surface-elevated rounded-xl px-3 py-2">
                    {c.message}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-txt-tertiary">
                    <span>{fmtDate(c.createdAt)}</span>
                    {c.sentCount > 0 && (
                      <span className="text-green-600 font-medium">{c.sentCount} enviados</span>
                    )}
                  </div>

                  {/* Action */}
                  {c.status === 'draft' && (
                    <button
                      onClick={() => setConfirmSend(c)}
                      disabled={isSending}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-[#0A0A0F] disabled:opacity-50 transition"
                      style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
                    >
                      {isSending ? (
                        <>
                          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M21 12a9 9 0 11-6.219-8.56"/>
                          </svg>
                          Enviando...
                        </>
                      ) : (
                        <><SendIcon /> Enviar a todos los clientes</>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal nueva campaña */}
      {showModal && (
        <CampaignModal
          storeId={storeId}
          onClose={() => setShowModal(false)}
          onSaved={(c) => setCampaigns((prev) => [c, ...prev])}
        />
      )}

      {/* Confirm send */}
      {confirmSend && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4">
          <div className="bg-surface rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-txt-primary mb-2">Enviar campaña masiva</h3>
            <p className="text-sm text-txt-secondary mb-1">
              Vas a enviar <span className="font-semibold text-txt-primary">"{confirmSend.name}"</span> a todos tus clientes por WhatsApp.
            </p>
            <p className="text-xs text-txt-tertiary mb-3">
              Solo a quienes ya te escribieron. Para proteger tu número sale poco a poco: con un tope diario
              {health ? ` (hoy ${health.campaignDailyCap})` : ''} y en horario permitido (lunes a viernes 7:00–19:00, sábados 8:00–15:00, sin festivos).
            </p>
            <p className="text-xs text-orange-600 bg-orange-50 rounded-xl px-3 py-2 mb-5">
              Esta acción no se puede deshacer. Asegúrate que el mensaje esté correcto.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmSend(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-surface-overlay text-txt-secondary hover:bg-border-default transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSend(confirmSend)}
                disabled={!!sending}
                className="flex-1 py-2 rounded-xl text-sm font-medium text-[#0A0A0F] disabled:opacity-50 transition"
                style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
              >
                {sending ? 'Enviando...' : 'Confirmar envío'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm resume */}
      {confirmResume && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4">
          <div className="bg-surface rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-txt-primary mb-2">Reanudar campañas</h3>
            <p className="text-sm text-txt-secondary mb-5">
              Se pausaron porque algo fue mal con WhatsApp. Reanúdalas solo si el número está conectado y funcionando con normalidad.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmResume(false)}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-surface-overlay text-txt-secondary hover:bg-border-default transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleResume}
                disabled={resuming}
                className="flex-1 py-2 rounded-xl text-sm font-medium text-[#0A0A0F] disabled:opacity-50 transition"
                style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
              >
                {resuming ? 'Reanudando...' : 'Reanudar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

