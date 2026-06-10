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
 */
export const AssetImage = ({ src, sizes = "100vw", ...rest }: AssetImageProps) => {
  const srcSet = webpSrcSet(src);
  return (
    <picture style={{ display: "contents" }}>
      {srcSet ? (
        <source srcSet={srcSet} sizes={sizes} type="image/webp" />
      ) : (
        <source srcSet={asset(webp(src))} type="image/webp" />
      )}
      <img src={asset(src)} {...rest} />
    </picture>
  );
};
