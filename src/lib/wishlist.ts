// =============================================================================
// WISHLIST STORE — localStorage-backed favourites, mirroring the basket store's
// pub/sub + useSyncExternalStore pattern (no Redux/Zustand/Context). A saved
// item is a { paintingId, colourwayName } pair; toggling the same pair removes
// it. Lines pointing at a removed painting / unavailable colourway are silently
// reconciled on every read, exactly like the basket. Synced across tabs via the
// `storage` event. First-party, on-device only — no network, no consent gate.
// =============================================================================

import { useSyncExternalStore } from "react";
import { PAINTINGS } from "../data/paintings";

export interface WishlistItem {
  paintingId: string;
  colourwayName: string;
  addedAt: number;
}

const STORAGE_KEY = "tasm.wishlist.v1";
const isBrowser = typeof window !== "undefined";
const listeners = new Set<() => void>();

let cache: WishlistItem[] | null = null;

const isValid = (paintingId: string, colourwayName: string): boolean => {
  const p = PAINTINGS.find((x) => x.id === paintingId);
  if (!p) return false;
  return p.colourways.some((c) => c.available && c.name === colourwayName);
};

const read = (): WishlistItem[] => {
  if (!isBrowser) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const clean: WishlistItem[] = [];
    for (const it of parsed) {
      if (!it || typeof it !== "object") continue;
      const o = it as Record<string, unknown>;
      const paintingId = typeof o.paintingId === "string" ? o.paintingId : "";
      const colourwayName = typeof o.colourwayName === "string" ? o.colourwayName : "";
      const addedAt = typeof o.addedAt === "number" ? o.addedAt : 0;
      const key = `${paintingId}::${colourwayName}`;
      if (!paintingId || !colourwayName || seen.has(key)) continue;
      if (!isValid(paintingId, colourwayName)) continue;
      seen.add(key);
      clean.push({ paintingId, colourwayName, addedAt });
    }
    return clean.sort((a, b) => b.addedAt - a.addedAt);
  } catch {
    return [];
  }
};

const ensureCache = (): WishlistItem[] => {
  if (cache === null) cache = read();
  return cache;
};

const persist = (items: WishlistItem[]) => {
  cache = items;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota / disabled storage — in-memory cache still updated.
  }
  for (const fn of listeners) fn();
};

const keyOf = (paintingId: string, colourwayName: string) => `${paintingId}::${colourwayName}`;

/** Is this exact painting+colourway saved? */
export const isSaved = (paintingId: string, colourwayName: string): boolean =>
  ensureCache().some((i) => keyOf(i.paintingId, i.colourwayName) === keyOf(paintingId, colourwayName));

/** Toggle a painting+colourway in the wishlist. Returns the new saved state. */
export const toggleWishlist = (paintingId: string, colourwayName: string): boolean => {
  if (!isValid(paintingId, colourwayName)) return false;
  const current = ensureCache();
  const k = keyOf(paintingId, colourwayName);
  const exists = current.some((i) => keyOf(i.paintingId, i.colourwayName) === k);
  if (exists) {
    persist(current.filter((i) => keyOf(i.paintingId, i.colourwayName) !== k));
    return false;
  }
  persist([{ paintingId, colourwayName, addedAt: Date.now() }, ...current]);
  return true;
};

/** Remove a saved item (no-op if absent). */
export const removeFromWishlist = (paintingId: string, colourwayName: string): void => {
  const k = keyOf(paintingId, colourwayName);
  persist(ensureCache().filter((i) => keyOf(i.paintingId, i.colourwayName) !== k));
};

const subscribe = (callback: () => void): (() => void) => {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = null; // force re-read on next snapshot
    for (const fn of listeners) fn();
  };
  if (isBrowser) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    if (isBrowser) window.removeEventListener("storage", onStorage);
  };
};

const EMPTY: WishlistItem[] = [];
const getSnapshot = (): WishlistItem[] => ensureCache();
const getServerSnapshot = (): WishlistItem[] => EMPTY;

/** Reactive list of saved items (newest first). */
export const useWishlist = (): WishlistItem[] =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

/** Reactive saved-count (for a nav / account badge). */
export const useWishlistCount = (): number =>
  useSyncExternalStore(subscribe, () => ensureCache().length, () => 0);
