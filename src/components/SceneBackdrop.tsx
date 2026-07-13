import { asset } from "../lib/asset";

/**
 * SceneBackdrop — the canonical fixed page-scene backdrop.
 *
 * Pass ONE pre-blurred WebP (`src="..."`), OR an ARRAY (`src={[a, b, c]}`) —
 * either way it renders the FIRST scene as a plain STATIC full-bleed layer
 * under the EXACT shared scrim, clipped by the overflow-hidden parent. (The old
 * scroll-parallax + crossfade + inset-[-8%] overscan jumped to a stale scroll
 * position on route transitions, reading as a zoom+jump — so it's static now.)
 *
 * Render as the FIRST child of a `relative` page root; put `relative z-10` on
 * the <main>.
 */
// Unified site-wide scrim 2026-06-20 (Hugo: "whatever's best looking"). The
// best balance from an A/B: the dark 0.60→0.88 buried the (bright) photos, the
// light 0.38→0.80 risked text on busy images — this MIDDLE keeps every scene
// vivid + visible while the cream copy still reads. EVERY scene page uses this
// exact value so the site is coherent across pages + platforms.
// 2026-07-07 (Hugo: "reveal the background clearer on every page like home"):
// lightened the top/mid so the scene READS like the home Pavo backdrop, while
// keeping the FOOT heavy (0.52) where body copy sits so cream text stays legible.
export const SCENE_SCRIM =
  "linear-gradient(180deg, rgba(8,7,6,0.12) 0%, rgba(8,7,6,0.26) 42%, rgba(8,7,6,0.52) 100%)";

/** Brightness/saturation lift applied to the scene image layer so the (baked-
 *  dark) photos read CLEARLY — like the home backdrop — under the lighter scrim.
 *  Reversible CSS, no asset re-bake. Cream copy stays legible because SCENE_SCRIM
 *  still carries a floor of shading, heaviest at the foot where body copy sits. */
const SCENE_IMAGE_FILTER = "brightness(1.62) saturate(1.14)";

export const SceneBackdrop = ({ src }: { src: string | string[] }) => {
  // STATIC backdrop — no parallax, no overscan, no crossfade. A fixed page
  // backdrop that applied a scroll-parallax transform + inset-[-8%] overscan
  // jumped to a stale scroll position when a new page mounted during a route
  // transition, reading as a zoom+jump. Holding the FIRST scene as a plain
  // static bg-cover layer (the old reduced-motion markup) fixes that.
  const urls = (Array.isArray(src) ? src : [src]).map((s) => asset(s));

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        style={{
          backgroundImage: `url("${urls[0]}")`,
          filter: SCENE_IMAGE_FILTER,
          willChange: "auto",
        }}
        className="absolute inset-0 bg-cover bg-center"
        aria-hidden="true"
      />
      {/* Shared scrim — the EXACT gradient every scene page uses. */}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: SCENE_SCRIM }} />
    </div>
  );
};
