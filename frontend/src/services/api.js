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

// Handle auth errors and network retries
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const status = error.response?.status;

    if (!config) {
      return Promise.reject(error);
    }

    if (status === 401 || status === 403) {
      safeRemoveItem('token');
      safeRemoveItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Retry on network errors with exponential backoff, up to 3 attempts
    config.retryCount = config.retryCount || 0;
    if (!status && config.retryCount < 3) {
      config.retryCount += 1;
      const backoff = 500 * Math.pow(2, config.retryCount - 1);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return API(config);
    }

    return Promise.reject(error);
  }
);

export default API;
