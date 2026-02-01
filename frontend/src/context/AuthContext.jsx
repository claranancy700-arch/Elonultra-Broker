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
    const init = async () => {
      const savedToken = safeGetItem('token');

      if (!savedToken) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        // Attempt to validate and fetch current user
        const res = await API.get('/auth/me');
        if (mounted && res?.data?.user) {
          setToken(savedToken);
          setUser(res.data.user);
        } else if (mounted) {
          // Invalid response - clear stored auth
          safeRemoveItem('token');
          safeRemoveItem('user');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        // Token invalid or network error - clear stored auth
        safeRemoveItem('token');
        safeRemoveItem('user');
        if (mounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => { mounted = false; };
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
