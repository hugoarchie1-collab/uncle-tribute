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

/**
 * A PRINT line — one painting + one colourway + one tier (size), quantity
 * always 1. This is the original BasketItem shape, now carrying an optional
 * `kind` discriminant that is absent / "print" for every print line. Old
 * entries written before gift cards existed have no `kind` field and still
 * read as print lines, so no storage-version bump is needed.
 */
export interface BasketItem {
  /** Discriminant. Absent or "print" → a print line (back-compat). */
  kind?: "print";
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

/**
 * A GIFT-CARD line — a digital e-voucher for a chosen amount. Gift cards are
 * NOT prints: they carry no painting / colourway / tier, NO shipping, and are
 * EXCLUDED from every bundle-discount calculation (a gift card is not a print).
 * `amountPence` is the face value (== what Stripe charges == what the buyer is
 * advertised). Recipient details + a personal message are optional and ride
 * along to checkout / the fulfilment email.
 */
export interface GiftBasketItem {
  kind: "gift";
  /** Face value in integer pence (== advertised == Stripe charge). */
  amountPence: number;
  /**
   * Short human label for the denomination, e.g. "A2 Collector — £450" or
   * "Custom amount". Display + Stripe product name only — never a price source
   * (amountPence is the single source of the charge).
   */
  label: string;
  /** Optional recipient name (for the gift email + Stripe metadata). */
  recipientName?: string;
  /** Optional recipient email (for the gift email + Stripe metadata). */
  recipientEmail?: string;
  /** Optional personal message from the giver. */
  giftMessage?: string;
  addedAt: number;
}

/** Any line in the basket — a print or a gift card. */
export type BasketLine = BasketItem | GiftBasketItem;

/** Type guard — true for gift-card lines. */
export const isGiftItem = (line: BasketLine): line is GiftBasketItem =>
  (line as GiftBasketItem).kind === "gift";

/** Type guard — true for print lines (the implicit / "print" kind). */
export const isPrintItem = (line: BasketLine): line is BasketItem =>
  (line as GiftBasketItem).kind !== "gift";

// ---- Gift-card denomination bounds (custom amount) -------------------------
// Whole pounds only; min £25, max £5,000 — mirror these in src/pages/Gift.tsx
// and validate again server-side in api/checkout.ts (never trust the client).
export const GIFT_MIN_PENCE = 2500; //   £25
export const GIFT_MAX_PENCE = 500000; // £5,000

const STORAGE_KEY = "tasm.basket.v2";

// In-memory mirror of the persisted basket. We initialise on first read.
let cache: BasketLine[] | null = null;
const listeners = new Set<() => void>();

const isBrowser = typeof window !== "undefined";

const isTierId = (v: unknown): v is PrintTier["id"] =>
  v === "atelier" || v === "collector" || v === "atelier-grande" || v === "heirloom" || v === "studio";

const readFromStorage = (): BasketLine[] => {
  if (!isBrowser) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): BasketLine | null => {
        if (!item || typeof item !== "object") return null;
        const o = item as Record<string, unknown>;
        if (typeof o.addedAt !== "number") return null;

        // ---- Gift-card line ----------------------------------------------
        if (o.kind === "gift") {
          // amountPence must be a positive whole-pound integer inside bounds;
          // anything malformed drops the line silently (never trust storage).
          if (typeof o.amountPence !== "number") return null;
          const amountPence = Math.round(o.amountPence);
          if (
            !Number.isFinite(amountPence) ||
            amountPence < GIFT_MIN_PENCE ||
            amountPence > GIFT_MAX_PENCE ||
            amountPence % 100 !== 0
          ) {
            return null;
          }
          const label = typeof o.label === "string" ? o.label : "Gift card";
          const gift: GiftBasketItem = {
            kind: "gift",
            amountPence,
            label,
            ...(typeof o.recipientName === "string" && o.recipientName.trim()
              ? { recipientName: o.recipientName }
              : {}),
            ...(typeof o.recipientEmail === "string" && o.recipientEmail.trim()
              ? { recipientEmail: o.recipientEmail }
              : {}),
            ...(typeof o.giftMessage === "string" && o.giftMessage.trim()
              ? { giftMessage: o.giftMessage }
              : {}),
            addedAt: o.addedAt,
          };
          return gift;
        }

        // ---- Print line (default / "print") ------------------------------
        if (typeof o.paintingId !== "string") return null;
        if (typeof o.colourwayName !== "string") return null;
        // Defensive default — anything stored without a tierId (e.g. a v2
        // entry written by a buggy older build) reconciles to the anchor.
        const tierId: PrintTier["id"] = isTierId(o.tierId) ? o.tierId : "collector";
        const framing = o.framing === true ? true : undefined;
        const embellished = o.embellished === true ? true : undefined;
        return {
          kind: "print",
          paintingId: o.paintingId,
          colourwayName: o.colourwayName,
          tierId,
          framing,
          embellished,
          addedAt: o.addedAt,
        };
      })
      .filter((item): item is BasketLine => item !== null);
  } catch {
    return [];
  }
};

const writeToStorage = (items: BasketLine[]) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota / private mode — fail silently; the in-memory cache still works
    // for the duration of the session.
  }
};

/**
 * Drop any PRINT lines whose painting / colourway / tier no longer exist in
 * the catalogue. Returns the reconciled list. If anything was dropped (or any
 * tierId was repaired against the anchor), also writes the cleaned list back
 * to storage so the next read is cheap.
 *
 * GIFT lines are digital — they reference no painting / colourway / tier — so
 * they're never reconciled against the catalogue; they pass through untouched
 * (their face value can never "drift" against a catalogue change).
 */
const reconcile = (items: BasketLine[]): BasketLine[] => {
  const cleaned = items.filter((item) => {
    // Gift cards always survive reconciliation — nothing in the catalogue
    // governs them. (readFromStorage already validated their amount bounds.)
    if (isGiftItem(item)) return true;
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

const ensureCache = (): BasketLine[] => {
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
  /**
   * The PRINT line that was just added. Kept as `BasketItem` (not the union)
   * so the existing global toast (BasketToast) — which resolves a painting
   * title off `item.paintingId` — stays correct and unbroken. Gift-card adds
   * deliberately do NOT fire this channel (a gift has no painting to title);
   * the Gift page shows its own in-page "Added to your basket" confirmation.
   */
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

const setCache = (next: BasketLine[]) => {
  cache = next;
  writeToStorage(next);
  emit();
};

// ---- Public API ----------------------------------------------------------

/**
 * The print lines only — the HISTORICAL contract. Every existing consumer
 * (Nav badge, Basket page, OrderResult, email-basket) keeps receiving exactly
 * the `BasketItem[]` it always did, so adding gift cards never changes their
 * types or behaviour. Gift cards are NOT prints, so they're correctly absent
 * here. Gift-aware surfaces (the Gift page, a gift-aware basket render) use
 * `getBasketLines()` / `useBasketLines()` instead.
 */
export const getBasket = (): BasketItem[] => ensureCache().filter(isPrintItem);

/** Count of PRINT lines (the historical basket-count contract). */
export const getBasketCount = (): number => getBasket().length;

/** Every line — prints AND gift cards. Use the type guards to narrow. */
export const getBasketLines = (): BasketLine[] => ensureCache();

/** Count of ALL lines (prints + gift cards). */
export const getBasketLineCount = (): number => ensureCache().length;

/** Gift-card lines only. */
export const getGiftCards = (): GiftBasketItem[] =>
  ensureCache().filter(isGiftItem);

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
    kind: "print",
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
 * Add a GIFT-CARD line. `amountPence` is the face value (must be a whole-pound
 * integer between GIFT_MIN_PENCE and GIFT_MAX_PENCE) — it is BOTH the advertised
 * price AND, by construction, the amount api/checkout.ts charges via Stripe
 * price_data.unit_amount. Returns true if the line was added, false if the
 * amount failed validation (so the Gift page can surface an error). Recipient
 * name / email and a personal message are optional.
 */
export const addGiftCard = (input: {
  amountPence: number;
  label: string;
  recipientName?: string;
  recipientEmail?: string;
  giftMessage?: string;
}): boolean => {
  const amountPence = Math.round(input.amountPence);
  // Whole pounds only, within bounds — never trust the caller; the server
  // re-validates the same window in api/checkout.ts.
  if (
    !Number.isFinite(amountPence) ||
    amountPence < GIFT_MIN_PENCE ||
    amountPence > GIFT_MAX_PENCE ||
    amountPence % 100 !== 0
  ) {
    return false;
  }
  const current = ensureCache();
  const added: GiftBasketItem = {
    kind: "gift",
    amountPence,
    label: input.label.trim() || "Gift card",
    ...(input.recipientName?.trim()
      ? { recipientName: input.recipientName.trim() }
      : {}),
    ...(input.recipientEmail?.trim()
      ? { recipientEmail: input.recipientEmail.trim() }
      : {}),
    ...(input.giftMessage?.trim()
      ? { giftMessage: input.giftMessage.trim() }
      : {}),
    addedAt: Date.now(),
  };
  setCache([...current, added]);
  // Note: gift adds do NOT fire the global "Added to basket" toast channel —
  // that toast titles itself off a painting, which a gift has none of. The
  // Gift page surfaces its own in-page confirmation instead.
  return true;
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

const getSnapshot = (): BasketLine[] => ensureCache();
const getServerSnapshot = (): BasketLine[] => [];

// `useSyncExternalStore` requires referentially-STABLE snapshots between
// renders when nothing changed — a fresh `.filter()` array each call would
// loop. So the print-only + gift-only views are memoised against the last
// underlying cache array: recompute only when `ensureCache()` returns a new
// reference (which it does on every add/remove/clear and cross-tab sync).
let lastFullSnapshot: BasketLine[] | null = null;
let lastPrintSnapshot: BasketItem[] = [];
let lastGiftSnapshot: GiftBasketItem[] = [];

const refreshDerivedSnapshots = (full: BasketLine[]) => {
  if (full === lastFullSnapshot) return;
  lastFullSnapshot = full;
  lastPrintSnapshot = full.filter(isPrintItem);
  lastGiftSnapshot = full.filter(isGiftItem);
};

const getPrintSnapshot = (): BasketItem[] => {
  refreshDerivedSnapshots(ensureCache());
  return lastPrintSnapshot;
};
const getGiftSnapshot = (): GiftBasketItem[] => {
  refreshDerivedSnapshots(ensureCache());
  return lastGiftSnapshot;
};
const EMPTY_PRINTS: BasketItem[] = [];
const EMPTY_GIFTS: GiftBasketItem[] = [];

/**
 * Reactive hook — the HISTORICAL contract: returns the current PRINT lines and
 * re-renders whenever any add/remove/clear happens (in this tab or another).
 * Unchanged for every existing consumer; gift cards are excluded (they're not
 * prints). Gift-aware surfaces use `useBasketLines()` / `useGiftCards()`.
 */
export const useBasket = (): BasketItem[] =>
  useSyncExternalStore(subscribe, getPrintSnapshot, () => EMPTY_PRINTS);

/**
 * Reactive hook — the FULL basket (print + gift lines). Narrow with the
 * `isPrintItem` / `isGiftItem` type guards.
 */
export const useBasketLines = (): BasketLine[] =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

/** Reactive hook — gift-card lines only. */
export const useGiftCards = (): GiftBasketItem[] =>
  useSyncExternalStore(subscribe, getGiftSnapshot, () => EMPTY_GIFTS);
