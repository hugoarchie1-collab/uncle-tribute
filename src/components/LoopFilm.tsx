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
  edges = "y",
  frame = false,
  className,
}: {
  src: string;
  poster: string;
  label: string;
  aspect: string;
  edges?: "y" | "all" | "none";
  frame?: boolean;
  className?: string;
}) => {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
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
    video.load();
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
  }, [near]);

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
              "radial-gradient(120% 120% at 50% 50%, #000 62%, transparent 100%)",
            maskImage:
              "radial-gradient(120% 120% at 50% 50%, #000 62%, transparent 100%)",
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
