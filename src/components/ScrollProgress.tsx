import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";

/**
 * ScrollProgress — a hairline accent bar pinned to the very top of the
 * viewport that fills as the reader moves down a long page. Spring-smoothed so
 * it glides rather than jitters. Renders nothing under prefers-reduced-motion.
 * Mount only on long pages (About, PaintingDetail, FAQ) — not the home page.
 */
export const ScrollProgress = () => {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  if (reduce) return null;
  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed top-0 inset-x-0 h-px bg-accent/70 z-[60] origin-left pointer-events-none"
    />
  );
};
