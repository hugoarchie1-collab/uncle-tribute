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
 * Duplicate-delivery protection (Stripe redelivers the same event id after
 * network blips / slow responses): each verified event id is claimed
 * atomically in Vercel KV / Upstash — "SET stripe_evt:<id> 1 NX EX 86400",
 * one REST round-trip — BEFORE any side effects run, so a retry can't re-send
 * the confirmation email or re-mint thank-you/gift codes even across cold
 * starts and regions. FAIL-OPEN: if the KV env vars are absent, or KV errors
 * or times out (~2s), we fall back to the best-effort in-memory dedup and
 * still process the event — KV can never block or fail the webhook. The
 * in-memory Map is kept as a second layer regardless. (This resolves the
 * CLAUDE.md P2 "durable webhook dedup" caveat whenever the KV env vars are
 * configured; without them, dedup is in-memory best-effort as before.)
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
 *   META_PIXEL_ID +
 *   META_CAPI_ACCESS_TOKEN  – Meta Conversions API server-side Purchase event
 *                             on checkout.session.completed (both required;
 *                             either absent => clean silent no-op)
 *   KV_REST_API_URL +
 *   KV_REST_API_TOKEN       – Vercel KV / Upstash REST credentials for the
 *                             DURABLE event-id dedup described above
 *                             (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 *                             accepted as aliases — same handling as
 *                             api/memories-submit.ts; either half absent =>
 *                             in-memory best-effort dedup only)
 *
 * Also handles `checkout.session.expired`: when the session has a Stripe
 * recovery URL, a buyer email AND the buyer opted in to promotions
 * (consent.promotions === "opt_in"), we send ONE quiet basket-held recovery
 * email via Resend. All conditions required, otherwise log + skip.
 *
 * Self-contained file (no imports from /src — gotcha #5 in CLAUDE.md).
 * Imports from /api/_lib/* are fine — same Vercel bundle, underscore prefix
 * keeps them out of the public route table.
 */

import type { IncomingMessage } from "node:http";
import { createHash, randomBytes } from "node:crypto";
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
// Event-id deduplication — layer 2: in-memory (best-effort)
// ---------------------------------------------------------------------------
// Vercel serverless functions are short-lived (warm instances last minutes,
// not hours) and may be replicated across regions — so this layer is
// BEST-EFFORT only. It catches the common case where Stripe retries the same
// event within seconds of a network blip, while a warm instance is still in
// memory. The DURABLE layer 1 is the KV SET-NX claim below (kvClaimEventId);
// this Map is kept REGARDLESS as a cheap second layer that still catches
// same-instance retries whenever KV is unconfigured or having a blip.
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

// ---------------------------------------------------------------------------
// Event-id deduplication — layer 1: durable Vercel KV / Upstash claim
// ---------------------------------------------------------------------------
// One atomic REST round-trip per verified event:
//   SET stripe_evt:<event.id> 1 NX EX 86400
// NX makes the write a claim — exactly one delivery wins the key; every retry
// (including on a different instance / region / after a cold start) sees
// "already exists" and is dropped before any side effects (Resend email,
// coupon mints) can re-run. EX 86400 (24h) self-expires the key, matching
// SEEN_EVENT_TTL_MS — Stripe's retry window is well inside it.
//
// Inlined raw-fetch Upstash REST call — mirror of api/memories-submit.ts's
// working kvCommand shape (POST {url} with a JSON array command body + bearer
// token; response { result, error }), including its env-var handling:
// KV_REST_API_URL/KV_REST_API_TOKEN with UPSTASH_REDIS_REST_URL/_TOKEN
// accepted as aliases. NOT a shared module — gotcha #5.
//
// FAIL-OPEN by design: missing env vars, HTTP/command errors, or a timeout
// (~2s AbortController via AbortSignal.timeout) all return "unavailable" and
// the handler falls back to the in-memory layer 2 — KV can never block or
// fail the webhook, which must ALWAYS 200 on verified events.
const KV_DEDUP_PREFIX = "stripe_evt:";
const KV_DEDUP_TTL_SECONDS = 86_400; // 24h — matches SEEN_EVENT_TTL_MS
const KV_DEDUP_TIMEOUT_MS = 2_000;

const kvDedupConfig = (): { url: string; token: string } | null => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
};

type KvClaimOutcome = "first" | "duplicate" | "unavailable";

async function kvClaimEventId(eventId: string): Promise<KvClaimOutcome> {
  const cfg = kvDedupConfig();
  if (!cfg) return "unavailable";
  try {
    const resp = await fetch(cfg.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        "SET",
        `${KV_DEDUP_PREFIX}${eventId}`,
        "1",
        "NX",
        "EX",
        String(KV_DEDUP_TTL_SECONDS),
      ]),
      signal: AbortSignal.timeout(KV_DEDUP_TIMEOUT_MS),
    });
    if (!resp.ok) {
      console.error(
        `[stripe-webhook] KV dedup SET failed: HTTP ${resp.status} — falling back to in-memory dedup.`,
      );
      return "unavailable";
    }
    const json = (await resp.json()) as { result?: unknown; error?: string };
    if (json.error) {
      console.error(
        "[stripe-webhook] KV dedup SET error:",
        json.error,
        "— falling back to in-memory dedup.",
      );
      return "unavailable";
    }
    // Upstash SET … NX → "OK" when the key was set (first delivery), null when
    // it already existed (duplicate). Anything unexpected → fail open.
    if (json.result === "OK") return "first";
    if (json.result === null || json.result === undefined) return "duplicate";
    console.error(
      "[stripe-webhook] KV dedup SET returned an unexpected result — falling back to in-memory dedup.",
      { result: json.result },
    );
    return "unavailable";
  } catch (err) {
    // Timeout (AbortSignal.timeout) or network failure — fail open.
    console.error(
      "[stripe-webhook] KV dedup SET threw:",
      err instanceof Error ? err.message : err,
      "— falling back to in-memory dedup.",
    );
    return "unavailable";
  }
}

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
  atelier: "Open Edition",
  collector: "Collector Drop",
  "atelier-grande": "Atelier Drop",
  heirloom: "Heirloom Drop",
  studio: "Original — One of One",
};
const TIER_SIZE: Record<string, string> = {
  atelier: "A3 (29.5 × 29.5 cm)",
  collector: "A2 (42 × 42 cm)",
  "atelier-grande": "A1 (59.5 × 59.5 cm)",
  heirloom: "A0 (84 × 84 cm)",
  studio: "A1 (59.5 × 59.5 cm)",
};
const TIER_EDITION: Record<string, string> = {
  atelier: "Open Edition — issued within each drop",
  collector: "Collector Drop — allocation of 200 per drop",
  "atelier-grande": "Atelier Drop — allocation of 75 per drop",
  heirloom: "Heirloom Drop — allocation of 18 per drop",
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
// Gift e-voucher minter (mirrors the thank-you-code minter's Stripe SDK shape —
// gotcha #5 self-contained). Difference vs the thank-you code: this is an
// AMOUNT-OFF coupon (the gift value the buyer paid), single-use, ~12-month
// validity, with a readable GIFT-XXXXXX promotion code. The promotionCodes
// call shape MUST match createThankYouCode above (promotion: { type, coupon })
// — do NOT regress it to the legacy positional `coupon` argument.
// ---------------------------------------------------------------------------
interface GiftCard {
  /** Pence value the buyer paid — equals the coupon's amount_off to the penny. */
  amountPence: number;
  /** Optional — who the gift is for. */
  recipientEmail?: string;
  recipientName?: string;
  /** Optional — the buyer's personal note to the recipient. */
  giftMessage?: string;
}
interface MintedGiftCard {
  code: string; // GIFT-XXXXXX
  amountPence: number;
  amountLabel: string; // formatted GBP, e.g. "£50.00"
  expiresLabel: string; // human date ~12 months out
}
const GIFT_VALID_DAYS = 365;
const GIFT_PREFIX = "GIFT";
// Same unambiguous alphabet as the thank-you code (no 0/O/1/I).
const GIFT_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const giftSuffix = (length = 6): string => {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += GIFT_ALPHABET[Math.floor(Math.random() * GIFT_ALPHABET.length)];
  }
  return out;
};
const createGiftCard = async (
  stripe: Stripe,
  {
    sessionId,
    buyerEmail,
    amountPence,
    index,
  }: {
    sessionId: string;
    buyerEmail: string | null;
    amountPence: number;
    index: number;
  },
): Promise<MintedGiftCard> => {
  const expiresAt = new Date(Date.now() + GIFT_VALID_DAYS * 24 * 60 * 60 * 1000);
  const expiresUnix = Math.floor(expiresAt.getTime() / 1000);
  // INVARIANT: the minted gift value MUST equal the amount the buyer was
  // charged for this gift line, to the penny. amount_off IS amountPence.
  const coupon = await stripe.coupons.create({
    amount_off: amountPence,
    currency: "gbp",
    duration: "once",
    max_redemptions: 1,
    redeem_by: expiresUnix,
    name: "Estate gift card",
    metadata: {
      kind: "gift_card",
      session_id: sessionId,
      gift_index: String(index),
      amount_pence: String(amountPence),
      buyer_email: buyerEmail ?? "",
    },
  });
  let promoErr: unknown = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const code = `${GIFT_PREFIX}-${giftSuffix()}`;
    try {
      // Match createThankYouCode's promotionCodes.create shape EXACTLY
      // (promotion: { type: "coupon", coupon }) — the installed SDK's working
      // call. Do NOT regress to a positional `coupon` field (gotcha).
      await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: coupon.id },
        code,
        max_redemptions: 1,
        expires_at: expiresUnix,
        metadata: {
          kind: "gift_card",
          session_id: sessionId,
          gift_index: String(index),
          amount_pence: String(amountPence),
          buyer_email: buyerEmail ?? "",
        },
      });
      return {
        code,
        amountPence,
        amountLabel: formatGBP(amountPence),
        expiresLabel: expiresAt.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };
    } catch (err) {
      promoErr = err;
      const message = err instanceof Error ? err.message : "";
      // Only retry on a code collision; any other error is terminal.
      if (!message.includes("code_already_exists") && !message.includes("already exists")) break;
    }
  }
  throw promoErr instanceof Error
    ? promoErr
    : new Error("Failed to create gift promotion code.");
};

// ---------------------------------------------------------------------------
// Gift line-item parser. The checkout handler marks gift-card purchases in the
// session metadata. We accept TWO shapes for resilience against the parallel
// checkout agent's exact wire format:
//   (A) A JSON blob:  gift_cards = '[{"amountPence":5000,"recipientEmail":"…",
//                                      "recipientName":"…","giftMessage":"…"}, …]'
//   (B) Comma-joined parallel arrays (mirrors the multi-item print shape):
//         gift_card_count        = "2"
//         gift_amounts_pence     = "5000,10000"
//         gift_recipient_emails  = "a@x.com,"      (empty slot = no recipient)
//         gift_recipient_names   = "Ada,"
//         gift_messages          = "Happy birthday|"   (pipe-joined; see note)
// Comma is the array separator everywhere else in this file, so gift MESSAGES
// (which may contain commas) are pipe-separated in shape (B). Either shape
// yields the same GiftCard[]. Returns [] when there are no gift cards.
// ---------------------------------------------------------------------------
const cleanStr = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
};
const parseGiftCards = (m: Stripe.Metadata | null): GiftCard[] => {
  if (!m) return [];

  // Shape (A): a JSON blob.
  const blob = cleanStr(m.gift_cards);
  if (blob) {
    try {
      const arr = JSON.parse(blob);
      if (Array.isArray(arr)) {
        return arr
          .map((raw): GiftCard | null => {
            const amountPence = Math.round(
              Number(
                (raw && (raw.amountPence ?? raw.amount_pence ?? raw.amount)) ?? NaN,
              ),
            );
            if (!Number.isFinite(amountPence) || amountPence <= 0) return null;
            return {
              amountPence,
              recipientEmail: cleanStr(raw.recipientEmail ?? raw.recipient_email),
              recipientName: cleanStr(raw.recipientName ?? raw.recipient_name),
              giftMessage: cleanStr(raw.giftMessage ?? raw.gift_message),
            };
          })
          .filter((g): g is GiftCard => g !== null);
      }
    } catch {
      // fall through to shape (B)
    }
  }

  // Shape (B): comma-joined parallel arrays.
  const amounts = (m.gift_amounts_pence || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (amounts.length === 0) return [];
  // Recipient email/name are comma-joined; messages are pipe-joined (may hold
  // commas). Keep empty slots positional by NOT filtering them out.
  const splitKeepEmpties = (raw: string | undefined, sep: string): string[] =>
    (raw || "").split(sep).map((s) => s.trim());
  const emails = splitKeepEmpties(m.gift_recipient_emails, ",");
  const names = splitKeepEmpties(m.gift_recipient_names, ",");
  const messages = splitKeepEmpties(m.gift_messages, "|");
  return amounts
    .map((a, idx): GiftCard | null => {
      const amountPence = Math.round(Number(a));
      if (!Number.isFinite(amountPence) || amountPence <= 0) return null;
      return {
        amountPence,
        recipientEmail: cleanStr(emails[idx]),
        recipientName: cleanStr(names[idx]),
        giftMessage: cleanStr(messages[idx]),
      };
    })
    .filter((g): g is GiftCard => g !== null);
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
    numbering: "Numbered within its drop",
    coa: "Ships with a Certificate of Authenticity carrying a unique Certificate ID",
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
// Inlined gift e-voucher email → HTML string. Same dark estate palette + the
// shared esc() / SANS / DISPLAY utils as the order-confirmation email above
// (gotcha #5 — inline, do not import). Sent either to the named recipient (with
// the buyer's note) or, when no recipient was given, back to the buyer to
// forward. The estate is always BCC'd for a paper trail.
// ---------------------------------------------------------------------------
const renderGiftHtml = (p: {
  /** true → addressed to the recipient; false → addressed to the buyer. */
  toRecipient: boolean;
  recipientName?: string | null;
  buyerName?: string | null;
  giftMessage?: string | null;
  code: string; // GIFT-XXXXXX
  amountLabel: string; // formatted GBP
  expiresLabel: string;
  estateEmail: string;
  orderRef: string;
}): string => {
  const firstOf = (name: string | null | undefined, fallback: string): string => {
    const t = (name ?? "").trim();
    return t ? esc(t.split(/\s+/)[0]) : fallback;
  };
  const recipientFirst = firstOf(p.recipientName, "there");
  const buyerFull = (p.buyerName ?? "").trim();
  const buyerLabel = buyerFull ? esc(buyerFull) : "someone who cares for you";
  const s = {
    page: `background-color:#0a0908;margin:0;padding:32px 16px;font-family:${SANS};color:#ede6d6;`,
    shell: `max-width:560px;margin:0 auto;background-color:#0a0908;padding:0;`,
    eyebrow: `font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.34em;text-transform:uppercase;color:#c97844;margin:0 0 18px 0;`,
    heading: `font-family:${DISPLAY};font-weight:700;letter-spacing:-0.02em;font-size:34px;line-height:1.12;color:#ede6d6;margin:0 0 24px 0;`,
    subheading: `font-family:${DISPLAY};font-weight:700;letter-spacing:-0.01em;font-size:20px;line-height:1.25;color:#ede6d6;margin:32px 0 12px 0;`,
    body: `font-family:${SANS};font-size:15px;line-height:1.7;color:rgba(237,230,214,0.78);margin:0 0 16px 0;`,
    small: `font-family:${SANS};font-size:12px;line-height:1.65;color:rgba(237,230,214,0.55);margin:0 0 10px 0;`,
    divider: `border:0;border-top:1px solid rgba(237,230,214,0.18);margin:28px 0;`,
    giftCard: `background-color:#15120f;border:1px solid #c97844;border-radius:4px;padding:28px 22px;margin:28px 0;text-align:center;`,
    amount: `font-family:${DISPLAY};font-weight:700;font-size:40px;line-height:1;color:#ede6d6;margin:0 0 6px 0;`,
    code: `font-family:"SF Mono","Menlo","Consolas",monospace;font-size:22px;font-weight:600;letter-spacing:0.22em;color:#c97844;margin:14px 0 12px 0;display:block;`,
    note: `font-family:${DISPLAY};font-style:italic;font-size:16px;line-height:1.6;color:#ede6d6;margin:0;`,
    noteCard: `background-color:#15120f;border:1px solid rgba(237,230,214,0.18);border-radius:4px;padding:20px 22px;margin:20px 0;`,
    signoff: `font-family:${DISPLAY};font-style:italic;font-size:16px;color:#ede6d6;margin:24px 0 4px 0;`,
    footer: `font-family:${SANS};font-size:11px;line-height:1.7;color:rgba(237,230,214,0.55);text-align:center;margin:32px 0 0 0;`,
    link: `color:#c97844;text-decoration:underline;`,
  };

  const greeting = p.toRecipient
    ? `Dear ${recipientFirst},`
    : `Thank you, ${firstOf(p.buyerName, "there")}.`;

  const intro = p.toRecipient
    ? `<p style="${s.body}">${buyerLabel} has given you a gift from <em>The Art of Stephen Meakin</em> — a credit towards a signed, estate-stamped giclée print of one of Stephen's mandalas, each one made to order at Point 101 in London.</p>`
    : `<p style="${s.body}">Your gift card for <em>The Art of Stephen Meakin</em> is ready. Below is the code and how it's redeemed — forward this email to whomever it's for, or keep it for yourself.</p>`;

  const noteHtml =
    p.toRecipient && cleanStr(p.giftMessage ?? undefined)
      ? `<div style="${s.noteCard}">`
        + `<p style="${s.eyebrow}color:rgba(237,230,214,0.55);margin:0 0 12px 0;">A note from ${buyerLabel}</p>`
        + `<p style="${s.note}">${esc((p.giftMessage ?? "").trim())}</p>`
        + `</div>`
      : "";

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="dark only"/><title>A gift from the Stephen Meakin estate</title></head>`
    + `<body style="${s.page}"><div style="${s.shell}">`
    + `<p style="${s.eyebrow}">The Mandala Company · The estate of Stephen Meakin</p>`
    + `<h1 style="${s.heading}">${greeting}</h1>`
    + intro
    + noteHtml
    + `<div style="${s.giftCard}">`
    + `<p style="${s.eyebrow}color:rgba(237,230,214,0.55);margin:0 0 12px 0;">Your gift card</p>`
    + `<p style="${s.amount}">${esc(p.amountLabel)}</p>`
    + `<p style="${s.small}margin:0 0 4px 0;">towards a signed estate print</p>`
    + `<code style="${s.code}">${esc(p.code)}</code>`
    + `<p style="${s.small}margin:0;">Valid until ${esc(p.expiresLabel)}.</p>`
    + `</div>`
    + `<h2 style="${s.subheading}">How to redeem</h2>`
    + `<p style="${s.body}">Choose a print at <a href="https://themandalacompany.com/collections" style="${s.link}">themandalacompany.com</a>, then enter the code <strong style="color:#ede6d6;">${esc(p.code)}</strong> at checkout. It covers a single order — for example, an A2 Collector's Edition print — and the gift value is taken off the total. If the print costs more than the gift, you simply pay the difference; if less, the gift covers it in full.</p>`
    + `<p style="${s.small}">The code is single-use and applies to one order. There's no need to spend it all at once on shipping or add-ons — just pick the piece that speaks to you.</p>`
    + `<p style="${s.signoff}">With warmth from the estate,</p>`
    + `<p style="${s.body}font-style:italic;margin:0;">— Archie, for The Mandala Company</p>`
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.footer}">Questions — <a href="mailto:${esc(p.estateEmail)}" style="${s.link}">${esc(p.estateEmail)}</a><br/>Reference: ${esc(p.orderRef)}<br/>The Art of Stephen Meakin · Lewes, East Sussex</p>`
    + `</div></body></html>`;
};

// ---------------------------------------------------------------------------
// Inlined basket-held recovery email → HTML string (checkout.session.expired).
// Same dark estate palette + shared esc() / SANS / DISPLAY utils as the
// order-confirmation email above (gotcha #5 — inline, do not import). Register:
// quiet, zero pressure — NO discounts, NO countdowns, NO "don't miss out".
// Sent ONLY when the buyer ticked Stripe's promotions consent (opt_in), the
// session carries a recovery URL, and we have their email.
// ---------------------------------------------------------------------------
const renderBasketHeldHtml = (p: {
  buyerName?: string | null;
  recoveryUrl: string;
  estateEmail: string;
  orderRef: string;
}): string => {
  const first = (() => {
    const t = (p.buyerName ?? "").trim();
    return t ? esc(t.split(/\s+/)[0]) : "there";
  })();
  const s = {
    page: `background-color:#0a0908;margin:0;padding:32px 16px;font-family:${SANS};color:#ede6d6;`,
    shell: `max-width:560px;margin:0 auto;background-color:#0a0908;padding:0;`,
    eyebrow: `font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.34em;text-transform:uppercase;color:#c97844;margin:0 0 18px 0;`,
    heading: `font-family:${DISPLAY};font-weight:700;letter-spacing:-0.02em;font-size:34px;line-height:1.12;color:#ede6d6;margin:0 0 24px 0;`,
    body: `font-family:${SANS};font-size:15px;line-height:1.7;color:rgba(237,230,214,0.78);margin:0 0 16px 0;`,
    small: `font-family:${SANS};font-size:12px;line-height:1.65;color:rgba(237,230,214,0.55);margin:0 0 10px 0;`,
    divider: `border:0;border-top:1px solid rgba(237,230,214,0.18);margin:28px 0;`,
    card: `background-color:#15120f;border:1px solid rgba(237,230,214,0.18);border-radius:4px;padding:28px 22px;margin:24px 0;text-align:center;`,
    button: `display:inline-block;background-color:#ede6d6;color:#0a0908;font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;padding:14px 30px;border-radius:4px;`,
    signoff: `font-family:${DISPLAY};font-style:italic;font-size:16px;color:#ede6d6;margin:24px 0 4px 0;`,
    footer: `font-family:${SANS};font-size:11px;line-height:1.7;color:rgba(237,230,214,0.55);text-align:center;margin:32px 0 0 0;`,
    link: `color:#c97844;text-decoration:underline;`,
  };
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="dark only"/><title>Your basket is still held — The Art of Stephen Meakin</title></head>`
    + `<body style="${s.page}"><div style="${s.shell}">`
    + `<p style="${s.eyebrow}">The Mandala Company · The estate of Stephen Meakin</p>`
    + `<h1 style="${s.heading}">Hello, ${first}.</h1>`
    + `<p style="${s.body}">The pieces you were considering from <em>The Art of Stephen Meakin</em> are still held in your basket. If you'd like to pick up where you left off, your checkout is here.</p>`
    + `<div style="${s.card}">`
    + `<a href="${esc(p.recoveryUrl)}" style="${s.button}">Return to your checkout</a>`
    + `</div>`
    + `<p style="${s.small}">The link above stays live for thirty days, then quietly expires. And if you've decided it isn't for you, there's nothing to do — this is the only note we'll send.</p>`
    + `<p style="${s.signoff}">With love from the estate,</p>`
    + `<p style="${s.body}font-style:italic;margin:0;">— Archie, for The Mandala Company</p>`
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.footer}">Questions, or anything to flag — <a href="mailto:${esc(p.estateEmail)}" style="${s.link}">${esc(p.estateEmail)}</a><br/>Reference: ${esc(p.orderRef)}<br/>The Art of Stephen Meakin · Lewes, East Sussex</p>`
    + `</div></body></html>`;
};

// ---------------------------------------------------------------------------
// Klaviyo (CRM / revenue flows) — BEST-EFFORT, ENV-GUARDED, SELF-CONTAINED.
// ---------------------------------------------------------------------------
// Klaviyo is the estate's marketing CRM (post-purchase + revenue flows /
// analytics / segmentation). Resend stays the transactional sender — Klaviyo is
// purely additive here. This block is INLINED (gotcha #5: no /api local imports)
// and fully guarded on process.env.KLAVIYO_API_KEY: absent → clean no-op. Each
// call is try/catch'd by the caller so a Klaviyo outage can NEVER break the
// order flow, and the webhook ALWAYS returns 200.
//
// Current Klaviyo REST API (auth `Authorization: Klaviyo-API-Key <key>` + dated
// `revision` header) via Node 18+ global fetch.
//   - Create Event ("Placed Order"): feeds the Post-Purchase flow + revenue
//     analytics. The event's profile block auto-creates/updates the buyer's
//     Klaviyo profile, so this both records the order and upserts the customer.
//   - Create/Update Profile: a small extra best-effort upsert so the buyer's
//     name lands on the profile even if the event's profile attrs are sparse.
const KLAVIYO_API_BASE = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2026-04-15";

const klaviyoHeaders = (apiKey: string): Record<string, string> => ({
  Authorization: `Klaviyo-API-Key ${apiKey}`,
  revision: KLAVIYO_REVISION,
  accept: "application/json",
  "content-type": "application/json",
});

const splitName = (
  name: string | null,
): { firstName?: string; lastName?: string } => {
  const parts = (name ?? "").split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || undefined,
    lastName: parts.slice(1).join(" ") || undefined,
  };
};

/**
 * Push a "Placed Order" event to Klaviyo. value is the order total in major
 * units (pounds), value_currency from the session. The properties carry a basic
 * line summary lifted from the session metadata for segmentation. unique_id is
 * the Stripe session id so Klaviyo dedupes retried webhooks. The profile block
 * auto-upserts the buyer.
 */
const klaviyoPlacedOrderEvent = async (
  apiKey: string,
  args: {
    email: string;
    name: string | null;
    sessionId: string;
    amountTotalPence: number | null | undefined;
    currency: string | null | undefined;
    lines: EmailLine[];
  },
): Promise<void> => {
  const { firstName, lastName } = splitName(args.name);
  const value =
    typeof args.amountTotalPence === "number"
      ? Math.round(args.amountTotalPence) / 100
      : undefined;
  const currency = (args.currency || "gbp").toUpperCase();
  const itemNames = args.lines.map((l) =>
    [l.title, l.colourway].filter(Boolean).join(" — "),
  );
  const items = args.lines.map((l) => ({
    title: l.title,
    colourway: l.colourway,
    tier: l.tierLabel,
    edition: l.editionLabel,
    size: l.size,
    framing: !!l.framing,
    embellished: !!l.embellished,
  }));
  const body = {
    data: {
      type: "event",
      attributes: {
        metric: {
          data: { type: "metric", attributes: { name: "Placed Order" } },
        },
        profile: {
          data: {
            type: "profile",
            attributes: {
              email: args.email,
              ...(firstName ? { first_name: firstName } : {}),
              ...(lastName ? { last_name: lastName } : {}),
            },
          },
        },
        properties: {
          OrderId: args.sessionId,
          ItemNames: itemNames,
          Items: items,
          ItemCount: args.lines.length,
          source: "stripe-checkout",
        },
        ...(value !== undefined ? { value } : {}),
        value_currency: currency,
        unique_id: args.sessionId,
      },
    },
  };
  const resp = await fetch(`${KLAVIYO_API_BASE}/events`, {
    method: "POST",
    headers: klaviyoHeaders(apiKey),
    body: JSON.stringify(body),
  });
  // 202 Accepted is the success status; 409 = duplicate (already accepted).
  if (!resp.ok && resp.status !== 409) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Klaviyo event ${resp.status}: ${text.slice(0, 300)}`);
  }
};

/**
 * Best-effort customer profile upsert. Create Profile returns 409 when the
 * profile already exists — fine for our purposes, so we treat it as success.
 */
const klaviyoUpsertProfile = async (
  apiKey: string,
  email: string,
  name: string | null,
): Promise<void> => {
  const { firstName, lastName } = splitName(name);
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
  if (!resp.ok && resp.status !== 409) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Klaviyo profile upsert ${resp.status}: ${text.slice(0, 300)}`);
  }
};

// ---------------------------------------------------------------------------
// Meta Conversions API (server-side Purchase) — BEST-EFFORT, ENV-GUARDED,
// SELF-CONTAINED (gotcha #5: inlined, node:crypto + global fetch only).
// ---------------------------------------------------------------------------
// Guarded on BOTH META_PIXEL_ID + META_CAPI_ACCESS_TOKEN — either absent is a
// clean silent no-op. event_id is the Stripe checkout session id: that's the
// browser/server dedup key (in v1 the browser does NOT fire Purchase at all —
// CAPI is the sole Purchase source, so Meta sees exactly one event per order
// even across webhook retries). The only user_data identifier we send is the
// buyer's email, sha256-hexed after trim + lowercase, per Meta's hashing spec.
const META_GRAPH_VERSION = "v21.0";

const sha256Hex = (input: string): string =>
  createHash("sha256").update(input, "utf8").digest("hex");

const metaCapiPurchase = async (args: {
  pixelId: string;
  accessToken: string;
  sessionId: string;
  email: string;
  amountTotalPence: number | null | undefined;
  currency: string | null | undefined;
}): Promise<void> => {
  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: args.sessionId,
        action_source: "website",
        event_source_url: "https://themandalacompany.com/order/success",
        user_data: {
          em: [sha256Hex(args.email.trim().toLowerCase())],
        },
        custom_data: {
          value: (args.amountTotalPence ?? 0) / 100,
          currency: (args.currency || "gbp").toUpperCase(),
        },
      },
    ],
    access_token: args.accessToken,
  };
  const resp = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${args.pixelId}/events`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Meta CAPI ${resp.status}: ${text.slice(0, 300)}`);
  }
};

// ---------------------------------------------------------------------------
// ESTATE LEDGER — the single source of truth for provenance (issued on order)
// ---------------------------------------------------------------------------
// Each purchased print gets a non-guessable Certificate ID and, for numbered
// tiers, the next SEQUENTIAL print number WITHIN ITS DROP — written to Vercel
// KV / Upstash (already provisioned for memories + webhook dedup). A Supabase
// migration is a documented drop-in upgrade (supabase/estate_ledger.sql). Keys:
//   ledger:cert:<CERT_ID>                    → JSON LedgerEntry (the record)
//   ledger:seq:<artwork>:<tier>:<dropId>     → int via INCR    (atomic numbering)
//   ledger:order:<sessionId>:<lineIndex>     → CERT_ID         (idempotency)
// Self-contained (gotcha #5): inline raw-fetch Upstash REST, reusing
// kvDedupConfig(). FAIL-OPEN — missing env / KV error → returns [] and the order
// still completes; the webhook ALWAYS 200s. The /auth page + /api/auth-lookup
// read these same records back.

const LEDGER_DROP = { id: "drop-i", label: "Drop I" }; // mirror of CURRENT_DROP (paintings.ts)

// Open Edition (atelier) is NOT numbered; the others carry a per-drop allocation
// (mirror of PRINT_TIERS editionTotal — gotcha #9).
const TIER_ALLOCATION: Record<string, number | null> = {
  atelier: null,
  collector: 200,
  "atelier-grande": 75,
  heirloom: 18,
  studio: 1,
};

// 3-letter artwork codes for the Certificate ID, e.g. MANDALA-OPI-7F3K91.
const ARTWORK_CODE: Record<string, string> = {
  "wild-rose": "WRO",
  "english-bluebells": "EBB",
  "orchis-7": "OR7",
  "flower-of-life": "FOL",
  "slipper-orchids": "SLO",
  "peacock-minerva": "PCK",
  "ophiuchus": "OPI",
  "tridecagon-moon-star": "TMS",
  "lulin": "LUL",
  "enneagon-swans": "ENS",
};

// Crockford base32 (no I/L/O/U) — unambiguous read off a printed certificate.
const CERT_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const certSuffix = (len = 6): string => {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i += 1) out += CERT_ALPHABET[bytes[i] % CERT_ALPHABET.length];
  return out;
};

interface LedgerEntry {
  certificate_id: string;
  artwork_id: string;
  artwork_name: string;
  colourway: string;
  drop_id: string;
  drop_label: string;
  tier_id: string;
  tier_label: string;
  print_number: number | null;
  allocation: number | null;
  issued_date: string; // ISO 8601
  order_id: string;
  status: string;
}

// Generic Upstash REST command (mirror of kvClaimEventId's transport). Returns
// the `result`, or null on any error / timeout (fail-open).
async function kvCmd(cmd: (string | number)[]): Promise<unknown> {
  const cfg = kvDedupConfig();
  if (!cfg) return null;
  try {
    const resp = await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cmd.map(String)),
      signal: AbortSignal.timeout(2500),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { result?: unknown; error?: string };
    if (json.error) return null;
    return json.result ?? null;
  } catch {
    return null;
  }
}

// Parse the PRINT lines (painting_id / tier_id / colourway / title) out of the
// session metadata — handles BOTH the single-item and multi-item shapes
// checkout.ts writes. Gift lines (no painting_id) are excluded.
const ledgerLinesFromMetadata = (
  m: Stripe.Metadata | null,
): Array<{ paintingId: string; tierId: string; colourway: string; title: string }> => {
  if (!m) return [];
  if (m.painting_id && !m.painting_ids) {
    return [
      {
        paintingId: m.painting_id,
        tierId: m.tier_id || "collector",
        colourway: m.colourway_name || "Original",
        title: m.painting_title || m.painting_id,
      },
    ];
  }
  const ids = (m.painting_ids || "").split(",").map((s) => s.trim()).filter(Boolean);
  const tiers = (m.tier_ids || "").split(",").map((s) => s.trim());
  const cols = (m.colourway_names || "").split(",").map((s) => s.trim());
  const titles = (m.painting_titles || "").split(",").map((s) => s.trim());
  return ids.map((paintingId, i) => ({
    paintingId,
    tierId: tiers[i] || "collector",
    colourway: cols[i] || "Original",
    title: titles[i] || paintingId,
  }));
};

// Issue (or, on a retry, re-read) a ledger entry for every print line in the
// order. Idempotent per (sessionId, lineIndex) via a KV claim key, so a Stripe
// redelivery can never double-issue a certificate or burn a print number.
async function issueLedgerEntries(
  sessionId: string,
  m: Stripe.Metadata | null,
): Promise<LedgerEntry[]> {
  if (!kvDedupConfig()) {
    console.warn(
      "[stripe-webhook] estate ledger: KV not configured — certificates NOT issued for",
      sessionId,
    );
    return [];
  }
  const lines = ledgerLinesFromMetadata(m);
  const out: LedgerEntry[] = [];
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    const idemKey = `ledger:order:${sessionId}:${idx}`;
    try {
      // Idempotency: if this line already issued a certificate, re-read + reuse.
      const existingCert = await kvCmd(["GET", idemKey]);
      if (typeof existingCert === "string" && existingCert) {
        const rec = await kvCmd(["GET", `ledger:cert:${existingCert}`]);
        if (typeof rec === "string") {
          try {
            out.push(JSON.parse(rec) as LedgerEntry);
          } catch {
            /* corrupt record — skip, but don't re-issue under a new id */
          }
        }
        continue;
      }
      const allocation = TIER_ALLOCATION[line.tierId] ?? null;
      // Open Edition (allocation null) is NOT numbered. Numbered tiers take the
      // next sequential number WITHIN THE DROP via an atomic INCR.
      let printNumber: number | null = null;
      if (allocation !== null) {
        const seq = await kvCmd([
          "INCR",
          `ledger:seq:${line.paintingId}:${line.tierId}:${LEDGER_DROP.id}`,
        ]);
        const n = typeof seq === "number" ? seq : Number(seq);
        printNumber = Number.isFinite(n) ? n : null;
      }
      const code =
        ARTWORK_CODE[line.paintingId] || line.paintingId.slice(0, 3).toUpperCase();
      const cert = `MANDALA-${code}-${certSuffix()}`;
      const entry: LedgerEntry = {
        certificate_id: cert,
        artwork_id: line.paintingId,
        artwork_name: line.title,
        colourway: line.colourway,
        drop_id: LEDGER_DROP.id,
        drop_label: LEDGER_DROP.label,
        tier_id: line.tierId,
        tier_label: TIER_LABEL[line.tierId] || line.tierId,
        print_number: printNumber,
        allocation,
        issued_date: new Date().toISOString(),
        order_id: sessionId,
        status: "issued",
      };
      // Write the record FIRST, then claim the idempotency key (so a crash
      // between the two re-issues cleanly on retry rather than orphaning a key).
      await kvCmd(["SET", `ledger:cert:${cert}`, JSON.stringify(entry)]);
      await kvCmd(["SET", idemKey, cert]);
      out.push(entry);
      console.log("[stripe-webhook] estate ledger entry issued", {
        order_id: sessionId,
        cert,
        artwork: line.paintingId,
        tier: line.tierId,
        print_number: printNumber,
        allocation,
      });
    } catch (err) {
      console.error(
        "[stripe-webhook] estate ledger write failed for line",
        idx,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return out;
}

// Format a print number for display, e.g. 37 + allocation 150 → "037/150".
const formatPrintNo = (e: LedgerEntry): string => {
  if (e.print_number === null) return "—";
  const n = String(e.print_number).padStart(3, "0");
  return e.allocation ? `${n}/${e.allocation}` : n;
};

// The estate fulfilment email — the structured Point 101 payload. Plain,
// utilitarian (this goes to the estate inbox, not a buyer): one row per print,
// carrying everything needed to print the COA + back-of-print label and place
// the Point 101 order. The /auth URL is the QR target for that print's COA.
const renderEstateFulfilmentHtml = (p: {
  orderRef: string;
  shippingName?: string | null;
  entries: LedgerEntry[];
  siteUrl: string;
}): string => {
  const rows = p.entries
    .map((e) => {
      const authUrl = `${p.siteUrl}/auth/${e.certificate_id}`;
      const cell = "padding:8px 10px;border-top:1px solid #ddd;vertical-align:top;";
      return (
        `<tr>` +
        `<td style="${cell}">${esc(e.artwork_name)}<br/><span style="color:#666;">${esc(e.colourway)}</span></td>` +
        `<td style="${cell}">${esc(e.tier_label)}</td>` +
        `<td style="${cell}">${esc(e.drop_label)}</td>` +
        `<td style="${cell}">${formatPrintNo(e)}</td>` +
        `<td style="${cell}font-family:monospace;">${esc(e.certificate_id)}</td>` +
        `<td style="${cell}"><a href="${authUrl}">${esc(authUrl)}</a></td>` +
        `</tr>`
      );
    })
    .join("");
  const th = "padding:8px 10px;text-align:left;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#666;";
  return (
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/></head>` +
    `<body style="font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;padding:24px;">` +
    `<h2 style="margin:0 0 4px 0;">Estate fulfilment — Point 101 print instructions</h2>` +
    `<p style="margin:0 0 16px 0;color:#444;">Order <strong>${esc(p.orderRef)}</strong>` +
    (p.shippingName ? ` · ship to <strong>${esc(p.shippingName)}</strong>` : "") +
    `</p>` +
    `<p style="margin:0 0 16px 0;color:#444;">Each line below has been issued a Certificate ID and (for numbered tiers) the next sequential print number within its drop, recorded in the estate ledger. Generate the Certificate of Authenticity + back-of-print label for each, then place the Point 101 order with the buyer's shipping address.</p>` +
    `<table style="border-collapse:collapse;width:100%;font-size:13px;">` +
    `<thead><tr>` +
    `<th style="${th}">Artwork</th><th style="${th}">Tier</th><th style="${th}">Drop</th>` +
    `<th style="${th}">Print&nbsp;No.</th><th style="${th}">Certificate&nbsp;ID</th><th style="${th}">Verify&nbsp;URL (QR target)</th>` +
    `</tr></thead><tbody>${rows}</tbody></table>` +
    `<p style="margin:18px 0 0 0;font-size:12px;color:#888;">The Mandala Company · estate ledger · generated automatically on payment.</p>` +
    `</body></html>`
  );
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
  // Layer 1 — DURABLE: atomically claim the event id in Vercel KV / Upstash
  // ("SET stripe_evt:<id> 1 NX EX 86400", single round-trip). Survives cold
  // starts and cross-region replicas, so a Stripe retry can't re-send the
  // confirmation email or re-mint codes. FAIL-OPEN: "unavailable" (no env
  // vars / KV error / ~2s timeout) falls through to layer 2 below — KV never
  // blocks the webhook, and we still ALWAYS 200 verified events.
  const kvClaim = await kvClaimEventId(event.id);
  if (kvClaim === "duplicate") {
    console.log("[stripe-webhook] duplicate event id (KV), skipping", {
      event_id: event.id,
      type: event.type,
    });
    return ok();
  }

  // Layer 2 — in-memory (best-effort), kept REGARDLESS of the KV outcome: it
  // is the only dedup when KV is unconfigured or down, and it cheaply catches
  // same-instance retries during a KV blip. If we've already seen this exact
  // event id on this warm instance, return 200 immediately without re-running
  // side effects (Resend send, coupon mint). Stripe stops retrying on a 200.
  cleanSeenEvents();
  if (seenEvents.has(event.id)) {
    console.log("[stripe-webhook] duplicate event id, skipping", {
      event_id: event.id,
      type: event.type,
      kv: kvClaim,
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

      // -- 0. Gift e-vouchers -----------------------------------------------
      // Run BEFORE the print confirmation block (which has early `break`s when
      // RESEND_API_KEY / buyerEmail are missing) so gifts are always processed.
      // For each gift card purchased: mint an amount_off coupon + GIFT-XXXXXX
      // promotion code worth EXACTLY what the buyer paid, then email it to the
      // recipient (with the buyer's note) or back to the buyer. Every step is
      // try/catch'd per-card so one failure can't block the others or the
      // webhook — we ALWAYS return 200 (never make Stripe retry).
      const giftCards = parseGiftCards(m);
      if (giftCards.length > 0) {
        const resendKeyGift = process.env.RESEND_API_KEY;
        const fromEmailGift = process.env.ESTATE_FROM_EMAIL || DEFAULT_FROM;
        const bccEmailGift = process.env.ESTATE_BCC_EMAIL || DEFAULT_BCC;
        const resendGift = resendKeyGift ? new Resend(resendKeyGift) : null;
        if (!resendGift) {
          console.warn(
            "[stripe-webhook] RESEND_API_KEY missing — gift codes will be minted but the gift email cannot be sent.",
            { session_id: session.id, gift_count: giftCards.length },
          );
        }
        for (let i = 0; i < giftCards.length; i += 1) {
          const gift = giftCards[i];
          let minted: MintedGiftCard;
          try {
            minted = await createGiftCard(stripe, {
              sessionId: session.id,
              buyerEmail,
              amountPence: gift.amountPence,
              index: i,
            });
            // INVARIANT confirmed in the log: minted value == amount charged.
            console.log("[stripe-webhook] gift card minted", {
              session_id: session.id,
              gift_index: i,
              code: minted.code,
              amount_pence: minted.amountPence,
              charged_pence: gift.amountPence,
              value_matches_charge: minted.amountPence === gift.amountPence,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("[stripe-webhook] gift card mint failed:", message, {
              session_id: session.id,
              gift_index: i,
            });
            continue; // skip the email for a card we couldn't mint
          }

          // Send the dignified gift email. To the recipient if given (with the
          // buyer's note); else back to the buyer to forward. Estate BCC'd.
          if (!resendGift) continue;
          const toRecipient = !!gift.recipientEmail;
          const toAddress = gift.recipientEmail || buyerEmail;
          if (!toAddress) {
            console.warn(
              "[stripe-webhook] gift card has no recipient email AND no buyer email — code minted, email skipped.",
              { session_id: session.id, gift_index: i, code: minted.code },
            );
            continue;
          }
          try {
            const html = renderGiftHtml({
              toRecipient,
              recipientName: gift.recipientName ?? null,
              buyerName,
              giftMessage: gift.giftMessage ?? null,
              code: minted.code,
              amountLabel: minted.amountLabel,
              expiresLabel: minted.expiresLabel,
              estateEmail: DEFAULT_FROM,
              orderRef: session.id.slice(0, 18) + "…",
            });
            const subject = toRecipient
              ? `A gift for you — ${minted.amountLabel} towards a Stephen Meakin print`
              : `Your gift card — ${minted.amountLabel} for The Art of Stephen Meakin`;
            const giftSend = await resendGift.emails.send({
              from: `${FROM_NAME} <${fromEmailGift}>`,
              to: [toAddress],
              bcc:
                bccEmailGift && bccEmailGift.toLowerCase() !== fromEmailGift.toLowerCase()
                  ? [bccEmailGift]
                  : undefined,
              replyTo: DEFAULT_FROM,
              subject,
              html,
            });
            if (giftSend.error) {
              console.error("[stripe-webhook] gift email Resend error:", giftSend.error, {
                session_id: session.id,
                gift_index: i,
                code: minted.code,
              });
            } else {
              console.log("[stripe-webhook] gift email sent", {
                session_id: session.id,
                gift_index: i,
                code: minted.code,
                to: toAddress,
                to_recipient: toRecipient,
                resend_id: giftSend.data?.id,
              });
            }
          } catch (err) {
            // Swallow all email errors — never fail the webhook on email send.
            const message = err instanceof Error ? err.message : String(err);
            console.error("[stripe-webhook] gift email failed:", message, {
              session_id: session.id,
              gift_index: i,
              code: minted.code,
            });
          }
        }
      }

      // -- 0b. Klaviyo "Placed Order" event + customer upsert ---------------
      // Best-effort + env-guarded (no KLAVIYO_API_KEY → clean no-op). Runs here
      // BEFORE the confirmation-email block, which has early `break`s when
      // RESEND_API_KEY / buyerEmail are missing — so the CRM sync isn't tied to
      // the email path. Feeds the Post-Purchase flow + revenue analytics +
      // segmentation. Every call is try/catch'd; the webhook ALWAYS returns 200
      // regardless of Klaviyo's outcome (Stripe must not retry on our errors).
      const klaviyoKey = process.env.KLAVIYO_API_KEY;
      if (klaviyoKey) {
        if (!buyerEmail) {
          console.warn(
            "[stripe-webhook] No buyer email on session — skipping Klaviyo sync.",
            { session_id: session.id },
          );
        } else {
          try {
            const klaviyoLines = linesFromMetadata(m, session.amount_subtotal);
            await klaviyoPlacedOrderEvent(klaviyoKey, {
              email: buyerEmail,
              name: buyerName,
              sessionId: session.id,
              amountTotalPence: session.amount_total,
              currency: session.currency,
              lines: klaviyoLines,
            });
            console.log("[stripe-webhook] klaviyo Placed Order event sent", {
              session_id: session.id,
              email: buyerEmail,
              value_pence: session.amount_total,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("[stripe-webhook] klaviyo event failed:", message, {
              session_id: session.id,
            });
          }
          // Extra best-effort profile upsert (name lands on the profile even if
          // the event's profile attrs were sparse). Independent try/catch.
          try {
            await klaviyoUpsertProfile(klaviyoKey, buyerEmail, buyerName);
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("[stripe-webhook] klaviyo profile upsert failed:", message, {
              session_id: session.id,
            });
          }
        }
      }

      // -- 0c. Meta Conversions API "Purchase" event -------------------------
      // Best-effort + env-guarded (META_PIXEL_ID / META_CAPI_ACCESS_TOKEN —
      // either absent → clean silent no-op). Runs here BEFORE the
      // confirmation-email block (which has early `break`s when
      // RESEND_API_KEY / buyerEmail are missing), like Klaviyo, so ad
      // attribution isn't tied to the email path. Try/catch'd; the webhook
      // ALWAYS returns 200 regardless of Meta's outcome.
      const metaPixelId = process.env.META_PIXEL_ID;
      const metaCapiToken = process.env.META_CAPI_ACCESS_TOKEN;
      if (metaPixelId && metaCapiToken) {
        if (!buyerEmail) {
          // Meta requires at least one user_data identifier — without the
          // buyer's email we have nothing to hash, so skip with a log.
          console.warn(
            "[stripe-webhook] No buyer email on session — skipping Meta CAPI Purchase.",
            { session_id: session.id },
          );
        } else {
          try {
            await metaCapiPurchase({
              pixelId: metaPixelId,
              accessToken: metaCapiToken,
              sessionId: session.id,
              email: buyerEmail,
              amountTotalPence: session.amount_total,
              currency: session.currency,
            });
            console.log("[stripe-webhook] meta CAPI Purchase sent", {
              session_id: session.id,
              value_pence: session.amount_total,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("[stripe-webhook] meta CAPI Purchase failed:", message, {
              session_id: session.id,
            });
          }
        }
      }

      // -- 0d. Estate ledger — issue Certificate IDs + print numbers --------
      // Writes a ledger entry per print line (idempotent per session+line),
      // then emails the estate the structured Point 101 fulfilment payload
      // (artwork, tier, drop, print number, Certificate ID, /auth verify URL —
      // the QR target). Fully fail-open: a KV/Resend outage logs + continues,
      // never blocking the 200. Gift-only orders have no print lines → no certs.
      let ledgerEntries: LedgerEntry[] = [];
      try {
        ledgerEntries = await issueLedgerEntries(session.id, m);
      } catch (err) {
        console.error(
          "[stripe-webhook] estate ledger issue failed:",
          err instanceof Error ? err.message : err,
        );
      }
      if (ledgerEntries.length > 0) {
        const siteUrlLedger = (
          process.env.SITE_URL || "https://themandalacompany.com"
        ).replace(/\/$/, "");
        // Log the structured payload regardless of email — durable audit trail.
        console.log("[stripe-webhook] estate ledger payload", {
          order_id: session.id,
          certificates: ledgerEntries.map((e) => ({
            cert: e.certificate_id,
            artwork: e.artwork_id,
            tier: e.tier_id,
            print_number: e.print_number,
            auth_url: `${siteUrlLedger}/auth/${e.certificate_id}`,
          })),
        });
        const resendKeyLedger = process.env.RESEND_API_KEY;
        if (resendKeyLedger) {
          try {
            const fromEmailL = process.env.ESTATE_FROM_EMAIL || DEFAULT_FROM;
            const toEmailL = process.env.ESTATE_BCC_EMAIL || DEFAULT_BCC;
            const resendL = new Resend(resendKeyLedger);
            const sendL = await resendL.emails.send({
              from: `${FROM_NAME} <${fromEmailL}>`,
              to: [toEmailL],
              replyTo: DEFAULT_FROM,
              subject: `Fulfilment — ${ledgerEntries.length} print${
                ledgerEntries.length > 1 ? "s" : ""
              } to place · order ${session.id.slice(0, 12)}…`,
              html: renderEstateFulfilmentHtml({
                orderRef: session.id,
                shippingName: shipping?.name ?? null,
                entries: ledgerEntries,
                siteUrl: siteUrlLedger,
              }),
            });
            if (sendL.error) {
              console.error(
                "[stripe-webhook] estate fulfilment email error:",
                sendL.error,
              );
            } else {
              console.log("[stripe-webhook] estate fulfilment email sent", {
                order_id: session.id,
                to: toEmailL,
                count: ledgerEntries.length,
              });
            }
          } catch (err) {
            console.error(
              "[stripe-webhook] estate fulfilment email failed:",
              err instanceof Error ? err.message : err,
            );
          }
        }
      }

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
    case "checkout.session.expired": {
      // A buyer started checkout but let it lapse. We send ONE quiet recovery
      // email — never a discount, never a countdown — and ONLY when ALL of:
      //   (a) Stripe minted a recovery URL (after_expiration.recovery.url —
      //       requires checkout.ts to request after_expiration recovery),
      //   (b) we have the buyer's email,
      //   (c) the buyer ticked Stripe's promotions consent ("opt_in") — this
      //       is a marketing touch, so explicit consent is non-negotiable,
      //   (d) RESEND_API_KEY is configured.
      // Anything missing → log + skip. Everything try/catch'd; ALWAYS 200.
      const session = event.data.object;
      const recoveryUrl = session.after_expiration?.recovery?.url ?? null;
      const buyerEmail =
        session.customer_details?.email ?? session.customer_email ?? null;
      const promotionsConsent = session.consent?.promotions ?? null;
      const resendKey = process.env.RESEND_API_KEY;

      if (!recoveryUrl || !buyerEmail || promotionsConsent !== "opt_in" || !resendKey) {
        console.log("[stripe-webhook] expired session — recovery email skipped", {
          session_id: session.id,
          has_recovery_url: !!recoveryUrl,
          has_buyer_email: !!buyerEmail,
          promotions_consent: promotionsConsent,
          has_resend_key: !!resendKey,
        });
        break;
      }

      try {
        const fromEmail = process.env.ESTATE_FROM_EMAIL || DEFAULT_FROM;
        const bccEmail = process.env.ESTATE_BCC_EMAIL || DEFAULT_BCC;
        const resend = new Resend(resendKey);

        const html = renderBasketHeldHtml({
          buyerName: session.customer_details?.name ?? null,
          recoveryUrl,
          estateEmail: DEFAULT_FROM,
          orderRef: session.id.slice(0, 18) + "…",
        });

        const sendResult = await resend.emails.send({
          from: `${FROM_NAME} <${fromEmail}>`,
          to: [buyerEmail],
          // BCC only if it's a different inbox to "from" (same rule as the
          // confirmation email) so the estate keeps its paper trail.
          bcc:
            bccEmail && bccEmail.toLowerCase() !== fromEmail.toLowerCase()
              ? [bccEmail]
              : undefined,
          replyTo: DEFAULT_FROM,
          subject: "Your basket is still held — The Art of Stephen Meakin",
          html,
        });

        if (sendResult.error) {
          console.error(
            "[stripe-webhook] basket-held recovery email Resend error:",
            sendResult.error,
            { session_id: session.id },
          );
        } else {
          console.log("[stripe-webhook] basket-held recovery email sent", {
            session_id: session.id,
            to: buyerEmail,
            resend_id: sendResult.data?.id,
          });
        }
      } catch (err) {
        // Swallow ALL errors — never fail the webhook on a recovery email.
        const message = err instanceof Error ? err.message : String(err);
        console.error("[stripe-webhook] basket-held recovery email failed:", message, {
          session_id: session.id,
        });
      }
      break;
    }
    default:
      console.log(`[stripe-webhook] Unhandled event: ${event.type}`);
  }

  return ok();
}
