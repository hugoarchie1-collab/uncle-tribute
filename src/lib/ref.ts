// =============================================================================
// PARTNER REFERRAL CAPTURE — first-touch attribution for the Partners programme.
// =============================================================================
// A partner shares a link like https://themandalacompany.com/?ref=JANE-STUDIO
// (or /collections/wild-rose?ref=…). On the FIRST page load that carries a
// `ref` (or `partner`) query param, the code is persisted to localStorage key
// `tasm.ref.v1` as { code, landing, ts } (all strings). An existing record is
// NEVER overwritten — first touch wins, so the partner who opened the door gets
// the credit even if the buyer browses away and returns via another route.
//
// The stored code rides verbatim as the optional top-level `ref` field on every
// checkout POST body (single-item "Buy now", the Basket's multi-item body, and
// the OrderResult re-checkout). The server (api/checkout.ts) validates it
// (string, trimmed, ≤120 chars, safe charset) and writes `partner_ref` into the
// Stripe session metadata — so the estate can see which partner introduced each
// order and settle terms privately. No numbers, no cookies, no third parties —
// a first-party note in the visitor's own browser that only ever leaves the
// device inside their own checkout request.
// =============================================================================

export interface RefRecord {
  /** The partner code, e.g. "JANE-STUDIO". */
  code: string;
  /** The first page this visit landed on — pathname + search. */
  landing?: string;
  /** ISO timestamp of capture. */
  ts?: string;
}

const STORAGE_KEY = "tasm.ref.v1";
const isBrowser = typeof window !== "undefined";

// A partner code is short and link-safe: letters, digits, dash, underscore.
// Anything else is rejected so a malformed / injected value never rides along.
const SAFE_CODE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

/** Normalise a candidate code — trim, cap length, validate the charset. */
const cleanCode = (v: string | null): string | undefined => {
  const trimmed = v?.trim();
  if (!trimmed) return undefined;
  const capped = trimmed.slice(0, 120);
  return SAFE_CODE.test(capped) ? capped : undefined;
};

/**
 * Capture the first-touch partner referral. Called once from App.tsx on mount.
 * No-op when no `ref`/`partner` param is present, when a record already exists
 * (first touch wins), or when storage is unavailable.
 */
export const captureRef = (): void => {
  if (!isBrowser) return;
  try {
    if (window.localStorage.getItem(STORAGE_KEY)) return; // first touch wins
    const params = new URLSearchParams(window.location.search);
    const code = cleanCode(params.get("ref")) ?? cleanCode(params.get("partner"));
    if (!code) return;
    const record: RefRecord = {
      code,
      landing: (window.location.pathname + window.location.search).slice(0, 200),
      ts: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage unavailable (private mode / quota) — attribution is best-effort.
  }
};

/** The stored partner code, or undefined if none exists. */
export const getStoredRef = (): string | undefined => {
  if (!isBrowser) return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    const code = (parsed as Record<string, unknown>).code;
    return typeof code === "string" ? cleanCode(code) : undefined;
  } catch {
    return undefined;
  }
};
