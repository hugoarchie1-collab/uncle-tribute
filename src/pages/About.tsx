import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { ABOUT } from "../data/content";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

/**
 * About / Biography page.
 *
 * Order is taken verbatim from "Third Page - About the Artist" PDF —
 * every paragraph and every image placed exactly as the PDF lays them out:
 *
 *   1.  Opening lines ("Stephen Meakin knew things that were difficult to carry…")
 *   2.  IMAGE — Stephen standing beside a calligraphic painting at a gallery
 *   3.  Artist statement ("Stephen Meakin is best known for his large, vibrant…")
 *   4.  IMAGE — Stephen and an assistant working on a large mandala on a table
 *   5.  Biographical run (Staffordshire → Bournemouth → Mexico → Brighton → MA → 1999 first mandala)
 *   6.  Horizontal separator
 *   7.  Anegada / Art as Ritual / Floral Display quote (single long first-person passage)
 *   8.  IMAGE — Stephen on a stone cairn in the desert (Wadi Rum / Petra)
 *   9.  Horizontal separator
 *  10.  Phoenix Place + exhibitions / commissions paragraphs
 *  11.  IMAGE — "The Mystic Rose" Fairmont Dubai exhibition flyer
 *  12.  IMAGE — Sahara Force India F1 sacred-geometry layout sheet
 *  13.  IMAGE — Sahara Force India F1 final design
 *  14.  TAGA founding + Academy quote
 *  15.  Palestine paragraph
 *  16.  IMAGE — Stephen with Az-Zarqa children
 *  17.  Students-letter intro + the full letter
 *  18.  IMAGE — TAGA students with their paintings
 *  19.  IMAGE — TAGA drafting studio
 *  20.  IMAGE — TAGA class in session
 *  21.  IMAGE — A large painting on the studio floor (square Ophiuchus-style)
 */
const CAPTION_TBD = "(n/a)";

export const About = () => {
  usePageTitle("Stephen Meakin");

  return (
    <div className="about-page">
      <Nav />
      <main className="about-main">
        {/* 1. Opening */}
        <section className="about-section about-section--opening" data-reveal>
          <p className="about-paragraph">{ABOUT.opening[0]}</p>
        </section>

        {/* 2. Image */}
        <figure className="about-figure" data-reveal>
          <img src={asset("/img/about/01-stephen-at-gallery.jpg")} alt="Stephen Meakin" loading="eager" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        {/* 3. Artist statement */}
        <section className="about-section" data-reveal>
          <p className="about-paragraph">{ABOUT.opening[1]}</p>
        </section>

        {/* 4. Image */}
        <figure className="about-figure" data-reveal>
          <img src={asset("/img/about/02-painting-table.jpg")} alt="Working on a mandala" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        {/* 5. Biographical run */}
        <section className="about-section" data-reveal>
          {ABOUT.earlyLife.map((p, i) => (
            <p key={i} className="about-paragraph">{p}</p>
          ))}
        </section>

        {/* 6 + 7. Anegada quote — wrapped in a separator-bordered section to match the PDF's horizontal rules */}
        <section className="about-section about-section--anegada about-section--rules" data-reveal>
          {ABOUT.anegada.map((p, i) => (
            <blockquote key={i} className="anegada-quote">
              <p>{p}</p>
            </blockquote>
          ))}
        </section>

        {/* 8. Image */}
        <figure className="about-figure" data-reveal>
          <img src={asset("/img/about/03-stephen-on-cairn.jpg")} alt="Stephen on a stone cairn" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        {/* 9 + 10. Phoenix Place + exhibitions / commissions */}
        <section className="about-section about-section--rule-top" data-reveal>
          {ABOUT.legacy.map((p, i) => (
            <p key={i} className="about-paragraph">{p}</p>
          ))}
        </section>

        {/* 11–13. Three commissions images in order */}
        <figure className="about-figure" data-reveal>
          <img src={asset("/img/about/04-mystic-rose-flyer.jpg")} alt="The Mystic Rose exhibition, Fairmont Dubai" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        <figure className="about-figure" data-reveal>
          <img src={asset("/img/about/05-force-india-layout.jpg")} alt="Sahara Force India F1 mandala layout" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        <figure className="about-figure" data-reveal>
          <img src={asset("/img/about/06-force-india-final.jpg")} alt="Sahara Force India F1 mandala — final design" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        {/* 14. TAGA founding + Academy quote */}
        <section className="about-section" data-reveal>
          <p className="about-paragraph">
            In 2010 he founded TAGA — The Art of Geometry Academy — at Phoenix Place, Lewes.
          </p>
          <blockquote className="about-pullquote" data-reveal>
            <p>{ABOUT.academyQuote}</p>
          </blockquote>

          {/* 15. Palestine */}
          <p className="about-paragraph">{ABOUT.palestine}</p>
        </section>

        {/* 16. Image — Az-Zarqa */}
        <figure className="about-figure" data-reveal>
          <img src={asset("/img/about/07-az-zarqa-students.jpg")} alt="Stephen with children at the Az-Zarqa School for Palestinian Orphans and Refugees, Jordan" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        {/* 17. Students-letter intro + the letter */}
        <section className="about-section about-section--letter" data-reveal>
          <p className="about-paragraph">{ABOUT.studentsIntro}</p>
          <blockquote className="students-letter">
            <p>{ABOUT.studentsLetter}</p>
            <cite>— Stephen Meakin</cite>
          </blockquote>
        </section>

        {/* 18. Image */}
        <figure className="about-figure" data-reveal>
          <img src={asset("/img/about/08-taga-group.jpg")} alt="A group at TAGA with their paintings" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        {/* 19. Image */}
        <figure className="about-figure" data-reveal>
          <img src={asset("/img/about/09-taga-studio.jpg")} alt="The TAGA drafting studio" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        {/* 20. Image */}
        <figure className="about-figure" data-reveal>
          <img src={asset("/img/about/10-taga-classroom.jpg")} alt="A TAGA class in session" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        {/* 21. Final image */}
        <figure className="about-figure about-figure--final" data-reveal>
          <img src={asset("/img/about/11-ophiuchus-painting.jpg")} alt="A painting on the studio floor" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>
      </main>

      <Footer />
    </div>
  );
};
