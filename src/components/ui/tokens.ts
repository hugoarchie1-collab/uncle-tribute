// =============================================================================
// CANONICAL UI TOKENS — single source of truth for the recurring class recipes
// -----------------------------------------------------------------------------
// The design-cohesion audit found eyebrow tracking scattered across a dozen
// bespoke values and CTA pills re-spec'd four different ways. These constants
// lock the canon so it can never drift per-page again. Import and compose with
// cn(); never re-type the recipe inline.
// =============================================================================

import type { CSSProperties } from "react";

// =============================================================================
// PAGE MASTHEAD TYPE — the refined display cut for every page's front-cover h1.
// -----------------------------------------------------------------------------
// Replaces the old "Fraunces 700, opsz 48, clamp(...,11–13vw,168–220px)" recipe
// that read "way too bold and unprofessional" (2026-06-18). The fix, from a
// study of blue-chip galleries / auction houses / museums: weight DOWN (560,
// never ≥700), optical size UP (opsz 144 — the elegant high-contrast display
// master), scale tighter (~7.6vw capped 116px), sentence case, one italic
// regular-weight word for emphasis. Consumed by <PageMasthead> and by pages with
// a bespoke masthead. Lives here (not in PageMasthead.tsx) so the component file
// only exports a component (React Fast Refresh).
// =============================================================================

/** The canonical page-masthead (h1) title cut, as an inline style. */
export const MASTHEAD_TITLE_STYLE: CSSProperties = {
  fontVariationSettings: '"opsz" 144, "wght" 560',
  fontSize: "clamp(42px, 7.6vw, 116px)",
  lineHeight: 0.96,
  letterSpacing: "-0.018em",
};

/** A smaller companion cut for secondary mastheads / large section heads. */
export const MASTHEAD_TITLE_STYLE_SM: CSSProperties = {
  fontVariationSettings: '"opsz" 120, "wght" 560',
  fontSize: "clamp(34px, 5.2vw, 76px)",
  lineHeight: 1.0,
  letterSpacing: "-0.016em",
};

/** Section / chapter label — accent tone (Welcome's section eyebrow).
 *  The signature element: 11px bold uppercase, 0.32em tracking, accent-toned.
 *  Sits ABOVE a TITLE (gap mb-4/mb-5). This is the canonical home value. */
export const EYEBROW =
  "font-sans text-[12px] md:text-[13px] font-bold tracking-[0.32em] uppercase text-accent";

/** Section TITLE (h2) — the one display-serif heading treatment every page
 *  shares. Matches the home section-header h2: Fraunces (font-display) bold,
 *  clamp 32→60px, line-height 1.02 (md+ tightens to 0.98 for the single-line
 *  large-screen case so wrapped phone titles never touch), tracking -0.04em,
 *  balanced wrapping. Apply
 *  to an <h2>; add `max-w-[820px] mx-auto text-center` for the centered variant
 *  or leave left-aligned. End the copy with a full stop, sentence-case. */
export const TITLE =
  "font-display font-bold tracking-[-0.04em] text-[clamp(38px,5vw,72px)] leading-[1.02] md:leading-[0.98] text-ink text-balance";

/** Section SUBTITLE / lead body — the one running-prose treatment under a
 *  TITLE. Body sans (Hanken Grotesk), muted via the single muted-ink token.
 *  FLUID + PROPORTIONAL (2026-06-18): sized as a true subtitle in proportion to
 *  the TITLE above it (~slightly larger than plain body so it reads as a lead,
 *  not a caption), and it grows with the viewport so it never looks tiny in a
 *  sea of dead space on large screens. Sits a clear, generous step below its
 *  heading — pair with `mt-5 md:mt-6` (the canonical heading→subtitle gap). */
export const SUBTITLE =
  "font-sans font-normal text-[clamp(18.5px,0.62vw_+_14.3px,27px)] leading-[1.65] text-ink-muted max-w-[clamp(680px,58vw,920px)]";

/** Quiet / meta eyebrow — muted tone (captions, cites, place tags). Uses the
 *  single muted-ink token so "quieter text" is one colour site-wide. */
export const EYEBROW_MUTED =
  "font-sans text-[12px] md:text-[13px] font-bold tracking-[0.32em] uppercase text-ink-muted";

/** Tight micro-variant — ONLY for genuinely cramped tier / fact labels. */
export const EYEBROW_TIGHT =
  "font-sans text-[11px] font-bold tracking-[0.22em] uppercase text-ink-muted";

/** Meta / spec / fine-detail body. */
export const META = "font-sans text-[13.5px] leading-[1.6] text-ink-muted";

/** Primary CTA pill — filled ink → accent on hover. */
export const BTN_PRIMARY =
  "inline-flex items-center justify-center bg-ink text-bg px-6 py-3.5 font-sans text-[11px] font-bold tracking-[0.16em] uppercase rounded-full transition-colors duration-300 hover:bg-accent hover:text-ink disabled:opacity-60";

/** Secondary CTA pill — ring outline → accent on hover. */
export const BTN_SECONDARY =
  "inline-flex items-center justify-center ring-1 ring-ink/30 px-6 py-3.5 font-sans text-[11px] font-bold tracking-[0.16em] uppercase rounded-full transition-all duration-300 hover:ring-accent hover:text-accent";

// =============================================================================
// MOTION CANON — single source of truth for the site's signature easing +
// timing. The curve [0.22, 0.61, 0.36, 1] was already retyped ~20× across the
// codebase; lock it here so the motion language can never drift per-component.
// =============================================================================

/** The signature easing curve — use for every Framer Motion `ease`. */
export const EASE_SIGNATURE = [0.22, 0.61, 0.36, 1] as const;

/** CSS form of the signature curve — for transition/animation strings. */
export const EASE_CSS = "cubic-bezier(0.22, 0.61, 0.36, 1)";

/** Canonical durations / stagger (seconds) so timing reads consistently. */
export const MOTION = {
  reveal: 0.7,
  stagger: 0.09,
  hover: 0.3,
  image: 0.7,
  micro: 0.2,
} as const;
