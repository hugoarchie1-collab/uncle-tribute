import { asset } from "../lib/asset";

/**
 * Canonical fixed atmospheric backdrop.
 *
 * Every page in the system carries an atmospheric layer behind its content —
 * Welcome (peacock colourways crossfading on scroll), Collections (collection
 * scenes), PaintingDetail (the blurred painting). Utility + editorial pages
 * (About, Basket, Contact, FAQ, Legal, Order result, 404) had NONE — which is
 * the single biggest reason they read as a separate, flatter microsite.
 *
 * This is the single-image version of that layer: one pre-blurred peacock WebP
 * at low opacity + the EXACT shared scrim used across the site, so a page reads
 * as part of the same world without the cost of a scroll-crossfade. Static
 * (fixed) — fine for both one-screen pages and long editorial scrolls.
 *
 * Usage: render as the FIRST child of a `relative` page root, then put
 * `relative z-10` on the page's <main> (and drop any opaque `bg-bg` from root).
 */
export const AmbientBackdrop = ({
  src = "/img/paintings/peacock-persian-indigo-blur.webp",
  opacity = 0.5,
}: {
  /** Pre-blurred WebP under /public. Defaults to the calm Persian-indigo peacock. */
  src?: string;
  /** Image opacity — keep low on text-heavy pages so it never competes with copy. */
  opacity?: number;
}) => (
  <div
    aria-hidden="true"
    className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
  >
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{
        backgroundImage: `url("${asset(src)}")`,
        opacity,
        willChange: "opacity",
      }}
    />
    {/* Exact shared scrim — matches Welcome / Collections / PaintingDetail. */}
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(75% 60% at 50% 35%, rgba(10,9,8,0.5) 0%, rgba(10,9,8,0.2) 100%)",
      }}
    />
  </div>
);
