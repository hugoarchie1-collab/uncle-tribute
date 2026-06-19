import type { CSSProperties } from "react";
import { asset, webp } from "../lib/asset";
import { framedSizeCm, FRAME_SPECS, type FrameFinish } from "../lib/trueScale";

/* =============================================================================
 * FramedArtwork — the shared, true-scale render unit for one print.
 * -----------------------------------------------------------------------------
 * A nested box model whose EVERY border is sized from real centimetres, so the
 * print, its mat and its moulding all keep honest relative proportions at any
 * scale:
 *
 *   outer drop-shadow wrapper  ── neutral, cm-scaled cast shadow
 *     └ frame moulding          ── frameCm  (wood / black tone, BEVELLED)
 *         └ mat (mount board)   ── matCm    (cream board)
 *             └ inner lip       ── 0.25cm   (the slight shadow where mat meets art)
 *                 └ <img>       ── the print itself, aspect from dims.w / dims.h
 *
 * SCALE:  unit = pxPerCm × displayScale  (pixels per real cm on screen)
 *         frameW = frameCm × unit, matW = matCm × unit, lip = 0.25 × unit.
 * The artwork's pixel size is dims × unit; the frame GROWS the footprint
 * outward (via framedSizeCm), so a framed print occupies more wall than a bare
 * one — exactly as in life. Any aspect ratio works from dims alone (ophiuchus
 * 60×80 needs no special-case).
 *
 * PALETTE: the oak / black / cream tones below are DEPICTED OBJECTS (a picture
 * of a frame) — allowed, the same as a photo of a frame. They are NOT UI-chrome
 * colours; all chrome around this component stays on the site palette.
 *
 * The image uses the SELECTED colourway's JPG path, swapped to its .webp
 * sibling via <picture> (the house AssetImage convention). Presentational only.
 * ========================================================================== */

/**
 * Depicted-object frame tones. Each finish is a {highlight, mid, shadow} triple
 * used to paint a bevelled moulding via a linear-gradient + matching bevel
 * borders, so the wood/black reads as a 3D frame face rather than a flat bar.
 */
const FRAME_TONES: Record<
  Exclude<FrameFinish, "unframed">,
  { highlight: string; mid: string; shadow: string }
> = {
  oak: { highlight: "#d8bd86", mid: "#b8915a", shadow: "#8a6a3c" },
  "black-oak": { highlight: "#37322b", mid: "#211d1a", shadow: "#100c0a" },
};

/** Mat / mount-board face (cream paper board — a depicted object). */
const MAT_FACE = "#efe9dd";

export interface FramedArtworkProps {
  /** Public-folder JPG path for the selected colourway, e.g.
   *  "/img/paintings/wild-rose-sussex-pink.jpg". The .webp sibling is swapped
   *  in automatically. */
  imageSrc: string;
  alt: string;
  /** Bare artwork size in real cm (the print sheet, before any frame). */
  dims: { w: number; h: number };
  /** Pixels per real cm on the wall plane. */
  pxPerCm: number;
  /** Unitless multiplier applied on top of pxPerCm (fit / DPR). */
  displayScale: number;
  finish: FrameFinish;
  /** Visual hint only (cursor + touch-action) — the PARENT owns the drag. */
  draggable?: boolean;
}

export const FramedArtwork = ({
  imageSrc,
  alt,
  dims,
  pxPerCm,
  displayScale,
  finish,
  draggable = false,
}: FramedArtworkProps) => {
  const spec = FRAME_SPECS[finish];
  const unit = pxPerCm * displayScale;

  // Border widths in px, all from real cm.
  const frameW = spec.frameCm * unit;
  const matW = spec.matCm * unit;
  const lip = 0.25 * unit;

  // The bare print, in px.
  const artW = dims.w * unit;
  const artH = dims.h * unit;

  // The full framed footprint, in px (used for the drop-shadow wrapper).
  const framed = framedSizeCm(dims, spec);
  const outerW = framed.w * unit;
  const outerH = framed.h * unit;

  // Neutral, near-black cast shadow — cm-scaled so it grows with the piece and
  // never looks pasted-on at large sizes. Pure shadow (no colour), palette-safe.
  const dropShadow: CSSProperties = {
    boxShadow: `0 ${0.4 * unit}px ${1.6 * unit}px rgba(0,0,0,0.45), 0 ${
      0.1 * unit
    }px ${0.3 * unit}px rgba(0,0,0,0.55)`,
  };

  const imgEl = (
    <picture>
      <source srcSet={asset(webp(imageSrc))} type="image/webp" />
      <img
        src={asset(imageSrc)}
        alt={alt}
        draggable={false}
        className="block h-full w-full object-cover select-none"
        style={{ pointerEvents: "none" }}
      />
    </picture>
  );

  // -- UNFRAMED -------------------------------------------------------------
  // Bare print with a hairline paper edge + the soft cast shadow. No moulding,
  // no mat — the footprint equals the print (framedSizeCm returns dims).
  if (finish === "unframed") {
    return (
      <div
        style={{
          width: outerW,
          height: outerH,
          touchAction: draggable ? "none" : undefined,
          cursor: draggable ? "grab" : undefined,
          ...dropShadow,
        }}
        className="relative overflow-hidden"
      >
        {/* Hairline paper edge so the print reads as a physical sheet. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 ring-1 ring-black/15"
        />
        {imgEl}
      </div>
    );
  }

  // -- FRAMED (oak / black-oak) ---------------------------------------------
  const tone = FRAME_TONES[finish];
  // Bevelled moulding: a diagonal gradient (top-left lit, bottom-right in
  // shadow) plus subtle bevel borders carving the inner + outer edges.
  const frameStyle: CSSProperties = {
    width: outerW,
    height: outerH,
    padding: frameW,
    background: `linear-gradient(135deg, ${tone.highlight} 0%, ${tone.mid} 45%, ${tone.shadow} 100%)`,
    // Inner bevel: lit top-left, dark bottom-right (carves the rebate).
    boxShadow: `inset ${0.12 * unit}px ${0.12 * unit}px ${
      0.18 * unit
    }px rgba(255,255,255,0.18), inset -${0.12 * unit}px -${0.12 * unit}px ${
      0.2 * unit
    }px rgba(0,0,0,0.45)`,
    touchAction: draggable ? "none" : undefined,
    cursor: draggable ? "grab" : undefined,
  };

  return (
    <div style={dropShadow} className="relative">
      {/* Frame moulding */}
      <div style={frameStyle} className="relative box-border">
        {/* Mat / mount board */}
        <div
          className="relative box-border h-full w-full"
          style={{
            padding: matW,
            background: MAT_FACE,
            // A faint outer line on the mat where it meets the rebate.
            boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.06)`,
          }}
        >
          {/* Inner lip — the slight shadowed step from mat down to the art. */}
          <div
            className="relative box-border h-full w-full overflow-hidden"
            style={{
              // The lip is a VISUAL bevel (the inset shadow below), NOT a size
              // cost — padding it would shrink the print's content box by ~0.5cm
              // and clip the art, breaking true scale. So no padding: the print
              // fills this box at exactly artW×artH (its real size).
              background: MAT_FACE,
              boxShadow: `inset 0 0 ${Math.max(lip, 1)}px rgba(0,0,0,0.28)`,
            }}
          >
            {/* The print */}
            <div
              className="relative overflow-hidden"
              style={{ width: artW, height: artH }}
            >
              {imgEl}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
