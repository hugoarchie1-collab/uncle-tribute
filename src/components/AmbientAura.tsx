import { useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Site-wide ambient glow — a soft, slow-pulsing radial bloom sitting
 * fixed behind every page. The palette shifts per route so each part
 * of the site has its own colour temperature, but the motion stays
 * gentle so it never competes with content.
 */
type Palette = { primary: string; secondary: string };

const PALETTES: Record<string, Palette> = {
  home: {
    primary: "rgba(220, 168, 76, 0.55)", // warm gold
    secondary: "rgba(201, 120, 68, 0.42)", // burnt copper
  },
  collections: {
    primary: "rgba(217, 163, 181, 0.48)", // rose
    secondary: "rgba(169, 185, 214, 0.38)", // cool blue
  },
  painting: {
    primary: "rgba(201, 120, 68, 0.45)", // copper
    secondary: "rgba(125, 109, 163, 0.38)", // muted violet
  },
  about: {
    primary: "rgba(201, 120, 68, 0.50)", // copper
    secondary: "rgba(74, 58, 120, 0.40)", // deep violet
  },
  default: {
    primary: "rgba(220, 168, 76, 0.42)",
    secondary: "rgba(201, 120, 68, 0.32)",
  },
};

const paletteForPath = (pathname: string): Palette => {
  if (pathname === "/") return PALETTES.home;
  if (pathname === "/collections") return PALETTES.collections;
  if (pathname.startsWith("/collections/")) return PALETTES.painting;
  if (pathname === "/about") return PALETTES.about;
  return PALETTES.default;
};

export const AmbientAura = () => {
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const palette = paletteForPath(pathname);

  // Static fallback for users that prefer reduced motion
  if (reduceMotion) {
    return (
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: "70vw",
            height: "70vw",
            maxWidth: "1100px",
            maxHeight: "1100px",
            transform: "translate(-50%, -50%)",
            filter: "blur(120px)",
            background: `radial-gradient(circle, ${palette.primary} 0%, ${palette.secondary} 50%, transparent 75%)`,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Primary bloom — centre, big and warm */}
      <motion.div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: "90vw",
          height: "90vh",
          maxWidth: "1400px",
          maxHeight: "1400px",
          transform: "translate(-50%, -50%)",
          filter: "blur(120px)",
          background: `radial-gradient(circle, ${palette.primary} 0%, ${palette.secondary} 45%, transparent 75%)`,
        }}
        animate={{
          scale: [1, 1.12, 1.04, 1],
          opacity: [0.95, 1, 0.92, 0.95],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        key={`${palette.primary}-${palette.secondary}-primary`}
      />

      {/* Secondary, drifted off-centre for warmth */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: "28%",
          top: "70%",
          width: "65vw",
          height: "65vw",
          maxWidth: "1000px",
          maxHeight: "1000px",
          transform: "translate(-50%, -50%)",
          filter: "blur(140px)",
          background: `radial-gradient(circle, ${palette.secondary} 0%, transparent 70%)`,
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8],
          x: [0, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
        key={`${palette.primary}-${palette.secondary}-secondary`}
      />

      {/* Tertiary, opposite corner */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: "72%",
          top: "28%",
          width: "55vw",
          height: "55vw",
          maxWidth: "850px",
          maxHeight: "850px",
          transform: "translate(-50%, -50%)",
          filter: "blur(150px)",
          background: `radial-gradient(circle, ${palette.primary} 0%, transparent 68%)`,
        }}
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.6, 0.9, 0.6],
          y: [0, -22, 0],
        }}
        transition={{
          duration: 24,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 8,
        }}
        key={`${palette.primary}-${palette.secondary}-tertiary`}
      />
    </div>
  );
};
