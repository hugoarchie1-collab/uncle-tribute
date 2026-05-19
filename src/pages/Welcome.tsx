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
          {/* HERO — centered editorial quote (tightened so it doesn't read as a giant banner after the video) */}
          <section className="mx-auto max-w-[1000px] px-6 md:px-10 lg:px-16 pt-16 md:pt-24 pb-16 md:pb-20 text-center">
            <Reveal>
              <blockquote className="m-0 border-0 p-0">
                <p className="font-display italic font-normal leading-[1.06] tracking-[-0.02em] text-ink m-0 mb-6 text-balance text-[clamp(36px,5.6vw,72px)]">
                  {WELCOME.openingQuote}
                </p>
                <cite className="not-italic font-sans text-[10px] font-medium tracking-[0.32em] uppercase text-ink/55">
                  — {WELCOME.openingAttribution}
                </cite>
              </blockquote>
            </Reveal>
          </section>

          {/* Reminder paragraph */}
          <section className="mx-auto max-w-[680px] px-6 md:px-10 pb-20 md:pb-28 text-center">
            <Reveal>
              <p className="font-display italic font-light text-[clamp(20px,2.2vw,26px)] leading-[1.5] text-ink/95 text-balance m-0">
                {WELCOME.reminder}
              </p>
            </Reveal>
          </section>

          {/* IMAGE — Wild Rose painting / Stephen at drafting table */}
          <Reveal as="figure" className="m-0 mx-auto max-w-[960px] px-6 md:px-10 pb-16 md:pb-20">
            <img
              src={asset("/img/welcome/01-painting-wild-rose.jpg")}
              alt="Stephen at his drafting table"
              loading="lazy"
              className="w-full aspect-[3/2] object-cover ring-1 ring-white/8 shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
            />
            <figcaption className="mt-3 text-center font-sans text-[10px] font-medium tracking-[0.28em] uppercase text-ink/35">
              {CAP}
            </figcaption>
          </Reveal>

          {/* Passing note */}
          <section className="mx-auto max-w-[640px] px-6 md:px-10 py-20 md:py-28 text-center">
            <Reveal>
              <Separator className="mb-10 bg-ink/15" />
              <p className="font-display italic font-light text-[clamp(20px,2.2vw,26px)] leading-snug text-ink m-0">
                {WELCOME.passingNote}
              </p>
              <Separator className="mt-10 bg-ink/15" />
            </Reveal>
          </section>

          {/* IMAGE — Portrait */}
          <Reveal as="figure" className="m-0 mx-auto max-w-[420px] px-6 pb-16 md:pb-20">
            <img
              src={asset("/img/welcome/02-portrait-denim.jpg")}
              alt="Stephen Meakin"
              loading="lazy"
              className="w-full aspect-[3/4] object-cover ring-1 ring-white/8 shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
            />
            <figcaption className="mt-3 text-center font-sans text-[10px] font-medium tracking-[0.28em] uppercase text-ink/35">
              {CAP}
            </figcaption>
          </Reveal>

          {/* "In Steve's own words…" + bio paragraph 1 */}
          <section className="mx-auto max-w-[680px] px-6 md:px-10 py-14 md:py-20">
            <Reveal>
              <p className="font-sans text-[10px] font-medium tracking-[0.32em] uppercase text-ink/55 m-0 mb-8 text-center">
                {WELCOME.invocation}
              </p>
              <p className="font-sans font-light text-[17px] leading-[1.85] text-ink/85 m-0">
                {WELCOME.bio[0]}
              </p>
            </Reveal>
          </section>

          {/* IMAGE — Studio */}
          <Reveal as="figure" className="m-0 mx-auto max-w-[820px] px-6 md:px-10 pb-12">
            <img
              src={asset("/img/welcome/03-painting-in-studio.jpg")}
              alt="Stephen painting in the studio"
              loading="lazy"
              className="w-full aspect-[3/2] object-cover ring-1 ring-white/8 shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
            />
            <figcaption className="mt-3 text-center font-sans text-[10px] font-medium tracking-[0.28em] uppercase text-ink/35">
              {CAP}
            </figcaption>
          </Reveal>

          {/* Bio paragraph 2 — Sacred Geometry */}
          <section className="mx-auto max-w-[680px] px-6 md:px-10 py-14 md:py-20">
            <Reveal>
              <p className="font-sans font-light text-[17px] leading-[1.85] text-ink/85 m-0">
                {WELCOME.bio[1]}
              </p>
            </Reveal>
          </section>

          {/* IMAGE — Wall of mandalas */}
          <Reveal as="figure" className="m-0 mx-auto max-w-[820px] px-6 md:px-10 pb-12">
            <img
              src={asset("/img/welcome/04-paintings-collection.jpg")}
              alt="A wall of Stephen's mandalas"
              loading="lazy"
              className="w-full aspect-[3/2] object-cover ring-1 ring-white/8 shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
            />
            <figcaption className="mt-3 text-center font-sans text-[10px] font-medium tracking-[0.28em] uppercase text-ink/35">
              {CAP}
            </figcaption>
          </Reveal>

          {/* Bio paragraph 3 — Arista SunStar */}
          <section className="mx-auto max-w-[680px] px-6 md:px-10 py-14 md:py-20">
            <Reveal>
              <p className="font-sans font-light text-[17px] leading-[1.85] text-ink/85 m-0">
                {WELCOME.bio[2]}
              </p>
            </Reveal>
          </section>

          {/* IMAGE — Arista SunStar (smaller — source is low-res) */}
          <Reveal as="figure" className="m-0 mx-auto max-w-[560px] px-6 pb-32">
            <img
              src={asset("/img/welcome/05-arista-sunstar.jpg")}
              alt="Stephen beside the 3.6-metre Arista SunStar at the Farmacy restaurant, Notting Hill"
              loading="lazy"
              className="w-full aspect-[16/9] object-cover ring-1 ring-white/8 shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
            />
            <figcaption className="mt-3 text-center font-sans text-[10px] font-medium tracking-[0.28em] uppercase text-ink/35">
              {CAP}
            </figcaption>
          </Reveal>
        </main>

        <Footer />
      </div>
    </>
  );
};
