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
  /**
   * Optional "print on canvas" add-on. Ready-to-hang stretched canvas instead
   * of a framed/unframed paper print. Mutually exclusive with framing (a canvas
   * isn't glazed-framed). Only meaningful for tiers with canvasPricePence.
   */
  canvas?: boolean;
  /**
   * Optional CURATED canvas edge finish id (see CANVAS_EDGES). Only meaningful
   * when `canvas === true`. NO price impact — every edge is included in the one
   * canvas price — so older entries without this field reconcile cleanly with no
   * storage-version bump. Rides to checkout so the estate orders the right wrap.
   */
  canvasEdge?: string;
  /**
   * Optional Point 101 framing finishes (frame-style + glazing ids). Only
   * meaningful when `framing === true`; absent on bare-print lines. NO price
   * impact — every finish is included in the framing price, so older entries
   * without these fields reconcile cleanly with no storage-version bump.
   */
  frameStyle?: string;
  glazing?: string;
  /**
   * Optional CURATED paper finish id (see PAPER_FINISHES). Only meaningful when
   * `framing === true` (the framed print's paper base). NO price impact — every
   * finish is included in the framed price — so older entries without this field
   * reconcile cleanly with no storage-version bump. Rides to checkout so the
   * estate orders the right stock.
   */
  paperFinish?: string;
  /**
   * How many of THIS exact configuration (painting · colourway · tier · add-ons)
   * the buyer wants. Always ≥ 1. Absent on entries written before quantity
   * existed → read as 1, so no storage-version bump is needed. Each unit is a
   * separately hand-numbered print, so the checkout charges quantity × price and
   * the estate ledger issues quantity certificates for the line.
   */
  quantity: number;
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
   * Short human label for the denomination, e.g. "A2 Collector — £495" or
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
        // Canvas is mutually exclusive with framing — a canvas isn't glazed-framed.
        const canvas = o.canvas === true ? true : undefined;
        const framing = !canvas && o.framing === true ? true : undefined;
        const embellished = o.embellished === true ? true : undefined;
        // Finishes only ride along when the line is framed.
        const frameStyle =
          framing && typeof o.frameStyle === "string" ? o.frameStyle : undefined;
        const glazing =
          framing && typeof o.glazing === "string" ? o.glazing : undefined;
        const paperFinish =
          framing && typeof o.paperFinish === "string" ? o.paperFinish : undefined;
        const canvasEdge =
          canvas && typeof o.canvasEdge === "string" ? o.canvasEdge : undefined;
        // Absent / malformed quantity reconciles to 1 (back-compat, no version bump).
        const quantity =
          typeof o.quantity === "number" && Number.isFinite(o.quantity) && o.quantity >= 1
            ? Math.floor(o.quantity)
            : 1;
        return {
          kind: "print",
          paintingId: o.paintingId,
          colourwayName: o.colourwayName,
          tierId,
          framing,
          embellished,
          ...(canvas ? { canvas } : {}),
          ...(canvasEdge ? { canvasEdge } : {}),
          ...(frameStyle ? { frameStyle } : {}),
          ...(glazing ? { glazing } : {}),
          ...(paperFinish ? { paperFinish } : {}),
          quantity,
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
   * The PRINT line that was just added, when a print was added — the toast
   * resolves a painting title off `item.paintingId`. Absent for gift-card adds
   * (a gift has no painting); those carry `giftLabel` instead.
   */
  item?: BasketItem;
  /** The gift-card label, when a GIFT card was added (no painting to title). */
  giftLabel?: string;
  /** Total basket quantity AFTER this add — shown as the count on the toast. */
  quantity: number;
  /** Monotonic id so consumers can treat rapid successive adds as fresh
   *  events even when the same painting/colourway is added twice. */
  id: number;
}

const addListeners = new Set<(n: AddNotification) => void>();
let lastAddNotification: AddNotification | null = null;
let addSeq = 0;

const emitAdd = (item: BasketItem) => {
  lastAddNotification = { item, quantity: ensureCache().length, id: ++addSeq };
  for (const fn of addListeners) fn(lastAddNotification);
};

/** Fire the add-notification for a GIFT-card add (no painting to title). */
const emitGiftAdd = (giftLabel: string) => {
  lastAddNotification = { giftLabel, quantity: ensureCache().length, id: ++addSeq };
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
/** Two print lines share a configuration when everything but quantity/addedAt
 *  matches — such adds MERGE into one line (quantity += n) rather than stacking
 *  duplicate rows, so the basket reads like every best-in-class shop. */
const sameConfig = (a: BasketItem, b: BasketItem): boolean =>
  a.paintingId === b.paintingId &&
  a.colourwayName === b.colourwayName &&
  a.tierId === b.tierId &&
  !!a.framing === !!b.framing &&
  !!a.embellished === !!b.embellished &&
  !!a.canvas === !!b.canvas &&
  (a.canvasEdge ?? "") === (b.canvasEdge ?? "") &&
  (a.frameStyle ?? "") === (b.frameStyle ?? "") &&
  (a.glazing ?? "") === (b.glazing ?? "") &&
  (a.paperFinish ?? "") === (b.paperFinish ?? "");

export const addItem = (
  paintingId: string,
  colourwayName: string,
  tierId?: PrintTier["id"],
  framing?: boolean,
  embellished?: boolean,
  frameStyle?: string,
  glazing?: string,
  canvas?: boolean,
  quantity?: number,
  paperFinish?: string,
  canvasEdge?: string,
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
  const qty = quantity && Number.isFinite(quantity) && quantity >= 1 ? Math.floor(quantity) : 1;
  const added: BasketItem = {
    kind: "print",
    paintingId,
    colourwayName,
    tierId: resolvedTierId,
    // Canvas + framing are mutually exclusive — canvas wins.
    ...(canvas ? { canvas: true } : {}),
    ...(canvas && canvasEdge ? { canvasEdge } : {}),
    ...(framing && !canvas ? { framing: true } : {}),
    ...(embellished ? { embellished: true } : {}),
    ...(framing && !canvas && frameStyle ? { frameStyle } : {}),
    ...(framing && !canvas && glazing ? { glazing } : {}),
    ...(framing && !canvas && paperFinish ? { paperFinish } : {}),
    quantity: qty,
    addedAt: Date.now(),
  };
  // Merge into an existing identical line if present (quantity += qty), keeping
  // its addedAt/position; otherwise append. Either way we notify with the
  // resulting merged line so the confirmation shows the true basket quantity.
  const idx = current.findIndex(
    (l) => isPrintItem(l) && sameConfig(l as BasketItem, added),
  );
  let notify: BasketItem;
  if (idx >= 0) {
    const existing = current[idx] as BasketItem;
    notify = { ...existing, quantity: existing.quantity + qty };
    const next = current.slice();
    next[idx] = notify;
    setCache(next);
  } else {
    notify = added;
    setCache([...current, added]);
  }
  // Fire the UI add-notification AFTER the store has settled + persisted, so
  // a toast consumer reading the basket sees the new line. Wrapped so a
  // misbehaving subscriber can never break the add itself.
  try {
    emitAdd(notify);
  } catch {
    /* notification is best-effort — never let it disrupt the basket */
  }
};

/**
 * Per-line quantity ceiling. MUST match the server clamp in api/checkout.ts
 * (Math.min(99, …) on both the print and trade paths) so the basket can never
 * ADVERTISE a total the checkout won't CHARGE (audit 2026-07-28, money-mirror).
 */
export const MAX_LINE_QUANTITY = 99;

/**
 * Set a print line's quantity (basket-page stepper). Clamps to 1‥99 whole units
 * (99 = the server ceiling); to remove a line entirely use `removeItem`. No-ops
 * if the line isn't found.
 */
export const setItemQuantity = (addedAt: number, quantity: number): void => {
  const current = ensureCache();
  const qty =
    Number.isFinite(quantity) && quantity >= 1
      ? Math.min(MAX_LINE_QUANTITY, Math.floor(quantity))
      : 1;
  const idx = current.findIndex((l) => l.addedAt === addedAt && isPrintItem(l));
  if (idx < 0) return;
  const next = current.slice();
  next[idx] = { ...(current[idx] as BasketItem), quantity: qty };
  setCache(next);
};

/**
 * Change a print line's COLOURWAY in place (basket-page picker). Validates the
 * name against the painting's AVAILABLE colourways; no-ops on an unknown /
 * unavailable name or a missing line.
 *
 * ⚠️ PRICING: colourway does NOT affect a line's price — price is a function of
 * painting + tier + add-ons only, so the line total is byte-identical after a
 * swap. Bundle savings stay correct automatically: the bundle percent is derived
 * from the basket's painting/colourway CONTENTS on BOTH sides — advertised
 * (paintings.ts helpers over the live lines) and charged (api/checkout.ts
 * `bundlePercentOff`) — so a swap just re-derives the same honest percent on each
 * side (e.g. completing a colourway set turns the 5/10% count discount into the
 * 12% set discount, advertised == charged by construction). Nothing to mirror.
 */
export const setItemColourway = (addedAt: number, colourwayName: string): void => {
  const current = ensureCache();
  const idx = current.findIndex((l) => l.addedAt === addedAt && isPrintItem(l));
  if (idx < 0) return;
  const line = current[idx] as BasketItem;
  const painting = getPaintingById(line.paintingId);
  if (!painting) return;
  const cw = painting.colourways.find(
    (c) => c.name === colourwayName && c.available,
  );
  if (!cw || cw.name === line.colourwayName) return;
  const next = current.slice();
  next[idx] = { ...line, colourwayName: cw.name };
  setCache(next);
};

/** Total number of physical prints in the basket (sum of print quantities).
 *  Gift-card lines count as one each. Drives the nav badge + confirmation. */
export const getBasketTotalQuantity = (): number =>
  ensureCache().reduce(
    (sum, l) => sum + (isPrintItem(l) ? (l as BasketItem).quantity : 1),
    0,
  );

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
  // Fire the SAME global "Added to basket" toast every other add uses (Hugo
  // 2026-08-03: "when you add a gift card the popup doesn't come up — I need
  // EVERY add to pop"). Gifts carry a label instead of a painting title.
  try {
    emitGiftAdd(added.label);
  } catch {
    /* notification is best-effort — never let it disrupt the add */
  }
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

/** Reactive hook — total physical items (sum of print quantities + gift lines),
 *  for the nav basket badge + the "added" confirmation. Returns a primitive so
 *  it's snapshot-stable. */
export const useBasketTotalQuantity = (): number =>
  useSyncExternalStore(subscribe, getBasketTotalQuantity, () => 0);
