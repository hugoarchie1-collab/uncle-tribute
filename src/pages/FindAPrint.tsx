import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { AssetImage } from "../components/AssetImage";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { MASTHEAD_TITLE_STYLE } from "../components/ui/tokens";
import { EYEBROW, EYEBROW_TIGHT, BTN_SECONDARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { useCurrency } from "../lib/currency";
import {
  PAINTINGS,
  getLowestTierPricePence,
} from "../data/paintings";
import { asset } from "../lib/asset";
import { COLOUR_FAMILIES, colourwayFamily, type ColourFamily } from "../lib/colour";

// Single backdrop scene for /for-you — a rainbow over a cresting ocean wave,
// pre-blurred + darkened to the dark-family band so the cream copy stays legible.
// Treatment (blur/scrim) is baked into the file. (Was a woodland→garden
// cross-dissolve; collapsed to one image to match the rest of the scene pages.)
const FORYOU_BACKDROP = "/img/scenes/foryou-rainbow-wave-blur-v2.webp";

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
  const { formatPretty: fmtP } = useCurrency();

  // Whole-document parallax — no `target`, so the single backdrop drifts ±6%
  // across the entire page, exactly like Collections / the other scene pages.
  const { scrollYProgress } = useScroll();
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

      {/* FIXED BACKDROP LAYER — one rainbow-wave scene drifting ±6% over the
          WHOLE-PAGE scroll. Treatment (overscan + parallax + scrim) cloned from
          Collections' ScrollBackdrop; a single bg-cover layer at full opacity. */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {reduceMotion ? (
          // Reduced-motion: drop the parallax entirely and hold the scene static,
          // releasing the GPU layer (will-change:auto) — matches the other scenes.
          <div
            style={{
              backgroundImage: `url("${asset(FORYOU_BACKDROP)}")`,
              willChange: "auto",
            }}
            className="absolute inset-0 bg-cover bg-center"
            aria-hidden="true"
          />
        ) : (
          <motion.div
            style={{
              y: backdropY,
              backgroundImage: `url("${asset(FORYOU_BACKDROP)}")`,
              willChange: "transform",
            }}
            // OVERSCAN 8% beyond every edge so the ±6% parallax `y` shift can
            // NEVER expose an uncovered strip — the parent is overflow-hidden,
            // so the overscan is clipped (Collections' "black bar" fix).
            className="absolute inset-[-8%] bg-cover bg-center"
            aria-hidden="true"
          />
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
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] 4xl:max-w-[1880px] px-4 sm:px-6 md:px-8 lg:px-12 pt-8 md:pt-10 pb-8 md:pb-14">
        {/* MASTHEAD — a single CENTRED wayfinder column (was a left-pinned
            cover + a lopsided 3/9 guidance split that left a dead gap). Eyebrow
            rule, headline, guidance and colour controls all share one centred
            reading measure (mx-auto) so the top of the page reads as one calm
            axis-centred block over the rainbow-wave scene. Verbatim copy unchanged;
            only the framing moves. */}
        <section className="mx-auto w-full max-w-[860px] 3xl:max-w-[1000px] text-center">
          <Reveal as="div" className="flex items-center gap-4 md:gap-6 border-b border-line pb-4 md:pb-5">
            <span aria-hidden className="h-px flex-1 bg-ink/15" />
            <span className={EYEBROW} style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>
              For you · Where to begin
            </span>
            <span aria-hidden className="h-px flex-1 bg-ink/15" />
          </Reveal>

          <Reveal as="div" className="mt-5 md:mt-7">
            <h1
              className="font-display text-ink m-0 text-balance text-pretty hero-text-shadow"
              style={MASTHEAD_TITLE_STYLE}
            >
              Begin with a <em className="italic font-normal">colour</em>.
            </h1>
          </Reveal>

          {/* Guidance — the page subtitle: one centred reading measure sitting a
              clear, generous step below the headline (canonical heading→subtitle
              gap), under a hairline. Sized in proportion to the masthead as a true
              lead, not a caption. The verbatim copy is unchanged. */}
          <div className="mt-5 md:mt-6 border-t border-line pt-5 md:pt-6">
            <Reveal as="div">
              <p
                className="mx-auto max-w-[68ch] font-sans font-normal text-[18px] md:text-[clamp(19px,1.1vw,25px)] leading-[1.7] text-ink/85 text-pretty m-0"
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

          {/* Colour controls — a CENTRED panel under a hairline; the lens label
              sits above a centred swatch row, with the live count + reset
              centred below (no off-axis justify-between row, no big gap before
              the grid). */}
          <Reveal as="div" className="mt-5 md:mt-6 border-t border-line pt-4 md:pt-5">
            <p className={cn(EYEBROW, "m-0")} style={{ textShadow: "0 1px 8px rgba(0,0,0,0.85)" }}>
              The colour lens
            </p>
            <div className="mt-4 md:mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
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
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
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
          </Reveal>
        </section>

        {/* LOWER HALF — the results grid, over the same single rainbow-wave
            scene (it drifts ±6% across the whole page, no per-section fade). The
            grid sits tight under the masthead's hairline — no min-h spacer, no
            big gap — so the page reads as one dense editorial block. */}
        <section className="mt-8 md:mt-10">
        {/* Results — a LEFT-aligned auto-fill grid (matching the left-aligned
            masthead) so the tiles fill the full width edge-to-edge instead of
            floating centred with dead gutters. auto-fill + minmax keeps the old
            ≈1/2/3-up cadence; a partial last row left-aligns under the title
            rather than orphaning to the centre. */}
        <div
          aria-live="polite"
          className="grid gap-x-5 md:gap-x-7 gap-y-8 md:gap-y-10"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, clamp(300px, 23vw, 380px)), 1fr))" }}
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
                    className="font-display font-bold text-[16px] md:text-[clamp(18px,1.15vw,24px)] leading-[1.25] tracking-[-0.015em] text-ink m-0 group-hover:text-accent transition-colors duration-300"
                    style={{ textShadow: "0 2px 14px rgba(0,0,0,0.8)" }}
                  >
                    {painting.title}
                  </h3>
                  <p
                    className="mt-2 font-sans text-[11px] md:text-[clamp(12px,0.74vw,14px)] font-bold tracking-[0.16em] uppercase text-ink/70 m-0"
                    style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
                  >
                    Estate-stamped giclée · from {fmtP(getLowestTierPricePence(painting))}
                  </p>
                </figcaption>
              </Link>
            </figure>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="font-sans text-[16px] md:text-[clamp(16px,0.9vw,20px)] leading-[1.7] text-ink-muted mt-6">
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
