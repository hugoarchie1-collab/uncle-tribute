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
 * Mirror of a .jpg asset path to its .webp sibling. A parallel WebP file is
 * generated for every painting / welcome / about JPG at build time (see
 * scripts in /public/img/*), so this helper just rewrites the extension.
 *
 * Use inside a <picture> with the .webp as <source> and the .jpg as the
 * <img> fallback — browsers that don't support WebP load the JPG.
 */
export const webp = (jpgPath: string): string =>
  jpgPath.replace(/\.jpe?g$/i, ".webp");
