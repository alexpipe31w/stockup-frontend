import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, MessageSquare, CalendarDays, Zap, ShoppingBag,
  Scissors, Users, BarChart3, Settings, ChevronLeft, ChevronRight,
  LogOut, Smartphone, ShoppingCart, UserCog, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Logo from './Logo';

const navItems = [
  { to: '/dashboard',     label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/whatsapp',      label: 'WhatsApp',         icon: Smartphone },
  { to: '/conversations', label: 'Conversaciones',   icon: MessageSquare },
  { to: '/appointments',  label: 'Citas',            icon: CalendarDays },
  { to: '/campaigns',     label: 'Campañas',         icon: Zap },
  { to: '/products',      label: 'Productos',        icon: ShoppingBag },
  { to: '/services',      label: 'Servicios',        icon: Scissors },
  { to: '/orders',         label: 'Ventas Productos',  icon: ShoppingCart },
  { to: '/service-orders', label: 'Ventas Servicios',  icon: ClipboardList },
  { to: '/customers',     label: 'Clientes',         icon: Users },
  { to: '/analytics',     label: 'Analíticas',       icon: BarChart3 },
  { to: '/config',        label: 'Configuración',    icon: Settings },
];

const adminItems = [
  { to: '/users', label: 'Usuarios', icon: UserCog },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth() as any;
  const location = useLocation();
  const navigate = useNavigate();

  const items = user?.role === 'superadmin' ? [...navItems, ...adminItems] : navItems;

  return (
    <aside
      className="hidden md:flex flex-col h-screen bg-surface border-r border-border-subtle flex-shrink-0 transition-all duration-300 z-40"
      style={{ width: collapsed ? 72 : 260 }}
    >
      <div className="flex items-center h-16 px-4 border-b border-border-subtle flex-shrink-0">
        <Logo size={collapsed ? 36 : 32} showText={!collapsed} />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
        {items.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group"
              style={{ background: isActive ? 'rgba(212, 255, 0, 0.08)' : 'transparent' }}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-lime"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon
                size={20}
                strokeWidth={isActive ? 2 : 1.5}
                className={isActive ? 'text-lime' : 'text-txt-tertiary group-hover:text-txt-primary transition-colors'}
              />
              {!collapsed && (
                <span className={`text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive ? 'text-lime' : 'text-txt-secondary group-hover:text-txt-primary'
                }`}>
                  {item.label}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border-subtle space-y-1 flex-shrink-0">
        {user && !collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-elevated">
            <div className="w-8 h-8 rounded-full bg-info flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(user.name || user.email || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className="text-sm font-medium text-txt-primary truncate">{user.name || user.email}</p>
              <p className="text-xs text-txt-tertiary truncate">{user.storeName || user.role}</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-txt-tertiary hover:text-txt-primary hover:bg-surface-elevated transition w-full"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!collapsed && <span className="text-sm">Colapsar</span>}
        </button>

        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-txt-tertiary hover:text-error hover:bg-error/10 transition w-full"
        >
          <LogOut size={20} />
          {!collapsed && <span className="text-sm">Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
