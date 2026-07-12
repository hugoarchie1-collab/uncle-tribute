/**
 * GET /api/coa?cert=MANDALA-OPI-7F3K91&secret=<ADMIN_API_KEY>&doc=certificate|label
 *
 * Renders — entirely from the estate ledger (the single source of truth) — the
 * two production documents for an issued print:
 *   doc=certificate (default) … the Certificate of Authenticity (A5 portrait)
 *   doc=label                 … the back-of-print label (compact landscape)
 *
 * Both are populated from the ledger record + a QR code that deep-links the
 * public verification page /auth/<CERTIFICATE_ID>. This is the "template
 * renderer" stage: the layout is fixed here once; the values ({ARTWORK},
 * {EDITION}, {PRINT_NUMBER}, {CERTIFICATE_ID}, {DATE}) are filled per order, with
 * NO manual intervention. Estate-only (ADMIN_API_KEY) — production material,
 * not public; the public path is the /auth lookup.
 *
 * Self-contained (gotcha #5): inline KV read (mirror of api/auth-lookup.ts) +
 * qrcode + pdf-lib. The wax seal is fetched from SITE_URL/logo at render time.
 * Returns application/pdf.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import QRCode from "qrcode";

interface VercelReq {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  url?: string;
}
interface VercelRes {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
  send: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
}

interface LedgerRecord {
  certificate_id: string;
  artwork_name: string;
  colourway?: string;
  drop_label: string;
  tier_label: string;
  print_number: number | null;
  allocation: number | null;
  issued_date?: string;
}

const kvConfig = (): { url: string; token: string } | null => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
};

const normaliseCert = (raw: string): string =>
  raw.trim().toUpperCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-");

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
  return v;
};

const issuedDisplay = (iso?: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const printNoDisplay = (r: LedgerRecord): string => {
  if (r.print_number === null) return "Open Edition";
  const n = String(r.print_number).padStart(3, "0");
  return r.allocation ? `${n} / ${r.allocation}` : n;
};

// House palette, on a cream paper ground (printable — dark ink, red accent).
const INK = rgb(0.06, 0.05, 0.04);
const MUTED = rgb(0.42, 0.4, 0.36);
const PAPER = rgb(0.965, 0.952, 0.926);
const ACCENT = rgb(0.788, 0.471, 0.267); // #c97844

async function fetchSeal(siteUrl: string): Promise<ArrayBuffer | null> {
  try {
    const resp = await fetch(`${siteUrl}/logo/logo-seal-v1-w512.png`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!resp.ok) return null;
    return await resp.arrayBuffer();
  } catch {
    return null;
  }
}

const drawCentered = (
  page: ReturnType<PDFDocument["addPage"]>,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = INK,
  spacing = 0,
) => {
  const w = font.widthOfTextAtSize(text, size) + spacing * Math.max(0, text.length - 1);
  let x = (page.getWidth() - w) / 2;
  if (spacing === 0) {
    page.drawText(text, { x, y, size, font, color });
    return;
  }
  for (const ch of text) {
    page.drawText(ch, { x, y, size, font, color });
    x += font.widthOfTextAtSize(ch, size) + spacing;
  }
};

// ---- Certificate of Authenticity (A5 portrait, 420 × 595 pt) --------------
async function buildCertificate(
  rec: LedgerRecord,
  qrPng: Uint8Array,
  seal: ArrayBuffer | null,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([420, 595]);
  const W = page.getWidth();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifI = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  page.drawRectangle({ x: 0, y: 0, width: W, height: page.getHeight(), color: PAPER });
  // hairline inner frame
  page.drawRectangle({
    x: 24, y: 24, width: W - 48, height: page.getHeight() - 48,
    borderColor: rgb(0.8, 0.78, 0.72), borderWidth: 0.75,
  });

  let sealImg: PDFImage | null = null;
  if (seal) {
    try {
      sealImg = await pdf.embedPng(seal);
    } catch {
      sealImg = null;
    }
  }
  if (sealImg) {
    const s = 84;
    page.drawImage(sealImg, { x: (W - s) / 2, y: 470, width: s, height: s });
  }

  drawCentered(page, "THE MANDALA COMPANY", 452, sansB, 8.5, MUTED, 2.4);
  drawCentered(page, "Estate Print", 432, serifI, 12, MUTED);
  drawCentered(page, "Certificate of Authenticity", 402, serif, 22, INK);

  // accent rule
  page.drawRectangle({ x: W / 2 - 26, y: 392, width: 52, height: 1.4, color: ACCENT });

  drawCentered(page, rec.artwork_name, 356, serif, 19, INK);
  const sub = [rec.colourway, rec.tier_label, rec.drop_label].filter(Boolean).join("  ·  ");
  drawCentered(page, sub, 334, sans, 10, MUTED, 0.6);

  // print number — the focal figure
  drawCentered(page, printNoDisplay(rec), 286, serif, 34, INK);
  if (rec.print_number !== null) {
    drawCentered(page, "PRINT NUMBER WITHIN THE EDITION", 268, sansB, 7, MUTED, 2);
  }

  // certificate id block
  drawCentered(page, "CERTIFICATE ID", 224, sansB, 7.5, MUTED, 2.4);
  drawCentered(page, rec.certificate_id, 206, mono, 13, INK, 1);

  drawCentered(page, `Issued ${issuedDisplay(rec.issued_date)}`, 184, sans, 9, MUTED);

  // QR + verify line
  try {
    const qr = await pdf.embedPng(qrPng);
    const qs = 78;
    page.drawImage(qr, { x: (W - qs) / 2, y: 78, width: qs, height: qs });
  } catch {
    /* QR optional */
  }
  drawCentered(page, "Verify this certificate at", 64, sans, 8, MUTED);
  drawCentered(page, "themandalacompany.com/auth", 52, sansB, 8.5, ACCENT, 0.6);

  drawCentered(
    page,
    "Estate-stamped by The Mandala Company · printed in London",
    36,
    sans,
    7,
    MUTED,
  );
  return pdf.save();
}

// ---- Back-of-print label (compact landscape, 300 × 150 pt) ----------------
async function buildLabel(
  rec: LedgerRecord,
  qrPng: Uint8Array,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([300, 150]);
  const W = page.getWidth();
  const H = page.getHeight();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER });
  page.drawRectangle({ x: 8, y: 8, width: W - 16, height: H - 16, borderColor: rgb(0.8, 0.78, 0.72), borderWidth: 0.6 });

  const left = 20;
  page.drawText("THE MANDALA COMPANY ESTATE PRINT", { x: left, y: H - 28, size: 7, font: sansB, color: MUTED });
  page.drawText(rec.artwork_name, { x: left, y: H - 50, size: 13, font: serif, color: INK });
  const sub = [rec.tier_label, rec.drop_label].filter(Boolean).join("  ·  ");
  page.drawText(sub, { x: left, y: H - 66, size: 8, font: sans, color: MUTED });
  page.drawText(`No. ${printNoDisplay(rec)}`, { x: left, y: H - 88, size: 11, font: serif, color: INK });
  page.drawText("CERTIFICATE ID", { x: left, y: 34, size: 6, font: sansB, color: MUTED });
  page.drawText(rec.certificate_id, { x: left, y: 22, size: 8.5, font: mono, color: INK });

  try {
    const qr = await pdf.embedPng(qrPng);
    const qs = 84;
    page.drawImage(qr, { x: W - qs - 18, y: (H - qs) / 2, width: qs, height: qs });
  } catch {
    /* QR optional */
  }
  return pdf.save();
}

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  // Estate-only — production material. Same shared-secret pattern as
  // /api/admin/order-shipped.
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey || param(req, "secret") !== adminKey) {
    res.status(401).json({ error: "Unauthorised." });
    return;
  }
  const certRaw = param(req, "cert");
  if (!certRaw || !certRaw.trim()) {
    res.status(400).json({ error: "Missing certificate id." });
    return;
  }
  const doc = (param(req, "doc") || "certificate").toLowerCase();

  const cfg = kvConfig();
  if (!cfg) {
    res.status(503).json({ error: "Estate ledger (KV) not configured." });
    return;
  }
  const id = normaliseCert(certRaw);

  let rec: LedgerRecord;
  try {
    const resp = await fetch(cfg.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["GET", `ledger:cert:${id}`]),
      signal: AbortSignal.timeout(3500),
    });
    const json = (await resp.json()) as { result?: unknown };
    if (typeof json.result !== "string" || !json.result) {
      res.status(404).json({ error: "Certificate not found in the estate ledger." });
      return;
    }
    rec = JSON.parse(json.result) as LedgerRecord;
  } catch {
    res.status(502).json({ error: "Estate ledger lookup failed." });
    return;
  }

  const siteUrl = (process.env.SITE_URL || "https://themandalacompany.com").replace(/\/$/, "");
  const verifyUrl = `${siteUrl}/auth/${rec.certificate_id}`;

  // QR as a PNG buffer (high error-correction so it survives a printed label).
  const qrPng = new Uint8Array(
    await QRCode.toBuffer(verifyUrl, { type: "png", errorCorrectionLevel: "M", margin: 1, width: 360 }),
  );

  let pdfBytes: Uint8Array;
  try {
    if (doc === "label") {
      pdfBytes = await buildLabel(rec, qrPng);
    } else {
      const seal = await fetchSeal(siteUrl);
      pdfBytes = await buildCertificate(rec, qrPng, seal);
    }
  } catch (err) {
    console.error("[coa] PDF build failed:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Could not render the document." });
    return;
  }

  const filename = `${doc === "label" ? "label" : "coa"}-${rec.certificate_id}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.status(200).send(Buffer.from(pdfBytes));
}
