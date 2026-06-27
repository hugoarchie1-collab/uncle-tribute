// =============================================================================
// /gallery — The Virtual Exhibition. A CAMERA-ONLY experience.
// -----------------------------------------------------------------------------
// This page exists ONLY to put a piece on your real wall through your phone's
// camera. It is deliberately minimal — a QR barcode + one button:
//
//   • PHONE / TABLET: a barcode + a big "Open the camera" button. The button
//     opens a full-screen LIVE camera popup (LiveWallCamera) where you browse
//     EVERY painting, colourway, size and frame on your wall in one session,
//     switching everything live without leaving the camera.
//   • DESKTOP (no useful rear camera): the barcode is the hand-off — scan it to
//     open this page on your phone. A quiet "preview on this screen" link can
//     still open the popup (it falls back to a gallery-wall ground).
//
// The whole catalogue/buy UI lives on the product pages — this page never
// repeats it. The configurator now lives INSIDE the camera popup.
// =============================================================================

import { useEffect, useState } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { PageMasthead } from "../components/PageMasthead";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { LiveWallCamera } from "../components/gallery/LiveWallCamera";
import { PAINTINGS } from "../data/paintings";
import { cn } from "../lib/cn";
import { EYEBROW_MUTED } from "../components/ui/tokens";

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

export const Gallery = () => {
  // The flat camera overlay only needs each colourway's image, so EVERY
  // painting is available here (no dependency on the baked native-AR assets).
  const paintings = PAINTINGS;

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  // Touch device (phone/tablet) → lead with the camera button. Desktop → lead
  // with the QR hand-off. Defaults false (desktop / prerender), resolves on mount.
  const [isHandheld, setIsHandheld] = useState(false);

  // Detect a handheld (phone / tablet) — a coarse pointer OR a known mobile UA.
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

  // QR encodes this exact page so it can be opened on a phone (desktop hand-off)
  // or shared. Generated on both — harmless on mobile, the hand-off on desktop.
  useEffect(() => {
    if (qrUrl) return;
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
  }, [qrUrl]);

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-x-clip">
      <Seo
        title="Virtual Exhibition — See it on your wall · The Art of Stephen Meakin"
        description="Point your phone's camera and see any of Stephen Meakin's mandala prints on your own wall — browse every painting, colourway, size and frame, live, in augmented reality."
        url="/gallery"
      />
      <SceneBackdrop src="/img/scenes/gallery-clouds-blurheavy-v1.webp" />
      <Nav overlay />

      <main className="relative z-10 flex flex-1 flex-col mx-auto w-full max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 pt-24 md:pt-28 pb-12 md:pb-16">
        <Reveal as="div" className="text-center">
          <PageMasthead
            eyebrow="The Virtual Exhibition"
            meta="True size · on your wall"
            titleStyle={{ textShadow: "0 3px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
            title={
              <>
                See it on <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>your wall</em>.
              </>
            }
          />
        </Reveal>

        <Reveal as="div" delay={0.05} className="mt-10 md:mt-14 flex flex-col items-center text-center">
          {/* The barcode */}
          <div className="rounded-3xl bg-cream p-4 ring-1 ring-cream-ink/10 shadow-[0_24px_70px_rgba(0,0,0,0.5)]">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR code — open this exhibition on your phone"
                width={208}
                height={208}
                className="block h-[176px] w-[176px] sm:h-[208px] sm:w-[208px]"
              />
            ) : (
              <div className="h-[176px] w-[176px] sm:h-[208px] sm:w-[208px]" aria-hidden="true" />
            )}
          </div>

          {isHandheld ? (
            // ===== PHONE / TABLET — the camera popup is the experience ==========
            <>
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="press mt-8 inline-flex w-full max-w-[420px] min-h-[58px] items-center justify-center gap-2.5 rounded-full bg-ink px-8 font-sans text-[13px] font-bold tracking-[0.04em] text-bg outline-none transition-colors duration-300 hover:bg-accent hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
                data-cursor-label="Open the camera"
              >
                <CameraGlyph />
                Open the camera
              </button>
              <p className="mt-4 m-0 max-w-[440px] font-sans text-[14px] leading-[1.65] text-ink-muted" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
                Point at your wall and browse <em className="not-italic text-ink">every</em> painting, colourway,
                size and frame — switching them all live, right on the wall.
              </p>
            </>
          ) : (
            // ===== DESKTOP — the barcode is the hand-off =======================
            <>
              <p className="mt-7 m-0 font-display text-ink text-[clamp(24px,2.4vw,34px)] leading-[1.1]" style={{ textShadow: "0 2px 16px rgba(0,0,0,0.8)" }}>
                Open it on your phone
              </p>
              <p className="mt-3 m-0 max-w-[460px] font-sans text-[15px] leading-[1.7] text-ink-muted">
                The Virtual Exhibition lives in your phone&rsquo;s camera. Scan the code to browse every one of
                Stephen&rsquo;s prints on your own wall — any colourway, size and frame — live, right on the wall.
              </p>
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="press mt-7 inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-full px-6 font-sans text-[12px] font-bold tracking-[0.04em] text-ink-muted outline-none ring-1 ring-line transition-colors duration-300 hover:text-ink hover:ring-ink/40 focus-visible:ring-2 focus-visible:ring-accent"
              >
                <CameraGlyph />
                Preview on this screen
              </button>
            </>
          )}

          <p className={cn(EYEBROW_MUTED, "mt-8")} style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
            A flat preview to judge scale &amp; framing · the print itself is true giclée
          </p>
        </Reveal>
      </main>

      <FooterCatalogue />
      <Footer />

      {cameraOpen && (
        <LiveWallCamera paintings={paintings} onClose={() => setCameraOpen(false)} />
      )}
    </div>
  );
};
