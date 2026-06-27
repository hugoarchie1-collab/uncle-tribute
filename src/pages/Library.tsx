// src/pages/Library.tsx — "The reading room": the books that shaped the late
// artist Stephen Meakin, gathered slowly by the estate. Named export, wired into
// routing / Nav / Footer / sitemap by the orchestrator (do not touch those here).
//
// LAYOUT (2026-06-26 — Hugo: "I don't want the two books separated wtf"):
// the page was previously SPLIT — a big asymmetric LEAD spread for the featured
// book, then a separate "The shelf · N books, growing" grid for the rest, with a
// divider heading wedged between. That read as two unrelated things. It is now ONE
// cohesive shelf: a single heading, then a BALANCED TWO-UP grid of equal book
// panels (cover beside an editorial caption). Two books read as a deliberate pair;
// more books flow into the same grid. No lead/shelf divide, no lone-book special
// casing, no dead rectangles.
//
// THE COVERS are bespoke ORIGINAL typographic cover cards (<BookCover>) — NOT
// reproductions of the real, copyrighted jackets (The Road Less Travelled's cover
// art + Gibran's original illustrations are copyrighted). Publisher-grade editorial
// typography ONLY: framed edge + a muted spine bar, tracked-uppercase metadata, a
// large Fraunces title set with care, a hairline rule, an author colophon. Palette
// is locked to bg/ink/ink-muted/line/accent + each book's one muted `spineColor`.
//
// VOICE WALL (load-bearing): every `summary` is the estate reflecting; every
// `bookQuote` is a famous line FROM the book, attributed to the book/author.
// Stephen's own words appear NOWHERE on this page (see the books.ts header).
//
// Tokens are imported from ui/tokens (never re-typed). Reveal wraps whole elements
// only. The covers are pure type (no <img>, no fetched artwork) — original work.

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
import { BOOKS, type Book } from "../data/books";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

// The estate inbox — also the mailto fallback recipient if the POST ever fails.
const ESTATE_EMAIL = "info@themandalacompany.com";

// On-backdrop legibility shadow — the same value NewsMasthead carries over the
// scene scrim so cream type never dissolves into the carpet behind it.
const TEXT_SHADOW_SOFT = "0 1px 10px rgba(0,0,0,0.7)";
const TEXT_SHADOW_DEEP = "0 2px 14px rgba(0,0,0,0.7)";

// ─── BookCover ────────────────────────────────────────────────────────────────
// A bespoke, ORIGINAL typographic book cover — publisher-grade editorial type,
// NEVER a reproduction of the real (copyrighted) jacket art. The grammar is the
// confident editorial book-cover idiom: a deep-cream paper field on the dark
// register, a muted coloured SPINE bar down the binding edge, a tracked-uppercase
// metadata line at the head, a large Fraunces title set with real optical care in
// the optical centre, a hairline rule, and the author + a "first published" year
// colophon at the foot. One muted accent per book (its `spineColor`). Held in a
// true 2/3 portrait ratio so the pair sits as a matched set; lifts a touch on the
// panel's group-hover. Pure type — no <img>, no fetched artwork (original work).
const BookCover = ({ book }: { book: Book }) => {
  // Each book's one muted warm tone (rust / slate-brown), falling back to accent.
  const tone = book.spineColor ?? "var(--accent)";
  return (
    <div
      className="group/cover relative aspect-[2/3] w-full select-none overflow-hidden rounded-[3px] bg-[#ede6d6] text-[#0a0908] ring-1 ring-black/30 transition-transform duration-500 ease-out group-hover:-translate-y-1"
      style={{
        boxShadow:
          "0 24px 50px -26px rgba(0,0,0,0.92), inset 0 0 0 1px rgba(10,9,8,0.06)",
      }}
    >
      {/* SPINE — the binding edge: a muted colour band + a hairline shadow where
          it meets the board, so the card reads as a physical book, not a poster. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 z-20 w-[clamp(9px,3.5%,14px)]"
        style={{ backgroundColor: tone }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-[clamp(9px,3.5%,14px)] z-20 w-[6px]"
        style={{
          background:
            "linear-gradient(90deg, rgba(10,9,8,0.22), rgba(10,9,8,0))",
        }}
      />

      {/* A whisper of paper warmth + a subtle vignette toward the fore-edge so the
          flat cream field has depth, like a printed board under a reading lamp. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 90% at 32% 28%, rgba(255,255,255,0.5), rgba(0,0,0,0) 60%), linear-gradient(125deg, rgba(0,0,0,0) 62%, rgba(10,9,8,0.05) 100%)",
        }}
      />

      {/* The printed face: a hairline frame inset from the board edge, the type
          centred within it. The frame + tracked metadata is the editorial signal. */}
      <div className="absolute inset-0 z-10 flex flex-col px-[10%] py-[9%] pl-[15%] text-center">
        <div
          className="flex flex-1 flex-col items-center justify-between"
          style={{ boxShadow: "inset 0 0 0 1px rgba(10,9,8,0.14)" }}
        >
          {/* HEAD — tracked metadata: the imprint, set in the book's tone. */}
          <span
            className="mt-[7%] font-sans text-[clamp(8px,1.6vw,11px)] font-bold uppercase leading-none tracking-[0.34em]"
            style={{ color: tone }}
          >
            The Reading Room
          </span>

          {/* CENTRE — the title, set large with optical care; a hairline rule
              under it, then the author. The optical heart of the cover. */}
          <div className="flex w-full flex-col items-center gap-[6%] px-[4%]">
            <h3
              className="m-0 font-display font-normal leading-[1.04] tracking-[-0.015em] text-balance"
              style={{
                fontVariationSettings: '"opsz" 60, "wght" 540',
                fontSize: "clamp(22px, 4.2vw, 38px)",
              }}
            >
              {book.title}
            </h3>
            <span
              aria-hidden="true"
              className="h-px w-[clamp(28px,18%,52px)]"
              style={{ backgroundColor: tone }}
            />
            <span className="font-sans text-[clamp(9px,1.7vw,12px)] font-bold uppercase tracking-[0.18em] text-[#0a0908]/80">
              {book.author}
            </span>
          </div>

          {/* FOOT — the colophon: first-published year, quiet and tracked. */}
          <span className="mb-[7%] font-sans text-[clamp(8px,1.5vw,11px)] font-bold uppercase tracking-[0.3em] text-[#0a0908]/55">
            First published {book.year}
          </span>
        </div>
      </div>
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

// ─── ShelfBook ────────────────────────────────────────────────────────────────
// ONE book on the shelf as a balanced editorial PANEL: the bespoke typographic
// cover on one side, the estate caption on the other (author · year metadata →
// Fraunces title → the estate's reflection → an attributed italic line FROM the
// book). Every book renders identically — no "featured/lead" book set apart from
// the rest. So two books read as a matched PAIR, more flow into the same grid.
const ShelfBook = ({ book }: { book: Book }) => (
  <article className="group grid grid-cols-[minmax(0,38%)_1fr] items-start gap-5 sm:gap-7 lg:gap-8">
    {/* COVER — held narrow so the caption beside it carries the weight. */}
    <div className="w-full max-w-[260px]">
      <BookCover book={book} />
    </div>

    {/* CAPTION — the estate voice, on the dark register beside the cream cover. */}
    <div className="min-w-0 pt-1">
      <p className={cn(EYEBROW, "m-0 mb-3")} style={{ textShadow: TEXT_SHADOW_SOFT }}>
        {book.author} · {book.year}
      </p>
      <h3
        className="m-0 font-display tracking-[-0.02em] text-[clamp(24px,2.6vw,42px)] leading-[1.04] text-ink text-balance transition-colors duration-300 group-hover:text-accent hero-text-shadow"
        style={{ fontVariationSettings: '"opsz" 72, "wght" 540' }}
      >
        {book.title}
      </h3>
      <p
        className={cn(SUBTITLE, "mt-4 md:mt-5 mb-0 max-w-[52ch] text-[clamp(15px,0.5vw_+_13px,20px)] leading-[1.62]")}
        style={{ textShadow: TEXT_SHADOW_SOFT }}
      >
        {book.summary}
      </p>

      {book.bookQuote ? (
        <figure className="mt-5 md:mt-6 m-0 border-l border-line pl-4 md:pl-5">
          <blockquote
            className="m-0 font-display font-normal italic tracking-[-0.01em] text-ink text-pretty"
            style={{
              fontVariationSettings: '"opsz" 40, "wght" 400',
              fontSize: "clamp(17px, 1.5vw, 24px)",
              lineHeight: 1.42,
              textShadow: TEXT_SHADOW_SOFT,
            }}
          >
            “{book.bookQuote}”
          </blockquote>
          {book.bookQuoteWho ? (
            <figcaption className={cn(EYEBROW_MUTED, "mt-3")}>
              {book.bookQuoteWho}
            </figcaption>
          ) : null}
        </figure>
      ) : null}
    </div>
  </article>
);

// ─── Bookshelf ────────────────────────────────────────────────────────────────
// THE shelf — ONE cohesive section under ONE heading (no lead/shelf split that
// Hugo rejected). A single Fraunces head + a quiet growing-count, then a BALANCED
// grid of ShelfBook panels: two-up on lg+ so the pair sits side by side and FILLS
// the width to the edges; one-up below where a side-by-side pair would crush. The
// grid auto-flows new books into the same rhythm. No lone-book special case, no
// dead rectangles.
const Bookshelf = ({ books }: { books: Book[] }) => {
  if (books.length === 0) return null;

  return (
    <section aria-label="The reading-room shelf" className="border-t border-line pt-6 md:pt-8">
      <Reveal as="div" className="flex items-baseline gap-x-5 gap-y-1 flex-wrap">
        <h2
          className="m-0 font-display tracking-[-0.03em] text-[clamp(34px,5vw,76px)] leading-[0.98] text-ink hero-text-shadow"
          style={{ fontVariationSettings: '"opsz" 96, "wght" 560' }}
        >
          On the shelf
        </h2>
        <p className={cn(EYEBROW_MUTED, "m-0")} style={{ textShadow: TEXT_SHADOW_SOFT }}>
          {books.length} {books.length === 1 ? "book" : "books"}, growing
        </p>
      </Reveal>

      <div className="mt-8 md:mt-12 grid grid-cols-1 lg:grid-cols-2 gap-x-10 xl:gap-x-16 gap-y-12 md:gap-y-16">
        {books.map((book, i) => (
          <Reveal key={book.id} as="div" delay={Math.min(i * 0.06, 0.24)}>
            <ShelfBook book={book} />
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
  const signedIn = useAuth().status === "signedIn";
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
    if (!signedIn) {
      setStatus("error");
      return;
    }
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
            {!signedIn ? (
              // Sign-in gate — a book can only be suggested by a signed-in
              // visitor (Hugo: "they have to sign in to contribute").
              <Link
                to="/account"
                className="block w-full text-left bg-transparent p-6 md:p-7 cursor-pointer"
              >
                <span className={cn(EYEBROW_MUTED, "block mb-3")}>
                  A book that shaped him
                </span>
                <span className="block font-display font-semibold tracking-[-0.01em] text-[clamp(20px,2vw,28px)] leading-[1.15] text-ink mb-2">
                  Sign in to suggest a book →
                </span>
                <span className={cn(META, "block")}>
                  Suggestions come from a signed-in account, so the family knows
                  who remembered the book.
                </span>
              </Link>
            ) : !open ? (
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
  // Per-book schema.org Book JSON-LD — a quiet structured-data nicety so each
  // title is legible to crawlers. Public, factual book facts only. (The cover
  // jacket file stays on disk as the canonical structured-data image even though
  // the page now renders bespoke ORIGINAL typographic covers, not the jacket.)
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
      <Bookshelf books={BOOKS} />
      <BookSuggestion />
    </>
  );

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-x-hidden">
      <SceneBackdrop src="/img/scenes/news-indigo-carpet-blurheavy-v1.webp" />
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
