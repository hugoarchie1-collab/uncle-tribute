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
        large-format giclée press. Each is made to order at Point 101, London —
        a Hahnemühle Certified Studio used by museums and contemporary artists
        alike. Lifespan under normal display conditions is in excess of 200
        years.
        <br />
        <br />
        Prefer a different finish? Point 101 also prints across a range of
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
        Unframed prints dispatch within <strong>7–10 working days</strong> of
        your order, with free delivery worldwide. Framed orders add roughly
        <strong> two weeks</strong> to that. Prints hand-finished by Polly Wedge
        dispatch within <strong>two weeks</strong> maximum. You'll receive an
        email with tracking the moment your print leaves the studio.
      </>
    ),
  },
  {
    eyebrow: "Sizes & editions",
    question: "What sizes do you offer?",
    answer: (
      <>
        Four tiers, each estate-stamped and issued within the estate's release
        cycle. <strong>Open Edition A3</strong> at £245 (issued within each
        edition, no fixed allocation). <strong>Collector Edition A2</strong> at
        £450 (edition of 200). <strong>Atelier Edition A1</strong> at £850
        (edition of 75). <strong>Heirloom Edition A0</strong> at £1,750
        (edition of 18).
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
        (natural oak, stained black, white or walnut tray), with shatter-safe
        acrylic glazing as standard or a museum-grade anti-reflective upgrade,
        every finish included in the framing price. Add £295 on A2 and £395
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
        Yes — to the UK, Europe, North America, Australia and New Zealand.
        Delivery is free worldwide on every order, framed or unframed, with
        nothing added at checkout. International buyers may be charged local
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

/** Two-digit ordinal for the question rail — 01 · 02 · 03 … */
const ordinal = (i: number) => String(i + 1).padStart(2, "0");

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
    className={cn(SECTION, "pt-8 md:pt-11 pb-5 md:pb-7")}
    style={{ textShadow: "0 2px 18px rgba(0,0,0,0.82), 0 1px 4px rgba(0,0,0,0.6)" }}
  >
    <div className="mx-auto w-full max-w-[1240px] 2xl:max-w-[1380px] 3xl:max-w-[1520px] text-center">
      <Reveal as="div" className="flex items-center gap-4 md:gap-6 border-b border-line pb-3 md:pb-3.5">
        <span aria-hidden className="h-px flex-1 bg-ink/15" />
        <span className={cn(EYEBROW, "shrink-0")}>Before you buy</span>
        <span aria-hidden className="h-px flex-1 bg-ink/15" />
        <span className={cn(EYEBROW_MUTED, "shrink-0")}>
          {ordinal(FAQS.length - 1)} questions
        </span>
        <span aria-hidden className="h-px flex-1 bg-ink/15" />
      </Reveal>

      <Reveal as="div" className="mt-2.5 md:mt-3">
        <h1
          className="font-display text-ink m-0"
          style={{ ...MASTHEAD_TITLE_STYLE, fontSynthesis: "none" }}
        >
          What people <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>ask</em>.
        </h1>
      </Reveal>

      <div className="mt-3 md:mt-4 border-t border-line pt-3 md:pt-4">
        <Reveal as="div">
          <p className={cn(EYEBROW_MUTED, "m-0 leading-[1.8]")}>
            Provenance · paper · editions · care
          </p>
        </Reveal>
        <Reveal as="div" delay={0.06} className="mt-3 md:mt-4">
          <p
            className="font-display font-normal tracking-[-0.01em] text-ink m-0 mx-auto max-w-[72ch] 3xl:max-w-[80ch]"
            style={{
              fontVariationSettings: '"opsz" 32, "wght" 400',
              fontSize: "clamp(20px, 2vw, 34px)",
              lineHeight: 1.3,
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
          "/img/scenes/faq-scene-a-v2.webp",
          "/img/scenes/faq-scene-b-v2.webp",
        ]}
      />
      <Seo
        title="Frequently asked"
        description="Answers on the estate-stamped prints of Stephen Meakin's mandala paintings — provenance, paper, sizes and editions, framing, hand-finishing, shipping and after-sale care."
        url="/faq"
      />
      <Nav />
      <main className="relative z-10 flex-1">
        {/* 1 · MASTHEAD — bold left-aligned front cover. */}
        <FaqMasthead />

        {/* 2 · THE QUESTIONS — a numbered two-column editorial register. Each
            answer / eyebrow / question is verbatim; only the LAYOUT changed
            from the old single thin column with gap-14 dead air. The grid is
            self-densifying — items flow two-up on md+ filling the horizontal
            space, divided by hairlines so they read as dense blocks, not an
            endless scroll. */}
        <section
          className={cn(SECTION, "pb-10 md:pb-14")}
          style={{ textShadow: "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
        >
          <Reveal
            as="div"
            className="mx-auto grid w-full max-w-[1240px] 2xl:max-w-[1380px] 3xl:max-w-[1520px] grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-16 3xl:gap-x-24 gap-y-0 border-t border-line"
          >
            {FAQS.map((qa, i) => (
              <section
                key={i}
                aria-labelledby={`faq-q-${i}`}
                className="relative flex flex-col pt-4 md:pt-5 pb-4 md:pb-5 border-t border-line first:border-t-0 md:[&:nth-child(2)]:border-t-0"
              >
                <div className="flex items-baseline gap-4">
                  <span
                    aria-hidden
                    className="font-display font-semibold leading-none text-accent select-none shrink-0"
                    style={{
                      fontVariationSettings: '"opsz" 32, "wght" 600',
                      fontSize: "clamp(20px,1.7vw,26px)",
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
                    "text-[clamp(22px,2.2vw,36px)] leading-[1.06]",
                  )}
                >
                  {qa.question}
                </h2>
                <div className={cn(SUBTITLE, "max-w-none mt-3 md:mt-3.5")}>
                  {qa.answer}
                </div>
              </section>
            ))}
          </Reveal>
        </section>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
