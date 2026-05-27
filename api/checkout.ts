/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout session for a single print order and returns
 * its URL. The browser redirects to Stripe's hosted checkout where the
 * buyer enters card + shipping address; on success they bounce back to
 * /order/success and the /api/stripe-webhook handler records the order.
 *
 * Request body (JSON):
 *   { paintingId: string, colourwayName?: string }
 *
 * Response (JSON):
 *   200 { url: string }    – redirect the browser here
 *   400 { error: string }  – validation failure (unknown painting etc.)
 *   500 { error: string }  – Stripe API failure
 *
 * Required env vars on the Vercel project:
 *   STRIPE_SECRET_KEY   – sk_live_… (Stripe dashboard → Developers → API keys)
 *   SITE_URL            – e.g. https://uncle-tribute.vercel.app  (no trailing slash)
 */

import Stripe from "stripe";
import {
  PAINTINGS,
  DEFAULT_PRINT,
  getPrintPricePence,
  getPrintSize,
} from "../src/data/paintings";

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
  if (!secret || !siteUrl) {
    return json(500, {
      error:
        "Server is missing STRIPE_SECRET_KEY or SITE_URL env vars. See repo README → Stripe setup.",
    });
  }

  let body: { paintingId?: string; colourwayName?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const painting = PAINTINGS.find((p) => p.id === body.paintingId);
  if (!painting) return json(400, { error: "Unknown painting." });

  const colourway = body.colourwayName
    ? painting.colourways.find((c) => c.name === body.colourwayName)
    : painting.colourways.find((c) => c.isOriginal) ?? painting.colourways[0];
  if (!colourway) return json(400, { error: "Painting has no available colourway." });

  const pricePence = getPrintPricePence(painting);
  const sizeLabel = getPrintSize(painting);
  const productName = `${painting.title} — ${colourway.name}`;
  const productDesc = `${sizeLabel}. ${DEFAULT_PRINT.spec}`;

  // Absolute URL so Stripe can use it as the product image in checkout.
  const productImage = `${siteUrl}${colourway.image.startsWith("/") ? "" : "/"}${colourway.image}`;

  const stripe = new Stripe(secret, { apiVersion: "2025-09-30.clover" });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: pricePence,
            product_data: {
              name: productName,
              description: productDesc,
              images: [productImage],
            },
          },
        },
      ],
      // Stripe handles address entry — fulfilment uses what the buyer enters.
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
            display_name: "United Kingdom — tracked, 5-7 working days",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 5 },
              maximum: { unit: "business_day", value: 7 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 3500, currency: "gbp" },
            display_name: "Europe — tracked, 7-10 working days",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 7 },
              maximum: { unit: "business_day", value: 10 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 6000, currency: "gbp" },
            display_name: "Worldwide — tracked, 10-14 working days",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 10 },
              maximum: { unit: "business_day", value: 14 },
            },
          },
        },
      ],
      // Buyer's email + receipt
      phone_number_collection: { enabled: false },
      // Metadata is echoed back to us on the webhook — used to know which
      // print to send to Point101 without re-parsing the line item name.
      metadata: {
        painting_id: painting.id,
        painting_title: painting.title,
        colourway_name: colourway.name,
        size: sizeLabel,
      },
      success_url: `${siteUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/order/cancel`,
    });

    if (!session.url) return json(500, { error: "Stripe didn't return a checkout URL." });
    return json(200, { url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe checkout failed.";
    return json(500, { error: message });
  }
}
