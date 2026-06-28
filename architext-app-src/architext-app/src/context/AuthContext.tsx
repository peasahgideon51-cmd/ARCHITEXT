import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  name: string;
  email: string;
  plan: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => ({ ok: false }),
  signup: async () => ({ ok: false }),
  logout: async () => {},
});

const BASE_URL = 'http://127.0.0.1:8080';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('architext_user'),
      AsyncStorage.getItem('architext_token'),
    ]).then(([rawUser, storedToken]) => {
      if (rawUser) { try { setUser(JSON.parse(rawUser)); } catch {} }
      if (storedToken) setToken(storedToken);
      setIsLoading(false);
    });
  }, []);

  const persistSession = async (u: User, t: string) => {
    setUser(u); setToken(t);
    await Promise.all([
      AsyncStorage.setItem('architext_user', JSON.stringify(u)),
      AsyncStorage.setItem('architext_token', t),
    ]);
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.ok) return { ok: false, error: data.error || 'Login failed.' };
      const u: User = { id: String(data.user.id), name: data.user.name || email.split('@')[0], email: data.user.email, plan: data.user.plan || 'Free Plan' };
      await persistSession(u, data.token);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not reach the server.' };
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!data.ok) return { ok: false, error: data.error || 'Sign up failed.' };
      const u: User = { id: String(data.user.id), name: data.user.name || name, email: data.user.email, plan: data.user.plan || 'Free Plan' };
      await persistSession(u, data.token);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not reach the server.' };
    }
  };

  const logout = async () => {
    if (token) {
      fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setUser(null); setToken(null);
    await Promise.all([
      AsyncStorage.removeItem('architext_user'),
      AsyncStorage.removeItem('architext_token'),
    ]);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
