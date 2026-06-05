import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingBag, Briefcase, Users, BarChart3, Settings,
  ChevronRight, Smartphone, ShoppingCart, LogOut, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const moreItems = [
  { to: '/whatsapp',   label: 'WhatsApp',      icon: Smartphone,   desc: 'Conectar dispositivo' },
  { to: '/products',   label: 'Productos',     icon: ShoppingBag,  desc: 'Catálogo y stock' },
  { to: '/services',   label: 'Servicios',     icon: Briefcase,    desc: 'Servicios del negocio' },
  { to: '/orders',        label: 'Ventas Productos',   icon: ShoppingCart,  desc: 'Ordenes de productos' },
  { to: '/service-orders',label: 'Ventas Servicios',   icon: ClipboardList, desc: 'Citas cobradas / servicios' },
  { to: '/customers',  label: 'Clientes',      icon: Users,        desc: 'Base de clientes' },
  { to: '/analytics',  label: 'Analíticas',    icon: BarChart3,    desc: 'Reportes y asesor IA' },
  { to: '/config',     label: 'Configuración', icon: Settings,     desc: 'Ajustes del negocio' },
];

export default function More() {
  const { user, logout } = useAuth() as any;
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24 md:pb-6">
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-4">
        <h1 className="text-xl md:text-2xl font-bold text-txt-primary">Más opciones</h1>
      </div>

      {user && (
        <div className="px-4 md:px-6 mb-4">
          <div className="bg-surface border border-border-subtle rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center text-txt-inverse font-bold text-lg flex-shrink-0">
              {(user.name || user.email || 'U')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-txt-primary">{user.name || user.email}</p>
              <p className="text-xs text-txt-tertiary">{user.storeName || user.role}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 md:px-6 space-y-2">
        {moreItems.map((item, idx) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.2 }}
          >
            <NavLink
              to={item.to}
              className="flex items-center gap-4 px-4 py-3.5 bg-surface border border-border-subtle rounded-2xl hover:border-border-default transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center flex-shrink-0 group-hover:bg-lime/10 transition">
                <item.icon size={20} className="text-txt-tertiary group-hover:text-lime transition" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-txt-primary">{item.label}</p>
                <p className="text-xs text-txt-tertiary">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-txt-tertiary flex-shrink-0" />
            </NavLink>
          </motion.div>
        ))}

        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: moreItems.length * 0.04, duration: 0.2 }}
          onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center gap-4 px-4 py-3.5 bg-surface border border-border-subtle rounded-2xl hover:border-error/40 hover:bg-error/5 transition w-full group"
        >
          <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center flex-shrink-0 group-hover:bg-error/10 transition">
            <LogOut size={20} className="text-txt-tertiary group-hover:text-error transition" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-txt-primary group-hover:text-error transition">Cerrar sesión</p>
          </div>
        </motion.button>
      </div>
    </div>
  );
}
