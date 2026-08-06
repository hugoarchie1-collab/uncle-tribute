import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * CosmicBackdrop — the home page's living background: deep near-black space with
 * a slow, subtle animated starfield (drift + twinkle, parallax depth) and a
 * couple of very dark depth-glows for dimension. Replaces the multi-colour
 * peacock wash (Hugo: the busy colour background "makes me wanna vomit"; wanted
 * a dynamic, iPhone/Awwwards-level background). Fixed, full-viewport, z-0 under
 * the page content. Reduced-motion renders a static starfield (no animation).
 *
 * Pure canvas — no images, no external libs. DPR-aware, pauses when the tab is
 * hidden, and caps the star count so it stays cheap on mobile.
 */
export const CosmicBackdrop = () => {
  const reduceMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    type Star = { x: number; y: number; r: number; a: number; tw: number; sp: number; drift: number };
    let stars: Star[] = [];

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // ~1 star per 9000px² of viewport, capped — denser feels premium, not noisy.
      const count = Math.min(260, Math.round((w * h) / 9000));
      stars = Array.from({ length: count }, () => {
        const depth = Math.random(); // 0 far … 1 near
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: rand(0.3, 1.5) * (0.6 + depth),
          a: rand(0.15, 0.9) * (0.4 + depth * 0.6),
          tw: Math.random() * Math.PI * 2, // twinkle phase
          sp: rand(0.6, 1.8), // twinkle speed
          drift: (0.02 + depth * 0.06), // px/frame downward drift (parallax by depth)
        };
      });
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const twinkle = reduceMotion ? 1 : 0.65 + 0.35 * Math.sin(t * 0.001 * s.sp + s.tw);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(237,230,214,${(s.a * twinkle).toFixed(3)})`;
        ctx.fill();
        if (!reduceMotion) {
          s.y += s.drift;
          if (s.y > h + 2) {
            s.y = -2;
            s.x = Math.random() * w;
          }
        }
      }
    };

    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    build();
    if (reduceMotion) {
      draw(0);
    } else {
      raf = requestAnimationFrame(loop);
    }

    const onResize = () => build();
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!reduceMotion && !raf) {
        raf = requestAnimationFrame(loop);
      }
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reduceMotion]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Deep space base — near-black with faint, cool depth glows (no colour
          wash). Sits under the stars. */}
      <div
        className="absolute inset-0"
        style={{
          // Genuine near-black space — NOT a blue wash (Hugo hates the colour
          // background). Only a whisper of depth, so it reads as deep cosmos.
          background:
            "radial-gradient(130% 100% at 50% 0%, #0b0c12 0%, #070709 48%, #040406 100%)," +
            "radial-gradient(70% 55% at 84% 92%, rgba(28,24,44,0.22) 0%, rgba(4,4,6,0) 60%)",
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* A whisper of warmth low-right so the field isn't clinically cold. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 50% at 20% 96%, rgba(201,120,68,0.06) 0%, rgba(5,6,10,0) 60%)",
        }}
      />
    </div>
  );
};
