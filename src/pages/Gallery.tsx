// =============================================================================
// /gallery — The Virtual Exhibition. A CAMERA-ONLY experience.
// -----------------------------------------------------------------------------
// This page exists ONLY to put a piece on your real wall through your phone's
// camera (iOS Quick Look / Android Scene Viewer / WebXR), at its EXACT print
// size. It deliberately does NOT repeat the product page's catalogue/buy UI.
//
//   • DESKTOP (no camera AR): show a QR code + "open it on your phone" — nothing
//     else. AR needs a phone camera, so the desktop's only job is to hand off.
//   • PHONE / TABLET: pick a work + colourway + size + frame, then the big
//     "See it on your wall" button launches the device's REAL AR. The button is
//     ALWAYS shown on a touch device (never hidden behind a flaky capability
//     probe — that was why "the camera did nothing" for some phones).
// =============================================================================

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { PageMasthead } from "../components/PageMasthead";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { ArtworkAR, type ArtworkARHandle } from "../components/ArtworkAR";
import { PrintBack } from "../components/gallery/PrintBack";
import { PAINTINGS, type Colourway, type Painting } from "../data/paintings";
import {
  AR_SIZES,
  AR_FRAMES,
  AR_DEFAULT_SIZE,
  AR_DEFAULT_FRAME,
  hasAr,
  type ArSize,
  type ArFrame,
} from "../lib/arAssets";
import { asset, webp } from "../lib/asset";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_MUTED } from "../components/ui/tokens";

const CameraGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
    <path
      d="M1.75 5.5A1.25 1.25 0 0 1 3 4.25h1.4l.8-1.3h5.6l.8 1.3H13A1.25 1.25 0 0 1 14.25 5.5v6A1.25 1.25 0 0 1 13 12.75H3A1.25 1.25 0 0 1 1.75 11.5v-6Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <circle cx="8" cy="8.4" r="2.4" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const PILL =
  "inline-flex min-h-[44px] items-center justify-center rounded-full px-4 font-sans text-[11px] font-bold uppercase tracking-[0.14em] outline-none transition-colors duration-300 focus-visible:ring-1 focus-visible:ring-accent";

export const Gallery = () => {
  // Only paintings with built AR assets (all 10 today).
  const paintings = useMemo(() => PAINTINGS.filter((p) => hasAr(p.id)), []);
  const [paintingId, setPaintingId] = useState(paintings[0]?.id ?? "");
  const painting: Painting = paintings.find((p) => p.id === paintingId) ?? paintings[0];

  const colourways = painting.colourways;
  const [colourwayName, setColourwayName] = useState(
    (colourways.find((c) => c.isOriginal) ?? colourways[0])?.name ?? "",
  );
  const colourway: Colourway =
    colourways.find((c) => c.name === colourwayName) ??
    colourways.find((c) => c.isOriginal) ??
    colourways[0];

  const [sizeId, setSizeId] = useState<ArSize["id"]>(AR_DEFAULT_SIZE);
  const [frame, setFrame] = useState<ArFrame["id"]>(AR_DEFAULT_FRAME);
  const [arAvailable, setArAvailable] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  // Front (the 3D framed piece) ⇄ Back (the finished print's backing board +
  // Certificate of Authenticity), so a buyer sees exactly what arrives.
  const [view, setView] = useState<"front" | "back">("front");
  // Touch device (phone/tablet) → the camera AR experience. Desktop → the QR
  // hand-off. Defaults to false (desktop / prerender), resolves on mount.
  const [isHandheld, setIsHandheld] = useState(false);

  const arRef = useRef<ArtworkARHandle>(null);

  // When the painting changes, reset to its original colourway.
  const selectPainting = (p: Painting) => {
    setPaintingId(p.id);
    setColourwayName((p.colourways.find((c) => c.isOriginal) ?? p.colourways[0])?.name ?? "");
    setView("front");
  };

  // Roving-tabindex + arrow-key navigation for the radiogroup selectors
  // (colourway / size / frame) — the WAI-ARIA radio pattern: one tab stop per
  // group, arrows move + select, Home/End jump to the ends, focus follows.
  const onRadioKey = (
    e: KeyboardEvent<HTMLButtonElement>,
    count: number,
    index: number,
    pick: (i: number) => void,
  ) => {
    let next: number;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (index + 1) % count;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (index - 1 + count) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    pick(next);
    const sib = e.currentTarget.parentElement?.children?.[next];
    if (sib instanceof HTMLElement) sib.focus();
  };

  // Detect a handheld (phone / tablet) — a coarse pointer OR a known mobile UA.
  // This drives the whole page: camera experience vs desktop QR hand-off.
  useEffect(() => {
    const detect = () => {
      const coarse =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches;
      const ua = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      setIsHandheld(coarse || ua);
    };
    detect();
    const mq = window.matchMedia?.("(pointer: coarse)");
    mq?.addEventListener?.("change", detect);
    return () => mq?.removeEventListener?.("change", detect);
  }, []);

  // Desktop QR (open this exact page on a phone, where the camera AR works).
  useEffect(() => {
    if (isHandheld || qrUrl) return;
    let cancelled = false;
    void (async () => {
      try {
        const href = typeof window !== "undefined" ? window.location.href : "";
        if (!href) return;
        const { default: QRCode } = await import("qrcode");
        const url = await QRCode.toDataURL(href, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 320,
          color: { dark: "#1a1612", light: "#f5efe3" },
        });
        if (!cancelled) setQrUrl(url);
      } catch {
        /* QR is a bonus */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isHandheld, qrUrl]);

  const frameLabel = AR_FRAMES.find((f) => f.id === frame)?.label ?? "";
  const sizeCm = AR_SIZES.find((s) => s.id === sizeId)?.cm;

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-x-clip">
      <Seo
        title="Virtual Exhibition — See it on your wall · The Art of Stephen Meakin"
        description="Point your phone's camera and see any of Stephen Meakin's mandala prints on your own wall, at its exact size, in augmented reality — any colourway, size and frame."
        url="/gallery"
      />
      <SceneBackdrop src="/img/scenes/gallery-clouds-blur-v1.webp" />
      <Nav overlay />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1460px] px-4 sm:px-6 md:px-8 lg:px-12 pt-24 md:pt-28 pb-12 md:pb-16">
        <Reveal as="div" className="text-center">
          <PageMasthead
            eyebrow="The Virtual Exhibition"
            meta="True size · on your wall"
            titleStyle={{ textShadow: "0 3px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
            title={
              <>
                See it on <em className="italic font-normal">your wall</em>.
              </>
            }
          />
        </Reveal>

        {isHandheld ? (
          // ===== PHONE / TABLET — the camera experience =========================
          <Reveal as="div" delay={0.05} className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* PREVIEW — the realistic framed piece (front) ⇄ its certified back */}
            <div className="lg:col-span-7 lg:sticky lg:top-24">
              <div className="relative aspect-square w-full overflow-hidden rounded-sm bg-bg/40 ring-1 ring-white/10">
                <ArtworkAR
                  ref={arRef}
                  painting={painting}
                  colourway={colourway}
                  sizeId={sizeId}
                  frame={frame}
                  onArAvailability={setArAvailable}
                  className="h-full w-full"
                />
                {view === "back" && (
                  <PrintBack painting={painting} colourway={colourway} sizeId={sizeId} frame={frame} />
                )}
                <div
                  role="group"
                  aria-label="View front or back of the framed print"
                  className="absolute right-3 top-3 z-20 inline-flex rounded-full bg-bg/85 p-0.5 ring-1 ring-white/15"
                >
                  {(["front", "back"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={view === v}
                      onClick={() => setView(v)}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.14em] outline-none transition-colors duration-300 focus-visible:ring-1 focus-visible:ring-accent",
                        view === v ? "bg-ink text-bg" : "text-ink-muted hover:text-ink",
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <p className={cn(EYEBROW_MUTED, "mt-4 text-center")} style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
                {painting.title} · {colourway.name} · {frameLabel}
              </p>
            </div>

            {/* CONTROLS */}
            <div className="lg:col-span-5 flex flex-col gap-7">
              {/* Work */}
              <section>
                <p className={cn(EYEBROW, "m-0 mb-3")}>The work</p>
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
                          "h-16 w-16 shrink-0 overflow-hidden rounded-md outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-accent",
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
                <section>
                  <p className={cn(EYEBROW, "m-0 mb-3")}>Colourway · {colourway.name}</p>
                  <div role="radiogroup" aria-label="Colourway" className="flex flex-wrap gap-2.5">
                    {colourways.map((c, i) => {
                      const sel = c.name === colourway.name;
                      return (
                        <button
                          key={c.name}
                          type="button"
                          role="radio"
                          aria-checked={sel}
                          aria-label={c.name}
                          tabIndex={sel ? 0 : -1}
                          onClick={() => setColourwayName(c.name)}
                          onKeyDown={(e) => onRadioKey(e, colourways.length, i, (n) => setColourwayName(colourways[n].name))}
                          className={cn(
                            "h-12 w-12 overflow-hidden rounded-full outline-none ring-1 ring-white/30 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-accent",
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

              {/* Size — the 4 fixed true sizes */}
              <section>
                <p className={cn(EYEBROW, "m-0 mb-3")}>Size · true to scale</p>
                <div role="radiogroup" aria-label="Print size" className="grid grid-cols-2 gap-2.5">
                  {AR_SIZES.map((s, i) => {
                    const sel = s.id === sizeId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={sel}
                        tabIndex={sel ? 0 : -1}
                        onClick={() => setSizeId(s.id)}
                        onKeyDown={(e) => onRadioKey(e, AR_SIZES.length, i, (n) => setSizeId(AR_SIZES[n].id))}
                        className={cn(
                          PILL,
                          "flex-col gap-0.5 py-2 ring-1",
                          sel ? "bg-ink text-bg ring-ink" : "text-ink-muted ring-line hover:text-ink",
                        )}
                      >
                        <span className="text-[12px] tracking-[0.16em]">{s.label}</span>
                        <span className={cn("text-[10px] font-semibold tracking-[0.08em]", sel ? "text-bg/70" : "text-ink/45")}>
                          {s.cm} × {s.cm} cm
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Frame */}
              <section>
                <p className={cn(EYEBROW, "m-0 mb-3")}>Frame · {frameLabel}</p>
                <div role="radiogroup" aria-label="Frame finish" className="flex flex-wrap gap-3">
                  {AR_FRAMES.map((f, i) => {
                    const sel = f.id === frame;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        role="radio"
                        aria-checked={sel}
                        aria-label={f.label}
                        tabIndex={sel ? 0 : -1}
                        onClick={() => setFrame(f.id)}
                        onKeyDown={(e) => onRadioKey(e, AR_FRAMES.length, i, (n) => setFrame(AR_FRAMES[n].id))}
                        className={cn(
                          "inline-flex min-h-[44px] items-center gap-2.5 rounded-full px-3.5 outline-none ring-1 transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-accent",
                          sel ? "ring-accent" : "ring-line hover:ring-ink/40",
                        )}
                      >
                        <span className="h-5 w-5 rounded-full ring-1 ring-black/30" style={{ backgroundColor: f.swatch }} />
                        <span className={cn("font-sans text-[11px] font-bold uppercase tracking-[0.12em]", sel ? "text-ink" : "text-ink-muted")}>
                          {f.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* CTA — launch the real camera AR. ALWAYS shown on a handheld so a
                  flaky capability probe can never hide it (the old bug). */}
              <div className="mt-1 border-t border-line pt-6">
                <button
                  type="button"
                  onClick={() => arRef.current?.activateAR()}
                  className="press inline-flex w-full min-h-[56px] items-center justify-center gap-2.5 rounded-full bg-ink px-8 font-sans text-[12px] font-bold uppercase tracking-[0.18em] text-bg outline-none transition-colors duration-300 hover:bg-accent hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
                  data-cursor-label="See it on your wall"
                >
                  <CameraGlyph />
                  See it on your wall
                </button>
                <p className="mt-3 m-0 font-sans text-[12px] leading-[1.6] text-ink/45">
                  Opens your camera and places the print at {sizeCm} × {sizeCm} cm — its real size — on your wall.
                </p>
                {!arAvailable && (
                  <p className="mt-2 m-0 font-sans text-[12px] leading-[1.6] text-ink/40">
                    If nothing opens, view this page in Safari (iPhone) or Chrome (Android) — AR needs the default browser.
                  </p>
                )}
              </div>
            </div>
          </Reveal>
        ) : (
          // ===== DESKTOP — QR hand-off ONLY ====================================
          <Reveal as="div" delay={0.05} className="mt-10 md:mt-14 flex flex-col items-center text-center">
            <div className="rounded-3xl bg-cream p-4 ring-1 ring-cream-ink/10 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
              {qrUrl ? (
                <img src={qrUrl} alt="QR code — open this page on your phone" width={232} height={232} className="block h-[232px] w-[232px]" />
              ) : (
                <div className="h-[232px] w-[232px]" aria-hidden="true" />
              )}
            </div>
            <p className="mt-7 m-0 font-display text-ink text-[clamp(24px,2.4vw,34px)] leading-[1.1]" style={{ textShadow: "0 2px 16px rgba(0,0,0,0.8)" }}>
              Open it on your phone
            </p>
            <p className="mt-3 m-0 max-w-[460px] font-sans text-[15px] leading-[1.7] text-ink-muted">
              The Virtual Exhibition lives in your phone&rsquo;s camera. Scan the code to place any of Stephen&rsquo;s prints
              on your own wall — any colourway, size and frame — at its exact size, in augmented reality.
            </p>
          </Reveal>
        )}
      </main>

      <FooterCatalogue />
      <Footer />
    </div>
  );
};
