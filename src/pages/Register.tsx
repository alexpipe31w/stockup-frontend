import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createCheckout } from '../services/api';
import api from '../services/api';

type Step = 'form' | 'verify' | 'payment';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  storeName: string;
  storePhone: string;
}

// ── Indicador de pasos ────────────────────────────────────────────────────
function StepBar({ step }: { step: Step }) {
  const steps = [
    { key: 'form',    label: 'Crear cuenta' },
    { key: 'verify',  label: 'Verificar email' },
    { key: 'payment', label: 'Pago' },
  ];
  const activeIdx = steps.findIndex(s => s.key === step);
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div key={s.key} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className={`flex items-center gap-2 text-sm font-medium whitespace-nowrap ${active ? 'text-blue-600' : done ? 'text-emerald-600' : 'text-txt-tertiary'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${active ? 'bg-blue-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-border-default text-txt-secondary'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${i < activeIdx ? 'bg-blue-600' : 'bg-border-default'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Panel izquierdo decorativo ────────────────────────────────────────────
function LeftPanel() {
  return (
    <div
      className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white"
      style={{ background: 'linear-gradient(135deg, #2563eb 0%, #9333ea 100%)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-surface/20 rounded-xl flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="white"/>
          </svg>
        </div>
        <span className="text-xl font-bold">Stockup Messages</span>
      </div>
      <div>
        <h2 className="text-4xl font-bold mb-4 leading-tight">
          Empieza a vender<br/>más con WhatsApp
        </h2>
        <p className="text-white/70 text-lg">
          CRM con IA. Automatiza respuestas, gestiona pedidos, agenda citas y crece tu negocio.
        </p>
        <div className="mt-10 space-y-4">
          {[
            { icon: '🤖', text: 'IA responde a tus clientes 24/7' },
            { icon: '📦', text: 'Gestión de productos, servicios y órdenes' },
            { icon: '📅', text: 'Agendamiento automático de citas' },
            { icon: '📊', text: 'Analíticas y campañas de WhatsApp' },
          ].map(f => (
            <div key={f.text} className="flex items-center gap-3 bg-surface/10 rounded-xl px-4 py-3">
              <span className="text-xl">{f.icon}</span>
              <span className="text-white/90 text-sm">{f.text}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-white/40 text-sm">© 2026 Stockup Messages</p>
    </div>
  );
}

export default function Register() {
  const [step, setStep]       = useState<Step>('form');
  const [sessionId, setSessionId] = useState('');
  const [form, setForm]       = useState<FormData>({ name: '', email: '', password: '', confirmPassword: '', storeName: '', storePhone: '' });
  const [code, setCode]       = useState(['', '', '', '', '', '']);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown para reenvío
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // ── Paso 1: enviar código de verificación ────────────────────────────────
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (!form.storeName.trim() || !form.storePhone.trim()) { setError('Completa el nombre y teléfono de tu negocio'); return; }

    setLoading(true);
    try {
      const res = await api.post('/auth/send-verification', {
        name: form.name,
        email: form.email,
        password: form.password,
        storeName: form.storeName,
        storePhone: form.storePhone,
      });
      setSessionId(res.data.sessionId);
      setStep('verify');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al enviar el código. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Paso 2: verificar código y crear cuenta ──────────────────────────────
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const fullCode = code.join('');
    if (fullCode.length < 6) { setError('Ingresa el código de 6 dígitos'); return; }

    setLoading(true);
    try {
      const res = await api.post('/auth/verify-and-register', { sessionId, code: fullCode });
      const { access_token, userId, email, role, storeId } = res.data;
      // Guardar token en localStorage — el interceptor de axios lo leerá en handlePay
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify({ userId, email, role, storeId }));
      // Mostrar el paso de pago sin recargar la página
      setStep('payment');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Código incorrecto o expirado.');
      setCode(['', '', '', '', '', '']);
      codeRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    try {
      const res = await api.post('/auth/send-verification', {
        name: form.name, email: form.email, password: form.password,
        storeName: form.storeName, storePhone: form.storePhone,
      });
      setSessionId(res.data.sessionId);
      setCode(['', '', '', '', '', '']);
      setResendCooldown(60);
    } catch (err: any) {
      setError('Error al reenviar el código.');
    }
  };

  const handleCodeInput = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    if (digit && idx < 5) codeRefs.current[idx + 1]?.focus();
  };

  const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) codeRefs.current[idx - 1]?.focus();
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      codeRefs.current[5]?.focus();
    }
  };

  // ── Paso 3: pago ─────────────────────────────────────────────────────────
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

  return (
    <div className="min-h-screen flex">
      <LeftPanel />

      {/* Panel derecho */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface-elevated">
        <div className="w-full max-w-md">
          <StepBar step={step} />

          {/* ── PASO 1: Formulario ── */}
          {step === 'form' && (
            <>
              <h1 className="text-2xl font-bold text-txt-primary mb-1">Crear cuenta</h1>
              <p className="text-txt-secondary text-sm mb-6">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-blue-600 hover:underline font-medium">Inicia sesión</Link>
              </p>

              {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-txt-secondary mb-1.5">Tu nombre</label>
                    <input name="name" value={form.name} onChange={handleChange} required placeholder="Alex Gómez"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-default bg-surface text-txt-primary text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime/30/30 focus:border-lime transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-txt-secondary mb-1.5">Email</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="tu@email.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-default bg-surface text-txt-primary text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime/30/30 focus:border-lime transition" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-txt-secondary mb-1.5">Contraseña</label>
                    <input name="password" type="password" value={form.password} onChange={handleChange} required placeholder="Mín. 8 caracteres"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-default bg-surface text-txt-primary text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime/30/30 focus:border-lime transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-txt-secondary mb-1.5">Confirmar</label>
                    <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required placeholder="Repetir"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-default bg-surface text-txt-primary text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime/30/30 focus:border-lime transition" />
                  </div>
                </div>
                <div className="border-t border-border-subtle pt-4">
                  <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-3">Tu negocio</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-txt-secondary mb-1.5">Nombre del negocio</label>
                      <input name="storeName" value={form.storeName} onChange={handleChange} required placeholder="Mi Tienda"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border-default bg-surface text-txt-primary text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime/30/30 focus:border-lime transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-txt-secondary mb-1.5">WhatsApp del negocio</label>
                      <input name="storePhone" value={form.storePhone} onChange={handleChange} required placeholder="573001234567"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border-default bg-surface text-txt-primary text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime/30/30 focus:border-lime transition" />
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition disabled:opacity-60 mt-2"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}>
                  {loading ? 'Enviando código...' : 'Continuar — verificar email'}
                </button>
              </form>
            </>
          )}

          {/* ── PASO 2: Verificar email ── */}
          {step === 'verify' && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-txt-primary mb-1">Verifica tu email</h1>
                <p className="text-txt-secondary text-sm">
                  Enviamos un código de 6 dígitos a<br/>
                  <strong className="text-txt-primary">{form.email}</strong>
                </p>
              </div>

              {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">{error}</div>}

              <form onSubmit={handleVerify}>
                {/* Inputs de código */}
                <div className="flex gap-2 justify-center mb-6" onPaste={handleCodePaste}>
                  {code.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => { codeRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleCodeInput(idx, e.target.value)}
                      onKeyDown={e => handleCodeKeyDown(idx, e)}
                      className="w-11 h-14 text-center text-xl font-bold border-2 rounded-xl bg-surface text-txt-primary focus:outline-none focus:border-lime transition"
                      style={{ borderColor: digit ? '#2563eb' : '#e2e8f0' }}
                    />
                  ))}
                </div>

                <button type="submit" disabled={loading || code.join('').length < 6}
                  className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition disabled:opacity-50 mb-4"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Verificando...
                    </span>
                  ) : 'Verificar y crear cuenta'}
                </button>
              </form>

              <div className="text-center space-y-2">
                <button onClick={handleResend} disabled={resendCooldown > 0}
                  className="text-sm text-blue-600 hover:underline disabled:text-txt-tertiary disabled:no-underline transition">
                  {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
                </button>
                <br/>
                <button onClick={() => { setStep('form'); setCode(['','','','','','']); setError(''); }}
                  className="text-sm text-txt-tertiary hover:text-txt-secondary transition">
                  Cambiar email
                </button>
              </div>
            </>
          )}

          {/* ── PASO 3: Pago ── */}
          {step === 'payment' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="22 4 12 14.01 9 11.01" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <h1 className="text-2xl font-bold text-txt-primary mb-1">¡Email verificado!</h1>
              <p className="text-txt-secondary text-sm mb-8">
                Tu cuenta fue creada. Activa tu suscripción para empezar.
              </p>

              <div className="bg-surface rounded-2xl border border-border-default p-6 mb-6 text-left shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide bg-blue-50 px-2.5 py-1 rounded-full">Plan mensual</span>
                    <h3 className="text-lg font-bold text-txt-primary mt-2">Stockup Messages</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-txt-primary">$24.000</div>
                    <div className="text-xs text-txt-tertiary">COP / mes</div>
                  </div>
                </div>
                <div className="space-y-2 border-t border-border-subtle pt-4">
                  {['IA responde a tus clientes en WhatsApp', 'Gestión de productos, servicios y órdenes', 'Agendamiento automático de citas', 'Campañas masivas de WhatsApp', 'Panel de analíticas'].map(f => (
                    <div key={f} className="flex items-center gap-2.5 text-sm text-txt-secondary">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-emerald-500 flex-shrink-0">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

              <button onClick={handlePay} disabled={payLoading}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition disabled:opacity-60 mb-3 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #009ee3, #003087)' }}>
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="2"/>
                      <path d="M2 10h20" stroke="white" strokeWidth="2"/>
                    </svg>
                    Pagar con MercadoPago
                  </>
                )}
              </button>
              <button onClick={() => window.location.href = '/subscription'}
                className="w-full py-2.5 rounded-xl text-txt-secondary text-sm hover:text-txt-primary transition">
                Pagar después
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
