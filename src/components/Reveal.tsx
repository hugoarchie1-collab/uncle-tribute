import { motion, useReducedMotion } from "framer-motion";
import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "article" | "figure" | "header" | "ul";
  offset?: number;
  once?: boolean;
  /** Optional DOM id forwarded to the host element (e.g. anchor targets). */
  id?: string;
}

/**
 * Fade-up-on-scroll wrapper.
 *
 * IMPLEMENTATION NOTE (the "image vanish" fix): this used framer-motion's
 * `whileInView`, which on iOS Safari could leave an element stuck at opacity 0
 * — figures (the Craft / Studio / portrait images) rendered as tall BLACK GAPS
 * that read as missing images. The cause was framer's intersection wrapper
 * mis-firing during momentum scroll / scroll-restoration. This rewrite drives
 * the reveal with a RAW IntersectionObserver plus an immediate in-view check on
 * mount (covers bfcache / scroll-restore where the first IO callback is
 * unreliable). Result: content ALWAYS becomes visible — it can never get stuck
 * hidden — while the gentle fade-up on scroll is preserved. Reduced-motion and
 * "no IntersectionObserver" both short-circuit to fully visible.
 */
export const Reveal = ({
  children,
  delay = 0,
  className,
  as = "div",
  offset = 32,
  once = true,
  id,
}: RevealProps) => {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- the reveal is precisely
     "set visible once the element enters the viewport"; synchronous reveal on
     mount for already-visible elements is intentional and the documented fix
     for the iOS opacity-0 vanish. */
  useEffect(() => {
    if (reduceMotion) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    // Immediate check — if the element is already in (or above) the viewport on
    // mount, reveal at once. Handles scroll-restoration / bfcache, where IO's
    // first callback can be missed on iOS, which was the vanish bug.
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    if (rect.top < vh && rect.bottom > 0) {
      setShown(true);
      if (once) return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            if (once) io.disconnect();
          } else if (!once) {
            setShown(false);
          }
        }
      },
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduceMotion, once]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const style: CSSProperties | undefined = reduceMotion
    ? undefined
    : {
        opacity: shown ? 1 : 0,
        // Settle the rise to rest (translateY(0)) from just below; the opacity
        // leads slightly faster than the travel so the element reads as
        // "arriving" rather than sliding. Transform + opacity only (GPU).
        transform: shown ? "translateY(0)" : `translateY(${offset}px)`,
        // A longer, more elegant deceleration curve (a refined ease-out-quint
        // ramp). The transform lingers ~120ms past the fade so motion lands
        // softly; both are GPU-composited, so this stays scroll-cheap.
        transition: `opacity 820ms cubic-bezier(0.16,0.84,0.32,1) ${delay}s, transform 940ms cubic-bezier(0.16,0.84,0.32,1) ${delay}s`,
        willChange: shown ? "auto" : "opacity, transform",
      };

  // ref on a DOM host element via createElement is valid; the new react-hooks
  // "refs" rule flags the generic createElement call defensively.
  // eslint-disable-next-line react-hooks/refs
  return createElement(as, { ref, className, style, id }, children);
};

export const RevealStagger = ({
  children,
  className,
  delay = 0.1,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "ul";
}) => {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return createElement(as, { className }, children);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MotionTag = (motion as any)[as];
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: delay, delayChildren: 0.1 } },
      }}
    >
      {children}
    </MotionTag>
  );
};
