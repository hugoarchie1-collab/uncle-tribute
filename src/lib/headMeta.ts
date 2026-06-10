// =============================================================================
// HEAD METADATA — direct-DOM head manager (replaces react-helmet-async).
// =============================================================================
// react-helmet-async@2 was flaky-to-dead on React 19 (its peer range is
// 16–18; commits are rAF-deferred and often never ran — on direct page loads
// every route presented the HOMEPAGE title/meta/JSON-LD to Google; verified
// identical on the pre-Track-A 058ee1e deployment, see CLAUDE.md 2026-06-10).
//
// This module replaces it with deterministic, SYNCHRONOUS upserts that MUTATE
// the static tags index.html already ships (creating a tag only if missing).
// No second copy of any tag can ever exist, no library, no rAF, no race.
//
// WRITE-ORDER CONTRACT (the one subtlety — read before editing):
// React runs layout effects CHILD-FIRST. <Seo> (deep in a page) and the
// App-level <RouteHeadDefaults> can fire in the same commit on a direct load,
// in which case Seo's specific meta runs FIRST and the App-level defaults
// would clobber it. The `seoWroteFor` pathname flag prevents that:
//   - Seo writes its tags, then calls markSeoWrote(pathname).
//   - RouteHeadDefaults checks didSeoWrite(pathname) and SKIPS when the page
//     already wrote. On SPA navigations the App-level effect fires on the
//     location-change commit (page not mounted yet → writes defaults), and the
//     incoming page's Seo overwrites with specifics when it mounts — a few ms
//     of default meta mid-transition, which no crawler ever observes.
// Titles are NOT managed here-at-App-level: a page sets its title via <Seo>
// OR lib/usePageTitle (never both — house rule); pages with neither keep the
// static index.html title.
// =============================================================================

import { absoluteUrl } from "./seo";

/**
 * Site-wide defaults — MUST mirror the static tags in index.html (the no-JS
 * crawler view), so resetting a tag and "what a fresh visitor sees" agree.
 */
export const HEAD_DEFAULTS = {
  description:
    "A tribute and catalogue of the life's work of Stephen Meakin (SEM) — mandala artist and Sacred Geometer. Habundia, Genesis and Born in the Sky: three collections, ten paintings, a lifetime devoted to the geometry of light, pattern and the ever-true.",
  ogType: "website",
  ogTitle: "The Art of Stephen Meakin",
  ogDescription:
    "A life's work in sacred geometry, mandala painting and visual henosis. Habundia, Genesis, Born in the Sky.",
  ogImage: "https://themandalacompany.com/og-image.jpg",
  twitterTitle: "The Art of Stephen Meakin",
  twitterDescription: "A life's work in sacred geometry and mandala painting.",
  twitterImage: "https://themandalacompany.com/og-image.jpg",
} as const;

// Pathname the current route's <Seo> wrote for — see the write-order contract.
let seoWroteFor: string | null = null;
export const markSeoWrote = (pathname: string): void => {
  seoWroteFor = pathname;
};
export const didSeoWrite = (pathname: string): boolean =>
  seoWroteFor === pathname;

const isBrowser = typeof document !== "undefined";

/**
 * Set (or create) a single <meta> tag's content. `kind` selects the key
 * attribute — "name" for description/twitter:*, "property" for og:*.
 */
export const upsertMeta = (
  kind: "name" | "property",
  key: string,
  content: string,
): void => {
  if (!isBrowser) return;
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${kind}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(kind, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

/** Point the document's single canonical link at `href` (create if missing). */
export const setCanonical = (href: string): void => {
  if (!isBrowser) return;
  let el = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const JSONLD_ID = "route-jsonld";

/**
 * Maintain ONE per-route JSON-LD script (separate from index.html's static
 * site-identity block). Pass null/[] to remove it — routes without structured
 * data must not carry the previous route's Product/Breadcrumb blocks.
 */
export const setRouteJsonLd = (blocks: object[] | null): void => {
  if (!isBrowser) return;
  const existing = document.getElementById(JSONLD_ID);
  if (!blocks || blocks.length === 0) {
    existing?.remove();
    return;
  }
  const el =
    (existing as HTMLScriptElement | null) ??
    (() => {
      const s = document.createElement("script");
      s.id = JSONLD_ID;
      s.setAttribute("type", "application/ld+json");
      document.head.appendChild(s);
      return s;
    })();
  el.textContent = JSON.stringify(blocks.length === 1 ? blocks[0] : blocks);
};

/**
 * Reset every route-variable tag to the site defaults + point the canonical
 * at the given path. Called by the App-level RouteHeadDefaults for routes
 * whose page didn't mount its own <Seo> (see the write-order contract).
 */
export const applyDefaultHead = (pathname: string): void => {
  setCanonical(absoluteUrl(pathname));
  upsertMeta("name", "description", HEAD_DEFAULTS.description);
  upsertMeta("property", "og:type", HEAD_DEFAULTS.ogType);
  upsertMeta("property", "og:title", HEAD_DEFAULTS.ogTitle);
  upsertMeta("property", "og:description", HEAD_DEFAULTS.ogDescription);
  upsertMeta("property", "og:url", absoluteUrl(pathname));
  upsertMeta("property", "og:image", HEAD_DEFAULTS.ogImage);
  upsertMeta("name", "twitter:title", HEAD_DEFAULTS.twitterTitle);
  upsertMeta("name", "twitter:description", HEAD_DEFAULTS.twitterDescription);
  upsertMeta("name", "twitter:image", HEAD_DEFAULTS.twitterImage);
  setRouteJsonLd(null);
};
