import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { ABOUT, PASSING_DATE } from "../data/content";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

const CAP = "(n/a)";

const Figure = ({
  src,
  alt,
  caption = CAP,
  width = "max-w-[680px]",
  aspect = "aspect-[3/2]",
  eager = false,
}: {
  src: string;
  alt: string;
  caption?: string;
  width?: string;
  aspect?: string;
  eager?: boolean;
}) => (
  <Reveal as="figure" className={`m-0 my-10 md:my-14 mx-auto px-6 md:px-10 ${width}`}>
    <img
      src={asset(src)}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      className={`w-full ${aspect} object-cover ring-1 ring-white/8 shadow-[0_24px_60px_rgba(0,0,0,0.5)]`}
    />
    <figcaption className="mt-3 text-center font-sans text-[10px] font-medium tracking-[0.28em] uppercase text-ink/35">
      {caption}
    </figcaption>
  </Reveal>
);

export const About = () => {
  usePageTitle("Stephen Meakin");

  return (
    <div className="relative bg-bg">
      <Nav />
      <main>
        {/* Hero — name + dates */}
        <Reveal
          as="section"
          className="mx-auto max-w-[1100px] px-4 md:px-8 lg:px-12 pt-20 md:pt-28 pb-14 text-center"
        >
          <Badge variant="accent" className="mb-6">In memoriam</Badge>
          <h1 className="font-display font-semibold italic tracking-[-0.025em] text-[clamp(54px,8.4vw,116px)] leading-[1.0] text-ink m-0 text-balance">
            Stephen Meakin
          </h1>
          <p className="mt-6 font-display italic font-medium text-[clamp(18px,1.8vw,24px)] text-ink/85 m-0">
            1966 <span className="text-ink/40 px-2">—</span> {PASSING_DATE}
          </p>
          <p className="mt-3 font-sans text-[10px] font-semibold tracking-[0.34em] uppercase text-ink/60 m-0">
            SEM · Mandala Artist &amp; Sacred Geometer
          </p>
        </Reveal>

        {/* Opening — first paragraph */}
        <Reveal as="section" className="mx-auto max-w-[680px] px-6 md:px-10 py-8 md:py-10">
          <p className="font-sans font-normal text-[17px] md:text-[18px] leading-[1.8] text-ink/90 m-0">{ABOUT.opening[0]}</p>
        </Reveal>

        <Figure src="/img/about/01-stephen-at-gallery.jpg" alt="Stephen Meakin" width="max-w-[380px]" aspect="aspect-[3/4]" eager />

        {/* Artist statement */}
        <Reveal as="section" className="mx-auto max-w-[680px] px-6 md:px-10 py-8 md:py-10">
          <p className="font-sans font-normal text-[17px] md:text-[18px] leading-[1.8] text-ink/90 m-0">{ABOUT.opening[1]}</p>
        </Reveal>

        <Figure src="/img/about/02-painting-table.jpg" alt="Working on a mandala" width="max-w-[640px]" aspect="aspect-[3/2]" />

        {/* Biographical run */}
        <Reveal as="section" className="mx-auto max-w-[680px] px-6 md:px-10 py-8 md:py-10 flex flex-col gap-6">
          {ABOUT.earlyLife.map((p, i) => (
            <p key={i} className="font-sans font-normal text-[17px] md:text-[18px] leading-[1.8] text-ink/90 m-0">{p}</p>
          ))}
        </Reveal>

        {/* Anegada — three paragraphs, simple bracketed quote treatment */}
        <Reveal as="section" className="mx-auto max-w-[760px] px-6 md:px-10 my-16 md:my-24 py-12 border-y border-white/10 flex flex-col gap-8">
          <p className="font-sans text-[10px] font-medium tracking-[0.32em] uppercase text-accent m-0 text-center">
            Anegada, 1995
          </p>
          {ABOUT.anegada.map((p, i) => (
            <p
              key={i}
              className="font-display italic font-light text-[clamp(18px,1.7vw,21px)] leading-[1.65] text-ink/90 m-0"
            >
              {p}
            </p>
          ))}
        </Reveal>

        <Figure src="/img/about/03-stephen-on-cairn.jpg" alt="Stephen on a stone cairn" width="max-w-[460px]" aspect="aspect-[3/4]" />

        <Separator className="bg-white/10 max-w-[680px] mx-auto" />

        {/* Phoenix Place + commissions */}
        <Reveal as="section" className="mx-auto max-w-[680px] px-6 md:px-10 py-8 md:py-10 flex flex-col gap-6">
          {ABOUT.legacy.map((p, i) => (
            <p key={i} className="font-sans font-normal text-[17px] md:text-[18px] leading-[1.8] text-ink/90 m-0">{p}</p>
          ))}
        </Reveal>

        {/* Commissions images */}
        <Figure src="/img/about/04-mystic-rose-flyer.jpg" alt="The Mystic Rose exhibition, Fairmont Dubai" width="max-w-[400px]" aspect="aspect-[3/2]" />
        <Figure src="/img/about/05-force-india-layout.jpg" alt="Sahara Force India F1 mandala layout" width="max-w-[520px]" aspect="aspect-[3/2]" />
        <Figure src="/img/about/06-force-india-final.jpg" alt="Sahara Force India F1 mandala — final design" width="max-w-[520px]" aspect="aspect-[3/2]" />

        {/* TAGA + Academy quote */}
        <Reveal as="section" className="mx-auto max-w-[680px] px-6 md:px-10 py-8 md:py-10 flex flex-col gap-6">
          <p className="font-sans font-normal text-[17px] md:text-[18px] leading-[1.8] text-ink/90 m-0">
            In 2010 he founded TAGA — The Art of Geometry Academy — at Phoenix Place, Lewes.
          </p>
          <blockquote className="m-0 my-6 pl-6 border-l-2 border-ink/25 py-2 font-display italic font-light text-[17px] leading-[1.7] text-ink/90">
            <p className="m-0">{ABOUT.academyQuote}</p>
          </blockquote>
          <p className="font-sans font-normal text-[17px] md:text-[18px] leading-[1.8] text-ink/90 m-0">{ABOUT.palestine}</p>
        </Reveal>

        <Figure src="/img/about/07-az-zarqa-students.jpg" alt="Stephen with children at the Az-Zarqa School for Palestinian Orphans and Refugees, Jordan" width="max-w-[560px]" aspect="aspect-[3/2]" />

        {/* Letter to every student */}
        <Reveal as="section" className="mx-auto max-w-[720px] px-6 md:px-10 py-8 md:py-10">
          <p className="font-sans font-normal text-[17px] md:text-[18px] leading-[1.8] text-ink/90 m-0 mb-8 text-center">
            {ABOUT.studentsIntro}
          </p>
          <blockquote className="m-0 p-10 bg-bg-soft ring-1 ring-white/8">
            <p className="font-display italic font-light text-[18px] leading-[1.8] text-ink m-0 mb-6">{ABOUT.studentsLetter}</p>
            <cite className="not-italic font-sans text-[10px] font-medium tracking-[0.28em] uppercase text-ink/55">
              — Stephen Meakin
            </cite>
          </blockquote>
        </Reveal>

        {/* Final TAGA images */}
        <Figure src="/img/about/08-taga-group.jpg" alt="A group at TAGA with their paintings" width="max-w-[560px]" aspect="aspect-[3/2]" />
        <Figure src="/img/about/09-taga-studio.jpg" alt="The TAGA drafting studio" width="max-w-[460px]" aspect="aspect-[3/2]" />
        <Figure src="/img/about/10-taga-classroom.jpg" alt="A TAGA class in session" width="max-w-[560px]" aspect="aspect-[3/2]" />
        <Figure src="/img/about/11-ophiuchus-painting.jpg" alt="A painting on the studio floor" width="max-w-[440px]" aspect="aspect-[1/1]" />
      </main>
      <Footer />
    </div>
  );
};
