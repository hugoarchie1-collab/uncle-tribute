import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { cn } from "../lib/cn";
import { EYEBROW } from "./ui/tokens";

/**
 * Friends & Family — a quiet commemoration thank-you for Stephen's circle.
 *
 * The estate shares ONE reusable Stripe promotion code with friends & family
 * (posted in the private Facebook remembrance group). THIS FILE is the single
 * place the literal code string lives on the site.
 *
 * Two presentational pieces, both in the site's dignified memorial register
 * (no "% OFF", no popup, no countdown, no false scarcity):
 *
 *  1. <FriendsAndFamilyNote /> — a quiet line on the Basket page, just above
 *     "Proceed to checkout". It names NEITHER the code NOR a percentage, so a
 *     random public visitor can't pocket the discount; it only tells someone
 *     who ALREADY HAS the code to enter it at checkout. The genuine saving is
 *     shown honestly by Stripe once the code is typed (advertised == charged,
 *     DMCC-clean — matches the no-number discipline the bundle block already
 *     uses in Basket.tsx).
 *
 *  2. <FriendsAndFamilyWelcome /> — a once-per-device welcome ribbon shown ONLY
 *     to people who arrive via the private Facebook link (…?ff=1). This is the
 *     ONE place the literal code appears on-site. Dismissible, styled like
 *     BasketToast, reduced-motion safe. Mounted once globally in App.tsx.
 *
 * IMPORTANT: typing the code grants £0 off until Hugo creates the matching
 * Stripe Coupon + Promotion Code (CONNECTED) in the dashboard — the live
 * secret key isn't on the dev machine, mirroring the FRIENDS-fallback pattern.
 * The PERCENT is set in Stripe, never here, so the code string stays decoupled
 * from the discount depth (12% recommended; a 15% time-boxed window is the
 * alternative). See CLAUDE.md.
 */

/** The shared friends & family promotion code — must match the Stripe
 *  Promotion Code Hugo creates in the dashboard (case-insensitive there). */
export const FRIENDS_FAMILY_CODE = "CONNECTED";

/** localStorage key — the welcome ribbon shows once per device, then never. */
const WELCOMED_KEY = "tasm.ff.welcomed";

/** Quiet Basket line — deliberately states NO code and NO percentage. */
export const FriendsAndFamilyNote = () => (
  <div>
    <p className={cn(EYEBROW, "m-0 mb-2.5")}>Friends &amp; Family</p>
    <p className="font-sans font-normal text-[13px] leading-[1.6] text-ink-muted m-0 max-w-[520px]">
      If Steve&rsquo;s family shared a remembrance code with you, add it at
      checkout &mdash; a small thank-you for keeping his work close. For a single
      keepsake print.
    </p>
  </div>
);

/** ?ff= welcome ribbon — the one on-site place the literal code appears.
 *  Self-gates on ?ff= + localStorage; renders an empty (null-content) layer
 *  otherwise, so it is safe to mount once globally. */
export const FriendsAndFamilyWelcome = () => {
  const reduce = useReducedMotion();
  const [searchParams] = useSearchParams();

  // Decide visibility ONCE at first render: show only for ?ff= arrivals who
  // haven't been welcomed on this device yet. Reading the param + localStorage
  // is synchronous in this CSR-only app, so no effect/setState is needed to
  // decide — which also keeps us clear of react-hooks/set-state-in-effect.
  const [open, setOpen] = useState(() => {
    if (!searchParams.get("ff")) return false;
    try {
      return window.localStorage.getItem(WELCOMED_KEY) === null;
    } catch {
      return true;
    }
  });

  // Persist the "welcomed" flag as a side effect (a storage WRITE, not
  // setState) so the ribbon never re-shows on this device.
  useEffect(() => {
    if (!open) return;
    try {
      window.localStorage.setItem(WELCOMED_KEY, "1");
    } catch {
      /* private-mode storage blocked — accept a possible re-show next visit */
    }
  }, [open]);

  // Slide distance collapses to 0 under reduced-motion (pure fade).
  const offset = reduce ? 0 : 14;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-5 z-[120] flex justify-end px-5 sm:px-6"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: offset }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: offset }}
            transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
            className="pointer-events-auto relative flex max-w-[400px] items-start gap-4 bg-bg-soft ring-1 ring-line px-5 py-4 pr-10 shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
          >
            <span className="min-w-0">
              <span className={cn(EYEBROW, "block mb-2")}>Friends &amp; Family</span>
              <span className="block font-sans text-[14px] leading-[1.55] text-ink">
                Welcome, friend of Steve&rsquo;s. Enter{" "}
                <span className="font-bold tracking-[0.04em] text-accent">
                  {FRIENDS_FAMILY_CODE}
                </span>{" "}
                at checkout &mdash; with our love, from the family.
              </span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Dismiss"
              className="absolute top-2.5 right-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:text-ink transition-colors bg-transparent border-0 cursor-pointer p-0"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M1.5 1.5l11 11M12.5 1.5l-11 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
