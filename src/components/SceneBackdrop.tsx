import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { asset } from "../lib/asset";

/**
 * SceneBackdrop — the canonical fixed page-scene backdrop.
 *
 * Pass ONE pre-blurred WebP (`src="..."`) for a single static scene that drifts
 * ±6% over the whole-page scroll, OR an ARRAY (`src={[a, b, c]}`) for several
 * scenes that CROSS-FADE into one another across the page scroll — the home
 * peacock pattern — so a long page (e.g. the legal pages) carries every scene
 * Hugo assigned it, in order. Either way it sits full-bleed under the EXACT
 * shared scrim, overscanned inset-[-8%] so the parallax never exposes a strip,
 * clipped by the overflow-hidden parent. Reduced-motion drops the parallax +
 * crossfade and holds the first scene static.
 *
 * Render as the FIRST child of a `relative` page root; put `relative z-10` on
 * the <main>.
 */
// Unified site-wide scrim 2026-06-20 (Hugo: "whatever's best looking"). The
// best balance from an A/B: the dark 0.60→0.88 buried the (bright) photos, the
// light 0.38→0.80 risked text on busy images — this MIDDLE keeps every scene
// vivid + visible while the cream copy still reads. EVERY scene page uses this
// exact value so the site is coherent across pages + platforms.
export const SCENE_SCRIM =
  "linear-gradient(180deg, rgba(8,7,6,0.42) 0%, rgba(8,7,6,0.56) 45%, rgba(8,7,6,0.70) 100%)";

/** One crossfade layer — full during its scroll band, ramping in/out at the
 *  band boundaries (first holds from the top, last holds to the foot). Each
 *  instance owns exactly one useTransform, so the hook count stays stable. */
const CrossfadeLayer = ({
  url,
  index,
  count,
  scrollYProgress,
  y,
}: {
  url: string;
  index: number;
  count: number;
  scrollYProgress: MotionValue<number>;
  y: MotionValue<string>;
}) => {
  const w = Math.min(0.06, 0.4 / count); // half-width of each crossfade window
  const b = (k: number) => k / count; // band boundary k
  let frames: number[];
  let vals: number[];
  if (index === 0) {
    frames = [0, b(1) - w, b(1) + w];
    vals = [1, 1, 0];
  } else if (index === count - 1) {
    frames = [b(index) - w, b(index) + w, 1];
    vals = [0, 1, 1];
  } else {
    frames = [b(index) - w, b(index) + w, b(index + 1) - w, b(index + 1) + w];
    vals = [0, 1, 1, 0];
  }
  const opacity = useTransform(scrollYProgress, frames, vals);
  return (
    <motion.div
      style={{
        opacity,
        y,
        backgroundImage: `url("${url}")`,
        willChange: "transform, opacity",
      }}
      className="absolute inset-[-8%] bg-cover bg-center"
      aria-hidden="true"
    />
  );
};

export const SceneBackdrop = ({ src }: { src: string | string[] }) => {
  const reduceMotion = useReducedMotion();
  // No `target` → tracks the whole-document scroll for one page-wide drift.
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);
  const urls = (Array.isArray(src) ? src : [src]).map((s) => asset(s));

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {reduceMotion ? (
        // Reduced-motion: drop the parallax + crossfade, hold the FIRST scene
        // static, and release the GPU promotion (will-change:auto).
        <div
          style={{ backgroundImage: `url("${urls[0]}")`, willChange: "auto" }}
          className="absolute inset-0 bg-cover bg-center"
          aria-hidden="true"
        />
      ) : urls.length === 1 ? (
        <motion.div
          style={{ y, backgroundImage: `url("${urls[0]}")`, willChange: "transform" }}
          // OVERSCAN 8% so the ±6% parallax `y` can never expose an uncovered
          // strip — the parent is overflow-hidden, so it clips.
          className="absolute inset-[-8%] bg-cover bg-center"
          aria-hidden="true"
        />
      ) : (
        urls.map((url, i) => (
          <CrossfadeLayer
            key={url}
            url={url}
            index={i}
            count={urls.length}
            scrollYProgress={scrollYProgress}
            y={y}
          />
        ))
      )}
      {/* Shared scrim — the EXACT gradient every scene page uses. */}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: SCENE_SCRIM }} />
    </div>
  );
};
