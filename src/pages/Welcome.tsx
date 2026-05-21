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

      <div id="welcome-anchor" className="relative bg-bg">
        <Nav />

        <main className="relative">
          {/* HERO — Ovalen pattern: text LEFT, image RIGHT */}
          <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 pt-8 sm:pt-12 md:pt-16 pb-8 md:pb-14">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 md:items-stretch">
              <Reveal as="div" className="md:col-span-6 flex flex-col justify-center">
                <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-5">
                  In memoriam · 1966 — {PASSING_DATE}
                </p>
                <h1 className="font-display font-bold tracking-[-0.04em] text-[clamp(36px,6vw,84px)] leading-[0.98] text-ink m-0 mb-6 text-balance">
                  {WELCOME.openingQuote}
                </h1>
                <p className="font-sans font-normal text-[15px] sm:text-[16px] md:text-[17px] leading-[1.7] text-ink/80 m-0 mb-7 max-w-[480px]">
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
          <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
            <div className="flex items-end justify-between mb-7 md:mb-10 flex-wrap gap-4">
              <h2 className="font-display font-bold tracking-[-0.03em] text-[clamp(28px,3.4vw,44px)] leading-[1.0] text-ink m-0">
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

          {/* PRESS STRIP — monochrome line of venues / commissions */}
          <section className="mx-auto max-w-[1320px] px-4 md:px-8 lg:px-12 py-5 md:py-7 border-y border-white/8">
            <Reveal>
              <p className="font-sans text-[10px] sm:text-[11px] font-bold tracking-[0.42em] uppercase text-ink/50 m-0 text-center flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                <span className="text-accent">Exhibited at</span>
                <span aria-hidden="true" className="text-ink/25">·</span>
                <span>Majlis Gallery, Dubai</span>
                <span aria-hidden="true" className="text-ink/25">·</span>
                <span>Trinity Art Gallery, London</span>
                <span aria-hidden="true" className="text-ink/25">·</span>
                <span>Unique Arts, Brighton</span>
                <span aria-hidden="true" className="text-ink/25">·</span>
                <span>Farmacy, Notting Hill</span>
                <span aria-hidden="true" className="text-ink/25">·</span>
                <span>Sahara Force India F1</span>
                <span aria-hidden="true" className="text-ink/25">·</span>
                <span>The Tree of Wellbeing</span>
              </p>
            </Reveal>
          </section>

          {/* PASSING NOTE */}
          <section className="mx-auto max-w-[760px] px-6 md:px-10 py-10 md:py-14 text-center">
            <Reveal>
              <span className="block h-px w-16 mx-auto bg-accent mb-7" />
              <p className="font-display font-bold text-[clamp(22px,2.6vw,32px)] leading-[1.15] tracking-[-0.025em] text-ink m-0">
                {WELCOME.passingNote}
              </p>
              <span className="block h-px w-16 mx-auto bg-accent mt-7" />
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
              parallax={0.3}
              shadow=""
            />
          </Reveal>

          {/* PROCESS / CRAFT — drafting-table image + materials & method */}
          <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 py-12 md:py-16">
            <Reveal as="div" className="text-center mb-10 md:mb-14">
              <p className="font-sans text-[11px] font-bold tracking-[0.42em] uppercase text-accent m-0 mb-4">
                The Craft
              </p>
              <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(32px,5vw,68px)] leading-[0.98] text-ink m-0 max-w-[860px] mx-auto text-balance">
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

          {/* SUNSTAR IMAGE — small, centered, no caption */}
          <Reveal as="figure" className="m-0 mx-auto max-w-[480px] px-4 pb-8 pt-4 text-center">
            <ImageReveal
              src="/img/welcome/05-arista-sunstar.jpg"
              alt="Stephen beside the 3.6-metre Arista SunStar at the Farmacy restaurant, Notting Hill"
              aspect="aspect-[16/9]"
              parallax={0.08}
              edges="all"
              shadow="shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
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
                          src={asset(coll.backdropImage)}
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

          {/* SACRED GEOMETRY — full-bleed closing moment, Earth's limb */}
          <section
            className="relative w-full overflow-hidden bg-[#02040a]"
            style={{ height: "118vh" }}
            aria-label="Sacred Geometry"
          >
            {/* Earth image — scaled large, anchored bottom, curve brushing the text */}
            <img
              src={asset("/img/scenes/earth-limb.jpg")}
              alt=""
              aria-hidden="true"
              className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[125%] max-w-none h-auto pointer-events-none select-none"
              style={{ zIndex: 0 }}
            />
            {/* Top scrim — deepen the upper sky so the text reads cleanly */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, rgba(2,4,10,0.7) 0%, rgba(2,4,10,0.3) 22%, rgba(2,4,10,0) 50%)",
                zIndex: 1,
              }}
            />

            {/* Headline — massive, brushing the Earth's limb */}
            <div className="relative z-10 pt-[7vh] md:pt-[8vh] px-2 md:px-4 text-center">
              <Reveal>
                <h2
                  className="font-display font-bold tracking-[-0.06em] leading-[0.82] m-0"
                  style={{
                    fontSize: "clamp(108px, 26vw, 540px)",
                    color: "#f5ecd6",
                    textShadow:
                      "0 6px 80px rgba(0,0,0,0.85), 0 3px 28px rgba(0,0,0,0.7), 0 1px 6px rgba(0,0,0,0.5)",
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
