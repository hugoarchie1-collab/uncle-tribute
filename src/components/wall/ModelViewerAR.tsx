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
import { WALL_SHELL_GLB, wallFramedUsdz } from "../../lib/wallModels";
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
  /** Selected frame id ("none" or a FRAME_STYLES id) — drives the AR model + preview. */
  frameId?: string;
  /** The frame's wood colour hex (null = no frame). Draws the preview border. */
  frameSwatch?: string | null;
  /** Bubbles up whether the device can launch AR (false → parent shows fallback). */
  onArAvailability?: (available: boolean) => void;
  className?: string;
}

export const ModelViewerAR = ({
  painting,
  colourway,
  size,
  frameId = "none",
  frameSwatch = null,
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

  const usdz = wallFramedUsdz(painting.id, colourway.image, size.id, frameId);
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
    mv.setAttribute("exposure", "1");
    mv.setAttribute("loading", "eager");
    // reveal="manual" keeps the flat 3D canvas off screen — model-viewer is
    // purely the device-AR launcher here. NO poster attribute: the poster paints
    // the artwork FULL-BLEED behind the inset print overlay below, so the same
    // image showed twice at two scales (the "glitched double image" on every
    // painting). The overlay print IS the visual; this element stays invisible.
    mv.setAttribute("reveal", "manual");
  }, [moduleReady, alt]);

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
    <div className={cn("relative overflow-hidden", className)}>
      {/* model-viewer sits BEHIND, with NO camera-controls — so there is no
          spinnable floating 3D "object", it's purely the device-AR launcher.
          The artwork image below covers it and always shows the WHOLE print. */}
      {moduleReady && !moduleError && (
        <model-viewer
          ref={viewerRef as React.RefObject<HTMLElement>}
          ios-src={iosSrc}
          ar-modes="webxr scene-viewer quick-look"
          ar-placement="wall"
          ar-scale="fixed"
          interaction-prompt="none"
          shadow-intensity="0.4"
          environment-image="neutral"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", backgroundColor: "transparent" }}
        />
      )}

      {/* THE FULL PRINT — the complete square image, with the SELECTED frame
          drawn directly around it (no white mat), or bare when unframed. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-[7%]">
        <div
          className="relative aspect-square w-full max-w-full"
          style={
            frameSwatch
              ? {
                  padding: "4.5%",
                  background: `linear-gradient(135deg, color-mix(in srgb, ${frameSwatch}, white 26%) 0%, ${frameSwatch} 45%, color-mix(in srgb, ${frameSwatch}, black 34%) 100%)`,
                  boxShadow:
                    "inset 0 0 0 1px rgba(0,0,0,0.5), inset 0 2px 3px rgba(255,255,255,0.22), inset 0 -3px 7px rgba(0,0,0,0.5), 0 18px 34px rgba(0,0,0,0.55)",
                }
              : { filter: "drop-shadow(0 16px 30px rgba(0,0,0,0.5))" }
          }
        >
          <img
            src={poster}
            alt={alt}
            className="block h-full w-full object-cover"
            style={{ boxShadow: frameSwatch ? "0 0 0 1px rgba(0,0,0,0.55)" : "none" }}
          />
          {frameSwatch && (
            <div
              aria-hidden="true"
              className="absolute inset-[4.5%]"
              style={{
                background:
                  "linear-gradient(118deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.04) 16%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 72%, rgba(255,255,255,0.05) 100%)",
                mixBlendMode: "screen",
              }}
            />
          )}
        </div>
      </div>

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
          <span className="rounded-full bg-black/55 px-5 py-2.5 text-center font-sans text-[14px] leading-[1.5] text-ink/90 backdrop-blur-sm">
            {modelState === "error"
              ? "AR couldn't load here — open this page on your phone."
              : "Open on your phone (Safari / Chrome) to place it on your wall in AR."}
          </span>
        </div>
      )}
    </div>
  );
};
