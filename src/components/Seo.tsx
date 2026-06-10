import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { pageTitle, absoluteUrl } from "../lib/seo";

/**
 * Per-route SEO head tags. Wraps react-helmet-async so each route can set a
 * unique <title> + <meta name="description"> and, optionally, OpenGraph /
 * Twitter overrides for richer social shares. The base og:* tags live in
 * index.html; this overrides them per route when props are supplied.
 *
 * Title handling mirrors lib/usePageTitle so titles read identically — pages
 * that mount <Seo> should NOT also call usePageTitle (avoid double-setting).
 *
 * `jsonLd` accepts a schema.org object (or array of objects) rendered into a
 * <script type="application/ld+json"> — used by PaintingDetail for the
 * Product + BreadcrumbList structured data.
 */
export interface SeoProps {
  /** Page-specific title; omit for the brand default. */
  title?: string;
  /** Meta description for this route. */
  description?: string;
  /** Canonical path or absolute URL for og:url. */
  url?: string;
  /** OpenGraph image (path or absolute URL); defaults to the site og-image. */
  image?: string;
  /** og:type — "website" (default) or "product" for painting pages. */
  type?: "website" | "product" | "article";
  /**
   * Canonical path or absolute URL. Defaults to the CURRENT pathname (query
   * stripped), which is right for every route today — the prop exists for
   * pages that need to canonicalise elsewhere (e.g. a variant URL pointing at
   * its parent). Helmet treats rel=canonical as unique, so this also
   * overrides App.tsx's route-level default.
   */
  canonical?: string;
  /** schema.org JSON-LD object(s) to inject. */
  jsonLd?: object | object[];
}

export const Seo = ({
  title,
  description,
  url,
  image,
  type = "website",
  canonical,
  jsonLd,
}: SeoProps) => {
  const { pathname } = useLocation();
  const fullTitle = pageTitle(title);
  const ogImage = image ? absoluteUrl(image) : undefined;
  const ogUrl = url ? absoluteUrl(url) : undefined;
  // Canonical = current pathname unless overridden — query params (?c=
  // colourway deep-links etc.) never fragment the indexed URL.
  const canonicalUrl = absoluteUrl(canonical ?? pathname);
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <link rel="canonical" href={canonicalUrl} />
      {description && <meta name="description" content={description} />}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title ?? fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {ogUrl && <meta property="og:url" content={ogUrl} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta name="twitter:title" content={title ?? fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      {blocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
};
