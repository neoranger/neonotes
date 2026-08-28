import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, getAuthToken, setAuthToken } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiRequest('/auth/me');
        setUser(res.user);
      } catch (err) {
        console.warn('Token invalido o servidor inalcanzable:', err.message);
        // Si no hay red, mantener credenciales guardadas si existen en localStorage
        const storedUser = localStorage.getItem('neonotes_cached_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          setAuthToken(null);
        }
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (username, password) => {
    const res = await apiRequest('/auth/login', 'POST', { username, password });
    setAuthToken(res.token);
    setUser(res.user);
    localStorage.setItem('neonotes_cached_user', JSON.stringify(res.user));
    return res;
  };

  const register = async (username, email, password) => {
    const res = await apiRequest('/auth/register', 'POST', { username, email, password });
    setAuthToken(res.token);
    setUser(res.user);
    localStorage.setItem('neonotes_cached_user', JSON.stringify(res.user));
    return res;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('neonotes_cached_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
