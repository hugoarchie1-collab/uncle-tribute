// =============================================================================
// LiveWallCamera — the live in-browser "see it on your wall" camera.
// -----------------------------------------------------------------------------
// A full-screen popup that opens the phone's rear camera (getUserMedia) and lays
// a FRAMED PRINT over the live view of your wall. Every control — painting,
// colourway, size, frame — sits on top of the camera, so you flip through the
// WHOLE catalogue on your wall in one camera session, without ever leaving it.
//
// Deliberately a FLAT framed overlay (not true 3D / not depth-locked) — the
// trade-off for live, in-camera browsing of everything at once. Drag to move,
// pinch to resize. Degrades gracefully when no camera is available (desktop /
// denied permission) by showing the overlay on a calm "gallery wall" ground, so
// the picker still works and the page is testable without a camera.
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

/** The flat framed print laid over the camera. Keeps the artwork's native
 *  aspect ratio (so the landscape Ophiuchus reads landscape), wraps it in a
 *  wood moulding + cream mat, and floats it on a soft contact shadow. */
const FramedOverlay = ({
  colourway,
  frameWood,
  alt,
}: {
  colourway: Colourway;
  frameWood: string | null;
  alt: string;
}) => {
  const framed = frameWood !== null;
  return (
    <div
      className="relative select-none"
      style={{
        // Wood moulding (or a hairline paper edge when unframed).
        padding: framed ? "7%" : "1.5%",
        background: framed
          ? `linear-gradient(135deg, color-mix(in srgb, ${frameWood}, white 24%), ${frameWood} 46%, color-mix(in srgb, ${frameWood}, black 30%))`
          : "#f3ede1",
        boxShadow: framed
          ? "inset 0 0 0 1px rgba(0,0,0,0.45), inset 0 2px 4px rgba(255,255,255,0.14), inset 0 -3px 6px rgba(0,0,0,0.45), 0 14px 34px rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.4)"
          : "0 12px 30px rgba(0,0,0,0.45), 0 3px 8px rgba(0,0,0,0.35)",
        borderRadius: "2px",
      }}
    >
      {/* Cream mat (gallery mount) */}
      <div style={{ padding: framed ? "5%" : 0, background: framed ? "#f3ede1" : "transparent" }}>
        <picture>
          <source srcSet={asset(webp(colourway.image))} type="image/webp" />
          <img
            src={asset(colourway.image)}
            alt={alt}
            draggable={false}
            className="block w-full h-auto"
            style={{ boxShadow: framed ? "0 0 0 1px rgba(0,0,0,0.18)" : "none" }}
          />
        </picture>
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

  // ---- Scroll-lock + Escape + initial focus + viewport tracking -----------
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onResize = () => setViewportW(window.innerWidth || 390);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [onClose]);

  // When the painting changes, fall back to its original colourway.
  const selectPainting = (p: Painting) => {
    setPaintingId(p.id);
    const cw = p.colourways.filter((c) => c.available);
    setColourwayName((cw.find((c) => c.isOriginal) ?? cw[0])?.name ?? "");
  };

  // Base on-screen width for the selected size (relative, not depth-true). A0
  // fills ~62% of the viewport; the rest scale proportionally by real cm.
  const baseWidthPx = useMemo(
    () => (size.cm / MAX_CM) * viewportW * 0.62,
    [size.cm, viewportW],
  );

  const applyTransform = useCallback(() => {
    const o = overlayRef.current;
    if (o) o.style.transform = `translate(${live.current.x}px, ${live.current.y}px) scale(${live.current.scale})`;
  }, []);

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

  const pieceLabel = `${painting.title} · ${colourway.name} · ${frame.label} · ${size.label}`;

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
        className="absolute inset-0 h-full w-full object-cover"
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
          style={{
            width: `${baseWidthPx}px`,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            cursor: "grab",
            willChange: "transform",
          }}
        >
          <FramedOverlay colourway={colourway} frameWood={frame.wood} alt={pieceLabel} />
        </div>
      </div>

      {/* ---- Top bar ---- */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
        <div className="rounded-full bg-black/55 px-4 py-2 backdrop-blur-sm">
          <p className={cn(EYEBROW, "m-0 text-ink/85")}>See it on your wall</p>
        </div>
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
                      <span className={cn("font-sans text-[9px] font-semibold tracking-[0.06em]", sel ? "text-bg/70" : "text-ink/45")}>
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
