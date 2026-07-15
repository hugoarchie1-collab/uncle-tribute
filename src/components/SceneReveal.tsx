import { useEffect, useRef, useSyncExternalStore } from "react";
import { useReducedMotion } from "framer-motion";

/** Live "(pointer: fine)" — true only for mouse/trackpad (no touch hover). */
const subscribeFinePointer = (cb: () => void) => {
  const mq = window.matchMedia("(pointer: fine)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const usePointerFine = () =>
  useSyncExternalStore(
    subscribeFinePointer,
    () => window.matchMedia("(pointer: fine)").matches,
    () => false,
  );

/**
 * SceneReveal — the shared "background gets clearer where you point" spotlight
 * for photo backdrops (Hugo, 2026-07-14: "apply that reveal to every page").
 *
 * Drop it in as the LAST child of a `fixed inset-0` backdrop wrapper (after the
 * blurred base + scrim). On a fine pointer with motion allowed it reveals the
 * SAME `photoUrl` at a livelier grade (brighter / more saturated / higher
 * contrast, no scrim) inside a cursor-following spotlight — so the scene POPS
 * where the pointer is. Same image at a different grade → pixel-perfect align,
 * no second asset. The spotlight WINDOW carries a STATIC circular mask and moves
 * by transform only (compositor thread, zero per-move repaint); inside, a
 * viewport-sized clarified copy counter-translates to stay pinned. Renders
 * nothing on touch / reduced-motion.
 */
export const SceneReveal = ({
  photoUrl,
  filter = "brightness(1.68) saturate(1.28) contrast(1.1)",
}: {
  photoUrl: string;
  filter?: string;
}) => {
  const reduceMotion = useReducedMotion();
  const pointerFine = usePointerFine();
  const reveal = !reduceMotion && pointerFine;

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!reveal) return;
    const el = rootRef.current;
    if (!el) return;
    let x = window.innerWidth / 2;
    let y = window.innerHeight * 0.4;
    let raf = 0;
    const apply = () => {
      raf = 0;
      el.style.setProperty("--sr-mx", `${x}px`);
      el.style.setProperty("--sr-my", `${y}px`);
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = window.requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [reveal]);

  if (!reveal) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{
        ["--sr-r" as string]: "clamp(180px, 22vw, 320px)",
        ["--sr-d" as string]: "calc(2 * var(--sr-r))",
      }}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          width: "var(--sr-d)",
          height: "var(--sr-d)",
          transform:
            "translate3d(calc(var(--sr-mx, 50vw) - var(--sr-r)), calc(var(--sr-my, 40vh) - var(--sr-r)), 0)",
          WebkitMaskImage:
            "radial-gradient(circle at center, #000 0%, #000 34%, transparent 72%)",
          maskImage:
            "radial-gradient(circle at center, #000 0%, #000 34%, transparent 72%)",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          willChange: "transform",
        }}
      >
        <div
          className="absolute left-0 top-0 bg-cover bg-center"
          style={{
            width: "100vw",
            height: "100vh",
            backgroundImage: `url("${photoUrl}")`,
            filter,
            transform:
              "translate3d(calc(var(--sr-r) - var(--sr-mx, 50vw)), calc(var(--sr-r) - var(--sr-my, 40vh)), 0)",
            willChange: "transform",
          }}
        />
      </div>
    </div>
  );
};
