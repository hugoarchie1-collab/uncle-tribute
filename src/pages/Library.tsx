// src/pages/Library.tsx — "The reading room": the books that shaped the late
// artist Stephen Meakin, gathered slowly by the estate. Named export, wired into
// routing / Nav / Footer / sitemap by the orchestrator (do not touch those here).
//
// Built to the established estate idiom, matched to News.tsx beat-for-beat:
//   - The fixed dark scene backdrop (the already-dark indigo carpet) under the
//     shared scrim, via the canonical <SceneBackdrop>; <main> rides `relative z-10`.
//   - The refined <PageMasthead> front cover (Fraunces opsz 144 / wght 560, NEVER
//     ≥700), a meta rule, one italic-regular emphasised phrase, an intro grid
//     packed beneath under a border-t with on-backdrop textShadow.
//   - A BOLD asymmetric LEAD spread for the featured book, then a quiet SHELF
//     grid of the rest — rich at two books, scaling gracefully to many.
//
// VOICE WALL (load-bearing): every `summary` is the estate reflecting; every
// `bookQuote` is a famous line FROM the book, attributed to the book/author.
// Stephen's own words appear NOWHERE on this page (see the books.ts header).
//
// Palette is locked to bg/ink/ink-muted/line/accent — the only colours that are
// NOT from that set are the book COVERS (external depicted objects) and each
// book's muted `spineColor` tab, both deliberately allowed. Tokens are imported
// from ui/tokens (never re-typed). Reveal wraps whole elements only; covers use a
// PLAIN lazy <img> (NOT AssetImage — no .webp sibling needed), like the photobook.

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { Nav } from "../components/Nav";
import { PageMasthead } from "../components/PageMasthead";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Seo } from "../components/Seo";
import { Reveal } from "../components/Reveal";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { asset } from "../lib/asset";
import { absoluteUrl } from "../lib/seo";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_MUTED, SUBTITLE, META, BTN_PRIMARY } from "../components/ui/tokens";
import { BOOKS, getLeadBook, getShelfBooks, type Book } from "../data/books";

// The estate inbox — also the mailto fallback recipient if the POST ever fails.
const ESTATE_EMAIL = "info@themandalacompany.com";

// On-backdrop legibility shadow — the same value NewsMasthead carries over the
// scene scrim so cream type never dissolves into the carpet behind it.
const TEXT_SHADOW_SOFT = "0 1px 10px rgba(0,0,0,0.7)";
const TEXT_SHADOW_DEEP = "0 2px 14px rgba(0,0,0,0.7)";

// ─── FallbackCard ─────────────────────────────────────────────────────────────
// A bespoke Standard-Ebooks-style typographic card, used INSTEAD of a loud
// mass-market jacket (book.useFallbackCard). Palette + the book's own muted
// spineColor only — no image. Year top → large centred Fraunces title → hairline
// rule → author at the foot in spineColor. Holds the 2/3 portrait ratio so it
// sits flush beside photographed jackets in the same grid.
const FallbackCard = ({ book }: { book: Book }) => (
  <div
    className="relative flex aspect-[2/3] w-full flex-col items-center justify-between overflow-hidden rounded-[2px] bg-bg px-5 py-6 text-center ring-1 ring-line"
    style={{ boxShadow: "0 18px 40px -24px rgba(0,0,0,0.85)" }}
  >
    <span className={cn(EYEBROW_MUTED, "tracking-[0.3em]")}>{book.year}</span>
    <span
      className="font-display font-normal text-ink text-balance leading-[1.1] tracking-[-0.01em]"
      style={{
        fontVariationSettings: '"opsz" 72, "wght" 520',
        fontSize: "clamp(20px, 2.1vw, 30px)",
      }}
    >
      {book.title}
    </span>
    <div className="flex w-full flex-col items-center gap-3">
      <span aria-hidden="true" className="h-px w-10 bg-line" />
      <span
        className="font-sans text-[11px] font-bold tracking-[0.04em]"
        style={{ color: book.spineColor ?? "var(--ink-muted)" }}
      >
        {book.author}
      </span>
    </div>
  </div>
);

// ─── BookCover ────────────────────────────────────────────────────────────────
// The photographed jacket (a PLAIN lazy <img> — covers are external objects with
// no .webp sibling), held in a 2/3 portrait frame with a hairline ring + a soft
// drop shadow, lifting a touch on the row's group-hover. An optional spineColor
// tab runs down the left edge for a hint of the physical book. Falls through to
// the bespoke FallbackCard when the jacket is loud / off-key.
const BookCover = ({ book }: { book: Book }) => {
  if (book.useFallbackCard) return <FallbackCard book={book} />;
  return (
    <div
      className="relative overflow-hidden rounded-[2px] ring-1 ring-line transition-transform duration-500 ease-out group-hover:-translate-y-1"
      style={{ boxShadow: "0 18px 40px -24px rgba(0,0,0,0.85)" }}
    >
      {book.spineColor ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 z-10 w-[3px]"
          style={{ backgroundColor: book.spineColor }}
        />
      ) : null}
      <img
        src={asset(book.coverImage)}
        alt={`${book.title} by ${book.author}`}
        loading="lazy"
        decoding="async"
        className="block aspect-[2/3] h-auto w-full object-cover"
      />
    </div>
  );
};

// ─── LibraryMasthead ──────────────────────────────────────────────────────────
// The front cover on the shared <PageMasthead> recipe (opsz 144 / wght 560), with
// an estate-framing intro packed beneath under a border-t — carrying the on-scene
// textShadow so the cream copy holds over the indigo carpet.
const LibraryMasthead = () => (
  <PageMasthead
    className="relative pt-8 md:pt-10 pb-7 md:pb-9"
    eyebrow="The reading room"
    meta="The Mandala Company"
    title={
      <>
        The books that <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>shaped him</em>
      </>
    }
  >
    <div className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-5 items-start border-t border-line pt-5 md:pt-6">
      <Reveal as="div" className="lg:col-span-3">
        <p
          className={cn(EYEBROW_MUTED, "m-0 leading-[1.8]")}
          style={{ textShadow: TEXT_SHADOW_SOFT }}
        >
          From the estate · gathered slowly
        </p>
      </Reveal>
      <Reveal as="div" delay={0.06} className="lg:col-span-9">
        <p
          className="font-display font-normal tracking-[-0.01em] text-ink m-0 text-pretty"
          style={{
            fontVariationSettings: '"opsz" 32, "wght" 400',
            fontSize: "clamp(20px, 2.2vw, 38px)",
            lineHeight: 1.34,
            textShadow: TEXT_SHADOW_DEEP,
          }}
        >
          A man is partly made of the books he keeps near. These are some of the
          ones Stephen returned to — gathered here slowly, the way a shelf is
          filled.
        </p>
      </Reveal>
    </div>
  </PageMasthead>
);

// ─── LeadBook ─────────────────────────────────────────────────────────────────
// The featured book as a BOLD asymmetric spread: the PORTRAIT cover sits in the
// SMALLER column, the editorial column (eyebrow → Fraunces title → summary → an
// italic pull-quote of the famous line FROM the book) fills the larger one. So
// the page opens on a designed feature, never a thin centred stack.
const LeadBook = ({ book }: { book: Book }) => (
  <Reveal
    as="section"
    delay={0.05}
    className="border-t border-line pt-6 md:pt-8 mb-10 md:mb-14"
  >
    <div className="group grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-center">
      {/* COVER — the smaller column; portrait jacket, capped so it never towers. */}
      <div className="md:col-span-5 lg:col-span-4">
        <div className="mx-auto w-full max-w-[300px] md:max-w-none lg:max-w-[360px]">
          <BookCover book={book} />
        </div>
      </div>

      {/* EDITORIAL — the larger column. */}
      <div className="md:col-span-7 lg:col-span-8">
        <p className={cn(EYEBROW, "m-0 mb-4")} style={{ textShadow: TEXT_SHADOW_SOFT }}>
          {book.author} · {book.year}
        </p>
        <h2
          className="font-display tracking-[-0.025em] text-[clamp(30px,3.8vw,66px)] leading-[1.02] text-ink text-balance m-0 hero-text-shadow"
          style={{ fontVariationSettings: '"opsz" 96, "wght" 560' }}
        >
          {book.title}
        </h2>
        <p className={cn(SUBTITLE, "mt-5 md:mt-6 mb-0")}>{book.summary}</p>

        {book.bookQuote ? (
          <figure className="mt-7 md:mt-9 m-0 border-l border-line pl-5 md:pl-7">
            <blockquote
              className="font-display font-normal italic tracking-[-0.01em] text-ink m-0 text-pretty"
              style={{
                fontVariationSettings: '"opsz" 40, "wght" 400',
                fontSize: "clamp(19px, 1.9vw, 28px)",
                lineHeight: 1.4,
                textShadow: TEXT_SHADOW_SOFT,
              }}
            >
              “{book.bookQuote}”
            </blockquote>
            {book.bookQuoteWho ? (
              <figcaption className={cn(EYEBROW_MUTED, "mt-4")}>
                {book.bookQuoteWho}
              </figcaption>
            ) : null}
          </figure>
        ) : null}
      </div>
    </div>
  </Reveal>
);

// ─── ShelfItem ────────────────────────────────────────────────────────────────
// One quiet book on the shelf: the cover above a caption (author · year eyebrow →
// Fraunces title that warms to accent on hover → estate summary → optional small
// italic line from the book). `wide` lets a lone shelf book read richer (spanning
// two columns with the cover beside the caption) so it never floats alone.
const ShelfItem = ({ book, wide = false }: { book: Book; wide?: boolean }) => {
  const caption = (
    <div className="min-w-0">
      <p className={cn(EYEBROW_MUTED, "m-0 mb-2")}>
        {book.author} · {book.year}
      </p>
      <h3 className="font-display font-semibold tracking-[-0.02em] text-[clamp(19px,1.6vw,26px)] leading-[1.12] text-ink text-balance m-0 transition-colors duration-300 group-hover:text-accent">
        {book.title}
      </h3>
      <p className={cn(META, "m-0 mt-2.5 max-w-[42ch]")}>{book.summary}</p>
      {book.bookQuote ? (
        <p
          className="font-display font-normal italic text-ink-muted m-0 mt-3 text-pretty"
          style={{
            fontVariationSettings: '"opsz" 32, "wght" 400',
            fontSize: "clamp(14px, 0.95vw, 17px)",
            lineHeight: 1.42,
          }}
        >
          “{book.bookQuote}”
        </p>
      ) : null}
    </div>
  );

  // RICH (a lone / spotlighted shelf book): cover and caption sit side by side so
  // it reads as a designed pair rather than a single small tile in dead space.
  if (wide) {
    return (
      <article className="group sm:col-span-2 grid grid-cols-[minmax(0,9rem)_1fr] sm:grid-cols-[minmax(0,12rem)_1fr] gap-5 sm:gap-7 items-start">
        <BookCover book={book} />
        {caption}
      </article>
    );
  }

  // STANDARD: cover above caption, the quiet repeated shelf unit.
  return (
    <article className="group flex flex-col">
      <BookCover book={book} />
      <div className="mt-4">{caption}</div>
    </article>
  );
};

// ─── Shelf ────────────────────────────────────────────────────────────────────
// The rest of the books under a Fraunces section head + a growing count, on a
// responsive grid. With a single shelf book it renders richer (side-by-side) so
// it never floats alone in a wide empty grid.
const Shelf = ({ books }: { books: Book[] }) => {
  if (books.length === 0) return null;
  const lone = books.length === 1;

  return (
    <section aria-label="The shelf">
      <Reveal
        as="div"
        className="flex items-baseline gap-4 flex-wrap border-t border-line pt-5 md:pt-6"
      >
        <h2 className="font-display font-semibold tracking-[-0.03em] text-[clamp(28px,3.6vw,60px)] leading-[1.0] text-ink m-0">
          The shelf
        </h2>
        <p className={cn(EYEBROW_MUTED, "m-0")}>
          {books.length} {books.length === 1 ? "book" : "books"}, growing
        </p>
      </Reveal>

      <div
        className={cn(
          "mt-6 md:mt-8",
          lone
            ? "max-w-[820px]"
            : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 3xl:grid-cols-5 gap-x-6 gap-y-10",
        )}
      >
        {books.map((book, i) => (
          <Reveal key={book.id} as="div" delay={Math.min(i * 0.05, 0.25)}>
            <ShelfItem book={book} wide={lone} />
          </Reveal>
        ))}
      </div>
    </section>
  );
};

// ─── BookSuggestion ───────────────────────────────────────────────────────────
// A dignified invitation to FRIENDS & FAMILY who knew Stephen: tell the estate a
// book he read in his lifetime. The shelf is "gathered slowly" — this is how it
// keeps growing, honestly, from the people who were there. It is NEVER a claim:
// nothing submitted here appears on the page automatically; the estate reads each
// note and adds a book by hand (the books.ts VOICE WALL still governs the shelf).
//
// A warm CTA opens a small inline form (your name + the book + why it mattered),
// POSTing to /api/newsletter-subscribe with kind:"book-suggestion" — mirroring the
// proven custom-size/enquiry POST pattern (same self-contained endpoint, honeypot,
// friendly-success contract: only a network failure shows an error). If the POST
// throws, a prefilled mailto: to the estate is offered so the memory is never lost.
const BookSuggestion = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [why, setWhy] = useState("");
  const [company, setCompany] = useState(""); // honeypot — humans leave empty
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );

  // Prefilled mailto so the note is never lost if the network POST fails.
  const mailtoHref = () => {
    const subject = `A book that shaped Stephen${bookTitle.trim() ? ` — ${bookTitle.trim()}` : ""}`;
    const lines = [
      name.trim() ? `From: ${name.trim()}` : "",
      bookTitle.trim() ? `Book: ${bookTitle.trim()}` : "",
      why.trim() ? `Why it mattered to him: ${why.trim()}` : "",
    ].filter(Boolean);
    return `mailto:${ESTATE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    // Email is the only required field — same gate as the custom-size form.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStatus("error");
      return;
    }
    if (!bookTitle.trim()) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    try {
      // POSTs to the shared newsletter endpoint. We send kind:"book-suggestion"
      // (the estate-facing intent) AND kind reuse via the proven custom-size
      // fields so the request reaches the estate inbox regardless of which branch
      // the endpoint matches: paintingTitle carries the BOOK title (drives the
      // email subject), message carries the suggester's WHY. The estate reads the
      // note and adds the book to books.ts by hand — never auto-published.
      await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "book-suggestion",
          source: "library:book-suggestion",
          name: name.trim(),
          email: trimmedEmail,
          // Reused custom-size fields so the existing estate-email branch fires:
          paintingTitle: bookTitle.trim()
            ? `Book suggestion: ${bookTitle.trim()}`
            : "Book suggestion",
          dimensions: bookTitle.trim(),
          message: why.trim(),
          company,
        }),
      });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  const INPUT =
    "w-full bg-transparent ring-1 ring-line focus:ring-ink/40 px-3.5 py-3 font-sans text-[16px] text-ink placeholder:text-ink-faint focus:outline-none transition-shadow";

  return (
    <Reveal
      as="section"
      className="mt-14 md:mt-20 border-t border-line pt-8 md:pt-10"
      aria-label="Suggest a book Stephen read"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-7 items-start">
        {/* LEFT — the invitation, in the estate voice. */}
        <div className="lg:col-span-5">
          <p className={cn(EYEBROW, "m-0 mb-4")} style={{ textShadow: TEXT_SHADOW_SOFT }}>
            For those who knew him
          </p>
          <h2
            className="font-display tracking-[-0.03em] text-[clamp(30px,3.6vw,58px)] leading-[1.02] text-ink text-balance m-0 hero-text-shadow"
            style={{ fontVariationSettings: '"opsz" 96, "wght" 560' }}
          >
            Knew Stephen?{" "}
            <em
              className="italic font-normal"
              style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}
            >
              Tell us a book
            </em>{" "}
            that shaped him.
          </h2>
          <p
            className={cn(SUBTITLE, "mt-5 md:mt-6 mb-0 max-w-[46ch]")}
            style={{ textShadow: TEXT_SHADOW_SOFT }}
          >
            This shelf is gathered slowly. If you remember a book Stephen read,
            kept near or pressed into your hands, write to the estate — we read
            every note, and add the ones we can place with care.
          </p>
        </div>

        {/* RIGHT — the CTA, opening into the inline form. */}
        <div className="lg:col-span-7 lg:pl-6">
          <div
            className={cn(
              "relative w-full ring-1 transition-all duration-300",
              open
                ? "ring-ink/40 shadow-[0_8px_34px_rgba(0,0,0,0.45)]"
                : "ring-line hover:ring-ink/40",
            )}
          >
            {!open ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="block w-full text-left bg-transparent p-6 md:p-7 cursor-pointer"
              >
                <span className={cn(EYEBROW_MUTED, "block mb-3")}>
                  A book that shaped him
                </span>
                <span className="block font-display font-semibold tracking-[-0.01em] text-[clamp(20px,2vw,28px)] leading-[1.15] text-ink mb-2">
                  Tell us a book that shaped him →
                </span>
                <span className={cn(META, "block")}>
                  A name and a line of why — that&rsquo;s all. It goes straight to
                  the estate.
                </span>
              </button>
            ) : status === "done" ? (
              <div className="p-6 md:p-7" role="status" aria-live="polite">
                <p className={cn(EYEBROW_MUTED, "m-0 mb-3")}>With thanks</p>
                <p className="font-sans text-[16px] leading-[1.6] text-ink m-0 max-w-[48ch]">
                  Thank you — your note has reached the estate. If we can place the
                  book with care, it may one day join the shelf.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="p-6 md:p-7">
                <p className={cn(EYEBROW_MUTED, "m-0 mb-5")}>
                  A book Stephen read
                </p>

                {/* Honeypot — off-screen; bots fill it, humans don't. */}
                <input
                  type="text"
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="absolute left-[-9999px] w-px h-px opacity-0"
                />

                <div className="flex flex-col gap-3.5">
                  <div>
                    <label htmlFor="book-suggestion-title" className={cn(META, "block mb-1.5")}>
                      The book
                    </label>
                    <input
                      id="book-suggestion-title"
                      type="text"
                      required
                      placeholder="Title — and author, if you remember it"
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                      className={INPUT}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="book-suggestion-name" className={cn(META, "block mb-1.5")}>
                        Your name <span className="text-ink-faint">(optional)</span>
                      </label>
                      <input
                        id="book-suggestion-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label htmlFor="book-suggestion-email" className={cn(META, "block mb-1.5")}>
                        Email
                      </label>
                      <input
                        id="book-suggestion-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={INPUT}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="book-suggestion-why" className={cn(META, "block mb-1.5")}>
                      Why it mattered to him{" "}
                      <span className="text-ink-faint">(optional)</span>
                    </label>
                    <textarea
                      id="book-suggestion-why"
                      rows={3}
                      placeholder="A memory, a moment, a line he loved…"
                      value={why}
                      onChange={(e) => setWhy(e.target.value)}
                      className={cn(INPUT, "resize-y")}
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className={BTN_PRIMARY}
                  >
                    {status === "sending" ? "Sending…" : "Send to the estate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="bg-transparent border-0 cursor-pointer font-sans text-[13px] text-ink-muted underline underline-offset-4 hover:text-ink transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className={cn(META, "m-0 mt-4")} aria-live="polite">
                  {status === "error" ? (
                    <>
                      That didn&rsquo;t send. Add a book title and a valid email, or{" "}
                      <a
                        href={mailtoHref()}
                        className="underline underline-offset-4 text-ink hover:text-accent"
                      >
                        email the estate directly
                      </a>
                      .
                    </>
                  ) : (
                    "Goes straight to the estate. Nothing is published automatically — we add books by hand, with care."
                  )}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </Reveal>
  );
};

// ─── Library ──────────────────────────────────────────────────────────────────
export const Library = () => {
  const lead = getLeadBook(BOOKS);
  const shelf = getShelfBooks(BOOKS);

  // Per-book schema.org Book JSON-LD — a quiet structured-data nicety so each
  // title is legible to crawlers. Public, factual book facts only.
  const jsonLd: object[] = BOOKS.map((book) => ({
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    author: { "@type": "Person", name: book.author },
    datePublished: String(book.year),
    image: absoluteUrl(asset(book.coverImage)),
  }));

  const wired: ReactNode = (
    <>
      {lead ? <LeadBook book={lead} /> : null}
      <Shelf books={shelf} />
      <BookSuggestion />
    </>
  );

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-x-hidden">
      <SceneBackdrop src="/img/scenes/news-indigo-carpet-blur-v2.webp" />
      <Seo
        title="The Reading Room — the books that shaped Stephen Meakin"
        description="The books that shaped Stephen Meakin — a reading room from the estate of the late artist (SEM, 1966–2021)."
        url="/library"
        jsonLd={jsonLd}
      />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] 4xl:max-w-[2000px] px-4 sm:px-6 md:px-8 lg:px-12 3xl:px-16 pb-12 md:pb-16">
        <LibraryMasthead />
        {wired}
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};

export default Library;
