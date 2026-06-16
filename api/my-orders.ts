/**
 * GET  /api/my-orders   → { signedIn, email?, orders?[] }   (session check + history)
 * POST /api/my-orders   → sign out: deletes the session + clears the cookie
 *
 * Reads the HttpOnly `tasm_session` cookie set by /api/auth-verify, resolves the
 * verified email from KV, then lists THAT buyer's paid Stripe orders (public
 * fields only). The email is trusted because the user proved control of it via
 * the one-time magic link — so returning their own order history is safe.
 *
 * Never 401s the GET — returns { signedIn: false } when there's no/invalid
 * session, so the client renders the sign-in form rather than an error. Dormant
 * when KV/Stripe are unconfigured (signedIn:false). Self-contained (gotcha #5):
 * inline Upstash REST + the `stripe` dep only.
 */
import Stripe from "stripe";

interface VercelReq {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}
interface VercelRes {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

const SESSION_PREFIX = "auth:session:";
const COOKIE = "tasm_session";

const kvConfig = (): { url: string; token: string } | null => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
};

const kvCmd = async (
  cfg: { url: string; token: string },
  cmd: (string | number)[],
): Promise<unknown> => {
  const resp = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd.map(String)),
    signal: AbortSignal.timeout(3000),
  });
  if (!resp.ok) throw new Error(`KV ${resp.status}`);
  const json = (await resp.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(json.error);
  return json.result ?? null;
};

const readCookie = (req: VercelReq, name: string): string | null => {
  const raw = req.headers.cookie;
  const header = Array.isArray(raw) ? raw.join(";") : raw;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("=")) || null;
  }
  return null;
};

const formatGBP = (pence: number | null | undefined): string =>
  typeof pence === "number"
    ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100)
    : "—";

const itemSummary = (m: Stripe.Metadata | null): string[] => {
  if (!m) return [];
  if (m.painting_titles) {
    const titles = m.painting_titles.split(",").map((t) => t.trim()).filter(Boolean);
    const cols = (m.colourway_names || "").split(",").map((c) => c.trim());
    return titles.map((t, i) => (cols[i] ? `${t} — ${cols[i]}` : t));
  }
  if (m.painting_title) {
    return [m.colourway_name ? `${m.painting_title} — ${m.colourway_name}` : m.painting_title];
  }
  if (m.gift_amounts_pence || m.gift_cards) return ["Gift card"];
  return [];
};

export default async function handler(req: VercelReq, res: VercelRes) {
  const session = readCookie(req, COOKIE);
  const cfg = kvConfig();

  // ---- Sign out -----------------------------------------------------------
  if (req.method === "POST") {
    if (session && cfg) {
      try {
        await kvCmd(cfg, ["DEL", `${SESSION_PREFIX}${session}`]);
      } catch {
        /* best-effort */
      }
    }
    res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
    res.status(200).json({ signedIn: false });
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const signedOut = () => res.status(200).json({ signedIn: false });

  if (!session || !cfg) {
    signedOut();
    return;
  }

  let email: string;
  try {
    const result = await kvCmd(cfg, ["GET", `${SESSION_PREFIX}${session}`]);
    if (typeof result !== "string" || !result) {
      signedOut();
      return;
    }
    email = result.toLowerCase();
  } catch {
    signedOut();
    return;
  }

  // Signed in. Try to attach order history (best-effort — never fail the
  // session check on a Stripe hiccup).
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  let orders: Array<{ ref: string; date: string | null; total: string; status: string; items: string[] }> = [];
  if (stripeKey) {
    try {
      const stripe = new Stripe(stripeKey);
      // Small estate shop: scan recent sessions + match the verified email.
      // (Note: caps at the most recent 100 paid orders; revisit with a
      // customer-keyed lookup if volume grows.)
      const list = await stripe.checkout.sessions.list({ limit: 100 });
      orders = list.data
        .filter(
          (s) =>
            s.status === "complete" &&
            (s.customer_details?.email?.toLowerCase() ?? "") === email,
        )
        .map((s) => ({
          ref: s.id,
          date: s.created ? new Date(s.created * 1000).toISOString() : null,
          total: formatGBP(s.amount_total),
          status: "Paid — in production (made to order)",
          items: itemSummary(s.metadata ?? null),
        }));
    } catch (err) {
      console.error("[my-orders] stripe list failed:", err instanceof Error ? err.message : err);
    }
  }

  res.status(200).json({ signedIn: true, email, orders });
}
