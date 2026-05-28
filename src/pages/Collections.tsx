import { useRef, type RefObject } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal, RevealStagger } from "../components/Reveal";
import { AssetImage } from "../components/AssetImage";
import {
  COLLECTIONS,
  PAINTINGS,
  getLowestTierPricePence,
  getCollectionBundle,
  formatGBP,
} from "../data/paintings";
import { addItem } from "../lib/basket";
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
        // Promote each backdrop to its own GPU layer so the scroll-driven
        // opacity/y/scale composite cleanly instead of repainting the large
        // background image every frame as the user scrolls past.
        willChange: "transform, opacity",
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
        {/* PAGE INTRO — generic, future-proof opener. Deliberately does NOT
            name or count the collections, so it never goes stale as new
            collections / colourways are released. */}
        <Reveal
          as="header"
          className="relative mx-auto max-w-[820px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-16 pb-6 md:pb-10 text-center"
        >
          <p
            className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-5"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
          >
            The Collections
          </p>
          <h1
            className="font-display font-bold tracking-[-0.04em] text-[clamp(36px,5.2vw,72px)] leading-[0.98] text-white m-0 mb-6 text-balance"
            style={{ textShadow: "0 3px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
          >
            Signed editions from the estate.
          </h1>
          <p
            className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.7] text-white/95 max-w-[640px] mx-auto m-0"
            style={{ textShadow: "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
          >
            Each of Stephen's paintings is offered as an estate-stamped giclée print, individually made to order. New collections and colourways are released by the estate over time.
          </p>
        </Reveal>

        {COLLECTIONS.map((coll, collIndex) => {
          const items = PAINTINGS.filter((p) => p.collection === coll.id);
          const bundle = getCollectionBundle(coll.id);
          // Short collection name for the CTA copy ("the complete Habundia"),
          // dropping the long subtitle after the em-dash.
          const shortName = coll.title.split(" — ")[0];
          // Add every painting in the collection to the basket at the anchor
          // (Collector A2) tier, preserving each painting's original
          // colourway. basket.ts is the single source of truth for the store.
          const acquireCollection = () => {
            items.forEach((p) => {
              const original =
                p.colourways.find((c) => c.isOriginal && c.available) ??
                p.colourways.find((c) => c.available) ??
                p.colourways[0];
              if (original) addItem(p.id, original.name, "collector");
            });
          };
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
                          <div className="aspect-square overflow-hidden shadow-[0_-6px_36px_rgba(0,0,0,0.35),0_20px_44px_rgba(0,0,0,0.45)] transition-all duration-500 group-hover:shadow-[0_-6px_36px_rgba(0,0,0,0.4),0_26px_60px_rgba(0,0,0,0.6)]">
                            <AssetImage
                              src={cover.image}
                              alt={painting.title}
                              loading="lazy"
                              decoding="async"
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
                            {/* Price floor — sits under every tile so a
                                browsing buyer never needs to click into a
                                painting to learn there is a price. Advertises
                                the LOWEST visible tier (A3 Atelier £145) to
                                lower the click barrier — the £295 anchor still
                                does its conversion work on the product page. */}
                            <p
                              className="mt-2 font-sans text-[11px] font-medium tracking-[0.04em] text-white/85 m-0"
                              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
                            >
                              Signed giclée · from {formatGBP(getLowestTierPricePence(painting)).replace(".00", "")}
                            </p>
                          </figcaption>
                        </Link>
                      </motion.figure>
                    );
                  })}
                </RevealStagger>

                {/* COMPLETE-COLLECTION CARD — offer the whole collection as a
                    curated set. Dignified estate register: "offered as a set",
                    not a sale. The saving advertised here (10%) is exactly what
                    the checkout's 3+-item bundle coupon applies — a full
                    collection is always 3+ paintings — so the number is honest.
                    Clicking adds every painting (anchor A2 tier) to the basket;
                    the buyer reviews + completes on /basket. */}
                {bundle && items.length > 1 && (
                  <Reveal
                    as="div"
                    className="mt-12 md:mt-16 mx-auto max-w-[720px]"
                  >
                    <div className="bg-[rgba(10,9,8,0.82)] ring-1 ring-white/12 px-6 sm:px-8 md:px-10 py-8 md:py-10 text-center">
                      <p className="font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-accent m-0 mb-4">
                        The complete collection
                      </p>
                      <h3 className="font-display font-bold tracking-[-0.025em] text-[clamp(22px,2.6vw,32px)] leading-[1.15] text-white m-0 mb-3">
                        Acquire the complete {shortName}
                      </h3>
                      <p className="font-sans font-normal text-[14.5px] md:text-[15.5px] leading-[1.65] text-white/80 m-0 mb-2 max-w-[520px] mx-auto">
                        All {bundle.paintingIds.length} paintings, offered as a
                        set at the Collector edition (A2) — a single, complete
                        body of Stephen's work for one home.
                      </p>
                      <p className="font-sans text-[13px] tracking-[0.02em] text-white/70 m-0 mb-7">
                        <span className="text-white/45 line-through mr-2">
                          {formatGBP(bundle.fullPricePence).replace(".00", "")}
                        </span>
                        <span className="font-semibold text-white">
                          {formatGBP(bundle.bundlePricePence).replace(".00", "")}
                        </span>
                        <span className="mx-2 text-white/35">·</span>
                        save {formatGBP(bundle.savePence).replace(".00", "")} as
                        the complete set
                      </p>
                      <button
                        type="button"
                        onClick={acquireCollection}
                        className="inline-flex items-center gap-2 bg-ink text-bg px-7 py-3.5 font-sans text-[11px] font-bold tracking-[0.18em] uppercase rounded-full transition-colors duration-300 hover:bg-accent hover:text-ink"
                      >
                        Add the complete collection to basket
                        <span aria-hidden="true">→</span>
                      </button>
                      <p className="font-sans text-[11px] tracking-[0.03em] text-white/45 m-0 mt-4">
                        The set discount is applied automatically at checkout.
                      </p>
                    </div>
                  </Reveal>
                )}
              </div>
            </section>
          );
        })}
      </main>

      <FooterCatalogue />
      <Footer />
    </div>
  );
};
