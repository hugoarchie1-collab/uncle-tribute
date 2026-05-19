import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { CollectionBackdrop } from "../components/CollectionBackdrop";
import { Reveal, RevealStagger } from "../components/Reveal";
import { motion } from "framer-motion";
import { Card } from "../components/ui/card";
import { COLLECTIONS, PAINTINGS } from "../data/paintings";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

export const Collections = () => {
  usePageTitle("The Collections");

  return (
    <div className="bg-bg">
      <Nav />
      <main>
        {COLLECTIONS.map((coll) => {
          const items = PAINTINGS.filter((p) => p.collection === coll.id);
          return (
            <section
              key={coll.id}
              className="relative isolate overflow-hidden border-t border-line first-of-type:border-t-0"
            >
              <CollectionBackdrop
                collectionId={coll.id}
                photoUrl={coll.backdropImage ? asset(coll.backdropImage) : undefined}
              />
              <div
                aria-hidden
                className="absolute inset-0 z-[1] pointer-events-none"
                style={{
                  background:
                    "radial-gradient(120% 80% at 50% 50%, transparent 0%, rgba(0,0,0,0.35) 100%), linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.65) 100%)",
                }}
              />

              <div className="relative z-[2] mx-auto max-w-[1400px] px-6 md:px-10 lg:px-16 py-24 md:py-36">
                <Reveal as="header" className="mb-16 md:mb-24">
                  <Card className="max-w-[680px] bg-black/50 text-ink ring-1 ring-white/8 backdrop-blur-xl p-8 md:p-12 shadow-liftLg">
                    <h2 className="font-display font-bold tracking-tightest text-h2 text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)] m-0 mb-6">
                      {coll.title}
                    </h2>
                    <div className="font-sans font-light text-body leading-loose text-white/90 flex flex-col gap-4 drop-shadow-[0_1px_12px_rgba(0,0,0,0.45)]">
                      {coll.description.split("\n\n").map((para, i) => (
                        <p key={i} className="m-0">{para}</p>
                      ))}
                    </div>
                  </Card>
                </Reveal>

                <RevealStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                  {items.map((painting) => {
                    const cover =
                      painting.colourways.find((c) => c.isOriginal) ??
                      painting.colourways[0];
                    return (
                      <motion.div
                        key={painting.id}
                        variants={{
                          hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
                          show: {
                            opacity: 1, y: 0, filter: "blur(0px)",
                            transition: { duration: 0.8, ease: [0.22, 0.61, 0.36, 1] },
                          },
                        }}
                      >
                        <Link
                          to={`/collections/${painting.id}`}
                          className="group block"
                        >
                          <Card className="p-5 transition-all duration-500 ease-smooth group-hover:-translate-y-1 group-hover:shadow-liftLg">
                            <div className="aspect-square overflow-hidden bg-cream-soft">
                              <img
                                src={asset(cover.image)}
                                alt={painting.title}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-700 ease-smooth group-hover:scale-[1.03]"
                              />
                            </div>
                            <div className="pt-4 text-center">
                              <h3 className="font-display text-[22px] font-semibold tracking-tight leading-snug text-cream-ink m-0">
                                {painting.title}
                              </h3>
                              {painting.year !== "[ DATE ]" && (
                                <p className="mt-1.5 font-sans text-[11px] font-medium tracking-widest uppercase text-cream-ink/55 m-0">
                                  {painting.year}
                                </p>
                              )}
                            </div>
                          </Card>
                        </Link>
                      </motion.div>
                    );
                  })}
                </RevealStagger>
              </div>
            </section>
          );
        })}
      </main>
      <Footer />
    </div>
  );
};
