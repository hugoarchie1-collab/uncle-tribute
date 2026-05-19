import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { ImageReveal } from "../components/ImageReveal";
import { ABOUT, PASSING_DATE } from "../data/content";
import { usePageTitle } from "../lib/usePageTitle";

const CAP = "(n/a)";

export const About = () => {
  usePageTitle("Stephen Meakin");

  return (
    <div className="relative bg-bg">
      <Nav />
      <main>
        {/* HERO */}
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 pt-10 md:pt-16 pb-10 md:pb-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 md:items-stretch">
            <Reveal as="div" className="md:col-span-6 flex flex-col justify-center">
              <p className="font-sans text-[11px] font-bold tracking-[0.4em] uppercase text-accent m-0 mb-5">
                In memoriam · 1966 — {PASSING_DATE}
              </p>
              <h1 className="font-display font-bold tracking-[-0.045em] text-[clamp(56px,9.6vw,140px)] leading-[0.92] text-ink m-0 mb-6">
                Stephen<br />Meakin
              </h1>
              <p className="font-sans text-[12px] font-bold tracking-[0.28em] uppercase text-ink/75 m-0">
                SEM · Mandala Artist &amp; Sacred Geometer
              </p>
            </Reveal>
            <Reveal as="figure" className="m-0 md:col-span-6 min-h-[60vh] md:min-h-0">
              <ImageReveal
                src="/img/about/01-stephen-at-gallery.jpg"
                alt="Stephen Meakin"
                eager
                fill
                edges="all"
                parallax={0.22}
              />
            </Reveal>
          </div>
        </section>

        {/* OPENING — bold pull + image+text 7/5 with items-stretch (no bottom gap) */}
        <section className="mx-auto max-w-[1320px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
          <Reveal>
            <p className="font-display font-semibold tracking-[-0.025em] text-[clamp(22px,2.4vw,32px)] leading-[1.3] text-ink m-0 mb-10 md:mb-14 max-w-[940px]">
              {ABOUT.opening[0]}
            </p>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 md:items-stretch">
            <figure className="m-0 md:col-span-7 min-h-[50vh] md:min-h-0">
              <ImageReveal
                src="/img/about/02-painting-table.jpg"
                alt="Working on a mandala"
                fill
                edges="all"
                parallax={0.18}
              />
            </figure>
            <div className="md:col-span-5 flex flex-col justify-center md:py-4">
              <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/85 m-0">
                {ABOUT.opening[1]}
              </p>
            </div>
          </Reveal>
        </section>

        {/* EARLY LIFE — text + image side-by-side so no all-text section */}
        <section className="mx-auto max-w-[1320px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
          <Reveal>
            <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
              Early life · 1966 — 1999
            </p>
            <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(28px,3.8vw,52px)] leading-[0.98] text-ink m-0 mb-10 max-w-[760px]">
              The geometry of all cultures.
            </h2>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 md:items-stretch">
            <figure className="m-0 md:col-span-5 md:order-2 min-h-[60vh] md:min-h-0">
              <ImageReveal
                src="/img/about/03-stephen-on-cairn.jpg"
                alt="Stephen on a stone cairn"
                fill
                edges="all"
                parallax={0.2}
              />
            </figure>
            <div className="md:col-span-7 md:order-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 md:gap-x-10 gap-y-5">
              {ABOUT.earlyLife.map((p, i) => (
                <p key={i} className="font-sans font-normal text-[14.5px] md:text-[15px] leading-[1.7] text-ink/85 m-0">
                  {p}
                </p>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ANEGADA — quote chunk + side image (no all-text section) */}
        <section className="mx-auto max-w-[1320px] px-4 md:px-8 lg:px-12 py-12 md:py-16">
          <Reveal>
            <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4 text-center">
              Anegada · 1995
            </p>
            <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(32px,4.4vw,60px)] leading-[0.98] text-ink m-0 mb-10 max-w-[820px] mx-auto text-center">
              Everything is connected.
            </h2>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 md:items-stretch">
            <figure className="m-0 md:col-span-5 min-h-[60vh] md:min-h-0">
              <ImageReveal
                src="/img/about/02-painting-table.jpg"
                alt="Stephen painting"
                fill
                edges="all"
                parallax={0.18}
              />
            </figure>
            <div className="md:col-span-7 flex flex-col justify-center gap-6">
              {ABOUT.anegada.map((p, i) => (
                <p
                  key={i}
                  className={
                    i === 1
                      ? "font-display font-semibold text-[clamp(18px,1.8vw,22px)] leading-[1.45] text-ink m-0"
                      : "font-sans font-normal text-[15px] md:text-[16px] leading-[1.75] text-ink/85 m-0"
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

        {/* LEGACY chunk + commission image */}
        <section className="mx-auto max-w-[1320px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
          <Reveal>
            <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
              Phoenix Place · Lewes
            </p>
            <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(28px,3.8vw,52px)] leading-[0.98] text-ink m-0 mb-10 max-w-[680px]">
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
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 pb-10 md:pb-14">
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
            {[
              { src: "/img/about/04-mystic-rose-flyer.jpg", alt: "The Mystic Rose exhibition, Fairmont Dubai", title: "The Mystic Rose", subtitle: "Fairmont Dubai" },
              { src: "/img/about/05-force-india-layout.jpg", alt: "Sahara Force India F1 mandala layout", title: "Sahara Force India", subtitle: "F1 mandala layout" },
              { src: "/img/about/06-force-india-final.jpg", alt: "Sahara Force India F1 mandala — final design", title: "Sahara Force India", subtitle: "Final design" },
            ].map((item) => (
              <figure key={item.src} className="m-0 bg-bg-soft ring-1 ring-white/8">
                <ImageReveal
                  src={item.src}
                  alt={item.alt}
                  aspect="aspect-[3/4]"
                  parallax={0.1}
                  edges="all"
                  shadow=""
                />
                <figcaption className="p-5">
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
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 md:items-stretch">
            <Reveal as="div" className="md:col-span-5 flex flex-col justify-center">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                TAGA · est. 2010
              </p>
              <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(28px,3.6vw,48px)] leading-[0.98] text-ink m-0 mb-6">
                The Art of Geometry Academy.
              </h2>
              <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.7] text-ink/85 m-0 mb-5">
                In 2010 he founded TAGA — The Art of Geometry Academy — at Phoenix Place, Lewes.
              </p>
              <blockquote className="m-0 pl-5 border-l-2 border-accent">
                <p className="font-display font-semibold text-[15px] leading-[1.55] text-ink/90 m-0">
                  {ABOUT.academyQuote}
                </p>
              </blockquote>
            </Reveal>
            <Reveal as="figure" className="m-0 md:col-span-7 min-h-[55vh] md:min-h-0">
              <ImageReveal
                src="/img/about/10-taga-classroom.jpg"
                alt="A TAGA class in session"
                fill
                edges="all"
                parallax={0.18}
              />
            </Reveal>
          </div>
        </section>

        {/* PALESTINE — image LEFT, text RIGHT */}
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 md:items-stretch">
            <Reveal as="figure" className="m-0 md:col-span-7 min-h-[55vh] md:min-h-0">
              <ImageReveal
                src="/img/about/07-az-zarqa-students.jpg"
                alt="Stephen with children at the Az-Zarqa School for Palestinian Orphans and Refugees, Jordan"
                fill
                edges="all"
                parallax={0.18}
              />
            </Reveal>
            <Reveal as="div" className="md:col-span-5 flex flex-col justify-center">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                Az-Zarqa · Jordan
              </p>
              <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(28px,3.6vw,46px)] leading-[0.98] text-ink m-0 mb-6">
                Teaching geometry to children who'd lost everything.
              </h2>
              <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.7] text-ink/85 m-0">
                {ABOUT.palestine}
              </p>
            </Reveal>
          </div>
        </section>

        {/* STUDENT LETTER — text + small image pair so it's not all-text */}
        <section className="mx-auto max-w-[1320px] px-4 md:px-8 lg:px-12 py-14 md:py-20">
          <Reveal as="div" className="text-center mb-10">
            <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
              To every student
            </p>
            <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(28px,3.6vw,48px)] leading-[0.98] text-ink m-0 max-w-[820px] mx-auto">
              {ABOUT.studentsIntro}
            </h2>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 md:items-stretch">
            <blockquote className="m-0 md:col-span-7 p-7 md:p-10 bg-bg-soft ring-1 ring-white/10">
              <p className="font-sans font-medium text-[15px] md:text-[16px] leading-[1.85] text-ink m-0 mb-5">
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
                parallax={0.16}
              />
            </figure>
          </Reveal>
        </section>

        {/* TAGA STUDIO pair */}
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 pb-10 md:pb-14">
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
            <figure className="m-0">
              <ImageReveal
                src="/img/about/09-taga-studio.jpg"
                alt="The TAGA drafting studio"
                aspect="aspect-[4/3]"
                parallax={0.12}
                edges="all"
              />
              <figcaption className="mt-3 font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-ink/40">{CAP}</figcaption>
            </figure>
            <figure className="m-0">
              <ImageReveal
                src="/img/about/10-taga-classroom.jpg"
                alt="A TAGA class in session"
                aspect="aspect-[4/3]"
                parallax={0.12}
                edges="all"
              />
              <figcaption className="mt-3 font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-ink/40">{CAP}</figcaption>
            </figure>
          </Reveal>
        </section>

        {/* CLOSING — Ophiuchus painting, full-bleed cinematic with soft top/bottom */}
        <Reveal as="figure" className="m-0 w-full pb-12">
          <ImageReveal
            src="/img/about/11-ophiuchus-painting.jpg"
            alt="A painting on the studio floor"
            className="h-[60vh] md:h-[82vh] w-full"
            edges="y"
            parallax={0.3}
            shadow=""
          />
        </Reveal>
      </main>
      <Footer />
    </div>
  );
};
