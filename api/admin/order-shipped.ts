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
 * Self-contained per gotcha #5 — imports ONLY npm packages + node: builtins,
 * no local sibling files (Vercel doesn't bundle local /api imports); the
 * shipped-email renderer is inlined below.
 *
 * Usage (curl):
 *   curl -X POST https://themandalacompany.com/api/admin/order-shipped \
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

// NOTE: this function is intentionally SELF-CONTAINED — no imports from ./_lib
// or /src. Vercel's @vercel/node builder compiles only the entrypoint and does
// NOT bundle sibling local .ts/.tsx files into the lambda — they crash at cold
// start with ERR_MODULE_NOT_FOUND (verified on preview 2026-05-30; gotcha #5 in
// CLAUDE.md). The order-shipped email renderer is therefore inlined below — a
// mirror of api/_lib/emails/OrderShipped.tsx (+ ./styles.ts). Keep them in sync.

const DEFAULT_FROM = "info@themandalacompany.com";
const DEFAULT_BCC = "info@themandalacompany.com";
const FROM_NAME = "The Mandala Company";

// Minimal structural types for Vercel's Node (req, res) handler signature.
// We use the Node signature — NOT the Web Request/Response one — because the
// Web handler's returned Response was not being delivered in this project's
// Vercel runtime: requests hung with a "default export return" warning and
// never replied (status "-"), tripping the client's timeout. The Node
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

// ---------------------------------------------------------------------------
// Inlined order-shipped email → HTML string (mirror of
// api/_lib/emails/OrderShipped.tsx + ./styles.ts — gotcha #5)
// ---------------------------------------------------------------------------
const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const SANS = `"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif`;
const DISPLAY = `"Playfair Display",Georgia,"Times New Roman",serif`;

const renderOrderShippedHtml = (p: {
  buyerName?: string | null;
  orderRef: string;
  lines: ShippedLine[];
  carrier: string;
  trackingUrl: string;
  dispatchedAt: string;
  estateEmail: string;
}): string => {
  const first = (() => {
    const t = (p.buyerName ?? "").trim();
    return t ? esc(t.split(/\s+/)[0]) : "there";
  })();
  const s = {
    page: `background-color:#0a0908;margin:0;padding:32px 16px;font-family:${SANS};color:#ede6d6;`,
    shell: `max-width:560px;margin:0 auto;background-color:#0a0908;padding:0;`,
    eyebrow: `font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.34em;text-transform:uppercase;color:#c97844;margin:0 0 18px 0;`,
    heading: `font-family:${DISPLAY};font-weight:700;letter-spacing:-0.02em;font-size:36px;line-height:1.1;color:#ede6d6;margin:0 0 24px 0;`,
    body: `font-family:${SANS};font-size:15px;line-height:1.7;color:rgba(237,230,214,0.78);margin:0 0 16px 0;`,
    small: `font-family:${SANS};font-size:12px;line-height:1.65;color:rgba(237,230,214,0.55);margin:0 0 10px 0;`,
    divider: `border:0;border-top:1px solid rgba(237,230,214,0.18);margin:28px 0;`,
    card: `background-color:#15120f;border:1px solid rgba(237,230,214,0.18);border-radius:4px;padding:20px 22px;margin:20px 0;`,
    giftCard: `background-color:#15120f;border:1px solid #c97844;border-radius:4px;padding:24px 22px;margin:28px 0;text-align:left;`,
    orderRow: `font-family:${SANS};font-size:14px;line-height:1.55;color:#ede6d6;`,
    signoff: `font-family:${DISPLAY};font-style:italic;font-size:16px;color:#ede6d6;margin:24px 0 4px 0;`,
    footer: `font-family:${SANS};font-size:11px;line-height:1.7;color:rgba(237,230,214,0.55);text-align:center;margin:32px 0 0 0;`,
    link: `color:#c97844;text-decoration:underline;`,
  };
  const lineHtml = p.lines
    .map(
      (line, idx) =>
        `<p style="${s.orderRow}margin:${idx === 0 ? "0" : "8px 0 0 0"};"><strong style="color:#ede6d6;">${esc(line.title)}</strong> — <span style="color:rgba(237,230,214,0.78);">${esc(line.colourway)}</span></p>`,
    )
    .join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="dark only"/><title>Your print has left the studio — The Art of Stephen Meakin</title></head>`
    + `<body style="${s.page}"><div style="${s.shell}">`
    + `<p style="${s.eyebrow}">The Mandala Company · The estate of Stephen Meakin</p>`
    + `<h1 style="${s.heading}">Your print is on its way, ${first}.</h1>`
    + `<p style="${s.body}">Your giclée left the atelier on <strong style="color:#ede6d6;">${esc(p.dispatchedAt)}</strong> via ${esc(p.carrier)}. You can follow it from here:</p>`
    + `<div style="${s.giftCard}">`
    + `<p style="${s.small}margin:0 0 8px 0;text-transform:uppercase;letter-spacing:0.18em;">Tracking</p>`
    + `<a href="${esc(p.trackingUrl)}" style="${s.link}font-size:15px;">${esc(p.trackingUrl)}</a>`
    + `</div>`
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.eyebrow}">What's shipped</p>`
    + `<div style="${s.card}">${lineHtml}</div>`
    + `<p style="${s.body}">Each print is packed in archival tissue and shipped in a rigid mailer for protection. UK orders typically arrive within 2–3 working days, European orders within 5–7, and rest-of-world within 7–14 — your tracking link above will show the carrier's own ETA. Once it lands, the colourway will settle into the paper over the first few days — give it light, air, and a wall it'll be loved on.</p>`
    + `<p style="${s.signoff}">With warmth,</p>`
    + `<p style="${s.body}font-style:italic;margin:0;">— Archie, for The Mandala Company</p>`
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.footer}">Anything not quite right — <a href="mailto:${esc(p.estateEmail)}" style="${s.link}">${esc(p.estateEmail)}</a><br/>Reference: ${esc(p.orderRef)}<br/>The Art of Stephen Meakin · Lewes, East Sussex</p>`
    + `</div></body></html>`;
};

export default async function handler(req: VercelReq, res: VercelRes) {
  // Local send helper — writes to res so the Node runtime actually delivers
  // the response (the old Response-returning json() helper did not).
  const send = (status: number, payload: unknown) => {
    res.status(status).json(payload);
  };

  if (req.method !== "POST") return send(405, { error: "Method not allowed" });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const adminKey = process.env.ADMIN_API_KEY;
  if (!stripeKey || !resendKey || !adminKey) {
    return send(500, {
      error:
        "Server is missing STRIPE_SECRET_KEY, RESEND_API_KEY or ADMIN_API_KEY.",
    });
  }

  // Vercel's Node runtime parses a JSON request body into req.body. Handle
  // both the parsed-object case and a raw-string fallback defensively.
  let body: {
    sessionId?: string;
    trackingUrl?: string;
    carrier?: string;
    secret?: string;
  };
  try {
    body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : ((req.body ?? {}) as typeof body);
  } catch {
    return send(400, { error: "Invalid JSON body." });
  }

  const sessionId = (body.sessionId ?? "").toString().trim();
  const trackingUrl = (body.trackingUrl ?? "").toString().trim();
  const carrier = (body.carrier ?? "").toString().trim();
  const secret = (body.secret ?? "").toString();

  // Auth — 401 (not 403) so it's obvious what went wrong if Hugo's curl
  // typo'd the secret.
  if (!secret || !safeEqual(secret, adminKey)) {
    return send(401, { error: "Unauthorised." });
  }

  if (!sessionId.startsWith("cs_")) {
    return send(400, { error: "sessionId must be a Stripe Checkout session id (cs_…)." });
  }
  if (!trackingUrl || !/^https?:\/\//.test(trackingUrl)) {
    return send(400, { error: "trackingUrl must be a http(s) URL." });
  }
  if (!carrier) {
    return send(400, { error: "carrier is required (e.g. 'Royal Mail Tracked 48')." });
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
    return send(404, { error: `Couldn't retrieve session: ${message}` });
  }

  const buyerEmail = session.customer_details?.email ?? null;
  const buyerName =
    session.customer_details?.name ??
    (session as unknown as { shipping_details?: { name?: string | null } })
      .shipping_details?.name ??
    null;

  if (!buyerEmail) {
    return send(400, {
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
    const html = renderOrderShippedHtml({
      buyerName,
      orderRef,
      lines,
      carrier,
      trackingUrl,
      dispatchedAt,
      estateEmail: DEFAULT_FROM,
    });

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
      return send(500, { error: "Email send failed — see Vercel logs." });
    }

    console.log("[admin/order-shipped] shipped email sent", {
      session_id: session.id,
      to: buyerEmail,
      carrier,
      resend_id: sendResult.data?.id,
    });

    return send(200, { ok: true, sent_to: buyerEmail });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/order-shipped] failed:", message);
    return send(500, { error: message });
  }
}
