// =============================================================================
// CANONICAL UI TOKENS — single source of truth for the recurring class recipes
// -----------------------------------------------------------------------------
// The design-cohesion audit found eyebrow tracking scattered across a dozen
// bespoke values and CTA pills re-spec'd four different ways. These constants
// lock the canon so it can never drift per-page again. Import and compose with
// cn(); never re-type the recipe inline.
// =============================================================================

/** Section / chapter label — accent tone (Welcome's section eyebrow). */
export const EYEBROW =
  "font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-accent";

/** Quiet / meta eyebrow — cream-fade tone (captions, cites, place tags). */
export const EYEBROW_MUTED =
  "font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-ink/55";

/** Tight micro-variant — ONLY for genuinely cramped tier / fact labels. */
export const EYEBROW_TIGHT =
  "font-sans text-[11px] font-bold tracking-[0.22em] uppercase text-ink/55";

/** Meta / spec / fine-detail body. */
export const META = "font-sans text-[13.5px] leading-[1.6] text-ink/70";

/** Primary CTA pill — filled ink → accent on hover. */
export const BTN_PRIMARY =
  "inline-flex items-center justify-center bg-ink text-bg px-6 py-3.5 font-sans text-[11px] font-bold tracking-[0.16em] uppercase rounded-full transition-colors duration-300 hover:bg-accent hover:text-ink disabled:opacity-60";

/** Secondary CTA pill — ring outline → accent on hover. */
export const BTN_SECONDARY =
  "inline-flex items-center justify-center ring-1 ring-ink/30 px-6 py-3.5 font-sans text-[11px] font-bold tracking-[0.16em] uppercase rounded-full transition-all duration-300 hover:ring-accent hover:text-accent";
