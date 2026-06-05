// src/pages/News.tsx — the estate calendar, a Beeper-faithful changelog/feed
// dressed in this brand's dark cinematic register, CENTRED throughout (Hugo).
// Named export, lazy-imported in App.tsx. Wiring: SECONDARY_LINKS (Nav) +
// Footer SITE_LINKS + sitemap.xml.
//
// WHAT THIS BORROWS FROM BEEPER (the DNA worth keeping):
//   - ONE narrow reading column (~760px), but CENTRED as a column AND centred
//     within — header furniture, featured hero, feed and sign-up all sit on a
//     single vertical centreline (Hugo: "centred like the other pages").
//   - BORDERLESS entries separated by whitespace + a single hairline divide
//     (`divide-y divide-line`), NOT a uniform bordered card grid, NO shadows.
//   - A quiet date stamp as a secondary line near the title (human displayDate,
//     with <time dateTime> when isoDate is present — never a relative "3 days ago").
//   - A slim text-style filter/segment row (NEWS_FILTERS) as quiet eyebrow tabs,
//     ONE active state, centred.
//   - A single large featured item at the top (Beeper's hero post) — album-cover
//     energy, never a carousel — restyled as a centred, reverent "next release".
//   - Generous vertical rhythm so scanning feels effortless and calm.
//
// WHAT THIS INVERTS so it is premium, not a generic SaaS changelog:
//   - Titles + group headings are Fraunces (font-display), NOT Beeper's sans.
//     Sans is held to EYEBROW / EYEBROW_TIGHT / META / SUBTITLE only.
//   - Dark #0a0908 / cream ink / rust held to AT MOST three places (featured
//     eyebrow, active filter tab, hover/focus) — never a colour-coded badge wall.
//   - NO emoji category icons, NO version numbers, NO left timeline spine + dots
//     (a left rail fights "centred" and reads as a generic dev-changelog).
//
// Tokens imported from ui/tokens (never re-typed). Reveal wraps WHOLE elements
// only. AssetImage src is .jpg (picture swaps webp).

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
// chip (the one tasteful nod to Beeper's chip vocabulary). ink-muted at rest;
// warms to an accent ring + text on the row's group-hover. Centred above the
// title via its wrapper.
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

// One CENTRED feed entry. Borderless (the divide-y between rows does the
// separating work) with a centred stack: date eyebrow -> optional square cover
// (releases only, album energy) -> type pill -> Fraunces title -> location ->
// summary -> CTA. Release rows inset a small square cover for rhythm; text-led
// announcements / exhibitions / workshops / events stay lean (varied, not a
// uniform card grid).
const EntryRow = ({ entry }: { entry: NewsEntry }) => {
  const ctaClass = cn(
    EYEBROW_TIGHT,
    "mt-4 inline-flex items-center gap-1.5 transition-colors duration-300 hover:text-accent",
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
    <article className="group flex flex-col items-center text-center py-8 md:py-10">
      {/* DATE — human state line as a centred eyebrow above the title. */}
      <p className={cn(EYEBROW_TIGHT, "m-0 mb-4")}>
        {entry.isoDate ? (
          <time dateTime={entry.isoDate}>{entry.displayDate}</time>
        ) : (
          entry.displayDate
        )}
      </p>

      {/* RELEASE COVER — a centred square, album energy. Releases only. */}
      {isRelease(entry) && entry.cover ? (
        <div className="mb-6 w-[132px] sm:w-[156px] md:w-[180px] overflow-hidden rounded-lg ring-1 ring-line bg-bg">
          <AssetImage
            src={entry.cover}
            alt={entry.title}
            loading="lazy"
            decoding="async"
            className="block aspect-square w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        </div>
      ) : null}

      <TypePill entry={entry} />

      <h3 className="mt-4 mb-2 max-w-[20ch] mx-auto font-display font-semibold tracking-[-0.02em] text-[clamp(20px,2.4vw,28px)] leading-[1.15] text-ink text-balance transition-colors duration-300 group-hover:text-accent">
        {entry.title}
      </h3>

      {entry.location ? (
        <p className={cn(EYEBROW_MUTED, "m-0 mb-2 tracking-[0.22em]")}>{entry.location}</p>
      ) : null}

      <p className={cn(META, "m-0 mx-auto max-w-[58ch] text-[14.5px]")}>{entry.summary}</p>

      {cta}
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
  // dignified, CENTRED "being prepared" state — never invented releases/dates.
  // ALL feed JSX (featured hero + filter tabs + status groups) is gated on this
  // so the Beeper-faithful layout sits dormant and ready.
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
        {/* HEADER — centred, matching the other pages (Hugo). */}
        <Reveal as="header" className="max-w-[760px] mx-auto text-center mb-9 md:mb-12">
          <p className={cn(EYEBROW, "m-0 mb-5")}>The estate calendar</p>
          <h1 className={cn(TITLE, "mx-auto my-0 mb-6")}>News &amp; releases.</h1>
          <p className={cn(SUBTITLE, "mx-auto my-0")}>
            What is coming from the estate — new prints released like albums and singles,
            exhibitions, the return of Steve's workshop, and gatherings hosted by The Mandala
            Company.
          </p>
        </Reveal>

        {/* EMPTY STATE — no fabricated content. The live page today: a centred,
            dignified "being prepared" line. Shown until real entries are added
            to src/data/news.ts. */}
        {!hasNews ? (
          <Reveal as="div" className="max-w-[640px] mx-auto text-center">
            <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.8] text-ink-muted m-0">
              The estate calendar is being prepared. New collections and singles,
              exhibitions, the return of Steve's mandala workshop and gatherings hosted
              by The Mandala Company will be announced here as they are confirmed. Leave
              your name below and we'll write the moment there's something to share.
            </p>
          </Reveal>
        ) : null}

        {/* FEATURED NEXT-DROP HERO — one item, never a carousel. A centred,
            reverent stack: cover above, then the ONE rust eyebrow on the page,
            the Fraunces title, the summary, and an inline Friends & Family hook. */}
        {hasNews && featured && isRelease(featured) && featured.cover ? (
          <Reveal
            as="section"
            delay={0.05}
            className="mb-14 md:mb-20 mx-auto w-full max-w-[760px] flex flex-col items-center text-center"
          >
            <div className="mb-8 w-full max-w-[460px] overflow-hidden rounded-xl ring-1 ring-line bg-bg">
              <AssetImage
                src={featured.cover}
                alt={featured.title}
                className="block aspect-square w-full object-cover"
              />
            </div>
            <p className={cn(EYEBROW, "m-0 mb-4")}>
              {pillLabel(featured)} · {featured.displayDate}
            </p>
            <h2 className="font-display font-semibold tracking-[-0.035em] text-[clamp(36px,5.4vw,72px)] leading-[0.98] text-ink text-balance m-0 mb-5 hero-text-shadow">
              {featured.title}
            </h2>
            <p className={cn(SUBTITLE, "mx-auto my-0")}>{featured.summary}</p>
            {/* The "be the first to know" hook — inline variant takes only
                eyebrow + intro (title is ignored on the inline variant). */}
            <NewsletterSignup
              variant="inline"
              eyebrow="Be the first to know"
              intro="Leave your name and we'll write the moment this edition is released."
            />
          </Reveal>
        ) : null}

        {hasNews && (
          <>
            {/* TYPE-FILTER TABS — Beeper's tabs restyled as quiet eyebrow pills,
                CENTRED; rust marks only the active tab. */}
            <Reveal
              as="div"
              delay={0.08}
              className="mb-12 md:mb-14 flex flex-wrap items-center justify-center gap-2.5 border-b border-line pb-6"
            >
              <div role="tablist" aria-label="Filter news by type" className="flex flex-wrap justify-center gap-2.5">
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

            {/* THE FEED — one calm, CENTRED reading column (no left timeline
                spine). Status groups carry a hairline rule above a centred
                Fraunces heading; entries are borderless, separated by whitespace
                + a single hairline divide. */}
            <div className="mx-auto w-full max-w-[760px]">
              {groups.map((group, gi) => (
                <section
                  key={group.status}
                  aria-label={group.heading}
                  className={cn(gi > 0 && "mt-12 md:mt-16")}
                >
                  <Reveal
                    as="div"
                    delay={Math.min(gi * 0.05, 0.2)}
                    className="text-center border-t border-line pt-8 md:pt-10"
                  >
                    <h2 className="font-display font-semibold tracking-[-0.03em] text-[clamp(24px,3vw,40px)] leading-[1.04] text-ink m-0">
                      {group.heading}
                    </h2>
                    <p className={cn(EYEBROW_MUTED, "m-0 mt-3 hidden sm:block")}>{group.note}</p>
                  </Reveal>
                  <div className="mt-2 divide-y divide-line">
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
          <div id="notify" className="flex justify-center">
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