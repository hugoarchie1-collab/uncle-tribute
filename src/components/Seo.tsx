import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { pageTitle, absoluteUrl } from "../lib/seo";
import {
  HEAD_DEFAULTS,
  markSeoWrote,
  removeMeta,
  setCanonical,
  setRobotsNoindex,
  setRouteJsonLd,
  upsertMeta,
} from "../lib/headMeta";

// Alt for the DEFAULT share card (mirrors the static index.html og:image:alt) —
// re-asserted on routes without a per-route image so SPA nav never leaves a
// painting's alt stuck on a default page.
const DEFAULT_OG_IMAGE_ALT =
  "The Wild Rose mandala on an easel in Stephen's garden";

/**
 * Per-route SEO head tags. Each route can set a unique <title> +
 * <meta name="description"> and, optionally, OpenGraph / Twitter overrides
 * for richer social shares. The base og:* tags live in index.html; this
 * overrides them per route, and resets any it has no value for back to the
 * site defaults (so a painting's og:image never leaks onto the next page).
 *
 * IMPLEMENTATION (2026-06-10): direct synchronous DOM upserts via
 * lib/headMeta.ts — react-helmet-async was removed (flaky-to-dead on
 * React 19; per-route meta often never committed, so every URL presented
 * the homepage meta to crawlers). The props API is unchanged. See
 * headMeta.ts for the write-order contract with App's RouteHeadDefaults.
 *
 * Title handling mirrors lib/usePageTitle so titles read identically — pages
 * that mount <Seo> should NOT also call usePageTitle (avoid double-setting).
 *
 * `jsonLd` accepts a schema.org object (or array of objects) rendered into a
 * single per-route <script type="application/ld+json"> — used by
 * PaintingDetail for the Product + BreadcrumbList structured data.
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
   * its parent). There is exactly ONE canonical link in the document (the
   * static index.html tag, mutated in place), so this also overrides App's
   * route-level default.
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
  const ogImage = image ? absoluteUrl(image) : HEAD_DEFAULTS.ogImage;
  // Canonical = current pathname unless overridden — query params (?c=
  // colourway deep-links etc.) never fragment the indexed URL.
  const canonicalUrl = absoluteUrl(canonical ?? pathname);
  const ogUrl = url ? absoluteUrl(url) : canonicalUrl;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : null;
  // Stable dep for effect re-runs on jsonLd content changes (e.g. the
  // colourway deep-link rewriting the Product offer) without re-running on
  // every render for a referentially-new-but-equal object.
  const blocksJson = blocks ? JSON.stringify(blocks) : "";

  // useLayoutEffect: synchronous, before paint — and child-first, which the
  // headMeta write-order contract relies on (markSeoWrote runs before the
  // App-level default writer checks it on a direct load).
  useLayoutEffect(() => {
    document.title = fullTitle;
    setCanonical(canonicalUrl);
    upsertMeta("name", "description", description ?? HEAD_DEFAULTS.description);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta(
      "property",
      "og:description",
      description ?? HEAD_DEFAULTS.ogDescription,
    );
    upsertMeta("property", "og:url", ogUrl);
    upsertMeta("property", "og:image", ogImage);
    // og:image dimensions: the static index.html hints (1200×630) match only the
    // default share card. A per-route `image` override (a painting's own square /
    // landscape JPG) is a different shape, so drop the hints — scrapers then
    // measure the real image — and give it a meaningful alt. Restore the defaults
    // otherwise, so SPA nav back to a default route re-asserts them. (#16)
    if (image) {
      removeMeta("property", "og:image:width");
      removeMeta("property", "og:image:height");
      upsertMeta("property", "og:image:alt", title ?? fullTitle);
    } else {
      upsertMeta("property", "og:image:width", "1200");
      upsertMeta("property", "og:image:height", "630");
      upsertMeta("property", "og:image:alt", DEFAULT_OG_IMAGE_ALT);
    }
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta(
      "name",
      "twitter:description",
      description ?? HEAD_DEFAULTS.twitterDescription,
    );
    upsertMeta("name", "twitter:image", ogImage);
    setRouteJsonLd(blocksJson ? (JSON.parse(blocksJson) as object[]) : null);
    // A page that mounts <Seo> is indexable by definition — clear any robots
    // noindex a transactional route may have left (belt-and-braces; the
    // App-level defaults writer also clears it on route change).
    setRobotsNoindex(false);
    markSeoWrote(pathname);
  }, [
    fullTitle,
    canonicalUrl,
    description,
    type,
    title,
    image,
    ogUrl,
    ogImage,
    blocksJson,
    pathname,
  ]);

  return null;
};
