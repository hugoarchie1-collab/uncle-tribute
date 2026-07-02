import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { AssetImage } from "../components/AssetImage";
import { SceneBackdrop } from "../components/SceneBackdrop";
import {
  EYEBROW,
  EYEBROW_MUTED,
  BTN_PRIMARY,
  BTN_SECONDARY,
} from "../components/ui/tokens";
import { PAINTINGS } from "../data/paintings";
import { cn } from "../lib/cn";
import { usePageTitle } from "../lib/usePageTitle";
import { useNoindexHead } from "../lib/useNoindexHead";

/** Deterministic daily pick — the same painting for everyone on a given day,
 *  rotating through the whole catalogue with the calendar. No randomness (a
 *  404 that reshuffles on refresh reads as a gimmick, not an estate). */
const dailyPainting = () => {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return PAINTINGS[dayOfYear % PAINTINGS.length];
};

export const NotFound = () => {
  usePageTitle("Page not found");
  // Transactional route — noindex + default meta (see useNoindexHead).
  useNoindexHead();
  const painting = dailyPainting();
  const colourway =
    painting.colourways.find((c) => c.isOriginal) ?? painting.colourways[0];
  return (
    <div className="relative flex min-h-[100svh] flex-col">
      <SceneBackdrop src="/img/scenes/notfound-scene-v2.webp" />
      <Nav />
      {/* BOLD MASTHEAD — the old timid centered EYEBROW + TITLE floating in a
          min-h-screen flex-center VOID is gone. In its place: a meta rule, a
          giant left-aligned "404" numeral set as a Fraunces statement filling
          the column, the message packed immediately beneath under a border-t,
          and the day's painting interleaved as an asymmetric editorial plate —
          no centered afterthought, no dead vertical air. */}
      <main className="relative z-10 flex-1 px-4 pt-10 pb-12 sm:px-6 md:px-8 md:pt-12 md:pb-16 lg:px-12">
        <div className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px]">
          {/* Meta rule — the AboutMasthead recipe: eyebrow · hairline · tag. */}
          <Reveal
            as="div"
            className="flex items-center gap-4 border-b border-line pb-4 md:gap-6 md:pb-5"
          >
            <span className={EYEBROW}>Error 404</span>
            <span aria-hidden className="h-px flex-1 bg-ink/15" />
            <span className={cn(EYEBROW_MUTED, "shrink-0")}>Page not found</span>
          </Reveal>

          {/* The giant numeral + the statement, on one bold asymmetric line. */}
          <div className="mt-5 grid grid-cols-1 items-end gap-x-10 gap-y-4 md:mt-7 lg:grid-cols-12">
            <Reveal as="div" className="lg:col-span-7 xl:col-span-8">
              <h1
                className="m-0 font-display font-bold tracking-[-0.045em] text-ink hero-text-shadow leading-[0.82]"
                style={{
                  fontVariationSettings: '"opsz" 48, "wght" 700',
                  fontSize: "clamp(96px, 20vw, 300px)",
                }}
              >
                404
              </h1>
            </Reveal>
            <Reveal
              as="div"
              delay={0.06}
              className="lg:col-span-5 lg:pb-2 xl:col-span-4"
            >
              <p
                className="m-0 font-display font-normal tracking-[-0.01em] text-ink"
                style={{
                  fontVariationSettings: '"opsz" 40, "wght" 400',
                  fontSize: "clamp(26px, 3.4vw, 46px)",
                  lineHeight: 1.12,
                }}
              >
                This page is not in the collection.
              </p>
            </Reveal>
          </div>

          {/* Packed beneath a border-t: supporting copy + the CTAs, dense, no
              gap — the masthead's content block. */}
          <div className="mt-6 grid grid-cols-1 items-start gap-x-10 gap-y-6 border-t border-line pt-6 md:mt-8 md:pt-8 lg:grid-cols-12">
            <Reveal as="div" className="lg:col-span-3">
              <p className={cn(EYEBROW_MUTED, "m-0 leading-[1.8]")}>
                The Mandala Company
              </p>
            </Reveal>
            <Reveal as="div" delay={0.06} className="lg:col-span-9">
              <p className="m-0 max-w-[56ch] font-sans text-[18px] leading-[1.65] text-ink-soft md:text-[20px]">
                The page you requested could not be found. Stephen&rsquo;s work
                remains a few steps away.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link to="/" className={cn(BTN_PRIMARY, "group w-fit")}>
                  Return home{" "}
                  <span
                    aria-hidden="true"
                    className="ml-2 inline-block transition-transform duration-300 ease-smooth group-hover:translate-x-[3px]"
                  >
                    →
                  </span>
                </Link>
                <Link to="/collections" className={BTN_SECONDARY}>
                  View the collections
                </Link>
              </div>
            </Reveal>
          </div>

          {/* THE DAY'S PAINTING — interleaved as an asymmetric editorial plate
              under a hairline, NOT a small centered afterthought. The image
              holds the left column; a quiet wayfinding line + the title sit on
              the right, vertically centred against it. Factual line only
              (estate voice, not Stephen's words). */}
          <div className="mt-12 grid grid-cols-1 items-center gap-8 border-t border-line pt-10 md:mt-16 md:grid-cols-12 md:gap-12 md:pt-12">
            <Reveal as="div" className="md:col-span-7 lg:col-span-6">
              <Link
                to={`/collections/${painting.id}`}
                className="group block overflow-hidden"
              >
                <AssetImage
                  src={colourway.image}
                  alt={`${painting.title} — ${colourway.name}`}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  loading="lazy"
                  decoding="async"
                  className="block h-auto w-full transition-transform duration-700 ease-smooth group-hover:scale-[1.04]"
                />
              </Link>
            </Reveal>
            <Reveal
              as="div"
              delay={0.08}
              className="md:col-span-5 md:col-start-8 lg:col-span-5 lg:col-start-8"
            >
              <p className={cn(EYEBROW, "m-0 mb-5")}>
                While you&rsquo;re here
              </p>
              <Link
                to={`/collections/${painting.id}`}
                className="group block max-w-[18ch]"
              >
                <span
                  className="block font-display font-semibold tracking-[-0.03em] text-ink transition-colors duration-300 group-hover:text-accent"
                  style={{
                    fontVariationSettings: '"opsz" 40, "wght" 600',
                    fontSize: "clamp(30px, 4vw, 56px)",
                    lineHeight: 1.04,
                  }}
                >
                  {painting.title}
                </span>
                <span className="mt-4 inline-flex items-baseline gap-2 font-sans text-[13.5px] text-ink-muted transition-colors duration-300 group-hover:text-ink">
                  {painting.year !== "[ DATE ]" && painting.year}
                  <span
                    aria-hidden="true"
                    className="inline-block transition-transform duration-300 ease-smooth group-hover:translate-x-[3px]"
                  >
                    →
                  </span>
                </span>
              </Link>
            </Reveal>
          </div>
        </div>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
