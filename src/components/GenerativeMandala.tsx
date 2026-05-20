import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/**
 * Scroll-driven sacred-geometry mandala. The Flower of Life inscribed in
 * a regulated polygon scaffold. Each stroke uses pathLength=1 with
 * strokeDashoffset tied to scrollYProgress, so the figure draws itself
 * as the user scrolls past the section.
 */
export const GenerativeMandala = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.2"],
  });

  // 0 = not yet drawn, 1 = fully drawn. We map to strokeDashoffset 1→0.
  const offset = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-12, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.15], [0.35, 1]);

  // Flower of Life: 7 overlapping circles, radius r, centres on hex grid
  const R = 70;
  const cx = 300;
  const cy = 300;
  const flower = [
    { x: cx, y: cy },
    ...Array.from({ length: 6 }).map((_, i) => {
      const a = (i * 60 - 30) * (Math.PI / 180);
      return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
    }),
  ];

  // 12 surrounding satellites (2nd ring) for depth
  const ring2 = Array.from({ length: 12 }).map((_, i) => {
    const a = (i * 30) * (Math.PI / 180);
    return { x: cx + 2 * R * Math.cos(a), y: cy + 2 * R * Math.sin(a) };
  });

  // Inscribed hexagon
  const hexPts = Array.from({ length: 6 })
    .map((_, i) => {
      const a = (i * 60) * (Math.PI / 180);
      return `${cx + 2.4 * R * Math.cos(a)},${cy + 2.4 * R * Math.sin(a)}`;
    })
    .join(" ");

  // Twelve radial spokes
  const spokes = Array.from({ length: 12 }).map((_, i) => {
    const a = (i * 30) * (Math.PI / 180);
    return {
      x1: cx + 0.6 * R * Math.cos(a),
      y1: cy + 0.6 * R * Math.sin(a),
      x2: cx + 3 * R * Math.cos(a),
      y2: cy + 3 * R * Math.sin(a),
    };
  });

  const stroke = "rgba(201, 120, 68, 0.65)"; // accent at moderate opacity
  const strokeWide = "rgba(237, 230, 214, 0.9)"; // ink for emphasis

  // If user prefers reduced motion: render fully drawn, no scroll-tie
  const dashStyle = reduceMotion ? { strokeDashoffset: 0 } : { strokeDashoffset: offset };

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden py-14 md:py-24"
      aria-label="Sacred geometry — Flower of Life"
    >
      <motion.div
        style={reduceMotion ? {} : { rotate, opacity }}
        className="mx-auto w-full max-w-[640px] aspect-square"
      >
        <svg
          viewBox="0 0 600 600"
          className="w-full h-full"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* outer regulating circle */}
          <motion.circle
            cx={cx}
            cy={cy}
            r={3 * R}
            stroke={stroke}
            strokeWidth={1}
            pathLength={1}
            strokeDasharray={1}
            style={dashStyle}
          />
          {/* hexagon */}
          <motion.polygon
            points={hexPts}
            stroke={stroke}
            strokeWidth={1}
            pathLength={1}
            strokeDasharray={1}
            style={dashStyle}
          />
          {/* 12 spokes */}
          {spokes.map((s, i) => (
            <motion.line
              key={`s${i}`}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={stroke}
              strokeWidth={0.6}
              pathLength={1}
              strokeDasharray={1}
              style={dashStyle}
            />
          ))}
          {/* outer ring of 12 small circles */}
          {ring2.map((c, i) => (
            <motion.circle
              key={`r2${i}`}
              cx={c.x}
              cy={c.y}
              r={R * 0.45}
              stroke={stroke}
              strokeWidth={0.8}
              pathLength={1}
              strokeDasharray={1}
              style={dashStyle}
            />
          ))}
          {/* Flower of Life — 7 circles */}
          {flower.map((c, i) => (
            <motion.circle
              key={`f${i}`}
              cx={c.x}
              cy={c.y}
              r={R}
              stroke={strokeWide}
              strokeWidth={1.2}
              pathLength={1}
              strokeDasharray={1}
              style={dashStyle}
            />
          ))}
        </svg>
      </motion.div>
    </section>
  );
};
