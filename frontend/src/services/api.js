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
  }
  return config;
});

// Handle auth errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      safeRemoveItem('token');
      safeRemoveItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
