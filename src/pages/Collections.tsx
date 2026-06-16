import { useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal, RevealStagger } from "../components/Reveal";
import { AssetImage } from "../components/AssetImage";
import {
  COLLECTIONS,
  PAINTINGS,
  PRINT_TIERS,
  getLowestTierPricePence,
  getCollectionBundle,
  getCompleteCatalogueBundle,
  formatGBP,
  type PrintTier,
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
  isFirst = false,
}: {
  photoUrl: string;
  sectionRef: RefObject<HTMLElement | null>;
  isFirst?: boolean;
}) => {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  // Hold near full opacity across the bulk of the section so the photo
  // is never invisible while the user is reading the collection. Soft
  // fade at the very edges keeps adjacent collections cross-dissolving.
  // The FIRST collection opens at FULL opacity from the top (no fade-up from
  // 0) so the page is never bare black before the first scroll — the intro
  // sits on its backdrop immediately (Hugo: "before scrolling the background
  // is black"). It still fades out normally as the second collection arrives.
  const opacity = useTransform(
    scrollYProgress,
    isFirst ? [0, 0.88, 1] : [0, 0.12, 0.88, 1],
    isFirst ? [1, 1, 0] : [0, 1, 1, 0],
  );
  const y = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);
  // Scroll-tied scale REMOVED (perf): re-sampling a full-viewport bg-cover
  // bitmap at sub-pixel scale every frame, across 3 concurrent layers, was the
  // costliest scroll transform here — for an imperceptible 1.05→1.0 drift behind
  // the dark scrim. y + opacity only now.

  // Promote to a GPU layer ONLY while this collection is in view, so the two
  // off-screen collections don't each hold a full-viewport compositing layer
  // alive for the whole page lifetime (texture memory → mobile jank).
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "20% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [sectionRef]);

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
        backgroundImage: `url("${photoUrl}")`,
        // GPU-promote ONLY the in-view backdrop (gated above) so the scroll-
        // driven y/opacity composite cleanly without keeping promoted full-
        // viewport layers alive for the 2 off-screen collections.
        willChange: inView ? "transform, opacity" : "auto",
      }}
      // OVERSCAN the layer 8% beyond every edge so the ±6% parallax `y` shift
      // can NEVER expose an uncovered strip at the top — that gap was revealing
      // the black page background as a "black bar at the top" of /collections
      // (Hugo). The parent is overflow-hidden, so the overscan is clipped.
      className="absolute inset-[-8%] bg-cover bg-center"
      aria-hidden="true"
    />
  );
};

// -----------------------------------------------------------------------------
// BUNDLE SIZE SELECTOR — which sizes a set may be taken in
// -----------------------------------------------------------------------------
//
// The bundle deals (complete catalogue + per-collection sets) used to be
// hard-wired to the A2 Collector anchor. They are now offered in EVERY editioned
// size the catalogue sells, so the advertised £ tracks the size the buyer picks.
//
// HARD GUARD (money code, brief rule #3): only the three editioned sizes are
// selectable — A3 Gallery (atelier) / A2 Collector (collector) / A1 Atelier
// (atelier-grande). The A0 "heirloom" tier is NEVER a bundle size: it is
// `available:false`, and getTierById would silently fall back to the A2 anchor,
// which would advertise an A2 price under an A0 label (advertised != charged).
// The `studio` one-off is likewise excluded. We derive the list from the
// canonical PRINT_TIERS ladder — honouring each tier's own `available` flag —
// then explicitly allowlist the three permitted ids so flipping `available:true`
// on heirloom/studio elsewhere can NEVER leak them into this selector.
const BUNDLE_TIER_IDS: PrintTier["id"][] = ["atelier", "collector", "atelier-grande"];

// Short, dignified size labels for the toggle (e.g. "Gallery · A3"). Built from
// the live ladder so the size string + price always come from the same source
// of truth as the bundle maths — no hand-typed dimensions to drift.
const BUNDLE_TIERS: PrintTier[] = BUNDLE_TIER_IDS
  .map((id) => PRINT_TIERS.find((t) => t.id === id && t.available && !t.isOneOff))
  .filter((t): t is PrintTier => Boolean(t));

// The default bundle size — the A2 Collector anchor, preserving the prior
// behaviour. Falls back to the first available bundle tier defensively.
const DEFAULT_BUNDLE_TIER: PrintTier =
  BUNDLE_TIERS.find((t) => t.id === "collector") ?? BUNDLE_TIERS[0];

// "A2 (42 × 59.4 cm)" → "A2" for the compact toggle chip.
const sizeCode = (tier: PrintTier): string => tier.size.split(" ")[0];
// "Collector Drop" → "Collector" for the compact toggle chip.
const editionWord = (tier: PrintTier): string =>
  tier.label.replace(/['’]s Edition$/, "").replace(/ (Edition|Drop)$/, "");

export const Collections = () => {
  // One ref per collection section so each backdrop can track its own visibility
  const sectionRefs = [
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
  ];

  // Page-level bundle SIZE — governs BOTH the complete-catalogue panel and every
  // per-collection set card, so one toggle re-prices every set deal in step.
  // Defaults to the A2 Collector anchor (prior behaviour). Only ever holds one
  // of the three editioned sizes (see BUNDLE_TIERS guard) — never A0/studio.
  const [bundleTier, setBundleTier] = useState<PrintTier>(DEFAULT_BUNDLE_TIER);

  // Flagship "complete catalogue" set — one print of every painting at the
  // SELECTED size, at the deepest bundle (15%). The £ figures track the size;
  // adding pushes every painting (original colourway, SELECTED tier) to the
  // basket, so checkout's bundlePercentOff sees one line of every painting and
  // applies the matching 15% — advertised == charged at this size.
  const catalogue = getCompleteCatalogueBundle(bundleTier.id);
  // Render the catalogue's three figures (set price · individual total · saving)
  // with ONE decimal style: strip ".00" when they are all whole pounds, but keep
  // full pence the moment any one lands on a half-pound (e.g. the A3 tier's
  // 15%-off total) so the trio never reads as a ragged "£2,450 / £2,082.50" mix.
  // Nothing is rounded — advertised still equals charged.
  const catalogueWhole =
    catalogue.bundlePricePence % 100 === 0 &&
    catalogue.fullPricePence % 100 === 0 &&
    catalogue.savePence % 100 === 0;
  const fmtCatalogue = (pence: number) =>
    catalogueWhole ? formatGBP(pence).replace(".00", "") : formatGBP(pence);
  const acquireCatalogue = () => {
    catalogue.items.forEach((it) =>
      addItem(it.paintingId, it.colourwayName, bundleTier.id),
    );
  };

  return (
    <div className="relative">
      {/* This browse page is the natural ranker for the category head terms
          ("mandala art prints", "sacred geometry prints"). Title + description
          lead with the product category, then the collection names. The on-page
          H1 ("The complete works.") is unchanged. */}
      <Seo
        title="Mandala & Sacred Geometry Art Prints — The Collection"
        description="Browse mandala and sacred-geometry art prints by Stephen Meakin across three collections — Habundia, Genesis and Born in the Sky. Estate-stamped giclée prints, made to order, free worldwide delivery."
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
              isFirst={i === 0}
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
            // Top kept LIGHT (0.38) so the blurred collection backdrop shows
            // through behind the overlay nav instead of stacking with the nav's
            // own gradient into a black bar at the very top (Hugo). Ramps darker
            // toward the foot for the catalogue/footer seam; the page-intro +
            // tile copy carry their own text-shadow for legibility.
            background:
              "linear-gradient(180deg, rgba(8,7,6,0.38) 0%, rgba(8,7,6,0.60) 42%, rgba(8,7,6,0.80) 100%)",
          }}
        />
      </div>

      <main className="relative z-10">
        {/* PAGE INTRO — bold masthead (the AboutMasthead grammar): a meta rule,
            the name set ENORMOUS edge-to-edge (Fraunces 700, opsz 48), then the
            opening passage packed immediately beneath a hairline — so the very
            first screen is dense, confident type, not a small centred header
            stranded in air. Generic + future-proof: it deliberately does NOT
            name or count the collections, so it never goes stale as new
            collections / colourways are released. */}
        <Reveal
          as="header"
          className="relative mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-20 md:pt-24 pb-6 md:pb-8"
        >
          <div
            className="flex items-center gap-4 md:gap-6 border-b border-line pb-4 md:pb-5"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
          >
            <span className={EYEBROW}>Everything he finished</span>
            <span aria-hidden="true" className="h-px flex-1 bg-ink/15" />
            <span className={cn(EYEBROW_MUTED, "shrink-0")}>The estate catalogue</span>
          </div>

          <h1
            className="font-display font-bold tracking-[-0.045em] text-ink m-0 mt-3 md:mt-4 leading-[0.82]"
            style={{
              fontVariationSettings: '"opsz" 48, "wght" 700',
              fontSize: "clamp(60px, 11vw, 184px)",
              textShadow: "0 3px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)",
            }}
          >
            The complete works.
          </h1>

          <div className="mt-4 md:mt-6 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-4 items-start border-t border-line pt-5 md:pt-6">
            <p
              className={cn(SUBTITLE, "lg:col-span-8 max-w-none my-0")}
              style={{ textShadow: "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
            >
              Every painting Stephen completed, offered as an estate-stamped giclée and made to order. New colourways are released as the estate brings them to print.
            </p>
            <div className="lg:col-span-4 lg:text-right">
              <Link
                to="/for-you"
                className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold tracking-[0.16em] uppercase text-ink-muted hover:text-accent transition-colors duration-300"
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
              >
                Not sure where to start? Browse by colour <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {/* BUNDLE SIZE — one page-level control that re-prices every set deal
              (the per-collection cards + the complete-catalogue panel) in step.
              Dignified register: "Offered as a set in", a quiet segmented
              control in the brand palette — never a loud "CHOOSE SIZE" CTA.
              Only the three editioned sizes appear (A0/studio are guarded out
              in BUNDLE_TIERS), so the advertised £ always equals what checkout
              charges at that size. */}
          {BUNDLE_TIERS.length > 1 && (
            <div className="mt-5 md:mt-6">
              <p
                className={cn(EYEBROW, "m-0 mb-3")}
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
              >
                Offered as a set in
              </p>
              <div
                role="radiogroup"
                aria-label="Choose the print size for the set deals"
                className="inline-flex flex-wrap justify-center gap-1 p-1 bg-[rgba(10,9,8,0.72)] ring-1 ring-line"
              >
                {BUNDLE_TIERS.map((tier) => {
                  const active = tier.id === bundleTier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setBundleTier(tier)}
                      className={cn(
                        "px-4 sm:px-5 py-2.5 font-sans text-[12.5px] leading-none transition-colors duration-300",
                        "focus:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                        active
                          ? "bg-ink text-bg font-semibold"
                          : "text-ink-muted hover:text-ink",
                      )}
                    >
                      <span className="font-semibold tracking-[0.04em]">
                        {sizeCode(tier)}
                      </span>
                      <span
                        className={cn(
                          "ml-2",
                          active ? "text-bg/70" : "text-ink-muted/70",
                        )}
                      >
                        {editionWord(tier)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Reveal>

        {COLLECTIONS.map((coll, collIndex) => {
          const items = PAINTINGS.filter((p) => p.collection === coll.id);
          // Bundle priced at the page-selected SIZE — the £ figures track the
          // toggle, the discount % (5% at 2 paintings / 10% at 3+) is
          // size-independent and mirrors api/checkout.ts.
          const bundle = getCollectionBundle(coll.id, bundleTier.id);
          // Short collection name for the CTA copy ("the complete Habundia"),
          // dropping the long subtitle after the em-dash.
          const shortName = coll.title.split(" — ")[0];
          // Add every painting in the collection to the basket at the SELECTED
          // tier, preserving each painting's original colourway. basket.ts is
          // the single source of truth for the store. Pushing one line per
          // painting at this tier is exactly what makes checkout's
          // bundlePercentOff return the advertised % at this size.
          const acquireCollection = () => {
            items.forEach((p) => {
              const original =
                p.colourways.find((c) => c.isOriginal && c.available) ??
                p.colourways.find((c) => c.available) ??
                p.colourways[0];
              if (original) addItem(p.id, original.name, bundleTier.id);
            });
          };
          return (
            <section
              key={coll.id}
              id={`collection-${coll.id}`}
              ref={sectionRefs[collIndex]}
              className="relative scroll-mt-24"
            >
              <div className="relative mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-3 md:pt-4 pb-10 md:pb-14">
                <Reveal as="header" className="max-w-[820px] mx-auto text-center mb-6 md:mb-8">
                  <p
                    className={cn(EYEBROW, "m-0 mb-4")}
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
                  >
                    {["I", "II", "III"][collIndex]}
                    <span className="mx-2 text-ink/35" aria-hidden="true">·</span>
                    {items.length} {items.length === 1 ? "Painting" : "Paintings"}
                  </p>
                  <h2
                    className={cn(TITLE, "max-w-[820px] mx-auto my-0 mb-4")}
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
                  className="flex flex-wrap justify-center gap-x-5 md:gap-x-7 gap-y-8 md:gap-y-8"
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
                        // Each tile drives its OWN whileInView (not the parent
                        // RevealStagger orchestration) with amount:0 so ANY sliver
                        // of visibility commits the reveal. This guarantees tall
                        // grids on short/landscape heights — and tiles below the
                        // fold when deep-linking to #collection-<id> — never get
                        // stranded at opacity:0 (the parent's once:true threshold
                        // could already be past at mount). The committed "show"
                        // state is opacity:1, so the worst case is a non-animated
                        // but fully-visible tile.
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0, margin: "0px 0px -5% 0px" }}
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
                            {/* Gentle zoom on hover only — a small scale-up of the
                                cover. Hugo: hover should zoom in a little, never
                                flick to another colourway. */}
                            <div className="relative w-full h-full transition-transform duration-700 group-hover:scale-[1.04]">
                              <AssetImage
                                src={cover.image}
                                alt={painting.title}
                                loading="lazy"
                                decoding="async"
                                sizes="(min-width: 1400px) 420px, (min-width: 640px) 30vw, 90vw"
                                className="w-full h-full object-cover"
                              />
                            </div>
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
                                the LOWEST visible tier (A3 Gallery £245) to
                                lower the click barrier — the £450 anchor still
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
                    Born in the Sky) — so the number is always honest. The %
                    is size-independent; the £ figures track the page-selected
                    bundle size (bundleTier). Clicking adds every painting at
                    that selected tier to the basket; the buyer reviews +
                    completes on /basket. */}
                {bundle && items.length > 1 && (
                  <Reveal
                    as="div"
                    className="mt-6 md:mt-8 mx-auto max-w-[820px]"
                  >
                    <div className="bg-[rgba(10,9,8,0.82)] ring-1 ring-line px-6 sm:px-8 md:px-10 py-8 md:py-10 text-center">
                      <p className={cn(EYEBROW, "m-0 mb-4")}>
                        The complete collection
                      </p>
                      <h3 className="font-display font-semibold tracking-[-0.025em] text-[clamp(24px,2.6vw,36px)] leading-[1.2] text-ink m-0 mb-3">
                        The complete {shortName}
                      </h3>
                      <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.7] text-ink-muted my-0 mb-2 max-w-[640px] mx-auto">
                        All {bundle.paintingIds.length} paintings at the{" "}
                        {editionWord(bundleTier)} edition ({sizeCode(bundleTier)})
                        — the collection entire, for one home.
                      </p>
                      <p className="font-sans text-[13.5px] leading-[1.6] text-ink-muted m-0 mb-6">
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
                        The set saving is applied automatically at checkout.
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
          className="relative mx-auto max-w-[820px] 2xl:max-w-[960px] 3xl:max-w-[1040px] px-4 sm:px-6 md:px-8 lg:px-12 pb-8 md:pb-14"
        >
          <div className="bg-[rgba(10,9,8,0.85)] ring-1 ring-line px-6 sm:px-8 md:px-10 lg:px-14 py-8 md:py-12 lg:py-14 text-center">
            <p className={cn(EYEBROW, "m-0 mb-4")}>
              The complete catalogue
            </p>
            <h2 className={cn(TITLE, "max-w-[640px] mx-auto my-0 mb-4")}>
              His life's work, in one collection.
            </h2>
            <p className={cn(SUBTITLE, "max-w-[560px] mx-auto my-0 mb-6")}>
              One estate-stamped {editionWord(bundleTier)} print (
              {sizeCode(bundleTier)}) of all {catalogue.paintingCount} of
              Stephen's paintings: the entire, finite body of his work, gathered
              for one home.
            </p>
            <p className="font-sans text-[14px] leading-[1.6] text-ink-muted m-0 mb-6">
              <span className="font-display font-semibold text-[22px] md:text-[26px] text-ink align-middle">
                {fmtCatalogue(catalogue.bundlePricePence)}
              </span>
              <span className="mx-3 text-ink/35">·</span>
              <span>
                individually {fmtCatalogue(catalogue.fullPricePence)},
                a saving of {fmtCatalogue(catalogue.savePence)}
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
              The set saving is applied automatically at checkout.
            </p>
          </div>
        </Reveal>
      </main>

      <Footer />
    </div>
  );
};
