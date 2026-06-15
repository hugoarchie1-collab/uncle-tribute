import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
import { AssetImage } from "../components/AssetImage";
import { MagneticLink } from "../components/MagneticLink";
import { EnquireModal } from "../components/EnquireModal";
import {
  ABOUT,
  BIRTH_DATE,
  CREDENTIALS,
  DEATH_DATE,
  INTERVIEW,
  TRIBUTE,
  MEMORIAL_QUOTE,
  LIFE_DATES,
} from "../data/content";
import { Seo } from "../components/Seo";
import { cn } from "../lib/cn";
import { asset } from "../lib/asset";
import {
  EYEBROW,
  EYEBROW_MUTED,
  EYEBROW_TIGHT,
  META,
  TITLE,
  SUBTITLE,
  BTN_PRIMARY,
  BTN_SECONDARY,
  EASE_CSS,
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
// the LEAD scale (first paragraph of a chapter); captions are ONE convention
// (PlateCaption). Fraunces opsz never exceeds 48; only loaded weights
// (400/600/700) are used. No heading exceeds the TITLE clamp except the hero
// h1 and the single Anegada poster.
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
  "font-sans font-normal text-[18px] md:text-[19px] 3xl:text-[21px] leading-[1.7] text-ink-soft text-pretty m-0";

/** LEAD scale — the FIRST body paragraph of a chapter lifts one step above
 *  BODY (the two-scale drop that kills uniform-stack monotony). Never used on
 *  two consecutive paragraphs. */
const LEAD =
  "font-sans font-normal text-[19px] md:text-[21px] leading-[1.75] text-ink/85 text-pretty m-0";

const SECTION = "mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12";

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
  { id: "wandering", kicker: "The wandering years", tag: "France · Ibiza · Mexico · The Virgin Islands", watermark: "1990s" },
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
const ChapterHead = ({ id, title }: { id: ChapterId; title: string }) => {
  const index = CHAPTERS.findIndex((c) => c.id === id);
  const chapter = CHAPTERS[index];
  const numeral = ROMAN_NUMERALS[index];
  return (
    <header className="mb-10 md:mb-14">
      <Reveal as="div">
        <div aria-hidden className="h-px w-full bg-ink/15" />
      </Reveal>
      <Reveal as="div" delay={0.06}>
        <p className="m-0 mt-5 mb-4">
          <span className={EYEBROW}>Chapter {numeral}</span>
          <span className={cn(EYEBROW_MUTED, "ml-3")}>
            {chapter.kicker} · {chapter.tag}
          </span>
        </p>
      </Reveal>
      <Reveal as="div" delay={0.12}>
        <div className="grid grid-cols-12 items-end gap-4">
          <h2 className={cn(TITLE, "m-0", chapter.watermark ? "col-span-12 lg:col-span-8" : "col-span-12")}>
            {title}
          </h2>
          {chapter.watermark ? (
            <span
              aria-hidden
              className="hidden lg:block lg:col-span-4 text-right font-display font-semibold leading-none tracking-[-0.04em] text-ink/[0.14] select-none"
              style={{
                fontVariationSettings: '"opsz" 48, "wght" 600',
                fontSize: "clamp(64px,8vw,132px)",
              }}
            >
              {chapter.watermark}
            </span>
          ) : null}
        </div>
      </Reveal>
    </header>
  );
};

// ─── ChapterRail ─────────────────────────────────────────────────────────────
// Whisper-quiet fixed rail of Roman numerals (xl+ only) — native anchor jumps,
// active chapter tracked with an IntersectionObserver band across the viewport
// middle (the repo's sentinel/IO convention — no scroll listeners, no
// transforms, nothing to short-circuit under reduced motion).
const ChapterRail = () => {
  const [active, setActive] = useState<ChapterId>(CHAPTERS[0].id);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id as ChapterId);
        }
      },
      // A thin band around the viewport middle: the chapter crossing it is
      // the active one. Tall chapters keep intersecting the band for their
      // whole pass, so the numeral holds.
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    for (const c of CHAPTERS) {
      const el = document.getElementById(c.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  return (
    <nav
      aria-label="Chapters"
      className="hidden xl:flex fixed left-6 2xl:left-10 top-1/2 -translate-y-1/2 z-20 flex-col gap-3"
    >
      {CHAPTERS.map((c, i) => {
        const isActive = active === c.id;
        return (
          <a
            key={c.id}
            href={`#${c.id}`}
            aria-label={`Chapter ${ROMAN_NUMERALS[i]} — ${c.kicker}`}
            className={cn(EYEBROW_TIGHT, "group flex items-center gap-2")}
          >
            <span
              aria-hidden
              className={cn("h-px bg-accent transition-all duration-300", isActive ? "w-4" : "w-0")}
              style={{ transitionTimingFunction: EASE_CSS }}
            />
            <span
              className={cn(
                "transition-colors duration-300",
                isActive ? "text-accent" : "text-ink/35 group-hover:text-ink/70",
              )}
              style={{ transitionTimingFunction: EASE_CSS }}
            >
              {ROMAN_NUMERALS[i]}
            </span>
          </a>
        );
      })}
    </nav>
  );
};

// ─── PlateCaption ────────────────────────────────────────────────────────────
// THE one caption convention for every figure on the page: a short warm
// hairline, then the sentence-case `.caption` register. Captions stay
// CLAIM-FREE — only what the photo proves or content.ts states; a real
// painting title inside a caption sits in <i> (renders display italic).
const PlateCaption = ({ children, className }: { children: ReactNode; className?: string }) => (
  <figcaption className={cn("caption mt-3 flex items-baseline gap-3", className)}>
    <span aria-hidden className="h-px w-6 bg-line self-center shrink-0" />
    <span>{children}</span>
  </figcaption>
);

// ─── Plate ───────────────────────────────────────────────────────────────────
// The family-album register: a personal snapshot mounted WHOLE at its native
// ratio on a warm paper mat over the dark sky — the contained-framed-object
// register approved on home; the opposite of both hard black boxes and
// edge-to-edge image walls. No aspect class, no object-cover, ever. Parent
// grids use items-start so differing print heights read as composed.
const Plate = ({
  src,
  alt,
  width,
  height,
  sizes,
  caption,
  captionClassName,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  caption?: ReactNode;
  captionClassName?: string;
}) => (
  <figure className="m-0">
    <div className="bg-ink/[0.04] ring-1 ring-ink/10 p-3 md:p-4 shadow-[0_28px_70px_rgba(0,0,0,0.55)]">
      <AssetImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        sizes={sizes}
        className="block w-full h-auto"
      />
    </div>
    {caption ? <PlateCaption className={captionClassName}>{caption}</PlateCaption> : null}
  </figure>
);

// ─── Dinkus ──────────────────────────────────────────────────────────────────
// The quiet section-break mark — used exactly THREE times on the page
// (Art as ritual, the exhibitions→interview turn, TAGA→palestine). Static.
const Dinkus = () => (
  <div role="separator" aria-hidden className="mx-auto my-12 md:my-16 flex w-fit items-center gap-4">
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
// No-crop figure: the photo sits inside a fixed-aspect dark mat and is shown in
// full with object-contain — so heads, feet and edges are never cut off. A
// gentle scroll-tied parallax on the image only (transform/opacity), short-
// circuited under reduced motion. Use for portraits, group shots and the old
// family photographs that need a FIXED slot (free-height album shots → Plate).
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
    <div
      ref={ref}
      className={cn(
        "relative w-full overflow-hidden bg-bg-soft ring-1 ring-line shadow-[0_28px_70px_rgba(0,0,0,0.55)]",
        aspect,
      )}
    >
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={reduceMotion ? undefined : { y }}
      >
        <AssetImage
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          sizes={sizes}
          className="absolute inset-0 w-full h-full object-contain"
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
  <section className="relative px-4 sm:px-6 md:px-8 lg:px-12 pt-28 md:pt-36 pb-8 md:pb-12">
    <Reveal as="div" className="flex items-center gap-4 md:gap-6 border-b border-line pb-4 md:pb-5">
      <span className={EYEBROW}>In memoriam</span>
      <span aria-hidden className="h-px flex-1 bg-ink/15" />
      <span className={cn(EYEBROW_MUTED, "shrink-0")}>{LIFE_DATES}</span>
    </Reveal>

    <Reveal as="div" className="mt-4 md:mt-6">
      <h1
        className="font-display font-bold tracking-[-0.045em] text-ink m-0 leading-[0.8]"
        style={{ fontVariationSettings: '"opsz" 48, "wght" 700', fontSize: "clamp(76px, 18.5vw, 360px)" }}
      >
        Stephen<br />Meakin
      </h1>
    </Reveal>

    <div className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-5 items-start border-t border-line pt-6 md:pt-8">
      <Reveal as="div" className="lg:col-span-3">
        <p className={cn(EYEBROW_MUTED, "m-0 leading-[1.8]")}>
          SEM · Mandala artist &amp; sacred geometer
        </p>
      </Reveal>
      <Reveal as="div" delay={0.06} className="lg:col-span-9">
        <p
          className="font-display font-normal tracking-[-0.01em] text-ink m-0"
          style={{
            fontVariationSettings: '"opsz" 32, "wght" 400',
            fontSize: "clamp(23px, 2.7vw, 38px)",
            lineHeight: 1.3,
          }}
        >
          {ABOUT.opening[0]}
        </p>
      </Reveal>
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
  <div className="mt-8 md:mt-12">
    <div className="w-full">
      <Reveal as="div">
        <p className={cn(EYEBROW, "m-0 mb-6")}>Anegada · 1995</p>
        <h3
          className="font-display font-bold tracking-[-0.03em] text-[clamp(56px,10vw,150px)] leading-[0.92] text-ink m-0"
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

      <Reveal as="div" className="mt-8 md:mt-16">
        <p className={cn(BODY, "max-w-[62ch]")}>{ABOUT.anegada[0]}</p>
      </Reveal>

      {/* The hung-accent-mark pull-quote — the full sentence VERBATIM from
          content.ts (ABOUT.anegadaQuote), never truncated or re-typed. */}
      <Reveal as="div" className="relative md:ml-[16.666%] max-w-[26ch] mt-12 md:mt-16">
        <span
          aria-hidden
          className="block md:absolute md:right-full md:mr-5 md:-top-[0.08em] font-display font-semibold leading-[0.8] text-accent/60 select-none"
          style={{ fontVariationSettings: '"opsz" 48, "wght" 600', fontSize: "clamp(64px,7vw,110px)" }}
        >
          &ldquo;
        </span>
        <blockquote className="m-0">
          <p
            className="font-display italic font-normal tracking-[-0.01em] text-[clamp(26px,3.2vw,44px)] text-ink m-0"
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
      className="flex flex-col items-center gap-4 will-change-transform"
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
// The home page's four-colourway Peacock backdrop, mirrored here so the About
// page shares the EXACT same sky. Pre-blurred WebP (~7–12KB each); order +
// blur/saturation recipe identical to Welcome.tsx: Persian Indigo → Blood Moon
// Red → Moroccan Purple → Mary Pink.
const PEACOCK_BACKDROPS = [
  { url: "/img/paintings/peacock-persian-indigo-blur-v2.webp", name: "Persian Indigo" },
  { url: "/img/paintings/peacock-blood-moon-red-blur-v2.webp", name: "Blood Moon Red" },
  { url: "/img/paintings/peacock-moroccan-purple-blur-v2.webp", name: "Moroccan Purple" },
  { url: "/img/paintings/peacock-mary-pink-blur-v9.webp", name: "Mary Pink" },
];

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
    <Reveal as="div" className="border-b border-line py-8 md:py-10">
      <p className={cn(EYEBROW_MUTED, "m-0 mb-4 md:mb-5 leading-[1.9]")}>{item.q}</p>
      {isBeat ? (
        <p className="quote-hang font-display italic font-semibold tracking-[-0.02em] text-[clamp(26px,3.4vw,44px)] leading-[1.15] text-ink m-0 text-balance">
          &ldquo;{item.a}&rdquo;
        </p>
      ) : (
        <p className="font-display font-normal tracking-[-0.01em] text-[clamp(17px,1.9vw,20px)] leading-[1.6] text-ink m-0">
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

export const About = () => {
  const reduceMotion = useReducedMotion();

  // Friends & Family enquiry modal — opened from the closing CTA so a reader
  // moved by the biography can subscribe without leaving the page.
  const [friendsOpen, setFriendsOpen] = useState(false);
  const closeFriends = useCallback(() => setFriendsOpen(false), []);
  const openFriends = useCallback(() => setFriendsOpen(true), []);

  // Whole-page scroll drives the same four peacock backdrops as the home page,
  // crossfading in turn: Persian Indigo → Blood Moon Red → Moroccan Purple →
  // Mary Pink — identical recipe to Welcome.tsx so About shares the home's sky.
  const { scrollYProgress } = useScroll();
  // Persian Indigo opens at FULL opacity from the very top (scroll progress 0) —
  // NOT fading up from 0 — so the page is never bare black before the first
  // scroll (Hugo: "before scrolling the blue background isn't there, it's
  // black"). The breakpoints are tuned so each crossfade MIDPOINT lands on an
  // ACT SEAM (seam offsetTop ÷ scrollable height, measured in dev and
  // hardcoded — the Welcome convention):
  //   · Indigo  — hero → end of Chapter II (childhood / beginnings)
  //   · Red     — Chapter III → the Anegada poster (wandering, turning point)
  //   · Purple  — Chapter V → the Force India plate (practice, public work)
  //   · Pink    — Chapter VIII → footer (the Academy, the letter, farewell)
  const indigoOpacity = useTransform(scrollYProgress, [0, 0.15, 0.23], [1, 1, 0]);
  const redOpacity = useTransform(scrollYProgress, [0.15, 0.23, 0.31, 0.39], [0, 1, 1, 0]);
  const purpleOpacity = useTransform(scrollYProgress, [0.31, 0.39, 0.65, 0.73], [0, 1, 1, 0]);
  const maryPinkOpacity = useTransform(scrollYProgress, [0.65, 0.73, 0.97, 1], [0, 1, 1, 1]);
  const backdropOpacities = [indigoOpacity, redOpacity, purpleOpacity, maryPinkOpacity];

  return (
    <div className="relative">
      {/* PEACOCK BACKDROP LAYER — four colourways crossfading on page-scroll,
          mirrored EXACTLY from the home page (Welcome.tsx): Persian Indigo →
          Blood Moon Red → Moroccan Purple → Mary Pink. Fixed behind all content. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      >
        {PEACOCK_BACKDROPS.map((bd, i) => (
          <motion.div
            key={bd.url}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              // prefers-reduced-motion: short-circuit the scroll-driven
              // crossfade (CLAUDE.md convention) — hold a single static
              // backdrop (the opening indigo) instead of colour-shifting the
              // whole viewport on every scroll frame.
              opacity: reduceMotion ? (i === 0 ? 1 : 0) : backdropOpacities[i],
              backgroundImage: `url("${asset(bd.url)}")`,
              // Promote to its own GPU layer so the scroll-driven crossfade
              // composites the (pre-blurred) image instead of repainting it.
              // translateZ(0) forces a composited layer so iOS doesn't
              // re-rasterise the fixed cover bitmap every scroll frame.
              willChange: "opacity",
              transform: "translateZ(0)",
              // Darken + gently desaturate every backdrop so the bright,
              // near-WHITE blotches in the blurred peacock images can never
              // wash out the cream text (Hugo: "too much white, can't read
              // the text"), while keeping each colourway's warm character.
              filter: "brightness(0.74) saturate(1.06)",
            }}
          />
        ))}
        {/* Backdrop legibility veil — the HOME page's warm plum-rose radial
            recipe (Welcome.tsx), nudged ONE step heavier (+0.06 on each stop —
            0.42/0.26/0.16 → 0.48/0.32/0.22) because About is text-led with long
            reading passages. The colours still visibly glow and crossfade
            between chapters exactly like home; any heavier and the page reads
            as a black panel again, which is the regression this replaces. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 105% at 50% 40%, rgba(34,10,22,0.48) 0%, rgba(34,10,22,0.32) 55%, rgba(34,10,22,0.22) 100%)",
          }}
        />
        {/* Bottom + top grounding band — identical to home: darkens the very
            top strip (under the fixed white nav wordmark) and the very bottom
            (memorial + footer seam) so cream never washes out on the brightest
            colourway zones. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,9,8,0.36) 0%, rgba(10,9,8,0.05) 24%, rgba(10,9,8,0.05) 66%, rgba(10,9,8,0.46) 100%)",
          }}
        />
        {/* Mary-Pink darken — fades in ONLY over the final ~25% of scroll
            (tied to the existing maryPinkOpacity, not mutating the crossfade),
            pulling the pale dusty rose down to a deep dusk so the memorial's
            cream type never sits on near-white. Above the backdrop images +
            veil, below the z-10 content. Identical to home. */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            opacity: reduceMotion ? 0 : maryPinkOpacity,
            background:
              "linear-gradient(to bottom, rgba(40,12,28,0.14) 0%, rgba(34,11,24,0.26) 100%)",
          }}
        />
      </div>
      <Seo
        title="About Stephen Meakin — the life and work"
        description="The life and work of Stephen Meakin (1966–2021), British mandala artist and sacred geometer: from Anegada to the studio at Phoenix Place, Lewes, and a practice built on the idea that everything is connected."
        url="/about"
      />
      {/* Intro film header — owned by another task; left exactly as-is. */}
      <Nav overlay />

      {/* Chapter rail — whisper-quiet Roman numerals, xl+ only. */}
      <ChapterRail />

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
        <section className={cn(SECTION, "py-9 md:py-12")}>
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 items-start">
            <Reveal as="div" className="lg:col-span-7">
              <p className={cn(EYEBROW, "m-0 mb-5")}>As he described himself —</p>
              <blockquote className="m-0 pl-5 md:pl-7 border-l-2 border-accent/40 max-w-[64ch]">
                <p className="quote-hang font-display italic tracking-[-0.01em] text-[clamp(20px,2.3vw,30px)] leading-[1.5] text-ink m-0">
                  &ldquo;{ABOUT.opening[1]}&rdquo;
                </p>
              </blockquote>
            </Reveal>
            <Reveal as="div" delay={0.1} className="mt-8 lg:mt-0 lg:col-span-4 lg:col-start-9">
              {/* Facts rail — dt/dd from content.ts constants; Staffordshire is
                  earlyLife[0]'s word, Phoenix Place legacy[0]'s. Collapses to a
                  horizontal hairline strip below lg. */}
              <dl className="flex flex-wrap gap-x-10 gap-y-4 border-y border-line py-5 lg:block lg:space-y-5 lg:border-y-0 lg:border-l lg:border-line lg:py-0 lg:pl-6">
                <div>
                  <dt className={cn(EYEBROW_TIGHT, "m-0 mb-1.5")}>Born</dt>
                  <dd className={cn(META, "m-0")}>{BIRTH_DATE} — Staffordshire</dd>
                </div>
                <div>
                  <dt className={cn(EYEBROW_TIGHT, "m-0 mb-1.5")}>Died</dt>
                  <dd className={cn(META, "m-0")}>{DEATH_DATE}</dd>
                </div>
                <div>
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
        <section className={cn(SECTION, "py-8 md:py-10")}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-start">
            <Reveal as="div" className="col-span-2 md:col-span-7">
              <Plate
                src="/img/about/13-stephen-outdoor-portrait.jpg"
                alt="Stephen Meakin outdoors in sunlight, sunglasses resting on his head and earphones in, palms and greenery behind him."
                width={1600}
                height={1200}
                sizes="(min-width: 768px) 55vw, 100vw"
                caption="In the sun"
              />
            </Reveal>
            <Reveal as="div" delay={0.09} className="col-span-1 md:col-span-5 md:mt-16 lg:mt-24">
              <Plate
                src="/img/about/01-stephen-at-gallery.jpg"
                alt="Stephen Meakin standing beside one of his framed mandala paintings in a gallery."
                width={800}
                height={1200}
                sizes="(min-width: 768px) 40vw, 50vw"
                caption="Beside the work"
                captionClassName="justify-end"
              />
            </Reveal>
            <Reveal as="div" delay={0.18} className="col-span-1 md:col-span-5 md:col-start-7 md:max-w-[420px] md:-mt-10 lg:-mt-16">
              <Plate
                src="/img/about/14-family-group.jpg"
                alt="Stephen Meakin standing at the back of a family group of six, an older couple seated together at the centre."
                width={828}
                height={852}
                sizes="(min-width: 768px) 420px, 50vw"
                caption="With his family"
              />
            </Reveal>
          </div>
        </section>

        {/* 4 · CHAPTER I — BEGINNINGS (ghost 1966). Staffordshire, Bath &
            Brighton (ABOUT.earlyLife[0]) at the LEAD scale with the drop cap,
            beside the two family prints from PDF p3 — the second dropped
            off-grid below the first. */}
        <section id="beginnings" className={cn(SECTION, "scroll-mt-28 py-9 md:py-12")}>
          <ChapterHead id="beginnings" title="Bath, Brighton, and a different aesthetic." />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-x-6 items-start">
            <Reveal as="div" className="md:col-span-5">
              <p className={cn(LEAD, "drop-cap max-w-[62ch]")}>{ABOUT.earlyLife[0]}</p>
            </Reveal>
            <div className="md:col-span-6 md:col-start-7">
              <Reveal as="div">
                <Plate
                  src="/img/about/15-wedding-top-hats.jpg"
                  alt="A bride and three young men in morning dress and grey top hats at a family wedding."
                  width={1353}
                  height={814}
                  sizes="(min-width: 768px) 48vw, 100vw"
                  caption="A family wedding"
                />
              </Reveal>
              <Reveal as="div" delay={0.09} className="mt-6 md:max-w-[78%] md:ml-auto md:-mt-6 lg:-mt-10">
                <Plate
                  src="/img/about/16-family-sofa.jpg"
                  alt="A teenager in a yellow patterned shirt on a floral sofa beside two teenage girls — a family photograph."
                  width={1600}
                  height={1200}
                  sizes="(min-width: 768px) 38vw, 100vw"
                  caption="Growing up"
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* 5 · CHAPTER II — BOURNEMOUTH (ghost 1990). Mirror of Chapter I so
            consecutive chapters syncopate: photo left, the dusty-hardback
            passage (ABOUT.earlyLife[1]) pushed down a half-beat right, the
            café print straddling the baseline below. Document order preserved
            top-to-bottom: photo → text → photo. */}
        <section id="bournemouth" className={cn(SECTION, "scroll-mt-28 py-9 md:py-12")}>
          <ChapterHead id="bournemouth" title="A dusty old hardback." />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-x-6 items-start">
            <Reveal as="div" className="md:col-span-7">
              <Plate
                src="/img/about/17-bournemouth-friends.jpg"
                alt="Four smartly dressed young men standing together outdoors under trees."
                width={1600}
                height={900}
                sizes="(min-width: 768px) 55vw, 100vw"
                caption="Bournemouth"
              />
            </Reveal>
            <Reveal as="div" delay={0.06} className="md:col-span-5 md:col-start-8 lg:mt-20">
              <p className={cn(LEAD, "drop-cap max-w-[62ch]")}>{ABOUT.earlyLife[1]}</p>
            </Reveal>
            <Reveal as="figure" delay={0.09} className="m-0 md:col-span-5 md:col-start-2 md:-mt-8 lg:-mt-14">
              <ImageReveal
                src="/img/about/18-cafe-terrace.jpg"
                alt="Stephen Meakin in a denim shirt smiling at an outdoor café table, a stoneware jug before him and cypress trees in the distance."
                aspect="aspect-[4/3]"
                edges="all"
                parallax={0.1}
                sizes="(min-width: 768px) 38vw, 100vw"
              />
              <PlateCaption>At a café table</PlateCaption>
            </Reveal>
          </div>
        </section>

        {/* 6 · CHAPTER III — THE WANDERING YEARS (ghost 1990s). The album
            chapter — most photographs, loosest grid, still contained. Three
            movements: the opening pair → the passage (ABOUT.earlyLife[2],
            centred) → the wordless three-print run at three baselines (no
            rotations — offsets only; the Plate mats + shadows make the
            overlapped depths read as stacked framed prints). All five are
            people shots → Plate, never cropped. One shared caption under the
            run (its fact verbatim from earlyLife[2]). */}
        <section id="wandering" className={cn(SECTION, "scroll-mt-28 py-10 md:py-14")}>
          <ChapterHead id="wandering" title="The wandering years." />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-start">
            <Reveal as="div" className="col-span-2 md:col-span-7">
              <Plate
                src="/img/about/19-evening-with-friends.jpg"
                alt="Three friends in white shirts at a party table at night, balloons strung from the beam behind them, Stephen Meakin among them."
                width={1600}
                height={1200}
                sizes="(min-width: 768px) 55vw, 100vw"
                caption="An evening with friends"
              />
            </Reveal>
            <Reveal as="div" delay={0.09} className="col-span-1 md:col-span-4 md:col-start-9 md:mt-14">
              <Plate
                src="/img/about/20-island-evening.jpg"
                alt="Stephen Meakin in a loose white shirt and jeans, seated outdoors at night during his years abroad."
                width={818}
                height={1134}
                sizes="(min-width: 768px) 32vw, 50vw"
                caption="After dark"
              />
            </Reveal>
          </div>

          <Reveal as="div" className="max-w-[62ch] mx-auto mt-8 md:mt-16">
            <p className={cn(LEAD, "drop-cap")}>{ABOUT.earlyLife[2]}</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-start mt-8 md:mt-16">
            <Reveal as="div" className="col-span-1 md:col-span-4">
              <Plate
                src="/img/about/21-at-the-helm.jpg"
                alt="Stephen Meakin at the wheel of a motorboat, long sun-bleached hair blown back and the sea behind him."
                width={1200}
                height={1600}
                sizes="(min-width: 768px) 32vw, 50vw"
              />
            </Reveal>
            <Reveal as="div" delay={0.09} className="col-span-1 md:col-span-4 md:mt-12">
              <Plate
                src="/img/about/22-fancy-dress-party.jpg"
                alt="Stephen Meakin in pirate fancy dress with a toy parrot on his shoulder, a friend in an eyepatch reclining in front of him."
                width={1200}
                height={1600}
                sizes="(min-width: 768px) 32vw, 50vw"
              />
            </Reveal>
            <Reveal as="div" delay={0.18} className="col-span-2 md:col-span-4 md:-mt-6">
              <Plate
                src="/img/about/23-costume-evening.jpg"
                alt="Stephen Meakin smiling with his arm around a friend dressed in a gold costume headdress at an evening gathering."
                width={1600}
                height={1411}
                sizes="(min-width: 768px) 32vw, 100vw"
              />
            </Reveal>
          </div>
          <Reveal as="div" className="mt-6 text-center">
            <p className={cn(EYEBROW_MUTED, "m-0")}>A four-year stay in the Virgin Islands</p>
          </Reveal>
        </section>

        {/* 7 · CHAPTER IV — RETURN & THE FIRST MANDALA (kicker-only — the
            Anegada poster below is this chapter's display moment). The study
            years (ABOUT.earlyLife[3]) at LEAD + drop cap; ABOUT.earlyLife[4]
            ("In 1999… He never stopped.") promoted VERBATIM to the off-axis
            pull-line; then the poster. */}
        <section id="return" className={cn(SECTION, "scroll-mt-28 py-10 md:py-16")}>
          <ChapterHead id="return" title="Architecture, fine art, and the first mandala." />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-x-6 items-start">
            <Reveal as="div" className="md:col-span-6">
              <p className={cn(LEAD, "drop-cap max-w-[62ch]")}>{ABOUT.earlyLife[3]}</p>
            </Reveal>
            <Reveal as="div" delay={0.08} className="md:col-span-5 md:col-start-8 lg:mt-24">
              <p
                className="font-display font-semibold tracking-[-0.02em] text-[clamp(24px,3vw,40px)] leading-[1.2] text-ink m-0 text-balance"
                style={{ fontVariationSettings: '"opsz" 36, "wght" 600' }}
              >
                {ABOUT.earlyLife[4]}
              </p>
            </Reveal>
          </div>

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
        <section id="ritual" className={cn(SECTION, "scroll-mt-28 py-10 md:py-14")}>
          <ChapterHead id="ritual" title="The very palette of my being." />
          <Reveal as="div" className="-mt-5 md:-mt-8 mb-10 md:mb-14">
            <p className={cn(EYEBROW_MUTED, "m-0")}>— Stephen, on his practice, in his own words</p>
          </Reveal>

          <div className="lg:grid lg:grid-cols-12 lg:gap-x-6 items-start">
            <div className="lg:col-span-6">
              <Reveal as="div">
                <p className={cn(LEAD, "max-w-[62ch]")}>{ABOUT.anegada[1]}</p>
              </Reveal>
              <Dinkus />
              <Reveal as="div">
                <p className={cn(BODY, "max-w-[62ch]")}>{ABOUT.anegada[2]}</p>
              </Reveal>
            </div>
            <div className="mt-12 lg:mt-0 lg:col-span-4 lg:col-start-9">
              {/* Pure-CSS sticky — inherently reduced-motion safe; releases
                  below lg. The chart is small/low-res, so the mat stays
                  contained at 440px. */}
              <div className="lg:sticky lg:top-28">
                <Reveal as="figure" className="m-0 max-w-[440px] mx-auto lg:mx-0">
                  <div className="bg-bg-soft p-3 md:p-4 ring-1 ring-line shadow-[0_28px_70px_rgba(0,0,0,0.55)]">
                    <AssetImage
                      src="/img/about/25-harmonic-frequencies.jpg"
                      alt="A grid of twelve cymatic patterns, each labelled with the sound frequency in hertz that formed it, from 345 Hz to 5907 Hz."
                      width={612}
                      height={502}
                      loading="lazy"
                      decoding="async"
                      className="block w-full h-auto"
                    />
                  </div>
                  {/* Caption facts are printed on the sheet itself. */}
                  <PlateCaption>
                    Harmonic frequencies — twelve cymatic patterns, 345 Hz to 5907 Hz
                  </PlateCaption>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* 9 · CHAPTER VI — LEWES & THE FOUR TRADITIONS (kicker-only — the
            display feature is the cairn portrait promoted to hero parity:
            clear air, full column height, nothing beside it on mobile). Then
            ABOUT.legacy[0] at LEAD, the TRADITIONS I–IV hairline strip, and
            the two tradition reference photographs. Caption on the cairn is
            CLAIM-FREE (no place, no date). */}
        <section id="lewes" className={cn(SECTION, "scroll-mt-28 py-9 md:py-12")}>
          <ChapterHead id="lewes" title="Four traditions, one language." />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-x-6 items-start">
            <Reveal as="figure" className="m-0 md:col-span-5 max-w-[460px] md:max-w-none mx-auto md:mx-0 w-full">
              <ContainImage
                src="/img/about/03-stephen-on-cairn.jpg"
                alt="Stephen standing on a stone cairn in the desert"
                aspect="aspect-[3/4]"
                sizes="(min-width: 768px) 40vw, 100vw"
              />
              <PlateCaption>On the cairn</PlateCaption>
            </Reveal>
            <Reveal as="div" delay={0.08} className="md:col-span-6 md:col-start-7 lg:mt-16">
              <p className={cn(LEAD, "max-w-[62ch]")}>{ABOUT.legacy[0]}</p>
            </Reveal>
          </div>

          {/* The four key components, named exactly as in legacy[0]. */}
          <Reveal as="div" className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8 mt-8 md:mt-20 mb-10 md:mb-14">
            {TRADITIONS.map((t) => (
              <div key={t.numeral} className="border-t border-line pt-4">
                <p className={cn(EYEBROW, "m-0 mb-2")}>{t.numeral}</p>
                <p className="font-display font-normal tracking-[-0.01em] text-[clamp(17px,1.7vw,22px)] leading-[1.3] text-ink m-0 text-balance">
                  {t.name}
                </p>
              </div>
            ))}
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Reveal as="figure" className="m-0">
              <ImageReveal
                src="/img/about/26-persian-geometry.jpg"
                alt="The blue-tiled, honeycomb-vaulted entrance portal of a mosque, an example of the Persian geometric tradition Stephen studied."
                aspect="aspect-[16/9]"
                edges="all"
                parallax={0.08}
                sizes="(min-width: 768px) 50vw, 100vw"
              />
              <PlateCaption>The Persian geometric tradition</PlateCaption>
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
              <PlateCaption>Sainte-Chapelle, Paris — the rose windows of medieval Europe</PlateCaption>
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
        <section id="exhibitions" className={cn(SECTION, "scroll-mt-28 py-10 md:py-14")}>
          <ChapterHead id="exhibitions" title="From the Majlis in Dubai to a Formula One car." />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-x-6 items-start">
            <Reveal as="div" className="md:col-span-7">
              <p className={cn(LEAD, "max-w-[62ch]")}>{ABOUT.legacy[1]}</p>
            </Reveal>
            {/* The documented exhibitions & commissions — rendered from the
                canonical CREDENTIALS export (content.ts), never re-typed, as
                a quiet provenance ledger. */}
            <Reveal as="div" delay={0.08} className="md:col-span-4 md:col-start-9">
              <ul className="list-none p-0 m-0">
                {CREDENTIALS.map((item) => (
                  <li key={item} className={cn(META, "border-t border-line py-3")}>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <Dinkus />

          {/* THE INTERVIEW — sub-head a half-step under the chapter head (the
              internal title is demoted from TITLE so the chapter title
              outranks it; no other internal edits). */}
          <Reveal as="div" className="mb-10 md:mb-14">
            <SectionLabel>{INTERVIEW.eyebrow}</SectionLabel>
            <h3 className="font-display font-semibold tracking-[-0.04em] text-[clamp(30px,3.6vw,52px)] leading-[1.05] text-ink text-balance m-0 max-w-[760px]">
              In conversation.
            </h3>
          </Reveal>

          {/* Opening photograph — Stephen at work over a mandala print, the
              turquoise mandala filling the studio wall behind him (PDF p11,
              paired with the geometrist question that follows). Native 3:2 so
              cover never crops. */}
          <Reveal as="figure" className="m-0 mb-12 md:mb-16 max-w-[1180px] mx-auto">
            <ImageReveal
              src="/img/about/28-at-the-drafting-table.jpg"
              alt="Stephen Meakin in glasses bent over a mandala print on the studio worktable, pencil in hand, a large turquoise mandala painting filling the wall behind him"
              aspect="aspect-[3/2]"
              edges="all"
              parallax={0.1}
              sizes="(min-width: 1280px) 1180px, calc(100vw - 32px)"
            />
            <figcaption className="caption mt-4 text-center">
              At work in the studio
            </figcaption>
          </Reveal>

          {/* Scene-setting — estate-voice context left, the Mystic Rose flyer
              right (the flyer's own wording only — see the Fairmont note). */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 mb-14 md:mb-20">
            <Reveal as="div" className="lg:col-span-7 flex flex-col gap-5 max-w-[62ch]">
              {INTERVIEW.context.map((p, i) => (
                <p key={i} className={BODY}>
                  {p}
                </p>
              ))}
            </Reveal>
            <Reveal as="figure" className="m-0 lg:col-span-5 max-w-[480px]" delay={0.08}>
              <div className="bg-cream p-3 md:p-4 ring-1 ring-line shadow-[0_28px_70px_rgba(0,0,0,0.55)]">
                <AssetImage
                  src="/img/about/04-mystic-rose-flyer.jpg"
                  alt="Exhibition flyer for ‘The Mystic Rose’, an exhibition of paintings by Stephen E. Meakin at the Fairmont Dubai, presented by the Majlis Gallery"
                  width={900}
                  height={604}
                  loading="lazy"
                  decoding="async"
                  className="block w-full h-auto"
                />
              </div>
              <figcaption className="caption mt-4">
                <i>‘The Mystic Rose’</i> · Fairmont Dubai · presented by the Majlis Gallery
              </figcaption>
            </Reveal>
          </div>

          {/* Q1 — the geometrist answer, full reading measure under the opener. */}
          <div className="max-w-[860px] mx-auto border-t border-line">
            <InterviewQA item={INTERVIEW.qa[0]} />
          </div>

          {/* Q2 beside the portrait easel shot (PDF p12 top) — Stephen seated
              at the tilted circular canvas. Portrait + people → contained. */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 md:items-center mt-12 md:mt-16">
            <Reveal as="figure" className="m-0 md:col-span-5 max-w-[440px] mx-auto md:mx-0 w-full">
              <ContainImage
                src="/img/about/29-at-the-easel.jpg"
                alt="Stephen Meakin seated at a tilted easel in the studio, working on a large circular canvas"
                aspect="aspect-[2/3]"
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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 md:items-center mt-12 md:mt-16">
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
          <div className="max-w-[860px] mx-auto mt-12 md:mt-16 border-t border-line">
            <InterviewQA item={INTERVIEW.qa[3]} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-10 md:mt-12">
            <Reveal as="figure" className="m-0">
              <ImageReveal
                src="/img/about/31-studio-wall.jpg"
                alt="A studio wall hung edge to edge with finished framed mandala paintings"
                aspect="aspect-[16/9]"
                edges="all"
                parallax={0.08}
                sizes="(min-width: 768px) 50vw, 100vw"
              />
              <figcaption className="caption mt-3 text-center">
                Finished paintings crowd the studio wall
              </figcaption>
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
              <figcaption className="caption mt-3 text-center">
                Living with the work
              </figcaption>
            </Reveal>
          </div>

          {/* Between the questions — at the easel and at the brush (PDF p14):
              the deep-blue painting on the easel, and white blossoms going
              onto a large round work. */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 mt-6 md:mt-8">
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
              <figcaption className="caption mt-3 text-center">
                Blossom by blossom
              </figcaption>
            </Reveal>
          </div>

          {/* Q5 — the wonderment beat, answered by the gathering: the crowd
              photograph lands directly beneath it (PDF p14 bottom). */}
          <div className="max-w-[860px] mx-auto mt-12 md:mt-16 border-t border-line">
            <InterviewQA item={INTERVIEW.qa[4]} />
          </div>
          <Reveal as="figure" className="m-0 mt-10 md:mt-12">
            <ImageReveal
              src="/img/about/35-gathering-at-the-gallery.jpg"
              alt="A large smiling crowd gathered with Stephen Meakin in a gallery, his paintings filling the wall behind them"
              aspect="aspect-[16/9]"
              edges="all"
              parallax={0.1}
              sizes="(min-width: 2200px) 1624px, (min-width: 1536px) 1404px, (min-width: 768px) calc(100vw - 64px), calc(100vw - 32px)"
            />
            <figcaption className="caption mt-4 text-center">
              Gathered among the paintings
            </figcaption>
          </Reveal>

          {/* Q6 — the tea line, then the exhibition room beside the source
              credit (PDF p15). */}
          <div className="max-w-[860px] mx-auto mt-12 md:mt-16 border-t border-line">
            <InterviewQA item={INTERVIEW.qa[5]} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 md:items-center mt-10 md:mt-12">
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
              <p className="font-display italic tracking-[-0.01em] text-[clamp(17px,1.8vw,22px)] leading-[1.55] text-ink m-0 mb-5 max-w-[56ch]">
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
            two design sheets share ONE cream presentation mat (the designer's
            board), whole sheets at native ratio, one claim-free caption (the
            commission is established verbatim by legacy[1]). The purple→pink
            backdrop crossfade midpoint is tuned to land here. */}
        <section className={cn(SECTION, "py-10 md:py-14")}>
          <Reveal as="div" className="max-w-[1040px] mx-auto">
            <p className={cn(EYEBROW_MUTED, "m-0 mb-6 text-center")}>From the design archive</p>
            <figure className="m-0">
              <div className="bg-cream p-3 md:p-5 ring-1 ring-line shadow-[0_28px_70px_rgba(0,0,0,0.55)]">
                <div className="grid md:grid-cols-2 gap-3 md:gap-4 items-start">
                  <AssetImage
                    src="/img/about/05-force-india-layout.jpg"
                    alt="Annotated layout sheet of mandala designs arranged across the bodywork of the Sahara Force India Formula One car"
                    width={960}
                    height={640}
                    loading="lazy"
                    decoding="async"
                    sizes="(min-width: 1100px) 500px, (min-width: 768px) 48vw, 100vw"
                    className="block w-full h-auto"
                  />
                  <AssetImage
                    src="/img/about/06-force-india-final.jpg"
                    alt="Stephen's mandala design for the Sahara Force India Formula One car"
                    width={904}
                    height={639}
                    loading="lazy"
                    decoding="async"
                    sizes="(min-width: 1100px) 500px, (min-width: 768px) 48vw, 100vw"
                    className="block w-full h-auto"
                  />
                </div>
              </div>
              <PlateCaption className="justify-center">
                Design studies for the Sahara Force India Formula One car
              </PlateCaption>
            </figure>
          </Reveal>
        </section>

        {/* 12 · CHAPTER VIII — TAGA (ghost 2010). A compact text movement —
            the document holds its photographs for the closing beats. legacy[2]
            (one sentence — let it ring) promoted to the chapter's lead line,
            the academyQuote at BODY, then over the dinkus the palestine
            passage — it belongs INSIDE this chapter per the PDF, and its
            mention of Az-Zarqa is the hinge into Chapter IX. */}
        <section id="academy" className={cn(SECTION, "scroll-mt-28 py-10 md:py-14")}>
          <ChapterHead id="academy" title="The Art of Geometry Academy." />
          <div className="max-w-[62ch] mx-auto">
            <Reveal as="div">
              <p
                className="font-display font-semibold tracking-[-0.02em] text-[clamp(22px,2.6vw,34px)] leading-[1.3] text-ink m-0 text-balance"
                style={{ fontVariationSettings: '"opsz" 32, "wght" 600' }}
              >
                {ABOUT.legacy[2]}
              </p>
            </Reveal>
            <Reveal as="div" className="mt-10 md:mt-12">
              <blockquote className="m-0">
                <p className={BODY}>{ABOUT.academyQuote}</p>
                <cite className={cn(EYEBROW_MUTED, "not-italic block mt-5")}>— On the founding of TAGA</cite>
              </blockquote>
            </Reveal>
            <Dinkus />
            <Reveal as="div">
              <p className={BODY}>{ABOUT.palestine}</p>
            </Reveal>
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
        <section id="azzarqa" className={cn(SECTION, "scroll-mt-28 py-10 md:py-16")}>
          <ChapterHead id="azzarqa" title="To his students." />

          <Reveal as="figure" className="m-0 max-w-[860px] mx-auto">
            <ContainImage
              src="/img/about/07-az-zarqa-students.jpg"
              alt="Stephen seated among a group of children, the mandalas they made held up around them"
              aspect="aspect-[4/3]"
              parallax={0.06}
              sizes="(min-width: 900px) 860px, 100vw"
            />
            <PlateCaption className="justify-center">With children and their mandalas</PlateCaption>
          </Reveal>

          <Reveal as="div" className="mt-12 md:mt-16 text-center">
            <p className={cn(SUBTITLE, "mx-auto max-w-[52ch]")}>{ABOUT.studentsIntro}</p>
          </Reveal>

          {/* THE LETTER — one whole-element Reveal. */}
          <Reveal as="div" className="max-w-[720px] mx-auto mt-10 md:mt-12">
            <article className="bg-ink/[0.04] ring-1 ring-ink/10 p-7 sm:p-10 md:p-14">
              <p
                className="drop-cap font-display font-normal tracking-[-0.005em] text-[18px] md:text-[20px] leading-[1.85] text-ink m-0"
                style={{ fontVariationSettings: '"opsz" 18, "wght" 400' }}
              >
                {LETTER_BODY}
              </p>
              <div aria-hidden className="h-px w-12 bg-ink/15 my-8" />
              <p
                className="font-display italic font-normal text-[clamp(22px,2.8vw,36px)] leading-[1.25] text-ink m-0"
                style={{ fontVariationSettings: '"opsz" 32, "wght" 400' }}
              >
                {LETTER_CLOSE}
              </p>
              <p className={cn(EYEBROW_MUTED, "m-0 mt-8")}>— Stephen, to his students</p>
            </article>
          </Reveal>
        </section>

        {/* 14 · THE ACADEMY CLOSE — the PDF's closing photographs. No chapter
            head, no heading — the held breath that ends the document: the
            TAGA group promoted with generous clear air, then the studio and
            the classroom at cluster scale. The group photo MUST show in full
            (heads + all the mandalas) → contained, never cropped. */}
        <section className={cn(SECTION, "py-10 md:py-14")}>
          <Reveal as="figure" className="m-0 max-w-[1100px] mx-auto mb-6 md:mb-8">
            <ContainImage
              src="/img/about/08-taga-group.jpg"
              alt="Stephen with a group of TAGA students, each holding a mandala they painted"
              aspect="aspect-[4/3]"
              parallax={0.05}
              sizes="(min-width: 1160px) 1100px, calc(100vw - 32px)"
            />
            <PlateCaption className="justify-center">
              A TAGA group with their finished mandalas · Phoenix Place, Lewes
            </PlateCaption>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start max-w-[1100px] mx-auto">
            <Reveal as="figure" className="m-0">
              <ImageReveal
                src="/img/about/09-taga-studio.jpg"
                alt="A paint-spattered drafting easel in the studio, finished mandalas crowding the walls behind it"
                aspect="aspect-[4/3]"
                edges="all"
                parallax={0.08}
                sizes="(min-width: 1160px) 540px, (min-width: 768px) 50vw, 100vw"
              />
              <PlateCaption>The studio</PlateCaption>
            </Reveal>
            <Reveal as="figure" delay={0.09} className="m-0">
              <ContainImage
                src="/img/about/10-taga-classroom.jpg"
                alt="Students at work around the tables of the TAGA classroom"
                aspect="aspect-[4/3]"
                sizes="(min-width: 1160px) 540px, (min-width: 768px) 50vw, 100vw"
              />
              <PlateCaption>A class at work</PlateCaption>
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
        <section className={cn(SECTION, "py-9 md:py-12")}>
          <Reveal as="div" className="text-center mb-5 md:mb-7">
            <p className={cn(EYEBROW, "m-0")}>The body of work</p>
          </Reveal>
          <Reveal as="figure" className="my-0">
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

        {/* 16 · IN MEMORIAM — the family's farewell. Polly Wedge's funeral
            tribute, opened by Stephen's own "everything is connected" words.
            UNTOUCHABLE — its border-t now reads as the final chapter hairline,
            the motif closing the system. */}
        <section className="mx-auto max-w-[820px] 2xl:max-w-[960px] 3xl:max-w-[1040px] px-4 sm:px-6 md:px-8 lg:px-12 py-11 md:py-16 border-t border-line">
          <Reveal as="div" className="text-center mb-10 md:mb-14">
            <p className={cn(EYEBROW, "m-0 mb-4")}>{TRIBUTE.eyebrow}</p>
            <h2 className={cn(TITLE, "max-w-[820px] mx-auto my-0")}>
              Stephen Meakin
            </h2>
            <p className={cn(EYEBROW_MUTED, "mt-4")}>{LIFE_DATES}</p>
          </Reveal>

          <Reveal as="figure" className="my-0 mb-12 md:mb-16 max-w-[680px] mx-auto border-l border-line pl-6 md:pl-8">
            <blockquote className="m-0">
              <p className="quote-hang font-display italic text-[clamp(20px,2.6vw,28px)] leading-[1.45] text-ink m-0">
                “{MEMORIAL_QUOTE}”
              </p>
            </blockquote>
            <figcaption className={cn(EYEBROW_MUTED, "not-italic mt-5")}>
              — Stephen Meakin
            </figcaption>
          </Reveal>

          <Reveal as="div" className="max-w-[62ch] mx-auto">
            {TRIBUTE.paragraphs.map((p, i) => (
              <p key={i} className={cn(BODY, i > 0 && "mt-5")}>
                {p}
              </p>
            ))}
            <p className={cn(EYEBROW_MUTED, "mt-8")}>{TRIBUTE.attribution}</p>
          </Reveal>
        </section>

        {/* 17 · CLOSING CTA */}
        <section className={cn(SECTION, "pb-16 md:pb-24 pt-4")}>
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
