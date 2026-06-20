// =============================================================================
// ArSlot — the "See it in your room" affordance on an exhibition act.
// -----------------------------------------------------------------------------
// The Virtual Gallery AR is JUST the camera (Hugo): tap, the browser asks for
// the camera, the rear camera opens full-screen, and the visitor drags the
// painting onto their own wall (Pokémon-Go style), resizes it, saves a photo.
// No model-viewer, no photo-upload fallback, no extras. If there is no camera
// (desktop / denied) CameraAR shows a clean "you need a camera — open it on your
// phone" page (with a QR), so the affordance is never a dead control.
// =============================================================================

import { useState } from "react";
import { CameraAR } from "../CameraAR";
import { type Colourway, type Painting } from "../../data/paintings";
import { BTN_PRIMARY } from "../ui/tokens";
import { cn } from "../../lib/cn";

interface ArSlotProps {
  painting: Painting;
  /** The colourway shown on the plate (the act's cover colourway). */
  cover: Colourway;
}

export const ArSlot = ({ painting, cover }: ArSlotProps) => {
  const [cameraOpen, setCameraOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setCameraOpen(true)}
        className={cn(BTN_PRIMARY, "gap-2")}
        data-cursor-label="See it in your room"
      >
        See it in your room <span aria-hidden="true">↗</span>
      </button>

      {cameraOpen && (
        <CameraAR
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          painting={painting}
          colourway={cover}
        />
      )}
    </>
  );
};
