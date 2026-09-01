// =============================================================================
// SITE SEARCH — index + scorer
// -----------------------------------------------------------------------------
// A dependency-FREE, in-memory full-text index built once at module load from
// the real site data, so search covers "any keyword anywhere on the site".
//
// THIS FILE IS THE SOLE PUBLIC SURFACE for search: SearchBar and the /search
// page import ONLY from here (the SearchDoc / SearchResult / SearchSnippet
// types, searchSite() and SEARCH_TYPE_LABELS). Nothing else should reach into
// src/data for search.
//
// HOW THE INDEX IS BUILT (see buildIndex below):
//   - PAINTINGS     → one doc each (description + AVAILABLE colourways +
//                     collection + artistQuote + location + original size),
//                     url /collections/<id>
//   - COLLECTIONS   → one doc each, url /collections#collection-<id>
//   - NEWS          → one doc each, url /news
//   - ABOUT/WELCOME → section docs from the long-form estate text — the bio,
//                     early life, Art as ritual, Lewes/TAGA, the Academy + the
//                     students' letter, Jordan, Exhibitions & commissions, the
//                     2011 Dubai interview and Polly's tribute. All → /about.
//   - FAQ           → one doc per question (Q + answer text, JSX stripped), /faq
//   - PAGES         → a hand-authored list covering every INDEXABLE route,
//                     keyword-rich so navigational queries ("returns", "gift
//                     card") resolve. Deliberately NOT indexed: /search itself,
//                     the noindex transactional routes (/order/*), and the
//                     unlinked private routes (/representatives, /trade/pricing).
//
// ⚠️ CATALOGUE-WIDE CONSTANTS ARE NEVER CONCATENATED INTO PER-DOC BODIES.
//    A term that appears in all 30 painting docs carries ZERO discriminating
//    information — it only inflates scores and drags the whole catalogue into
//    unrelated result sets. (This is exactly what the old `TIER_LABELS.join()`
//    in every painting body did: it put the RETIRED "Heirloom Edition" and
//    "Original — One of One" on all 30 works, and made "emblem" return 12
//    paintings instead of the £250 entry tier.) The print ladder now lives in
//    ONE document — the "What sizes do you offer?" FAQ — where it discriminates.
//
// ⚠️ AVAILABILITY IS RESPECTED EVERYWHERE. Only `available` print tiers and
//    `available` colourways are indexed, matching Collections.tsx /
//    FindAPrint.tsx. A buyer must never be able to search their way to a
//    product or swatch the site does not sell.
//
// SCORER (scoreAll):
//   Okapi BM25 over precomputed per-field term-frequency maps.
//     · The query is lowercased, diacritic-folded, tokenised, stop-worded,
//       deduped and capped (MAX_QUERY_TOKENS) — so a pasted essay can't turn
//       into thousands of scoring passes, and "kepler's" can't leak a bare "s"
//       token that matches every document on the site.
//     · Each term scores against the precomputed title (×5) / subtitle (×3) /
//       body (×1) tf-maps — NEVER by re-splitting the raw text with a regex.
//     · Per-term IDF is computed from the number of docs the term actually
//       matched in THIS query (so prefix / fuzzy / synonym matches are
//       weighted honestly), which is what stops a term present in every
//       document from scoring at all.
//     · Term frequency is saturated and length-normalised (k1 / b), so a long
//       painting description can no longer out-score an exact title match.
//     · Plus an exact-phrase substring bonus, a prefix allowance and bounded
//       edit-distance typo tolerance.
//   Everything that can be precomputed is done ONCE at module load, so a query
//   is arithmetic over a small in-memory array. A 200-word paste scores in
//   single-digit milliseconds.
//
// SNIPPETS (see buildSnippet):
//   A result may carry an OPTIONAL `snippet` — a verbatim substring of the
//   doc's own prose around the first match, snapped to sentence boundaries.
//   ⚠️ HARD RULE: docs flagged `snippetable: false` can NEVER produce one.
//   Polly Wedge's funeral tribute is such a doc — it is FINDABLE (it routes to
//   /about) but a fragment of a eulogy must never be excerpted next to a price.
//   The flag is set at index-build time, so the exclusion is structural, not a
//   runtime check that a later caller could forget.
// =============================================================================

import {
  PAINTINGS,
  COLLECTIONS,
  PRINT_TIERS,
  getPaintingsByCollection,
} from "../data/paintings";
import type { Collection } from "../data/paintings";
import { NEWS, TYPE_LABEL } from "../data/news";
import {
  ABOUT,
  WELCOME,
  INTERVIEW,
  CREDENTIALS,
  TRIBUTE,
} from "../data/content";
import { SOCIAL_PROFILES } from "../data/socials";

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

/**
 * An OPTIONAL matched-text excerpt, so a result can show WHY it matched.
 *
 * `text` is a VERBATIM substring of the named field — no words are invented,
 * reordered or rewritten. `offset` is its start index in that field, so a
 * caller can highlight the match in place if it wants to. `leadingEllipsis` /
 * `trailingEllipsis` say whether the excerpt was cut out of a longer passage
 * (render "…" — the field text itself never contains one).
 *
 * Absent when the doc is snippet-excluded (see the header note on TRIBUTE) or
 * when no clean sentence-bounded excerpt could be produced.
 */
export interface SearchSnippet {
  field: "title" | "subtitle" | "body";
  text: string;
  offset: number;
  leadingEllipsis: boolean;
  trailingEllipsis: boolean;
}

export interface SearchResult {
  doc: SearchDoc;
  score: number;
  /** Optional matched-text excerpt — see SearchSnippet. Purely additive: a
   *  caller that ignores it renders exactly as before. */
  snippet?: SearchSnippet;
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

/** The `[TBD]` marker `paintings.ts` carries on the two works whose year the
 *  family hasn't filled in yet. It is an INTERNAL placeholder and must never
 *  reach a customer — FindAPrint.tsx:504, Collections.tsx, PaintingDetail.tsx,
 *  NotFound.tsx and Welcome.tsx all guard the exact same string. */
const YEAR_PLACEHOLDER = "[ DATE ]";

/** A painting's year, or undefined when it's still the internal placeholder. */
const realYear = (year: string | undefined): string | undefined =>
  year && year.trim() && year !== YEAR_PLACEHOLDER ? year : undefined;

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
 * Extra search terms for a physical dimension string.
 *
 * The catalogue writes sizes as `"60 × 60 cm (approx. 24 × 24 in)"`. Tokenising
 * that already yields `60 / 60 / cm / 24 / 24 / in`, so `"60 x 60"` works — but
 * a visitor just as often types `"60x60"` or `"60cm"`, which tokenise as ONE
 * word and would miss. This emits the glued forms so all three spellings hit.
 *
 * ⚠️ These are INDEX-ONLY keywords (see IndexSeed.keywords) — never rendered,
 * never snippeted. The A-series names (A2/A3/…) are RETIRED in buyer-facing
 * copy and are deliberately NOT emitted here; legacy A-series queries are
 * handled by the hidden SYNONYMS entries instead.
 */
const sizeSearchTerms = (size: string | undefined): string[] => {
  if (!size) return [];
  const terms: string[] = [];
  const pair = /(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*(cm|mm|in)?/gi;
  let m: RegExpExecArray | null;
  while ((m = pair.exec(size)) !== null) {
    const [, a, b, unit] = m;
    terms.push(`${a}x${b}`);
    if (unit) terms.push(`${a}${unit.toLowerCase()}`, `${b}${unit.toLowerCase()}`);
  }
  return terms;
};

/**
 * The print ladder, as INDEX-ONLY keywords for the ONE document that should own
 * it: the "What sizes do you offer?" FAQ. Derived from `PRINT_TIERS` and
 * filtered to `available`, so a retired rung (Heirloom / Original — One of One)
 * can never be searched back into existence.
 *
 * ⚠️ NO PRICES ARE DERIVED HERE. Money lives in `paintings.ts` + the three /api
 * mirrors (gotcha #9); the FAQ seed below already carries the verbatim
 * £250 / £445 / £750 / £1,300 wording from FAQ.tsx. Adding a fifth pricing
 * mirror to a search index would be a liability, not a feature.
 */
const TIER_KEYWORDS: string[] = PRINT_TIERS.filter((t) => t.available).flatMap(
  (t) => [t.label, t.size, ...sizeSearchTerms(t.size)],
);

/**
 * A seed is a doc plus two index-only extras.
 *
 * `keywords`  — searchable but NEVER displayed and NEVER snippeted: intent
 *               synonyms a visitor might type, glued size spellings, derived
 *               catalogue data. This is where anything that isn't authored
 *               prose belongs, so `doc.body` stays quotable.
 * `snippetable` — false structurally excludes the doc from excerpting.
 * `snippetFrom` — the PROSE part of `doc.body` an excerpt may be taken from.
 *               MUST be a substring of `doc.body` (offsets are reported in
 *               body coordinates). Used where `joinBody` prefixes the body with
 *               the title / eyebrow, which would otherwise produce a snippet
 *               that just echoes the heading above it.
 */
interface IndexSeed {
  doc: SearchDoc;
  keywords?: string;
  snippetable: boolean;
  snippetFrom?: string;
}

/**
 * PLAIN-TEXT MIRROR OF `src/pages/FAQ.tsx` → the exported `FAQS` array.
 *
 * ⚠️ WHY THIS IS HAND-COPIED (and what should replace it):
 * `FAQS` in FAQ.tsx is the real source of truth and IS exported — but its
 * answers are `ReactNode` (JSX with <Link>/<strong>/<a>), and FAQ.tsx imports
 * Nav → SearchBar → this module. Importing it here would be a require cycle
 * AND would drag a whole page component into the nav bundle. The clean fix is
 * to lift `FAQS` + its `nodeText` flattener into a data module (e.g.
 * `src/data/faq.tsx`) that BOTH FAQ.tsx and this file import — then this array
 * disappears. That refactor touches FAQ.tsx, which this module does not own.
 *
 * Until then: every string below is VERBATIM from FAQ.tsx's `FAQS`, in the same
 * order, with JSX flattened to text (a `<br/><br/>` becomes a space). Re-copy
 * it whenever FAQ.tsx changes — never paraphrase, never re-word, never invent.
 * Last reconciled against FAQ.tsx: 2026-09-01 (10 questions).
 */
interface FaqSeed {
  /** Stable id suffix — used instead of the array index so the keyword blobs
   *  below stay attached to the right question if the order ever changes. */
  id: string;
  eyebrow: string;
  question: string;
  answer: string;
  /** Index-only intent terms — never displayed, never snippeted. */
  keywords?: string;
}

const FAQ_SEEDS: FaqSeed[] = [
  {
    id: "signed",
    eyebrow: "Provenance",
    question: "Are the prints signed?",
    answer:
      "No — Stephen passed in 2021, so prints cannot be signed in his hand. Every print is estate-stamped by The Mandala Company and numbered within its edition. Each is issued with a Certificate of Authenticity carrying a unique Certificate ID. This is the convention used by the estates of Picasso, Hepworth and Hilma af Klint, and is the standard for works released posthumously by an estate.",
    keywords: "signature autograph hand-signed posthumous estate stamp",
  },
  {
    id: "verify",
    eyebrow: "Verification",
    question: "Can I check a certificate is genuine?",
    answer:
      "Yes — every issued print is recorded in the estate ledger, and any Certificate ID can be checked against it on our Authentication page. The Estate Registry covers prints issued from June 2026 onward; for an earlier or unlisted certificate, write to info@themandalacompany.com and the estate will confirm it directly.",
    keywords: "verify authenticate coa registry ledger real fake provenance",
  },
  {
    id: "material",
    eyebrow: "The print itself",
    question: "What are the prints made on — and can I have canvas?",
    answer:
      "As standard, every print is made on Hahnemühle Photo Rag — 308gsm, 100% cotton archival paper, printed with pigment inks on a 12-colour large-format giclée press. Each is made to order on the Sussex coast, at a Hahnemühle Certified Studio. Under normal display conditions it carries archival, museum-grade lightfastness rated by the paper manufacturer. Every piece is offered two ways, and you choose on the product page: framed — the giclée on fine-art paper, hand-mounted and framed in solid wood behind glass, ready to hang; or canvas — the same image as a fine-art giclée print on heavyweight 370gsm art canvas, a bold, tactile, glass-free surface. Both are made to order at the same price — pick whichever suits your wall, or ask us if you'd like a hand.",
    keywords: "paper stock material substrate fine art quality archival",
  },
  {
    id: "lead-time",
    eyebrow: "Lead time",
    question: "How long until my print arrives?",
    answer:
      "Every piece is made to order — framed in solid wood, or a fine-art canvas print — and dispatched within 2–4 working days of your order; with tracked courier transit on top, most UK orders arrive within about a week (a few days more overseas). Delivery is free worldwide. Prints hand-finished by Polly (Stephen's sister) are completed by hand first, so allow up to two weeks. You'll receive an email with tracking the moment your print leaves the studio.",
    keywords: "how long wait arrive dispatch tracking courier turnaround",
  },
  {
    id: "sizes",
    eyebrow: "Sizes & editions",
    question: "What sizes do you offer?",
    answer:
      "Four sizes, each estate-stamped — framed in solid wood and ready to hang, or a fine-art canvas print, with the frame or canvas included in the price and free delivery worldwide. Emblem Edition at £250 (the accessible entry, unnumbered — issued to order). Gallery Edition at £445 (unnumbered, issued to order — no fixed allocation). Collector Edition at £750 (edition of 200). Atelier Edition at £1,300 (edition of 75).",
    // The ONE document that owns the ladder (see the header note) — plus the
    // money-intent words a buyer actually types. Derived rungs are appended
    // from TIER_KEYWORDS at build time.
    keywords:
      "price prices pricing cost costs how much dimensions measurements size chart ladder tier tiers edition editions",
  },
  {
    id: "framing",
    eyebrow: "Framing",
    question: "Can I have my print framed?",
    answer:
      "Every piece arrives framed and ready to hang — the edition price already includes a white window mount, a solid-wood frame and glazing, so there is no unframed option and no separate framing charge. Choose your frame on the product page — solid wood in oak, white or black, glazed with clear, edge-polished float glass. Prefer canvas? Every piece is also offered as a fine-art 370gsm canvas print, at the same price. Framed and canvas orders are made to order — allow roughly two weeks; delivery is free worldwide.",
    keywords: "frame mount glazing glass oak white black unframed ready to hang",
  },
  {
    id: "hand-finished",
    eyebrow: "Hand-finishing",
    question: 'What is "hand-finished by Polly"?',
    answer:
      "Polly (Stephen's sister) hand-paints additional geometric detail onto selected prints in Stephen's own tradition. Each hand-finished piece is therefore unique. The add-on is available on the Collector and Atelier editions, by request, and adds £595 (Collector) or £895 (Atelier). Allow two weeks maximum from order to dispatch.",
    keywords: "embellished hand painted unique polly wedge add-on",
  },
  {
    id: "shipping",
    eyebrow: "Shipping",
    question: "Do you ship internationally?",
    answer:
      "Yes — we ship worldwide. Delivery is free on every order, framed or on canvas, with nothing added at checkout. International buyers may be charged local import duties or VAT on delivery by their courier — these are set by your country's customs authority, not by us.",
    // Index-only destination terms. The page says "worldwide" and nothing else,
    // so a visitor typing where they live ("uae", "dubai", "usa") matched
    // NOTHING — worst for the Gulf collector base the estate widened for.
    // Never rendered: these route the query, they don't make a claim.
    keywords:
      "delivery shipping free postage post courier tracked uae dubai abu dhabi gulf middle east qatar saudi kuwait oman bahrain europe eu usa united states america canada australia new zealand asia japan singapore hong kong international overseas abroad worldwide global customs duty duties vat import",
  },
  {
    id: "damaged",
    eyebrow: "After-sale care",
    question: "What if my print arrives damaged or doesn't arrive?",
    answer:
      "Write to info@themandalacompany.com within 14 days. If it arrived damaged, send a photo of the damage and we'll replace at no cost or refund — your choice. If it didn't arrive, we'll open a claim with the carrier and replace or refund within 30 days. The full policy lives on our returns and terms pages.",
    keywords: "broken lost missing refund replacement claim returns complaint",
  },
  {
    id: "gift-delivery",
    eyebrow: "Gifting",
    question: "How does a gift card reach the person I'm giving it to?",
    answer:
      "By email, the moment your payment clears — there is nothing to post and no delivery cost. Give us their email address and the code goes straight to them with whatever note you wrote; leave it blank and it comes back to you, to hand over yourself. The estate is copied on every gift email, so if it doesn't land, write to info@themandalacompany.com and we'll send the code again.",
    keywords: "gift card voucher e-voucher send recipient email present",
  },
  {
    id: "gift-redeem",
    eyebrow: "Redeeming",
    question: "How is a gift card spent — and does it expire?",
    answer:
      "The person holding it chooses whatever piece they like and enters the code in the promotion-code box at checkout. It isn't tied to a name or an address, so it can be passed on. It is valid for one year from the day it's bought, and that date is written in the email carrying it. A card is issued in the currency it was bought in and carries the estate's equivalent value in each of the others we show, so it can be spent whichever currency the site is set to.",
    keywords: "redeem gift card code expiry expire currency promotion code",
  },
  {
    id: "gift-balance",
    eyebrow: "Gift value",
    question: "What if a gift card doesn't cover the whole order?",
    answer:
      "If the order comes to more than the card, the balance is simply paid at checkout. Our least expensive print is £250, so a card below that is a contribution towards one rather than a whole print. A card is used once, on a single order, and any unspent value isn't refunded or carried forward — so it's best spent in one go. Changed your mind? Write to info@themandalacompany.com within 14 days of buying it and we'll refund it in full, as long as the code hasn't been used.",
    keywords: "gift card balance top up part payment refund unused",
  },
  {
    id: "second-print",
    eyebrow: "Family & Friends",
    question: "Is there a discount for a second print?",
    answer:
      "Every order includes a Family & Friends card — 10% towards your next print, and one to pass to someone you love. It arrives with your order confirmation as a single-use code, valid for one year, redeemable against any future print at checkout. First purchases are always at full price; the gesture is the estate's thank-you for taking one of Steve's works into your home.",
    keywords: "discount code voucher promo offer cheaper second",
  },
];

/**
 * Hand-authored navigational pages — one doc PER INDEXABLE ROUTE so a query
 * like "returns", "gift card", "verify a certificate" or "find a print"
 * resolves to the right page even when no painting/news/about doc mentions the
 * keyword. The `body` is deliberately keyword-rich (intent synonyms a visitor
 * might type), not marketing copy — which is exactly why page docs are
 * `snippetable: false`: a keyword blob must never be shown to a customer.
 *
 * ⚠️ Each entry mirrors a real route in `src/App.tsx`. Deliberately absent:
 *   · `/search` itself (a search result pointing at search is noise)
 *   · `/order/success`, `/order/cancel`, `/verify` (transactional / redirect)
 *   · `/representatives`, `/trade/pricing` (intentionally unlinked + noindex —
 *     the estate hands those links out by hand; indexing them would defeat it)
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
    body: "Browse all collections and paintings — Habundia, Genesis, Born in the Sky, Ancient Canons. The full catalogue of Stephen Meakin's mandala paintings available as giclée prints. Shop, buy a print, gallery, artwork, all paintings, the complete catalogue.",
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
    // ⚠️ The page at /trade is called PARTNERS everywhere a visitor can see it:
    // Nav.tsx's primary desktop nav and drawer, the page's own <Seo title> and
    // h1 eyebrow, and the footer. Indexing it as "Trade" meant the single word
    // in the site's own navigation returned ZERO results, and the rendered
    // subtitle ("For interior designers & art consultants") described the
    // unrouted src/pages/Trade.tsx rather than the page this actually opens.
    title: "Partners",
    subtitle: "By invitation",
    url: "/trade",
    body: "Partners — introduce Stephen's work to a client or a space and place it on commission, by invitation. Representative, representatives, partner programme, trade, trade enquiries, interior designers, art consultants and the design industry. Commercial, bulk, project, hospitality, contract, trade account, designer pricing.",
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
    body: "Frequently asked questions — answers about prints, provenance, paper, sizes, editions, framing, hand-finishing, shipping, delivery and after-sale care. Help, questions, info.",
  },
  {
    // NEW — the /links "link in bio" hub was live but unindexed. The social
    // labels are DERIVED from src/data/socials.tsx (the single source of truth
    // the Footer and the hub both read), so a new channel added there becomes
    // searchable here with no edit to this file. Etsy is deliberately absent:
    // Links.tsx gates its Etsy card behind an empty ETSY_URL, so there is no
    // Etsy destination to send anyone to yet.
    id: "page-links",
    title: "Links",
    subtitle: "Everything from the estate, in one place",
    url: "/links",
    body: joinBody(
      "Links — the estate's link in bio hub. Follow The Mandala Company and The Art of Stephen Meakin on social media.",
      SOCIAL_PROFILES.map((s) => s.label).join(" · "),
      "Social, socials, follow, profile, bio link, link in bio.",
    ),
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
// TOKENISER
// -----------------------------------------------------------------------------

/**
 * Fold diacritics so accented words index/search as their plain-ASCII form:
 * "Hahnemühle" → "hahnemuhle", "giclée" → "giclee", "Miró" → "miro". Decompose
 * to base char + combining marks (NFKD), then drop the marks. Applied to BOTH
 * the indexed fields and the query (always paired with `.toLowerCase()`), so an
 * un-accented query matches accented source text and vice-versa.
 *
 * ⚠️ Folding is NOT length-preserving (a ligature expands, a combining mark
 * disappears), so folded offsets must never be used to slice the original text.
 * `buildSnippet` therefore matches against the ORIGINAL string, not the folded
 * one — see the note there.
 */
const foldDiacritics = (s: string): string =>
  s.normalize("NFKD").replace(/\p{Diacritic}/gu, "");

/**
 * Lowercase + diacritic-fold + split into alphanumeric word tokens.
 *
 * ⚠️ `£` is NOT part of the word class (it used to be). Gluing the symbol to
 * the digits meant the index held "£750" as one token, so "£750" matched and a
 * bare "750" — what people actually type — matched nothing. Dropping it from
 * the class splits both sides identically, so "£750" and "750" now agree.
 */
const tokenise = (s: string): string[] =>
  foldDiacritics(s.toLowerCase()).match(/[a-z0-9]+/g) ?? [];

/**
 * Function words that carry no intent on this site. Dropped from the QUERY only
 * (the index keeps them, so an exact-phrase bonus still works).
 *
 * Why this exists: without it, `"kepler's key"` tokenised to `kepler / s / key`
 * and the stray `s` matched a word in nearly every document — 45 results, vs 8
 * for `"keplers key"`. Typing the apostrophe correctly gave the WORSE page.
 *
 * Deliberately NOT stopped: how, much, many, what, when, where, why, which,
 * who, one, two, all, no, not, can, about, out, up, over — every one of them
 * carries real intent here ("how much", "what sizes", "one of one").
 */
const STOP_WORDS = new Set([
  "a", "am", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by",
  "d", "did", "do", "does", "for", "from", "had", "has", "have", "he", "her",
  "him", "his", "i", "if", "in", "into", "is", "it", "its", "ll", "m", "me",
  "my", "of", "on", "or", "our", "re", "s", "she", "should", "so", "t", "than",
  "that", "the", "their", "them", "then", "there", "these", "they", "this",
  "to", "us", "ve", "was", "we", "were", "will", "with", "would", "you", "your",
]);

/** Single characters can only ever be noise (see STOP_WORDS). */
const MIN_TOKEN_LENGTH = 2;

/** Hard cap on scored query tokens. A pasted paragraph is a query someone can
 *  put in a shareable URL — it must not be able to cost the main thread more
 *  than a keystroke does. Twelve distinct terms is far more than any real
 *  search, and the cap is applied AFTER stop-wording so the survivors are the
 *  meaningful ones. */
const MAX_QUERY_TOKENS = 12;

/** Hard cap on total scored terms (query tokens + their synonym expansions). */
const MAX_SCORED_TERMS = 32;

// -----------------------------------------------------------------------------
// INDEX
// -----------------------------------------------------------------------------

/** One field of one document, reduced to what the scorer actually needs:
 *  a term → count map (unique words only) and the field's word count. */
interface FieldIndex {
  tf: Map<string, number>;
  len: number;
}

const buildField = (...texts: (string | undefined)[]): FieldIndex => {
  const tf = new Map<string, number>();
  let len = 0;
  for (const text of texts) {
    if (!text) continue;
    for (const w of tokenise(text)) {
      tf.set(w, (tf.get(w) ?? 0) + 1);
      len += 1;
    }
  }
  return { tf, len };
};

/** An index entry = a public SearchDoc plus everything precomputed once at
 *  build time, so scoring never re-lowercases or re-splits anything. */
interface IndexedDoc {
  doc: SearchDoc;
  /** Lowercased + folded fields — for the exact-phrase substring bonus only. */
  titleLc: string;
  subtitleLc: string;
  bodyLc: string;
  /** Precomputed term frequencies. `keywords` is a FIELD OF ITS OWN, not part
   *  of `body`: it is a short, curated intent signal, so it earns a weight of
   *  its own and is length-normalised against other keyword blobs rather than
   *  against prose. (Folded into `body` it was diluted by the surrounding
   *  answer text, and "how much is a print" lost to the paper-stock question by
   *  2%.) `bodyLc` above never contains it, so a keyword can never surface in a
   *  phrase check or a snippet. */
  title: FieldIndex;
  subtitle: FieldIndex;
  body: FieldIndex;
  keywords: FieldIndex;
  /** Total word count — diagnostics only; BM25F normalises per field. */
  docLen: number;
  /** See the header note — false means "can never be excerpted". */
  snippetable: boolean;
  /** Half-open range of `doc.body` an excerpt may be taken from (see
   *  snippetFrom). Defaults to the whole body. */
  snippetStart: number;
  snippetEnd: number;
}

const toIndexed = (seed: IndexSeed): IndexedDoc => {
  const { doc, keywords } = seed;
  const title = buildField(doc.title);
  const subtitle = buildField(doc.subtitle);
  const body = buildField(doc.body);
  const kw = buildField(keywords);
  const at = seed.snippetFrom ? doc.body.indexOf(seed.snippetFrom) : 0;
  return {
    doc,
    titleLc: foldDiacritics(doc.title.toLowerCase()),
    subtitleLc: foldDiacritics((doc.subtitle ?? "").toLowerCase()),
    bodyLc: foldDiacritics(doc.body.toLowerCase()),
    title,
    subtitle,
    body,
    keywords: kw,
    docLen: title.len + subtitle.len + body.len + kw.len,
    snippetable: seed.snippetable,
    snippetStart: at > 0 ? at : 0,
    snippetEnd:
      at >= 0 && seed.snippetFrom
        ? at + seed.snippetFrom.length
        : doc.body.length,
  };
};

function buildIndex(): IndexedDoc[] {
  const seeds: IndexSeed[] = [];

  // --- PAINTINGS ---------------------------------------------------------
  for (const p of PAINTINGS) {
    // Only AVAILABLE colourways — five are hidden (Moonstone Blue, Faience
    // Blue, Eden Green, Pomegranate Red, Amethyst Purple) and searching one up
    // landed the buyer on a PDP with no such swatch. Matches the filter
    // Collections.tsx and FindAPrint.tsx already apply.
    const availableColourways = p.colourways.filter((c) => c.available);
    const original =
      availableColourways.find((c) => c.isOriginal) ?? availableColourways[0];
    const collectionTitle = COLLECTION_TITLE[p.collection] ?? p.collection;
    const colourwayNames = availableColourways.map((c) => c.name).join(" · ");
    const year = realYear(p.year);
    seeds.push({
      doc: {
        id: `painting-${p.id}`,
        type: "painting",
        title: p.title,
        // `realYear` guards the internal "[ DATE ]" placeholder two works still
        // carry — it was rendering live as "… · Ancient Canons · [ DATE ]".
        subtitle: joinBody(collectionTitle, year),
        url: `/collections/${p.id}`,
        image: original?.image,
        body: joinBody(
          p.description,
          colourwayNames,
          collectionTitle,
          p.artistQuote,
          p.location,
          p.size,
          year,
        ),
      },
      // Glued size spellings only — the catalogue-wide tier ladder that used to
      // be pasted here is gone (see the header note).
      keywords: sizeSearchTerms(p.size).join(" "),
      snippetable: true,
    });
  }

  // --- COLLECTIONS -------------------------------------------------------
  for (const c of COLLECTIONS) {
    const memberTitles = getPaintingsByCollection(c.id)
      .map((p) => p.title)
      .join(" · ");
    seeds.push({
      doc: {
        id: `collection-${c.id}`,
        type: "collection",
        title: c.title,
        subtitle: "Collection",
        // Deep-link to the collection's own band. Collections.tsx:1434 renders
        // `id={`collection-${coll.id}`}` and PageTransition.tsx has a working
        // hash-scroll with retry, so this lands the reader ON the collection
        // instead of at the top of a very long page.
        url: `/collections#collection-${c.id}`,
        body: joinBody(c.title, c.description, memberTitles),
      },
      // Body opens with the collection title — excerpt from the blurb instead.
      snippetFrom: c.description,
      snippetable: true,
    });
  }

  // --- NEWS --------------------------------------------------------------
  for (const n of NEWS) {
    seeds.push({
      doc: {
        id: `news-${n.id}`,
        type: "news",
        title: n.title,
        subtitle: joinBody(TYPE_LABEL[n.type], n.displayDate),
        url: "/news",
        image: n.cover,
        body: joinBody(n.summary, TYPE_LABEL[n.type], n.location),
      },
      snippetFrom: n.summary,
      snippetable: true,
    });
  }

  // --- ABOUT + WELCOME + THE ESTATE ARCHIVE ------------------------------
  // Section docs from the long-form estate text. Every one routes to /about.
  //
  // ⚠️ TITLES ARE REAL PAGE HEADINGS, never invented: "Art as ritual" and
  // "Exhibitions & commissions" are the `kicker`s from About.tsx CHAPTERS;
  // "The Dubai interview, 2011" is INTERVIEW.eyebrow; "In loving memory" is
  // TRIBUTE.eyebrow. All verbatim from the source.
  const aboutSections: {
    id: string;
    title: string;
    body: string;
    snippetable: boolean;
  }[] = [
    {
      // WELCOME.bio is folded in here rather than carried as its own doc.
      // It used to be a SECOND near-identical "Stephen Meakin — SEM" → "/"
      // result, so "stephen" returned the same person twice at 10.0 and 9.0.
      id: "about-opening",
      title: "Stephen Meakin",
      body: joinBody(ABOUT.opening.join(" "), WELCOME.bio.join(" ")),
      snippetable: true,
    },
    {
      id: "about-early-life",
      title: "Early life",
      body: ABOUT.earlyLife.join(" "),
      snippetable: true,
    },
    {
      // ABOUT.anegada — Stephen's own account of Anegada, the first circle in
      // the sand, and "Art as Ritual". Previously unindexed entirely.
      id: "about-ritual",
      title: "Art as ritual",
      body: joinBody(ABOUT.anegada.join(" "), ABOUT.anegadaQuote),
      snippetable: true,
    },
    {
      id: "about-legacy",
      title: "Lewes, the estate & TAGA",
      body: ABOUT.legacy.join(" "),
      snippetable: true,
    },
    {
      // CREDENTIALS — the documented exhibitions + commissions strip. Real,
      // verifiable places (Majlis Gallery Dubai, Trinity London, Unique Arts
      // Brighton, Farmacy, Sahara Force India, the hospice Tree of Wellbeing);
      // someone who knew Stephen searches these by name.
      id: "about-exhibitions",
      title: "Exhibitions & commissions",
      body: CREDENTIALS.join(" · "),
      snippetable: true,
    },
    {
      // The Academy + the letter he left every student. studentsLetter was
      // unindexed; it folds in here rather than inventing a heading for it.
      id: "about-academy",
      title: "The Art of Geometry Academy",
      body: joinBody(
        ABOUT.academyQuote,
        ABOUT.studentsIntro,
        ABOUT.studentsLetter,
      ),
      snippetable: true,
    },
    {
      id: "about-palestine",
      title: "Teaching in Jordan",
      body: ABOUT.palestine,
      snippetable: true,
    },
    {
      // INTERVIEW — the January 2011 Time Out Dubai interview. Stephen's own
      // answers, verbatim. This is the single richest thing in the archive for
      // someone searching a place, a tradition or a phrase he used.
      id: "about-interview",
      title: INTERVIEW.eyebrow,
      body: joinBody(
        INTERVIEW.context.join(" "),
        INTERVIEW.qa.map((x) => `${x.q} ${x.a}`).join(" "),
        INTERVIEW.source.publication,
        INTERVIEW.source.byline,
        INTERVIEW.source.date,
        INTERVIEW.source.note,
      ),
      snippetable: true,
    },
    {
      // ⚠️⚠️ POLLY WEDGE'S FUNERAL TRIBUTE. FINDABLE, NEVER EXCERPTED.
      // `snippetable: false` is the whole point of this entry: someone
      // searching a phrase from the eulogy must be able to reach it, but no
      // fragment of it may ever be rendered as a snippet in a result list
      // beside a price. Do not flip this flag. Do not add a preview field to
      // this doc. The exclusion is enforced structurally in buildSnippet().
      id: "about-tribute",
      title: TRIBUTE.eyebrow,
      body: joinBody(TRIBUTE.paragraphs.join(" "), TRIBUTE.attribution),
      snippetable: false,
    },
  ];
  for (const s of aboutSections) {
    seeds.push({
      doc: {
        id: s.id,
        type: "about",
        title: s.title,
        subtitle: "About Stephen Meakin",
        url: "/about",
        body: s.body,
      },
      snippetable: s.snippetable,
    });
  }

  // --- FAQ ---------------------------------------------------------------
  for (const f of FAQ_SEEDS) {
    seeds.push({
      doc: {
        id: `faq-${f.id}`,
        type: "faq",
        title: f.question,
        subtitle: joinBody(f.eyebrow, "FAQ"),
        url: "/faq",
        body: joinBody(f.eyebrow, f.question, f.answer),
      },
      // Excerpt the ANSWER only — the body opens with the eyebrow + question,
      // and a snippet that just repeats the heading above it tells no one
      // anything.
      snippetFrom: f.answer,
      // The sizes question is the ONE doc that owns the print ladder.
      keywords:
        f.id === "sizes"
          ? joinBody(f.keywords, TIER_KEYWORDS.join(" "))
          : f.keywords,
      snippetable: true,
    });
  }

  // --- PAGES -------------------------------------------------------------
  for (const pg of PAGE_SEEDS) {
    seeds.push({
      doc: {
        id: pg.id,
        type: "page",
        title: pg.title,
        subtitle: pg.subtitle,
        url: pg.url,
        body: joinBody(pg.title, pg.subtitle, pg.body),
      },
      // Page bodies are keyword blobs, not prose — never excerpt them.
      snippetable: false,
    });
  }

  return seeds.map(toIndexed);
}

/** The index, built ONCE at module load. */
const INDEX: IndexedDoc[] = buildIndex();

/** Number of documents in the index — exported for diagnostics / tests. */
export const SEARCH_DOC_COUNT = INDEX.length;

/** doc.id → index entry, so a result can be taken back to its precomputed
 *  entry (for snippets) without a linear scan. Built once. */
const byIndexId = new Map(INDEX.map((d) => [d.doc.id, d]));

// -----------------------------------------------------------------------------
// INVERTED INDEX
// -----------------------------------------------------------------------------
// One posting per (word, document, field). Scoring walks the VOCABULARY once
// per query term and then only the postings of the words that matched — it
// never touches a document that doesn't contain the term, and never runs an
// edit-distance more than once per distinct word in the whole site.
//
// (The previous implementation re-split every document's full text with a regex
// for every query token × field. A 200-word paste took 1,344ms and a 3,200-word
// one 24,685ms — on a URL anyone could share. See the SCORER note in the header.)

/** Field slots, used as the minor index into the per-query counter arrays. */
const F_TITLE = 0;
const F_SUBTITLE = 1;
const F_BODY = 2;
const F_KEYWORDS = 3;
const FIELD_COUNT = 4;

interface Posting {
  /** Position of the document in INDEX. */
  d: number;
  /** F_TITLE | F_SUBTITLE | F_BODY. */
  f: number;
  /** Occurrences of the word in that field of that document. */
  n: number;
}

const VOCAB = new Map<string, Posting[]>();
/** Distinct words bucketed by length — the only candidates a bounded
 *  edit-distance of `b` can possibly match. */
const VOCAB_BY_LEN = new Map<number, string[]>();

const addPostings = (field: FieldIndex, d: number, f: number) => {
  for (const [w, n] of field.tf) {
    const list = VOCAB.get(w);
    if (list) list.push({ d, f, n });
    else VOCAB.set(w, [{ d, f, n }]);
  }
};

for (let i = 0; i < INDEX.length; i++) {
  addPostings(INDEX[i].title, i, F_TITLE);
  addPostings(INDEX[i].subtitle, i, F_SUBTITLE);
  addPostings(INDEX[i].body, i, F_BODY);
  addPostings(INDEX[i].keywords, i, F_KEYWORDS);
}

/** Every distinct word, sorted, so a prefix query is a binary search + a walk
 *  of one contiguous range instead of a scan of the whole vocabulary. */
const SORTED_WORDS: string[] = Array.from(VOCAB.keys()).sort();

for (const w of SORTED_WORDS) {
  const bucket = VOCAB_BY_LEN.get(w.length);
  if (bucket) bucket.push(w);
  else VOCAB_BY_LEN.set(w.length, [w]);
}

/** Index of the first word in SORTED_WORDS that is >= `term`. */
const lowerBound = (term: string): number => {
  let lo = 0;
  let hi = SORTED_WORDS.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (SORTED_WORDS[mid] < term) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

/** Mean length of each FIELD across the index — the BM25F normalisation
 *  references. Per-FIELD (not per-doc) is deliberate: a painting doc is long
 *  because its provenance description is long, and that must not dilute an
 *  exact hit on its two-word title. Normalising the title against average
 *  TITLE length keeps a title match a title match at any body length. */
// ⚠️ Averaged over docs that ACTUALLY HAVE the field. Most docs carry no
// keyword blob at all, so averaging over all of them would drive the reference
// length near zero and punish the handful of docs that do have one.
const avgLen = (pick: (d: IndexedDoc) => number): number => {
  let sum = 0;
  let count = 0;
  for (const d of INDEX) {
    const n = pick(d);
    if (n > 0) {
      sum += n;
      count += 1;
    }
  }
  return count > 0 ? Math.max(1, sum / count) : 1;
};

const AVG_TITLE_LEN = avgLen((d) => d.title.len);
const AVG_SUBTITLE_LEN = avgLen((d) => d.subtitle.len);
const AVG_BODY_LEN = avgLen((d) => d.body.len);
const AVG_KEYWORDS_LEN = avgLen((d) => d.keywords.len);

// -----------------------------------------------------------------------------
// SCORER
// -----------------------------------------------------------------------------

// Field weights — title matters most, then subtitle, then body.
const W_TITLE = 5;
const W_SUBTITLE = 3;
const W_BODY = 1;
// Curated index-only intent terms (see IndexSeed.keywords) — weighted like a
// subtitle: a deliberate routing signal, never displayed.
const W_KEYWORDS = 3;
// Partial-credit weights.
const PREFIX_WEIGHT = 0.4; // a doc word merely STARTS WITH the token ("geo" → "geometry")
const FUZZY_WEIGHT = 0.55; // a doc word is a near-miss (typo)
const SYNONYM_WEIGHT = 0.7; // synonyms score at a slight discount
// Exact-phrase substring bonus (whole query found verbatim). Sized to sit just
// above a rare-word title hit so a literal phrase always leads, without being
// able to swamp a genuinely better multi-term match.
const PHRASE_BONUS = 4;

// BM25F constants. k1 controls how fast term frequency saturates (a 40th
// occurrence of "mandala" must not be worth 40× the first); b controls how hard
// a long FIELD is penalised. b is a touch below the 0.75 default because our
// shortest fields (page seeds, collection blurbs) are legitimately short, not
// thin. Applied per field, then the weighted sum is saturated once.
const BM25_K1 = 1.2;
const BM25_B = 0.65;

/** Length-normalisation strength for the KEYWORDS field. Zero — i.e. none.
 *  BM25's `b` exists to stop an author padding a document to game the score;
 *  the keyword blobs are authored in THIS file, are never displayed, and are
 *  long only because a question legitimately has many phrasings. Penalising
 *  them for that pushed "how much is a print" off the sizes answer. */
const BM25_B_KEYWORDS = 0;

/** A result must score at least this fraction of the best hit to be returned.
 *  Cuts the "shares one common word and nothing else" tail. */
const MIN_SCORE_RATIO = 0.06;

/**
 * Bounded Levenshtein — returns the edit distance between `a` and `b`, but stops
 * and returns `max + 1` as soon as the true distance is known to exceed `max`.
 * Powers typo tolerance: "expeirnce"→"experience", "geomerty"→"geometry",
 * "meakn"→"Meakin". ⚠️ Plain Levenshtein counts a TRANSPOSITION as two edits,
 * so a swapped pair only forgives at length >= 8 (fuzzyBudget). "serach" does
 * NOT reach "search" — the old comment here claimed it did; it never has.
 */
const boundedEditDistance = (a: string, b: string, max: number): number => {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array(lb + 1);
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= lb; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1; // whole remaining rows can only grow
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
};

/** Max typos tolerated for a query token of a given length (short words must
 *  match tighter so "art" doesn't fuzz into "arc"/"ant"). */
const fuzzyBudget = (len: number): number => (len >= 8 ? 2 : len >= 5 ? 1 : 0);

/**
 * Keyword synonyms — so a natural query lands on the right page even when the
 * visitor's word isn't the word on the page. Each query token is expanded with
 * these at a slight score discount. Kept intentionally small + estate-specific
 * (delivery↔shipping, cost↔price, refund↔return, buy↔order, framed↔frame …) so
 * "how much is delivery" finds the shipping copy and "refund" finds /returns.
 *
 * ⚠️ The `a4`–`a0` entries are the RETIRED A-series paper names. They are
 * INDEX-ONLY routing aliases mapping a legacy query onto the real cm dimension
 * that replaced it — they never appear in any rendered string, and no A-series
 * label is written back into the index. (Glued forms like "42x42" come from
 * `sizeSearchTerms`.) `a0` is deliberately absent: the Heirloom rung is retired.
 */
const SYNONYMS: Record<string, string[]> = {
  delivery: ["shipping", "postage", "dispatch"],
  shipping: ["delivery", "postage", "dispatch"],
  postage: ["delivery", "shipping"],
  cost: ["price", "pricing", "how much"],
  price: ["cost", "pricing"],
  pricing: ["price", "cost"],
  // "how much …" is the site's highest-intent money question and "much" is the
  // only word in it that isn't a stop word. ONE synonym, deliberately: three
  // (price/cost/pricing) tripled the credit and dragged the sizes answer to the
  // top of "how much is delivery", where the shipping answer belongs.
  much: ["price"],
  refund: ["return", "returns", "money back"],
  return: ["refund", "returns"],
  returns: ["refund", "return"],
  buy: ["order", "purchase", "checkout"],
  order: ["buy", "purchase", "checkout"],
  purchase: ["buy", "order"],
  frame: ["framed", "framing", "mount"],
  framed: ["frame", "framing"],
  framing: ["frame", "framed", "mount"],
  canvas: ["stretched", "print"],
  print: ["giclee", "giclée", "reproduction"],
  authentic: ["authenticity", "certificate", "provenance", "genuine"],
  certificate: ["authenticity", "provenance", "coa"],
  size: ["dimensions", "cm", "measurements"],
  gift: ["voucher", "present", "gift card"],
  contact: ["email", "enquiry", "get in touch"],
  privacy: ["data", "gdpr", "cookies"],
  // Retired A-series → the edition it became. Matched as phrases against the
  // FAQ's own verbatim wording, so no A-series label is ever written into the
  // index or rendered anywhere. `a0` is absent — the Heirloom rung is retired.
  a4: ["emblem edition"],
  a3: ["gallery edition"],
  a2: ["collector edition"],
  a1: ["atelier edition"],
};

/**
 * Per-field raw match credit, from the three counters the inverted-index walk
 * fills in. Prefix credit is capped so a single common stem can't dominate;
 * fuzzy credit is capped likewise and only counts where nothing matched exactly.
 */
const fieldRaw = (exact: number, prefix: number, fuzzy: number): number => {
  let score = exact + Math.min(prefix, 3) * PREFIX_WEIGHT;
  if (exact === 0) score += Math.min(fuzzy, 2) * FUZZY_WEIGHT;
  return score;
};

/** BM25 field-length normaliser: 1 for an average-length field, >1 for a longer
 *  one (which divides its credit down), <1 for a shorter one. */
const fieldNorm = (len: number, avg: number, b: number = BM25_B): number =>
  1 - b + (b * len) / avg;

/** One scored term — a query token, or a discounted synonym of one. */
interface ScoredTerm {
  term: string;
  /** Multiplier: 1 for a query token, SYNONYM_WEIGHT for a synonym. */
  weight: number;
  /** Multi-word synonyms ("how much") are matched as a substring, not a token. */
  isPhrase: boolean;
}

/**
 * Expand the query into the (deduped, capped) set of terms actually scored.
 *
 * Stop words and single characters are dropped with NO fallback: a query made
 * entirely of function words ("the", "it is") returns nothing, which is the
 * honest answer. The old behaviour — scoring them anyway — returned 45
 * essentially-random documents led by whichever painting description happened
 * to be longest.
 */
const expandQuery = (query: string): ScoredTerm[] => {
  const source = tokenise(query).filter(
    (t) => t.length >= MIN_TOKEN_LENGTH && !STOP_WORDS.has(t),
  );
  if (source.length === 0) return [];

  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const t of source) {
    if (seen.has(t)) continue;
    seen.add(t);
    tokens.push(t);
    if (tokens.length >= MAX_QUERY_TOKENS) break;
  }

  const terms: ScoredTerm[] = tokens.map((term) => ({
    term,
    weight: 1,
    isPhrase: false,
  }));

  // Synonym expansion, deduped against the query tokens AND each other.
  // ⚠️ hasOwnProperty.call, NEVER a bare `SYNONYMS[token]` truthiness check.
  // SYNONYMS is an object literal, so a bare lookup resolves up the prototype
  // chain: SYNONYMS["constructor"] returns the Object constructor — truthy but
  // not iterable — and the `for...of` below threw, taking the whole page down
  // to the ErrorBoundary. "constructor" is ordinary English and a plausible
  // query on a sacred-geometry site, and /search?q=constructor was a
  // permanently broken, shareable, indexable URL. (Only lowercase keys can
  // reach here — the tokeniser lowercases. Do not rely on that.)
  for (const token of tokens) {
    if (terms.length >= MAX_SCORED_TERMS) break;
    const syns = Object.prototype.hasOwnProperty.call(SYNONYMS, token)
      ? SYNONYMS[token]
      : undefined;
    if (!syns) continue;
    for (const syn of syns) {
      if (terms.length >= MAX_SCORED_TERMS) break;
      const key = `~${syn}`;
      if (seen.has(syn) || seen.has(key)) continue;
      seen.add(key);
      terms.push({
        term: foldDiacritics(syn.toLowerCase()),
        weight: SYNONYM_WEIGHT,
        isPhrase: syn.includes(" "),
      });
    }
  }

  return terms;
};

/**
 * Score every document for one expanded query, in two passes.
 *
 * Pass 1 collects each term's RAW weighted match credit per document. Pass 2
 * turns those into BM25 contributions: the term's IDF is derived from how many
 * documents it ACTUALLY matched (not just from a static term→df table), which
 * is what makes prefix/fuzzy/synonym matches weigh honestly — and what makes a
 * term present in every document score ~0 instead of inflating everything.
 */
function scoreAll(terms: ScoredTerm[]): Float64Array {
  const n = INDEX.length;
  const totals = new Float64Array(n);
  const raw = new Float64Array(n);
  // Per-term, per-(doc, field) match counters. Allocated once for the whole
  // query and refilled per term — never per document.
  const exact = new Float64Array(n * FIELD_COUNT);
  const prefix = new Float64Array(n * FIELD_COUNT);
  const fuzzy = new Float64Array(n * FIELD_COUNT);

  for (const { term, weight, isPhrase } of terms) {
    let matched = 0;

    if (isPhrase) {
      // Multi-word synonyms ("how much") are substring matches, not tokens.
      for (let i = 0; i < n; i++) {
        const d = INDEX[i];
        let r = 0;
        if (d.titleLc.includes(term)) r = W_TITLE;
        else if (d.subtitleLc.includes(term)) r = W_SUBTITLE;
        else if (d.bodyLc.includes(term)) r = W_BODY;
        raw[i] = r * weight;
        if (r > 0) matched += 1;
      }
    } else {
      exact.fill(0);
      prefix.fill(0);
      fuzzy.fill(0);

      // --- exact ---------------------------------------------------------
      const exactPostings = VOCAB.get(term);
      if (exactPostings) {
        for (const p of exactPostings) exact[p.d * FIELD_COUNT + p.f] += p.n;
      }

      // --- prefix: one contiguous run of the sorted vocabulary ------------
      for (let k = lowerBound(term); k < SORTED_WORDS.length; k++) {
        const w = SORTED_WORDS[k];
        if (!w.startsWith(term)) break;
        if (w.length === term.length) continue; // that's the exact hit
        for (const p of VOCAB.get(w)!) prefix[p.d * FIELD_COUNT + p.f] += p.n;
      }

      // --- fuzzy: ONLY when the term is absent from the whole vocabulary --
      // Typo tolerance exists for words the site doesn't have. If
      // the word IS in the index, fuzzing it can only add noise — and skipping
      // the edit-distance pass is what keeps a long paste cheap.
      if (!exactPostings) {
        const budget = fuzzyBudget(term.length);
        for (let L = term.length - budget; budget > 0 && L <= term.length + budget; L++) {
          const bucket = VOCAB_BY_LEN.get(L);
          if (!bucket) continue;
          for (const w of bucket) {
            if (w.length > term.length && w.startsWith(term)) continue; // scored as prefix
            if (boundedEditDistance(w, term, budget) > budget) continue;
            for (const p of VOCAB.get(w)!) fuzzy[p.d * FIELD_COUNT + p.f] += p.n;
          }
        }
      }

      // --- combine, BM25F ------------------------------------------------
      // Normalise each field's raw credit by that FIELD's own length against
      // the average length of the same field, THEN weight and sum.
      for (let i = 0; i < n; i++) {
        const base = i * FIELD_COUNT;
        const d = INDEX[i];
        let r = 0;
        const t = fieldRaw(exact[base + F_TITLE], prefix[base + F_TITLE], fuzzy[base + F_TITLE]);
        if (t > 0) r += (t * W_TITLE) / fieldNorm(d.title.len, AVG_TITLE_LEN);
        const st = fieldRaw(exact[base + F_SUBTITLE], prefix[base + F_SUBTITLE], fuzzy[base + F_SUBTITLE]);
        if (st > 0) r += (st * W_SUBTITLE) / fieldNorm(d.subtitle.len, AVG_SUBTITLE_LEN);
        const b = fieldRaw(exact[base + F_BODY], prefix[base + F_BODY], fuzzy[base + F_BODY]);
        if (b > 0) r += (b * W_BODY) / fieldNorm(d.body.len, AVG_BODY_LEN);
        const kw = fieldRaw(exact[base + F_KEYWORDS], prefix[base + F_KEYWORDS], fuzzy[base + F_KEYWORDS]);
        if (kw > 0)
          r += (kw * W_KEYWORDS) / fieldNorm(d.keywords.len, AVG_KEYWORDS_LEN, BM25_B_KEYWORDS);
        raw[i] = r * weight;
        if (r > 0) matched += 1;
      }
    }

    if (matched === 0) continue;
    // Okapi IDF, from the documents the term ACTUALLY matched in this query
    // (so prefix / fuzzy / synonym hits are weighted honestly). A term present
    // in every document scores ≈0; a term in one scores ≈ln(n).
    const idf = Math.log(1 + (n - matched + 0.5) / (matched + 0.5));

    for (let i = 0; i < n; i++) {
      const r = raw[i];
      if (r <= 0) continue;
      // Saturate the already length-normalised weighted sum, once.
      totals[i] += (idf * (r * (BM25_K1 + 1))) / (r + BM25_K1);
    }
  }

  return totals;
}

/**
 * Exact-phrase substring bonus. Only worth checking for a multi-token query —
 * a single token already scored above.
 */
function phraseBonus(indexed: IndexedDoc, phraseLc: string): number {
  if (phraseLc.length < 2 || !phraseLc.includes(" ")) return 0;
  if (indexed.titleLc.includes(phraseLc)) return PHRASE_BONUS * 2;
  if (indexed.subtitleLc.includes(phraseLc)) return PHRASE_BONUS;
  if (indexed.bodyLc.includes(phraseLc)) return PHRASE_BONUS / 2;
  return 0;
}

// -----------------------------------------------------------------------------
// SNIPPETS
// -----------------------------------------------------------------------------

/** Target excerpt length, and the hard ceiling before we window down. */
const SNIPPET_TARGET = 190;
const SNIPPET_MAX = 260;
/** Below this, an excerpt is a fragment rather than a sentence — drop it. */
const SNIPPET_MIN = 34;

const escapeRegExp = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Sentence-ish terminators, plus the " · " separator `joinBody` inserts. */
const isBoundaryAt = (text: string, i: number): boolean => {
  const c = text[i];
  if (c === "·") return true;
  if (c !== "." && c !== "!" && c !== "?" && c !== ";") return false;
  const next = text[i + 1];
  return next === undefined || next === " " || next === "\n";
};

/**
 * Build a verbatim excerpt of `text` around the first whole-word occurrence of
 * any term, snapped to sentence boundaries and never cut mid-word.
 *
 * ⚠️ Matching runs against the ORIGINAL string, not the folded/lowercased one,
 * because diacritic folding is not length-preserving and folded offsets cannot
 * safely slice the original. The consequence is deliberate and safe: a query
 * that only matches via folding ("hahnemuhle" → "Hahnemühle"), via a prefix or
 * via a typo simply produces NO snippet rather than a wrong one.
 */
function excerpt(
  text: string,
  matchers: RegExp[],
  from: number,
  to: number,
  reject: (candidate: string) => boolean,
): Omit<SearchSnippet, "field"> | undefined {
  if (!text || from >= to) return undefined;

  // Candidate hit positions: the first occurrence of each term at or after
  // `from`, tried in document order until one yields a usable excerpt.
  // ⚠️ `matchers` are compiled ONCE per query (see snippetMatchers) — building
  // a RegExp per term per result was measurably the most expensive thing in
  // the whole search path.
  const hits: { at: number; len: number }[] = [];
  for (const re of matchers) {
    re.lastIndex = from;
    const m = re.exec(text);
    if (m && m.index + m[1].length < to) {
      hits.push({ at: m.index + m[1].length, len: m[2].length });
    }
  }
  if (hits.length === 0) return undefined;
  hits.sort((a, b) => a.at - b.at);

  for (const h of hits) {
    const built = buildExcerptAt(text, h.at, h.len, from, to);
    if (built && !reject(built.text)) return built;
  }
  return undefined;
}

/** Snap one hit out to its surrounding sentence, windowing down if that
 *  sentence runs long. Never walks back before `from`, never cuts mid-word. */
function buildExcerptAt(
  text: string,
  hit: number,
  hitLen: number,
  from: number,
  to: number,
): Omit<SearchSnippet, "field"> | undefined {
  // Walk back to the start of the sentence containing the hit.
  let start = from;
  for (let i = hit - 1; i >= from; i--) {
    if (isBoundaryAt(text, i)) {
      start = i + 1;
      break;
    }
  }
  while (start < to && (text[start] === " " || text[start] === "·")) start += 1;

  // Walk forward to the end of that sentence.
  let end = to;
  for (let i = Math.max(hit + hitLen, start); i < to; i++) {
    if (isBoundaryAt(text, i)) {
      end = text[i] === "·" ? i : i + 1;
      break;
    }
  }

  let leadingEllipsis = start > from;
  let trailingEllipsis = end < to;

  // A single sentence can run long in this corpus. Window it down around the
  // hit, always on word boundaries.
  if (end - start > SNIPPET_MAX) {
    let ws = Math.max(start, hit - Math.floor((SNIPPET_TARGET - hitLen) / 2));
    if (ws > start) {
      while (ws > start && text[ws - 1] !== " ") ws -= 1;
      leadingEllipsis = true;
    }
    let we = Math.min(end, ws + SNIPPET_TARGET);
    if (we < end) {
      while (we > ws && text[we] !== " ") we -= 1;
      trailingEllipsis = true;
    }
    start = ws;
    end = we;
  }

  // Trim, but keep `offset` pointing at the FIRST CHARACTER OF `text` — a
  // caller slicing the field at `offset` must get exactly this string back.
  while (start < end && /\s/.test(text[start])) start += 1;
  while (end > start && /\s/.test(text[end - 1])) end -= 1;
  const excerptText = text.slice(start, end);
  if (excerptText.length < SNIPPET_MIN) return undefined;
  return {
    text: excerptText,
    offset: start,
    leadingEllipsis,
    trailingEllipsis,
  };
}

/**
 * The ONLY entry point that may produce a snippet.
 *
 * ⚠️ The `snippetable` guard is the structural exclusion described in the file
 * header: Polly Wedge's funeral tribute is indexed so it can be FOUND, and can
 * never be excerpted. If you add another snippet path, it must start with this
 * same check.
 */
/** Compile the whole-word matchers for a query, ONCE. Capped: after a handful
 *  of terms an extra one can only find a later, worse excerpt. */
const SNIPPET_TERM_CAP = 6;

const snippetMatchers = (terms: string[]): RegExp[] =>
  terms
    .filter((t) => t.length >= MIN_TOKEN_LENGTH)
    .slice(0, SNIPPET_TERM_CAP)
    .map((t) => new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(t)})`, "giu"));

function buildSnippet(
  indexed: IndexedDoc,
  matchers: RegExp[],
): SearchSnippet | undefined {
  if (!indexed.snippetable) return undefined;
  // An excerpt that just restates the heading already on screen is noise.
  const titleLc = indexed.doc.title.toLowerCase();
  const reject = (candidate: string) => {
    const c = candidate.toLowerCase();
    return c === titleLc || titleLc.includes(c) || c.includes(titleLc);
  };
  const fromBody = excerpt(
    indexed.doc.body,
    matchers,
    indexed.snippetStart,
    indexed.snippetEnd,
    reject,
  );
  if (fromBody) return { field: "body", ...fromBody };
  return undefined;
}

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

/**
 * Search the site index.
 *
 * @param query  free-text query — lowercased, folded, tokenised, stop-worded,
 *               deduped and capped internally.
 * @param limit  max results (default 24). Zero-score docs are always dropped.
 * @returns      results sorted by score descending (ties keep index order,
 *               which roughly tracks catalogue → collection → news → about →
 *               faq → page authoring order). The top `limit` results may carry
 *               an optional `snippet` (see SearchSnippet).
 */
/**
 * A Certificate ID as printed on the wax-sealed COA and encoded in its QR:
 * `MANDALA-<3-letter artwork code>-<6 Crockford-base32 chars>`, minted in
 * api/stripe-webhook.ts. Deliberately forgiving about case, spacing and
 * underscores, exactly as api/auth-lookup.ts's `normaliseCert` is — someone
 * typing this is reading it off a printed certificate, possibly badly.
 */
const CERT_ID_RE = /^\s*mandala[\s_-]+[a-z]{2,4}[\s_-]+[a-z0-9]{4,10}\s*$/i;

export function searchSite(query: string, limit = 24): SearchResult[] {
  // ⚠️ Certificate IDs are matched BEFORE the scorer, never through it.
  //
  // The tokeniser splits `MANDALA-OPI-7F3K91` into `mandala` / `opi` / `7f3k91`.
  // "mandala" appears in nearly every document on a mandala artist's site, so
  // the query behaved identically to a bare `?q=mandala` — 29 results led by a
  // collection, with the Authentication page not present at ALL (its body has
  // no "mandala" in it). That is the single worst place to fail: the person
  // typing this is holding a printed certificate or has just scanned its QR,
  // and is asking the one question the estate exists to answer.
  //
  // Resolved as an exact route rather than a ranking tweak, because a cert ID
  // has exactly one correct destination and no useful fuzzy neighbours.
  if (CERT_ID_RE.test(query)) {
    const auth = INDEX.find((d) => d.doc.id === "page-auth");
    if (auth) return [{ doc: auth.doc, score: 1000 }];
  }

  const phraseLc = foldDiacritics(query.trim().toLowerCase());
  const terms = expandQuery(query);
  if (terms.length === 0) return [];

  const totals = scoreAll(terms);

  const results: SearchResult[] = [];
  for (let i = 0; i < INDEX.length; i++) {
    const score = totals[i] + phraseBonus(INDEX[i], phraseLc);
    if (score > 0) results.push({ doc: INDEX[i].doc, score });
  }

  results.sort((a, b) => b.score - a.score);

  // Relevance floor — drop the long tail of documents that share one common
  // word with the query and nothing else. Relative to the best hit, so it
  // adapts to the query rather than fixing an absolute threshold that would be
  // wrong for both "uae" and "mandala".
  const best = results.length > 0 ? results[0].score : 0;
  const floor = best * MIN_SCORE_RATIO;
  const kept = floor > 0 ? results.filter((r) => r.score >= floor) : results;

  const top = kept.slice(0, Math.max(0, limit));

  // Snippets are built for the returned page only — never for the whole index.
  const matchers = snippetMatchers(
    terms.filter((t) => !t.isPhrase && t.weight === 1).map((t) => t.term),
  );
  if (matchers.length > 0) {
    for (const r of top) {
      const indexed = byIndexId.get(r.doc.id);
      if (!indexed) continue;
      const snippet = buildSnippet(indexed, matchers);
      if (snippet) r.snippet = snippet;
    }
  }

  return top;
}
