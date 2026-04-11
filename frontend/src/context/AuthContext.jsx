import React, { createContext, useState, useEffect } from 'react';
import API from '../services/api';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthExpired = () => {
      safeRemoveItem('token');
      safeRemoveItem('authToken');
      safeRemoveItem('user');
      safeRemoveItem('currentUser');
      setUser(null);
      setToken(null);
      setLoading(false);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  // Initialize auth from localStorage but validate token with server
  useEffect(() => {
    let mounted = true;
    const savedToken = safeGetItem('token') || safeGetItem('authToken');
    const savedUserString = safeGetItem('user') || safeGetItem('currentUser');
    let savedUser = null;

    if (savedUserString) {
      try {
        savedUser = JSON.parse(savedUserString);
      } catch (parseErr) {
        console.warn('Invalid cached user payload, clearing auth cache');
        safeRemoveItem('token');
        safeRemoveItem('authToken');
        safeRemoveItem('user');
        safeRemoveItem('currentUser');
      }
    }

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
      if (mounted) setLoading(false);
      // Silently refresh from server in background to pick up any changes
      // (e.g. email_verified toggled since last login) without blocking the UI.
      API.get('/auth/me')
        .then(res => {
          if (mounted && res?.data?.user) {
            const fresh = res.data.user;
            setUser(fresh);
            safeSetItem('user', JSON.stringify(fresh));
            safeSetItem('currentUser', JSON.stringify(fresh));
          }
        })
        .catch(() => { /* ignore — stale cache is fine as fallback */ });
      return () => { mounted = false; };
    }

    // No cached session at all — do a server check to see if there's a valid token
    const tryAuthorize = async (attempt = 1) => {
      if (!savedToken) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const res = await API.get('/auth/me');
        if (mounted && res?.data?.user) {
          setToken(savedToken);
          setUser(res.data.user);
          safeSetItem('user', JSON.stringify(res.data.user));
          // Keep legacy key in sync for pages still reading it.
          safeSetItem('currentUser', JSON.stringify(res.data.user));
          setLoading(false);
        } else {
          safeRemoveItem('token');
          safeRemoveItem('authToken');
          safeRemoveItem('user');
          safeRemoveItem('currentUser');
          if (mounted) {
            setToken(null);
            setUser(null);
            setLoading(false);
          }
        }
      } catch (err) {
        const status = err?.response?.status;
        const isAuthError = status === 401 || status === 403;
        if (isAuthError) {
          // Give startup checks one extra chance before clearing session,
          // as some environments briefly return auth errors during cold starts.
          if (attempt < 2) {
            setTimeout(() => {
              if (mounted) tryAuthorize(attempt + 1);
            }, 500);
            return;
          }

          safeRemoveItem('token');
          safeRemoveItem('authToken');
          safeRemoveItem('user');
          safeRemoveItem('currentUser');
          if (mounted) {
            setToken(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (attempt <= 3) {
          const backoff = 1000 * Math.pow(2, attempt - 1);
          console.warn(`Auth check failed (attempt ${attempt}), retrying in ${backoff}ms`, err.message || err);
          setTimeout(() => {
            if (mounted) tryAuthorize(attempt + 1);
          }, backoff);
        } else {
          console.warn('Auth check failed after retries, keeping cached auth if present:', err.message || err);
          if (mounted) setLoading(false);
        }
      }
    };

    tryAuthorize();

    return () => {
      mounted = false;
    };
  }, []);

  const login = (userData, authToken) => {
    safeSetItem('token', authToken);
    safeSetItem('authToken', authToken);
    safeSetItem('user', JSON.stringify(userData));
    safeSetItem('currentUser', JSON.stringify(userData));
    setUser(userData);
    setToken(authToken);
  };

  const logout = () => {
    safeRemoveItem('token');
    safeRemoveItem('authToken');
    safeRemoveItem('user');
    safeRemoveItem('currentUser');
    setUser(null);
    setToken(null);
  };

  const updateUser = (fields) => {
    setUser(prev => {
      const updated = { ...prev, ...fields };
      safeSetItem('user', JSON.stringify(updated));
      safeSetItem('currentUser', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
