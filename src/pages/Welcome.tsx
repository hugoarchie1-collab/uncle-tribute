import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { VideoIntro } from "../components/VideoIntro";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { ImageReveal } from "../components/ImageReveal";
import { AssetImage } from "../components/AssetImage";
import { EnquireModal } from "../components/EnquireModal";
import { MagneticLink } from "../components/MagneticLink";
import { NewsletterSignup } from "../components/NewsletterSignup";
import { WELCOME } from "../data/content";
import { PAINTINGS, COLLECTIONS, formatGBP, getLowestTierPricePence } from "../data/paintings";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

// Three Peacock colourways used as the home page's seamlessly-blending
// backdrop layer (yellow removed — text was unreadable against it).
// Pre-blurred 800px JPGs (~17KB each) — blur / saturate / brightness
// baked into the file offline, zero runtime filter cost.
// Pre-blurred WebP backdrops (~7-12KB each) — even smaller than the JPG
// originals while keeping identical visual softness baked into the file.
const PEACOCK_BACKDROPS = [
  { url: "/img/paintings/peacock-persian-indigo-blur.webp", name: "Persian Indigo" },
  { url: "/img/paintings/peacock-blood-moon-red-blur.webp", name: "Blood Moon Red" },
  { url: "/img/paintings/peacock-moroccan-purple-blur.webp", name: "Moroccan Purple" },
];

// The Estate engagement cards — same data drives both the card buttons
// and the enquiry modals so the eyebrow / title / subject stay in sync.
// The Estate engagement cards. The Prints card sends buyers straight to
// the Collections page (the actual purchase path is per-painting); the
// Friends card opens the EnquireModal for subscription. Cards with
// `to` route via <Link>, cards with `subject` open the modal.
type EstateCard =
  | {
      id: string;
      eyebrow: string;
      title: string;
      body: string;
      cta: string;
      to: string;
      subject?: undefined;
      intro?: undefined;
    }
  | {
      id: string;
      eyebrow: string;
      title: string;
      body: string;
      cta: string;
      subject: string;
      intro: string;
      to?: undefined;
    };

const estateCards: readonly EstateCard[] = [
  {
    id: "prints",
    eyebrow: "Prints",
    title: "Estate-stamped giclée prints",
    body: "Individually made-to-order giclée prints of every painting, estate-stamped on 350gsm archival paper.",
    cta: "Browse prints",
    to: "/collections",
  },
] as const;

export const Welcome = () => {
  usePageTitle();
  const reduceMotion = useReducedMotion();

  // Which Estate-card modal is currently open (null = closed).
  const [enquireOpen, setEnquireOpen] = useState<string | null>(null);
  // Stable identity — passing a fresh arrow function each render would
  // re-trigger EnquireModal's effect cleanup on every parent re-render
  // (peacock backdrop scroll updates Welcome continually) and reset the
  // form mid-submit.
  const closeEnquire = useCallback(() => setEnquireOpen(null), []);
  const activeCard = estateCards.find((c) => c.id === enquireOpen);

  // Whole-page scroll drives three peacock backdrops crossfading in turn.
  // 0 → 38% Indigo · 33 → 70% Red · 65 → 100% Purple. Stretches the
  // three colours evenly down the page.
  const { scrollYProgress } = useScroll();
  const indigoOpacity = useTransform(scrollYProgress, [0, 0.05, 0.30, 0.40], [0, 1, 1, 0]);
  const redOpacity = useTransform(scrollYProgress, [0.30, 0.40, 0.62, 0.72], [0, 1, 1, 0]);
  const purpleOpacity = useTransform(scrollYProgress, [0.62, 0.72, 0.96, 1], [0, 1, 1, 1]);
  const backdropOpacities = [indigoOpacity, redOpacity, purpleOpacity];

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
                willChange: "opacity",
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
          {/* Top padding clears the now-fixed overlay Nav (it no longer
              reserves layout space), reproducing the gap the in-flow sticky
              nav used to give the hero. */}
          <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 pt-24 md:pt-28 pb-16 md:pb-24">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 md:items-center">
              <Reveal as="div" className="md:col-span-6">
                <h1 className="font-display tracking-[-0.045em] text-ink m-0 mb-8 text-balance hero-text-shadow">
                  <span className="block font-black text-[clamp(46px,7vw,102px)] leading-[0.94]">
                    So here we are on Earth
                  </span>
                  <span className="block font-medium italic text-[clamp(36px,5.6vw,76px)] leading-[1.15] sm:leading-[1.05] mt-3 sm:mt-2 text-ink/90">
                    — orbiting a Sun Star at about 67,062 miles an hour.
                  </span>
                </h1>

                <p className="font-sans font-normal text-[15px] sm:text-[16px] md:text-[17px] leading-[1.75] text-ink/80 m-0 mb-9 max-w-[520px]">
                  {WELCOME.reminder}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <MagneticLink
                    to="/collections"
                    className="inline-flex w-fit items-center bg-ink text-bg px-6 py-3.5 font-sans text-[11px] font-bold tracking-[0.16em] uppercase rounded-full transition-colors duration-300 hover:bg-accent hover:text-ink whitespace-nowrap"
                    ariaLabel="Explore the collections"
                  >
                    Explore collections <span aria-hidden="true" className="ml-2">→</span>
                  </MagneticLink>
                  <MagneticLink
                    to="/about"
                    className="inline-flex w-fit items-center text-ink ring-1 ring-ink/30 px-6 py-3.5 font-sans text-[11px] font-bold tracking-[0.16em] uppercase rounded-full transition-all duration-300 hover:ring-accent hover:text-accent whitespace-nowrap"
                    ariaLabel="About Stephen"
                  >
                    Our story
                  </MagneticLink>
                </div>
              </Reveal>
              <Reveal as="figure" className="m-0 md:col-span-6 max-w-[400px] sm:max-w-[460px] md:max-w-none mx-auto md:mx-0">
                <ImageReveal
                  src="/img/welcome/01-painting-wild-rose.jpg"
                  alt="Wild Rose — from the Habundia collection"
                  eager
                  aspect="aspect-[4/5]"
                  edges="all"
                  parallax={0.12}
                  objectPosition="center"
                  shadow="shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
                />
              </Reveal>
            </div>
          </section>

          {/* 2 · MEET STEPHEN — portrait + invocation + opening bio.
              Same container, gap and items-center alignment as the Hero
              above so the image edges and text column align cleanly with
              the section above instead of stretching to viewport height. */}
          <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-16">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 md:items-center">
              <Reveal as="figure" className="m-0 md:col-span-6 max-w-[400px] sm:max-w-[460px] md:max-w-none mx-auto md:mx-0">
                <ImageReveal
                  src="/img/welcome/02-portrait-denim.jpg"
                  alt="Stephen Meakin"
                  aspect="aspect-[4/5]"
                  edges="all"
                  parallax={0.16}
                  objectPosition="center"
                />
              </Reveal>
              <Reveal as="div" className="md:col-span-6">
                <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                  {WELCOME.invocation}
                </p>
                <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(28px,3.4vw,44px)] leading-[1.02] text-ink m-0 mb-6">
                  The art of Stephen Meakin — mandala artist and sacred geometer.
                </h2>
                <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.7] text-ink/85 m-0">
                  {WELCOME.bio[0]}
                </p>
              </Reveal>
            </div>
          </section>

          {/* 3 · STUDIO — full-bleed cinematic break */}
          <Reveal as="figure" className="m-0 w-full py-3 md:py-5">
            <ImageReveal
              src="/img/welcome/03-painting-in-studio.jpg"
              alt="Stephen painting in the studio"
              className="h-[50vh] md:h-[60vh] w-full"
              edges="y"
              parallax={0.18}
              shadow=""
            />
          </Reveal>

          {/* 4 · FEATURED WORKS — 3×2 grid of signature paintings */}
          <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-8 md:py-12">
            <Reveal as="div" className="text-center mb-10 md:mb-12">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                Selected Works
              </p>
              <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(32px,4.4vw,60px)] leading-[0.98] text-ink m-0 max-w-[820px] mx-auto text-balance">
                Six paintings from a lifetime at the compass.
              </h2>
            </Reveal>
            <Reveal as="div" className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-7 mb-12 md:mb-14">
              {featured.map(({ painting, cover }) => {
                const collectionTitle = COLLECTIONS.find((c) => c.id === painting.collection)?.title.split(" — ")[0] ?? "";
                const hasYear = painting.year && painting.year !== "[ DATE ]";
                const fromPrice = getLowestTierPricePence(painting);
                return (
                  <Link key={painting.id} to={`/collections/${painting.id}`} className="group block">
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
                          tier (A3 Atelier £145) to lower the click barrier —
                          the £295 anchor still converts on the product page. */}
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
                        className="absolute bottom-3 right-3 inline-flex items-center bg-bg/85 backdrop-blur-sm px-3 py-1.5 font-sans text-[10px] font-bold tracking-[0.18em] uppercase text-ink rounded-full"
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
                ariaLabel="View all collections"
              >
                View all collections <span aria-hidden="true" className="ml-1">↗</span>
              </MagneticLink>
            </Reveal>
          </section>

          {/* 5 · CRAFT — Each painting is a ritual (scrim card) */}
          <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-12">
            <div className="relative bg-[rgba(10,9,8,0.88)] px-6 sm:px-8 md:px-12 lg:px-16 py-10 md:py-14 ring-1 ring-white/8">
              <Reveal as="div" className="text-center mb-10 md:mb-14">
                <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(36px,5.4vw,76px)] leading-[0.98] text-ink m-0 max-w-[860px] mx-auto text-balance hero-text-shadow">
                  Each painting is a ritual.
                </h2>
                <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.8] text-ink/85 m-0 mt-7 max-w-[680px] mx-auto">
                  Each canvas hand-stretched, primed, and painted over hundreds of hours — compass, rule and brush translating sacred geometry into a singular visual language.
                </p>
              </Reveal>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
                <Reveal as="figure" className="m-0 md:col-span-6 max-w-[400px] sm:max-w-[460px] md:max-w-none mx-auto md:mx-0">
                  <ImageReveal
                    src="/img/about/02-painting-table.jpg"
                    alt="Stephen at his drafting table, drawing the underlying geometry"
                    aspect="aspect-[4/5]"
                    edges="all"
                    parallax={0.1}
                  />
                </Reveal>

                <Reveal as="div" className="md:col-span-6 flex flex-col gap-6">
                  <p className="font-sans font-normal text-[15.5px] md:text-[16.5px] leading-[1.8] text-ink m-0">
                    Each canvas was hand-stretched on a deep wooden frame and painted over hundreds of hours. Stephen began every work with compass and rule, constructing the underlying sacred geometry before a single colour was laid down.
                  </p>
                  <p className="font-sans font-normal text-[15.5px] md:text-[16.5px] leading-[1.8] text-ink m-0">
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
                        <p className="font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-ink/65 m-0 mb-1.5">{label}</p>
                        {lead ? (
                          <p className="font-display font-bold italic tracking-[-0.01em] text-[15px] md:text-[16px] leading-[1.35] text-ink m-0">{value}</p>
                        ) : (
                          <p className="font-sans font-normal text-[13.5px] leading-[1.5] text-ink m-0">{value}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </div>
            </div>
          </section>

          {/* 6 · SACRED GEOMETRY — 4-card grid of traditions */}
          <section className="mx-auto max-w-[1320px] px-4 md:px-8 lg:px-12 py-8 md:py-12">
            <Reveal as="div" className="text-center mb-10 md:mb-12">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                Sacred Geometry
              </p>
              <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(32px,4.4vw,60px)] leading-[0.98] text-ink m-0 max-w-[820px] mx-auto text-balance">
                Four traditions, woven into one visual language.
              </h2>
            </Reveal>

            <Reveal as="ul" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 list-none p-0 mb-10 md:mb-14">
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
              <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/85 max-w-[820px] mx-auto m-0 text-center">
                {WELCOME.bio[1]}
              </p>
            </Reveal>
          </section>

          {/* 7 · ARISTA SUNSTAR — text left, smaller framed image right.
              Single section (no longer split). Image is intentionally
              contained inside a dark mat + ring frame because the source
              photograph is low-res, and the frame lifts it into a
              gallery object instead of a stretched full-bleed. */}
          <section className="mx-auto max-w-[1280px] px-4 md:px-8 lg:px-12 py-8 md:py-12">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14 items-center">
              <Reveal as="div" className="md:col-span-7">
                <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-5">
                  Arista SunStar · 2016
                </p>
                <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(30px,3.8vw,52px)] leading-[1.0] text-ink m-0 mb-5">
                  A 3.6&#8209;metre commission for Notting Hill.
                </h2>
                {/* Key-fact strip — surfaces the commission's
                    provenance up front instead of burying it in prose. */}
                <p className="font-sans text-[11px] font-bold tracking-[0.28em] uppercase text-ink/70 m-0 mb-6">
                  Diameter 3.6m <span className="text-ink/35 mx-1">·</span> Mixed media on board <span className="text-ink/35 mx-1">·</span> Commissioned 2016
                </p>
                <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/85 m-0">
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

          {/* 8 · THE ESTATE — Prints + Friends engagement cards */}
          <section className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-12">
            <Reveal as="div" className="text-center mb-10 md:mb-14">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                The Estate
              </p>
              <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(28px,4vw,52px)] leading-[1.0] text-ink m-0 max-w-[820px] mx-auto text-balance">
                Continue Stephen's work.
              </h2>
            </Reveal>
            <Reveal as="div" className="mx-auto max-w-[680px] mb-12 md:mb-16">
              {estateCards.map((item) => {
                const cardClass =
                  "group block text-left bg-bg-soft ring-1 ring-white/8 hover:ring-accent/50 transition-all duration-500 hover:-translate-y-1 p-8 md:p-10 focus:outline-none focus-visible:ring-accent";
                const inner = (
                  <>
                    <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-5">
                      {item.eyebrow}
                    </p>
                    <h3 className="font-display font-bold tracking-[-0.025em] text-[clamp(24px,2.4vw,34px)] leading-[1.15] text-ink m-0 mb-4">
                      {item.title}
                    </h3>
                    <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.7] text-ink/80 m-0 mb-8">
                      {item.body}
                    </p>
                    <span className="inline-flex items-center gap-2 font-sans text-[12px] font-bold tracking-[0.22em] uppercase text-ink group-hover:text-accent transition-colors">
                      {item.cta} <span aria-hidden="true">→</span>
                    </span>
                  </>
                );
                if (item.to) {
                  return (
                    <Link key={item.title} to={item.to} className={cardClass}>
                      {inner}
                    </Link>
                  );
                }
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setEnquireOpen(item.id)}
                    className={cardClass}
                  >
                    {inner}
                  </button>
                );
              })}
            </Reveal>

            {/* Friends & Family — quiet newsletter signup, mounted
                below the engagement cards so the estate's "stay in
                touch" funnel sits alongside the Prints + Friends
                CTAs without competing for attention. */}
            <Reveal as="div" className="flex justify-center mt-16 md:mt-20">
              <NewsletterSignup variant="panel" />
            </Reveal>
          </section>

          {/* Single enquiry modal — driven by whichever Estate card is
              currently open. One instance avoids duplicating keydown
              listeners, body-scroll-lock effects, and AnimatePresence
              subtrees per card. */}
          <EnquireModal
            open={activeCard != null}
            onClose={closeEnquire}
            eyebrow={activeCard?.eyebrow ?? ""}
            title={activeCard?.title ?? ""}
            subject={activeCard?.subject ?? ""}
            intro={activeCard?.intro}
          />

          {/* 9 · SACRED GEOMETRY (EARTH) — finale. Text + Earth stacked
              in normal flow so the section auto-sizes to its content
              and adapts cleanly across viewports. Earth is pulled up by
              a negative margin tied to the SAME clamp() the text uses,
              which keeps the overlap at ~25% of the text height on
              every screen — no flood on widescreen, no gap on
              portrait/tablet. Earth's bottom still sits flush above
              the footer's top rule.

              `isolate` forces a stacking context on the section so the
              z-index ordering between the Reveal-wrapped headline and
              the sibling Earth img is locked — without it, Framer
              Motion's per-frame transform on Reveal can briefly
              reorder GPU layers on scroll and flicker the text behind
              the Earth. z-10 sits on the Reveal wrapper itself, not
              on the h2 inside, because the transform on the wrapper
              creates its own stacking context that swallows any
              z-index applied to its children. */}
          <section
            className="relative isolate w-full overflow-hidden"
            aria-label="Sacred Geometry"
          >
            {/* Headline fades up as a whole. The earlier per-character
                SplitReveal wrapped each glyph in `overflow-hidden`,
                which clipped the h2's huge text-shadow into a black
                rectangle per character (the "blocky" artifact). Whole-
                element reveal renders the shadow cleanly. */}
            <Reveal className="relative z-10">
              <h2
                className="font-display font-black tracking-[-0.06em] leading-[0.84] m-0 text-center pt-[4vh] px-2 md:px-4"
                style={{
                  fontSize: "clamp(60px, 20vw, 520px)",
                  color: "#f5ecd6",
                  textShadow:
                    "0 6px 80px rgba(0,0,0,0.9), 0 3px 28px rgba(0,0,0,0.75)",
                }}
              >
                Sacred<br />Geometry<span style={{ color: "#dca84c" }}>.</span>
              </h2>
            </Reveal>

            {/* Earth widens at narrow viewports so its curve still reads
                as a horizon under the smaller mobile headline. Beyond
                the viewport edges is fine — the section's
                overflow-hidden clips the side wings.

                Width coupling per CLAUDE.md gotcha #7: at lg+/xl+ the
                Earth widens (120% / 128%) so the curvature still reads as
                a horizon on wide monitors — previously at 1920px+ the
                112% width rendered as a thin brown band. The negative
                margin is tied to the SAME clamp() as the headline
                font-size so the overlap stays proportional. The
                multiplier (-0.44) is a touch heavier than before to keep
                the horizon flush above the footer once the Earth widens
                at lg+/xl+. If you re-tune width, re-tune the multiplier
                in tandem. */}
            <img
              src={asset("/img/scenes/earth-cutout.png")}
              alt=""
              aria-hidden="true"
              className="relative z-0 block w-[160%] sm:w-[140%] md:w-[120%] lg:w-[120%] xl:w-[128%] max-w-none mx-auto pointer-events-none select-none"
              style={{
                marginTop: "calc(clamp(60px, 20vw, 520px) * -0.44)",
              }}
            />
          </section>
        </main>

        <FooterCatalogue />
        <Footer />
      </div>
    </>
  );
};
