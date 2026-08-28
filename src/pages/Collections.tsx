import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal, RevealStagger } from "../components/Reveal";
import { AssetImage } from "../components/AssetImage";
import {
  COLLECTIONS,
  PAINTINGS,
  PRINT_TIERS,
  getLowestTierPricePence,
  getTierAdvertisedPricePence,
  getCollectionBundle,
  getCompleteCatalogueBundle,
  bundleDiscountPercentForCount,
  COMPLETE_CATALOGUE_DISCOUNT_PERCENT,
  paintingImageAlt,
  type PrintTier,
} from "../data/paintings";
import { addItem } from "../lib/basket";
import { useCurrency, formatMinorUnits, bundleMinorFigures } from "../lib/currency";
import { Seo } from "../components/Seo";
import { SITE_URL, absoluteUrl } from "../lib/seo";
import { cn } from "../lib/cn";
import { PageMasthead } from "../components/PageMasthead";
import { BTN_PRIMARY, EYEBROW, EYEBROW_MUTED, TITLE, SUBTITLE, META } from "../components/ui/tokens";

// Roman numeral for a collection's index (1-based). Generated rather than
// hardcoded so adding a 4th/5th collection numbers correctly with no edit here.
const toRoman = (n: number): string => {
  const table: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  for (const [value, sym] of table) {
    while (n >= value) { out += sym; n -= value; }
  }
  return out;
};

// ── CANONICAL CENTRED ENVELOPE ────────────────────────────────────────────────
// One shared max-width axis for the WHOLE page (the page-intro masthead AND every
// collection section AND the catalogue set), so the page sits on a single centred
// vertical axis matching the rest of the site (Hugo: "nothing is centred
// properly"). The page-intro used to run a NARROWER, LEFT-aligned envelope than
// the centred sections below it — the two now share this exact measure (mx-auto,
// equal L/R margins) and the same large-screen step-ups.
const PAGE_ENVELOPE =
  "mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12";

// ── SOFT SET-CARD SCRIM ───────────────────────────────────────────────────────
// The set cards (complete-collection / compose / catalogue) hold dense at the
// centre (where the heading/price/CTA sit) and fade to FULLY TRANSPARENT at every
// edge, so the card melts into the calm ground instead of cutting a box out of it
// (the brief bans ringed dark panels). No ring, no solid rectangle. The copy keeps
// its own text-shadow legibility.
const SET_CARD_SCRIM =
  "radial-gradient(120% 100% at 50% 50%, rgba(9,7,6,0.86) 0%, rgba(9,7,6,0.78) 40%, rgba(9,7,6,0.42) 78%, rgba(9,7,6,0) 100%)";

// The single near-black shared scrim/vignette that grounds tile + set-card copy.
// (CALM MODE, Hugo 2026-07-30 "go calm everywhere": the per-collection crossfading
// scene photos were retired for a clean near-black ground so the painting tiles are
// the only colour. The whole ScrollBackdrop crossfade system that once lived here
// was removed 2026-08-28 — it rendered nothing under CALM.)

// The colourway to show as a painting's cover: its original if available, else the
// first available, else the first defined. ONE helper so every surface (browse
// tile, collection/compose set cards) resolves the SAME cover — a withdrawn
// original can never surface (the browse tile used to skip the `available` check
// while the set cards honoured it, so a hidden original showed on the grid only).
const coverColourway = (p: (typeof PAINTINGS)[number]) =>
  p.colourways.find((c) => c.isOriginal && c.available) ??
  p.colourways.find((c) => c.available) ??
  p.colourways[0];

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
// heirloom is `available:true` AND charged at its real £1,995 in
// api/checkout.ts TIERS["heirloom"], so getTierById returns the true A0 price
// (no silent A2 anchor fall-back) and advertised == charged holds for A0 sets
// too (the 12%/12%/8%/5% bundle coupon is a percent, far above the A0 margin
// floor, so the checkout's margin-floor clamp is a no-op here). The `studio`
// one-off stays excluded — it is not an edition. We derive the list from the
// canonical PRINT_TIERS ladder — honouring each tier's own `available` flag —
// then explicitly allowlist the permitted ids so an unrelated `available:true`
// flip (e.g. studio) can NEVER leak a tier into this selector.
// Heirloom (A0) is NOT offered as a direct-buy bundle size (Hugo 2026-07-24:
// "we don't offer heirloom size") — it's enquiry-only. Bundle sizes = A3/A2/A1.
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

// The size shown in the toggle / set copy = the actual square dimensions
// (Hugo 2026-07-24: A-labels scrapped — square works, not rectangular A-sheets).
const sizeCode = (tier: PrintTier): string => tier.size;
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
      {BUNDLE_TIERS.map((tier, i) => {
        const active = tier.id === value.id;
        return (
          <button
            key={tier.id}
            type="button"
            role="radio"
            aria-checked={active}
            // Roving tabindex + arrow-key selection so the announced "radio" role
            // matches real keyboard behaviour (WAI-ARIA radiogroup pattern): only
            // the selected chip is a tab stop, and Left/Right/Up/Down (+ Home/End)
            // move and select, focusing the new chip.
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => {
              const nav = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
              if (!nav.includes(e.key)) return;
              e.preventDefault();
              const n = BUNDLE_TIERS.length;
              let next = i;
              if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % n;
              else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + n) % n;
              else if (e.key === "Home") next = 0;
              else if (e.key === "End") next = n - 1;
              onChange(BUNDLE_TIERS[next]);
              (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
            }}
            onClick={() => onChange(tier)}
            className={cn(
              "snap-start shrink-0 inline-flex items-center justify-center min-h-[44px] px-4 sm:px-5 py-2.5 font-sans text-[14px] md:text-[clamp(14px,0.75vw,15px)] leading-none ring-1 transition-colors duration-300",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active
                ? "bg-ink text-bg ring-ink font-semibold"
                : "bg-transparent text-ink-muted ring-line hover:text-ink hover:ring-accent/70",
            )}
          >
            <span className="font-semibold tracking-[0.02em]">{sizeCode(tier)}</span>
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

// ── SET-CARD SYSTEM ───────────────────────────────────────────────────────────
// One refined "gallery-plate" shell shared by all three set offers (per-collection
// / compose / complete catalogue), so they read as one considered system rather
// than three copy-pasted price panels. No box — the soft SET_CARD_SCRIM fades to
// transparent at the edges (the "no black box" rule). An eyebrow flanked by
// tapering hairlines (the approved LensHeading idiom) crowns each plate; `grand`
// gives the flagship catalogue card more scale + air so the hierarchy reads
// per-collection (quiet) → compose (interactive) → catalogue (ceremonial finale).
const SetCardShell = ({
  eyebrow,
  title,
  headingLevel = 2,
  note,
  grand = false,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  headingLevel?: 2 | 3;
  note?: ReactNode;
  grand?: boolean;
  children: ReactNode;
}) => {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div
      className={cn(
        "relative text-center",
        grand
          ? "px-6 sm:px-8 md:px-12 lg:px-16 3xl:px-24 py-8 md:py-11 lg:py-14"
          : "px-6 sm:px-8 md:px-10 3xl:px-14 py-7 md:py-9 3xl:py-11",
      )}
      style={{ background: SET_CARD_SCRIM, textShadow: "0 2px 14px rgba(0,0,0,0.7)" }}
    >
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <span aria-hidden="true" className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-line" />
        <p className={cn(EYEBROW, "m-0 whitespace-nowrap")}>{eyebrow}</p>
        <span aria-hidden="true" className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-line" />
      </div>
      <Heading
        className={cn(
          "mx-auto my-0",
          grand
            ? "mt-5 max-w-[16ch] font-display font-semibold tracking-[-0.02em] text-[clamp(32px,4.6vw,72px)] leading-[1.04] text-ink"
            : cn(TITLE, "mt-4 max-w-[22ch]"),
        )}
        style={{ textShadow: "0 3px 24px rgba(0,0,0,0.7)" }}
      >
        {title}
      </Heading>
      {note && (
        <p className={cn(SUBTITLE, "mt-3 md:mt-4 my-0 mx-auto max-w-[70ch]")}>
          {note}
        </p>
      )}
      {children}
    </div>
  );
};

// The price as a HERO collector statement — a large Fraunces figure on its own
// line (was buried mid-sentence at 22–36px), a quiet what-you-get label, then the
// individual-total anchor + saving. The figures are passed in already formatted by
// each card from its own pure bundle helper, so advertised == charged is untouched.
const SetPriceBlock = ({
  price,
  label,
  anchor,
  grand = false,
}: {
  price: string;
  label: ReactNode;
  anchor: ReactNode;
  grand?: boolean;
}) => (
  <div className="mt-6 md:mt-7">
    <div
      className={cn(
        "font-display font-semibold leading-[0.98] text-ink [font-variant-numeric:tabular-nums]",
        grand ? "text-[clamp(40px,6vw,88px)]" : "text-[clamp(32px,4.2vw,60px)]",
      )}
    >
      {price}
    </div>
    <p className={cn(META, "mt-3 m-0")}>{label}</p>
    <p className={cn(META, "mt-1 m-0 text-ink-muted")}>{anchor}</p>
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
      const original = coverColourway(p);
      // FRAMED bundle line (Hugo 2026-07-27: no unframed prints) — matches the
      // framed set price the panel advertises (advertised == charged).
      if (original) addItem(p.id, original.name, tier.id, true);
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
      className="mt-8 md:mt-10 mx-auto max-w-[1080px] 3xl:max-w-[92vw] 4xl:max-w-[94vw]"
    >
      <SetCardShell
        eyebrow="The complete collection"
        headingLevel={3}
        title={<>The complete {shortName}</>}
        note="Gathered for one home."
      >
        <SetSizeSelector value={tier} onChange={setTier} />
        <SetPriceBlock
          price={fmtBundle(setFig.bundleMinor)}
          label={
            <>
              all {bundle.paintingIds.length} prints · {editionWord(tier)} edition,{" "}
              {sizeCode(tier)}
            </>
          }
          anchor={
            <>
              Individually {fmtBundle(setFig.fullMinor)} — a saving of{" "}
              {fmtBundle(setFig.saveMinor)}
            </>
          }
        />
        <button
          type="button"
          onClick={acquireCollection}
          className={cn(BTN_PRIMARY, "mt-6 gap-2")}
        >
          Add the complete {shortName} to basket
          <span aria-hidden="true">→</span>
        </button>
        <p className={cn(META, "m-0 mt-4")}>
          The set saving is applied automatically at checkout.
        </p>
      </SetCardShell>
    </Reveal>
  );
};

// "Compose your own set" — the AOV builder. Pick ANY two or more mandalas; the
// set reprices live at the SAME ladder the basket/checkout applies (2→5%, 3+→8%,
// all→12%, post-2026-07-25 squeeze), and adding pushes one anchor-tier line per
// painting so checkout derives the identical % — advertised == charged (gotcha #9).
export const ComposeSetCard = () => {
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
  // ⚠️ MONEY: price on the FRAMED advertised price (base + framing), NOT the bare
  // base — acquireSet adds framed lines (addItem(..., true)) which checkout charges
  // at the framed price, so quoting tier.pricePence here under-quoted the buyer by
  // the whole framing add-on. Mirrors CollectionSetCard / CatalogueSetCard, which
  // both build their full price from getTierAdvertisedPricePence.
  const setFig = bundleMinorFigures(count * getTierAdvertisedPricePence(tier), count, percent, convert);
  const money = (minor: number) =>
    formatMinorUnits(minor, code, { pretty: minor % 100 === 0 });

  const acquireSet = () => {
    PAINTINGS.forEach((p) => {
      if (!picked.has(p.id)) return;
      const original = coverColourway(p);
      // FRAMED bundle line (Hugo 2026-07-27: no unframed prints) — matches the
      // framed set price the panel advertises (advertised == charged).
      if (original) addItem(p.id, original.name, tier.id, true);
    });
  };

  return (
    <Reveal
      as="div"
      className="mt-6 md:mt-8 mx-auto max-w-[1080px] 3xl:max-w-[92vw] 4xl:max-w-[94vw]"
    >
      <SetCardShell
        eyebrow="Compose your own set"
        title="Build a wall of your own"
        note={
          <>
            Choose any two or more mandalas to hang together. The set saving builds
            as you add — {bundleDiscountPercentForCount(2)}% for two,{" "}
            {bundleDiscountPercentForCount(3)}% for three or more,{" "}
            {COMPLETE_CATALOGUE_DISCOUNT_PERCENT}% for the complete set — applied
            automatically at checkout.
          </>
        }
      >
        {/* Pick grid — toggle paintings in/out of the set. Column counts (2-up
            mobile / 4-up sm / 6-up 3xl) all divide the 12-painting catalogue
            evenly, so every row is full — no stranded orphan tail — and the
            flex-wrap + justify-center centres the grid within the card. */}
        <div className="mt-5 md:mt-6 flex flex-wrap justify-center gap-2.5 sm:gap-3 3xl:gap-2">
          {PAINTINGS.map((p) => {
            const cover = coverColourway(p);
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
                  // Fixed per-row widths (2 / 4 / 6 up) matched to the gaps so full
                  // rows fill edge-to-edge; all three divide 12 evenly, so the grid
                  // is always balanced (6×2 / 3×4 / 2×6) with no stranded last row.
                  "shrink-0 grow-0 basis-[calc(50%_-_5px)] sm:basis-[calc(25%_-_9px)] 3xl:basis-[calc(16.666%_-_7px)]",
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
                    className="absolute top-1.5 right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-bg text-[13px] 3xl:text-[16px] 4xl:text-[19px] font-bold"
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
            <SetPriceBlock
              price={money(setFig.bundleMinor)}
              label={
                <>
                  {count} prints · {editionWord(tier)} edition, {sizeCode(tier)}
                </>
              }
              anchor={
                <>
                  Individually {money(setFig.fullMinor)} — a saving of{" "}
                  {money(setFig.saveMinor)} ({percent}%)
                </>
              }
            />
            <button type="button" onClick={acquireSet} className={cn(BTN_PRIMARY, "mt-6 gap-2")}>
              Add my set to basket
              <span aria-hidden="true">→</span>
            </button>
            <p className={cn(META, "m-0 mt-4")}>
              The set saving is applied automatically at checkout.
            </p>
          </>
        ) : (
          <p className={cn(META, "m-0 mt-6")}>
            Select at least two prints to begin your set.
          </p>
        )}
      </SetCardShell>
    </Reveal>
  );
};

// The flagship "complete catalogue" set — its own size state + scroll-across
// selector. getCompleteCatalogueBundle is pure; acquireCatalogue adds one of every
// painting at the SAME tier so checkout's 12% applies — advertised == charged.
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
      addItem(it.paintingId, it.colourwayName, tier.id, true),
    );
  };
  return (
    <Reveal
      as="section"
      className="relative mx-auto max-w-[1080px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 pb-10 md:pb-14"
    >
      <SetCardShell
        grand
        eyebrow="The full collection"
        title="Every print, in one home."
        note={
          <>
            One estate-stamped {editionWord(tier)} print ({sizeCode(tier)}) of all{" "}
            {catalogue.paintingCount} paintings currently on the site, gathered for
            one home &mdash; with more of Stephen&rsquo;s work still to come.
          </>
        }
      >
        <SetSizeSelector value={tier} onChange={setTier} />
        <SetPriceBlock
          grand
          price={fmtCatalogue(catFig.bundleMinor)}
          label={
            <>
              all {catalogue.paintingCount} prints · {editionWord(tier)} edition,{" "}
              {sizeCode(tier)}
            </>
          }
          anchor={
            <>
              Individually {fmtCatalogue(catFig.fullMinor)} — a saving of{" "}
              {fmtCatalogue(catFig.saveMinor)}
            </>
          }
        />
        <button
          type="button"
          onClick={acquireCatalogue}
          className={cn(BTN_PRIMARY, "mt-7 gap-2")}
        >
          Add the full collection to basket
          <span aria-hidden="true">→</span>
        </button>
        <p className={cn(META, "m-0 mt-4")}>
          The set saving is applied automatically at checkout.
        </p>
      </SetCardShell>
    </Reveal>
  );
};

// ── COLLECTION JUMP-NAV ───────────────────────────────────────────────────────
// Wayfinding on a long (~4-chapter) scroll: a centred hairline row of the four
// collection names that sticks to the top and scrolls smoothly to a chapter on
// click, with the current chapter marked. NOT a hard bar — the background is a
// soft downward gradient that fades to transparent (the site's "no black box"
// idiom), and it sits UNDER the main Nav (lower z), so when the smart-hiding Nav
// is showing it covers this, and when the Nav hides on scroll-down (reading) this
// is the single bar at the top. Deep-links to the existing #collection-<id>
// anchors; nothing here changes the money/data path.
const CollectionJumpNav = ({
  collections,
}: {
  collections: typeof COLLECTIONS;
}) => {
  const [activeId, setActiveId] = useState<string>(collections[0]?.id ?? "");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections = collections
      .map((c) => document.getElementById(`collection-${c.id}`))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        // The chapter whose top is nearest the band just under the sticky bar
        // wins the "current" mark — take the topmost intersecting section.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id.replace("collection-", ""));
        }
      },
      // A narrow band ~a third down the viewport, so the active chapter flips as
      // its header crosses that line rather than the moment a sliver appears.
      { rootMargin: "-28% 0px -60% 0px", threshold: 0 },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [collections]);

  const go = (id: string) => {
    document
      .getElementById(`collection-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="Jump to a collection"
      className="sticky top-0 z-20 pointer-events-none"
    >
      {/* Soft top-anchored scrim so the chips read over scrolling artwork without
          a hard-edged bar — dense at the top, fully transparent by the foot. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[130%] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,9,8,0.9) 0%, rgba(10,9,8,0.74) 55%, rgba(10,9,8,0) 100%)",
        }}
      />
      {/* w-max + max-w-full + mx-auto: the row is content-width and CENTRES when
          it fits, but caps at the viewport and scrolls FROM THE START when it
          doesn't — avoiding the justify-center+overflow trap that clipped the
          first chip ("Habundia") unreachably at 375. */}
      <div className="pointer-events-auto relative mx-auto flex w-max max-w-full items-center gap-1 overflow-x-auto px-3 py-2.5 md:py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {collections.map((c) => {
          const short = c.title.split(" — ")[0];
          const on = c.id === activeId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => go(c.id)}
              aria-current={on ? "true" : undefined}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-sans text-[13px] 3xl:text-[15px] font-semibold tracking-[0.02em] transition-colors duration-300",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                on
                  ? "text-ink"
                  : "text-ink-muted/80 hover:text-ink",
              )}
              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.85)" }}
            >
              <span
                className={cn(
                  "inline-block border-b pb-0.5 transition-colors duration-300",
                  on ? "border-accent" : "border-transparent",
                )}
              >
                {short}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export const Collections = () => {
  // Presentment currency — every £ on the page renders (and checkout charges) in
  // the buyer's chosen currency. fmt = full ("£450.00"/"$572.00"), fmtP = pretty
  // (".00" stripped). The GBP pence figures from paintings.ts stay the single
  // source of truth; only the presentation converts — advertised == charged.
  const { formatPretty: fmtP } = useCurrency();

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
        // Per-item cover image → eligible for the richer merchant/listing
        // rich-result. The per-product Product/Offer price schema still lives on
        // each PDP (linked by url); this parent list just gains the thumbnail.
        image: absoluteUrl(coverColourway(p).image),
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
        description="Browse mandala and sacred-geometry art prints by Stephen Meakin across the estate's collections — Habundia, Genesis, Born in the Sky and Ancient Canons. Estate-stamped giclée prints, made to order, free delivery."
        url="/collections"
        jsonLd={collectionJsonLd}
      />
      <Nav />

      {/* FIXED SCRIM LAYER — one calm near-black vignette over the app's ambient
          ground so the painting tiles + copy read clearly (CALM MODE: no scene
          photos, the artwork is the only colour). Top kept LIGHT so the ambient
          shows through behind the overlay nav; ramps darker toward the foot for
          the catalogue/footer seam. The page-intro + tile copy carry their own
          text-shadow for legibility. */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
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
            <div className="mt-4 md:mt-5 mx-auto max-w-[860px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] text-center flex flex-col items-center gap-y-4 border-t border-line pt-4 md:pt-5">
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
              <div className="flex flex-col items-center gap-4">
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
                  className="inline-flex items-center gap-1.5 font-sans text-[13px] 3xl:text-[16px] 4xl:text-[19px] font-bold tracking-[0.02em] text-ink-muted hover:text-accent transition-colors duration-300"
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
                >
                  Not sure where to start? Browse by colour <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            {/* (Removed 2026-07-24: the "First Edition — now open" launch band.
                On a memorial site its "just opened / founding collectors / when
                the numbers are taken it closes" urgency read as a sales pitch, and
                it duplicated the calm, factual edition sizes already presented in
                "The editions" band directly below. The provenance facts survive
                there without the pressure.) */}

            {/* THE EDITIONS — the named sizes presented by what each INCLUDES
                (size · numbering · Certificate of Authenticity), the TASCHEN
                model, so any price step reads as CONTENT, not a markdown. The
                price is quoted as "from {lowest}" — the word "from" implying the
                tiers above without a loud list. Every painting is offered across
                these editions; the catalogue + collection sets below take the
                size chosen in the calm control beneath. */}
            <div className="mt-4 md:mt-5 border-t border-line pt-4 md:pt-5">
              <div className="flex flex-col items-center text-center gap-y-1 mb-3 md:mb-4">
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
                    {fmtP(getTierAdvertisedPricePence(SET_TIERS_ASCENDING[0]))}
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
              <ul className="grid grid-cols-1 sm:grid-cols-3 border-t border-l border-line">
                {SET_TIERS_ASCENDING.map((tier) => (
                  <li
                    key={tier.id}
                    className="border-r border-b border-line px-5 py-4 md:px-6 md:py-5 3xl:px-8 3xl:py-6 text-center"
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
                      <span className="font-semibold">{fmtP(getTierAdvertisedPricePence(tier))}</span>
                    </p>
                  </li>
                ))}
              </ul>
              {/* Reassurance rail — the service + provenance promise that justifies
                  the price, stated once and calmly (on a considered purchase the
                  reassurance IS the luxury). Facts only, box-free, in the ledger's
                  own hairline idiom. "Free worldwide delivery" previously appeared
                  on-page nowhere but the SEO meta description. No printer named; no
                  blanket "hand-numbered" (the Open edition is un-numbered). */}
              <div className="mt-4 md:mt-5">
                <p
                  className={cn(META, "m-0 flex flex-wrap items-center justify-center gap-x-3 gap-y-1")}
                  style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
                >
                  <span>Certificate of authenticity</span>
                  <span aria-hidden="true" className="text-ink/25">·</span>
                  <span>Made to order</span>
                  <span aria-hidden="true" className="text-ink/25">·</span>
                  <span>Framed, ready to hang</span>
                  <span aria-hidden="true" className="text-ink/25">·</span>
                  <span className="font-semibold text-ink">Free worldwide delivery</span>
                </p>
              </div>
            </div>

            {/* The size choice now lives ON each set card below (scroll-across
                per-bundle selector) — no single page-level toggle. */}
          </PageMasthead>
        </Reveal>

        <CollectionJumpNav collections={COLLECTIONS} />

        {COLLECTIONS.map((coll, collIndex) => {
          const items = PAINTINGS.filter((p) => p.collection === coll.id);
          return (
            <section
              key={coll.id}
              id={`collection-${coll.id}`}
              className="relative scroll-mt-28 md:scroll-mt-32"
            >
              <div className={cn(PAGE_ENVELOPE, "relative pt-8 md:pt-10 pb-8 md:pb-10")}>
                <Reveal as="header" className="max-w-[1080px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] mx-auto text-center mb-4 md:mb-6">
                  <p
                    className={cn(EYEBROW, "m-0 mb-4")}
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
                  >
                    {toRoman(collIndex + 1)}
                    <span className="mx-2 text-ink/35" aria-hidden="true">·</span>
                    {items.length} {items.length === 1 ? "Painting" : "Paintings"}
                  </p>
                  <h2
                    className={cn(TITLE, "max-w-[1080px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] mx-auto my-0")}
                    style={{ textShadow: "0 3px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
                  >
                    {coll.title}
                  </h2>
                  <div
                    className={cn(SUBTITLE, "mt-3 md:mt-4 flex flex-col gap-3 max-w-[1040px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] mx-auto")}
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
                  {items.map((painting, tileIndex) => {
                    const cover = coverColourway(painting);
                    // sizes MUST mirror the count-aware flex-basis below, or the
                    // browser picks a source for the wrong slot width — over-fetching
                    // on 3-up laptop tiles and, worse, under-serving (soft) the large
                    // 2-up/2×2 tiles on a DPR-1 4K display. Caps match the clamp caps.
                    const tileSizes =
                      items.length <= 2 || items.length === 4
                        ? "(min-width:1400px) min(48vw,1200px), (min-width:640px) 48vw, 90vw"
                        : items.length === 3
                          ? "(min-width:1400px) min(32vw,820px), (min-width:640px) 32vw, 90vw"
                          : "(min-width:1400px) min(31vw,680px), (min-width:640px) 31vw, 90vw";
                    // Eager-load only the very first tile so a short/landscape window
                    // or a deep-link into the first collection has a real LCP image.
                    const eager = tileIndex === 0 && collIndex === 0;
                    return (
                      <motion.figure
                        key={painting.id}
                        // flex-wrap + justify-center + a clamped flex-basis so a
                        // partial last row CENTRES at every width (no left-aligned
                        // orphan). min-w-0 lets the basis shrink below content on
                        // narrow viewports so a long title can never widen the row
                        // past the viewport.
                        // COUNT-AWARE basis (Hugo's "fill the screen, no black
                        // rails on 4K" + "no gappy orphan"): tiles are sized so each
                        // collection's row(s) FILL the envelope on a 4K monitor with
                        // large, phone-scale artwork, while a partial row still
                        // centres (justify-center) and no row ever orphans a lone
                        // tile. Two paintings → a commanding diptych; FOUR → a clean
                        // 2×2 (was 3-up + 1 orphan); three → a full triptych; 5+ keep
                        // a denser grid. Caps lifted hard (560/720 → 820/1080) so the
                        // art commands the width instead of floating in a centre band.
                        // Literal class strings (one per branch) so Tailwind's JIT
                        // generates each.
                        className={cn(
                          "m-0 min-w-0",
                          items.length <= 2 || items.length === 4
                            ? "flex-[0_1_clamp(340px,48%,1200px)]"
                            : items.length === 3
                              ? "flex-[0_1_clamp(340px,32%,820px)]"
                              : "flex-[0_1_clamp(300px,31%,680px)]",
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
                          <div className="aspect-square overflow-hidden ring-1 ring-line transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-liftLg">
                            {/* Gentle zoom on hover only — a small scale-up of the
                                cover. Hugo: hover should zoom in a little, never
                                flick to another colourway. */}
                            <div className="relative w-full h-full transition-transform duration-700 group-hover:scale-[1.04]">
                              <AssetImage
                                src={cover.image}
                                alt={paintingImageAlt(painting.title, cover.name)}
                                loading={eager ? "eager" : "lazy"}
                                decoding="async"
                                sizes={tileSizes}
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
                            {/* Year — always occupies its line so the price row
                                below keeps a shared baseline across a mixed row
                                (some works are undated); an undated tile renders an
                                invisible spacer, never blank-looking copy. */}
                            {(() => {
                              const hasYear =
                                !!painting.year && painting.year !== "[ DATE ]";
                              return (
                                <p
                                  className={cn(EYEBROW_MUTED, "mt-1.5 m-0")}
                                  aria-hidden={!hasYear}
                                  style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
                                >
                                  {hasYear ? painting.year : " "}
                                </p>
                              );
                            })()}
                            {/* Price floor — sits under every tile so a
                                browsing buyer never needs to click into a
                                painting to learn there is a price. Advertises the
                                BUYABLE FLOOR (getLowestTierPricePence = A3 framed
                                £445), NOT the bare base — no unframed prints, so
                                the base isn't checkoutable (Hugo 2026-07-27). */}
                            <p
                              className={cn(META, "mt-2 m-0")}
                              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
                            >
                              Estate-stamped giclée, framed · from{" "}
                              <span className="font-semibold text-ink [font-variant-numeric:tabular-nums]">
                                {fmtP(getLowestTierPricePence(painting))}
                              </span>
                            </p>
                            {/* Colourway depth — Stephen left several of his own
                                colourways of most mandalas. A quiet row of real
                                colour dots (each a colourway's own hex) + a factual
                                count surfaces that range on the browse tile without
                                exploding the grid into 27 cards, and without any
                                hover flick (Hugo: hover zooms, never flicks). The
                                dots are non-interactive; the tile links to the PDP.
                                Only shown when there's more than one to show. */}
                            {(() => {
                              const ways = painting.colourways.filter(
                                (c) => c.available,
                              );
                              // Reserve the row's height ALWAYS (h-5) so captions in a
                              // mixed row keep a shared baseline — a single-colourway
                              // work renders an invisible spacer of the same height
                              // rather than pulling its rowmates' text up 28px.
                              if (ways.length < 2) {
                                return <div aria-hidden="true" className="mt-2.5 h-5" />;
                              }
                              return (
                                <div
                                  className="mt-2.5 flex h-5 items-center justify-center gap-1.5"
                                  aria-label={`${ways.length} colourways`}
                                >
                                  {ways.slice(0, 5).map((c) => (
                                    <span
                                      key={c.name}
                                      aria-hidden="true"
                                      title={c.name}
                                      className="block h-2.5 w-2.5 rounded-full ring-1 ring-line/80"
                                      style={{ backgroundColor: c.hex }}
                                    />
                                  ))}
                                  <span
                                    className="ml-1 font-sans text-[13px] 3xl:text-[14px] leading-none tracking-[0.04em] text-ink-muted"
                                    style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
                                  >
                                    {ways.length} colourways
                                  </span>
                                </div>
                              );
                            })()}
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
        <div className="mx-auto max-w-[1080px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12">
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
