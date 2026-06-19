// =============================================================================
// build-ar-assets.mjs — generate web-AR assets (GLB + USDZ) for every painting
// -----------------------------------------------------------------------------
// RUN LOCALLY ON macOS, then COMMIT the artifacts. The GLB path is pure Node
// (zero npm deps): it hand-authors a glTF 2.0 document with an EMBEDDED JPEG
// image bufferView (no decode needed) and packs it into a binary GLB. The USDZ
// path shells out to Apple/Pixar's USD tooling that ships with macOS:
//   /usr/bin/usdzip  --arkitAsset   (packages a USDA → ARKit-ready USDZ)
//   /usr/bin/usdchecker --arkit      (validates the result)
// On Linux / CI those tools are absent → USDZ is skipped (the script still emits
// every GLB) so the build degrades gracefully. iOS Quick Look just won't be
// offered for paintings missing a USDZ; <model-viewer> auto-hides it.
//
// Each painting becomes a "framed print panel" sized in TRUE real-world METRES
// (metersPerUnit = 1 in USD; glTF is metres by spec) so AR placement shows the
// print at its actual wall size. We generate ONLY the anchor (A2) size per
// painting — 10 GLB + 10 USDZ total — not one per tier.
//
// /public is immutable-cached (1yr) → outputs are versioned `<id>-v1.glb` /
// `<id>-v1.usdz`. To regenerate after a change, bump the V constant to -v2 and
// update the references in src/components/ArtworkAR.tsx.
//
// Orchestrator: add  "build:ar": "node scripts/build-ar-assets.mjs"  to package.json.
// =============================================================================

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUB = join(ROOT, "public");
const IMG_DIR = join(PUB, "img", "paintings");
const OUT_DIR = join(PUB, "ar");

const USDZIP = "/usr/bin/usdzip";
const USDCHECKER = "/usr/bin/usdchecker";
const SIPS = "/usr/bin/sips";

/** Asset version — bump (and update ArtworkAR.tsx) to bust the immutable cache.
 *  v2: USDZ + GLB now anchor to a VERTICAL plane (wall placement, not floor),
 *  and Ophiuchus is square A2 like every other print (the catalogue sells square
 *  A-sizes for all paintings). */
const V = "v2";

// -----------------------------------------------------------------------------
// PAINTING TABLE
// -----------------------------------------------------------------------------
// Mirrors src/data/paintings.ts: each id, its ORIGINAL colourway JPG (the
// `colourways.find(c => c.isOriginal)?.image` value), and the anchor-tier
// real-world size in METRES. Default = A2 (getAnchorTier → "A2 (42 × 42 cm)" →
// 0.42 × 0.42 m). Per-painting overrides where the print is non-square.
//
// Kept as an explicit table (not imported) because this is a Node build script
// and src/data/paintings.ts is TS with site-only imports — duplicating the 10
// rows here is simpler and safer than wiring a TS loader into the build.
// -----------------------------------------------------------------------------

const A2 = 0.42; // metres — A2 (42 × 42 cm), the Collector anchor tier

/**
 * @typedef {Object} ArPainting
 * @property {string} id              painting id (matches PAINTINGS + /ar/<id>)
 * @property {string} jpg             ORIGINAL colourway jpg filename under /public/img/paintings
 * @property {number} widthM          real-world print width in metres
 * @property {number} heightM         real-world print height in metres
 * @property {string} [cropFrom]      optional: source jpg to centre-crop a portrait from
 * @property {[number,number]} [cropPx] optional: [w,h] px of the centre crop
 */

/** @type {ArPainting[]} */
const PAINTINGS = [
  { id: "wild-rose", jpg: "wild-rose-sussex-pink.jpg", widthM: A2, heightM: A2 },
  { id: "english-bluebells", jpg: "english-bluebells-v3.jpg", widthM: A2, heightM: A2 },
  { id: "orchis-7", jpg: "orchis7-rubedo-red.jpg", widthM: A2, heightM: A2 },
  { id: "flower-of-life", jpg: "fol-kaleidoscope.jpg", widthM: A2, heightM: A2 },
  { id: "slipper-orchids", jpg: "orchids30-nebula-purple.jpg", widthM: A2, heightM: A2 },
  { id: "peacock-minerva", jpg: "peacock-persian-indigo.jpg", widthM: A2, heightM: A2 },
  {
    // Ophiuchus's source JPG is 2000×1622 LANDSCAPE, but the shop sells a SQUARE
    // A-size print for EVERY painting (PRINT_TIERS are square for all), so its
    // AR/print is shown SQUARE like the rest. Centre-crop a square (1622×1622)
    // first so full-frame UV (0..1) maps without distortion.
    id: "ophiuchus",
    jpg: "ophiuchus-ar.jpg",
    widthM: A2,
    heightM: A2,
    cropFrom: "ophiuchus-original.jpg",
    cropPx: [1622, 1622],
  },
  { id: "tridecagon-moon-star", jpg: "tridecagon-sage-green.jpg", widthM: A2, heightM: A2 },
  { id: "lulin", jpg: "lulin-original.jpg", widthM: A2, heightM: A2 },
  { id: "enneagon-swans", jpg: "enneagon-cygnus-gold.jpg", widthM: A2, heightM: A2 },
];

// -----------------------------------------------------------------------------
// Geometry constants (all metres)
// -----------------------------------------------------------------------------
const FRAME_BORDER = 0.025; // dark frame ring width on every edge
const DEPTH = 0.03; // how far the panel stands off the wall (frame + box)

// Material factors
const FRAME_BASE_COLOR = [0.06, 0.05, 0.045, 1.0];
const FRAME_METALLIC = 0.0;
const FRAME_ROUGHNESS = 0.7;
const ART_METALLIC = 0.0;
const ART_ROUGHNESS = 0.85;

// -----------------------------------------------------------------------------
// Small binary helpers (zero-dep GLB packer)
// -----------------------------------------------------------------------------

/** Pad a Buffer up to a 4-byte boundary with `padByte` (0x00 for BIN, 0x20 for JSON). */
function pad4(buf, padByte) {
  const rem = buf.length % 4;
  if (rem === 0) return buf;
  const pad = Buffer.alloc(4 - rem, padByte);
  return Buffer.concat([buf, pad]);
}

/** Build a float32 little-endian buffer from a flat number array. */
function f32(arr) {
  const b = Buffer.alloc(arr.length * 4);
  for (let i = 0; i < arr.length; i++) b.writeFloatLE(arr[i], i * 4);
  return b;
}

/** Build a uint16 little-endian buffer from a flat number array. */
function u16(arr) {
  const b = Buffer.alloc(arr.length * 2);
  for (let i = 0; i < arr.length; i++) b.writeUInt16LE(arr[i], i * 2);
  return b;
}

function min3(positions) {
  const m = [Infinity, Infinity, Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    m[0] = Math.min(m[0], positions[i]);
    m[1] = Math.min(m[1], positions[i + 1]);
    m[2] = Math.min(m[2], positions[i + 2]);
  }
  return m;
}
function max3(positions) {
  const m = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    m[0] = Math.max(m[0], positions[i]);
    m[1] = Math.max(m[1], positions[i + 1]);
    m[2] = Math.max(m[2], positions[i + 2]);
  }
  return m;
}

// -----------------------------------------------------------------------------
// Geometry builder — a framed print panel centred at origin, facing +Z.
// -----------------------------------------------------------------------------
// Returns interleaved-free parallel arrays for two PRIMITIVES sharing one
// vertex/normal/uv buffer is overkill; instead we build two independent meshes:
//   - artwork quad (front face, inset by the frame border) → textured
//   - frame solid (ring + 4 side walls + back) → flat dark material
// Each gets its own POSITION/NORMAL/TEXCOORD_0 + indices accessor set.
// -----------------------------------------------------------------------------

function buildArtworkQuad(w, h) {
  // Inset the artwork by the frame border on each edge; sits slightly proud (+z).
  const hw = w / 2 - FRAME_BORDER;
  const hh = h / 2 - FRAME_BORDER;
  const z = DEPTH; // front plane
  // 4 verts, CCW when viewed from +Z. UV: full-frame 0..1, v flipped so the
  // image is upright (glTF UV origin is top-left).
  const positions = [
    -hw, -hh, z, // 0 bottom-left
    hw, -hh, z, // 1 bottom-right
    hw, hh, z, // 2 top-right
    -hw, hh, z, // 3 top-left
  ];
  const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
  const uvs = [
    0, 1, // bottom-left
    1, 1, // bottom-right
    1, 0, // top-right
    0, 0, // top-left
  ];
  const indices = [0, 1, 2, 0, 2, 3];
  return { positions, normals, uvs, indices };
}

/**
 * Frame solid: a picture-frame ring around the artwork on the front plane, the
 * four side walls (sense of depth), and a back panel. All one dark material.
 * Built as a set of quads → triangle list.
 */
function buildFrame(w, h) {
  const ox = w / 2;
  const oy = h / 2;
  const ix = w / 2 - FRAME_BORDER;
  const iy = h / 2 - FRAME_BORDER;
  const zf = DEPTH; // front plane (same as artwork)
  const zb = 0; // back plane (against the wall)

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // helper: push a quad (4 verts CCW) with a single face normal
  const quad = (a, b, c, d, n) => {
    const base = positions.length / 3;
    for (const v of [a, b, c, d]) {
      positions.push(v[0], v[1], v[2]);
      normals.push(n[0], n[1], n[2]);
      uvs.push(0, 0); // frame is untextured; dummy UVs keep accessors aligned
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  // --- Front ring (4 trapezoids around the inset opening), normal +Z ---
  const nZ = [0, 0, 1];
  // top strip
  quad([-ox, iy, zf], [ox, iy, zf], [ox, oy, zf], [-ox, oy, zf], nZ);
  // bottom strip
  quad([-ox, -oy, zf], [ox, -oy, zf], [ox, -iy, zf], [-ox, -iy, zf], nZ);
  // left strip
  quad([-ox, -iy, zf], [-ix, -iy, zf], [-ix, iy, zf], [-ox, iy, zf], nZ);
  // right strip
  quad([ix, -iy, zf], [ox, -iy, zf], [ox, iy, zf], [ix, iy, zf], nZ);

  // --- Side walls (outer edges from back plane to front plane) ---
  // right wall, normal +X
  quad([ox, -oy, zb], [ox, oy, zb], [ox, oy, zf], [ox, -oy, zf], [1, 0, 0]);
  // left wall, normal -X
  quad([-ox, oy, zb], [-ox, -oy, zb], [-ox, -oy, zf], [-ox, oy, zf], [-1, 0, 0]);
  // top wall, normal +Y
  quad([-ox, oy, zb], [ox, oy, zb], [ox, oy, zf], [-ox, oy, zf], [0, 1, 0]);
  // bottom wall, normal -Y
  quad([ox, -oy, zb], [-ox, -oy, zb], [-ox, -oy, zf], [ox, -oy, zf], [0, -1, 0]);

  // --- Back panel, normal -Z (faces the wall) ---
  quad([-ox, -oy, zb], [-ox, oy, zb], [ox, oy, zb], [ox, -oy, zb], [0, 0, -1]);

  return { positions, normals, uvs, indices };
}

// -----------------------------------------------------------------------------
// glTF → GLB packer (hand-authored, zero deps)
// -----------------------------------------------------------------------------

function buildGlb(jpegBuffer, w, h) {
  const art = buildArtworkQuad(w, h);
  const frame = buildFrame(w, h);

  // Assemble the single BIN blob: for each accessor we append its bytes 4-byte
  // aligned, recording bufferView offsets/lengths. Order:
  //  0 art positions (f32) | 1 art normals (f32) | 2 art uv (f32) | 3 art idx (u16)
  //  4 frame positions     | 5 frame normals     | 6 frame uv     | 7 frame idx
  //  8 image (jpeg)
  const chunks = [];
  const bufferViews = [];
  let offset = 0;

  const addView = (buf, target) => {
    const aligned = pad4(buf, 0x00);
    const view = { buffer: 0, byteOffset: offset, byteLength: buf.length };
    if (target !== undefined) view.target = target;
    bufferViews.push(view);
    chunks.push(aligned);
    offset += aligned.length;
    return bufferViews.length - 1;
  };

  const ARRAY_BUFFER = 34962;
  const ELEMENT_ARRAY_BUFFER = 34963;

  // Artwork
  const aPos = addView(f32(art.positions), ARRAY_BUFFER);
  const aNrm = addView(f32(art.normals), ARRAY_BUFFER);
  const aUv = addView(f32(art.uvs), ARRAY_BUFFER);
  const aIdx = addView(u16(art.indices), ELEMENT_ARRAY_BUFFER);
  // Frame
  const fPos = addView(f32(frame.positions), ARRAY_BUFFER);
  const fNrm = addView(f32(frame.normals), ARRAY_BUFFER);
  const fUv = addView(f32(frame.uvs), ARRAY_BUFFER);
  const fIdx = addView(u16(frame.indices), ELEMENT_ARRAY_BUFFER);
  // Image (no target)
  const imgView = addView(jpegBuffer);

  const bin = Buffer.concat(chunks);

  const accessors = [
    // 0 art POSITION
    { bufferView: aPos, componentType: 5126, count: art.positions.length / 3, type: "VEC3", min: min3(art.positions), max: max3(art.positions) },
    // 1 art NORMAL
    { bufferView: aNrm, componentType: 5126, count: art.normals.length / 3, type: "VEC3" },
    // 2 art TEXCOORD_0
    { bufferView: aUv, componentType: 5126, count: art.uvs.length / 2, type: "VEC2" },
    // 3 art indices
    { bufferView: aIdx, componentType: 5123, count: art.indices.length, type: "SCALAR" },
    // 4 frame POSITION
    { bufferView: fPos, componentType: 5126, count: frame.positions.length / 3, type: "VEC3", min: min3(frame.positions), max: max3(frame.positions) },
    // 5 frame NORMAL
    { bufferView: fNrm, componentType: 5126, count: frame.normals.length / 3, type: "VEC3" },
    // 6 frame TEXCOORD_0
    { bufferView: fUv, componentType: 5126, count: frame.uvs.length / 2, type: "VEC2" },
    // 7 frame indices
    { bufferView: fIdx, componentType: 5123, count: frame.indices.length, type: "SCALAR" },
  ];

  const gltf = {
    asset: { version: "2.0", generator: "uncle-tribute build-ar-assets.mjs" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: "FramedPrint", mesh: 0 }],
    meshes: [
      {
        name: "FramedPrint",
        primitives: [
          // artwork (textured)
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 3,
            material: 0,
            mode: 4,
          },
          // frame (flat dark)
          {
            attributes: { POSITION: 4, NORMAL: 5, TEXCOORD_0: 6 },
            indices: 7,
            material: 1,
            mode: 4,
          },
        ],
      },
    ],
    materials: [
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
          baseColorFactor: FRAME_BASE_COLOR,
          metallicFactor: FRAME_METALLIC,
          roughnessFactor: FRAME_ROUGHNESS,
        },
      },
    ],
    textures: [{ source: 0, sampler: 0 }],
    images: [{ bufferView: imgView, mimeType: "image/jpeg" }],
    // CLAMP_TO_EDGE (33071) on both axes — full-frame UV, no tiling/seams.
    samplers: [{ wrapS: 33071, wrapT: 33071, magFilter: 9729, minFilter: 9987 }],
    accessors,
    bufferViews,
    buffers: [{ byteLength: bin.length }],
  };

  // --- pack GLB ---
  const jsonBuf = pad4(Buffer.from(JSON.stringify(gltf), "utf8"), 0x20);
  const binBuf = pad4(bin, 0x00);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // magic "glTF"
  header.writeUInt32LE(2, 4); // version 2
  const totalLength = 12 + 8 + jsonBuf.length + 8 + binBuf.length;
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuf.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binBuf.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // "BIN\0"

  return Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuf]);
}

// -----------------------------------------------------------------------------
// GLB structural validation — fail loudly BEFORE writing a bad asset.
// -----------------------------------------------------------------------------
function validateGlb(glb, jpegBuffer) {
  const errors = [];
  if (glb.length < 12) errors.push("GLB shorter than 12-byte header");
  if (glb.readUInt32LE(0) !== 0x46546c67) errors.push("bad magic (expected 0x46546C67)");
  if (glb.readUInt32LE(4) !== 2) errors.push("bad version (expected 2)");
  const declaredTotal = glb.readUInt32LE(8);
  if (declaredTotal !== glb.length) {
    errors.push(`header length ${declaredTotal} !== actual ${glb.length}`);
  }

  // JSON chunk
  let p = 12;
  const jsonLen = glb.readUInt32LE(p);
  const jsonType = glb.readUInt32LE(p + 4);
  if (jsonType !== 0x4e4f534a) errors.push("first chunk is not JSON (0x4E4F534A)");
  if ((jsonLen & 3) !== 0) errors.push("JSON chunk length not 4-byte aligned");
  p += 8;
  let gltf;
  try {
    gltf = JSON.parse(glb.subarray(p, p + jsonLen).toString("utf8"));
  } catch (e) {
    errors.push(`JSON chunk does not parse: ${e.message}`);
  }
  p += jsonLen;

  // BIN chunk
  const binLen = glb.readUInt32LE(p);
  const binType = glb.readUInt32LE(p + 4);
  if (binType !== 0x004e4942) errors.push("second chunk is not BIN (0x004E4942)");
  if ((binLen & 3) !== 0) errors.push("BIN chunk length not 4-byte aligned");
  p += 8;
  const binStart = p;
  const binEnd = p + binLen;
  if (binEnd !== glb.length) errors.push(`BIN chunk end ${binEnd} !== file end ${glb.length}`);

  if (gltf) {
    // bufferViews within buffer
    const bufLen = gltf.buffers?.[0]?.byteLength ?? 0;
    if (bufLen !== binLen) {
      // bin includes alignment padding; the declared buffer length may be the
      // unpadded length. Allow the declared length to be ≤ binLen.
      if (bufLen > binLen) errors.push(`buffer.byteLength ${bufLen} > BIN ${binLen}`);
    }
    for (let i = 0; i < (gltf.bufferViews?.length ?? 0); i++) {
      const bv = gltf.bufferViews[i];
      if (bv.byteOffset + bv.byteLength > binLen) {
        errors.push(`bufferView[${i}] (${bv.byteOffset}+${bv.byteLength}) exceeds BIN ${binLen}`);
      }
    }
    // image bufferView must start with the JPEG SOI marker 0xFFD8FF
    const img = gltf.images?.[0];
    if (!img || img.bufferView === undefined) {
      errors.push("no image[0].bufferView");
    } else {
      const bv = gltf.bufferViews[img.bufferView];
      const start = binStart + bv.byteOffset;
      if (glb[start] !== 0xff || glb[start + 1] !== 0xd8 || glb[start + 2] !== 0xff) {
        errors.push(
          `image bufferView does not start with JPEG SOI 0xFFD8FF (got ${glb
            .subarray(start, start + 3)
            .toString("hex")})`,
        );
      }
      if (bv.byteLength !== jpegBuffer.length) {
        errors.push(`image bufferView length ${bv.byteLength} !== jpeg ${jpegBuffer.length}`);
      }
    }
  }

  if (errors.length) {
    throw new Error(`GLB validation FAILED:\n  - ${errors.join("\n  - ")}`);
  }
}

// -----------------------------------------------------------------------------
// USDA author → usdzip --arkitAsset → usdchecker --arkit
// -----------------------------------------------------------------------------

/**
 * Author a minimal ARKit-compatible USDA referencing `jpegName` (which must sit
 * next to the .usda so usdzip --arkitAsset packages it), sized in real metres.
 * UsdPreviewSurface + UsdUVTexture + a `st` primvar reader, MaterialBindingAPI
 * applied. The mesh is a single quad in the XY plane facing +Z (Y-up; ARKit
 * places it correctly). Full-frame st (0..1), v-flipped to match glTF so the
 * image is upright in both pipelines.
 */
function buildUsda(jpegName, w, h) {
  const hw = (w / 2).toFixed(6);
  const hh = (h / 2).toFixed(6);
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

    def Mesh "Artwork" (
        prepend apiSchemas = ["MaterialBindingAPI"]
    )
    {
        float3[] extent = [(-${hw}, -${hh}, 0), (${hw}, ${hh}, 0)]
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 1, 2, 3]
        point3f[] points = [(-${hw}, -${hh}, 0), (${hw}, -${hh}, 0), (${hw}, ${hh}, 0), (-${hw}, ${hh}, 0)]
        normal3f[] primvars:normals = [(0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1)] (
            interpolation = "vertex"
        )
        texCoord2f[] primvars:st = [(0, 0), (1, 0), (1, 1), (0, 1)] (
            interpolation = "vertex"
        )
        rel material:binding = </FramedPrint/Materials/ArtworkMat>
        uniform token subdivisionScheme = "none"
    }

    def Scope "Materials"
    {
        def Material "ArtworkMat"
        {
            token outputs:surface.connect = </FramedPrint/Materials/ArtworkMat/Surface.outputs:surface>

            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor.connect = </FramedPrint/Materials/ArtworkMat/Texture.outputs:rgb>
                float inputs:metallic = ${ART_METALLIC}
                float inputs:roughness = ${ART_ROUGHNESS}
                token outputs:surface
            }

            def Shader "Texture"
            {
                uniform token info:id = "UsdUVTexture"
                asset inputs:file = @${jpegName}@
                float2 inputs:st.connect = </FramedPrint/Materials/ArtworkMat/stReader.outputs:result>
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
        }
    }
}
`;
}

// -----------------------------------------------------------------------------
// Driver
// -----------------------------------------------------------------------------

function ensureOphiuchusCrop() {
  const p = PAINTINGS.find((x) => x.cropFrom);
  if (!p) return;
  const src = join(IMG_DIR, p.cropFrom);
  const out = join(IMG_DIR, p.jpg);
  if (!existsSync(src)) throw new Error(`ophiuchus source missing: ${src}`);
  if (existsSync(out)) {
    log(`  ophiuchus crop already present (${p.jpg}) — reusing`);
    return;
  }
  const [cw, ch] = p.cropPx;
  // sips -c <height> <width> centre-crops to HEIGHT × WIDTH.
  log(`  cropping ${p.cropFrom} → ${p.jpg} (${cw}×${ch} centred crop)`);
  execFileSync(SIPS, ["-c", String(ch), String(cw), src, "--out", out], { stdio: "pipe" });
}

function log(...args) {
  console.log(...args);
}

function kb(bytes) {
  return Math.round(bytes / 1024);
}

function main() {
  log("=".repeat(70));
  log("build-ar-assets — framed-print AR panels (GLB + USDZ), true metres");
  log("=".repeat(70));

  mkdirSync(OUT_DIR, { recursive: true });

  const hasUsd = existsSync(USDZIP) && existsSync(USDCHECKER);
  if (!hasUsd) {
    log("⚠️  USD tooling not found at /usr/bin/usdzip + usdchecker.");
    log("    → USDZ generation SKIPPED (GLB still emitted). Run on macOS to add USDZ.");
  }

  // Pre-step: centre-crop the ophiuchus portrait source if needed.
  ensureOphiuchusCrop();

  const results = [];
  const tmpRoot = join(tmpdir(), `ar-usd-${process.pid}`);

  for (const p of PAINTINGS) {
    log(`\n● ${p.id}  (${p.widthM}×${p.heightM} m)`);
    const jpgPath = join(IMG_DIR, p.jpg);
    if (!existsSync(jpgPath)) throw new Error(`source jpg missing: ${jpgPath}`);
    const jpeg = readFileSync(jpgPath);
    if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8 || jpeg[2] !== 0xff) {
      throw new Error(`${p.jpg} is not a JPEG (no 0xFFD8FF SOI)`);
    }

    // --- GLB ---
    const glb = buildGlb(jpeg, p.widthM, p.heightM);
    validateGlb(glb, jpeg);
    const glbOut = join(OUT_DIR, `${p.id}-${V}.glb`);
    writeFileSync(glbOut, glb);
    log(`  ✓ GLB  ${kb(glb.length)} KB  → public/ar/${p.id}-${V}.glb  (validated)`);

    // --- USDZ ---
    let usdzKb = null;
    let usdcheckerPass = null;
    if (hasUsd) {
      const work = join(tmpRoot, p.id);
      mkdirSync(work, { recursive: true });
      // usdzip --arkitAsset requires the texture next to the usda.
      const jpegName = p.jpg;
      writeFileSync(join(work, jpegName), jpeg);
      const usdaPath = join(work, `${p.id}.usda`);
      writeFileSync(usdaPath, buildUsda(jpegName, p.widthM, p.heightM));
      const usdzOut = join(OUT_DIR, `${p.id}-${V}.usdz`);
      if (existsSync(usdzOut)) rmSync(usdzOut);

      try {
        execFileSync(USDZIP, ["--arkitAsset", usdaPath, usdzOut], {
          stdio: "pipe",
          cwd: work,
        });
      } catch (e) {
        const out = (e.stdout?.toString() || "") + (e.stderr?.toString() || "");
        throw new Error(`usdzip FAILED for ${p.id}:\n${out || e.message}`);
      }
      const usdzBuf = readFileSync(usdzOut);
      usdzKb = kb(usdzBuf.length);

      // Validate with usdchecker --arkit. Fail loudly on any error.
      try {
        const out = execFileSync(USDCHECKER, ["--arkit", usdzOut], { stdio: "pipe" });
        // usdchecker prints "Success!" and exits 0 when clean.
        usdcheckerPass = /Success/i.test(out.toString()) || out.toString().trim() === "";
      } catch (e) {
        const out = (e.stdout?.toString() || "") + (e.stderr?.toString() || "");
        throw new Error(`usdchecker --arkit FAILED for ${p.id}:\n${out || e.message}`);
      }
      log(`  ✓ USDZ ${usdzKb} KB  → public/ar/${p.id}-${V}.usdz  (usdchecker --arkit: PASS)`);
    }

    results.push({ id: p.id, glbKb: kb(glb.length), usdzKb, usdcheckerPass });
  }

  // Cleanup temp USD working dirs.
  if (existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });

  // --- Summary table ---
  log("\n" + "=".repeat(70));
  log("SUMMARY");
  log("=".repeat(70));
  const pad = (s, n) => String(s).padEnd(n);
  const padl = (s, n) => String(s).padStart(n);
  log(`${pad("id", 22)} ${padl("GLB KB", 8)} ${padl("USDZ KB", 9)}  usdchecker`);
  log("-".repeat(70));
  for (const r of results) {
    log(
      `${pad(r.id, 22)} ${padl(r.glbKb, 8)} ${padl(r.usdzKb ?? "—", 9)}  ${
        r.usdcheckerPass === null ? "(skipped)" : r.usdcheckerPass ? "PASS" : "FAIL"
      }`,
    );
  }
  log("-".repeat(70));
  log(`${results.length} paintings · GLB + ${hasUsd ? "USDZ" : "no USDZ (USD tools absent)"}`);
  log("Outputs in public/ar/. /public is immutable-cached → bump V to regenerate.");
}

main();
