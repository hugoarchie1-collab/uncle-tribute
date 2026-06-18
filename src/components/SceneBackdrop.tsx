import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { asset } from "../lib/asset";

/**
 * SceneBackdrop — the canonical fixed page-scene backdrop.
 *
 * The single shared source for the treatment every scene page uses: one
 * pre-blurred + pre-darkened WebP (baked to the site's dark-family band so it
 * never out-shouts the cream copy) rendered full-bleed under the EXACT shared
 * scrim. The image drifts ±6% over the WHOLE-PAGE scroll (target-less useScroll),
 * overscanned inset-[-8%] so the parallax can never expose an uncovered strip
 * (the parent is overflow-hidden, so the overscan is clipped). Reduced-motion
 * drops the parallax and holds the layer static, releasing the GPU promotion.
 *
 * Mirrors the inline ScrollBackdrop/ContactBackdrop/FaqBackdrop pattern on the
 * other scene pages — same DOM, same scrim string, byte-for-byte. Render it as
 * the FIRST child of a `relative` page root; put `relative z-10` on the <main>.
 *
 * Usage: <SceneBackdrop src="/img/scenes/<name>-blur-v1.webp" />
 */
export const SCENE_SCRIM =
  "linear-gradient(180deg, rgba(8,7,6,0.38) 0%, rgba(8,7,6,0.60) 42%, rgba(8,7,6,0.80) 100%)";

export const SceneBackdrop = ({ src }: { src: string }) => {
  const reduceMotion = useReducedMotion();
  // No `target` → tracks the whole-document scroll for one page-wide drift.
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);
  const url = asset(src);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {reduceMotion ? (
        <div
          style={{ backgroundImage: `url("${url}")`, willChange: "auto" }}
          className="absolute inset-0 bg-cover bg-center"
          aria-hidden="true"
        />
      ) : (
        <motion.div
          style={{ y, backgroundImage: `url("${url}")`, willChange: "transform" }}
          // OVERSCAN 8% beyond every edge so the ±6% parallax `y` shift can NEVER
          // expose an uncovered strip — the parent is overflow-hidden, so it clips.
          className="absolute inset-[-8%] bg-cover bg-center"
          aria-hidden="true"
        />
      )}
      {/* Shared scrim — the EXACT gradient every scene page uses. */}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: SCENE_SCRIM }} />
    </div>
  );
};
