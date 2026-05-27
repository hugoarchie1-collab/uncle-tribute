/**
 * POST /api/stripe-webhook
 *
 * Stripe pings this endpoint when payment events fire. We listen for
 * `checkout.session.completed` and log the order so it's visible in
 * Vercel function logs (Vercel dashboard → Deployments → Functions).
 *
 * The seller email notification (the one that tells you to log into
 * Point101 and place the print) is sent by Stripe itself, not from
 * here — toggle on at:
 *   Stripe dashboard → Settings → Notifications → Successful payments
 *
 * This handler exists so the order is also persisted to function logs
 * (audit trail) and so future automations (Resend email, Notion sync,
 * Prodigi/Gelato API integration) can be added in one place.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY       – sk_live_…
 *   STRIPE_WEBHOOK_SECRET   – whsec_… (Stripe dashboard → Developers → Webhooks → your endpoint → Signing secret)
 */

import Stripe from "stripe";

// Web Standards handlers receive the raw request body via req.text(),
// which is what stripe.webhooks.constructEvent needs for signature
// verification. No bodyParser config required.

const ok = (msg = "ok") => new Response(msg, { status: 200 });
const bad = (msg: string) => new Response(msg, { status: 400 });

export default async function handler(req: Request) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    return bad("Server is missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET.");
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return bad("Missing stripe-signature header.");

  const stripe = new Stripe(secret, { apiVersion: "2025-09-30.clover" });

  // Raw body for signature verification
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed.";
    return bad(`Webhook signature verification failed: ${message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      // Pull both the metadata we set when creating the session and the
      // shipping address Stripe captured during checkout.
      const m = session.metadata ?? {};
      const shipping =
        // shipping_details is the modern field (Stripe API v2024+)
        (session as unknown as { shipping_details?: Stripe.Checkout.Session.ShippingDetails })
          .shipping_details ?? null;

      // Log structured so the entry is searchable in Vercel function logs.
      console.log("[checkout.session.completed]", {
        session_id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_details?.email,
        customer_name: session.customer_details?.name,
        painting_id: m.painting_id,
        painting_title: m.painting_title,
        colourway: m.colourway_name,
        size: m.size,
        shipping_name: shipping?.name,
        shipping_address: shipping?.address,
      });
      break;
    }
    default:
      console.log(`[stripe-webhook] Unhandled event: ${event.type}`);
  }

  return ok();
}
