import { useRef, type RefObject } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal, RevealStagger } from "../components/Reveal";
import { COLLECTIONS, PAINTINGS } from "../data/paintings";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

/**
 * Fixed backdrop layer that cross-fades between collection scenes as the
 * user scrolls. Each backdrop tracks its own section's visibility — when a
 * section is in view, its backdrop fades to full opacity; when leaving, it
 * fades back out. Adjacent backdrops overlap, eliminating the hard
 * horizontal seam between collections.
 */
const ScrollBackdrop = ({
  photoUrl,
  sectionRef,
}: {
  photoUrl: string;
  sectionRef: RefObject<HTMLElement | null>;
}) => {
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  // Hold near full opacity across the bulk of the section so the photo
  // is never invisible while the user is reading the collection. Soft
  // fade at the very edges keeps adjacent collections cross-dissolving.
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.88, 1],
    [0, 1, 1, 0],
  );
  const y = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1.0]);

  return (
    <motion.div
      style={{
        opacity,
        y,
        scale,
        backgroundImage: `url("${photoUrl}")`,
      }}
      className="absolute inset-0 bg-cover bg-center"
      aria-hidden="true"
    />
  );
};

export const Collections = () => {
  usePageTitle("The Collections");

  // One ref per collection section so each backdrop can track its own visibility
  const sectionRefs = [
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
  ];

  return (
    <div className="relative">
      <Nav />

      {/* FIXED BACKDROP LAYER — covers viewport, cross-fades between collections */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {COLLECTIONS.map((coll, i) =>
          coll.backdropImage ? (
            <ScrollBackdrop
              key={coll.id}
              photoUrl={asset(coll.backdropImage)}
              sectionRef={sectionRefs[i]}
            />
          ) : null,
        )}
        {/* Shared scrim — soft vignette so painting tiles + text read clearly */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(75% 60% at 50% 35%, rgba(10,9,8,0.5) 0%, rgba(10,9,8,0.2) 100%)",
          }}
        />
      </div>

      <main className="relative z-10">
        {COLLECTIONS.map((coll, collIndex) => {
          const items = PAINTINGS.filter((p) => p.collection === coll.id);
          return (
            <section
              key={coll.id}
              id={`collection-${coll.id}`}
              ref={sectionRefs[collIndex]}
              className="relative scroll-mt-24"
            >
              <div className="relative mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 pt-3 md:pt-4 pb-10 md:pb-14">
                <Reveal as="header" className="max-w-[820px] mx-auto text-center mb-8 md:mb-10">
                  <p
                    className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-5"
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
                  >
                    {["I", "II", "III"][collIndex]}  ·  {items.length} {items.length === 1 ? "Painting" : "Paintings"}
                  </p>
                  <h2
                    className="font-display font-bold tracking-[-0.04em] text-[clamp(40px,6.4vw,84px)] leading-[0.96] text-white m-0 mb-6 text-balance"
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
                  className="flex flex-wrap justify-center gap-x-5 md:gap-x-7 gap-y-10 md:gap-y-14"
                >
                  {items.map((painting) => {
                    const cover =
                      painting.colourways.find((c) => c.isOriginal) ??
                      painting.colourways[0];
                    return (
                      <motion.figure
                        key={painting.id}
                        className="m-0 w-full sm:w-[calc(50%-0.625rem)] md:w-[calc(50%-0.875rem)] lg:w-[calc(33.333%-1.167rem)]"
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
                              className="font-display font-bold text-[16px] md:text-[18px] leading-[1.2] tracking-[-0.015em] text-white m-0"
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
