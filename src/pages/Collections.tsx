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
  bundleDiscountPercentForCount,
  COMPLETE_CATALOGUE_DISCOUNT_PERCENT,
  paintingImageAlt,
  type PrintTier,
} from "../data/paintings";
import { addItem } from "../lib/basket";
import { asset } from "../lib/asset";
import { useCurrency, formatMinorUnits, bundleMinorFigures } from "../lib/currency";
import { Seo } from "../components/Seo";
import { SITE_URL, absoluteUrl } from "../lib/seo";
import { cn } from "../lib/cn";
import { PageMasthead } from "../components/PageMasthead";
import { BTN_PRIMARY, EYEBROW, EYEBROW_MUTED, TITLE, SUBTITLE, META } from "../components/ui/tokens";

// ── CANONICAL CENTRED ENVELOPE ────────────────────────────────────────────────
// One shared max-width axis for the WHOLE page (the page-intro masthead AND every
// collection section AND the catalogue set), so the page sits on a single centred
// vertical axis matching the rest of the site (Hugo: "nothing is centred
// properly"). The page-intro used to run a NARROWER, LEFT-aligned envelope than
// the centred sections below it — the two now share this exact measure (mx-auto,
// equal L/R margins) and the same large-screen step-ups.
const PAGE_ENVELOPE =
  "mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] 4xl:max-w-[1880px] px-4 sm:px-6 md:px-8 lg:px-12";

// ── SOFT SET-CARD SCRIM ───────────────────────────────────────────────────────
// The set cards (complete-collection / compose / catalogue) sit ON the photo
// backdrop. They used to be a HARD ringed dark panel — bg-[rgba(10,9,8,0.82)]
// ring-1 ring-line — i.e. an opaque black rectangle with a hard ring, the exact
// "ringed dark panel" the brief bans. Replaced with a soft scrim that holds dense
// at the centre (where the heading/price/CTA sit) and fades to FULLY TRANSPARENT
// (alpha 0) at every edge, so the card melts into the scene instead of cutting a
// box out of it. No ring, no solid rectangle. The copy keeps its own text-shadow
// legibility via the page scrim beneath; this is the local lift over the photo.
const SET_CARD_SCRIM =
  "radial-gradient(120% 100% at 50% 50%, rgba(9,7,6,0.86) 0%, rgba(9,7,6,0.78) 40%, rgba(9,7,6,0.42) 78%, rgba(9,7,6,0) 100%)";

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
  isLast = false,
}: {
  photoUrl: string;
  sectionRef: RefObject<HTMLElement | null>;
  isFirst?: boolean;
  isLast?: boolean;
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
  // The LAST collection (Born in the Sky — the nebula) NEVER fades out: it
  // EXTENDS through the complete-catalogue panel + footer to the very end of
  // the page (Hugo 2026-07-03: "the nebula as last image, extended — don't
  // add the first one again"): without the hold, the foot fell back to the
  // indigo base wash, which read as the opening image returning.
  const opacity = useTransform(
    scrollYProgress,
    isFirst ? [0, 0.88, 1] : isLast ? [0, 0.12, 1] : [0, 0.12, 0.88, 1],
    isFirst ? [1, 1, 0] : isLast ? [0, 1, 1] : [0, 1, 1, 0],
  );
  // Parallax `y` + the inset-[-8%] overscan were REMOVED (2026-07-13): that
  // transform snapped to a stale scroll position on route change = the
  // "background zooms/jumps on every page click" bug. The scroll-driven OPACITY
  // crossfade STAYS — it's what makes each collection show its OWN backdrop
  // (Hugo: "3 different backgrounds", not born-in-the-sky for everyone).

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
      // 10% (was 20%): release the GPU-promoted backdrop layer sooner once it
      // scrolls away, without dropping so low (5%) that it promotes too late
      // and stalls/flashes on the way in.
      { rootMargin: "10% 0px" },
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
        backgroundImage: `url("${photoUrl}")`,
        // GPU-promote ONLY the in-view backdrop (gated above) so the opacity
        // crossfade composites cleanly without keeping promoted full-viewport
        // layers alive for the 2 off-screen collections. Opacity only now.
        willChange: inView ? "opacity" : "auto",
      }}
      // inset-0 (no overscan) — the overscan only existed to hide the parallax
      // y-shift's edge gap; with y removed there's nothing to overscan for.
      className="absolute inset-0 bg-cover bg-center"
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
// HARD GUARD (money code, brief rule #3): only EDITIONED sizes are selectable —
// A3 Gallery (atelier) / A2 Collector (collector) / A1 Atelier (atelier-grande) /
// A0 Heirloom (heirloom). A0 is now an offered bundle size (Hugo, 2026-06-23):
// heirloom is `available:true` AND charged at its real £1,750 in
// api/checkout.ts TIERS["heirloom"], so getTierById returns the true A0 price
// (no silent A2 anchor fall-back) and advertised == charged holds for A0 sets
// too (the 15%/12%/10%/5% bundle coupon is a percent, far above the A0 margin
// floor, so the checkout's margin-floor clamp is a no-op here). The `studio`
// one-off stays excluded — it is not an edition. We derive the list from the
// canonical PRINT_TIERS ladder — honouring each tier's own `available` flag —
// then explicitly allowlist the permitted ids so an unrelated `available:true`
// flip (e.g. studio) can NEVER leak a tier into this selector.
const BUNDLE_TIER_IDS: PrintTier["id"][] = ["atelier", "collector", "atelier-grande", "heirloom"];

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

// "A2 (42 × 42 cm)" → "A2" for the compact toggle chip.
const sizeCode = (tier: PrintTier): string => tier.size.split(" ")[0];
// "Collector Edition" → "Collector" for the compact toggle chip.
const editionWord = (tier: PrintTier): string =>
  tier.label.replace(/['’]s Edition$/, "").replace(/ (Edition|Drop)$/, "");

// What an edition INCLUDES, in one calm line — the TASCHEN model, so any price
// step reads as CONTENT (size, hand-numbering) rather than a markdown. Built from
// the live ladder: an Open Edition is presented as un-numbered; a capped edition
// states its hand-numbered allocation. No hand-typed dimensions — `size` is the
// source of truth.
const editionInclusions = (tier: PrintTier): string =>
  tier.editionTotal == null
    ? `${tier.size} · estate-stamped, open edition`
    : `${tier.size} · hand-numbered, edition of ${tier.editionTotal}`;

// The three editioned set sizes, ascending by price (the canonical ladder order),
// so the START of the page can quote "from {lowest}" — the word "from" implying
// the tiers above without a loud price list.
const SET_TIERS_ASCENDING: PrintTier[] = [...BUNDLE_TIERS].sort(
  (a, b) => a.pricePence - b.pricePence,
);

// ONE small display-heading step for the editions-ledger tier names — factored to
// a single const (not retyped per tile) and brought onto the page's -0.025em
// tracking family so the ledger sub-heads read as the same system as the set cards.
const LEDGER_TIER_HEAD =
  "font-display font-semibold tracking-[-0.025em] text-[18px] md:text-[clamp(20px,1.5vw,28px)] leading-[1.2] text-ink m-0";

// ── PER-BUNDLE SIZE SELECTOR ──────────────────────────────────────────────────
// Hugo: "instead of [a global] take-a-set-in size [toggle], have it so you can
// SCROLL ACROSS on each bundle for different sizes." So every set card now owns
// its own size, chosen from a horizontal snap row (swipe on mobile) that re-prices
// THAT card only. Same hard guard as before: only the editioned sizes
// (A3/A2/A1/A0) are selectable, so advertised £ always equals what checkout charges.
const SetSizeSelector = ({
  value,
  onChange,
}: {
  value: PrintTier;
  onChange: (tier: PrintTier) => void;
}) => (
  <div className="my-3 md:my-4 flex justify-center">
    <div
      role="radiogroup"
      aria-label="Choose the print size for this set — scroll across the sizes"
      className="flex max-w-full gap-1.5 overflow-x-auto snap-x snap-mandatory px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {BUNDLE_TIERS.map((tier) => {
        const active = tier.id === value.id;
        return (
          <button
            key={tier.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(tier)}
            className={cn(
              "snap-start shrink-0 inline-flex items-center justify-center min-h-[44px] px-4 sm:px-5 py-2.5 font-sans text-[14px] md:text-[clamp(14px,0.75vw,15px)] leading-none ring-1 transition-colors duration-300",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active
                ? "bg-ink text-bg ring-ink font-semibold"
                : "bg-[rgba(10,9,8,0.5)] text-ink-muted ring-line hover:text-ink",
            )}
          >
            <span className="font-semibold tracking-[0.04em]">{sizeCode(tier)}</span>
            <span
              className={cn("ml-2", active ? "text-bg/70" : "text-ink/70")}
            >
              {editionWord(tier)}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

// A single collection's "offered as a set" card — holds its OWN size state so the
// scroll-across selector re-prices just this set. getCollectionBundle is pure, so
// advertised == charged: the £ shown is the bundle at the card's tier, and
// acquireCollection adds every painting at that SAME tier id.
const CollectionSetCard = ({
  coll,
  items,
}: {
  coll: (typeof COLLECTIONS)[number];
  items: (typeof PAINTINGS)[number][];
}) => {
  const { convert, code } = useCurrency();
  const [tier, setTier] = useState<PrintTier>(DEFAULT_BUNDLE_TIER);
  const bundle = getCollectionBundle(coll.id, tier.id);
  if (!bundle || items.length <= 1) return null;
  const shortName = coll.title.split(" — ")[0];
  const acquireCollection = () => {
    items.forEach((p) => {
      const original =
        p.colourways.find((c) => c.isOriginal && c.available) ??
        p.colourways.find((c) => c.available) ??
        p.colourways[0];
      if (original) addItem(p.id, original.name, tier.id);
    });
  };
  // Per-line-converted set figures so advertised == charged in every currency (#7).
  const setFig = bundleMinorFigures(
    bundle.fullPricePence,
    bundle.paintingIds.length,
    bundleDiscountPercentForCount(bundle.paintingIds.length),
    convert,
  );
  const fmtBundle = (minor: number) =>
    formatMinorUnits(minor, code, { pretty: minor % 100 === 0 });
  return (
    <Reveal
      as="div"
      className="mt-6 md:mt-8 mx-auto max-w-[1080px] 3xl:max-w-[1280px] 4xl:max-w-[1480px]"
    >
      <div
        className="px-6 sm:px-8 md:px-10 3xl:px-14 py-6 md:py-7 3xl:py-9 text-center"
        style={{ background: SET_CARD_SCRIM, textShadow: "0 2px 14px rgba(0,0,0,0.7)" }}
      >
        <p className={cn(EYEBROW, "m-0 mb-4")}>The complete collection</p>
        <h3 className={cn(TITLE, "my-0")}>
          The complete {shortName}
        </h3>
        <p className={cn(SUBTITLE, "mt-3 md:mt-4 my-0 max-w-[1000px] 3xl:max-w-[1160px] mx-auto")}>
          All {bundle.paintingIds.length} paintings at the {editionWord(tier)}{" "}
          edition ({sizeCode(tier)}) — the collection entire, for one home.
        </p>
        <SetSizeSelector value={tier} onChange={setTier} />
        <p className={cn(META, "m-0 mb-1.5")}>
          <span className="font-display font-semibold text-[22px] md:text-[clamp(26px,1.9vw,36px)] text-ink align-middle">
            {fmtBundle(setFig.bundleMinor)}
          </span>
          <span className="mx-3 text-ink/35">·</span>
          the set, offered together
        </p>
        <p className={cn(META, "m-0 mb-5")}>
          Taken individually, {fmtBundle(setFig.fullMinor)} — a saving of{" "}
          {fmtBundle(setFig.saveMinor)} as a set.
        </p>
        <button
          type="button"
          onClick={acquireCollection}
          className={cn(BTN_PRIMARY, "gap-2")}
        >
          Add the complete collection to basket
          <span aria-hidden="true">→</span>
        </button>
        <p className={cn(META, "m-0 mt-4")}>
          The set saving is applied automatically at checkout.
        </p>
      </div>
    </Reveal>
  );
};

// "Compose your own set" — the AOV builder. Pick ANY two or more mandalas; the
// set reprices live at the SAME ladder the basket/checkout applies (2→5%, 3+→10%,
// all→15%), and adding pushes one anchor-tier line per painting so checkout
// derives the identical % — advertised == charged by construction (gotcha #9).
const ComposeSetCard = () => {
  const { convert, code } = useCurrency();
  const [tier, setTier] = useState<PrintTier>(DEFAULT_BUNDLE_TIER);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const count = picked.size;
  const percent =
    count >= PAINTINGS.length
      ? COMPLETE_CATALOGUE_DISCOUNT_PERCENT
      : count >= 2
        ? bundleDiscountPercentForCount(count)
        : 0;
  // Per-line-converted set figures so advertised == charged in every currency (#7).
  const setFig = bundleMinorFigures(count * tier.pricePence, count, percent, convert);
  const money = (minor: number) =>
    formatMinorUnits(minor, code, { pretty: minor % 100 === 0 });

  const acquireSet = () => {
    PAINTINGS.forEach((p) => {
      if (!picked.has(p.id)) return;
      const original =
        p.colourways.find((c) => c.isOriginal && c.available) ??
        p.colourways.find((c) => c.available) ??
        p.colourways[0];
      if (original) addItem(p.id, original.name, tier.id);
    });
  };

  return (
    <Reveal
      as="div"
      className="mt-6 md:mt-8 mx-auto max-w-[1080px] 3xl:max-w-[1280px] 4xl:max-w-[1480px]"
    >
      <div
        className="px-6 sm:px-8 md:px-10 3xl:px-14 py-6 md:py-7 3xl:py-9 text-center"
        style={{ background: SET_CARD_SCRIM, textShadow: "0 2px 14px rgba(0,0,0,0.7)" }}
      >
        <p className={cn(EYEBROW, "m-0 mb-4")}>Compose your own set</p>
        <h3 className={cn(TITLE, "my-0")}>
          Build a wall of your own
        </h3>
        <p className={cn(SUBTITLE, "mt-3 md:mt-4 my-0 max-w-[1000px] 3xl:max-w-[1160px] mx-auto")}>
          Choose any two or more mandalas to hang together. The set saving builds
          as you add — 5% for two, 10% for three or more — applied automatically
          at checkout.
        </p>

        {/* Pick grid — toggle paintings in/out of the set. All ten land on ONE
            commanding row at 3xl (the FooterCatalogue 10-up idiom) so the AOV
            builder fills its wide card instead of sitting as a half-empty
            contact-sheet; a clean 5×2 below. */}
        <div className="mt-5 md:mt-6 grid grid-cols-2 sm:grid-cols-5 3xl:grid-cols-10 gap-2.5 sm:gap-3 3xl:gap-2">
          {PAINTINGS.map((p) => {
            const cover =
              p.colourways.find((c) => c.isOriginal && c.available) ??
              p.colourways.find((c) => c.available) ??
              p.colourways[0];
            const on = picked.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                aria-label={`${on ? "Remove" : "Add"} ${p.title} ${on ? "from" : "to"} your set`}
                onClick={() => toggle(p.id)}
                title={p.title}
                className={cn(
                  "group relative block aspect-square overflow-hidden rounded-[2px] ring-1 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  on ? "ring-2 ring-accent scale-[1.04] shadow-[0_12px_30px_rgba(0,0,0,0.5)] z-10" : "ring-line hover:ring-accent/50",
                )}
              >
                <AssetImage
                  src={cover.image}
                  alt={p.title}
                  loading="lazy"
                  decoding="async"
                  sizes="(min-width: 768px) 200px, 30vw"
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover transition-all duration-500",
                    on ? "scale-[1.03]" : "opacity-80 group-hover:opacity-100",
                  )}
                />
                {on && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-bg text-[13px] font-bold"
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <SetSizeSelector value={tier} onChange={setTier} />

        {count >= 2 ? (
          <>
            <p className={cn(META, "m-0 mb-1.5")}>
              <span className="font-display font-semibold text-[22px] md:text-[clamp(26px,1.9vw,36px)] text-ink align-middle">
                {money(setFig.bundleMinor)}
              </span>
              <span className="mx-3 text-ink/35">·</span>
              {count} prints, {sizeCode(tier)}
            </p>
            <p className={cn(META, "m-0 mb-5")}>
              Taken individually, {money(setFig.fullMinor)} — a saving of {money(setFig.saveMinor)} ({percent}%) as a set.
            </p>
            <button type="button" onClick={acquireSet} className={cn(BTN_PRIMARY, "gap-2")}>
              Add my set to basket
              <span aria-hidden="true">→</span>
            </button>
            <p className={cn(META, "m-0 mt-4")}>
              The set saving is applied automatically at checkout.
            </p>
          </>
        ) : (
          <p className={cn(META, "m-0 mt-2")}>
            Select at least two prints to begin your set.
          </p>
        )}
      </div>
    </Reveal>
  );
};

// The flagship "complete catalogue" set — its own size state + scroll-across
// selector. getCompleteCatalogueBundle is pure; acquireCatalogue adds one of every
// painting at the SAME tier so checkout's 15% applies — advertised == charged.
const CatalogueSetCard = () => {
  const { convert, code } = useCurrency();
  const [tier, setTier] = useState<PrintTier>(DEFAULT_BUNDLE_TIER);
  const catalogue = getCompleteCatalogueBundle(tier.id);
  // Per-line-converted set figures so advertised == charged in every currency (#7).
  const catFig = bundleMinorFigures(
    catalogue.fullPricePence,
    catalogue.paintingCount,
    catalogue.discountPercent,
    convert,
  );
  const fmtCatalogue = (minor: number) =>
    formatMinorUnits(minor, code, { pretty: minor % 100 === 0 });
  const acquireCatalogue = () => {
    catalogue.items.forEach((it) =>
      addItem(it.paintingId, it.colourwayName, tier.id),
    );
  };
  return (
    <Reveal
      as="section"
      className="relative mx-auto max-w-[1080px] 3xl:max-w-[1280px] 4xl:max-w-[1480px] px-4 sm:px-6 md:px-8 lg:px-12 pb-10 md:pb-14"
    >
      <div
        className="px-6 sm:px-8 md:px-12 lg:px-16 3xl:px-24 py-6 md:py-7 lg:py-9 3xl:py-9 text-center"
        style={{ background: SET_CARD_SCRIM, textShadow: "0 2px 14px rgba(0,0,0,0.7)" }}
      >
        <p className={cn(EYEBROW, "m-0 mb-4")}>The full collection</p>
        <h2 className={cn(TITLE, "max-w-[16ch] mx-auto my-0")}>
          Every print, in one home.
        </h2>
        <p className={cn(SUBTITLE, "mt-3 md:mt-4 max-w-[74ch] mx-auto my-0")}>
          One estate-stamped {editionWord(tier)} print ({sizeCode(tier)}) of all{" "}
          {catalogue.paintingCount} paintings currently on the site, gathered for
          one home &mdash; with more of Stephen&rsquo;s work still to come.
        </p>
        <SetSizeSelector value={tier} onChange={setTier} />
        <p className={cn(META, "m-0 mb-5")}>
          <span className="font-display font-semibold text-[22px] md:text-[clamp(26px,1.9vw,36px)] text-ink align-middle">
            {fmtCatalogue(catFig.bundleMinor)}
          </span>
          <span className="mx-3 text-ink/35">·</span>
          <span>
            individually {fmtCatalogue(catFig.fullMinor)}, a saving of{" "}
            {fmtCatalogue(catFig.saveMinor)}
          </span>
        </p>
        <button
          type="button"
          onClick={acquireCatalogue}
          className={cn(BTN_PRIMARY, "gap-2")}
        >
          Add the full collection to basket
          <span aria-hidden="true">→</span>
        </button>
        <p className={cn(META, "m-0 mt-4")}>
          The set saving is applied automatically at checkout.
        </p>
      </div>
    </Reveal>
  );
};

export const Collections = () => {
  // Presentment currency — every £ on the page renders (and checkout charges) in
  // the buyer's chosen currency. fmt = full ("£450.00"/"$572.00"), fmtP = pretty
  // (".00" stripped). The GBP pence figures from paintings.ts stay the single
  // source of truth; only the presentation converts — advertised == charged.
  const { formatPretty: fmtP } = useCurrency();

  // One ref per collection section so each backdrop can track its own visibility
  const sectionRefs = [
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
  ];

  // Bundle SIZE is now PER-CARD: each <CollectionSetCard> + the <CatalogueSetCard>
  // holds its own size + scroll-across selector (Hugo's "scroll across on each
  // bundle for different sizes"). The pure helpers (getCollectionBundle /
  // getCompleteCatalogueBundle) keep advertised == charged inside each card.

  // CollectionPage + ItemList JSON-LD — makes the catalogue crawl-legible as a
  // product listing (every painting as a positioned ListItem → its PDP). Names +
  // URLs only, derived from the canonical PAINTINGS data (no invented copy). The
  // PDP already carries the per-product Product/Offer schema; this is the parent
  // list that ties them together for sitelinks / listing rich-results.
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${absoluteUrl("/collections")}#collection`,
    name: "Mandala & Sacred Geometry Art Prints — The Collection",
    url: absoluteUrl("/collections"),
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#person` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: PAINTINGS.length,
      itemListElement: PAINTINGS.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`/collections/${p.id}`),
        name: p.title,
      })),
    },
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
        jsonLd={collectionJsonLd}
      />
      <Nav />

      {/* FIXED BACKDROP LAYER — covers viewport, cross-fades between collections */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* BASE WASH — an always-on, VISIBLE layer UNDER the cross-fading
            collection scenes, covering the fade dips BETWEEN collections so
            the page never reads as "no background / gone black" (Hugo
            2026-06-24). ⚠️ NOT a peacock/Pavo wash: the Pavo painting is
            reserved for home + About ONLY (Hugo 2026-07-03) — this base is the
            page's own first collection scene (Habundia).
            ⚠️ PAST THE LAST COLLECTION this base must never show (Hugo
            2026-07-03: it read as "the first image returning" at the foot) —
            the LAST ScrollBackdrop (Born in the Sky, the nebula) now holds at
            full opacity through the complete-catalogue panel + footer via
            isLast, so the nebula EXTENDS to the very end of the page. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url("${asset("/img/scenes/habundia-blur-v4.webp")}")`,
          }}
        />
        {COLLECTIONS.map((coll, i) =>
          coll.backdropImage ? (
            <ScrollBackdrop
              key={coll.id}
              photoUrl={asset(coll.backdropImage)}
              sectionRef={sectionRefs[i]}
              isFirst={i === 0}
              isLast={i === COLLECTIONS.length - 1}
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
            // 2026-07-07 lightened (Hugo: "reveal the background clearer, like
            // home") — top/mid opened up so the collection scene reads clearly;
            // foot kept heavier for the catalogue/footer seam + tile legibility.
            background:
              "linear-gradient(180deg, rgba(8,7,6,0.26) 0%, rgba(8,7,6,0.40) 45%, rgba(8,7,6,0.60) 100%)",
          }}
        />
      </div>

      <main className="relative z-10">
        {/* PAGE INTRO — the refined estate masthead (shared <PageMasthead>: the
            blue-chip-gallery recipe, Fraunces opsz 144 / wght 560, composed
            clamp, ONE italic word — NOT the old crude 700/opsz-48 logo the owner
            flagged as "way too bold and unprofessional"). A meta rule, then a
            confident-but-composed title, then a dignified editorial intro and a
            calm, named-editions presentation — an EDITION HOUSE, not a discount
            store. The title carries a legibility text-shadow over the fixed
            backdrop (the shared component leaves the title shadow-free for
            on-paper pages). Generic + future-proof: it deliberately does NOT
            name or count the collections, so it never goes stale. */}
        <Reveal
          as="div"
          className={cn(PAGE_ENVELOPE, "relative pt-10 md:pt-12 pb-6 md:pb-8")}
        >
          <PageMasthead
            eyebrow="Estate editions"
            meta="The estate catalogue"
            // CENTRE the masthead so its axis matches the centred collection
            // headers below (the title was left-aligned against centred content).
            titleClassName="text-center"
            titleStyle={{
              textShadow: "0 3px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)",
            }}
            title={
              <>
                The <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>collection</em>
              </>
            }
          >
            {/* Intro — a short, dignified note (not a pitch). Lead + a quiet
                aside, in a BALANCED two-column measure on lg (6/6, not the old
                lopsided 7/5 where the right rail sat half-empty beside a full
                lead). Both columns now carry their own weight to the edges of
                the shared page envelope — no narrow centred column, no empty
                side margins. AI framing only — Stephen's verbatim collection
                descriptions are untouched below. */}
            <div className="mt-4 md:mt-5 grid grid-cols-1 lg:grid-cols-2 gap-x-12 2xl:gap-x-16 gap-y-4 lg:items-stretch border-t border-line pt-4 md:pt-5">
              <p
                className="font-display font-normal tracking-[-0.012em] text-ink m-0"
                style={{
                  fontVariationSettings: '"opsz" 40, "wght" 400',
                  fontSize: "clamp(20px, 2.3vw, 38px)",
                  lineHeight: 1.36,
                  textShadow: "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)",
                }}
              >
                Mandala paintings by Stephen Meakin, held by the estate and issued
                as editioned giclée prints — the collection as it stands today,
                with more of his work still to come.
              </p>
              <div className="lg:pt-1.5 flex flex-col gap-4 lg:justify-start">
                <p
                  className="font-sans font-normal text-[15px] md:text-[clamp(16px,0.95vw,21px)] leading-[1.75] text-ink-muted m-0"
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
                >
                  Each print is made to order, estate-stamped, and accompanied by a
                  Certificate of Authenticity. New colourways are released as the
                  estate brings them to print.
                </p>
                <Link
                  to="/for-you"
                  className="inline-flex items-center gap-1.5 font-sans text-[13px] font-bold tracking-[0.04em] text-ink-muted hover:text-accent transition-colors duration-300"
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
                >
                  Not sure where to start? Browse by colour <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            {/* THE EDITIONS — the named sizes presented by what each INCLUDES
                (size · numbering · Certificate of Authenticity), the TASCHEN
                model, so any price step reads as CONTENT, not a markdown. The
                price is quoted as "from {lowest}" — the word "from" implying the
                tiers above without a loud list. Every painting is offered across
                these editions; the catalogue + collection sets below take the
                size chosen in the calm control beneath. */}
            <div className="mt-4 md:mt-5 border-t border-line pt-4 md:pt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-3 md:mb-4">
                <p
                  className={cn(EYEBROW, "m-0")}
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
                >
                  The editions
                </p>
                <p
                  className={cn(META, "m-0")}
                  style={{ textShadow: "0 1px 10px rgba(0,0,0,0.8)" }}
                >
                  Every painting, from{" "}
                  <span className="font-semibold text-ink">
                    {fmtP(SET_TIERS_ASCENDING[0].pricePence)}
                  </span>{" "}
                  · each with a Certificate of Authenticity
                </p>
              </div>
              {/* Editions ledger — a hairline-grouted spec table (hairlines are
                  the sanctioned grid idiom). The tiles were a hard near-opaque
                  black box (0.72), then a translucent tinted fill; both still cut
                  a rectangle out of the scene. Now there is NO tile fill and NO
                  cream grout block — only thin border-line hairlines dividing the
                  rows, sitting on the panel's own scrim. Each <p> keeps its own
                  text-shadow for legibility now that the fill is gone. */}
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-line">
                {SET_TIERS_ASCENDING.map((tier) => (
                  <li
                    key={tier.id}
                    className="border-r border-b border-line px-5 py-4 md:px-6 md:py-5 3xl:px-8 3xl:py-6"
                  >
                    <p
                      className={LEDGER_TIER_HEAD}
                      style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
                    >
                      {editionWord(tier)}
                    </p>
                    <p
                      className={cn(META, "mt-1.5 m-0")}
                      style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
                    >
                      {editionInclusions(tier)}
                    </p>
                    <p
                      className={cn(META, "mt-3 m-0")}
                      style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
                    >
                      <span className="text-ink-muted">from </span>
                      <span className="font-semibold">{fmtP(tier.pricePence)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* The size choice now lives ON each set card below (scroll-across
                per-bundle selector) — no single page-level toggle. */}
          </PageMasthead>
        </Reveal>

        {COLLECTIONS.map((coll, collIndex) => {
          const items = PAINTINGS.filter((p) => p.collection === coll.id);
          return (
            <section
              key={coll.id}
              id={`collection-${coll.id}`}
              ref={sectionRefs[collIndex]}
              className="relative scroll-mt-24"
            >
              <div className={cn(PAGE_ENVELOPE, "relative pt-8 md:pt-10 pb-8 md:pb-10")}>
                <Reveal as="header" className="max-w-[1080px] 3xl:max-w-[1280px] mx-auto text-center mb-4 md:mb-6">
                  <p
                    className={cn(EYEBROW, "m-0 mb-4")}
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
                  >
                    {["I", "II", "III"][collIndex]}
                    <span className="mx-2 text-ink/35" aria-hidden="true">·</span>
                    {items.length} {items.length === 1 ? "Painting" : "Paintings"}
                  </p>
                  <h2
                    className={cn(TITLE, "max-w-[1080px] 3xl:max-w-[1280px] mx-auto my-0")}
                    style={{ textShadow: "0 3px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
                  >
                    {coll.title}
                  </h2>
                  <div
                    className={cn(SUBTITLE, "mt-3 md:mt-4 flex flex-col gap-3 max-w-[1040px] 3xl:max-w-[1200px] mx-auto")}
                    style={{ textShadow: "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
                  >
                    {coll.description.split("\n\n").map((para, i) => (
                      <p key={i} className="m-0">{para}</p>
                    ))}
                  </div>
                </Reveal>

                <RevealStagger
                  delay={0.05}
                  className="flex flex-wrap justify-center gap-x-5 md:gap-x-7 gap-y-5 md:gap-y-6"
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
                        // COUNT-AWARE basis (Hugo's "goes gappy" fix): a hard
                        // 500px/30% cap stranded ~800px of black flanking the
                        // 2-painting Habundia row on wide screens. The basis now
                        // scales to the collection size so a diptych commands the
                        // envelope, a triptych fills cleanly, and 4+ keeps the
                        // dense grid (cap lifted 500→560). Literal class strings
                        // (one per branch) so Tailwind's JIT generates each.
                        className={cn(
                          "m-0 min-w-0",
                          items.length <= 2
                            ? "flex-[0_1_clamp(380px,46%,720px)]"
                            : items.length === 3
                              ? "flex-[0_1_clamp(300px,31%,560px)]"
                              : "flex-[0_1_clamp(280px,30%,560px)]",
                        )}
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
                          <div className="aspect-square overflow-hidden ring-1 ring-line transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-[0_30px_72px_rgba(0,0,0,0.6)]">
                            {/* Gentle zoom on hover only — a small scale-up of the
                                cover. Hugo: hover should zoom in a little, never
                                flick to another colourway. */}
                            <div className="relative w-full h-full transition-transform duration-700 group-hover:scale-[1.04]">
                              <AssetImage
                                src={cover.image}
                                alt={paintingImageAlt(painting.title, cover.name)}
                                loading="lazy"
                                decoding="async"
                                sizes="(min-width: 1400px) 640px, (min-width: 640px) 38vw, 90vw"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                          <figcaption className="pt-3 md:pt-4 text-center">
                            <h3
                              className="font-display font-semibold text-[clamp(20px,1.45vw,30px)] leading-[1.2] tracking-[-0.025em] text-ink m-0 min-h-[2.4em] flex items-center justify-center transition-colors duration-300 group-hover:text-accent"
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
                              className={cn(META, "mt-2 m-0")}
                              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
                            >
                              Estate-stamped giclée · from{" "}
                              <span className="font-semibold text-ink [font-variant-numeric:tabular-nums]">
                                {fmtP(getLowestTierPricePence(painting))}
                              </span>
                            </p>
                          </figcaption>
                        </Link>
                      </motion.figure>
                    );
                  })}
                </RevealStagger>

                {/* COMPLETE-COLLECTION CARD — its own size + scroll-across
                    selector; getCollectionBundle keeps advertised == charged. */}
                <CollectionSetCard coll={coll} items={items} />
              </div>
            </section>
          );
        })}

        {/* COMPOSE YOUR OWN SET — AOV builder: pick any 2+, reprices at the same
            count ladder checkout applies (advertised == charged). */}
        <ComposeSetCard />

        {/* Hairline divider so the two stacked set-cards read as TWO distinct
            offers, not one conjoined dark block (Hugo). */}
        <div className="mx-auto max-w-[1080px] 3xl:max-w-[1280px] px-4 sm:px-6 md:px-8 lg:px-12">
          <div aria-hidden="true" className="h-px bg-ink/50 my-6 md:my-8" />
        </div>

        {/* COMPLETE CATALOGUE — flagship set, its own size + scroll-across
            selector; getCompleteCatalogueBundle keeps advertised == charged. */}
        <CatalogueSetCard />
      </main>

      <Footer />
    </div>
  );
};
