import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { Separator } from "../components/ui/separator";
import { Seo } from "../components/Seo";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { EYEBROW, TITLE, SUBTITLE } from "../components/ui/tokens";
import { cn } from "../lib/cn";

/**
 * /faq — frequently asked questions.
 *
 * Nine sections, each with an editorial eyebrow + question (font-display
 * serif, via the shared TITLE token) + answer (font-sans, muted ink). Visual
 * register sits between About and Legal — readable long-form copy, not
 * cinematic. Designed to be the first place a curious buyer lands when they
 * want to know "is this real?".
 */

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
        and hand-numbered within its edition. Each ships with a Certificate
        of Authenticity printed on estate letterhead. This is the convention
        used by the estates of Picasso, Hepworth and Hilma af Klint, and
        is the standard for posthumously-released editions.
      </>
    ),
  },
  {
    eyebrow: "Verification",
    question: "Can I check a certificate is genuine?",
    answer: (
      <>
        Yes — every allocated print is recorded in the estate's edition
        ledger, and any certificate can be checked against it on our{" "}
        <Link to="/verify" className="text-accent hover:underline">
          verification page
        </Link>
        . The online register covers editions allocated from June 2026
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
    eyebrow: "Sizes & editions",
    question: "What sizes do you offer?",
    answer: (
      <>
        Four print editions, each estate-stamped and hand-numbered.
        <strong> Gallery A3</strong> at £245 (limited edition of 150 per
        colourway). <strong>Collector's A2</strong> at £450 (limited edition
        of 100). <strong>Atelier A1</strong> at £850 (limited edition of 50).
        <strong> Heirloom A0</strong> at £1,750 (limited edition of 25 per
        colourway).
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

export const FAQ = () => {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Home "Moroccan Purple" peacock colourway, blurred — matches the home backdrop. */}
      <AmbientBackdrop src="/img/paintings/peacock-moroccan-purple-blur-v2.webp" opacity={0.4} />
      <Seo
        title="Frequently asked"
        description="Answers on the estate-stamped prints of Stephen Meakin's mandala paintings — provenance, paper, sizes and editions, framing, hand-finishing, shipping and after-sale care."
        url="/faq"
      />
      <Nav overlay />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[820px] 2xl:max-w-[960px] 3xl:max-w-[1040px] px-4 sm:px-6 md:px-8 lg:px-12 pt-[clamp(5rem,11vw,6.5rem)] pb-[clamp(4rem,8vw,6rem)]">
        <Reveal as="header" className="mb-[clamp(2rem,5vw,3rem)]">
          <p className={cn(EYEBROW, "m-0 mb-5")}>Before you buy</p>
          <h1 className={cn(TITLE, "m-0 !text-[clamp(30px,4.4vw,56px)] !leading-[1.05]")}>What people ask.</h1>
          <p className="font-sans font-normal text-[14.5px] md:text-[15px] leading-[1.6] text-ink-muted mt-[clamp(0.75rem,2vw,1.1rem)] m-0">
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
          <Separator className="bg-line mt-[clamp(0.875rem,2.5vw,1.25rem)]" />
        </Reveal>

        <Reveal as="div" className="flex flex-col gap-14">
          {FAQS.map((qa, i) => (
            <section key={i} className="flex flex-col gap-4">
              <p className={cn(EYEBROW, "m-0")}>
                {qa.eyebrow}
              </p>
              <h2 className={cn("font-display font-semibold tracking-[-0.04em] text-balance text-ink", "m-0 text-[clamp(24px,2.8vw,40px)] leading-[1.1]")}>
                {qa.question}
              </h2>
              <div className={cn(SUBTITLE, "max-w-none 2xl:max-w-[68ch] 2xl:text-[19px]")}>
                {qa.answer}
              </div>
            </section>
          ))}
        </Reveal>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
