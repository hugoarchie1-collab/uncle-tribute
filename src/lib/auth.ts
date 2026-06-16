// src/lib/auth.ts — tiny client-side auth store for the passwordless account.
//
// The actual auth lives in HttpOnly cookies + KV (api/auth-request →
// auth-verify → my-orders); this module just reflects the server's view to
// React. It calls GET /api/my-orders once (lazily, browser-only) to learn
// whether the session cookie is valid, exposes that via a useSyncExternalStore
// hook (the same store shape as basket.ts / consent.ts), and offers signOut()
// and requestSignInLink(). No tokens or emails are ever stored client-side.

import { useSyncExternalStore } from "react";

export interface OrderRow {
  ref: string;
  date: string | null;
  total: string;
  status: string;
  items: string[];
}

export type AuthState =
  | { status: "loading"; email: null; orders: OrderRow[] }
  | { status: "signedOut"; email: null; orders: OrderRow[] }
  | { status: "signedIn"; email: string; orders: OrderRow[] };

let state: AuthState = { status: "loading", email: null, orders: [] };
const listeners = new Set<() => void>();
let started = false;

const emit = () => {
  for (const l of listeners) l();
};

const set = (next: AuthState) => {
  state = next;
  emit();
};

/** Ask the server who we are. Browser-only (prerender/node skips it). */
const refresh = async () => {
  if (typeof window === "undefined") return;
  try {
    const r = await fetch("/api/my-orders", { credentials: "same-origin" });
    const j = (await r.json()) as {
      signedIn?: boolean;
      email?: string;
      orders?: OrderRow[];
    };
    if (j.signedIn && j.email) {
      set({ status: "signedIn", email: j.email, orders: j.orders ?? [] });
    } else {
      set({ status: "signedOut", email: null, orders: [] });
    }
  } catch {
    set({ status: "signedOut", email: null, orders: [] });
  }
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  if (!started) {
    started = true;
    void refresh();
  }
  return () => {
    listeners.delete(cb);
  };
};

const getSnapshot = () => state;
// Server/prerender snapshot: always "loading" (no fetch in node) so the markup
// is stable and hydration-safe.
const getServerSnapshot = (): AuthState => ({ status: "loading", email: null, orders: [] });

export const useAuth = (): AuthState =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

/** Re-check the session (e.g. after returning from the magic link). */
export const refreshAuth = (): void => {
  void refresh();
};

/** Sign out — clears the server session + cookie, then flips local state. */
export const signOut = async (): Promise<void> => {
  try {
    await fetch("/api/my-orders", { method: "POST", credentials: "same-origin" });
  } catch {
    /* ignore — we sign out locally regardless */
  }
  set({ status: "signedOut", email: null, orders: [] });
};

/** Step 1: ask the estate to email a one-time sign-in link. */
export const requestSignInLink = async (
  email: string,
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const r = await fetch("/api/auth-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (r.ok && j.ok) return { ok: true };
    return { ok: false, error: j.error };
  } catch {
    return { ok: false, error: "Something went wrong — please try again." };
  }
};
