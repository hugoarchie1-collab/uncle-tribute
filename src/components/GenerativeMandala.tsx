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
 * Full-bleed scroll-driven reveal of Stephen's mandala.
 *
 * The section is 260vh tall with a sticky inner that pins to the viewport
 * while the user scrolls past. Across the scroll progress:
 *
 *  • 0.00 → 0.50  the mandala draws itself in:
 *      - a conic mask sweeps 0 → 360° (clockwise "brush" reveal)
 *      - the mandala rotates from -200° to 0° (settling upright)
 *      - it scales from 0.34 → 1.00 (rushing forward into view)
 *  • 0.50         everything is perfect: fully revealed, upright, full size
 *  • 0.50 → 1.00  gentle continuation — slight further rotation + zoom,
 *                 then fade out as the next section approaches.
 *
 * The cosmic background extends to every pixel of the viewport — no black
 * gaps — and a soft radial halo grows beneath the mandala for drama.
 */
export const GenerativeMandala = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Conic sweep — clockwise drawing brush
  const sweepDeg = useTransform(scrollYProgress, [0, 0.5, 1], [0, 360, 360]);
  const maskImage = useMotionTemplate`conic-gradient(from -90deg at 50% 50%, #000 ${sweepDeg}deg, transparent ${sweepDeg}deg)`;

  // Mandala rotation + scale
  const rotate = useTransform(scrollYProgress, [0, 0.5, 1], [-200, 0, 22]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.34, 1.0, 1.08]);
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.05, 0.92, 1],
    [0, 1, 1, 0.85],
  );

  // Background parallax — stars drift counter to mandala for depth
  const bgY = useTransform(scrollYProgress, [0, 1], ["-18%", "18%"]);
  const bgScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.06, 1.0, 1.04]);

  // Halo glow grows as the mandala draws
  const haloOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.85, 0.65]);
  const haloScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.6, 1.05, 1.15]);

  // Scroll-hint fade
  const hintOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative w-full bg-[#02040a]"
      style={{ height: "260vh" }}
      aria-label="Sacred geometry mandala — scroll to draw"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        {/* Cosmic background — gradient + layered starfield, parallaxed */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 will-change-transform"
          style={reduceMotion ? {} : { y: bgY, scale: bgScale }}
        >
          {/* Deep-space gradient base */}
          <div
            className="absolute inset-[-12%]"
            style={{
              background:
                "radial-gradient(110% 80% at 50% 50%, #0a0f22 0%, #050811 50%, #02040a 100%)",
            }}
          />
          {/* Starfield — small dense */}
          <div
            className="absolute inset-[-12%] opacity-90"
            style={{
              backgroundImage: [
                "radial-gradient(1.4px 1.4px at 23px 41px, rgba(255,250,235,0.95), transparent 60%)",
                "radial-gradient(1px 1px at 87px 19px, rgba(220,210,255,0.85), transparent 60%)",
                "radial-gradient(1.2px 1.2px at 153px 117px, rgba(255,245,220,0.7), transparent 60%)",
                "radial-gradient(0.8px 0.8px at 211px 53px, rgba(255,255,255,0.7), transparent 60%)",
                "radial-gradient(1px 1px at 49px 187px, rgba(255,240,210,0.6), transparent 60%)",
                "radial-gradient(0.7px 0.7px at 121px 233px, rgba(255,255,255,0.5), transparent 60%)",
                "radial-gradient(1.1px 1.1px at 263px 161px, rgba(200,220,255,0.7), transparent 60%)",
                "radial-gradient(0.9px 0.9px at 31px 91px, rgba(255,250,240,0.55), transparent 60%)",
                "radial-gradient(0.6px 0.6px at 191px 271px, rgba(255,255,255,0.45), transparent 60%)",
              ].join(", "),
              backgroundSize: "320px 320px",
              backgroundRepeat: "repeat",
            }}
          />
          {/* Starfield — sparser, larger */}
          <div
            className="absolute inset-[-12%] opacity-80"
            style={{
              backgroundImage: [
                "radial-gradient(2px 2px at 137px 67px, rgba(255,240,210,0.95), transparent 55%)",
                "radial-gradient(1.6px 1.6px at 433px 247px, rgba(220,235,255,0.9), transparent 55%)",
                "radial-gradient(1.8px 1.8px at 277px 391px, rgba(255,255,255,0.85), transparent 55%)",
              ].join(", "),
              backgroundSize: "560px 480px",
              backgroundRepeat: "repeat",
            }}
          />
        </motion.div>

        {/* Halo behind the mandala — radial gold glow */}
        <motion.div
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={
            reduceMotion
              ? { opacity: 0.6, transform: "scale(1)" }
              : { opacity: haloOpacity, scale: haloScale }
          }
        >
          <div
            className="rounded-full"
            style={{
              width: "min(95vh, 95vw)",
              height: "min(95vh, 95vw)",
              background:
                "radial-gradient(circle, rgba(220,168,76,0.32) 0%, rgba(201,120,68,0.18) 35%, rgba(2,4,10,0) 70%)",
              filter: "blur(40px)",
            }}
          />
        </motion.div>

        {/* Mandala — conic-masked, rotating, scaling */}
        <motion.div
          className="relative will-change-transform"
          style={
            reduceMotion
              ? {
                  width: "min(92vh, 92vw)",
                  height: "min(92vh, 92vw)",
                  opacity: 1,
                }
              : {
                  width: "min(92vh, 92vw)",
                  height: "min(92vh, 92vw)",
                  opacity,
                  maskImage,
                  WebkitMaskImage: maskImage,
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                  maskSize: "100% 100%",
                  WebkitMaskSize: "100% 100%",
                }
          }
        >
          <motion.img
            src={asset("/img/art/scroll-mandala.jpg")}
            alt="Mandala by Stephen Meakin"
            className="w-full h-full object-contain block select-none"
            draggable={false}
            style={
              reduceMotion ? undefined : { rotate, scale }
            }
          />
        </motion.div>

        {/* Scroll hint — only at the very start */}
        <motion.div
          aria-hidden="true"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          style={reduceMotion ? { opacity: 0 } : { opacity: hintOpacity }}
        >
          <p
            className="font-sans text-[10px] font-bold tracking-[0.42em] uppercase m-0"
            style={{ color: "rgba(245, 236, 214, 0.75)" }}
          >
            Scroll to draw
          </p>
        </motion.div>
      </div>
    </section>
  );
};
