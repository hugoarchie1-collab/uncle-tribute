// =============================================================================
// MARKETING ANALYTICS — Meta Pixel + GA4, strictly consent-gated (C3 / C5).
// =============================================================================
// Lazy initialisers for the two marketing scripts. NOTHING here loads or
// fires until the visitor has explicitly allowed analytics on the consent
// banner (lib/consent.ts, `tasm.consent.v1` marketing === true), and each
// script also requires its build-time ID:
//
//   VITE_META_PIXEL_ID — Meta Pixel id (absent → Pixel never initialises)
//   VITE_GA4_ID        — GA4 measurement id (absent → gtag never initialises)
//
// Absent IDs and absent consent are both clean silent no-ops — zero console
// errors, zero network requests.
//
// GA4 runs under Consent Mode v2: ad_storage / analytics_storage /
// ad_user_data / ad_personalization all DEFAULT to "denied" before config,
// then update to "granted" — and since the script itself only loads after an
// explicit accept, the granted state is always genuinely consented.
//
// ⚠️ NO Purchase event in the browser (contract C4): the Purchase signal is
// sent server-side via the Meta Conversions API from api/stripe-webhook.ts,
// keyed on the Stripe checkout session id as event_id. Firing it here too
// would double-count. The browser sends only ViewContent / AddToCart /
// InitiateCheckout (fbq) mirrored as view_item / add_to_cart / begin_checkout
// (GA4).
// =============================================================================

import { hasMarketingConsent } from "./consent";

/** The minimal painting shape the track helpers need. `Painting` satisfies it. */
export interface TrackedPainting {
  id: string;
  title: string;
}

// fbq / gtag globals — typed loosely; both are queue-stub functions until
// their scripts arrive.
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const META_PIXEL_ID =
  (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim() || "";
const GA4_ID = (import.meta.env.VITE_GA4_ID as string | undefined)?.trim() || "";

let metaInitialised = false;
let ga4Initialised = false;

/** Inject an async external script once. */
const loadScript = (src: string): void => {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
};

/**
 * Meta Pixel — the standard fbq queue stub + fbevents.js, written out in
 * plain TS instead of the minified snippet so it lints and types cleanly.
 * Behaviourally identical: calls made before the script arrives are queued.
 */
const initMetaPixel = (): void => {
  if (metaInitialised || !META_PIXEL_ID) return;
  metaInitialised = true;
  if (!window.fbq) {
    const fbq = ((...args: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const f = fbq as any;
      if (f.callMethod) f.callMethod(...args);
      else f.queue.push(args);
    }) as ((...args: unknown[]) => void) & {
      push?: unknown;
      loaded?: boolean;
      version?: string;
      queue?: unknown[];
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
    loadScript("https://connect.facebook.net/en_US/fbevents.js");
  }
  window.fbq("init", META_PIXEL_ID);
  window.fbq("track", "PageView");
};

/**
 * GA4 via gtag.js, Consent Mode v2. The consent DEFAULT (all denied) is
 * pushed BEFORE config, then updated to granted — the required ordering even
 * though this whole function only runs post-consent.
 */
const initGa4 = (): void => {
  if (ga4Initialised || !GA4_ID) return;
  ga4Initialised = true;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    // gtag must push the Arguments object itself (not a spread array) — GA4's
    // consent-mode reader depends on it, hence `function` + `arguments`.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  }
  window.gtag("consent", "default", {
    ad_storage: "denied",
    analytics_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("consent", "update", {
    ad_storage: "granted",
    analytics_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`);
  window.gtag("js", new Date());
  window.gtag("config", GA4_ID);
};

/**
 * Initialise whatever the consent state + configured IDs allow. Called from
 * App.tsx on mount (covers a returning visitor with a stored accept) and from
 * the consent banner the moment "Allow analytics" is chosen. Safe to call
 * repeatedly — each script initialises once.
 */
export const initTrackingIfConsented = (): void => {
  if (typeof window === "undefined") return;
  if (!hasMarketingConsent()) return;
  initMetaPixel();
  initGa4();
};

// ---- Event helpers ----------------------------------------------------------
// Each helper silently no-ops without consent (and per-script without its ID).
// Values are converted pence → pounds at the edge; everything inside the site
// stays integer pence (house convention).

const pounds = (pence: number): number =>
  Math.round(pence) / 100;

/** True when events may fire at all; also lazily initialises the scripts. */
const ready = (): boolean => {
  if (typeof window === "undefined") return false;
  if (!hasMarketingConsent()) return false;
  initTrackingIfConsented();
  return true;
};

/** Painting page viewed — fbq ViewContent / GA4 view_item. */
export const trackViewContent = (
  painting: TrackedPainting,
  valuePence: number,
): void => {
  if (!ready()) return;
  const value = pounds(valuePence);
  if (META_PIXEL_ID && window.fbq) {
    window.fbq("track", "ViewContent", {
      content_ids: [painting.id],
      content_type: "product",
      value,
      currency: "GBP",
    });
  }
  if (GA4_ID && window.gtag) {
    window.gtag("event", "view_item", {
      currency: "GBP",
      value,
      items: [{ item_id: painting.id, item_name: painting.title, price: value }],
    });
  }
};

/** Added to basket — fbq AddToCart / GA4 add_to_cart. */
export const trackAddToCart = (
  painting: TrackedPainting,
  valuePence: number,
): void => {
  if (!ready()) return;
  const value = pounds(valuePence);
  if (META_PIXEL_ID && window.fbq) {
    window.fbq("track", "AddToCart", {
      content_ids: [painting.id],
      content_type: "product",
      value,
      currency: "GBP",
    });
  }
  if (GA4_ID && window.gtag) {
    window.gtag("event", "add_to_cart", {
      currency: "GBP",
      value,
      items: [{ item_id: painting.id, item_name: painting.title, price: value }],
    });
  }
};

/** Proceed-to-checkout pressed — fbq InitiateCheckout / GA4 begin_checkout. */
export const trackInitiateCheckout = (
  totalPence: number,
  itemCount: number,
): void => {
  if (!ready()) return;
  const value = pounds(totalPence);
  if (META_PIXEL_ID && window.fbq) {
    window.fbq("track", "InitiateCheckout", {
      value,
      currency: "GBP",
      num_items: itemCount,
    });
  }
  if (GA4_ID && window.gtag) {
    window.gtag("event", "begin_checkout", {
      currency: "GBP",
      value,
    });
  }
};
