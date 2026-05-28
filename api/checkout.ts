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
 * Pricing: `tierId` selects a rung on the canonical PRINT_TIERS ladder
 * (mirrored inline below — gotcha #5). Missing `tierId` defaults to the
 * anchor ("collector" = A2 £295). Framing is an OPTIONAL separate Stripe
 * line item priced from the tier's `framingPricePence` — only A2 + A1
 * carry a framing price; passing `framing: true` on a tier that doesn't
 * offer framing is silently ignored. The same pattern applies to
 * `embellished` — Polly Wedge hand-finishes A2 + A1 only at
 * `embellishmentPricePence` (£350 / £495); ignored on A3 / A0.
 *
 * Bundle discount: when normalised items count ≥ 2, we mint a Stripe
 * coupon programmatically and apply it via `discounts`. 5% off on 2
 * items, 10% off on 3+. Failures are swallowed — never block checkout
 * on a discount mint failure.
 *
 * Response 200: { url: string }      — redirect the browser here
 *          400: { error: string }    — validation failure
 *          500: { error: string }    — server / Stripe failure
 *
 * Required env vars on Vercel:
 *   STRIPE_SECRET_KEY   – sk_live_…
 *   SITE_URL            – e.g. https://uncle-tribute.vercel.app (no trailing slash)
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
    label: "Atelier",
    size: "A3 (29.7 × 42 cm)",
    pricePence: 14500,
    editionLabel: "Open edition",
    available: true,
  },
  collector: {
    id: "collector",
    label: "Collector",
    size: "A2 (42 × 59.4 cm)",
    pricePence: 29500,
    editionLabel: "Limited edition of 100",
    framingPricePence: 29500,
    embellishmentPricePence: 35000,
    available: true,
  },
  "atelier-grande": {
    id: "atelier-grande",
    label: "Atelier Grande",
    size: "A1 (59.4 × 84.1 cm)",
    pricePence: 59500,
    editionLabel: "Limited edition of 50",
    framingPricePence: 39500,
    embellishmentPricePence: 49500,
    available: true,
  },
  heirloom: {
    id: "heirloom",
    label: "Heirloom",
    size: "A0 (84.1 × 118.9 cm)",
    pricePence: 125000,
    editionLabel: "Limited edition of 25",
    // Hidden site-wide until Hugo confirms Point 101 A0 fulfilment.
    available: false,
  },
  studio: {
    // Studio one-off — £950 unique hand-painted piece by Polly Wedge. No
    // framing / embellishment price: it IS the hand-finished work, so a
    // "studio" tierId produces a single £950 line item with no add-ons.
    id: "studio",
    label: "Studio — Hand-painted by Polly Wedge",
    size: "A1 (59.4 × 84.1 cm)",
    pricePence: 95000,
    editionLabel: "Unique — one of one",
    isOneOff: true,
    available: true,
  },
};

const DEFAULT_TIER_ID: TierId = "collector"; // anchor tier (A2 £295)

// Boilerplate spec line used in Stripe product description.
const PRINT_SPEC =
  "Estate-stamped by The Mandala Company, hand-numbered within the edition. Ships with a Certificate of Authenticity. Printed at Point 101, London.";

// Hard cap on a single Stripe checkout — sane upper bound for a 10-painting
// catalogue; protects against an absurd POST body from a broken client.
const MAX_ITEMS = 20;

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

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const isTierId = (v: unknown): v is TierId =>
  v === "atelier" ||
  v === "collector" ||
  v === "atelier-grande" ||
  v === "heirloom" ||
  v === "studio";

interface NormalisedItem {
  paintingId: string;
  colourway: string;
  title: string;
  tier: TierDef;
  framing: boolean;     // true only if framing is offered AND requested
  embellished: boolean; // true only if hand-finishing is offered AND requested
}

const normaliseItem = (
  paintingId: string | undefined,
  colourwayName: string | undefined,
  tierIdRaw: unknown,
  framingRaw: unknown,
  embellishedRaw: unknown,
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
  return { paintingId, colourway, title, tier, framing, embellished };
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

/**
 * Compute the shipping options for a session. Framed items add a per-region
 * surcharge on top of the unframed flat rates per Agent K's research:
 *   UK base £15; framed A2 +£15 / framed A1 +£25
 *   EU base £35; framed surcharge doubles vs UK
 *   WW base £60; framed surcharge doubles vs UK
 * Glazing is cast acrylic for framed posts (no breakage liability) so a single
 * shipping band per region still works — no separate "with glass" tier.
 * Unframed orders see the original flat rates byte-for-byte.
 */
const buildShippingOptions = (items: NormalisedItem[]) => {
  const framedUkSurchargePence = items.reduce((acc, item) => {
    if (!item.framing) return acc;
    if (item.tier.id === "collector") return acc + 1500;       // A2 framed +£15
    if (item.tier.id === "atelier-grande") return acc + 2500;  // A1 framed +£25
    return acc;
  }, 0);
  const intlSurchargePence = framedUkSurchargePence * 2; // EU + WW double per Agent K
  return [
    {
      shipping_rate_data: {
        type: "fixed_amount" as const,
        fixed_amount: { amount: 1500 + framedUkSurchargePence, currency: "gbp" },
        display_name:
          framedUkSurchargePence > 0
            ? "United Kingdom — framed (5-7 working days)"
            : "United Kingdom (5-7 working days)",
      },
    },
    {
      shipping_rate_data: {
        type: "fixed_amount" as const,
        fixed_amount: { amount: 3500 + intlSurchargePence, currency: "gbp" },
        display_name:
          intlSurchargePence > 0
            ? "Europe — framed (7-10 working days)"
            : "Europe (7-10 working days)",
      },
    },
    {
      shipping_rate_data: {
        type: "fixed_amount" as const,
        fixed_amount: { amount: 6000 + intlSurchargePence, currency: "gbp" },
        display_name:
          intlSurchargePence > 0
            ? "Worldwide — framed (10-14 working days)"
            : "Worldwide (10-14 working days)",
      },
    },
  ];
};

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const secret = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.SITE_URL;
  if (!secret) return json(500, { error: "Server missing STRIPE_SECRET_KEY." });
  if (!siteUrl) return json(500, { error: "Server missing SITE_URL." });

  let body: {
    paintingId?: string;
    colourwayName?: string;
    tierId?: unknown;
    framing?: unknown;
    embellished?: unknown;
    items?: Array<{
      paintingId?: string;
      colourwayName?: string;
      tierId?: unknown;
      framing?: unknown;
      embellished?: unknown;
    }>;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
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
        },
      ];

  if (rawItems.length === 0) {
    return json(400, { error: "Basket is empty." });
  }
  if (rawItems.length > MAX_ITEMS) {
    return json(400, { error: `Too many items (max ${MAX_ITEMS}).` });
  }

  const normalised: NormalisedItem[] = [];
  for (const raw of rawItems) {
    const result = normaliseItem(
      raw?.paintingId,
      raw?.colourwayName,
      raw?.tierId,
      raw?.framing,
      raw?.embellished,
    );
    if ("error" in result) return json(400, result);
    normalised.push(result);
  }

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
        currency: "gbp",
        unit_amount: item.tier.pricePence,
        product_data: {
          name: `${item.title} — ${item.colourway} — ${item.tier.label} ${item.tier.size.split(" ")[0]}`,
          description: `${item.tier.size}. ${item.tier.editionLabel}. ${PRINT_SPEC}`,
          // No product_data.images — Stripe synchronously fetches each image
          // URL when creating the session, and an unreachable / slow image
          // can hang the call (gotcha #3 in CLAUDE.md).
        },
      },
    });
    if (item.framing && typeof item.tier.framingPricePence === "number") {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: item.tier.framingPricePence,
          product_data: {
            name: `Framing — ${item.title} (${item.tier.label} ${item.tier.size.split(" ")[0]})`,
            description: `Hand-finished frame for the ${item.tier.label} edition.`,
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
          currency: "gbp",
          unit_amount: item.tier.embellishmentPricePence,
          product_data: {
            name: `Hand-finished by Polly Wedge — ${item.title} (${item.tier.label} ${item.tier.size.split(" ")[0]})`,
            description:
              "Hand-finished in Stephen's geometric tradition by Polly Wedge (estate). Made by hand and to order — please allow 4 weeks.",
          },
        },
      });
    }
  }

  // ---- Metadata ----------------------------------------------------------
  // For single-item we keep the historical key names so any existing
  // webhook-log dashboards keep parsing cleanly. For multi-item we add
  // truncated comma-joined lists plus an item_count for at-a-glance triage.
  const metadata: Record<string, string> =
    normalised.length === 1
      ? {
          painting_id: normalised[0].paintingId,
          painting_title: normalised[0].title,
          colourway_name: normalised[0].colourway,
          tier_id: normalised[0].tier.id,
          tier_label: normalised[0].tier.label,
          size: normalised[0].tier.size,
          framing: normalised[0].framing ? "yes" : "no",
          embellished: normalised[0].embellished ? "yes" : "no",
          item_count: "1",
        }
      : {
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
          size: normalised[0].tier.size,
        };

  // Note: `new Stripe(secret)` with no apiVersion — pinning a version
  // literal like "2025-09-30.clover" can mismatch the SDK's exported type
  // union (gotcha #6 in CLAUDE.md). Let the SDK use its pinned default.
  const stripe = new Stripe(secret);

  // ---- Bundle discount (programmatic coupon mint) ------------------------
  // 2 items → 5% off; 3+ → 10% off. Single line of "Estate bundle thank-you"
  // copy. Failures are swallowed — never block checkout on a discount mint.
  let discounts: Array<{ coupon: string }> | undefined;
  if (normalised.length >= 2) {
    const percentOff = normalised.length >= 3 ? 10 : 5;
    try {
      const coupon = await stripe.coupons.create({
        percent_off: percentOff,
        duration: "once",
        name: "Estate bundle thank-you",
        metadata: {
          source: "bundle_discount",
          item_count: String(normalised.length),
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

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      shipping_address_collection: {
        allowed_countries: [
          "GB", "IE", "FR", "DE", "ES", "IT", "NL", "BE", "LU",
          "AT", "PT", "DK", "SE", "NO", "FI", "CH", "PL",
          "US", "CA", "AU", "NZ",
        ],
      },
      shipping_options: buildShippingOptions(normalised),
      metadata,
      // Stripe disallows `allow_promotion_codes` and `discounts` together.
      // When we've programmatically applied a bundle discount, we drop the
      // promo-code input on the hosted checkout (the buyer's bundle already
      // beats their thank-you code anyway). When there's no bundle, the
      // promo-code input stays so the thank-you code is redeemable.
      ...(discounts
        ? { discounts }
        : { allow_promotion_codes: true }),
      success_url: `${siteUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/order/cancel`,
    });

    if (!session.url) {
      console.error("[/api/checkout] Stripe returned session without URL", session.id);
      return json(500, { error: "Stripe didn't return a checkout URL." });
    }

    console.log("[/api/checkout] session created", {
      id: session.id,
      itemCount: normalised.length,
      paintings: normalised.map((i) => i.paintingId).join(","),
      tiers: normalised.map((i) => i.tier.id).join(","),
      framed: normalised.filter((i) => i.framing).length,
      embellished: normalised.filter((i) => i.embellished).length,
      bundleDiscount: discounts ? "yes" : "no",
    });
    return json(200, { url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe checkout failed.";
    console.error("[/api/checkout] Stripe error:", message);
    return json(500, { error: message });
  }
}
