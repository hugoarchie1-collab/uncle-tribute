/**
 * GET /api/auth-lookup?cert=MANDALA-OPI-7F3K91
 *
 * Public Estate Registry lookup. Reads the estate ledger (Vercel KV / Upstash —
 * the same store api/stripe-webhook.ts writes a record to on every order) by
 * Certificate ID and returns ONLY public provenance fields. It NEVER returns
 * internal data (order id, buyer, raw status) — no system leakage.
 *
 * Responses (all 200 except a blank request, so the client can branch cleanly):
 *   200 { found: true, record: {...} }   verified — show the provenance card
 *   200 { found: false }                 valid request, no such certificate
 *   200 { configured: false }            KV not provisioned in this environment
 *                                        → client falls back to static editions.ts
 *   200 { error: true }                  TRANSIENT KV error / timeout → client
 *                                        shows "temporarily unavailable" (never a
 *                                        false "not found" for a real certificate)
 *   400 { error: "<msg>" }               missing / blank cert
 *
 * Self-contained (gotcha #5 — no imports from /src or sibling /api files).
 * Inline raw-fetch Upstash REST, mirroring api/stripe-webhook.ts's transport
 * and its KV_REST_API_* / UPSTASH_REDIS_REST_* env-var handling.
 */

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

const kvConfig = (): { url: string; token: string } | null => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
};

// The COA prints the id with dashes (MANDALA-OPI-7F3K91). Be forgiving on input:
// uppercase, trim, and turn any run of whitespace/underscores into a single dash
// so "mandala opi 7f3k91" still resolves the canonical key.
const normaliseCert = (raw: string): string =>
  raw.trim().toUpperCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-");

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

  // Read ?cert= from the parsed query, falling back to parsing the raw URL.
  const q = req.query?.cert;
  let cert = Array.isArray(q) ? q[0] : q;
  if (!cert && req.url) {
    try {
      cert = new URL(req.url, "http://localhost").searchParams.get("cert") ?? undefined;
    } catch {
      /* ignore */
    }
  }
  if (!cert || !cert.trim()) {
    res.status(400).json({ error: "Missing certificate id." });
    return;
  }

  const cfg = kvConfig();
  if (!cfg) {
    // No ledger store in this environment — tell the client to use the static
    // editions.ts fallback rather than reporting a false "not found".
    res.status(200).json({ configured: false });
    return;
  }

  const id = normaliseCert(cert);
  try {
    const resp = await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["GET", `ledger:cert:${id}`]),
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) {
      // KV reachable but errored — a TRANSIENT failure, distinct from
      // "unconfigured", so the client shows "temporarily unavailable" rather
      // than a false "not found" for a genuinely-issued certificate.
      res.status(200).json({ error: true });
      return;
    }
    const json = (await resp.json()) as { result?: unknown };
    if (typeof json.result !== "string" || !json.result) {
      res.status(200).json({ found: false });
      return;
    }
    let rec: Record<string, unknown>;
    try {
      rec = JSON.parse(json.result) as Record<string, unknown>;
    } catch {
      res.status(200).json({ found: false });
      return;
    }
    // PUBLIC projection only — order id, buyer and internal status never leave.
    res.status(200).json({
      found: true,
      record: {
        certificate_id: rec.certificate_id,
        artwork_name: rec.artwork_name,
        colourway: rec.colourway,
        drop_label: rec.drop_label,
        tier_label: rec.tier_label,
        print_number: rec.print_number ?? null,
        allocation: rec.allocation ?? null,
        issued_date: rec.issued_date,
        status: "Authenticated in Estate Registry",
      },
    });
  } catch {
    // KV error / timeout — a TRANSIENT failure (distinct from "unconfigured"),
    // so the client shows "temporarily unavailable", never a false "not found".
    res.status(200).json({ error: true });
  }
}
