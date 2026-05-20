import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/**
 * Scroll-driven dissection of Stephen's six-petal rosette mandala.
 * Each stroke has pathLength=1 with strokeDashoffset tied to
 * scrollYProgress, so the figure reveals itself line by line as the user
 * scrolls past the section. Ordered outer → in so the eye is drawn
 * toward the centre.
 */
export const GenerativeMandala = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.2"],
  });

  // strokeDashoffset 1 → 0 across the scroll
  const offset = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-6, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.15], [0.35, 1]);
  const dotOpacity = useTransform(scrollYProgress, [0, 0.4], [0, 1]);

  const cx = 300;
  const cy = 300;

  // Concentric framing circles (outer → in)
  const RING_OUTER = 270;
  const RING_BAND_OUT = 240;
  const RING_BAND_IN = 210;
  const RING_INNER = 188;

  // Dot rings — outer cosmic specks
  const cosmicDots = Array.from({ length: 60 }).map((_, i) => {
    // pseudo-random scatter, deterministic
    const a = (i * 137.5) * (Math.PI / 180);
    const r = RING_OUTER + 8 + ((i * 13) % 24);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), r: 0.6 + ((i * 7) % 5) * 0.15 };
  });

  // Sun-burst rays: short radial dashes radiating outside the outer ring
  const rays = Array.from({ length: 72 }).map((_, i) => {
    const a = (i * 5) * (Math.PI / 180);
    const inner = RING_OUTER + 4;
    const outer = RING_OUTER + 22 + (i % 3) * 6;
    return {
      x1: cx + inner * Math.cos(a),
      y1: cy + inner * Math.sin(a),
      x2: cx + outer * Math.cos(a),
      y2: cy + outer * Math.sin(a),
    };
  });

  // Decorative band: 48 small dots between RING_BAND_OUT and RING_BAND_IN
  const bandRadius = (RING_BAND_OUT + RING_BAND_IN) / 2;
  const bandDots = Array.from({ length: 48 }).map((_, i) => {
    const a = (i * (360 / 48)) * (Math.PI / 180);
    return { x: cx + bandRadius * Math.cos(a), y: cy + bandRadius * Math.sin(a) };
  });

  // 24 ornamental ticks straddling the outer band edge
  const bandTicks = Array.from({ length: 24 }).map((_, i) => {
    const a = (i * 15) * (Math.PI / 180);
    return {
      x1: cx + RING_BAND_OUT * Math.cos(a),
      y1: cy + RING_BAND_OUT * Math.sin(a),
      x2: cx + (RING_BAND_OUT - 14) * Math.cos(a),
      y2: cy + (RING_BAND_OUT - 14) * Math.sin(a),
    };
  });

  // Six-petal rosette — pointed lens petals radiating from centre
  const PETAL_LEN = 140; // tip distance from centre
  const PETAL_W = 46; // half-width control
  const petalPath = `
    M 0 0
    C ${-PETAL_W} ${-PETAL_LEN * 0.35} ${-PETAL_W} ${-PETAL_LEN * 0.72} 0 ${-PETAL_LEN}
    C ${PETAL_W} ${-PETAL_LEN * 0.72} ${PETAL_W} ${-PETAL_LEN * 0.35} 0 0
    Z
  `;

  // Six small "satellite" circles between petals (at 30°, 90°, 150°, …)
  const SAT_R = 80; // distance from centre
  const SAT_SIZE = 18;
  const satellites = Array.from({ length: 6 }).map((_, i) => {
    const a = (i * 60 + 30 - 90) * (Math.PI / 180); // offset so they sit between petals
    return { x: cx + SAT_R * Math.cos(a), y: cy + SAT_R * Math.sin(a) };
  });

  // Tiny spirals inside each satellite
  const spiralPath = (cxs: number, cys: number, R: number) => {
    const turns = 1.8;
    const N = 36;
    let d = "";
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const a = turns * 2 * Math.PI * t;
      const rr = R * t;
      const x = cxs + rr * Math.cos(a);
      const y = cys + rr * Math.sin(a);
      d += (i === 0 ? "M " : "L ") + x.toFixed(2) + " " + y.toFixed(2) + " ";
    }
    return d.trim();
  };

  const accent = "rgba(201, 120, 68, 0.78)";
  const gold = "rgba(220, 168, 76, 0.85)";
  const ink = "rgba(237, 230, 214, 0.92)";

  const dashStyle = reduceMotion ? { strokeDashoffset: 0 } : { strokeDashoffset: offset };

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden py-14 md:py-24"
      aria-label="Sacred geometry — six-petal rosette"
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
          {/* Cosmic specks */}
          {cosmicDots.map((d, i) => (
            <motion.circle
              key={`cd${i}`}
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill={gold}
              stroke="none"
              style={reduceMotion ? { opacity: 1 } : { opacity: dotOpacity }}
            />
          ))}

          {/* Sunburst rays */}
          {rays.map((r, i) => (
            <motion.line
              key={`ray${i}`}
              x1={r.x1}
              y1={r.y1}
              x2={r.x2}
              y2={r.y2}
              stroke={gold}
              strokeWidth={0.7}
              pathLength={1}
              strokeDasharray={1}
              style={dashStyle}
            />
          ))}

          {/* Outer regulating circle */}
          <motion.circle
            cx={cx}
            cy={cy}
            r={RING_OUTER}
            stroke={ink}
            strokeWidth={1.2}
            pathLength={1}
            strokeDasharray={1}
            style={dashStyle}
          />

          {/* Outer band — two concentric circles */}
          <motion.circle
            cx={cx}
            cy={cy}
            r={RING_BAND_OUT}
            stroke={ink}
            strokeWidth={1}
            pathLength={1}
            strokeDasharray={1}
            style={dashStyle}
          />
          <motion.circle
            cx={cx}
            cy={cy}
            r={RING_BAND_IN}
            stroke={ink}
            strokeWidth={1}
            pathLength={1}
            strokeDasharray={1}
            style={dashStyle}
          />

          {/* 24 ornamental ticks in the band */}
          {bandTicks.map((t, i) => (
            <motion.line
              key={`bt${i}`}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={accent}
              strokeWidth={0.9}
              pathLength={1}
              strokeDasharray={1}
              style={dashStyle}
            />
          ))}

          {/* 48 dot ring inside the band */}
          {bandDots.map((d, i) => (
            <motion.circle
              key={`bd${i}`}
              cx={d.x}
              cy={d.y}
              r={2.2}
              stroke={gold}
              strokeWidth={0.8}
              fill={gold}
              pathLength={1}
              strokeDasharray={1}
              style={dashStyle}
            />
          ))}

          {/* Inner circle just outside the rosette */}
          <motion.circle
            cx={cx}
            cy={cy}
            r={RING_INNER}
            stroke={ink}
            strokeWidth={1}
            pathLength={1}
            strokeDasharray={1}
            style={dashStyle}
          />

          {/* Six-petal rosette */}
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.path
              key={`petal${i}`}
              d={petalPath}
              transform={`translate(${cx} ${cy}) rotate(${i * 60})`}
              stroke={ink}
              strokeWidth={1.4}
              pathLength={1}
              strokeDasharray={1}
              style={dashStyle}
            />
          ))}

          {/* Inner petal echo — second pass, smaller, accent colour */}
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.path
              key={`petal2${i}`}
              d={petalPath}
              transform={`translate(${cx} ${cy}) rotate(${i * 60}) scale(0.66)`}
              stroke={accent}
              strokeWidth={1}
              pathLength={1}
              strokeDasharray={1}
              style={dashStyle}
            />
          ))}

          {/* Six satellite circles between petals */}
          {satellites.map((s, i) => (
            <g key={`sat${i}`}>
              <motion.circle
                cx={s.x}
                cy={s.y}
                r={SAT_SIZE}
                stroke={ink}
                strokeWidth={1.1}
                pathLength={1}
                strokeDasharray={1}
                style={dashStyle}
              />
              <motion.path
                d={spiralPath(s.x, s.y, SAT_SIZE - 4)}
                stroke={accent}
                strokeWidth={0.8}
                pathLength={1}
                strokeDasharray={1}
                style={dashStyle}
              />
            </g>
          ))}

          {/* Central nucleus */}
          <motion.circle
            cx={cx}
            cy={cy}
            r={14}
            stroke={ink}
            strokeWidth={1.2}
            pathLength={1}
            strokeDasharray={1}
            style={dashStyle}
          />
          <motion.path
            d={spiralPath(cx, cy, 10)}
            stroke={gold}
            strokeWidth={0.9}
            pathLength={1}
            strokeDasharray={1}
            style={dashStyle}
          />
        </svg>
      </motion.div>
    </section>
  );
};
