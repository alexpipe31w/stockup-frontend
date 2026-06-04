import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Logo';

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
    <div className="min-h-screen bg-canvas flex">
      {/* Panel izquierdo — solo desktop */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden border-r border-border-subtle">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(212,255,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(212,255,0,0.05) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10">
          <Logo size={48} />
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-txt-primary leading-tight mb-4">
            Gestiona tu negocio<br />desde WhatsApp
          </h2>
          <p className="text-txt-secondary text-lg max-w-md">
            CRM inteligente con IA para barberos, salones y tiendas. Automatiza respuestas, gestiona citas y crece tu negocio.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            {['IA 24/7', 'WhatsApp CRM', 'Citas', 'Campañas'].map((tag) => (
              <span key={tag} className="px-4 py-2 rounded-xl bg-surface border border-border-subtle text-sm text-txt-secondary">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-txt-tertiary text-sm">&copy; 2026 Stockup Messages</p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-6 bg-canvas">
        <motion.div
          className="w-full max-w-sm"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="lg:hidden flex justify-center mb-8">
            <Logo size={64} />
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-2xl font-bold text-txt-primary mb-1">
            Bienvenido
          </motion.h1>
          <motion.p variants={itemVariants} className="text-txt-secondary text-sm mb-8">
            Ingresa tus credenciales para continuar.{' '}
            <Link to="/register" className="text-lime hover:text-lime-hover transition-colors">
              Crear cuenta
            </Link>
          </motion.p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-txt-secondary mb-2">Correo electrónico</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-txt-tertiary" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tutienda.com"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border-default text-txt-primary placeholder:text-txt-tertiary text-sm focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/10 transition-all"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-txt-secondary mb-2">Contraseña</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-txt-tertiary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-11 py-3 rounded-xl bg-surface border border-border-default text-txt-primary placeholder:text-txt-tertiary text-sm focus:outline-none focus:border-lime focus:ring-2 focus:ring-lime/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-txt-tertiary hover:text-txt-secondary transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </motion.div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-error text-sm"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              variants={itemVariants}
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-brand text-txt-inverse font-semibold text-sm transition-all hover:shadow-accent-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar al panel'
              )}
            </motion.button>
          </form>

          <motion.p variants={itemVariants} className="text-center text-txt-tertiary text-sm mt-6">
            &copy; 2026 Stockup Messages
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
