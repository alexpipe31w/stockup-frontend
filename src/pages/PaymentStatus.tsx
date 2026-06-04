import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { processPaymentManually, getMySubscription } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';

type Stage = 'processing' | 'pending' | 'success' | 'failure';

export default function PaymentStatus() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const { user, logout } = useAuth();
  const { refresh: refreshSub } = useSubscription();

  // MP puede enviar cualquiera de estos parámetros según el flujo (back_url redirect o manual)
  const returnStatus     = searchParams.get('status') ?? searchParams.get('collection_status');
  const mpPaymentId      = searchParams.get('payment_id') ?? searchParams.get('collection_id');
  const mpCollectionStatus = searchParams.get('collection_status'); // 'approved' | 'rejected' | 'pending'

  // Detectar falla inmediata: status=failure O collection_status=rejected/cancelled
  const isImmediateFailure = returnStatus === 'failure'
    || mpCollectionStatus === 'rejected'
    || mpCollectionStatus === 'cancelled';

  const [stage, setStage]     = useState<Stage>(isImmediateFailure ? 'failure' : 'processing');
  const [countdown, setCountdown] = useState(4);

  const processed   = useRef(false);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttempts = useRef(0);
  const MAX_POLL_ATTEMPTS = 30; // 30 × 4s = 2 min máximo

  const stopPolling = () => {
    if (pollRef.current)  { clearInterval(pollRef.current);  pollRef.current  = null; }
    if (countRef.current) { clearInterval(countRef.current); countRef.current = null; }
  };

  const onSuccess = useCallback(async () => {
    stopPolling();
    await refreshSub();
    setStage('success');
    setCountdown(4);
    // Cuenta regresiva y redirige al login
    countRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countRef.current!);
          logout();
          navigate('/login', { replace: true });
        }
        return prev - 1;
      });
    }, 1000);
  }, [refreshSub, logout, navigate]);

  const checkSubscription = useCallback(async () => {
    pollAttempts.current += 1;

    // Si superamos el límite, detenemos el polling y mostramos falla
    if (pollAttempts.current > MAX_POLL_ATTEMPTS) {
      stopPolling();
      setStage('failure');
      return;
    }

    try {
      const res = await getMySubscription();
      if (res.data.subscriptionStatus === 'active') {
        onSuccess();
      }
    } catch {
      // En errores de red conservamos el estado y seguimos intentando
    }
  }, [onSuccess]);

  const startPolling = useCallback(() => {
    pollAttempts.current = 0;
    setStage('pending');
    checkSubscription();
    pollRef.current = setInterval(checkSubscription, 4000);
  }, [checkSubscription]);

  useEffect(() => {
    if (isImmediateFailure) { setStage('failure'); return; }
    if (!user?.storeId || processed.current) return;
    processed.current = true;

    if (mpPaymentId) {
      // MP nos devolvió con payment_id — procesamos directamente
      processPaymentManually(mpPaymentId)
        .then(res => {
          const st = res.data?.status;
          if (st === 'approved' || st === 'already_processed') {
            onSuccess();
          } else {
            startPolling();
          }
        })
        .catch(startPolling);
    } else {
      // No hay payment_id (pago pendiente o manual) — solo pollemos
      startPolling();
    }

    return stopPolling;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.storeId]);

  useEffect(() => () => stopPolling(), []);

  // ── UI ────────────────────────────────────────────────────────────────────

  if (stage === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">¡Suscripción activada!</h1>
          <p className="text-slate-500 text-sm mb-8">
            Tu pago fue confirmado. Ya puedes usar todas las funciones de Stockup Messages.
          </p>
          <div className="bg-emerald-50 rounded-2xl p-4 mb-6">
            <p className="text-emerald-700 text-sm font-medium">
              Redirigiendo al inicio de sesión en <span className="font-bold text-emerald-800">{countdown}s</span>...
            </p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login', { replace: true }); }}
            className="w-full py-3.5 rounded-xl text-[#0A0A0F] font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)' }}
          >
            Ir al inicio de sesión ahora
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'failure') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2"/>
              <line x1="15" y1="9" x2="9" y2="15" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="9" y1="9" x2="15" y2="15" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Pago no completado</h1>
          <p className="text-slate-500 text-sm mb-8">
            El pago fue cancelado o rechazado. Puedes intentarlo de nuevo cuando quieras.
          </p>
          <button
            onClick={() => navigate('/subscription', { replace: true })}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm mb-3"
            style={{ background: 'linear-gradient(135deg, #009ee3, #003087)' }}
          >
            Intentar de nuevo
          </button>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full py-2.5 rounded-xl text-slate-500 text-sm hover:text-slate-700 transition"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <svg className="animate-spin w-10 h-10 text-amber-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Verificando tu pago</h1>
          <p className="text-slate-500 text-sm mb-8">
            Tu pago está siendo procesado. Esto puede tomar un momento. Esta página se actualiza automáticamente.
          </p>
          <div className="flex justify-center gap-1.5 mb-6">
            {[0,1,2].map(i => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Verificando automáticamente cada 4 segundos (máx 2 min). Si ya pagaste y esto tarda,{' '}
            <button
              onClick={() => navigate('/subscription', { replace: true })}
              className="text-blue-500 underline hover:text-blue-700"
            >
              usa la recuperación manual
            </button>
          </p>
        </div>
      </div>
    );
  }

  // stage === 'processing'
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
          <svg className="animate-spin w-10 h-10 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Confirmando tu pago</h1>
        <p className="text-slate-500 text-sm">Estamos verificando el pago con MercadoPago...</p>
      </div>
    </div>
  );
}
