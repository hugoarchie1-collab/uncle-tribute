import { useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { asset } from "../lib/asset";

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
  /** Box shadow override */
  shadow?: string;
  /** CSS object-position for the image. Default "center". Use "center top" for portraits. */
  objectPosition?: string;
  /** Mouse-track tilt on hover (futurist immersive feel) */
  tilt?: boolean;
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
  shadow = "shadow-[0_24px_60px_rgba(0,0,0,0.55)]",
  objectPosition = "center",
  tilt = false,
}: ImageRevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // Scroll parallax
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const px = reduceMotion ? 0 : Math.round(parallax * 60);
  const y = useTransform(scrollYProgress, [0, 1], [px, -px]);

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
        shadow,
        edgeClass,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseMove={tilt ? onMouseMove : undefined}
      onMouseLeave={tilt ? onMouseLeave : undefined}
    >
      <motion.img
        src={asset(src)}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        style={{ y, objectPosition }}
        animate={tilt ? { rotateX: tiltState.rx, rotateY: tiltState.ry } : undefined}
        transition={tilt ? { type: "spring", stiffness: 150, damping: 18 } : undefined}
        className="w-full h-full object-cover scale-[1.04]"
      />
    </div>
  );
};
