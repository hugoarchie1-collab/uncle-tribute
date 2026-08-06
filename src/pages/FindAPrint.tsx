import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PrintQuiz } from "./PrintQuiz";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { AssetImage } from "../components/AssetImage";
import { WishlistButton } from "../components/WishlistButton";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { MASTHEAD_TITLE_STYLE } from "../components/ui/tokens";
import { EYEBROW, EYEBROW_TIGHT, SUBTITLE, BTN_SECONDARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { useCurrency } from "../lib/currency";
import {
  PAINTINGS,
  PRINT_TIERS,
  parseSizeCm,
  getTierAdvertisedPricePence,
  type PrintTier,
} from "../data/paintings";

// The editioned print sizes (A3–A0), newest→largest — the same ladder the
// Collections size selector uses. Drives the browse-price "show me this size".
const BROWSE_TIERS: PrintTier[] = PRINT_TIERS.filter((t) => t.available && !t.isOneOff);
// Compact size chip = the square edge in cm (Hugo 2026-07-24: A-labels scrapped
// — the works are square, not rectangular A-sheets). e.g. "42 cm".
const sizeCode = (t: PrintTier): string => {
  const d = parseSizeCm(t.size);
  return d ? `${d.w} cm` : t.size;
};
import { COLOUR_FAMILIES, colourwayFamily, type ColourFamily } from "../lib/colour";

// The intention lens — what a piece can cultivate, mapped ONLY to the paintings
// whose own documented meaning (in paintings.ts descriptions) genuinely carries
// it. A second, meaning-led way in alongside colour. Never invented: e.g.
// flower-of-life IS the "Mandala of Transformation"; ophiuchus IS the healer
// (Asclepius); enneagon-swans is "we are each other"; the Habundia flowers ARE
// wild abundance; the wild rose keeps its thorns inside the circle (protection);
// orchis-7 IS Jung's "the psyche's own attempt to picture its wholeness"
// (wholeness); lulin is "already gone, made permanent" (remembrance).
type IntentionKey =
  | "transformation"
  | "abundance"
  | "protection"
  | "healing"
  | "unity"
  | "wholeness"
  | "remembrance";
const INTENTIONS: { key: IntentionKey; label: string; paintings: string[] }[] = [
  { key: "transformation", label: "Transformation", paintings: ["flower-of-life", "peacock-minerva", "tridecagon-moon-star"] },
  { key: "abundance", label: "Abundance", paintings: ["wild-rose", "english-bluebells", "slipper-orchids"] },
  { key: "protection", label: "Protection", paintings: ["wild-rose", "peacock-minerva", "ophiuchus", "celtic-shield"] },
  { key: "healing", label: "Healing", paintings: ["ophiuchus"] },
  { key: "unity", label: "Unity & connection", paintings: ["enneagon-swans", "persian-flower-of-life"] },
  { key: "wholeness", label: "Wholeness", paintings: ["orchis-7", "flower-of-life", "twelve-around-three", "persian-flower-of-life"] },
  { key: "remembrance", label: "Remembrance", paintings: ["enneagon-swans"] },
];

// A small, consistent family of sacred-geometry LINE marks — one per intention,
// drawn in the artwork's own language (seed-of-life, vesica, enso, spiral) so
// the intention lens reads as a considered gallery instrument, not a text list.
// currentColor + no fill so each glyph inherits the chip's resting/active tone.
const IntentionGlyph = ({ k }: { k: IntentionKey }) => {
  const p = {
    width: 34,
    height: 34,
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (k) {
    case "transformation": // an unfurling spiral — becoming
      return (
        <svg {...p}>
          <path d="M16 16 a2 2 0 0 1 2 -2 a4 4 0 0 1 4 4 a6 6 0 0 1 -6 6 a8 8 0 0 1 -8 -8 a10 10 0 0 1 10 -10" />
        </svg>
      );
    case "abundance": // seed of life — flowering, plenty
      return (
        <svg {...p}>
          {[
            [16, 16], [21, 16], [18.5, 11.67], [13.5, 11.67], [11, 16], [13.5, 20.33], [18.5, 20.33],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={5} />
          ))}
        </svg>
      );
    case "protection": // concentric rings around a still centre — a circle held
      return (
        <svg {...p}>
          <circle cx={16} cy={16} r={11} />
          <circle cx={16} cy={16} r={6.5} />
          <circle cx={16} cy={16} r={1.6} />
        </svg>
      );
    case "healing": // the healer's serpent within the circle — Asclepius
      return (
        <svg {...p}>
          <circle cx={16} cy={16} r={10.5} />
          <path d="M16 7 C 11 10.5, 21 13.5, 16 16 C 11 18.5, 21 21.5, 16 25" />
        </svg>
      );
    case "unity": // vesica piscis — two made one
      return (
        <svg {...p}>
          <circle cx={11.5} cy={16} r={7.5} />
          <circle cx={20.5} cy={16} r={7.5} />
        </svg>
      );
    case "wholeness": // an ensō — the self, complete
      return (
        <svg {...p}>
          <path d="M24.6 9.98 A10.5 10.5 0 1 1 21.25 6.91" />
        </svg>
      );
    case "remembrance": // a remembered star, ringed — made permanent
      return (
        <svg {...p}>
          <circle cx={16} cy={16} r={10.5} />
          <path d="M16 10.6 L17.9 14.1 L21.4 16 L17.9 17.9 L16 21.4 L14.1 17.9 L10.6 16 L14.1 14.1 Z" />
        </svg>
      );
  }
};

// A centred, symmetric lens heading — the Fraunces kicker flanked by two short
// hairlines that taper into the ground, so each lens opens on a shared axis.
const LensHeading = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center gap-3 sm:gap-4">
    <span aria-hidden="true" className="h-px w-8 sm:w-14 bg-gradient-to-r from-transparent to-line" />
    <span
      className={cn(EYEBROW, "m-0 whitespace-nowrap")}
      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.55), 0 2px 10px rgba(0,0,0,0.42)" }}
    >
      {label}
    </span>
    <span aria-hidden="true" className="h-px w-8 sm:w-14 bg-gradient-to-l from-transparent to-line" />
  </div>
);

/**
 * /for-you — a calm "find a piece that's right for you, by colour" wayfinder
 * (NOT a quiz, no email gate, no right or wrong answer). The colour lens:
 * Stephen left many colourways of each mandala, so "the tones you're drawn to"
 * is the most natural way in. Every number + image is sourced live from
 * paintings.ts. Reverent register: "Where to begin", never "find YOUR perfect
 * print"; edition counts stay as provenance on the product page, never
 * weaponised here.
 */
export const FindAPrint = () => {
  const [active, setActive] = useState<Set<ColourFamily>>(new Set());
  const [intent, setIntent] = useState<Set<IntentionKey>>(new Set());
  // Which size's price the browse grid shows — defaults to the A2 anchor.
  const [browseTier, setBrowseTier] = useState<PrintTier>(
    BROWSE_TIERS.find((t) => t.isAnchor) ?? BROWSE_TIERS[0],
  );
  const { formatPretty: fmtP } = useCurrency();
  const [searchParams] = useSearchParams();
  // The guided quiz now lives INSIDE this page (Hugo 2026-08-06: "I want the quiz
  // page also inside the for-you page"). Start in quiz mode when a shared-result
  // deep link is present (/for-you?result=<id>), else the colour/intention browse
  // wayfinder. The embedded quiz reads the same ?result= param itself on mount.
  const [mode, setMode] = useState<"browse" | "quiz">(
    searchParams.get("result") ? "quiz" : "browse",
  );

  // SINGLE-SELECT (Hugo 2026-07-09: "can't click more than one box at a time").
  // Clicking a swatch selects ONLY it (clearing any other in that lens); clicking
  // the active one again clears it. Colour + intention are independent lenses,
  // each holding at most ONE choice.
  const toggle = (k: ColourFamily) =>
    setActive((prev) => (prev.has(k) ? new Set() : new Set([k])));

  const toggleIntent = (k: IntentionKey) =>
    setIntent((prev) => (prev.has(k) ? new Set() : new Set([k])));

  // Each painting with its available colourways + the families they span.
  const entries = useMemo(
    () =>
      PAINTINGS.map((p) => {
        const avail = p.colourways.filter((c) => c.available);
        const original = avail.find((c) => c.isOriginal) ?? avail[0];
        const families = new Set(avail.map((c) => colourwayFamily(c.name, c.hex)));
        return { painting: p, avail, original, families };
      }),
    [],
  );

  // Filter + swap each matching tile's cover to the colourway that matched.
  // Hover is zoom-only (Hugo: hover should zoom in a little, never flick to
  // another colourway), so each tile carries just its painting + cover.
  // The set of painting ids the active intentions allow (null = no intention
  // lens active → no intention narrowing).
  // How many pieces each intention actually surfaces (truthful count, from the
  // live catalogue) — a quiet premium data note on each card.
  const intentCounts = useMemo(() => {
    const ids = new Set(entries.map((e) => e.painting.id));
    const m = new Map<IntentionKey, number>();
    for (const it of INTENTIONS) {
      m.set(it.key, it.paintings.filter((p) => ids.has(p)).length);
    }
    return m;
  }, [entries]);

  const intentPaintings = useMemo(() => {
    if (intent.size === 0) return null;
    const ids = new Set<string>();
    for (const it of INTENTIONS) {
      if (intent.has(it.key)) it.paintings.forEach((p) => ids.add(p));
    }
    return ids;
  }, [intent]);

  const filtered = useMemo(() => {
    const withCover = (e: (typeof entries)[number], cover: typeof e.original) => ({
      painting: e.painting,
      cover,
    });
    return entries
      .filter((e) => active.size === 0 || [...active].some((f) => e.families.has(f)))
      .filter((e) => !intentPaintings || intentPaintings.has(e.painting.id))
      .map((e) =>
        withCover(
          e,
          active.size > 0
            ? e.avail.find((c) => active.has(colourwayFamily(c.name, c.hex))) ?? e.original
            : e.original,
        ),
      );
  }, [entries, active, intentPaintings]);

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      <Seo
        title="Find a piece for you"
        description="Find a Stephen Meakin print by the colours you're drawn to. Each mandala was made in several of his own colourways, estate-stamped and made to order."
        url="/for-you"
      />

      {/* FIXED BACKDROP LAYER — one rainbow-wave scene held as a plain STATIC
          bg-cover layer at full opacity. (The old scroll-parallax + inset-[-8%]
          overscan jumped to a stale scroll position on route transitions,
          reading as a zoom+jump — so it's a static image now.) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* CALM MODE (Hugo 2026-07-30 "go calm everywhere"): scene photo retired
            for a clean near-black ground so the artwork is the only colour. */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true" />
        {/* Shared scrim — EXACT gradient used on Collections / the rest of the
            site, so the colour swatches + tile copy read clearly over the
            scenes while the photo stays a subdued, moody texture. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,7,6,0.32) 0%, rgba(8,7,6,0.42) 45%, rgba(8,7,6,0.6) 100%)",
          }}
        />
      </div>

      <Nav />
      {mode === "quiz" ? (
        <PrintQuiz embedded onExit={() => setMode("browse")} />
      ) : (
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 pt-8 md:pt-10 pb-10 md:pb-12">
        {/* MASTHEAD — a single CENTRED wayfinder column (was a left-pinned
            cover + a lopsided 3/9 guidance split that left a dead gap). Eyebrow
            rule, headline, guidance and colour controls all share one centred
            reading measure (mx-auto) so the top of the page reads as one calm
            axis-centred block over the rainbow-wave scene. Verbatim copy unchanged;
            only the framing moves. */}
        <section className="mx-auto w-full max-w-[1280px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] text-center">
          <Reveal as="div">
            <h1
              className="font-display text-ink m-0 text-balance text-pretty hero-text-shadow"
              style={MASTHEAD_TITLE_STYLE}
            >
              Begin with a <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>colour</em>, or an{" "}
              <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>intention</em>.
            </h1>
          </Reveal>

          {/* Guidance — the page subtitle: one centred reading measure sitting a
              clear, generous step below the headline (canonical heading→subtitle
              gap), under a hairline. Sized in proportion to the masthead as a true
              lead, not a caption. The verbatim copy is unchanged. */}
          <div className="mt-6 md:mt-7 border-t border-line pt-5 md:pt-6">
            <Reveal as="div">
              <p
                className={cn(SUBTITLE, "mx-auto max-w-[88ch] text-pretty m-0")}
                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.55), 0 2px 10px rgba(0,0,0,0.42)" }}
              >
                Stephen left several colourways of each mandala. Each colourway was
                created by Stephen himself and discovered on his computer in his
                studio — these are his own colour variations of the work, exactly as
                he left them. Choose the tones you are naturally drawn to, or that
                fit the ambience of the room around it. There is no wrong answer. You
                can also{" "}
                <Link
                  to="/collections"
                  className="text-accent underline underline-offset-4 hover:text-ink transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  browse by collection
                </Link>
                .
              </p>
            </Reveal>
          </div>

          {/* Prefer to be led? The guided quiz now opens IN-PAGE (no route
              change) — Hugo: "the quiz page also inside the for-you page". */}
          <Reveal as="div" className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setMode("quiz")}
              className={cn(
                BTN_SECONDARY,
                "min-h-[44px] px-6 py-2.5 text-[14px] 3xl:text-[16px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              )}
            >
              Or take the print quiz
              <span aria-hidden="true" className="ml-2">→</span>
            </button>
          </Reveal>

          {/* Colour controls — a CENTRED panel under a hairline; the lens label
              sits above a centred swatch row, with the live count + reset
              centred below (no off-axis justify-between row, no big gap before
              the grid). */}
          <Reveal as="div" className="mt-7 md:mt-9 border-t border-line pt-6 md:pt-8">
            <LensHeading label="The colour lens" />
            <div
              role="group"
              aria-label="Filter by colour"
              className="mt-5 md:mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3"
            >
              {COLOUR_FAMILIES.map((f) => {
                const on = active.has(f.key);
                return (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${f.label} tones`}
                    onClick={() => toggle(f.key)}
                    className={cn(
                      "inline-flex items-center gap-2.5 rounded-full pl-1.5 pr-4 py-1.5 min-h-[44px] ring-1 transition-all duration-300",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                      on
                        ? "ring-accent bg-accent/[0.07] text-ink shadow-lift"
                        : "ring-line hover:ring-accent/50 hover:bg-ink/[0.02] hover:-translate-y-0.5",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "block w-7 h-7 rounded-full ring-1 transition-shadow duration-300",
                        on ? "ring-accent/70" : "ring-line",
                      )}
                      style={{
                        background: f.swatch,
                        boxShadow: on ? "0 0 0 4px rgba(201,120,68,0.12)" : undefined,
                      }}
                    />
                    <span className={cn(EYEBROW_TIGHT, on && "text-ink")}>
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Reveal>

          {/* Intention lens — the meaning-led way in, elevated to premium
              selectable CARDS: a sacred-geometry line mark + Fraunces label +
              a truthful piece-count per card, over a clear active state. Each
              maps to the paintings whose own documented meaning carries that
              intention (INTENTIONS, above); filtering behaviour is unchanged. */}
          <Reveal as="div" className="mt-7 md:mt-9 border-t border-line pt-6 md:pt-8">
            <LensHeading label="The intention lens" />
            <div
              role="group"
              aria-label="Filter by intention"
              className="mx-auto mt-6 md:mt-7 flex max-w-[920px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] flex-wrap items-stretch justify-center gap-3 sm:gap-4"
            >
              {INTENTIONS.map((it) => {
                const on = intent.has(it.key);
                const n = intentCounts.get(it.key) ?? 0;
                return (
                  <button
                    key={it.key}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${it.label} — ${n} ${n === 1 ? "piece" : "pieces"}`}
                    onClick={() => toggleIntent(it.key)}
                    className={cn(
                      "group/int relative flex w-[clamp(140px,20vw,172px)] flex-col items-center gap-3 overflow-hidden rounded-2xl px-4 py-5 text-center ring-1 transition-all duration-300",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                      on
                        ? "ring-accent bg-accent/[0.07] shadow-lift"
                        : "ring-line bg-ink/[0.02] hover:-translate-y-0.5 hover:ring-accent/45 hover:bg-ink/[0.035]",
                    )}
                  >
                    {on && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background:
                            "radial-gradient(120% 90% at 50% 0%, rgba(201,120,68,0.18), transparent 68%)",
                        }}
                      />
                    )}
                    <span
                      className={cn(
                        "relative transition-colors duration-300",
                        on ? "text-accent" : "text-ink-muted group-hover/int:text-ink",
                      )}
                    >
                      <IntentionGlyph k={it.key} />
                    </span>
                    <span
                      className="relative flex min-h-[2.4em] items-center justify-center font-display text-[16px] md:text-[17px] font-semibold leading-[1.15] tracking-[-0.01em] text-ink"
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.55), 0 2px 10px rgba(0,0,0,0.42)" }}
                    >
                      {it.label}
                    </span>
                    <span
                      className={cn(
                        "relative font-sans text-[12px] tracking-[0.015em] transition-colors duration-300",
                        on ? "text-accent/90" : "text-ink-muted/70",
                      )}
                    >
                      {n} {n === 1 ? "piece" : "pieces"}
                    </span>
                  </button>
                );
              })}
            </div>
          </Reveal>

          {/* Live count + reset — reflects BOTH lenses (colour ∩ intention). */}
          <Reveal as="div" className="mt-5 md:mt-6 flex flex-wrap items-center justify-center gap-4">
            <p
              role="status"
              aria-live="polite"
              className={cn(EYEBROW_TIGHT, "m-0")}
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.55), 0 2px 10px rgba(0,0,0,0.42)" }}
            >
              Showing {filtered.length} of {PAINTINGS.length}
            </p>
            {(active.size > 0 || intent.size > 0) && (
              <button
                type="button"
                onClick={() => {
                  setActive(new Set());
                  setIntent(new Set());
                }}
                className={cn(
                  BTN_SECONDARY,
                  "min-h-[44px] px-4 py-2 text-[13px] 3xl:text-[16px] 4xl:text-[19px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                )}
              >
                Show all {PAINTINGS.length}
              </button>
            )}
          </Reveal>
        </section>

        {/* LOWER HALF — the results grid, over the same single rainbow-wave
            scene (it drifts ±6% across the whole page, no per-section fade). The
            grid sits tight under the masthead's hairline — no min-h spacer, no
            big gap — so the page reads as one dense editorial block. */}
        <section className="mt-8 md:mt-10">
        {/* Size / edition selector — the price on every tile follows the size
            you pick (A3 → A0), instead of a flat "from £…". Mirrors the size
            selector on Collections. */}
        <div className="mb-7 md:mb-9 flex flex-wrap items-center justify-center gap-3">
          <span className={cn(EYEBROW, "m-0")}>Prices for</span>
          <div role="radiogroup" aria-label="Show prices for print size" className="flex flex-wrap justify-center gap-2">
            {BROWSE_TIERS.map((t) => {
              const sel = t.id === browseTier.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => setBrowseTier(t)}
                  className={cn(
                    "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 font-sans text-[14px] 3xl:text-[17px] 4xl:text-[20px] font-bold tracking-[0.02em] outline-none ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-accent",
                    sel ? "bg-ink text-bg ring-ink" : "text-ink-muted ring-line hover:text-ink",
                  )}
                >
                  {sizeCode(t)}
                  <span className={cn("font-semibold", sel ? "text-bg/70" : "text-ink/55")}>{fmtP(getTierAdvertisedPricePence(t))}</span>
                </button>
              );
            })}
          </div>
        </div>
        {/* Results — a LEFT-aligned auto-fill grid (matching the left-aligned
            masthead) so the tiles fill the full width edge-to-edge instead of
            floating centred with dead gutters. auto-fill + minmax keeps the old
            ≈1/2/3-up cadence; a partial last row left-aligns under the title
            rather than orphaning to the centre. */}
        {/* Flex-wrap so a partial last row sits CENTRED (Hugo: the odd tile must
            never orphan to the left). Items still GROW to fill full rows (no dead
            gutters — feedback_fill_screen), but a per-breakpoint max-width caps the
            column count (2-up ≥sm, 3-up ≥lg) so a lone tile centres at tile size
            instead of stretching across the whole row. */}
        <div className="flex flex-wrap justify-center gap-x-5 md:gap-x-6 gap-y-6 md:gap-y-8">
          {filtered.map(({ painting, cover }) => (
            <figure
              key={painting.id}
              className="m-0 min-w-0 flex-[0_1_clamp(280px,30%,420px)]"
            >
              <div className="relative">
                <WishlistButton paintingId={painting.id} colourwayName={cover.name} floating />
                <Link to={`/collections/${painting.id}?c=${encodeURIComponent(cover.name)}`} className="group block" aria-label={`View ${painting.title}`}>
                  <div className="aspect-square overflow-hidden ring-1 ring-line transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-lift">
                    {/* Gentle zoom on hover only — a small scale-up of the cover.
                        Hugo: hover should zoom in a little, never flick to another
                        colourway. */}
                    <div className="relative w-full h-full transition-transform duration-700 group-hover:scale-[1.04]">
                      <AssetImage
                        src={cover.image}
                        alt={`${painting.title} — ${cover.name}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </Link>
              </div>
              <Link to={`/collections/${painting.id}?c=${encodeURIComponent(cover.name)}`} className="group block" aria-label={`View ${painting.title}`}>
                <figcaption className="pt-3 md:pt-4 text-center">
                  <h2
                    className="font-display font-bold text-[16px] md:text-[clamp(18px,1.15vw,24px)] leading-[1.25] tracking-[-0.015em] text-ink m-0 min-h-[2.5em] group-hover:text-accent transition-colors duration-300"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.55), 0 2px 10px rgba(0,0,0,0.42)" }}
                  >
                    {painting.title}
                  </h2>
                  <p
                    className="mt-2 font-sans text-[13px] md:text-[clamp(14px,0.74vw,15px)] font-bold tracking-[0.02em] text-ink-muted m-0"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.55), 0 2px 10px rgba(0,0,0,0.42)" }}
                  >
                    Estate-stamped giclée · {sizeCode(browseTier)} from {fmtP(getTierAdvertisedPricePence(browseTier))}
                  </p>
                </figcaption>
              </Link>
            </figure>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="font-sans text-[clamp(16px,0.55vw+9px,24px)] leading-[1.7] text-ink-muted mt-6 text-center">
            Nothing matches all of those at once.{" "}
            <button
              type="button"
              onClick={() => {
                setActive(new Set());
                setIntent(new Set());
              }}
              className="text-accent underline underline-offset-4 hover:text-ink transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              show all {PAINTINGS.length}
            </button>
            .
          </p>
        )}
        </section>
      </main>
      )}
      <Footer />
    </div>
  );
};
