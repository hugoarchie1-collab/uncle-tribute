import { useState, type CSSProperties, type ReactNode } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { ImageReveal } from "../components/ImageReveal";
import { LoopFilm } from "../components/LoopFilm";
import { AssetImage } from "../components/AssetImage";
import { MagneticLink } from "../components/MagneticLink";
import { PrintTile } from "../components/PrintTile";
import { Seo } from "../components/Seo";
import {
  ABOUT,
  BIRTH_DATE,
  CREDENTIALS,
  DEATH_DATE,
  INTERVIEW,
  LIFE_DATES,
} from "../data/content";
import { PAINTINGS, type Painting } from "../data/paintings";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_MUTED, EYEBROW_TIGHT, TITLE, SUBTITLE } from "../components/ui/tokens";

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

// ─── HOME'S LAYOUT + TYPE CANON (copied verbatim from Welcome.tsx) ───────────
/** Home's section container. */
const CONTAINER =
  "mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[2360px] 4xl:max-w-[3300px] px-4 sm:px-6 md:px-8 lg:px-12";
/** Home's ONE wide near-edge reading measure. */
const MEASURE = "mx-auto max-w-[1280px] 2xl:max-w-[1520px] 3xl:max-w-[1780px] 4xl:max-w-[2040px]";
/** Home's body paragraph: ~20px sans, justified, last line centred, hyphenated. */
const BODY_P =
  "font-sans font-normal text-[clamp(20px,0.7vw+13px,30px)] leading-[1.5] text-ink-soft m-0 mb-4 md:mb-5 last:mb-0 text-pretty text-justify [text-align-last:center] hyphens-auto";
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
  className = "mb-4 md:mb-5",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  className?: string;
}) => (
  <Reveal as="div" className={cn("text-center", className)}>
    {eyebrow && <p className={cn(EYEBROW, "m-0 mb-3")}>{eyebrow}</p>}
    <h2 className={cn(TITLE, MEASURE, "my-0 hero-text-shadow")}>{title}</h2>
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
const SideBySide = ({
  src,
  alt,
  position,
  sizes = "(min-width:768px) 34vw, 64vw",
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
    className="grid grid-cols-1 md:grid-cols-[clamp(400px,34vw,540px)_1fr] items-stretch gap-8 md:gap-12 lg:gap-16"
  >
    <figure className="relative m-0 mx-auto w-[64%] max-w-[300px] md:w-full md:max-w-none md:h-auto overflow-hidden rounded-[4px] ring-1 ring-line">
      <AssetImage
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        sizes={sizes}
        className="block w-full h-auto md:absolute md:inset-0 md:h-full md:w-full md:object-cover"
        style={{ objectPosition: position }}
      />
    </figure>
    <div className="w-full flex flex-col items-start justify-start text-left gap-4 md:gap-5 3xl:gap-7 4xl:gap-9">
      {children}
    </div>
  </Reveal>
);

// ─── DisplayPull — Home's two-tier pull-quote ("There is a star…") ───────────
const DisplayPull = ({ lead, follow }: { lead: string; follow?: string }) => (
  <Reveal delay={0.05} className="my-10 md:my-14 text-center">
    <blockquote className="m-0 hero-text-shadow">
      <span
        className="block mx-auto font-display font-semibold text-ink text-balance"
        style={{
          fontVariationSettings: '"opsz" 48, "wght" 600',
          fontWeight: 600,
          fontSize: "clamp(44px, 8vw, 104px)",
          letterSpacing: "-0.045em",
          lineHeight: 0.98,
        }}
      >
        {lead}
      </span>
      {follow && (
        <span
          className="block mx-auto font-display font-normal italic text-ink/90 text-balance"
          style={{
            fontVariationSettings: '"opsz" 40, "wght" 400',
            fontWeight: 400,
            fontSize: "clamp(28px, 5.5vw, 60px)",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            marginTop: "clamp(12px, 1.8vw, 28px)",
          }}
        >
          {follow}
        </span>
      )}
    </blockquote>
  </Reveal>
);

// ─── DisplayClose — Home's two-tier close ("Everything you think…") ──────────
const DisplayClose = ({ lead, follow, accentStop = true }: { lead: string; follow?: string; accentStop?: boolean }) => {
  const leadBody = accentStop && lead.endsWith(".") ? lead.slice(0, -1) : lead;
  return (
    <Reveal delay={0.1} className="text-center">
      <p className={cn(MEASURE, "m-0 text-center hero-text-shadow")}>
        <span
          className="block font-display text-ink text-balance mx-auto"
          style={{
            fontVariationSettings: '"opsz" 48, "wght" 600',
            fontWeight: 600,
            fontSize: "clamp(42px, 10.5vw, 68px)",
            letterSpacing: "-0.03em",
            lineHeight: 1.02,
          }}
        >
          {leadBody}
          {accentStop && lead.endsWith(".") && <span className="text-accent">.</span>}
        </span>
        {follow && (
          <span
            className="block font-display font-normal italic text-ink-muted text-balance mx-auto mt-4 md:mt-6"
            style={{
              fontVariationSettings: '"opsz" 36, "wght" 400',
              fontWeight: 400,
              fontSize: "clamp(25px, 6.2vw, 44px)",
              letterSpacing: "-0.015em",
              lineHeight: 1.2,
            }}
          >
            {follow}
          </span>
        )}
      </p>
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
const openingLede = (openingSplit > 0 ? opening.slice(0, openingSplit + 1) : opening).replace(/ (\S+)$/, " $1");
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
const describedHead = describedSplit > 0 ? described.slice(0, describedSplit + 1) : described;
const describedBody = describedSplit > 0 ? described.slice(describedSplit + 2) : "";

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

// The four traditions, named exactly as in ABOUT.legacy[0].
const TRADITIONS = [
  "Ancient Insular Island Arts",
  "The Rose Windows of Medieval Europe",
  "The Art of Persian Geometry",
  "The Sacred Mandala of Tibet",
];

// The facts ledger — Home's material-spec strip, filled with the estate's
// verifiable facts (dates from content.ts; the rest verbatim from ABOUT.legacy
// and CREDENTIALS).
const FACTS: [string, string][] = [
  ["Born", `${BIRTH_DATE} — Staffordshire`],
  ["Died", DEATH_DATE],
  ["Studio", "Phoenix Place, Lewes"],
  ["Academy", "TAGA — The Art of Geometry Academy · 2010"],
  ["Exhibited", CREDENTIALS.slice(0, 3).join(" · ")],
  ["Commissioned", CREDENTIALS.slice(3, 5).join(" · ")],
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
        className="m-0 mb-3 md:mb-4 font-display italic font-normal text-ink-muted text-balance text-[clamp(20px,1.6vw,32px)] leading-[1.35] hero-text-shadow"
        style={{ fontVariationSettings: '"opsz" 36, "wght" 400' }}
      >
        {item.q}
      </p>
      {isBeat ? (
        <DisplayClose lead={`“${item.a}”`} accentStop={false} />
      ) : (
        <BodyProse text={item.a} />
      )}
    </Reveal>
  );
};

export const About = () => {
  // Six paintings, a FRESH random six on every mount — Home's featured-grid
  // draw, verbatim (Fisher–Yates on a COPY; a lazy initialiser so the impure
  // draw runs exactly once per mount). Rendered with the SHARED PrintTile —
  // never a hand-rolled tile (Hugo caught the per-page drift twice).
  const [featured] = useState<Painting[]>(() => {
    const pool = [...PAINTINGS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 6);
  });

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
      <main className="relative isolate z-10 overflow-x-clip space-y-10 md:space-y-12 lg:space-y-14 pt-6 md:pt-8 pb-8 md:pb-10">
        {/* 1 · FRONT COVER — Home's hero, beat for beat: the WHOLE photograph
            first at full content width (his best landscape photograph — sharp,
            at work, the mandala behind him), then the name set as the page's
            dominant statement with the one italic subordinate, then the two
            pills. Nothing is cropped; the photo box matches its native 3:2. */}
        <section className="relative isolate w-full overflow-hidden">
          <div className={cn(CONTAINER, "flex flex-col w-full")}>
            <Reveal as="div" className="order-2 mt-8 md:mt-10 text-center">
              <h1 className={cn("font-display tracking-[-0.03em] text-ink m-0 text-balance hero-text-shadow", MEASURE)}>
                <span
                  className="block text-[clamp(56px,11vw,176px)] leading-[0.94]"
                  style={{ fontVariationSettings: '"opsz" 48, "wght" 700', fontWeight: 700 }}
                >
                  Stephen Meakin
                </span>
                <span className="block font-normal italic text-[clamp(30px,5vw,72px)] leading-[1.06] mt-4 md:mt-6 text-ink/95">
                  &mdash; mandala artist and sacred geometer.
                </span>
              </h1>
              <div className="mt-6 md:mt-7 flex flex-wrap items-center justify-center gap-3">
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

            <Reveal
              as="figure"
              className="order-1 m-0 mt-2 md:mt-3 mx-auto w-full max-w-[min(1400px,116svh)] 2xl:max-w-[min(1680px,116svh)] 3xl:max-w-[min(2100px,116svh)] 4xl:max-w-[min(2600px,116svh)]"
            >
              <ImageReveal
                src="/img/about/28-at-the-drafting-table.jpg"
                alt="Stephen Meakin leaning over a print on the drafting table in his studio, a large mandala on the wall behind him"
                eager
                aspect="aspect-[3/2]"
                edges="none"
                parallax={0}
                zoom={1}
                objectPosition="center"
                shadow=""
                sizes="(min-width: 1400px) 1320px, 92vw"
              />
            </Reveal>
          </div>
        </section>

        {/* 2 · THE OPENING PASSAGE — Home's "A reminder" essay: eyebrow, the
            first sentence as the illuminated lede, the paragraph's remainder at
            reading size, then its closing two sentences lifted as the two-tier
            pull. Every word of ABOUT.opening[0] appears exactly once. */}
        <section className={cn(CONTAINER, "relative isolate")}>
          <Reveal as="header" className="mb-3 md:mb-4 text-center">
            <p className={cn(EYEBROW, "m-0 mb-3")}>In memoriam · {LIFE_DATES}</p>
            <p
              className="font-display font-semibold tracking-[-0.03em] text-ink m-0 mx-auto max-w-[30ch] text-balance"
              style={{
                fontVariationSettings: '"opsz" 48, "wght" 600',
                fontSize: "clamp(32px, 5.2vw, 64px)",
                lineHeight: 1.04,
                textShadow: "0 1px 18px rgba(10,9,8,0.5), 0 1px 3px rgba(10,9,8,0.4)",
              }}
            >
              {openingLede}
            </p>
            {openingBody && (
              <p className={cn(BODY_P, MEASURE, "mt-3 md:mt-4")} style={BODY_SHADOW}>
                {openingBody}
              </p>
            )}
          </Reveal>
          {openingPullLead && <DisplayPull lead={openingPullLead} follow={openingPullFollow} />}
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
            <p className={cn(EYEBROW, "m-0")}>As he described himself &mdash;</p>
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
          <TileRow cols={2} className="mt-6 md:mt-8">
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
          <TileRow cols={2} className="mt-6 md:mt-8">
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
          <TileRow cols={3} className="mt-6 md:mt-8">
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
          <div className="mt-10 md:mt-14">
            <DisplayClose lead={firstMandalaLead} follow={firstMandalaFollow} />
          </div>
        </section>

        <section className={CONTAINER}>
          <Reveal as="div" className="text-center mb-4 md:mb-5">
            <p className={cn(EYEBROW, "m-0")}>Anegada · 1995</p>
          </Reveal>
          <Reveal as="div" className={cn(MEASURE, "text-center")}>
            <BodyProse text={anegadaBefore} />
          </Reveal>
          <DisplayPull lead={anegadaQuoteLead} follow={anegadaQuoteFollow} />
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
            <ChapterHead id="ritual" className="mb-8 md:mb-10" />
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
            <ul className="list-none p-0 m-0 mt-9 md:mt-12 grid grid-cols-1 sm:grid-cols-2 gap-x-10 md:gap-x-16">
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
          <Reveal as="figure" className="relative m-0 mt-8 md:mt-10 mx-auto w-full max-w-[440px] md:max-w-[540px] 2xl:max-w-[600px]">
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
          <Reveal as="div" className={cn(MEASURE, "text-center mb-6 md:mb-8")}>
            <BodyProse text={ABOUT.legacy[0]} />
          </Reveal>
          <Reveal as="ul" className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 md:gap-x-12 gap-y-6 md:gap-y-7 list-none p-0 m-0 mb-6 md:mb-8">
            {TRADITIONS.map((name, i) => (
              <li
                key={name}
                className="group m-0 border-t border-line pt-4 md:pt-5 transition-colors duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:border-accent"
              >
                <p className={cn(EYEBROW_MUTED, "m-0 mb-2")}>{ROMAN[i]}</p>
                <p
                  className="font-display text-ink text-[clamp(22px,2.6vw,36px)] tracking-[-0.02em] leading-[1.1] m-0 transition-colors duration-300 group-hover:text-accent text-balance"
                  style={{ fontVariationSettings: '"opsz" 48, "wght" 700', fontWeight: 700 }}
                >
                  {name}
                </p>
              </li>
            ))}
          </Reveal>
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
            <p className={cn(EYEBROW, "m-0")}>{chapter("exhibitions").eyebrow}</p>
            <h2 className={SIDE_H2} style={OPSZ40}>
              {chapter("exhibitions").title}
            </h2>
            <SideProse text={ABOUT.legacy[1]} per={2} />
          </SideBySide>
          <Reveal as="ul" className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 md:gap-x-12 gap-y-6 md:gap-y-7 list-none p-0 m-0 mt-10 md:mt-14">
            {CREDENTIALS.map((item) => (
              <li
                key={item}
                className="group m-0 border-t border-line pt-4 md:pt-5 transition-colors duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:border-accent"
              >
                <p
                  className="font-display text-ink text-[clamp(20px,2vw,32px)] tracking-[-0.02em] leading-[1.15] m-0 transition-colors duration-300 group-hover:text-accent text-balance"
                  style={{ fontVariationSettings: '"opsz" 48, "wght" 700', fontWeight: 700 }}
                >
                  {item}
                </p>
              </li>
            ))}
          </Reveal>
        </section>

        <Band
          src="/img/about/36-mystic-rose-exhibition.jpg"
          alt="A bright gallery room hung with framed paintings, sculptural pieces standing on plinths"
          position="center 35%"
        />

        {/* 11 · SIX PAINTINGS — Home's featured grid, the page's buy path,
            placed where the biography turns to the work. The SHARED PrintTile,
            a fresh random six per visit, the same heading Home uses. */}
        <section className={CONTAINER}>
          <SectionHead eyebrow="From the hand" title="Six paintings from a lifetime at the compass." />
          <Reveal as="div" className={cn(TILE_GRID, "grid-cols-2 md:grid-cols-3 mb-5 md:mb-6")}>
            {featured.map((p) => (
              <PrintTile
                key={p.id}
                painting={p}
                sizes="(min-width: 1400px) 420px, (min-width: 640px) 30vw, 90vw"
              />
            ))}
          </Reveal>
          <Reveal as="div" className="text-center">
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
          <Reveal as="figure" delay={0.08} className="relative m-0 mt-8 md:mt-10 mx-auto w-full max-w-[720px] 2xl:max-w-[820px]">
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
          <Reveal as="div" className="text-center mb-4 md:mb-5">
            <p className={cn(EYEBROW, "m-0")}>From the design archive</p>
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
          <ChapterHead id="academy" className="mb-6 md:mb-8" />
          <DisplayClose lead={ABOUT.legacy[2]} />
          <Reveal as="div" className={cn(MEASURE, "text-center mt-8 md:mt-10")}>
            <BodyProse text={ABOUT.academyQuote} />
          </Reveal>
          <Reveal as="div" className={cn(TILE_GRID, "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mt-6 md:mt-8")}>
            <Tile
              src="/img/about/08-taga-group.jpg"
              alt="Stephen Meakin with four Academy participants, each holding up the mandala board they made"
              aspect="aspect-[4/3]"
              position="center"
              sizes="(min-width: 768px) 31vw, (min-width: 640px) 48vw, 100vw"
            />
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
              src="/img/about/02-painting-table.jpg"
              alt="Stephen Meakin and a collaborator working on a large blue and orange mandala print at the studio table"
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
          <Reveal as="div" className={cn(MEASURE, "text-center mb-6 md:mb-8")}>
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
      </main>

      <Footer />
    </div>
  );
};
