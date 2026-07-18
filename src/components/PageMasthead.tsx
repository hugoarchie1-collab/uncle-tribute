// =============================================================================
// PAGE MASTHEAD — the single front-cover heading every content page shares.
// -----------------------------------------------------------------------------
// 2026-06-23: the title cut is now the home Sacred-Geometry finale's STURDY,
// BOLD, even-stroke Fraunces (Fraunces "opsz" 48 / "wght" 700, letterSpacing
// -0.03em, lineHeight 0.92) at a CONTROLLED clamp ceiling (~150px). It replaces
// the opsz-144 / wght-560 high-optical cut (thin hairlines + swashy italics)
// that the owner rejected as not matching the rest of the site's type.
//   • The 2026-06-18 lesson still holds: the failure that made the OLD bold cut
//     "way too bold and unprofessional" was its SIZE (clamp up to 220px), not
//     its weight. We keep the finale's bold weight but cap the size at ~150px,
//     so it reads bold + confident, never a crude oversized logo.
//   • opsz 48 (NOT 144) is the heavy even display master — opsz, not weight, is
//     the dial that keeps the strokes clean at scale (gotcha #7).
//   • SENTENCE CASE is preserved (the finale/home wordmark are uppercase; page
//     mastheads stay sentence-case). The ONE emphasis word is a regular-weight
//     true italic — pass `<em className="italic font-normal">`; `font-normal`
//     overrides the title's 700 so the italic reads as the auction-house "title
//     of a work" signal, NEVER a bold-swashy italic.
// The actual values live in MASTHEAD_TITLE_STYLE / _SM (ui/tokens.ts); the
// eyebrow + meta rule are unchanged.
//
// Welcome.tsx (the loved home page / design source of truth) is deliberately
// NOT built on this — leave it alone.
// =============================================================================

import type { CSSProperties, ReactNode } from "react";
import { cn } from "../lib/cn";
import { MASTHEAD_TITLE_STYLE } from "./ui/tokens";

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
  // eyebrow + meta are still accepted (callers pass them) but no longer rendered
  // — the owner had the eyebrow/meta rule removed from every page's masthead
  // (2026-07-18: "the two lines at the top … looks crap on every page").
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
      <Heading
        className={cn(
          "font-display text-ink m-0 text-balance text-pretty",
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
