// =============================================================================
// CONSENT STORE — the single source of truth for the visitor's cookie choice.
// =============================================================================
// Mirrors the basket store's pattern (lib/basket.ts): a tiny localStorage-
// backed record + hand-rolled pub/sub + a `useSyncExternalStore` hook. No
// context, no Redux.
//
// Contract (C3): localStorage key `tasm.consent.v1` holds
//   { marketing: boolean, decidedAt: ISO string }
// and NO marketing script (Meta Pixel, GA4) may load or fire before
// `marketing === true`. Declining persists and loads nothing. Clearing the
// record (the footer's "Cookie preferences" link) re-opens the banner live —
// every subscriber re-renders without a reload.
// =============================================================================

import { useSyncExternalStore } from "react";

export interface ConsentRecord {
  /** True = analytics + advertising allowed; false = essential only. */
  marketing: boolean;
  /** ISO timestamp of the moment the visitor decided. */
  decidedAt: string;
}

const STORAGE_KEY = "tasm.consent.v1";

const isBrowser = typeof window !== "undefined";

// In-memory mirror so reads stay referentially stable between renders
// (useSyncExternalStore loops on a fresh object each call). `undefined`
// means "not read yet"; `null` means "read, no decision exists".
let cache: ConsentRecord | null | undefined;
const listeners = new Set<() => void>();

const readFromStorage = (): ConsentRecord | null => {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (typeof o.marketing !== "boolean") return null;
    if (typeof o.decidedAt !== "string") return null;
    return { marketing: o.marketing, decidedAt: o.decidedAt };
  } catch {
    return null;
  }
};

const ensureCache = (): ConsentRecord | null => {
  if (cache === undefined) cache = readFromStorage();
  return cache;
};

const emit = () => {
  for (const fn of listeners) fn();
};

// ---- Public API ------------------------------------------------------------

/** The current decision, or null if the visitor hasn't decided yet. */
export const getConsent = (): ConsentRecord | null => ensureCache();

/** True only when the visitor has explicitly allowed marketing/analytics. */
export const hasMarketingConsent = (): boolean =>
  getConsent()?.marketing === true;

/** Record a decision. Persists + notifies every subscriber. */
export const setConsent = (marketing: boolean): void => {
  const record: ConsentRecord = {
    marketing,
    decidedAt: new Date().toISOString(),
  };
  cache = record;
  if (isBrowser) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Quota / private mode — the in-memory record still holds for the session.
    }
  }
  emit();
};

/**
 * Forget the decision entirely — the footer's "Cookie preferences" link. The
 * consent banner (subscribed via useConsent) re-opens immediately, no reload.
 * Note: scripts already loaded this page-load stay in memory until navigation;
 * nothing NEW loads, and a "decline" on the reopened banner persists.
 */
export const clearConsent = (): void => {
  cache = null;
  if (isBrowser) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  emit();
};

// ---- React subscription ----------------------------------------------------

const subscribe = (callback: () => void): (() => void) => {
  listeners.add(callback);
  // Cross-tab sync — a decision made in another tab applies here too.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = readFromStorage();
    emit();
  };
  if (isBrowser) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    if (isBrowser) window.removeEventListener("storage", onStorage);
  };
};

const getSnapshot = (): ConsentRecord | null => ensureCache();
const getServerSnapshot = (): ConsentRecord | null => null;

/** Reactive hook — the current consent record (null = undecided). */
export const useConsent = (): ConsentRecord | null =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
