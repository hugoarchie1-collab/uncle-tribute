// =============================================================================
// SeeOnYourWall — the per-painting "Virtual Gallery" panel.
// -----------------------------------------------------------------------------
// Opened from the "See on your wall" button on a product page. Everything for
// THIS painting is here — colourway, size, and frame — so the customer never
// has to leave to adjust. A clean "View on your wall" tile launches the phone's
// real, true-size AR (no blank preview square — it shows the artwork itself).
// Room-photo mode is a "coming soon" placeholder (Hugo is adding true-to-size
// room images from kanvy.com). Fully accessible: portalled to <body>, focus-
// trapped, Escape closes, focus returns to the trigger.
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Painting } from "../../data/paintings";
import { FRAME_STYLES } from "../../data/paintings";
import {
  ARTWORK_SIZES,
  cmLabel,
  getArtworkSize,
  type ArtworkSizeId,
} from "../../lib/artworkSizes";
import { probeArEnvironment } from "../../lib/arCapability";
import { asset, webp } from "../../lib/asset";
import { cn } from "../../lib/cn";
import { EYEBROW } from "../ui/tokens";
import { trackWall } from "../../lib/wallAnalytics";
import { ModelViewerAR } from "./ModelViewerAR";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

// Frame options for the panel: "No frame" + the canonical website frame styles.
const FRAME_OPTIONS: { id: string; label: string; swatch: string | null }[] = [
  { id: "none", label: "No frame", swatch: null },
  ...FRAME_STYLES.map((f) => ({ id: f.id, label: f.label, swatch: f.swatch })),
];

interface SeeOnYourWallProps {
  painting: Painting;
  initialColourwayName?: string;
  initialSizeId?: ArtworkSizeId;
  onClose: () => void;
}

export const SeeOnYourWall = ({
  painting,
  initialColourwayName,
  initialSizeId,
  onClose,
}: SeeOnYourWallProps) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const colourways = useMemo(
    () => painting.colourways.filter((c) => c.available),
    [painting],
  );
  const [colourwayName, setColourwayName] = useState(
    initialColourwayName ??
      (colourways.find((c) => c.isOriginal) ?? colourways[0])?.name ??
      "",
  );
  const colourway =
    colourways.find((c) => c.name === colourwayName) ??
    colourways.find((c) => c.isOriginal) ??
    colourways[0];

  const [sizeId, setSizeId] = useState<ArtworkSizeId>(initialSizeId ?? "a2");
  const size = getArtworkSize(sizeId);
  const [frameId, setFrameId] = useState("none");
  const frame = FRAME_OPTIONS.find((f) => f.id === frameId) ?? FRAME_OPTIONS[0];

  const [inApp, setInApp] = useState(false);

  // Analytics + environment probe on open. Never opens the camera.
  useEffect(() => {
    trackWall("wall_visualiser_opened", { artwork: painting.id, size: sizeId });
    let cancelled = false;
    void probeArEnvironment().then((e) => {
      if (cancelled) return;
      setInApp(e.inApp);
      trackWall("ar_capability_detected", {
        platform: e.platform,
        inApp: e.inApp,
        handheld: e.handheld,
        arLikely: e.arLikely,
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [painting.id]);

  const close = useCallback(() => {
    trackWall("wall_visualiser_closed", { artwork: painting.id });
    trackWall("returned_to_product", { artwork: painting.id });
    onClose();
  }, [onClose, painting.id]);

  // Scroll-lock + Escape + focus trap + initial focus.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [close]);

  const pickSize = (id: ArtworkSizeId) => {
    if (id === sizeId) return;
    setSizeId(id);
    trackWall("visualiser_size_changed", { artwork: painting.id, size: id });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-stretch justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Virtual Gallery — ${painting.title} on your wall`}
        className="relative flex h-full w-full flex-col overflow-hidden bg-bg ring-1 ring-white/10 sm:h-auto sm:max-h-[92vh] sm:max-w-[680px] sm:rounded-3xl"
      >
        {/* ---- Header ---- */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className={cn(EYEBROW, "m-0 mb-1")}>Virtual Gallery</p>
            <h2 className="m-0 truncate font-display text-[clamp(18px,2.4vw,24px)] leading-tight text-ink">
              {painting.title}
            </h2>
            <p className="m-0 mt-0.5 font-sans text-[13px] text-ink-muted">
              {colourway.name} · {size.label} · <span className="text-ink">{cmLabel(size)}</span> ·{" "}
              {frame.label}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close and go back"
            className="press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink outline-none ring-1 ring-line transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ---- Scrollable body ---- */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
          {/* View-on-your-wall tile — shows the artwork, launches true-size AR */}
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[radial-gradient(120%_90%_at_50%_25%,#2a2620,#14110d)] ring-1 ring-line">
            <ModelViewerAR
              painting={painting}
              colourway={colourway}
              size={size}
              className="h-full w-full"
            />
          </div>
          <p className="mt-2 mb-5 text-center font-sans text-[12px] leading-[1.6] text-ink-muted">
            Opens full-screen in your camera at the exact real size · move your phone to place it, then a clean back
            arrow returns you here. Your camera stays on your device.
          </p>

          {/* Room photo — coming soon */}
          <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-bg/60 px-4 py-3 ring-1 ring-line">
            <div className="min-w-0">
              <p className="m-0 font-sans text-[13px] font-bold text-ink">Preview in a room photo</p>
              <p className="m-0 mt-0.5 font-sans text-[12px] text-ink-muted">
                True-to-size room images — coming soon.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white/8 px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
              Photos coming soon
            </span>
          </div>

          {/* Colourway */}
          {colourways.length > 1 && (
            <section className="mb-5">
              <p className={cn(EYEBROW, "m-0 mb-2.5")}>Colourway · {colourway.name}</p>
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
                        "h-12 w-12 overflow-hidden rounded-full outline-none ring-1 ring-white/25 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-accent",
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
          <section className="mb-5">
            <p className={cn(EYEBROW, "m-0 mb-2.5")}>Size</p>
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
                      "flex min-h-[52px] flex-col items-center justify-center rounded-xl px-1 outline-none ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-accent",
                      sel ? "bg-ink text-bg ring-ink" : "text-ink-muted ring-line hover:text-ink",
                    )}
                  >
                    <span className="font-sans text-[13px] font-bold tracking-[0.08em]">{s.label}</span>
                    <span className={cn("font-sans text-[10px] font-semibold", sel ? "text-bg/70" : "text-ink/60")}>
                      {s.cm}cm
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Frame */}
          <section>
            <p className={cn(EYEBROW, "m-0 mb-2.5")}>Frame · {frame.label}</p>
            <div role="radiogroup" aria-label="Frame" className="flex flex-wrap gap-2.5">
              {FRAME_OPTIONS.map((f) => {
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
                        background: f.swatch
                          ? `linear-gradient(135deg, color-mix(in srgb, ${f.swatch}, white 24%), ${f.swatch})`
                          : "repeating-linear-gradient(45deg, #2a2620, #2a2620 3px, #14110d 3px, #14110d 6px)",
                      }}
                    />
                    <span className={cn("font-sans text-[12px] font-bold tracking-[0.03em]", sel ? "text-ink" : "text-ink-muted")}>
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 m-0 font-sans text-[11px] leading-[1.6] text-ink-muted">
              {frame.id === "none"
                ? "Shown unframed. Framing (oak · black · white · walnut) is added to your order."
                : `${frame.label} frame added to your order. The AR preview shows the print itself at true size.`}
            </p>
          </section>

          {inApp && (
            <p className="mt-5 m-0 rounded-2xl bg-accent/10 px-4 py-3 text-center font-sans text-[13px] leading-[1.6] text-ink ring-1 ring-accent/30">
              For the AR experience, open this page in Safari or Chrome.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default SeeOnYourWall;
