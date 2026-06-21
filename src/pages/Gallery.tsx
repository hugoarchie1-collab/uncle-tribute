// =============================================================================
// /gallery — The Virtual Exhibition (true-size AR configurator).
// -----------------------------------------------------------------------------
// NOT a catalogue. Pick a work + colourway + one of the 4 real print sizes + a
// frame, see it as a realistic framed piece, then "See it on your wall" launches
// the device's REAL AR (iOS Quick Look / Android Scene Viewer / WebXR) — the
// framed print placed at its EXACT catalogue size, locked (no zoom). Desktop →
// a QR to open it on a phone (where the camera AR works).
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
  <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
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

  const arRef = useRef<ArtworkARHandle>(null);

  // When the painting changes, reset to its original colourway.
  const selectPainting = (p: Painting) => {
    setPaintingId(p.id);
    setColourwayName((p.colourways.find((c) => c.isOriginal) ?? p.colourways[0])?.name ?? "");
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

  // Desktop QR (open this exact page on a phone, where AR works).
  useEffect(() => {
    if (arAvailable || qrUrl) return;
    let cancelled = false;
    void (async () => {
      try {
        const href = typeof window !== "undefined" ? window.location.href : "";
        if (!href) return;
        const { default: QRCode } = await import("qrcode");
        const url = await QRCode.toDataURL(href, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 220,
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
  }, [arAvailable, qrUrl]);

  const frameLabel = AR_FRAMES.find((f) => f.id === frame)?.label ?? "";

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-x-clip">
      <Seo
        title="Virtual Exhibition — See it on your wall · The Art of Stephen Meakin"
        description="See Stephen Meakin's mandala paintings on your own wall at their true size, in augmented reality — choose the colourway, the print size and the frame, then place it in your room."
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

        <Reveal as="div" delay={0.05} className="mt-9 md:mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* PREVIEW — the realistic framed 3D piece */}
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

            {/* CTA — launch real AR, or the desktop QR */}
            <div className="mt-1 border-t border-line pt-6">
              {arAvailable ? (
                <button
                  type="button"
                  onClick={() => arRef.current?.activateAR()}
                  className="press inline-flex w-full min-h-[54px] items-center justify-center gap-2.5 rounded-full bg-ink px-8 font-sans text-[12px] font-bold uppercase tracking-[0.18em] text-bg outline-none transition-colors duration-300 hover:bg-accent hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
                  data-cursor-label="See it on your wall"
                >
                  <CameraGlyph />
                  See it on your wall
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  {qrUrl && (
                    <div className="shrink-0 rounded-2xl bg-cream p-2.5 ring-1 ring-cream-ink/10">
                      <img src={qrUrl} alt="QR code — open this on your phone" width={104} height={104} className="block" />
                    </div>
                  )}
                  <div>
                    <p className="m-0 font-display text-ink text-[clamp(18px,1.4vw,22px)] leading-[1.15]">
                      Open it on your phone
                    </p>
                    <p className="mt-1.5 m-0 font-sans text-[13.5px] leading-[1.6] text-ink-muted">
                      Scan the code to place this framed print on your own wall, at its true size, in AR.
                    </p>
                  </div>
                </div>
              )}
              <p className="mt-4 m-0 font-sans text-[12px] leading-[1.6] text-ink/45">
                Shown at the exact print size — {AR_SIZES.find((s) => s.id === sizeId)?.cm} × {AR_SIZES.find((s) => s.id === sizeId)?.cm} cm. Best on a phone or tablet.
              </p>
            </div>
          </div>
        </Reveal>
      </main>

      <FooterCatalogue />
      <Footer />
    </div>
  );
};
