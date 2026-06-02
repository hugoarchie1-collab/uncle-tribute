// One-off image optimiser for the painting catalogue.
// Regenerates GENUINE WebP (q80) for every painting JPG, overwriting the
// .webp siblings — fixes the four that were JPEG copies under a .webp name
// and properly compresses the weakly-encoded rest. No app code change needed:
// AssetImage's <picture> already serves the .webp.
//
// Run manually (sharp is intentionally NOT a project dependency):
//   npm i sharp --no-save && node scripts/optimize-paintings.mjs
import sharp from "sharp";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const dir = "public/img/paintings";
const files = (await readdir(dir)).filter(
  (f) => f.endsWith(".jpg") && !f.includes("-blur"),
);

let before = 0;
let after = 0;
for (const f of files) {
  const src = path.join(dir, f);
  const out = path.join(dir, f.replace(/\.jpg$/, ".webp"));
  try {
    before += (await stat(out)).size;
  } catch {}
  const info = await sharp(src)
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 5 })
    .toFile(out);
  after += info.size;
  console.log(`${f.replace(/\.jpg$/, ".webp")}  ->  ${(info.size / 1024).toFixed(0)}KB`);
}
console.log(
  `\nDONE: ${files.length} files. WebP layer ${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(1)}MB`,
);
