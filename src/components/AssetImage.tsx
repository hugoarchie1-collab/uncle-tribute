import { type ImgHTMLAttributes } from "react";
import { asset, webp, webpSrcSet } from "../lib/asset";

interface AssetImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  /** Public-folder JPG path. The matching .webp sibling is loaded
   *  automatically as a <source>; browsers without WebP fall back to the JPG. */
  src: string;
  /** CSS `sizes` describing the image's rendered width across breakpoints.
   *  Only takes effect when responsive WebP width variants exist for `src`
   *  (see `webpSrcSet`); the browser then picks the smallest file that covers
   *  the slot. Default "100vw" is conservative — pass an accurate value at
   *  small slots (e.g. footer tiles) to avoid over-fetching. */
  sizes?: string;
  /** Soft-edge fade so a full-bleed PHOTOGRAPH/scene dissolves into the dark
   *  bg (applies the global `.soft-edge*` mask utilities defined in global.css):
   *   - "none"   (DEFAULT) — crisp, no fade. KEEP THIS for any PAINTING/product
   *              image (hero, framed, square catalogue thumbnail) so the artwork
   *              stays sharp and full-bleed.
   *   - "bottom" — fade only the bottom edge (the signature blend Hugo likes
   *                under studio/backdrop/hero photographs) via `.soft-edge-bottom`.
   *   - "y"      — fade top + bottom (`.soft-edge-y`).
   *  OPT-IN by design: pages choose it per-image. Never apply to the mandala
   *  artworks — the fade is for atmospheric photography only. The utility class
   *  is merged onto the <img>'s own `className` (a CSS mask clips the image's
   *  painted pixels directly — no wrapper box needed, same as ImageReveal);
   *  "none" merges nothing, so the markup is byte-for-byte unchanged (no
   *  regression). */
  softEdge?: "none" | "bottom" | "y";
}

/**
 * Drop-in replacement for <img src={asset(jpgPath)} ...>. Renders a <picture>
 * with WebP source + JPG fallback. The wrapping <picture> uses
 * `display: contents` so it disappears from the layout tree and the inner
 * <img> inherits any sizing CSS from its grandparent.
 *
 * When responsive WebP variants exist for `src` the webp <source> carries a
 * `srcSet` + `sizes` so the browser selects the smallest sufficient file; the
 * JPG <img> fallback is left untouched (full-size, WebP-less browsers only).
 *
 * `softEdge` (default "none") opts a PHOTOGRAPH/scene into a soft fade that
 * dissolves it into the dark page bg — see the prop docs above. It is never
 * applied automatically, so paintings/products stay crisp unless a page asks.
 */
const SOFT_EDGE_CLASS: Record<NonNullable<AssetImageProps["softEdge"]>, string> = {
  none: "",
  bottom: "soft-edge-bottom",
  y: "soft-edge-y",
};

export const AssetImage = ({ src, sizes = "100vw", softEdge = "none", ...rest }: AssetImageProps) => {
  const srcSet = webpSrcSet(src);
  const img = <img src={asset(src)} {...rest} />;
  const maskClass = SOFT_EDGE_CLASS[softEdge];
  return (
    <picture style={{ display: "contents" }}>
      {srcSet ? (
        <source srcSet={srcSet} sizes={sizes} type="image/webp" />
      ) : (
        <source srcSet={asset(webp(src))} type="image/webp" />
      )}
      {/* "none" keeps the bare <img> (no markup change → no regression). A fade
          needs a box to mask, but the <picture> is display:contents, so wrap
          the <img> in a contents-less inline-block span carrying the utility. */}
      {maskClass ? (
        <span className={maskClass} style={{ display: "contents" }}>
          {img}
        </span>
      ) : (
        img
      )}
    </picture>
  );
};
