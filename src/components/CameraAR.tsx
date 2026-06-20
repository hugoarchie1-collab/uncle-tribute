// =============================================================================
// CameraAR — the in-page, Pokémon-Go-style "See it in your room" camera AR.
// -----------------------------------------------------------------------------
// The OWNER'S FLAGSHIP "Virtual Gallery" moment, kept DEAD SIMPLE on purpose
// (the previous <model-viewer> path "overcomplicated it"):
//
//   Tap "See it in your room" → the browser's own camera-permission prompt →
//   the live REAR camera opens full-screen → the painting floats in the room
//   in front of the camera → press-and-DRAG to place it on your wall →
//   pinch / a corner handle to resize → "Save photo" composites the live frame
//   + the placed framed painting and downloads / shares it.
//
// If there is NO camera (desktop), permission is DENIED, the context is
// insecure, or anything else fails, we show a CLEAN, dignified explainer
// INSIDE the overlay — this is the experience desktop visitors get, so it is
// made genuinely beautiful (Fraunces headline, estate voice, a "Try again"
// button, a "best on your phone" hint, an optional "use a photo of your room"
// route back to the existing RoomVisualizer).
//
// HOUSE CONVENTIONS (mirror CloserLook / RoomVisualizerModal):
//   - fixed inset-0, z-[200]; role="dialog" aria-modal; aria-label
//   - Escape / X close; Tab focus-trap; focus restored to the opener on close;
//     body scroll locked while open
//   - Framer Motion only; useReducedMotion() short-circuits every animation
//   - palette ONLY for chrome (bg #0a0908 / ink #ede6d6 / ink-muted / line /
//     accent #c97844 sparingly). The frame wood / mat tones are DEPICTED
//     OBJECTS (a picture of a frame, via FramedArtwork) — allowed, not chrome.
//   - all controls ≥44px; keyboard-operable
//
// ⚠️ CRITICAL — NEVER LEAK THE CAMERA. Every MediaStream track is stopped on
// close AND on unmount (a stopAllTracks() helper called from the lifecycle
// effect cleanup AND every close path), so the camera light never lingers.
// =============================================================================

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Colourway, Painting } from "../data/paintings";
import { paintingImageAlt } from "../data/paintings";
import { FRAME_SPECS, type FrameFinish } from "../lib/trueScale";
import { asset, webp } from "../lib/asset";
import { cn } from "../lib/cn";
import { EASE_SIGNATURE, EYEBROW_MUTED, EYEBROW_TIGHT } from "./ui/tokens";

export interface CameraARProps {
  open: boolean;
  onClose: () => void;
  painting: Painting;
  colourway: Colourway;
}

/** The overlay's lifecycle phase. */
type Phase = "requesting" | "live" | "error";

/** Why getUserMedia failed — drives the explainer's help copy. */
type Reason =
  | "denied" // NotAllowedError / SecurityError — user blocked / browser policy
  | "nocamera" // NotFoundError / OverconstrainedError — no usable camera
  | "inuse" // NotReadableError / AbortError — camera busy / hardware fault
  | "insecure" // not a secure context, or no mediaDevices API at all
  | "unknown";

/** A placed painting's transform on the live camera stage. */
interface Placement {
  /** Centre point in CSS px within the stage. */
  x: number;
  y: number;
  /** The framed painting's on-screen WIDTH in CSS px (height follows aspect). */
  w: number;
}

const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

/** The three frame finishes offered in the overlay (Unframed first). */
const FINISHES: FrameFinish[] = ["unframed", "oak", "black-oak"];

/* Depicted-object frame tones — a picture of a frame, NOT UI chrome (the same
 * tones FramedArtwork paints with). Used by both the DOM overlay and the
 * canvas compositor so the saved photo matches what was on screen. */
const FRAME_TONES: Record<
  Exclude<FrameFinish, "unframed">,
  { highlight: string; mid: string; shadow: string }
> = {
  oak: { highlight: "#d8bd86", mid: "#b8915a", shadow: "#8a6a3c" },
  "black-oak": { highlight: "#37322b", mid: "#211d1a", shadow: "#100c0a" },
};
const MAT_FACE = "#efe9dd";

/** Map a DOMException (or anything) to a Reason for the explainer copy. */
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

/** True only in a secure context with a usable getUserMedia. */
const cameraSupported = (): boolean =>
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getUserMedia === "function" &&
  (window.isSecureContext ?? location.protocol === "https:");

export const CameraAR = ({
  open,
  onClose,
  painting,
  colourway,
}: CameraARProps) => {
  const reduceMotion = useReducedMotion();
  const titleId = useId();

  const overlayRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("requesting");
  const [reason, setReason] = useState<Reason>("unknown");
  const [finish, setFinish] = useState<FrameFinish>("unframed");
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [hintVisible, setHintVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  // A QR of THIS page, shown on the no-camera explainer so a desktop visitor can
  // scan it and open the exact painting on their phone to place it in their room.
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const alt = paintingImageAlt(painting.title, colourway.name);

  // The painting's natural pixel aspect, learned once the source image decodes,
  // so the framed overlay AND the saved composite use the true ratio (never a
  // forced square). Defaults square until known.
  const aspectRef = useRef(1);
  const [aspect, setAspect] = useState(1);

  // Latest onClose without re-running the camera lifecycle effect (the
  // CloserLook pattern — parents recreate the arrow every render).
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
    const v = videoRef.current;
    if (v) {
      v.srcObject = null;
    }
  }, []);

  /* ── request the REAR camera ────────────────────────────────────────────── */
  const requestCamera = useCallback(async () => {
    // Tear any prior stream down first (e.g. a retry after an error).
    stopAllTracks();

    if (!cameraSupported()) {
      setReason("insecure");
      setPhase("error");
      return;
    }

    setPhase("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        // playsInline + muted are set on the element; play() may still reject
        // on some browsers if not user-gesture-tied — the stream is live
        // regardless, so swallow the rejection.
        void v.play().catch(() => undefined);
      }
      setPhase("live");
    } catch (err) {
      setReason(reasonFromError(err));
      setPhase("error");
      stopAllTracks();
    }
  }, [stopAllTracks]);

  /* ── lifecycle: open → request camera + locks + focus-trap; cleanup stops
   *    EVERYTHING (camera, scroll-lock, focus) — on close AND on unmount ───── */
  useEffect(() => {
    if (!open) return;

    // Reset the overlay to a clean state on each open + request the camera.
    // This is the legitimate "sync React state to the `open` prop on mount"
    // case (the CloserLook setTouched(false) / RoomVisualizer centring pattern)
    // — it runs once per open, not in a render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlacement(null);
    setHintVisible(true);
    setFinish("unframed");
    void requestCamera();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = overlayRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"]), [role="button"]',
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
      // ⚠️ stop the camera on EVERY unmount/close — no lingering light.
      stopAllTracks();
      if (opener && document.contains(opener)) opener.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Belt-and-braces: if the tab is hidden while the camera is live, release it
  // (some browsers keep the light on otherwise). It is re-requested on return.
  useEffect(() => {
    if (!open || phase !== "live") return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stopAllTracks();
      else void requestCamera();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [open, phase, requestCamera, stopAllTracks]);

  /* ── place the painting at a sensible centre once the stage is live ─────── */
  useEffect(() => {
    if (phase !== "live") return;
    if (placement !== null) return;
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    // ~42% of the smaller viewport dimension — obvious, hung-piece scale.
    // Syncing initial placement to the measured stage rect (a one-time centring
    // guarded by `placement !== null` above — never a render loop).
    const w = Math.round(Math.min(r.width, r.height) * 0.42);
    setPlacement({ x: r.width / 2, y: r.height / 2, w });
  }, [phase, placement]);

  // Generate a QR of the current page once the explainer shows, so a desktop
  // visitor can scan it and open this exact painting on their phone. Lazy-import
  // so qrcode never weighs on the live-camera path.
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
        /* QR is a bonus — never block the explainer on it. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, qrUrl]);

  // Auto-fade the coaching hint a few seconds after the camera goes live.
  useEffect(() => {
    if (phase !== "live" || !hintVisible) return;
    const t = window.setTimeout(() => setHintVisible(false), 4200);
    return () => window.clearTimeout(t);
  }, [phase, hintVisible]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      const a = img.naturalWidth / img.naturalHeight;
      aspectRef.current = a;
      setAspect(a);
    }
  };

  /* ── gesture state: one-finger drag, pinch-resize, corner-handle resize ─── */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const pinchRef = useRef<{ d0: number; w0: number } | null>(null);
  const handleRef = useRef<{ pointerId: number; startX: number; w0: number } | null>(
    null,
  );

  const stageSize = () => {
    const r = stageRef.current?.getBoundingClientRect();
    return { w: r?.width ?? 1, h: r?.height ?? 1 };
  };

  /** Clamp a placement so the piece stays mostly on-stage (its centre never
   *  leaves the stage, and a minimum sliver always shows). */
  const clampPlacement = (p: Placement): Placement => {
    const { w: sw, h: sh } = stageSize();
    const minW = 80;
    const maxW = sw * 1.4;
    const w = clamp(p.w, minW, maxW);
    return {
      w,
      x: clamp(p.x, 0, sw),
      y: clamp(p.y, 0, sh),
    };
  };

  const onStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!placement) return;
    // The chrome buttons handle their own taps — never start a gesture on them.
    if ((e.target as HTMLElement).closest("[data-chrome]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setHintVisible(false);

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchRef.current = {
        d0: Math.hypot(a.x - b.x, a.y - b.y),
        w0: placement.w,
      };
      dragRef.current = null;
    } else if (pointers.current.size === 1) {
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: placement.x,
        originY: placement.y,
      };
    }
  };

  const onStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const tracked = pointers.current.get(e.pointerId);
    if (!tracked) return;
    tracked.x = e.clientX;
    tracked.y = e.clientY;

    if (pinchRef.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const next = pinchRef.current.w0 * (d / Math.max(pinchRef.current.d0, 1));
      setPlacement((p) => (p ? clampPlacement({ ...p, w: next }) : p));
      return;
    }

    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId && pointers.current.size === 1) {
      const nx = drag.originX + (e.clientX - drag.startX);
      const ny = drag.originY + (e.clientY - drag.startY);
      setPlacement((p) => (p ? clampPlacement({ ...p, x: nx, y: ny }) : p));
    }
  };

  const onStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
    if (pointers.current.size < 2) pinchRef.current = null;
  };

  // Corner resize handle (one-finger / desktop) — drag right/down to grow.
  const onHandleDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!placement) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    handleRef.current = { pointerId: e.pointerId, startX: e.clientX, w0: placement.w };
    setHintVisible(false);
  };
  const onHandleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const h = handleRef.current;
    if (!h || h.pointerId !== e.pointerId) return;
    e.stopPropagation();
    const next = h.w0 + (e.clientX - h.startX) * 2;
    setPlacement((p) => (p ? clampPlacement({ ...p, w: next }) : p));
  };
  const onHandleUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (handleRef.current?.pointerId === e.pointerId) handleRef.current = null;
  };

  // Keyboard placement — the piece is a focusable role="button"; arrows nudge,
  // +/- resize. Mirrors RoomVisualizer's nudge contract.
  const onPieceKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!placement) return;
    const step = e.shiftKey ? 24 : 8;
    let handled = true;
    if (e.key === "ArrowLeft") setPlacement((p) => (p ? clampPlacement({ ...p, x: p.x - step }) : p));
    else if (e.key === "ArrowRight") setPlacement((p) => (p ? clampPlacement({ ...p, x: p.x + step }) : p));
    else if (e.key === "ArrowUp") setPlacement((p) => (p ? clampPlacement({ ...p, y: p.y - step }) : p));
    else if (e.key === "ArrowDown") setPlacement((p) => (p ? clampPlacement({ ...p, y: p.y + step }) : p));
    else if (e.key === "+" || e.key === "=") setPlacement((p) => (p ? clampPlacement({ ...p, w: p.w + step * 2 }) : p));
    else if (e.key === "-" || e.key === "_") setPlacement((p) => (p ? clampPlacement({ ...p, w: p.w - step * 2 }) : p));
    else handled = false;
    if (handled) {
      e.preventDefault();
      setHintVisible(false);
    }
  };

  /* ── CAPTURE — composite the live video frame + the placed framed painting
   *    onto a canvas, then download (and share on mobile via the Web Share
   *    API). Same-origin assets keep the canvas untainted. ──────────────────── */
  const capturePhoto = useCallback(async () => {
    const v = videoRef.current;
    const stage = stageRef.current;
    if (!v || !stage || !placement || saving) return;
    const vw = v.videoWidth;
    const vh = v.videoHeight;
    if (vw === 0 || vh === 0) return;

    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setSaving(false);
        return;
      }

      // Draw the camera frame (object-fit: cover) — replicate the on-screen
      // crop so the saved photo matches what the user framed.
      const stageRect = stage.getBoundingClientRect();
      const scale = Math.max(stageRect.width / vw, stageRect.height / vh);
      const drawW = vw * scale;
      const drawH = vh * scale;
      const offX = (stageRect.width - drawW) / 2;
      const offY = (stageRect.height - drawH) / 2;
      // Map: stage-px → video-px. A point (sx, sy) on the stage corresponds to
      // ((sx - offX) / scale, (sy - offY) / scale) in the video. So one stage
      // px === `scale` video px; multiply placement sizes by that.
      ctx.drawImage(v, 0, 0, vw, vh);

      // Load the painting source (same-origin → untainted canvas).
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.src = asset(colourway.image);
      await img.decode().catch(() => undefined);

      // Geometry in VIDEO pixels. `scale` is stage-px PER video-px (object-cover
      // scales the video up to cover the stage), so stage→video is DIVIDE by
      // scale: a stage point (sx,sy) is video ((sx-offX)/scale, (sy-offY)/scale),
      // and a stage length L is L/scale video px.
      const a = aspectRef.current || 1;
      const frameW = placement.w / scale; // framed outer width in video px
      const frameH = placement.w / a / scale; // framed outer height in video px
      const cx = (placement.x - offX) / scale; // centre, video px
      const cy = (placement.y - offY) / scale;
      const left = cx - frameW / 2;
      const top = cy - frameH / 2;

      drawFramedPiece(ctx, img, finish, left, top, frameW, frameH);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!blob) {
        setSaving(false);
        return;
      }
      const fileName = `${painting.id}-in-your-room.jpg`;
      const file = new File([blob], fileName, { type: "image/jpeg" });

      // Prefer the Web Share API on mobile (save to camera roll / share sheet).
      const navAny = navigator as Navigator & {
        canShare?: (data: { files?: File[] }) => boolean;
      };
      if (
        typeof navigator.share === "function" &&
        navAny.canShare?.({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: painting.title,
            text: `${painting.title} — ${colourway.name}, in my room`,
          });
          setSaving(false);
          return;
        } catch {
          // User cancelled the share sheet, or it failed — fall through to a
          // plain download so the photo is never lost.
        }
      }

      const url = URL.createObjectURL(blob);
      const a2 = document.createElement("a");
      a2.href = url;
      a2.download = fileName;
      document.body.appendChild(a2);
      a2.click();
      a2.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      setSaving(false);
    } catch {
      setSaving(false);
    }
  }, [colourway.image, colourway.name, finish, painting.id, painting.title, placement, saving]);

  /* ── the placed-painting DOM overlay (mirrors FramedArtwork's box model in a
   *    simplified, on-screen form) ─────────────────────────────────────────── */
  const renderFramedOverlay = () => {
    if (!placement) return null;
    const w = placement.w;
    const h = placement.w / (aspect || 1);
    const isFramed = finish !== "unframed";
    const unit = w / 42; // ~1 unit per cm of a 42cm-wide print → cm-scaled trims
    const frameW = isFramed ? FRAME_SPECS[finish].frameCm * unit : 0;
    const matW = isFramed ? FRAME_SPECS[finish].matCm * unit : 0;
    const tone = isFramed ? FRAME_TONES[finish as Exclude<FrameFinish, "unframed">] : null;

    const imgEl = (
      <picture>
        <source srcSet={asset(webp(colourway.image))} type="image/webp" />
        <img
          src={asset(colourway.image)}
          alt={alt}
          onLoad={onImageLoad}
          draggable={false}
          className="block h-full w-full select-none object-cover"
          style={{ pointerEvents: "none" }}
        />
      </picture>
    );

    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`${painting.title} — drag to place it on your wall, arrow keys to nudge, plus or minus to resize`}
        onKeyDown={onPieceKeyDown}
        className="absolute touch-none outline-none focus-visible:ring-2 focus-visible:ring-accent"
        style={{
          left: placement.x - w / 2,
          top: placement.y - h / 2,
          width: w,
          height: h,
          cursor: "grab",
          // A soft hung-piece cast shadow so it reads as on the wall, not pasted.
          filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.5))",
        }}
      >
        {isFramed && tone ? (
          <div
            className="relative box-border h-full w-full"
            style={{
              padding: frameW,
              background: `linear-gradient(135deg, ${tone.highlight} 0%, ${tone.mid} 45%, ${tone.shadow} 100%)`,
              boxShadow: `inset ${0.12 * unit}px ${0.12 * unit}px ${0.18 * unit}px rgba(255,255,255,0.18), inset -${0.12 * unit}px -${0.12 * unit}px ${0.2 * unit}px rgba(0,0,0,0.45)`,
            }}
          >
            <div
              className="relative box-border flex h-full w-full items-center justify-center overflow-hidden"
              style={{ padding: matW, background: MAT_FACE }}
            >
              <div className="relative h-full w-full overflow-hidden">{imgEl}</div>
            </div>
          </div>
        ) : (
          <div className="relative h-full w-full overflow-hidden ring-1 ring-white/20">
            {imgEl}
          </div>
        )}

        {/* Corner resize handle — one-finger / desktop. A real ≥44px target via
            an enlarged invisible hit area (before:). */}
        <button
          type="button"
          data-chrome
          aria-label="Drag to resize the artwork"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
          className="absolute -bottom-3 -right-3 grid h-9 w-9 cursor-nwse-resize place-items-center rounded-full bg-[#0a0908]/80 text-ink ring-1 ring-line outline-none touch-none before:absolute before:-inset-2.5 before:content-[''] focus-visible:ring-accent"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M3 11h8M11 11V3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M5 11 11 5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    );
  };

  // Portal to <body> so the full-screen camera takeover escapes the gallery's
  // stacking context and sits ABOVE the nav / consent banner (which would
  // otherwise paint over a z-200 element nested inside a scoped context).
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          key="camera-ar"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          // Appear instantly OPAQUE (no entrance opacity fade) so the full-screen
          // takeover can NEVER read as see-through — even if a frame-throttled
          // device stalls the animation mid-fade; only the exit fades out.
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.18 : 0.3, ease: EASE_SIGNATURE }}
          className="fixed inset-0 z-[200] overflow-hidden select-none"
          style={{ backgroundColor: "#0a0908", overscrollBehavior: "none" }}
        >
          {/* ── LIVE STAGE — the camera + the placed painting ───────────────── */}
          <div
            ref={stageRef}
            className="absolute inset-0 touch-none"
            onPointerDown={onStagePointerDown}
            onPointerMove={onStagePointerMove}
            onPointerUp={onStagePointerUp}
            onPointerCancel={onStagePointerUp}
          >
            {/* The live camera feed — always mounted so the ref is stable; it
                only shows pixels once a stream is attached. */}
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

            {phase === "live" && renderFramedOverlay()}
          </div>

          {/* ── REQUESTING — a dignified "Opening camera…" ──────────────────── */}
          {phase === "requesting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
              <span
                aria-hidden="true"
                className={cn(
                  "h-9 w-9 rounded-full border-2 border-line border-t-accent",
                  reduceMotion ? "" : "animate-spin",
                )}
              />
              <p className={cn(EYEBROW_MUTED, "m-0")}>Opening camera…</p>
              <p className="m-0 max-w-[320px] font-sans text-[13.5px] leading-[1.6] text-ink/55">
                Allow camera access when your browser asks, then point it at your
                wall.
              </p>
            </div>
          )}

          {/* ── ERROR / NO-CAMERA — the clean, dignified explainer ──────────── */}
          {phase === "error" && (
            <div className="absolute inset-0 flex items-center justify-center overflow-y-auto px-6 py-20">
              <div className="w-full max-w-[520px] text-center">
                <p className={cn(EYEBROW_MUTED, "m-0 mb-5")}>The Virtual Gallery</p>
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
                  Point your camera at a wall, place {painting.title} where you'd
                  hang it, and see it in your own room at a glance.
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

                {/* Desktop → phone bridge: scan to open THIS painting on a phone
                    (where the rear camera makes the AR placement work). */}
                {qrUrl && (
                  <div className="mt-10 flex flex-col items-center gap-3">
                    <div className="rounded-2xl bg-cream p-3 ring-1 ring-cream-ink/10">
                      <img
                        src={qrUrl}
                        alt="QR code — scan to open this page on your phone"
                        width={132}
                        height={132}
                        className="block"
                      />
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

          {/* ── COACHING — first-open hint + a quiet persistent control line ── */}
          {phase === "live" && (
            <>
              <AnimatePresence>
                {hintVisible && (
                  <motion.div
                    key="hint"
                    data-chrome
                    initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                    transition={{ duration: reduceMotion ? 0.18 : 0.4, ease: EASE_SIGNATURE }}
                    className="pointer-events-none absolute left-1/2 top-[18%] -translate-x-1/2 px-4"
                  >
                    <p className="m-0 rounded-full bg-[#0a0908]/75 px-5 py-2.5 text-center font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-ink ring-1 ring-line">
                      Drag to place it on your wall · pinch to resize
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Persistent quiet control hint, bottom — always available. */}
              <p
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[5.5rem] left-1/2 m-0 -translate-x-1/2 px-4 text-center font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-ink/55"
              >
                Press &amp; hold to drag · corner to resize
              </p>
            </>
          )}

          {/* ── TITLE caption — top-left, quiet (hidden on the explainer; the
              explainer carries its own h2) ──────────────────────────────────── */}
          {phase !== "error" && (
            <p
              id={titleId}
              data-chrome
              className={cn(
                EYEBROW_MUTED,
                "pointer-events-none absolute left-4 top-5 m-0 max-w-[58vw] truncate md:left-6 md:top-7",
              )}
            >
              <span className="text-ink">{painting.title}</span>
              <span aria-hidden="true" className="mx-2 text-ink/35">·</span>
              {colourway.name}
            </p>
          )}

          {/* ── CLOSE (X) — top-right, mobile-menu register ─────────────────── */}
          <button
            ref={closeBtnRef}
            type="button"
            data-chrome
            onClick={onClose}
            aria-label="Close the virtual gallery"
            className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0a0908]/70 text-ink-muted ring-1 ring-line outline-none transition-colors duration-300 hover:text-ink focus-visible:text-accent focus-visible:ring-accent md:right-6 md:top-6"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M3 3 15 15M15 3 3 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* ── BOTTOM CONTROL BAR (live only) — frame finishes + Save photo ── */}
          {phase === "live" && (
            <div
              data-chrome
              className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
            >
              {/* Frame-finish toggle — reuses FRAME_SPECS labels. */}
              <div
                role="radiogroup"
                aria-label="Frame finish"
                className="inline-flex items-center gap-0.5 rounded-full bg-[#0a0908]/70 p-0.5 ring-1 ring-line"
              >
                {FINISHES.map((f) => {
                  const isSel = f === finish;
                  return (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={isSel}
                      onClick={() => setFinish(f)}
                      className={cn(
                        "inline-flex min-h-[44px] items-center rounded-full px-3.5 font-sans text-[10px] font-bold uppercase tracking-[0.14em] outline-none transition-colors duration-300 focus-visible:ring-1 focus-visible:ring-accent",
                        isSel ? "bg-ink text-bg" : "text-ink-muted hover:text-ink",
                      )}
                    >
                      {FRAME_SPECS[f].label}
                    </button>
                  );
                })}
              </div>

              {/* Save photo — composite + download / share. */}
              <button
                type="button"
                onClick={() => void capturePhoto()}
                disabled={saving || !placement}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-ink px-7 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-bg outline-none transition-colors duration-300 hover:bg-accent hover:text-ink focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-3.5 w-3.5 rounded-full border-2 border-bg/40 border-t-bg",
                        reduceMotion ? "" : "animate-spin",
                      )}
                    />
                    Saving…
                  </>
                ) : (
                  <>
                    <CameraGlyph />
                    Save photo
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

/* =============================================================================
 * CANVAS COMPOSITOR — draw a framed (or unframed) painting onto a 2D context.
 * Mirrors the DOM overlay's simplified box model so the saved photo matches the
 * screen: unframed = print + a faint paper edge; framed = bevelled moulding +
 * cream mat + the print. All trims are cm-scaled off the outer width (42cm ref).
 * ========================================================================== */
function drawFramedPiece(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  finish: FrameFinish,
  left: number,
  top: number,
  outerW: number,
  outerH: number,
): void {
  ctx.save();
  // Soft hung-piece cast shadow (matches the DOM drop-shadow).
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = outerW * 0.06;
  ctx.shadowOffsetY = outerW * 0.03;

  if (finish === "unframed") {
    ctx.drawImage(img, left, top, outerW, outerH);
    ctx.restore();
    // Hairline paper edge.
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = Math.max(1, outerW * 0.004);
    ctx.strokeRect(left, top, outerW, outerH);
    ctx.restore();
    return;
  }

  const unit = outerW / 42;
  const frameW = FRAME_SPECS[finish].frameCm * unit;
  const matW = FRAME_SPECS[finish].matCm * unit;
  const tone = FRAME_TONES[finish as Exclude<FrameFinish, "unframed">];

  // Moulding — a diagonal gradient face (lit top-left → shadowed bottom-right).
  const grad = ctx.createLinearGradient(left, top, left + outerW, top + outerH);
  grad.addColorStop(0, tone.highlight);
  grad.addColorStop(0.45, tone.mid);
  grad.addColorStop(1, tone.shadow);
  ctx.fillStyle = grad;
  ctx.fillRect(left, top, outerW, outerH);
  ctx.restore();

  // Mat (cream board).
  const matX = left + frameW;
  const matY = top + frameW;
  const matInnerW = outerW - frameW * 2;
  const matInnerH = outerH - frameW * 2;
  ctx.save();
  ctx.fillStyle = MAT_FACE;
  ctx.fillRect(matX, matY, matInnerW, matInnerH);

  // The print, inset by the mat border.
  const artX = matX + matW;
  const artY = matY + matW;
  const artW = matInnerW - matW * 2;
  const artH = matInnerH - matW * 2;
  if (artW > 0 && artH > 0) {
    ctx.drawImage(img, artX, artY, artW, artH);
    // A faint inner lip shadow where the mat steps down to the art.
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = Math.max(1, matW * 0.08);
    ctx.strokeRect(artX, artY, artW, artH);
  }
  ctx.restore();
}

/** Help copy per failure reason — estate voice, never blaming the visitor. */
const EXPLAINER_HELP: Record<Reason, string> = {
  denied:
    "Camera access was blocked. To turn it on, tap the camera or lock icon in your browser's address bar, allow the camera, and try again.",
  nocamera:
    "We couldn't find a camera on this device. Open this page on a phone or tablet with a rear camera to place the artwork in your room.",
  inuse:
    "Your camera is being used by another app. Close it, then try again.",
  insecure:
    "Live camera placement needs a secure connection. Open this page over https on a phone or tablet to begin.",
  unknown:
    "We couldn't open the camera just now. It works best on a phone — try again, or open this page on your phone.",
};

/** A quiet inline camera glyph on currentColor — for the primary buttons. */
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
