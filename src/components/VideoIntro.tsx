import { useEffect, useRef, useState } from "react";

/**
 * Scroll-trigger cinematic intro (home page only).
 *
 * Performance model (#2):
 *  - PHONES / coarse-pointer / narrow viewports + prefers-reduced-motion get a
 *    STATIC poster image — the heavy <video> element is never mounted, so the
 *    multi-MB file is never downloaded or decoded on mobile. This is the single
 *    biggest win for scroll smoothness on a mid-tier phone.
 *  - Desktop plays the looping muted video, but an IntersectionObserver PAUSES
 *    it the moment the hero scrolls off-screen (saving decode cycles + battery)
 *    and resumes it when scrolled back to the top.
 *  - The scroll-driven fade/scale touches ONLY opacity + transform (GPU
 *    compositing), is rAF-throttled, and never hijacks or blocks native scroll.
 *
 * NOTE (#2 re-encode — still pending): public/video/intro.mp4 is ~38MB. It
 * should be re-encoded (cap 1920px, strip audio, sensible bitrate) and shipped
 * as H.264 .mp4 + a WebM/VP9 fallback. Requires ffmpeg (not available in this
 * environment). Until then the video is desktop-only (mobile uses the poster),
 * which removes the worst of the cost.
 */

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Phones / touch devices / narrow windows: skip the video entirely.
const isLowPowerViewport = (): boolean =>
  typeof window !== "undefined" &&
  (!!window.matchMedia?.("(pointer: coarse)").matches ||
    !!window.matchMedia?.("(max-width: 767px)").matches);

export const VideoIntro = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  // Decided once on mount (client-only) so the <video> is never even rendered
  // on mobile / reduced-motion — no element, no download.
  const [useVideo, setUseVideo] = useState(false);
  const base = import.meta.env.BASE_URL;

  useEffect(() => {
    setUseVideo(!prefersReducedMotion() && !isLowPowerViewport());
  }, []);

  // Scroll-driven fade + gentle scale. opacity/transform only, rAF-throttled,
  // passive listener — page scroll stays fully native.
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

  // Pause when the hero leaves the viewport; resume when it returns.
  useEffect(() => {
    if (!useVideo) return;
    const el = sectionRef.current;
    const video = videoRef.current;
    if (!el || !video) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play?.().catch(() => {});
        else video.pause();
      },
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [useVideo]);

  return (
    <section ref={sectionRef} className="video-intro" aria-label="Introduction">
      <div
        className="video-intro__stage"
        style={{
          opacity: 1 - scrollProgress * 1.4,
          transform: `scale(${1 + scrollProgress * 0.06})`,
        }}
      >
        {useVideo ? (
          <video
            ref={videoRef}
            className="video-intro__video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={`${base}video/poster.jpg`}
          >
            {/* TODO(#2): once re-encoded, add a smaller H.264 mp4 (≤1920px,
                audio stripped) + a WebM/VP9 <source> ahead of this. */}
            <source src={`${base}video/intro.mp4`} type="video/mp4" />
          </video>
        ) : (
          <picture style={{ display: "contents" }}>
            <source srcSet={`${base}video/poster.webp`} type="image/webp" />
            <img
              src={`${base}video/poster.jpg`}
              alt="The Wild Rose mandala on an easel in Stephen's garden"
              className="video-intro__poster"
              decoding="async"
              fetchPriority="high"
            />
          </picture>
        )}

        <div className="video-intro__vignette" aria-hidden="true" />
      </div>
    </section>
  );
};
