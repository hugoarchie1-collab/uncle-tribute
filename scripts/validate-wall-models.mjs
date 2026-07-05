#!/usr/bin/env node
// =============================================================================
// validate-wall-models.mjs — integrity checks for the wall-model assets.
// -----------------------------------------------------------------------------
// Verifies the generated assets + manifest are internally consistent and safe
// to ship. Exits non-zero on any hard failure. Checks:
//   • shell GLB exists + valid GLB magic/version/length
//   • every manifest record's dimensions match the central artworkSizes source
//   • every record's front face is square (widthCm === heightCm)
//   • every referenced USDZ file exists + is a non-empty PKZip (usdz)
//   • optional deep ARKit validation of a sample via usdchecker (if present)
//   • no duplicate USDZ outputs
//   • manifest.json ↔ src/lib/wallModels.ts key agreement
//   • file-size warnings past mobile thresholds
//
//   Usage: node scripts/validate-wall-models.mjs [--deep]
// =============================================================================

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ARTWORK_SIZES, CANVAS_DEPTH_M } from "../src/lib/artworkSizes.ts";
import { PAINTINGS, FRAME_STYLES } from "../src/data/paintings.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "models", "wall");
const MANIFEST_JSON = join(OUT_DIR, "manifest.json");
const MANIFEST_TS = join(ROOT, "src", "lib", "wallModels.ts");
const DEEP = process.argv.includes("--deep");
const USDCHECKER = "/usr/bin/usdchecker";

const GLB_WARN = 3 * 1024 * 1024;
const USDZ_WARN = 6 * 1024 * 1024;

const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

if (!existsSync(MANIFEST_JSON)) {
  console.error("✗ manifest.json missing — run `npm run build:wall` first.");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(MANIFEST_JSON, "utf8"));
const sizeById = Object.fromEntries(ARTWORK_SIZES.map((s) => [s.id, s]));

// 1) Shell GLB.
const glbPath = join(ROOT, "public", manifest.shellGlb.replace(/^\//, ""));
if (!existsSync(glbPath)) fail(`shell GLB missing: ${manifest.shellGlb}`);
else {
  const glb = readFileSync(glbPath);
  if (glb.readUInt32LE(0) !== 0x46546c67) fail("shell GLB bad magic");
  if (glb.readUInt32LE(4) !== 2) fail("shell GLB bad version");
  if (glb.readUInt32LE(8) !== glb.length) fail("shell GLB length mismatch");
  if (glb.length > GLB_WARN) warn(`shell GLB large: ${(glb.length / 1024 / 1024).toFixed(1)}MB`);
}

// 2) Records.
const seenUsdz = new Set();
let usdzChecked = 0;
for (const r of manifest.records) {
  const size = sizeById[r.size];
  if (!size) {
    fail(`record ${r.paintingId}/${r.size}: unknown size id`);
    continue;
  }
  // Width tracks the size's cm; height may differ (a landscape master bakes at
  // its TRUE aspect, e.g. ophiuchus), so validate height against the recorded aspect.
  if (r.widthCm !== size.cm) fail(`record ${r.paintingId}/${r.size}: width ${r.widthCm} ≠ ${size.cm}`);
  const expectH = Math.round(size.cm * (r.aspect ?? 1) * 10) / 10;
  if (Math.abs(r.heightCm - expectH) > 0.2) fail(`record ${r.paintingId}/${r.size}: height ${r.heightCm} ≠ ${expectH} (aspect ${r.aspect ?? 1})`);
  if (r.depthM !== CANVAS_DEPTH_M) warn(`record ${r.paintingId}/${r.size}: depth ${r.depthM} ≠ config ${CANVAS_DEPTH_M}`);
  // Per-combo textured GLB (Android/WebXR) must exist + be a valid GLB. A record
  // still pointing at the shared shell means the artwork never got baked → a lie.
  if (!r.glbUrl || r.glbUrl === manifest.shellGlb) {
    fail(`record ${r.paintingId}/${r.size}: no textured GLB (fell back to shell)`);
  } else {
    const gp = join(ROOT, "public", r.glbUrl.replace(/^\//, ""));
    if (!existsSync(gp)) fail(`GLB missing on disk: ${r.glbUrl}`);
    else {
      const g = readFileSync(gp);
      if (g.length < 12 || g.readUInt32LE(0) !== 0x46546c67 || g.readUInt32LE(8) !== g.length)
        fail(`GLB invalid container: ${r.glbUrl}`);
      if (g.length > GLB_WARN) warn(`GLB large (${(g.length / 1024 / 1024).toFixed(1)}MB): ${r.glbUrl}`);
    }
  }

  if (r.usdzUrl) {
    if (seenUsdz.has(r.usdzUrl)) fail(`duplicate USDZ output: ${r.usdzUrl}`);
    seenUsdz.add(r.usdzUrl);
    const p = join(ROOT, "public", r.usdzUrl.replace(/^\//, ""));
    if (!existsSync(p)) fail(`USDZ missing on disk: ${r.usdzUrl}`);
    else {
      const b = readFileSync(p);
      if (b.length < 64 || b[0] !== 0x50 || b[1] !== 0x4b) fail(`USDZ not a zip: ${r.usdzUrl}`);
      if (b.length > USDZ_WARN) warn(`USDZ large (${(b.length / 1024 / 1024).toFixed(1)}MB): ${r.usdzUrl}`);
      if (DEEP && existsSync(USDCHECKER) && usdzChecked < 5) {
        try {
          execFileSync(USDCHECKER, ["--arkit", p], { stdio: "ignore" });
          usdzChecked++;
        } catch {
          fail(`usdchecker --arkit FAILED: ${r.usdzUrl}`);
        }
      }
    }
  }
}

// 3) Orphan USDZ on disk not accounted for (frameless in manifest OR framed key).
const FRAME_IDS = FRAME_STYLES.map((f) => f.id);
const isFramedFile = (f) => FRAME_IDS.some((id) => f.includes(`-${id}-`));
const onDisk = readdirSync(OUT_DIR).filter((f) => f.endsWith(".usdz"));
const inManifest = new Set(manifest.records.filter((r) => r.usdzUrl).map((r) => r.usdzUrl.split("/").pop()));
for (const f of onDisk) if (!inManifest.has(f) && !isFramedFile(f)) warn(`orphan USDZ on disk (not in manifest): ${f}`);

// 4) manifest.json ↔ wallModels.ts key agreement.
if (existsSync(MANIFEST_TS)) {
  const ts = readFileSync(MANIFEST_TS, "utf8");
  const m = ts.match(/WALL_USDZ_KEYS[^=]*=\s*new Set\((\[[^\]]*\])\)/s);
  const tsKeys = new Set(m ? JSON.parse(m[1]) : []);
  const jsonKeys = new Set(manifest.records.filter((r) => r.usdzUrl).map((r) => `${r.paintingId}__${r.imageSlug}__${r.size}`));
  for (const k of jsonKeys) if (!tsKeys.has(k)) fail(`wallModels.ts missing key present in manifest.json: ${k}`);
  for (const k of tsKeys) if (!jsonKeys.has(k)) fail(`wallModels.ts has key absent from manifest.json: ${k}`);
}

// 5) COVERAGE — every AVAILABLE, square colourway × size must have a real
//    textured model, so the product UI can never offer AR that silently lies.
//    Non-square masters (no square print model yet) are explicitly excluded.
const NONSQUARE_EXCLUDE = new Set(); // every available painting now bakes (landscape masters at true aspect)
const slugOf = (image) =>
  image.replace("/img/paintings/", "").replace(/\.(jpe?g|png|webp)$/i, "").toLowerCase();
const coveredGlb = new Set(
  manifest.records
    .filter((r) => r.glbUrl && r.glbUrl !== manifest.shellGlb)
    .map((r) => `${r.paintingId}__${r.imageSlug}__${r.size}`),
);
const fileExists = (name) => existsSync(join(OUT_DIR, name));
for (const p of PAINTINGS) {
  if (NONSQUARE_EXCLUDE.has(p.id)) continue;
  for (const c of p.colourways.filter((cw) => cw.available)) {
    const slug = slugOf(c.image);
    for (const s of ARTWORK_SIZES) {
      const key = `${p.id}__${slug}__${s.id}`;
      if (!coveredGlb.has(key))
        fail(`COVERAGE: ${p.id} · ${c.name} · ${s.id} has no textured GLB (options must not lie — add a square master or bake the model)`);
      // Every offered FRAME must open a real framed GLB + USDZ (never a silent frameless swap).
      for (const fr of FRAME_STYLES) {
        if (!fileExists(`${p.id}-${slug}-${s.id}-${fr.id}-v2.glb`))
          fail(`COVERAGE: ${p.id} · ${c.name} · ${s.id} · ${fr.label} has no framed GLB`);
        if (!fileExists(`${p.id}-${slug}-${s.id}-${fr.id}-v1.usdz`))
          fail(`COVERAGE: ${p.id} · ${c.name} · ${s.id} · ${fr.label} has no framed USDZ`);
      }
    }
  }
}

// ---- report -----------------------------------------------------------------
console.log(`\nWall-model validation — ${manifest.records.length} records, ${seenUsdz.size} USDZ${DEEP ? `, ${usdzChecked} deep-checked` : ""}`);
warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`  ✗ ${e}`));
  console.error(`\n✗ FAILED with ${errors.length} error(s), ${warnings.length} warning(s).\n`);
  process.exit(1);
}
console.log(`\n✓ PASSED (${warnings.length} warning(s)).\n`);
