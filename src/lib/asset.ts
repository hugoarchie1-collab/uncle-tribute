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
