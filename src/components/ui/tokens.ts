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
// PAGE MASTHEAD TYPE — the display cut for every page's front-cover h1.
// -----------------------------------------------------------------------------
// 2026-06-23: re-cut to the STURDY, BOLD, even-stroke Fraunces of the home
// Sacred-Geometry finale (the cut Hugo loves) at a CONTROLLED size. The previous
// opsz-144 / wght-560 high-optical cut (thin hairlines, swashy italics) was
// rejected — it "doesn't fit the other fonts" and read as a different typeface
// from the bold home wordmark. We bring the mastheads onto the finale's
// fontVariationSettings ('"opsz" 48, "wght" 700') so the strokes are heavy and
// EVEN, but — unlike the failed 2026-06-18 version — we hold the clamp ceiling
// at ~150px (NOT the crude 220px that read "way too bold and unprofessional")
// and KEEP sentence case + the single regular-weight italic emphasis word. So
// it's the finale's sturdiness at masthead scale, not a giant logo.
//   • opsz 48 (NOT 144) — the heavy, even, low-contrast display master, the
//     dial that keeps the bold strokes clean (the lesson from gotcha #7: opsz,
//     not weight, is what prevents the "scribble"; 700 at opsz 48 is the loved
//     finale, 560 at opsz 144 was the rejected hairline cut).
//   • wght 700 + fontWeight 700 — the finale's bold, real-loaded weight
//     (font-synthesis:none keeps it un-faked; FAQ already passes that through).
//   • letterSpacing -0.03em / lineHeight 0.92 — the finale's exact tracking +
//     leading.
//   • clamp ceiling held at ~150px / ~96px (NOT inflated to 220px) — bold +
//     confident, but composed, never the crude oversized logo.
//   • SENTENCE CASE is preserved (this token sets NO textTransform — the home
//     finale/wordmark are uppercase, but page mastheads stay sentence-case; the
//     consuming pages own their casing).
//   • The one ITALIC emphasis word is set in the page JSX as
//     `<em className="italic font-normal">` — `font-normal` overrides this 700
//     to regular, so it renders as a true regular-weight italic against the bold
//     roman (the auction-house "title of a work" signal), NEVER a bold-swashy
//     italic. Do not remove `font-normal` from those <em>s.
// Consumed by <PageMasthead> and by pages with a bespoke masthead. Lives here
// (not in PageMasthead.tsx) so the component file only exports a component
// (React Fast Refresh).
// =============================================================================

/** The canonical page-masthead (h1) title cut, as an inline style. */
export const MASTHEAD_TITLE_STYLE: CSSProperties = {
  // Match the Sacred-Geometry finale: even, heavy, low-contrast Fraunces.
  fontVariationSettings: '"opsz" 48, "wght" 700',
  fontWeight: 700,
  // Clamp ceiling held at 150px (the 2026-06-20 fill-the-screen ceiling) — bold
  // at large widths but never the crude 220px logo the 700/opsz-48 cut hit in
  // its first (rejected) form.
  fontSize: "clamp(44px, 8.6vw, 150px)",
  lineHeight: 0.92,
  letterSpacing: "-0.03em",
};

/** A smaller companion cut for secondary mastheads / large section heads. */
export const MASTHEAD_TITLE_STYLE_SM: CSSProperties = {
  fontVariationSettings: '"opsz" 48, "wght" 700',
  fontWeight: 700,
  fontSize: "clamp(36px, 5.9vw, 96px)",
  lineHeight: 0.96,
  letterSpacing: "-0.028em",
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
  "font-display font-bold tracking-[-0.04em] text-[clamp(40px,5.7vw,92px)] leading-[1.02] md:leading-[0.97] text-ink text-balance";

/** Section SUBTITLE / lead body — the one running-prose treatment under a
 *  TITLE. Body sans (Hanken Grotesk), muted via the single muted-ink token.
 *  FLUID + PROPORTIONAL (2026-06-18): sized as a true subtitle in proportion to
 *  the TITLE above it (~slightly larger than plain body so it reads as a lead,
 *  not a caption), and it grows with the viewport so it never looks tiny in a
 *  sea of dead space on large screens. Sits a clear, generous step below its
 *  heading — pair with `mt-5 md:mt-6` (the canonical heading→subtitle gap). */
export const SUBTITLE =
  "font-sans font-normal text-[clamp(20px,0.72vw_+_15px,31px)] leading-[1.62] text-ink-muted max-w-[clamp(720px,62vw,1080px)]";

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
