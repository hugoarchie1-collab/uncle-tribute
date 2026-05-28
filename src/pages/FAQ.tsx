import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Separator } from "../components/ui/separator";
import { Seo } from "../components/Seo";

/**
 * /faq — frequently asked questions.
 *
 * Eight sections, each with an editorial eyebrow + question (Playfair) +
 * answer (sans). Visual register sits between About and Legal — readable
 * long-form copy, not cinematic. Designed to be the first place a curious
 * buyer lands when they want to know "is this real?".
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
        your order, plus shipping. Framed orders need approximately
        <strong> two weeks</strong>. Prints hand-finished by Polly Wedge need
        approximately <strong>four weeks</strong>. You'll receive an email
        with tracking the moment your print leaves the studio.
      </>
    ),
  },
  {
    eyebrow: "Sizes & editions",
    question: "What sizes do you offer?",
    answer: (
      <>
        Four tiers. <strong>Atelier A3</strong> at £145 (open edition).
        <strong> Collector A2</strong> at £295 (limited edition of 100 per
        colourway). <strong>Atelier Grande A1</strong> at £595 (limited
        edition of 50). <strong>Heirloom A0</strong> at £1,250 (limited
        edition of 25 — currently by request only while we finalise A0
        fulfilment).
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
        on A1, plus a small framed-shipping surcharge calculated at
        checkout. Framed orders add roughly two weeks to the lead time.
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
        (A1). Allow four weeks from order to dispatch.
      </>
    ),
  },
  {
    eyebrow: "Shipping",
    question: "Do you ship internationally?",
    answer: (
      <>
        Yes — to Europe, North America, Australia and New Zealand. Shipping
        is flat-rate at checkout (UK £15 · Europe £35 · Rest of world £60),
        with a small surcharge applied to framed orders. International
        buyers may be charged local import duties or VAT on delivery by
        their courier — these are set by your country's customs authority,
        not by us.
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
    <div className="min-h-screen flex flex-col bg-bg">
      <Seo
        title="Frequently asked"
        description="Answers on the estate-stamped prints of Stephen Meakin's mandala paintings — provenance, paper, sizes and editions, framing, hand-finishing, shipping and after-sale care."
        url="/faq"
      />
      <Nav />
      <main className="flex-1 mx-auto w-full max-w-[760px] px-6 md:px-10 py-24 md:py-32">
        <Reveal as="header" className="mb-14">
          <p className="font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-accent m-0 mb-5">
            The Mandala Company
          </p>
          <h1 className="font-display font-bold tracking-tightest text-[clamp(40px,6vw,64px)] leading-[1.05] text-ink m-0">
            Frequently asked.
          </h1>
          <p className="font-sans font-normal text-[16px] sm:text-[17px] leading-[1.75] text-ink/75 mt-7 m-0 max-w-[620px]">
            The questions we hear most often about the prints, the editions,
            the framing, and how the estate handles a sale. If yours isn't
            here, write to us at{" "}
            <a
              href="mailto:info@themandalacompany.com"
              className="text-accent hover:underline"
            >
              info@themandalacompany.com
            </a>
            {" "}or via the <Link to="/contact" className="text-accent hover:underline">contact page</Link>.
          </p>
          <Separator className="bg-ink/15 mt-10" />
        </Reveal>

        <Reveal as="div" className="flex flex-col gap-14">
          {FAQS.map((qa, i) => (
            <section key={i} className="flex flex-col gap-4">
              <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-accent/85 m-0">
                {qa.eyebrow}
              </p>
              <h2 className="font-display font-bold tracking-[-0.025em] text-[clamp(22px,2.6vw,30px)] leading-[1.2] text-ink m-0">
                {qa.question}
              </h2>
              <div className="font-sans font-light text-[15.5px] leading-[1.8] text-ink/85">
                {qa.answer}
              </div>
            </section>
          ))}
        </Reveal>
      </main>
      <Footer />
    </div>
  );
};
