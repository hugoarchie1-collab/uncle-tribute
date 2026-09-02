/* eslint-disable react-refresh/only-export-components -- data module: verbatim FAQ copy (JSX answers), not a component */
import { isValidElement, type ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * The frequently-asked questions — ONE source of truth.
 *
 * 2026-09-02: the dedicated /faq page was retired (Hugo: too many small pages
 * looked messy). The same verbatim Q&As now render as the on-page accordion
 * (src/components/FaqAccordion.tsx) on every product page AND on /contact#faq,
 * which /faq redirects to. Lifting the data out of the old page also removes
 * the page→Nav→SearchBar→search.ts import cycle that forced search.ts to carry
 * a hand-copied mirror (scripts/check-faq-mirror.mjs still verifies it).
 *
 * ⚠️ EVERY answer / eyebrow / question below is verbatim — never edit the copy,
 * links, emails or prices without changing every mirror (search.ts FAQ_SEEDS,
 * scripts/prerender.ts FAQ_QUESTIONS, the terms of sale in Legal.tsx).
 *
 * 2026-09-01: three GIFT-CARD Q&As added (Gifting / Redeeming / Gift value),
 * sitting just above Family & Friends. Every fact in them is mirrored from the
 * code — validity from GIFT_VALID_DAYS (api/stripe-webhook.ts), the £25–£5,000
 * window from GIFT_MIN/MAX_PENCE (src/lib/basket.ts), the £250 floor from
 * getTierAdvertisedPricePence (src/data/paintings.ts) — and from the "Gift
 * cards" section of the terms of sale (src/pages/Legal.tsx). Change one,
 * change all.
 */

export interface QA {
  eyebrow: string;
  question: string;
  answer: React.ReactNode;
}

// Exported so the product page can render the SAME verbatim Q&As inline (a DROOL-
// style on-page FAQ accordion, src/components/FaqAccordion.tsx) — one source of
// truth, so the two surfaces can never drift. Never duplicate/rewrite this copy.
export const FAQS: QA[] = [
  {
    eyebrow: "Provenance",
    question: "Are the prints signed?",
    answer: (
      <>
        No — Stephen passed in 2021, so prints cannot be signed in his hand.
        Every print is <strong>estate-stamped</strong> by The Mandala Company
        and numbered within its edition. Each is issued with a Certificate
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
        As standard, every print is made on <strong>Hahnemühle Photo Rag —
        308gsm, 100% cotton archival paper</strong>, printed with pigment inks on a 12-colour
        large-format giclée press. Each is made to order on the Sussex coast, at
        a Hahnemühle Certified Studio. Under normal display conditions it carries archival,
        museum-grade lightfastness rated by the paper manufacturer.
        <br />
        <br />
        Every piece is offered two ways, and you choose on the product page:{" "}
        <strong>framed</strong> — the giclée on fine-art paper, hand-mounted and
        framed in solid wood behind glass, ready to hang; or{" "}
        <strong>canvas</strong> — the same image as a fine-art giclée print on
        heavyweight 370gsm art canvas, a bold, tactile, glass-free surface. Both
        are made to order at the same price — pick whichever suits
        your wall, or{" "}
        <Link to="/contact" className="text-accent rounded-sm hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/70">
          ask us
        </Link>{" "}
        if you'd like a hand.
      </>
    ),
  },
  {
    eyebrow: "Lead time",
    question: "How long until my print arrives?",
    answer: (
      <>
        Every piece is made to order — framed in solid wood, or a fine-art canvas
        print — and <strong>dispatched within 2–4 working days</strong> of
        your order; with tracked courier transit on top, most UK orders arrive
        within <strong>about a week</strong> (a few days more overseas). Delivery is free
        worldwide. Prints hand-finished by Polly (Stephen's sister) are completed
        by hand first, so allow up to two weeks. You'll receive an email with tracking the
        moment your print leaves the studio.
      </>
    ),
  },
  {
    eyebrow: "Sizes & editions",
    question: "What sizes do you offer?",
    answer: (
      <>
        Four sizes, each estate-stamped — framed in solid wood and ready to hang,
        or a fine-art canvas print, with the frame or canvas included in the
        price and free delivery worldwide. <strong>Emblem Edition</strong> at £250 (the accessible entry, unnumbered — issued to order).{" "}
        <strong>Gallery Edition</strong> at £445 (unnumbered, issued to order — no fixed allocation).{" "}
        <strong>Collector Edition</strong> at £750 (edition of 200).{" "}
        <strong>Atelier Edition</strong> at £1,300 (edition of 75).
      </>
    ),
  },
  {
    eyebrow: "Framing",
    question: "Can I have my print framed?",
    answer: (
      <>
        Every piece arrives framed and ready to hang — the edition price already
        includes a white window mount, a solid-wood frame and glazing, so there
        is no unframed option and no separate framing charge. Choose your{" "}
        <strong>frame</strong> on the product page — solid wood in oak, white or
        black, glazed with clear, edge-polished float glass. Prefer canvas? Every
        piece is also offered as a fine-art 370gsm canvas print, at the same price.
        Framed and canvas orders are made to order — allow roughly two weeks;
        delivery is free worldwide.
      </>
    ),
  },
  {
    eyebrow: "Hand-finishing",
    question: 'What is "hand-finished by Polly"?',
    answer: (
      <>
        Polly (Stephen's sister) hand-paints additional geometric
        detail onto selected prints in Stephen's own tradition. Each
        hand-finished piece is therefore unique. The add-on is available on
        the Collector and Atelier editions, by request, and adds £595 (Collector)
        or £895 (Atelier). Allow two weeks maximum from order to dispatch.
      </>
    ),
  },
  {
    eyebrow: "Shipping",
    question: "Do you ship internationally?",
    answer: (
      <>
        Yes — we ship worldwide. Delivery is free on every order, framed or
        on canvas, with nothing added at checkout. International buyers may be charged local
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
        <Link to="/legal#returns" className="text-accent rounded-sm hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/70">
          returns
        </Link>
        {" "}and <Link to="/legal#terms" className="text-accent rounded-sm hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/70">terms</Link> pages.
      </>
    ),
  },
  {
    eyebrow: "Gifting",
    question: "How does a gift card reach the person I'm giving it to?",
    answer: (
      <>
        By email, the moment your payment clears — there is nothing to post and
        no delivery cost. Give us their email address and the code goes straight
        to them with whatever note you wrote; leave it blank and it comes back
        to you, to hand over yourself. The estate is copied on every gift email,
        so if it doesn't land, write to{" "}
        <a
          href="mailto:info@themandalacompany.com"
          className="text-accent rounded-sm hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          info@themandalacompany.com
        </a>
        {" "}and we'll send the code again.
      </>
    ),
  },
  {
    eyebrow: "Redeeming",
    question: "How is a gift card spent — and does it expire?",
    answer: (
      <>
        The person holding it chooses whatever piece they like and enters the
        code in the promotion-code box at checkout. It isn't tied to a name or
        an address, so it can be passed on. It is{" "}
        <strong>valid for one year</strong> from the day it's bought, and that
        date is written in the email carrying it. A card is issued in the
        currency it was bought in and carries the estate's equivalent value in
        each of the others we show, so it can be spent whichever currency the
        site is set to.
      </>
    ),
  },
  {
    eyebrow: "Gift value",
    question: "What if a gift card doesn't cover the whole order?",
    answer: (
      <>
        If the order comes to more than the card, the balance is simply paid at
        checkout. Our least expensive print is <strong>£250</strong>, so a card
        below that is a contribution towards one rather than a whole print. A
        card is used once, on a single order, and any unspent value isn't
        refunded or carried forward — so it's best spent in one go. Changed your
        mind? Write to{" "}
        <a
          href="mailto:info@themandalacompany.com"
          className="text-accent rounded-sm hover:underline focus-visible:outline-none focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          info@themandalacompany.com
        </a>
        {" "}within 14 days of buying it and we'll refund it in full, as long as
        the code hasn't been used.
      </>
    ),
  },
  {
    eyebrow: "Family & Friends",
    question: "Is there a discount for a second print?",
    answer: (
      <>
        Every order includes a <strong>Family &amp; Friends</strong> card —{" "}
        <strong>10% towards your next print</strong>, and one to pass to someone
        you love. It arrives with your order confirmation as a single-use code,
        valid for one year, redeemable against any future print at checkout.
        First purchases are always at full price; the gesture is the estate's
        thank-you for taking one of Steve's works into your home.
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

export { FAQ_JSONLD };
