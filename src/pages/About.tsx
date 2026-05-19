import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { ABOUT } from "../data/content";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

/**
 * About / Biography page.
 *
 * Every paragraph is verbatim from PDF 3/3.
 * Every photograph from the user's bundle is placed contextually
 * between the passages it belongs to.
 * Captions use "(n/a)" placeholders — fill these in (or remove them)
 * by editing the figcaption text below.
 */
const CAPTION_TBD = "(n/a)";

export const About = () => {
  usePageTitle("Stephen Meakin");

  return (
    <div className="about-page">
      <Nav />
      <main className="about-main">
        {/* Section 1 — opening lines from PDF 3/3 */}
        <section className="about-section about-section--opening">
          {ABOUT.opening.map((p, i) => (
            <p key={i} className="about-paragraph">{p}</p>
          ))}
        </section>

        <figure className="about-figure">
          <img src={asset("/img/about/portrait-stephen.jpg")} alt="Stephen Meakin" loading="eager" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        <figure className="about-figure">
          <img src={asset("/img/about/stephen-portrait-2.jpg")} alt="Stephen Meakin" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        {/* Section 2 — biographical run */}
        <section className="about-section">
          {ABOUT.earlyLife.map((p, i) => (
            <p key={i} className="about-paragraph">{p}</p>
          ))}
        </section>

        <figure className="about-figure">
          <img src={asset("/img/about/studio-interior.jpg")} alt="Stephen's studio at Phoenix Place, Lewes" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        <figure className="about-figure">
          <img src={asset("/img/about/studio-with-easel.jpg")} alt="The studio" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
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
          <img src={asset("/img/about/stephen-on-cairn.jpg")} alt="Stephen" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        <figure className="about-figure">
          <img src={asset("/img/about/hand-painting-wild-rose.jpg")} alt="Stephen painting the Mandala of Wild Rose" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        <figure className="about-figure">
          <img src={asset("/img/about/stephen-painting-action.jpg")} alt="Stephen at the canvas" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        <div className="about-duo">
          <figure className="about-figure about-figure--in-duo">
            <img src={asset("/img/about/at-canvas.jpg")} alt="Stephen at the canvas" loading="lazy" />
            <figcaption>{CAPTION_TBD}</figcaption>
          </figure>
          <figure className="about-figure about-figure--in-duo">
            <img src={asset("/img/about/at-canvas-2.jpg")} alt="Stephen at the canvas" loading="lazy" />
            <figcaption>{CAPTION_TBD}</figcaption>
          </figure>
        </div>

        <div className="about-trio">
          <figure className="about-figure about-figure--in-grid">
            <img src={asset("/img/about/at-desk-1.jpg")} alt="Stephen at the drafting desk" loading="lazy" />
            <figcaption>{CAPTION_TBD}</figcaption>
          </figure>
          <figure className="about-figure about-figure--in-grid">
            <img src={asset("/img/about/at-desk-2.jpg")} alt="Stephen at the drafting desk" loading="lazy" />
            <figcaption>{CAPTION_TBD}</figcaption>
          </figure>
          <figure className="about-figure about-figure--in-grid">
            <img src={asset("/img/about/at-desk-3.jpg")} alt="Stephen at the drafting desk" loading="lazy" />
            <figcaption>{CAPTION_TBD}</figcaption>
          </figure>
        </div>

        <figure className="about-figure">
          <img src={asset("/img/about/stephen-at-table.jpg")} alt="Stephen at work" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        {/* Section 4 — Phoenix Place, exhibitions and legacy */}
        <section className="about-section">
          {ABOUT.legacy.map((p, i) => (
            <p key={i} className="about-paragraph">{p}</p>
          ))}
        </section>

        <div className="about-trio">
          <figure className="about-figure about-figure--in-grid">
            <img src={asset("/img/about/mystic-rose-flyer.jpg")} alt="The Mystic Rose exhibition, Majlis Gallery, Dubai" loading="lazy" />
            <figcaption>{CAPTION_TBD}</figcaption>
          </figure>
          <figure className="about-figure about-figure--in-grid">
            <img src={asset("/img/about/force-india-design.jpg")} alt="Sahara Force India sacred geometry design" loading="lazy" />
            <figcaption>{CAPTION_TBD}</figcaption>
          </figure>
          <figure className="about-figure about-figure--in-grid">
            <img src={asset("/img/about/tree-of-wellbeing.jpg")} alt="The Tree of Wellbeing mandala" loading="lazy" />
            <figcaption>{CAPTION_TBD}</figcaption>
          </figure>
        </div>

        <div className="about-trio">
          <figure className="about-figure about-figure--in-grid">
            <img src={asset("/img/about/gallery-bastakiya.jpg")} alt="Gallery interior" loading="lazy" />
            <figcaption>{CAPTION_TBD}</figcaption>
          </figure>
          <figure className="about-figure about-figure--in-grid">
            <img src={asset("/img/about/gallery-interior.jpg")} alt="Gallery interior" loading="lazy" />
            <figcaption>{CAPTION_TBD}</figcaption>
          </figure>
          <figure className="about-figure about-figure--in-grid">
            <img src={asset("/img/about/gallery-interior-2.jpg")} alt="Gallery interior" loading="lazy" />
            <figcaption>{CAPTION_TBD}</figcaption>
          </figure>
        </div>

        <figure className="about-figure">
          <img src={asset("/img/about/gallery-show.jpg")} alt="Stephen at a gallery show" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        <figure className="about-figure">
          <img src={asset("/img/about/stephen-gallery-show.jpg")} alt="Stephen at a gallery show" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        {/* The academy quote */}
        <blockquote className="about-pullquote">
          <p>{ABOUT.academyQuote}</p>
        </blockquote>

        <div className="about-trio">
          <figure className="about-figure about-figure--in-grid">
            <img src={asset("/img/about/taga-classroom.jpg")} alt="A TAGA class at Phoenix Place, Lewes" loading="lazy" />
            <figcaption>{CAPTION_TBD}</figcaption>
          </figure>
          <figure className="about-figure about-figure--in-grid">
            <img src={asset("/img/about/taga-classroom-2.jpg")} alt="A TAGA class at Phoenix Place, Lewes" loading="lazy" />
            <figcaption>{CAPTION_TBD}</figcaption>
          </figure>
          <figure className="about-figure about-figure--in-grid">
            <img src={asset("/img/about/taga-classroom-3.jpg")} alt="A TAGA class at Phoenix Place, Lewes" loading="lazy" />
            <figcaption>{CAPTION_TBD}</figcaption>
          </figure>
        </div>

        <figure className="about-figure">
          <img src={asset("/img/about/taga-students.jpg")} alt="TAGA students with Stephen" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        {/* Section 5 — Palestine teaching */}
        <section className="about-section">
          <p className="about-paragraph">{ABOUT.palestine}</p>
        </section>

        <figure className="about-figure">
          <img src={asset("/img/about/az-zarqa-students.jpg")} alt="Children at the Az-Zarqa School for Palestinian Orphans and Refugees, Jordan" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        {/* Section 6 — the letter to every student */}
        <section className="about-section about-section--letter">
          <p className="about-paragraph">{ABOUT.studentsIntro}</p>
          <blockquote className="students-letter">
            <p>{ABOUT.studentsLetter}</p>
            <cite>— Stephen Meakin</cite>
          </blockquote>
        </section>

        <figure className="about-figure">
          <img src={asset("/img/about/setup-shot.jpg")} alt="In the studio" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        <figure className="about-figure">
          <img src={asset("/img/about/studio-with-painting.jpg")} alt="In the studio" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        <figure className="about-figure">
          <img src={asset("/img/about/studio-final-wall.jpg")} alt="A wall of mandalas in the studio" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>

        <figure className="about-figure about-figure--final">
          <img src={asset("/img/about/studio-paintings.jpg")} alt="Mandalas in the studio" loading="lazy" />
          <figcaption>{CAPTION_TBD}</figcaption>
        </figure>
      </main>

      <Footer />
    </div>
  );
};
