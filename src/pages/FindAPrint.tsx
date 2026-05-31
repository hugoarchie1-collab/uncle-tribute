import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { AssetImage } from "../components/AssetImage";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { EYEBROW, EYEBROW_TIGHT, BTN_SECONDARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import {
  PAINTINGS,
  COLOURWAY_NOTE,
  getLowestTierPricePence,
  formatGBP,
} from "../data/paintings";
import { COLOUR_FAMILIES, colourwayFamily, type ColourFamily } from "../lib/colour";

/**
 * /quiz — a calm "find a print" wayfinder (NOT a quiz, no email
 * gate). The colour lens: Stephen left many colourways of each mandala, so
 * "choose the tones you're drawn to" is the most natural way in. Every number
 * + image is sourced live from paintings.ts. Reverent: "Where to begin", never
 * "find YOUR perfect print"; edition counts stay as provenance on the product
 * page, never weaponised here.
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
    <div className="relative min-h-screen flex flex-col">
      <AmbientBackdrop opacity={0.45} />
      <Seo
        title="Find a print"
        description="Find a Stephen Meakin print by the colours you're drawn to — each mandala was made in several of his own colourways, estate-stamped and made to order."
        url="/quiz"
      />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-16 pb-20 md:pb-28">
        <Reveal as="header" className="max-w-[760px] mx-auto text-center mb-9 md:mb-12">
          <p className={cn(EYEBROW, "m-0 mb-5")}>Where to begin</p>
          <h1 className="font-display font-bold tracking-[-0.04em] text-[clamp(36px,5vw,64px)] leading-[1.0] text-ink m-0 mb-6 text-balance hero-text-shadow">
            Find a print by colour.
          </h1>
          <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.7] text-ink/85 max-w-[620px] mx-auto m-0">
            Choose the tones you&rsquo;re drawn to — Stephen left many colourways
            of each mandala. Or{" "}
            <Link to="/collections" className="text-accent underline underline-offset-4 hover:text-ink transition-colors">
              browse by collection
            </Link>
            .
          </p>
        </Reveal>

        {/* Colour swatches */}
        <Reveal as="div" className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3 mb-5">
          {COLOUR_FAMILIES.map((f) => {
            const on = active.has(f.key);
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(f.key)}
                className={cn(
                  "inline-flex items-center gap-2.5 rounded-full pl-1.5 pr-4 py-1.5 ring-1 transition-all duration-300",
                  on ? "ring-ink bg-ink/5" : "ring-white/15 hover:ring-white/40",
                )}
              >
                <span
                  aria-hidden="true"
                  className="block w-7 h-7 rounded-full ring-1 ring-white/20"
                  style={{ background: f.swatch }}
                />
                <span className={cn(EYEBROW_TIGHT, on ? "text-ink" : "text-ink/55")}>
                  {f.label}
                </span>
              </button>
            );
          })}
        </Reveal>

        <p className="text-center font-sans text-[13.5px] leading-[1.6] text-ink/55 max-w-[560px] mx-auto m-0 mb-4">
          {COLOURWAY_NOTE}
        </p>

        <div className="flex items-center justify-center gap-4 mb-10 md:mb-12">
          <p className={cn(EYEBROW_TIGHT, "m-0")}>
            {filtered.length} of {PAINTINGS.length}
          </p>
          {active.size > 0 && (
            <button
              type="button"
              onClick={() => setActive(new Set())}
              className={cn(BTN_SECONDARY, "px-4 py-2 text-[10px]")}
            >
              Show all ten
            </button>
          )}
        </div>

        {/* Grid — reuses the collection-tile language */}
        <div
          aria-live="polite"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 md:gap-x-7 gap-y-10 md:gap-y-14"
        >
          {filtered.map(({ painting, cover }) => (
            <figure key={painting.id} className="m-0">
              <Link to={`/collections/${painting.id}`} className="group block" aria-label={`View ${painting.title}`}>
                <div className="aspect-square overflow-hidden ring-1 ring-white/8 transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
                  <AssetImage
                    src={cover.image}
                    alt={`${painting.title} — ${cover.name}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <figcaption className="pt-4 text-center">
                  <h3
                    className="font-display font-bold text-[16px] md:text-[18px] leading-[1.2] tracking-[-0.015em] text-ink m-0"
                    style={{ textShadow: "0 2px 14px rgba(0,0,0,0.8)" }}
                  >
                    {painting.title}
                  </h3>
                  <p
                    className="mt-2 font-sans text-[11px] font-medium tracking-[0.04em] text-ink/85 m-0"
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
          <p className="text-center font-sans text-[16px] leading-[1.7] text-ink/70 mt-10">
            Nothing matches those tones at once —{" "}
            <button
              type="button"
              onClick={() => setActive(new Set())}
              className="text-accent underline underline-offset-4 hover:text-ink transition-colors"
            >
              show all ten
            </button>
            .
          </p>
        )}
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
