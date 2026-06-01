import { useEffect, useRef, useState } from "react";

/**
 * Scroll-trigger cinematic intro (home page only).
 *
 * Playback model:
 *  - EVERY device — desktop AND phone — mounts the looping muted <video> and
 *    autoplays it forever, exactly as it does on the computer (Hugo's explicit
 *    requirement). The earlier "low-power / narrow viewport → static poster"
 *    gate was REMOVED: on a phone the video must roll on its own, not show a
 *    tap-to-play button.
 *  - The ONLY case that still falls back to the static poster image is
 *    `prefers-reduced-motion: reduce` (an accessibility setting the user chose)
 *    — there the heavy <video> is never mounted, so nothing animates.
 *  - iOS Safari autoplay is finicky: it only honours autoplay for muted +
 *    playsInline video, and a freshly-mounted element often still needs an
 *    explicit play() call. We kick play() on mount + on loadedmetadata/canplay,
 *    and wire a ONE-TIME first-interaction fallback (touch / click / scroll) so
 *    the loop starts the instant the user does anything, even when iOS blocks
 *    programmatic autoplay outright (e.g. Low Power Mode).
 *  - An IntersectionObserver PAUSES the video when the hero scrolls off-screen
 *    (saving decode cycles + battery) and resumes it when scrolled back.
 *  - The scroll-driven fade/scale touches ONLY opacity + transform (GPU
 *    compositing), is rAF-throttled, and never hijacks or blocks native scroll.
 *
 * Video assets (re-encoded 2026-05-31): intro.webm (VP9, ~3.6MB) + intro.mp4
 * (H.264 720p, ~4.0MB), audio stripped — down from a 38MB 1440p/25Mbps source.
 * Reduced-motion users get the 891KB poster instead.
 */

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const VideoIntro = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  // The <video> mounts on every device and autoplays + loops. The only
  // fallback to the static poster is prefers-reduced-motion (accessibility).
  const [useVideo, setUseVideo] = useState(false);
  // Reduced-motion users get a STATIC stage: no scroll listener is wired and
  // no opacity/scale transform is applied — the intro simply rests in place.
  const [reducedMotion, setReducedMotion] = useState(false);
  const base = import.meta.env.BASE_URL;

  useEffect(() => {
    const reduce = prefersReducedMotion();
    setReducedMotion(reduce);
    setUseVideo(!reduce);
  }, []);

  // Scroll-driven fade + gentle scale. opacity/transform only, rAF-throttled,
  // passive listener — page scroll stays fully native. Skipped entirely under
  // prefers-reduced-motion (the stage stays static — see `reducedMotion`).
  useEffect(() => {
    if (reducedMotion) return;
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
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  // Autoplay + keep-alive. (1) Kick play() on mount and as soon as the media is
  // ready (loadedmetadata / canplay) — covers iOS, where the autoPlay attribute
  // alone is unreliable. (2) A one-time first-interaction fallback (touch /
  // click / scroll) starts the loop even if iOS blocked programmatic autoplay
  // (e.g. Low Power Mode). (3) An IntersectionObserver pauses the video when the
  // hero leaves the viewport and resumes it when it returns.
  useEffect(() => {
    if (!useVideo) return;
    const el = sectionRef.current;
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      void video.play?.().catch(() => {});
    };
    tryPlay();
    video.addEventListener("loadedmetadata", tryPlay);
    video.addEventListener("canplay", tryPlay);

    // First-interaction fallback for browsers that refuse programmatic autoplay.
    let kicked = false;
    const removeKick = () => {
      window.removeEventListener("touchstart", kick);
      window.removeEventListener("click", kick);
      window.removeEventListener("scroll", kick);
    };
    function kick() {
      if (kicked) return;
      kicked = true;
      tryPlay();
      removeKick();
    }
    window.addEventListener("touchstart", kick, { passive: true });
    window.addEventListener("click", kick, { passive: true });
    window.addEventListener("scroll", kick, { passive: true });

    // Pause when the hero leaves the viewport; resume when it returns.
    let io: IntersectionObserver | null = null;
    if (el) {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) tryPlay();
          else video.pause();
        },
        { threshold: 0.05 },
      );
      io.observe(el);
    }

    return () => {
      video.removeEventListener("loadedmetadata", tryPlay);
      video.removeEventListener("canplay", tryPlay);
      removeKick();
      io?.disconnect();
    };
  }, [useVideo]);

  return (
    <section ref={sectionRef} className="video-intro" aria-label="Introduction">
      <div
        className="video-intro__stage"
        style={
          reducedMotion
            ? undefined
            : {
                opacity: 1 - scrollProgress * 1.4,
                // translateZ(0) keeps the scale on the compositor (GPU) so the
                // scroll-driven dissolve never triggers a layout/paint pass.
                transform: `translateZ(0) scale(${1 + scrollProgress * 0.06})`,
              }
        }
      >
        {useVideo ? (
          <video
            ref={videoRef}
            className="video-intro__video"
            autoPlay
            muted
            loop
            playsInline
            // iOS reads this lowercase attribute; the React prop above covers
            // every other engine. Belt-and-braces for phone autoplay.
            // eslint-disable-next-line react/no-unknown-property
            webkit-playsinline="true"
            preload="auto"
            poster={`${base}video/poster.jpg`}
          >
            {/* WebM/VP9 first (smaller) for browsers that support it; H.264
                mp4 fallback. Both 720p, audio stripped (re-encoded 2026-05-31). */}
            <source src={`${base}video/intro.webm`} type="video/webm" />
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
