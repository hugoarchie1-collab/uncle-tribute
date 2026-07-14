import { useEffect, useRef, useSyncExternalStore } from "react";
import { useReducedMotion } from "framer-motion";
import { asset } from "../lib/asset";

/** Live "(pointer: fine)" — true only for mouse/trackpad (no touch hover). Gates
 *  the cursor-reveal without a setState-in-effect. */
const subscribeFinePointer = (cb: () => void) => {
  const mq = window.matchMedia("(pointer: fine)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const usePointerFine = () =>
  useSyncExternalStore(
    subscribeFinePointer,
    () => window.matchMedia("(pointer: fine)").matches,
    () => false,
  );

/**
 * SceneBackdrop — the canonical fixed page-scene backdrop.
 *
 * Pass ONE pre-blurred WebP (`src="..."`), OR an ARRAY (`src={[a, b, c]}`) —
 * either way it renders the FIRST scene as a plain STATIC full-bleed layer
 * under the EXACT shared scrim, clipped by the overflow-hidden parent. (The old
 * scroll-parallax + crossfade + inset-[-8%] overscan jumped to a stale scroll
 * position on route transitions, reading as a zoom+jump — so it's static now.)
 *
 * CURSOR-REVEAL (2026-07-14, Hugo: "apply that reveal to every single page"):
 * on a fine pointer with motion allowed, a cursor-following spotlight shows the
 * SAME scene image CLARIFIED (brighter, more saturated, higher contrast, scrim
 * lifted) — so the backdrop "gets clearer where you point", the same affordance
 * the home/About Pavo backdrop has. It's the same image at a livelier grade (not
 * a second file), so it can never mismatch and aligns to the pixel. The spotlight
 * WINDOW carries a STATIC circular mask and moves by transform only (compositor
 * thread, zero per-move repaint); inside, a viewport-sized clarified copy
 * counter-translates to stay pinned. Touch / reduced-motion render nothing extra.
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

/** The livelier grade shown inside the cursor spotlight — the "clear" reveal:
 *  brighter + more saturated + a touch more contrast so the scene POPS where the
 *  pointer is, over the softer scrimmed base. */
const SCENE_REVEAL_FILTER = "brightness(2.05) saturate(1.5) contrast(1.24)";

export const SceneBackdrop = ({ src }: { src: string | string[] }) => {
  // STATIC backdrop — no parallax, no overscan, no crossfade (see history above).
  const urls = (Array.isArray(src) ? src : [src]).map((s) => asset(s));

  const reduceMotion = useReducedMotion();
  const pointerFine = usePointerFine();
  // Cursor-reveal: desktop (fine pointer) + motion allowed only. Touch has no
  // hover; reduced-motion opts out. Derived — never setState.
  const reveal = !reduceMotion && pointerFine;

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!reveal) return;
    // One rAF-coalesced pointer read writes the cursor px to CSS vars on the
    // root; the spotlight window + its counter-translated clarified layer both
    // derive their transforms from those vars, so one write moves the reveal.
    const el = rootRef.current;
    if (!el) return;
    let x = window.innerWidth / 2;
    let y = window.innerHeight * 0.4;
    let raf = 0;
    const apply = () => {
      raf = 0;
      el.style.setProperty("--scene-mx", `${x}px`);
      el.style.setProperty("--scene-my", `${y}px`);
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = window.requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [reveal]);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{
        ["--scene-r" as string]: "clamp(180px, 22vw, 320px)",
        ["--scene-d" as string]: "calc(2 * var(--scene-r))",
      }}
    >
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
      {/* CURSOR-REVEAL spotlight — sits ABOVE the scrim so the disc shows the
          clarified scene unshaded. A --scene-d square WINDOW carries a STATIC
          circular mask and is moved by transform; inside, a viewport-sized copy
          of the SAME scene (livelier grade) counter-translates to stay pinned, so
          only the lit disc reveals the "clearer" scene. */}
      {reveal && (
        <div
          aria-hidden="true"
          className="absolute left-0 top-0"
          style={{
            width: "var(--scene-d)",
            height: "var(--scene-d)",
            transform:
              "translate3d(calc(var(--scene-mx, 50vw) - var(--scene-r)), calc(var(--scene-my, 40vh) - var(--scene-r)), 0)",
            WebkitMaskImage:
              "radial-gradient(circle at center, #000 0%, #000 34%, transparent 72%)",
            maskImage:
              "radial-gradient(circle at center, #000 0%, #000 34%, transparent 72%)",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            willChange: "transform",
          }}
        >
          <div
            className="absolute left-0 top-0 bg-cover bg-center"
            style={{
              width: "100vw",
              height: "100vh",
              backgroundImage: `url("${urls[0]}")`,
              filter: SCENE_REVEAL_FILTER,
              transform:
                "translate3d(calc(var(--scene-r) - var(--scene-mx, 50vw)), calc(var(--scene-r) - var(--scene-my, 40vh)), 0)",
              willChange: "transform",
            }}
          />
        </div>
      )}
    </div>
  );
};
