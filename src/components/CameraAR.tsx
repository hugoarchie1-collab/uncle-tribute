// =============================================================================
// CameraAR — the Virtual Exhibition. JUST the camera: point your phone at your
// wall and see the painting in your own room. Drag to place it; a strip flips
// through every work. No frame options, no save button, no model-viewer — just
// the camera and the art. No camera → a clean "open it on your phone" + QR.
//
// PREMIUM polish (competitor-grade): the placed work is moved/resized by writing
// a GPU translate3d straight to the DOM node inside ONE rAF per frame (never a
// React re-render per pointermove — that is the "cheap drag" tell); a layered
// ambient+key+contact shadow + a print edge so it reads as HUNG on the wall, not
// a floating sticker; an HD camera feed gated on the first real frame; a snap +
// scroll-into-view + lifted work strip; safe-area + rotate handling; a tiny
// haptic on place/switch. Camera is ALWAYS released on close/unmount/tab-hide.
// =============================================================================

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Colourway, Painting } from "../data/paintings";
import { paintingImageAlt } from "../data/paintings";
import { asset, webp } from "../lib/asset";
import { cn } from "../lib/cn";
import { EASE_SIGNATURE, EYEBROW_MUTED, EYEBROW_TIGHT } from "./ui/tokens";

export interface CameraAROption {
  painting: Painting;
  colourway: Colourway;
}

export interface CameraARProps {
  open: boolean;
  onClose: () => void;
  /** Every work that can be placed — the strip lets the visitor flip through. */
  options: CameraAROption[];
  startIndex?: number;
}

type Phase = "requesting" | "live" | "error";
type Reason = "denied" | "nocamera" | "inuse" | "insecure" | "unknown";

interface Placement {
  x: number; // centre, CSS px on the stage
  y: number;
  w: number; // on-screen width, CSS px (height follows the image aspect)
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// Ambient + key + contact — never one flat blur; reads as hung on a surface.
const PRINT_SHADOW =
  "0 1px 2px rgba(0,0,0,0.38), 0 8px 16px rgba(0,0,0,0.28), 0 30px 60px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10)";

const vibrate = (ms: number) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported (iOS) — harmless */
  }
};

const reasonFromError = (err: unknown): Reason => {
  const name =
    typeof err === "object" && err !== null && "name" in err
      ? String((err as { name: unknown }).name)
      : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "denied";
    case "NotFoundError":
    case "OverconstrainedError":
    case "DevicesNotFoundError":
      return "nocamera";
    case "NotReadableError":
    case "AbortError":
    case "TrackStartError":
      return "inuse";
    default:
      return "unknown";
  }
};

const cameraSupported = (): boolean =>
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getUserMedia === "function" &&
  (window.isSecureContext ?? location.protocol === "https:");

const EXPLAINER_HELP: Record<Reason, string> = {
  denied:
    "Camera access was blocked. To turn it on, tap the camera or lock icon in your browser's address bar, allow the camera, and try again.",
  nocamera:
    "We couldn't find a camera on this device. Open this page on a phone or tablet with a rear camera to see the work on your wall.",
  inuse: "Your camera is being used by another app. Close it, then try again.",
  insecure:
    "Live camera placement needs a secure connection. Open this page over https on a phone or tablet to begin.",
  unknown:
    "We couldn't open the camera just now. It works best on a phone — try again, or open this page on your phone.",
};

const CameraGlyph = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
    <path
      d="M1.75 5.5A1.25 1.25 0 0 1 3 4.25h1.4l.8-1.3h5.6l.8 1.3H13A1.25 1.25 0 0 1 14.25 5.5v6A1.25 1.25 0 0 1 13 12.75H3A1.25 1.25 0 0 1 1.75 11.5v-6Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <circle cx="8" cy="8.4" r="2.4" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const CameraAR = ({ open, onClose, options, startIndex = 0 }: CameraARProps) => {
  const reduceMotion = useReducedMotion();
  const titleId = useId();

  const overlayRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pieceRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("requesting");
  const [reason, setReason] = useState<Reason>("unknown");
  const [index, setIndex] = useState(clamp(startIndex, 0, Math.max(0, options.length - 1)));
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [hintVisible, setHintVisible] = useState(true);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const current = options[index] ?? options[0];
  const alt = current ? paintingImageAlt(current.painting.title, current.colourway.name) : "";

  const aspectRef = useRef(1);
  const [aspect, setAspect] = useState(1);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /* ── camera teardown — the ONE place tracks are stopped ─────────────────── */
  const stopAllTracks = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const requestCamera = useCallback(async () => {
    stopAllTracks();
    if (!cameraSupported()) {
      setReason("insecure");
      setPhase("error");
      return;
    }
    setPhase("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // `ideal` (never exact) so it gracefully gives the best the device has —
        // iOS caps ~720p, many Android up to 1080p; a sharp feed sells the room.
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (!v) {
        setPhase("live");
        return;
      }
      v.srcObject = stream;
      // Flip to "live" on the FIRST real frame (not the instant getUserMedia
      // resolves) so the stage is never black during the ~200–400ms warm-up.
      const goLive = () => {
        if (streamRef.current === stream) setPhase("live");
      };
      v.addEventListener("playing", goLive, { once: true });
      v.addEventListener("loadeddata", goLive, { once: true });
      void v.play().catch(() => undefined);
      window.setTimeout(goLive, 1400); // safety net if neither event fires
    } catch (err) {
      setReason(reasonFromError(err));
      setPhase("error");
      stopAllTracks();
    }
  }, [stopAllTracks]);

  /* ── lifecycle: open → camera + scroll-lock + focus-trap; cleanup stops the
   *    camera on close AND unmount ─────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlacement(null);
    setHintVisible(true);
    void requestCamera();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = overlayRef.current;
      if (!panel) return;
      const f = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"]), [role="button"]',
      );
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
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

    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    const focusTimer = window.setTimeout(() => closeBtnRef.current?.focus(), 80);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overscrollBehavior = prevOverscroll;
      stopAllTracks();
      if (opener && document.contains(opener)) opener.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Release the camera when the tab is hidden; re-request on return.
  useEffect(() => {
    if (!open || phase !== "live") return;
    const onVis = () => {
      if (document.visibilityState === "hidden") stopAllTracks();
      else void requestCamera();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [open, phase, requestCamera, stopAllTracks]);

  // QR of the current page, for the no-camera explainer (open it on a phone).
  useEffect(() => {
    if (phase !== "error" || qrUrl) return;
    let cancelled = false;
    void (async () => {
      try {
        const href = typeof window !== "undefined" ? window.location.href : "";
        if (!href) return;
        const { default: QRCode } = await import("qrcode");
        const dataUrl = await QRCode.toDataURL(href, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 240,
          color: { dark: "#1a1612", light: "#f5efe3" },
        });
        if (!cancelled) setQrUrl(dataUrl);
      } catch {
        /* QR is a bonus. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, qrUrl]);

  // Centre the work once the camera is live (one-time, guarded).
  useEffect(() => {
    if (phase !== "live" || placement !== null) return;
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const w = Math.round(Math.min(r.width, r.height) * 0.4);
    setPlacement({ x: r.width / 2, y: r.height / 2, w });
  }, [phase, placement]);

  // Re-clamp the placement into the new bounds on rotate / resize (keep position).
  useEffect(() => {
    if (!open) return;
    const onResize = () => setPlacement((p) => (p ? clampPlacement(p) : p));
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-fade the coaching hint.
  useEffect(() => {
    if (phase !== "live" || !hintVisible) return;
    const t = window.setTimeout(() => setHintVisible(false), 4200);
    return () => window.clearTimeout(t);
  }, [phase, hintVisible]);

  // Keep the selected thumbnail in view as you flip through.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const el = strip.querySelector<HTMLElement>(`[data-thumb="${index}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }, [index, reduceMotion]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      const a = img.naturalWidth / img.naturalHeight;
      aspectRef.current = a;
      setAspect(a);
    }
  };

  /* ── gestures — drag + pinch + corner handle, written STRAIGHT to the DOM via
   *    one rAF per frame (no React re-render per move = buttery, GPU-composited).
   *    React state is re-synced only on pointer-up. ───────────────────────────*/
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const pinchRef = useRef<{ d0: number; w0: number } | null>(null);
  const handleRef = useRef<{ id: number; sx: number; w0: number } | null>(null);
  const workRef = useRef<Placement | null>(null);
  const rafRef = useRef(0);

  const stageSize = () => {
    const r = stageRef.current?.getBoundingClientRect();
    return { w: r?.width ?? 1, h: r?.height ?? 1 };
  };
  const clampPlacement = (p: Placement): Placement => {
    const { w: sw, h: sh } = stageSize();
    return { w: clamp(p.w, 90, sw * 1.5), x: clamp(p.x, 0, sw), y: clamp(p.y, 0, sh) };
  };

  // Write the working placement directly to the node (translate3d = GPU only).
  const flush = () => {
    rafRef.current = 0;
    const p = workRef.current;
    const el = pieceRef.current;
    if (!p || !el) return;
    const h = p.w / (aspectRef.current || 1);
    el.style.width = `${p.w}px`;
    el.style.height = `${h}px`;
    el.style.transform = `translate3d(${p.x - p.w / 2}px, ${p.y - h / 2}px, 0)`;
  };
  const schedule = () => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(flush);
  };
  const beginGesture = () => {
    if (!workRef.current && placement) workRef.current = { ...placement };
    if (pieceRef.current) pieceRef.current.style.willChange = "transform, width, height";
  };
  const endGesture = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (pieceRef.current) pieceRef.current.style.willChange = "";
    if (workRef.current) {
      setPlacement(clampPlacement(workRef.current));
      workRef.current = null;
    }
  };

  const onStageDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!placement) return;
    if ((e.target as HTMLElement).closest("[data-chrome]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setHintVisible(false);
    beginGesture();
    const base = workRef.current ?? placement;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchRef.current = { d0: Math.hypot(a.x - b.x, a.y - b.y), w0: base.w };
      dragRef.current = null;
    } else if (pointers.current.size === 1) {
      dragRef.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: base.x, oy: base.y };
    }
  };
  const onStageMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const tracked = pointers.current.get(e.pointerId);
    if (!tracked || !workRef.current) return;
    tracked.x = e.clientX;
    tracked.y = e.clientY;
    if (pinchRef.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      workRef.current = clampPlacement({
        ...workRef.current,
        w: pinchRef.current.w0 * (d / Math.max(pinchRef.current.d0, 1)),
      });
      schedule();
      return;
    }
    const drag = dragRef.current;
    if (drag && drag.id === e.pointerId && pointers.current.size === 1) {
      workRef.current = clampPlacement({
        ...workRef.current,
        x: drag.ox + (e.clientX - drag.sx),
        y: drag.oy + (e.clientY - drag.sy),
      });
      schedule();
    }
  };
  const onStageUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (dragRef.current?.id === e.pointerId) dragRef.current = null;
    if (pointers.current.size < 2) pinchRef.current = null;
    if (pointers.current.size === 0) {
      vibrate(8);
      endGesture();
    }
  };

  const onHandleDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!placement) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    beginGesture();
    handleRef.current = { id: e.pointerId, sx: e.clientX, w0: (workRef.current ?? placement).w };
    setHintVisible(false);
  };
  const onHandleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const h = handleRef.current;
    if (!h || h.id !== e.pointerId || !workRef.current) return;
    e.stopPropagation();
    workRef.current = clampPlacement({ ...workRef.current, w: h.w0 + (e.clientX - h.sx) * 2 });
    schedule();
  };
  const onHandleUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (handleRef.current?.id === e.pointerId) {
      handleRef.current = null;
      vibrate(8);
      endGesture();
    }
  };

  const onPieceKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!placement) return;
    const s = e.shiftKey ? 24 : 8;
    let ok = true;
    if (e.key === "ArrowLeft") setPlacement((p) => (p ? clampPlacement({ ...p, x: p.x - s }) : p));
    else if (e.key === "ArrowRight") setPlacement((p) => (p ? clampPlacement({ ...p, x: p.x + s }) : p));
    else if (e.key === "ArrowUp") setPlacement((p) => (p ? clampPlacement({ ...p, y: p.y - s }) : p));
    else if (e.key === "ArrowDown") setPlacement((p) => (p ? clampPlacement({ ...p, y: p.y + s }) : p));
    else if (e.key === "+" || e.key === "=") setPlacement((p) => (p ? clampPlacement({ ...p, w: p.w + s * 2 }) : p));
    else if (e.key === "-" || e.key === "_") setPlacement((p) => (p ? clampPlacement({ ...p, w: p.w - s * 2 }) : p));
    else ok = false;
    if (ok) {
      e.preventDefault();
      setHintVisible(false);
    }
  };

  const pickWork = (i: number) => {
    if (i === index) return;
    setIndex(i);
    vibrate(8);
  };

  if (typeof document === "undefined" || !current) return null;

  const safeTop = "max(1rem, env(safe-area-inset-top))";
  const w = placement?.w ?? 0;
  const h = w / (aspect || 1);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          key="camera-ar"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.18 : 0.3, ease: EASE_SIGNATURE }}
          className="fixed inset-0 z-[200] overflow-hidden select-none"
          style={{ backgroundColor: "#0a0908", overscrollBehavior: "none" }}
        >
          {/* LIVE STAGE — the camera + the placed work */}
          <div
            ref={stageRef}
            className="absolute inset-0 touch-none"
            onPointerDown={onStageDown}
            onPointerMove={onStageMove}
            onPointerUp={onStageUp}
            onPointerCancel={onStageUp}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
                phase === "live" ? "opacity-100" : "opacity-0",
              )}
            />

            {phase === "live" && placement && (
              <div
                ref={pieceRef}
                role="button"
                tabIndex={0}
                aria-label={`${current.painting.title} — drag to place it on your wall, arrow keys to nudge`}
                onKeyDown={onPieceKey}
                className="absolute left-0 top-0 touch-none outline-none focus-visible:ring-2 focus-visible:ring-accent"
                style={{
                  width: w,
                  height: h,
                  transform: `translate3d(${placement.x - w / 2}px, ${placement.y - h / 2}px, 0)`,
                  cursor: "grab",
                }}
              >
                <motion.div
                  key={current.painting.id}
                  initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.965 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: reduceMotion ? 0 : 0.3, ease: EASE_SIGNATURE }}
                  className="h-full w-full"
                >
                  <picture>
                    <source srcSet={asset(webp(current.colourway.image))} type="image/webp" />
                    <img
                      src={asset(current.colourway.image)}
                      alt={alt}
                      onLoad={onImageLoad}
                      draggable={false}
                      className="block h-full w-full select-none object-cover ring-1 ring-black/25"
                      style={{ pointerEvents: "none", boxShadow: PRINT_SHADOW }}
                    />
                  </picture>
                </motion.div>

                {/* corner resize handle */}
                <button
                  type="button"
                  data-chrome
                  aria-label="Drag to resize"
                  onPointerDown={onHandleDown}
                  onPointerMove={onHandleMove}
                  onPointerUp={onHandleUp}
                  onPointerCancel={onHandleUp}
                  className="absolute -bottom-3 -right-3 grid h-9 w-9 cursor-nwse-resize place-items-center rounded-full bg-[#0a0908]/80 text-ink ring-1 ring-line outline-none touch-none before:absolute before:-inset-2.5 before:content-[''] focus-visible:ring-accent"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 11h8M11 11V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M5 11 11 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* REQUESTING */}
          {phase === "requesting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
              <span
                aria-hidden="true"
                className={cn("h-9 w-9 rounded-full border-2 border-line border-t-accent", reduceMotion ? "" : "animate-spin")}
              />
              <p className={cn(EYEBROW_MUTED, "m-0")}>Opening camera…</p>
              <p className="m-0 max-w-[320px] font-sans text-[13.5px] leading-[1.6] text-ink/55">
                Allow camera access when your browser asks, then point it at your wall.
              </p>
            </div>
          )}

          {/* ERROR / NO-CAMERA — the clean explainer */}
          {phase === "error" && (
            <div className="absolute inset-0 flex items-center justify-center overflow-y-auto px-6 py-20">
              <div className="w-full max-w-[520px] text-center">
                <p className={cn(EYEBROW_MUTED, "m-0 mb-5")}>The Virtual Exhibition</p>
                <h2
                  id={titleId}
                  className="m-0 font-display text-ink"
                  style={{
                    fontVariationSettings: '"opsz" 120, "wght" 560',
                    fontSize: "clamp(30px, 5.4vw, 56px)",
                    lineHeight: 1.04,
                    letterSpacing: "-0.018em",
                  }}
                >
                  See it on your wall — in augmented reality.
                </h2>
                <p className="mx-auto mt-6 max-w-[440px] font-sans text-[clamp(15px,1.1vw,17px)] leading-[1.7] text-ink-muted">
                  Point your camera at a wall and place any of Stephen's works where you'd hang
                  it — see it in your own room at a glance.
                </p>
                <p className="mx-auto mt-4 max-w-[440px] font-sans text-[14px] leading-[1.7] text-ink/55">
                  {EXPLAINER_HELP[reason]}
                </p>

                <div className="mt-9 flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void requestCamera()}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-ink px-7 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-bg outline-none transition-colors duration-300 hover:bg-accent hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <CameraGlyph />
                    {reason === "denied" ? "Try again" : "Enable camera"}
                  </button>
                </div>

                {qrUrl && (
                  <div className="mt-10 flex flex-col items-center gap-3">
                    <div className="rounded-2xl bg-cream p-3 ring-1 ring-cream-ink/10">
                      <img src={qrUrl} alt="QR code — scan to open this on your phone" width={132} height={132} className="block" />
                    </div>
                    <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-ink/55">
                      Scan to open this on your phone
                    </p>
                  </div>
                )}

                <p className={cn(EYEBROW_TIGHT, "mx-auto mt-10 max-w-[400px] tracking-[0.18em] leading-[1.8]")}>
                  You'll need a device with a camera — it works best on your phone.
                </p>
              </div>
            </div>
          )}

          {/* COACHING hint (live) */}
          {phase === "live" && (
            <AnimatePresence>
              {hintVisible && (
                <motion.div
                  key="hint"
                  data-chrome
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                  transition={{ duration: reduceMotion ? 0.18 : 0.4, ease: EASE_SIGNATURE }}
                  className="pointer-events-none absolute left-1/2 top-[16%] -translate-x-1/2 px-4"
                >
                  <p className="m-0 rounded-full bg-[#0a0908]/75 px-5 py-2.5 text-center font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-ink ring-1 ring-line">
                    Drag to place it · pinch to resize
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* TITLE caption (top-left, safe-area aware) */}
          {phase !== "error" && (
            <p
              id={titleId}
              data-chrome
              style={{ top: safeTop }}
              className={cn(
                EYEBROW_MUTED,
                "pointer-events-none absolute left-4 m-0 max-w-[58vw] truncate pt-1 md:left-6",
              )}
            >
              <span className="text-ink">{current.painting.title}</span>
            </p>
          )}

          {/* CLOSE (X) */}
          <button
            ref={closeBtnRef}
            type="button"
            data-chrome
            onClick={onClose}
            aria-label="Close the virtual exhibition"
            style={{ top: safeTop }}
            className="absolute right-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0a0908]/70 text-ink-muted ring-1 ring-line outline-none transition-colors duration-300 hover:text-ink focus-visible:text-accent focus-visible:ring-accent md:right-6"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M3 3 15 15M15 3 3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* WORK STRIP (live only) — flip through every work, place it on your wall */}
          {phase === "live" && options.length > 1 && (
            <div
              ref={stripRef}
              data-chrome
              role="listbox"
              aria-label="Choose a work to place on your wall"
              className="absolute inset-x-0 bottom-0 flex snap-x snap-mandatory items-end gap-2.5 overflow-x-auto px-4 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ background: "linear-gradient(0deg, rgba(8,7,6,0.88) 0%, rgba(8,7,6,0) 100%)" }}
            >
              {options.map((o, i) => {
                const sel = i === index;
                return (
                  <button
                    key={o.painting.id}
                    type="button"
                    role="option"
                    data-thumb={i}
                    aria-selected={sel}
                    aria-label={o.painting.title}
                    onClick={() => pickWork(i)}
                    className={cn(
                      "relative h-16 w-16 shrink-0 origin-bottom snap-center overflow-hidden rounded-md outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-accent",
                      sel
                        ? "scale-[1.08] ring-2 ring-accent"
                        : "opacity-70 ring-1 ring-white/25 hover:opacity-100",
                    )}
                  >
                    <picture>
                      <source srcSet={asset(webp(o.colourway.image))} type="image/webp" />
                      <img src={asset(o.colourway.image)} alt="" draggable={false} className="h-full w-full object-cover" />
                    </picture>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
