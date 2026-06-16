/**
 * POST /api/auth-request   body: { email }
 *
 * Step 1 of passwordless sign-in. Mints a single-use, 15-minute token, stores
 * it in Vercel KV / Upstash keyed by the token, and emails the buyer a magic
 * link (<SITE_URL>/account?token=…) via Resend. ALWAYS returns 200 {ok:true} —
 * never reveals whether an email is known, and never errors the caller.
 *
 * DORMANT-UNTIL-CONFIGURED: with no KV (or no RESEND_API_KEY) it still returns
 * 200 and just logs that accounts aren't provisioned — so the UI shows the same
 * calm "check your inbox" state and nothing leaks. Security-sensitive — review
 * before enabling in production.
 *
 * Self-contained (gotcha #5): inline Upstash REST + Resend + node:crypto only.
 */
import { randomBytes } from "node:crypto";
import { Resend } from "resend";

interface VercelReq {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  on: (ev: string, cb: (chunk?: unknown) => void) => void;
}
interface VercelRes {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
}

const DEFAULT_FROM = "info@themandalacompany.com";
const FROM_NAME = "The Mandala Company";
const TOKEN_TTL_SECONDS = 900; // 15 minutes
const TOKEN_PREFIX = "auth:token:";

const kvConfig = (): { url: string; token: string } | null => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
};

const kvSetEx = async (cfg: { url: string; token: string }, key: string, val: string, ex: number) => {
  const resp = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(["SET", key, val, "EX", String(ex)]),
    signal: AbortSignal.timeout(3000),
  });
  if (!resp.ok) throw new Error(`KV SET ${resp.status}`);
};

// Best-effort in-memory throttle (per warm instance) — a soft guard against a
// single client hammering the endpoint. Not a substitute for a real WAF.
const HITS = new Map<string, number[]>();
const rateLimited = (emailKey: string): boolean => {
  const now = Date.now();
  const win = 10 * 60 * 1000;
  const arr = (HITS.get(emailKey) ?? []).filter((t) => now - t < win);
  arr.push(now);
  HITS.set(emailKey, arr);
  return arr.length > 5; // >5 requests / 10 min for one email
};

const readBody = async (req: VercelReq): Promise<Record<string, unknown>> => {
  if (req.body && typeof req.body === "object") return req.body as Record<string, unknown>;
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve) => {
    req.on("data", (c) => chunks.push(typeof c === "string" ? Buffer.from(c) : (c as Buffer)));
    req.on("end", () => resolve());
    req.on("error", () => resolve());
  });
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const magicLinkEmail = (link: string): string => {
  const SANS = `"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif`;
  const DISPLAY = `"Playfair Display",Georgia,"Times New Roman",serif`;
  return (
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="color-scheme" content="dark only"/></head>` +
    `<body style="background:#0a0908;margin:0;padding:32px 16px;font-family:${SANS};color:#ede6d6;">` +
    `<div style="max-width:520px;margin:0 auto;">` +
    `<p style="font-size:10px;font-weight:700;letter-spacing:0.34em;text-transform:uppercase;color:#c97844;margin:0 0 18px;">The Mandala Company · The estate of Stephen Meakin</p>` +
    `<h1 style="font-family:${DISPLAY};font-weight:700;font-size:30px;line-height:1.15;margin:0 0 18px;">Your sign-in link</h1>` +
    `<p style="font-size:15px;line-height:1.7;color:rgba(237,230,214,0.8);margin:0 0 24px;">Tap the button below to sign in to your account and view your orders. The link is valid for 15 minutes and can be used once.</p>` +
    `<p style="margin:0 0 28px;"><a href="${link}" style="display:inline-block;background:#ede6d6;color:#0a0908;font-size:13px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:14px 30px;border-radius:4px;">Sign in</a></p>` +
    `<p style="font-size:12px;line-height:1.65;color:rgba(237,230,214,0.55);margin:0;">If you didn't request this, you can safely ignore it — no one can access your account without this link.</p>` +
    `</div></body></html>`
  );
};

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const body = await readBody(req);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  // Invalid email is the ONE case we surface (a UX hint), since it leaks nothing.
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: "Enter a valid email address." });
    return;
  }

  // From here on we ALWAYS return 200 {ok:true} regardless of outcome, so the
  // endpoint never reveals whether an account/order exists for this email.
  const ok = () => res.status(200).json({ ok: true });

  if (rateLimited(email)) {
    console.warn("[auth-request] rate-limited", { email: email.slice(0, 3) + "…" });
    return ok();
  }

  const cfg = kvConfig();
  const resendKey = process.env.RESEND_API_KEY;
  if (!cfg || !resendKey) {
    console.warn(
      "[auth-request] accounts not provisioned (KV / RESEND missing) — no link sent.",
    );
    return ok();
  }

  try {
    const token = randomBytes(24).toString("hex"); // 48 hex chars, unguessable
    await kvSetEx(cfg, `${TOKEN_PREFIX}${token}`, email, TOKEN_TTL_SECONDS);
    const siteUrl = (process.env.SITE_URL || "https://themandalacompany.com").replace(/\/$/, "");
    const link = `${siteUrl}/api/auth-verify?token=${token}`;
    const fromEmail = process.env.ESTATE_FROM_EMAIL || DEFAULT_FROM;
    const resend = new Resend(resendKey);
    const sent = await resend.emails.send({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: [email],
      replyTo: DEFAULT_FROM,
      subject: "Your sign-in link — The Art of Stephen Meakin",
      html: magicLinkEmail(link),
    });
    if (sent.error) console.error("[auth-request] resend error:", sent.error);
    else console.log("[auth-request] magic link sent", { to: email.slice(0, 3) + "…" });
  } catch (err) {
    console.error("[auth-request] failed:", err instanceof Error ? err.message : err);
  }
  return ok();
}
