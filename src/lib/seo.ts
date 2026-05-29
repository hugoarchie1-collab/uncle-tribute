/**
 * SEO helpers shared by the per-route <Seo> component (src/components/Seo.tsx)
 * and the per-painting Product JSON-LD on PaintingDetail.
 *
 * SITE_URL is the canonical production origin. Keep it in sync with the
 * Vercel `SITE_URL` env var and public/sitemap.xml. The custom domain
 * (themandalacompany.com) is now live and is the canonical origin.
 */
export const SITE_URL = "https://themandalacompany.com";

const BRAND = "The Art of Stephen Meakin";

/** Resolve a site-relative path (e.g. "/img/x.jpg") to an absolute URL. */
export const absoluteUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean}`;
};

/**
 * Compose the full document title. Mirrors usePageTitle's logic so titles
 * read identically whether set by Helmet or the legacy hook: the brand alone
 * for the home page, otherwise "<page> · The Art of Stephen Meakin" unless
 * the page title already names Stephen Meakin (the painting pages do).
 */
export const pageTitle = (title?: string): string => {
  if (!title) return `${BRAND} — Mandala Artist & Sacred Geometer`;
  if (title.includes("Stephen Meakin")) return title;
  return `${title} · ${BRAND}`;
};

/** First sentence of a longer body of copy — used for meta descriptions. */
export const firstSentence = (text: string): string => {
  const flat = text.replace(/\s+/g, " ").trim();
  const match = flat.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : flat).trim();
};
