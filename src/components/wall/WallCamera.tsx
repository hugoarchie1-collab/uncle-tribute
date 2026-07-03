// =============================================================================
// WallCamera — live camera "see it on your wall" overlay.
// -----------------------------------------------------------------------------
// The interactive placement experience Hugo asked for: the phone's rear camera
// runs live; the WHOLE selected print (never a cropped centre) floats over it as
// a positionable, resizable, semi-transparent overlay. Drag to move, pinch (or
// the +/− handles) to resize. "Lock on wall" freezes it in place AND turns it
// fully opaque — and, where the device grants motion access, it TRACKS the
// phone's rotation (deviceorientation) so the print appears to STAY PUT on the
// wall as the phone pans (yaw → horizontal px, pitch → vertical px, scaled by
// an approximate camera FOV, smoothed with a small lerp). If orientation
// permission is denied or events never fire, the lock degrades gracefully to
// the plain screen-frozen behaviour — no broken toggle.
//
// The top-left chip is the OPTIONS button: it opens a panel with the same
// three pickers the Virtual Gallery panel has — Colourway, Size and Frame —
// so everything can be switched live on the wall. Option state lives in the
// parent (SeeOnYourWall) so the two UIs stay in sync.
//
// This is a flat overlay (not native Quick Look / model-viewer), so we fully
// control transparency + lock + the exact framed artwork the site sells.
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Colourway, Painting } from "../../data/paintings";
import { FRAME_STYLES } from "../../data/paintings";
import {
  ARTWORK_SIZES,
  cmLabel,
  getArtworkSize,
  type ArtworkSizeId,
} from "../../lib/artworkSizes";
import { asset, webp } from "../../lib/asset";
import { cn } from "../../lib/cn";

// Frame options: "No frame" + the canonical website frame styles. Derived from
// FRAME_STYLES (the single source) — SeeOnYourWall derives the identical list.
// (Kept file-local: the react-refresh lint rule forbids exporting constants
// from component files.)
const FRAME_OPTIONS: { id: string; label: string; swatch: string | null }[] = [
  { id: "none", label: "No frame", swatch: null },
  ...FRAME_STYLES.map((f) => ({ id: f.id, label: f.label, swatch: f.swatch })),
];

interface WallCameraProps {
  painting: Painting;
  /** The currently selected (available) colourway. */
  colourway: Colourway;
  onColourwayChange: (name: string) => void;
  sizeId: ArtworkSizeId;
  onSizeChange: (id: ArtworkSizeId) => void;
  /** One of FRAME_OPTIONS ids ("none" = unframed). */
  frameId: string;
  onFrameChange: (id: string) => void;
  onClose: () => void;
}

type CamState = "starting" | "live" | "denied" | "unsupported";

/** Approximate horizontal field of view of a phone camera preview (degrees). */
const H_FOV_DEG = 62;
/** Lerp factor per frame for the wall-lock smoothing (0..1). */
const LOCK_LERP = 0.18;

/** Wrap a degree delta into [-180, 180] (compass alpha wraps at 0/360). */
const wrapDeg = (d: number): number => {
  let v = d % 360;
  if (v > 180) v -= 360;
  if (v < -180) v += 360;
  return v;
};

const clampNum = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(v, max));

export const WallCamera = ({
  painting,
  colourway,
  onColourwayChange,
  sizeId,
  onSizeChange,
  frameId,
  onFrameChange,
  onClose,
}: WallCameraProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [cam, setCam] = useState<CamState>(() =>
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
      ? "starting"
      : "unsupported",
  );
  const [locked, setLocked] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  // Guards for the async iOS permission flow: the promise may resolve AFTER
  // the user unlocked or the overlay unmounted — never start tracking then.
  const lockedRef = useRef(false);
  const disposedRef = useRef(false);

  const colourways = useMemo(
    () => painting.colourways.filter((c) => c.available),
    [painting],
  );
  const size = getArtworkSize(sizeId);
  const frame = FRAME_OPTIONS.find((f) => f.id === frameId) ?? FRAME_OPTIONS[0];
  const framed = frame.swatch !== null;
  const imageSrc = colourway.image;
  const caption = `${size.label} · ${cmLabel(size)} · ${frame.label}`;

  // Overlay geometry (in px, relative to the stage). Center-anchored.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [width, setWidth] = useState(0);

  // Refs mirroring pos/width for the wall-lock rAF loop (no re-render churn).
  const posRef = useRef(pos);
  const widthRef = useRef(width);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);
  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  // ---- Start / stop the camera ------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) return; // initial state already "unsupported"
    md.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
        setCam("live");
      })
      .catch((err) => {
        if (cancelled) return;
        setCam(err?.name === "NotAllowedError" ? "denied" : "unsupported");
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // ---- Initialise overlay size/pos once the stage is measured -----------------
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setWidth(Math.round(Math.min(r.width, r.height) * 0.6));
    setPos({ x: Math.round(r.width / 2), y: Math.round(r.height / 2) });
  }, []);

  // ---- Escape closes ----------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // ---- Wall lock: deviceorientation tracking ----------------------------------
  // While locked, the print is translated OPPOSITE to the phone's rotation
  // delta so it appears fixed on the wall. All per-frame work happens on refs +
  // direct style writes; React state is untouched until unlock.
  const orient = useRef<{
    base: { alpha: number; beta: number } | null;
    target: { x: number; y: number };
    rendered: { x: number; y: number };
    raf: number | null;
    handler: ((e: DeviceOrientationEvent) => void) | null;
  }>({ base: null, target: { x: 0, y: 0 }, rendered: { x: 0, y: 0 }, raf: null, handler: null });

  const stopOrientation = useCallback((bakeOffset: boolean) => {
    const o = orient.current;
    if (o.handler) {
      window.removeEventListener("deviceorientation", o.handler, true);
      o.handler = null;
    }
    if (o.raf != null) {
      cancelAnimationFrame(o.raf);
      o.raf = null;
    }
    if (bakeOffset && (o.rendered.x !== 0 || o.rendered.y !== 0)) {
      // Fold the tracked offset into the base position so the print doesn't
      // jump when unlocking — clamped back on-stage so it stays grabbable.
      const r = stageRef.current?.getBoundingClientRect();
      const dx = o.rendered.x;
      const dy = o.rendered.y;
      setPos((p) =>
        p
          ? {
              x: clampNum(p.x + dx, 0, r?.width ?? p.x + dx),
              y: clampNum(p.y + dy, 0, r?.height ?? p.y + dy),
            }
          : p,
      );
    }
    o.base = null;
    o.target = { x: 0, y: 0 };
    o.rendered = { x: 0, y: 0 };
    const el = overlayRef.current;
    if (el) {
      el.style.transform = "translate(-50%, -50%)";
      el.style.opacity = "";
    }
  }, []);

  const startOrientation = useCallback(() => {
    const o = orient.current;
    if (o.handler) return; // already tracking
    if (disposedRef.current || !lockedRef.current) return; // stale async grant
    const handler = (e: DeviceOrientationEvent) => {
      if (e.alpha == null || e.beta == null) return;
      if (!o.base) {
        o.base = { alpha: e.alpha, beta: e.beta };
        return;
      }
      const dYaw = wrapDeg(e.alpha - o.base.alpha); // + = phone turned left
      const dPitch = e.beta - o.base.beta; // + = camera tilted up
      const r = stageRef.current?.getBoundingClientRect();
      const w = r?.width ?? 390;
      const h = r?.height ?? 700;
      // px per degree is (approximately) equal on both axes for a real camera.
      const pxPerDeg = w / H_FOV_DEG;
      // Turn left → world content shifts right in frame → print moves right.
      // Tilt camera up → world content shifts down in frame → print moves down.
      o.target = {
        x: clampNum(dYaw * pxPerDeg, -1.5 * w, 1.5 * w),
        y: clampNum(dPitch * pxPerDeg, -1.5 * h, 1.5 * h),
      };
    };
    o.handler = handler;
    window.addEventListener("deviceorientation", handler, true);

    const tick = () => {
      o.rendered.x += (o.target.x - o.rendered.x) * LOCK_LERP;
      o.rendered.y += (o.target.y - o.rendered.y) * LOCK_LERP;
      const el = overlayRef.current;
      const r = stageRef.current?.getBoundingClientRect();
      const p = posRef.current;
      if (el) {
        el.style.transform = `translate(-50%, -50%) translate(${o.rendered.x.toFixed(1)}px, ${o.rendered.y.toFixed(1)}px)`;
        if (r && p) {
          // Fade as the print's centre pans past the stage edge (the stage's
          // overflow-hidden clips it anyway — the fade just softens the exit).
          const cx = p.x + o.rendered.x;
          const cy = p.y + o.rendered.y;
          const overshoot = Math.max(0, -cx, cx - r.width, -cy, cy - r.height);
          const half = Math.max(1, widthRef.current * 0.5);
          el.style.opacity = String(clampNum(1 - overshoot / half, 0, 1));
        }
      }
      o.raf = requestAnimationFrame(tick);
    };
    o.raf = requestAnimationFrame(tick);
  }, []);

  // Full teardown on unmount (listener + rAF).
  useEffect(
    () => () => {
      disposedRef.current = true;
      stopOrientation(false);
    },
    [stopOrientation],
  );

  const toggleLock = () => {
    if (locked) {
      lockedRef.current = false;
      stopOrientation(true);
      setLocked(false);
      return;
    }
    lockedRef.current = true;
    setLocked(true);
    // Enable orientation tracking. On iOS 13+, requestPermission() MUST be
    // called from this user gesture. Any failure → plain screen-frozen lock.
    try {
      const DOE =
        typeof window !== "undefined"
          ? (window.DeviceOrientationEvent as
              | (typeof DeviceOrientationEvent & {
                  requestPermission?: () => Promise<string>;
                })
              | undefined)
          : undefined;
      if (!DOE) return;
      if (typeof DOE.requestPermission === "function") {
        void DOE.requestPermission()
          .then((res) => {
            if (res === "granted") startOrientation();
          })
          .catch(() => {
            /* denied / unavailable → static lock, no broken toggle */
          });
      } else {
        startOrientation();
      }
    } catch {
      /* static lock fallback */
    }
  };

  // ---- Pointer gestures: drag (1 finger) + pinch-resize (2 fingers) -----------
  const gesture = useRef<{
    pointers: Map<number, { x: number; y: number }>;
    startPos: { x: number; y: number };
    startWidth: number;
    startDist: number;
    startMid: { x: number; y: number };
  }>({
    pointers: new Map(),
    startPos: { x: 0, y: 0 },
    startWidth: 0,
    startDist: 0,
    startMid: { x: 0, y: 0 },
  });

  const clampWidth = useCallback((w: number) => {
    const r = stageRef.current?.getBoundingClientRect();
    const max = r ? r.width * 1.3 : 2000;
    return Math.max(60, Math.min(w, max));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (locked) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const g = gesture.current;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.pointers.size === 1 && pos) {
      g.startPos = { ...pos };
    } else if (g.pointers.size === 2) {
      const pts = [...g.pointers.values()];
      g.startDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      g.startWidth = width;
      g.startMid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      if (pos) g.startPos = { ...pos };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (locked) return;
    const g = gesture.current;
    if (!g.pointers.has(e.pointerId)) return;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...g.pointers.values()];
    if (pts.length === 1 && pos) {
      // Drag — but we need the delta vs the pointer's start, which we track via
      // the first-down startPos + the current vs original pointer position.
      const down = g.pointers.get(e.pointerId)!;
      // startPos captured the overlay center at down; move it by pointer delta.
      // We derive pointer delta from the gesture origin stored on first move.
      if (!(g as unknown as { _o?: { x: number; y: number } })._o) {
        (g as unknown as { _o: { x: number; y: number } })._o = { x: down.x, y: down.y };
      }
      const o = (g as unknown as { _o: { x: number; y: number } })._o;
      setPos({ x: g.startPos.x + (e.clientX - o.x), y: g.startPos.y + (e.clientY - o.y) });
    } else if (pts.length === 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (g.startDist > 0) setWidth(clampWidth(g.startWidth * (dist / g.startDist)));
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    const g = gesture.current;
    g.pointers.delete(e.pointerId);
    delete (g as unknown as { _o?: unknown })._o;
    if (g.pointers.size === 1) {
      // Re-anchor the remaining pointer as a fresh drag origin.
      if (pos) g.startPos = { ...pos };
    }
  };

  const nudgeScale = (factor: number) => setWidth((w) => clampWidth(w * factor));

  // Changing size rescales the on-wall print proportionally (A2 → A1 grows it
  // by the real cm ratio), so the picker means something visually.
  const pickSize = (id: ArtworkSizeId) => {
    if (id === sizeId) return;
    const prev = getArtworkSize(sizeId);
    const next = getArtworkSize(id);
    setWidth((w) => clampWidth(w * (next.cm / prev.cm)));
    onSizeChange(id);
  };

  // Moulding hugs the print — a thin moulding, no white mount (Hugo).
  const moulding = Math.max(6, Math.round(width * 0.045));

  return createPortal(
    <div className="fixed inset-0 z-[140] bg-black">
      {/* Live camera feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Fallback background when there's no camera */}
      {cam !== "live" && (
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_30%,#2a2620,#0a0908)]" />
      )}

      {/* Placement stage */}
      <div ref={stageRef} className="absolute inset-0 overflow-hidden touch-none">
        {pos && width > 0 && (
          <div
            ref={overlayRef}
            role="img"
            aria-label={`${painting.title} — ${colourway.name} on your wall`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            className={cn("absolute select-none", locked ? "cursor-default" : "cursor-move")}
            style={{
              left: pos.x,
              top: pos.y,
              width,
              transform: "translate(-50%, -50%)",
              opacity: locked ? 1 : 0.62,
              // While locked, the rAF loop writes opacity per-frame — a CSS
              // transition would fight it and lag the tracking.
              transition: locked ? "none" : "opacity 200ms ease",
              padding: framed ? moulding : 0,
              background: framed
                ? `linear-gradient(135deg, color-mix(in srgb, ${frame.swatch}, white 22%), ${frame.swatch} 55%, color-mix(in srgb, ${frame.swatch}, black 30%))`
                : "transparent",
              borderRadius: 2,
              boxShadow: locked
                ? "0 24px 60px rgba(0,0,0,0.55), 0 6px 16px rgba(0,0,0,0.4)"
                : "0 16px 40px rgba(0,0,0,0.45)",
              touchAction: "none",
            }}
          >
            {/* Inner lip for framed depth (no white mat) */}
            <div style={framed ? { boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)" } : undefined}>
              <picture>
                <source srcSet={asset(webp(imageSrc))} type="image/webp" />
                <img
                  src={asset(imageSrc)}
                  alt=""
                  draggable={false}
                  // width:100% + height:auto → the print's OWN aspect ratio, so the
                  // WHOLE painting shows with no letterbox border, framed or not.
                  className="block h-auto w-full"
                />
              </picture>
            </div>

            {/* Resize handle (bottom-right) — visible while unlocked */}
            {!locked && (
              <span
                aria-hidden="true"
                className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-black shadow-lg"
                style={{ touchAction: "none" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 13h10M13 13V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M6 13l7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tap-outside layer that closes the options panel (above the stage,
          below the bars/panel by DOM order — a tap here never drags the print) */}
      {optionsOpen && (
        <button
          type="button"
          aria-label="Close options"
          onClick={() => setOptionsOpen(false)}
          className="absolute inset-0 cursor-default"
        />
      )}

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setOptionsOpen((v) => !v)}
          aria-expanded={optionsOpen}
          aria-label={optionsOpen ? "Close options" : "Open options — colourway, size and frame"}
          className="press inline-flex min-h-[44px] max-w-[75%] items-center gap-2 rounded-full bg-black/55 px-3.5 py-2 text-left font-sans text-[14px] text-white/90 ring-1 ring-white/25 backdrop-blur-sm"
        >
          <span className="truncate">{caption}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            className={cn("shrink-0 transition-transform duration-200", optionsOpen && "rotate-180")}
          >
            <path d="M3 5.5 7 9.5l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/25 backdrop-blur-sm"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Options panel — Colourway · Size · Frame, switched live on the wall */}
      {optionsOpen && (
        <div className="absolute left-4 right-4 top-[76px] max-h-[62vh] max-w-[440px] overflow-y-auto rounded-2xl bg-black/75 p-4 ring-1 ring-white/20 backdrop-blur-md">
          {colourways.length > 1 && (
            <section className="mb-4">
              <p className="m-0 mb-2 font-sans text-[13px] font-bold uppercase tracking-[0.32em] text-white/70">
                Colourway · {colourway.name}
              </p>
              <div role="radiogroup" aria-label="Colourway" className="flex flex-wrap gap-2.5">
                {colourways.map((c) => {
                  const sel = c.name === colourway.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      role="radio"
                      aria-checked={sel}
                      aria-label={c.name}
                      onClick={() => onColourwayChange(c.name)}
                      className={cn(
                        "h-11 w-11 overflow-hidden rounded-full outline-none ring-1 ring-white/30 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white",
                        sel ? "ring-2 ring-white scale-110" : "opacity-90 hover:scale-105 hover:opacity-100",
                      )}
                      style={{ backgroundColor: c.hex }}
                    >
                      <picture>
                        <source srcSet={asset(webp(c.image))} type="image/webp" />
                        <img src={asset(c.image)} alt="" className="h-full w-full object-cover" />
                      </picture>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mb-4">
            <p className="m-0 mb-2 font-sans text-[13px] font-bold uppercase tracking-[0.32em] text-white/70">
              Size
            </p>
            <div role="radiogroup" aria-label="Print size" className="grid grid-cols-4 gap-2">
              {ARTWORK_SIZES.map((s) => {
                const sel = s.id === sizeId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => pickSize(s.id)}
                    className={cn(
                      "flex min-h-[48px] flex-col items-center justify-center rounded-xl px-1 outline-none ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-white",
                      sel ? "bg-white text-black ring-white" : "text-white/80 ring-white/25 hover:text-white",
                    )}
                  >
                    <span className="font-sans text-[13px] font-bold tracking-[0.08em]">{s.label}</span>
                    <span className={cn("font-sans text-[13px] font-semibold", sel ? "text-black/60" : "text-white/55")}>
                      {s.cm}cm
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="m-0 mb-2 font-sans text-[13px] font-bold uppercase tracking-[0.32em] text-white/70">
              Frame · {frame.label}
            </p>
            <div role="radiogroup" aria-label="Frame" className="flex flex-wrap gap-2">
              {FRAME_OPTIONS.map((f) => {
                const sel = f.id === frame.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    aria-label={f.label}
                    onClick={() => onFrameChange(f.id)}
                    className={cn(
                      "inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 outline-none ring-1 transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-white",
                      sel ? "ring-white" : "ring-white/25 hover:ring-white/60",
                    )}
                  >
                    <span
                      className="h-5 w-5 rounded-full ring-1 ring-black/30"
                      style={{
                        background: f.swatch
                          ? `linear-gradient(135deg, color-mix(in srgb, ${f.swatch}, white 24%), ${f.swatch})`
                          : "repeating-linear-gradient(45deg, #2a2620, #2a2620 3px, #14110d 3px, #14110d 6px)",
                      }}
                    />
                    <span className={cn("font-sans text-[14px] font-bold tracking-[0.03em]", sel ? "text-white" : "text-white/70")}>
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {cam === "denied" && (
          <p className="max-w-[420px] rounded-2xl bg-black/60 px-4 py-2.5 text-center font-sans text-[14px] leading-[1.5] text-white/90 backdrop-blur-sm">
            Camera access was blocked. Allow camera for this site, or use the drag/resize controls over the plain
            backdrop.
          </p>
        )}
        {cam === "unsupported" && (
          <p className="max-w-[420px] rounded-2xl bg-black/60 px-4 py-2.5 text-center font-sans text-[14px] leading-[1.5] text-white/90 backdrop-blur-sm">
            Open this on your phone (Safari / Chrome) to see it on your real wall. You can still position it here.
          </p>
        )}
        {!locked && (
          <p className="rounded-full bg-black/45 px-3.5 py-1.5 font-sans text-[13px] text-white/80 backdrop-blur-sm">
            Drag to position · pinch or +/− to resize · then lock it on your wall
          </p>
        )}

        <div className="flex items-center gap-2.5">
          {!locked && (
            <>
              <button
                type="button"
                onClick={() => nudgeScale(1 / 1.12)}
                aria-label="Smaller"
                className="press inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white text-2xl leading-none ring-1 ring-white/25 backdrop-blur-sm"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => nudgeScale(1.12)}
                aria-label="Larger"
                className="press inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white text-2xl leading-none ring-1 ring-white/25 backdrop-blur-sm"
              >
                +
              </button>
            </>
          )}
          <button
            type="button"
            onClick={toggleLock}
            className={cn(
              "press inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full px-7 font-sans text-[14px] font-bold tracking-[0.03em] transition-colors",
              locked
                ? "bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm"
                : "bg-white text-black hover:bg-accent hover:text-ink",
            )}
          >
            {locked ? (
              <>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 9V7a5 5 0 0 1 9.5-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Reposition
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                Lock on wall
              </>
            )}
          </button>
        </div>
        <p className="font-sans text-[13px] text-white/55">{frame.label} · your camera stays on your device</p>
      </div>
    </div>,
    document.body,
  );
};

export default WallCamera;
