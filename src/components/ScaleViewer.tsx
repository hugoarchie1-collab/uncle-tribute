import { parseSizeCm, type PrintTier } from "../data/paintings";
import { asset, webp } from "../lib/asset";
import { EYEBROW_TIGHT } from "./ui/tokens";

/**
 * ScaleViewer — an honest, vector to-scale diagram (NOT a staged room photo).
 * The print is drawn from its catalogued cm beside a standard UK internal
 * doorway (1981 × 762 mm) and a ~170 cm human silhouette, so a buyer can judge
 * A3 vs A2 vs A1 vs A0 at a glance. Hairline architectural drawing on a
 * transparent ground (the page's ambient backdrop shows through) — reverent,
 * not a showroom. Redraws instantly when the tier or colourway changes; no
 * motion, so it's reduced-motion-safe by construction.
 */
const PX_PER_CM = 2.4;
const VB_W = 1000;
const VB_H = 620;
const FLOOR_Y = 560;
const DOOR_W_CM = 76.2;
const DOOR_H_CM = 198.1;
const HUMAN_H_CM = 170;
const HANG_CENTRE_CM = 150; // print centre height off the floor

export const ScaleViewer = ({
  tier,
  imageSrc,
  alt,
}: {
  tier: PrintTier;
  imageSrc: string;
  alt: string;
}) => {
  const dims = parseSizeCm(tier.size) ?? { w: 42, h: 59.4 };

  const pw = dims.w * PX_PER_CM;
  const ph = dims.h * PX_PER_CM;
  const printX = 660 - pw / 2;
  const printY = FLOOR_Y - HANG_CENTRE_CM * PX_PER_CM - ph / 2;

  const doorW = DOOR_W_CM * PX_PER_CM;
  const doorH = DOOR_H_CM * PX_PER_CM;
  const doorX = 90;
  const doorY = FLOOR_Y - doorH;

  const humanH = HUMAN_H_CM * PX_PER_CM;
  const humanCx = 320;
  const headR = humanH * 0.075;
  const bodyW = humanH * 0.17;
  const humanTop = FLOOR_Y - humanH;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto block"
        role="img"
        aria-label={`${alt}, shown to scale beside a standard doorway`}
      >
        {/* Floor + skirting */}
        <line x1="0" y1={FLOOR_Y} x2={VB_W} y2={FLOOR_Y} stroke="currentColor" strokeWidth="1.5" className="text-ink/25" />
        <line x1="0" y1={FLOOR_Y + 9} x2={VB_W} y2={FLOOR_Y + 9} stroke="currentColor" strokeWidth="1" className="text-ink/10" />

        {/* Doorway */}
        <rect x={doorX} y={doorY} width={doorW} height={doorH} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink/25" />
        <text x={doorX + doorW / 2} y={doorY - 12} textAnchor="middle" fill="currentColor" className="text-ink/45" style={{ font: '600 11px "Hanken Grotesk", sans-serif', letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Doorway · 2.0 m
        </text>

        {/* Human silhouette (~170 cm) */}
        <g fill="currentColor" className="text-ink/15">
          <circle cx={humanCx} cy={humanTop + headR} r={headR} />
          <rect x={humanCx - bodyW / 2} y={humanTop + headR * 2.1} width={bodyW} height={humanH - headR * 2.1} rx={bodyW / 2} />
        </g>

        {/* The print — image bounded to the frame box (slice clips it), then
            a frame stroke over the top. */}
        <image
          href={asset(webp(imageSrc))}
          x={printX}
          y={printY}
          width={pw}
          height={ph}
          preserveAspectRatio="xMidYMid slice"
        />
        <rect x={printX} y={printY} width={pw} height={ph} fill="none" stroke="currentColor" strokeWidth="4" className="text-ink/85" />
      </svg>

      <figcaption className="mt-3 text-center">
        <span className="block font-sans text-[13.5px] leading-[1.5] text-ink/70">
          {tier.label} · {tier.size} — beside a standard doorway for scale
        </span>
        <span className={`${EYEBROW_TIGHT} block mt-1.5`}>
          Approximate — a guide to relative scale, not your room
        </span>
      </figcaption>
    </figure>
  );
};
