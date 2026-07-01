#!/usr/bin/env node
// =============================================================================
// test-wall.mjs — unit tests for the "See on Your Wall" logic.
// -----------------------------------------------------------------------------
//   node scripts/test-wall.mjs            (also: npm run test:wall)
//
// Imports the REAL source modules (Node's native TS support) so there is no
// mirrored-constant drift. Exits non-zero on any failed assertion.
// Covers: size config + exact A3/A2/A1/A0 dimensions, tier→size mapping,
// square-ratio preservation, calibration maths, manifest lookup + product-to-
// model mapping, and the missing-model fallback.
// =============================================================================

import assert from "node:assert/strict";

import {
  ARTWORK_SIZES,
  ANCHOR_ARTWORK_SIZE,
  CANVAS_DEPTH_M,
  WALL_SHELL_BASE_METRES,
  getArtworkSize,
  artworkSizeForTierId,
  isArtworkSizeId,
  cmLabel,
  shellScaleFor,
} from "../src/lib/artworkSizes.ts";
import {
  pixelDistance,
  pxPerCmFromReference,
  artworkEdgePx,
  clampScalar,
  boundOverlay,
} from "../src/lib/calibration.ts";
import { wallUsdz, hasWallModel, wallSlug, WALL_SHELL_GLB } from "../src/lib/wallModels.ts";

let passed = 0;
const it = (name, fn) => {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${e.message}`);
    process.exitCode = 1;
  }
};

// ---- Size configuration — exact physical dimensions -------------------------
const EXPECT = {
  a3: { cm: 29.5, metres: 0.295, tierId: "atelier" },
  a2: { cm: 42.0, metres: 0.42, tierId: "collector" },
  a1: { cm: 59.5, metres: 0.595, tierId: "atelier-grande" },
  a0: { cm: 84.0, metres: 0.84, tierId: "heirloom" },
};
for (const [id, want] of Object.entries(EXPECT)) {
  it(`size ${id} has exact cm/metres/tier`, () => {
    const s = ARTWORK_SIZES.find((x) => x.id === id);
    assert.ok(s, `${id} missing`);
    assert.equal(s.cm, want.cm);
    assert.equal(s.metres, want.metres);
    assert.equal(s.tierId, want.tierId);
    assert.equal(s.cm, s.metres * 100, `${id} cm must equal metres×100`);
  });
}

it("exactly four sizes, all square, anchor is A2", () => {
  assert.equal(ARTWORK_SIZES.length, 4);
  for (const s of ARTWORK_SIZES) assert.ok(Number.isFinite(s.cm) && s.cm > 0);
  assert.equal(ANCHOR_ARTWORK_SIZE.id, "a2");
});

it("canvas depth is the flagged nominal 0.03 m", () => assert.equal(CANVAS_DEPTH_M, 0.03));
it("shell base metres is the A2 anchor", () => assert.equal(WALL_SHELL_BASE_METRES, 0.42));

// ---- Lookups + product-to-model mapping -------------------------------------
it("getArtworkSize resolves + falls back to anchor", () => {
  assert.equal(getArtworkSize("a0").cm, 84);
  assert.equal(getArtworkSize("nope").id, "a2");
  assert.equal(getArtworkSize(undefined).id, "a2");
});
it("artworkSizeForTierId maps tiers → sizes", () => {
  assert.equal(artworkSizeForTierId("collector").id, "a2");
  assert.equal(artworkSizeForTierId("heirloom").id, "a0");
  assert.equal(artworkSizeForTierId("atelier").id, "a3");
  assert.equal(artworkSizeForTierId("atelier-grande").id, "a1");
  assert.equal(artworkSizeForTierId("studio"), null); // one-off tier → no fixed size
  assert.equal(artworkSizeForTierId(undefined), null);
});
it("isArtworkSizeId guards", () => {
  assert.equal(isArtworkSizeId("a1"), true);
  assert.equal(isArtworkSizeId("a9"), false);
  assert.equal(isArtworkSizeId(42), false);
});
it("cmLabel + shellScaleFor", () => {
  assert.equal(cmLabel(getArtworkSize("a2")), "42 × 42 cm");
  assert.equal(shellScaleFor(getArtworkSize("a2")), 1); // base is A2
  assert.equal(shellScaleFor(getArtworkSize("a0")), 2); // 0.84 / 0.42
});

// ---- Calibration maths ------------------------------------------------------
it("pixelDistance is euclidean", () => {
  assert.equal(pixelDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});
it("pxPerCmFromReference: 200px over 40cm = 5 px/cm", () => {
  assert.equal(pxPerCmFromReference({ x: 0, y: 0 }, { x: 200, y: 0 }, 40), 5);
});
it("pxPerCmFromReference: invalid inputs → null (not a bogus scale)", () => {
  assert.equal(pxPerCmFromReference({ x: 0, y: 0 }, { x: 0, y: 0 }, 40), null);
  assert.equal(pxPerCmFromReference({ x: 0, y: 0 }, { x: 200, y: 0 }, 0), null);
  assert.equal(pxPerCmFromReference({ x: 0, y: 0 }, { x: 200, y: 0 }, -5), null);
});
it("artworkEdgePx scales a square by cm", () => {
  assert.equal(artworkEdgePx(42, 5), 210); // A2 at 5px/cm
  assert.equal(artworkEdgePx(84, 5), 420); // A0 at 5px/cm — twice A2, square preserved
});
it("clampScalar + boundOverlay keep the overlay in view", () => {
  assert.equal(clampScalar(150, 0, 100), 100);
  assert.equal(clampScalar(-5, 0, 100), 0);
  const b = boundOverlay({ x: -9999, y: 9999 }, 200, 400, 300, 24);
  assert.ok(b.x >= 24 - 200 && b.x <= 400 - 24);
  assert.ok(b.y >= 24 - 200 && b.y <= 300 - 24);
});

// ---- Manifest lookup + missing-model fallback -------------------------------
it("WALL_SHELL_GLB path is the frameless shell", () => {
  assert.match(WALL_SHELL_GLB, /canvas-frameless-v\d+\.glb$/);
});
it("wallSlug strips the paintings path + extension", () => {
  assert.equal(wallSlug("/img/paintings/wild-rose-sussex-pink.jpg"), "wild-rose-sussex-pink");
});
it("wallUsdz returns a real path for a generated (painting, image, size)", () => {
  const u = wallUsdz("wild-rose", "/img/paintings/wild-rose-sussex-pink.jpg", "a2");
  assert.equal(u, "/models/wall/wild-rose-wild-rose-sussex-pink-a2-v1.usdz");
});
it("wallUsdz returns null for a NON-generated combo (missing-model fallback)", () => {
  // Ophiuchus was skipped (non-square source) → no USDZ → iOS falls back to photo.
  assert.equal(wallUsdz("ophiuchus", "/img/paintings/ophiuchus-original.jpg", "a2"), null);
  // An unknown painting id → null.
  assert.equal(wallUsdz("not-a-painting", "/img/paintings/x.jpg", "a2"), null);
});
it("hasWallModel covers generated paintings, excludes skipped", () => {
  assert.equal(hasWallModel("wild-rose"), true);
  assert.equal(hasWallModel("ophiuchus"), false); // non-square source skipped
});

if (process.exitCode) {
  console.error(`\n✗ wall tests FAILED (${passed} passed).\n`);
} else {
  console.log(`\n✓ wall tests passed (${passed} assertions).\n`);
}
