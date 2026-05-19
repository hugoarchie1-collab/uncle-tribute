import { motion, useReducedMotion, type Variants } from "framer-motion";
import { type ReactNode, createElement } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "article" | "figure" | "header";
  offset?: number;
  once?: boolean;
}

export const Reveal = ({
  children,
  delay = 0,
  className,
  as = "div",
  offset = 28,
  once = true,
}: RevealProps) => {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return createElement(as, { className }, children);
  }

  const variants: Variants = {
    hidden: { opacity: 0, y: offset, filter: "blur(6px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.9, delay, ease: [0.22, 0.61, 0.36, 1] },
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MotionTag = (motion as any)[as];

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount: 0.15, margin: "0px 0px -10% 0px" }}
      variants={variants}
    >
      {children}
    </MotionTag>
  );
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
