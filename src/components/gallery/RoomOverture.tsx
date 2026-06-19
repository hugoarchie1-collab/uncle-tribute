// =============================================================================
// RoomOverture — the header that opens each of the three exhibition ROOMS.
// -----------------------------------------------------------------------------
// One per COLLECTIONS entry. A centred gallery header (ordinal · N paintings,
// then the collection TITLE, then the collection prose VERBATIM split on \n\n),
// followed by a horizontal, draggable, scroll-snap RAIL of this room's painting
// covers. The rail doubles as jump-nav: clicking a cover smooth-scrolls to its
// exhibition act (scrollIntoView; behaviour "auto" under reduced motion so the
// page never animates a scroll the user asked to suppress).
//
// The rail bleeds to the page gutters with a negative -mx and re-padded inner
// gutter, so the covers run edge-to-edge like a hung wall rather than sitting in
// a centred box. Tile hover = ring-white/8 → group-hover:ring-accent/50 +
// scale-[1.05], the canonical Collections tile hover.
// =============================================================================

import { useRef } from "react";
import { AssetImage } from "../AssetImage";
import { Reveal } from "../Reveal";
import {
  paintingImageAlt,
  type Collection,
  type Painting,
} from "../../data/paintings";
import { cn } from "../../lib/cn";
import { EYEBROW, EYEBROW_MUTED, TITLE, SUBTITLE } from "../ui/tokens";

interface RoomOvertureProps {
  collection: Collection;
  /** This room's paintings, in catalogue order. */
  paintings: Painting[];
  /** Roman numeral of the room (I / II / III). */
  roman: string;
}

const ON_BACKDROP_TITLE_SHADOW =
  "0 3px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)";
const ON_BACKDROP_COPY_SHADOW = "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)";

export const RoomOverture = ({ collection, paintings, roman }: RoomOvertureProps) => {
  // Pointer-drag bookkeeping so the rail can be dragged on desktop (touch
  // already scrolls natively). Refs only — none of this re-renders.
  const railRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; scrollLeft: number; moved: boolean } | null>(
    null,
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Don't hijack touch — native momentum scroll handles it better.
    if (e.pointerType === "touch") return;
    const el = railRef.current;
    if (!el) return;
    drag.current = { startX: e.clientX, scrollLeft: el.scrollLeft, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = railRef.current;
    const d = drag.current;
    if (!el || !d) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 5) {
      d.moved = true;
      el.setPointerCapture?.(e.pointerId);
    }
    el.scrollLeft = d.scrollLeft - dx;
  };

  const endDrag = () => {
    drag.current = null;
  };

  // Click a cover → smooth-scroll to its act. A drag that moved the rail
  // suppresses the click so dragging never accidentally jumps the page.
  const jumpTo = (paintingId: string, e: React.MouseEvent) => {
    if (drag.current?.moved) {
      e.preventDefault();
      return;
    }
    const target = document.getElementById(`act-${paintingId}`);
    if (!target) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="relative mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-16 md:pt-24 pb-2 md:pb-4">
      <Reveal as="header" className="mx-auto max-w-[820px] 3xl:max-w-[980px] text-center">
        <p
          className={cn(EYEBROW, "m-0 mb-4")}
          style={{ textShadow: ON_BACKDROP_COPY_SHADOW }}
        >
          {roman}
          <span className="mx-2 text-ink/35" aria-hidden="true">·</span>
          {paintings.length} {paintings.length === 1 ? "Painting" : "Paintings"}
        </p>
        <h2
          className={cn(TITLE, "max-w-[820px] 3xl:max-w-[980px] mx-auto my-0")}
          style={{ textShadow: ON_BACKDROP_TITLE_SHADOW }}
        >
          {collection.title}
        </h2>
        <div
          className={cn(
            SUBTITLE,
            "mt-5 md:mt-6 flex flex-col gap-4 max-w-[640px] 3xl:max-w-[760px] mx-auto",
          )}
          style={{ textShadow: ON_BACKDROP_COPY_SHADOW }}
        >
          {collection.description.split("\n\n").map((para, i) => (
            <p key={i} className="m-0">
              {para}
            </p>
          ))}
        </div>
      </Reveal>

      {/* JUMP-NAV RAIL — draggable, scroll-snap, bleeding to the gutters. */}
      <Reveal as="div" delay={0.06} className="mt-9 md:mt-12">
        <p className={cn(EYEBROW_MUTED, "m-0 mb-4 text-center")}>
          The room at a glance
        </p>
        <div
          ref={railRef}
          role="list"
          aria-label={`Jump to a work in ${collection.title.split(" — ")[0]}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
          className={cn(
            // Bleed to the page gutters, then re-pad the inner edge so the first
            // and last covers sit at the gutter rather than under it.
            "-mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 px-4 sm:px-6 md:px-8 lg:px-12",
            "flex gap-4 md:gap-5 overflow-x-auto overflow-y-hidden",
            "snap-x snap-mandatory scroll-px-4 sm:scroll-px-6 md:scroll-px-8 lg:scroll-px-12",
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
            "cursor-grab active:cursor-grabbing select-none touch-pan-x",
          )}
        >
          {paintings.map((painting) => {
            const cover =
              painting.colourways.find((c) => c.isOriginal) ?? painting.colourways[0];
            return (
              <div
                key={painting.id}
                role="listitem"
                className="shrink-0 snap-start w-[148px] sm:w-[172px] md:w-[200px] 3xl:w-[232px]"
              >
              <a
                href={`#act-${painting.id}`}
                onClick={(e) => jumpTo(painting.id, e)}
                aria-label={`Jump to ${painting.title}`}
                className="group block"
              >
                <div className="aspect-square overflow-hidden ring-1 ring-white/8 transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
                  <div className="relative w-full h-full transition-transform duration-700 group-hover:scale-[1.05]">
                    <AssetImage
                      src={cover.image}
                      alt={paintingImageAlt(painting.title, cover.name)}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      sizes="(min-width: 768px) 200px, 172px"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <p
                  className="pt-3 text-center font-display font-semibold text-[14px] md:text-[15px] leading-[1.25] tracking-[-0.01em] text-ink m-0 transition-colors duration-300 group-hover:text-accent"
                  style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
                >
                  {painting.title}
                </p>
              </a>
              </div>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
};
