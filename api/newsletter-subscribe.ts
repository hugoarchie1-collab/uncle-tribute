/**
 * POST /api/newsletter-subscribe
 *
 * Adds a friend to the estate list. Validates the payload, optionally mints
 * a single-use Stripe promotion code (the "first edition" thank-you — same
 * register as the post-purchase email but smaller), and sends a Welcome
 * email via Resend.
 *
 * Request body:
 *   { name?: string, email: string, source?: string }
 *
 * Response 200: { ok: true }                — always 200 on validation pass,
 *                                              even if downstream fails. The
 *                                              UI shows a soft success either
 *                                              way; truth lives in Vercel logs.
 *          400: { error: string }           — validation failure
 *          405 / 500                         — method / server config
 *
 * Storage: we do NOT persist subscribers in this file — there is no database
 * in this project (gotcha: Vercel free tier, no Postgres). Subscribers live
 * in Resend's Audiences feature if Hugo enables it (see below), in his Inbox
 * (BCC every welcome), and in the Vercel function logs. This is enough for
 * an estate with 10–100 friends/quarter; if Hugo wants real lifecycle
 * management later, swap to Resend Audiences or wire a database.
 *
 * Resend Audiences (optional next step for Hugo):
 *   Resend Dashboard → Audiences → create one called "Friends of the estate"
 *   → copy its audience id → set RESEND_AUDIENCE_ID env var. This file will
 *   then ALSO add the contact to the audience via resend.contacts.create()
 *   so unsubscribes flow back through Resend's link headers. Optional — the
 *   welcome email goes out either way.
 *
 * Required env vars: none — endpoint stays silent and 200s if everything is
 * missing (a deliberate "ship without scaring buyers" choice). Optional:
 *   RESEND_API_KEY            – if missing, email is skipped silently
 *   ESTATE_FROM_EMAIL         – default info@themandalacompany.com
 *   ESTATE_BCC_EMAIL          – default info@themandalacompany.com
 *   SITE_URL                  – used in welcome-email CTA, default the prod URL
 *   STRIPE_SECRET_KEY         – if present, mints a single-use Stripe promo
 *                               code for the subscriber. If missing, omits the
 *                               gift card from the welcome email.
 *   NEWSLETTER_DISCOUNT_PCT   – default 10 (matches post-purchase thank-you)
 *   RESEND_AUDIENCE_ID        – if present, adds contact to Resend Audience
 *
 * Self-contained — imports only from /api/_lib (same Vercel bundle) and
 * top-level node_modules. No /src imports (gotcha #5 in CLAUDE.md).
 */

import Stripe from "stripe";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { WelcomeEmail } from "./_lib/emails/Welcome.js";

const DEFAULT_FROM = "info@themandalacompany.com";
const DEFAULT_BCC = "info@themandalacompany.com";
const FROM_NAME = "The Mandala Company";
const DEFAULT_SITE_URL = "https://uncle-tribute.vercel.app";

// ---- Origin allowlist ----------------------------------------------------
// Echo the request's `Origin` back only if it's one of our known surfaces or
// a Vercel preview. Anything else gets the canonical production origin so
// browser-side fetches from random domains are rejected cleanly. The
// underlying handler still runs (Stripe Webhook etc. don't honour CORS),
// but cross-origin browser POSTs from a hostile site won't be accepted by
// the user's browser.
const ALLOWED_ORIGINS = new Set([
  "https://uncle-tribute.vercel.app",
  "https://themandalacompany.com",
  "https://www.themandalacompany.com",
]);
const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    return new URL(origin).hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
};
const corsHeaders = (origin: string | null): Record<string, string> => {
  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  if (isAllowedOrigin(origin)) {
    base["Access-Control-Allow-Origin"] = origin as string;
  } else {
    base["Access-Control-Allow-Origin"] = "https://uncle-tribute.vercel.app";
  }
  return base;
};

const json = (status: number, body: unknown, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });

// Same dignified register as the post-purchase code: prefix + unguessable
// suffix from a no-ambiguous-glyphs alphabet (no 0/O/1/I).
const CODE_PREFIX = "FRIENDS";
const SUFFIX_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SUFFIX_LENGTH = 6;
const VALID_DAYS = 365;

const randomSuffix = (length = SUFFIX_LENGTH): string => {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += SUFFIX_ALPHABET[Math.floor(Math.random() * SUFFIX_ALPHABET.length)];
  }
  return out;
};

const formatExpiryDate = (date: Date): string =>
  date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

interface SubscriberCode {
  code: string;
  valueLabel: string;
  expiresLabel: string;
}

/**
 * Mint a single-use coupon + promotion code for a new subscriber. Mirrors
 * the recipe in api/_lib/thankYouCode.ts but tuned for sign-up rather than
 * post-purchase (different `kind` metadata for dashboard filtering, smaller
 * default percent if Hugo dials NEWSLETTER_DISCOUNT_PCT down later).
 */
const mintSubscriberCode = async (
  stripe: Stripe,
  email: string,
): Promise<SubscriberCode> => {
  const percent = Math.max(
    1,
    Math.min(50, Number(process.env.NEWSLETTER_DISCOUNT_PCT) || 10),
  );
  const expiresAt = new Date(Date.now() + VALID_DAYS * 24 * 60 * 60 * 1000);
  const expiresUnix = Math.floor(expiresAt.getTime() / 1000);

  const coupon = await stripe.coupons.create({
    percent_off: percent,
    duration: "once",
    max_redemptions: 1,
    redeem_by: expiresUnix,
    name: `Estate friends — ${email.slice(0, 32)}`,
    metadata: {
      kind: "newsletter_welcome",
      subscriber_email: email,
    },
  });

  // Up to 3 retries on code collision (same as thankYouCode.ts).
  let promoErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = `${CODE_PREFIX}-${randomSuffix()}`;
    try {
      await stripe.promotionCodes.create({
        coupon: coupon.id,
        code,
        max_redemptions: 1,
        expires_at: expiresUnix,
        metadata: {
          kind: "newsletter_welcome",
          subscriber_email: email,
        },
      });
      return {
        code,
        valueLabel: `${percent}%`,
        expiresLabel: formatExpiryDate(expiresAt),
      };
    } catch (err) {
      promoErr = err;
      const message = err instanceof Error ? err.message : "";
      if (
        !message.includes("code_already_exists") &&
        !message.includes("already exists")
      ) {
        break;
      }
    }
  }
  throw promoErr instanceof Error
    ? promoErr
    : new Error("Failed to create subscriber promotion code.");
};

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

export default async function handler(req: Request) {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, origin);

  let body: { name?: string; email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." }, origin);
  }

  const name = (body.name ?? "").toString().trim().slice(0, 120);
  const email = (body.email ?? "").toString().trim().toLowerCase();
  const source = (body.source ?? "panel").toString().trim().slice(0, 32);

  if (!email || !isValidEmail(email)) {
    return json(400, { error: "Please provide a valid email." }, origin);
  }

  // Audit trail — always log even if downstream sends are skipped. Hugo can
  // grep Vercel logs for "[newsletter-subscribe]" to see his list grow.
  console.log("[newsletter-subscribe] sign-up", { email, name, source });

  // ---- Optional: mint subscriber thank-you code ---------------------------
  let subscriberCode: SubscriberCode | null = null;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    try {
      const stripe = new Stripe(stripeKey);
      subscriberCode = await mintSubscriberCode(stripe, email);
      console.log("[newsletter-subscribe] welcome code minted", {
        email,
        code: subscriberCode.code,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[newsletter-subscribe] code mint failed:", message);
      subscriberCode = null;
    }
  }

  // ---- Optional: add to Resend Audience ----------------------------------
  const resendKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (resendKey && audienceId) {
    try {
      const resend = new Resend(resendKey);
      const split = name.split(/\s+/);
      await resend.contacts.create({
        email,
        firstName: split[0] || undefined,
        lastName: split.slice(1).join(" ") || undefined,
        unsubscribed: false,
        audienceId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[newsletter-subscribe] audience add failed:", message);
    }
  }

  // ---- Send the welcome email --------------------------------------------
  if (!resendKey) {
    console.warn(
      "[newsletter-subscribe] RESEND_API_KEY missing — skipping welcome email.",
    );
    return json(200, { ok: true }, origin);
  }

  try {
    const fromEmail = process.env.ESTATE_FROM_EMAIL || DEFAULT_FROM;
    const bccEmail = process.env.ESTATE_BCC_EMAIL || DEFAULT_BCC;
    const siteUrl = process.env.SITE_URL || DEFAULT_SITE_URL;
    const resend = new Resend(resendKey);

    const html = await render(
      WelcomeEmail({
        subscriberName: name || null,
        estateEmail: DEFAULT_FROM,
        collectionsUrl: `${siteUrl.replace(/\/$/, "")}/collections`,
        thankYouCode: subscriberCode?.code,
        thankYouValue: subscriberCode?.valueLabel,
        thankYouExpiry: subscriberCode?.expiresLabel,
      }),
    );

    const sendResult = await resend.emails.send({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: [email],
      bcc:
        bccEmail && bccEmail.toLowerCase() !== fromEmail.toLowerCase()
          ? [bccEmail]
          : undefined,
      replyTo: DEFAULT_FROM,
      subject: "Welcome to the friends of the estate",
      html,
    });

    if (sendResult.error) {
      console.error("[newsletter-subscribe] Resend send error:", sendResult.error);
    } else {
      console.log("[newsletter-subscribe] welcome email sent", {
        email,
        resend_id: sendResult.data?.id,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[newsletter-subscribe] welcome email failed:", message);
  }

  return json(200, { ok: true }, origin);
}
