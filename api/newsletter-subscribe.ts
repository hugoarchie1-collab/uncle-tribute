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
 *   Resend Dashboard → Audiences → create one called "Friends & Family"
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
 * Self-contained — imports ONLY npm packages + node: builtins, no local
 * sibling files. Vercel's @vercel/node builder doesn't bundle local /api
 * imports, so the welcome-email renderer is inlined below (gotcha #5).
 */

import Stripe from "stripe";
import { Resend } from "resend";

// NOTE: this function is intentionally SELF-CONTAINED — no imports from ./_lib
// or /src. Vercel's @vercel/node builder compiles only the entrypoint and does
// NOT bundle sibling local .ts/.tsx files into the lambda — they crash at cold
// start with ERR_MODULE_NOT_FOUND (verified on preview 2026-05-30; gotcha #5 in
// CLAUDE.md). The welcome-email renderer is therefore inlined below — a mirror
// of api/_lib/emails/Welcome.tsx (+ ./styles.ts). Keep them in sync.

const DEFAULT_FROM = "info@themandalacompany.com";
const DEFAULT_BCC = "info@themandalacompany.com";
const FROM_NAME = "The Mandala Company";
const DEFAULT_SITE_URL = "https://themandalacompany.com";

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
    base["Access-Control-Allow-Origin"] = "https://themandalacompany.com";
  }
  return base;
};

// Minimal structural types for Vercel's Node (req, res) handler signature.
// We use the Node signature — NOT the Web Request/Response one — because the
// Web handler's returned Response was not being delivered in this project's
// Vercel runtime: requests hung with a "default export return" warning and
// never replied (status "-"), tripping the client's timeout. The Node
// signature with res.json() always delivers. Typed inline to keep the file
// self-contained (gotcha #5) — no @vercel/node import; Vercel supplies the
// real objects at runtime. Node lowercases header names, so we read
// req.headers.origin (not get("origin")).
interface VercelReq {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}
interface VercelRes {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
}

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
    name: `Friends & Family — ${email.slice(0, 32)}`,
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
        promotion: { type: "coupon", coupon: coupon.id },
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

// ---------------------------------------------------------------------------
// Klaviyo (CRM / email flows) — BEST-EFFORT, ENV-GUARDED, SELF-CONTAINED.
// ---------------------------------------------------------------------------
// Klaviyo is the estate's marketing CRM (Welcome / abandoned-cart / post-
// purchase revenue flows). Resend stays the transactional sender — Klaviyo is
// purely additive here. This block is INLINED (gotcha #5: no /api local imports)
// and fully guarded on process.env.KLAVIYO_API_KEY: if the key is absent, every
// helper is a clean no-op so the site is unaffected until Hugo adds the key.
// Every call is wrapped in try/catch by the caller — a Klaviyo failure must
// NEVER break a newsletter signup.
//
// Uses the current Klaviyo REST API (auth header `Authorization: Klaviyo-API-Key
// <private_key>`, plus the dated `revision` header) via Node 18+ global fetch.
//   - Bulk Subscribe Profiles job: upserts the profile AND subscribes it to a
//     list (when KLAVIYO_LIST_ID is set) — powers the Welcome flow.
//   - Create/Update Profile: a plain upsert used when no list id is configured,
//     so a flow can still target the new profile.
const KLAVIYO_API_BASE = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2026-04-15";

const klaviyoHeaders = (apiKey: string): Record<string, string> => ({
  Authorization: `Klaviyo-API-Key ${apiKey}`,
  revision: KLAVIYO_REVISION,
  accept: "application/json",
  "content-type": "application/json",
});

/**
 * Upsert a profile AND subscribe it to a list via the bulk-subscribe job. This
 * single call both creates/updates the profile and records explicit email
 * marketing consent against the list — the cleanest way to feed the Welcome
 * flow. consented_at is set so Klaviyo logs the opt-in timestamp.
 */
const klaviyoSubscribeToList = async (
  apiKey: string,
  listId: string,
  email: string,
  name: string,
): Promise<void> => {
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || undefined;
  const lastName = parts.slice(1).join(" ") || undefined;
  const body = {
    data: {
      type: "profile-subscription-bulk-create-job",
      attributes: {
        profiles: {
          data: [
            {
              type: "profile",
              attributes: {
                email,
                ...(firstName ? { first_name: firstName } : {}),
                ...(lastName ? { last_name: lastName } : {}),
                subscriptions: {
                  email: { marketing: { consent: "SUBSCRIBED" } },
                },
              },
            },
          ],
        },
        historical_import: false,
      },
      relationships: {
        list: { data: { type: "list", id: listId } },
      },
    },
  };
  const resp = await fetch(
    `${KLAVIYO_API_BASE}/profile-subscription-bulk-create-jobs`,
    {
      method: "POST",
      headers: klaviyoHeaders(apiKey),
      body: JSON.stringify(body),
    },
  );
  // 202 Accepted is the success status for this async job. Treat a 409
  // (already queued/duplicate) as fine too.
  if (!resp.ok && resp.status !== 409) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Klaviyo subscribe job ${resp.status}: ${text.slice(0, 300)}`);
  }
};

/**
 * Plain create-or-update profile (no list). Used as the fallback when
 * KLAVIYO_LIST_ID is not configured so a flow can still target the profile.
 * The Create Profile endpoint returns 409 when the profile already exists —
 * which is a perfectly good outcome for our purposes, so we treat it as success.
 */
const klaviyoUpsertProfile = async (
  apiKey: string,
  email: string,
  name: string,
): Promise<void> => {
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || undefined;
  const lastName = parts.slice(1).join(" ") || undefined;
  const body = {
    data: {
      type: "profile",
      attributes: {
        email,
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
      },
    },
  };
  const resp = await fetch(`${KLAVIYO_API_BASE}/profiles`, {
    method: "POST",
    headers: klaviyoHeaders(apiKey),
    body: JSON.stringify(body),
  });
  // 201 created, 200 updated, 409 already exists — all acceptable.
  if (!resp.ok && resp.status !== 409) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Klaviyo profile upsert ${resp.status}: ${text.slice(0, 300)}`);
  }
};

// ---------------------------------------------------------------------------
// Inlined welcome email → HTML string (mirror of
// api/_lib/emails/Welcome.tsx + ./styles.ts — gotcha #5)
// ---------------------------------------------------------------------------
const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const SANS = `"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif`;
const DISPLAY = `"Playfair Display",Georgia,"Times New Roman",serif`;

const renderWelcomeHtml = (p: {
  subscriberName?: string | null;
  estateEmail: string;
  collectionsUrl: string;
  thankYouCode?: string;
  thankYouValue?: string;
  thankYouExpiry?: string;
}): string => {
  const first = (() => {
    const t = (p.subscriberName ?? "").trim();
    return t ? esc(t.split(/\s+/)[0]) : "there";
  })();
  const hasGift = !!(p.thankYouCode && p.thankYouValue && p.thankYouExpiry);
  const s = {
    page: `background-color:#0a0908;margin:0;padding:32px 16px;font-family:${SANS};color:#ede6d6;`,
    shell: `max-width:560px;margin:0 auto;background-color:#0a0908;padding:0;`,
    eyebrow: `font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.34em;text-transform:uppercase;color:#c97844;margin:0 0 18px 0;`,
    heading: `font-family:${DISPLAY};font-weight:700;letter-spacing:-0.02em;font-size:36px;line-height:1.1;color:#ede6d6;margin:0 0 24px 0;`,
    body: `font-family:${SANS};font-size:15px;line-height:1.7;color:rgba(237,230,214,0.78);margin:0 0 16px 0;`,
    small: `font-family:${SANS};font-size:12px;line-height:1.65;color:rgba(237,230,214,0.55);margin:0 0 10px 0;`,
    divider: `border:0;border-top:1px solid rgba(237,230,214,0.18);margin:28px 0;`,
    giftCard: `background-color:#15120f;border:1px solid #c97844;border-radius:4px;padding:24px 22px;margin:28px 0;text-align:center;`,
    code: `font-family:"SF Mono","Menlo","Consolas",monospace;font-size:22px;font-weight:600;letter-spacing:0.22em;color:#c97844;margin:8px 0 12px 0;display:block;`,
    signoff: `font-family:${DISPLAY};font-style:italic;font-size:16px;color:#ede6d6;margin:24px 0 4px 0;`,
    footer: `font-family:${SANS};font-size:11px;line-height:1.7;color:rgba(237,230,214,0.55);text-align:center;margin:32px 0 0 0;`,
    link: `color:#c97844;text-decoration:underline;`,
    cta: `display:inline-block;background-color:#ede6d6;color:#0a0908;padding:12px 28px;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-radius:999px;`,
  };
  const giftHtml = hasGift
    ? `<div style="${s.giftCard}">`
      + `<p style="${s.eyebrow}color:rgba(237,230,214,0.55);margin:0 0 14px 0;">A small note from the estate</p>`
      + `<p style="${s.body}color:#ede6d6;margin:0 0 14px 0;">A small thank-you from the estate, for your first edition. ${esc(p.thankYouValue as string)} towards any print, with our warmth.</p>`
      + `<code style="${s.code}">${esc(p.thankYouCode as string)}</code>`
      + `<p style="${s.small}margin:0;">Apply at checkout. Valid for one year — until ${esc(p.thankYouExpiry as string)}.</p>`
      + `</div>`
    : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="dark only"/><meta name="supported-color-schemes" content="dark only"/><title>Welcome to Friends &amp; Family — The Art of Stephen Meakin</title></head>`
    + `<body style="${s.page}"><div style="${s.shell}">`
    + `<p style="${s.eyebrow}">The Mandala Company · The estate of Stephen Meakin</p>`
    + `<h1 style="${s.heading}">Thank you, ${first}.</h1>`
    + `<p style="${s.body}">You've been added to Friends &amp; Family — a small list the family keeps for quarterly notes on new editions of <em>The Art of Stephen Meakin</em>, exhibitions, and the occasional piece of writing from the archive. No more than four notes a year, and never a marketing blast.</p>`
    + `<p style="${s.body}">Stephen worked for over three decades in Lewes, East Sussex — mandalas, sacred geometry, and a lifelong study of pattern. We release a small number of estate-stamped giclée prints so his work can live in homes rather than only in archives. If anything catches your eye, the current catalogue is here:</p>`
    + `<p style="text-align:center;margin:28px 0 24px 0;"><a href="${esc(p.collectionsUrl)}" style="${s.cta}">See the collections</a></p>`
    + giftHtml
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.body}">If at any point you'd rather not hear from us, a single reply to this email saying so is enough — we read everything ourselves.</p>`
    + `<p style="${s.signoff}">With love from the estate,</p>`
    + `<p style="${s.body}font-style:italic;margin:0;">— Archie, for The Mandala Company</p>`
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.footer}">Questions, or anything to flag — <a href="mailto:${esc(p.estateEmail)}" style="${s.link}">${esc(p.estateEmail)}</a><br/>The Art of Stephen Meakin · Lewes, East Sussex</p>`
    + `</div></body></html>`;
};

export default async function handler(req: VercelReq, res: VercelRes) {
  const originHeader = req.headers.origin;
  const origin = typeof originHeader === "string" ? originHeader : null;

  // Apply origin-aware CORS to every response via res.setHeader.
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    res.setHeader(key, value);
  }
  // Local send helper — writes to res so the Node runtime actually delivers
  // the response (the old Response-returning json() helper did not).
  const send = (status: number, payload: unknown) => {
    res.status(status).json(payload);
  };

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") return send(405, { error: "Method not allowed" });

  // Vercel's Node runtime parses a JSON request body into req.body. Handle
  // both the parsed-object case and a raw-string fallback defensively.
  let body: { name?: string; email?: string; source?: string };
  try {
    body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : ((req.body ?? {}) as typeof body);
  } catch {
    return send(400, { error: "Invalid JSON body." });
  }

  const name = (body.name ?? "").toString().trim().slice(0, 120);
  const email = (body.email ?? "").toString().trim().toLowerCase();
  const source = (body.source ?? "panel").toString().trim().slice(0, 32);

  if (!email || !isValidEmail(email)) {
    return send(400, { error: "Please provide a valid email." });
  }

  // Audit trail — always log even if downstream sends are skipped. Hugo can
  // grep Vercel logs for "[newsletter-subscribe]" to see his list grow.
  console.log("[newsletter-subscribe] sign-up", { email, name, source });

  // ---- Optional: push into Klaviyo (CRM / Welcome flow) -------------------
  // Best-effort + env-guarded: no KLAVIYO_API_KEY → clean no-op. With a list
  // id we upsert + subscribe in one job (powers the Welcome flow); without one
  // we still upsert the profile so a flow can target it. Never blocks signup.
  const klaviyoKey = process.env.KLAVIYO_API_KEY;
  if (klaviyoKey) {
    const klaviyoListId = (process.env.KLAVIYO_LIST_ID || "").trim();
    try {
      if (klaviyoListId) {
        await klaviyoSubscribeToList(klaviyoKey, klaviyoListId, email, name);
        console.log("[newsletter-subscribe] klaviyo subscribed to list", {
          email,
          list_id: klaviyoListId,
        });
      } else {
        await klaviyoUpsertProfile(klaviyoKey, email, name);
        console.log("[newsletter-subscribe] klaviyo profile upserted (no list id)", {
          email,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[newsletter-subscribe] klaviyo sync failed:", message);
    }
  }

  // ---- Subscriber thank-you code: DISABLED --------------------------------
  // Hugo's decision: newsletter sign-ups are NOT given a discount code — they
  // simply join the Friends & Family mailing list. Minting stays behind an
  // opt-in env flag (unset by default), so it never runs and never creates a
  // wasted Stripe coupon, while remaining one env var away if that changes. The
  // welcome email skips its code section when no code is passed (hasGift=false).
  // The post-purchase BUYER thank-you code (api/stripe-webhook.ts) is untouched.
  let subscriberCode: SubscriberCode | null = null;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && process.env.NEWSLETTER_DISCOUNT_ENABLED === "true") {
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
    return send(200, { ok: true });
  }

  try {
    const fromEmail = process.env.ESTATE_FROM_EMAIL || DEFAULT_FROM;
    const bccEmail = process.env.ESTATE_BCC_EMAIL || DEFAULT_BCC;
    const siteUrl = process.env.SITE_URL || DEFAULT_SITE_URL;
    const resend = new Resend(resendKey);

    const html = renderWelcomeHtml({
      subscriberName: name || null,
      estateEmail: DEFAULT_FROM,
      collectionsUrl: `${siteUrl.replace(/\/$/, "")}/collections`,
      thankYouCode: subscriberCode?.code,
      thankYouValue: subscriberCode?.valueLabel,
      thankYouExpiry: subscriberCode?.expiresLabel,
    });

    const sendResult = await resend.emails.send({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: [email],
      bcc:
        bccEmail && bccEmail.toLowerCase() !== fromEmail.toLowerCase()
          ? [bccEmail]
          : undefined,
      replyTo: DEFAULT_FROM,
      subject: "Welcome to Friends & Family",
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

  return send(200, { ok: true });
}
