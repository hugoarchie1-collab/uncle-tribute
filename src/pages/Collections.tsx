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

              {/* Very light scrim — just enough darkening behind the title.
                  The photo should read clearly through it. */}
              <div
                aria-hidden
                className="absolute inset-0 z-[1] pointer-events-none"
                style={{
                  background:
                    "radial-gradient(60% 40% at 50% 20%, rgba(10,9,8,0.45) 0%, rgba(10,9,8,0.05) 100%)",
                }}
              />

              <div className="relative z-[2] mx-auto max-w-[1320px] px-4 md:px-8 lg:px-12 pt-20 md:pt-28 pb-16 md:pb-20">
                <Reveal as="header" className="max-w-[780px] mx-auto text-center mb-14 md:mb-20">
                  <p
                    className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-5"
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
                  >
                    {["I", "II", "III"][collIndex]}  ·  {items.length} {items.length === 1 ? "Painting" : "Paintings"}
                  </p>
                  <h2
                    className="font-display font-bold tracking-[-0.035em] text-[clamp(40px,5.8vw,76px)] leading-[1.0] text-white m-0 mb-6 text-balance"
                    style={{ textShadow: "0 3px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
                  >
                    {coll.title}
                  </h2>
                  <div
                    className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.7] text-white/95 flex flex-col gap-4 max-w-[640px] mx-auto"
                    style={{ textShadow: "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
                  >
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
                            <h3
                              className="font-display font-bold text-[16px] md:text-[18px] leading-[1.25] tracking-[-0.015em] text-white m-0"
                              style={{ textShadow: "0 2px 14px rgba(0,0,0,0.8)" }}
                            >
                              {painting.title}
                            </h3>
                            {painting.year && painting.year !== "[ DATE ]" && (
                              <p
                                className="mt-1.5 font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-white/85 m-0"
                                style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
                              >
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
