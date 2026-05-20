import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
} from "framer-motion";
import { asset } from "../lib/asset";

/**
 * Scroll-driven reveal of Stephen's mandala. The image is unaltered —
 * we animate a radial mask that opens from the centre outward, so the
 * mandala "draws itself" as the user scrolls past the section. A
 * gentle rotation + scale accompanies the unmasking.
 */
export const GenerativeMandala = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.2"],
  });

  // Radial mask: at progress 0 only a pinpoint is visible, at 1 the full
  // image is revealed. The "soft" stop sits a few % beyond the hard stop
  // so the leading edge feathers rather than cutting hard.
  const hard = useTransform(scrollYProgress, [0, 1], [0, 78]);
  const soft = useTransform(scrollYProgress, [0, 1], [2, 82]);
  const maskImage = useMotionTemplate`radial-gradient(circle at 50% 50%, black ${hard}%, transparent ${soft}%)`;

  const rotate = useTransform(scrollYProgress, [0, 1], [-10, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.15, 1], [0.4, 1, 1]);

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden py-14 md:py-24"
      aria-label="Mandala"
    >
      <motion.div
        style={
          reduceMotion
            ? { opacity: 1 }
            : { rotate, scale, opacity }
        }
        className="mx-auto w-full max-w-[640px] aspect-square"
      >
        <motion.img
          src={asset("/img/art/scroll-mandala.jpg")}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="w-full h-full object-contain"
          style={
            reduceMotion
              ? undefined
              : {
                  maskImage,
                  WebkitMaskImage: maskImage,
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                  maskSize: "100% 100%",
                  WebkitMaskSize: "100% 100%",
                }
          }
        />
      </motion.div>
    </section>
  );
};
