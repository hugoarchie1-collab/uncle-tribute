/**
 * POST /api/admin/order-shipped
 *
 * Manually-triggered "your print has shipped" email. Hugo hits this once a
 * Point 101 dispatch lands on his desk with a tracking number, and the buyer
 * gets the estate-branded shipped notification via Resend.
 *
 * Authenticated with a shared secret env var (ADMIN_API_KEY). No login UI —
 * Hugo's expected to curl this or paste into a future tiny admin form.
 *
 * Request body:
 *   {
 *     sessionId:   string,   // the Stripe Checkout session id (cs_…)
 *     trackingUrl: string,   // the carrier's tracking URL
 *     carrier:     string,   // human-readable, e.g. "Royal Mail Tracked 48"
 *     secret:      string,   // must equal ADMIN_API_KEY
 *   }
 *
 * Response 200: { ok: true, sent_to: string }
 *          400: { error: string }
 *          401: { error: string }
 *          404: { error: string }
 *          405 / 500
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY  – sk_live_…  (used to retrieve the session)
 *   RESEND_API_KEY     – re_…       (used to send the email)
 *   ADMIN_API_KEY      – shared secret that authenticates this endpoint
 * Optional:
 *   ESTATE_FROM_EMAIL  – default info@themandalacompany.com
 *   ESTATE_BCC_EMAIL   – default info@themandalacompany.com
 *
 * Self-contained per gotcha #5 — imports only from /api/_lib and npm.
 *
 * Usage (curl):
 *   curl -X POST https://uncle-tribute.vercel.app/api/admin/order-shipped \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "sessionId":   "cs_live_…",
 *       "trackingUrl": "https://www.royalmail.com/track-your-item#/tracking-results/AB12345",
 *       "carrier":     "Royal Mail Tracked 48",
 *       "secret":      "<your ADMIN_API_KEY>"
 *     }'
 */

import Stripe from "stripe";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { OrderShipped } from "../_lib/emails/OrderShipped.js";

const DEFAULT_FROM = "info@themandalacompany.com";
const DEFAULT_BCC = "info@themandalacompany.com";
const FROM_NAME = "The Mandala Company";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Constant-time-ish string compare to discourage timing attacks. (Vercel's
// edge isn't strictly constant-time anyway — node's crypto.timingSafeEqual
// is closer — but for two short strings the practical risk is negligible.)
const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
};

const formatDispatchedAt = (date: Date): string =>
  date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// Lift per-line {title, colourway} pairs out of the session metadata, in the
// same way the webhook does — handles both single-item and multi-item shapes
// that api/checkout.ts can write.
interface ShippedLine {
  title: string;
  colourway: string;
}
const linesFromMetadata = (m: Stripe.Metadata | null): ShippedLine[] => {
  if (!m) return [];
  if (m.painting_title && !m.painting_titles) {
    return [
      {
        title: m.painting_title,
        colourway: m.colourway_name || "Original",
      },
    ];
  }
  const titles = (m.painting_titles || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const colourways = (m.colourway_names || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (titles.length === 0) return [];
  return titles.map((title, idx) => ({
    title,
    colourway: colourways[idx] || "Original",
  }));
};

export default async function handler(req: Request) {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const adminKey = process.env.ADMIN_API_KEY;
  if (!stripeKey || !resendKey || !adminKey) {
    return json(500, {
      error:
        "Server is missing STRIPE_SECRET_KEY, RESEND_API_KEY or ADMIN_API_KEY.",
    });
  }

  let body: {
    sessionId?: string;
    trackingUrl?: string;
    carrier?: string;
    secret?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const sessionId = (body.sessionId ?? "").toString().trim();
  const trackingUrl = (body.trackingUrl ?? "").toString().trim();
  const carrier = (body.carrier ?? "").toString().trim();
  const secret = (body.secret ?? "").toString();

  // Auth — 401 (not 403) so it's obvious what went wrong if Hugo's curl
  // typo'd the secret.
  if (!secret || !safeEqual(secret, adminKey)) {
    return json(401, { error: "Unauthorised." });
  }

  if (!sessionId.startsWith("cs_")) {
    return json(400, { error: "sessionId must be a Stripe Checkout session id (cs_…)." });
  }
  if (!trackingUrl || !/^https?:\/\//.test(trackingUrl)) {
    return json(400, { error: "trackingUrl must be a http(s) URL." });
  }
  if (!carrier) {
    return json(400, { error: "carrier is required (e.g. 'Royal Mail Tracked 48')." });
  }

  // ---- Retrieve the session from Stripe ----------------------------------
  const stripe = new Stripe(stripeKey);
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer_details", "shipping_details"],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/order-shipped] stripe retrieve failed:", message);
    return json(404, { error: `Couldn't retrieve session: ${message}` });
  }

  const buyerEmail = session.customer_details?.email ?? null;
  const buyerName =
    session.customer_details?.name ??
    (session as unknown as { shipping_details?: { name?: string | null } })
      .shipping_details?.name ??
    null;

  if (!buyerEmail) {
    return json(400, {
      error: "Session has no customer email — cannot send shipped notification.",
    });
  }

  const lines = linesFromMetadata(session.metadata ?? null);

  // ---- Render + send -----------------------------------------------------
  const fromEmail = process.env.ESTATE_FROM_EMAIL || DEFAULT_FROM;
  const bccEmail = process.env.ESTATE_BCC_EMAIL || DEFAULT_BCC;
  const dispatchedAt = formatDispatchedAt(new Date());
  const orderRef = session.id.slice(0, 18) + "…";

  try {
    const resend = new Resend(resendKey);
    const html = await render(
      OrderShipped({
        buyerName,
        orderRef,
        lines,
        carrier,
        trackingUrl,
        dispatchedAt,
        estateEmail: DEFAULT_FROM,
      }),
    );

    const sendResult = await resend.emails.send({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: [buyerEmail],
      bcc:
        bccEmail && bccEmail.toLowerCase() !== fromEmail.toLowerCase()
          ? [bccEmail]
          : undefined,
      replyTo: DEFAULT_FROM,
      subject: "Your Stephen Meakin print has shipped",
      html,
    });

    if (sendResult.error) {
      console.error("[admin/order-shipped] Resend send error:", sendResult.error);
      return json(500, { error: "Email send failed — see Vercel logs." });
    }

    console.log("[admin/order-shipped] shipped email sent", {
      session_id: session.id,
      to: buyerEmail,
      carrier,
      resend_id: sendResult.data?.id,
    });

    return json(200, { ok: true, sent_to: buyerEmail });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/order-shipped] failed:", message);
    return json(500, { error: message });
  }
}
