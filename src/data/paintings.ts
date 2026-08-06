// =============================================================================
// PAINTINGS DATA
// =============================================================================
// This file is the source of truth for every painting on the site.
//
// HOW TO EDIT:
//   - Edit any text in quotes (titles, descriptions, dates)
//   - Replace "[TBD]" placeholders with real values when ready
//   - Set `available: false` on a colourway to hide its swatch on the site
//   - Add new colourways inside a painting's `colourways: [...]` array
//   - Add new paintings as new objects in the exported array below
// =============================================================================

export interface Colourway {
  name: string;
  image: string;          // path under /public, e.g. "/img/paintings/wild-rose-sussex-pink.jpg"
  hex: string;            // hex colour for the swatch dot
  isOriginal: boolean;    // true if this is the original print; false for alt colourways
  available: boolean;     // set false to hide the swatch entirely
  sizing?: string;        // [TBD] e.g. "Limited edition giclée print, A1 (594 × 841 mm)"
  framing?: string;       // [TBD] e.g. "Hand-finished oak frame with museum glass"
  price?: string;         // [TBD] e.g. "£450"
  editionSize?: string;   // [TBD] e.g. "Limited to 50, hand-signed"
  colourwayNote?: string; // [TBD] the story of why this colourway exists (Stephen's studio files)
}

/**
 * A single rung on the print ladder. Stephen is deceased — every print is
 * authenticated by The Mandala Company (the estate) via an estate stamp
 * (debossed "SEM · The Mandala Company" + serial), NOT a hand signature.
 * Picasso Estate / Hepworth Estate precedent. Every tier ships with a
 * Certificate of Authenticity on estate letterhead.
 *
 * Pricing is in PENCE (integer) — never floats.
 */
export interface PrintTier {
  id: "atelier" | "collector" | "atelier-grande" | "heirloom" | "studio";
  label: string;                // "Open Edition", "Collector Edition", "Atelier Edition", "Heirloom Edition", "Original — One of One"
  size: string;                 // "29.5 × 29.5 cm"
  pricePence: number;           // integer pence
  editionTotal: number | null;  // per-edition allocation cap; null = Open Edition (no cap, not numbered)
  editionLabel: string;         // neutral edition language, e.g. "Collector Edition — edition of 200, hand-numbered"
  /** Provenance line shown on the SELECTED tier — institutional, never scarcity/urgency. */
  editionPromise?: string;
  framingPricePence?: number;   // optional framing surcharge (A2 + A1 only)
  /**
   * Optional hand-embellishment add-on surcharge. Polly Wedge finishes the
   * print by hand in Stephen's geometric tradition. Only meaningful on A2
   * + A1 (the sizes worth her time); A3 / A0 omit.
   */
  embellishmentPricePence?: number;
  /**
   * Optional "print on stretched canvas" surcharge. The image is printed onto
   * fine-art canvas, stretched on a subframe and finished ready-to-hang (no
   * glass, no separate frame — so it's mutually exclusive with framing). A2/A1/
   * A0 only; A3 is too small for canvas. Point 101 fulfilment.
   */
  canvasPricePence?: number;
  description?: string;         // optional one-liner (e.g. gold-leaf detail)
  available: boolean;           // hide tier site-wide by flipping to false
  isAnchor?: boolean;           // marks the recommended / default tier
  /**
   * Marks a unique, made-once piece (no edition, no add-ons — it IS the
   * hand-finished work). The Studio tier is the only one-off today. Orla
   * renders one-off tiers as a full-width card on PaintingDetail, not a
   * size radio. No framing / embellishment price — the price is the piece.
   */
  isOneOff?: boolean;
}

export interface Painting {
  id: string;
  title: string;
  year: string;
  collection: "habundia" | "genesis" | "born-in-the-sky" | "ancient-canons";
  size?: string;           // e.g. "60 × 60 cm (approx. 24 × 24 in)" — from the source PDF
  description: string;     // the full story for this painting
  artistQuote?: string;    // Stephen's own words, if a quote exists for this piece
  location?: string;       // e.g. "Ditchling, Sussex"
  /**
   * Habundia botanical-pigment line — surfaced as a quiet "Pigment" key-fact on
   * the product page. Set ONLY where it is literally true (the paint contains
   * the depicted flower's own oil). Drawn from the painting's own description —
   * never invented.
   */
  pigmentNote?: string;
  colourways: Colourway[];
  /**
   * Optional per-painting overrides. If unset, DEFAULT_PRINT applies.
   * pricePence is integer pence (e.g. 25000 for £250) — never floats.
   */
  printPricePence?: number;
  printSize?: string;
  /**
   * Optional per-painting tier override. If unset, the canonical PRINT_TIERS
   * ladder applies uniformly. Future-proofing — not used by any painting
   * today, the four-tier ladder is uniform across the catalogue.
   */
  printTiers?: PrintTier[];
}

/**
 * Boilerplate from the source PDFs, identical for every painting.
 * Centralised here so editing once propagates to every painting page.
 *
 * Updated 2026-05-28: reflects estate-stamped reality (Stephen deceased,
 * authentication via estate stamp + COA, not hand signature). Printer
 * is Point 101 in London, the UK's leading giclée print atelier.
 */
export const ORIGINAL_PRINT_SPEC =
  "Printed on Hahnemühle Photo Rag — 308gsm, 100% cotton archival fine-art paper — using pigment inks. Each print is estate-stamped by The Mandala Company, numbered within its edition, and ships with a Certificate of Authenticity carrying a unique Certificate ID. Individually made to order at our London atelier.";

/**
 * The edition the catalogue is CURRENTLY issuing under. Every artwork is
 * released in named, numbered editions — this is the live one. Subsequent
 * editions increment (Second Edition, Third Edition) or run as a Seasonal /
 * Archive Edition. Surfaced as the edition identifier on product metadata, the
 * Certificate of Authenticity, and the estate registry.
 *
 * `id` is the STABLE internal ledger key (kept "edition-i" across the
 * registry / KV / Supabase shape); `label` is the user-facing name. ⚠️ Mirror
 * of LEDGER_EDITION in api/stripe-webhook.ts (gotcha #9).
 */
export const CURRENT_EDITION = {
  id: "edition-i",
  label: "First Edition",
};

/**
 * The single institutional line shown across every product — replaces all
 * lifetime-edition / permanent-scarcity copy. Neutral, archival register: no
 * urgency, no countdowns, no "never reopened".
 */
export const GLOBAL_EDITION_NOTE =
  "Each work is issued in numbered editions, with a limited allocation per release. Future editions may introduce new allocations or variations.";

export const COLOURWAY_NOTE =
  "Each colourway was created by Stephen himself and discovered on his computer in his studio. These are his own colour variations of the work, exactly as he left them.";

/**
 * Provenance line for the originals. Surfaced quietly on PaintingDetail so a
 * serious collector reads it without it being shouted. Hugo's verbatim brief:
 * the originals are held in the family's legal name in a safe garage and are
 * not currently for sale.
 */
export const ORIGINAL_PROVENANCE =
  "Held privately by the estate — the original is not currently for sale.";

/**
 * Hand-embellishment add-on copy. Polly Wedge (estate) hand-finishes selected
 * prints in Stephen's geometric tradition. This is the constraint, not the
 * print format — so it's priced as a separate add-on (mirroring framing's
 * plumbing) rather than as its own tier.
 */
export const EMBELLISHMENT_NOTE =
  "Each print is hand-finished in Stephen's geometric tradition by Polly (Stephen's sister). Made by hand and to order — please allow up to two weeks.";

/**
 * Copy for the Studio one-off tier (the £2,650 hand-painted unique piece).
 * Distinct from EMBELLISHMENT_NOTE: that's an add-on finishing of a print;
 * this is a singular work in its own right. Surfaced by Orla on the PDP
 * as a full-width card (tiers with `isOneOff: true`).
 */
export const STUDIO_ONE_OFF_NOTE =
  "A singular work: Polly (Stephen's sister) hand-paints geometric detail in Stephen's tradition onto a large archival print, making each one unique. One of one. Allow 6 weeks.";

/**
 * Single source of truth for the estate-stamp / COA / numbering language.
 * Consumed by PaintingDetail, Basket, and the OrderConfirmation email so
 * the authentication story reads identically everywhere.
 */
export const ESTATE_AUTHENTICATION = {
  stamp: "Estate-stamped by The Mandala Company",
  stampLabel: "Estate stamp",
  numbering: "Numbered within its edition",
  numberingLabel: "Numbered within the edition",
  coa: "Ships with a Certificate of Authenticity carrying a unique Certificate ID",
  coaLabel: "Certificate of Authenticity",
  // NOTE: the print atelier is deliberately NOT named to buyers (Hugo, 2026-07-11:
  // naming the printer can read as un-prestigious to snobbier collectors; value sits
  // in the estate stamp + one-off status, not the vendor). The real supplier
  // (Point 101, London) stays named ONLY in internal/estate-facing surfaces (the
  // fulfilment email + code comments). Buyer copy: unnamed but premium.
  printer: "Printed at a leading giclée atelier in London",
  printerLabel: "Atelier-printed in London",
};

/**
 * The canonical EDITION-BASED tier ladder. Every artwork is released in named,
 * numbered editions (see CURRENT_EDITION); each tier carries its own per-edition
 * allocation — inventory is managed per edition, NEVER globally capped across
 * all time. Subsequent runs come only as NEW editions, never by reopening a
 * prior one.
 *
 *   Open Edition      (A3) — no allocation cap, not numbered
 *   Collector Edition (A2) — edition of 200 · the anchor / conversion target
 *   Atelier Edition   (A1) — edition of 75
 *   Heirloom Edition  (A0) — edition of 18 · statement piece
 *
 * Internal tier `id`s, prices and SKUs are UNCHANGED so existing checkout /
 * ledger references keep working. `editionTotal` is the per-edition allocation
 * (null = Open Edition, no cap). Prices mirrored in the three /api files
 * (gotcha #9).
 */
export const PRINT_TIERS: PrintTier[] = [
  {
    id: "atelier",
    label: "Open Edition",
    size: "29.5 × 29.5 cm",
    pricePence: 29500, // £295 (2026-07-25 squeeze pass)
    editionTotal: null, // Open Edition — no allocation cap, not numbered
    editionLabel: "Open Edition — unnumbered, issued to order",
    editionPromise: "issued to order in the current edition",
    // A3 is a FRAMED product like every other size (Hugo 2026-07-24: "every
    // product has to be framed including A3"). Prices CONFIRMED 2026-07-24
    // against Point 101 costs (framed ~£82 / canvas ~£50 to us): framed £520
    // total (£275 + £245), canvas £425 (£275 + £150). MONEY: mirrored in
    // api/checkout.ts + email-basket.ts (gotcha #9).
    framingPricePence: 15000, // £150 framing (A3) — Hugo 2026-07-27: framed priced == canvas (framed A3 = £445), so the framed ENTRY isn't a scary £590
    canvasPricePence: 15000, // £150 — print on stretched canvas (A3)
    description:
      "Open Edition, estate-stamped, issued to order, ships with a Certificate of Authenticity",
    available: true,
  },
  {
    id: "collector",
    label: "Collector Edition",
    size: "42 × 42 cm",
    pricePence: 52500, // £525 (2026-07-25 squeeze pass)
    editionTotal: 200, // per-edition allocation
    editionLabel: "Collector Edition — edition of 200, hand-numbered",
    editionPromise: "allocated within the current edition",
    framingPricePence: 22500, // £225 framing (A2) — Hugo 2026-07-27: framed priced == canvas (framed A2 = £750)
    embellishmentPricePence: 59500, // £595 hand-finishing by Polly Wedge (2026-07-25 squeeze pass — near-100% margin, artist's own hand)
    canvasPricePence: 22500, // £225 — canvas add-on; premium ready-to-hang alternative sitting below the framed total
    description:
      "Collector Edition of 200, estate-stamped, hand-numbered, COA",
    available: true,
    isAnchor: true,
  },
  {
    id: "atelier-grande",
    label: "Atelier Edition",
    size: "59.5 × 59.5 cm",
    pricePence: 97500, // £975 (2026-07-25 squeeze pass)
    editionTotal: 75, // per-edition allocation
    editionLabel: "Atelier Edition — edition of 75, hand-numbered",
    editionPromise: "allocated within the current edition",
    framingPricePence: 32500, // £325 framing (A1) — Hugo 2026-07-27: framed priced == canvas (framed A1 = £1,300)
    embellishmentPricePence: 89500, // £895 hand-finishing by Polly Wedge (2026-07-25 squeeze pass)
    canvasPricePence: 32500, // £325 — canvas add-on; premium ready-to-hang alternative sitting below the framed total
    description:
      "Atelier Edition of 75, estate-stamped, hand-numbered, COA",
    available: true,
  },
  {
    id: "heirloom",
    label: "Heirloom Edition",
    size: "84 × 84 cm",
    pricePence: 199500, // £1,995 (2026-07-25 squeeze pass — cleaner premium figure than £1,895)
    editionTotal: 18, // per-edition allocation
    editionLabel: "Heirloom Edition — edition of 18, hand-numbered",
    editionPromise: "allocated within the current edition",
    description:
      "Heirloom Edition of 18, estate-stamped, hand-numbered, COA, optional gold-leaf detail",
    // Hand-finish enabled on A0 (2026-07-14) — the highest-value buyers can add
    // Polly's hand-finishing (deliverable: it's the print itself). ⚠️ FRAMING is
    // deliberately NOT offered on A0: a glazed A0 frame (84cm) exceeds Point
    // 101's 610mm glazed-delivery cap, so we must not sell a framed+glazed A0
    // with a free-worldwide-delivery promise we can't honour. If a buyer wants
    // A0 framed, it's a bespoke enquiry (like custom sizes), arranged per-order.
    embellishmentPricePence: 129500, // £1,295 hand-finishing by Polly Wedge (A0) (2026-07-25 squeeze pass)
    canvasPricePence: 42500, // £425 — canvas add-on; A0's only ready-to-hang option (no framed A0)
    // ENABLED 2026-06-06 — Point 101 A0 fulfilment confirmed. Charged price
    // mirrored in api/checkout.ts TIERS["heirloom"].
    // 2026-07-27 (Hugo: "we removed the heirloom / the a0 — it's still everywhere"):
    // HIDDEN from every buyer surface. Flipping available:false is the reversible,
    // checkout-safe lever (same pattern as the `studio` one-off below): it auto-drops
    // A0 from Gift denominations, getPrintTiers(), the PDP size grid, and the
    // prerendered Product JSON-LD. The api/checkout.ts + stripe-webhook.ts +
    // email-basket.ts `heirloom` rows are KEPT intact so a stale client / in-flight
    // A0 order can't crash checkout or render a broken confirmation email. Flip back
    // to true to re-list A0.
    available: false,
  },
  {
    // Studio — a singular, hand-painted one-off. OUTSIDE the edition model:
    // there is only ever one, so it is not issued in editions. Kept hidden
    // until the estate chooses to sell unique originals.
    id: "studio",
    label: "Original — One of One",
    size: "59.5 × 59.5 cm",
    pricePence: 265000, // £2,650 (marked up 2026-07-13, hidden tier — kept above A0)
    editionTotal: 1,
    editionLabel: "Unique — one of one",
    description: "Hand-painted by Polly (Stephen's sister), one of one",
    isOneOff: true,
    // Hidden (Hugo): not selling unique originals until their value has risen.
    // api/checkout.ts keeps its `studio` pricing row so a stale client can't
    // crash checkout while hidden.
    available: false,
  },
];

/**
 * OPHIUCHUS — the one LANDSCAPE work in the catalogue. Its source file is
 * 2000 × 1622 px (≈ 1.233 : 1, wider than tall — the square mandala sits in a
 * starfield that extends left and right), so its giclée prints reproduce that
 * landscape proportion rather than the square format the rest of the (square)
 * catalogue uses. Each tier keeps the SAME Point 101 A-series sheet, ids,
 * prices, editions and add-ons as PRINT_TIERS — only the printed dimensions
 * change: height = the square tier's A short side, width = height × (2000/1622).
 * The landscape print still fits within the same A sheet (1.233 < the √2 ≈
 * 1.414 paper ratio), so price parity holds and every pricing mirror stays
 * valid. Built from PRINT_TIERS by overriding `size` only, so the ladder can
 * never drift from the canonical prices/editions.
 *
 * ⚠️ Mirror obligation (gotcha #9): the SAME per-tier landscape sizes are
 * hand-mirrored in api/checkout.ts, api/stripe-webhook.ts and
 * api/email-basket.ts (PAINTING_TIER_SIZE.ophiuchus) so the dimensions Point
 * 101 is asked to print match this product page. Change all four together.
 */
const OPHIUCHUS_TIER_SIZE: Record<PrintTier["id"], string> = {
  atelier: "36.4 × 29.5 cm",
  collector: "51.8 × 42 cm",
  "atelier-grande": "73.4 × 59.5 cm",
  heirloom: "103.6 × 84 cm",
  studio: "73.4 × 59.5 cm",
};

export const OPHIUCHUS_PRINT_TIERS: PrintTier[] = PRINT_TIERS.map((t) => ({
  ...t,
  size: OPHIUCHUS_TIER_SIZE[t.id],
}));

/**
 * ROYAL KNOT — the second landscape work (Ancient Canons). Its source is
 * 2048 × 1069 px (≈ 1.916 : 1) — WIDER than the √2 ≈ 1.414 A-series paper
 * ratio, so (unlike Ophiuchus, 1.233) it cannot keep height = the square tier's
 * short side without overrunning the sheet. Instead each tier fills the A
 * sheet's LONG side as the print WIDTH and derives height = width ÷ 1.916, so
 * the landscape print sits within the SAME A sheet as the square tier (price /
 * edition / add-ons all unchanged — only `size` differs). This keeps the buy
 * page, framed/canvas preview and the dimensions Point 101 prints faithful to
 * the artwork's true proportions instead of a square crop.
 *
 * ⚠️ Mirror obligation (gotcha #9): the SAME per-tier sizes are hand-mirrored in
 * api/checkout.ts, api/stripe-webhook.ts and api/email-basket.ts
 * (PAINTING_TIER_SIZE["royal-knot"]). Change all four together.
 */
const ROYAL_KNOT_TIER_SIZE: Record<PrintTier["id"], string> = {
  atelier: "42 × 21.9 cm",
  collector: "59.4 × 31 cm",
  "atelier-grande": "84.1 × 43.9 cm",
  heirloom: "118.9 × 62.1 cm",
  studio: "84.1 × 43.9 cm",
};

export const ROYAL_KNOT_PRINT_TIERS: PrintTier[] = PRINT_TIERS.map((t) => ({
  ...t,
  size: ROYAL_KNOT_TIER_SIZE[t.id],
}));

/**
 * Default print spec used when a painting doesn't override. Edit these two
 * values to change every print across the catalogue at once. Add a
 * `printPricePence` / `printSize` override on individual Painting entries
 * if a single piece sells at a different price (e.g. larger format).
 *
 * Pricing is in PENCE (Stripe's smallest unit for GBP) so all maths stays
 * in integers and there are no rounding bugs at checkout.
 *
 * Points at the ANCHOR tier (A2 Collector, £495, edition of 200) for
 * backwards compatibility with `getPrintPricePence` / `getPrintSize`
 * (still consumed by PaintingDetail + api/checkout.ts until the size-aware
 * wire-up lands in the synthesis round). Keep the api/checkout.ts
 * DEFAULT_PRICE_PENCE / DEFAULT_SIZE constants in sync with these values.
 */
export const DEFAULT_PRINT = {
  pricePence: 52500, // £525 — anchor tier (A2 Collector Edition) (2026-07-25 squeeze pass)
  size: "Giclée print, 42 × 42 cm, Collector Edition, estate-stamped",
  spec: ORIGINAL_PRINT_SPEC,
};

export const getPrintPricePence = (painting: Painting): number =>
  painting.printPricePence ?? DEFAULT_PRINT.pricePence;

export const getPrintSize = (painting: Painting): string =>
  painting.printSize ?? DEFAULT_PRINT.size;

/**
 * Returns the visible print tiers for a given painting. Honours the
 * per-painting `printTiers` override if present, otherwise falls back to
 * the canonical PRINT_TIERS ladder. Either way, only tiers with
 * `available: true` are returned (Heirloom is hidden by default).
 */
export const getPrintTiers = (painting: Painting): PrintTier[] => {
  const ladder = painting.printTiers ?? PRINT_TIERS;
  return ladder.filter((t) => t.available);
};

/**
 * Returns the anchor tier for a painting — the recommended default that
 * the size picker should preselect and the floating price strip should
 * display. Falls back to the first available tier if no tier is anchored,
 * and to the first tier (even if unavailable) as a last resort so this
 * never returns undefined.
 */
export const getAnchorTier = (painting: Painting): PrintTier => {
  const ladder = painting.printTiers ?? PRINT_TIERS;
  const available = ladder.filter((t) => t.available);
  return (
    available.find((t) => t.isAnchor) ??
    available[0] ??
    ladder[0]
  );
};

/**
 * Resolves a tier on a painting's ladder by id, falling back to the painting's
 * anchor tier if the id isn't present / available. Used by the bundle helpers
 * so an advertised set price can be computed from ANY size's `pricePence`, not
 * just the hardcoded anchor (A2). Honours per-painting `printTiers` overrides.
 */
export const getTierById = (
  painting: Painting,
  tierId: PrintTier["id"],
): PrintTier => {
  const ladder = painting.printTiers ?? PRINT_TIERS;
  return ladder.find((t) => t.id === tierId && t.available) ?? getAnchorTier(painting);
};

/**
 * Returns the lowest visible tier price (in pence) for a painting. Used by
 * the browse surfaces (Collections tiles, Welcome Featured Works chip) to
 * advertise the entry price — "from £275" — which lowers the click barrier.
 * The £495 anchor still does its conversion work on the product page itself.
 * Falls back to the anchor price if (defensively) no tiers are visible.
 */
export const getLowestTierPricePence = (painting: Painting): number => {
  const tiers = getPrintTiers(painting);
  if (tiers.length === 0)
    return getTierAdvertisedPricePence(getAnchorTier(painting));
  return Math.min(...tiers.map(getTierAdvertisedPricePence));
};

/**
 * The ADVERTISED / buyable "from" price of a tier (pence). Hugo 2026-07-27:
 * "make it honest." There are NO unframed prints, so the cheapest a buyer can
 * actually complete is base + the cheaper finish (framing or canvas). Since
 * framing == canvas price, that floor = base + framing = the framed price
 * (A3 £445 / A2 £750 / A1 £1,300 / A0 canvas £2,420). Advertising the bare base
 * (£295…) was a GHOST price — no one could check out at it. Every "from" figure
 * — browse tiles, the size ladder, the Google Merchant SKU, the Product JSON-LD
 * offer — routes through this, so advertised == the lowest achievable charge.
 */
export const getTierAdvertisedPricePence = (tier: PrintTier): number => {
  const adds: number[] = [];
  if (typeof tier.framingPricePence === "number") adds.push(tier.framingPricePence);
  if (typeof tier.canvasPricePence === "number") adds.push(tier.canvasPricePence);
  const cheapestFinish = adds.length > 0 ? Math.min(...adds) : 0;
  return tier.pricePence + cheapestFinish;
};

/**
 * Returns the framing surcharge for a tier, or null if framing isn't
 * offered at that size. Framing is currently A2 + A1 only.
 */
export const getFramingPricePence = (tier: PrintTier): number | null =>
  tier.framingPricePence ?? null;

/**
 * Returns the "print on canvas" surcharge for a tier, or null if canvas isn't
 * offered at that size (A2/A1/A0 only). Canvas is ready-to-hang and NOT framed
 * behind glass, so the UI makes canvas + framing mutually exclusive.
 */
export const getCanvasPricePence = (tier: PrintTier): number | null =>
  tier.canvasPricePence ?? null;

/** Copy for the canvas add-on, mirrored into api/checkout.ts (gotcha #9, label only). */
export const CANVAS_NOTE =
  "Printed onto bright 350gsm textured fine-art canvas, hand-stretched over a 39mm-deep solid wooden gallery frame and finished ready to hang — no glass, no separate frame. Made to order.";

// CANVAS EDGE — how the sides of the stretched canvas are finished. Like the
// paper finish. Mirror wrap is the clean default (included); the four float
// (tray) frames set the canvas inside a slim shadow-gap frame for a gallery
// look. ⚠️ MONEY: a float frame is a real hand-built tray frame at Point 101
// (32mm canvas set inside a 10mm-wide, 33mm-deep wood tray) — a genuine premium
// that costs materially more, and MORE at larger sizes. So the surcharge is now
// SIZE-SCALED (per tier) in FLOAT_EDGE_SURCHARGE_PENCE below, not a flat fee
// (Hugo 2026-07-25, replacing the old flat +£45 placeholder after checking the
// Point 101 wizard). `isFloat` marks a tray-framed edge; the money comes from
// FLOAT_EDGE_SURCHARGE_PENCE × tier. Mirrored in api/checkout.ts — gotcha #9.
// A curated THREE canvas finishes (Hugo 2026-08-06: reduce the canvas choices
// too). One included colour-wrap plus two slim float frames — the plain white-
// edge, white-float and wenge-float were cut to keep the choice simple.
export const CANVAS_EDGES = [
  {
    id: "mirror",
    label: "Gallery wrap",
    isFloat: false,
    note: "The artwork continues around all four wrapped edges — the painting's own background (its sky, stars and colour) carries over the sides of the stretcher. A true gallery wrap, ready to hang. Included.",
  },
  {
    id: "float-black",
    label: "Black float frame",
    isFloat: true,
    note: "Set inside a slim matt-black tray frame with a fine shadow-gap reveal — a crisp gallery float. Comes ready to hang.",
  },
  {
    id: "float-white",
    label: "White float frame",
    isFloat: true,
    note: "Set inside a slim matt-white tray frame with a fine shadow-gap reveal — bright and contemporary. Comes ready to hang.",
  },
  {
    id: "float-oak",
    label: "Oak float frame",
    isFloat: true,
    note: "Set inside a slim oak-veneer tray frame with a fine shadow-gap reveal — natural and warm. Comes ready to hang.",
  },
] as const;
export type CanvasEdgeId = (typeof CANVAS_EDGES)[number]["id"];
export const DEFAULT_CANVAS_EDGE: CanvasEdgeId = "mirror";
export const canvasEdgeLabel = (id: string | undefined): string =>
  CANVAS_EDGES.find((e) => e.id === id)?.label ?? CANVAS_EDGES[0].label;

/**
 * SIZE-SCALED float-frame edge surcharge (pence), per tier. A float (tray)
 * frame is a real hand-built surround that costs more the bigger the canvas —
 * so the premium climbs with size. Applies to any float edge; mirror wrap = 0.
 * ⚠️ MONEY (gotcha #9): mirrored in api/checkout.ts FLOAT_EDGE_SURCHARGE_PENCE.
 */
export const FLOAT_EDGE_SURCHARGE_PENCE: Record<PrintTier["id"], number> = {
  atelier: 7500, //          A3 float frame — +£75
  collector: 9500, //        A2 float frame — +£95
  "atelier-grande": 14500, // A1 float frame — +£145
  heirloom: 19500, //        A0 float frame — +£195
  studio: 14500, //          one-off (A1-size) — +£145
};

/**
 * Surcharge (pence) for a canvas edge finish at a given tier — a float frame
 * adds a real tray frame at Point 101 that scales with size, so pass the tier
 * id to get the right premium. Mirror wrap (or unknown) = 0.
 * ⚠️ MONEY (gotcha #9): mirrored in api/checkout.ts.
 */
export const getCanvasEdgeSurchargePence = (
  id: string | undefined,
  tierId?: string,
): number => {
  const edge = CANVAS_EDGES.find((e) => e.id === id);
  if (!edge || !edge.isFloat) return 0;
  return (
    FLOAT_EDGE_SURCHARGE_PENCE[tierId as PrintTier["id"]] ??
    FLOAT_EDGE_SURCHARGE_PENCE.collector
  );
};

// ── Point 101 framing finishes ───────────────────────────────────────────────
// The Framed product offers Point 101's full range of museum-grade mouldings,
// grouped by category the way Point 101 present them, PLUS a choice of glazing.
//
// PRICING (2026-07-24, Hugo — "price the good frames higher"): frames sit in
// THREE tiers. `classic` is included in the base framing price (£345 A2 / £445
// A1, from the print tier). `signature` and `ornate` add a FLAT, size-
// independent surcharge on top (Recommended ladder: +£50 / +£120), shown to the
// buyer as ONE clean total per tier — never an additive "+£50" line. The cost
// gap to the estate between a classic and an ornate moulding is only ~£15–26, so
// the surcharge is almost all margin (the point of the exercise).
//
// ⚠️ The surcharge is MONEY, so it now falls under gotcha #9: FRAME_TIERS'
// surcharge pence is mirrored in api/checkout.ts (the charge), and the framing
// line in the confirmation / saved-basket emails must reflect it too. Frame
// LABELS are mirrored (as before) in api/checkout.ts. Keep them in sync.
//
// `ar: true` marks the four frames that have baked 3D wall models
// (src/lib/wallModels.ts) — only those are offered in the "See it on your wall"
// AR picker, so a frame without a model can never silently fall back to a
// frameless preview. The rest render in the flat PDP frame preview only.
export const FRAME_TIERS = {
  classic: { label: "Classic", surchargePence: 0 },
  signature: { label: "Signature", surchargePence: 9500 },
  ornate: { label: "Ornate", surchargePence: 24500 },
} as const;
export type FrameTier = keyof typeof FRAME_TIERS;

// Display groups, in the order Point 101 present them — the picker renders one
// labelled group per category, premium categories last.
export const FRAME_CATEGORY_ORDER = [
  "Black",
  "Dark Wood",
  "Light Wood",
  "White",
  "Metallic",
  "Box Frames",
  "Ornate",
] as const;
export type FrameCategory = (typeof FRAME_CATEGORY_ORDER)[number];

// Every DISTINCT Point 101 finish (colour/material/style). Millimetre-only
// width variants of the same finish are deliberately folded into one entry —
// they render identically in the preview and price the same within a tier, so
// separate rows would be pure noise (Hugo, 2026-07-24). `ar` is present on the
// four finishes with baked wall models.
// A tight, curated set of just THREE finishes (Hugo 2026-08-06: cut the range
// right down, drop the poor black-lacquer sample, "don't overwhelm the
// customers"). The three whose physical samples read best — a warm light oak, a
// rich dark walnut, and a clean white — every one solid wood with a baked AR
// wall model. Deliberately NOT Point 101's full trade range.
export const FRAME_STYLES = [
  // Light Wood
  { id: "natural-oak", label: "Oak", note: "Warm, light solid oak", swatch: "#c9a368", category: "Light Wood", tier: "classic", ar: true },
  // Dark Wood
  { id: "walnut-tray", label: "Walnut", note: "Warm, rich solid walnut", swatch: "#5a4030", category: "Dark Wood", tier: "classic", ar: true },
  // White
  { id: "white", label: "White", note: "Clean painted white", swatch: "#ede9e2", category: "White", tier: "classic", ar: true },
  // Upsell tiers (Hugo 2026-08-06: "of course I need to upsell of framing
  // options") — a premium deep box and a hand-gilt statement frame that step the
  // framed price up (Signature +£95 / Ornate +£245). Kept to ONE each so the
  // ladder is clear without overwhelming the three included woods above.
  { id: "box-oak", label: "Oak box", note: "Deep oak box-frame with a float rebate — the print floats within the moulding", swatch: "#c3a473", category: "Box Frames", tier: "signature", ar: false },
  { id: "ayous-gold", label: "Gold edge", note: "Stained ayous with a hand-gilt gold highlight — a quiet statement frame", swatch: "#b98f4e", category: "Ornate", tier: "ornate", ar: false },
] as const;

// White window-mat (passe-partout) around FRAMED PAPER prints only (Hugo
// 2026-08-06: "a white border … so the frame doesn't go to the edge of the
// painting … ignore of course for canvas"). Rendered inside FramedPreview's
// FrameWrap only. Sized as a fraction of the shorter framed-window edge per
// side; 0.08 ≈ a gallery ~2.5–3in window mat at A2/A1 and scales cleanly across
// sizes. The conservation mount is already sold as "included" in the framed
// copy, so NO price mirror (gotcha #9) is engaged.
export const MAT_BORDER_RATIO = 0.08;

// GLAZING — TWO real finishes, described to match the print house's own spec.
// Which one a framed piece receives is decided by SIZE, not a buyer picker
// (`includedGlazingId` below): anti-reflective art glass only ships up to the
// 610mm glazed-delivery cap, so the largest framed size is glazed with
// shatter-safe acrylic instead — the only glazing deliverable at that size.
export const GLAZING_OPTIONS = [
  {
    id: "museum-glass",
    label: "Anti-reflective glass",
    note: "Anti-reflective art glass (Artglass AR 70) — an anti-reflective coating reduces reflections to under 1%, revealing the artwork's true colour and texture with no green tint or optical distortion, and filters UV. Used on framed prints up to 610mm.",
  },
  {
    id: "art-acrylic",
    label: "Clear acrylic",
    note: "Ultra-clear PMMA acrylic safety glazing — the same clarity and appearance as glass, filtering 99% of UV light. Shatter-resistant and lightweight, so larger frames ship safely at any size.",
  },
] as const;

// PAPER FINISH — a deliberately CURATED short list, not Point 101's full trade
// range (Hugo 2026-07-24: "curate, don't replicate"). Three plain-language
// finishes, each mapped to ONE real archival paper; the paper BRAND is a
// prestige signal so it's named (Hahnemühle / Ilford), but the print house is
// never named to the buyer. NO surcharge — every finish is included in the
// framed price (the real Point 101 deltas are ±£3 on ~90% margins, not worth a
// money-mirror or a "which is dearer?" decision on a memorial buy). The choice
// rides to checkout as a preference so the estate orders the right stock.
// `spec` is the weight/material one-liner; `note` is the sell.
export const PAPER_FINISHES = [
  {
    id: "smooth-matt",
    label: "Smooth Matt",
    spec: "Hahnemühle Photo Rag · 308gsm · 100% cotton",
    note: "The house paper — 100% cotton rag with a natural white tone and a subtle fibrous surface. Understated, organic and painterly; archival for generations.",
  },
  {
    id: "textured",
    label: "Textured",
    spec: "Hahnemühle German Etching · 310gsm",
    note: "A heavier, velvety matt with a warm white hue and a fine tooth — the traditional artist-board surface, lending painterly depth to Stephen's mandalas.",
  },
  {
    id: "smooth-gloss",
    label: "Smooth Gloss",
    spec: "Ilford Galerie Smooth Gloss · 310gsm",
    note: "A bright-white gloss for vivid colour and deep blacks — the most saturated, luminous read of the colourways, with superb clarity and detail.",
  },
] as const;

export type FrameStyleId = (typeof FRAME_STYLES)[number]["id"];
export type GlazingId = (typeof GLAZING_OPTIONS)[number]["id"];
export type PaperFinishId = (typeof PAPER_FINISHES)[number]["id"];

export const DEFAULT_FRAME_STYLE: FrameStyleId = "natural-oak";
export const DEFAULT_GLAZING: GlazingId = "museum-glass";
export const DEFAULT_PAPER_FINISH: PaperFinishId = "smooth-matt";

export const frameStyleLabel = (id: string | undefined): string =>
  FRAME_STYLES.find((f) => f.id === id)?.label ?? FRAME_STYLES[0].label;
export const glazingLabel = (id: string | undefined): string =>
  GLAZING_OPTIONS.find((g) => g.id === id)?.label ?? GLAZING_OPTIONS[0].label;

/**
 * The glazing INCLUDED at a given size. Anti-reflective art glass only ships up
 * to the 610mm glazed-delivery cap (A3/A2), so the largest framed size — A1
 * (841mm) — is glazed with ultra-clear, shatter-safe acrylic instead, the only
 * glazing deliverable at that size. Rides to checkout so the estate orders the
 * right glazing per size. A0 isn't framed at all (canvas only).
 */
export const includedGlazingId = (tierId: string | undefined): GlazingId =>
  tierId === "atelier-grande" ? "art-acrylic" : "museum-glass";
export const paperFinishLabel = (id: string | undefined): string =>
  PAPER_FINISHES.find((p) => p.id === id)?.label ?? PAPER_FINISHES[0].label;

/**
 * The premium surcharge (pence) for a frame's tier, added on top of the base
 * per-print framing price. `classic` (and any unknown / default id) → 0.
 * ⚠️ MONEY (gotcha #9): mirrored in api/checkout.ts frameSurchargePence().
 */
export const getFrameSurchargePence = (id: string | undefined): number => {
  const f = FRAME_STYLES.find((s) => s.id === id);
  return f ? FRAME_TIERS[f.tier].surchargePence : 0;
};

/** The frame's tier ("classic" | "signature" | "ornate"); "classic" if unknown. */
export const getFrameTier = (id: string | undefined): FrameTier => {
  const f = FRAME_STYLES.find((s) => s.id === id);
  return f ? f.tier : "classic";
};

/** Only the frames with a baked AR wall model — the AR picker's allowed set. */
export const AR_FRAME_STYLES = FRAME_STYLES.filter((f) => f.ar);

/** Frames grouped by category, in FRAME_CATEGORY_ORDER — for the grouped picker. */
export const FRAME_STYLE_GROUPS = FRAME_CATEGORY_ORDER.map((category) => ({
  category,
  frames: FRAME_STYLES.filter((f) => f.category === category),
})).filter((g) => g.frames.length > 0);

/**
 * Returns the hand-embellishment surcharge for a tier, or null if Polly
 * doesn't hand-finish at that size. Currently A2 + A1 only — A3 is too
 * small to justify her time, A0 is hidden behind the Heirloom tier.
 */
export const getEmbellishmentPricePence = (tier: PrintTier): number | null =>
  tier.embellishmentPricePence ?? null;

// -----------------------------------------------------------------------------
// COST FLOORS (#13) — the hard "never sell below cost" line, in PENCE
// -----------------------------------------------------------------------------
//
// ⚠️⚠️⚠️ HUGO: EVERY NUMBER IN THIS BLOCK IS A RESEARCH ESTIMATE, NOT A REAL
// INVOICE. They are the CONSERVATIVE (low-end) figures from the 2026-05-31
// pricing research — deliberately the cheapest-but-still-real cost so a floor
// can never accidentally sit ABOVE a true cost. Before you trust the
// never-below-cost guarantee, REPLACE each value with your actual figures:
//   • printFloor   = what Point 101 actually charges you to print that size
//   • frame floor  = what your framer actually charges you for that frame
//   • embellish    = Polly's real hours × her rate for that size
// At today's ~92% retail margins these floors NEVER bind (the §4 guard below is
// a safe no-op), but they make "never below cost" a hard invariant that
// survives any future price edit. Mirror of api/checkout.ts (gotcha #9 — keep
// the two copies of these three constants in sync).

/**
 * PRINT-ONLY cost floor per tier (pence) — no frame, no hand-finish. The
 * absolute do-not-cross line for a bare print of that size.
 * ⚠️HUGO: replace with your real Point 101 per-size costs.
 */
export const COST_FLOOR_PENCE: Record<PrintTier["id"], { printFloor: number }> = {
  atelier: { printFloor: 1200 }, //  A3 — £12  (model £14; range £12–16)
  collector: { printFloor: 2200 }, //  A2 — £22  (model £27; range £22–31)
  "atelier-grande": { printFloor: 4300 }, //  A1 — £43  (model £52; range £43–59)
  heirloom: { printFloor: 8000 }, //  A0 — £80  (model £100; range £80–112) [DARK tier]
  // ⚠️HUGO — MOST IMPORTANT MANUAL FIGURE: Studio is a UNIQUE hand-painted A1.
  // Its real cost = A1 print (£43) + frame-if-any + Polly painting it by hand
  // for many hours (4–10+ hrs at £30–45/hr = £120–£450 labour alone). £160 here
  // is a LOWER-BOUND placeholder (£43 print + ~£117 labour at a 4hr minimum).
  // Set this to Polly's REAL time × rate + print + any frame. At £2,650 retail it
  // is never at risk, but record the real number for honesty / insurance.
  studio: { printFloor: 16000 }, //  A1 unique — ⚠️£160+ placeholder
};

/**
 * FRAME add-on cost floor per tier (pence) — the cost TO YOU of the physical
 * frame. Only A2 + A1 are framed. ⚠️HUGO: replace with your framer's real cost.
 */
export const FRAME_COST_FLOOR_PENCE: Partial<Record<PrintTier["id"], number>> = {
  collector: 4500, //  A2 frame cost £45  (LOW end; model £60; range £45–75)
  "atelier-grande": 15000, //  A1 frame cost £150 (LOW end; model £190; range £150–230)
};

/**
 * HAND-FINISH (embellishment) add-on cost floor per tier (pence) — the cost TO
 * YOU of Polly's labour. Only A2 + A1. ⚠️HUGO: replace with Polly's real
 * hours × rate per size — labour is the largest true cost here.
 */
export const EMBELLISH_COST_FLOOR_PENCE: Partial<Record<PrintTier["id"], number>> = {
  collector: 3500, //  A2 hand-finish cost £35 (LOW end; model £55; range £35–85)
  "atelier-grande": 6500, //  A1 hand-finish cost £65 (LOW end; model £100; range £65–150)
};

/**
 * Fully-loaded cost floor (pence) for a single configured line: the print
 * floor for the tier, plus the frame floor if framed, plus the embellish floor
 * if hand-finished. This is the hard "never sell below" total the §4 margin
 * guard checks each discounted line against. Mirrors lineCostFloorPence in
 * api/checkout.ts (gotcha #9). ⚠️HUGO: only as honest as the floors above.
 */
export const lineCostFloorPence = (
  tierId: PrintTier["id"],
  opts: { framing?: boolean; embellished?: boolean } = {},
): number => {
  const print = COST_FLOOR_PENCE[tierId]?.printFloor ?? 0;
  const frame = opts.framing ? FRAME_COST_FLOOR_PENCE[tierId] ?? 0 : 0;
  const embellish = opts.embellished ? EMBELLISH_COST_FLOOR_PENCE[tierId] ?? 0 : 0;
  return print + frame + embellish;
};

/**
 * UI helper for the "never sold below cost" guarantee: returns whether a
 * configured line's price comfortably clears its cost floor, plus the figures.
 * Purely presentational — the binding guard lives server-side in
 * api/checkout.ts. At current ~92% margins `clears` is always true.
 */
export const checkAboveCostFloor = (
  tier: PrintTier,
  opts: { framing?: boolean; embellished?: boolean } = {},
): { floorPence: number; pricePence: number; clears: boolean } => {
  let pricePence = tier.pricePence;
  if (opts.framing) pricePence += tier.framingPricePence ?? 0;
  if (opts.embellished) pricePence += tier.embellishmentPricePence ?? 0;
  const floorPence = lineCostFloorPence(tier.id, opts);
  return { floorPence, pricePence, clears: pricePence >= floorPence };
};

/** £180 → "£180.00" */
export const formatGBP = (pence: number): string =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

/**
 * Parse the cm dimensions out of a tier `size` string, e.g.
 * "42 × 42 cm" → { w: 42, h: 42 }. Returns null if absent.
 * Lets the scale viewer + dimension chip draw the print honestly from its
 * catalogued size with zero new data entry.
 */
export const parseSizeCm = (size: string): { w: number; h: number } | null => {
  const m = size.match(/([\d.]+)\s*[×x]\s*([\d.]+)\s*cm/);
  if (!m) return null;
  return { w: Number.parseFloat(m[1]), h: Number.parseFloat(m[2]) };
};

export interface Collection {
  id: "habundia" | "genesis" | "born-in-the-sky" | "ancient-canons";
  title: string;
  description: string;
  /**
   * Optional path to a real photograph to use as the collection hero backdrop.
   * If present, this overrides the hand-drawn SVG scene.
   *
   * Source images (Earth → Water → Sky):
   *   habundia:        ancient British woodland, dawn light through canopy, bluebells
   *   genesis:         bioluminescent ocean at night, electric blue/teal blooms
   *   born-in-the-sky: Milky Way arching over a dark horizon, dense star field
   *
   * Save the file at e.g. /public/img/scenes/habundia.jpg and reference it as
   * "/img/scenes/habundia.jpg".
   */
  backdropImage?: string;
}

// -----------------------------------------------------------------------------
// COLLECTIONS — top-level groupings, used on the Collections page
// -----------------------------------------------------------------------------

export const COLLECTIONS: Collection[] = [
  {
    id: "habundia",
    title: "Habundia — Seven Wild Flowers of the British Isles",
    description:
      "Stephen spent his life studying the sacred geometry of ancient temples, Persian courts and Tibetan monasteries. In 2018, he turned to the fields outside his door.\n\nA series of British wild flower mandalas, each painted with oil pressed from the flower it depicts, each built on the same geometric precision he brought to every canvas.\n\nHabundia is the medieval spirit of wild abundance. She is not cultivated. She cannot be controlled. Stephen named this series after her because the flowers he chose share that quality: they appear where they will, in their season, without permission.\n\nHe found the same ancient geometry in all of them.",
    backdropImage: "/img/scenes/habundia-blur-v5.webp",
  },
  {
    id: "genesis",
    title: "Genesis Mandalas",
    description:
      "Stephen had been exploring geometry in private sketchbooks for years, learning the techniques of Celtic and Persian pattern making, studying the decorative arts of Gothic Europe and Tibet. In 1999, while studying Architecture at the University of Brighton, he made his first major mandala.\n\nThese are the Genesis paintings — three works from the earliest years of his life as a mandala artist, made between 1999 and 2001. The works that opened Stephen's practice and established its three foundations: sacred number, divine encounter, and nature's rarest geometry.",
    backdropImage: "/img/scenes/genesis-blur-v2.webp",
  },
  {
    id: "born-in-the-sky",
    title: "Born in the Sky",
    description:
      "Stephen worked at night. While the world slept, he was at his canvas, alone with geometry and gold leaf and the dark outside the window. He understood, more than most, what it felt like to carry knowledge that set you apart. To see things others didn't look for. To find more companionship in the sky than in a room full of people.\n\nThese five paintings came from that place. Each one about something above us that most people never notice: a constellation left out, a comet on its only pass, a message sent into deep space not knowing if it will ever be received, nine stars in the shape of a swan.\n\nThings that exist beyond the edge of what is commonly seen or celebrated. Stephen found them beautiful. He spent months, sometimes over a year, bringing each one down to earth.\n\nHe called the Enneagon a painting born in the sky. All five of these were.",
    backdropImage: "/img/scenes/born-in-the-sky-blur-v2.webp",
  },
  {
    id: "ancient-canons",
    title: "Ancient Canons",
    // NOTE (2026-07-28): placeholder description built from Hugo's supplied
    // framing — expand/rewrite freely. Kept faithful to his words; nothing
    // about Stephen invented here.
    description:
      "Ancient Canons takes its name from a phrase of Stephen's own — \"the ancient canons of the Geometer's Craft.\"\n\nThese are the works that express that craft most directly: the Celtic, Pythagorean, Islamic and Flower of Life traditions he studied for years, each drawn in its own language of line and number.",
    // Hero backdrop = the collection's own deepest work (Aurora Green Celtic
    // Shield) heavily blurred + darkened to the dark scene family (luma ≈33, on
    // par with the born-in-the-sky nebula ≈36) so it reads as an abstract field
    // of dissolved geometry, never a competing picture. Gives Ancient Canons a
    // photographic-register hero at parity with the other three collections.
    backdropImage: "/img/scenes/ancient-canons-blur-v1.webp",
  },
];

// -----------------------------------------------------------------------------
// PAINTINGS
// -----------------------------------------------------------------------------

export const PAINTINGS: Painting[] = [
  // -------------------------------------------------------------------------
  // HABUNDIA
  // -------------------------------------------------------------------------
  {
    id: "wild-rose",
    title: "Mandala of Wild Rose",
    year: "2018",
    collection: "habundia",
    pigmentNote:
      "The original was painted using oil pressed from the wild rose itself — this is a fine-art reproduction of that work.",
    size: "60 × 60 cm (approx. 24 × 24 in)",
    location: "Ditchling, Sussex",
    description:
      "Habundia is the medieval spirit of wild abundance, the presence that moves through the hedgerows and ungoverned places. Stephen named his seven British wild flower mandalas after her.\n\nHe painted it with actual wild rose oil. The painting contains the flower it depicts.\n\nThe numbers carry their own meaning. Six flowers: the hexagon. Five buds: the geometry of Venus, the planet that traces a five-petalled rose across the sky in its eight-year dance with Earth. The wild rose has five petals. It already carries that geometry.\n\nThe thorns are inside the circle, too. The rose cannot be separated from what protects it. Beauty and danger arriving together — every tradition that has encountered this plant understands this.\n\nThe wild rose blooms across every Sussex hedgerow each June without being planted. It simply appears, as it has for millennia.\n\nStephen painted this in Ditchling, Sussex, in the heart of the South Downs.",
    artistQuote:
      "Within the circle amongst the many thorns are 6 rose flowers, 5 rose buds, 10 rose hearts, and 40 rose hips.",
    colourways: [
      {
        name: "Sussex Pink",
        image: "/img/paintings/wild-rose-sussex-pink.jpg",
        hex: "#d9a3b5",
        isOriginal: true,
        available: true,
      },
    ],
  },
  {
    id: "english-bluebells",
    title: "Mandala of English Bluebells",
    year: "2019",
    collection: "habundia",
    pigmentNote:
      "The original was painted using oil pressed from the bluebell itself — this is a fine-art reproduction of that work.",
    size: "60 × 60 cm (approx. 24 × 24 in)",
    description:
      "The second painting from the Habundia collection. As with the Wild Rose, Stephen painted it using actual bluebell oil.\n\nNot a painting of bluebells. A painting about being there.\n\nSix large bells. Twelve small. Forty-eight buds, three white and one pink among them: the exceptions noticed, named, counted. Five open blooms and one pentangle. The pentangle is a five-pointed star, the geometry of Venus, the planet that traces a five-petalled rose across the sky in its eight-year orbit with Earth. The wild rose carries it in its petals. Stephen found it again here.\n\nSix owls sit in six trees whose leaves have not yet opened. The bluebell blooms in a narrow window each spring, before the canopy closes and the light disappears from the forest floor. The owls are in the bare branches above. They see in darkness what others cannot.\n\nThis was the centrepiece of Stephen's final exhibition, at Unique Arts Gallery in Brighton, 2019.",
    artistQuote:
      "A painting about being in the bluebell woods. Within the circle of 6 large bells are 12 small bells, 48 bluebell buds, three of which are white and one of which is pink, together with 5 open blooms and one pentangle. There are 6 owls in the six trees that are just about to fill with leaves.",
    colourways: [
      {
        name: "Sussex Blue",
        // -v4 filename busts Vercel's 1-year immutable /img cache after the
        // re-crop. v2 over-zoomed INTO the mandala; v3 then cropped square and
        // lost the painting's lavender cloud border entirely. v4 RESTORES the
        // full frame from the print-ready original (square center-crop, no
        // distortion) so Stephen's lilac sky border shows as painted.
        image: "/img/paintings/english-bluebells-v5.jpg",
        hex: "#a9b9d6",
        isOriginal: true,
        available: true,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // GENESIS
  // -------------------------------------------------------------------------
  {
    id: "orchis-7",
    title: "Mandala of Seven — Orchis 7 — Septagon",
    year: "1999",
    collection: "genesis",
    size: "70 × 70 cm (approx. 28 × 28 in)",
    description:
      "The septagon cannot be drawn perfectly. Unlike every other regular polygon, it cannot be constructed with a compass and straightedge alone. It can only be estimated. Stephen chose it as the foundation of this work.\n\nSeven is the only number between one and ten that neither divides nor multiplies into any other. Every tradition assigned it to the sacred: seven chakras, seven heavens, seven planets. Pythagoras called it three plus four, triangle plus square, heaven plus earth. The number that belongs to neither and therefore stands alone.\n\nThe flower Stephen placed within this geometry is the Lady's Slipper Orchid. It is Britain's rarest native wildflower. There is one wild plant left in England. Its location is secret, guarded by Natural England. Darwin studied the pollination mechanism: the flower's pouch traps an insect, coats it in pollen, and then releases it. Stephen painted thirty of them.\n\nHe gave the rarest flower in England to the polygon that cannot be perfectly drawn. Two things that can only be approximated, held together in gold leaf.\n\nJung documented the mandala emerging spontaneously during individuation, the psyche's own attempt to picture its wholeness. Stephen spent hundreds of hours constructing what the psyche reaches for on its own.",
    artistQuote:
      "If you see beauty in these paintings, that is because you can see part of yourself, like in a mirror, you see something you know. Something totally cosmic is reflected in you.",
    colourways: [
      {
        name: "Rubedo Red",
        image: "/img/paintings/orchis7-rubedo-red.jpg",
        hex: "#7a2a2e",
        isOriginal: true,
        available: true,
      },
      // The "Aquamarine Blue" colourway was REMOVED from the product page
      // (Hugo, 2026-06-23). Rubedo Red is now the sole (original) colourway for
      // Orchis 7. The image asset + AR/variant manifests are left on disk for a
      // possible future return; the /news.ts "Orchis 7 — Aquamarine" entry is an
      // announcement only and does not depend on this colourway.
    ],
  },
  {
    id: "flower-of-life",
    title: "Mandala of Transformation — Flower of Life",
    year: "2000",
    collection: "genesis",
    size: "75 × 75 cm (approx. 30 × 30 in)",
    description:
      "At the turn of the millennium, Stephen had not painted for fourteen months. Then a peacock butterfly came through the window.\n\nHe built the work on the Flower of Life, a geometric symbol found carved into the Osireion at Abydos and studied by Leonardo da Vinci. It is the structure from which all other sacred geometry derives. Its natural form is the dodecagon: twelve, the number every civilisation has used to mark a complete cycle. The zodiac. The apostles. The months.\n\nThe peacock butterfly carries eyes on its wings. In Indian tradition, it is the companion of Lakshmi. In Roman mythology, its markings are the eyes of Argus, a symbol of all-seeing vision.\n\nIn Greek, psyche means soul. It also means butterfly.",
    artistQuote:
      "This large, dramatic and explosive design was originally conceived in the days after a large peacock butterfly flew through the studio window of an old cottage in the spring of the year 2000. The circumstances surrounding this gentle visitation were nothing less than miraculous. The butterfly appears from within a dusty sunbeam, flying in a spiral to land in the centre of a 5ft blank canvas, and it opened and closed its wings 3 times before flying back up the sunbeam and on its way.",
    colourways: [
      {
        name: "Kaleidoscope",
        image: "/img/paintings/fol-kaleidoscope.jpg",
        hex: "#4a3a78",
        isOriginal: true,
        available: true,
      },
    ],
  },
  {
    id: "slipper-orchids",
    title: "Mandala of 30 Slipper Orchids",
    year: "2001",
    collection: "genesis",
    size: "50 × 50 cm (approx. 20 × 20 in)",
    description:
      "The Lady's Slipper Orchid is Britain's rarest native wildflower. One wild plant remains in England. Its location is kept secret. It is guarded around the clock by Natural England.\n\nDarwin spent years studying its pouch, the distinctive curved lip that traps visiting insects, coats them in pollen, then releases them to carry it elsewhere. Plant and insect co-evolved across millions of years until neither could exist without the other. A mechanism of such precision that Darwin used as evidence of evolution itself.\n\nThirty is the number of days in the moon's cycle, the number of degrees in each sign of the zodiac, and the age at which Christ began his ministry. Stephen counted thirty of these flowers and placed each one with the same precision that the flower itself embodies.\n\nFrom a distance, the composition reads like a frost crystal or a nebula. Up close, each orchid is identifiable, its pouch and petals exact.\n\nThe orchid has been collected, coveted and nearly lost. Stephen returned it to abundance.",
    colourways: [
      {
        name: "Nebula Purple",
        image: "/img/paintings/orchids30-nebula-purple.jpg",
        hex: "#4422a0",
        isOriginal: true,
        available: true,
      },
      {
        name: "Lightning Blue",
        image: "/img/paintings/orchids30-lightning-blue.jpg",
        hex: "#9bb6e0",
        isOriginal: false,
        available: true,
      },
      {
        name: "Garnet Red",
        image: "/img/paintings/orchids30-garnet-red.jpg",
        hex: "#6b1a18",
        isOriginal: false,
        available: true,
      },
      {
        name: "Manipura Yellow",
        image: "/img/paintings/orchids30-manipura-yellow.jpg",
        hex: "#dfc56a",
        isOriginal: false,
        available: true,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // BORN IN THE SKY
  // -------------------------------------------------------------------------
  {
    id: "peacock-minerva",
    title: "The Peacock Mandala — Pavo Cristatus — Shield of Minerva",
    year: "2006–2007",
    collection: "born-in-the-sky",
    size: "65 × 65 cm (approx. 26 × 26 in)",
    description:
      "The peacock carries more symbolic weight than almost any other creature. It is the national bird of India. Krishna wears its feather. In Greek mythology, when Hermes killed the hundred-eyed giant Argus Panoptes, Hera placed all one hundred of his eyes onto the tail of the peacock, which is why each feather bears an eye. In alchemy, the cauda pavonis, the peacock's tail, marks the moment of transformation made visible. In early Christianity, the peacock symbolised resurrection. Its flesh was thought to be incorruptible.\n\nStephen knew all of this. And in 2006, the peacock sent him a feather.\n\nHe worked on it for over a year. Minerva's aegis was a shield covered in eyes. The peacock's tail is the same. Stephen saw the connection and named the painting accordingly.\n\nThe peacock finds the sun. The sun finds the painter. The painter finds the feather.",
    artistQuote:
      "In 2006 the new canvas was primed and ready. I needed inspiration, so one afternoon a good friend and I decided to take a Sunday circular walk up to Wolstonbury Hill from Hurstpierpoint Village in East Sussex. On returning to my car, and to my complete astonishment, a clean and shiny Peacock feather was caught under the tyre. Unbeknownst to me, one Peacock male had just recently escaped his Stately Home. He had made a home on the roof of a brand new garden conservatory recently constructed in the village. I was lost for words, knowing already that the Peacock was a great Solar / Sun / Son symbol as well as being the national bird of India.",
    colourways: [
      {
        name: "Persian Indigo",
        image: "/img/paintings/peacock-persian-indigo-v2.jpg",
        hex: "#2a3c7d",
        isOriginal: true,
        available: true,
      },
      {
        name: "Blood Moon Red",
        image: "/img/paintings/peacock-blood-moon-red.jpg",
        hex: "#7a1d1c",
        isOriginal: false,
        available: true,
      },
      {
        name: "Sahara Sand Yellow",
        image: "/img/paintings/peacock-sahara-sand-yellow-v2.jpg",
        hex: "#d2b07a",
        isOriginal: false,
        available: true,
      },
      {
        name: "Moroccan Purple",
        image: "/img/paintings/peacock-moroccan-purple-v2.jpg",
        hex: "#3d1e5e",
        isOriginal: false,
        available: true,
      },
      {
        name: "Mary Pink",
        image: "/img/paintings/peacock-mary-pink-v2.jpg",
        hex: "#e8a4be",
        isOriginal: false,
        available: true,
      },
    ],
  },
  {
    id: "ophiuchus",
    title: "Ophiuchus",
    year: "2006",
    collection: "born-in-the-sky",
    // Ophiuchus is LANDSCAPE (source image 2000×1622 ≈ 1.233:1) — the lone
    // non-square work. Original size corrected from a portrait "60 × 80" to
    // landscape so it matches the artwork as shown.
    size: "80 × 60 cm (approx. 32 × 24 in)",
    // Landscape print ladder — same A sheets / ids / prices as PRINT_TIERS,
    // only the printed dimensions differ, so the prints reproduce the artwork
    // rather than a square crop. See OPHIUCHUS_PRINT_TIERS above.
    printTiers: OPHIUCHUS_PRINT_TIERS,
    description:
      "There are thirteen constellations through which the ecliptic passes. The Babylonians used twelve, one for each month. Ophiuchus, through which the sun travels for eighteen days between November and December, was left out. It has been the excluded thirteenth ever since.\n\nOphiuchus is the Serpent Bearer. In Greek mythology, he is Asclepius, son of Apollo, who became so skilled in healing that he could raise the dead. Zeus killed him with a thunderbolt for upsetting the natural order, then placed him in the sky as a constellation, holding a serpent in both hands.\n\nThe Rod of Asclepius, a single serpent coiled around a staff, remains the global symbol of medicine. The serpent was chosen because its venom is simultaneously poison and cure. The same substance kills and heals. Asclepius understood that there is no such thing as a toxin that is only a toxin.\n\nStephen built this painting on a square — the Tibetan mandala palace form, four gates facing four directions, the sacred architecture of the cosmos. Most of his mandalas are circular. This one is not. The excluded constellation demanded a different kind of space.\n\nStephen described it as his homage to Ophiuchus, the constellation of the serpent bearer and toxin protector.",
    colourways: [
      {
        name: "Stained Glass",
        image: "/img/paintings/ophiuchus-original.jpg",
        hex: "#1a1330",
        isOriginal: true,
        available: true,
      },
    ],
  },
  {
    id: "tridecagon-moon-star",
    title: "Tridecagon Moon Star — Star of Messier 13",
    year: "2007",
    collection: "born-in-the-sky",
    size: "65 × 65 cm (approx. 26 × 26 in)",
    description:
      "In 1974, scientists pointed the Arecibo radio telescope at Messier 13, the Great Globular Cluster in Hercules — 300,000 stars, 25,000 light-years away — and broadcast the most ambitious message humanity has ever sent into space. It contained our DNA, our form, our solar system, our numbers. The message is still travelling. It will arrive in approximately 24,975 years.\n\nStephen named this painting after that cluster and built it on thirteen.\n\nThere are thirteen full moons in a solar year. The Gregorian calendar erased one.\n\nMutable: the astrological word for signs of transition, for things that change form rather than hold it. Thirteen is the number of the cycle that refuses to stay fixed. It waxes and wanes. It cannot be suppressed by a calendar.",
    artistQuote:
      "This 13-pointed star (Tridecagon) was painted to celebrate the divine feminine through soft, mutable pastel colours. Reflecting the light of the ever-changing moon. The numerology of 13 is seldom acknowledged in temple architecture.",
    colourways: [
      {
        name: "Sage Green",
        image: "/img/paintings/tridecagon-sage-green.jpg",
        hex: "#9bab86",
        isOriginal: true,
        available: true,
      },
      {
        name: "Moonstone Blue",
        image: "/img/paintings/tridecagon-moonstone-blue.jpg",
        hex: "#b8c7d1",
        isOriginal: false,
        // Hidden 2026-07-24: this colourway was exported from a tighter crop
        // (spandrel corners cut) + washed-out, and its signature can't be placed
        // cleanly. Re-enable once the uncropped master is re-exported to match
        // its Tridecagon siblings.
        available: false,
      },
      {
        name: "Supernova Violet",
        image: "/img/paintings/tridecagon-supernova-violet-v2.jpg",
        hex: "#8a7fd2",
        isOriginal: false,
        available: true,
      },
      {
        name: "Coral Reef",
        image: "/img/paintings/tridecagon-coral-reef-v2.jpg",
        hex: "#dcb39e",
        isOriginal: false,
        available: true,
      },
    ],
  },
  {
    id: "enneagon-swans",
    title: "Enneagon — The Swans",
    year: "[ DATE ]", // [TBD] — mum will fill in
    collection: "born-in-the-sky",
    size: "65 × 65 cm (approx. 26 × 26 in)",
    description:
      "The constellation of Cygnus has exactly nine principal stars. Stephen looked up, counted them, and came home to paint this.\n\nIn Hindu tradition, the swan is hamsa, the carrier of the soul. The word itself is the sound of breathing: ham as you breathe in, sa as you breathe out. Every person alive is saying the swan's name without knowing it.\n\nIn Celtic mythology swans moved between worlds. In Greek tradition, they were Apollo's birds, and when the sun god was gone, they sang.\n\nTwo swans facing each other make a heart with their necks. Stephen placed nine such pairs inside this mandala and called it a painting of global consciousness.\n\nHe meant it.",
    artistQuote:
      "The mandala of 18 Golden Swans holding 9 hearts between 9 pairs whose feathers touch just so. A painting born in the sky and with the knowledge of the 9 key Stars that light the constellation of Cygnus. This mandala of global consciousness is engineered around an Enneagon or 9 sided polygon so the geometry within forms the Enneagram or nine-pointed star. We are each other.",
    colourways: [
      {
        name: "Cygnus Gold",
        image: "/img/paintings/enneagon-cygnus-gold.jpg",
        hex: "#caa54a",
        isOriginal: true,
        available: true,
      },
      {
        name: "Glacier Blue",
        image: "/img/paintings/enneagon-glacier-blue.jpg",
        hex: "#a8c8c5",
        isOriginal: false,
        available: true,
      },
      {
        name: "Solstice Orange",
        image: "/img/paintings/enneagon-solstice-orange.jpg",
        hex: "#c97a3d",
        isOriginal: false,
        available: true,
      },
      {
        name: "Antique Pink",
        image: "/img/paintings/enneagon-antique-pink.jpg",
        hex: "#b48590",
        isOriginal: false,
        available: true,
      },
      {
        name: "Velvet Purple",
        image: "/img/paintings/enneagon-velvet-purple-v2.jpg",
        hex: "#5e3d6e",
        isOriginal: false,
        available: true,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // ANCIENT CANONS
  // (added 2026-07-28 — the four works below reference images that DO NOT
  // EXIST YET. Drop the JPGs into public/img/paintings/ with the exact
  // filenames shown in each `image:` before pushing live, or the tiles 404.)
  // -------------------------------------------------------------------------
  {
    id: "celtic-shield",
    title: "Orbital — Celtic Shield Mandala",
    year: "2003",
    collection: "ancient-canons",
    description:
      "Kepler spent years trying to understand why the planets moved as they did. In 1619, in Harmonices Mundi — The Harmony of the World — he published his discovery: each planet's orbital velocity produces a musical tone. The cosmos was not silent. It was singing. Pythagoras had said the same thing two thousand years earlier.\n\nGeometer, architect and antiquarian, Stephen had studied the world's sacred sites before he ever put brush to canvas. This is what that knowledge looks like made visible — a Celtic shield mandala, circular, with concentric rings of pattern, the outer edge serrated into sharp star points like the teeth of a weapon or the rays of a sun. Celtic knotwork spirals inward through layer after layer of interlocking gold and deep green toward a centre of interlinked circles. The rings read like the orbits of nested spheres — one inside the other, each moving at its own frequency, each one a year's worth of the same returning path.\n\nThe eye follows the rings the way a body follows an ellipse. Drawn inward. Circling back. Never quite arriving.",
    colourways: [
      {
        name: "Aurora Green",
        image: "/img/paintings/celtic-shield-aurora-green.jpg",
        hex: "#5f9e79",
        isOriginal: true,
        available: true,
      },
      {
        name: "Tyrian Purple",
        image: "/img/paintings/celtic-shield-tyrian-purple.jpg",
        hex: "#7a2f5a",
        isOriginal: false,
        available: true,
      },
      {
        // ⚠️ no artwork in the doc yet — hidden until Hugo supplies Faience Blue.
        name: "Faience Blue",
        image: "/img/paintings/celtic-shield-faience-blue.jpg",
        hex: "#3f8fa6",
        isOriginal: false,
        available: false,
      },
    ],
  },
  {
    id: "twelve-around-three",
    title: "12 Around 3 — Flower of Life",
    year: "2005",
    collection: "ancient-canons",
    description:
      "In 1611, Johannes Kepler conjectured that the maximum number of equal spheres you can pack around a single sphere is twelve. It took until 1998 to prove him right. Twelve is the structure of three-dimensional space — the number at which things are perfectly, completely surrounded.\n\nThree is the first shape. The triangle is the simplest polygon — the minimum number of points required to enclose space. In the Flower of Life, the innermost arrangement resolves into three.\n\nTwelve around three. The cosmos around the source.\n\nMeakin built this on the Flower of Life — the same symbol found at Abydos, in Leonardo's notebooks, and at the heart of his Transformation mandala five years earlier — but here in its specific structural logic: twelve circles arranged around the inner three, the whole assembly dense and lace-like, ring after ring of overlapping form radiating outward, every circle passing through the centre of the ones beside it. The surface has the quality of something grown rather than constructed — organic in its mathematics, alive in its repetition.",
    colourways: [
      {
        name: "Tanzanite Purple",
        image: "/img/paintings/twelve-around-three-tanzanite-purple.jpg",
        hex: "#5a4a9c",
        isOriginal: true,
        available: true,
      },
      {
        name: "Terracotta Brown",
        image: "/img/paintings/twelve-around-three-terracotta-brown.jpg",
        hex: "#a85a3c",
        isOriginal: false,
        available: true,
      },
      {
        // ⚠️ no artwork in the doc yet — hidden until Hugo supplies Eden Green.
        name: "Eden Green",
        image: "/img/paintings/twelve-around-three-eden-green.jpg",
        hex: "#3f7d54",
        isOriginal: false,
        available: false,
      },
    ],
  },
  {
    id: "persian-flower-of-life",
    title: "Persian Flower of Life — Kepler's Key",
    year: "[ DATE ]", // [TBD] — Hugo to confirm (description references study c. 2007)
    collection: "ancient-canons",
    description:
      "Stephen described his mission as weaving together four key components: \"The spirit of ancient Insular (Island) Arts, the great Rose Windows of Medieval Europe, the Art of Persian Geometry and the Sacred Mandala of Tibet.\"\n\nThis painting holds two of those four in the same frame simultaneously.\n\nPersian geometric art reached its peak between the 9th and 14th centuries in mosques, madrasas and palaces across Iran, Central Asia and Moorish Spain. In 2007, physicists studying the Alhambra in Granada discovered that medieval Islamic geometers had constructed quasi-crystalline patterns with five-fold symmetry — patterns Western mathematics had only formally described in the 1970s. They knew, through craft and geometric intuition, five centuries before Western science caught up.\n\nStephen studied this tradition for years — learning the ancient construction methods from illuminated manuscripts found in a Bournemouth library, later travelling to Petra in Jordan, standing inside the buildings these geometries were made to inhabit.\n\nThe Flower of Life — carved at Abydos, studied by Leonardo, at the heart of his Transformation mandala two decades earlier — here meets Persian geometric craft directly. The circular overlapping structure of the Flower of Life held within the angular interlaced lattice of girih tilework: warm amber and gold against deep blue, the colours of Persian tilework and pottery — lapis, cobalt, ochre — carried from the 13th century into this. Two ancient traditions, each complete in itself, each discovering the same underlying order from a different direction.",
    colourways: [
      {
        // ⚠️ Blue is the ORIGINAL colourway (Hugo 2026-07-31), listed first.
        name: "Lapis Blue",
        image: "/img/paintings/persian-flower-of-life-blue.jpg",
        hex: "#2f6aa0",
        isOriginal: true,
        available: true,
      },
      {
        name: "Saffron Gold",
        image: "/img/paintings/persian-flower-of-life-original.jpg",
        hex: "#d1a13a",
        isOriginal: false,
        available: true,
      },
      {
        // ⚠️ text-only in the doc (no image yet) — hidden until Hugo supplies Red.
        name: "Pomegranate Red",
        image: "/img/paintings/persian-flower-of-life-red.jpg",
        hex: "#a8412f",
        isOriginal: false,
        available: false,
      },
      {
        // ⚠️ text-only in the doc (no image yet) — hidden until Hugo supplies Purple.
        name: "Amethyst Purple",
        image: "/img/paintings/persian-flower-of-life-purple.jpg",
        hex: "#6a4a86",
        isOriginal: false,
        available: false,
      },
    ],
  },
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

export const getPaintingById = (id: string): Painting | undefined =>
  PAINTINGS.find((p) => p.id === id);

export const getPaintingsByCollection = (collectionId: Collection["id"]): Painting[] =>
  PAINTINGS.filter((p) => p.collection === collectionId);

/**
 * Descriptive alt text for a painting image. Google Images is a real discovery
 * channel for wall art, and the bare title told it nothing — this names the
 * work, colourway, medium and artist. Single source so the PDP hero,
 * Collections tiles and the Welcome featured grid stay consistent. Visual only
 * (no price/edition claims), so it's safe under the edition model.
 */
export const paintingImageAlt = (title: string, colourwayName?: string): string =>
  `${title}${colourwayName ? ` — ${colourwayName}` : ""} — sacred-geometry mandala giclée print by Stephen Meakin`;

// -----------------------------------------------------------------------------
// COLLECTION BUNDLES — acquire a whole collection as a curated set
// -----------------------------------------------------------------------------
//
// A buyer can take an entire collection (e.g. all of Habundia) in one go.
// Each bundle is every painting in the collection at the ANCHOR (Collector
// A2) tier — the conversion-target size — with a small saving vs buying
// each separately. Higher AOV, and a dignified "complete set" offer rather
// than a discount banner.
//
// ADVERTISED SAVING — read this before changing copy:
// The brief floated 15% off as the curated-set saving. BUT the actual
// discount is applied at checkout by api/checkout.ts, which mints a bundle
// coupon of 5% (2 items) / 10% (3+ items). There is no clean, honest way to
// advertise 15% without wiring a "full-collection" flag all the way through
// to checkout (which would mean touching the discount logic + minting a
// different coupon for a flagged session). Per the brief's guidance, we pick
// honesty/simplicity: advertise EXACTLY the percent the checkout will apply
// for that collection's item count. Habundia has 2 paintings → 5%; Genesis
// (3) and Born in the Sky (5) → 10%. So the numbers the buyer sees on the
// card always match what Stripe charges.

/**
 * Returns the bundle discount percent the checkout will actually apply for a
 * given item count — MUST mirror api/checkout.ts: 5% off at 2 items, 10% at
 * 3+. A 2-painting collection (Habundia) therefore advertises 5%, not 10%,
 * so the card's save / net figure equals the Stripe charge (gotcha #9).
 */
export const bundleDiscountPercentForCount = (count: number): number =>
  count >= 3 ? 8 : 5; // (2026-07-25 squeeze pass — trimmed the deep end from 10%)

/**
 * Deeper, FLAGGED bundle discounts the checkout derives from the basket
 * CONTENTS (not item count alone). Researched 2026-05-29 as the profit-
 * maximising depths for high-margin estate prints: COGS is only ~10–12% of
 * retail, so the discount is a demand lever, not cost recovery — set as the
 * shallowest cut that still triggers the set purchase, kept prestige-safe at
 * ≤15%, and escalating with set size:
 *   • complete colourway set (every colourway of ONE painting) → 12%
 *   • complete catalogue (one print of EVERY painting)        → 15%
 * MIRRORED in api/checkout.ts `bundlePercentOff` — keep the two percentages in
 * sync (gotcha #9). The count-based ladder above (5% / 10%) still governs
 * ordinary multi-painting baskets and the per-collection bundles.
 */
export const COLOURWAY_SET_DISCOUNT_PERCENT = 10; // (2026-07-25 squeeze pass — was 12)
export const COMPLETE_CATALOGUE_DISCOUNT_PERCENT = 12; // (2026-07-25 squeeze pass — was 15; keeps ~£252+ on a full-catalogue order)

export interface CollectionBundle {
  collectionId: Collection["id"];
  title: string;
  /** Painting ids in the collection, in catalogue order. */
  paintingIds: string[];
  /** Sum of the anchor-tier price across every painting (pence). */
  fullPricePence: number;
  /** Discounted set price = fullPricePence − the checkout bundle discount. */
  bundlePricePence: number;
  /** fullPricePence − bundlePricePence (pence). */
  savePence: number;
}

/**
 * Build the complete-collection bundle for a given collection: every painting
 * at the SELECTED tier (default the anchor Collector A2, preserving the prior
 * behaviour), with the SAME bundle saving the checkout actually applies for
 * that item count (5% at 2 items, 10% at 3+). Pass a `tierId` so a card can
 * advertise the truthful set price at any size — the % ladder is
 * size-independent, but the £ figures track the actual size being added
 * (#9 size-tiered deals). Returns undefined if the collection has no paintings.
 */
export const getCollectionBundle = (
  collectionId: Collection["id"],
  tierId: PrintTier["id"] = "collector",
): CollectionBundle | undefined => {
  const collection = COLLECTIONS.find((c) => c.id === collectionId);
  const paintings = getPaintingsByCollection(collectionId);
  if (!collection || paintings.length === 0) return undefined;

  const fullPricePence = paintings.reduce(
    (sum, p) => sum + getTierAdvertisedPricePence(getTierById(p, tierId)),
    0,
  );
  // Derive the percent from the painting count so the advertised figure
  // matches api/checkout.ts exactly — a 2-painting collection gets 5%, not
  // 10% (gotcha #9). Round to whole pence — Stripe's coupon discount rounds
  // per-line, but for the advertised headline a single round of the total is
  // honest enough and never overstates the saving.
  const discountPercent = bundleDiscountPercentForCount(paintings.length);
  const bundlePricePence = Math.round(
    fullPricePence * (1 - discountPercent / 100),
  );
  return {
    collectionId,
    title: collection.title,
    paintingIds: paintings.map((p) => p.id),
    fullPricePence,
    bundlePricePence,
    savePence: fullPricePence - bundlePricePence,
  };
};

// -----------------------------------------------------------------------------
// COLOURWAY SET BUNDLE — acquire every colourway of ONE painting as a set
// -----------------------------------------------------------------------------
//
// Stephen made several colour variants of many paintings. A buyer can take the
// COMPLETE set of a painting's colourways in one go — every available colourway
// as an anchor-tier (A2) print, at COLOURWAY_SET_DISCOUNT_PERCENT (12%).
//
// MIRROR (gotcha #9): api/checkout.ts `bundlePercentOff` detects a basket whose
// lines are ALL one painting and applies the same 12% — so the advertised set
// price equals the Stripe charge by construction. The "add the set" action
// pushes exactly one A2 line per available colourway; that single-painting
// basket is what triggers the 12% server-side. (This previously reused the
// plain 5/10% count ladder to dodge an /api desync surface; the 2026-05-29
// pricing research found a deeper set discount is profit-maximising, so the
// flag was wired through. Keep the 12% in sync here AND in /api.)

export interface ColourwaySetBundle {
  paintingId: string;
  title: string;
  /** Names of the available colourways included, in catalogue order. */
  colourwayNames: string[];
  /** The complete-set discount percent (mirrors checkout's single-painting rule): 12%. */
  discountPercent: number;
  /** Sum of the anchor-tier price across every available colourway (pence). */
  fullPricePence: number;
  /** Discounted set price = fullPricePence − the count-based bundle discount. */
  bundlePricePence: number;
  /** fullPricePence − bundlePricePence (pence). */
  savePence: number;
}

/**
 * Build the complete-colourway-set bundle for a painting: every AVAILABLE
 * colourway at the SELECTED tier (default the anchor Collector A2, preserving
 * the prior behaviour), at COLOURWAY_SET_DISCOUNT_PERCENT (12%) — the same the
 * checkout applies to a single-painting basket. Pass a `tierId` so the card can
 * advertise the truthful set price at any size (#9 size-tiered deals — the 12%
 * is size-independent, but the £ total tracks the actual size being added).
 * Returns undefined for a painting with fewer than 2 available colourways (no
 * set to offer). The count + price both derive from the same `available` filter
 * the add-to-basket action uses, so the advertised figure equals the Stripe
 * charge to the penny.
 */
export const getColourwaySetBundle = (
  paintingId: string,
  tierId: PrintTier["id"] = "collector",
): ColourwaySetBundle | undefined => {
  const painting = getPaintingById(paintingId);
  if (!painting) return undefined;
  const available = painting.colourways.filter((c) => c.available);
  if (available.length < 2) return undefined;

  const tier = getTierById(painting, tierId);
  // FRAMED set price (Hugo 2026-07-27: no unframed prints + "make it honest").
  // The set is FRAMED prints, so it must advertise + charge the framed price
  // (base + framing = getTierAdvertisedPricePence). The add-to-basket action
  // pushes framed lines to match (advertised == charged; 12%/15% off these
  // round-number prices is exact per Stripe per-line percent_off).
  const fullPricePence = getTierAdvertisedPricePence(tier) * available.length;
  const discountPercent = COLOURWAY_SET_DISCOUNT_PERCENT;
  // A single round on the uniform total agrees with Stripe's per-line
  // percent_off summing for a clean 12% on equal-priced lines (same reasoning
  // as getCollectionBundle), so the headline is exact, never overstated.
  const bundlePricePence = Math.round(
    fullPricePence * (1 - discountPercent / 100),
  );
  return {
    paintingId,
    title: painting.title,
    colourwayNames: available.map((c) => c.name),
    discountPercent,
    fullPricePence,
    bundlePricePence,
    savePence: fullPricePence - bundlePricePence,
  };
};

// -----------------------------------------------------------------------------
// COMPLETE CATALOGUE BUNDLE — one print of EVERY painting, as a single set
// -----------------------------------------------------------------------------
//
// The flagship offer: the complete, finite body of Stephen's work, together —
// one anchor-tier (A2) print of every painting in the catalogue, at
// COMPLETE_CATALOGUE_DISCOUNT_PERCENT (15%). This is the deepest bundle (the
// biggest commitment earns the best rate), framed as a dignified "complete
// works" set price, never a sale.
//
// MIRROR (gotcha #9): api/checkout.ts `bundlePercentOff` applies 15% when a
// basket contains at least one line of EVERY painting (distinct painting ids ===
// the full catalogue). The "add the complete catalogue" action pushes exactly
// one A2 line per painting (each painting's original colourway), so the basket
// that reaches checkout triggers the 15% server-side. Keep the 15% in sync here
// AND in /api.

export interface CompleteCatalogueBundle {
  title: string;
  /** Every painting id, in catalogue order. */
  paintingIds: string[];
  /** One representative (original) colourway per painting — what the add-to-basket action pushes. */
  items: { paintingId: string; colourwayName: string }[];
  paintingCount: number;
  /** The complete-catalogue discount percent (mirrors checkout's all-paintings rule): 15%. */
  discountPercent: number;
  /** Sum of the anchor-tier price across every painting (pence). */
  fullPricePence: number;
  /** Discounted set price = fullPricePence − 15%. */
  bundlePricePence: number;
  /** fullPricePence − bundlePricePence (pence). */
  savePence: number;
}

/**
 * Build the complete-catalogue bundle: one print of every painting at the
 * SELECTED tier (default the anchor Collector A2, preserving the prior
 * behaviour), at COMPLETE_CATALOGUE_DISCOUNT_PERCENT (15%). Pass a `tierId` so
 * the panel can advertise the truthful set price at any size (#9 size-tiered
 * deals — the 15% is size-independent, but the £ total tracks the actual size).
 * Each item carries the painting's original (or first available) colourway, so
 * the add-to-basket action and the price both derive from the same source —
 * the advertised set price equals the Stripe charge to the penny (uniform lines
 * → Stripe's per-line percent_off sums exactly to a single round of the total).
 */
export const getCompleteCatalogueBundle = (
  tierId: PrintTier["id"] = "collector",
): CompleteCatalogueBundle => {
  const paintings = PAINTINGS;
  const items = paintings.map((p) => {
    const colourway =
      p.colourways.find((c) => c.isOriginal && c.available) ??
      p.colourways.find((c) => c.available) ??
      p.colourways[0];
    return { paintingId: p.id, colourwayName: colourway.name };
  });
  const fullPricePence = paintings.reduce(
    (sum, p) => sum + getTierAdvertisedPricePence(getTierById(p, tierId)),
    0,
  );
  const discountPercent = COMPLETE_CATALOGUE_DISCOUNT_PERCENT;
  const bundlePricePence = Math.round(
    fullPricePence * (1 - discountPercent / 100),
  );
  return {
    title: "The Full Collection",
    paintingIds: paintings.map((p) => p.id),
    items,
    paintingCount: paintings.length,
    discountPercent,
    fullPricePence,
    bundlePricePence,
    savePence: fullPricePence - bundlePricePence,
  };
};

// -----------------------------------------------------------------------------
// TRADE PRICING — the by-introduction rate for designers & hospitality buyers
// -----------------------------------------------------------------------------
//
// The estate works directly with interior designers, art consultants and
// hospitality buyers. Trade pricing is NEVER shown on any public surface (that
// would cheapen the retail perceived value) — it lives ONLY behind the gated
// price sheet (/trade/pricing, TRADE_ACCESS_CODE) and in the estate's Stripe
// invoices/payment links (minted by the ADMIN_API_KEY-gated /api/checkout
// `kind:"trade-quote"` branch).
//
// THREE tiers off FULL retail (base + finish — never the bare base):
//   • Standard  (approved trade account)                     → 30% off
//   • Project   (single order, retail value ≥ £5,000)         → 35% off
//   • Key/hospitality account (retail value ≥ £15,000)        → 40% off
//
// ⚠️ MONEY (gotcha #9): the percentages AND the thresholds are mirrored inline
// in api/checkout.ts (TRADE_DISCOUNT_PERCENT / TRADE_MIN_RETAIL_PENCE) — the
// charge side. The gated sheet advertises `tradePricePence(retail, tier)`; the
// admin endpoint charges the SAME formula off the SAME TIERS retail, so
// advertised == charged by construction. Change both files together.
//
// Trade discount REPLACES the bundle (colourway-set / catalogue / count-ladder)
// discounts — a trade order NEVER stacks the two. The trade-quote endpoint is a
// separate code path that never calls bundlePercentOff, so the bundle % can't
// leak in.

export type TradeTierId = "standard" | "project" | "key";

export interface TradeTier {
  id: TradeTierId;
  /** Full label for the sheet / admin form. */
  label: string;
  /** Compact label for chips / table headers. */
  shortLabel: string;
  discountPercent: number;
  /**
   * Minimum RETAIL order value (pence, base + finish across the whole order) at
   * which this tier applies. Standard = 0 (any approved trade account); Project
   * = £5,000; Key = £15,000. The estate selects the tier per project — this
   * threshold is the qualifying line, surfaced as guidance, not auto-enforced.
   */
  minRetailPence: number;
  /** One-line qualifying note for the sheet. */
  note: string;
}

export const TRADE_TIERS: Record<TradeTierId, TradeTier> = {
  standard: {
    id: "standard",
    label: "Trade account",
    shortLabel: "Trade",
    discountPercent: 30,
    minRetailPence: 0,
    note: "Approved trade account",
  },
  project: {
    id: "project",
    label: "Project",
    shortLabel: "Project",
    discountPercent: 35,
    minRetailPence: 500000, // £5,000 retail value
    note: "Single project — retail value £5,000 or more",
  },
  key: {
    id: "key",
    label: "Key / hospitality account",
    shortLabel: "Key account",
    discountPercent: 40,
    minRetailPence: 1500000, // £15,000 retail value
    note: "Key or hospitality account — retail value £15,000 or more",
  },
};

/** Tiers in ascending order (Standard → Project → Key). */
export const TRADE_TIER_ORDER: TradeTierId[] = ["standard", "project", "key"];

/**
 * The trade price (pence) for a single configured retail line at a given tier.
 * The trade % applies to the FULL retail line — base + finish (framing OR
 * canvas), never the bare base. Rounds to whole pence. ⚠️ Mirror of
 * tradePricePence in api/checkout.ts (gotcha #9) — identical formula, so the
 * gated sheet figure equals the Stripe charge to the penny.
 */
export const tradePricePence = (
  retailLinePence: number,
  tierId: TradeTierId,
): number =>
  Math.round(retailLinePence * (1 - TRADE_TIERS[tierId].discountPercent / 100));

/**
 * The best trade tier a given RETAIL order total qualifies for by threshold.
 * Used by the gated sheet / admin form to hint which tier a project reaches
 * (the estate still selects the tier on the invoice). Mirror of
 * tradeTierForRetail in api/checkout.ts.
 */
export const tradeTierForRetail = (retailTotalPence: number): TradeTierId => {
  if (retailTotalPence >= TRADE_TIERS.key.minRetailPence) return "key";
  if (retailTotalPence >= TRADE_TIERS.project.minRetailPence) return "project";
  return "standard";
};

/**
 * The retail (undiscounted) price of a configured print line at a given finish
 * — base + the finish surcharge (framing OR canvas). Returns null if the finish
 * isn't offered at that size (e.g. framed A0). This is the SAME retail the trade
 * % is taken off, so the gated sheet and the admin endpoint agree. Framing ==
 * canvas price today, so framed and canvas retail coincide at A3/A2/A1.
 */
export const tierRetailLinePence = (
  tier: PrintTier,
  finish: "framed" | "canvas",
): number | null => {
  const add =
    finish === "canvas" ? tier.canvasPricePence : tier.framingPricePence;
  if (typeof add !== "number") return null;
  return tier.pricePence + add;
};
