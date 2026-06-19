// =============================================================================
// ArtworkAR — view a painting's giclée print in your room, at TRUE wall size.
// -----------------------------------------------------------------------------
// Wraps <model-viewer> (the web component from @google/model-viewer). The heavy
// model-viewer bundle is LAZY-loaded via dynamic import only once this component
// scrolls into view (IntersectionObserver sentinel — the repo's Reveal / sticky-
// bar convention), so it never bloats other pages. Until it loads, and on
// devices without WebGL, the poster image is shown — never a blank box.
//
// The committed /ar assets are sized in real-world metres at the square A2 anchor
// size (0.42×0.42 m for every painting — the shop sells square A-size prints), so
// `ar-scale="fixed"` + `ar-placement="wall"` place the print at its actual size on
// the user's WALL. On iOS, `ios-src` (USDZ, vertical-plane anchored) drives Quick
// Look; if a painting has no USDZ, omit ios-src and model-viewer hides Quick Look.
//
// Chrome is strictly on-palette (monochrome ink, Fraunces/Hanken). No auto-orbit
// under reduced motion.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { asset, webp } from "../lib/asset";
import { cn } from "../lib/cn";
import { getPaintingById } from "../data/paintings";
import { IMAGE_VARIANT_WIDTHS } from "../lib/imageVariants";

// -----------------------------------------------------------------------------
// Which paintings have committed /ar assets. EXPLICIT list mirroring the ids the
// build script (scripts/build-ar-assets.mjs) actually writes a GLB+USDZ for — so
// a NEW catalogue painting WITHOUT a built asset returns false here (never 404s a
// model) until its assets are generated. Same mirror discipline as the pricing
// tables (gotcha #9). `AR_USDZ_IDS` tracks which ids also ship a USDZ (iOS Quick
// Look) — currently all of them; gate `ios-src` on it so a future GLB-only
// painting doesn't advertise a missing Quick Look file.
// -----------------------------------------------------------------------------
const AR_ASSET_VERSION = "v2"; // mirror scripts/build-ar-assets.mjs `V`
const AR_IDS = new Set<string>([
  "wild-rose",
  "english-bluebells",
  "orchis-7",
  "flower-of-life",
  "slipper-orchids",
  "peacock-minerva",
  "ophiuchus",
  "tridecagon-moon-star",
  "lulin",
  "enneagon-swans",
]);
const AR_USDZ_IDS = AR_IDS; // every committed AR asset currently ships a USDZ too

/** True when a painting has committed /ar GLB (+ USDZ) assets.
 *  Co-located with the component by the orchestrator's spec (one file exports
 *  both `ArtworkAR` and `hasArAsset`); the Fast-Refresh rule is waived for this
 *  small pure predicate — it carries no component state. */
// eslint-disable-next-line react-refresh/only-export-components
export function hasArAsset(paintingId: string): boolean {
  return AR_IDS.has(paintingId);
}

interface ArtworkARProps {
  paintingId: string;
  colourwayName?: string;
  alt: string;
  /** Real-world print width in cm (anchor tier) — for the caption only. */
  widthCm: number;
  /** Real-world print height in cm (anchor tier) — for the caption only. */
  heightCm: number;
  /** Override poster src (jpg path). Defaults to the painting's -w800 webp. */
  posterSrc?: string;
  className?: string;
}

/**
 * Resolve the best poster: caller override → the painting's original-colourway
 * -w800 webp variant (small, fast) → the plain webp → the original jpg.
 */
function resolvePoster(paintingId: string, posterSrc?: string): string {
  if (posterSrc) return asset(posterSrc);

  const painting = getPaintingById(paintingId);
  const jpg =
    painting?.colourways.find((c) => c.isOriginal)?.image ??
    painting?.colourways[0]?.image;
  if (!jpg) return "";

  // Prefer the -w800 webp variant if one exists on disk (manifest-driven).
  const widths = IMAGE_VARIANT_WIDTHS[jpg];
  if (widths?.includes(800) && jpg.endsWith(".jpg")) {
    return asset(`${jpg.slice(0, -4)}-w800.webp`);
  }
  // Fall back to the full-size webp sibling, then the jpg.
  return asset(webp(jpg));
}

export function ArtworkAR({
  paintingId,
  colourwayName,
  alt,
  widthCm,
  heightCm,
  posterSrc,
  className,
}: ArtworkARProps) {
  const reduceMotion = useReducedMotion();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLElement | null>(null);

  // `loaded` = the model-viewer module has been imported (so we may render the
  // custom element). `revealed` = the model itself finished loading (dismiss the
  // poster). Until `loaded`, we show ONLY the poster image — never a blank box.
  const [loaded, setLoaded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  // `failed` = the model errored (bad/missing GLB, WebGL fault) → keep the poster
  // and drop the viewer, so the user never sees a broken/empty canvas.
  const [failed, setFailed] = useState(false);

  const poster = resolvePoster(paintingId, posterSrc);
  const glbSrc = asset(`/ar/${paintingId}-${AR_ASSET_VERSION}.glb`);
  const usdzSrc = asset(`/ar/${paintingId}-${AR_ASSET_VERSION}.usdz`);

  // --- Lazy-load @google/model-viewer when the sentinel scrolls into view. ---
  useEffect(() => {
    if (loaded) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      // No IO → load eagerly (still correct, just not deferred).
      void import("@google/model-viewer").then(() => setLoaded(true));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            io.disconnect();
            void import("@google/model-viewer").then(() => setLoaded(true));
            break;
          }
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loaded]);

  // --- Fade the React poster out on 'load' (model-viewer's own poster auto-
  //     dismisses since reveal defaults to "auto"); fall back to poster-only on
  //     'error' so a failed model never shows a blank/broken canvas. ---
  useEffect(() => {
    if (!loaded) return;
    const v = viewerRef.current;
    if (!v) return;
    const onLoad = () => setRevealed(true);
    const onError = () => {
      setFailed(true);
      setRevealed(false);
    };
    v.addEventListener("load", onLoad);
    v.addEventListener("error", onError);
    // If it already loaded before this listener attached, reveal now.
    // (model-viewer sets `.loaded` once the model is ready.)
    if ((v as unknown as { loaded?: boolean }).loaded) setRevealed(true);
    return () => {
      v.removeEventListener("load", onLoad);
      v.removeEventListener("error", onError);
    };
  }, [loaded]);

  return (
    <figure className={cn("relative", className)}>
      {/* IO sentinel — triggers the lazy import. Zero-height, full-width. */}
      <div ref={sentinelRef} className="pointer-events-none absolute inset-x-0 top-0 h-px" />

      <div className="relative aspect-square w-full overflow-hidden rounded-sm bg-bg ring-1 ring-ink/10">
        {/* Poster — always present beneath the viewer; covers the load gap and
            the no-WebGL fallback. Hidden once the model reveals. */}
        {poster && (
          <img
            src={poster}
            alt={alt}
            className={cn(
              // pointer-events-none so the (faded) poster never sits on top of and
              // swallows taps/drag once the interactive model is revealed.
              "pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
              revealed ? "opacity-0" : "opacity-100",
            )}
            loading="lazy"
            decoding="async"
            aria-hidden={revealed ? "true" : undefined}
          />
        )}

        {loaded && !failed && (
          <model-viewer
            ref={viewerRef}
            src={glbSrc}
            // Only advertise Quick Look when a USDZ actually exists for this id
            // (gated on AR_USDZ_IDS) — a GLB-only painting omits ios-src and
            // model-viewer hides Quick Look on iOS rather than 404-ing it.
            ios-src={AR_USDZ_IDS.has(paintingId) ? usdzSrc : undefined}
            alt={alt}
            poster={poster || undefined}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-placement="wall"
            ar-scale="fixed"
            camera-controls
            shadow-intensity="1"
            environment-image="neutral"
            exposure="1"
            loading="eager"
            // No auto-rotate under reduced motion (and model-viewer's default is
            // already no auto-rotate — we simply never opt in).
            style={{
              width: "100%",
              height: "100%",
              // @ts-expect-error CSS custom props for model-viewer's UI — on-palette.
              "--poster-color": "transparent",
            }}
          />
        )}
      </div>

      <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted">
          View in your room
          {colourwayName ? <span className="text-ink/45"> · {colourwayName}</span> : null}
        </span>
        <span className="font-sans text-[12.5px] text-ink-muted">
          Shown at true size — {widthCm} × {heightCm} cm
        </span>
      </figcaption>

      {/* Quiet helper line, monochrome, Hanken. */}
      <p className="mt-1 font-sans text-[12.5px] leading-[1.6] text-ink/45">
        {reduceMotion
          ? "Tap the AR icon to place this print on your wall."
          : "Drag to rotate. On a phone or tablet, tap the AR icon to place this print on your own wall at its real size."}
      </p>
    </figure>
  );
}
