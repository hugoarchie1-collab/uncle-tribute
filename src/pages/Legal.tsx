import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { Seo } from "../components/Seo";
import { EYEBROW, EYEBROW_MUTED } from "../components/ui/tokens";
import { MASTHEAD_TITLE_STYLE } from "../components/ui/tokens";
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
 * Art 13–14, CCR 2013 reg 28 (made-to-order exemption) with the A3 Open
 * Edition granted the standard 14-day right, a complaints/ADR statement, and
 * standard consumer-sale boilerplate. NB: trader postal address still pending.
 *
 * DECIDED 2026-06-12 (Hugo): the A3 Open Edition KEEPS the full 14-day
 * change-of-mind right — it is an Open Edition issued in editions, made to
 * order (PRINT_TIERS). Rationale: (a) the
 * reg 28(1)(b) "consumer's specifications" exemption is unlikely to cover a
 * standard catalogue print where the buyer only picks size/colourway from
 * fixed options, so the statutory right probably applies to the A3 regardless
 * and claiming the exemption would risk an unenforceable term; (b) a returned
 * A3 costs the estate ~£12–20 (buyer pays return postage) against £245, so
 * the generous policy is a cheap conversion asset on the entry tier. The
 * exemption stance on A2/A1/A0 (strong for framed/hand-finished/hand-painted,
 * weaker for plain made-to-order prints) should still go to the solicitor
 * review flagged above. PaintingDetail's Product JSON-LD
 * hasMerchantReturnPolicy stays MerchantReturnNotPermitted — one policy per
 * Product can't express per-tier detail; /returns carries it.
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
          <><strong>How you found us</strong> — if you arrive through a campaign link (one carrying <code>utm_</code> parameters or an ad-click id), that referral note is kept in your own browser's <code>localStorage</code> and attached to your order at checkout, so the estate can see which introductions actually lead to a print finding a home. It is not sent anywhere otherwise.</>,
        ],
      },
      {
        kind: "p",
        text: "By default, we run no third-party advertising trackers and no analytics that profile individuals — the only analytics that runs without asking is Vercel's cookieless, aggregate Web Analytics described above. If you choose \"Allow analytics\" on our cookie banner, Google Analytics 4 and the Meta Pixel also run — see \"Cookies & analytics\" below.",
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
          <><strong>Legitimate interest</strong> — for the in-browser basket store, minimal server logs, and the server-side sharing of a hashed order identifier with Meta for advertising measurement (described under "Cookies &amp; analytics" below).</>,
          <><strong>Consent</strong> — for the newsletter, and for the optional analytics and advertising cookies (Google Analytics 4, Meta Pixel). You can withdraw newsletter consent via the unsubscribe link in any email, and cookie consent via the "Cookie preferences" link in the site footer.</>,
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
          <><strong>Google</strong> — analytics (Google Analytics 4), only if you allow analytics cookies on our banner.{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google Privacy Policy</a>
          </>,
          <><strong>Meta</strong> — advertising measurement: the Meta Pixel only if you allow analytics cookies, plus a hashed order identifier sent server-side when an order completes (see "Cookies &amp; analytics" below).{" "}
            <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Meta Privacy Policy</a>
          </>,
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
        text: "Some of our processors (Stripe, Resend, Vercel, and — if you allow analytics cookies — Google and Meta) operate servers outside the UK. Where personal data leaves the UK, transfers are made under UK-approved mechanisms — Standard Contractual Clauses or the UK International Data Transfer Addendum (IDTA) — so your data continues to receive an equivalent standard of protection.",
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
    heading: "Cookies & analytics",
    blocks: [
      {
        kind: "p",
        text: (
          <>
            <strong>Essential only, by default.</strong> Until you say
            otherwise, this site sets no tracking or advertising cookies of
            any kind. Our built-in analytics (Vercel Web Analytics) is
            cookieless and aggregate. Your browser&rsquo;s{" "}
            <code>localStorage</code> is used for three small things: the
            items in your basket, your cookie choice itself, and — if you
            arrived through a campaign link — a note of how you found us.
            You can clear all of these at any time from your browser&rsquo;s
            site settings.
          </>
        ),
      },
      {
        kind: "p",
        text: (
          <>
            <strong>Optional analytics &amp; advertising cookies.</strong> A
            small banner asks once whether we may use Google Analytics 4 and
            the Meta Pixel to understand how the estate&rsquo;s site is found
            and how its advertising performs. Neither loads, sets a cookie,
            nor sends anything until you choose <em>Allow analytics</em> — and
            if you choose <em>Essential only</em>, that choice is remembered
            and nothing ever loads. You can change your mind at any time via
            the <strong>Cookie preferences</strong> link in the site footer,
            which clears your decision and asks again.
          </>
        ),
      },
      {
        kind: "p",
        text: (
          <>
            <strong>Order measurement (Meta Conversions API).</strong> When an
            order completes, our server tells Meta that a purchase happened —
            the order value and your email address protected as a one-way
            SHA-256 hash, never the address itself in readable form — so the
            estate can measure whether its advertising pays for itself. This
            happens server-side, involves no cookie, and rests on our
            legitimate interests in measuring advertising spend. You can
            object at any time by writing to{" "}
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
        text: "All prices are shown in pounds sterling (GBP) and include any tax due. The estate is not currently VAT-registered (it trades below the UK VAT threshold), so no VAT is charged or itemised. Payment is taken at checkout by Stripe; we never see or store your card details.",
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
          <><strong>Framed</strong> — approximately two weeks to dispatch (choice of frame finish, with shatter-safe or anti-reflective glazing).</>,
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
            <strong>A3 "Open Edition" prints.</strong> The A3 Open
            Edition is estate-stamped and issued in the estate's
            editions (not numbered). For this tier
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
            <strong>Made-to-order prints (the A2 Collector, A1 Atelier and
            A0 Heirloom Editions, the hand-painted Studio piece, and any framed or
            hand-finished order).</strong>{" "}
            These are made to your specification — your chosen colourway, tier
            and add-ons are sent to the atelier for an individual,
            estate-stamped print run numbered within its edition, and the Studio
            piece is hand-painted uniquely for you. Under the same Regulations,{" "}
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
        text: "Your cancellation rights depend on which print you bought, so we've split it out clearly below. The short version: the A3 Open Edition print carries the full 14-day right to change your mind; the larger Collector, Atelier and Heirloom Editions, the hand-painted piece and any framed or hand-finished order are made specifically for you and are exempt from that right — though we still offer a goodwill window before production starts.",
      },
    ],
  },
  {
    heading: "Cancelling an A3 Open Edition print",
    blocks: [
      {
        kind: "p",
        text: (
          <>
            With the A3 Open Edition print you have the full statutory{" "}
            <strong>14-day cancellation right</strong> under
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
    heading: "Cancelling a made-to-order print (A2, A1, A0, framed or hand-finished)",
    blocks: [
      {
        kind: "p",
        text: "The A2 Collector, A1 Atelier and A0 Heirloom Editions, the hand-painted Studio piece, and any framed or hand-finished order are made specifically for you — an individual, estate-stamped print run numbered within its edition, or a unique hand-painted work. Under the Consumer Contracts Regulations 2013 (reg 28(1)(b)) these personalised items are exempt from the 14-day cancellation right.",
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
        text: "For the A3 Open Edition print you can change your mind within 14 days of receiving it, as set out above. For the made-to-order prints — the Collector, Atelier and Heirloom Editions, the hand-painted piece, and any framed or hand-finished order, all made specifically for you — we can't accept a return once production has started simply because you've changed your mind. Either way, we'd much rather you ask before ordering than be unhappy after — drop us a line at any time and we'll send you a higher-resolution preview or talk colour with you.",
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
    // Hugo's two certified privacy scenes (sunset silhouette → pine headland),
    // crossfading seamlessly on scroll.
    backdrop={[
      "/img/scenes/privacy-scene-a-v2.webp",
      "/img/scenes/privacy-scene-b-v2.webp",
    ]}
  />
);
export const Terms = () => (
  <LegalPage
    title="Terms of sale."
    lead="The terms governing every print order placed with the estate — order acceptance, pricing, delivery, cancellation, and your statutory rights."
    sections={TERMS}
    updated={UPDATED}
    // Hugo's two certified terms scenes (mirror lake → ember forest),
    // crossfading seamlessly on scroll.
    backdrop={[
      "/img/scenes/terms-scene-a-v2.webp",
      "/img/scenes/terms-scene-b-v2.webp",
    ]}
  />
);
export const Returns = () => (
  <LegalPage
    title="Returns, refunds &amp; damages."
    lead="Each print is made to order. What that means for cancellation, and how the estate handles a print that arrives damaged or fails to arrive."
    sections={RETURNS}
    updated={UPDATED}
    // Hugo's two certified returns scenes (rainbow wave → ice cave),
    // crossfading seamlessly on scroll.
    backdrop={[
      "/img/scenes/returns-scene-a-v2.webp",
      "/img/scenes/returns-scene-b-v2.webp",
    ]}
  />
);

// ─── LegalMasthead ───────────────────────────────────────────────────────────
// The refined front cover for a legal page — a meta rule, the title set in the
// shared MASTHEAD_TITLE_STYLE register (Fraunces opsz 144, wght 560 — composed,
// not the old crude logo-bold), then the lead packed immediately beneath under a
// border-t — dense, left-aligned, no centred-floating-header timidity and no
// clamp-driven dead air. The numbered section index sits in the left rail so
// the reader can see the whole document's shape at a glance before scrolling.
const LegalMasthead = ({
  title,
  lead,
  updated,
  sections,
}: {
  title: string;
  lead: string;
  updated: string;
  sections: Section[];
}) => (
  <section className="relative px-4 sm:px-6 md:px-8 lg:px-12 pt-6 md:pt-8 pb-4 md:pb-6">
    <Reveal as="div" className="flex items-center gap-4 md:gap-6 border-b border-line pb-4 md:pb-5">
      <span className={EYEBROW}>The Mandala Company</span>
      <span aria-hidden className="h-px flex-1 bg-ink/15" />
      <span className={cn(EYEBROW_MUTED, "shrink-0")}>Updated {updated}</span>
    </Reveal>

    <Reveal as="div" className="mt-4 md:mt-6">
      <h1
        className="font-display text-ink m-0 text-balance text-pretty [&_br]:hidden sm:[&_br]:block"
        style={MASTHEAD_TITLE_STYLE}
        dangerouslySetInnerHTML={{ __html: title }}
      />
    </Reveal>

    <div className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-6 items-start border-t border-line pt-6 md:pt-8">
      <Reveal as="div" className="lg:col-span-8">
        <p
          className="font-display font-normal tracking-[-0.01em] text-ink m-0 max-w-[34ch] 3xl:max-w-[40ch]"
          style={{
            fontVariationSettings: '"opsz" 32, "wght" 400',
            fontSize: "clamp(21px, 2.4vw, 40px)",
            lineHeight: 1.32,
          }}
        >
          {lead}
        </p>
      </Reveal>
      {/* Document index — the shape of the whole policy at a glance, so the
          masthead screen is dense with wayfinding rather than blank air. Anchor
          jumps to each section's id. */}
      <Reveal as="div" delay={0.06} className="lg:col-span-4">
        <nav aria-label="On this page">
          <p className={cn(EYEBROW_MUTED, "m-0 mb-3")}>On this page</p>
          <ol className="m-0 p-0 list-none columns-1 sm:columns-2 lg:columns-1 gap-x-8">
            {sections.map((section, i) => (
              <li key={i} className="break-inside-avoid mb-1.5">
                <a
                  href={`#legal-${i}`}
                  className="group flex items-baseline gap-2 font-sans text-[13.5px] md:text-[14px] 3xl:text-[clamp(14px,0.8vw,17px)] leading-[1.4] text-ink-muted transition-colors hover:text-accent"
                >
                  <span aria-hidden className="font-sans text-[11px] font-bold tracking-[0.18em] tabular-nums text-ink/55 group-hover:text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{section.heading}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </Reveal>
    </div>
  </section>
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
  /** Per-page blurred scene backdrop — one src, or several that crossfade on scroll. */
  backdrop: string | string[];
}) => {
  // Strip HTML entities + the canonical trailing full stop for the tab title.
  const plainTitle = title.replace(/&amp;/g, "&").replace(/\.$/, "");
  return (
    <div className="relative flex flex-col">
      {/* Per-route meta — without this the three policy pages fall through to
          App's homepage default description (same wrong meta on all three).
          Seo auto-canonicalises to the current pathname, so no url prop needed. */}
      <Seo title={plainTitle} description={lead} />
      <SceneBackdrop src={backdrop} />
      <Nav />

      {/* 1 · MASTHEAD — bold left-aligned front cover (lead + document index). */}
      <LegalMasthead title={title} lead={lead} updated={updated} sections={sections} />

      {/* 2 · THE POLICY — sections as an editorial ledger. Each section is a
          12-col row: the heading + a hairline rule hold the LEFT rail, the
          verbatim blocks pack the wide RIGHT column at a comfortable legal
          reading measure. Asymmetric, dense, no tall single ribbon of prose;
          legibility of the legal copy stays paramount (the right column never
          goes multi-column — clauses must read linearly). Compressed py so the
          whole page reads tight, never an endless scroll. */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1180px] 2xl:max-w-[1320px] 3xl:max-w-[1500px] 4xl:max-w-[1760px] px-4 sm:px-6 md:px-8 lg:px-12 pb-12 md:pb-16">
        <article className="flex flex-col">
          {sections.map((section, i) => (
            <Reveal
              as="section"
              key={i}
              id={`legal-${i}`}
              className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 border-t border-line py-5 md:py-6"
            >
              {/* Left rail — the section number + heading, sticky on lg so the
                  reader always knows which clause they're in. */}
              <div className="lg:col-span-4 lg:sticky lg:top-24 self-start">
                <p className={cn(EYEBROW_MUTED, "m-0 mb-2.5 tabular-nums")}>
                  {String(i + 1).padStart(2, "0")} / {String(sections.length).padStart(2, "0")}
                </p>
                <h2 className="font-display font-semibold tracking-[-0.035em] text-balance text-[clamp(26px,2.8vw,52px)] leading-[1.08] text-ink m-0">
                  {section.heading}
                </h2>
              </div>

              {/* Right column — the verbatim blocks, unchanged copy, at the
                  legal reading register. Even, comfortable vertical rhythm
                  between blocks (gap-5) so multi-paragraph clauses read with a
                  deliberate cadence — never cramped, never gappy. */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                {section.blocks.map((block, j) => {
                  if (block.kind === "p") {
                    return (
                      <p
                        key={j}
                        className="font-sans font-normal text-[16px] md:text-[17px] 2xl:text-[clamp(17px,1vw,21px)] max-w-[72ch] 3xl:max-w-[78ch] leading-[1.8] text-ink-muted m-0 [&_strong]:font-semibold [&_strong]:text-ink [&_em]:font-display [&_em]:italic"
                      >
                        {block.text}
                      </p>
                    );
                  }
                  return (
                    <ul
                      key={j}
                      className="font-sans font-normal text-[16px] md:text-[17px] 2xl:text-[clamp(17px,1vw,21px)] max-w-[72ch] 3xl:max-w-[78ch] leading-[1.8] text-ink-muted list-none pl-0 flex flex-col gap-3.5 m-0 [&_strong]:font-semibold [&_strong]:text-ink [&_em]:font-display [&_em]:italic"
                    >
                      {block.items.map((item, k) => (
                        <li key={k} className="relative pl-6 before:absolute before:left-0 before:top-[0.62em] before:h-1.5 before:w-1.5 before:rotate-45 before:bg-accent/45 before:content-['']">
                          {item}
                        </li>
                      ))}
                    </ul>
                  );
                })}
              </div>
            </Reveal>
          ))}
        </article>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
