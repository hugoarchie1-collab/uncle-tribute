import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { asset, webp } from "../lib/asset";
import { IMAGE_VARIANT_WIDTHS } from "../lib/imageVariants";
import { cn } from "../lib/cn";
import { EASE_SIGNATURE, EYEBROW_MUTED } from "./ui/tokens";

/* =============================================================================
 * CloserLook — the "closer look" deep-zoom viewer.
 * -----------------------------------------------------------------------------
 * The signature interactive moment on PaintingDetail: a full-screen viewer for
 * a painting's full-resolution (~2000px) source so a mandala can be read at the
 * scale it rewards. Opens at "fit" with a gentle scale-up entrance, then offers
 * cursor-anchored wheel zoom, drag pan (clamped to the image bounds), two-finger
 * pinch, double-click / double-tap fit↔1:1 toggle, and keyboard +/−/arrows.
 *
 * PROGRESSIVE LOAD — the -w800 webp variant (already likely warm in the page's
 * HTTP cache, since the hero may have requested it) is shown immediately so the
 * viewer never opens to an empty frame; the full-size webp crossfades in once it
 * decodes. The transform always runs on whichever layer is currently visible,
 * so the gesture never stalls waiting on the network.
 *
 * HOUSE CONVENTIONS (mirror EnquireModal + the mobile-nav scroll-lock):
 *   - fixed inset-0, z-[200] (below the .cc-flower custom cursor at z-250)
 *   - role="dialog" aria-modal; Escape / X / backdrop close; Tab focus-trap;
 *     focus restored to the opener on close; body scroll locked while open
 *   - Framer Motion only (gotcha #1); transform/opacity only (GPU compositing)
 *   - useReducedMotion() ⇒ instant entrance (no scale-up); the user-driven zoom
 *     itself is preserved (it's an intentional interaction, not decoration)
 *   - PaintingDetail is strictly monochrome — chrome is ink / muted-ink /
 *     hairline; accent appears only on focus/hover states.
 *
 * IMPLEMENTATION NOTES
 *   - The <img> elements render at NATIVE pixel size and are scaled DOWN by a
 *     transform (total scale = fitScale × zoom, fitScale ≤ 1). The GPU texture
 *     is therefore always full-resolution, so zooming sharpens toward native
 *     pixels rather than upscaling a small rasterisation.
 *   - Transform origin is 0,0; all pan/zoom maths run in that frame. The current
 *     and target transforms live in refs; a single critically-damped rAF lerp
 *     writes style.transform directly — zero React re-renders per frame.
 *   - Wheel listeners are attached manually (React's are passive; we must
 *     preventDefault). touch-action:none + overscroll-behavior:none stop iOS
 *     page-bounce / double-tap-zoom; Safari gesture* events are swallowed too.
 * ========================================================================== */

interface CloserLookProps {
  open: boolean;
  onClose: () => void;
  /** Raw .jpg path under /public for the SELECTED colourway's source —
   *  e.g. "/img/paintings/wild-rose-sussex-pink.jpg". The viewer resolves the
   *  webp sibling + the -w800 progressive variant itself. */
  imageSrc: string;
  alt: string;
  paintingTitle: string;
  colourwayName: string;
  /** The on-page artwork <img> — read at open for its decoded natural pixel
   *  size (so the fit scale is exact before the full-res file finishes). */
  sourceImgRef?: React.RefObject<HTMLImageElement | null>;
}

/** Fit view is zoom = 1. The top of the range is 1:1 native pixels, with a
 *  little headroom so a double-tap to 1:1 always has somewhere to go. */
const MIN_ZOOM = 1;
/** Source pixels may cover at most this much of their native size on screen. */
const MAX_NATIVE_OVERDRIVE = 1.1;
/** Critically-damped lerp rate (1/s) — first-order, so it can never overshoot. */
const SPRING_RATE = 14;
const WHEEL_SETTLE_MS = 170;
const INDICATOR_HIDE_MS = 850;
/** The -w800 progressive variant the viewer shows first. */
const PROGRESSIVE_WIDTH = 800;

type Transform = { x: number; y: number; s: number };

/** Soft one-sided rubber band: inside [min,max] is identity; outside, the
 *  excess is compressed so a gesture meets gentle resistance, not a wall. */
const rubber = (v: number, min: number, max: number, give: number): number => {
  if (v < min) return min - Math.min((min - v) * 0.32, give);
  if (v > max) return max + Math.min((v - max) * 0.32, give);
  return v;
};

const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

/** The -w800 webp variant path IF it exists on disk, else the full webp. The
 *  manifest is the source of truth for which widths were generated. */
const progressiveSrc = (jpgPath: string): string => {
  const widths = IMAGE_VARIANT_WIDTHS[jpgPath];
  if (
    widths &&
    widths.includes(PROGRESSIVE_WIDTH) &&
    jpgPath.endsWith(".jpg")
  ) {
    const stem = jpgPath.slice(0, -4);
    return asset(`${stem}-w${PROGRESSIVE_WIDTH}.webp`);
  }
  // No small variant — fall back to the full webp (the crossfade is then a
  // no-op, which is fine: one source, decoded once).
  return asset(webp(jpgPath));
};

export const CloserLook = ({
  open,
  onClose,
  imageSrc,
  alt,
  paintingTitle,
  colourwayName,
  sourceImgRef,
}: CloserLookProps) => {
  const reduceMotion = useReducedMotion();

  const overlayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fullImgRef = useRef<HTMLImageElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Geometry — viewport, native image size, fit scale, effective max zoom.
  const geo = useRef({
    cw: 1,
    ch: 1,
    natW: 2000,
    natH: 2000,
    fitScale: 1,
    maxZoom: 2,
  });

  // The live transform pair. `cur` is what's painted; `tgt` is where the
  // critically-damped loop is heading. Both in the origin-0,0 frame.
  const cur = useRef<Transform>({ x: 0, y: 0, s: 1 });
  const tgt = useRef<Transform>({ x: 0, y: 0, s: 1 });
  const rafId = useRef<number | null>(null);
  const lastFrame = useRef(0);

  // Gesture bookkeeping (refs — none of this should re-render React).
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pointerOrder = useRef<number[]>([]);
  const pinch = useRef<{ d0: number; s0: number } | null>(null);
  const drag = useRef<{ startX: number; startY: number; moved: boolean } | null>(
    null,
  );
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const wheelTimer = useRef<number | null>(null);
  const indicatorTimer = useRef<number | null>(null);
  const stepTimer = useRef<number | null>(null);
  const tapCloseTimer = useRef<number | null>(null);

  // Render-state: full-res decode readiness (drives the crossfade), the fitted
  // box (for the loading frame), the transient zoom indicator, and whether the
  // user has interacted (fades the one-line hint after first touch).
  const [fullReady, setFullReady] = useState(false);
  const [fitBox, setFitBox] = useState<{ w: number; h: number } | null>(null);
  const [indicator, setIndicator] = useState<{ z: number; on: boolean }>({
    z: 1,
    on: false,
  });
  const [touched, setTouched] = useState(false);

  // Latest onClose without re-running the lifecycle effect (EnquireModal
  // pattern — parents re-create arrow functions every render). Synced via an
  // effect so nothing writes the ref during render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const markTouched = () => setTouched((t) => (t ? t : true));

  /* ── transform plumbing ─────────────────────────────────────────────── */

  const paint = () => {
    const el = stageRef.current;
    if (!el) return;
    const { x, y, s } = cur.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
  };

  const tick = (now: number) => {
    rafId.current = null;
    const dt = Math.min((now - lastFrame.current) / 1000, 1 / 20);
    lastFrame.current = now;
    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * SPRING_RATE);
    const c = cur.current;
    const t = tgt.current;
    c.x += (t.x - c.x) * k;
    c.y += (t.y - c.y) * k;
    c.s += (t.s - c.s) * k;
    const settled =
      Math.abs(t.x - c.x) < 0.05 &&
      Math.abs(t.y - c.y) < 0.05 &&
      Math.abs(t.s - c.s) < 0.0004;
    if (settled) {
      c.x = t.x;
      c.y = t.y;
      c.s = t.s;
    }
    paint();
    if (!settled) rafId.current = requestAnimationFrame(tick);
  };

  /** Start the loop if it isn't running. */
  const kick = () => {
    if (rafId.current === null) {
      lastFrame.current = performance.now();
      rafId.current = requestAnimationFrame(tick);
    }
  };

  /** Snap painted = target (drag/pinch follow the finger 1:1; reduced motion). */
  const snap = () => {
    cur.current = { ...tgt.current };
    paint();
  };

  /** Centered translation for a given total scale. */
  const centeredFor = (s: number): { x: number; y: number } => {
    const { cw, ch, natW, natH } = geo.current;
    return { x: (cw - natW * s) / 2, y: (ch - natH * s) / 2 };
  };

  /** Hard pan bounds for a given total scale: the image is never lost
   *  off-screen — an axis smaller than the viewport stays centered. */
  const clampPan = (
    x: number,
    y: number,
    s: number,
  ): { x: number; y: number } => {
    const { cw, ch, natW, natH } = geo.current;
    const w = natW * s;
    const h = natH * s;
    return {
      x: w <= cw ? (cw - w) / 2 : clamp(x, cw - w, 0),
      y: h <= ch ? (ch - h) / 2 : clamp(y, ch - h, 0),
    };
  };

  /** Soft pan bounds — rubber-band give while a gesture is live. */
  const softClampPan = (
    x: number,
    y: number,
    s: number,
  ): { x: number; y: number } => {
    const { cw, ch, natW, natH } = geo.current;
    const w = natW * s;
    const h = natH * s;
    return {
      x: w <= cw ? (cw - w) / 2 : rubber(x, cw - w, 0, 64),
      y: h <= ch ? (ch - h) / 2 : rubber(y, ch - h, 0, 64),
    };
  };

  const flashIndicator = (zoom: number) => {
    setIndicator({ z: zoom, on: true });
    if (indicatorTimer.current !== null)
      window.clearTimeout(indicatorTimer.current);
    indicatorTimer.current = window.setTimeout(() => {
      setIndicator((p) => ({ ...p, on: false }));
      indicatorTimer.current = null;
    }, INDICATOR_HIDE_MS);
  };

  const currentZoom = () => tgt.current.s / geo.current.fitScale;

  /** Re-target a zoom toward a viewport point P, keeping the image point under
   *  P stationary: t' = P − (s'/s)·(P − t). Basis is the TARGET transform so
   *  successive wheel ticks compose; the spring smooths the painted catch-up. */
  const zoomTowards = (
    px: number,
    py: number,
    nextZoom: number,
    soft: boolean,
  ) => {
    const { fitScale } = geo.current;
    const t = tgt.current;
    const s1 = fitScale * nextZoom;
    const ratio = s1 / t.s;
    const nx = px - ratio * (px - t.x);
    const ny = py - ratio * (py - t.y);
    const clamped = soft ? softClampPan(nx, ny, s1) : clampPan(nx, ny, s1);
    tgt.current = { ...clamped, s: s1 };
    flashIndicator(nextZoom);
    kick();
  };

  /** Settle any rubber-banded overshoot back inside [1, maxZoom] + bounds. */
  const settle = () => {
    const { fitScale, maxZoom, cw, ch } = geo.current;
    const t = tgt.current;
    const z = clamp(t.s / fitScale, MIN_ZOOM, maxZoom);
    const s1 = fitScale * z;
    if (s1 !== t.s) {
      // Re-zoom toward the viewport center so the clamp-back feels anchored.
      const ratio = s1 / t.s;
      t.x = cw / 2 - ratio * (cw / 2 - t.x);
      t.y = ch / 2 - ratio * (ch / 2 - t.y);
      t.s = s1;
    }
    const p = clampPan(t.x, t.y, t.s);
    t.x = p.x;
    t.y = p.y;
    kick();
  };

  const stepZoom = (factor: number) => {
    const { cw, ch, maxZoom } = geo.current;
    const z = rubber(currentZoom() * factor, MIN_ZOOM, maxZoom, 0.1);
    zoomTowards(cw / 2, ch / 2, z, false);
    // Buttons / keys are discrete — settle the rubber edge immediately after.
    // Tracked so the lifecycle cleanup can cancel it, and a fast +/- mash never
    // piles up settle calls (mirrors the wheelTimer/indicatorTimer discipline).
    if (stepTimer.current !== null) window.clearTimeout(stepTimer.current);
    stepTimer.current = window.setTimeout(() => {
      settle();
      stepTimer.current = null;
    }, 50);
  };

  /** Double-click / double-tap: fit ↔ 1:1, anchored at the cursor point. */
  const toggleZoomAt = (px: number, py: number) => {
    const { fitScale, maxZoom } = geo.current;
    if (currentZoom() > 1.04) {
      // Back out to the fitted view.
      tgt.current = { ...centeredFor(fitScale), s: fitScale };
      flashIndicator(1);
      kick();
    } else {
      zoomTowards(px, py, maxZoom, false);
    }
  };

  /* ── lifecycle: measure, entrance target, listeners, locks ──────────── */

  useLayoutEffect(() => {
    if (!open) return;
    const overlay = overlayRef.current;
    const stage = stageRef.current;
    if (!overlay || !stage) return;

    // Stable gesture-bookkeeping containers captured once for the cleanup (their
    // identity never changes — useRef(new Map()) — but capturing satisfies the
    // exhaustive-deps "ref may change by cleanup" check honestly).
    const pointersMap = pointers.current;

    setTouched(false);

    const measure = () => {
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      const src = sourceImgRef?.current;
      const natW =
        src && src.naturalWidth > 0 ? src.naturalWidth : geo.current.natW;
      const natH =
        src && src.naturalHeight > 0 ? src.naturalHeight : geo.current.natH;
      const fitScale = Math.min(cw / natW, ch / natH);
      // Top of the range is native pixels (≤1.1× overdrive), never below the
      // fit (so there's always room to zoom in), floored a touch above fit.
      const maxZoom = Math.max(MAX_NATIVE_OVERDRIVE / fitScale, 1.6);
      geo.current = { cw, ch, natW, natH, fitScale, maxZoom };
      stage.style.width = `${natW}px`;
      stage.style.height = `${natH}px`;
      setFitBox({ w: natW * fitScale, h: natH * fitScale });
    };

    measure();
    const { fitScale } = geo.current;

    // Target: the image fitted + centered at zoom 1.
    tgt.current = { ...centeredFor(fitScale), s: fitScale };
    cur.current = { ...tgt.current };
    paint();

    const onResize = () => {
      const z = clamp(currentZoom(), MIN_ZOOM, geo.current.maxZoom);
      measure();
      const s1 = geo.current.fitScale * clamp(z, MIN_ZOOM, geo.current.maxZoom);
      const c = clampPan(tgt.current.x, tgt.current.y, s1);
      tgt.current = { ...c, s: s1 };
      kick();
    };
    window.addEventListener("resize", onResize);

    // Wheel must be non-passive to preventDefault (React's handlers aren't).
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      markTouched();
      const { maxZoom } = geo.current;
      // Trackpad pinch arrives as ctrlKey-wheel with small deltas.
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022));
      const z = rubber(currentZoom() * factor, MIN_ZOOM, maxZoom, 0.16);
      zoomTowards(e.clientX, e.clientY, z, true);
      if (wheelTimer.current !== null) window.clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(() => {
        settle();
        wheelTimer.current = null;
      }, WHEEL_SETTLE_MS);
    };
    overlay.addEventListener("wheel", onWheel, { passive: false });

    // Safari fires proprietary gesture events for trackpad pinch — swallow them
    // so the page itself never zooms behind the viewer.
    const preventGesture = (e: Event) => e.preventDefault();
    overlay.addEventListener("gesturestart", preventGesture);
    overlay.addEventListener("gesturechange", preventGesture);

    // Escape / zoom keys / arrow pan + the house Tab focus-trap.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        markTouched();
        stepZoom(1.4);
        return;
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        markTouched();
        stepZoom(1 / 1.4);
        return;
      }
      if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown"
      ) {
        e.preventDefault();
        markTouched();
        const step = 80;
        const t = tgt.current;
        const next = clampPan(
          t.x +
            (e.key === "ArrowLeft" ? step : e.key === "ArrowRight" ? -step : 0),
          t.y + (e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0),
          t.s,
        );
        tgt.current = { ...next, s: t.s };
        kick();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = overlayRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    // Scroll-lock + focus management (house pattern; mirrors the mobile nav).
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    const focusTimer = window.setTimeout(() => closeBtnRef.current?.focus(), 80);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      overlay.removeEventListener("wheel", onWheel);
      overlay.removeEventListener("gesturestart", preventGesture);
      overlay.removeEventListener("gesturechange", preventGesture);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      rafId.current = null;
      if (wheelTimer.current !== null) window.clearTimeout(wheelTimer.current);
      if (indicatorTimer.current !== null)
        window.clearTimeout(indicatorTimer.current);
      window.clearTimeout(focusTimer);
      if (stepTimer.current !== null) window.clearTimeout(stepTimer.current);
      if (tapCloseTimer.current !== null) window.clearTimeout(tapCloseTimer.current);
      pointersMap.clear();
      pointerOrder.current = [];
      pinch.current = null;
      drag.current = null;
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overscrollBehavior = prevOverscroll;
      if (opener && document.contains(opener)) opener.focus();
    };
    // Lifecycle is keyed to open/close (and the motion preference). Geometry,
    // transforms and handlers all live in refs by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reduceMotion]);

  // Full-res crossfade gate — img.decode() resolves instantly when the source
  // is already cached, so the crossfade only really shows on a cold full load.
  useEffect(() => {
    if (!open) return;
    // Reset the decode gate whenever the source changes (e.g. the colourway
    // picker switches while the viewer is open) so the new full-res file
    // crossfades in over the progressive layer rather than popping.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullReady(false);
    let cancelled = false;
    const el = fullImgRef.current;
    if (!el) return;
    const markReady = () => {
      if (!cancelled) setFullReady(true);
    };
    if (el.complete && el.naturalWidth > 0) {
      markReady();
      return;
    }
    el.decode().then(markReady, markReady);
    return () => {
      cancelled = true;
    };
  }, [open, imageSrc]);

  /* ── pointer gestures: pan, pinch, tap, double-tap ──────────────────── */

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Chrome buttons keep their own click behaviour — never start a gesture.
    if ((e.target as HTMLElement).closest("button")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    markTouched();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pointerOrder.current.push(e.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = pointerOrder.current.map((id) => pointers.current.get(id)!);
      pinch.current = {
        d0: Math.hypot(a.x - b.x, a.y - b.y),
        s0: tgt.current.s,
      };
      drag.current = null;
    } else if (pointers.current.size === 1) {
      drag.current = { startX: e.clientX, startY: e.clientY, moved: false };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    const prev = { x: p.x, y: p.y };
    p.x = e.clientX;
    p.y = e.clientY;

    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = pointerOrder.current.map((id) => pointers.current.get(id)!);
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const { fitScale, maxZoom } = geo.current;
      const zRaw =
        (pinch.current.s0 * (d / Math.max(pinch.current.d0, 1))) / fitScale;
      const z = rubber(zRaw, MIN_ZOOM, maxZoom, 0.45);
      const s1 = fitScale * z;
      // Keep the image point under the midpoint stationary, while the midpoint's
      // own travel pans the image (two-finger pan). The midpoint BEFORE this
      // move anchors the incremental update.
      const t = tgt.current;
      const ratio = s1 / t.s;
      const isFirst = e.pointerId === pointerOrder.current[0];
      const a0 = isFirst ? prev : { x: a.x, y: a.y };
      const b0 = isFirst ? { x: b.x, y: b.y } : prev;
      const midPrev = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
      const nx = mid.x - ratio * (midPrev.x - t.x);
      const ny = mid.y - ratio * (midPrev.y - t.y);
      const soft = softClampPan(nx, ny, s1);
      tgt.current = { ...soft, s: s1 };
      snap(); // pinch follows the fingers 1:1
      flashIndicator(z);
      return;
    }

    if (drag.current && pointers.current.size === 1) {
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      if (
        Math.abs(p.x - drag.current.startX) > 6 ||
        Math.abs(p.y - drag.current.startY) > 6
      ) {
        drag.current.moved = true;
      }
      const t = tgt.current;
      const soft = softClampPan(t.x + dx, t.y + dy, t.s);
      tgt.current = { ...soft, s: t.s };
      snap(); // drag follows the pointer 1:1
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    pointers.current.delete(e.pointerId);
    pointerOrder.current = pointerOrder.current.filter(
      (id) => id !== e.pointerId,
    );

    if (pinch.current) {
      if (pointers.current.size < 2) {
        pinch.current = null;
        settle();
        // A remaining finger continues as a pan.
        if (pointers.current.size === 1) {
          const [rest] = [...pointers.current.values()];
          drag.current = { startX: rest.x, startY: rest.y, moved: true };
        }
      }
      return;
    }

    const d = drag.current;
    drag.current = null;
    if (!d) return;

    if (d.moved) {
      // Spring the (rubber-banded) target back inside the hard bounds.
      tgt.current = {
        ...clampPan(tgt.current.x, tgt.current.y, tgt.current.s),
        s: tgt.current.s,
      };
      kick();
      return;
    }

    // Clean tap (no travel) — double-tap toggle, else backdrop close.
    const now = performance.now();
    const last = lastTap.current;
    const isDouble =
      last !== null &&
      now - last.t < 320 &&
      Math.hypot(e.clientX - last.x, e.clientY - last.y) < 44;
    if (isDouble) {
      lastTap.current = null;
      toggleZoomAt(e.clientX, e.clientY);
      return;
    }
    lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    // A single tap on the dark ground (not the painting) closes — lightbox
    // muscle-memory. Taps ON the painting never close.
    if (e.target === e.currentTarget) {
      const tapX = e.clientX;
      const tapY = e.clientY;
      tapCloseTimer.current = window.setTimeout(() => {
        tapCloseTimer.current = null;
        const lt = lastTap.current;
        if (lt && Math.abs(lt.x - tapX) < 1 && Math.abs(lt.y - tapY) < 1) {
          onCloseRef.current();
        }
      }, 320);
    }
  };

  const zoomPct = Math.round(indicator.z * 100);

  // Detect a coarse pointer (touch) so the one-line hint reads correctly for
  // the device. Computed at render; cheap, and only affects copy.
  const isTouch =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;

  const progressive = progressiveSrc(imageSrc);
  const full = asset(webp(imageSrc));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          key="closer-look"
          role="dialog"
          aria-modal="true"
          aria-label={`${paintingTitle} — ${colourwayName}, closer look`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: reduceMotion ? 0.18 : 0.3,
            ease: EASE_SIGNATURE,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          // Contextual cursor caption (CustomCursor reads these): the chip
          // whispers what the stage affords, and swaps to "Drag" while a
          // pointer is held. On the OVERLAY (not the inner stage) because
          // setPointerCapture retargets mid-drag pointer events here; the
          // cursor suppresses the caption over the chrome buttons itself.
          data-cursor-label="Drag · scroll to zoom"
          data-cursor-label-drag="Drag"
          className="fixed inset-0 z-[200] overflow-hidden select-none cursor-zoom-out"
          style={{
            backgroundColor: "rgba(10, 9, 8, 0.97)",
            touchAction: "none",
            overscrollBehavior: "none",
            WebkitUserSelect: "none",
          }}
        >
          {/* Loading frame — fitted-rect ghost, only until the full-res source
              has decoded AND no progressive layer is up. Static (no pulse)
              under reduced motion. */}
          {!fullReady && fitBox && (
            <div
              aria-hidden="true"
              className={cn(
                "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-ink/[0.05] ring-1 ring-line",
                reduceMotion ? "" : "animate-pulse",
              )}
              style={{ width: fitBox.w, height: fitBox.h }}
            />
          )}

          {/* ENTRANCE WRAPPER — owns the scale 0.96 → 1 + fade (~320ms),
              pivoting around the viewport centre. This is a SEPARATE element
              from the transformed stage below so Framer's `transform` (the
              entrance) and the rAF loop's `style.transform` (the live pan/zoom)
              never write the same node — they'd otherwise clobber each other on
              the first frame. Instant under reduced motion. */}
          <motion.div
            initial={
              reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }
            }
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: reduceMotion ? 0 : 0.32,
              ease: EASE_SIGNATURE,
            }}
            className="pointer-events-none absolute inset-0 origin-center"
          >
            {/* The painting stage — a single transformed element holding both the
                progressive (-w800) layer and the full-res layer, so ONE
                transform (the rAF loop, via style.transform) drives both. Sized
                to native pixels in the lifecycle effect; scaled DOWN to fit.
                `pointer-events-auto` so a tap ON the painting has the stage as
                its target (never closes), while the wrapper stays transparent to
                pointer events so a tap on the dark GROUND falls through to the
                overlay (target === overlay → close). */}
            <div
              ref={stageRef}
              className="pointer-events-auto absolute left-0 top-0 origin-top-left will-change-transform"
            >
              {/* Progressive layer — shown immediately (likely warm in cache). */}
              <img
                src={progressive}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="absolute left-0 top-0 h-full w-full max-w-none"
              />
              {/* Full-resolution layer — crossfades over the progressive one. */}
              <picture>
                <source srcSet={full} type="image/webp" />
                <img
                  ref={fullImgRef}
                  src={asset(imageSrc)}
                  alt={alt}
                  draggable={false}
                  className={cn(
                    "absolute left-0 top-0 h-full w-full max-w-none",
                    fullReady ? "opacity-100" : "opacity-0",
                    reduceMotion ? "" : "transition-opacity duration-500",
                  )}
                />
              </picture>
            </div>
          </motion.div>

          {/* ── CHROME — minimal, monochrome ─────────────────────────────── */}

          {/* Backdrop close affordance — invisible, full-bleed, BEHIND the
              chrome buttons and the stage's pointer gestures. The single-tap
              close above handles touch; this gives keyboard/SR users a labelled
              close target and mouse users a click-the-dark-to-exit path that
              doesn't depend on the tap heuristic. */}
          <button
            type="button"
            aria-label="Close closer look"
            onClick={onClose}
            tabIndex={-1}
            className="absolute inset-0 -z-10 bg-transparent border-0 cursor-zoom-out"
          />

          {/* Title + colourway — top-left, quiet. */}
          <p
            className={cn(
              EYEBROW_MUTED,
              "pointer-events-none absolute top-5 left-4 md:top-7 md:left-6 m-0 max-w-[62vw] truncate",
            )}
          >
            <span className="text-ink">{paintingTitle}</span>
            <span aria-hidden="true" className="mx-2 text-ink/35">
              ·
            </span>
            {colourwayName}
          </p>

          {/* Close — top-right, mobile-menu register. */}
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close closer look"
            className="absolute top-4 right-4 md:top-6 md:right-6 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0a0908]/70 ring-1 ring-line text-ink-muted hover:text-ink focus-visible:text-accent focus-visible:ring-accent transition-colors duration-300"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 3 15 15M15 3 3 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Zoom controls + % indicator — bottom-right, 44px touch targets. */}
          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex items-center gap-2.5">
            {/* Live zoom % — sits beside the controls; fades after a beat. */}
            <span
              aria-hidden="true"
              className={cn(
                "mr-1 rounded-full bg-[#0a0908]/70 ring-1 ring-line px-3 py-1.5 font-sans text-[11px] font-bold tracking-[0.18em] uppercase text-ink transition-opacity duration-500",
                indicator.on ? "opacity-100" : "opacity-0",
              )}
            >
              {zoomPct}%
            </span>
            <button
              type="button"
              onClick={() => {
                markTouched();
                stepZoom(1 / 1.4);
              }}
              aria-label="Zoom out"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0a0908]/70 ring-1 ring-line text-ink-muted hover:text-ink focus-visible:text-accent focus-visible:ring-accent transition-colors duration-300"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2.5 8h11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                markTouched();
                stepZoom(1.4);
              }}
              aria-label="Zoom in"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0a0908]/70 ring-1 ring-line text-ink-muted hover:text-ink focus-visible:text-accent focus-visible:ring-accent transition-colors duration-300"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M8 2.5v11M2.5 8h11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* One-line hint — bottom-centre; fades the moment the user interacts.
              Device-aware copy (no invented art-speak). */}
          <p
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 m-0 max-w-[80vw] text-center font-sans text-[11px] font-bold tracking-[0.2em] uppercase text-ink-muted transition-opacity duration-500",
              touched ? "opacity-0" : "opacity-100",
            )}
          >
            {isTouch
              ? "Pinch to zoom · drag to move"
              : "Scroll to zoom · drag to move"}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
