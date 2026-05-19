import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Badge } from "../components/ui/badge";
import { ABOUT, PASSING_DATE } from "../data/content";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

const CAP = "(n/a)";

export const About = () => {
  usePageTitle("Stephen Meakin");

  return (
    <div className="relative bg-bg">
      <Nav />
      <main>
        {/* HERO — big name, no body italic */}
        <Reveal as="section" className="px-4 md:px-8 lg:px-12 pt-16 md:pt-24 pb-10 text-center">
          <Badge variant="accent" className="mb-5">In memoriam</Badge>
          <h1 className="font-display font-bold italic tracking-[-0.03em] text-[clamp(64px,11vw,160px)] leading-[0.95] text-ink m-0 text-balance">
            Stephen Meakin
          </h1>
          <p className="mt-5 font-sans text-[12px] font-bold tracking-[0.4em] uppercase text-ink/75 m-0">
            1966 <span className="text-accent px-2">·</span> {PASSING_DATE}
          </p>
          <p className="mt-2 font-sans text-[11px] font-semibold tracking-[0.34em] uppercase text-ink/55 m-0">
            SEM · Mandala Artist &amp; Sacred Geometer
          </p>
        </Reveal>

        {/* FULL-WIDTH HERO IMAGE */}
        <Reveal as="figure" className="m-0 w-full">
          <img
            src={asset("/img/about/01-stephen-at-gallery.jpg")}
            alt="Stephen Meakin"
            loading="eager"
            className="w-full h-[58vh] md:h-[72vh] object-cover object-center"
          />
        </Reveal>

        {/* CHUNK — opening line, big bold (not italic) */}
        <Reveal as="section" className="mx-auto max-w-[920px] px-6 md:px-10 py-14 md:py-20">
          <p className="font-sans font-medium text-[clamp(20px,1.95vw,26px)] leading-[1.55] text-ink m-0">
            {ABOUT.opening[0]}
          </p>
        </Reveal>

        {/* CHUNK — image LEFT, text RIGHT */}
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
            <Reveal as="figure" className="m-0 md:col-span-7">
              <img
                src={asset("/img/about/02-painting-table.jpg")}
                alt="Working on a mandala"
                loading="lazy"
                className="w-full aspect-[4/3] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
              />
            </Reveal>
            <Reveal as="div" className="md:col-span-5">
              <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/90 m-0">
                {ABOUT.opening[1]}
              </p>
            </Reveal>
          </div>
        </section>

        {/* CHUNK — eyebrow + headline + 2-col bio body */}
        <section className="mx-auto max-w-[1100px] px-6 md:px-10 py-14 md:py-20">
          <Reveal>
            <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
              Early life · 1966 – 1999
            </p>
            <h2 className="font-display font-bold italic tracking-[-0.025em] text-[clamp(32px,4.4vw,56px)] leading-[1.02] text-ink m-0 mb-10">
              The geometry of all cultures
            </h2>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {ABOUT.earlyLife.map((p, i) => (
              <p key={i} className="font-sans font-normal text-[15.5px] leading-[1.75] text-ink/90 m-0">{p}</p>
            ))}
          </Reveal>
        </section>

        {/* FULL-WIDTH — cairn */}
        <Reveal as="figure" className="m-0 w-full">
          <img
            src={asset("/img/about/03-stephen-on-cairn.jpg")}
            alt="Stephen on a stone cairn"
            loading="lazy"
            className="w-full h-[60vh] md:h-[80vh] object-cover object-center"
          />
        </Reveal>

        {/* ANEGADA — italic ONLY here (it's a personal quote) */}
        <section className="mx-auto max-w-[1100px] px-6 md:px-10 py-20 md:py-28">
          <Reveal>
            <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4 text-center">
              Anegada · 1995
            </p>
            <h2 className="font-display font-bold italic tracking-[-0.025em] text-[clamp(32px,4.4vw,56px)] leading-[1.02] text-ink m-0 mb-12 text-center">
              Everything is connected
            </h2>
          </Reveal>
          <Reveal as="div" className="max-w-[760px] mx-auto flex flex-col gap-7">
            {ABOUT.anegada.map((p, i) => (
              <p
                key={i}
                className={
                  i === 1
                    ? "font-display italic font-medium text-[clamp(20px,2vw,26px)] leading-[1.55] text-ink m-0"
                    : "font-sans font-normal text-[17px] md:text-[18px] leading-[1.8] text-ink/90 m-0"
                }
              >
                {p}
              </p>
            ))}
            <p className="font-sans text-[10px] font-bold tracking-[0.36em] uppercase text-ink/55 m-0 mt-2 text-right">
              — Stephen Meakin
            </p>
          </Reveal>
        </section>

        {/* LEGACY chunk */}
        <section className="mx-auto max-w-[1100px] px-6 md:px-10 py-14 md:py-20">
          <Reveal>
            <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
              Phoenix Place · Lewes
            </p>
            <h2 className="font-display font-bold italic tracking-[-0.025em] text-[clamp(32px,4.4vw,56px)] leading-[1.02] text-ink m-0 mb-10">
              Commissions of consequence
            </h2>
          </Reveal>
          <Reveal as="div" className="max-w-[760px] flex flex-col gap-5">
            {ABOUT.legacy.map((p, i) => (
              <p key={i} className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.8] text-ink/90 m-0">{p}</p>
            ))}
          </Reveal>
        </section>

        {/* Commission images — 3-col grid */}
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 pb-12">
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <figure className="m-0">
              <img src={asset("/img/about/04-mystic-rose-flyer.jpg")} alt="The Mystic Rose exhibition, Fairmont Dubai" loading="lazy" className="w-full aspect-[3/4] object-cover shadow-[0_18px_44px_rgba(0,0,0,0.55)]" />
              <figcaption className="mt-2 text-center font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-ink/45">{CAP}</figcaption>
            </figure>
            <figure className="m-0">
              <img src={asset("/img/about/05-force-india-layout.jpg")} alt="Sahara Force India F1 mandala layout" loading="lazy" className="w-full aspect-[3/4] object-cover shadow-[0_18px_44px_rgba(0,0,0,0.55)]" />
              <figcaption className="mt-2 text-center font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-ink/45">{CAP}</figcaption>
            </figure>
            <figure className="m-0">
              <img src={asset("/img/about/06-force-india-final.jpg")} alt="Sahara Force India F1 mandala — final design" loading="lazy" className="w-full aspect-[3/4] object-cover shadow-[0_18px_44px_rgba(0,0,0,0.55)]" />
              <figcaption className="mt-2 text-center font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-ink/45">{CAP}</figcaption>
            </figure>
          </Reveal>
        </section>

        {/* TAGA — text LEFT, image RIGHT */}
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-14 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
            <Reveal as="div" className="md:col-span-5">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                TAGA · est. 2010
              </p>
              <h2 className="font-display font-bold italic tracking-[-0.025em] text-[clamp(28px,3.6vw,44px)] leading-[1.04] text-ink m-0 mb-6">
                The Art of Geometry Academy
              </h2>
              <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/90 m-0 mb-5">
                In 2010 he founded TAGA — The Art of Geometry Academy — at Phoenix Place, Lewes.
              </p>
              <blockquote className="m-0 pl-5 border-l-2 border-accent">
                <p className="font-display italic font-medium text-[15px] leading-[1.6] text-ink/95 m-0">
                  {ABOUT.academyQuote}
                </p>
              </blockquote>
            </Reveal>
            <Reveal as="figure" className="m-0 md:col-span-7">
              <img
                src={asset("/img/about/10-taga-classroom.jpg")}
                alt="A TAGA class in session"
                loading="lazy"
                className="w-full aspect-[4/3] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
              />
            </Reveal>
          </div>
        </section>

        {/* PALESTINE — image LEFT, text RIGHT */}
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-14 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
            <Reveal as="figure" className="m-0 md:col-span-7">
              <img
                src={asset("/img/about/07-az-zarqa-students.jpg")}
                alt="Stephen with children at the Az-Zarqa School for Palestinian Orphans and Refugees, Jordan"
                loading="lazy"
                className="w-full aspect-[4/3] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
              />
            </Reveal>
            <Reveal as="div" className="md:col-span-5">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                Az-Zarqa · Jordan
              </p>
              <h2 className="font-display font-bold italic tracking-[-0.025em] text-[clamp(28px,3.6vw,44px)] leading-[1.04] text-ink m-0 mb-6">
                Teaching geometry to children who'd lost everything
              </h2>
              <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.8] text-ink/90 m-0">
                {ABOUT.palestine}
              </p>
            </Reveal>
          </div>
        </section>

        {/* STUDENT LETTER — bold block, sans-serif body */}
        <section className="mx-auto max-w-[920px] px-6 md:px-10 py-20 md:py-28">
          <Reveal>
            <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4 text-center">
              To every student
            </p>
            <h2 className="font-display font-bold italic tracking-[-0.025em] text-[clamp(32px,4.4vw,56px)] leading-[1.02] text-ink m-0 mb-12 text-center">
              {ABOUT.studentsIntro}
            </h2>
          </Reveal>
          <Reveal>
            <blockquote className="m-0 p-8 md:p-12 bg-bg-soft ring-1 ring-white/10">
              <p className="font-sans font-medium text-[16px] md:text-[17px] leading-[1.85] text-ink m-0 mb-6">
                {ABOUT.studentsLetter}
              </p>
              <cite className="not-italic font-sans text-[10px] font-bold tracking-[0.36em] uppercase text-ink/65">
                — Stephen Meakin
              </cite>
            </blockquote>
          </Reveal>
        </section>

        {/* FINAL — TAGA pair + closing big image */}
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 pb-16">
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            <figure className="m-0">
              <img src={asset("/img/about/08-taga-group.jpg")} alt="A group at TAGA with their paintings" loading="lazy" className="w-full aspect-[4/3] object-cover shadow-[0_18px_44px_rgba(0,0,0,0.55)]" />
            </figure>
            <figure className="m-0">
              <img src={asset("/img/about/09-taga-studio.jpg")} alt="The TAGA drafting studio" loading="lazy" className="w-full aspect-[4/3] object-cover shadow-[0_18px_44px_rgba(0,0,0,0.55)]" />
            </figure>
          </Reveal>
          <Reveal as="figure" className="m-0">
            <img
              src={asset("/img/about/11-ophiuchus-painting.jpg")}
              alt="A painting on the studio floor"
              loading="lazy"
              className="w-full h-[60vh] md:h-[80vh] object-cover object-center shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
            />
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
};
