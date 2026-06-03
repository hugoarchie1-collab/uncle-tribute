import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

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
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const onMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    // Clamp the pull so the label only LEANS toward the cursor and snaps
    // back — a premium lift, never a 1:1 drag that reads as a gimmick.
    const MAX = 14;
    const clamp = (v: number) => Math.max(-MAX, Math.min(MAX, v));
    setPos({ x: clamp(x * strength), y: clamp(y * strength) });
  };

  return (
    <Link
      to={to}
      ref={ref as unknown as React.Ref<HTMLAnchorElement>}
      aria-label={ariaLabel}
      className={className}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
    >
      <motion.span
        className="inline-flex items-center gap-2"
        animate={{ x: pos.x, y: pos.y }}
        transition={{ type: "spring", stiffness: 150, damping: 20, mass: 0.45 }}
      >
        {children}
      </motion.span>
    </Link>
  );
};
