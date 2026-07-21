import { isValidElement, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { EYEBROW, EYEBROW_MUTED, SUBTITLE } from "../components/ui/tokens";
import { MASTHEAD_TITLE_STYLE } from "../components/ui/tokens";
import { cn } from "../lib/cn";

/**
 * /faq — frequently asked questions.
 *
 * Set to the refined-masthead house pattern (the shared MASTHEAD_TITLE_STYLE
 * cut, opsz 144 / wght 560): a meta rule + a Fraunces statement with prestige
 * restraint — large but never shouting, one word italic at regular weight —
 * supporting copy packed immediately beneath under a hairline. The eight
 * questions then run as a NUMBERED two-column editorial register (a bordered
 * question grid), densifying what was a single thin column of stacked
 * paragraphs into dense horizontal blocks. Compressed vertical rhythm
 * throughout. Visual register sits between About and Legal — readable
 * long-form copy, not cinematic. Designed to be the first place a curious
 * buyer lands when they want to know "is this real?".
 *
 * ⚠️ EVERY answer / eyebrow / question below is verbatim — restructure LAYOUT
 * only; never edit the copy, links, emails or prices.
 */

const SECTION =
  "mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] 4xl:max-w-[1880px] px-4 sm:px-6 md:px-8 lg:px-12";

interface QA {
  eyebrow: string;
  question: string;
  answer: React.ReactNode;
}

const FAQS: QA[] = [
  {
    eyebrow: "Provenance",
    question: "Are the prints signed?",
    answer: (
      <>
        No — Stephen passed in 2021, so prints cannot be signed in his hand.
        Every print is <strong>estate-stamped</strong> by The Mandala Company
        and numbered within its edition. Each ships with a Certificate
        of Authenticity carrying a unique Certificate ID. This is the convention
        used by the estates of Picasso, Hepworth and Hilma af Klint, and
        is the standard for works released posthumously by an estate.
      </>
    ),
  },
  {
    eyebrow: "Verification",
    question: "Can I check a certificate is genuine?",
    answer: (
      <>
        Yes — every issued print is recorded in the estate ledger, and any
        Certificate ID can be checked against it on our{" "}
        <Link to="/auth" className="text-accent rounded-sm hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/70">
          Authentication page
        </Link>
        . The Estate Registry covers prints issued from June 2026
        onward; for an earlier or unlisted certificate, write to{" "}
        <a
          href="mailto:info@themandalacompany.com"
          className="text-accent rounded-sm hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          info@themandalacompany.com
        </a>
        {" "}and the estate will confirm it directly.
      </>
    ),
  },
  {
    eyebrow: "The print itself",
    question: "What are the prints made on — and can I have canvas?",
    answer: (
      <>
        As standard, every print is made on <strong>350gsm Hahnemühle archival
        cotton-rag paper</strong>, printed with pigment inks on a 12-colour
        large-format giclée press. Each is made to order in London, at
        a Hahnemühle Certified Studio used by museums and contemporary artists
        alike. Under normal display conditions it carries archival,
        museum-grade lightfastness rated by the paper manufacturer.
        <br />
        <br />
        Prefer a different finish? Our atelier also prints across a range of
        fine-art papers and gallery <strong>canvas</strong>. As a guide: choose{" "}
        <strong>paper</strong> if you plan to glass-frame the piece in the
        traditional way; choose <strong>canvas</strong> for a bold, tactile,
        frameless surface that reads like an original painting. For canvas or an
        alternative paper, just{" "}
        <Link to="/contact" className="text-accent rounded-sm hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/70">
          tell us
        </Link>{" "}
        when you order and we'll arrange it with the atelier.
      </>
    ),
  },
  {
    eyebrow: "Lead time",
    question: "How long until my print arrives?",
    answer: (
      <>
        Unframed prints are <strong>dispatched within 7–10 working days</strong>{" "}
        of your order; with tracked courier transit on top, most orders arrive
        within <strong>roughly two to three weeks</strong>. Delivery is free
        worldwide. Framed orders add roughly two weeks to that. Prints
        hand-finished by Polly Wedge dispatch within two weeks maximum. You'll
        receive an email with tracking the moment your print leaves the studio.
      </>
    ),
  },
  {
    eyebrow: "Sizes & editions",
    question: "What sizes do you offer?",
    answer: (
      <>
        Four tiers, each estate-stamped and issued within the estate's release
        cycle, every price including free UK delivery. <strong>Open Edition
        A3</strong> at £275 (issued within each edition, no fixed allocation).{" "}
        <strong>Collector Edition A2</strong> at £495 (edition of 200).{" "}
        <strong>Atelier Edition A1</strong> at £925 (edition of 75).{" "}
        <strong>Heirloom Edition A0</strong> at £1,895 (edition of 18).
      </>
    ),
  },
  {
    eyebrow: "Framing",
    question: "Can I have my print framed?",
    answer: (
      <>
        Yes — framing is offered on the A2 and A1 tiers. Choose your{" "}
        <strong>finish</strong> — a solid-wood or contemporary tray frame
        (natural oak, stained black, white or walnut tray), with UV-filtering,
        shatter-safe acrylic glazing as standard or an anti-reflective glass
        upgrade, every finish included in the framing price. Add £345 on A2 and £445
        on A1. Delivery is free worldwide, framed or unframed — there is no
        framing surcharge at checkout. Framed orders add roughly two weeks to
        the lead time.
      </>
    ),
  },
  {
    eyebrow: "Hand-finishing",
    question: 'What is "hand-finished by Polly"?',
    answer: (
      <>
        Polly Wedge, Stephen's sister, hand-paints additional geometric
        detail onto selected prints in Stephen's own tradition. Each
        hand-finished piece is therefore unique. The add-on is available on
        the A2 and A1 tiers only, by request, and adds £350 (A2) or £495
        (A1). Allow two weeks maximum from order to dispatch.
      </>
    ),
  },
  {
    eyebrow: "Shipping",
    question: "Do you ship internationally?",
    answer: (
      <>
        Yes — we ship worldwide. Delivery is free on every order, framed or
        unframed, with nothing added at checkout. International buyers may be charged local
        import duties or VAT on delivery by their courier — these are set by
        your country's customs authority, not by us.
      </>
    ),
  },
  {
    eyebrow: "After-sale care",
    question: "What if my print arrives damaged or doesn't arrive?",
    answer: (
      <>
        Write to{" "}
        <a
          href="mailto:info@themandalacompany.com"
          className="text-accent rounded-sm hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          info@themandalacompany.com
        </a>
        {" "}within 14 days. If it arrived damaged, send a photo of the
        damage and we'll replace at no cost or refund — your choice. If it
        didn't arrive, we'll open a claim with the carrier and replace or
        refund within 30 days. The full policy lives on our{" "}
        <Link to="/returns" className="text-accent rounded-sm hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/70">
          returns
        </Link>
        {" "}and <Link to="/terms" className="text-accent rounded-sm hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/70">terms</Link> pages.
      </>
    ),
  },
];

/** Flatten an answer's React node to plain text for the FAQPage schema — one
 *  source of truth so the structured data can never drift from the visible
 *  answer (Google requires the two match). */
const nodeText = (node: ReactNode): string => {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement(node)) {
    if (node.type === "br") return " ";
    const props = node.props as { children?: ReactNode };
    return nodeText(props.children);
  }
  return "";
};

/** FAQPage structured data — wins expandable FAQ rich-results in Google (free
 *  organic SERP real estate). Built from the SAME FAQS the page renders (via
 *  nodeText), so the schema text can never diverge from what the user sees. */
const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((qa) => ({
    "@type": "Question",
    name: qa.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: nodeText(qa.answer).replace(/\s+/g, " ").trim(),
    },
  })),
};

/** Two-digit ordinal for the question rail — 01 · 02 · 03 … */
const ordinal = (i: number) => String(i + 1).padStart(2, "0");

// ─── QaItem ──────────────────────────────────────────────────────────────────
// One question block — the ordinal + eyebrow header, the Fraunces question, then
// the verbatim answer. Carries its ORIGINAL index `i` so the ordinal + schema
// numbering never drift as items flow across the two multi-columns. Each item
// owns a top hairline + break-inside-avoid so it stays whole within a column and
// stacked items read as dense, divided blocks.
const QaItem = ({ qa, i }: { qa: QA; i: number }) => (
  <section
    aria-labelledby={`faq-q-${i}`}
    className="relative flex break-inside-avoid flex-col border-t border-line pt-3.5 md:pt-4 pb-3.5 md:pb-4"
  >
    <div className="flex items-baseline gap-4">
      <span
        aria-hidden
        className="font-display font-semibold leading-none text-accent select-none shrink-0"
        style={{
          fontVariationSettings: '"opsz" 32, "wght" 600',
          fontSize: "clamp(22px,1.9vw,30px)",
        }}
      >
        {ordinal(i)}
      </span>
      <p className={cn(EYEBROW, "m-0 self-center")}>{qa.eyebrow}</p>
    </div>
    <h2
      id={`faq-q-${i}`}
      className={cn(
        "font-display font-bold [font-variation-settings:'opsz'_48,'wght'_700] tracking-[-0.04em] text-balance text-ink m-0 mt-2",
        "text-[clamp(24px,2.4vw,38px)] leading-[1.05]",
      )}
    >
      {qa.question}
    </h2>
    <div className={cn(SUBTITLE, "max-w-none mt-2.5 md:mt-3")}>{qa.answer}</div>
  </section>
);

// ─── FaqMasthead ─────────────────────────────────────────────────────────────
// The refined front cover — the shared MASTHEAD_TITLE_STYLE cut (opsz 144,
// real loaded weight 560, font-synthesis none): a meta rule (eyebrow + hairline
// + question count), then the page statement set with prestige restraint — large
// but never shouting — with one word italic at regular weight (the auction-house
// "title of a work" signal), then the supporting passage packed immediately
// beneath under a border-t.
const FaqMasthead = () => (
  // Legibility shadow inherited by every text node (text-shadow cascades) so the
  // cream copy stays readable over the faq-palm-sunset photo — matching the
  // sister Contact page, which shadows all its nodes (the brightness rule: the
  // backdrop must never out-shout the text). Whole-element, not per-glyph, so
  // gotcha #2 (no SplitReveal blockiness) is not triggered.
  <section
    className={cn(SECTION, "pt-6 md:pt-8 pb-3 md:pb-4")}
    style={{ textShadow: "0 2px 18px rgba(0,0,0,0.82), 0 1px 4px rgba(0,0,0,0.6)" }}
  >
    <div className="mx-auto w-full max-w-[1240px] 2xl:max-w-[1380px] 3xl:max-w-[1520px] 4xl:max-w-[1720px] text-center">
      <Reveal as="div">
        <h1
          className="font-display text-ink m-0"
          style={{ ...MASTHEAD_TITLE_STYLE, fontSynthesis: "none" }}
        >
          What people <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>ask</em>.
        </h1>
      </Reveal>

      <div className="mt-2.5 md:mt-3 border-t border-line pt-2.5 md:pt-3">
        <Reveal as="div">
          <p className={cn(EYEBROW_MUTED, "m-0 leading-[1.6]")}>
            Provenance · paper · editions · care
          </p>
        </Reveal>
        <Reveal as="div" delay={0.06} className="mt-2 md:mt-2.5">
          <p
            className="font-display font-normal tracking-[-0.01em] text-ink m-0 mx-auto max-w-[72ch] 3xl:max-w-[80ch]"
            style={{
              fontVariationSettings: '"opsz" 32, "wght" 430',
              fontSize: "clamp(22px, 2.2vw, 38px)",
              lineHeight: 1.28,
            }}
          >
            On provenance, paper, editions, framing, hand-finishing, shipping
            and after-sale care. For anything not covered here, write to{" "}
            <a
              href="mailto:info@themandalacompany.com"
              className="text-accent rounded-sm hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/70"
            >
              info@themandalacompany.com
            </a>
            {" "}or use the{" "}
            <Link to="/contact" className="text-accent rounded-sm hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/70">
              contact page
            </Link>
            .
          </p>
        </Reveal>
      </div>
    </div>
  </section>
);

export const FAQ = () => {
  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      {/* Hugo's two certified FAQ scenes (lupin lakeshore → alpine night),
          crossfading seamlessly over the page scroll — the canonical
          SceneBackdrop treatment so /faq matches every other scene page. */}
      <SceneBackdrop
        src={[
          "/img/scenes/faq-scene-a-v3.webp",
          "/img/scenes/faq-scene-b-v3.webp",
        ]}
      />
      <Seo
        title="Frequently asked"
        description="Answers on the estate-stamped prints of Stephen Meakin's mandala paintings — provenance, paper, sizes and editions, framing, hand-finishing, shipping and after-sale care."
        url="/faq"
        jsonLd={FAQ_JSONLD}
      />
      <Nav />
      <main className="relative z-10 flex-1">
        {/* 1 · MASTHEAD — bold left-aligned front cover. */}
        <FaqMasthead />

        {/* 2 · THE QUESTIONS — a numbered two-column editorial register. Each
            answer / eyebrow / question is verbatim; only the LAYOUT changed —
            from a single CSS grid (whose paired cells shared the taller row's
            height, hollowing out a void under a short answer) to CSS
            multi-columns that flow and pack independently with no row coupling,
            divided by hairlines so they read as dense blocks, not an endless
            scroll. */}
        <section
          className={cn(SECTION, "pb-6 md:pb-9")}
          style={{ textShadow: "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
        >
          {/* TWO INDEPENDENT NEWSPAPER COLUMNS — CSS multi-column so each item
              packs tightly against the one above it with NO shared row height.
              The old single CSS grid coupled both cells in a row to the taller
              one's height, leaving a hollow void under a short answer (the
              "shipping"/"lead time" jigsaw gap). Multi-column has no rows to
              couple: items flow down column one, then column two, auto-balanced
              to roughly equal heights, in ascending 01→09 order (so mobile's
              single column stays in sequence too). Each item carries a top
              hairline and break-inside-avoid, so both columns open on a clean
              divider aligned at the top and stacked items read as dense blocks. */}
          <Reveal
            as="div"
            className="mx-auto w-full max-w-[1240px] 2xl:max-w-[1380px] 3xl:max-w-[1520px] 4xl:max-w-[1720px] md:columns-2 gap-x-10 lg:gap-x-12 3xl:gap-x-16 [column-fill:balance]"
          >
            {FAQS.map((qa, i) => (
              <QaItem key={i} qa={qa} i={i} />
            ))}
          </Reveal>
        </section>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
