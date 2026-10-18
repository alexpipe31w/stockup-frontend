import axios, { AxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  // La sesión larga es una cookie httpOnly de la API (bloque 2f-2): sin esto el navegador
  // ni la guarda en el login ni la manda al renovar.
  withCredentials: true,
});

export const READ_ONLY_EVENT = 'stockup:read-only';
/** La sesión murió (refresh rechazado o logout en otra pestaña): useAuth limpia el estado. */
export const SESSION_ENDED_EVENT = 'stockup:session-ended';

// ── Sesión ────────────────────────────────────────────────────────────────
// El access token vive solo en memoria (dura 15 min). Al recargar, se pide otro con la cookie.
// En localStorage solo queda una marca "hay sesión" para no llamar a /refresh en cada visita
// a la tienda pública o al calendario.

type Scope = 'store' | 'sa';
const tokens: Record<Scope, string | null> = { store: null, sa: null };
const timers: Record<Scope, ReturnType<typeof setTimeout> | undefined> = { store: undefined, sa: undefined };
const HINT: Record<Scope, string> = { store: 'stockup:session', sa: 'stockup:sa-session' };
const REFRESH_PATH: Record<Scope, string> = { store: '/auth/refresh', sa: '/superadmin/refresh' };
const LOGOUT_PATH: Record<Scope, string> = { store: '/auth/logout', sa: '/superadmin/logout' };
// Los endpoints de la cookie exigen esta cabecera (anti-CSRF, ver RefreshCsrfGuard en la API).
const CSRF_HEADERS = { 'X-Requested-With': 'stockup' };

// Tokens de antes de 2f-2: ya no valen (la API subió token_version) y no deben quedar ahí.
try {
  ['token', 'user', 'sa_token'].forEach((k) => localStorage.removeItem(k));
} catch {}

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('stockup-auth') : null;

function hasHint(scope: Scope): boolean {
  try { return localStorage.getItem(HINT[scope]) === '1'; } catch { return false; }
}
function setHint(scope: Scope, on: boolean) {
  try {
    if (on) localStorage.setItem(HINT[scope], '1');
    else localStorage.removeItem(HINT[scope]);
  } catch {}
}

function jwtExp(token: string): number | null {
  try {
    const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof p.exp === 'number' ? p.exp * 1000 : null;
  } catch {
    return null;
  }
}

export const getAccessToken = (scope: Scope = 'store') => tokens[scope];

/** Guarda el access en memoria y programa su renovación 3 min antes de que caduque. */
export function setAccessToken(token: string | null, scope: Scope = 'store') {
  tokens[scope] = token;
  clearTimeout(timers[scope]);
  if (!token) return;
  setHint(scope, true);
  const exp = jwtExp(token);
  if (exp) {
    const ms = Math.max(exp - Date.now() - 3 * 60_000, 30_000);
    timers[scope] = setTimeout(() => { refreshAccessToken(scope).catch(() => {}); }, ms);
  }
}

function endSession(scope: Scope, broadcast: boolean) {
  setAccessToken(null, scope);
  setHint(scope, false);
  if (broadcast) channel?.postMessage({ type: 'logout', scope });
  window.dispatchEvent(new CustomEvent(SESSION_ENDED_EVENT, { detail: scope }));
}

// Cerrar sesión en una pestaña la cierra en las demás.
channel?.addEventListener('message', (e: MessageEvent) => {
  if (e.data?.type === 'logout' && (e.data.scope === 'store' || e.data.scope === 'sa')) {
    endSession(e.data.scope, false);
  }
});

const inFlight: Record<Scope, Promise<string | null> | null> = { store: null, sa: null };

/**
 * Pide un access nuevo con la cookie. Uno solo en vuelo por pestaña: las peticiones que
 * llegan mientras tanto esperan el mismo. null = la sesión ya no vale; si la red falla,
 * rechaza (no se cierra la sesión por un corte).
 */
export function refreshAccessToken(scope: Scope = 'store'): Promise<string | null> {
  if (!inFlight[scope]) {
    inFlight[scope] = api
      .post(REFRESH_PATH[scope], null, { headers: CSRF_HEADERS, _noRefresh: true } as AxiosRequestConfig)
      .then((res) => {
        const t: string = res.data.access_token;
        setAccessToken(t, scope);
        return t;
      })
      .catch((err) => {
        if (err.response && [401, 403].includes(err.response.status)) {
          endSession(scope, false);
          return null;
        }
        throw err;
      })
      .finally(() => { inFlight[scope] = null; });
  }
  return inFlight[scope]!;
}

/** Al abrir el panel: si había sesión, recupera el access con la cookie. */
export async function restoreSession(scope: Scope = 'store'): Promise<string | null> {
  if (tokens[scope]) return tokens[scope];
  if (!hasHint(scope)) return null;
  try {
    return await refreshAccessToken(scope);
  } catch {
    return null;
  }
}

/** Cierra la sesión en la API (revoca la cookie) y en todas las pestañas. */
export async function logoutSession(scope: Scope = 'store'): Promise<void> {
  // El access no hace falta para cerrar (va la cookie): se suelta ya.
  setAccessToken(null, scope);
  try {
    await api.post(LOGOUT_PATH[scope], null, { headers: CSRF_HEADERS, _noRefresh: true } as AxiosRequestConfig);
  } catch {
    // Sin red la cookie sigue viva hasta caducar, pero aquí la sesión se cierra igual.
  }
  endSession(scope, true);
}

const scopeOf = (url?: string): Scope => (url?.startsWith('/superadmin') ? 'sa' : 'store');

// Endpoints sin sesión: su 401 es "credenciales o código malos", no un access caducado.
const PUBLIC_AUTH = new Set([
  '/auth/login', '/auth/login/totp', '/auth/send-verification', '/auth/verify-and-register',
  '/superadmin/login', '/superadmin/verify-code', '/superadmin/verify-totp', '/superadmin/totp/enroll',
  '/superadmin/forgot-password', '/superadmin/reset-password',
]);

api.interceptors.request.use((config) => {
  const token = tokens[scopeOf(config.url)];
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const cfg = err.config as (AxiosRequestConfig & { _retried?: boolean; _noRefresh?: boolean }) | undefined;
    // 401 ⇒ el access caducó o la sesión murió: se renueva una vez y se repite la petición.
    if (err.response?.status === 401 && cfg && !cfg._retried && !cfg._noRefresh && !PUBLIC_AUTH.has(cfg.url ?? '')) {
      const scope = scopeOf(cfg.url);
      cfg._retried = true;
      const sent = (cfg.headers as Record<string, string> | undefined)?.Authorization;
      let token: string | null;
      if (tokens[scope] && sent !== `Bearer ${tokens[scope]}`) {
        // Otra petición ya renovó mientras esta iba en vuelo.
        token = tokens[scope];
      } else if (sent || hasHint(scope)) {
        try {
          token = await refreshAccessToken(scope);
        } catch {
          return Promise.reject(err);
        }
      } else {
        token = null;
      }
      if (token) {
        cfg.headers = { ...(cfg.headers ?? {}), Authorization: `Bearer ${token}` };
        return api(cfg);
      }
      const isAuthPage = ['/login', '/register', '/superadmin/login'].some(
        p => window.location.pathname.startsWith(p),
      );
      if (sent && !isAuthPage) {
        endSession(scope, false);
        // replace: que "atrás" no devuelva a la página que ya no se puede ver.
        window.location.replace(scope === 'sa' ? '/superadmin/login' : '/login');
      }
    }
    // 402 = tienda en solo lectura por impago: lo recoge useSubscription para mostrar el aviso
    // aunque la página que hizo la petición se trague el error.
    if (err.response?.status === 402) {
      window.dispatchEvent(new CustomEvent(READ_ONLY_EVENT, { detail: err.response.data?.message }));
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

// ── Users ─────────────────────────────────────────────────────────────────
export const getUsers = () => api.get('/auth/users');
export const createKitchenAccount = (data: { email: string; password: string }) =>
  api.post('/auth/kitchen-account', data);
export const deleteUser = (id: string) => api.delete(`/auth/users/${id}`);
// Esta sesión sigue; la API cierra todas las demás del usuario.
export const changePassword = (currentPassword: string, newPassword: string) =>
  api.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword });
export const logoutAll = () => api.post('/auth/logout-all');

export interface OpenSession {
  sessionId: string;
  kind: 'store' | 'kitchen' | 'superadmin';
  createdAt: string;
  lastUsedAt: string;
  userAgent: string | null;
  ip: string | null;
  current: boolean;
}
export const getSessions = () => api.get<OpenSession[]>('/auth/sessions');

// ── Verificación en dos pasos (TOTP) ──────────────────────────────────────
export const loginTotp = (mfaTicket: string, code: string) =>
  api.post('/auth/login/totp', { mfaTicket, code });
export interface TotpStatus { enabled: boolean; enabledAt: string | null; recoveryCodesLeft: number }
export const getTotpStatus = () => api.get<TotpStatus>('/auth/totp');
export const totpSetup = () => api.post<{ otpauthUri: string; secret: string }>('/auth/totp/setup');
export const totpEnable = (password: string, code: string) =>
  api.post<{ recoveryCodes: string[] }>('/auth/totp/enable', { password, code });
export const totpDisable = (password: string, code: string) =>
  api.post('/auth/totp/disable', { password, code });
export const revokeSession = (sessionId: string) => api.delete(`/auth/sessions/${sessionId}`);

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

export const updateCategory = (categoryId: string, data: Partial<{ name: string; description: string; sortOrder: number }>) =>
  api.patch(`/products/categories/${categoryId}`, data);

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
  kind?: ProductKind;
  available?: boolean;
  prepMinutes?: number | null;
}) => api.post('/products', data);

export const updateProduct = (id: string, data: {
  name?: string;
  sku?: string;
  categoryId?: string;
  salePrice?: number;
  costPrice?: number;
  stock?: number;
  // Stock que vio el formulario: la API solo aplica `stock` si sigue siendo este (409 si no).
  stockBefore?: number;
  hasVariants?: boolean;
  description?: string;
  imageUrl?: string;
  hasShipping?: boolean;
  weight?: number;
  shippingStandard?: number;
  shippingExpress?: number;
  isActive?: boolean;
  variants?: VariantUpdatePayload[];
  kind?: ProductKind;
  available?: boolean;
  prepMinutes?: number | null;
}) => api.patch(`/products/${id}`, data);

export const deleteProduct = (id: string) => api.delete(`/products/${id}`);

// ── Cocina (módulo restaurante) ───────────────────────────────────────────────
export type KitchenStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export interface KitchenTicket {
  orderId: string; number: string; status: KitchenStatus; createdAt: string; updatedAt: string;
  confirmedAt: string | null; preparingAt: string | null; readyAt: string | null; estimatedTime: number | null;
  suggestedMinutes: number; customerName: string; delivery: 'domicilio' | 'recoge';
  deliveryAddress: string | null; notes: string | null;
  items: { quantity: number; description: string; note: string | null; options: string[] }[];
}
export interface KitchenMenu {
  products: { productId: string; name: string; available: boolean }[];
  options: { optionId: string; name: string; groupName: string; available: boolean }[];
}
export const getKitchenContext = () =>
  api.get<{ storeName: string; kitchenRequiresAcceptance: boolean; role: string; serverTime: string }>('/kitchen/context');
export const getKitchenOrders = (since?: string) =>
  api.get<{ orders: KitchenTicket[]; next: string }>('/kitchen/orders', { params: since ? { since } : {} });
export const transitionKitchenOrder = (orderId: string, data: { status: KitchenStatus; estimatedTime?: number; reason?: string }) =>
  api.post(`/kitchen/orders/${orderId}/transition`, data);
export const getKitchenMenu = () => api.get<KitchenMenu>('/kitchen/menu');
export const setKitchenProductAvailability = (productId: string, available: boolean) =>
  api.patch(`/kitchen/products/${productId}/availability`, { available });
export const setKitchenOptionAvailability = (optionId: string, available: boolean) =>
  api.patch(`/kitchen/options/${optionId}/availability`, { available });

// ── Menú (módulo restaurante) ─────────────────────────────────────────────────
export type ProductKind = 'stock' | 'prepared';
export interface MenuOptionDto { optionId: string; groupId: string; name: string; priceDelta: string | number; available: boolean; sortOrder: number; linkedProductId: string | null; linkedProduct: { productId: string; name: string } | null }
export interface OptionGroupDto { groupId: string; name: string; minSelect: number; maxSelect: number; aiAsks: boolean; sortOrder: number; options: MenuOptionDto[]; productIds: string[] }

export const getOptionGroups = () => api.get<OptionGroupDto[]>('/menu/option-groups');
export const createOptionGroup = (data: { name: string; minSelect: number; maxSelect: number; aiAsks?: boolean; sortOrder?: number }) =>
  api.post('/menu/option-groups', data);
export const updateOptionGroup = (groupId: string, data: Partial<{ name: string; minSelect: number; maxSelect: number; aiAsks: boolean; sortOrder: number }>) =>
  api.patch(`/menu/option-groups/${groupId}`, data);
export const deleteOptionGroup = (groupId: string) => api.delete(`/menu/option-groups/${groupId}`);
export const createOption = (groupId: string, data: { name: string; priceDelta: number; available?: boolean; sortOrder?: number; linkedProductId?: string | null }) =>
  api.post(`/menu/option-groups/${groupId}/options`, data);
export const updateOption = (optionId: string, data: Partial<{ name: string; priceDelta: number; available: boolean; sortOrder: number; linkedProductId: string | null }>) =>
  api.patch(`/menu/options/${optionId}`, data);
export const deleteOption = (optionId: string) => api.delete(`/menu/options/${optionId}`);
export const assignProductGroups = (productId: string, groupIds: string[]) =>
  api.put(`/menu/products/${productId}/option-groups`, { groupIds });
export const setProductAvailability = (productId: string, available: boolean) =>
  api.patch(`/menu/products/${productId}/availability`, { available });

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
  stockBefore?: number;
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
// Los pedidos llegan por páginas, de los más recientes hacia atrás. `before` = orderId del
// último que ya se tiene; una página llena (ORDERS_PAGE) significa que puede haber más.
export const ORDERS_PAGE = 200;

// Pantalla de pedidos: todo menos los cobros de servicios (esos van en su propia pantalla).
export const getOrders = (storeId: string, before?: string) =>
  api.get(`/orders/store/${storeId}`, { params: { type: 'product,food', limit: ORDERS_PAGE, ...(before && { before }) } });

export const getServiceOrders = (storeId: string, before?: string) =>
  api.get(`/orders/store/${storeId}`, { params: { type: 'service', limit: ORDERS_PAGE, ...(before && { before }) } });

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

// Reanuda las campañas que los frenos pausaron (solo admin de la tienda).
export const resumeCampaigns = () =>
  api.post('/campaigns/resume');

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

export const createWalkIn = (data: {
  customerId: string;
  serviceId?: string;
  staffId?: string;
  durationMinutes?: number;
  price: number;
  paymentMethod: string;
}) => api.post('/appointments/walk-in', data);

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

// ── Tienda pública (no auth) ───────────────────────────────────────────────────
export const getPublicStoreProducts = (slug: string) =>
  api.get(`/public/${slug}/products`);

export const createPublicOrder = (slug: string, data: {
  customerName: string;
  customerPhone: string;
  items: { productId: string; variantId?: string; quantity: number; optionIds?: string[]; note?: string }[];
  paymentMethod?: string;
  notes?: string;
  expectedTotal?: number;
  idempotencyKey?: string;
}) => api.post(`/public/${slug}/order`, data);

export const quotePublicOrder = (slug: string, data: { items: { productId: string; variantId?: string; quantity: number; optionIds?: string[]; note?: string }[] }) =>
  api.post<{ subtotal: number; discount: number; total: number; lines: { unitPrice: number; discount: number; promotionName: string | null }[] }>(`/public/${slug}/quote`, data);

// ── Staff ─────────────────────────────────────────────────────────────────────
export const getStaff = () =>
  api.get('/staff');

export const createStaff = (data: { name: string; schedule?: Record<string, any> | null; commissionPercentage?: number | null }) =>
  api.post('/staff', data);

export const updateStaff = (id: string, data: { name?: string; isActive?: boolean; schedule?: Record<string, any> | null; commissionPercentage?: number | null }) =>
  api.patch(`/staff/${id}`, data);

export const deleteStaff = (id: string) =>
  api.delete(`/staff/${id}`);

// Borrado permanente (hard delete) — elimina el registro de la BD.
export const deleteStaffPermanent = (id: string) =>
  api.delete(`/staff/${id}/permanent`);

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

export interface WhatsAppHealth {
  status: string;
  pausedReason: string | null;
  reconnects24h: number;
  linkedDays: number;
  sentToday: number;
  campaignSentToday: number;
  campaignDailyCap: number;
  campaignsPaused: { at: string; reason: string | null } | null;
  nextCampaignWindow: string | null;
}

// Salud del número: reconexiones, envíos del día y tope de campañas.
export const getWhatsAppHealth = (storeId: string) =>
  api.get<WhatsAppHealth>(`/whatsapp/health/${storeId}`);

// Por defecto cierra SIN desvincular el teléfono; logout: true lo desvincula (hay que
// escanear un QR nuevo para volver).
export const disconnectWhatsApp = (storeId: string, opts: { logout?: boolean } = {}) =>
  api.delete(`/whatsapp/disconnect/${storeId}`, { params: opts.logout ? { logout: 'true' } : undefined });

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
  aiProvider: string; apiKey?: string; systemPrompt: string;
  model?: string; temperature?: number; maxTokens?: number;
  cartridges?: Array<{ provider: string; apiKey?: string; keyRef?: string; model: string }>;
}) => api.post('/ai-config', data);

export const getAiPoolStatus = () =>
  api.get('/ai-config/pool-status');

export const verifyAiKeys = () =>
  api.post('/ai-config/verify-keys');

// ── Uploads ───────────────────────────────────────────────────────────────
export const uploadImage = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post<{ url: string }>('/uploads/image', fd);
};

// ── Blocked Contacts ──────────────────────────────────────────────────────
export const getBlockedContacts = () =>
  api.get('/blocked');

export const blockContact = (data: { phone: string; label?: string }) =>
  api.post('/blocked', data);

export const unblockContact = (id: string) =>
  api.delete(`/blocked/${id}`);

// ── SuperAdmin ─────────────────────────────────────────────────────────────
// Sesión propia del SA (cookie __Secure-sa_rt y access en memoria), separada de la de tienda.
function saHeaders() {
  // El interceptor ya pone el token del SA en /superadmin/*; esto solo lo deja explícito.
  const t = getAccessToken('sa');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export const superAdminLogin = (email: string, password: string) =>
  api.post('/superadmin/login', { email, password });

export const superAdminVerifyTotp = (sessionId: string, code: string) =>
  api.post('/superadmin/verify-totp', { sessionId, code });

export const superAdminEnrollTotp = (enrollTicket: string, code: string) =>
  api.post<{ access_token: string; recoveryCodes: string[] }>('/superadmin/totp/enroll', { enrollTicket, code });

export const resetSuperAdminUserTwoFactor = (userId: string) =>
  api.post(`/superadmin/users/${userId}/reset-2fa`, {}, { headers: saHeaders() });

export const getSuperAdminDashboard = () =>
  api.get('/superadmin/dashboard', { headers: saHeaders() });

export const getSuperAdminStores = () =>
  api.get('/superadmin/stores', { headers: saHeaders() });

export const getSuperAdminWaGateways = () =>
  api.get('/superadmin/wa-gateways', { headers: saHeaders() });

export const getSuperAdminJobs = () =>
  api.get('/superadmin/jobs', { headers: saHeaders() });

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

// ── Integración StockUp ──────────────────────────────────────────────────
export interface StockupLinkCode {
  code: string;
  expiresInMinutes: number;
}

export interface StockupConnectionStatus {
  connected: boolean;
  stockupTenantId: string | null;
  lastSyncAt: string | null;
}

export const generateStockupLinkCode = () =>
  api.post<StockupLinkCode>('/integrations/stockup/link-code');

export const getStockupConnection = () =>
  api.get<StockupConnectionStatus>('/integrations/stockup/connection');

export const disconnectStockup = () =>
  api.delete<{ ok: boolean }>('/integrations/stockup/connection');

// ── Promociones (módulo restaurante) ──────────────────────────────────────────
export type PromotionType = 'percent' | 'amount' | 'buy_n_pay_m' | 'fixed_price';
export interface PromotionDto {
  promotionId: string; name: string; active: boolean; type: PromotionType;
  value: number | null; buyN: number | null; payM: number | null;
  daysOfWeek: number[]; startTime: string | null; endTime: string | null;
  startsAt: string | null; endsAt: string | null;
  productIds: string[]; categoryIds: string[]; summary: string;
}
export type PromotionInput = Partial<Omit<PromotionDto, 'promotionId' | 'summary'>>;
export const getPromotions = () => api.get<PromotionDto[]>('/menu/promotions');
export const createPromotion = (data: PromotionInput) => api.post<PromotionDto>('/menu/promotions', data);
export const updatePromotion = (id: string, data: PromotionInput) => api.patch<PromotionDto>(`/menu/promotions/${id}`, data);
export const deletePromotion = (id: string) => api.delete(`/menu/promotions/${id}`);
