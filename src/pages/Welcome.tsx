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
          {/* HERO — bold, tight, striking */}
          <section className="mx-auto max-w-[1040px] px-4 md:px-8 lg:px-12 pt-12 md:pt-20 pb-12 md:pb-16 text-center">
            <Reveal>
              <blockquote className="m-0 border-0 p-0">
                <p className="font-display italic font-bold leading-[1.04] tracking-[-0.03em] text-ink m-0 mb-5 text-balance text-[clamp(40px,6.4vw,84px)]">
                  {WELCOME.openingQuote}
                </p>
                <cite className="not-italic font-sans text-[10px] font-bold tracking-[0.36em] uppercase text-ink/65">
                  — {WELCOME.openingAttribution}
                </cite>
              </blockquote>
            </Reveal>
          </section>

          {/* Reminder paragraph */}
          <section className="mx-auto max-w-[720px] px-4 md:px-8 pb-16 md:pb-24 text-center">
            <Reveal>
              <p className="font-display italic font-semibold text-[clamp(22px,2.6vw,30px)] leading-[1.45] text-ink text-balance m-0">
                {WELCOME.reminder}
              </p>
            </Reveal>
          </section>

          {/* IMAGE 1 — Wild Rose / Stephen at drafting table */}
          <Reveal as="figure" className="m-0 mx-auto max-w-[1120px] px-4 md:px-8 pb-14 md:pb-20">
            <img
              src={asset("/img/welcome/01-painting-wild-rose.jpg")}
              alt="Stephen at his drafting table"
              loading="lazy"
              className="w-full aspect-[3/2] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
            />
            <figcaption className="mt-3 text-center font-sans text-[10px] font-semibold tracking-[0.32em] uppercase text-ink/40">
              {CAP}
            </figcaption>
          </Reveal>

          {/* Passing note */}
          <section className="mx-auto max-w-[640px] px-4 md:px-8 py-16 md:py-24 text-center">
            <Reveal>
              <Separator className="mb-8 bg-ink/15" />
              <p className="font-display italic font-semibold text-[clamp(22px,2.6vw,30px)] leading-snug text-ink m-0">
                {WELCOME.passingNote}
              </p>
              <Separator className="mt-8 bg-ink/15" />
            </Reveal>
          </section>

          {/* IMAGE 2 — Portrait */}
          <Reveal as="figure" className="m-0 mx-auto max-w-[440px] px-4 pb-14 md:pb-20">
            <img
              src={asset("/img/welcome/02-portrait-denim.jpg")}
              alt="Stephen Meakin"
              loading="lazy"
              className="w-full aspect-[3/4] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
            />
            <figcaption className="mt-3 text-center font-sans text-[10px] font-semibold tracking-[0.32em] uppercase text-ink/40">
              {CAP}
            </figcaption>
          </Reveal>

          {/* "In Steve's own words…" + bio 1 */}
          <section className="mx-auto max-w-[720px] px-4 md:px-8 py-10 md:py-14">
            <Reveal>
              <p className="font-sans text-[10px] font-semibold tracking-[0.34em] uppercase text-ink/60 m-0 mb-7 text-center">
                {WELCOME.invocation}
              </p>
              <p className="font-sans font-normal text-[17px] md:text-[18px] leading-[1.8] text-ink/90 m-0">
                {WELCOME.bio[0]}
              </p>
            </Reveal>
          </section>

          {/* IMAGE 3 — Studio */}
          <Reveal as="figure" className="m-0 mx-auto max-w-[960px] px-4 md:px-8 pb-10">
            <img
              src={asset("/img/welcome/03-painting-in-studio.jpg")}
              alt="Stephen painting in the studio"
              loading="lazy"
              className="w-full aspect-[3/2] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
            />
            <figcaption className="mt-3 text-center font-sans text-[10px] font-semibold tracking-[0.32em] uppercase text-ink/40">
              {CAP}
            </figcaption>
          </Reveal>

          {/* Bio 2 — Sacred Geometry */}
          <section className="mx-auto max-w-[720px] px-4 md:px-8 py-10 md:py-14">
            <Reveal>
              <p className="font-sans font-normal text-[17px] md:text-[18px] leading-[1.8] text-ink/90 m-0">
                {WELCOME.bio[1]}
              </p>
            </Reveal>
          </section>

          {/* IMAGE 4 — Wall of mandalas */}
          <Reveal as="figure" className="m-0 mx-auto max-w-[960px] px-4 md:px-8 pb-10">
            <img
              src={asset("/img/welcome/04-paintings-collection.jpg")}
              alt="A wall of Stephen's mandalas"
              loading="lazy"
              className="w-full aspect-[3/2] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
            />
            <figcaption className="mt-3 text-center font-sans text-[10px] font-semibold tracking-[0.32em] uppercase text-ink/40">
              {CAP}
            </figcaption>
          </Reveal>

          {/* Bio 3 — Arista SunStar */}
          <section className="mx-auto max-w-[720px] px-4 md:px-8 py-10 md:py-14">
            <Reveal>
              <p className="font-sans font-normal text-[17px] md:text-[18px] leading-[1.8] text-ink/90 m-0">
                {WELCOME.bio[2]}
              </p>
            </Reveal>
          </section>

          {/* IMAGE 5 — SunStar (smaller, source is low-res) */}
          <Reveal as="figure" className="m-0 mx-auto max-w-[640px] px-4 pb-24">
            <img
              src={asset("/img/welcome/05-arista-sunstar.jpg")}
              alt="Stephen beside the 3.6-metre Arista SunStar at the Farmacy restaurant, Notting Hill"
              loading="lazy"
              className="w-full aspect-[16/9] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
            />
            <figcaption className="mt-3 text-center font-sans text-[10px] font-semibold tracking-[0.32em] uppercase text-ink/40">
              {CAP}
            </figcaption>
          </Reveal>
        </main>

        <Footer />
      </div>
    </>
  );
};
