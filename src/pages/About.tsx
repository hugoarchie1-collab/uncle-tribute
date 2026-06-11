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
import { ABOUT, PASSING_DATE, TRIBUTE, MEMORIAL_QUOTE, LIFE_DATES } from "../data/content";
import { Seo } from "../components/Seo";
import { cn } from "../lib/cn";
import { asset } from "../lib/asset";
import { EYEBROW, EYEBROW_MUTED, TITLE, SUBTITLE, BTN_PRIMARY, BTN_SECONDARY } from "../components/ui/tokens";

// =============================================================================
// ABOUT — the long-form biography, paced like the owner's layout PDF and built
// on the home page's design system (Welcome.tsx / tokens.ts).
//
// Type canon (no bespoke sizes/weights/trackings anywhere below — every title
// is the shared TITLE token, every lead the SUBTITLE token, every eyebrow the
// EYEBROW token, exactly as the home page):
//   · Eyebrow   → EYEBROW / EYEBROW_MUTED (0.32em accent / muted)
//   · Title     → TITLE token (font-display, clamp 32→60, ls -0.04em, lh 0.98)
//   · Lead/body → SUBTITLE token / BODY const (Hanken Grotesk, muted-ink token)
//
// Palette canon: dark shell, cream ink, ONE muted-ink token (text-ink-muted),
// ONE warm hairline token (ring-line / border-line). Accent appears only on
// eyebrows + hover/selection — never as a quote bar, fill, or body colour.
//
// No-crop rule: every photo lives in a defined aspect container so there is no
// layout shift. Landscape documentary shots whose crop is clearly safe use
// ImageReveal (object-cover). Portraits and the TAGA group photo — where heads
// or edges would be lost — use ContainImage (object-contain on a dark mat), so
// the full frame always shows.
// =============================================================================

/** Canonical body paragraph recipe — one measure, one register, used everywhere.
 *  Mirrors the home section prose: Hanken Grotesk, 16/17px, leading 1.7, routed
 *  through the single muted-ink token (never a bespoke /85 alpha). */
const BODY =
  "font-sans font-normal text-[16px] md:text-[17px] 3xl:text-[19px] leading-[1.7] text-ink-muted m-0";

const SECTION = "mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12";

// ─── WordReveal ────────────────────────────────────────────────────────────
// Stagger every word into place with a blur-clear. Used on the one cinematic
// headline (Anegada). Short-circuits entirely under reduced motion.
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
// gentle scroll-tied parallax/scale on the image only (transform/opacity), short-
// circuited under reduced motion. Use for portraits and group shots.
const ContainImage = ({
  src,
  alt,
  aspect = "aspect-[4/3]",
  parallax = 0.06,
}: {
  src: string;
  alt: string;
  /** Tailwind aspect class for the MAT. The image is contained within it. */
  aspect?: string;
  parallax?: number;
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
// cairn is shown UNCROPPED (object-contain) against a dark field, then a short
// passage in the canonical body register. Reduced-motion short-circuits.
const AnegadaSpread = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-4%", "4%"]);

  return (
    <section
      className="relative w-full overflow-hidden bg-bg-soft"
      aria-label="The turning point"
    >
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
            <Reveal as="div" className="max-w-[720px] flex flex-col gap-6">
              <p className={BODY}>{ABOUT.anegada[0]}</p>
              <blockquote className="m-0 pl-5 border-l border-line">
                <p className="font-display italic tracking-[-0.01em] text-[clamp(18px,2vw,24px)] leading-[1.5] text-ink m-0">
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

export const About = () => {
  // Friends & Family enquiry modal — opened from the closing CTA so a reader
  // moved by the biography can subscribe without leaving the page.
  const [friendsOpen, setFriendsOpen] = useState(false);
  const closeFriends = useCallback(() => setFriendsOpen(false), []);
  const openFriends = useCallback(() => setFriendsOpen(true), []);

  // Whole-page scroll drives the same four peacock backdrops as the home page,
  // crossfading in turn: Persian Indigo → Blood Moon Red → Moroccan Purple →
  // Mary Pink — identical recipe to Welcome.tsx so About shares the home's sky.
  const { scrollYProgress } = useScroll();
  const indigoOpacity = useTransform(scrollYProgress, [0, 0.05, 0.22, 0.30], [0, 1, 1, 0]);
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
              opacity: backdropOpacities[i],
              backgroundImage: `url("${asset(bd.url)}")`,
              willChange: "opacity",
            }}
          />
        ))}
        {/* Reading scrim — About is long-form, text-led memorial content, so it
            darkens the peacock sky more than the home page's light scrim: the
            colourways still show through as a moody tinted texture, but the
            eulogy + biography stay legible and dignified over the bright
            (Mary-Pink / magenta) backdrop regions. Same backdrop, calmer veil. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,9,8,0.82) 0%, rgba(10,9,8,0.66) 45%, rgba(10,9,8,0.82) 100%)",
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

        {/* 2 · ABOUT THE ARTIST — opening statement, generous measure, centred.
            A display-serif lead (loaded weight, full-opacity ink) over the
            canonical SUBTITLE body. */}
        <section className={cn(SECTION, "py-16 md:py-24 text-center")}>
          <Reveal as="div" className="max-w-[860px] mx-auto">
            <SectionLabel>The artist</SectionLabel>
            <p className="font-display font-normal tracking-[-0.02em] text-[clamp(24px,3vw,38px)] leading-[1.3] text-ink m-0 mb-8 text-balance">
              {ABOUT.opening[0]}
            </p>
            <p className={cn(SUBTITLE, "mx-auto")}>{ABOUT.opening[1]}</p>
          </Reveal>
        </section>

        {/* 3 · EARLY LIFE — text left, drafting-table photo right (safe cover) */}
        <section className={cn(SECTION, "py-12 md:py-20")}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 md:items-center">
            <Reveal as="div" className="md:col-span-6">
              <SectionLabel>Beginnings · 1966 → 1995</SectionLabel>
              <h2 className={cn(TITLE, "m-0 mb-7 max-w-[640px]")}>
                The search for a different aesthetic.
              </h2>
              <div className="max-w-[720px] flex flex-col gap-5">
                <p className={BODY}>{ABOUT.earlyLife[0]}</p>
                <p className={BODY}>{ABOUT.earlyLife[1]}</p>
              </div>
            </Reveal>
            <Reveal as="figure" className="m-0 md:col-span-6">
              <ImageReveal
                src="/img/about/02-painting-table.jpg"
                alt="Stephen at his drafting table, working on a mandala"
                aspect="aspect-[4/3]"
                edges="all"
                parallax={0.12}
              />
            </Reveal>
          </div>
        </section>

        {/* 4 · WANDERING YEARS — short passage, centred measure */}
        <section className={cn(SECTION, "py-10 md:py-16")}>
          <Reveal as="div" className="max-w-[720px]">
            <SectionLabel>France · Ibiza · Mexico · Virgin Islands</SectionLabel>
            <div className="flex flex-col gap-5">
              <p className={BODY}>{ABOUT.earlyLife[2]}</p>
              <p className={BODY}>{ABOUT.earlyLife[3]}</p>
            </div>
          </Reveal>
        </section>

        {/* 5 · ANEGADA — the turning point (one cinematic moment, uncropped) */}
        <AnegadaSpread />

        {/* 6 · LEWES & THE WORK — text left, studio photo right */}
        <section className={cn(SECTION, "py-16 md:py-24")}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 md:items-center">
            <Reveal as="figure" className="m-0 md:col-span-6 order-1">
              <ImageReveal
                src="/img/about/09-taga-studio.jpg"
                alt="Stephen's studio at Phoenix Place, Lewes — drafting table and mandalas"
                aspect="aspect-[4/3]"
                edges="all"
                parallax={0.12}
              />
            </Reveal>
            <Reveal as="div" className="md:col-span-6 order-2">
              <SectionLabel>Practice · Lewes, East Sussex</SectionLabel>
              <h2 className={cn(TITLE, "m-0 mb-7 max-w-[640px]")}>
                A studio at Phoenix Place.
              </h2>
              <div className="max-w-[720px] flex flex-col gap-5">
                <p className={BODY}>{ABOUT.legacy[0]}</p>
                <p className={BODY}>{ABOUT.earlyLife[4]}</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 7 · THE BODY OF WORK — image-led pause: the paintings gathered
            together in the studio (the wide shot kept on disk since May for
            exactly this). Deliberately quiet — one eyebrow, the widest figure
            on the page (full SECTION width, soft edges like every other
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
            <figcaption className={cn(EYEBROW_MUTED, "mt-5 text-center")}>
              Ten paintings across three collections — Habundia, Genesis and Born in the Sky
            </figcaption>
          </Reveal>
        </section>

        {/* 8 · EXHIBITIONS & COMMISSIONS — body left, Force India plate right
            (a design document → object-contain so the whole layout reads) */}
        <section className={cn(SECTION, "py-12 md:py-20")}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 md:items-center">
            <Reveal as="div" className="md:col-span-6">
              <SectionLabel>Exhibitions &amp; commissions</SectionLabel>
              <h2 className={cn(TITLE, "m-0 mb-7 max-w-[600px]")}>
                From the Majlis in Dubai to a Formula One car.
              </h2>
              <p className={cn(BODY, "max-w-[720px]")}>{ABOUT.legacy[1]}</p>
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
              <figcaption className={cn(EYEBROW_MUTED, "mt-4 text-center")}>
                Sahara Force India F1 · mandala VJM07
              </figcaption>
            </Reveal>
          </div>
        </section>

        {/* 9 · TAGA — the Academy. The group photo is the hero of this section
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
            />
            <figcaption className={cn(EYEBROW_MUTED, "mt-5 text-center")}>
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

        {/* 10 · PALESTINE — children photo (no head crop → safe 4:3 cover) left,
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
              <p className={cn(BODY, "max-w-[720px]")}>{ABOUT.palestine}</p>
            </Reveal>
          </div>
        </section>

        {/* 11 · THE SUNSTAR — cinematic full-bleed-ish close of the work.
            The painting on the studio floor, shown whole on a dark field. */}
        <section className={cn(SECTION, "py-12 md:py-20")}>
          <Reveal as="figure" className="my-0 max-w-[920px] mx-auto">
            <ContainImage
              src="/img/about/11-ophiuchus-painting.jpg"
              alt="A finished SunStar painting in Stephen's studio"
              aspect="aspect-[4/3]"
              parallax={0.05}
            />
            <figcaption className={cn(EYEBROW_MUTED, "mt-5 text-center")}>
              From the studio · the geometry of light
            </figcaption>
          </Reveal>
        </section>

        {/* 12 · IN MEMORIAM — the family's farewell. Polly Wedge's funeral
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
              <p className="font-display italic text-[clamp(20px,2.6vw,28px)] leading-[1.45] text-ink m-0">
                “{MEMORIAL_QUOTE}”
              </p>
            </blockquote>
            <figcaption className={cn(EYEBROW_MUTED, "not-italic mt-5")}>
              — Stephen Meakin
            </figcaption>
          </Reveal>

          <Reveal as="div" className="max-w-[680px] mx-auto">
            {TRIBUTE.paragraphs.map((p, i) => (
              <p key={i} className={cn(BODY, i > 0 && "mt-5")}>
                {p}
              </p>
            ))}
            <p className={cn(EYEBROW_MUTED, "mt-8")}>{TRIBUTE.attribution}</p>
          </Reveal>
        </section>

        {/* 13 · CLOSING CTA */}
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
