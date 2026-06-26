// =============================================================================
// LiveWallCamera — the live in-browser "see it on your wall" camera.
// -----------------------------------------------------------------------------
// A full-screen popup that opens the phone's rear camera (getUserMedia) and lays
// a photoreal FRAMED PRINT over the live view of your wall. Every control —
// painting, colourway, size, frame — sits on top of the camera, so you browse
// the WHOLE catalogue on your wall in one camera session, without leaving it.
//
// Deliberately a FLAT framed overlay (not true-3D / not depth-locked) — the
// trade-off for live, in-camera browsing of everything at once. Drag to move,
// pinch to resize. "Save photo" composites the camera frame + the framed print
// to a shareable image (the real wall-mockup tool). Degrades gracefully to a
// "gallery wall" ground when no camera (desktop / denied), so it always
// previews and is testable without a camera.
//
// HTTPS + a user gesture are required for the camera (production is HTTPS; the
// button that opens this popup is the gesture). iOS needs <video playsInline>.
// =============================================================================

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { type Colourway, type Painting } from "../../data/paintings";
import { AR_SIZES } from "../../lib/arAssets";
import { asset, webp } from "../../lib/asset";
import { cn } from "../../lib/cn";
import { EYEBROW } from "../ui/tokens";

// All framing options for the overlay — "unframed" included, because the print
// is sold unframed by default (framing is the add-on). Not bound to the GLB
// frame shells (this is a flat overlay), so we can show the true full range.
type OverlayFrameId = "unframed" | "black-oak" | "natural-oak";
const OVERLAY_FRAMES: { id: OverlayFrameId; label: string; wood: string | null }[] = [
  { id: "unframed", label: "Unframed", wood: null },
  { id: "black-oak", label: "Black oak", wood: "#1c1a17" },
  { id: "natural-oak", label: "Natural oak", wood: "#b8966a" },
];

const MAX_CM = Math.max(...AR_SIZES.map((s) => s.cm));
// A0 (the largest size) fills this fraction of the viewport width by default;
// smaller sizes scale down proportionally by real cm. Pinch fine-tunes from there.
const A0_VIEWPORT_FRACTION = 0.72;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

interface LiveWallCameraProps {
  paintings: Painting[];
  /** Painting/colourway to open on. */
  initialPaintingId?: string;
  initialColourwayName?: string;
  onClose: () => void;
}

const CloseGlyph = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const ShareGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0">
    <path d="M9 2.5v8M9 2.5 6.2 5.3M9 2.5l2.8 2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 8.5H3.2A1.2 1.2 0 0 0 2 9.7v4.1A1.2 1.2 0 0 0 3.2 15h11.6a1.2 1.2 0 0 0 1.2-1.2V9.7a1.2 1.2 0 0 0-1.2-1.2H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const ResetGlyph = () => (
  <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0">
    <path d="M3.4 9a5.6 5.6 0 1 1 1.5 3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M3 6.2 3.3 9l2.8-.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * The photoreal flat framed print laid over the camera. Keeps the artwork's
 * native aspect ratio (so the landscape Ophiuchus reads landscape), wraps it in
 * a beveled wood moulding + a cream mat with a v-groove, adds a glass sheen, and
 * floats it on a grounded contact shadow so it sits on the wall.
 */
const FramedOverlay = ({
  colourway,
  frameWood,
  alt,
  imgRef,
}: {
  colourway: Colourway;
  frameWood: string | null;
  alt: string;
  imgRef: React.RefObject<HTMLImageElement | null>;
}) => {
  const framed = frameWood !== null;
  return (
    <div
      className="relative select-none"
      style={{
        // Grounded, directional contact shadow (lit from above) so the piece
        // reads as hanging ON the wall rather than floating over the feed.
        filter:
          "drop-shadow(0 24px 34px rgba(0,0,0,0.55)) drop-shadow(0 7px 13px rgba(0,0,0,0.45))",
      }}
    >
      {/* Wood moulding — bevelled (light top-left → dark bottom-right) with a
          fine inner/outer edge. Unframed = a slim warm paper edge. */}
      <div
        style={{
          padding: framed ? "6.5%" : "1.4%",
          borderRadius: "3px",
          background: framed
            ? `linear-gradient(135deg, color-mix(in srgb, ${frameWood}, white 28%) 0%, ${frameWood} 40%, color-mix(in srgb, ${frameWood}, black 36%) 100%)`
            : "#f4eee2",
          boxShadow: framed
            ? "inset 0 0 0 1px rgba(0,0,0,0.55), inset 0 2px 3px rgba(255,255,255,0.20), inset 0 -3px 6px rgba(0,0,0,0.5)"
            : "inset 0 0 0 1px rgba(0,0,0,0.08)",
        }}
      >
        {/* Cream mat (museum mount) with a subtle inset shadow */}
        <div
          style={{
            padding: framed ? "5.5%" : 0,
            background: framed ? "#f1ebdd" : "transparent",
            boxShadow: framed
              ? "inset 0 0 0 1px rgba(0,0,0,0.10), inset 0 1px 3px rgba(0,0,0,0.14)"
              : "none",
          }}
        >
          {/* V-groove bevel ring just outside the artwork window */}
          <div
            className="relative"
            style={{
              boxShadow: framed
                ? "0 0 0 1px rgba(0,0,0,0.20), 0 0 0 4px #f7f2e7, 0 0 0 5px rgba(0,0,0,0.12)"
                : "0 0 0 1px rgba(0,0,0,0.14)",
            }}
          >
            <picture>
              <source srcSet={asset(webp(colourway.image))} type="image/webp" />
              <img
                ref={imgRef}
                src={asset(colourway.image)}
                alt={alt}
                draggable={false}
                crossOrigin="anonymous"
                className="block w-full h-auto"
              />
            </picture>
            {/* Glazing sheen — a faint diagonal glass reflection */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(118deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 16%, rgba(255,255,255,0) 36%, rgba(255,255,255,0) 72%, rgba(255,255,255,0.06) 100%)",
                mixBlendMode: "screen",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const LiveWallCamera = ({
  paintings,
  initialPaintingId,
  initialColourwayName,
  onClose,
}: LiveWallCameraProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const artworkImgRef = useRef<HTMLImageElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const [paintingId, setPaintingId] = useState(
    initialPaintingId ?? paintings[0]?.id ?? "",
  );
  const painting: Painting =
    paintings.find((p) => p.id === paintingId) ?? paintings[0];
  const colourways = painting.colourways.filter((c) => c.available);
  const [colourwayName, setColourwayName] = useState(
    initialColourwayName ??
      (colourways.find((c) => c.isOriginal) ?? colourways[0])?.name ??
      "",
  );
  const colourway: Colourway =
    colourways.find((c) => c.name === colourwayName) ??
    colourways.find((c) => c.isOriginal) ??
    colourways[0];

  const [sizeId, setSizeId] = useState(
    (AR_SIZES.find((s) => s.anchor) ?? AR_SIZES[0]).id,
  );
  const size = AR_SIZES.find((s) => s.id === sizeId) ?? AR_SIZES[0];
  const [frameId, setFrameId] = useState<OverlayFrameId>("black-oak");
  const frame = OVERLAY_FRAMES.find((f) => f.id === frameId) ?? OVERLAY_FRAMES[1];

  const [camState, setCamState] = useState<
    "starting" | "live" | "denied" | "unavailable"
  >(() =>
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
      ? "starting"
      : "unavailable",
  );
  const [controlsOpen, setControlsOpen] = useState(true);
  const [showHint, setShowHint] = useState(true);
  const [ready, setReady] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [viewportW, setViewportW] = useState(
    () => (typeof window !== "undefined" && window.innerWidth) || 390,
  );

  // Live transform: `live` is mutated during a gesture (direct DOM writes for
  // smoothness); `view` is the committed value React renders from. On release we
  // commit live → view so a re-render (e.g. switching size) keeps the placement
  // the user set. Never read live.current during render (react-hooks/refs).
  const live = useRef({ x: 0, y: 0, scale: 1 });
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const gesture = useRef({
    pointers: new Map<number, { x: number; y: number }>(),
    prev: { x: 0, y: 0 },
    prevDist: 0,
  });

  // ---- Camera lifecycle ----------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const md = navigator.mediaDevices;
    if (typeof md?.getUserMedia !== "function") return; // initial state reflects "unavailable"
    void (async () => {
      try {
        const stream = await md.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCamState("live");
      } catch (err) {
        if (cancelled) return;
        const name = (err as { name?: string })?.name ?? "";
        setCamState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // ---- Scroll-lock + Escape + initial focus + viewport tracking + entrance --
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onResize = () => setViewportW(window.innerWidth || 390);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    closeRef.current?.focus();
    const raf = window.requestAnimationFrame(() => setReady(true));
    const hintTimer = window.setTimeout(() => setShowHint(false), 4200);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.cancelAnimationFrame(raf);
      window.clearTimeout(hintTimer);
    };
  }, [onClose]);

  // When the painting changes, fall back to its original colourway.
  const selectPainting = (p: Painting) => {
    setPaintingId(p.id);
    const cw = p.colourways.filter((c) => c.available);
    setColourwayName((cw.find((c) => c.isOriginal) ?? cw[0])?.name ?? "");
  };

  // Base on-screen width for the selected size (relative, not depth-true). A0
  // fills ~72% of the viewport; the rest scale proportionally by real cm.
  const baseWidthPx = useMemo(
    () => (size.cm / MAX_CM) * viewportW * A0_VIEWPORT_FRACTION,
    [size.cm, viewportW],
  );

  const applyTransform = useCallback(() => {
    const o = overlayRef.current;
    if (o) o.style.transform = `translate(${live.current.x}px, ${live.current.y}px) scale(${live.current.scale})`;
  }, []);

  const resetPlacement = () => {
    live.current = { x: 0, y: 0, scale: 1 };
    setView({ x: 0, y: 0, scale: 1 });
    applyTransform();
  };

  const centroid = (m: Map<number, { x: number; y: number }>) => {
    let x = 0;
    let y = 0;
    m.forEach((p) => {
      x += p.x;
      y += p.y;
    });
    const n = m.size || 1;
    return { x: x / n, y: y / n };
  };
  const spread = (m: Map<number, { x: number; y: number }>) => {
    const pts = [...m.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const g = gesture.current;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    g.prev = centroid(g.pointers);
    g.prevDist = g.pointers.size >= 2 ? spread(g.pointers) : 0;
    if (showHint) setShowHint(false);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g.pointers.has(e.pointerId)) return;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const c = centroid(g.pointers);
    live.current.x += c.x - g.prev.x;
    live.current.y += c.y - g.prev.y;
    if (g.pointers.size >= 2) {
      const d = spread(g.pointers);
      if (g.prevDist > 0) live.current.scale = clamp(live.current.scale * (d / g.prevDist), 0.3, 4);
      g.prevDist = d;
    }
    g.prev = c;
    applyTransform();
  };
  const endPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g.pointers.has(e.pointerId)) return;
    g.pointers.delete(e.pointerId);
    if (g.pointers.size >= 1) g.prev = centroid(g.pointers);
    if (g.pointers.size < 2) g.prevDist = 0;
    setView({ ...live.current }); // commit the gesture into a render
  };

  // ---- Save / share the wall mockup ---------------------------------------
  // Composites the live camera frame (object-cover) + the framed print at its
  // current on-screen rect onto a canvas, then shares (Web Share) or downloads.
  // The real wall-mockup tool — no DOM-screenshot dependency.
  const captureWall = async () => {
    const overlay = overlayRef.current;
    const img = artworkImgRef.current;
    if (!overlay || !img) return;
    const rect = overlay.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return; // not laid out (headless preview)
    const vw = window.innerWidth || 390;
    const vh = window.innerHeight || 780;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Background — the camera frame (object-cover) or the gallery-wall ground.
    const video = videoRef.current;
    if (camState === "live" && video && video.videoWidth) {
      const vr = video.videoWidth / video.videoHeight;
      const cr = vw / vh;
      let dw: number, dh: number, dx: number, dy: number;
      if (vr > cr) {
        dh = vh;
        dw = vh * vr;
        dx = (vw - dw) / 2;
        dy = 0;
      } else {
        dw = vw;
        dh = vw / vr;
        dx = 0;
        dy = (vh - dh) / 2;
      }
      try {
        ctx.drawImage(video, dx, dy, dw, dh);
      } catch {
        /* tainted / not ready — fall through to ground */
      }
    } else {
      const g = ctx.createRadialGradient(vw * 0.5, vh * 0.3, 0, vw * 0.5, vh * 0.3, Math.max(vw, vh));
      g.addColorStop(0, "#3a342c");
      g.addColorStop(0.55, "#211d18");
      g.addColorStop(1, "#14110d");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);
    }

    // The framed print, drawn at the overlay's on-screen rect (mirrors the CSS
    // proportions: 6.5% moulding + 5.5% mat when framed).
    const x = rect.left;
    const y = rect.top;
    const w = rect.width;
    const h = rect.height;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = Math.max(10, w * 0.06);
    ctx.shadowOffsetY = Math.max(8, w * 0.03);
    if (frame.wood) {
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, shade(frame.wood, 0.26));
      grad.addColorStop(0.4, frame.wood);
      grad.addColorStop(1, shade(frame.wood, -0.34));
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      ctx.shadowColor = "transparent";
      const m = w * 0.065; // moulding
      const mat = (w - 2 * m) * 0.055; // mat
      ctx.fillStyle = "#f1ebdd";
      ctx.fillRect(x + m, y + m, w - 2 * m, h - 2 * m);
      drawArtwork(ctx, img, x + m + mat, y + m + mat, w - 2 * (m + mat), h - 2 * (m + mat));
    } else {
      const pad = w * 0.014;
      ctx.fillStyle = "#f4eee2";
      ctx.fillRect(x, y, w, h);
      ctx.shadowColor = "transparent";
      drawArtwork(ctx, img, x + pad, y + pad, w - 2 * pad, h - 2 * pad);
    }
    ctx.restore();

    const fileName = `${painting.id}-${colourway.name.toLowerCase().replace(/\s+/g, "-")}-on-your-wall.jpg`;
    await new Promise<void>((resolve) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) return resolve();
          const file = new File([blob], fileName, { type: "image/jpeg" });
          const nav = navigator as Navigator & {
            canShare?: (d: { files: File[] }) => boolean;
            share?: (d: { files: File[]; title?: string; text?: string }) => Promise<void>;
          };
          if (nav.canShare?.({ files: [file] }) && nav.share) {
            try {
              await nav.share({ files: [file], title: "See it on your wall", text: `${painting.title} — ${colourway.name}` });
              resolve();
              return;
            } catch {
              /* user cancelled / unsupported — fall back to download */
            }
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          a.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 1500);
          resolve();
        },
        "image/jpeg",
        0.92,
      );
    });
    setCaptured(true);
    window.setTimeout(() => setCaptured(false), 1800);
  };

  const pieceLabel = `${painting.title} · ${colourway.name} · ${frame.label} · ${size.label}`;
  const moved = view.x !== 0 || view.y !== 0 || view.scale !== 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="See it on your wall — live camera"
      className="fixed inset-0 z-[120] overflow-hidden bg-black touch-none"
    >
      {/* ---- Camera feed (the wall) ---- */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
        style={{ opacity: camState === "live" ? 1 : 0 }}
      />
      {/* Graceful "gallery wall" ground when no camera (desktop / denied) */}
      {camState !== "live" && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 30%, #3a342c 0%, #211d18 55%, #14110d 100%)",
          }}
          aria-hidden="true"
        />
      )}

      {/* ---- The draggable framed overlay ---- */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        <div
          ref={overlayRef}
          className="transition-opacity duration-500"
          style={{
            width: `${baseWidthPx}px`,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            opacity: ready ? 1 : 0,
            cursor: "grab",
            willChange: "transform",
          }}
        >
          <FramedOverlay colourway={colourway} frameWood={frame.wood} alt={pieceLabel} imgRef={artworkImgRef} />
        </div>
      </div>

      {/* First-use hint */}
      {showHint && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 mt-[22vh] flex justify-center px-6">
          <p className="m-0 rounded-full bg-black/55 px-4 py-2 font-sans text-[12px] tracking-[0.04em] text-ink/90 backdrop-blur-sm">
            Drag to move · pinch to resize
          </p>
        </div>
      )}

      {/* ---- Top bar ---- */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-4">
        <div className="rounded-full bg-black/55 px-4 py-2 backdrop-blur-sm">
          <p className={cn(EYEBROW, "m-0 text-ink/85")}>See it on your wall</p>
        </div>
        <div className="flex items-center gap-2">
          {moved && (
            <button
              type="button"
              onClick={resetPlacement}
              aria-label="Reset placement"
              className="press inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-ink outline-none backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ResetGlyph />
            </button>
          )}
          <button
            type="button"
            onClick={() => void captureWall()}
            aria-label="Save photo"
            className="press inline-flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-bg outline-none transition-colors hover:bg-accent hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ShareGlyph />
            <span className="whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.14em]">
              {captured ? "Saved" : "Save"}
            </span>
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/55 text-ink outline-none backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-accent"
          >
            <CloseGlyph />
          </button>
        </div>
      </div>

      {/* ---- Camera permission / hint ---- */}
      {camState === "denied" && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-6">
          <p className="m-0 max-w-[420px] rounded-2xl bg-black/65 px-5 py-3 text-center font-sans text-[13px] leading-[1.6] text-ink/90 backdrop-blur-sm">
            Camera access is off. Allow camera for this site in your browser settings, then reopen — or just preview the framing on the wall below.
          </p>
        </div>
      )}
      {camState === "unavailable" && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-6">
          <p className="m-0 max-w-[420px] rounded-2xl bg-black/65 px-5 py-3 text-center font-sans text-[13px] leading-[1.6] text-ink/90 backdrop-blur-sm">
            Open this page on your phone in Safari (iPhone) or Chrome (Android) to place the print on your real wall. Preview below.
          </p>
        </div>
      )}

      {/* ---- Controls sheet ---- */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        {!controlsOpen ? (
          <div className="flex items-center justify-between gap-3 p-4">
            <p className="m-0 flex-1 truncate rounded-full bg-black/55 px-4 py-2 font-sans text-[12px] text-ink/85 backdrop-blur-sm">
              {pieceLabel}
            </p>
            <button
              type="button"
              onClick={() => setControlsOpen(true)}
              className="press inline-flex min-h-[44px] items-center rounded-full bg-ink px-5 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-bg outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Options
            </button>
          </div>
        ) : (
          <div className="max-h-[58svh] overflow-y-auto rounded-t-3xl bg-bg/92 px-4 pb-6 pt-3 ring-1 ring-white/10 backdrop-blur-md [scrollbar-width:thin]">
            {/* grab handle + collapse */}
            <div className="mb-3 flex items-center justify-between">
              <span className="mx-auto block h-1 w-10 rounded-full bg-white/25" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setControlsOpen(false)}
                aria-label="Hide options"
                className="press absolute right-4 inline-flex h-9 items-center rounded-full px-3 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
              >
                Hide
              </button>
            </div>

            {/* Work */}
            <section className="mb-4">
              <p className={cn(EYEBROW, "m-0 mb-2")}>The work</p>
              <div
                role="group"
                aria-label="Choose a painting"
                className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {paintings.map((p) => {
                  const cover = p.colourways.find((c) => c.isOriginal) ?? p.colourways[0];
                  const sel = p.id === painting.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={sel}
                      aria-label={p.title}
                      onClick={() => selectPainting(p)}
                      className={cn(
                        "h-14 w-14 shrink-0 overflow-hidden rounded-md outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-accent",
                        sel ? "ring-2 ring-accent" : "opacity-70 ring-1 ring-white/25 hover:opacity-100",
                      )}
                    >
                      <picture>
                        <source srcSet={asset(webp(cover.image))} type="image/webp" />
                        <img src={asset(cover.image)} alt="" className="h-full w-full object-cover" />
                      </picture>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Colourway */}
            {colourways.length > 1 && (
              <section className="mb-4">
                <p className={cn(EYEBROW, "m-0 mb-2")}>Colourway · {colourway.name}</p>
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
                        onClick={() => setColourwayName(c.name)}
                        className={cn(
                          "h-11 w-11 overflow-hidden rounded-full outline-none ring-1 ring-white/30 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-accent",
                          sel ? "ring-2 ring-accent scale-110" : "opacity-90 hover:scale-105 hover:opacity-100",
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

            {/* Size */}
            <section className="mb-4">
              <p className={cn(EYEBROW, "m-0 mb-2")}>Size · pinch to fine-tune</p>
              <div role="radiogroup" aria-label="Print size" className="grid grid-cols-4 gap-2">
                {AR_SIZES.map((s) => {
                  const sel = s.id === sizeId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={sel}
                      onClick={() => setSizeId(s.id)}
                      className={cn(
                        "flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 outline-none ring-1 transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-accent",
                        sel ? "bg-ink text-bg ring-ink" : "text-ink-muted ring-line hover:text-ink",
                      )}
                    >
                      <span className="font-sans text-[12px] font-bold tracking-[0.12em]">{s.label}</span>
                      <span className={cn("font-sans text-[9px] font-semibold tracking-[0.06em]", sel ? "text-bg/70" : "text-ink/70")}>
                        {s.cm}cm
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Frame */}
            <section>
              <p className={cn(EYEBROW, "m-0 mb-2")}>Frame · {frame.label}</p>
              <div role="radiogroup" aria-label="Frame finish" className="flex flex-wrap gap-2.5">
                {OVERLAY_FRAMES.map((f) => {
                  const sel = f.id === frame.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      role="radio"
                      aria-checked={sel}
                      aria-label={f.label}
                      onClick={() => setFrameId(f.id)}
                      className={cn(
                        "inline-flex min-h-[44px] items-center gap-2.5 rounded-full px-3.5 outline-none ring-1 transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-accent",
                        sel ? "ring-accent" : "ring-line hover:ring-ink/40",
                      )}
                    >
                      <span
                        className="h-5 w-5 rounded-full ring-1 ring-black/30"
                        style={{
                          background: f.wood
                            ? `linear-gradient(135deg, color-mix(in srgb, ${f.wood}, white 24%), ${f.wood})`
                            : "repeating-linear-gradient(45deg, #f3ede1, #f3ede1 3px, #d9d0bd 3px, #d9d0bd 6px)",
                        }}
                      />
                      <span className={cn("font-sans text-[11px] font-bold uppercase tracking-[0.12em]", sel ? "text-ink" : "text-ink-muted")}>
                        {f.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

// ---- canvas helpers ---------------------------------------------------------

/** Lighten (amt>0) / darken (amt<0) a hex colour for the canvas wood gradient. */
function shade(hex: string, amt: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const adj = (v: number) =>
    Math.round(clamp(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt), 0, 255));
  const r = adj(parseInt(m[1], 16));
  const g = adj(parseInt(m[2], 16));
  const b = adj(parseInt(m[3], 16));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Draw the artwork "object-cover" into a window rect (centre-crop), matching
 *  the on-screen <img> which fills the mat window at the artwork's own ratio. */
function drawArtwork(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) {
    ctx.fillStyle = "#2a2620";
    ctx.fillRect(x, y, w, h);
    return;
  }
  const ir = iw / ih;
  const wr = w / h;
  let sx = 0;
  let sy = 0;
  let sw = iw;
  let sh = ih;
  if (ir > wr) {
    sw = ih * wr;
    sx = (iw - sw) / 2;
  } else {
    sh = iw / wr;
    sy = (ih - sh) / 2;
  }
  try {
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  } catch {
    ctx.fillStyle = "#2a2620";
    ctx.fillRect(x, y, w, h);
  }
}
