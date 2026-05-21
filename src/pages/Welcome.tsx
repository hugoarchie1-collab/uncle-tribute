import { Link } from "react-router-dom";
import { VideoIntro } from "../components/VideoIntro";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { ImageReveal } from "../components/ImageReveal";
import { MagneticLink } from "../components/MagneticLink";
import { GenerativeMandala } from "../components/GenerativeMandala";
import { WELCOME, PASSING_DATE } from "../data/content";
import { COLLECTIONS, PAINTINGS } from "../data/paintings";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

export const Welcome = () => {
  usePageTitle();

  // Featured pairs: painting id + specific colourway to show as the cover.
  const featuredPicks: { id: string; colourway?: string }[] = [
    { id: "peacock-minerva", colourway: "Blood Moon Red" },
    { id: "ophiuchus" },
    { id: "enneagon-swans", colourway: "Glacier Blue" },
    { id: "tridecagon-moon-star", colourway: "Supernova Violet" },
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
        <Nav />

        <main className="relative">
          {/* HERO — Ovalen pattern: text LEFT, image RIGHT */}
          <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 pt-12 md:pt-20 pb-20 md:pb-28">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 md:items-stretch">
              <Reveal as="div" className="md:col-span-6 flex flex-col justify-center">
                <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-5">
                  In memoriam · 1966 — {PASSING_DATE}
                </p>
                <h1 className="font-display font-bold tracking-[-0.04em] text-[clamp(40px,5.6vw,80px)] leading-[0.98] text-ink m-0 mb-7 text-balance">
                  {WELCOME.openingQuote}
                </h1>
                <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/80 m-0 mb-8 max-w-[480px]">
                  {WELCOME.reminder}
                </p>
                <MagneticLink
                  to="/collections"
                  className="inline-flex w-fit items-center bg-ink text-bg px-7 py-3.5 font-sans text-[12px] font-bold tracking-[0.18em] uppercase rounded-full transition-colors duration-300 hover:bg-accent hover:text-ink"
                  ariaLabel="Explore the collections"
                >
                  Explore the collections <span aria-hidden="true">→</span>
                </MagneticLink>
              </Reveal>
              <Reveal as="figure" className="m-0 md:col-span-6 min-h-[60vh]">
                <ImageReveal
                  src="/img/welcome/01-painting-wild-rose.jpg"
                  alt="Stephen at his drafting table"
                  eager
                  fill
                  edges="all"
                  parallax={0.22}
                />
              </Reveal>
            </div>
          </section>

          {/* FEATURED 4 — product-strip pattern */}
          <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-20 md:py-28">
            <div className="flex items-end justify-between mb-10 md:mb-14 flex-wrap gap-4">
              <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(32px,4vw,56px)] leading-[1.0] text-ink m-0">
                Featured works
              </h2>
              <Link
                to="/collections"
                className="font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-ink/75 hover:text-accent transition-colors"
              >
                View all 11 →
              </Link>
            </div>
            <Reveal as="div" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
              {featured.map(({ painting, cover }) => (
                <Link key={painting.id} to={`/collections/${painting.id}`} className="group block">
                  <ImageReveal
                    src={cover.image}
                    alt={`${painting.title} — ${cover.name}`}
                    aspect="aspect-square"
                    parallax={0.06}
                    shadow="shadow-[0_16px_40px_rgba(0,0,0,0.45)] group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.65)] transition-shadow duration-500"
                  />
                  <div className="pt-3">
                    <p className="font-display text-[14px] md:text-[16px] font-bold tracking-tight text-ink m-0 leading-[1.2]">
                      {painting.title}
                    </p>
                    {painting.year && painting.year !== "[ DATE ]" && (
                      <p className="font-sans text-[10px] font-bold tracking-[0.22em] uppercase text-ink/55 mt-1 m-0">
                        {painting.year}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </Reveal>
          </section>

          {/* PRESS STRIP + PASSING NOTE — unified atmospheric block */}
          <section className="relative mx-auto max-w-[1320px] px-4 md:px-8 lg:px-12 py-20 md:py-28">
            <Reveal as="div" className="text-center">
              <p className="font-sans text-[10px] font-bold tracking-[0.46em] uppercase text-accent m-0 mb-6">
                Exhibited at
              </p>
              <ul className="list-none p-0 m-0 flex flex-wrap items-center justify-center gap-x-6 md:gap-x-8 gap-y-3 font-sans text-[12px] md:text-[13px] font-medium tracking-[0.18em] uppercase text-ink/75">
                <li>Majlis Gallery, Dubai</li>
                <li aria-hidden="true" className="text-accent/50">·</li>
                <li>Trinity Art Gallery, London</li>
                <li aria-hidden="true" className="text-accent/50">·</li>
                <li>Unique Arts, Brighton</li>
                <li aria-hidden="true" className="text-accent/50">·</li>
                <li>Farmacy, Notting Hill</li>
                <li aria-hidden="true" className="text-accent/50">·</li>
                <li>Sahara Force India F1</li>
                <li aria-hidden="true" className="text-accent/50">·</li>
                <li>The Tree of Wellbeing</li>
              </ul>
            </Reveal>

            <Reveal as="div" className="mt-12 md:mt-16 text-center">
              <span aria-hidden="true" className="block h-px w-24 mx-auto bg-gradient-to-r from-transparent via-accent/70 to-transparent mb-8" />
              <p className="font-display font-medium text-[clamp(22px,2.6vw,32px)] leading-[1.2] tracking-[-0.02em] text-ink m-0">
                {WELCOME.passingNote}
              </p>
              <span aria-hidden="true" className="block h-px w-24 mx-auto bg-gradient-to-r from-transparent via-accent/70 to-transparent mt-8" />
            </Reveal>
          </section>

          {/* PORTRAIT + INVOCATION + BIO 1 */}
          <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-20 md:py-28">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 md:items-center">
              <Reveal as="figure" className="m-0 md:col-span-5 min-h-[60vh] md:min-h-[68vh]">
                <ImageReveal
                  src="/img/welcome/02-portrait-denim.jpg"
                  alt="Stephen Meakin"
                  fill
                  edges="all"
                  parallax={0.16}
                />
              </Reveal>
              <Reveal as="div" className="md:col-span-7 flex flex-col justify-center">
                <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-5">
                  {WELCOME.invocation}
                </p>
                <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(32px,4vw,56px)] leading-[1.0] text-ink m-0 mb-7">
                  The Art of Mandala with internationally renowned mandala artist Stephen Meakin.
                </h2>
                <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/85 m-0">
                  {WELCOME.bio[0]}
                </p>
              </Reveal>
            </div>
          </section>

          {/* STUDIO full-bleed cinematic, parallax + soft top/bottom */}
          <Reveal as="figure" className="m-0 w-full py-3 md:py-5">
            <ImageReveal
              src="/img/welcome/03-painting-in-studio.jpg"
              alt="Stephen painting in the studio"
              className="h-[60vh] md:h-[78vh] w-full"
              edges="y"
              parallax={0.3}
              shadow=""
            />
          </Reveal>

          {/* GENERATIVE MANDALA — scroll-driven Flower of Life */}
          <GenerativeMandala />

          {/* SACRED GEOMETRY — 4-card grid */}
          <section className="mx-auto max-w-[1320px] px-4 md:px-8 lg:px-12 py-20 md:py-28">
            <Reveal as="div" className="text-center mb-14 md:mb-16">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-5">
                Sacred Geometry
              </p>
              <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(32px,4vw,56px)] leading-[1.0] text-ink m-0 max-w-[820px] mx-auto text-balance">
                Four traditions, woven into one visual language.
              </h2>
            </Reveal>

            <Reveal as="ul" className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10 list-none p-0 mb-14 md:mb-16">
              {[
                { tag: "I", name: "Insular Island Arts", note: "Celtic interlace, illuminated manuscript" },
                { tag: "II", name: "Rose Windows", note: "The great cathedrals of medieval Europe" },
                { tag: "III", name: "Persian Geometry", note: "Tessellation, girih, the courts of Isfahan" },
                { tag: "IV", name: "Tibetan Mandala", note: "Sacred diagram, meditation, visual henosis" },
              ].map((item) => (
                <li
                  key={item.tag}
                  className="border-t border-accent/30 pt-5 transition-colors duration-500 hover:border-accent"
                >
                  <p className="font-display font-bold text-accent text-[clamp(28px,3vw,40px)] leading-none m-0 mb-4 tracking-tight">
                    {item.tag}
                  </p>
                  <p className="font-display font-bold text-[18px] md:text-[20px] tracking-[-0.015em] text-ink m-0 mb-3 leading-[1.2]">
                    {item.name}
                  </p>
                  <p className="font-sans font-normal text-[13.5px] leading-[1.55] text-ink/65 m-0">
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
              parallax={0.3}
              shadow=""
            />
          </Reveal>

          {/* PROCESS / CRAFT — drafting-table image + materials & method */}
          <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 py-20 md:py-28">
            <Reveal as="div" className="text-center mb-14 md:mb-16">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-5">
                The Craft
              </p>
              <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(32px,4vw,56px)] leading-[1.0] text-ink m-0 max-w-[820px] mx-auto text-balance">
                Each painting is a ritual.
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 md:items-stretch">
              <Reveal as="figure" className="m-0 md:col-span-7 min-h-[50vh] md:min-h-[60vh]">
                <ImageReveal
                  src="/img/about/02-painting-table.jpg"
                  alt="Stephen at his drafting table, drawing the underlying geometry"
                  fill
                  edges="all"
                  parallax={0.14}
                  tilt
                />
              </Reveal>
              <Reveal as="div" className="md:col-span-5 flex flex-col justify-center gap-5">
                <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.75] text-ink/90 m-0">
                  Each canvas was hand-stretched on a deep wooden frame and painted over hundreds of hours. Stephen began every work with compass and rule, constructing the underlying sacred geometry before a single colour was laid down.
                </p>
                <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.75] text-ink/90 m-0">
                  When a painting depicted a flower, the oil pressed from that flower went into the paint itself — the <em>Mandala of Wild Rose</em> contains the rose. Each composition carries its own number, rhythm, cadence and tone.
                </p>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-4 mt-2 list-none p-0">
                  {[
                    ["Surface", "350gsm archival canvas"],
                    ["Frame", "Hand-stretched, deep wooden"],
                    ["Tools", "Compass · rule · brush"],
                    ["Pigment", "Hand-pressed oils + pigment inks"],
                    ["Time", "Hundreds of hours per canvas"],
                    ["Edition", "Individually made to order"],
                  ].map(([label, value]) => (
                    <li key={label} className="m-0">
                      <p className="font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-accent m-0 mb-1">{label}</p>
                      <p className="font-sans font-normal text-[13.5px] leading-[1.45] text-ink/90 m-0">{value}</p>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </section>

          {/* SUNSTAR — text split + image */}
          <section className="mx-auto max-w-[1280px] px-4 md:px-8 lg:px-12 py-20 md:py-28">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-start mb-14 md:mb-16">
              <Reveal as="div" className="md:col-span-5">
                <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-5">
                  Arista SunStar · 2016
                </p>
                <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(32px,4vw,56px)] leading-[1.0] text-ink m-0">
                  A 3.6&#8209;metre commission for Notting Hill.
                </h2>
              </Reveal>
              <Reveal as="div" className="md:col-span-7 md:pt-2">
                <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/85 m-0">
                  {WELCOME.bio[2]}
                </p>
              </Reveal>
            </div>
            <Reveal as="figure" className="m-0 mx-auto max-w-[520px] text-center">
              <ImageReveal
                src="/img/welcome/05-arista-sunstar.jpg"
                alt="Stephen beside the 3.6-metre Arista SunStar at the Farmacy restaurant, Notting Hill"
                aspect="aspect-[16/9]"
                parallax={0.08}
                edges="all"
                shadow=""
              />
            </Reveal>
          </section>

          {/* COLLECTIONS PROMO — 3-card grid */}
          <section className="mx-auto max-w-[1320px] px-4 md:px-8 lg:px-12 py-20 md:py-28">
            <div className="flex items-end justify-between mb-10 md:mb-14 flex-wrap gap-4">
              <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(32px,4vw,56px)] leading-[1.0] text-ink m-0">
                Three collections
              </h2>
              <Link
                to="/collections"
                className="font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-ink/75 hover:text-accent transition-colors"
              >
                Explore all →
              </Link>
            </div>
            <Reveal as="div" className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
              {COLLECTIONS.map((coll) => {
                const items = PAINTINGS.filter((p) => p.collection === coll.id);
                return (
                  <Link key={coll.id} to={`/collections#collection-${coll.id}`} className="group block transition-transform duration-500 hover:-translate-y-1">
                    {coll.backdropImage && (
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={asset(coll.backdropImage)}
                          alt={coll.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                        />
                      </div>
                    )}
                    <div className="pt-5">
                      <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-accent m-0 mb-3">
                        {items.length} {items.length === 1 ? "Painting" : "Paintings"}
                      </p>
                      <h3 className="font-display font-bold tracking-[-0.025em] text-[clamp(20px,2vw,26px)] leading-[1.15] text-ink m-0 group-hover:text-accent transition-colors duration-300">
                        {coll.title}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </Reveal>
          </section>

          {/* SACRED GEOMETRY — transparent so the page aura shows through;
              text sized so each word fits the viewport and Earth's limb
              scrapes the bottom of "Geometry." */}
          <section
            className="relative w-full overflow-hidden"
            style={{ height: "108vh" }}
            aria-label="Sacred Geometry"
          >
            {/* Earth image — scaled to "scrape" the text bottom. Top of the
                image is masked to dissolve into the page aura, no hard edge. */}
            <img
              src={asset("/img/scenes/earth-limb.jpg")}
              alt=""
              aria-hidden="true"
              className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[135%] max-w-none h-auto pointer-events-none select-none"
              style={{
                zIndex: 0,
                WebkitMaskImage:
                  "linear-gradient(180deg, transparent 0%, #000 16%, #000 100%)",
                maskImage:
                  "linear-gradient(180deg, transparent 0%, #000 16%, #000 100%)",
              }}
            />

            {/* Headline — each word fits the viewport width comfortably */}
            <div className="relative z-10 pt-[9vh] md:pt-[10vh] px-4 md:px-6 text-center">
              <Reveal>
                <h2
                  className="font-display font-bold tracking-[-0.055em] leading-[0.84] m-0 mx-auto"
                  style={{
                    fontSize: "clamp(72px, 18vw, 320px)",
                    maxWidth: "min(100%, 1700px)",
                    color: "#f5ecd6",
                    textShadow:
                      "0 6px 70px rgba(0,0,0,0.75), 0 3px 24px rgba(0,0,0,0.6)",
                  }}
                >
                  Sacred<br />Geometry<span style={{ color: "#dca84c" }}>.</span>
                </h2>
              </Reveal>
            </div>
          </section>

          {/* VISIT / CONNECT / FOUNDATION — three engagement cards */}
          <section className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-8 lg:px-12 py-20 md:py-28">
            <Reveal as="div" className="text-center mb-14 md:mb-16">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-5">
                The Estate
              </p>
              <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(32px,4vw,56px)] leading-[1.0] text-ink m-0 max-w-[820px] mx-auto text-balance">
                Continue Stephen's work.
              </h2>
            </Reveal>
            <Reveal as="div" className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
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
                  className="group block border-t border-accent/30 pt-6 transition-colors duration-300 hover:border-accent"
                >
                  <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-accent m-0 mb-4">
                    {item.eyebrow}
                  </p>
                  <h3 className="font-display font-bold tracking-[-0.025em] text-[clamp(22px,2vw,28px)] leading-[1.15] text-ink m-0 mb-4">
                    {item.title}
                  </h3>
                  <p className="font-sans font-normal text-[14.5px] leading-[1.7] text-ink/75 m-0 mb-6">
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
