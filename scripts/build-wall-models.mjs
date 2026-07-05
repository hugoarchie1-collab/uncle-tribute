#!/usr/bin/env node
// =============================================================================
// build-wall-models.mjs — deterministic FRAMELESS wall-model asset pipeline.
// -----------------------------------------------------------------------------
// Generates the 3D assets for the rebuilt "See on Your Wall" AR feature:
//
//   • ONE reusable frameless square-canvas GLB "shell"
//     (public/models/wall/canvas-frameless-v1.glb). Neutral canvas material on
//     the sides + back; a distinct "Artwork" material on the FRONT face whose
//     texture is swapped AT RUNTIME to the selected colourway (same-origin, the
//     exact original image, unaltered). Authored at the A2 base metres; the
//     component scales it to each size and ar-scale="fixed" locks real size.
//     → serves WebXR + Android Scene Viewer for EVERY artwork with one file.
//
//   • Per (artwork × colourway × size) USDZ for Apple Quick Look (iOS can't
//     swap textures at runtime), authored at each size's TRUE metres with the
//     colourway image on the front face. Uses the installed Pixar tools
//     (/usr/bin/usdzip --arkitAsset, validated with usdchecker --arkit). If the
//     tools are absent the USDZ step is skipped and reported — never faked.
//
//   • A manifest (src/lib/wallModels.ts + public/models/wall/manifest.json).
//
// NON-NEGOTIABLE: the artwork image is never regenerated, cropped, recoloured,
// warped or reframed. GLB embeds only a neutral placeholder (swapped to the
// untouched original at runtime); USDZ embeds a proportional, high-quality
// downscale of the original for mobile delivery (aspect + colour preserved).
// Non-square sources are REPORTED and SKIPPED, never silently cropped.
//
//   Usage:
//     node scripts/build-wall-models.mjs                 # shell + USDZ, original colourways, all sizes
//     node scripts/build-wall-models.mjs --all-colourways
//     node scripts/build-wall-models.mjs --sizes=a2,a0
//     node scripts/build-wall-models.mjs --no-usdz       # GLB shell + manifest only
//     node scripts/build-wall-models.mjs --sample        # one painting, one size (quick proof)
//
// Deterministic: no randomness, no timestamps inside asset bytes.
// =============================================================================

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

import { PAINTINGS, FRAME_STYLES } from "../src/data/paintings.ts";
import {
  ARTWORK_SIZES,
  WALL_SHELL_BASE_METRES,
  CANVAS_DEPTH_M,
} from "../src/lib/artworkSizes.ts";

// Frame options for the AR model: a thin flat moulding directly around the print
// (NO white mat). Colour baked into each USDZ (iOS can't recolour at runtime).
// Real-world frame width; scales with the size since each USDZ is authored true.
const FRAME_WIDTH_M = 0.03; // 3cm moulding
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const hexToLinear = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [0.5, 0.5, 0.5];
  return [1, 2, 3].map((i) => +srgbToLinear(parseInt(m[i], 16) / 255).toFixed(4));
};
// id → { linear rgb }, from the canonical website frame styles.
const FRAMES = FRAME_STYLES.map((f) => ({ id: f.id, linear: hexToLinear(f.swatch) }));

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "models", "wall");
const MANIFEST_TS = join(ROOT, "src", "lib", "wallModels.ts");
const MANIFEST_JSON = join(OUT_DIR, "manifest.json");
const IMG_DIR = join(ROOT, "public", "img", "paintings");

const VERSION = "v1";
// GLB content changed (real baked texture, per size) → NEW filename token so the
// immutable 1yr /models cache serves the textured file, not a stale shell.
const GLB_VERSION = "v2";
const SHELL_GLB = `canvas-frameless-${VERSION}.glb`;
const SQUARE_TOLERANCE = 0.015; // ≤1.5% edge difference counts as square (export rounding)
const USDZ_TEXTURE_MAX_PX = 1000; // crisper A0/A1 in AR while keeping the ~920-file matrix shippable
const GLB_WARN_BYTES = 3 * 1024 * 1024;
const USDZ_WARN_BYTES = 6 * 1024 * 1024;

// Neutral warm-linen canvas material (LINEAR rgb) for the sides + back.
const CANVAS_RGB_LINEAR = [0.72, 0.68, 0.6];

// ---- CLI --------------------------------------------------------------------
const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const flagVal = (name) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=")[1] : null;
};
const SAMPLE = hasFlag("--sample");
const ALL_COLOURWAYS = hasFlag("--all-colourways");
const NO_USDZ = hasFlag("--no-usdz");
const NO_FRAMES = hasFlag("--no-frames"); // skip framed models (default: bake every colour × size × frame)
const SIZE_FILTER = (flagVal("sizes") || "").split(",").map((s) => s.trim()).filter(Boolean);
const SIZES = (SIZE_FILTER.length ? ARTWORK_SIZES.filter((s) => SIZE_FILTER.includes(s.id)) : ARTWORK_SIZES).slice(
  0,
  SAMPLE ? 1 : ARTWORK_SIZES.length,
);

// ---- tiny helpers -----------------------------------------------------------
const slug = (image) =>
  image.replace("/img/paintings/", "").replace(/\.(jpe?g|png|webp)$/i, "").toLowerCase();

const kb = (n) => `${(n / 1024).toFixed(0)}KB`;

/** Read a JPEG's pixel dimensions from its SOF marker (no deps). */
function jpegSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

function findSourceJpg(image) {
  const s = slug(image);
  for (const ext of ["jpg", "jpeg"]) {
    const p = join(IMG_DIR, `${s}.${ext}`);
    if (existsSync(p)) return p;
  }
  return null;
}

// ---- PNG encoder (neutral placeholder for the GLB Artwork material) ---------
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
/** A tiny solid neutral-grey RGB PNG (swapped at runtime; never shown). */
function neutralPng(n = 8, rgb = [200, 194, 182]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(n, 0);
  ihdr.writeUInt32BE(n, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const raw = Buffer.alloc(n * (n * 3 + 1));
  for (let y = 0; y < n; y++) {
    const row = y * (n * 3 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < n; x++) {
      const o = row + 1 + x * 3;
      raw[o] = rgb[0];
      raw[o + 1] = rgb[1];
      raw[o + 2] = rgb[2];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- Frameless box geometry -------------------------------------------------
// Front face (width × height) facing +Z; depth D into -Z toward the wall. Returns
// two vertex groups: `front` (the Artwork face) and `rest` (back + 4 sides). Non-
// square supported (width ≠ height) so a landscape master (e.g. ophiuchus) bakes
// at its true aspect rather than being cropped.
function boxGeometry(width, height, depth) {
  const hx = width / 2,
    hy = height / 2;
  const zF = depth / 2, // front plane
    zB = -depth / 2; // back plane
  const face = (verts, normal, uvs) => ({ verts, normal, uvs });
  // UV convention: glTF (0,0)=top-left of texture; image upright, not mirrored.
  const front = face(
    [
      [-hx, hy, zF],
      [hx, hy, zF],
      [hx, -hy, zF],
      [-hx, -hy, zF],
    ],
    [0, 0, 1],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  );
  const rest = [
    // back (-Z)
    face(
      [
        [hx, hy, zB],
        [-hx, hy, zB],
        [-hx, -hy, zB],
        [hx, -hy, zB],
      ],
      [0, 0, -1],
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
    ),
    // right (+X)
    face(
      [
        [hx, hy, zF],
        [hx, hy, zB],
        [hx, -hy, zB],
        [hx, -hy, zF],
      ],
      [1, 0, 0],
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
    ),
    // left (-X)
    face(
      [
        [-hx, hy, zB],
        [-hx, hy, zF],
        [-hx, -hy, zF],
        [-hx, -hy, zB],
      ],
      [-1, 0, 0],
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
    ),
    // top (+Y)
    face(
      [
        [-hx, hy, zB],
        [hx, hy, zB],
        [hx, hy, zF],
        [-hx, hy, zF],
      ],
      [0, 1, 0],
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
    ),
    // bottom (-Y)
    face(
      [
        [-hx, -hy, zF],
        [hx, -hy, zF],
        [hx, -hy, zB],
        [-hx, -hy, zB],
      ],
      [0, -1, 0],
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
    ),
  ];
  return { front, rest };
}

// Recess of the print behind the moulding front (metres) — the frame rises proud
// of the artwork so ARKit / ARCore cast a believable contact shadow + bevel.
const FRAME_RECESS_M = 0.012;

// Assemble one primitive from quad faces → interleaved position/normal/uv/index.
function primFromQuads(faces) {
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  let base = 0;
  for (const f of faces) {
    for (let v = 0; v < 4; v++) {
      pos.push(...f.verts[v]);
      nor.push(...f.normal);
      uv.push(...f.uvs[v]);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    base += 4;
  }
  return { pos, nor, uv, idx };
}

// ---- Generic GLB packer ------------------------------------------------------
// prims: [{ pos, nor, uv, idx, material }]. `image` = { buf, mime, name } shared
// by any textured material (index 0), or null for an untextured model.
function packGlb({ prims, materials, image, meshName }) {
  const views = [];
  const chunks = [];
  let offset = 0;
  const addView = (buf, target) => {
    const pad = (4 - (offset % 4)) % 4;
    if (pad) {
      chunks.push(Buffer.alloc(pad));
      offset += pad;
    }
    const view = { buffer: 0, byteOffset: offset, byteLength: buf.length };
    if (target) view.target = target;
    views.push(view);
    chunks.push(buf);
    offset += buf.length;
    return views.length - 1;
  };
  const f32 = (arr) => {
    const b = Buffer.alloc(arr.length * 4);
    arr.forEach((v, i) => b.writeFloatLE(v, i * 4));
    return b;
  };
  const u16 = (arr) => {
    const b = Buffer.alloc(arr.length * 2);
    arr.forEach((v, i) => b.writeUInt16LE(v, i * 2));
    return b;
  };
  const min3 = (a) => [Math.min(...a.filter((_, i) => i % 3 === 0)), Math.min(...a.filter((_, i) => i % 3 === 1)), Math.min(...a.filter((_, i) => i % 3 === 2))];
  const max3 = (a) => [Math.max(...a.filter((_, i) => i % 3 === 0)), Math.max(...a.filter((_, i) => i % 3 === 1)), Math.max(...a.filter((_, i) => i % 3 === 2))];

  const accessors = [];
  const gltfPrims = prims.map((p) => {
    const vPos = addView(f32(p.pos), 34962);
    const vNor = addView(f32(p.nor), 34962);
    const vUv = addView(f32(p.uv), 34962);
    const vIdx = addView(u16(p.idx), 34963);
    const count = p.pos.length / 3;
    const aPos = accessors.push({ bufferView: vPos, componentType: 5126, count, type: "VEC3", min: min3(p.pos), max: max3(p.pos) }) - 1;
    const aNor = accessors.push({ bufferView: vNor, componentType: 5126, count, type: "VEC3" }) - 1;
    const aUv = accessors.push({ bufferView: vUv, componentType: 5126, count, type: "VEC2" }) - 1;
    const aIdx = accessors.push({ bufferView: vIdx, componentType: 5123, count: p.idx.length, type: "SCALAR" }) - 1;
    return { attributes: { POSITION: aPos, NORMAL: aNor, TEXCOORD_0: aUv }, indices: aIdx, material: p.material };
  });
  const imgView = image ? addView(image.buf) : null;
  const bin = Buffer.concat(chunks);

  const gltf = {
    asset: { version: "2.0", generator: "build-wall-models.mjs" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: meshName || "Model" }],
    meshes: [{ name: meshName || "Model", primitives: gltfPrims }],
    accessors,
    bufferViews: views,
    buffers: [{ byteLength: bin.length }],
    materials,
    ...(image
      ? {
          samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
          images: [{ bufferView: imgView, mimeType: image.mime, name: image.name || "Artwork" }],
          textures: [{ source: 0, sampler: 0 }],
        }
      : {}),
  };

  const jsonBuf = Buffer.from(JSON.stringify(gltf), "utf8");
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
  const binPad = (4 - (bin.length % 4)) % 4;
  const binChunk = Buffer.concat([bin, Buffer.alloc(binPad, 0)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // glTF
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
  const jsonHead = Buffer.alloc(8);
  jsonHead.writeUInt32LE(jsonChunk.length, 0);
  jsonHead.writeUInt32LE(0x4e4f534a, 4); // JSON
  const binHead = Buffer.alloc(8);
  binHead.writeUInt32LE(binChunk.length, 0);
  binHead.writeUInt32LE(0x004e4942, 4); // BIN
  return Buffer.concat([header, jsonHead, jsonChunk, binHead, binChunk]);
}

// ---- Frameless textured GLB (Artwork front + Canvas rest) --------------------
// `texture` = { buf, mime } embeds the REAL colourway image on the front face at
// true `edgeMetres`; null → a neutral placeholder (the legacy runtime-swap shell).
function buildBoxGlb(widthMetres, heightMetres, texture) {
  const { front, rest } = boxGeometry(widthMetres, heightMetres, CANVAS_DEPTH_M);
  const img = texture ?? { buf: neutralPng(), mime: "image/png", name: "ArtworkPlaceholder" };
  return packGlb({
    meshName: "FramelessCanvas",
    prims: [
      { ...primFromQuads([front]), material: 0 },
      { ...primFromQuads(rest), material: 1 },
    ],
    image: { ...img, name: texture ? "Artwork" : "ArtworkPlaceholder" },
    materials: [
      { name: "Artwork", pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.85 } },
      { name: "Canvas", pbrMetallicRoughness: { baseColorFactor: [...CANVAS_RGB_LINEAR, 1], metallicFactor: 0, roughnessFactor: 0.95 } },
    ],
  });
}

// ---- Framed textured GLB (print recessed behind a real 3D moulding) ----------
// Mirrors buildFramedUsda's vertex layout: 12 points (front outer, recessed print,
// back outer). The 4 front "bars" slant from the raised outer edge down to the
// recessed print → a beveled reveal; outer sides + back give the frame depth.
function buildFramedGlb(printW, printH, frameWidthM, frameLinear, texture) {
  const hiX = printW / 2;
  const hiY = printH / 2;
  const hoX = printW / 2 + frameWidthM;
  const hoY = printH / 2 + frameWidthM;
  const zf = CANVAS_DEPTH_M / 2;
  const zb = -CANVAS_DEPTH_M / 2;
  const zp = zf - FRAME_RECESS_M; // recessed print plane
  const P = [
    [-hoX, -hoY, zf], [hoX, -hoY, zf], [hoX, hoY, zf], [-hoX, hoY, zf], // 0-3 front outer
    [-hiX, -hiY, zp], [hiX, -hiY, zp], [hiX, hiY, zp], [-hiX, hiY, zp], // 4-7 recessed print
    [-hoX, -hoY, zb], [hoX, -hoY, zb], [hoX, hoY, zb], [-hoX, hoY, zb], // 8-11 back outer
  ];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const quad = (i, uvs) => {
    const verts = [P[i[0]], P[i[1]], P[i[2]], P[i[3]]];
    return { verts, normal: norm(cross(sub(verts[1], verts[0]), sub(verts[3], verts[0]))), uvs };
  };
  const printUV = [[0, 1], [1, 1], [1, 0], [0, 0]]; // bl,br,tr,tl → upright image
  const solid = [[0, 0], [0, 0], [0, 0], [0, 0]];
  const printFace = quad([4, 5, 6, 7], printUV);
  const frameFaces = [
    [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], // 4 beveled front bars
    [0, 8, 9, 1], [1, 9, 10, 2], [2, 10, 11, 3], [3, 11, 8, 0], // 4 outer sides
    [8, 11, 10, 9], // back
  ].map((i) => quad(i, solid));
  return packGlb({
    meshName: "FramedPrint",
    prims: [
      { ...primFromQuads([printFace]), material: 0 },
      { ...primFromQuads(frameFaces), material: 1 },
    ],
    image: { ...texture, name: "Artwork" },
    materials: [
      { name: "Print", pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.85 } },
      { name: "Frame", doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [...frameLinear, 1], metallicFactor: 0, roughnessFactor: 0.5 } },
    ],
  });
}

/** The legacy reusable frameless shell (neutral placeholder, A2 base metres). */
function buildShellGlb() {
  return buildBoxGlb(WALL_SHELL_BASE_METRES, WALL_SHELL_BASE_METRES, null);
}

function validateGlb(glb) {
  const errors = [];
  if (glb.length < 12) errors.push("shorter than header");
  else {
    if (glb.readUInt32LE(0) !== 0x46546c67) errors.push("bad magic");
    if (glb.readUInt32LE(4) !== 2) errors.push("bad version");
    if (glb.readUInt32LE(8) !== glb.length) errors.push("header length mismatch");
  }
  return errors;
}

// ---- USDA / USDZ (Apple Quick Look) -----------------------------------------
const USDZIP = "/usr/bin/usdzip";
const USDCHECKER = "/usr/bin/usdchecker";
const usdToolsPresent = existsSync(USDZIP);

/** Author a frameless textured-box USDA at TRUE metres, front face textured. */
function buildUsda(width, height, depth, textureFile) {
  const hx = (width / 2).toFixed(5);
  const hy = (height / 2).toFixed(5);
  const zF = (depth / 2).toFixed(5);
  const zB = (-depth / 2).toFixed(5);
  // 8 corner points; faces reference them. Order faces: front, back, right, left, top, bottom.
  const P = [
    [`-${hx}`, `-${hy}`, zF], // 0 front-bl
    [hx, `-${hy}`, zF], // 1 front-br
    [hx, hy, zF], // 2 front-tr
    [`-${hx}`, hy, zF], // 3 front-tl
    [`-${hx}`, `-${hy}`, zB], // 4 back-bl
    [hx, `-${hy}`, zB], // 5 back-br
    [hx, hy, zB], // 6 back-tr
    [`-${hx}`, hy, zB], // 7 back-tl
  ];
  const pts = P.map((p) => `(${p[0]}, ${p[1]}, ${p[2]})`).join(", ");
  // faceVertexIndices (quads), face order matters for GeomSubset (front = face 0)
  const faces = [
    [0, 1, 2, 3], // front (+Z)
    [5, 4, 7, 6], // back (-Z)
    [1, 5, 6, 2], // right (+X)
    [4, 0, 3, 7], // left (-X)
    [3, 2, 6, 7], // top (+Y)
    [4, 5, 1, 0], // bottom (-Y)
  ];
  const fvi = faces.flat().join(", ");
  const counts = faces.map(() => 4).join(", ");
  // faceVarying st: front upright; other faces given plain 0..1 (not shown as art).
  const stQuad = "(0,1), (1,1), (1,0), (0,0)";
  const st = faces.map(() => stQuad).join(", ");

  return `#usda 1.0
(
    defaultPrim = "Canvas"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Canvas" (kind = "component")
{
    def Mesh "Print"
    {
        uniform bool doubleSided = 0
        int[] faceVertexCounts = [${counts}]
        int[] faceVertexIndices = [${fvi}]
        point3f[] points = [${pts}]
        texCoord2f[] primvars:st = [${st}] (interpolation = "faceVarying")
        uniform token subsetFamily:materialBind:familyType = "partition"

        def GeomSubset "front" (prepend apiSchemas = ["MaterialBindingAPI"])
        {
            uniform token elementType = "face"
            uniform token familyName = "materialBind"
            int[] indices = [0]
            rel material:binding = </Canvas/Materials/Artwork>
        }

        def GeomSubset "sides" (prepend apiSchemas = ["MaterialBindingAPI"])
        {
            uniform token elementType = "face"
            uniform token familyName = "materialBind"
            int[] indices = [1, 2, 3, 4, 5]
            rel material:binding = </Canvas/Materials/CanvasEdge>
        }
    }

    def Scope "Materials"
    {
        def Material "Artwork"
        {
            token outputs:surface.connect = </Canvas/Materials/Artwork/Surface.outputs:surface>
            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor.connect = </Canvas/Materials/Artwork/Tex.outputs:rgb>
                float inputs:metallic = 0
                float inputs:roughness = 0.85
                token outputs:surface
            }
            def Shader "Tex"
            {
                uniform token info:id = "UsdUVTexture"
                asset inputs:file = @${textureFile}@
                float2 inputs:st.connect = </Canvas/Materials/Artwork/St.outputs:result>
                token inputs:wrapS = "clamp"
                token inputs:wrapT = "clamp"
                token inputs:sourceColorSpace = "sRGB"
                float3 outputs:rgb
            }
            def Shader "St"
            {
                uniform token info:id = "UsdPrimvarReader_float2"
                token inputs:varname = "st"
                float2 outputs:result
            }
        }
        def Material "CanvasEdge"
        {
            token outputs:surface.connect = </Canvas/Materials/CanvasEdge/Surface.outputs:surface>
            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (0.85, 0.82, 0.76)
                float inputs:metallic = 0
                float inputs:roughness = 0.95
                token outputs:surface
            }
        }
    }
}
`;
}

/** sips-downscale the original JPG to a mobile-delivery texture (aspect kept). */
/** Author a FRAMED textured box: the print + a flat wood border (no mat) at
 *  TRUE metres. doubleSided so face winding can never blank a face. Frame colour
 *  is baked (iOS can't recolour at runtime). Validated geometry (usdchecker --arkit). */
function buildFramedUsda(printW, printH, frameWidthM, frameLinear, textureFile) {
  const hiX = (printW / 2).toFixed(5);
  const hiY = (printH / 2).toFixed(5);
  const hoX = (printW / 2 + frameWidthM).toFixed(5);
  const hoY = (printH / 2 + frameWidthM).toFixed(5);
  const zf = (CANVAS_DEPTH_M / 2).toFixed(5);
  const zb = (-CANVAS_DEPTH_M / 2).toFixed(5);
  const zp = (CANVAS_DEPTH_M / 2 - FRAME_RECESS_M).toFixed(5); // recessed print plane
  const P = [
    [`-${hoX}`, `-${hoY}`, zf], [hoX, `-${hoY}`, zf], [hoX, hoY, zf], [`-${hoX}`, hoY, zf], // 0-3 front outer
    [`-${hiX}`, `-${hiY}`, zp], [hiX, `-${hiY}`, zp], [hiX, hiY, zp], [`-${hiX}`, hiY, zp], // 4-7 recessed print
    [`-${hoX}`, `-${hoY}`, zb], [hoX, `-${hoY}`, zb], [hoX, hoY, zb], [`-${hoX}`, hoY, zb], // 8-11 back outer
  ];
  const pts = P.map((p) => `(${p[0]}, ${p[1]}, ${p[2]})`).join(", ");
  // print, 4 border bars, 4 sides, back
  const fvi = [4, 5, 6, 7, 0, 1, 5, 4, 1, 2, 6, 5, 2, 3, 7, 6, 3, 0, 4, 7, 0, 8, 9, 1, 1, 9, 10, 2, 2, 10, 11, 3, 3, 11, 8, 0, 8, 11, 10, 9].join(", ");
  const stArr = ["(0, 1), (1, 1), (1, 0), (0, 0)"]; // print full
  for (let i = 0; i < 9; i++) stArr.push("(0, 0), (0, 0), (0, 0), (0, 0)"); // solid frame faces
  const fl = frameLinear.map((n) => n.toFixed(4)).join(", ");
  return `#usda 1.0
(
    defaultPrim = "Canvas"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Canvas" (kind = "component")
{
    def Mesh "Framed"
    {
        uniform bool doubleSided = 1
        int[] faceVertexCounts = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
        int[] faceVertexIndices = [${fvi}]
        point3f[] points = [${pts}]
        texCoord2f[] primvars:st = [${stArr.join(", ")}] (
            interpolation = "faceVarying"
        )
        uniform token subsetFamily:materialBind:familyType = "partition"

        def GeomSubset "print" (prepend apiSchemas = ["MaterialBindingAPI"])
        {
            uniform token elementType = "face"
            uniform token familyName = "materialBind"
            int[] indices = [0]
            rel material:binding = </Canvas/Materials/Artwork>
        }

        def GeomSubset "frame" (prepend apiSchemas = ["MaterialBindingAPI"])
        {
            uniform token elementType = "face"
            uniform token familyName = "materialBind"
            int[] indices = [1, 2, 3, 4, 5, 6, 7, 8, 9]
            rel material:binding = </Canvas/Materials/Frame>
        }
    }

    def Scope "Materials"
    {
        def Material "Artwork"
        {
            token outputs:surface.connect = </Canvas/Materials/Artwork/Surface.outputs:surface>
            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor.connect = </Canvas/Materials/Artwork/Tex.outputs:rgb>
                float inputs:metallic = 0
                float inputs:roughness = 0.85
                token outputs:surface
            }
            def Shader "Tex"
            {
                uniform token info:id = "UsdUVTexture"
                asset inputs:file = @${textureFile}@
                float2 inputs:st.connect = </Canvas/Materials/Artwork/St.outputs:result>
                token inputs:wrapS = "clamp"
                token inputs:wrapT = "clamp"
                token inputs:sourceColorSpace = "sRGB"
                float3 outputs:rgb
            }
            def Shader "St"
            {
                uniform token info:id = "UsdPrimvarReader_float2"
                token inputs:varname = "st"
                float2 outputs:result
            }
        }

        def Material "Frame"
        {
            token outputs:surface.connect = </Canvas/Materials/Frame/Surface.outputs:surface>
            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (${fl})
                float inputs:metallic = 0
                float inputs:roughness = 0.55
                token outputs:surface
            }
        }
    }
}
`;
}

function makeUsdzTexture(srcJpg, destJpg) {
  execFileSync("/usr/bin/sips", ["-Z", String(USDZ_TEXTURE_MAX_PX), "-s", "format", "jpeg", "-s", "formatOptions", "62", srcJpg, "--out", destJpg], { stdio: "ignore" });
}

// ---- main -------------------------------------------------------------------
function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const tmp = join(OUT_DIR, ".tmp");
  mkdirSync(tmp, { recursive: true });

  console.log(`\n▶ build-wall-models ${VERSION}  (sizes: ${SIZES.map((s) => s.id).join(",")}${ALL_COLOURWAYS ? ", all colourways" : ", original colourways"}${NO_USDZ ? ", no-usdz" : ""})\n`);

  // 1) Shell GLB — one file, serves Android/WebXR for every artwork.
  const glb = buildShellGlb();
  const glbErrors = validateGlb(glb);
  if (glbErrors.length) {
    console.error(`✗ shell GLB invalid: ${glbErrors.join("; ")}`);
    process.exit(1);
  }
  const glbPath = join(OUT_DIR, SHELL_GLB);
  writeFileSync(glbPath, glb);
  console.log(`✓ shell GLB  ${SHELL_GLB}  ${kb(glb.length)}${glb.length > GLB_WARN_BYTES ? "  ⚠ large" : ""}`);

  // 2) Walk catalogue.
  const paintings = SAMPLE ? PAINTINGS.slice(0, 1) : PAINTINGS;
  const records = [];
  const nonSquare = [];
  const missing = [];
  let usdzOk = 0;
  let usdzFail = 0;
  const framedKeys = [];
  const framedGlbKeys = [];
  let framedOk = 0;
  let framedFail = 0;
  let framedGlbOk = 0;
  let framedGlbFail = 0;
  const glbKeys = [];
  let glbOk = 0;
  let glbFail = 0;

  for (const p of paintings) {
    const colourways = p.colourways.filter((c) => c.available && (ALL_COLOURWAYS || c.isOriginal));
    for (const c of colourways) {
      const srcJpg = findSourceJpg(c.image);
      if (!srcJpg) {
        missing.push(`${p.id} · ${c.name} → ${c.image}`);
        continue;
      }
      const dims = jpegSize(readFileSync(srcJpg));
      if (!dims) {
        nonSquare.push(`${p.id} · ${c.name} → unreadable dimensions (SKIPPED)`);
        continue;
      }
      // True aspect from the master: square masters snap to exactly 1:1 (identical
      // output as before); a genuinely non-square master (e.g. landscape ophiuchus)
      // bakes at its REAL proportions — never cropped. Width tracks the size's cm.
      const aspect =
        Math.abs(dims.w - dims.h) / Math.max(dims.w, dims.h) <= SQUARE_TOLERANCE
          ? 1
          : dims.h / dims.w;
      const s = slug(c.image);

      // Shared 1024px JPEG texture — embedded in every GLB (and reused for USDZ).
      const glbTexPath = join(tmp, `${p.id}-${s}-glbtex.jpg`);
      let glbTexBuf = null;
      try {
        makeUsdzTexture(srcJpg, glbTexPath);
        glbTexBuf = readFileSync(glbTexPath);
      } catch {
        try { glbTexBuf = readFileSync(srcJpg); } catch { glbTexBuf = null; }
      }

      // USDZ per size (iOS). GLB is per (colourway × size) — see buildBoxGlb.
      let usdzTex = null;
      for (const size of SIZES) {
        const widthM = size.metres;
        const heightM = size.metres * aspect; // === widthM for square masters
        // Per-(colourway × size) TEXTURED GLB — Android Scene Viewer + WebXR load
        // this exact file on hand-off, so the artwork + true size survive.
        let comboGlbUrl = null;
        if (glbTexBuf) {
          const glbName = `${p.id}-${s}-${size.id}-${GLB_VERSION}.glb`;
          const gPath = join(OUT_DIR, glbName);
          try {
            const buf = buildBoxGlb(widthM, heightM, { buf: glbTexBuf, mime: "image/jpeg" });
            const gErr = validateGlb(buf);
            if (gErr.length) throw new Error(gErr.join("; "));
            writeFileSync(gPath, buf);
            comboGlbUrl = `/models/wall/${glbName}`;
            glbKeys.push(`${p.id}__${s}__${size.id}`);
            glbOk++;
            if (buf.length > GLB_WARN_BYTES) console.warn(`  ⚠ ${glbName} ${kb(buf.length)} large`);
          } catch (e) {
            glbFail++;
            if (existsSync(gPath)) rmSync(gPath);
            if (glbFail <= 3) console.warn(`  ⚠ glb failed ${p.id}-${s}-${size.id}: ${String(e.message || e).split("\n")[0]}`);
          }
        }
        const usdzName = `${p.id}-${s}-${size.id}-${VERSION}.usdz`;
        const usdzPath = join(OUT_DIR, usdzName);
        let usdzUrl = null;
        let status = "glb-shell";

        if (!NO_USDZ && usdToolsPresent) {
          try {
            if (!usdzTex) {
              usdzTex = join(tmp, `${p.id}-${s}.jpg`);
              makeUsdzTexture(srcJpg, usdzTex);
            }
            const texName = `${p.id}-${s}.jpg`;
            const texInTmp = join(tmp, texName);
            if (texInTmp !== usdzTex) writeFileSync(texInTmp, readFileSync(usdzTex));
            const usda = buildUsda(widthM, heightM, CANVAS_DEPTH_M, texName);
            const usdaPath = join(tmp, `${p.id}-${s}-${size.id}.usda`);
            writeFileSync(usdaPath, usda);
            // Package (must run in tmp so the relative texture path resolves).
            execFileSync(USDZIP, ["--arkitAsset", usdaPath, usdzPath], { cwd: tmp, stdio: "ignore" });
            // Validate.
            execFileSync(USDCHECKER, ["--arkit", usdzPath], { stdio: "ignore" });
            const bytes = readFileSync(usdzPath).length;
            usdzUrl = `/models/wall/${usdzName}`;
            status = "glb-shell+usdz";
            usdzOk++;
            if (bytes > USDZ_WARN_BYTES) console.warn(`  ⚠ ${usdzName} ${kb(bytes)} large`);
          } catch (e) {
            usdzFail++;
            if (existsSync(usdzPath)) rmSync(usdzPath);
            if (usdzFail <= 3) console.warn(`  ⚠ usdz failed ${p.id}-${s}-${size.id}: ${String(e.message || e).split("\n")[0]}`);
          }
        }

        // FRAMED models — every website frame style, for EVERY colourway (not
        // just the original), so a chosen frame always opens a REAL framed model
        // at true size (Android GLB + iOS USDZ), never a silent frameless swap.
        if (!NO_FRAMES) {
          const texName = `${p.id}-${s}.jpg`;
          for (const fr of FRAMES) {
            // Framed GLB — Android Scene Viewer / WebXR.
            if (glbTexBuf) {
              const fgName = `${p.id}-${s}-${size.id}-${fr.id}-${GLB_VERSION}.glb`;
              const fgPath = join(OUT_DIR, fgName);
              try {
                const buf = buildFramedGlb(widthM, heightM, FRAME_WIDTH_M, fr.linear, { buf: glbTexBuf, mime: "image/jpeg" });
                const gErr = validateGlb(buf);
                if (gErr.length) throw new Error(gErr.join("; "));
                writeFileSync(fgPath, buf);
                framedGlbKeys.push(`${p.id}__${s}__${size.id}__${fr.id}`);
                framedGlbOk++;
              } catch (e) {
                framedGlbFail++;
                if (existsSync(fgPath)) rmSync(fgPath);
                if (framedGlbFail <= 3) console.warn(`  ⚠ framed glb failed ${p.id}-${s}-${size.id}-${fr.id}: ${String(e.message || e).split("\n")[0]}`);
              }
            }
            // Framed USDZ — iOS Quick Look.
            if (!NO_USDZ && usdToolsPresent && usdzTex) {
              const fName = `${p.id}-${s}-${size.id}-${fr.id}-${VERSION}.usdz`;
              const fPath = join(OUT_DIR, fName);
              try {
                const usda = buildFramedUsda(widthM, heightM, FRAME_WIDTH_M, fr.linear, texName);
                const usdaPath = join(tmp, `${p.id}-${s}-${size.id}-${fr.id}.usda`);
                writeFileSync(usdaPath, usda);
                execFileSync(USDZIP, ["--arkitAsset", usdaPath, fPath], { cwd: tmp, stdio: "ignore" });
                framedKeys.push(`${p.id}__${s}__${size.id}__${fr.id}`);
                framedOk++;
              } catch {
                framedFail++;
                if (existsSync(fPath)) rmSync(fPath);
              }
            }
          }
        }

        records.push({
          paintingId: p.id,
          name: p.title,
          colourway: c.name,
          imageSlug: s,
          size: size.id,
          widthCm: size.cm,
          heightCm: Math.round(size.cm * aspect * 10) / 10,
          aspect,
          depthM: CANVAS_DEPTH_M,
          artworkSrc: c.image,
          glbUrl: comboGlbUrl ?? `/models/wall/${SHELL_GLB}`,
          usdzUrl,
          status,
          version: VERSION,
        });
      }
    }
  }

  // 3) Reports.
  if (missing.length) {
    console.warn(`\n⚠ ${missing.length} MISSING source image(s):`);
    missing.forEach((m) => console.warn(`   ${m}`));
  }
  if (nonSquare.length) {
    console.warn(`\n⚠ ${nonSquare.length} NON-SQUARE source(s) — skipped (supply a 1:1 master to enable):`);
    nonSquare.forEach((m) => console.warn(`   ${m}`));
  }

  // 4) Manifest (TS + JSON).
  const usdzKeys = records.filter((r) => r.usdzUrl).map((r) => `${r.paintingId}__${r.imageSlug}__${r.size}`);
  const glbKeysUnique = [...new Set(glbKeys)].sort();
  const framedGlbKeysUnique = [...new Set(framedGlbKeys)].sort();
  // Per-painting aspect (height ÷ width) for the non-square masters, so the UI can
  // label e.g. ophiuchus "42 × 34 cm" instead of the nominal square. Square omitted.
  const paintingAspects = {};
  for (const r of records) if (r.aspect !== 1 && !(r.paintingId in paintingAspects)) paintingAspects[r.paintingId] = r.aspect;
  // A painting is AR-covered only if at least one combo has a real textured GLB.
  const paintingsWithModels = [...new Set(glbKeys.map((k) => k.split("__")[0]))];
  const ts = `// AUTO-GENERATED by scripts/build-wall-models.mjs — DO NOT hand-edit.
// The frameless wall-model manifest for the "See on Your Wall" AR feature.
// GLB shell is shared (runtime texture-swap + scale); USDZ is per size.
import type { ArtworkSizeId } from "./artworkSizes";

export const WALL_MODEL_VERSION = "${VERSION}";
export const WALL_GLB_VERSION = "${GLB_VERSION}";

/** Painting id → true aspect (height ÷ width). Only non-square masters are listed;
 *  square paintings default to 1. Used to label a landscape print's real cm. */
export const WALL_ASPECT: Readonly<Record<string, number>> = ${JSON.stringify(paintingAspects)};

/** True aspect (height ÷ width) of a painting's wall model — 1 for square. */
export const wallAspect = (paintingId: string): number => WALL_ASPECT[paintingId] ?? 1;

/** Real printed dimensions "W × H cm" for a (painting, square-nominal cm), aspect-aware. */
export const wallDimsLabel = (paintingId: string, cm: number): string => {
  const a = wallAspect(paintingId);
  return a === 1 ? \`\${cm} × \${cm} cm\` : \`\${cm} × \${Math.round(cm * a)} cm\`;
};
/** Legacy neutral shell — fallback only; real coverage is per-combo (wallGlb). */
export const WALL_SHELL_GLB = "/models/wall/${SHELL_GLB}";

/** Slug a colourway image path → its wall-model asset stem. */
export const wallSlug = (image: string): string =>
  image.replace("/img/paintings/", "").replace(/\\.(jpe?g|png|webp)$/i, "").toLowerCase();

/** Set of generated USDZ keys: \`<paintingId>__<imageSlug>__<sizeId>\`. */
const WALL_USDZ_KEYS: ReadonlySet<string> = new Set(${JSON.stringify(usdzKeys.sort(), null, 0)});

/** Painting ids that have at least the shared GLB shell available (all do). */
const WALL_PAINTINGS: ReadonlySet<string> = new Set(${JSON.stringify(paintingsWithModels.sort(), null, 0)});

/** iOS Quick Look USDZ path for a (painting, colourway image, size), or null. */
export const wallUsdz = (
  paintingId: string,
  image: string,
  sizeId: ArtworkSizeId,
): string | null => {
  const key = \`\${paintingId}__\${wallSlug(image)}__\${sizeId}\`;
  return WALL_USDZ_KEYS.has(key)
    ? \`/models/wall/\${paintingId}-\${wallSlug(image)}-\${sizeId}-${VERSION}.usdz\`
    : null;
};

/** Generated per-(colourway × size) TEXTURED GLB keys: \`<paintingId>__<imageSlug>__<sizeId>\`. */
const WALL_GLB_KEYS: ReadonlySet<string> = new Set(${JSON.stringify(glbKeysUnique, null, 0)});

/** Android Scene Viewer / WebXR GLB for a (painting, colourway image, size), or null.
 *  This is the file handed to Scene Viewer, so it carries the real artwork + true size. */
export const wallGlb = (
  paintingId: string,
  image: string,
  sizeId: ArtworkSizeId,
): string | null => {
  const key = \`\${paintingId}__\${wallSlug(image)}__\${sizeId}\`;
  return WALL_GLB_KEYS.has(key)
    ? \`/models/wall/\${paintingId}-\${wallSlug(image)}-\${sizeId}-${GLB_VERSION}.glb\`
    : null;
};

/** Whether a (painting, colourway, size) has a REAL textured wall model (GLB + USDZ). */
export const hasWallModelFor = (
  paintingId: string,
  image: string,
  sizeId: ArtworkSizeId,
): boolean => WALL_GLB_KEYS.has(\`\${paintingId}__\${wallSlug(image)}__\${sizeId}\`);

/** Whether a painting has any real textured wall-model coverage. */
export const hasWallModel = (paintingId: string): boolean => WALL_PAINTINGS.has(paintingId);

/** Generated FRAMED USDZ keys: \`<paintingId>__<imageSlug>__<sizeId>__<frameId>\`. */
const WALL_FRAMED_KEYS: ReadonlySet<string> = new Set(${JSON.stringify(framedKeys.sort(), null, 0)});

/** iOS Quick Look USDZ path for a (painting, colourway, size, FRAME), or null.
 *  Falls back to the frameless USDZ via wallUsdz when a frame isn't baked. */
export const wallFramedUsdz = (
  paintingId: string,
  image: string,
  sizeId: ArtworkSizeId,
  frameId: string,
): string | null => {
  if (frameId === "none") return wallUsdz(paintingId, image, sizeId);
  const slug = wallSlug(image);
  const key = \`\${paintingId}__\${slug}__\${sizeId}__\${frameId}\`;
  return WALL_FRAMED_KEYS.has(key)
    ? \`/models/wall/\${paintingId}-\${slug}-\${sizeId}-\${frameId}-${VERSION}.usdz\`
    : wallUsdz(paintingId, image, sizeId);
};

/** Generated FRAMED GLB keys: \`<paintingId>__<imageSlug>__<sizeId>__<frameId>\`. */
const WALL_FRAMED_GLB_KEYS: ReadonlySet<string> = new Set(${JSON.stringify(framedGlbKeysUnique, null, 0)});

/** Android Scene Viewer / WebXR GLB for a (painting, colourway, size, FRAME), or null.
 *  Falls back to the frameless GLB via wallGlb when a frame isn't baked. */
export const wallFramedGlb = (
  paintingId: string,
  image: string,
  sizeId: ArtworkSizeId,
  frameId: string,
): string | null => {
  if (frameId === "none") return wallGlb(paintingId, image, sizeId);
  const slug = wallSlug(image);
  const key = \`\${paintingId}__\${slug}__\${sizeId}__\${frameId}\`;
  return WALL_FRAMED_GLB_KEYS.has(key)
    ? \`/models/wall/\${paintingId}-\${slug}-\${sizeId}-\${frameId}-${GLB_VERSION}.glb\`
    : wallGlb(paintingId, image, sizeId);
};
`;
  writeFileSync(MANIFEST_TS, ts);
  writeFileSync(
    MANIFEST_JSON,
    JSON.stringify({ version: VERSION, generatedAt: new Date().toISOString(), shellGlb: `/models/wall/${SHELL_GLB}`, records }, null, 2),
  );

  // 5) Cleanup tmp.
  rmSync(tmp, { recursive: true, force: true });

  console.log(`\n✓ manifest → src/lib/wallModels.ts  (+ public/models/wall/manifest.json)`);
  console.log(`  records: ${records.length}   glb ok: ${glbOk}/${glbFail}f   usdz ok: ${usdzOk}/${usdzFail}f   framed glb: ${framedGlbOk}/${framedGlbFail}f   framed usdz: ${framedOk}/${framedFail}f   usd-tools: ${usdToolsPresent ? "present" : "ABSENT"}`);
  console.log(`  paintings covered: ${paintingsWithModels.length}   non-square skipped: ${nonSquare.length}   missing: ${missing.length}\n`);
}

main();
