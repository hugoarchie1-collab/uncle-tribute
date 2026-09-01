// src/pages/Search.tsx — /search — the full results page.
//
// The Amazon "search results" destination, skinned to the estate: a refined
// left-aligned masthead echoing Collections/FAQ/Contact (eyebrow + hairline +
// a composed Fraunces display statement carrying the query — MASTHEAD_TITLE_STYLE,
// never shouty) with a live result COUNT, then the ranked results.
//
// ── 2026-09-01 REBUILD — what changed and why ────────────────────────────────
//
// 1. RANK, NOT TYPE. The page used to re-sort searchSite()'s ranked list into a
//    FIXED editorial order (Artworks → Collections → Pages → News → About →
//    Help), which buried the correct answer: "framed print" put the right FAQ at
//    position 14 of 21; "how much is delivery" at 28 of 35; "canvas" at 18 of 24.
//    The typeahead ranks the SAME searchSite() call correctly, so the dropdown
//    showed the right answer and pressing Enter contradicted it with five
//    unrelated mandalas. Groups are still how the page READS — but they are now
//    ordered by their BEST member's score (orderGroups below), so the group
//    holding the top hit always comes first. GROUP_ORDER survives only as a
//    stable tiebreak for equal scores.
//
// 2. A RELEVANCE FLOOR. searchSite() keeps anything scoring > 0, so a 0.4 prefix
//    hit rendered beside a 44.0 title hit as though they were peers. `relevant()`
//    drops the long tail below a fraction of the top score — defensively, and
//    never below MIN_KEPT results.
//
// 3. TILES THAT CARRY A PRICE. The artwork tile was image + title + subtitle, so
//    the highest-intent act on the site produced a LESS informative tile than
//    browsing: the buyer had to click blind to learn anything cost money. It is
//    now the exact Collections / FindAPrint tile — title · year · "Estate-stamped
//    giclée, framed · from {price}" · colourway dots + count. The price routes
//    through useCurrency().formatPretty(getLowestTierPricePence(...)) so
//    advertised == charged in every currency, and it is the BUYABLE floor
//    (framed), never the bare base — that is a ghost price nobody can check out
//    at.
//
// 4. NO VOID, EVER. Zero results AND the resting no-query state both render real
//    purchasable artwork under a plain functional label instead of two paragraphs
//    and three text links. The tile basis is the count-aware clamped flex-basis
//    the reference pages use, so one lone result commands the row instead of
//    stranding 1,274px of empty grid at 1920px, and 4K fills instead of
//    ballooning into ~838px tiles under a 16px caption.
//
// 5. IT SPEAKS. A role="status" aria-live line carries the count (the old header
//    comment promised one; the JSX never rendered it), and focus moves to the
//    <h1> after a submit — submitting from the Nav reveal (which unmounts on
//    route change) used to drop focus on document.body.
//
// ⚠️ COPY RULE: every buyer-visible word on this page comes from SEARCH in
// src/data/content.ts or from SEARCH_TYPE_LABELS. Five invented lines were
// removed in this rebuild — do not reintroduce prose of that register.
//
// Search data comes ONLY from the search contract (src/lib/search.ts):
// searchSite() for the ranked docs + SEARCH_TYPE_LABELS for the group headings.
// Painting data (price, year, colourways) is resolved from paintings.ts through
// the doc's url/id — see paintingFromDoc, which is deliberately tolerant of how
// the index chooses to spell its ids.

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { useNoindexHead } from "../lib/useNoindexHead";
import { usePageTitle } from "../lib/usePageTitle";
import { Reveal } from "../components/Reveal";
import { SearchBar } from "../components/SearchBar";
import { AssetImage } from "../components/AssetImage";
import { cn } from "../lib/cn";
import { useCurrency } from "../lib/currency";
import {
  EYEBROW,
  EYEBROW_MUTED,
  META,
  BTN_SECONDARY,
  MASTHEAD_TITLE_STYLE,
} from "../components/ui/tokens";
import { SEARCH } from "../data/content";
import {
  PAINTINGS,
  getLowestTierPricePence,
  paintingImageAlt,
  type Painting,
} from "../data/paintings";
import {
  searchSite,
  SEARCH_TYPE_LABELS,
  type SearchDoc,
  type SearchResult,
} from "../lib/search";

/** Stable TIEBREAK order only — no longer the render order. Two groups whose
 *  best member scores identically fall back to this editorial sequence. */
const GROUP_ORDER: SearchDoc["type"][] = [
  "painting",
  "collection",
  "page",
  "news",
  "about",
  "faq",
];

/** Up to 60 results — the brief's full-page depth. */
const RESULT_LIMIT = 60;

/** How far below the TOP score a result may sit and still be shown. 0.08 keeps
 *  the honest long tail of a broad query while dropping the 0.4-vs-44.0 noise. */
const RELEVANCE_FLOOR_RATIO = 0.08;
/** …but never cut a query down to fewer than this many rows. */
const MIN_KEPT = 8;

/** How many paintings the recovery / resting grid draws. 12 fills a 4K row set
 *  (matching the twelve /for-you already computes) and 4 rows on a phone. */
const RECOVERY_COUNT = 12;

/**
 * Drop the irrelevant tail.
 *
 * ⚠️ Written to survive the concurrent rewrite of src/lib/search.ts: it makes no
 * assumption about the MAGNITUDE of a score, only about relative size, it does
 * not assume the array is sorted, and if `score` ever stops being a finite
 * number it returns the input untouched rather than filtering everything away.
 */
const relevant = (results: SearchResult[]): SearchResult[] => {
  if (results.length === 0) return results;
  const scores = results.map((r) => r.score);
  if (scores.some((s) => typeof s !== "number" || !Number.isFinite(s))) return results;
  const top = Math.max(...scores);
  if (top <= 0) return results;
  const floor = top * RELEVANCE_FLOOR_RATIO;
  const kept = results.filter((r) => r.score >= floor);
  const minimum = Math.min(MIN_KEPT, results.length);
  return kept.length >= minimum ? kept : results.slice(0, minimum);
};

/**
 * Bucket the ranked list by type, then ORDER THE BUCKETS BY THEIR BEST MEMBER.
 * Rank order is preserved inside each bucket, so the very first tile/row on the
 * page is always the single best-scoring document — which is exactly what the
 * typeahead shows, and what the fixed editorial order used to contradict.
 */
const orderGroups = (
  results: SearchResult[],
): { type: SearchDoc["type"]; items: SearchResult[] }[] => {
  const buckets = new Map<SearchDoc["type"], SearchResult[]>();
  for (const r of results) {
    const list = buckets.get(r.doc.type);
    if (list) list.push(r);
    else buckets.set(r.doc.type, [r]);
  }
  return [...buckets.entries()]
    .map(([type, items]) => ({
      type,
      items,
      best: Math.max(...items.map((i) => (Number.isFinite(i.score) ? i.score : 0))),
    }))
    .sort((a, b) => {
      if (b.best !== a.best) return b.best - a.best;
      // Equal best score → the stable editorial sequence. An unknown type (a new
      // doc type added by the index) sorts last rather than throwing.
      const ai = GROUP_ORDER.indexOf(a.type);
      const bi = GROUP_ORDER.indexOf(b.type);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map(({ type, items }) => ({ type, items }));
};

/** Painting lookup by catalogue id, built once. */
const PAINTING_BY_ID = new Map<string, Painting>(PAINTINGS.map((p) => [p.id, p]));

/**
 * Resolve the catalogue Painting behind a "painting" SearchDoc.
 *
 * ⚠️ Tolerant on purpose. search.ts is being rewritten alongside this page; today
 * it spells a painting doc `id: "painting-<id>"`, `url: "/collections/<id>"`.
 * We try the URL first, then the id with any prefix stripped, then the title.
 * A miss returns undefined and the tile simply renders without price/year — it
 * never throws and never invents a figure.
 */
const paintingFromDoc = (doc: SearchDoc): Painting | undefined => {
  const fromUrl = /\/collections\/([^/?#]+)/.exec(doc.url)?.[1];
  if (fromUrl) {
    const hit = PAINTING_BY_ID.get(decodeURIComponent(fromUrl));
    if (hit) return hit;
  }
  const bare = doc.id.replace(/^painting[-:]/, "");
  const byId = PAINTING_BY_ID.get(bare);
  if (byId) return byId;
  const lc = doc.title.trim().toLowerCase();
  return PAINTINGS.find((p) => p.title.trim().toLowerCase() === lc);
};

/** Plural group heading, falling back to the singular label for any type the
 *  index gains that content.ts doesn't know about. */
const groupHeading = (label: string, count: number): string =>
  count === 1 ? label : (SEARCH.typePlural[label] ?? label);

/** The legibility halo used on every caption line over the photographic ground
 *  — identical to the Collections / FindAPrint tiles. Blur ≤14px so it clings to
 *  the letters and can never paint a box (the house rule). */
const CAPTION_SHADOW = { textShadow: "0 1px 8px rgba(0,0,0,0.8)" } as const;
const TITLE_SHADOW = { textShadow: "0 2px 14px rgba(0,0,0,0.8)" } as const;

/**
 * COUNT-AWARE tile basis — lifted verbatim from Collections.tsx:1513, which
 * solved exactly this problem. One lone result becomes a commanding half-width
 * plate (up to 1200px) instead of a 396px tile stranding 1,274px of empty row at
 * 1920px; four make a clean 2×2; three a triptych; 5+ a denser grid that still
 * fills a 4K envelope. justify-center centres any partial last row.
 */
const tileBasis = (count: number): string =>
  count <= 2 || count === 4
    ? "flex-[0_1_clamp(340px,48%,1200px)]"
    : count === 3
      ? "flex-[0_1_clamp(340px,32%,820px)]"
      : "flex-[0_1_clamp(300px,31%,680px)]";

/** One clean linked editorial row for a non-artwork result (collections, pages,
 *  news, writing, help) — a small Fraunces type tag, the title, optional
 *  subtitle, and a travelling arrow on hover. The whole row is the link. */
const ResultRow = ({ result }: { result: SearchResult }) => {
  const { doc } = result;
  // OPTIONAL matched-text excerpt. src/lib/search.ts gained `snippet` in the
  // parallel rewrite; this render path is fully guarded, so it no-ops if the
  // field is absent, malformed or empty — and only a BODY snippet is shown,
  // because a title/subtitle snippet would just repeat the two lines above it.
  // The text is verbatim site content the index already holds; nothing here
  // composes or paraphrases copy.
  const snip = result.snippet;
  const excerpt =
    snip && snip.field === "body" && typeof snip.text === "string" && snip.text.trim()
      ? `${snip.leadingEllipsis ? "…" : ""}${snip.text.trim()}${snip.trailingEllipsis ? "…" : ""}`
      : null;
  return (
  <li className="m-0">
    <Link
      to={doc.url}
      className="group flex items-start gap-4 border-t border-line py-5 md:py-6 transition-colors duration-300"
    >
      {/* Tokenised (EYEBROW_MUTED = Fraunces) — this used to be a bespoke
          Schibsted Grotesk 700/16px pill that clashed with the Fraunces group
          heading directly above it. */}
      <span
        className={cn(
          EYEBROW_MUTED,
          "mt-1 inline-flex shrink-0 items-center rounded-full px-3 py-1 ring-1 ring-line reading-shadow",
        )}
      >
        {SEARCH_TYPE_LABELS[doc.type]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="font-display font-semibold tracking-[-0.02em] text-[clamp(19px,2vw,26px)] 3xl:text-[32px] 4xl:text-[38px] leading-[1.15] text-ink reading-shadow transition-colors duration-300 group-hover:text-accent">
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
          <span className={cn(META, "mt-1.5 block reading-shadow")}>
            {doc.subtitle}
          </span>
        )}
        {excerpt && (
          <span className={cn(META, "mt-1.5 block max-w-[92ch] text-ink-soft reading-shadow")}>
            {excerpt}
          </span>
        )}
      </span>
    </Link>
  </li>
  );
};

/**
 * One artwork tile — the SAME tile the buyer sees on /collections and /for-you:
 * square cover · title · year · buyable "from" price · colourway dots + count.
 * Nothing on this page may advertise a figure the buyer cannot check out at, so
 * the price is getLowestTierPricePence (framed floor) rendered through the
 * currency context's formatPretty — advertised == charged, in every currency.
 */
const ArtworkTile = ({
  doc,
  basis,
  chosenName,
  onChooseColourway,
  fmtP,
}: {
  doc: SearchDoc;
  basis: string;
  chosenName?: string;
  onChooseColourway: (paintingId: string, colourway: string) => void;
  fmtP: (gbpPence: number) => string;
}) => {
  const painting = paintingFromDoc(doc);
  const avail = painting?.colourways.filter((c) => c.available) ?? [];
  const original = avail.find((c) => c.isOriginal) ?? avail[0];
  const chosen = (chosenName ? avail.find((c) => c.name === chosenName) : undefined) ?? original;
  const image = chosen?.image ?? doc.image;
  const hasYear = !!painting?.year && painting.year !== "[ DATE ]";
  const to =
    painting && chosen && original && chosen.name !== original.name
      ? `/collections/${painting.id}?c=${encodeURIComponent(chosen.name)}`
      : doc.url;

  return (
    <figure className={cn("m-0 min-w-0", basis)}>
      <Link to={to} className="group block" aria-label={`View ${doc.title}`}>
        <div className="aspect-square overflow-hidden ring-1 ring-line transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-liftLg">
          {/* Gentle ZOOM on hover only — the colourway changes on a deliberate
              dot click, never a hover flick (the house rule). */}
          <div className="relative h-full w-full transition-transform duration-700 group-hover:scale-[1.04]">
            {image ? (
              <AssetImage
                src={image}
                alt={paintingImageAlt(doc.title, chosen?.name)}
                loading="lazy"
                decoding="async"
                sizes="(min-width:1024px) 31vw, (min-width:640px) 46vw, 90vw"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-bg-soft">
                <span className={EYEBROW_MUTED}>{SEARCH_TYPE_LABELS[doc.type]}</span>
              </div>
            )}
          </div>
        </div>
        <figcaption className="pt-3 md:pt-4 text-center">
          {/* min-h + flex-centre (NOT the old min-h on a block h3, which left a
              gap under a one-line title and overflowed a three-line one, breaking
              baselines across a row). 3xl/4xl steps added — this was the only
              type on the page with none while the line beneath it had them. */}
          <h3
            className="m-0 flex min-h-[2.4em] items-center justify-center font-display font-semibold text-[clamp(20px,1.45vw,30px)] 3xl:text-[34px] 4xl:text-[40px] leading-[1.2] tracking-[-0.025em] text-ink transition-colors duration-300 group-hover:text-accent"
            style={TITLE_SHADOW}
          >
            {doc.title}
          </h3>
          {/* Year — always occupies its line so the price row keeps a shared
              baseline across a mixed row (some works are undated). */}
          <p className={cn(EYEBROW_MUTED, "mt-1.5 m-0")} aria-hidden={!hasYear} style={CAPTION_SHADOW}>
            {hasYear ? painting?.year : " "}
          </p>
          {painting ? (
            <p className={cn(META, "mt-2 m-0")} style={CAPTION_SHADOW}>
              {SEARCH.tilePriceLine}{" "}
              <span className="font-semibold text-ink [font-variant-numeric:tabular-nums]">
                {fmtP(getLowestTierPricePence(painting))}
              </span>
            </p>
          ) : (
            doc.subtitle && (
              <p className={cn(META, "mt-2 m-0")} style={CAPTION_SHADOW}>
                {doc.subtitle}
              </p>
            )
          )}
        </figcaption>
      </Link>
      {/* Colourway dots — a deliberate click swaps the tile image + deep-links
          the PDP (?c=). OUTSIDE the Link (buttons can't nest in an anchor).
          Reserved height keeps baselines aligned across a mixed row. */}
      {painting && avail.length > 1 ? (
        <div
          role="group"
          aria-label={`Colourway for ${painting.title}`}
          className="mt-2.5 flex h-5 items-center justify-center gap-1.5"
        >
          {avail.slice(0, 5).map((c) => {
            const sel = c.name === chosen?.name;
            return (
              <button
                key={c.name}
                type="button"
                aria-pressed={sel}
                aria-label={`${painting.title} — ${c.name}`}
                title={c.name}
                onClick={() => onChooseColourway(painting.id, c.name)}
                className={cn(
                  "block h-2.5 w-2.5 rounded-full ring-1 transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  sel ? "ring-2 ring-accent scale-125" : "ring-line/80 hover:ring-accent/60",
                )}
                style={{ backgroundColor: c.hex }}
              />
            );
          })}
          <span
            className="ml-1 font-sans text-[13px] 3xl:text-[14px] leading-none tracking-[0.04em] text-ink-muted"
            style={CAPTION_SHADOW}
          >
            {avail.length} {SEARCH.tileColourwaysSuffix}
          </span>
        </div>
      ) : (
        <div aria-hidden="true" className="mt-2.5 h-5" />
      )}
    </figure>
  );
};

export const Search = () => {
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const trimmed = query.trim();
  const { formatPretty: fmtP } = useCurrency();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // The buyer's chosen colourway per painting — identical to the Collections /
  // FindAPrint tiles, so a searched painting behaves exactly as it does there.
  const [cwChoice, setCwChoice] = useState<Record<string, string>>({});
  const chooseTileCw = (id: string, name: string) =>
    setCwChoice((prev) => ({ ...prev, [id]: name }));

  const results = useMemo(
    () => (trimmed ? relevant(searchSite(trimmed, RESULT_LIMIT)) : []),
    [trimmed],
  );
  const groups = useMemo(() => orderGroups(results), [results]);
  const total = results.length;

  // The recovery / resting grid — a FRESH random draw per mount, same lazy
  // useState initialiser the home page's random six uses (the React-sanctioned
  // place for a one-time impure draw; Fisher–Yates runs on a COPY so the shared
  // PAINTINGS array is never mutated). Every tile is a real, purchasable work.
  const [recoveryIds] = useState<string[]>(() => {
    const pool = [...PAINTINGS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, RECOVERY_COUNT).map((p) => p.id);
  });
  const recovery: SearchDoc[] = useMemo(
    () =>
      recoveryIds
        .map((id) => PAINTING_BY_ID.get(id))
        .filter((p): p is Painting => Boolean(p))
        .map((p) => {
          const avail = p.colourways.filter((c) => c.available);
          const cover = avail.find((c) => c.isOriginal) ?? avail[0];
          return {
            id: `painting-${p.id}`,
            type: "painting" as const,
            title: p.title,
            url: `/collections/${p.id}`,
            image: cover?.image,
            body: "",
          };
        }),
    [recoveryIds],
  );

  // The count line, announced politely. The file's own header comment promised a
  // result count from the start; the JSX never rendered one, and nothing on the
  // page was announced at all — submitting a query was silent.
  const countLabel =
    total === 0
      ? SEARCH.noMatches
      : `${total} ${total === 1 ? SEARCH.countSingular : SEARCH.countPlural}`;

  // Move focus to the heading after a submit. Committing from the Nav search
  // reveal unmounts the reveal on the route change, so focus fell to
  // document.body and a keyboard/AT user was dropped at the top of the document
  // with no context. Skipped on the very first render so a cold page load or a
  // shared link doesn't yank focus out of the browser chrome.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [trimmed]);

  // On-site search results — noindex (avoid thin/duplicate SERP-in-SERP pages).
  // Deliberately useNoindexHead and NOT <Seo>: this applies robots noindex with a
  // query-stripped canonical, which is correct. /search is not prerendered, so
  // public/robots.txt also carries `Disallow: /search` for non-JS crawlers.
  usePageTitle(trimmed ? `Search — ${trimmed}` : "Search");
  useNoindexHead();

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      {/* `src` is required by the component's signature but IGNORED under
          CALM_BACKDROPS (SceneBackdrop.tsx) — every page still passes its old
          scene path. Dropping the prop needs a change to SceneBackdrop itself,
          which this pass does not own. */}
      <SceneBackdrop src="/img/scenes/search-path-scene-v4.webp" />
      <Nav overlay />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 pt-20 md:pt-24 pb-14 md:pb-20">
        {/* MASTHEAD — the refined estate front cover carrying the query (a
            composed Fraunces display title, never shouty) + the live count. */}
        <header>
          <Reveal as="div">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="m-0 font-display text-ink text-balance text-pretty focus:outline-none"
              style={MASTHEAD_TITLE_STYLE}
            >
              {trimmed ? (
                <>
                  <span className="text-ink-muted">{SEARCH.resultsFor}</span>
                  <br />
                  <span
                    className="break-words italic font-normal"
                    style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}
                  >
                    “{trimmed}”
                  </span>
                </>
              ) : (
                SEARCH.title
              )}
            </h1>
          </Reveal>

          {/* Refine + count. The field is SEEDED from ?q= (it used to be empty on
              any cold load — a shared link, a refresh, the back button — under a
              heading quoting the query straight back at the reader). The width
              steps properly now: it was max-w-[760px] inside a 1500px container,
              stranding ~740px of dead space from 1400px until it doubled abruptly
              at 1700px. */}
          <Reveal
            as="div"
            className="mt-6 md:mt-8 max-w-[760px] xl:max-w-[900px] 2xl:max-w-[1120px] 3xl:max-w-[1500px] 4xl:max-w-[2000px] border-t border-line pt-6 md:pt-8"
          >
            <SearchBar
              variant="page"
              label={SEARCH.landmarkRefine}
              initialQuery={trimmed}
            />
            {/* The announcement. aria-live="polite" so a committed query reports
                its own outcome; only rendered with a query so the resting page
                doesn't announce "No matches" at someone who hasn't asked yet. */}
            <p
              role="status"
              aria-live="polite"
              className={cn(META, "mt-3 md:mt-4 m-0 reading-shadow")}
            >
              {trimmed ? countLabel : ""}
            </p>
          </Reveal>
        </header>

        {/* RESULTS — grouped for readability but ORDERED BY SCORE, so the group
            holding the best answer is always first. */}
        {total > 0 && (
          <div className="mt-8 md:mt-10 flex flex-col gap-10 md:gap-12">
            {groups.map(({ type, items }) => {
              const isArtwork = type === "painting";
              const label = SEARCH_TYPE_LABELS[type] ?? type;
              const basis = tileBasis(items.length);
              return (
                <Reveal as="section" key={type}>
                  <div className="flex items-center gap-4 md:gap-6 border-b border-line pb-3 md:pb-4">
                    {/* Sized UP to ≥24px: accent-on-ground measures ≈3.57:1,
                        which FAILS AA at the token's native 14/15px. EYEBROW is
                        font-semibold (600), not bold, so the 18.66px bold carve-out
                        doesn't apply — 24px is the threshold at which 3:1 is the
                        conforming ratio. It also fills the screen. Plus
                        .reading-shadow, which every caption on the reference pages
                        carries and this page had nowhere. */}
                    <h2
                      className={cn(
                        EYEBROW,
                        "m-0 text-[24px] md:text-[28px] 3xl:text-[34px] 4xl:text-[40px] reading-shadow",
                      )}
                    >
                      {groupHeading(label, items.length)}
                    </h2>
                    <span aria-hidden="true" className="h-px flex-1 bg-ink/15" />
                    <span className={cn(EYEBROW_MUTED, "shrink-0 reading-shadow")}>
                      {items.length}
                    </span>
                  </div>

                  {isArtwork ? (
                    <div className="mt-6 md:mt-8 flex flex-wrap justify-center gap-x-5 md:gap-x-7 gap-y-5 md:gap-y-6">
                      {items.map(({ doc }) => (
                        <ArtworkTile
                          key={doc.id}
                          doc={doc}
                          basis={basis}
                          chosenName={cwChoice[paintingFromDoc(doc)?.id ?? ""]}
                          onChooseColourway={chooseTileCw}
                          fmtP={fmtP}
                        />
                      ))}
                    </div>
                  ) : (
                    <ul className="m-0 mt-4 md:mt-5 list-none p-0">
                      {items.map((result) => (
                        <ResultRow key={result.doc.id} result={result} />
                      ))}
                    </ul>
                  )}
                </Reveal>
              );
            })}
          </div>
        )}

        {/* RECOVERY / RESTING — real, purchasable work under a plain functional
            label, on zero results AND on a bare /search. This replaces two
            paragraphs and three text links that left `main` at 708px in a 1080px
            viewport, and left a buyer whose query missed with nowhere to go. */}
        {total === 0 && (
          <Reveal as="section" className="mt-8 md:mt-10">
            <div className="flex items-center gap-4 md:gap-6 border-b border-line pb-3 md:pb-4">
              <h2
                className={cn(
                  EYEBROW,
                  "m-0 text-[24px] md:text-[28px] 3xl:text-[34px] 4xl:text-[40px] reading-shadow",
                )}
              >
                {SEARCH.browseHeading}
              </h2>
              <span aria-hidden="true" className="h-px flex-1 bg-ink/15" />
              {/* ⚠️ Deliberately NO count here, unlike a real result group.
                  With one, the zero-result page read "No matches" in muted 15px
                  and then, in identical heading markup, "Paintings  12" — which
                  a customer reasonably takes as twelve results for their query.
                  A count is what makes this block look like an answer; without
                  it, the heading reads as the section label it is. (The count
                  is not merely hidden — the recovery set is a fixed browse
                  sample, so counting it was never meaningful.) */}
            </div>

            <div className="mt-6 md:mt-8 flex flex-wrap justify-center gap-x-5 md:gap-x-7 gap-y-5 md:gap-y-6">
              {recovery.map((doc) => (
                <ArtworkTile
                  key={doc.id}
                  doc={doc}
                  basis={tileBasis(recovery.length)}
                  chosenName={cwChoice[paintingFromDoc(doc)?.id ?? ""]}
                  onChooseColourway={chooseTileCw}
                  fmtP={fmtP}
                />
              ))}
            </div>

            {/* The other doors — tokenised BTN_SECONDARY pills carrying the nav's
                OWN labels. They were bespoke Schibsted Grotesk 700/16px links
                with invented copy ("Ask the estate", "See the collection" —
                singular, with four collections). */}
            <div className="mt-8 md:mt-10 flex flex-wrap gap-3 md:gap-4">
              {SEARCH.links.map((link) => (
                <Link key={link.to} to={link.to} className={BTN_SECONDARY}>
                  {link.label}
                </Link>
              ))}
            </div>
          </Reveal>
        )}
      </main>

      <Footer />
    </div>
  );
};
