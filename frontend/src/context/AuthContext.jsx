import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest, getAuthToken, setAuthToken } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const checkAuth = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      setOffline(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest('/auth/me');
      setUser(res.user);
      setOffline(false);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        console.warn('Token inválido o expirado, cerrando sesión:', err.message);
        setAuthToken(null);
        setUser(null);
        setOffline(false);
      } else {
        console.warn('Servidor inalcanzable:', err.message);
        setUser(null);
        setOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username, password) => {
    try {
      const res = await apiRequest('/auth/login', 'POST', { username, password });
      setAuthToken(res.token);
      setUser(res.user);
      setOffline(false);
      return res;
    } catch (err) {
      if (!err.status) setOffline(true);
      throw err;
    }
  };

  const register = async (username, email, password) => {
    try {
      const res = await apiRequest('/auth/register', 'POST', { username, email, password });
      setAuthToken(res.token);
      setUser(res.user);
      setOffline(false);
      return res;
    } catch (err) {
      if (!err.status) setOffline(true);
      throw err;
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setOffline(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, offline, login, register, logout, retryAuth: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}