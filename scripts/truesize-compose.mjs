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
  // Clone source: pick the FLATTEST candidate wall region around the blank zone
  // (lowest std-dev = cleanest wall, automatically avoiding furniture/plants/
  // shelves). Override with cfg.cloneSrc. This is what makes busy rooms work.
  const sdAt = (x, y) => {
    if (x < 0 || y < 0 || x + W > ROOM_W || y + H > ROOM_H) return Infinity;
    return Number(mg([BASE, "-crop", `${W}x${H}+${x}+${y}`, "+repage",
      "-format", "%[fx:standard_deviation]", "info:"]));
  };
  let sx, sy, bestSd = Infinity;
  if (cfg.cloneSrc) {
    [sx, sy] = cfg.cloneSrc; bestSd = 0;
  } else {
    const halfH = Math.round(H / 2);
    const cands = [
      [dx + W + 8, dy], [dx - W - 8, dy],
      [dx, dy - H - 8], [dx, dy + H + 8],
      [dx + W + 8, Math.max(0, dy - halfH)], [dx - W - 8, Math.max(0, dy - halfH)],
    ];
    let best = null;
    for (const [x, y] of cands) { const s = sdAt(x, y); if (s < bestSd) { bestSd = s; best = [x, y]; } }
    if (best) [sx, sy] = best;
  }

  const patch = join(TMP, "patch.png");
  const patchM = join(TMP, "patchM.png");
  const mask = join(TMP, "mask.png");
  const patchF = join(TMP, "patchF.png");
  const clean = join(TMP, "cleanroom.png");

  if (bestSd === Infinity) {
    // No full WxH clean region fits in-bounds (huge old frame in a tight room).
    // Fall back: scan a grid for the flattest SMALL wall tile, stretch it to the
    // region (smooth wall fill — texture is light here and the print + feather
    // hide the edges). This is what rescues zoomed-in rooms like wild-rose.
    const tw = Math.min(W, 340), th = Math.min(H, 340);
    let bt = [0, 0], btSd = Infinity;
    for (let y = 0; y + th <= ROOM_H; y += 130) {
      for (let x = 0; x + tw <= ROOM_W; x += 130) {
        const s = Number(mg([BASE, "-crop", `${tw}x${th}+${x}+${y}`, "+repage",
          "-format", "%[fx:standard_deviation]", "info:"]));
        if (s < btSd) { btSd = s; bt = [x, y]; }
      }
    }
    mg([BASE, "-crop", `${tw}x${th}+${bt[0]}+${bt[1]}`, "+repage",
      "-resize", `${W}x${H}!`, "-blur", "0x2", patch]);
  } else {
    mg([BASE, "-crop", `${W}x${H}+${sx}+${sy}`, "+repage", patch]);
  }

  // brightness-match the clone to the destination wall. Probe small patches just
  // outside the blank zone on all four sides, keep the two FLATTEST (so a side
  // covered by furniture is ignored), average their means.
  const probe = (x, y) => {
    const xc = Math.min(Math.max(0, Math.round(x)), ROOM_W - 80);
    const yc = Math.min(Math.max(0, Math.round(y)), ROOM_H - 80);
    const o = mg([BASE, "-crop", `80x80+${xc}+${yc}`, "+repage", "-format",
      "%[fx:mean.r*255],%[fx:mean.g*255],%[fx:mean.b*255],%[fx:standard_deviation]", "info:"])
      .split(",").map(Number);
    return { mean: [o[0], o[1], o[2]], sd: o[3] };
  };
  const my = (fy1 + fy2) / 2 - 40;
  const probes = [
    probe(fx2 + 24, my), probe(fx1 - 104, my),
    probe((fx1 + fx2) / 2 - 40, fy1 - 110), probe((fx1 + fx2) / 2 - 40, fy2 + 24),
  ].sort((a, b) => a.sd - b.sd).slice(0, 2);
  const wall = [0, 1, 2].map((i) => Math.round((probes[0].mean[i] + probes[1].mean[i]) / 2));
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
// SHADOW_SX is the horizontal sign for the contact shadow (set globally once the
// clean room exists — the shadow falls toward the darker, away-from-light side).
function placePrint(clean, artFile, widthCm, out) {
  const outerW = Math.round(widthCm * PPC);
  const outerH = LANDSCAPE ? Math.round(outerW * RATIO) : outerW;
  const fw = Math.max(3, Math.round(outerW * FRAME_FRAC));
  const X = CX - Math.round(outerW / 2), Y = CY - Math.round(outerH / 2);

  const ai = join(TMP, "ai.png");
  const aig = join(TMP, "aig.png");
  const oak = join(TMP, "oak.png");
  const lf = join(TMP, "lf.png");
  const framed = join(TMP, "framed.png");
  const shadow = join(TMP, "shadow.png");
  const t = join(TMP, "t.png");

  let totalW, totalH;
  if (FRAMELESS) {
    // 1. Real painting at its TRUE printed size, edge-to-edge — no border.
    mg([artFile, "-resize", `${outerW}x${outerH}^`, "-gravity", "center",
      "-extent", `${outerW}x${outerH}`, ai]);
    // 2. ENVIRONMENT LIGHT — an evenly-lit print on a directionally-lit wall
    //    reads as "stamped". Multiply a gentle DARKENING gradient toward the
    //    shadow side (away from the light) so the print sits in the room's light
    //    falloff. Darkening-only → it can NEVER wash out / shift colour (keeps
    //    the art faithful); just a subtle 0→~8% shade across the canvas.
    mg(["-size", `${outerH}x${outerW}`, "gradient:white-gray91",
      "-rotate", SHADOW_SX > 0 ? "90" : "270",
      "-resize", `${outerW}x${outerH}!`, lf]);
    mg([ai, lf, "-compose", "Multiply", "-composite", framed]);
    // 3. Faint photographic grain so the print surface shares the room's texture
    //    (a perfectly clean digital surface on a noisy photo also reads pasted).
    mg([framed, "-attenuate", "0.05", "+noise", "Gaussian", framed]);
    totalW = outerW; totalH = outerH;
  } else {
    // Thin pale-oak frame: art → inner size, 1px dark gap, oak border, hairline.
    const innerW = outerW - 2 * fw, innerH = outerH - 2 * fw;
    mg([artFile, "-resize", `${innerW}x${innerH}^`, "-gravity", "center",
      "-extent", `${innerW}x${innerH}`, ai]);
    mg([ai, "-bordercolor", OAK_INNER, "-border", "1", aig]);
    mg(["-size", `${outerW}x${outerH}`, `gradient:${OAK_TOP}-${OAK_BOT}`, oak]);
    mg([oak, aig, "-gravity", "center", "-compose", "over", "-composite", framed]);
    mg([framed, "-bordercolor", OAK_EDGE, "-border", "1", framed]);
    totalW = outerW + 2; totalH = outerH + 2;
  }

  // CONTACT SHADOW — a real stretched canvas stands a few cm off the wall and
  // casts a SOFT shadow offset away from the light (+ slightly down), visible on
  // two edges only. NOT a full perimeter halo (that was the "weird shadow").
  const so = Math.max(2, Math.round(outerW * (FRAMELESS ? 0.013 : 0.02)));
  const sb = Math.max(3, Math.round(outerW * (FRAMELESS ? 0.012 : 0.02)));
  const offX = SHADOW_SX * so;
  const offY = Math.max(2, Math.round(so * 0.85));
  const sAlpha = FRAMELESS ? 0.24 : 0.34;
  mg(["-size", `${totalW}x${totalH}`, `xc:rgba(0,0,0,${sAlpha})`, "-blur", `0x${sb}`, shadow]);
  mg([clean, shadow, "-geometry", `+${X + offX}+${Y + offY}`, "-compose", "over", "-composite", t]);
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

// Light direction: sample clean-wall luminance left vs right of the hanging
// centre. The brighter side is the light source, so the canvas's contact shadow
// falls toward the DARKER side. (Allow cfg.shadowSX to override per room.)
const wallLuma = (x, y, w, h) => {
  const xc = Math.min(Math.max(0, Math.round(x)), ROOM_W - w);
  const yc = Math.min(Math.max(0, Math.round(y)), ROOM_H - h);
  return Number(mg([clean, "-crop", `${w}x${h}+${xc}+${yc}`, "+repage",
    "-colorspace", "Gray", "-format", "%[fx:mean]", "info:"]));
};
const _lumaL = wallLuma(CX - 360, CY - 120, 150, 230);
const _lumaR = wallLuma(CX + 210, CY - 120, 150, 230);
const SHADOW_SX = cfg.shadowSX ?? (_lumaL >= _lumaR ? 1 : -1);

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
