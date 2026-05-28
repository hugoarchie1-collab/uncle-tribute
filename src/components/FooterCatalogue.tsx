import { Link } from "react-router-dom";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { AssetImage } from "./AssetImage";
import { PAINTINGS } from "../data/paintings";

/**
 * FooterCatalogue — a quiet 5×2 (mobile) / 10×1 (desktop) row of every
 * painting in the catalogue, mounted above the Footer on every page. Lets a
 * reader who has scrolled to the bottom step sideways into any other piece
 * without travelling back up to the nav. Each tile uses the painting's
 * original-colourway cover image.
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
      className="relative border-t border-white/8 bg-bg px-4 sm:px-6 md:px-10 lg:px-16 pt-10 md:pt-14 pb-2"
    >
      <div className="mx-auto max-w-[1320px]">
        <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/55 m-0 mb-5 text-center">
          The Catalogue · {tiles.length}
        </p>
        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={variants}
          className="grid grid-cols-5 md:grid-cols-10 gap-2 md:gap-2.5 list-none p-0 m-0"
        >
          {tiles.map((t) => (
            <li key={t.id} className="m-0">
              <Link
                to={`/collections/${t.id}`}
                aria-label={t.title}
                title={t.title}
                className="group relative block aspect-square overflow-hidden ring-1 ring-white/8 transition-all duration-500 hover:ring-accent/50"
              >
                <AssetImage
                  src={t.image}
                  alt={`${t.title} — ${t.colourway}`}
                  loading="lazy"
                  decoding="async"
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
