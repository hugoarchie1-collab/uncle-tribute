// =============================================================================
// GOOGLE MERCHANT CENTER PRODUCT FEED — build-time generator
// =============================================================================
// Emits dist/merchant-feed.xml (RSS 2.0 with the g: Google Shopping namespace)
// plus dist/merchant-feed-summary.txt (SKU count per painting, a build-log aid)
// during `vite build`, via the tiny plugin exported at the bottom.
//
// Single source of truth: src/data/paintings.ts. Every price comes from the
// canonical PRINT_TIERS ladder (via getPrintTiers) — NOTHING is hardcoded
// here, so a pricing change in paintings.ts flows into the feed on the next
// build automatically (gotcha #9 stays one-directional: data file → feed).
//
// One SKU per (painting × available colourway × available tier). Hidden
// colourways and tiers (available: false — e.g. the Studio one-of-one) are
// skipped. No GTIN/MPN exists for handmade estate prints, so each item
// carries g:identifier_exists = "false".
//
// Live feed URL once deployed: https://themandalacompany.com/merchant-feed.xml
// =============================================================================

import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { PAINTINGS, getPrintTiers } from "../src/data/paintings";

const SITE = "https://themandalacompany.com";

const FEED_TITLE = "The Art of Stephen Meakin — Print Editions";
const FEED_DESCRIPTION =
  "Estate-stamped giclée print editions of paintings by Stephen Meakin (1966–2021), made to order by The Mandala Company.";

const PRODUCT_TYPE =
  "Home & Garden > Decor > Artwork > Posters, Prints & Visual Artwork";

// Google's NUMERIC product taxonomy id for the node above ("Posters, Prints &
// Visual Artwork"). g:product_type is our own free-text taxonomy; Google
// prefers the numeric g:google_product_category for categorisation + free-
// listing ranking. https://support.google.com/merchants/answer/6324436
const GOOGLE_PRODUCT_CATEGORY = "500044";

/** Escape the five XML entities for element text content. */
const escapeXml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** "Sussex Pink" → "sussex-pink" (id-safe slug). */
const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** "A2 (42 × 59.4 cm)" → "A2". Falls back to the full size string. */
const aSize = (size: string): string => /^A\d+/.exec(size)?.[0] ?? size;

/** Collapse newlines/whitespace and cut at ~500 chars on a word boundary. */
const feedDescription = (raw: string): string => {
  const flat = raw.replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ").trim();
  if (flat.length <= 500) return flat;
  const cut = flat.slice(0, 500);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
};

/** "${pounds}.00 GBP" from integer pence — derived, never hardcoded. */
const feedPrice = (pricePence: number): string =>
  `${(pricePence / 100).toFixed(2)} GBP`;

/** Trim the composed title to Google's 150-char cap (word boundary). */
const feedTitle = (full: string): string => {
  if (full.length <= 150) return full;
  const cut = full.slice(0, 150);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
};

export interface MerchantFeed {
  xml: string;
  summary: string;
  skuCount: number;
}

export function buildMerchantFeed(): MerchantFeed {
  const items: string[] = [];
  const perPainting: { id: string; title: string; skus: number }[] = [];

  for (const painting of PAINTINGS) {
    const colourways = painting.colourways.filter((c) => c.available);
    const tiers = getPrintTiers(painting); // honours available: false
    const description = feedDescription(painting.description);
    let skus = 0;

    for (const colourway of colourways) {
      const link = `${SITE}/collections/${painting.id}?c=${encodeURIComponent(colourway.name)}`;
      const imageLink = `${SITE}${colourway.image}`;

      for (const tier of tiers) {
        const id = `${painting.id}__${slugify(colourway.name)}__${tier.id}`;
        const title = feedTitle(
          `${painting.title} — ${colourway.name} — ${tier.label} ${aSize(tier.size)}`,
        );

        items.push(
          [
            "    <item>",
            `      <g:id>${escapeXml(id)}</g:id>`,
            `      <title>${escapeXml(title)}</title>`,
            `      <description>${escapeXml(description)}</description>`,
            `      <link>${escapeXml(link)}</link>`,
            `      <g:image_link>${escapeXml(imageLink)}</g:image_link>`,
            `      <g:price>${escapeXml(feedPrice(tier.pricePence))}</g:price>`,
            "      <g:availability>in_stock</g:availability>",
            "      <g:condition>new</g:condition>",
            "      <g:brand>Stephen Meakin</g:brand>",
            `      <g:product_type>${escapeXml(PRODUCT_TYPE)}</g:product_type>`,
            `      <g:google_product_category>${GOOGLE_PRODUCT_CATEGORY}</g:google_product_category>`,
            // Variant grouping: every colourway × size of ONE painting shares an
            // item_group_id (the painting id), with g:color + g:size as the
            // variant axes — so Google clusters them into one product with
            // colour/size pickers in free listings instead of 100 unrelated SKUs.
            `      <g:item_group_id>${escapeXml(painting.id)}</g:item_group_id>`,
            `      <g:color>${escapeXml(colourway.name)}</g:color>`,
            `      <g:size>${escapeXml(aSize(tier.size))}</g:size>`,
            "      <g:identifier_exists>false</g:identifier_exists>",
            // Free worldwide delivery (policy 2026-06-06) — declared in-feed so
            // the £0 benefit shows in free listings rather than being estimated.
            // Mirrors api/checkout.ts buildShippingOptions + the PDP Product
            // schema's £0 shippingRate (gotcha #9: one free-shipping truth).
            "      <g:shipping>",
            "        <g:country>GB</g:country>",
            "        <g:price>0.00 GBP</g:price>",
            "      </g:shipping>",
            "    </item>",
          ].join("\n"),
        );
        skus += 1;
      }
    }

    perPainting.push({ id: painting.id, title: painting.title, skus });
  }

  const skuCount = perPainting.reduce((sum, p) => sum + p.skus, 0);

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "  <channel>",
    `    <title>${escapeXml(FEED_TITLE)}</title>`,
    `    <link>${escapeXml(SITE)}</link>`,
    `    <description>${escapeXml(FEED_DESCRIPTION)}</description>`,
    items.join("\n"),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  const summary = [
    "Google Merchant Center feed — SKU count per painting",
    `Feed: ${SITE}/merchant-feed.xml`,
    "",
    ...perPainting.map(
      (p) => `${p.id}: ${p.skus} SKU${p.skus === 1 ? "" : "s"} (${p.title})`,
    ),
    "",
    `TOTAL: ${skuCount} SKUs across ${perPainting.length} paintings`,
    "",
  ].join("\n");

  return { xml, summary, skuCount };
}

/**
 * Vite plugin: writes dist/merchant-feed.xml + dist/merchant-feed-summary.txt
 * after the bundle lands. closeBundle (not emitFile) keeps it independent of
 * the bundler's asset pipeline — plain fs writes into the resolved outDir.
 */
export function merchantFeedPlugin(): Plugin {
  let outDir = "dist";
  return {
    name: "merchant-feed",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const { xml, summary, skuCount } = buildMerchantFeed();
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, "merchant-feed.xml"), xml, "utf8");
      fs.writeFileSync(
        path.join(outDir, "merchant-feed-summary.txt"),
        summary,
        "utf8",
      );
      console.log(`[merchant-feed] wrote merchant-feed.xml (${skuCount} SKUs)`);
    },
  };
}
