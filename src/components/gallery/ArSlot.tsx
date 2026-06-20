// =============================================================================
// ArSlot — the "See it in your room" affordance on an exhibition act.
// -----------------------------------------------------------------------------
// PRIMARY web-AR is now the in-page CAMERA experience (CameraAR): tap, the
// browser asks for the camera, the rear camera opens full-screen, and the
// visitor drags the framed painting onto their own wall (Pokémon-Go style),
// resizes it, and saves a photo. No model-viewer, no 3D bundle — dead simple.
//
// The button is always shown (every painting can be placed via the camera) — a
// quiet on-palette text link warming to accent on hover, the act's register.
// When the camera is unavailable (desktop / no camera / denied) CameraAR ITSELF
// shows the clean explainer, so the affordance is never a dead control.
//
// `onUsePhotoInstead` is wired to the existing RoomVisualizer upload mode
// (RoomVisualizerModal in "scale"/"My room"), so a desktop visitor hitting the
// explainer can still place the print using a photo of their room.
// =============================================================================

import { useState } from "react";
import { CameraAR } from "../CameraAR";
import { RoomVisualizerModal } from "../RoomVisualizer";
import { getAnchorTier, type Colourway, type Painting } from "../../data/paintings";
import { BTN_PRIMARY } from "../ui/tokens";
import { cn } from "../../lib/cn";

interface ArSlotProps {
  painting: Painting;
  /** The colourway shown on the plate (the act's cover colourway). */
  cover: Colourway;
}

export const ArSlot = ({ painting, cover }: ArSlotProps) => {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const tier = getAnchorTier(painting);

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
          onUsePhotoInstead={() => {
            setCameraOpen(false);
            setPhotoOpen(true);
          }}
        />
      )}

      {photoOpen && (
        <RoomVisualizerModal
          open={photoOpen}
          onClose={() => setPhotoOpen(false)}
          painting={painting}
          colourway={cover}
          tier={tier}
        />
      )}
    </>
  );
};
