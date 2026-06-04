import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, MessageSquare, CalendarDays, Zap, MoreHorizontal } from 'lucide-react';

const tabs = [
  { to: '/dashboard',     label: 'Inicio',    icon: LayoutDashboard },
  { to: '/conversations', label: 'Chat',       icon: MessageSquare },
  { to: '/appointments',  label: 'Citas',      icon: CalendarDays },
  { to: '/campaigns',     label: 'Masivo',     icon: Zap },
  { to: '/more',          label: 'Más',        icon: MoreHorizontal },
];

const moreRoutes = ['/products', '/services', '/customers', '/analytics', '/config', '/orders', '/service-orders', '/whatsapp', '/users'];

export default function BottomNav() {
  const location = useLocation();
  const noNavRoutes = ['/login', '/register', '/superadmin', '/payment-status', '/subscription'];
  if (noNavRoutes.some(r => location.pathname.startsWith(r))) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-xl border-t border-border-subtle pb-safe">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = tab.to === '/more'
            ? location.pathname === '/more' || moreRoutes.some(r => location.pathname.startsWith(r))
            : location.pathname === tab.to;

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-full relative"
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-dot"
                  className="absolute -top-px w-6 h-0.5 rounded-full bg-lime"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 ${
                isActive ? 'bg-lime/10' : ''
              }`}>
                <tab.icon
                  size={22}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={isActive ? 'text-lime' : 'text-txt-tertiary'}
                />
              </div>
              <span className={`text-[11px] font-semibold tracking-wide ${
                isActive ? 'text-lime' : 'text-txt-tertiary'
              }`}>
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
