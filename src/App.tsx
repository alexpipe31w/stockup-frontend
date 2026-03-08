import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AiConfig from './pages/AiConfig';
import Conversations from './pages/Conversations';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Campaigns from './pages/Campaigns';
import Analytics from './pages/Analytics';
import Services from './pages/Services';
import Users from './pages/Users';
import WhatsAppPage from './pages/WhatsApp';
import Blocked from './pages/Blocked';

function PrivateRoute({ children }: { children: React.ReactElement }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactElement }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" />;
  if (user?.role !== 'admin' && user?.role !== 'superadmin') return <Navigate to="/dashboard" />;
  return children;
}

function Layout({ children }: { children: React.ReactElement }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const navItems = [
    {
      to: '/dashboard', label: 'Dashboard',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    },
    {
      to: '/whatsapp', label: 'WhatsApp',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.22 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
    },
    {
      to: '/conversations', label: 'Conversaciones',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
    },
    {
      to: '/customers', label: 'Clientes',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
    },
    {
      to: '/orders', label: 'Órdenes',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
    },
    {
      to: '/products', label: 'Productos',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
    },
    {
      to: '/services', label: 'Servicios',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
    },
    {
      to: '/campaigns', label: 'Campañas',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.22 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.56-.56a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
    },
    {
      to: '/analytics', label: 'Analíticas',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    },
    {
      to: '/blocked', label: 'Excluidos',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
    },
    {
      to: '/ai-config', label: 'Configurar IA',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 010 2h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 010-2h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/></svg>
    },
  ];

  const adminNavItems = [
    {
      to: '/users', label: 'Usuarios',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
    },
  ];

  const allNavItems = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col shadow-sm flex-shrink-0">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2563eb, #9333ea)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="white"/>
            </svg>
          </div>
          <span className="font-bold text-slate-800">Stockup Messages</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {allNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive ? 'text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
              style={({ isActive }) =>
                isActive ? { background: 'linear-gradient(135deg, #2563eb, #9333ea)' } : {}
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-100">
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-500 transition w-full"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/whatsapp" element={<PrivateRoute><Layout><WhatsAppPage /></Layout></PrivateRoute>} />
          <Route path="/conversations" element={<PrivateRoute><Layout><Conversations /></Layout></PrivateRoute>} />
          <Route path="/customers" element={<PrivateRoute><Layout><Customers /></Layout></PrivateRoute>} />
          <Route path="/orders" element={<PrivateRoute><Layout><Orders /></Layout></PrivateRoute>} />
          <Route path="/products" element={<PrivateRoute><Layout><Products /></Layout></PrivateRoute>} />
          <Route path="/services" element={<PrivateRoute><Layout><Services /></Layout></PrivateRoute>} />
          <Route path="/campaigns" element={<PrivateRoute><Layout><Campaigns /></Layout></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><Layout><Analytics /></Layout></PrivateRoute>} />
          <Route path="/blocked" element={<PrivateRoute><Layout><Blocked /></Layout></PrivateRoute>} />
          <Route path="/users" element={<AdminRoute><Layout><Users /></Layout></AdminRoute>} />
          <Route path="/ai-config" element={<PrivateRoute><Layout><AiConfig /></Layout></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
