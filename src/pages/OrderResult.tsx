import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { MagneticLink } from "../components/MagneticLink";
import { ShareTheEstate } from "../components/ShareTheEstate";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { EYEBROW, BTN_PRIMARY, BTN_SECONDARY } from "../components/ui/tokens";
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
    <div className="relative min-h-screen flex flex-col">
      <AmbientBackdrop opacity={0.45} />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto max-w-[820px] px-4 sm:px-6 md:px-8 lg:px-12 py-20 md:py-28 text-center">
        <Reveal>
          <p className={cn(EYEBROW, "m-0 mb-5")}>
            Order confirmed
          </p>
          <h1 className="font-display font-bold tracking-[-0.04em] text-[clamp(40px,6vw,80px)] leading-[0.98] text-ink m-0 mb-7 hero-text-shadow">
            Thank you.
          </h1>
          <p className="font-sans font-normal text-[17px] md:text-[18px] leading-[1.75] text-ink/85 m-0 mb-5 max-w-[640px] mx-auto">
            Your payment has gone through and a receipt is on its way to your inbox from Stripe.
          </p>
          <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.75] text-ink/70 m-0 mb-10 max-w-[640px] mx-auto">
            Each print is individually made to order. We'll place the print with our atelier
            (Point 101, London) within two working days and ship to the address you entered at
            checkout. You'll receive a tracking link as soon as it leaves the studio.
          </p>
          {sessionId && (
            <p className="font-sans text-[13px] leading-[1.6] text-ink/55 m-0 mb-10">
              Reference: {sessionId.slice(0, 18)}…
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <MagneticLink
              to="/collections"
              className={BTN_PRIMARY}
              ariaLabel="Continue browsing collections"
            >
              Continue browsing <span aria-hidden="true" className="ml-2">→</span>
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
    <div className="relative min-h-screen flex flex-col">
      <AmbientBackdrop opacity={0.45} />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto max-w-[820px] px-4 sm:px-6 md:px-8 lg:px-12 py-20 md:py-28 text-center">
        <Reveal>
          <p className={cn(EYEBROW, "m-0 mb-5")}>
            Order cancelled
          </p>
          <h1 className="font-display font-bold tracking-[-0.04em] text-[clamp(40px,6vw,80px)] leading-[0.98] text-ink m-0 mb-7 hero-text-shadow">
            No charge taken.
          </h1>
          <p className="font-sans font-normal text-[17px] md:text-[18px] leading-[1.75] text-ink/85 m-0 mb-10 max-w-[640px] mx-auto">
            You backed out of checkout before completing your order. Nothing was charged.
            If anything was unclear or you'd like help choosing a colourway, write to us.
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
      <Footer />
    </div>
  );
};
