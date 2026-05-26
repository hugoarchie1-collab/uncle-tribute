import { motion, useReducedMotion, type Variants } from "framer-motion";
import { type ReactNode, type CSSProperties } from "react";

interface SplitRevealProps {
  /** The string to reveal character-by-character. */
  text: string;
  /** Optional accent on the trailing character (e.g. a coloured period). */
  trailing?: { char: string; color: string };
  /** Time between each character animating in, in seconds. Default 0.04. */
  stagger?: number;
  /** Delay before the whole sequence starts, in seconds. Default 0. */
  delay?: number;
  /** Forwarded to the outer span. */
  className?: string;
  /** Forwarded to the outer span. */
  style?: CSSProperties;
  /** Render a hard line break in the middle (e.g. "Sacred\nGeometry"). */
  multiline?: boolean;
  /** Reserved — currently unused but kept for future split variants. */
  children?: ReactNode;
}

const charVariants: Variants = {
  hidden: { y: "100%", opacity: 0 },
  show: {
    y: "0%",
    opacity: 1,
    transition: { duration: 0.65, ease: [0.22, 0.61, 0.36, 1] },
  },
};

/**
 * Headline that reveals one character at a time from below as the element
 * scrolls into view. Each character sits in an overflow-hidden line-box
 * and slides up from 100% translateY to 0. Per-character staggered timing
 * gives the cinematic typeset feel used on most Awwwards Site-of-the-Day
 * entries.
 *
 * Honours prefers-reduced-motion (renders the static string).
 */
export const SplitReveal = ({
  text,
  trailing,
  stagger = 0.04,
  delay = 0,
  className,
  style,
  multiline,
}: SplitRevealProps) => {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <span className={className} style={style}>
        {multiline
          ? text.split("\n").map((line, i) => (
              <span key={i} className="block">
                {line}
                {i === text.split("\n").length - 1 && trailing && (
                  <span style={{ color: trailing.color }}>{trailing.char}</span>
                )}
              </span>
            ))
          : (
              <>
                {text}
                {trailing && <span style={{ color: trailing.color }}>{trailing.char}</span>}
              </>
            )}
      </span>
    );
  }

  const lines = multiline ? text.split("\n") : [text];

  return (
    <motion.span
      className={className}
      style={style}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
    >
      {lines.map((line, li) => {
        const isLast = li === lines.length - 1;
        return (
          <span key={li} className="block">
            {line.split("").map((ch, ci) => (
              <span
                key={`${li}-${ci}`}
                className="inline-block overflow-hidden align-baseline"
                style={{ lineHeight: "inherit" }}
              >
                <motion.span
                  className="inline-block"
                  variants={charVariants}
                  style={{ willChange: "transform, opacity" }}
                >
                  {ch === " " ? " " : ch}
                </motion.span>
              </span>
            ))}
            {/* Trailing character (e.g. coloured period) lives inside
                the last line so it doesn't wrap onto its own line. */}
            {isLast && trailing && (
              <span
                className="inline-block overflow-hidden align-baseline"
                style={{ lineHeight: "inherit" }}
              >
                <motion.span
                  className="inline-block"
                  variants={charVariants}
                  style={{ color: trailing.color, willChange: "transform, opacity" }}
                >
                  {trailing.char}
                </motion.span>
              </span>
            )}
          </span>
        );
      })}
    </motion.span>
  );
};
