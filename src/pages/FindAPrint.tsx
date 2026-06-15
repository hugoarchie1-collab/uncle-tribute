import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { AssetImage } from "../components/AssetImage";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { EYEBROW, EYEBROW_MUTED, EYEBROW_TIGHT, BTN_SECONDARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import {
  PAINTINGS,
  getLowestTierPricePence,
  formatGBP,
} from "../data/paintings";
import { asset } from "../lib/asset";
import { COLOUR_FAMILIES, colourwayFamily, type ColourFamily } from "../lib/colour";

// Two backdrop scenes the /for-you page cross-dissolves between as the reader
// scrolls the WHOLE page: a woodland tunnel (top) into a dusk wildflower garden
// (foot). Treatment values (blur/scrim) are cropped + baked into the files.
const FORYOU_BACKDROPS = {
  woodland: "/img/scenes/foryou-woodland-blur-v3.webp",
  garden: "/img/scenes/foryou-dusk-garden-blur-v4.webp",
} as const;

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
  const reduceMotion = useReducedMotion();

  // WHOLE-PAGE-progress crossfade (home page's PEACOCK_BACKDROPS pattern), NOT
  // Collections' per-section refs. The reason is structural: the results grid
  // STARTS INSIDE the first viewport (~y760 on a 980px screen), so a "lower
  // half" section ref can't express "the bottom of the page" — its scroll
  // progress is already >0 at the very top, which bled the garden over the
  // woodland on first paint. One useScroll over the document gives both layers
  // a single honest 0→1 timeline instead.
  const { scrollYProgress } = useScroll();
  // Woodland OWNS the top: full from first paint (the page is never bare black
  // before the first scroll), holding until 0.40, then fading out by 0.62.
  const woodlandOpacity = useTransform(scrollYProgress, [0, 0.4, 0.62], [1, 1, 0]);
  // Garden fades in across the middle (the 0.40–0.62 overlap is the soft
  // cross-dissolve — no dead gap, no double-bright flash) and HOLDS at 1 to the
  // foot, since there's no third scene to dissolve into below it.
  const gardenOpacity = useTransform(scrollYProgress, [0.4, 0.62, 1], [0, 1, 1]);
  // Shared parallax: a gentle ±6% drift on both layers, exactly like Collections.
  const backdropY = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);

  const toggle = (k: ColourFamily) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

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
  const filtered = useMemo(() => {
    const withCover = (e: (typeof entries)[number], cover: typeof e.original) => ({
      painting: e.painting,
      cover,
    });
    if (active.size === 0) {
      return entries.map((e) => withCover(e, e.original));
    }
    return entries
      .filter((e) => [...active].some((f) => e.families.has(f)))
      .map((e) =>
        withCover(
          e,
          e.avail.find((c) => active.has(colourwayFamily(c.name, c.hex))) ?? e.original,
        ),
      );
  }, [entries, active]);

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      <Seo
        title="Find a piece for you"
        description="Find a Stephen Meakin print by the colours you're drawn to. Each mandala was made in several of his own colourways, estate-stamped and made to order."
        url="/for-you"
      />

      {/* FIXED BACKDROP LAYER — covers viewport, cross-fades the woodland tunnel
          (top of page) into the dusk wildflower garden (foot) on WHOLE-PAGE
          scroll. Treatment (overscan + parallax) cloned from Collections'
          ScrollBackdrop, but the crossfade is driven by one document-level
          useScroll (the home page's PEACOCK_BACKDROPS pattern) rather than
          per-section refs — the grid starts inside the first viewport, so a
          per-section "lower half" ref can't express "the foot of the page". */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {reduceMotion ? (
          // Reduced-motion: drop the parallax + scroll crossfade entirely, hold
          // both scenes at a calm static opacity, and release the GPU layer
          // (will-change:auto) — matches Collections' fallback, which renders
          // every layer at 0.5.
          <>
            <div
              style={{
                opacity: 0.5,
                backgroundImage: `url("${asset(FORYOU_BACKDROPS.woodland)}")`,
                willChange: "auto",
              }}
              className="absolute inset-0 bg-cover bg-center"
              aria-hidden="true"
            />
            <div
              style={{
                opacity: 0.5,
                backgroundImage: `url("${asset(FORYOU_BACKDROPS.garden)}")`,
                willChange: "auto",
              }}
              className="absolute inset-0 bg-cover bg-center"
              aria-hidden="true"
            />
          </>
        ) : (
          <>
            <motion.div
              style={{
                opacity: woodlandOpacity,
                y: backdropY,
                backgroundImage: `url("${asset(FORYOU_BACKDROPS.woodland)}")`,
                willChange: "transform, opacity",
              }}
              // OVERSCAN 8% beyond every edge so the ±6% parallax `y` shift can
              // NEVER expose an uncovered strip — the parent is overflow-hidden,
              // so the overscan is clipped (Collections' "black bar" fix).
              className="absolute inset-[-8%] bg-cover bg-center"
              aria-hidden="true"
            />
            <motion.div
              style={{
                opacity: gardenOpacity,
                y: backdropY,
                backgroundImage: `url("${asset(FORYOU_BACKDROPS.garden)}")`,
                willChange: "transform, opacity",
              }}
              className="absolute inset-[-8%] bg-cover bg-center"
              aria-hidden="true"
            />
          </>
        )}
        {/* Shared scrim — EXACT gradient used on Collections / the rest of the
            site, so the colour swatches + tile copy read clearly over the
            scenes while the photo stays a subdued, moody texture. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,7,6,0.38) 0%, rgba(8,7,6,0.60) 42%, rgba(8,7,6,0.80) 100%)",
          }}
        />
      </div>

      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-20 md:pt-32 pb-8 md:pb-20">
        {/* MASTHEAD — bold left-aligned wayfinder cover (replacing the timid
            centred eyebrow + floating title). A meta rule, a giant Fraunces
            statement filling the width, the verbatim guidance packed
            immediately beneath, and the colour controls promoted to a
            confident editorial panel — all over the woodland tunnel, which owns
            the top of the page (full opacity until ~0.40 of page scroll). */}
        <section>
          <Reveal as="div" className="flex items-center gap-4 md:gap-6 border-b border-line pb-4 md:pb-5">
            <span className={EYEBROW} style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>
              For you · Where to begin
            </span>
            <span aria-hidden className="h-px flex-1 bg-ink/15" />
            <span className={cn(EYEBROW_MUTED, "shrink-0")}>{PAINTINGS.length} works</span>
          </Reveal>

          <Reveal as="div" className="mt-4 md:mt-6">
            <h1
              className="font-display font-bold tracking-[-0.045em] text-ink m-0 leading-[0.82] hero-text-shadow"
              style={{ fontVariationSettings: '"opsz" 48, "wght" 700', fontSize: "clamp(64px, 14vw, 240px)" }}
            >
              Begin with<br />a colour.
            </h1>
          </Reveal>

          {/* Guidance packed under a border-t, dense — no centred column, no
              dead gap. The verbatim copy is unchanged; only its framing moves. */}
          <div className="mt-5 md:mt-7 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-4 items-start border-t border-line pt-5 md:pt-7">
            <Reveal as="div" className="lg:col-span-3">
              <p className={cn(EYEBROW_MUTED, "m-0 leading-[1.8]")}>
                Filter by the tones<br className="hidden lg:block" /> you are drawn to
              </p>
            </Reveal>
            <Reveal
              as="div"
              delay={0.06}
              className="lg:col-span-9 columns-1 md:columns-2 gap-x-10"
            >
              <p
                className="font-sans font-normal text-[17px] md:text-[19px] leading-[1.7] text-ink/85 text-pretty m-0"
                style={{ textShadow: "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
              >
                Stephen left several colourways of each mandala. Each colourway was
                created by Stephen himself and discovered on his computer in his
                studio — these are his own colour variations of the work, exactly as
                he left them. Choose the tones you are naturally drawn to, or that
                fit the ambience of the room around it. There is no wrong answer. You
                can also{" "}
                <Link
                  to="/collections"
                  className="text-accent underline underline-offset-4 hover:text-ink transition-colors"
                >
                  browse by collection
                </Link>
                .
              </p>
            </Reveal>
          </div>

          {/* Colour controls — a bold left-aligned panel under a hairline, with
              the live count sitting INLINE on the rule (no centred orphan row,
              no big gap before the grid). */}
          <Reveal as="div" className="mt-7 md:mt-9 border-t border-line pt-5 md:pt-6">
            <div className="flex items-baseline justify-between gap-4 mb-4 md:mb-5">
              <p className={cn(EYEBROW, "m-0")} style={{ textShadow: "0 1px 8px rgba(0,0,0,0.85)" }}>
                The colour lens
              </p>
              <div className="flex items-center gap-4 shrink-0">
                <p
                  className={cn(EYEBROW_TIGHT, "m-0")}
                  style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
                >
                  {filtered.length} of {PAINTINGS.length}
                </p>
                {active.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setActive(new Set())}
                    className={cn(BTN_SECONDARY, "min-h-[40px] px-4 py-2 text-[11px]")}
                  >
                    Show all {PAINTINGS.length}
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {COLOUR_FAMILIES.map((f) => {
                const on = active.has(f.key);
                return (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(f.key)}
                    className={cn(
                      "inline-flex items-center gap-2.5 rounded-full pl-1.5 pr-4 py-1.5 min-h-[44px] ring-1 transition-all duration-300",
                      on ? "ring-accent text-ink" : "ring-line hover:ring-accent/50",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="block w-7 h-7 rounded-full ring-1 ring-line"
                      style={{ background: f.swatch }}
                    />
                    <span className={cn(EYEBROW_TIGHT, on && "text-ink")}>
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Reveal>
        </section>

        {/* LOWER HALF — the results grid. The dusk-garden backdrop fades in
            across the back half of page scroll (0.40–0.62) and HOLDS to the
            foot, so the page ends on the garden rather than bare black. The grid
            sits tight under the masthead's hairline — no min-h spacer, no big
            gap — so the page reads as one dense editorial block. */}
        <section className="mt-8 md:mt-12">
        {/* Results — a LEFT-aligned auto-fill grid (matching the left-aligned
            masthead) so the tiles fill the full width edge-to-edge instead of
            floating centred with dead gutters. auto-fill + minmax keeps the old
            ≈1/2/3-up cadence; a partial last row left-aligns under the title
            rather than orphaning to the centre. */}
        <div
          aria-live="polite"
          className="grid gap-x-5 md:gap-x-7 gap-y-8 md:gap-y-14"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}
        >
          {filtered.map(({ painting, cover }) => (
            <figure
              key={painting.id}
              className="m-0 min-w-0"
            >
              <Link to={`/collections/${painting.id}`} className="group block" aria-label={`View ${painting.title}`}>
                <div className="aspect-square overflow-hidden ring-1 ring-line transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
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
                <figcaption className="pt-4 md:pt-5">
                  <h3
                    className="font-display font-bold text-[16px] md:text-[18px] leading-[1.25] tracking-[-0.015em] text-ink m-0 group-hover:text-accent transition-colors duration-300"
                    style={{ textShadow: "0 2px 14px rgba(0,0,0,0.8)" }}
                  >
                    {painting.title}
                  </h3>
                  <p
                    className="mt-2 font-sans text-[11px] md:text-[12px] font-bold tracking-[0.16em] uppercase text-ink/70 m-0"
                    style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
                  >
                    Estate-stamped giclée · from {formatGBP(getLowestTierPricePence(painting)).replace(".00", "")}
                  </p>
                </figcaption>
              </Link>
            </figure>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="font-sans text-[16px] leading-[1.7] text-ink-muted mt-10">
            Nothing holds those tones at once.{" "}
            <button
              type="button"
              onClick={() => setActive(new Set())}
              className="text-accent underline underline-offset-4 hover:text-ink transition-colors"
            >
              Show all {PAINTINGS.length}
            </button>
            .
          </p>
        )}
        </section>
      </main>
      <Footer />
    </div>
  );
};
