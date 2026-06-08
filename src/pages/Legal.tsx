import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { Separator } from "../components/ui/separator";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { usePageTitle } from "../lib/usePageTitle";
import { EYEBROW, EYEBROW_MUTED, TITLE } from "../components/ui/tokens";
import { cn } from "../lib/cn";

/**
 * Legal pages — Privacy / Terms / Returns.
 *
 * Three routes share a single `LegalPage` scaffold so the visual register
 * stays consistent. Content is structured (headed sections + paragraphs +
 * lists) rather than the original flat-paragraph placeholder. The estate
 * voice is kept — "the estate retains" not "the company shall".
 *
 * Updated: 2026-05-31. Anything written here should be reviewed by a UK
 * solicitor before the site is heavily promoted; the wording covers UK GDPR
 * Art 13–14, CCR 2013 reg 28 (made-to-order exemption) with the open-edition
 * A3 granted the standard 14-day right, a complaints/ADR statement, and
 * standard consumer-sale boilerplate. NB: trader postal address still pending.
 */

const UPDATED = "31 May 2026";

/**
 * Trader's full geographic postal address — LEGALLY REQUIRED before promotion.
 *
 * TODO (Hugo): set this to the full postal/correspondence address as ONE line,
 * e.g. "1 Example Street, Lewes, East Sussex, BN7 0AA, United Kingdom". A paid
 * mail-forwarding / service address is acceptable if a home address is
 * undesirable. Once set, the Terms "Who you're buying from" section renders it
 * automatically. While it is `null`, the copy falls back to the town only —
 * never a visible "[address]" placeholder. The CCR 2013 (Sch 2) / DMCC 2024
 * require this geographic address to be available before a distance contract is
 * concluded; a town alone is not sufficient, so dropping in this one line is a
 * launch prerequisite.
 */
const TRADER_POSTAL_ADDRESS: string | null =
  "213 Elm Drive, Hove, East Sussex, BN3 7JD, United Kingdom";

interface Section {
  heading: string;
  blocks: Block[];
}

type Block =
  | { kind: "p"; text: React.ReactNode }
  | { kind: "ul"; items: React.ReactNode[] };

const PRIVACY: Section[] = [
  {
    heading: "Who we are",
    blocks: [
      {
        kind: "p",
        text: (
          <>
            This site is operated by <strong>Hugo Archie Charles Wedge</strong>,
            trading as <strong>The Mandala Company</strong> (a trading name, not
            a registered company or charity), on behalf of the estate of
            Stephen Meakin. The Mandala Company is the data controller for any
            personal information you give us through this site. You can reach
            us at{" "}
            <a href="mailto:info@themandalacompany.com" className="text-accent hover:underline">
              info@themandalacompany.com
            </a>
            .
          </>
        ),
      },
    ],
  },
  {
    heading: "What we collect",
    blocks: [
      {
        kind: "ul",
        items: [
          <><strong>Order details</strong> — your name, email and postal address, captured by Stripe at checkout and passed to us so we can send your print.</>,
          <><strong>Newsletter sign-up</strong> — your name (optional) and email, if you join the Friends &amp; Family list.</>,
          <><strong>Enquiries</strong> — your name, email and message, when you write to us through the contact form.</>,
          <><strong>Saved basket</strong> — the painting / colourway / tier you've added is stored in your own browser only (<code>localStorage</code> key <code>tasm.basket.v2</code>). It never leaves your device unless you choose to email it to yourself, in which case your email address is also stored (briefly) to send the basket.</>,
          <><strong>Server logs</strong> — basic request information (IP address, browser type, timestamps) is held in our hosting provider's logs for security and abuse-prevention purposes.</>,
          <><strong>Aggregate analytics</strong> — we use Vercel Web Analytics to understand which pages are visited and roughly where visitors come from. It is privacy-friendly and cookieless: no cookies are set, no cross-site tracking takes place, and no individual is identified or profiled. Only anonymous, aggregate page-view counts are recorded.</>,
        ],
      },
      {
        kind: "p",
        text: "We do not run third-party advertising trackers, fingerprinting libraries, or any analytics that profile individuals. Our only analytics is Vercel's cookieless, aggregate Web Analytics described above.",
      },
    ],
  },
  {
    heading: "Lawful basis",
    blocks: [
      {
        kind: "ul",
        items: [
          <><strong>Performance of a contract</strong> — for handling orders, fulfilment and after-sale support.</>,
          <><strong>Legitimate interest</strong> — for the in-browser basket store and minimal server logs.</>,
          <><strong>Consent</strong> — for the newsletter; you can withdraw at any time via the unsubscribe link in any email or by writing to us.</>,
        ],
      },
    ],
  },
  {
    heading: "Who else sees your data",
    blocks: [
      {
        kind: "p",
        text: "We use a small number of trusted processors to run the site. Each only sees what they need to do their job:",
      },
      {
        kind: "ul",
        items: [
          <><strong>Stripe</strong> — payment processing (US / EU).{" "}
            <a href="https://stripe.com/gb/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Stripe Privacy Policy</a>
          </>,
          <><strong>Resend</strong> — transactional and newsletter email delivery (US / EU).{" "}
            <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Resend Privacy Policy</a>
          </>,
          <><strong>Vercel</strong> — site hosting, serverless functions and cookieless, aggregate Web Analytics (US / EU).{" "}
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Vercel Privacy Policy</a>
          </>,
          <><strong>Point 101</strong> — print fulfilment (UK). Your name and shipping address are shared so they can post the print.</>,
          <><strong>IONOS</strong> — email hosting for the <code>themandalacompany.com</code> inbox (Germany / EU).</>,
        ],
      },
      {
        kind: "p",
        text: "We do not sell, rent, or trade your personal data with anyone.",
      },
    ],
  },
  {
    heading: "International transfers",
    blocks: [
      {
        kind: "p",
        text: "Some of our processors (Stripe, Resend, Vercel) operate servers outside the UK. Where personal data leaves the UK, transfers are made under UK-approved mechanisms — Standard Contractual Clauses or the UK International Data Transfer Addendum (IDTA) — so your data continues to receive an equivalent standard of protection.",
      },
    ],
  },
  {
    heading: "How long we keep your data",
    blocks: [
      {
        kind: "ul",
        items: [
          <><strong>Order records</strong> — kept for seven years to comply with HMRC's record-keeping requirements for self-employed sales.</>,
          <><strong>Newsletter sign-ups</strong> — kept until you unsubscribe, at which point your record is deleted from our active list.</>,
          <><strong>Saved basket</strong> — stored in your own browser's <code>localStorage</code> and cleared when you clear your browser data.</>,
          <><strong>Enquiry emails</strong> — kept for as long as needed to answer your question, then archived in the estate inbox.</>,
        ],
      },
    ],
  },
  {
    heading: "Your rights",
    blocks: [
      {
        kind: "p",
        text: "Under UK GDPR you have the right to ask us to:",
      },
      {
        kind: "ul",
        items: [
          <>see a copy of the personal data we hold about you,</>,
          <>correct anything that is inaccurate,</>,
          <>erase your data where we no longer have a lawful reason to hold it,</>,
          <>restrict or object to how we use it,</>,
          <>port your data to another service in a structured format.</>,
        ],
      },
      {
        kind: "p",
        text: (
          <>
            To exercise any of these rights, write to{" "}
            <a href="mailto:info@themandalacompany.com" className="text-accent hover:underline">
              info@themandalacompany.com
            </a>
            . We respond within one calendar month.
          </>
        ),
      },
      {
        kind: "p",
        text: (
          <>
            If you're unhappy with how we've handled your data you have the
            right to complain to the Information Commissioner's Office (the
            UK's data-protection regulator) at{" "}
            <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              ico.org.uk/make-a-complaint
            </a>
            .
          </>
        ),
      },
    ],
  },
  {
    heading: "Cookies",
    blocks: [
      {
        kind: "p",
        text: "This site sets no third-party tracking cookies and no advertising cookies. Our analytics (Vercel Web Analytics) is cookieless, so it sets no cookies at all. The site uses your browser's localStorage for one thing only — remembering the items in your basket between visits. You can clear it any time from your browser's site-settings.",
      },
    ],
  },
  {
    heading: "Changes to this policy",
    blocks: [
      {
        kind: "p",
        text: `We may update this policy from time to time. The date below is the date this version was published. Material changes will be flagged in a newsletter note. Updated ${UPDATED}.`,
      },
    ],
  },
];

const TERMS: Section[] = [
  {
    heading: "Who you're buying from",
    blocks: [
      {
        kind: "p",
        // TODO (TRADER IDENTITY — LEGALLY REQUIRED): a full geographic postal
        // trading address must be inserted before the site is promoted. The
        // CCR 2013 (Sch 2) / DMCC 2024 require a trader's geographic address to
        // be given before a distance contract is concluded — a town alone is
        // not sufficient. Hugo has not yet supplied the address. To complete
        // this, set TRADER_POSTAL_ADDRESS below to the full postal address
        // (e.g. "1 Example Street, Lewes, East Sussex, BN7 0AA, United
        // Kingdom") — a paid mail-forwarding / service address is fine. The
        // copy below renders the address automatically once that one line is
        // set, and falls back to the town only while it is null. Do NOT ship a
        // visible "[address]" placeholder to customers.
        text: (
          <>
            These terms govern any order you place on this site. The contract
            is between you (the <em>buyer</em>) and{" "}
            <strong>Hugo Archie Charles Wedge</strong>, trading as{" "}
            <strong>The Mandala Company</strong> (the <em>estate</em>), a sole
            trader based in Hove, East Sussex, United Kingdom.
            {TRADER_POSTAL_ADDRESS ? (
              <>
                {" "}Our postal and correspondence address is{" "}
                <strong>{TRADER_POSTAL_ADDRESS}</strong>.
              </>
            ) : null}
            {" "}We can be reached at{" "}
            <a href="mailto:info@themandalacompany.com" className="text-accent hover:underline">
              info@themandalacompany.com
            </a>
            .
          </>
        ),
      },
    ],
  },
  {
    heading: "Order acceptance",
    blocks: [
      {
        kind: "p",
        text: "Your order is accepted when payment is captured by Stripe and a confirmation email is sent to you. Until that moment, no contract exists. We reserve the right to refuse an order — for example, if a tier is sold out or if we suspect fraud — and we'll refund any payment in full if we do.",
      },
    ],
  },
  {
    heading: "Pricing and payment",
    blocks: [
      {
        kind: "p",
        text: "All prices are shown in pounds sterling (GBP) and are inclusive of UK VAT where applicable. The estate currently trades below the UK VAT threshold and so does not separately itemise VAT on invoices. Payment is taken at checkout by Stripe; we never see or store your card details.",
      },
    ],
  },
  {
    heading: "Delivery",
    blocks: [
      {
        kind: "p",
        text: "Each print is made to order. Lead times are measured from the day after you order and exclude weekends and bank holidays:",
      },
      {
        kind: "ul",
        items: [
          <><strong>Unframed, estate-stamped</strong> — 7 to 10 working days to dispatch.</>,
          <><strong>Framed</strong> — approximately two weeks to dispatch (black-stained oak with cast acrylic glazing).</>,
          <><strong>Hand-finished by Polly</strong> — two weeks maximum to dispatch.</>,
        ],
      },
      {
        kind: "p",
        text: "Delivery is free to every destination we serve — framed or unframed — with no shipping charge added at checkout. We post via Royal Mail, DHL or FedEx depending on the destination and the size of the print. You'll receive a shipping notification with tracking once it leaves the studio.",
      },
    ],
  },
  {
    heading: "International orders, duties and VAT",
    blocks: [
      {
        kind: "p",
        text: "We ship to Europe, North America, Australia and New Zealand. International buyers may be charged local import duties, customs handling fees, or local VAT on delivery by their courier — these are set by your country's customs authority and are your responsibility, not ours. Refusing a parcel to avoid duties does not entitle you to a full refund.",
      },
    ],
  },
  {
    heading: "Your right to cancel",
    blocks: [
      {
        kind: "p",
        text: (
          <>
            Your cancellation rights depend on which print you order. We set
            them out plainly below so you know exactly where you stand.
          </>
        ),
      },
      {
        kind: "p",
        text: (
          <>
            <strong>Open-edition A3 "Atelier" prints.</strong> The A3 Atelier
            print is a standard, unnumbered open-edition print. For this tier
            you have the full statutory <strong>14-day cancellation right</strong>{" "}
            under the{" "}
            <strong>Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013</strong>.
            You may cancel for any reason, without giving a reason, from the
            moment you order until 14 days after the day you receive the print.
            To cancel, email{" "}
            <a href="mailto:info@themandalacompany.com" className="text-accent hover:underline">
              info@themandalacompany.com
            </a>
            {" "}— a clear statement that you wish to cancel is enough. Return
            the print to us (you pay the return postage) and, once we have it
            back or you show proof of return, we will refund the full price you
            paid — delivery is free, so there is no separate delivery charge to
            add back — with{" "}
            <strong>no deduction for payment-processing fees</strong>. We make
            the refund within 14 days using the same payment method you used to
            pay.
          </>
        ),
      },
      {
        kind: "p",
        text: (
          <>
            <strong>Limited-edition and made-to-order prints (A2, A1, A0,
            the hand-painted Studio piece, and any framed or hand-finished
            order).</strong>{" "}
            These are made to your specification — your chosen colourway, tier
            and add-ons are sent to the atelier for an individual,
            estate-stamped and hand-numbered print run, and the Studio piece is
            hand-painted uniquely for you. Under the same Regulations,{" "}
            <em>regulation 28(1)(b)</em>, goods "made to the consumer's
            specifications or clearly personalised" are exempt from the 14-day
            distance-selling cancellation right, so the statutory cooling-off
            period does not apply to these orders.
          </>
        ),
      },
      {
        kind: "p",
        text: (
          <>
            <strong>Goodwill window on made-to-order prints.</strong> Even
            though the made-to-order tiers above are exempt, as a goodwill
            measure the estate will accept a full cancellation request within{" "}
            <strong>24 hours</strong> of order, provided the print run has not
            yet been sent to the atelier. Email{" "}
            <a href="mailto:info@themandalacompany.com" className="text-accent hover:underline">
              info@themandalacompany.com
            </a>
            {" "}within that window and we'll refund the order in full. After
            those 24 hours a made-to-order print is in production and the
            goodwill window closes.
          </>
        ),
      },
      {
        kind: "p",
        text: "Your rights in respect of faulty or damaged goods are unaffected by any of the above — see the next section.",
      },
    ],
  },
  {
    heading: "Damaged or lost in transit",
    blocks: [
      {
        kind: "p",
        text: (
          <>
            If your print arrives damaged, email{" "}
            <a href="mailto:info@themandalacompany.com" className="text-accent hover:underline">
              info@themandalacompany.com
            </a>
            {" "}within <strong>14 days of receipt</strong> with photographs of
            the damage and the packaging. We will arrange a replacement print
            at no cost to you, or a full refund — your choice.
          </>
        ),
      },
      {
        kind: "p",
        text: "If your print does not arrive within a reasonable window of the estimated delivery date, write to us within 14 days of the expected delivery and we will open a claim with the carrier. The estate will replace or refund the order within 30 days of the claim being raised.",
      },
    ],
  },
  {
    heading: "Risk and title",
    blocks: [
      {
        kind: "p",
        text: "Risk in the goods passes to you on delivery. Title (legal ownership) passes to you on the estate's receipt of cleared payment. You acquire the physical print only — all intellectual property in the artwork remains with the estate of Stephen Meakin.",
      },
    ],
  },
  {
    heading: "Image rights",
    blocks: [
      {
        kind: "p",
        text: "All artwork, photographs and writings on this site are © the estate of Stephen Meakin. Purchase of a print grants you ownership of the physical object only; it does not grant any right to reproduce, copy, exhibit commercially, or create derivative works from the image. For licensing enquiries, please write to us.",
      },
    ],
  },
  {
    heading: "Liability",
    blocks: [
      {
        kind: "p",
        text: "The estate's total liability arising out of or in connection with any order is limited to the price you paid for that order. Nothing in these terms limits liability that cannot be limited by law — including liability for death or personal injury caused by negligence, or for fraud.",
      },
    ],
  },
  {
    heading: "Governing law",
    blocks: [
      {
        kind: "p",
        text: "These terms are governed by the laws of England and Wales, and any dispute will be subject to the exclusive jurisdiction of the courts of England and Wales.",
      },
    ],
  },
  {
    heading: "Complaints",
    blocks: [
      {
        kind: "p",
        text: (
          <>
            If something has gone wrong, we want to put it right. Please email
            us at{" "}
            <a href="mailto:info@themandalacompany.com" className="text-accent hover:underline">
              info@themandalacompany.com
            </a>
            {" "}with the details of your order and what's happened. We aim to
            acknowledge every complaint within <strong>5 working days</strong>{" "}
            and to resolve it within <strong>30 days</strong>, keeping you
            updated throughout if it takes longer.
          </>
        ),
      },
      {
        kind: "p",
        text: "We are not currently registered with an alternative dispute resolution (ADR) scheme. If we are unable to resolve a dispute between us, you may pursue it through the courts of England and Wales.",
      },
    ],
  },
  {
    heading: "Updates to these terms",
    blocks: [
      {
        kind: "p",
        text: `Updated ${UPDATED}. Material changes will be flagged on the site before they take effect.`,
      },
    ],
  },
];

const RETURNS: Section[] = [
  {
    heading: "In plain English",
    blocks: [
      {
        kind: "p",
        text: "Your cancellation rights depend on which print you bought, so we've split it out clearly below. The short version: the open-edition A3 print carries the full 14-day right to change your mind; the larger limited-edition, hand-painted and framed or hand-finished prints are made specifically for you and are exempt from that right — though we still offer a goodwill window before production starts.",
      },
    ],
  },
  {
    heading: "Cancelling an open-edition A3 print",
    blocks: [
      {
        kind: "p",
        text: (
          <>
            The A3 Atelier print is a standard open-edition print, so you have
            the full statutory <strong>14-day cancellation right</strong> under
            the Consumer Contracts Regulations 2013. You can cancel for any
            reason from when you order until 14 days after the day it arrives —
            just email{" "}
            <a href="mailto:info@themandalacompany.com" className="text-accent hover:underline">
              info@themandalacompany.com
            </a>
            .
          </>
        ),
      },
      {
        kind: "p",
        text: "Send the print back to us (you cover the return postage) and, once we've received it or you've shown proof of return, we'll refund the full price you paid — with no deduction for payment-processing fees — within 14 days, to the card you paid with. Delivery is free, so there is no separate delivery charge to refund.",
      },
    ],
  },
  {
    heading: "Cancelling a limited-edition, hand-painted or framed print",
    blocks: [
      {
        kind: "p",
        text: "The A2, A1 and A0 limited editions, the hand-painted Studio piece, and any framed or hand-finished order are made specifically for you — an individual, estate-stamped and hand-numbered print run, or a unique hand-painted work. Under the Consumer Contracts Regulations 2013 (reg 28(1)(b)) these personalised items are exempt from the 14-day cancellation right.",
      },
      {
        kind: "p",
        text: (
          <>
            <strong>Goodwill window — within 24 hours of ordering</strong> —
            email{" "}
            <a href="mailto:info@themandalacompany.com" className="text-accent hover:underline">
              info@themandalacompany.com
            </a>
            {" "}and, provided the print run hasn't gone to the atelier yet,
            we'll cancel and refund in full. After those 24 hours the order is
            in production and can't be cancelled.
          </>
        ),
      },
    ],
  },
  {
    heading: "If your print arrives damaged",
    blocks: [
      {
        kind: "p",
        text: (
          <>
            Write to{" "}
            <a href="mailto:info@themandalacompany.com" className="text-accent hover:underline">
              info@themandalacompany.com
            </a>
            {" "}within 14 days of receiving the print, with a photograph of
            the damage and a photograph of the packaging. We'll send a
            replacement print at no cost, or refund you in full — your choice.
          </>
        ),
      },
    ],
  },
  {
    heading: "If your print doesn't arrive",
    blocks: [
      {
        kind: "p",
        text: "If the estimated delivery date has been and gone, write to us within 14 days. We'll open a tracing claim with the carrier and either re-ship or refund within 30 days.",
      },
    ],
  },
  {
    heading: "If you change your mind",
    blocks: [
      {
        kind: "p",
        text: "For the open-edition A3 print you can change your mind within 14 days of receiving it, as set out above. For the limited-edition, hand-painted and framed or hand-finished prints — which are made specifically for you — we can't accept a return once production has started simply because you've changed your mind. Either way, we'd much rather you ask before ordering than be unhappy after — drop us a line at any time and we'll send you a higher-resolution preview or talk colour with you.",
      },
    ],
  },
  {
    heading: "International orders",
    blocks: [
      {
        kind: "p",
        text: "Local import duties or VAT applied by your country's customs are your responsibility. Refusing a parcel to avoid duties is treated as a change of mind — the order is not refundable in that case.",
      },
    ],
  },
  {
    heading: "Need help?",
    blocks: [
      {
        kind: "p",
        text: (
          <>
            Anything not covered here, or anything you want to talk through —
            we're a small estate and we read every message ourselves. Write to{" "}
            <a href="mailto:info@themandalacompany.com" className="text-accent hover:underline">
              info@themandalacompany.com
            </a>
            {" "}and we'll get back to you. The full legal version of this
            page lives in our <Link to="/terms" className="text-accent hover:underline">Terms</Link>.
          </>
        ),
      },
      {
        kind: "p",
        text: `Updated ${UPDATED}.`,
      },
    ],
  },
];

export const Privacy = () => (
  <LegalPage
    title="Privacy."
    lead="The personal data this site collects, the processors who handle it on the estate's behalf, and the rights you hold under UK GDPR."
    sections={PRIVACY}
    updated={UPDATED}
    // Home "Mary Pink" peacock colourway, blurred — matches the home backdrop.
    backdrop="/img/paintings/peacock-mary-pink-blur-v2.webp"
  />
);
export const Terms = () => (
  <LegalPage
    title="Terms of sale."
    lead="The terms governing every print order placed with the estate — order acceptance, pricing, delivery, cancellation, and your statutory rights."
    sections={TERMS}
    updated={UPDATED}
  />
);
export const Returns = () => (
  <LegalPage
    title="Returns, refunds &amp; damages."
    lead="Each print is made to order. What that means for cancellation, and how the estate handles a print that arrives damaged or fails to arrive."
    sections={RETURNS}
    updated={UPDATED}
    // Home "Blood Moon Red" peacock colourway, blurred — matches the home backdrop.
    backdrop="/img/paintings/peacock-blood-moon-red-blur.webp"
  />
);

const LegalPage = ({
  title,
  lead,
  sections,
  updated,
  backdrop,
}: {
  title: string;
  lead: string;
  sections: Section[];
  updated: string;
  /** Optional per-page blurred backdrop. Falls back to the default peacock. */
  backdrop?: string;
}) => {
  // Strip HTML entities + the canonical trailing full stop for the tab title.
  const plainTitle = title.replace(/&amp;/g, "&").replace(/\.$/, "");
  usePageTitle(plainTitle);
  return (
    <div className="relative min-h-screen flex flex-col">
      <AmbientBackdrop src={backdrop} opacity={0.36} />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[820px] 2xl:max-w-[960px] 3xl:max-w-[1040px] px-4 sm:px-6 md:px-8 lg:px-12 pt-[clamp(5rem,11vw,6.5rem)] pb-[clamp(4rem,8vw,6rem)]">
        <Reveal as="header" className="mb-[clamp(2rem,5vw,3rem)]">
          <p className={cn(EYEBROW, "m-0 mb-5")}>The Mandala Company</p>
          <h1
            className={cn(TITLE, "m-0 !text-[clamp(26px,3.6vw,40px)] !leading-[1.05]")}
            dangerouslySetInnerHTML={{ __html: title }}
          />
          <p className="font-sans font-normal text-[14.5px] md:text-[15px] leading-[1.6] text-ink-muted m-0 max-w-[620px] mt-[clamp(0.75rem,2vw,1.1rem)]">{lead}</p>
          <p className={cn(EYEBROW_MUTED, "mt-[clamp(0.875rem,2.5vw,1.25rem)] m-0")}>Last updated {updated}</p>
          <Separator className="bg-line mt-[clamp(0.875rem,2.5vw,1.25rem)]" />
        </Reveal>
        <Reveal as="article" className="flex flex-col gap-10">
          {sections.map((section, i) => (
            <section key={i} className="flex flex-col gap-4">
              <h2 className="font-display font-semibold tracking-[-0.04em] text-balance text-[clamp(24px,2.8vw,40px)] leading-[1.2] text-ink m-0">
                {section.heading}
              </h2>
              {section.blocks.map((block, j) => {
                if (block.kind === "p") {
                  return (
                    <p
                      key={j}
                      className="font-sans font-normal text-[16px] md:text-[17px] 2xl:text-[18px] 2xl:max-w-[72ch] leading-[1.8] text-ink-muted m-0 [&_strong]:font-semibold [&_em]:font-display [&_em]:italic"
                    >
                      {block.text}
                    </p>
                  );
                }
                return (
                  <ul
                    key={j}
                    className="font-sans font-normal text-[16px] md:text-[17px] 2xl:text-[18px] 2xl:max-w-[72ch] leading-[1.8] text-ink-muted list-disc pl-6 flex flex-col gap-2 m-0 [&_strong]:font-semibold [&_em]:font-display [&_em]:italic"
                  >
                    {block.items.map((item, k) => (
                      <li key={k}>{item}</li>
                    ))}
                  </ul>
                );
              })}
            </section>
          ))}
        </Reveal>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
