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
import { render } from "@react-email/render";
import { BasketSavedEmail } from "./_lib/emails/BasketSaved.js";

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
const DEFAULT_SITE_URL = "https://uncle-tribute.vercel.app";

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
    base["Access-Control-Allow-Origin"] = "https://uncle-tribute.vercel.app";
  }
  return base;
};

const json = (status: number, body: unknown, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });

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

export default async function handler(req: Request) {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, origin);

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
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." }, origin);
  }

  const email = (body.email ?? "").toString().trim().toLowerCase();
  const name = (body.name ?? "").toString().trim().slice(0, 120);
  if (!email || !isValidEmail(email)) {
    return json(400, { error: "Please provide a valid email." }, origin);
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) {
    return json(400, { error: "Your basket is empty." }, origin);
  }
  if (rawItems.length > MAX_ITEMS) {
    return json(400, { error: `Too many items (max ${MAX_ITEMS}).` }, origin);
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
      return json(400, { error: `Unknown painting "${id}".` }, origin);
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
    return json(
      429,
      { error: "We just sent that — please check your inbox." },
      origin,
    );
  }

  console.log("[email-basket] request", { email, name, itemCount: lines.length });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("[email-basket] RESEND_API_KEY missing — skipping send.");
    // Soft-success so the UI doesn't leak infra state to the buyer.
    recentSends.set(email, Date.now());
    return json(200, { ok: true }, origin);
  }

  try {
    const fromEmail = process.env.ESTATE_FROM_EMAIL || DEFAULT_FROM;
    const bccEmail = process.env.ESTATE_BCC_EMAIL || DEFAULT_BCC;
    const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
    const resend = new Resend(resendKey);

    const html = await render(
      BasketSavedEmail({
        buyerName: name || null,
        lines,
        subtotal: formatGBP(subtotalPence),
        basketUrl: `${siteUrl}/basket`,
        estateEmail: DEFAULT_FROM,
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
    return json(200, { ok: true }, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email-basket] failed:", message);
    // Still 200 — UI shouldn't reveal infra failures.
    return json(200, { ok: true }, origin);
  }
}
