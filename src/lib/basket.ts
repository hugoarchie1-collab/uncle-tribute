// =============================================================================
// BASKET STORE
// =============================================================================
// Tiny localStorage-backed basket. No Redux/Zustand — React's
// `useSyncExternalStore` plus a hand-rolled pub/sub is enough for a
// 10-painting catalogue.
//
// Item shape: one painting + one colourway + one tier (size), quantity
// always 1. Buying two of the same print is two separate lines (which
// lets us keep `addedAt` as a stable per-line timestamp and avoid any
// quantity logic at checkout).
//
// On every read we reconcile against the painting catalogue — if a line
// references a painting that's been removed, a colourway that's been
// withdrawn, or a tier that's no longer available, the line is dropped
// silently.
//
// Storage version bump (v1 → v2): the v1 schema didn't carry tierId, so
// old baskets simply don't load on the new code path. Acceptable —
// baskets are ephemeral and most visitors haven't had one persist long
// enough to feel the loss.
// =============================================================================

import { useSyncExternalStore } from "react";
import { getPaintingById, getPrintTiers, getAnchorTier, type PrintTier } from "../data/paintings";

export interface BasketItem {
  paintingId: string;
  colourwayName: string;
  tierId: PrintTier["id"];
  /** Optional framing add-on. Only meaningful for tiers with framingPricePence. */
  framing?: boolean;
  /**
   * Optional hand-embellishment add-on (Polly Wedge finishes the print by
   * hand in Stephen's geometric tradition). Only meaningful for tiers with
   * embellishmentPricePence. Defaults to false / undefined, which is why
   * older basket entries written before this field existed reconcile cleanly
   * without a storage-version bump.
   */
  embellished?: boolean;
  addedAt: number;
}

const STORAGE_KEY = "tasm.basket.v2";

// In-memory mirror of the persisted basket. We initialise on first read.
let cache: BasketItem[] | null = null;
const listeners = new Set<() => void>();

const isBrowser = typeof window !== "undefined";

const isTierId = (v: unknown): v is PrintTier["id"] =>
  v === "atelier" || v === "collector" || v === "atelier-grande" || v === "heirloom";

const readFromStorage = (): BasketItem[] => {
  if (!isBrowser) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): BasketItem | null => {
        if (!item || typeof item !== "object") return null;
        const o = item as Record<string, unknown>;
        if (typeof o.paintingId !== "string") return null;
        if (typeof o.colourwayName !== "string") return null;
        if (typeof o.addedAt !== "number") return null;
        // Defensive default — anything stored without a tierId (e.g. a v2
        // entry written by a buggy older build) reconciles to the anchor.
        const tierId: PrintTier["id"] = isTierId(o.tierId) ? o.tierId : "collector";
        const framing = o.framing === true ? true : undefined;
        const embellished = o.embellished === true ? true : undefined;
        return {
          paintingId: o.paintingId,
          colourwayName: o.colourwayName,
          tierId,
          framing,
          embellished,
          addedAt: o.addedAt,
        };
      })
      .filter((item): item is BasketItem => item !== null);
  } catch {
    return [];
  }
};

const writeToStorage = (items: BasketItem[]) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota / private mode — fail silently; the in-memory cache still works
    // for the duration of the session.
  }
};

/**
 * Drop any lines whose painting / colourway / tier no longer exist in the
 * catalogue. Returns the reconciled list. If anything was dropped (or any
 * tierId was repaired against the anchor), also writes the cleaned list
 * back to storage so the next read is cheap.
 */
const reconcile = (items: BasketItem[]): BasketItem[] => {
  const cleaned = items.filter((item) => {
    const painting = getPaintingById(item.paintingId);
    if (!painting) return false;
    const colourway = painting.colourways.find(
      (c) => c.name === item.colourwayName && c.available,
    );
    if (!colourway) return false;
    // Tier must still be present + available in the visible ladder for this
    // painting; otherwise drop the line silently (the price has moved or the
    // tier was withdrawn — better to lose the line than show a stale price).
    const visibleTiers = getPrintTiers(painting);
    const tierStillAvailable = visibleTiers.some((t) => t.id === item.tierId);
    return tierStillAvailable;
  });
  if (cleaned.length !== items.length) writeToStorage(cleaned);
  return cleaned;
};

const ensureCache = (): BasketItem[] => {
  if (cache === null) cache = reconcile(readFromStorage());
  return cache;
};

const emit = () => {
  for (const fn of listeners) fn();
};

// ---- Add-notification channel --------------------------------------------
// A tiny, separate pub/sub purely for "an item was just added" UI feedback
// (the on-screen "Added to basket" toast). Kept independent of the store's
// own `listeners` so it can NEVER perturb useBasket / reconciliation /
// cross-tab sync — those fire on every add/remove/clear, whereas this fires
// ONLY on an add, carrying the line that was added. Subscribing here does not
// subscribe to storage events; it's a pure notification side-channel.

export interface AddNotification {
  item: BasketItem;
  /** Monotonic id so consumers can treat rapid successive adds as fresh
   *  events even when the same painting/colourway is added twice. */
  id: number;
}

const addListeners = new Set<(n: AddNotification) => void>();
let lastAddNotification: AddNotification | null = null;
let addSeq = 0;

const emitAdd = (item: BasketItem) => {
  lastAddNotification = { item, id: ++addSeq };
  for (const fn of addListeners) fn(lastAddNotification);
};

/**
 * Subscribe to "item added to basket" events. Returns an unsubscribe fn.
 * Every add path (individual buttons, "Buy now", bundle adds) funnels
 * through `addItem`, so subscribers receive them all with no per-button
 * wiring. Purely for UI feedback — has no effect on the persisted basket.
 */
export const subscribeToAdds = (
  callback: (n: AddNotification) => void,
): (() => void) => {
  addListeners.add(callback);
  return () => {
    addListeners.delete(callback);
  };
};

/** The most recent add notification, or null if nothing has been added yet
 *  this session. Lets a late-mounting consumer read the current value. */
export const getLastAddNotification = (): AddNotification | null =>
  lastAddNotification;

const setCache = (next: BasketItem[]) => {
  cache = next;
  writeToStorage(next);
  emit();
};

// ---- Public API ----------------------------------------------------------

export const getBasket = (): BasketItem[] => ensureCache();

export const getBasketCount = (): number => ensureCache().length;

/**
 * Add a line. `tierId` defaults to the painting's anchor tier so legacy
 * callers (signature `addItem(paintingId, colourwayName)`) keep compiling
 * and producing sensible baskets. `framing` and `embellished` default to
 * false.
 */
export const addItem = (
  paintingId: string,
  colourwayName: string,
  tierId?: PrintTier["id"],
  framing?: boolean,
  embellished?: boolean,
): void => {
  const current = ensureCache();
  let resolvedTierId: PrintTier["id"] = tierId ?? "collector";
  // If no explicit tier was passed, fall back to the painting's anchor.
  // Avoids the corner case where a painting's per-painting override doesn't
  // include the global anchor id.
  if (!tierId) {
    const painting = getPaintingById(paintingId);
    if (painting) resolvedTierId = getAnchorTier(painting).id;
  }
  const added: BasketItem = {
    paintingId,
    colourwayName,
    tierId: resolvedTierId,
    ...(framing ? { framing: true } : {}),
    ...(embellished ? { embellished: true } : {}),
    addedAt: Date.now(),
  };
  setCache([...current, added]);
  // Fire the UI add-notification AFTER the store has settled + persisted, so
  // a toast consumer reading the basket sees the new line. Wrapped so a
  // misbehaving subscriber can never break the add itself.
  try {
    emitAdd(added);
  } catch {
    /* notification is best-effort — never let it disrupt the basket */
  }
};

/**
 * Remove a single line by its addedAt timestamp. We use the timestamp as
 * the line identifier because the same painting+colourway+tier can
 * legitimately appear multiple times (buyer wants two of the same print).
 */
export const removeItem = (addedAt: number): void => {
  const current = ensureCache();
  setCache(current.filter((item) => item.addedAt !== addedAt));
};

export const clearBasket = (): void => {
  setCache([]);
};

// ---- React subscription --------------------------------------------------

const subscribe = (callback: () => void): (() => void) => {
  listeners.add(callback);
  // Cross-tab sync — another tab adding/removing items writes to
  // localStorage; the `storage` event fires in every *other* tab.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = reconcile(readFromStorage());
    emit();
  };
  if (isBrowser) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    if (isBrowser) window.removeEventListener("storage", onStorage);
  };
};

const getSnapshot = (): BasketItem[] => ensureCache();
const getServerSnapshot = (): BasketItem[] => [];

/**
 * Reactive hook — returns the current basket and re-renders the calling
 * component whenever any add/remove/clear happens (in this tab or another).
 */
export const useBasket = (): BasketItem[] =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
