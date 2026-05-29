import { useEffect, useState } from "react";

/**
 * Hide-on-scroll with a "lock vanished" semantic.
 *
 * Returns `true` while the tracked element should be HIDDEN.
 *
 * Behaviour:
 * - At the very top of the page (scrollY < `revealAt`) the element is visible.
 * - The first time the user scrolls DOWN past `hideAfter`, it hides — and then
 *   STAYS hidden no matter how the user scrolls, until they scroll back UP to
 *   (near) the very top (scrollY < `revealAt`). It does not flicker back on
 *   every upward nudge mid-page; it only un-hides at the top.
 *
 * The scroll listener is passive and rAF-throttled. Intended for a single
 * top-of-page banner (the intro film header), so it tracks `window` scroll.
 */
export const useHideOnScroll = ({
  hideAfter = 64,
  revealAt = 8,
}: {
  /** Scroll-down distance (px) past which the element hides. */
  hideAfter?: number;
  /** Scroll position (px) at/below which the element reveals again. */
  revealAt?: number;
} = {}): boolean => {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let raf = 0;

    const evaluate = () => {
      const y = window.scrollY;
      setHidden((wasHidden) => {
        // Near the very top: always revealed (this is the only way back).
        if (y <= revealAt) return false;
        // Once hidden, stay hidden until we're back near the top.
        if (wasHidden) return true;
        // Not yet hidden: hide as soon as we're scrolled down past the threshold.
        return y > hideAfter;
      });
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(evaluate);
    };

    // Sync to the current scroll position on mount (e.g. restored scroll).
    evaluate();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [hideAfter, revealAt]);

  return hidden;
};
