import { Link } from "react-router-dom";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { AssetImage } from "./AssetImage";
import { PAINTINGS } from "../data/paintings";
import { cn } from "../lib/cn";
import { EYEBROW_MUTED } from "./ui/tokens";

/**
 * FooterCatalogue — a quiet single row of every painting in the catalogue (all
 * ten on one line from md up), mounted above the Footer. Lets a reader who has
 * scrolled to the bottom step sideways into any other piece without travelling
 * back up to the nav. Each tile uses the painting's original-colourway cover
 * image. NOT mounted on /collections or /for-you (those pages already present
 * the full catalogue, so a second strip would be redundant).
 *
 * Desktop-only (`hidden md:block`): on mobile a 10-thumbnail grid is a heavy
 * tail that the reader scrolls past on every page. The best art / editorial
 * footers (Aesop, Hermès, Studio Olafur Eliasson) keep the mobile footer tight
 * and don't bury a thumbnail wall in it — so we drop the grid below `md` and
 * keep the richer affordance for the larger viewports it suits.
 *
 * Animation: a single `whileInView` fade + slide-up for the whole grid (no
 * per-tile stagger — at 10 tiles the cumulative delay would feel slow). On
 * `prefers-reduced-motion`, renders statically with no transforms.
 */
export const FooterCatalogue = () => {
  const reduceMotion = useReducedMotion();

  const tiles = PAINTINGS.map((p) => {
    const cover =
      p.colourways.find((c) => c.isOriginal && c.available) ??
      p.colourways.find((c) => c.available) ??
      p.colourways[0];
    return { id: p.id, title: p.title, image: cover.image, colourway: cover.name };
  });

  const variants: Variants = reduceMotion
    ? {
        hidden: { opacity: 1 },
        show: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0, y: 18 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.8, ease: [0.22, 0.61, 0.36, 1] },
        },
      };

  return (
    <section
      aria-label="All paintings"
      className="relative hidden md:block border-t border-line bg-bg px-4 sm:px-6 md:px-8 lg:px-12 py-5 md:py-6"
    >
      {/* FEATHERED SEAM — dissolves the page's fixed scene backdrop into this
          opaque band instead of a razor-hard colour cut (worst on bright-
          bottomed scenes like the privacy sunset; caught by the 2026-07-02
          judge sweep). Sits ABOVE the band (-translate-y-full), fading from
          the band's own bg at the seam to clear ~7rem higher. Invisible when
          the content above is already opaque. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28 -translate-y-full bg-gradient-to-t from-bg via-bg/55 to-transparent"
      />
      <div className="mx-auto max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[1840px]">
        <p className={cn(EYEBROW_MUTED, "m-0 mb-4 text-center")}>
          The Catalogue · {tiles.length}
        </p>
        {/* flex-wrap + justify-center so any partial trailing row (if the
            catalogue count ever stops being a clean multiple of 10) centres
            instead of leaving a left-aligned orphan. Each tile basis is
            0 1 calc(10% − 9px) so all ten sit on ONE line from md up: the 9px
            subtracts this row's share of the nine 10px gaps
            (10×(10%−9px) + 9×10px = 100%). min-w-0 lets a tile shrink so the
            row can never push past the container. */}
        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={variants}
          className="group/cat flex flex-wrap justify-center gap-2.5 list-none p-0 m-0"
        >
          {tiles.map((t) => (
            <li
              key={t.id}
              // Hovering any tile recedes the siblings so the strip reads as a
              // curated wall, not a flat contact-sheet (the hovered tile resets
              // to full via hover:!opacity-100).
              className="m-0 min-w-0 flex-[0_1_calc(10%-9px)] transition-opacity duration-500 group-hover/cat:opacity-55 hover:!opacity-100"
            >
              <Link
                to={`/collections/${t.id}`}
                aria-label={t.title}
                title={t.title}
                className="group relative block aspect-square overflow-hidden ring-1 ring-ink/70 transition-[transform,box-shadow] duration-500 hover:ring-accent/60 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]"
              >
                <AssetImage
                  src={t.image}
                  alt={`${t.title} — ${t.colourway}`}
                  loading="lazy"
                  decoding="async"
                  // The section is hidden below md and the tiles sit ten across
                  // (flex-[0_1_calc(10%-9px)]) from md up, so each tile renders
                  // at ~10vw. Capped by the max-w-[1400px]→[1840px] container on
                  // very wide screens (≈184px max), well under the w480 variant.
                  sizes="(min-width: 768px) 10vw, 1px"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                />
              </Link>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
};
