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
// ⚠️ The "~150px" / "~108px" ceilings named below are HISTORY — see the dated
// note on `fontSize` itself for the live value and why it was re-opened.
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
  // 2026-07-31 SUBTLE-PROFESSIONAL PASS: ceiling 186→108px so page mastheads
  // landed in the same cap-height band as the home wordmark of that date (~90px).
  // 2026-09-01 CEILING RE-OPENED — the justification above went stale when the
  // home masthead was rebuilt + frozen (2026-08-23). Welcome.tsx now sets its
  // wordmark at `min(clamp(52px, 13.5vw, 248px), 27svh)` and its section heads at
  // clamp(56px,11vw,176px), so on a 4K display the home reads 248px while every
  // interior page's h1 sat frozen at 108px — under 3% of a 3840px viewport, and
  // BEATEN outright by the TITLE (h2) token below, whose clamp(…,4.4vw,116px)
  // overtakes 108px at 2455px. A section heading larger than its own page title
  // is a hierarchy inversion, and a 108px h1 on Hugo's 4K is exactly the "timid,
  // doesn't fill the screen" failure. Fix (the SUBTITLE token's own technique):
  // hold the approved laptop size EXACTLY and let it grow only beyond it —
  //   1440 → 86.4px · 1728 → 103.7px  (BYTE-IDENTICAL to the 108px cap version)
  //   1920 → 115px · 2560 → 154px · 3840 → 168px (ceiling)
  // The 19svh term is the fold guard (mirrors the home's own 27svh guard): it
  // binds only on very wide, very short windows so a masthead can never eat the
  // viewport. TITLE tops out at 116px, so the h1 leads by ~1.35× at every width.
  fontSize: "min(clamp(38px, 6.0vw, 168px), 19svh)",
  lineHeight: 0.98,
  letterSpacing: "-0.03em",
  // Default legibility halo for mastheads that sit over the photographic
  // SceneBackdrop (Auth/Basket/Links/Orders lacked one — 2026-07-16). Invisible
  // on the plain dark bg (dark-on-dark); pages that pass their own titleStyle
  // textShadow (e.g. Collections) still override it via the {...base,...override}
  // spread in PageMasthead.
  textShadow: "0 1px 3px rgba(0,0,0,0.6), 0 2px 12px rgba(0,0,0,0.45)",
};

/** A smaller companion cut for secondary mastheads / large section heads.
 *  ⚠️ 2026-09-01: this export currently has ZERO consumers (grep: tokens.ts only).
 *  Kept because it is public API, and re-scaled in step with MASTHEAD_TITLE_STYLE
 *  so it can't be wrong the moment someone does import it — its old 84px ceiling
 *  was overtaken by TITLE (h2) from 1910px up, the same inversion fixed above. */
export const MASTHEAD_TITLE_STYLE_SM: CSSProperties = {
  fontVariationSettings: '"opsz" 48, "wght" 700',
  fontWeight: 700,
  // 1440 → 72px · 1728 → 84px (both unchanged) · 1920 → 96 · 2560 → 128 · cap 132.
  fontSize: "min(clamp(34px, 5.0vw, 132px), 16svh)",
  lineHeight: 1.0,
  letterSpacing: "-0.028em",
  textShadow: "0 1px 3px rgba(0,0,0,0.6), 0 2px 12px rgba(0,0,0,0.45)",
};

/** Section / chapter label — accent tone (Welcome's section eyebrow).
 *  The signature kicker: Fraunces (font-display) semibold, accent-toned,
 *  SENTENCE CASE, near-neutral tracking. Sits ABOVE a TITLE (gap mb-4/mb-5).
 *  ⚠️ NEVER an uppercase-tracked sans — that is a standing owner rule, and
 *  several call sites carry proper nouns + Stephen's verbatim invocation that
 *  uppercasing would mangle. (The prose above this token described a 12/13px
 *  0.18em-tracked recipe, and CLAUDE.md describes an 11px/0.32em/uppercase sans
 *  one — BOTH are stale fiction; the classes on this line are the truth.)
 *
 *  2026-09-01 — 4K STEP ADDED. The eyebrow was FLAT 14/15px at every width
 *  while its TITLE grew to 116px and body copy to 44px, so the kicker→title
 *  ratio drifted 0.41 (390px) → 0.13 (2560px): on Hugo's 4K it had shrunk to a
 *  speck and the eyebrow→title→body rhythm this token exists to protect had
 *  collapsed. Steps follow the META token's existing house pattern (fixed
 *  breakpoint steps, not a second clamp system) so EVERY width below 1536px is
 *  BYTE-IDENTICAL to before and only large displays change.
 *    390→14 · 768–1535→15 · 1536→18 · 1700–2399→21 · 2400+→25 */
export const EYEBROW =
  "font-display font-semibold normal-case text-[14px] md:text-[15px] 2xl:text-[18px] 3xl:text-[21px] 4xl:text-[25px] tracking-[-0.005em] text-accent";

/** Section TITLE (h2) — the one display-serif heading treatment every page
 *  shares. Fraunces (font-display) at opsz 40 / wght 600 — NOT the 700 of the
 *  masthead, so an h2 never reads as heavy as its page's h1.
 *  ⚠️ The live size is `clamp(34px, 4.4vw, 116px)`, on the line below. The
 *  "clamp 52→92px" this comment used to claim was three revisions stale, and it
 *  mattered: 4.4vw overtakes the masthead's old 108px cap at 2455px, which made
 *  every section h2 LARGER than its own page title on a 4K display. Fixed by
 *  raising the masthead ceiling (see MASTHEAD_TITLE_STYLE) rather than shrinking
 *  this — h1 now leads h2 by ~1.35× at every width. If you ever raise this
 *  token's 116px ceiling, raise the masthead's 168px one in the SAME commit.
 *  line-height 1.02 (md+ tightens to 0.97 for the single-line
 *  large-screen case so wrapped phone titles never touch), tracking -0.04em,
 *  balanced wrapping. The token sets NO max-width or alignment — pages own the
 *  measure: add `mx-auto text-center` (+ an explicit `max-w-[…]`) for the
 *  centered variant, or leave left-aligned. End the copy with a full stop,
 *  sentence-case. */
export const TITLE =
  "font-display font-semibold [font-variation-settings:'opsz'_40,'wght'_600] tracking-[-0.03em] text-[clamp(34px,4.4vw,116px)] leading-[1.05] md:leading-[1.02] text-ink text-balance";

/** Section SUBTITLE / lead body — the one running-prose treatment under a
 *  TITLE. Body sans (Hanken Grotesk), muted via the single muted-ink token.
 *  FLUID + PROPORTIONAL (2026-06-18): sized as a true subtitle in proportion to
 *  the TITLE above it (~slightly larger than plain body so it reads as a lead,
 *  not a caption), and it grows with the viewport so it never looks tiny in a
 *  sea of dead space on large screens. Sits a clear, generous step below its
 *  heading — pair with `mt-5 md:mt-6` (the canonical heading→subtitle gap).
 *  ⚠️ The token carries NO max-width on purpose (removed 2026-06-26): a baked
 *  `max-w-[clamp(720px,62vw,1080px)]` was SILENTLY overriding the per-page
 *  centred reading widths (a wider page-local `max-w` after it in the class
 *  list lost the cascade tie), so centred subtitles drifted off the page axis.
 *  Pages now OWN the measure — add an explicit `max-w-[…] mx-auto` at the call
 *  site for the centred variant. */
// Body/lead — COHERENT FLUID GROWTH (Hugo 2026-08-04, 4K monitor: text read
// "so small… huge gaps"). The 2026-08-03 hard 25px cap fixed incoherence but
// left prose marooned-tiny on large displays. This keeps the SAME ~20px laptop
// reading size (1440 ≈ 20px, unchanged) but lets it grow GENTLY and IN UNISON
// to ~32px on a 2560 monitor, ceiling 33px so it can never balloon into a
// headline. Coherence now comes from a shared slope across the whole prose
// scale, not from freezing everything small.
export const SUBTITLE =
  "font-sans font-medium text-[clamp(19px,1.05vw+5px,33px)] leading-[1.5] text-ink-muted";

/** Quiet / meta eyebrow — muted tone (captions, cites, place tags). Uses the
 *  single muted-ink token so "quieter text" is one colour site-wide. */
export const EYEBROW_MUTED =
  "font-display font-semibold normal-case text-[14px] md:text-[15px] 2xl:text-[18px] 3xl:text-[21px] 4xl:text-[25px] tracking-[-0.005em] text-ink-muted";

/** Tight micro-variant — ONLY for genuinely cramped tier / fact labels.
 *  Gets a DELIBERATELY GENTLER 4K ramp than EYEBROW/EYEBROW_MUTED (18px ceiling
 *  vs 25px): this is the token used where a label already fights for room, so it
 *  must stop growing before it can wrap a ledger row or overflow a pill. */
export const EYEBROW_TIGHT =
  "font-display font-semibold normal-case text-[14px] 2xl:text-[15px] 3xl:text-[16px] 4xl:text-[18px] tracking-[-0.005em] text-ink-muted";

/** Meta / spec / fine-detail body — spec rows, wall-label tables, fine print.
 *  2026-09-01: gained the missing 2xl rung (it jumped 15→17 only at 1700px, so
 *  the whole 1536–1699 band ran meta text at the mobile size) and its 4xl
 *  ceiling was lifted 19→22px to hold ~0.5× the 44px body on a 4K display. */
export const META =
  "font-sans text-[15px] 2xl:text-[17px] 3xl:text-[19px] 4xl:text-[22px] leading-[1.55] text-ink-muted";

// =============================================================================
// ABOUT MONOGRAPH TYPE SCALE — the role ladder the About page composes from.
//
// ⚠️ 2026-09-01 — LADDER REPAIRED, AND THE OLD DOC HERE WAS FICTION. This block
// used to claim "seven desktop ceilings: title 58 · pull-line 42 · subhead 34 ·
// lead 23 · body 20 · caption 16" and "no adjacent-role jump exceeds ~1.4×".
// NOT ONE of those numbers matched the code beneath it (the real ceilings were
// 112 / 78 / 62 / 48 / 44 / 22), and the ladder was not merely mis-documented,
// it was BROKEN — because roles 1–3 are continuous `clamp(…vw…)` and roles 4–6
// were discrete Tailwind breakpoint steps. Two scaling systems crossing each
// other is the classic fluid-type failure: measured at 1728px the page ranked
//     STANDOUT 46.7 > LEAD 42 > BODY 38 > SUBHEAD 36.3 > CAPTION 20
// i.e. role 3, a Fraunces section SUBHEAD, rendered SMALLER than the sans body
// copy underneath it, across the whole 1536–2000px band (every 1536 / 1728 /
// 1920 desktop). Roles 2–5 were mashed into one 36–47px register and then fell
// off a 2× cliff to caption.
//
// The repair deliberately RAISES the two display roles and leaves every PROSE
// size (LEAD / BODY) untouched — Hugo's most recent standing feedback is that
// 4K text is too small, so the ladder is fixed by lifting the headings, never by
// shrinking the reading text. Measured ratios after the repair:
//   width   STANDOUT  SUBHEAD  LEAD  BODY  CAPTION    STANDOUT:SUBHEAD:LEAD
//   1440      58.3     45.4     27    24     18          1.28 · 1.68
//   1728      70.0     54.4     42    38     24          1.29 · 1.30
//   1920      77.8     60.5     42    38     24          1.29 · 1.44
//   2560      98.0     76.0     48    44     32          1.29 · 1.58
// A clean, monotonic ~1.29× step between the display roles at every width, and
// a subhead that always clears the prose beneath it. Colour ramp encodes the
// hierarchy so size doesn't have to: lead text-ink/90 → body text-ink-soft →
// caption/meta text-ink-muted. Prose roles (BODY / LEAD) are ALWAYS sans;
// Fraunces (font-display) is reserved for roles 1–3 (TITLE_ABOUT / SUBHEAD /
// STANDOUT), the masthead h1, the Anegada headline and italic caption titles.
// Exported here (the canonical shared-constant home) so About.tsx imports them
// rather than re-typing bespoke clamps per section — the drift the rebuild kills.
// =============================================================================

/** ROLE 5 — BODY (sans). The default running-prose measure. Desktop ceiling
 *  20px (was a 25px runaway). Leading eases to 1.6 on desktop. Mobile floors
 *  (18px / 1.58) + the md: step (19px / 1.7) are frozen. */
export const ABOUT_BODY =
  "font-sans font-normal text-[22px] md:text-[24px] 2xl:text-[31px] 3xl:text-[38px] 4xl:text-[44px] " +
  "leading-[1.55] md:leading-[1.6] 2xl:leading-[1.5] tracking-normal text-ink-soft text-pretty m-0 reading-shadow";

/** ROLE 4 — LEAD (sans). A chapter's first paragraph, one step above BODY.
 *  Desktop ceiling 23px (never display serif — the masthead-prose fix). Mobile
 *  floors + the md: step are frozen. */
export const ABOUT_LEAD =
  "font-sans font-normal text-[25px] md:text-[27px] 2xl:text-[35px] 3xl:text-[42px] 4xl:text-[48px] " +
  "leading-[1.5] md:leading-[1.6] 2xl:leading-[1.45] tracking-[-0.005em] text-ink/90 text-pretty m-0 reading-shadow";

/** ROLE 2 — PULL-LINE / STANDOUT (Fraunces). The ONE interior display-serif
 *  pull register. opsz 40 / wght 600 via the paired STYLE below.
 *  clamp(32px,2.7vw,78px) → clamp(38px,4.05vw,98px): the old slope left the
 *  page's loudest interior moment only 1.11× the lead paragraph beneath it at
 *  1728px, so it read as body copy in a serif rather than as a pull-line. */
export const ABOUT_STANDOUT =
  "font-display font-semibold tracking-[-0.02em] text-[clamp(38px,4.05vw,98px)] leading-[1.14] text-ink hero-text-shadow";
export const ABOUT_STANDOUT_STYLE: CSSProperties = {
  fontVariationSettings: '"opsz" 40, "wght" 600',
};

/** ROLE 3 — SUBHEAD / interview question (Fraunces, roman).
 *  ⚠️ THIS IS THE ROLE THAT WAS INVERTED. clamp(28px,2.1vw,62px) put a section
 *  subhead at 36.3px directly above a 42px lead and 38px body at 1728px — the
 *  heading ranked FIFTH of six. clamp(32px,3.15vw,76px) clears the prose by
 *  ≥1.19× at every width from 390px to 4K while staying ~0.78× of STANDOUT. */
export const ABOUT_SUBHEAD =
  "font-display font-semibold tracking-[-0.02em] text-[clamp(32px,3.15vw,76px)] leading-[1.18] text-ink hero-text-shadow";
export const ABOUT_SUBHEAD_STYLE: CSSProperties = {
  fontVariationSettings: '"opsz" 40, "wght" 600',
};

/** ROLE 1 — CHAPTER / SECTION TITLE (Fraunces). The largest RECURRING type on
 *  the page, beneath the page's own masthead h1.
 *  ⚠️ 2026-09-01: like MASTHEAD_TITLE_STYLE_SM this export currently has ZERO
 *  consumers (About.tsx imports roles 2–6 only and gets role 1 from its own
 *  masthead). Re-scaled anyway so it stays ranked ~1.3× above the raised
 *  ABOUT_STANDOUT — at the old clamp it would have sat only 1.10× above it at
 *  1440px, reproducing the collapse this pass just fixed one rung lower. */
export const ABOUT_TITLE =
  "font-display font-semibold tracking-[-0.03em] text-[clamp(40px,5.4vw,128px)] leading-[1.05] text-ink";
export const ABOUT_TITLE_STYLE: CSSProperties = {
  fontVariationSettings: '"opsz" 40, "wght" 600',
};

/** ROLE 6 — CAPTION / META (sans). The quietest ink, so brightest→quietest
 *  (body > caption) carries the hierarchy and size does not have to shout it.
 *  2026-09-01: the caption fell from 0.73× body on mobile to 0.50× body at 4K —
 *  a documentary caption turning into a footnote precisely where there is most
 *  room for it. Re-pegged to a steady ~0.73–0.77× of ABOUT_BODY at every rung:
 *    390→16 (0.73×) · 768→18 (0.75×) · 1536→24 (0.77×) · 1700→28 (0.74×) ·
 *    2400+→32 (0.73×) */
export const ABOUT_CAPTION =
  "font-sans font-normal text-[16px] md:text-[18px] 2xl:text-[24px] 3xl:text-[28px] 4xl:text-[32px] leading-[1.45] tracking-[0.01em] text-ink-muted";

/** Primary CTA pill — filled ink → accent on hover. Tactile press: scales in
 *  quickly (100ms) on :active and eases back over 300ms; disabled under
 *  reduced-motion.
 *
 *  2026-09-01 — 4K STEP ADDED (label AND padding together). The pill was flat
 *  `text-[14.5px] px-8 py-[18px]` at EVERY width, so on a 4K display — where
 *  body copy renders at 44px — the site's buy buttons wore a 14.5px label in a
 *  postage-stamp pill. These are the money surfaces (BTN_PRIMARY is imported by
 *  19 files, BTN_SECONDARY by 11), so this is the single most visible large-
 *  display fix in the token set. Padding is stepped WITH the label — lifting the
 *  type alone would have left the label crammed against the pill's edge.
 *    ≤1535 unchanged · 1536→16/px-9 · 1700→17.5/px-10 · 2400+→20/px-12 */
export const BTN_PRIMARY =
  "inline-flex items-center justify-center bg-ink text-bg px-8 py-[18px] 2xl:px-9 2xl:py-[20px] 3xl:px-10 3xl:py-[22px] 4xl:px-12 4xl:py-[26px] font-sans text-[14.5px] 2xl:text-[16px] 3xl:text-[17.5px] 4xl:text-[20px] font-semibold tracking-[0.01em] rounded-full transition-[color,background-color,transform] duration-300 ease-out hover:bg-accent hover:text-ink active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

/** Secondary CTA pill — ring outline → accent on hover. Carries the SAME
 *  label + padding scale as BTN_PRIMARY so a primary/secondary pair can never
 *  render at two different sizes side by side. */
export const BTN_SECONDARY =
  "inline-flex items-center justify-center ring-1 ring-ink/30 px-8 py-[18px] 2xl:px-9 2xl:py-[20px] 3xl:px-10 3xl:py-[22px] 4xl:px-12 4xl:py-[26px] font-sans text-[14.5px] 2xl:text-[16px] 3xl:text-[17.5px] 4xl:text-[20px] font-semibold tracking-[0.01em] rounded-full transition-all duration-300 hover:ring-accent hover:text-accent active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

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
