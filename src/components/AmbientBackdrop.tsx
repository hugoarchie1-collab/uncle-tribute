import { useEffect, useState } from "react";

/**
 * Canonical fixed atmospheric backdrop.
 *
 * Every page in the system carries an atmospheric layer behind its content —
 * Welcome (peacock colourways crossfading on scroll), Collections (collection
 * scenes), PaintingDetail (the blurred painting). Utility + editorial pages
 * (About, Basket, Contact, FAQ, Legal, Order result, 404) had NONE — which is
 * the single biggest reason they read as a separate, flatter microsite.
 *
 * This is the single-image version of that layer: one pre-blurred peacock WebP
 * at low opacity + the EXACT shared scrim used across the site, so a page reads
 * as part of the same world without the cost of a scroll-crossfade. Static
 * (fixed) — fine for both one-screen pages and long editorial scrolls.
 *
 * Usage: render as the FIRST child of a `relative` page root, then put
 * `relative z-10` on the page's <main> (and drop any opaque `bg-bg` from root).
 */
export const AmbientBackdrop = ({
  opacity = 0.9,
}: {
  /** How present the dark atmospheric wash is. */
  opacity?: number;
}) => {
  // This layer never moves or crossfades — it's a single static fixed image.
  // The only reason to keep a compositor layer alive is to stop the browser
  // re-rasterising the fixed bg-cover image every frame as content scrolls
  // OVER it (the #6 "lag" class of bug). Under prefers-reduced-motion we
  // release the promotion entirely — no motion means no need for an extra
  // GPU layer, and the static visual is identical.
  // Read the current preference in a LAZY INITIALISER (correct from first paint,
  // no synchronous setState in the effect → no cascading render); the effect then
  // only SUBSCRIBES to later changes.
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // GPU compositing (NOT background-attachment:fixed, NOT a scroll repaint):
  // translateZ(0) promotes this fixed layer to its own compositor layer so the
  // bg-cover image is rasterised ONCE and the page composites over it. Mirrors
  // the proven .painting-detail__ambient pattern in global.css.
  const promote = reducedMotion
    ? undefined
    : { transform: "translateZ(0)", willChange: "transform" as const };

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={promote}
    >
      {/* ⚠️ NO IMAGE — a quiet dark gradient only. This layer exists ONLY to
          fill the route-transition GAP before the incoming page's own backdrop
          loads. It used to be a bg-cover peacock photo, which — center-cropped —
          read as a "zoomed / random image" flashing IN AND OUT on every page
          click (Hugo 2026-07-08, twice). A pure dark gradient fills the gap
          invisibly: there is no image, so nothing can zoom or look random; the
          dissolve reads scene → calm dark → scene. `opacity` still tunes how
          present it is. Do NOT put an image back here. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 95% at 50% 32%, #18121e 0%, #0e0b12 46%, #0a0908 100%)",
          opacity,
        }}
      />
    </div>
  );
};
