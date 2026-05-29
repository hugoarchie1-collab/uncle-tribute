import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { EYEBROW, BTN_PRIMARY, BTN_SECONDARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { usePageTitle } from "../lib/usePageTitle";

export const NotFound = () => {
  usePageTitle("Page not found");
  return (
    <div className="relative min-h-screen flex flex-col">
      <AmbientBackdrop opacity={0.45} />
      <Nav />
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 py-16 md:py-24">
        <Reveal className="mx-auto max-w-[760px] text-center">
          <p className={cn(EYEBROW, "m-0 mb-4")}>404</p>
          <h1 className="font-display font-bold tracking-[-0.04em] text-[clamp(32px,4.4vw,60px)] leading-[1.0] text-ink m-0 max-w-[820px] mx-auto text-balance hero-text-shadow">
            This page has drifted off the canvas.
          </h1>
          <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/85 max-w-[520px] mx-auto mt-6 mb-9">
            The page you were looking for isn&rsquo;t here — but Stephen&rsquo;s
            work is. Let&rsquo;s get you back to it.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/" className={cn(BTN_PRIMARY, "w-fit")}>
              Return home <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <Link to="/collections" className={BTN_SECONDARY}>
              Browse the collections
            </Link>
          </div>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
};
