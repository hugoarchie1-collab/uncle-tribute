import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
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
        {/* HERO — Ovalen pattern: text LEFT, image RIGHT */}
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 pt-10 md:pt-16 pb-10 md:pb-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
            <Reveal as="div" className="md:col-span-6">
              <p className="font-sans text-[11px] font-bold tracking-[0.4em] uppercase text-accent m-0 mb-5">
                In memoriam · 1966 — {PASSING_DATE}
              </p>
              <h1 className="font-display font-bold tracking-[-0.04em] text-[clamp(56px,9vw,128px)] leading-[0.95] text-ink m-0 mb-6">
                Stephen<br />Meakin
              </h1>
              <p className="font-sans text-[12px] font-bold tracking-[0.28em] uppercase text-ink/75 m-0">
                SEM · Mandala Artist &amp; Sacred Geometer
              </p>
            </Reveal>
            <Reveal as="figure" className="m-0 md:col-span-6">
              <img
                src={asset("/img/about/01-stephen-at-gallery.jpg")}
                alt="Stephen Meakin"
                loading="eager"
                className="w-full aspect-[4/5] object-cover shadow-[0_28px_72px_rgba(0,0,0,0.6)]"
              />
            </Reveal>
          </div>
        </section>

        {/* OPENING — bold pull, 2-col bio body underneath */}
        <section className="mx-auto max-w-[1280px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
          <Reveal>
            <p className="font-display font-bold tracking-[-0.025em] text-[clamp(22px,2.4vw,30px)] leading-[1.4] text-ink m-0 mb-10 md:mb-14 max-w-[920px]">
              {ABOUT.opening[0]}
            </p>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
            <figure className="m-0 md:col-span-7">
              <img
                src={asset("/img/about/02-painting-table.jpg")}
                alt="Working on a mandala"
                loading="lazy"
                className="w-full aspect-[4/3] object-cover shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
              />
            </figure>
            <div className="md:col-span-5">
              <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/85 m-0">
                {ABOUT.opening[1]}
              </p>
            </div>
          </Reveal>
        </section>

        {/* EARLY LIFE — eyebrow + headline + 2-col bio (denser) */}
        <section className="mx-auto max-w-[1280px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
          <Reveal as="div" className="flex items-end justify-between mb-8 md:mb-12 flex-wrap gap-4">
            <div>
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                Early life · 1966 — 1999
              </p>
              <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(28px,3.8vw,52px)] leading-[1.02] text-ink m-0 max-w-[680px]">
                The geometry of all cultures.
              </h2>
            </div>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-2 gap-x-10 md:gap-x-14 gap-y-5">
            {ABOUT.earlyLife.map((p, i) => (
              <p key={i} className="font-sans font-normal text-[15.5px] leading-[1.75] text-ink/85 m-0">{p}</p>
            ))}
          </Reveal>
        </section>

        {/* CAIRN — full-bleed */}
        <Reveal as="figure" className="m-0 w-full">
          <img
            src={asset("/img/about/03-stephen-on-cairn.jpg")}
            alt="Stephen on a stone cairn"
            loading="lazy"
            className="w-full h-[60vh] md:h-[80vh] object-cover object-center"
          />
        </Reveal>

        {/* ANEGADA — quote chapter, light italic ONLY on the middle 'Art as Ritual' meditation */}
        <section className="mx-auto max-w-[1280px] px-4 md:px-8 lg:px-12 py-14 md:py-20">
          <Reveal as="div" className="text-center mb-10 md:mb-14">
            <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
              Anegada · 1995
            </p>
            <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(32px,4.4vw,60px)] leading-[1.0] text-ink m-0 max-w-[820px] mx-auto">
              Everything is connected.
            </h2>
          </Reveal>
          <Reveal as="div" className="max-w-[820px] mx-auto flex flex-col gap-7">
            {ABOUT.anegada.map((p, i) => (
              <p
                key={i}
                className={
                  i === 1
                    ? "font-serif italic font-medium text-[clamp(20px,2vw,26px)] leading-[1.55] text-ink m-0"
                    : "font-sans font-normal text-[16px] md:text-[17px] leading-[1.8] text-ink/90 m-0"
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
        <section className="mx-auto max-w-[1280px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
          <Reveal>
            <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
              Phoenix Place · Lewes
            </p>
            <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(28px,3.8vw,52px)] leading-[1.02] text-ink m-0 mb-10 max-w-[680px]">
              Commissions of consequence.
            </h2>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-2 gap-x-10 md:gap-x-14 gap-y-5 max-w-[1100px]">
            {ABOUT.legacy.map((p, i) => (
              <p key={i} className="font-sans font-normal text-[15.5px] leading-[1.75] text-ink/85 m-0">{p}</p>
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
                <div className="aspect-[3/4] overflow-hidden">
                  <img src={asset(item.src)} alt={item.alt} loading="lazy" className="w-full h-full object-cover" />
                </div>
                <figcaption className="p-5">
                  <p className="font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-accent m-0 mb-2">
                    Commission
                  </p>
                  <p className="font-sans font-bold text-[15px] tracking-tight text-ink m-0 leading-[1.25]">
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

        {/* TAGA — text LEFT, image RIGHT, with academy quote pull */}
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
            <Reveal as="div" className="md:col-span-5">
              <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
                TAGA · est. 2010
              </p>
              <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(28px,3.6vw,48px)] leading-[1.02] text-ink m-0 mb-6">
                The Art of Geometry Academy.
              </h2>
              <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.7] text-ink/85 m-0 mb-5">
                In 2010 he founded TAGA — The Art of Geometry Academy — at Phoenix Place, Lewes.
              </p>
              <blockquote className="m-0 pl-5 border-l-2 border-accent">
                <p className="font-serif italic font-medium text-[15px] leading-[1.6] text-ink/90 m-0">
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
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 py-10 md:py-14">
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
              <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(28px,3.6vw,46px)] leading-[1.02] text-ink m-0 mb-6">
                Teaching geometry to children who'd lost everything.
              </h2>
              <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/85 m-0">
                {ABOUT.palestine}
              </p>
            </Reveal>
          </div>
        </section>

        {/* STUDENT LETTER — bold block */}
        <section className="mx-auto max-w-[920px] px-6 md:px-10 py-14 md:py-20">
          <Reveal as="div" className="text-center mb-10">
            <p className="font-sans text-[11px] font-bold tracking-[0.36em] uppercase text-accent m-0 mb-4">
              To every student
            </p>
            <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(28px,3.6vw,48px)] leading-[1.02] text-ink m-0">
              {ABOUT.studentsIntro}
            </h2>
          </Reveal>
          <Reveal>
            <blockquote className="m-0 p-7 md:p-10 bg-bg-soft ring-1 ring-white/10">
              <p className="font-sans font-medium text-[16px] md:text-[17px] leading-[1.85] text-ink m-0 mb-5">
                {ABOUT.studentsLetter}
              </p>
              <cite className="not-italic font-sans text-[10px] font-bold tracking-[0.36em] uppercase text-ink/65">
                — Stephen Meakin
              </cite>
            </blockquote>
          </Reveal>
        </section>

        {/* TAGA studio + group pair */}
        <section className="mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12 pb-10 md:pb-14">
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
            <figure className="m-0">
              <img src={asset("/img/about/08-taga-group.jpg")} alt="A group at TAGA with their paintings" loading="lazy" className="w-full aspect-[4/3] object-cover shadow-[0_18px_44px_rgba(0,0,0,0.55)]" />
              <figcaption className="mt-3 font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-ink/40">{CAP}</figcaption>
            </figure>
            <figure className="m-0">
              <img src={asset("/img/about/09-taga-studio.jpg")} alt="The TAGA drafting studio" loading="lazy" className="w-full aspect-[4/3] object-cover shadow-[0_18px_44px_rgba(0,0,0,0.55)]" />
              <figcaption className="mt-3 font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-ink/40">{CAP}</figcaption>
            </figure>
          </Reveal>
        </section>

        {/* CLOSING — Ophiuchus painting, full-bleed */}
        <Reveal as="figure" className="m-0 w-full pb-12">
          <img
            src={asset("/img/about/11-ophiuchus-painting.jpg")}
            alt="A painting on the studio floor"
            loading="lazy"
            className="w-full h-[60vh] md:h-[80vh] object-cover object-center"
          />
        </Reveal>
      </main>
      <Footer />
    </div>
  );
};
