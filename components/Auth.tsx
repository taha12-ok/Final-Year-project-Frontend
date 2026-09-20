"use client";
/**
 * components/Auth.tsx — global auth state (context + hook).
 * Listens for "medai-auth" storage events so Navbar etc. update instantly.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getUser, getToken, clearSession, type AuthUser } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  ready: boolean; // hydration + initial read done
  logout: () => void;
  refresh: () => void;
}

const AuthCtx = createContext<AuthState>({
  user: null,
  ready: false,
  logout: () => {},
  refresh: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = () => {
    const token = getToken();
    const u = getUser();
    setUser(token && u ? u : null);
  };

  useEffect(() => {
    refresh();
    setReady(true);
    const onAuth = () => refresh();
    window.addEventListener("medai-auth", onAuth);
    window.addEventListener("storage", onAuth);
    return () => {
      window.removeEventListener("medai-auth", onAuth);
      window.removeEventListener("storage", onAuth);
    };
  }, []);

  const logout = () => {
    clearSession();
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, ready, logout, refresh }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}

/** Client-side route guard: redirect to /login if not signed in. */
export function useRequireAuth(nextPath: string) {
  const { user, ready } = useAuth();
  useEffect(() => {
    if (ready && !user) {
      const next = encodeURIComponent(nextPath || window.location.pathname + window.location.search);
      window.location.replace(`/login?next=${next}`);
    }
  }, [ready, user, nextPath]);
  return { user, ready };
}
