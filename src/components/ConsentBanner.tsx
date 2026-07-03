import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useConsent, setConsent } from "../lib/consent";
import { initTrackingIfConsented } from "../lib/tracking";
import { BTN_PRIMARY, EASE_SIGNATURE } from "./ui/tokens";
import { cn } from "../lib/cn";

/**
 * Consent banner — the estate's quiet answer to the cookie-popup cliché.
 *
 * A single hairline-topped bar along the foot of the viewport: one factual
 * sentence, two choices, a link to the privacy policy. No overlay, no modal,
 * no blocking the page, no "we value your privacy" theatre.
 *
 * Renders ONLY while no decision exists in `tasm.consent.v1` (lib/consent.ts).
 * "Allow analytics" persists the accept and initialises GA4 + Meta Pixel on
 * the spot (lib/tracking.ts); "Essential only" persists the decline and loads
 * nothing — ever. The footer's "Cookie preferences" link clears the decision,
 * and because this component subscribes to the consent store it re-opens
 * live, no reload.
 *
 * Z-register: z-[110] — above the page + exit-intent toast (z-[80]), below
 * the basket/FF toasts (z-[120]) and far below modals (z-200). Entrance is a
 * gentle fade-up; MotionConfig reducedMotion="user" (App.tsx) strips the
 * transform for those who ask. Buttons are native <button>s — fully keyboard
 * accessible with the global focus styles.
 */
export const ConsentBanner = () => {
  const consent = useConsent();
  if (consent !== null) return null;

  const decide = (marketing: boolean) => {
    setConsent(marketing);
    // On accept, the scripts initialise immediately (no reload needed). On
    // decline this is a guaranteed no-op — consent gates everything inside.
    if (marketing) initTrackingIfConsented();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_SIGNATURE }}
      role="region"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-[110] border-t border-line bg-[#0a0908]/[0.98]"
    >
      <div className="mx-auto max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[1840px] px-4 sm:px-6 md:px-8 lg:px-12 pt-4 md:pt-5 pb-safe-4 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
        <p className="font-sans font-normal text-[13px] leading-[1.65] text-ink-muted m-0 flex-1 min-w-0">
          We&rsquo;d like to use analytics and advertising cookies to understand
          how the estate&rsquo;s site is found. Essential cookies only, unless
          you allow more.{" "}
          <Link
            to="/privacy"
            className="underline underline-offset-4 transition-colors duration-300 hover:text-ink whitespace-nowrap"
          >
            How we handle data
          </Link>
        </p>
        <div className="flex items-center gap-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => decide(true)}
            className={BTN_PRIMARY}
          >
            Allow analytics
          </button>
          <button
            type="button"
            onClick={() => decide(false)}
            className={cn(
              "font-sans text-[13px] font-bold tracking-[0.04em] text-ink-muted",
              "hover:text-ink transition-colors duration-300 bg-transparent border-0 p-0 cursor-pointer min-h-[44px]",
            )}
          >
            Essential only
          </button>
        </div>
      </div>
    </motion.div>
  );
};
