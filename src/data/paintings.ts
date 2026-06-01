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
  label: string;                // "Gallery Edition", "Collector's Edition", "Atelier Edition", "Heirloom Edition", "Original — One of One"
  size: string;                 // "A3 (29.7 × 42 cm)"
  pricePence: number;           // integer pence
  editionTotal: number | null;  // null = open edition
  editionLabel: string;         // "Open edition" / "Edition of 100" / etc
  /** Provenance promise shown on the SELECTED tier — descriptive, never scarcity. */
  editionPromise?: string;
  framingPricePence?: number;   // optional framing surcharge (A2 + A1 only)
  /**
   * Optional hand-embellishment add-on surcharge. Polly Wedge finishes the
   * print by hand in Stephen's geometric tradition. Only meaningful on A2
   * + A1 (the sizes worth her time); A3 / A0 omit.
   */
  embellishmentPricePence?: number;
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
  collection: "habundia" | "genesis" | "born-in-the-sky";
  size?: string;           // e.g. "60 × 60 cm (approx. 24 × 24 in)" — from the source PDF
  description: string;     // the full story for this painting
  artistQuote?: string;    // Stephen's own words, if a quote exists for this piece
  location?: string;       // e.g. "Ditchling, Sussex"
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
  "Printed on 350gsm Hahnemühle archival paper using pigment inks. Each edition is estate-stamped by The Mandala Company, hand-numbered, and ships with a Certificate of Authenticity. Individually made to order in Lewes, East Sussex.";

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
  "Each print is hand-finished in Stephen's geometric tradition by Polly Wedge (estate). Made by hand and to order — please allow 4 weeks.";

/**
 * Copy for the Studio one-off tier (the £950 hand-painted unique piece).
 * Distinct from EMBELLISHMENT_NOTE: that's an add-on finishing of a print;
 * this is a singular work in its own right. Surfaced by Orla on the PDP
 * as a full-width card (tiers with `isOneOff: true`).
 */
export const STUDIO_ONE_OFF_NOTE =
  "A singular work: Polly Wedge hand-paints geometric detail in Stephen's tradition onto a large archival print, making each one unique. One of one. Allow 6 weeks.";

/**
 * Single source of truth for the estate-stamp / COA / numbering language.
 * Consumed by PaintingDetail, Basket, and the OrderConfirmation email so
 * the authentication story reads identically everywhere.
 */
export const ESTATE_AUTHENTICATION = {
  stamp: "Estate-stamped by The Mandala Company",
  stampLabel: "Estate stamp",
  numbering: "Hand-numbered within the edition",
  numberingLabel: "Hand-numbered",
  coa: "Ships with a Certificate of Authenticity on estate letterhead",
  coaLabel: "Certificate of Authenticity",
  printer: "Printed at Point 101, London — the UK's leading giclée print atelier",
  printerLabel: "Printed at Point 101",
};

/**
 * The canonical print tier ladder. Applies uniformly across every painting.
 * Researched 2026-05-28: the prior £180 flat price was below market for a
 * deceased British artist estate selling estate-stamped editions to a
 * culturally-discerning audience. Ladder anchors on the A2 Collector tier
 * — that's the conversion target; Atelier is the entry, Atelier Grande
 * the upsell, Heirloom the statement piece.
 *
 * Heirloom (A0) is hidden behind `available: false` for now — Hugo needs
 * to confirm Point 101 fulfilment capability + optional gold-leaf detail
 * sourcing before exposing the £1,250 SKU. Flip to `true` to surface it.
 */
export const PRINT_TIERS: PrintTier[] = [
  {
    id: "atelier",
    label: "Gallery Edition",
    size: "A3 (29.7 × 42 cm)",
    pricePence: 14500, // £145
    editionTotal: null,
    editionLabel: "Open edition",
    editionPromise: "made to order",
    description: "Estate-stamped, open edition, COA card",
    available: true,
  },
  {
    id: "collector",
    label: "Collector's Edition",
    size: "A2 (42 × 59.4 cm)",
    pricePence: 29500, // £295
    editionTotal: 100,
    editionLabel: "Limited edition of 100 per colourway",
    editionPromise: "the edition will never be reopened",
    framingPricePence: 29500, // £295 framing add-on
    embellishmentPricePence: 35000, // £350 hand-finishing by Polly Wedge
    description: "Limited edition of 100, estate-stamped, hand-numbered, COA",
    available: true,
    isAnchor: true,
  },
  {
    id: "atelier-grande",
    label: "Atelier Edition",
    size: "A1 (59.4 × 84.1 cm)",
    pricePence: 59500, // £595
    editionTotal: 50,
    editionLabel: "Limited edition of 50 per colourway",
    editionPromise: "the edition will never be reopened",
    framingPricePence: 39500, // £395 framing add-on
    embellishmentPricePence: 49500, // £495 hand-finishing by Polly Wedge
    description: "Limited edition of 50, estate-stamped, hand-numbered, COA",
    available: true,
  },
  {
    id: "heirloom",
    label: "Heirloom Edition",
    size: "A0 (84.1 × 118.9 cm)",
    pricePence: 125000, // £1,250
    editionTotal: 25,
    editionLabel: "Limited edition of 25 per colourway",
    editionPromise: "the edition will never be reopened",
    description:
      "Limited edition of 25, estate-stamped, hand-numbered, COA, optional gold-leaf detail",
    // Hidden until Hugo confirms fulfilment capability + optional gold-leaf
    // sourcing. Flip to `true` to expose the £1,250 SKU site-wide.
    available: false,
  },
  {
    // Studio — a singular, hand-painted one-off. NOT a print edition: Polly
    // Wedge hand-paints geometric detail in Stephen's tradition onto a large
    // archival print, making each one unique (one of one). It IS the
    // hand-finished piece, so it carries no framing / embellishment add-on
    // price — the price is the whole work.
    id: "studio",
    label: "Original — One of One",
    size: "A1 (59.4 × 84.1 cm)",
    pricePence: 95000, // £950
    editionTotal: 1,
    editionLabel: "Unique — one of one",
    description: "Hand-painted by Polly Wedge, one of one",
    isOneOff: true,
    // Hugo: set available:false if you'd rather hold this until after first
    // sales + Polly confirms capacity, per the original plan.
    available: true,
  },
];

/**
 * Default print spec used when a painting doesn't override. Edit these two
 * values to change every print across the catalogue at once. Add a
 * `printPricePence` / `printSize` override on individual Painting entries
 * if a single piece sells at a different price (e.g. larger format).
 *
 * Pricing is in PENCE (Stripe's smallest unit for GBP) so all maths stays
 * in integers and there are no rounding bugs at checkout.
 *
 * Points at the ANCHOR tier (A2 Collector, £295, edition of 100) for
 * backwards compatibility with `getPrintPricePence` / `getPrintSize`
 * (still consumed by PaintingDetail + api/checkout.ts until the size-aware
 * wire-up lands in the synthesis round). Keep the api/checkout.ts
 * DEFAULT_PRICE_PENCE / DEFAULT_SIZE constants in sync with these values.
 */
export const DEFAULT_PRINT = {
  pricePence: 29500, // £295 — anchor tier (A2 Collector)
  size: "Limited edition giclée, A2 (42 × 59.4 cm), edition of 100, estate-stamped",
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
 * advertise the entry price — "from £145" — which lowers the click barrier.
 * The £295 anchor still does its conversion work on the product page itself.
 * Falls back to the anchor price if (defensively) no tiers are visible.
 */
export const getLowestTierPricePence = (painting: Painting): number => {
  const tiers = getPrintTiers(painting);
  if (tiers.length === 0) return getAnchorTier(painting).pricePence;
  return Math.min(...tiers.map((t) => t.pricePence));
};

/**
 * Returns the framing surcharge for a tier, or null if framing isn't
 * offered at that size. Framing is currently A2 + A1 only.
 */
export const getFramingPricePence = (tier: PrintTier): number | null =>
  tier.framingPricePence ?? null;

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
  // Set this to Polly's REAL time × rate + print + any frame. At £950 retail it
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
 * "A2 (42 × 59.4 cm)" → { w: 42, h: 59.4 }. Returns null if absent.
 * Lets the scale viewer + dimension chip draw the print honestly from its
 * catalogued size with zero new data entry.
 */
export const parseSizeCm = (size: string): { w: number; h: number } | null => {
  const m = size.match(/\(([\d.]+)\s*[×x]\s*([\d.]+)\s*cm\)/);
  if (!m) return null;
  return { w: Number.parseFloat(m[1]), h: Number.parseFloat(m[2]) };
};

export interface Collection {
  id: "habundia" | "genesis" | "born-in-the-sky";
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
    backdropImage: "/img/scenes/habundia-blur.webp",
  },
  {
    id: "genesis",
    title: "Genesis Mandalas",
    description:
      "Stephen had been exploring geometry in private sketchbooks for years, learning the techniques of Celtic and Persian pattern making, studying the decorative arts of Gothic Europe and Tibet. In 1999, while studying Architecture at the University of Brighton, he made his first major mandala.\n\nThese are the Genesis paintings — three works from the earliest years of his life as a mandala artist, made between 1999 and 2001. The works that opened Stephen's practice and established its three foundations: sacred number, divine encounter, and nature's rarest geometry.",
    backdropImage: "/img/scenes/genesis-blur.webp",
  },
  {
    id: "born-in-the-sky",
    title: "Born in the Sky",
    description:
      "Stephen worked at night. While the world slept, he was at his canvas, alone with geometry and gold leaf and the dark outside the window. He understood, more than most, what it felt like to carry knowledge that set you apart. To see things others didn't look for. To find more companionship in the sky than in a room full of people.\n\nThese five paintings came from that place. Each one about something above us that most people never notice: a constellation left out, a comet on its only pass, a message sent into deep space not knowing if it will ever be received, nine stars in the shape of a swan.\n\nThings that exist beyond the edge of what is commonly seen or celebrated. Stephen found them beautiful. He spent months, sometimes over a year, bringing each one down to earth.\n\nHe called the Enneagon a painting born in the sky. All five of these were.",
    backdropImage: "/img/scenes/born-in-the-sky-blur.webp",
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
    size: "60 × 60 cm (approx. 24 × 24 in)",
    description:
      "The second painting from the Habundia collection. As with the Wild Rose, Stephen painted it using actual bluebell oil.\n\nNot a painting of bluebells. A painting about being there.\n\nSix large bells. Twelve small. Forty-eight buds, three white and one pink among them: the exceptions noticed, named, counted. Five open blooms and one pentangle. The pentangle is a five-pointed star, the geometry of Venus, the planet that traces a five-petalled rose across the sky in its eight-year orbit with Earth. The wild rose carries it in its petals. Stephen found it again here.\n\nSix owls sit in six trees whose leaves have not yet opened. The bluebell blooms in a narrow window each spring, before the canopy closes and the light disappears from the forest floor. The owls are in the bare branches above. They see in darkness what others cannot.\n\nThis was the centrepiece of Stephen's final exhibition, at Unique Arts Gallery in Brighton, 2019.",
    artistQuote:
      "A painting about being in the bluebell woods. Within the circle of 6 large bells are 12 small bells, 48 bluebell buds, three of which are white and one of which is pink, together with 5 open blooms and one pentangle. There are 6 owls in the six trees that are just about to fill with leaves.",
    colourways: [
      {
        name: "Original",
        image: "/img/paintings/english-bluebells.jpg",
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
      {
        name: "Aquamarine Blue",
        image: "/img/paintings/orchis7-aquamarine-blue.jpg",
        hex: "#7fa9a3",
        isOriginal: true,
        available: true,
      },
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
        image: "/img/paintings/peacock-persian-indigo.jpg",
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
        image: "/img/paintings/peacock-sahara-sand-yellow.jpg",
        hex: "#d2b07a",
        isOriginal: false,
        available: true,
      },
      {
        name: "Moroccan Purple",
        image: "/img/paintings/peacock-moroccan-purple.jpg",
        hex: "#3d1e5e",
        isOriginal: false,
        available: true,
      },
      {
        name: "Mary Pink",
        image: "/img/paintings/peacock-mary-pink.jpg",
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
    size: "60 × 80 cm (approx. 24 × 32 in)",
    description:
      "There are thirteen constellations through which the ecliptic passes. The Babylonians used twelve, one for each month. Ophiuchus, through which the sun travels for eighteen days between November and December, was left out. It has been the excluded thirteenth ever since.\n\nOphiuchus is the Serpent Bearer. In Greek mythology, he is Asclepius, son of Apollo, who became so skilled in healing that he could raise the dead. Zeus killed him with a thunderbolt for upsetting the natural order, then placed him in the sky as a constellation, holding a serpent in both hands.\n\nThe Rod of Asclepius, a single serpent coiled around a staff, remains the global symbol of medicine. The serpent was chosen because its venom is simultaneously poison and cure. The same substance kills and heals. Asclepius understood that there is no such thing as a toxin that is only a toxin.\n\nStephen built this painting on a square — the Tibetan mandala palace form, four gates facing four directions, the sacred architecture of the cosmos. Most of his mandalas are circular. This one is not. The excluded constellation demanded a different kind of space.\n\nStephen described it as his homage to Ophiuchus, the constellation of the serpent bearer and toxin protector.",
    colourways: [
      {
        name: "Original",
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
        available: true,
      },
      {
        name: "Supernova Violet",
        image: "/img/paintings/tridecagon-supernova-violet.jpg",
        hex: "#8a7fd2",
        isOriginal: false,
        available: true,
      },
      {
        name: "Coral Reef",
        image: "/img/paintings/tridecagon-coral-reef.jpg",
        hex: "#dcb39e",
        isOriginal: false,
        available: true,
      },
    ],
  },
  {
    id: "lulin",
    title: "Lulin",
    year: "2012",
    collection: "born-in-the-sky",
    size: "65 × 65 cm (approx. 26 × 26 in)",
    description:
      "On 24 February 2009, a green comet made its closest approach to Earth. It came within 38 million miles, glowing green from cyanogen and diatomic carbon burning in its atmosphere. Cyanogen is a poisonous gas. It makes one of the most beautiful colours in the night sky.\n\nComet Lulin was discovered in 2007 by a nineteen-year-old Chinese student named Ye Quanzhi, studying a photograph taken at the Lulin Observatory in Taiwan. He noticed something that wasn't a star. No one had seen it before, because it had never been here before. This was Comet Lulin's first visit to the inner solar system, its first exposure to sunlight. It moved backwards, retrograde, against the direction of every planet.\n\nIt orbits the sun once every million years. It will not return.\n\nStephen painted it three years after its passing. A portrait of something most people missed entirely, already gone, made permanent.",
    colourways: [
      {
        name: "Original",
        image: "/img/paintings/lulin-original.jpg",
        hex: "#7da383",
        isOriginal: true,
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
        image: "/img/paintings/enneagon-velvet-purple.jpg",
        hex: "#5e3d6e",
        isOriginal: false,
        available: true,
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
  count >= 3 ? 10 : 5;

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
export const COLOURWAY_SET_DISCOUNT_PERCENT = 12;
export const COMPLETE_CATALOGUE_DISCOUNT_PERCENT = 15;

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
    (sum, p) => sum + getTierById(p, tierId).pricePence,
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
  const fullPricePence = tier.pricePence * available.length;
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
    (sum, p) => sum + getTierById(p, tierId).pricePence,
    0,
  );
  const discountPercent = COMPLETE_CATALOGUE_DISCOUNT_PERCENT;
  const bundlePricePence = Math.round(
    fullPricePence * (1 - discountPercent / 100),
  );
  return {
    title: "The Complete Catalogue",
    paintingIds: paintings.map((p) => p.id),
    items,
    paintingCount: paintings.length,
    discountPercent,
    fullPricePence,
    bundlePricePence,
    savePence: fullPricePence - bundlePricePence,
  };
};
