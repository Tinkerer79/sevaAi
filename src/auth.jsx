import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { api } from './api.js';

const AuthContext = createContext(null);

function mapSupabaseUser(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    email: raw.email || '',
    name: raw.user_metadata?.full_name || raw.user_metadata?.name || raw.email || 'Citizen',
    phone: raw.user_metadata?.phone || raw.phone || null,
    // Only server-managed app_metadata can grant admin access.
    role: raw.app_metadata?.role === 'admin' ? 'admin' : 'citizen',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [authClient, setAuthClient] = useState(null);
  const [authMode, setAuthMode] = useState('legacy');

  useEffect(() => {
    let active = true;
    let subscription = null;

    const initialize = async () => {
      try {
        let config = null;
        try { config = await api('/api/auth/config'); } catch { /* local legacy auth may still work */ }

        if (config?.enabled && config.url && config.publishableKey) {
          const client = createClient(config.url, config.publishableKey, {
            auth: { flowType: 'pkce', autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
          });
          if (!active) return;
          setAuthClient(client);
          setAuthMode('supabase');
          const { data } = client.auth.onAuthStateChange((_event, session) => {
            if (active) setUser(mapSupabaseUser(session?.user));
          });
          subscription = data.subscription;
          const { data: sessionData } = await client.auth.getSession();
          if (active) setUser(mapSupabaseUser(sessionData.session?.user));
        } else {
          try {
            const d = await api('/api/auth/me');
            if (active) setUser(d.user);
          } catch { /* guest */ }
        }
      } catch { /* leave the app usable as a guest if auth initialization fails */ }
      finally { if (active) setReady(true); }
    };

    initialize();
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    if (authClient) {
      const { data, error } = await authClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const signedInUser = mapSupabaseUser(data.user);
      setUser(signedInUser);
      return signedInUser;
    }
    const d = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    setUser(d.user);
    return d.user;
  }, [authClient]);

  const register = useCallback(async (form) => {
    if (authClient) {
      const { data, error } = await authClient.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { name: form.name, phone: form.phone || null },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      const createdUser = mapSupabaseUser(data.user);
      setUser(mapSupabaseUser(data.session?.user));
      return { user: createdUser, needsEmailConfirmation: !data.session };
    }
    const d = await api('/api/auth/register', { method: 'POST', body: form });
    setUser(d.user);
    return { user: d.user, needsEmailConfirmation: false };
  }, [authClient]);

  const signInWithProvider = useCallback(async (provider) => {
    if (!authClient) throw new Error('Supabase sign-in is not configured for this deployment yet.');
    const { error } = await authClient.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  }, [authClient]);

  const logout = useCallback(async () => {
    if (authClient) {
      const { error } = await authClient.auth.signOut();
      if (error) throw error;
    } else {
      await api('/api/auth/logout', { method: 'POST' });
    }
    setUser(null);
  }, [authClient]);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, authMode, authClient, signInWithProvider }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
