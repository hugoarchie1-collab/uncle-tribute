// =============================================================================
// BUILD-TIME PER-ROUTE PRERENDER (head + structured data only)
// =============================================================================
// Emits dist/<route>/index.html for every indexable route during `vite build`,
// via the closeBundle plugin at the bottom (same pattern as merchant-feed.ts).
//
// WHY: the app is a client-rendered SPA. Its per-route <title>/canonical/OG +
// Product/VisualArtwork/Breadcrumb JSON-LD are written by lib/headMeta.ts in a
// layout effect — i.e. ONLY after JS runs. Googlebot eventually renders, but
// Bing, AI crawlers (GPTBot/ClaudeBot/PerplexityBot), social link-unfurlers
// (Facebook/Slack/iMessage) and Google Merchant Center's landing-page check do
// NOT run JS and were seeing the HOMEPAGE shell on every URL (confirmed live:
// `curl -A Googlebot …/collections/wild-rose` returned the home title +
// canonical "/"). This bakes the correct <head> into the raw HTML so those
// crawlers see the right page, while the SPA still hydrates identically on top.
//
// HOW IT STAYS SAFE / NON-DUPLICATING (lib/headMeta.ts contract):
//   • headMeta MUTATES the single <title>/<meta>/<link rel=canonical> tags in
//     place on mount → our prerendered tags get the same values re-asserted, no
//     duplicates.
//   • Route JSON-LD lives in ONE <script id="route-jsonld">. We emit that exact
//     id, so headMeta's setRouteJsonLd() REPLACES it (never appends a second).
//   • main.tsx uses createRoot (not hydrateRoot) → React replaces #root on
//     mount, so there is no hydration-mismatch surface (we touch <head> only).
//
// VERCEL SERVES THESE: vercel.json uses modern `rewrites` (filesystem-first),
// so a static file at the exact path is served BEFORE the SPA catch-all rewrite.
//
// MIRRORS (keep in sync, like merchant-feed.ts mirrors pricing):
//   • painting <title>/description + Product/VisualArtwork/Breadcrumb JSON-LD
//     mirror src/pages/PaintingDetail.tsx (computed here from the same data +
//     src/lib/seo helpers, so they can't drift on the numbers).
//   • static-route titles/descriptions mirror each page's <Seo>/usePageTitle.
// =============================================================================

import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import {
  PAINTINGS,
  COLLECTIONS,
  getPrintTiers,
  getLowestTierPricePence,
  parseSizeCm,
  formatGBP,
} from "../src/data/paintings";
import { ABOUT } from "../src/data/content";
import { SITE_URL, absoluteUrl, pageTitle, firstSentence } from "../src/lib/seo";

// Mirror of lib/headMeta.ts HEAD_DEFAULTS.description — the site-default meta
// description used for routes that set none (e.g. the Legal pages).
const DEFAULT_DESCRIPTION =
  "A tribute and catalogue of the life's work of Stephen Meakin (SEM) — mandala artist and Sacred Geometer. Habundia, Genesis and Born in the Sky: three collections, ten paintings, a lifetime devoted to the geometry of light, pattern and the ever-true.";

const DEFAULT_OG_IMAGE = "https://themandalacompany.com/og-image.jpg";

// Mirror of src/pages/PaintingDetail.tsx PRICE_VALID_UNTIL (a build-time date
// ~12 months out; carries no money value so it can't drift from the price).
const PRICE_VALID_UNTIL = new Date(Date.now() + 365 * 864e5)
  .toISOString()
  .slice(0, 10);

interface RouteHead {
  /** Route path, e.g. "/" or "/collections/wild-rose". */
  routePath: string;
  /** RAW title (pre-pageTitle); undefined → brand default. */
  title?: string;
  description?: string;
  ogType?: "website" | "product";
  /** Absolute OG image URL; defaults to the site og-image. */
  ogImage?: string;
  ogImageAlt?: string;
  /** schema.org blocks for the single #route-jsonld script. */
  jsonLd?: object[];
  /**
   * Semantic prose injected (visually-hidden) INSIDE #root, so non-JS crawlers
   * (Bing, GPTBot/ClaudeBot/PerplexityBot, AI Overviews, social unfurlers) read
   * the route's REAL content — not the empty SPA shell. main.tsx's createRoot
   * replaces #root on mount, so JS visitors (incl. Googlebot's renderer) never
   * see it; it carries the SAME content React renders, so it isn't cloaking.
   */
  bodyHtml?: string;
}

// ---- Static routes (mirror each page's <Seo>/usePageTitle copy) -------------
const STATIC_ROUTES: RouteHead[] = [
  {
    routePath: "/",
    title: "Mandala & Sacred Geometry Art Prints — The Art of Stephen Meakin",
    description:
      "Estate-stamped giclée prints of British mandala artist Stephen Meakin's sacred-geometry paintings. Made to order in Lewes — free worldwide delivery.",
  },
  {
    routePath: "/collections",
    title: "Mandala & Sacred Geometry Art Prints — The Collection",
    description:
      "Browse mandala and sacred-geometry art prints by Stephen Meakin across three collections — Habundia, Genesis and Born in the Sky. Estate-stamped giclée prints, made to order, free worldwide delivery.",
  },
  {
    routePath: "/about",
    title: "About Stephen Meakin — the life and work",
    description:
      "The life and work of Stephen Meakin (1966–2021), British mandala artist and sacred geometer: from Anegada to the studio at Phoenix Place, Lewes, and a practice built on the idea that everything is connected.",
  },
  {
    routePath: "/gallery",
    title: "Virtual Gallery — The Exhibition",
    description:
      "Walk the complete exhibition of Stephen Meakin's ten mandala paintings — a cinematic online viewing room. See each work at the scale it was painted, then place it on your own wall in augmented reality.",
  },
  {
    routePath: "/library",
    title: "The Reading Room — the books that shaped Stephen Meakin",
    description:
      "The books that shaped Stephen Meakin (SEM, 1966–2021), British mandala artist and sacred geometer — a reading room from the estate. The titles he returned to, gathered by The Mandala Company.",
  },
  {
    routePath: "/for-you",
    title: "Find a piece for you",
    description:
      "Find a Stephen Meakin print by the colours you're drawn to. Each mandala was made in several of his own colourways, estate-stamped and made to order.",
  },
  {
    routePath: "/faq",
    title: "Frequently asked",
    description:
      "Answers on the estate-stamped prints of Stephen Meakin's mandala paintings — provenance, paper, sizes and editions, framing, hand-finishing, shipping and after-sale care.",
  },
  {
    routePath: "/contact",
    title: "Contact the estate",
    description:
      "Write to The Mandala Company, the estate of Stephen Meakin — questions about prints, editions, commissions or the work itself.",
  },
  {
    routePath: "/trade",
    title: "Trade & Interior Design",
    description:
      "For interior designers, art consultants and hospitality buyers. Estate-stamped prints of Stephen Meakin's mandala paintings, framing, and bespoke commissions hand-painted in his tradition by Polly Wedge. Project pricing on request.",
  },
  {
    routePath: "/gift",
    title: "Gift an edition",
    description:
      "Give a piece of Stephen Meakin's work. A digital gift card towards any estate-stamped print — choose a size-pegged amount or a custom value, add a personal message, and let the recipient choose the print that speaks to them.",
  },
  {
    routePath: "/news",
    title: "News",
    description:
      "Up-and-coming releases, exhibitions, workshops and events from the estate of Stephen Meakin — The Mandala Company.",
  },
  {
    routePath: "/memories",
    title: "Book of Memories",
    description:
      "A wall of memories of Stephen Meakin (SEM, 1966–2021) — mandala artist and sacred geometer. Share a memory of Steve with the family and his students.",
  },
  {
    routePath: "/auth",
    title: "Authentication",
    description:
      "The Mandala Company Estate Ledger — confirm the provenance of a Stephen Meakin estate print. Enter the Certificate ID from your Certificate of Authenticity to return its verified record.",
  },
  { routePath: "/privacy", title: "Privacy." },
  { routePath: "/terms", title: "Terms of sale." },
  { routePath: "/returns", title: "Returns, refunds & damages." },
];

// ---- Painting routes (mirror PaintingDetail.tsx head + JSON-LD) -------------
function paintingRoute(p: (typeof PAINTINGS)[number]): RouteHead {
  const ogColourway =
    p.colourways.find((c) => c.isOriginal) ?? p.colourways[0];
  const ogImagePath = ogColourway?.image ?? p.colourways[0].image;
  const paintingPath = `/collections/${p.id}`;
  const fromPriceLabel = formatGBP(getLowestTierPricePence(p));
  const metaDescription = `Estate-stamped giclée print of ${p.title} by British mandala artist Stephen Meakin — sacred geometry, made to order, from ${fromPriceLabel}. Free worldwide delivery.`;
  const productDescription = `${metaDescription} ${firstSentence(p.description)}`;

  const visibleTiers = getPrintTiers(p);
  const tierPricesPence =
    visibleTiers.length > 0
      ? visibleTiers.map((t) => t.pricePence)
      : [getLowestTierPricePence(p)];
  const lowPricePence = Math.min(...tierPricesPence);
  const highPricePence = Math.max(...tierPricesPence);
  const artworkYear = p.year.match(/\d{4}/)?.[0];
  const artworkDims = parseSizeCm(p.size ?? "");

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    image: absoluteUrl(ogImagePath),
    description: productDescription,
    brand: { "@id": `${SITE_URL}/#organization` },
    creator: { "@id": `${SITE_URL}/#person` },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: (lowPricePence / 100).toFixed(2),
      highPrice: (highPricePence / 100).toFixed(2),
      offerCount: tierPricesPence.length,
      priceCurrency: "GBP",
      priceValidUntil: PRICE_VALID_UNTIL,
      availability: "https://schema.org/InStock",
      url: absoluteUrl(paintingPath),
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "GBP" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "GB" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 7,
            maxValue: 10,
            unitCode: "DAY",
          },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "GB",
        itemDefectReturnFees: "https://schema.org/FreeReturn",
        merchantReturnLink: absoluteUrl("/returns"),
      },
    },
  };

  const visualArtworkJsonLd = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: p.title,
    creator: { "@id": `${SITE_URL}/#person` },
    artform: "Mandala painting",
    image: absoluteUrl(ogImagePath),
    url: absoluteUrl(paintingPath),
    ...(artworkYear ? { dateCreated: artworkYear } : {}),
    ...(artworkDims
      ? {
          width: {
            "@type": "QuantitativeValue",
            value: artworkDims.w,
            unitCode: "CMT",
            unitText: "cm",
          },
          height: {
            "@type": "QuantitativeValue",
            value: artworkDims.h,
            unitCode: "CMT",
            unitText: "cm",
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Collections",
        item: absoluteUrl("/collections"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: p.title,
        item: absoluteUrl(paintingPath),
      },
    ],
  };

  return {
    routePath: paintingPath,
    title: `${p.title} — Mandala Art Print by Stephen Meakin`,
    description: metaDescription,
    ogType: "product",
    ogImage: absoluteUrl(ogImagePath),
    ogImageAlt: `${p.title} — ${ogColourway?.name ?? "Original"} — sacred-geometry mandala giclée print by Stephen Meakin`,
    jsonLd: [productJsonLd, visualArtworkJsonLd, breadcrumbJsonLd],
    bodyHtml: paintingBody(p),
  };
}

function buildRoutes(): RouteHead[] {
  // Attach crawlable body prose to the content-bearing static routes at RENDER
  // time (not in the STATIC_ROUTES literal — the body builders reference escHtml
  // which is defined later in module load).
  const statics = STATIC_ROUTES.map((r) => {
    if (r.routePath === "/collections") return { ...r, bodyHtml: collectionsBody() };
    if (r.routePath === "/about")
      return { ...r, bodyHtml: aboutBody(), jsonLd: [aboutJsonLd()] };
    return r;
  });
  return [...statics, ...PAINTINGS.map(paintingRoute)];
}

// ---- HTML head rewriting ----------------------------------------------------
const escHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string): string => escHtml(s).replace(/"/g, "&quot;");

// ---- Crawlable body prose (visually-hidden, injected into #root) ------------
// These run at render time (via buildRoutes/paintingRoute), AFTER module load,
// so referencing escHtml above is safe. The output is the SAME content React
// renders — present for non-JS crawlers, cleared by createRoot for JS visitors.

/** \n-delimited copy block → escaped <p> paragraphs. */
const paras = (text: string): string =>
  text
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `<p>${escHtml(t)}</p>`)
    .join("");

/** string[] of paragraphs → escaped <p> paragraphs. */
const pArr = (arr: string[]): string =>
  arr.map((t) => `<p>${escHtml(t)}</p>`).join("");

const collectionTitle = (id: string): string =>
  COLLECTIONS.find((c) => c.id === id)?.title ?? id;

/** Per-painting crawlable body — title, facts, the full story, the artist's
 *  own words, and the print ladder. Mirrors what PaintingDetail renders. */
const paintingBody = (p: (typeof PAINTINGS)[number]): string => {
  const facts = [p.year, p.size, collectionTitle(p.collection), "by Stephen Meakin"]
    .filter(Boolean)
    .join(" · ");
  return [
    `<h1>${escHtml(p.title)}</h1>`,
    `<p>${escHtml(facts)}</p>`,
    paras(p.description),
    p.artistQuote
      ? `<blockquote>${escHtml(p.artistQuote)} — Stephen Meakin</blockquote>`
      : "",
    `<h2>Estate-stamped giclée prints</h2>`,
    `<ul>${getPrintTiers(p)
      .map(
        (t) =>
          `<li>${escHtml(t.label)} — ${escHtml(t.size)} — ${escHtml(formatGBP(t.pricePence))} (${escHtml(t.editionLabel)})</li>`,
      )
      .join("")}</ul>`,
    `<p><a href="/collections">Browse all collections</a></p>`,
  ]
    .filter(Boolean)
    .join("");
};

/** /collections body — the three collection essays + links to all 10 works. */
const collectionsBody = (): string =>
  [
    `<h1>The complete works of Stephen Meakin</h1>`,
    ...COLLECTIONS.map(
      (c) =>
        `<section><h2>${escHtml(c.title)}</h2>${paras(c.description)}</section>`,
    ),
    `<h2>All paintings</h2>`,
    `<ul>${PAINTINGS.map(
      (p) =>
        `<li><a href="/collections/${p.id}">${escHtml(p.title)}</a> (${escHtml(p.year)})</li>`,
    ).join("")}</ul>`,
  ].join("");

/** /about body — the chaptered monograph prose (verbatim estate copy). */
const aboutBody = (): string =>
  [
    `<h1>Stephen Meakin — the life and work</h1>`,
    pArr(ABOUT.opening),
    pArr(ABOUT.earlyLife),
    pArr(ABOUT.anegada),
    pArr(ABOUT.legacy),
    `<p>${escHtml(ABOUT.academyQuote)}</p>`,
    `<p>${escHtml(ABOUT.palestine)}</p>`,
  ].join("");

/** AboutPage JSON-LD for /about — grounds the bio to the artist Person node. */
const aboutJsonLd = (): object => ({
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Stephen Meakin — the life and work",
  url: absoluteUrl("/about"),
  about: { "@id": `${SITE_URL}/#person` },
  publisher: { "@id": `${SITE_URL}/#organization` },
  inLanguage: "en-GB",
});

/** Replace a single self-contained tag matched by `re`; record a miss. */
const setTag = (
  html: string,
  re: RegExp,
  replacement: string,
  label: string,
  warnings: string[],
): string => {
  if (!re.test(html)) {
    warnings.push(`tag not matched: ${label}`);
    return html;
  }
  return html.replace(re, replacement);
};

function renderRouteHtml(
  shell: string,
  r: RouteHead,
): { html: string; warnings: string[] } {
  const warnings: string[] = [];
  const fullTitle = pageTitle(r.title);
  const canonical = absoluteUrl(r.routePath);
  const description = r.description ?? DEFAULT_DESCRIPTION;
  const ogType = r.ogType ?? "website";
  const ogImage = r.ogImage ?? DEFAULT_OG_IMAGE;

  let html = shell;
  html = setTag(html, /<title>[\s\S]*?<\/title>/, `<title>${escHtml(fullTitle)}</title>`, "title", warnings);
  html = setTag(html, /<meta\s+name="description"[\s\S]*?>/, `<meta name="description" content="${escAttr(description)}" />`, "description", warnings);
  html = setTag(html, /<link\s+rel="canonical"[\s\S]*?>/, `<link rel="canonical" href="${escAttr(canonical)}" data-default-canonical />`, "canonical", warnings);
  html = setTag(html, /<meta\s+property="og:type"[\s\S]*?>/, `<meta property="og:type" content="${ogType}" />`, "og:type", warnings);
  html = setTag(html, /<meta\s+property="og:title"[\s\S]*?>/, `<meta property="og:title" content="${escAttr(fullTitle)}" />`, "og:title", warnings);
  html = setTag(html, /<meta\s+property="og:description"[\s\S]*?>/, `<meta property="og:description" content="${escAttr(description)}" />`, "og:description", warnings);
  // og:image (NOT og:image:width/height/alt — the closing quote after `og:image"` disambiguates).
  html = setTag(html, /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${escAttr(ogImage)}" />`, "og:image", warnings);
  if (r.ogImageAlt) {
    html = setTag(html, /<meta\s+property="og:image:alt"[\s\S]*?>/, `<meta property="og:image:alt" content="${escAttr(r.ogImageAlt)}" />`, "og:image:alt", warnings);
  }
  html = setTag(html, /<meta\s+name="twitter:title"[\s\S]*?>/, `<meta name="twitter:title" content="${escAttr(fullTitle)}" />`, "twitter:title", warnings);
  html = setTag(html, /<meta\s+name="twitter:description"[\s\S]*?>/, `<meta name="twitter:description" content="${escAttr(description)}" />`, "twitter:description", warnings);
  html = setTag(html, /<meta\s+name="twitter:image"[\s\S]*?>/, `<meta name="twitter:image" content="${escAttr(ogImage)}" />`, "twitter:image", warnings);

  // Tags the shell lacks: og:url (runtime adds it via upsertMeta) + the single
  // route JSON-LD script (id matches headMeta's JSONLD_ID so hydration replaces
  // it rather than appending a duplicate). `<` is escaped to < so the JSON
  // can never break out of the <script> element.
  const inject: string[] = [`    <meta property="og:url" content="${escAttr(canonical)}" />`];
  if (r.jsonLd && r.jsonLd.length > 0) {
    const blocks = r.jsonLd.length === 1 ? r.jsonLd[0] : r.jsonLd;
    const json = JSON.stringify(blocks).replace(/</g, "\\u003c");
    inject.push(`    <script id="route-jsonld" type="application/ld+json">${json}</script>`);
  }
  html = html.replace("</head>", `${inject.join("\n")}\n  </head>`);

  // Body prose: inject the route's real content INSIDE #root, visually-hidden,
  // so non-JS crawlers read it. main.tsx's createRoot replaces #root on mount,
  // so JS visitors (incl. Googlebot's renderer) never see it — and it carries
  // the SAME content React renders, so it isn't cloaking. clip-based hidden (a
  // standard .sr-only recipe) keeps it readable to non-JS screen readers too.
  if (r.bodyHtml) {
    const ROOT = '<div id="root"></div>';
    if (html.includes(ROOT)) {
      const hidden =
        "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0";
      html = html.replace(
        ROOT,
        `<div id="root"><div id="seo-prerender" style="${hidden}">${r.bodyHtml}</div></div>`,
      );
    } else {
      warnings.push("root div not matched — body prose not injected");
    }
  }

  return { html, warnings };
}

export interface PrerenderResult {
  count: number;
  warnings: string[];
}

/** Write dist/<route>/index.html for every route. Returns a small report. */
export function writePrerenderedRoutes(outDir: string): PrerenderResult {
  const shellPath = path.join(outDir, "index.html");
  if (!fs.existsSync(shellPath)) {
    return { count: 0, warnings: ["dist/index.html not found — skipped"] };
  }
  const shell = fs.readFileSync(shellPath, "utf8");
  const routes = buildRoutes();
  const warnings: string[] = [];
  let count = 0;
  for (const r of routes) {
    const { html, warnings: w } = renderRouteHtml(shell, r);
    warnings.push(...w.map((m) => `${r.routePath}: ${m}`));
    const outPath =
      r.routePath === "/"
        ? shellPath // home overwrites the shell (it IS dist/index.html)
        : path.join(outDir, r.routePath.replace(/^\//, ""), "index.html");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, "utf8");
    count += 1;
  }
  return { count, warnings };
}

/**
 * Vite plugin: after the bundle lands (closeBundle, same as merchantFeedPlugin),
 * emit per-route index.html files with correct head + JSON-LD into the outDir.
 */
export function prerenderPlugin(): Plugin {
  let outDir = "dist";
  return {
    name: "prerender-head",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const { count, warnings } = writePrerenderedRoutes(outDir);
      if (warnings.length > 0) {
        console.warn(`[prerender] ${warnings.length} warning(s):\n  ${warnings.join("\n  ")}`);
      }
      console.log(`[prerender] wrote ${count} per-route HTML files (head + JSON-LD)`);
    },
  };
}
