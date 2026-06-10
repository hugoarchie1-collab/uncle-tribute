// =============================================================================
// UTM CAPTURE — first-touch campaign attribution (contract C1).
// =============================================================================
// On the first page load that arrives with any campaign parameter
// (utm_source / utm_medium / utm_campaign / utm_term / utm_content / gclid /
// fbclid), the attribution is persisted to localStorage key `tasm.utm.v1` as
//   { source, medium, campaign, term, content, gclid, fbclid, landing, ts }
// (all strings; `landing` = pathname + search; `ts` = ISO capture time).
// An EXISTING record is never overwritten — first touch wins.
//
// The stored object is attached verbatim as the optional top-level `utm`
// field on both checkout POST bodies (PaintingDetail "Buy now" single-item
// and the Basket's multi-item body). The server (api/checkout.ts) validates
// each field — optional string, trimmed, max 200 chars — and writes the
// non-empty ones into the Stripe session metadata (utm_source … utm_landing),
// so the estate can see which introductions actually lead to orders.
//
// No cookies, no third parties, no consent gate needed for the CAPTURE itself
// — it's a first-party note in the visitor's own browser; it only ever leaves
// the device inside their own checkout request.
// =============================================================================

export interface UtmRecord {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  gclid?: string;
  fbclid?: string;
  /** The first page this visit landed on — pathname + search. */
  landing?: string;
  /** ISO timestamp of capture. */
  ts?: string;
}

const STORAGE_KEY = "tasm.utm.v1";

const isBrowser = typeof window !== "undefined";

/** Trim + cap a candidate value the way the server will (max 200 chars). */
const clean = (v: string | null): string | undefined => {
  const trimmed = v?.trim();
  return trimmed ? trimmed.slice(0, 200) : undefined;
};

/**
 * Capture first-touch attribution. Called once from App.tsx on mount. A no-op
 * when no campaign parameter is present, when a record already exists (never
 * overwrite first touch), or when storage is unavailable.
 */
export const captureUtm = (): void => {
  if (!isBrowser) return;
  try {
    // First touch wins — an existing record is never overwritten.
    if (window.localStorage.getItem(STORAGE_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const record: UtmRecord = {
      source: clean(params.get("utm_source")),
      medium: clean(params.get("utm_medium")),
      campaign: clean(params.get("utm_campaign")),
      term: clean(params.get("utm_term")),
      content: clean(params.get("utm_content")),
      gclid: clean(params.get("gclid")),
      fbclid: clean(params.get("fbclid")),
    };
    // Only persist when the visit actually carries campaign attribution.
    const hasAny = Object.values(record).some((v) => v !== undefined);
    if (!hasAny) return;

    record.landing = clean(
      window.location.pathname + window.location.search,
    );
    record.ts = new Date().toISOString();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage unavailable (private mode / quota) — attribution is best-effort.
  }
};

/**
 * The stored first-touch record, or undefined if none exists. Returned as a
 * plain string-field object ready to ride on a checkout body as `utm`.
 */
export const getStoredUtm = (): UtmRecord | undefined => {
  if (!isBrowser) return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    // Keep only the contract's string fields — never forward stray keys.
    const o = parsed as Record<string, unknown>;
    const record: UtmRecord = {};
    for (const key of [
      "source",
      "medium",
      "campaign",
      "term",
      "content",
      "gclid",
      "fbclid",
      "landing",
      "ts",
    ] as const) {
      const v = o[key];
      if (typeof v === "string" && v.trim()) record[key] = v.slice(0, 200);
    }
    return Object.keys(record).length > 0 ? record : undefined;
  } catch {
    return undefined;
  }
};
