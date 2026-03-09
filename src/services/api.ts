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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
  // role eliminado — siempre lo asigna el backend
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

// Filtrar pending_human en el frontend desde getConversations — el endpoint no existe en backend
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
  // storeId NO se manda — el backend lo toma del JWT
}) => api.post('/messages', data);

// ── Products ──────────────────────────────────────────────────────────────
export const getProducts = (storeId: string) =>
  api.get(`/products/store/${storeId}`);

export const createProduct = (data: {
  name: string; sku?: string;
  costPrice: number; salePrice: number;
  stock?: number; description?: string;
  imageUrl?: string; hasShipping?: boolean;
  // storeId NO se manda — el backend lo toma del JWT
}) => api.post('/products', data);

export const updateProduct = (id: string, data: {
  name?: string; sku?: string;
  costPrice?: number; salePrice?: number;
  stock?: number; description?: string;
  imageUrl?: string; hasShipping?: boolean;
}) => api.patch(`/products/${id}`, data);

export const deleteProduct = (id: string) => api.delete(`/products/${id}`);

// Variantes
export const addVariant = (productId: string, data: {
  name: string; sku?: string;
  costPrice: number; salePrice: number; stock?: number;
}) => api.post(`/products/${productId}/variants`, data);

export const updateVariant = (variantId: string, data: {
  name?: string; sku?: string;
  costPrice?: number; salePrice?: number;
  stock?: number; isActive?: boolean;
}) => api.patch(`/products/variants/${variantId}`, data);

export const deleteVariant = (variantId: string) =>
  api.delete(`/products/variants/${variantId}`);

// ── Services ──────────────────────────────────────────────────────────────
export const getServices = (storeId: string) =>
  api.get(`/services/store/${storeId}`);

export const createService = (data: {
  name: string; description?: string;
  price?: number; duration?: number;
  // storeId NO se manda — el backend lo toma del JWT
}) => api.post('/services', data);

export const updateService = (id: string, data: {
  name?: string; description?: string;
  price?: number; duration?: number; isActive?: boolean;
}) => api.patch(`/services/${id}`, data);

export const deleteService = (id: string) => api.delete(`/services/${id}`);

// ── Orders ────────────────────────────────────────────────────────────────
export const getOrders = (storeId: string) =>
  api.get(`/orders/store/${storeId}`);

export const updateOrderStatus = (id: string, status: string) =>
  api.patch(`/orders/${id}/status`, { status });

// ── Customers ─────────────────────────────────────────────────────────────
export const getCustomers = (storeId: string) =>
  api.get(`/customers/store/${storeId}`);

export const updateCustomer = (id: string, data: { name?: string; city?: string }) =>
  api.patch(`/customers/${id}`, data);

// ── Campaigns ─────────────────────────────────────────────────────────────
export const getCampaigns = (storeId: string) =>
  api.get(`/campaigns/store/${storeId}`);

export const createCampaign = (data: {
  name: string; message: string; scheduledAt?: string;
  // storeId NO se manda — el backend lo toma del JWT
}) => api.post('/campaigns', data);

export const sendCampaign = (id: string) =>
  api.post(`/campaigns/${id}/send`);

// ── WhatsApp ──────────────────────────────────────────────────────────────
export const connectWhatsApp = (storeId: string) =>
  api.post(`/whatsapp/connect/${storeId}`);

export const getWhatsAppQR = (storeId: string) =>
  api.get(`/whatsapp/qr/${storeId}`);

export const getWhatsAppStatus = (storeId: string) =>
  api.get(`/whatsapp/status/${storeId}`);

export const disconnectWhatsApp = (storeId: string) =>
  api.delete(`/whatsapp/disconnect/${storeId}`);

// ── AI Config ─────────────────────────────────────────────────────────────
export const getAiConfig = (storeId: string) =>
  api.get(`/ai-config/${storeId}`);

export const saveAiConfig = (data: {
  groqApiKey: string; systemPrompt: string;
  model?: string; temperature?: number; maxTokens?: number;
}) => api.post('/ai-config', data);

// ── Blocked Contacts ──────────────────────────────────────────────────────
export const getBlockedContacts = () =>
  api.get('/blocked');

export const blockContact = (data: { phone: string; label?: string }) =>
  api.post('/blocked', data);

export const unblockContact = (id: string) =>
  api.delete(`/blocked/${id}`);