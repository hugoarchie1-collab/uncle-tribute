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
 *   pavo-<c>-fill-v3.webp   heavy-blur ambient wash of the same painting,
 *                           rendered bg-cover as the surround;
 *   pavo-<c>-whole-v3.webp  the ENTIRE painting, sigma-14 blur (2026-07-03: "more blurry… barely read text")
 *                           (clearly reads as the painting; text stays legible
 *                           over the veils), feathered alpha edge so it melts
 *                           seamlessly into the fill — object-contain sized
 *                           min(100svh, 100vw) so the canvas SPANS the viewport at every
 *                           viewport, portrait or landscape.
 *
 * All ten assets are brightness-NORMALISED to one family target (whole ≈ luma
 * 56, fill ≈ 56 — matched EXACTLY in v3 so the surround reads as the
 * painting's own background extended to the viewport edges, one continuous
 * image) so the crossfade never jumps bright→dark — that normalisation
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
  fit,
}: {
  slug: string;
  name: string;
  index: number;
  fades: PavoFades;
  scrollYProgress: MotionValue<number>;
  reduceMotion: boolean | null;
  fit: "contain" | "cover";
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
      {/* Ambient fill — the same painting, heavy-blurred, covers the surround.
          ONLY in contain mode: in cover mode the whole painting already fills
          the viewport, so a second blurred copy behind it read through the
          feathered edges as a "repeated blurry mess" (Hugo 2026-07-05). Dropping
          it lets the painting fade to clean dark instead. */}
      {fit === "contain" && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${asset(`/img/paintings/pavo-${slug}-fill-v3.webp`)}")` }}
        />
      )}
      {fit === "cover" ? (
        /* FULL-BLEED cover (Home + About): the whole painting fills the viewport
           edge-to-edge, ONE clean expanded image — no contained square, no blurred
           fill behind, so there is no "repeated blurry mess" (Hugo 2026-07-05:
           "not expanded properly, just repeated again behind and blurred"). A
           slight overscan (scale 1.08) pushes the feathered alpha border off
           every edge so it never reveals the dark base as a seam; a square canvas
           in a landscape viewport just crops its outer rows — the mandala still
           reads as one continuous tapestry. */
        <img
          src={asset(`/img/paintings/pavo-${slug}-whole-v2.webp`)}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover scale-[1.08]"
          loading={index === 0 ? "eager" : "lazy"}
          data-colourway={name}
        />
      ) : (
        /* CONTAINED (Home): full canvas visible, spanning the FULL viewport in
            its limiting axis. The -v3 fill is normalised to the SAME luma as
            the plate, so the surround reads as the painting's own background
            extended to the edges — one continuous image. */
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={asset(`/img/paintings/pavo-${slug}-whole-v3.webp`)}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="object-contain"
            style={{
              // 116svh (not 100): on wide screens the canvas overshoots the
              // viewport height so the painting DOMINATES — only its blurred
              // border rows crop off-screen (the mandala stays whole); portrait
              // phones stay width-bound at 100vw.
              width: "min(116svh, 100vw)",
              height: "min(116svh, 100vw)",
              maxWidth: "none",
            }}
            loading={index === 0 ? "eager" : "lazy"}
            data-colourway={name}
          />
        </div>
      )}
    </motion.div>
  );
};

export const PavoBackdrop = ({
  fades,
  fit = "contain",
}: {
  fades: PavoFades;
  /** How the whole-painting layer fills the viewport. "contain" (Home) shows
   *  the whole square canvas centred; "cover" (About) stretches it full-bleed
   *  edge-to-edge with no seam. Default keeps Home unchanged. */
  fit?: "contain" | "cover";
}) => {
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
          fit={fit}
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
