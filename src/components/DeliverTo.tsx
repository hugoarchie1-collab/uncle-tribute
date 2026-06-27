// =============================================================================
// DELIVER-TO — an Amazon-style "Deliver to" header control, estate-skinned.
// -----------------------------------------------------------------------------
// A compact button (a small location pin + two stacked lines: a tiny EYEBROW
// "Deliver to" over a slightly larger cream region name) that opens a small
// dropdown of delivery regions. Selecting one persists via the deliverTo store
// (localStorage `tasm.deliverTo`) and updates the label.
//
// IMPORTANT — informational / preference only. Delivery is FREE WORLDWIDE on
// every order (policy 2026-06-06), so this control NEVER changes pricing; it
// simply lets a visitor see their region reflected, exactly like Amazon's
// "Deliver to" affordance. Every region's row reads "Free delivery".
//
// State lives in src/lib/deliverTo.ts (the same tiny pub/sub +
// useSyncExternalStore shape as lib/basket.ts / lib/consent.ts). This file is
// component-only so React Fast Refresh stays happy.
// =============================================================================

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { EYEBROW_TIGHT } from "./ui/tokens";
import { DELIVER_REGIONS, useDeliverTo } from "../lib/deliverTo";

// ---- Icons ------------------------------------------------------------------

/** Single-line location pin — kept inline to avoid an icon dependency; matches
 *  the nav's 1.5 stroke-weight register. */
const PinIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d="M12 21s-6.5-5.4-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21Z" />
    <circle cx="12" cy="10.5" r="2.4" />
  </svg>
);

const Caret = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const Check = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d="m5 12.5 4.5 4.5L19 6.5" />
  </svg>
);

// ---- Component --------------------------------------------------------------

export interface DeliverToProps {
  className?: string;
  /**
   * `header` — the compact pin + two-line trigger used in the site header.
   * `menu`   — a full-width row variant for the mobile menu drawer / a stacked
   *            context (slightly larger hit area, left-aligned, no max-width).
   */
  variant?: "header" | "menu";
}

/**
 * Estate-skinned "Deliver to" control.
 *
 * Click (or Enter/Space) opens a small near-black dropdown panel listing the
 * delivery regions; each carries a quiet "Free delivery" note. Selecting one
 * persists it (localStorage `tasm.deliverTo`) and updates the trigger label.
 * Click-away + Escape close; reduced-motion safe; keyboard accessible.
 */
export const DeliverTo = ({ className, variant = "header" }: DeliverToProps) => {
  const { region, regionId, setRegion } = useDeliverTo();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Click-away + Escape close. Only wired while open.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    // Capture phase so a click on another open popover still closes this one.
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const isMenu = variant === "menu";

  const choose = (id: string) => {
    setRegion(id);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative", isMenu ? "w-full" : "inline-block", className)}
    >
      {/* TRIGGER — pin + two lines. Borderless in the header; a quiet ring in
          the menu variant so it reads as a tappable row. */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Deliver to ${region.label}. Change delivery region.`}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "press group inline-flex items-center gap-2 text-left transition-colors duration-300 outline-none",
          "rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
          isMenu
            ? "w-full justify-start ring-1 ring-line px-3.5 py-3 min-h-[52px] hover:ring-accent/60"
            : "px-1.5 py-1.5 min-h-[44px] text-ink/70 hover:text-ink",
        )}
      >
        <PinIcon
          className={cn(
            "shrink-0",
            isMenu ? "w-[20px] h-[20px] text-ink/70" : "w-[18px] h-[18px]",
          )}
        />
        <span className="inline-flex flex-col leading-none min-w-0">
          <span className={cn(EYEBROW_TIGHT, "text-ink-muted/80 mb-0.5")}>
            Deliver to
          </span>
          <span className="inline-flex items-center gap-1 min-w-0">
            <span
              className={cn(
                "font-sans font-semibold text-ink truncate",
                isMenu ? "text-[15px]" : "text-[13px] sm:text-[14px]",
              )}
            >
              {region.label}
            </span>
            <Caret
              className={cn(
                "shrink-0 transition-transform duration-300 text-ink/50 group-hover:text-ink/80",
                isMenu ? "w-[14px] h-[14px]" : "w-[13px] h-[13px]",
                open && "rotate-180",
              )}
            />
          </span>
        </span>
      </button>

      {/* DROPDOWN PANEL — near-black ~95%, hairline ring, soft shadow. Anchored
          to the trigger; full-width in the menu variant. */}
      {open && (
        <div
          id={panelId}
          role="listbox"
          aria-label="Delivery region"
          aria-activedescendant={`${panelId}-${regionId}`}
          className={cn(
            "overflow-hidden rounded-xl",
            // Scroll-perf: backdrop-blur on the panel re-samples the ~180px
            // dropdown region every frame while the user scrolls (browsers that
            // support backdrop-filter still pay it even behind the supports-gate).
            // Dropped in favour of a near-opaque fill — the shadow below already
            // gives the panel its visual separation.
            // Fully OPAQUE lifted surface (was /98 — the bleed washed options
            // out over the heavy-blur page backdrop).
            "bg-[#16120f]",
            "ring-1 ring-line-strong",
            // Menu/drawer variant: render INLINE (in normal flow) so the options
            // push the nav links below down instead of floating over them.
            // Header variant: keep the original floating dropdown unchanged.
            isMenu
              ? "relative z-0 mt-2 left-0 right-0 w-full motion-safe:animate-[deliverto-expand_180ms_cubic-bezier(0.22,0.61,0.36,1)]"
              : "absolute z-[130] mt-2 left-0 w-[clamp(248px,80vw,288px)] shadow-[0_18px_50px_-12px_rgba(0,0,0,0.75)] motion-safe:animate-[deliverto-in_180ms_cubic-bezier(0.22,0.61,0.36,1)]",
          )}
        >
          <ul className="py-1.5">
            {DELIVER_REGIONS.map((r) => {
              const selected = r.id === regionId;
              return (
                <li key={r.id} role="presentation">
                  <button
                    id={`${panelId}-${r.id}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => choose(r.id)}
                    className={cn(
                      "press w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-200 outline-none",
                      "hover:bg-ink/[0.06] focus-visible:bg-ink/[0.06]",
                      "focus-visible:outline-none",
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0 inline-flex items-center justify-center w-[18px] h-[18px]",
                        selected ? "text-accent" : "text-transparent",
                      )}
                    >
                      <Check className="w-[16px] h-[16px]" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "block font-sans text-[14px] leading-tight truncate",
                          selected ? "text-ink font-semibold" : "text-ink/85",
                        )}
                      >
                        {r.label}
                      </span>
                      <span className="block font-sans text-[11.5px] leading-tight text-ink-muted/70 mt-0.5">
                        Free delivery
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Quiet reassurance line beneath the list. */}
          <div className="px-4 py-3 border-t border-line/60">
            <p className="font-sans text-[12px] leading-snug text-ink-muted">
              Free worldwide delivery on every order.
            </p>
          </div>
        </div>
      )}

      {/* Keyframes for the panel reveal — scoped, reduced-motion gated above via
          `motion-safe:`. */}
      <style>{`
        @keyframes deliverto-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes deliverto-expand {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default DeliverTo;
