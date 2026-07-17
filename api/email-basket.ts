/**
 * POST /api/email-basket
 *
 * "Save your basket — we'll email it to you." Sends the buyer their current
 * basket as an estate-branded email with a deep link back to /basket so they
 * can finish on another device. This is our tone-appropriate substitute for
 * a real abandoned-basket flow — see the email funnel brief.
 *
 * Cross-device restore (contract C2): the email's button links to
 * /basket?restore=<base64url(JSON items)> carrying the validated basket lines
 * (same field names the client POSTed), so the basket rebuilds on a device
 * whose localStorage is empty. If the URL would exceed ~1,800 chars it falls
 * back to the bare /basket link (logged) so the email never carries a broken
 * mega-URL.
 *
 * The basket lives in localStorage on the client; there's no server-side
 * persistence (no DB on this project). So:
 *   1. Client sends { email, name?, items: [{ paintingId, colourwayName }] }
 *   2. Server validates against the painting allowlist (same list as
 *      api/checkout.ts) — never trust client-supplied titles or prices.
 *   3. Server renders the BasketSaved email with the canonical titles /
 *      sizes / prices and fires it via Resend.
 *
 * Request body:
 *   {
 *     email: string,
 *     name?: string,
 *     items: Array<{ paintingId: string, colourwayName?: string }>
 *   }
 *
 * Response 200: { ok: true }
 *          400: { error: string }
 *          429: { error: "Too many requests" } — best-effort in-memory throttle
 *          405 / 500
 *
 * Required env vars: RESEND_API_KEY (skipped silently if missing — UI still
 * gets a friendly success state). Optional: SITE_URL, ESTATE_FROM_EMAIL,
 * ESTATE_BCC_EMAIL.
 *
 * Self-contained — painting allowlist / titles / price are duplicated from
 * src/data/paintings.ts and api/checkout.ts. Keep all three in sync when
 * adding a painting. (Gotcha #5.)
 */

import { Resend } from "resend";

// NOTE: this function is intentionally SELF-CONTAINED — no imports from ./_lib
// or /src. Vercel's @vercel/node builder compiles only the entrypoint and does
// NOT bundle sibling local .ts/.tsx files into the lambda — they crash at cold
// start with ERR_MODULE_NOT_FOUND (verified on preview 2026-05-30; gotcha #5 in
// CLAUDE.md). The saved-basket email renderer is therefore inlined below — a
// mirror of api/_lib/emails/BasketSaved.tsx (+ ./styles.ts). Keep them in sync.

// ---- Catalogue duplicated from src/data/paintings.ts + api/checkout.ts ----
// Keep in sync with PRINT_TIERS in src/data/paintings.ts AND the inline TIERS
// map in api/checkout.ts. Gotcha #5 (api self-contained) + new gotcha #9
// (pricing mirror across three files). Update all three in the same commit
// when tier prices, add-on prices or labels change.
type TierId = "atelier" | "collector" | "atelier-grande" | "heirloom" | "studio";
interface EmailTier {
  label: string;
  size: string;
  editionLabel: string;
  pricePence: number;
  framingPricePence?: number;
  embellishmentPricePence?: number;
  canvasPricePence?: number;
  available: boolean;
  // Studio one-off — no add-ons; it IS the hand-finished piece.
  isOneOff?: boolean;
}
// Mirror of PRINT_TIERS in src/data/paintings.ts (gotcha #9 — pricing lives in
// several places; keep this in sync with paintings.ts + api/checkout.ts +
// api/stripe-webhook.ts). Updated 2026-06-02 to the rethought ladder.
const TIERS: Record<TierId, EmailTier> = {
  atelier: {
    label: "Open Edition",
    size: "A3 (29.5 × 29.5 cm)",
    editionLabel: "Open Edition — unnumbered, issued to order",
    pricePence: 27500,
    available: true,
  },
  collector: {
    label: "Collector Edition",
    size: "A2 (42 × 42 cm)",
    editionLabel: "Collector Edition — edition of 200, hand-numbered",
    pricePence: 49500,
    framingPricePence: 34500,
    embellishmentPricePence: 35000,
    canvasPricePence: 14500,
    available: true,
  },
  "atelier-grande": {
    label: "Atelier Edition",
    size: "A1 (59.5 × 59.5 cm)",
    editionLabel: "Atelier Edition — edition of 75, hand-numbered",
    pricePence: 92500,
    framingPricePence: 44500,
    embellishmentPricePence: 49500,
    canvasPricePence: 18500,
    available: true,
  },
  heirloom: {
    label: "Heirloom Edition",
    size: "A0 (84 × 84 cm)",
    editionLabel: "Heirloom Edition — edition of 18, hand-numbered",
    pricePence: 189500,
    embellishmentPricePence: 79500,
    canvasPricePence: 26500,
    // ENABLED 2026-06-06 (mirror fix): must match paintings.ts + checkout.ts,
    // both available:true. When this read false, a saved A0 basket was
    // silently downgraded to the A2 anchor in the email (£450 vs £1,750).
    available: true,
  },
  studio: {
    // £2,450 unique hand-painted one-off by Polly Wedge — no add-ons.
    label: "Original — One of One",
    size: "A1 (59.5 × 59.5 cm)",
    editionLabel: "Unique — one of one",
    pricePence: 265000,
    isOneOff: true,
    available: true,
  },
};
// Per-painting LANDSCAPE size overrides (mirror of OPHIUCHUS_TIER_SIZE in
// src/data/paintings.ts + api/checkout.ts + api/stripe-webhook.ts — gotcha #9).
// Ophiuchus is the one non-square work, so the saved-basket email previews its
// real landscape dimensions, not a square default. Same ids / prices / editions.
const PAINTING_TIER_SIZE: Record<string, Partial<Record<TierId, string>>> = {
  ophiuchus: {
    atelier: "A3 (36.4 × 29.5 cm)",
    collector: "A2 (51.8 × 42 cm)",
    "atelier-grande": "A1 (73.4 × 59.5 cm)",
    heirloom: "A0 (103.6 × 84 cm)",
    studio: "A1 (73.4 × 59.5 cm)",
  },
};
const sizeFor = (paintingId: string, tierId: TierId): string =>
  PAINTING_TIER_SIZE[paintingId]?.[tierId] ?? TIERS[tierId].size;
const ANCHOR_TIER_ID: TierId = "collector";

const MAX_ITEMS = 20;

// Ceiling for the emailed /basket?restore=… link (contract C2). Past roughly
// this length some mail clients and link-rewriting proxies truncate URLs, so
// anything longer falls back to the bare /basket link instead.
const MAX_BASKET_URL_LENGTH = 1800;

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

const DEFAULT_FROM = "info@themandalacompany.com";
const DEFAULT_BCC = "info@themandalacompany.com";
const FROM_NAME = "The Mandala Company";
const DEFAULT_SITE_URL = "https://themandalacompany.com";

// ---- Origin allowlist ----------------------------------------------------
// Mirror of api/newsletter-subscribe.ts — echoes the request's `Origin` only
// if it matches our known surfaces or a *.vercel.app preview. Anything else
// gets the canonical production origin so cross-origin browser POSTs from
// random domains are rejected by the browser.
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

const formatGBP = (pence: number): string =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

// ---- Tiny in-memory throttle ----------------------------------------------
// Best-effort only: serverless instances are ephemeral, so this can't enforce
// across cold-start boundaries. It's enough to stop a misbehaving client from
// flooding Resend within a single warm instance.
const recentSends = new Map<string, number>();
const THROTTLE_MS = 60 * 1000; // 1 minute per email
const throttleClean = () => {
  const cutoff = Date.now() - THROTTLE_MS;
  for (const [k, t] of recentSends) {
    if (t < cutoff) recentSends.delete(k);
  }
};

// ---------------------------------------------------------------------------
// Inlined saved-basket email → HTML string (mirror of
// api/_lib/emails/BasketSaved.tsx + ./styles.ts — gotcha #5)
// ---------------------------------------------------------------------------
const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Email-safe font stacks — matched to the site (Fraunces display + Schibsted
// Grotesk body). Custom webfonts don't load in Gmail, so the serif/sans
// fallbacks (Georgia / Helvetica) are what most inboxes actually render — the
// design is built to look intentional in the fallback, not to depend on the
// linked fonts. (Apple Mail honours the <link> and shows the real faces.)
const SANS = `'Schibsted Grotesk','Helvetica Neue',Arial,sans-serif`;
const DISPLAY = `'Fraunces','Georgia','Times New Roman',serif`;
const LOGO_URL = "https://themandalacompany.com/logo/logo-seal-v9-w256.png";

// Light "estate paper" palette (Hugo: no black backgrounds). Warm cream page +
// dark ink — the site's own cream-card palette, so it's coherent with the brand
// yet fully readable everywhere. Still built bulletproof: the background is set
// via the `bgcolor=` HTML attribute on every table + cell (which Gmail keeps,
// unlike CSS background on <body>/<div> which it strips + inverts), with an
// explicit solid-hex colour on every text node. Key names are role-stable so
// the markup below is untouched: `bg` = the paper, `cream` = the primary ink.
const C = {
  bg: "#f5efe3", // warm paper page (site cream.DEFAULT)
  card: "#ece4d5", // lifted items card (site cream.soft)
  cream: "#1a1612", // primary ink on paper (site cream.ink)
  muted: "#5a544a", // body / muted ink (site cream.ink-soft)
  faint: "#8a8172", // captions
  rust: "#c97844", // accent (site accent.DEFAULT)
  line: "#ddd3bf", // hairline (site cream.line)
};

// One estate-authentication trust cell (mirrors the site's PDP provenance
// cluster / ESTATE_AUTHENTICATION copy).
const authCell = (label: string, sub: string): string =>
  `<td width="50%" style="width:50%;vertical-align:top;padding:14px 14px 0 0;">`
  + `<div style="font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${C.cream};">${label}</div>`
  + `<div style="font-family:${SANS};font-size:12px;line-height:1.45;color:${C.faint};margin-top:3px;">${sub}</div>`
  + `</td>`;

const renderBasketSavedHtml = (p: {
  buyerName?: string | null;
  lines: Array<{ title: string; colourway: string; size: string; price: string }>;
  subtotal: string;
  basketUrl: string;
  estateEmail: string;
  // True when basketUrl carries the ?restore= payload (contract C2) — the
  // intro copy promises cross-device pick-up only when the link can honour it.
  restoreCarried: boolean;
}): string => {
  // Editorial spec-rows: painting title in Fraunces italic (the site's signature
  // for painting titles), colourway as a rust eyebrow, size/edition faint, price
  // in Fraunces roman right-aligned.
  const lineHtml = p.lines
    .map((line, idx) => {
      const topBorder = idx === 0 ? "0" : `1px solid ${C.line}`;
      return `<tr><td style="border-top:${topBorder};padding:${idx === 0 ? "0" : "16px"} 0 16px 0;">`
        + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;"><tr>`
        + `<td style="vertical-align:top;">`
        + `<div style="font-family:${DISPLAY};font-style:italic;font-size:17px;line-height:1.3;color:${C.cream};">${esc(line.title)}</div>`
        + `<div style="font-family:${SANS};font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${C.rust};margin-top:6px;">${esc(line.colourway)}</div>`
        + `<div style="font-family:${SANS};font-size:12px;line-height:1.5;color:${C.faint};margin-top:5px;">${esc(line.size)}</div>`
        + `</td>`
        + `<td align="right" style="vertical-align:top;text-align:right;white-space:nowrap;padding-left:16px;">`
        + `<div style="font-family:${DISPLAY};font-size:16px;color:${C.cream};">${esc(line.price)}</div>`
        + `</td>`
        + `</tr></table></td></tr>`;
    })
    .join("");
  // Personal greeting — the recipient's first name (capitalised), else "Hello,".
  const first = (() => {
    const t = (p.buyerName ?? "").trim();
    if (!t) return "";
    const f = t.split(/\s+/)[0];
    return esc(f.charAt(0).toUpperCase() + f.slice(1));
  })();
  const greeting = first ? `Dear ${first},` : `Hello,`;
  const message = p.restoreCarried
    ? `Thank you for spending a little time with Stephen's work. You set a few pieces aside on the estate website — open this on whichever device you'd like to check out on, follow the link below, and your basket will be waiting exactly as you left it.`
    : `Thank you for spending a little time with Stephen's work. You set a few pieces aside on the estate website, and we've kept them safe for you here — follow the link below whenever the moment feels right, and they'll be waiting exactly as you left them.`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="light"/><meta name="supported-color-schemes" content="light"/><title>Your basket — The Art of Stephen Meakin</title>`
    + `<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Schibsted+Grotesk:wght@400;500;600&display=swap" rel="stylesheet"/>`
    + `</head>`
    + `<body bgcolor="${C.bg}" style="margin:0;padding:0;background-color:${C.bg};">`
    + `<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">Your saved basket at The Mandala Company — the estate of Stephen Meakin.</span>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background-color:${C.bg};margin:0;padding:0;"><tr><td align="center" style="padding:24px 12px;">`
    + `<table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="width:600px;max-width:600px;background-color:${C.bg};">`
    // ---- masthead ----
    + `<tr><td align="center" bgcolor="${C.bg}" style="background-color:${C.bg};padding:40px 40px 32px 40px;border-bottom:1px solid ${C.line};">`
    + `<img src="${LOGO_URL}" width="66" height="66" alt="The Mandala Company" style="display:block;border:0;outline:none;text-decoration:none;width:66px;height:66px;margin:0 auto 18px auto;"/>`
    + `<div style="font-family:${DISPLAY};font-size:23px;letter-spacing:0.12em;text-transform:uppercase;color:${C.cream};line-height:1.15;">The Mandala Company</div>`
    + `<div style="font-family:${SANS};font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:${C.rust};margin-top:10px;">The Art of Stephen Meakin</div>`
    + `</td></tr>`
    // ---- personal greeting + message ----
    + `<tr><td bgcolor="${C.bg}" style="background-color:${C.bg};padding:38px 40px 2px 40px;">`
    + `<div style="font-family:${DISPLAY};font-size:25px;line-height:1.25;color:${C.cream};margin:0 0 16px 0;">${greeting}</div>`
    + `<div style="font-family:${SANS};font-size:15px;line-height:1.72;color:${C.muted};">${message}</div>`
    + `</td></tr>`
    // ---- your basket ----
    + `<tr><td bgcolor="${C.bg}" style="background-color:${C.bg};padding:30px 40px 0 40px;">`
    + `<div style="font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:${C.rust};border-top:1px solid ${C.line};padding-top:24px;margin-bottom:16px;">Your basket</div>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="width:100%;background-color:${C.card};border:1px solid ${C.line};"><tr><td style="padding:22px 24px;">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">${lineHtml}</table>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid ${C.line};margin-top:4px;"><tr>`
    + `<td style="padding-top:16px;font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${C.muted};">Subtotal</td>`
    + `<td align="right" style="padding-top:16px;text-align:right;font-family:${DISPLAY};font-size:20px;color:${C.cream};">${esc(p.subtotal)}</td>`
    + `</tr></table>`
    + `<div style="font-family:${SANS};font-size:12.5px;line-height:1.55;color:${C.faint};margin-top:12px;">Delivery is free worldwide — framed or unframed — with nothing added at checkout.</div>`
    + `</td></tr></table>`
    + `</td></tr>`
    // ---- CTA ----
    + `<tr><td align="center" bgcolor="${C.bg}" style="background-color:${C.bg};padding:30px 40px 6px 40px;">`
    + `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="${C.rust}" style="background-color:${C.rust};">`
    + `<a href="${esc(p.basketUrl)}" style="display:inline-block;padding:15px 42px;font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${C.cream};text-decoration:none;">Open your basket</a>`
    + `</td></tr></table></td></tr>`
    // ---- reassurance + estate authentication cluster ----
    + `<tr><td bgcolor="${C.bg}" style="background-color:${C.bg};padding:32px 40px 0 40px;">`
    + `<div style="font-family:${SANS};font-size:14px;line-height:1.7;color:${C.muted};">Each print is individually made to order at a leading giclée atelier in London and estate-stamped by The Mandala Company, hand-numbered within its edition. If a colourway sells out between now and your visit, the basket will quietly drop the line and the rest will be waiting.</div>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin-top:24px;border-top:1px solid ${C.line};">`
    + `<tr>${authCell("Estate-stamped", "By The Mandala Company")}${authCell("Hand-numbered", "Within its edition")}</tr>`
    + `<tr>${authCell("Certificate", "A unique Certificate ID")}${authCell("Atelier giclée", "Printed in London")}</tr>`
    + `</table>`
    + `</td></tr>`
    // ---- sign-off ----
    + `<tr><td bgcolor="${C.bg}" style="background-color:${C.bg};padding:30px 40px 40px 40px;">`
    + `<div style="font-family:${DISPLAY};font-style:italic;font-size:17px;color:${C.cream};margin:0 0 5px 0;">With love from the estate,</div>`
    + `<div style="font-family:${SANS};font-size:14px;color:${C.muted};">— The Mandala Company</div>`
    + `</td></tr>`
    // ---- footer ----
    + `<tr><td align="center" bgcolor="${C.bg}" style="background-color:${C.bg};padding:26px 40px 36px 40px;border-top:1px solid ${C.line};">`
    + `<div style="font-family:${SANS};font-size:12px;line-height:1.8;color:${C.faint};">Questions, or anything to flag — <a href="mailto:${esc(p.estateEmail)}" style="color:${C.rust};text-decoration:none;">${esc(p.estateEmail)}</a><br/>The Art of Stephen Meakin · Lewes, East Sussex</div>`
    + `</td></tr>`
    + `</table></td></tr></table></body></html>`;
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
  let body: {
    email?: string;
    name?: string;
    items?: Array<{
      paintingId?: string;
      colourwayName?: string;
      tierId?: unknown;
      framing?: unknown;
      embellished?: unknown;
      canvas?: unknown;
    }>;
  };
  try {
    body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : ((req.body ?? {}) as typeof body);
  } catch {
    return send(400, { error: "Invalid JSON body." });
  }

  const email = (body.email ?? "").toString().trim().toLowerCase();
  const name = (body.name ?? "").toString().trim().slice(0, 120);
  if (!email || !isValidEmail(email)) {
    return send(400, { error: "Please provide a valid email." });
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) {
    return send(400, { error: "Your basket is empty." });
  }
  if (rawItems.length > MAX_ITEMS) {
    return send(400, { error: `Too many items (max ${MAX_ITEMS}).` });
  }

  const lines: Array<{
    title: string;
    colourway: string;
    size: string;
    price: string;
  }> = [];
  // Sanitised mirror of the POSTed items for the restore link (contract C2).
  // Same field names the client sent — /basket re-validates every line on
  // restore, so we pass the buyer's choices through rather than the email's
  // display-side defaulting (e.g. we do NOT inject "Original" or the anchor
  // tier here; absent fields stay absent).
  const restoreItems: Array<{
    paintingId: string;
    colourwayName?: string;
    tierId?: string;
    framing?: boolean;
    embellished?: boolean;
    canvas?: boolean;
  }> = [];
  let subtotalPence = 0;
  for (const raw of rawItems) {
    const id = (raw?.paintingId ?? "").toString();
    if (!VALID_PAINTING_IDS.has(id)) {
      return send(400, { error: `Unknown painting "${id}".` });
    }
    const colourway = (raw?.colourwayName ?? "").toString().trim() || "Original";
    // Tier resolution: prefer the buyer's choice, fall back to the anchor
    // (Collector A2) if missing or invalid. Mirrors the same defaulting in
    // checkout.ts so the saved-basket email previews the same numbers Stripe
    // will show at the actual checkout.
    const rawTierId = (raw?.tierId ?? "").toString();
    const tierId: TierId =
      rawTierId in TIERS && TIERS[rawTierId as TierId].available
        ? (rawTierId as TierId)
        : ANCHOR_TIER_ID;
    const tier = TIERS[tierId];
    // Canvas is mutually exclusive with framing (a canvas isn't glazed-framed).
    const canvas = raw?.canvas === true && !!tier.canvasPricePence;
    const framing = !canvas && raw?.framing === true && !!tier.framingPricePence;
    const embellished = raw?.embellished === true && !!tier.embellishmentPricePence;
    const linePence =
      tier.pricePence +
      (framing ? (tier.framingPricePence ?? 0) : 0) +
      (embellished ? (tier.embellishmentPricePence ?? 0) : 0) +
      (canvas ? (tier.canvasPricePence ?? 0) : 0);
    // Tail micro-text shown after the size — surfaces the add-ons so the
    // buyer sees the same shape they'll see at Stripe Checkout.
    const tail: string[] = [tier.editionLabel];
    if (canvas) tail.push("stretched canvas");
    if (framing) tail.push("hand-made frame");
    if (embellished) tail.push("hand-finished by Polly");
    lines.push({
      title: PAINTING_TITLES[id] ?? id,
      colourway,
      size: `${tier.label} · ${sizeFor(id, tierId)} · ${tail.join(" · ")}`,
      price: formatGBP(linePence),
    });
    subtotalPence += linePence;

    const postedColourway = (raw?.colourwayName ?? "").toString().trim();
    const restoreItem: (typeof restoreItems)[number] = { paintingId: id };
    if (postedColourway) restoreItem.colourwayName = postedColourway;
    if (rawTierId) restoreItem.tierId = rawTierId;
    if (typeof raw?.framing === "boolean") restoreItem.framing = raw.framing;
    if (typeof raw?.embellished === "boolean") restoreItem.embellished = raw.embellished;
    if (typeof raw?.canvas === "boolean") restoreItem.canvas = raw.canvas;
    restoreItems.push(restoreItem);
  }

  // Throttle.
  throttleClean();
  const lastSent = recentSends.get(email);
  if (lastSent && Date.now() - lastSent < THROTTLE_MS) {
    return send(429, { error: "We just sent that — please check your inbox." });
  }

  console.log("[email-basket] request", { email, name, itemCount: lines.length });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("[email-basket] RESEND_API_KEY missing — skipping send.");
    // Soft-success so the UI doesn't leak infra state to the buyer.
    recentSends.set(email, Date.now());
    return send(200, { ok: true });
  }

  try {
    const fromEmail = process.env.ESTATE_FROM_EMAIL || DEFAULT_FROM;
    const bccEmail = process.env.ESTATE_BCC_EMAIL || DEFAULT_BCC;
    const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
    const resend = new Resend(resendKey);

    // Cross-device restore link (contract C2): carry the basket lines in the
    // URL as base64url JSON so /basket can rebuild them on a device whose
    // localStorage is empty. base64url's alphabet (A–Z a–z 0–9 - _) is
    // query-string safe — no extra encoding needed. Guard the total length:
    // past ~1,800 chars some mail clients / proxies truncate links, which
    // would be worse than the old same-device-only behaviour, so fall back
    // to the bare /basket URL (and log it) rather than send a broken link.
    const bareBasketUrl = `${siteUrl}/basket`;
    let basketUrl = bareBasketUrl;
    let restoreCarried = false;
    try {
      const payload = Buffer.from(JSON.stringify(restoreItems), "utf8").toString("base64url");
      const candidate = `${bareBasketUrl}?restore=${payload}`;
      if (candidate.length <= MAX_BASKET_URL_LENGTH) {
        basketUrl = candidate;
        restoreCarried = true;
      } else {
        console.log("[email-basket] restore URL too long — falling back to bare /basket", {
          urlLength: candidate.length,
          itemCount: restoreItems.length,
        });
      }
    } catch (err) {
      // Never let the restore nicety break the email itself.
      console.error("[email-basket] restore payload build failed:", err);
    }

    const html = renderBasketSavedHtml({
      buyerName: name || null,
      lines,
      subtotal: formatGBP(subtotalPence),
      basketUrl,
      estateEmail: DEFAULT_FROM,
      restoreCarried,
    });

    const sendResult = await resend.emails.send({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: [email],
      bcc:
        bccEmail && bccEmail.toLowerCase() !== fromEmail.toLowerCase()
          ? [bccEmail]
          : undefined,
      replyTo: DEFAULT_FROM,
      subject: "Your basket from the Stephen Meakin estate",
      html,
    });

    if (sendResult.error) {
      console.error("[email-basket] Resend send error:", sendResult.error);
    } else {
      console.log("[email-basket] sent", {
        email,
        itemCount: lines.length,
        resend_id: sendResult.data?.id,
      });
    }
    recentSends.set(email, Date.now());
    return send(200, { ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email-basket] failed:", message);
    // Still 200 — UI shouldn't reveal infra failures.
    return send(200, { ok: true });
  }
}
