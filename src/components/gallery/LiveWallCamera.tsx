// =============================================================================
// LiveWallCamera — the live in-browser "see it on your wall" camera.
// -----------------------------------------------------------------------------
// A full-screen popup that opens the phone's rear camera (getUserMedia) and lays
// a photoreal FRAMED PRINT over the live view of your wall. Every control —
// painting, colourway, size, frame — sits on top of the camera, so you browse
// the WHOLE catalogue on your wall in one camera session, without leaving it.
//
// Three things make this match-and-beat a generic AR placer (ArtPlacer et al.):
//   1. TRUE-TO-WALL SCALE. Hold a bank card flat on the wall, match a ruler to
//      it once, and every size renders at REAL centimetres on the wall (not a
//      relative guess). Calibration persists (localStorage) across sessions.
//   2. ROOM-PHOTO MODE. No camera (desktop) or want to try a saved room? Drop in
//      a photo of any wall and place the print into it — same controls.
//   3. BUY FROM THE WALL. Add the exact painting/colourway/size/frame you're
//      looking at straight to the basket — no leaving the camera to rebuild it.
//
// Deliberately a FLAT framed overlay (not depth-locked 3D) — the trade-off for
// live, in-camera browsing of everything at once. Drag to move, pinch to resize.
// "Save photo" composites the background + the framed print to a shareable image.
// Degrades gracefully to a "gallery wall" ground when no camera / no photo.
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
import {
  type Colourway,
  type Painting,
  FRAME_STYLES,
  PRINT_TIERS,
  DEFAULT_GLAZING,
  formatGBP,
} from "../../data/paintings";
import { AR_SIZES } from "../../lib/arAssets";
import { addItem } from "../../lib/basket";
import { asset, webp } from "../../lib/asset";
import { cn } from "../../lib/cn";
import { EYEBROW } from "../ui/tokens";

// Framing options for the overlay, DERIVED from the canonical FRAME_STYLES
// (src/data/paintings.ts) so the wall camera always carries the SAME frame
// range as the product page and the two can never drift (Hugo's coherence rule).
// "Unframed" is prepended (the print sells unframed by default — framing is the
// add-on). The flat overlay isn't bound to the GLB shells, so it shows the full
// range; each FRAME_STYLES swatch hex doubles as the overlay's wood colour.
type OverlayFrameId = "unframed" | (typeof FRAME_STYLES)[number]["id"];
const OVERLAY_FRAMES: { id: OverlayFrameId; label: string; wood: string | null }[] = [
  { id: "unframed", label: "Unframed", wood: null },
  ...FRAME_STYLES.map((f) => ({ id: f.id, label: f.label, wood: f.swatch })),
];

const MAX_CM = Math.max(...AR_SIZES.map((s) => s.cm));
// A0 (the largest size) fills this fraction of the viewport width by default;
// smaller sizes scale down proportionally by real cm. Kept modest so the piece
// isn't "zoomed in" — you frame the wall first, then pinch to fine-tune.
const A0_VIEWPORT_FRACTION = 0.5;

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

const LockGlyph = ({ locked }: { locked: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0">
    <rect x="3.5" y="8" width="11" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
    {/* shackle: closed (down) when locked, open (lifted) when not */}
    <path
      d={locked ? "M6 8V6a3 3 0 0 1 6 0v2" : "M6 8V6a3 3 0 0 1 5.7-1.3"}
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);


const PhotoGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0">
    <rect x="2.2" y="3.6" width="13.6" height="10.8" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="6.4" cy="7.2" r="1.3" stroke="currentColor" strokeWidth="1.2" />
    <path d="M3 13l3.8-3.4 2.6 2.2 2.4-2 3 2.6" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

const BasketGlyph = () => (
  <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0">
    <path d="M2.4 5.5h13.2l-1.1 8.1a1.4 1.4 0 0 1-1.4 1.2H4.9a1.4 1.4 0 0 1-1.4-1.2L2.4 5.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M6 5.5a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
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
          "drop-shadow(0 26px 38px rgba(0,0,0,0.6)) drop-shadow(0 9px 15px rgba(0,0,0,0.48))",
      }}
    >
      {/* Wood moulding DIRECTLY around the print — NO cream mat / white border
          (Hugo). Bevelled light→dark; unframed = the bare print, no border. */}
      <div
        style={{
          padding: framed ? "5%" : 0,
          borderRadius: framed ? "2px" : 0,
          background: framed
            ? `linear-gradient(135deg, color-mix(in srgb, ${frameWood}, white 30%) 0%, ${frameWood} 42%, color-mix(in srgb, ${frameWood}, black 38%) 100%)`
            : "transparent",
          boxShadow: framed
            ? "inset 0 0 0 1px rgba(0,0,0,0.6), inset 0 2px 3px rgba(255,255,255,0.22), inset 0 -3px 7px rgba(0,0,0,0.55)"
            : "none",
        }}
      >
        {/* The print, with a thin dark rabbet liner where the frame meets it
            (framed only). No mat — the artwork goes edge-to-edge in the frame. */}
        <div
          className="relative"
          style={{ boxShadow: framed ? "0 0 0 1px rgba(0,0,0,0.6)" : "none" }}
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
          {/* Glass sheen — framed pieces sit behind glazing; bare prints are matte. */}
          {framed && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(118deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.04) 16%, rgba(255,255,255,0) 38%, rgba(255,255,255,0) 72%, rgba(255,255,255,0.05) 100%)",
                mixBlendMode: "screen",
              }}
            />
          )}
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
  const roomImgRef = useRef<HTMLImageElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  // Default to the clean, unframed canvas (no border) — Hugo's preference; the
  // frame picker still offers every website frame style.
  const [frameId, setFrameId] = useState<OverlayFrameId>("unframed");
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
  const [captured, setCaptured] = useState(false);
  const [added, setAdded] = useState(false);
  // Lock pins the print in one position on the wall — drag + pinch are disabled
  // so it can't be nudged while you line up the shot (Hugo's ask).
  const [locked, setLocked] = useState(false);
  const [viewportW, setViewportW] = useState(
    () => (typeof window !== "undefined" && window.innerWidth) || 390,
  );

  // ---- ROOM-PHOTO background -----------------------------------------------
  const [roomPhotoUrl, setRoomPhotoUrl] = useState<string | null>(null);

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
    const hintTimer = window.setTimeout(() => setShowHint(false), 4200);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.clearTimeout(hintTimer);
    };
  }, [onClose]);

  // Revoke an uploaded room photo's object URL when it changes / on unmount.
  useEffect(() => {
    if (!roomPhotoUrl) return;
    return () => URL.revokeObjectURL(roomPhotoUrl);
  }, [roomPhotoUrl]);

  // When the painting changes, fall back to its original colourway.
  const selectPainting = (p: Painting) => {
    setPaintingId(p.id);
    const cw = p.colourways.filter((c) => c.available);
    setColourwayName((cw.find((c) => c.isOriginal) ?? cw[0])?.name ?? "");
  };

  // Base on-screen width for the selected size — a relative estimate (A0 fills
  // ~half the viewport, others scale by real cm ratio). Pinch to fine-tune.
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

  const onPickRoomPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file) return;
    setRoomPhotoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };
  const clearRoomPhoto = () =>
    setRoomPhotoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

  const addToBasket = () => {
    const framed = frame.id !== "unframed";
    addItem(
      painting.id,
      colourway.name,
      size.tierId as Parameters<typeof addItem>[2],
      framed,
      false,
      framed ? frame.id : undefined,
      framed ? DEFAULT_GLAZING : undefined,
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
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
    if (locked) return; // pinned in place — ignore drag/pinch
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
  // Composites the background (room photo > live camera > gallery ground) +
  // the framed print at its current on-screen rect onto a canvas, then shares
  // (Web Share) or downloads. The real wall-mockup tool — no DOM screenshot.
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

    // Background — room photo, the camera frame, or the gallery-wall ground.
    const video = videoRef.current;
    const room = roomImgRef.current;
    let drew = false;
    if (roomPhotoUrl && room && room.naturalWidth) {
      drew = drawCover(ctx, room, room.naturalWidth, room.naturalHeight, vw, vh);
    } else if (camState === "live" && video && video.videoWidth) {
      drew = drawCover(ctx, video, video.videoWidth, video.videoHeight, vw, vh);
    }
    if (!drew) {
      const g = ctx.createRadialGradient(vw * 0.5, vh * 0.3, 0, vw * 0.5, vh * 0.3, Math.max(vw, vh));
      g.addColorStop(0, "#3a342c");
      g.addColorStop(0.55, "#211d18");
      g.addColorStop(1, "#14110d");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);
    }

    // The framed print, drawn at the overlay's on-screen rect (mirrors the CSS:
    // 5% wood moulding DIRECTLY around the print, NO mat; unframed = bare print).
    const x = rect.left;
    const y = rect.top;
    const w = rect.width;
    const h = rect.height;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = Math.max(12, w * 0.07);
    ctx.shadowOffsetY = Math.max(9, w * 0.035);
    if (frame.wood) {
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, shade(frame.wood, 0.3));
      grad.addColorStop(0.42, frame.wood);
      grad.addColorStop(1, shade(frame.wood, -0.38));
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      ctx.shadowColor = "transparent";
      const m = w * 0.05; // moulding — print goes edge-to-edge inside it
      drawArtwork(ctx, img, x + m, y + m, w - 2 * m, h - 2 * m);
    } else {
      ctx.shadowColor = "transparent";
      // Re-cast the grounded shadow as a soft dark rect behind the bare print.
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = Math.max(12, w * 0.06);
      ctx.shadowOffsetY = Math.max(8, w * 0.03);
      ctx.fillStyle = "#000";
      ctx.fillRect(x, y, w, h);
      ctx.restore();
      drawArtwork(ctx, img, x, y, w, h);
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

  const tier = PRINT_TIERS.find((t) => t.id === size.tierId);
  const priceLabel = tier ? formatGBP(tier.pricePence) : "";
  const pieceLabel = `${painting.title} · ${colourway.name} · ${frame.label} · ${size.label}`;
  const moved = view.x !== 0 || view.y !== 0 || view.scale !== 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="See it on your wall — live camera"
      className="fixed inset-0 z-[120] overflow-hidden bg-black touch-none"
    >
      {/* ---- Background: room photo > camera feed > gallery ground ---- */}
      {roomPhotoUrl && (
        <img
          ref={roomImgRef}
          src={roomPhotoUrl}
          alt=""
          crossOrigin="anonymous"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
        style={{ opacity: !roomPhotoUrl && camState === "live" ? 1 : 0 }}
      />
      {/* Graceful "gallery wall" ground when no room photo + no camera */}
      {!roomPhotoUrl && camState !== "live" && (
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
          style={{
            width: `${baseWidthPx}px`,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            cursor: locked ? "default" : "grab",
            willChange: "transform",
          }}
        >
          <FramedOverlay colourway={colourway} frameWood={frame.wood} alt={pieceLabel} imgRef={artworkImgRef} />
        </div>
      </div>

      {/* First-use hint (hidden once locked) */}
      {showHint && !locked && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 mt-[22vh] flex justify-center px-6">
          <p className="m-0 rounded-full bg-black/55 px-4 py-2 font-sans text-[12px] tracking-[0.04em] text-ink/90 backdrop-blur-sm">
            Drag to move · pinch to resize · lock when it&rsquo;s right
          </p>
        </div>
      )}

      {/* ---- Top bar ---- */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-end gap-2 p-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLocked((v) => !v)}
              aria-pressed={locked}
              aria-label={locked ? "Unlock — let the print move again" : "Lock the print in place"}
              className={cn(
                "press inline-flex h-11 items-center gap-2 rounded-full px-3.5 outline-none backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:ring-accent",
                locked ? "bg-accent text-bg" : "bg-black/55 text-ink hover:bg-black/75",
              )}
            >
              <LockGlyph locked={locked} />
              <span className="whitespace-nowrap font-sans text-[11px] font-bold tracking-[0.04em]">
                {locked ? "Locked" : "Lock"}
              </span>
            </button>
            {moved && !locked && (
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
              className="press inline-flex h-11 items-center gap-2 rounded-full bg-black/55 px-4 text-ink outline-none backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ShareGlyph />
              <span className="whitespace-nowrap font-sans text-[11px] font-bold tracking-[0.04em]">
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
      {!roomPhotoUrl && camState === "denied" && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-6">
          <p className="m-0 max-w-[420px] rounded-2xl bg-black/65 px-5 py-3 text-center font-sans text-[13px] leading-[1.6] text-ink/90 backdrop-blur-sm">
            Camera access is off. Allow camera for this site in your browser settings, then reopen — or drop in a photo of your room below.
          </p>
        </div>
      )}
      {!roomPhotoUrl && camState === "unavailable" && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-6">
          <p className="m-0 max-w-[420px] rounded-2xl bg-black/65 px-5 py-3 text-center font-sans text-[13px] leading-[1.6] text-ink/90 backdrop-blur-sm">
            No camera here — drop in a photo of your room below to place the print, or open this page on your phone to use the live camera.
          </p>
        </div>
      )}

      {/* Hidden file input for room-photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onPickRoomPhoto}
        className="hidden"
      />

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
                className="press inline-flex min-h-[44px] items-center rounded-full bg-ink px-5 font-sans text-[11px] font-bold tracking-[0.04em] text-bg outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Options
              </button>
            </div>
          ) : (
            <div className="max-h-[62svh] overflow-y-auto rounded-t-3xl bg-bg/92 px-4 pb-6 pt-3 ring-1 ring-white/10 backdrop-blur-md [scrollbar-width:thin]">
              {/* grab handle + collapse */}
              <div className="mb-3 flex items-center justify-between">
                <span className="mx-auto block h-1 w-10 rounded-full bg-white/25" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => setControlsOpen(false)}
                  aria-label="Hide options"
                  className="press absolute right-4 inline-flex h-9 items-center rounded-full px-3 font-sans text-[11px] font-bold tracking-[0.04em] text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Hide
                </button>
              </div>

              {/* Buy bar — add THIS exact piece to the basket without leaving the wall */}
              <section className="mb-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={addToBasket}
                  className="press inline-flex min-h-[52px] flex-1 items-center justify-center gap-2.5 rounded-full bg-ink px-5 font-sans text-[13px] font-bold tracking-[0.04em] text-bg outline-none transition-colors duration-300 hover:bg-accent hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <BasketGlyph />
                  {added ? "Added to basket" : `Add to basket${priceLabel ? ` · ${priceLabel}` : ""}`}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={roomPhotoUrl ? "Change room photo" : "Use a photo of your room"}
                  className="press inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-ink-muted outline-none ring-1 ring-line transition-colors duration-300 hover:text-ink hover:ring-ink/40 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <PhotoGlyph />
                </button>
              </section>

              {roomPhotoUrl && (
                <button
                  type="button"
                  onClick={clearRoomPhoto}
                  className="press mb-4 inline-flex min-h-[40px] items-center gap-2 rounded-full px-3.5 font-sans text-[11px] font-bold tracking-[0.04em] text-ink-muted outline-none ring-1 ring-line hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Back to live camera
                </button>
              )}

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
                <p className={cn(EYEBROW, "m-0 mb-2")}>
                  Size · pinch to fine-tune
                </p>
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
                        <span className={cn("font-sans text-[11px] font-bold tracking-[0.04em]", sel ? "text-ink" : "text-ink-muted")}>
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

/** Draw a source (image or video) "object-cover" into the whole canvas viewport,
 *  centre-cropped. Returns false if the draw threw (tainted / not ready). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  vw: number,
  vh: number,
): boolean {
  const vr = srcW / srcH;
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
    ctx.drawImage(source, dx, dy, dw, dh);
    return true;
  } catch {
    return false;
  }
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
