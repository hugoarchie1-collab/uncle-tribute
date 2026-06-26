// src/pages/Search.tsx — /search — the full results page.
//
// The Amazon "search results" destination, skinned to the estate: a refined
// left-aligned masthead echoing Collections/FAQ/Contact (eyebrow + hairline +
// a composed Fraunces display statement carrying the query — MASTHEAD_TITLE_STYLE,
// never shouty — plus a result count), then results GROUPED by type in a fixed
// editorial order:
//
//   Artworks → Collections → Pages → News → From the writing → Help
//
// Artworks render as the same square AssetImage tile look Collections uses;
// every other type renders as a clean, linked editorial row. A dignified empty
// state covers both "no query yet" and "no matches", offering the obvious next
// doors (Collections / For You / Contact).
//
// Data comes ONLY from the search contract (src/lib/search.ts): searchSite()
// for the ranked docs + SEARCH_TYPE_LABELS for the group headings. The page
// owns no painting/collection data of its own.

import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { useNoindexHead } from "../lib/useNoindexHead";
import { usePageTitle } from "../lib/usePageTitle";
import { Reveal } from "../components/Reveal";
import { SearchBar } from "../components/SearchBar";
import { AssetImage } from "../components/AssetImage";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_MUTED } from "../components/ui/tokens";
import { MASTHEAD_TITLE_STYLE } from "../components/ui/tokens";
import {
  searchSite,
  SEARCH_TYPE_LABELS,
  type SearchDoc,
  type SearchResult,
} from "../lib/search";

/** The editorial order the groups appear in — Artworks first, Help last. */
const GROUP_ORDER: SearchDoc["type"][] = [
  "painting",
  "collection",
  "page",
  "news",
  "about",
  "faq",
];

/** Up to 60 results, grouped by type — the brief's full-page depth. */
const RESULT_LIMIT = 60;

/** Group the flat ranked list into per-type buckets, preserving rank order. */
const groupResults = (
  results: SearchResult[],
): Record<SearchDoc["type"], SearchResult[]> => {
  const groups = {
    painting: [],
    collection: [],
    page: [],
    news: [],
    about: [],
    faq: [],
  } as Record<SearchDoc["type"], SearchResult[]>;
  for (const r of results) groups[r.doc.type].push(r);
  return groups;
};

/** One clean linked editorial row for a non-artwork result (collections, pages,
 *  news, writing, help) — a small type tag, the title, optional subtitle, and a
 *  travelling arrow on hover. The whole row is the link. */
const ResultRow = ({ doc }: { doc: SearchDoc }) => (
  <li className="m-0">
    <Link
      to={doc.url}
      className="group flex items-start gap-4 border-t border-line py-5 transition-colors duration-300"
    >
      <span
        className={cn(
          "mt-0.5 inline-flex shrink-0 items-center rounded-full px-2.5 py-1",
          "font-sans text-[10px] font-bold uppercase tracking-[0.18em]",
          "text-ink-muted ring-1 ring-line",
        )}
      >
        {SEARCH_TYPE_LABELS[doc.type]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="font-display font-semibold tracking-[-0.02em] text-[clamp(19px,2vw,26px)] leading-[1.15] text-ink transition-colors duration-300 group-hover:text-accent">
            {doc.title}
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 text-ink-muted transition-all duration-300 group-hover:translate-x-[3px] group-hover:text-accent"
          >
            →
          </span>
        </span>
        {doc.subtitle && (
          <span className="mt-1 block font-sans text-[14px] md:text-[15px] leading-[1.6] text-ink-muted">
            {doc.subtitle}
          </span>
        )}
      </span>
    </Link>
  </li>
);

/** One artwork tile — the Collections square-cover treatment (ring → accent on
 *  hover, gentle zoom), so a searched painting reads exactly as it does on the
 *  catalogue page. */
const ArtworkTile = ({ doc }: { doc: SearchDoc }) => (
  <figure className="m-0 min-w-0">
    <Link to={doc.url} className="group block" aria-label={`View ${doc.title}`}>
      <div className="aspect-square overflow-hidden ring-1 ring-line transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
        <div className="relative h-full w-full transition-transform duration-700 group-hover:scale-[1.04]">
          {doc.image ? (
            <AssetImage
              src={doc.image}
              alt={doc.title}
              loading="lazy"
              decoding="async"
              sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-bg-soft">
              <span className={EYEBROW_MUTED}>{SEARCH_TYPE_LABELS[doc.type]}</span>
            </div>
          )}
        </div>
      </div>
      <figcaption className="pt-3">
        <h3 className="m-0 font-display font-semibold text-[15px] md:text-[17px] leading-[1.25] tracking-[-0.015em] text-ink transition-colors duration-300 group-hover:text-accent">
          {doc.title}
        </h3>
        {doc.subtitle && (
          <p className="mt-1 m-0 font-sans text-[12.5px] leading-[1.5] text-ink-muted">
            {doc.subtitle}
          </p>
        )}
      </figcaption>
    </Link>
  </figure>
);

/** The dignified empty state — shown for an empty query OR zero results. Never
 *  an error tone; it simply points to the obvious next doors. */
const EmptyState = ({ query }: { query: string }) => {
  const hasQuery = query.trim().length > 0;
  return (
    <Reveal as="div" className="mt-10 md:mt-14 border-t border-line pt-10 md:pt-14">
      <p
        className="m-0 max-w-[42ch] font-display font-normal tracking-[-0.01em] text-ink"
        style={{
          fontVariationSettings: '"opsz" 32, "wght" 400',
          fontSize: "clamp(22px, 2.6vw, 36px)",
          lineHeight: 1.3,
        }}
      >
        {hasQuery ? (
          <>
            Nothing in the estate matches{" "}
            <span className="text-accent">“{query.trim()}”</span> just yet.
          </>
        ) : (
          <>Search the estate — artworks, collections, the writing, anything.</>
        )}
      </p>
      <p className="mt-4 max-w-[56ch] font-sans text-[16px] md:text-[17px] leading-[1.7] text-ink-muted">
        Try a painting name, a colour, or a collection — or begin from one of
        these.
      </p>
      <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3">
        {[
          { to: "/collections", label: "Browse the collection" },
          { to: "/for-you", label: "Find a print for you" },
          { to: "/contact", label: "Ask the estate" },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted transition-colors duration-300 hover:text-accent"
          >
            {link.label}
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-300 group-hover:translate-x-[3px]"
            >
              →
            </span>
          </Link>
        ))}
      </div>
    </Reveal>
  );
};

export const Search = () => {
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const trimmed = query.trim();

  const results = useMemo(
    () => (trimmed ? searchSite(trimmed, RESULT_LIMIT) : []),
    [trimmed],
  );
  const groups = useMemo(() => groupResults(results), [results]);
  const total = results.length;

  // On-site search results — noindex (avoid thin/duplicate SERP-in-SERP pages).
  usePageTitle(trimmed ? `Search — ${trimmed}` : "Search");
  useNoindexHead();

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <SceneBackdrop src="/img/scenes/search-woodland-blur-v3.webp" />
      <Nav overlay />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-24 md:pt-28 pb-12 md:pb-16">
        {/* MASTHEAD — the refined estate front cover carrying the query (eyebrow
            + hairline meta rule → a composed Fraunces display title, never shouty). */}
        <header>
          <Reveal
            as="div"
            className="flex items-center gap-4 md:gap-6 border-b border-line pb-4 md:pb-5"
          >
            <span className={EYEBROW}>Search</span>
            <span aria-hidden="true" className="h-px flex-1 bg-ink/15" />
            <span className={cn(EYEBROW_MUTED, "shrink-0")}>
              {trimmed
                ? `${total} ${total === 1 ? "result" : "results"}`
                : "The estate"}
            </span>
          </Reveal>

          <Reveal as="div" className="mt-5 md:mt-7">
            <h1
              className="m-0 font-display text-ink text-balance text-pretty"
              style={MASTHEAD_TITLE_STYLE}
            >
              {trimmed ? (
                <>
                  <span className="text-ink-muted">Results for</span>
                  <br />
                  <span className="break-words italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>“{trimmed}”</span>
                </>
              ) : (
                <>Search the estate</>
              )}
            </h1>
          </Reveal>

          {/* Refine — the same SearchBar in its large page variant, so a reader
              can correct or broaden their query without leaving the results. */}
          <Reveal as="div" className="mt-6 md:mt-8 max-w-[760px] border-t border-line pt-6 md:pt-8">
            <SearchBar variant="page" />
          </Reveal>
        </header>

        {/* RESULTS — grouped by type in the fixed editorial order, or the
            dignified empty state when there's no query / no matches. */}
        {total === 0 ? (
          <EmptyState query={query} />
        ) : (
          <div className="mt-10 md:mt-14 flex flex-col gap-12 md:gap-16">
            {GROUP_ORDER.map((type) => {
              const bucket = groups[type];
              if (bucket.length === 0) return null;
              const isArtwork = type === "painting";
              return (
                <Reveal as="section" key={type}>
                  <div className="flex items-center gap-4 md:gap-6 border-b border-line pb-3 md:pb-4">
                    <h2 className={cn(EYEBROW, "m-0")}>{SEARCH_TYPE_LABELS[type]}</h2>
                    <span aria-hidden="true" className="h-px flex-1 bg-ink/15" />
                    <span className={cn(EYEBROW_MUTED, "shrink-0")}>
                      {bucket.length}
                    </span>
                  </div>

                  {isArtwork ? (
                    <div className="mt-6 md:mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:gap-x-7 lg:grid-cols-4">
                      {bucket.map(({ doc }) => (
                        <ArtworkTile key={doc.id} doc={doc} />
                      ))}
                    </div>
                  ) : (
                    <ul className="m-0 mt-2 list-none p-0">
                      {bucket.map(({ doc }) => (
                        <ResultRow key={doc.id} doc={doc} />
                      ))}
                    </ul>
                  )}
                </Reveal>
              );
            })}
          </div>
        )}
      </main>

      <FooterCatalogue />
      <Footer />
    </div>
  );
};
