import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { ImageReveal } from "../components/ImageReveal";
import { MagneticLink } from "../components/MagneticLink";
import { ABOUT, PASSING_DATE } from "../data/content";
import { usePageTitle } from "../lib/usePageTitle";

const CAP = "(n/a)";

// Split the 5 earlyLife paragraphs into two narrative chunks
// (Foundations 0–1, Wanderings 2–4) so the page chunks like the homepage.
const earlyLife = ABOUT.earlyLife;
const FOUNDATIONS = earlyLife.slice(0, 2);
const WANDERINGS = earlyLife.slice(2);

export const About = () => {
  usePageTitle("Stephen Meakin");

  return (
    <div className="relative bg-bg">
      <Nav />
      <main>
        {/* HERO — image keeps Stephen in frame (object-position top) */}
        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 pt-8 sm:pt-12 md:pt-16 pb-10 md:pb-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 md:items-stretch">
            <Reveal as="div" className="md:col-span-6 flex flex-col justify-center">
              <p className="font-sans text-[11px] font-bold tracking-[0.4em] uppercase text-accent m-0 mb-5">
                In memoriam · 1966 — {PASSING_DATE}
              </p>
              <h1 className="font-display font-bold tracking-[-0.045em] text-[clamp(48px,9vw,140px)] leading-[0.92] text-ink m-0 mb-6">
                Stephen<br />Meakin
              </h1>
              <p className="font-sans text-[11px] sm:text-[12px] font-bold tracking-[0.28em] uppercase text-ink/75 m-0">
                SEM · Mandala Artist &amp; Sacred Geometer
              </p>
            </Reveal>
            <Reveal as="figure" className="m-0 md:col-span-6 min-h-[50vh] md:min-h-[60vh]">
              <ImageReveal
                src="/img/about/01-stephen-at-gallery.jpg"
                alt="Stephen Meakin"
                eager
                fill
                edges="all"
                parallax={0.12}
                objectPosition="center top"
                tilt
              />
            </Reveal>
          </div>
        </section>

        {/* OPENING — bold pull, 2-col text+image stretches together */}
        <section className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-14">
          <Reveal>
            <p className="font-display font-semibold tracking-[-0.025em] text-[clamp(20px,2.4vw,30px)] leading-[1.3] text-ink m-0 mb-8 md:mb-12 max-w-[940px]">
              {ABOUT.opening[0]}
            </p>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-10 md:items-stretch">
            <figure className="m-0 md:col-span-7 min-h-[45vh] md:min-h-[55vh]">
              <ImageReveal
                src="/img/about/02-painting-table.jpg"
                alt="Working on a mandala"
                fill
                edges="all"
                parallax={0.14}
                objectPosition="center"
                tilt
              />
            </figure>
            <div className="md:col-span-5 flex flex-col justify-center md:py-4">
              <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.75] text-ink/85 m-0">
                {ABOUT.opening[1]}
              </p>
            </div>
          </Reveal>
        </section>

        {/* CHUNK 1 — "Foundations" (paragraphs 0–1) with cairn image */}
        <section className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-14">
          <Reveal>
            <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-3">
              Chapter I · Foundations
            </p>
            <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(28px,3.8vw,52px)] leading-[0.98] text-ink m-0 mb-8 md:mb-10 max-w-[720px]">
              Born in Staffordshire, raised in the geometry of England.
            </h2>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-10 md:items-stretch">
            <figure className="m-0 md:col-span-5 md:order-2 min-h-[45vh] md:min-h-[55vh]">
              <ImageReveal
                src="/img/about/03-stephen-on-cairn.jpg"
                alt="Stephen on a stone cairn"
                fill
                edges="all"
                parallax={0.16}
                objectPosition="center top"
                tilt
              />
            </figure>
            <div className="md:col-span-7 md:order-1 flex flex-col justify-center gap-5">
              {FOUNDATIONS.map((p, i) => (
                <p key={i} className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.75] text-ink/85 m-0">
                  {p}
                </p>
              ))}
            </div>
          </Reveal>
        </section>

        {/* CHUNK 2 — "Wanderings" (paragraphs 2–4) with TAGA studio image */}
        <section className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-14">
          <Reveal>
            <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-3">
              Chapter II · Wanderings
            </p>
            <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(28px,3.8vw,52px)] leading-[0.98] text-ink m-0 mb-8 md:mb-10 max-w-[720px]">
              France, Ibiza, Mexico, the Virgin Islands. A sketchbook of geometry.
            </h2>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-10 md:items-stretch">
            <figure className="m-0 md:col-span-7 min-h-[45vh] md:min-h-[55vh]">
              <ImageReveal
                src="/img/about/09-taga-studio.jpg"
                alt="The TAGA drafting studio"
                fill
                edges="all"
                parallax={0.14}
                tilt
              />
            </figure>
            <div className="md:col-span-5 flex flex-col justify-center gap-5">
              {WANDERINGS.map((p, i) => (
                <p key={i} className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.75] text-ink/85 m-0">
                  {p}
                </p>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ANEGADA — quote chunk + side image */}
        <section className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-16">
          <Reveal as="div" className="text-center mb-8 md:mb-12">
            <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-3">
              Anegada · 1995
            </p>
            <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(32px,4.4vw,60px)] leading-[0.98] text-ink m-0 max-w-[820px] mx-auto">
              Everything is connected.
            </h2>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-10 md:items-stretch">
            <figure className="m-0 md:col-span-5 min-h-[55vh] md:min-h-[60vh]">
              <ImageReveal
                src="/img/about/11-ophiuchus-painting.jpg"
                alt="A painting on the studio floor"
                fill
                edges="all"
                parallax={0.16}
                tilt
              />
            </figure>
            <div className="md:col-span-7 flex flex-col justify-center gap-5">
              {ABOUT.anegada.map((p, i) => (
                <p
                  key={i}
                  className={
                    i === 1
                      ? "font-display font-semibold text-[clamp(18px,1.8vw,22px)] leading-[1.45] text-ink m-0"
                      : "font-sans font-normal text-[14px] md:text-[15.5px] leading-[1.75] text-ink/85 m-0"
                  }
                >
                  {p}
                </p>
              ))}
              <p className="font-sans text-[10px] font-bold tracking-[0.36em] uppercase text-ink/55 m-0 mt-1 text-right">
                — Stephen Meakin
              </p>
            </div>
          </Reveal>
        </section>

        {/* PHOENIX PLACE — legacy chunk header */}
        <section className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-14">
          <Reveal>
            <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-3">
              Phoenix Place · Lewes
            </p>
            <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(28px,3.8vw,52px)] leading-[0.98] text-ink m-0 mb-8 max-w-[680px]">
              Commissions of consequence.
            </h2>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 max-w-[1100px]">
            {ABOUT.legacy.map((p, i) => (
              <p key={i} className="font-sans font-normal text-[14.5px] md:text-[15px] leading-[1.7] text-ink/85 m-0">
                {p}
              </p>
            ))}
          </Reveal>
        </section>

        {/* COMMISSIONS — 3-card grid */}
        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 pb-10 md:pb-14">
          <Reveal as="div" className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-5">
            {[
              { src: "/img/about/04-mystic-rose-flyer.jpg", alt: "The Mystic Rose exhibition, Fairmont Dubai", title: "The Mystic Rose", subtitle: "Fairmont Dubai" },
              { src: "/img/about/05-force-india-layout.jpg", alt: "Sahara Force India F1 mandala layout", title: "Sahara Force India", subtitle: "F1 mandala layout" },
              { src: "/img/about/06-force-india-final.jpg", alt: "Sahara Force India F1 mandala — final design", title: "Sahara Force India", subtitle: "Final design" },
            ].map((item) => (
              <figure key={item.src} className="m-0 bg-bg-soft ring-1 ring-white/8 transition-all duration-500 hover:ring-accent/40 hover:-translate-y-1">
                <ImageReveal
                  src={item.src}
                  alt={item.alt}
                  aspect="aspect-[3/4]"
                  parallax={0.08}
                  edges="all"
                  shadow=""
                  tilt
                />
                <figcaption className="p-4 sm:p-5">
                  <p className="font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-accent m-0 mb-2">
                    Commission
                  </p>
                  <p className="font-display font-bold text-[16px] tracking-[-0.01em] text-ink m-0 leading-[1.2]">
                    {item.title}
                  </p>
                  <p className="font-sans font-normal text-[13px] text-ink/65 m-0 mt-1">
                    {item.subtitle}
                  </p>
                </figcaption>
              </figure>
            ))}
          </Reveal>
        </section>

        {/* TAGA — text + academy quote LEFT, image RIGHT */}
        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-10 md:items-stretch">
            <Reveal as="div" className="md:col-span-5 flex flex-col justify-center">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-3">
                TAGA · est. 2010
              </p>
              <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(26px,3.4vw,46px)] leading-[0.98] text-ink m-0 mb-5">
                The Art of Geometry Academy.
              </h2>
              <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.7] text-ink/85 m-0 mb-5">
                In 2010 he founded TAGA — The Art of Geometry Academy — at Phoenix Place, Lewes.
              </p>
              <blockquote className="m-0 pl-5 border-l-2 border-accent">
                <p className="font-display font-semibold text-[14px] leading-[1.55] text-ink/90 m-0">
                  {ABOUT.academyQuote}
                </p>
              </blockquote>
            </Reveal>
            <Reveal as="figure" className="m-0 md:col-span-7 min-h-[50vh] md:min-h-0">
              <ImageReveal
                src="/img/about/10-taga-classroom.jpg"
                alt="A TAGA class in session"
                fill
                edges="all"
                parallax={0.14}
                tilt
              />
            </Reveal>
          </div>
        </section>

        {/* PALESTINE — image LEFT, text RIGHT */}
        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-10 md:items-stretch">
            <Reveal as="figure" className="m-0 md:col-span-7 min-h-[50vh] md:min-h-0">
              <ImageReveal
                src="/img/about/07-az-zarqa-students.jpg"
                alt="Stephen with children at the Az-Zarqa School for Palestinian Orphans and Refugees, Jordan"
                fill
                edges="all"
                parallax={0.14}
                tilt
              />
            </Reveal>
            <Reveal as="div" className="md:col-span-5 flex flex-col justify-center">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-3">
                Az-Zarqa · Jordan
              </p>
              <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(26px,3.4vw,44px)] leading-[0.98] text-ink m-0 mb-5">
                Teaching geometry to children who'd lost everything.
              </h2>
              <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.7] text-ink/85 m-0">
                {ABOUT.palestine}
              </p>
            </Reveal>
          </div>
        </section>

        {/* STUDENT LETTER */}
        <section className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-12 md:py-20">
          <Reveal as="div" className="text-center mb-8 md:mb-10">
            <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-3">
              To every student
            </p>
            <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(26px,3.4vw,46px)] leading-[0.98] text-ink m-0 max-w-[820px] mx-auto">
              {ABOUT.studentsIntro}
            </h2>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-10 md:items-stretch">
            <blockquote className="m-0 md:col-span-7 p-6 sm:p-8 md:p-10 bg-bg-soft ring-1 ring-white/10">
              <p className="font-sans font-medium text-[14.5px] md:text-[15.5px] leading-[1.85] text-ink m-0 mb-5">
                {ABOUT.studentsLetter}
              </p>
              <cite className="not-italic font-sans text-[10px] font-bold tracking-[0.36em] uppercase text-ink/65">
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

        {/* FINAL — full-bleed closing painting + CTA */}
        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 pb-10 md:pb-14">
          <Reveal as="figure" className="m-0 mb-10 md:mb-14">
            <ImageReveal
              src="/img/about/11-ophiuchus-painting.jpg"
              alt="A painting on the studio floor"
              className="h-[55vh] sm:h-[60vh] md:h-[78vh] w-full"
              edges="y"
              parallax={0.28}
              shadow=""
            />
            <figcaption className="mt-3 text-center font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/40">
              {CAP}
            </figcaption>
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
