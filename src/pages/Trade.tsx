import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { Separator } from "../components/ui/separator";
import { Seo } from "../components/Seo";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { EnquireModal } from "../components/EnquireModal";
import { EYEBROW, EYEBROW_MUTED, TITLE, SUBTITLE, BTN_PRIMARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";

/**
 * /trade — Trade & Interior Design.
 *
 * A dignified, by-introduction page for interior designers, art consultants
 * and hospitality buyers (hotels, restaurants, wellness spaces). The estate
 * works directly with projects: estate-stamped editions of Stephen Meakin's
 * mandala paintings, framing, and bespoke commissions hand-painted in his
 * tradition by his sister Polly Wedge — the same hand behind the 3.6-metre
 * Arista SunStar at Farmacy, Notting Hill.
 *
 * Register: the FAQ / About long-form shell — readable reading-width column on
 * the shared ambient backdrop, Fraunces + Hanken Grotesk, accent reserved for
 * eyebrows + interaction. NEVER tacky or "trade discount" loud — this is an
 * estate inviting professionals to collaborate. NO prices are quoted: volume
 * and project pricing is "on request". The single CTA opens the shared
 * EnquireModal; a quiet link to /contact is offered as the alternative path.
 */

interface Offering {
  eyebrow: string;
  title: string;
  body: React.ReactNode;
}

const OFFERINGS: Offering[] = [
  {
    eyebrow: "Editions for projects",
    title: "Estate prints, at project scale.",
    body: (
      <>
        Every work in the catalogue is available as an estate-stamped,
        hand-numbered giclée edition on 350gsm Hahnemühle archival paper,
        printed to order at Point 101, London. For multi-room schemes, repeat
        placements or a full suite across a property, volume and project
        pricing is offered <strong>on request</strong> — tell us the spaces
        and the scale and we will prepare a considered quotation.
      </>
    ),
  },
  {
    eyebrow: "Framing & finishing",
    title: "Framed, glazed and delivery-ready.",
    body: (
      <>
        Prints can be supplied framed in black-stained oak with cast acrylic
        glazing — specified for safe transit and ready to hang on install.
        Sizing, glazing and finish can be tailored to a project's
        specification; we will quote framing and crated delivery alongside the
        edition.
      </>
    ),
  },
  {
    eyebrow: "Bespoke commissions",
    title: "New work, in Stephen's tradition.",
    body: (
      <>
        For a defining piece, the estate undertakes bespoke commissions —
        scaled, coloured and composed for the room. Each is hand-painted by{" "}
        <strong>Polly Wedge</strong>, Stephen's sister, working in his own
        sacred-geometry tradition. Palette, dimensions and timeline are agreed
        with you from the outset, and lead times are confirmed before any
        commitment.
      </>
    ),
  },
];

export const Trade = () => {
  const [enquireOpen, setEnquireOpen] = useState(false);
  const openEnquire = useCallback(() => setEnquireOpen(true), []);
  const closeEnquire = useCallback(() => setEnquireOpen(false), []);

  return (
    <div className="relative min-h-screen flex flex-col">
      <AmbientBackdrop opacity={0.4} />
      <Seo
        title="Trade & Interior Design"
        description="For interior designers, art consultants and hospitality buyers. Estate-stamped editions of Stephen Meakin's mandala paintings, framing, and bespoke commissions hand-painted in his tradition by Polly Wedge — the hand behind the 3.6-metre Arista SunStar at Farmacy, Notting Hill. Project pricing on request."
        url="/trade"
      />
      <Nav overlay />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[820px] 2xl:max-w-[960px] 3xl:max-w-[1040px] px-4 sm:px-6 md:px-8 lg:px-12 pt-[clamp(5rem,11vw,6.5rem)] pb-[clamp(4rem,8vw,6rem)]">
        {/* Header */}
        <Reveal as="header" className="mb-[clamp(2rem,5vw,3rem)]">
          <p className={cn(EYEBROW, "m-0 mb-5")}>Trade &amp; Interior Design</p>
          <h1 className={cn(TITLE, "m-0 !text-[clamp(26px,3.6vw,40px)] !leading-[1.05]")}>
            For designers and considered spaces.
          </h1>
          <p className="font-sans font-normal text-[14.5px] md:text-[15px] leading-[1.6] text-ink-muted mt-[clamp(0.75rem,2vw,1.1rem)] m-0 max-w-[68ch]">
            The estate of Stephen Meakin works directly with interior
            designers, art consultants and hospitality buyers — hotels,
            restaurants and wellness spaces. Whether you are placing a suite of
            estate-stamped editions across a property or commissioning a single
            defining piece, the conversation starts here and is handled, quietly
            and personally, by the family.
          </p>
          <Separator className="bg-line mt-[clamp(0.875rem,2.5vw,1.25rem)]" />
        </Reveal>

        {/* What's offered */}
        <Reveal as="div" className="flex flex-col gap-14">
          {OFFERINGS.map((item, i) => (
            <section key={i} className="flex flex-col gap-4">
              <p className={cn(EYEBROW, "m-0")}>{item.eyebrow}</p>
              <h2
                className={cn(
                  "font-display font-semibold tracking-[-0.04em] text-balance text-ink",
                  "m-0 text-[clamp(24px,2.8vw,40px)] leading-[1.1]",
                )}
              >
                {item.title}
              </h2>
              <div className={cn(SUBTITLE, "max-w-none 2xl:max-w-[68ch] 2xl:text-[19px]")}>
                {item.body}
              </div>
            </section>
          ))}
        </Reveal>

        {/* Farmacy credential */}
        <Reveal as="section" className="mt-[clamp(2.5rem,6vw,4rem)]">
          <Separator className="bg-line mb-[clamp(2rem,5vw,3rem)]" />
          <p className={cn(EYEBROW_MUTED, "m-0 mb-4")}>The precedent</p>
          <blockquote className="m-0 border-0 p-0">
            <p className="font-display font-normal not-italic text-ink text-[clamp(22px,3.2vw,34px)] leading-[1.25] tracking-[-0.02em] m-0 max-w-[24ch]">
              A 3.6-metre commission — the{" "}
              <span className="italic">Arista SunStar</span> — hangs at Farmacy,
              Notting Hill.
            </p>
          </blockquote>
          <p className="font-sans font-normal text-[14.5px] md:text-[15px] leading-[1.7] text-ink-muted mt-[clamp(1rem,2.5vw,1.4rem)] m-0 max-w-[64ch]">
            Stephen's largest realised work was made for a public hospitality
            space — proof that this geometry holds at architectural scale.
            Bespoke commissions for projects continue in that tradition, hand-
            painted by Polly Wedge, sized and coloured for the room they will
            live in.
          </p>
        </Reveal>

        {/* Enquiry CTA */}
        <Reveal as="section" className="mt-[clamp(2.5rem,6vw,4rem)]">
          <Separator className="bg-line mb-[clamp(2rem,5vw,3rem)]" />
          <p className={cn(EYEBROW, "m-0 mb-5")}>Start a project</p>
          <h2
            className={cn(
              "font-display font-semibold tracking-[-0.04em] text-balance text-ink",
              "m-0 text-[clamp(24px,2.8vw,40px)] leading-[1.1]",
            )}
          >
            Make a trade enquiry.
          </h2>
          <p className="font-sans font-normal text-[14.5px] md:text-[15px] leading-[1.7] text-ink-muted mt-[clamp(0.75rem,2vw,1.1rem)] m-0 max-w-[64ch]">
            Tell us about the project — the spaces, the scale, and whether you
            are after editions, framing or a bespoke commission. We will reply
            personally, usually within a day or two, with availability and
            project pricing.
          </p>
          <div className="mt-[clamp(1.25rem,3vw,1.75rem)] flex flex-col sm:flex-row sm:items-center gap-4">
            <button type="button" onClick={openEnquire} className={BTN_PRIMARY}>
              Make a trade enquiry
              <span aria-hidden="true" className="ml-2">→</span>
            </button>
            <Link
              to="/contact"
              className="inline-flex items-center min-h-[44px] font-sans text-[14px] text-ink-muted hover:text-accent transition-colors"
            >
              Or use the contact page
              <span aria-hidden="true" className="ml-1.5">→</span>
            </Link>
          </div>
          <p className="font-sans font-normal text-[13px] leading-[1.6] text-ink-faint mt-[clamp(1rem,2.5vw,1.4rem)] m-0">
            Or write directly to{" "}
            <a
              href="mailto:info@themandalacompany.com?subject=Trade%20%26%20Interior%20Design%20enquiry"
              className="text-accent hover:underline"
            >
              info@themandalacompany.com
            </a>
            .
          </p>
        </Reveal>
      </main>

      <EnquireModal
        open={enquireOpen}
        onClose={closeEnquire}
        eyebrow="Trade & Interior Design"
        title="Make a trade enquiry"
        subject="Trade & Interior Design enquiry"
        intro="Tell us about the project — the spaces, the scale, and whether you're after estate editions, framing or a bespoke commission. We'll reply personally with availability and project pricing."
      />
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
