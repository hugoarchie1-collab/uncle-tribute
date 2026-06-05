import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { VideoIntro } from "../components/VideoIntro";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { ImageReveal } from "../components/ImageReveal";
import { AssetImage } from "../components/AssetImage";
import { MagneticLink } from "../components/MagneticLink";
import { WELCOME } from "../data/content";
import { PAINTINGS, COLLECTIONS, formatGBP, getLowestTierPricePence } from "../data/paintings";
import { asset } from "../lib/asset";
import { cn } from "../lib/cn";
import { EYEBROW } from "../components/ui/tokens";
import { usePageTitle } from "../lib/usePageTitle";

// Four Peacock colourways used as the home page's seamlessly-blending
// backdrop layer (yellow removed — text was unreadable against it).
// Pre-blurred 800px JPGs (~17KB each) — blur / saturate / brightness
// baked into the file offline, zero runtime filter cost.
// Pre-blurred WebP backdrops (~7-12KB each) — even smaller than the JPG
// originals while keeping identical visual softness baked into the file.
// Four Peacock colourways crossfade on page-scroll. Moroccan Purple closes
// the page — it holds through the Sacred Geometry finale (Hugo's direction:
// revert the brief Mary-Pink close back to the extended purple).
const PEACOCK_BACKDROPS = [
  { url: "/img/paintings/peacock-persian-indigo-blur.webp", name: "Persian Indigo" },
  { url: "/img/paintings/peacock-blood-moon-red-blur.webp", name: "Blood Moon Red" },
  { url: "/img/paintings/peacock-moroccan-purple-blur.webp", name: "Moroccan Purple" },
  // Mary Pink closes the page — the newest colourway, carried into the Sacred
  // Geometry finale so its backdrop blends seamlessly with the rest of the home.
  { url: "/img/paintings/peacock-mary-pink-blur-v4.webp", name: "Mary Pink" },
];

export const Welcome = () => {
  usePageTitle();
  const reduceMotion = useReducedMotion();

  // Whole-page scroll drives three peacock backdrops crossfading in turn:
  // Indigo → Blood-Moon Red → Moroccan Purple, the purple holding through the
  // Sacred Geometry finale so its sky matches the rest of the home.
  const { scrollYProgress } = useScroll();
  const indigoOpacity = useTransform(scrollYProgress, [0, 0.05, 0.22, 0.30], [0, 1, 1, 0]);
  const redOpacity = useTransform(scrollYProgress, [0.22, 0.30, 0.46, 0.54], [0, 1, 1, 0]);
  const purpleOpacity = useTransform(scrollYProgress, [0.46, 0.54, 0.72, 0.80], [0, 1, 1, 0]);
  const maryPinkOpacity = useTransform(scrollYProgress, [0.72, 0.80, 0.97, 1], [0, 1, 1, 1]);
  const backdropOpacities = [indigoOpacity, redOpacity, purpleOpacity, maryPinkOpacity];

  // Six featured paintings shown in a 3×2 grid, mirroring the
  // Aiya/Marconi Dribbble "Latest creations crafted by hand" layout.
  const featuredPicks: { id: string; colourway?: string }[] = [
    { id: "peacock-minerva", colourway: "Blood Moon Red" },
    { id: "ophiuchus" },
    { id: "enneagon-swans", colourway: "Glacier Blue" },
    { id: "tridecagon-moon-star", colourway: "Supernova Violet" },
    { id: "wild-rose" },
    { id: "english-bluebells" },
  ];
  const featured = featuredPicks
    .map((pick) => {
      const painting = PAINTINGS.find((p) => p.id === pick.id);
      if (!painting) return null;
      const cover = pick.colourway
        ? painting.colourways.find((c) => c.name === pick.colourway) ?? painting.colourways[0]
        : painting.colourways.find((c) => c.isOriginal) ?? painting.colourways[0];
      return { painting, cover };
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <>
      {/* Nav overlays the intro video (fixed) so the logo + links stay pinned
          to the top of the screen from the very first frame — and remain there
          when scrolling back up from anywhere on the page. Every other page
          uses the in-flow sticky Nav. */}
      <Nav overlay />
      <VideoIntro />

      <div id="welcome-anchor" className="relative">
        {/* PEACOCK BACKDROP LAYER — four colourways crossfading on
            page-scroll, identical blur/saturation/brightness recipe to
            the Collections ScrollBackdrop. Sits behind all content. */}
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
                // Promote to its own GPU layer so the scroll-driven crossfade
                // composites the (pre-blurred) image instead of repainting it.
                // translateZ(0) forces a composited layer so iOS doesn't
                // re-rasterise the fixed cover bitmap every scroll frame.
                willChange: "opacity",
                transform: "translateZ(0)",
              }}
            />
          ))}
          {/* Shared scrim — identical to Collections.tsx so the backdrop
              shows through at the same visibility level. */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(75% 60% at 50% 35%, rgba(10,9,8,0.5) 0%, rgba(10,9,8,0.2) 100%)",
            }}
          />
        </div>

        <main className="relative isolate z-10">
          {/* 1 · HERO — Kaya-inspired composition:
              text LEFT (two-style headline, body, CTAs),
              image RIGHT, well-framed and uncropped. */}
          {/* Tight seam between the intro film and the hero. On PORTRAIT phones
              the film is a short 16:9 card (not full-height), so a large top
              pad here reads as a dead black band directly under the video (the
              reported gap). The clamp now starts SMALL (~18px on a phone) and
              only opens up via the vw term on wider screens where the film is
              full-height and the hero sits a full scroll below. The fixed Nav
              always floats over the film at the very top, never over the hero,
              so the hero needs no nav-clearance padding of its own. */}
          {/* 1 · HERO — cinematic right-bleed. The studio photo fills the
              right ~55% of the viewport at full height, bleeding to the screen
              edge for real scale; the headline floats out of its dark-melted
              inner edge on the left. Landscape composition preserved
              (object-cover center on a wide box — only the sacrificial outer
              margins trim). Stacks to text-then-image below md. */}
          <section className="relative isolate w-full overflow-hidden">
            {/* DESKTOP/TABLET — image bleeding to the right edge. Reined in
                2026-06-03 (Hugo: "images way too big, take up the entire
                screen") — the parallel session's full-viewport bleed was the
                screen-filling culprit; width + section height trimmed so it's
                a strong framed photo, not an edge-to-edge wall. */}
            <figure className="m-0 hidden md:block absolute top-1/2 right-0 -translate-y-1/2 h-[62svh] w-[54%] lg:w-[52%]">
              <ImageReveal
                src="/img/welcome/01-painting-wild-rose.jpg"
                alt="Stephen Meakin painting Wild Rose at his studio desk, beside a large circular wall mandala"
                eager
                fill
                edges="y"
                parallax={0.1}
                objectPosition="center"
                shadow=""
              />
              {/* Inner-left melt — the photo dissolves into the page so the
                  headline reads cleanly over its left edge (no hard seam). */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-1/2"
                style={{
                  background:
                    "linear-gradient(to right, #0a0908 0%, rgba(10,9,8,0.82) 26%, rgba(10,9,8,0.30) 64%, rgba(10,9,8,0) 100%)",
                }}
              />
              {/* One warm seam where type meets photo. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
                style={{
                  background:
                    "linear-gradient(to right, rgba(201,120,68,0.12) 0%, rgba(201,120,68,0) 72%)",
                }}
              />
            </figure>

            {/* Text column — vertically centred in a tall cinematic frame. */}
            <div
              className="relative z-10 mx-auto flex max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] items-center px-4 sm:px-6 md:px-8 lg:px-12 pb-16 md:min-h-[56svh] md:pb-0"
              style={{ paddingTop: "clamp(1.125rem, 5vw, 6rem)" }}
            >
              <Reveal as="div" className="w-full md:max-w-[48%] lg:max-w-[46%]">
                <h1 className="font-display tracking-[-0.045em] text-ink m-0 mb-8 text-balance hero-text-shadow">
                  <span className="block font-semibold text-[clamp(46px,6.2vw,132px)] leading-[1.0]">
                    So here we are on Earth
                  </span>
                  <span className="block font-normal italic text-[clamp(36px,5.6vw,76px)] leading-[1.15] sm:leading-[1.05] mt-4 sm:mt-3 text-ink/90">
                    — orbiting a Sun Star at about 67,062 miles an hour.
                  </span>
                </h1>

                {/* Hero is headline + CTAs only (Hugo: delete the top reminder
                    line — the reminder lives once, in the "A reminder" section
                    below). */}
                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <MagneticLink
                    to="/collections"
                    className="inline-flex w-fit items-center bg-ink text-bg px-6 py-3.5 font-sans text-[11px] font-bold tracking-[0.16em] uppercase rounded-full transition-colors duration-300 hover:bg-accent hover:text-ink whitespace-nowrap"
                    ariaLabel="See the collection"
                  >
                    See the collection <span aria-hidden="true" className="ml-2">→</span>
                  </MagneticLink>
                  <MagneticLink
                    to="/about"
                    className="inline-flex w-fit items-center text-ink ring-1 ring-ink/30 px-6 py-3.5 font-sans text-[11px] font-bold tracking-[0.16em] uppercase rounded-full transition-all duration-300 hover:ring-accent hover:text-accent whitespace-nowrap"
                    ariaLabel="About Stephen"
                  >
                    Our story
                  </MagneticLink>
                </div>

                {/* MOBILE image — below the copy, full landscape, soft-edged. */}
                <Reveal as="figure" className="m-0 mt-10 md:hidden max-w-[560px]">
                  <ImageReveal
                    src="/img/welcome/01-painting-wild-rose.jpg"
                    alt="Stephen Meakin painting Wild Rose at his studio desk, beside a large circular wall mandala"
                    eager
                    aspect="aspect-[4/3]"
                    edges="all"
                    parallax={0.12}
                    objectPosition="center"
                    shadow="shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
                  />
                </Reveal>
              </Reveal>
            </div>
          </section>

          {/* 2 · A REMINDER — the hero carries only a tight lead; here Hugo's
              full five-paragraph passage runs VERBATIM as a bold editorial
              spread (mapped from WELCOME.reminderLong so nothing is re-typed).
              P1 leads large; P2–P4 settle into a balanced two-column measure on
              lg+ so it reads as a designed essay on a 4K screen, not a lonely
              phone-width ribbon; P5 lands after a hairline as a two-tier
              Fraunces close echoing the Sacred Geometry finale, its closing
              period the one rust note. Over the shared peacock backdrop like
              every section (no opaque card — gotcha); hero-text-shadow for
              legibility; Fraunces opsz held ≤48 (finale invariant); whole-
              element Reveals only (gotcha #2). */}
          <section className="relative isolate mx-auto w-full max-w-[820px] 2xl:max-w-[960px] 3xl:max-w-[1040px] px-4 sm:px-6 md:px-8 lg:px-12 py-20 md:py-28 lg:py-32">
            <Reveal as="header" className="mx-auto max-w-[820px] mb-8 md:mb-10">
              <p className={cn(EYEBROW, "m-0 mb-6")}>A reminder</p>
              <p className="font-display font-normal tracking-[-0.012em] text-[clamp(24px,3vw,42px)] leading-[1.28] text-ink m-0 text-balance hero-text-shadow">
                {WELCOME.reminderLong[0]}
              </p>
            </Reveal>

            {/* P2–P4 — one flowing reading column (Hugo: keep the passage together
                as the "first part", not split into stiff columns). */}
            <Reveal as="div" className="mx-auto max-w-[820px] flex flex-col gap-6 md:gap-7">
              {WELCOME.reminderLong.slice(1, 4).map((para) => (
                <p
                  key={para.slice(0, 24)}
                  className="font-sans font-normal text-[18px] md:text-[20px] 2xl:text-[22px] leading-[1.8] text-ink/85 m-0"
                >
                  {para}
                </p>
              ))}
            </Reveal>

            {/* Closing premise (P5), VERBATIM — pulled out as a two-tier
                Fraunces close: a dominant first sentence above a smaller
                subordinate clause, the closing rust period the one accent note.
                Split at the single ". " boundary in reminderLong[4]; both halves
                stay verbatim. */}
            <Reveal delay={0.1}>
              <div aria-hidden="true" className="mt-12 md:mt-16 mb-8 md:mb-10 h-px w-12 bg-ink/15" />
              <p className="m-0 mx-auto max-w-[820px] hero-text-shadow">
                <span
                  className="block font-display text-ink text-balance"
                  style={{
                    fontVariationSettings: '"opsz" 48, "wght" 600',
                    fontWeight: 600,
                    fontSize: "clamp(28px, 4.6vw, 64px)",
                    letterSpacing: "-0.03em",
                    lineHeight: 1.02,
                  }}
                >
                  {WELCOME.reminderLong[4].split(". ")[0]}
                  <span className="text-accent">.</span>
                </span>
                <span
                  className="block font-display font-normal italic text-ink-muted text-balance mt-3 md:mt-4"
                  style={{
                    fontVariationSettings: '"opsz" 36, "wght" 400',
                    fontWeight: 400,
                    fontSize: "clamp(18px, 2.4vw, 32px)",
                    letterSpacing: "-0.015em",
                    lineHeight: 1.2,
                  }}
                >
                  {WELCOME.reminderLong[4].split(". ").slice(1).join(". ")}
                </span>
              </p>
            </Reveal>
          </section>

          {/* 3 · MEET STEPHEN — cinematic LEFT-bleed, mirroring the hero's
              right-bleed for an alternating rhythm. The portrait fills the
              left ~44% of the viewport at full height, bleeding to the screen
              edge; the invocation + bio sit to the right, melting out of the
              photo's inner edge. Stacks to portrait-then-text below md. */}
          <section className="relative isolate w-full overflow-hidden">
            {/* DESKTOP/TABLET — portrait bleeding to the LEFT edge. Reined in
                2026-06-03 (Hugo: images too big) to match the trimmed hero —
                a contained framed portrait, not a full-viewport takeover. */}
            <figure className="m-0 hidden md:block absolute inset-y-0 left-0 w-[44%] lg:w-[42%]">
              <ImageReveal
                src="/img/welcome/02-portrait-denim.jpg"
                alt="Stephen Meakin"
                fill
                edges="y"
                parallax={0.1}
                objectPosition="center 35%"
                shadow=""
              />
              {/* Inner-right melt — the portrait dissolves into the page so the
                  text reads cleanly over its right edge (no hard seam). */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
                style={{
                  background:
                    "linear-gradient(to left, #0a0908 0%, rgba(10,9,8,0.82) 26%, rgba(10,9,8,0.30) 64%, rgba(10,9,8,0) 100%)",
                }}
              />
            </figure>

            {/* Text column — right of the portrait, vertically centred. */}
            <div className="relative z-10 mx-auto flex max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] items-center justify-end px-4 sm:px-6 md:px-8 lg:px-12 py-12 md:min-h-[54svh] md:py-0">
              <Reveal as="div" className="w-full md:max-w-[50%] lg:max-w-[46%]">
                {/* MOBILE portrait — above the copy. */}
                <figure className="m-0 mb-8 md:hidden max-w-[460px]">
                  <ImageReveal
                    src="/img/welcome/02-portrait-denim.jpg"
                    alt="Stephen Meakin"
                    aspect="aspect-[4/5]"
                    edges="all"
                    parallax={0.12}
                    objectPosition="center"
                    shadow="shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
                  />
                </figure>
                <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                  {WELCOME.invocation}
                </p>
                <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(30px,4.4vw,64px)] leading-[1.02] text-ink m-0 mb-6">
                  The art of Stephen Meakin — mandala artist and sacred geometer.
                </h2>
                <p className="font-sans font-normal text-[17px] md:text-[18px] 2xl:text-[20px] leading-[1.7] text-ink/85 m-0">
                  {WELCOME.bio[0]}
                </p>
              </Reveal>
            </div>
          </section>

          {/* 4 · STUDIO — full-bleed cinematic break. Letterboxed shorter on
              wide screens (lg+) so a 3:2 frame doesn't fill an entire 4K
              viewport top-to-bottom (Hugo: "some images are way too big"). */}
          <Reveal as="figure" className="m-0 w-full py-12 md:py-16 lg:py-20">
            <ImageReveal
              src="/img/welcome/03-painting-in-studio.jpg"
              alt="Stephen painting in the studio"
              aspect="aspect-[3/2] md:aspect-[2/1] 2xl:aspect-[5/2]"
              edges="y"
              parallax={0.18}
              shadow=""
            />
          </Reveal>

          {/* 5 · FEATURED WORKS — 3×2 grid of signature paintings */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 py-14 md:py-20 lg:py-24">
            <Reveal as="div" className="text-center mb-10 md:mb-12">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                From the hand
              </p>
              <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(32px,4.4vw,76px)] leading-[0.98] text-ink my-0 max-w-[820px] mx-auto text-balance">
                Six paintings from a lifetime at the compass.
              </h2>
            </Reveal>
            {/* Orphan-centring pattern: flex-wrap + justify-center, each card
                flex:0 1 clamp(MIN,BASIS,MAX). With 6 picks this matches the old
                2-up (mobile) / 3-up (desktop) rhythm, but if the featured count
                ever becomes odd / not a multiple of the column count, the
                leftover tile(s) centre on the last row at every breakpoint
                instead of left-aligning. min-w-0 on each card stops a long
                title token from widening the row past the viewport. */}
            <Reveal as="div" className="flex flex-wrap justify-center gap-4 md:gap-6 mb-12 md:mb-14">
              {featured.map(({ painting, cover }) => {
                const collectionTitle = COLLECTIONS.find((c) => c.id === painting.collection)?.title.split(" — ")[0] ?? "";
                const hasYear = painting.year && painting.year !== "[ DATE ]";
                const fromPrice = getLowestTierPricePence(painting);
                return (
                  <Link
                    key={painting.id}
                    // Carry the colourway shown on THIS card through to the
                    // detail page (?c=…) so clicking e.g. the Blood Moon Red
                    // peacock lands on that exact colourway, not the original.
                    to={`/collections/${painting.id}?c=${encodeURIComponent(cover.name)}`}
                    className="group block min-w-0 flex-[0_1_clamp(280px,30%,420px)]"
                  >
                    <div className="relative aspect-square overflow-hidden bg-ink/5 ring-1 ring-white/8 transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
                      <AssetImage
                        src={cover.image}
                        alt={`${painting.title} — ${cover.name}`}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                      />
                      {/* Price chip — scroll-revealed (visible on mobile,
                          where there's no hover, and on desktop as soon as
                          the tile enters view). Advertises the LOWEST visible
                          tier (A3 Gallery £245) to lower the click barrier —
                          the £450 anchor still converts on the product page. */}
                      <motion.span
                        aria-hidden="true"
                        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{
                          duration: 0.55,
                          delay: 0.15,
                          ease: [0.22, 0.61, 0.36, 1],
                        }}
                        className="absolute bottom-3 right-3 inline-flex items-center bg-[#0a0908]/85 backdrop-blur-sm px-3 py-1.5 font-sans text-[10px] font-bold tracking-[0.18em] uppercase text-ink rounded-full"
                      >
                        From {formatGBP(fromPrice).replace(".00", "")}
                      </motion.span>
                    </div>
                    <div className="pt-5">
                      <h3 className="font-display font-bold text-[16px] md:text-[18px] tracking-[-0.015em] text-ink m-0 leading-[1.25] group-hover:text-accent transition-colors duration-300">
                        {painting.title}
                      </h3>
                      <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/55 mt-2 m-0">
                        {hasYear ? painting.year : collectionTitle}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </Reveal>

            <Reveal as="div" className="text-center">
              <MagneticLink
                to="/collections"
                className="inline-flex items-center gap-2 ring-1 ring-ink/40 px-7 py-3.5 font-sans text-[11px] font-bold tracking-[0.18em] uppercase rounded-full text-ink transition-all duration-300 hover:ring-accent hover:text-accent"
                ariaLabel="See every painting"
              >
                See every painting <span aria-hidden="true" className="ml-1">↗</span>
              </MagneticLink>
            </Reveal>
          </section>

          {/* 6 · CRAFT — Each painting is a ritual.
              REFINED CONTAINER (Hugo 2026-06-03): this dense section (heading +
              intro + image + two paragraphs + a 6-item materials grid) needs a
              container or the text reads "all over the place" over the busy
              backdrop. The original hard, sharp, near-opaque black rectangle
              (`bg-[rgba(10,9,8,0.88)]` + square corners) was the "isn't smooth"
              problem — removing it entirely was an over-correction. This is the
              right answer: a premium frosted-glass panel — generous rounding,
              a translucent dark fill that lets the blurred mandala glow
              through, a hairline luminous border, and a soft ambient shadow
              that lifts it off the page (Apple/Stripe register). */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 py-14 md:py-20 lg:py-24">
            <div className="relative overflow-hidden rounded-[24px] md:rounded-[32px] bg-[rgba(12,10,9,0.9)] ring-1 ring-white/10 shadow-[0_50px_140px_-40px_rgba(0,0,0,0.85)] px-6 sm:px-8 md:px-10 lg:px-14 py-14 md:py-20 lg:py-24">
              <Reveal as="div" className="text-center mb-10 md:mb-14">
                <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(36px,5.4vw,96px)] leading-[0.98] text-ink my-0 max-w-[860px] mx-auto text-balance hero-text-shadow">
                  Each painting is a ritual.
                </h2>
                <p className="font-sans font-normal text-[17px] md:text-[18px] 2xl:text-[20px] leading-[1.8] text-ink/85 my-0 mt-7 max-w-[720px] mx-auto">
                  Each canvas hand-stretched, primed, and painted over hundreds of hours — compass, rule and brush translating sacred geometry into a singular visual language.
                </p>
              </Reveal>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
                <Reveal as="figure" className="m-0 md:col-span-6 max-w-[400px] sm:max-w-[460px] md:max-w-[480px] xl:max-w-[540px] 2xl:max-w-[600px] mx-auto md:mx-0">
                  <ImageReveal
                    src="/img/about/02-painting-table.jpg"
                    alt="Stephen at his drafting table, drawing the underlying geometry"
                    aspect="aspect-[4/5]"
                    edges="all"
                    parallax={0.1}
                  />
                </Reveal>

                <Reveal as="div" className="md:col-span-6 flex flex-col gap-6">
                  <p className="font-sans font-normal text-[17px] md:text-[18px] 2xl:text-[20px] leading-[1.8] text-ink m-0">
                    Each canvas was hand-stretched on a deep wooden frame and painted over hundreds of hours. Stephen began every work with compass and rule, constructing the underlying sacred geometry before a single colour was laid down.
                  </p>
                  <p className="font-sans font-normal text-[17px] md:text-[18px] 2xl:text-[20px] leading-[1.8] text-ink m-0">
                    When a painting depicted a flower, the oil pressed from that flower went into the paint itself — the <em>Mandala of Wild Rose</em> contains the rose. Each composition carries its own number, rhythm, cadence and tone.
                  </p>
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-5 list-none p-0 mt-2">
                    {/* Provenance-card hierarchy: Time + Edition lead as
                        bold-italic display lines (the headline facts a
                        collector wants), then the supporting material spec
                        follows in the original eyebrow + body register. */}
                    {[
                      ["Time", "Hundreds of hours per canvas", true],
                      ["Edition", "Individually made to order", true],
                      ["Surface", "350gsm archival canvas", false],
                      ["Frame", "Hand-stretched, deep wooden", false],
                      ["Tools", "Compass · rule · brush", false],
                      ["Pigment", "Hand-pressed oils + pigment inks", false],
                    ].map(([label, value, lead]) => (
                      <li key={label as string} className="m-0">
                        <p className="font-sans text-[11px] font-bold tracking-[0.28em] uppercase text-ink/65 m-0 mb-1.5">{label}</p>
                        {lead ? (
                          <p className="font-display font-bold italic tracking-[-0.01em] text-[16px] md:text-[18px] leading-[1.35] text-ink m-0">{value}</p>
                        ) : (
                          <p className="font-sans font-normal text-[15px] leading-[1.5] text-ink m-0">{value}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </div>
            </div>
          </section>

          {/* 7 · SACRED GEOMETRY — 4-card grid of traditions */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 py-14 md:py-20 lg:py-24">
            <Reveal as="div" className="text-center mb-10 md:mb-12">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                Sacred Geometry
              </p>
              <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(32px,4.4vw,76px)] leading-[0.98] text-ink my-0 max-w-[820px] mx-auto text-balance">
                Four traditions, one language.
              </h2>
            </Reveal>

            <Reveal as="ul" className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 list-none p-0 mb-10 md:mb-14">
              {[
                { tag: "I", name: "Insular Island Arts", note: "Celtic interlace, illuminated manuscript" },
                { tag: "II", name: "Rose Windows", note: "The great cathedrals of medieval Europe" },
                { tag: "III", name: "Persian Geometry", note: "Tessellation, girih, the courts of Isfahan" },
                { tag: "IV", name: "Tibetan Mandala", note: "Sacred diagram, meditation, visual henosis" },
              ].map((item) => (
                <li
                  key={item.tag}
                  className="bg-bg-soft ring-1 ring-white/8 p-6 md:p-7 transition-all duration-500 hover:ring-accent/50 hover:-translate-y-1"
                >
                  <p className="font-display font-bold text-ink/45 text-[clamp(32px,3.4vw,44px)] leading-none m-0 mb-4 tracking-tight">
                    {item.tag}
                  </p>
                  <p className="font-sans text-[14px] font-bold tracking-tight text-ink m-0 mb-2 leading-[1.25]">
                    {item.name}
                  </p>
                  <p className="font-sans font-normal text-[13px] leading-[1.5] text-ink/65 m-0">
                    {item.note}
                  </p>
                </li>
              ))}
            </Reveal>

            <Reveal>
              <p className="font-sans font-normal text-[17px] md:text-[18px] 2xl:text-[20px] leading-[1.75] text-ink/85 max-w-[860px] mx-auto my-0 text-center">
                {WELCOME.bio[1]}
              </p>
            </Reveal>
          </section>

          {/* 8 · ARISTA SUNSTAR — text left, smaller framed image right.
              Single section (no longer split). Image is intentionally
              contained inside a dark mat + ring frame because the source
              photograph is low-res, and the frame lifts it into a
              gallery object instead of a stretched full-bleed. */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 py-14 md:py-20 lg:py-24">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14 items-center">
              <Reveal as="div" className="md:col-span-7">
                <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-5">
                  Arista SunStar · 2016
                </p>
                <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(30px,3.8vw,52px)] leading-[1.08] text-ink m-0 mb-5">
                  A 3.6&#8209;metre commission for Notting Hill.
                </h2>
                {/* Key-fact strip — surfaces the commission's
                    provenance up front instead of burying it in prose. */}
                <p className="font-sans text-[11px] font-bold tracking-[0.28em] uppercase text-ink/70 m-0 mb-6">
                  Diameter 3.6m <span className="text-ink/35 mx-1">·</span> Commissioned 2016
                </p>
                <p className="font-sans font-normal text-[17px] md:text-[18px] 2xl:text-[20px] leading-[1.75] text-ink/85 m-0">
                  {WELCOME.bio[2]}
                </p>
              </Reveal>
              <Reveal as="figure" className="m-0 md:col-span-5 max-w-[460px] md:max-w-none mx-auto md:mx-0">
                <div className="bg-[rgba(20,18,15,0.92)] p-3 md:p-4 ring-1 ring-white/10 shadow-[0_28px_70px_rgba(0,0,0,0.6)]">
                  <AssetImage
                    src="/img/welcome/05-arista-sunstar.jpg"
                    alt="Stephen beside the 3.6-metre Arista SunStar at the Farmacy restaurant, Notting Hill"
                    loading="lazy"
                    decoding="async"
                    className="block w-full h-auto"
                  />
                </div>
                <figcaption className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/55 mt-4 text-center">
                  Farmacy · Notting Hill · London
                </figcaption>
                <p className="font-display italic text-[12px] leading-[1.55] text-ink/45 mt-2 text-center">
                  Photograph from Stephen's archive, c. 2016.
                </p>
              </Reveal>
            </div>
          </section>

          {/* 9 · SACRED GEOMETRY — the bold closing statement.

              The confident, screen-filling editorial close. The headline is
              large and bold in a TRUE Fraunces 700 (loaded; never synthesised
              now that font-synthesis is off) at a CONTROLLED optical size
              (opsz 48 — even, heavy strokes; never the opsz-144 hairline
              "scribble"). Background is JUST the home's own peacock backdrop,
              closing on the MARY PINK colourway (the fixed crossfade layer
              behind the page) — same dusty-rose treatment as every other
              section. Updated 2026-06-03 (Hugo): the green Earth limb + rust
              horizon glow were removed so the finale shows ONLY the pink
              backdrop, matching the rest of the home (supersedes the Earth
              invariants in gotcha #7). Stephen's words stay verbatim. Section
              fills the viewport (min-h-100svh) with the content centered;
              isolate + overflow-hidden retained (gotcha #8). */}
          <section
            className="relative isolate flex min-h-[72svh] md:min-h-[80svh] w-full items-center overflow-hidden py-16 md:py-24 lg:py-28"
            aria-label="Sacred Geometry"
          >

            {/* Earth REMOVED 2026-06-05 (Hugo: the realistic blue Earth on the
                rose sky clashed badly). The finale is now JUST the clean pink
                backdrop + the statement — consistent with every other section.
                A real blue/green planet cannot sit on a pink sky without
                fighting it, so the Earth is gone rather than tinted. */}

            {/* Content column — centered flow. Layer order: pink backdrop
                (z-0, the shared fixed peacock layer) →
                content (z-10). No dark scrim. Whole-element Reveals (gotcha #2). */}
            <div className="relative z-10 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 text-center py-8 md:py-12">
              {/* The statement is the HERO of the close — the biggest thing on
                  the page (Hugo's direction). No eyebrow competes above it.
                  True Fraunces 700 at a controlled opsz 48 so strokes stay clean
                  even at this scale (opsz is the dial, not the size — opsz ≤48
                  avoids the hairline "scribble"). */}
              <Reveal delay={0}>
                <h2 className="font-display m-0">
                  {/* "Sacred geometry" — the DOMINANT title, the biggest type on
                      the page (Hugo: it must be larger than the clause beneath).
                      opsz 48 keeps the strokes clean at this scale. */}
                  <span
                    className="block text-balance"
                    style={{
                      fontVariationSettings: '"opsz" 48, "wght" 700',
                      fontWeight: 700,
                      fontSize: "clamp(58px, 15vw, 232px)",
                      letterSpacing: "-0.04em",
                      lineHeight: 0.86,
                      color: "#ede6d6",
                      textShadow: "0 2px 50px rgba(10,9,8,0.8)",
                    }}
                  >
                    Sacred{" "}
                    <em
                      style={{
                        fontStyle: "italic",
                        fontVariationSettings: '"opsz" 48, "wght" 600',
                        fontWeight: 600,
                      }}
                    >
                      geometry
                    </em>
                  </span>
                  {/* "— the order beneath all things." — the SUBORDINATE clause,
                      deliberately a fraction of the title size. */}
                  <span
                    className="block text-balance"
                    style={{
                      fontVariationSettings: '"opsz" 36, "wght" 600',
                      fontWeight: 600,
                      fontSize: "clamp(22px, 3.6vw, 58px)",
                      letterSpacing: "-0.015em",
                      lineHeight: 1.08,
                      color: "#ede6d6",
                      marginTop: "clamp(10px, 1.5vw, 28px)",
                      textShadow: "0 1px 24px rgba(10,9,8,0.7)",
                    }}
                  >
                    &mdash; the order beneath all things
                    <span style={{ color: "#c97844" }}>.</span>
                  </span>
                </h2>
              </Reveal>

              {/* Hairline rule — one breath between the estate's statement
                  and Stephen's own voice. */}
              <Reveal delay={0.16}>
                <div aria-hidden="true" className="mx-auto my-10 h-px w-12 bg-ink/15" />
              </Reveal>

              {/* Stephen's voice — VERBATIM register. His documented words are
                  "everything is connected" (content.ts MEMORIAL_QUOTE); never
                  an invented near-quote. True Fraunces italic, opsz 24. */}
              <Reveal delay={0.22}>
                <p
                  className="font-display text-ink text-balance m-0 mb-8"
                  style={{
                    fontStyle: "italic",
                    fontVariationSettings: '"opsz" 24, "wght" 400',
                    fontSize: "clamp(18px, 2.2vw, 22px)",
                    lineHeight: 1.5,
                    textShadow: "0 1px 20px rgba(10,9,8,0.55)",
                  }}
                >
                  &ldquo;I realised that everything is connected.&rdquo;
                  <span
                    style={{ fontStyle: "normal" }}
                    className="font-sans text-[11px] tracking-[0.32em] uppercase text-ink-muted ml-3 align-middle"
                  >
                    SEM
                  </span>
                </p>
              </Reveal>

              {/* Quiet exit — a text link, never a pill. The colophon ends on a
                  soft door into the shop. */}
              <Reveal delay={0.3}>
                <Link
                  to="/collections"
                  className="font-sans text-[11px] font-bold tracking-[0.16em] uppercase text-ink-muted transition-colors hover:text-accent"
                >
                  Explore the collection{" "}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </Reveal>
            </div>
          </section>
        </main>

        <FooterCatalogue />
        <Footer />
      </div>
    </>
  );
};
