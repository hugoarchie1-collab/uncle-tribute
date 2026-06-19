import { useRef, type KeyboardEvent } from "react";
import { FRAME_SPECS, type FrameFinish } from "../lib/trueScale";
import { cn } from "../lib/cn";

/* =============================================================================
 * FramePicker — monochrome segmented control over the three frame finishes.
 * -----------------------------------------------------------------------------
 * Mirrors the SizePicker radio semantics (role="radiogroup" + role="radio" +
 * aria-checked, ≥44px hit area, accent reserved for the selected / focused
 * state only — at rest everything is ink / line, strictly on-palette).
 *
 * PRESENTATIONAL ONLY — the chosen finish is a preview, never a price input.
 * ========================================================================== */

const ORDER: FrameFinish[] = ["unframed", "oak", "black-oak"];

export interface FramePickerProps {
  value: FrameFinish;
  onChange: (f: FrameFinish) => void;
  className?: string;
}

export const FramePicker = ({ value, onChange, className }: FramePickerProps) => {
  // Roving tabindex + arrow-key selection (WAI-ARIA radiogroup pattern): only the
  // checked radio is tabbable; Arrow/Home/End move selection AND focus, wrapping.
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % ORDER.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + ORDER.length) % ORDER.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = ORDER.length - 1;
    if (next === -1) return;
    e.preventDefault();
    onChange(ORDER[next]);
    btnRefs.current[next]?.focus();
  };

  return (
  <div
    role="radiogroup"
    aria-label="Frame finish"
    className={cn(
      "inline-flex items-center gap-0.5 p-0.5 ring-1 ring-line rounded-full",
      className,
    )}
  >
    {ORDER.map((finish, idx) => {
      const spec = FRAME_SPECS[finish];
      const isSelected = finish === value;
      return (
        <button
          key={finish}
          ref={(el) => {
            btnRefs.current[idx] = el;
          }}
          type="button"
          role="radio"
          aria-checked={isSelected}
          tabIndex={isSelected ? 0 : -1}
          onClick={() => onChange(finish)}
          onKeyDown={(e) => onKeyDown(e, idx)}
          className={cn(
            "inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 font-sans text-[11px] font-bold tracking-[0.16em] uppercase transition-colors duration-300 outline-none",
            "focus-visible:ring-1 focus-visible:ring-accent focus-visible:text-accent",
            isSelected
              ? "bg-ink text-bg"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {/* A tiny swatch of the finish — a depicted object, not UI chrome. */}
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-full ring-1 ring-black/30"
            style={{
              background:
                finish === "unframed"
                  ? "linear-gradient(135deg, #efe9dd 0%, #d8d0c0 100%)"
                  : finish === "oak"
                    ? "linear-gradient(135deg, #d8bd86 0%, #8a6a3c 100%)"
                    : "linear-gradient(135deg, #37322b 0%, #100c0a 100%)",
            }}
          />
          {spec.label}
        </button>
      );
    })}
  </div>
  );
};
