#!/usr/bin/env node
/**
 * truesize-grid.mjs — overlay a labelled 100px coordinate grid on a room photo,
 * normalised to the same 1448×1086 canvas the compositor uses. Read the output
 * PNG to measure the existing frame's bounding box (for blankBox) and centre.
 *
 * USAGE: node scripts/truesize-grid.mjs "<room.png>" /tmp/grid.png
 * All coordinates you read off are valid directly in a truesize config.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const [src, out = "/tmp/truesize-grid.png"] = process.argv.slice(2);
if (!src) { console.error("usage: truesize-grid.mjs <room> [out.png]"); process.exit(1); }

const FONTS = [
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/Library/Fonts/Arial.ttf",
  "/System/Library/Fonts/Helvetica.ttc",
];
const font = FONTS.find(existsSync) || "Helvetica";

const W = 1448, H = 1086;
const lines = [];
for (let x = 100; x < W; x += 100) lines.push(`line ${x},0 ${x},${H}`);
for (let y = 100; y < H; y += 100) lines.push(`line 0,${y} ${W},${y}`);
const labels = [];
for (let x = 200; x < W; x += 200) labels.push(`text ${x + 3},135 '${x}'`);
for (let y = 200; y < H; y += 200) labels.push(`text 5,${y + 6} '${y}'`);

const r = spawnSync("magick", [
  src, "-resize", `${W}x${H}^`, "-gravity", "center", "-extent", `${W}x${H}`,
  "-stroke", "rgba(255,40,40,0.55)", "-strokewidth", "1", "-fill", "none",
  "-draw", lines.join(" "),
  "-font", font, "-pointsize", "26", "-stroke", "none", "-fill", "yellow",
  "-draw", labels.join(" "),
  out,
], { stdio: "inherit" });
if (r.status !== 0) process.exit(1);
console.log("grid →", out, "(read it; coords are in the 1448×1086 config space)");
