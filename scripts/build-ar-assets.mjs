// =============================================================================
// build-ar-assets.mjs — web-AR asset pipeline (v3) for every painting
// -----------------------------------------------------------------------------
// Generates a REALISTIC framed-print model so a mandala reads as a genuine
// framed artwork hung on a wall in phone AR — NOT the old "flat textured slab +
// dark border" that looked plastered on. The realism comes from a five-layer
// depth-separated model (see docs/ar-framed-presentation-spec.md):
//
//   0  backing board            — gives the object thickness against the wall
//   1  frame moulding           — real wood section with DEPTH + an inner BEVEL
//   2  off-white mat / mount     — a board with a bevel-cut WINDOW (lit edge)
//   3  print (giclée)           — RECESSED behind the mat window (kills "sticker")
//   4  soft contact-shadow quad — a baked radial-gradient halo on the wall
//
// (Glass / transmission is deliberately SKIPPED — too finicky in Quick Look;
//  depth + mat + frame + shadow + the OS's own lighting kill the floating look.)
//
// TWO PIPELINES, ONE GEOMETRY:
//   • GLB (zero npm deps): hand-authored glTF 2.0 packed into a binary GLB. The
//     two "frame shell" GLBs author the model at the A2 anchor (0.42 m) with the
//     print as a SEPARATELY-NAMED mesh+material ("Artwork") carrying a 1px
//     placeholder texture, so the app can swap baseColorTexture at runtime
//     (model-viewer / WebXR / Android Scene Viewer).
//   • USDZ (Apple/Pixar USD tooling on macOS): a USDA authored at each size's
//     TRUE metres with the colourway texture EMBEDDED, packed via
//     `usdzip --arkitAsset` and validated with `usdchecker --arkit`.
//
//     /usr/bin/usdzip  --arkitAsset   → packages a USDA + textures → ARKit USDZ
//     /usr/bin/usdchecker --arkit     → validates (we FAIL LOUDLY on any error)
//     /usr/bin/sips                   → downscales each texture to ~800px JPEG
//
// OUTPUTS (all under public/ar/, versioned -v3 — /public is immutable-cached):
//   public/ar/frame-black-oak-v3.glb        ← shell, swap Artwork texture @runtime
//   public/ar/frame-natural-oak-v3.glb      ← shell
//   public/ar/<id>-<colourway>-<size>-<frame>-v3.usdz   ← the iOS matrix
//   src/lib/arAssets.ts                     ← AUTO-GENERATED manifest (like imageVariants.ts)
//
// The full matrix is 25 colourway images × 4 sizes × 2 frames = 200 USDZ + 2 GLB.
//
// RUN (orchestrator): node scripts/build-ar-assets.mjs
//   --sample           generate only a handful of assets (proof run; see SAMPLE)
//   --keep             do NOT wipe public/ar first (sample runs imply --keep)
//
// On Linux/CI the USD tools are absent → USDZ is skipped, GLB shells still emit,
// and the manifest is written with the full USDZ key set (so the TS type-checks;
// arUsdz points at files that don't exist on that platform). iOS Quick Look is
// just not offered there.
// =============================================================================

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUB = join(ROOT, "public");
const IMG_DIR = join(PUB, "img", "paintings");
const OUT_DIR = join(PUB, "ar");
const MANIFEST = join(ROOT, "src", "lib", "arAssets.ts");

const USDZIP = "/usr/bin/usdzip";
const USDCHECKER = "/usr/bin/usdchecker";
const SIPS = "/usr/bin/sips";

/** Asset version — bump (and update the app references) to bust the immutable
 *  /ar cache. v3: realistic framed model (frame moulding depth+bevel + mat board
 *  with bevelled window + recessed print + baked contact shadow), one GLB shell
 *  per frame finish, and a full colourway×size×frame USDZ matrix. */
const V = "v3";

// CLI flags
const ARGS = new Set(process.argv.slice(2));
const SAMPLE = ARGS.has("--sample");
const KEEP = ARGS.has("--keep") || SAMPLE;

// -----------------------------------------------------------------------------
// SIZE TIERS — true real-world print sizes (metres). ALL SQUARE.
// Mirrors PRINT_TIERS in src/data/paintings.ts:
//   Open A3 29.5cm / Collector A2 42cm (ANCHOR) / Atelier A1 59.5cm / Heirloom A0 84cm
// -----------------------------------------------------------------------------
const SIZES = [
  { id: "a3", label: "A3", cm: 29.5, metres: 0.295, tierId: "atelier" },
  { id: "a2", label: "A2", cm: 42.0, metres: 0.42, tierId: "collector", anchor: true },
  { id: "a1", label: "A1", cm: 59.5, metres: 0.595, tierId: "atelier-grande" },
  { id: "a0", label: "A0", cm: 84.0, metres: 0.84, tierId: "heirloom" },
];
const ANCHOR = SIZES.find((s) => s.anchor); // A2 0.42 m — the GLB authoring size
const GLB_BASE_METRES = ANCHOR.metres;

// -----------------------------------------------------------------------------
// FRAME FINISHES — moulding tone + surface character. baseColor is LINEAR.
//   black-stained oak ≈ linear [0.045,0.04,0.035] roughness 0.5  (anchor/default)
//   natural oak       ≈ linear [0.34,0.22,0.11]   roughness 0.6
//   mat off-white     ≈ linear [0.92,0.90,0.85]
// -----------------------------------------------------------------------------
const FRAMES = [
  {
    id: "black-oak",
    label: "Black-stained oak",
    swatch: "#1c1a17",
    base: [0.045, 0.04, 0.035],
    roughness: 0.5,
  },
  {
    id: "natural-oak",
    label: "Natural oak",
    swatch: "#b8966a",
    base: [0.34, 0.22, 0.11],
    roughness: 0.6,
  },
];
const DEFAULT_FRAME = "black-oak";

// Shared mat board material (warm off-white conservation board) — LINEAR.
const MAT_BASE = [0.92, 0.9, 0.85];
const MAT_ROUGHNESS = 0.85;
// Mat bevel window cut — brighter so the cut edge highlights (the white bevel line).
const MAT_BEVEL_BASE = [0.97, 0.96, 0.93];
const MAT_BEVEL_ROUGHNESS = 0.6;
// Backing board (behind everything, faces the wall) — near-black, anchors shadow.
const BACK_BASE = [0.02, 0.02, 0.02];
const BACK_ROUGHNESS = 0.9;
// Print (giclée) — faint sheen, recessed behind the mat.
const ART_METALLIC = 0.0;
const ART_ROUGHNESS = 0.78;

// -----------------------------------------------------------------------------
// FRAME SECTION GEOMETRY — all metres, AT THE A2 0.42 m REFERENCE.
// USDZ at other sizes is authored by SCALING every constant by metres/0.42 so
// the frame stays proportionate (a bigger print gets a proportionally bigger
// frame — exactly what a real framer does). The print's outer edge always
// equals the size's true metres.
// -----------------------------------------------------------------------------
const REF = ANCHOR.metres; // 0.42 — the proportion reference

// Real-world frame section at the A2 reference:
const FRAME_FACE = 0.024; // moulding face width visible from the front
const FRAME_DEPTH = 0.034; // total depth of the wood section (front → wall)
const FRAME_BEVEL = 0.008; // width of the chamfer on the frame's inner lip
const MAT_BORDER = 0.05; // off-white mat border on every edge (generous gallery mat)
const MAT_THICK = 0.0016; // board edge thickness (the bevel face height)
const MAT_FRONT_RECESS = 0.012; // mat front sits this far behind the frame face
const PRINT_RECESS = 0.004; // print sits this far behind the mat back (shadow gap)
const SHADOW_MARGIN = 0.05; // contact-shadow quad extends this far beyond the frame
const SHADOW_OFFSET = 0.0006; // shadow quad sits this far off the wall (z), avoids z-fight

/**
 * Geometry constants scaled to a given print size. The "print" (artwork window
 * the texture maps onto) is the size's TRUE metres — that is the dimension the
 * buyer is paying for. The mat + frame are built OUTWARD from it, so the overall
 * framed object is larger than the print, exactly like a real frame.
 */
function geomConstants(printMetres) {
  const k = printMetres / REF; // proportional scale vs the A2 reference
  return {
    printMetres,
    frameFace: FRAME_FACE * k,
    frameDepth: FRAME_DEPTH * k,
    frameBevel: FRAME_BEVEL * k,
    matBorder: MAT_BORDER * k,
    matThick: MAT_THICK * k,
    matFrontRecess: MAT_FRONT_RECESS * k,
    printRecess: PRINT_RECESS * k,
    shadowMargin: SHADOW_MARGIN * k,
    shadowOffset: SHADOW_OFFSET * k,
  };
}

// -----------------------------------------------------------------------------
// Small binary helpers (zero-dep GLB packer)
// -----------------------------------------------------------------------------

/** Pad a Buffer up to a 4-byte boundary with `padByte` (0x00 BIN, 0x20 JSON). */
function pad4(buf, padByte) {
  const rem = buf.length % 4;
  if (rem === 0) return buf;
  return Buffer.concat([buf, Buffer.alloc(4 - rem, padByte)]);
}
function f32(arr) {
  const b = Buffer.alloc(arr.length * 4);
  for (let i = 0; i < arr.length; i++) b.writeFloatLE(arr[i], i * 4);
  return b;
}
function u16(arr) {
  const b = Buffer.alloc(arr.length * 2);
  for (let i = 0; i < arr.length; i++) b.writeUInt16LE(arr[i], i * 2);
  return b;
}
function min3(p) {
  const m = [Infinity, Infinity, Infinity];
  for (let i = 0; i < p.length; i += 3) {
    m[0] = Math.min(m[0], p[i]);
    m[1] = Math.min(m[1], p[i + 1]);
    m[2] = Math.min(m[2], p[i + 2]);
  }
  return m;
}
function max3(p) {
  const m = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) {
    m[0] = Math.max(m[0], p[i]);
    m[1] = Math.max(m[1], p[i + 1]);
    m[2] = Math.max(m[2], p[i + 2]);
  }
  return m;
}
function normalize(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

// -----------------------------------------------------------------------------
// MESH BUILDER — a small mesh accumulator with a quad helper.
// Coordinate frame: artwork centred at origin, facing +Z (out of the wall).
// z = 0 is the back face flush to the wall; +z is outward.
// -----------------------------------------------------------------------------
function newMesh() {
  return { positions: [], normals: [], uvs: [], indices: [] };
}
/** Push a quad (4 verts CCW seen from outside) with one flat normal. */
function quad(m, a, b, c, d, n, uv) {
  const base = m.positions.length / 3;
  const verts = [a, b, c, d];
  const uvs = uv || [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  for (let i = 0; i < 4; i++) {
    m.positions.push(verts[i][0], verts[i][1], verts[i][2]);
    m.normals.push(n[0], n[1], n[2]);
    m.uvs.push(uvs[i][0], uvs[i][1]);
  }
  m.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

// -----------------------------------------------------------------------------
// GEOMETRY — five depth-separated layers built from the print's true metres.
// -----------------------------------------------------------------------------

/**
 * The ARTWORK quad (layer 3) — recessed behind the mat window, sized to the
 * print's true metres. Full-frame UV 0..1, v-flipped so the image is upright.
 * Its own mesh + material ("Artwork") so the GLB texture can be swapped at
 * runtime.
 */
function buildArtwork(g) {
  const hp = g.printMetres / 2; // half the print (the mat window inner edge)
  const z = g.frameDepth - g.matFrontRecess - g.matThick - g.printRecess; // recessed
  const m = newMesh();
  // UV: v-flipped (top-left origin) so the image reads upright.
  quad(
    m,
    [-hp, -hp, z],
    [hp, -hp, z],
    [hp, hp, z],
    [-hp, hp, z],
    [0, 0, 1],
    [
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ],
  );
  return m;
}

/**
 * The FRAME MOULDING (layer 1) — the #1 realism cue. A stepped/beveled face
 * profile around the mat opening, built as 4 butt-joined sides:
 *   - outer side walls (vertical, z 0 → frameDepth)
 *   - face land (flat top of the moulding at z=frameDepth)
 *   - inner bevel ramp (45°-ish chamfer down/inward to the mat plane)
 * The slanted bevel normals make one frame edge catch light and the opposite
 * edge fall into shadow under the AR light probe → "carved" depth.
 */
function buildFrame(g) {
  const m = newMesh();
  // Opening = the mat window (= print) plus the mat border = the frame's inner edge.
  const inner = g.printMetres / 2 + g.matBorder; // inner edge of the frame face
  const outer = inner + g.frameFace; // outer edge of the frame
  const zf = g.frameDepth; // front (face land) plane
  const zb = 0; // back plane (wall)
  const matFrontZ = g.frameDepth - g.matFrontRecess; // bevel base / rabbet top
  const landInner = inner + g.frameBevel; // face land inner (bevel starts here)
  const o = outer;
  const i = inner;
  const li = landInner;

  // --- Outer side walls (z 0 → zf), normals outward ---
  quad(m, [o, -o, zb], [o, o, zb], [o, o, zf], [o, -o, zf], [1, 0, 0]); // +X
  quad(m, [-o, o, zb], [-o, -o, zb], [-o, -o, zf], [-o, o, zf], [-1, 0, 0]); // -X
  quad(m, [-o, o, zb], [o, o, zb], [o, o, zf], [-o, o, zf], [0, 1, 0]); // +Y
  quad(m, [o, -o, zb], [-o, -o, zb], [-o, -o, zf], [o, -o, zf], [0, -1, 0]); // -Y

  // --- Face land (flat outer moulding top at z=zf), normal +Z ---
  const nZ = [0, 0, 1];
  quad(m, [-li, li, zf], [li, li, zf], [o, o, zf], [-o, o, zf], nZ); // top
  quad(m, [-o, -o, zf], [o, -o, zf], [li, -li, zf], [-li, -li, zf], nZ); // bottom
  quad(m, [-o, -o, zf], [-li, -li, zf], [-li, li, zf], [-o, o, zf], nZ); // left
  quad(m, [li, -li, zf], [o, -o, zf], [o, o, zf], [li, li, zf], nZ); // right

  // --- Inner bevel ramp: face land inner edge (z=zf) DOWN+IN to the inner edge
  //     (z=matFrontZ). Slanted normals = the carved-light cue. ---
  const bz = matFrontZ;
  const nTop = normalize([0, -1, 1]);
  const nBot = normalize([0, 1, 1]);
  const nLeft = normalize([1, 0, 1]);
  const nRight = normalize([-1, 0, 1]);
  quad(m, [-i, i, bz], [i, i, bz], [li, li, zf], [-li, li, zf], nTop); // top
  quad(m, [-li, -li, zf], [li, -li, zf], [i, -i, bz], [-i, -i, bz], nBot); // bottom
  quad(m, [-li, -li, zf], [-li, li, zf], [-i, i, bz], [-i, -i, bz], nLeft); // left
  quad(m, [i, -i, bz], [i, i, bz], [li, li, zf], [li, -li, zf], nRight); // right

  // --- Back panel (z=0), normal -Z, faces the wall ---
  quad(m, [-o, -o, zb], [-o, o, zb], [o, o, zb], [o, -o, zb], [0, 0, -1]);

  return m;
}

/**
 * The MAT BOARD FACE (layer 2 face) — the visible off-white border, a flat ring
 * from the frame opening (inner) to the window opening (= print). Front face at
 * z = frameDepth - matFrontRecess. Normal +Z.
 */
function buildMat(g) {
  const m = newMesh();
  const inner = g.printMetres / 2 + g.matBorder; // mat outer (frame opening)
  const win = g.printMetres / 2; // mat inner (window / print edge)
  const z = g.frameDepth - g.matFrontRecess;
  const nZ = [0, 0, 1];
  const o = inner;
  const w = win;
  quad(m, [-w, w, z], [w, w, z], [o, o, z], [-o, o, z], nZ); // top
  quad(m, [-o, -o, z], [o, -o, z], [w, -w, z], [-w, -w, z], nZ); // bottom
  quad(m, [-o, -o, z], [-w, -w, z], [-w, w, z], [-o, o, z], nZ); // left
  quad(m, [w, -w, z], [o, -o, z], [o, o, z], [w, w, z], nZ); // right
  return m;
}

/**
 * The MAT BEVEL (layer 2 window cut) — the thin lit ramp from the mat front
 * inner edge back+inward to the mat back, landing at the window edge. Its own
 * brighter material = the classic white bevel line. Normals tilt inward+forward.
 */
function buildMatBevel(g) {
  const m = newMesh();
  const win = g.printMetres / 2; // window edge (back, inner of the cut)
  const back = win;
  const front = win + g.matThick; // front edge sits slightly outside the window
  const zf = g.frameDepth - g.matFrontRecess; // mat front
  const zb = zf - g.matThick; // mat back
  const nTop = normalize([0, 1, 1]);
  const nBot = normalize([0, -1, 1]);
  const nLeft = normalize([-1, 0, 1]);
  const nRight = normalize([1, 0, 1]);
  quad(m, [-back, back, zb], [back, back, zb], [front, front, zf], [-front, front, zf], nTop); // top
  quad(m, [-front, -front, zf], [front, -front, zf], [back, -back, zb], [-back, -back, zb], nBot); // bottom
  quad(m, [-front, -front, zf], [-front, front, zf], [-back, back, zb], [-back, -back, zb], nLeft); // left
  quad(m, [back, -back, zb], [back, back, zb], [front, front, zf], [front, -front, zf], nRight); // right
  return m;
}

/**
 * The BACKING (layer 0) — a quad filling behind the mat at the print-recess
 * plane, near-black, so the recessed print reads as a shadowed cavity rather
 * than see-through and the object has body. Sits just behind the print.
 */
function buildBacking(g) {
  const m = newMesh();
  const half = g.printMetres / 2 + g.matBorder; // fills behind the mat too
  const z = g.frameDepth - g.matFrontRecess - g.matThick - g.printRecess - 0.0005;
  quad(m, [-half, -half, z], [half, -half, z], [half, half, z], [-half, half, z], [0, 0, 1]);
  return m;
}

/**
 * The CONTACT-SHADOW quad (layer 4) — a soft radial-gradient halo on the wall
 * just behind the frame, sized larger than the frame outline. Alpha-blended,
 * unlit. Fakes the ambient-occlusion shadow a hung frame drops on the wall.
 */
function buildShadow(g) {
  const m = newMesh();
  const frameOuter = g.printMetres / 2 + g.matBorder + g.frameFace;
  const half = frameOuter + g.shadowMargin;
  const z = g.shadowOffset; // just off the wall
  quad(
    m,
    [-half, -half, z],
    [half, -half, z],
    [half, half, z],
    [-half, half, z],
    [0, 0, 1],
    [
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ],
  );
  return m;
}

// -----------------------------------------------------------------------------
// A tiny opaque neutral-grey PNG — the GLB Artwork placeholder texture, swapped
// for the real colourway at RUNTIME (model-viewer material API). Encoded via the
// SAME zero-dep PNG encoder as the contact shadow (proven to decode cleanly in
// three.js's GLTFLoader) — the previous hand-pinned 1×1 JPEG was a minimal JPEG
// that three.js's blob-texture decoder rejected ("Couldn't load texture blob"),
// spamming the console before the swap landed. PNG keeps it deterministic.
// -----------------------------------------------------------------------------
let PLACEHOLDER_PNG = null;
function placeholderPng() {
  if (PLACEHOLDER_PNG) return PLACEHOLDER_PNG;
  const N = 8;
  const raw = Buffer.alloc(N * (1 + N * 4));
  for (let y = 0; y < N; y++) {
    const rowStart = y * (1 + N * 4);
    raw[rowStart] = 0; // PNG filter type 0 (None)
    for (let x = 0; x < N; x++) {
      const p = rowStart + 1 + x * 4;
      raw[p] = 180;
      raw[p + 1] = 178;
      raw[p + 2] = 172;
      raw[p + 3] = 255; // opaque neutral grey
    }
  }
  PLACEHOLDER_PNG = encodePng(N, N, raw);
  if (PLACEHOLDER_PNG[0] !== 0x89 || PLACEHOLDER_PNG[1] !== 0x50)
    throw new Error("placeholder PNG is not a valid PNG");
  return PLACEHOLDER_PNG;
}

// -----------------------------------------------------------------------------
// A soft radial-gradient shadow PNG (transparent centre → ~38% black ring).
// Tiny 64×64 8-bit RGBA, hand-encoded as PNG with zlib STORED (uncompressed)
// blocks so it needs no zlib dependency. Cached in-process.
// -----------------------------------------------------------------------------
let SHADOW_PNG = null;
function shadowPng() {
  if (SHADOW_PNG) return SHADOW_PNG;
  const N = 64;
  const raw = Buffer.alloc(N * (1 + N * 4));
  const cx = (N - 1) / 2;
  const cy = (N - 1) / 2;
  const maxR = Math.hypot(cx, cy);
  for (let y = 0; y < N; y++) {
    const rowStart = y * (1 + N * 4);
    raw[rowStart] = 0; // PNG filter type 0 (None)
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - cx, y - cy) / maxR; // 0 centre → 1 corner
      const t = Math.min(1, d / 0.85);
      const a = Math.sin(t * Math.PI) * 0.38; // 0 → peak ~0.38 → 0 (round halo)
      const alpha = Math.max(0, Math.min(255, Math.round(a * 255)));
      const p = rowStart + 1 + x * 4;
      raw[p] = 0;
      raw[p + 1] = 0;
      raw[p + 2] = 0;
      raw[p + 3] = alpha;
    }
  }
  SHADOW_PNG = encodePng(N, N, raw);
  return SHADOW_PNG;
}

/** Minimal PNG encoder: 8-bit RGBA, IDAT via zlib stored blocks (zero-dep). */
function encodePng(w, h, rawWithFilters) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const adler32 = (buf) => {
    let a = 1,
      b = 0;
    for (let i = 0; i < buf.length; i++) {
      a = (a + buf[i]) % 65521;
      b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const zhdr = Buffer.from([0x78, 0x01]);
  const blocks = [];
  let off = 0;
  while (off < rawWithFilters.length) {
    const chunkLen = Math.min(65535, rawWithFilters.length - off);
    const isLast = off + chunkLen >= rawWithFilters.length;
    const hdr = Buffer.alloc(5);
    hdr[0] = isLast ? 1 : 0; // BFINAL, BTYPE=00 (stored)
    hdr.writeUInt16LE(chunkLen, 1);
    hdr.writeUInt16LE(~chunkLen & 0xffff, 3);
    blocks.push(hdr, rawWithFilters.subarray(off, off + chunkLen));
    off += chunkLen;
  }
  const adler = Buffer.alloc(4);
  adler.writeUInt32BE(adler32(rawWithFilters), 0);
  const idatData = Buffer.concat([zhdr, ...blocks, adler]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// -----------------------------------------------------------------------------
// glTF → GLB packer. Builds the framed model with 6 primitives, each its own
// material. `artworkTexture` is the JPEG embedded for the Artwork slot
// (placeholder in the shell GLBs).
// -----------------------------------------------------------------------------
function buildGlb({ printMetres, frame, artworkTexture }) {
  const g = geomConstants(printMetres);
  const art = buildArtwork(g);
  const frameMesh = buildFrame(g);
  const mat = buildMat(g);
  const matBevel = buildMatBevel(g);
  const back = buildBacking(g);
  const shadow = buildShadow(g);
  const shadowTex = shadowPng();

  const bufferViews = [];
  const chunks = [];
  let offset = 0;
  const ARRAY_BUFFER = 34962;
  const ELEMENT_ARRAY_BUFFER = 34963;
  const addView = (buf, target) => {
    const aligned = pad4(buf, 0x00);
    const view = { buffer: 0, byteOffset: offset, byteLength: buf.length };
    if (target !== undefined) view.target = target;
    bufferViews.push(view);
    chunks.push(aligned);
    offset += aligned.length;
    return bufferViews.length - 1;
  };

  const accessors = [];
  const addMesh = (mesh) => {
    const pv = addView(f32(mesh.positions), ARRAY_BUFFER);
    const nv = addView(f32(mesh.normals), ARRAY_BUFFER);
    const uv = addView(f32(mesh.uvs), ARRAY_BUFFER);
    const iv = addView(u16(mesh.indices), ELEMENT_ARRAY_BUFFER);
    const posAcc = accessors.length;
    accessors.push({
      bufferView: pv,
      componentType: 5126,
      count: mesh.positions.length / 3,
      type: "VEC3",
      min: min3(mesh.positions),
      max: max3(mesh.positions),
    });
    const nrmAcc = accessors.length;
    accessors.push({ bufferView: nv, componentType: 5126, count: mesh.normals.length / 3, type: "VEC3" });
    const uvAcc = accessors.length;
    accessors.push({ bufferView: uv, componentType: 5126, count: mesh.uvs.length / 2, type: "VEC2" });
    const idxAcc = accessors.length;
    accessors.push({ bufferView: iv, componentType: 5123, count: mesh.indices.length, type: "SCALAR" });
    return {
      attributes: { POSITION: posAcc, NORMAL: nrmAcc, TEXCOORD_0: uvAcc },
      indices: idxAcc,
      mode: 4,
    };
  };

  const pArt = addMesh(art);
  const pFrame = addMesh(frameMesh);
  const pMat = addMesh(mat);
  const pBevel = addMesh(matBevel);
  const pBack = addMesh(back);
  const pShadow = addMesh(shadow);

  const artImgView = addView(artworkTexture); // PNG (shell placeholder) / JPEG (baked USDZ path)
  const shadowImgView = addView(shadowTex); // PNG
  const bin = Buffer.concat(chunks);

  const materials = [
    {
      name: "Artwork",
      pbrMetallicRoughness: {
        baseColorTexture: { index: 0 },
        metallicFactor: ART_METALLIC,
        roughnessFactor: ART_ROUGHNESS,
      },
    },
    {
      name: "Frame",
      pbrMetallicRoughness: {
        baseColorFactor: [...frame.base, 1],
        metallicFactor: 0,
        roughnessFactor: frame.roughness,
      },
    },
    {
      name: "Mat",
      pbrMetallicRoughness: { baseColorFactor: [...MAT_BASE, 1], metallicFactor: 0, roughnessFactor: MAT_ROUGHNESS },
    },
    {
      name: "MatBevel",
      pbrMetallicRoughness: {
        baseColorFactor: [...MAT_BEVEL_BASE, 1],
        metallicFactor: 0,
        roughnessFactor: MAT_BEVEL_ROUGHNESS,
      },
    },
    {
      name: "Backing",
      pbrMetallicRoughness: { baseColorFactor: [...BACK_BASE, 1], metallicFactor: 0, roughnessFactor: BACK_ROUGHNESS },
    },
    {
      name: "ContactShadow",
      alphaMode: "BLEND",
      pbrMetallicRoughness: {
        baseColorTexture: { index: 1 },
        metallicFactor: 0,
        roughnessFactor: 1,
      },
      extensions: { KHR_materials_unlit: {} },
    },
  ];

  pArt.material = 0;
  pFrame.material = 1;
  pMat.material = 2;
  pBevel.material = 3;
  pBack.material = 4;
  pShadow.material = 5;

  const gltf = {
    asset: { version: "2.0", generator: "uncle-tribute build-ar-assets.mjs v3" },
    extensionsUsed: ["KHR_materials_unlit"],
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: "FramedPrint", mesh: 0 }],
    meshes: [
      {
        name: "FramedPrint",
        // Artwork primitive FIRST + material[0] named "Artwork" so the app can
        // target it to swap baseColorTexture at runtime.
        primitives: [pArt, pFrame, pMat, pBevel, pBack, pShadow],
      },
    ],
    materials,
    textures: [
      { source: 0, sampler: 0 },
      { source: 1, sampler: 1 },
    ],
    images: [
      {
        bufferView: artImgView,
        mimeType: artworkTexture[0] === 0x89 ? "image/png" : "image/jpeg",
        name: "ArtworkTexture",
      },
      { bufferView: shadowImgView, mimeType: "image/png", name: "ContactShadow" },
    ],
    samplers: [
      { wrapS: 33071, wrapT: 33071, magFilter: 9729, minFilter: 9987 }, // CLAMP, art
      { wrapS: 33071, wrapT: 33071, magFilter: 9729, minFilter: 9729 }, // CLAMP, shadow
    ],
    accessors,
    bufferViews,
    buffers: [{ byteLength: bin.length }],
  };

  const jsonBuf = pad4(Buffer.from(JSON.stringify(gltf), "utf8"), 0x20);
  const binBuf = pad4(bin, 0x00);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + binBuf.length, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuf.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binBuf.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuf]);
}

// -----------------------------------------------------------------------------
// GLB structural validation — fail loudly BEFORE writing a bad asset.
// -----------------------------------------------------------------------------
function validateGlb(glb, artTex) {
  const errors = [];
  if (glb.length < 12) errors.push("GLB shorter than 12-byte header");
  if (glb.readUInt32LE(0) !== 0x46546c67) errors.push("bad magic");
  if (glb.readUInt32LE(4) !== 2) errors.push("bad version");
  if (glb.readUInt32LE(8) !== glb.length)
    errors.push(`header length ${glb.readUInt32LE(8)} !== actual ${glb.length}`);

  let p = 12;
  const jsonLen = glb.readUInt32LE(p);
  if (glb.readUInt32LE(p + 4) !== 0x4e4f534a) errors.push("first chunk not JSON");
  if (jsonLen & 3) errors.push("JSON chunk not 4-byte aligned");
  p += 8;
  let gltf;
  try {
    gltf = JSON.parse(glb.subarray(p, p + jsonLen).toString("utf8"));
  } catch (e) {
    errors.push(`JSON does not parse: ${e.message}`);
  }
  p += jsonLen;
  const binLen = glb.readUInt32LE(p);
  if (glb.readUInt32LE(p + 4) !== 0x004e4942) errors.push("second chunk not BIN");
  if (binLen & 3) errors.push("BIN chunk not 4-byte aligned");
  p += 8;
  const binStart = p;
  if (binStart + binLen !== glb.length) errors.push("BIN end !== file end");

  if (gltf) {
    for (let k = 0; k < (gltf.bufferViews?.length ?? 0); k++) {
      const bv = gltf.bufferViews[k];
      if (bv.byteOffset + bv.byteLength > binLen) errors.push(`bufferView[${k}] exceeds BIN`);
    }
    const artMat = gltf.materials?.[0];
    if (!artMat || artMat.name !== "Artwork") errors.push("material[0] is not named 'Artwork'");
    else if (artMat.pbrMetallicRoughness?.baseColorTexture?.index === undefined)
      errors.push("Artwork material has no baseColorTexture");
    const img0 = gltf.images?.[0];
    if (!img0 || img0.bufferView === undefined) errors.push("no image[0].bufferView");
    else {
      const bv = gltf.bufferViews[img0.bufferView];
      const s = binStart + bv.byteOffset;
      const isJpeg = glb[s] === 0xff && glb[s + 1] === 0xd8 && glb[s + 2] === 0xff;
      const isPng = glb[s] === 0x89 && glb[s + 1] === 0x50 && glb[s + 2] === 0x4e;
      if (!isJpeg && !isPng) errors.push("Artwork image is neither JPEG nor PNG");
      if (bv.byteLength !== artTex.length)
        errors.push(`Artwork image length ${bv.byteLength} !== source ${artTex.length}`);
    }
    const img1 = gltf.images?.[1];
    if (img1?.bufferView !== undefined) {
      const bv = gltf.bufferViews[img1.bufferView];
      const s = binStart + bv.byteOffset;
      if (glb[s] !== 0x89 || glb[s + 1] !== 0x50 || glb[s + 2] !== 0x4e)
        errors.push("ContactShadow image not a PNG");
    }
  }
  if (errors.length) throw new Error(`GLB validation FAILED:\n  - ${errors.join("\n  - ")}`);
}

// -----------------------------------------------------------------------------
// USDA author → usdzip --arkitAsset → usdchecker --arkit
// Authors the SAME five-layer model at the size's TRUE metres, texture embedded.
// metersPerUnit=1, upAxis=Y, vertical-plane anchoring. USD constant-colour
// inputs are LINEAR (matching the glTF linear factors).
// -----------------------------------------------------------------------------
function pts(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i += 3)
    out.push(`(${arr[i].toFixed(6)}, ${arr[i + 1].toFixed(6)}, ${arr[i + 2].toFixed(6)})`);
  return out.join(", ");
}
function uvList(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i += 2) out.push(`(${arr[i].toFixed(6)}, ${arr[i + 1].toFixed(6)})`);
  return out.join(", ");
}
function faceData(mesh) {
  const triCount = mesh.indices.length / 3;
  return { counts: new Array(triCount).fill(3).join(", "), indices: mesh.indices.join(", ") };
}
/** Emit one USD Mesh bound to a named material. USD st origin is bottom-left so
 *  we flip v (1 - v) vs the glTF uv to keep the image upright. */
function usdMesh(name, mesh, matPath) {
  const ext = [min3(mesh.positions), max3(mesh.positions)];
  const fd = faceData(mesh);
  const stArr = [];
  for (let i = 0; i < mesh.uvs.length; i += 2) stArr.push(mesh.uvs[i], 1 - mesh.uvs[i + 1]);
  return `
    def Mesh "${name}" (
        prepend apiSchemas = ["MaterialBindingAPI"]
    )
    {
        float3[] extent = [(${ext[0].map((v) => v.toFixed(6)).join(", ")}), (${ext[1]
          .map((v) => v.toFixed(6))
          .join(", ")})]
        int[] faceVertexCounts = [${fd.counts}]
        int[] faceVertexIndices = [${fd.indices}]
        point3f[] points = [${pts(mesh.positions)}]
        normal3f[] primvars:normals = [${pts(mesh.normals)}] (
            interpolation = "vertex"
        )
        texCoord2f[] primvars:st = [${uvList(stArr)}] (
            interpolation = "vertex"
        )
        rel material:binding = <${matPath}>
        uniform token subdivisionScheme = "none"
    }`;
}
function usdColorMaterial(name, rgb, roughness, root) {
  const path = `${root}/Materials/${name}`;
  return {
    body: `
    def Material "${name}"
    {
        token outputs:surface.connect = <${path}/Surface.outputs:surface>
        def Shader "Surface"
        {
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor = (${rgb.map((v) => v.toFixed(4)).join(", ")})
            float inputs:metallic = 0
            float inputs:roughness = ${roughness}
            token outputs:surface
        }
    }`,
  };
}
function usdTextureMaterial(name, jpegName, roughness, root) {
  const path = `${root}/Materials/${name}`;
  return {
    body: `
    def Material "${name}"
    {
        token outputs:surface.connect = <${path}/Surface.outputs:surface>
        def Shader "Surface"
        {
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor.connect = <${path}/Texture.outputs:rgb>
            float inputs:metallic = 0
            float inputs:roughness = ${roughness}
            token outputs:surface
        }
        def Shader "Texture"
        {
            uniform token info:id = "UsdUVTexture"
            asset inputs:file = @${jpegName}@
            float2 inputs:st.connect = <${path}/stReader.outputs:result>
            token inputs:wrapS = "clamp"
            token inputs:wrapT = "clamp"
            float3 outputs:rgb
        }
        def Shader "stReader"
        {
            uniform token info:id = "UsdPrimvarReader_float2"
            token inputs:varname = "st"
            float2 outputs:result
        }
    }`,
  };
}
function usdShadowMaterial(name, pngName, root) {
  const path = `${root}/Materials/${name}`;
  return {
    body: `
    def Material "${name}"
    {
        token outputs:surface.connect = <${path}/Surface.outputs:surface>
        def Shader "Surface"
        {
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor = (0, 0, 0)
            float inputs:metallic = 0
            float inputs:roughness = 1
            float inputs:opacity.connect = <${path}/Texture.outputs:a>
            int inputs:useSpecularWorkflow = 0
            token outputs:surface
        }
        def Shader "Texture"
        {
            uniform token info:id = "UsdUVTexture"
            asset inputs:file = @${pngName}@
            float2 inputs:st.connect = <${path}/stReader.outputs:result>
            token inputs:wrapS = "clamp"
            token inputs:wrapT = "clamp"
            float outputs:a
        }
        def Shader "stReader"
        {
            uniform token info:id = "UsdPrimvarReader_float2"
            token inputs:varname = "st"
            float2 outputs:result
        }
    }`,
  };
}

function buildUsda({ printMetres, frame, jpegName, pngName }) {
  const g = geomConstants(printMetres);
  const root = "/FramedPrint";
  const art = buildArtwork(g);
  const frameMesh = buildFrame(g);
  const mat = buildMat(g);
  const matBevel = buildMatBevel(g);
  const back = buildBacking(g);
  const shadow = buildShadow(g);

  const materials = [
    usdTextureMaterial("ArtworkMat", jpegName, ART_ROUGHNESS, root),
    usdColorMaterial("FrameMat", frame.base, frame.roughness, root),
    usdColorMaterial("MatMat", MAT_BASE, MAT_ROUGHNESS, root),
    usdColorMaterial("MatBevelMat", MAT_BEVEL_BASE, MAT_BEVEL_ROUGHNESS, root),
    usdColorMaterial("BackingMat", BACK_BASE, BACK_ROUGHNESS, root),
    usdShadowMaterial("ShadowMat", pngName, root),
  ];
  const meshes = [
    usdMesh("Artwork", art, `${root}/Materials/ArtworkMat`),
    usdMesh("Frame", frameMesh, `${root}/Materials/FrameMat`),
    usdMesh("Mat", mat, `${root}/Materials/MatMat`),
    usdMesh("MatBevel", matBevel, `${root}/Materials/MatBevelMat`),
    usdMesh("Backing", back, `${root}/Materials/BackingMat`),
    usdMesh("ContactShadow", shadow, `${root}/Materials/ShadowMat`),
  ];

  return `#usda 1.0
(
    defaultPrim = "FramedPrint"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "FramedPrint" (
    kind = "component"
)
{
    token preliminary:anchoring:type = "plane"
    token preliminary:planeAnchoring:alignment = "vertical"
${meshes.join("\n")}

    def Scope "Materials"
    {
${materials.map((m) => m.body).join("\n")}
    }
}
`;
}

// -----------------------------------------------------------------------------
// Texture prep — downscale a source JPEG to ~800px @ quality 40 (~100–130KB).
// -----------------------------------------------------------------------------
function prepTexture(srcJpgPath, outJpgPath) {
  execFileSync(SIPS, ["-Z", "800", "-s", "formatOptions", "40", srcJpgPath, "--out", outJpgPath], {
    stdio: "pipe",
  });
  const buf = readFileSync(outJpgPath);
  if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff)
    throw new Error(`downscaled texture is not a JPEG: ${outJpgPath}`);
  return buf;
}

// -----------------------------------------------------------------------------
// Ophiuchus centre-square crop — source is 2000×1622 LANDSCAPE; the shop sells a
// SQUARE A-size print like every other painting, so crop a centred square first.
// sips -c <h> <w> centre-crops to HEIGHT × WIDTH.
// -----------------------------------------------------------------------------
const OPHIUCHUS = { image: "/img/paintings/ophiuchus-original.jpg", cropPx: [1622, 1622] }; // [w,h]
function croppedSourceFor(image, tmpRoot) {
  const file = image.replace("/img/paintings/", "");
  const src = join(IMG_DIR, file);
  if (image === OPHIUCHUS.image) {
    const out = join(tmpRoot, "ophiuchus-square.jpg");
    if (!existsSync(out)) {
      const [w, h] = OPHIUCHUS.cropPx;
      execFileSync(SIPS, ["-c", String(h), String(w), src, "--out", out], { stdio: "pipe" });
    }
    return out;
  }
  return src;
}

// -----------------------------------------------------------------------------
// PAINTING → COLOURWAY-IMAGE table. Mirrors src/data/paintings.ts: every
// painting id with each of its `available` colourway `image` values. Kept
// explicit (not imported) because this is a Node build script and paintings.ts
// is TS with site-only imports.
// -----------------------------------------------------------------------------
const PAINTINGS = [
  { id: "wild-rose", images: ["/img/paintings/wild-rose-sussex-pink.jpg"] },
  { id: "english-bluebells", images: ["/img/paintings/english-bluebells-v3.jpg"] },
  {
    id: "orchis-7",
    images: ["/img/paintings/orchis7-rubedo-red.jpg", "/img/paintings/orchis7-aquamarine-blue.jpg"],
  },
  { id: "flower-of-life", images: ["/img/paintings/fol-kaleidoscope.jpg"] },
  {
    id: "slipper-orchids",
    images: [
      "/img/paintings/orchids30-nebula-purple.jpg",
      "/img/paintings/orchids30-lightning-blue.jpg",
      "/img/paintings/orchids30-garnet-red.jpg",
      "/img/paintings/orchids30-manipura-yellow.jpg",
    ],
  },
  {
    id: "peacock-minerva",
    images: [
      "/img/paintings/peacock-persian-indigo.jpg",
      "/img/paintings/peacock-blood-moon-red.jpg",
      "/img/paintings/peacock-sahara-sand-yellow.jpg",
      "/img/paintings/peacock-moroccan-purple.jpg",
      "/img/paintings/peacock-mary-pink.jpg",
    ],
  },
  { id: "ophiuchus", images: ["/img/paintings/ophiuchus-original.jpg"] },
  {
    id: "tridecagon-moon-star",
    images: [
      "/img/paintings/tridecagon-sage-green.jpg",
      "/img/paintings/tridecagon-moonstone-blue.jpg",
      "/img/paintings/tridecagon-supernova-violet.jpg",
      "/img/paintings/tridecagon-coral-reef.jpg",
    ],
  },
  { id: "lulin", images: ["/img/paintings/lulin-original.jpg"] },
  {
    id: "enneagon-swans",
    images: [
      "/img/paintings/enneagon-cygnus-gold.jpg",
      "/img/paintings/enneagon-glacier-blue.jpg",
      "/img/paintings/enneagon-solstice-orange.jpg",
      "/img/paintings/enneagon-antique-pink.jpg",
      "/img/paintings/enneagon-velvet-purple.jpg",
    ],
  },
];

/** Colourway image path → stable filename slug. Mirror of arSlug() in arAssets.ts. */
function arSlug(image) {
  return image
    .replace("/img/paintings/", "")
    .replace(/\.(jpg|jpeg|png|webp)$/i, "")
    .toLowerCase();
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function log(...a) {
  console.log(...a);
}
function kb(b) {
  return Math.round(b / 1024);
}
function runUsdchecker(usdzPath, id) {
  try {
    const out = execFileSync(USDCHECKER, ["--arkit", usdzPath], { stdio: "pipe" });
    const s = out.toString();
    if (/error/i.test(s)) throw new Error(s);
    return true;
  } catch (e) {
    const out = (e.stdout?.toString() || "") + (e.stderr?.toString() || "");
    throw new Error(`usdchecker --arkit FAILED for ${id}:\n${out || e.message}`);
  }
}

// -----------------------------------------------------------------------------
// Manifest writer — src/lib/arAssets.ts (auto-generated, like imageVariants.ts).
// -----------------------------------------------------------------------------
function writeManifest(usdzKeys, paintingsWithAr) {
  const sizesLit = SIZES.map(
    (s) =>
      `  { id: "${s.id}", label: "${s.label}", cm: ${s.cm}, metres: ${s.metres}, tierId: "${s.tierId}"${
        s.anchor ? ", anchor: true" : ""
      } },`,
  ).join("\n");
  const framesLit = FRAMES.map(
    (f) => `  { id: "${f.id}", label: "${f.label}", swatch: "${f.swatch}" },`,
  ).join("\n");
  const glbLit = FRAMES.map((f) => `  "${f.id}": "/ar/frame-${f.id}-${V}.glb",`).join("\n");
  const keysLit = [...usdzKeys].sort().map((k) => `  "${k}",`).join("\n");
  const arPaintings = [...paintingsWithAr].sort().map((id) => `  "${id}",`).join("\n");

  return `// AUTO-GENERATED by scripts/build-ar-assets.mjs (v3). DO NOT hand-edit.
// Web-AR manifest: true-size framed-print models for phone AR.
//   • GLB "frame shells" (model-viewer / WebXR / Android) — swap the "Artwork"
//     material baseColorTexture at runtime to the chosen colourway.
//   • USDZ matrix (iOS Quick Look) — one pre-baked file per
//     colourway-image × size × frame, authored at the size's TRUE metres.
// Regenerate with: node scripts/build-ar-assets.mjs

export interface ArSize {
  id: "a3" | "a2" | "a1" | "a0";
  label: string;
  cm: number;
  metres: number;
  tierId: string;
  anchor?: boolean;
}

export interface ArFrame {
  id: "black-oak" | "natural-oak";
  label: string;
  swatch: string;
}

export const AR_SIZES: ArSize[] = [
${sizesLit}
];

export const AR_FRAMES: ArFrame[] = [
${framesLit}
];

export const AR_DEFAULT_FRAME: ArFrame["id"] = "${DEFAULT_FRAME}";
export const AR_DEFAULT_SIZE: ArSize["id"] = "${ANCHOR.id}";

/** The GLB frame-shell asset path per frame finish (texture swapped at runtime). */
export const AR_FRAME_GLB: Record<ArFrame["id"], string> = {
${glbLit}
};

/** The metres the GLB shells are authored at (A2 anchor). Scale at runtime to
 *  the selected size = AR_SIZES[sizeId].metres / AR_GLB_BASE_METRES. */
export const AR_GLB_BASE_METRES = ${GLB_BASE_METRES};

/** Slug a colourway image path → its AR filename stem (mirror of the builder). */
export const arSlug = (image: string): string =>
  image
    .replace("/img/paintings/", "")
    .replace(/\\.(jpg|jpeg|png|webp)$/i, "")
    .toLowerCase();

/** The set of generated USDZ keys: \`<paintingId>__<imageSlug>__<sizeId>__<frame>\`. */
const AR_USDZ_KEYS: ReadonlySet<string> = new Set([
${keysLit}
]);

/** Painting ids that have ANY AR asset (GLB shell + at least one USDZ). */
const AR_PAINTINGS: ReadonlySet<string> = new Set([
${arPaintings}
]);

/** The iOS Quick Look USDZ path for a (painting, colourway image, size, frame),
 *  or null if that exact asset was not generated. */
export const arUsdz = (
  paintingId: string,
  image: string,
  sizeId: ArSize["id"],
  frame: ArFrame["id"],
): string | null => {
  const slug = arSlug(image);
  const key = \`\${paintingId}__\${slug}__\${sizeId}__\${frame}\`;
  if (!AR_USDZ_KEYS.has(key)) return null;
  return \`/ar/\${paintingId}-\${slug}-\${sizeId}-\${frame}-${V}.usdz\`;
};

/** Whether a painting has AR available at all. */
export const hasAr = (paintingId: string): boolean => AR_PAINTINGS.has(paintingId);
`;
}

// -----------------------------------------------------------------------------
// Driver
// -----------------------------------------------------------------------------
function main() {
  log("=".repeat(72));
  log(`build-ar-assets ${V} — REALISTIC framed-print AR (GLB shells + USDZ matrix)`);
  log("=".repeat(72));

  const hasUsd = existsSync(USDZIP) && existsSync(USDCHECKER) && existsSync(SIPS);
  if (!hasUsd)
    log("⚠️  USD tooling (usdzip/usdchecker/sips) not found → USDZ SKIPPED (GLB shells still emit).");

  mkdirSync(OUT_DIR, { recursive: true });
  const tmpRoot = join(tmpdir(), `ar-v3-${process.pid}`);
  mkdirSync(tmpRoot, { recursive: true });

  // CLEAN: wipe stale -v1/-v2 (and prior -v3) so public/ar holds only this run.
  // Skipped on --sample / --keep so a proof run doesn't nuke committed assets.
  if (!KEEP) {
    const stale = readdirSync(OUT_DIR).filter((f) => /\.(glb|usdz)$/i.test(f));
    for (const f of stale) rmSync(join(OUT_DIR, f), { force: true });
    log(`cleaned ${stale.length} old asset(s) from public/ar/`);
  } else {
    log("--keep: NOT wiping public/ar (sample run).");
  }

  // ---- 1) GLB frame shells (one per frame finish), authored at the A2 anchor ----
  const placeholder = placeholderPng();
  for (const frame of FRAMES) {
    const glb = buildGlb({ printMetres: GLB_BASE_METRES, frame, artworkTexture: placeholder });
    validateGlb(glb, placeholder);
    const out = join(OUT_DIR, `frame-${frame.id}-${V}.glb`);
    writeFileSync(out, glb);
    log(`  ✓ GLB shell  ${kb(glb.length)} KB  → public/ar/frame-${frame.id}-${V}.glb  (validated)`);
  }

  // ---- 2) USDZ matrix: every colourway image × size × frame ----
  const usdzKeys = new Set();
  const paintingsWithAr = new Set();
  const sampleResults = [];
  let usdzCount = 0;
  let usdzBytes = 0;

  // --sample: a tight proof set across sizes + both frames + the Ophiuchus crop.
  const SAMPLE_SPEC = [
    { paintingId: "wild-rose", image: "/img/paintings/wild-rose-sussex-pink.jpg", sizeId: "a3", frame: "black-oak" },
    { paintingId: "wild-rose", image: "/img/paintings/wild-rose-sussex-pink.jpg", sizeId: "a2", frame: "black-oak" },
    { paintingId: "peacock-minerva", image: "/img/paintings/peacock-persian-indigo.jpg", sizeId: "a0", frame: "natural-oak" },
    { paintingId: "ophiuchus", image: "/img/paintings/ophiuchus-original.jpg", sizeId: "a1", frame: "natural-oak" },
  ];

  // Always populate the FULL key set so the manifest reflects the complete
  // matrix the orchestrator will generate (even on a sample / no-USD run).
  for (const p of PAINTINGS)
    for (const image of p.images)
      for (const s of SIZES)
        for (const f of FRAMES) {
          usdzKeys.add(`${p.id}__${arSlug(image)}__${s.id}__${f.id}`);
          paintingsWithAr.add(p.id);
        }

  if (hasUsd) {
    const work = join(tmpRoot, "usd");
    mkdirSync(work, { recursive: true });
    const shadowPngBuf = shadowPng();
    const texCache = new Map(); // image slug → downscaled JPEG buffer

    const buildOne = ({ paintingId, image, sizeId, frame }) => {
      const size = SIZES.find((s) => s.id === sizeId);
      const fr = FRAMES.find((f) => f.id === frame);
      const slug = arSlug(image);
      let tex = texCache.get(slug);
      if (!tex) {
        const srcSquare = croppedSourceFor(image, tmpRoot);
        tex = prepTexture(srcSquare, join(work, `${slug}.jpg`));
        texCache.set(slug, tex);
      }
      // Per-asset working dir (usdzip --arkitAsset packs files next to the usda).
      const adir = join(work, `${paintingId}-${slug}-${sizeId}-${frame}`);
      mkdirSync(adir, { recursive: true });
      const jpegName = `${slug}.jpg`;
      const pngName = "shadow.png";
      writeFileSync(join(adir, jpegName), tex);
      writeFileSync(join(adir, pngName), shadowPngBuf);
      const usda = buildUsda({ printMetres: size.metres, frame: fr, jpegName, pngName });
      const usdaPath = join(adir, `${paintingId}.usda`);
      writeFileSync(usdaPath, usda);
      const outName = `${paintingId}-${slug}-${sizeId}-${frame}-${V}.usdz`;
      const usdzOut = join(OUT_DIR, outName);
      if (existsSync(usdzOut)) rmSync(usdzOut);
      try {
        execFileSync(USDZIP, ["--arkitAsset", usdaPath, usdzOut], { stdio: "pipe", cwd: adir });
      } catch (e) {
        const o = (e.stdout?.toString() || "") + (e.stderr?.toString() || "");
        throw new Error(`usdzip FAILED for ${outName}:\n${o || e.message}`);
      }
      runUsdchecker(usdzOut, outName);
      const sz = readFileSync(usdzOut).length;
      usdzCount++;
      usdzBytes += sz;
      return { outName, sz };
    };

    if (SAMPLE) {
      for (const spec of SAMPLE_SPEC) {
        const r = buildOne(spec);
        sampleResults.push(r);
        log(`  ✓ USDZ ${kb(r.sz)} KB  → public/ar/${r.outName}  (usdchecker --arkit: PASS)`);
      }
    } else {
      for (const p of PAINTINGS)
        for (const image of p.images)
          for (const s of SIZES)
            for (const f of FRAMES) {
              const r = buildOne({ paintingId: p.id, image, sizeId: s.id, frame: f.id });
              if (usdzCount % 20 === 0) log(`  … ${usdzCount} USDZ generated (latest ${r.outName})`);
            }
    }
  }

  // ---- 3) Write the manifest ----
  writeFileSync(MANIFEST, writeManifest(usdzKeys, paintingsWithAr));
  log(`\n  ✓ manifest → src/lib/arAssets.ts (${usdzKeys.size} USDZ keys, ${paintingsWithAr.size} paintings)`);

  if (existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });

  // ---- Summary ----
  log("\n" + "=".repeat(72));
  log("SUMMARY");
  log("=".repeat(72));
  if (SAMPLE) {
    log("SAMPLE run — proof assets only:");
    for (const r of sampleResults) log(`  ${r.outName.padEnd(56)} ${kb(r.sz)} KB`);
    log(
      `\nFull matrix would be: 25 images × ${SIZES.length} sizes × ${FRAMES.length} frames = ${
        25 * SIZES.length * FRAMES.length
      } USDZ + ${FRAMES.length} GLB shells.`,
    );
  } else {
    const avg = usdzCount ? Math.round(usdzBytes / usdzCount / 1024) : 0;
    log(`GLB shells: ${FRAMES.length}`);
    log(`USDZ generated: ${usdzCount}  (total ${(usdzBytes / 1024 / 1024).toFixed(1)} MB, avg ${avg} KB)`);
    if (usdzCount) log("All USDZ passed usdchecker --arkit.");
  }
  log("Outputs in public/ar/. /public is immutable-cached → -v3 filenames handle it.");
  log("⚠️  Orchestrator: the old <id>-v1.* / <id>-v2.* assets (~38MB) are wiped by a");
  log("    full (non-sample) run; delete them manually if you only ran --sample.");
}

main();
