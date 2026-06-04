// src/pages/News.tsx — the estate calendar, a Beeper-style changelog SPINE
// dressed in this brand's dark cinematic register. Named export, lazy-imported
// in App.tsx. Wiring: SECONDARY_LINKS (Nav) + Footer SITE_LINKS + sitemap.xml.
//
// Structure (consensus winner + grafts):
//   - One calm reading column with a visible hairline timeline spine + a quiet
//     ink-muted node dot that warms to rust ONLY on hover (the one decorative
//     motif, kept a whisper).
//   - A single oversized featured NEXT-DROP hero (album-cover energy, never a
//     carousel) with the one rust eyebrow on the page + an inline Friends &
//     Family hook.
//   - Type-filter tab row (Beeper's tabs, restyled as eyebrow pills; rust only
//     on the active tab) with role="tablist" semantics + an aria-live count.
//   - Status groups (Coming next / On the horizon / Recently) with Fraunces
//     headings over hairline rules + a quiet muted sub-note.
//   - Rows VARY: releases inset a small square cover (album energy); text-led
//     announcements / exhibitions / workshops / events stay lean (rhythm, not a
//     uniform card grid).
//   - The Friends & Family panel at the foot is the #notify target for every CTA.
//
// Tokens imported from ui/tokens (never re-typed). Reveal wraps WHOLE elements
// only. AssetImage src is .jpg (picture swaps webp). Rust held to three places:
// the featured eyebrow, the active filter tab, and hover/focus.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { AssetImage } from "../components/AssetImage";
import { Seo } from "../components/Seo";
import { Reveal } from "../components/Reveal";
import { NewsletterSignup } from "../components/NewsletterSignup";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_MUTED, EYEBROW_TIGHT, TITLE, SUBTITLE, META } from "../components/ui/tokens";
import {
  NEWS,
  NEWS_FILTERS,
  getFeaturedEntry,
  groupByStatus,
  pillLabel,
  isRelease,
  type NewsEntry,
  type NewsType,
} from "../data/news";

// Quiet type pill — the EYEBROW_TIGHT recipe inside a rounded-full hairline
// chip. ink-muted at rest; warms to accent ring + text on the row's group-hover.
const TypePill = ({ entry }: { entry: NewsEntry }) => (
  <span
    className={cn(
      EYEBROW_TIGHT,
      "inline-flex items-center rounded-full ring-1 ring-line px-3 py-1 transition-colors duration-300 group-hover:ring-accent group-hover:text-accent",
    )}
  >
    {pillLabel(entry)}
  </span>
);

// One feed row hanging off the spine: a node dot + left date-rail + entry body.
// Release rows inset a small square cover; text-led rows stay lean (rhythm, not
// a uniform card grid).
const EntryRow = ({ entry }: { entry: NewsEntry }) => {
  const ctaClass = cn(
    EYEBROW_TIGHT,
    "mt-3 inline-flex items-center gap-1.5 transition-colors duration-300 hover:text-accent",
  );
  // In-page #notify anchors use a native <a> so the browser scrolls to the
  // sign-up on the same route; real routes use the router <Link>.
  const cta =
    entry.ctaLabel && entry.ctaTo ? (
      entry.ctaTo.startsWith("#") ? (
        <a href={entry.ctaTo} className={ctaClass}>
          {entry.ctaLabel}
          <span aria-hidden="true">→</span>
        </a>
      ) : (
        <Link to={entry.ctaTo} className={ctaClass}>
          {entry.ctaLabel}
          <span aria-hidden="true">→</span>
        </Link>
      )
    ) : null;

  return (
    <article className="group relative grid grid-cols-1 md:grid-cols-[180px_1fr] gap-y-3 md:gap-x-10 py-8 md:py-10">
      {/* Spine node — a whisper of a dot on the rail; warms to rust on hover. */}
      <span
        aria-hidden="true"
        className="hidden md:block absolute -left-[37px] top-[3.1rem] h-2 w-2 rounded-full bg-ink-muted ring-4 ring-bg transition-colors duration-300 group-hover:bg-accent"
      />

      {/* LEFT DATE-RAIL — human state line; collapses ABOVE content on mobile. */}
      <p className={cn(EYEBROW_TIGHT, "m-0 md:pt-[0.6rem]")}>
        {entry.isoDate ? (
          <time dateTime={entry.isoDate}>{entry.displayDate}</time>
        ) : (
          entry.displayDate
        )}
      </p>

      {/* RIGHT — entry body. min-w-0 so long titles never overflow the track. */}
      <div className="min-w-0 flex items-start gap-5 md:gap-6">
        {isRelease(entry) && entry.cover ? (
          <div className="shrink-0 w-[88px] sm:w-[108px] md:w-[132px] overflow-hidden rounded-lg ring-1 ring-line bg-bg">
            <AssetImage
              src={entry.cover}
              alt={entry.title}
              loading="lazy"
              decoding="async"
              className="block aspect-square w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </div>
        ) : null}

        <div className="min-w-0">
          <TypePill entry={entry} />
          <h3 className="mt-3 mb-2 font-display font-semibold tracking-[-0.02em] text-[clamp(20px,2.4vw,28px)] leading-[1.15] text-ink text-balance transition-colors duration-300 group-hover:text-accent">
            {entry.title}
          </h3>
          {entry.location ? (
            <p className={cn(META, "m-0 mb-2")}>{entry.location}</p>
          ) : null}
          <p className={cn(META, "m-0 max-w-[58ch] text-[14.5px]")}>{entry.summary}</p>
          {cta}
        </div>
      </div>
    </article>
  );
};

export const News = () => {
  const [active, setActive] = useState<NewsType | "all">("all");
  const filtered = useMemo(
    () => (active === "all" ? NEWS : NEWS.filter((e) => e.type === active)),
    [active],
  );
  const featured = useMemo(() => getFeaturedEntry(NEWS), []); // hero always from full set
  const groups = useMemo(
    () => groupByStatus(filtered, active === "all" ? featured?.id : undefined),
    [filtered, featured, active],
  );
  // Until the family adds real entries to src/data/news.ts, the page shows a
  // dignified "being prepared" state — never invented releases/dates.
  const hasNews = NEWS.length > 0;

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      <AmbientBackdrop opacity={0.45} />
      <Seo
        title="News"
        description="Up-and-coming releases, exhibitions, workshops and events from the estate of Stephen Meakin — The Mandala Company."
        url="/news"
      />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[1840px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-16 pb-20 md:pb-28">
        {/* HEADER — left-aligned dispatch register, not a centred landing band. */}
        <Reveal as="header" className="max-w-[760px] mb-9 md:mb-12">
          <p className={cn(EYEBROW, "m-0 mb-5")}>The estate calendar</p>
          <h1 className={cn(TITLE, "my-0 mb-6")}>News &amp; releases.</h1>
          <p className={cn(SUBTITLE, "my-0")}>
            What is coming from the estate — new prints released like albums and singles,
            exhibitions, the return of Steve's workshop, and gatherings hosted by The Mandala
            Company.
          </p>
        </Reveal>

        {/* EMPTY STATE — no fabricated content. Shown until real entries are
            added to src/data/news.ts. */}
        {!hasNews ? (
          <Reveal as="div" className="max-w-[680px] border-t border-line pt-10 md:pt-12">
            <p className="font-sans font-normal text-[17px] md:text-[18px] leading-[1.8] text-ink-muted m-0">
              The estate calendar is being prepared. New collections and singles,
              exhibitions, the return of Steve's mandala workshop and gatherings hosted
              by The Mandala Company will be announced here as they are confirmed. Leave
              your name below and we'll write the moment there's something to share.
            </p>
          </Reveal>
        ) : null}

        {/* FEATURED NEXT-DROP HERO — one item, never a carousel. The ONE rust
            eyebrow on the page; an inline Friends & Family hook beneath. */}
        {hasNews && featured && isRelease(featured) && featured.cover ? (
          <Reveal
            as="section"
            delay={0.05}
            className="mb-14 md:mb-20 grid grid-cols-1 lg:grid-cols-[minmax(0,460px)_1fr] gap-8 lg:gap-12 items-center"
          >
            <div className="overflow-hidden rounded-xl ring-1 ring-line bg-bg">
              <AssetImage
                src={featured.cover}
                alt={featured.title}
                className="block aspect-square w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className={cn(EYEBROW, "m-0 mb-4")}>
                {pillLabel(featured)} · {featured.displayDate}
              </p>
              <h2 className="font-display font-semibold tracking-[-0.035em] text-[clamp(36px,5.4vw,72px)] leading-[0.98] text-ink text-balance m-0 mb-5 hero-text-shadow">
                {featured.title}
              </h2>
              <p className={cn(SUBTITLE, "my-0")}>{featured.summary}</p>
              {/* The "be the first to know" hook — inline variant takes only
                  eyebrow + intro (title is ignored on the inline variant). */}
              <NewsletterSignup
                variant="inline"
                eyebrow="Be the first to know"
                intro="Leave your name and we'll write the moment this edition is released."
              />
            </div>
          </Reveal>
        ) : null}

        {hasNews && (
        <>
        {/* TYPE-FILTER TABS — Beeper's tabs restyled as eyebrow pills; rust = active. */}
        <Reveal
          as="div"
          delay={0.08}
          className="mb-10 md:mb-12 flex flex-wrap items-center gap-2.5 border-b border-line pb-6"
        >
          <div role="tablist" aria-label="Filter news by type" className="flex flex-wrap gap-2.5">
            {NEWS_FILTERS.map((f) => {
              const on = active === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setActive(f.id)}
                  className={cn(
                    EYEBROW_TIGHT,
                    "rounded-full ring-1 px-4 py-2 transition-colors duration-300",
                    on ? "ring-accent text-accent" : "ring-line hover:ring-ink/40 hover:text-ink",
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <span aria-live="polite" className="sr-only">
            {groups.reduce((n, g) => n + g.entries.length, 0)} entries shown
          </span>
        </Reveal>

        {/* THE SPINE — one calm reading column; hairline timeline + status groups. */}
        <div className="relative md:pl-12">
          {/* The timeline spine. */}
          <span
            aria-hidden="true"
            className="hidden md:block absolute left-[5px] top-2 bottom-2 w-px bg-line"
          />
          {groups.map((group, gi) => (
            <section
              key={group.status}
              aria-label={group.heading}
              className={cn(gi > 0 && "mt-10 md:mt-14")}
            >
              <Reveal
                as="div"
                delay={Math.min(gi * 0.05, 0.2)}
                className="flex items-baseline justify-between gap-4 border-t border-line pt-6 md:pt-7"
              >
                <h2 className="font-display font-semibold tracking-[-0.03em] text-[clamp(24px,3vw,40px)] leading-[1.04] text-ink m-0">
                  {group.heading}
                </h2>
                <p className={cn(EYEBROW_MUTED, "m-0 hidden sm:block text-right shrink-0")}>
                  {group.note}
                </p>
              </Reveal>
              <div className="divide-y divide-line">
                {group.entries.map((entry, i) => (
                  <Reveal key={entry.id} as="div" delay={Math.min(i * 0.04, 0.2)}>
                    <EntryRow entry={entry} />
                  </Reveal>
                ))}
              </div>
            </section>
          ))}
        </div>
        </>
        )}

        {/* FOOT — the Friends & Family panel is the #notify target for every CTA. */}
        <Reveal as="section" delay={0.05} className="mt-16 md:mt-24 scroll-mt-28">
          <div id="notify">
            <NewsletterSignup
              variant="panel"
              eyebrow="Friends & Family"
              title="Be the first to know."
              intro="Releases are quiet and limited. Leave your name and we'll write to you before each collection, single, exhibition or workshop — and never more often than that."
            />
          </div>
        </Reveal>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
