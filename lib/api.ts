"use client";
/**
 * lib/api.ts — single API client for the MedAI backend.
 * - Base URL: NEXT_PUBLIC_BACKEND_URL (or hardcoded fallback in analyze page for legacy reasons)
 * - Auth: JWT token in localStorage ("medai_token"), sent as Bearer header
 * - On 401: clears session and redirects to /login?next=...
 */

export const BACKEND_URL =
  // NOTE: hardcoded — Vercel env var (NEXT_PUBLIC_BACKEND_URL) stale Back4App URLs
  // bake kar deta hai, isliye direct literal use karte hain.
  "https://fypbackend-a63p74ux.b4a.run";
const TOKEN_KEY = "medai_token";
const USER_KEY = "medai_user";

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  age: string;
  gender: string;
}

// ── Token helpers ──
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("medai-auth"));
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("medai-auth"));
}

/** Fetch with auth header; auto-logout + redirect on 401 (unless opts.skipAuthRedirect). */
export async function apiFetch(
  path: string,
  opts: RequestInit & { skipAuthRedirect?: boolean } = {}
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(opts.headers || {});
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${BACKEND_URL}${path}`, { ...opts, headers });
  if (res.status === 401 && !opts.skipAuthRedirect) {
    clearSession();
    if (typeof window !== "undefined") {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}&expired=1`;
    }
  }
  return res;
}

/** JSON helper — throws Error(message) with detail from backend. */
export async function apiJson<T = any>(path: string, opts: RequestInit & { skipAuthRedirect?: boolean } = {}): Promise<T> {
  const res = await apiFetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (data as any)?.detail ?? (data as any)?.message;
    const msg =
      typeof detail === "string" ? detail : detail?.message || `Request failed (${res.status})`;
    const err = new Error(msg) as Error & { status?: number; data?: any };
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}
