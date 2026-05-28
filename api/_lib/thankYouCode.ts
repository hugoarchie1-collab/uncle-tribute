/**
 * Create a personal thank-you promotion code for a first-time buyer.
 *
 * This is the dignified register described in CLAUDE.md / the email funnel
 * brief: instead of a public "10% OFF" banner, the estate quietly sends each
 * collector a single-use code in their order confirmation, valid for one year.
 *
 * Mechanism:
 *   1. Create a Stripe Coupon — 10% off, redeemable ONCE in total, expires
 *      365 days from now. The percentage and validity window are constants
 *      below; tweak in one place if Hugo wants to change them later.
 *   2. Create a Stripe PromotionCode bound to that coupon, with a generated
 *      human-readable code like "FRIENDS-AB12CD" (FRIENDS prefix is the
 *      estate's register; suffix is 6 random alphanumerics for uniqueness
 *      and to avoid guessable codes).
 *   3. Annotate both with metadata: the order's session id, the buyer email,
 *      and a marker `kind: "thank_you"` so they're filterable in the Stripe
 *      dashboard.
 *
 * Stripe doesn't natively bind a promotion code to a specific email at the
 * checkout layer, but because the code is unguessable AND the coupon caps
 * total redemptions at 1, there is no abuse vector — even if the buyer
 * forwards it, only one person ever benefits.
 *
 * Failure mode: if Stripe rejects the create call (rate limit, network,
 * misconfigured key), the caller catches and falls back to a static reusable
 * code — see api/stripe-webhook.ts. This file therefore THROWS on failure
 * rather than swallowing — the caller decides the fallback policy.
 *
 * Self-contained — no cross-directory imports (gotcha #5 in CLAUDE.md).
 */

import type Stripe from "stripe";

/** Percentage off — tuned to industry benchmarks for art at this price point. */
const DISCOUNT_PERCENT = 10;
/** Coupon lifetime, in days from creation. */
const VALID_DAYS = 365;
/** Human-readable prefix; deliberately not "WELCOME" / "DISCOUNT" / "SAVE". */
const CODE_PREFIX = "FRIENDS";
/** Suffix character set — uppercase letters + digits, no ambiguous glyphs. */
const SUFFIX_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SUFFIX_LENGTH = 6;

export interface ThankYouCode {
  /** The code the buyer types at checkout, e.g. "FRIENDS-A2C9X7". */
  code: string;
  /** Display string for the email copy, e.g. "10%". */
  valueLabel: string;
  /** Human-readable expiry, e.g. "29 May 2027". */
  expiresLabel: string;
}

const randomSuffix = (length = SUFFIX_LENGTH): string => {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += SUFFIX_ALPHABET[Math.floor(Math.random() * SUFFIX_ALPHABET.length)];
  }
  return out;
};

const formatExpiryDate = (date: Date): string => {
  // en-GB locale, long month, no time component — "29 May 2027".
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const createThankYouCode = async (
  stripe: Stripe,
  { sessionId, buyerEmail }: { sessionId: string; buyerEmail: string | null },
): Promise<ThankYouCode> => {
  const expiresAt = new Date(Date.now() + VALID_DAYS * 24 * 60 * 60 * 1000);
  // Stripe wants UNIX seconds, not ms.
  const expiresUnix = Math.floor(expiresAt.getTime() / 1000);

  const coupon = await stripe.coupons.create({
    percent_off: DISCOUNT_PERCENT,
    duration: "once",
    max_redemptions: 1,
    redeem_by: expiresUnix,
    name: `Estate thank-you — ${sessionId.slice(0, 14)}`,
    metadata: {
      kind: "thank_you",
      session_id: sessionId,
      buyer_email: buyerEmail ?? "",
    },
  });

  // Retry the create-with-code up to 3 times if the suffix happens to clash
  // with an existing live code (vanishingly rare with 30^6 = ~729M codes,
  // but Stripe does throw `code_already_exists` on collision).
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
          kind: "thank_you",
          session_id: sessionId,
          buyer_email: buyerEmail ?? "",
        },
      });
      return {
        code,
        valueLabel: `${DISCOUNT_PERCENT}%`,
        expiresLabel: formatExpiryDate(expiresAt),
      };
    } catch (err) {
      promoErr = err;
      // Retry only on the specific code-collision error; bail on anything else.
      const message = err instanceof Error ? err.message : "";
      if (!message.includes("code_already_exists") && !message.includes("already exists")) {
        break;
      }
    }
  }
  throw promoErr instanceof Error
    ? promoErr
    : new Error("Failed to create thank-you promotion code.");
};
