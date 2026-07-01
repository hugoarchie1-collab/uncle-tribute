// =============================================================================
// calibration.ts — pure, framework-free maths for the photo wall visualiser.
// -----------------------------------------------------------------------------
// The customer marks two points on their room photo and enters the real-world
// distance between them (in cm). From that we derive pixels-per-centimetre for
// THAT photo, which lets us render a square artwork at a correctly-scaled size.
// Kept dependency-free + side-effect-free so it is directly unit-testable.
// =============================================================================

export interface Point {
  x: number;
  y: number;
}

/** Straight-line pixel distance between two points. */
export const pixelDistance = (a: Point, b: Point): number =>
  Math.hypot(b.x - a.x, b.y - a.y);

/**
 * Pixels-per-centimetre for a photo, from a two-point reference measurement.
 * Returns null if the inputs are unusable (zero-length line or non-positive
 * real distance) so callers can keep the preview in "Approximate" mode rather
 * than rendering a nonsense scale.
 */
export const pxPerCmFromReference = (
  a: Point,
  b: Point,
  realCm: number,
): number | null => {
  if (!(realCm > 0)) return null;
  const px = pixelDistance(a, b);
  if (!(px > 0)) return null;
  return px / realCm;
};

/** On-photo pixel edge length for a square artwork of `cm`, given a scale. */
export const artworkEdgePx = (cm: number, pxPerCm: number): number => cm * pxPerCm;

/** Clamp a value into [lo, hi]. */
export const clampScalar = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, n));

/**
 * Keep a square overlay of `edgePx` (already scaled) inside a container,
 * allowing it to sit partly off-edge but never fully escape. Returns a bounded
 * top-left position. `margin` is the minimum number of pixels that must remain
 * visible on each axis.
 */
export const boundOverlay = (
  pos: Point,
  edgePx: number,
  containerW: number,
  containerH: number,
  margin = 24,
): Point => ({
  x: clampScalar(pos.x, margin - edgePx, containerW - margin),
  y: clampScalar(pos.y, margin - edgePx, containerH - margin),
});
