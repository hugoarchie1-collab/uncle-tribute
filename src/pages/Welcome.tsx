import { Link } from "react-router-dom";
import { VideoIntro } from "../components/VideoIntro";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { WELCOME, PASSING_DATE } from "../data/content";
import { COLLECTIONS, PAINTINGS } from "../data/paintings";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

const CAP = "(n/a)";

export const Welcome = () => {
  usePageTitle();

  // 4 featured paintings to show under the hero like Ovalen's product strip
  const featuredIds = ["wild-rose", "english-bluebells", "enneagon-swans", "lulin"];
  const featured = featuredIds
    .map((id) => PAINTINGS.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <>
      <VideoIntro />

      <div id="welcome-anchor" className="relative bg-bg">
        <Nav />

        <main className="relative">
          {/* HERO — Ovalen-style: tag eyebrow + bold sans headline, button, image right */}
          <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 pt-10 md:pt-16 pb-10 md:pb-14">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
              <Reveal as="div" className="md:col-span-6">
                <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-5">
                  In memoriam · 1966 — {PASSING_DATE}
                </p>
                <h1 className="font-display font-bold tracking-[-0.04em] text-[clamp(40px,5.8vw,84px)] leading-[1.0] text-ink m-0 mb-6 text-balance">
                  {WELCOME.openingQuote}
                </h1>
                <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.7] text-ink/80 m-0 mb-7 max-w-[480px]">
                  {WELCOME.reminder}
                </p>
                <Link
                  to="/collections"
                  className="inline-flex items-center gap-2 bg-ink text-bg px-7 py-3.5 font-sans text-[12px] font-bold tracking-[0.18em] uppercase rounded-full transition-all duration-300 hover:bg-accent hover:text-ink"
                >
                  Explore the collections
                  <span aria-hidden="true">→</span>
                </Link>
              </Reveal>
              <Reveal as="figure" className="m-0 md:col-span-6">
                <img
                  src={asset("/img/welcome/01-painting-wild-rose.jpg")}
                  alt="Stephen at his drafting table"
                  loading="eager"
                  className="w-full aspect-[4/5] object-cover shadow-[0_28px_72px_rgba(0,0,0,0.6)]"
                />
              </Reveal>
            </div>
          </section>

          {/* FEATURED 4 — product strip pattern (Ovalen "Explore the Shop") */}
          <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
            <div className="flex items-end justify-between mb-7 md:mb-10 flex-wrap gap-4">
              <h2 className="font-display font-bold tracking-[-0.03em] text-[clamp(28px,3.4vw,44px)] leading-[1.04] text-ink m-0">
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
              {featured.map((p) => {
                const cover = p.colourways.find((c) => c.isOriginal) ?? p.colourways[0];
                return (
                  <Link key={p.id} to={`/collections/${p.id}`} className="group block">
                    <div className="aspect-square overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.45)] transition-all duration-500 group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
                      <img
                        src={asset(cover.image)}
                        alt={p.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    </div>
                    <div className="pt-3">
                      <p className="font-sans text-[13px] md:text-[14px] font-semibold tracking-tight text-ink m-0 leading-[1.25]">
                        {p.title}
                      </p>
                      {p.year && p.year !== "[ DATE ]" && (
                        <p className="font-sans text-[11px] font-medium tracking-[0.18em] uppercase text-ink/55 mt-1 m-0">
                          {p.year}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </Reveal>
          </section>

          {/* PASSING NOTE — small, no padding bonanza */}
          <section className="mx-auto max-w-[760px] px-6 md:px-10 py-10 md:py-14 text-center">
            <Reveal>
              <span className="block h-px w-16 mx-auto bg-accent mb-7" />
              <p className="font-display font-bold text-[clamp(22px,2.6vw,30px)] leading-[1.2] tracking-[-0.02em] text-ink m-0">
                {WELCOME.passingNote}
              </p>
              <span className="block h-px w-16 mx-auto bg-accent mt-7" />
            </Reveal>
          </section>

          {/* PORTRAIT + INVOCATION + BIO 1 — Ovalen feature card pattern */}
          <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
              <Reveal as="figure" className="m-0 md:col-span-5">
                <img
                  src={asset("/img/welcome/02-portrait-denim.jpg")}
                  alt="Stephen Meakin"
                  loading="lazy"
                  className="w-full aspect-[3/4] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
                />
              </Reveal>
              <Reveal as="div" className="md:col-span-7 md:pt-6">
                <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                  {WELCOME.invocation}
                </p>
                <h2 className="font-display font-bold tracking-[-0.03em] text-[clamp(28px,3.4vw,44px)] leading-[1.04] text-ink m-0 mb-6">
                  The Art of Mandala with internationally renowned mandala artist Stephen Meakin.
                </h2>
                <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.7] text-ink/85 m-0">
                  {WELCOME.bio[0]}
                </p>
              </Reveal>
            </div>
          </section>

          {/* STUDIO — full-bleed cinematic moment */}
          <Reveal as="figure" className="m-0 w-full py-8 md:py-12">
            <img
              src={asset("/img/welcome/03-painting-in-studio.jpg")}
              alt="Stephen painting in the studio"
              loading="lazy"
              className="w-full h-[60vh] md:h-[78vh] object-cover"
            />
          </Reveal>

          {/* SACRED GEOMETRY — 4-card grid (Ovalen "4 product cards" pattern) */}
          <section className="mx-auto max-w-[1280px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
            <div className="text-center mb-10 md:mb-12">
              <Reveal>
                <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                  Sacred Geometry
                </p>
                <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(32px,4.4vw,60px)] leading-[1.0] text-ink m-0 max-w-[820px] mx-auto text-balance">
                  Four traditions, woven into one visual language.
                </h2>
              </Reveal>
            </div>

            <Reveal as="ul" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 list-none p-0 mb-12">
              {[
                { tag: "I", name: "Insular Island Arts", note: "Celtic interlace, illuminated manuscript" },
                { tag: "II", name: "Rose Windows", note: "The great cathedrals of medieval Europe" },
                { tag: "III", name: "Persian Geometry", note: "Tessellation, girih, the courts of Isfahan" },
                { tag: "IV", name: "Tibetan Mandala", note: "Sacred diagram, meditation, visual henosis" },
              ].map((item) => (
                <li
                  key={item.tag}
                  className="bg-bg-soft ring-1 ring-white/8 p-6 md:p-7 transition-all duration-500 hover:ring-accent/50"
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

          {/* MANDALAS WALL — full-bleed with overlay caption */}
          <Reveal as="figure" className="relative m-0 w-full py-8 md:py-12">
            <img
              src={asset("/img/welcome/04-paintings-collection.jpg")}
              alt="A wall of Stephen's mandalas"
              loading="lazy"
              className="w-full h-[55vh] md:h-[70vh] object-cover"
            />
          </Reveal>

          {/* SUNSTAR — text split (eyebrow + headline LEFT, body RIGHT) */}
          <section className="mx-auto max-w-[1280px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-start">
              <Reveal as="div" className="md:col-span-5">
                <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-5">
                  Arista SunStar · 2016
                </p>
                <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(32px,4.2vw,56px)] leading-[1.0] text-ink m-0">
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

          {/* SUNSTAR IMAGE — small, centered, (n/a) ABOVE */}
          <Reveal as="figure" className="m-0 mx-auto max-w-[480px] px-4 pb-8 pt-4 text-center">
            <figcaption className="mb-3 font-sans text-[10px] font-bold tracking-[0.38em] uppercase text-ink/40">
              {CAP}
            </figcaption>
            <img
              src={asset("/img/welcome/05-arista-sunstar.jpg")}
              alt="Stephen beside the 3.6-metre Arista SunStar at the Farmacy restaurant, Notting Hill"
              loading="lazy"
              className="w-full aspect-[16/9] object-cover shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
            />
          </Reveal>

          {/* COLLECTIONS PROMO — 3 card grid */}
          <section className="mx-auto max-w-[1280px] px-4 md:px-8 lg:px-12 py-12 md:py-16">
            <div className="flex items-end justify-between mb-7 md:mb-10 flex-wrap gap-4">
              <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(28px,3.4vw,44px)] leading-[1.04] text-ink m-0">
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
                const cover = items[0]?.colourways.find((c) => c.isOriginal) ?? items[0]?.colourways[0];
                return (
                  <Link key={coll.id} to={`/collections#collection-${coll.id}`} className="group block bg-bg-soft ring-1 ring-white/8 hover:ring-accent/50 transition-all duration-500">
                    {cover && (
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={asset(cover.image)}
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
                      <h3 className="font-display font-bold tracking-[-0.02em] text-[clamp(20px,1.8vw,24px)] leading-[1.15] text-ink m-0">
                        {coll.title}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </Reveal>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};
