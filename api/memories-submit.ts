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
 *           image?: string /* data: URL, base64 *​/ }
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
 * Self-contained — imports only from /api/_lib and top-level node_modules. No
 * /src imports (gotcha #5 in CLAUDE.md).
 */

import { Resend } from "resend";
import { render } from "@react-email/render";
import { MemorySubmitted } from "./_lib/emails/MemorySubmitted.tsx";
import {
  moderateMemory,
  publishMemory,
  readPublishedMemories,
  prepareImageAttachment,
  isKvConfigured,
  type StoredMemory,
} from "./_lib/memoryStore.ts";

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
      const memories = stored.map((m) => ({
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

    const html = await render(
      MemorySubmitted({
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
      }),
    );

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
