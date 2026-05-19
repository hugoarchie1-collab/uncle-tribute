import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Separator } from "../components/ui/separator";
import { usePageTitle } from "../lib/usePageTitle";

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

export const Privacy = () => <LegalPage title="Privacy" body={PRIVACY_BODY} />;
export const Terms = () => <LegalPage title="Terms" body={TERMS_BODY} />;

const LegalPage = ({ title, body }: { title: string; body: string[] }) => {
  usePageTitle(title);
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Nav />
      <main className="flex-1 mx-auto w-full max-w-[680px] px-6 md:px-10 py-24 md:py-32">
        <Reveal as="header" className="mb-12">
          <h1 className="font-display font-bold tracking-tightest text-[clamp(40px,6vw,64px)] leading-[1.05] text-ink m-0">
            {title}
          </h1>
          <Separator className="bg-ink/15 mt-8" />
        </Reveal>
        <Reveal as="article" className="flex flex-col gap-6 font-sans font-light text-[16px] leading-loose text-ink/85">
          {body.map((p, i) => <p key={i} className="m-0">{p}</p>)}
        </Reveal>
      </main>
      <Footer />
    </div>
  );
};
