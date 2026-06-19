// =============================================================================
// Gallery — the Virtual Gallery / Exhibition. A cinematic online viewing room.
// -----------------------------------------------------------------------------
// Stephen's complete body of work, hung as a single exhibition: ONE painting per
// viewport, grouped by the three collections (rooms). This is NOT /collections
// (the 10-tile shop grid) — it is a Zwirner/Gagosian online-viewing-room: each
// work given a wall of its own, generous black, the art the only loud thing.
//
// STRUCTURE
//   masthead → [ Room I overture → its acts ] → seam → [ Room II … ] → seam →
//   [ Room III … ] → curatorial close. A fixed right-edge ExhibitionProgress
//   (lg-only) indexes the ten acts. ONE page-level CloserLook (not ten) is driven
//   by a {open, painting, colourway} state object + the active plate's <img> ref.
//
// All curatorial framing is estate-voice; the only words attributed to Stephen
// are VERBATIM slices of his painting descriptions (via ExhibitionAct's
// firstSentence) — never an invented line.
// =============================================================================

import { useState, type RefObject } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { PageMasthead } from "../components/PageMasthead";
import { Reveal } from "../components/Reveal";
import { MagneticLink } from "../components/MagneticLink";
import { CloserLook } from "../components/CloserLook";
import { Seo } from "../components/Seo";
import { ExhibitionAct } from "../components/gallery/ExhibitionAct";
import { RoomOverture } from "../components/gallery/RoomOverture";
import { ExhibitionProgress } from "../components/gallery/ExhibitionProgress";
import {
  COLLECTIONS,
  getPaintingsByCollection,
  paintingImageAlt,
  type Colourway,
  type Painting,
} from "../data/paintings";
import { cn } from "../lib/cn";
import { BTN_PRIMARY, BTN_SECONDARY, EYEBROW, EYEBROW_MUTED, TITLE, SUBTITLE } from "../components/ui/tokens";

const ROOM_ROMAN = ["I", "II", "III"] as const;

const ON_BACKDROP_TITLE_SHADOW =
  "0 3px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)";
const ON_BACKDROP_COPY_SHADOW = "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)";

/** The page-level CloserLook state — which plate is open for deep zoom. */
interface CloserLookState {
  open: boolean;
  painting: Painting | null;
  colourway: Colourway | null;
  sourceImgRef: RefObject<HTMLImageElement | null> | null;
}

export const Gallery = () => {
  // ONE CloserLook for the whole page. An act asks it to open with its plate's
  // painting + colourway + the live <img> ref (so the deep-zoom fit is exact).
  const [closer, setCloser] = useState<CloserLookState>({
    open: false,
    painting: null,
    colourway: null,
    sourceImgRef: null,
  });

  const openCloser = (args: {
    painting: Painting;
    colourway: Colourway;
    sourceImgRef: RefObject<HTMLImageElement | null>;
  }) => setCloser({ open: true, ...args });

  const closeCloser = () => setCloser((s) => ({ ...s, open: false }));

  // The ten acts, in exhibition order (collection order, catalogue order within).
  // Pre-flattened so the progress rail + the act loop share one ordering.
  const rooms = COLLECTIONS.map((collection, roomIndex) => ({
    collection,
    roman: ROOM_ROMAN[roomIndex] ?? String(roomIndex + 1),
    paintings: getPaintingsByCollection(collection.id),
  }));
  const orderedPaintings: Painting[] = rooms.flatMap((r) => r.paintings);

  return (
    <div className="relative">
      <Seo
        title="Virtual Gallery — The Exhibition · The Art of Stephen Meakin"
        description="Walk the complete exhibition of Stephen Meakin's ten mandala paintings — a cinematic online viewing room. See each work at scale, then on your own wall."
        url="/gallery"
      />
      {/* Reuse the proven-dark born-in-the-sky nebula (the σ6 wash everything is
          matched to) — no new bright backdrop introduced. */}
      <SceneBackdrop src="/img/scenes/born-in-the-sky-blur-v2.webp" />
      <Nav overlay />

      {/* Right-edge act index (lg-only; pointer-events-none wrapper). */}
      <ExhibitionProgress
        paintingIds={orderedPaintings.map((p) => p.id)}
        titles={orderedPaintings.map((p) => p.title)}
      />

      <main className="relative z-10">
        {/* MASTHEAD — the viewing room front cover. */}
        <Reveal
          as="div"
          className="relative mx-auto max-w-[1100px] 2xl:max-w-[1240px] 3xl:max-w-[1420px] 4xl:max-w-[1640px] px-4 sm:px-6 md:px-8 lg:px-12 pt-24 md:pt-28 pb-6 md:pb-10"
        >
          <PageMasthead
            eyebrow="The viewing room"
            meta="Ten works · Three rooms"
            titleStyle={{ textShadow: ON_BACKDROP_TITLE_SHADOW }}
            title={
              <>
                The <em className="italic font-normal">exhibition</em>
              </>
            }
          >
            <div className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-5 items-start border-t border-line pt-6 md:pt-7">
              <p
                className="lg:col-span-7 font-display font-normal tracking-[-0.012em] text-ink m-0"
                style={{
                  fontVariationSettings: '"opsz" 40, "wght" 400',
                  fontSize: "clamp(20px, 2.3vw, 38px)",
                  lineHeight: 1.36,
                  textShadow: ON_BACKDROP_COPY_SHADOW,
                }}
              >
                Stephen's complete body of work, hung as a single exhibition — each
                painting given a wall of its own.
              </p>
              <p
                className="lg:col-span-5 lg:pt-1.5 font-sans font-normal text-[15px] md:text-[clamp(16px,0.9vw,20px)] leading-[1.75] text-ink-muted m-0"
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
              >
                Move through the rooms at your own pace. See any work at the scale it
                was painted, then place it on your own wall before you decide.
              </p>
            </div>
          </PageMasthead>
        </Reveal>

        {/* THE THREE ROOMS. */}
        {rooms.map((room, roomIndex) => (
          <section
            key={room.collection.id}
            id={`room-${room.collection.id}`}
            aria-label={room.collection.title}
          >
            <RoomOverture
              collection={room.collection}
              paintings={room.paintings}
              roman={room.roman}
            />

            {/* This room's exhibition acts. */}
            {room.paintings.map((painting) => {
              // The act's index WITHIN THE WHOLE exhibition (0–9).
              const actIndex = orderedPaintings.findIndex((p) => p.id === painting.id);
              return (
                <ExhibitionAct
                  key={painting.id}
                  painting={painting}
                  actIndex={actIndex}
                  roomRoman={room.roman}
                  onCloserLook={openCloser}
                />
              );
            })}

            {/* ACT SEAM — a hairline + "Next room · {name}" between rooms (not
                after the last room, which flows into the curatorial close). */}
            {roomIndex < rooms.length - 1 && (
              <div className="mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-14">
                <div className="flex items-center gap-5 md:gap-7">
                  <span aria-hidden="true" className="h-px flex-1 bg-ink/15" />
                  <p
                    className={cn(EYEBROW_MUTED, "m-0 shrink-0")}
                    style={{ textShadow: ON_BACKDROP_COPY_SHADOW }}
                  >
                    Next room
                    <span className="mx-2 text-ink/35" aria-hidden="true">·</span>
                    {rooms[roomIndex + 1].collection.title.split(" — ")[0]}
                  </p>
                  <span aria-hidden="true" className="h-px flex-1 bg-ink/15" />
                </div>
              </div>
            )}
          </section>
        ))}

        {/* CURATORIAL CLOSE — take one of Stephen's works home. No scarcity,
            no urgency. "Estate-stamped", never "signed" (Stephen is deceased). */}
        <Reveal
          as="section"
          className="relative mx-auto w-full max-w-[860px] 2xl:max-w-[980px] 3xl:max-w-[1100px] px-4 sm:px-6 md:px-8 lg:px-12 pt-12 md:pt-16 pb-16 md:pb-24 text-center"
        >
          <p
            className={cn(EYEBROW, "m-0 mb-5")}
            style={{ textShadow: ON_BACKDROP_COPY_SHADOW }}
          >
            End of the exhibition
          </p>
          <h2
            className={cn(TITLE, "max-w-[760px] mx-auto my-0")}
            style={{ textShadow: ON_BACKDROP_TITLE_SHADOW }}
          >
            Take one of Stephen's works home.
          </h2>
          <p
            className={cn(SUBTITLE, "mt-5 md:mt-6 max-w-[620px] mx-auto my-0")}
            style={{ textShadow: ON_BACKDROP_COPY_SHADOW }}
          >
            Every work is offered as an estate-stamped giclée print, made to order on
            archival paper and numbered within its edition. Walk back into any room, or
            begin with the collection.
          </p>
          <div className="mt-8 md:mt-10 flex flex-wrap items-center justify-center gap-3">
            <MagneticLink
              to="/collections"
              className={cn(BTN_PRIMARY, "gap-2")}
              ariaLabel="Visit the collection"
            >
              Visit the collection <span aria-hidden="true">→</span>
            </MagneticLink>
            <MagneticLink
              to="/about"
              className={cn(BTN_SECONDARY, "gap-2")}
              ariaLabel="About Stephen"
            >
              About Stephen
            </MagneticLink>
          </div>
        </Reveal>
      </main>

      {/* ONE page-level deep-zoom viewer, driven by the active plate. */}
      {closer.painting && closer.colourway && (
        <CloserLook
          open={closer.open}
          onClose={closeCloser}
          imageSrc={closer.colourway.image}
          alt={paintingImageAlt(closer.painting.title, closer.colourway.name)}
          paintingTitle={closer.painting.title}
          colourwayName={closer.colourway.name}
          sourceImgRef={closer.sourceImgRef ?? undefined}
        />
      )}

      <FooterCatalogue />
      <Footer />
    </div>
  );
};
