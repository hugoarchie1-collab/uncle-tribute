// =============================================================================
// SITE SEARCH — index + scorer
// -----------------------------------------------------------------------------
// A dependency-FREE, in-memory full-text index built once at module load from
// the real site data, so search covers "any keyword anywhere on the site".
//
// THIS FILE IS THE SOLE PUBLIC SURFACE for search: SearchBar and the /search
// page import ONLY from here (the SearchDoc / SearchResult types, searchSite()
// and SEARCH_TYPE_LABELS). Nothing else should reach into src/data for search.
//
// HOW THE INDEX IS BUILT (see buildIndex below):
//   - PAINTINGS     → one doc each (description + colourways + collection +
//                     artistQuote + location + tier labels), url /collections/<id>
//   - COLLECTIONS   → one doc each, url /collections
//   - NEWS          → one doc each, url /news
//   - ABOUT/WELCOME → a few section docs, type "about", url /about (WELCOME → /)
//   - FAQ           → one doc per question (Q + answer text, JSX stripped), /faq
//   - PAGES         → a hand-authored list covering EVERY route, keyword-rich so
//                     navigational queries ("returns", "gift card") resolve
//
// SCORER (scoreDoc):
//   lowercase + tokenise the query; sum per-token weighted matches across the
//   precomputed lowercased title (×5), subtitle (×3) and body (×1), with a bonus
//   for an exact-phrase substring hit and a small prefix-match allowance. Zero
//   scores are dropped; results are sorted descending and capped at `limit`.
//   Everything that can be precomputed (lowercased fields) is done once at build
//   time, so a query is just string scans over a small in-memory array — fast.
// =============================================================================

import {
  PAINTINGS,
  COLLECTIONS,
  PRINT_TIERS,
  getPaintingsByCollection,
} from "../data/paintings";
import type { Collection } from "../data/paintings";
import { NEWS, TYPE_LABEL } from "../data/news";
import { ABOUT, WELCOME } from "../data/content";

// -----------------------------------------------------------------------------
// PUBLIC TYPES
// -----------------------------------------------------------------------------

export interface SearchDoc {
  id: string;
  type: "painting" | "collection" | "page" | "news" | "about" | "faq";
  title: string;
  subtitle?: string;
  url: string;
  body: string;
  image?: string;
}

export interface SearchResult {
  doc: SearchDoc;
  score: number;
}

/** Human label for each doc type — used by SearchBar / the /search page to tag
 *  a result ("Painting", "Page", …). Single source so labels stay consistent. */
export const SEARCH_TYPE_LABELS: Record<SearchDoc["type"], string> = {
  painting: "Painting",
  collection: "Collection",
  page: "Page",
  news: "News",
  about: "About",
  faq: "FAQ",
};

// -----------------------------------------------------------------------------
// INDEX-BUILD HELPERS
// -----------------------------------------------------------------------------

/** All distinct print-tier labels (e.g. "Open Edition", "Collector Edition") so
 *  a search for "heirloom" or "collector edition" finds the paintings offering it.
 *  Tier labels are uniform across the catalogue, so this is computed once. */
const TIER_LABELS = PRINT_TIERS.map((t) => t.label);

/** Pretty collection title by id — used to enrich each painting's body. */
const COLLECTION_TITLE: Record<Collection["id"], string> = COLLECTIONS.reduce(
  (acc, c) => {
    acc[c.id] = c.title;
    return acc;
  },
  {} as Record<Collection["id"], string>,
);

/** Join an arbitrary set of optional string parts into one body blob, dropping
 *  empties so the index never carries "undefined"/stray separators. */
const joinBody = (...parts: (string | null | undefined)[]): string =>
  parts.filter((p): p is string => Boolean(p && p.trim())).join(" · ");

/**
 * Strip JSX/markup down to plain text for the FAQ answers. The FAQ source lives
 * as React nodes in FAQ.tsx; we keep ONE verbatim plain-text mirror of each
 * question + answer here (the page renders the rich JSX — this is the searchable
 * shadow). Authored as plain strings so there's no React dependency in this lib.
 */
interface FaqSeed {
  eyebrow: string;
  question: string;
  answer: string;
}

const FAQ_SEEDS: FaqSeed[] = [
  {
    eyebrow: "Provenance",
    question: "Are the prints signed?",
    answer:
      "No — Stephen passed in 2021, so prints cannot be signed in his hand. Every print is estate-stamped by The Mandala Company and numbered within its edition. Each ships with a Certificate of Authenticity carrying a unique Certificate ID. This is the convention used by the estates of Picasso, Hepworth and Hilma af Klint, and is the standard for works released posthumously by an estate.",
  },
  {
    eyebrow: "Verification",
    question: "Can I check a certificate is genuine?",
    answer:
      "Yes — every issued print is recorded in the estate ledger, and any Certificate ID can be checked against it on our Authentication page. The Estate Registry covers prints issued from June 2026 onward; for an earlier or unlisted certificate, write to info@themandalacompany.com and the estate will confirm it directly.",
  },
  {
    eyebrow: "The print itself",
    question: "What are the prints made on?",
    answer:
      "350gsm Hahnemühle archival paper, printed with pigment inks on a 12-colour large-format giclée press. Each print is made to order at one of the UK's leading giclée print ateliers in London, used by museums and contemporary artists alike. Lifespan under normal display conditions is in excess of 200 years.",
  },
  {
    eyebrow: "Lead time",
    question: "How long until my print arrives?",
    answer:
      "Unframed prints dispatch within 7–10 working days of your order, with free delivery worldwide. Framed orders add roughly two weeks to that. Prints hand-finished by Polly Wedge dispatch within two weeks maximum. You'll receive an email with tracking the moment your print leaves the studio.",
  },
  {
    eyebrow: "Sizes & editions",
    question: "What sizes do you offer?",
    answer:
      "Four tiers, each estate-stamped and issued within the estate's edition cycle. Open Edition A3 at £275 (issued within each edition, no fixed allocation). Collector Edition A2 at £495 (200 allocated per edition). Atelier Edition A1 at £925 (75 per edition). Heirloom Edition A0 at £1,895 (18 per edition). Every price includes free UK delivery.",
  },
  {
    eyebrow: "Framing",
    question: "Can I have my print framed?",
    answer:
      "Yes — framing is offered on the A2 and A1 tiers. Choose your finish: a solid-wood or contemporary tray frame (natural oak, stained black, white or walnut tray), with shatter-safe acrylic glazing as standard or a museum-grade anti-reflective upgrade — every finish included in the framing price. Add £295 on A2 and £395 on A1. Delivery is free worldwide, framed or unframed — there is no framing surcharge at checkout. Framed orders add roughly two weeks to the lead time.",
  },
  {
    eyebrow: "Hand-finishing",
    question: 'What is "hand-finished by Polly"?',
    answer:
      "Polly Wedge, Stephen's sister, hand-paints additional geometric detail onto selected prints in Stephen's own tradition. Each hand-finished piece is therefore unique. The add-on is available on the A2 and A1 tiers only, by request, and adds £350 (A2) or £495 (A1). Allow two weeks maximum from order to dispatch.",
  },
  {
    eyebrow: "Shipping",
    question: "Do you ship internationally?",
    answer:
      "Yes — to the UK, Europe, North America, Australia and New Zealand. Delivery is free worldwide on every order, framed or unframed, with nothing added at checkout. International buyers may be charged local import duties or VAT on delivery by their courier — these are set by your country's customs authority, not by us.",
  },
  {
    eyebrow: "After-sale care",
    question: "What if my print arrives damaged or doesn't arrive?",
    answer:
      "Write to info@themandalacompany.com within 14 days. If it arrived damaged, send a photo of the damage and we'll replace at no cost or refund — your choice. If it didn't arrive, we'll open a claim with the carrier and replace or refund within 30 days. The full policy lives on our returns and terms pages.",
  },
];

/**
 * Hand-authored navigational pages — one doc PER ROUTE so a query like
 * "returns", "gift card", "verify a certificate" or "find a print" resolves to
 * the right page even when no painting/news/about doc mentions the keyword. The
 * `body` is deliberately keyword-rich (intent synonyms a visitor might type),
 * not marketing copy.
 */
interface PageSeed {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  body: string;
}

const PAGE_SEEDS: PageSeed[] = [
  {
    id: "page-home",
    title: "Home",
    subtitle: "The Art of Stephen Meakin",
    url: "/",
    body: "Home page welcome The Mandala Company Stephen Meakin SEM mandala artist sacred geometry geometric paintings prints. Start here, the front page, landing page, homepage.",
  },
  {
    id: "page-collections",
    title: "Collections",
    subtitle: "Browse all the work",
    url: "/collections",
    body: "Browse all collections and paintings — Habundia, Genesis, Born in the Sky. The full catalogue of Stephen Meakin's mandala paintings available as giclée prints. Shop, buy a print, gallery, artwork, all paintings, the complete catalogue.",
  },
  {
    id: "page-for-you",
    title: "For You",
    subtitle: "Find a print",
    url: "/for-you",
    body: "Find a print. A guided chooser to help you find the right painting — a gift, a recommendation, a print for a room or a person. Recommend me a print, help me choose, which painting, quiz, gift idea, present.",
  },
  {
    id: "page-about",
    title: "About",
    subtitle: "The life of Stephen Meakin",
    url: "/about",
    body: "About Stephen Meakin — his life, biography, story, sacred geometry, mandala art, TAGA The Art of Geometry Academy, the four traditions, Lewes, the estate. Who is the artist, his history, his work.",
  },
  {
    id: "page-memories",
    title: "Memories",
    subtitle: "The Book of Memories",
    url: "/memories",
    body: "The Book of Memories — read and leave memories, tributes, condolences and stories about Stephen Meakin. A memorial wall, guestbook, share a memory, remembrance.",
  },
  {
    id: "page-news",
    title: "News",
    subtitle: "News & releases",
    url: "/news",
    body: "News and releases — the estate calendar of upcoming print drops, new colourways, announcements, exhibitions, workshops and events. What's new, updates, latest, coming soon.",
  },
  {
    id: "page-auth",
    title: "Authentication",
    subtitle: "The Estate Registry",
    url: "/auth",
    body: "Authentication — verify a Certificate of Authenticity. Check a Certificate ID against the estate ledger to confirm provenance. Verify, authenticate, COA, certificate, genuine, registry, proof, real.",
  },
  {
    id: "page-gift",
    title: "Gift cards",
    subtitle: "Gift e-vouchers",
    url: "/gift",
    body: "Gift cards and gift vouchers — buy an e-voucher for a print as a present. Custom amounts and set denominations. Gift certificate, give a gift, present, voucher, gift idea.",
  },
  {
    id: "page-trade",
    title: "Trade",
    subtitle: "For interior designers & art consultants",
    url: "/trade",
    body: "Trade enquiries for interior designers, art consultants and the design industry. Commercial, bulk, project, hospitality, contract, trade account, designer pricing.",
  },
  {
    id: "page-contact",
    title: "Contact",
    subtitle: "Get in touch with the estate",
    url: "/contact",
    body: "Contact The Mandala Company — get in touch, send a message, email the estate at info@themandalacompany.com, enquire, ask a question, support, help.",
  },
  {
    id: "page-faq",
    title: "FAQ",
    subtitle: "Frequently asked questions",
    url: "/faq",
    body: "Frequently asked questions — answers about prints, provenance, paper, sizes, editions, drops, framing, hand-finishing, shipping, delivery and after-sale care. Help, questions, info.",
  },
  {
    id: "page-basket",
    title: "Basket",
    subtitle: "Your basket",
    url: "/basket",
    body: "Your basket — review the prints you've added and proceed to checkout. Cart, shopping bag, buy, pay, checkout.",
  },
  {
    id: "page-returns",
    title: "Returns",
    subtitle: "Returns, refunds & damages",
    url: "/returns",
    body: "Returns, refunds and damages policy. Return a print, refund, damaged in transit, didn't arrive, replacement, money back, cancel an order.",
  },
  {
    id: "page-terms",
    title: "Terms",
    subtitle: "Terms of sale",
    url: "/terms",
    body: "Terms of sale and conditions. Made-to-order exemption, your rights, the legal terms of buying a print, terms and conditions, T&Cs.",
  },
  {
    id: "page-privacy",
    title: "Privacy",
    subtitle: "Privacy policy",
    url: "/privacy",
    body: "Privacy policy — how your data is handled, cookies and analytics, UK GDPR, data protection, your information.",
  },
  {
    id: "page-account",
    title: "Your account",
    subtitle: "Sign in",
    url: "/account",
    body: "Your account — sign in, log in, manage your details, view your saved information.",
  },
  {
    id: "page-orders",
    title: "Orders & returns",
    subtitle: "Track an order",
    url: "/orders",
    body: "Orders and returns — track an order, order status, delivery tracking, start a return or refund, after-sale care.",
  },
];

// -----------------------------------------------------------------------------
// INDEX
// -----------------------------------------------------------------------------

/** An index entry = a public SearchDoc plus its precomputed lowercased fields
 *  (so scoring never re-lowercases per query). */
interface IndexedDoc {
  doc: SearchDoc;
  titleLc: string;
  subtitleLc: string;
  bodyLc: string;
}

/**
 * Fold diacritics so accented words index/search as their plain-ASCII form:
 * "Hahnemühle" → "hahnemuhle", "giclée" → "giclee", "Miró" → "miro". Decompose
 * to base char + combining marks (NFKD), then drop the marks. Applied to BOTH
 * the indexed fields and the query (always paired with `.toLowerCase()`), so an
 * un-accented query matches accented source text and vice-versa. The word regex
 * (`/[a-z0-9£]+/`) then keeps the whole word intact ("hahnemuhle", not the old
 * "hahnem" + "hle" split on the ü). `£` carries no diacritic, so it's untouched.
 */
const foldDiacritics = (s: string): string =>
  s.normalize("NFKD").replace(/\p{Diacritic}/gu, "");

const toIndexed = (doc: SearchDoc): IndexedDoc => ({
  doc,
  titleLc: foldDiacritics(doc.title.toLowerCase()),
  subtitleLc: foldDiacritics((doc.subtitle ?? "").toLowerCase()),
  bodyLc: foldDiacritics(doc.body.toLowerCase()),
});

function buildIndex(): IndexedDoc[] {
  const docs: SearchDoc[] = [];

  // --- PAINTINGS ---------------------------------------------------------
  for (const p of PAINTINGS) {
    const original =
      p.colourways.find((c) => c.isOriginal) ?? p.colourways[0];
    const collectionTitle = COLLECTION_TITLE[p.collection] ?? p.collection;
    const colourwayNames = p.colourways.map((c) => c.name).join(" · ");
    docs.push({
      id: `painting-${p.id}`,
      type: "painting",
      title: p.title,
      subtitle: joinBody(collectionTitle, p.year),
      url: `/collections/${p.id}`,
      image: original?.image,
      body: joinBody(
        p.description,
        colourwayNames,
        collectionTitle,
        p.artistQuote,
        p.location,
        TIER_LABELS.join(" · "),
      ),
    });
  }

  // --- COLLECTIONS -------------------------------------------------------
  for (const c of COLLECTIONS) {
    const memberTitles = getPaintingsByCollection(c.id)
      .map((p) => p.title)
      .join(" · ");
    docs.push({
      id: `collection-${c.id}`,
      type: "collection",
      title: c.title,
      subtitle: "Collection",
      url: "/collections",
      body: joinBody(c.title, c.description, memberTitles),
    });
  }

  // --- NEWS --------------------------------------------------------------
  for (const n of NEWS) {
    docs.push({
      id: `news-${n.id}`,
      type: "news",
      title: n.title,
      subtitle: joinBody(TYPE_LABEL[n.type], n.displayDate),
      url: "/news",
      image: n.cover,
      body: joinBody(n.title, n.summary, TYPE_LABEL[n.type], n.location),
    });
  }

  // --- ABOUT + WELCOME ---------------------------------------------------
  // A few section docs from the long-form text. WELCOME.bio maps to "/", the
  // ABOUT sections map to "/about".
  const aboutSections: { id: string; title: string; body: string }[] = [
    {
      id: "about-opening",
      title: "Stephen Meakin",
      body: ABOUT.opening.join(" "),
    },
    {
      id: "about-early-life",
      title: "Early life",
      body: ABOUT.earlyLife.join(" "),
    },
    {
      id: "about-legacy",
      title: "Lewes, the estate & TAGA",
      body: ABOUT.legacy.join(" "),
    },
    {
      id: "about-academy",
      title: "The Art of Geometry Academy",
      body: ABOUT.academyQuote,
    },
    {
      id: "about-palestine",
      title: "Teaching in Jordan",
      body: ABOUT.palestine,
    },
  ];
  for (const s of aboutSections) {
    docs.push({
      id: s.id,
      type: "about",
      title: s.title,
      subtitle: "About Stephen Meakin",
      url: "/about",
      body: s.body,
    });
  }
  docs.push({
    id: "about-welcome-bio",
    type: "about",
    title: "Stephen Meakin — SEM",
    subtitle: "About Stephen Meakin",
    url: "/",
    body: WELCOME.bio.join(" "),
  });

  // --- FAQ ---------------------------------------------------------------
  FAQ_SEEDS.forEach((f, i) => {
    docs.push({
      id: `faq-${i}`,
      type: "faq",
      title: f.question,
      subtitle: joinBody(f.eyebrow, "FAQ"),
      url: "/faq",
      body: joinBody(f.eyebrow, f.question, f.answer),
    });
  });

  // --- PAGES -------------------------------------------------------------
  for (const pg of PAGE_SEEDS) {
    docs.push({
      id: pg.id,
      type: "page",
      title: pg.title,
      subtitle: pg.subtitle,
      url: pg.url,
      body: joinBody(pg.title, pg.subtitle, pg.body),
    });
  }

  return docs.map(toIndexed);
}

/** The index, built ONCE at module load. */
const INDEX: IndexedDoc[] = buildIndex();

/** Number of documents in the index — exported for diagnostics / tests. */
export const SEARCH_DOC_COUNT = INDEX.length;

// -----------------------------------------------------------------------------
// SCORER
// -----------------------------------------------------------------------------

/** Lowercase + diacritic-fold + split a string into word tokens (≥1 char,
 *  alnum runs). Folding here keeps the query side consistent with the indexed
 *  fields (also folded in `toIndexed`), so "hahnemuhle" matches "Hahnemühle". */
const tokenise = (s: string): string[] =>
  foldDiacritics(s.toLowerCase()).match(/[a-z0-9£]+/gi)?.map((t) => t.toLowerCase()) ?? [];

// Field weights — title matters most, then subtitle, then body.
const W_TITLE = 5;
const W_SUBTITLE = 3;
const W_BODY = 1;
// Bonuses.
const PHRASE_BONUS = 8; // whole query appears as a substring (title/subtitle/body)
const PREFIX_WEIGHT = 0.4; // partial credit when a doc word starts with the token

/**
 * Count whole-word occurrences of `token` in `haystackLc`, plus a small prefix
 * allowance (a doc word that merely STARTS WITH the token earns PREFIX_WEIGHT,
 * so "geo" finds "geometry"). `haystackLc` MUST already be lowercased.
 */
const tokenScore = (token: string, haystackLc: string): number => {
  if (!token || !haystackLc) return 0;
  let score = 0;
  let exact = 0;
  let prefix = 0;
  // Scan word boundaries cheaply with a single regex over the lowercased field.
  // Words are alnum/£ runs (mirrors `tokenise`).
  const words = haystackLc.match(/[a-z0-9£]+/g);
  if (!words) return 0;
  for (const w of words) {
    if (w === token) exact += 1;
    else if (w.length > token.length && w.startsWith(token)) prefix += 1;
  }
  score += exact;
  // Cap prefix credit so a single common stem can't dominate.
  score += Math.min(prefix, 3) * PREFIX_WEIGHT;
  return score;
};

function scoreDoc(indexed: IndexedDoc, tokens: string[], phraseLc: string): number {
  let score = 0;

  for (const token of tokens) {
    score += tokenScore(token, indexed.titleLc) * W_TITLE;
    score += tokenScore(token, indexed.subtitleLc) * W_SUBTITLE;
    score += tokenScore(token, indexed.bodyLc) * W_BODY;
  }

  // Exact-phrase substring bonus (only worth checking for a multi-token query
  // or a query with internal spaces — a single token already scored above).
  if (phraseLc.length > 1 && tokens.length > 1) {
    if (indexed.titleLc.includes(phraseLc)) score += PHRASE_BONUS * 2;
    else if (indexed.subtitleLc.includes(phraseLc)) score += PHRASE_BONUS;
    else if (indexed.bodyLc.includes(phraseLc)) score += PHRASE_BONUS / 2;
  }

  return score;
}

/**
 * Search the site index.
 *
 * @param query  free-text query — lowercased + tokenised internally.
 * @param limit  max results (default 24). Zero-score docs are always dropped.
 * @returns      results sorted by score descending (ties keep index order,
 *               which roughly tracks catalogue → collection → news → about →
 *               faq → page authoring order).
 */
export function searchSite(query: string, limit = 24): SearchResult[] {
  const phraseLc = foldDiacritics(query.trim().toLowerCase());
  const tokens = tokenise(query);
  if (tokens.length === 0) return [];

  const results: SearchResult[] = [];
  for (const indexed of INDEX) {
    const score = scoreDoc(indexed, tokens, phraseLc);
    if (score > 0) results.push({ doc: indexed.doc, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, Math.max(0, limit));
}
