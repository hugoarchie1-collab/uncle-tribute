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

import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { SceneReveal } from "../components/SceneReveal";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { AssetImage } from "../components/AssetImage";
import { Seo } from "../components/Seo";
import { Reveal } from "../components/Reveal";
import { NewsletterSignup } from "../components/NewsletterSignup";
import { asset } from "../lib/asset";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_MUTED, EYEBROW_TIGHT, SUBTITLE, META, MASTHEAD_TITLE_STYLE } from "../components/ui/tokens";
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
 * Fixed full-page backdrop — a blurred rainbow-mountain scene behind the whole
 * estate calendar. A single STATIC bg-cover layer at full opacity. (The old
 * scroll-parallax + inset-[-8%] overscan jumped to a stale scroll position on
 * route transitions, reading as a zoom+jump — so it's a plain static image now.)
 */
const ScrollBackdrop = ({ photoUrl }: { photoUrl: string }) => (
  <div
    style={{
      backgroundImage: `url("${photoUrl}")`,
      willChange: "auto",
    }}
    className="absolute inset-0 bg-cover bg-center"
    aria-hidden="true"
  />
);

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
    "mt-2.5 inline-flex items-center gap-1.5 rounded-sm transition-colors duration-300 outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
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
    <article className="group grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-8 items-start py-3.5 md:py-4">
      {/* DATE — human state line as a quiet left rail (top line on mobile). */}
      <p className={cn(EYEBROW_TIGHT, "m-0 md:col-span-3 md:pt-1")}>
        {entry.isoDate ? (
          <time dateTime={entry.isoDate}>{entry.displayDate}</time>
        ) : (
          entry.displayDate
        )}
      </p>

      {/* RELEASE COVER — a left-set square, album energy. Releases only. */}
      <div className="md:col-span-9 flex flex-col sm:flex-row gap-4 md:gap-6 items-start">
        {isRelease(entry) && entry.cover ? (
          <div className="shrink-0 w-full sm:w-[220px] md:w-[260px] 3xl:w-[300px] 4xl:w-[340px] overflow-hidden rounded-lg ring-1 ring-line bg-bg">
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

          <h3 className="mt-2 mb-1.5 font-display font-bold [font-variation-settings:'opsz'_48,'wght'_700] tracking-[-0.04em] text-[clamp(22px,2.4vw,34px)] leading-[1.08] text-ink text-balance transition-colors duration-300 group-hover:text-accent">
            {entry.title}
          </h3>

          {entry.location ? (
            <p className={cn(EYEBROW_MUTED, "m-0 mb-1.5")}>{entry.location}</p>
          ) : null}

          <p className={cn(META, "m-0 max-w-[72ch] 3xl:max-w-[84ch]")}>{entry.summary}</p>

          {cta}
        </div>
      </div>
    </article>
  );
};

// ─── NewsMasthead ────────────────────────────────────────────────────────────
// The front cover — a CENTRED front cover on the same single page axis as the
// feed below (the FAQ/Memories recipe): a full-width meta rule (hairline ·
// eyebrow · house tag · count · hairline), the shared MASTHEAD_TITLE_STYLE cut
// with ONE regular-weight italic word (the auction-house "title of a work"
// signal), then the programme note packed immediately beneath under a border-t.
// CENTRED — not the old left-aligned split that stranded a half-empty eyebrow
// column beside a wide prose block. The verbatim Seo/description copy is
// unchanged; this is page-framing microcopy only (the page owns its headings).
const NewsMasthead = () => (
  <section className="relative pt-8 md:pt-10 pb-6 md:pb-8">
    <div className="mx-auto w-full max-w-[1180px] 2xl:max-w-[1320px] 3xl:max-w-[1460px] text-center">
      <Reveal as="div">
        <h1
          className="font-display text-ink m-0 text-balance"
          style={{
            ...MASTHEAD_TITLE_STYLE,
            fontSynthesis: "none",
            textShadow: "0 3px 28px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.55)",
          }}
        >
          News &amp; <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>releases</em>
        </h1>
      </Reveal>

      <div className="mt-4 md:mt-5 border-t border-line pt-4 md:pt-5">
        <Reveal as="div">
          <p
            className={cn(EYEBROW_MUTED, "m-0 leading-[1.8]")}
            style={{ textShadow: "0 1px 10px rgba(0,0,0,0.7)" }}
          >
            Collections &amp; singles · exhibitions · workshops · pop-up events
          </p>
        </Reveal>
        <Reveal as="div" delay={0.06} className="mt-4 md:mt-5 mx-auto max-w-[68ch] 3xl:max-w-[76ch]">
          <p
            className="font-display font-normal tracking-[-0.01em] text-ink m-0"
            style={{
              fontVariationSettings: '"opsz" 32, "wght" 400',
              fontSize: "clamp(20px, 2vw, 34px)",
              lineHeight: 1.3,
              textShadow: "0 2px 14px rgba(0,0,0,0.7)",
            }}
          >
            What is coming from the estate — new prints released like albums and singles,
            exhibitions, the return of Steve's workshop, and gatherings hosted by The Mandala
            Company.
          </p>
        </Reveal>
      </div>
    </div>
  </section>
);

/**
 * FEATURED HERO GALLERY — a swipeable set of the upcoming release covers (Hugo:
 * "add both paintings as a swipe option"). CSS scroll-snap only (no Lenis/GSAP —
 * gotcha #1): native horizontal swipe on touch, prev/next arrows + dots on
 * desktop. Each square carries a small caption chip naming its painting so the
 * two coming pieces read clearly. Falls back to a single static image when only
 * one cover exists. Reduced-motion is fine — scroll-snap needs no JS animation.
 */
type GallerySlide = { cover: string; entry: NewsEntry };
const FeaturedGallery = ({
  slides,
  onIndexChange,
}: {
  slides: GallerySlide[];
  /** Reports the active slide up so the hero TEXT (title/summary) can follow the
   *  swipe — otherwise the words stayed on slide 0 while the cover moved. */
  onIndexChange?: (i: number) => void;
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const setActive = (i: number) => {
    setIndex(i);
    onIndexChange?.(i);
  };
  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(slides.length - 1, i));
    setActive(clamped); // update text immediately on arrow/dot click
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== index) setActive(i);
  };

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-xl ring-1 ring-line bg-bg">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ touchAction: "pan-y pinch-zoom" }}
        >
          {slides.map((s) => (
            <figure key={s.cover} className="relative m-0 w-full shrink-0 snap-center">
              <AssetImage
                src={s.cover}
                alt={s.entry.title}
                className="block aspect-square w-full object-cover"
              />
              {/* Caption chip — names the piece so swiping between the two
                  upcoming works is unambiguous. */}
              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10">
                <span className={cn(EYEBROW, "m-0 text-ink")}>{s.entry.title}</span>
              </figcaption>
            </figure>
          ))}

          {/* Prev / next — desktop affordance; touch users just swipe. Hidden when
              a single slide. */}
        </div>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous painting"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="press absolute left-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-bg/80 ring-1 ring-line h-10 w-10 text-ink transition-opacity duration-200 hover:bg-bg disabled:opacity-0 md:inline-flex"
            >
              <span aria-hidden="true" className="text-[20px] leading-none">‹</span>
            </button>
            <button
              type="button"
              aria-label="Next painting"
              onClick={() => goTo(index + 1)}
              disabled={index === slides.length - 1}
              className="press absolute right-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-bg/80 ring-1 ring-line h-10 w-10 text-ink transition-opacity duration-200 hover:bg-bg disabled:opacity-0 md:inline-flex"
            >
              <span aria-hidden="true" className="text-[20px] leading-none">›</span>
            </button>
          </>
        )}
      </div>

      {/* Dots — the swipe indicator; also clickable. */}
      {slides.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2.5">
          {slides.map((s, i) => (
            <button
              key={s.cover}
              type="button"
              aria-label={`Show ${s.entry.title}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={cn(
                "h-2.5 w-2.5 rounded-full outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                i === index ? "bg-accent" : "bg-ink/30 hover:bg-ink/55",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

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
  // The hero only belongs on views where the featured (release) entry actually
  // fits the active filter — otherwise a release hero floats above an empty
  // "nothing under this filter" feed (audit). "All" + "Releases" show it; the
  // other tabs (exhibitions / workshops / events) correctly hide it.
  const heroVisible = !!(
    featured &&
    isRelease(featured) &&
    featured.cover &&
    (active === "all" || featured.type === active)
  );
  const heroId = heroVisible && featured ? featured.id : undefined;
  // Hero swipe gallery — the featured release cover FIRST, then every other
  // upcoming ("next"/"soon") release cover, deduped. Gives the hero its "swipe
  // between both paintings" set without inventing anything (data-driven).
  const heroSlides = useMemo<GallerySlide[]>(() => {
    if (!heroId) return [];
    const upcoming = NEWS.filter(
      (e) => isRelease(e) && e.cover && (e.status === "next" || e.status === "soon"),
    );
    const ordered = [
      ...upcoming.filter((e) => e.id === heroId),
      ...upcoming.filter((e) => e.id !== heroId),
    ];
    const seen = new Set<string>();
    const slides: GallerySlide[] = [];
    for (const e of ordered) {
      if (e.cover && !seen.has(e.cover)) {
        seen.add(e.cover);
        slides.push({ cover: e.cover, entry: e });
      }
    }
    return slides;
  }, [heroId]);
  // Which hero slide is on screen — drives the hero TEXT so the title/summary
  // ALWAYS match the cover you swiped to (was frozen on the featured entry).
  const [heroIndex, setHeroIndex] = useState(0);
  const activeHero = heroSlides[heroIndex]?.entry ?? featured;
  // Show EVERY entry in its status section (Hugo: "all paintings arent in section
  // for all"). Previously the featured entry was HIDDEN from the feed (only in the
  // hero swipe), so a painting vanished from its section. Now nothing is hidden —
  // the hero swipe is a highlight ABOVE the full, complete feed.
  // ONE "Coming soon" section, not two (Hugo: the "Coming next" vs "On the
  // horizon" split "makes no sense and looks ugly"). Merge next + soon into a
  // single upcoming group; keep "recent" separate if it ever fills. Worded to
  // reflect that this is an early selection of Stephen's work, more to come.
  const groups = useMemo(() => {
    const raw = groupByStatus(filtered, undefined);
    const coming = raw
      .filter((g) => g.status === "next" || g.status === "soon")
      .flatMap((g) => g.entries);
    const recent = raw.find((g) => g.status === "recent");
    const merged: ReturnType<typeof groupByStatus> = [];
    if (coming.length) {
      merged.push({
        status: "next",
        heading: "Coming soon",
        note: "New editions in preparation",
        entries: coming,
      });
    }
    if (recent && recent.entries.length) merged.push(recent);
    return merged;
  }, [filtered]);
  // Until the family adds real entries to src/data/news.ts, the page shows a
  // dignified, CENTRED "being prepared" state — never invented releases/dates.
  // ALL feed JSX (featured hero + filter tabs + status groups) is gated on this
  // so the Beeper-faithful layout sits dormant and ready.
  const hasNews = NEWS.length > 0;

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-x-clip">
      {/* FIXED BACKDROP LAYER — one blurred rainbow-mountain scene drifting
          ±6% with whole-page scroll (Collections' treatment, single image). */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <ScrollBackdrop photoUrl={asset("/img/scenes/news-scene-v3.webp")} />
        {/* Shared scrim — the EXACT gradient Collections uses so the cream copy
            stays legible while the scene reads as a subdued, moody texture. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,7,6,0.42) 0%, rgba(8,7,6,0.56) 45%, rgba(8,7,6,0.70) 100%)",
          }}
        />
        {/* Cursor-clarity reveal — the scene brightens/clears where the pointer
            is, the same affordance as the home/About backdrop. */}
        <SceneReveal photoUrl={asset("/img/scenes/news-scene-v3.webp")} />
      </div>
      <Seo
        title="News"
        description="Up-and-coming releases, exhibitions, workshops and events from the estate of Stephen Meakin — The Mandala Company."
        url="/news"
      />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] 4xl:max-w-[2000px] px-4 sm:px-6 md:px-8 lg:px-12 3xl:px-16 pb-10 md:pb-14">
        {/* MASTHEAD — CENTRED front cover on the page's single axis (the
            FAQ/Memories recipe). Replaces the old left-aligned split that
            stranded a half-empty eyebrow column beside the prose block. */}
        <NewsMasthead />

        {/* EMPTY STATE — no fabricated content. NEWS is empty by design, so the
            live page is a DENSE two-column editorial spread: the programme note
            packed left, the live waitlist beside it right — never a lonely
            paragraph stacked above a lonely panel. Everything here is announced
            only once it is confirmed; never an invented release/date/venue. */}
        {!hasNews ? (
          <section className="border-t border-line pt-6 md:pt-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 xl:gap-x-16 gap-y-8 items-stretch">
              {/* The programme note — estate voice, set as a designed lead that
                  fills its half of the spread (NOT a thin half-empty column). */}
              <Reveal as="div" className="lg:col-span-6 flex flex-col">
                <h2 className={cn(EYEBROW, "m-0 mb-3.5")} style={{ textShadow: "0 1px 10px rgba(0,0,0,0.7)" }}>
                  Being prepared
                </h2>
                <p
                  className="font-display font-normal tracking-[-0.01em] text-ink m-0 text-pretty"
                  style={{
                    fontVariationSettings: '"opsz" 32, "wght" 400',
                    fontSize: "clamp(20px, 2vw, 34px)",
                    lineHeight: 1.3,
                    textShadow: "0 2px 14px rgba(0,0,0,0.7)",
                  }}
                >
                  The estate calendar is being prepared. Everything here is announced
                  only once it is confirmed — each release a limited, numbered edition,
                  quiet and small.
                </p>
                {/* Programme spine — a quiet ledger laid out two-up so the column
                    fills its width and height densely, never a thin stack with a
                    half-empty void beside the panel. Page framing microcopy. */}
                <ul className="list-none p-0 m-0 mt-5 md:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-10 border-t border-line">
                  {[
                    ["Collections & singles", "Prints released like albums"],
                    ["Exhibitions", "Where the work goes on view"],
                    ["Workshops", "The return of Steve's classes"],
                    ["Pop-up events", "Gatherings hosted by the estate"],
                  ].map(([label, note]) => (
                    <li key={label} className="border-b border-line py-2.5">
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
              <Reveal as="div" delay={0.06} className="lg:col-span-6 lg:self-start lg:sticky lg:top-28">
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

        {/* FEATURED NEXT-EDITION HERO — one item, never a carousel. A CENTRED,
            axis-true feature: the status eyebrow ("Coming soon") sits as a centred
            header on a shared top axis, the section heading beneath it, and the
            rose-mandala cover + its text sit in a balanced two-column spread
            CENTRED in the measure (mx-auto, capped) and vertically centred to each
            other — so the eyebrow leads cleanly and the card reads as a composed,
            on-axis feature, never a single card floating off-centre below the
            label. The previous build buried the eyebrow inside an asymmetric text
            column, which read as the card drifting below a stray COMING SOON tag. */}
        {hasNews && heroVisible ? (
          <Reveal
            as="section"
            delay={0.05}
            className="border-t border-line pt-6 md:pt-8 mb-8 md:mb-10"
          >
            {/* CENTRED HEADER — the status eyebrow + section heading on a shared
                top axis, so the whole feature hangs from one centred spine. */}
            <div className="text-center">
              <p className={cn(EYEBROW, "m-0")}>{activeHero.displayDate}</p>
              <h2
                className="mt-2 font-display font-bold tracking-[-0.03em] text-[clamp(22px,2.8vw,40px)] leading-[1.05] text-ink m-0"
                style={{ fontVariationSettings: '"opsz" 40, "wght" 700' }}
              >
                The next release
              </h2>
            </div>

            {/* BALANCED CARD — cover + text, CENTRED in the measure and aligned to
                each other's vertical centre. Both halves share one mx-auto frame so
                the composition sits dead-centre on the page axis. */}
            <div className="mt-5 md:mt-6 mx-auto w-full max-w-[1180px] 2xl:max-w-[1320px] 3xl:max-w-[1440px] grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 lg:gap-14 items-center">
              {/* SWIPEABLE COVER GALLERY — the upcoming release paintings, square
                  (mandalas read best square), swipe/dots to move between them. */}
              <div className="md:col-span-6 w-full">
                <FeaturedGallery slides={heroSlides} onIndexChange={setHeroIndex} />
              </div>
              {/* TEXT — centred on mobile (matching the header axis), settling to
                  left-aligned beside the cover on md+ so the long-form summary reads
                  on a clean measure rather than ragged-centred. */}
              <div className="md:col-span-6 text-center md:text-left">
                <p className={cn(EYEBROW_MUTED, "m-0 mb-3")}>
                  {pillLabel(activeHero)}
                </p>
                {/* The release title is the DOMINANT element (Hugo: "bigger
                    than rest as it's a title") — set well above "The next
                    release" label so the hierarchy reads label → title. */}
                <h3
                  className="font-display font-bold tracking-[-0.04em] text-[clamp(38px,4.8vw,74px)] leading-[1.0] text-ink text-balance m-0 hero-text-shadow"
                  style={{ fontVariationSettings: '"opsz" 48, "wght" 700' }}
                >
                  {activeHero.title}
                </h3>
                <p className={cn(SUBTITLE, "mt-4 md:mt-5 mb-0 mx-auto md:mx-0 max-w-[60ch] 3xl:max-w-[68ch]")}>
                  {activeHero.summary}
                </p>
                {/* A single quiet CTA to the Friends & Family sign-up at the foot
                    (#notify) — the full form lives there, so the hero stays clean
                    (no crammed/oversized inline form beside the artwork). */}
                <a
                  href="#notify"
                  className="mt-4 md:mt-5 inline-flex items-center gap-2 rounded-sm font-sans text-[15px] font-bold tracking-[0.04em] text-ink-muted outline-none transition-colors duration-300 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
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
              className="mb-6 md:mb-8 flex flex-wrap items-center gap-2.5 border-b border-line pb-3.5"
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
                        "rounded-full ring-1 px-4 py-2 min-h-[44px] transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        on ? "ring-accent text-accent" : "ring-line hover:ring-ink/40 hover:text-ink",
                      )}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
              <span aria-live="polite" className="sr-only">
                {(() => {
                  const n = groups.reduce((sum, g) => sum + g.entries.length, 0);
                  return n === 1 ? "1 entry shown" : `${n} entries shown`;
                })()}
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
                  className={cn(gi > 0 && "mt-8 md:mt-10")}
                >
                  <Reveal
                    as="div"
                    delay={Math.min(gi * 0.05, 0.2)}
                    className="flex items-baseline gap-4 flex-wrap border-t border-line pt-4 md:pt-5"
                  >
                    <h2 className="font-display font-bold [font-variation-settings:'opsz'_48,'wght'_700] tracking-[-0.04em] text-[clamp(26px,3.2vw,52px)] leading-[1.0] text-ink m-0">
                      {group.heading}
                    </h2>
                    <p className={cn(EYEBROW_MUTED, "m-0 hidden sm:block")}>{group.note}</p>
                  </Reveal>
                  <div className="mt-3.5 md:mt-4 divide-y divide-line">
                    {group.entries.map((entry, i) => (
                      <Reveal key={entry.id} as="div" delay={Math.min(i * 0.04, 0.2)}>
                        <EntryRow entry={entry} />
                      </Reveal>
                    ))}
                  </div>
                </section>
              ))}
              {groups.length === 0 && (
                <p className={cn(META, "m-0 py-8 text-ink-muted")}>
                  Nothing under this filter just yet — check back soon, or join
                  the waitlist below.
                </p>
              )}
            </div>
          </>
        )}

        {/* FOOT — the Friends & Family panel is the #notify target for every CTA.
            Shown only once NEWS has entries; the entry CTAs and the featured hero
            both scroll here. While the feed is empty the waitlist in the
            empty-state above is the single, leading capture (no duplicate panel). */}
        {hasNews ? (
          <Reveal as="section" delay={0.05} className="mt-8 md:mt-10 scroll-mt-28 border-t border-line pt-6 md:pt-8">
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