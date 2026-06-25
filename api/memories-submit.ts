/**
 * /api/memories-submit  —  the Book of Memories auto-publish + moderation flow.
 *
 * POST  Receives a memory left on /memories. It is MODERATED (OpenAI free
 *       omni-moderation, text + image) and, if clean, AUTO-PUBLISHED to Vercel
 *       KV so the wall shows it immediately. The family is emailed on EVERY
 *       submission either way (published or held). Nothing here ever throws at
 *       the visitor — every downstream failure degrades to a friendly 200,
 *       mirroring the stripe-webhook "never throw" discipline.
 *
 *       Moderation policy (high-stakes memorial wall):
 *         • OPENAI_API_KEY absent     → FAIL SAFE, hold for review.
 *         • moderation API errors     → FAIL SAFE, hold for review.
 *         • text flagged              → hold for review.
 *         • image attached (any)      → hold for the family's one-tap OK
 *                                       (image moderation is imperfect; see
 *                                        requirement 4 — clean TEXT publishes,
 *                                        but an image always pauses).
 *         • clean text, no image      → auto-publish.
 *
 *       Request body (JSON):
 *         { name: string, message: string, relationship?: string,
 *           location?: string, email?: string, botcheck?: string,
 *           image?: string (data: URL, base64) }
 *
 *       Response 200: { ok: true, published: boolean }
 *                400: { error }       — validation failure
 *                405                  — method
 *
 * GET   Returns the auto-published memories from KV (newest first) so the SPA
 *       can render them alongside the file-based MEMORIES fallback:
 *         200: { memories: Array<{ id, name, relationship?, location?,
 *                                  message }> }
 *       Returns { memories: [] } when KV isn't configured (graceful: the page
 *       still shows its committed entries).
 *
 * Storage: Vercel KV (gated behind KV_REST_API_URL/KV_REST_API_TOKEN) for
 * published text; Vercel Blob (gated behind BLOB_READ_WRITE_TOKEN) for images.
 * If neither is provisioned the endpoint still returns 200 and emails the
 * family — see api/_lib/memoryStore.ts for the graceful-degradation details.
 *
 * Self-contained — imports ONLY npm packages + node: builtins, no local
 * sibling files (Vercel doesn't bundle local /api imports — gotcha #5). The
 * moderation + KV store and notification email are inlined below.
 */

import { Resend } from "resend";

// SELF-CONTAINED — no imports from ./_lib or /src. Vercel's @vercel/node builder
// compiles only the entrypoint and does NOT bundle sibling local .ts/.tsx files
// into the lambda (they crash at cold start with ERR_MODULE_NOT_FOUND — verified
// on preview 2026-05-30; gotcha #5 in CLAUDE.md). The moderation + Vercel-KV
// store and the estate notification email are inlined below — mirrors of
// api/_lib/memoryStore.ts + api/_lib/emails/MemorySubmitted.tsx (+ ./styles.ts).
// Keep them in sync.

const DEFAULT_FROM = "info@themandalacompany.com";
const DEFAULT_BCC = "info@themandalacompany.com";
const FROM_NAME = "The Mandala Company";

// ---- Origin allowlist (mirrors newsletter-subscribe.ts) ------------------
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  base["Access-Control-Allow-Origin"] = isAllowedOrigin(origin)
    ? (origin as string)
    : "https://themandalacompany.com";
  return base;
};

// Node (req, res) signature — NOT the Web Request/Response one. The Web
// handler's returned Response was not delivered in this project's Vercel
// runtime (see newsletter-subscribe.ts for the full note).
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

const SUFFIX_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const randomSuffix = (length = 4): string => {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += SUFFIX_ALPHABET[Math.floor(Math.random() * SUFFIX_ALPHABET.length)];
  }
  return out;
};

/** Slug for the data-file id, e.g. "Jan W." -> "jan-w". */
const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFKD")
    // NFKD splits accented letters into base + combining mark; the next filter
    // drops anything outside a-z0-9, removing the marks too.
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40) || "memory";

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

/**
 * Build the ready-to-paste src/data/memories.ts object. JSON.stringify yields
 * valid, escape-safe double-quoted TypeScript string literals (newlines become
 * \n, quotes escaped), so the result is paste-safe even for multi-paragraph
 * messages with apostrophes or quotes.
 */
const buildPasteEntry = (m: {
  id: string;
  name: string;
  relationship?: string;
  location?: string;
  message: string;
}): string => {
  const lines = ["  {", `    id: ${JSON.stringify(m.id)},`, `    name: ${JSON.stringify(m.name)},`];
  if (m.relationship) lines.push(`    relationship: ${JSON.stringify(m.relationship)},`);
  if (m.location) lines.push(`    location: ${JSON.stringify(m.location)},`);
  lines.push("    message:", `      ${JSON.stringify(m.message)},`, "  },");
  return lines.join("\n");
};

// ===========================================================================
// Inlined moderation + Vercel-KV store (mirror of api/_lib/memoryStore.ts —
// gotcha #5). Raw fetch against OpenAI + Upstash REST; zero new deps.
// ===========================================================================
interface StoredMemory {
  id: string;
  name: string;
  relationship?: string;
  location?: string;
  message: string;
  createdAt: string;
}

type ModerationDecision =
  | { status: "clean" }
  | { status: "flagged"; categories: string[] }
  | { status: "unconfigured" }
  | { status: "error"; detail: string };

interface OmniModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
}
interface OmniModerationResponse {
  results?: OmniModerationResult[];
}

const MEMORY_BLOCKLIST: string[] = [
  "nigger", "nigga", "faggot", "retard", "spic", "chink", "kike", "wetback",
  "tranny", "coon", "gook", "paki",
  "cunt", "pussy", "blowjob", "handjob", "whore", "cum", "porn", "rape",
  "raping", "rapist", "molest", "paedophile", "pedophile", "bestiality",
];
const builtInModerate = (text: string): ModerationDecision => {
  const normalised = ` ${text.toLowerCase().replace(/[^a-z0-9\s]+/g, " ")} `;
  if (MEMORY_BLOCKLIST.some((w) => normalised.includes(` ${w} `))) {
    return { status: "flagged", categories: ["language"] };
  }
  if ((text.match(/https?:\/\//gi) || []).length >= 3) {
    return { status: "flagged", categories: ["spam"] };
  }
  return { status: "clean" };
};

/**
 * Heuristic: does a submission read like a functional/QA test or empty filler
 * rather than a genuine memory? A memorial wall must never AUTO-publish junk
 * (QA/test entries reached the live wall 2026-06-17). Deliberately conservative
 * — only obvious test/placeholder text; when in doubt it returns false
 * (publishes). A false positive only HOLDS for the family's review (never
 * rejects, never lost), so a real short memory is safe.
 */
const looksLikeTestJunk = (message: string, name: string): boolean => {
  const m = message.trim().toLowerCase().replace(/\s+/g, " ");
  const n = name.trim().toLowerCase();
  if (m.length < 12) return true; // too sparse to be a genuine memory
  const JUNK = [
    "test memory", "test message", "qa test", "qa reviewer", "functional check",
    "check the endpoint", "check that it works", "please disregard", "ignore this",
    "lorem ipsum", "asdf", "testing 123", "this is a test", "just a test",
  ];
  if (JUNK.some((p) => m.includes(p))) return true;
  if (/^(qa|test|tester|reviewer|admin|bot)\b/.test(n)) return true;
  return false;
};

async function moderateMemory(
  text: string,
  imageDataUrl?: string,
): Promise<ModerationDecision> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return builtInModerate(text);
  const input: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [{ type: "text", text: text.slice(0, 8000) }];
  if (imageDataUrl) input.push({ type: "image_url", image_url: { url: imageDataUrl } });
  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "omni-moderation-latest", input }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      console.warn(`[memories-submit] OpenAI moderation HTTP ${res.status} — using built-in filter.`);
      return builtInModerate(text);
    }
    const json = (await res.json()) as OmniModerationResponse;
    const result = json.results?.[0];
    if (!result) return builtInModerate(text);
    if (result.flagged) {
      const categories = Object.entries(result.categories ?? {})
        .filter(([, v]) => v)
        .map(([k]) => k);
      return { status: "flagged", categories };
    }
    return { status: "clean" };
  } catch (err) {
    console.warn(
      "[memories-submit] OpenAI moderation unreachable — using built-in filter:",
      err instanceof Error ? err.message : err,
    );
    return builtInModerate(text);
  }
}

const KV_KEY = "memories:published";
const kvConfig = (): { url: string; token: string } | null => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
};
const isKvConfigured = (): boolean => kvConfig() !== null;
async function kvCommand(command: (string | number)[]): Promise<unknown | null> {
  const cfg = kvConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[memories-submit] KV command failed: HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { result?: unknown; error?: string };
    if (json.error) {
      console.error("[memories-submit] KV command error:", json.error);
      return null;
    }
    return json.result ?? null;
  } catch (err) {
    console.error("[memories-submit] KV command threw:", err instanceof Error ? err.message : err);
    return null;
  }
}
async function publishMemory(memory: StoredMemory): Promise<boolean> {
  if (!isKvConfigured()) return false;
  const result = await kvCommand(["LPUSH", KV_KEY, JSON.stringify(memory)]);
  return result !== null;
}
async function readPublishedMemories(limit = 200): Promise<StoredMemory[]> {
  if (!isKvConfigured()) return [];
  const result = await kvCommand(["LRANGE", KV_KEY, 0, limit - 1]);
  if (!Array.isArray(result)) return [];
  const out: StoredMemory[] = [];
  for (const raw of result) {
    if (typeof raw !== "string") continue;
    try {
      const parsed = JSON.parse(raw) as StoredMemory;
      if (parsed && typeof parsed.id === "string" && typeof parsed.message === "string") {
        out.push(parsed);
      }
    } catch {
      // skip a corrupt entry
    }
  }
  return out;
}

interface EmailAttachment {
  filename: string;
  content: string;
  contentType?: string;
}
function prepareImageAttachment(dataUrl: string, idHint: string): EmailAttachment | null {
  const match = /^data:(image\/(png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  const subtype = match[2];
  const ext = subtype === "jpeg" ? "jpg" : subtype;
  return { filename: `${idHint}.${ext}`, content: match[3], contentType: match[1] };
}

// ===========================================================================
// Inlined estate notification email → HTML string (mirror of
// api/_lib/emails/MemorySubmitted.tsx + ./styles.ts — gotcha #5)
// ===========================================================================
const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const SANS = `"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif`;
const DISPLAY = `"Playfair Display",Georgia,"Times New Roman",serif`;

const renderMemorySubmittedHtml = (p: {
  name: string;
  relationship?: string;
  location?: string;
  email?: string;
  message: string;
  submittedAt: string;
  pasteEntry: string;
  estateEmail: string;
  published?: boolean;
  holdReason?: string;
  hasImage?: boolean;
  imageAttached?: boolean;
}): string => {
  const published = p.published ?? false;
  const paragraphs = p.message.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
  const meta = [p.relationship, p.location].filter(Boolean).join(" · ");
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
    footer: `font-family:${SANS};font-size:11px;line-height:1.7;color:rgba(237,230,214,0.55);text-align:center;margin:32px 0 0 0;`,
    link: `color:#c97844;text-decoration:underline;`,
  };
  const statusCard = published
    ? `<div style="${s.card}border:1px solid #c97844;border-left:3px solid #c97844;margin:0 0 8px 0;"><p style="${s.body}margin:0;color:#ede6d6;"><strong>This memory is now live</strong> on Steve's wall — it passed moderation automatically, so there's nothing you need to do. If you'd ever like to take it down, just let me know.</p></div>`
    : `<div style="${s.card}border:1px solid rgba(237,230,214,0.18);border-left:3px solid rgba(237,230,214,0.55);margin:0 0 8px 0;"><p style="${s.body}margin:0;color:#ede6d6;"><strong>This memory is being held</strong> — it is <em>not</em> public yet.${p.holdReason ? ` ${esc(p.holdReason)}` : ""} Review it below, and if you're happy, publish it manually (paste the ready-made entry into <code>src/data/memories.ts</code> and deploy).</p></div>`;
  const memoryCard =
    `<div style="${s.card}border-left:2px solid #c97844;">`
    + paragraphs.map((x) => `<p style="${s.body}color:#ede6d6;margin:0 0 14px 0;">${esc(x)}</p>`).join("")
    + (p.hasImage
      ? `<p style="${s.small}margin:0 0 12px 0;color:rgba(237,230,214,0.78);">${p.imageAttached ? "A photo is attached to this email. If you publish this memory, upload the photo and add its URL to the entry below." : "A photo was submitted but couldn't be attached (unsupported format / too large) — check the Vercel logs."}</p>`
      : "")
    + `<p style="${s.small}margin:0;color:rgba(237,230,214,0.78);">— ${esc(p.name)}${meta ? ` · ${esc(meta)}` : ""}</p>`
    + `</div>`;
  const submittedLine = p.email
    ? `<p style="${s.small}">Submitted ${esc(p.submittedAt)} · <a href="mailto:${esc(p.email)}" style="${s.link}">${esc(p.email)}</a> (reply to thank them)</p>`
    : `<p style="${s.small}">Submitted ${esc(p.submittedAt)} · no email left</p>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="dark only"/><title>A new memory of Steve</title></head>`
    + `<body style="${s.page}"><div style="${s.shell}">`
    + `<p style="${s.eyebrow}">Book of Memories · ${published ? "Published" : "Held for review"}</p>`
    + `<h1 style="${s.heading}">A memory of Steve.</h1>`
    + statusCard
    + memoryCard
    + submittedLine
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.subheading}">${published ? "If you ever need to re-add it manually" : "To publish this"}</p>`
    + `<p style="${s.small}">Paste this at the top of the <code>MEMORIES</code> array in <code>src/data/memories.ts</code>, then commit &amp; push${published ? " (only needed if you move off auto-publish)" : ""}:</p>`
    + `<pre style="background-color:#15120f;border:1px solid rgba(237,230,214,0.18);border-radius:4px;padding:16px 18px;margin:12px 0 0 0;font-family:'SF Mono','Menlo','Consolas',monospace;font-size:12.5px;line-height:1.6;color:rgba(237,230,214,0.78);white-space:pre-wrap;word-break:break-word;">${esc(p.pasteEntry)}</pre>`
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.footer}">Book of Memories · The Art of Stephen Meakin<br/><a href="mailto:${esc(p.estateEmail)}" style="${s.link}">${esc(p.estateEmail)}</a></p>`
    + `</div></body></html>`;
};

export default async function handler(req: VercelReq, res: VercelRes) {
  const originHeader = req.headers.origin;
  const origin = typeof originHeader === "string" ? originHeader : null;

  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    res.setHeader(key, value);
  }
  const send = (status: number, payload: unknown) => {
    res.status(status).json(payload);
  };

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // ---- GET: the public, auto-published wall (newest first) ---------------
  // Never throws — a KV outage / unprovisioned KV returns an empty list so
  // the page silently falls back to its committed MEMORIES entries.
  if (req.method === "GET") {
    try {
      const stored = await readPublishedMemories();
      const memories = stored
        // Belt-and-braces: never SERVE a memory that reads like a test/placeholder,
        // even if it was published to KV before the auto-publish guard existed.
        // This hides the QA/test entries that reached the wall on 2026-06-17
        // WITHOUT needing a manual KV purge — they stay in storage but never show.
        .filter((m) => !looksLikeTestJunk(m.message, m.name))
        .map((m) => ({
          id: m.id,
          name: m.name,
          relationship: m.relationship,
          location: m.location,
          message: m.message,
        }));
      return send(200, { memories });
    } catch (err) {
      console.error(
        "[memories-submit] GET failed:",
        err instanceof Error ? err.message : err,
      );
      return send(200, { memories: [] });
    }
  }

  if (req.method !== "POST") return send(405, { error: "Method not allowed" });

  let body: {
    name?: string;
    message?: string;
    relationship?: string;
    location?: string;
    email?: string;
    botcheck?: string;
    image?: string;
  };
  try {
    body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : ((req.body ?? {}) as typeof body);
  } catch {
    return send(400, { error: "Invalid JSON body." });
  }

  // Honeypot — a bot fills the hidden field. Pretend success and drop it so
  // the bot gets no signal it was caught.
  if ((body.botcheck ?? "").toString().trim() !== "") {
    return send(200, { ok: true, published: false });
  }

  const name = (body.name ?? "").toString().trim().slice(0, 120);
  const message = (body.message ?? "").toString().trim().slice(0, 4000);
  const relationship = (body.relationship ?? "").toString().trim().slice(0, 120);
  const location = (body.location ?? "").toString().trim().slice(0, 120);
  const email = (body.email ?? "").toString().trim().toLowerCase();
  const imageDataUrl = (body.image ?? "").toString().trim();
  const hasImage = imageDataUrl.startsWith("data:image/");

  if (!name) return send(400, { error: "Please add your name." });
  if (message.length < 2) return send(400, { error: "Please write a memory to share." });
  if (email && !isValidEmail(email)) {
    return send(400, { error: "That email doesn't look right — or leave it blank." });
  }
  // Cap the inline image payload to keep us inside serverless body limits
  // (~4.5MB on Vercel). base64 inflates bytes by ~33%, so ~5.6M chars ≈ 4MB.
  if (hasImage && imageDataUrl.length > 5_600_000) {
    return send(400, { error: "That image is a little large — please attach one under 4MB." });
  }

  const id = `${slugify(name)}-${randomSuffix()}`;

  // -------------------------------------------------------------------------
  // MODERATION + PUBLISH DECISION.
  //
  // We moderate the text (and the image, if present) with OpenAI's free
  // omni-moderation. The publish gate is deliberately conservative for a
  // memorial wall:
  //   • no OPENAI_API_KEY / API error → fail safe, HOLD.
  //   • text flagged                  → HOLD.
  //   • image present (even if clean)  → HOLD for the family's one-tap OK.
  //   • clean text + no image          → AUTO-PUBLISH.
  // -------------------------------------------------------------------------
  const moderation = await moderateMemory(message, hasImage ? imageDataUrl : undefined);

  let holdReason: string | null = null;
  switch (moderation.status) {
    case "unconfigured":
      holdReason = "Moderation not configured (no OPENAI_API_KEY) — held to fail safe.";
      break;
    case "error":
      holdReason = `Moderation unavailable (${moderation.detail}) — held to fail safe.`;
      break;
    case "flagged":
      holdReason = `Flagged by moderation: ${moderation.categories.join(", ") || "unspecified"}.`;
      break;
    case "clean":
      // Clean text still HOLDS when an image is attached (requirement 4).
      holdReason = hasImage
        ? "Clean text, but an image is attached — held for your one-tap OK."
        : null;
      break;
  }

  // Even clean, image-free text HOLDS if it reads like a functional/QA test or
  // is too sparse to be a genuine memory — a memorial wall must never auto-
  // publish junk (QA test posts reached the live wall 2026-06-17). Held, never
  // lost: the family reviews it and publishes if it's real.
  if (!holdReason && looksLikeTestJunk(message, name)) {
    holdReason =
      "Held for review — reads like a test or placeholder rather than a memory.";
  }

  // Turn an attached image into an email attachment for the family. Because an
  // image always HOLDS the memory (above), the image never reaches the public
  // wall automatically — the family sees it in the email and places it by hand
  // if they approve. Invalid / unsupported payloads simply yield no attachment.
  const imageAttachment = hasImage ? prepareImageAttachment(imageDataUrl, id) : null;

  // Auto-publish clean, image-free memories to KV (if configured). When KV
  // isn't provisioned this is a no-op and the family still gets the email.
  let published = false;
  if (!holdReason) {
    const stored: StoredMemory = {
      id,
      name,
      relationship: relationship || undefined,
      location: location || undefined,
      message,
      createdAt: new Date().toISOString(),
    };
    published = await publishMemory(stored);
    if (!published && isKvConfigured()) {
      // KV is configured but the write failed — surface in the email so Hugo
      // can paste it manually as a fallback.
      holdReason = "Passed moderation, but the auto-publish write failed — paste manually below.";
    } else if (!published) {
      holdReason = "Passed moderation, but storage (Vercel KV) isn't configured — paste manually below.";
    }
  }

  // Audit trail — always logged, even if the email send is skipped/fails.
  // Grep Vercel logs for "[memories-submit]".
  console.log("[memories-submit] new memory", {
    id,
    name,
    relationship,
    location,
    hasEmail: !!email,
    hasImage,
    moderation: moderation.status,
    published,
    held: !!holdReason,
  });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn(
      "[memories-submit] RESEND_API_KEY missing — memory logged only, no email sent.",
    );
    return send(200, { ok: true, published });
  }

  try {
    const fromEmail = process.env.ESTATE_FROM_EMAIL || DEFAULT_FROM;
    const toEmail = process.env.ESTATE_BCC_EMAIL || DEFAULT_BCC;
    const resend = new Resend(resendKey);

    const submittedAt = new Date().toLocaleString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/London",
    });

    const pasteEntry = buildPasteEntry({
      id,
      name,
      relationship: relationship || undefined,
      location: location || undefined,
      message,
    });

    const html = renderMemorySubmittedHtml({
      name,
      relationship: relationship || undefined,
      location: location || undefined,
      email: email || undefined,
      message,
      submittedAt,
      pasteEntry,
      estateEmail: DEFAULT_FROM,
      published,
      holdReason: holdReason || undefined,
      hasImage,
      imageAttached: !!imageAttachment,
    });

    const subjectPrefix = published ? "Published" : "Held for review";
    const sendResult = await resend.emails.send({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: [toEmail],
      replyTo: email || DEFAULT_FROM,
      subject: `${subjectPrefix}: a memory of Steve — from ${name}`,
      html,
      ...(imageAttachment
        ? {
            attachments: [
              { filename: imageAttachment.filename, content: imageAttachment.content },
            ],
          }
        : {}),
    });

    if (sendResult.error) {
      console.error("[memories-submit] Resend send error:", sendResult.error);
    } else {
      console.log("[memories-submit] notification sent", {
        id,
        resend_id: sendResult.data?.id,
      });
    }
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error("[memories-submit] notification failed:", errMessage);
  }

  return send(200, { ok: true, published });
}
