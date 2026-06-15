/**
 * Smoke test for the COA/label renderer stack (pdf-lib + qrcode + PNG embed).
 *   node scripts/test-coa.mjs
 * Builds a sample Certificate-of-Authenticity PDF with a generated QR and the
 * wax seal (fetched from the running dev server if available), writes it to
 * /tmp/coa-sample.pdf, then re-opens it to assert it's a valid single-page PDF.
 * Proves the exact libraries + calls api/coa.ts uses work in this environment.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { writeFileSync } from "node:fs";

let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } };

const run = async () => {
  console.log("\n=== COA renderer — smoke test ===\n");
  const cert = "MANDALA-OPI-7F3K91";
  const verifyUrl = `https://themandalacompany.com/auth/${cert}`;

  const qrPng = new Uint8Array(
    await QRCode.toBuffer(verifyUrl, { type: "png", errorCorrectionLevel: "M", margin: 1, width: 360 }),
  );
  ok(qrPng.length > 100, `QR PNG generated (${qrPng.length} bytes)`);

  // Try to fetch the real seal from the dev server to prove PNG embed works.
  let seal = null;
  for (const url of ["http://localhost:4410/logo/logo-seal-v1-w512.png"]) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (r.ok) { seal = await r.arrayBuffer(); break; }
    } catch { /* dev server may be down — seal is optional */ }
  }
  ok(true, seal ? `fetched wax seal (${seal.byteLength} bytes)` : "seal fetch skipped (dev server down) — optional");

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([420, 595]);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  page.drawRectangle({ x: 0, y: 0, width: 420, height: 595, color: rgb(0.965, 0.952, 0.926) });
  page.drawText("Certificate of Authenticity", { x: 60, y: 500, size: 20, font: serif, color: rgb(0.06, 0.05, 0.04) });
  page.drawText(cert, { x: 60, y: 460, size: 13, font: mono, color: rgb(0.06, 0.05, 0.04) });
  if (seal) {
    try { const img = await pdf.embedPng(seal); page.drawImage(img, { x: 168, y: 520, width: 84, height: 84 }); ok(true, "wax seal embedded into PDF"); }
    catch (e) { ok(false, `seal embed failed: ${e.message}`); }
  }
  const qr = await pdf.embedPng(qrPng);
  page.drawImage(qr, { x: 171, y: 90, width: 78, height: 78 });
  ok(true, "QR embedded into PDF");

  const bytes = await pdf.save();
  writeFileSync("/tmp/coa-sample.pdf", bytes);
  ok(bytes.length > 1000, `PDF saved (${bytes.length} bytes) → /tmp/coa-sample.pdf`);
  ok(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46, "output has the %PDF magic header");

  const reopened = await PDFDocument.load(bytes);
  ok(reopened.getPageCount() === 1, "re-opens as a valid 1-page PDF");

  console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed === 0 ? 0 : 1);
};
run().catch((e) => { console.error(e); process.exit(1); });
