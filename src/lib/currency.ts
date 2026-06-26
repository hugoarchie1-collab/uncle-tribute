/**
 * Customer-facing multi-currency — display AND charge (logic + store).
 *
 * The catalogue is priced once, in GBP pence (Stripe's smallest unit), which
 * stays the single source of truth everywhere (src/data/paintings.ts). A buyer
 * can switch the *presentment* currency from the header; every price on the
 * site then re-renders in that currency, and the SAME conversion is applied
 * server-side in api/checkout.ts so the Stripe session charges in that
 * currency. The number the buyer sees is the number Stripe charges — the
 * "advertised == charged" invariant holds in every currency.
 *
 * The <CurrencyProvider> component lives in src/components/CurrencyProvider.tsx
 * (split out so this logic file stays JSX-free, matching the lib/deliverTo.ts +
 * components/DeliverTo.tsx convention). Consumers import { useCurrency } here.
 *
 * ⚠️ MIRROR (gotcha #9 family): the FX table + the convert() rounding rule are
 * duplicated in api/checkout.ts (CURRENCY_RATES / convertFromGbpMinor). They
 * MUST stay byte-identical, or the displayed price and the charged price drift.
 * When you change a rate or the rounding rule here, change it there in the same
 * commit. Both files carry a `CURRENCY_FX_VERSION` constant — bump both.
 *
 * ⚠️HUGO: the rates below are ESTATE-SET fixed rates, not a live FX feed. They
 * are deliberately fixed so a buyer is never charged a different number than the
 * one they were shown, and so the estate controls regional price points (this is
 * how most luxury houses price internationally). Review them periodically and
 * edit BOTH this file and api/checkout.ts together. They sit a touch above mid-
 * market so card-network FX on the buyer's side never makes the estate short.
 */
import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";

// Bump in BOTH files whenever the rates or rounding change, so a stale cached
// client and the server can be reconciled in logs if a mismatch is ever seen.
export const CURRENCY_FX_VERSION = "2026-06-17.1";

export type CurrencyCode = "GBP" | "USD" | "EUR" | "AUD" | "CAD";

export interface CurrencyMeta {
  code: CurrencyCode;
  /** Display symbol shown in the picker + inline. */
  symbol: string;
  /** Human label for the picker menu. */
  label: string;
  /** Intl locale used to format this currency. */
  locale: string;
  /**
   * Units of THIS currency per 1 GBP. GBP is the base (1). ⚠️HUGO: estate-set,
   * fixed. Mirror in api/checkout.ts CURRENCY_RATES.
   */
  rate: number;
}

/**
 * Supported presentment currencies. All are 2-decimal (minor = 1/100), which
 * the conversion math below assumes — do NOT add a 0-decimal currency (JPY/KRW)
 * without handling its exponent in convertFromGbpPence + api/checkout.ts.
 */
export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  GBP: { code: "GBP", symbol: "£", label: "British Pound", locale: "en-GB", rate: 1 },
  USD: { code: "USD", symbol: "$", label: "US Dollar", locale: "en-US", rate: 1.27 },
  EUR: { code: "EUR", symbol: "€", label: "Euro", locale: "en-IE", rate: 1.17 },
  AUD: { code: "AUD", symbol: "A$", label: "Australian Dollar", locale: "en-AU", rate: 1.94 },
  CAD: { code: "CAD", symbol: "C$", label: "Canadian Dollar", locale: "en-CA", rate: 1.74 },
};

export const CURRENCY_ORDER: CurrencyCode[] = ["GBP", "USD", "EUR", "AUD", "CAD"];

export const DEFAULT_CURRENCY: CurrencyCode = "GBP";

export const CURRENCY_STORAGE_KEY = "tasm.currency";

export const isCurrencyCode = (v: unknown): v is CurrencyCode =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(CURRENCIES, v);

/**
 * Convert a GBP price (in pence) into the target currency's MINOR units.
 *
 * GBP returns the exact pence (no rounding — prices are already whole pounds).
 * Every other currency is rounded to the nearest WHOLE major unit (multiple of
 * 100 minor) so converted prices read as clean, premium figures ($572, not
 * $571.50) rather than noisy decimals. This exact rule is mirrored byte-for-byte
 * in api/checkout.ts convertFromGbpMinor — the displayed amount equals the
 * Stripe charge.
 */
export const convertFromGbpPence = (gbpPence: number, code: CurrencyCode): number => {
  if (code === "GBP") return Math.round(gbpPence);
  const raw = gbpPence * CURRENCIES[code].rate; // minor units of target
  return Math.round(raw / 100) * 100; // → nearest whole major unit
};

// One Intl.NumberFormat instance per currency, reused across every price render.
// Constructing a formatter is ~70× slower than calling .format() on an existing
// one, and the commerce pages (Collections especially) format dozens of prices
// per pass + re-run them on every bundle-size switch. The locale is a pure
// function of the code, so caching by code yields byte-identical output. The map
// is bounded by the closed CurrencyCode union (≤5 entries) — no unbounded growth.
const MONEY_FORMATTERS = new Map<CurrencyCode, Intl.NumberFormat>();

/**
 * Format a GBP price (pence) in the target currency.
 *  - pretty:true drops a trailing ".00" (so "£450" / "$572", but "£12.50" keeps).
 */
/**
 * Format an ALREADY-CONVERTED amount in the target currency's MINOR units.
 * Use this for figures summed/discounted PER STRIPE LINE ITEM in presentment
 * minor units (so the displayed total equals the Stripe charge — the server
 * converts each line first, then discounts). For a single GBP-pence figure use
 * formatMoney, which converts then calls this.
 */
export const formatMinorUnits = (
  minor: number,
  code: CurrencyCode,
  opts: { pretty?: boolean } = {},
): string => {
  const major = minor / 100;
  let nf = MONEY_FORMATTERS.get(code);
  if (!nf) {
    nf = new Intl.NumberFormat(CURRENCIES[code].locale, {
      style: "currency",
      currency: code,
    });
    MONEY_FORMATTERS.set(code, nf);
  }
  const formatted = nf.format(major);
  if (opts.pretty) return formatted.replace(/[.,]00(?=\D*$)/, "");
  return formatted;
};

export const formatMoney = (
  gbpPence: number,
  code: CurrencyCode,
  opts: { pretty?: boolean } = {},
): string => formatMinorUnits(convertFromGbpPence(gbpPence, code), code, opts);

export interface CurrencyContextValue {
  code: CurrencyCode;
  meta: CurrencyMeta;
  setCode: (code: CurrencyCode) => void;
  /** GBP pence → target minor units (the amount Stripe will charge). */
  convert: (gbpPence: number) => number;
  /** GBP pence → formatted string, full ("£450.00" / "$572.00"). */
  format: (gbpPence: number) => string;
  /** GBP pence → formatted string, ".00" stripped ("£450" / "$572"). */
  formatPretty: (gbpPence: number) => string;
}

export const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/** Read the persisted choice (SSR/storage-safe). Used by the provider's lazy init. */
export const readStoredCurrency = (): CurrencyCode => {
  if (typeof window === "undefined") return DEFAULT_CURRENCY;
  try {
    const v = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    return isCurrencyCode(v) ? v : DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
};

/** Persist the choice; never throws (private mode / disabled storage). */
export const persistCurrency = (code: CurrencyCode): void => {
  try {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, code);
  } catch {
    /* selection still works for the session */
  }
};

/**
 * Build the context value for a given code + setter. Pure — the provider wraps
 * this in a useMemo so a re-render doesn't churn consumers.
 */
export const buildCurrencyValue = (
  code: CurrencyCode,
  setState: Dispatch<SetStateAction<CurrencyCode>>,
): CurrencyContextValue => ({
  code,
  meta: CURRENCIES[code],
  setCode: (next: CurrencyCode) => {
    setState(next);
    persistCurrency(next);
  },
  convert: (gbpPence: number) => convertFromGbpPence(gbpPence, code),
  format: (gbpPence: number) => formatMoney(gbpPence, code),
  formatPretty: (gbpPence: number) => formatMoney(gbpPence, code, { pretty: true }),
});

const FALLBACK_VALUE: CurrencyContextValue = {
  code: DEFAULT_CURRENCY,
  meta: CURRENCIES[DEFAULT_CURRENCY],
  setCode: () => {},
  convert: (gbpPence: number) => convertFromGbpPence(gbpPence, DEFAULT_CURRENCY),
  format: (gbpPence: number) => formatMoney(gbpPence, DEFAULT_CURRENCY),
  formatPretty: (gbpPence: number) => formatMoney(gbpPence, DEFAULT_CURRENCY, { pretty: true }),
};

/**
 * Price-formatting hook. Safe to call outside a provider (falls back to GBP) so
 * a stray component never crashes — but the provider is mounted at the App root,
 * so in practice `code` always reflects the buyer's choice.
 */
export const useCurrency = (): CurrencyContextValue => {
  return useContext(CurrencyContext) ?? FALLBACK_VALUE;
};
