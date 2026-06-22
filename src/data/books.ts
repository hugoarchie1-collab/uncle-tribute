// =============================================================================
// THE READING ROOM — single source of truth for the /library shelf
// -----------------------------------------------------------------------------
// Mirrors how news.ts / memories.ts / paintings.ts already drive their pages:
// one typed, hand-edited array — no database. The family edits THIS file and
// redeploys, the same deliberate file-based flow as everywhere else on the site.
//
// WHAT THIS PAGE IS: the books that shaped the late artist Stephen Meakin —
// a quiet reading room gathered by the estate, the way a shelf is filled over
// years. Each entry is a real book Stephen kept near, presented with reverence.
//
// HOW TO EDIT (read before changing copy — the VOICE WALL is not optional):
//   - `summary` is the ESTATE voice: the family reflecting on why a book sat on
//     Stephen's shelf. ~40–70 words, calm and unhurried. It NEVER puts words in
//     Stephen's mouth and NEVER quotes him — his own words appear NOWHERE on
//     this page. Describe the book, and note simply that he kept it / returned
//     to it. Never invent a reaction or feeling on his behalf.
//   - `bookQuote` is ONE widely-known line FROM THE BOOK, attributed in
//     `bookQuoteWho` to the BOOK / AUTHOR (e.g. "Kahlil Gibran, The Prophet").
//     Use ONLY public-domain or very widely quoted lines — never a deep cut, an
//     invented paraphrase, or anything that reads as Stephen's. Omit it entirely
//     if no safe, famous line exists.
//   - `coverImage` is a REAL `/img/books/<stem>-vN.jpg` path on disk. Covers are
//     external depicted objects (book jackets), so the page renders them with a
//     PLAIN lazy <img> — NOT AssetImage; there is no .webp sibling and none is
//     needed (like the photobook gallery). New filename per the immutable /img
//     cache rule (a NEW cover needs a NEW -vN stem).
//   - `featured: true` lifts ONE book to the lead spread at the top. Keep it to
//     a single featured book; the first featured (else the first book) leads.
//   - `useFallbackCard: true` renders a bespoke typographic card INSTEAD of the
//     photographed jacket — for books whose mass-market cover is loud / off-key
//     against the dark register. Keep the real cover committed as a backup; flip
//     the flag if a better jacket is sourced later.
//   - `spineColor` is the ONE per-book warm tone — a small left spine tab on the
//     cover and the author line on a fallback card. Keep it muted and in-family
//     (rusts / browns / muted slates); never a bright UI colour.
//   - Newest / most-meaningful additions can go anywhere; the page renders array
//     order (featured first, then the rest as the shelf). Keep it honest: only
//     books Stephen genuinely kept near — never padding the shelf to look full.
// =============================================================================

export interface Book {
  /** Stable unique id — React key. */
  id: string;
  title: string;
  author: string;
  /** First-publication year (number — used for the "· year" eyebrow). */
  year: number;
  /** REAL /img/books/<stem>-vN.jpg path. Rendered with a plain lazy <img>. */
  coverImage: string;
  /** ESTATE voice, ~40–70 words. NEVER words put in Stephen's mouth. */
  summary: string;
  /** ONE widely-known line FROM the book (public-domain / very widely quoted). */
  bookQuote?: string;
  /** Attribution for bookQuote — the BOOK / AUTHOR, e.g. "Kahlil Gibran, The Prophet". */
  bookQuoteWho?: string;
  /** Lift this book to the lead spread at the top of the page. Keep to ONE. */
  featured?: boolean;
  /** The ONE muted warm tone for this book's spine tab / fallback author line. */
  spineColor?: string;
  /** Render the bespoke typographic card instead of the photographed jacket. */
  useFallbackCard?: boolean;
  /** Optional outward link (a publisher / Standard Ebooks page). Rarely used. */
  link?: string;
}

/** The single book that leads the page — the first featured, else the first. */
export const getLeadBook = (books: Book[]): Book | undefined =>
  books.find((b) => b.featured) ?? books[0];

/** Every book that is NOT the lead — the shelf beneath the lead spread. */
export const getShelfBooks = (books: Book[]): Book[] => {
  const lead = getLeadBook(books);
  return lead ? books.filter((b) => b.id !== lead.id) : books;
};

// -----------------------------------------------------------------------------
// THE SHELF. Featured first (the lead spread), then the rest. Keep the VOICE
// WALL: `summary` = estate reflection (never Stephen's words); `bookQuote` = a
// famous line FROM the book, attributed to the book/author. Stephen's own words
// appear NOWHERE here.
//
// Template (copy + fill in a real book Stephen kept near):
//   {
//     id: "unique-id",
//     title: "…",
//     author: "…",
//     year: 1900,
//     coverImage: "/img/books/<stem>-v1.jpg", // real file on disk
//     summary: "…",                            // estate voice, ~40–70 words
//     bookQuote: "…",                          // one famous line FROM the book
//     bookQuoteWho: "Author, Title",           // attributed to the book/author
//     // featured: true,                       // ONE book leads the page
//     // useFallbackCard: true,                // loud jacket → bespoke type card
//     spineColor: "#7a6a55",                   // muted warm in-family tone
//   },
// -----------------------------------------------------------------------------
export const BOOKS: Book[] = [
  {
    id: "the-prophet-gibran",
    title: "The Prophet",
    author: "Kahlil Gibran",
    year: 1923,
    coverImage: "/img/books/the-prophet-gibran-v1.jpg",
    featured: true,
    useFallbackCard: true,
    spineColor: "#c97844",
    summary:
      "Gibran's prose-poem, in which the prophet Almustafa speaks on love, work, giving and sorrow in the hour before he leaves the city of Orphalese. A slim, quiet companion that has sat in many homes since 1923 — and one of the books Stephen kept among those that shaped him.",
    bookQuote:
      "Your children are not your children. They are the sons and daughters of Life's longing for itself.",
    bookQuoteWho: "Kahlil Gibran, The Prophet",
  },
  {
    id: "the-road-less-travelled-peck",
    title: "The Road Less Travelled",
    author: "M. Scott Peck",
    year: 1978,
    coverImage: "/img/books/the-road-less-travelled-peck-v1.jpg",
    useFallbackCard: true,
    spineColor: "#7a6a55",
    summary:
      "Peck's study of discipline, love and growth, which opens by refusing comfort — “Life is difficult” — and treats that plain sentence as a beginning rather than an end. Part clinical psychology, part spiritual enquiry, it asks the reader to meet hardship squarely. One of the books that shaped Stephen, kept close on his shelf.",
    bookQuote: "Life is difficult.",
    bookQuoteWho: "M. Scott Peck, The Road Less Travelled",
  },
];
