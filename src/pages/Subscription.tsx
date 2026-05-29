import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMySubscription, createCheckout, processPaymentManually } from '../services/api';

interface SubscriptionData {
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
    payments: {
      paymentId: string;
      mpPaymentId: string | null;
      amount: number;
      status: string;
      paidAt: string | null;
      createdAt: string;
    }[];
  } | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function fmtCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    expired: 'bg-red-100 text-red-700',
    none: 'bg-slate-100 text-slate-600',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    active: 'Activa', pending: 'Pendiente', expired: 'Vencida',
    none: 'Sin suscripción', approved: 'Aprobado', rejected: 'Rechazado',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function Subscription() {
  const { storeId } = useAuth();
  const [searchParams] = useSearchParams();
  const returnStatus   = searchParams.get('status');
  // MP incluye payment_id (o collection_id) en el redirect de vuelta
  const mpPaymentId    = searchParams.get('payment_id') ?? searchParams.get('collection_id');

  const [data, setData]               = useState<SubscriptionData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [payLoading, setPayLoading]   = useState(false);
  const [error, setError]             = useState('');
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [autoMsg, setAutoMsg]         = useState('');

  // Recuperación manual
  const [recoveryId, setRecoveryId]         = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMsg, setRecoveryMsg]         = useState('');

  const autoProcessed = useRef(false);

  const loadSubscription = () =>
    getMySubscription()
      .then(res => setData(res.data))
      .catch(() => setError('Error al cargar la suscripción'))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    loadSubscription();
  }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-procesar el pago al regresar de MP si viene payment_id en la URL
  useEffect(() => {
    if (!mpPaymentId || !storeId || autoProcessed.current) return;
    if (returnStatus !== 'success') return;

    autoProcessed.current = true;
    setAutoProcessing(true);
    setAutoMsg('Confirmando tu pago...');

    processPaymentManually(mpPaymentId)
      .then(res => {
        const st = res.data?.status;
        if (st === 'approved' || st === 'already_processed') {
          setAutoMsg('¡Pago confirmado! Activando tu suscripción...');
          // Recargar datos en 2s para reflejar la activación
          setTimeout(() => {
            setLoading(true);
            loadSubscription().finally(() => setAutoProcessing(false));
          }, 2000);
        } else {
          setAutoMsg(`Pago en estado: ${st}. Si ya pagaste, espera unos minutos y recarga.`);
          setAutoProcessing(false);
        }
      })
      .catch(() => {
        setAutoMsg('No pudimos confirmar el pago automáticamente. Usa el formulario de recuperación abajo si ya pagaste.');
        setAutoProcessing(false);
      });
  }, [mpPaymentId, storeId, returnStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePay = async () => {
    setPayLoading(true);
    setError('');
    try {
      const res = await createCheckout();
      window.location.href = res.data.initPoint;
    } catch {
      setError('Error al iniciar el pago. Intenta de nuevo.');
      setPayLoading(false);
    }
  };

  const handleRecovery = async () => {
    const pid = recoveryId.trim();
    if (!pid) return;
    setRecoveryLoading(true);
    setRecoveryMsg('');
    try {
      const res = await processPaymentManually(pid);
      const st = res.data?.status;
      if (st === 'approved') {
        setRecoveryMsg('¡Pago aprobado! Actualizando...');
        setTimeout(() => loadSubscription(), 1500);
      } else if (st === 'already_processed') {
        setRecoveryMsg('Este pago ya fue procesado. Actualizando...');
        setTimeout(() => loadSubscription(), 2000);
      } else {
        setRecoveryMsg(`Estado del pago: ${st}. Si es "approved" recarga la página.`);
      }
    } catch {
      setRecoveryMsg('Error procesando el pago. Verifica que el ID sea correcto.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <svg className="animate-spin w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Suscripción</h1>
        <p className="text-slate-500 text-sm mt-1">Administra tu plan de Stockup Messages</p>
      </div>

      {/* Banner de retorno de MercadoPago */}
      {returnStatus === 'success' && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-emerald-600 flex-shrink-0 mt-0.5">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="flex-1">
            <p className="font-semibold text-emerald-800">Pago recibido</p>
            {autoProcessing ? (
              <div className="flex items-center gap-2 mt-1">
                <svg className="animate-spin w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <p className="text-emerald-700 text-sm">{autoMsg}</p>
              </div>
            ) : autoMsg ? (
              <p className="text-emerald-700 text-sm mt-0.5">{autoMsg}</p>
            ) : (
              <p className="text-emerald-700 text-sm mt-0.5">Tu suscripción será activada en unos momentos.</p>
            )}
          </div>
        </div>
      )}

      {returnStatus === 'failure' && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-500 flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div>
            <p className="font-semibold text-red-700">El pago no fue completado</p>
            <p className="text-red-600 text-sm mt-0.5">Puedes intentarlo nuevamente cuando quieras.</p>
          </div>
        </div>
      )}

      {returnStatus === 'pending' && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-amber-600 flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <p className="font-semibold text-amber-800">Pago en proceso</p>
            <p className="text-amber-700 text-sm mt-0.5">
              Tu pago está siendo verificado. Puede tardar unos minutos.
              {mpPaymentId && ` ID: #${mpPaymentId}`}
            </p>
          </div>
        </div>
      )}

      {/* Estado actual */}
      {data && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Estado actual</p>
                <StatusBadge status={data.subscriptionStatus} />
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 mb-1">Plan mensual</p>
                <p className="text-2xl font-bold text-slate-800">{fmtCOP(data.currentPrice)}</p>
              </div>
            </div>

            {data.subscription?.currentPeriodEnd && data.subscriptionStatus === 'active' && (
              <div className="bg-slate-50 rounded-xl p-4 mb-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Período actual desde</p>
                    <p className="font-medium text-slate-700">{fmtDate(data.subscription.currentPeriodStart!)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Vence el</p>
                    <p className="font-medium text-slate-700">{fmtDate(data.subscription.currentPeriodEnd)}</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            {(data.subscriptionStatus !== 'active') && (
              <button
                onClick={handlePay}
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
                    Redirigiendo...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="2"/>
                      <path d="M2 10h20" stroke="white" strokeWidth="2"/>
                    </svg>
                    Activar suscripción
                  </>
                )}
              </button>
            )}

            {data.subscriptionStatus === 'active' && (
              <button
                onClick={handlePay}
                disabled={payLoading}
                className="w-full py-2.5 rounded-xl text-blue-600 text-sm font-medium hover:bg-blue-50 transition"
              >
                {payLoading ? 'Redirigiendo...' : 'Renovar anticipadamente'}
              </button>
            )}
          </div>

          {/* Historial de pagos */}
          {data.subscription?.payments && data.subscription.payments.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-5">
              <h3 className="font-semibold text-slate-800 mb-4">Historial de pagos</h3>
              <div className="space-y-3">
                {data.subscription.payments.map(payment => (
                  <div key={payment.paymentId} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{fmtCOP(Number(payment.amount))}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {payment.paidAt ? fmtDate(payment.paidAt) : fmtDate(payment.createdAt)}
                        {payment.mpPaymentId && <span className="ml-2 font-mono">#{payment.mpPaymentId.slice(-6)}</span>}
                      </p>
                    </div>
                    <StatusBadge status={payment.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recuperación manual — para cuando el webhook no llegó o el auto-proceso falló */}
          {data.subscriptionStatus !== 'active' && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
              <h3 className="font-semibold text-amber-800 mb-1 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                ¿Ya pagaste pero sigue pendiente?
              </h3>
              <p className="text-amber-700 text-sm mb-4">
                Ingresa el ID del pago de MercadoPago para activar tu suscripción manualmente.
                Lo encuentras en el email de confirmación de MP o en tu historial en mercadopago.com.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={recoveryId}
                  onChange={e => setRecoveryId(e.target.value)}
                  placeholder="Ej: 123456789"
                  className="flex-1 px-3 py-2 rounded-xl border border-amber-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  onClick={handleRecovery}
                  disabled={recoveryLoading || !recoveryId.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition"
                >
                  {recoveryLoading ? 'Verificando...' : 'Verificar'}
                </button>
              </div>
              {recoveryMsg && (
                <p className="mt-3 text-sm text-amber-800 font-medium">{recoveryMsg}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
