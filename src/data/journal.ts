// =============================================================================
// JOURNAL — single source of truth for /journal (the writings archive)
// -----------------------------------------------------------------------------
// Real, indexable long-form pages. This is two things at once:
//   1. A home for Steve's writing — teachings on sacred geometry, process notes,
//      pieces from his notebooks — and the estate's notes on the work.
//   2. The SEO fix. The site is a client-rendered SPA, so search engines and
//      link-preview bots see almost no text on most routes. Each journal article
//      is a genuine page of prose with its own <title>, meta description, and
//      Article JSON-LD (wired in JournalArticle.tsx) — the kind of content that
//      actually earns organic discovery.
//
// AUTHORING A NEW ARTICLE — copy this object into JOURNAL, newest first:
//
//   {
//     slug: "a-url-safe-slug",                 // becomes /journal/a-url-safe-slug
//     title: "The article title",
//     excerpt: "One or two sentences for the index card + meta description.",
//     kind: "On sacred geometry",              // small eyebrow tag (optional)
//     date: "March 2003",                       // human display (optional)
//     isoDate: "2003-03-01",                    // for JSON-LD datePublished (optional)
//     author: "Stephen Meakin",                 // omit -> defaults to the estate
//     body: [
//       "First paragraph.",
//       "Second paragraph.",
//     ],
//     pullQuote: { text: "A line to lift out.", attribution: "Stephen Meakin" }, // optional
//     coverImage: "/img/...",                   // optional, also used as the OG image
//     draft: true,                              // optional — drafts never appear publicly
//   },
//
// `draft: true` keeps an article out of the index AND its /journal/:slug route
// (it 404s), so you can stage writing safely. Same no-database, file-is-truth
// ethos as paintings.ts / memories.ts.
// =============================================================================

export interface JournalArticle {
  /** URL-safe slug → /journal/<slug>. Must be unique. */
  slug: string;
  /** Article title (H1 + document title). */
  title: string;
  /** One-to-two sentence summary for the index card + meta description. */
  excerpt: string;
  /** Small eyebrow tag, e.g. "On sacred geometry", "From the archive". */
  kind?: string;
  /** Human-readable date, e.g. "March 2003", "2016". Display only. */
  date?: string;
  /** ISO date for Article JSON-LD `datePublished`, e.g. "2003-03-01". */
  isoDate?: string;
  /** Byline. Omit to default to the estate (see articleAuthor). */
  author?: string;
  /** Body paragraphs, rendered in order. */
  body: string[];
  /** Optional lifted quote, shown in the site's accent-bordered register. */
  pullQuote?: { text: string; attribution?: string };
  /** Optional cover image path (also used as the OG/social image). */
  coverImage?: string;
  /** When true, the article is hidden from the index and its route 404s. */
  draft?: boolean;
}

const ESTATE_AUTHOR = "The Mandala Company";

// -----------------------------------------------------------------------------
// ARTICLES — newest first. The first entry is an estate-written introduction
// (true editorial, not attributed to Steve). Add Steve's own writings above it
// as you transcribe them from his notebooks. The `draft` entry below is a
// filled-in template you can copy — it never appears on the live site.
// -----------------------------------------------------------------------------
export const JOURNAL: JournalArticle[] = [
  {
    slug: "four-traditions-one-language",
    title: "Four traditions, one visual language",
    excerpt:
      "Steve spent three decades drawing the thread between Insular island art, the rose windows of the great cathedrals, Persian geometry and the Tibetan mandala — and showing they were speaking the same language all along.",
    kind: "From the estate",
    date: "2021",
    isoDate: "2021-12-01",
    author: ESTATE_AUTHOR,
    body: [
      "People who met Steve's work for the first time often asked the same question: is this a Celtic knot, a cathedral window, a Persian tile, or a Buddhist mandala? The honest answer was always yes — and that the question itself was the point.",
      "He had studied four traditions closely. The interlace of Insular island art, carried through the illuminated gospels. The rose windows of the Gothic cathedrals, where light itself was the medium. The tessellated geometry of the Persian world, endlessly dividing and rejoining. And the Tibetan mandala, a map of the cosmos drawn from the centre outward. To most eyes these are separate inheritances, separated by centuries and continents.",
      "Steve's life's argument was that they are not separate at all. Underneath the different hands and the different gods, the same small set of moves keeps appearing: a centre, a division of the circle, a rhythm of repetition, a return. Draw carefully enough, in any of the four, and you arrive in the same place.",
      "That is why his paintings resist being filed under one heading. A single piece might open with an interlace border, turn through a rose-window symmetry, and resolve into a mandala's still centre — not as a collage of quotations, but because, to him, they were one continuous sentence.",
      "These writings gather what he said about that sentence: how he drew it, where he found it, and why he believed it mattered. Some are his own words, from notebooks and interviews. Some are ours, trying to set the work down plainly. We'll add to them as we go.",
    ],
    pullQuote: {
      text: "So here we are on Earth — orbiting a Sun Star at about 67,062 miles an hour.",
      attribution: "Stephen Meakin",
    },
  },

  // --- TEMPLATE (draft — never appears on the live site). Copy me. ----------
  {
    slug: "template-delete-or-edit-me",
    title: "An example article — copy this entry",
    excerpt:
      "This is a draft template. It never shows on the live site (draft: true). Duplicate it, fill in Steve's writing, set draft to false, and push.",
    kind: "Template",
    date: "—",
    author: "Stephen Meakin",
    draft: true,
    body: [
      "Each item in the body array is one paragraph. Write as many as you like.",
      "Leave the author as \"Stephen Meakin\" for his own words, or remove the author line to attribute a piece to the estate.",
      "When the piece is ready, set draft to false (or delete the draft line) and push — it will appear at the top of /journal and at /journal/template-delete-or-edit-me (rename the slug first!).",
    ],
    pullQuote: {
      text: "A single line worth lifting out of the body goes here.",
      attribution: "Stephen Meakin",
    },
  },
];

/** Byline for an article — falls back to the estate when none is set. */
export const articleAuthor = (a: JournalArticle): string => a.author || ESTATE_AUTHOR;

/** Published articles only (drops drafts), in file order (newest first). */
export const publishedArticles = (): JournalArticle[] => JOURNAL.filter((a) => !a.draft);

/** Look up a published article by slug. Drafts resolve to undefined (route 404s). */
export const getPublishedArticle = (slug: string): JournalArticle | undefined =>
  JOURNAL.find((a) => a.slug === slug && !a.draft);

/** Rough reading time in minutes from the body word count (~200 wpm). */
export const readingMinutes = (a: JournalArticle): number => {
  const words = a.body.join(" ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};
