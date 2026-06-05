import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * A restrained custom cursor — the site's one "cursor language".
 *
 * The Mandala Company rose-mark (the white/cream flower emblem) lerps tightly
 * after the pointer and blooms a touch larger over anything interactive
 * (links, buttons, art). It ties the magnetic links and parallax art into a
 * single brand cue — deliberately NOT a gimmick: no trails, ripples, or spin.
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
  const flowerRef = useRef<HTMLDivElement>(null);

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
    const flower = flowerRef.current;
    if (!flower) return;

    document.body.classList.add("has-custom-cursor");

    const INTERACTIVE =
      "a, button, [role='button'], label, summary, [data-cursor='ring'], .group";
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { ...target };
    let frame = 0;
    let running = false;

    // The flower locks tightly to the pointer (precise, connected — a trailing
    // cursor reads as "laggy"). SELF-SUSPENDING: the instant it reaches the
    // pointer it STOPS the rAF loop instead of re-writing an identical transform
    // 60–120×/sec forever — that perpetual always-on main-thread style-write was
    // a core contributor to the whole site feeling laggy. It restarts on move.
    const tick = () => {
      pos.x += (target.x - pos.x) * 0.9;
      pos.y += (target.y - pos.y) * 0.9;
      const atRest =
        Math.abs(target.x - pos.x) < 0.1 && Math.abs(target.y - pos.y) < 0.1;
      if (atRest) {
        pos.x = target.x;
        pos.y = target.y;
      }
      flower.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
      if (atRest) {
        running = false;
        return; // idle to ZERO cost until the next pointer move
      }
      frame = requestAnimationFrame(tick);
    };
    const startLoop = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      const over = !!(e.target as Element | null)?.closest?.(INTERACTIVE);
      flower.classList.toggle("cc--active", over);
      startLoop();
    };
    const show = () => flower.classList.remove("cc--gone");
    const hide = () => flower.classList.add("cc--gone");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerenter", show);
    document.addEventListener("pointerleave", hide);

    // Paint the initial (centered) position once — no perpetual loop on mount.
    flower.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerenter", show);
      document.removeEventListener("pointerleave", hide);
      document.body.classList.remove("has-custom-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;
  return <div ref={flowerRef} aria-hidden="true" className="cc-flower" />;
};
