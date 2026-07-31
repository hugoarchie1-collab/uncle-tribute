import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * AMBIENT BACKGROUND — the site-wide base "wallpaper" layer.
 *
 * Hugo hates plain black: every page should feel like a calm, subtle iPhone-style
 * dark wallpaper — mostly near-black (#0a0908) with a WHISPER of soft colour that
 * slowly drifts as you scroll, never busy, never bright enough to out-shout the
 * cream text.
 *
 * This is a FIXED, full-viewport, pointer-events-none layer mounted ONCE at the
 * app root, BEHIND every route. It carries an opaque near-black base plus three
 * very large, very soft radial colour glows (deep indigo · warm rust · muted
 * violet, each at ~0.10–0.16 opacity fading to transparent). As the reader
 * scrolls the whole page, two bands drift a few percent in opposite directions
 * and a third gently breathes its opacity — a living-but-calm wash. Motion is
 * scroll-linked (Framer `useScroll`) and kept to `transform` / `opacity` only
 * (GPU-composited, per the house rule). `prefers-reduced-motion` pins it static.
 *
 * LAYERING: it sits at `z-0` and is mounted directly after `AmbientBackdrop`, so
 * it is the effective base on pages that carry NO backdrop of their own (About,
 * Basket, Contact, FAQ, Legal, Order result, 404 …) — nothing is ever bare
 * black. Pages that DO own a backdrop (the home `PavoBackdrop`, the PDP `.pd-*`
 * layers, collection/scene backdrops) render later in the DOM at `z-0` and paint
 * OVER this base, exactly as they already paint over `AmbientBackdrop` — so this
 * changes nothing for them; it only fills the plain-black void underneath.
 */
export const AmbientBackground = () => {
  const reduced = useReducedMotion();
  // Whole-page scroll progress (0 at the top → 1 at the foot). No target ref =
  // the document scroll, so the wash breathes across the entire read.
  const { scrollYProgress } = useScroll();

  // Gentle, opposed vertical drift — a few percent of the viewport across the
  // ENTIRE page scroll, so the colour slowly shifts as you read. Never fast,
  // never far (edges are over-sized so the drift can't reveal a seam).
  const driftDown = useTransform(scrollYProgress, [0, 1], ["-4%", "9%"]);
  const driftUp = useTransform(scrollYProgress, [0, 1], ["5%", "-8%"]);
  // The violet band merely breathes its presence — a slow opacity swell that
  // peaks mid-page — so the wash feels alive without moving.
  const violetOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.55, 1, 0.6]);

  return (
    <div
      aria-hidden="true"
      className="ambient-bg fixed inset-0 z-0 pointer-events-none overflow-hidden"
    >
      {/* Deep indigo — top-biased; drifts DOWN as you scroll. */}
      <motion.div
        className="ambient-bg__glow ambient-bg__glow--indigo"
        style={reduced ? undefined : { y: driftDown }}
      />
      {/* Warm rust (the sole chromatic accent, kept faint) — foot-biased;
          drifts UP, so it and the indigo pass each other slowly. */}
      <motion.div
        className="ambient-bg__glow ambient-bg__glow--rust"
        style={reduced ? undefined : { y: driftUp }}
      />
      {/* Muted violet — central; a slow opacity swell rather than a move. */}
      <motion.div
        className="ambient-bg__glow ambient-bg__glow--violet"
        style={reduced ? undefined : { opacity: violetOpacity }}
      />
    </div>
  );
};
