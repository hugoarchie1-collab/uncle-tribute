#!/usr/bin/env node
/**
 * truesize-compose.mjs — generate the "shown at true size on a wall" room
 * mockups for the PaintingDetail size guide (/img/truesize/<stem>-<aN>.{jpg,webp}).
 *
 * WHY this exists: the ChatGPT-generated room mockups REDREW the painting on
 * every render (colour/detail drift between sizes) and eyeballed the A3→A0
 * scale (A1 came out ~19% oversized). This script instead composites Stephen's
 * REAL painting file at a MATHEMATICALLY exact size onto ONE clean room per
 * painting — faithful colour, exact relative scale, a consistent thin oak frame
 * on all four sizes.
 *
 * HOW it works, per painting (driven by one JSON config):
 *   1. BLANK — take one of Hugo's existing room photos (use the SMALLEST size,
 *      its frame is smallest = easiest to remove) and clone clean wall over the
 *      old frame+shadow (brightness-matched, feathered) → a clean empty room.
 *   2. FRAME — resize the real painting to the exact inner size, wrap a thin
 *      pale-oak frame (1px dark inner gap + oak border + 1px outer hairline).
 *   3. PLACE — drop it on the clean wall at one hanging centre with a soft
 *      drop shadow. A-size width(px) = cm × ppc, so every size shares ONE scale.
 *   4. EXPORT — <stem>-<aN>.jpg (q86) + .webp (q80), plus a QA montage.
 *
 * USAGE:  node scripts/truesize-compose.mjs path/to/config.json [--montage-only]
 *
 * The size guide self-enables per file: PaintingDetail keys the room image off
 * the SELECTED colourway's image stem, falling back to a calm coming-soon panel
 * when a file is absent — so partial coverage never looks broken.
 *
 * Requires ImageMagick `magick` on PATH (already used by blur-scene.sh).
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cfgPath = process.argv[2];
const montageOnly = process.argv.includes("--montage-only");
if (!cfgPath) {
  console.error("usage: node scripts/truesize-compose.mjs config.json [--montage-only]");
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));

// ---- defaults / config -----------------------------------------------------
const OUT_DIR = cfg.outDir || "public/img/truesize";
// QA montages are dev-only — kept OUT of /public so they never deploy.
const QA_DIR = cfg.qaDir || "scripts/truesize-qa";
// Optional: also drop a full-resolution PNG copy of every mockup into this
// folder (e.g. Hugo's Desktop set) for the investor catalogue. Off by default.
const FOLDER = cfg.folderCopy || null;
// Frameless mode (Hugo, investor catalogue): the print hangs as a borderless
// canvas — the real painting edge-to-edge on the wall with only a soft contact
// shadow, no oak frame. Set per config.
const FRAMELESS = !!cfg.frameless;
const SIZES = cfg.sizesCm || { a0: 84, a1: 59.5, a2: 42, a3: 29.5 };
const PPC = cfg.ppc; // pixels per cm — anchor: a0 width ≈ ppc*84 looks right
const [CX, CY] = cfg.center;
const RATIO = cfg.artRatio ?? 1; // height/width of the painting (1 = square)
const LANDSCAPE = !!cfg.landscape;
// Oak frame tone (pale natural blond oak — NOT gold; Hugo: "very thin, natural
// light-oak frame on all four").
const OAK_TOP = cfg.oakTop || "#e0d0b2";
const OAK_BOT = cfg.oakBot || "#cbb287";
const OAK_INNER = "#2a2012"; // 1px shadow gap between art and frame
const OAK_EDGE = cfg.oakEdge || "#9c8761"; // 1px outer hairline
const FRAME_FRAC = cfg.frameFrac ?? 0.016; // frame thickness as fraction of outer

// All room photos are normalised to ONE 4:3 canvas (cover-crop) so the output
// matches PaintingDetail's aspect-[4/3] slot exactly and every config's
// coordinates (blankBox / center) live in the SAME 1448×1086 space, regardless
// of the source crop (Hugo's a3 rooms are 16:9, a0 rooms are 4:3, etc.). The
// old frame is blanked anyway, so a center-crop clipping it is harmless.
const ROOM = cfg.roomSize || "1448x1086";
const [ROOM_W, ROOM_H] = ROOM.split("x").map(Number);

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(QA_DIR, { recursive: true });
if (FOLDER) mkdirSync(FOLDER, { recursive: true });
const TMP = mkdtempSync(join(tmpdir(), "truesize-"));

function mg(args) {
  const r = spawnSync("magick", args, { encoding: "utf8" });
  if (r.status !== 0) {
    console.error("magick failed:", args.join(" "), "\n", r.stderr);
    process.exit(1);
  }
  return r.stdout.trim();
}
function meanRGB(file, crop) {
  const args = [file];
  if (crop) args.push("-crop", crop, "+repage");
  args.push("-resize", "1x1!", "-format",
    "%[fx:int(255*mean.r)],%[fx:int(255*mean.g)],%[fx:int(255*mean.b)]", "info:");
  return mg(args).split(",").map(Number);
}

// ---- 0. NORMALISE the base room to the 4:3 working canvas ------------------
function normaliseBase() {
  const base = join(TMP, "base.png");
  mg([cfg.cleanFrom, "-resize", `${ROOM}^`, "-gravity", "center",
    "-extent", ROOM, base]);
  return base;
}
const BASE = normaliseBase();

// ---- 1. BLANK: clean the old frame out of the base room --------------------
function buildCleanRoom() {
  const [fx1, fy1, fx2, fy2] = cfg.blankBox; // frame+shadow box to cover
  const M = cfg.blankMargin ?? 10; // opaque extends M beyond the box
  const B = cfg.blankFeather ?? 20; // outward feather width
  const ox1 = fx1 - M, oy1 = fy1 - M, ox2 = fx2 + M, oy2 = fy2 + M;
  const dx = ox1 - B, dy = oy1 - B;
  const W = ox2 - ox1 + 2 * B, H = oy2 - oy1 + 2 * B;
  // clone source: clean wall, by default shifted right by the region width
  const [sx, sy] = cfg.cloneSrc || [dx + W, dy];

  const patch = join(TMP, "patch.png");
  const patchM = join(TMP, "patchM.png");
  const mask = join(TMP, "mask.png");
  const patchF = join(TMP, "patchF.png");
  const clean = join(TMP, "cleanroom.png");

  mg([BASE, "-crop", `${W}x${H}+${sx}+${sy}`, "+repage", patch]);

  // brightness-match the clone to the destination wall (sample clean wall just
  // above + right of the old frame), so the patch can't read as a faint rect.
  const above = meanRGB(BASE, `120x120+${Math.round((fx1 + fx2) / 2) - 60}+${Math.max(0, fy1 - 150)}`);
  const right = meanRGB(BASE, `120x160+${fx2 + 24}+${Math.round((fy1 + fy2) / 2) - 80}`);
  const wall = [0, 1, 2].map((i) => Math.round((above[i] + right[i]) / 2));
  const pm = meanRGB(patch);
  mg([patch,
    "-channel", "R", "-evaluate", "add", String(wall[0] - pm[0]), "+channel",
    "-channel", "G", "-evaluate", "add", String(wall[1] - pm[1]), "+channel",
    "-channel", "B", "-evaluate", "add", String(wall[2] - pm[2]), "+channel",
    patchM]);

  // mask: fully opaque over the WHOLE frame box, feathering only outward
  mg(["-size", `${W}x${H}`, "xc:black", "-fill", "white",
    "-draw", `rectangle ${B},${B} ${W - B},${H - B}`, "-blur", `0x${B}`, mask]);
  mg([patchM, mask, "-alpha", "off", "-compose", "CopyOpacity", "-composite", patchF]);
  mg([BASE, patchF, "-geometry", `+${dx}+${dy}`, "-compose", "over", "-composite", clean]);
  return clean;
}

// ---- 2+3. FRAME + PLACE one print on the clean room ------------------------
function placePrint(clean, artFile, widthCm, out) {
  const outerW = Math.round(widthCm * PPC);
  const outerH = LANDSCAPE ? Math.round(outerW * RATIO) : outerW;
  const fw = Math.max(3, Math.round(outerW * FRAME_FRAC));
  const ai = join(TMP, "ai.png");
  const aig = join(TMP, "aig.png");
  const oak = join(TMP, "oak.png");
  const framed = join(TMP, "framed.png");
  const shadow = join(TMP, "shadow.png");
  const t = join(TMP, "t.png");

  let totalW, totalH;
  if (FRAMELESS) {
    // Borderless canvas: the real painting IS the print, edge-to-edge. outerW/H
    // = the artwork's true printed size. A 1px low-opacity edge defines the
    // boundary against the wall without reading as a frame.
    mg([artFile, "-resize", `${outerW}x${outerH}^`, "-gravity", "center",
      "-extent", `${outerW}x${outerH}`, ai]);
    mg([ai, "-bordercolor", "rgba(0,0,0,0.18)", "-border", "1", framed]);
    totalW = outerW + 2; totalH = outerH + 2;
  } else {
    // Thin pale-oak frame: art → inner size, 1px dark gap, oak border, hairline.
    const innerW = outerW - 2 * fw, innerH = outerH - 2 * fw;
    mg([artFile, "-resize", `${innerW}x${innerH}^`, "-gravity", "center",
      "-extent", `${innerW}x${innerH}`, ai]);
    mg([ai, "-bordercolor", OAK_INNER, "-border", "1", aig]); // 1px dark inner gap
    mg(["-size", `${outerW}x${outerH}`, `gradient:${OAK_TOP}-${OAK_BOT}`, oak]);
    mg([oak, aig, "-gravity", "center", "-compose", "over", "-composite", framed]);
    mg([framed, "-bordercolor", OAK_EDGE, "-border", "1", framed]); // outer hairline
    totalW = outerW + 2; totalH = outerH + 2;
  }

  const X = CX - Math.round(totalW / 2), Y = CY - Math.round(totalH / 2);
  // Frameless canvas sits closer to the wall → a tighter, lighter contact shadow.
  const sb = Math.max(4, Math.round(outerW * (FRAMELESS ? 0.014 : 0.02)));
  const sdy = Math.max(2, Math.round(outerW * (FRAMELESS ? 0.009 : 0.015)));
  const sAlpha = FRAMELESS ? 0.28 : 0.36;
  mg(["-size", `${totalW}x${totalH}`, `xc:rgba(0,0,0,${sAlpha})`, "-blur", `0x${sb}`, shadow]);
  mg([clean, shadow, "-geometry", `+${X}+${Y + sdy}`, "-compose", "over", "-composite", t]);
  mg([t, framed, "-geometry", `+${X}+${Y}`, "-compose", "over", "-composite", out]);
}

// QA contact sheet (a3 | a2 / a1 | a0) without `montage` (its label font is
// flaky on macOS) — plain append of two rows.
function gridQA(tiles, out) {
  const r1 = join(TMP, "qr1.png"), r2 = join(TMP, "qr2.png");
  mg([tiles[0], tiles[1], "-resize", "640x", "+append", r1]);
  mg([tiles[2], tiles[3], "-resize", "640x", "+append", r2]);
  mg([r1, r2, "-append", out]);
}

// ---- run --------------------------------------------------------------------
const clean = buildCleanRoom();
const sizeKeys = Object.keys(SIZES);
const firstCw = cfg.colourways[0];

if (montageOnly) {
  const tiles = sizeKeys.slice().reverse().map((k) => {
    const o = join(TMP, `m_${k}.png`);
    placePrint(clean, firstCw.art, SIZES[k], o);
    return o;
  });
  const mont = join(QA_DIR, `qa-${cfg.id}.png`);
  gridQA(tiles, mont);
  console.log("QA montage:", mont);
} else {
  let n = 0;
  for (const cw of cfg.colourways) {
    for (const k of sizeKeys) {
      const png = join(TMP, `o_${cw.stem}_${k}.png`);
      placePrint(clean, cw.art, SIZES[k], png);
      mg([png, "-quality", "86", join(OUT_DIR, `${cw.stem}-${k}.jpg`)]);
      mg([png, "-quality", "80", "-define", "webp:method=6",
        join(OUT_DIR, `${cw.stem}-${k}.webp`)]);
      // Full-resolution catalogue copy into Hugo's folder (PNG, no compression).
      if (FOLDER) mg([png, join(FOLDER, `${cw.stem}-${k.toUpperCase()}.png`)]);
      n++;
    }
  }
  // QA montage for the first colourway
  const tiles = sizeKeys.slice().reverse().map((k) => {
    const o = join(TMP, `m_${k}.png`);
    placePrint(clean, firstCw.art, SIZES[k], o);
    return o;
  });
  gridQA(tiles, join(QA_DIR, `qa-${cfg.id}.png`));
  console.log(`wrote ${n} room mockups (×2 webp+jpg) for ${cfg.id} → ${OUT_DIR}`);
}
rmSync(TMP, { recursive: true, force: true });
