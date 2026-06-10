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
 * DEFERRED FETCH (off the critical path):
 *  - The multi-MB film must NOT compete with fonts/hero/LCP during first paint.
 *    The <video> mounts with preload="none" and NO <source> children, so the
 *    browser fetches zero media bytes up front. The ~100KB poster-v2 (already
 *    <link rel="preload">ed in index.html) paints the frame instantly via the
 *    poster attribute. Once a "go" signal fires — window 'load' (already fired
 *    or fires), a requestIdleCallback/setTimeout(~1200ms) safety net, OR the
 *    user's first interaction (they're engaged → start the film) — we attach the
 *    sources, call load(), and kick play(). The poster keeps the frame painted
 *    across the swap; a CSS opacity crossfade (driven by the 'playing' event)
 *    eases the video in over the poster with no visible pop.
 *
 * Video assets (re-encoded 2026-06-10, "-v2" names because /video is cached
 * immutable for 1yr): intro-v2.webm (VP9 two-pass) + intro-v2.mp4 (H.264
 * CRF 33), both 720p, denoised (hqdn3d) + audio stripped — the high-entropy
 * footage (starfield + foliage) made the old files 3.8–4.2MB; these are
 * 1.4MB/2.2MB. Reduced-motion
 * users get the ~100KB poster-v2 instead (1280×720, down from a 2560×1440
 * 469KB webp).
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
  // Lazy initialisers (not a mount effect): the media-query answer is known
  // synchronously, and initialising in-render avoids a first-frame flip from
  // poster→video (and the react-hooks/set-state-in-effect lint error).
  const [useVideo] = useState(() => !prefersReducedMotion());
  // Reduced-motion users get a STATIC stage: no scroll listener is wired and
  // no opacity/scale transform is applied — the intro simply rests in place.
  const [reducedMotion] = useState(prefersReducedMotion);
  // Gate for the deferred media fetch. Stays false until the "go" signal fires
  // (window load / idle fallback / first interaction); only then do the
  // <source> children mount, so the browser pulls zero video bytes at first
  // paint. The poster attribute keeps the frame painted in the meantime.
  const [go, setGo] = useState(false);
  // Drives the gentle opacity crossfade: the video element starts at 0 (the
  // poster shows through the `poster` attribute) and eases to 1 on 'playing',
  // so the first decoded frame never "pops" in over the still.
  const [playing, setPlaying] = useState(false);
  const base = import.meta.env.BASE_URL;

  // Defer the media fetch until AFTER first paint so the film never competes
  // with fonts/hero/LCP. Flip `go` on whichever fires first: window 'load'
  // (already done or pending), an idle/timeout safety net (~1200ms — so a slow
  // page that never settles still starts the film), or the user's first
  // interaction (engagement = start it now). Skipped under reduced-motion,
  // where the <video> is never mounted at all.
  useEffect(() => {
    if (!useVideo || go) return;
    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      cleanup();
      setGo(true);
    };

    // Idle/timeout safety net so we never wait forever on a stalled load.
    const ric = (
      window as Window &
        typeof globalThis & {
          requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
          cancelIdleCallback?: (id: number) => void;
        }
    ).requestIdleCallback;
    let idleId = 0;
    let timeoutId = 0;
    if (ric) idleId = ric(fire, { timeout: 1200 });
    else timeoutId = window.setTimeout(fire, 1200);

    // First interaction before the go signal = the reader is engaged; bring the
    // film forward early. Passive so it never blocks scroll.
    // ⚠️ DECLARED BEFORE the readyState check below: when the document is
    // already complete, fire() runs SYNCHRONOUSLY and its cleanup() reads
    // `goEvents` — declared after, that's a TDZ ReferenceError that crashed
    // the whole tree at mount (debugged 2026-06-10).
    const goEvents = ["touchstart", "pointerdown", "click", "scroll", "keydown"] as const;
    for (const ev of goEvents) window.addEventListener(ev, fire, { passive: true, once: true });

    // Window 'load' = the critical path is done; pull the film now. If load
    // already fired before this effect ran, document.readyState covers it.
    if (document.readyState === "complete") {
      fire();
    } else {
      window.addEventListener("load", fire, { once: true });
    }

    function cleanup() {
      window.removeEventListener("load", fire);
      for (const ev of goEvents) window.removeEventListener(ev, fire);
      const cic = (window as Window & { cancelIdleCallback?: (id: number) => void })
        .cancelIdleCallback;
      if (idleId && cic) cic(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
    }
    return cleanup;
  }, [useVideo, go]);

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

  // Autoplay + keep-alive. (1) Once the go signal lands, attach the sources +
  // load() so the deferred fetch begins, then kick play() on mount and as soon
  // as the media is ready (loadedmetadata / canplay) — covers iOS, where the
  // autoPlay attribute alone is unreliable. (2) A one-time first-interaction
  // fallback (touch / click / scroll) starts the loop even if iOS blocked
  // programmatic autoplay (e.g. Low Power Mode). (3) An IntersectionObserver
  // pauses the video when the hero leaves the viewport and resumes it when it
  // returns. (4) A 'playing' listener flips `playing` to crossfade the video in.
  useEffect(() => {
    if (!useVideo || !go) return;
    const el = sectionRef.current;
    const video = videoRef.current;
    if (!video) return;

    // React's `muted` PROP is unreliable on the DOM property — iOS Safari only
    // honours muted-autoplay when the element is GENUINELY muted, otherwise it
    // declines autoplay and shows a tap-to-play control (the reported "have to
    // manually click"). Force muted imperatively before play().
    video.defaultMuted = true;
    video.muted = true;
    video.setAttribute("muted", "");

    // Begin the deferred fetch: the <source> children are now in the DOM (go is
    // true), so load() picks them up and starts pulling the chosen encoding.
    video.load();

    const tryPlay = () => {
      void video.play?.().catch(() => {});
    };
    tryPlay();
    video.addEventListener("loadedmetadata", tryPlay);
    video.addEventListener("canplay", tryPlay);

    // Crossfade the video in once it actually paints frames, so the swap from
    // the poster still never pops. (Under reduced-motion this path never runs.)
    const onPlaying = () => setPlaying(true);
    video.addEventListener("playing", onPlaying);

    // First-interaction fallback for browsers that refuse programmatic autoplay
    // (notably iOS Low Power Mode, which blocks even muted autoplay). The
    // instant the user does ANYTHING — the smallest scroll, touch, tap or
    // pointer move — we start the loop. Combined with the CSS that hides the
    // native play-button overlay, the reader never sees or clicks a play glyph.
    let kicked = false;
    const kickEvents = ["touchstart", "pointerdown", "click", "scroll", "keydown"] as const;
    const removeKick = () => {
      for (const ev of kickEvents) window.removeEventListener(ev, kick);
    };
    function kick() {
      if (kicked) return;
      kicked = true;
      tryPlay();
      removeKick();
    }
    for (const ev of kickEvents) {
      window.addEventListener(ev, kick, { passive: true });
    }

    // Resume when the tab/app returns to the foreground (iOS pauses media when
    // back-grounded and won't always restart it on return).
    const onVisible = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("visibilitychange", onVisible);

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
      video.removeEventListener("playing", onPlaying);
      removeKick();
      document.removeEventListener("visibilitychange", onVisible);
      io?.disconnect();
    };
  }, [useVideo, go]);

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
            // every other engine. Belt-and-braces for phone autoplay. (No
            // eslint-disable needed: eslint-plugin-react isn't in this config,
            // and React 19 passes lowercase hyphenated attributes through.)
            webkit-playsinline="true"
            // Deferred: fetch nothing up front. The sources only mount once the
            // go signal fires (see the defer effect), and load() then pulls them.
            preload="none"
            poster={`${base}video/poster-v2.jpg`}
            // Gentle crossfade in over the poster on the first painted frame —
            // no pop. The poster attribute keeps the still painted at opacity 0.
            style={{ opacity: playing ? 1 : 0, transition: "opacity 0.5s ease" }}
          >
            {/* WebM/VP9 first (smaller) for browsers that support it; H.264
                mp4 fallback. Both 720p, audio stripped (re-encoded 2026-06-10).
                Withheld until `go` so the browser pulls zero bytes at first
                paint — the poster carries the frame until then. */}
            {go && (
              <>
                <source src={`${base}video/intro-v2.webm`} type="video/webm" />
                <source src={`${base}video/intro-v2.mp4`} type="video/mp4" />
              </>
            )}
          </video>
        ) : (
          <picture style={{ display: "contents" }}>
            <source srcSet={`${base}video/poster-v2.webp`} type="image/webp" />
            <img
              src={`${base}video/poster-v2.jpg`}
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
