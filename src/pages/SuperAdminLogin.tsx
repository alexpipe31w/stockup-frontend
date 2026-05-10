import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminLogin } from '../services/api';
import api from '../services/api';

type View = 'credentials' | 'verify-code' | 'forgot-request' | 'forgot-reset';

function decodeJwt(token: string): any {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

// ── Logo + header compartido ──────────────────────────────────────────────────
function Header({ subtitle }: { subtitle: string }) {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-4"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white">Panel Superadmin</h1>
      <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {msg}
    </div>
  );
}

function SuccessMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
        <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
      </svg>
      {msg}
    </div>
  );
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition disabled:opacity-60"
      style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
      {loading ? 'Procesando…' : label}
    </button>
  );
}

// ── Vista 1: credenciales ─────────────────────────────────────────────────────
function CredentialsView({
  onSuccess,
  onForgot,
}: {
  onSuccess: (sessionId: string, email: string) => void;
  onForgot: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await superAdminLogin(email, password);
      const { sessionId } = res.data;
      onSuccess(sessionId, email);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header subtitle="Stockup Messages" />
      <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm"
              placeholder="admin@ejemplo.com"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm"
              placeholder="••••••••"/>
          </div>
          <ErrorMsg msg={error} />
          <SubmitBtn loading={loading} label="Continuar" />
        </form>
        <button onClick={onForgot}
          className="mt-4 w-full text-center text-slate-400 hover:text-violet-400 text-sm transition">
          Olvidé mi contraseña
        </button>
      </div>
    </>
  );
}

// ── Vista 2: verificación de código ───────────────────────────────────────────
function VerifyCodeView({
  sessionId,
  email,
  onSuccess,
  onBack,
}: {
  sessionId: string;
  email: string;
  onSuccess: (token: string) => void;
  onBack: () => void;
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = [
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null),
  ];
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { refs[0].current?.focus(); }, []); // eslint-disable-line

  const handleDigitChange = (i: number, val: string) => {
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < 5) refs[i + 1].current?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    const lastFilled = Math.min(pasted.length, 5);
    refs[lastFilled].current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) { setError('Ingresa el código completo'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/superadmin/verify-code', { sessionId, code });
      onSuccess(res.data.access_token);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Código inválido o expirado');
      setDigits(['', '', '', '', '', '']);
      refs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) =>
    a + '*'.repeat(Math.max(0, b.length)) + c
  );

  return (
    <>
      <Header subtitle="Verificación en dos pasos" />
      <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
        <p className="text-slate-400 text-sm text-center mb-6">
          Enviamos un código de 6 dígitos a<br/>
          <span className="text-white font-medium">{maskedEmail}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={refs[i]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-11 h-12 text-center text-xl font-bold rounded-xl bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
              />
            ))}
          </div>
          <ErrorMsg msg={error} />
          <SubmitBtn loading={loading} label="Verificar" />
        </form>
        <button onClick={onBack}
          className="mt-4 w-full text-center text-slate-400 hover:text-slate-200 text-sm transition">
          ← Volver al inicio de sesión
        </button>
      </div>
    </>
  );
}

// ── Vista 3: solicitar código de reset ───────────────────────────────────────
function ForgotRequestView({
  onCodeSent,
  onBack,
}: {
  onCodeSent: (email: string) => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/superadmin/forgot-password', { email });
      setSuccess('Si el email existe, recibirás el código en tu correo.');
      setTimeout(() => onCodeSent(email), 1800);
    } catch {
      setError('Error al procesar la solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header subtitle="Recuperar contraseña" />
      <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
        <p className="text-slate-400 text-sm mb-6">
          Ingresa tu email y te enviaremos un código para restablecer tu contraseña.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm"
              placeholder="admin@ejemplo.com"/>
          </div>
          <SuccessMsg msg={success} />
          <ErrorMsg msg={error} />
          <SubmitBtn loading={loading} label="Enviar código" />
        </form>
        <button onClick={onBack}
          className="mt-4 w-full text-center text-slate-400 hover:text-slate-200 text-sm transition">
          ← Volver al inicio de sesión
        </button>
      </div>
    </>
  );
}

// ── Vista 4: nueva contraseña ─────────────────────────────────────────────────
function ForgotResetView({
  email,
  onSuccess,
}: {
  email: string;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (newPassword.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/superadmin/reset-password', { email, code, newPassword });
      setSuccess('Contraseña actualizada. Redirigiendo…');
      setTimeout(onSuccess, 1800);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Código inválido o expirado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header subtitle="Nueva contraseña" />
      <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
        <p className="text-slate-400 text-sm mb-6">
          Ingresa el código que enviamos a <span className="text-white">{email}</span> y tu nueva contraseña.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Código de verificación</label>
            <input type="text" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm tracking-widest text-center font-bold text-lg"
              placeholder="123456"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Nueva contraseña</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm"
              placeholder="Mínimo 8 caracteres"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirmar contraseña</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm"
              placeholder="Repite la contraseña"/>
          </div>
          <SuccessMsg msg={success} />
          <ErrorMsg msg={error} />
          <SubmitBtn loading={loading} label="Restablecer contraseña" />
        </form>
      </div>
    </>
  );
}

// ── Componente raíz ───────────────────────────────────────────────────────────
export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('credentials');
  const [sessionId, setSessionId] = useState('');
  const [mfaEmail, setMfaEmail] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');

  const handleCredentialsSuccess = (sid: string, email: string) => {
    setSessionId(sid);
    setMfaEmail(email);
    setView('verify-code');
  };

  const handleVerifySuccess = (token: string) => {
    const payload = decodeJwt(token);
    if (payload?.role !== 'superadmin') return;
    localStorage.setItem('sa_token', token);
    navigate('/superadmin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        {view === 'credentials' && (
          <CredentialsView
            onSuccess={handleCredentialsSuccess}
            onForgot={() => setView('forgot-request')}
          />
        )}

        {view === 'verify-code' && (
          <VerifyCodeView
            sessionId={sessionId}
            email={mfaEmail}
            onSuccess={handleVerifySuccess}
            onBack={() => setView('credentials')}
          />
        )}

        {view === 'forgot-request' && (
          <ForgotRequestView
            onCodeSent={(email) => { setForgotEmail(email); setView('forgot-reset'); }}
            onBack={() => setView('credentials')}
          />
        )}

        {view === 'forgot-reset' && (
          <ForgotResetView
            email={forgotEmail}
            onSuccess={() => setView('credentials')}
          />
        )}

        <p className="text-center text-slate-500 text-xs mt-6">
          Acceso exclusivo para administradores del sistema
        </p>
      </div>
    </div>
  );
}
