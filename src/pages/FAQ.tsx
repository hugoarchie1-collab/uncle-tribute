import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { EYEBROW, EYEBROW_MUTED, SUBTITLE } from "../components/ui/tokens";
import { cn } from "../lib/cn";

/**
 * /faq — frequently asked questions.
 *
 * Redesigned to the bold/dense house pattern (the AboutMasthead law): a meta
 * rule + a LARGE left-aligned Fraunces statement filling the width, supporting
 * copy packed immediately beneath under a hairline — NOT a timid eyebrow +
 * shrunk centred title floating in a narrow column. The eight questions then
 * run as a NUMBERED two-column editorial register (a bordered question grid),
 * densifying what was a single thin column of stacked paragraphs into dense
 * horizontal blocks. Compressed vertical rhythm throughout (no big gap-14 air,
 * no clamp(5rem,…) hero pad). Visual register sits between About and Legal —
 * readable long-form copy, not cinematic. Designed to be the first place a
 * curious buyer lands when they want to know "is this real?".
 *
 * ⚠️ EVERY answer / eyebrow / question below is verbatim — restructure LAYOUT
 * only; never edit the copy, links, emails or prices.
 */

const SECTION =
  "mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12";

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
        and numbered within its drop. Each ships with a Certificate
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
    question: "What are the prints made on?",
    answer: (
      <>
        350gsm Hahnemühle archival paper, printed with pigment inks on a
        12-colour large-format giclée press. Each print is made to order at
        Point 101, London — one of the UK's leading giclée print ateliers,
        used by museums and contemporary artists alike. Lifespan under
        normal display conditions is in excess of 200 years.
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
    eyebrow: "Sizes & drops",
    question: "What sizes do you offer?",
    answer: (
      <>
        Four tiers, each estate-stamped and issued within the estate's drop
        cycle. <strong>Open Edition A3</strong> at £245 (issued within each
        drop, no fixed allocation). <strong>Collector Drop A2</strong> at £450
        (200 allocated per drop). <strong>Atelier Drop A1</strong> at £850
        (75 per drop). <strong>Heirloom Drop A0</strong> at £1,750 (18 per
        drop).
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
// The bold front cover — the AboutMasthead recipe ported to FAQ: a meta rule
// (eyebrow + hairline + question count), the page statement set ENORMOUS and
// edge-to-edge in Fraunces (opsz 48, real loaded weight 700, font-synthesis
// none), then the supporting passage packed immediately beneath under a
// border-t — so the first screen is dense confident type filling the width,
// not a shrunk centred title floating in a thin column.
const FaqMasthead = () => (
  <section className={cn(SECTION, "pt-28 md:pt-36 pb-8 md:pb-12")}>
    <Reveal as="div" className="flex items-center gap-4 md:gap-6 border-b border-line pb-4 md:pb-5">
      <span className={EYEBROW}>Before you buy</span>
      <span aria-hidden className="h-px flex-1 bg-ink/15" />
      <span className={cn(EYEBROW_MUTED, "shrink-0")}>
        {ordinal(FAQS.length - 1)} questions
      </span>
    </Reveal>

    <Reveal as="div" className="mt-4 md:mt-6">
      <h1
        className="font-display font-bold tracking-[-0.045em] text-ink m-0 leading-[0.84]"
        style={{
          fontVariationSettings: '"opsz" 48, "wght" 700',
          fontSynthesis: "none",
          fontSize: "clamp(58px, 12vw, 220px)",
        }}
      >
        What people<br />ask.
      </h1>
    </Reveal>

    <div className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-5 items-start border-t border-line pt-6 md:pt-8">
      <Reveal as="div" className="lg:col-span-3">
        <p className={cn(EYEBROW_MUTED, "m-0 leading-[1.8]")}>
          Provenance · paper · editions · care
        </p>
      </Reveal>
      <Reveal as="div" delay={0.06} className="lg:col-span-9">
        <p
          className="font-display font-normal tracking-[-0.01em] text-ink m-0 max-w-[40ch]"
          style={{
            fontVariationSettings: '"opsz" 32, "wght" 400',
            fontSize: "clamp(21px, 2.5vw, 34px)",
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
  </section>
);

export const FAQ = () => {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Home "Moroccan Purple" peacock colourway, blurred — matches the home backdrop. */}
      <AmbientBackdrop src="/img/paintings/peacock-moroccan-purple-blur-v3.webp" opacity={0.4} />
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
        <section className={cn(SECTION, "pb-8 md:pb-16")}>
          <Reveal
            as="div"
            className="grid grid-cols-1 md:grid-cols-2 gap-x-10 lg:gap-x-16 gap-y-10 md:gap-y-12 border-t border-line"
          >
            {FAQS.map((qa, i) => (
              <section
                key={i}
                className="relative flex flex-col gap-3.5 pt-7 md:pt-9 border-t border-line first:border-t-0 md:[&:nth-child(2)]:border-t-0"
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
                    "font-display font-semibold tracking-[-0.035em] text-balance text-ink m-0",
                    "text-[clamp(23px,2.4vw,34px)] leading-[1.08]",
                  )}
                >
                  {qa.question}
                </h2>
                <div className={cn(SUBTITLE, "max-w-none !text-[17px] md:!text-[18px] 2xl:!text-[19px] !leading-[1.7]")}>
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
