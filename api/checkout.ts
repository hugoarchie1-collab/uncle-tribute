/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout session for a single print order and returns
 * its URL. The browser redirects to Stripe's hosted checkout; on success
 * the buyer bounces back to /order/success and Stripe pings
 * /api/stripe-webhook so we can record the order.
 *
 * Request body: { paintingId: string, colourwayName?: string }
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
 * /api at build or runtime. Painting metadata is duplicated here from
 * src/data/paintings.ts; keep the two in sync when adding paintings.
 */

import Stripe from "stripe";

// Default print spec — kept in sync with src/data/paintings.ts DEFAULT_PRINT.
const DEFAULT_PRICE_PENCE = 18000; // £180
const DEFAULT_SIZE = "Limited edition giclée print, A2 (42 × 59 cm)";
const PRINT_SPEC =
  "Printed on 350gsm archival canvas using pigment inks, hand-stretched on a deep wooden frame. Individually made to order.";

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

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const secret = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.SITE_URL;
  if (!secret) return json(500, { error: "Server missing STRIPE_SECRET_KEY." });
  if (!siteUrl) return json(500, { error: "Server missing SITE_URL." });

  let body: { paintingId?: string; colourwayName?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const paintingId = body.paintingId;
  if (!paintingId || !VALID_PAINTING_IDS.has(paintingId)) {
    return json(400, { error: `Unknown painting "${paintingId ?? ""}".` });
  }
  const colourway = body.colourwayName?.trim() || "Original";

  const title = PAINTING_TITLES[paintingId] ?? paintingId;
  const productName = `${title} — ${colourway}`;
  const productDesc = `${DEFAULT_SIZE}. ${PRINT_SPEC}`;

  const stripe = new Stripe(secret);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: DEFAULT_PRICE_PENCE,
            product_data: {
              name: productName,
              description: productDesc,
              // No product_data.images — Stripe synchronously fetches each
              // image URL when creating the session, and an unreachable /
              // slow image can hang the call. We can add the painting cover
              // back as a hosted Stripe product image later.
            },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: [
          "GB", "IE", "FR", "DE", "ES", "IT", "NL", "BE", "LU",
          "AT", "PT", "DK", "SE", "NO", "FI", "CH", "PL",
          "US", "CA", "AU", "NZ",
        ],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 1500, currency: "gbp" },
            display_name: "United Kingdom (5-7 working days)",
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 3500, currency: "gbp" },
            display_name: "Europe (7-10 working days)",
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 6000, currency: "gbp" },
            display_name: "Worldwide (10-14 working days)",
          },
        },
      ],
      metadata: {
        painting_id: paintingId,
        painting_title: title,
        colourway_name: colourway,
        size: DEFAULT_SIZE,
      },
      success_url: `${siteUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/order/cancel`,
    });

    if (!session.url) {
      console.error("[/api/checkout] Stripe returned session without URL", session.id);
      return json(500, { error: "Stripe didn't return a checkout URL." });
    }

    console.log("[/api/checkout] session created", { id: session.id, painting: paintingId });
    return json(200, { url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe checkout failed.";
    console.error("[/api/checkout] Stripe error:", message);
    return json(500, { error: message });
  }
}
