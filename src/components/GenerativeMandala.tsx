import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";

/**
 * Scroll-driven, line-by-line vector reconstruction of Stephen's
 * six-petal rosette mandala.
 *
 * The section is 230vh tall with a sticky inner pinned to the viewport.
 * Across scroll progress 0 → 0.5 the figure draws itself in stages —
 * outer cosmic dots, sunburst rays, concentric framing rings, the
 * ornamental band, the inner ring, the six-petal rosette, the inner
 * echo, the six satellite circles with spirals, and finally the
 * nucleus. Everything is fully drawn at the centre of the scroll
 * window; 0.5 → 1.0 holds the figure with a gentle further settle.
 *
 * No rotation, no scale, no image — just paths drawing themselves
 * with stroke-dashoffset tied to scroll, plus a starfield of cosmic
 * dots that fade in across the same window.
 */

type Pt = { x: number; y: number };

// ─── Per-path scroll-driven drawer ──────────────────────────────────────────
// Each path is its own component so its useTransform stays at the top of a
// React render — no hooks inside .map() loops.

const PathDrawer = ({
  start,
  end,
  progress,
  d,
  stroke,
  strokeWidth,
  transform,
}: {
  start: number;
  end: number;
  progress: MotionValue<number>;
  d: string;
  stroke: string;
  strokeWidth: number;
  transform?: string;
}) => {
  const offset = useTransform(progress, [start, end], [1, 0], { clamp: true });
  return (
    <motion.path
      d={d}
      transform={transform}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={1}
      style={{ strokeDashoffset: offset }}
      vectorEffect="non-scaling-stroke"
    />
  );
};

const CircleDrawer = ({
  start,
  end,
  progress,
  cx,
  cy,
  r,
  stroke,
  strokeWidth,
}: {
  start: number;
  end: number;
  progress: MotionValue<number>;
  cx: number;
  cy: number;
  r: number;
  stroke: string;
  strokeWidth: number;
}) => {
  const offset = useTransform(progress, [start, end], [1, 0], { clamp: true });
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={r}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill="none"
      pathLength={1}
      strokeDasharray={1}
      style={{ strokeDashoffset: offset }}
      vectorEffect="non-scaling-stroke"
    />
  );
};

const DotFader = ({
  start,
  end,
  progress,
  cx,
  cy,
  r,
  fill,
}: {
  start: number;
  end: number;
  progress: MotionValue<number>;
  cx: number;
  cy: number;
  r: number;
  fill: string;
}) => {
  const opacity = useTransform(progress, [start, end], [0, 1], { clamp: true });
  return <motion.circle cx={cx} cy={cy} r={r} fill={fill} style={{ opacity }} />;
};

const LineDrawer = ({
  start,
  end,
  progress,
  x1,
  y1,
  x2,
  y2,
  stroke,
  strokeWidth,
}: {
  start: number;
  end: number;
  progress: MotionValue<number>;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
}) => {
  const offset = useTransform(progress, [start, end], [1, 0], { clamp: true });
  return (
    <motion.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={stroke}
      strokeWidth={strokeWidth}
      pathLength={1}
      strokeDasharray={1}
      strokeLinecap="round"
      style={{ strokeDashoffset: offset }}
      vectorEffect="non-scaling-stroke"
    />
  );
};

// ─── Geometry ──────────────────────────────────────────────────────────────

const VB = 800; // viewBox size
const CX = VB / 2;
const CY = VB / 2;

const R_OUTER = 360;
const R_BAND_OUT = 320;
const R_BAND_IN = 280;
const R_INNER = 248;
const R_PETAL = 188; // tip distance from centre
const R_PETAL_INNER = 124;
const R_SAT = 100;
const SAT_SIZE = 26;

// 100 cosmic dots scattered outside the outer ring
const cosmicDots = Array.from({ length: 100 }).map((_, i): Pt & { r: number; seed: number } => {
  // Deterministic pseudo-scatter using i
  const angle = (i * 137.508) * (Math.PI / 180); // golden angle for even distribution
  const minR = R_OUTER + 18;
  const maxR = R_OUTER + 110;
  const radius = minR + ((i * 19) % (maxR - minR));
  return {
    x: CX + radius * Math.cos(angle),
    y: CY + radius * Math.sin(angle),
    r: 0.7 + ((i * 7) % 5) * 0.25,
    seed: i,
  };
});

// 72 sunburst rays radiating from just outside the outer band
const rays = Array.from({ length: 72 }).map((_, i) => {
  const a = (i * 5) * (Math.PI / 180);
  const inner = R_OUTER + 6;
  const outer = R_OUTER + 22 + (i % 3) * 8;
  return {
    x1: CX + inner * Math.cos(a),
    y1: CY + inner * Math.sin(a),
    x2: CX + outer * Math.cos(a),
    y2: CY + outer * Math.sin(a),
    seed: i,
  };
});

// 48 decorative dots inside the band
const bandRadius = (R_BAND_OUT + R_BAND_IN) / 2;
const bandDots = Array.from({ length: 48 }).map((_, i) => {
  const a = (i * (360 / 48)) * (Math.PI / 180);
  return { x: CX + bandRadius * Math.cos(a), y: CY + bandRadius * Math.sin(a) };
});

// 24 radial ornamental ticks across the band
const bandTicks = Array.from({ length: 24 }).map((_, i) => {
  const a = (i * 15) * (Math.PI / 180);
  return {
    x1: CX + R_BAND_OUT * Math.cos(a),
    y1: CY + R_BAND_OUT * Math.sin(a),
    x2: CX + (R_BAND_OUT - 18) * Math.cos(a),
    y2: CY + (R_BAND_OUT - 18) * Math.sin(a),
  };
});

// Petal path — pointed lens, centred on (0,0), pointing up
const PETAL_W = 60;
const petalPath = `
  M 0 0
  C ${-PETAL_W} ${-R_PETAL * 0.34} ${-PETAL_W} ${-R_PETAL * 0.72} 0 ${-R_PETAL}
  C ${PETAL_W} ${-R_PETAL * 0.72} ${PETAL_W} ${-R_PETAL * 0.34} 0 0
  Z
`;
const innerPetalPath = `
  M 0 0
  C ${-PETAL_W * 0.7} ${-R_PETAL_INNER * 0.34} ${-PETAL_W * 0.7} ${-R_PETAL_INNER * 0.72} 0 ${-R_PETAL_INNER}
  C ${PETAL_W * 0.7} ${-R_PETAL_INNER * 0.72} ${PETAL_W * 0.7} ${-R_PETAL_INNER * 0.34} 0 0
  Z
`;

// 6 satellite circles between petals (offset 30° from petals)
const satellites = Array.from({ length: 6 }).map((_, i) => {
  const a = (i * 60 + 30 - 90) * (Math.PI / 180);
  return { x: CX + R_SAT * Math.cos(a), y: CY + R_SAT * Math.sin(a) };
});

// Spiral path for satellites + nucleus
const spiralPath = (cxS: number, cyS: number, R: number) => {
  const turns = 1.6;
  const N = 36;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = turns * 2 * Math.PI * t;
    const rr = R * t;
    const x = cxS + rr * Math.cos(a);
    const y = cyS + rr * Math.sin(a);
    d += (i === 0 ? "M " : "L ") + x.toFixed(2) + " " + y.toFixed(2) + " ";
  }
  return d.trim();
};

// ─── Colours ───────────────────────────────────────────────────────────────
const INK = "rgba(245, 236, 214, 0.95)";
const GOLD = "rgba(220, 168, 76, 0.95)";
const ACCENT = "rgba(201, 120, 68, 0.85)";

// ─── Component ─────────────────────────────────────────────────────────────

export const GenerativeMandala = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Reduced-motion fallback — pin progress at 1 so everything renders drawn
  const fullProgress = useTransform(scrollYProgress, [0, 1], [1, 1]);
  const progress = reduceMotion ? fullProgress : scrollYProgress;

  return (
    <section
      ref={ref}
      className="relative w-full"
      style={{ height: "230vh" }}
      aria-label="Sacred geometry mandala — drawn line by line as you scroll"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center">
          <svg
            viewBox={`0 0 ${VB} ${VB}`}
            className="w-[min(98vh,98vw)] h-[min(98vh,98vw)]"
            fill="none"
          >
            {/* === Stage 1 (0.00 → 0.08): cosmic dots fade in === */}
            {cosmicDots.map((d) => {
              const stagger = (d.seed / cosmicDots.length) * 0.08;
              return (
                <DotFader
                  key={`cd-${d.seed}`}
                  cx={d.x}
                  cy={d.y}
                  r={d.r}
                  fill={d.seed % 3 === 0 ? GOLD : INK}
                  start={stagger}
                  end={stagger + 0.05}
                  progress={progress}
                />
              );
            })}

            {/* === Stage 2 (0.08 → 0.22): sunburst rays draw outward === */}
            {rays.map((r, i) => {
              const stagger = 0.08 + (i / rays.length) * 0.12;
              return (
                <LineDrawer
                  key={`ray-${i}`}
                  x1={r.x1}
                  y1={r.y1}
                  x2={r.x2}
                  y2={r.y2}
                  stroke={GOLD}
                  strokeWidth={0.9}
                  start={stagger}
                  end={stagger + 0.02}
                  progress={progress}
                />
              );
            })}

            {/* === Stage 3 (0.22 → 0.30): outer regulating circle === */}
            <CircleDrawer
              cx={CX}
              cy={CY}
              r={R_OUTER}
              stroke={INK}
              strokeWidth={1.4}
              start={0.22}
              end={0.30}
              progress={progress}
            />

            {/* === Stage 4 (0.30 → 0.40): outer band — two concentric === */}
            <CircleDrawer
              cx={CX}
              cy={CY}
              r={R_BAND_OUT}
              stroke={INK}
              strokeWidth={1.1}
              start={0.30}
              end={0.36}
              progress={progress}
            />
            <CircleDrawer
              cx={CX}
              cy={CY}
              r={R_BAND_IN}
              stroke={INK}
              strokeWidth={1.1}
              start={0.32}
              end={0.38}
              progress={progress}
            />

            {/* === Stage 5 (0.38 → 0.46): 24 band ticks === */}
            {bandTicks.map((t, i) => {
              const stagger = 0.38 + (i / bandTicks.length) * 0.07;
              return (
                <LineDrawer
                  key={`bt-${i}`}
                  x1={t.x1}
                  y1={t.y1}
                  x2={t.x2}
                  y2={t.y2}
                  stroke={ACCENT}
                  strokeWidth={1.0}
                  start={stagger}
                  end={stagger + 0.015}
                  progress={progress}
                />
              );
            })}

            {/* === Stage 6 (0.40 → 0.48): 48 band dots === */}
            {bandDots.map((d, i) => {
              const stagger = 0.40 + (i / bandDots.length) * 0.08;
              return (
                <DotFader
                  key={`bd-${i}`}
                  cx={d.x}
                  cy={d.y}
                  r={2.6}
                  fill={GOLD}
                  start={stagger}
                  end={stagger + 0.012}
                  progress={progress}
                />
              );
            })}

            {/* === Stage 7 (0.46 → 0.52): inner circle === */}
            <CircleDrawer
              cx={CX}
              cy={CY}
              r={R_INNER}
              stroke={INK}
              strokeWidth={1.1}
              start={0.46}
              end={0.52}
              progress={progress}
            />

            {/* === Stage 8 (0.50 → 0.78): six-petal rosette, one petal at a time === */}
            {Array.from({ length: 6 }).map((_, i) => {
              const stagger = 0.50 + (i / 6) * 0.18;
              return (
                <PathDrawer
                  key={`petal-${i}`}
                  d={petalPath}
                  transform={`translate(${CX} ${CY}) rotate(${i * 60})`}
                  stroke={INK}
                  strokeWidth={1.6}
                  start={stagger}
                  end={stagger + 0.04}
                  progress={progress}
                />
              );
            })}

            {/* === Stage 9 (0.70 → 0.86): inner petal echoes (accent) === */}
            {Array.from({ length: 6 }).map((_, i) => {
              const stagger = 0.70 + (i / 6) * 0.10;
              return (
                <PathDrawer
                  key={`petal2-${i}`}
                  d={innerPetalPath}
                  transform={`translate(${CX} ${CY}) rotate(${i * 60})`}
                  stroke={ACCENT}
                  strokeWidth={1.2}
                  start={stagger}
                  end={stagger + 0.03}
                  progress={progress}
                />
              );
            })}

            {/* === Stage 10 (0.80 → 0.92): satellite circles === */}
            {satellites.map((s, i) => {
              const stagger = 0.80 + (i / 6) * 0.08;
              return (
                <CircleDrawer
                  key={`sat-${i}`}
                  cx={s.x}
                  cy={s.y}
                  r={SAT_SIZE}
                  stroke={INK}
                  strokeWidth={1.3}
                  start={stagger}
                  end={stagger + 0.025}
                  progress={progress}
                />
              );
            })}

            {/* === Stage 11 (0.86 → 0.96): spirals inside satellites === */}
            {satellites.map((s, i) => {
              const stagger = 0.86 + (i / 6) * 0.07;
              return (
                <PathDrawer
                  key={`spiral-${i}`}
                  d={spiralPath(s.x, s.y, SAT_SIZE - 5)}
                  stroke={ACCENT}
                  strokeWidth={0.9}
                  start={stagger}
                  end={stagger + 0.03}
                  progress={progress}
                />
              );
            })}

            {/* === Stage 12 (0.94 → 1.00): central nucleus === */}
            <CircleDrawer
              cx={CX}
              cy={CY}
              r={20}
              stroke={INK}
              strokeWidth={1.4}
              start={0.94}
              end={0.98}
              progress={progress}
            />
            <PathDrawer
              d={spiralPath(CX, CY, 15)}
              stroke={GOLD}
              strokeWidth={1.0}
              start={0.96}
              end={1.0}
              progress={progress}
            />
          </svg>
        </div>
      </div>
    </section>
  );
};
