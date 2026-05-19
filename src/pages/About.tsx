import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { ABOUT } from "../data/content";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

/**
 * About / Biography page.
 *
 * Strict rule for this page: every line of text comes from PDF 3/3,
 * verbatim. No invented headings, eyebrows, taglines, or figcaptions.
 * Photographs (from the user's source bundle) are placed contextually
 * between the passages they belong to, without captions.
 */
export const About = () => {
  usePageTitle("Stephen Meakin");

  return (
    <div className="about-page">
      <Nav />
      <main className="about-main">
        {/* Section 1 — opening lines from PDF */}
        <section className="about-section about-section--opening">
          {ABOUT.opening.map((p, i) => (
            <p key={i} className="about-paragraph">{p}</p>
          ))}
        </section>

        <figure className="about-figure">
          <img
            src={asset("/img/about/portrait-stephen.jpg")}
            alt="Stephen Meakin"
            loading="eager"
          />
        </figure>

        {/* Section 2 — early life and the long biographical run */}
        <section className="about-section">
          {ABOUT.earlyLife.map((p, i) => (
            <p key={i} className="about-paragraph">{p}</p>
          ))}
        </section>

        <figure className="about-figure">
          <img
            src={asset("/img/about/studio-interior.jpg")}
            alt="Stephen's studio at Phoenix Place, Lewes"
            loading="lazy"
          />
        </figure>

        {/* Section 3 — Anegada 1995, in Stephen's own words */}
        <section className="about-section about-section--anegada">
          {ABOUT.anegada.map((p, i) => (
            <blockquote key={i} className="anegada-quote">
              <p>{p}</p>
            </blockquote>
          ))}
        </section>

        <figure className="about-figure">
          <img
            src={asset("/img/about/hand-painting-wild-rose.jpg")}
            alt="Stephen painting the Mandala of Wild Rose"
            loading="lazy"
          />
        </figure>

        <figure className="about-figure">
          <img
            src={asset("/img/about/stephen-painting-action.jpg")}
            alt="Stephen at the canvas"
            loading="lazy"
          />
        </figure>

        {/* Section 4 — Phoenix Place, exhibitions and legacy */}
        <section className="about-section">
          {ABOUT.legacy.map((p, i) => (
            <p key={i} className="about-paragraph">{p}</p>
          ))}
        </section>

        {/* The three named commissions get one image each, no captions */}
        <div className="about-trio">
          <figure className="about-figure about-figure--in-grid">
            <img
              src={asset("/img/about/mystic-rose-flyer.jpg")}
              alt="The Mystic Rose exhibition, Majlis Gallery"
              loading="lazy"
            />
          </figure>
          <figure className="about-figure about-figure--in-grid">
            <img
              src={asset("/img/about/force-india-design.jpg")}
              alt="Sahara Force India sacred geometry design"
              loading="lazy"
            />
          </figure>
          <figure className="about-figure about-figure--in-grid">
            <img
              src={asset("/img/about/tree-of-wellbeing.jpg")}
              alt="The Tree of Wellbeing mandala"
              loading="lazy"
            />
          </figure>
        </div>

        {/* The academy quote */}
        <blockquote className="about-pullquote">
          <p>{ABOUT.academyQuote}</p>
        </blockquote>

        <div className="about-duo">
          <figure className="about-figure about-figure--in-duo">
            <img
              src={asset("/img/about/taga-classroom.jpg")}
              alt="A TAGA class at Phoenix Place, Lewes"
              loading="lazy"
            />
          </figure>
          <figure className="about-figure about-figure--in-duo">
            <img
              src={asset("/img/about/taga-classroom-2.jpg")}
              alt="A TAGA class at Phoenix Place, Lewes"
              loading="lazy"
            />
          </figure>
        </div>

        <figure className="about-figure">
          <img
            src={asset("/img/about/taga-students.jpg")}
            alt="TAGA students with Stephen"
            loading="lazy"
          />
        </figure>

        {/* Section 5 — Palestine teaching */}
        <section className="about-section">
          <p className="about-paragraph">{ABOUT.palestine}</p>
        </section>

        <figure className="about-figure">
          <img
            src={asset("/img/about/az-zarqa-students.jpg")}
            alt="Children at the Az-Zarqa School for Palestinian Orphans and Refugees, Jordan"
            loading="lazy"
          />
        </figure>

        <figure className="about-figure">
          <img
            src={asset("/img/about/stephen-on-cairn.jpg")}
            alt="Stephen"
            loading="lazy"
          />
        </figure>

        {/* Section 6 — the letter to every student */}
        <section className="about-section about-section--letter">
          <p className="about-paragraph">{ABOUT.studentsIntro}</p>
          <blockquote className="students-letter">
            <p>{ABOUT.studentsLetter}</p>
            <cite>— Stephen Meakin</cite>
          </blockquote>
        </section>

        <figure className="about-figure about-figure--final">
          <img
            src={asset("/img/about/studio-paintings.jpg")}
            alt="Mandalas in the studio"
            loading="lazy"
          />
        </figure>
      </main>

      <Footer />
    </div>
  );
};
