// =============================================================================
// ArSlot — the quiet "View in your room (AR)" affordance on an exhibition act.
// -----------------------------------------------------------------------------
// A COMPACT text link, not a giant viewer: when an AR asset exists for the
// painting, a quiet on-palette link REVEALS <ArtworkAR/> (built in parallel by
// a teammate, exact signature below) inline — so the heavy model-viewer never
// mounts until the visitor actually asks for it, and an act with no AR model
// shows nothing (returns null) rather than a dead control.
//
// The real-world AR size is the square A-size print the shop sells — 42 × 42 cm
// for every painting (incl. Ophiuchus) — so the model lands at true scale.
//
// CONTRACT consumed (from ../ArtworkAR):
//   hasArAsset(paintingId: string): boolean
//   <ArtworkAR paintingId colourwayName alt widthCm heightCm />
// If the prop names drift slightly, the orchestrator reconciles during the build.
// =============================================================================

import { useState } from "react";
import { ArtworkAR, hasArAsset } from "../ArtworkAR";
import { paintingImageAlt, type Colourway, type Painting } from "../../data/paintings";

interface ArSlotProps {
  painting: Painting;
  /** The colourway shown on the plate (the act's cover colourway). */
  cover: Colourway;
}

// Real-world print dimensions (cm) for the AR model — the square A-size sheet the
// shop sells, 42 × 42 cm for every painting. Per-id overrides can be added here
// only if a genuinely non-square print is ever offered.
const AR_DIMENSIONS_CM: Record<string, { widthCm: number; heightCm: number }> = {};
const DEFAULT_AR_CM = { widthCm: 42, heightCm: 42 };

export const ArSlot = ({ painting, cover }: ArSlotProps) => {
  const [revealed, setRevealed] = useState(false);

  // No AR model for this painting → render nothing (a compact affordance only
  // appears when it can actually do something).
  if (!hasArAsset(painting.id)) return null;

  const { widthCm, heightCm } = AR_DIMENSIONS_CM[painting.id] ?? DEFAULT_AR_CM;

  // Quiet text link until asked — then the inline viewer mounts (and lazy-loads
  // model-viewer itself). On-palette: muted ink, warming to accent on hover.
  if (!revealed) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold tracking-[0.16em] uppercase text-ink-muted hover:text-accent transition-colors duration-300"
        data-cursor-label="View in your room"
      >
        View in your room (AR) <span aria-hidden="true">↗</span>
      </button>
    );
  }

  return (
    <div className="max-w-[clamp(220px,40vw,340px)]">
      <ArtworkAR
        paintingId={painting.id}
        colourwayName={cover.name}
        alt={paintingImageAlt(painting.title, cover.name)}
        widthCm={widthCm}
        heightCm={heightCm}
      />
    </div>
  );
};
