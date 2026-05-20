import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { ImageReveal } from "../components/ImageReveal";
import { MagneticLink } from "../components/MagneticLink";
import { ABOUT, PASSING_DATE } from "../data/content";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

const earlyLife = ABOUT.earlyLife;
const FOUNDATIONS = earlyLife.slice(0, 2);
const WANDERINGS = earlyLife.slice(2);

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
                  "linear-gradient(180deg, rgba(10,9,8,0.5) 0%, rgba(10,9,8,0.25) 35%, rgba(10,9,8,0.55) 100%)",
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

        {/* ===== OPENING display pull-quote (paragraph 0) ===== */}
        <section className="mx-auto max-w-[1100px] px-4 sm:px-6 md:px-8 lg:px-12 py-16 md:py-24 text-center">
          <Reveal>
            <p className="font-display font-medium tracking-[-0.02em] text-[clamp(24px,3vw,42px)] leading-[1.2] text-ink m-0 max-w-[920px] mx-auto">
              {ABOUT.opening[0]}
            </p>
          </Reveal>
        </section>

        {/* ===== STATEMENT — image LEFT, paragraph 1 RIGHT ===== */}
        <section className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-14">
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-10 md:items-stretch">
            <figure className="m-0 md:col-span-7 min-h-[50vh] md:min-h-[60vh]">
              <ImageReveal
                src="/img/about/02-painting-table.jpg"
                alt="Working on a mandala"
                fill
                edges="all"
                parallax={0.14}
                tilt
              />
            </figure>
            <div className="md:col-span-5 flex flex-col justify-center md:py-4">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                01 · Statement
              </p>
              <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.75] text-ink/85 m-0">
                {ABOUT.opening[1]}
              </p>
            </div>
          </Reveal>
        </section>

        {/* ===== CHAPTER I — Foundations ===== */}
        <section className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-16">
          <Reveal as="div" className="text-center mb-10 md:mb-14">
            <p className="font-sans text-[10px] sm:text-[11px] font-bold tracking-[0.42em] uppercase text-ink/55 m-0 mb-3">
              Chapter I · Foundations
            </p>
            <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(32px,5vw,64px)] leading-[0.98] text-ink m-0 max-w-[920px] mx-auto">
              Born in Staffordshire,<br className="hidden sm:block" /> raised in the geometry of England.
            </h2>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-10 md:items-stretch">
            <figure className="m-0 md:col-span-5 md:order-2 min-h-[50vh] md:min-h-[60vh]">
              <ImageReveal
                src="/img/about/09-taga-studio.jpg"
                alt="The TAGA drafting studio"
                fill
                edges="all"
                parallax={0.16}
                tilt
              />
            </figure>
            <div className="md:col-span-7 md:order-1 flex flex-col justify-center gap-5">
              {FOUNDATIONS.map((p, i) => (
                <p key={i} className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/85 m-0">
                  {p}
                </p>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ===== CHAPTER II — Wanderings ===== */}
        <section className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-16">
          <Reveal as="div" className="text-center mb-10 md:mb-14">
            <p className="font-sans text-[10px] sm:text-[11px] font-bold tracking-[0.42em] uppercase text-ink/55 m-0 mb-3">
              Chapter II · Wanderings
            </p>
            <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(32px,5vw,64px)] leading-[0.98] text-ink m-0 max-w-[920px] mx-auto">
              France, Ibiza, Mexico,<br className="hidden sm:block" /> the Virgin Islands.
            </h2>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-10 md:items-stretch">
            <figure className="m-0 md:col-span-7 min-h-[50vh] md:min-h-[60vh]">
              <ImageReveal
                src="/img/about/03-stephen-on-cairn.jpg"
                alt="Stephen on a stone cairn"
                fill
                edges="all"
                parallax={0.14}
                objectPosition="center top"
                tilt
              />
            </figure>
            <div className="md:col-span-5 flex flex-col justify-center gap-5">
              {WANDERINGS.map((p, i) => (
                <p key={i} className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/85 m-0">
                  {p}
                </p>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ===== CHAPTER III — Anegada ===== */}
        <section className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-12 md:py-20">
          <Reveal as="div" className="text-center mb-10 md:mb-14">
            <p className="font-sans text-[10px] sm:text-[11px] font-bold tracking-[0.42em] uppercase text-ink/55 m-0 mb-3">
              Chapter III · Anegada, 1995
            </p>
            <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(40px,6vw,84px)] leading-[0.94] text-ink m-0 max-w-[1000px] mx-auto">
              Everything is connected.
            </h2>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-10 md:items-stretch">
            <figure className="m-0 md:col-span-5 min-h-[55vh] md:min-h-[65vh]">
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
                      ? "font-display font-medium text-[clamp(20px,2.2vw,28px)] leading-[1.35] text-ink m-0"
                      : "font-sans font-normal text-[14.5px] md:text-[15.5px] leading-[1.75] text-ink/85 m-0"
                  }
                >
                  {p}
                </p>
              ))}
              <p className="font-sans text-[10px] font-bold tracking-[0.38em] uppercase text-ink/55 m-0 mt-1 text-right">
                — Stephen Meakin
              </p>
            </div>
          </Reveal>
        </section>

        {/* ===== CHAPTER IV — Phoenix Place + Commissions ===== */}
        <section className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-12 md:py-16">
          <Reveal as="div" className="text-center mb-10 md:mb-14">
            <p className="font-sans text-[10px] sm:text-[11px] font-bold tracking-[0.42em] uppercase text-ink/55 m-0 mb-3">
              Chapter IV · Phoenix Place, Lewes
            </p>
            <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(32px,5vw,64px)] leading-[0.98] text-ink m-0 max-w-[920px] mx-auto">
              Commissions of consequence.
            </h2>
          </Reveal>
          <Reveal as="div" className="max-w-[860px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 mb-12 md:mb-16">
            {ABOUT.legacy.map((p, i) => (
              <p key={i} className="font-sans font-normal text-[14.5px] md:text-[15px] leading-[1.7] text-ink/85 m-0">
                {p}
              </p>
            ))}
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-5">
            {[
              { src: "/img/about/04-mystic-rose-flyer.jpg", alt: "The Mystic Rose exhibition, Fairmont Dubai", title: "The Mystic Rose", subtitle: "Fairmont, Dubai", number: "01" },
              { src: "/img/about/05-force-india-layout.jpg", alt: "Sahara Force India F1 mandala layout", title: "Force India", subtitle: "F1 mandala layout", number: "02" },
              { src: "/img/about/06-force-india-final.jpg", alt: "Sahara Force India F1 mandala — final design", title: "Force India", subtitle: "Final design", number: "03" },
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
                <figcaption className="p-4 sm:p-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display font-bold text-[16px] tracking-[-0.01em] text-ink m-0 leading-[1.2]">
                      {item.title}
                    </p>
                    <p className="font-sans font-normal text-[13px] text-ink/65 m-0 mt-1">
                      {item.subtitle}
                    </p>
                  </div>
                  <span className="font-display font-bold text-[14px] text-accent tracking-tight tabular-nums">
                    {item.number}
                  </span>
                </figcaption>
              </figure>
            ))}
          </Reveal>
        </section>

        {/* ===== CHAPTER V — TAGA + Az-Zarqa ===== */}
        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 py-12 md:py-16">
          <Reveal as="div" className="text-center mb-10 md:mb-14">
            <p className="font-sans text-[10px] sm:text-[11px] font-bold tracking-[0.42em] uppercase text-ink/55 m-0 mb-3">
              Chapter V · TAGA + Az-Zarqa
            </p>
            <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(32px,5vw,64px)] leading-[0.98] text-ink m-0 max-w-[1000px] mx-auto">
              The teacher who travelled.
            </h2>
          </Reveal>

          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-10 md:items-stretch mb-6 md:mb-10">
            <div className="md:col-span-5 flex flex-col justify-center">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-3">
                TAGA · est. 2010
              </p>
              <h3 className="font-display font-bold tracking-[-0.03em] text-[clamp(26px,3.4vw,46px)] leading-[0.96] text-ink m-0 mb-5">
                The Art of Geometry Academy.
              </h3>
              <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.7] text-ink/85 m-0 mb-5">
                In 2010 he founded TAGA — The Art of Geometry Academy — at Phoenix Place, Lewes.
              </p>
              <blockquote className="m-0 pl-5 border-l-2 border-accent">
                <p className="font-sans font-medium text-[14px] leading-[1.6] text-ink/90 m-0">
                  {ABOUT.academyQuote}
                </p>
              </blockquote>
            </div>
            <figure className="m-0 md:col-span-7 min-h-[50vh] md:min-h-0">
              <ImageReveal
                src="/img/about/10-taga-classroom.jpg"
                alt="A TAGA class in session"
                fill
                edges="all"
                parallax={0.14}
                tilt
              />
            </figure>
          </Reveal>

          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-10 md:items-stretch">
            <figure className="m-0 md:col-span-7 min-h-[50vh] md:min-h-0">
              <ImageReveal
                src="/img/about/07-az-zarqa-students.jpg"
                alt="Stephen with children at the Az-Zarqa School for Palestinian Orphans and Refugees, Jordan"
                fill
                edges="all"
                parallax={0.14}
                tilt
              />
            </figure>
            <div className="md:col-span-5 flex flex-col justify-center">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-3">
                Az-Zarqa · Jordan
              </p>
              <h3 className="font-display font-bold tracking-[-0.03em] text-[clamp(26px,3.4vw,44px)] leading-[0.96] text-ink m-0 mb-5">
                Teaching geometry to children who'd lost everything.
              </h3>
              <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.7] text-ink/85 m-0">
                {ABOUT.palestine}
              </p>
            </div>
          </Reveal>
        </section>

        {/* ===== CHAPTER VI — Student Letter ===== */}
        <section className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 py-12 md:py-20">
          <Reveal as="div" className="text-center mb-8 md:mb-10">
            <p className="font-sans text-[10px] sm:text-[11px] font-bold tracking-[0.42em] uppercase text-ink/55 m-0 mb-3">
              Chapter VI · To every student
            </p>
            <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(28px,4vw,52px)] leading-[1.02] text-ink m-0 max-w-[920px] mx-auto">
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

        {/* ===== CLOSING — CTA only ===== */}
        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 py-14 md:py-20 text-center">
          <Reveal as="div">
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
