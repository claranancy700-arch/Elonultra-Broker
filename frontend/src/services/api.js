import axios from 'axios';
import { safeGetItem, safeRemoveItem } from '../utils/storage';

// Create axios instance pointing to backend
// Use relative path so it works in both local dev and production
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Auto-attach JWT token to requests
API.interceptors.request.use((config) => {
  const token = safeGetItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.debug('[api] attaching token to request for', config.url ? config.url : '(unknown)');
  } else {
    console.debug('[api] no token available for request', config.url ? config.url : '(unknown)');
  }
  return config;
});

// Handle auth errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[api] received 401, clearing stored auth and redirecting to /login');
      safeRemoveItem('token');
      safeRemoveItem('user');
      try {
        window.location.href = '/login';
      } catch (e) {
        console.warn('[api] redirect to /login failed:', e?.message || e);
      }
    }
    return Promise.reject(error);
  }
);

export default API;
