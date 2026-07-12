import { useCallback, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
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
  ABOUT_BODY,
  ABOUT_LEAD,
  ABOUT_STANDOUT,
  ABOUT_STANDOUT_STYLE,
  ABOUT_SUBHEAD,
  ABOUT_SUBHEAD_STYLE,
  ABOUT_CAPTION,
  BTN_PRIMARY,
  BTN_SECONDARY,
} from "../components/ui/tokens";

// =============================================================================
// ABOUT — "One life, nine chapters, four skies." A chaptered monograph rebuilt
// (2026-07-09) to a FIXED set of layout PRIMITIVES so the desktop page reads as
// one coherent editorial monograph — never a per-section patchwork. Hugo's
// rules, made structural: NO huge images (every content image ≤64svh; the
// Anegada poster is the sole larger moment), NO gaps (two-column rows are
// equal-height by construction — art cover-fills to the text height; people
// photos are STACKED into even rows, never cropped), PERFECT SYMMETRY (photo
// groups are even tiles at ONE shared aspect), TEXT IN LINE WITH IMAGES, one
// COHERENT small type scale (the seven-role ABOUT_* ladder from tokens.ts — no
// jarring massive→tiny jumps), EVERYTHING SEPARATED (one section rhythm), and
// LEFT-ALIGNED prose that fills the width (no centred narrow islands).
//
// DESKTOP-ONLY MANDATE: every change ships behind 2xl:(1400) / 3xl:(1700) /
// 4xl:(2400) or as the CEILING of a clamp. Mobile (base/sm/md/lg + clamp
// floors) is FROZEN and pixel-identical below 1400px.
//
// THE PRIMITIVES (defined ONCE below, every section built from exactly one):
//   P1 ProseFull        — full-width single running-text block (the default)
//   P2 ProseColumns     — balanced 2-column running text (long passages)
//   P3 PhotoRow         — even tiles, 2–3 up, ONE shared aspect (all photo groups)
//   P4 TextBesideArt    — equal-height text | ART (art cover-fills to text height)
//   P5 TextBesidePeople — contained portrait beside a height-matched stretch list
//   P6 ImageBand        — capped full-width landscape (≤64svh)
//   P7 PullLine         — short display-serif pull, its own band, left-aligned
//   P8 ChapterHead      — the repeated chapter signature + one section rhythm
//
// Type canon: prose is ALWAYS sans (BODY / LEAD). Fraunces (font-display) is
// reserved for chapter/section titles, SUBHEAD, the P7 pull-line, the masthead
// h1, the Anegada headline and italic caption titles. No running paragraph is
// ever display serif — that was the top "massive text" defect.
//
// Photo registers (by SUBJECT, not by slot):
//   · people (face / family / the artist) → Plate fill / ContainImage
//     (object-CONTAIN, transparent letterbox — a face is NEVER cropped)
//   · art / room / document → ImageReveal (object-cover safe, objectPosition center)
// =============================================================================

// ─── The seven-role type scale (imported shared home; local aliases) ─────────
// The canonical scale lives in components/ui/tokens.ts (ABOUT_*). Aliased here
// to the short names the section JSX reads with. NEVER re-type a bespoke clamp
// below these — that per-section drift is exactly what the rebuild removes.
const BODY = ABOUT_BODY;                    // role 5 — running prose, ceiling 20px
const LEAD = ABOUT_LEAD;                     // role 4 — chapter lead, ceiling 23px
const STANDOUT_CLASS = ABOUT_STANDOUT;       // role 2 — pull-line, ceiling 42px
const STANDOUT_STYLE = ABOUT_STANDOUT_STYLE;
const SUBHEAD = ABOUT_SUBHEAD;               // role 3 — subhead / Q, ceiling 34px
const SUBHEAD_STYLE = ABOUT_SUBHEAD_STYLE;
const CAPTION = ABOUT_CAPTION;               // role 6 — caption / meta, ceiling 16px

// ─── Canonical width ladder — reuse EXACTLY (invent no new max-w) ────────────
// ⚠️ every mx-auto'd aspect-ratio block MUST also carry w-full, or a bare
// aspect child collapses to 0×0 (documented gotcha). All ladders include w-full.
/** Reading measure — prose, heads, pull-lines. */
const READING_WIDE =
  "mx-auto w-full max-w-[1180px] 2xl:max-w-[1560px] 3xl:max-w-[1780px] 4xl:max-w-[1960px]";
/** Wide photo blocks — people rows needing room, portrait+list. */
const PHOTO_WIDE =
  "mx-auto w-full max-w-[1400px] 2xl:max-w-[1640px] 3xl:max-w-[1860px] 4xl:max-w-[2040px]";
/** Tight 2-up photo rows. */
const PHOTO_TIGHT = "mx-auto w-full max-w-[1080px]";

/** The one shared section shell + the delimiter rhythm (P8). */
const SECTION =
  "mx-auto max-w-[1320px] 2xl:max-w-[1640px] 3xl:max-w-[1860px] 4xl:max-w-[2040px] px-4 sm:px-6 md:px-8 lg:px-12";

// =============================================================================
// LAYOUT PRIMITIVES — P1–P8. Defined ONCE; every section composes exactly one.
// They GUARANTEE by construction: equal-height two-column rows (art fills to
// text; people photos stack), capped image heights (≤64svh), even photo tiles
// at one aspect, left-aligned prose, one type scale, one vertical rhythm.
// =============================================================================

// ─── P1 · ProseFull — full-width single running-text block (the default) ─────
// Use for any chapter lead/body when NO image sits beside it. Reach for this
// BEFORE any two-column. Prose sits LEFT (no mx-auto / text-center on the
// <Prose> itself); the 66ch cap keeps the measure sane. LEAD/BODY are sans.
const ProseFull = ({
  text,
  lead = false,
  dropCap = false,
  per = 3,
}: {
  text: string;
  lead?: boolean;
  dropCap?: boolean;
  per?: number;
}) => (
  // FILL THE WIDTH (Hugo 2026-07-09: "empty space is the enemy"): flow the text
  // into TWO balanced columns on lg+ so it spans the full (widened) measure
  // instead of a single 66ch column stranding the right half. Mobile = ONE
  // column (frozen). [column-fill:_balance] keeps the columns even-bottomed.
  <Reveal
    as="div"
    className={cn(READING_WIDE, "columns-1 lg:columns-2 lg:gap-14 3xl:gap-20 [column-fill:_balance]")}
  >
    <Prose text={text} per={per} className={cn(lead ? LEAD : BODY)} dropCap={dropCap} />
  </Reveal>
);

// ─── P2 · ProseColumns — balanced 2-column running text ──────────────────────
// ONLY for a long passage (>~600 chars) with NO image beside it, so a single
// 66ch column wouldn't strand dead space. [column-fill:_balance] is MANDATORY —
// it forces equal-bottom columns (kills the empty-right jigsaw). No per-column
// max-w (the two columns already constrain the measure). dropCap opens column 1.
const ProseColumns = ({
  text,
  dropCap = false,
  breakInside = false,
  lead = false,
}: {
  text: string;
  dropCap?: boolean;
  breakInside?: boolean;
  lead?: boolean;
}) => (
  <Reveal
    as="div"
    className={cn(READING_WIDE, "columns-1 lg:columns-2 lg:gap-12 3xl:gap-16 [column-fill:_balance]")}
  >
    <Prose text={text} className={lead ? LEAD : BODY} dropCap={dropCap} breakInside={breakInside} />
  </Reveal>
);

// ─── P3 · PhotoRow — even tiles, 2–3 up (the ONLY way to place 2–3 photos) ────
// Every tile shares ONE aspect → heights identical → no jigsaw. People tiles
// use <Plate fill> (object-contain — face never cut); art/room/doc tiles use
// <ImageReveal> (cover-safe). NEVER mix aspects in one row; never a 4-up. The
// caller passes the correct tile children; `items-stretch` levels the row.
const PhotoRow = ({
  cols = 2,
  children,
  width = "tight",
}: {
  cols?: 2 | 3;
  width?: "tight" | "wide";
  children: ReactNode;
}) => (
  <Reveal
    as="div"
    className={cn(
      width === "wide" ? PHOTO_WIDE : cols === 3 ? "mx-auto w-full max-w-[1180px]" : PHOTO_TIGHT,
      "grid grid-cols-2 gap-4 md:gap-6 items-stretch",
      cols === 3 && "md:grid-cols-3",
    )}
  >
    {children}
  </Reveal>
);

// ─── P4 · TextBesideArt — equal-height, ART cover-fills to the text ──────────
// The ONLY sanctioned text|image side-by-side, and ONLY when the neighbour is
// art / a room / a document (cover-safe). items-stretch + fill makes the art
// cover-fill to the text column's exact height → both sides equal. GUARD: use
// only when the prose is roughly one column tall; otherwise fall back to
// P1 + P3 stacked. NEVER point this at a people photo. The art sits on the
// RIGHT; pass `text` (verbatim) + the ImageReveal props.
const TextBesideArt = ({
  text,
  lead = true,
  imgSrc,
  imgAlt,
  sizes,
  per = 3,
}: {
  text: string;
  lead?: boolean;
  imgSrc: string;
  imgAlt: string;
  sizes?: string;
  per?: number;
}) => (
  <div className="mx-auto w-full max-w-[1180px] 3xl:max-w-[1380px] lg:grid lg:grid-cols-[1fr_520px] 3xl:grid-cols-[1fr_600px] lg:gap-12 lg:items-stretch">
    <Reveal as="div">
      {/* NO ch cap — the prose fills the 1fr column so the art matches its height. */}
      <Prose text={text} per={per} className={lead ? LEAD : BODY} />
    </Reveal>
    <Reveal as="figure" className="relative m-0 mt-5 lg:mt-0">
      <ImageReveal
        src={imgSrc}
        alt={imgAlt}
        sizes={sizes}
        fill
        edges="all"
        objectPosition="center"
        parallax={0.06}
        className="h-full"
      />
    </Reveal>
  </div>
);

// ─── P5 · TextBesidePeople — gap-free, face never cropped, height matched ────
// People photos can never cover-fill (would crop a face). Pair a fixed-width
// CONTAINED portrait with a sibling LIST panel whose <li> items stretch (flex-1)
// to the portrait's exact height, so both columns end level. NEVER put a long
// running paragraph here — use a segmented list / spec / short-Q&A set that can
// stretch. The list children are passed in as <li> elements.
const TextBesidePeople = ({
  imgSrc,
  imgAlt,
  imgAspect = "aspect-[4/5]",
  imgSizes,
  parallax = 0.06,
  children,
}: {
  imgSrc: string;
  imgAlt: string;
  imgAspect?: string;
  imgSizes?: string;
  parallax?: number;
  children: ReactNode;
}) => (
  <div
    className={cn(
      PHOTO_WIDE,
      "grid grid-cols-1 md:grid-cols-[minmax(0,380px)_1fr] gap-8 md:gap-12 items-stretch",
    )}
  >
    <Reveal as="figure" className="m-0 max-w-[380px] mx-auto md:mx-0 w-full">
      <ContainImage src={imgSrc} alt={imgAlt} aspect={imgAspect} sizes={imgSizes} parallax={parallax} />
    </Reveal>
    <Reveal as="ul" className="m-0 flex flex-col justify-between list-none p-0">
      {children}
    </Reveal>
  </div>
);

// ─── P6 · ImageBand — capped full-width landscape image ──────────────────────
// One wide art/room/in-progress shot, height-capped so it can never become a
// "huge image." MANDATORY ceiling 2xl:max-h-[Nsvh] 2xl:overflow-hidden. Always
// landscape (16/9). Never a tall portrait as a band.
const ImageBand = ({
  src,
  alt,
  aspect = "aspect-[16/9]",
  parallax = 0.1,
  cap = "64svh",
  sizes = "(min-width: 1280px) 1180px, calc(100vw - 32px)",
  caption,
}: {
  src: string;
  alt: string;
  aspect?: string;
  parallax?: number;
  cap?: "64svh" | "56svh";
  sizes?: string;
  caption?: ReactNode;
}) => (
  <Reveal
    as="figure"
    className={cn(
      "m-0 mx-auto w-full max-w-[1180px] 3xl:max-w-[1400px]",
      cap === "64svh" && "2xl:max-h-[64svh] 2xl:overflow-hidden",
      cap === "56svh" && "2xl:max-h-[56svh] 2xl:overflow-hidden",
    )}
  >
    <ImageReveal
      src={src}
      alt={alt}
      aspect={aspect}
      edges="all"
      objectPosition="center"
      parallax={parallax}
      sizes={sizes}
    />
    {caption && <figcaption className={cn(CAPTION, "mt-4")}>{caption}</figcaption>}
  </Reveal>
);

// ─── P7 · PullLine — short display-serif pull / quote in its OWN band ─────────
// The ONLY place display serif appears in body flow. A short VERBATIM sentence
// under a hairline, filling its own full-width band (never stranding a
// half-empty column beside it), LEFT-aligned, capped max-w-[26ch]. Renders
// nothing if the slice came back empty (marker-drift safety). Short only
// (<~120 chars) — a paragraph belongs in P1/P2 as sans body.
const PullLine = ({ text, className }: { text: string; className?: string }) => {
  if (!text) return null;
  return (
    <Reveal as="div" className={cn(READING_WIDE, "mt-8 mb-6", className)}>
      <div aria-hidden className="mb-3 md:mb-4 h-px w-16 bg-ink/25" />
      <p className={cn(STANDOUT_CLASS, "m-0 max-w-[26ch] text-balance")} style={STANDOUT_STYLE}>
        {text}
      </p>
    </Reveal>
  );
};

// ─── CHAPTERS — the page's editorial signature ("the rule and the year") ─────
// One config array drives every ChapterHead so the owner's document order is
// structurally enforced. Every year/place is established verbatim in content.ts.
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
}

const CHAPTERS: readonly Chapter[] = [
  { id: "beginnings", kicker: "Beginnings", tag: "Staffordshire · 1966" },
  { id: "bournemouth", kicker: "Bournemouth", tag: "1990" },
  { id: "wandering", kicker: "Years abroad", tag: "France · Ibiza · Mexico · The Virgin Islands" },
  { id: "return", kicker: "Return & the first mandala", tag: "Brighton · 1996 – 2002" },
  { id: "ritual", kicker: "Art as ritual", tag: "In his own words" },
  { id: "lewes", kicker: "Four traditions", tag: "Lewes · Phoenix Place" },
  { id: "exhibitions", kicker: "Exhibitions & commissions", tag: "Dubai · London · Brighton" },
  { id: "academy", kicker: "The Academy", tag: "Phoenix Place, Lewes · 2010" },
  { id: "azzarqa", kicker: "Az-Zarqa", tag: "Jordan" },
];

type ChapterId = Chapter["id"];

/** Numerals derive from array INDEX — reordering CHAPTERS renumbers the page. */
const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"] as const;

// ─── P8 · ChapterHead — the repeated chapter signature (the delimiter) ───────
// Hairline rule → two-tone kicker ("Chapter {numeral} · {kicker} · {tag}").
// Reveals in fixed order via sibling Reveal delays.
const ChapterHead = ({ id }: { id: ChapterId }) => {
  const index = CHAPTERS.findIndex((c) => c.id === id);
  const chapter = CHAPTERS[index];
  const numeral = ROMAN_NUMERALS[index];
  return (
    <header className={cn(READING_WIDE, "mb-3 md:mb-4 2xl:mb-5")}>
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

// ─── Plate ───────────────────────────────────────────────────────────────────
// The family-album register: a personal snapshot shown at object-CONTAIN inside
// a fixed-aspect slot (fill) or whole at native ratio, sitting directly on the
// peacock backdrop with a soft drop-shadow. No object-cover, ever — these are
// family photographs and nobody may be cropped out; any letterbox is transparent.
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
  fill?: boolean;
  aspect?: string;
}) => (
  <figure className="m-0 flex h-full flex-col">
    {fill ? (
      // object-CONTAIN, ALWAYS — these are family photographs and NOBODY may be
      // cropped out (Hugo, 2026-07-11: "why are the images cut off on about page
      // with family"). The whole snapshot shows inside its aspect slot. NEVER
      // object-cover here — an even-tile crop that beheads a family member is the
      // worse sin. SYMMETRY FIX (Hugo, "jigsaw ... symmetry across all desktop"):
      // at md+ the slot is a uniform warm-paper MATTE MOUNT (identical bg + ring +
      // padding + card-shadow on every tile), so contain-letterboxed photos of
      // mixed orientation read as matched museum mats, not ragged floating photos.
      // Mount is md:-gated → mobile (single-column, frozen) is byte-identical.
      <div className={cn("relative w-full md:overflow-hidden md:rounded-[3px] md:bg-ink/[0.04] md:ring-1 md:ring-line md:p-4 md:drop-shadow-[0_24px_48px_rgba(0,0,0,0.5)]", aspect)}>
        <AssetImage
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          sizes={sizes}
          style={{ objectPosition: "center" }}
          className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.5)] md:inset-4 md:h-[calc(100%-2rem)] md:w-[calc(100%-2rem)] md:drop-shadow-none"
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
// The quiet section-break mark — used exactly twice (Art as ritual; the
// exhibitions→interview turn). Static.
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
// Canonical accent eyebrow — kept for the interview sub-head.
const SectionLabel = ({ children }: { children: ReactNode }) => (
  <p className={cn(EYEBROW, "m-0 mb-4")}>{children}</p>
);

// ─── ContainImage ────────────────────────────────────────────────────────────
// No-crop figure: the photo sits inside a fixed-aspect slot and is shown in full
// with object-contain — so heads, feet and edges are never cut off. The photo
// floats directly on the peacock backdrop with a drop-shadow that hugs the image
// itself; any letterbox area is transparent. Gentle scroll-tied parallax on the
// image only, short-circuited under reduced motion.
const ContainImage = ({
  src,
  alt,
  aspect = "aspect-[4/3]",
  parallax = 0.06,
  sizes,
}: {
  src: string;
  alt: string;
  aspect?: string;
  parallax?: number;
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
    <div ref={ref} className={cn("relative w-full md:overflow-hidden md:rounded-[3px] md:bg-ink/[0.04] md:ring-1 md:ring-line md:p-4 md:drop-shadow-[0_24px_48px_rgba(0,0,0,0.5)]", aspect)}>
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
          className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.5)] md:inset-4 md:h-[calc(100%-2rem)] md:w-[calc(100%-2rem)] md:drop-shadow-none"
        />
      </motion.div>
    </div>
  );
};

// ─── AboutMasthead ──────────────────────────────────────────────────────────
// The front cover: a meta rule, the name set enormous (the sanctioned masthead
// h1), then his portrait beside the opening passage. DEFECT #1 FIX: the opening
// passage renders as LEAD (sans, ≤23px) — NOT the old ≤60px display serif that
// was Hugo's #1 "massive text" complaint. Portrait keeps aspect + w-full (the
// 0×0 lazy-load gotcha).
const AboutMasthead = () => (
  <section className={cn(SECTION, "relative pt-6 md:pt-8 pb-5 md:pb-6")}>
    <Reveal as="div" className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-6 border-b border-line pb-4 md:pb-5">
      <span className={cn(EYEBROW, "shrink-0")}>In memoriam</span>
      <span aria-hidden className="hidden sm:block h-px flex-1 bg-ink/15" />
      <span className={cn(EYEBROW_MUTED, "shrink-0 !tracking-[0.18em] sm:!tracking-[0.32em]")}>{LIFE_DATES}</span>
    </Reveal>

    <div className="mt-3 md:mt-4 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-5 items-start border-t border-line pt-4 md:pt-5">
      {/* His portrait — PEOPLE → ImageReveal at native ratio, no crop. aspect +
          w-full are LOAD-BEARING (0×0 lazy-load deadlock without them). */}
      <Reveal as="figure" className="m-0 mx-auto w-full max-w-[440px] md:max-w-[600px] lg:max-w-none lg:col-span-4 2xl:max-h-[52svh] 2xl:overflow-hidden">
        <ImageReveal
          src="/img/about/12-stephen-portrait.jpg"
          alt="Stephen Meakin"
          aspect="aspect-[1337/1600]"
          edges="all"
          parallax={0.06}
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 600px, 100vw"
        />
      </Reveal>
      {/* Name sits BESIDE the portrait so the text column fills to the
          portrait's height (matched, no dead band beside a short intro). */}
      <div className="lg:col-span-8 flex flex-col justify-center">
        <Reveal as="div">
          <h1
            className="font-display font-bold tracking-[-0.045em] text-ink m-0 leading-[0.84]"
            style={{ fontVariationSettings: '"opsz" 48, "wght" 700', fontSize: "clamp(52px, 8vw, 140px)" }}
          >
            Stephen<br />Meakin
          </h1>
        </Reveal>
        <Reveal as="div" delay={0.04}>
          <p className={cn(EYEBROW_MUTED, "m-0 mt-4 md:mt-5 mb-3 leading-[1.8]")}>
            SEM · Mandala artist &amp; sacred geometer
          </p>
        </Reveal>
        <Reveal as="div" delay={0.08}>
          {/* opening[0] renders as LEAD (sans, ≤23px), never display serif. */}
          <Prose text={ABOUT.opening[0]} per={2} className={cn(LEAD, "max-w-[62ch]")} />
        </Reveal>
      </div>
    </div>
  </section>
);

// ─── AnegadaPoster ────────────────────────────────────────────────────────────
// The turning point — the page's SOLE giant moment (≤88svh headline). The
// giant "Everything / is connected." headline stays centered (the one display
// moment); the story + the pull-quote are LEFT-aligned within READING_WIDE
// (DEFECT #3 FIX — the old text-center / mx-auto islands are gone). The section
// is transparent so the Blood-Moon → Moroccan-Purple crossfade glows through.
// ⚠️ No image is re-added (the sand-circle photo stays removed).
const AnegadaPoster = () => (
  <div className="mt-5 md:mt-7">
    <div className={READING_WIDE}>
      <Reveal as="div" className="text-center">
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

      {/* The first-person Anegada story — 2-column on lg+ to fill the width. */}
      <Reveal as="div" className="mt-5 md:mt-6 columns-1 lg:columns-2 lg:gap-14 3xl:gap-20 [column-fill:_balance]">
        <Prose text={ABOUT.anegada[0]} className={cn(BODY)} />
      </Reveal>

      {/* The hung-accent-mark pull-quote — the full sentence VERBATIM from
          content.ts (ABOUT.anegadaQuote), LEFT-aligned. */}
      <Reveal as="div" className="mt-8 mb-6">
        <span
          aria-hidden
          className="block font-display font-semibold leading-[0.8] text-accent/60 select-none"
          style={{ fontVariationSettings: '"opsz" 40, "wght" 600', fontSize: "clamp(38px,3vw,56px)" }}
        >
          &ldquo;
        </span>
        <blockquote className="m-0">
          <p className={cn(STANDOUT_CLASS, "font-normal italic m-0 max-w-[26ch] text-balance")} style={STANDOUT_STYLE}>
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

// The four traditions Stephen wove together (named exactly as in ABOUT.legacy[0]).
const TRADITIONS = [
  { numeral: "I", name: "Ancient Insular Island Arts" },
  { numeral: "II", name: "The Rose Windows of Medieval Europe" },
  { numeral: "III", name: "The Art of Persian Geometry" },
  { numeral: "IV", name: "The Sacred Mandala of Tibet" },
];

// Q&A answers at or under this length are the interview's emotional beats
// ("To inspire wonderment." / "Shall we sit down and have some tea?") — they
// land in the SUBHEAD register instead of the reading register.
const BEAT_ANSWER_MAX_CHARS = 64;

// ─── InterviewQA ─────────────────────────────────────────────────────────────
// One question/answer pair from content.ts INTERVIEW, rendered verbatim.
// Questions sit in the muted sans eyebrow register; long answers in BODY; beat
// answers (≤ BEAT_ANSWER_MAX_CHARS) land large in the SUBHEAD role. Every pair
// spans the same READING_WIDE measure, LEFT-aligned, under a hairline — so the
// whole interview reads as one consistent-width column (no 860/920 islands).
const InterviewQA = ({ item }: { item: { q: string; a: string } }) => {
  const isBeat = item.a.length <= BEAT_ANSWER_MAX_CHARS;
  return (
    <Reveal as="div" className="border-t border-line py-4 md:py-5">
      <p className={cn(EYEBROW_MUTED, "m-0 mb-2 md:mb-3 leading-[1.9]")}>{item.q}</p>
      {isBeat ? (
        <p className={cn(SUBHEAD, "m-0 max-w-[34ch]")} style={SUBHEAD_STYLE}>
          &ldquo;{item.a}&rdquo;
        </p>
      ) : (
        <p className={cn(BODY, "max-w-[68ch]")}>{item.a}</p>
      )}
    </Reveal>
  );
};

// ─── paragraphize / Prose ─────────────────────────────────────────────────────
// Split a VERBATIM string into readable paragraphs on sentence boundaries so a
// long single string reads as an article, never one endless wall. Every
// character renders exactly once, in order — no word is changed, re-typed or
// dropped, only wrapped across <p> elements.
const paragraphize = (text: string, per = 3): string[] => {
  const sentences = text.match(/[^.!?]+(?:[.!?]+["'”’)\]]*\s*|$)/g);
  if (!sentences || sentences.length <= per) return [text];
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += per) {
    out.push(sentences.slice(i, i + per).join("").trim());
  }
  return out.filter(Boolean);
};

/** Renders a VERBATIM string as sentence-grouped paragraphs. `dropCap` styles
 *  the FIRST paragraph; `breakInside` (for CSS-column parents) keeps each
 *  paragraph whole within a column. Paragraphs after the first get top spacing. */
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

// ─── Verbatim pull-lines — sliced (never re-typed) from the chapter's prose ──
// Each standout sentence is a literal substring of its chapter's content.ts
// prose, extracted by slicing between markers, so curly apostrophes / em-dashes
// carry through byte-for-byte. A marker miss returns "" and the pull simply
// doesn't render — it can never surface invented or malformed text.
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

// (PULL_BEGINNINGS / PULL_BOURNEMOUTH removed 2026-07-09 — now the chapter prose
// is shown in full 2-column, a pull-line quoting a sentence FROM that same prose
// read as a repeat. Hugo: no repeats.)
const PULL_EARTH_MEASURE = pullSentence(
  INTERVIEW.qa[0].a,
  "the word geometry means",
  "order in nature.",
);

export const About = () => {
  // Friends & Family enquiry modal — opened from the closing CTA.
  const [friendsOpen, setFriendsOpen] = useState(false);
  const closeFriends = useCallback(() => setFriendsOpen(false), []);
  const openFriends = useCallback(() => setFriendsOpen(true), []);

  return (
    <div className="relative">
      {/* PAVO TAPESTRY BACKDROP — the exact same five-colourway component as the
          home page; fade windows land on act seams. */}
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
      <Nav />

      <main className="relative isolate z-10">
        {/* 1 · MASTHEAD — front cover; the opening passage lives here as LEAD. */}
        <AboutMasthead />

        {/* 2 · SELF-DESCRIPTION + FACTS RAIL — P1 (ProseFull) + a spread facts
            rail. His own words (opening[1] VERBATIM) sit LEFT as BODY; the facts
            <dl> spans the reading measure beneath. */}
        <section className={cn(SECTION, "py-2 md:py-3 2xl:py-4")}>
          <div className={READING_WIDE}>
            <Reveal as="div">
              <p className={cn(EYEBROW, "m-0 mb-5")}>As he described himself —</p>
              {/* 2-column on lg+ so his words fill the width (no stranded right). */}
              <div className="columns-1 lg:columns-2 lg:gap-14 3xl:gap-20 [column-fill:_balance]">
                <Prose text={ABOUT.opening[1]} per={2} className={cn(BODY)} />
              </div>
            </Reveal>
            <Reveal as="div" delay={0.1} className="mt-5 md:mt-6 2xl:mt-8">
              <dl className="flex flex-wrap justify-between items-start gap-x-10 gap-y-4 border-y border-line py-4">
                <div>
                  <dt className={cn(EYEBROW_TIGHT, "m-0 mb-1.5")}>Born</dt>
                  <dd className={cn(CAPTION, "m-0")}>{BIRTH_DATE} — Staffordshire</dd>
                </div>
                <div>
                  <dt className={cn(EYEBROW_TIGHT, "m-0 mb-1.5")}>Died</dt>
                  <dd className={cn(CAPTION, "m-0")}>{DEATH_DATE}</dd>
                </div>
                <div>
                  <dt className={cn(EYEBROW_TIGHT, "m-0 mb-1.5")}>Studio</dt>
                  <dd className={cn(CAPTION, "m-0")}>Phoenix Place, Lewes</dd>
                </div>
              </dl>
            </Reveal>
          </div>
        </section>

        {/* 3 · PHOTO CLUSTER — P3 (3-up people, ONE aspect). The man, wordless. */}
        <section className={cn(SECTION, "py-2 md:py-3 2xl:py-4")}>
          <PhotoRow cols={3}>
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
          </PhotoRow>
        </section>

        {/* 4 · CHAPTER I — BEGINNINGS. P1 lead (dropCap) → P3 (2-up people) → P7. */}
        <section id="beginnings" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3 2xl:py-4")}>
          <ChapterHead id="beginnings" />
          <ProseFull text={ABOUT.earlyLife[0]} lead dropCap />
          <div className="mt-5 md:mt-6 2xl:mt-8">
            <PhotoRow width="wide">
              <Reveal as="div">
                <Plate
                  src="/img/about/15-wedding-top-hats.jpg"
                  alt="A bride and three young men in morning dress and grey top hats at a family wedding."
                  width={1353}
                  height={814}
                  fill
                  aspect="aspect-[3/2]"
                  sizes="(min-width: 768px) 48vw, 100vw"
                />
              </Reveal>
              <Reveal as="div" delay={0.09}>
                <Plate
                  src="/img/about/16-family-sofa.jpg"
                  alt="A teenager in a yellow patterned shirt on a floral sofa beside two teenage girls — a family photograph."
                  width={1600}
                  height={1200}
                  fill
                  aspect="aspect-[3/2]"
                  sizes="(min-width: 768px) 48vw, 100vw"
                />
              </Reveal>
            </PhotoRow>
          </div>
        </section>

        {/* 5 · CHAPTER II — BOURNEMOUTH. P1 lead (dropCap) → P3 (2-up people) → P7. */}
        <section id="bournemouth" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3 2xl:py-4")}>
          <ChapterHead id="bournemouth" />
          <ProseFull text={ABOUT.earlyLife[1]} lead dropCap />
          <div className="mt-5 md:mt-6 2xl:mt-8">
            <PhotoRow width="wide">
              <Reveal as="div">
                <Plate
                  src="/img/about/17-bournemouth-friends.jpg"
                  alt="Four smartly dressed young men standing together outdoors under trees."
                  width={1600}
                  height={900}
                  fill
                  aspect="aspect-[3/2]"
                  sizes="(min-width: 768px) 48vw, 100vw"
                />
              </Reveal>
              <Reveal as="div" delay={0.09}>
                <Plate
                  src="/img/about/18-cafe-terrace.jpg"
                  alt="Stephen Meakin in a denim shirt smiling at an outdoor café table, a stoneware jug before him and cypress trees in the distance."
                  width={1600}
                  height={1200}
                  fill
                  aspect="aspect-[3/2]"
                  sizes="(min-width: 768px) 48vw, 100vw"
                />
              </Reveal>
            </PhotoRow>
          </div>
        </section>

        {/* 6 · CHAPTER III — THE WANDERING YEARS. P2 (columns) → P3 ×2 (2-up
            people, ONE aspect each) → caption. */}
        <section id="wandering" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3 2xl:py-4")}>
          <ChapterHead id="wandering" />
          <ProseColumns text={ABOUT.earlyLife[2]} lead dropCap />
          <div className="mt-5 md:mt-6 2xl:mt-8">
            <PhotoRow>
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
                  sizes="(min-width: 768px) 48vw, 50vw"
                  fill
                  aspect="aspect-[4/5]"
                />
              </Reveal>
            </PhotoRow>
          </div>
          <div className="mt-5 md:mt-6">
            <PhotoRow>
              <Reveal as="div">
                <Plate
                  src="/img/about/21-at-the-helm.jpg"
                  alt="Stephen Meakin at the wheel of a motorboat, long sun-bleached hair blown back and the sea behind him."
                  width={1200}
                  height={1600}
                  sizes="(min-width: 768px) 48vw, 100vw"
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
                  sizes="(min-width: 768px) 48vw, 100vw"
                  fill
                  aspect="aspect-[4/5]"
                />
              </Reveal>
            </PhotoRow>
          </div>
          <Reveal as="div" className={cn(READING_WIDE, "mt-5 md:mt-6")}>
            <p className={cn(CAPTION, "m-0")}>A four-year stay in the Virgin Islands</p>
          </Reveal>
        </section>

        {/* 7 · CHAPTER IV — RETURN & THE FIRST MANDALA. P2 (columns) → P7 → the
            Anegada poster (the sole giant moment). No photo re-added. */}
        <section id="return" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3 2xl:py-4")}>
          <ChapterHead id="return" />
          <ProseColumns text={ABOUT.earlyLife[3]} lead dropCap />
          <PullLine text={ABOUT.earlyLife[4]} />
          <AnegadaPoster />
        </section>

        {/* 8 · CHAPTER V — ART AS RITUAL. SUBHEAD → P3 (2-up art) → P4 (LEAD
            beside the cymatics chart, cover-filled) → Dinkus → P2 (breakInside)
            → P3 (2-up film). */}
        <section id="ritual" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3 2xl:py-4")}>
          <ChapterHead id="ritual" />
          <Reveal as="div" className={cn(READING_WIDE, "mt-3 md:mt-4")}>
            <p className={cn(SUBHEAD, "m-0")} style={SUBHEAD_STYLE}>
              — Stephen, on his practice, in his own words
            </p>
          </Reveal>

          {/* Two archive photographs of Stephen at the board — art tiles.
              width="wide" gives a clean 2-up (was cols={3} with only 2 children
              → a ragged empty third column on md+). */}
          <div className="mt-5 md:mt-6 2xl:mt-8">
            <PhotoRow width="wide">
              <Reveal as="figure" className="m-0">
                <ImageReveal
                  src="/img/about/stephen-painting-colour-v1.jpg"
                  alt="Stephen Meakin painting a large colour mandala at his board, a finished mandala on the wall behind"
                  aspect="aspect-[3/2]"
                  edges="all"
                  parallax={0.08}
                  sizes="(min-width: 640px) 48vw, 100vw"
                />
              </Reveal>
              <Reveal as="figure" className="m-0" delay={0.09}>
                <ImageReveal
                  src="/img/about/stephen-painting-compass-v1.jpg"
                  alt="Stephen Meakin laying gold knotwork into a mandala with compass and rule"
                  aspect="aspect-[3/2]"
                  edges="all"
                  parallax={0.08}
                  sizes="(min-width: 640px) 48vw, 100vw"
                />
              </Reveal>
            </PhotoRow>
          </div>

          {/* P4 — lead beside the cymatics chart (a DOCUMENT → cover-safe), so
              the chart cover-fills to the lead's height (no short-lead gap). */}
          <div className="mt-5 md:mt-6 2xl:mt-8">
            <TextBesideArt
              text={ABOUT.anegada[1]}
              lead
              imgSrc="/img/about/25-harmonic-frequencies.jpg"
              imgAlt="A grid of twelve cymatic patterns, each labelled with the sound frequency in hertz that formed it, from 345 Hz to 5907 Hz."
              sizes="(min-width: 1024px) 520px, 100vw"
            />
          </div>

          <Dinkus />

          {/* The long practice passage as a balanced two-column spread. */}
          <ProseColumns text={ABOUT.anegada[2]} breakInside />

          {/* THE RITUAL, IN MOTION — two archive clips, an even diptych. */}
          <Reveal as="div" className="mt-5 md:mt-6 2xl:mt-8 mx-auto grid max-w-[1180px] 3xl:max-w-[1400px] grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 items-stretch">
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

        {/* 9 · CHAPTER VI — LEWES & THE FOUR TRADITIONS. P2 (lead dropCap) → P5
            (cairn portrait beside the TRADITIONS stretch list) → P3 (2-up art). */}
        <section id="lewes" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3 2xl:py-4")}>
          <ChapterHead id="lewes" />
          <ProseColumns text={ABOUT.legacy[0]} lead dropCap />
          {/* P5 — cairn portrait at aspect-[4/5] (shorter) beside the four
              traditions as a stretching list, so both columns end level. */}
          <div className="mt-5 md:mt-6 2xl:mt-8">
            <TextBesidePeople
              imgSrc="/img/about/03-stephen-on-cairn.jpg"
              imgAlt="Stephen standing on a stone cairn in the desert"
              imgAspect="aspect-[4/5]"
              imgSizes="(min-width: 768px) 380px, 100vw"
            >
              {TRADITIONS.map((t) => (
                <li key={t.numeral} className="flex-1 flex flex-col justify-center border-t border-line pt-4">
                  <p className={cn(EYEBROW, "m-0 mb-2")}>{t.numeral}</p>
                  <p className={cn(SUBHEAD, "m-0 text-balance")} style={SUBHEAD_STYLE}>
                    {t.name}
                  </p>
                </li>
              ))}
            </TextBesidePeople>
          </div>
          {/* Two tradition reference photographs — art tiles, ONE aspect. */}
          <div className="mt-5 md:mt-6">
            <PhotoRow>
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
            </PhotoRow>
          </div>
        </section>

        {/* 10 · CHAPTER VII — EXHIBITIONS, FLOWING INTO THE INTERVIEW. P5
            (legacy[1] lead beside the CREDENTIALS stretch ledger) → P7 → Dinkus
            → interview head → P4 (context beside the flyer) → Q&A × N interleaved
            with P3 photo rows / P6 bands, all Q&A in ONE reading measure. */}
        <section id="exhibitions" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3 2xl:py-4")}>
          <ChapterHead id="exhibitions" />
          {/* CREDENTIALS lead — P4-shaped, but the ledger is a stretching list
              (not art), so use the P5 pairing shape with the LEAD as the panel. */}
          <div
            className={cn(
              PHOTO_WIDE,
              "grid grid-cols-1 lg:grid-cols-[1fr_360px] 3xl:grid-cols-[1fr_420px] gap-8 lg:gap-12 items-stretch",
            )}
          >
            <Reveal as="div">
              <Prose text={ABOUT.legacy[1]} className={LEAD} />
            </Reveal>
            <Reveal as="ul" className="m-0 flex flex-col justify-between list-none p-0">
              {CREDENTIALS.map((item) => (
                <li key={item} className={cn(CAPTION, "flex-1 flex flex-col justify-center border-t border-line py-3")}>
                  {item}
                </li>
              ))}
            </Reveal>
          </div>

          <PullLine text={PULL_EARTH_MEASURE} />

          <Dinkus />

          {/* THE INTERVIEW — sub-head demoted under the chapter head. */}
          <Reveal as="div" className={cn(READING_WIDE, "mb-5 md:mb-6")}>
            <SectionLabel>{INTERVIEW.eyebrow}</SectionLabel>
            <h3 className={cn(SUBHEAD, "italic font-normal m-0")} style={SUBHEAD_STYLE}>
              In conversation.
            </h3>
          </Reveal>

          {/* Scene-setting context beside the Mystic Rose flyer (a DOCUMENT →
              cover-safe; cover-fills to the context height). */}
          <div className="mx-auto w-full max-w-[1180px] 3xl:max-w-[1380px] lg:grid lg:grid-cols-[1fr_440px] 3xl:grid-cols-[1fr_500px] lg:gap-12 lg:items-stretch">
            <Reveal as="div">
              {INTERVIEW.context.map((p, i) => (
                <p key={i} className={cn(BODY, i > 0 ? "mt-3 md:mt-4" : "")}>
                  {p}
                </p>
              ))}
            </Reveal>
            <Reveal as="figure" className="relative m-0 mt-5 lg:mt-0" delay={0.08}>
              <ImageReveal
                src="/img/about/04-mystic-rose-flyer.jpg"
                alt="Exhibition flyer for ‘The Mystic Rose’, an exhibition of paintings by Stephen E. Meakin at the Fairmont Dubai, presented by the Majlis Gallery"
                fill
                edges="all"
                objectPosition="center"
                parallax={0.06}
                className="h-full"
                sizes="(min-width: 1024px) 440px, 100vw"
              />
              <figcaption className={cn(CAPTION, "mt-4")}>
                <i>‘The Mystic Rose’</i> · Fairmont Dubai · presented by the Majlis Gallery
              </figcaption>
            </Reveal>
          </div>

          {/* Q1 — full reading measure. */}
          <div className={cn(READING_WIDE, "mt-5 md:mt-6")}>
            <InterviewQA item={INTERVIEW.qa[0]} />
          </div>

          {/* Q2 — full measure; then P5 (easel PEOPLE portrait beside Q3). */}
          <div className={READING_WIDE}>
            <InterviewQA item={INTERVIEW.qa[1]} />
          </div>
          <div className="mt-5 md:mt-6">
            <TextBesidePeople
              imgSrc="/img/about/29-at-the-easel.jpg"
              imgAlt="Stephen Meakin seated at a tilted easel in the studio, working on a large circular canvas"
              imgAspect="aspect-[4/5]"
            >
              <li className="flex-1 flex flex-col justify-center">
                <p className={cn(EYEBROW_MUTED, "m-0 mb-2 md:mb-3 leading-[1.9]")}>{INTERVIEW.qa[2].q}</p>
                <p className={cn(BODY, "max-w-[62ch]")}>{INTERVIEW.qa[2].a}</p>
              </li>
            </TextBesidePeople>
          </div>

          {/* The rose-window painting in progress — P6 band (≤64svh). */}
          <div className="mt-5 md:mt-6">
            <ImageBand
              src="/img/about/30-painting-in-progress.jpg"
              alt="Stephen Meakin painting a circular rose-window-patterned mandala in the studio"
              parallax={0.1}
            />
          </div>

          {/* Q4, then the pair the PDF places with it — P3 (2-up art). */}
          <div className={cn(READING_WIDE, "mt-5 md:mt-6")}>
            <InterviewQA item={INTERVIEW.qa[3]} />
          </div>
          <div className="mt-5 md:mt-6">
            <PhotoRow>
              <Reveal as="figure" className="m-0">
                <ImageReveal
                  src="/img/about/31-studio-wall.jpg"
                  alt="A studio wall hung edge to edge with finished framed mandala paintings"
                  aspect="aspect-[16/9]"
                  edges="all"
                  parallax={0.08}
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
              </Reveal>
              <Reveal as="figure" className="m-0" delay={0.08}>
                <ImageReveal
                  src="/img/about/32-paintings-at-home.jpg"
                  alt="A sitting room hung with mandala paintings and panels"
                  aspect="aspect-[16/9]"
                  edges="all"
                  parallax={0.08}
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
              </Reveal>
            </PhotoRow>
          </div>

          {/* Interlude — 33 (a painting) + 34 (in progress), P3 at ONE shared
              aspect so both cover-fill equally and bottom-align. 33 is a painting
              → ImageReveal cover (not ContainImage). */}
          <div className="mt-5 md:mt-6">
            <PhotoRow>
              <Reveal as="figure" className="m-0">
                <ImageReveal
                  src="/img/about/33-painting-on-easel.jpg"
                  alt="A deep blue, violet and gold geometric painting standing on the studio easel"
                  aspect="aspect-[4/3]"
                  edges="all"
                  parallax={0.06}
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
              </Reveal>
              <Reveal as="figure" className="m-0" delay={0.08}>
                <ImageReveal
                  src="/img/about/34-white-flowers-in-progress.jpg"
                  alt="Stephen Meakin, palette in hand, painting clusters of white blossoms onto a large round work"
                  aspect="aspect-[4/3]"
                  edges="all"
                  parallax={0.08}
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
              </Reveal>
            </PhotoRow>
          </div>

          {/* Q5 — the wonderment beat, answered by the gathering: crowd photo
              beneath it. 35 is PEOPLE → Plate fill (object-contain, no face crop),
              in an ImageBand-capped figure (≤64svh). */}
          <div className={cn(READING_WIDE, "mt-5 md:mt-6")}>
            <InterviewQA item={INTERVIEW.qa[4]} />
          </div>
          <Reveal as="figure" className="m-0 mt-5 md:mt-6 mx-auto w-full max-w-[1180px] 3xl:max-w-[1400px] 2xl:max-h-[64svh] 2xl:overflow-hidden">
            <Plate
              src="/img/about/35-gathering-at-the-gallery.jpg"
              alt="A large smiling crowd gathered with Stephen Meakin in a gallery, his paintings filling the wall behind them"
              width={1624}
              height={914}
              fill
              aspect="aspect-[16/9]"
              sizes="(min-width: 1280px) 1180px, calc(100vw - 32px)"
            />
          </Reveal>

          {/* Q6 — the tea line, then the exhibition room band + the source credit. */}
          <div className={cn(READING_WIDE, "mt-5 md:mt-6")}>
            <InterviewQA item={INTERVIEW.qa[5]} />
          </div>
          <div className="mt-5 md:mt-6">
            <ImageBand
              src="/img/about/36-mystic-rose-exhibition.jpg"
              alt="A bright gallery room hung with framed paintings, sculptural pieces standing on plinths"
              parallax={0.08}
            />
          </div>
          <Reveal as="div" className={cn(READING_WIDE, "mt-5 md:mt-6")} delay={0.08}>
            <p className={cn(BODY, "max-w-[62ch] mb-4")}>{INTERVIEW.source.note}</p>
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
        </section>

        {/* 11 · FORCE INDIA — the design plate. P3 (2-up DOC at ONE aspect). */}
        <section className={cn(SECTION, "py-2 md:py-3 2xl:py-4")}>
          <Reveal as="div" className={cn(READING_WIDE, "mb-5 md:mb-6")}>
            <p className={cn(EYEBROW_MUTED, "m-0")}>From the design archive</p>
          </Reveal>
          <PhotoRow width="wide">
            <Reveal as="figure" className="m-0">
              <ImageReveal
                src="/img/about/05-force-india-layout.jpg"
                alt="Annotated layout sheet of mandala designs arranged across the bodywork of the Sahara Force India Formula One car"
                aspect="aspect-[3/2]"
                edges="all"
                parallax={0.06}
                sizes="(min-width: 768px) 48vw, 100vw"
              />
            </Reveal>
            <Reveal as="figure" className="m-0" delay={0.08}>
              <ImageReveal
                src="/img/about/06-force-india-final.jpg"
                alt="Stephen's mandala design for the Sahara Force India Formula One car"
                aspect="aspect-[3/2]"
                edges="all"
                parallax={0.06}
                sizes="(min-width: 768px) 48vw, 100vw"
              />
            </Reveal>
          </PhotoRow>
        </section>

        {/* 12 · CHAPTER VIII — TAGA. P7 (legacy[2] lead) → P4 (ophiuchus ART
            cover-filled beside the founding quote + palestine passage). */}
        <section id="academy" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3 2xl:py-4")}>
          <ChapterHead id="academy" />
          <Reveal as="div" className={cn(READING_WIDE, "mt-3 md:mt-4")}>
            <p className={cn(STANDOUT_CLASS, "m-0 max-w-[24ch] text-balance")} style={STANDOUT_STYLE}>
              {ABOUT.legacy[2]}
            </p>
          </Reveal>
          {/* P4 — the painting cover-fills to the stacked passages' height. */}
          <div className="mt-5 md:mt-6 2xl:mt-8">
            <div className="mx-auto w-full max-w-[1180px] 3xl:max-w-[1380px] lg:grid lg:grid-cols-[1fr_520px] 3xl:grid-cols-[1fr_600px] lg:gap-12 lg:items-stretch">
              <div className="flex flex-col gap-8">
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
              <Reveal as="figure" className="relative m-0 mt-5 lg:mt-0">
                <ImageReveal
                  src="/img/about/11-ophiuchus-painting.jpg"
                  alt="A large purple, blue and gold geometric painting standing on a paint-spattered easel in the studio."
                  fill
                  edges="all"
                  objectPosition="center"
                  parallax={0.06}
                  className="h-full"
                  sizes="(min-width: 1024px) 520px, 100vw"
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* 13 · CHAPTER IX — AZ-ZARQA. PEOPLE photo (contained, LEFT) + the
            memories pointer as a text panel beside it (stacked composition;
            a people photo can't cover-fill, so P4 is illegal here). The letter
            lives ONLY on /memories. */}
        <section id="azzarqa" className={cn(SECTION, "scroll-mt-24 py-2 md:py-3 2xl:py-4")}>
          <ChapterHead id="azzarqa" />
          {/* STACKED, not side-by-side: the landscape photo then the memories
              link below it. A single-line link beside a big photo left a ~10x
              void (verify caught it). */}
          <div className={READING_WIDE}>
            <Reveal as="figure" className="m-0 max-w-[760px] 3xl:max-w-[880px] w-full">
              <ContainImage
                src="/img/about/07-az-zarqa-students.jpg"
                alt="Stephen seated among a group of children, the mandalas they made held up around them"
                aspect="aspect-[4/3]"
                parallax={0.06}
                sizes="(min-width: 768px) 760px, 100vw"
              />
            </Reveal>
            <Reveal as="div" delay={0.08} className="mt-5 md:mt-6">
              <Link
                to="/memories"
                className={cn(EYEBROW, "group inline-flex items-center gap-2 no-underline")}
              >
                His words to his students, in the Book of Memories
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
              </Link>
            </Reveal>
          </div>
        </section>

        {/* 14 · THE ACADEMY CLOSE — P3 (2-up, ONE register). Both tiles Plate
            fill (object-contain) so a cover-vs-contain register mix can't read
            uneven AND the classroom faces aren't cropped. */}
        <section className={cn(SECTION, "py-2 md:py-3 2xl:py-4")}>
          <PhotoRow width="wide">
            <Reveal as="div">
              <Plate
                src="/img/about/09-taga-studio.jpg"
                alt="A paint-spattered drafting easel in the studio, finished mandalas crowding the walls behind it"
                width={1200}
                height={900}
                fill
                aspect="aspect-[4/3]"
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            </Reveal>
            <Reveal as="div" delay={0.09}>
              <Plate
                src="/img/about/10-taga-classroom.jpg"
                alt="Students at work around the tables of the TAGA classroom"
                width={1200}
                height={900}
                fill
                aspect="aspect-[4/3]"
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            </Reveal>
          </PhotoRow>
        </section>

        {/* 15 · THE BODY OF WORK — coda. P6 band (≤64svh) + a factual caption. */}
        <section className={cn(SECTION, "py-2 md:py-3 2xl:py-4")}>
          <Reveal as="div" className={cn(READING_WIDE, "mb-5 md:mb-6")}>
            <p className={cn(EYEBROW, "m-0")}>The body of work</p>
          </Reveal>
          <ImageBand
            src="/img/welcome/04-paintings-collection.jpg"
            alt="Stephen Meakin's mandala paintings gathered together against the timber walls of the studio"
            parallax={0.1}
            caption="Ten paintings across three collections — Habundia, Genesis and Born in the Sky"
          />
        </section>

        {/* 16 · CLOSING CTA — the family's farewell. */}
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
