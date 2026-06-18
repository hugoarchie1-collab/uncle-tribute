// =============================================================================
// PAGE MASTHEAD — the single, refined front-cover heading every content page
// shares. Replaces the duplicated "AboutMasthead recipe" that rendered each
// page title at Fraunces 700, opsz 48, clamp(...,11–13vw,168–220px) — which read
// as a crude logo, not a masthead (the owner: "way too bold and unprofessional").
// -----------------------------------------------------------------------------
// The refinement, drawn from a study of blue-chip galleries (Zwirner, Gagosian,
// Hauser & Wirth), auction houses (Sotheby's, Christie's, Phillips) and museum /
// estate sites (Tate, MoMA): prestige type signals authority through RESTRAINT,
// never volume. Three changes do the work:
//   1. Weight DOWN — 560, never ≥700. Large serif display leans lighter, not
//      heavier; 700 at display size reads as e-commerce / "AI".
//   2. Optical size UP — opsz 144 (the display master) instead of 48, so
//      Fraunces renders its elegant high-contrast cut (thin hairlines, refined
//      serifs) rather than the chunky low-contrast small-text master.
//   3. Scale tighter — ~7.6vw capped at 116px instead of 13vw/220px: confident
//      and screen-aware, but composed, not shouty.
// Sentence/Title case (an italic word can carry emphasis — pass <em>), tight
// negative tracking, balanced wrap. The eyebrow + meta rule are unchanged.
//
// Welcome.tsx (the loved home page / design source of truth) is deliberately
// NOT built on this — leave it alone.
// =============================================================================

import type { CSSProperties, ReactNode } from "react";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_MUTED, MASTHEAD_TITLE_STYLE } from "./ui/tokens";

// The masthead title-style recipes (MASTHEAD_TITLE_STYLE / _SM) live in
// ./ui/tokens.ts — import them from there. They are NOT re-exported here so this
// file only exports a component (React Fast Refresh / react-refresh lint).

export interface PageMastheadProps {
  /** Small uppercase eyebrow on the left of the meta rule. */
  eyebrow: string;
  /** Optional quiet detail on the right of the meta rule (hidden < sm). */
  meta?: ReactNode;
  /** The display title. Pass an <em className="italic font-normal"> for the one
   *  emphasised word — the auction-house "title of a work" signal — never bold. */
  title: ReactNode;
  /** Optional override/extension of the title inline style (e.g. a smaller cut). */
  titleStyle?: CSSProperties;
  /** Extra class on the <h1>. */
  titleClassName?: string;
  /** Anything beneath the title — supporting copy, a CTA, a grid. */
  children?: ReactNode;
  /** Class on the wrapping <header>. */
  className?: string;
  /** Heading level override (defaults to h1; pass "h2" for a secondary masthead). */
  as?: "h1" | "h2";
}

/**
 * The refined estate masthead: a meta rule (eyebrow left + optional detail
 * right over a hairline) → a confident-but-composed Fraunces display title →
 * whatever supporting content the page passes as children.
 */
export const PageMasthead = ({
  eyebrow,
  meta,
  title,
  titleStyle,
  titleClassName,
  children,
  className,
  as = "h1",
}: PageMastheadProps) => {
  const Heading = as;
  return (
    <header className={className}>
      <div className="flex items-center gap-4 md:gap-6 border-b border-line pb-4 md:pb-5">
        <span className={EYEBROW}>{eyebrow}</span>
        <span aria-hidden className="h-px flex-1 bg-ink/15" />
        {meta ? (
          <span className={cn(EYEBROW_MUTED, "shrink-0 hidden sm:inline")}>{meta}</span>
        ) : null}
      </div>
      <Heading
        className={cn(
          "font-display text-ink m-0 mt-5 md:mt-7 text-balance text-pretty",
          titleClassName,
        )}
        style={{ ...MASTHEAD_TITLE_STYLE, ...titleStyle }}
      >
        {title}
      </Heading>
      {children}
    </header>
  );
};

export default PageMasthead;
