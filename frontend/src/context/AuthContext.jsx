import React, { createContext, useState, useEffect } from 'react';
import API from '../services/api';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth from localStorage but validate token with server
  useEffect(() => {
    let mounted = true;
    const savedToken = safeGetItem('token');
    const savedUserString = safeGetItem('user');
    const savedUser = savedUserString ? JSON.parse(savedUserString) : null;

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
    }

    const tryAuthorize = async (attempt = 1) => {
      if (!savedToken || !savedUser) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const res = await API.get('/auth/me');
        if (mounted && res?.data?.user) {
          setToken(savedToken);
          setUser(res.data.user);
          safeSetItem('user', JSON.stringify(res.data.user));
          setLoading(false);
        } else {
          safeRemoveItem('token');
          safeRemoveItem('user');
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
          safeRemoveItem('token');
          safeRemoveItem('user');
          if (mounted) {
            setToken(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (attempt <= 5) {
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
    safeSetItem('user', JSON.stringify(userData));
    setUser(userData);
    setToken(authToken);
  };

  const logout = () => {
    safeRemoveItem('token');
    safeRemoveItem('user');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
