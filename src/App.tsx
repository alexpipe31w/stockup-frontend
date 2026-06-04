import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SubscriptionProvider, useSubscription } from './hooks/useSubscription';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Campaigns from './pages/Campaigns';
import Analytics from './pages/Analytics';
import Services from './pages/Services';
import Users from './pages/Users';
import WhatsAppPage from './pages/WhatsApp';
import Appointments from './pages/Appointments';
import Config from './pages/Config';
import SuperAdminLogin from './pages/SuperAdminLogin';
import SuperAdmin from './pages/SuperAdmin';
import Register from './pages/Register';
import Subscription from './pages/Subscription';
import PaymentStatus from './pages/PaymentStatus';
import More from './pages/More';
import ServiceOrders from './pages/ServiceOrders';

function PageWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
        className="flex-1 min-w-0 overflow-y-auto pb-16 md:pb-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function Layout({ children }: { children: React.ReactElement }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <PageWrapper>{children}</PageWrapper>
        <BottomNav />
      </div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactElement }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function SubscribedRoute({ children }: { children: React.ReactElement }) {
  const { token } = useAuth();
  const { isActive, loading, error, refresh } = useSubscription();

  if (!token) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-canvas">
        <div className="w-8 h-8 rounded-full border-2 border-lime border-t-transparent animate-spin-loader" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-canvas gap-4">
        <p className="text-txt-secondary font-medium">No pudimos verificar tu suscripción</p>
        <button
          onClick={refresh}
          className="px-5 py-2.5 rounded-xl gradient-brand text-txt-inverse text-sm font-semibold"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!isActive) return <Navigate to="/subscription" replace />;
  return children;
}

function AdminRoute({ children }: { children: React.ReactElement }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if ((user as any)?.role !== 'superadmin') return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"            element={<Login />} />
            <Route path="/register"         element={<Register />} />
            <Route path="/payment-status"   element={<PrivateRoute><PaymentStatus /></PrivateRoute>} />
            <Route path="/subscription"     element={<PrivateRoute><Layout><Subscription /></Layout></PrivateRoute>} />
            <Route path="/dashboard"        element={<SubscribedRoute><Layout><Dashboard /></Layout></SubscribedRoute>} />
            <Route path="/whatsapp"         element={<SubscribedRoute><Layout><WhatsAppPage /></Layout></SubscribedRoute>} />
            <Route path="/conversations"    element={<SubscribedRoute><Layout><Conversations /></Layout></SubscribedRoute>} />
            <Route path="/customers"        element={<SubscribedRoute><Layout><Customers /></Layout></SubscribedRoute>} />
            <Route path="/orders"           element={<SubscribedRoute><Layout><Orders /></Layout></SubscribedRoute>} />
            <Route path="/products"         element={<SubscribedRoute><Layout><Products /></Layout></SubscribedRoute>} />
            <Route path="/services"         element={<SubscribedRoute><Layout><Services /></Layout></SubscribedRoute>} />
            <Route path="/appointments"     element={<SubscribedRoute><Layout><Appointments /></Layout></SubscribedRoute>} />
            <Route path="/campaigns"        element={<SubscribedRoute><Layout><Campaigns /></Layout></SubscribedRoute>} />
            <Route path="/analytics"        element={<SubscribedRoute><Layout><Analytics /></Layout></SubscribedRoute>} />
            <Route path="/config"           element={<SubscribedRoute><Layout><Config /></Layout></SubscribedRoute>} />
            <Route path="/more"             element={<SubscribedRoute><Layout><More /></Layout></SubscribedRoute>} />
            <Route path="/service-orders"  element={<SubscribedRoute><Layout><ServiceOrders /></Layout></SubscribedRoute>} />
            <Route path="/users"            element={<AdminRoute><Layout><Users /></Layout></AdminRoute>} />
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route path="/superadmin"       element={<SuperAdmin />} />
            <Route path="*"                element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
