import { useRef, useState, useEffect, type CSSProperties } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { asset, webp, webpSrcSet } from "../lib/asset";

interface ImageRevealProps {
  src: string;
  alt: string;
  className?: string;
  /** Tailwind aspect class (e.g. "aspect-[4/3]"). Falls back to natural if `fill`. */
  aspect?: string;
  /** Fill the parent height with object-cover instead of an aspect. */
  fill?: boolean;
  /** Eager load (above-the-fold images) */
  eager?: boolean;
  /** Parallax intensity 0-1. Default 0.18 — gentle floaty drift. */
  parallax?: number;
  /** Soft-mask edges: "all" fades 4 sides, "y" fades top+bottom, "none" leaves sharp. */
  edges?: "all" | "y" | "none";
  /** Box shadow override. Default is an EVEN, vertically-balanced lift (a small
   *  ambient ring + a soft drop) — deliberately NOT a single heavy downward
   *  offset, which darkens only the bottom edge and reads as "one side melted,
   *  the rest ignored" (Hugo). Pass a custom value to override. */
  shadow?: string;
  /** CSS object-position for the image. Default "center". Use "center top" for portraits. */
  objectPosition?: string;
  /** Mouse-track tilt on hover (futurist immersive feel) */
  tilt?: boolean;
  /** CSS `sizes` describing the image's rendered width across breakpoints.
   *  Only takes effect when responsive WebP width variants exist for `src`
   *  (see `webpSrcSet`); the browser then picks the smallest sufficient file.
   *  Default "100vw" is conservative — pass an accurate value where the frame
   *  is narrower than the viewport. */
  sizes?: string;
  /** Static zoom applied to the image. Default 1.04 gives the parallax a little
   *  bleed so a drift never reveals a hard edge. Pass `1` for images that MUST
   *  show WHOLE with zero crop (e.g. the home studio photo) — only safe when the
   *  box ratio equals the image's intrinsic ratio and `parallax` is 0. */
  zoom?: number;
}

/**
 * Scroll-tied parallax image with optional soft-edge mask + cursor tilt.
 * The image is rendered at scale 1.04 so the parallax never reveals a hard edge.
 */
export const ImageReveal = ({
  src,
  alt,
  className,
  aspect,
  fill,
  eager,
  parallax = 0.18,
  edges = "none",
  // An EVEN lift, not a bottom-heavy halo: a tight ambient ring fades the same
  // amount on every side (0 offset) and a gentle, low-offset drop adds depth
  // without dumping all the darkness on the bottom edge. The old single
  // 0/24px/60px shadow pooled at the foot (the y-offset points straight down),
  // which read as "only the bottom is treated, the rest ignored" (Hugo).
  shadow = "shadow-[0_0_42px_rgba(0,0,0,0.42),0_10px_40px_rgba(0,0,0,0.40)]",
  objectPosition = "center",
  tilt = false,
  sizes = "100vw",
  zoom = 1.04,
}: ImageRevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const srcSet = webpSrcSet(src);

  // Scroll parallax
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Parallax is a desktop-only flourish. Gate it OFF on touch/coarse pointers
  // (as well as reduced-motion): ~5 ImageReveal instances each run a scroll-
  // linked transform + GPU layer — a major mobile scroll-lag source with no
  // benefit on touch. The static scale-[1.04] keeps the framing.
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const noParallax = reduceMotion || coarse;
  const px = noParallax ? 0 : Math.round(parallax * 60);
  const y = useTransform(scrollYProgress, [0, 1], [px, -px]);

  // GPU-layer gate: `will-change: transform` promotes the image to its own
  // compositor layer, which is only worth its memory cost while the image is
  // actually (about to be) parallaxing. With ~5 ImageReveal instances per page
  // (Welcome/About), promoting all of them at mount keeps 5+ layers alive even
  // for images far off-screen. So we only flag the layer once the element is
  // within ~half a viewport of entry, via a cheap IntersectionObserver. Skipped
  // entirely when there's no parallax (reduced-motion / coarse pointer).
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (noParallax || !ref.current || typeof IntersectionObserver === "undefined") {
      return;
    }
    const el = ref.current;
    const io = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      // 50% viewport of slack on top + bottom: arm the layer just before the
      // image scrolls into view, disarm it once it's well past.
      { rootMargin: "50% 0px 50% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [noParallax]);

  // Mouse tilt
  const [tiltState, setTiltState] = useState({ rx: 0, ry: 0 });
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tilt || reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTiltState({ rx: py * -6, ry: px * 6 });
  };
  const onMouseLeave = () => setTiltState({ rx: 0, ry: 0 });

  const edgeClass = edges === "all" ? "soft-edge" : edges === "y" ? "soft-edge-y" : "";

  // A feathered image dissolves into the page; a rectangular box-shadow draws a
  // HARD offset halo around it — heaviest at the bottom (the y-offset points
  // down), which reads as "only half the image is softened, the other half is
  // the opposite" (Hugo). So a feathered image NEVER carries a shadow, whatever
  // the `shadow` prop says; only a sharp-edged image keeps the lift shadow.
  const resolvedShadow = edges === "none" ? shadow : "shadow-none";

  const wrapperStyle: CSSProperties = tilt
    ? { perspective: 1200, transformStyle: "preserve-3d" }
    : {};

  return (
    <div
      ref={ref}
      style={wrapperStyle}
      className={[
        "overflow-hidden relative",
        fill ? "h-full" : aspect ?? "",
        resolvedShadow,
        edgeClass,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseMove={tilt ? onMouseMove : undefined}
      onMouseLeave={tilt ? onMouseLeave : undefined}
    >
      <picture style={{ display: "contents" }}>
        {srcSet ? (
          <source srcSet={srcSet} sizes={sizes} type="image/webp" />
        ) : (
          <source srcSet={asset(webp(src))} type="image/webp" />
        )}
        <motion.img
          src={asset(src)}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding={eager ? "sync" : "async"}
          fetchPriority={eager ? "high" : "auto"}
          // `will-change: transform` only when the image actually parallaxes
          // AND is near the viewport (`near`, from the IntersectionObserver
          // above) — promotes it to its own GPU layer so the scroll-driven `y`
          // composites instead of repainting against the soft-edge mask, while
          // not holding a layer alive for every off-screen instance. Omitted
          // under reduced motion / coarse pointer to avoid needless layers.
          style={{
            y,
            scale: zoom,
            objectPosition,
            willChange: !noParallax && near ? "transform" : undefined,
          }}
          animate={tilt ? { rotateX: tiltState.rx, rotateY: tiltState.ry } : undefined}
          transition={tilt ? { type: "spring", stiffness: 150, damping: 18 } : undefined}
          className="w-full h-full object-cover"
        />
      </picture>
    </div>
  );
};
