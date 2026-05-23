import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { VideoIntro } from "../components/VideoIntro";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { ImageReveal } from "../components/ImageReveal";
import { MagneticLink } from "../components/MagneticLink";
import { WELCOME, PASSING_DATE } from "../data/content";
import { COLLECTIONS, PAINTINGS } from "../data/paintings";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

// Three Peacock colourways used as the home page's seamlessly-blending
// backdrop layer (yellow removed — text was unreadable against it).
// Pre-blurred 800px JPGs (~17KB each) — blur / saturate / brightness
// baked into the file offline, zero runtime filter cost.
const PEACOCK_BACKDROPS = [
  { url: "/img/paintings/peacock-persian-indigo-blur.jpg", name: "Persian Indigo" },
  { url: "/img/paintings/peacock-blood-moon-red-blur.jpg", name: "Blood Moon Red" },
  { url: "/img/paintings/peacock-moroccan-purple-blur.jpg", name: "Moroccan Purple" },
];

export const Welcome = () => {
  usePageTitle();

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

        <Nav />

        <main className="relative z-10">
          {/* HERO — Kaya-inspired composition:
              text LEFT (eyebrow + accent rule, two-style headline, body, CTA),
              image RIGHT, well-framed and uncropped. */}
          <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 pt-6 sm:pt-8 md:pt-12 pb-16 md:pb-24">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 md:items-center">
              <Reveal as="div" className="md:col-span-6">
                {/* Headline split into two visual treatments — bigger,
                    bolder, with a drop shadow so the type lifts off the
                    blurred peacock backdrop. */}
                <h1 className="font-display tracking-[-0.045em] text-ink m-0 mb-8 text-balance hero-text-shadow">
                  <span className="block font-black text-[clamp(46px,7vw,102px)] leading-[0.94]">
                    So here we are on Earth
                  </span>
                  <span className="block font-medium italic text-[clamp(36px,5.6vw,76px)] leading-[1.05] mt-2 text-ink/90">
                    — orbiting a Sun Star at about 67,062 miles an hour.
                  </span>
                </h1>

                <p className="font-sans font-normal text-[15px] sm:text-[16px] md:text-[17px] leading-[1.75] text-ink/80 m-0 mb-9 max-w-[520px]">
                  {WELCOME.reminder}
                </p>
                {/* Two CTAs side-by-side, mirroring Kaya's
                    "Explore Flavors" + "Our Story" pairing.
                    Smaller padding + shorter primary label so both pills
                    sit on one row at the narrower hero column width. */}
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
              <Reveal as="figure" className="m-0 md:col-span-6">
                <ImageReveal
                  src="/img/welcome/01-painting-wild-rose.jpg"
                  alt="Stephen at his drafting table"
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

          {/* FEATURED WORKS — Aiya/Marconi grid pattern. Header split is
              vertically centred so the paragraph sits beside the
              headline, not at the bottom of the column. */}
          <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
            <Reveal as="div" className="text-center max-w-[920px] mx-auto mb-12 md:mb-16">
              <h2 className="font-display tracking-[-0.045em] text-ink m-0 mb-7 hero-text-shadow">
                <span className="block font-black text-[clamp(42px,6.4vw,92px)] leading-[0.94]">
                  His latest creations
                </span>
                <span className="block font-medium italic text-[clamp(32px,5.2vw,72px)] leading-[1.05] mt-2 text-ink/90">
                  crafted by hand.
                </span>
              </h2>
              <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.8] text-ink/85 m-0 max-w-[640px] mx-auto">
                Each canvas hand-stretched, primed, and painted over hundreds of hours — compass, rule and brush translating sacred geometry into a singular visual language.
              </p>
            </Reveal>

            <Reveal as="div" className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-7 mb-12 md:mb-14">
              {featured.map(({ painting, cover }) => (
                <Link key={painting.id} to={`/collections/${painting.id}`} className="group block">
                  <div className="relative aspect-square overflow-hidden bg-ink/5 ring-1 ring-white/8 transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
                    <img
                      src={asset(cover.image)}
                      alt={`${painting.title} — ${cover.name}`}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                    />
                  </div>
                  <div className="pt-5">
                    <h3 className="font-display font-bold text-[16px] md:text-[18px] tracking-[-0.015em] text-ink m-0 leading-[1.25] group-hover:text-accent transition-colors duration-300">
                      {painting.title}
                    </h3>
                    {painting.year && painting.year !== "[ DATE ]" && (
                      <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/55 mt-2 m-0">
                        {painting.year}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
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

          {/* PORTRAIT + INVOCATION + BIO 1 — items-stretch so no bottom gap */}
          <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 md:items-stretch">
              <Reveal as="figure" className="m-0 md:col-span-5 min-h-[60vh] md:min-h-0">
                <ImageReveal
                  src="/img/welcome/02-portrait-denim.jpg"
                  alt="Stephen Meakin"
                  fill
                  edges="all"
                  parallax={0.16}
                />
              </Reveal>
              <Reveal as="div" className="md:col-span-7 flex flex-col justify-center md:py-6">
                <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                  {WELCOME.invocation}
                </p>
                <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(28px,3.4vw,44px)] leading-[1.02] text-ink m-0 mb-6">
                  The Art of Mandala with internationally renowned mandala artist Stephen Meakin.
                </h2>
                <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.7] text-ink/85 m-0">
                  {WELCOME.bio[0]}
                </p>
              </Reveal>
            </div>
          </section>

          {/* IN MEMORIAM — centred editorial moment, NOT the same
              text-left/image-right layout as the hero. A wide cinematic
              image strip sits at the top, then the headline + body +
              CTA all centred below it. Different composition,
              different read. */}
          <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-14 md:py-20">
            <Reveal as="figure" className="m-0 mb-14 md:mb-20">
              <ImageReveal
                src="/img/welcome/04-paintings-collection.jpg"
                alt="Stephen's mandala paintings collection"
                aspect="aspect-[21/9]"
                edges="all"
                parallax={0.1}
                shadow=""
              />
            </Reveal>

            <Reveal as="div" className="max-w-[880px] mx-auto text-center">
              <h2 className="font-display tracking-[-0.045em] text-ink m-0 mb-9 hero-text-shadow">
                <span className="block font-black text-[clamp(44px,6.4vw,98px)] leading-[0.94]">
                  Steve passed away
                </span>
                <span className="block font-medium italic text-[clamp(34px,5vw,72px)] leading-[1.05] mt-2 text-ink/90">
                  in {PASSING_DATE}.
                </span>
              </h2>

              <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.8] text-ink/85 m-0 mb-6 max-w-[680px] mx-auto">
                On behalf of his immediate family, The Mandala Company Foundation continues to share Stephen's work — exhibitions across Europe, the Academy at Phoenix Place, and the global community of geometers he taught.
              </p>

              <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.8] text-ink/70 m-0 mb-10 max-w-[680px] mx-auto">
                News, releases and the continuing life of the estate are shared from the Foundation.
              </p>

              <MagneticLink
                to="/about"
                className="inline-flex w-fit items-center bg-ink text-bg px-7 py-3.5 font-sans text-[11px] font-bold tracking-[0.18em] uppercase rounded-full transition-colors duration-300 hover:bg-accent hover:text-ink"
                ariaLabel="About Stephen and the Foundation"
              >
                About Steve's life <span aria-hidden="true" className="ml-2">→</span>
              </MagneticLink>
            </Reveal>
          </section>

          {/* STUDIO full-bleed cinematic, parallax + soft top/bottom */}
          <Reveal as="figure" className="m-0 w-full py-3 md:py-5">
            <ImageReveal
              src="/img/welcome/03-painting-in-studio.jpg"
              alt="Stephen painting in the studio"
              className="h-[60vh] md:h-[78vh] w-full"
              edges="y"
              parallax={0.18}
              shadow=""
            />
          </Reveal>

          {/* SACRED GEOMETRY — 4-card grid */}
          <section className="mx-auto max-w-[1320px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
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
                  <p className="font-display font-bold text-accent text-[clamp(32px,3.4vw,44px)] leading-none m-0 mb-4 tracking-tight">
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

          {/* MANDALAS WALL — full-bleed cinematic */}
          <Reveal as="figure" className="m-0 w-full py-3 md:py-5">
            <ImageReveal
              src="/img/welcome/04-paintings-collection.jpg"
              alt="A wall of Stephen's mandalas"
              className="h-[55vh] md:h-[72vh] w-full"
              edges="y"
              parallax={0.18}
              shadow=""
            />
          </Reveal>

          {/* PROCESS / CRAFT — wrapped in a dark scrim card so the text
              reads clearly regardless of which peacock backdrop is
              bleeding through behind it. */}
          <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 py-12 md:py-16">
            <div className="relative bg-[rgba(10,9,8,0.88)] px-6 sm:px-8 md:px-12 lg:px-16 py-12 md:py-16 ring-1 ring-white/8">
              <Reveal as="div" className="text-center mb-10 md:mb-14">
                <h2 className="font-display font-black tracking-[-0.04em] text-[clamp(36px,5.4vw,76px)] leading-[0.98] text-ink m-0 max-w-[860px] mx-auto text-balance hero-text-shadow">
                  Each painting is a ritual.
                </h2>
              </Reveal>
              {/* Horizontal 2-col: image left fills the column tall,
                  text + materials grid stacked on the right. Reads
                  side-by-side rather than scrolling top-to-bottom. */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
                <Reveal as="figure" className="m-0 md:col-span-6">
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
                    {[
                      ["Surface", "350gsm archival canvas"],
                      ["Frame", "Hand-stretched, deep wooden"],
                      ["Tools", "Compass · rule · brush"],
                      ["Pigment", "Hand-pressed oils + pigment inks"],
                      ["Time", "Hundreds of hours per canvas"],
                      ["Edition", "Individually made to order"],
                    ].map(([label, value]) => (
                      <li key={label} className="m-0">
                        <p className="font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-ink/65 m-0 mb-1.5">{label}</p>
                        <p className="font-sans font-normal text-[13.5px] leading-[1.5] text-ink m-0">{value}</p>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </div>
            </div>
          </section>

          {/* SUNSTAR — text split */}
          <section className="mx-auto max-w-[1280px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-start">
              <Reveal as="div" className="md:col-span-5">
                <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-5">
                  Arista SunStar · 2016
                </p>
                <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(32px,4.2vw,56px)] leading-[0.98] text-ink m-0">
                  A 3.6&#8209;metre commission for Notting Hill.
                </h2>
              </Reveal>
              <Reveal as="div" className="md:col-span-7 md:pt-3">
                <p className="font-sans font-normal text-[16px] md:text-[18px] leading-[1.75] text-ink/85 m-0">
                  {WELCOME.bio[2]}
                </p>
              </Reveal>
            </div>
          </section>

          {/* SUNSTAR IMAGE — small contained feature (source is low-res). */}
          <Reveal as="figure" className="m-0 mx-auto max-w-[900px] px-4 md:px-8 lg:px-12 py-3 md:py-5">
            <ImageReveal
              src="/img/welcome/05-arista-sunstar.jpg"
              alt="Stephen beside the 3.6-metre Arista SunStar at the Farmacy restaurant, Notting Hill"
              className="h-[32vh] md:h-[42vh] w-full"
              parallax={0.08}
              edges="all"
              shadow=""
            />
          </Reveal>

          {/* COLLECTIONS PROMO — 3-card grid */}
          <section className="mx-auto max-w-[1320px] px-4 md:px-8 lg:px-12 py-12 md:py-16">
            <div className="flex items-end justify-between mb-7 md:mb-10 flex-wrap gap-4">
              <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(28px,3.4vw,44px)] leading-[1.0] text-ink m-0">
                Three collections
              </h2>
              <Link
                to="/collections"
                className="font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-ink/75 hover:text-accent transition-colors"
              >
                Explore all →
              </Link>
            </div>
            <Reveal as="div" className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
              {COLLECTIONS.map((coll) => {
                const items = PAINTINGS.filter((p) => p.collection === coll.id);
                return (
                  <Link key={coll.id} to={`/collections#collection-${coll.id}`} className="group block bg-bg-soft ring-1 ring-white/8 hover:ring-accent/50 transition-all duration-500 hover:-translate-y-1">
                    {coll.backdropImage && (
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={asset(coll.backdropImage.replace("-blur.jpg", ".jpg"))}
                          alt={coll.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                        />
                      </div>
                    )}
                    <div className="p-5 md:p-6">
                      <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-accent m-0 mb-3">
                        {items.length} {items.length === 1 ? "Painting" : "Paintings"}
                      </p>
                      <h3 className="font-display font-bold tracking-[-0.025em] text-[clamp(20px,1.8vw,24px)] leading-[1.1] text-ink m-0">
                        {coll.title}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </Reveal>
          </section>

          {/* SACRED GEOMETRY — closing moment: text dominates the viewport
              top-to-near-bottom; Earth's curve overlaps the bottom of
              "Geometry." with no dead space anywhere. */}
          <section
            className="relative w-full overflow-hidden"
            style={{ height: "100vh" }}
            aria-label="Sacred Geometry"
          >
            {/* Earth — fills the bottom ~58vh of the section so it
                reaches all the way to the section divider, with the
                curve positioned near the top of the band so it brushes
                the bottom of "Geometry." */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 w-full pointer-events-none"
              style={{
                height: "58vh",
                zIndex: 0,
                backgroundImage: `url("${asset("/img/scenes/earth-limb.jpg")}")`,
                backgroundSize: "cover",
                backgroundPosition: "center 72%",
                backgroundRepeat: "no-repeat",
                WebkitMaskImage:
                  "linear-gradient(180deg, transparent 0%, #000 10%, #000 100%)",
                maskImage:
                  "linear-gradient(180deg, transparent 0%, #000 10%, #000 100%)",
              }}
            />

            {/* Headline — fills viewport vertically, overlaps Earth at bottom */}
            <div className="absolute inset-x-0 top-0 z-10 pt-[3vh] md:pt-[2vh] px-2 md:px-4 text-center">
              <Reveal>
                <h2
                  className="font-display font-black tracking-[-0.06em] leading-[0.84] m-0"
                  style={{
                    fontSize: "clamp(96px, 24vw, 540px)",
                    color: "#f5ecd6",
                    textShadow:
                      "0 6px 80px rgba(0,0,0,0.9), 0 3px 28px rgba(0,0,0,0.75)",
                  }}
                >
                  Sacred<br />Geometry<span style={{ color: "#dca84c" }}>.</span>
                </h2>
              </Reveal>
            </div>
          </section>

          {/* VISIT / CONNECT / FOUNDATION — three engagement cards */}
          <section className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-8 lg:px-12 py-12 md:py-16">
            <Reveal as="div" className="text-center mb-10 md:mb-14">
              <p className="font-sans text-[11px] font-bold tracking-[0.42em] uppercase text-accent m-0 mb-4">
                The Estate
              </p>
              <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(28px,4vw,52px)] leading-[1.0] text-ink m-0 max-w-[820px] mx-auto text-balance">
                Continue Stephen's work.
              </h2>
            </Reveal>
            <Reveal as="div" className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
              {[
                {
                  eyebrow: "Prints",
                  title: "Print enquiries",
                  body: "Individually made-to-order prints of every painting, hand-stretched on archival canvas.",
                  cta: "Enquire",
                  href: "mailto:enquiries@example.com",
                },
                {
                  eyebrow: "Visit",
                  title: "Phoenix Place, Lewes",
                  body: "Stephen's studio and TAGA — The Art of Geometry Academy — in East Sussex.",
                  cta: "Plan a visit",
                  href: "mailto:visit@example.com",
                },
                {
                  eyebrow: "Foundation",
                  title: "The Mandala Company",
                  body: "News and releases from the estate, on behalf of Steve's immediate family.",
                  cta: "Subscribe",
                  href: "mailto:foundation@example.com",
                },
              ].map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  className="group block bg-bg-soft ring-1 ring-white/8 hover:ring-accent/50 transition-all duration-500 hover:-translate-y-1 p-6 md:p-7"
                >
                  <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-accent m-0 mb-4">
                    {item.eyebrow}
                  </p>
                  <h3 className="font-display font-bold tracking-[-0.025em] text-[clamp(20px,1.9vw,26px)] leading-[1.15] text-ink m-0 mb-3">
                    {item.title}
                  </h3>
                  <p className="font-sans font-normal text-[14px] leading-[1.6] text-ink/75 m-0 mb-6">
                    {item.body}
                  </p>
                  <span className="inline-flex items-center gap-2 font-sans text-[11px] font-bold tracking-[0.22em] uppercase text-ink group-hover:text-accent transition-colors">
                    {item.cta} <span aria-hidden="true">→</span>
                  </span>
                </a>
              ))}
            </Reveal>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};
