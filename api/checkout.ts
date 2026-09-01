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
 * anchor ("collector" = A2 £495). Framing is an OPTIONAL separate Stripe
 * line item priced from the tier's `framingPricePence` — only A2 + A1
 * carry a framing price; passing `framing: true` on a tier that doesn't
 * offer framing is silently ignored. The same pattern applies to
 * `embellished` — Polly Wedge hand-finishes A2 + A1 only at
 * `embellishmentPricePence` (£350 / £495); ignored on A3 / A0.
 *
 * Bundle discount: when the basket holds ≥ 2 lines the saving is applied as a
 * PER-UNIT reduction on each print line item — NOT as a session-level coupon,
 * because Stripe forbids `discounts` and `allow_promotion_codes` together and
 * the promo-code field must always render (a gift code has to be redeemable on
 * a multi-print basket). A session coupon is minted only as a fallback, in the
 * case the per-unit reduction cannot reproduce the advertised saving to the
 * penny. The percent is derived from the basket CONTENTS, server-side, by
 * `bundlePercentOff`:
 *   • one print of EVERY painting (complete catalogue)     → 12%
 *   • all lines a SINGLE painting (complete colourway set) → 10%
 *   • 3+ mixed paintings → 8%; 2 mixed → 5%.
 * Mirrors src/data/paintings.ts + src/pages/Basket.tsx bundlePercentOff —
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
type TierId = "cabinet" | "atelier" | "collector" | "atelier-grande" | "heirloom" | "studio";

interface TierDef {
  id: TierId;
  label: string;
  size: string;
  pricePence: number;
  editionLabel: string;
  framingPricePence?: number;
  embellishmentPricePence?: number;
  canvasPricePence?: number;
  available: boolean;
  // True for the Studio one-off — it IS the hand-finished piece, so it
  // never carries framing / embellishment add-on line items.
  isOneOff?: boolean;
}

const TIERS: Record<TierId, TierDef> = {
  cabinet: {
    id: "cabinet",
    label: "Emblem Edition",
    size: "21 × 21 cm",
    pricePence: 17500, // £175 base — mirror of paintings.ts (gotcha #9)
    editionLabel: "Emblem Edition — unnumbered, issued to order",
    // A4 entry rung — sold framed or canvas only (never bare paper). Framed £250.
    framingPricePence: 7500, // £75 (A4) → framed £250
    canvasPricePence: 7500, // £75 (A4) → canvas £250
    available: true,
  },
  atelier: {
    id: "atelier",
    label: "Gallery Edition",
    size: "29.5 × 29.5 cm",
    pricePence: 29500,
    editionLabel: "Gallery Edition — unnumbered, issued to order",
    // A3 is a framed product now (mirror of paintings.ts — gotcha #9).
    // 2026-07-25 squeeze pass: base £295, framing £295, canvas £150.
    framingPricePence: 15000, // £150 (A3) — Hugo 2026-07-27: framed == canvas price
    canvasPricePence: 15000,
    available: true,
  },
  collector: {
    id: "collector",
    label: "Collector Edition",
    size: "42 × 42 cm",
    pricePence: 52500,
    editionLabel: "Collector Edition — edition of 200, numbered",
    framingPricePence: 22500, // £225 (A2) — Hugo 2026-07-27: framed == canvas price
    embellishmentPricePence: 59500,
    canvasPricePence: 22500, // £225 (A2) — mirror of paintings.ts (gotcha #9)
    available: true,
  },
  "atelier-grande": {
    id: "atelier-grande",
    label: "Atelier Edition",
    size: "59.5 × 59.5 cm",
    pricePence: 97500,
    editionLabel: "Atelier Edition — edition of 75, numbered",
    framingPricePence: 32500, // £325 (A1) — Hugo 2026-07-27: framed == canvas price
    embellishmentPricePence: 89500,
    canvasPricePence: 32500, // £325 (A1) — mirror of paintings.ts (gotcha #9)
    available: true,
  },
  heirloom: {
    id: "heirloom",
    label: "Heirloom Edition",
    size: "84 × 84 cm",
    pricePence: 199500,
    editionLabel: "Heirloom Edition — edition of 18, numbered",
    // ENABLED 2026-06-06 — Point 101 A0 fulfilment confirmed. £1,895 charged
    // price; mirrors src/data/paintings.ts PRINT_TIERS["heirloom"].pricePence.
    // Hand-finish enabled on A0 (2026-07-14); FRAMING intentionally NOT offered
    // (glazed A0 exceeds Point 101's 610mm delivery cap — see paintings.ts).
    embellishmentPricePence: 129500,
    canvasPricePence: 42500, // £425 (A0) — mirror of paintings.ts (gotcha #9)
    available: true,
  },
  studio: {
    // Studio one-off — £2,650 unique hand-painted piece by Polly Wedge. No
    // framing / embellishment price: it IS the hand-finished work, so a
    // "studio" tierId produces a single £2,650 line item with no add-ons.
    id: "studio",
    label: "Original — One of One",
    size: "59.5 × 59.5 cm",
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
    cabinet: "25.9 × 21 cm",
    atelier: "36.4 × 29.5 cm",
    collector: "51.8 × 42 cm",
    "atelier-grande": "73.4 × 59.5 cm",
    heirloom: "103.6 × 84 cm",
    studio: "73.4 × 59.5 cm",
  },
};

/** The printed size for a painting at a tier — a per-painting override (e.g.
 *  Ophiuchus landscape) if present, else the square ladder default. */
const sizeFor = (paintingId: string, tier: TierDef): string =>
  PAINTING_TIER_SIZE[paintingId]?.[tier.id] ?? tier.size;

const DEFAULT_TIER_ID: TierId = "collector"; // anchor tier (A2 £495)

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
  cabinet: { printFloor: 800 }, //  A4 — £8
  atelier: { printFloor: 1200 }, //  A3 — £12
  collector: { printFloor: 2200 }, //  A2 — £22
  "atelier-grande": { printFloor: 4300 }, //  A1 — £43
  heirloom: { printFloor: 8000 }, //  A0 — £80 [DARK tier]
  studio: { printFloor: 16000 }, //  A1 unique — ⚠️£160+ placeholder (Polly's real hours)
};
const FRAME_COST_FLOOR_PENCE: Partial<Record<TierId, number>> = {
  cabinet: 2500, //  A4 frame cost £25 (LOW end)
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
  if (item.canvas && typeof item.tier.canvasPricePence === "number") {
    total += item.tier.canvasPricePence + item.canvasEdgeSurchargePence;
  }
  return total;
};

// Boilerplate spec line used in Stripe product description.
// ⚠️ SUPPLIER TRUTH (2026-08-28): this string is the line-item description on
// EVERY print order, so it lands on every Stripe receipt. The printer is NEVER
// named or mis-placed in buyer copy — the approved wording is "a specialist
// giclée studio on the Sussex coast" (same sentence as the ESTATE.printer line
// in api/stripe-webhook.ts). It read "Printed at our London atelier." until
// this pass, which was both a fiction and a place the estate does not have.
const PRINT_SPEC =
  "Estate-stamped by The Mandala Company, numbered within its edition. Issued with a Certificate of Authenticity carrying a unique Certificate ID. Printed and finished by a specialist giclée studio on the Sussex coast.";

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
const CURRENCY_FX_VERSION = "2026-07-25.1";
type CurrencyCode = "gbp" | "usd" | "eur" | "aud" | "cad";
const CURRENCY_RATES: Record<CurrencyCode, number> = {
  gbp: 1,
  usd: 1.32,
  eur: 1.22,
  aud: 2.0,
  cad: 1.82,
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
  return Math.ceil(raw / 100) * 100; // → round UP to a clean whole major unit (2026-07-25 squeeze)
};

// ---- Gift-card bounds (mirror of src/lib/basket.ts) -----------------------
// Whole pounds only; min £25, max £5,000. Re-validated here so a tampered
// client can never mint a gift line outside the advertised window. The
// advertised gift price (UI) === the charged price (price_data.unit_amount ===
// this same amountPence) by construction — there is no separate price table.
const GIFT_MIN_PENCE = 2500; //   £25
const GIFT_MAX_PENCE = 500000; // £5,000

// Stripe caps each metadata value at 500 characters. We truncate gracefully
// when concatenating IDs / colourways across a multi-item basket.
const STRIPE_METADATA_VALUE_LIMIT = 500;

// ---- Client-text hygiene (gift fields) ------------------------------------
// `label`, `recipientName` and `giftMessage` are BUYER-SUPPLIED strings that
// flow into Stripe `product_data.name` / `.description` and into the session
// metadata. Two failure modes this closes:
//   • Stripe rejects an over-long product name / description outright — an
//     uncapped field 500s the WHOLE checkout, so the caps below are server-side
//     and never trust the client's own maxLength.
//   • A "|" inside one of these values would shift the webhook's positional
//     gift zip (see the gift metadata block below), so it is replaced here.
// Control characters are stripped and runs of whitespace collapsed so nothing
// user-supplied can break the Stripe line or the metadata slot format.
const GIFT_LABEL_MAX = 60;
const GIFT_NAME_MAX = 80;
const GIFT_EMAIL_MAX = 254; // RFC 5321 practical address cap
const GIFT_MESSAGE_MAX = 400; // mirror of the <textarea maxLength> on /gift
/**
 * Truncate to at most `max` UTF-16 code units WITHOUT splitting an emoji.
 *
 * ⚠️ A plain `.slice(0, n)` can cut between the two halves of a surrogate
 * pair, leaving a lone high surrogate. stripe-node form-encodes metadata
 * through `encodeURIComponent`, which THROWS `URIError: URI malformed` on a
 * lone surrogate — the throw escapes `sessions.create` and the buyer gets
 * `{"error":"URI malformed"}` instead of a checkout. Measured: with 2 gift
 * cards (a 249-character slot budget) 20% of emoji-bearing notes that the
 * /gift textarea happily accepts killed the session outright.
 *
 * A prefix slice can only ever orphan a HIGH surrogate at the tail — the low
 * half is what got cut — so dropping one trailing char is sufficient and exact.
 */
const sliceSafe = (v: string, max: number): string => {
  const out = v.slice(0, max);
  const last = out.charCodeAt(out.length - 1);
  // 0xD800–0xDBFF = a high surrogate whose partner was sliced away.
  return last >= 0xd800 && last <= 0xdbff ? out.slice(0, -1) : out;
};

const giftText = (v: unknown, max: number): string =>
  typeof v !== "string"
    ? ""
    : sliceSafe(
        v
          // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f\u007f]+/g, " ")
          // ⚠️ BOTH separators. `|` joins the gift slots, and the webhook's
          // gift_labels parser also splits on `,` — so a comma in user text
          // would add a phantom slot and shift every later label by one.
          .replace(/[|,]/g, "/")
          .replace(/\s+/g, " ")
          .trim(),
        max,
      );

// Permissive-but-real address shape. A malformed recipient address must fail
// LOUDLY at checkout rather than silently posting a £750 code into the void.
// (A well-formed TYPO — bob@gmial.com — can't be caught here; that is why the
// webhook always sends the buyer their own copy of every gift code.)
const GIFT_EMAIL_RE = /^[^\s@,;|]+@[^\s@,;|.]+(\.[^\s@,;|.]+)+$/;

/**
 * Join one value per gift into a single metadata value, PIPE-separated, with a
 * per-slot length budget so the joined string can never exceed Stripe's 500-char
 * cap.
 *
 * ⚠️ POSITIONAL — DO NOT use truncateMetadata here. Its "…+N more" tail DROPS
 * trailing entries, and the webhook zips these arrays BY INDEX to decide which
 * recipient gets which code: a dropped or shifted slot emails the wrong card to
 * the wrong person (a £25 code to the person the buyer spent £500 on). Capping
 * PER SLOT shortens a value but can never change the arity.
 */
const joinGiftSlots = (values: string[]): string => {
  if (values.length === 0) return "";
  // (n − 1) separators + n slots must fit inside the per-value cap.
  const budget = Math.max(
    1,
    Math.floor(
      (STRIPE_METADATA_VALUE_LIMIT - (values.length - 1)) / values.length,
    ),
  );
  // ⚠️ sliceSafe, never a bare .slice — the per-slot budget is arbitrary (249
  // for 2 gifts, 166 for 3, 99 for 5) and lands mid-emoji often enough to
  // matter: a lone surrogate here throws URIError inside stripe-node's form
  // encoder and the buyer loses the whole checkout. See sliceSafe above.
  return values.map((v) => sliceSafe(v, budget)).join("|");
};

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
  // NOTE: "lulin" was REMOVED here 2026-08-30 — it had been deleted from
  // src/data/paintings.ts (PAINTINGS = 12) but left in this allowlist (13), so
  // CATALOGUE_PAINTING_COUNT read 13 and the complete-set 12% coupon
  // (bundlePercentOff: distinct >= COUNT) was UNREACHABLE at 12 distinct → the
  // full catalogue / full compose set advertised 12% but was charged 8%, a ~£360
  // OVERCHARGE (advertised < charged). Removing it makes COUNT = 12 so the 12%
  // fires exactly when the client advertises it (gotcha #9 mirror drift, fixed).
  "enneagon-swans",
  // Ancient Canons (added 2026-07-28)
  "celtic-shield",
  "twelve-around-three",
  "persian-flower-of-life",
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
  "enneagon-swans": "Enneagon — The Swans",
  "celtic-shield": "Orbital — Celtic Shield Mandala",
  "twelve-around-three": "12 Around 3 — Flower of Life",
  "persian-flower-of-life": "Persian Flower of Life — Kepler's Key",
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
  v === "cabinet" ||
  v === "atelier" ||
  v === "collector" ||
  v === "atelier-grande" ||
  v === "heirloom" ||
  v === "studio";

// Framing-finish labels — a mirror of FRAME_STYLES in src/data/paintings.ts.
// The live range is Oak / White / Black; older ids are kept so a stale in-flight
// client still resolves a label. An unknown id falls back to the default (Oak).
const FRAME_STYLE_LABELS: Record<string, string> = {
  "black-lacquer": "Black lacquer",
  "stained-black": "Black",
  "walnut-tray": "Walnut",
  "walnut-grain": "Walnut grain",
  wenge: "Wenge",
  "natural-oak": "Oak",
  ash: "Ash",
  white: "White",
  "white-stained": "White stained",
  silver: "Silver",
  gold: "Gold",
  "silver-aluminium": "Brushed aluminium",
  "black-aluminium": "Black aluminium",
  "box-black": "Black box",
  "box-oak": "Oak box",
  "ayous-gold": "Ayous, gold edge",
  "ornate-gold": "Ornate gold",
};
// ⚠️ MONEY (gotcha #9): the premium-frame surcharge, in pence, added on top of
// the base framingPricePence. Mirror of FRAME_TIERS' surchargePence + each
// frame's tier in src/data/paintings.ts. Classic frames (and any unknown id)
// → 0. Signature +£50, Ornate +£120. advertised == charged depends on this
// matching the PDP's getFrameSurchargePence exactly.
// 2026-07-25 squeeze pass: Signature 5000→9500, Ornate 12000→24500 (mirror of
// FRAME_TIERS in src/data/paintings.ts).
const FRAME_SURCHARGE_PENCE: Record<string, number> = {
  "silver-aluminium": 9500,
  "black-aluminium": 9500,
  "box-black": 9500,
  "box-oak": 9500,
  "ayous-gold": 24500,
  "ornate-gold": 24500,
};
const GLAZING_LABELS: Record<string, string> = {
  "art-acrylic": "Clear acrylic",
  "museum-glass": "Float glass",
};
// Curated paper-finish labels — a mirror of PAPER_FINISHES in
// src/data/paintings.ts. NO price impact (every finish is included in the
// framed price), so this is a label mirror, NOT a money mirror. Named on the
// framed print line so the estate orders the right stock. Unknown / missing id
// falls back to the default finish (smooth-matt).
const PAPER_FINISH_LABELS: Record<string, string> = {
  "smooth-matt": "Smooth Matt (Hahnemühle Photo Rag 308gsm)",
  textured: "Textured (Hahnemühle German Etching 310gsm)",
  "smooth-gloss": "Smooth Gloss (Ilford Galerie 310gsm)",
};
// Curated canvas-edge labels — a mirror of CANVAS_EDGES in
// src/data/paintings.ts. NO price impact (every edge is included in the one
// canvas price), so this is a label mirror, NOT a money mirror. Named on the
// canvas line so the estate orders the right wrap. Unknown / missing id falls
// back to the default (mirror wrap).
const CANVAS_EDGE_LABELS: Record<string, string> = {
  basic: "Basic canvas (white edge)",
  mirror: "Canvas print",
  "float-black": "Black float frame",
  "float-white": "White float frame",
  "float-wenge": "Wenge float frame",
  "float-oak": "Oak float frame",
};
// MONEY MIRROR (gotcha #9) of FLOAT_EDGE_SURCHARGE_PENCE in
// src/data/paintings.ts — a float (tray) frame is a real hand-built surround at
// Point 101 that costs MORE the bigger the canvas, so the surcharge is
// SIZE-SCALED per tier (Hugo 2026-07-25, replacing the old flat +£45). Any
// float-* edge id gets the tier's premium; mirror wrap = 0.
const FLOAT_EDGE_SURCHARGE_PENCE: Record<string, number> = {
  atelier: 7500, //          A3 float frame — +£75
  collector: 9500, //        A2 float frame — +£95
  "atelier-grande": 14500, // A1 float frame — +£145
  heirloom: 19500, //        A0 float frame — +£195
  studio: 14500, //          one-off (A1-size) — +£145
};

interface NormalisedItem {
  paintingId: string;
  colourway: string;
  title: string;
  tier: TierDef;
  framing: boolean;     // true only if framing is offered AND requested
  embellished: boolean; // true only if hand-finishing is offered AND requested
  canvas: boolean;      // true only if canvas is offered AND requested (excludes framing)
  // How many of this exact line to charge for (Stripe line_items.quantity). ≥ 1.
  quantity: number;
  // Framing finishes (display labels) — only set when framing === true. These
  // ride into the Stripe line item so the estate knows which frame to order.
  frameStyle?: string;
  glazing?: string;
  // Curated paper finish (display label) — only set when framing === true (the
  // framed print's paper base). No price impact; named on the print line so the
  // estate orders the right stock.
  paperFinish?: string;
  // Curated canvas edge (display label) — only set when canvas === true. Named
  // on the canvas line so the estate orders the right wrap.
  canvasEdge?: string;
  // Premium-frame surcharge (pence) for the chosen frame — 0 for classic frames
  // and whenever framing is off. Added to framingPricePence on the framing line.
  frameSurchargePence: number;
  // Canvas float-frame surcharge (pence) — 0 for a plain mirror wrap / non-canvas.
  // Added to canvasPricePence on the canvas line.
  canvasEdgeSurchargePence: number;
}

const normaliseItem = (
  paintingId: string | undefined,
  colourwayName: string | undefined,
  tierIdRaw: unknown,
  framingRaw: unknown,
  embellishedRaw: unknown,
  frameStyleRaw?: unknown,
  glazingRaw?: unknown,
  canvasRaw?: unknown,
  quantityRaw?: unknown,
  paperFinishRaw?: unknown,
  canvasEdgeRaw?: unknown,
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
  // Canvas requested only counts if the tier offers it; canvas is ready-to-hang
  // and NOT framed, so it takes precedence over (and disables) framing.
  const canvas = canvasRaw === true && typeof tier.canvasPricePence === "number";
  // Framing requested only counts if the tier offers it AND canvas isn't chosen.
  const framing =
    !canvas && framingRaw === true && typeof tier.framingPricePence === "number";
  // Hand-embellishment requested only counts if the tier actually offers it.
  const embellished =
    embellishedRaw === true && typeof tier.embellishmentPricePence === "number";
  // Framing finishes — only when framed; an unknown id falls back to the
  // default finish so a stale / malformed client can never break the line.
  const frameStyle = framing
    ? (FRAME_STYLE_LABELS[String(frameStyleRaw)] ?? FRAME_STYLE_LABELS["natural-oak"])
    : undefined;
  const glazing = framing
    ? (GLAZING_LABELS[String(glazingRaw)] ?? GLAZING_LABELS["museum-glass"])
    : undefined;
  // Paper finish — only when framed; unknown / missing falls back to the house
  // default so a stale client can never break the line. No price impact.
  const paperFinish = framing
    ? (PAPER_FINISH_LABELS[String(paperFinishRaw)] ?? PAPER_FINISH_LABELS["smooth-matt"])
    : undefined;
  // Canvas edge — only when canvas; unknown / missing falls back to the default
  // wrap so a stale client can never break the line. No price impact.
  const canvasEdge = canvas
    ? (CANVAS_EDGE_LABELS[String(canvasEdgeRaw)] ?? CANVAS_EDGE_LABELS["mirror"])
    : undefined;
  // Premium-frame surcharge keyed off the RAW frame id (before it became a
  // label). 0 when framing is off or the frame is classic / unknown.
  const frameSurchargePence = framing
    ? (FRAME_SURCHARGE_PENCE[String(frameStyleRaw)] ?? 0)
    : 0;
  // Canvas float-frame surcharge — SIZE-SCALED by tier (a float tray frame
  // costs more the bigger the canvas). Any float-* edge gets the tier's
  // premium; a plain mirror wrap (or non-canvas line) = 0.
  const isFloatEdge =
    canvas && typeof canvasEdgeRaw === "string" && canvasEdgeRaw.startsWith("float");
  const canvasEdgeSurchargePence = isFloatEdge
    ? (FLOAT_EDGE_SURCHARGE_PENCE[tier.id] ?? FLOAT_EDGE_SURCHARGE_PENCE.collector)
    : 0;
  // Quantity — whole units, clamped to a sane 1–99 so a malformed / hostile
  // client can never mint an absurd Stripe line quantity.
  const quantity =
    typeof quantityRaw === "number" && Number.isFinite(quantityRaw)
      ? Math.min(99, Math.max(1, Math.floor(quantityRaw)))
      : 1;
  return {
    paintingId,
    colourway,
    title,
    tier,
    framing,
    embellished,
    canvas,
    quantity,
    frameStyle,
    glazing,
    paperFinish,
    canvasEdge,
    frameSurchargePence,
    canvasEdgeSurchargePence,
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
  // ⚠️ A crafted label ("£5,000 gift card" on a £25 card) would print a FALSE
  // figure on the estate's own Stripe receipt, so any label carrying a currency
  // symbol or a multi-digit run is discarded for the server-derived one. Real
  // denomination labels ("A2 Collector Edition", "Custom amount") carry neither
  // — the /gift page's own contract already forbids a money figure in the label
  // (see denominationCardLabel in src/pages/Gift.tsx).
  const labelClean = giftText(raw.label, GIFT_LABEL_MAX);
  const labelSafe = /[£$€¥]|\d{2,}/.test(labelClean) ? "" : labelClean;
  const label = labelSafe || `£${(amountPence / 100).toFixed(0)} gift card`;
  const recipientName = giftText(raw.recipientName, GIFT_NAME_MAX);
  const recipientEmail = giftText(raw.recipientEmail, GIFT_EMAIL_MAX);
  if (recipientEmail && !GIFT_EMAIL_RE.test(recipientEmail)) {
    return {
      error: `"${recipientEmail}" doesn't look like an email address — the gift code is sent there, so please check it.`,
    };
  }
  const giftMessage = giftText(raw.giftMessage, GIFT_MESSAGE_MAX);
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

// Partner referral (src/lib/ref.ts, localStorage "tasm.ref.v1"). The buyer's
// first-touch partner code rides along as the optional top-level `ref` string
// and is written into the session metadata as `partner_ref` — so the estate can
// see which partner introduced an order and settle terms privately. Validated
// to a short link-safe charset; a malformed value is silently dropped and never
// blocks checkout. NO figures — attribution only.
const PARTNER_REF_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
const refMetadata = (raw: unknown): Record<string, string> => {
  if (typeof raw !== "string") return {};
  const code = raw.trim().slice(0, 120);
  return code && PARTNER_REF_RE.test(code) ? { partner_ref: code } : {};
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
  if (distinct >= CATALOGUE_PAINTING_COUNT) return 12; // complete catalogue (2026-07-25 squeeze: was 15)
  if (distinct === 1) return 10;                       // complete colourway set (was 12)
  return count >= 3 ? 8 : 5;                            // general / collection bundle (3+ was 10)
};

// ---- Constant-time string compare (mirror of api/admin/order-shipped.ts) ----
// For admin-key / access-code checks — avoids leaking length-independent timing.
const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
};

// ---- TRADE pricing (mirror of src/data/paintings.ts TRADE_TIERS) ------------
// The by-introduction rate for designers & hospitality buyers. Trade pricing is
// NEVER charged through the public print/basket flow — it is minted ONLY here,
// behind the ADMIN_API_KEY-gated `kind:"trade-quote"` branch, as a Stripe
// Payment Link. Three tiers off FULL retail (base + finish, never the bare
// base):
//   • standard (approved trade account)            → 30%
//   • project  (single order, retail ≥ £5,000)      → 35%
//   • key      (hospitality / key, retail ≥ £15,000)→ 40%
// ⚠️ MONEY (gotcha #9): the percentages AND thresholds mirror TRADE_TIERS in
// src/data/paintings.ts. The gated sheet advertises tradePricePence(retail,
// tier) with the SAME formula off the SAME TIERS retail (base + framing/canvas),
// so advertised == charged. Trade discount REPLACES bundle discounts — this
// branch never calls bundlePercentOff, so the two can never stack.
type TradeTierId = "standard" | "project" | "key";
const TRADE_DISCOUNT_PERCENT: Record<TradeTierId, number> = {
  standard: 30,
  project: 35,
  key: 40,
};
const TRADE_MIN_RETAIL_PENCE: Record<TradeTierId, number> = {
  standard: 0,
  project: 500000, //  £5,000 retail value
  key: 1500000, //     £15,000 retail value
};
const isTradeTierId = (v: unknown): v is TradeTierId =>
  v === "standard" || v === "project" || v === "key";
/** Trade % off the FULL retail line (base + finish). Whole pence. Mirror of
 *  tradePricePence in src/data/paintings.ts. */
const tradePricePence = (retailLinePence: number, tier: TradeTierId): number =>
  Math.round(retailLinePence * (1 - TRADE_DISCOUNT_PERCENT[tier] / 100));
/** Best trade tier a retail order total qualifies for by threshold. Mirror of
 *  tradeTierForRetail in src/data/paintings.ts. */
const tradeTierForRetail = (retailTotalPence: number): TradeTierId => {
  if (retailTotalPence >= TRADE_MIN_RETAIL_PENCE.key) return "key";
  if (retailTotalPence >= TRADE_MIN_RETAIL_PENCE.project) return "project";
  return "standard";
};
// The tiers a TRADE order may be billed for. Deliberately NOT `TIERS[id].available`
// — that flag is kept `true` for `heirloom` (crash-safety for stale retail clients)
// and `studio`, but neither is buyer-visible, so the gated sheet never advertises
// them. Billing them would break advertised==charged. This set mirrors the
// BUYER-visible sellable tiers in src/data/paintings.ts PRINT_TIERS
// (`available && !isOneOff`): A3/A2/A1 today. ⚠️ If A0 (heirloom) is re-listed for
// buyers (paintings.ts `available:true`), add "heirloom" here too (gotcha #9).
const TRADE_SELLABLE_TIERS = new Set<TierId>([
  "atelier",
  "collector",
  "atelier-grande",
]);

// Trade tier presentation copy (mirror of TRADE_TIERS labels/notes in
// src/data/paintings.ts). Lives server-side so the gated /trade/pricing sheet is
// assembled HERE and returned only after the access code verifies — the trade %s
// therefore NEVER ship in the public client bundle (Hugo's non-negotiable: trade
// numbers live ONLY behind the gate). advertised == charged is now guaranteed by
// construction: the sheet and handleTradeQuote read the SAME TIERS retail +
// tradePricePence in this one file.
const TRADE_TIER_META: Record<
  TradeTierId,
  { label: string; shortLabel: string; note: string }
> = {
  standard: { label: "Trade account", shortLabel: "Trade", note: "Approved trade account" },
  project: {
    label: "Project",
    shortLabel: "Project",
    note: "Single project — retail value £5,000 or more",
  },
  key: {
    label: "Key / hospitality account",
    shortLabel: "Key account",
    note: "Key or hospitality account — retail value £15,000 or more",
  },
};
const TRADE_A_LABEL: Record<TierId, string> = {
  cabinet: "A4",
  atelier: "A3",
  collector: "A2",
  "atelier-grande": "A1",
  heirloom: "A0",
  studio: "",
};

/**
 * Assemble the trade price sheet, server-side, from the same TIERS retail +
 * tradePricePence the billing endpoint uses. Only TRADE_SELLABLE_TIERS appear
 * (A3/A2/A1 today). Framed and canvas collapse to one "Framed or canvas" row
 * when equal-priced. Returned to the client only after the gate verifies.
 */
const buildTradeSheet = () => {
  const order: TierId[] = ["atelier", "collector", "atelier-grande", "heirloom"];
  const rows: Array<{
    aLabel: string;
    size: string;
    tierLabel: string;
    finishLabel: string;
    retailPence: number;
    prices: Record<TradeTierId, number>;
  }> = [];
  for (const id of order) {
    if (!TRADE_SELLABLE_TIERS.has(id)) continue;
    const t = TIERS[id];
    const framed =
      typeof t.framingPricePence === "number" ? t.pricePence + t.framingPricePence : null;
    const canvas =
      typeof t.canvasPricePence === "number" ? t.pricePence + t.canvasPricePence : null;
    const entries: Array<{ label: string; retail: number }> = [];
    if (framed !== null && canvas !== null && framed === canvas) {
      entries.push({ label: "Framed or canvas", retail: framed });
    } else {
      if (framed !== null) entries.push({ label: "Framed", retail: framed });
      if (canvas !== null) entries.push({ label: "Canvas", retail: canvas });
    }
    for (const e of entries) {
      rows.push({
        aLabel: TRADE_A_LABEL[id],
        size: t.size,
        tierLabel: t.label,
        finishLabel: e.label,
        retailPence: e.retail,
        prices: {
          standard: tradePricePence(e.retail, "standard"),
          project: tradePricePence(e.retail, "project"),
          key: tradePricePence(e.retail, "key"),
        },
      });
    }
  }
  const tiers = (["standard", "project", "key"] as TradeTierId[]).map((id) => ({
    id,
    label: TRADE_TIER_META[id].label,
    shortLabel: TRADE_TIER_META[id].shortLabel,
    discountPercent: TRADE_DISCOUNT_PERCENT[id],
    note: TRADE_TIER_META[id].note,
  }));
  return {
    tiers,
    rows,
    projectThresholdLabel: `£${(TRADE_MIN_RETAIL_PENCE.project / 100).toLocaleString("en-GB")}`,
    keyThresholdLabel: `£${(TRADE_MIN_RETAIL_PENCE.key / 100).toLocaleString("en-GB")}`,
  };
};

// ---- PARTNER (introducer) COMMISSION — the SELL side ------------------------
// SEPARATE from TRADE above (buyers who purchase at a discount). Partners are
// SELLERS: they INTRODUCE a client/room and share in the resulting placement.
// The commission is paid on the NET SALE VALUE (works only, ex-tax & ex-free-
// shipping) of completed, non-refunded orders attributed to that partner
// (partner_ref in the order metadata).
//
// RECOMMENDED STRUCTURE (the estate can override any rate via env without a code
// change). Chosen to MAXIMISE LONG-RUN PROFIT given the economics: prints run
// ~90% gross margin and are made to order (no inventory risk), so every
// partner-driven sale is almost pure INCREMENTAL profit and VOLUME is the lever,
// not per-unit margin. An escalating ladder self-selects the productive partners
// and reserves the richest rate for the largest (most profitable) placements; a
// residual on repeat orders captures the high-lifetime-value hospitality
// accounts that are the real long-run prize. Even at the 25% top rate the estate
// keeps ~65% margin on sales that would not exist without the partner. Rates
// materially above ~25% erode prestige/margin without proportionate volume;
// below ~15% won't move a busy designer — so 15 / 20 / 25 (+10% residual) is the
// profit-maximising band.
//
// ⚠️ These are figures the estate PAYS OUT (not charged to any buyer) and are
// surfaced ONLY behind the PARTNER_TERMS_CODE gate + on private agreements —
// never in the public client bundle or on any buyer surface.
const partnerRateFromEnv = (name: string, def: number): number => {
  const raw = (process.env[name] ?? "").trim();
  if (!raw) return def;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 90 ? Math.round(n) : def;
};
type PartnerTierId = "associate" | "partner" | "key";
const PARTNER_RATE: Record<PartnerTierId, number> = {
  associate: partnerRateFromEnv("PARTNER_RATE_ASSOCIATE", 15),
  partner: partnerRateFromEnv("PARTNER_RATE_PARTNER", 20),
  key: partnerRateFromEnv("PARTNER_RATE_KEY", 25),
};
const PARTNER_RESIDUAL_RATE = partnerRateFromEnv("PARTNER_RATE_RESIDUAL", 10);
const PARTNER_TIER_META: Record<PartnerTierId, { label: string; shortLabel: string; note: string }> = {
  associate: {
    label: "Associate",
    shortLabel: "Associate",
    note: "Every approved partner, on every introduction.",
  },
  partner: {
    label: "Partner",
    shortLabel: "Partner",
    note: "A single placement of £5,000+ in works, or £10,000 of introductions to date.",
  },
  key: {
    label: "Key partner",
    shortLabel: "Key",
    note: "A single placement of £20,000+ in works, or £50,000 to date — hospitality & multi-room.",
  },
};
const buildPartnerTerms = () => {
  const tiers = (["associate", "partner", "key"] as PartnerTierId[]).map((id) => ({
    id,
    label: PARTNER_TIER_META[id].label,
    shortLabel: PARTNER_TIER_META[id].shortLabel,
    ratePercent: PARTNER_RATE[id],
    note: PARTNER_TIER_META[id].note,
  }));
  // Worked examples so a partner sees exactly what an introduction earns.
  const sampleSales = [250000, 500000, 1500000];
  const examples = sampleSales.map((salePence) => ({
    salePence,
    commissions: {
      associate: Math.round((salePence * PARTNER_RATE.associate) / 100),
      partner: Math.round((salePence * PARTNER_RATE.partner) / 100),
      key: Math.round((salePence * PARTNER_RATE.key) / 100),
    },
  }));
  return {
    tiers,
    residualPercent: PARTNER_RESIDUAL_RATE,
    examples,
    basis:
      "the net sale value — the price of the works only, excluding any tax and the (free) shipping — on completed orders that are not refunded.",
  };
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
// The broad set of Stripe-supported delivery destinations (sanctioned countries
// are rejected by Stripe automatically and are intentionally omitted). Shared by
// the retail checkout session AND the trade payment link so both capture a
// worldwide ship-to. Stephen's collector base includes the Gulf/Dubai.
const ALLOWED_SHIPPING_COUNTRIES = [
  // Europe
  "GB", "IE", "FR", "DE", "ES", "IT", "NL", "BE", "LU", "AT", "PT",
  "DK", "SE", "NO", "FI", "IS", "CH", "PL", "CZ", "SK", "HU", "SI",
  "HR", "RO", "BG", "GR", "EE", "LV", "LT", "CY", "MT", "LI", "MC",
  // North America
  "US", "CA", "MX",
  // Middle East / Gulf
  "AE", "SA", "QA", "KW", "BH", "OM", "JO", "IL", "TR",
  // Asia-Pacific
  "JP", "SG", "HK", "KR", "TW", "CN", "IN", "MY", "TH", "ID", "PH",
  "VN", "AU", "NZ",
  // Latin America
  "BR", "AR", "CL", "CO", "PE", "UY", "CR",
  // Africa
  "ZA", "MU",
] as const;

const buildShippingOptions = (_items: NormalisedItem[], currency: CurrencyCode) => [
  {
    shipping_rate_data: {
      type: "fixed_amount" as const,
      fixed_amount: { amount: 0, currency },
      display_name: "United Kingdom — free delivery (made to order · ships in 2–4 working days)",
    },
  },
  {
    shipping_rate_data: {
      type: "fixed_amount" as const,
      fixed_amount: { amount: 0, currency },
      display_name: "Europe — free delivery (made to order · ships in 2–4 working days)",
    },
  },
  {
    shipping_rate_data: {
      type: "fixed_amount" as const,
      fixed_amount: { amount: 0, currency },
      display_name: "International — free delivery (made to order · ships in 2–4 working days)",
    },
  },
];

// ---- Trade billing (kind:"trade-quote") -----------------------------------
// ADMIN_API_KEY-gated. Input:
//   { kind:"trade-quote", secret:<ADMIN_API_KEY>, tradeTier:"standard"|"project"|"key",
//     items:[{ paintingId, tierId, finish:"framed"|"canvas", quantity }] }
// Computes the trade-discounted total from the SAME TIERS retail (base + finish)
// the gated sheet advertises, then mints a Stripe Payment Link at that total.
// GBP only (the sheet is GBP). advertised == charged by construction (identical
// tradePricePence formula + identical retail). Trade discount REPLACES bundle
// discounts — this path never runs bundlePercentOff. Never throws; always
// answers via `send`.
interface TradeQuoteLine {
  paintingId: string;
  title: string;
  tierId: TierId;
  tierLabel: string;
  size: string;
  finish: "framed" | "canvas";
  quantity: number;
  retailUnitPence: number; // base + finish
  tradeUnitPence: number; // retail × (1 − trade%)
}

async function handleTradeQuote(
  body: { secret?: unknown; tradeTier?: unknown; items?: unknown },
  stripeKey: string,
  send: (status: number, payload: unknown) => void,
): Promise<void> {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return send(500, { error: "Server missing ADMIN_API_KEY." });
  }
  const submitted = typeof body.secret === "string" ? body.secret : "";
  if (!submitted || !safeEqual(submitted, adminKey)) {
    return send(401, { error: "Unauthorised." });
  }
  if (!isTradeTierId(body.tradeTier)) {
    return send(400, {
      error: 'tradeTier must be "standard", "project" or "key".',
    });
  }
  const tradeTier = body.tradeTier;
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return send(400, { error: "At least one line item is required." });
  }
  if (body.items.length > MAX_ITEMS) {
    return send(400, { error: `Too many items (max ${MAX_ITEMS}).` });
  }

  const lines: TradeQuoteLine[] = [];
  for (const raw of body.items as Array<Record<string, unknown>>) {
    const paintingId = typeof raw.paintingId === "string" ? raw.paintingId : "";
    if (!VALID_PAINTING_IDS.has(paintingId)) {
      return send(400, { error: `Unknown painting "${paintingId}".` });
    }
    if (!isTierId(raw.tierId)) {
      return send(400, { error: `Unknown size / tier "${String(raw.tierId)}".` });
    }
    // Gate on the BUYER-visible sellable set, NOT TIERS[id].available (which is
    // deliberately true for the hidden heirloom/studio rows) — otherwise a
    // hand-crafted request could bill an A0 the gated sheet never advertises,
    // breaking advertised==charged (gotcha #9).
    if (!TRADE_SELLABLE_TIERS.has(raw.tierId)) {
      return send(400, {
        error: `Size "${raw.tierId}" is not available for trade orders.`,
      });
    }
    const tier = TIERS[raw.tierId];
    if (!tier || !tier.available) {
      return send(400, { error: `Size "${raw.tierId}" is not available.` });
    }
    const finish = raw.finish === "canvas" ? "canvas" : "framed";
    const surcharge =
      finish === "canvas" ? tier.canvasPricePence : tier.framingPricePence;
    if (typeof surcharge !== "number") {
      return send(400, {
        error: `${finish === "canvas" ? "Canvas" : "Framing"} is not offered at ${tier.label} (${tier.size}).`,
      });
    }
    const quantity =
      typeof raw.quantity === "number" && Number.isFinite(raw.quantity)
        ? Math.min(99, Math.max(1, Math.floor(raw.quantity)))
        : 1;
    const retailUnitPence = tier.pricePence + surcharge;
    lines.push({
      paintingId,
      title: PAINTING_TITLES[paintingId] ?? paintingId,
      tierId: tier.id,
      tierLabel: tier.label,
      size: sizeFor(paintingId, tier),
      finish,
      quantity,
      retailUnitPence,
      tradeUnitPence: tradePricePence(retailUnitPence, tradeTier),
    });
  }

  const retailSubtotalPence = lines.reduce(
    (sum, l) => sum + l.retailUnitPence * l.quantity,
    0,
  );
  const tradeSubtotalPence = lines.reduce(
    (sum, l) => sum + l.tradeUnitPence * l.quantity,
    0,
  );
  const discountPercent = TRADE_DISCOUNT_PERCENT[tradeTier];
  const qualifyingTier = tradeTierForRetail(retailSubtotalPence);
  const thresholdMet = retailSubtotalPence >= TRADE_MIN_RETAIL_PENCE[tradeTier];

  try {
    const stripe = new Stripe(stripeKey);
    const priceLineItems: Array<{ price: string; quantity: number }> = [];
    for (const l of lines) {
      // Inline product (product_data) — Payment Links require pre-created Price
      // objects, so we mint one ad-hoc Price per line at the trade unit amount.
      const price = await stripe.prices.create({
        currency: "gbp",
        unit_amount: l.tradeUnitPence,
        product_data: {
          name: `${l.title} — ${l.tierLabel} ${l.size} — ${
            l.finish === "canvas" ? "Canvas print" : "Framed print"
          }`,
        },
      });
      priceLineItems.push({ price: price.id, quantity: l.quantity });
    }

    const paymentLink = await stripe.paymentLinks.create({
      line_items: priceLineItems,
      shipping_address_collection: {
        allowed_countries: ALLOWED_SHIPPING_COUNTRIES as unknown as NonNullable<
          Stripe.PaymentLinkCreateParams["shipping_address_collection"]
        >["allowed_countries"],
      },
      metadata: {
        order_kind: "trade",
        trade_tier: tradeTier,
        discount_percent: String(discountPercent),
        retail_subtotal_pence: String(retailSubtotalPence),
        trade_subtotal_pence: String(tradeSubtotalPence),
        item_count: String(lines.length),
        lines: truncateMetadata(
          lines.map(
            (l) =>
              `${l.paintingId}:${l.tierId}:${l.finish}×${l.quantity}`,
          ),
        ),
      },
    });

    console.log("[/api/checkout] trade payment link minted", {
      id: paymentLink.id,
      tradeTier,
      discountPercent,
      retailSubtotalPence,
      tradeSubtotalPence,
      lineCount: lines.length,
    });

    return send(200, {
      url: paymentLink.url,
      tradeTier,
      discountPercent,
      currency: "gbp",
      retailSubtotalPence,
      tradeSubtotalPence,
      savingPence: retailSubtotalPence - tradeSubtotalPence,
      qualifyingTier,
      thresholdMet,
      lines: lines.map((l) => ({
        paintingId: l.paintingId,
        title: l.title,
        tierId: l.tierId,
        tierLabel: l.tierLabel,
        size: l.size,
        finish: l.finish,
        quantity: l.quantity,
        retailUnitPence: l.retailUnitPence,
        tradeUnitPence: l.tradeUnitPence,
        lineRetailPence: l.retailUnitPence * l.quantity,
        lineTradePence: l.tradeUnitPence * l.quantity,
      })),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Stripe payment-link creation failed.";
    console.error("[/api/checkout] trade-quote Stripe error:", message);
    return send(500, { error: message });
  }
}

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

  // Vercel's Node runtime parses a JSON request body into req.body. Handle
  // both the parsed-object case and a raw-string fallback defensively. Parsed
  // BEFORE the env checks so the trade-access gate can answer even if a Stripe
  // key were momentarily unset.
  let body: {
    // Top-level `kind` routes the request: "trade-access" (gate check) and
    // "trade-quote" (admin billing) branch off before the normal print flow.
    kind?: unknown;
    // trade-access: the shared trade access code the estate hands an approved
    // designer. Verified against process.env.TRADE_ACCESS_CODE.
    code?: unknown;
    // trade-quote: ADMIN_API_KEY + the selected trade tier.
    secret?: unknown;
    tradeTier?: unknown;
    paintingId?: string;
    colourwayName?: string;
    tierId?: unknown;
    framing?: unknown;
    embellished?: unknown;
    canvas?: unknown;
    frameStyle?: unknown;
    glazing?: unknown;
    paperFinish?: unknown;
    canvasEdge?: unknown;
    quantity?: unknown;
    items?: Array<{
      kind?: unknown;
      paintingId?: string;
      colourwayName?: string;
      tierId?: unknown;
      framing?: unknown;
      embellished?: unknown;
      canvas?: unknown;
      frameStyle?: unknown;
      glazing?: unknown;
      paperFinish?: unknown;
      canvasEdge?: unknown;
      quantity?: unknown;
      // Trade-quote line field: which finish this line is priced at.
      finish?: unknown;
      // Gift-card line fields (kind === "gift"):
      amountPence?: unknown;
      label?: unknown;
      recipientName?: unknown;
      recipientEmail?: unknown;
      giftMessage?: unknown;
    }>;
    // First-touch attribution (contract C1) — optional on BOTH body shapes.
    utm?: unknown;
    // Partner referral code (src/lib/ref.ts) — optional; written as partner_ref.
    ref?: unknown;
    // Presentment currency (mirror of src/lib/currency.tsx). Optional; invalid
    // / missing defaults to GBP. The session is charged in this currency at the
    // converted amount the buyer was shown.
    currency?: unknown;
  };
  try {
    body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : ((req.body ?? {}) as typeof body);
  } catch {
    return send(400, { error: "Invalid JSON body." });
  }

  const kind = typeof body.kind === "string" ? body.kind : "";

  // ── TRADE ACCESS GATE (kind:"trade-access") ──────────────────────────────
  // The /trade/pricing gate POSTs the shared access code here; on a constant-
  // time match against process.env.TRADE_ACCESS_CODE we return { ok:true, sheet }
  // — the sheet (trade %s + figures) is assembled HERE and travels to the client
  // ONLY after the code verifies, so the trade numbers never ship in the public
  // bundle (Hugo's non-negotiable). Wrong / absent code → { ok:false } with NO
  // sheet. An unset TRADE_ACCESS_CODE keeps the sheet gated for everyone. Never
  // blocks / never 500s.
  if (kind === "trade-access") {
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const expected = (process.env.TRADE_ACCESS_CODE ?? "").trim();
    const ok = expected.length > 0 && code.length > 0 && safeEqual(code, expected);
    return send(200, ok ? { ok: true, sheet: buildTradeSheet() } : { ok: false });
  }

  // ── PARTNER TERMS GATE (kind:"partner-terms") ────────────────────────────
  // Mirrors trade-access. The /partners/terms gate POSTs the shared partner
  // code; on a constant-time match against process.env.PARTNER_TERMS_CODE we
  // return { ok:true, terms } where `terms` (commission rates + worked examples)
  // is assembled HERE and travels to the client ONLY after the code verifies —
  // so the commission figures never ship in the public bundle. Wrong / absent
  // code → { ok:false }. Unset PARTNER_TERMS_CODE keeps it gated for everyone.
  if (kind === "partner-terms") {
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const expected = (process.env.PARTNER_TERMS_CODE ?? "").trim();
    const ok = expected.length > 0 && code.length > 0 && safeEqual(code, expected);
    return send(200, ok ? { ok: true, terms: buildPartnerTerms() } : { ok: false });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.SITE_URL;
  if (!secret) return send(500, { error: "Server missing STRIPE_SECRET_KEY." });

  // ── TRADE BILLING (kind:"trade-quote") ───────────────────────────────────
  // ADMIN_API_KEY-gated. Computes the trade-discounted total from the SAME
  // TIERS retail the gated sheet advertises (advertised == charged, gotcha #9)
  // and mints a Stripe Payment Link at that total. NEVER touches the public
  // basket flow; trade discount REPLACES bundle discounts (no bundlePercentOff
  // here). Handled before the SITE_URL check — payment links don't use SITE_URL.
  if (kind === "trade-quote") {
    return handleTradeQuote(body, secret, send);
  }

  if (!siteUrl) return send(500, { error: "Server missing SITE_URL." });

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
          canvas: body.canvas,
          frameStyle: body.frameStyle,
          glazing: body.glazing,
          paperFinish: body.paperFinish,
          canvasEdge: body.canvasEdge,
          quantity: body.quantity,
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
      raw?.canvas,
      raw?.quantity,
      raw?.paperFinish,
      raw?.canvasEdge,
    );
    if ("error" in result) return send(400, result);
    normalised.push(result);
  }

  // A basket of ONLY gift cards needs NO shipping address / options.
  const giftOnly = normalised.length === 0 && gifts.length > 0;

  // ---- Bundle discount ----------------------------------------------------
  // Percent derived from the basket CONTENTS by bundlePercentOff (12% complete
  // catalogue / 10% colourway set / 8% on 3+ / 5% on 2). Mirrors paintings.ts
  // (gotcha #9). Computed HERE — before the line items are built — because the
  // saving is applied as a PER-UNIT reduction on each print line item rather
  // than as a session-level coupon; see the bundleNet note below.
  const advertisedPercentOff = bundlePercentOff(normalised);

  // ---- #13 MARGIN-FLOOR GUARD --------------------------------------------
  // A bundle discount applies to the WHOLE line (print + frame + embellish are
  // separate line items, all reduced together). The danger case is a deeply-
  // discounted line whose net price dips under that line's fully-loaded COST
  // FLOOR. This guard makes "never below cost" a HARD invariant independent of
  // whatever discount logic exists now or later.
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
      // Floored to a whole percent because the reduction is a whole percent
      // (rounding DOWN is the safe direction — a shallower discount).
      const lineMaxPct = Math.max(
        0,
        Math.floor((1 - floor / retail) * 100),
      );
      if (lineMaxPct < maxSafePct) maxSafePct = lineMaxPct;
      // Worst case: even at 0% discount the BASE retail is below cost floor —
      // only possible after a bad manual price edit. Per this task's brief the
      // guard NEVER blocks checkout, so we log loudly rather than rejecting.
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

  /**
   * The converted MINOR unit amounts of the Stripe line items ONE configured
   * print line produces, in the same order the build loop below pushes them
   * (print, framing, hand-finish, canvas). Mirror of `stripeLineItemsFor` in
   * src/pages/Basket.tsx (gotcha #9) — the displayed bundle saving and the
   * charged one must read the same list, or advertised != charged.
   */
  const unitAmountsFor = (item: NormalisedItem): number[] => {
    const amounts = [toMinor(item.tier.pricePence)];
    if (item.framing && typeof item.tier.framingPricePence === "number") {
      // Include the premium-frame surcharge — the framing LINE ITEM charges
      // framingPricePence + frameSurchargePence, so the discount base must too.
      amounts.push(toMinor(item.tier.framingPricePence + item.frameSurchargePence));
    }
    if (item.embellished && typeof item.tier.embellishmentPricePence === "number") {
      amounts.push(toMinor(item.tier.embellishmentPricePence));
    }
    if (item.canvas && typeof item.tier.canvasPricePence === "number") {
      // Include the canvas float-edge surcharge — the canvas line item charges
      // canvasPricePence + canvasEdgeSurchargePence.
      amounts.push(toMinor(item.tier.canvasPricePence + item.canvasEdgeSurchargePence));
    }
    return amounts;
  };

  // ⚠️ MONEY + REDEEMABILITY. The bundle saving used to be a session-level
  // `discounts:[{coupon}]`, and Stripe FORBIDS `discounts` and
  // `allow_promotion_codes` together — so ANY basket of 2+ prints rendered NO
  // promo-code field at all. A recipient holding a £750 gift code had nowhere
  // to type it, with no error and no explanation. Applying the saving as a
  // PER-UNIT price reduction on the print line items instead leaves the promo
  // field free for the gift / Family & Friends code.
  //
  // The reduction must land on exactly the figure /basket showed. Basket.tsx
  // computes the saving as Σ round(unitMinor × qty × pct / 100) per SUB-AMOUNT;
  // a per-unit reduction gives Σ round(unitMinor × pct / 100) × qty. Those are
  // equal whenever unitMinor × pct is a whole multiple of 100 — true for every
  // price in the ladder today (every unit amount is a whole £, and every
  // non-GBP amount rounds to a whole major unit) — but a future price ending in
  // odd pence could break it. So we CHECK, and fall back to the old coupon
  // shape (losing the promo field, keeping the money exact) if it ever differs.
  let expectedBundleMinor = 0; //  what /basket displayed
  let perUnitBundleMinor = 0; //   what a per-unit reduction would charge
  if (percentOff > 0) {
    for (const item of normalised) {
      for (const a of unitAmountsFor(item)) {
        expectedBundleMinor += Math.round((a * item.quantity * percentOff) / 100);
        perUnitBundleMinor += Math.round((a * percentOff) / 100) * item.quantity;
      }
    }
  }
  const bundleOnLines =
    percentOff > 0 && perUnitBundleMinor === expectedBundleMinor;
  if (percentOff > 0 && !bundleOnLines) {
    console.warn(
      "[/api/checkout] ⚠️ per-unit bundle reduction would not match the " +
        `advertised saving (${perUnitBundleMinor} vs ${expectedBundleMinor} ` +
        `${currencyCode}) — falling back to a session coupon. The promo-code ` +
        "field will NOT render on this checkout. A tier / add-on price is no " +
        "longer a whole major unit; fix it in src/data/paintings.ts AND " +
        "api/checkout.ts (gotcha #9).",
    );
  }
  /** A print line item's unit amount, net of the bundle saving. Gift lines and
   *  the fallback-coupon path pass through at full price. */
  const bundleNet = (unitMinor: number): number =>
    bundleOnLines ? unitMinor - Math.round((unitMinor * percentOff) / 100) : unitMinor;
  // Named on each reduced print line so the buyer's receipt says WHY the figure
  // is below the catalogue price. Reuses the coupon's own existing name.
  const BUNDLE_NOTE = bundleOnLines
    ? ` Estate bundle thank-you — ${percentOff}% applied.`
    : "";

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
      quantity: item.quantity,
      price_data: {
        currency: currencyCode,
        unit_amount: bundleNet(toMinor(item.tier.pricePence)),
        product_data: {
          name: `${item.title} — ${item.colourway} — ${item.tier.label} ${item.tier.size}${item.tier.isOneOff ? "" : ` · ${EDITION_LABEL}`}`,
          // The chosen paper finish (framed prints only) is named on the print
          // line so it lands in the estate's Stripe order — that's how the
          // estate knows which stock to order from the print house.
          description: `${sizeFor(item.paintingId, item.tier)}. ${item.tier.editionLabel}.${item.tier.isOneOff ? "" : ` Issued in the ${EDITION_LABEL}.`}${item.paperFinish ? ` Paper: ${item.paperFinish}.` : ""} ${PRINT_SPEC}${BUNDLE_NOTE}`,
          // No product_data.images — Stripe synchronously fetches each image
          // URL when creating the session, and an unreachable / slow image
          // can hang the call (gotcha #3 in CLAUDE.md).
        },
      },
    });
    if (item.framing && typeof item.tier.framingPricePence === "number") {
      // The buyer's chosen finish (frame style + glazing) is named on the line
      // so it appears on Stripe checkout, the receipt AND the dashboard order
      // the estate works from when placing the Point 101 frame order. Premium
      // frames (Signature / Ornate) add a surcharge on top of the base framing
      // price — folded into this SAME line so the buyer sees one framed figure.
      const finish =
        item.frameStyle && item.glazing
          ? `${item.frameStyle} frame · ${item.glazing}`
          : "Bespoke frame";
      lineItems.push({
        quantity: item.quantity,
        price_data: {
          currency: currencyCode,
          unit_amount: bundleNet(
            toMinor(item.tier.framingPricePence + item.frameSurchargePence),
          ),
          product_data: {
            name: `Framing — ${finish} — ${item.title} (${item.tier.label} ${item.tier.size})`,
            description: `${finish}, set within a white window mount and ready to hang. Hand-finished for the ${item.tier.label} edition.${BUNDLE_NOTE}`,
          },
        },
      });
    }
    if (
      item.embellished &&
      typeof item.tier.embellishmentPricePence === "number"
    ) {
      lineItems.push({
        quantity: item.quantity,
        price_data: {
          currency: currencyCode,
          unit_amount: bundleNet(toMinor(item.tier.embellishmentPricePence)),
          product_data: {
            name: `Hand-finished by Polly Wedge — ${item.title} (${item.tier.label} ${item.tier.size})`,
            // Mirror of EMBELLISHMENT_NOTE in src/data/paintings.ts (gotcha #9 —
            // the add-on label + wording lives in several places). Lead time is
            // "up to two weeks" (reduced from 4 weeks 2026-06-04); keep this in
            // sync with api/stripe-webhook.ts + PaintingDetail FINISH_LEAD_WEEKS.
            description:
              "Hand-finished in Stephen's geometric tradition by Polly Wedge (estate). Made by hand and to order — please allow up to two weeks." +
              BUNDLE_NOTE,
          },
        },
      });
    }
    if (item.canvas && typeof item.tier.canvasPricePence === "number") {
      lineItems.push({
        quantity: item.quantity,
        price_data: {
          currency: currencyCode,
          unit_amount: bundleNet(
            toMinor(item.tier.canvasPricePence + item.canvasEdgeSurchargePence),
          ),
          product_data: {
            name: `Canvas print — ${item.title} (${item.tier.label} ${item.tier.size})`,
            // Mirror of CANVAS_NOTE in src/data/paintings.ts.
            description: `Printed as a fine-art giclée on Hahnemühle 370gsm art canvas — a smooth, heavyweight canvas print. Made to order.${BUNDLE_NOTE}`,
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
      // Premium-frame surcharge (pence) so the confirmation email itemises the
      // framing sub-line at the amount actually charged (gotcha #9).
      frame_surcharge_pence: String(normalised[0].frameSurchargePence),
      // Canvas substrate so the confirmation email itemises it AND the estate's
      // fulfilment payload flags stretched-canvas (not paper) + the edge finish.
      canvas: normalised[0].canvas ? "yes" : "no",
      canvas_edge: normalised[0].canvasEdge ?? "",
      canvas_edge_surcharge_pence: String(normalised[0].canvasEdgeSurchargePence),
      quantity: String(normalised[0].quantity),
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
      frame_surcharges: truncateMetadata(
        normalised.map((i) => String(i.frameSurchargePence)),
      ),
      canvas_flags: truncateMetadata(
        normalised.map((i) => (i.canvas ? "y" : "n")),
      ),
      canvas_edges: truncateMetadata(normalised.map((i) => i.canvasEdge ?? "")),
      canvas_edge_surcharges: truncateMetadata(
        normalised.map((i) => String(i.canvasEdgeSurchargePence)),
      ),
      embellished_flags: truncateMetadata(
        normalised.map((i) => (i.embellished ? "y" : "n")),
      ),
      quantities: truncateMetadata(normalised.map((i) => String(i.quantity))),
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
    // ⚠️ POSITIONAL — READ THIS BEFORE EDITING. api/stripe-webhook.ts zips these
    // arrays BY INDEX to decide which recipient is emailed which code. They are
    // therefore FIXED-ARITY (exactly one slot per gift, empty slots preserved)
    // and PIPE-joined via joinGiftSlots.
    //   • `.filter(Boolean)` used to be applied to the name/email arrays. Card 1
    //     "£25, no recipient" + card 2 "£500 for alice@…" collapsed to a single
    //     email slot → ALICE WAS SENT THE £25 CODE and the £500 one fell back to
    //     the buyer. Never filter these.
    //   • comma was the separator. A recipient name "Smith, John" shifted every
    //     later slot the same way — hence pipes, plus the "|" replacement in
    //     giftText so a value can never carry the separator itself.
    //   • truncateMetadata is NOT used here: its "…+N more" tail DROPS trailing
    //     entries, which shifts the zip identically. joinGiftSlots caps PER SLOT.
    metadata.gift_amounts_pence = joinGiftSlots(
      gifts.map((g) => String(g.amountPence)),
    );
    // ⚠️ MONEY (#5 currency): the GBP figure above is the catalogue value; THIS
    // is the minor-unit amount the buyer was actually charged for each gift in
    // the presentment currency. The webhook mints the gift coupon's base
    // amount_off from it, in `gift_currency` — a Stripe amount_off coupon's
    // currency must match the session currency it is redeemed against, so a card
    // bought in USD used to mint as GBP and simply fail at redemption.
    metadata.gift_amounts_minor = joinGiftSlots(
      gifts.map((g) => String(toMinor(g.amountPence))),
    );
    metadata.gift_currency = currencyCode;
    metadata.gift_total_pence = String(
      gifts.reduce((sum, g) => sum + g.amountPence, 0),
    );
    metadata.gift_labels = joinGiftSlots(gifts.map((g) => g.label));
    metadata.gift_recipient_names = joinGiftSlots(
      gifts.map((g) => g.recipientName),
    );
    metadata.gift_recipient_emails = joinGiftSlots(
      gifts.map((g) => g.recipientEmail),
    );
    // The buyer's personal message, one slot per gift. ⚠️ This was written as a
    // singular `gift_message` key, and only when the basket held exactly ONE
    // card — while the webhook reads `gift_messages` (plural, pipe-joined). The
    // key names never matched, so the note the /gift page asks for twice and the
    // basket quotes back was silently dropped on EVERY order.
    metadata.gift_messages = joinGiftSlots(gifts.map((g) => g.giftMessage));
  }


  // UTM attribution (contract C1) — appended last. All keys are utm_-prefixed
  // so they can never collide with the order keys above; only non-empty
  // validated fields are written (max 8 keys, values ≤200 chars — see
  // utmMetadata for the Stripe 50-key / 500-char headroom note).
  Object.assign(metadata, utmMetadata(body.utm));
  // Partner referral — written as a single `partner_ref` key (see refMetadata).
  Object.assign(metadata, refMetadata(body.ref));

  // Note: `new Stripe(secret)` with no apiVersion — pinning a version
  // literal like "2025-09-30.clover" can mismatch the SDK's exported type
  // union (gotcha #6 in CLAUDE.md). Let the SDK use its pinned default.
  const stripe = new Stripe(secret);

  // ---- Bundle discount — FALLBACK coupon path only ------------------------
  // The bundle saving is normally applied as a per-unit reduction on the print
  // line items (see bundleNet above) precisely so `allow_promotion_codes` can
  // stay on. This coupon path runs ONLY when the per-unit reduction could not
  // reproduce the advertised saving to the penny (bundleOnLines === false) —
  // money exactness outranks the promo field. Failures are swallowed; never
  // block checkout on a mint failure.
  let discounts: Array<{ coupon: string }> | undefined;
  if (!bundleOnLines && expectedBundleMinor > 0) {
    try {
      const coupon = await stripe.coupons.create({
        amount_off: expectedBundleMinor,
        currency: currencyCode,
        duration: "once",
        name: "Estate bundle thank-you",
        metadata: {
          source: "bundle_discount",
          item_count: String(normalised.length),
          percent_off: String(percentOff),
          amount_off_minor: String(expectedBundleMinor),
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
  // Recorded on the session so the estate can see the saving that was applied
  // and HOW, without re-deriving it from the line items.
  if (percentOff > 0) {
    metadata.bundle_percent_off = String(percentOff);
    metadata.bundle_discount_minor = String(expectedBundleMinor);
    metadata.bundle_applied_as = bundleOnLines ? "line_items" : "coupon";
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
        // Worldwide (2026-07-27): every page promises free worldwide delivery and
        // the "Deliver to → Rest of world" picker offers it, so checkout must NOT
        // dead-end a non-listed country at the payment step. Delivery is a flat £0
        // rate for every region (buildShippingOptions), so widening this list adds
        // zero cost and cannot affect advertised==charged. Stephen's collector base
        // is Gulf/Dubai — those were previously blocked. This is the broad set of
        // Stripe-supported destinations (sanctioned countries are rejected by
        // Stripe automatically and are intentionally omitted).
        shipping_address_collection: {
          allowed_countries: ALLOWED_SHIPPING_COUNTRIES as unknown as NonNullable<
            Stripe.Checkout.SessionCreateParams["shipping_address_collection"]
          >["allowed_countries"],
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
    // Stripe disallows `allow_promotion_codes` and `discounts` together, so the
    // promo-code field is the DEFAULT and `discounts` is now only ever set on
    // the rare fallback path above.
    // ⚠️ This used to be the other way round: any basket of 2+ prints carried a
    // bundle coupon and therefore rendered NO promo-code field at all. The old
    // comment justified it as "the bundle beats their thank-you code" — true of
    // a 10% code, catastrophic for a fixed-amount GIFT code, which the
    // recipient then had nowhere to enter, with no error and no explanation.
    //
    // ⚠️ FARMING GUARD: promo codes are refused on any basket containing a gift
    // card. A gift coupon has no `applies_to` restriction (the line items are
    // ad-hoc `price_data` products, so there is no stable product id to
    // restrict to), so redeeming a £525 code against a £525 gift card cost £0
    // and minted a FRESH £525 code with a fresh 365-day expiry — repeatable
    // forever. Refusing the field on gift baskets closes it at the only surface
    // where a code can be entered. The webhook independently declines to mint a
    // thank-you code on a £0 / gift-only order.
    ...(discounts
      ? { discounts }
      : { allow_promotion_codes: gifts.length === 0 }),
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
      bundleDiscount: percentOff > 0 ? `${percentOff}%` : "no",
      bundleAppliedAs: percentOff > 0 ? (bundleOnLines ? "line_items" : "coupon") : "none",
      promoCodeField: discounts ? false : gifts.length === 0,
    });
    return send(200, { url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe checkout failed.";
    console.error("[/api/checkout] Stripe error:", message);
    return send(500, { error: message });
  }
}
