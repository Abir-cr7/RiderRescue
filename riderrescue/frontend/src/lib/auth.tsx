import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, tokenStore, type Session } from './api';
import type { ProviderProfile, User } from './types';

interface AuthState {
  user: User | null;
  provider: ProviderProfile | null;
  loading: boolean;
  login: (identifier: string, password: string, portal?: 'admin') => Promise<User>;
  signUp: (s: Session) => void;
  refresh: () => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>');
  return c;
};

export const homeFor = (role: User['role']) => `/${role}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  const apply = (s: { user: User; provider: ProviderProfile | null }) => { setUser(s.user); setProvider(s.provider); };

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) { setLoading(false); return; }
    try { apply(await api.me()); }
    catch { tokenStore.clear(); setUser(null); setProvider(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const value = useMemo<AuthState>(() => ({
    user, provider, loading, refresh,
    login: async (identifier, password, portal) => {
      const s = await api.login(identifier, password, portal);
      tokenStore.set(s.token); apply(s);
      return s.user;
    },
    signUp: (s) => { tokenStore.set(s.token); apply(s); },
    logout: () => { tokenStore.clear(); setUser(null); setProvider(null); },
  }), [user, provider, loading, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
