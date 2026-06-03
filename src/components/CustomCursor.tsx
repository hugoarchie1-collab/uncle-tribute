import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * A restrained custom cursor — the site's one "cursor language".
 *
 * A small cream ink dot lerps after the pointer and blooms into a hollow ring
 * over anything interactive (links, buttons, art). It ties the magnetic links
 * and parallax art into a single premium cue — deliberately NOT a gimmick: no
 * trails, ripples, or vibration.
 *
 * Hard guards (renders null → the native cursor is left completely untouched):
 *   • coarse pointers / touch — `matchMedia('(pointer: fine)')`
 *   • reduced-motion users
 *
 * The body only gets `cursor: none` while this component is mounted AND active
 * (via the `.has-custom-cursor` class it toggles), and form fields keep their
 * native caret — so a JS failure can never strand the user without a cursor.
 */
export const CustomCursor = () => {
  const reduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  // Only enable on fine (mouse/trackpad) pointers and when motion is allowed.
  useEffect(() => {
    if (reduceMotion || typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: fine)");
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [reduceMotion]);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.body.classList.add("has-custom-cursor");

    const INTERACTIVE =
      "a, button, [role='button'], label, summary, [data-cursor='ring'], .group";
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const dPos = { ...target };
    const rPos = { ...target };
    let frame = 0;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      const over = !!(e.target as Element | null)?.closest?.(INTERACTIVE);
      ring.classList.toggle("cc--active", over);
      dot.classList.toggle("cc--dim", over);
    };
    const show = () => {
      dot.classList.remove("cc--gone");
      ring.classList.remove("cc--gone");
    };
    const hide = () => {
      dot.classList.add("cc--gone");
      ring.classList.add("cc--gone");
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerenter", show);
    document.addEventListener("pointerleave", hide);

    // Dot locks tightly to the pointer (precise, connected — a trailing dot is
    // exactly what reads as "laggy"); only the ring floats softly behind it.
    const tick = () => {
      dPos.x += (target.x - dPos.x) * 0.9;
      dPos.y += (target.y - dPos.y) * 0.9;
      rPos.x += (target.x - rPos.x) * 0.2;
      rPos.y += (target.y - rPos.y) * 0.2;
      dot.style.transform = `translate(${dPos.x}px, ${dPos.y}px) translate(-50%, -50%)`;
      ring.style.transform = `translate(${rPos.x}px, ${rPos.y}px) translate(-50%, -50%)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerenter", show);
      document.removeEventListener("pointerleave", hide);
      document.body.classList.remove("has-custom-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div ref={ringRef} aria-hidden="true" className="cc-ring" />
      <div ref={dotRef} aria-hidden="true" className="cc-dot" />
    </>
  );
};
