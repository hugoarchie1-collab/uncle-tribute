import { useCallback, useEffect, useRef, useState } from "react";

interface VideoIntroProps {
  /** Fires once when the viewer scrolls past the intro or skips it. */
  onComplete?: () => void;
}

/**
 * The scroll-trigger cinematic intro.
 *
 * The video plays muted on a loop (browser autoplay policy requires muted).
 * As the user scrolls, the intro fades out and the welcome content rises
 * underneath it. Once the intro is fully out of view, `onComplete` fires.
 *
 * Respects prefers-reduced-motion: the video doesn't autoplay and a poster
 * image is shown instead.
 */
export const VideoIntro = ({ onComplete }: VideoIntroProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const base = import.meta.env.BASE_URL;

  // Scroll → opacity / scale progression
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Progress from 0 (intro fills the viewport) to 1 (fully scrolled past)
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
      setScrollProgress(progress);
      if (progress >= 0.98 && !completed) {
        setCompleted(true);
        onComplete?.();
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [completed, onComplete]);

  const handleSkip = useCallback(() => {
    document.getElementById("welcome-anchor")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Reduced motion: render a static poster instead of autoplaying video
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // The intro section is 200vh tall so it has scroll-room for the fade.
  return (
    <section
      ref={sectionRef}
      className="video-intro"
      aria-label="Introduction"
    >
      <div
        className="video-intro__stage"
        style={{
          opacity: 1 - scrollProgress * 1.4,
          transform: `scale(${1 + scrollProgress * 0.08})`,
        }}
      >
        {prefersReducedMotion ? (
          <img
            src={`${base}video/poster.jpg`}
            alt="The Wild Rose mandala on an easel in Stephen's garden"
            className="video-intro__poster"
          />
        ) : (
          <video
            ref={videoRef}
            className="video-intro__video"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={`${base}video/poster.jpg`}
          >
            <source src={`${base}video/intro.webm`} type="video/webm" />
            <source src={`${base}video/intro.mp4`} type="video/mp4" />
          </video>
        )}

        <div className="video-intro__vignette" aria-hidden="true" />

        <div className="video-intro__overlay">
          <p className="video-intro__caption">
            <span className="video-intro__caption-line">The Art of</span>
            <span className="video-intro__caption-name">Stephen Meakin</span>
          </p>

          <button
            type="button"
            onClick={handleSkip}
            className="video-intro__cue"
            aria-label="Scroll to the site"
          >
            <span>scroll</span>
            <span className="video-intro__cue-line" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};
