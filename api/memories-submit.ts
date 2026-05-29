/**
 * POST /api/memories-submit
 *
 * Receives a memory left on /memories and emails it to the estate inbox for
 * moderation. NOTHING is published from here — the public wall is the
 * committed `src/data/memories.ts` file, so the live page can never be
 * spammed. The notification email includes a ready-to-paste entry; approving
 * a memory means pasting that into the data file and deploying.
 *
 * Request body:
 *   { name: string, message: string, relationship?: string,
 *     location?: string, email?: string, botcheck?: string }
 *
 * Response 200: { ok: true }    — on validation pass, even if the email send
 *                                 fails downstream (truth lives in Vercel logs).
 *          400: { error }       — validation failure
 *          405 / 500            — method / server config
 *
 * Storage: none — same deliberate no-database choice as newsletter-subscribe.
 * Memories live in Hugo's inbox until he promotes them into src/data/memories.ts.
 *
 * Self-contained — imports only from /api/_lib and top-level node_modules. No
 * /src imports (gotcha #5 in CLAUDE.md).
 */

import { Resend } from "resend";
import { render } from "@react-email/render";
import { MemorySubmitted } from "./_lib/emails/MemorySubmitted.js";

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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  if (req.method !== "POST") return send(405, { error: "Method not allowed" });

  let body: {
    name?: string;
    message?: string;
    relationship?: string;
    location?: string;
    email?: string;
    botcheck?: string;
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
    return send(200, { ok: true });
  }

  const name = (body.name ?? "").toString().trim().slice(0, 120);
  const message = (body.message ?? "").toString().trim().slice(0, 4000);
  const relationship = (body.relationship ?? "").toString().trim().slice(0, 120);
  const location = (body.location ?? "").toString().trim().slice(0, 120);
  const email = (body.email ?? "").toString().trim().toLowerCase();

  if (!name) return send(400, { error: "Please add your name." });
  if (message.length < 2) return send(400, { error: "Please write a memory to share." });
  if (email && !isValidEmail(email)) {
    return send(400, { error: "That email doesn't look right — or leave it blank." });
  }

  const id = `${slugify(name)}-${randomSuffix()}`;

  // Audit trail — always logged, even if the email send is skipped/fails.
  // Grep Vercel logs for "[memories-submit]".
  console.log("[memories-submit] new memory", { id, name, relationship, location, hasEmail: !!email });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn(
      "[memories-submit] RESEND_API_KEY missing — memory logged only, no email sent.",
    );
    return send(200, { ok: true });
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
      }),
    );

    const sendResult = await resend.emails.send({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: [toEmail],
      replyTo: email || DEFAULT_FROM,
      subject: `A memory of Steve — from ${name}`,
      html,
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

  return send(200, { ok: true });
}
