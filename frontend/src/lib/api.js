/**
 * PiVault API Client
 */
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('pivault_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      sessionStorage.removeItem('pivault_token');
      sessionStorage.removeItem('pivault_user');
      window.dispatchEvent(new CustomEvent('pivault:session_expired'));
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  register: (email, password) => 
    api.post('/auth/register', { email, password }),
  
  login: (email, password, totp_code = null) => 
    api.post('/auth/login', { email, password, totp_code }),
  
  logout: () => 
    api.post('/auth/logout'),
  
  getMe: () => 
    api.get('/auth/me'),
  
  setupTotp: () => 
    api.post('/auth/totp/setup'),
  
  verifyTotp: (code) => 
    api.post('/auth/totp/verify', { code }),
  
  disableTotp: (code) => 
    api.post('/auth/totp/disable', { code }),
};

// Vault endpoints
export const vaultAPI = {
  getEntries: (categoryId = null) => {
    const params = categoryId ? { category_id: categoryId } : {};
    return api.get('/vault', { params });
  },
  
  createEntry: (encrypted_data, nonce, category_id = null) => 
    api.post('/vault', { encrypted_data, nonce, category_id }),
  
  updateEntry: (id, encrypted_data, nonce, category_id = null) => 
    api.put(`/vault/${id}`, { encrypted_data, nonce, category_id }),
  
  deleteEntry: (id) => 
    api.delete(`/vault/${id}`),
};

// Categories endpoints
export const categoriesAPI = {
  getAll: () => 
    api.get('/categories'),
  
  create: (name, icon = 'folder') => 
    api.post('/categories', { name, icon }),
  
  update: (id, name, icon) => 
    api.put(`/categories/${id}`, { name, icon }),
  
  delete: (id) => 
    api.delete(`/categories/${id}`),
};

// Settings endpoints
export const settingsAPI = {
  update: (settings) => 
    api.patch('/settings', settings),
};

// Export/Import endpoints
export const exportImportAPI = {
  export: () => 
    api.get('/export'),
  
  import: (data) => 
    api.post('/import', data),
};

// Utility endpoints
export const utilAPI = {
  checkPasswordStrength: (password) => 
    api.post('/password-strength', { password }),
  
  health: () => 
    api.get('/health'),
};

export default api;
