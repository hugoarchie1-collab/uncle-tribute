// =============================================================================
// WallCamera — live camera "see it on your wall" overlay.
// -----------------------------------------------------------------------------
// The interactive placement experience Hugo asked for: the phone's rear camera
// runs live; the WHOLE selected print (never a cropped centre) floats over it as
// a positionable, resizable, semi-transparent overlay. Drag to move, pinch (or
// the +/− handles) to resize. "Lock on wall" freezes it in place AND turns it
// fully opaque, so you can hold your phone up and see the piece hung. Frame
// options render as a real moulding that HUGS the print — no huge white mount.
//
// This is a flat overlay (not native Quick Look / model-viewer), so we fully
// control transparency + lock + the exact framed artwork the site sells.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { asset, webp } from "../../lib/asset";
import { cn } from "../../lib/cn";

interface WallCameraProps {
  imageSrc: string; // path under /public (jpg); webp swapped automatically
  alt: string;
  /** Frame moulding colour, or null for "No frame". */
  frameSwatch: string | null;
  frameLabel: string;
  /** e.g. "A2 · 42 × 42 cm · Natural oak" */
  caption: string;
  onClose: () => void;
}

type CamState = "starting" | "live" | "denied" | "unsupported";

export const WallCamera = ({
  imageSrc,
  alt,
  frameSwatch,
  frameLabel,
  caption,
  onClose,
}: WallCameraProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [cam, setCam] = useState<CamState>(() =>
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
      ? "starting"
      : "unsupported",
  );
  const [locked, setLocked] = useState(false);

  // Overlay geometry (in px, relative to the stage). Center-anchored.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [width, setWidth] = useState(0);

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

  const framed = frameSwatch !== null;
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
            role="img"
            aria-label={alt}
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
              transition: "opacity 200ms ease",
              padding: framed ? moulding : 0,
              background: framed
                ? `linear-gradient(135deg, color-mix(in srgb, ${frameSwatch}, white 22%), ${frameSwatch} 55%, color-mix(in srgb, ${frameSwatch}, black 30%))`
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

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
        <span className="rounded-full bg-black/55 px-3.5 py-2 font-sans text-[12px] text-white/90 backdrop-blur-sm">
          {caption}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="press inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/25 backdrop-blur-sm"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {cam === "denied" && (
          <p className="max-w-[420px] rounded-2xl bg-black/60 px-4 py-2.5 text-center font-sans text-[12px] leading-[1.5] text-white/90 backdrop-blur-sm">
            Camera access was blocked. Allow camera for this site, or use the drag/resize controls over the plain
            backdrop.
          </p>
        )}
        {cam === "unsupported" && (
          <p className="max-w-[420px] rounded-2xl bg-black/60 px-4 py-2.5 text-center font-sans text-[12px] leading-[1.5] text-white/90 backdrop-blur-sm">
            Open this on your phone (Safari / Chrome) to see it on your real wall. You can still position it here.
          </p>
        )}
        {!locked && (
          <p className="rounded-full bg-black/45 px-3.5 py-1.5 font-sans text-[11px] text-white/80 backdrop-blur-sm">
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
            onClick={() => setLocked((l) => !l)}
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
        <p className="font-sans text-[11px] text-white/55">{frameLabel} · your camera stays on your device</p>
      </div>
    </div>,
    document.body,
  );
};

export default WallCamera;
