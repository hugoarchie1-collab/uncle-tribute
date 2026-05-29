import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { VideoIntro } from "./VideoIntro";
import { Nav } from "./Nav";
import { useHideOnScroll } from "../lib/useHideOnScroll";

/**
 * The cinematic intro film as a page header, with the overlay Nav floating
 * above it. Placed at the top of content pages (in place of a bare `<Nav />`)
 * so the intro can be reached by scrolling up from anywhere on the site.
 *
 * Hide-on-scroll: the film is only a brief top-of-page moment, never a
 * persistent banner. It shows at the very top (scrollY ≈ 0); the moment the
 * reader scrolls DOWN past a small threshold it collapses away (height → 0 +
 * fade) and *stays* vanished — it does not keep reappearing mid-page. It comes
 * back only when the reader scrolls back UP to the very top. See
 * `useHideOnScroll` for the exact thresholds.
 *
 * The `z-10` wrapper lifts the 100vh film above the fixed `AmbientBackdrop`
 * (z-0); the overlay Nav (`fixed`, z-50) floats above the film; and the page's
 * own `<main>` — which already carries generous top padding — sits below and
 * clears the fixed nav. Drop-in replacement for `<Nav />` on pages whose root
 * is `relative` with the backdrop as first child.
 */
export const IntroFilmHeader = () => {
  const reduceMotion = useReducedMotion();
  const hidden = useHideOnScroll();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Pause the looping <video> while collapsed (perf); resume when revealed.
  // VideoIntro owns the element, so we reach it through the wrapper ref rather
  // than threading a prop into that (untouched) component.
  useEffect(() => {
    const video = wrapperRef.current?.querySelector("video");
    if (!video) return;
    if (hidden) {
      video.pause();
    } else {
      // play() returns a promise that can reject if interrupted — ignore.
      void video.play?.().catch(() => {});
    }
  }, [hidden]);

  return (
    <>
      <AnimatePresence initial={false}>
        {!hidden && (
          <motion.div
            ref={wrapperRef}
            className="relative z-10 overflow-hidden"
            aria-hidden={hidden}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={
              reduceMotion
                ? { height: "auto", opacity: 1 }
                : { height: "100vh", opacity: 1 }
            }
            exit={
              reduceMotion
                ? { height: 0, opacity: 0, transition: { duration: 0 } }
                : { height: 0, opacity: 0 }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }
            }
          >
            <VideoIntro />
          </motion.div>
        )}
      </AnimatePresence>
      <Nav overlay />
    </>
  );
};
