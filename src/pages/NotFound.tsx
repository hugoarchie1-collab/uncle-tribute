import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { AssetImage } from "../components/AssetImage";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import {
  EYEBROW,
  TITLE,
  SUBTITLE,
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
    <div className="relative min-h-[100svh] md:min-h-screen flex flex-col">
      <AmbientBackdrop opacity={0.45} />
      <Nav />
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 py-16 md:py-24 lg:py-32">
        <Reveal className="mx-auto max-w-[820px] 2xl:max-w-[920px] 3xl:max-w-[1040px] text-center">
          <p className={cn(EYEBROW, "m-0 mb-4")}>Error 404</p>
          <h1 className={cn(TITLE, "my-0 mx-auto hero-text-shadow !text-[clamp(28px,4.8vw,66px)]")}>
            This page is not in the collection.
          </h1>
          <p className={cn(SUBTITLE, "mx-auto mt-7 mb-9")}>
            The page you requested could not be found. Stephen&rsquo;s work
            remains a few steps away.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
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

          {/* One quiet painting — the day's pick from the catalogue, original
              colourway, linking to its detail page. Factual line only (estate
              voice, not Stephen's words). */}
          <div className="mt-16 md:mt-20">
            <p className="font-sans text-[13.5px] leading-[1.6] text-ink-muted m-0 mb-6">
              While you&rsquo;re here — a painting.
            </p>
            <Link
              to={`/collections/${painting.id}`}
              className="group inline-block w-full max-w-[300px] sm:max-w-[340px]"
            >
              <span className="block overflow-hidden">
                <AssetImage
                  src={colourway.image}
                  alt={`${painting.title} — ${colourway.name}`}
                  sizes="(min-width: 640px) 340px, 80vw"
                  loading="lazy"
                  decoding="async"
                  className="block w-full h-auto transition-transform duration-700 ease-smooth group-hover:scale-[1.04]"
                />
              </span>
              <span className="mt-4 inline-flex items-baseline gap-2 font-sans text-[13.5px] text-ink-muted transition-colors duration-300 group-hover:text-ink">
                <span className="font-display font-semibold tracking-[-0.015em] text-[16px] text-ink">
                  {painting.title}
                </span>
                {painting.year}
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform duration-300 ease-smooth group-hover:translate-x-[3px]"
                >
                  →
                </span>
              </span>
            </Link>
          </div>
        </Reveal>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
