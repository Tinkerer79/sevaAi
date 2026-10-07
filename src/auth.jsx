import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api('/api/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    setUser(d.user);
    return d.user;
  }, []);

  const register = useCallback(async (form) => {
    const d = await api('/api/auth/register', { method: 'POST', body: form });
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
