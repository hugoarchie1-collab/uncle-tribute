import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { MagneticLink } from "../components/MagneticLink";
import { ShareTheEstate } from "../components/ShareTheEstate";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { EYEBROW, TITLE, SUBTITLE, BTN_PRIMARY, BTN_SECONDARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { usePageTitle } from "../lib/usePageTitle";
import { clearBasket } from "../lib/basket";

/**
 * Post-checkout confirmation page. Stripe redirects here on a successful
 * payment with ?session_id=cs_… in the URL. The Stripe receipt email is
 * sent automatically by Stripe; we just acknowledge the order here.
 */
export const OrderSuccess = () => {
  usePageTitle("Order confirmed — The Art of Stephen Meakin");
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  // Clear the basket once on mount. Stripe only redirects here after a
  // successful payment, so it's safe to wipe local state at this point.
  useEffect(() => {
    clearBasket();
  }, []);

  return (
    <div className="relative min-h-[100svh] flex flex-col">
      <AmbientBackdrop opacity={0.45} />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto max-w-[820px] px-4 sm:px-6 md:px-8 lg:px-12 py-20 md:py-28 text-center">
        <Reveal>
          <p className={cn(EYEBROW, "m-0 mb-5")}>
            Order confirmed
          </p>
          <h1 className={cn(TITLE, "my-0 mb-7 mx-auto max-w-[820px] hero-text-shadow")}>
            Thank you.
          </h1>
          <p className={cn(SUBTITLE, "my-0 mb-5 mx-auto text-center max-w-[640px]")}>
            Your payment has been received. Stripe is sending your receipt now.
          </p>
          <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.75] text-ink-muted my-0 mb-10 mx-auto max-w-[640px]">
            Each print is made to order. We place yours with our atelier, Point 101 in London,
            within two working days, then ship to the address you gave at checkout. A tracking
            link follows the moment it leaves the studio.
          </p>
          {sessionId && (
            <p className="font-sans text-[13px] leading-[1.6] text-ink-muted m-0 mb-10">
              Reference: {sessionId.slice(0, 18)}…
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <MagneticLink
              to="/collections"
              className={BTN_PRIMARY}
              ariaLabel="See more of his work"
            >
              See more of his work <span aria-hidden="true" className="ml-2">→</span>
            </MagneticLink>
            <a href="mailto:info@themandalacompany.com" className={BTN_SECONDARY}>
              Contact us
            </a>
          </div>
          {/* Share the estate — quiet post-purchase share affordance.
              Framed as an introduction to Stephen's work, not a referral. */}
          <ShareTheEstate align="center" />
        </Reveal>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};

/**
 * Stripe redirects here if the buyer abandons checkout. No charge has been
 * taken; we just reassure them and offer the way back.
 */
export const OrderCancel = () => {
  usePageTitle("Order cancelled — The Art of Stephen Meakin");
  return (
    <div className="relative min-h-[100svh] flex flex-col">
      <AmbientBackdrop opacity={0.45} />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto max-w-[820px] px-4 sm:px-6 md:px-8 lg:px-12 py-20 md:py-28 text-center">
        <Reveal>
          <p className={cn(EYEBROW, "m-0 mb-5")}>
            Order cancelled
          </p>
          <h1 className={cn(TITLE, "my-0 mb-7 mx-auto max-w-[820px] hero-text-shadow")}>
            No charge taken.
          </h1>
          <p className={cn(SUBTITLE, "my-0 mb-10 mx-auto text-center max-w-[640px]")}>
            You left checkout before completing the order, so nothing was charged. If a detail
            was unclear, or you would like help choosing a colourway, write to us.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <MagneticLink
              to="/collections"
              className={BTN_PRIMARY}
              ariaLabel="Back to collections"
            >
              Back to collections <span aria-hidden="true" className="ml-2">→</span>
            </MagneticLink>
            <a href="mailto:info@themandalacompany.com" className={BTN_SECONDARY}>
              Ask a question
            </a>
          </div>
        </Reveal>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
