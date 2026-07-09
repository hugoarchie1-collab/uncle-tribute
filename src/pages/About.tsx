import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { ImageReveal } from "../components/ImageReveal";
import { LoopFilm } from "../components/LoopFilm";
import { AssetImage } from "../components/AssetImage";
import { MagneticLink } from "../components/MagneticLink";
import { EnquireModal } from "../components/EnquireModal";
import {
  ABOUT,
  BIRTH_DATE,
  CREDENTIALS,
  DEATH_DATE,
  INTERVIEW,
  LIFE_DATES,
} from "../data/content";
import { Seo } from "../components/Seo";
import { PavoBackdrop } from "../components/PavoBackdrop";
import { cn } from "../lib/cn";
import {
  EYEBROW,
  EYEBROW_MUTED,
  EYEBROW_TIGHT,
  META,
  SUBTITLE,
  BTN_PRIMARY,
  BTN_SECONDARY,
} from "../components/ui/tokens";

// =============================================================================
// ABOUT — "One life, nine chapters, four skies." A chaptered monograph: the
// owner's layout-PDF order rendered beat-for-beat, paced like the home page
// (rare poster moments → contained editorial → composed photo clusters → one
// quiet letter), with a single repeated chapter signature — the hairline rule,
// the two-tone kicker, the ghost year — doing all the wayfinding.
//
// THE DOCUMENT ORDER (auditable top-to-bottom in <main> below):
//   1  Hero (front cover)                10  Ch VII — Exhibitions → interview
//   2  Opening (prologue)                11  Force India design plate
//   3  Photo cluster, wordless           12  Ch VIII — TAGA (+ palestine)
//   4  Ch I — Beginnings                 13  Ch IX — Az-Zarqa & the letter
//   5  Ch II — Bournemouth               14  The Academy close (photos)
//   6  Ch III — The wandering years      15  The body of work (site coda)
//   7  Ch IV — Return & the Anegada      16  In memoriam (untouchable)
//      poster                            17  Closing CTA
//   8  Ch V — Art as ritual (sticky)
//   9  Ch VI — Four traditions
//
// PACING LAW: every chapter gets EITHER the ghost watermark year OR one
// bespoke display moment (poster / promoted photo / letter) — never both,
// never neither. Chapter numerals derive from the CHAPTERS array index, so
// the owner's order is structurally enforced and reordering renumbers.
//
// Type canon: every chapter title is the shared TITLE token; eyebrows are
// EYEBROW / EYEBROW_MUTED / EYEBROW_TIGHT; sustained prose is BODY (below) or
// the LEAD scale (first paragraph of a chapter). Photo figures carry NO
// captions — the per-figure caption convention was removed (Hugo: "the stupid
// captions underneath pictures on about, so unneeded"), and no invented label
// text is allowed over the family/archive photos. Fraunces opsz never exceeds
// 48; only loaded weights (400/600/700) are used. No heading exceeds the TITLE
// clamp except the hero h1 and the single Anegada poster.
//
// Palette canon: cream ink over the shared peacock sky, ONE muted-ink token,
// ONE warm hairline token (ring-line / border-line). Accent appears only on
// eyebrows, the dinkus diamond, the hung quote mark and hover/selection.
//
// Photo registers (by subject, not by slot):
//   · album snapshot      → Plate (warm paper mount, NATIVE ratio, no crop)
//   · person-portrait     → ContainImage (fixed-aspect dark mat, no crop)
//   · documentary/artwork → ImageReveal (safe cover crop, soft edges)
// =============================================================================

/** Canonical body paragraph recipe — one measure, one register, used everywhere.
 *  Hanken Grotesk, 18/19px, leading 1.7 — 18px is the HOME page's smallest
 *  sustained prose (the SUBTITLE token floor). Sustained READING ink sits at
 *  the 0.85 `text-ink-soft` token; `text-ink-muted` is reserved for captions /
 *  cites / meta, so brightest→quietest (body > caption) reads. */
const BODY =
  "font-sans font-normal text-[18px] md:text-[19px] 2xl:text-[21px] 3xl:text-[clamp(21px,1.1vw,25px)] leading-[1.58] md:leading-[1.7] 2xl:leading-[1.6] text-ink-soft text-pretty m-0";

/** LEAD scale — the FIRST body paragraph of a chapter lifts one step above
 *  BODY (the two-scale drop that kills uniform-stack monotony). Never used on
 *  two consecutive paragraphs. */
const LEAD =
  "font-sans font-normal text-[19px] md:text-[21px] 2xl:text-[23px] 3xl:text-[clamp(23px,1.25vw,28px)] leading-[1.6] md:leading-[1.75] 2xl:leading-[1.45] text-ink/85 text-pretty m-0";

const SECTION = "mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] 4xl:max-w-[1880px] px-4 sm:px-6 md:px-8 lg:px-12";

/** ONE centred reading measure for the whole monograph — every chapter body,
 *  heading, caption and pull-line sits in this single calm column on the page
 *  axis (mx-auto, equal left/right margins). ~760px ≈ 62–68ch at the BODY
 *  scale; feature photos open one step wider via READING_WIDE, also centred.
 *  On large screens the measure opens proportionally (3xl/4xl) so the prose
 *  fills the viewport instead of stranding it in a narrow column — kept
 *  COMFORTABLE (never full-bleed), just one step wider as the type grows. */
// (READING — the old ~940px centred prose measure — was retired 2026-07-02:
// its last user, the Anegada story, now sits BESIDE its photograph in a
// two-column grid inside READING_WIDE.)
const READING_WIDE = "mx-auto w-full max-w-[1180px] 3xl:max-w-[1320px] 4xl:max-w-[1440px]";

// ─── STANDOUT — the one interior "pull-line" display register ────────────────
// The mid-tier standouts (ChapterStandout, the first-mandala line, the TAGA
// legacy line) are a legitimately distinct register from the shared TITLE
// (they're verbatim pull-lines spanning the measure, not chapter titles), but
// they had drifted into three different bespoke clamps (25→48 / 28→62 / 24→52)
// on two opsz values (36 vs 40). Locked here to ONE step so the register reads
// as a single voice: Fraunces opsz-40 / wght-600, one clamp, one leading.
const STANDOUT_CLASS =
  "font-display font-semibold tracking-[-0.02em] text-[clamp(26px,3.3vw,54px)] 2xl:text-[clamp(26px,3.9vw,66px)] leading-[1.12] text-ink";
const STANDOUT_STYLE = { fontVariationSettings: '"opsz" 40, "wght" 600' } as const;

// ─── CHAPTERS — the page's editorial signature ("the rule and the year") ─────
// One config array drives every ChapterHead AND the fixed chapter rail, so the
// owner's document order is structurally enforced. Every year/place below is
// established verbatim in content.ts (1966/1986 earlyLife[0]; 1990
// earlyLife[1]; 1996/2002 earlyLife[3]; Lewes/Phoenix Place legacy[0];
// Dubai/London/Brighton legacy[1]; 2010 legacy[2]; Az-Zarqa/Jordan palestine;
// 2011 INTERVIEW). "1990s" is the Bacon-style decade label, bounded by the
// documented 1990 → 1996.
interface Chapter {
  id:
    | "beginnings"
    | "bournemouth"
    | "wandering"
    | "return"
    | "ritual"
    | "lewes"
    | "exhibitions"
    | "academy"
    | "azzarqa";
  kicker: string;
  tag: string;
  /** Ghost era marker (Francis-Bacon register, watermark opacity). Chapters
   *  with a bespoke display moment (poster / promoted photo / letter) omit it
   *  — the pacing law: one or the other, never both, never neither. */
  watermark?: string;
}

const CHAPTERS: readonly Chapter[] = [
  { id: "beginnings", kicker: "Beginnings", tag: "Staffordshire · 1966", watermark: "1966" },
  { id: "bournemouth", kicker: "Bournemouth", tag: "1990", watermark: "1990" },
  { id: "wandering", kicker: "Years abroad", tag: "France · Ibiza · Mexico · The Virgin Islands", watermark: "1990s" },
  { id: "return", kicker: "Return & the first mandala", tag: "Brighton · 1996 – 2002" }, // display moment: the Anegada poster
  { id: "ritual", kicker: "Art as ritual", tag: "In his own words" }, // display moment: the sticky spread
  { id: "lewes", kicker: "Four traditions", tag: "Lewes · Phoenix Place" }, // display moment: the promoted cairn portrait
  { id: "exhibitions", kicker: "Exhibitions & commissions", tag: "Dubai · London · Brighton", watermark: "2011" },
  { id: "academy", kicker: "The Academy", tag: "Phoenix Place, Lewes · 2010", watermark: "2010" },
  { id: "azzarqa", kicker: "Az-Zarqa", tag: "Jordan" }, // display moment: the letter
];

type ChapterId = Chapter["id"];

/** Numerals derive from array INDEX — reordering CHAPTERS renumbers the page. */
const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"] as const;

// ─── ChapterHead ─────────────────────────────────────────────────────────────
// The repeated chapter signature: full-measure hairline → two-tone kicker →
// title row (+ the ghost watermark year where the pacing law allows it).
// Reveals in fixed order via sibling Reveal delays (the shipped stagger
// pattern): hairline → kicker → title row.
// Chapter heading = ONLY the factual signature (Chapter numeral · place · year).
// The big invented display titles ("A dusty old hardback", "The wandering
// years", etc.) were REMOVED — they were editorial inventions layered over
// Stephen's own words and did not belong here (Hugo). Each chapter now leads
// with the dignified factual line, then his verbatim prose.
const ChapterHead = ({ id }: { id: ChapterId }) => {
  const index = CHAPTERS.findIndex((c) => c.id === id);
  const chapter = CHAPTERS[index];
  const numeral = ROMAN_NUMERALS[index];
  return (
    <header className={cn(READING_WIDE, "text-center mb-3 md:mb-4")}>
      <Reveal as="div">
        <div aria-hidden className="h-px w-full bg-ink/15" />
      </Reveal>
      <Reveal as="div" delay={0.06}>
        <p className="m-0 mt-3">
          <span className={EYEBROW}>Chapter {numeral}</span>
          <span className={cn(EYEBROW_MUTED, "ml-3")}>
            {chapter.kicker} · {chapter.tag}
          </span>
        </p>
      </Reveal>
    </header>
  );
};

// (ChapterRail removed — the fixed I–IX numeral rail overlapped the masthead
// at xl widths and read as clutter; the chapter sequence is carried by the
// ChapterHead headers themselves.)

// ─── Plate ───────────────────────────────────────────────────────────────────
// The family-album register: a personal snapshot shown WHOLE at its native
// ratio, sitting DIRECTLY on the peacock backdrop with only a soft
// drop-shadow for depth. The old warm "paper mount" (bg-ink/[0.04] + ring +
// padding) was REMOVED 2026-07-02 — Hugo: it read as "a weird gray background
// behind each image". No object-cover, ever: these are family photographs and
// nobody may be cropped out. In fixed-aspect (fill) slots the photo is
// contained and any letterbox is TRANSPARENT, so the colourful backdrop —
// never a grey box — shows through.
const Plate = ({
  src,
  alt,
  width,
  height,
  sizes,
  fill = false,
  aspect = "aspect-[4/3]",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  /** FILL mode (Hugo: "fill the images like the home page, no gaps"): the photo
   *  covers a FIXED-aspect slot (object-cover) so a row of plates reads as ONE
   *  aligned grid with equal heights — no jigsaw. Default off = whole native ratio. */
  fill?: boolean;
  aspect?: string;
}) => (
  <figure className="m-0 flex h-full flex-col">
    {fill ? (
      <div className={cn("relative w-full", aspect)}>
        <AssetImage
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          sizes={sizes}
          className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.5)]"
        />
      </div>
    ) : (
      <AssetImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        sizes={sizes}
        className="block w-full h-auto drop-shadow-[0_24px_48px_rgba(0,0,0,0.5)]"
      />
    )}
  </figure>
);

// ─── Dinkus ──────────────────────────────────────────────────────────────────
// The quiet section-break mark — used exactly THREE times on the page
// (Art as ritual, the exhibitions→interview turn, TAGA→palestine). Static.
const Dinkus = () => (
  <div role="separator" aria-hidden className="mx-auto my-4 flex w-fit items-center gap-4">
    <span className="h-px w-12 bg-ink/15" />
    <span className="block h-1.5 w-1.5 rotate-45 bg-accent/50" />
    <span className="h-px w-12 bg-ink/15" />
  </div>
);

// ─── WordReveal ────────────────────────────────────────────────────────────
// Stagger every word into place. Used on the one cinematic headline (Anegada).
// Short-circuits entirely under reduced motion.
const WordReveal = ({
  text,
  className,
  stagger = 0.08,
  duration = 0.8,
}: {
  text: string;
  className?: string;
  stagger?: number;
  duration?: number;
}) => {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <span className={className}>{text}</span>;
  const words = text.split(" ");
  const wordVariants: Variants = {
    // Opacity + translateY only — both GPU-composited. The old per-word
    // `filter: blur()` was the worst scroll-jank source on this page (a blur
    // repaint per glyph wrapper); the reveal reads the same without it.
    hidden: { opacity: 0, y: 28 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration, ease: [0.22, 0.61, 0.36, 1] },
    },
  };
  return (
    <motion.span
      className={className}
      style={{ display: "inline" }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger } },
      }}
    >
      {words.map((w, i) => (
        <motion.span
          key={i}
          variants={wordVariants}
          style={{ display: "inline-block", whiteSpace: "pre" }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </motion.span>
  );
};

// ─── SectionLabel ───────────────────────────────────────────────────────────
// Canonical accent eyebrow — kept for the interview sub-head and the
// body-of-work coda (the chapters themselves open with ChapterHead).
const SectionLabel = ({ children }: { children: ReactNode }) => (
  <p className={cn(EYEBROW, "m-0 mb-4")}>{children}</p>
);

// ─── ContainImage ────────────────────────────────────────────────────────────
// No-crop figure: the photo sits inside a fixed-aspect slot and is shown in
// full with object-contain — so heads, feet and edges are never cut off. The
// old dark mat (bg-ink/[0.05] + ring + box-shadow) was REMOVED 2026-07-02
// (Hugo: grey boxes behind images) — the photo now floats directly on the
// peacock backdrop with a drop-shadow that hugs the image itself, and any
// letterbox area is transparent. A gentle scroll-tied parallax on the image
// only (transform/opacity), short-circuited under reduced motion.
const ContainImage = ({
  src,
  alt,
  aspect = "aspect-[4/3]",
  parallax = 0.06,
  sizes,
}: {
  src: string;
  alt: string;
  /** Tailwind aspect class for the MAT. The image is contained within it. */
  aspect?: string;
  parallax?: number;
  /** CSS sizes hint, forwarded to AssetImage so the responsive WebP width
   *  variants (where they exist) actually get picked. */
  sizes?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const px = reduceMotion ? 0 : Math.round(parallax * 60);
  const y = useTransform(scrollYProgress, [0, 1], [px, -px]);

  return (
    <div ref={ref} className={cn("relative w-full", aspect)}>
      <motion.div
        className={cn("absolute inset-0", !reduceMotion && "will-change-transform")}
        style={reduceMotion ? undefined : { y }}
      >
        <AssetImage
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          sizes={sizes}
          className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.5)]"
        />
      </motion.div>
    </div>
  );
};

// ─── AboutMasthead ──────────────────────────────────────────────────────────
// The front cover — IMAGE-FREE by design (the owner cut the photo hero and the
// name-stamped-on-a-photo title). A bold gallery-monograph masthead: a meta
// rule, the name set ENORMOUS edge-to-edge (Fraunces 700, opsz 48), then the
// opening passage packed immediately beneath as the lead — so the very first
// screen is dense, confident type over the indigo peacock glow. No photo, no
// dead space, no centred-over-a-picture treatment. The opening passage lifts
// out of Chapter-0's old "dek" slot (rendered ONCE, here) so nothing repeats.
const AboutMasthead = () => (
  <section className={cn(SECTION, "relative pt-6 md:pt-8 pb-5 md:pb-6")}>
    {/* Meta rule. On mobile the 31-char date can't share a line with the label
        + connecting rule, so they STACK (label, then date on its own line at
        gently reduced tracking — no clip). From sm:+ it's the intended single
        horizontal rule: label · hairline · date at full tracking. */}
    <Reveal as="div" className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-6 border-b border-line pb-4 md:pb-5">
      <span className={cn(EYEBROW, "shrink-0")}>In memoriam</span>
      <span aria-hidden className="hidden sm:block h-px flex-1 bg-ink/15" />
      <span className={cn(EYEBROW_MUTED, "shrink-0 !tracking-[0.18em] sm:!tracking-[0.32em]")}>{LIFE_DATES}</span>
    </Reveal>

    <Reveal as="div" className="mt-3 md:mt-4">
      <h1
        className="font-display font-bold tracking-[-0.045em] text-ink m-0 leading-[0.8]"
        style={{ fontVariationSettings: '"opsz" 48, "wght" 700', fontSize: "clamp(56px, 10.5vw, 150px)" }}
      >
        Stephen<br />Meakin
      </h1>
    </Reveal>

    <div className="mt-3 md:mt-4 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-5 items-start 2xl:items-center border-t border-line pt-4 md:pt-5">
      {/* His portrait — the first image you see, set beside his name (Hugo:
          "next to his title… avoid blank space… flawless luxury"). A contained,
          evenly-feathered plate that fills what was dead space at the cover.
          ⚠️ The aspect prop is LOAD-BEARING (fixed 2026-07-02): without it the
          ImageReveal wrapper had no height, the lazy <img> measured 0×0, and
          Chrome never lazy-loads a zero-area image — a deadlock that left the
          portrait PERMANENTLY invisible ("you haven't added that photo").
          aspect-[1337/1600] is the JPG's exact native ratio, so object-cover
          crops nothing. w-full is EQUALLY load-bearing: mx-auto on a grid item
          means shrink-to-fit, and with only an aspect-ratio wrapper inside
          there is no intrinsic width — the whole figure resolved to 0×0 and
          the image stayed invisible even after the aspect fix. */}
      <Reveal as="figure" className="m-0 mx-auto w-full max-w-[440px] md:max-w-[600px] lg:max-w-none lg:col-span-4">
        <ImageReveal
          src="/img/about/12-stephen-portrait.jpg"
          alt="Stephen Meakin"
          aspect="aspect-[1337/1600]"
          edges="all"
          parallax={0.06}
        />
      </Reveal>
      <div className="lg:col-span-8">
        <Reveal as="div">
          <p className={cn(EYEBROW_MUTED, "m-0 mb-3 leading-[1.8]")}>
            SEM · Mandala artist &amp; sacred geometer
          </p>
        </Reveal>
        <Reveal as="div" delay={0.06}>
          <p
            className="font-display font-normal tracking-[-0.01em] text-ink m-0"
            style={{
              fontVariationSettings: '"opsz" 32, "wght" 400',
              fontSize: "clamp(23px, 3vw, 60px)",
              lineHeight: 1.3,
            }}
          >
            {ABOUT.opening[0]}
          </p>
        </Reveal>
      </div>
    </div>
  </section>
);

// ─── AnegadaPoster ────────────────────────────────────────────────────────────
// The turning point — the page's SOLE giant moment (poster beat #2 of exactly
// two; 88svh, NOT 100svh — the home finale keeps that honour). The statement
// upgraded to the home's two-tier block grammar; the first-person Anegada
// story beside the sand-circle photograph; the hung-accent-mark pull-quote
// shown ONCE on the whole page. The section is TRANSPARENT so the Blood-Moon
// → Moroccan-Purple crossfade glows through. Reduced-motion short-circuits
// (WordReveal + ContainImage both bake it in).
// ⚠️ CAPTION IS CLAIM-FREE — the sand-circle photo is UNCAPTIONED in the
// owner's PDF; its venue/date are unconfirmed, so the caption must never
// claim Anegada, 1995, or "the first".
const AnegadaPoster = () => (
  <div className="mt-5 md:mt-7">
    <div className={cn(READING_WIDE, "text-center")}>
      <Reveal as="div">
        <p className={cn(EYEBROW, "m-0 mb-3")}>Anegada · 1995</p>
        <h3
          className="font-display font-bold tracking-[-0.03em] text-[clamp(48px,8vw,150px)] leading-[0.92] text-ink m-0"
          style={{ fontVariationSettings: '"opsz" 48, "wght" 700' }}
        >
          <span className="block">
            <WordReveal text="Everything" stagger={0.1} duration={1.0} />
          </span>
          <span className="block">
            <WordReveal text="is connected." stagger={0.1} duration={1.0} />
          </span>
        </h3>
      </Reveal>

      {/* The first-person Anegada story — set as ONE centred reading measure.
          The sand-circle photograph was removed 2026-07-07 (Hugo doesn't have
          the original yet); rather than leave a blank half in the old two-column
          grid, the story now reads as a single clean column between the
          "Everything is connected." headline and the pull-quote below. Drop a
          new figure back into a grid here once the real image exists. */}
      <Reveal as="div" className="mx-auto max-w-[64ch] mt-3 md:mt-4 text-left">
        <Prose text={ABOUT.anegada[0]} className={BODY} />
      </Reveal>

      {/* The hung-accent-mark pull-quote — the full sentence VERBATIM from
          content.ts (ABOUT.anegadaQuote), never truncated or re-typed.
          Centred on the page axis (the asymmetric md:ml offset is gone). */}
      <Reveal as="div" className="mx-auto max-w-[42ch] mt-3 md:mt-4">
        <span
          aria-hidden
          className="block font-display font-semibold leading-[0.8] text-accent/60 select-none"
          style={{ fontVariationSettings: '"opsz" 48, "wght" 600', fontSize: "clamp(64px,7vw,150px)" }}
        >
          &ldquo;
        </span>
        <blockquote className="m-0">
          <p
            className="font-display italic font-normal tracking-[-0.01em] text-[clamp(26px,3.3vw,58px)] text-ink m-0"
            style={{ lineHeight: 1.18 }}
          >
            {ABOUT.anegadaQuote}
          </p>
          <cite className={cn(EYEBROW_MUTED, "not-italic block mt-6")}>SEM</cite>
        </blockquote>
      </Reveal>
    </div>
  </div>
);

// ─── ClosingCTA ────────────────────────────────────────────────────────────────
// The conversion beat. Gentle scale + opacity scrub on enter; reduced-motion
// renders it statically.
const ClosingCTA = ({ onJoinFriends }: { onJoinFriends: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1.04]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.4, 1]);

  return (
    <motion.div
      ref={ref}
      style={reduceMotion ? undefined : { scale, opacity }}
      className={cn("flex flex-col items-center gap-4", !reduceMotion && "will-change-transform")}
    >
      <div className="flex flex-wrap items-center justify-center gap-3">
        <MagneticLink
          to="/collections"
          className={cn(BTN_PRIMARY, "w-fit")}
          ariaLabel="View the prints"
        >
          View the prints <span aria-hidden="true" className="ml-2">→</span>
        </MagneticLink>
        <MagneticLink
          to="/collections"
          className={cn(BTN_SECONDARY, "w-fit")}
          ariaLabel="Browse the collections"
        >
          The collections
        </MagneticLink>
      </div>
      <button type="button" onClick={onJoinFriends} className={cn(EYEBROW_MUTED, "mt-2 hover:text-accent transition-colors")}>
        Join Friends &amp; Family
      </button>
    </motion.div>
  );
};

// ─── About ─────────────────────────────────────────────────────────────────────
// The backdrop is the shared PavoBackdrop tapestry (components/PavoBackdrop.tsx):
// ALL FIVE Pavo colourways shown WHOLE + zoomed out, crossfading on page scroll
// — the EXACT same component + assets as the home page (Hugo 2026-07-02: "the
// home and about page backgrounds are exact same of all pavo paintings").

// The four traditions Stephen wove together (named exactly as in ABOUT.legacy[0]).
// The two reference photographs below the strip illustrate the Persian and
// medieval-European traditions; Insular Island Arts and the Tibetan mandala
// have no reference photo — their names carry the row. Note the I–IV numerals:
// they are the ancestor of the chapter-kicker numerals, and now rhyme with them.
const TRADITIONS = [
  { numeral: "I", name: "Ancient Insular Island Arts" },
  { numeral: "II", name: "The Rose Windows of Medieval Europe" },
  { numeral: "III", name: "The Art of Persian Geometry" },
  { numeral: "IV", name: "The Sacred Mandala of Tibet" },
];

// Q&A answers at or under this length are the interview's emotional beats
// ("To inspire wonderment." / "Shall we sit down and have some tea?") — they
// land in the large display-italic register instead of the reading register.
const BEAT_ANSWER_MAX_CHARS = 64;

// ─── InterviewQA ─────────────────────────────────────────────────────────────
// One question/answer pair from content.ts INTERVIEW, rendered verbatim.
// Questions sit in the muted sans register; long answers in the Fraunces
// reading register; beat answers (≤ BEAT_ANSWER_MAX_CHARS) land large. Used by
// the photo-essay interview flow, where working photographs from the owner's
// layout PDF breathe between the pairs.
const InterviewQA = ({ item }: { item: { q: string; a: string } }) => {
  const isBeat = item.a.length <= BEAT_ANSWER_MAX_CHARS;
  return (
    <Reveal as="div" className="border-b border-line py-4 md:py-5">
      <p className={cn(EYEBROW_MUTED, "m-0 mb-2 md:mb-3 leading-[1.9]")}>{item.q}</p>
      {isBeat ? (
        <p className="quote-hang font-display italic font-semibold tracking-[-0.02em] text-[clamp(26px,3.4vw,56px)] 2xl:text-[clamp(26px,3.8vw,64px)] leading-[1.15] text-ink m-0 text-balance">
          &ldquo;{item.a}&rdquo;
        </p>
      ) : (
        <p className="font-display font-normal tracking-[-0.01em] text-[clamp(17px,1.8vw,28px)] 2xl:text-[clamp(17px,2vw,34px)] leading-[1.6] text-ink m-0">
          {item.a}
        </p>
      )}
    </Reveal>
  );
};

// ─── The students letter — the sign-off lands alone ──────────────────────────
// Derived by SLICING the ONE verbatim string (the Welcome.reminderLong
// precedent): every character renders exactly once, nothing re-typed. The
// closing line appears once on the page, as Stephen's own sign-off.
const LETTER_SIGN_OFF = "May you have a wonderful journey.";
const signOffAt = ABOUT.studentsLetter.lastIndexOf(LETTER_SIGN_OFF);
const LETTER_BODY =
  signOffAt > 0 ? ABOUT.studentsLetter.slice(0, signOffAt).trimEnd() : ABOUT.studentsLetter;
const LETTER_CLOSE = signOffAt > 0 ? ABOUT.studentsLetter.slice(signOffAt) : "";

// Split a VERBATIM string into readable paragraphs on sentence boundaries so a
// long single-string passage reads as an article on mobile instead of one
// endless unbroken wall (Hugo 2026-07-07: "long-winded paragraphs… look
// unformatted on mobile"). Every character renders exactly once, in order — the
// SAME slicing discipline as LETTER_BODY / pullSentence above: no word is ever
// changed, re-typed, or dropped, only wrapped across <p> elements.
const paragraphize = (text: string, per = 3): string[] => {
  const sentences = text.match(/[^.!?]+(?:[.!?]+["'”’)\]]*\s*|$)/g);
  if (!sentences || sentences.length <= per) return [text];
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += per) {
    out.push(sentences.slice(i, i + per).join("").trim());
  }
  return out.filter(Boolean);
};

/** Renders a VERBATIM string as sentence-grouped paragraphs (paragraphize) so no
 *  passage is an endless unbroken wall on mobile. A short string renders as a
 *  single <p>; every character is preserved. `dropCap` styles the FIRST
 *  paragraph; `breakInside` (for CSS-column parents) keeps each paragraph whole
 *  within a column. Paragraphs after the first get top spacing. */
const Prose = ({
  text,
  className,
  per = 3,
  dropCap = false,
  breakInside = false,
}: {
  text: string;
  className?: string;
  per?: number;
  dropCap?: boolean;
  breakInside?: boolean;
}) => (
  <>
    {paragraphize(text, per).map((para, i) => (
      <p
        key={i}
        className={cn(
          className,
          i === 0 && dropCap ? "drop-cap" : "",
          i > 0 ? "mt-2 md:mt-3" : "",
          breakInside ? "[break-inside:avoid]" : "",
        )}
      >
        {para}
      </p>
    ))}
  </>
);

// ─── Verbatim pull-lines — the chapter "standout moments" ────────────────────
// EVERY standout sentence on this page is a literal substring of its chapter's
// own content.ts prose, EXTRACTED by slicing (never re-typed) — the same
// no-invention discipline as LETTER_BODY/LETTER_CLOSE above and the precedent
// fields ABOUT.anegadaQuote / ABOUT.earlyLife[4]. `pullSentence` returns the
// exact span between a start marker and the end of an inclusive end marker, so
// curly apostrophes / em-dashes / "true" quotes carry through byte-for-byte and
// no character is ever authored here. If a marker fails to match (content
// edited), it returns "" and the standout simply doesn't render — it can never
// surface invented or malformed text.
const pullSentence = (
  source: string,
  startMarker: string,
  endMarkerInclusive: string,
): string => {
  const start = source.indexOf(startMarker);
  if (start < 0) return "";
  const endAt = source.indexOf(endMarkerInclusive, start);
  if (endAt < 0) return "";
  return source.slice(start, endAt + endMarkerInclusive.length);
};

// The four chapter standouts, each sliced verbatim from THAT chapter's prose.
//   I    Beginnings   — the turn toward his own aesthetic (earlyLife[0])
//   II   Bournemouth  — the birth of the geometry passion (earlyLife[1])
//   VI   Four traditions — geometry's reach beyond the Islamic world is the
//        interview's q1 close; but VI's own legacy[0] mission line is its lead,
//        so VI keeps the TRADITIONS strip as its display and takes no pull.
//   VII  Exhibitions → interview — "earth measure" (interview q1) as the hinge
const PULL_BEGINNINGS = pullSentence(
  ABOUT.earlyLife[0],
  "Eventually, it was an exhibition",
  "inspired him most.",
);
const PULL_BOURNEMOUTH = pullSentence(
  ABOUT.earlyLife[1],
  "On finding something",
  "his passion for geometry was born.",
);
const PULL_EARTH_MEASURE = pullSentence(
  INTERVIEW.qa[0].a,
  "the word geometry means",
  "order in nature.",
);

// ─── ChapterStandout ─────────────────────────────────────────────────────────
// The repeated "one powerful verbatim sentence, pulled large under a hairline"
// beat — the Chapter-IV first-mandala moment generalised so EVERY chapter that
// lacks a bespoke display (poster / sticky chart / promoted portrait / letter)
// still gets one deliberate, screen-filling standout. The sentence is passed in
// already-sliced from content.ts (see pullSentence above) — this component
// NEVER authors text. Centred on the page axis, filling its own band so a short
// pull never strands a half-empty column beside it. Renders nothing if the
// slice came back empty (marker drift safety).
const ChapterStandout = ({
  children,
  className,
}: {
  children: string;
  className?: string;
}) => {
  if (!children) return null;
  return (
    <Reveal as="div" className={cn(READING_WIDE, "text-center", className)}>
      <div aria-hidden className="mx-auto mb-2 md:mb-3 h-px w-16 bg-ink/15" />
      <p
        className={cn(STANDOUT_CLASS, "m-0 text-balance mx-auto max-w-[34ch]")}
        style={STANDOUT_STYLE}
      >
        {children}
      </p>
    </Reveal>
  );
};

export const About = () => {
  // Friends & Family enquiry modal — opened from the closing CTA so a reader
  // moved by the biography can subscribe without leaving the page.
  const [friendsOpen, setFriendsOpen] = useState(false);
  const closeFriends = useCallback(() => setFriendsOpen(false), []);
  const openFriends = useCallback(() => setFriendsOpen(true), []);

  return (
    <div className="relative">
      {/* PAVO TAPESTRY BACKDROP — the exact same five-colourway component as
          the home page. Fade windows tuned so each colour turn lands on an ACT
          SEAM (seam offsetTop ÷ scrollable height — the Welcome convention):
            · Indigo — hero → end of Chapter II (childhood / beginnings)
            · Red    — Chapter III → the Anegada poster (wandering)
            · Yellow — the practice / public-work middle acts
            · Purple — Chapter VIII (TAGA)
            · Pink   — the Academy, the letter, farewell → footer */}
      <PavoBackdrop
        fit="cover"
        fades={[
          [0.15, 0.23],
          [0.33, 0.41],
          [0.51, 0.59],
          [0.68, 0.76],
        ]}
      />
      <Seo
        title="About Stephen Meakin — the life and work"
        description="The life and work of Stephen Meakin (1966–2021), British mandala artist and sacred geometer: from Anegada to the studio at Phoenix Place, Lewes, and a practice built on the idea that everything is connected."
        url="/about"
      />
      {/* Intro film header — owned by another task; left exactly as-is. */}
      <Nav />

      <main className="relative isolate z-10">
        {/* 1 · MASTHEAD — image-free bold front cover (the opening passage
            lives here now). */}
        <AboutMasthead />

        {/* 2 · SELF-DESCRIPTION + PORTRAIT — a dense two-column block: his own
            words ("As he described himself —", ABOUT.opening[1] VERBATIM) tight
            beside the portrait + the facts rail (every value a content.ts
            constant). No dek here anymore — the opening passage is the masthead
            lead, so nothing repeats. Caption CLAIM-FREE (PDF shows it
            uncaptioned). */}
        <section className={cn(SECTION, "py-2 md:py-3")}>
          {/* His own words set as a wide display statement (it fills the band
              instead of sitting as a thin centred quote in a wide void), with
              the facts rail spread edge-to-edge of the same measure beneath. */}
          <div className={cn(READING_WIDE, "text-center")}>
            <Reveal as="div">
              <p className={cn(EYEBROW, "m-0 mb-5")}>As he described himself —</p>
              <blockquote className="m-0">
                <Prose
                  text={`“${ABOUT.opening[1]}”`}
                  per={2}
                  className="font-display italic tracking-[-0.01em] text-[clamp(24px,3vw,52px)] 2xl:text-[clamp(24px,3.4vw,60px)] leading-[1.35] text-ink m-0 text-balance mx-auto max-w-[52ch]"
                />
              </blockquote>
            </Reveal>
            {/* Facts rail — dt/dd from content.ts constants; Staffordshire is
                earlyLife[0]'s word, Phoenix Place legacy[0]'s. Spread the three
                facts across the full measure so the strip spans the width
                rather than clustering centrally with empty side margins. */}
            <Reveal as="div" delay={0.1} className="mt-2 md:mt-3">
              <dl className="flex flex-wrap justify-center sm:justify-between items-start gap-x-10 gap-y-4 border-y border-line py-4 text-left">
                <div>
                  <dt className={cn(EYEBROW_TIGHT, "m-0 mb-1.5")}>Born</dt>
                  <dd className={cn(META, "m-0")}>{BIRTH_DATE} — Staffordshire</dd>
                </div>
                <div className="sm:text-center">
                  <dt className={cn(EYEBROW_TIGHT, "m-0 mb-1.5")}>Died</dt>
                  <dd className={cn(META, "m-0")}>{DEATH_DATE}</dd>
                </div>
                <div className="sm:text-right">
                  <dt className={cn(EYEBROW_TIGHT, "m-0 mb-1.5")}>Studio</dt>
                  <dd className={cn(META, "m-0")}>Phoenix Place, Lewes</dd>
                </div>
              </dl>
            </Reveal>
          </div>
        </section>

        {/* 3 · PHOTO CLUSTER — the man, wordless. No headings, no eyebrow:
            three personal photographs laid as prints at three baselines
            (offsets reset below md to a simple 2-col stack). All three are
            precious people shots → Plate (whole frame, native ratio, warm
            mat). The portrait's caption is right-set so the family-group
            print pulled up beside it never covers it. */}
        <section className={cn(SECTION, "py-2 md:py-3")}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 items-stretch max-w-[1080px] 3xl:max-w-[1280px] 4xl:max-w-[1400px] mx-auto">
            <Reveal as="div">
              <Plate
                src="/img/about/13-stephen-outdoor-portrait.jpg"
                alt="Stephen Meakin outdoors in sunlight, sunglasses resting on his head and earphones in, palms and greenery behind him."
                width={1600}
                height={1200}
                sizes="(min-width: 768px) 33vw, 100vw"
                fill
                aspect="aspect-[4/5]"
              />
            </Reveal>
            <Reveal as="div" delay={0.09}>
              <Plate
                src="/img/about/01-stephen-at-gallery.jpg"
                alt="Stephen Meakin standing beside one of his framed mandala paintings in a gallery."
                width={800}
                height={1200}
                sizes="(min-width: 768px) 33vw, 50vw"
                fill
                aspect="aspect-[4/5]"
              />
            </Reveal>
            <Reveal as="div" delay={0.18}>
              <Plate
                src="/img/about/14-family-group.jpg"
                alt="Stephen Meakin standing at the back of a family group of six, an older couple seated together at the centre."
                width={828}
                height={852}
                sizes="(min-width: 768px) 33vw, 50vw"
                fill
                aspect="aspect-[4/5]"
              />
            </Reveal>
          </div>
        </section>

        {/* 4 · CHAPTER I — BEGINNINGS (ghost 1966). Staffordshire, Bath &
            Brighton (ABOUT.earlyLife[0]) at the LEAD scale with the drop cap,
            beside the two family prints from PDF p3 — the second dropped
            off-grid below the first. */}
        <section id="beginnings" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3")}>
          <ChapterHead id="beginnings" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-7 3xl:gap-14 items-start max-w-[1080px] 3xl:max-w-[1280px] 4xl:max-w-[1420px] mx-auto">
            <Reveal as="div">
              <Prose text={ABOUT.earlyLife[0]} className={LEAD} dropCap />
            </Reveal>
            <div className="flex flex-col gap-6">
              <Reveal as="div">
                <Plate
                  src="/img/about/15-wedding-top-hats.jpg"
                  alt="A bride and three young men in morning dress and grey top hats at a family wedding."
                  width={1353}
                  height={814}
                  sizes="(min-width: 768px) 48vw, 100vw"
                />
              </Reveal>
              <Reveal as="div" delay={0.09}>
                <Plate
                  src="/img/about/16-family-sofa.jpg"
                  alt="A teenager in a yellow patterned shirt on a floral sofa beside two teenage girls — a family photograph."
                  width={1600}
                  height={1200}
                  sizes="(min-width: 768px) 48vw, 100vw"
                />
              </Reveal>
            </div>
          </div>

          {/* STANDOUT — the chapter's turning point, pulled VERBATIM from
              earlyLife[0]: the Aboriginal-art exhibition that set his course.
              Filled centred band under a hairline (no stranded column). */}
          <ChapterStandout className="mt-2 md:mt-3">{PULL_BEGINNINGS}</ChapterStandout>
        </section>

        {/* 5 · CHAPTER II — BOURNEMOUTH (ghost 1990). Mirror of Chapter I so
            consecutive chapters syncopate: photo left, the dusty-hardback
            passage (ABOUT.earlyLife[1]) pushed down a half-beat right, the
            café print straddling the baseline below. Document order preserved
            top-to-bottom: photo → text → photo. */}
        <section id="bournemouth" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3")}>
          <ChapterHead id="bournemouth" />
          {/* The image column STACKS both photographs (family group → café
              terrace) so it rises to the full height of the long "Being unsure…"
              paragraph beside it — no more short image floating in the middle
              of a tall column with a void above and below (Hugo 2026-07-04:
              "remove any empty space/gaps"). items-center vertically centres the
              shorter column so any residual slack splits top+bottom rather than
              pooling as one dead band (Hugo 2026-07-04: symmetry / no lopsided gap). */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-7 3xl:gap-14 items-start 2xl:items-center max-w-[1080px] 3xl:max-w-[1280px] 4xl:max-w-[1420px] mx-auto">
            <Reveal as="div" className="flex flex-col gap-5 md:gap-6">
              <Plate
                src="/img/about/17-bournemouth-friends.jpg"
                alt="Four smartly dressed young men standing together outdoors under trees."
                width={1600}
                height={900}
                sizes="(min-width: 768px) 48vw, 100vw"
              />
              <ImageReveal
                src="/img/about/18-cafe-terrace.jpg"
                alt="Stephen Meakin in a denim shirt smiling at an outdoor café table, a stoneware jug before him and cypress trees in the distance."
                aspect="aspect-[4/3]"
                edges="all"
                parallax={0.1}
                sizes="(min-width: 768px) 48vw, 100vw"
              />
            </Reveal>
            <Reveal as="div" delay={0.06}>
              <Prose text={ABOUT.earlyLife[1]} className={LEAD} dropCap />
            </Reveal>
          </div>

          {/* STANDOUT — the dusty-hardback discovery, pulled VERBATIM from
              earlyLife[1]: where his passion for geometry was born. */}
          <ChapterStandout className="mt-2 md:mt-3">{PULL_BOURNEMOUTH}</ChapterStandout>
        </section>

        {/* 6 · CHAPTER III — THE WANDERING YEARS (ghost 1990s). The album
            chapter — most photographs, loosest grid, still contained. Three
            movements: the opening pair → the passage (ABOUT.earlyLife[2],
            centred) → the wordless three-print run at three baselines (no
            rotations — offsets only; the Plate mats + shadows make the
            overlapped depths read as stacked framed prints). All five are
            people shots → Plate, never cropped. One shared caption under the
            run (its fact verbatim from earlyLife[2]). */}
        <section id="wandering" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3")}>
          <ChapterHead id="wandering" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start max-w-[1100px] 3xl:max-w-[1320px] 4xl:max-w-[1480px] mx-auto">
            <Reveal as="div">
              <Plate
                src="/img/about/19-evening-with-friends.jpg"
                alt="Three friends in white shirts at a party table at night, balloons strung from the beam behind them, Stephen Meakin among them."
                width={1600}
                height={1200}
                sizes="(min-width: 768px) 48vw, 100vw"
                fill
                aspect="aspect-[4/5]"
              />
            </Reveal>
            <Reveal as="div" delay={0.09}>
              <Plate
                src="/img/about/20-island-evening.jpg"
                alt="Stephen Meakin in a loose white shirt and jeans, seated outdoors at night during his years abroad."
                width={818}
                height={1134}
                sizes="(min-width: 768px) 32vw, 50vw"
                fill
                aspect="aspect-[4/5]"
              />
            </Reveal>
          </div>

          {/* The wandering passage flows as a BALANCED two-column measure on
              lg+ (it fills the album row's width instead of stranding a thin
              centred column), collapsing to one column below lg. The drop-cap
              opens the first column; column-fill:balance keeps the two columns
              even-bottomed (no lopsided tail). */}
          <Reveal
            as="div"
            className={cn(READING_WIDE, "mt-3 md:mt-4 lg:[column-count:2] lg:[column-gap:3.5rem] lg:[column-fill:balance]")}
          >
            <Prose text={ABOUT.earlyLife[2]} className={LEAD} dropCap breakInside />
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 items-stretch mt-2.5 md:mt-3 max-w-[900px] 3xl:max-w-[1080px] 4xl:max-w-[1200px] mx-auto">
            <Reveal as="div">
              <Plate
                src="/img/about/21-at-the-helm.jpg"
                alt="Stephen Meakin at the wheel of a motorboat, long sun-bleached hair blown back and the sea behind him."
                width={1200}
                height={1600}
                sizes="(min-width: 640px) 32vw, 100vw"
                fill
                aspect="aspect-[4/5]"
              />
            </Reveal>
            <Reveal as="div" delay={0.09}>
              <Plate
                src="/img/about/22-fancy-dress-party.jpg"
                alt="Stephen Meakin in pirate fancy dress with a toy parrot on his shoulder, a friend in an eyepatch reclining in front of him."
                width={1200}
                height={1600}
                sizes="(min-width: 640px) 32vw, 100vw"
                fill
                aspect="aspect-[4/5]"
              />
            </Reveal>
          </div>
          <Reveal as="div" className="mt-6 text-center">
            <p className={cn(EYEBROW_MUTED, "m-0")}>A four-year stay in the Virgin Islands</p>
          </Reveal>
        </section>

        {/* 7 · CHAPTER IV — RETURN & THE FIRST MANDALA (kicker-only — the
            Anegada poster below is this chapter's display moment). GAP FIX:
            the old 2-col grid stranded ABOUT.earlyLife[4] (the 100-char "He
            never stopped." line) in a half-empty cell beside the 701-char
            earlyLife[3] prose — a tall void below a short pull. Now the long
            study-years passage sits BESIDE the painting-table photograph
            (Hugo 2026-07-02: photos next to the text, never bare text
            columns), and the short verbatim line is promoted to a centred
            full-width STANDOUT band beneath a hairline, filling its own
            measure instead of floating in a stranded grid cell. Every word
            VERBATIM from content.ts. */}
        <section id="return" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3")}>
          <ChapterHead id="return" />
          {/* The study-years passage BESIDE the painting-table photograph
              (was a photo-less two-column text block — Hugo: "you haven't
              added that photo next to the text"). Photo alt is descriptive
              only; no caption (the caption convention was removed). */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-7 3xl:gap-14 items-start 2xl:items-center max-w-[1080px] 3xl:max-w-[1280px] 4xl:max-w-[1420px] mx-auto">
            <Reveal as="div">
              <Prose text={ABOUT.earlyLife[3]} className={LEAD} dropCap />
            </Reveal>
            <Reveal as="figure" delay={0.08} className="m-0">
              <ImageReveal
                src="/img/about/02-painting-table.jpg"
                alt="Stephen Meakin and a companion leaning over a large blue mandala print laid flat on the studio worktable."
                aspect="aspect-[4/3]"
                edges="all"
                parallax={0.08}
                sizes="(min-width: 768px) 48vw, 100vw"
              />
            </Reveal>
          </div>

          {/* The first-mandala line — a verbatim STANDOUT moment that spans the
              measure, centred, under a hairline. The "1999 … He never stopped."
              sentence set large fills its own band (no stranded column). */}
          <Reveal as="div" className={cn(READING_WIDE, "mt-2 md:mt-3 text-center")}>
            <div aria-hidden className="mx-auto mb-2 md:mb-3 h-px w-16 bg-ink/15" />
            <p
              className={cn(STANDOUT_CLASS, "m-0 text-balance mx-auto max-w-[18ch]")}
              style={STANDOUT_STYLE}
            >
              {ABOUT.earlyLife[4]}
            </p>
          </Reveal>

          {/* THE ANEGADA POSTER — the page's sole giant moment. */}
          <AnegadaPoster />
        </section>

        {/* 8 · CHAPTER V — ART AS RITUAL (kicker-only — the display feature is
            the two-speed sticky spread + the page's first dinkus). Stephen's
            own words on the practice: anegada[1] at LEAD, the dinkus, then
            anegada[2] at BODY — ~two screens of reading — while the
            harmonic-frequency chart holds in a sticky cell beside them, so the
            image becomes evidence while he explains harmonic frequency. The
            heading is Stephen's EXACT phrase from anegada[1] ("the very
            palette of my being") — never shorten or paraphrase it; the
            attribution line presents it as his words. parallax 0 here by law:
            sticky + transform fight. */}
        <section id="ritual" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3")}>
          <ChapterHead id="ritual" />
          <Reveal as="div" className="text-center mt-3 md:mt-4 mb-3 md:mb-4">
            <p className={cn(SUBTITLE, "mx-auto max-w-[760px] 3xl:max-w-[880px]")}>— Stephen, on his practice, in his own words</p>
          </Reveal>

          {/* Two archive photographs of Stephen at the board — the colour
              mandala from above and the gold-knotwork piece (Hugo's supplied
              studio shots). A full-width two-up that opens the practice
              chapter, so his hands-at-work lead the words. */}
          <Reveal as="div" className="mb-3 md:mb-4 mx-auto grid max-w-[1180px] 3xl:max-w-[1380px] grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <ImageReveal
              src="/img/about/stephen-painting-colour-v1.jpg"
              alt="Stephen Meakin painting a large colour mandala at his board, a finished mandala on the wall behind"
              aspect="aspect-[3/2]"
              edges="all"
              parallax={0.08}
              sizes="(min-width: 640px) 48vw, 100vw"
            />
            <ImageReveal
              src="/img/about/stephen-painting-compass-v1.jpg"
              alt="Stephen Meakin laying gold knotwork into a mandala with compass and rule"
              aspect="aspect-[3/2]"
              edges="all"
              parallax={0.08}
              sizes="(min-width: 640px) 48vw, 100vw"
            />
          </Reveal>

          {/* Lead + the cymatics chart, balanced SIDE BY SIDE — the lead is
              short enough to match the chart, so neither leaves a blank half. */}
          <div className="lg:grid lg:grid-cols-[1fr_520px] 3xl:grid-cols-[1fr_600px] lg:gap-12 3xl:gap-16 items-start max-w-[1180px] 3xl:max-w-[1380px] 4xl:max-w-[1520px] mx-auto">
            <Reveal as="div">
              <Prose text={ABOUT.anegada[1]} className={cn(LEAD, "max-w-[52ch]")} />
            </Reveal>
            <Reveal as="figure" className="m-0 mt-8 lg:mt-0 max-w-[520px] 3xl:max-w-[600px] mx-auto lg:mx-0">
              <AssetImage
                src="/img/about/25-harmonic-frequencies.jpg"
                alt="A grid of twelve cymatic patterns, each labelled with the sound frequency in hertz that formed it, from 345 Hz to 5907 Hz."
                width={612}
                height={502}
                loading="lazy"
                decoding="async"
                className="block w-full h-auto drop-shadow-[0_24px_48px_rgba(0,0,0,0.5)]"
              />
            </Reveal>
          </div>

          <Dinkus />

          {/* The long practice passage as a TWO-COLUMN editorial spread so it
              fills the width and never strands a blank half beside a narrow
              column (Hugo 2026-07-04: "can't have any of this blank space and
              stupid long paragraphs"). Stephen's words are VERBATIM + intact —
              only the flow is columned. Single column below lg. */}
          <Reveal as="div" className="max-w-[1180px] 3xl:max-w-[1380px] mx-auto mt-3 md:mt-4 columns-1 lg:columns-2 lg:gap-12 3xl:gap-16 [column-fill:_balance]">
            <Prose text={ABOUT.anegada[2]} className={BODY} breakInside />
          </Reveal>

          {/* THE RITUAL, IN MOTION — two archive clips of Stephen painting a
              mandala from above: the hundreds-of-hours practice described here,
              in motion. Muted / looping / lazy; reduced-motion holds the poster.
              A diptych at the chapter foot, feathered into the backdrop. */}
          <Reveal as="div" className="mt-4 md:mt-5 mx-auto grid max-w-[1180px] 3xl:max-w-[1380px] grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <LoopFilm
              src="/video/studio-paint-a-v1.mp4"
              poster="/video/poster-studio-paint-a-v1.jpg"
              label="Stephen Meakin painting a mandala, filmed from above"
              aspect="aspect-[16/9]"
              edges="all"
            />
            <LoopFilm
              src="/video/studio-paint-b-v1.mp4"
              poster="/video/poster-studio-paint-b-v1.jpg"
              label="Stephen Meakin laying colour into a mandala, filmed from above"
              aspect="aspect-[16/9]"
              edges="all"
            />
          </Reveal>
        </section>

        {/* 9 · CHAPTER VI — LEWES & THE FOUR TRADITIONS (kicker-only — the
            display feature is the cairn portrait promoted to hero parity:
            clear air, full column height, nothing beside it on mobile). Then
            ABOUT.legacy[0] at LEAD, the TRADITIONS I–IV hairline strip, and
            the two tradition reference photographs. Caption on the cairn is
            CLAIM-FREE (no place, no date). */}
        <section id="lewes" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3")}>
          <ChapterHead id="lewes" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-7 3xl:gap-14 items-start 2xl:items-center max-w-[1080px] 3xl:max-w-[1280px] 4xl:max-w-[1420px] mx-auto">
            <Reveal as="figure" className="m-0 max-w-[460px] md:max-w-none mx-auto md:mx-0 w-full">
              <ContainImage
                src="/img/about/03-stephen-on-cairn.jpg"
                alt="Stephen standing on a stone cairn in the desert"
                aspect="aspect-[3/4]"
                sizes="(min-width: 768px) 48vw, 100vw"
              />
            </Reveal>
            <Reveal as="div" delay={0.08}>
              <Prose text={ABOUT.legacy[0]} className={cn(LEAD, "max-w-[62ch]")} />
            </Reveal>
          </div>

          {/* The four key components, named exactly as in legacy[0]. */}
          <Reveal as="div" className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5 mt-2.5 md:mt-3 mb-2 md:mb-3">
            {TRADITIONS.map((t) => (
              <div key={t.numeral} className="border-t border-line pt-4">
                <p className={cn(EYEBROW, "m-0 mb-2")}>{t.numeral}</p>
                <p className="font-display font-normal tracking-[-0.01em] text-[clamp(17px,1.8vw,28px)] 2xl:text-[clamp(17px,2vw,34px)] leading-[1.3] text-ink m-0 text-balance">
                  {t.name}
                </p>
              </div>
            ))}
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[920px] 3xl:max-w-[1100px] 4xl:max-w-[1240px] mx-auto">
            <Reveal as="figure" className="m-0">
              <ImageReveal
                src="/img/about/26-persian-geometry.jpg"
                alt="The blue-tiled, honeycomb-vaulted entrance portal of a mosque, an example of the Persian geometric tradition Stephen studied."
                aspect="aspect-[16/9]"
                edges="all"
                parallax={0.08}
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            </Reveal>
            <Reveal as="figure" className="m-0" delay={0.09}>
              <ImageReveal
                src="/img/about/27-sainte-chapelle.jpg"
                alt="The upper chapel of Sainte-Chapelle in Paris, its walls of stained glass rising to a rose window, the medieval tradition behind Stephen's rose-window studies."
                aspect="aspect-[16/9]"
                edges="all"
                parallax={0.08}
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            </Reveal>
          </div>
        </section>

        {/* 10 · CHAPTER VII — EXHIBITIONS, FLOWING INTO THE INTERVIEW (ghost
            2011). ONE section: the lead-in (ABOUT.legacy[1] + the CREDENTIALS
            hairline ledger) flows over a dinkus DIRECTLY into the interview —
            no destination-section seam, exactly as the document intends.
            The interview photo-essay below is mounted EXACTLY as shipped
            (verified); only its position and the demoted sub-head changed.
            ⚠️ INTERVIEW CAPTIONS ARE CLAIM-FREE: the layout PDF shows these
            photographs uncaptioned, so no venue, date or painting title may be
            asserted that the image itself does not prove.
            ⚠️ The flyer is NOT from the January 2011 Majlis show: its own text
            reads "Fairmont DUBAI" and its featured painting is captioned
            "CYGNUS - 2012" — it's a LATER Mystic Rose exhibition at the
            Fairmont, presented by the Majlis Gallery. Caption only what the
            flyer itself says; never date it January 2011. */}
        <section id="exhibitions" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3")}>
          <ChapterHead id="exhibitions" />
          <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4 md:gap-6 items-start 2xl:items-center max-w-[1120px] 3xl:max-w-[1320px] 4xl:max-w-[1460px] mx-auto">
            <Reveal as="div">
              <Prose text={ABOUT.legacy[1]} className={cn(LEAD, "max-w-[62ch]")} />
            </Reveal>
            {/* The documented exhibitions & commissions — rendered from the
                canonical CREDENTIALS export (content.ts), never re-typed, as
                a quiet provenance ledger. */}
            <Reveal as="div" delay={0.08}>
              <ul className="list-none p-0 m-0">
                {CREDENTIALS.map((item) => (
                  <li key={item} className={cn(META, "border-t border-line py-3")}>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* STANDOUT — the hinge into the interview, pulled VERBATIM from his
              own answer (INTERVIEW q1): what geometry actually means. It carries
              the turn from the exhibitions ledger into his voice. */}
          <ChapterStandout className="mt-2 md:mt-3">{PULL_EARTH_MEASURE}</ChapterStandout>

          <Dinkus />

          {/* THE INTERVIEW — sub-head a half-step under the chapter head (the
              internal title is demoted from TITLE so the chapter title
              outranks it; no other internal edits). */}
          <Reveal as="div" className="mb-3 md:mb-4">
            <SectionLabel>{INTERVIEW.eyebrow}</SectionLabel>
            <h3 className="font-display italic font-normal tracking-[-0.02em] text-[clamp(24px,3vw,52px)] 2xl:text-[clamp(24px,3.4vw,60px)] leading-[1.1] text-ink text-balance m-0 max-w-[760px] 3xl:max-w-[920px]">
              In conversation.
            </h3>
          </Reveal>

          {/* Opening photograph — Stephen at work over a mandala print, the
              turquoise mandala filling the studio wall behind him (PDF p11,
              paired with the geometrist question that follows). Native 3:2 so
              cover never crops. */}
          <Reveal as="figure" className="m-0 mb-3 md:mb-4 max-w-[1040px] 3xl:max-w-[1240px] 4xl:max-w-[1380px] mx-auto 2xl:max-h-[72svh] 2xl:overflow-hidden">
            <ImageReveal
              src="/img/about/28-at-the-drafting-table.jpg"
              alt="Stephen Meakin in glasses bent over a mandala print on the studio worktable, pencil in hand, a large turquoise mandala painting filling the wall behind him"
              aspect="aspect-[16/9]"
              edges="all"
              parallax={0.1}
              sizes="(min-width: 1280px) 1180px, calc(100vw - 32px)"
            />
          </Reveal>

          {/* Scene-setting — estate-voice context left, the Mystic Rose flyer
              right (the flyer's own wording only — see the Fairmont note). */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-3 md:mb-4">
            <Reveal as="div" className="lg:col-span-7 flex flex-col gap-5 max-w-[62ch]">
              {INTERVIEW.context.map((p, i) => (
                <p key={i} className={BODY}>
                  {p}
                </p>
              ))}
            </Reveal>
            <Reveal as="figure" className="m-0 lg:col-span-5" delay={0.08}>
              <AssetImage
                src="/img/about/04-mystic-rose-flyer.jpg"
                alt="Exhibition flyer for ‘The Mystic Rose’, an exhibition of paintings by Stephen E. Meakin at the Fairmont Dubai, presented by the Majlis Gallery"
                width={900}
                height={604}
                loading="lazy"
                decoding="async"
                className="block w-full h-auto drop-shadow-[0_24px_48px_rgba(0,0,0,0.5)]"
              />
              <figcaption className="caption mt-4">
                <i>‘The Mystic Rose’</i> · Fairmont Dubai · presented by the Majlis Gallery
              </figcaption>
            </Reveal>
          </div>

          {/* Q1 — the geometrist answer, full reading measure under the opener. */}
          <div className="max-w-[860px] 3xl:max-w-[1000px] 4xl:max-w-[1100px] mx-auto border-t border-line">
            <InterviewQA item={INTERVIEW.qa[0]} />
          </div>

          {/* Q2 beside the portrait easel shot (PDF p12 top) — Stephen seated
              at the tilted circular canvas. Portrait + people → contained. */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 md:items-start 2xl:items-center mt-3 md:mt-4">
            <Reveal as="figure" className="m-0 md:col-span-5 max-w-[520px] md:max-w-none mx-auto md:mx-0 w-full">
              <ContainImage
                src="/img/about/29-at-the-easel.jpg"
                alt="Stephen Meakin seated at a tilted easel in the studio, working on a large circular canvas"
                aspect="aspect-[3/4]"
                parallax={0.06}
              />
            </Reveal>
            <div className="md:col-span-7">
              <div className="border-t border-line">
                <InterviewQA item={INTERVIEW.qa[1]} />
              </div>
            </div>
          </div>

          {/* Q3 beside the rose-window painting in progress (PDF p12 bottom) —
              mirrored composition. */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 md:items-start 2xl:items-center mt-3 md:mt-4">
            <div className="md:col-span-7 order-2 md:order-1">
              <div className="border-t border-line">
                <InterviewQA item={INTERVIEW.qa[2]} />
              </div>
            </div>
            <Reveal as="figure" className="m-0 md:col-span-5 order-1 md:order-2">
              <ImageReveal
                src="/img/about/30-painting-in-progress.jpg"
                alt="Stephen Meakin painting a circular rose-window-patterned mandala in the studio"
                aspect="aspect-[3/2]"
                edges="all"
                parallax={0.1}
                sizes="(min-width: 768px) 42vw, 100vw"
              />
            </Reveal>
          </div>

          {/* Q4, then the pair the PDF places with it — the studio wall
              crowded with finished paintings, and the paintings at home. */}
          <div className="max-w-[860px] 3xl:max-w-[1000px] 4xl:max-w-[1100px] mx-auto mt-3 md:mt-4 border-t border-line">
            <InterviewQA item={INTERVIEW.qa[3]} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-2.5 md:mt-3 max-w-[1000px] 3xl:max-w-[1200px] 4xl:max-w-[1340px] mx-auto">
            <Reveal as="figure" className="m-0">
              <ImageReveal
                src="/img/about/31-studio-wall.jpg"
                alt="A studio wall hung edge to edge with finished framed mandala paintings"
                aspect="aspect-[16/9] 2xl:aspect-[3/2]"
                edges="all"
                parallax={0.08}
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            </Reveal>
            <Reveal as="figure" className="m-0" delay={0.08}>
              <ImageReveal
                src="/img/about/32-paintings-at-home.jpg"
                alt="A sitting room hung with mandala paintings and panels"
                aspect="aspect-[16/9] 2xl:aspect-[3/2]"
                edges="all"
                parallax={0.08}
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            </Reveal>
          </div>

          {/* Between the questions — at the easel and at the brush (PDF p14):
              the deep-blue painting on the easel, and white blossoms going
              onto a large round work. */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 mt-2.5 md:mt-3">
            <Reveal as="figure" className="m-0 md:col-span-5">
              <ContainImage
                src="/img/about/33-painting-on-easel.jpg"
                alt="A deep blue, violet and gold geometric painting standing on the studio easel"
                aspect="aspect-square"
                parallax={0.05}
              />
            </Reveal>
            <Reveal as="figure" className="m-0 md:col-span-7" delay={0.08}>
              <ImageReveal
                src="/img/about/34-white-flowers-in-progress.jpg"
                alt="Stephen Meakin, palette in hand, painting clusters of white blossoms onto a large round work"
                aspect="aspect-[4/3]"
                edges="all"
                parallax={0.08}
                sizes="(min-width: 768px) 56vw, 100vw"
              />
            </Reveal>
          </div>

          {/* Q5 — the wonderment beat, answered by the gathering: the crowd
              photograph lands directly beneath it (PDF p14 bottom). */}
          <div className="max-w-[860px] 3xl:max-w-[1000px] 4xl:max-w-[1100px] mx-auto mt-3 md:mt-4 border-t border-line">
            <InterviewQA item={INTERVIEW.qa[4]} />
          </div>
          <Reveal as="figure" className="m-0 mt-2.5 md:mt-3 max-w-[1040px] 3xl:max-w-[1240px] 4xl:max-w-[1380px] mx-auto 2xl:max-h-[72svh] 2xl:overflow-hidden">
            <ImageReveal
              src="/img/about/35-gathering-at-the-gallery.jpg"
              alt="A large smiling crowd gathered with Stephen Meakin in a gallery, his paintings filling the wall behind them"
              aspect="aspect-[16/9]"
              edges="all"
              parallax={0.1}
              sizes="(min-width: 2200px) 1624px, (min-width: 1536px) 1404px, (min-width: 768px) calc(100vw - 64px), calc(100vw - 32px)"
            />
          </Reveal>

          {/* Q6 — the tea line, then the exhibition room beside the source
              credit (PDF p15). */}
          <div className="max-w-[860px] 3xl:max-w-[1000px] 4xl:max-w-[1100px] mx-auto mt-3 md:mt-4 border-t border-line">
            <InterviewQA item={INTERVIEW.qa[5]} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 md:items-start 2xl:items-center mt-2.5 md:mt-3">
            <Reveal as="figure" className="m-0 md:col-span-5">
              <ImageReveal
                src="/img/about/36-mystic-rose-exhibition.jpg"
                alt="A bright gallery room hung with framed paintings, sculptural pieces standing on plinths"
                aspect="aspect-[4/3]"
                edges="all"
                parallax={0.08}
                sizes="(min-width: 768px) 42vw, 100vw"
              />
            </Reveal>
            <Reveal as="div" className="md:col-span-7" delay={0.08}>
              <p className="font-display italic tracking-[-0.01em] text-[clamp(17px,1.8vw,28px)] 2xl:text-[clamp(17px,2vw,34px)] leading-[1.55] text-ink m-0 mb-5 max-w-[56ch]">
                {INTERVIEW.source.note}
              </p>
              <p className={cn(EYEBROW_MUTED, "m-0 leading-[1.9]")}>
                {INTERVIEW.source.publication} · {INTERVIEW.source.byline} · {INTERVIEW.source.date}
                {INTERVIEW.source.url && (
                  <>
                    {" — "}
                    <a
                      href={INTERVIEW.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4 hover:text-accent transition-colors"
                    >
                      read the archived article ↗
                    </a>
                  </>
                )}
              </p>
            </Reveal>
          </div>
        </section>

        {/* 11 · FORCE INDIA — the design plate (the PDF's post-interview
            beat). A wordless interlude between chapters, no chapter head: the
            two design sheets side by side, whole sheets at native ratio,
            sitting directly on the backdrop (the cream presentation mat was
            removed 2026-07-02 — grey/light boxes behind images). The
            purple→pink backdrop crossfade midpoint is tuned to land here. */}
        <section className={cn(SECTION, "py-2 md:py-3")}>
          <Reveal as="div" className="max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1680px] mx-auto">
            <p className={cn(EYEBROW_MUTED, "m-0 mb-6 text-center")}>From the design archive</p>
            <figure className="m-0">
              {/* Each AssetImage is wrapped in its own div: AssetImage renders a
                  <picture display:contents>, whose <source> child would otherwise
                  leak into this grid as an extra cell and push the second image
                  onto its own row — leaving ~450px of dead space (Hugo: "so much
                  empty space by Force India"). The div makes each image ONE grid
                  cell, so the two sheets sit cleanly side by side. */}
              <div className="grid md:grid-cols-2 gap-5 md:gap-8 items-start">
                <div className="min-w-0">
                  <AssetImage
                    src="/img/about/05-force-india-layout.jpg"
                    alt="Annotated layout sheet of mandala designs arranged across the bodywork of the Sahara Force India Formula One car"
                    width={960}
                    height={640}
                    loading="lazy"
                    decoding="async"
                    sizes="(min-width: 1100px) 500px, (min-width: 768px) 48vw, 100vw"
                    className="block w-full h-auto drop-shadow-[0_24px_48px_rgba(0,0,0,0.5)]"
                  />
                </div>
                <div className="min-w-0">
                  <AssetImage
                    src="/img/about/06-force-india-final.jpg"
                    alt="Stephen's mandala design for the Sahara Force India Formula One car"
                    width={904}
                    height={639}
                    loading="lazy"
                    decoding="async"
                    sizes="(min-width: 1100px) 500px, (min-width: 768px) 48vw, 100vw"
                    className="block w-full h-auto drop-shadow-[0_24px_48px_rgba(0,0,0,0.5)]"
                  />
                </div>
              </div>
            </figure>
          </Reveal>
        </section>

        {/* 12 · CHAPTER VIII — TAGA (ghost 2010). legacy[2] (one sentence —
            let it ring) promoted to the chapter's lead line, then the studio
            easel photograph beside the academyQuote + palestine passages
            (Hugo 2026-07-02: no more photo-less long-text spreads). The
            palestine passage belongs INSIDE this chapter per the PDF, and its
            mention of Az-Zarqa is the hinge into Chapter IX. */}
        <section id="academy" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3")}>
          <ChapterHead id="academy" />
          {/* The lead line rings wide as display type (it fills toward the
              edges without over-long reading lines); the two body passages then
              sit as a BALANCED two-column spread beneath a hairline — so the
              chapter fills the width instead of stranding a thin centred column
              in a wide side-void. Equal columns, one centred axis. */}
          <div className="max-w-[1080px] 3xl:max-w-[1280px] 4xl:max-w-[1420px] mx-auto">
            <Reveal as="div">
              <p
                className={cn(STANDOUT_CLASS, "m-0 text-balance mx-auto max-w-[20ch] text-center")}
                style={STANDOUT_STYLE}
              >
                {ABOUT.legacy[2]}
              </p>
            </Reveal>
            {/* The chapter's photograph BESIDE its two passages (was a
                photo-less two-column text spread — Hugo: photos next to the
                long text). The studio easel shot sits in the narrower column;
                the founding quote + the Az-Zarqa passage stack in the wider
                reading column beside it. Alt descriptive only, no caption. */}
            <div className="mt-3 md:mt-4 grid grid-cols-1 md:grid-cols-12 gap-x-12 lg:gap-x-16 3xl:gap-x-20 gap-y-5 items-start 2xl:items-center border-t border-line pt-5 md:pt-6">
              <Reveal as="figure" className="m-0 md:col-span-5">
                <ImageReveal
                  src="/img/about/11-ophiuchus-painting.jpg"
                  alt="A large purple, blue and gold geometric painting standing on a paint-spattered easel in the studio."
                  aspect="aspect-square"
                  edges="all"
                  parallax={0.06}
                  sizes="(min-width: 768px) 42vw, 100vw"
                />
              </Reveal>
              <div className="md:col-span-7 flex flex-col gap-8">
                <Reveal as="div">
                  <blockquote className="m-0">
                    <Prose text={ABOUT.academyQuote} className={BODY} />
                    <cite className={cn(EYEBROW_MUTED, "not-italic block mt-5")}>— On the founding of TAGA</cite>
                  </blockquote>
                </Reveal>
                <Reveal as="div" delay={0.08}>
                  <Prose text={ABOUT.palestine} className={BODY} />
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* 13 · CHAPTER IX — AZ-ZARQA & THE STUDENTS LETTER (kicker-only —
            the letter is the display moment; the emotional heart). The page
            narrows to a letter's measure and goes quiet: the Az-Zarqa
            photograph, the bridge line (ABOUT.studentsIntro), then the letter
            IMMEDIATELY — nothing between them. The letter is set as an
            artefact on warm paper (the Plate register given to text — a paper
            mount, not a box), in Fraunces ROMAN at low opsz (1,700 characters
            of italic would be unreadable). The sign-off lands alone — sliced
            from the ONE verbatim string, shown exactly once (the re-typed
            heading is gone). It arrives as a single object, never line by
            line.
            ⚠️ CAPTION IS CLAIM-FREE — school/Petra/Bedouin facts live in the
            verbatim palestine paragraph above; the caption claims nothing. */}
        <section id="azzarqa" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3")}>
          <ChapterHead id="azzarqa" />

          <Reveal as="figure" className="m-0 max-w-[920px] 3xl:max-w-[1100px] 4xl:max-w-[1240px] mx-auto">
            <ContainImage
              src="/img/about/07-az-zarqa-students.jpg"
              alt="Stephen seated among a group of children, the mandalas they made held up around them"
              aspect="aspect-[4/3]"
              parallax={0.06}
              sizes="(min-width: 1120px) 1080px, 100vw"
            />
          </Reveal>

          <Reveal as="div" className="mt-2 md:mt-3 text-center">
            <p className={cn(SUBTITLE, "mx-auto max-w-[52ch]")}>{ABOUT.studentsIntro}</p>
          </Reveal>

          {/* THE LETTER — one whole-element Reveal. */}
          <Reveal as="div" className="max-w-[1000px] 3xl:max-w-[1180px] 4xl:max-w-[1300px] mx-auto mt-2.5 md:mt-3">
            <article className="bg-ink/[0.04] ring-1 ring-ink/10 p-6 sm:p-8 md:p-10 3xl:p-12">
              {paragraphize(LETTER_BODY, 3).map((para, i) => (
                <p
                  key={i}
                  className={cn(
                    "font-display font-normal tracking-[-0.005em] text-[18px] md:text-[20px] 2xl:text-[22px] 3xl:text-[clamp(22px,1.2vw,27px)] leading-[1.62] md:leading-[1.7] 2xl:leading-[1.6] text-ink m-0",
                    i === 0 ? "drop-cap" : "mt-2 md:mt-3",
                  )}
                  style={{ fontVariationSettings: '"opsz" 18, "wght" 400' }}
                >
                  {para}
                </p>
              ))}
              <div aria-hidden className="h-px w-12 bg-ink/15 my-5" />
              <p
                className="font-display italic font-normal text-[clamp(22px,2.8vw,46px)] leading-[1.25] text-ink m-0"
                style={{ fontVariationSettings: '"opsz" 32, "wght" 400' }}
              >
                {LETTER_CLOSE}
              </p>
              <p className={cn(EYEBROW_MUTED, "m-0 mt-5")}>— Stephen, to his students</p>
            </article>
          </Reveal>
        </section>

        {/* 14 · THE ACADEMY CLOSE — the PDF's closing photographs. No chapter
            head, no heading — the held breath that ends the document: the
            TAGA group promoted with generous clear air, then the studio and
            the classroom at cluster scale. The group photo MUST show in full
            (heads + all the mandalas) → contained, never cropped. */}
        <section className={cn(SECTION, "py-2 md:py-3")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start max-w-[1100px] 3xl:max-w-[1300px] 4xl:max-w-[1440px] mx-auto">
            <Reveal as="figure" className="m-0">
              <ImageReveal
                src="/img/about/09-taga-studio.jpg"
                alt="A paint-spattered drafting easel in the studio, finished mandalas crowding the walls behind it"
                aspect="aspect-[4/3]"
                edges="all"
                parallax={0.08}
                sizes="(min-width: 1160px) 540px, (min-width: 768px) 50vw, 100vw"
              />
            </Reveal>
            <Reveal as="figure" delay={0.09} className="m-0">
              <ContainImage
                src="/img/about/10-taga-classroom.jpg"
                alt="Students at work around the tables of the TAGA classroom"
                aspect="aspect-[4/3]"
                sizes="(min-width: 1160px) 540px, (min-width: 768px) 50vw, 100vw"
              />
            </Reveal>
          </div>
        </section>

        {/* 15 · THE BODY OF WORK — site-only coda (not in the PDF): image-led
            pause, the paintings gathered together in the studio. Deliberately
            quiet — one eyebrow, the widest figure on the page (full SECTION
            width, soft edges like every other ImageReveal here), one caption
            whose facts are derived from paintings.ts (ten paintings, three
            collections) — no invented words. `sizes` mirrors the SECTION
            wrapper: max-w 1320/1500/1720 minus the horizontal padding at each
            step, so the 800/1400w WebP variants actually get picked instead
            of the full-size file. The backdrop is fully Mary Pink here. */}
        <section className={cn(SECTION, "py-2 md:py-3")}>
          <Reveal as="div" className="text-center mb-3 md:mb-4">
            <p className={cn(EYEBROW, "m-0")}>The body of work</p>
          </Reveal>
          <Reveal as="figure" className="my-0 2xl:max-h-[72svh] 2xl:overflow-hidden">
            <ImageReveal
              src="/img/welcome/04-paintings-collection.jpg"
              alt="Stephen Meakin's mandala paintings gathered together against the timber walls of the studio"
              aspect="aspect-[16/9]"
              edges="all"
              parallax={0.1}
              sizes="(min-width: 2200px) 1624px, (min-width: 1536px) 1404px, (min-width: 768px) calc(100vw - 64px), calc(100vw - 32px)"
            />
            <figcaption className="caption mt-5 text-center">
              Ten paintings across three collections — Habundia, Genesis and Born in the Sky
            </figcaption>
          </Reveal>
        </section>

        {/* 16 · CLOSING CTA — the family's farewell (Polly Wedge's funeral
            tribute) moved OUT of About to the Book of Memories, where it now
            reads as her posted memory of Steve (Hugo, 2026-06-29): a bio page is
            the wrong home for a funeral tribute. content.ts TRIBUTE / the
            MEMORIAL_QUOTE are unchanged — the quote still closes the home. */}
        <section className={cn(SECTION, "pt-4 md:pt-6 pb-8 md:pb-10")}>
          <ClosingCTA onJoinFriends={openFriends} />
        </section>
      </main>

      <EnquireModal
        open={friendsOpen}
        onClose={closeFriends}
        eyebrow="Friends & Family"
        title="The Mandala Company"
        subject="Subscribe — Mandala Company"
        intro="Leave your name and email and we'll add you to Friends & Family. Occasional updates only — exhibitions, new releases, news from the estate."
      />
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
