import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useMotionValueEvent,
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
import { ABOUT, PASSING_DATE } from "../data/content";
import { asset } from "../lib/asset";
import { Seo } from "../components/Seo";

const earlyLife = ABOUT.earlyLife;

// ─── WordReveal ────────────────────────────────────────────────────────────
// Stagger every word into place with a blur-clear. Used on chapter
// headlines so the eye moves left-to-right instead of seeing the whole
// block appear at once.
const WordReveal = ({
  text,
  className,
  stagger = 0.07,
  duration = 0.7,
  delay = 0,
}: {
  text: string;
  className?: string;
  stagger?: number;
  duration?: number;
  delay?: number;
}) => {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <span className={className}>{text}</span>;
  const words = text.split(" ");
  const wordVariants: Variants = {
    hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
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
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
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

// ─── ChapterIntro ──────────────────────────────────────────────────────────
// Editorial chapter break: large Roman numeral + label + title. The numeral
// gradient's top alpha scrubs from 0.2 → 0.95 as the section enters viewport
// — a colour wipe synchronised to scroll. The h2 keeps the per-word
// WordReveal entrance.
const ChapterIntro = ({
  numeral,
  label,
  years,
  title,
}: {
  numeral: string;
  label: string;
  years: string;
  title: string;
}) => {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });
  // The colour wipe used to animate the gradient STRING via useMotionTemplate,
  // which repaints the background-clip:text numeral every scroll frame. Instead
  // we stack two static gradient layers — a dim "pre" and a bright "lit" — and
  // crossfade the dim layer's OPACITY out as the section enters. Opacity is
  // GPU-composited, so the wipe reads identically with zero per-frame paint.
  const dimOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  // Final (lit) gradient — what the numeral settles to. Matches the old
  // top 0.95 / bottom 0.7 end stops.
  const litGradient =
    "linear-gradient(180deg, rgba(220,168,76,0.95) 0%, rgba(201,120,68,0.7) 100%)";
  // Initial (dim) gradient — the old start stops (top 0.2 / bottom 0.4).
  const dimGradient =
    "linear-gradient(180deg, rgba(220,168,76,0.2) 0%, rgba(201,120,68,0.4) 100%)";
  const clipText = {
    WebkitBackgroundClip: "text" as const,
    backgroundClip: "text" as const,
    color: "transparent",
  };

  return (
    <section
      ref={ref}
      className="relative mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 pt-24 md:pt-32 pb-6 md:pb-10"
    >
      <Reveal as="div" className="grid grid-cols-12 gap-4 md:gap-8 items-end">
        {reduceMotion ? (
          <p
            className="col-span-12 md:col-span-3 font-display font-bold text-[clamp(86px,13vw,200px)] leading-[0.84] m-0 tracking-[-0.05em] tabular-nums"
            style={{ backgroundImage: litGradient, ...clipText }}
          >
            {numeral}
          </p>
        ) : (
          // Lit numeral on the bottom; dim numeral stacked on top fading out.
          // The grid cell positions the lit copy; the dim copy is absolutely
          // overlaid so both share the same box.
          <div className="relative col-span-12 md:col-span-3">
            <p
              className="font-display font-bold text-[clamp(86px,13vw,200px)] leading-[0.84] m-0 tracking-[-0.05em] tabular-nums"
              style={{ backgroundImage: litGradient, ...clipText }}
            >
              {numeral}
            </p>
            <motion.p
              aria-hidden="true"
              className="absolute inset-0 font-display font-bold text-[clamp(86px,13vw,200px)] leading-[0.84] m-0 tracking-[-0.05em] tabular-nums pointer-events-none"
              style={{ backgroundImage: dimGradient, opacity: dimOpacity, ...clipText }}
            >
              {numeral}
            </motion.p>
          </div>
        )}
        <div className="col-span-12 md:col-span-9 md:pl-6 md:pb-3">
          <p className="font-sans text-[10px] md:text-[11px] font-bold tracking-[0.46em] uppercase text-accent m-0 mb-4">
            {label} · {years}
          </p>
          <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(30px,4.4vw,62px)] leading-[1.02] text-ink m-0 max-w-[820px]">
            <WordReveal text={title} stagger={0.06} />
          </h2>
        </div>
      </Reveal>
    </section>
  );
};

// ─── YearTag ────────────────────────────────────────────────────────────────
const YearTag = ({ year, place }: { year: string; place?: string }) => (
  <div className="flex flex-col gap-1.5">
    <p className="font-display font-bold text-[clamp(28px,3vw,40px)] leading-none text-accent tabular-nums tracking-[-0.02em] m-0">
      {year}
    </p>
    {place && (
      <p className="font-sans text-[10px] font-bold tracking-[0.36em] uppercase text-ink/55 m-0">
        {place}
      </p>
    )}
  </div>
);

// ─── Milestone variants ────────────────────────────────────────────────────

// A — clean text milestone
const MilestoneText = ({
  year,
  place,
  title,
  children,
}: {
  year: string;
  place?: string;
  title: string;
  children: ReactNode;
}) => (
  <Reveal as="section" className="relative mx-auto max-w-[1100px] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-16">
    <div className="grid grid-cols-12 gap-4 md:gap-8">
      <div className="col-span-12 md:col-span-3 md:pt-2">
        <YearTag year={year} place={place} />
      </div>
      <div className="col-span-12 md:col-span-9">
        <h3 className="font-display font-bold tracking-[-0.035em] text-[clamp(24px,3.2vw,44px)] leading-[1.06] text-ink m-0 mb-5 md:mb-6 max-w-[760px]">
          {title}
        </h3>
        <div className="max-w-[720px] flex flex-col gap-5">{children}</div>
      </div>
    </div>
  </Reveal>
);

// B — image on right, text on left
const MilestoneImageRight = ({
  year,
  place,
  title,
  image,
  alt,
  children,
}: {
  year: string;
  place?: string;
  title: string;
  image: string;
  alt: string;
  children: ReactNode;
}) => (
  <Reveal as="section" className="relative mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-20">
    <div className="grid grid-cols-12 gap-5 md:gap-12 items-center">
      <div className="col-span-12 md:col-span-5 order-2 md:order-1">
        <YearTag year={year} place={place} />
        <h3 className="font-display font-bold tracking-[-0.035em] text-[clamp(24px,3.2vw,44px)] leading-[1.05] text-ink m-0 mt-6 mb-5">
          {title}
        </h3>
        <div className="flex flex-col gap-4">{children}</div>
      </div>
      <figure className="col-span-12 md:col-span-7 order-1 md:order-2 m-0">
        <ImageReveal src={image} alt={alt} aspect="aspect-[4/3]" edges="all" parallax={0.14} tilt />
      </figure>
    </div>
  </Reveal>
);

// C — image on left, text on right
const MilestoneImageLeft = ({
  year,
  place,
  title,
  image,
  alt,
  aspect = "aspect-[4/3]",
  children,
}: {
  year: string;
  place?: string;
  title: string;
  image: string;
  alt: string;
  aspect?: string;
  children: ReactNode;
}) => (
  <Reveal as="section" className="relative mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-20">
    <div className="grid grid-cols-12 gap-5 md:gap-12 items-center">
      <figure className="col-span-12 md:col-span-7 m-0">
        <ImageReveal src={image} alt={alt} aspect={aspect} edges="all" parallax={0.14} tilt />
      </figure>
      <div className="col-span-12 md:col-span-5">
        <YearTag year={year} place={place} />
        <h3 className="font-display font-bold tracking-[-0.035em] text-[clamp(24px,3.2vw,44px)] leading-[1.05] text-ink m-0 mt-6 mb-5">
          {title}
        </h3>
        <div className="flex flex-col gap-4">{children}</div>
      </div>
    </div>
  </Reveal>
);

// D — massive year as design element, text right. The numeral scrub-counts
// from `year - 1` → `year` as the section enters the viewport. Numeric
// years only; falls back to a static render for anything non-numeric.
const MilestoneBigYear = ({
  year,
  place,
  title,
  children,
}: {
  year: string;
  place?: string;
  title: string;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const targetYear = Number.parseInt(year, 10);
  const isCountable = Number.isFinite(targetYear) && !reduceMotion;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });
  const counted = useTransform(scrollYProgress, [0, 1], [targetYear - 1, targetYear]);
  const [display, setDisplay] = useState<number>(targetYear - 1);
  useMotionValueEvent(counted, "change", (v) => {
    const rounded = Math.round(v);
    setDisplay((prev) => (prev === rounded ? prev : rounded));
  });

  return (
    <Reveal as="section" className="relative mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-14 md:py-28">
      <div ref={ref} className="grid grid-cols-12 gap-4 md:gap-12 items-start">
        <div className="col-span-12 md:col-span-5">
          <p
            className="font-display font-bold text-[clamp(82px,11.5vw,200px)] leading-[0.84] m-0 tracking-[-0.05em] tabular-nums"
            style={{
              background:
                "linear-gradient(180deg, rgba(220,168,76,0.95) 0%, rgba(201,120,68,0.6) 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
            aria-label={year}
          >
            {isCountable ? display : year}
          </p>
          {place && (
            <p className="mt-4 font-sans text-[10px] font-bold tracking-[0.42em] uppercase text-ink/55 m-0">
              {place}
            </p>
          )}
        </div>
        <div className="col-span-12 md:col-span-7 md:pt-4">
          <h3 className="font-display font-bold tracking-[-0.035em] text-[clamp(26px,3.4vw,48px)] leading-[1.05] text-ink m-0 mb-6">
            {title}
          </h3>
          <div className="flex flex-col gap-5">{children}</div>
        </div>
      </div>
    </Reveal>
  );
};

// E — quote callout with portrait image
const MilestoneQuote = ({
  year,
  place,
  title,
  image,
  alt,
  quote,
  attribution,
}: {
  year: string;
  place?: string;
  title: string;
  image: string;
  alt: string;
  quote: string;
  attribution?: string;
}) => (
  <Reveal as="section" className="relative mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-12 md:py-20">
    <div className="grid grid-cols-12 gap-5 md:gap-12 items-stretch md:items-center">
      <figure className="col-span-12 md:col-span-6 m-0">
        <ImageReveal src={image} alt={alt} aspect="aspect-[4/5]" edges="all" parallax={0.16} tilt />
      </figure>
      <div className="col-span-12 md:col-span-6">
        <YearTag year={year} place={place} />
        <h3 className="font-display font-bold tracking-[-0.035em] text-[clamp(24px,3.2vw,44px)] leading-[1.05] text-ink m-0 mt-6 mb-8">
          {title}
        </h3>
        <blockquote className="m-0 pl-5 border-l-2 border-accent">
          <p className="font-display font-medium text-[clamp(15px,1.5vw,18px)] leading-[1.65] text-ink/95 m-0 mb-3">
            {quote}
          </p>
          {attribution && (
            <cite className="not-italic font-sans text-[10px] font-bold tracking-[0.36em] uppercase text-ink/55">
              — {attribution}
            </cite>
          )}
        </blockquote>
      </div>
    </div>
  </Reveal>
);

// ─── AnegadaSpread ─────────────────────────────────────────────────────────
// Anegada is the turning point — broken out of the timeline as its own
// full-screen cinematic moment with a distinct background tint, then a
// magazine-style body that breaks every grid rule used in the timeline.
const AnegadaSpread = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.14, 1.0]);

  return (
    <>
      {/* Chapter break label, no rules */}
      <Reveal as="div" className="relative mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 pt-16 md:pt-24 pb-2 text-center">
        <p className="font-display italic text-[clamp(15px,1.4vw,18px)] text-accent m-0">
          Interlude · the turning point
        </p>
      </Reveal>

      <section
        ref={ref}
        className="relative w-full overflow-hidden"
        style={{ backgroundColor: "#0e0a08" }}
        aria-label="Anegada — 1995, Stephen's turning point"
      >
        {/* HERO — full-screen */}
        <div className="relative w-full h-screen overflow-hidden">
          <motion.div
            className="absolute inset-0 will-change-transform"
            style={
              reduceMotion
                ? {
                    backgroundImage: `url("${asset("/img/about/03-stephen-on-cairn.jpg")}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center 30%",
                  }
                : {
                    y: imgY,
                    scale: imgScale,
                    backgroundImage: `url("${asset("/img/about/03-stephen-on-cairn.jpg")}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center 30%",
                  }
            }
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,9,8,0.55) 0%, rgba(10,9,8,0.12) 30%, rgba(10,9,8,0.85) 100%)",
            }}
          />
          {/* Top eyebrow */}
          <Reveal as="div" className="absolute top-10 md:top-14 left-1/2 -translate-x-1/2 text-center px-4">
            <p className="font-sans text-[10px] md:text-[11px] font-bold tracking-[0.5em] uppercase text-ink/85 m-0">
              1995 · Anegada · Caribbean Sea
            </p>
          </Reveal>

          {/* Big year stamp at bottom-left */}
          <Reveal as="div" className="absolute bottom-[6vh] md:bottom-[7vh] left-4 sm:left-6 md:left-10 lg:left-14">
            <p
              className="font-display font-bold m-0 tabular-nums tracking-[-0.05em] leading-[0.84]"
              style={{
                fontSize: "clamp(96px, 14vw, 240px)",
                background:
                  "linear-gradient(180deg, rgba(245,236,214,0.95) 0%, rgba(220,168,76,0.85) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              1995
            </p>
          </Reveal>

          {/* Headline — bottom right, dominating */}
          <div className="absolute inset-x-0 bottom-[6vh] md:bottom-[8vh] px-4 md:px-10 lg:px-14 text-right">
            <h2
              className="font-display font-bold tracking-[-0.05em] leading-[0.9] text-ink m-0"
              style={{ fontSize: "clamp(48px, 8.8vw, 138px)" }}
            >
              <WordReveal text="Everything is connected." stagger={0.11} duration={1.0} />
            </h2>
          </div>
        </div>

        {/* Magazine spread body — breaks the timeline grid */}
        <div className="relative mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-20 md:py-28">
          {/* Para 1 — wide drop-cap column + side pull-quote */}
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16">
            <p className="md:col-span-7 md:col-start-1 font-sans font-normal text-[16px] md:text-[17.5px] leading-[1.9] text-ink/92 m-0 first-letter:font-display first-letter:font-bold first-letter:text-accent first-letter:text-[80px] first-letter:leading-[0.84] first-letter:float-left first-letter:mr-4 first-letter:mt-1">
              {ABOUT.anegada[0]}
            </p>
            <aside className="md:col-span-4 md:col-start-9 md:pt-16">
              <p
                className="font-display font-medium italic tracking-[-0.01em] m-0 border-l-[3px] border-accent pl-5 leading-[1.35]"
                style={{
                  fontSize: "clamp(22px, 2.5vw, 32px)",
                  color: "rgba(220,168,76,0.95)",
                }}
              >
                “At the exact moment I completed the circle, I felt something touch me that was inexplicable.”
              </p>
            </aside>
          </Reveal>

          {/* Massive pull break — the realization */}
          <Reveal as="div" className="mt-16 md:mt-24 text-center">
            <p
              className="font-display font-medium italic tracking-[-0.02em] m-0 mx-auto leading-[1.0] text-accent"
              style={{
                fontSize: "clamp(40px, 6.5vw, 110px)",
              }}
            >
              Everything is connected.
            </p>
          </Reveal>

          {/* Para 2 — display weight, offset wider than centre */}
          <Reveal as="div" className="mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-12 gap-8">
            <p className="md:col-span-10 md:col-start-2 font-display font-medium tracking-[-0.012em] leading-[1.5] text-ink/95 m-0"
               style={{ fontSize: "clamp(19px, 2.05vw, 25px)" }}
            >
              {ABOUT.anegada[1]}
            </p>
          </Reveal>

          {/* Para 3 — narrow column, indented from right */}
          <Reveal as="div" className="mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-12 gap-8">
            <p className="md:col-span-7 md:col-start-3 font-sans font-normal text-[15.5px] md:text-[16.5px] leading-[1.9] text-ink/85 m-0">
              {ABOUT.anegada[2]}
            </p>
          </Reveal>

          <Reveal as="div" className="mt-14 md:mt-20 text-right">
            <p className="font-sans text-[10px] font-bold tracking-[0.48em] uppercase text-accent m-0">
              — Stephen Meakin, in his own words
            </p>
          </Reveal>
        </div>
      </section>

      {/* Closing label, no rules */}
      <Reveal as="div" className="relative mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 pt-12 md:pt-16 pb-2 text-center">
        <p className="font-display italic text-[clamp(15px,1.4vw,18px)] text-ink/60 m-0">
          Return to the work
        </p>
      </Reveal>
    </>
  );
};

// ─── About ─────────────────────────────────────────────────────────────────

// ─── AboutHero ─────────────────────────────────────────────────────────────
// Hero with a scroll-scrubbed scale + opacity on the backdrop image and a
// gentle upward translate on the title. Scrub feels like a slow deepening
// rather than parallax. Reduced-motion short-circuits all transforms.
const AboutHero = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.0, 1.08]);
  const imgOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.55]);
  const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);

  return (
    <section className="relative">
      <div
        ref={ref}
        className="relative h-[72vh] sm:h-[80vh] md:h-[86vh] w-full overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 will-change-transform"
          style={reduceMotion ? undefined : { scale: imgScale, opacity: imgOpacity }}
        >
          <AssetImage
            src="/img/about/01-stephen-at-gallery.jpg"
            alt="Stephen Meakin"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </motion.div>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,9,8,0.55) 0%, rgba(10,9,8,0.25) 35%, rgba(10,9,8,0.6) 100%)",
          }}
        />
        <Reveal as="div" className="absolute top-24 md:top-28 left-1/2 -translate-x-1/2 text-center">
          <p className="font-sans text-[10px] sm:text-[11px] font-bold tracking-[0.42em] uppercase text-ink/85 m-0">
            In memoriam · 1966 — {PASSING_DATE}
          </p>
        </Reveal>
        <motion.div
          style={reduceMotion ? undefined : { y: titleY }}
          className="absolute inset-x-0 bottom-[7vh] md:bottom-[8vh] text-center px-4"
        >
          <Reveal as="div">
            <h1 className="font-display font-bold tracking-[-0.04em] text-[clamp(64px,11vw,160px)] leading-[0.88] text-ink m-0">
              Stephen<br />Meakin
            </h1>
            <p className="mt-4 md:mt-5 font-sans text-[11px] sm:text-[12px] font-bold tracking-[0.34em] uppercase text-ink/75 m-0">
              SEM · Mandala Artist &amp; Sacred Geometer
            </p>
          </Reveal>
        </motion.div>
      </div>
    </section>
  );
};

// ─── ClosingCTA ────────────────────────────────────────────────────────────
// Most-engaged readers convert here. Scrub a gentle scale + opacity as the
// CTA cluster enters the viewport — a deliberate "moment of arrival" beat.
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
      <MagneticLink
        to="/collections"
        className="inline-flex w-fit items-center bg-ink text-bg px-7 py-3.5 font-sans text-[12px] font-bold tracking-[0.18em] uppercase rounded-full transition-colors duration-300 hover:bg-accent hover:text-ink"
        ariaLabel="Browse the prints"
      >
        Browse prints →
      </MagneticLink>
      <button
        type="button"
        onClick={onJoinFriends}
        className="inline-flex items-center font-sans text-[11px] font-bold tracking-[0.22em] uppercase text-ink/70 border-b border-ink/30 pb-1 transition-colors duration-300 hover:text-accent hover:border-accent"
      >
        Join Friends &amp; Family
      </button>
    </motion.div>
  );
};

// ─── InMemoriamSpacer ──────────────────────────────────────────────────────
// Deliberate scroll slowdown above the passing milestone. Reduced motion
// collapses the spacer to ~20vh and renders the italic line statically.
const InMemoriamSpacer = () => {
  const reduceMotion = useReducedMotion();
  return (
    <div
      className={
        reduceMotion
          ? "relative h-[20vh] flex items-center justify-center"
          : "relative h-[60vh] flex items-center justify-center"
      }
      aria-hidden={false}
    >
      {reduceMotion ? (
        <p className="font-display italic text-[clamp(18px,2vw,26px)] text-ink/70 m-0 text-center px-4">
          In memoriam
        </p>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.78 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.6, ease: [0.22, 0.61, 0.36, 1] }}
          className="font-display italic text-[clamp(18px,2vw,26px)] text-ink m-0 text-center px-4"
        >
          In memoriam
        </motion.p>
      )}
    </div>
  );
};

export const About = () => {
  // Friends & Family enquiry modal — opened from the closing CTA so a
  // reader moved by the biography can subscribe without leaving the page.
  const [friendsOpen, setFriendsOpen] = useState(false);
  const closeFriends = useCallback(() => setFriendsOpen(false), []);
  const openFriends = useCallback(() => setFriendsOpen(true), []);

  return (
    <div className="relative">
      <Seo
        title="About Stephen Meakin — the life and work"
        description="The life of Stephen Meakin (1966–2021), British mandala artist and sacred geometer — from Anegada to the studio in Lewes, and a practice devoted to the idea that everything is connected."
        url="/about"
      />
      <Nav />
      <main>
        {/* HERO — scroll-scrubbed scale + opacity on image, slight upward
            translate on title. See AboutHero. */}
        <AboutHero />

        {/* OPENING */}
        <section className="mx-auto max-w-[1100px] px-4 sm:px-6 md:px-8 lg:px-12 py-14 md:py-20 text-center">
          <Reveal>
            <p className="font-display font-semibold tracking-[-0.02em] text-[clamp(22px,2.8vw,36px)] leading-[1.3] text-ink m-0 max-w-[940px] mx-auto">
              {ABOUT.opening[0]}
            </p>
          </Reveal>
        </section>

        {/* CHAPTER I — Beginnings */}
        <ChapterIntro
          numeral="I"
          label="Beginnings"
          years="1966 → 1995"
          title="A different aesthetic was always there to be found."
        />

        <MilestoneText
          year="1966"
          place="Staffordshire"
          title="Born into a country of hedgerows and Georgian cities."
        >
          <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
            {earlyLife[0]}
          </p>
        </MilestoneText>

        <MilestoneImageRight
          year="1986"
          place="Brighton Polytechnic"
          title="Art Foundation — the search for a different aesthetic."
          image="/img/about/02-painting-table.jpg"
          alt="Working on a mandala"
        >
          <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
            Encouraged to explore painting, textiles, sculpture and video. While the British Art movement was flowering in London, an exhibition of Aboriginal art moved him most — the start of a search for a universal visual language.
          </p>
        </MilestoneImageRight>

        <MilestoneBigYear
          year="1990"
          place="Bournemouth"
          title="3D Design, and the discovery of geometric pattern."
        >
          <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
            {earlyLife[1]}
          </p>
        </MilestoneBigYear>

        <MilestoneText
          year="1990 — 1995"
          place="France · Ibiza · Mexico · Virgin Islands"
          title="Theatre backdrops, murals, sketchbooks of geometry."
        >
          <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
            {earlyLife[2]}
          </p>
        </MilestoneText>

        {/* CHAPTER BREAK — Anegada */}
        <AnegadaSpread />

        {/* CHAPTER II — Practice */}
        <ChapterIntro
          numeral="II"
          label="Practice"
          years="1996 → 2009"
          title="An artist with a mission, decade by decade."
        />

        <MilestoneText
          year="1996"
          place="University of Brighton"
          title="Architecture & Interior Design."
        >
          <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
            {earlyLife[3]}
          </p>
        </MilestoneText>

        <MilestoneBigYear
          year="1999"
          place="Brighton"
          title="The first major mandala."
        >
          <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
            {earlyLife[4]}
          </p>
        </MilestoneBigYear>

        <MilestoneImageLeft
          year="2002 — 2009"
          place="Lewes, East Sussex"
          title="MA Fine Art, Phoenix Place, and the years of mandalas."
          image="/img/about/09-taga-studio.jpg"
          alt="Phoenix Place studio, Lewes"
        >
          <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
            {ABOUT.legacy[0]}
          </p>
        </MilestoneImageLeft>

        {/* CHAPTER III — Legacy */}
        <ChapterIntro
          numeral="III"
          label="Legacy"
          years="2010 →"
          title="The Academy, the children, and the work that endures."
        />

        <MilestoneQuote
          year="2010"
          place="TAGA · Phoenix Place"
          title="The Art of Geometry Academy is founded."
          image="/img/about/10-taga-classroom.jpg"
          alt="A TAGA class in session"
          quote={ABOUT.academyQuote}
        />

        <MilestoneImageRight
          year="2014"
          place="Az-Zarqa, Jordan"
          title="Teaching geometry to children who'd lost everything."
          image="/img/about/07-az-zarqa-students.jpg"
          alt="Stephen with children at the Az-Zarqa School for Palestinian Orphans and Refugees, Jordan"
        >
          <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
            {ABOUT.palestine}
          </p>
        </MilestoneImageRight>

        <MilestoneBigYear
          year="2016"
          place="Notting Hill, London"
          title="The 3.6-metre Arista SunStar."
        >
          <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
            {ABOUT.legacy[1]}
          </p>
        </MilestoneBigYear>

        {/* Visual coda for the passing — a thin rule above and a softer
            background tone separate this milestone from the regular
            timeline beats so the year doesn't land as just-another-entry.
            The 60vh "In memoriam" spacer (Item 6) creates a deliberate
            scroll-slowdown moment before the year lands. */}
        <div className="relative w-full bg-bg-soft border-t border-white/8 mt-10 md:mt-16">
          <InMemoriamSpacer />
          <MilestoneText
            year={PASSING_DATE}
            place="The estate continues"
            title="A life devoted to the geometry of light."
          >
            <p className="font-display font-medium text-[clamp(18px,2vw,24px)] leading-[1.5] text-ink m-0">
              Stephen passed away in {PASSING_DATE}. The Mandala Company, on behalf of his immediate family, continues to carry his work forward.
            </p>
          </MilestoneText>
        </div>

        {/* STUDENT LETTER */}
        <section className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-14 md:py-20">
          <Reveal as="div" className="text-center mb-8 md:mb-10">
            <p className="font-sans text-[11px] font-bold tracking-[0.42em] uppercase text-accent m-0 mb-4">
              To every student
            </p>
            <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(28px,4vw,52px)] leading-[1.0] text-ink m-0 max-w-[920px] mx-auto">
              {ABOUT.studentsIntro}
            </h2>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-10 md:items-stretch">
            <blockquote className="m-0 md:col-span-7 pl-6 md:pl-8 border-l-2 border-accent/60">
              <p className="font-sans font-medium text-[14.5px] md:text-[15.5px] leading-[1.85] text-ink m-0 mb-5">
                {ABOUT.studentsLetter}
              </p>
              <cite className="not-italic font-sans text-[10px] font-bold tracking-[0.38em] uppercase text-ink/65">
                — Stephen Meakin
              </cite>
            </blockquote>
            <figure className="m-0 md:col-span-5 min-h-[55vh] md:min-h-0">
              <ImageReveal
                src="/img/about/08-taga-group.jpg"
                alt="A group at TAGA with their paintings"
                fill
                edges="all"
                parallax={0.14}
                tilt
              />
            </figure>
          </Reveal>
        </section>

        {/* CLOSING */}
        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 pb-12 md:pb-16">
          <Reveal as="figure" className="m-0 mb-10 md:mb-14">
            <ImageReveal
              src="/img/about/11-ophiuchus-painting.jpg"
              alt="A painting on the studio floor"
              className="h-[55vh] sm:h-[65vh] md:h-[78vh] w-full"
              edges="y"
              parallax={0.26}
              shadow=""
            />
          </Reveal>
          {/* Dual closing path — a buyer ready to acquire goes straight
              to the collections; a reader moved by the bio joins
              Friends & Family. Both are reachable without
              scrolling. The cluster scales up gently on scroll-in (Item 8). */}
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
