// =============================================================================
// CURRENCY SELECT — a compact header control for the buyer's presentment
// currency, styled to match the DeliverTo "Deliver to" affordance exactly.
// -----------------------------------------------------------------------------
// A small button (a tiny EYEBROW "Currency" over the active code + symbol) that
// opens a dropdown of supported currencies. Selecting one persists via the
// currency store (localStorage `tasm.currency`) and re-renders every price on
// the site in that currency — AND the same conversion is applied server-side in
// api/checkout.ts, so the Stripe session charges in that currency. The number
// shown is the number charged (advertised == charged).
//
// State lives in src/lib/currency.tsx (CurrencyProvider mounted at the App
// root). This file is component-only so React Fast Refresh stays happy.
// =============================================================================

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { EYEBROW_TIGHT } from "./ui/tokens";
import { CURRENCIES, CURRENCY_ORDER, useCurrency } from "../lib/currency";

const CoinIcon = ({ className }: { className?: string }) => (
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
    <circle cx="12" cy="12" r="8.5" />
    <path d="M14.5 9.2A3 3 0 0 0 9.5 11c0 2.6 5 1.4 5 4a3 3 0 0 1-5 1.8M12 7.5v9" />
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

export interface CurrencySelectProps {
  className?: string;
  /**
   * `header` — compact coin + two-line trigger for the site header.
   * `menu`   — full-width ringed row for the mobile menu drawer.
   */
  variant?: "header" | "menu";
}

/**
 * Estate-skinned currency picker. Click (or Enter/Space) opens a small near-
 * black dropdown listing the supported currencies; each shows its symbol +
 * name. Selecting one persists it (localStorage `tasm.currency`) and updates
 * every price live. Click-away + Escape close; reduced-motion safe; keyboard
 * accessible — mirrors DeliverTo's interaction model byte-for-byte.
 */
export const CurrencySelect = ({ className, variant = "header" }: CurrencySelectProps) => {
  const { code, meta, setCode } = useCurrency();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

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
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const isMenu = variant === "menu";

  const choose = (next: typeof code) => {
    setCode(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative", isMenu ? "w-full" : "inline-block", className)}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Currency: ${meta.label} (${code}). Change currency.`}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "press group inline-flex items-center gap-2 text-left transition-colors duration-300 outline-none",
          "rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
          isMenu
            ? "w-full justify-start ring-1 ring-line px-3.5 py-3 min-h-[52px] hover:ring-accent/60"
            : "px-1.5 py-1.5 min-h-[44px] text-ink/70 hover:text-ink",
        )}
      >
        <CoinIcon
          className={cn(
            "shrink-0",
            isMenu ? "w-[20px] h-[20px] text-ink/70" : "w-[18px] h-[18px]",
          )}
        />
        <span className="inline-flex flex-col leading-none min-w-0">
          <span className={cn(EYEBROW_TIGHT, "text-ink/80 mb-0.5")}>
            Currency
          </span>
          <span className="inline-flex items-center gap-1 min-w-0">
            <span
              className={cn(
                "font-sans font-semibold text-ink truncate tabular-nums",
                isMenu ? "text-[15px]" : "text-[13px] sm:text-[14px]",
              )}
            >
              {meta.symbol} {code}
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

      {open && (
        <div
          id={panelId}
          role="listbox"
          aria-label="Currency"
          aria-activedescendant={`${panelId}-${code}`}
          className={cn(
            "overflow-hidden rounded-xl",
            // Fully OPAQUE lifted surface (was bg-[#0a0908]/98 — the 2% bleed
            // let the heavy-blur page backdrop show through and washed the
            // options out). Solid so every row reads cleanly.
            "bg-[#16120f]",
            "ring-1 ring-line-strong",
            // Menu/drawer variant: render INLINE (in normal flow) so the options
            // push the nav links below down instead of floating over them.
            // Header variant: keep the original floating dropdown unchanged.
            isMenu
              ? "relative z-0 mt-2 left-0 right-0 w-full motion-safe:animate-[currency-expand_180ms_cubic-bezier(0.22,0.61,0.36,1)]"
              : "absolute z-[130] mt-2 right-0 w-[clamp(232px,80vw,264px)] shadow-[0_18px_50px_-12px_rgba(0,0,0,0.75)] motion-safe:animate-[currency-in_180ms_cubic-bezier(0.22,0.61,0.36,1)]",
          )}
        >
          <ul className="py-1.5">
            {CURRENCY_ORDER.map((c) => {
              const cm = CURRENCIES[c];
              const selected = c === code;
              return (
                <li key={c} role="presentation">
                  <button
                    id={`${panelId}-${c}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => choose(c)}
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
                    <span
                      aria-hidden="true"
                      className="shrink-0 w-[28px] font-sans text-[14px] text-ink/70 tabular-nums"
                    >
                      {cm.symbol}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "block font-sans text-[14px] leading-tight truncate",
                          selected ? "text-ink font-semibold" : "text-ink/85",
                        )}
                      >
                        {cm.label}
                      </span>
                      <span className="block font-sans text-[11.5px] leading-tight text-ink/70 mt-0.5 tabular-nums">
                        {c}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="px-4 py-3 border-t border-ink/60">
            <p className="font-sans text-[12px] leading-snug text-ink-muted">
              Prices convert for reference and are charged in your chosen
              currency at checkout.
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes currency-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes currency-expand {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CurrencySelect;
