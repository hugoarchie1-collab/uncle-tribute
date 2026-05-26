import { type ImgHTMLAttributes } from "react";
import { asset, webp } from "../lib/asset";

interface AssetImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  /** Public-folder JPG path. The matching .webp sibling is loaded
   *  automatically as a <source>; browsers without WebP fall back to the JPG. */
  src: string;
}

/**
 * Drop-in replacement for <img src={asset(jpgPath)} ...>. Renders a <picture>
 * with WebP source + JPG fallback. The wrapping <picture> uses
 * `display: contents` so it disappears from the layout tree and the inner
 * <img> inherits any sizing CSS from its grandparent.
 */
export const AssetImage = ({ src, ...rest }: AssetImageProps) => (
  <picture style={{ display: "contents" }}>
    <source srcSet={asset(webp(src))} type="image/webp" />
    <img src={asset(src)} {...rest} />
  </picture>
);
