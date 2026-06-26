// src/pages/News.tsx — the estate calendar, a Beeper-faithful changelog/feed
// dressed in this brand's dark cinematic register. Named export, lazy-imported
// in App.tsx. Wiring: SECONDARY_LINKS (Nav) + Footer SITE_LINKS + sitemap.xml.
//
// REDESIGN 2026-06-15 (Hugo's no-blank-space law, matched to the just-shipped
// About masthead): the page opens on a BOLD LEFT-ALIGNED MASTHEAD — a meta rule,
// a giant edge-to-edge Fraunces statement (opsz 48, the AboutMasthead recipe),
// and the programme intro packed immediately beneath under a border-t, dense and
// confident over the indigo carpet. NOT a small eyebrow + centred title floating
// in space (the old timid hero, now gone). Section paddings compressed to
// py-9..py-14; the min-h-screen spacer, the pb-28 foot pad and the big mt-16..24
// gaps are killed. The empty state (NEWS is empty by design) is densified into a
// two-column editorial block — programme note beside the live waitlist — so it
// reads as a designed spread, never a lonely paragraph above a lonely panel.
//
// WHAT THIS KEEPS FROM BEEPER (the feed DNA, for when NEWS fills):
//   - BORDERLESS entries separated by whitespace + a single hairline divide
//     (`divide-y divide-line`), NOT a uniform bordered card grid, NO shadows.
//   - A quiet date stamp as a secondary line near the title (human displayDate,
//     with <time dateTime> when isoDate is present — never a relative "3 days ago").
//   - A slim text-style filter/segment row (NEWS_FILTERS) as quiet eyebrow tabs,
//     ONE active state.
//   - A single large featured item at the top (Beeper's hero post) — album-cover
//     energy, never a carousel — restyled as a reverent "next release" spread.
//
// WHAT THIS INVERTS so it is premium, not a generic SaaS changelog:
//   - Titles + group headings are Fraunces (font-display), NOT Beeper's sans.
//     Sans is held to EYEBROW / EYEBROW_TIGHT / META / SUBTITLE only.
//   - Dark #0a0908 / cream ink / rust held to AT MOST three places (featured
//     eyebrow, active filter tab, hover/focus) — never a colour-coded badge wall.
//   - NO emoji category icons, NO version numbers, NO left timeline spine + dots.
//
// Tokens imported from ui/tokens (never re-typed). Reveal wraps WHOLE elements
// only. AssetImage src is .jpg (picture swaps webp).

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Nav } from "../components/Nav";
import { PageMasthead } from "../components/PageMasthead";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { AssetImage } from "../components/AssetImage";
import { Seo } from "../components/Seo";
import { Reveal } from "../components/Reveal";
import { NewsletterSignup } from "../components/NewsletterSignup";
import { asset } from "../lib/asset";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_MUTED, EYEBROW_TIGHT, SUBTITLE, META } from "../components/ui/tokens";
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

/**
 * Fixed full-page backdrop — blurred indigo Persian carpets behind the whole
 * estate calendar (echoes the Persian sacred-geometry tradition). The Collections
 * treatment, simplified for ONE image: a single bg-cover layer at full opacity
 * that drifts ±6% with WHOLE-PAGE scroll (useScroll over the document, no section
 * target), inset-[-8%] overscan so the parallax `y` can never expose an
 * uncovered strip, clipped by the overflow-hidden parent. Reduced-motion drops
 * the parallax entirely and holds the layer static (matches Collections').
 */
const ScrollBackdrop = ({ photoUrl }: { photoUrl: string }) => {
  const reduceMotion = useReducedMotion();
  // No `target` → tracks the viewport's scroll over the whole document, so the
  // single backdrop drifts across the entire page rather than one section.
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);

  // Reduced-motion: drop the parallax, hold the backdrop static, and release the
  // GPU layer (will-change:auto) — no motion means no need for a promoted layer.
  if (reduceMotion) {
    return (
      <div
        style={{
          backgroundImage: `url("${photoUrl}")`,
          willChange: "auto",
        }}
        className="absolute inset-0 bg-cover bg-center"
        aria-hidden="true"
      />
    );
  }

  return (
    <motion.div
      style={{
        y,
        backgroundImage: `url("${photoUrl}")`,
        willChange: "transform",
      }}
      // OVERSCAN the layer 8% beyond every edge so the ±6% parallax `y` shift can
      // NEVER expose an uncovered strip (the black page background) at the top —
      // the same fix Collections carries. The parent is overflow-hidden, so the
      // overscan is clipped.
      className="absolute inset-[-8%] bg-cover bg-center"
      aria-hidden="true"
    />
  );
};

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

// One DENSE editorial feed entry. Borderless (the divide-y between rows does the
// separating work). A left-aligned magazine row: the date is a quiet rail in the
// left column, the body (pill -> Fraunces title -> location -> summary -> CTA)
// fills the right — so each row reads as packed editorial across the measure
// rather than a thin centred stack floating in air. Release rows inset a small
// square cover for album-cover rhythm; text-led announcements / exhibitions /
// workshops / events stay lean (varied, not a uniform card grid).
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
    <article className="group grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-start py-5 md:py-6">
      {/* DATE — human state line as a quiet left rail (top line on mobile). */}
      <p className={cn(EYEBROW_TIGHT, "m-0 md:col-span-3 md:pt-1")}>
        {entry.isoDate ? (
          <time dateTime={entry.isoDate}>{entry.displayDate}</time>
        ) : (
          entry.displayDate
        )}
      </p>

      {/* RELEASE COVER — a left-set square, album energy. Releases only. */}
      <div className="md:col-span-9 flex flex-col sm:flex-row gap-5 md:gap-7 items-start">
        {isRelease(entry) && entry.cover ? (
          <div className="shrink-0 w-[200px] sm:w-[280px] md:w-[340px] 3xl:w-[400px] 4xl:w-[460px] overflow-hidden rounded-lg ring-1 ring-line bg-bg">
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

          <h3 className="mt-3 mb-2 font-display font-semibold tracking-[-0.02em] text-[clamp(22px,2.8vw,40px)] leading-[1.1] text-ink text-balance transition-colors duration-300 group-hover:text-accent">
            {entry.title}
          </h3>

          {entry.location ? (
            <p className={cn(EYEBROW_MUTED, "m-0 mb-2 tracking-[0.22em]")}>{entry.location}</p>
          ) : null}

          <p className={cn(META, "m-0 max-w-[58ch] 3xl:max-w-[68ch] text-[clamp(14.5px,0.9vw,18px)]")}>{entry.summary}</p>

          {cta}
        </div>
      </div>
    </article>
  );
};

// ─── NewsMasthead ────────────────────────────────────────────────────────────
// The front cover — now built on the shared, refined <PageMasthead> (the
// blue-chip-gallery recipe: Fraunces opsz 144 / wght 560, composed clamp, NOT
// the old crude 700/opsz-48 logo the owner flagged as "way too bold and
// unprofessional"). A meta rule (eyebrow · hairline · house tag), then a
// confident-but-composed title with ONE italic word at regular weight (the
// auction-house "title of a work" signal), then the programme note packed
// beneath under a border-t. The verbatim Seo/description copy is unchanged; this
// is page-framing microcopy only (the page owns its own headings).
const NewsMasthead = () => (
  <PageMasthead
    className="relative pt-8 md:pt-10 pb-7 md:pb-9"
    eyebrow="The estate calendar"
    meta="The Mandala Company"
    title={
      <>
        News &amp; <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>releases</em>
      </>
    }
  >
    <div className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-5 items-start border-t border-line pt-5 md:pt-6">
      <Reveal as="div" className="lg:col-span-3">
        <p
          className={cn(EYEBROW_MUTED, "m-0 leading-[1.8]")}
          style={{ textShadow: "0 1px 10px rgba(0,0,0,0.7)" }}
        >
          Collections &amp; singles · exhibitions · workshops · events
        </p>
      </Reveal>
      <Reveal as="div" delay={0.06} className="lg:col-span-9">
        <p
          className="font-display font-normal tracking-[-0.01em] text-ink m-0"
          style={{
            fontVariationSettings: '"opsz" 32, "wght" 400',
            fontSize: "clamp(20px, 2.2vw, 38px)",
            lineHeight: 1.34,
            textShadow: "0 2px 14px rgba(0,0,0,0.7)",
          }}
        >
          What is coming from the estate — new prints released like albums and singles,
          exhibitions, the return of Steve's workshop, and gatherings hosted by The Mandala
          Company.
        </p>
      </Reveal>
    </div>
  </PageMasthead>
);

export const News = () => {
  const [active, setActive] = useState<NewsType | "all">("all");
  const filtered = useMemo(
    () => (active === "all" ? NEWS : NEWS.filter((e) => e.type === active)),
    [active],
  );
  const featured = useMemo(() => getFeaturedEntry(NEWS), []); // hero always from full set
  // Only hide the featured entry from the feed when it will ACTUALLY render as
  // the hero (a release WITH a cover — the same gate the hero JSX uses below).
  // Otherwise a non-cover "next" entry was excluded from the feed yet never
  // shown as a hero, so it vanished from the page entirely (audit).
  const heroId =
    featured && isRelease(featured) && featured.cover ? featured.id : undefined;
  const groups = useMemo(
    () => groupByStatus(filtered, heroId),
    [filtered, heroId],
  );
  // Until the family adds real entries to src/data/news.ts, the page shows a
  // dignified, CENTRED "being prepared" state — never invented releases/dates.
  // ALL feed JSX (featured hero + filter tabs + status groups) is gated on this
  // so the Beeper-faithful layout sits dormant and ready.
  const hasNews = NEWS.length > 0;

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-x-hidden">
      {/* FIXED BACKDROP LAYER — one blurred indigo Persian-carpet scene drifting
          ±6% with whole-page scroll (Collections' treatment, single image). */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <ScrollBackdrop photoUrl={asset("/img/scenes/news-rainbow-mountain-blur-v2.webp")} />
        {/* Shared scrim — the EXACT gradient Collections uses so the cream copy
            stays legible while the carpet reads as a subdued, moody texture. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,7,6,0.50) 0%, rgba(8,7,6,0.66) 45%, rgba(8,7,6,0.82) 100%)",
          }}
        />
      </div>
      <Seo
        title="News"
        description="Up-and-coming releases, exhibitions, workshops and events from the estate of Stephen Meakin — The Mandala Company."
        url="/news"
      />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] 4xl:max-w-[2000px] px-4 sm:px-6 md:px-8 lg:px-12 3xl:px-16 pb-12 md:pb-16">
        {/* MASTHEAD — bold left-aligned front cover (replaces the old timid
            centred eyebrow + title + subtitle floating in space). */}
        <NewsMasthead />

        {/* EMPTY STATE — no fabricated content. NEWS is empty by design, so the
            live page is a DENSE two-column editorial spread: the programme note
            packed left, the live waitlist beside it right — never a lonely
            paragraph stacked above a lonely panel. Everything here is announced
            only once it is confirmed; never an invented release/date/venue. */}
        {!hasNews ? (
          <section className="border-t border-line pt-6 md:pt-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8 items-start">
              {/* The programme note — estate voice, set as a designed lead, NOT a
                  thin centred ribbon. */}
              <Reveal as="div" className="lg:col-span-5">
                <p className={cn(EYEBROW, "m-0 mb-5")} style={{ textShadow: "0 1px 10px rgba(0,0,0,0.7)" }}>
                  Being prepared
                </p>
                <p
                  className="font-display font-normal tracking-[-0.01em] text-ink m-0 text-pretty"
                  style={{
                    fontVariationSettings: '"opsz" 36, "wght" 400',
                    fontSize: "clamp(24px, 2.6vw, 48px)",
                    lineHeight: 1.28,
                    textShadow: "0 2px 14px rgba(0,0,0,0.7)",
                  }}
                >
                  The estate calendar is being prepared. Everything here is announced
                  only once it is confirmed — each release a limited, numbered edition,
                  quiet and small.
                </p>
                {/* Programme spine — a quiet ledger so the column reads dense, not
                    half-empty. Page framing microcopy (no sourced content). */}
                <ul className="list-none p-0 m-0 mt-6 md:mt-8">
                  {[
                    ["Collections & singles", "Prints released like albums"],
                    ["Exhibitions", "Where the work goes on view"],
                    ["Workshops", "The return of Steve's classes"],
                    ["Events", "Gatherings hosted by the estate"],
                  ].map(([label, note]) => (
                    <li key={label} className="border-t border-line py-3.5">
                      <p className={cn(EYEBROW_TIGHT, "m-0 mb-1 text-ink")}>{label}</p>
                      <p className={cn(META, "m-0")}>{note}</p>
                    </li>
                  ))}
                </ul>
              </Reveal>

              {/* WAITLIST — the primary action while NEWS is empty. Reuses the
                  NewsletterSignup panel (POSTs to /api/newsletter-subscribe). The
                  framing is provenance, not hype: early access to each new edition,
                  never countdowns or "SALE". Sits beside the note, not below it. */}
              <Reveal as="div" delay={0.06} className="lg:col-span-7 lg:sticky lg:top-28">
                <NewsletterSignup
                  variant="panel"
                  eyebrow="Join the waitlist"
                  title="Be first to know about the next release."
                  intro="When the next edition is released, those on the waitlist hear first — an early window before the allocation is taken. Leave your name and we'll write before each collection, single, exhibition or workshop, and never more often than that."
                />
              </Reveal>
            </div>
          </section>
        ) : null}

        {/* FEATURED NEXT-EDITION HERO — one item, never a carousel. A BOLD
            asymmetric spread: the rose-mandala cover is the dominant focal point,
            filling the LARGER column edge-to-edge (no max-width cap); the ONE rust
            eyebrow + Fraunces title + summary + inline Friends & Family hook pack
            the SMALLER column. Reads as a designed feature, not a tall centred
            stack — the cover leads the page. */}
        {hasNews && featured && isRelease(featured) && featured.cover ? (
          <Reveal
            as="section"
            delay={0.05}
            className="border-t border-line pt-6 md:pt-8 mb-8 md:mb-10"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 items-center">
              {/* ROSE-MANDALA COVER — the large focal point. col-6 keeps it big
                  and square (mandalas read best square) while staying balanced
                  with the text beside it (the col-7 square towered and forced the
                  text column to stretch). */}
              <div className="md:col-span-6 w-full overflow-hidden rounded-xl ring-1 ring-line bg-bg">
                <AssetImage
                  src={featured.cover}
                  alt={featured.title}
                  className="block aspect-square w-full object-cover"
                />
              </div>
              <div className="md:col-span-6">
                <p className={cn(EYEBROW, "m-0 mb-4")}>
                  {pillLabel(featured)} · {featured.displayDate}
                </p>
                <h2
                  className="font-display tracking-[-0.025em] text-[clamp(30px,3.8vw,66px)] leading-[1.02] text-ink text-balance m-0 hero-text-shadow"
                  style={{ fontVariationSettings: '"opsz" 96, "wght" 560' }}
                >
                  {featured.title}
                </h2>
                <p className={cn(SUBTITLE, "mt-5 md:mt-6 mb-0")}>{featured.summary}</p>
                {/* A single quiet CTA to the Friends & Family sign-up at the foot
                    (#notify) — the full form lives there, so the hero stays clean
                    (no crammed/oversized inline form beside the artwork). */}
                <a
                  href="#notify"
                  className="mt-7 md:mt-8 inline-flex items-center gap-2 font-sans text-[11px] font-bold tracking-[0.28em] uppercase text-ink-muted hover:text-accent transition-colors duration-300"
                >
                  Be the first to know
                  <span aria-hidden="true" className="text-accent">→</span>
                </a>
              </div>
            </div>
          </Reveal>
        ) : null}

        {hasNews && (
          <>
            {/* TYPE-FILTER TABS — Beeper's tabs restyled as quiet eyebrow pills,
                left-aligned to the masthead; rust marks only the active tab. */}
            <Reveal
              as="div"
              delay={0.08}
              className="mb-6 md:mb-8 flex flex-wrap items-center gap-2.5 border-b border-line pb-6"
            >
              <div role="group" aria-label="Filter news by type" className="flex flex-wrap gap-2.5">
                {NEWS_FILTERS.map((f) => {
                  const on = active === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={on}
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

            {/* THE FEED — one calm reading column (no left timeline spine). Status
                groups carry a hairline rule above a left-aligned Fraunces heading
                (matching the masthead); the season-note sits inline beside it.
                Entries are borderless, separated by whitespace + a hairline divide. */}
            <div className="w-full">
              {groups.map((group, gi) => (
                <section
                  key={group.status}
                  aria-label={group.heading}
                  className={cn(gi > 0 && "mt-6 md:mt-8")}
                >
                  <Reveal
                    as="div"
                    delay={Math.min(gi * 0.05, 0.2)}
                    className="flex items-baseline gap-4 flex-wrap border-t border-line pt-5 md:pt-6"
                  >
                    <h2 className="font-display font-semibold tracking-[-0.03em] text-[clamp(28px,3.6vw,60px)] leading-[1.0] text-ink m-0">
                      {group.heading}
                    </h2>
                    <p className={cn(EYEBROW_MUTED, "m-0 hidden sm:block")}>{group.note}</p>
                  </Reveal>
                  <div className="mt-5 md:mt-6 divide-y divide-line">
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

        {/* FOOT — the Friends & Family panel is the #notify target for every CTA.
            Shown only once NEWS has entries; the entry CTAs and the featured hero
            both scroll here. While the feed is empty the waitlist in the
            empty-state above is the single, leading capture (no duplicate panel). */}
        {hasNews ? (
          <Reveal as="section" delay={0.05} className="mt-6 md:mt-8 scroll-mt-28 border-t border-line pt-6 md:pt-8">
            <div id="notify">
              <NewsletterSignup
                variant="panel"
                eyebrow="Friends & Family"
                title="Be the first to know."
                intro="Releases are quiet and limited. Leave your name and we'll write to you before each collection, single, exhibition or workshop — and never more often than that."
              />
            </div>
          </Reveal>
        ) : null}
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};