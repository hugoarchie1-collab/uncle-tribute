import { IMAGE_VARIANT_WIDTHS } from "./imageVariants";

/**
 * Resolve a public-folder asset path to the correct URL for the current
 * deployment base. Vite serves the site from `import.meta.env.BASE_URL`,
 * which is "/" for root deploys (Vercel / Netlify / dev) or "/<repo>/" for
 * GitHub Pages. This helper joins the two reliably.
 *
 * Usage:
 *   <img src={asset("/img/paintings/wild-rose-sussex-pink.jpg")} />
 *   <img src={asset(painting.image)} />
 */
export const asset = (path: string): string => {
  const base = import.meta.env.BASE_URL || "/";
  const clean = path.replace(/^\//, "");
  return base.endsWith("/") ? `${base}${clean}` : `${base}/${clean}`;
};

/**
 * Mirror of a .jpg asset path to its .webp sibling. A parallel WebP file
 * lives next to every painting / welcome / about JPG under /public/img.
 *
 * Use inside a <picture> with the .webp as <source> and the .jpg as the
 * <img> fallback — browsers that don't support WebP load the JPG.
 *
 * Inputs MUST end in `.jpg`. Other extensions are returned unchanged so a
 * misuse 404s loudly during dev rather than silently advertising the wrong
 * MIME type to the browser.
 */
export const webp = (jpgPath: string): string =>
  jpgPath.endsWith(".jpg") ? jpgPath.slice(0, -4) + ".webp" : jpgPath;

/**
 * Build a WebP `srcset` for a painting / photo JPG path, IF responsive width
 * variants exist for it on disk (manifest: `IMAGE_VARIANT_WIDTHS`). Each entry
 * points at a `<stem>-w{width}.webp` sibling (e.g. `wild-rose-sussex-pink-w800.webp`)
 * generated offline; the candidate list is closed off with the existing
 * full-size `<stem>.webp` advertised at a 2000w descriptor — paintings are
 * ~2000px wide, so this is close enough for the browser's selection maths and
 * keeps the original available as the top candidate for large / retina viewports.
 *
 * Returns `undefined` when the path has no variants — callers then leave the
 * plain `webp()` src on the <source> unchanged (no srcset, no behaviour change).
 *
 * Resolves every URL through `asset()` so it honours `BASE_URL` exactly like the
 * single-src path does.
 */
export const webpSrcSet = (jpgPath: string): string | undefined => {
  const widths = IMAGE_VARIANT_WIDTHS[jpgPath];
  if (!widths || widths.length === 0) return undefined;
  if (!jpgPath.endsWith(".jpg")) return undefined;
  const stem = jpgPath.slice(0, -4);
  const candidates = widths.map((w) => `${asset(`${stem}-w${w}.webp`)} ${w}w`);
  // Append the existing full-size .webp as the largest candidate (~2000w).
  candidates.push(`${asset(`${stem}.webp`)} 2000w`);
  return candidates.join(", ");
};
