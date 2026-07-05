// =============================================================================
// artworkSizes.ts — THE SINGLE SOURCE OF TRUTH for print physical dimensions.
// -----------------------------------------------------------------------------
// Every part of the "See on Your Wall" system — the 3D model generator, the
// model-viewer AR component, the calibrated photo visualiser, the size labels
// and the fallback maths — reads its real-world dimensions from HERE. Do not
// duplicate these numbers anywhere else.
//
// The prints are SQUARE giclée reproductions. The visible artwork dimensions
// are the numbers a customer pays for and the numbers the AR model is built at.
//
//   A3  29.5 × 29.5 cm   0.295 m
//   A2  42.0 × 42.0 cm   0.420 m   (anchor / recommended)
//   A1  59.5 × 59.5 cm   0.595 m
//   A0  84.0 × 84.0 cm   0.840 m
//
// The `tierId` links each size to the canonical PRINT_TIERS ladder in
// paintings.ts so a customer's selected tier resolves to the right AR size.
// This is now the SINGLE source (the old lib/arAssets.ts framed-shell path was
// deleted 2026-07-04 when the wall models unified onto lib/wallModels.ts).
// =============================================================================

export type ArtworkSizeId = "a3" | "a2" | "a1" | "a0";

export interface ArtworkSize {
  /** Stable id used in asset filenames + manifests. */
  id: ArtworkSizeId;
  /** Human label, e.g. "A2". */
  label: string;
  /** Visible edge length in centimetres (square, so width === height). */
  cm: number;
  /** Visible edge length in metres — the physical unit AR models are built in. */
  metres: number;
  /** The PRINT_TIERS id (paintings.ts) this size corresponds to. */
  tierId: string;
  /** The recommended / default size. */
  anchor?: boolean;
}

export const ARTWORK_SIZES: readonly ArtworkSize[] = [
  { id: "a3", label: "A3", cm: 29.5, metres: 0.295, tierId: "atelier" },
  { id: "a2", label: "A2", cm: 42.0, metres: 0.42, tierId: "collector", anchor: true },
  { id: "a1", label: "A1", cm: 59.5, metres: 0.595, tierId: "atelier-grande" },
  { id: "a0", label: "A0", cm: 84.0, metres: 0.84, tierId: "heirloom" },
] as const;

/**
 * ⚠️ CANVAS DEPTH REQUIRES VERIFICATION.
 * No confirmed physical depth exists in the repository — these are flat, framed
 * PAPER giclée prints (fulfilled + framed by Point 101), not stretched canvases,
 * so there is no authoritative "canvas depth". This nominal value only gives the
 * frameless preview model a slight, believable thickness so it reads as an
 * object on the wall rather than a decal. It does NOT change the exact front
 * artwork dimensions above. Confirm the intended mounted/framed depth with the
 * estate/printer before relying on it for anything dimensional.
 */
export const CANVAS_DEPTH_M = 0.03;

/**
 * The metric size the reusable frameless GLB "shell" is authored at. At runtime
 * the model is uniformly scaled by `size.metres / WALL_SHELL_BASE_METRES` so a
 * single shell serves every size (ar-scale="fixed" then locks it to real size).
 */
export const WALL_SHELL_BASE_METRES = 0.42; // A2 anchor

export const ANCHOR_ARTWORK_SIZE: ArtworkSize =
  ARTWORK_SIZES.find((s) => s.anchor) ?? ARTWORK_SIZES[0];

const SIZE_BY_ID: Record<string, ArtworkSize> = Object.fromEntries(
  ARTWORK_SIZES.map((s) => [s.id, s]),
);
const SIZE_BY_TIER: Record<string, ArtworkSize> = Object.fromEntries(
  ARTWORK_SIZES.map((s) => [s.tierId, s]),
);

export const isArtworkSizeId = (v: unknown): v is ArtworkSizeId =>
  typeof v === "string" && v in SIZE_BY_ID;

/** Look a size up by its id (a3/a2/a1/a0). Falls back to the anchor. */
export const getArtworkSize = (id: string | undefined): ArtworkSize =>
  (id && SIZE_BY_ID[id]) || ANCHOR_ARTWORK_SIZE;

/** Resolve a PRINT_TIERS id to its physical size (null if the tier has none). */
export const artworkSizeForTierId = (tierId: string | undefined): ArtworkSize | null =>
  (tierId && SIZE_BY_TIER[tierId]) || null;

/** "42 × 42 cm" */
export const cmLabel = (size: ArtworkSize): string => `${size.cm} × ${size.cm} cm`;

/** Runtime uniform scale factor to take the base shell to a given size. */
export const shellScaleFor = (size: ArtworkSize): number =>
  size.metres / WALL_SHELL_BASE_METRES;
