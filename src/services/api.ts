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
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const registerUser = (data: { 
  name: string; email: string; password: string; 
  role: string; storeName?: string; storePhone?: string;
}) => api.post('/auth/register', data);

// Users
export const getUsers = () =>
  api.get('/auth/users');

export const deleteUser = (id: string) =>
  api.delete(`/auth/users/${id}`);

// Dashboard
export const getDashboard = (storeId: string) =>
  api.get(`/dashboard/${storeId}`);

// Conversations
export const getConversations = (storeId: string) =>
  api.get(`/conversations/store/${storeId}`);

export const getConversation = (id: string) =>
  api.get(`/conversations/${id}`);

export const getPendingHuman = (storeId: string) =>
  api.get(`/conversations/store/${storeId}/pending-human`);

export const takeoverConversation = (id: string) =>
  api.patch(`/conversations/${id}/takeover`);

export const releaseConversation = (id: string) =>
  api.patch(`/conversations/${id}/release`);

export const closeConversation = (id: string) =>
  api.patch(`/conversations/${id}/close`);

// Messages
export const getMessages = (conversationId: string) =>
  api.get(`/messages/conversation/${conversationId}`);

export const sendMessage = (data: any) =>
  api.post('/messages', data);

// Products
export const getProducts = (storeId: string) =>
  api.get(`/products/store/${storeId}`);

export const createProduct = (data: any) =>
  api.post('/products', data);

export const updateProduct = (id: string, data: any) =>
  api.patch(`/products/${id}`, data);

export const deleteProduct = (id: string) =>
  api.delete(`/products/${id}`);

// Services
export const getServices = (storeId: string) =>
  api.get(`/services/store/${storeId}`);

export const createService = (data: any) =>
  api.post('/services', data);

export const updateService = (id: string, data: any) =>
  api.patch(`/services/${id}`, data);

export const deleteService = (id: string) =>
  api.delete(`/services/${id}`);

// Orders
export const getOrders = (storeId: string) =>
  api.get(`/orders/store/${storeId}`);

// Customers
export const getCustomers = (storeId: string) =>
  api.get(`/customers/store/${storeId}`);

export const updateCustomer = (id: string, data: { name?: string; city?: string }) =>
  api.patch(`/customers/${id}`, data);

// Campaigns
export const getCampaigns = (storeId: string) =>
  api.get(`/campaigns/store/${storeId}`);

export const createCampaign = (data: any) =>
  api.post('/campaigns', data);

export const sendCampaign = (id: string) =>
  api.post(`/campaigns/${id}/send`);

// WhatsApp
export const connectWhatsApp = (storeId: string) =>
  api.post(`/whatsapp/connect/${storeId}`);

export const getWhatsAppQR = (storeId: string) =>
  api.get(`/whatsapp/qr/${storeId}`);

export const getWhatsAppStatus = (storeId: string) =>
  api.get(`/whatsapp/status/${storeId}`);

export const disconnectWhatsApp = (storeId: string) =>
  api.delete(`/whatsapp/disconnect/${storeId}`);