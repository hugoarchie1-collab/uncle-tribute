// =============================================================================
// ExhibitionAct — ONE work, given a wall of its own. The core of the gallery.
// -----------------------------------------------------------------------------
// A min-h-[100svh] viewing-room "act": the painting held large on the left
// (lg:col-span-7), a quiet gallery WALL LABEL on the right (lg:col-span-5),
// vertically centred, stacking on mobile. The art LEADS — the wall-label title
// is deliberately smaller than the page masthead so the painting is the only
// loud thing.
//
// MOTION: a per-act scroll tie (useScroll over the act) gently brings the plate
// up to rest as it enters — scale 0.96→1, y 24→0, opacity 0.4→1 — every transform
// short-circuited to a static value under useReducedMotion (CLAUDE.md gotcha #1:
// scroll props are transform/opacity only, and reduced-motion must kill them).
//
// CTAs wire the REAL components built in parallel by teammates:
//   - RoomVisualizerSlot  "See it on your wall"      (BTN_PRIMARY → RoomVisualizerModal)
//   - "Closer look"        BTN_SECONDARY → the page-level CloserLook (one mount)
//   - ArSlot               quiet "View in your room (AR)" link, or null
// The page owns the CloserLook; this act only ASKS it to open with this plate's
// painting + colourway + the live <img> ref (so the deep-zoom fit is exact).
// =============================================================================

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { RoomVisualizerSlot } from "./RoomVisualizerSlot";
import { ArSlot } from "./ArSlot";
import {
  COLLECTIONS,
  parseSizeCm,
  paintingImageAlt,
  type Colourway,
  type Painting,
} from "../../data/paintings";
import { firstSentence } from "../../lib/seo";
import { asset, webp, webpSrcSet } from "../../lib/asset";
import { cn } from "../../lib/cn";
import { BTN_SECONDARY, EYEBROW_MUTED } from "../ui/tokens";

interface ExhibitionActProps {
  painting: Painting;
  /** Zero-based index of this act WITHIN THE WHOLE EXHIBITION (0–9). */
  actIndex: number;
  /** Roman numeral of the painting's room (I / II / III). */
  roomRoman: string;
  /** Open the page-level CloserLook on this plate. */
  onCloserLook: (args: {
    painting: Painting;
    colourway: Colourway;
    sourceImgRef: React.RefObject<HTMLImageElement | null>;
  }) => void;
}

// Tiny carved legibility shadow on the cream type over the fixed nebula backdrop
// — the same on-backdrop register the scene pages carry on title + copy.
const ON_BACKDROP_TITLE_SHADOW =
  "0 3px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)";
const ON_BACKDROP_COPY_SHADOW = "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)";

export const ExhibitionAct = ({
  painting,
  actIndex,
  roomRoman,
  onCloserLook,
}: ExhibitionActProps) => {
  const reduceMotion = useReducedMotion();
  const actRef = useRef<HTMLElement | null>(null);
  const plateImgRef = useRef<HTMLImageElement | null>(null);

  // Per-act scroll progress — the plate settles up to rest as the act enters.
  const { scrollYProgress } = useScroll({
    target: actRef,
    offset: ["start end", "end start"],
  });
  // EVERY scroll transform short-circuits to a static value under reduced motion
  // (reduceMotion ? [a, a] : […]) so the spring is GPU transform/opacity only and
  // never runs when the user has asked for stillness.
  const scale = useTransform(
    scrollYProgress,
    reduceMotion ? [0, 1] : [0, 0.4],
    reduceMotion ? [1, 1] : [0.96, 1],
  );
  const y = useTransform(
    scrollYProgress,
    reduceMotion ? [0, 1] : [0, 0.4],
    reduceMotion ? [0, 0] : [24, 0],
  );
  const opacity = useTransform(
    scrollYProgress,
    reduceMotion ? [0, 1] : [0, 0.4],
    reduceMotion ? [1, 1] : [0.4, 1],
  );

  // Cover = the original colourway (the version Stephen left as canonical).
  const cover = painting.colourways.find((c) => c.isOriginal) ?? painting.colourways[0];

  // Aspect from the real catalogued size: Ophiuchus (60 × 80) is portrait,
  // every other mandala is square. Falls back to a square if size is absent.
  const dims = parseSizeCm(painting.size ?? "");
  const ratio = dims ? `${dims.w} / ${dims.h}` : "1 / 1";

  // The wall-label "year" line falls back to the collection short name for any
  // piece whose year is a placeholder (e.g. Enneagon — The Swans, "[ DATE ]").
  const collectionShort =
    COLLECTIONS.find((c) => c.id === painting.collection)?.title.split(" — ")[0] ?? "";
  const hasYear = painting.year && painting.year !== "[ DATE ]";
  const yearOrCollection = hasYear ? painting.year : collectionShort;

  // ONE curatorial line — a VERBATIM slice of Stephen's description (first
  // sentence), never an invented line.
  const curatorialLine = firstSentence(painting.description);

  // The spec line: catalogued size · where it was painted (location omitted when
  // the painting carries none).
  const specParts = [painting.size, painting.location].filter(Boolean) as string[];

  return (
    <section
      ref={actRef}
      id={`act-${painting.id}`}
      className="relative flex min-h-[100svh] items-center scroll-mt-24"
    >
      <div className="mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-14 lg:gap-16 items-center">
          {/* PLATE — the painting, held large in a hairline frame. The whole
              plate is the deep-zoom trigger. */}
          <motion.div
            className="lg:col-span-7 order-1"
            style={{ scale, y, opacity }}
          >
            <button
              type="button"
              onClick={() =>
                onCloserLook({ painting, colourway: cover, sourceImgRef: plateImgRef })
              }
              data-cursor-label="Closer look"
              aria-label={`Look closer at ${painting.title}`}
              className="group relative block w-full mx-auto cursor-zoom-in"
              style={{ maxWidth: "clamp(320px, 72vw, 760px)" }}
            >
              <div
                className="relative overflow-hidden ring-1 ring-white/10 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.85)] transition-all duration-500 group-hover:ring-accent/40"
                style={{ aspectRatio: ratio }}
              >
                {/* Raw <picture> (not AssetImage) so the live <img> ref reaches
                    CloserLook for an exact deep-zoom fit — the PaintingDetail
                    hero pattern. webp srcSet with a JPG fallback. */}
                <picture>
                  <source
                    srcSet={webpSrcSet(cover.image) ?? asset(webp(cover.image))}
                    sizes="(min-width: 1024px) 58vw, 92vw"
                    type="image/webp"
                  />
                  <img
                    ref={plateImgRef}
                    src={asset(cover.image)}
                    alt={paintingImageAlt(painting.title, cover.name)}
                    loading={actIndex < 2 ? "eager" : "lazy"}
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
                  />
                </picture>
              </div>
            </button>
          </motion.div>

          {/* WALL LABEL — the gallery register: ordinal · year, a smaller title
              than the masthead (the art leads), the spec line, ONE curatorial
              line, then the CTAs. */}
          <div className="lg:col-span-5 order-2 max-w-[46ch]">
            <p
              className={cn(EYEBROW_MUTED, "m-0 mb-4")}
              style={{ textShadow: ON_BACKDROP_COPY_SHADOW }}
            >
              {roomRoman}
              <span className="mx-2 text-ink/35" aria-hidden="true">·</span>
              {yearOrCollection}
            </p>

            <h3
              className="font-display font-semibold tracking-[-0.02em] text-ink m-0 text-balance"
              style={{
                fontSize: "clamp(28px, 3.2vw, 52px)",
                lineHeight: 1.08,
                textShadow: ON_BACKDROP_TITLE_SHADOW,
              }}
            >
              {painting.title}
            </h3>

            {specParts.length > 0 && (
              <p
                className={cn(EYEBROW_MUTED, "mt-4 m-0 tracking-[0.22em]")}
                style={{ textShadow: ON_BACKDROP_COPY_SHADOW }}
              >
                {specParts.join(" · ")}
              </p>
            )}

            <p
              className="mt-5 md:mt-6 font-sans font-normal text-[clamp(16px,1vw,21px)] leading-[1.65] text-ink-muted m-0 max-w-[46ch]"
              style={{ textShadow: ON_BACKDROP_COPY_SHADOW }}
            >
              {curatorialLine}
            </p>

            {/* CTAs — wall to your wall, the deep-zoom, and (if it exists) AR. */}
            <div className="mt-7 md:mt-8 flex flex-wrap items-center gap-3">
              <RoomVisualizerSlot painting={painting} colourway={cover} />
              <button
                type="button"
                onClick={() =>
                  onCloserLook({ painting, colourway: cover, sourceImgRef: plateImgRef })
                }
                className={cn(BTN_SECONDARY, "gap-2")}
                data-cursor-label="Closer look"
              >
                Closer look
              </button>
            </div>

            {/* AR — a quiet text affordance below the pills, or nothing. */}
            <div className="mt-5">
              <ArSlot painting={painting} cover={cover} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
