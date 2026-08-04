import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { ImageReveal } from "../components/ImageReveal";
import { AssetImage } from "../components/AssetImage";
import { MagneticLink } from "../components/MagneticLink";
import { WELCOME } from "../data/content";
import { LIFE_DATES } from "../data/content";
import {
  PAINTINGS,
  getLowestTierPricePence,
  paintingImageAlt,
  EMBELLISHMENT_NOTE,
} from "../data/paintings";
import { asset } from "../lib/asset";
import { cn } from "../lib/cn";
import { useCurrency } from "../lib/currency";
import { EYEBROW, TITLE, SUBTITLE, EYEBROW_TIGHT } from "../components/ui/tokens";
import { Seo } from "../components/Seo";
import { PavoBackdrop } from "../components/PavoBackdrop";

// =============================================================================
// HOME PAGE — one system, applied to every beat.
// -----------------------------------------------------------------------------
// The home page was rebuilt around a strict constitution so it reads as
// DESIGNED, not assembled:
//   • ONE type scale. Two display roles only — HERO_DISPLAY (the single largest
//     recurring statement: the hero line, the reminder peak, the closes) and the
//     shared TITLE token (every section h2). Body is the SUBTITLE token. No
//     section invents its own font-size clamp.
//   • ONE vertical rhythm. <main> owns every gap via space-y; sections carry NO
//     per-section py / mt / mb / border-t. The gap can never double up or vary.
//   • ONE alignment axis. Every content beat is centred on the page's spine —
//     the calm, symmetric, museum register.
//   • ONE moving image. The garden→galaxy CosmicInterlude is the single film;
//     the archive footage that used to autoplay all over the page now lives on
//     the interior pages. Restraint is the luxury signal.
//   • The Earth bookend is untouched: Earth opens the page (masthead) and its
//     mirror closes it, with the in-memoriam remembrance reading just above.
// The masthead + Earth-close JSX is preserved verbatim (owner-defended).
// =============================================================================

/** The single largest RECURRING display cut — the hero line, the reminder peak,
 *  and the closing statements all share it so there is one dominant voice, not
 *  three competing "biggest things on the page". Fraunces, even/bold opsz-48/700
 *  (the finale cut). Size is passed per use so a peak can step down from the
 *  hero without becoming a different typeface. */
const heroDisplay = (fontSize: string, lineHeight = 0.98): CSSProperties => ({
  fontVariationSettings: '"opsz" 48, "wght" 700',
  fontWeight: 700,
  fontSize,
  lineHeight,
  letterSpacing: "-0.03em",
});

/**
 * CosmicInterlude — the ONE film on the page: a Veo-generated garden→galaxy
 * boomerang, the cinematic breath under the hero. LAZY (mounts ~300px before
 * view), muted/looping/playsInline so it autoplays everywhere; reduced-motion
 * users skip it. Full-bleed banner, feathered top+bottom into the peacock wash.
 */
const CosmicInterlude = () => {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduceMotion]);

  // Robust autoplay — muted set imperatively + play() kicked on mount /
  // loadedmetadata / canplay + a one-time first-interaction fallback, so it
  // loops with NO play button on iOS too.
  useEffect(() => {
    if (!near) return;
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;
    video.setAttribute("muted", "");
    video.load();
    const tryPlay = () => {
      void video.play?.().catch(() => {});
    };
    tryPlay();
    video.addEventListener("loadedmetadata", tryPlay);
    video.addEventListener("canplay", tryPlay);
    const goEvents = ["touchstart", "pointerdown", "click", "scroll", "keydown"] as const;
    for (const ev of goEvents) window.addEventListener(ev, tryPlay, { passive: true });
    return () => {
      video.removeEventListener("loadedmetadata", tryPlay);
      video.removeEventListener("canplay", tryPlay);
      for (const ev of goEvents) window.removeEventListener(ev, tryPlay);
    };
  }, [near]);

  if (reduceMotion) return null;

  return (
    <section
      aria-label="From the garden to the galaxy — the order beneath all things"
      className="relative z-30 w-full"
    >
      <figure ref={ref} className="relative m-0 w-full">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -inset-y-8 -z-10"
          style={{
            background:
              "radial-gradient(70% 75% at 50% 50%, rgba(201,120,68,0.10) 0%, rgba(9,7,13,0) 72%)",
          }}
        />
        <div className="relative w-full overflow-hidden bg-transparent h-[clamp(440px,68svh,1040px)] 2xl:h-[clamp(520px,74svh,1180px)]">
          {near && (
            <video
              ref={(el) => {
                videoRef.current = el;
                if (el) {
                  el.defaultMuted = true;
                  el.muted = true;
                }
              }}
              className="absolute inset-0 h-full w-full object-cover"
              poster={asset("/video/poster-garden-galaxy-v3.webp")}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
              }}
            >
              <source src={asset("/video/garden-galaxy-v3.webm")} type="video/webm" />
              <source src={asset("/video/garden-galaxy-v3.mp4")} type="video/mp4" />
            </video>
          )}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(135% 135% at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.28) 100%)",
            }}
          />
        </div>
      </figure>
    </section>
  );
};

// One canonical section wrapper — same container, same measure, at every beat.
// This is the whole game: identical geometry section-to-section is what reads
// as "designed". Sections pass ONLY their content; never their own spacing.
const SECTION =
  "relative mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[2360px] 4xl:max-w-[3300px] px-4 sm:px-6 md:px-8 lg:px-12";
// The centred reading measure for running prose, shared by every essay beat.
const MEASURE = "mx-auto max-w-[760px] 2xl:max-w-[860px] 3xl:max-w-[1080px] 4xl:max-w-[1240px]";
// The centred measure for a section h2, so titles wrap identically everywhere.
const TITLE_MEASURE = "mx-auto max-w-[1100px] 2xl:max-w-[1320px] 3xl:max-w-[1560px]";

export const Welcome = () => {
  const reduceMotion = useReducedMotion();
  const { formatPretty: fmtPrice } = useCurrency();

  // A fresh random six on every home-page mount (Fisher–Yates on a copy so the
  // shared PAINTINGS array is never mutated); stable across re-renders within a
  // mount. Lazy initialiser = the React-sanctioned spot for a one-time draw.
  const [featuredPicks] = useState<{ id: string; colourway?: string }[]>(() => {
    const pool = [...PAINTINGS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 6).map((p) => {
      const avail = p.colourways.filter((c) => c.available);
      return {
        id: p.id,
        colourway: avail[Math.floor(Math.random() * avail.length)]?.name,
      };
    });
  });
  const featured = featuredPicks
    .map((pick) => {
      const painting = PAINTINGS.find((p) => p.id === pick.id);
      if (!painting) return null;
      const avail = painting.colourways.filter((c) => c.available);
      const cover =
        (pick.colourway ? avail.find((c) => c.name === pick.colourway) : undefined) ??
        avail.find((c) => c.isOriginal) ??
        avail[0] ??
        painting.colourways[0];
      return { painting, cover };
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  // Reminder passage, VERBATIM from content.ts. [0..2] read as the lead body;
  // [3]'s first two sentences are lifted to the peak pull-quote (remainder falls
  // to body); [4] is the two-tier close. No paragraph is re-typed or lost.
  const reminder = WELCOME.reminderLong;
  const [peakLead, peakConfirm] = reminder[3].split(". ");
  const peakRemainder = reminder[3].split(". ").slice(2).join(". ");
  const [closeLead, ...closeRest] = reminder[4].split(". ");
  const closeTail = closeRest.join(". ");

  return (
    <>
      <Seo
        title="Mandala & Sacred Geometry Art Prints — The Art of Stephen Meakin"
        description="Estate-stamped giclée prints of British mandala artist Stephen Meakin's sacred-geometry paintings. Made to order in London — free delivery worldwide."
      />
      <Nav overlay />

      {/* ── MASTHEAD · THE EARTH OPEN ────────────────────────────────────────
          Owner-defended: full-viewport Earth limb pinned to the top curving
          down into the page, the "THE SEM EXPERIENCE" wordmark reading below it.
          Preserved verbatim — its mask math + svh caps are load-bearing. */}
      <section
        className="relative z-20 isolate w-full overflow-hidden flex flex-col items-center min-h-0 justify-end portrait:pt-[clamp(11rem,55vw,20rem)] portrait:pb-[clamp(20px,3svh,44px)] landscape:min-h-[clamp(600px,66svh,672px)] landscape:pt-[max(6rem,10svh)] landscape:pb-[clamp(24px,3.5svh,44px)]"
        aria-label="The SEM Experience"
      >
        {/* Earth limb, top-pinned + scaleY(-1), black space keyed transparent,
            radial-dissolving into the peacock painting below. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 md:top-[-0.4in] z-[1] overflow-hidden"
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[45%]"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 0%, rgba(201,120,68,0.14) 0%, rgba(201,120,68,0) 72%)",
            }}
          />
          <img
            src={asset("/img/scenes/earth-cutout-v2.webp")}
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="block h-auto select-none w-[156%] ml-[-28%] sm:w-[132%] sm:ml-[-16%] md:w-[92%] md:ml-[4%]"
            style={{
              display: "block",
              maxWidth: "none",
              height: "auto",
              transform: "scaleY(-1)",
              WebkitMaskImage:
                "radial-gradient(82% 135% at 50% 100%, #000 50%, rgba(0,0,0,0.35) 77%, transparent 96%)",
              maskImage:
                "radial-gradient(82% 135% at 50% 100%, #000 50%, rgba(0,0,0,0.35) 77%, transparent 96%)",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[2360px] 4xl:max-w-[3300px] px-4 sm:px-6 md:px-8 lg:px-12 text-center">
          <Reveal delay={0}>
            <div className="font-display m-0">
              {reduceMotion ? (
                <span
                  className="block text-balance"
                  style={{
                    fontVariationSettings: '"opsz" 48, "wght" 700',
                    fontWeight: 700,
                    fontSize: "min(clamp(52px, 13.5vw, 248px), 27svh)",
                    letterSpacing: "-0.035em",
                    lineHeight: 0.86,
                    textTransform: "uppercase",
                    overflowWrap: "normal",
                    wordBreak: "keep-all",
                    color: "#ede6d6",
                    textShadow:
                      "0 0 1px rgba(8,6,12,0.9), 0 1px 3px rgba(8,6,12,0.8), 0 3px 14px rgba(8,6,12,0.5)",
                  }}
                >
                  The SEM Experience
                </span>
              ) : (
                <span
                  className="block text-balance"
                  style={{
                    fontVariationSettings: '"opsz" 48, "wght" 700',
                    fontWeight: 700,
                    fontSize: "min(clamp(52px, 13.5vw, 248px), 27svh)",
                    letterSpacing: "-0.035em",
                    lineHeight: 0.86,
                    textTransform: "uppercase",
                    overflowWrap: "normal",
                    wordBreak: "keep-all",
                    color: "#ede6d6",
                    textShadow:
                      "0 0 1px rgba(8,6,12,0.9), 0 1px 3px rgba(8,6,12,0.8), 0 3px 14px rgba(8,6,12,0.5)",
                  }}
                >
                  {["The", "SEM", "Experience"].map((word, i) => (
                    <span
                      key={word}
                      className="masthead-word"
                      style={{ animationDelay: `${0.15 + i * 0.1}s` }}
                    >
                      {word}
                      {i < 2 ? " " : ""}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <div id="welcome-anchor" className="relative">
        {/* Shared peacock tapestry backdrop (also on About). Indigo holds the
            hero; Mary Pink holds the close. */}
        <PavoBackdrop
          fit="cover"
          fades={[
            [0.16, 0.24],
            [0.36, 0.44],
            [0.56, 0.64],
            [0.76, 0.84],
          ]}
        />

        {/* ONE vertical rhythm for the whole page. Every gap between beats is
            this space-y and nothing else — generous, museum-grade, identical
            top-to-bottom. Sections carry no spacing of their own. */}
        <main className="relative isolate z-10 space-y-24 md:space-y-32 lg:space-y-40 pt-10 md:pt-14 pb-8 md:pb-10">
          {/* 1 · HERO — Stephen's iconic opening line, centred, the studio photo
              contained beneath it, then the one film. */}
          <section className={cn(SECTION, "overflow-hidden")}>
            <Reveal as="div" className="text-center">
              <h1 className="font-display tracking-[-0.03em] text-ink m-0 mx-auto text-balance hero-text-shadow">
                {/* Stephen's opening line — clearly SUBORDINATE to the masthead
                    wordmark above it, so the top of the page has one dominant
                    voice, not two giants competing. */}
                <span
                  className="block"
                  style={heroDisplay("clamp(36px,5.4vw,96px)", 1.0)}
                >
                  So here we are on Earth
                </span>
                <span className="block font-normal italic text-[clamp(22px,3.2vw,44px)] leading-[1.1] mt-4 md:mt-5 text-ink/95">
                  &mdash; orbiting a Sun Star at about 67,062 miles an hour.
                </span>
              </h1>
              <div className="mt-8 md:mt-10 flex flex-wrap items-center justify-center gap-3">
                <MagneticLink
                  to="/collections"
                  className="press group inline-flex w-fit items-center bg-ink text-bg px-7 py-3.5 font-sans text-[14px] font-bold tracking-[0.02em] rounded-full transition-colors duration-300 hover:bg-accent hover:text-ink whitespace-nowrap"
                  ariaLabel="See the collection"
                >
                  See the collection{" "}
                  <span
                    aria-hidden="true"
                    className="ml-2 inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-x-1"
                  >
                    &rarr;
                  </span>
                </MagneticLink>
                <MagneticLink
                  to="/about"
                  className="press inline-flex w-fit items-center justify-center text-ink border border-[rgba(237,230,214,0.35)] px-7 py-3.5 font-sans text-[14px] font-bold tracking-[0.02em] rounded-full transition-colors duration-300 hover:border-accent hover:text-accent whitespace-nowrap"
                  ariaLabel="About Stephen"
                >
                  His story
                </MagneticLink>
              </div>
            </Reveal>

            <Reveal as="figure" className="m-0 mt-12 md:mt-16 mx-auto w-full max-w-[1000px] 3xl:max-w-[1160px]">
              <ImageReveal
                src="/img/welcome/01-painting-wild-rose.jpg"
                alt="Stephen Meakin painting Wild Rose at his studio desk, beside a large circular wall mandala"
                eager
                aspect="aspect-[3/2]"
                edges="none"
                parallax={0}
                zoom={1}
                objectPosition="center"
                shadow="shadow-[0_40px_110px_rgba(0,0,0,0.55)]"
                sizes="(min-width: 1400px) 1000px, 92vw"
              />
            </Reveal>
          </section>

          {/* THE ONE FILM — garden→galaxy, full-bleed cinematic band. */}
          <CosmicInterlude />

          {/* 2 · A REMINDER — Hugo's five-paragraph passage VERBATIM, as a calm
              centred essay with a single display peak and a two-tier close. */}
          <section className={SECTION}>
            <Reveal as="header" className="text-center mb-8 md:mb-10">
              <p className={cn(EYEBROW, "m-0 mb-3")}>A reminder</p>
              <h2 className={cn(TITLE, TITLE_MEASURE, "my-0 text-center hero-text-shadow")}>
                Everything ordinary is extraordinary.
              </h2>
            </Reveal>

            {/* Lead body — paragraphs [0..2], centred reading measure. */}
            <Reveal as="div" className={cn(MEASURE, "text-center space-y-5 md:space-y-6")}>
              {reminder.slice(0, 3).map((para) => (
                <p key={para.slice(0, 24)} lang="en-GB" className={cn(SUBTITLE, "reading-shadow m-0")}>
                  {para}
                </p>
              ))}
            </Reveal>

            {/* The peak — [3]'s opening two sentences, the section's emotional
                high point, sharing the hero display voice. */}
            <Reveal delay={0.05} className="my-14 md:my-20 text-center">
              <blockquote className="m-0 hero-text-shadow">
                <span
                  className="block mx-auto font-display text-ink max-w-[20ch]"
                  style={heroDisplay("clamp(38px,6vw,96px)", 0.96)}
                >
                  {peakLead}.
                </span>
                <span
                  className="block mx-auto font-display font-normal italic text-ink/90 mt-4 md:mt-6"
                  style={{
                    fontVariationSettings: '"opsz" 40, "wght" 400',
                    fontWeight: 400,
                    fontSize: "clamp(26px,5vw,56px)",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                  }}
                >
                  {peakConfirm}
                  <span className="not-italic">.</span>
                </span>
              </blockquote>
            </Reveal>

            {/* Remainder of [3], centred body. */}
            <Reveal as="div" className={cn(MEASURE, "text-center")}>
              <p lang="en-GB" className={cn(SUBTITLE, "reading-shadow m-0")}>
                {peakRemainder}
              </p>
            </Reveal>

            {/* Close — [4], two-tier, the one rust period. */}
            <Reveal delay={0.1} className="mt-14 md:mt-20 text-center">
              <div aria-hidden="true" className="mx-auto mb-6 md:mb-8 h-px w-16 bg-ink/20" />
              <p className={cn(TITLE_MEASURE, "m-0 text-center hero-text-shadow")}>
                <span
                  className="block font-display text-ink text-balance mx-auto"
                  style={heroDisplay("clamp(38px,6vw,84px)", 1.02)}
                >
                  {closeLead}
                  <span className="text-accent">.</span>
                </span>
                {closeTail && (
                  <span
                    className="block font-display font-normal italic text-ink-muted text-balance mx-auto mt-4 md:mt-6"
                    style={{
                      fontVariationSettings: '"opsz" 36, "wght" 400',
                      fontWeight: 400,
                      fontSize: "clamp(24px,4vw,44px)",
                      letterSpacing: "-0.015em",
                      lineHeight: 1.2,
                    }}
                  >
                    {closeTail}
                  </span>
                )}
              </p>
            </Reveal>
          </section>

          {/* 3 · MEET STEPHEN — centred: portrait, then invocation + title +
              bio. (Was an off-axis 42% grid; now on the page's spine.) */}
          <section className={SECTION}>
            <Reveal as="div" className="mx-auto max-w-[900px] text-center">
              <figure className="relative m-0 mx-auto w-full max-w-[440px] aspect-[4/5] overflow-hidden rounded-[3px] ring-1 ring-line">
                <ImageReveal
                  src="/img/welcome/02-portrait-denim.jpg"
                  alt="Stephen Meakin"
                  fill
                  edges="none"
                  parallax={0}
                  objectPosition="center 32%"
                  shadow=""
                />
              </figure>
              <p className={cn(EYEBROW, "m-0 mt-8 mb-3")}>{WELCOME.invocation}</p>
              <h2 className={cn(TITLE, TITLE_MEASURE, "my-0 text-center hero-text-shadow")}>
                Mandala artist and sacred geometer.
              </h2>
              <div className={cn(MEASURE, "mt-6 md:mt-8 space-y-5 md:space-y-6")}>
                <p className={cn(SUBTITLE, "reading-shadow m-0")}>{WELCOME.bio[0]}</p>
                <p className={cn(SUBTITLE, "reading-shadow m-0")}>{WELCOME.bio[1]}</p>
              </div>
            </Reveal>
          </section>

          {/* 4 · FEATURED WORKS — the 3×2 grid, with the archive statement as a
              quiet centred coda. */}
          <section className={SECTION}>
            <Reveal as="div" className="text-center mb-10 md:mb-12">
              <p className={cn(EYEBROW, "m-0 mb-3")}>From the hand</p>
              <h2 className={cn(TITLE, TITLE_MEASURE, "my-0 text-center hero-text-shadow")}>
                Six paintings from a lifetime at the compass.
              </h2>
            </Reveal>

            <Reveal as="div" className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-8 md:gap-x-6 md:gap-y-10">
              {featured.map(({ painting, cover }) => {
                const hasYear = painting.year && painting.year !== "[ DATE ]";
                const fromPrice = getLowestTierPricePence(painting);
                return (
                  <Link
                    key={painting.id}
                    to={`/collections/${painting.id}?c=${encodeURIComponent(cover.name)}`}
                    aria-label={`${painting.title}${hasYear ? `, ${painting.year}` : ""} — from ${fmtPrice(fromPrice)}`}
                    className="group block min-w-0"
                  >
                    <div className="relative aspect-square overflow-hidden bg-ink/5 ring-1 ring-line transition-[box-shadow] duration-500 group-hover:ring-accent/50">
                      <AssetImage
                        src={cover.image}
                        alt={paintingImageAlt(painting.title, cover.name)}
                        loading="lazy"
                        decoding="async"
                        sizes="(min-width: 1400px) 420px, (min-width: 640px) 30vw, 90vw"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    <div className="pt-4 border-t border-line">
                      <h3 className="font-display font-bold text-[18px] md:text-[22px] 2xl:text-[26px] 3xl:text-[30px] tracking-[-0.015em] text-ink m-0 leading-[1.2] group-hover:text-accent transition-colors duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)]">
                        {painting.title}
                      </h3>
                      {hasYear && (
                        <p className={cn(EYEBROW_TIGHT, "tracking-[0.02em] m-0 mt-2")}>{painting.year}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </Reveal>

            {/* Archive coda — one quiet line + the single filled CTA repeat as a
                text link. */}
            <Reveal as="div" className="text-center mt-12 md:mt-16">
              <p
                className="font-display text-ink text-balance mx-auto max-w-[24ch] hero-text-shadow"
                style={heroDisplay("clamp(28px,3.4vw,52px)", 1.06)}
              >
                {WELCOME.archiveStatement.headline}
              </p>
              <p className={cn(SUBTITLE, MEASURE, "reading-shadow mt-5 md:mt-6")}>
                {WELCOME.archiveStatement.body[0]}
              </p>
              <div className="mt-8">
                <MagneticLink
                  to="/collections"
                  className="press group inline-flex items-center gap-2 font-sans text-[14px] font-bold tracking-[0.02em] text-ink transition-colors duration-300 hover:text-accent"
                  ariaLabel="See the collection"
                >
                  See the collection{" "}
                  <span
                    aria-hidden="true"
                    className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </MagneticLink>
              </div>
            </Reveal>
          </section>

          {/* 5 · THE MAKING — the craft island (owner-defended) with the
              hand-finished edition folded in as its commercial close. */}
          <section className={SECTION}>
            <div className="relative overflow-hidden rounded-[22px] md:rounded-[32px] bg-[rgba(12,10,9,0.72)] ring-1 ring-line shadow-[0_50px_140px_-40px_rgba(0,0,0,0.85)] px-6 sm:px-10 md:px-12 lg:px-16 py-12 md:py-16 lg:py-20">
              <Reveal as="div" className="text-center mb-10 md:mb-12">
                <p className={cn(EYEBROW, "m-0 mb-3")}>The making</p>
                <h2 className={cn(TITLE, "my-0 max-w-[860px] 2xl:max-w-[1060px] 3xl:max-w-[1240px] mx-auto text-center hero-text-shadow")}>
                  Each painting is a ritual.
                </h2>
              </Reveal>

              <Reveal as="div" className="flex flex-col gap-10 lg:gap-12">
                <figure className="relative m-0 w-full overflow-hidden rounded-[16px] md:rounded-[20px] ring-1 ring-line aspect-[16/10] sm:aspect-[3/2]">
                  <AssetImage
                    src="/img/welcome/steve-and-collaborator-painting-v1.jpg"
                    alt="Stephen Meakin and a collaborator hand-finishing a large blue-and-gold mandala together at the studio table, the garden beyond the open doors"
                    loading="lazy"
                    decoding="async"
                    sizes="(min-width: 1024px) 1140px, 100vw"
                    className="absolute inset-0 block w-full h-full object-cover object-center"
                  />
                </figure>

                <div className={cn(MEASURE, "flex flex-col gap-y-5 md:gap-y-6 text-center")}>
                  <p className={cn(SUBTITLE, "reading-shadow m-0")}>
                    Each canvas was hand-stretched on a deep wooden frame and painted over
                    hundreds of hours. Stephen began every work with compass and rule,
                    constructing the underlying sacred geometry before a single colour was
                    laid down.
                  </p>
                  <p className={cn(SUBTITLE, "reading-shadow m-0")}>
                    When a painting depicted a flower, the oil pressed from that flower went
                    into the paint itself — the <em>Mandala of Wild Rose</em> contains the
                    rose. Each composition carries its own number, rhythm, cadence and tone.
                  </p>
                </div>

                <ul className="list-none p-0 m-0 mx-auto w-full max-w-[1080px] grid grid-cols-1 sm:grid-cols-2 gap-x-10 md:gap-x-16">
                  {[
                    ["Time", "Hundreds of hours per canvas"],
                    ["Edition", "Individually made to order"],
                    ["Surface", "350gsm archival canvas"],
                    ["Frame", "Hand-stretched, deep wooden"],
                    ["Tools", "Compass · rule · brush"],
                    ["Pigment", "Hand-pressed oils + pigment inks"],
                  ].map(([label, value]) => (
                    <li
                      key={label}
                      className="m-0 flex items-baseline justify-between gap-6 py-2.5 border-t border-line"
                    >
                      <span className={cn(EYEBROW_TIGHT, "shrink-0 uppercase")}>{label}</span>
                      <span className="text-right font-sans font-normal text-[15px] md:text-[16px] leading-[1.4] text-ink">
                        {value}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Hand-finished edition — the highest-margin add-on, folded in
                    as the craft section's commercial close (was its own beat). */}
                <div className="mx-auto w-full max-w-[860px] text-center border-t border-line pt-10 md:pt-12">
                  <p className={cn(EYEBROW, "m-0 mb-3")}>The hand-finished edition</p>
                  <h3
                    className="font-display font-semibold tracking-[-0.02em] text-[clamp(24px,2.4vw,40px)] leading-[1.12] text-ink text-balance hero-text-shadow m-0 mb-4"
                    style={{ fontVariationSettings: '"opsz" 40, "wght" 600' }}
                  >
                    Take a print further — finished by hand.
                  </h3>
                  <p className={cn(SUBTITLE, "reading-shadow m-0 mx-auto max-w-[56ch]")}>
                    {EMBELLISHMENT_NOTE}
                  </p>
                  <div className="mt-8 flex flex-col items-center gap-3">
                    <MagneticLink
                      to="/collections"
                      className="press group inline-flex items-center gap-2 rounded-full bg-ink text-bg px-7 py-3.5 font-sans text-[14px] font-bold tracking-[0.02em] transition-colors duration-300 hover:bg-accent hover:text-ink"
                      ariaLabel="Choose a print to hand-finish"
                    >
                      Choose a print to finish
                      <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-0.5">
                        →
                      </span>
                    </MagneticLink>
                    <span className="font-sans text-[clamp(13px,0.8vw,15px)] tracking-[0.02em] text-ink-muted">
                      From £595 · on the Collector &amp; Atelier prints · allow 2 weeks
                    </span>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* 6 · SACRED GEOMETRY — the four traditions as an editorial index. */}
          <section className={SECTION}>
            <Reveal as="div" className="text-center mb-10 md:mb-12">
              <p className={cn(EYEBROW, "m-0 mb-3")}>Sacred Geometry</p>
              <h2 className={cn(TITLE, TITLE_MEASURE, "my-0 text-center hero-text-shadow")}>
                Four traditions, one language.
              </h2>
            </Reveal>

            <Reveal as="ul" className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 md:gap-x-12 gap-y-6 md:gap-y-7 list-none p-0 mb-10 md:mb-12">
              {[
                { tag: "I", name: "Insular Island Arts", note: "Celtic interlace, illuminated manuscript" },
                { tag: "II", name: "Rose Windows", note: "The great cathedrals of medieval Europe" },
                { tag: "III", name: "Persian Geometry", note: "Tessellation, girih, the courts of Isfahan" },
                { tag: "IV", name: "Tibetan Mandala", note: "Sacred diagram, meditation, visual henosis" },
              ].map((item) => (
                <li
                  key={item.tag}
                  className="group m-0 border-t border-line pt-4 md:pt-5 transition-colors duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:border-accent"
                >
                  <p
                    className="font-display text-ink text-[clamp(22px,2.6vw,36px)] tracking-[-0.02em] leading-[1.1] m-0 mb-2 transition-colors duration-300 group-hover:text-accent"
                    style={{ fontVariationSettings: '"opsz" 48, "wght" 700', fontWeight: 700 }}
                  >
                    {item.name}
                  </p>
                  <p className="font-sans font-normal text-[14px] leading-[1.5] text-ink/70 m-0">
                    {item.note}
                  </p>
                </li>
              ))}
            </Reveal>

            <Reveal>
              <p className={cn(SUBTITLE, MEASURE, "reading-shadow my-0 text-center")}>{WELCOME.bio[1]}</p>
            </Reveal>
          </section>

          {/* 7 · ARISTA SUNSTAR — the flagship commission, one still, centred. */}
          <section className={SECTION}>
            <Reveal as="div" className="text-center mb-8 md:mb-10">
              <p className={cn(EYEBROW, "m-0 mb-3")}>Arista SunStar · 2016</p>
              <h2 className={cn(TITLE, TITLE_MEASURE, "my-0 text-center hero-text-shadow")}>
                A 3.6&#8209;metre commission for Notting Hill.
              </h2>
              <p className="font-sans text-[13px] font-bold tracking-[0.02em] text-ink/70 m-0 mt-4">
                Diameter 3.6m <span className="text-ink/35 mx-1">·</span> Commissioned 2016
              </p>
            </Reveal>

            <Reveal as="figure" className="relative m-0 mx-auto w-full max-w-[620px] md:max-w-[840px] 2xl:max-w-[920px]">
              <div className="overflow-hidden rounded-[3px] ring-1 ring-line">
                <AssetImage
                  src="/img/welcome/05-arista-sunstar-v3.jpg"
                  alt="Stephen standing beside the full 3.6-metre Arista SunStar painting at the Farmacy restaurant, Notting Hill"
                  loading="lazy"
                  decoding="async"
                  className="block w-full h-auto"
                />
              </div>
              <figcaption className="font-sans text-[13px] md:text-[14px] font-bold tracking-[0.02em] text-ink/80 mt-4 text-center">
                Farmacy · Notting Hill · London
              </figcaption>
            </Reveal>

            <Reveal as="div" className={cn(MEASURE, "text-center mt-8 md:mt-10")}>
              <p className={cn(SUBTITLE, "reading-shadow m-0")}>{WELCOME.bio[2]}</p>
            </Reveal>
          </section>

          {/* 8 · IN MEMORIAM — the remembrance close, reading just above the
              mirrored Earth. The page opens on his words and lands on his name. */}
          <section className={SECTION}>
            <Reveal as="div" className="text-center">
              <p className={cn(EYEBROW, "m-0 mb-4")}>In loving memory</p>
              <h2
                className="font-display text-ink text-balance mx-auto max-w-[16ch] hero-text-shadow"
                style={heroDisplay("clamp(40px,6.4vw,92px)", 1.0)}
              >
                Stephen Meakin
              </h2>
              <p className="font-sans text-[14px] md:text-[15px] font-bold tracking-[0.06em] uppercase text-ink-muted m-0 mt-5">
                {LIFE_DATES}
              </p>
              <p className="font-display italic text-ink/85 text-[clamp(20px,2.2vw+8px,34px)] leading-[1.35] m-0 mt-8 mx-auto max-w-[26ch] hero-text-shadow">
                Everything is connected.
              </p>
              <div className="mt-9">
                <MagneticLink
                  to="/about"
                  className="press group inline-flex items-center gap-2 font-sans text-[14px] font-bold tracking-[0.02em] text-ink transition-colors duration-300 hover:text-accent"
                  ariaLabel="Explore his life and work"
                >
                  Explore his life{" "}
                  <span
                    aria-hidden="true"
                    className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </MagneticLink>
              </div>
            </Reveal>
          </section>

          {/* ── THE EARTH CLOSE ────────────────────────────────────────────────
              Owner-defended mirror of the masthead: the same Earth asset, natural
              orientation, curving UP from the foot to butt flush against the
              footer. "As above, so below." Preserved verbatim. */}
          <section
            aria-hidden="true"
            className="relative z-20 isolate w-full overflow-hidden !mt-[clamp(64px,9vh,150px)] !-mb-8 md:!-mb-10"
          >
            <img
              src={asset("/img/scenes/earth-cutout-v2.webp")}
              alt=""
              loading="lazy"
              decoding="async"
              className="relative z-[1] block h-auto select-none w-[156%] ml-[-28%] sm:w-[132%] sm:ml-[-16%] md:w-[112%] md:ml-[-6%]"
              style={{
                maxWidth: "none",
                height: "auto",
                WebkitMaskImage:
                  "radial-gradient(135% 150% at 50% 100%, #000 66%, rgba(0,0,0,0.32) 88%, transparent 100%)",
                maskImage:
                  "radial-gradient(135% 150% at 50% 100%, #000 66%, rgba(0,0,0,0.32) 88%, transparent 100%)",
              }}
            />
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};
