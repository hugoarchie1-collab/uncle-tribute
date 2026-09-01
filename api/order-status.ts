/**
 * GET /api/order-status?ref=<stripe_session_id>[&email=<buyer email>]
 *
 * Public, read-only order tracking for the /orders page (Amazon "Returns &
 * Orders" → track an order). Looks a Stripe Checkout Session up by its id (the
 * "order reference" printed in the confirmation email) and returns ONLY safe,
 * public fields. If an email is supplied it must match the order's buyer email
 * — so a guessed/leaked session id alone reveals nothing about who bought it
 * unless the requester also knows the email (defence in depth; the id itself is
 * already a long unguessable `cs_…` token).
 *
 * Responses (200 unless a blank request, so the client branches cleanly):
 *   200 { found: true, order: {...} }   the order, public fields only
 *   200 { found: false }                no such order (or email mismatch)
 *   400 { error }                       missing ref
 *   503 { error }                       Stripe not configured in this env
 *
 * Self-contained (gotcha #5): no imports from /src or sibling /api files; only
 * the `stripe` npm dep + node built-ins. Vercel Node (req,res) signature, like
 * api/auth-lookup.ts.
 */
import Stripe from "stripe";

interface VercelReq {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  url?: string;
}
interface VercelRes {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const param = (req: VercelReq, key: string): string | undefined => {
  const q = req.query?.[key];
  let v = Array.isArray(q) ? q[0] : q;
  if (!v && req.url) {
    try {
      v = new URL(req.url, "http://localhost").searchParams.get(key) ?? undefined;
    } catch {
      /* ignore */
    }
  }
  return v?.trim() || undefined;
};

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

// A human, NON-leaky status from the Stripe session fields.
const humanStatus = (s: Stripe.Checkout.Session): string => {
  if (s.status === "expired") return "Checkout expired";
  if (s.payment_status === "unpaid" || s.payment_status === "no_payment_required") {
    return "Awaiting payment";
  }
  // Paid. We don't track dispatch in Stripe, so present the made-to-order state.
  return "Paid — in production (made to order)";
};

// Lift a short, public line-summary out of the session metadata (the checkout
// handler writes painting_title(s) / colourway_name(s)). Titles only — no
// addresses, no internal ids.
/**
 * The gift-card lines of an order, one entry per card, valued in the currency
 * the buyer was actually charged in.
 *
 * ⚠️ Gift cards are ADDITIVE to prints, never an alternative to them — see the
 * `has_gift` block in api/checkout.ts, whose own comment reads "gift-only OR
 * mixed with prints". This used to be a trailing `if` after two early returns
 * for paintings, so on a MIXED basket the gift card was never reached and
 * vanished from the order lookup entirely. Always append; never return early
 * past them. (Mirrors the identical helper in api/my-orders.ts — these
 * functions are deliberately duplicated because every /api file is
 * self-contained; change one, change both.)
 */
const giftSummary = (m: Stripe.Metadata): string[] => {
  // `gift_amounts_minor` + `gift_currency` are what was CHARGED;
  // `gift_amounts_pence` is the GBP catalogue value and the older key, kept as
  // a fallback for sessions created before that pair existed. Both are
  // pipe-joined and fixed-arity (comma tolerated for pre-2026-09-01 sessions).
  const split = (v: string | undefined) =>
    (v || "").split(v && v.includes("|") ? "|" : ",").map((s) => s.trim());

  const minor = split(m.gift_amounts_minor).filter(Boolean);
  const currency = m.gift_currency || "GBP";
  const amounts = minor.length > 0 ? minor : split(m.gift_amounts_pence).filter(Boolean);
  const inGbp = minor.length === 0;

  if (amounts.length > 0) {
    return amounts.map((raw) => {
      const n = Number.parseInt(raw, 10);
      return Number.isFinite(n)
        ? `Gift card — ${formatGBP(n, inGbp ? "GBP" : currency)}`
        : "Gift card";
    });
  }
  const count = Number.parseInt(m.gift_count || "", 10);
  return Array.from({ length: Number.isFinite(count) && count > 0 ? count : 1 }, () => "Gift card");
};

const itemSummary = (m: Stripe.Metadata | null): string[] => {
  if (!m) return [];
  const items: string[] = [];
  if (m.painting_titles) {
    const titles = m.painting_titles.split(",").map((t) => t.trim()).filter(Boolean);
    const cols = (m.colourway_names || "").split(",").map((c) => c.trim());
    items.push(...titles.map((t, i) => (cols[i] ? `${t} — ${cols[i]}` : t)));
  } else if (m.painting_title) {
    items.push(
      m.colourway_name ? `${m.painting_title} — ${m.colourway_name}` : m.painting_title,
    );
  }
  if (m.has_gift === "yes" || m.gift_amounts_pence || m.gift_amounts_minor) {
    items.push(...giftSummary(m));
  }
  return items;
};

export default async function handler(req: VercelReq, res: VercelRes) {
  for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const ref = param(req, "ref");
  const email = param(req, "email")?.toLowerCase();
  if (!ref) {
    res.status(400).json({ error: "Enter your order reference." });
    return;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    res.status(503).json({ error: "Order lookup is not available right now." });
    return;
  }

  // A Stripe Checkout Session id looks like cs_live_… / cs_test_…. Reject
  // anything else fast (and don't hand arbitrary strings to the API).
  if (!/^cs_[A-Za-z0-9_]+$/.test(ref)) {
    res.status(200).json({ found: false });
    return;
  }

  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(ref);
    const buyerEmail = session.customer_details?.email?.toLowerCase() ?? null;
    // If an email was supplied, it must match — otherwise reveal nothing.
    if (email && email !== buyerEmail) {
      res.status(200).json({ found: false });
      return;
    }
    res.status(200).json({
      found: true,
      order: {
        ref: session.id,
        date: session.created ? new Date(session.created * 1000).toISOString() : null,
        status: humanStatus(session),
        total: formatGBP(session.amount_total, session.currency),
        items: itemSummary(session.metadata ?? null),
      },
    });
  } catch {
    // A bad/unknown id throws — treat as not found (no leakage).
    res.status(200).json({ found: false });
  }
}
