/**
 * build-qr.mjs — generate the homepage QR-code assets (zero new deps).
 *   node scripts/build-qr.mjs
 *
 * Emits to /public/img/qr/ a dark-on-cream QR pointing at the homepage:
 *   qr-home-plain-v1.png  … 1024px raster (the universal fallback)
 *   qr-home-plain-v1.svg  … crisp infinitely-scalable vector
 *   qr-home-rose-v1.svg   … the SAME QR with a small DARK wax-stamp panel +
 *                           the WHITE line-rose centred (a branded variant).
 *
 * SCANNABILITY IS PARAMOUNT. Every output is dark modules (#1a1612) on a cream
 * field (#f5efe3) — NEVER inverted onto the #0a0908 site ground. The branded
 * variant occludes only the CENTRE (≤25% of the QR width); error-correction
 * level "H" (30% recovery) tolerates that, so the code still decodes.
 *
 * The branded panel MUST be dark: the line-rose art is WHITE, so it only reads
 * on a dark fill. cx = N/2 keeps the stamp dead-centre where the QR has no
 * finder patterns to clobber.
 *
 * NOTE — a branded RASTER (qr-home-rose-v1.png) can be produced LATER by
 * screenshotting qr-home-rose-v1.svg through the preview server (no `sharp`
 * dependency required). It is NOT generated here; qr-home-plain-v1.png is the
 * raster fallback that ships today.
 */
import QRCode from "qrcode";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "img", "qr");
const ROSE_PNG = join(ROOT, "public", "logo", "logo-rose-line-v1-w256.png");

const URL = "https://themandalacompany.com";
const DARK = "#1a1612"; // cream-ink — the QR modules + the wax-stamp panel
const LIGHT = "#f5efe3"; // cream — the QR field
const QR_OPTS = { errorCorrectionLevel: "H", margin: 4, color: { dark: DARK, light: LIGHT } };

let passed = 0,
  failed = 0;
const ok = (c, m) => {
  if (c) {
    passed++;
    console.log(`  ✓ ${m}`);
  } else {
    failed++;
    console.error(`  ✗ ${m}`);
  }
};

/**
 * Inject a centred branded wax-stamp panel into a plain QR SVG string.
 * Reads N from the QR's `viewBox="0 0 N N"`, draws a rounded DARK square
 * (~25% of N, the level-H occlusion budget) and lays the white line-rose
 * (base64 data-URI) over it at ~20% of N. Returns the new SVG string.
 */
function brandSvg(plainSvg) {
  const vb = plainSvg.match(/viewBox="0 0 (\d+(?:\.\d+)?) \1"/);
  const N = vb ? Number(vb[1]) : null;
  if (!N) throw new Error("could not parse a square viewBox from the QR SVG");

  const cx = N / 2;
  const cy = N / 2;
  const panel = N * 0.25; // wax-stamp side — the centre occlusion (≤25% of N)
  const rose = N * 0.2; // rose glyph, inset within the panel
  const rx = panel * 0.18; // ~18% corner radius

  const roseB64 = readFileSync(ROSE_PNG).toString("base64");
  const roseHref = `data:image/png;base64,${roseB64}`;

  const stamp =
    `<g>` +
    `<rect x="${(cx - panel / 2).toFixed(2)}" y="${(cy - panel / 2).toFixed(2)}" ` +
    `width="${panel.toFixed(2)}" height="${panel.toFixed(2)}" rx="${rx.toFixed(2)}" ry="${rx.toFixed(2)}" ` +
    `fill="${DARK}"/>` +
    `<image href="${roseHref}" xlink:href="${roseHref}" ` +
    `x="${(cx - rose / 2).toFixed(2)}" y="${(cy - rose / 2).toFixed(2)}" ` +
    `width="${rose.toFixed(2)}" height="${rose.toFixed(2)}" ` +
    `preserveAspectRatio="xMidYMid meet"/>` +
    `</g>`;

  // SVG namespaces — add xlink so the legacy xlink:href is valid everywhere.
  let svg = plainSvg;
  if (!svg.includes("xmlns:xlink")) {
    svg = svg.replace(/<svg /, '<svg xmlns:xlink="http://www.w3.org/1999/xlink" ');
  }
  return svg.replace(/<\/svg>\s*$/, `${stamp}</svg>`);
}

const run = async () => {
  console.log("\n=== build-qr — homepage QR assets ===\n");
  console.log(`  target: ${URL}`);
  console.log(`  level:  ${QR_OPTS.errorCorrectionLevel}  margin: ${QR_OPTS.margin}\n`);

  mkdirSync(OUT_DIR, { recursive: true });
  ok(existsSync(ROSE_PNG), `white line-rose source present (${ROSE_PNG.split("/").slice(-1)[0]})`);

  const pngPath = join(OUT_DIR, "qr-home-plain-v1.png");
  const svgPath = join(OUT_DIR, "qr-home-plain-v1.svg");
  const rosePath = join(OUT_DIR, "qr-home-rose-v1.svg");

  // 1) plain PNG (1024px raster)
  await QRCode.toFile(pngPath, URL, { ...QR_OPTS, type: "png", width: 1024 });

  // 2) plain SVG
  const plainSvg = await QRCode.toString(URL, { ...QR_OPTS, type: "svg" });
  writeFileSync(svgPath, plainSvg);

  // 3) branded SVG (dark wax-stamp panel + white rose, centred)
  const roseSvg = brandSvg(plainSvg);
  writeFileSync(rosePath, roseSvg);

  // ---- smoke asserts (mirror test-coa.mjs) -------------------------------
  console.log("");
  for (const p of [pngPath, svgPath, rosePath]) {
    ok(existsSync(p), `wrote ${p.split("/").slice(-1)[0]}`);
  }

  const pngBuf = readFileSync(pngPath);
  ok(
    pngBuf[0] === 0x89 && pngBuf[1] === 0x50 && pngBuf[2] === 0x4e && pngBuf[3] === 0x47,
    `plain PNG has the \\x89PNG magic header`,
  );
  ok(pngBuf.length > 500, `plain PNG byte length > 500 (${pngBuf.length})`);

  const svgStr = readFileSync(svgPath, "utf8");
  ok(svgStr.includes("viewBox"), "plain SVG contains a viewBox");
  ok(statSync(svgPath).size > 500, `plain SVG byte length > 500 (${statSync(svgPath).size})`);

  const roseStr = readFileSync(rosePath, "utf8");
  ok(roseStr.includes("viewBox"), "branded SVG contains a viewBox");
  ok(roseStr.includes("<image"), "branded SVG contains the <image> rose");
  ok(statSync(rosePath).size > 500, `branded SVG byte length > 500 (${statSync(rosePath).size})`);

  console.log("\n  Summary:");
  console.log(`    qr-home-plain-v1.png  ${statSync(pngPath).size} bytes`);
  console.log(`    qr-home-plain-v1.svg  ${statSync(svgPath).size} bytes`);
  console.log(`    qr-home-rose-v1.svg   ${statSync(rosePath).size} bytes`);

  console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
