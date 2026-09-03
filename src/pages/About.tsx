import { type CSSProperties, type ReactNode } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { ImageReveal } from "../components/ImageReveal";
import { LoopFilm } from "../components/LoopFilm";
import { AssetImage } from "../components/AssetImage";
import { MagneticLink } from "../components/MagneticLink";
import { Seo } from "../components/Seo";
import {
  ABOUT,
  BIRTH_DATE,
  CREDENTIALS,
  DEATH_DATE,
  INTERVIEW,
  LIFE_DATES,
} from "../data/content";
import { cn } from "../lib/cn";
import { EYEBROW_MUTED, EYEBROW_TIGHT, SUBTITLE } from "../components/ui/tokens";

// =============================================================================
// ABOUT — REBUILT 2026-09-02 AS A CLONE OF THE HOME PAGE (Welcome.tsx).
//
// Hugo: "I want this to be a clone of the home page in all its rules … the
// proportions are all off … it has to be better than home visually and
// symmetrically." So this page no longer owns a design system of its own. The
// old page ran its OWN seven-role type ladder (ABOUT_* tokens, 22→48px prose),
// its OWN width ladder, its OWN section rhythm, left-aligned CSS-column prose,
// natural-aspect justified photo rows with drop shadows, and a masthead whose
// portrait floated beside a short paragraph with a void above and below it.
// None of that survives. EVERY module below is a byte-for-byte copy of a Home
// module's classes, with Stephen's verbatim biography poured in:
//
//   Home module                      → About section
//   ─────────────────────────────────────────────────────────────────────────
//   §1 hero (title + WHOLE photo)     → the front cover (28-at-the-drafting-table)
//   §2 "A reminder" essay            → the opening passage (lede · body · pull)
//   §3 Meet Stephen two-column       → "As he described himself" · Exhibitions
//   §4 full-bleed cinematic band     → the exhibition room · the gathering
//   §5 featured PrintTile grid       → six paintings (the buy path)
//   §6 ritual island + ledger        → Art as ritual + the facts ledger
//   §7 hairline four-traditions      → the four traditions · the credentials
//   Arista capped archive photo      → cymatics chart · the Az-Zarqa photograph
//   featured-grid tile treatment     → every family / studio photo row
//
// THE RULES THIS PAGE INHERITS (all Hugo's, all already baked into Home):
//   • ONE container + ONE reading measure (CONTAINER / MEASURE below) so every
//     block shares the same left + right edge down the page — no jigsaw.
//   • ONE vertical rhythm: <main> carries space-y; sections carry NO padding.
//   • Body prose is CENTRED + JUSTIFIED at ~20px (BODY_P) — never a narrow
//     ribbon, never left-aligned columns, never large ragged centred text.
//   • Section header = centred EYEBROW → TITLE, ending in a full stop.
//   • Photo BESIDE text = the photo COVER-FILLS its column to the text's exact
//     height (items-stretch + absolute inset-0 object-cover) — text and image
//     start and END on the same line, zero void (Hugo's screenshot #2).
//   • Photo rows = UNIFORM tiles, ONE aspect per row, same-orientation only,
//     hairline ring, face-safe object-position (every position below was set
//     from a photo-by-photo audit of where the faces sit — do not "centre" them).
//   • Feature photos are shown WHOLE (hero, flyer, cymatics, the Az-Zarqa
//     children, the cairn) — never cover-cropped.
//   • NO black boxes: legibility is text-shadow only (hero-text-shadow /
//     reading-shadow / the 12px body halo), never a scrim.
//   • NO invented words. Every visible string is a verbatim substring of
//     content.ts, a factual label that already existed on this page (chapter
//     kickers + place·year tags, "As he described himself —", "From the design
//     archive", the Virgin Islands caption, the cymatics caption), or a label
//     already live elsewhere on the site ("See the collection", "Leave a
//     memory", "Six paintings from a lifetime at the compass.").
//   • Background = the site-wide AmbientBackground mesh (App root). The
//     PavoBackdrop this page used to mount has been flag-gated to `null` since
//     the calm pass, so it is simply gone here — same ground as Home.
// =============================================================================

// =============================================================================
// THE TYPE LADDER (rebuilt 2026-09-03 — Hugo: the page "looks so messy and not
// clean and professional… what an apple.com or nike.com would have", 0/10).
//
// ⚠️ THE DEFECT WAS NEVER "THE TEXT IS BIG". It was that the page had EIGHTEEN
// display-scale moments (≥60px at 1440), and FOUR different roles all landed in
// a 60–72px band — the h1's italic subordinate (72), the chapter close (68), the
// opening lede (64) and every section title (63). A 12px spread cannot carry
// hierarchy, so at scroll speed they read as one undifferentiated shout. Worse,
// the ladder RE-ORDERED ITSELF across widths: TITLE (116px cap) overtook the
// pull-quote (104px cap) at 2364px, so on a 4K display a chapter label was
// louder than the best line on the page.
//
// THE RULES NOW, and they are the whole design:
//   1. FOUR display moments on the entire page — one PAGE_TITLE and three
//      PULLs — each at least ~1.5 viewport heights from the next. Everything
//      else is a section title or smaller. (Apple/Zwirner run one display
//      moment per screen; this page ran five in the first two.)
//   2. The ladder is MONOTONIC AT EVERY WIDTH. Every role's slope is set so the
//      rank order at 390px is the rank order at 3840px. Never add a role that
//      lands inside another's band, and never give one a higher cap than the
//      role above it.
//   3. Italic marks the INTERVIEWER's questions, and nothing else in body
//      flow. (A work's title still takes <i> — "‘The Mystic Rose’" — which is
//      a citation convention, not a display register.)
//   4. ONE rust mark at rest: the final pull's full stop. Every eyebrow on the
//      page is muted ink. Accent otherwise belongs only to hover/focus, as it
//      does site-wide.
//   5. RHYTHM is the unit for the seams this pass introduced (GAP_1/2/4).
//      ⚠️ It is NOT yet universal — roughly twenty older `mt-[calc(var(--rhythm)*2)]`-style
//      pairs survive from the previous build. Converting them is worth doing;
//      until then, do not describe the page as being on one rhythm.
//
// THE LADDER, MEASURED (not estimated) at 1440:
//   title 107 · pull 66 · section 46 · side-head 35 · lead 30 · body 23 ·
//   caption 14 · eyebrow 14
// The DISPLAY and PROSE roles hold that order from 1024px to 3840px. ⚠️ The
// quietest roles (side prose, ledger value, caption, eyebrow) do cross each
// other between 1440 and 3840 by a point or two — they are all within a few
// pixels and read as one "small" register, but the order is not guaranteed
// there. Do not add a new role in that band without re-measuring.
// =============================================================================

/** ROLE 1 — PAGE TITLE. The h1, once. */
const PAGE_TITLE_STYLE: CSSProperties = {
  fontVariationSettings: '"opsz" 48, "wght" 700',
  fontWeight: 700,
  fontSize: "clamp(46px, 7.4vw, 176px)",
  lineHeight: 0.94,
  letterSpacing: "-0.035em",
};
/** ROLE 2 — PULL. Three per page, one tier each (never a two-tier stack). */
const PULL_STYLE: CSSProperties = {
  fontVariationSettings: '"opsz" 48, "wght" 600',
  fontWeight: 600,
  fontSize: "clamp(34px, 4.6vw, 112px)",
  lineHeight: 1.04,
  letterSpacing: "-0.028em",
};
/** ROLE 3 — SECTION TITLE. Every chapter head and section head. */
const SECTION_TITLE =
  "font-display font-semibold text-[clamp(28px,3.2vw,60px)] leading-[1.08] tracking-[-0.018em] text-ink text-balance";
/** ROLE 4 — LEAD. A section's opening line; the demoted former display tiers. */
// ⚠️ The slope is set so LEAD always OUTRANKS BODY. The first cut of this
// token was clamp(21px,0.667vw+11.4px,44px), which computes to 21px at 1440
// against a 23px body — the lead rendered SMALLER than the paragraph under it,
// which is the same rank inversion this whole rebuild exists to remove. Now:
// 390→22 · 1440→30 · 1920→36 · 2560→43 · body is 20/23/26/30. Always above.
const LEAD_P =
  "font-sans font-normal text-[clamp(22px,1.2vw+12.7px,40px)] leading-[1.42] tracking-[-0.005em] text-ink/90 m-0 text-pretty";
/** ROLE 6 — CAPTION / meta. */
const CAPTION_P =
  "font-sans font-normal text-[clamp(14px,0.333vw+9.2px,23px)] leading-[1.45] tracking-[0.01em] text-ink-muted";

/** THE ONE VERTICAL UNIT. Space is 1× / 2× / 4× of this and nothing else. */
const RHYTHM = "[--rhythm:clamp(17px,1.2vw,26px)]";
const GAP_1 = "mt-[var(--rhythm)]";
const GAP_2 = "mt-[calc(var(--rhythm)*2)]";
const GAP_4 = "mt-[calc(var(--rhythm)*4)]";

// ─── HOME'S LAYOUT CANON (copied verbatim from Welcome.tsx) ──────────────────
/** Home's section container. */
const CONTAINER =
  "mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[2360px] 4xl:max-w-[3300px] px-4 sm:px-6 md:px-8 lg:px-12";
/** Home's ONE wide near-edge reading measure. */
const MEASURE = "mx-auto max-w-[1280px] 2xl:max-w-[1520px] 3xl:max-w-[1780px] 4xl:max-w-[2040px]";
/** Home's body paragraph: ~20px sans, justified, last line centred, hyphenated. */
const BODY_P =
  "font-sans font-normal text-[clamp(20px,0.7vw+13px,30px)] leading-[1.5] text-ink-soft m-0 mb-[var(--rhythm)] last:mb-0 text-pretty text-justify [text-align-last:center] hyphens-auto";
const BODY_SHADOW: CSSProperties = { textShadow: "0 1px 12px rgba(10,9,8,0.45)" };
/** Home's two-column copy paragraph (Meet Stephen / ritual). */
const SIDE_P = cn(
  SUBTITLE,
  "reading-shadow m-0 text-left 2xl:text-[22px] 3xl:text-[27px] 4xl:text-[32px] 3xl:leading-[1.6]",
);
/** Home's two-column small heading (Meet Stephen). */
const SIDE_H2 =
  "font-display font-semibold tracking-[-0.02em] text-[clamp(28px,2.4vw,44px)] 3xl:text-[clamp(44px,2.5vw,60px)] 4xl:text-[clamp(56px,2.4vw,74px)] leading-[1.14] text-ink text-balance hero-text-shadow m-0";
const OPSZ40: CSSProperties = { fontVariationSettings: '"opsz" 40, "wght" 600' };
/** Home's full-bleed cinematic band height ladder. */
const BAND_H =
  "relative w-full overflow-hidden h-[clamp(300px,44svh,440px)] md:h-[clamp(400px,62svh,760px)] 2xl:h-[clamp(440px,62svh,860px)] 3xl:h-[clamp(480px,60svh,960px)] 4xl:h-[clamp(520px,58svh,1040px)]";
/** Home's tile grid gaps. */
const TILE_GRID = "grid gap-x-5 gap-y-6 md:gap-x-6 md:gap-y-7";
/** Home's filled + outlined CTA pills (hero). */
const PILL_PRIMARY =
  "press group inline-flex w-fit items-center bg-ink text-bg px-7 py-3.5 font-sans text-[14px] font-bold tracking-[0.02em] rounded-full transition-colors duration-300 hover:bg-accent hover:text-ink whitespace-nowrap";
const PILL_SECONDARY =
  "press inline-flex w-fit items-center justify-center text-ink border border-[rgba(237,230,214,0.35)] px-7 py-3.5 font-sans text-[14px] font-bold tracking-[0.02em] rounded-full transition-colors duration-300 hover:border-accent hover:text-accent whitespace-nowrap";
/** Home's ledger row (the material spec strip). */
const LEDGER_ROW = "m-0 flex items-baseline justify-between gap-6 py-2.5 3xl:py-3.5 border-t border-line";
const LEDGER_VALUE =
  "text-right font-sans font-normal text-[15px] md:text-[16px] 3xl:text-[20px] 4xl:text-[24px] leading-[1.4] text-ink";
/** Home's capped-archive-photo caption (Arista). */
const CAPTION = "font-sans text-[13px] md:text-[14px] font-bold tracking-[0.02em] text-ink/80 mt-4 text-center";

// ─── paragraphize / BodyProse ─────────────────────────────────────────────────
// Split a VERBATIM string into readable paragraphs on sentence boundaries so a
// long single string reads as an essay, never one endless wall. Every
// character renders exactly once, in order — no word is changed or dropped.
//
// ⚠️ A sentence boundary REQUIRES whitespace after the stop AND a capital,
// quote or digit starting the next sentence. The old pattern allowed `\s*`
// (zero spaces), so it broke inside a DECIMAL: "In 2016, his 3.6-metre Arista
// SunStar…" rendered as a paragraph ending "his 3." followed by one opening
// "6-metre Arista SunStar was commissioned…" — live on the page, in the
// estate's own account of its biggest commission. Verified against all 55
// long strings in content.ts: 7 split better, 0 lose a character.
const paragraphize = (text: string, per = 3): string[] => {
  const cuts: number[] = [];
  const boundary = /[.!?]+["'”’)\]]*\s+/g;
  // The match object itself is never read — the loop advances on the regex's
  // own `lastIndex`, so capturing it would be an unused binding.
  while (boundary.exec(text)) {
    const next = text[boundary.lastIndex];
    if (!next) break;
    if (!/[A-Z“‘"'(0-9]/.test(next)) continue;
    cuts.push(boundary.lastIndex);
  }
  const sentences: string[] = [];
  let start = 0;
  for (const cut of cuts) {
    sentences.push(text.slice(start, cut));
    start = cut;
  }
  if (start < text.length) sentences.push(text.slice(start));
  if (sentences.length <= per) return [text];
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += per) {
    out.push(sentences.slice(i, i + per).join("").trim());
  }
  return out.filter(Boolean);
};

/** Home's centred-justified essay body (the "A reminder" paragraphs). */
const BodyProse = ({ text, per = 3 }: { text: string; per?: number }) => (
  <>
    {paragraphize(text, per).map((para) => (
      <p key={para.slice(0, 32)} lang="en-GB" className={BODY_P} style={BODY_SHADOW}>
        {para}
      </p>
    ))}
  </>
);

/** Home's two-column copy paragraphs (SUBTITLE register, left-aligned). */
const SideProse = ({ text, per = 3 }: { text: string; per?: number }) => (
  <>
    {paragraphize(text, per).map((para) => (
      <p key={para.slice(0, 32)} className={SIDE_P}>
        {para}
      </p>
    ))}
  </>
);

// ─── SectionHead — Home's centred eyebrow → TITLE header ─────────────────────
const SectionHead = ({
  eyebrow,
  title,
  className = "mb-[var(--rhythm)]",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  className?: string;
}) => (
  // ⚠️ SECTION_TITLE, not the shared TITLE token: TITLE's clamp ceiling (116px)
  // overtook the pull-quote's (104px) at 2364px, so on a 4K display a chapter
  // label outranked the best line on the page. And the eyebrow is MUTED, not
  // rust — fourteen accent kickers left the accent meaning nothing.
  <Reveal as="div" className={cn("text-center", className)}>
    {eyebrow && <p className={cn(EYEBROW_MUTED, "m-0 mb-[var(--rhythm)]")}>{eyebrow}</p>}
    <h2 className={cn(SECTION_TITLE, MEASURE, "my-0 hero-text-shadow")}>
      {title}
      <span aria-hidden className="inline-block w-0 -mr-[0.24em]" />
    </h2>
  </Reveal>
);

// ─── CHAPTERS — the page's editorial signature ("the rule and the year") ─────
// Every kicker + tag is a FACTUAL label established in content.ts (place, year,
// the school's name) — these existed on the page before this rebuild and were
// kept through Hugo's 2026-06-27 purge of invented titles. Numerals derive from
// array INDEX so reordering renumbers the page.
const CHAPTERS = [
  { id: "beginnings", kicker: "Beginnings", tag: "Staffordshire · 1966" },
  { id: "bournemouth", kicker: "Bournemouth", tag: "1990" },
  { id: "wandering", kicker: "Years abroad", tag: "France · Ibiza · Mexico · The Virgin Islands" },
  { id: "return", kicker: "Return & the first mandala", tag: "Brighton · 1996 – 2002" },
  { id: "ritual", kicker: "Art as ritual", tag: "In his own words" },
  { id: "lewes", kicker: "Four traditions", tag: "Lewes · Phoenix Place" },
  { id: "exhibitions", kicker: "Exhibitions & commissions", tag: "Dubai · London · Brighton" },
  { id: "academy", kicker: "The Academy", tag: "Phoenix Place, Lewes · 2010" },
  { id: "azzarqa", kicker: "Az-Zarqa School", tag: "Jordan" },
] as const;
type ChapterId = (typeof CHAPTERS)[number]["id"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"] as const;
const chapter = (id: ChapterId) => {
  const index = CHAPTERS.findIndex((c) => c.id === id);
  const c = CHAPTERS[index];
  return { eyebrow: `Chapter ${ROMAN[index]} · ${c.tag}`, title: `${c.kicker}.` };
};
const ChapterHead = ({ id, className }: { id: ChapterId; className?: string }) => {
  const c = chapter(id);
  return <SectionHead eyebrow={c.eyebrow} title={c.title} className={className} />;
};

// ─── Tile — Home's featured-grid tile treatment for a photograph ─────────────
// Uniform aspect per row, hairline ring, gentle hover zoom, object-cover with a
// FACE-SAFE object-position (set per photo from the audit — never "center" by
// default). A row mixes NO orientations: landscapes with landscapes at 3:2 /
// 16:9 / 4:3, portraits with portraits at 4:5.
const Tile = ({
  src,
  alt,
  aspect,
  position = "center",
  sizes,
}: {
  src: string;
  alt: string;
  aspect: string;
  position?: string;
  sizes: string;
}) => (
  <figure className="m-0 min-w-0 group">
    <div className={cn("relative overflow-hidden bg-ink/5 ring-1 ring-line transition-all duration-500 group-hover:ring-accent/50", aspect)}>
      <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]">
        <AssetImage
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          sizes={sizes}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: position }}
        />
      </div>
    </div>
  </figure>
);

/** A uniform tile row — 2-up or 3-up, one shared aspect. */
const TileRow = ({
  cols,
  className,
  children,
}: {
  cols: 2 | 3;
  className?: string;
  children: ReactNode;
}) => (
  <Reveal
    as="div"
    className={cn(
      TILE_GRID,
      cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2",
      className,
    )}
  >
    {children}
  </Reveal>
);

// ─── WholeRow — two photographs of DIFFERENT orientation, both shown WHOLE ────
// The one place a row may mix a portrait with a landscape: each keeps its true
// aspect and its column grows in proportion, so both land at the SAME height
// and together fill the measure edge-to-edge — no crop (a face is never cut),
// no letterbox, no side void. Used only where a crop would cut people out
// (the Az-Zarqa children; the gallery full-length).
const WholeRow = ({
  photos,
}: {
  photos: { src: string; alt: string; width: number; height: number; sizes: string }[];
}) => (
  <Reveal as="div" className="flex flex-col sm:flex-row gap-5 md:gap-6 items-stretch">
    {photos.map((p) => (
      <figure
        key={p.src}
        className="m-0 min-w-0 w-full sm:w-auto overflow-hidden ring-1 ring-line"
        style={{ flexGrow: p.width / p.height, flexBasis: 0 }}
      >
        <AssetImage
          src={p.src}
          alt={p.alt}
          width={p.width}
          height={p.height}
          loading="lazy"
          decoding="async"
          sizes={p.sizes}
          className="block w-full h-auto"
        />
      </figure>
    ))}
  </Reveal>
);

// ─── Band — Home's full-bleed cinematic band (edge-to-edge, ~62svh) ──────────
// The crop is inherent to a full-width landscape band; objectPosition keeps the
// subject in the visible slice (set per photo from the audit).
const Band = ({ src, alt, position }: { src: string; alt: string; position: string }) => (
  <Reveal as="figure" className="mt-0 mb-0 mr-0 w-screen ml-[calc(50%-50vw)]">
    <div className={BAND_H}>
      <ImageReveal
        src={src}
        alt={alt}
        fill
        edges="none"
        parallax={0}
        zoom={1}
        objectPosition={position}
        shadow=""
        sizes="100vw"
        className="h-full"
      />
    </div>
  </Reveal>
);

// ─── SideBySide — Home's Meet-Stephen module ─────────────────────────────────
// Portrait LEFT, cover-filled to the copy's EXACT height (items-stretch +
// absolute inset-0 object-cover) so the two columns start AND end on the same
// line — the "so clean" module in Hugo's screenshot. Copy sits top-aligned
// beside it as ONE cohesive block: eyebrow → small heading → paragraphs.
// Mobile shows the WHOLE portrait, sized down + centred, stacked above.
// ⚠️ The two-column split starts at lg (1024), NOT md (768) as on Home. The
// portrait column is Home's `clamp(400px,34vw,540px)`, and 34vw at 768px is
// 261px — under the 400px floor — so at tablet the photo claimed 400 of the
// 704px content box and left the copy a ~256px ribbon: the heading broke over
// EIGHT lines and the body ran ~30 characters wide. Home survives that because
// its copy beside the portrait is two short paragraphs; About's is a heading
// plus four. So 768–1023 keeps the stacked treatment (whole portrait, sized
// down, centred) and the two columns engage at 1024, where the copy still gets
// ~460px. Verified at 768 / 1024 / 1440 / 1920.
const SideBySide = ({
  src,
  alt,
  position,
  sizes = "(min-width:1024px) 34vw, 64vw",
  children,
}: {
  src: string;
  alt: string;
  position: string;
  sizes?: string;
  children: ReactNode;
}) => (
  <Reveal
    as="div"
    className="grid grid-cols-1 lg:grid-cols-[clamp(400px,34vw,540px)_1fr] items-stretch gap-8 md:gap-12 lg:gap-16"
  >
    {/* ⚠️ STACKED (below lg) THE PHOTO FILLS THE WIDTH. It used to be
        `w-[64%] max-w-[300px] mx-auto`, inherited from Home's mobile portrait.
        That reads fine on a 390px phone but on any narrow WINDOW — Hugo caught
        it at ~555px — a 300px portrait floats in the middle of a 555px column
        with ~127px of dead ground either side, which is the isolated-island gap
        he has banned repeatedly ("i cant have that isolated portrait in the
        middle — it leaves gaps either side"). Full width has no side void at
        any width, and a 2:3 portrait at 390px is 585px tall — tall, but nowhere
        near the screen-filling wall he also bans. */}
    <figure className="relative m-0 w-full lg:h-auto overflow-hidden rounded-[4px] ring-1 ring-line">
      <AssetImage
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        sizes={sizes}
        className="block w-full h-auto lg:absolute lg:inset-0 lg:h-full lg:w-full lg:object-cover"
        style={{ objectPosition: position }}
      />
    </figure>
    <div className="w-full flex flex-col items-start justify-start text-left gap-4 md:gap-5 3xl:gap-7 4xl:gap-9">
      {children}
    </div>
  </Reveal>
);

// ─── Pull — ROLE 2. THE page's only display moment besides the h1. ───────────
// ⚠️ ONE TIER, never two. The old component stacked a 104px lead over a 60px
// italic follow, which is what put four roles inside one 12px band and made the
// opening read as a shouting match. A pull is now a single sentence at a single
// size; if a second sentence belongs with it, it is part of the SAME string and
// wraps naturally. `accentStop` is allowed on exactly ONE pull per page (the
// last), because one rust mark is a signature and fourteen are wallpaper.
// The trailing full stop hangs (-0.28em) so the line is OPTICALLY centred —
// without it a centred display line reads a quarter-em left of true.
const Pull = ({ text, accentStop = false }: { text: string; accentStop?: boolean }) => {
  const hasStop = text.endsWith(".");
  const body = accentStop && hasStop ? text.slice(0, -1) : text;
  return (
    <Reveal delay={0.05} className={cn("text-center", GAP_4, "mb-[calc(var(--rhythm)*4)]")}>
      <blockquote className={cn(MEASURE, "m-0 hero-text-shadow")}>
        <span
          className="block mx-auto font-display text-ink text-balance"
          style={PULL_STYLE}
        >
          {body}
          {accentStop && hasStop && <span className="text-accent">.</span>}
          <span aria-hidden className="inline-block w-0 -mr-[0.28em]" />
        </span>
      </blockquote>
    </Reveal>
  );
};

// ─── Verbatim slicing (never re-typed) ───────────────────────────────────────
// Every display moment on the page is DERIVED from the paragraph it belongs to,
// and the body then renders only the remainder — so each of Stephen's words
// appears exactly once, in order (Home's reminderLead / starSentence recipe).

// Opening passage: first sentence = the illuminated lede; the closing two
// sentences ("That kind of knowledge is a gift. It is also a weight.") = the
// two-tier pull; the middle = body.
const opening = ABOUT.opening[0];
const openingSplit = opening.indexOf(". ");
const openingLede = (openingSplit > 0 ? opening.slice(0, openingSplit + 1) : opening).replace(/ (\S+)$/, "\u00a0$1");
const openingPullAt = opening.indexOf("That kind of knowledge");
const openingBody =
  openingSplit > 0
    ? opening.slice(openingSplit + 2, openingPullAt > 0 ? openingPullAt : undefined).trim()
    : "";
const openingPull = openingPullAt > 0 ? opening.slice(openingPullAt).trim() : "";
const openingPullSplit = openingPull.indexOf(". ");
const openingPullLead = openingPullSplit > 0 ? openingPull.slice(0, openingPullSplit + 1) : openingPull;
const openingPullFollow = openingPullSplit > 0 ? openingPull.slice(openingPullSplit + 2) : "";

// "As he described himself": the first sentence carries the two-column heading,
// the rest flows as the copy beside his portrait.
const described = ABOUT.opening[1];
const describedSplit = described.indexOf(". ");
// ⚠️ opening[1] now feeds TWO sections, so it is cut ONCE here and each half is
// rendered exactly once, in order. The tail (from "Just as a pentagon…") is the
// passage in which he explains that each painting obeys its own law — that is
// the "how to read one painting" section; everything before it stays with his
// portrait. Marker miss ⇒ readingAt < 0 ⇒ the tail is empty and that section
// simply does not render, never a duplicate.
const readingAt = described.indexOf("Just as a pentagon");
const readingText = readingAt > 0 ? described.slice(readingAt).trim() : "";
const describedHead = describedSplit > 0 ? described.slice(0, describedSplit + 1) : described;
const describedBody =
  describedSplit > 0
    ? described.slice(describedSplit + 2, readingAt > 0 ? readingAt : undefined).trim()
    : "";

// Return & the first mandala: earlyLife[4] is two sentences — the close.
const firstMandala = ABOUT.earlyLife[4];
const firstMandalaSplit = firstMandala.indexOf(". ");
const firstMandalaLead = firstMandalaSplit > 0 ? firstMandala.slice(0, firstMandalaSplit + 1) : firstMandala;
const firstMandalaFollow = firstMandalaSplit > 0 ? firstMandala.slice(firstMandalaSplit + 2) : "";

// Anegada: the story runs up to the sanctioned pull sentence (ABOUT.anegadaQuote,
// a verbatim substring of anegada[0]), the sentence lands as the two-tier pull,
// and the story resumes beneath it.
const anegada = ABOUT.anegada[0];
const anegadaQuoteAt = anegada.indexOf(ABOUT.anegadaQuote);
const anegadaBefore = anegadaQuoteAt > 0 ? anegada.slice(0, anegadaQuoteAt).trim() : anegada;
const anegadaAfter = anegadaQuoteAt > 0 ? anegada.slice(anegadaQuoteAt + ABOUT.anegadaQuote.length).trim() : "";
const anegadaQuoteSplit = ABOUT.anegadaQuote.indexOf(", I felt");
const anegadaQuoteLead =
  anegadaQuoteSplit > 0 ? ABOUT.anegadaQuote.slice(0, anegadaQuoteSplit + 1) : ABOUT.anegadaQuote;
const anegadaQuoteFollow = anegadaQuoteSplit > 0 ? ABOUT.anegadaQuote.slice(anegadaQuoteSplit + 2) : "";

// The facts ledger — Home's material-spec strip, filled with the estate's
// verifiable facts (dates from content.ts; the rest verbatim from ABOUT.legacy
// and CREDENTIALS).
const FACTS: [string, string][] = [
  ["Born", `${BIRTH_DATE} — Staffordshire`],
  ["Died", DEATH_DATE],
  ["Studio", "Phoenix Place, Lewes"],
  ["Academy", "TAGA — The Art of Geometry Academy · 2010"],
  ["Exhibited", CREDENTIALS.slice(0, 3).join(" · ")],
  // slice(3) — NOT slice(3,5). The bounded form dropped CREDENTIALS[5]
  // ("Tree of Wellbeing · 1,200 UK hospices & hospitals") off the page
  // entirely when the credentials index was removed. An open-ended slice
  // cannot silently lose a credential when one is added.
  ["Commissioned", CREDENTIALS.slice(3).join(" · ")],
];

// Interview answers at or under this length are the emotional beats ("To
// inspire wonderment." / "Shall we sit down and have some tea?") — they land as
// a display close instead of a reading paragraph.
const BEAT_ANSWER_MAX_CHARS = 64;

/** One question/answer pair, verbatim, in Home's centred essay register. */
const InterviewQA = ({ item }: { item: { q: string; a: string } }) => {
  const isBeat = item.a.length <= BEAT_ANSWER_MAX_CHARS;
  return (
    <Reveal as="div" className={cn(MEASURE, "text-center")}>
      <p
        className="m-0 mb-[var(--rhythm)] font-display italic font-normal text-ink-muted text-balance text-[clamp(22px,1.2vw+12.7px,40px)] leading-[1.35] hero-text-shadow"
        style={{ fontVariationSettings: '"opsz" 36, "wght" 400' }}
      >
        {item.q}
      </p>
      {isBeat ? (
        // DEMOTED from a 68px display tier: a beat answer is a pull-quote
        // INSIDE a transcript, not a monument. It keeps the page's ONE italic.
        <p
          className={cn(LEAD_P, "mx-auto max-w-[34ch] font-display text-ink")}
          style={{ fontVariationSettings: '"opsz" 36, "wght" 400' }}
        >
          &ldquo;{item.a}&rdquo;
        </p>
      ) : (
        <BodyProse text={item.a} />
      )}
    </Reveal>
  );
};

export const About = () => {

  return (
    <div className="relative">
      <Seo
        title="About Stephen Meakin — the life and work"
        description="The life and work of Stephen Meakin (1966–2021), British mandala artist and sacred geometer: from Anegada to the studio at Phoenix Place, Lewes, and a practice built on the idea that everything is connected."
        url="/about"
      />
      <Nav />

      {/* ONE vertical rhythm for the whole page — Home's: the gap lives on
          <main> (space-y), sections carry no padding of their own, so it can
          never double up or collapse. overflow-x-clip lets the full-bleed
          bands break out without a horizontal scrollbar. */}
      <main
        className={cn(
          "relative isolate z-10 overflow-x-clip space-y-10 md:space-y-12 lg:space-y-14 pt-6 md:pt-8 pb-8 md:pb-10",
          // ⚠️ --rhythm is declared HERE, on <main>, because GAP_1/2/4 are used
          // in sections all over the page and `calc(var(--rhythm)*2)` silently
          // computes to nothing if the variable is not on an ancestor.
          RHYTHM,
        )}
      >
        {/* 1 · FRONT COVER — Home's hero, beat for beat: the WHOLE photograph
            first at full content width (his best landscape photograph — sharp,
            at work, the mandala behind him), then the name set as the page's
            dominant statement with the one italic subordinate, then the two
            pills. Nothing is cropped; the photo box matches its native 3:2. */}
        <section className="relative isolate w-full overflow-hidden">
          <div className={cn(CONTAINER, "flex flex-col w-full")}>
            <Reveal as="div" className="order-2 mt-[calc(var(--rhythm)*2)] text-center">
              <h1 className={cn("font-display text-ink m-0 text-balance hero-text-shadow", MEASURE)}>
                {/* ROLE 1. 176px→? at 1440 this is 107px, down from 158px: still
                    the loudest thing on the page by 1.6×, but composed. */}
                <span className="block" style={PAGE_TITLE_STYLE}>
                  Stephen Meakin
                </span>
                {/* DEMOTED to the LEAD role, and ROMAN — a 72px Fraunces italic
                    was the second display tier in the first screen and the
                    swashy cut the finale bans. */}
                <span className={cn(LEAD_P, "block mx-auto text-ink/80", GAP_1)}>
                  &mdash; mandala artist and sacred geometer.
                </span>
              </h1>
              <div className="mt-[calc(var(--rhythm)*2)] flex flex-wrap items-center justify-center gap-3">
                <MagneticLink to="/collections" className={PILL_PRIMARY} ariaLabel="See the collection">
                  See the collection{" "}
                  <span
                    aria-hidden="true"
                    className="ml-2 inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-x-1"
                  >
                    &rarr;
                  </span>
                </MagneticLink>
                <MagneticLink to="/memories" className={PILL_SECONDARY} ariaLabel="Leave a memory">
                  Leave a memory
                </MagneticLink>
              </div>
            </Reveal>

            {/* ⚠️ THE HERO MUST NOT BE A STUDIO-DESK PHOTOGRAPH. Home owns that
                image, and TWO attempts here failed on it:
                  · `28-at-the-drafting-table` — same shed, same blue wall, same
                    mandala, same black-shirt-over-white-polo, same posture bent
                    over a print. It is the same shoot as Home's hero
                    (`01-painting-wild-rose`), a tighter crop of the same moment.
                  · `stephen-doorway-portrait-v1` — swapped in to fix that, and
                    WORSE: it is the same shoot as Home's "Meet Stephen"
                    portrait (`02-portrait-denim`) — same doorway, same frame,
                    same denim shirt, same glasses pushed up. Hugo spotted it on
                    the live site immediately: "how is this done when this is
                    literally a repeated image".
                ⚠️ An agent reported that file as "unused anywhere", which was
                true of the CODE and irrelevant: unused ≠ not a duplicate. Open
                the candidate AND the images already live on other pages and
                compare the pixels before choosing a hero.
                This is the artist WITH his work, in public, at an exhibition —
                a register Home never uses. Shown WHOLE at its native 2:3 and
                width-capped so a tall portrait can never become a screen-filling
                wall. */}
            <Reveal
              as="figure"
              // ⚠️ `min(92vw, …)` not `44vw`: at a 555px window 44vw was 244px,
              // so the hero portrait sat marooned with dead ground either side.
              // It now fills the column until it reaches its cap on wide screens.
              className="order-1 m-0 mx-auto w-full max-w-[min(92vw,560px)] 2xl:max-w-[620px] 3xl:max-w-[720px]"
            >
              <ImageReveal
                src="/img/about/01-stephen-at-gallery.jpg"
                alt="Stephen Meakin standing beside one of his framed paintings at an exhibition, hands in his pockets, looking up at the work"
                eager
                aspect="aspect-[2/3]"
                edges="none"
                parallax={0}
                zoom={1}
                objectPosition="center"
                shadow=""
                sizes="(min-width: 1536px) 560px, 44vw"
              />
            </Reveal>
          </div>
        </section>

        {/* 2 · THE OPENING PASSAGE — Home's "A reminder" essay: eyebrow, the
            first sentence as the illuminated lede, the paragraph's remainder at
            reading size, then its closing two sentences lifted as the two-tier
            pull. Every word of ABOUT.opening[0] appears exactly once. */}
        <section className={cn(CONTAINER, "relative isolate")}>
          {/* DEMOTED: this opening clause was a 64px display tier sitting one
              screen under a 158px h1 and one screen above a 104px pull — three
              display moments and two lines of prose in the first two screens.
              It is the paragraph's first sentence, so it is now the section
              LEAD (role 4) and the passage reads as one thought. */}
          <Reveal as="header" className="text-center">
            <p className={cn(EYEBROW_MUTED, "m-0 mb-[var(--rhythm)]")}>In memoriam · {LIFE_DATES}</p>
            <p className={cn(LEAD_P, MEASURE, "reading-shadow")}>{openingLede}</p>
            {openingBody && (
              <p className={cn(BODY_P, MEASURE, GAP_1)} style={BODY_SHADOW}>
                {openingBody}
              </p>
            )}
          </Reveal>
          {/* PULL 1 of 3. Both sentences ride ONE tier — the old 104px lead
              over a 60px italic follow was the single loudest thing on the
              page and it stacked two roles where one belongs. */}
          {openingPullLead && (
            <Pull text={[openingPullLead, openingPullFollow].filter(Boolean).join(" ")} />
          )}
        </section>

        {/* 3 · AS HE DESCRIBED HIMSELF — Home's Meet-Stephen two-column: his
            portrait cover-fills the left column to the copy's exact height; the
            copy (eyebrow → first sentence as the heading → the rest) sits
            beside it. object-position 50% 25% keeps the whole face; the source
            is already a head crop, so the column must never be squarer than
            the copy makes it (see the audit note in the commit). */}
        <section className={CONTAINER}>
          <SideBySide
            src="/img/about/12-stephen-portrait.jpg"
            alt="Stephen Meakin"
            position="50% 25%"
          >
            <p className={cn(EYEBROW_MUTED, "m-0")}>As he described himself &mdash;</p>
            <h2 className={SIDE_H2} style={OPSZ40}>
              {describedHead}
            </h2>
            <SideProse text={describedBody} per={2} />
          </SideBySide>
        </section>

        {/* 4 · CHAPTER I — BEGINNINGS. Centred header → justified body → one
            uniform 3:2 row of the two family photographs (faces kept). */}
        <section className={CONTAINER}>
          <ChapterHead id="beginnings" />
          <Reveal as="div" className={cn(MEASURE, "text-center")}>
            <BodyProse text={ABOUT.earlyLife[0]} />
          </Reveal>
          <TileRow cols={2} className="mt-[calc(var(--rhythm)*2)]">
            <Tile
              src="/img/about/15-wedding-top-hats.jpg"
              alt="A bride and three young men in morning dress and grey top hats at a family wedding."
              aspect="aspect-[3/2]"
              position="center"
              sizes="(min-width: 640px) 48vw, 100vw"
            />
            <Tile
              src="/img/about/16-family-sofa.jpg"
              alt="A teenager in a yellow patterned shirt on a floral sofa beside two teenage girls — a family photograph."
              aspect="aspect-[3/2]"
              position="center 25%"
              sizes="(min-width: 640px) 48vw, 100vw"
            />
          </TileRow>
        </section>

        {/* 5 · CHAPTER II — BOURNEMOUTH. */}
        <section className={CONTAINER}>
          <ChapterHead id="bournemouth" />
          <Reveal as="div" className={cn(MEASURE, "text-center")}>
            <BodyProse text={ABOUT.earlyLife[1]} />
          </Reveal>
          <TileRow cols={2} className="mt-[calc(var(--rhythm)*2)]">
            <Tile
              src="/img/about/17-bournemouth-friends.jpg"
              alt="Four smartly dressed young men standing together outdoors under trees."
              aspect="aspect-[3/2]"
              position="center"
              sizes="(min-width: 640px) 48vw, 100vw"
            />
            <Tile
              src="/img/about/18-cafe-terrace.jpg"
              alt="Stephen Meakin in a denim shirt smiling at an outdoor café table, a stoneware jug before him and cypress trees in the distance."
              aspect="aspect-[3/2]"
              position="center 35%"
              sizes="(min-width: 640px) 48vw, 100vw"
            />
          </TileRow>
        </section>

        {/* 6 · CHAPTER III — YEARS ABROAD. Three portraits, one 4:5 row. */}
        <section className={CONTAINER}>
          <ChapterHead id="wandering" />
          <Reveal as="div" className={cn(MEASURE, "text-center")}>
            <BodyProse text={ABOUT.earlyLife[2]} />
          </Reveal>
          <TileRow cols={3} className="mt-[calc(var(--rhythm)*2)]">
            <Tile
              src="/img/about/20-island-evening.jpg"
              alt="Stephen Meakin in a loose white shirt and jeans, seated outdoors at night during his years abroad."
              aspect="aspect-[4/5]"
              position="center 30%"
              sizes="(min-width: 640px) 31vw, 100vw"
            />
            <Tile
              src="/img/about/21-at-the-helm.jpg"
              alt="Stephen Meakin at the wheel of a motorboat, long sun-bleached hair blown back and the sea behind him."
              aspect="aspect-[4/5]"
              position="center 40%"
              sizes="(min-width: 640px) 31vw, 100vw"
            />
            <Tile
              src="/img/about/22-fancy-dress-party.jpg"
              alt="Stephen Meakin in pirate fancy dress with a toy parrot on his shoulder, a friend in an eyepatch reclining in front of him."
              aspect="aspect-[4/5]"
              position="center"
              sizes="(min-width: 640px) 31vw, 100vw"
            />
          </TileRow>
          <Reveal as="div" className="text-center">
            <p className={cn(CAPTION, "m-0 mt-4")}>A four-year stay in the Virgin Islands</p>
          </Reveal>
        </section>

        {/* 7 · CHAPTER IV — RETURN & THE FIRST MANDALA, then ANEGADA. The chapter
            body, its two-sentence close as Home's two-tier close, then the
            Anegada story: the text up to the sanctioned pull sentence, the
            sentence itself as the two-tier pull, and the story's remainder. */}
        <section className={CONTAINER}>
          <ChapterHead id="return" />
          <Reveal as="div" className={cn(MEASURE, "text-center")}>
            <BodyProse text={ABOUT.earlyLife[3]} />
          </Reveal>
          {/* DEMOTED + SPLIT. "In 1999, while still an architecture student, he
              had made his first major mandala." is a FACTUAL sentence and now
              runs as body at the end of the chapter. Only "He never stopped."
              stays display — three words are the whole point, and it is PULL 2
              of 3. */}
          <Reveal as="div" className={cn(MEASURE, "text-center", GAP_2)}>
            <p className={cn(BODY_P, "mb-0")} style={BODY_SHADOW}>{firstMandalaLead}</p>
          </Reveal>
          {firstMandalaFollow && <Pull text={firstMandalaFollow} />}
        </section>

        <section className={CONTAINER}>
          <Reveal as="div" className="text-center mb-[var(--rhythm)]">
            <p className={cn(EYEBROW_MUTED, "m-0")}>Anegada · 1995</p>
          </Reveal>
          <Reveal as="div" className={cn(MEASURE, "text-center")}>
            <BodyProse text={anegadaBefore} />
          </Reveal>
          {/* PULL 3 of 3, and the ONLY rust mark on the page. */}
          <Pull text={[anegadaQuoteLead, anegadaQuoteFollow].filter(Boolean).join(" ")} accentStop />
          {anegadaAfter && (
            <Reveal as="div" className={cn(MEASURE, "text-center")}>
              <BodyProse text={anegadaAfter} />
            </Reveal>
          )}
        </section>

        {/* 8 · CHAPTER V — ART AS RITUAL. Home's ISLAND, beat for beat: the
            translucent card, the title centred above, the photograph filling
            the LEFT column to the prose's exact height, his own words in the
            right column, and the ledger strip below (the estate's facts). The
            over-shoulder photograph keeps Stephen at the right edge of the
            frame, so the column is anchored 100% right. */}
        <section className={CONTAINER}>
          <div className="relative overflow-hidden rounded-[22px] md:rounded-[32px] bg-[rgba(12,10,9,0.72)] ring-1 ring-line shadow-[0_50px_140px_-40px_rgba(0,0,0,0.85)] px-6 sm:px-10 md:px-12 lg:px-16 py-10 md:py-14 lg:py-16">
            <ChapterHead id="ritual" className="mb-[calc(var(--rhythm)*2)]" />
            <Reveal
              as="div"
              className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-stretch gap-8 lg:gap-12 xl:gap-16"
            >
              <figure className="relative m-0 lg:h-full overflow-hidden rounded-[16px] md:rounded-[20px] ring-1 ring-line">
                <AssetImage
                  src="/img/about/stephen-painting-colour-v1.jpg"
                  alt="Stephen Meakin painting a large colour mandala at his board, a finished mandala on the wall behind"
                  loading="lazy"
                  decoding="async"
                  width={1600}
                  height={1067}
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="block w-full h-auto lg:absolute lg:inset-0 lg:h-full lg:w-full lg:object-cover"
                  style={{ objectPosition: "100% 55%" }}
                />
              </figure>
              <div className="flex flex-col gap-5 md:gap-6">
                {paragraphize(ABOUT.anegada[1], 3).map((para, i) => (
                  <p
                    key={para.slice(0, 32)}
                    className={cn(SIDE_P, i === 0 && "font-medium text-ink 2xl:text-[22px] 3xl:text-[27px] 4xl:text-[32px]")}
                  >
                    {para}
                  </p>
                ))}
              </div>
            </Reveal>
            <ul className="list-none p-0 m-0 mt-[calc(var(--rhythm)*4)] grid grid-cols-1 sm:grid-cols-2 gap-x-10 md:gap-x-16">
              {FACTS.map(([label, value]) => (
                <li key={label} className={LEDGER_ROW}>
                  <span className={cn(EYEBROW_TIGHT, "shrink-0 uppercase")}>{label}</span>
                  <span className={LEDGER_VALUE}>{value}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* THE RITUAL, IN MOTION — the two archive clips of Stephen painting,
            filmed from above, as one even 16:9 pair. */}
        <section className={CONTAINER}>
          <Reveal as="div" className={cn(TILE_GRID, "grid-cols-1 sm:grid-cols-2")}>
            {[
              {
                src: "/video/studio-paint-a-v1.mp4",
                poster: "/video/poster-studio-paint-a-v1.jpg",
                label: "Stephen Meakin painting a mandala, filmed from above",
              },
              {
                src: "/video/studio-paint-b-v1.mp4",
                poster: "/video/poster-studio-paint-b-v1.jpg",
                label: "Stephen Meakin laying colour into a mandala, filmed from above",
              },
            ].map((film) => (
              <figure key={film.src} className="m-0 overflow-hidden ring-1 ring-line">
                <LoopFilm src={film.src} poster={film.poster} label={film.label} aspect="aspect-[16/9]" edges="none" />
              </figure>
            ))}
          </Reveal>
        </section>

        {/* His words on interconnectedness, then the cymatics chart as Home's
            capped archive figure (a low-res reference document — kept small,
            WHOLE, with its caption). */}
        <section className={CONTAINER}>
          <Reveal as="div" className={cn(MEASURE, "text-center")}>
            <BodyProse text={ABOUT.anegada[2]} />
          </Reveal>
          <Reveal as="figure" className="relative m-0 mt-[calc(var(--rhythm)*2)] mx-auto w-full max-w-[440px] md:max-w-[540px] 2xl:max-w-[600px]">
            <div className="overflow-hidden ring-1 ring-line">
              <AssetImage
                src="/img/about/25-harmonic-frequencies.jpg"
                alt="A grid of twelve cymatic patterns, each labelled with the sound frequency in hertz that formed it, from 345 Hz to 5907 Hz."
                width={612}
                height={502}
                loading="lazy"
                decoding="async"
                sizes="(min-width: 768px) 600px, 100vw"
                className="block w-full h-auto"
              />
            </div>
            <figcaption className={CAPTION}>
              Cymatics — sound made visible: twelve frequencies, from 345 to 5907&nbsp;Hz, each vibrating sand into a distinct geometric figure.
            </figcaption>
          </Reveal>
        </section>

        {/* 9 · CHAPTER VI — FOUR TRADITIONS. Body, then Home's hairline-ruled
            index (the four traditions named exactly as in his words), then the
            two reference photographs as one 16:9 row. */}
        <section className={CONTAINER}>
          <ChapterHead id="lewes" />
          <Reveal as="div" className={cn(MEASURE, "text-center mb-[calc(var(--rhythm)*2)]")}>
            <BodyProse text={ABOUT.legacy[0]} />
          </Reveal>
          {/* CUT 2026-09-03: the hairline four-traditions index lived here and
              was byte-identical to Home §7 — same four names, same Roman
              numerals, same hover. Worse, ABOUT.legacy[0] above and Home's
              WELCOME.bio[1] print the SAME sentence, so the site named the four
              traditions twice within one scroll. The prose stays (it is his
              mission, and it belongs in his chapter); the Home-shaped module
              goes, and the two reference photographs below now carry it. */}
          <TileRow cols={2}>
            <Tile
              src="/img/about/26-persian-geometry.jpg"
              alt="The blue-tiled, honeycomb-vaulted entrance portal of a mosque, an example of the Persian geometric tradition Stephen studied."
              aspect="aspect-video"
              position="center"
              sizes="(min-width: 640px) 48vw, 100vw"
            />
            <Tile
              src="/img/about/27-sainte-chapelle.jpg"
              alt="The upper chapel of Sainte-Chapelle in Paris, its walls of stained glass rising to a rose window, the medieval tradition behind Stephen's rose-window studies."
              aspect="aspect-video"
              position="center"
              sizes="(min-width: 640px) 48vw, 100vw"
            />
          </TileRow>
        </section>

        {/* 10 · CHAPTER VII — EXHIBITIONS & COMMISSIONS. Home's two-column
            module (the easel portrait cover-fills to the copy), then the
            documented credentials in Home's hairline index, then the
            exhibition room as a full-bleed band. */}
        <section className={CONTAINER}>
          <SideBySide
            src="/img/about/29-at-the-easel.jpg"
            alt="Stephen Meakin seated at a tilted easel in the studio, working on a large circular canvas"
            position="center 25%"
          >
            <p className={cn(EYEBROW_MUTED, "m-0")}>{chapter("exhibitions").eyebrow}</p>
            <h2 className={SIDE_H2} style={OPSZ40}>
              {chapter("exhibitions").title}
            </h2>
            <SideProse text={ABOUT.legacy[1]} per={2} />
          </SideBySide>
          {/* CUT 2026-09-03: a hairline index of all six CREDENTIALS sat here,
              while the estate ledger in the ritual island already prints the
              same six as its "Exhibited" and "Commissioned" rows. The page
              listed the man's exhibitions twice. */}
        </section>

        <Band
          src="/img/about/36-mystic-rose-exhibition.jpg"
          alt="A bright gallery room hung with framed paintings, sculptural pieces standing on plinths"
          position="center 35%"
        />

        {/* 11 · ON CLOSER INSPECTION — REPLACES the six-tile PrintTile grid that
            stood here, which was byte-identical to Home §5 (same eyebrow "From
            the hand", same heading, same random six, same CTA). Hugo: "I HATE
            YOU REPEATING PHOTOS AND SECTIONS INSTEAD OF USING THE NEW ONES AND
            NEW IDEAS."

            What replaces it is the one thing only this page can do. Home SHOWS
            the paintings so you can buy one; nowhere on the site teaches you
            how to LOOK at one. So this is the passage where he explains that a
            pentagon and a hexagon are different laws — verbatim, the tail of
            ABOUT.opening[1], which until now was buried in a side column — over
            the macro of his own hand laying a fine brush into the detail. The
            photograph is the argument: the whole point is what you see close up.

            ⚠️ The canvas shot `11-ophiuchus-painting.jpg` was the obvious
            candidate and is deliberately NOT used: it was removed from this
            page once already in `bfde9cc` ("fix image duplication") because
            that artwork is in the shop. The brush macro belongs to no other
            page. Likewise `19-evening-with-friends` and `14-family-group` sit
            unused because Hugo had them REMOVED in `7f04f51` — "unused on disk"
            is not the same as "available to use".

            The buy path survives as the quiet text link, so the page still
            opens into the shop; it just no longer re-runs Home's grid. */}
        <section className={CONTAINER}>
          <Reveal as="div" className={cn(MEASURE, "text-center")}>
            <BodyProse text={readingText} per={2} />
          </Reveal>
          <Reveal
            as="figure"
            className={cn("relative m-0 mx-auto w-full max-w-[760px] 2xl:max-w-[900px]", GAP_2)}
          >
            <ImageReveal
              src="/img/about/hand-finishing-brush-v1.jpg"
              alt="Stephen's hand laying fine brushwork into a mandala, petal by petal"
              aspect="aspect-[1100/940]"
              edges="none"
              parallax={0}
              zoom={1}
              objectPosition="center"
              shadow=""
              sizes="(min-width: 1536px) 900px, (min-width: 768px) 760px, 92vw"
            />
          </Reveal>
          <Reveal as="div" className={cn("text-center", GAP_2)}>
            <MagneticLink
              to="/collections"
              className="press group inline-flex items-center gap-2 font-sans text-[14px] font-bold tracking-[0.02em] text-ink transition-colors duration-300 hover:text-accent"
              ariaLabel="See the collection"
            >
              See the collection{" "}
              <span
                aria-hidden="true"
                className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-x-0.5"
              >
                →
              </span>
            </MagneticLink>
          </Reveal>
        </section>

        {/* 12 · THE INTERVIEW — Time Out Dubai, 2011. Centred header, the
            scene-setting context, the flyer WHOLE as a capped archive figure,
            then the six questions in one centred measure with the studio
            photographs interleaved as uniform rows, the gathering as a band. */}
        <section className={CONTAINER}>
          <SectionHead eyebrow={INTERVIEW.eyebrow} title="In conversation." />
          <Reveal as="div" className={cn(MEASURE, "text-center")}>
            {INTERVIEW.context.map((p) => (
              <p key={p.slice(0, 32)} lang="en-GB" className={BODY_P} style={BODY_SHADOW}>
                {p}
              </p>
            ))}
          </Reveal>
          <Reveal as="figure" delay={0.08} className="relative m-0 mt-[calc(var(--rhythm)*2)] mx-auto w-full max-w-[720px] 2xl:max-w-[820px]">
            <div className="overflow-hidden ring-1 ring-line">
              <AssetImage
                src="/img/about/04-mystic-rose-flyer.jpg"
                alt="Exhibition flyer for ‘The Mystic Rose’, an exhibition of paintings by Stephen E. Meakin at the Fairmont Dubai, presented by the Majlis Gallery"
                width={900}
                height={604}
                loading="lazy"
                decoding="async"
                sizes="(min-width: 768px) 820px, 100vw"
                className="block w-full h-auto"
              />
            </div>
            <figcaption className={CAPTION}>
              <i>‘The Mystic Rose’</i> · Fairmont Dubai · presented by the Majlis Gallery
            </figcaption>
          </Reveal>
        </section>

        <section className={cn(CONTAINER, "space-y-10 md:space-y-12 lg:space-y-14")}>
          <InterviewQA item={INTERVIEW.qa[0]} />
          <InterviewQA item={INTERVIEW.qa[1]} />
          <InterviewQA item={INTERVIEW.qa[2]} />
          <TileRow cols={2}>
            <Tile
              src="/img/about/stephen-painting-compass-v1.jpg"
              alt="Stephen Meakin laying gold knotwork into a mandala with compass and rule"
              aspect="aspect-[3/2]"
              position="center"
              sizes="(min-width: 640px) 48vw, 100vw"
            />
            <Tile
              src="/img/about/30-painting-in-progress.jpg"
              alt="Stephen Meakin painting a circular rose-window-patterned mandala in the studio"
              aspect="aspect-[3/2]"
              position="center"
              sizes="(min-width: 640px) 48vw, 100vw"
            />
          </TileRow>
          <InterviewQA item={INTERVIEW.qa[3]} />
          <TileRow cols={2}>
            <Tile
              src="/img/about/31-studio-wall.jpg"
              alt="A studio wall hung edge to edge with finished framed mandala paintings"
              aspect="aspect-video"
              position="center"
              sizes="(min-width: 640px) 48vw, 100vw"
            />
            <Tile
              src="/img/about/32-paintings-at-home.jpg"
              alt="A sitting room hung with mandala paintings and panels"
              aspect="aspect-video"
              position="center"
              sizes="(min-width: 640px) 48vw, 100vw"
            />
          </TileRow>
          <InterviewQA item={INTERVIEW.qa[4]} />
        </section>

        <Band
          src="/img/about/35-gathering-at-the-gallery.jpg"
          alt="A large smiling crowd gathered with Stephen Meakin in a gallery, his paintings filling the wall behind them"
          position="center 20%"
        />

        <section className={cn(CONTAINER, "space-y-10 md:space-y-12 lg:space-y-14")}>
          <InterviewQA item={INTERVIEW.qa[5]} />
          <TileRow cols={2}>
            <Tile
              src="/img/about/33-painting-on-easel.jpg"
              alt="A deep blue, violet and gold geometric painting standing on the studio easel"
              aspect="aspect-square"
              position="center"
              sizes="(min-width: 640px) 48vw, 100vw"
            />
            <Tile
              src="/img/about/34-white-flowers-in-progress.jpg"
              alt="Stephen Meakin, palette in hand, painting clusters of white blossoms onto a large round work"
              aspect="aspect-square"
              position="62% center"
              sizes="(min-width: 640px) 48vw, 100vw"
            />
          </TileRow>
          <Reveal as="div" className={cn(MEASURE, "text-center")}>
            <p className={BODY_P} style={BODY_SHADOW}>
              {INTERVIEW.source.note}
            </p>
            <p className={cn(EYEBROW_MUTED, "m-0 mt-4 leading-[1.9]")}>
              {INTERVIEW.source.publication} · {INTERVIEW.source.byline} · {INTERVIEW.source.date}
              {INTERVIEW.source.url && (
                <>
                  {" — "}
                  <a
                    href={INTERVIEW.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:text-accent transition-colors"
                  >
                    read the archived article ↗
                  </a>
                </>
              )}
            </p>
          </Reveal>
        </section>

        {/* 13 · FROM THE DESIGN ARCHIVE — the Force India plates, one 3:2 row. */}
        <section className={CONTAINER}>
          <Reveal as="div" className="text-center mb-[var(--rhythm)]">
            <p className={cn(EYEBROW_MUTED, "m-0")}>From the design archive</p>
          </Reveal>
          <TileRow cols={2}>
            <Tile
              src="/img/about/05-force-india-layout.jpg"
              alt="Annotated layout sheet of mandala designs arranged across the bodywork of the Sahara Force India Formula One car"
              aspect="aspect-[3/2]"
              position="center"
              sizes="(min-width: 640px) 48vw, 100vw"
            />
            <Tile
              src="/img/about/06-force-india-final.jpg"
              alt="Stephen's mandala design for the Sahara Force India Formula One car"
              aspect="aspect-[3/2]"
              position="center"
              sizes="(min-width: 640px) 48vw, 100vw"
            />
          </TileRow>
        </section>

        {/* 14 · CHAPTER VIII — THE ACADEMY. The founding line as Home's display
            close, the Academy's own account as body, then the six archive
            photographs of the place as one uniform 4:3 grid (3×2, like the
            featured works) — all six are native 4:3 or wider, nobody is cut. */}
        <section className={CONTAINER}>
          <ChapterHead id="academy" className="mb-[calc(var(--rhythm)*2)]" />
          {/* DEMOTED: a dated factual sentence, not a monument. */}
          <Reveal as="div" className={cn(MEASURE, "text-center")}>
            <p className={cn(BODY_P, "mb-0")} style={BODY_SHADOW}>{ABOUT.legacy[2]}</p>
          </Reveal>
          <Reveal as="div" className={cn(MEASURE, "text-center mt-[calc(var(--rhythm)*2)]")}>
            <BodyProse text={ABOUT.academyQuote} />
          </Reveal>
          {/* 2×2, NOT 3-up: two tiles were removed here and five tiles in a
              three-column grid leaves a ragged last row.
              · `08-taga-group` — Hugo moved that photograph to /memories in
                `33c8a4b`, to sit with Stephen's own letter to those students.
                Showing it here too is the repeat he called out.
              · `02-painting-table` — same table, same collaborator, same
                session as Home's ritual photograph. */}
          <Reveal as="div" className={cn(TILE_GRID, "grid-cols-1 sm:grid-cols-2 mt-[calc(var(--rhythm)*2)]")}>
            <Tile
              src="/img/about/10-taga-classroom.jpg"
              alt="Students at work around the tables of the TAGA classroom"
              aspect="aspect-[4/3]"
              position="center"
              sizes="(min-width: 768px) 31vw, (min-width: 640px) 48vw, 100vw"
            />
            <Tile
              src="/img/about/students-working-v1.jpg"
              alt="Students at the Academy's tables, working on their own geometry in colour"
              aspect="aspect-[4/3]"
              position="center"
              sizes="(min-width: 768px) 31vw, (min-width: 640px) 48vw, 100vw"
            />
            <Tile
              src="/img/about/09-taga-studio.jpg"
              alt="A paint-spattered drafting easel in the studio, finished mandalas crowding the walls behind it"
              aspect="aspect-[4/3]"
              position="center"
              sizes="(min-width: 768px) 31vw, (min-width: 640px) 48vw, 100vw"
            />
            <Tile
              src="/img/about/finishing-large-mandala-v1.jpg"
              alt="Stephen absorbed in finishing a large mandala by hand at the studio table"
              aspect="aspect-[4/3]"
              position="center"
              sizes="(min-width: 768px) 31vw, (min-width: 640px) 48vw, 100vw"
            />
          </Reveal>
        </section>

        {/* 15 · CHAPTER IX — AZ-ZARQA. The passage, then the two photographs
            that belong to it shown WHOLE side by side (a cover crop of the
            children would cut them out): Stephen on the cairn in the Jordanian
            desert beside Stephen among the children with their mandalas. */}
        <section className={CONTAINER}>
          <ChapterHead id="azzarqa" />
          <Reveal as="div" className={cn(MEASURE, "text-center mb-[calc(var(--rhythm)*2)]")}>
            <BodyProse text={ABOUT.palestine} />
          </Reveal>
          <WholeRow
            photos={[
              {
                src: "/img/about/03-stephen-on-cairn.jpg",
                alt: "Stephen standing barefoot on a stone cairn in the desert",
                width: 1536,
                height: 2048,
                sizes: "(min-width: 640px) 36vw, 100vw",
              },
              {
                src: "/img/about/07-az-zarqa-students.jpg",
                alt: "Stephen seated among a group of children, the mandalas they made held up around them",
                width: 920,
                height: 689,
                sizes: "(min-width: 640px) 64vw, 100vw",
              },
            ]}
          />
        </section>

        {/* 16 · THE STUDIO AS IT STOOD — the closing plate, and a genuinely NEW
            one. `welcome/04-paintings-collection.jpg` has sat on disk unused
            since May; CLAUDE.md's pending list has carried it this whole time
            as "kept on disk specifically for an About-page section we discussed
            but haven't built" (open item #8). This is that section.

            It earns the last word better than any portrait could: nine finished
            canvases propped around the shed at Phoenix Place, the geometric
            solids still hanging from the roof, a work lamp on — the life's work
            in the room that made it. Full-bleed, because it is the only image
            on the page that should be allowed to fill the frame, and it is the
            last thing the reader sees. The caption is a plain place label, the
            same convention the page already uses for Anegada and the Virgin
            Islands. */}
        <section>
          <Reveal as="figure" className="m-0 w-full">
            <div className={BAND_H}>
              <ImageReveal
                src="/img/welcome/04-paintings-collection.jpg"
                alt="Nine large mandala canvases propped around the walls of Stephen's studio, geometric wire solids hanging from the roof beams and a work lamp lit beside them"
                fill
                edges="none"
                parallax={0}
                zoom={1}
                objectPosition="center"
                shadow=""
                sizes="100vw"
                className="h-full"
              />
            </div>
            <figcaption className={cn(CAPTION_P, CONTAINER, "text-center", GAP_1)}>
              Phoenix Place, Lewes
            </figcaption>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
};
