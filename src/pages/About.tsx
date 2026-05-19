import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { ABOUT } from "../data/content";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

const CAPTION_TBD = "(n/a)";

const Figure = ({
  src,
  alt,
  caption = CAPTION_TBD,
  className = "",
  delay = 0,
  eager = false,
}: {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  delay?: number;
  eager?: boolean;
}) => (
  <Reveal as="figure" delay={delay} className={`m-0 my-12 mx-auto max-w-[1200px] px-6 md:px-10 ${className}`}>
    <img
      src={asset(src)}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      className="w-full shadow-liftLg ring-1 ring-white/5"
    />
    <figcaption className="mt-3 text-center font-sans text-[11px] font-medium tracking-widest uppercase text-ink/35">
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
        {/* Hero — name + small badge */}
        <Reveal as="section" className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-16 pt-24 md:pt-32 pb-12 text-center">
          <Badge variant="accent" className="mb-6">In memoriam</Badge>
          <h1 className="font-display font-bold tracking-tightest text-[clamp(48px,7vw,96px)] leading-[1.04] text-ink m-0">
            Stephen Meakin
          </h1>
          <p className="mt-5 font-sans text-[12px] font-medium tracking-widest uppercase text-ink/55 m-0">
            SEM · Mandala Artist & Sacred Geometer · b. 1966
          </p>
        </Reveal>

        {/* 1. Opening line */}
        <Reveal as="section" className="mx-auto max-w-[680px] px-6 md:px-10 py-12">
          <p className="font-sans font-light text-[18px] leading-loose text-ink/85 m-0">{ABOUT.opening[0]}</p>
        </Reveal>

        <Figure src="/img/about/01-stephen-at-gallery.jpg" alt="Stephen Meakin" eager />

        {/* 3. Artist statement */}
        <Reveal as="section" className="mx-auto max-w-[680px] px-6 md:px-10 py-12">
          <p className="font-sans font-light text-[18px] leading-loose text-ink/85 m-0">{ABOUT.opening[1]}</p>
        </Reveal>

        <Figure src="/img/about/02-painting-table.jpg" alt="Working on a mandala" />

        {/* 5. Biographical run */}
        <Reveal as="section" className="mx-auto max-w-[680px] px-6 md:px-10 py-12 flex flex-col gap-6">
          {ABOUT.earlyLife.map((p, i) => (
            <p key={i} className="font-sans font-light text-[18px] leading-loose text-ink/85 m-0">{p}</p>
          ))}
        </Reveal>

        {/* 7. Anegada quote — bracketed with rules */}
        <Reveal as="section" className="mx-auto max-w-[760px] px-6 md:px-10 my-16 py-12 border-y border-ink/15 flex flex-col gap-6">
          {ABOUT.anegada.map((p, i) => (
            <blockquote
              key={i}
              className="m-0 pl-6 border-l-2 border-accent bg-bg-soft/50 backdrop-blur-sm rounded-r-sm p-7 font-serif italic font-medium text-[18px] leading-loose text-ink"
            >
              <p className="m-0">{p}</p>
            </blockquote>
          ))}
        </Reveal>

        <Figure src="/img/about/03-stephen-on-cairn.jpg" alt="Stephen on a stone cairn" />

        <Separator className="bg-ink/15 max-w-[680px] mx-auto" />

        {/* Phoenix Place + commissions */}
        <Reveal as="section" className="mx-auto max-w-[680px] px-6 md:px-10 py-12 flex flex-col gap-6">
          {ABOUT.legacy.map((p, i) => (
            <p key={i} className="font-sans font-light text-[18px] leading-loose text-ink/85 m-0">{p}</p>
          ))}
        </Reveal>

        {/* Three commissions images */}
        <Figure src="/img/about/04-mystic-rose-flyer.jpg" alt="The Mystic Rose exhibition, Fairmont Dubai" />
        <Figure src="/img/about/05-force-india-layout.jpg" alt="Sahara Force India F1 mandala layout" />
        <Figure src="/img/about/06-force-india-final.jpg" alt="Sahara Force India F1 mandala — final design" />

        {/* TAGA + Academy quote */}
        <Reveal as="section" className="mx-auto max-w-[680px] px-6 md:px-10 py-12 flex flex-col gap-6">
          <p className="font-sans font-light text-[18px] leading-loose text-ink/85 m-0">
            In 2010 he founded TAGA — The Art of Geometry Academy — at Phoenix Place, Lewes.
          </p>
          <blockquote className="m-0 my-6 pl-6 border-l-2 border-ink/25 bg-bg-soft/40 rounded-r-sm p-7 font-serif italic text-[17px] leading-relaxed text-ink">
            <p className="m-0">{ABOUT.academyQuote}</p>
          </blockquote>
          <p className="font-sans font-light text-[18px] leading-loose text-ink/85 m-0">{ABOUT.palestine}</p>
        </Reveal>

        <Figure src="/img/about/07-az-zarqa-students.jpg" alt="Stephen with children at the Az-Zarqa School for Palestinian Orphans and Refugees, Jordan" />

        {/* Letter to every student */}
        <Reveal as="section" className="mx-auto max-w-[680px] px-6 md:px-10 py-12">
          <p className="font-sans font-light text-[18px] leading-loose text-ink/85 m-0 mb-6">
            {ABOUT.studentsIntro}
          </p>
          <blockquote className="m-0 p-10 bg-gradient-to-b from-bg-soft to-bg-elevated border border-line rounded-sm">
            <p className="font-serif italic text-[19px] leading-[1.85] text-ink m-0 mb-6">{ABOUT.studentsLetter}</p>
            <cite className="not-italic font-sans text-[11px] font-medium tracking-widest uppercase text-ink/55">
              — Stephen Meakin
            </cite>
          </blockquote>
        </Reveal>

        {/* Final images */}
        <Figure src="/img/about/08-taga-group.jpg" alt="A group at TAGA with their paintings" />
        <Figure src="/img/about/09-taga-studio.jpg" alt="The TAGA drafting studio" />
        <Figure src="/img/about/10-taga-classroom.jpg" alt="A TAGA class in session" />
        <Figure src="/img/about/11-ophiuchus-painting.jpg" alt="A painting on the studio floor" />
      </main>
      <Footer />
    </div>
  );
};
