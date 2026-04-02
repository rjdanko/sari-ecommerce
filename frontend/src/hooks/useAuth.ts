'use client';

import { useState, useEffect, useCallback } from 'react';
import api, { getCsrfCookie } from '@/lib/api';
import { User } from '@/types/user';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const { data } = await api.get('/api/user');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    await getCsrfCookie();
    await api.post('/api/login', { email, password });
    await fetchUser();
  };

  const register = async (data: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role?: 'user' | 'business';
  }) => {
    await getCsrfCookie();
    await api.post('/api/register', data);
    await fetchUser();
  };

  const logout = async () => {
    await api.post('/api/logout');
    setUser(null);
  };

  /**
   * NOTE: hasRole is for UI rendering only (show/hide buttons).
   * The backend enforces actual authorization via middleware and policies.
   */
  const hasRole = (role: string): boolean => {
    return user?.roles?.some(r => r.name === role) ?? false;
  };

  return { user, loading, login, register, logout, hasRole };
}
