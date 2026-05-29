import { parseSizeCm, type PrintTier } from "../data/paintings";
import { EYEBROW_TIGHT, META } from "./ui/tokens";
import { cn } from "../lib/cn";

/**
 * DimensionChip — instant size reassurance under the price/size strip. A tiny
 * to-proportion rectangle + the print's real cm (and derived inches), plus a
 * note that the tier is a standard A-size frame. All derived from the tier's
 * catalogued `size` — no new data. Static, updates with the selected tier.
 */
export const DimensionChip = ({ tier }: { tier: PrintTier }) => {
  const dims = parseSizeCm(tier.size);
  if (!dims) return null;
  const inW = (dims.w / 2.54).toFixed(1);
  const inH = (dims.h / 2.54).toFixed(1);
  const aLabel = tier.size.split(" ")[0]; // "A2", "A1", …
  const isAStd = /^A\d$/.test(aLabel);

  // Proportional preview rectangle, capped at 52px on the long edge.
  const cap = 52;
  const scale = cap / Math.max(dims.w, dims.h);
  const w = Math.round(dims.w * scale);
  const h = Math.round(dims.h * scale);

  return (
    <div className="flex items-center gap-4">
      <svg
        width={w + 2}
        height={h + 2}
        viewBox={`0 0 ${w + 2} ${h + 2}`}
        className="shrink-0 text-ink/35"
        aria-hidden="true"
      >
        <rect x="1" y="1" width={w} height={h} fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      <span className="flex flex-col">
        <span className={cn(META, "text-ink/80")}>
          {dims.w} cm × {dims.h} cm
          <span className="text-ink/40"> · {inW} × {inH} in</span>
        </span>
        {isAStd && (
          <span className={cn(EYEBROW_TIGHT, "mt-1")}>
            {aLabel} — fits a standard {aLabel} frame
          </span>
        )}
      </span>
    </div>
  );
};
