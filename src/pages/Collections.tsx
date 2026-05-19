import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
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
        {/* Page header */}
        <section className="mx-auto max-w-[1100px] px-6 md:px-10 lg:px-16 pt-28 md:pt-40 pb-16 text-center">
          <Reveal>
            <p className="font-sans text-[10px] font-medium tracking-[0.32em] uppercase text-accent m-0 mb-5">
              The Collections
            </p>
            <h1 className="font-display font-light italic tracking-[-0.02em] text-[clamp(40px,6vw,76px)] leading-[1.04] text-ink m-0">
              A lifetime of work
            </h1>
          </Reveal>
        </section>

        {COLLECTIONS.map((coll, collIndex) => {
          const items = PAINTINGS.filter((p) => p.collection === coll.id);
          return (
            <section
              key={coll.id}
              id={`collection-${coll.id}`}
              className={`relative mx-auto max-w-[1280px] px-6 md:px-10 lg:px-16 py-20 md:py-28 ${
                collIndex > 0 ? "border-t border-white/8" : ""
              }`}
            >
              <Reveal as="header" className="max-w-[720px] mx-auto text-center mb-16 md:mb-20">
                <p className="font-sans text-[10px] font-medium tracking-[0.32em] uppercase text-accent m-0 mb-5">
                  {["I", "II", "III"][collIndex]}  ·  {items.length} {items.length === 1 ? "Painting" : "Paintings"}
                </p>
                <h2 className="font-display font-light italic tracking-[-0.02em] text-[clamp(36px,5vw,64px)] leading-[1.04] text-ink m-0 mb-8 text-balance">
                  {coll.title}
                </h2>
                <div className="font-sans font-light text-[16px] md:text-[17px] leading-[1.85] text-ink/80 flex flex-col gap-4 max-w-[620px] mx-auto">
                  {coll.description.split("\n\n").map((para, i) => (
                    <p key={i} className="m-0">{para}</p>
                  ))}
                </div>
              </Reveal>

              <RevealStagger
                delay={0.06}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14 md:gap-y-20"
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
                        hidden: { opacity: 0, y: 16 },
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
                        <div className="aspect-square overflow-hidden ring-1 ring-white/10 shadow-[0_18px_44px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:ring-accent/40 group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
                          <img
                            src={asset(cover.image)}
                            alt={painting.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                          />
                        </div>
                        <figcaption className="pt-5 text-center">
                          <h3 className="font-display font-normal italic text-[22px] leading-[1.2] tracking-[-0.01em] text-ink m-0">
                            {painting.title}
                          </h3>
                          {painting.year && painting.year !== "[ DATE ]" && (
                            <p className="mt-2 font-sans text-[10px] font-medium tracking-[0.28em] uppercase text-ink/55 m-0">
                              {painting.year}
                            </p>
                          )}
                        </figcaption>
                      </Link>
                    </motion.figure>
                  );
                })}
              </RevealStagger>
            </section>
          );
        })}
      </main>
      <Footer />
    </div>
  );
};
