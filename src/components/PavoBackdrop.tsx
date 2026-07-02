import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "framer-motion";
import { asset } from "../lib/asset";

/**
 * PavoBackdrop — the Home + About "Pavo tapestry" (Hugo 2026-07-02).
 *
 * EVERY colourway of the Pavo (Peacock Minerva) painting, ZOOMED OUT so the
 * whole canvas is visible, crossfading colourway→colourway on page scroll —
 * never a zoomed-in blurry wash ("multi coloured blurry mess" is the failure
 * mode this replaces). Each colourway is TWO pre-baked layers (no runtime CSS
 * blur — the scroll-perf rule):
 *
 *   pavo-<c>-fill-v1.webp   heavy-blur ambient wash of the same painting,
 *                           rendered bg-cover as the surround;
 *   pavo-<c>-whole-v1.webp  the ENTIRE painting, light sigma-3.5 blur
 *                           (clearly reads as the painting; text stays legible
 *                           over the veils), feathered alpha edge so it melts
 *                           seamlessly into the fill — object-contain sized
 *                           min(92svh, 94vw) so the FULL canvas shows at every
 *                           viewport, portrait or landscape.
 *
 * All ten assets are brightness-NORMALISED to one family target (whole ≈ luma
 * 62, fill ≈ 44) so the crossfade never jumps bright→dark — that normalisation
 * is what lets Sahara Sand Yellow + Mary Pink (source luma ~170) sit in the
 * same seamless sequence as Persian Indigo (~71) without a per-colourway
 * darken layer.
 *
 * Home and About render the EXACT same five colourways in the same order
 * (Hugo: "the home and about page backgrounds are exact same of all pavo
 * paintings"); only the crossfade BANDS differ per page, tuned so each colour
 * turn lands on that page's act seams. Pass 4 [start,end] fade windows.
 *
 * Render as a child of the page root (fixed, z-0); content sits at z-10.
 */

// NOT exported: keeping this file component-only satisfies react-refresh/
// only-export-components (the PavoFades type export is erased at runtime).
const PAVO_COLOURWAYS = [
  { slug: "persian-indigo", name: "Persian Indigo" },
  { slug: "blood-moon-red", name: "Blood Moon Red" },
  { slug: "sahara-sand-yellow", name: "Sahara Sand Yellow" },
  { slug: "moroccan-purple", name: "Moroccan Purple" },
  { slug: "mary-pink", name: "Mary Pink" }, // closes the page (finale invariant)
] as const;

export type PavoFades = [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
];

/** One colourway: fill + whole painting, faded as a single composited unit. */
const PavoLayer = ({
  slug,
  name,
  index,
  fades,
  scrollYProgress,
  reduceMotion,
}: {
  slug: string;
  name: string;
  index: number;
  fades: PavoFades;
  scrollYProgress: MotionValue<number>;
  reduceMotion: boolean | null;
}) => {
  // Layer i is full between the end of fade i-1 and the start of fade i;
  // first holds from the top, last holds to the foot.
  let frames: number[];
  let vals: number[];
  if (index === 0) {
    frames = [0, fades[0][0], fades[0][1]];
    vals = [1, 1, 0];
  } else if (index === PAVO_COLOURWAYS.length - 1) {
    frames = [fades[3][0], fades[3][1], 1];
    vals = [0, 1, 1];
  } else {
    frames = [
      fades[index - 1][0],
      fades[index - 1][1],
      fades[index][0],
      fades[index][1],
    ];
    vals = [0, 1, 1, 0];
  }
  const opacity = useTransform(scrollYProgress, frames, vals);
  // Cull from compositing the instant fully transparent — the per-frame
  // scroll-jank fix (a hidden layer leaves the GPU layer tree entirely).
  const visibility = useTransform(opacity, (v: number): "visible" | "hidden" =>
    v < 0.004 ? "hidden" : "visible",
  );

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        // prefers-reduced-motion: hold the opening colourway static instead of
        // colour-shifting the viewport every scroll frame (CLAUDE.md convention).
        opacity: reduceMotion ? (index === 0 ? 1 : 0) : opacity,
        visibility: reduceMotion
          ? index === 0
            ? "visible"
            : "hidden"
          : visibility,
        // One composited unit per colourway: fill + whole fade together so the
        // dissolve into the next colourway is a single seamless blend.
        willChange: "opacity",
        transform: "translateZ(0)",
      }}
    >
      {/* Ambient fill — the same painting, heavy-blurred, covers the surround. */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${asset(`/img/paintings/pavo-${slug}-fill-v1.webp`)}")` }}
      />
      {/* The WHOLE painting, zoomed out — full canvas visible at every
          viewport. Feathered alpha edge is baked into the asset, so it melts
          into the fill with no visible rectangle. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src={asset(`/img/paintings/pavo-${slug}-whole-v1.webp`)}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="object-contain"
          style={{
            width: "min(92svh, 94vw)",
            height: "min(92svh, 94vw)",
            maxWidth: "none",
          }}
          loading={index === 0 ? "eager" : "lazy"}
          data-colourway={name}
        />
      </div>
    </motion.div>
  );
};

export const PavoBackdrop = ({ fades }: { fades: PavoFades }) => {
  const reduceMotion = useReducedMotion();
  // No `target` → whole-document scroll drives the colourway sequence.
  const { scrollYProgress } = useScroll();

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#0d0a10]"
    >
      {PAVO_COLOURWAYS.map((c, i) => (
        <PavoLayer
          key={c.slug}
          slug={c.slug}
          name={c.name}
          index={i}
          fades={fades}
          scrollYProgress={scrollYProgress}
          reduceMotion={reduceMotion}
        />
      ))}
      {/* Legibility veil — the warm plum-rose radial (NOT neutral black),
          deepest where running copy sits, dissolving to clear at the edges so
          the painting still clearly shows through (Hugo: clearly see the
          background, easily read the text). The per-colourway darken layer of
          the old design is GONE — asset normalisation replaced it. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 105% at 50% 40%, rgba(24,8,18,0.30) 0%, rgba(24,8,18,0.16) 55%, rgba(24,8,18,0.05) 100%)",
        }}
      />
      {/* Top + bottom grounding bands — the nav strip and the finale/footer
          seam never sit on the brightest zones. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,9,8,0.30) 0%, rgba(10,9,8,0.05) 22%, rgba(10,9,8,0.05) 68%, rgba(10,9,8,0.38) 100%)",
        }}
      />
    </div>
  );
};
