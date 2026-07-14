/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout session for either a single print order or a
 * multi-item basket. Returns the session URL — the browser redirects to
 * Stripe's hosted checkout; on success the buyer bounces back to
 * /order/success and Stripe pings /api/stripe-webhook so we can record
 * the order.
 *
 * Request body (single-item, legacy / "Buy now" button):
 *   { paintingId: string, colourwayName?: string, tierId?: TierId, framing?: boolean, embellished?: boolean }
 *
 * Request body (multi-item, basket "Proceed to checkout"):
 *   { items: [{ paintingId, colourwayName?, tierId?, framing?, embellished? }, ...] }
 *
 * Detection: presence of `items` switches to multi-item mode. The single-
 * item path is preserved byte-for-byte so the existing "Buy now" button on
 * each painting page keeps working without redeploy coordination.
 *
 * Both body shapes also accept an OPTIONAL top-level `utm` object (contract
 * C1 — first-touch attribution the client persists in localStorage
 * "tasm.utm.v1"): { source?, medium?, campaign?, term?, content?, gclid?,
 * fbclid?, landing? } — optional strings, trimmed, capped at 200 chars.
 * Non-empty fields are written into the session metadata as utm_source,
 * utm_medium, utm_campaign, utm_term, utm_content, utm_gclid, utm_fbclid,
 * utm_landing so orders are attributable in Stripe / the webhook. A missing
 * or malformed `utm` is silently ignored — it never blocks checkout.
 *
 * Pricing: `tierId` selects a rung on the canonical PRINT_TIERS ladder
 * (mirrored inline below — gotcha #5). Missing `tierId` defaults to the
 * anchor ("collector" = A2 £450). Framing is an OPTIONAL separate Stripe
 * line item priced from the tier's `framingPricePence` — only A2 + A1
 * carry a framing price; passing `framing: true` on a tier that doesn't
 * offer framing is silently ignored. The same pattern applies to
 * `embellished` — Polly Wedge hand-finishes A2 + A1 only at
 * `embellishmentPricePence` (£350 / £495); ignored on A3 / A0.
 *
 * Bundle discount: when the basket holds ≥ 2 lines we mint a single-use
 * Stripe coupon and apply it via `discounts`. The percent is derived from
 * the basket CONTENTS, server-side, by `bundlePercentOff`:
 *   • one print of EVERY painting (complete catalogue)     → 15%
 *   • all lines a SINGLE painting (complete colourway set) → 12%
 *   • 3+ mixed paintings → 10%; 2 mixed → 5%.
 * Mirrors src/data/paintings.ts (COMPLETE_CATALOGUE_DISCOUNT_PERCENT 15,
 * COLOURWAY_SET_DISCOUNT_PERCENT 12, bundleDiscountPercentForCount 5/10) —
 * gotcha #9. Failures are swallowed — never block checkout on a mint failure.
 *
 * Response 200: { url: string }      — redirect the browser here
 *          400: { error: string }    — validation failure
 *          500: { error: string }    — server / Stripe failure
 *
 * Required env vars on Vercel:
 *   STRIPE_SECRET_KEY   – sk_live_…
 *   SITE_URL            – e.g. https://themandalacompany.com (no trailing slash)
 *
 * This file is intentionally self-contained — no cross-directory imports
 * — so Vercel's serverless bundler doesn't need to chase TS files outside
 * /api at build or runtime (gotcha #5 in CLAUDE.md). Painting metadata
 * AND the tier price ladder are duplicated here from src/data/paintings.ts;
 * keep the two in sync when adding paintings or adjusting prices.
 */

import Stripe from "stripe";

// ---- Tier ladder (mirror of src/data/paintings.ts PRINT_TIERS) ----------
// IMPORTANT: keep prices in sync with src/data/paintings.ts PRINT_TIERS.
// Gotcha #9 in CLAUDE.md — pricing lives in two places.
type TierId = "atelier" | "collector" | "atelier-grande" | "heirloom" | "studio";

interface TierDef {
  id: TierId;
  label: string;
  size: string;
  pricePence: number;
  editionLabel: string;
  framingPricePence?: number;
  embellishmentPricePence?: number;
  available: boolean;
  // True for the Studio one-off — it IS the hand-finished piece, so it
  // never carries framing / embellishment add-on line items.
  isOneOff?: boolean;
}

const TIERS: Record<TierId, TierDef> = {
  atelier: {
    id: "atelier",
    label: "Open Edition",
    size: "A3 (29.5 × 29.5 cm)",
    pricePence: 27500,
    editionLabel: "Open Edition — unnumbered, issued to order",
    available: true,
  },
  collector: {
    id: "collector",
    label: "Collector Edition",
    size: "A2 (42 × 42 cm)",
    pricePence: 49500,
    editionLabel: "Collector Edition — edition of 200, hand-numbered",
    framingPricePence: 34500,
    embellishmentPricePence: 35000,
    available: true,
  },
  "atelier-grande": {
    id: "atelier-grande",
    label: "Atelier Edition",
    size: "A1 (59.5 × 59.5 cm)",
    pricePence: 92500,
    editionLabel: "Atelier Edition — edition of 75, hand-numbered",
    framingPricePence: 44500,
    embellishmentPricePence: 49500,
    available: true,
  },
  heirloom: {
    id: "heirloom",
    label: "Heirloom Edition",
    size: "A0 (84 × 84 cm)",
    pricePence: 189500,
    editionLabel: "Heirloom Edition — edition of 18, hand-numbered",
    // ENABLED 2026-06-06 — Point 101 A0 fulfilment confirmed. £1,895 charged
    // price; mirrors src/data/paintings.ts PRINT_TIERS["heirloom"].pricePence.
    // Hand-finish enabled on A0 (2026-07-14); FRAMING intentionally NOT offered
    // (glazed A0 exceeds Point 101's 610mm delivery cap — see paintings.ts).
    embellishmentPricePence: 79500,
    available: true,
  },
  studio: {
    // Studio one-off — £2,450 unique hand-painted piece by Polly Wedge. No
    // framing / embellishment price: it IS the hand-finished work, so a
    // "studio" tierId produces a single £2,450 line item with no add-ons.
    id: "studio",
    label: "Original — One of One",
    size: "A1 (59.5 × 59.5 cm)",
    pricePence: 265000,
    editionLabel: "Unique — one of one",
    isOneOff: true,
    available: true,
  },
};

// Per-painting LANDSCAPE size overrides. Ophiuchus is the one non-square work
// (image 2000×1622 ≈ 1.233:1), so its prints carry landscape dimensions on the
// SAME A-series sheet — same tier ids / prices / editions, only the printed cm
// differ. Mirror of OPHIUCHUS_TIER_SIZE in src/data/paintings.ts and the same
// map in api/stripe-webhook.ts + api/email-basket.ts (gotcha #9) so the size
// the buyer sees and Point 101 is asked to print match the product page.
const PAINTING_TIER_SIZE: Record<string, Partial<Record<TierId, string>>> = {
  ophiuchus: {
    atelier: "A3 (36.4 × 29.5 cm)",
    collector: "A2 (51.8 × 42 cm)",
    "atelier-grande": "A1 (73.4 × 59.5 cm)",
    heirloom: "A0 (103.6 × 84 cm)",
    studio: "A1 (73.4 × 59.5 cm)",
  },
};

/** The printed size for a painting at a tier — a per-painting override (e.g.
 *  Ophiuchus landscape) if present, else the square ladder default. */
const sizeFor = (paintingId: string, tier: TierDef): string =>
  PAINTING_TIER_SIZE[paintingId]?.[tier.id] ?? tier.size;

const DEFAULT_TIER_ID: TierId = "collector"; // anchor tier (A2 £450)

// ---- Cost floors (#13) — mirror of src/data/paintings.ts ------------------
// ⚠️⚠️⚠️ HUGO: EVERY NUMBER HERE IS A RESEARCH ESTIMATE, NOT A REAL INVOICE.
// These are the CONSERVATIVE (low-end) fully-loaded unit costs from the
// 2026-05-31 pricing research — deliberately the cheapest-but-still-real cost
// so a floor can never sit above a true cost. REPLACE with your actual figures
// (Point 101 print cost per size, framer's frame cost, Polly's real hours ×
// rate) before trusting the never-below-cost guarantee. At today's ~92% retail
// margins these floors NEVER bind — the guard below is a safe no-op cap that
// only ever REDUCES a discount and logs if it would breach; it never raises a
// price and never blocks checkout. MUST stay in sync with
// src/data/paintings.ts COST_FLOOR_PENCE / FRAME_COST_FLOOR_PENCE /
// EMBELLISH_COST_FLOOR_PENCE (gotcha #9 — pricing lives in two places).
const COST_FLOOR_PENCE: Record<TierId, { printFloor: number }> = {
  atelier: { printFloor: 1200 }, //  A3 — £12
  collector: { printFloor: 2200 }, //  A2 — £22
  "atelier-grande": { printFloor: 4300 }, //  A1 — £43
  heirloom: { printFloor: 8000 }, //  A0 — £80 [DARK tier]
  studio: { printFloor: 16000 }, //  A1 unique — ⚠️£160+ placeholder (Polly's real hours)
};
const FRAME_COST_FLOOR_PENCE: Partial<Record<TierId, number>> = {
  collector: 4500, //  A2 frame cost £45 (LOW end)
  "atelier-grande": 15000, //  A1 frame cost £150 (LOW end)
};
const EMBELLISH_COST_FLOOR_PENCE: Partial<Record<TierId, number>> = {
  collector: 3500, //  A2 hand-finish cost £35 (LOW end)
  "atelier-grande": 6500, //  A1 hand-finish cost £65 (LOW end)
};

// Never sell below cost; recommend never below 10% margin. 1.0 = "never below
// cost" exactly; 1.10 = "never below a 10% margin". Conservatively 1.0 here so
// the guard is a pure never-below-cost backstop and never trims a legitimate
// prestige discount at today's margins. ⚠️HUGO: raise toward 1.10 once the
// floors above are real if you also want a guaranteed minimum margin.
const FLOOR_SAFETY = 1.0;

/**
 * Fully-loaded cost floor (pence) for one configured line: print floor for the
 * tier + frame floor if framed + embellish floor if hand-finished. The hard
 * "never sell below" total the margin guard checks each discounted line
 * against. Mirrors lineCostFloorPence in src/data/paintings.ts (gotcha #9).
 */
const lineCostFloorPence = (item: NormalisedItem): number => {
  const print = COST_FLOOR_PENCE[item.tier.id]?.printFloor ?? 0;
  const frame = item.framing ? FRAME_COST_FLOOR_PENCE[item.tier.id] ?? 0 : 0;
  const embellish = item.embellished
    ? EMBELLISH_COST_FLOOR_PENCE[item.tier.id] ?? 0
    : 0;
  return print + frame + embellish;
};

/**
 * The full retail (undiscounted) price of one configured line (pence): the
 * tier price plus any add-on line items that ride along under the bundle
 * coupon's percent_off. Used by the margin-floor guard to compute the
 * discounted line total.
 */
const lineRetailPence = (item: NormalisedItem): number => {
  let total = item.tier.pricePence;
  if (item.framing && typeof item.tier.framingPricePence === "number") {
    total += item.tier.framingPricePence;
  }
  if (
    item.embellished &&
    typeof item.tier.embellishmentPricePence === "number"
  ) {
    total += item.tier.embellishmentPricePence;
  }
  return total;
};

// Boilerplate spec line used in Stripe product description.
const PRINT_SPEC =
  "Estate-stamped by The Mandala Company, numbered within its edition. Ships with a Certificate of Authenticity carrying a unique Certificate ID. Printed at our London atelier.";

// The edition the catalogue is currently issuing under (mirror of
// CURRENT_EDITION in src/data/paintings.ts — gotcha #5 forbids importing it
// here). Surfaced on the Stripe line so each checkout line reads "… · First
// Edition".
const EDITION_LABEL = "First Edition";

// Hard cap on a single Stripe checkout — sane upper bound for a 10-painting
// catalogue; protects against an absurd POST body from a broken client.
const MAX_ITEMS = 20;

// ---- Presentment currency (mirror of src/lib/currency.tsx) ----------------
// The catalogue is priced in GBP pence (the source of truth). A buyer can pick
// a presentment currency in the header; the client forwards `currency` on the
// checkout body, and we charge the Stripe session in that currency at the SAME
// converted amount the buyer was shown — so advertised == charged in every
// currency. ⚠️ MIRROR (gotcha #9 family): CURRENCY_RATES + the convert rule +
// CURRENCY_FX_VERSION below MUST stay byte-identical to src/lib/currency.tsx
// (CURRENCIES[*].rate / convertFromGbpPence / CURRENCY_FX_VERSION). Change both
// in the same commit or the displayed price and the charged price drift.
// ⚠️HUGO: these are ESTATE-SET fixed rates, not a live feed — see the note in
// src/lib/currency.tsx. All supported currencies are 2-decimal.
const CURRENCY_FX_VERSION = "2026-06-17.1";
type CurrencyCode = "gbp" | "usd" | "eur" | "aud" | "cad";
const CURRENCY_RATES: Record<CurrencyCode, number> = {
  gbp: 1,
  usd: 1.27,
  eur: 1.17,
  aud: 1.94,
  cad: 1.74,
};
const isCurrencyCode = (v: unknown): v is CurrencyCode =>
  typeof v === "string" &&
  Object.prototype.hasOwnProperty.call(CURRENCY_RATES, v.toLowerCase());

/**
 * Convert a GBP price (pence) into the target currency's MINOR units. GBP is
 * exact; every other currency rounds to the nearest WHOLE major unit (multiple
 * of 100 minor) so the figure reads clean ($572, not $571.50). EXACT mirror of
 * convertFromGbpPence in src/lib/currency.tsx — keep both rules identical.
 */
const convertFromGbpMinor = (gbpPence: number, code: CurrencyCode): number => {
  if (code === "gbp") return Math.round(gbpPence);
  const raw = gbpPence * CURRENCY_RATES[code];
  return Math.round(raw / 100) * 100;
};

// ---- Gift-card bounds (mirror of src/lib/basket.ts) -----------------------
// Whole pounds only; min £25, max £5,000. Re-validated here so a tampered
// client can never mint a gift line outside the advertised window. The
// advertised gift price (UI) === the charged price (price_data.unit_amount ===
// this same amountPence) by construction — there is no separate price table.
const GIFT_MIN_PENCE = 2500; //   £25
const GIFT_MAX_PENCE = 500000; // £5,000

// Stripe per-metadata-value cap (re-stated near use for the gift fields).
// Recipient name / message are user-supplied, so they're trimmed to fit.
const giftMetaTrim = (v: string): string =>
  v.length <= STRIPE_METADATA_VALUE_LIMIT
    ? v
    : `${v.slice(0, STRIPE_METADATA_VALUE_LIMIT - 1)}…`;

// Stripe caps each metadata value at 500 characters. We truncate gracefully
// when concatenating IDs / colourways across a multi-item basket.
const STRIPE_METADATA_VALUE_LIMIT = 500;

// Allowlist of valid painting IDs so a malicious caller can't create a
// checkout for an arbitrary string. If you add a painting in
// src/data/paintings.ts, add its id here too.
const VALID_PAINTING_IDS = new Set<string>([
  "wild-rose",
  "english-bluebells",
  "orchis-7",
  "flower-of-life",
  "slipper-orchids",
  "peacock-minerva",
  "ophiuchus",
  "tridecagon-moon-star",
  "lulin",
  "enneagon-swans",
]);

// Distinct paintings in the catalogue. A basket containing at least one line of
// every painting qualifies as the "complete catalogue" set (15% — see
// bundlePercentOff). Derived so it tracks the allowlist automatically.
const CATALOGUE_PAINTING_COUNT = VALID_PAINTING_IDS.size;

// Pretty titles for the Stripe line-item. Falls back to the ID if missing.
const PAINTING_TITLES: Record<string, string> = {
  "wild-rose": "Mandala of Wild Rose",
  "english-bluebells": "Mandala of English Bluebells",
  "orchis-7": "Orchis 7",
  "flower-of-life": "Flower of Life",
  "slipper-orchids": "Slipper Orchids",
  "peacock-minerva": "Peacock Minerva",
  "ophiuchus": "Ophiuchus",
  "tridecagon-moon-star": "Tridecagon Moon Star",
  "lulin": "Lulin",
  "enneagon-swans": "Enneagon — The Swans",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Minimal structural types for Vercel's Node (req, res) handler signature.
// We use the Node signature — NOT the Web Request/Response one — because the
// Web handler's returned Response was not being delivered in this project's
// Vercel runtime: requests hung with a "default export return" warning and
// never replied (status "-"), tripping the client's 15s timeout. The Node
// signature with res.json() always delivers. Typed inline to keep the file
// self-contained (gotcha #5) — no @vercel/node import; Vercel supplies the
// real objects at runtime.
interface VercelReq {
  method?: string;
  body?: unknown;
}
interface VercelRes {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
}

const isTierId = (v: unknown): v is TierId =>
  v === "atelier" ||
  v === "collector" ||
  v === "atelier-grande" ||
  v === "heirloom" ||
  v === "studio";

// Point 101 framing-finish labels — a LABELS-ONLY mirror of FRAME_STYLES /
// GLAZING_OPTIONS in src/data/paintings.ts (gotcha #9, but NO money: there is
// no per-finish charge, so a label drift is cosmetic, never a pricing bug).
// An unknown / missing id falls back to the first (default) finish.
const FRAME_STYLE_LABELS: Record<string, string> = {
  "natural-oak": "Natural oak",
  "stained-black": "Stained black",
  white: "White",
  "walnut-tray": "Walnut",
};
const GLAZING_LABELS: Record<string, string> = {
  "art-acrylic": "Art acrylic",
  "museum-glass": "Anti-reflective glazing",
};

interface NormalisedItem {
  paintingId: string;
  colourway: string;
  title: string;
  tier: TierDef;
  framing: boolean;     // true only if framing is offered AND requested
  embellished: boolean; // true only if hand-finishing is offered AND requested
  // Framing finishes (display labels) — only set when framing === true. These
  // ride into the Stripe line item so the estate knows which frame to order;
  // they carry NO price (every finish is included in framingPricePence).
  frameStyle?: string;
  glazing?: string;
}

const normaliseItem = (
  paintingId: string | undefined,
  colourwayName: string | undefined,
  tierIdRaw: unknown,
  framingRaw: unknown,
  embellishedRaw: unknown,
  frameStyleRaw?: unknown,
  glazingRaw?: unknown,
): NormalisedItem | { error: string } => {
  if (!paintingId || !VALID_PAINTING_IDS.has(paintingId)) {
    return { error: `Unknown painting "${paintingId ?? ""}".` };
  }
  // Default missing tierId to the anchor so clients pre-deploy keep working.
  const tierId: TierId = isTierId(tierIdRaw) ? tierIdRaw : DEFAULT_TIER_ID;
  const tier = TIERS[tierId];
  if (!tier || !tier.available) {
    return { error: `Tier "${tierId}" is not available.` };
  }
  const colourway = colourwayName?.trim() || "Original";
  const title = PAINTING_TITLES[paintingId] ?? paintingId;
  // Framing requested only counts if the tier actually offers it.
  const framing = framingRaw === true && typeof tier.framingPricePence === "number";
  // Hand-embellishment requested only counts if the tier actually offers it.
  const embellished =
    embellishedRaw === true && typeof tier.embellishmentPricePence === "number";
  // Framing finishes — only when framed; an unknown id falls back to the
  // default finish so a stale / malformed client can never break the line.
  const frameStyle = framing
    ? (FRAME_STYLE_LABELS[String(frameStyleRaw)] ?? FRAME_STYLE_LABELS["natural-oak"])
    : undefined;
  const glazing = framing
    ? (GLAZING_LABELS[String(glazingRaw)] ?? GLAZING_LABELS["art-acrylic"])
    : undefined;
  return {
    paintingId,
    colourway,
    title,
    tier,
    framing,
    embellished,
    frameStyle,
    glazing,
  };
};

// ---- Gift-card normalisation ----------------------------------------------
// A gift card is a DIGITAL e-voucher: no painting, no tier, no shipping, and
// never eligible for a bundle discount (it's not a print). The charged amount
// is taken straight from the client's `amountPence`, but ONLY after it clears
// the same whole-pound / min / max window the UI advertised — so the price the
// buyer was shown is exactly the price Stripe charges.
interface NormalisedGift {
  amountPence: number;
  label: string;
  recipientName: string;
  recipientEmail: string;
  giftMessage: string;
}

const normaliseGift = (raw: {
  amountPence?: unknown;
  label?: unknown;
  recipientName?: unknown;
  recipientEmail?: unknown;
  giftMessage?: unknown;
}): NormalisedGift | { error: string } => {
  // Coerce a numeric or numeric-string amount; reject anything else.
  const amountRaw =
    typeof raw.amountPence === "number"
      ? raw.amountPence
      : typeof raw.amountPence === "string"
        ? Number.parseInt(raw.amountPence, 10)
        : Number.NaN;
  const amountPence = Math.round(amountRaw);
  if (
    !Number.isFinite(amountPence) ||
    amountPence < GIFT_MIN_PENCE ||
    amountPence > GIFT_MAX_PENCE ||
    amountPence % 100 !== 0 // whole pounds only
  ) {
    return {
      error: `Gift amount must be a whole £ figure between £${
        GIFT_MIN_PENCE / 100
      } and £${GIFT_MAX_PENCE / 100}.`,
    };
  }
  // Label is display-only; default to the amount if the client omitted it. The
  // amount — never the label — is the price source.
  const labelRaw = typeof raw.label === "string" ? raw.label.trim() : "";
  const label = labelRaw || `£${(amountPence / 100).toFixed(0)} gift card`;
  const recipientName =
    typeof raw.recipientName === "string" ? raw.recipientName.trim() : "";
  const recipientEmail =
    typeof raw.recipientEmail === "string" ? raw.recipientEmail.trim() : "";
  const giftMessage =
    typeof raw.giftMessage === "string" ? raw.giftMessage.trim() : "";
  return { amountPence, label, recipientName, recipientEmail, giftMessage };
};

/**
 * Truncate a comma-joined metadata string so it stays under Stripe's 500-
 * char per-value cap. We trim at the last complete entry boundary so we
 * never leave a half-painting-id behind, and append a "…+N more" tail so
 * the operator can see at a glance there was overflow.
 */
const truncateMetadata = (parts: string[]): string => {
  const full = parts.join(", ");
  if (full.length <= STRIPE_METADATA_VALUE_LIMIT) return full;
  let acc = "";
  let used = 0;
  for (const part of parts) {
    const tail = ` …+${parts.length - used} more`;
    const candidate = used === 0 ? part : `${acc}, ${part}`;
    if (candidate.length + tail.length > STRIPE_METADATA_VALUE_LIMIT) {
      return `${acc}${tail}`;
    }
    acc = candidate;
    used += 1;
  }
  return acc;
};

// ---- UTM attribution (contract C1, server half) ---------------------------
// The client captures first-touch attribution once (localStorage
// "tasm.utm.v1") and forwards it verbatim as an OPTIONAL top-level `utm`
// object on BOTH body shapes. Validation: each field is an optional string,
// trimmed, capped at UTM_MAX_LEN chars; everything else is ignored. Only
// non-empty fields become metadata keys, so a clean direct visit adds zero
// keys. 200 chars sits comfortably under Stripe's 500-char per-value cap,
// and 8 extra keys on top of the order metadata (~17 keys worst case) stays
// well under Stripe's 50-key cap. Never blocks checkout — a malformed `utm`
// simply contributes nothing.
const UTM_MAX_LEN = 200;
const UTM_FIELDS = [
  ["source", "utm_source"],
  ["medium", "utm_medium"],
  ["campaign", "utm_campaign"],
  ["term", "utm_term"],
  ["content", "utm_content"],
  ["gclid", "utm_gclid"],
  ["fbclid", "utm_fbclid"],
  ["landing", "utm_landing"],
] as const;

const utmMetadata = (raw: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return out;
  }
  const obj = raw as Record<string, unknown>;
  for (const [field, key] of UTM_FIELDS) {
    const value = obj[field];
    if (typeof value !== "string") continue;
    const trimmed = value.trim().slice(0, UTM_MAX_LEN);
    if (trimmed) out[key] = trimmed;
  }
  return out;
};

/**
 * The bundle discount percent for a basket, derived from its CONTENTS (never
 * trusted from the client). Mirrors src/data/paintings.ts (gotcha #9):
 *   • every painting present (distinct ids === whole catalogue) → 15%
 *   • all lines one painting (a complete colourway set)         → 12%
 *   • 3+ mixed paintings → 10%; 2 → 5%; fewer → 0 (no bundle).
 * Returns the single best-qualifying percent.
 */
const bundlePercentOff = (items: NormalisedItem[]): number => {
  const count = items.length;
  if (count < 2) return 0;
  const distinct = new Set(items.map((i) => i.paintingId)).size;
  if (distinct >= CATALOGUE_PAINTING_COUNT) return 15; // complete catalogue
  if (distinct === 1) return 12;                       // complete colourway set
  return count >= 3 ? 10 : 5;                           // general / collection bundle
};

/**
 * Compute the shipping options for a session.
 *
 * FREE SHIPPING POLICY (2026-06-06) — the estate absorbs ALL delivery cost into
 * the ~90% print margin rather than charging the buyer or raising print prices.
 * Every region (UK, Europe, Worldwide) ships FREE — for BOTH unframed AND framed
 * orders. Each band is a `fixed_amount` of £0, so Stripe shows a "Free" line and
 * the charged shipping is £0 to the penny, matching the basket / product-page
 * preview (advertised == charged invariant).
 *
 * Why this is absorbable (2026-05-31 delivery-cost research, conservative low-end
 * estate costs vs retail): UK delivery to the buyer is £0 on unframed prints
 * (Point 101 includes free tracked UK delivery inside the print COGS) and only
 * ~£10-25 boxed on framed; even the worst case — an A1 frame shipped to the US
 * (~£65 delivery) on a £1,245 sale — still clears ~78% margin. Nothing here
 * threatens the 90% target on the prints themselves, so a flat free-shipping
 * policy is the simplest, most dignified choice and removes all framed-surcharge
 * complexity (no per-tier surcharge, no DMCC drip-pricing disclosure needed).
 *
 * `items` is retained in the signature (call-site compatibility) even though the
 * rate no longer depends on the basket contents — every order ships free.
 *
 * `currency` MUST match the session currency (Stripe rejects a shipping rate in
 * a different currency than the line items). Every band is £0 → 0 in any
 * currency, so the displayed "Free" is exact regardless of presentment currency.
 */
const buildShippingOptions = (_items: NormalisedItem[], currency: CurrencyCode) => [
  {
    shipping_rate_data: {
      type: "fixed_amount" as const,
      fixed_amount: { amount: 0, currency },
      display_name: "United Kingdom — free delivery (5-7 working days)",
    },
  },
  {
    shipping_rate_data: {
      type: "fixed_amount" as const,
      fixed_amount: { amount: 0, currency },
      display_name: "Europe — free delivery (7-10 working days)",
    },
  },
  {
    shipping_rate_data: {
      type: "fixed_amount" as const,
      fixed_amount: { amount: 0, currency },
      display_name: "Worldwide — free delivery (10-14 working days)",
    },
  },
];

export default async function handler(req: VercelReq, res: VercelRes) {
  // CORS on every response.
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.setHeader(key, value);
  }
  // Local send helper — writes to res so the Node runtime actually delivers
  // the response (the old Response-returning json() helper did not).
  const send = (status: number, payload: unknown) => {
    res.status(status).json(payload);
  };

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") return send(405, { error: "Method not allowed" });

  const secret = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.SITE_URL;
  if (!secret) return send(500, { error: "Server missing STRIPE_SECRET_KEY." });
  if (!siteUrl) return send(500, { error: "Server missing SITE_URL." });

  // Vercel's Node runtime parses a JSON request body into req.body. Handle
  // both the parsed-object case and a raw-string fallback defensively.
  let body: {
    paintingId?: string;
    colourwayName?: string;
    tierId?: unknown;
    framing?: unknown;
    embellished?: unknown;
    frameStyle?: unknown;
    glazing?: unknown;
    items?: Array<{
      kind?: unknown;
      paintingId?: string;
      colourwayName?: string;
      tierId?: unknown;
      framing?: unknown;
      embellished?: unknown;
      frameStyle?: unknown;
      glazing?: unknown;
      // Gift-card line fields (kind === "gift"):
      amountPence?: unknown;
      label?: unknown;
      recipientName?: unknown;
      recipientEmail?: unknown;
      giftMessage?: unknown;
    }>;
    // First-touch attribution (contract C1) — optional on BOTH body shapes.
    utm?: unknown;
    // Presentment currency (mirror of src/lib/currency.tsx). Optional; invalid
    // / missing defaults to GBP. The session is charged in this currency at the
    // converted amount the buyer was shown.
    currency?: unknown;
    // Order-level add-on bumps (chosen on the basket page) — each a single flat
    // line item. Mirror the pence values in src/pages/Basket.tsx ORDER_BUMPS.
    giftWrap?: unknown;
    careKit?: unknown;
  };
  try {
    body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : ((req.body ?? {}) as typeof body);
  } catch {
    return send(400, { error: "Invalid JSON body." });
  }

  // ---- Normalise items ----------------------------------------------------
  // Multi-item mode if `items` is present; otherwise single-item legacy.
  const rawItems = Array.isArray(body.items)
    ? body.items
    : [
        {
          paintingId: body.paintingId,
          colourwayName: body.colourwayName,
          tierId: body.tierId,
          framing: body.framing,
          embellished: body.embellished,
          frameStyle: body.frameStyle,
          glazing: body.glazing,
        },
      ];

  if (rawItems.length === 0) {
    return send(400, { error: "Basket is empty." });
  }
  if (rawItems.length > MAX_ITEMS) {
    return send(400, { error: `Too many items (max ${MAX_ITEMS}).` });
  }

  // Presentment currency — validated against the mirror table; anything else
  // (incl. absent) falls back to GBP. `toMinor` converts a GBP-pence figure to
  // this currency's minor units, matching what the buyer saw on the site.
  const currencyCode: CurrencyCode = isCurrencyCode(body.currency)
    ? ((body.currency as string).toLowerCase() as CurrencyCode)
    : "gbp";
  const toMinor = (gbpPence: number): number =>
    convertFromGbpMinor(gbpPence, currencyCode);

  // Order-level add-on bumps (GBP pence) — mirror src/pages/Basket.tsx ORDER_BUMPS.
  const GIFT_WRAP_PENCE = 2500; // £25
  const CARE_KIT_PENCE = 2000; // £20

  // Split + normalise. A line with kind === "gift" is a digital gift card;
  // everything else is a print (kind absent / "print" — preserves the legacy
  // single-item + basket bodies byte-for-byte).
  const normalised: NormalisedItem[] = []; // print lines (drive shipping + bundle)
  const gifts: NormalisedGift[] = []; // gift-card lines (digital, no shipping)
  for (const raw of rawItems) {
    if (raw?.kind === "gift") {
      const result = normaliseGift(raw);
      if ("error" in result) return send(400, result);
      gifts.push(result);
      continue;
    }
    const result = normaliseItem(
      raw?.paintingId,
      raw?.colourwayName,
      raw?.tierId,
      raw?.framing,
      raw?.embellished,
      raw?.frameStyle,
      raw?.glazing,
    );
    if ("error" in result) return send(400, result);
    normalised.push(result);
  }

  // A basket of ONLY gift cards needs NO shipping address / options.
  const giftOnly = normalised.length === 0 && gifts.length > 0;

  // ---- Build Stripe line items -------------------------------------------
  // One line per print, plus an OPTIONAL separate line per framing add-on so
  // the buyer sees the framing charge explicitly and accounting stays clean.
  type LineItem = {
    quantity: number;
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: {
        name: string;
        description: string;
      };
    };
  };
  const lineItems: LineItem[] = [];
  for (const item of normalised) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: currencyCode,
        unit_amount: toMinor(item.tier.pricePence),
        product_data: {
          name: `${item.title} — ${item.colourway} — ${item.tier.label} ${item.tier.size.split(" ")[0]}${item.tier.isOneOff ? "" : ` · ${EDITION_LABEL}`}`,
          description: `${sizeFor(item.paintingId, item.tier)}. ${item.tier.editionLabel}.${item.tier.isOneOff ? "" : ` Issued in the ${EDITION_LABEL}.`} ${PRINT_SPEC}`,
          // No product_data.images — Stripe synchronously fetches each image
          // URL when creating the session, and an unreachable / slow image
          // can hang the call (gotcha #3 in CLAUDE.md).
        },
      },
    });
    if (item.framing && typeof item.tier.framingPricePence === "number") {
      // The buyer's chosen finish (frame style + glazing) is named on the line
      // so it appears on Stripe checkout, the receipt AND the dashboard order
      // the estate works from when placing the Point 101 frame order. No price
      // impact — every finish is included in framingPricePence.
      const finish =
        item.frameStyle && item.glazing
          ? `${item.frameStyle} frame · ${item.glazing}`
          : "Bespoke frame";
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: currencyCode,
          unit_amount: toMinor(item.tier.framingPricePence),
          product_data: {
            name: `Framing — ${finish} — ${item.title} (${item.tier.label} ${item.tier.size.split(" ")[0]})`,
            description: `${finish}, conservation-mounted and ready to hang. Hand-finished for the ${item.tier.label} edition.`,
          },
        },
      });
    }
    if (
      item.embellished &&
      typeof item.tier.embellishmentPricePence === "number"
    ) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: currencyCode,
          unit_amount: toMinor(item.tier.embellishmentPricePence),
          product_data: {
            name: `Hand-finished by Polly Wedge — ${item.title} (${item.tier.label} ${item.tier.size.split(" ")[0]})`,
            // Mirror of EMBELLISHMENT_NOTE in src/data/paintings.ts (gotcha #9 —
            // the add-on label + wording lives in several places). Lead time is
            // "up to two weeks" (reduced from 4 weeks 2026-06-04); keep this in
            // sync with api/stripe-webhook.ts + PaintingDetail FINISH_LEAD_WEEKS.
            description:
              "Hand-finished in Stephen's geometric tradition by Polly Wedge (estate). Made by hand and to order — please allow up to two weeks.",
          },
        },
      });
    }
  }

  // ---- Gift-card line items ----------------------------------------------
  // Each gift card is one Stripe line item priced via price_data with
  // unit_amount === the buyer's chosen amountPence — so the advertised gift
  // value equals the Stripe charge to the penny. Digital: no shipping, and NOT
  // caught by the bundle coupon (the coupon is only minted off `normalised`,
  // the print lines — see bundlePercentOff(normalised) below).
  for (const gift of gifts) {
    const toLine = gift.recipientName
      ? ` for ${gift.recipientName}`
      : "";
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: currencyCode,
        unit_amount: toMinor(gift.amountPence), // advertised == charged
        product_data: {
          name: `Gift card — ${gift.label}`,
          description:
            `A digital gift card towards any of Stephen Meakin's editions${toLine}.` +
            " Redeemable at checkout against a print of the recipient's choosing.",
        },
      },
    });
  }

  // ---- Order add-on bumps (gift wrap / hanging & care kit) ----------------
  // Flat, order-level single line items chosen on the basket page. Priced via
  // price_data.unit_amount so advertised == charged in every currency. NOT part
  // of `normalised`, so the bundle coupon never touches them.
  if (body.giftWrap === true) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: currencyCode,
        unit_amount: toMinor(GIFT_WRAP_PENCE),
        product_data: {
          name: "Gift wrapping & handwritten card",
          description:
            "Wrapped by hand in estate tissue with a wax seal and a handwritten card — ready to give.",
        },
      },
    });
  }
  if (body.careKit === true) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: currencyCode,
        unit_amount: toMinor(CARE_KIT_PENCE),
        product_data: {
          name: "Hanging & care kit",
          description:
            "Wall fixings, D-rings and a microfibre cloth with a care card — everything to hang and keep your print.",
        },
      },
    });
  }

  // ---- Metadata ----------------------------------------------------------
  // For a single print we keep the historical key names so any existing
  // webhook-log dashboards keep parsing cleanly. For multi-print we add
  // truncated comma-joined lists plus an item_count for at-a-glance triage.
  // Gift cards carry their own marker + recipient fields (see below) so the
  // webhook / fulfilment can tell a gift purchase apart from a print order.
  let metadata: Record<string, string>;
  if (giftOnly) {
    // Pure gift-card basket — no print metadata to emit.
    metadata = {
      order_kind: "gift",
      item_count: "0",
    };
  } else if (normalised.length === 1) {
    metadata = {
      painting_id: normalised[0].paintingId,
      painting_title: normalised[0].title,
      colourway_name: normalised[0].colourway,
      tier_id: normalised[0].tier.id,
      tier_label: normalised[0].tier.label,
      size: sizeFor(normalised[0].paintingId, normalised[0].tier),
      framing: normalised[0].framing ? "yes" : "no",
      embellished: normalised[0].embellished ? "yes" : "no",
      item_count: "1",
    };
  } else {
    metadata = {
      item_count: String(normalised.length),
      painting_ids: truncateMetadata(normalised.map((i) => i.paintingId)),
      painting_titles: truncateMetadata(normalised.map((i) => i.title)),
      colourway_names: truncateMetadata(normalised.map((i) => i.colourway)),
      tier_ids: truncateMetadata(normalised.map((i) => i.tier.id)),
      tier_labels: truncateMetadata(normalised.map((i) => i.tier.label)),
      framing_flags: truncateMetadata(
        normalised.map((i) => (i.framing ? "y" : "n")),
      ),
      embellished_flags: truncateMetadata(
        normalised.map((i) => (i.embellished ? "y" : "n")),
      ),
      size: sizeFor(normalised[0].paintingId, normalised[0].tier),
    };
  }

  // GIFT marker + recipient details. Present whenever the basket contains at
  // least one gift card (gift-only OR mixed with prints), so a webhook can
  // route the gift fulfilment (issue + email a redeemable code to the
  // recipient) independently of any prints in the same order.
  if (gifts.length > 0) {
    metadata.has_gift = "yes";
    metadata.gift_count = String(gifts.length);
    metadata.gift_amounts_pence = truncateMetadata(
      gifts.map((g) => String(g.amountPence)),
    );
    metadata.gift_total_pence = String(
      gifts.reduce((sum, g) => sum + g.amountPence, 0),
    );
    metadata.gift_labels = truncateMetadata(gifts.map((g) => g.label));
    const recipientNames = gifts.map((g) => g.recipientName).filter(Boolean);
    const recipientEmails = gifts.map((g) => g.recipientEmail).filter(Boolean);
    if (recipientNames.length > 0) {
      metadata.gift_recipient_names = truncateMetadata(recipientNames);
    }
    if (recipientEmails.length > 0) {
      metadata.gift_recipient_emails = truncateMetadata(recipientEmails);
    }
    // Single-gift baskets carry the personal message in full (trimmed to
    // Stripe's per-value cap) so the webhook can render it into the email.
    if (gifts.length === 1 && gifts[0].giftMessage) {
      metadata.gift_message = giftMetaTrim(gifts[0].giftMessage);
    }
  }

  // Order add-on bumps — surfaced in the order metadata so the estate knows to
  // wrap / enclose the kit when fulfilling.
  if (body.giftWrap === true) metadata.gift_wrap = "yes";
  if (body.careKit === true) metadata.care_kit = "yes";

  // UTM attribution (contract C1) — appended last. All keys are utm_-prefixed
  // so they can never collide with the order keys above; only non-empty
  // validated fields are written (max 8 keys, values ≤200 chars — see
  // utmMetadata for the Stripe 50-key / 500-char headroom note).
  Object.assign(metadata, utmMetadata(body.utm));

  // Note: `new Stripe(secret)` with no apiVersion — pinning a version
  // literal like "2025-09-30.clover" can mismatch the SDK's exported type
  // union (gotcha #6 in CLAUDE.md). Let the SDK use its pinned default.
  const stripe = new Stripe(secret);

  // ---- Bundle discount (programmatic coupon mint) ------------------------
  // Percent derived from the basket CONTENTS by bundlePercentOff (15% complete
  // catalogue / 12% colourway set / 10% on 3+ / 5% on 2). Mirrors paintings.ts
  // (gotcha #9). Failures are swallowed — never block checkout on a mint fail.
  let discounts: Array<{ coupon: string }> | undefined;
  const advertisedPercentOff = bundlePercentOff(normalised);

  // ---- #13 MARGIN-FLOOR GUARD --------------------------------------------
  // A bundle coupon's percent_off applies to the WHOLE line (print + frame +
  // embellish are separate line items, all caught by the coupon). The danger
  // case is a deeply-discounted line whose net price dips under that line's
  // fully-loaded COST FLOOR. This guard makes "never below cost" a HARD
  // invariant independent of whatever discount logic exists now or later.
  //
  // Behaviour (safe no-op cap — only ever REDUCES a discount, never raises a
  // price, never blocks checkout):
  //   • For each line compute maxPct = the largest percent that still keeps the
  //     discounted line ≥ floor × FLOOR_SAFETY (0 if the discount must vanish).
  //   • Clamp the session percent DOWN to the min across lines. Never up.
  //   • If it would have breached, log a warning (with ⚠️HUGO context) so a bad
  //     future price edit is visible — but proceed at the clamped percent.
  // At today's ~92% margins maxPct is always ≥ the advertised percent, so the
  // clamp is a no-op and `percentOff === advertisedPercentOff`.
  let percentOff = advertisedPercentOff;
  if (advertisedPercentOff > 0) {
    let maxSafePct = 100;
    for (const item of normalised) {
      const retail = lineRetailPence(item);
      if (retail <= 0) continue;
      const floor = lineCostFloorPence(item) * FLOOR_SAFETY;
      // Largest percent that keeps net ≥ floor: pct ≤ (1 − floor/retail) × 100.
      // Floored to a whole percent because Stripe coupons take integer percents
      // (rounding DOWN is the safe direction — a shallower discount).
      const lineMaxPct = Math.max(
        0,
        Math.floor((1 - floor / retail) * 100),
      );
      if (lineMaxPct < maxSafePct) maxSafePct = lineMaxPct;
      // Worst case: even at 0% discount the BASE retail is below cost floor —
      // only possible after a bad manual price edit. Per this task's brief the
      // guard NEVER blocks checkout, so we log loudly rather than rejecting.
      // (The spec's stricter "reject the line" option is intentionally NOT
      // taken here — keep this a safe no-op; surface it to the build-time
      // assertion / UI agents instead.)
      if (retail < floor) {
        console.error(
          "[/api/checkout] ⚠️HUGO BASE PRICE BELOW COST FLOOR for " +
            `${item.paintingId} (${item.tier.id}, framing=${item.framing}, ` +
            `embellished=${item.embellished}): retail ${retail}p < floor ${floor}p. ` +
            "A tier RETAIL or add-on price is below its (estimated) cost. " +
            "Checkout PROCEEDS at 0% discount — fix the prices in " +
            "src/data/paintings.ts AND api/checkout.ts.",
        );
      }
    }
    if (maxSafePct < advertisedPercentOff) {
      console.warn(
        "[/api/checkout] ⚠️ margin-floor guard CLAMPED bundle discount " +
          `${advertisedPercentOff}% → ${maxSafePct}% to keep every line at or ` +
          "above its cost floor. This should NEVER happen at normal margins — " +
          "a tier RETAIL price or add-on price has likely been edited below " +
          "the (estimated ⚠️HUGO) cost floor. Verify COST_FLOOR_PENCE / tier " +
          "prices in api/checkout.ts AND src/data/paintings.ts.",
      );
      percentOff = maxSafePct;
    }
  }

  // Discount as a FIXED AMOUNT on the PRINT lines only — NOT a session-wide
  // percent_off. A percent coupon applies to EVERY line item at Stripe, so it
  // would also discount gift cards + order-bump add-ons, while the basket total
  // (Basket.tsx grandTotalMinor) adds those UNDISCOUNTED → advertised != charged
  // whenever a bundle runs alongside a gift/bump. Computing amount_off in the
  // presentment currency, summed over the print line items exactly the way the
  // client sums bundleDiscountMinor (per-line-item rounding), keeps the Stripe
  // charge identical to the shown total to the penny, and leaves gifts/bumps at
  // full price in both places.
  let bundleDiscountMinor = 0;
  if (percentOff > 0) {
    for (const item of normalised) {
      const parts = [toMinor(item.tier.pricePence)];
      if (item.framing && typeof item.tier.framingPricePence === "number")
        parts.push(toMinor(item.tier.framingPricePence));
      if (item.embellished && typeof item.tier.embellishmentPricePence === "number")
        parts.push(toMinor(item.tier.embellishmentPricePence));
      for (const a of parts) bundleDiscountMinor += Math.round((a * percentOff) / 100);
    }
  }

  if (bundleDiscountMinor > 0) {
    try {
      const coupon = await stripe.coupons.create({
        amount_off: bundleDiscountMinor,
        currency: currencyCode,
        duration: "once",
        name: "Estate bundle thank-you",
        metadata: {
          source: "bundle_discount",
          item_count: String(normalised.length),
          percent_off: String(percentOff),
          amount_off_minor: String(bundleDiscountMinor),
        },
      });
      discounts = [{ coupon: coupon.id }];
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        "[/api/checkout] bundle coupon mint failed, proceeding without discount:",
        message,
      );
    }
  }

  // Shipping is collected ONLY when there's a physical print to post. A basket
  // of ONLY gift cards (giftOnly) is fully digital — no address, no shipping
  // options — so Stripe shows a clean digital checkout. A mixed basket (prints
  // + gifts) still ships, so it keeps address collection + the print shipping
  // options (gifts simply don't add to the shipping surcharge — buildShipping-
  // Options reads `normalised` only).
  const shippingParams: Partial<Stripe.Checkout.SessionCreateParams> = giftOnly
    ? {}
    : {
        shipping_address_collection: {
          allowed_countries: [
            "GB", "IE", "FR", "DE", "ES", "IT", "NL", "BE", "LU",
            "AT", "PT", "DK", "SE", "NO", "FI", "CH", "PL",
            "US", "CA", "AU", "NZ",
          ],
        },
        shipping_options: buildShippingOptions(normalised, currencyCode),
      };

  // Base session params — the proven checkout shape. The marketing add-ons
  // (abandoned-checkout recovery + promotions consent) are layered on top so
  // they can be retried WITHOUT if Stripe ever rejects them (see below) —
  // selling the print always outranks attribution / recovery extras.
  const baseSessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: lineItems,
    ...shippingParams,
    metadata,
    // Stripe disallows `allow_promotion_codes` and `discounts` together.
    // When we've programmatically applied a bundle discount, we drop the
    // promo-code input on the hosted checkout (the buyer's bundle already
    // beats their thank-you code anyway). When there's no bundle, the
    // promo-code input stays so a gift / thank-you code is redeemable —
    // including on a gift-only basket (a giver could redeem a code too).
    ...(discounts
      ? { discounts }
      : { allow_promotion_codes: true }),
    success_url: `${siteUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/order/cancel`,
  };

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    ...baseSessionParams,
    // Abandoned-checkout recovery: when the session expires (Stripe default
    // 24h) the `checkout.session.expired` webhook event carries
    // after_expiration.recovery.url — a link that re-opens a copy of this
    // exact session — so the estate can send a dignified "your basket is
    // saved" note. Recovery is a payment-mode feature; every session here is
    // payment mode, including the gift-only basket (no shipping params — no
    // conflict with the giftOnly spread above).
    after_expiration: { recovery: { enabled: true } },
    // Promotions-consent checkbox on the hosted checkout. "auto" defers the
    // display decision entirely to Stripe (shown by buyer locale per its
    // docs); the result lands on session.consent.promotions
    // ("opt_in" / "opt_out") for the webhook to read. No conflicting params:
    // we never set ui_mode, setup mode, or customer-creation options.
    consent_collection: { promotions: "auto" },
  };

  try {
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create(sessionParams);
    } catch (err) {
      // Belt-and-braces: if Stripe rejects either ADDITIVE marketing param
      // (e.g. promotions consent availability can vary by account country),
      // retry once with the proven base shape rather than failing the sale.
      // Any other error falls through to the outer catch unchanged.
      const message = err instanceof Error ? err.message : String(err);
      if (!/consent_collection|after_expiration/i.test(message)) throw err;
      console.warn(
        "[/api/checkout] marketing params rejected by Stripe — retrying without recovery/consent:",
        message,
      );
      session = await stripe.checkout.sessions.create(baseSessionParams);
    }

    if (!session.url) {
      console.error("[/api/checkout] Stripe returned session without URL", session.id);
      return send(500, { error: "Stripe didn't return a checkout URL." });
    }

    console.log("[/api/checkout] session created", {
      id: session.id,
      currency: currencyCode,
      fxVersion: CURRENCY_FX_VERSION,
      itemCount: normalised.length,
      paintings: normalised.map((i) => i.paintingId).join(","),
      tiers: normalised.map((i) => i.tier.id).join(","),
      framed: normalised.filter((i) => i.framing).length,
      embellished: normalised.filter((i) => i.embellished).length,
      giftCount: gifts.length,
      giftTotalPence: gifts.reduce((sum, g) => sum + g.amountPence, 0),
      giftOnly,
      bundleDiscount: discounts ? `${percentOff}%` : "no",
    });
    return send(200, { url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe checkout failed.";
    console.error("[/api/checkout] Stripe error:", message);
    return send(500, { error: message });
  }
}
