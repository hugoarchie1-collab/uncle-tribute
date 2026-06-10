// =============================================================================
// BASKET RESTORE — the client half of the save-basket email link (contract C2).
// =============================================================================
// The saved-basket email's button points at
//   ${SITE_URL}/basket?restore=<payload>
// where <payload> = base64url(JSON.stringify(items)) and `items` is exactly
// the array the client POSTed to /api/email-basket:
//   [{ paintingId, colourwayName, tierId, framing, embellished }, ...]
//
// On /basket mount we decode, validate every line against the live catalogue
// (PAINTINGS / colourways / visible tiers — invalid lines drop silently),
// merge into the localStorage basket WITHOUT duplicating identical lines,
// then strip the param via history.replaceState.
//
// Why this writes localStorage directly instead of looping addItem():
//   1. addItem stamps addedAt = Date.now(); a tight loop produces COLLIDING
//      timestamps, and addedAt is the basket's line identity (React keys +
//      removeItem) — colliding stamps would remove two lines with one click.
//   2. addItem fires the global "Added to basket" toast once per line — a
//      restore should arrive quietly, not as a burst of toasts.
// So we append fully-formed lines with guaranteed-unique addedAt stamps and
// then dispatch a synthetic StorageEvent for the basket's own key, which the
// store (lib/basket.ts) already listens for — it re-reads, reconciles and
// notifies every subscriber exactly as it does for a cross-tab change.
// =============================================================================

import { getBasket, type BasketItem } from "./basket";
import { getPaintingById, getPrintTiers } from "../data/paintings";

/** Mirror of lib/basket.ts STORAGE_KEY (not exported there). */
const BASKET_STORAGE_KEY = "tasm.basket.v2";

/** A restored line, validated but not yet stamped with addedAt. */
type RestoredLine = Omit<BasketItem, "addedAt">;

/** base64url → UTF-8 string. Returns null on any malformed input. */
const decodeBase64Url = (payload: string): string | null => {
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    // Re-pad — Buffer.toString("base64url") omits the trailing '='.
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
};

/**
 * Validate one raw payload entry against the live catalogue. Returns the
 * cleaned line, or null to drop it silently (painting withdrawn, colourway
 * unavailable, tier no longer in the visible ladder, malformed entry…).
 */
const validateLine = (raw: unknown): RestoredLine | null => {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.paintingId !== "string") return null;
  if (typeof o.colourwayName !== "string") return null;

  const painting = getPaintingById(o.paintingId);
  if (!painting) return null;
  const colourway = painting.colourways.find(
    (c) => c.name === o.colourwayName && c.available,
  );
  if (!colourway) return null;
  const tier = getPrintTiers(painting).find((t) => t.id === o.tierId);
  if (!tier) return null;

  // Add-ons survive only where the tier actually prices them — mirrors how
  // api/checkout.ts silently ignores framing on tiers that don't offer it.
  const framing =
    o.framing === true && typeof tier.framingPricePence === "number";
  const embellished =
    o.embellished === true && typeof tier.embellishmentPricePence === "number";

  return {
    kind: "print",
    paintingId: painting.id,
    colourwayName: colourway.name,
    tierId: tier.id,
    ...(framing ? { framing: true } : {}),
    ...(embellished ? { embellished: true } : {}),
  };
};

/** Identity for the "no duplicates of identical lines" merge rule. */
const signature = (line: {
  paintingId: string;
  colourwayName: string;
  tierId: string;
  framing?: boolean;
  embellished?: boolean;
}): string =>
  [
    line.paintingId,
    line.colourwayName,
    line.tierId,
    line.framing === true ? "f" : "",
    line.embellished === true ? "e" : "",
  ].join("|");

/**
 * Handle a `?restore=` payload on /basket. Call once on mount; a no-op when
 * the param is absent. Always strips the param afterwards (even when every
 * line was invalid) so the URL never re-runs a stale restore.
 */
export const restoreBasketFromUrl = (): void => {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const payload = params.get("restore");
  if (!payload) return;

  try {
    const json = decodeBase64Url(payload);
    if (json) {
      const parsed = JSON.parse(json) as unknown;
      const rawItems = Array.isArray(parsed) ? parsed : [];

      // Validate + dedupe the payload itself, then drop anything the basket
      // already holds — the merge never creates duplicates of identical lines.
      const existing = new Set(getBasket().map(signature));
      const toAdd: RestoredLine[] = [];
      for (const raw of rawItems) {
        const line = validateLine(raw);
        if (!line) continue;
        const sig = signature(line);
        if (existing.has(sig)) continue;
        existing.add(sig);
        toAdd.push(line);
      }

      if (toAdd.length > 0) {
        // Append to the RAW stored array (gift lines etc. pass through
        // untouched — the store validates everything on its next read) with
        // strictly increasing addedAt stamps so line identities never collide.
        let stored: unknown[] = [];
        try {
          const raw = window.localStorage.getItem(BASKET_STORAGE_KEY);
          const parsedStored = raw ? (JSON.parse(raw) as unknown) : [];
          if (Array.isArray(parsedStored)) stored = parsedStored;
        } catch {
          stored = [];
        }
        const maxExistingStamp = stored.reduce<number>((max, item) => {
          const at =
            item && typeof item === "object"
              ? (item as Record<string, unknown>).addedAt
              : undefined;
          return typeof at === "number" && at > max ? at : max;
        }, 0);
        let stamp = Math.max(Date.now(), maxExistingStamp + 1);
        const appended = [
          ...stored,
          ...toAdd.map((line) => ({ ...line, addedAt: stamp++ })),
        ];
        window.localStorage.setItem(
          BASKET_STORAGE_KEY,
          JSON.stringify(appended),
        );
        // Wake the basket store — its storage listener re-reads, reconciles
        // and re-renders every subscriber (same path as a cross-tab change).
        window.dispatchEvent(
          new StorageEvent("storage", { key: BASKET_STORAGE_KEY }),
        );
      }
    }
  } catch {
    // Malformed payload — restore nothing; the basket is untouched.
  } finally {
    // Strip ?restore= (preserving any other params) so refresh / share / back
    // never re-runs the restore.
    try {
      params.delete("restore");
      const search = params.toString();
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + (search ? `?${search}` : "") + window.location.hash,
      );
    } catch {
      /* history unavailable — harmless, the merge already dedupes */
    }
  }
};
