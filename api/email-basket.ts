/**
 * POST /api/email-basket
 *
 * "Save your basket — we'll email it to you." Sends the buyer their current
 * basket as an estate-branded email with a deep link back to /basket so they
 * can finish on another device. This is our tone-appropriate substitute for
 * a real abandoned-basket flow — see the email funnel brief.
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
  available: boolean;
  // Studio one-off — no add-ons; it IS the hand-finished piece.
  isOneOff?: boolean;
}
const TIERS: Record<TierId, EmailTier> = {
  atelier: {
    label: "Atelier",
    size: "A3 (29.7 × 42 cm)",
    editionLabel: "Open edition",
    pricePence: 14500,
    available: true,
  },
  collector: {
    label: "Collector",
    size: "A2 (42 × 59.4 cm)",
    editionLabel: "Edition of 100",
    pricePence: 29500,
    framingPricePence: 29500,
    embellishmentPricePence: 35000,
    available: true,
  },
  "atelier-grande": {
    label: "Atelier Grande",
    size: "A1 (59.4 × 84.1 cm)",
    editionLabel: "Edition of 50",
    pricePence: 59500,
    framingPricePence: 39500,
    embellishmentPricePence: 49500,
    available: true,
  },
  heirloom: {
    label: "Heirloom",
    size: "A0 (84.1 × 118.9 cm)",
    editionLabel: "Edition of 25",
    pricePence: 125000,
    available: false,
  },
  studio: {
    // £950 unique hand-painted one-off by Polly Wedge — no add-ons.
    label: "Studio — Hand-painted by Polly Wedge",
    size: "A1 (59.4 × 84.1 cm)",
    editionLabel: "Unique — one of one",
    pricePence: 95000,
    isOneOff: true,
    available: true,
  },
};
const ANCHOR_TIER_ID: TierId = "collector";

const MAX_ITEMS = 20;

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

const SANS = `"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif`;
const DISPLAY = `"Playfair Display",Georgia,"Times New Roman",serif`;

const renderBasketSavedHtml = (p: {
  buyerName?: string | null;
  lines: Array<{ title: string; colourway: string; size: string; price: string }>;
  subtotal: string;
  basketUrl: string;
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
    orderRow: `font-family:${SANS};font-size:14px;line-height:1.55;color:#ede6d6;margin:0 0 4px 0;`,
    orderMeta: `font-family:${SANS};font-size:12px;color:rgba(237,230,214,0.55);margin:0;`,
    signoff: `font-family:${DISPLAY};font-style:italic;font-size:16px;color:#ede6d6;margin:24px 0 4px 0;`,
    footer: `font-family:${SANS};font-size:11px;line-height:1.7;color:rgba(237,230,214,0.55);text-align:center;margin:32px 0 0 0;`,
    link: `color:#c97844;text-decoration:underline;`,
    button: `display:inline-block;background-color:#ede6d6;color:#0a0908;padding:12px 28px;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-radius:999px;`,
  };
  const lineHtml = p.lines
    .map((line, idx) => {
      return `<div style="margin-top:${idx === 0 ? 0 : 14}px;padding-top:${idx === 0 ? 0 : 14}px;border-top:${idx === 0 ? "0" : "1px solid rgba(237,230,214,0.18)"};">`
        + `<p style="${s.orderRow}"><strong style="color:#ede6d6;">${esc(line.title)}</strong> — <span style="color:rgba(237,230,214,0.78);">${esc(line.colourway)}</span></p>`
        + `<p style="${s.orderMeta}">${esc(line.size)}</p>`
        + `<p style="${s.orderMeta}margin-top:4px;color:#ede6d6;">${esc(line.price)}</p>`
        + `</div>`;
    })
    .join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="dark only"/><meta name="supported-color-schemes" content="dark only"/><title>Your basket — The Art of Stephen Meakin</title></head>`
    + `<body style="${s.page}"><div style="${s.shell}">`
    + `<p style="${s.eyebrow}">The Mandala Company · The estate of Stephen Meakin</p>`
    + `<h1 style="${s.heading}">Your basket, ${first}.</h1>`
    + `<p style="${s.body}">Here are the prints you set aside on the estate website. They live in this email now — open it on whichever device you'd like to use for checkout, follow the link, and you can pick up where you left off. The basket itself sits in your browser, so it will quietly wait until you're ready.</p>`
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.eyebrow}">Your basket</p>`
    + `<div style="${s.card}">${lineHtml}`
    + `<hr style="border:0;border-top:1px solid rgba(237,230,214,0.18);margin:18px 0 12px 0;"/>`
    + `<p style="${s.orderRow}display:flex;justify-content:space-between;"><span style="color:rgba(237,230,214,0.55);letter-spacing:0.18em;font-size:11px;text-transform:uppercase;font-weight:700;">Subtotal</span> <strong style="color:#ede6d6;font-size:16px;">${esc(p.subtotal)}</strong></p>`
    + `<p style="${s.small}margin:8px 0 0 0;">Shipping calculated at checkout. UK £15 · Europe £35 · Worldwide £60.</p>`
    + `</div>`
    + `<p style="text-align:center;margin:28px 0 24px 0;"><a href="${esc(p.basketUrl)}" style="${s.button}">Open your basket</a></p>`
    + `<p style="${s.body}">Each print is individually made to order at a small UK atelier and estate-stamped by The Mandala Company, hand-numbered within its edition. If a colourway sells out between now and your visit, the basket will quietly drop the line and the rest will be waiting.</p>`
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
  let body: {
    email?: string;
    name?: string;
    items?: Array<{
      paintingId?: string;
      colourwayName?: string;
      tierId?: unknown;
      framing?: unknown;
      embellished?: unknown;
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
    const framing = raw?.framing === true && !!tier.framingPricePence;
    const embellished = raw?.embellished === true && !!tier.embellishmentPricePence;
    const linePence =
      tier.pricePence +
      (framing ? (tier.framingPricePence ?? 0) : 0) +
      (embellished ? (tier.embellishmentPricePence ?? 0) : 0);
    // Tail micro-text shown after the size — surfaces the add-ons so the
    // buyer sees the same shape they'll see at Stripe Checkout.
    const tail: string[] = [tier.editionLabel];
    if (framing) tail.push("hand-made frame");
    if (embellished) tail.push("hand-finished by Polly");
    lines.push({
      title: PAINTING_TITLES[id] ?? id,
      colourway,
      size: `${tier.label} · ${tier.size} · ${tail.join(" · ")}`,
      price: formatGBP(linePence),
    });
    subtotalPence += linePence;
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

    const html = renderBasketSavedHtml({
      buyerName: name || null,
      lines,
      subtotal: formatGBP(subtotalPence),
      basketUrl: `${siteUrl}/basket`,
      estateEmail: DEFAULT_FROM,
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
