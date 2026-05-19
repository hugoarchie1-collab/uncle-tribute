import { VideoIntro } from "../components/VideoIntro";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Separator } from "../components/ui/separator";
import { WELCOME } from "../data/content";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

const CAP = "(n/a)";

export const Welcome = () => {
  usePageTitle();

  return (
    <>
      <VideoIntro />

      <div id="welcome-anchor" className="relative bg-bg">
        <Nav />

        <main className="relative">
          {/* HERO — italic quote (it IS a quote, so italic is right here) */}
          <section className="mx-auto max-w-[1040px] px-4 md:px-8 lg:px-12 pt-10 md:pt-16 pb-10 md:pb-12 text-center">
            <Reveal>
              <blockquote className="m-0 border-0 p-0">
                <p className="font-display italic font-bold leading-[1.03] tracking-[-0.03em] text-ink m-0 mb-5 text-balance text-[clamp(40px,6.4vw,84px)]">
                  {WELCOME.openingQuote}
                </p>
                <cite className="not-italic font-sans text-[10px] font-bold tracking-[0.38em] uppercase text-ink/65">
                  — {WELCOME.openingAttribution}
                </cite>
              </blockquote>
            </Reveal>
          </section>

          {/* Reminder — sans-serif medium, not italic */}
          <section className="mx-auto max-w-[760px] px-6 md:px-10 pb-12 md:pb-16 text-center">
            <Reveal>
              <p className="font-sans font-medium text-[clamp(20px,2.2vw,26px)] leading-[1.5] text-ink text-balance m-0">
                {WELCOME.reminder}
              </p>
            </Reveal>
          </section>

          {/* IMAGE 1 — Wild Rose painting, FULL-WIDTH bleed */}
          <Reveal as="figure" className="m-0 w-full pb-12 md:pb-16">
            <img
              src={asset("/img/welcome/01-painting-wild-rose.jpg")}
              alt="Stephen at his drafting table"
              loading="lazy"
              className="w-full h-[60vh] md:h-[80vh] object-cover"
            />
          </Reveal>

          {/* Passing note */}
          <section className="mx-auto max-w-[640px] px-4 md:px-8 py-12 md:py-16 text-center">
            <Reveal>
              <Separator className="mb-7 bg-ink/15" />
              <p className="font-display italic font-bold text-[clamp(22px,2.6vw,30px)] leading-[1.2] text-ink m-0">
                {WELCOME.passingNote}
              </p>
              <Separator className="mt-7 bg-ink/15" />
            </Reveal>
          </section>

          {/* IMAGE 2 — Portrait, image LEFT + invocation/bio RIGHT */}
          <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
              <Reveal as="figure" className="m-0 md:col-span-5">
                <img
                  src={asset("/img/welcome/02-portrait-denim.jpg")}
                  alt="Stephen Meakin"
                  loading="lazy"
                  className="w-full aspect-[3/4] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
                />
              </Reveal>
              <Reveal as="div" className="md:col-span-7">
                <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                  {WELCOME.invocation}
                </p>
                <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/90 m-0">
                  {WELCOME.bio[0]}
                </p>
              </Reveal>
            </div>
          </section>

          {/* IMAGE 3 — Studio, FULL-WIDTH */}
          <Reveal as="figure" className="m-0 w-full py-10 md:py-14">
            <img
              src={asset("/img/welcome/03-painting-in-studio.jpg")}
              alt="Stephen painting in the studio"
              loading="lazy"
              className="w-full h-[55vh] md:h-[75vh] object-cover"
            />
          </Reveal>

          {/* Bio 2 — Sacred Geometry, BIG bold sans intro + paragraph */}
          <section className="mx-auto max-w-[1100px] px-6 md:px-10 py-10 md:py-14">
            <Reveal>
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                Sacred Geometry · four traditions
              </p>
              <h2 className="font-display font-bold italic tracking-[-0.025em] text-[clamp(28px,3.6vw,46px)] leading-[1.04] text-ink m-0 mb-7">
                The language of nature, amplified
              </h2>
              <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/90 max-w-[760px] m-0">
                {WELCOME.bio[1]}
              </p>
            </Reveal>
          </section>

          {/* IMAGE 4 — Wall of mandalas, RIGHT + text LEFT (mirror of img 2) */}
          <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
              <Reveal as="div" className="md:col-span-5 md:order-1 order-2">
                <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                  Arista SunStar · Notting Hill
                </p>
                <h2 className="font-display font-bold italic tracking-[-0.025em] text-[clamp(28px,3.6vw,42px)] leading-[1.04] text-ink m-0 mb-6">
                  A 3.6-metre commission
                </h2>
                <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/90 m-0">
                  {WELCOME.bio[2]}
                </p>
              </Reveal>
              <Reveal as="figure" className="m-0 md:col-span-7 md:order-2 order-1">
                <img
                  src={asset("/img/welcome/04-paintings-collection.jpg")}
                  alt="A wall of Stephen's mandalas"
                  loading="lazy"
                  className="w-full aspect-[4/3] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
                />
              </Reveal>
            </div>
          </section>

          {/* IMAGE 5 — SunStar full-width finale */}
          <Reveal as="figure" className="m-0 w-full pt-8 pb-20">
            <img
              src={asset("/img/welcome/05-arista-sunstar.jpg")}
              alt="Stephen beside the 3.6-metre Arista SunStar at the Farmacy restaurant, Notting Hill"
              loading="lazy"
              className="w-full h-[50vh] md:h-[70vh] object-cover object-center"
            />
            <figcaption className="mt-3 text-center font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/40">
              {CAP}
            </figcaption>
          </Reveal>
        </main>

        <Footer />
      </div>
    </>
  );
};
