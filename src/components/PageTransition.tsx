import { useLayoutEffect, type ReactNode } from "react";
import { useLocation, useNavigationType, type NavigationType } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";

/**
 * PageTransition — a fast, dignified crossfade between routes.
 *
 * Outgoing page fades to 0 (160ms, ease-in) into the house #0a0908 canvas,
 * then the incoming page fades up from 0 (300ms, cubic-bezier(0.22,1,0.36,1)).
 * AnimatePresence mode="wait" means the two pages are NEVER in the document
 * flow together, so there is zero layout shift and no scrollbar churn.
 *
 * HARD INVARIANTS (debugged once — keep them):
 *
 * 1. OPACITY ONLY on this wrapper — never a transform. Welcome, About,
 *    Collections and PaintingDetail all render `position:fixed inset-0`
 *    backdrop layers INSIDE the routed tree; a transformed ancestor becomes
 *    their containing block and re-bases them from the viewport to this div
 *    (the blurred ambient/peacock layers blow up to page height mid-fade,
 *    then visibly snap back when the transform is removed). This is why the
 *    brief's "y 12px rise" is intentionally absent: a pure crossfade is the
 *    only register that verifiably cannot break the fixed backdrops.
 *
 * 2. Scroll resets inside the INCOMING page's mount (useLayoutEffect →
 *    synchronous, before first paint), never on the location change itself —
 *    so the outgoing page fades in place at its current scroll position and
 *    the incoming page paints its first frame already at the top. No flash
 *    of the old scroll position, no mid-fade jump.
 *
 * 3. ScrollManager takes location as PROPS, not useLocation(). Router
 *    context updates pierce AnimatePresence's cached exiting tree, so a
 *    hook-reading ScrollManager inside the EXITING clone would see the new
 *    pathname and scroll the old page to the top mid-fade. Props are frozen
 *    in the exit clone — the bug is structurally impossible.
 *
 * 4. POP (back/forward) and prefers-reduced-motion are INSTANT swaps
 *    (duration 0 on both phases, opacity pinned at 1) — POP must let the
 *    browser restore its own scroll position against the old document
 *    height, and reduced-motion users get a static route change.
 *
 * 5. AnimatePresence initial={false} — the very first paint of the site is
 *    never dimmed by a fade (LCP paints at full opacity; the branded
 *    SiteEntrance veil owns the first impression instead).
 */

type RouteTransitionCustom = { instant: boolean };

/** House deceleration curve — matches the site's signature easing. */
const ENTER_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Gentle accelerate for the outgoing page — quick and unceremonious. */
const EXIT_EASE: [number, number, number, number] = [0.4, 0, 1, 1];

const routeVariants: Variants = {
  initial: ({ instant }: RouteTransitionCustom) =>
    instant ? { opacity: 1 } : { opacity: 0 },
  enter: ({ instant }: RouteTransitionCustom) => ({
    opacity: 1,
    transition: instant
      ? { duration: 0 }
      : { duration: 0.3, ease: ENTER_EASE },
  }),
  exit: ({ instant }: RouteTransitionCustom) => ({
    // Instant navigations keep the old page fully opaque for its zero-length
    // exit so back/forward reads as today's immediate swap.
    opacity: instant ? 1 : 0,
    transition: instant ? { duration: 0 } : { duration: 0.16, ease: EXIT_EASE },
  }),
};

/**
 * Scroll behaviour on route change (logic preserved from the original
 * App-level ScrollToTop, relocated so it runs as the incoming page mounts):
 *  - POP (browser back/forward): let the browser restore its scroll position
 *  - PUSH / REPLACE with hash: poll for the target element (page may still be
 *    mounting + fixed backdrop layer settling), then scroll it into view
 *  - PUSH / REPLACE without hash: scroll to top, synchronously before paint
 */
const ScrollManager = ({
  pathname,
  hash,
  navType,
}: {
  pathname: string;
  hash: string;
  navType: NavigationType;
}) => {
  useLayoutEffect(() => {
    if (navType === "POP") return;

    if (hash) {
      const id = hash.replace(/^#/, "");
      let attempts = 0;
      const maxAttempts = 30; // 30 × 100ms = 3s max
      let cancelled = false;

      const tryScroll = () => {
        if (cancelled) return;
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (attempts < maxAttempts) {
          attempts += 1;
          window.setTimeout(tryScroll, 100);
        }
      };

      // First attempt after a short delay so the new page has a chance to mount
      const t = window.setTimeout(tryScroll, 80);
      return () => {
        cancelled = true;
        window.clearTimeout(t);
      };
    }

    // useLayoutEffect → this runs before the incoming page's first paint, so
    // the new route is never seen at the old scroll position, even mid-fade.
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash, navType]);

  return null;
};

export const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navType = useNavigationType();
  const reducedMotion = useReducedMotion();

  // Reduced motion → static swap (no animation at all). POP → instant, so the
  // browser's own back/forward scroll restoration works against a document
  // that never collapses mid-restore.
  const custom: RouteTransitionCustom = {
    instant: Boolean(reducedMotion) || navType === "POP",
  };

  return (
    <AnimatePresence mode="wait" initial={false} custom={custom}>
      <motion.div
        key={location.pathname}
        custom={custom}
        variants={routeVariants}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        <ScrollManager
          pathname={location.pathname}
          hash={location.hash}
          navType={navType}
        />
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
