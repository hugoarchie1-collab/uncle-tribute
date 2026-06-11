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
import { AssetImage } from "../components/AssetImage";
import { MagneticLink } from "../components/MagneticLink";
import { EnquireModal } from "../components/EnquireModal";
import {
  ABOUT,
  INTERVIEW,
  PASSING_DATE,
  TRIBUTE,
  MEMORIAL_QUOTE,
  LIFE_DATES,
} from "../data/content";
import { Seo } from "../components/Seo";
import { cn } from "../lib/cn";
import { asset } from "../lib/asset";
import { EYEBROW, EYEBROW_MUTED, TITLE, SUBTITLE, BTN_PRIMARY, BTN_SECONDARY } from "../components/ui/tokens";

// =============================================================================
// ABOUT — the long-form biography, paced like the owner's layout PDF: the life
// told CHRONOLOGICALLY with Stephen's personal photographs interleaved between
// the passages (text → photos → text), and built on the home page's design
// system (Welcome.tsx / tokens.ts) — including the home's four-colourway
// peacock backdrop crossfade and its LIGHT legibility veil, so the colours
// visibly glow and fade between chapters exactly as they do on the home page.
//
// Type canon (no bespoke sizes/weights/trackings anywhere below — every title
// is the shared TITLE token, every lead the SUBTITLE token, every eyebrow the
// EYEBROW token, exactly as the home page):
//   · Eyebrow   → EYEBROW / EYEBROW_MUTED (0.32em accent / muted)
//   · Title     → TITLE token (font-display, clamp 38→72, ls -0.04em)
//   · Lead/body → SUBTITLE token / BODY const (Hanken Grotesk, ink-soft 0.85)
//   · Caption   → the global `.caption` class (13–14px sentence-case Hanken,
//                 muted ink, normal tracking) on every documentary figcaption —
//                 EYEBROW_MUTED stays only on true labels / cites / meta.
//
// Measure discipline: every sustained reading column is capped at max-w-[62ch]
// (~65–70 characters at the rendered sizes) — the editorial ceiling the long
// 720px wrappers (~85ch) blew past. Display leads/quotes keep wider caps.
//
// Palette canon: cream ink over the shared peacock sky, ONE muted-ink token
// (text-ink-muted), ONE warm hairline token (ring-line / border-line). Accent
// appears only on eyebrows + hover/selection — never as a quote bar, fill, or
// body colour.
//
// No-crop rule: every photo lives in a defined aspect container so there is no
// layout shift. Landscape documentary shots whose crop is clearly safe use
// ImageReveal (object-cover). Portraits, group shots and the precious family
// photographs — where heads or edges would be lost — use ContainImage
// (object-contain on a dark mat), so the full frame always shows.
// =============================================================================

/** Canonical body paragraph recipe — one measure, one register, used everywhere.
 *  Hanken Grotesk, 16/17px, leading 1.7. Sustained READING ink sits at the
 *  0.85 `text-ink-soft` token (1,200+ words at the 0.7 muted alpha flattened
 *  the hierarchy — body and captions were the same colour, and dark-theme
 *  editorial sets reading text near full ink). `text-ink-muted` is reserved
 *  for captions / cites / meta, so brightest→quietest (body > caption) reads.
 *  `text-pretty` = orphan/rag control on the long measure. */
const BODY =
  "font-sans font-normal text-[16px] md:text-[17px] 3xl:text-[19px] leading-[1.7] text-ink-soft text-pretty m-0";

const SECTION = "mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12";

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
// Canonical eyebrow + optional place/date tag, used to open each chapter so the
// reader always knows where in the life they are — no bespoke type.
const SectionLabel = ({ children }: { children: ReactNode }) => (
  <p className={cn(EYEBROW, "m-0 mb-4")}>{children}</p>
);

// ─── ContainImage ────────────────────────────────────────────────────────────
// No-crop figure: the photo sits inside a fixed-aspect dark mat and is shown in
// full with object-contain — so heads, feet and edges are never cut off. A
// gentle scroll-tied parallax on the image only (transform/opacity), short-
// circuited under reduced motion. Use for portraits, group shots and the old
// family photographs.
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

// ─── AboutHero ────────────────────────────────────────────────────────────────
// Full-bleed cover image with the SAME atmosphere as the home page: object-cover
// (never crops/distorts at any width), the shared radial scrim used site-wide,
// plus a soft top+bottom gradient so the cream type and the overlay Nav stay
// legible over any part of the photograph. Type is the canonical home register —
// font-display headline (not 700, which isn't loaded), accent-free eyebrows in
// the muted-ink token, `.hero-text-shadow` for legibility. Scroll-scrubbed scale
// + opacity on the image and a gentle upward translate on the title; reduced-
// motion short-circuits every transform.
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
        className="relative h-[68vh] md:h-[78vh] min-h-[560px] max-h-[820px] aspect-[4/3] md:aspect-[3/2] w-full overflow-hidden bg-bg"
      >
        <motion.div
          className="absolute inset-0 will-change-transform"
          style={reduceMotion ? undefined : { scale: imgScale, opacity: imgOpacity }}
        >
          <AssetImage
            src="/img/about/01-stephen-at-gallery.jpg"
            alt="Stephen Meakin beside one of his paintings at a gallery"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
          />
        </motion.div>
        {/* Shared radial scrim — the EXACT focal recipe used on Welcome /
            Collections / the AmbientBackdrop, so the hero reads as the same
            world rather than a bolted-on banner. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(75% 60% at 50% 35%, rgba(10,9,8,0.5) 0%, rgba(10,9,8,0.2) 100%)",
          }}
        />
        {/* Edge feathering — darkens under the overlay Nav and beneath the
            title so cream type holds at any viewport without crushing the
            mid-image. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,9,8,0.6) 0%, rgba(10,9,8,0) 30%, rgba(10,9,8,0) 60%, rgba(10,9,8,0.72) 100%)",
          }}
        />
        <Reveal as="div" className="absolute top-24 md:top-28 left-1/2 -translate-x-1/2 text-center px-4">
          <p className={cn(EYEBROW_MUTED, "m-0 hero-text-shadow")}>
            In memoriam · 1966–{PASSING_DATE}
          </p>
        </Reveal>
        <motion.div
          style={reduceMotion ? undefined : { y: titleY }}
          className="absolute inset-x-0 bottom-[7vh] md:bottom-[8vh] text-center px-4"
        >
          <Reveal as="div">
            <h1 className="font-display font-semibold tracking-[-0.04em] text-[clamp(48px,11vw,160px)] leading-[0.88] text-ink m-0 hero-text-shadow">
              Stephen<br />Meakin
            </h1>
            <p className={cn(EYEBROW_MUTED, "mt-4 md:mt-5 hero-text-shadow")}>
              SEM · Mandala artist &amp; sacred geometer
            </p>
          </Reveal>
        </motion.div>
      </div>
    </section>
  );
};

// ─── AnegadaSpread ────────────────────────────────────────────────────────────
// The turning point — one quiet cinematic moment. Stephen's full figure on the
// cairn is shown UNCROPPED (object-contain) against a dark mat, then a short
// passage in the canonical body register. The section itself is TRANSPARENT —
// like every home section — so the peacock crossfade glows through rather than
// being blocked by a solid panel. Reduced-motion short-circuits.
const AnegadaSpread = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-4%", "4%"]);

  return (
    <section className="relative w-full" aria-label="The turning point">
      <div className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 py-16 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-center">
          {/* Uncropped portrait of Stephen on the cairn */}
          <figure
            ref={ref}
            className="m-0 md:col-span-5 max-w-[460px] md:max-w-none mx-auto md:mx-0 w-full"
          >
            <div className="relative w-full aspect-[3/4] overflow-hidden bg-bg ring-1 ring-line shadow-[0_28px_70px_rgba(0,0,0,0.6)]">
              <motion.div
                className="absolute inset-0 will-change-transform"
                style={reduceMotion ? undefined : { y: imgY }}
              >
                <AssetImage
                  src="/img/about/03-stephen-on-cairn.jpg"
                  alt="Stephen standing on a stone cairn in the desert"
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </motion.div>
            </div>
          </figure>

          {/* The realisation */}
          <div className="md:col-span-7">
            <Reveal as="div">
              <p className={cn(EYEBROW, "m-0 mb-5")}>Anegada · 1995</p>
              <h2 className="font-display font-semibold tracking-[-0.04em] text-[clamp(40px,6vw,96px)] leading-[0.92] text-ink m-0 mb-8 text-balance">
                <WordReveal text="Everything is connected." stagger={0.1} duration={1.0} />
              </h2>
            </Reveal>
            <Reveal as="div" className="max-w-[62ch] flex flex-col gap-6">
              <p className={BODY}>{ABOUT.anegada[0]}</p>
              <blockquote className="m-0 pl-5 border-l border-line">
                <p className="quote-hang font-display italic tracking-[-0.01em] text-[clamp(18px,2vw,24px)] leading-[1.5] text-ink m-0">
                  &ldquo;{ABOUT.anegadaQuote}&rdquo;
                </p>
              </blockquote>
              <p className={cn(EYEBROW_MUTED, "m-0")}>— Stephen Meakin, in his own words</p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
};

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
  { url: "/img/paintings/peacock-persian-indigo-blur.webp", name: "Persian Indigo" },
  { url: "/img/paintings/peacock-blood-moon-red-blur.webp", name: "Blood Moon Red" },
  { url: "/img/paintings/peacock-moroccan-purple-blur.webp", name: "Moroccan Purple" },
  { url: "/img/paintings/peacock-mary-pink-blur-v8.webp", name: "Mary Pink" },
];

// The four traditions Stephen wove together (named exactly as in ABOUT.legacy[0]).
// The two reference photographs below the strip illustrate the Persian and
// medieval-European traditions; Insular Island Arts and the Tibetan mandala
// have no reference photo — their names carry the row.
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
  // black"). It only starts crossfading to Blood-Moon Red at 0.22.
  const indigoOpacity = useTransform(scrollYProgress, [0, 0.22, 0.30], [1, 1, 0]);
  const redOpacity = useTransform(scrollYProgress, [0.22, 0.30, 0.46, 0.54], [0, 1, 1, 0]);
  const purpleOpacity = useTransform(scrollYProgress, [0.46, 0.54, 0.72, 0.80], [0, 1, 1, 0]);
  const maryPinkOpacity = useTransform(scrollYProgress, [0.72, 0.80, 0.97, 1], [0, 1, 1, 1]);
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

      <main className="relative isolate z-10">
        {/* 1 · HERO */}
        <AboutHero />

        {/* 2 · THE ARTIST — opening statement (ABOUT.opening[0]) in the display
            lead, then ABOUT.opening[1] presented as his self-description (the
            PDF frames it "As he described himself…") — quote styling only, the
            words verbatim from content.ts. Closed by a quiet editorial photo
            row: the close portrait, the later-years headshot, the family group
            (PDF pp. 1–2). All three are precious → ContainImage, no crops. */}
        <section className={cn(SECTION, "py-16 md:py-24")}>
          <Reveal as="div" className="max-w-[860px] mx-auto text-center">
            <SectionLabel>The artist</SectionLabel>
            <p className="font-display font-normal tracking-[-0.02em] text-[clamp(24px,3vw,38px)] leading-[1.3] text-ink m-0 text-balance">
              {ABOUT.opening[0]}
            </p>
          </Reveal>

          <Reveal as="div" className="max-w-[820px] mx-auto mt-12 md:mt-16">
            <p className={cn(EYEBROW_MUTED, "m-0 mb-5")}>As he described himself —</p>
            <blockquote className="m-0 pl-5 md:pl-7 border-l border-line">
              <p className="quote-hang font-display italic tracking-[-0.01em] text-[clamp(17px,1.9vw,21px)] leading-[1.65] text-ink m-0">
                &ldquo;{ABOUT.opening[1]}&rdquo;
              </p>
            </blockquote>
          </Reveal>

          {/* The photo row — portrait / outdoors / family, baselines aligned. */}
          <div className="grid grid-cols-2 md:grid-cols-12 gap-4 md:gap-6 items-end mt-14 md:mt-20">
            <Reveal as="figure" className="m-0 col-span-1 md:col-span-4">
              <ContainImage
                src="/img/about/12-stephen-portrait.jpg"
                alt="Close portrait of Stephen Meakin against a dark background, bearded and smiling slightly."
                aspect="aspect-[5/6]"
                sizes="(min-width: 768px) 33vw, 50vw"
              />
              <figcaption className="caption mt-3">Stephen — SEM</figcaption>
            </Reveal>
            <Reveal as="figure" className="m-0 col-span-1 md:col-span-5" delay={0.06}>
              <ContainImage
                src="/img/about/13-stephen-outdoor-portrait.jpg"
                alt="Stephen Meakin outdoors in sunlight, sunglasses resting on his head and earphones in, palms and greenery behind him."
                aspect="aspect-[4/3]"
                sizes="(min-width: 768px) 42vw, 50vw"
              />
              <figcaption className="caption mt-3">In later years</figcaption>
            </Reveal>
            <Reveal as="figure" className="m-0 col-span-2 md:col-span-3 max-w-[420px] mx-auto md:mx-0 w-full" delay={0.12}>
              <ContainImage
                src="/img/about/14-family-group.jpg"
                alt="Stephen Meakin standing at the back of a family group of six, an older couple seated together at the centre."
                aspect="aspect-square"
                sizes="(min-width: 768px) 25vw, 100vw"
              />
              <figcaption className="caption mt-3">With his family</figcaption>
            </Reveal>
          </div>
        </section>

        {/* 3 · BEGINNINGS · 1966 → — Staffordshire, Bath & Brighton
            (ABOUT.earlyLife[0]) with the two family photographs from PDF p3:
            the wedding top-hats and the floral sofa. Old family prints —
            contained, never cropped. */}
        <section className={cn(SECTION, "py-12 md:py-20")}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14">
            <Reveal as="div" className="md:col-span-5">
              <SectionLabel>Beginnings · 1966 →</SectionLabel>
              <h2 className={cn(TITLE, "m-0 mb-7 max-w-[640px]")}>
                Bath, Brighton, and a different aesthetic.
              </h2>
              <p className={cn(BODY, "max-w-[62ch]")}>{ABOUT.earlyLife[0]}</p>
            </Reveal>
            <div className="md:col-span-7 flex flex-col gap-4 md:gap-6">
              <Reveal as="figure" className="m-0">
                <ContainImage
                  src="/img/about/15-wedding-top-hats.jpg"
                  alt="A bride and three young men in morning dress and grey top hats at a family wedding, a young Stephen Meakin second from the left."
                  aspect="aspect-[5/3]"
                  sizes="(min-width: 768px) 56vw, 100vw"
                />
                <figcaption className="caption mt-3">
                  A family wedding — Stephen second from the left
                </figcaption>
              </Reveal>
              <Reveal as="figure" className="m-0 md:max-w-[78%] md:ml-auto w-full" delay={0.08}>
                <ContainImage
                  src="/img/about/16-family-sofa.jpg"
                  alt="A teenage Stephen Meakin in a yellow patterned shirt on a floral sofa beside two teenage girls, a family photograph from his growing-up years."
                  aspect="aspect-[4/3]"
                  sizes="(min-width: 768px) 44vw, 100vw"
                />
                <figcaption className="caption mt-3 md:text-right">
                  Growing up — Bath &amp; Brighton
                </figcaption>
              </Reveal>
            </div>
          </div>
        </section>

        {/* 4 · BOURNEMOUTH · 1990 — the dusty hardback discovery
            (ABOUT.earlyLife[1]) with the two group photographs from PDF p4.
            Mirrored composition (photos left, text right) so consecutive
            chapters never repeat the same layout. */}
        <section className={cn(SECTION, "py-12 md:py-20")}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14">
            <div className="md:col-span-7 flex flex-col gap-4 md:gap-6 order-2 md:order-1">
              <Reveal as="figure" className="m-0">
                <ContainImage
                  src="/img/about/17-bournemouth-friends.jpg"
                  alt="Stephen Meakin, long-haired in a pale suit, standing with three smartly dressed friends outdoors under trees."
                  aspect="aspect-video"
                  sizes="(min-width: 768px) 56vw, 100vw"
                />
                <figcaption className="caption mt-3">
                  Bournemouth, 1990 — Stephen in the pale suit
                </figcaption>
              </Reveal>
              <Reveal as="figure" className="m-0 md:max-w-[72%] w-full" delay={0.08}>
                <ImageReveal
                  src="/img/about/18-cafe-terrace.jpg"
                  alt="Stephen Meakin in a denim shirt smiling at an outdoor café table, a stoneware jug before him and cypress trees in the distance."
                  aspect="aspect-[4/3]"
                  edges="all"
                  parallax={0.1}
                  sizes="(min-width: 768px) 40vw, 100vw"
                />
              </Reveal>
            </div>
            <Reveal as="div" className="md:col-span-5 order-1 md:order-2">
              <SectionLabel>Bournemouth · 1990</SectionLabel>
              <h2 className={cn(TITLE, "m-0 mb-7 max-w-[640px]")}>
                A dusty old hardback.
              </h2>
              <p className={cn(BODY, "max-w-[62ch]")}>{ABOUT.earlyLife[1]}</p>
            </Reveal>
          </div>
        </section>

        {/* 5 · THE WANDERING YEARS — Swatch → Tunbridge Wells → France, Ibiza,
            Mexico → four years in the Virgin Islands (ABOUT.earlyLife[2]). The
            era the PDF gives the most photographs (pp. 5–6) — a bold cinematic
            mosaic: night portrait, the helm, the parties. All people-shots →
            contained, never cropped. */}
        <section className={cn(SECTION, "py-16 md:py-24")}>
          <Reveal as="div" className="text-center max-w-[860px] mx-auto mb-10 md:mb-14">
            <SectionLabel>France · Ibiza · Mexico · The Virgin Islands</SectionLabel>
            <h2 className={cn(TITLE, "max-w-[820px] mx-auto my-0 mb-7")}>
              The wandering years.
            </h2>
            <p className={cn(BODY, "max-w-[62ch] mx-auto text-left md:text-center")}>
              {ABOUT.earlyLife[2]}
            </p>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-12 gap-4 md:gap-6 items-end">
            <Reveal as="figure" className="m-0 col-span-1 md:col-span-3">
              <ContainImage
                src="/img/about/20-island-evening.jpg"
                alt="Stephen Meakin in a loose white shirt and jeans, seated outdoors at night during his years abroad."
                aspect="aspect-[3/4]"
                sizes="(min-width: 768px) 25vw, 50vw"
              />
            </Reveal>
            <Reveal as="figure" className="m-0 col-span-1 md:col-span-5" delay={0.06}>
              <ContainImage
                src="/img/about/19-evening-with-friends.jpg"
                alt="Three friends in white shirts at a party table at night, balloons strung from the beam behind them, Stephen Meakin among them."
                aspect="aspect-[4/3]"
                sizes="(min-width: 768px) 42vw, 50vw"
              />
            </Reveal>
            <Reveal as="figure" className="m-0 col-span-1 md:col-span-4" delay={0.12}>
              <ContainImage
                src="/img/about/21-at-the-helm.jpg"
                alt="Stephen Meakin at the wheel of a motorboat, long sun-bleached hair blown back and the sea behind him, from his Virgin Islands years."
                aspect="aspect-[3/4]"
                sizes="(min-width: 768px) 33vw, 50vw"
              />
            </Reveal>
            {/* Era tag tile — fills the mosaic's remaining cell on md+ with the
                chapter's facts (all drawn from ABOUT.earlyLife[2] above). */}
            <Reveal as="div" className="hidden md:flex md:col-span-3 flex-col justify-end gap-2 border-t border-line pt-5 self-stretch">
              <p className={cn(EYEBROW_MUTED, "m-0 leading-[1.9]")}>The Virgin Islands</p>
              <p className={cn(EYEBROW_MUTED, "m-0 leading-[1.9]")}>Mural painter · graphic artist · windsurf instructor</p>
            </Reveal>
            <Reveal as="figure" className="m-0 col-span-1 md:col-span-4" delay={0.06}>
              <ContainImage
                src="/img/about/22-fancy-dress-party.jpg"
                alt="Stephen Meakin in pirate fancy dress with a toy parrot on his shoulder, a friend in an eyepatch reclining in front of him."
                aspect="aspect-[3/4]"
                sizes="(min-width: 768px) 33vw, 50vw"
              />
            </Reveal>
            <Reveal as="figure" className="m-0 col-span-2 md:col-span-5" delay={0.12}>
              <ContainImage
                src="/img/about/23-costume-evening.jpg"
                alt="Stephen Meakin smiling with his arm around a friend dressed in a gold costume headdress at an evening gathering."
                aspect="aspect-[8/7]"
                sizes="(min-width: 768px) 42vw, 100vw"
              />
            </Reveal>
          </div>
          <Reveal as="div" className="mt-5 text-center">
            <p className={cn(EYEBROW_MUTED, "m-0")}>A four-year stay in the Virgin Islands</p>
          </Reveal>
        </section>

        {/* 6 · RETURN & STUDY · 1996 → 2002 — architecture at Brighton, the MA
            in Fine Art (ABOUT.earlyLife[3]), and the first major mandala
            (ABOUT.earlyLife[4] — verbatim, set as the pull-line it deserves).
            Paired with the first circle in the sand (PDF p7). */}
        <section className={cn(SECTION, "py-12 md:py-20")}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14 md:items-center">
            <Reveal as="div" className="md:col-span-7">
              <SectionLabel>Return &amp; study · 1996 → 2002</SectionLabel>
              <h2 className={cn(TITLE, "m-0 mb-7 max-w-[680px]")}>
                Architecture, fine art, and the first mandala.
              </h2>
              <p className={cn(BODY, "max-w-[62ch]")}>{ABOUT.earlyLife[3]}</p>
              <p className="font-display font-semibold tracking-[-0.02em] text-[clamp(22px,2.6vw,34px)] leading-[1.25] text-ink m-0 mt-8 max-w-[680px] text-balance">
                {ABOUT.earlyLife[4]}
              </p>
            </Reveal>
            <Reveal as="figure" className="m-0 md:col-span-5 max-w-[480px] md:max-w-none mx-auto md:mx-0 w-full">
              <ContainImage
                src="/img/about/24-circle-in-the-sand.jpg"
                alt="A large circular mandala pattern carved into the sand of a long beach, the shoreline stretching away behind it."
                aspect="aspect-[4/5]"
                sizes="(min-width: 768px) 40vw, 100vw"
              />
              <figcaption className="caption mt-3 text-center">
                The first circle — drawn in the sand at Anegada, 1995
              </figcaption>
            </Reveal>
          </div>
        </section>

        {/* 7 · ANEGADA — the turning point (one cinematic moment, uncropped) */}
        <AnegadaSpread />

        {/* 8 · ART AS RITUAL — Stephen's own words on the practice
            (ABOUT.anegada[1] + ABOUT.anegada[2]) in a two-column reading
            measure on md+, supported by the drafting-table photograph and the
            harmonic-frequency grid (PDF p8) as quiet figures. */}
        <section className={cn(SECTION, "py-16 md:py-24")}>
          <Reveal as="div" className="text-center max-w-[860px] mx-auto mb-10 md:mb-14">
            <SectionLabel>Art as ritual</SectionLabel>
            <h2 className={cn(TITLE, "max-w-[820px] mx-auto my-0 mb-5")}>
              The palette of my being.
            </h2>
            <p className={cn(EYEBROW_MUTED, "m-0")}>— Stephen, on his practice, in his own words</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-[1180px] mx-auto">
            <Reveal as="div">
              <p className={BODY}>{ABOUT.anegada[1]}</p>
            </Reveal>
            <Reveal as="div" delay={0.06}>
              <p className={BODY}>{ABOUT.anegada[2]}</p>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-6 items-end max-w-[1180px] mx-auto mt-12 md:mt-16">
            <Reveal as="figure" className="m-0 md:col-span-7">
              <ImageReveal
                src="/img/about/02-painting-table.jpg"
                alt="Stephen at his drafting table, working on a mandala"
                aspect="aspect-[4/3]"
                edges="all"
                parallax={0.1}
                sizes="(min-width: 768px) 56vw, 100vw"
              />
            </Reveal>
            <Reveal as="figure" className="m-0 md:col-span-5 max-w-[440px] mx-auto md:mx-0 w-full" delay={0.08}>
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
              <figcaption className="caption mt-3 text-center">
                Harmonic frequencies — twelve cymatic patterns, 345 Hz to 5907 Hz
              </figcaption>
            </Reveal>
          </div>
        </section>

        {/* 9 · FOUR TRADITIONS — Lewes, Phoenix Place, and the four key
            components Stephen wove together (ABOUT.legacy[0]), with the two
            tradition reference photographs (PDF p9) as a labelled strip. The
            Insular and Tibetan traditions have no reference photo — the
            numbered name row carries all four. */}
        <section className={cn(SECTION, "py-12 md:py-20")}>
          <Reveal as="div" className="text-center max-w-[860px] mx-auto mb-10 md:mb-14">
            <SectionLabel>Lewes · Phoenix Place</SectionLabel>
            <h2 className={cn(TITLE, "max-w-[820px] mx-auto my-0 mb-7")}>
              Four traditions, one language.
            </h2>
            <p className={cn(SUBTITLE, "mx-auto")}>{ABOUT.legacy[0]}</p>
          </Reveal>

          <Reveal as="div" className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8 mb-10 md:mb-14">
            {TRADITIONS.map((t) => (
              <div key={t.numeral} className="border-t border-line pt-4">
                <p className={cn(EYEBROW, "m-0 mb-2")}>{t.numeral}</p>
                <p className="font-display font-normal tracking-[-0.01em] text-[clamp(17px,1.7vw,22px)] leading-[1.3] text-ink m-0 text-balance">
                  {t.name}
                </p>
              </div>
            ))}
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-6">
            <Reveal as="figure" className="m-0">
              <ImageReveal
                src="/img/about/26-persian-geometry.jpg"
                alt="The blue-tiled, honeycomb-vaulted entrance portal of a mosque, an example of the Persian geometric tradition Stephen studied."
                aspect="aspect-[16/9]"
                edges="all"
                parallax={0.08}
                sizes="(min-width: 768px) 50vw, 100vw"
              />
              <figcaption className="caption mt-3 text-center">
                The Persian geometric tradition
              </figcaption>
            </Reveal>
            <Reveal as="figure" className="m-0" delay={0.08}>
              <ImageReveal
                src="/img/about/27-sainte-chapelle.jpg"
                alt="The upper chapel of Sainte-Chapelle in Paris, its walls of stained glass rising to a rose window, the medieval tradition behind Stephen's rose-window studies."
                aspect="aspect-[16/9]"
                edges="all"
                parallax={0.08}
                sizes="(min-width: 768px) 50vw, 100vw"
              />
              <figcaption className="caption mt-3 text-center">
                Sainte-Chapelle, Paris — the rose windows of medieval Europe
              </figcaption>
            </Reveal>
          </div>
        </section>

        {/* 10 · EXHIBITIONS & COMMISSIONS — body left, Force India plate right
            (a design document → object-contain so the whole layout reads) */}
        <section className={cn(SECTION, "py-12 md:py-20")}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 md:items-center">
            <Reveal as="div" className="md:col-span-6">
              <SectionLabel>Exhibitions &amp; commissions</SectionLabel>
              <h2 className={cn(TITLE, "m-0 mb-7 max-w-[600px]")}>
                From the Majlis in Dubai to a Formula One car.
              </h2>
              <p className={cn(BODY, "max-w-[62ch]")}>{ABOUT.legacy[1]}</p>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-4 list-none p-0 mt-8 max-w-[520px]">
                {[
                  "Majlis Gallery · Dubai",
                  "Trinity Gallery · London",
                  "Unique Arts · Brighton",
                  "Arista SunStar · Notting Hill",
                  "Sahara Force India F1",
                  "Tree of Wellbeing · 1,200 UK hospices",
                ].map((item) => (
                  <li key={item} className={cn(EYEBROW_MUTED, "m-0 leading-[1.5]")}>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal as="figure" className="m-0 md:col-span-6">
              <div className="bg-cream p-3 md:p-4 ring-1 ring-line shadow-[0_28px_70px_rgba(0,0,0,0.55)]">
                <AssetImage
                  src="/img/about/06-force-india-final.jpg"
                  alt="Stephen's mandala design for the Sahara Force India Formula One car"
                  width={904}
                  height={639}
                  loading="lazy"
                  decoding="async"
                  className="block w-full h-auto"
                />
              </div>
              <figcaption className="caption mt-4 text-center">
                Sahara Force India F1 · mandala VJM07
              </figcaption>
            </Reveal>
          </div>
        </section>

        {/* 11 · IN CONVERSATION · DUBAI 2011 — the Time Out Dubai interview
            (content.ts INTERVIEW): estate-voice context + the Mystic Rose
            flyer on the left, the Q&A on the right. Questions in the muted
            sans register; Stephen's answers verbatim in the display register —
            the two short answers ("To inspire wonderment." / "Shall we sit
            down and have some tea?") land large, as the emotional beats. */}
        <section className={cn(SECTION, "py-16 md:py-24")}>
          <Reveal as="div" className="mb-10 md:mb-14">
            <SectionLabel>{INTERVIEW.eyebrow}</SectionLabel>
            <h2 className={cn(TITLE, "m-0 max-w-[760px]")}>In conversation.</h2>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            <div className="lg:col-span-5">
              <Reveal as="div" className="flex flex-col gap-5 max-w-[62ch]">
                {INTERVIEW.context.map((p, i) => (
                  <p key={i} className={BODY}>
                    {p}
                  </p>
                ))}
              </Reveal>
              <Reveal as="figure" className="m-0 mt-10 max-w-[480px]">
                <div className="bg-cream p-3 md:p-4 ring-1 ring-line shadow-[0_28px_70px_rgba(0,0,0,0.55)]">
                  <AssetImage
                    src="/img/about/04-mystic-rose-flyer.jpg"
                    alt="The exhibition flyer for ‘The Mystic Rose’ at the Majlis Gallery, Dubai, January 2011"
                    width={900}
                    height={604}
                    loading="lazy"
                    decoding="async"
                    className="block w-full h-auto"
                  />
                </div>
                <figcaption className="caption mt-4">
                  <i>‘The Mystic Rose’</i> · Majlis Gallery, Dubai · January 2011
                </figcaption>
              </Reveal>
            </div>

            <div className="lg:col-span-7">
              <div className="border-t border-line">
                {INTERVIEW.qa.map((item) => {
                  const isBeat = item.a.length <= BEAT_ANSWER_MAX_CHARS;
                  return (
                    <Reveal as="div" key={item.q} className="border-b border-line py-8 md:py-10">
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
                })}
              </div>
              <Reveal as="div" className="mt-6">
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
          </div>
        </section>

        {/* 12 · TAGA — the Academy. The group photo is the hero of this section
            and MUST show in full (heads + all the mandalas), so it is contained
            on a mat rather than cropped. */}
        <section className={cn(SECTION, "py-16 md:py-24")}>
          <Reveal as="div" className="text-center max-w-[860px] mx-auto mb-10 md:mb-14">
            <SectionLabel>The Academy · 2010 → · Phoenix Place, Lewes</SectionLabel>
            <h2 className={cn(TITLE, "max-w-[820px] mx-auto my-0 mb-7")}>
              The Art of Geometry Academy.
            </h2>
            <p className={cn(SUBTITLE, "mx-auto")}>{ABOUT.legacy[2]}</p>
          </Reveal>

          <Reveal as="figure" className="my-0 max-w-[1040px] mx-auto">
            <ContainImage
              src="/img/about/08-taga-group.jpg"
              alt="Stephen with a group of TAGA students, each holding a mandala they painted"
              aspect="aspect-[4/3]"
              parallax={0.05}
              sizes="(min-width: 1100px) 1040px, calc(100vw - 32px)"
            />
            <figcaption className="caption mt-5 text-center">
              A TAGA group with their finished mandalas · Phoenix Place, Lewes
            </figcaption>
          </Reveal>

          <Reveal as="div" className="max-w-[720px] mx-auto mt-12 md:mt-16">
            <blockquote className="m-0 pl-6 border-l border-line">
              <p className="font-display italic tracking-[-0.01em] text-[clamp(17px,1.8vw,22px)] leading-[1.55] text-ink m-0 mb-4">
                {ABOUT.academyQuote}
              </p>
              <cite className={cn(EYEBROW_MUTED, "not-italic")}>— On the founding of TAGA</cite>
            </blockquote>
          </Reveal>
        </section>

        {/* 13 · AZ-ZARQA — children photo (no head crop → safe 4:3 cover) left,
            text right */}
        <section className={cn(SECTION, "py-12 md:py-20")}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 md:items-center">
            <Reveal as="figure" className="m-0 md:col-span-6">
              <ImageReveal
                src="/img/about/07-az-zarqa-students.jpg"
                alt="Stephen with Bedouin children near Petra, Jordan, holding mandalas"
                aspect="aspect-[4/3]"
                edges="all"
                parallax={0.1}
              />
            </Reveal>
            <Reveal as="div" className="md:col-span-6">
              <SectionLabel>Az-Zarqa, Jordan</SectionLabel>
              <h2 className={cn(TITLE, "m-0 mb-7 max-w-[600px]")}>
                The same geometry, taught to children who had lost everything.
              </h2>
              <p className={cn(BODY, "max-w-[62ch]")}>{ABOUT.palestine}</p>
            </Reveal>
          </div>
        </section>

        {/* 14 · THE BODY OF WORK — image-led pause: the paintings gathered
            together in the studio. Deliberately quiet — one eyebrow, the widest
            figure on the page (full SECTION width, soft edges like every other
            ImageReveal here), one caption whose facts are derived from
            paintings.ts (ten paintings, three collections) — no invented
            words. `sizes` mirrors the SECTION wrapper: max-w 1320/1500/1720
            minus the horizontal padding at each step, so the 800/1400w WebP
            variants actually get picked instead of the full-size file. */}
        <section className={cn(SECTION, "py-12 md:py-20")}>
          <Reveal as="div" className="text-center mb-6 md:mb-8">
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

        {/* 15 · IN MEMORIAM — the family's farewell. Polly Wedge's funeral
            tribute, opened by Stephen's own "everything is connected" words. */}
        <section className="mx-auto max-w-[820px] 2xl:max-w-[960px] 3xl:max-w-[1040px] px-4 sm:px-6 md:px-8 lg:px-12 py-16 md:py-24 border-t border-line">
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

        {/* 16 · CLOSING CTA */}
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
