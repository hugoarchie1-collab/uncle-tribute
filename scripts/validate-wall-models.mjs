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
  if (r.widthCm !== size.cm || r.heightCm !== size.cm) fail(`record ${r.paintingId}/${r.size}: dims ${r.widthCm}×${r.heightCm} ≠ ${size.cm}×${size.cm}`);
  if (r.widthCm !== r.heightCm) fail(`record ${r.paintingId}/${r.size}: not square`);
  if (r.depthM !== CANVAS_DEPTH_M) warn(`record ${r.paintingId}/${r.size}: depth ${r.depthM} ≠ config ${CANVAS_DEPTH_M}`);
  if (r.glbUrl !== manifest.shellGlb) fail(`record ${r.paintingId}/${r.size}: glbUrl ≠ shell`);

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

// 3) Orphan USDZ on disk not in manifest.
const onDisk = readdirSync(OUT_DIR).filter((f) => f.endsWith(".usdz"));
const inManifest = new Set(manifest.records.filter((r) => r.usdzUrl).map((r) => r.usdzUrl.split("/").pop()));
for (const f of onDisk) if (!inManifest.has(f)) warn(`orphan USDZ on disk (not in manifest): ${f}`);

// 4) manifest.json ↔ wallModels.ts key agreement.
if (existsSync(MANIFEST_TS)) {
  const ts = readFileSync(MANIFEST_TS, "utf8");
  const m = ts.match(/WALL_USDZ_KEYS[^=]*=\s*new Set\((\[[^\]]*\])\)/s);
  const tsKeys = new Set(m ? JSON.parse(m[1]) : []);
  const jsonKeys = new Set(manifest.records.filter((r) => r.usdzUrl).map((r) => `${r.paintingId}__${r.imageSlug}__${r.size}`));
  for (const k of jsonKeys) if (!tsKeys.has(k)) fail(`wallModels.ts missing key present in manifest.json: ${k}`);
  for (const k of tsKeys) if (!jsonKeys.has(k)) fail(`wallModels.ts has key absent from manifest.json: ${k}`);
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
