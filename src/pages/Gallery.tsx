// =============================================================================
// /gallery — The Virtual Exhibition.
// -----------------------------------------------------------------------------
// NOT a catalogue (that's /collections). This page is the CAMERA: one clear
// "Open the camera" moment that launches CameraAR — point your phone at a wall
// and see any of Stephen's works in your own room, flipping through them all on
// a strip. No camera (desktop) → CameraAR shows a clean "open it on your phone"
// page with a QR.
// =============================================================================

import { useMemo, useState } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { PageMasthead } from "../components/PageMasthead";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { CameraAR, type CameraAROption } from "../components/CameraAR";
import { PAINTINGS } from "../data/paintings";
import { cn } from "../lib/cn";
import { EYEBROW_MUTED, SUBTITLE } from "../components/ui/tokens";

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

export const Gallery = () => {
  const [open, setOpen] = useState(false);

  // Every work — its original colourway — to flip through inside the camera.
  const options: CameraAROption[] = useMemo(
    () =>
      PAINTINGS.map((painting) => ({
        painting,
        colourway: painting.colourways.find((c) => c.isOriginal) ?? painting.colourways[0],
      })),
    [],
  );

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-x-clip">
      <Seo
        title="Virtual Exhibition — See it on your wall · The Art of Stephen Meakin"
        description="Point your phone's camera at your wall and see Stephen Meakin's mandala paintings in your own room — in augmented reality. The Virtual Exhibition."
        url="/gallery"
      />
      <SceneBackdrop src="/img/scenes/born-in-the-sky-blur-v2.webp" />
      <Nav overlay />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 pt-24 pb-16 md:pt-28">
        <Reveal as="div" className="w-full max-w-[860px] text-center">
          <PageMasthead
            eyebrow="The Virtual Exhibition"
            meta="Augmented reality · on your wall"
            titleStyle={{ textShadow: "0 3px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
            title={
              <>
                See it on <em className="italic font-normal">your wall</em>.
              </>
            }
          >
            <p
              className={cn(SUBTITLE, "mx-auto mt-6 md:mt-7 max-w-[620px] text-center")}
              style={{ textShadow: "0 2px 14px rgba(0,0,0,0.85)" }}
            >
              Point your phone's camera at a wall and place any of Stephen's works in your own
              room — drag it to where you'd hang it, and flip through them all.
            </p>

            <div className="mt-9 md:mt-10 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="press inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-ink px-8 font-sans text-[12px] font-bold uppercase tracking-[0.18em] text-bg outline-none transition-colors duration-300 hover:bg-accent hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
                data-cursor-label="Open the camera"
              >
                <CameraGlyph />
                Open the camera
              </button>
              <p className={cn(EYEBROW_MUTED, "m-0 tracking-[0.2em]")} style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
                Works best on your phone
              </p>
            </div>
          </PageMasthead>
        </Reveal>
      </main>

      {open && (
        <CameraAR open={open} onClose={() => setOpen(false)} options={options} />
      )}

      <FooterCatalogue />
      <Footer />
    </div>
  );
};
