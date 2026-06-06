import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import {
  EYEBROW,
  TITLE,
  SUBTITLE,
  BTN_PRIMARY,
  BTN_SECONDARY,
} from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { usePageTitle } from "../lib/usePageTitle";

export const NotFound = () => {
  usePageTitle("Page not found");
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
            <Link to="/" className={cn(BTN_PRIMARY, "w-fit")}>
              Return home <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <Link to="/collections" className={BTN_SECONDARY}>
              View the collections
            </Link>
          </div>
        </Reveal>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
