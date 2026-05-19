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
