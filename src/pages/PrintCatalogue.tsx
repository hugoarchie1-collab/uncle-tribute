import { useEffect } from "react";
import {
  PAINTINGS,
  PRINT_TIERS,
  ORIGINAL_PROVENANCE,
  ESTATE_AUTHENTICATION,
  COLLECTIONS,
  FRAME_STYLES,
  GLAZING_OPTIONS,
  EMBELLISHMENT_NOTE,
} from "../data/paintings";
import {
  ABOUT,
  WELCOME,
  INTERVIEW,
  MEMORIAL_QUOTE,
  CREDENTIALS,
  LIFE_DATES,
} from "../data/content";
import { COLOURWAY_TINTS, DEFAULT_TINT } from "../lib/colourwayTints";
import { asset, webp, webpSrcSet } from "../lib/asset";

/**
 * PRINT-ONLY catalogue — the ENTIRE site rendered for print (cover → the story
 * of Stephen → collections → all ten paintings → editions → memorial → back),
 * every page drawn with the site's real fonts, tokens, tints and content, so
 * the PDF IS the website rather than a hand-rebuilt approximation.
 *
 * Reached only at /print-catalogue, printed to PDF via headless Chrome. Uses
 * its own `.cat-*` classes so the global `@media print` rule never touches it.
 */

// ── product-page type tokens (verbatim from PaintingDetail) ──────────────────
const SPEC_LABEL =
  "font-sans text-[14px] font-bold tracking-[0.06em] text-ink-muted";
const SPEC_VALUE = "font-sans text-[16.5px] leading-[1.4] text-ink";
const EYEBROW = "font-sans text-[14.5px] font-bold tracking-[0.14em] text-accent";
const EYEBROW_MUTED =
  "font-sans text-[14.5px] font-bold tracking-[0.08em] text-ink-muted";
const DISPLAY =
  "font-display font-semibold tracking-[-0.02em] text-ink leading-[1.0]";

const gbp = (pence: number) => `£${Math.round(pence / 100).toLocaleString()}`;
const collectionTitle = (id: string) =>
  COLLECTIONS.find((c) => c.id === id)?.title.split(" — ")[0] ?? "";
const src = (p: string) => asset(p);

const PAVO = "img/paintings/pavo-persian-indigo-whole-v3.webp";

// Peacock atmosphere behind editorial pages — the site's own PavoBackdrop, dimmed.
// Editorial ground — the SAME soft "painted wall, lit" tint the product pages
// use (a calm gradient over near-black, NOT a busy repeating photo), so cream
// text is always legible. A different colour rotates onto each page so the book
// never repeats the same image. `_g` is reset at the top of PrintCatalogue so
// the sequence is deterministic per render.
const GROUND_PALETTE: { wall: string; halo: string }[] = [
  { wall: "#28314f", halo: "#6f80bd" }, // indigo
  { wall: "#472634", halo: "#b06f89" }, // rose
  { wall: "#28391a", halo: "#6f9058" }, // moss
  { wall: "#452d10", halo: "#a97c47" }, // amber
  { wall: "#382c4a", halo: "#8f78b3" }, // plum
  { wall: "#4a2724", halo: "#b4706a" }, // wine
];
let _g = 0;
function PavoGround(_props: { dim?: number }) {
  const t = GROUND_PALETTE[_g++ % GROUND_PALETTE.length];
  return (
    <div
      className="cat-ground"
      aria-hidden
      style={{ ["--cat-wall" as string]: t.wall, ["--cat-halo" as string]: t.halo }}
    >
      <div className="cat-wall-layer" />
      <div className="cat-halo-layer" />
    </div>
  );
}


const Seal = ({ w = 78 }: { w?: number }) => (
  <img
    src={src("logo/logo-seal-v1-w1024.png")}
    alt=""
    aria-hidden
    style={{ width: w, height: w, objectFit: "contain", display: "block" }}
  />
);

// ── PAGES ────────────────────────────────────────────────────────────────────

function CoverPage() {
  // Dark site-clone cover. The FULL garden-galaxy intro-film frame is shown
  // WHOLE as a soft-edged band across the middle (nothing cropped — Hugo: "use
  // the full image so you can see it all"); the masthead sits on clean dark
  // ABOVE it, the catalogue line BELOW — so no type is ever dumped on the photo.
  return (
    <section className="cat-page cat-dark" style={{ background: "rgb(10,9,8)" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          textAlign: "center",
          padding: "20mm 0",
        }}
      >
        {/* MASTHEAD — on clean dark */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Seal w={64} />
          <h1
            className="font-display text-ink"
            style={{
              fontSize: 76,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 0.98,
              margin: "16px 0 0",
              fontVariationSettings: '"opsz" 144, "wght" 700',
            }}
          >
            The SEM Experience
          </h1>
          <p className="font-display italic" style={{ fontSize: 24, color: "rgb(var(--accent))", margin: "10px 0 0" }}>
            The Art of Stephen Meakin
          </p>
        </div>

        {/* FULL intro-film frame — whole scene, feathered into the dark. The
            feather is BAKED into the PNG alpha (CSS masks shatter in print-to-pdf). */}
        <img
          src={src("img/catalogue/cover-garden.png")}
          alt="Stephen Meakin's Wild Rose mandala on the easel in the garden"
          style={{ width: "100%", height: "auto", display: "block" }}
        />

        {/* CATALOGUE LINE — on clean dark */}
        <div>
          <div style={{ width: 54, height: 2, background: "rgb(var(--accent))", margin: "0 auto 12px" }} />
          <p className="font-sans text-ink" style={{ fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase", margin: 0 }}>
            Summer 2026 · The Catalogue
          </p>
          <p className="font-sans text-ink-muted" style={{ fontSize: 13, letterSpacing: "0.24em", textTransform: "uppercase", margin: "8px 0 0", opacity: 0.9 }}>
            Stephen Meakin · {LIFE_DATES}
          </p>
        </div>
      </div>
    </section>
  );
}

// A full-bleed page that IS a captured section of the live site (chrome-free
// via ?bare). Used to clone real site moments — the About masthead, etc. —
// straight into the catalogue so they read exactly like themandalacompany.com.
function ClonePage({ src: imgPath, alt }: { src: string; alt: string }) {
  return (
    <section className="cat-page cat-dark" style={{ background: "rgb(10,9,8)" }}>
      <img
        src={src(imgPath)}
        alt={alt}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 0%" }}
      />
      {/* Soft fade to dark at the foot so the section seam dissolves into the peacock ground. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          insetInline: 0,
          bottom: 0,
          height: "22%",
          background: "linear-gradient(180deg, rgba(10,9,8,0) 0%, rgba(10,9,8,0.55) 60%, rgba(10,9,8,0.92) 100%)",
        }}
      />
    </section>
  );
}

function QuotePage({
  quote,
  cite,
  eyebrow,
}: {
  quote: string;
  cite?: string;
  eyebrow?: string;
}) {
  // Length-fitted size ramp — the whole point is that ALL three real call-sites
  // (6-word "Ten mandalas…", 17-word opening line, 55-word / 325-char memorial)
  // land ENORMOUS and neither overflows nor under-fills the fixed 210mm page.
  // Floor is 48px (never timid); ceiling 96px. Buckets + height verified against
  // the three verbatim strings at an ~843px measure: memorial → 48px/10 lines
  // (~560px tall, fits the ~620px middle band), opening → 76px, "Ten…" → 96px.
  const len = quote.length;
  const size =
    len < 46 ? 96 : len < 90 ? 76 : len < 150 ? 62 : len < 240 ? 54 : 48;
  const lh = len < 90 ? 1.03 : len < 240 ? 1.1 : 1.16;

  return (
    <section className="cat-page qt-page cat-dark">
      {/* Rich, saturated peacock ground + a huge off-canvas seal ghost so the
          field is never empty behind the words, and a warm vignette that drops
          the corners into ink so the type always sits in light. */}
      <PavoGround dim={0.52} />
      <div className="qt-vignette" aria-hidden />
      <img
        className="qt-seal-ghost"
        src={src("logo/logo-seal-v1-w1024.png")}
        alt=""
        aria-hidden
      />

      <div className="qt-inner">
        {/* TOP FRAME — eyebrow locked to the top edge on a bold accent rule */}
        <div className="qt-topframe">
          <span className="qt-eyebrow font-sans">
            {eyebrow ?? "The Art of Stephen Meakin"}
          </span>
          <span className="qt-topline" aria-hidden />
          <span className="qt-topdot" aria-hidden />
        </div>

        {/* THE QUOTE — enormous Fraunces italic filling the measure edge to edge,
            a giant accent open-quote pulled tight to the first word so nothing
            floats in a void. */}
        <div className="qt-body">
          <span className="qt-mark font-display" aria-hidden>
            &ldquo;
          </span>
          <blockquote
            className="qt-quote font-display italic text-ink"
            style={{ fontSize: size, lineHeight: lh }}
          >
            {quote}
          </blockquote>
        </div>

        {/* BOTTOM FRAME — cite (or wordmark) + dates locked to the base edge */}
        <div className="qt-botframe">
          {cite ? (
            <div className="qt-cite-wrap">
              <Seal w={44} />
              <span className="qt-cite font-sans">{cite}</span>
            </div>
          ) : (
            <span className="qt-cite qt-cite-muted font-sans">
              The Mandala Company
            </span>
          )}
          <span className="qt-botline" aria-hidden />
          <span className="qt-dates font-sans">{LIFE_DATES}</span>
        </div>
      </div>
    </section>
  );
}


function StoryPage({
  eyebrow,
  title,
  paras,
  photo,
  photoSide = "left",
  attribution,
}: {
  eyebrow: string;
  title: string;
  paras: string[];
  photo?: string;
  photoSide?: "left" | "right";
  attribution?: string;
}) {
  // No photo → a commanding full-page display layout, prose across two columns.
  if (!photo) {
    return (
      <section className="cat-page">
        <PavoGround dim={0.4} />
        <div className="st-solo">
          <div className="st-solo-head">
            <p className={EYEBROW} style={{ margin: 0 }}>{eyebrow}</p>
            <h2 className={DISPLAY} style={{ fontSize: 78, lineHeight: 0.95, margin: "10px 0 0" }}>{title}</h2>
            <div className="st-rule" style={{ marginTop: 16 }} />
          </div>
          <div className="st-solo-body">
            <div className="st-prose st-prose-lg">
              {paras.map((p, i) => (
                <p key={i} data-drop={i === 0 ? "1" : undefined}>{p}</p>
              ))}
            </div>
          </div>
          {attribution && (
            <div className="st-solo-attr">
              <p className="font-display italic text-accent" style={{ fontSize: 19, textAlign: "right", margin: 0 }}>— {attribution}</p>
            </div>
          )}
        </div>
      </section>
    );
  }
  const plate = (
    <div className={`st-plate st-plate-${photoSide}`}>
      <picture>
        <source srcSet={webpSrcSet(photo) ?? src(webp(photo))} type="image/webp" />
        <img src={src(photo)} alt="" aria-hidden />
      </picture>
      <div className="st-plate-fade" />
      <div className="st-plate-seam" />
    </div>
  );
  const col = (
    <div className="st-col">
      <div className="st-col-head">
        <p className={EYEBROW} style={{ margin: 0 }}>{eyebrow}</p>
        <h2 className={DISPLAY} style={{ fontSize: 68, lineHeight: 0.96, margin: "12px 0 0" }}>{title}</h2>
        <div className="st-rule" style={{ marginTop: 16 }} />
      </div>
      <div className="st-prose">
        {paras.map((p, i) => (
          <p key={i} data-drop={i === 0 ? "1" : undefined}>{p}</p>
        ))}
      </div>
      {attribution && (
        <p className="st-attr font-display italic text-accent" style={{ fontSize: 16, margin: 0 }}>— {attribution}</p>
      )}
    </div>
  );
  return (
    <section className="cat-page">
      <PavoGround dim={0.34} />
      <div className={`st-spread st-spread-photo-${photoSide}`}>
        {photoSide === "left" ? (<>{plate}{col}</>) : (<>{col}{plate}</>)}
      </div>
    </section>
  );
}

function InterviewPage() {
  // Aspiration + tea are the punchy one-liners; the "how long" answer gives texture.
  const qa = [INTERVIEW.qa[4], INTERVIEW.qa[5], INTERVIEW.qa[3]];
  return (
    <section className="cat-page">
      <PavoGround dim={0.32} />
      <div style={{ position: "absolute", inset: 0, display: "flex", zIndex: 2 }}>
        <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", padding: "20mm 12mm 18mm 22mm" }}>
          <p className={EYEBROW} style={{ margin: 0 }}>{INTERVIEW.eyebrow}</p>
          <h2 className={DISPLAY} style={{ fontSize: 62, lineHeight: 0.96, margin: "10px 0 0" }}>
            In his{" "}
            <span style={{ fontStyle: "italic", color: "rgb(var(--accent))" }}>own words</span>
          </h2>
          <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 22, marginTop: 24 }}>
            {qa.map(({ q, a }, i) => {
              const short = a.length < 60;
              return (
                <div key={i} style={{ borderLeft: "3px solid rgb(var(--accent))", paddingLeft: 18 }}>
                  <p className="font-sans text-accent" style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.01em", margin: 0 }}>{q}</p>
                  {short ? (
                    <p className="font-display italic text-ink" style={{ fontSize: 34, lineHeight: 1.08, margin: "8px 0 0" }}>&ldquo;{a}&rdquo;</p>
                  ) : (
                    <p className="font-sans text-ink" style={{ fontSize: 17.5, lineHeight: 1.5, margin: "8px 0 0", maxWidth: 520 }}>{a}</p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="font-sans" style={{ fontSize: 14, margin: "16px 0 0" }}>
            <span className="text-ink" style={{ fontWeight: 700 }}>Stephen Meakin</span>
            <span className="text-ink-muted">{"  \u00b7  "}{INTERVIEW.source.publication} \u00b7 {INTERVIEW.source.date}</span>
          </p>
        </div>
        <div style={{ flex: "0 0 42%", position: "relative", overflow: "hidden" }}>
          <picture>
            <source srcSet={webpSrcSet("img/about/13-stephen-outdoor-portrait.jpg") ?? src(webp("img/about/13-stephen-outdoor-portrait.jpg"))} type="image/webp" />
            <img src={src("img/about/13-stephen-outdoor-portrait.jpg")} alt="" aria-hidden style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </picture>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgb(var(--bg)) 0%, rgba(10,9,8,0.25) 24%, transparent 58%)" }} />
        </div>
      </div>
    </section>
  );
}
const TRADITIONS: [string, string][] = [
  ["Insular Island Arts", "The knotwork and illuminated geometry of the ancient Celtic and Insular world."],
  ["Rose Windows", "The radiant stained-glass geometry of the great cathedrals of Medieval Europe."],
  ["Persian Geometry", "The infinite, transcendent pattern of the Islamic and Persian tradition."],
  ["The Sacred Mandala", "The palace geometry of Tibet — the cosmos drawn as a place of meditation."],
];

function TraditionsPage() {
  return (
    <section className="cat-page">
      <PavoGround dim={0.32} />
      {/* extra deep-blue vignette so the type reads bold over the peacock ground */}
      <div className="tr-vignette" />
      <div className="cat-inner tr-inner">
        {/* ── Masthead band: eyebrow + MASSIVE headline + henosis intro ── */}
        <div className="tr-head">
          <div className="tr-head-lead">
            <p className={EYEBROW} style={{ margin: 0, letterSpacing: "0.2em" }}>
              His mission
            </p>
            <h2 className="tr-title font-display font-semibold text-ink">
              Four traditions,
              <br />
              <span className="tr-title-em font-display italic text-accent">
                woven into one
              </span>
            </h2>
          </div>
          <p className="tr-intro font-sans text-ink">
            His mission was to transcend cultural boundaries and weave together
            four key components of the world's sacred art — celebrating the
            universe from{" "}
            <span className="font-display italic text-accent">
              snowflake to supernova
            </span>
            , an art of visual henosis in which everything is connected.
          </p>
        </div>

        {/* ── Four full-height numbered columns, filling the page floor-to-baseline ── */}
        <div className="tr-grid">
          {TRADITIONS.map(([t, d], i) => (
            <div key={t} className="tr-col">
              <span className="tr-num font-display italic text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="tr-col-body">
                <p className="tr-col-title font-display font-semibold text-ink">
                  {t}
                </p>
                <div className="tr-col-rule" />
                <p className="tr-col-desc font-sans text-ink">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CreditsPage() {
  // Split each verbatim credential into its lead (venue) + trailing detail on
  // the " · " separator so the venue can be set huge while the place/scope sits
  // beneath it — the words are NEVER altered, only laid out.
  const rows = CREDENTIALS.map((c) => {
    const [lead, ...rest] = c.split(" · ");
    const [venue, place] = lead.split(", ");
    return {
      full: c,
      venue: venue ?? lead,
      place: place ?? "",
      detail: rest.join(" · "),
    };
  });

  return (
    <section className="cat-page cr-page cat-dark">
      {/* Layered ground: peacock atmosphere + a full-bleed gallery plate that
          bleeds off the right edge, dissolving into the dark. */}
      <img
        className="cat-bg"
        src={src(PAVO)}
        alt=""
        aria-hidden
        style={{ filter: "brightness(0.3) saturate(1.15)" }}
      />
      <img
        className="cr-plate"
        src={src("img/about/01-stephen-at-gallery.jpg")}
        alt=""
        aria-hidden
      />
      <div className="cr-plate-veil" />
      <div className="cr-scrim" />

      <div className="cr-inner">
        {/* LEFT — the masthead column, filling top to bottom */}
        <div className="cr-masthead">
          <div className="cr-mast-top">
            <p className={EYEBROW} style={{ margin: 0, letterSpacing: "0.16em" }}>
              The provenance
            </p>
            <h2 className="cr-title font-display font-semibold text-ink">
              Exhibited
              <br />
              <span className="cr-amp text-accent">&amp;</span> commissioned
            </h2>
            <div className="cat-rule" style={{ margin: "22px 0 24px" }} />
            <p
              className="font-sans text-ink"
              style={{ fontSize: 16, lineHeight: 1.62, maxWidth: 270, margin: 0, opacity: 0.88 }}
            >
              From a courtyard gallery in old Dubai to a Formula&nbsp;1 grid and the
              walls of twelve hundred hospices — where the work has hung, and what
              it was made for.
            </p>
          </div>
          <div className="cr-mast-foot">
            <Seal w={58} />
            <p className="font-sans text-ink-muted" style={{ fontSize: 12.5, letterSpacing: "0.18em", textTransform: "uppercase", margin: "12px 0 0" }}>
              Six documented records
            </p>
          </div>
        </div>

        {/* RIGHT — the credential ledger, distributed edge to edge, filling the height */}
        <ol className="cr-ledger">
          {rows.map((r, i) => (
            <li key={r.full} className="cr-row">
              <span className="cr-num font-display text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="cr-body">
                <span className="cr-venue font-display font-semibold text-ink">
                  {r.venue}
                </span>
                <span className="cr-meta font-sans text-ink-muted">
                  {r.place && <span className="cr-place">{r.place}</span>}
                  {r.detail && (
                    <span className="cr-detail text-accent">{r.detail}</span>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CollectionDivider({ n, title, sub, img }: { n: string; title: string; sub: string; img: string }) {
  return (
    <section className="cat-page dv-page cat-dark">
      {/* Full-bleed scene, brighter than the editorial grounds so it reads as
          cinematic imagery — a cinematic vignette + baked gradient carry legibility. */}
      <img
        className="cat-bg dv-bg"
        src={src(img)}
        alt=""
        aria-hidden
        style={{ filter: "brightness(0.72) saturate(1.08) contrast(1.04)" }}
      />
      <div className="dv-vignette" />
      <div className="dv-grad" />

      {/* Enormous ghost roman numeral, bled off the right edge — the framing device,
          dropped toward the floor so it anchors the massive title, not empty air. */}
      <span className="dv-ghost font-display" aria-hidden>{n}</span>

      <div className="dv-inner">
        {/* TOP framing band — bold eyebrow between two hairlines, edge to edge. */}
        <div className="dv-topband">
          <span className="dv-rule dv-rule-lead" />
          <span className="font-sans dv-eyebrow">The Collection · {n}</span>
          <span className="dv-rule dv-rule-trail" />
          <Seal w={44} />
        </div>

        {/* THE MASSIVE TITLE — bottom-anchored, fills the measure. */}
        <div className="dv-title-block">
          <h2 className="font-display dv-title">{title}</h2>
          <div className="dv-subrow">
            <span className="dv-subrule" />
            <p className="font-display italic text-ink dv-sub">{sub}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PaintingPage({ painting }: { painting: (typeof PAINTINGS)[number] }) {
  const original =
    painting.colourways.find((c) => c.isOriginal) ?? painting.colourways[0];
  const tint = COLOURWAY_TINTS[original.image] ?? DEFAULT_TINT;
  const tiers = PRINT_TIERS.filter((t) => t.available && !t.isOneOff);
  const tintVars = { "--cat-wall": tint.wall, "--cat-halo": tint.halo } as React.CSSProperties;

  return (
    <>
      {/* PLATE — the mandala shown BIG, filling the page in its own colourway
          atmosphere (zero empty space), with the title set into the free space. */}
      <section className="cat-page" style={tintVars}>
        <div className="cat-wall-layer" />
        <div className="cat-halo-layer" />
        {painting.id === "ophiuchus" ? (
          <>
            {/* Landscape mandala — fills the full width, title over a foot scrim. */}
            <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <picture>
                <source srcSet={webpSrcSet(original.image) ?? src(webp(original.image))} type="image/webp" />
                <img src={src(original.image)} alt={painting.title} style={{ display: "block", width: "297mm", height: "auto", maxHeight: "168mm", objectFit: "contain" }} />
              </picture>
            </div>
            <div aria-hidden style={{ position: "absolute", insetInline: 0, bottom: 0, height: "40%", zIndex: 2, background: "linear-gradient(180deg, rgba(10,9,8,0) 0%, rgba(10,9,8,0.78) 68%, rgba(10,9,8,0.94) 100%)" }} />
            <div style={{ position: "absolute", left: "18mm", right: "18mm", bottom: "16mm", zIndex: 3 }}>
              <p className={EYEBROW} style={{ margin: 0 }}>{collectionTitle(painting.collection)}</p>
              <h1 className="font-display italic font-semibold text-ink" style={{ fontSize: 56, lineHeight: 1.0, letterSpacing: "-0.02em", margin: "8px 0 0" }}>{painting.title}</h1>
              <p className="font-sans text-ink-muted" style={{ fontSize: 15, margin: "10px 0 0" }}>
                Stephen Meakin · 1966–2021{painting.year && !painting.year.includes("[") ? ` · ${painting.year}` : ""} · From {gbp(tiers[0].pricePence)}
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Square mandala — fills the FULL PAGE HEIGHT on the right (zero
                vertical void); title set into the left strip on the atmosphere. */}
            <div style={{ position: "absolute", right: 0, top: 0, height: "210mm", width: "210mm", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <picture>
                <source srcSet={webpSrcSet(original.image) ?? src(webp(original.image))} type="image/webp" />
                <img src={src(original.image)} alt={painting.title} style={{ display: "block", height: "210mm", width: "210mm", objectFit: "contain" }} />
              </picture>
            </div>
            <div style={{ position: "absolute", left: "13mm", top: 0, bottom: 0, width: "68mm", zIndex: 3, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <p className={EYEBROW} style={{ margin: 0 }}>{collectionTitle(painting.collection)}</p>
              <h1 className="font-display italic font-semibold text-ink" style={{ fontSize: 37, lineHeight: 1.06, letterSpacing: "-0.02em", margin: "12px 0 0", hyphens: "none", overflowWrap: "normal", wordBreak: "normal" }}>
                {painting.title}
              </h1>
              <div style={{ width: 54, height: 3, background: "rgb(var(--accent))", margin: "16px 0 0" }} />
              <p className="font-sans text-ink-muted" style={{ fontSize: 14.5, margin: "14px 0 0" }}>Stephen Meakin · 1966–2021</p>
              {painting.year && !painting.year.includes("[") && (
                <p className="font-sans text-ink-muted" style={{ fontSize: 14, margin: "4px 0 0" }}>{painting.year}{painting.location ? ` · ${painting.location}` : ""}</p>
              )}
              <p className="font-sans text-ink" style={{ fontSize: 14.5, margin: "16px 0 0", opacity: 0.9 }}>
                From {gbp(tiers[0].pricePence)}<br />{painting.colourways.length} colourway{painting.colourways.length > 1 ? "s" : ""}
              </p>
            </div>
          </>
        )}
      </section>

      {/* INFO — everything a reader needs, filling the whole page in two columns. */}
      <section className="cat-page" style={tintVars}>
        <div className="cat-wall-layer" />
        <div className="cat-halo-layer" />
        <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "grid", gridTemplateColumns: "1.06fr 0.94fr", gap: "14mm", padding: "17mm 20mm", alignContent: "stretch" }}>
          {/* LEFT — story */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
            <p className={EYEBROW_MUTED} style={{ margin: 0 }}>{collectionTitle(painting.collection)}</p>
            <h2 className="font-display italic font-semibold text-ink" style={{ fontSize: 46, lineHeight: 1.02, letterSpacing: "-0.02em", margin: "8px 0 0" }}>{painting.title}</h2>
            {painting.description && (
              <p className="font-sans text-ink" style={{ fontSize: 16, lineHeight: 1.58, margin: "16px 0 0", opacity: 0.92 }}>{painting.description}</p>
            )}
            {painting.artistQuote && (
              <p className="font-display italic text-ink" style={{ fontSize: 20, lineHeight: 1.34, margin: "16px 0 0" }}>&ldquo;{painting.artistQuote}&rdquo;</p>
            )}
          </div>
          {/* RIGHT — the facts, sizes, prices, colourways */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", borderLeft: "1px solid rgb(var(--ink)/0.16)", paddingLeft: "12mm" }}>
            <div>
              <dl className="cat-facts" style={{ marginTop: 0 }}>
                {painting.year && !painting.year.includes("[") && (
                  <><dt className={SPEC_LABEL}>Date</dt><dd className={SPEC_VALUE}>{painting.year}</dd></>
                )}
                {painting.size && (
                  <><dt className={SPEC_LABEL}>Original size</dt><dd className={SPEC_VALUE}>{painting.size}</dd></>
                )}
                {painting.location && (
                  <><dt className={SPEC_LABEL}>Painted in</dt><dd className={SPEC_VALUE}>{painting.location}</dd></>
                )}
                <dt className={SPEC_LABEL}>Original</dt>
                <dd className={`${SPEC_VALUE} text-ink-muted`}>{ORIGINAL_PROVENANCE}</dd>
              </dl>
              <p className={EYEBROW_MUTED} style={{ margin: "16px 0 8px" }}>Prints — sizes &amp; editions</p>
              <div>
                {tiers.map((t) => (
                  <div key={t.id} className="cat-edition-row" data-anchor={t.isAnchor ? "1" : undefined}>
                    <div>
                      <span className="font-sans text-[15.5px] font-bold text-ink">{t.label}</span>
                      <span className="font-sans text-[13px] text-ink-muted">{"  "}{t.size}</span>
                    </div>
                    <span className="font-display text-[19px] text-ink">{gbp(t.pricePence)}</span>
                  </div>
                ))}
              </div>
              <p className="font-sans text-ink-muted" style={{ fontSize: 13.5, margin: "8px 0 0" }}>
                Framing +{gbp(tiers.find((t) => t.id === "collector")?.framingPricePence ?? 0)} · hand-finishing available · free delivery.
              </p>
            </div>
            <div>
              <p className={EYEBROW_MUTED} style={{ margin: "0 0 9px" }}>
                {painting.colourways.length} colourway{painting.colourways.length > 1 ? "s" : ""}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {painting.colourways.map((c) => (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="cat-dot" style={{ backgroundColor: c.hex, width: 17, height: 17 }} />
                    <span className="font-sans text-ink" style={{ fontSize: 14.5 }}>{c.name}{c.isOriginal ? <span className="text-ink-muted"> · original</span> : null}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function FinishesPage() {
  const gp = (id: string) => PRINT_TIERS.find((t) => t.id === id);
  const frA2 = gp("collector")?.framingPricePence ?? 0;
  const frA1 = gp("atelier-grande")?.framingPricePence ?? 0;
  const emA2 = gp("collector")?.embellishmentPricePence ?? 0;
  const emA1 = gp("atelier-grande")?.embellishmentPricePence ?? 0;
  const emA0 = gp("heirloom")?.embellishmentPricePence ?? 0;
  return (
    <section className="cat-page">
      <PavoGround dim={0.3} />
      <div className="cat-inner" style={{ flexDirection: "column", alignItems: "stretch", justifyContent: "space-between", padding: "18mm 20mm", gap: "9mm" }}>
        <header>
          <p className={EYEBROW} style={{ margin: 0 }}>Make it yours</p>
          <h2 className={DISPLAY} style={{ fontSize: 60, lineHeight: 0.98, margin: "8px 0 0" }}>
            Framing &amp; <span style={{ fontStyle: "italic", color: "rgb(var(--accent))" }}>hand-finishing</span>
          </h2>
          <p className="font-sans text-ink" style={{ fontSize: 16, lineHeight: 1.5, maxWidth: "180mm", margin: "10px 0 0", opacity: 0.9 }}>
            Every edition can be ordered ready to hang, or hand-finished by the estate. Both are optional add-ons to the print price on the previous page.
          </p>
        </header>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14mm", flex: "1 1 auto", alignItems: "start" }}>
          {/* FRAMING */}
          <div style={{ borderTop: "2px solid rgb(var(--accent))", paddingTop: "5mm" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <h3 className="font-display text-ink" style={{ fontSize: 30, margin: 0 }}>Bespoke framing</h3>
              <span className="font-display text-ink" style={{ fontSize: 20 }}>+{gbp(frA2)} A2 · +{gbp(frA1)} A1</span>
            </div>
            <p className="font-sans text-ink-muted" style={{ fontSize: 14.5, lineHeight: 1.5, margin: "8px 0 0" }}>
              Bespoke solid-wood framing. Every finish is included in the one price — choose a moulding and a glazing:
            </p>
            <p className="font-sans text-accent" style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", margin: "14px 0 6px" }}>Moulding</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px" }}>
              {FRAME_STYLES.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 16, height: 16, borderRadius: 4, background: f.swatch, boxShadow: "0 0 0 1px rgb(var(--ink)/0.35)", flex: "0 0 auto" }} />
                  <span className="font-sans text-ink" style={{ fontSize: 14.5, fontWeight: 600 }}>{f.label}</span>
                </div>
              ))}
            </div>
            <p className="font-sans text-accent" style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", margin: "16px 0 6px" }}>Glazing</p>
            {GLAZING_OPTIONS.map((g) => (
              <p key={g.id} className="font-sans text-ink" style={{ fontSize: 14.5, lineHeight: 1.45, margin: "0 0 6px" }}>
                <span style={{ fontWeight: 600 }}>{g.label}</span>
                <span className="text-ink-muted"> — {g.note}</span>
              </p>
            ))}
          </div>
          {/* HAND-FINISHING */}
          <div style={{ borderTop: "2px solid rgb(var(--accent))", paddingTop: "5mm" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <h3 className="font-display text-ink" style={{ fontSize: 30, margin: 0 }}>Hand-finishing</h3>
              <span className="font-display text-ink" style={{ fontSize: 20 }}>+{gbp(emA2)} A2 · +{gbp(emA1)} A1 · +{gbp(emA0)} A0</span>
            </div>
            <p className="font-sans text-ink" style={{ fontSize: 15, lineHeight: 1.55, margin: "10px 0 0", opacity: 0.92 }}>
              {EMBELLISHMENT_NOTE}
            </p>
            <p className="font-display italic text-ink" style={{ fontSize: 20, lineHeight: 1.3, margin: "16px 0 0" }}>
              Each print is finished by hand in Stephen&rsquo;s own geometric tradition — the mandala is worked back into with metallic and pigment detail, so no two are quite alike.
            </p>
          </div>
        </div>
        <p className="font-sans text-ink-muted" style={{ fontSize: 13.5, letterSpacing: "0.02em", margin: 0 }}>
          Framing is offered on A2 &amp; A1 · hand-finishing on A2, A1 &amp; A0 · both made to order, allow up to two weeks · free delivery.
        </p>
      </div>
    </section>
  );
}

function EditionsPage() {
  const tiers = PRINT_TIERS.filter((t) => t.available && !t.isOneOff);
  const lowest = Math.min(...tiers.map((t) => t.pricePence));

  // Verbatim provenance — every line drawn from ESTATE_AUTHENTICATION (no invented words).
  const provenance: [string, string][] = [
    [ESTATE_AUTHENTICATION.stampLabel, ESTATE_AUTHENTICATION.stamp],
    [ESTATE_AUTHENTICATION.numberingLabel, ESTATE_AUTHENTICATION.numbering],
    [ESTATE_AUTHENTICATION.coaLabel, ESTATE_AUTHENTICATION.coa],
    [ESTATE_AUTHENTICATION.printerLabel, ESTATE_AUTHENTICATION.printer],
  ];

  // Short size token — "A3", "A2"… + the bracketed dimensions.
  const sheet = (size: string) => size.split(" ")[0];
  const dims = (size: string) => {
    const m = size.match(/\(([^)]+)\)/);
    return m ? m[1] : "";
  };

  return (
    <section className="cat-page">
      {/* Rich layered ground: peacock atmosphere + a studio plate feathered down
          the right edge so the whole page reads full, edge-to-edge. */}
      <PavoGround dim={0.3} />

      <div className="ed-inner">
        {/* Masthead — huge, screen-filling, spanning both columns. */}
        <header className="ed-head">
          <p className={EYEBROW} style={{ margin: 0 }}>The editions</p>
          <h2 className="ed-title font-display text-ink">
            Every painting.
            <br />
            <span className="ed-title-em">Four sizes.</span>
          </h2>
          <p className="ed-lead font-sans text-ink">
            Each mandala is issued in four archival giclée editions — from an
            open A3 to the A0 Heirloom — every one estate-stamped, numbered and
            certified. Free delivery, from {gbp(lowest)}.
          </p>
        </header>

        <div className="ed-body">
          {/* LEFT — the price ladder, set large and bold. */}
          <div className="ed-ladder">
            {tiers.map((t) => (
              <div
                key={t.id}
                className="ed-rung"
                data-anchor={t.isAnchor ? "1" : undefined}
              >
                <div className="ed-rung-sheet">
                  <span className="font-display text-ink ed-sheet-tag">
                    {sheet(t.size)}
                  </span>
                  {t.isAnchor && (
                    <span className="font-sans ed-anchor-flag text-accent">
                      Most collected
                    </span>
                  )}
                </div>
                <div className="ed-rung-main">
                  <p className="ed-rung-name font-display text-ink">{t.label}</p>
                  <p className="ed-rung-sub font-sans text-ink-muted">
                    {dims(t.size)} · {t.editionLabel}
                  </p>
                </div>
                <p className="ed-rung-price font-display text-ink">
                  {gbp(t.pricePence)}
                </p>
              </div>
            ))}
          </div>

          {/* RIGHT — provenance filling the other half, over the plate. */}
          <aside className="ed-prov">
            <p className={EYEBROW} style={{ margin: 0 }}>How each order arrives</p>
            <h3 className="ed-prov-title font-display text-ink">
              Made to last a<span className="ed-prov-em"> lifetime.</span>
            </h3>
            <ul className="ed-prov-list">
              {provenance.map(([label, body]) => (
                <li key={label} className="ed-prov-item">
                  <span className="ed-prov-mark font-display text-accent">
                    &#10022;
                  </span>
                  <div>
                    <p className="ed-prov-label font-sans text-ink">{label}</p>
                    <p className="ed-prov-body font-sans text-ink-muted">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="ed-prov-foot">
              <Seal w={52} />
              <div>
                <p className="font-display text-ink ed-prov-foot-name">
                  350gsm Hahnemühle archival paper
                </p>
                <p className="font-sans text-ink-muted ed-prov-foot-sub">
                  Dispatched in 7–10 working days · priced in £ · $ · € · A$ · C$
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function MemoriamPage() {
  // VERBATIM ONLY. Both spans are contiguous substrings sliced live from
  // ABOUT.studentsLetter — never retyped — so the words can't drift from source.
  // Each slice falls back gracefully if a future content edit moves an anchor,
  // guaranteeing the print build never crashes and never invents copy.
  const letter = ABOUT.studentsLetter;

  const between = (from: string, toEnd: string) => {
    const a = letter.indexOf(from);
    const b = letter.indexOf(toEnd);
    if (a === -1 || b === -1 || b < a) return "";
    return letter.slice(a, b + toEnd.length).trim();
  };

  // The luminous, self-contained opening arc of his advice.
  const passage =
    between("You will make many circles", "be amazed!") || letter;

  // The letter's own final blessing — the sign-off, set apart.
  const SIGNOFF = "May you have a wonderful journey.";
  const signoff = letter.includes(SIGNOFF) ? SIGNOFF : "";

  return (
    <section className="cat-page mem-page cat-dark">
      {/* Cinematic peacock ground — brighter plate, layered scrims + accent bloom */}
      <img
        className="cat-bg mem-ground"
        src={src(PAVO)}
        alt=""
        aria-hidden
        style={{ filter: "brightness(0.5) saturate(1.15) contrast(1.04)" }}
      />
      <div className="mem-scrim" />
      <div className="mem-glow" />

      {/* Oversized seal watermark, bled off the bottom-right corner */}
      <img
        className="mem-seal"
        src={src("logo/logo-seal-v1-w1024.png")}
        alt=""
        aria-hidden
      />

      <div className="mem-inner">
        {/* TOP FRAME — eyebrow + full-bleed hairline (verbatim studentsIntro) */}
        <div className="mem-top">
          <p className={EYEBROW} style={{ margin: 0, letterSpacing: "0.24em" }}>
            {ABOUT.studentsIntro}
          </p>
          <div className="mem-hair" />
        </div>

        {/* THE QUOTE — MASSIVE Fraunces italic, filling the whole middle band */}
        <blockquote className="mem-quote">
          <span aria-hidden className="mem-mark">&ldquo;</span>
          <p className="mem-body font-display italic text-ink">{passage}</p>
          {signoff && (
            <p className="mem-signoff font-display italic text-accent">
              {signoff}
            </p>
          )}
        </blockquote>

        {/* BOTTOM FRAME — bold name + dates, full-width */}
        <div className="mem-foot">
          <div className="mem-hair mem-hair-foot" />
          <div className="mem-namebar">
            <h2 className="mem-name font-display text-ink">Stephen Meakin</h2>
            <p className="mem-dates font-sans text-ink-muted">{LIFE_DATES}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BackCover() {
  return (
    <section className="cat-page cat-dark">
      <PavoGround dim={0.5} />
      <div className="cat-inner cat-centered" style={{ justifyContent: "space-between", padding: "24mm" }}>
        <div style={{ textAlign: "center" }}>
          <Seal w={72} />
          <h2 className={DISPLAY} style={{ fontSize: 26, margin: "12px 0 0" }}>The Mandala Company</h2>
          <p className="font-sans text-ink-muted" style={{ fontSize: 12, margin: "4px 0 0" }}>The Art of Stephen Meakin</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 className={DISPLAY} style={{ fontSize: 40, margin: 0 }}>Bring one home</h2>
          <p className="font-sans text-ink-muted" style={{ fontSize: 13, margin: "10px 0 0" }}>
            Every print, from £245 · free delivery · priced in £ · $ · € · A$ · C$.
          </p>
          <p className="font-sans" style={{ fontSize: 14, margin: "16px 0 0" }}>
            <b className="text-ink">themandalacompany.com</b>
            <br />
            <span className="text-ink-muted">info@themandalacompany.com</span>
          </p>
        </div>
        <p className="font-sans text-ink-muted" style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
          Stephen Meakin · {LIFE_DATES} · In Memoriam
        </p>
      </div>
    </section>
  );
}

// ── ASSEMBLY ─────────────────────────────────────────────────────────────────

export function PrintCatalogue() {
  _g = 0; // reset the editorial-ground colour rotation for a deterministic sequence
  useEffect(() => {
    document.body.classList.add("printing-catalogue");
    document.title = "The Art of Stephen Meakin — Catalogue";
    return () => document.body.classList.remove("printing-catalogue");
  }, []);

  const byCollection = (id: string) => PAINTINGS.filter((p) => p.collection === id);

  return (
    <>
      <style>{PRINT_CSS}</style>
      <main className="cat-root">
        <CoverPage />
        <QuotePage quote={WELCOME.openingQuote} cite={WELCOME.openingAttribution} eyebrow="The Mandala Company" />

        {/* Cloned straight from the live /about masthead */}
        <ClonePage src="img/catalogue/about-masthead.jpg" alt="Stephen Meakin — mandala artist and sacred geometer" />

        <StoryPage
          eyebrow="The artist"
          title="Who he was"
          paras={ABOUT.opening}
          photo="img/welcome/02-portrait-denim.jpg"
          photoSide="left"
        />
        <StoryPage
          eyebrow="The journey"
          title="How it began"
          paras={[ABOUT.earlyLife[0], ABOUT.earlyLife[1], ABOUT.earlyLife[4]]}
          photo="img/about/03-stephen-on-cairn.jpg"
          photoSide="right"
        />
        <StoryPage
          eyebrow="A turning point · Anegada, 1995"
          title="Everything is connected"
          paras={[ABOUT.anegada[0]]}
          attribution="Stephen Meakin"
        />
        <InterviewPage />
        <TraditionsPage />
        <StoryPage
          eyebrow="The academy"
          title="TAGA"
          paras={[ABOUT.academyQuote, ABOUT.palestine]}
          photo="img/about/08-taga-group.jpg"
          photoSide="left"
        />
        <StoryPage
          eyebrow="The commission · Farmacy, Notting Hill"
          title="Arista SunStar"
          paras={[WELCOME.bio[2]]}
          photo="img/welcome/05-arista-sunstar.jpg"
          photoSide="right"
        />
        <CreditsPage />

        <QuotePage quote="Ten mandalas. Every colourway he left." eyebrow="The collections" />

        {/* Habundia */}
        <CollectionDivider n="I" title="Habundia" sub="Seven wild flowers, painted with the oil of the flower itself." img="img/scenes/habundia-blur-v4.webp" />
        {byCollection("habundia").map((p) => <PaintingPage key={p.id} painting={p} />)}

        {/* Genesis */}
        <CollectionDivider n="II" title="Genesis Mandalas" sub="The earliest works — geometry as a universal language." img="img/scenes/genesis-blur-v2.webp" />
        {byCollection("genesis").map((p) => <PaintingPage key={p.id} painting={p} />)}

        {/* Born in the Sky */}
        <CollectionDivider n="III" title="Born in the Sky" sub="Works of the night — a comet, a constellation, nine stars in the shape of a swan." img="img/scenes/born-in-the-sky-blur-v2.webp" />
        {byCollection("born-in-the-sky").map((p) => <PaintingPage key={p.id} painting={p} />)}

        <EditionsPage />
        <FinishesPage />
        <QuotePage quote={MEMORIAL_QUOTE} cite="Stephen Meakin" eyebrow="Everything is connected" />
        <MemoriamPage />
        <BackCover />
      </main>
    </>
  );
}

// A4 landscape (297 × 210mm). One shared print system for every page.
const PRINT_CSS = `
/* LIGHT GALLERY PALETTE — warm ivory pages, near-black ink (gallery-monograph
   register). Image pages (cover / dividers / masthead clone) carry the dark
   cat-dark class so their cream overlay text stays legible over photos. */
.cat-root { background: rgb(var(--bg)); color: rgb(var(--ink)); }
.cat-dark { --bg: 10 9 8; --ink: 237 230 214; }

.cat-page {
  position: relative;
  width: 297mm; height: 210mm;
  overflow: hidden;
  background: rgb(var(--bg));
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.cat-page:not(:last-child) { break-after: page; }

.cat-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.cat-scrim { position: absolute; inset: 0; background:
  linear-gradient(180deg, rgba(8,7,6,0.55) 0%, rgba(8,7,6,0.6) 45%, rgba(8,7,6,0.78) 100%); }
/* Editorial ground — a calm per-page tint over near-black. Legible: cream text
   always sits on a dark field, never on a busy photo. */
.cat-ground { position: absolute; inset: 0; z-index: 0; background: rgb(var(--bg)); }

.cat-inner { position: relative; z-index: 2; height: 100%; display: flex; align-items: center; padding: 20mm 22mm; }
.cat-centered { flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.cat-rule { width: 42px; height: 2px; background: rgb(var(--accent)); }

/* Cover */
.cat-cover-scrim { position: absolute; inset: 0; background:
  radial-gradient(120% 90% at 50% 40%, rgba(8,7,6,0.35), rgba(8,7,6,0.72) 78%); }
.cat-cover-inner { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: space-between; padding: 26mm; }

/* Story pages */
.cat-story { gap: 16mm; align-items: center; }
.cat-story-solo { justify-content: center; }
.cat-story-photo { flex: 0 0 118mm; }
.cat-story-photo picture { display: block; }
.cat-story-photo img { display: block; width: 118mm; height: 150mm; object-fit: cover; }
.cat-story-text { flex: 1; min-width: 0; }
.cat-story-solo .cat-story-text { max-width: 700px; }
.cat-prose p { margin: 0 0 9px; }
.cat-prose p:last-child { margin-bottom: 0; }
.cat-prose p[data-drop]::first-letter {
  font-family: "Fraunces", serif; font-weight: 700; color: rgb(var(--accent));
  float: left; font-size: 46px; line-height: 0.8; padding: 2px 8px 0 0; }

/* Interview */
.cat-qa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm 16mm; }
.cat-qa { break-inside: avoid; }

/* Interview — redesigned "In his own words" (iv-) */
.iv-portrait { position: absolute; inset: 0 0 0 auto; z-index: 1; width: 118mm; height: 100%; }
.iv-portrait picture, .iv-portrait img {
  display: block; width: 100%; height: 100%; object-fit: cover; object-position: 30% 28%;
  filter: brightness(0.82) saturate(1.05) contrast(1.02);
}
.iv-portrait-fade { position: absolute; inset: 0; background:
  linear-gradient(90deg, rgb(var(--bg)) 0%, rgba(10,9,8,0.86) 26%, rgba(10,9,8,0.34) 60%, rgba(10,9,8,0) 100%),
  linear-gradient(0deg, rgba(10,9,8,0.6) 0%, rgba(10,9,8,0) 30%); }

.iv-inner { position: relative; z-index: 3; height: 100%; display: flex; flex-direction: column;
  padding: 18mm 20mm 16mm; }

.iv-head { flex: 0 0 auto; }
.iv-title {
  margin: 8px 0 0; font-weight: 700; letter-spacing: -0.03em; line-height: 0.86;
  font-size: 104px; font-variation-settings: "opsz" 120, "wght" 700;
  text-shadow: 0 2px 40px rgba(10,9,8,0.55);
}
.iv-title-em { font-style: italic; font-weight: 600; }

.iv-beats { flex: 1 1 auto; display: flex; flex-direction: column; justify-content: center;
  gap: 11mm; max-width: 190mm; padding: 6mm 0; }
.iv-beat { position: relative; padding-left: 8mm; }
.iv-beat::before { content: ""; position: absolute; left: 0; top: 5mm; bottom: 3mm; width: 3px;
  background: rgb(var(--accent)); border-radius: 2px; }
.iv-q { margin: 0; font-weight: 700; font-size: 18px; line-height: 1.28;
  letter-spacing: 0.01em; max-width: 150mm; }
.iv-a { margin: 6px 0 0; font-size: 52px; line-height: 1.02; letter-spacing: -0.02em;
  font-variation-settings: "opsz" 72; text-shadow: 0 1px 24px rgba(10,9,8,0.5); max-width: 175mm; }

.iv-support { flex: 0 0 auto; max-width: 168mm; border-top: 1px solid rgb(var(--ink) / 0.18);
  padding-top: 10px; margin-top: 4mm; }
.iv-q-sm { margin: 0; font-weight: 700; font-size: 16px; line-height: 1.24; }
.iv-a-sm { margin: 5px 0 0; font-size: 15px; line-height: 1.6; color: rgb(var(--ink) / 0.9);
  max-width: 155mm; }

.iv-cite { flex: 0 0 auto; margin: 8mm 0 0; font-size: 14px; letter-spacing: 0.02em; }

/* Traditions */
.cat-traditions { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm 16mm; margin-top: 20px; }
.cat-tradition { display: flex; gap: 10px; align-items: baseline; }

/* Credits */
.cat-credits { display: flex; flex-direction: column; gap: 10px; }

/* Editions */
.cat-arrives { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }

/* Product page (per-painting) — replicates the "painted wall, lit" atmosphere */
/* Richer "painted wall, lit" fill so no page reads empty — atmosphere pools on
   the art side + top, while the text side stays calm enough to read. */
.cat-wall-layer { position: absolute; inset: 0; background:
  radial-gradient(120% 90% at 50% -12%, color-mix(in srgb, var(--cat-wall) 30%, transparent), transparent 62%),
  linear-gradient(to bottom,
    color-mix(in srgb, var(--cat-wall) 20%, transparent),
    color-mix(in srgb, var(--cat-wall) 9%, transparent) 50%,
    color-mix(in srgb, var(--cat-wall) 6%, transparent) 100%); }
.cat-halo-layer { position: absolute; top: -10%; left: -8%; width: 66%; height: 135%;
  background: radial-gradient(58% 50% at 40% 40%,
    color-mix(in srgb, var(--cat-halo) 20%, transparent),
    color-mix(in srgb, var(--cat-halo) 7%, transparent) 54%, transparent 76%); }
/* On ivory pages the dark inboard-edge dissolve reads as a muddy halo — drop it;
   the contained photo on its subtle mount is a clean gallery frame on its own. */
.st-plate-fade { display: none; }
.cat-product { display: grid; grid-template-columns: 0.98fr 1.02fr; gap: 13mm; align-items: center; padding: 15mm 18mm; }
.cat-art { display: flex; align-items: center; justify-content: center; }
.cat-art picture { display: block; width: 100%; }
.cat-art img { display: block; width: 100%; height: auto; max-height: 188mm; object-fit: contain; margin: 0 auto; }
.cat-label { display: flex; flex-direction: column; }
.cat-facts { display: grid; grid-template-columns: max-content 1fr; column-gap: 18px; row-gap: 5px; margin: 12px 0 0; }
.cat-facts dt { padding-top: 2px; }
.cat-facts dd { margin: 0; }
.cat-price { margin-top: 12px; padding-top: 11px; border-top: 1px solid rgb(var(--ink) / 0.16); }
.cat-editions { margin-top: 10px; }
.cat-edition-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
  padding: 8px 0; border-top: 1px solid rgb(var(--ink) / 0.14); }
.cat-edition-row[data-anchor] { border-color: rgb(var(--accent) / 0.55); }
.cat-colourways { margin-top: 11px; }
.cat-swatches { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.cat-dot { width: 14px; height: 14px; border-radius: 9999px; box-shadow: 0 0 0 1px rgb(var(--ink) / 0.4); }

@media print {
  @page { size: 297mm 210mm; margin: 0; }
  html, body { background: rgb(var(--bg)) !important; }
  body.printing-catalogue .fixed,
  body.printing-catalogue [style*="position: fixed"],
  body.printing-catalogue [style*="position:fixed"],
  body.printing-catalogue nav, body.printing-catalogue header,
  body.printing-catalogue footer, body.printing-catalogue .film-grain,
  body.printing-catalogue .cc-flower { display: none !important; }
  .cat-page { break-inside: avoid; }
}

/* ══ FLEET REDESIGN CSS ══ */

/* ===== CoverPage ===== */
/* ── COVER (cov-) — cinematic full-bleed masthead ───────────────────────────── */
/* The peacock bleeds to all edges; a top-light → deep-foot grade lets the
   enormous cream name read as carved light. Zero dead space: masthead band,
   a screen-filling name anchored hard to the foot with a rust index bar in the
   gutter, and a full-width baseline. */
.cov-grade {
  position: absolute; inset: 0;
  background:
    linear-gradient(180deg,
      rgba(8,7,6,0.18) 0%,
      rgba(8,7,6,0.34) 26%,
      rgba(8,7,6,0.82) 44%,
      rgba(8,7,6,0.93) 66%,
      rgba(8,7,6,0.97) 100%);
}
.cov-vignette {
  position: absolute; inset: 0;
  background: radial-gradient(120% 78% at 50% 18%, transparent 44%, rgba(8,7,6,0.58) 100%);
}
.cov-inner {
  position: relative; z-index: 2;
  height: 100%;
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 14mm 17mm 13mm;
}

/* Masthead band */
.cov-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding-bottom: 9px;
  border-bottom: 1px solid rgb(var(--ink) / 0.28);
}
.cov-head-mark { display: flex; align-items: center; gap: 14px; }

/* The name — enormous stacked lines + a rust index bar filling the right gutter.
   margin-top:auto shoves the whole block hard down to the foot so the only
   vertical space in the page sits ABOVE the crown light — no interior void. */
.cov-name {
  margin-top: auto;
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 12mm;
}
.cov-name-lead { min-width: 0; }
.cov-kicker {
  font-size: 34px; line-height: 1; letter-spacing: 0.005em;
  font-variation-settings: "opsz" 40, "wght" 500;
}
.cov-title {
  font-family: "Fraunces", serif;
  font-variation-settings: "opsz" 144, "wght" 700;
  font-weight: 700;
  color: rgb(var(--ink));
  text-transform: uppercase;
  letter-spacing: -0.022em;
  line-height: 0.82;
  margin: 0;
  text-shadow: 0 2px 44px rgba(8,7,6,0.55);
}
.cov-title-line { display: block; font-size: 178px; }

/* Rust index bar down the right — fills the gutter the shorter "MEAKIN" leaves */
.cov-index {
  flex: 0 0 auto;
  display: flex; flex-direction: column; align-items: flex-end;
  padding-bottom: 14px;
}
.cov-index-vol {
  font-size: 14px; font-weight: 700; letter-spacing: 0.24em;
  text-transform: uppercase; white-space: nowrap;
}
.cov-index-rule {
  width: 1px; height: 44mm; margin: 12px 0;
  background: linear-gradient(180deg,
    rgb(var(--accent) / 0.85), rgb(var(--ink) / 0.12));
}
.cov-index-set {
  font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase;
  white-space: nowrap;
}

/* Baseline — dates + descriptor on a full-width hairline */
.cov-foot {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 20px;
  margin-top: 15px;
  padding-top: 11px;
  border-top: 1px solid rgb(var(--ink) / 0.28);
}

/* ===== QuotePage ===== */
/* ── QuotePage (qt-) — enormous statement quote on a rich peacock ground ── */
.qt-page { background: rgb(var(--bg)); }

/* Warm vignette — corners drop into ink, the words sit in light */
.qt-vignette {
  position: absolute; inset: 0; z-index: 1;
  background:
    radial-gradient(128% 100% at 42% 46%, transparent 28%, rgba(8,7,6,0.52) 80%, rgba(8,7,6,0.86) 100%),
    linear-gradient(180deg, rgba(8,7,6,0.32) 0%, transparent 24%, transparent 68%, rgba(8,7,6,0.56) 100%);
}

/* Oversized seal, bled off the right edge — a ghost texture behind the type */
.qt-seal-ghost {
  position: absolute; z-index: 1;
  right: -74mm; top: 50%; transform: translateY(-50%);
  width: 196mm; height: 196mm; object-fit: contain;
  opacity: 0.11; mix-blend-mode: screen; pointer-events: none;
}

.qt-inner {
  position: relative; z-index: 3;
  height: 100%; display: flex; flex-direction: column;
  padding: 16mm 22mm;
}

/* TOP FRAME */
.qt-topframe { display: flex; align-items: center; gap: 16px; flex: 0 0 auto; }
.qt-eyebrow {
  font-size: 15px; font-weight: 700; letter-spacing: 0.30em;
  text-transform: uppercase; color: rgb(var(--accent)); white-space: nowrap;
}
.qt-topline { flex: 1; height: 2px; background: linear-gradient(90deg,
  rgb(var(--accent) / 0.75), rgb(var(--ink) / 0.14)); }
.qt-topdot { width: 8px; height: 8px; border-radius: 9999px; background: rgb(var(--accent)); }

/* THE QUOTE — fills the whole middle band, vertically centred, edge to edge */
.qt-body {
  flex: 1 1 auto; min-height: 0; position: relative;
  display: flex; align-items: center;
  padding: 5mm 0 3mm 14mm;
}
.qt-mark {
  position: absolute; left: -1mm; top: -6mm;
  font-size: 128px; line-height: 1; font-weight: 600; font-style: italic;
  color: rgb(var(--accent)); opacity: 0.5;
}
.qt-quote {
  margin: 0; max-width: 244mm;
  letter-spacing: -0.018em;
  text-shadow: 0 1px 26px rgba(8,7,6,0.62);
  text-wrap: balance;
}

/* BOTTOM FRAME */
.qt-botframe {
  display: flex; align-items: center; gap: 18px;
  flex: 0 0 auto; padding-top: 12px;
}
.qt-botline {
  flex: 1; height: 2px;
  background: linear-gradient(90deg, rgb(var(--ink) / 0.12), rgb(var(--accent) / 0.7));
}
.qt-cite-wrap { display: flex; align-items: center; gap: 13px; }
.qt-cite {
  font-size: 16px; font-weight: 700; letter-spacing: 0.10em;
  text-transform: uppercase; color: rgb(var(--ink)); white-space: nowrap;
}
.qt-cite-muted { color: rgb(var(--ink-muted)); }
.qt-dates {
  font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase;
  color: rgb(var(--ink-muted)); white-space: nowrap;
}

/* ===== StoryPage ===== */

/* ── StoryPage (st-) — cinematic editorial spread ──────────────────────────── */

/* The two-panel spread: a full-bleed plate flush to one page edge + a text
   column. The plate panel is edge-to-edge (no gutter); the column carries its
   own generous padding so the type fills top-to-bottom with no dead space. */
.st-spread {
  position: relative; z-index: 2; height: 100%;
  display: grid; align-items: stretch;
}
.st-spread-photo-left  { grid-template-columns: 128mm 1fr; }
.st-spread-photo-right { grid-template-columns: 1fr 128mm; }

/* Full-height, edge-bleeding photo plate — flush to the page edge + top/bottom. */
.st-plate { position: relative; height: 210mm; overflow: hidden; }
.st-plate picture, .st-plate img {
  display: block; width: 100%; height: 100%; object-fit: cover;
}
.st-plate img { object-position: center; }
/* Inboard-edge dissolve so the plate melts into the ground (no hard rectangle). */
.st-plate-fade { position: absolute; inset: 0; pointer-events: none; }
.st-plate-left  .st-plate-fade {
  background:
    linear-gradient(90deg, transparent 62%, rgba(10,9,8,0.30) 88%, rgba(10,9,8,0.72) 100%),
    linear-gradient(180deg, rgba(10,9,8,0.28) 0%, transparent 22%, transparent 78%, rgba(10,9,8,0.34) 100%);
}
.st-plate-right .st-plate-fade {
  background:
    linear-gradient(270deg, transparent 62%, rgba(10,9,8,0.30) 88%, rgba(10,9,8,0.72) 100%),
    linear-gradient(180deg, rgba(10,9,8,0.28) 0%, transparent 22%, transparent 78%, rgba(10,9,8,0.34) 100%);
}
/* A hairline rust seam at the join — the bold accent note. */
.st-plate-seam { position: absolute; top: 0; bottom: 0; width: 2px; background: rgb(var(--accent)); }
.st-plate-left  .st-plate-seam { right: 0; }
.st-plate-right .st-plate-seam { left: 0; }

/* The editorial column — fills its cell top-to-bottom: eyebrow + huge title at
   the top, prose VERTICALLY CENTRED in the middle so short stories share their
   air top+bottom (no stranded gap), attribution pinned at the foot. overflow
   hidden is the belt-and-braces guard; the harness proves nothing clips. */
.st-col {
  display: flex; flex-direction: column;
  height: 210mm; padding: 20mm 20mm 18mm;
  position: relative; overflow: hidden;
}
.st-col-head { flex: 0 0 auto; }
.st-col .st-prose {
  flex: 1 1 auto; margin-top: 16px; min-height: 0;
  display: flex; flex-direction: column; justify-content: center;
}
.st-col .st-attr { flex: 0 0 auto; margin-top: 12px; text-align: right; }

/* Bold rust rule — thicker + wider than the thin cat-rule. */
.st-rule { width: 72px; height: 3px; background: rgb(var(--accent)); }

/* Prose — generously leaded, fills the measure. First-para rust drop-cap. */
.st-prose { color: rgb(var(--ink)); }
.st-prose p { font-size: 16px; line-height: 1.6; margin: 0 0 12px; }
.st-prose p:last-child { margin-bottom: 0; }
.st-prose p[data-drop]::first-letter {
  font-family: "Fraunces", serif; font-weight: 700; color: rgb(var(--accent));
  float: left; font-size: 74px; line-height: 0.72; padding: 4px 13px 0 0;
}
.st-prose-lg p { font-size: 17px; line-height: 1.58; margin: 0 0 12px; }
.st-prose-lg p[data-drop]::first-letter { font-size: 78px; padding: 4px 14px 0 0; }
.st-solo-attr { margin-top: 14px; }

/* SOLO page (no photo) — a commanding full-page display layout. Huge title band
   at the top, the prose flowing across TWO balanced columns beneath, centred so
   it fills the lower half, attribution foot-pinned. */
.st-solo {
  position: relative; z-index: 2; height: 100%;
  display: flex; flex-direction: column; align-items: stretch; justify-content: flex-start;
  padding: 18mm 26mm; overflow: hidden;
}
.st-solo-head { flex: 0 0 auto; }
.st-solo-body {
  flex: 1 1 auto; margin-top: 14px; min-height: 0;
  display: flex; flex-direction: column; justify-content: center;
}
.st-solo-body .st-prose-lg {
  columns: 2; column-gap: 18mm; column-fill: balance;
}
.st-solo-body .st-prose-lg p { break-inside: avoid; }
.st-solo-body .st-prose-lg p[data-drop] { break-inside: avoid-column; }
.st-solo-attr { flex: 0 0 auto; }


/* ===== InterviewPage ===== */
/* Interview — redesigned "In his own words" (iv-) — FINAL tighter pass.
   Fuller portrait, bigger hero answers, deterministic vertical bands (no gap/cutoff). */
.iv-portrait { position: absolute; inset: 0 0 0 auto; z-index: 1; width: 138mm; height: 100%; }
.iv-portrait picture, .iv-portrait img {
  display: block; width: 100%; height: 100%; object-fit: cover; object-position: 32% 26%;
  filter: brightness(0.84) saturate(1.06) contrast(1.02);
}
.iv-portrait-fade { position: absolute; inset: 0; background:
  linear-gradient(90deg, rgb(var(--bg)) 0%, rgba(10,9,8,0.9) 22%, rgba(10,9,8,0.36) 58%, rgba(10,9,8,0) 100%),
  linear-gradient(0deg, rgba(10,9,8,0.62) 0%, rgba(10,9,8,0) 32%); }

/* Text column clears the portrait via a wide right pad so nothing collides. */
.iv-inner { position: relative; z-index: 3; height: 100%; display: flex; flex-direction: column;
  justify-content: space-between; padding: 16mm 96mm 14mm 22mm; }

.iv-head { flex: 0 0 auto; }
.iv-title {
  margin: 6px 0 0; font-weight: 700; letter-spacing: -0.035em; line-height: 0.82;
  font-size: 122px; font-variation-settings: "opsz" 144, "wght" 700;
  text-shadow: 0 2px 44px rgba(10,9,8,0.6);
}
.iv-title-em { font-style: italic; font-weight: 600; }

.iv-beats { flex: 1 1 auto; display: flex; flex-direction: column; justify-content: center;
  gap: 9mm; padding: 7mm 0; min-height: 0; }
.iv-beat { position: relative; padding-left: 8mm; }
.iv-beat::before { content: ""; position: absolute; left: 0; top: 4mm; bottom: 2.5mm; width: 3px;
  background: rgb(var(--accent)); border-radius: 2px; }
.iv-q { margin: 0 0 5px; font-weight: 700; font-size: 17.5px; line-height: 1.24;
  letter-spacing: 0.01em; max-width: 158mm; }
.iv-a { margin: 0; font-weight: 600; font-size: 58px; line-height: 1.0; letter-spacing: -0.02em;
  font-variation-settings: "opsz" 72; text-shadow: 0 1px 24px rgba(10,9,8,0.5); max-width: 172mm; }
.iv-a-lead { font-size: 80px; line-height: 0.98; letter-spacing: -0.025em; }

/* Foot band — supporting exchange + credit, hairline-topped, anchors the bottom. */
.iv-foot { flex: 0 0 auto; border-top: 1px solid rgb(var(--ink) / 0.2); padding-top: 12px;
  display: flex; align-items: flex-end; justify-content: space-between; gap: 16mm; }
.iv-support { max-width: 132mm; }
.iv-q-sm { margin: 0 0 4px; font-weight: 700; font-size: 15.5px; line-height: 1.24; }
.iv-a-sm { margin: 0; font-size: 14.5px; line-height: 1.52; color: rgb(var(--ink) / 0.9); }
.iv-cite { flex: 0 0 auto; margin: 0; font-size: 13.5px; letter-spacing: 0.02em; text-align: right;
  white-space: nowrap; }

/* ===== TraditionsPage ===== */
/* ── Traditions page (redesign v2 — full-height columns, zero dead space) ───── */
.tr-vignette { position: absolute; inset: 0; z-index: 1; background:
  radial-gradient(128% 118% at 14% 6%, rgba(8,7,6,0.06), rgba(8,7,6,0.60) 60%, rgba(8,7,6,0.86) 100%),
  linear-gradient(180deg, rgba(8,7,6,0.34) 0%, rgba(8,7,6,0.08) 38%, rgba(8,7,6,0.56) 100%); }
.tr-inner { display: flex; flex-direction: column; align-items: stretch;
  padding: 17mm 20mm 18mm; }

/* Masthead — massive headline left, henosis intro anchored to its baseline right */
.tr-head { display: grid; grid-template-columns: 1.28fr 1fr; gap: 15mm;
  align-items: end; flex: 0 0 auto; }
.tr-head-lead { min-width: 0; }
.tr-title { font-size: 98px; line-height: 0.88; letter-spacing: -0.028em;
  margin: 9px 0 0; text-shadow: 0 1px 28px rgba(8,7,6,0.55); }
.tr-title-em { font-weight: 500; }
.tr-intro { font-size: 17px; line-height: 1.58; margin: 0 0 5px;
  max-width: 95mm; color: rgb(var(--ink) / 0.95); }

/* Four columns — flex:1 so they stretch to the page floor; NO hollow middle */
.tr-grid { flex: 1 1 auto; display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 0; margin-top: 13mm; border-top: 1px solid rgb(var(--ink) / 0.24); }
.tr-col { position: relative; display: flex; flex-direction: column;
  padding: 11mm 11mm 0 0; }
.tr-col:not(:first-child) { padding-left: 10mm; }
.tr-col:not(:last-child)::after { content: ""; position: absolute; top: 0; bottom: 8mm;
  right: 5mm; width: 1px; background: rgb(var(--ink) / 0.16); }
.tr-num { font-size: 108px; line-height: 0.82; letter-spacing: -0.03em;
  display: block; margin: 0; opacity: 0.97; text-shadow: 0 1px 24px rgba(8,7,6,0.5); }
/* body pushed to the lower half so the tall column reads full top-to-bottom */
.tr-col-body { margin-top: auto; padding-bottom: 4mm; }
.tr-col-title { font-size: 25px; line-height: 1.04; letter-spacing: -0.01em; margin: 0; }
.tr-col-rule { width: 32px; height: 2px; background: rgb(var(--accent)); margin: 13px 0; }
.tr-col-desc { font-size: 15px; line-height: 1.5; margin: 0; color: rgb(var(--ink) / 0.92); }

/* ===== CreditsPage ===== */
/* ── Credits page — full-bleed cinematic "Exhibited & commissioned" ──────────── */
.cr-page { position: relative; }

/* Gallery plate bleeds off the right/bottom, dissolving into the dark ground. */
.cr-plate {
  position: absolute; top: 0; right: 0; width: 52%; height: 100%;
  object-fit: cover; object-position: 28% 40%;
  filter: brightness(0.5) saturate(0.96) contrast(1.02);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 34%, #000 100%);
  mask-image: linear-gradient(90deg, transparent 0%, #000 34%, #000 100%);
}
.cr-plate-veil {
  position: absolute; top: 0; right: 0; width: 52%; height: 100%;
  background: linear-gradient(180deg, rgba(8,7,6,0.28) 0%, rgba(8,7,6,0.52) 60%, rgba(8,7,6,0.7) 100%);
}
.cr-scrim {
  position: absolute; inset: 0;
  background:
    linear-gradient(90deg, rgba(8,7,6,0.94) 0%, rgba(8,7,6,0.82) 40%, rgba(8,7,6,0.34) 100%),
    linear-gradient(180deg, rgba(8,7,6,0.2) 0%, transparent 30%, rgba(8,7,6,0.35) 100%);
}

.cr-inner {
  position: relative; z-index: 2; height: 100%;
  display: grid; grid-template-columns: 84mm 1fr; gap: 14mm;
  align-items: stretch; padding: 16mm 20mm;
}

/* Masthead column — top block + foot seal spread to fill the full height. */
.cr-masthead { display: flex; flex-direction: column; justify-content: space-between; }
.cr-mast-top { display: block; }
.cr-mast-foot { opacity: 0.92; }
.cr-title {
  font-size: 78px; line-height: 0.9; letter-spacing: -0.025em;
  margin: 16px 0 0;
}
.cr-title .cr-amp { font-style: italic; font-weight: 600; }

/* Ledger — six large rows distributed edge to edge over the full page height. */
.cr-ledger {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; justify-content: space-between;
  height: 100%;
}
.cr-row {
  flex: 1 1 0; min-height: 0;
  display: flex; align-items: center; gap: 18px;
  padding: 0;
  border-top: 1px solid rgb(var(--ink) / 0.16);
}
.cr-row:first-child { border-top: none; }
.cr-num {
  flex: 0 0 auto; width: 50px;
  font-size: 22px; line-height: 1; letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums; opacity: 0.9;
  align-self: center;
}
.cr-body { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
.cr-venue {
  font-size: 46px; line-height: 1.0; letter-spacing: -0.02em;
}
.cr-meta {
  display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 14px;
  margin-top: 5px;
}
.cr-place { font-size: 15.5px; letter-spacing: 0.02em; }
.cr-detail {
  font-size: 15.5px; font-style: normal; letter-spacing: 0.01em;
  position: relative; padding-left: 16px;
}
.cr-detail::before {
  content: ""; position: absolute; left: 0; top: 50%;
  width: 7px; height: 7px; transform: translateY(-50%) rotate(45deg);
  background: rgb(var(--accent));
}

/* ===== CollectionDivider ===== */
/* ── Collection divider — cinematic full-bleed (dv-) ───────────────────────── */
.dv-page { background: #0a0908; }
.dv-bg { transform: scale(1.04); }

/* Cinematic corner vignette so the bright scene never fights the type. */
.dv-vignette { position: absolute; inset: 0; z-index: 1;
  background: radial-gradient(130% 108% at 50% 32%,
    transparent 38%, rgba(8,7,6,0.44) 72%, rgba(8,7,6,0.80) 100%); }
/* Bottom-weighted grade — anchors the big title with a dark floor, keeps the
   sky/top open and atmospheric. Heavier floor so the title never fights detail. */
.dv-grad { position: absolute; inset: 0; z-index: 1;
  background: linear-gradient(180deg,
    rgba(8,7,6,0.34) 0%, rgba(8,7,6,0.12) 28%,
    rgba(8,7,6,0.34) 55%, rgba(8,7,6,0.84) 82%, rgba(8,7,6,0.96) 100%); }

/* Colossal ghost numeral, bled off the right edge as pure framing. Sits low so
   it braces the floor-anchored title instead of floating in dead centre space. */
.dv-ghost { position: absolute; z-index: 1;
  right: -4mm; bottom: -14mm;
  font-size: 380px; line-height: 0.68; font-weight: 700;
  font-variation-settings: "opsz" 144, "wght" 700;
  letter-spacing: -0.05em;
  color: rgb(var(--ink) / 0.10);
  -webkit-text-stroke: 1px rgb(var(--ink) / 0.06);
  pointer-events: none; user-select: none; white-space: nowrap; }

.dv-inner { position: relative; z-index: 3; height: 100%;
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 15mm 20mm 16mm; }

/* Top framing band — eyebrow rides between full-width hairlines + the seal. */
.dv-topband { display: flex; align-items: center; gap: 16px; flex: 0 0 auto; }
.dv-eyebrow { font-size: 15px; font-weight: 700; letter-spacing: 0.34em;
  text-transform: uppercase; color: rgb(var(--accent)); white-space: nowrap; }
.dv-rule { height: 1.5px; background: rgb(var(--ink) / 0.32); }
.dv-rule-lead { width: 26mm; flex: 0 0 auto; background:
  linear-gradient(90deg, transparent, rgb(var(--accent) / 0.9)); }
.dv-rule-trail { flex: 1 1 auto; background:
  linear-gradient(90deg, rgb(var(--ink) / 0.34), rgb(var(--ink) / 0.06)); }

/* The title block, pinned to the floor of the page. */
.dv-title-block { flex: 0 0 auto; }
/* HUGE, but ceiling lowered to 124px + tighter tracking so the two longest
   titles ("Genesis Mandalas", "Born in the Sky") stay a clean single line and
   can never overflow the 794px page. line-height 0.88 keeps a wrapped line safe. */
.dv-title { margin: 0; color: rgb(var(--ink));
  font-weight: 700; font-variation-settings: "opsz" 144, "wght" 700;
  letter-spacing: -0.04em; line-height: 0.88;
  font-size: clamp(88px, 11.4vw, 124px);
  text-shadow: 0 2px 44px rgba(8,7,6,0.72); max-width: 262mm; }
/* Sub line — italic, framed by a rust tick, filling the lower measure. */
.dv-subrow { display: flex; align-items: flex-start; gap: 14px; margin-top: 14px; }
.dv-subrule { flex: 0 0 auto; width: 40px; height: 3px; margin-top: 15px;
  background: rgb(var(--accent)); }
.dv-sub { margin: 0; font-size: 23px; line-height: 1.32; max-width: 188mm;
  font-variation-settings: "opsz" 40, "wght" 500;
  text-shadow: 0 1px 20px rgba(8,7,6,0.7); }

/* ===== EditionsPage ===== */
/* ── Editions page (ed-) — full-bleed ladder + provenance, no gaps ─────────── */
.ed-plate { position: absolute; inset: 0 0 0 auto; width: 44%; z-index: 1; overflow: hidden; }
.ed-plate picture { display: block; width: 100%; height: 100%; }
.ed-plate img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 32%; filter: brightness(0.5) saturate(1.05); }
.ed-plate-fade { position: absolute; inset: 0; background:
  linear-gradient(90deg, rgb(var(--bg)) 0%, rgba(10,9,8,0.9) 22%, rgba(10,9,8,0.5) 60%, rgba(10,9,8,0.7) 100%); }

.ed-inner { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column;
  padding: 15mm 20mm 14mm; }

.ed-head { flex: 0 0 auto; }
.ed-title { font-weight: 600; letter-spacing: -0.03em; line-height: 0.86; font-size: 68px;
  margin: 6px 0 0; font-variation-settings: "opsz" 72, "wght" 600;
  text-shadow: 0 2px 34px rgba(10,9,8,0.5); }
.ed-title-em { font-style: italic; color: rgb(var(--accent)); }
.ed-lead { font-size: 14px; line-height: 1.48; max-width: 520px; margin: 11px 0 0; opacity: 0.92; }

.ed-body { flex: 1 1 auto; display: grid; grid-template-columns: 1.16fr 0.84fr; gap: 14mm;
  align-items: stretch; margin-top: 7mm; min-height: 0; }

/* Price ladder — large, bold rungs that fill the column top to bottom. */
.ed-ladder { display: flex; flex-direction: column; justify-content: space-between; }
.ed-rung { display: grid; grid-template-columns: 78px 1fr auto; align-items: center; gap: 20px;
  padding: 14px 0; border-top: 1px solid rgb(var(--ink) / 0.16); }
.ed-rung:first-child { border-top: none; }
.ed-rung[data-anchor] { border-top-color: rgb(var(--accent) / 0.6); }
.ed-rung-sheet { display: flex; flex-direction: column; gap: 5px; }
.ed-sheet-tag { font-size: 34px; line-height: 0.9; font-weight: 600; letter-spacing: -0.02em;
  font-variation-settings: "opsz" 40, "wght" 600; }
.ed-anchor-flag { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.ed-rung-main { min-width: 0; }
.ed-rung-name { font-size: 26px; line-height: 1.0; font-weight: 600; letter-spacing: -0.015em; margin: 0;
  font-variation-settings: "opsz" 32, "wght" 600; }
.ed-rung-sub { font-size: 13px; line-height: 1.35; margin: 4px 0 0; }
.ed-rung-price { font-size: 44px; line-height: 0.9; font-weight: 600; letter-spacing: -0.025em;
  text-align: right; white-space: nowrap; font-variation-settings: "opsz" 56, "wght" 600; }
.ed-rung[data-anchor] .ed-rung-price { color: rgb(var(--accent)); }

/* Provenance — fills the right half over the studio plate; hairline seam. */
.ed-prov { display: flex; flex-direction: column; padding-left: 14mm;
  border-left: 1px solid rgb(var(--ink) / 0.14); }
.ed-prov-title { font-size: 30px; line-height: 0.98; font-weight: 600; letter-spacing: -0.02em;
  margin: 8px 0 0; font-variation-settings: "opsz" 40, "wght" 600; }
.ed-prov-em { font-style: italic; color: rgb(var(--accent)); }
.ed-prov-list { list-style: none; margin: 15px 0 0; padding: 0; display: flex; flex-direction: column;
  flex: 1 1 auto; justify-content: center; gap: 13px; }
.ed-prov-item { display: flex; gap: 12px; align-items: baseline; }
.ed-prov-mark { font-size: 15px; line-height: 1; flex: 0 0 auto; }
.ed-prov-label { font-size: 15.5px; font-weight: 700; line-height: 1.2; margin: 0; }
.ed-prov-body { font-size: 13.5px; line-height: 1.42; margin: 3px 0 0; }
.ed-prov-foot { display: flex; align-items: center; gap: 14px; margin-top: 9px; padding-top: 10px;
  border-top: 1px solid rgb(var(--ink) / 0.16); }
.ed-prov-foot-name { font-size: 16px; font-weight: 600; line-height: 1.1; margin: 0;
  font-variation-settings: "opsz" 24, "wght" 600; }
.ed-prov-foot-sub { font-size: 12.5px; line-height: 1.35; margin: 4px 0 0; }

/* ===== MemoriamPage ===== */
/* ── In Memoriam — the students-letter page (mem-) ─────────────────────────── */
.mem-page { background: rgb(var(--bg)); }

/* Peacock plate, full-bleed */
.mem-ground { object-position: center 38%; }

/* Layered scrim: darkest at the edges + foot, lifting through the centre so the
   massive quote sits on air, not on a flat wash. */
.mem-scrim {
  position: absolute; inset: 0;
  background:
    radial-gradient(120% 88% at 50% 44%,
      rgba(8,7,6,0.28) 0%, rgba(8,7,6,0.60) 58%, rgba(8,7,6,0.86) 100%),
    linear-gradient(180deg,
      rgba(8,7,6,0.58) 0%, rgba(8,7,6,0.28) 24%,
      rgba(8,7,6,0.32) 66%, rgba(8,7,6,0.84) 100%);
}
/* Warm rust bloom, low-right, atmosphere only */
.mem-glow {
  position: absolute; inset: 0;
  background:
    radial-gradient(46% 52% at 80% 90%,
      rgb(var(--accent) / 0.22), rgb(var(--accent) / 0.05) 46%, transparent 70%);
  mix-blend-mode: screen;
}

/* Oversized wax-seal watermark, bleeding off the corner */
.mem-seal {
  position: absolute; z-index: 1;
  right: -32mm; bottom: -28mm;
  width: 118mm; height: 118mm;
  object-fit: contain;
  opacity: 0.16;
}

.mem-inner {
  position: relative; z-index: 3;
  height: 100%;
  display: flex; flex-direction: column;
  padding: 15mm 20mm 14mm;
}

/* Full-bleed hairlines with a rust lead */
.mem-hair {
  height: 1px; width: 100%;
  background: linear-gradient(90deg,
    rgb(var(--accent) / 0.9) 0%, rgb(var(--accent) / 0.9) 52px,
    rgb(var(--ink) / 0.18) 52px, rgb(var(--ink) / 0.18) 100%);
}
.mem-hair-foot { background: linear-gradient(90deg,
    rgb(var(--ink) / 0.10) 0%, rgb(var(--ink) / 0.20) 58%, rgb(var(--accent) / 0.75) 100%); }

/* Top frame */
.mem-top { flex: 0 0 auto; }
.mem-top .mem-hair { margin-top: 10px; }

/* The quote — vertically centred, filling the whole middle band */
.mem-quote {
  flex: 1 1 auto; margin: 0;
  position: relative;
  display: flex; flex-direction: column; justify-content: center;
  padding: 5mm 0 4mm;
  min-height: 0;
}
.mem-mark {
  position: absolute; top: -5mm; left: -7mm;
  font-family: "Fraunces", serif; font-style: italic; font-weight: 600;
  font-size: 150px; line-height: 1;
  color: rgb(var(--accent) / 0.44);
  pointer-events: none;
}
.mem-body {
  margin: 0;
  font-variation-settings: "opsz" 40, "wght" 500;
  font-size: 41px; line-height: 1.2;
  letter-spacing: -0.014em;
  max-width: 250mm;
  text-shadow: 0 1px 26px rgba(8,7,6,0.6);
}
/* Oversized cream initial — the quote opens like a monograph, fills the left */
.mem-body::first-letter {
  font-variation-settings: "opsz" 144, "wght" 600;
  font-size: 1.02em;
  color: rgb(var(--ink));
}
.mem-signoff {
  margin: 15px 0 0;
  font-variation-settings: "opsz" 72, "wght" 500;
  font-size: 50px; line-height: 1.02;
  letter-spacing: -0.018em;
  text-shadow: 0 1px 26px rgba(8,7,6,0.6);
}

/* Bottom frame — bold name + dates, full width */
.mem-foot { flex: 0 0 auto; }
.mem-namebar {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 20px; margin-top: 11px;
}
.mem-name {
  margin: 0;
  font-variation-settings: "opsz" 144, "wght" 600;
  font-size: 60px; line-height: 0.92;
  letter-spacing: -0.022em;
}
.mem-dates {
  margin: 0; flex: 0 0 auto;
  font-size: 14px; letter-spacing: 0.18em; text-transform: uppercase;
  white-space: nowrap; padding-bottom: 5px;
}

`;
