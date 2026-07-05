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
import { wallDimsLabel, wallFramedGlb, wallFramedUsdz } from "../../lib/wallModels";
import { asset, webp } from "../../lib/asset";
import { SITE_URL } from "../../lib/seo";
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
  onArAvailability,
  className,
}: ModelViewerARProps) => {
  const viewerRef = useRef<MV | null>(null);
  const [moduleReady, setModuleReady] = useState(false);
  const [moduleError, setModuleError] = useState(false);
  const [modelState, setModelState] = useState<ModelState>("loading");
  const [arAvailable, setArAvailable] = useState(false);

  // Per-(colourway × size × frame) textured models — the artwork, chosen frame
  // and TRUE size are all baked in, so Scene Viewer / Quick Look show the real
  // framed print at real cm on hand-off (a chosen frame opens its own model, not
  // a silent frameless swap). Frameless when frameId === "none".
  const glb = wallFramedGlb(painting.id, colourway.image, size.id, frameId);
  const usdz = wallFramedUsdz(painting.id, colourway.image, size.id, frameId);
  // iOS Quick Look native banner (product name + size + "View this print" → the
  // PDP): the standard Apple AR commerce bar. model-viewer appends
  // #allowsContentScaling=0 itself (ar-scale="fixed"), so we don't repeat it.
  const iosSrc = usdz
    ? `${asset(usdz)}#` +
      [
        `checkoutTitle=${encodeURIComponent(painting.title)}`,
        `checkoutSubtitle=${encodeURIComponent(`${colourway.name} · ${size.label} · ${wallDimsLabel(painting.id, size.cm)}`)}`,
        `callToAction=${encodeURIComponent("View this print")}`,
        `canonicalWebPageURL=${encodeURIComponent(`${SITE_URL}/collections/${painting.id}?c=${encodeURIComponent(colourway.name)}&size=${size.id}`)}`,
      ].join("&")
    : undefined;
  const poster = asset(webp(colourway.image));
  const alt = `${paintingImageAlt(painting.title, colourway.name)} — ${size.label} (${wallDimsLabel(painting.id, size.cm)})`;

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

  // The texture + true size are baked into the per-(colourway × size) model, so
  // there is no runtime swap — just report whether this device can launch AR.
  const reportFromViewer = useCallback(() => {
    const mv = viewerRef.current;
    if (mv) reportAvailability(!!mv.canActivateAR);
  }, [reportAvailability]);

  // Wire load / error / ar-status once the module is ready.
  useEffect(() => {
    if (!moduleReady) return;
    const mv = viewerRef.current;
    if (!mv) return;
    const onLoad = () => {
      setModelState("ready");
      trackWall("ar_model_loaded", { artwork: painting.id, size: size.id });
      reportFromViewer();
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
      reportFromViewer();
    }
    return () => {
      mv.removeEventListener("load", onLoad);
      mv.removeEventListener("error", onError);
      mv.removeEventListener("ar-status", onArStatus);
    };
  }, [moduleReady, reportFromViewer, reportAvailability, painting.id, size.id]);

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
    if (glb) mv.setAttribute("src", asset(glb));
    else mv.removeAttribute("src");
    mv.setAttribute("ar", "");
    mv.setAttribute("alt", alt);
    mv.setAttribute("loading", "eager");
    // `poster` is a non-hyphenated attribute React 19 won't apply to the custom
    // element — set it imperatively so the print paints instantly, then the real
    // 3D model reveals on load (one image only, so no "double image").
    mv.setAttribute("poster", poster);

    // model-viewer resolves AR support ASYNCHRONOUSLY after `load` and never
    // fires an event when it flips to available — a single load-time read races
    // it and can leave a real phone stuck on "open on your phone". Poll
    // canActivateAR for a short window until it's true, then stop.
    let timer = 0;
    const started = Date.now();
    const poll = () => {
      const el = viewerRef.current;
      if (!el) return;
      if (el.canActivateAR) {
        reportAvailability(true);
        return;
      }
      if (Date.now() - started > 2600) return;
      timer = window.setTimeout(poll, 160);
    };
    poll();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [moduleReady, alt, glb, poster, reportAvailability]);

  const launchAR = () => {
    const mv = viewerRef.current;
    if (!mv?.activateAR || !mv.canActivateAR) {
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
      {/* REAL interactive 3D preview — the framed print (baked moulding + real
          12mm recess) you can orbit, AND the launcher for true-size device AR.
          The print is the model's own poster (one visual only → no double image);
          a flat image only stands in if the module or model fails to load. */}
      {moduleReady && !moduleError && modelState !== "error" ? (
        <model-viewer
          ref={viewerRef as React.RefObject<HTMLElement>}
          ios-src={iosSrc}
          ar-modes="webxr scene-viewer quick-look"
          ar-placement="wall"
          ar-scale="fixed"
          camera-controls
          camera-orbit="0deg 88deg auto"
          min-camera-orbit="-45deg 62deg auto"
          max-camera-orbit="45deg 104deg auto"
          disable-pan
          auto-rotate
          auto-rotate-delay="1400"
          rotation-per-second="16deg"
          interaction-prompt="none"
          shadow-intensity="0.85"
          shadow-softness="1"
          exposure="1.05"
          environment-image="neutral"
          xr-environment
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", backgroundColor: "transparent", "--poster-color": "transparent" } as React.CSSProperties}
        />
      ) : (
        <img src={poster} alt={alt} className="absolute inset-0 h-full w-full object-contain p-[9%]" />
      )}

      {/* Soft gradient so the button reads over the model */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0))" }}
      />

      {/* On a capable device: launch full-screen true-size AR. On desktop /
          incapable devices the parent shows the QR + guidance (no dead pill). */}
      {arAvailable && (
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
      )}
    </div>
  );
};
