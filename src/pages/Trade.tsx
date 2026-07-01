import { useState } from "react";
import { Link } from "react-router-dom";
import { CosmicFilmHeader } from "../components/CosmicFilmHeader";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { EnquireModal } from "../components/EnquireModal";
import { PageMasthead } from "../components/PageMasthead";
import {
  EYEBROW,
  EYEBROW_MUTED,
  EYEBROW_TIGHT,
  SUBTITLE,
  BTN_PRIMARY,
} from "../components/ui/tokens";
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
 * Register (redesigned 2026-06-15 to the home/About "bold + dense" law): a
 * BOLD left-aligned masthead (meta rule → giant Fraunces statement → supporting
 * copy packed immediately beneath) over the shared ambient backdrop, then a
 * dense numbered offerings grid, the Farmacy precedent as an asymmetric
 * pull-quote spread, and a compact enquiry close. Compressed vertical rhythm —
 * no min-h spacers, no big clamp gaps. NEVER tacky or "trade discount" loud —
 * this is an estate inviting professionals to collaborate. NO prices are
 * quoted: volume and project pricing is "on request". The single CTA opens the
 * shared EnquireModal; a quiet link to /contact is offered as the alternative.
 */

interface Offering {
  index: string;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
}

const OFFERINGS: Offering[] = [
  {
    index: "01",
    eyebrow: "Editions for projects",
    title: "Estate prints, at project scale.",
    body: (
      <>
        Every work in the catalogue is available as an estate-stamped giclée
        print, numbered within its edition, on 350gsm Hahnemühle archival paper,
        printed to order at Point 101, London. For multi-room schemes, repeat
        placements or a full suite across a property, volume and project
        pricing is offered <strong>on request</strong> — tell us the spaces
        and the scale and we will prepare a considered quotation.
      </>
    ),
  },
  {
    index: "02",
    eyebrow: "Framing & finishing",
    title: "Framed, glazed and delivery-ready.",
    body: (
      <>
        Prints can be supplied framed in a choice of solid-wood or tray
        finishes (natural oak, stained black, white or walnut), with
        shatter-safe acrylic or museum-grade anti-reflective glazing —
        specified for safe transit and ready to hang on install. Sizing,
        glazing and finish can be tailored to a project's specification; we
        will quote framing and crated delivery alongside the edition.
      </>
    ),
  },
  {
    index: "03",
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
  const openEnquire = () => setEnquireOpen(true);
  const closeEnquire = () => setEnquireOpen(false);

  return (
    <div className="relative min-h-screen flex flex-col">
      <SceneBackdrop src="/img/scenes/trade-pyramids-blurmod-v1.webp" />
      <Seo
        title="Trade & Interior Design"
        description="For interior designers, art consultants and hospitality buyers. Estate-stamped prints of Stephen Meakin's mandala paintings, framing, and bespoke commissions hand-painted in his tradition by Polly Wedge — the hand behind the 3.6-metre Arista SunStar at Farmacy, Notting Hill. Project pricing on request."
        url="/trade"
      />
      <CosmicFilmHeader />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] 4xl:max-w-[1880px] px-4 sm:px-6 md:px-8 lg:px-12 pt-16 md:pt-20 pb-16 md:pb-24">
        {/* ── MASTHEAD ── The refined shared front cover: meta rule (eyebrow +
            "By introduction") → a composed Fraunces display title (wght 560,
            opsz 144 — never the old bold logo) → the framing passage packed
            immediately beneath under a border-t, no floating gap. */}
        <Reveal as="div" className="pb-4 md:pb-5">
          <PageMasthead
            eyebrow="Trade & Interior Design"
            meta="By introduction"
            title={
              <>
                For designers and <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>considered</em> spaces.
              </>
            }
          >
            <div className="mt-4 md:mt-5 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-3 items-start border-t border-line pt-4 md:pt-5">
              <Reveal as="div" className="lg:col-span-3">
                <p className={cn(EYEBROW_MUTED, "m-0 leading-[1.8]")}>
                  The estate of Stephen Meakin · SEM
                </p>
              </Reveal>
              <Reveal as="div" delay={0.06} className="lg:col-span-9">
                <p
                  className="font-display font-normal tracking-[-0.01em] text-ink m-0"
                  style={{
                    fontVariationSettings: '"opsz" 32, "wght" 400',
                    fontSize: "clamp(21px, 2.5vw, 34px)",
                    lineHeight: 1.26,
                  }}
                >
                  The estate works directly with interior designers, art
                  consultants and hospitality buyers — hotels, restaurants and
                  wellness spaces. Whether you are placing a suite of
                  estate-stamped prints across a property or commissioning a
                  single defining piece, the conversation starts here and is
                  handled, quietly and personally, by the family.
                </p>
              </Reveal>
            </div>
          </PageMasthead>
        </Reveal>

        {/* ── WHAT'S OFFERED ── A dense numbered grid, not a tall single
            column: three offerings as editorial blocks side by side from md,
            each opening with a big ghost numeral + hairline so they read as
            composed plates rather than an endless scroll. Verbatim body copy
            unchanged. */}
        <section className="py-10 md:py-14">
          <Reveal as="div" className="border-t border-line pt-4 md:pt-5 mb-5 md:mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <p className={cn(EYEBROW, "m-0")}>How the estate works with projects</p>
            <p className={cn(EYEBROW_MUTED, "m-0")}>Three ways in</p>
          </Reveal>

          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-3 gap-x-8 lg:gap-x-12 gap-y-8 md:gap-y-0 items-start">
            {OFFERINGS.map((item) => (
              <section
                key={item.index}
                className="md:border-l md:border-line md:pl-6 lg:pl-8 first:md:border-l-0 first:md:pl-0"
              >
                <div className="flex items-baseline gap-4">
                  <span
                    aria-hidden="true"
                    className="font-display font-semibold leading-none tracking-[-0.04em] text-ink/[0.18] select-none"
                    style={{
                      fontVariationSettings: '"opsz" 48, "wght" 600',
                      fontSize: "clamp(40px,4.6vw,68px)",
                    }}
                  >
                    {item.index}
                  </span>
                  <span className={cn(EYEBROW_TIGHT, "translate-y-[-0.2em]")}>
                    {item.eyebrow}
                  </span>
                </div>
                <h2 className="font-display font-semibold tracking-[-0.035em] text-balance text-ink m-0 mt-3.5 text-[clamp(23px,2.6vw,40px)] leading-[1.1]">
                  {item.title}
                </h2>
                <div
                  className={cn(
                    SUBTITLE,
                    "max-w-none mt-3.5 md:mt-4 !text-[clamp(17px,0.55vw_+_13.5px,23px)] !leading-[1.6]",
                  )}
                >
                  {item.body}
                </div>
              </section>
            ))}
          </Reveal>
        </section>

        {/* ── ENQUIRY CLOSE ── A bold left-aligned conversion beat packed under
            a rule: the statement and supporting copy on the left, the actions
            and the direct-email fallback on the right. Commerce-free — opens
            the shared EnquireModal; quiet /contact + mailto paths preserved
            byte-for-byte. */}
        <section className="py-10 md:py-14">
          <Reveal as="div" className="border-t border-line pt-4 md:pt-5 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 items-end">
            <div className="lg:col-span-7">
              <p className={cn(EYEBROW, "m-0 mb-3.5")}>Start a project</p>
              <h2
                className="font-display tracking-[-0.018em] text-balance text-ink m-0 leading-[1.0]"
                style={{
                  fontVariationSettings: '"opsz" 48, "wght" 700',
                  fontWeight: 700,
                  fontSize: "clamp(34px,5.4vw,92px)",
                  letterSpacing: "-0.03em",
                  lineHeight: 0.92,
                }}
              >
                Make a trade enquiry.
              </h2>
              <p className={cn(SUBTITLE, "max-w-none mt-3.5 md:mt-4 !text-[clamp(18px,0.6vw_+_14.4px,25px)] !leading-[1.55]")}>
                Tell us about the project — the spaces, the scale, and whether
                you are after editions, framing or a bespoke commission. We
                will reply personally, usually within a day or two, with
                availability and project pricing.
              </p>
            </div>
            <div className="lg:col-span-5 lg:border-l lg:border-line lg:pl-10">
              <div className="flex flex-col sm:flex-row lg:flex-col sm:items-start gap-4">
                <button
                  type="button"
                  onClick={openEnquire}
                  className={cn(
                    BTN_PRIMARY,
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                  )}
                >
                  Make a trade enquiry
                  <span aria-hidden="true" className="ml-2">→</span>
                </button>
                <Link
                  to="/contact"
                  className="inline-flex items-center min-h-[44px] font-sans text-[clamp(14px,0.8vw,17px)] text-ink-muted hover:text-accent transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  Or use the contact page
                  <span aria-hidden="true" className="ml-1.5">→</span>
                </Link>
              </div>
              <p className="font-sans font-normal text-[clamp(13px,0.75vw,16px)] leading-[1.6] text-ink-muted mt-4 m-0 break-words">
                Or write directly to{" "}
                <a
                  href="mailto:info@themandalacompany.com?subject=Trade%20%26%20Interior%20Design%20enquiry"
                  className="text-accent hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  info@themandalacompany.com
                </a>
                .
              </p>
            </div>
          </Reveal>
        </section>
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
