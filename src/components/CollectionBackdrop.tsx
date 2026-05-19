import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { Collection } from "../data/paintings";

interface BackdropProps {
  collectionId: Collection["id"];
  photoUrl?: string;
}

export const CollectionBackdrop = ({ photoUrl }: BackdropProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], reduceMotion ? ["0%", "0%"] : ["6%", "-6%"]);

  if (!photoUrl) return null;
  return (
    <motion.div
      ref={ref}
      style={{ y, backgroundImage: `url("${photoUrl}")` }}
      className="collection-backdrop collection-backdrop--photo"
      aria-hidden="true"
    />
  );
};
