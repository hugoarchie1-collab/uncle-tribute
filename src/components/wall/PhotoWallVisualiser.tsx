// =============================================================================
// PhotoWallVisualiser — the calibrated room-photo fallback.
// -----------------------------------------------------------------------------
// The reliable non-AR path: desktop, unsupported devices, in-app browsers,
// failed AR, or anyone who prefers a still composition. The customer drops in a
// photo of their wall, marks a reference of known real length (two points + the
// distance in cm), and the square artwork is then rendered at a correctly
// SCALED size on the photo. Everything is LOCAL — the image is never uploaded;
// it lives only as an in-browser object URL.
//
// The overlay preserves the exact original image (object-fit: cover on a square
// box, 1:1, no crop of the source ratio since sources are square, no colour
// change, no frame, no rotation). Drag with pointer, nudge with the keyboard.
// Before calibration it is clearly an "Approximate preview"; after, a
// "Calibrated preview". A local canvas "Save" composites without any upload.
// =============================================================================

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Colourway, Painting } from "../../data/paintings";
import { paintingImageAlt } from "../../data/paintings";
import type { ArtworkSize } from "../../lib/artworkSizes";
import {
  artworkEdgePx,
  boundOverlay,
  pxPerCmFromReference,
  type Point,
} from "../../lib/calibration";
import { asset } from "../../lib/asset";
import { cn } from "../../lib/cn";
import { EYEBROW } from "../ui/tokens";
import { trackWall } from "../../lib/wallAnalytics";

interface PhotoWallVisualiserProps {
  painting: Painting;
  colourway: Colourway;
  size: ArtworkSize;
}

type Stage = "empty" | "place" | "calibrate";

export const PhotoWallVisualiser = ({ painting, colourway, size }: PhotoWallVisualiserProps) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const artImgRef = useRef<HTMLImageElement | null>(null);
  const photoImgRef = useRef<HTMLImageElement | null>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("empty");
  const [pxPerCm, setPxPerCm] = useState<number | null>(null);
  const [pos, setPos] = useState<Point>({ x: 40, y: 40 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // Calibration working state.
  const [calPoints, setCalPoints] = useState<Point[]>([]);
  const [realCm, setRealCm] = useState("30");
  const [saved, setSaved] = useState(false);

  const drag = useRef<{ active: boolean; dx: number; dy: number }>({ active: false, dx: 0, dy: 0 });

  // Release the object URL on change / unmount.
  useEffect(() => {
    if (!photoUrl) return;
    return () => URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  // Track the stage box size for bounds + approximate scaling.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [photoUrl]);

  // Square edge in photo pixels. Calibrated → real cm × px/cm; else an honest
  // approximate default proportional to the size (A0 ~48% of the box width).
  const edgePx = useMemo(() => {
    if (pxPerCm) return artworkEdgePx(size.cm, pxPerCm);
    const frac = 0.28 + 0.24 * (size.cm / 84); // a3≈0.36 … a0≈0.52
    return Math.max(48, (containerSize.w || 320) * frac);
  }, [pxPerCm, size.cm, containerSize.w]);

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setPhotoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setStage("place");
    setPxPerCm(null);
    setCalPoints([]);
    setPos({ x: 40, y: 40 });
    trackWall("room_photo_uploaded", { artwork: painting.id });
  };

  const replacePhoto = () => fileRef.current?.click();
  const reset = () => {
    setPxPerCm(null);
    setCalPoints([]);
    setStage(photoUrl ? "place" : "empty");
    setPos({ x: 40, y: 40 });
  };

  // ---- overlay drag --------------------------------------------------------
  const onOverlayDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (stage !== "place") return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { active: true, dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };
  const onOverlayMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const next = boundOverlay(
      { x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy },
      edgePx,
      containerSize.w,
      containerSize.h,
    );
    setPos(next);
  };
  const onOverlayUp = () => {
    drag.current.active = false;
  };
  const onOverlayKey = (e: React.KeyboardEvent) => {
    if (stage !== "place") return;
    const step = e.shiftKey ? 20 : 5;
    const d: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const mv = d[e.key];
    if (!mv) return;
    e.preventDefault();
    setPos((p) => boundOverlay({ x: p.x + mv.x, y: p.y + mv.y }, edgePx, containerSize.w, containerSize.h));
  };

  // ---- calibration ---------------------------------------------------------
  const onStageClick = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (stage !== "calibrate") return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setCalPoints((prev) => (prev.length >= 2 ? [p] : [...prev, p]));
  };
  const confirmCalibration = () => {
    if (calPoints.length < 2) return;
    const cm = Number(realCm);
    const next = pxPerCmFromReference(calPoints[0], calPoints[1], cm);
    if (!next) return;
    setPxPerCm(next);
    setStage("place");
    trackWall("room_photo_calibrated", { artwork: painting.id, cm });
  };

  // ---- local save (no upload) ---------------------------------------------
  const savePhoto = async () => {
    const photo = photoImgRef.current;
    const art = artImgRef.current;
    if (!photo || !art || !photo.naturalWidth) return;
    const scaleX = photo.naturalWidth / (containerSize.w || photo.width);
    const scaleY = photo.naturalHeight / (containerSize.h || photo.height);
    const canvas = document.createElement("canvas");
    canvas.width = photo.naturalWidth;
    canvas.height = photo.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      ctx.drawImage(photo, 0, 0);
      const x = pos.x * scaleX;
      const y = pos.y * scaleY;
      const w = edgePx * scaleX;
      const h = edgePx * scaleY;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = Math.max(10, w * 0.05);
      ctx.shadowOffsetY = Math.max(6, w * 0.03);
      ctx.drawImage(art, x, y, w, h);
      ctx.restore();
    } catch {
      return; // tainted (shouldn't happen: same-origin) — never surface a stack
    }
    await new Promise<void>((resolve) =>
      canvas.toBlob((blob) => {
        if (!blob) return resolve();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${painting.id}-${colourway.name.toLowerCase().replace(/\s+/g, "-")}-on-your-wall.jpg`;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
        resolve();
      }, "image/jpeg", 0.92),
    );
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const calibrated = pxPerCm !== null;

  return (
    <div className="flex flex-col gap-3">
      <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />

      {/* ---- Stage ---- */}
      <div
        ref={stageRef}
        onPointerDown={onStageClick}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-bg ring-1 ring-line"
        style={{ touchAction: "none" }}
      >
        {photoUrl ? (
          <img
            ref={photoImgRef}
            src={photoUrl}
            alt="Your wall"
            crossOrigin="anonymous"
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <button
            type="button"
            onClick={replacePhoto}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center"
          >
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full ring-1 ring-line text-ink-muted">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8.5" cy="10" r="1.6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M4 18l5-4.5 3.5 3L16 13l4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="font-sans text-[14px] font-bold tracking-[0.02em] text-ink">Add a photo of your wall</span>
            <span className="max-w-[300px] font-sans text-[12px] leading-[1.6] text-ink-muted">
              Choose or take a photo. It stays on your device — nothing is uploaded.
            </span>
          </button>
        )}

        {/* Artwork overlay */}
        {photoUrl && (
          <div
            ref={overlayRef}
            role="img"
            aria-label={`${paintingImageAlt(painting.title, colourway.name)} placed on your wall`}
            tabIndex={stage === "place" ? 0 : -1}
            onPointerDown={onOverlayDown}
            onPointerMove={onOverlayMove}
            onPointerUp={onOverlayUp}
            onPointerCancel={onOverlayUp}
            onKeyDown={onOverlayKey}
            className={cn(
              "absolute outline-none",
              stage === "place" ? "cursor-grab focus-visible:ring-2 focus-visible:ring-accent" : "pointer-events-none",
            )}
            style={{
              left: pos.x,
              top: pos.y,
              width: edgePx,
              height: edgePx,
              filter: "drop-shadow(0 18px 26px rgba(0,0,0,0.42))",
              opacity: stage === "calibrate" ? 0.25 : 1,
            }}
          >
            <img
              ref={artImgRef}
              src={asset(colourway.image)}
              alt=""
              crossOrigin="anonymous"
              draggable={false}
              className="block h-full w-full select-none object-cover"
            />
          </div>
        )}

        {/* Calibration markers + line */}
        {stage === "calibrate" && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            {calPoints.length === 2 && (
              <line x1={calPoints[0].x} y1={calPoints[0].y} x2={calPoints[1].x} y2={calPoints[1].y} stroke="#c97844" strokeWidth="2" />
            )}
            {calPoints.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="7" fill="none" stroke="#c97844" strokeWidth="2" />
                <circle cx={p.x} cy={p.y} r="2" fill="#c97844" />
              </g>
            ))}
          </svg>
        )}

        {/* Approximate / Calibrated badge */}
        {photoUrl && stage !== "calibrate" && (
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full px-3 py-1 font-sans text-[11px] font-bold tracking-[0.08em] backdrop-blur-sm",
              calibrated ? "bg-accent/90 text-bg" : "bg-black/55 text-ink",
            )}
          >
            {calibrated ? "Calibrated preview" : "Approximate preview"}
          </span>
        )}
      </div>

      {/* ---- Calibrate instructions ---- */}
      {stage === "calibrate" && (
        <div className="rounded-2xl bg-bg/70 p-4 ring-1 ring-line">
          <p className={cn(EYEBROW, "m-0 mb-1.5 text-accent")}>Set the true scale</p>
          <p className="m-0 mb-3 font-sans text-[13px] leading-[1.6] text-ink-muted">
            Tap <em className="not-italic text-ink">two points</em> on your photo a known distance apart — the width of a
            door, a shelf, a sheet of A4 (29.7 cm) — then enter that real distance.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="inline-flex items-center gap-2 font-sans text-[13px] text-ink">
              Real distance
              <input
                type="number"
                inputMode="decimal"
                min={1}
                value={realCm}
                onChange={(e) => setRealCm(e.target.value)}
                className="w-24 rounded-lg bg-bg px-3 py-2 font-sans text-[14px] text-ink outline-none ring-1 ring-line focus-visible:ring-2 focus-visible:ring-accent"
              />
              cm
            </label>
            <button
              type="button"
              onClick={confirmCalibration}
              disabled={calPoints.length < 2 || !(Number(realCm) > 0)}
              className="press inline-flex min-h-[44px] items-center rounded-full bg-ink px-5 font-sans text-[12px] font-bold tracking-[0.04em] text-bg outline-none transition-colors hover:bg-accent hover:text-ink focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40"
            >
              Apply scale
            </button>
            <button
              type="button"
              onClick={() => setCalPoints([])}
              className="press inline-flex min-h-[44px] items-center rounded-full px-4 font-sans text-[12px] font-bold tracking-[0.04em] text-ink-muted outline-none ring-1 ring-line hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
            >
              Clear points
            </button>
            <button
              type="button"
              onClick={() => setStage("place")}
              className="press inline-flex min-h-[44px] items-center rounded-full px-4 font-sans text-[12px] font-bold tracking-[0.04em] text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ---- Controls ---- */}
      {photoUrl && stage === "place" && (
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setStage("calibrate");
              setCalPoints([]);
            }}
            className={cn(
              "press inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 font-sans text-[12px] font-bold tracking-[0.04em] outline-none ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-accent",
              calibrated ? "ring-line text-ink-muted hover:text-ink" : "bg-accent text-bg ring-accent",
            )}
          >
            {calibrated ? "Re-calibrate" : "Set true scale"}
          </button>
          <button
            type="button"
            onClick={() => void savePhoto()}
            className="press inline-flex min-h-[44px] items-center rounded-full px-4 font-sans text-[12px] font-bold tracking-[0.04em] text-ink-muted outline-none ring-1 ring-line hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
          >
            {saved ? "Saved" : "Save photo"}
          </button>
          <button
            type="button"
            onClick={replacePhoto}
            className="press inline-flex min-h-[44px] items-center rounded-full px-4 font-sans text-[12px] font-bold tracking-[0.04em] text-ink-muted outline-none ring-1 ring-line hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
          >
            Replace photo
          </button>
          <button
            type="button"
            onClick={reset}
            className="press inline-flex min-h-[44px] items-center rounded-full px-4 font-sans text-[12px] font-bold tracking-[0.04em] text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
          >
            Reset
          </button>
        </div>
      )}

      {/* Empty-state primary action + privacy note */}
      {!photoUrl && (
        <button
          type="button"
          onClick={replacePhoto}
          className="press inline-flex min-h-[52px] items-center justify-center gap-2.5 self-start rounded-full bg-ink px-7 font-sans text-[13px] font-bold tracking-[0.04em] text-bg outline-none transition-colors hover:bg-accent hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
        >
          Add a room photo
        </button>
      )}

      <p className="m-0 font-sans text-[11px] leading-[1.6] text-ink-muted">
        {calibrated
          ? "Calibrated to your reference — a close scale approximation, not a substitute for measuring."
          : "Add a photo, then set the scale for a true-to-size preview."}{" "}
        Your photo stays on your device unless you choose to save it.
      </p>
    </div>
  );
};
