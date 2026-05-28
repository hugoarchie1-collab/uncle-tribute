/**
 * POST /api/stripe-webhook
 *
 * Stripe pings this endpoint when payment events fire. We listen for
 * `checkout.session.completed` and:
 *   1. Log the order to Vercel function logs (audit trail)
 *   2. Create a personal one-year "thank-you" promotion code for the buyer
 *      (10% off, single use) — see api/_lib/thankYouCode.ts
 *   3. Send an estate-branded confirmation email via Resend, including the
 *      thank-you code — see api/_lib/emails/OrderConfirmation.tsx
 *
 * Critical contract with Stripe: this endpoint MUST return 200 quickly, even
 * if our downstream actions (Resend, coupon creation) fail. Stripe retries
 * non-2xx responses aggressively and we don't want a Resend outage to spam
 * the webhook log or, worse, mark sessions as "failed delivery" on Stripe's
 * side. Every downstream action is therefore try/catch'd and logged, never
 * thrown.
 *
 * The seller email notification (the one that tells Hugo to log into Point101
 * and place the print) is still sent by Stripe itself — toggle on at:
 *   Stripe dashboard → Settings → Notifications → Successful payments
 * We also BCC info@themandalacompany.com on the estate-branded email so the
 * estate has a paper trail of what the buyer received from us specifically.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY       – sk_live_…
 *   STRIPE_WEBHOOK_SECRET   – whsec_…
 * Optional env vars:
 *   RESEND_API_KEY          – re_… (if missing, email send is skipped silently)
 *   ESTATE_FROM_EMAIL       – sender address (default: info@themandalacompany.com)
 *   ESTATE_BCC_EMAIL        – BCC for paper trail (default: info@themandalacompany.com)
 *   THANK_YOU_CODE_FALLBACK – static code used if dynamic coupon creation
 *                             fails (default: "FRIENDS"; Hugo must set up a
 *                             matching promotion code in the Stripe dashboard
 *                             for the fallback to actually work)
 *
 * Self-contained file (no imports from /src — gotcha #5 in CLAUDE.md).
 * Imports from /api/_lib/* are fine — same Vercel bundle, underscore prefix
 * keeps them out of the public route table.
 */

import Stripe from "stripe";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { OrderConfirmation } from "./_lib/emails/OrderConfirmation";
import { createThankYouCode, type ThankYouCode } from "./_lib/thankYouCode";

const ok = (msg = "ok") => new Response(msg, { status: 200 });
const bad = (msg: string) => new Response(msg, { status: 400 });

// Defaults — kept in code (not env) so missing env vars don't break the
// happy path. Hugo can override either via Vercel env vars if desired.
const DEFAULT_FROM = "info@themandalacompany.com";
const DEFAULT_BCC = "info@themandalacompany.com";
const FROM_NAME = "The Mandala Company";
// Fallback static code used if dynamic coupon creation fails. For this to
// actually grant a discount at checkout, Hugo must create a matching
// promotion code in the Stripe dashboard (one-off, %10 off, no expiry).
// See CLAUDE.md "Thank-you discount" section for the recipe.
const FALLBACK_CODE = "FRIENDS";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatGBP = (pence: number | null | undefined): string => {
  if (typeof pence !== "number") return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
};

/**
 * Lift the per-line items out of the Checkout Session's metadata. The
 * checkout.ts handler writes either single-item (painting_title /
 * colourway_name / size) or multi-item (painting_titles / colourway_names,
 * comma-separated) — handle both shapes.
 */
interface EmailLine {
  title: string;
  colourway: string;
  tierLabel?: string;
  editionLabel?: string;
  size: string;
  framing?: boolean;
  embellished?: boolean;
  price: string;
}

// Per-tier price lookup (mirror of api/checkout.ts TIERS — keep in sync,
// gotcha #9). Used to render per-line prices in the confirmation email
// without trusting Stripe to split a total across lines.
const TIER_PRICE_PENCE: Record<string, number> = {
  atelier: 14500,
  collector: 29500,
  "atelier-grande": 59500,
  heirloom: 125000,
};
const TIER_LABEL: Record<string, string> = {
  atelier: "Atelier",
  collector: "Collector",
  "atelier-grande": "Atelier Grande",
  heirloom: "Heirloom",
};
const TIER_SIZE: Record<string, string> = {
  atelier: "A3 (29.7 × 42 cm)",
  collector: "A2 (42 × 59.4 cm)",
  "atelier-grande": "A1 (59.4 × 84.1 cm)",
  heirloom: "A0 (84.1 × 118.9 cm)",
};
const TIER_EDITION: Record<string, string> = {
  atelier: "Open edition",
  collector: "Limited edition of 100",
  "atelier-grande": "Limited edition of 50",
  heirloom: "Limited edition of 25",
};

const linesFromMetadata = (
  m: Stripe.Metadata | null,
  amountSubtotal: number | null | undefined,
): EmailLine[] => {
  if (!m) return [];
  // Single-item shape
  if (m.painting_title && !m.painting_titles) {
    const tierId = m.tier_id || "collector";
    return [
      {
        title: m.painting_title,
        colourway: m.colourway_name || "Original",
        tierLabel: TIER_LABEL[tierId] ?? m.tier_label,
        editionLabel: TIER_EDITION[tierId],
        size: TIER_SIZE[tierId] ?? m.size ?? "Limited edition giclée print",
        framing: m.framing === "yes",
        embellished: m.embellished === "yes",
        price: formatGBP(TIER_PRICE_PENCE[tierId] ?? amountSubtotal ?? null),
      },
    ];
  }
  // Multi-item shape
  const titles = (m.painting_titles || "").split(",").map((s) => s.trim()).filter(Boolean);
  const colourways = (m.colourway_names || "").split(",").map((s) => s.trim()).filter(Boolean);
  const tierIds = (m.tier_ids || "").split(",").map((s) => s.trim()).filter(Boolean);
  const framingFlags = (m.framing_flags || "").split(",").map((s) => s.trim()).filter(Boolean);
  const embellishedFlags = (m.embellished_flags || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (titles.length === 0) return [];
  return titles.map((title, idx) => {
    const tierId = tierIds[idx] || "collector";
    return {
      title,
      colourway: colourways[idx] || "Original",
      tierLabel: TIER_LABEL[tierId],
      editionLabel: TIER_EDITION[tierId],
      size: TIER_SIZE[tierId] ?? "Limited edition giclée print",
      framing: framingFlags[idx] === "y",
      embellished: embellishedFlags[idx] === "y",
      price: formatGBP(TIER_PRICE_PENCE[tierId] ?? null),
    };
  });
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: Request) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    // 500, not 400 — server config issue. Stripe stops retrying 5xxs faster
    // than it stops retrying 400s, so we don't spam the log forever.
    return new Response(
      "Server is missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET.",
      { status: 500 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return bad("Missing stripe-signature header.");

  const stripe = new Stripe(secret);
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
      const m = session.metadata ?? {};
      const shipping =
        (session as unknown as {
          shipping_details?: { name?: string | null; address?: unknown };
        }).shipping_details ?? null;
      const buyerEmail = session.customer_details?.email ?? null;
      const buyerName = session.customer_details?.name ?? shipping?.name ?? null;

      console.log("[checkout.session.completed]", {
        session_id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: buyerEmail,
        customer_name: buyerName,
        painting_id: m.painting_id,
        painting_title: m.painting_title,
        painting_titles: m.painting_titles,
        colourway: m.colourway_name,
        colourway_names: m.colourway_names,
        item_count: m.item_count,
        size: m.size,
        shipping_name: shipping?.name,
        shipping_address: shipping?.address,
      });

      // -- 1. Mint the thank-you code (or fall back) -----------------------
      // We do this BEFORE rendering the email so the code lands in the
      // template. Any failure falls back to the static reusable code; we
      // never block the webhook on Stripe.coupons errors.
      let thankYou: ThankYouCode;
      try {
        thankYou = await createThankYouCode(stripe, {
          sessionId: session.id,
          buyerEmail,
        });
        console.log("[stripe-webhook] thank-you code minted", {
          session_id: session.id,
          code: thankYou.code,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          "[stripe-webhook] thank-you code mint failed, using fallback:",
          message,
        );
        const fallbackCode = process.env.THANK_YOU_CODE_FALLBACK || FALLBACK_CODE;
        const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        thankYou = {
          code: fallbackCode,
          valueLabel: "10%",
          expiresLabel: oneYear.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        };
      }

      // -- 2. Send the estate-branded confirmation email -------------------
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        // Documented design choice — see file header. Hugo gets a warning in
        // the function log but the webhook still 200s so Stripe is happy.
        console.warn(
          "[stripe-webhook] RESEND_API_KEY missing — skipping confirmation email.",
        );
        break;
      }
      if (!buyerEmail) {
        console.warn(
          "[stripe-webhook] No customer email on session — skipping confirmation email.",
          { session_id: session.id },
        );
        break;
      }

      try {
        const fromEmail = process.env.ESTATE_FROM_EMAIL || DEFAULT_FROM;
        const bccEmail = process.env.ESTATE_BCC_EMAIL || DEFAULT_BCC;
        const resend = new Resend(resendKey);

        const lines = linesFromMetadata(m, session.amount_subtotal);
        const html = await render(
          OrderConfirmation({
            buyerName,
            orderRef: session.id.slice(0, 18) + "…",
            lines,
            total: formatGBP(session.amount_total),
            thankYouCode: thankYou.code,
            thankYouValue: thankYou.valueLabel,
            thankYouExpiry: thankYou.expiresLabel,
            estateEmail: DEFAULT_FROM,
          }),
        );

        const sendResult = await resend.emails.send({
          from: `${FROM_NAME} <${fromEmail}>`,
          to: [buyerEmail],
          // BCC only if it's a different inbox to "from", to avoid Resend
          // rejecting a self-bcc on some sender domains.
          bcc: bccEmail && bccEmail.toLowerCase() !== fromEmail.toLowerCase()
            ? [bccEmail]
            : undefined,
          replyTo: DEFAULT_FROM,
          subject: "Thank you — your print from the Stephen Meakin estate",
          html,
        });

        // Resend returns { data, error } — log either branch for traceability.
        if (sendResult.error) {
          console.error("[stripe-webhook] Resend send error:", sendResult.error);
        } else {
          console.log("[stripe-webhook] confirmation email sent", {
            session_id: session.id,
            to: buyerEmail,
            resend_id: sendResult.data?.id,
          });
        }
      } catch (err) {
        // Swallow ALL email errors — never fail the webhook on email send.
        const message = err instanceof Error ? err.message : String(err);
        console.error("[stripe-webhook] confirmation email failed:", message);
      }

      // -- 3. Shipped email -----------------------------------------------
      // TODO(hugo): build a small admin endpoint POST /api/admin/order-shipped
      // that takes { sessionId, trackingUrl, carrier } and sends the
      // OrderShipped template via Resend. For initial launch this remains
      // manual from Hugo's own inbox.

      break;
    }
    default:
      console.log(`[stripe-webhook] Unhandled event: ${event.type}`);
  }

  return ok();
}
