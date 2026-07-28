import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * ScrollToTop — a quiet floating "return to top" control (Hugo 2026-07-28:
 * "a button to scroll to top"). On the long editorial pages (About, a product
 * page, the collections grid) a reader who has travelled far down gets a small
 * wax-seal-red disc, bottom-right, to jump back to the masthead in one tap —
 * rather than swiping the whole way up by hand.
 *
 * Behaviour:
 *  - Hidden until the reader is past one viewport of scroll (600px floor), so
 *    it never clutters the first screen.
 *  - Sits bottom-right at z-[100] — below the consent bar (z-110), toasts
 *    (z-120) and modals (z-200), so it can never cover a decision control; it
 *    also lifts above the consent bar's height while that bar is open so the two
 *    don't overlap.
 *  - Smooth scroll (honours prefers-reduced-motion → instant jump).
 *  - Mounted once at the app root, outside the route crossfade, so it persists
 *    across navigations like the rest of the fixed chrome.
 */
export const ScrollToTop = () => {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toTop = () =>
    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? ("instant" as ScrollBehavior) : "smooth",
    });

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      title="Back to top"
      className={`press fixed bottom-6 right-5 sm:right-6 z-[100] inline-flex h-12 w-12 items-center justify-center rounded-full text-ink shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7)] ring-1 ring-white/15 backdrop-blur-sm transition-[opacity,transform] duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
        shown ? "opacity-100" : "pointer-events-none opacity-0 translate-y-2"
      }`}
      style={{
        background:
          "linear-gradient(160deg, rgba(72,14,14,0.94), rgba(40,8,9,0.96))",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
};
