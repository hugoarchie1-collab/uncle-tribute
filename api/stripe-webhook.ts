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

import type { IncomingMessage } from "node:http";
import Stripe from "stripe";
import { Resend } from "resend";

// NOTE: this function is intentionally SELF-CONTAINED — no imports from ./_lib
// or /src. Vercel's @vercel/node builder compiles only the entrypoint and does
// NOT bundle sibling local .ts/.tsx files into the lambda — they crash at cold
// start with ERR_MODULE_NOT_FOUND (verified on preview 2026-05-30; gotcha #5 in
// CLAUDE.md). The thank-you-code minter and the order-confirmation email
// renderer are therefore inlined below — mirrors of api/_lib/thankYouCode.ts +
// api/_lib/emails/OrderConfirmation.tsx (+ ./styles.ts). Keep them in sync.

// CRITICAL: disable Vercel's automatic body parsing. Stripe webhook signature
// verification must run against the EXACT raw bytes Stripe signed; the Node
// runtime's auto JSON-parse rewrites those bytes (key ordering, whitespace)
// and the signature check fails. With bodyParser off, req.body is undefined
// and we read the raw stream ourselves via readRawBody() below.
export const config = { api: { bodyParser: false } };

// Minimal structural types for Vercel's Node (req, res) handler signature.
// We use the Node signature — NOT the Web Request/Response one — because the
// Web handler's returned Response was not being delivered in this project's
// Vercel runtime: requests hung with a "default export return" warning and
// never replied (status "-"). The Node signature with res.json()/res.send()
// always delivers. Typed inline to keep the file self-contained (gotcha #5);
// the type-only IncomingMessage import is a Node built-in (not a /src import),
// so gotcha #5 is respected. We intersect with IncomingMessage so the handler
// req is async-iterable for the raw-body read. Node lowercases header names.
interface VercelReqBase {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}
type VercelReq = VercelReqBase & IncomingMessage;
interface VercelRes {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
  send: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
}

// Read the raw, unparsed request body off the Node stream. Stripe's
// constructEvent needs these exact bytes to verify the signature.
async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// ---------------------------------------------------------------------------
// In-memory event-id deduplication
// ---------------------------------------------------------------------------
// Vercel serverless functions are short-lived (warm instances last minutes,
// not hours) and may be replicated across regions — so this is BEST-EFFORT
// only. It catches the common case where Stripe retries the same event
// within seconds of a network blip, while a warm instance is still in
// memory. The complete fix needs a shared store (Vercel KV or Stripe's own
// idempotency keys logged to a DB) — flagged as P2 in CLAUDE.md.
//
// We bound the set's size + age so a long-running warm instance can't grow
// the set unboundedly under attack.
const SEEN_EVENT_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const SEEN_EVENT_MAX = 5000;
const seenEvents = new Map<string, number>();
const cleanSeenEvents = () => {
  const cutoff = Date.now() - SEEN_EVENT_TTL_MS;
  for (const [id, t] of seenEvents) {
    if (t < cutoff) seenEvents.delete(id);
  }
  // Hard cap: if we somehow still have too many, drop the oldest insertions.
  if (seenEvents.size > SEEN_EVENT_MAX) {
    const drop = seenEvents.size - SEEN_EVENT_MAX;
    let i = 0;
    for (const id of seenEvents.keys()) {
      if (i >= drop) break;
      seenEvents.delete(id);
      i += 1;
    }
  }
};

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
  // Per-line add-on prices, formatted GBP — only present when the add-on
  // applies on this tier AND was purchased, so the email can itemise the
  // framing / hand-finishing charge on its own sub-line and the per-line
  // breakdown sums to the grand Total.
  framingPrice?: string;
  embellishPrice?: string;
  // The base TIER price (formatted GBP) — the print itself, before add-ons.
  price: string;
}

// Per-tier price lookup (mirror of api/checkout.ts TIERS — keep in sync,
// gotcha #9). Used to render per-line prices in the confirmation email
// without trusting Stripe to split a total across lines.
const TIER_PRICE_PENCE: Record<string, number> = {
  atelier: 24500,
  collector: 45000,
  "atelier-grande": 85000,
  heirloom: 175000,
  studio: 245000,
};
const TIER_LABEL: Record<string, string> = {
  atelier: "Gallery Edition",
  collector: "Collector's Edition",
  "atelier-grande": "Atelier Edition",
  heirloom: "Heirloom Edition",
  studio: "Original — One of One",
};
const TIER_SIZE: Record<string, string> = {
  atelier: "A3 (29.7 × 42 cm)",
  collector: "A2 (42 × 59.4 cm)",
  "atelier-grande": "A1 (59.4 × 84.1 cm)",
  heirloom: "A0 (84.1 × 118.9 cm)",
  studio: "A1 (59.4 × 84.1 cm)",
};
const TIER_EDITION: Record<string, string> = {
  atelier: "Limited edition of 150",
  collector: "Limited edition of 100",
  "atelier-grande": "Limited edition of 50",
  heirloom: "Limited edition of 25",
  studio: "Unique — one of one",
};
// Per-tier ADD-ON price lookups (mirror of framingPricePence /
// embellishmentPricePence in src/data/paintings.ts PRINT_TIERS +
// api/checkout.ts TIERS + api/email-basket.ts TIERS — gotcha #9; keep all
// four in sync). Only A2 (collector) + A1 (atelier-grande) carry add-ons;
// A3 / A0 / studio one-off have none. Used to itemise the framing /
// hand-finishing charge as its own email sub-line so the per-line
// breakdown sums to the grand Total (session.amount_total).
const TIER_FRAMING_PENCE: Record<string, number> = {
  collector: 29500,
  "atelier-grande": 39500,
};
const TIER_EMBELLISH_PENCE: Record<string, number> = {
  collector: 35000,
  "atelier-grande": 49500,
};

const linesFromMetadata = (
  m: Stripe.Metadata | null,
  amountSubtotal: number | null | undefined,
): EmailLine[] => {
  if (!m) return [];
  // Single-item shape
  if (m.painting_title && !m.painting_titles) {
    const tierId = m.tier_id || "collector";
    const framing = m.framing === "yes";
    const embellished = m.embellished === "yes";
    return [
      {
        title: m.painting_title,
        colourway: m.colourway_name || "Original",
        tierLabel: TIER_LABEL[tierId] ?? m.tier_label,
        editionLabel: TIER_EDITION[tierId],
        size: TIER_SIZE[tierId] ?? m.size ?? "Limited edition giclée print",
        framing,
        embellished,
        // Itemise the add-on only when it applies on this tier AND was bought
        // (the tier lookup is undefined on A3 / A0 / studio, so framingPrice /
        // embellishPrice stay absent and no sub-line renders).
        framingPrice:
          framing && tierId in TIER_FRAMING_PENCE
            ? formatGBP(TIER_FRAMING_PENCE[tierId])
            : undefined,
        embellishPrice:
          embellished && tierId in TIER_EMBELLISH_PENCE
            ? formatGBP(TIER_EMBELLISH_PENCE[tierId])
            : undefined,
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
    const framing = framingFlags[idx] === "y";
    const embellished = embellishedFlags[idx] === "y";
    return {
      title,
      colourway: colourways[idx] || "Original",
      tierLabel: TIER_LABEL[tierId],
      editionLabel: TIER_EDITION[tierId],
      size: TIER_SIZE[tierId] ?? "Limited edition giclée print",
      framing,
      embellished,
      // Itemise the add-on only when it applies on this tier AND was bought.
      framingPrice:
        framing && tierId in TIER_FRAMING_PENCE
          ? formatGBP(TIER_FRAMING_PENCE[tierId])
          : undefined,
      embellishPrice:
        embellished && tierId in TIER_EMBELLISH_PENCE
          ? formatGBP(TIER_EMBELLISH_PENCE[tierId])
          : undefined,
      price: formatGBP(TIER_PRICE_PENCE[tierId] ?? null),
    };
  });
};

// ---------------------------------------------------------------------------
// Inlined thank-you-code minter (mirror of api/_lib/thankYouCode.ts — gotcha #5)
// ---------------------------------------------------------------------------
interface ThankYouCode {
  code: string;
  valueLabel: string;
  expiresLabel: string;
}
const THANKYOU_PERCENT = 10;
const THANKYOU_VALID_DAYS = 365;
const THANKYOU_PREFIX = "FRIENDS";
const THANKYOU_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const thankYouSuffix = (length = 6): string => {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += THANKYOU_ALPHABET[Math.floor(Math.random() * THANKYOU_ALPHABET.length)];
  }
  return out;
};
const createThankYouCode = async (
  stripe: Stripe,
  { sessionId, buyerEmail }: { sessionId: string; buyerEmail: string | null },
): Promise<ThankYouCode> => {
  const expiresAt = new Date(Date.now() + THANKYOU_VALID_DAYS * 24 * 60 * 60 * 1000);
  const expiresUnix = Math.floor(expiresAt.getTime() / 1000);
  const coupon = await stripe.coupons.create({
    percent_off: THANKYOU_PERCENT,
    duration: "once",
    max_redemptions: 1,
    redeem_by: expiresUnix,
    name: `Estate thank-you — ${sessionId.slice(0, 14)}`,
    metadata: { kind: "thank_you", session_id: sessionId, buyer_email: buyerEmail ?? "" },
  });
  let promoErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = `${THANKYOU_PREFIX}-${thankYouSuffix()}`;
    try {
      await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: coupon.id },
        code,
        max_redemptions: 1,
        expires_at: expiresUnix,
        metadata: { kind: "thank_you", session_id: sessionId, buyer_email: buyerEmail ?? "" },
      });
      return {
        code,
        valueLabel: `${THANKYOU_PERCENT}%`,
        expiresLabel: expiresAt.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };
    } catch (err) {
      promoErr = err;
      const message = err instanceof Error ? err.message : "";
      if (!message.includes("code_already_exists") && !message.includes("already exists")) break;
    }
  }
  throw promoErr instanceof Error
    ? promoErr
    : new Error("Failed to create thank-you promotion code.");
};

// ---------------------------------------------------------------------------
// Inlined order-confirmation email → HTML string (mirror of
// api/_lib/emails/OrderConfirmation.tsx + ./styles.ts — gotcha #5)
// ---------------------------------------------------------------------------
const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const SANS = `"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif`;
const DISPLAY = `"Playfair Display",Georgia,"Times New Roman",serif`;

const renderOrderConfirmationHtml = (p: {
  buyerName?: string | null;
  orderRef: string;
  lines: EmailLine[];
  total: string;
  thankYouCode: string;
  thankYouValue: string;
  thankYouExpiry: string;
  estateEmail: string;
}): string => {
  const first = (() => {
    const t = (p.buyerName ?? "").trim();
    return t ? esc(t.split(/\s+/)[0]) : "there";
  })();
  const ESTATE = {
    stamp: "Estate-stamped by The Mandala Company",
    numbering: "Hand-numbered within the edition",
    coa: "Ships with a Certificate of Authenticity on estate letterhead",
    printer: "Printed at Point 101, London — the UK's leading giclée print atelier",
  };
  // Mirror of EMBELLISHMENT_NOTE in src/data/paintings.ts (gotcha #9 — the
  // add-on wording lives in several places). Lead time is "up to two weeks"
  // (reduced from 4 weeks 2026-06-04); keep in sync with api/checkout.ts +
  // PaintingDetail FINISH_LEAD_WEEKS.
  const EMBELLISH =
    "Hand-finished in Stephen's geometric tradition by Polly Wedge (estate). Allow up to two weeks.";
  const s = {
    page: `background-color:#0a0908;margin:0;padding:32px 16px;font-family:${SANS};color:#ede6d6;`,
    shell: `max-width:560px;margin:0 auto;background-color:#0a0908;padding:0;`,
    eyebrow: `font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.34em;text-transform:uppercase;color:#c97844;margin:0 0 18px 0;`,
    heading: `font-family:${DISPLAY};font-weight:700;letter-spacing:-0.02em;font-size:36px;line-height:1.1;color:#ede6d6;margin:0 0 24px 0;`,
    subheading: `font-family:${DISPLAY};font-weight:700;letter-spacing:-0.01em;font-size:20px;line-height:1.25;color:#ede6d6;margin:32px 0 12px 0;`,
    body: `font-family:${SANS};font-size:15px;line-height:1.7;color:rgba(237,230,214,0.78);margin:0 0 16px 0;`,
    small: `font-family:${SANS};font-size:12px;line-height:1.65;color:rgba(237,230,214,0.55);margin:0 0 10px 0;`,
    divider: `border:0;border-top:1px solid rgba(237,230,214,0.18);margin:28px 0;`,
    card: `background-color:#15120f;border:1px solid rgba(237,230,214,0.18);border-radius:4px;padding:20px 22px;margin:20px 0;`,
    giftCard: `background-color:#15120f;border:1px solid #c97844;border-radius:4px;padding:24px 22px;margin:28px 0;text-align:center;`,
    code: `font-family:"SF Mono","Menlo","Consolas",monospace;font-size:22px;font-weight:600;letter-spacing:0.22em;color:#c97844;margin:8px 0 12px 0;display:block;`,
    meta: `font-family:${SANS};font-size:12px;color:rgba(237,230,214,0.55);margin:0;`,
    signoff: `font-family:${DISPLAY};font-style:italic;font-size:16px;color:#ede6d6;margin:24px 0 4px 0;`,
    footer: `font-family:${SANS};font-size:11px;line-height:1.7;color:rgba(237,230,214,0.55);text-align:center;margin:32px 0 0 0;`,
    link: `color:#c97844;text-decoration:underline;`,
  };
  const lineHtml = p.lines
    .map((line, idx) => {
      const tierBits = [line.tierLabel, line.size.split(" ")[0], line.editionLabel]
        .filter(Boolean)
        .join(" · ");
      // Per-line breakdown: the print (base tier price) on its own row, then
      // each purchased add-on as its OWN clearly-labelled + priced sub-line, so
      // the line's rows sum to what was charged for it and the whole email's
      // per-line breakdown sums to the grand Total. The add-on prices mirror
      // paintings.ts / api/checkout.ts / api/email-basket.ts (gotcha #9).
      const priceRow = (label: string, value: string, sub?: string) =>
        `<p style="${s.meta}margin-top:6px;color:#ede6d6;">`
        + `<span style="color:rgba(237,230,214,0.78);">${label}</span>`
        + ` &nbsp;·&nbsp; <strong style="color:#ede6d6;">${esc(value)}</strong>`
        + (sub ? `<br/><span style="color:rgba(237,230,214,0.55);">${sub}</span>` : "")
        + `</p>`;
      return `<div style="margin-top:${idx === 0 ? 0 : 14}px;padding-top:${idx === 0 ? 0 : 14}px;border-top:${idx === 0 ? "0" : "1px solid rgba(237,230,214,0.18)"};">`
        + `<p style="font-family:${SANS};font-size:14px;line-height:1.55;margin:0 0 4px 0;"><strong style="color:#ede6d6;">${esc(line.title)}</strong> — <span style="color:rgba(237,230,214,0.78);">${esc(line.colourway)}</span></p>`
        + (tierBits ? `<p style="font-family:${SANS};color:#c97844;letter-spacing:0.18em;text-transform:uppercase;font-size:10px;font-weight:700;margin:4px 0 0 0;">${esc(tierBits)}</p>` : "")
        + `<p style="${s.meta}margin-top:4px;">${esc(line.size)}</p>`
        + priceRow("Print", line.price)
        + (line.framing && line.framingPrice
            ? priceRow("Hand-finished frame", line.framingPrice)
            : "")
        + (line.embellished && line.embellishPrice
            ? priceRow("Hand-finished by Polly Wedge", line.embellishPrice, EMBELLISH)
            : "")
        + `</div>`;
    })
    .join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="dark only"/><title>Your print is on its way — The Art of Stephen Meakin</title></head>`
    + `<body style="${s.page}"><div style="${s.shell}">`
    + `<p style="${s.eyebrow}">The Mandala Company · The estate of Stephen Meakin</p>`
    + `<h1 style="${s.heading}">Thank you, ${first}.</h1>`
    + `<p style="${s.body}">Your order for an estate-stamped giclée from <em>The Art of Stephen Meakin</em> has been received. Each print is individually made to order at Point 101 in London, the UK's leading giclée print atelier, and dispatched within <strong style="color:#ede6d6;">seven to ten working days</strong>. You'll hear from us again when it ships, with a tracking link.</p>`
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.eyebrow}">Your order</p>`
    + `<div style="${s.card}">${lineHtml}`
    + `<hr style="border:0;border-top:1px solid rgba(237,230,214,0.18);margin:18px 0 12px 0;"/>`
    + `<p style="font-family:${SANS};font-size:14px;margin:0;"><span style="color:rgba(237,230,214,0.55);letter-spacing:0.18em;font-size:11px;text-transform:uppercase;font-weight:700;">Total (incl. shipping)</span> &nbsp; <strong style="color:#ede6d6;font-size:16px;">${esc(p.total)}</strong></p>`
    + `</div>`
    + `<p style="${s.eyebrow}margin-top:28px;">Authentication</p>`
    + `<div style="${s.card}">`
    + `<p style="${s.meta}color:#ede6d6;margin-bottom:8px;">· ${ESTATE.stamp}</p>`
    + `<p style="${s.meta}color:#ede6d6;margin-bottom:8px;">· ${ESTATE.numbering}</p>`
    + `<p style="${s.meta}color:#ede6d6;margin-bottom:8px;">· ${ESTATE.coa}</p>`
    + `<p style="${s.meta}color:rgba(237,230,214,0.78);">· ${ESTATE.printer}</p>`
    + `</div>`
    + `<div style="${s.giftCard}">`
    + `<p style="${s.eyebrow}color:rgba(237,230,214,0.55);margin:0 0 14px 0;">A note from the estate</p>`
    + `<p style="${s.body}color:#ede6d6;margin:0 0 14px 0;">In thanks for being among the first to take one of Steve's prints into your home, please accept ${esc(p.thankYouValue)} towards a future print, with our warmth.</p>`
    + `<code style="${s.code}">${esc(p.thankYouCode)}</code>`
    + `<p style="${s.small}margin:0;">Apply at checkout. Valid for one year — until ${esc(p.thankYouExpiry)}.</p>`
    + `</div>`
    + `<h2 style="${s.subheading}">What happens next</h2>`
    + `<p style="${s.body}">We'll place your print with Point 101 in the next working day, and notify you the moment it leaves the studio. If anything about the colourway or sizing needs another look, just reply to this email — we read everything ourselves.</p>`
    + `<p style="${s.signoff}">With love from the estate,</p>`
    + `<p style="${s.body}font-style:italic;margin:0;">— Archie, for The Mandala Company</p>`
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.footer}">Questions, or anything to flag — <a href="mailto:${esc(p.estateEmail)}" style="${s.link}">${esc(p.estateEmail)}</a><br/>Returns, refunds &amp; damages — <a href="https://themandalacompany.com/returns" style="${s.link}">themandalacompany.com/returns</a><br/>Reference: ${esc(p.orderRef)}<br/>The Art of Stephen Meakin · Lewes, East Sussex</p>`
    + `</div></body></html>`;
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: VercelReq, res: VercelRes) {
  // Local response helpers — write to res so the Node runtime actually
  // delivers the reply (a returned Response was not being delivered here).
  // Stripe only needs a 2xx body; a 4xx/5xx triggers retries.
  const ok = (msg: unknown = { received: true }) => {
    if (typeof msg === "string") res.status(200).send(msg);
    else res.status(200).json(msg);
  };
  const bad = (msg: string) => res.status(400).send(msg);

  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    // 500, not 400 — server config issue. Stripe stops retrying 5xxs faster
    // than it stops retrying 400s, so we don't spam the log forever.
    res
      .status(500)
      .send("Server is missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET.");
    return;
  }

  // Node lowercases header names; the value is string | string[] | undefined.
  const sigHeader = req.headers["stripe-signature"];
  const sig = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;
  if (!sig) return bad("Missing stripe-signature header.");

  const stripe = new Stripe(secret);
  // Read the RAW bytes Stripe signed — bodyParser is disabled (see config
  // above) so req.body is unavailable and would have been corrupted anyway.
  const rawBody = await readRawBody(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed.";
    return bad(`Webhook signature verification failed: ${message}`);
  }

  // ---- Event-id deduplication ---------------------------------------------
  // If we've already seen this exact Stripe event id on this warm instance,
  // return 200 immediately without re-running side effects (Resend send,
  // coupon mint). Stripe will stop retrying once it gets a 200.
  cleanSeenEvents();
  if (seenEvents.has(event.id)) {
    console.log("[stripe-webhook] duplicate event id, skipping", {
      event_id: event.id,
      type: event.type,
    });
    return ok();
  }
  seenEvents.set(event.id, Date.now());

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
        const html = renderOrderConfirmationHtml({
          buyerName,
          orderRef: session.id.slice(0, 18) + "…",
          lines,
          total: formatGBP(session.amount_total),
          thankYouCode: thankYou.code,
          thankYouValue: thankYou.valueLabel,
          thankYouExpiry: thankYou.expiresLabel,
          estateEmail: DEFAULT_FROM,
        });

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
