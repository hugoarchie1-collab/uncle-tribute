import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";

/**
 * Plain-text legal pages. Each page is a heading + a few paragraphs.
 * Replace the placeholder content with your real policies when ready.
 */

const PRIVACY_BODY = [
  "This site is operated by the estate of Stephen Meakin in remembrance of his life and work. We collect only the information you choose to give us — for example, your name and email when you make a print enquiry.",
  "We do not use third-party advertising cookies. We do not sell or share your personal data with third parties for marketing.",
  "When you complete a purchase, your payment is processed by Stripe; Stripe handles your card details directly and we never see them. See Stripe's privacy policy for how they handle that information.",
  "If you would like to know what data we hold about you, or would like it deleted, please contact us via the email address in the site footer. Under UK GDPR you have the right to access, correct and delete your personal data.",
  "[ This is a placeholder policy. Replace with your final wording before going live. ]",
];

const TERMS_BODY = [
  "All artworks, photographs and writings shown on this site are © the estate of Stephen Meakin. They may not be copied, reproduced or used commercially without written permission from the estate.",
  "Prints are hand-finished and made to order. Once an order is placed and confirmed it cannot be cancelled. Refunds are available only in the case of damage in transit; please contact us within seven days of receipt.",
  "Prices are shown in pounds sterling (GBP) and include UK VAT where applicable. Shipping is calculated at checkout based on destination.",
  "This site is provided as-is. While we take care to ensure that information is accurate, we make no warranty as to completeness. Browsing this site does not create a contract between you and the estate.",
  "[ This is a placeholder. Replace with your final terms before going live. ]",
];

export const Privacy = () => (
  <LegalPage title="Privacy" body={PRIVACY_BODY} />
);

export const Terms = () => (
  <LegalPage title="Terms" body={TERMS_BODY} />
);

const LegalPage = ({ title, body }: { title: string; body: string[] }) => (
  <div className="legal-page">
    <Nav />
    <main className="legal-main">
      <header className="legal-hero">
        <h1 className="legal-title">{title}</h1>
      </header>
      <article className="legal-body">
        {body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </article>
    </main>
    <Footer />
  </div>
);
