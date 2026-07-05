import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Nav } from "./Nav";
import { useHideOnScroll } from "../lib/useHideOnScroll";
import { asset } from "../lib/asset";

/**
 * CosmicFilmHeader — the garden→galaxy banner as a scroll-up page header, with
 * the overlay Nav floating above it. Drop-in replacement for a bare
 * `<Nav overlay />` at the top of a content page (Hugo: "I want to be able to
 * scroll up on every page and see the banner").
 *
 * Behaviour mirrors the retired IntroFilmHeader: the banner shows at the very
 * top of the page (scrollY ≈ 0); the moment the reader scrolls DOWN past a
 * small threshold it collapses away (height → 0 + fade) and STAYS gone — it is
 * never a persistent mid-page band. It returns only when the reader scrolls
 * back UP to the top. The banner itself is the SAME garden→galaxy film shown on
 * the home page (soft-edged, seamless boomerang, Earth cropped out), reused here
 * so every page opens on the same signature.
 *
 * Autoplay is forced robustly (imperative muted + play() on mount/canplay +
 * a first-interaction fallback) so it loops with NO play button on iOS too, and
 * we pause the <video> while collapsed to save decode cycles.
 */
export const CosmicFilmHeader = () => {
  const reduceMotion = useReducedMotion();
  const hidden = useHideOnScroll();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Robust autoplay. Same recipe as the home banner / VideoIntro: force muted
  // imperatively, kick play() on mount + loadedmetadata + canplay, and a
  // one-time first-interaction fallback for iOS Low Power Mode. The <video> is
  // always rendered (the header is revealed at load, at the top); the separate
  // effect below authoritatively pauses it whenever the header is collapsed.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;
    video.setAttribute("muted", "");
    const tryPlay = () => {
      void video.play?.().catch(() => {});
    };
    tryPlay();
    video.addEventListener("loadedmetadata", tryPlay);
    video.addEventListener("canplay", tryPlay);
    const goEvents = ["touchstart", "pointerdown", "click", "scroll", "keydown"] as const;
    for (const ev of goEvents) window.addEventListener(ev, tryPlay, { passive: true });
    return () => {
      video.removeEventListener("loadedmetadata", tryPlay);
      video.removeEventListener("canplay", tryPlay);
      for (const ev of goEvents) window.removeEventListener(ev, tryPlay);
    };
  }, []);

  // Pause while collapsed (perf); resume when revealed.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (hidden) video.pause();
    else void video.play?.().catch(() => {});
  }, [hidden]);

  return (
    <>
      <AnimatePresence initial={false}>
        {!hidden && (
          <motion.div
            className="relative z-10 w-full overflow-hidden"
            aria-hidden="true"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={
              reduceMotion
                ? { height: "auto", opacity: 1 }
                : { height: "clamp(260px, 44svh, 540px)", opacity: 1 }
            }
            exit={
              reduceMotion
                ? { height: 0, opacity: 0, transition: { duration: 0 } }
                : { height: 0, opacity: 0 }
            }
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }
            }
          >
            {/* The film — full-bleed, feathered on all four sides so it melts
                into the page like the home banner. */}
            <div
              className="relative h-full w-full overflow-hidden bg-transparent"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 10%, #000 88%, transparent 100%)",
                WebkitMaskComposite: "source-in",
                maskImage:
                  "linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 10%, #000 88%, transparent 100%)",
                maskComposite: "intersect",
              }}
            >
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                poster={asset("/video/poster-garden-galaxy-v3.webp")}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-hidden="true"
              >
                <source src={asset("/video/garden-galaxy-v3.webm")} type="video/webm" />
                <source src={asset("/video/garden-galaxy-v3.mp4")} type="video/mp4" />
              </video>
              {/* Gentle inner vignette for depth. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(135% 135% at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.28) 100%)",
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Nav overlay />
    </>
  );
};
