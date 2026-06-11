import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
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
import { asset } from "../lib/asset";
import { COLOUR_FAMILIES, colourwayFamily, type ColourFamily } from "../lib/colour";

/**
 * Fixed backdrop layer that cross-fades between two scenes as the user scrolls
 * /for-you — cloned from Collections' ScrollBackdrop. Each backdrop tracks its
 * own section's visibility; adjacent backdrops overlap so the woodland (top)
 * dissolves into the dusk garden (bottom) with no hard seam.
 *
 * Differs from Collections in ONE way: the LAST backdrop here HOLDS at full
 * opacity to the foot of the page (opacity stops `[0, 1, 1]` instead of fading
 * back to 0) — the page ends on the dusk garden rather than bare black, since
 * there is no third scene to cross-dissolve into.
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
  // Hold near full opacity across the bulk of the section so the photo is never
  // invisible while the user is reading. Soft fade at the edges keeps the two
  // scenes cross-dissolving. The FIRST scene opens at FULL opacity from the top
  // (no fade-up from 0) so the page is never bare black before the first scroll
  // — exactly like Collections' isFirst. The LAST scene HOLDS at full opacity to
  // the foot of the page (the final `1` instead of fading back to `0`) since
  // there's no third backdrop to cross-dissolve into below it.
  const opacity = useTransform(
    scrollYProgress,
    isFirst ? [0, 0.88, 1] : [0, 0.12, 1],
    isFirst ? [1, 1, 0] : isLast ? [0, 1, 1] : [0, 1, 0],
  );
  const y = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);
  // Scroll-tied scale REMOVED (perf): re-sampling a full-viewport bg-cover
  // bitmap at sub-pixel scale every frame was the costliest scroll transform
  // here — for an imperceptible drift behind the dark scrim. y + opacity only.

  // Promote to a GPU layer ONLY while this section is in view, so the off-screen
  // backdrop doesn't hold a full-viewport compositing layer alive for the whole
  // page lifetime (texture memory → mobile jank).
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

  // Reduced-motion: drop the parallax entirely, hold the backdrop at a calm
  // static opacity, and release the GPU layer (will-change:auto) so we don't
  // keep a promoted compositing layer alive for motion that never runs.
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
        // viewport layers alive for the off-screen scene.
        willChange: inView ? "transform, opacity" : "auto",
      }}
      // OVERSCAN the layer 8% beyond every edge so the ±6% parallax `y` shift
      // can NEVER expose an uncovered strip — the parent is overflow-hidden, so
      // the overscan is clipped (matches Collections' fix for the "black bar").
      className="absolute inset-[-8%] bg-cover bg-center"
      aria-hidden="true"
    />
  );
};

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

  // One ref per backdrop, attached to two roughly equal logical halves of the
  // page (upper = the wayfinder header + colour controls; lower = the results
  // grid). Each ScrollBackdrop tracks its own half's visibility so the woodland
  // dissolves into the dusk garden as the reader scrolls into the lower half.
  const topRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLElement>(null);

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
  // Each tile also carries a `hoverCover` — the NEXT available colourway,
  // crossfaded in on hover (Polène-style "turn shot"), which quietly
  // advertises that alternates exist before the visitor reaches the detail
  // page. Only paintings with 2+ available colourways get one; the rest keep
  // today's scale-only hover. Recomputed against whichever colourway the
  // active filter has put on the tile, so cover and hover never duplicate.
  const filtered = useMemo(() => {
    const withTurnShot = (e: (typeof entries)[number], cover: typeof e.original) => ({
      painting: e.painting,
      cover,
      hoverCover:
        e.avail.length >= 2
          ? e.avail.find((c) => c.name !== cover.name && c.image.endsWith(".jpg"))
          : undefined,
    });
    if (active.size === 0) {
      return entries.map((e) => withTurnShot(e, e.original));
    }
    return entries
      .filter((e) => [...active].some((f) => e.families.has(f)))
      .map((e) =>
        withTurnShot(
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
          (top of page) into the dusk wildflower garden (lower half) as the
          reader scrolls. Cloned from Collections' ScrollBackdrop. */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <ScrollBackdrop
          photoUrl={asset("/img/scenes/foryou-woodland-blur.webp")}
          sectionRef={topRef}
          isFirst
        />
        <ScrollBackdrop
          photoUrl={asset("/img/scenes/foryou-dusk-garden-blur.webp")}
          sectionRef={bottomRef}
          isLast
        />
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
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-16 pb-20 md:pb-28">
        {/* UPPER HALF — wayfinder header + colour controls. Tracked by topRef so
            the woodland backdrop holds at full opacity here. */}
        <section ref={topRef}>
        <Reveal as="header" className="max-w-[760px] 2xl:max-w-[880px] 3xl:max-w-[960px] mx-auto text-center mb-9 md:mb-12">
          <p
            className={cn(EYEBROW, "m-0 mb-5")}
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
          >
            Where to begin
          </p>
          <h1 className={cn(TITLE, "mx-auto my-0 mb-6 hero-text-shadow")}>
            Begin with a colour.
          </h1>
          <p
            className={cn(SUBTITLE, "mx-auto my-0")}
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
        </section>

        {/* LOWER HALF — the results grid. Tracked by bottomRef so the dusk-garden
            backdrop fades in across this region and HOLDS to the foot of the
            page. */}
        <section ref={bottomRef}>
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
          {filtered.map(({ painting, cover, hoverCover }) => (
            <figure
              key={painting.id}
              className="m-0 min-w-0 flex-[0_1_clamp(280px,30%,420px)]"
            >
              <Link to={`/collections/${painting.id}`} className="group block" aria-label={`View ${painting.title}`}>
                <div className="aspect-square overflow-hidden ring-1 ring-line transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
                  {/* Shared transform wrapper: the existing 1.04 hover scale
                      lives HERE so the cover and the turn-shot crossfade move
                      as one layer (no scale mismatch mid-fade). */}
                  <div className="relative w-full h-full transition-transform duration-700 group-hover:scale-[1.04]">
                    <AssetImage
                      src={cover.image}
                      alt={`${painting.title} — ${cover.name}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    {hoverCover && (
                      // Polène-style turn-shot: the next available colourway
                      // crossfades in over the cover (450ms house ease).
                      // Decorative duplicate → aria-hidden + empty alt; lazy +
                      // async so the results payload doesn't double up front.
                      // Single -w800 webp candidate (~110–260KB vs ~660KB
                      // full-res; every colourway has one on disk, verified)
                      // with the .jpg fallback for WebP-less browsers.
                      // Reduced-motion: global.css zeroes transition-duration
                      // sitewide, so the swap is instant — the same pattern the
                      // scale hover above already relies on.
                      <picture style={{ display: "contents" }}>
                        <source
                          srcSet={asset(`${hoverCover.image.slice(0, -4)}-w800.webp`)}
                          type="image/webp"
                        />
                        <img
                          src={asset(hoverCover.image)}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-[450ms] ease-smooth group-hover:opacity-100"
                        />
                      </picture>
                    )}
                  </div>
                </div>
                <figcaption className="pt-5 text-center">
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
        </section>
      </main>
      <Footer />
    </div>
  );
};
