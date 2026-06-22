import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { asset } from "../lib/asset";
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
        <Link to="/auth" className="text-accent hover:underline">
          Authentication page
        </Link>
        . The Estate Registry covers prints issued from June 2026
        onward; for an earlier or unlisted certificate, write to{" "}
        <a
          href="mailto:info@themandalacompany.com"
          className="text-accent hover:underline"
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
        <Link to="/contact" className="text-accent hover:underline">
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
        Yes — framing is offered on the A2 and A1 tiers. The frame is
        black-stained oak with <strong>cast acrylic glazing</strong> (we
        don't ship glass — too fragile in transit). Add £295 on A2 and £395
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
          className="text-accent hover:underline"
        >
          info@themandalacompany.com
        </a>
        {" "}within 14 days. If it arrived damaged, send a photo of the
        damage and we'll replace at no cost or refund — your choice. If it
        didn't arrive, we'll open a claim with the carrier and replace or
        refund within 30 days. The full policy lives on our{" "}
        <Link to="/returns" className="text-accent hover:underline">
          returns
        </Link>
        {" "}and <Link to="/terms" className="text-accent hover:underline">terms</Link> pages.
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
  <section className={cn(SECTION, "pt-14 md:pt-16 pb-5 md:pb-6")}>
    <div className="mx-auto w-full max-w-[1120px] 3xl:max-w-[1300px] text-center">
      <Reveal as="div" className="flex items-center gap-4 md:gap-6 border-b border-line pb-4 md:pb-5">
        <span aria-hidden className="h-px flex-1 bg-ink/15" />
        <span className={cn(EYEBROW, "shrink-0")}>Before you buy</span>
        <span aria-hidden className="h-px flex-1 bg-ink/15" />
        <span className={cn(EYEBROW_MUTED, "shrink-0")}>
          {ordinal(FAQS.length - 1)} questions
        </span>
        <span aria-hidden className="h-px flex-1 bg-ink/15" />
      </Reveal>

      <Reveal as="div" className="mt-3 md:mt-4">
        <h1
          className="font-display text-ink m-0"
          style={{ ...MASTHEAD_TITLE_STYLE, fontSynthesis: "none" }}
        >
          What people <em className="italic font-normal">ask</em>.
        </h1>
      </Reveal>

      <div className="mt-4 md:mt-5 border-t border-line pt-4 md:pt-5">
        <Reveal as="div">
          <p className={cn(EYEBROW_MUTED, "m-0 leading-[1.8]")}>
            Provenance · paper · editions · care
          </p>
        </Reveal>
        <Reveal as="div" delay={0.06} className="mt-5 md:mt-6">
          <p
            className="font-display font-normal tracking-[-0.01em] text-ink m-0 mx-auto max-w-[46ch] 3xl:max-w-[52ch]"
            style={{
              fontVariationSettings: '"opsz" 32, "wght" 400',
              fontSize: "clamp(21px, 2.5vw, 38px)",
              lineHeight: 1.32,
            }}
          >
            On provenance, paper, editions, framing, hand-finishing, shipping
            and after-sale care. For anything not covered here, write to{" "}
            <a
              href="mailto:info@themandalacompany.com"
              className="text-accent hover:underline"
            >
              info@themandalacompany.com
            </a>
            {" "}or use the{" "}
            <Link to="/contact" className="text-accent hover:underline">
              contact page
            </Link>
            .
          </p>
        </Reveal>
      </div>
    </div>
  </section>
);

// Single backdrop scene for /faq — palm silhouettes against a sunset sky,
// pre-blurred + darkened to the dark-family band. The Collections ScrollBackdrop
// treatment: one bg-cover layer drifting ±6% over the WHOLE-PAGE scroll (no
// section target), inset-[-8%] overscan so the parallax can never expose an
// uncovered strip, clipped by the overflow-hidden parent + the EXACT shared
// scrim. Reduced-motion drops the parallax and holds it static.
const FaqBackdrop = () => {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);
  const url = asset("/img/scenes/faq-palm-sunset-blur-v2.webp");

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {reduceMotion ? (
        <div
          style={{ backgroundImage: `url("${url}")`, willChange: "auto" }}
          className="absolute inset-0 bg-cover bg-center"
          aria-hidden="true"
        />
      ) : (
        <motion.div
          style={{ y, backgroundImage: `url("${url}")`, willChange: "transform" }}
          className="absolute inset-[-8%] bg-cover bg-center"
          aria-hidden="true"
        />
      )}
      {/* Shared scrim — the EXACT gradient the other scene pages use. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,7,6,0.50) 0%, rgba(8,7,6,0.66) 45%, rgba(8,7,6,0.82) 100%)",
        }}
      />
    </div>
  );
};

export const FAQ = () => {
  return (
    <div className="relative min-h-screen flex flex-col">
      <FaqBackdrop />
      <Seo
        title="Frequently asked"
        description="Answers on the estate-stamped prints of Stephen Meakin's mandala paintings — provenance, paper, sizes and editions, framing, hand-finishing, shipping and after-sale care."
        url="/faq"
      />
      <Nav overlay />
      <main className="relative z-10 flex-1">
        {/* 1 · MASTHEAD — bold left-aligned front cover. */}
        <FaqMasthead />

        {/* 2 · THE QUESTIONS — a numbered two-column editorial register. Each
            answer / eyebrow / question is verbatim; only the LAYOUT changed
            from the old single thin column with gap-14 dead air. The grid is
            self-densifying — items flow two-up on md+ filling the horizontal
            space, divided by hairlines so they read as dense blocks, not an
            endless scroll. */}
        <section className={cn(SECTION, "pb-8 md:pb-10")}>
          <Reveal
            as="div"
            className="mx-auto flex w-full max-w-[1100px] 3xl:max-w-[1500px] 4xl:max-w-[1720px] flex-wrap justify-center gap-x-10 lg:gap-x-16 3xl:gap-x-24 gap-y-7 3xl:gap-y-9 border-t border-line"
          >
            {FAQS.map((qa, i) => (
              <section
                key={i}
                className="relative flex flex-[0_1_clamp(300px,44%,480px)] 3xl:flex-[0_1_clamp(300px,46%,700px)] 4xl:flex-[0_1_clamp(300px,46%,800px)] flex-col pt-6 md:pt-7 border-t border-line first:border-t-0 md:[&:nth-child(2)]:border-t-0"
              >
                <div className="flex items-baseline gap-4">
                  <span
                    aria-hidden
                    className="font-display font-semibold leading-none text-accent/55 select-none shrink-0"
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
                  className={cn(
                    "font-display font-semibold tracking-[-0.035em] text-balance text-ink m-0 mt-3",
                    "text-[clamp(23px,2.5vw,42px)] leading-[1.08]",
                  )}
                >
                  {qa.question}
                </h2>
                <div className={cn(SUBTITLE, "max-w-none mt-5 md:mt-6 !text-[clamp(18px,1.1vw,25px)] !leading-[1.7]")}>
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
