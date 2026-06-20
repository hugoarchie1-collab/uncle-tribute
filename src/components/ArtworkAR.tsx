// =============================================================================
// ArtworkAR — the realistic, TRUE-SIZE framed-print AR viewer (<model-viewer>).
// -----------------------------------------------------------------------------
// Shows the selected painting · colourway · size · frame as a real 3D framed
// piece (built by scripts/build-ar-assets.mjs — frame moulding with depth, a mat
// board, the print recessed behind it, a soft contact shadow). "See it on your
// wall" launches the DEVICE'S real AR (iOS Quick Look / Android Scene Viewer /
// WebXR), placing the framed print at its EXACT catalogue size, locked (no zoom).
//
//   • src      = one of two GLB "frame shells" (per frame finish). The colourway
//                texture is swapped at RUNTIME (model-viewer material API) and the
//                size is set via `scale` — so in-page preview + WebXR + Android
//                need only 2 GLBs, not the full matrix.
//   • ios-src  = the exact pre-baked USDZ for (painting × colourway × size ×
//                frame) at TRUE metres, with `#allowsContentScaling=0` so iOS
//                Quick Look can't pinch-resize it (fixed to the real size).
//
// Lazy-loads the heavy model-viewer bundle. Exposes activateAR() + reports
// whether AR is available, so the page can show a prominent "See it on your
// wall" CTA (devices) or a "scan to open on your phone" QR (desktop).
// =============================================================================

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { Colourway, Painting } from "../data/paintings";
import { paintingImageAlt } from "../data/paintings";
import { asset, webp } from "../lib/asset";
import {
  AR_FRAME_GLB,
  AR_GLB_BASE_METRES,
  AR_SIZES,
  arUsdz,
  type ArFrame,
  type ArSize,
} from "../lib/arAssets";
import { cn } from "../lib/cn";

export interface ArtworkARHandle {
  activateAR: () => void;
}

interface ArtworkARProps {
  painting: Painting;
  colourway: Colourway;
  sizeId: ArSize["id"];
  frame: ArFrame["id"];
  /** Reports whether the device can launch AR (false on desktop → show the QR). */
  onArAvailability?: (available: boolean) => void;
  className?: string;
}

/** Minimal shape of the bits of the model-viewer element we drive imperatively. */
interface MV extends HTMLElement {
  model?: {
    materials?: {
      name: string;
      pbrMetallicRoughness: { baseColorTexture: { setTexture: (t: unknown) => void } };
    }[];
  };
  createTexture?: (url: string) => Promise<unknown>;
  updateComplete?: Promise<unknown>;
  loaded?: boolean;
  canActivateAR?: boolean;
  scale?: string;
  activateAR?: () => void;
}

export const ArtworkAR = forwardRef<ArtworkARHandle, ArtworkARProps>(function ArtworkAR(
  { painting, colourway, sizeId, frame, onArAvailability, className },
  ref,
) {
  const viewerRef = useRef<MV | null>(null);
  const [moduleReady, setModuleReady] = useState(false);

  const glbSrc = asset(AR_FRAME_GLB[frame]);
  const usdz = arUsdz(painting.id, colourway.image, sizeId, frame);
  const iosSrc = usdz ? `${asset(usdz)}#allowsContentScaling=0` : undefined;
  const poster = asset(webp(colourway.image));
  const sizeMetres = AR_SIZES.find((s) => s.id === sizeId)?.metres ?? AR_GLB_BASE_METRES;
  const scale = sizeMetres / AR_GLB_BASE_METRES;

  useImperativeHandle(ref, () => ({
    activateAR: () => viewerRef.current?.activateAR?.(),
  }));

  // Lazy-load the model-viewer custom element.
  useEffect(() => {
    let cancelled = false;
    void import("@google/model-viewer").then(() => {
      if (!cancelled) setModuleReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply the colourway texture + the true-size scale to the live model.
  const apply = useCallback(async () => {
    const mv = viewerRef.current;
    if (!mv) return;
    try {
      if (mv.updateComplete) await mv.updateComplete;
      mv.scale = `${scale} ${scale} ${scale}`;
      const mats = mv.model?.materials;
      const mat = mats?.find((m) => m.name === "Artwork") ?? mats?.[0];
      if (mat && mv.createTexture) {
        const tex = await mv.createTexture(asset(colourway.image));
        mat.pbrMetallicRoughness.baseColorTexture.setTexture(tex);
      }
      onArAvailability?.(!!mv.canActivateAR);
    } catch {
      /* swallow — the poster + the baked USDZ still carry the experience */
    }
  }, [scale, colourway.image, onArAvailability]);

  // Re-apply on each model load (src changes when the frame changes) + on input change.
  useEffect(() => {
    if (!moduleReady) return;
    const mv = viewerRef.current;
    if (!mv) return;
    const onLoad = () => void apply();
    const onArStatus = () => onArAvailability?.(!!mv.canActivateAR);
    mv.addEventListener("load", onLoad);
    mv.addEventListener("ar-status", onArStatus);
    if (mv.loaded) void apply();
    return () => {
      mv.removeEventListener("load", onLoad);
      mv.removeEventListener("ar-status", onArStatus);
    };
  }, [moduleReady, apply, onArAvailability]);

  return (
    <div className={cn("relative", className)}>
      {moduleReady ? (
        <model-viewer
          ref={viewerRef as React.RefObject<HTMLElement>}
          src={glbSrc}
          ios-src={iosSrc}
          alt={paintingImageAlt(painting.title, colourway.name)}
          poster={poster}
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-placement="wall"
          ar-scale="fixed"
          camera-controls
          camera-orbit="0deg 80deg 1.4m"
          min-camera-orbit="auto 65deg auto"
          max-camera-orbit="auto 95deg auto"
          shadow-intensity="1.4"
          shadow-softness="1"
          environment-image="neutral"
          exposure="1.05"
          loading="eager"
          reveal="auto"
          style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
        />
      ) : (
        <img
          src={poster}
          alt={paintingImageAlt(painting.title, colourway.name)}
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
    </div>
  );
});
