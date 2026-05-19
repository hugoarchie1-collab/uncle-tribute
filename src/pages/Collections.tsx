import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { CollectionBackdrop } from "../components/CollectionBackdrop";
import { Reveal, RevealStagger } from "../components/Reveal";
import { motion } from "framer-motion";
import { COLLECTIONS, PAINTINGS } from "../data/paintings";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

export const Collections = () => {
  usePageTitle("The Collections");

  return (
    <div className="relative bg-bg">
      <Nav />
      <main className="relative">
        {COLLECTIONS.map((coll, collIndex) => {
          const items = PAINTINGS.filter((p) => p.collection === coll.id);
          return (
            <section
              key={coll.id}
              id={`collection-${coll.id}`}
              className="relative overflow-hidden"
            >
              <CollectionBackdrop
                collectionId={coll.id}
                photoUrl={coll.backdropImage ? asset(coll.backdropImage) : undefined}
              />

              {/* Soft focal scrim — keeps the title legible without crushing the photo */}
              <div
                aria-hidden
                className="absolute inset-0 z-[1] pointer-events-none"
                style={{
                  background:
                    "radial-gradient(70% 55% at 50% 25%, rgba(10,9,8,0.6) 0%, rgba(10,9,8,0.25) 100%)",
                }}
              />

              <div className="relative z-[2] mx-auto max-w-[1320px] px-4 md:px-8 lg:px-12 pt-20 md:pt-28 pb-16 md:pb-20">
                <Reveal as="header" className="max-w-[760px] mx-auto text-center mb-14 md:mb-20">
                  <p className="font-sans text-[11px] font-semibold tracking-[0.34em] uppercase text-accent m-0 mb-5 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">
                    {["I", "II", "III"][collIndex]}  ·  {items.length} {items.length === 1 ? "Painting" : "Paintings"}
                  </p>
                  <h2 className="font-display font-semibold italic tracking-[-0.02em] text-[clamp(40px,6vw,78px)] leading-[1.02] text-ink m-0 mb-7 text-balance drop-shadow-[0_2px_24px_rgba(0,0,0,0.7)]">
                    {coll.title}
                  </h2>
                  <div className="font-sans font-normal text-[17px] md:text-[18px] leading-[1.75] text-ink/90 flex flex-col gap-4 max-w-[640px] mx-auto drop-shadow-[0_1px_12px_rgba(0,0,0,0.55)]">
                    {coll.description.split("\n\n").map((para, i) => (
                      <p key={i} className="m-0">{para}</p>
                    ))}
                  </div>
                </Reveal>

                <RevealStagger
                  delay={0.05}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 md:gap-x-7 gap-y-10 md:gap-y-14"
                >
                  {items.map((painting) => {
                    const cover =
                      painting.colourways.find((c) => c.isOriginal) ??
                      painting.colourways[0];
                    return (
                      <motion.figure
                        key={painting.id}
                        className="m-0"
                        variants={{
                          hidden: { opacity: 0, y: 14 },
                          show: {
                            opacity: 1, y: 0,
                            transition: { duration: 0.55, ease: [0.22, 0.61, 0.36, 1] },
                          },
                        }}
                      >
                        <Link
                          to={`/collections/${painting.id}`}
                          className="group block"
                          aria-label={`View ${painting.title}`}
                        >
                          <div className="aspect-square overflow-hidden shadow-[0_22px_50px_rgba(0,0,0,0.6)] transition-all duration-500 group-hover:shadow-[0_30px_70px_rgba(0,0,0,0.75)]">
                            <img
                              src={asset(cover.image)}
                              alt={painting.title}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                            />
                          </div>
                          <figcaption className="pt-4 text-center">
                            <h3 className="font-display font-semibold italic text-[22px] md:text-[24px] leading-[1.2] tracking-[-0.01em] text-ink m-0 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
                              {painting.title}
                            </h3>
                            {painting.year && painting.year !== "[ DATE ]" && (
                              <p className="mt-1.5 font-sans text-[10px] font-semibold tracking-[0.32em] uppercase text-ink/70 m-0">
                                {painting.year}
                              </p>
                            )}
                          </figcaption>
                        </Link>
                      </motion.figure>
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
