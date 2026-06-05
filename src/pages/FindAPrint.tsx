import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { AssetImage } from "../components/AssetImage";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { EYEBROW, EYEBROW_TIGHT, TITLE, SUBTITLE, BTN_SECONDARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import {
  PAINTINGS,
  getLowestTierPricePence,
  formatGBP,
} from "../data/paintings";
import { COLOUR_FAMILIES, colourwayFamily, type ColourFamily } from "../lib/colour";

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
  const filtered = useMemo(() => {
    if (active.size === 0) {
      return entries.map((e) => ({ painting: e.painting, cover: e.original }));
    }
    return entries
      .filter((e) => [...active].some((f) => e.families.has(f)))
      .map((e) => ({
        painting: e.painting,
        cover: e.avail.find((c) => active.has(colourwayFamily(c.name, c.hex))) ?? e.original,
      }));
  }, [entries, active]);

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      <AmbientBackdrop opacity={0.45} />
      <Seo
        title="Find a piece for you"
        description="Find a Stephen Meakin print by the colours you're drawn to. Each mandala was made in several of his own colourways, estate-stamped and made to order."
        url="/for-you"
      />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-16 pb-20 md:pb-28">
        <Reveal as="header" className="max-w-[760px] 2xl:max-w-[880px] 3xl:max-w-[960px] mx-auto text-center mb-9 md:mb-12">
          <p className={cn(EYEBROW, "m-0 mb-5")}>Where to begin</p>
          <h1 className={cn(TITLE, "mx-auto my-0 mb-6 hero-text-shadow")}>
            Begin with a colour.
          </h1>
          <p className={cn(SUBTITLE, "mx-auto my-0")}>
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

        {/* Colour swatches */}
        <Reveal as="div" className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 md:gap-4 mb-5">
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
        </Reveal>

        <div className="flex items-center justify-center gap-4 mb-10 md:mb-12">
          <p className={cn(EYEBROW_TIGHT, "m-0")}>
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

        {/* Results — flex-wrap + justify-center so a partial last row (e.g. 10
            paintings → 3+3+3+1, or a colour-filtered 5 → 3+2) centres at every
            width instead of leaving a left-aligned orphan. Each tile is
            flex: 0 1 clamp(MIN, BASIS, MAX) so it tracks the old 1/2/3-up feel
            (≈1 col on phones, ≈2 on small, ≈3 from md) while min-w-0 lets a
            tile shrink rather than push the row past the viewport. */}
        <div
          aria-live="polite"
          className="flex flex-wrap justify-center gap-x-5 md:gap-x-7 gap-y-10 md:gap-y-14"
        >
          {filtered.map(({ painting, cover }) => (
            <figure
              key={painting.id}
              className="m-0 min-w-0 flex-[0_1_clamp(280px,30%,420px)]"
            >
              <Link to={`/collections/${painting.id}`} className="group block" aria-label={`View ${painting.title}`}>
                <div className="aspect-square overflow-hidden ring-1 ring-line transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
                  <AssetImage
                    src={cover.image}
                    alt={`${painting.title} — ${cover.name}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <figcaption className="pt-5 text-center">
                  <h3 className="font-display font-bold text-[16px] md:text-[18px] leading-[1.25] tracking-[-0.015em] text-ink m-0 group-hover:text-accent transition-colors duration-300">
                    {painting.title}
                  </h3>
                  <p className="mt-2 font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink-muted m-0">
                    Estate-stamped giclée · from {formatGBP(getLowestTierPricePence(painting)).replace(".00", "")}
                  </p>
                </figcaption>
              </Link>
            </figure>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center font-sans text-[16px] leading-[1.7] text-ink-muted mt-10">
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
      </main>
      <Footer />
    </div>
  );
};
