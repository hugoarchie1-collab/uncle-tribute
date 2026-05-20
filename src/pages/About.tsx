import type { ReactNode } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { ImageReveal } from "../components/ImageReveal";
import { MagneticLink } from "../components/MagneticLink";
import { ABOUT, PASSING_DATE } from "../data/content";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

const earlyLife = ABOUT.earlyLife;

// ─── Timeline entry layout ──────────────────────────────────────────────────
// Each milestone aligns to a left-side "spine" (date + dot) with the chapter
// content on the right. On mobile the spine collapses and content is full-width.

const Milestone = ({
  year,
  place,
  title,
  children,
}: {
  year: string;
  place?: string;
  title: string;
  children: ReactNode;
}) => (
  <Reveal as="section" className="relative pl-0 md:pl-[180px] py-10 md:py-14">
    {/* Spine date marker — md+ only */}
    <div className="hidden md:block absolute left-0 top-14 w-[140px] text-right pr-6">
      <p className="font-display font-bold text-[clamp(28px,3vw,40px)] leading-none text-accent tabular-nums m-0">
        {year}
      </p>
      {place && (
        <p className="mt-2 font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/55 m-0">
          {place}
        </p>
      )}
    </div>
    {/* Spine dot */}
    <span
      aria-hidden="true"
      className="hidden md:block absolute left-[155px] top-[26px] w-2.5 h-2.5 rounded-full bg-accent ring-4 ring-bg"
    />
    {/* Mobile date row */}
    <div className="md:hidden mb-4">
      <p className="inline font-display font-bold text-[28px] leading-none text-accent tabular-nums m-0 mr-3">
        {year}
      </p>
      {place && (
        <p className="inline font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/55 m-0">
          {place}
        </p>
      )}
    </div>
    {/* Content */}
    <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(24px,3.4vw,48px)] leading-[1.02] text-ink m-0 mb-6 max-w-[760px]">
      {title}
    </h2>
    <div className="max-w-[760px] flex flex-col gap-5">{children}</div>
  </Reveal>
);

export const About = () => {
  usePageTitle("Stephen Meakin");

  return (
    <div className="relative bg-bg">
      <Nav />
      <main>
        {/* ===== HERO ===== */}
        <section className="relative">
          <div className="relative h-[72vh] sm:h-[80vh] md:h-[86vh] w-full overflow-hidden">
            <img
              src={asset("/img/about/01-stephen-at-gallery.jpg")}
              alt="Stephen Meakin"
              loading="eager"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(10,9,8,0.55) 0%, rgba(10,9,8,0.25) 35%, rgba(10,9,8,0.6) 100%)",
              }}
            />
            <Reveal as="div" className="absolute top-24 md:top-28 left-1/2 -translate-x-1/2 text-center">
              <p className="font-sans text-[10px] sm:text-[11px] font-bold tracking-[0.42em] uppercase text-ink/85 m-0">
                In memoriam · 1966 — {PASSING_DATE}
              </p>
            </Reveal>
            <Reveal as="div" className="absolute inset-x-0 bottom-[7vh] md:bottom-[8vh] text-center px-4">
              <h1 className="font-display font-bold tracking-[-0.04em] text-[clamp(64px,11vw,160px)] leading-[0.88] text-ink m-0">
                Stephen<br />Meakin
              </h1>
              <p className="mt-4 md:mt-5 font-sans text-[11px] sm:text-[12px] font-bold tracking-[0.34em] uppercase text-ink/75 m-0">
                SEM · Mandala Artist &amp; Sacred Geometer
              </p>
            </Reveal>
          </div>
        </section>

        {/* ===== OPENING PULL ===== */}
        <section className="mx-auto max-w-[1100px] px-4 sm:px-6 md:px-8 lg:px-12 py-14 md:py-20 text-center">
          <Reveal>
            <p className="font-display font-medium tracking-[-0.02em] text-[clamp(22px,2.8vw,36px)] leading-[1.3] text-ink m-0 max-w-[940px] mx-auto">
              {ABOUT.opening[0]}
            </p>
          </Reveal>
        </section>

        {/* ===== TIMELINE ===== */}
        <div className="relative mx-auto max-w-[1100px] px-4 sm:px-6 md:px-8 lg:px-12">
          {/* Vertical spine — md+ only */}
          <span
            aria-hidden="true"
            className="hidden md:block absolute left-[156px] top-0 bottom-0 w-px bg-white/12"
          />

          <Milestone year="1966" place="Staffordshire" title="Born into a country of hedgerows and Georgian cities.">
            <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
              {earlyLife[0]}
            </p>
          </Milestone>

          <Milestone year="1986" place="Brighton Polytechnic" title="Art Foundation — the search for a different aesthetic.">
            <Reveal as="figure" className="m-0">
              <ImageReveal
                src="/img/about/02-painting-table.jpg"
                alt="Working on a mandala"
                aspect="aspect-[4/3]"
                edges="all"
                parallax={0.12}
                tilt
              />
            </Reveal>
            <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
              Encouraged to explore painting, textiles, sculpture and video. While the British Art movement was flowering in London, an exhibition of Aboriginal art moved him most — the start of a search for a universal visual language.
            </p>
          </Milestone>

          <Milestone year="1990" place="Bournemouth" title="3D Design, and the discovery of geometric pattern.">
            <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
              {earlyLife[1]}
            </p>
          </Milestone>

          <Milestone year="1990 — 1995" place="France · Ibiza · Mexico · Virgin Islands" title="Theatre backdrops, murals, sketchbooks of geometry.">
            <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
              {earlyLife[2]}
            </p>
          </Milestone>

          <Milestone year="1995" place="Anegada, Caribbean Sea" title="Everything is connected.">
            <Reveal as="figure" className="m-0">
              <ImageReveal
                src="/img/about/03-stephen-on-cairn.jpg"
                alt="Stephen on a stone cairn"
                aspect="aspect-[3/2]"
                edges="all"
                parallax={0.14}
                objectPosition="center top"
                tilt
              />
            </Reveal>
            {ABOUT.anegada.map((p, i) => (
              <p
                key={i}
                className={
                  i === 1
                    ? "font-display font-medium text-[clamp(18px,1.9vw,22px)] leading-[1.45] text-ink m-0"
                    : "font-sans font-normal text-[14.5px] md:text-[15.5px] leading-[1.8] text-ink/85 m-0"
                }
              >
                {p}
              </p>
            ))}
            <p className="font-sans text-[10px] font-bold tracking-[0.36em] uppercase text-ink/55 m-0 mt-1 text-right">
              — Stephen Meakin
            </p>
          </Milestone>

          <Milestone year="1996" place="Brighton University" title="Architecture & Interior Design.">
            <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
              {earlyLife[3]}
            </p>
          </Milestone>

          <Milestone year="1999" place="Brighton" title="The first major mandala.">
            <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
              {earlyLife[4]}
            </p>
          </Milestone>

          <Milestone year="2002 — 2009" place="Lewes, East Sussex" title="MA Fine Art, Phoenix Place, and the years of mandalas.">
            <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
              {ABOUT.legacy[0]}
            </p>
          </Milestone>

          <Milestone year="2010" place="TAGA · Phoenix Place" title="The Art of Geometry Academy is founded.">
            <Reveal as="figure" className="m-0">
              <ImageReveal
                src="/img/about/10-taga-classroom.jpg"
                alt="A TAGA class in session"
                aspect="aspect-[4/3]"
                edges="all"
                parallax={0.12}
                tilt
              />
            </Reveal>
            <blockquote className="m-0 pl-5 border-l-2 border-accent">
              <p className="font-display font-medium text-[15px] md:text-[16px] leading-[1.6] text-ink/95 m-0">
                {ABOUT.academyQuote}
              </p>
            </blockquote>
          </Milestone>

          <Milestone year="2014" place="Az-Zarqa, Jordan" title="Teaching geometry to children who'd lost everything.">
            <Reveal as="figure" className="m-0">
              <ImageReveal
                src="/img/about/07-az-zarqa-students.jpg"
                alt="Stephen with children at the Az-Zarqa School for Palestinian Orphans and Refugees, Jordan"
                aspect="aspect-[3/2]"
                edges="all"
                parallax={0.12}
                tilt
              />
            </Reveal>
            <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
              {ABOUT.palestine}
            </p>
          </Milestone>

          <Milestone year="2016" place="Notting Hill, London" title="The 3.6-metre Arista SunStar.">
            <p className="font-sans font-normal text-[15.5px] md:text-[16px] leading-[1.8] text-ink/85 m-0">
              {ABOUT.legacy[1]}
            </p>
          </Milestone>

          <Milestone year={PASSING_DATE} place="The estate continues" title="A life devoted to the geometry of light.">
            <p className="font-display font-medium text-[clamp(18px,2vw,24px)] leading-[1.5] text-ink m-0">
              Stephen passed away in {PASSING_DATE}. The Mandala Company Foundation, on behalf of his immediate family, continues to carry his work forward.
            </p>
          </Milestone>
        </div>

        {/* ===== STUDENT LETTER — outside the timeline, as a closing chapter ===== */}
        <section className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-14 md:py-20">
          <Reveal as="div" className="text-center mb-8 md:mb-10">
            <p className="font-sans text-[11px] font-bold tracking-[0.42em] uppercase text-accent m-0 mb-4">
              To every student
            </p>
            <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(28px,4vw,52px)] leading-[1.0] text-ink m-0 max-w-[920px] mx-auto">
              {ABOUT.studentsIntro}
            </h2>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-10 md:items-stretch">
            <blockquote className="m-0 md:col-span-7 p-6 sm:p-8 md:p-10 bg-bg-soft ring-1 ring-white/10">
              <p className="font-sans font-medium text-[14.5px] md:text-[15.5px] leading-[1.85] text-ink m-0 mb-5">
                {ABOUT.studentsLetter}
              </p>
              <cite className="not-italic font-sans text-[10px] font-bold tracking-[0.38em] uppercase text-ink/65">
                — Stephen Meakin
              </cite>
            </blockquote>
            <figure className="m-0 md:col-span-5 min-h-[55vh] md:min-h-0">
              <ImageReveal
                src="/img/about/08-taga-group.jpg"
                alt="A group at TAGA with their paintings"
                fill
                edges="all"
                parallax={0.14}
                tilt
              />
            </figure>
          </Reveal>
        </section>

        {/* ===== CLOSING — full-bleed painting + CTA ===== */}
        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 pb-12 md:pb-16">
          <Reveal as="figure" className="m-0 mb-10 md:mb-14">
            <ImageReveal
              src="/img/about/11-ophiuchus-painting.jpg"
              alt="A painting on the studio floor"
              className="h-[55vh] sm:h-[65vh] md:h-[78vh] w-full"
              edges="y"
              parallax={0.26}
              shadow=""
            />
          </Reveal>
          <Reveal as="div" className="text-center">
            <MagneticLink
              to="/collections"
              className="inline-flex w-fit items-center bg-ink text-bg px-7 py-3.5 font-sans text-[12px] font-bold tracking-[0.18em] uppercase rounded-full transition-colors duration-300 hover:bg-accent hover:text-ink"
              ariaLabel="Explore the collections"
            >
              Explore the collections →
            </MagneticLink>
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
};
