import { useEffect, useRef, useState } from "react";

/**
 * Scroll-trigger cinematic intro.
 *
 * Video plays muted on a loop. As the user scrolls, the intro fades out and
 * the welcome content rises underneath. Respects prefers-reduced-motion
 * (renders the poster instead of autoplaying).
 */
export const VideoIntro = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const base = import.meta.env.BASE_URL;

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
      setScrollProgress(progress);
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
  }, []);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <section ref={sectionRef} className="video-intro" aria-label="Introduction">
      <div
        className="video-intro__stage"
        style={{
          opacity: 1 - scrollProgress * 1.4,
          transform: `scale(${1 + scrollProgress * 0.06})`,
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
      </div>
    </section>
  );
};
