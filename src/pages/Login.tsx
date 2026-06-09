import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AuthGridBg from '../components/AuthGridBg';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Login() {
  const { loginFn } = useAuth() as any;
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userData = await loginFn(email, password);
      navigate(userData.role === 'superadmin' ? '/superadmin' : '/dashboard');
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError('Correo o contraseña incorrectos');
      } else {
        setError('No se pudo conectar al servidor. Verifica tu conexión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: '#0A0A0F' }}>
      <AuthGridBg />

      {/* Panel izquierdo — solo desktop */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative z-10 border-r border-white/5">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#D4FF00' }}>
            <span className="font-black text-base" style={{ color: '#0A0A0F' }}>S</span>
          </div>
          <span className="text-white font-bold text-lg">Stockup Messages</span>
        </div>

        {/* Marketing copy */}
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Gestiona tu negocio<br />desde WhatsApp
          </h2>
          <p className="text-white/50 text-lg max-w-md">
            CRM inteligente con IA para cualquier negocio. Automatiza respuestas, gestiona citas y crece.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            {['IA 24/7', 'WhatsApp CRM', 'Citas', 'Campañas', 'Pedidos'].map((tag) => (
              <span
                key={tag}
                className="px-4 py-2 rounded-xl text-sm font-medium border"
                style={{ background: 'rgba(212,255,0,0.05)', borderColor: 'rgba(212,255,0,0.2)', color: 'rgba(212,255,0,0.8)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <p className="text-white/25 text-sm">&copy; 2026 Stockup Messages</p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          className="w-full max-w-sm"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo mobile */}
          <motion.div variants={itemVariants} className="lg:hidden flex items-center gap-2.5 justify-center mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#D4FF00' }}>
              <span className="font-black text-sm" style={{ color: '#0A0A0F' }}>S</span>
            </div>
            <span className="text-white font-bold text-base">Stockup Messages</span>
          </motion.div>

          {/* Card */}
          <div className="rounded-2xl border p-8" style={{ background: 'rgba(17,17,23,0.85)', borderColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}>
            <motion.h1 variants={itemVariants} className="text-2xl font-bold text-white mb-1">
              Bienvenido
            </motion.h1>
            <motion.p variants={itemVariants} className="text-white/50 text-sm mb-7">
              Ingresa tus credenciales para continuar.{' '}
              <Link to="/register" className="hover:underline font-medium transition" style={{ color: '#D4FF00' }}>
                Crear cuenta
              </Link>
            </motion.p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div variants={itemVariants}>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@tutienda.com"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'white',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(212,255,0,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-11 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'white',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(212,255,0,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </motion.div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm px-3.5 py-2.5 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                variants={itemVariants}
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #D4FF00, #A3CC00)', color: '#0A0A0F' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  'Ingresar al panel'
                )}
              </motion.button>
            </form>
          </div>

          <motion.p variants={itemVariants} className="text-center text-sm mt-6" style={{ color: 'rgba(255,255,255,0.2)' }}>
            &copy; 2026 Stockup Messages
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
