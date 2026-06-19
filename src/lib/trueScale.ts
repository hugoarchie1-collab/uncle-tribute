// =============================================================================
// TRUE-SCALE — pure geometry + configs + frame tokens for the "See it in your
// room" visualizer + the framed-artwork render unit.
// -----------------------------------------------------------------------------
// THE SCALE MODEL (read this before touching the maths)
//   Every visual size on screen is derived from a REAL-WORLD centimetre value,
//   so the relative proportions are honest (an A1 print reads ~1.4× an A2, a
//   170cm human towers over an A3). The conversion is a single scalar:
//
//       px = realCm × pxPerCm × displayScale
//
//   • pxPerCm     — how many screen pixels one real centimetre occupies. In
//                   "scale" mode the visualizer PICKS this so the tallest element
//                   fits the stage with margin (it is therefore a relative-scale
//                   honesty guarantee, NOT an absolute one — a 42cm print is not
//                   physically 42cm on glass, but it IS the right size RELATIVE
//                   to the 170cm figure and the ruler beside it). In "upload"
//                   ("My room") mode pxPerCm is RECOVERED from a reference object
//                   the user drags to match a real thing they know the size of
//                   (a bank card, an A4 sheet, a door) via `pxPerCmFromAnchor`.
//   • displayScale — a unitless multiplier the visualizer applies on top of
//                   pxPerCm (e.g. to fit, or to honour device pixel ratio). Kept
//                   separate so the px-per-cm baseline stays a pure measurement.
//
//   `framedSizeCm` grows the artwork's bare dimensions by the frame's moulding +
//   mat borders (both real cm) BEFORE scaling, so a framed A1 occupies more wall
//   than an unframed A1 — exactly as it would in the room.
//
// PALETTE NOTE (important for the design system)
//   The frame finishes below carry WOOD / BLACK tones (oak browns, stained
//   near-blacks, mat cream). These are DEPICTED OBJECTS — a picture of a frame —
//   and are allowed to use those tones, the same way a photograph of a frame on
//   the site would. They are NOT new UI-chrome colours. All actual UI chrome
//   (buttons, labels, rails, captions) stays strictly on the site palette:
//   bg #0a0908 / ink #ede6d6 / ink-muted / line / accent #c97844 (sparingly).
//   The tone constants for the frames live in FramedArtwork.tsx (the renderer);
//   this module owns only the dimensional spec (frameCm / matCm).
//
// PRESENTATIONAL ONLY
//   Nothing here feeds pricing, the basket, or checkout. `FrameFinish` is a
//   visual preview choice; it must never reach a Stripe line item.
// =============================================================================

/** The three frame finishes a buyer can preview the print in. */
export type FrameFinish = "unframed" | "oak" | "black-oak";

/**
 * The DIMENSIONAL spec of a frame finish, in real centimetres. `frameCm` is the
 * face width of the moulding; `matCm` is the mat (mount board) border between
 * the moulding and the print. `unframed` is both zero. Tones (the wood / black
 * appearance) are a rendering concern and live in FramedArtwork, not here.
 */
export interface FrameSpec {
  id: FrameFinish;
  label: string;
  /** Moulding face width, in cm. */
  frameCm: number;
  /** Mat / mount-board border width, in cm. */
  matCm: number;
}

/** The canonical frame specs. Real-world cm; same geometry for both woods. */
export const FRAME_SPECS: Record<FrameFinish, FrameSpec> = {
  unframed: { id: "unframed", label: "Unframed", frameCm: 0, matCm: 0 },
  oak: { id: "oak", label: "Natural oak", frameCm: 2.0, matCm: 4.5 },
  "black-oak": {
    id: "black-oak",
    label: "Black-stained oak",
    frameCm: 2.0,
    matCm: 4.5,
  },
};

/**
 * Everyday objects of KNOWN real size, used two ways: as the silhouette a user
 * drags to calibrate "My room" mode (match the on-screen silhouette to the real
 * object in their photo → we learn pxPerCm), and as quiet scale references. All
 * dimensions in cm. Bank card is ISO/IEC 7810 ID-1; A4 is the ISO sheet; a door
 * is a typical UK interior leaf.
 */
export const SCALE_REFERENCES = {
  card: { label: "Bank card", w: 8.56, h: 5.4 },
  a4: { label: "A4 sheet", w: 21.0, h: 29.7 },
  door: { label: "A door", w: 90, h: 200 },
} as const;

/** The reference human height (cm) the "scale" mode silhouette is drawn at. */
export const HUMAN_SILHOUETTE_CM = 170;

/**
 * A real room photograph the visualizer can hang a print in at true size.
 *
 * HOW TO ADD A REAL ROOM (deliberately not faked — see ROOM_PRESETS below):
 *   1. Shoot / source a STRAIGHT-ON wall photo (the wall as flat to the lens as
 *      possible — perspective skew breaks true-scale). Save it under
 *      /public/img/rooms/<id>.jpg with a .webp sibling.
 *   2. Measure pxPerCm from a known object IN that photo: find something whose
 *      real width you know (a light switch ≈ 8.6cm, a standard door leaf 90cm,
 *      a skirting height…), measure its width in image pixels, then
 *      `pxPerCm = measuredPx / realCm` (use `pxPerCmFromAnchor`). Record the
 *      photo's NATIVE pixel size in nativeWidthPx / nativeHeightPx.
 *   3. Pick wallCenter (where a print should hang by default, in NATIVE px) and
 *      wallRect (the clear wall area a print may be dragged within, NATIVE px).
 *   4. Push the preset below. The visualizer's "Room" tab then appears
 *      automatically (it is hidden whenever ROOM_PRESETS is empty).
 */
export interface RoomPreset {
  id: string;
  label: string;
  /** Public-folder JPG path, e.g. "/img/rooms/living-room.jpg". */
  src: string;
  nativeWidthPx: number;
  nativeHeightPx: number;
  /** Pixels per real cm at the wall plane (from `pxPerCmFromAnchor`). */
  pxPerCm: number;
  /** Default hang point, in the photo's NATIVE pixel coordinates. */
  wallCenter: { x: number; y: number };
  /** Draggable clear-wall bounds, in the photo's NATIVE pixel coordinates. */
  wallRect: { x: number; y: number; w: number; h: number };
  /** A short note on how this room's scale was measured (provenance). */
  anchorNote: string;
}

/**
 * Real room photographs — INTENTIONALLY EMPTY.
 *
 * We have no straight-on, measured room photos yet, and the estate owner
 * forbids fabricating AI-generated room images. A made-up room would also poison
 * true-scale (an invented pxPerCm is a lie about how big the print is). So the
 * visualizer ships with NO "Room" tab: it defaults to the asset-free "Scale"
 * mode (honest relative scale beside a 170cm figure + a ruler) and offers the
 * user-driven "My room" upload (where pxPerCm is recovered from a reference
 * object the buyer themselves places). Add measured presets via the recipe on
 * RoomPreset above and the Room tab self-enables.
 */
export const ROOM_PRESETS: RoomPreset[] = [];

// -----------------------------------------------------------------------------
// PURE HELPERS
// -----------------------------------------------------------------------------

/**
 * Recover pixels-per-cm from a reference object of known real size. Given how
 * many pixels the object spans on screen (`anchorPx`) and its real width in cm
 * (`anchorRealCm`), one cm is `anchorPx / anchorRealCm` pixels. Guards a
 * non-positive real size so a bad config can't divide by zero.
 */
export const pxPerCmFromAnchor = (
  anchorPx: number,
  anchorRealCm: number,
): number => (anchorRealCm > 0 ? anchorPx / anchorRealCm : 0);

/**
 * Grow a bare artwork's cm dimensions by a frame's moulding + mat borders, on
 * every side. The framed footprint is what actually hangs on the wall, so this
 * is what gets scaled. `unframed` (frameCm + matCm both 0) returns the input
 * unchanged.
 */
export const framedSizeCm = (
  dims: { w: number; h: number },
  frameSpec: FrameSpec,
): { w: number; h: number } => {
  const border = 2 * (frameSpec.frameCm + frameSpec.matCm);
  return { w: dims.w + border, h: dims.h + border };
};
