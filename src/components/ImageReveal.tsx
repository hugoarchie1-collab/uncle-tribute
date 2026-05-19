import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { asset } from "../lib/asset";

interface ImageRevealProps {
  src: string;
  alt: string;
  /** Tailwind class for the wrapper div (sizing, max-w, etc.) */
  className?: string;
  /** Tailwind aspect class (e.g. "aspect-[4/3]"). Falls back to natural if `fill`. */
  aspect?: string;
  /** Fill the parent height with object-cover instead of an aspect. */
  fill?: boolean;
  /** Eager load (above-the-fold images) */
  eager?: boolean;
  /** Parallax intensity 0-1. Default 0.18 — gentle floaty drift. 0 = static. */
  parallax?: number;
  /** Soft-mask edges: "all" fades 4 sides, "y" fades top+bottom, "none" leaves sharp. */
  edges?: "all" | "y" | "none";
  /** Box shadow class override */
  shadow?: string;
}

/**
 * Scroll-tied parallax image with optional soft-edge mask. Used for every
 * non-product image on the site to give the floaty / spiritual feel.
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
}: ImageRevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const px = reduceMotion ? 0 : Math.round(parallax * 80);
  const y = useTransform(scrollYProgress, [0, 1], [px, -px]);

  const edgeClass = edges === "all" ? "soft-edge" : edges === "y" ? "soft-edge-y" : "";

  return (
    <div
      ref={ref}
      className={[
        "overflow-hidden",
        fill ? "h-full" : aspect ?? "",
        shadow,
        edgeClass,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <motion.img
        src={asset(src)}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        style={{ y }}
        className="w-full h-full object-cover scale-[1.08]"
      />
    </div>
  );
};
