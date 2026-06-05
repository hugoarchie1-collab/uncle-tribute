// =============================================================================
// CANONICAL UI TOKENS — single source of truth for the recurring class recipes
// -----------------------------------------------------------------------------
// The design-cohesion audit found eyebrow tracking scattered across a dozen
// bespoke values and CTA pills re-spec'd four different ways. These constants
// lock the canon so it can never drift per-page again. Import and compose with
// cn(); never re-type the recipe inline.
// =============================================================================

/** Section / chapter label — accent tone (Welcome's section eyebrow).
 *  The signature element: 11px bold uppercase, 0.32em tracking, accent-toned.
 *  Sits ABOVE a TITLE (gap mb-4/mb-5). This is the canonical home value. */
export const EYEBROW =
  "font-sans text-[11px] md:text-[12px] font-bold tracking-[0.32em] uppercase text-accent";

/** Section TITLE (h2) — the one display-serif heading treatment every page
 *  shares. Matches the home section-header h2: Fraunces (font-display) bold,
 *  clamp 32→60px, line-height 1.02 (md+ tightens to 0.98 for the single-line
 *  large-screen case so wrapped phone titles never touch), tracking -0.04em,
 *  balanced wrapping. Apply
 *  to an <h2>; add `max-w-[820px] mx-auto text-center` for the centered variant
 *  or leave left-aligned. End the copy with a full stop, sentence-case. */
export const TITLE =
  "font-display font-semibold tracking-[-0.04em] text-[clamp(34px,4.8vw,66px)] leading-[1.02] md:leading-[0.98] text-ink text-balance";

/** Section SUBTITLE / lead body — the one running-prose treatment under a
 *  TITLE. Body sans (Hanken Grotesk), muted via the single muted-ink token,
 *  17px / 1.8, capped + centered for the centered header (add mx-auto). */
export const SUBTITLE =
  "font-sans font-normal text-[16px] md:text-[17px] leading-[1.8] text-ink-muted max-w-[680px]";

/** Quiet / meta eyebrow — muted tone (captions, cites, place tags). Uses the
 *  single muted-ink token so "quieter text" is one colour site-wide. */
export const EYEBROW_MUTED =
  "font-sans text-[11px] md:text-[12px] font-bold tracking-[0.32em] uppercase text-ink-muted";

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
