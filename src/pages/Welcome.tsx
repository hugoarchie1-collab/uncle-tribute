import { VideoIntro } from "../components/VideoIntro";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { WELCOME } from "../data/content";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

/**
 * Welcome / Home page.
 *
 * Order is taken verbatim from "First Page - Welcome to The Mandala
 * Company" PDF — text passages and images interleaved exactly as the
 * PDF lays them out:
 *
 *   1.  Opening quote
 *   2.  Reminder paragraph
 *   3.  IMAGE — Stephen at his drafting table painting the Wild Rose
 *   4.  "Steve passed away in …."
 *   5.  IMAGE — Stephen portrait (denim shirt)
 *   6.  "In Steve's own words…" + SEM bio paragraph
 *   7.  IMAGE — Stephen painting in studio
 *   8.  Sacred Geometry / four-traditions paragraph
 *   9.  IMAGE — wall arrangement of paintings
 *  10.  Arista SunStar paragraph
 *  11.  IMAGE — Stephen beside the 3.6m Arista SunStar at Farmacy
 */
const CAPTION_TBD = "(n/a)";

export const Welcome = () => {
  usePageTitle();

  return (
    <>
      <VideoIntro />

      <div id="welcome-anchor" className="welcome-page">
        <Nav />

        <main className="welcome-main">
          <section className="welcome-hero" data-reveal>
            <blockquote className="welcome-quote">
              <p>{WELCOME.openingQuote}</p>
              <cite>— {WELCOME.openingAttribution}</cite>
            </blockquote>
          </section>

          <section className="welcome-body" data-reveal>
            <p className="welcome-paragraph">{WELCOME.reminder}</p>

            <figure className="welcome-figure" data-reveal>
              <img
                src={asset("/img/welcome/01-painting-wild-rose.jpg")}
                alt="Stephen at his drafting table"
                loading="lazy"
              />
              <figcaption>{CAPTION_TBD}</figcaption>
            </figure>

            <p className="welcome-passing">{WELCOME.passingNote}</p>

            <figure className="welcome-figure welcome-figure--portrait" data-reveal>
              <img
                src={asset("/img/welcome/02-portrait-denim.jpg")}
                alt="Stephen Meakin"
                loading="lazy"
              />
              <figcaption>{CAPTION_TBD}</figcaption>
            </figure>

            <p className="welcome-invocation">{WELCOME.invocation}</p>

            {/* WELCOME.bio is three paragraphs in PDF order:
                [0] SEM bio          → followed by image 3
                [1] Sacred Geometry  → followed by image 4
                [2] Arista SunStar   → followed by image 5
            */}
            <p className="welcome-paragraph">{WELCOME.bio[0]}</p>

            <figure className="welcome-figure" data-reveal>
              <img
                src={asset("/img/welcome/03-painting-in-studio.jpg")}
                alt="Stephen painting in the studio"
                loading="lazy"
              />
              <figcaption>{CAPTION_TBD}</figcaption>
            </figure>

            <p className="welcome-paragraph">{WELCOME.bio[1]}</p>

            <figure className="welcome-figure" data-reveal>
              <img
                src={asset("/img/welcome/04-paintings-collection.jpg")}
                alt="A wall of Stephen's mandalas"
                loading="lazy"
              />
              <figcaption>{CAPTION_TBD}</figcaption>
            </figure>

            <p className="welcome-paragraph">{WELCOME.bio[2]}</p>

            <figure className="welcome-figure" data-reveal>
              <img
                src={asset("/img/welcome/05-arista-sunstar.jpg")}
                alt="Stephen beside the 3.6-metre Arista SunStar at the Farmacy restaurant, Notting Hill"
                loading="lazy"
              />
              <figcaption>{CAPTION_TBD}</figcaption>
            </figure>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};
