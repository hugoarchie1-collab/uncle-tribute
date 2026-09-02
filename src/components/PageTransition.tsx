import { useLayoutEffect, type ReactNode } from "react";
import { useLocation, useNavigationType, type NavigationType } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { canonicalPath } from "../lib/legacyRoutes";

/**
 * PageTransition — a fast, dignified crossfade between routes.
 *
 * Outgoing page fades to 0 (200ms, soft ease-in) into the house #0a0908
 * canvas, then — after a 40ms beat — the incoming page fades up from 0
 * (420ms, cubic-bezier(0.16,0.84,0.32,1), the house deceleration tail).
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

/** House deceleration curve — matches the site's signature easing. A long,
 *  soft tail so the incoming page settles to full opacity gracefully. */
const ENTER_EASE: [number, number, number, number] = [0.16, 0.84, 0.32, 1];
/** Gentle accelerate for the outgoing page — quick and unceremonious, easing
 *  INTO the fade so the old page doesn't snap off the moment you click. */
const EXIT_EASE: [number, number, number, number] = [0.5, 0, 0.85, 0.5];

const routeVariants: Variants = {
  initial: ({ instant }: RouteTransitionCustom) =>
    instant ? { opacity: 1 } : { opacity: 0 },
  enter: ({ instant }: RouteTransitionCustom) => ({
    opacity: 1,
    transition: instant
      ? { duration: 0 }
      // A touch longer + a small lead-in delay so the incoming page rises
      // cleanly out of the house canvas after the exit clears, not on top of
      // it — a calmer, more deliberate dissolve. Opacity only (invariant 1).
      : { duration: 0.42, ease: ENTER_EASE, delay: 0.04 },
  }),
  exit: ({ instant }: RouteTransitionCustom) => ({
    // Instant navigations keep the old page fully opaque for its zero-length
    // exit so back/forward reads as today's immediate swap.
    opacity: instant ? 1 : 0,
    transition: instant ? { duration: 0 } : { duration: 0.2, ease: EXIT_EASE },
  }),
};

/** True until ScrollManager runs once. Module scope on purpose: it marks the
 *  session's COLD LOAD, which React Router reports as navType POP and which
 *  therefore used to skip the fragment the URL asked for. */
let isFirstRun = true;

/**
 * Scroll behaviour on route change (logic preserved from the original
 * App-level ScrollToTop, relocated so it runs as the incoming page mounts):
 *  - FIRST RUN of the session with a hash: honour the hash (see below)
 *  - POP (browser back/forward): let the browser restore its scroll position
 *  - PUSH / REPLACE with hash: poll for the target element (page may still be
 *    mounting + fixed backdrop layer settling), then scroll it into view
 *  - PUSH / REPLACE without hash: scroll to top, synchronously before paint
 *
 * ⚠️ THE FIRST-RUN CASE IS NOT COSMETIC (added 2026-09-02). React Router reports
 * navType POP for the initial navigation, so a COLD load carrying a fragment —
 * themandalacompany.com/contact#faq from an order email, a Google result for the
 * retired /faq, any /legal#returns-2 deep link — returned early and never
 * scrolled. The browser's own fragment jump cannot cover for it either: this is
 * an SPA, so at document-load time the target element does not exist yet and
 * nothing retries. Verified live: /faq redirected correctly and then left the
 * reader on the contact FORM, 909px above the questions they had asked for.
 * `isFirstRun` is module scope, so it distinguishes the initial load from every
 * later back/forward POP, whose browser scroll restoration stays untouched.
 *
 * ⚠️ `search` IS a dependency (added 2026-09-01). A same-pathname query change —
 * /search?q=a → /search?q=b, the ONLY route that does this today — used to leave
 * the reader stranded wherever they were: they'd refine from the bottom of a long
 * results page and the content would silently swap above them. `location.search`
 * was not in the dep list and `key={location.pathname}` means no remount, so
 * nothing reset the scroll. The three existing behaviours are untouched by this:
 * POP still returns early (browser scroll restoration intact), a hash still takes
 * the poll-and-scrollIntoView path (/collections#collection-<id> intact), and no
 * other page mutates its query string (there is no setSearchParams call anywhere
 * in src/ — every useSearchParams is read-only, and no <Link> targets a bare
 * "?…" on the current pathname), so this adds exactly one new trigger.
 */
const ScrollManager = ({
  pathname,
  search,
  hash,
  navType,
}: {
  pathname: string;
  search: string;
  hash: string;
  navType: NavigationType;
}) => {
  useLayoutEffect(() => {
    // The initial navigation reports POP; a cold URL's fragment still has to be
    // honoured. Consume the flag on the first run whatever happens, so a genuine
    // back/forward later in the session is never mistaken for a cold load.
    const coldLoad = isFirstRun;
    isFirstRun = false;

    if (navType === "POP" && !coldLoad) return;

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

    // A cold load with no hash already starts at the top, and forcing a
    // scrollTo here would fight the browser's own restoration on a reload.
    if (coldLoad) return;

    // useLayoutEffect → this runs before the incoming page's first paint, so
    // the new route is never seen at the old scroll position, even mid-fade.
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, search, hash, navType]);

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
        key={canonicalPath(location.pathname)}
        custom={custom}
        variants={routeVariants}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        <ScrollManager
          pathname={location.pathname}
          search={location.search}
          hash={location.hash}
          navType={navType}
        />
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
