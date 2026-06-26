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
 * CONTEXTUAL LABEL — any element may carry `data-cursor-label="…"`; while the
 * pointer is over it (resolved via the same closest() hit-testing as the
 * bloom) a small uppercase chip fades/scales in BESIDE the flower whispering
 * what the interaction does ("Closer look", "Drag · scroll to zoom"). An
 * optional `data-cursor-label-drag="…"` on the same element swaps the caption
 * while a pointer is held down inside it (CloserLook's pan reads "Drag").
 * The flower itself never changes shape — one cursor language, plus a caption
 * only where the interaction is non-obvious. Interactive chrome (buttons /
 * links) INSIDE a labelled region suppresses the chip so "Close" never reads
 * "Drag". The chip is a SIBLING of the flower (not a child) because the
 * flower's brightness/invert filter would bleach any child content.
 *
 * Hard guards (renders null → the native cursor is left completely untouched):
 *   • coarse pointers / touch — `matchMedia('(pointer: fine)')`
 *   • reduced-motion users (so the chip needs no reduced-motion path — the
 *     whole cursor, chip included, simply never mounts)
 *
 * The body only gets `cursor: none` while this component is mounted AND active
 * (via the `.has-custom-cursor` class it toggles), and form fields keep their
 * native caret — so a JS failure can never strand the user without a cursor.
 */

/** Offset of the chip's left edge from the pointer point — clears the bloomed
 *  flower (46px wide, centred → 23px half-width) with a small gap. */
const CHIP_OFFSET_X = 30;

export const CustomCursor = () => {
  const reduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const flowerRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const chipTextRef = useRef<HTMLSpanElement>(null);

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
    const chip = chipRef.current;
    const chipText = chipTextRef.current;
    if (!flower || !chip || !chipText) return;

    document.body.classList.add("has-custom-cursor");

    const INTERACTIVE =
      "a, button, [role='button'], label, summary, [data-cursor='ring'], .group";
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { ...target };
    let frame = 0;
    let running = false;

    // ── Contextual label chip state (closure — zero React re-renders) ────
    let pointerDown = false;
    let labelHost: HTMLElement | null = null;
    let chipShown = false;
    let chipLabel = "";

    /** Show/hide the caption — opacity + scale only (transform-composited);
     *  the 200ms ease lives on the inner span's inline transition. */
    const applyChip = (label: string | null) => {
      if (label) {
        if (chipLabel !== label) {
          chipText.textContent = label;
          chipLabel = label;
        }
        if (!chipShown) {
          chipShown = true;
          chipText.style.opacity = "1";
          chipText.style.transform = `translate(${CHIP_OFFSET_X}px, -50%) scale(1)`;
        }
      } else if (chipShown) {
        chipShown = false;
        chipText.style.opacity = "0";
        chipText.style.transform = `translate(${CHIP_OFFSET_X}px, -50%) scale(0.92)`;
      }
    };

    /** Resolve the caption for whatever the pointer is over. Chrome (a real
     *  button/link) nested INSIDE a labelled region wins — no caption there,
     *  so the viewer's Close / zoom buttons never read "Drag". */
    const updateChip = (el: Element | null) => {
      const host = (el?.closest?.("[data-cursor-label]") ??
        null) as HTMLElement | null;
      labelHost = host;
      if (!host) {
        applyChip(null);
        return;
      }
      const chrome = el?.closest?.("a, button, [role='button']") ?? null;
      if (chrome && chrome !== host && host.contains(chrome)) {
        applyChip(null);
        return;
      }
      const label =
        (pointerDown && host.dataset.cursorLabelDrag) ||
        host.dataset.cursorLabel ||
        null;
      applyChip(label);
    };

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
      // The chip anchor rides the SAME lerped point (its own offset/scale live
      // on the inner span), so flower + caption move as one object.
      chip.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
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
      const el = e.target as Element | null;
      const over = !!el?.closest?.(INTERACTIVE);
      flower.classList.toggle("cc--active", over);
      updateChip(el);
      startLoop();
    };
    // While a pointer is held inside a labelled region that declares a drag
    // caption (CloserLook's stage), the chip swaps to it ("Drag") and swaps
    // back on release. Pointer capture (CloserLook captures to its overlay)
    // retargets these events to the labelled overlay itself, so the closest()
    // resolution stays correct mid-drag.
    const onDown = (e: PointerEvent) => {
      pointerDown = true;
      updateChip((e.target as Element | null) ?? labelHost);
    };
    const onUp = (e: PointerEvent) => {
      pointerDown = false;
      updateChip((e.target as Element | null) ?? labelHost);
    };
    const show = () => flower.classList.remove("cc--gone");
    const hide = () => {
      flower.classList.add("cc--gone");
      applyChip(null);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    document.addEventListener("pointerenter", show);
    document.addEventListener("pointerleave", hide);

    // Paint the initial (centered) position once — no perpetual loop on mount.
    flower.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
    chip.style.transform = `translate(${pos.x}px, ${pos.y}px)`;

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.removeEventListener("pointerenter", show);
      document.removeEventListener("pointerleave", hide);
      document.body.classList.remove("has-custom-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div ref={flowerRef} aria-hidden="true" className="cc-flower" />
      {/* Caption chip — a SIBLING of the flower (the flower's brightness/invert
          filter would bleach any child). Outer div is the per-frame transform
          anchor (mirrors .cc-flower: fixed, top-left, z-250, no pointer
          events); the inner span carries the offset + the 200ms opacity/scale
          ease. Styled inline/utility-only — global.css is owned elsewhere. */}
      <div
        ref={chipRef}
        aria-hidden="true"
        className="fixed left-0 top-0 z-[250] pointer-events-none will-change-transform"
      >
        <span
          ref={chipTextRef}
          className="block w-max whitespace-nowrap rounded-full bg-[#0a0908]/90 ring-1 ring-white/10 px-3 py-1.5 font-sans text-[10px] font-bold tracking-[0.04em] text-ink"
          style={{
            opacity: 0,
            transform: `translate(${CHIP_OFFSET_X}px, -50%) scale(0.92)`,
            transition:
              "opacity 0.2s ease, transform 0.2s cubic-bezier(0.22, 0.61, 0.36, 1)",
          }}
        />
      </div>
    </>
  );
};
