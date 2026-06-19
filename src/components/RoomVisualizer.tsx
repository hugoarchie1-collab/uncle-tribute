import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  parseSizeCm,
  paintingImageAlt,
  type Colourway,
  type Painting,
  type PrintTier,
} from "../data/paintings";
import {
  framedSizeCm,
  FRAME_SPECS,
  HUMAN_SILHOUETTE_CM,
  pxPerCmFromAnchor,
  ROOM_PRESETS,
  SCALE_REFERENCES,
  type FrameFinish,
} from "../lib/trueScale";
import { cn } from "../lib/cn";
import { EASE_SIGNATURE, EYEBROW_MUTED, EYEBROW_TIGHT, META } from "./ui/tokens";
import { FramedArtwork } from "./FramedArtwork";
import { FramePicker } from "./FramePicker";

/* =============================================================================
 * RoomVisualizer — the universal, true-scale "See it in your room" visualizer.
 * -----------------------------------------------------------------------------
 * Two modes today (a third, "room", auto-appears only when ROOM_PRESETS is
 * non-empty — it is empty now, so no Room tab):
 *
 *   "scale" (DEFAULT, asset-free) — the framed print on a flat #0a0908 wall
 *      beside a 170cm human silhouette (inline SVG, aria-hidden) and a cm/inch
 *      ruler. The component PICKS pxPerCm so the tallest element fits the stage
 *      with margin, so the relative scale (print vs human vs ruler) is honest
 *      even though absolute on-glass size varies by device.
 *
 *   "upload" ("My room") — the buyer picks a photo of their wall; drags a
 *      reference silhouette (bank card / A4 / door) to match that real object in
 *      their photo; pxPerCm = referencePx / referenceRealCm; the framed print is
 *      then placed to scale and dragged to reposition.
 *
 * TRUE-SCALE RULES
 *   artwork px = framedSizeCm(parseSizeCm(tier.size), frame) × pxPerCm ×
 *   displayScale. Pinch / wheel ZOOM is DISABLED (touch-action:none on the print
 *   layer) — the only gesture is drag-to-reposition (+ keyboard arrow nudge).
 *   Scaling the print by hand would destroy the honesty the feature exists for.
 *
 * PRESENTATIONAL ONLY — `finish` and any visual state NEVER reach pricing /
 * basket / checkout.
 *
 * House conventions: Framer Motion only; useReducedMotion() short-circuits every
 * animation; never backdrop-filter on a fixed always-mounted element (the modal
 * uses a plain rgba veil, like CloserLook); strictly monochrome chrome.
 * ========================================================================== */

type Mode = "room" | "scale" | "upload";

export interface RoomVisualizerProps {
  painting: Painting;
  colourway: Colourway;
  tier: PrintTier;
  finish: FrameFinish;
  onFinishChange: (f: FrameFinish) => void;
  /** When passed, the size pills render + drive onSelectTier. */
  sizeTiers?: PrintTier[];
  onSelectTier?: (id: string) => void;
  defaultMode?: "room" | "scale";
  variant?: "inline" | "modal";
}

/** Reference object keys for the upload calibration. */
type RefKey = keyof typeof SCALE_REFERENCES;

const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

/* -----------------------------------------------------------------------------
 * Human silhouette — a simple, dignified inline figure (aria-hidden). Drawn in
 * a 1×viewBox unit space so it can be scaled to any pixel height. ink-toned.
 * -------------------------------------------------------------------------- */
const HumanSilhouette = ({ heightPx }: { heightPx: number }) => {
  // Natural proportion ~ 1 : 3.6 (width : height) for a standing figure.
  const widthPx = heightPx * 0.28;
  return (
    <svg
      aria-hidden="true"
      width={widthPx}
      height={heightPx}
      viewBox="0 0 28 100"
      fill="none"
      className="text-ink/30"
      style={{ display: "block" }}
    >
      {/* head */}
      <circle cx="14" cy="8" r="6" fill="currentColor" />
      {/* body + legs as one calm silhouette */}
      <path
        d="M14 15c-4 0-7 2.5-7 7v22c0 2 .4 3 1 9l-2 33c-.3 3 4 3 4.3 0L13 64h2l2.4 22c.3 3 4.6 3 4.3 0l-2-33c.6-6 1-7 1-9V22c0-4.5-3-7-7-7Z"
        fill="currentColor"
      />
    </svg>
  );
};

/* -----------------------------------------------------------------------------
 * Vertical ruler — a quiet cm scale with inch ticks, beside the print in scale
 * mode. Heights derived from pxPerCm so the marks are true to the figure/print.
 * -------------------------------------------------------------------------- */
const ScaleRuler = ({
  totalCm,
  unit,
}: {
  totalCm: number;
  unit: number;
}) => {
  const heightPx = totalCm * unit;
  // Major tick every 50cm if the ruler is tall, else every 20cm.
  const step = totalCm > 120 ? 50 : 20;
  const marks: number[] = [];
  for (let c = 0; c <= totalCm; c += step) marks.push(c);
  return (
    <div
      aria-hidden="true"
      className="relative"
      style={{ height: heightPx, width: 1 }}
    >
      <div className="absolute inset-y-0 left-0 w-px bg-line" />
      {marks.map((c) => (
        <div
          key={c}
          className="absolute left-0 flex items-center gap-1.5"
          // 0cm at the bottom, growing up.
          style={{ bottom: c * unit, transform: "translateY(50%)" }}
        >
          <span className="block h-px w-2.5 bg-line" />
          <span className="font-sans text-[9px] font-bold tracking-[0.14em] uppercase text-ink-muted whitespace-nowrap">
            {c} cm
          </span>
        </div>
      ))}
    </div>
  );
};

/* =========================================================================== */

export const RoomVisualizer = ({
  painting,
  colourway,
  tier,
  finish,
  onFinishChange,
  sizeTiers,
  onSelectTier,
  defaultMode = "scale",
  variant = "inline",
}: RoomVisualizerProps) => {
  const reduceMotion = useReducedMotion();

  const hasRooms = ROOM_PRESETS.length > 0;
  // "room" is only offered when presets exist; otherwise fall through to scale.
  const initialMode: Mode =
    defaultMode === "room" && hasRooms ? "room" : "scale";
  const [mode, setMode] = useState<Mode>(initialMode);

  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });

  // Measure the stage so scale-mode can pick a pxPerCm that fits.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setStage({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // -- the print's real, framed footprint in cm --------------------------------
  const bareDims = parseSizeCm(tier.size);
  const frameSpec = FRAME_SPECS[finish];
  const framedDims = bareDims ? framedSizeCm(bareDims, frameSpec) : null;

  const alt = paintingImageAlt(painting.title, colourway.name);

  // The real-size caption (cm + inches) — persistent across both modes.
  const sizeCaption = useMemo(() => {
    if (!bareDims) return null;
    const inW = (bareDims.w / 2.54).toFixed(1);
    const inH = (bareDims.h / 2.54).toFixed(1);
    return {
      cm: `${bareDims.w} × ${bareDims.h} cm`,
      in: `${inW} × ${inH} in`,
    };
  }, [bareDims]);

  // ===========================================================================
  // SCALE MODE — pick pxPerCm so the tallest element (the 170cm figure, or the
  // framed print if it's taller) fits the stage height with margin.
  // ===========================================================================
  const scalePxPerCm = useMemo(() => {
    if (!framedDims || stage.h === 0) return 0;
    const tallestCm = Math.max(HUMAN_SILHOUETTE_CM, framedDims.h);
    // Leave ~22% vertical breathing room.
    const usableH = stage.h * 0.78;
    return usableH / tallestCm;
  }, [framedDims, stage.h]);

  // ===========================================================================
  // UPLOAD ("My room") MODE
  // ===========================================================================
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [refKey, setRefKey] = useState<RefKey>("card");
  // The reference silhouette's on-screen width in px (user-dragged to match the
  // real object in their photo). Seeded to a sensible default once a photo is in.
  const [refPx, setRefPx] = useState(160);
  // The print's position within the stage, in px (top-left of the framed box).
  const [printPos, setPrintPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Revoke the object URL on unmount / replacement (no leaks).
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  const onPickFile = useCallback((file: File | undefined) => {
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setUploadFailed(false);
    setUploadUrl(url);
    setPrintPos(null); // re-centre the print over the new photo
  }, []);

  // pxPerCm recovered from the dragged reference object in upload mode.
  const uploadPxPerCm = useMemo(
    () => pxPerCmFromAnchor(refPx, SCALE_REFERENCES[refKey].w),
    [refPx, refKey],
  );

  // Centre the print once we know both the stage size and the upload scale.
  useEffect(() => {
    if (mode !== "upload" || !uploadUrl || !framedDims) return;
    if (printPos !== null) return;
    if (stage.w === 0 || stage.h === 0 || uploadPxPerCm === 0) return;
    const w = framedDims.w * uploadPxPerCm;
    const h = framedDims.h * uploadPxPerCm;
    // One-time centring once the stage is measured + scale known (guarded by the
    // printPos !== null early-return above, so it runs once). Syncing initial
    // position to measured DOM is the legitimate effect case — same inline
    // exception the Nav uses for its menu-close effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrintPos({
      x: clamp((stage.w - w) / 2, 0, Math.max(0, stage.w - w)),
      y: clamp((stage.h - h) / 2, 0, Math.max(0, stage.h - h)),
    });
  }, [mode, uploadUrl, framedDims, uploadPxPerCm, stage, printPos]);

  // Re-clamp the placed print back onto the stage when the frame finish or size
  // changes its footprint, so a larger framed size can never strand it off-stage.
  // The (cx/cy !== current) guard means it only fires when a clamp is actually
  // needed — never an update loop.
  useEffect(() => {
    if (printPos === null || !framedDims) return;
    if (stage.w === 0 || stage.h === 0 || uploadPxPerCm === 0) return;
    const w = framedDims.w * uploadPxPerCm;
    const h = framedDims.h * uploadPxPerCm;
    const cx = clamp(printPos.x, 0, Math.max(0, stage.w - w));
    const cy = clamp(printPos.y, 0, Math.max(0, stage.h - h));
    if (cx !== printPos.x || cy !== printPos.y) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrintPos({ x: cx, y: cy });
    }
  }, [framedDims, uploadPxPerCm, stage, printPos]);

  // -- drag-to-reposition the print (pointer) ---------------------------------
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const onPrintPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!printPos) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: printPos.x,
      originY: printPos.y,
    };
  };

  const onPrintPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragState.current;
    if (!d || d.pointerId !== e.pointerId || !framedDims) return;
    const w = framedDims.w * uploadPxPerCm;
    const h = framedDims.h * uploadPxPerCm;
    const nx = d.originX + (e.clientX - d.startX);
    const ny = d.originY + (e.clientY - d.startY);
    setPrintPos({
      x: clamp(nx, 0, Math.max(0, stage.w - w)),
      y: clamp(ny, 0, Math.max(0, stage.h - h)),
    });
  };

  const onPrintPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId === e.pointerId) dragState.current = null;
  };

  const nudge = (dx: number, dy: number) => {
    if (!printPos || !framedDims) return;
    const w = framedDims.w * uploadPxPerCm;
    const h = framedDims.h * uploadPxPerCm;
    setPrintPos({
      x: clamp(printPos.x + dx, 0, Math.max(0, stage.w - w)),
      y: clamp(printPos.y + dy, 0, Math.max(0, stage.h - h)),
    });
  };

  const onPrintKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 20 : 6;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      nudge(-step, 0);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nudge(step, 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      nudge(0, -step);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      nudge(0, step);
    }
  };

  // -- drag the reference silhouette's edge to resize it (calibration) --------
  const refDrag = useRef<{ pointerId: number; startX: number; startPx: number } | null>(
    null,
  );
  const onRefHandleDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    refDrag.current = { pointerId: e.pointerId, startX: e.clientX, startPx: refPx };
  };
  const onRefHandleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = refDrag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    // 1:1 with the pointer (no ×2) so the calibration box can be aligned exactly
    // to a real object held against the photo.
    setRefPx(clamp(d.startPx + (e.clientX - d.startX), 24, stage.w || 600));
  };
  const onRefHandleUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (refDrag.current?.pointerId === e.pointerId) refDrag.current = null;
  };
  // Keyboard calibration (the handle is a real slider): arrows resize the
  // reference box, Home/End jump to min/max. Mirrors the print's nudge pattern.
  const onRefHandleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const maxPx = stage.w || 600;
    const step = e.shiftKey ? 20 : 4;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setRefPx((p) => clamp(p + step, 24, maxPx));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setRefPx((p) => clamp(p - step, 24, maxPx));
    } else if (e.key === "Home") {
      e.preventDefault();
      setRefPx(24);
    } else if (e.key === "End") {
      e.preventDefault();
      setRefPx(maxPx);
    }
  };

  // The tabs actually available (Room only when presets exist).
  const tabs: Mode[] = hasRooms ? ["room", "scale", "upload"] : ["scale", "upload"];
  const TAB_LABEL: Record<Mode, string> = {
    room: "In a room",
    scale: "To scale",
    upload: "My room",
  };

  // Whether the print can render at all.
  const renderable = !!framedDims && !!bareDims;

  // ===========================================================================
  // RENDER
  // ===========================================================================
  const isModal = variant === "modal";

  const refRealCm = SCALE_REFERENCES[refKey];
  const refHeightPx = refPx * (refRealCm.h / refRealCm.w);

  return (
    <figure
      role="figure"
      aria-label={`${painting.title} — ${colourway.name}, shown to scale`}
      className={cn("m-0 flex flex-col", isModal ? "h-full" : "")}
    >
      {/* ── controls row: mode tabs + frame picker ───────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Visualizer mode"
          className="inline-flex items-center gap-0.5 p-0.5 ring-1 ring-line rounded-full"
        >
          {tabs.map((t) => {
            const isActive = t === mode;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setMode(t)}
                className={cn(
                  "inline-flex min-h-[44px] items-center rounded-full px-4 font-sans text-[11px] font-bold tracking-[0.16em] uppercase transition-colors duration-300 outline-none",
                  "focus-visible:ring-1 focus-visible:ring-accent focus-visible:text-accent",
                  isActive ? "bg-ink text-bg" : "text-ink-muted hover:text-ink",
                )}
              >
                {TAB_LABEL[t]}
              </button>
            );
          })}
        </div>

        <FramePicker value={finish} onChange={onFinishChange} />
      </div>

      {/* ── the stage ────────────────────────────────────────────────────── */}
      <div
        ref={stageRef}
        className={cn(
          "relative mt-5 w-full overflow-hidden ring-1 ring-line",
          isModal ? "flex-1 min-h-0" : "aspect-[4/3]",
        )}
        style={{ backgroundColor: "#0a0908" }}
      >
        {!renderable && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className={cn(META, "m-0")}>
              This size has no standard dimensions to show to scale.
            </p>
          </div>
        )}

        {/* ── SCALE MODE ─────────────────────────────────────────────────── */}
        {renderable && mode === "scale" && bareDims && framedDims && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${tier.id}-${finish}`}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.3, ease: EASE_SIGNATURE }}
              className="absolute inset-0 flex items-end justify-center gap-[6%] pb-[8%]"
            >
              {/* ruler */}
              {scalePxPerCm > 0 && (
                <ScaleRuler
                  totalCm={Math.max(HUMAN_SILHOUETTE_CM, framedDims.h)}
                  unit={scalePxPerCm}
                />
              )}

              {/* framed print */}
              <div className="flex flex-col items-center justify-end">
                {scalePxPerCm > 0 && (
                  <FramedArtwork
                    imageSrc={colourway.image}
                    alt={alt}
                    dims={bareDims}
                    pxPerCm={scalePxPerCm}
                    displayScale={1}
                    finish={finish}
                  />
                )}
              </div>

              {/* 170cm human silhouette */}
              {scalePxPerCm > 0 && (
                <div className="flex flex-col items-center justify-end">
                  <HumanSilhouette heightPx={HUMAN_SILHOUETTE_CM * scalePxPerCm} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── UPLOAD ("My room") MODE ────────────────────────────────────── */}
        {renderable && mode === "upload" && bareDims && framedDims && (
          <div className="absolute inset-0">
            {!uploadUrl || uploadFailed ? (
              // Empty / failed state — invite a photo; this IS the graceful
              // fallback if an image fails to load.
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <p className={cn(EYEBROW_MUTED, "m-0")}>
                  {uploadFailed ? "That image couldn't load" : "See it on your wall"}
                </p>
                <p className={cn(META, "m-0 max-w-[340px]")}>
                  Add a straight-on photo of your wall, then drag the{" "}
                  {SCALE_REFERENCES[refKey].label.toLowerCase()} to match one in
                  the room — the print sizes itself to scale.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-[44px] items-center rounded-full bg-ink text-bg px-6 font-sans text-[11px] font-bold tracking-[0.16em] uppercase transition-colors duration-300 hover:bg-ink/85 outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  Choose a photo
                </button>
              </div>
            ) : (
              <>
                {/* the wall photo */}
                <img
                  src={uploadUrl}
                  alt=""
                  aria-hidden="true"
                  onError={() => setUploadFailed(true)}
                  className="absolute inset-0 h-full w-full object-cover select-none"
                  draggable={false}
                />

                {/* reference silhouette — drag the right edge to match a real
                    object of known size; recovers pxPerCm. */}
                <div
                  className="absolute left-4 bottom-4 ring-1 ring-accent/70"
                  style={{ width: refPx, height: refHeightPx }}
                >
                  <div className="absolute inset-0 bg-accent/10" />
                  <span
                    className={cn(
                      EYEBROW_TIGHT,
                      "absolute left-1 top-1 text-ink bg-[#0a0908]/70 px-1.5 py-0.5 rounded",
                    )}
                  >
                    {SCALE_REFERENCES[refKey].label}
                  </span>
                  <button
                    type="button"
                    role="slider"
                    aria-label={`Resize the ${SCALE_REFERENCES[refKey].label} reference to match the real object in your photo`}
                    aria-valuemin={24}
                    aria-valuemax={Math.round(stage.w || 600)}
                    aria-valuenow={Math.round(refPx)}
                    aria-valuetext={`${Math.round(refPx)} px wide`}
                    onPointerDown={onRefHandleDown}
                    onPointerMove={onRefHandleMove}
                    onPointerUp={onRefHandleUp}
                    onPointerCancel={onRefHandleUp}
                    onKeyDown={onRefHandleKeyDown}
                    className="absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-accent ring-2 ring-[#0a0908] cursor-ew-resize touch-none outline-none focus-visible:ring-ink before:absolute before:-inset-[10px] before:content-['']"
                  />
                </div>

                {/* the framed print, true to uploadPxPerCm, drag to move */}
                {printPos && (
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`${painting.title} print — drag to reposition, arrow keys to nudge`}
                    onPointerDown={onPrintPointerDown}
                    onPointerMove={onPrintPointerMove}
                    onPointerUp={onPrintPointerUp}
                    onPointerCancel={onPrintPointerUp}
                    onKeyDown={onPrintKeyDown}
                    className="absolute outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    style={{
                      left: printPos.x,
                      top: printPos.y,
                      touchAction: "none",
                      cursor: "grab",
                    }}
                  >
                    <FramedArtwork
                      imageSrc={colourway.image}
                      alt={alt}
                      dims={bareDims}
                      pxPerCm={uploadPxPerCm}
                      displayScale={1}
                      finish={finish}
                      draggable
                    />
                  </div>
                )}

                {/* reference + change-photo controls */}
                <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                  <div
                    role="radiogroup"
                    aria-label="Reference object"
                    className="inline-flex items-center gap-0.5 p-0.5 ring-1 ring-line rounded-full bg-[#0a0908]/70"
                  >
                    {(Object.keys(SCALE_REFERENCES) as RefKey[]).map((k) => {
                      const isSel = k === refKey;
                      return (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={isSel}
                          onClick={() => setRefKey(k)}
                          className={cn(
                            "inline-flex min-h-[44px] items-center rounded-full px-3 font-sans text-[10px] font-bold tracking-[0.14em] uppercase transition-colors duration-300 outline-none focus-visible:ring-1 focus-visible:ring-accent",
                            isSel ? "bg-ink text-bg" : "text-ink-muted hover:text-ink",
                          )}
                        >
                          {SCALE_REFERENCES[k].label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex min-h-[44px] items-center rounded-full ring-1 ring-line bg-[#0a0908]/70 px-3.5 font-sans text-[10px] font-bold tracking-[0.14em] uppercase text-ink-muted hover:text-ink transition-colors duration-300 outline-none focus-visible:ring-accent focus-visible:text-accent"
                  >
                    Change photo
                  </button>
                </div>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onPickFile(e.target.files?.[0])}
            />
          </div>
        )}
      </div>

      {/* ── size pills (optional) ────────────────────────────────────────── */}
      {sizeTiers && sizeTiers.length > 0 && onSelectTier && (
        <div
          role="radiogroup"
          aria-label="Print size"
          className="mt-5 inline-flex flex-wrap items-center gap-0.5 p-0.5 ring-1 ring-line rounded-full self-start"
        >
          {sizeTiers.map((t) => {
            const token = t.size.split(" ")[0];
            const isSel = t.id === tier.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={isSel}
                onClick={() => onSelectTier(t.id)}
                className={cn(
                  "inline-flex min-h-[44px] items-center rounded-full px-4 font-sans text-[11px] font-bold tracking-[0.16em] uppercase transition-colors duration-300 outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:text-accent",
                  isSel ? "bg-ink text-bg" : "text-ink-muted hover:text-ink",
                )}
              >
                {token}
              </button>
            );
          })}
        </div>
      )}

      {/* ── persistent figcaption: real size + honesty note ──────────────── */}
      <figcaption className="mt-4">
        {sizeCaption ? (
          <span className="block font-sans text-[clamp(13.5px,0.8vw,16px)] leading-[1.5] text-ink">
            {tier.label} · {sizeCaption.cm}
            <span className="text-ink-muted"> · {sizeCaption.in}</span>
          </span>
        ) : (
          <span className="block font-sans text-[15px] text-ink">
            {tier.label} · {tier.size}
          </span>
        )}
        <span className={cn(EYEBROW_TIGHT, "block mt-1.5")}>
          Shown to scale · on-screen size varies with your device
        </span>
      </figcaption>
    </figure>
  );
};

/* =============================================================================
 * RoomVisualizerModal — full-screen overlay wrapping RoomVisualizer.
 * -----------------------------------------------------------------------------
 * Owns its own `finish` state (presentational — never leaves the modal). Uses
 * the EXACT CloserLook chrome conventions: fixed inset-0 z-[200], role="dialog"
 * aria-modal, Escape / X / backdrop close, Tab focus-trap, focus restored to the
 * opener, body scroll-locked while open, monochrome chrome, reduced-motion =
 * instant. This is what the Virtual Gallery + PDP open.
 * ========================================================================== */
export interface RoomVisualizerModalProps {
  open: boolean;
  onClose: () => void;
  painting: Painting;
  colourway: Colourway;
  tier: PrintTier;
  defaultMode?: "room" | "scale";
}

export const RoomVisualizerModal = ({
  open,
  onClose,
  painting,
  colourway,
  tier,
  defaultMode = "scale",
}: RoomVisualizerModalProps) => {
  const reduceMotion = useReducedMotion();
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // The modal owns the preview finish — strictly presentational.
  const [finish, setFinish] = useState<FrameFinish>("oak");

  // Latest onClose without re-running the lifecycle effect (CloserLook pattern).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Escape + Tab focus-trap + scroll-lock + focus management (house pattern).
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = overlayRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, [role="button"]',
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
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          key="room-visualizer"
          role="dialog"
          aria-modal="true"
          aria-label={`${painting.title} — ${colourway.name}, see it to scale`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.18 : 0.3, ease: EASE_SIGNATURE }}
          className="fixed inset-0 z-[200] overflow-hidden"
          style={{
            backgroundColor: "rgba(10, 9, 8, 0.97)",
            overscrollBehavior: "none",
          }}
        >
          {/* Backdrop close affordance — full-bleed, behind the content. */}
          <button
            type="button"
            aria-label="Close the visualizer"
            onClick={onClose}
            tabIndex={-1}
            className="absolute inset-0 -z-10 bg-transparent border-0"
          />

          {/* Title — top-left, quiet. */}
          <p
            className={cn(
              EYEBROW_MUTED,
              "pointer-events-none absolute top-5 left-4 md:top-7 md:left-6 m-0 max-w-[62vw] truncate",
            )}
          >
            <span className="text-ink">{painting.title}</span>
            <span aria-hidden="true" className="mx-2 text-ink/35">
              ·
            </span>
            {colourway.name}
          </p>

          {/* Close — top-right, mobile-menu register. */}
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close the visualizer"
            className="absolute top-4 right-4 md:top-6 md:right-6 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0a0908]/70 ring-1 ring-line text-ink-muted hover:text-ink focus-visible:text-accent focus-visible:ring-accent transition-colors duration-300"
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

          {/* The visualizer itself, centred in a max-width column. */}
          <div className="absolute inset-0 flex items-center justify-center px-4 pt-20 pb-6 md:px-8">
            <div className="flex h-full max-h-[calc(100vh-7rem)] w-full max-w-[1100px] flex-col">
              <RoomVisualizer
                painting={painting}
                colourway={colourway}
                tier={tier}
                finish={finish}
                onFinishChange={setFinish}
                defaultMode={defaultMode}
                variant="modal"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
