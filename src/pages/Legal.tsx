import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Separator } from "../components/ui/separator";
import { usePageTitle } from "../lib/usePageTitle";

/**
 * Legal pages — Privacy / Terms / Returns.
 *
 * Three routes share a single `LegalPage` scaffold so the visual register
 * stays consistent. Content is structured (headed sections + paragraphs +
 * lists) rather than the original flat-paragraph placeholder. The estate
 * voice is kept — "the estate retains" not "the company shall".
 *
 * Updated: 2026-05-28. Anything written here should be reviewed by a UK
 * solicitor before the site is heavily promoted; the wording covers UK GDPR
 * Art 13–14, CCR 2013 reg 28 (made-to-order exemption), and standard
 * consumer-sale boilerplate.
 */

const UPDATED = "28 May 2026";

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
          <><strong>Newsletter sign-up</strong> — your name (optional) and email, if you join the friends-of-the-estate list.</>,
          <><strong>Enquiries</strong> — your name, email and message, when you write to us through the contact form.</>,
          <><strong>Saved basket</strong> — the painting / colourway / tier you've added is stored in your own browser only (<code>localStorage</code> key <code>tasm.basket.v2</code>). It never leaves your device unless you choose to email it to yourself, in which case your email address is also stored (briefly) to send the basket.</>,
          <><strong>Server logs</strong> — basic request information (IP address, browser type, timestamps) is held in our hosting provider's logs for security and abuse-prevention purposes.</>,
        ],
      },
      {
        kind: "p",
        text: "We do not run third-party advertising trackers, fingerprinting libraries, or analytics that profile individuals.",
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
          <><strong>Resend</strong> — transactional and friends-list email delivery (US / EU).{" "}
            <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Resend Privacy Policy</a>
          </>,
          <><strong>Vercel</strong> — site hosting and serverless functions (US / EU).{" "}
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
        text: "This site sets no third-party tracking cookies and no advertising cookies. It uses your browser's localStorage for one thing only — remembering the items in your basket between visits. You can clear it any time from your browser's site-settings.",
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
        text: (
          <>
            These terms govern any order you place on this site. The contract
            is between you (the <em>buyer</em>) and{" "}
            <strong>Hugo Archie Charles Wedge</strong>, trading as{" "}
            <strong>The Mandala Company</strong> (the <em>estate</em>), based
            in Lewes, East Sussex, United Kingdom. We can be reached at{" "}
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
          <><strong>Hand-finished by Polly</strong> — approximately four weeks to dispatch.</>,
        ],
      },
      {
        kind: "p",
        text: "We post via Royal Mail, DHL or FedEx depending on the destination and the size of the print. You'll receive a shipping notification with tracking once it leaves the studio.",
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
    heading: "Cancellation and made-to-order exemption",
    blocks: [
      {
        kind: "p",
        text: (
          <>
            Every print sold on this site is made to your specification — your
            chosen tier, colourway and add-ons are sent to the atelier for an
            individual print run, estate-stamped and hand-numbered. Under the{" "}
            <strong>Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013</strong>,
            <em>regulation 28(1)(b)</em>, goods "made to the consumer's
            specifications or clearly personalised" are exempt from the
            standard 14-day distance-selling cancellation right. The estate
            relies on this exemption for all print orders.
          </>
        ),
      },
      {
        kind: "p",
        text: (
          <>
            <strong>Cooling-off window before production.</strong> As a
            goodwill measure the estate will accept a full cancellation request
            within <strong>24 hours</strong> of order, provided the print run
            has not yet been sent to the atelier. Email{" "}
            <a href="mailto:info@themandalacompany.com" className="text-accent hover:underline">
              info@themandalacompany.com
            </a>
            {" "}within that window and we'll refund the order in full, less
            any non-recoverable Stripe processing fees.
          </>
        ),
      },
      {
        kind: "p",
        text: "After 24 hours the order is in production and is non-cancellable. Your rights in respect of faulty or damaged goods are unaffected — see the next section.",
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
        text: "Each print is made-to-order — your tier, colourway and any add-ons are sent off to the atelier for an individual print run, estate-stamped and hand-numbered for you. That makes it a personalised item under UK consumer law (Consumer Contracts Regulations 2013, reg 28(1)(b)), and the standard 14-day distance-selling cancellation right doesn't apply. We've made our own goodwill window on top of that — laid out below.",
      },
    ],
  },
  {
    heading: "Cancelling an order",
    blocks: [
      {
        kind: "p",
        text: (
          <>
            <strong>Within 24 hours of ordering</strong> — email{" "}
            <a href="mailto:info@themandalacompany.com" className="text-accent hover:underline">
              info@themandalacompany.com
            </a>
            {" "}and we'll cancel and refund in full, less Stripe's
            non-recoverable processing fees.
          </>
        ),
      },
      {
        kind: "p",
        text: "After 24 hours your order is in production at the atelier and can't be cancelled.",
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
        text: "Because each print is made specifically for you, we can't accept returns simply because you've changed your mind once production has started. We'd much rather you ask before ordering than be unhappy after — drop us a line at any time and we'll send you a higher-resolution preview or talk colour with you.",
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

export const Privacy = () => <LegalPage title="Privacy" sections={PRIVACY} updated={UPDATED} />;
export const Terms = () => <LegalPage title="Terms" sections={TERMS} updated={UPDATED} />;
export const Returns = () => (
  <LegalPage
    title="Returns, refunds &amp; damages"
    sections={RETURNS}
    updated={UPDATED}
  />
);

const LegalPage = ({
  title,
  sections,
  updated,
}: {
  title: string;
  sections: Section[];
  updated: string;
}) => {
  // Strip HTML entities for the document title.
  const plainTitle = title.replace(/&amp;/g, "&");
  usePageTitle(plainTitle);
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Nav />
      <main className="flex-1 mx-auto w-full max-w-[720px] px-6 md:px-10 py-24 md:py-32">
        <Reveal as="header" className="mb-12">
          <p className="font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-accent m-0 mb-5">
            The Mandala Company
          </p>
          <h1
            className="font-display font-bold tracking-tightest text-[clamp(40px,6vw,64px)] leading-[1.05] text-ink m-0"
            dangerouslySetInnerHTML={{ __html: title }}
          />
          <p className="font-sans text-[12px] tracking-[0.04em] text-ink/45 mt-4 m-0">
            Last updated {updated}
          </p>
          <Separator className="bg-ink/15 mt-8" />
        </Reveal>
        <Reveal as="article" className="flex flex-col gap-12">
          {sections.map((section, i) => (
            <section key={i} className="flex flex-col gap-4">
              <h2 className="font-display font-bold tracking-[-0.02em] text-[clamp(22px,2.6vw,28px)] leading-[1.2] text-ink m-0">
                {section.heading}
              </h2>
              {section.blocks.map((block, j) => {
                if (block.kind === "p") {
                  return (
                    <p
                      key={j}
                      className="font-sans font-light text-[15.5px] leading-[1.8] text-ink/85 m-0"
                    >
                      {block.text}
                    </p>
                  );
                }
                return (
                  <ul
                    key={j}
                    className="font-sans font-light text-[15.5px] leading-[1.8] text-ink/85 list-disc pl-6 flex flex-col gap-2 m-0"
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
      <Footer />
    </div>
  );
};
