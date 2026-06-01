import { useRef, type RefObject } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
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
  getCompleteCatalogueBundle,
  formatGBP,
} from "../data/paintings";
import { addItem } from "../lib/basket";
import { asset } from "../lib/asset";
import { Seo } from "../components/Seo";
import { cn } from "../lib/cn";
import { BTN_PRIMARY, EYEBROW, EYEBROW_MUTED, TITLE, SUBTITLE } from "../components/ui/tokens";

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
  const reduceMotion = useReducedMotion();
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

  // Reduced-motion: drop the parallax/scale entirely, hold the backdrop at a
  // calm static opacity, and release the GPU layer (will-change:auto) so we
  // don't keep a promoted compositing layer alive for motion that never runs.
  if (reduceMotion) {
    return (
      <div
        style={{
          opacity: 0.5,
          backgroundImage: `url("${photoUrl}")`,
          willChange: "auto",
        }}
        className="absolute inset-0 bg-cover bg-center"
        aria-hidden="true"
      />
    );
  }

  return (
    <motion.div
      style={{
        opacity,
        y,
        scale,
        backgroundImage: `url("${photoUrl}")`,
        // Promote each backdrop to its own GPU layer so the scroll-driven
        // opacity/y/scale composite cleanly (GPU transform + opacity only —
        // no background-attachment:fixed, no layout-triggering props) instead
        // of repainting the large background image every frame as the user
        // scrolls past.
        willChange: "transform, opacity",
      }}
      className="absolute inset-0 bg-cover bg-center"
      aria-hidden="true"
    />
  );
};

export const Collections = () => {
  // One ref per collection section so each backdrop can track its own visibility
  const sectionRefs = [
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
  ];

  // Flagship "complete catalogue" set — one A2 print of every painting at the
  // deepest bundle (15%). Adding pushes every painting (original colourway,
  // anchor tier) to the basket; the matching 15% is applied at checkout.
  const catalogue = getCompleteCatalogueBundle();
  const acquireCatalogue = () => {
    catalogue.items.forEach((it) =>
      addItem(it.paintingId, it.colourwayName, "collector"),
    );
  };

  return (
    <div className="relative">
      <Seo
        title="The Collections"
        description="Habundia, Genesis and Born in the Sky — three collections of Stephen Meakin's mandala paintings, each offered as an estate-stamped giclée print, individually made to order."
        url="/collections"
      />
      <Nav overlay />

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
            // Stronger, even darkening so the cream (text-ink) copy stays
            // legible over the bright collection photos while the photo
            // remains as a subdued, moody texture (matches the dark brand).
            background:
              "linear-gradient(180deg, rgba(8,7,6,0.82) 0%, rgba(8,7,6,0.66) 45%, rgba(8,7,6,0.82) 100%)",
          }}
        />
      </div>

      <main className="relative z-10">
        {/* PAGE INTRO — generic, future-proof opener. Deliberately does NOT
            name or count the collections, so it never goes stale as new
            collections / colourways are released. */}
        <Reveal
          as="header"
          className="relative mx-auto max-w-[820px] px-4 sm:px-6 md:px-8 lg:px-12 pt-24 md:pt-32 pb-6 md:pb-10 text-center"
        >
          <p
            className={cn(EYEBROW, "m-0 mb-5")}
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
          >
            The Collections
          </p>
          <h1
            className={cn(TITLE, "max-w-[820px] mx-auto m-0 mb-6")}
            style={{ textShadow: "0 3px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
          >
            Estate-stamped editions.
          </h1>
          <p
            className={cn(SUBTITLE, "max-w-[640px] mx-auto m-0")}
            style={{ textShadow: "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
          >
            Every painting Stephen completed, offered as an estate-stamped giclée and made to order. The estate releases further works and colourways over time.
          </p>
          <Link
            to="/for-you"
            className="inline-flex items-center gap-1.5 mt-7 font-sans text-[11px] font-bold tracking-[0.16em] uppercase text-ink-muted hover:text-accent transition-colors duration-300"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
          >
            Find the print for you <span aria-hidden="true">→</span>
          </Link>
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
              <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 pt-3 md:pt-4 pb-10 md:pb-14">
                <Reveal as="header" className="max-w-[820px] mx-auto text-center mb-8 md:mb-10">
                  <p
                    className={cn(EYEBROW, "m-0 mb-5")}
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
                  >
                    {["I", "II", "III"][collIndex]}
                    <span className="mx-2 text-ink/35" aria-hidden="true">·</span>
                    {items.length} {items.length === 1 ? "Painting" : "Paintings"}
                  </p>
                  <h2
                    className={cn(TITLE, "max-w-[820px] mx-auto m-0 mb-6")}
                    style={{ textShadow: "0 3px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
                  >
                    {coll.title}
                  </h2>
                  <div
                    className={cn(SUBTITLE, "flex flex-col gap-4 max-w-[640px] mx-auto")}
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
                        // flex-wrap + justify-center + a clamped flex-basis so a
                        // partial last row CENTRES at every width (no left-aligned
                        // orphan). min-w-0 lets the basis shrink below content on
                        // narrow viewports so a long title can never widen the row
                        // past the viewport.
                        className="m-0 min-w-0 flex-[0_1_clamp(280px,30%,420px)]"
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
                          <div className="aspect-square overflow-hidden ring-1 ring-white/8 transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
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
                              className="font-display font-semibold text-[16px] md:text-[18px] leading-[1.25] tracking-[-0.015em] text-ink m-0 transition-colors duration-300 group-hover:text-accent"
                              style={{ textShadow: "0 2px 14px rgba(0,0,0,0.8)" }}
                            >
                              {painting.title}
                            </h3>
                            {painting.year && painting.year !== "[ DATE ]" && (
                              <p
                                className={cn(EYEBROW_MUTED, "mt-1.5 m-0")}
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
                              className="mt-2 font-sans text-[13px] leading-[1.6] text-ink-muted m-0"
                              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
                            >
                              Estate-stamped giclée · from {formatGBP(getLowestTierPricePence(painting)).replace(".00", "")}
                            </p>
                          </figcaption>
                        </Link>
                      </motion.figure>
                    );
                  })}
                </RevealStagger>

                {/* COMPLETE-COLLECTION CARD — offer the whole collection as a
                    curated set. Dignified estate register: "offered as a set",
                    not a sale. The saving shown (save figure + net price) is
                    computed by getCollectionBundle to match exactly what the
                    checkout's bundle coupon applies for this collection's item
                    count — 5% at 2 paintings (Habundia), 10% at 3+ (Genesis,
                    Born in the Sky) — so the number is always honest.
                    Clicking adds every painting (anchor A2 tier) to the basket;
                    the buyer reviews + completes on /basket. */}
                {bundle && items.length > 1 && (
                  <Reveal
                    as="div"
                    className="mt-12 md:mt-16 mx-auto max-w-[720px]"
                  >
                    <div className="bg-[rgba(10,9,8,0.82)] ring-1 ring-line px-6 sm:px-8 md:px-10 py-8 md:py-10 text-center">
                      <p className={cn(EYEBROW, "m-0 mb-4")}>
                        The complete collection
                      </p>
                      <h3 className="font-display font-semibold tracking-[-0.025em] text-[clamp(24px,2.6vw,36px)] leading-[1.2] text-ink m-0 mb-3">
                        The complete {shortName}
                      </h3>
                      <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.7] text-ink-muted m-0 mb-2 max-w-[520px] mx-auto">
                        All {bundle.paintingIds.length} paintings at the Collector
                        edition (A2) — the collection entire, for one home.
                      </p>
                      <p className="font-sans text-[13.5px] leading-[1.6] text-ink-muted m-0 mb-7">
                        <span className="font-semibold text-ink">
                          {formatGBP(bundle.bundlePricePence).replace(".00", "")}
                        </span>
                        <span className="mx-2 text-ink/35">·</span>
                        the set, offered together
                      </p>
                      <button
                        type="button"
                        onClick={acquireCollection}
                        className={cn(BTN_PRIMARY, "gap-2")}
                      >
                        Add the complete collection to basket
                        <span aria-hidden="true">→</span>
                      </button>
                      <p className="font-sans text-[11px] tracking-[0.03em] text-ink-muted m-0 mt-4">
                        The set saving is applied at checkout.
                      </p>
                    </div>
                  </Reveal>
                )}
              </div>
            </section>
          );
        })}

        {/* COMPLETE CATALOGUE — the flagship set: one estate-stamped print of
            every painting. Deepest bundle (15%), framed as a dignified
            "complete works" set price with the individual total shown small as
            an anchor and the saving in absolute £ (never a "% OFF" badge — per
            the 2026-05-29 pricing research). getCompleteCatalogueBundle
            computes the figure; api/checkout.ts applies the matching 15% when
            the basket holds one line of every painting. */}
        <Reveal
          as="section"
          className="relative mx-auto max-w-[820px] px-4 sm:px-6 md:px-8 lg:px-12 pb-16 md:pb-24"
        >
          <div className="bg-[rgba(10,9,8,0.85)] ring-1 ring-line px-6 sm:px-10 md:px-14 py-10 md:py-14 text-center">
            <p className={cn(EYEBROW, "m-0 mb-5")}>
              The complete catalogue
            </p>
            <h2 className={cn(TITLE, "max-w-[640px] mx-auto m-0 mb-4")}>
              The complete works, together.
            </h2>
            <p className={cn(SUBTITLE, "max-w-[560px] mx-auto m-0 mb-6")}>
              One estate-stamped Collector print (A2) of all{" "}
              {catalogue.paintingCount} of Stephen's paintings: the entire,
              finite body of his work, gathered for one home.
            </p>
            <p className="font-sans text-[14px] leading-[1.6] text-ink-muted m-0 mb-8">
              <span className="font-display font-semibold text-[22px] md:text-[26px] text-ink align-middle">
                {formatGBP(catalogue.bundlePricePence).replace(".00", "")}
              </span>
              <span className="mx-3 text-ink/35">·</span>
              <span>
                individually {formatGBP(catalogue.fullPricePence).replace(".00", "")},
                a saving of {formatGBP(catalogue.savePence).replace(".00", "")}
              </span>
            </p>
            <button
              type="button"
              onClick={acquireCatalogue}
              className={cn(BTN_PRIMARY, "gap-2")}
            >
              Add the complete catalogue to basket
              <span aria-hidden="true">→</span>
            </button>
            <p className="font-sans text-[11px] tracking-[0.03em] text-ink-muted m-0 mt-4">
              The set saving is applied at checkout.
            </p>
          </div>
        </Reveal>
      </main>

      <FooterCatalogue />
      <Footer />
    </div>
  );
};
