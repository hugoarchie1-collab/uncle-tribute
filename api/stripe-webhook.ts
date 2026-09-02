/**
 * POST /api/stripe-webhook
 *
 * Stripe pings this endpoint when payment events fire. On a completed checkout
 * session we:
 *   1. Log the order to Vercel function logs (audit trail)
 *   2. Issue a Certificate ID + print number per print line (estate ledger)
 *      and email the estate its fulfilment payload
 *   3. Create a personal one-year "thank-you" promotion code for the buyer
 *      (10% off, single use) — skipped on gift-card and £0 orders
 *   4. Send an estate-branded confirmation email via Resend
 *   5. Mint + email any gift-card codes bought on the order — ONLY once paid
 *
 * ⚠️ THE GATE IS SPLIT BY RISK, on purpose (see the long note above
 * processPrintFulfilment). `checkout.session.completed` fires when the buyer
 * finishes checkout, NOT when the money lands: with Klarna / Clearpay live a
 * session completes with payment_status "unpaid" and settles later.
 *   • Steps 1-4 (PRINT FULFILMENT) run on `completed` regardless of
 *     payment_status, exactly as they always have. A paid print that is never
 *     made is unrecoverable; an unsettled one the estate can simply cancel.
 *   • Step 5 (GIFT CODES) waits for isSessionPaid() — payment_status "paid", or
 *     "no_payment_required" for a £0 order covered by a gift code. An unpaid
 *     session must never mint a live, 365-day, up-to-£5,000 code. The deferred
 *     mint arrives on `checkout.session.async_payment_succeeded`; meanwhile the
 *     estate is emailed an alert so a pending code is visible, not silent.
 * `checkout.session.async_payment_failed` revokes the codes the print path
 * already issued, VOIDS the ledger entries it burned, and tells the estate not
 * to fulfil. `charge.refunded` (in full) / `charge.dispute.created` deactivate
 * every code minted for that order — otherwise the estate returns the money AND
 * honours the card. ⚠️ A DISPUTE ONLY DEACTIVATES (reversible): the coupon is
 * deleted only on a settled full refund or a LOST dispute, and
 * `charge.dispute.closed` with status "won" REACTIVATES the codes.
 *
 * Duplicate-delivery protection (Stripe redelivers the same event id after
 * network blips / slow responses): each verified event id is claimed
 * atomically in Vercel KV / Upstash — one REST round-trip — BEFORE any side
 * effects run, so a retry can't re-send the confirmation email or re-mint
 * thank-you/gift codes even across cold starts and regions.
 *
 * ⚠️ THE CLAIM IS TWO-PHASE, on purpose. It is written as
 * "SET stripe_evt:<id> processing NX EX 120" — a SHORT-lived marker — and is
 * promoted to "done" (EX 86400) only once the work has actually finished, and
 * DELETED if the handler throws. A single long-lived claim taken before the
 * work meant that a lambda which died or timed out mid-mint (processGiftCards
 * makes ~6 sequential round trips per card, for up to 20 cards, AFTER print
 * fulfilment, and vercel.json sets no maxDuration) left the key behind: Stripe
 * retried, saw the key, returned 200 "duplicate", and the buyer's paid gift
 * card was NEVER minted, with nothing logged. The short TTL is the staleness
 * mechanism — no invocation can outlive it, so a marker still present is a
 * genuinely live delivery, and a later Stripe retry finds it expired and does
 * the work. A retry may therefore re-SEND an email; the code it carries is
 * byte-identical (every mint is idempotency-keyed), and a duplicate email is
 * far cheaper than a card that never arrives.
 *
 * FAIL-OPEN: if the KV env vars are absent, or KV errors or times out (~2s),
 * we fall back to the best-effort in-memory dedup and still process the event
 * — KV can never block or fail the webhook. The in-memory layer is kept
 * regardless, and mirrors the same two-phase shape (in-flight vs done).
 * (This resolves the CLAUDE.md P2 "durable webhook dedup" caveat whenever the
 * KV env vars are configured; without them, dedup is in-memory best-effort as
 * before.)
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
 * ⚠️HUGO — REQUIRED DASHBOARD CONFIG. This endpoint must be subscribed to:
 *   checkout.session.completed          (already on)
 *   checkout.session.expired            (already on)
 *   checkout.session.async_payment_succeeded   ← REQUIRED for Klarna/Clearpay
 *   checkout.session.async_payment_failed
 *   charge.refunded
 *   charge.dispute.created
 *   charge.dispute.closed          ← REQUIRED, or a WON dispute leaves the
 *                                    buyer's deactivated gift card dead
 * Prints are fulfilled without any of these (the `completed` event alone is
 * enough), but without async_payment_succeeded a GIFT CODE bought via Klarna /
 * Clearpay is never issued — the estate is emailed an alert in that case so it
 * can be issued by hand.
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
import { createHash, createHmac, randomBytes } from "node:crypto";
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
//
// ⚠️ TWO-PHASE, like the KV claim: `seenEvents` records only events whose work
// COMPLETED, and `inFlightEvents` holds the ids currently being processed on
// this instance (cleared in a finally). Recording an id up-front, as this layer
// used to, reproduced the KV bug locally — a warm instance that timed out
// mid-mint answered the retry "duplicate" and the gift card was never minted.
const SEEN_EVENT_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const SEEN_EVENT_MAX = 5000;
const seenEvents = new Map<string, number>();
const inFlightEvents = new Set<string>();
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
//   SET stripe_evt:<event.id> processing NX EX 120
// NX makes the write a claim — exactly one delivery wins the key; every retry
// (including on a different instance / region / after a cold start) sees
// "already exists" and is dropped before any side effects (Resend email,
// coupon mints) can re-run.
//
// ⚠️ THE CLAIM IS RELEASED IF THE WORK DOESN'T FINISH — do not collapse this
// back into a single long-lived SET. The marker's TTL is SHORT (120s, longer
// than any possible invocation, far shorter than Stripe's retry window) and is
// promoted to "done" EX 86400 (matching SEEN_EVENT_TTL_MS) only once the event
// has been fully processed; a thrown handler deletes it outright. Before this,
// a lambda that died between the claim and the mint left the key behind and
// every Stripe retry was answered "duplicate" — the buyer paid and no gift code
// was ever issued, silently. An expired "processing" marker IS the stale case:
// the key is simply gone, so the retry does the work.
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
// ⚠️ The in-flight marker's life. Must comfortably exceed the longest possible
// invocation (so two live deliveries never both process an event) and stay far
// under Stripe's retry window (so a killed lambda's claim is gone by the time
// the retry lands). Vercel caps a Node function at 60s; 120s is both.
const KV_PROCESSING_TTL_SECONDS = 120;
const KV_PROCESSING_MARKER = "processing";
const KV_DONE_MARKER = "done";
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
        KV_PROCESSING_MARKER,
        "NX",
        "EX",
        String(KV_PROCESSING_TTL_SECONDS),
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

/**
 * Phase 2 of the event claim: the work finished, so the short "processing"
 * marker becomes a 24h "done" marker and later retries are dropped for good.
 * Fail-open — a failed promotion just means the claim expires in 120s and a
 * Stripe retry re-does work that is idempotent anyway.
 */
async function kvPromoteEventId(eventId: string): Promise<void> {
  await kvCmd([
    "SET",
    `${KV_DEDUP_PREFIX}${eventId}`,
    KV_DONE_MARKER,
    "EX",
    String(KV_DEDUP_TTL_SECONDS),
  ]);
}

/**
 * Release the claim because the work threw. ⚠️ Without this a failed delivery
 * would hold the key for its full TTL and Stripe's retry — the only chance the
 * order has — would be answered "duplicate".
 */
async function kvReleaseEventId(eventId: string): Promise<void> {
  await kvCmd(["DEL", `${KV_DEDUP_PREFIX}${eventId}`]);
}

// Defaults — kept in code (not env) so missing env vars don't break the
// happy path. Hugo can override either via Vercel env vars if desired.
const DEFAULT_FROM = "info@themandalacompany.com";
const DEFAULT_BCC = "info@themandalacompany.com";
const FROM_NAME = "The Mandala Company";
// Fallback static code used if dynamic coupon creation fails. For this to
// actually grant a discount at checkout, Hugo must create a matching
// promotion code in the Stripe dashboard (one-off, 10% off, no expiry).
// Named "Family & Friends" to the buyer; the redeemable code is FAMILYFRIENDS
// (Stripe codes can't contain "&"). See CLAUDE.md "Family & Friends" section.
const FALLBACK_CODE = "FAMILYFRIENDS";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Formats a minor-unit amount. Defaults to GBP (catalogue currency, used for
// the per-line breakdown), but the GRAND TOTAL passes the session's actual
// presentment currency so an international buyer who paid in USD/EUR/etc. sees
// the real currency + amount they were charged, not a £-mislabelled figure.
const formatGBP = (
  pence: number | null | undefined,
  currency: string | null | undefined = "GBP",
): string => {
  if (typeof pence !== "number") return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: (currency || "GBP").toUpperCase(),
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
  // Canvas add-on (formatted GBP; canvas price + any float-frame edge surcharge)
  // — present only on a stretched-canvas line so the email itemises it.
  canvasPrice?: string;
  // The base TIER price (formatted) — the print itself, before add-ons.
  price: string;
  // How many of this line were ordered (≥ 1). Each is separately numbered.
  quantity: number;
  /** Every sub-amount of ONE unit of this line (print + add-ons), in the
   *  session's presentment currency, BEFORE any bundle saving. Numeric twin of
   *  the formatted strings above — used only to derive the discount row when
   *  the session metadata doesn't carry `bundle_discount_minor`. */
  unitMinor: number;
}

/** Parse a metadata quantity string → whole units, 1–99. */
const metaQty = (raw: string | undefined): number => {
  const n = Number.parseInt((raw || "").trim(), 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(99, n) : 1;
};

// Per-tier price lookup (mirror of api/checkout.ts TIERS — keep in sync,
// gotcha #9). Used to render per-line prices in the confirmation email
// without trusting Stripe to split a total across lines.
const TIER_PRICE_PENCE: Record<string, number> = {
  cabinet: 17500,
  atelier: 29500,
  collector: 52500,
  "atelier-grande": 97500,
  heirloom: 199500,
  studio: 265000,
};
const TIER_LABEL: Record<string, string> = {
  cabinet: "Emblem Edition",
  atelier: "Gallery Edition",
  collector: "Collector Edition",
  "atelier-grande": "Atelier Edition",
  heirloom: "Heirloom Edition",
  studio: "Original — One of One",
};
const TIER_SIZE: Record<string, string> = {
  cabinet: "21 × 21 cm",
  atelier: "29.5 × 29.5 cm",
  collector: "42 × 42 cm",
  "atelier-grande": "59.5 × 59.5 cm",
  heirloom: "84 × 84 cm",
  studio: "59.5 × 59.5 cm",
};
// Per-painting LANDSCAPE size overrides (mirror of OPHIUCHUS_TIER_SIZE in
// src/data/paintings.ts + api/checkout.ts + api/email-basket.ts — gotcha #9).
// Ophiuchus is the one non-square work, so its prints carry landscape cm on the
// same A sheet; this makes the confirmation email + Point 101 fulfilment line
// show the real dimensions rather than a square default. Same ids / prices.
const PAINTING_TIER_SIZE: Record<string, Record<string, string>> = {
  ophiuchus: {
    cabinet: "25.9 × 21 cm",
    atelier: "36.4 × 29.5 cm",
    collector: "51.8 × 42 cm",
    "atelier-grande": "73.4 × 59.5 cm",
    heirloom: "103.6 × 84 cm",
    studio: "73.4 × 59.5 cm",
  },
  // Royal Knot — landscape 1.916:1 (fills the A long side, height derived).
  "royal-knot": {
    cabinet: "29.7 × 15.5 cm",
    atelier: "42 × 21.9 cm",
    collector: "59.4 × 31 cm",
    "atelier-grande": "84.1 × 43.9 cm",
    heirloom: "118.9 × 62.1 cm",
    studio: "84.1 × 43.9 cm",
  },
};
/** The printed size for a line — a per-painting override (Ophiuchus landscape)
 *  if known, else the square ladder default, else a safe generic label. */
const sizeFor = (paintingId: string | undefined, tierId: string): string =>
  (paintingId ? PAINTING_TIER_SIZE[paintingId]?.[tierId] : undefined) ??
  TIER_SIZE[tierId] ??
  "Limited edition giclée print";
const TIER_EDITION: Record<string, string> = {
  cabinet: "Emblem Edition — unnumbered, issued to order",
  atelier: "Gallery Edition — unnumbered, issued to order",
  collector: "Collector Edition — edition of 200, numbered",
  "atelier-grande": "Atelier Edition — edition of 75, numbered",
  heirloom: "Heirloom Edition — edition of 18, numbered",
  studio: "Unique — one of one",
};
// ⚠️ ESTATE TRUTH (mirror of PRINT_TIERS editionTotal in src/data/paintings.ts,
// gotcha #9). Emblem + Gallery are OPEN — "unnumbered, issued to order" — and
// the studio one-off is unique rather than numbered within an edition. The
// confirmation email asserted "Numbered within its edition" on every order,
// including orders that carry no numbered print at all.
const TIER_NUMBERED: Record<string, boolean> = {
  cabinet: false,
  atelier: false,
  collector: true,
  "atelier-grande": true,
  heirloom: true,
  studio: false,
};
// Verbatim from ESTATE_AUTHENTICATION.numbering in src/data/paintings.ts — the
// single source of truth for the estate-stamp / COA / numbering language.
const NUMBERING_CLAIM = "Numbered within its edition";
/** The numbering bullet for an order, or null. Only claimed when EVERY print
 *  line is a numbered tier; on a mixed or open-edition order the per-line
 *  edition labels ("… unnumbered, issued to order") carry the truth instead. */
const numberingLineFor = (tierIds: string[]): string | null =>
  tierIds.length > 0 && tierIds.every((t) => TIER_NUMBERED[t] === true)
    ? NUMBERING_CLAIM
    : null;
// Per-tier ADD-ON price lookups (mirror of framingPricePence /
// embellishmentPricePence in src/data/paintings.ts PRINT_TIERS +
// api/checkout.ts TIERS + api/email-basket.ts TIERS — gotcha #9; keep all
// four in sync). A3 (atelier) + A2 (collector) + A1 (atelier-grande) carry
// framing; A0 / studio one-off have none. Used to itemise the framing /
// hand-finishing charge as its own email sub-line so the per-line
// breakdown sums to the grand Total (session.amount_total).
const TIER_FRAMING_PENCE: Record<string, number> = {
  cabinet: 7500, // £75 (A4) → framed £250 (mirror of paintings.ts, gotcha #9)
  atelier: 15000, // £150 (A3) — Hugo 2026-07-27: framed == canvas price (mirror of paintings.ts, gotcha #9)
  collector: 22500, // £225 (A2) — Hugo 2026-07-27: framed == canvas price
  "atelier-grande": 32500, // £325 (A1) — Hugo 2026-07-27: framed == canvas price
};
const TIER_EMBELLISH_PENCE: Record<string, number> = {
  collector: 59500, // £595 (A2)
  "atelier-grande": 89500, // £895 (A1)
  heirloom: 129500, // £1,295 (A0) — was MISSING; A0 hand-finish now itemises correctly in the email
};
// Canvas add-on price per tier (mirror of canvasPricePence in
// src/data/paintings.ts + api/checkout.ts — gotcha #9). The float-frame edge
// surcharge (from metadata) is added on top so the canvas sub-line matches the
// amount charged.
const TIER_CANVAS_PENCE: Record<string, number> = {
  cabinet: 7500, // £75 (A4) → canvas £250 (mirror of paintings.ts, gotcha #9)
  atelier: 15000, // £150 (A3)
  collector: 22500, // £225 (A2)
  "atelier-grande": 32500, // £325 (A1)
  heirloom: 42500, // £425 (A0)
};

// ⚠️ MONEY / LEGIBILITY. Every per-line figure is converted into the session's
// PRESENTMENT currency before it is formatted. The catalogue is priced in GBP
// pence and these lookups are GBP mirrors, so a USD buyer used to receive an
// invoice whose lines read "£525" under a total reading "$693" — two currencies
// on one document, neither reconciling with the other. The conversion is the
// same convertFromGbpMinor mirror the charge itself used, so the line figures
// are the ones Stripe billed. The BUNDLE saving is NOT applied per line: the
// lines carry catalogue prices and the saving is rendered as its own explicit
// row (see `discount` in renderOrderConfirmationHtml), because that is the only
// shape in which the buyer can see WHY the total is below the sum of the lines.
const linesFromMetadata = (
  m: Stripe.Metadata | null,
  amountSubtotal: number | null | undefined,
  sessionCurrency: string | null | undefined,
): EmailLine[] => {
  if (!m) return [];
  // An unsupported code can only mean a currency was added to the site and not
  // to this file's mirror; fall back to GBP figures rather than throwing into
  // the confirmation email. processPrintFulfilment alerts the estate separately.
  const cur = isSupportedCurrency(sessionCurrency)
    ? (sessionCurrency as string).toLowerCase()
    : "gbp";
  /** A GBP-pence catalogue figure → this session's currency, formatted. */
  const money = (gbpPence: number | null | undefined): string =>
    typeof gbpPence === "number"
      ? formatGBP(convertFromGbpMinor(gbpPence, cur), cur)
      : "—";
  const minor = (gbpPence: number | null | undefined): number =>
    typeof gbpPence === "number" ? convertFromGbpMinor(gbpPence, cur) : 0;
  // Single-item shape
  if (m.painting_title && !m.painting_titles) {
    const tierId = m.tier_id || "collector";
    const framing = m.framing === "yes";
    const embellished = m.embellished === "yes";
    // Premium-frame surcharge (pence) folded into the framing sub-line so it
    // matches the amount charged (mirror of api/checkout.ts, gotcha #9).
    const frameSurcharge = Number(m.frame_surcharge_pence) || 0;
    const canvasSurcharge = Number(m.canvas_edge_surcharge_pence) || 0;
    // GBP-pence sub-amounts of ONE unit, in the order the email renders them.
    const framingGbp =
      framing && tierId in TIER_FRAMING_PENCE
        ? TIER_FRAMING_PENCE[tierId] + frameSurcharge
        : null;
    const canvasGbp =
      m.canvas === "yes" && tierId in TIER_CANVAS_PENCE
        ? TIER_CANVAS_PENCE[tierId] + canvasSurcharge
        : null;
    const embellishGbp =
      embellished && tierId in TIER_EMBELLISH_PENCE
        ? TIER_EMBELLISH_PENCE[tierId]
        : null;
    const baseGbp = TIER_PRICE_PENCE[tierId] ?? amountSubtotal ?? null;
    return [
      {
        title: m.painting_title,
        colourway: m.colourway_name || "Original",
        tierLabel: TIER_LABEL[tierId] ?? m.tier_label,
        editionLabel: TIER_EDITION[tierId],
        size: sizeFor(m.painting_id, tierId),
        framing,
        embellished,
        // Itemise the add-on only when it applies on this tier AND was bought
        // (the tier lookup is undefined on the Gallery / Heirloom / studio
        // tiers, so framingPrice / embellishPrice stay absent and no sub-line
        // renders).
        framingPrice: framingGbp !== null ? money(framingGbp) : undefined,
        embellishPrice: embellishGbp !== null ? money(embellishGbp) : undefined,
        canvasPrice: canvasGbp !== null ? money(canvasGbp) : undefined,
        price: money(baseGbp),
        quantity: metaQty(m.quantity),
        unitMinor:
          minor(baseGbp) + minor(framingGbp) + minor(canvasGbp) + minor(embellishGbp),
      },
    ];
  }
  // Multi-item shape
  const titles = (m.painting_titles || "").split(",").map((s) => s.trim()).filter(Boolean);
  const quantities = (m.quantities || "").split(",").map((s) => s.trim());
  const colourways = (m.colourway_names || "").split(",").map((s) => s.trim()).filter(Boolean);
  const paintingIds = (m.painting_ids || "").split(",").map((s) => s.trim());
  const tierIds = (m.tier_ids || "").split(",").map((s) => s.trim()).filter(Boolean);
  const framingFlags = (m.framing_flags || "").split(",").map((s) => s.trim()).filter(Boolean);
  const frameSurcharges = (m.frame_surcharges || "").split(",").map((s) => s.trim());
  const embellishedFlags = (m.embellished_flags || "").split(",").map((s) => s.trim()).filter(Boolean);
  const canvasFlags = (m.canvas_flags || "").split(",").map((s) => s.trim());
  const canvasEdgeSurcharges = (m.canvas_edge_surcharges || "").split(",").map((s) => s.trim());
  if (titles.length === 0) return [];
  return titles.map((title, idx) => {
    const tierId = tierIds[idx] || "collector";
    const framing = framingFlags[idx] === "y";
    const embellished = embellishedFlags[idx] === "y";
    const frameSurcharge = Number(frameSurcharges[idx]) || 0;
    const framingGbp =
      framing && tierId in TIER_FRAMING_PENCE
        ? TIER_FRAMING_PENCE[tierId] + frameSurcharge
        : null;
    const canvasGbp =
      canvasFlags[idx] === "y" && tierId in TIER_CANVAS_PENCE
        ? TIER_CANVAS_PENCE[tierId] + (Number(canvasEdgeSurcharges[idx]) || 0)
        : null;
    const embellishGbp =
      embellished && tierId in TIER_EMBELLISH_PENCE
        ? TIER_EMBELLISH_PENCE[tierId]
        : null;
    const baseGbp = TIER_PRICE_PENCE[tierId] ?? null;
    return {
      title,
      colourway: colourways[idx] || "Original",
      tierLabel: TIER_LABEL[tierId],
      editionLabel: TIER_EDITION[tierId],
      size: sizeFor(paintingIds[idx], tierId),
      framing,
      embellished,
      // Itemise the add-on only when it applies on this tier AND was bought.
      framingPrice: framingGbp !== null ? money(framingGbp) : undefined,
      embellishPrice: embellishGbp !== null ? money(embellishGbp) : undefined,
      canvasPrice: canvasGbp !== null ? money(canvasGbp) : undefined,
      price: money(baseGbp),
      quantity: metaQty(quantities[idx]),
      unitMinor:
        minor(baseGbp) + minor(framingGbp) + minor(canvasGbp) + minor(embellishGbp),
    };
  });
};

/**
 * The bundle saving actually applied to this order, in the session's currency.
 *
 * ⚠️ MONEY. api/checkout.ts bakes the saving into the PRINT LINE unit amounts
 * (so the promo-code field stays available) and records what it took off as
 * `bundle_discount_minor`, with the percent in `bundle_percent_off`. The email
 * therefore prices its lines at catalogue value and subtracts this figure —
 * without it a 2+ print order showed lines summing to MORE than the total, with
 * nothing to explain the gap. Prefer the recorded figure; the percent-derived
 * fallback only runs on a session created before that key existed.
 */
const bundleDiscountMinor = (
  m: Stripe.Metadata | null,
  lines: EmailLine[],
): { percentOff: number; minor: number } => {
  const percentOff = Number(m?.bundle_percent_off) || 0;
  if (percentOff <= 0) return { percentOff: 0, minor: 0 };
  const recorded = Number(m?.bundle_discount_minor);
  if (Number.isFinite(recorded) && recorded > 0) {
    return { percentOff, minor: Math.round(recorded) };
  }
  const derived = lines.reduce(
    (sum, l) => sum + Math.round((l.unitMinor * l.quantity * percentOff) / 100),
    0,
  );
  return { percentOff, minor: derived };
};

// ---------------------------------------------------------------------------
// Inlined thank-you-code minter (mirror of api/_lib/thankYouCode.ts — gotcha #5)
// ---------------------------------------------------------------------------
interface ThankYouCode {
  code: string;
  valueLabel: string;
  expiresLabel: string;
  /** Null on the static FALLBACK_CODE path — nothing was minted, so there is
   *  nothing for the refund / dispute revocation to deactivate. */
  couponId: string | null;
  promotionCodeId: string | null;
}
const THANKYOU_PERCENT = 10;
const THANKYOU_VALID_DAYS = 365;
// "Family & Friends" gesture — the buyer-facing name. Redeemable codes read
// FF-XXXXXX (unique, single-use); the human name "Family & Friends" is shown
// in the email copy below.
const THANKYOU_PREFIX = "FF";
const THANKYOU_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const createThankYouCode = async (
  stripe: Stripe,
  {
    sessionId,
    sessionCreated,
    buyerEmail,
  }: { sessionId: string; sessionCreated: number; buyerEmail: string | null },
): Promise<ThankYouCode> => {
  // Derived from the SESSION's creation time (not Date.now()) so a redelivery
  // replays byte-identical parameters under the same idempotency key below.
  const expiresUnix = sessionCreated + THANKYOU_VALID_DAYS * 24 * 60 * 60;
  const expiresAt = new Date(expiresUnix * 1000);
  const meta = { kind: "thank_you", session_id: sessionId, buyer_email: buyerEmail ?? "" };
  const coupon = await stripe.coupons.create(
    {
      percent_off: THANKYOU_PERCENT,
      duration: "once",
      max_redemptions: 1,
      redeem_by: expiresUnix,
      name: `Family & Friends — ${sessionId.slice(0, 14)}`,
      metadata: meta,
    },
    { idempotencyKey: `thankyou-coupon:${sessionId}` },
  );
  let promoErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    // Deterministic code — see seededSuffix: a random code would change the
    // parameters under a replayed idempotency key and Stripe would reject it.
    const code = `${THANKYOU_PREFIX}-${seededSuffix(
      `thankyou:${sessionId}:${attempt}`,
      THANKYOU_ALPHABET,
    )}`;
    try {
      const promo = await stripe.promotionCodes.create(
        {
          promotion: { type: "coupon", coupon: coupon.id },
          code,
          max_redemptions: 1,
          expires_at: expiresUnix,
          metadata: meta,
        },
        { idempotencyKey: `thankyou-promo:${sessionId}:${attempt}` },
      );
      return {
        code,
        couponId: coupon.id,
        promotionCodeId: promo.id,
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
  /** GBP catalogue value of the card (the figure the /gift page advertises). */
  amountPence: number;
  /** Minor units ACTUALLY charged for this line, in `chargedCurrency`. */
  chargedMinor: number;
  /** The session's presentment currency, lower-case ISO ("gbp" / "usd" / …). */
  chargedCurrency: string;
  /** Optional — who the gift is for. */
  recipientEmail?: string;
  recipientName?: string;
  /** Optional — the buyer's personal note to the recipient. */
  giftMessage?: string;
}
interface MintedGiftCard {
  code: string; // GIFT-XXXXXX
  couponId: string;
  promotionCodeId: string;
  amountMinor: number; // the coupon's base amount_off
  currency: string; // the coupon's base currency
  amountLabel: string; // formatted in `currency`, e.g. "$660.00"
  expiresLabel: string; // human date ~12 months out
}
const GIFT_VALID_DAYS = 365;
const GIFT_PREFIX = "GIFT";
// Same unambiguous alphabet as the thank-you code (no 0/O/1/I).
const GIFT_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// ---- Presentment currency (mirror of api/checkout.ts + src/lib/currency.tsx) -
// ⚠️ MONEY MIRROR (gotcha #9). A Stripe amount_off coupon can only be applied to
// a session in a matching currency, so a card BOUGHT in USD must also be
// redeemable by a recipient whose picker sits on GBP. Stripe's `currency_options`
// carries one amount per currency on the single coupon; the per-currency figures
// are derived here with the SAME estate-set rates and the SAME whole-major-unit
// rounding the site quotes with, so the credit is worth exactly the catalogue
// figure in whichever currency it is redeemed. Keep byte-identical to
// CURRENCY_RATES / convertFromGbpMinor in api/checkout.ts and
// CURRENCIES[*].rate / convertFromGbpPence in src/lib/currency.tsx — change all
// three in the same commit or the gift's value drifts between currencies.
//
// ⚠️ THIS TABLE IS ONE OF THREE COPIES. It is a MONEY MIRROR of
// CURRENCY_RATES / convertFromGbpMinor in api/checkout.ts and
// CURRENCIES[*].rate / convertFromGbpPence in src/lib/currency.tsx. Adding a
// currency to the site means adding it in ALL THREE files, in the same commit.
const CURRENCY_RATES: Record<string, number> = {
  gbp: 1,
  usd: 1.32,
  eur: 1.22,
  aud: 2.0,
  cad: 1.82,
};
/** Is `code` a currency THIS file can price in? Callers that must not throw
 *  (the invoice renderer, the Klaviyo payload) check this first and fall back
 *  to GBP figures + an estate alert. */
const isSupportedCurrency = (code: string | null | undefined): boolean =>
  typeof code === "string" &&
  Object.prototype.hasOwnProperty.call(CURRENCY_RATES, code.toLowerCase());

const convertFromGbpMinor = (gbpPence: number, code: string): number => {
  if (code === "gbp") return Math.round(gbpPence);
  const rate = CURRENCY_RATES[code];
  // ⚠️ THROW, never fall through. This used to `return Math.round(gbpPence)`
  // on an unrecognised code — GBP pence relabelled as the new currency. Add a
  // currency to the site, forget this third copy, and every gift card mints at
  // the GBP figure while every EXISTING card becomes unredeemable in it, with
  // nothing logged. A throw is caught by the caller, alerts the estate, and
  // costs one card instead of silently mispricing all of them.
  if (!rate) {
    throw new Error(
      `Unsupported currency "${code}" in api/stripe-webhook.ts CURRENCY_RATES — ` +
        "add it here AND in api/checkout.ts AND in src/lib/currency.tsx (money mirror).",
    );
  }
  return Math.ceil((gbpPence * rate) / 100) * 100; // whole major unit
};

/**
 * A short code suffix derived DETERMINISTICALLY from a seed, over the same
 * unambiguous alphabet as the random generator it replaces.
 *
 * ⚠️ Why not random: the mint calls below carry a Stripe idempotency key so a
 * webhook redelivery on a cold lambda (where the in-memory dedup set is empty
 * and KV may be unavailable) cannot mint a DUPLICATE coupon. Stripe rejects a
 * reused idempotency key whose parameters differ — so every parameter of the
 * call, the code included, has to be a pure function of the session.
 */
/**
 * ⚠️ SECRET-KEYED. Never revert this to a bare `createHash("sha256")`.
 *
 * The seeds below are `gift:<sessionId>:<index>:<attempt>` and
 * `thankyou:<sessionId>:<attempt>` — every component of which is PUBLIC. The
 * session id is in the /order/success URL, and the buyer's confirmation email
 * prints it as the order reference (it must, or /orders cannot look the order
 * up). With a plain digest, anyone holding one gift email could recompute EVERY
 * code on that order — the other recipients' cards and the buyer's Family &
 * Friends code — with no Stripe access and no brute force. Codes are
 * `max_redemptions: 1`, so first to redeem wins: a £25 recipient could take the
 * £5,000 card bought for someone else.
 *
 * HMAC with a server-side key removes derivability while keeping the function
 * pure — which the idempotency contract below still requires.
 *
 * The key prefers a dedicated `GIFT_CODE_SECRET` and falls back to
 * `STRIPE_WEBHOOK_SECRET`, which is mandatory for this endpoint to run at all,
 * so the protection is live with ZERO new configuration. If both were ever
 * absent the signature check would already have rejected the request.
 */
const codeSecret = (): string =>
  process.env.GIFT_CODE_SECRET || process.env.STRIPE_WEBHOOK_SECRET || "";

const seededSuffix = (seed: string, alphabet: string, length = 6): string => {
  const digest = createHmac("sha256", codeSecret()).update(seed, "utf8").digest();
  let out = "";
  for (let i = 0; i < length; i += 1) out += alphabet[digest[i] % alphabet.length];
  return out;
};

const createGiftCard = async (
  stripe: Stripe,
  {
    sessionId,
    sessionCreated,
    buyerEmail,
    gift,
    index,
  }: {
    sessionId: string;
    /** Stripe session `created` (unix). Deterministic — see seededSuffix. */
    sessionCreated: number;
    buyerEmail: string | null;
    gift: GiftCard;
    index: number;
  },
): Promise<MintedGiftCard> => {
  // Expiry is derived from the SESSION's creation time, not Date.now(), so a
  // redelivery replays byte-identical parameters under the same idempotency key.
  const expiresUnix = sessionCreated + GIFT_VALID_DAYS * 24 * 60 * 60;
  const expiresAt = new Date(expiresUnix * 1000);
  const baseCurrency = gift.chargedCurrency;
  // INVARIANT: the minted gift value MUST equal the amount the buyer was
  // charged for this gift line, to the penny, in the currency they were charged.
  const baseAmount = gift.chargedMinor;
  // Every OTHER supported currency, at the catalogue value. Without these a card
  // bought in USD simply failed at checkout for a recipient paying in GBP.
  const currencyOptions: Record<string, { amount_off: number }> = {};
  for (const code of Object.keys(CURRENCY_RATES)) {
    if (code === baseCurrency) continue;
    currencyOptions[code] = {
      amount_off: convertFromGbpMinor(gift.amountPence, code),
    };
  }
  const meta = {
    kind: "gift_card",
    session_id: sessionId,
    gift_index: String(index),
    amount_pence: String(gift.amountPence),
    amount_minor: String(baseAmount),
    currency: baseCurrency,
    buyer_email: buyerEmail ?? "",
  };
  const coupon = await stripe.coupons.create(
    {
      amount_off: baseAmount,
      currency: baseCurrency,
      currency_options: currencyOptions,
      duration: "once",
      max_redemptions: 1,
      redeem_by: expiresUnix,
      name: "Estate gift card",
      metadata: meta,
    },
    { idempotencyKey: `gift-coupon:${sessionId}:${index}` },
  );
  let promoErr: unknown = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    // The attempt index salts BOTH the code and the idempotency key together, so
    // a genuine code collision retries cleanly while a redelivery replays.
    // 8 symbols, not the 6 used for thank-you codes: a gift card is a bearer
    // instrument worth up to £5,000, and 31^6 (~887 million) is thin for that.
    // 31^8 is ~852 billion, which costs nothing and makes blind guessing moot.
    const code = `${GIFT_PREFIX}-${seededSuffix(
      `gift:${sessionId}:${index}:${attempt}`,
      GIFT_ALPHABET,
      8,
    )}`;
    try {
      // Match createThankYouCode's promotionCodes.create shape EXACTLY
      // (promotion: { type: "coupon", coupon }) — the installed SDK's working
      // call. Do NOT regress to a positional `coupon` field (gotcha).
      const promo = await stripe.promotionCodes.create(
        {
          promotion: { type: "coupon", coupon: coupon.id },
          code,
          max_redemptions: 1,
          expires_at: expiresUnix,
          metadata: meta,
        },
        { idempotencyKey: `gift-promo:${sessionId}:${index}:${attempt}` },
      );
      return {
        code,
        couponId: coupon.id,
        promotionCodeId: promo.id,
        amountMinor: baseAmount,
        currency: baseCurrency,
        amountLabel: formatGBP(baseAmount, baseCurrency),
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
// Gift line-item parser. api/checkout.ts marks gift-card purchases in the
// session metadata as FIXED-ARITY parallel arrays — exactly one slot per gift,
// empty slots preserved, PIPE-joined (joinGiftSlots):
//     gift_count             = "2"
//     gift_amounts_pence     = "2500|50000"        (GBP catalogue value)
//     gift_amounts_minor     = "3300|66000"        (charged, in gift_currency)
//     gift_currency          = "usd"
//     gift_recipient_emails  = "|alice@example.com" (empty slot = no recipient)
//     gift_recipient_names   = "|Alice"
//     gift_messages          = "|Happy birthday"
//
// ⚠️ POSITIONAL. These arrays are zipped BY INDEX — slot i of every array is the
// same card. Never filter empties out of one of them and never drop a trailing
// entry: either shifts the zip and emails the wrong card to the wrong person.
//
// ⚠️ A second, JSON-blob shape (`gift_cards`) used to be accepted here "for
// resilience against the parallel checkout agent's wire format". checkout.ts
// never wrote it. Because that dead branch sat FIRST, it made the real bug
// invisible: the singular `gift_message` key checkout.ts wrote never matched the
// plural `gift_messages` read here, so every buyer's personal note was silently
// dropped. The blob branch is deleted — one shape, written and read.
// ---------------------------------------------------------------------------
const cleanStr = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
};
const parseGiftCards = (m: Stripe.Metadata | null): GiftCard[] => {
  if (!m) return [];

  // Amounts drive the arity. Tolerant of "|" or "," because a session created
  // just before this deploy carries the older comma-joined shape; an amount can
  // contain neither character, so accepting both is safe.
  const amounts = (m.gift_amounts_pence || "")
    .split(/[|,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (amounts.length === 0) return [];
  const minors = (m.gift_amounts_minor || "")
    .split(/[|,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Slot-split that keeps empties positional. Pipes are the current separator;
  // a legacy 2+-gift session with no pipe at all falls back to comma so an
  // in-flight order still resolves its recipients.
  const splitKeepEmpties = (raw: string | undefined): string[] => {
    const s = raw || "";
    if (s.includes("|") || amounts.length <= 1) return s.split("|").map((t) => t.trim());
    return s.split(",").map((t) => t.trim());
  };
  const emails = splitKeepEmpties(m.gift_recipient_emails);
  const names = splitKeepEmpties(m.gift_recipient_names);
  const messages = splitKeepEmpties(m.gift_messages);
  // The currency the buyer was actually charged in. Only trusted when the
  // per-slot minor amounts are present AND line up with the amounts array —
  // otherwise we fall back to the GBP catalogue value (the pre-#5 behaviour).
  const currency = (m.gift_currency || "").trim().toLowerCase();
  const minorsUsable = currency.length === 3 && minors.length === amounts.length;
  return amounts
    .map((a, idx): GiftCard | null => {
      const amountPence = Math.round(Number(a));
      if (!Number.isFinite(amountPence) || amountPence <= 0) return null;
      const chargedMinor = minorsUsable ? Math.round(Number(minors[idx])) : Number.NaN;
      const useCharged = Number.isFinite(chargedMinor) && chargedMinor > 0;
      return {
        amountPence,
        chargedMinor: useCharged ? chargedMinor : amountPence,
        chargedCurrency: useCharged ? currency : "gbp",
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
  /**
   * ⚠️ The FULL Stripe session id (`cs_…`), never truncated.
   *
   * This string is printed as "Reference:" in the buyer's email, and
   * src/pages/Orders.tsx tells them to paste it into /orders to track the
   * order — which calls GET /api/order-status, whose guard is
   * `/^cs_[A-Za-z0-9_]+$/`. Every email used to print
   * `session.id.slice(0, 18) + "…"`, so the reference the buyer was handed
   * could never pass that guard: the site asked for an id it had already
   * broken. The id is not a secret — it is in the /order/success URL.
   */
  orderRef: string;
  lines: EmailLine[];
  /** The bundle saving row, already formatted in the session's currency, or
   *  null when the order carried no bundle discount. Rendered between the
   *  lines and the total — the lines are catalogue prices, so without this row
   *  they sum to MORE than the total and the invoice cannot be reconciled. */
  /** Gift cards on this order, valued in the currency actually charged. They
   *  are part of amount_total but are NOT print lines, so without a row each a
   *  mixed basket showed lines that did not sum to the stated total. */
  giftLines?: { label: string; value: string }[];
  discount: { label: string; value: string } | null;
  total: string;
  /**
   * The numbering claim for THIS order, or null.
   *
   * ⚠️ ESTATE TRUTH. This was asserted unconditionally as "Numbered within its
   * edition", but the Emblem and Gallery editions are "unnumbered, issued to
   * order" (src/data/paintings.ts PRINT_TIERS editionTotal === null). The
   * caller passes the line only when EVERY print line on the order is a
   * numbered tier; otherwise the per-line edition labels carry the truth.
   */
  numberingLine: string | null;
  // Null when no Family & Friends code was minted for this order (a £0 order —
  // a gift code covering the total — never mints one; see the farming guard in
  // processCompletedSession). The card block is then omitted entirely.
  thankYouCode: string | null;
  thankYouValue: string | null;
  thankYouExpiry: string | null;
  estateEmail: string;
}): string => {
  const first = (() => {
    const t = (p.buyerName ?? "").trim();
    return t ? esc(t.split(/\s+/)[0]) : "there";
  })();
  const ESTATE = {
    stamp: "Estate-stamped by The Mandala Company",
    coa: "Issued with a Certificate of Authenticity carrying a unique Certificate ID",
    printer: "Printed and finished by a specialist giclée studio on the Sussex coast",
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
      const tierBits = [line.tierLabel, line.size, line.editionLabel]
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
        + (line.canvasPrice
            ? priceRow("Canvas print", line.canvasPrice)
            : "")
        + (line.embellished && line.embellishPrice
            ? priceRow("Hand-finished by Polly Wedge", line.embellishPrice, EMBELLISH)
            : "")
        + (line.quantity > 1
            ? priceRow("Quantity", `× ${line.quantity}`, "Each print is individually numbered.")
            : "")
        + `</div>`;
    })
    .join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="dark only"/><title>Your print is on its way — The Art of Stephen Meakin</title></head>`
    + `<body style="${s.page}"><div style="${s.shell}">`
    + `<p style="${s.eyebrow}">The Mandala Company · The estate of Stephen Meakin</p>`
    + `<h1 style="${s.heading}">Thank you, ${first}.</h1>`
    + `<p style="${s.body}">Your order for an estate-stamped giclée from <em>The Art of Stephen Meakin</em> has been received. Each print is individually made to order by a specialist giclée studio on the Sussex coast, and dispatched within <strong style="color:#ede6d6;">two to four working days</strong>. You'll hear from us again when it ships, with a tracking link.</p>`
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.eyebrow}">Your order</p>`
    + `<div style="${s.card}">${lineHtml}`
    + ((p.giftLines ?? [])
        .map(
          (g) =>
            `<p style="font-family:${SANS};font-size:14px;margin:0 0 6px 0;"><span style="color:rgba(237,230,214,0.55);">${esc(g.label)}</span> &nbsp; <strong style="color:#ede6d6;">${esc(g.value)}</strong></p>`,
        )
        .join(""))
    + `<hr style="border:0;border-top:1px solid rgba(237,230,214,0.18);margin:18px 0 12px 0;"/>`
    + (p.discount
        ? `<p style="font-family:${SANS};font-size:14px;margin:0 0 8px 0;"><span style="color:rgba(237,230,214,0.55);letter-spacing:0.18em;font-size:11px;text-transform:uppercase;font-weight:700;">${esc(p.discount.label)}</span> &nbsp; <strong style="color:#ede6d6;">− ${esc(p.discount.value)}</strong></p>`
        : "")
    + `<p style="font-family:${SANS};font-size:14px;margin:0;"><span style="color:rgba(237,230,214,0.55);letter-spacing:0.18em;font-size:11px;text-transform:uppercase;font-weight:700;">Total (incl. shipping)</span> &nbsp; <strong style="color:#ede6d6;font-size:16px;">${esc(p.total)}</strong></p>`
    + `</div>`
    + `<p style="${s.eyebrow}margin-top:28px;">Authentication</p>`
    + `<div style="${s.card}">`
    + `<p style="${s.meta}color:#ede6d6;margin-bottom:8px;">· ${ESTATE.stamp}</p>`
    + (p.numberingLine
        ? `<p style="${s.meta}color:#ede6d6;margin-bottom:8px;">· ${esc(p.numberingLine)}</p>`
        : "")
    + `<p style="${s.meta}color:#ede6d6;margin-bottom:8px;">· ${ESTATE.coa}</p>`
    + `<p style="${s.meta}color:rgba(237,230,214,0.78);">· ${ESTATE.printer}</p>`
    + `</div>`
    + (p.thankYouCode
        ? `<div style="${s.giftCard}">`
          + `<p style="${s.eyebrow}color:rgba(237,230,214,0.55);margin:0 0 14px 0;">Family &amp; Friends</p>`
          + `<p style="${s.body}color:#ede6d6;margin:0 0 14px 0;">With our thanks for taking one of Steve's prints into your home, here is ${esc(p.thankYouValue ?? "")} towards your next print — and one to pass to someone you love.</p>`
          + `<code style="${s.code}">${esc(p.thankYouCode)}</code>`
          + `<p style="${s.small}margin:0;">Apply at checkout. Valid for one year — until ${esc(p.thankYouExpiry ?? "")}.</p>`
          + `</div>`
        : "")
    + `<h2 style="${s.subheading}">What happens next</h2>`
    // ⚠️ SUPPLIER TRUTH (2026-08-28): "our atelier" claimed a studio the estate
    // does not own. Same approved wording as ESTATE.printer above.
    + `<p style="${s.body}">We'll place your print with a specialist giclée studio on the Sussex coast in the next working day, and notify you the moment it leaves the studio. If anything about the colourway or sizing needs another look, just reply to this email — we read everything ourselves.</p>`
    + `<p style="${s.signoff}">With love from the estate,</p>`
    + `<p style="${s.body}font-style:italic;margin:0;">— Archie, for The Mandala Company</p>`
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.footer}">Questions, or anything to flag — <a href="mailto:${esc(p.estateEmail)}" style="${s.link}">${esc(p.estateEmail)}</a><br/>Returns, refunds &amp; damages — <a href="https://themandalacompany.com/legal#returns" style="${s.link}">themandalacompany.com/legal</a><br/>Reference: ${esc(p.orderRef)}<br/>The Art of Stephen Meakin · Lewes, East Sussex</p>`
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
    // ⚠️ NEVER describe a print as "signed" here. Stephen died in 2021 and the
    // FAQ states plainly that prints cannot be signed in his hand — this email
    // was the one surface making a provenance claim the estate denies
    // everywhere else. Nor "our London atelier": the supplier-truth pass
    // (2026-08-28) established the printer is never named or mis-placed in
    // buyer copy — the approved wording is "the Sussex coast".
    ? `<p style="${s.body}">${buyerLabel} has given you a gift from <em>The Art of Stephen Meakin</em> — a credit towards an estate-stamped giclée print of one of Stephen's mandalas, each one made to order by a specialist giclée studio on the Sussex coast.</p>`
    : `<p style="${s.body}">Your gift card for <em>The Art of Stephen Meakin</em> is ready. Below is the code and how it's redeemed — forward this email to whomever it's for, or keep it for yourself.</p>`;

  // ⚠️ The note is rendered on BOTH variants. It used to be gated on
  // `p.toRecipient`, so a buyer who left the recipient email blank — the path
  // /gift explicitly invites ("Leave these blank to gift the card to yourself
  // to pass on by hand") — had up to 400 characters validated, capped, shown
  // back in the basket, sent to Stripe, and then rendered to NOBODY. On the
  // buyer-addressed copy it is labelled with the /gift form's own field label
  // (src/pages/Gift.tsx, "A personal message"), because on that copy the note
  // is the buyer's own words coming back to them to pass on.
  const noteHtml = cleanStr(p.giftMessage ?? undefined)
    ? `<div style="${s.noteCard}">`
      + `<p style="${s.eyebrow}color:rgba(237,230,214,0.55);margin:0 0 12px 0;">${
          p.toRecipient ? `A note from ${buyerLabel}` : "A personal message"
        }</p>`
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
    + `<p style="${s.small}margin:0 0 4px 0;">towards an estate-stamped print</p>`
    + `<code style="${s.code}">${esc(p.code)}</code>`
    + `<p style="${s.small}margin:0;">Valid until ${esc(p.expiresLabel)}.</p>`
    + `</div>`
    + `<h2 style="${s.subheading}">How to redeem</h2>`
    // ⚠️ MONEY / HONESTY. The tier named here must be a REAL, buyable rung at its
    // REAL advertised price — base + cheapest finish, i.e.
    // getTierAdvertisedPricePence in src/data/paintings.ts (£250 / £445 / £750 /
    // £1,300), never the bare base (£175 / £295 / £525 / £975). This line said
    // "an A2 Collector's Edition print" — retired A-series naming.
    + `<p style="${s.body}">Choose a print at <a href="https://themandalacompany.com/collections" style="${s.link}">themandalacompany.com</a>, then enter the code <strong style="color:#ede6d6;">${esc(p.code)}</strong> at checkout. It covers a single order — for example, a Collector Edition print · 42 × 42 cm · £750 — and the gift value is taken off the total. If the print costs more than the gift, you simply pay the difference; if less, the gift covers it in full.</p>`
    // ⚠️ NEVER promise partial spending here. The coupon is duration:"once",
    // max_redemptions:1, and there is NO balance ledger anywhere in this system —
    // a £5,000 card spent on a £750 print destroys £4,250. This line used to read
    // "There's no need to spend it all at once on shipping or add-ons", which both
    // promised a balance the system cannot keep AND contradicted the sentence
    // directly above it. Wording follows the FAQ's own "single-use code, valid for
    // one year" phrasing (src/data/faqs.tsx).
    + `<p style="${s.small}">The code is single-use and applies to one order. Any value not spent on that order is not carried over to another order, and is not refunded.</p>`
    + `<p style="${s.signoff}">With warmth from the estate,</p>`
    + `<p style="${s.body}font-style:italic;margin:0;">— Archie, for The Mandala Company</p>`
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.footer}">Questions — <a href="mailto:${esc(p.estateEmail)}" style="${s.link}">${esc(p.estateEmail)}</a><br/>Reference: ${esc(p.orderRef)}<br/>The Art of Stephen Meakin · Lewes, East Sussex</p>`
    + `</div></body></html>`;
};

// ---------------------------------------------------------------------------
// Inlined GIFT-ONLY order confirmation → HTML string. Same dark estate palette
// + shared esc() / SANS / DISPLAY utils (gotcha #5 — inline, do not import).
// ---------------------------------------------------------------------------
// ⚠️ A gift-only basket writes NO print metadata, so linesFromMetadata() returns
// [] and the standard confirmation went out with the subject "your print from
// the Stephen Meakin estate", an EMPTY item table and no mention of the gift
// code at all. This is the gift-only branch: it restates what was bought, who
// each card was sent to, and the code — which is also the buyer's own copy of
// every code (see the recipient-typo note in the handler).
const renderGiftOrderConfirmationHtml = (p: {
  buyerName?: string | null;
  orderRef: string;
  cards: Array<{
    label: string;
    amountLabel: string;
    code: string | null;
    expiresLabel: string | null;
    recipientName?: string | null;
    recipientEmail?: string | null;
    /** The buyer's own note for this card. ⚠️ Rendered here too: a gift-only
     *  order with no recipient email is the one case where NO other email
     *  carries it, and this confirmation is the buyer's copy of the card. */
    giftMessage?: string | null;
  }>;
  total: string;
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
    code: `font-family:"SF Mono","Menlo","Consolas",monospace;font-size:20px;font-weight:600;letter-spacing:0.22em;color:#c97844;margin:8px 0 6px 0;display:block;`,
    meta: `font-family:${SANS};font-size:12px;color:rgba(237,230,214,0.55);margin:0;`,
    note: `font-family:${DISPLAY};font-style:italic;font-size:15px;line-height:1.6;color:#ede6d6;margin:0;`,
    signoff: `font-family:${DISPLAY};font-style:italic;font-size:16px;color:#ede6d6;margin:24px 0 4px 0;`,
    footer: `font-family:${SANS};font-size:11px;line-height:1.7;color:rgba(237,230,214,0.55);text-align:center;margin:32px 0 0 0;`,
    link: `color:#c97844;text-decoration:underline;`,
  };
  const cardHtml = p.cards
    .map((c, idx) => {
      const sentTo = c.recipientEmail
        ? `Sent to ${esc(c.recipientName || c.recipientEmail)} · ${esc(c.recipientEmail)}`
        : "Kept for you to pass on by hand.";
      // The buyer's note, in the /gift form's own words for the field
      // (src/pages/Gift.tsx, "A personal message").
      const note = (c.giftMessage ?? "").trim();
      const noteHtml = note
        ? `<p style="${s.meta}margin-top:10px;">A personal message</p>`
          + `<p style="${s.note}margin-top:4px;">${esc(note)}</p>`
        : "";
      return `<div style="margin-top:${idx === 0 ? 0 : 14}px;padding-top:${idx === 0 ? 0 : 14}px;border-top:${idx === 0 ? "0" : "1px solid rgba(237,230,214,0.18)"};">`
        + `<p style="font-family:${SANS};font-size:14px;line-height:1.55;margin:0 0 4px 0;"><strong style="color:#ede6d6;">Gift card${c.label ? ` — ${esc(c.label)}` : ""}</strong> &nbsp;·&nbsp; <strong style="color:#ede6d6;">${esc(c.amountLabel)}</strong></p>`
        + `<p style="${s.meta}margin-top:4px;">${sentTo}</p>`
        + (c.code
            ? `<code style="${s.code}">${esc(c.code)}</code>`
              + (c.expiresLabel
                  ? `<p style="${s.meta}">Valid until ${esc(c.expiresLabel)}.</p>`
                  : "")
            // ⚠️ Do NOT restore "is being issued — we'll send it on shortly".
            // Nothing retries a failed mint, so that sentence was simply untrue.
            // The estate is alerted (see processGiftCards) and picks it up by
            // hand; this tells the buyer the truth and gives them a route.
            : `<p style="${s.meta}">We could not issue the code for this card. The estate has been notified and will send it on — or write to ${esc(p.estateEmail)}.</p>`)
        // ⚠️ The buyer's own copy of what they wrote. /gift invites the buyer to
        // leave the recipient fields blank "to pass on by hand", and in that
        // case the note reached NOBODY: the recipient email's note block is
        // gated on there being a recipient, and this confirmation never
        // rendered it at all. So a buyer could write 400 characters, watch the
        // basket quote them back, pay, and have them silently discarded.
        + noteHtml
        + `</div>`;
    })
    .join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="dark only"/><title>Your gift card — The Art of Stephen Meakin</title></head>`
    + `<body style="${s.page}"><div style="${s.shell}">`
    + `<p style="${s.eyebrow}">The Mandala Company · The estate of Stephen Meakin</p>`
    + `<h1 style="${s.heading}">Thank you, ${first}.</h1>`
    + `<p style="${s.body}">Your gift card for <em>The Art of Stephen Meakin</em> is ready. The code${p.cards.length > 1 ? "s are" : " is"} below — keep this email, whether or not the card has already gone to its recipient.</p>`
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.eyebrow}">Your order</p>`
    + `<div style="${s.card}">${cardHtml}`
    + `<hr style="border:0;border-top:1px solid rgba(237,230,214,0.18);margin:18px 0 12px 0;"/>`
    + `<p style="font-family:${SANS};font-size:14px;margin:0;"><span style="color:rgba(237,230,214,0.55);letter-spacing:0.18em;font-size:11px;text-transform:uppercase;font-weight:700;">Total</span> &nbsp; <strong style="color:#ede6d6;font-size:16px;">${esc(p.total)}</strong></p>`
    + `</div>`
    + `<p style="${s.body}">Choose a print at <a href="https://themandalacompany.com/collections" style="${s.link}">themandalacompany.com</a>, then enter the code at checkout and the gift value is taken off the total.</p>`
    + `<p style="${s.small}">The code is single-use and applies to one order. Any value not spent on that order is not carried over to another order, and is not refunded.</p>`
    + `<p style="${s.signoff}">With love from the estate,</p>`
    + `<p style="${s.body}font-style:italic;margin:0;">— Archie, for The Mandala Company</p>`
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.footer}">Questions, or anything to flag — <a href="mailto:${esc(p.estateEmail)}" style="${s.link}">${esc(p.estateEmail)}</a><br/>Reference: ${esc(p.orderRef)}<br/>The Art of Stephen Meakin · Lewes, East Sussex</p>`
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
// tiers, the next SEQUENTIAL print number WITHIN ITS EDITION — written to Vercel
// KV / Upstash (already provisioned for memories + webhook dedup). A Supabase
// migration is a documented drop-in upgrade (supabase/estate_ledger.sql). Keys:
//   ledger:cert:<CERT_ID>                       → JSON LedgerEntry (the record)
//   ledger:seq:<artwork>:<tier>:<editionId>     → int via INCR    (atomic numbering)
//   ledger:order:<sessionId>:<lineIndex>        → CERT_ID         (idempotency)
// Self-contained (gotcha #5): inline raw-fetch Upstash REST, reusing
// kvDedupConfig(). FAIL-OPEN — missing env / KV error → returns [] and the order
// still completes; the webhook ALWAYS 200s. The /auth page + /api/auth-lookup
// read these same records back.
//
// NOTE: the persisted LedgerEntry field names (drop_id / drop_label) are kept
// as legacy internal keys so the dormant KV / Supabase record shape stays
// stable; they now CARRY the edition id/label ("edition-i" / "First Edition").

const LEDGER_EDITION = { id: "edition-i", label: "First Edition" }; // mirror of CURRENT_EDITION (paintings.ts)

// Open Edition (atelier) is NOT numbered; the others carry a per-edition
// allocation (mirror of PRINT_TIERS editionTotal — gotcha #9).
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
  "celtic-shield": "CSH",
  "twelve-around-three": "TAT",
  "persian-flower-of-life": "PFL",
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
  // Quantity: each unit is a SEPARATELY numbered print, so a line of qty N
  // expands into N ledger units → N sequential certificate numbers. Expansion is
  // deterministic (fixed session metadata), so a Stripe redelivery re-expands
  // identically and each unit's idempotency key (…:<idx>) still lines up.
  const qtyOf = (raw: string | undefined): number => {
    const n = Number.parseInt((raw || "").trim(), 10);
    return Number.isFinite(n) && n >= 1 ? Math.min(99, n) : 1;
  };
  const repeat = <T,>(line: T, n: number): T[] =>
    Array.from({ length: n }, () => ({ ...line }));
  if (m.painting_id && !m.painting_ids) {
    return repeat(
      {
        paintingId: m.painting_id,
        tierId: m.tier_id || "collector",
        colourway: m.colourway_name || "Original",
        title: m.painting_title || m.painting_id,
      },
      qtyOf(m.quantity),
    );
  }
  const ids = (m.painting_ids || "").split(",").map((s) => s.trim()).filter(Boolean);
  const tiers = (m.tier_ids || "").split(",").map((s) => s.trim());
  const cols = (m.colourway_names || "").split(",").map((s) => s.trim());
  const titles = (m.painting_titles || "").split(",").map((s) => s.trim());
  const qtys = (m.quantities || "").split(",").map((s) => s.trim());
  return ids.flatMap((paintingId, i) =>
    repeat(
      {
        paintingId,
        tierId: tiers[i] || "collector",
        colourway: cols[i] || "Original",
        title: titles[i] || paintingId,
      },
      qtyOf(qtys[i]),
    ),
  );
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
      // Idempotency = an ATOMIC claim placed BEFORE the INCR, so a Stripe
      // redelivery (or two overlapping deliveries) can NEVER burn a second
      // print number. Generate the cert id first (it needs no counter), then
      // claim the (order, line) key with SET NX: exactly one writer wins and
      // owns the number; every later delivery sees the claim and reuses the
      // winner's record. The claim is the FIRST durable write (not the last) —
      // that is what collapses the old GET/INCR/SET race to a single winner.
      const code =
        ARTWORK_CODE[line.paintingId] || line.paintingId.slice(0, 3).toUpperCase();
      const cert = `MANDALA-${code}-${certSuffix()}`;
      const claim = await kvCmd(["SET", idemKey, cert, "NX"]);
      if (claim !== "OK") {
        // Lost the race — this line was already issued. Reuse the winner.
        const winnerCert = await kvCmd(["GET", idemKey]);
        if (typeof winnerCert === "string" && winnerCert) {
          const rec = await kvCmd(["GET", `ledger:cert:${winnerCert}`]);
          if (typeof rec === "string") {
            try {
              out.push(JSON.parse(rec) as LedgerEntry);
            } catch {
              /* corrupt record — skip, don't re-issue under a new id */
            }
          }
        }
        continue;
      }
      // We own this line. Assign the sequential number WITHIN THE EDITION.
      const allocation = TIER_ALLOCATION[line.tierId] ?? null;
      let printNumber: number | null = null;
      if (allocation !== null) {
        const seq = await kvCmd([
          "INCR",
          `ledger:seq:${line.paintingId}:${line.tierId}:${LEDGER_EDITION.id}`,
        ]);
        const n = typeof seq === "number" ? seq : Number.parseInt(String(seq), 10);
        if (!Number.isFinite(n) || n <= 0) {
          // INCR failed (KV blip) — DON'T freeze an invalid "No. 000". Release
          // the claim so the line re-issues cleanly with a real number on the
          // next delivery.
          await kvCmd(["DEL", idemKey]);
          console.error(
            "[stripe-webhook] estate ledger: INCR returned no usable number — released claim, line will re-issue",
            { order_id: sessionId, idx, tier: line.tierId },
          );
          continue;
        }
        printNumber = n;
      }
      const entry: LedgerEntry = {
        certificate_id: cert,
        artwork_id: line.paintingId,
        artwork_name: line.title,
        colourway: line.colourway,
        drop_id: LEDGER_EDITION.id, // legacy field name; carries the edition id
        drop_label: LEDGER_EDITION.label, // legacy field name; carries the edition label
        tier_id: line.tierId,
        tier_label: TIER_LABEL[line.tierId] || line.tierId,
        print_number: printNumber,
        allocation,
        issued_date: new Date().toISOString(),
        order_id: sessionId,
        status: "issued",
      };
      // Write the record under the already-claimed cert id. The NX claim above
      // is the durable idempotency guard; if this SET blips, the rare cost is a
      // burned number with no record — never a double-issue.
      await kvCmd(["SET", `ledger:cert:${cert}`, JSON.stringify(entry)]);
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
    `<h2 style="margin:0 0 4px 0;">Estate fulfilment — Giclee &amp; Co print instructions</h2>` +
    `<p style="margin:0 0 16px 0;color:#444;">Order <strong>${esc(p.orderRef)}</strong>` +
    (p.shippingName ? ` · ship to <strong>${esc(p.shippingName)}</strong>` : "") +
    `</p>` +
    `<p style="margin:0 0 16px 0;color:#444;">Each line below has been issued a Certificate ID and (for numbered tiers) the next sequential print number within its edition, recorded in the estate registry. Generate the Certificate of Authenticity + back-of-print label for each, then place the Giclee &amp; Co order with the buyer's shipping address.</p>` +
    `<table style="border-collapse:collapse;width:100%;font-size:13px;">` +
    `<thead><tr>` +
    `<th style="${th}">Artwork</th><th style="${th}">Tier</th><th style="${th}">Edition</th>` +
    `<th style="${th}">Print&nbsp;No.</th><th style="${th}">Certificate&nbsp;ID</th><th style="${th}">Verify&nbsp;URL (QR target)</th>` +
    `</tr></thead><tbody>${rows}</tbody></table>` +
    `<p style="margin:18px 0 0 0;font-size:12px;color:#888;">The Mandala Company · estate ledger · generated automatically on payment.</p>` +
    `</body></html>`
  );
};

// ---------------------------------------------------------------------------
// Estate alert — a plain internal note when something needs a human.
// ---------------------------------------------------------------------------
// Utilitarian (this goes to the estate inbox, never a buyer). Used today by the
// registry check below; fail-open like every other send in this file.
const renderEstateAlertHtml = (p: {
  headline: string;
  orderRef: string;
  rows: Array<[string, string]>;
  action: string;
}): string =>
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/></head>` +
  `<body style="font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;padding:24px;">` +
  `<h2 style="margin:0 0 4px 0;">${esc(p.headline)}</h2>` +
  `<p style="margin:0 0 16px 0;color:#444;">Order <strong>${esc(p.orderRef)}</strong></p>` +
  `<table style="border-collapse:collapse;font-size:13px;">` +
  p.rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#666;">${esc(k)}</td>` +
        `<td style="padding:6px 0;"><strong>${esc(v)}</strong></td></tr>`,
    )
    .join("") +
  `</table>` +
  `<p style="margin:18px 0 0 0;color:#444;">${esc(p.action)}</p>` +
  `<p style="margin:18px 0 0 0;font-size:12px;color:#888;">The Mandala Company · generated automatically by the Stripe webhook.</p>` +
  `</body></html>`;

/** Send a plain internal note to the estate inbox. Fully fail-open — logs and
 *  returns on any missing key / Resend error; NEVER throws into the handler. */
async function sendEstateAlert(args: {
  subject: string;
  html: string;
  context: Record<string, unknown>;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error(
      "[stripe-webhook] estate alert could not be emailed — RESEND_API_KEY missing.",
      { subject: args.subject, ...args.context },
    );
    return;
  }
  try {
    const from = process.env.ESTATE_FROM_EMAIL || DEFAULT_FROM;
    const to = process.env.ESTATE_BCC_EMAIL || DEFAULT_BCC;
    const result = await new Resend(key).emails.send({
      from: `${FROM_NAME} <${from}>`,
      to: [to],
      replyTo: DEFAULT_FROM,
      subject: args.subject,
      html: args.html,
    });
    if (result.error) {
      console.error("[stripe-webhook] estate alert Resend error:", result.error, args.context);
    } else {
      console.log("[stripe-webhook] estate alert sent", { to, subject: args.subject });
    }
  } catch (err) {
    console.error(
      "[stripe-webhook] estate alert failed:",
      err instanceof Error ? err.message : err,
      args.context,
    );
  }
}

// ---------------------------------------------------------------------------
// Minted-code registry (for refund / dispute revocation)
// ---------------------------------------------------------------------------
// Every promotion code minted for a session is recorded under
// `codes:session:<sessionId>` so a later charge.refunded / charge.dispute.created
// can find and deactivate exactly those codes. Fail-open: when KV is absent the
// revocation path falls back to scanning recent promotion codes by metadata.
const CODES_KEY = (sessionId: string) => `codes:session:${sessionId}`;
const CODES_TTL_SECONDS = 400 * 24 * 60 * 60; // outlives the 365-day validity

interface MintedCodeRef {
  promotion_code_id: string;
  coupon_id: string;
  code: string;
  kind: string;
}

async function recordMintedCode(sessionId: string, ref: MintedCodeRef): Promise<void> {
  if (!kvDedupConfig()) return;
  await kvCmd(["RPUSH", CODES_KEY(sessionId), JSON.stringify(ref)]);
  await kvCmd(["EXPIRE", CODES_KEY(sessionId), CODES_TTL_SECONDS]);
}

async function readMintedCodes(sessionId: string): Promise<MintedCodeRef[]> {
  if (!kvDedupConfig()) return [];
  const raw = await kvCmd(["LRANGE", CODES_KEY(sessionId), 0, -1]);
  if (!Array.isArray(raw)) return [];
  const out: MintedCodeRef[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    try {
      out.push(JSON.parse(item) as MintedCodeRef);
    } catch {
      /* corrupt entry — skip */
    }
  }
  return out;
}

/**
 * Deactivate every promotion code minted for a session, and delete the coupons
 * behind them so the value can't be applied by any other route either.
 *
 * ⚠️ Codes are minted and emailed the moment payment is confirmed and stay live
 * for 365 days. Without this, a refunded or disputed order left a full-value
 * gift code in the wild — the estate returns the money AND honours the card.
 *
 * Primary lookup is the KV registry above; when KV is unavailable we fall back
 * to scanning recent promotion codes for the session id in their metadata.
 * Entirely fail-open — every step is caught, and the handler still 200s.
 */
/**
 * Deactivate every code minted for a session.
 *
 * ⚠️ `permanent` decides whether the underlying COUPON is deleted, and that
 * choice is irreversible. `charge.dispute.created` fires when a dispute is
 * OPENED — including a mere inquiry the estate may well win — and deleting the
 * coupon there left a paying customer holding a dead card with no way back,
 * because `coupons.del` cannot be undone. Deactivating the promotion code is
 * reversible and is enough to stop redemption, so a dispute only ever
 * deactivates; deletion is reserved for a settled FULL refund.
 */
async function revokeSessionCodes(
  stripe: Stripe,
  sessionId: string,
  reason: string,
  permanent = false,
): Promise<number> {
  let refs = await readMintedCodes(sessionId);
  if (refs.length === 0) {
    // KV fallback — Stripe cannot filter promotion codes by metadata, so scan
    // the most recent pages and match on the session id we wrote at mint time.
    try {
      const scanned: MintedCodeRef[] = [];
      let startingAfter: string | undefined;
      for (let page = 0; page < 3; page += 1) {
        const list = await stripe.promotionCodes.list({
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
        for (const pc of list.data) {
          if (pc.metadata?.session_id !== sessionId) continue;
          // `promotion.coupon` is the SDK's current shape (the flat `coupon`
          // field is legacy) — same shape createGiftCard writes on the way in.
          const coupon = pc.promotion?.coupon ?? null;
          const couponId = typeof coupon === "string" ? coupon : coupon?.id ?? "";
          scanned.push({
            promotion_code_id: pc.id,
            coupon_id: couponId,
            code: pc.code,
            kind: pc.metadata?.kind ?? "",
          });
        }
        if (!list.has_more || list.data.length === 0) break;
        startingAfter = list.data[list.data.length - 1].id;
      }
      refs = scanned;
    } catch (err) {
      console.error(
        "[stripe-webhook] promotion-code scan failed during revocation:",
        err instanceof Error ? err.message : err,
        { session_id: sessionId },
      );
    }
  }
  let revoked = 0;
  for (const ref of refs) {
    try {
      await stripe.promotionCodes.update(ref.promotion_code_id, { active: false });
      revoked += 1;
      console.log("[stripe-webhook] promotion code deactivated", {
        session_id: sessionId,
        code: ref.code,
        kind: ref.kind,
        reason,
      });
    } catch (err) {
      console.error(
        "[stripe-webhook] promotion code deactivation failed:",
        err instanceof Error ? err.message : err,
        { session_id: sessionId, code: ref.code },
      );
    }
    // ⚠️ IRREVERSIBLE — only on a settled full refund. See the note on
    // `permanent` above: a dispute can be won, and a deleted coupon cannot be
    // restored. Deactivating the promotion code above already stops redemption.
    if (!permanent || !ref.coupon_id) continue;
    try {
      // Deleting the coupon closes the `discounts:[{coupon}]` route too. Already
      // completed redemptions are unaffected (Stripe's documented behaviour).
      await stripe.coupons.del(ref.coupon_id);
    } catch (err) {
      console.error(
        "[stripe-webhook] coupon delete failed:",
        err instanceof Error ? err.message : err,
        { session_id: sessionId, coupon: ref.coupon_id },
      );
    }
  }
  return revoked;
}

/**
 * Bring back the codes deactivated when a dispute was opened, after the estate
 * WINS it. Only possible because the dispute path never deletes the coupon.
 */
async function reactivateSessionCodes(
  stripe: Stripe,
  sessionId: string,
): Promise<number> {
  const refs = await readMintedCodes(sessionId);
  let restored = 0;
  for (const ref of refs) {
    try {
      await stripe.promotionCodes.update(ref.promotion_code_id, { active: true });
      restored += 1;
    } catch (err) {
      console.error(
        "[stripe-webhook] promotion code reactivation failed:",
        err instanceof Error ? err.message : err,
        { session_id: sessionId, code: ref.code },
      );
    }
  }
  return restored;
}

// ---------------------------------------------------------------------------
// Payment gate + session-level processing claim
// ---------------------------------------------------------------------------
/**
 * Has the money actually been taken?
 *
 * ⚠️ "paid" is the ordinary case. "no_payment_required" is a £0 session — a
 * gift code that covers the order in full — which IS a completed order and must
 * still be fulfilled, certificate and all. Anything else ("unpaid") means a
 * delayed payment method has not settled yet: issue NOTHING.
 */
const isSessionPaid = (session: Stripe.Checkout.Session): boolean =>
  session.payment_status === "paid" ||
  session.payment_status === "no_payment_required";

/**
 * Claim a session for one-time processing of ONE CONCERN.
 *
 * ⚠️ PER-CONCERN, not per-session — this is the subtle one. Print fulfilment and
 * gift minting run on DIFFERENT events for the same order: an unpaid Klarna
 * session fulfils its prints on `checkout.session.completed` and mints its gift
 * codes later on `checkout.session.async_payment_succeeded`. A single
 * session-wide claim would be taken by the print run and would then SILENTLY
 * SWALLOW the deferred gift mint — the buyer would pay and never receive the
 * code. Each concern therefore claims its own key.
 *
 * The claim is only ever taken when the work actually runs: the deferred path
 * below does NOT claim the gift concern, precisely so the async event still can.
 *
 * FAIL-OPEN, like every KV call in this file: with no KV configured it returns
 * true and processing proceeds (both mint calls carry Stripe idempotency keys,
 * so a duplicate delivery still cannot mint a second coupon).
 */
type ProcessingConcern = "fulfilment" | "gifts";

/**
 * ⚠️ TWO-PHASE, exactly like the event claim — do NOT simplify this back to a
 * single `SET … NX EX 86400`.
 *
 * It was single-phase, and that quietly DEFEATED the event-level release. The
 * event claim is released when a handler throws so Stripe's retry can redo the
 * work — but `dispatchEvent` almost never throws (processGiftCards try/catches
 * every per-card step), so the realistic failure is a TIMEOUT, and on a timeout
 * this key stayed set for 24 hours. Sequence: claim gifts → lambda killed → no
 * 200 → Stripe retries → event claim released, so `kvClaimEventId` says
 * "first" → this returns FALSE → processGiftCards skipped entirely. Buyer paid,
 * no code, no email, no alert. Byte-for-byte the bug the release path exists to
 * prevent.
 *
 * Reachable: MAX_ITEMS is 20 and counts gift cards, and each card is ~6
 * sequential round trips (coupon, promo, RPUSH, EXPIRE, recipient send, estate
 * alert) AFTER print fulfilment in the same invocation.
 *
 * Now: a short `processing` marker, promoted to a durable `done` only once the
 * work completes, and released on failure — so a killed invocation leaves the
 * claim expiring in seconds rather than blocking the retry for a day.
 */
async function claimSessionProcessing(
  sessionId: string,
  concern: ProcessingConcern,
): Promise<boolean> {
  if (!kvDedupConfig()) return true;
  const key = `stripe_session_done:${concern}:${sessionId}`;
  const claim = await kvCmd([
    "SET",
    key,
    KV_PROCESSING_MARKER,
    "NX",
    "EX",
    String(KV_PROCESSING_TTL_SECONDS),
  ]);
  if (claim === "OK") return true;
  if (claim === null) {
    // ⚠️ FAIL OPEN, NOT CLOSED. `kvCmd` returns null for FIVE different
    // outcomes — key-exists, !resp.ok, json.error, a network failure, and the
    // 2.5s timeout — so null alone does NOT mean "already processed". This
    // used to skip the concern on any of them, and during a KV blip the
    // follow-up GET returns null too, so a 2.5-second outage silently skipped
    // ALL fulfilment: no certificate, no ledger entry, no estate email, no
    // buyer confirmation, no gift code, no alert — and the handler still 200s,
    // so Stripe never retries. The exact outcome the two-phase rewrite exists
    // to prevent, reached through a different door.
    //
    // A GET that returns the DONE marker is the only positive proof the work
    // already completed. Anything else — the processing marker (a previous
    // attempt died mid-flight) or another null (KV is unwell) — means do the
    // work. Duplicates are bounded by Stripe idempotency; a skip is not
    // bounded by anything.
    const existing = await kvCmd(["GET", key]);
    if (existing === KV_DONE_MARKER) {
      console.log("[stripe-webhook] session concern already processed, skipping", {
        session_id: sessionId,
        concern,
      });
      return false;
    }
    console.warn(
      "[stripe-webhook] session concern claim inconclusive — doing the work rather than risking a silent skip",
      { session_id: sessionId, concern, marker: existing ?? "unavailable" },
    );
    return true;
  }
  // Unexpected result / KV blip — fail open.
  return true;
}

/** Phase 2 — the concern's work finished; hold the key for the full dedup TTL. */
async function completeSessionProcessing(
  sessionId: string,
  concern: ProcessingConcern,
): Promise<void> {
  if (!kvDedupConfig()) return;
  await kvCmd([
    "SET",
    `stripe_session_done:${concern}:${sessionId}`,
    KV_DONE_MARKER,
    "EX",
    String(KV_DEDUP_TTL_SECONDS),
  ]);
}

/**
 * Release the concern claim because the work did not complete.
 *
 * ⚠️ NEVER delete a `done` marker. This used to DEL unconditionally, so if
 * invocation A completed and promoted to `done` while B — which had taken the
 * claim over — later threw, B deleted A's COMPLETED claim and re-opened the
 * concern even though the work had succeeded. Only clear the key when it is
 * still `processing`.
 */
async function releaseSessionProcessing(
  sessionId: string,
  concern: ProcessingConcern,
): Promise<void> {
  if (!kvDedupConfig()) return;
  const key = `stripe_session_done:${concern}:${sessionId}`;
  const existing = await kvCmd(["GET", key]);
  if (existing === KV_DONE_MARKER) {
    console.warn(
      "[stripe-webhook] not releasing a completed concern claim — another invocation finished this work",
      { session_id: sessionId, concern },
    );
    return;
  }
  await kvCmd(["DEL", key]);
}
/**
 * Claim a concern, run its work, then promote the claim — or release it if the
 * work threw. Every call site goes through this so none can forget the second
 * phase and silently re-open the lost-gift-card hole.
 */
async function runSessionConcern(
  sessionId: string,
  concern: ProcessingConcern,
  work: () => Promise<void>,
): Promise<void> {
  if (!(await claimSessionProcessing(sessionId, concern))) return;
  try {
    await work();
  } catch (err) {
    await releaseSessionProcessing(sessionId, concern).catch(() => {});
    console.error(
      "[stripe-webhook] session concern threw — claim released so a retry can redo it:",
      err instanceof Error ? err.message : err,
      { session_id: sessionId, concern },
    );
    throw err;
  }
  await completeSessionProcessing(sessionId, concern).catch(() => {});
}



// ---------------------------------------------------------------------------
// Completed-order processing — split by RISK, deliberately
// ---------------------------------------------------------------------------
// ⚠️ READ BEFORE RE-COMBINING THESE. The two concerns below have OPPOSITE
// failure costs, so they are gated differently on purpose:
//
//   • PRINT FULFILMENT (certificates, ledger, estate fulfilment email, buyer
//     confirmation) runs on `checkout.session.completed` REGARDLESS of
//     payment_status — exactly as it always has. A print is physically made and
//     posted by the estate, who can cancel an order that never settles, so
//     notifying early is RECOVERABLE. Gating it would mean that if the
//     `checkout.session.async_payment_succeeded` event were ever missing from
//     the endpoint's subscription, a Klarna buyer could pay £1,300 and receive
//     NOTHING, silently — an unrecoverable failure, and one that would hit print
//     orders that were never at risk in the first place.
//
//   • GIFT-CODE MINTING is gated on isSessionPaid(). This is the actual
//     giveaway: an unpaid session used to mint and email a live £5,000 code that
//     stayed valid for 365 days whether or not the money ever arrived. Nothing
//     is minted or emailed until the money is confirmed; the deferred mint
//     arrives via `checkout.session.async_payment_succeeded`, and the estate is
//     emailed an alert meanwhile so a missing subscription is visible, not
//     silent.
//
// Fail-open throughout: every downstream step is caught and logged so the
// webhook always returns 200 to Stripe.

/** The buyer / order facts both concerns derive identically off a session. */
interface OrderContext {
  m: Stripe.Metadata;
  shipping: { name?: string | null; address?: unknown } | null;
  buyerEmail: string | null;
  buyerName: string | null;
  /** A gift-ONLY basket (api/checkout.ts writes order_kind:"gift"). It has no
   *  print lines, so its buyer confirmation belongs to the GIFT concern. */
  isGiftOrder: boolean;
}

const orderContext = (session: Stripe.Checkout.Session): OrderContext => {
  const m = session.metadata ?? {};
  const shipping =
    (session as unknown as {
      shipping_details?: { name?: string | null; address?: unknown };
    }).shipping_details ?? null;
  return {
    m,
    shipping,
    buyerEmail: session.customer_details?.email ?? null,
    buyerName: session.customer_details?.name ?? shipping?.name ?? null,
    isGiftOrder: m.order_kind === "gift",
  };
};

/**
 * PRINT FULFILMENT — certificates, the estate ledger + fulfilment email, the
 * CRM/ads events, the Family & Friends code and the buyer's print confirmation.
 *
 * ⚠️ NOT gated on payment_status. See the block comment above: silent
 * non-fulfilment of a paid print is worse than early notification of one that
 * may not settle, and the estate can cancel the latter. Restores the behaviour
 * that shipped before the payment gate was introduced.
 *
 * A gift-ONLY order has nothing to fulfil here — no print lines, no thank-you
 * code, and its confirmation is sent by processGiftCards once the money lands.
 */
async function processPrintFulfilment(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  ctx: OrderContext,
): Promise<void> {
  const { m, shipping, buyerEmail, buyerName, isGiftOrder } = ctx;

  console.log("[stripe-webhook] print fulfilment", {
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
    order_kind: m.order_kind,
    size: m.size,
    shipping_name: shipping?.name,
    shipping_address: shipping?.address,
  });

  // -- 0b. Klaviyo "Placed Order" event + customer upsert ---------------
  // Best-effort + env-guarded (no KLAVIYO_API_KEY → clean no-op). Runs here
  // BEFORE the confirmation-email block, which returns early when
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
        const klaviyoLines = linesFromMetadata(
          m,
          session.amount_subtotal,
          session.currency,
        );
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
  // confirmation-email block (which returns early when RESEND_API_KEY /
  // buyerEmail are missing), like Klaviyo, so ad attribution isn't tied to
  // the email path. Try/catch'd; the webhook ALWAYS returns 200 regardless
  // of Meta's outcome.
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
  // then emails the estate the structured fulfilment payload (artwork, tier,
  // edition, print number, Certificate ID, /auth verify URL — the QR
  // target). Fully fail-open: a KV/Resend outage logs + continues, never
  // blocking the 200. Gift-only orders have no print lines → no certs.
  const printLineCount = ledgerLinesFromMetadata(m).length;
  // ⚠️ FAIL LOUDLY. Certificate issuance runs ONLY when the KV credentials
  // are present. Without them the order used to complete with NO certificate
  // and NOBODY told — a warning in a function log nobody reads. An order
  // carrying print lines with no registry is a fulfilment defect the estate
  // has to fix by hand, so it is emailed AND logged at error level. Still
  // fail-open: it never blocks the 200 to Stripe.
  if (printLineCount > 0 && !kvDedupConfig()) {
    console.error(
      "[stripe-webhook] ⚠️ CERTIFICATES NOT ISSUED — the estate registry (KV) is " +
        "not configured, so no Certificate ID or print number was recorded for this " +
        "order. Set KV_REST_API_URL + KV_REST_API_TOKEN (or the UPSTASH_* aliases) " +
        "on Vercel.",
      { session_id: session.id, print_lines: printLineCount },
    );
    await sendEstateAlert({
      subject: `⚠️ Certificates NOT issued · order ${session.id.slice(0, 12)}…`,
      html: renderEstateAlertHtml({
        headline: "Certificates were not issued for this order",
        orderRef: session.id,
        rows: [
          ["Print lines", String(printLineCount)],
          ["Buyer", buyerEmail ?? "—"],
          ["Ship to", shipping?.name ?? "—"],
          ["Reason", "The estate registry (KV) is not configured on this deployment."],
        ],
        action:
          "No Certificate ID or print number was recorded, and the fulfilment email was not sent. " +
          "Set KV_REST_API_URL and KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / " +
          "UPSTASH_REDIS_REST_TOKEN) in the Vercel project, then issue this order's certificates by hand.",
      }),
      context: { session_id: session.id, print_lines: printLineCount },
    });
  }
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
  //
  // ⚠️ FARMING GUARD: never mint on a gift-card order or a £0 order. A gift
  // coupon carries no `applies_to` restriction, so redeeming a £525 code
  // against a £525 gift card cost £0 — and used to mint BOTH a fresh
  // full-value gift code (365 fresh days) AND a fresh 10% thank-you code,
  // repeatable forever. api/checkout.ts refuses the promo-code field on any
  // basket holding a gift card; this is the second half of that guard.
  const skipThankYou = isGiftOrder || (session.amount_total ?? 0) === 0;
  let thankYou: ThankYouCode | null = null;
  if (skipThankYou) {
    console.log("[stripe-webhook] thank-you code not minted", {
      session_id: session.id,
      order_kind: m.order_kind ?? "",
      amount_total: session.amount_total,
    });
  } else {
    try {
      thankYou = await createThankYouCode(stripe, {
        sessionId: session.id,
        sessionCreated: session.created,
        buyerEmail,
      });
      console.log("[stripe-webhook] thank-you code minted", {
        session_id: session.id,
        code: thankYou.code,
      });
      // ⚠️ Record it alongside any gift codes: revokeSessionCodes only falls
      // back to scanning Stripe when the KV registry is EMPTY, so a thank-you
      // code left unrecorded would survive a refund on a mixed order.
      if (thankYou.couponId && thankYou.promotionCodeId) {
        await recordMintedCode(session.id, {
          promotion_code_id: thankYou.promotionCodeId,
          coupon_id: thankYou.couponId,
          code: thankYou.code,
          kind: "thank_you",
        });
      }
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
        couponId: null,
        promotionCodeId: null,
        valueLabel: "10%",
        expiresLabel: oneYear.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };
    }
  }

  // -- 2. Send the estate-branded confirmation email -------------------
  // ⚠️ A gift-ONLY order's confirmation is NOT sent here. It has to carry the
  // gift codes, which do not exist until the money is confirmed, so it belongs
  // to processGiftCards. Sending the print template for a gift-only order was
  // the original bug: an EMPTY item table under "your print from the Stephen
  // Meakin estate", with no mention of the code.
  if (isGiftOrder) return;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    // Documented design choice — see file header. Hugo gets a warning in
    // the function log but the webhook still 200s so Stripe is happy.
    console.warn(
      "[stripe-webhook] RESEND_API_KEY missing — skipping confirmation email.",
    );
    return;
  }
  if (!buyerEmail) {
    console.warn(
      "[stripe-webhook] No customer email on session — skipping confirmation email.",
      { session_id: session.id },
    );
    return;
  }

  try {
    const fromEmail = process.env.ESTATE_FROM_EMAIL || DEFAULT_FROM;
    const bccEmail = process.env.ESTATE_BCC_EMAIL || DEFAULT_BCC;
    const resend = new Resend(resendKey);

    // ⚠️ Priced in the SESSION's currency, not GBP. The lines used to render
    // `formatGBP(catalogue pence)` with the currency argument omitted, so a USD
    // buyer received an invoice whose lines read "£525" above a total reading
    // "$693". They are catalogue prices, so the bundle saving must then be
    // subtracted explicitly — without that row a 2+ print order shows lines
    // summing to MORE than the total with nothing to explain the gap. (The
    // saving is baked into the Stripe line unit amounts so the promo-code field
    // stays available for a gift code; the email has to re-state it.)
    const emailLines = linesFromMetadata(
      m,
      session.amount_subtotal,
      session.currency,
    );
    const bundle = bundleDiscountMinor(m, emailLines);
    // ⚠️ BOTH metadata shapes. `tier_ids` (plural) is written only on the
    // MULTI-item shape; a single-item order writes `tier_id`. Reading only the
    // plural meant orderTierIds was always [] on the commonest order shape, so
    // numberingLineFor returned null and every single-print order silently lost
    // the estate's numbering claim from its confirmation.
    const orderTierIds = m.tier_ids
      ? m.tier_ids.split(",").map((t) => t.trim()).filter(Boolean)
      : m.tier_id
        ? [m.tier_id.trim()].filter(Boolean)
        : [];

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
      html: renderOrderConfirmationHtml({
        buyerName,
        orderRef: session.id,
        lines: emailLines,
        discount:
          bundle.minor > 0
            ? {
                label: `Estate bundle thank-you (${bundle.percentOff}%)`,
                value: `− ${formatGBP(bundle.minor, session.currency)}`,
              }
            : null,
        // ⚠️ Gift cards are part of amount_total but are NOT print lines, so a
        // MIXED order used to show (say) £250 of lines under a £5,350 total
        // with nothing explaining the £5,100. Every gift card on the order now
        // gets its own row, valued in the currency actually charged, so the
        // invoice reconciles for mixed baskets as it already did for print-only.
        giftLines: parseGiftCards(m).map((g) => ({
          // GiftCard carries no label — the denomination label lives in the
          // gift_labels metadata array, which is parsed separately for the
          // gift emails. A plain "Gift card" row is enough here: this block
          // exists to make the invoice ADD UP, and the value is the figure
          // that was charged.
          label: "Gift card",
          value: formatGBP(g.chargedMinor, g.chargedCurrency),
        })),
        total: formatGBP(session.amount_total, session.currency),
        // Only claimed when EVERY print line is a numbered tier — Emblem and
        // Gallery are "unnumbered, issued to order".
        numberingLine: numberingLineFor(orderTierIds),
        thankYouCode: thankYou?.code ?? null,
        thankYouValue: thankYou?.valueLabel ?? null,
        thankYouExpiry: thankYou?.expiresLabel ?? null,
        estateEmail: DEFAULT_FROM,
      }),
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
}

/**
 * GIFT CODES — mint each card, email it to the recipient AND to the buyer, and
 * (on a gift-ONLY order) send the buyer's confirmation carrying the codes.
 *
 * ⚠️ ONLY ever called for a session isSessionPaid() says is settled. An unpaid
 * BNPL session must not mint or email a live code — that is the giveaway this
 * whole gate exists to stop.
 */
async function processGiftCards(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  ctx: OrderContext,
): Promise<void> {
  const { m, buyerEmail, buyerName, isGiftOrder } = ctx;

  // -- Mint + send each gift card ----------------------------------------
  // For each gift card purchased: mint an amount_off coupon + GIFT-XXXXXX
  // promotion code worth EXACTLY what the buyer paid, then email it to the
  // recipient (with the buyer's note) AND to the buyer. Every step is
  // try/catch'd per-card so one failure can't block the others or the
  // webhook — we ALWAYS return 200 (never make Stripe retry).
  const giftCards = parseGiftCards(m);
  const giftSummaries: Array<{
    label: string;
    amountLabel: string;
    code: string | null;
    expiresLabel: string | null;
    recipientName?: string | null;
    recipientEmail?: string | null;
  }> = [];
  // Labels are positional like every other gift array (see parseGiftCards).
  // Display-only — an absent slot just leaves the card unlabelled.
  // ⚠️ Pipe-first, like every other gift array. This used to split on
  // /[|,]/ unconditionally, which forced giftText to neutralise EVERY comma in
  // the buyer's text — so "Happy birthday, Mum. With all my love, from Hugo"
  // was delivered as "Happy birthday/ Mum. With all my love/ from Hugo" on a
  // memorial estate's gift card. joinGiftSlots always emits n-1 pipes for
  // n >= 2, so pipe-first is correct; the comma branch is kept only for
  // sessions created before 2026-09-01.
  const giftLabels = (() => {
    const raw = m.gift_labels || "";
    if (raw.includes("|") || giftCards.length <= 1) {
      return raw.split("|").map((t) => t.trim());
    }
    return raw.split(",").map((t) => t.trim());
  })();
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
      const giftLabel = giftLabels[i] || "";
      let minted: MintedGiftCard;
      try {
        minted = await createGiftCard(stripe, {
          sessionId: session.id,
          sessionCreated: session.created,
          buyerEmail,
          gift,
          index: i,
        });
        // INVARIANT confirmed in the log: minted value == amount charged,
        // in the currency the buyer was actually charged in.
        console.log("[stripe-webhook] gift card minted", {
          session_id: session.id,
          gift_index: i,
          code: minted.code,
          amount_minor: minted.amountMinor,
          currency: minted.currency,
          charged_minor: gift.chargedMinor,
          value_matches_charge: minted.amountMinor === gift.chargedMinor,
        });
        await recordMintedCode(session.id, {
          promotion_code_id: minted.promotionCodeId,
          coupon_id: minted.couponId,
          code: minted.code,
          kind: "gift_card",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[stripe-webhook] gift card mint failed:", message, {
          session_id: session.id,
          gift_index: i,
        });
        // ⚠️ ALERT THE ESTATE. This was the ONLY exceptional branch in this
        // file that logged and moved on — every other one emails Hugo, and the
        // refund handler's own comment says so. Nothing retries this: the
        // event is promoted to done and the session's gift concern is claimed,
        // so without an alert a paid card that failed to mint is invisible to
        // everyone. Worse on a MIXED order, where no gift confirmation is sent
        // at all, so the buyer is never even told a code is missing.
        await sendEstateAlert({
          subject: `⚠️ Gift code NOT issued · order ${session.id.slice(0, 12)}…`,
          html: renderEstateAlertHtml({
            headline: "A paid gift card could not be issued",
            orderRef: session.id,
            rows: [
              ["Card", giftLabel],
              ["Value", formatGBP(gift.chargedMinor, gift.chargedCurrency)],
              ["Recipient", gift.recipientEmail ?? gift.recipientName ?? "— (buyer to pass on)"],
              ["Error", message],
            ],
            action:
              "The buyer has PAID for this card and no code exists. Nothing will retry it. Issue a code manually in Stripe and send it on, or refund the line.",
          }),
          context: { session_id: session.id, gift_index: i },
        });
        giftSummaries.push({
          label: giftLabel,
          amountLabel: formatGBP(gift.chargedMinor, gift.chargedCurrency),
          code: null,
          expiresLabel: null,
          recipientName: gift.recipientName ?? null,
          recipientEmail: gift.recipientEmail ?? null,
        });
        continue; // skip the email for a card we couldn't mint
      }

      giftSummaries.push({
        label: giftLabel,
        amountLabel: minted.amountLabel,
        code: minted.code,
        expiresLabel: minted.expiresLabel,
        recipientName: gift.recipientName ?? null,
        recipientEmail: gift.recipientEmail ?? null,
      });

      // Send the dignified gift email. To the recipient if given (with the
      // buyer's note); else back to the buyer to forward. Estate BCC'd.
      if (!resendGift) continue;
      const sendGiftEmail = async (
        toAddress: string,
        toRecipient: boolean,
      ): Promise<void> => {
        const html = renderGiftHtml({
          toRecipient,
          recipientName: gift.recipientName ?? null,
          buyerName,
          giftMessage: gift.giftMessage ?? null,
          code: minted.code,
          amountLabel: minted.amountLabel,
          expiresLabel: minted.expiresLabel,
          estateEmail: DEFAULT_FROM,
          orderRef: session.id,
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
      };
      const recipientAddress = gift.recipientEmail ?? "";
      const primaryAddress = recipientAddress || buyerEmail;
      if (!primaryAddress) {
        console.warn(
          "[stripe-webhook] gift card has no recipient email AND no buyer email — code minted, email skipped.",
          { session_id: session.id, gift_index: i, code: minted.code },
        );
        continue;
      }
      try {
        await sendGiftEmail(primaryAddress, !!recipientAddress);
      } catch (err) {
        // Swallow all email errors — never fail the webhook on email send.
        const message = err instanceof Error ? err.message : String(err);
        console.error("[stripe-webhook] gift email failed:", message, {
          session_id: session.id,
          gift_index: i,
          code: minted.code,
        });
      }
      // ⚠️ The buyer ALWAYS gets their own copy of the code. A typo'd but
      // well-formed recipient address (bob@gmial.com) used to send a £750
      // card into the void with no copy anywhere — `gift.recipientEmail ||
      // buyerEmail` meant the buyer was skipped entirely whenever a
      // recipient was named. On a gift-ONLY order the confirmation email
      // below already restates every code, so the copy is sent here only
      // for a mixed basket (whose confirmation covers the prints).
      const needsBuyerCopy =
        !!recipientAddress &&
        !!buyerEmail &&
        buyerEmail.toLowerCase() !== recipientAddress.toLowerCase() &&
        !isGiftOrder;
      if (needsBuyerCopy && buyerEmail) {
        try {
          await sendGiftEmail(buyerEmail, false);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[stripe-webhook] gift buyer-copy email failed:", message, {
            session_id: session.id,
            gift_index: i,
            code: minted.code,
          });
        }
      }

      // ⚠️ THE ESTATE'S OWN RECORD OF THE CODE. Three buyer-facing surfaces
      // (Legal.tsx ×2, FAQ.tsx) promise "the estate is copied on every gift
      // email", and that promise is load-bearing: it is the stated remedy when
      // a buyer mistypes a recipient address, and Legal cites it as the basis
      // for retaining the recipient's details.
      //
      // The BCC on the sends above DOES NOT DELIVER IT in the default config.
      // DEFAULT_FROM and DEFAULT_BCC are both info@themandalacompany.com, and
      // every send drops the bcc when it equals the from address. That
      // short-circuit is deliberate and must stay — its comment records that
      // Resend can reject a self-BCC on some sender domains, and a rejected
      // send would mean the RECIPIENT never gets their code, which is far worse
      // than a missing copy.
      //
      // So the estate is notified explicitly instead, via sendEstateAlert,
      // which uses `to:` and is immune to that rule. Fail-open like everything
      // else here: it can never block the 200 to Stripe.
      await sendEstateAlert({
        subject: `Gift card issued · ${minted.amountLabel} · order ${session.id.slice(0, 12)}…`,
        html: renderEstateAlertHtml({
          headline: "A gift card has been issued",
          orderRef: session.id,
          rows: [
            ["Code", minted.code],
            ["Value", minted.amountLabel],
            ["Sent to", recipientAddress || `${buyerEmail ?? "—"} (buyer, to pass on)`],
            ["Recipient name", gift.recipientName || "—"],
            ["Valid until", minted.expiresLabel],
          ],
          action:
            "This is the estate's copy of the code. If the recipient says it never arrived — a mistyped address, a spam filter — you can re-send this code to another address.",
        }),
        context: { session_id: session.id, gift_index: i },
      });
    }
  }

  // -- Gift-only confirmation to the buyer --------------------------------
  // ⚠️ This is also the buyer's own copy of every code (see the recipient-typo
  // note above), so it must run whenever the order was gift-only.
  if (!isGiftOrder) return;
  const resendKeyConf = process.env.RESEND_API_KEY;
  if (!resendKeyConf || !buyerEmail) {
    console.warn(
      "[stripe-webhook] gift confirmation skipped — no RESEND_API_KEY or no buyer email.",
      { session_id: session.id, has_key: !!resendKeyConf, has_email: !!buyerEmail },
    );
    return;
  }
  try {
    const fromEmail = process.env.ESTATE_FROM_EMAIL || DEFAULT_FROM;
    const bccEmail = process.env.ESTATE_BCC_EMAIL || DEFAULT_BCC;
    const sendResult = await new Resend(resendKeyConf).emails.send({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: [buyerEmail],
      bcc: bccEmail && bccEmail.toLowerCase() !== fromEmail.toLowerCase()
        ? [bccEmail]
        : undefined,
      replyTo: DEFAULT_FROM,
      subject: "Thank you — your gift card from the Stephen Meakin estate",
      html: renderGiftOrderConfirmationHtml({
        buyerName,
        orderRef: session.id,
        cards: giftSummaries,
        total: formatGBP(session.amount_total, session.currency),
        estateEmail: DEFAULT_FROM,
      }),
    });
    if (sendResult.error) {
      console.error("[stripe-webhook] gift confirmation Resend error:", sendResult.error, {
        session_id: session.id,
      });
    } else {
      console.log("[stripe-webhook] gift confirmation email sent", {
        session_id: session.id,
        to: buyerEmail,
        cards: giftSummaries.length,
        resend_id: sendResult.data?.id,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe-webhook] gift confirmation email failed:", message, {
      session_id: session.id,
    });
  }
}

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
  if (seenEvents.has(event.id) || inFlightEvents.has(event.id)) {
    console.log("[stripe-webhook] duplicate event id, skipping", {
      event_id: event.id,
      type: event.type,
      kv: kvClaim,
    });
    return ok();
  }
  // ⚠️ TWO-PHASE — do NOT collapse this back into a single `seenEvents.set()`
  // before the switch. Both dedup layers used to claim the event BEFORE doing
  // the work and never released it: if the lambda died or timed out between the
  // claim and the mint, Stripe's retry — the only chance the order had — found
  // the key already present and was answered "duplicate", so a PAID gift card
  // was silently never issued, with no code, no email and no alert.
  //
  // Reachable, not theoretical: processGiftCards runs ~6 sequential round trips
  // per card (coupon, promo, RPUSH, EXPIRE, up to 2 sends) for up to 20 cards,
  // AFTER processPrintFulfilment in the same invocation.
  //
  // The id is now marked in-flight, promoted to "done" only once the work
  // completes, and RELEASED on a throw so the retry can do the work. Everything
  // stays fail-open: Stripe is still always answered 200.
  inFlightEvents.add(event.id);
  try {
    await dispatchEvent(event, stripe);
  } catch (err) {
    inFlightEvents.delete(event.id);
    await kvReleaseEventId(event.id).catch(() => {});
    console.error(
      "[stripe-webhook] handler threw — claim released so Stripe's retry can re-run it:",
      err instanceof Error ? err.message : err,
      { event_id: event.id, type: event.type },
    );
    return ok();
  }
  inFlightEvents.delete(event.id);
  seenEvents.set(event.id, Date.now());
  await kvPromoteEventId(event.id).catch(() => {});
  return ok();
}

/** The per-event work. Split out so the caller can own the two-phase claim
 *  (mark in-flight → run → promote, or release on a throw). */
async function dispatchEvent(
  event: Stripe.Event,
  stripe: Stripe,
): Promise<void> {
  switch (event.type) {
    // ⚠️ SPLIT GATE — read the block comment above processPrintFulfilment
    // before changing this. `checkout.session.completed` fires when the buyer
    // finishes checkout, NOT when the money arrives: with Klarna / Clearpay live
    // a session completes with payment_status "unpaid" and settles later.
    //   • Print fulfilment runs either way — a paid print that is never made is
    //     unrecoverable, an unsettled one the estate can simply cancel.
    //   • Gift codes wait for the money. Nothing is minted or emailed until
    //     isSessionPaid(); the deferred mint arrives on
    //     async_payment_succeeded, and the estate is alerted meanwhile.
    case "checkout.session.completed": {
      const session = event.data.object;
      const ctx = orderContext(session);
      await runSessionConcern(session.id, "fulfilment", () =>
        processPrintFulfilment(stripe, session, ctx),
      );
      const paid = isSessionPaid(session);
      if (paid) {
        await runSessionConcern(session.id, "gifts", () =>
          processGiftCards(stripe, session, ctx),
        );
      } else if (parseGiftCards(ctx.m).length > 0) {
        // ⚠️ DELIBERATELY NO CLAIM HERE — claiming "gifts" now would make the
        // deferred mint on async_payment_succeeded a silent no-op, and the
        // buyer would pay and never receive the code.
        const giftCount = parseGiftCards(ctx.m).length;
        console.error(
          "[stripe-webhook] gift code(s) NOT minted — payment not settled; waiting for " +
            "checkout.session.async_payment_succeeded (that event must be enabled on this " +
            "webhook endpoint or the code will never be issued)",
          {
            session_id: session.id,
            payment_status: session.payment_status,
            gift_count: giftCount,
          },
        );
        // Turn the dashboard prerequisite from a silent trap into a visible one:
        // Hugo sees a pending gift even if the async event was never subscribed.
        await sendEstateAlert({
          subject: `Gift code pending settlement · order ${session.id.slice(0, 12)}…`,
          html: renderEstateAlertHtml({
            headline: "A gift code is waiting on payment settlement",
            orderRef: session.id,
            rows: [
              ["Gift cards on order", String(giftCount)],
              ["Payment status", session.payment_status ?? "—"],
              ["Buyer", ctx.buyerEmail ?? "—"],
              [
                "Issued so far",
                "Nothing — no code has been minted or emailed.",
              ],
            ],
            action:
              "The code will be issued automatically when Stripe sends " +
              "checkout.session.async_payment_succeeded for this order. If that event is not " +
              "enabled on this webhook endpoint (Stripe Dashboard → Developers → Webhooks), " +
              "enable it — otherwise this buyer will never receive their gift code.",
          }),
          context: { session_id: session.id, gift_count: giftCount },
        });
      }
      break;
    }
    case "checkout.session.async_payment_succeeded": {
      // The delayed-payment settlement (Klarna / Clearpay / bank debits). The
      // gift mint that `completed` deferred happens HERE. Print fulfilment is
      // re-attempted too — normally a no-op because `completed` already claimed
      // the "fulfilment" concern, but it means an order still completes even if
      // the `completed` delivery was ever lost.
      const session = event.data.object;
      const ctx = orderContext(session);
      await runSessionConcern(session.id, "fulfilment", () =>
        processPrintFulfilment(stripe, session, ctx),
      );
      await runSessionConcern(session.id, "gifts", () =>
        processGiftCards(stripe, session, ctx),
      );
      break;
    }
    case "checkout.session.async_payment_failed": {
      // The buyer's delayed payment never cleared. No gift code was ever minted
      // (that is the whole point of the gate), but the print path already ran on
      // `completed`, so the Family & Friends code exists — revoke it, and tell
      // the estate the print must not be sent.
      const session = event.data.object;
      console.error("[stripe-webhook] delayed payment FAILED", {
        session_id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
      });
      try {
        const revoked = await revokeSessionCodes(stripe, session.id, event.type);
        console.log("[stripe-webhook] failed-payment code revocation complete", {
          session_id: session.id,
          codes_deactivated: revoked,
        });
      } catch (err) {
        console.error(
          "[stripe-webhook] failed-payment revocation failed:",
          err instanceof Error ? err.message : err,
          { session_id: session.id },
        );
      }
      await sendEstateAlert({
        subject: `⚠️ Payment FAILED — do not fulfil · order ${session.id.slice(0, 12)}…`,
        html: renderEstateAlertHtml({
          headline: "This order's delayed payment did not clear",
          orderRef: session.id,
          rows: [
            ["Payment status", session.payment_status ?? "—"],
            ["Buyer", session.customer_details?.email ?? "—"],
            ["Amount", String(session.amount_total ?? "—")],
          ],
          action:
            "The fulfilment email for this order was sent when the buyer completed checkout, " +
            "before the payment was confirmed. Do NOT place the print order. Any discount code " +
            "issued for it has been deactivated; no gift code was ever issued.",
        }),
        context: { session_id: session.id },
      });
      break;
    }
    case "charge.refunded":
    case "charge.dispute.created": {
      // ⚠️ Codes are live for 365 days from the moment payment confirms. A
      // refunded or disputed order left a full-value gift code in the wild — the
      // estate returned the money AND honoured the card. Deactivate every code
      // minted for that order. Entirely fail-open (the whole block is caught) so
      // it can never stop the 200 Stripe needs.
      try {
        if (event.type === "charge.refunded") {
          // A PARTIAL refund (a goodwill adjustment on a print) must not kill a
          // gift card the buyer still paid for in full. Only a fully-refunded
          // charge revokes.
          const charge = event.data.object;
          if (charge.amount_refunded < charge.amount) {
            console.log("[stripe-webhook] partial refund — codes left active", {
              charge_id: charge.id,
              amount: charge.amount,
              amount_refunded: charge.amount_refunded,
            });
            break;
          }
        }
        const paymentIntent = event.data.object.payment_intent;
        const piId =
          typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id ?? null;
        if (!piId) {
          console.warn("[stripe-webhook] refund/dispute with no payment intent — nothing to revoke", {
            type: event.type,
          });
          break;
        }
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: piId,
          limit: 1,
        });
        const sessionId = sessions.data[0]?.id ?? null;
        if (!sessionId) {
          console.warn(
            "[stripe-webhook] refund/dispute: no Checkout Session for payment intent — nothing to revoke",
            { type: event.type, payment_intent: piId },
          );
          break;
        }
        // ⚠️ Only a settled FULL refund deletes the coupon. A dispute has not
        // been decided yet and the estate may win it, so it deactivates only —
        // see reactivateSessionCodes and charge.dispute.closed below.
        const permanent = event.type === "charge.refunded";
        const revoked = await revokeSessionCodes(
          stripe,
          sessionId,
          event.type,
          permanent,
        );
        console.log("[stripe-webhook] refund/dispute code revocation complete", {
          type: event.type,
          session_id: sessionId,
          codes_deactivated: revoked,
          coupons_deleted: permanent,
        });
        // Every other exceptional branch in this file alerts the estate; this
        // one used to be console-only, so codes could be pulled from a paying
        // customer with nothing to tell Hugo it had happened.
        if (revoked > 0) {
          await sendEstateAlert({
            subject: `Codes deactivated · ${event.type} · order ${sessionId.slice(0, 12)}…`,
            html: renderEstateAlertHtml({
              headline:
                permanent
                  ? "A fully-refunded order's codes have been revoked"
                  : "A disputed order's codes have been suspended",
              orderRef: sessionId,
              rows: [
                ["Reason", event.type],
                ["Codes deactivated", String(revoked)],
                ["Coupons deleted", permanent ? "yes" : "no — reversible"],
              ],
              action: permanent
                ? "The money has been returned and every code minted for this order is now dead."
                : "The dispute is not yet decided, so the codes are suspended rather than deleted. If the dispute is won they are restored automatically when Stripe sends charge.dispute.closed.",
            }),
            context: { session_id: sessionId },
          });
        }
      } catch (err) {
        console.error(
          "[stripe-webhook] refund/dispute revocation failed:",
          err instanceof Error ? err.message : err,
          { type: event.type },
        );
      }
      break;
    }
    case "charge.dispute.closed": {
      // ⚠️ The other half of the reversible-dispute design. A dispute the estate
      // WINS must give the customer their card back — without this handler the
      // suspension from charge.dispute.created would be permanent in practice,
      // which is the very outcome the reversible path exists to avoid.
      try {
        const dispute = event.data.object;
        // ⚠️ NOT just "won". charge.dispute.created fires for INQUIRIES
        // (warning_needs_response) too, so their codes were deactivated — but an
        // inquiry resolved in the estate's favour closes as "warning_closed",
        // and a card the network blocked closes as "prevented". Gating on "won"
        // alone left those customers suspended FOREVER, which is precisely the
        // outcome the reversible-dispute design exists to prevent.
        const RESOLVED_IN_OUR_FAVOUR = ["won", "warning_closed", "prevented"];
        if (!RESOLVED_IN_OUR_FAVOUR.includes(dispute.status)) {
          console.log("[stripe-webhook] dispute closed but not won — codes stay suspended", {
            dispute_id: dispute.id,
            status: dispute.status,
          });
          break;
        }
        const paymentIntent = dispute.payment_intent;
        const piId =
          typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id ?? null;
        if (!piId) break;
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: piId,
          limit: 1,
        });
        const sessionId = sessions.data[0]?.id ?? null;
        if (!sessionId) break;
        const restored = await reactivateSessionCodes(stripe, sessionId);
        console.log("[stripe-webhook] dispute won — codes restored", {
          session_id: sessionId,
          codes_restored: restored,
        });
        if (restored > 0) {
          await sendEstateAlert({
            subject: `Dispute won — codes restored · order ${sessionId.slice(0, 12)}…`,
            html: renderEstateAlertHtml({
              headline: "A won dispute's codes have been restored",
              orderRef: sessionId,
              rows: [["Codes restored", String(restored)]],
              action:
                "The dispute was resolved in the estate's favour, so the codes suspended when it opened are live again.",
            }),
            context: { session_id: sessionId },
          });
        }
      } catch (err) {
        console.error(
          "[stripe-webhook] dispute-won reactivation failed:",
          err instanceof Error ? err.message : err,
        );
      }
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
          orderRef: session.id,
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
}
