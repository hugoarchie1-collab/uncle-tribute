import { useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useSpring } from "framer-motion";

interface MagneticLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  /** Magnetic pull strength 0-1. Default 0.22 */
  strength?: number;
  ariaLabel?: string;
}

/**
 * Link that gently follows the cursor when nearby — gives the
 * "futurist immersive" feel the design calls for.
 *
 * PERF (audit 2026-07-28): the pull is driven by framer-motion SPRING VALUES,
 * not React state — so a pointer moving over the label mutates motion values
 * imperatively and produces ZERO React re-renders (mirroring CustomCursor's
 * documented "closure, no re-render" rule). MagneticLink sits on the home hero's
 * primary CTAs — the hottest hover path — so a re-render per pointer frame was a
 * real cost. useSpring (not a bare motion value) preserves the exact lean-and-
 * settle; the visual result is identical to the previous `animate` spring.
 */
export const MagneticLink = ({
  to,
  children,
  className,
  strength = 0.22,
  ariaLabel,
}: MagneticLinkProps) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduceMotion = useReducedMotion();
  const spring = { stiffness: 150, damping: 20, mass: 0.45 };
  const x = useSpring(0, spring);
  const y = useSpring(0, spring);

  const onMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    // Clamp the pull so the label only LEANS toward the cursor and snaps
    // back — a premium lift, never a 1:1 drag that reads as a gimmick.
    const MAX = 14;
    const clamp = (v: number) => Math.max(-MAX, Math.min(MAX, v));
    x.set(clamp(dx * strength));
    y.set(clamp(dy * strength));
  };

  return (
    <Link
      to={to}
      ref={ref as unknown as React.Ref<HTMLAnchorElement>}
      aria-label={ariaLabel}
      className={className}
      onMouseMove={onMouseMove}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <motion.span className="inline-flex items-center gap-2" style={{ x, y }}>
        {children}
      </motion.span>
    </Link>
  );
};
