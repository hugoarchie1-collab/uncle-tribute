// =============================================================================
// RoomVisualizerSlot — the "See it on your wall" CTA on every exhibition act.
// -----------------------------------------------------------------------------
// A BTN_PRIMARY pill (filled ink → accent on hover) carrying a small frame
// glyph. Clicking opens the RoomVisualizerModal (built in parallel by a
// teammate, exact signature below) for THIS painting + colourway, at its anchor
// tier. The open/close state is owned here so the page never has to thread ten
// modal flags — each act drives its own viewer, mounted only while open.
//
// CONTRACT consumed (RoomVisualizerModal, from ../RoomVisualizer):
//   <RoomVisualizerModal open onClose painting colourway tier />
//   - open: boolean      — whether the modal is mounted/visible
//   - onClose: () => void
//   - painting: Painting
//   - colourway: Colourway
//   - tier: PrintTier    — the anchor tier (getAnchorTier(painting))
// If the prop names drift slightly, the orchestrator reconciles during the build.
// =============================================================================

import { useState } from "react";
import { RoomVisualizerModal } from "../RoomVisualizer";
import { getAnchorTier, type Colourway, type Painting } from "../../data/paintings";
import { cn } from "../../lib/cn";
import { BTN_PRIMARY } from "../ui/tokens";

interface RoomVisualizerSlotProps {
  painting: Painting;
  /** The colourway shown on the plate (the act's cover colourway). */
  colourway: Colourway;
  /** Extra classes on the trigger button (e.g. flex sizing in the CTA row). */
  className?: string;
}

/** A quiet inline frame glyph — a hung picture on a wall, mono on currentColor. */
const FrameGlyph = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    className="shrink-0"
  >
    <rect
      x="2.25"
      y="2.25"
      width="11.5"
      height="11.5"
      rx="0.5"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <rect
      x="5"
      y="5"
      width="6"
      height="6"
      rx="0.25"
      stroke="currentColor"
      strokeWidth="1.1"
      opacity="0.6"
    />
  </svg>
);

export const RoomVisualizerSlot = ({
  painting,
  colourway,
  className,
}: RoomVisualizerSlotProps) => {
  const [open, setOpen] = useState(false);
  const tier = getAnchorTier(painting);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(BTN_PRIMARY, "gap-2", className)}
        data-cursor-label="See it on your wall"
      >
        <FrameGlyph />
        See it on your wall
      </button>
      {open && (
        <RoomVisualizerModal
          open={open}
          onClose={() => setOpen(false)}
          painting={painting}
          colourway={colourway}
          tier={tier}
        />
      )}
    </>
  );
};
