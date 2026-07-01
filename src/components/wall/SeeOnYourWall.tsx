// =============================================================================
// SeeOnYourWall — the "See on Your Wall" orchestrator modal.
// -----------------------------------------------------------------------------
// Premium, unobtrusive dialog launched from the product page. Presents the
// artwork name, the selected size + exact cm, a size switcher that stays in sync
// with the product page, a 3D/AR preview (ModelViewerAR) and a calibrated
// room-photo fallback (PhotoWallVisualiser). Capability-routed: real handheld
// browsers lead with AR; in-app browsers get an "open in Safari/Chrome" notice;
// desktop / unsupported lead with the photo visualiser. Nothing requests the
// camera on open — AR launches only on a deliberate tap. Fully accessible:
// focus-trapped while open, Escape closes, focus returns to the trigger.
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Colourway, Painting } from "../../data/paintings";
import {
  ARTWORK_SIZES,
  cmLabel,
  type ArtworkSize,
  type ArtworkSizeId,
} from "../../lib/artworkSizes";
import { probeArEnvironment, type ArEnvironment } from "../../lib/arCapability";
import { cn } from "../../lib/cn";
import { EYEBROW } from "../ui/tokens";
import { trackWall } from "../../lib/wallAnalytics";
import { ModelViewerAR } from "./ModelViewerAR";
import { PhotoWallVisualiser } from "./PhotoWallVisualiser";

type Tab = "ar" | "photo";

interface SeeOnYourWallProps {
  painting: Painting;
  colourway: Colourway;
  size: ArtworkSize;
  onSelectSize: (sizeId: ArtworkSizeId) => void;
  onClose: () => void;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

export const SeeOnYourWall = ({
  painting,
  colourway,
  size,
  onSelectSize,
  onClose,
}: SeeOnYourWallProps) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [env, setEnv] = useState<ArEnvironment | null>(null);
  const [tab, setTab] = useState<Tab>("photo");
  const [arAvailable, setArAvailable] = useState(false);
  const openedAt = useRef(false);

  // Probe the environment once + pick the opening tab. Never opens the camera.
  useEffect(() => {
    let cancelled = false;
    void probeArEnvironment().then((e) => {
      if (cancelled) return;
      setEnv(e);
      setTab(e.arLikely ? "ar" : "photo");
      trackWall("ar_capability_detected", {
        platform: e.platform,
        secure: e.secure,
        inApp: e.inApp,
        handheld: e.handheld,
        webxr: e.webxr,
        arLikely: e.arLikely,
      });
    });
    if (!openedAt.current) {
      openedAt.current = true;
      trackWall("wall_visualiser_opened", { artwork: painting.id, size: size.id });
    }
    return () => {
      cancelled = true;
    };
  }, [painting.id, size.id]);

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
        (el) => el.offsetParent !== null || el === document.activeElement,
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

  const onArAvailability = useCallback(
    (available: boolean) => {
      setArAvailable((prev) => {
        if (prev === available) return prev;
        trackWall(available ? "ar_supported" : "ar_unsupported", { artwork: painting.id });
        return available;
      });
    },
    [painting.id],
  );

  const selectSize = (s: ArtworkSize) => {
    if (s.id === size.id) return;
    onSelectSize(s.id);
    trackWall("visualiser_size_changed", { artwork: painting.id, size: s.id });
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    if (t === "photo") trackWall("room_photo_mode_opened", { artwork: painting.id });
  };

  const inApp = env?.inApp ?? false;
  const insecure = env ? !env.secure : false;

  const sizes = useMemo(() => ARTWORK_SIZES, []);

  // Portal to <body>: the app shell has a `will-change: transform` wrapper (the
  // side-panel push) that becomes the containing block for position:fixed — so
  // a fixed modal rendered inside it is pinned to the PAGE, not the viewport.
  // Portalling out escapes that and keeps the overlay pinned to the viewport.
  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-stretch justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`See ${painting.title} on your wall`}
        className="relative flex h-full w-full flex-col overflow-hidden bg-bg ring-1 ring-white/10 sm:h-auto sm:max-h-[92vh] sm:max-w-[720px] sm:rounded-3xl"
      >
        {/* ---- Header ---- */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className={cn(EYEBROW, "m-0 mb-1")}>See it on your wall</p>
            <h2 className="m-0 truncate font-display text-[clamp(18px,2.4vw,24px)] leading-tight text-ink">
              {painting.title}
            </h2>
            <p className="m-0 mt-0.5 font-sans text-[13px] text-ink-muted">
              {colourway.name} · {size.label} · <span className="text-ink">{cmLabel(size)}</span>
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close"
            className="press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink outline-none ring-1 ring-line transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ---- Size switcher ---- */}
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <span className={cn(EYEBROW, "m-0 mr-1 hidden sm:inline")}>Size</span>
          <div role="radiogroup" aria-label="Print size" className="flex flex-1 gap-2">
            {sizes.map((s) => {
              const sel = s.id === size.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => selectSize(s)}
                  className={cn(
                    "flex min-h-[44px] flex-1 flex-col items-center justify-center rounded-xl px-1 outline-none ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-accent",
                    sel ? "bg-ink text-bg ring-ink" : "text-ink-muted ring-line hover:text-ink",
                  )}
                >
                  <span className="font-sans text-[12px] font-bold tracking-[0.1em]">{s.label}</span>
                  <span className={cn("font-sans text-[9px] font-semibold", sel ? "text-bg/70" : "text-ink/60")}>
                    {s.cm}cm
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- Tabs ---- */}
        <div className="flex gap-1 px-5 pt-3" role="tablist" aria-label="Preview mode">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "ar"}
            onClick={() => switchTab("ar")}
            className={cn(
              "min-h-[40px] rounded-full px-4 font-sans text-[12px] font-bold tracking-[0.04em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent",
              tab === "ar" ? "bg-white/8 text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            In your room (AR)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "photo"}
            onClick={() => switchTab("photo")}
            className={cn(
              "min-h-[40px] rounded-full px-4 font-sans text-[12px] font-bold tracking-[0.04em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent",
              tab === "photo" ? "bg-white/8 text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            Room photo
          </button>
        </div>

        {/* ---- Body ---- */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-3">
          {tab === "ar" ? (
            <div className="flex flex-col gap-3">
              {(inApp || insecure) && (
                <div className="rounded-2xl bg-accent/10 px-4 py-3 text-center ring-1 ring-accent/30" role="alert">
                  <p className="m-0 font-sans text-[13px] leading-[1.6] text-ink">
                    {inApp
                      ? "For the AR experience, open this page in Safari or Chrome."
                      : "AR needs a secure (https) connection."}
                  </p>
                </div>
              )}

              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[radial-gradient(120%_90%_at_50%_25%,#2a2620,#14110d)] ring-1 ring-line">
                <ModelViewerAR
                  painting={painting}
                  colourway={colourway}
                  size={size}
                  onArAvailability={onArAvailability}
                  className="h-full w-full"
                />
              </div>

              {/* Instructions */}
              <div className="rounded-2xl bg-bg/60 px-4 py-3 ring-1 ring-line">
                <p className="m-0 font-sans text-[13px] leading-[1.6] text-ink-muted">
                  Move your phone slowly so it can detect the wall, then tap the wall to place the artwork.{" "}
                  <span className="text-ink">The artwork is locked to its selected physical size.</span>
                </p>
                <p className="m-0 mt-1.5 font-sans text-[12px] leading-[1.6] text-ink-muted">
                  For the most reliable result, use Safari on iPhone or Chrome on Android. Your camera view stays on your
                  device.
                </p>
              </div>

              {!arAvailable && !inApp && (
                <div className="rounded-2xl bg-bg/60 px-4 py-3 ring-1 ring-line">
                  <p className="m-0 font-sans text-[13px] leading-[1.6] text-ink-muted">
                    Live AR isn&rsquo;t available on this device — you can still rotate the 3D preview above, or{" "}
                    <button type="button" onClick={() => switchTab("photo")} className="text-accent underline underline-offset-2">
                      preview it in a photo of your room
                    </button>
                    .
                  </p>
                </div>
              )}
            </div>
          ) : (
            <PhotoWallVisualiser painting={painting} colourway={colourway} size={size} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default SeeOnYourWall;
