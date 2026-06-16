/**
 * GET /api/auth-verify?token=…
 *
 * Step 2 of passwordless sign-in. Atomically consumes the single-use token
 * (GETDEL), mints a 30-day session, stores it in KV keyed by an unguessable
 * session id, sets an HttpOnly + Secure + SameSite=Lax cookie, and 302-redirects
 * to /account. Any failure → redirect /account?error=link (no detail leaked).
 *
 * Self-contained (gotcha #5): inline Upstash REST + node:crypto only.
 */
import { randomBytes } from "node:crypto";

interface VercelReq {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  url?: string;
}
interface VercelRes {
  status: (code: number) => VercelRes;
  setHeader: (name: string, value: string) => void;
  end: (body?: unknown) => void;
}

const TOKEN_PREFIX = "auth:token:";
const SESSION_PREFIX = "auth:session:";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
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

export default async function handler(req: VercelReq, res: VercelRes) {
  const siteUrl = (process.env.SITE_URL || "https://themandalacompany.com").replace(/\/$/, "");
  const redirect = (path: string) => {
    res.status(302);
    res.setHeader("Location", `${siteUrl}${path}`);
    res.end();
  };

  if (req.method !== "GET") {
    redirect("/account?error=link");
    return;
  }
  const q = req.query?.token;
  let token = Array.isArray(q) ? q[0] : q;
  if (!token && req.url) {
    try {
      token = new URL(req.url, "http://localhost").searchParams.get("token") ?? undefined;
    } catch {
      /* ignore */
    }
  }
  const cfg = kvConfig();
  if (!token || !/^[a-f0-9]{32,64}$/.test(token) || !cfg) {
    redirect("/account?error=link");
    return;
  }

  try {
    // GETDEL = read + delete atomically → the token is single-use.
    const email = await kvCmd(cfg, ["GETDEL", `${TOKEN_PREFIX}${token}`]);
    if (typeof email !== "string" || !email) {
      redirect("/account?error=link");
      return;
    }
    const session = randomBytes(24).toString("hex");
    await kvCmd(cfg, [
      "SET",
      `${SESSION_PREFIX}${session}`,
      email,
      "EX",
      String(SESSION_TTL_SECONDS),
    ]);
    res.setHeader(
      "Set-Cookie",
      `${COOKIE}=${session}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`,
    );
    redirect("/account");
  } catch {
    redirect("/account?error=link");
  }
}
