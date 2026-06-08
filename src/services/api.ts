import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Limpiar sesión y redirigir — solo si no estamos ya en login/register
      const isAuthPage = ['/login', '/register', '/superadmin/login'].some(
        p => window.location.pathname.startsWith(p),
      );
      if (!isAuthPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Usar replace para no dejar /login en el historial si el usuario vuelve atrás
        window.location.replace('/login');
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const registerUser = (data: {
  name: string; email: string; password: string;
  storeName?: string; storePhone?: string;
}) => api.post('/auth/register', data);

// ── Users ─────────────────────────────────────────────────────────────────
export const getUsers = () => api.get('/auth/users');
export const deleteUser = (id: string) => api.delete(`/auth/users/${id}`);

// ── Dashboard ─────────────────────────────────────────────────────────────
export const getDashboard = (storeId: string) => api.get(`/dashboard/${storeId}`);

// ── Conversations ─────────────────────────────────────────────────────────
export const getConversations = (storeId: string) =>
  api.get(`/conversations/store/${storeId}`);

export const getConversation = (id: string) =>
  api.get(`/conversations/${id}`);

export const getPendingHuman = (storeId: string) =>
  api.get(`/conversations/store/${storeId}`);

export const takeoverConversation = (id: string) =>
  api.patch(`/conversations/${id}/takeover`);

export const releaseConversation = (id: string) =>
  api.patch(`/conversations/${id}/release`);

export const closeConversation = (id: string) =>
  api.patch(`/conversations/${id}/close`);

export const deleteConversation = (id: string) =>
  api.delete(`/conversations/${id}`);

// ── Messages ──────────────────────────────────────────────────────────────
export const getMessages = (conversationId: string) =>
  api.get(`/messages/conversation/${conversationId}`);

export const sendMessage = (data: {
  conversationId: string;
  content: string;
  type?: 'text' | 'image' | 'audio';
  sender?: 'store' | 'customer';
  isAiResponse?: boolean;
}) => api.post('/messages', data);

// ── Categories ────────────────────────────────────────────────────────────
export const getCategories = () =>
  api.get('/products/categories');

export const createCategory = (name: string) =>
  api.post('/products/categories', { name });

export const deleteCategory = (categoryId: string) =>
  api.delete(`/products/categories/${categoryId}`);

// ── Products ──────────────────────────────────────────────────────────────
export const getProducts = () =>
  api.get('/products');

export const createProduct = (data: {
  name: string;
  sku?: string;
  categoryId?: string;
  salePrice: number;
  costPrice?: number;
  stock?: number;
  hasVariants?: boolean;
  description?: string;
  imageUrl?: string;
  hasShipping?: boolean;
  weight?: number;
  shippingStandard?: number;
  shippingExpress?: number;
  variants?: VariantPayload[];
}) => api.post('/products', data);

export const updateProduct = (id: string, data: {
  name?: string;
  sku?: string;
  categoryId?: string;
  salePrice?: number;
  costPrice?: number;
  stock?: number;
  hasVariants?: boolean;
  description?: string;
  imageUrl?: string;
  hasShipping?: boolean;
  weight?: number;
  shippingStandard?: number;
  shippingExpress?: number;
  isActive?: boolean;
  variants?: VariantUpdatePayload[];
}) => api.patch(`/products/${id}`, data);

export const deleteProduct = (id: string) => api.delete(`/products/${id}`);

// ── Variantes de producto ─────────────────────────────────────────────────
export interface VariantPayload {
  name: string;
  sku?: string;
  salePrice?: number;
  costPrice?: number;
  stock?: number;
  attributes?: Record<string, string>;
  imageUrl?: string;
  weight?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface VariantUpdatePayload extends VariantPayload {
  variantId?: string;
}

export const addVariant = (productId: string, data: VariantPayload) =>
  api.post(`/products/${productId}/variants`, data);

export const updateVariant = (variantId: string, data: Partial<VariantUpdatePayload>) =>
  api.patch(`/products/variants/${variantId}`, data);

export const deleteVariant = (variantId: string) =>
  api.delete(`/products/variants/${variantId}`);

// ── Services ──────────────────────────────────────────────────────────────
export type PriceType = 'FIXED' | 'PER_HOUR' | 'PER_DAY' | 'PER_UNIT' | 'VARIABLE';

export interface ServiceVariantPayload {
  variantId?: string;
  name: string;
  description?: string;
  priceOverride?: number;
  priceModifier?: number;
  estimatedMinutes?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export const getServices = () =>
  api.get('/services');

export const createService = (data: {
  name: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  priceType?: PriceType;
  basePrice?: number;
  minPrice?: number;
  maxPrice?: number;
  costPrice?: number;
  unitLabel?: string;
  hasVariants?: boolean;
  estimatedMinutes?: number;
  customFields?: Record<string, any>;
  variants?: ServiceVariantPayload[];
}) => api.post('/services', data);

export const updateService = (id: string, data: {
  name?: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  priceType?: PriceType;
  basePrice?: number;
  minPrice?: number;
  maxPrice?: number;
  costPrice?: number;
  unitLabel?: string;
  hasVariants?: boolean;
  estimatedMinutes?: number;
  customFields?: Record<string, any>;
  isActive?: boolean;
  variants?: ServiceVariantPayload[];
}) => api.patch(`/services/${id}`, data);

export const deleteService = (id: string) => api.delete(`/services/${id}`);

export const addServiceVariant = (serviceId: string, data: ServiceVariantPayload) =>
  api.post(`/services/${serviceId}/variants`, data);

export const updateServiceVariant = (variantId: string, data: Partial<ServiceVariantPayload>) =>
  api.patch(`/services/variants/${variantId}`, data);

export const deleteServiceVariant = (variantId: string) =>
  api.delete(`/services/variants/${variantId}`);

// ── Orders ────────────────────────────────────────────────────────────────
export const getOrders = (storeId: string) =>
  api.get(`/orders/store/${storeId}`);

export const getServiceOrders = (storeId: string) =>
  api.get(`/orders/store/${storeId}?type=service`);

export const updateOrderStatus = (id: string, status: string) =>
  api.patch(`/orders/${id}/status`, { status });

export const createManualOrder = (data: {
  customerId: string;
  items: { productId?: string; serviceId?: string; variantId?: string; description?: string; quantity: number; unitPrice: number }[];
  notes?: string;
  deliveryAddress?: string;
  discountPercent?: number;
  manualPaymentMethod?: string;
  idempotencyKey?: string;
  type?: string;
}) => api.post('/orders/manual', data);

// ── Customers ─────────────────────────────────────────────────────────────
export const getCustomers = (storeId: string) =>
  api.get(`/customers/store/${storeId}`);

export const getCustomer = (id: string) =>
  api.get(`/customers/${id}`);

export const updateCustomer = (id: string, data: { name?: string; city?: string; cedula?: string; acceptsMarketing?: boolean }) =>
  api.patch(`/customers/${id}`, data);

export const createCustomer = (data: { phone: string; name?: string }) =>
  api.post('/customers', data);

// ── Analytics ─────────────────────────────────────────────────────────────
export const getRevenueTrends = (days = 30) =>
  api.get(`/analytics/trends?days=${days}`);

export const getConversationInsights = () =>
  api.post('/analytics/conversation-insights', {});

export const getAnalyticsSummary = (period: string) =>
  api.get('/analytics/summary', { params: { period } });

export const getAnalyticsInsights = (period: string) =>
  api.get('/analytics/insights', { params: { period } });

// ── Campaigns ─────────────────────────────────────────────────────────────
export const getCampaigns = (storeId: string) =>
  api.get(`/campaigns/store/${storeId}`);

export const createCampaign = (data: {
  name: string; message: string; scheduledAt?: string;
}) => api.post('/campaigns', data);

export const sendCampaign = (id: string) =>
  api.post(`/campaigns/${id}/send`);

// ── Appointments ──────────────────────────────────────────────────────────
export const getAppointments = (params?: {
  status?: string;
  type?: string;
  from?: string;
  to?: string;
  serviceId?: string;
  priority?: string;
  staffId?: string;
}) => api.get('/appointments', { params });

export const getAppointmentStats = () =>
  api.get('/appointments/stats');

export const getAppointment = (id: string) =>
  api.get(`/appointments/${id}`);

export const getAppointmentTimeline = (id: string) =>
  api.get(`/appointments/${id}/timeline`);

export const createAppointment = (data: {
  customerId: string;
  serviceId?: string;
  serviceVariantId?: string;
  staffId?: string;
  type?: string;
  priority?: string;
  source?: string;
  scheduledAt: string;
  endsAt?: string;
  durationMinutes?: number;
  description?: string;
  address?: string;
  notes?: string;
  internalNotes?: string;
  agreedPrice?: number;
  forceSchedule?: boolean;
}) => api.post('/appointments', data);

export const updateAppointment = (id: string, data: Record<string, any>) =>
  api.patch(`/appointments/${id}`, data);

export const deleteAppointment = (id: string) =>
  api.delete(`/appointments/${id}`);

// ── Public (no auth needed) ───────────────────────────────────────────────────
export const getPublicStore = (slug: string) =>
  api.get(`/public/${slug}`);

export const getPublicAvailability = (slug: string, date: string) =>
  api.get(`/public/${slug}/availability`, { params: { date } });

export const bookPublicAppointment = (slug: string, data: {
  customerName: string;
  customerPhone: string;
  serviceId?: string;
  serviceVariantId?: string;
  staffId?: string;
  scheduledAt: string;
  notes?: string;
}) => api.post(`/public/${slug}/book`, data);

// ── Staff ─────────────────────────────────────────────────────────────────────
export const getStaff = () =>
  api.get('/staff');

export const createStaff = (data: { name: string; schedule?: Record<string, any> | null }) =>
  api.post('/staff', data);

export const updateStaff = (id: string, data: { name?: string; isActive?: boolean; schedule?: Record<string, any> | null }) =>
  api.patch(`/staff/${id}`, data);

export const deleteStaff = (id: string) =>
  api.delete(`/staff/${id}`);

export const getDailyReports = (limit = 30) =>
  api.get(`/reports/daily?limit=${limit}`);

export const generateReport = () =>
  api.post('/reports/generate');

// ── WhatsApp ──────────────────────────────────────────────────────────────
export const connectWhatsApp = (storeId: string) =>
  api.post(`/whatsapp/connect/${storeId}`);

export const getWhatsAppQR = (storeId: string) =>
  api.get(`/whatsapp/qr/${storeId}`);

export const getWhatsAppStatus = (storeId: string) =>
  api.get(`/whatsapp/status/${storeId}`);

export const disconnectWhatsApp = (storeId: string) =>
  api.delete(`/whatsapp/disconnect/${storeId}`);

// ── Store Theme ───────────────────────────────────────────────────────────
export const getStoreTheme = (storeId: string) =>
  api.get(`/stores/${storeId}/theme`);

export const updateStoreTheme = (storeId: string, data: {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}) => api.patch(`/stores/${storeId}/theme`, data);

export const getStore    = (storeId: string) =>
  api.get(`/stores/${storeId}`);

export const updateStore = (storeId: string, data: Record<string, any>) =>
  api.patch(`/stores/${storeId}`, data);

// ── AI Config ─────────────────────────────────────────────────────────────
export const getAiConfig = (storeId: string) =>
  api.get(`/ai-config/${storeId}`);

export const saveAiConfig = (data: {
  aiProvider: string; apiKey: string; systemPrompt: string;
  model?: string; temperature?: number; maxTokens?: number;
  cartridges?: Array<{ provider: string; apiKey: string; model: string }>;
}) => api.post('/ai-config', data);

export const getAiPoolStatus = () =>
  api.get('/ai-config/pool-status');

// ── Blocked Contacts ──────────────────────────────────────────────────────
export const getBlockedContacts = () =>
  api.get('/blocked');

export const blockContact = (data: { phone: string; label?: string }) =>
  api.post('/blocked', data);

export const unblockContact = (id: string) =>
  api.delete(`/blocked/${id}`);

// ── SuperAdmin ─────────────────────────────────────────────────────────────
// Usa sa_token separado del token de usuario normal
function saHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('sa_token') ?? ''}` };
}

export const superAdminLogin = (email: string, password: string) =>
  api.post('/superadmin/login', { email, password });

export const getSuperAdminDashboard = () =>
  api.get('/superadmin/dashboard', { headers: saHeaders() });

export const getSuperAdminStores = () =>
  api.get('/superadmin/stores', { headers: saHeaders() });

export const toggleSuperAdminStore = (storeId: string) =>
  api.patch(`/superadmin/stores/${storeId}/toggle`, {}, { headers: saHeaders() });

export const getSuperAdminUsers = () =>
  api.get('/superadmin/users', { headers: saHeaders() });

export const toggleSuperAdminUser = (userId: string) =>
  api.patch(`/superadmin/users/${userId}/toggle`, {}, { headers: saHeaders() });

export const deleteSuperAdminUser = (userId: string) =>
  api.delete(`/superadmin/users/${userId}`, { headers: saHeaders() });

export const getSuperAdminAudit = () =>
  api.get('/superadmin/audit', { headers: saHeaders() });

export const getSuperAdminSubscriptionConfig = () =>
  api.get('/superadmin/subscription-config', { headers: saHeaders() });

export const updateSuperAdminSubscriptionConfig = (priceAmount: number) =>
  api.patch('/superadmin/subscription-config', { priceAmount }, { headers: saHeaders() });

export const getSuperAdminSubscriptions = () =>
  api.get('/superadmin/subscriptions', { headers: saHeaders() });

// ── Subscriptions (usuario) ────────────────────────────────────────────────
export const getMySubscription = () =>
  api.get('/subscriptions/my');

export const createCheckout = () =>
  api.post('/subscriptions/checkout', {});

export const processPaymentManually = (paymentId: string) =>
  api.post(`/subscriptions/process-payment/${paymentId}`, {});