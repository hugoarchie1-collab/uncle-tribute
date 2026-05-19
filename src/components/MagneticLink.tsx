import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

interface MagneticLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  /** Magnetic pull strength 0-1. Default 0.3 */
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
  strength = 0.3,
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
    setPos({ x: x * strength, y: y * strength });
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
        transition={{ type: "spring", stiffness: 200, damping: 18, mass: 0.4 }}
      >
        {children}
      </motion.span>
    </Link>
  );
};
