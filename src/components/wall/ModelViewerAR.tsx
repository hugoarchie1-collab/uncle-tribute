// =============================================================================
// ModelViewerAR — the frameless true-size 3D preview + device AR launcher.
// -----------------------------------------------------------------------------
// The PRIMARY "See on Your Wall" experience. Renders the reusable frameless
// canvas GLB shell in <model-viewer>, swaps the FRONT-face texture to the exact
// selected colourway at runtime (the untouched original image, same-origin) and
// scales the model to the selected size's TRUE metres. Device AR launches via
// WebXR / Android Scene Viewer / iOS Quick Look with ar-placement="wall" +
// ar-scale="fixed" so the artwork is LOCKED to its real physical size — the
// customer can reposition it but never pinch it away from scale.
//
// The heavy model-viewer bundle is lazy-loaded (dynamic import) only when this
// component mounts, so it never touches ordinary product-page performance.
// Reports capability + emits analytics; degrades to a poster + a clear message
// (the parent then offers the calibrated photo fallback).
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import type { Colourway, Painting } from "../../data/paintings";
import { paintingImageAlt } from "../../data/paintings";
import type { ArtworkSize } from "../../lib/artworkSizes";
import { shellScaleFor } from "../../lib/artworkSizes";
import { WALL_SHELL_GLB, wallUsdz } from "../../lib/wallModels";
import { asset, webp } from "../../lib/asset";
import { cn } from "../../lib/cn";
import { trackWall } from "../../lib/wallAnalytics";

/** Minimal shape of the model-viewer element we drive imperatively. */
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
  cameraOrbit?: string;
  jumpCameraToGoal?: () => void;
}

const DEFAULT_ORBIT = "0deg 90deg 1.35m";

type ModelState = "loading" | "ready" | "error";

interface ModelViewerARProps {
  painting: Painting;
  colourway: Colourway;
  size: ArtworkSize;
  /** Bubbles up whether the device can launch AR (false → parent shows fallback). */
  onArAvailability?: (available: boolean) => void;
  className?: string;
}

export const ModelViewerAR = ({
  painting,
  colourway,
  size,
  onArAvailability,
  className,
}: ModelViewerARProps) => {
  const viewerRef = useRef<MV | null>(null);
  const [moduleReady, setModuleReady] = useState(false);
  const [moduleError, setModuleError] = useState(false);
  const [modelState, setModelState] = useState<ModelState>("loading");
  const [arAvailable, setArAvailable] = useState(false);
  // Guards texture-swap against stale async loads when the selection changes.
  const applyToken = useRef(0);

  const usdz = wallUsdz(painting.id, colourway.image, size.id);
  const iosSrc = usdz ? `${asset(usdz)}#allowsContentScaling=0` : undefined;
  const poster = asset(webp(colourway.image));
  const scale = shellScaleFor(size);
  const alt = `${paintingImageAlt(painting.title, colourway.name)} — ${size.label} (${size.cm} × ${size.cm} cm)`;

  const reportAvailability = useCallback(
    (available: boolean) => {
      setArAvailable(available);
      onArAvailability?.(available);
    },
    [onArAvailability],
  );

  // Lazy-load the model-viewer custom element on mount only.
  useEffect(() => {
    let cancelled = false;
    void import("@google/model-viewer")
      .then(() => {
        if (!cancelled) setModuleReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setModuleError(true);
          setModelState("error");
          reportAvailability(false);
          trackWall("ar_model_failed", { artwork: painting.id, reason: "module" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [painting.id, reportAvailability]);

  // Apply the colourway texture + the true-size scale to the live model.
  const apply = useCallback(async () => {
    const mv = viewerRef.current;
    if (!mv) return;
    const token = ++applyToken.current;
    try {
      if (mv.updateComplete) await mv.updateComplete;
      if (token !== applyToken.current) return; // superseded by a newer selection
      mv.scale = `${scale} ${scale} ${scale}`;
      const mats = mv.model?.materials;
      const mat = mats?.find((m) => m.name === "Artwork") ?? mats?.[0];
      if (mat && mv.createTexture) {
        const tex = await mv.createTexture(asset(colourway.image));
        if (token !== applyToken.current) return;
        mat.pbrMetallicRoughness.baseColorTexture.setTexture(tex);
      }
      reportAvailability(!!mv.canActivateAR);
    } catch {
      /* poster + baked USDZ still carry the experience */
    }
  }, [scale, colourway.image, reportAvailability]);

  // Wire load / error / ar-status once the module is ready.
  useEffect(() => {
    if (!moduleReady) return;
    const mv = viewerRef.current;
    if (!mv) return;
    const onLoad = () => {
      setModelState("ready");
      trackWall("ar_model_loaded", { artwork: painting.id, size: size.id });
      void apply();
    };
    const onError = () => {
      setModelState("error");
      reportAvailability(false);
      trackWall("ar_model_failed", { artwork: painting.id, reason: "load" });
    };
    const onArStatus = () => reportAvailability(!!mv.canActivateAR);
    mv.addEventListener("load", onLoad);
    mv.addEventListener("error", onError);
    mv.addEventListener("ar-status", onArStatus);
    if (mv.loaded) {
      setModelState("ready");
      void apply();
    }
    return () => {
      mv.removeEventListener("load", onLoad);
      mv.removeEventListener("error", onError);
      mv.removeEventListener("ar-status", onArStatus);
    };
  }, [moduleReady, apply, reportAvailability, painting.id, size.id]);

  // Reset the orbit to front-on whenever the piece changes.
  useEffect(() => {
    if (!moduleReady) return;
    const mv = viewerRef.current;
    if (!mv) return;
    mv.cameraOrbit = DEFAULT_ORBIT;
    mv.jumpCameraToGoal?.();
  }, [painting.id, colourway.name, size.id, moduleReady]);

  // React 19 does not reliably apply the NON-hyphenated attributes (src, ar,
  // alt, poster, …) to the <model-viewer> custom element — the hyphenated ones
  // (ar-placement, ar-scale, ios-src) go through, but src silently doesn't, so
  // the model loads empty. Set the non-hyphenated attributes imperatively on the
  // upgraded element instead; ios-src stays declarative (it works + updates with
  // the size).
  useEffect(() => {
    if (!moduleReady) return;
    const mv = viewerRef.current;
    if (!mv) return;
    mv.setAttribute("src", asset(WALL_SHELL_GLB));
    mv.setAttribute("ar", "");
    mv.setAttribute("alt", alt);
    mv.setAttribute("poster", poster);
    mv.setAttribute("exposure", "1");
    mv.setAttribute("loading", "eager");
    // reveal="manual" keeps the POSTER (the artwork image) on screen instead of
    // the flat 3D canvas — so the panel shows the painting, never a blank white
    // square. The model still loads eagerly in the background, ready for AR.
    mv.setAttribute("reveal", "manual");
  }, [moduleReady, alt, poster]);

  const launchAR = () => {
    const mv = viewerRef.current;
    if (!mv?.activateAR) {
      trackWall("ar_launch_failed", { artwork: painting.id, reason: "unavailable" });
      return;
    }
    try {
      trackWall("ar_launched", { artwork: painting.id, size: size.id });
      mv.activateAR();
    } catch {
      trackWall("ar_launch_failed", { artwork: painting.id, reason: "exception" });
    }
  };

  return (
    <div className={cn("relative", className)}>
      {moduleReady && !moduleError ? (
        <model-viewer
          ref={viewerRef as React.RefObject<HTMLElement>}
          ios-src={iosSrc}
          ar-modes="webxr scene-viewer quick-look"
          ar-placement="wall"
          ar-scale="fixed"
          camera-controls
          disable-pan
          camera-orbit={DEFAULT_ORBIT}
          min-camera-orbit="auto 55deg 0.6m"
          max-camera-orbit="auto 110deg 2.4m"
          interaction-prompt="none"
          shadow-intensity="0.4"
          shadow-softness="1"
          environment-image="neutral"
          style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
        />
      ) : (
        <img
          src={poster}
          alt={alt}
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}

      {/* Soft gradient so the button/label reads over any artwork */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))" }}
      />

      {/* Primary action: launch full-screen AR on a real device */}
      {arAvailable ? (
        <div className="absolute inset-x-0 bottom-0 flex justify-center p-4">
          <button
            type="button"
            onClick={launchAR}
            className="press inline-flex min-h-[54px] w-full max-w-[420px] items-center justify-center gap-2.5 rounded-full bg-ink px-7 font-sans text-[14px] font-bold tracking-[0.03em] text-bg outline-none transition-colors duration-300 hover:bg-accent hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 2.2 17 6v8l-7 3.8L3 14V6l7-3.8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M3 6l7 3.8L17 6M10 9.8V17.8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
            View on your wall — true size
          </button>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 flex justify-center p-4">
          <span className="rounded-full bg-black/55 px-5 py-2.5 text-center font-sans text-[12px] leading-[1.5] text-ink/90 backdrop-blur-sm">
            {modelState === "error"
              ? "AR couldn't load here — open this page on your phone."
              : "Open on your phone (Safari / Chrome) to place it on your wall in AR."}
          </span>
        </div>
      )}
    </div>
  );
};
