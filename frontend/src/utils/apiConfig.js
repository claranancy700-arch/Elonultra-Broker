// Utility to get backend API base URL
// Uses VITE_API_URL env var, falls back to same-origin /api for local dev
export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    // Remove /api suffix if present to get base URL
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
  }

  // Fallback for same-origin deployments (local dev)
  return import.meta.env.DEV ? 'http://localhost:5001' : window.location.origin;
};

export const getChatSocketBaseUrl = () => {
  if (import.meta.env.VITE_CHAT_SOCKET_URL) {
    return import.meta.env.VITE_CHAT_SOCKET_URL.replace(/\/$/, '');
  }

  return getApiBaseUrl();
};