/**
 * POST /api/custom-size-request
 *
 * The "Custom size" enquiry on a painting page — the highest, bespoke option
 * above the standard A3–A0 editions. A buyer asks for a print larger than A0
 * (or a bespoke format for a particular wall); this endpoint EMAILS the estate
 * inbox so Hugo is pinged directly, then the estate writes back with a
 * quotation. There is no fixed price (price on application), so nothing here
 * touches Stripe / checkout.
 *
 * Request body:
 *   { name?: string, email: string, paintingId?: string,
 *     paintingTitle?: string, colourwayName?: string,
 *     dimensions?: string, message?: string, company?: string (honeypot) }
 *
 * Response 200: { ok: true }   — always 200 on validation pass, even if the
 *                                downstream email send fails (the buyer sees a
 *                                soft success; the truth lives in Vercel logs).
 *          400: { error }       — bad email / JSON
 *          405                  — method not allowed
 *
 * Self-contained — imports ONLY the `resend` npm package + nothing local.
 * Vercel's @vercel/node builder does NOT bundle sibling /api files into the
 * lambda (they crash at cold start with ERR_MODULE_NOT_FOUND — gotcha #5 in
 * CLAUDE.md), so the email HTML builder is inlined below. Mirrors the structure
 * of api/newsletter-subscribe.ts (CORS allowlist, Node req/res signature, the
 * res.json() send helper that actually delivers in this Vercel runtime).
 *
 * Required env vars: none — the endpoint always 200s and always logs the
 * request to the Vercel function logs (so Hugo can see every enquiry even
 * before email is wired). Optional:
 *   RESEND_API_KEY      – if missing, the email is skipped (logged only)
 *   ESTATE_FROM_EMAIL   – sender, default info@themandalacompany.com
 *   CUSTOM_SIZE_TO_EMAIL / ESTATE_BCC_EMAIL – recipient, default the estate inbox
 */

import { Resend } from "resend";

const DEFAULT_FROM = "info@themandalacompany.com";
const DEFAULT_TO = "info@themandalacompany.com";
const FROM_NAME = "The Mandala Company";

// ---- Origin allowlist (mirror of newsletter-subscribe.ts) ----------------
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

// Node (req, res) handler signature — NOT the Web Request/Response one (the
// Web handler's returned Response was not being delivered in this project's
// Vercel runtime; res.json() always delivers). Typed inline to stay
// self-contained (gotcha #5).
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

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const SANS = `"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif`;
const DISPLAY = `"Playfair Display",Georgia,"Times New Roman",serif`;

// Inlined estate-notification email → HTML string (house dark palette).
const renderRequestHtml = (p: {
  name: string;
  email: string;
  paintingTitle: string;
  colourwayName: string;
  dimensions: string;
  message: string;
}): string => {
  const s = {
    page: `background-color:#0a0908;margin:0;padding:32px 16px;font-family:${SANS};color:#ede6d6;`,
    shell: `max-width:560px;margin:0 auto;background-color:#0a0908;padding:0;`,
    eyebrow: `font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.34em;text-transform:uppercase;color:#c97844;margin:0 0 18px 0;`,
    heading: `font-family:${DISPLAY};font-weight:700;letter-spacing:-0.02em;font-size:30px;line-height:1.12;color:#ede6d6;margin:0 0 22px 0;`,
    row: `font-family:${SANS};font-size:14px;line-height:1.6;color:rgba(237,230,214,0.82);margin:0 0 10px 0;`,
    label: `color:rgba(237,230,214,0.5);text-transform:uppercase;letter-spacing:0.14em;font-size:10px;font-weight:700;`,
    quote: `font-family:${SANS};font-size:15px;line-height:1.7;color:#ede6d6;border-left:2px solid #c97844;padding:4px 0 4px 16px;margin:18px 0;white-space:pre-wrap;`,
    divider: `border:0;border-top:1px solid rgba(237,230,214,0.18);margin:24px 0;`,
    footer: `font-family:${SANS};font-size:11px;line-height:1.7;color:rgba(237,230,214,0.55);margin:24px 0 0 0;`,
    link: `color:#c97844;text-decoration:underline;`,
  };
  const row = (label: string, value: string) =>
    `<p style="${s.row}"><span style="${s.label}">${esc(label)}</span><br/>${esc(value)}</p>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="dark only"/><title>Custom size request</title></head>`
    + `<body style="${s.page}"><div style="${s.shell}">`
    + `<p style="${s.eyebrow}">The Mandala Company · Custom size request</p>`
    + `<h1 style="${s.heading}">A bespoke print enquiry${p.paintingTitle ? ` for ${esc(p.paintingTitle)}` : ""}.</h1>`
    + row("From", `${p.name ? `${p.name} · ` : ""}${p.email}`)
    + (p.paintingTitle ? row("Painting", p.paintingTitle) : "")
    + (p.colourwayName ? row("Colourway", p.colourwayName) : "")
    + (p.dimensions ? row("Requested size", p.dimensions) : "")
    + (p.message ? `<p style="${s.row}"><span style="${s.label}">Message</span></p><div style="${s.quote}">${esc(p.message)}</div>` : "")
    + `<hr style="${s.divider}"/>`
    + `<p style="${s.footer}">Reply directly to this email to quote the collector — <a href="mailto:${esc(p.email)}" style="${s.link}">${esc(p.email)}</a>.<br/>The Art of Stephen Meakin · The Mandala Company</p>`
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
  if (req.method !== "POST") return send(405, { error: "Method not allowed" });

  let body: {
    name?: string;
    email?: string;
    paintingId?: string;
    paintingTitle?: string;
    colourwayName?: string;
    dimensions?: string;
    message?: string;
    company?: string;
  };
  try {
    body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : ((req.body ?? {}) as typeof body);
  } catch {
    return send(400, { error: "Invalid JSON body." });
  }

  // Honeypot — a bot that fills the hidden `company` field is silently accepted
  // (200, no email) so it learns nothing.
  if ((body.company ?? "").toString().trim() !== "") {
    return send(200, { ok: true });
  }

  const name = (body.name ?? "").toString().trim().slice(0, 120);
  const email = (body.email ?? "").toString().trim().toLowerCase().slice(0, 254);
  const paintingId = (body.paintingId ?? "").toString().trim().slice(0, 80);
  const paintingTitle = (body.paintingTitle ?? "").toString().trim().slice(0, 200);
  const colourwayName = (body.colourwayName ?? "").toString().trim().slice(0, 120);
  const dimensions = (body.dimensions ?? "").toString().trim().slice(0, 200);
  const message = (body.message ?? "").toString().trim().slice(0, 2000);

  if (!email || !isValidEmail(email)) {
    return send(400, { error: "Please provide a valid email." });
  }

  // Audit trail — always logged, even when email is skipped. Grep Vercel logs
  // for "[custom-size-request]".
  console.log("[custom-size-request] enquiry", {
    email,
    name,
    paintingId,
    paintingTitle,
    colourwayName,
    dimensions,
  });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn(
      "[custom-size-request] RESEND_API_KEY missing — logged only, no email sent.",
    );
    return send(200, { ok: true });
  }

  try {
    const fromEmail = process.env.ESTATE_FROM_EMAIL || DEFAULT_FROM;
    const toEmail =
      process.env.CUSTOM_SIZE_TO_EMAIL ||
      process.env.ESTATE_BCC_EMAIL ||
      DEFAULT_TO;
    const resend = new Resend(resendKey);

    const html = renderRequestHtml({
      name,
      email,
      paintingTitle,
      colourwayName,
      dimensions,
      message,
    });

    const sendResult = await resend.emails.send({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: [toEmail],
      replyTo: email,
      subject: paintingTitle
        ? `Custom size request — ${paintingTitle}`
        : "Custom size request",
      html,
    });

    if (sendResult.error) {
      console.error("[custom-size-request] Resend send error:", sendResult.error);
    } else {
      console.log("[custom-size-request] estate email sent", {
        email,
        resend_id: sendResult.data?.id,
      });
    }
  } catch (err) {
    const messageStr = err instanceof Error ? err.message : String(err);
    console.error("[custom-size-request] email failed:", messageStr);
  }

  return send(200, { ok: true });
}
