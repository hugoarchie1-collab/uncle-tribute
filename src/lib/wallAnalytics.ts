// =============================================================================
// wallAnalytics.ts — "See on Your Wall" product-interaction events.
// -----------------------------------------------------------------------------
// Integrates with the SAME analytics stack as lib/tracking.ts (GA4 via
// window.gtag, consent-gated by hasMarketingConsent). These are lightweight
// GA4 custom events — NEVER camera frames, room photographs, file contents or
// any personal data; only the artwork id, size id and small enum/number values.
// No-ops silently when consent is absent or gtag has not loaded.
// =============================================================================

import { hasMarketingConsent } from "./consent";

export type WallEvent =
  | "wall_visualiser_opened"
  | "wall_visualiser_closed"
  | "ar_capability_detected"
  | "ar_supported"
  | "ar_unsupported"
  | "ar_launched"
  | "ar_launch_failed"
  | "ar_model_loaded"
  | "ar_model_failed"
  | "visualiser_size_changed"
  | "room_photo_mode_opened"
  | "room_photo_uploaded"
  | "room_photo_calibrated"
  | "returned_to_product"
  | "add_to_cart_after_visualiser";

/** Only primitive, non-personal params are permitted. */
export type WallEventParams = Record<string, string | number | boolean | undefined>;

/**
 * Fire a wall-visualiser event to GA4. Guarded so it can be called freely from
 * anywhere in the UI without a consent/gtag check at each call site.
 */
export const trackWall = (event: WallEvent, params: WallEventParams = {}): void => {
  try {
    if (typeof window === "undefined") return;
    if (!hasMarketingConsent()) return;
    const gtag = (window as Window & { gtag?: (...a: unknown[]) => void }).gtag;
    if (typeof gtag !== "function") return;
    gtag("event", event, params);
  } catch {
    /* analytics must never break the experience */
  }
};
