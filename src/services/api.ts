import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
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

// Dashboard
export const getDashboard = (storeId: string) =>
  api.get(`/analytics/dashboard/${storeId}`);

// Conversations
export const getConversations = (storeId: string) =>
  api.get(`/conversations/store/${storeId}`);

export const getConversation = (id: string) =>
  api.get(`/conversations/${id}`);

export const getPendingHuman = (storeId: string) =>
  api.get(`/conversations/store/${storeId}/pending-human`);

export const takeoverConversation = (id: string) =>
  api.post(`/conversations/${id}/takeover`);

export const releaseConversation = (id: string) =>
  api.post(`/conversations/${id}/release`);

export const closeConversation = (id: string) =>
  api.post(`/conversations/${id}/close`);

// Messages
export const getMessages = (conversationId: string) =>
  api.get(`/messages/conversation/${conversationId}`);

export const sendMessage = (data: any) =>
  api.post('/messages', data);

// Products
export const getProducts = (storeId: string) =>
  api.get(`/products/store/${storeId}`);

// Orders
export const getOrders = (storeId: string) =>
  api.get(`/orders/store/${storeId}`);

// Customers
export const getCustomers = (storeId: string) =>
  api.get(`/customers/store/${storeId}`);

// Campaigns
export const getCampaigns = (storeId: string) =>
  api.get(`/campaigns/store/${storeId}`);

export const createCampaign = (data: any) =>
  api.post('/campaigns', data);

export const sendCampaign = (id: string) =>
  api.post(`/campaigns/${id}/send`);
