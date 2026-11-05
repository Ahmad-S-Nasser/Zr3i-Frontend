import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api/client';
import type { Me, Organisation } from '../api/types';

interface AuthValue {
  /** True until the first /api/me answer (or the absence of a token) is known. */
  loading: boolean;
  me: Me | null;
  org: Organisation | null;
  setOrgId: (id: string) => void;
  /** Step one: email and password. Returns the challenge to answer with a code. */
  begin: (email: string, password: string) => Promise<string>;
  /** Step two: the six-digit code. Signs the user in. */
  verify: (challenge: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);
const ORG_KEY = 'zr3i.org';

function storedOrg(): string | null {
  try {
    return sessionStorage.getItem(ORG_KEY);
  } catch {
    return null;
  }
}

/** Does the permission list allow this key? A segment of `*` matches any segment (the built-in roles use `*:*:*`, `*:*:read`). */
export function can(permissions: string[], key: string): boolean {
  const want = key.split(':');
  return permissions.some((p) => {
    const have = p.split(':');
    return have.length === want.length && have.every((seg, i) => seg === '*' || seg === want[i]);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState<boolean>(() => getToken() !== null);
  const [orgId, setOrgIdState] = useState<string | null>(storedOrg);

  const loadMe = useCallback(async () => {
    try {
      setMe(await api<Me>('/api/me'));
    } catch {
      setToken(null);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getToken()) void loadMe();
  }, [loadMe]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setMe(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const begin = useCallback(async (email: string, password: string) => {
    const r = await api<{ challenge: string }>('/api/auth/sign-in', { method: 'POST', body: { email, password } });
    return r.challenge;
  }, []);

  const verify = useCallback(
    async (challenge: string, code: string) => {
      const r = await api<{ token: string }>('/api/auth/verify', { method: 'POST', body: { challenge, code } });
      setToken(r.token);
      setLoading(true);
      await loadMe();
    },
    [loadMe],
  );

  const signOut = useCallback(async () => {
    try {
      await api('/api/auth/sign-out', { method: 'POST' });
    } catch {
      /* the token is dropped here either way */
    }
    setToken(null);
    setMe(null);
  }, []);

  const setOrgId = useCallback((id: string) => {
    setOrgIdState(id);
    try {
      sessionStorage.setItem(ORG_KEY, id);
    } catch {
      /* the choice then lasts until reload */
    }
  }, []);

  const org = useMemo(() => me?.organisations.find((o) => o.id === orgId) ?? me?.organisations[0] ?? null, [me, orgId]);
  const value = useMemo(() => ({ loading, me, org, setOrgId, begin, verify, signOut }), [loading, me, org, setOrgId, begin, verify, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
