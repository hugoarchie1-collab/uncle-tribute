import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { VideoIntro } from "../components/VideoIntro";
import { Nav } from "../components/Nav";
import { Logo } from "../components/Logo";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { ImageReveal } from "../components/ImageReveal";
import { AssetImage } from "../components/AssetImage";
import { MagneticLink } from "../components/MagneticLink";
import { EYEBROW } from "../components/ui/tokens";
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
// Three Peacock colourways crossfade on page-scroll. Moroccan Purple closes
// the page — it holds through the Sacred Geometry finale (Hugo's direction:
// revert the brief Mary-Pink close back to the extended purple).
const PEACOCK_BACKDROPS = [
  { url: "/img/paintings/peacock-persian-indigo-blur.webp", name: "Persian Indigo" },
  { url: "/img/paintings/peacock-blood-moon-red-blur.webp", name: "Blood Moon Red" },
  { url: "/img/paintings/peacock-moroccan-purple-blur.webp", name: "Moroccan Purple" },
];

export const Welcome = () => {
  usePageTitle();
  const reduceMotion = useReducedMotion();

  // Whole-page scroll drives three peacock backdrops crossfading in turn:
  // Indigo → Blood-Moon Red → Moroccan Purple, the purple holding through the
  // Sacred Geometry finale so its sky matches the rest of the home.
  const { scrollYProgress } = useScroll();
  const indigoOpacity = useTransform(scrollYProgress, [0, 0.05, 0.30, 0.42], [0, 1, 1, 0]);
  const redOpacity = useTransform(scrollYProgress, [0.30, 0.42, 0.60, 0.72], [0, 1, 1, 0]);
  const purpleOpacity = useTransform(scrollYProgress, [0.60, 0.72, 0.97, 1], [0, 1, 1, 1]);
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
          {/* Tight seam between the intro film and the hero. On PORTRAIT phones
              the film is a short 16:9 card (not full-height), so a large top
              pad here reads as a dead black band directly under the video (the
              reported gap). The clamp now starts SMALL (~18px on a phone) and
              only opens up via the vw term on wider screens where the film is
              full-height and the hero sits a full scroll below. The fixed Nav
              always floats over the film at the very top, never over the hero,
              so the hero needs no nav-clearance padding of its own. */}
          <section
            className="mx-auto max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[1840px] px-4 sm:px-6 md:px-8 lg:px-12 pb-16 md:pb-24"
            style={{ paddingTop: "clamp(1.125rem, 5vw, 6rem)" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 md:items-center">
              <Reveal as="div" className="md:col-span-5">
                <h1 className="font-display tracking-[-0.045em] text-ink m-0 mb-8 text-balance hero-text-shadow">
                  <span className="block font-semibold text-[clamp(46px,6.2vw,132px)] leading-[1.0]">
                    So here we are on Earth
                  </span>
                  <span className="block font-normal italic text-[clamp(36px,5.6vw,76px)] leading-[1.15] sm:leading-[1.05] mt-4 sm:mt-3 text-ink/90">
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
              </Reveal>
              <Reveal as="figure" className="m-0 md:col-span-7 max-w-[440px] sm:max-w-[520px] md:max-w-none mx-auto md:mx-0">
                {/* Source 01-painting-wild-rose.jpg is 1200x800 (3:2 landscape).
                    The photo LEADS the hero, so it takes the wider 7-of-12
                    column and a slightly taller aspect-[4/3] for real presence
                    (the old 3:2 in a 6-col half left it floating small in a
                    half-empty column). aspect-[4/3] + object-cover trims only
                    the sacrificial outer edges — far-left brass stand, right
                    wall margin — at center object-position; Stephen and the
                    wall mandala stay framed and undistorted. soft-edge mask +
                    gentle parallax preserved by ImageReveal. */}
                <ImageReveal
                  src="/img/welcome/01-painting-wild-rose.jpg"
                  alt="Wild Rose — from the Habundia collection"
                  eager
                  aspect="aspect-[4/3]"
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
          <section className="mx-auto max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[1840px] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-16">
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
              aspect="aspect-[3/2]"
              edges="y"
              parallax={0.18}
              shadow=""
            />
          </Reveal>

          {/* 4 · FEATURED WORKS — 3×2 grid of signature paintings */}
          <section className="mx-auto max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[1840px] px-4 md:px-8 lg:px-12 py-8 md:py-12">
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
            <Reveal as="div" className="flex flex-wrap justify-center gap-5 md:gap-7 mb-12 md:mb-14">
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
                    className="group block min-w-0 flex-[0_1_clamp(132px,30%,420px)]"
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

          {/* 5 · CRAFT — Each painting is a ritual (scrim card) */}
          <section className="mx-auto max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[1840px] px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-12">
            <div className="relative bg-[rgba(10,9,8,0.88)] px-6 sm:px-8 md:px-12 lg:px-16 py-10 md:py-14 ring-1 ring-white/8">
              <Reveal as="div" className="text-center mb-10 md:mb-14">
                <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(36px,5.4vw,96px)] leading-[0.98] text-ink my-0 max-w-[860px] mx-auto text-balance hero-text-shadow">
                  Each painting is a ritual.
                </h2>
                <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.8] text-ink/85 my-0 mt-7 max-w-[680px] mx-auto">
                  Each canvas hand-stretched, primed, and painted over hundreds of hours — compass, rule and brush translating sacred geometry into a singular visual language.
                </p>
              </Reveal>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
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
                  <p className="font-sans font-normal text-[16px] md:text-[18px] leading-[1.8] text-ink m-0">
                    Each canvas was hand-stretched on a deep wooden frame and painted over hundreds of hours. Stephen began every work with compass and rule, constructing the underlying sacred geometry before a single colour was laid down.
                  </p>
                  <p className="font-sans font-normal text-[16px] md:text-[18px] leading-[1.8] text-ink m-0">
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

          {/* 6 · SACRED GEOMETRY — 4-card grid of traditions */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1760px] px-4 md:px-8 lg:px-12 py-8 md:py-12">
            <Reveal as="div" className="text-center mb-10 md:mb-12">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                Sacred Geometry
              </p>
              <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(32px,4.4vw,76px)] leading-[0.98] text-ink my-0 max-w-[820px] mx-auto text-balance">
                Four traditions, one language.
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
              <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/85 max-w-[820px] mx-auto my-0 text-center">
                {WELCOME.bio[1]}
              </p>
            </Reveal>
          </section>

          {/* 7 · ARISTA SUNSTAR — text left, smaller framed image right.
              Single section (no longer split). Image is intentionally
              contained inside a dark mat + ring frame because the source
              photograph is low-res, and the frame lifts it into a
              gallery object instead of a stretched full-bleed. */}
          <section className="mx-auto max-w-[1280px] 2xl:max-w-[1480px] 3xl:max-w-[1720px] px-4 md:px-8 lg:px-12 py-8 md:py-12">
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

          {/* 8 · SACRED GEOMETRY — the closing statement.

              Redesigned (Hugo's direction, supersedes the 2026-06-02 bold
              banner + the gotcha-#7 history): the screen-filling 100svh banner
              read "long, massive and tedious" with a dead gap above it, so this
              is now a COMPACT, brand-led editorial close in the register the
              best closing sections use (Apple / luxury houses): the rose emblem
              anchors the section, then a refined — not gigantic — statement,
              Stephen's verbatim line, and a quiet door into the shop. Normal
              section padding (no min-h-100svh, no items-center → the huge gap is
              gone). The Earth limb + rust glow were removed to declutter ("looks
              messy"); the section rides the extended purple peacock sky with a
              soft local scrim for legibility. Statement is opsz 40 / wght 600 at
              a CAPPED size (≤60px) so it stays clean, never the opsz/large
              "scribble". isolate + overflow-hidden retained (gotcha #8);
              whole-element Reveals only (gotcha #2). */}
          <section
            className="relative isolate w-full overflow-hidden py-20 md:py-28"
            aria-label="Sacred Geometry"
          >
            {/* Soft local scrim so the cream type holds on the purple sky. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                background:
                  "radial-gradient(78% 68% at 50% 50%, rgba(10,9,8,0.62) 0%, rgba(10,9,8,0.28) 64%, rgba(10,9,8,0) 100%)",
              }}
            />

            <div className="relative z-10 mx-auto w-full max-w-[820px] px-6 text-center">
              {/* Brand mark — the rose emblem anchors the close. */}
              <Reveal delay={0}>
                <div className="flex justify-center mb-8">
                  <Logo size={54} wordmark={false} />
                </div>
              </Reveal>

              <Reveal delay={0.06}>
                <p className={`${EYEBROW} m-0 mb-6`}>
                  The thread through every piece
                </p>
              </Reveal>

              <Reveal delay={0.12}>
                <h2
                  className="font-display text-balance m-0"
                  style={{
                    // opsz 40 / wght 600 — confident but clean; capped at 60px so
                    // it reads as one composed statement, never a viewport banner.
                    fontVariationSettings: '"opsz" 40, "wght" 600',
                    fontWeight: 600,
                    fontSize: "clamp(30px, 4.6vw, 60px)",
                    letterSpacing: "-0.022em",
                    lineHeight: 1.08,
                    color: "#ede6d6",
                    textShadow: "0 1px 24px rgba(10,9,8,0.6)",
                  }}
                >
                  Sacred{" "}
                  <em
                    style={{
                      fontStyle: "italic",
                      fontVariationSettings: '"opsz" 40, "wght" 600',
                      fontWeight: 600,
                    }}
                  >
                    geometry
                  </em>{" "}
                  &mdash; the order beneath all things
                  <span style={{ color: "#c97844" }}>.</span>
                </h2>
              </Reveal>

              {/* Hairline rule — one breath between the estate's statement
                  and Stephen's own voice. */}
              <Reveal delay={0.18}>
                <div aria-hidden="true" className="mx-auto my-8 h-px w-12 bg-ink/15" />
              </Reveal>

              {/* Stephen's voice — VERBATIM register. His documented words are
                  "everything is connected" (content.ts MEMORIAL_QUOTE); never
                  an invented near-quote. True Fraunces italic, opsz 24. */}
              <Reveal delay={0.24}>
                <p
                  className="font-display text-ink-muted text-balance m-0 mb-8"
                  style={{
                    fontStyle: "italic",
                    fontVariationSettings: '"opsz" 24, "wght" 400',
                    fontSize: "clamp(17px, 2.1vw, 21px)",
                    lineHeight: 1.5,
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

              {/* Quiet exit — a text link, never a pill. */}
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
