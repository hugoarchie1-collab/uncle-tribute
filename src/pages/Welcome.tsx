import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { VideoIntro } from "../components/VideoIntro";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { WELCOME } from "../data/content";
import { PAINTINGS } from "../data/paintings";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

const CAPTION_TBD = "(n/a)";

export const Welcome = () => {
  usePageTitle();

  const featuredIds = ["wild-rose", "peacock-minerva", "enneagon-swans"];
  const featured = featuredIds
    .map((id) => PAINTINGS.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <>
      <VideoIntro />

      <div id="welcome-anchor" className="relative bg-bg">
        <Nav />

        <main className="relative">
          {/* ─── HERO ─── 80px italic line-broken quote (left) + portrait (right) */}
          <section className="relative mx-auto max-w-[1200px] grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-10 md:gap-16 items-center px-6 md:px-10 lg:px-16 pt-28 md:pt-36 pb-16 md:pb-24">
            {/* focal rust glow behind the hero */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-y-12 -inset-x-12 -z-10 blur-3xl"
              style={{
                background:
                  "radial-gradient(45% 55% at 22% 50%, rgba(201, 120, 68, 0.22) 0%, transparent 70%)",
              }}
            />

            <Reveal as="div" className="text-center md:text-left">
              <Badge variant="accent" className="mb-6">Welcome to The Mandala Company</Badge>
              <blockquote className="m-0 border-0 p-0">
                <motion.p
                  initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
                  className="font-display font-bold tracking-tightest leading-[1.04] text-ink m-0 mb-6 text-balance text-[clamp(40px,7vw,80px)]"
                >
                  {WELCOME.openingQuote.split(" — ")[0]}
                  <span className="block text-accent">—</span>
                  {WELCOME.openingQuote.split(" — ")[1]}
                </motion.p>
                <cite className="not-italic font-sans text-[11px] font-medium tracking-widest uppercase text-ink/55">
                  — {WELCOME.openingAttribution}
                </cite>
              </blockquote>
            </Reveal>

            <Reveal as="figure" delay={0.2} className="m-0 relative">
              <img
                src={asset("/img/welcome/02-portrait-denim.jpg")}
                alt="Stephen Meakin"
                loading="eager"
                className="w-full aspect-[3/4] object-cover shadow-liftLg ring-1 ring-white/5"
              />
            </Reveal>
          </section>

          {/* ─── FEATURED COLLECTION ─── 3-painting cream card grid */}
          <section className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-16 py-12">
            <Reveal>
              <Card className="p-6 md:p-10 bg-cream">
                <div className="flex items-center justify-between mb-6 md:mb-10">
                  <span className="font-sans text-[11px] font-medium tracking-widest uppercase text-cream-ink/55">
                    Featured Collection
                  </span>
                  <Link
                    to="/collections"
                    className="font-sans text-[11px] font-medium tracking-widest uppercase text-cream-ink hover:text-accent transition-colors"
                  >
                    View all →
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                  {featured.map((p, i) => {
                    const cover =
                      p.colourways.find((c) => c.isOriginal) ?? p.colourways[0];
                    return (
                      <Reveal key={p.id} delay={0.1 + i * 0.1}>
                        <Link to={`/collections/${p.id}`} className="block group">
                          <div className="aspect-square overflow-hidden bg-cream-soft">
                            <img
                              src={asset(cover.image)}
                              alt={p.title}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-700 ease-smooth group-hover:scale-[1.03]"
                            />
                          </div>
                          <div className="pt-4 text-center">
                            <h3 className="font-display text-[20px] font-semibold leading-snug tracking-tight text-cream-ink">
                              {p.title}
                            </h3>
                            {p.year !== "[ DATE ]" && (
                              <p className="mt-1 font-sans text-[11px] font-medium tracking-widest uppercase text-cream-ink/55">
                                {p.year}
                              </p>
                            )}
                          </div>
                        </Link>
                      </Reveal>
                    );
                  })}
                </div>
              </Card>
            </Reveal>
          </section>

          {/* ─── REMINDER + PASSING + INVOCATION ─── centered band */}
          <section className="mx-auto max-w-[740px] px-6 md:px-10 py-20 md:py-28 text-center">
            <Reveal>
              <p className="font-serif italic font-medium text-[clamp(22px,2.6vw,30px)] leading-relaxed text-ink text-balance m-0 mb-12">
                {WELCOME.reminder}
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <Separator className="mb-10 bg-ink/15" />
              <p className="font-display italic font-medium text-[clamp(22px,2.6vw,30px)] leading-snug tracking-tight text-ink m-0">
                {WELCOME.passingNote}
              </p>
              <Separator className="mt-10 bg-ink/15" />
            </Reveal>

            <Reveal delay={0.2}>
              <p className="mt-12 font-sans text-[11px] font-medium tracking-widest uppercase text-ink/55 m-0">
                {WELCOME.invocation}
              </p>
            </Reveal>
          </section>

          {/* ─── NARRATIVE ─── narrow column, inline images between bio paragraphs */}
          <section className="mx-auto max-w-[720px] px-6 md:px-10 py-12 md:py-20 flex flex-col gap-8">
            <Reveal>
              <p className="font-sans text-[18px] font-light leading-loose text-ink/85 m-0">
                {WELCOME.bio[0]}
              </p>
            </Reveal>

            <Reveal as="figure" className="m-0 my-4">
              <img
                src={asset("/img/welcome/01-painting-wild-rose.jpg")}
                alt="Stephen at his drafting table"
                loading="lazy"
                className="w-full max-w-[560px] mx-auto block shadow-lift ring-1 ring-white/5"
              />
              <figcaption className="mt-3 text-center font-sans text-[11px] font-medium tracking-widest uppercase text-ink/35">
                {CAPTION_TBD}
              </figcaption>
            </Reveal>

            <Reveal>
              <p className="font-sans text-[18px] font-light leading-loose text-ink/85 m-0">
                {WELCOME.bio[1]}
              </p>
            </Reveal>

            <Reveal as="figure" className="m-0 my-4">
              <img
                src={asset("/img/welcome/03-painting-in-studio.jpg")}
                alt="Stephen painting in the studio"
                loading="lazy"
                className="w-full max-w-[560px] mx-auto block shadow-lift ring-1 ring-white/5"
              />
              <figcaption className="mt-3 text-center font-sans text-[11px] font-medium tracking-widest uppercase text-ink/35">
                {CAPTION_TBD}
              </figcaption>
            </Reveal>

            <Reveal as="figure" className="m-0 my-4">
              <img
                src={asset("/img/welcome/04-paintings-collection.jpg")}
                alt="A wall of Stephen's mandalas"
                loading="lazy"
                className="w-full max-w-[560px] mx-auto block shadow-lift ring-1 ring-white/5"
              />
              <figcaption className="mt-3 text-center font-sans text-[11px] font-medium tracking-widest uppercase text-ink/35">
                {CAPTION_TBD}
              </figcaption>
            </Reveal>

            <Reveal>
              <p className="font-sans text-[18px] font-light leading-loose text-ink/85 m-0">
                {WELCOME.bio[2]}
              </p>
            </Reveal>
          </section>

          {/* ─── CLOSING ─── Arista SunStar full-bleed moment */}
          <Reveal as="figure" className="m-0 mx-auto max-w-[1400px] px-6 md:px-10 lg:px-16 py-20">
            <img
              src={asset("/img/welcome/05-arista-sunstar.jpg")}
              alt="Stephen beside the 3.6-metre Arista SunStar at the Farmacy restaurant, Notting Hill"
              loading="lazy"
              className="w-full shadow-liftLg ring-1 ring-white/5"
            />
            <figcaption className="mt-3 text-center font-sans text-[11px] font-medium tracking-widest uppercase text-ink/35">
              {CAPTION_TBD}
            </figcaption>
          </Reveal>
        </main>

        <Footer />
      </div>
    </>
  );
};
