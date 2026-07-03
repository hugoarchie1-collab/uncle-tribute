import { cn } from "../lib/cn";

// =============================================================================
// BasketIcon — the estate's premium shopping-bag mark for the header.
// -----------------------------------------------------------------------------
// Amazon-cart-grade in legibility, but estate-skinned: a clean cream-stroke
// tote/bag (inherits `currentColor`, so it turns accent on hover via the Nav's
// hover:text-accent) with an optional terracotta count badge.
//
// SELF-CONTAINED on purpose — pure SVG + one scoped <style> for the badge
// entrance keyframe (no framer-motion, no icon library, no global.css edit, no
// deps beyond cn). Reduced-motion safe: the entrance is gated behind a
// `prefers-reduced-motion: no-preference` media query, so motion-averse users
// get the badge instantly with no animation.
// =============================================================================

export interface BasketIconProps {
  /** Number of lines in the basket. Badge shows only when > 0. */
  count?: number;
  /** Extra classes for the root <span> (size utilities, colour, etc.). */
  className?: string;
  /** Pixel size of the bag glyph. Default 24. */
  size?: number;
}

/**
 * Refined shopping-bag glyph + optional count badge.
 *
 * The SVG strokes at ~1.6 in `currentColor` so it inherits the cream ink and
 * shifts to accent on hover/focus exactly like every other Nav affordance. The
 * badge is a filled `bg-accent` circle with a `text-bg` numeral, pinned
 * top-right, sized ~16px, with a subtle scale/settle entrance.
 *
 * Accessible: the whole mark carries an `aria-label` ("Basket, N items" /
 * "Basket, empty"); the SVG + badge are `aria-hidden` so the label isn't
 * doubled by a screen reader reading the numeral.
 */
export const BasketIcon = ({ count, className, size = 24 }: BasketIconProps) => {
  const n = typeof count === "number" && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const hasCount = n > 0;
  // Cap the printed numeral so a runaway count never blows out the badge pill.
  const label = n > 99 ? "99+" : String(n);

  return (
    <span
      className={cn("relative inline-flex items-center justify-center", className)}
      role="img"
      aria-label={hasCount ? `Basket, ${n} item${n === 1 ? "" : "s"}` : "Basket, empty"}
    >
      {/* Scoped entrance keyframe — kept local so the component stays fully
          self-contained (no global.css edit). Reduced-motion users skip it. */}
      <style>{`
        @keyframes tasm-basket-badge-in {
          0%   { opacity: 0; transform: scale(0.4); }
          60%  { opacity: 1; transform: scale(1.12); }
          100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .tasm-basket-badge { animation: tasm-basket-badge-in 360ms cubic-bezier(0.22, 0.61, 0.36, 1) both; }
        }
      `}</style>

      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className="block shrink-0"
      >
        {/* Tote body — gently splayed sides into a soft-radius base, so it
            reads as a refined shopping bag rather than a hard rectangle. */}
        <path d="M5.4 8h13.2l-.86 9.86a2.4 2.4 0 0 1-2.39 2.19H8.65a2.4 2.4 0 0 1-2.39-2.19L5.4 8Z" />
        {/* Handle — a clean arched strap rising from the bag mouth. */}
        <path d="M8.6 8V6.6a3.4 3.4 0 0 1 6.8 0V8" />
      </svg>

      {hasCount && (
        <span
          aria-hidden="true"
          className={cn(
            "tasm-basket-badge absolute -top-1.5 -right-2 min-w-[19px] h-[19px] px-[6px]",
            "inline-flex items-center justify-center rounded-full",
            "bg-accent text-bg font-sans text-[11px] font-bold leading-none tabular-nums",
            // Soft ring in the canvas colour so the badge reads cleanly when it
            // overlaps the bag stroke.
            "ring-[1.5px] ring-bg",
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
};

export default BasketIcon;
