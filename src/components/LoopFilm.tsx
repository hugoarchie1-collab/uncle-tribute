import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { asset } from "../lib/asset";
import { cn } from "../lib/cn";

/**
 * LoopFilm — a reusable muted/looping autoplay video for the site's archive
 * footage (Stephen at work). Lazy-mounts via IntersectionObserver, forces muted
 * + imperative play() on mount / metadata / canplay + a first-interaction
 * fallback so it loops with NO play button on iOS too. Reduced-motion holds the
 * poster still (never null — the section must keep its visual). The box is
 * driven by `aspect` (Tailwind class); `edges` feathers y / all / none;
 * `frame` draws the archive-plate ring. Shared by Welcome + About.
 */
export const LoopFilm = ({
  src,
  poster,
  label,
  aspect,
  edges = "none",
  frame = false,
  className,
  objectPosition = "center",
}: {
  src: string;
  poster: string;
  label: string;
  aspect: string;
  edges?: "y" | "all" | "none";
  frame?: boolean;
  className?: string;
  /** CSS object-position for the poster + video (cover-crop framing). Default
   *  "center". Use e.g. "center 25%" to keep a subject near the top of a wide,
   *  heavily-cropped band (a from-above shot whose subject's head sits high). */
  objectPosition?: string;
}) => {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  // Whether the film is currently in (or near) the viewport. Drives play/PAUSE
  // so an off-screen film stops decoding instead of looping forever in the
  // background (Hugo 2026-08-25 "the whole site is laggy" — the home mounts three
  // of these; three off-screen videos decoding continuously is pure wasted work).
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      setVisible(true);
      return;
    }
    // Kept OBSERVING (not disconnected on first hit): `near` latches true so the
    // <video> mounts once and stays, while `visible` toggles to pause/resume as
    // it scrolls out of / back into view. The 200px margin starts playback just
    // before it enters and pauses just after it leaves, so the loop is always
    // running by the time it's actually on screen.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
        setVisible(entry.isIntersecting);
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduceMotion]);

  useEffect(() => {
    if (!near) return;
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;
    video.setAttribute("muted", "");
    // Off screen → pause and stop spending decode/composite on a film nobody sees.
    if (!visible) {
      video.pause();
      return;
    }
    const tryPlay = () => void video.play?.().catch(() => {});
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
  }, [near, visible]);

  const mask =
    edges === "y"
      ? {
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, #000 9%, #000 91%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, #000 9%, #000 91%, transparent 100%)",
        }
      : edges === "all"
        ? {
            WebkitMaskImage:
              "radial-gradient(140% 140% at 50% 50%, #000 88%, transparent 100%)",
            maskImage:
              "radial-gradient(140% 140% at 50% 50%, #000 88%, transparent 100%)",
          }
        : undefined;

  return (
    <div
      ref={ref}
      className={cn(
        "relative w-full overflow-hidden bg-transparent",
        aspect,
        frame && "rounded-[3px] ring-1 ring-ink/70 shadow-[0_30px_80px_rgba(0,0,0,0.5)]",
        className,
      )}
      style={frame ? undefined : mask}
    >
      {/* Poster paints immediately (and is the reduced-motion still). The video
          below carries the accessible label, so the poster is presentational to
          avoid a duplicate announcement (empty alt). */}
      <img
        src={asset(poster)}
        alt=""
        loading="lazy"
        decoding="async"
        style={{ objectPosition }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {!reduceMotion && near && (
        <video
          // Set muted SYNCHRONOUSLY on mount via the ref callback — React's
          // `muted` prop is unreliable (it often doesn't reflect to the DOM
          // property), and iOS only honours muted-autoplay when the element is
          // GENUINELY muted at the moment it evaluates the autoPlay attribute.
          // Doing it here (before paint) is what makes it autoplay on mobile
          // with no tap. The play() kicks in the effect are the fallback.
          ref={(el) => {
            videoRef.current = el;
            if (el) {
              el.defaultMuted = true;
              el.muted = true;
            }
          }}
          style={{ objectPosition }}
          className="absolute inset-0 h-full w-full object-cover"
          poster={asset(poster)}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label={label}
        >
          <source src={asset(src)} type="video/mp4" />
        </video>
      )}
    </div>
  );
};
