import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { ABOUT } from "../data/content";
import { asset } from "../lib/asset";

/**
 * About / Biography page. Photographs are placed contextually beside the
 * passage they illustrate. Swap any image by replacing the file in
 * /public/img/about/ with the same filename — no code change needed.
 */
export const About = () => (
  <div className="about-page">
    <Nav />
    <main className="about-main">
      <header className="about-hero">
        <p className="about-eyebrow">In memoriam</p>
        <h1 className="about-title">Stephen Meakin</h1>
        <p className="about-tagline">
          <em>SEM</em> · Mandala artist &amp; Sacred Geometer · b. 1966
        </p>
      </header>

      <figure className="about-portrait">
        <img
          src={asset("/img/about/portrait-stephen.jpg")}
          alt="Stephen Meakin in his Phoenix Place studio, Lewes"
          loading="eager"
        />
      </figure>

      <section className="about-section about-section--opening">
        {ABOUT.opening.map((p, i) => (
          <p key={i} className="about-paragraph">{p}</p>
        ))}
      </section>

      <section className="about-section">
        <h2 className="about-section__heading">Early life and education</h2>
        {ABOUT.earlyLife.map((p, i) => (
          <p key={i} className="about-paragraph">{p}</p>
        ))}
      </section>

      <figure className="about-figure about-figure--wide">
        <img
          src={asset("/img/about/studio-interior.jpg")}
          alt="Stephen's Phoenix Place studio, with mandalas-in-progress, books and the drafting table"
          loading="lazy"
        />
        <figcaption>The Phoenix Place studio, Lewes — where the work was made.</figcaption>
      </figure>

      <section className="about-section about-section--anegada" aria-labelledby="anegada-heading">
        <h2 id="anegada-heading" className="about-section__heading">
          Anegada, 1995 — in Stephen's own words
        </h2>
        {ABOUT.anegada.map((p, i) => (
          <blockquote key={i} className="anegada-quote">
            <p>{p}</p>
          </blockquote>
        ))}
      </section>

      <figure className="about-figure about-figure--right">
        <img
          src={asset("/img/about/hand-painting-wild-rose.jpg")}
          alt="Stephen's hand painting the central rose of the Mandala of Wild Rose"
          loading="lazy"
        />
        <figcaption>Painting the Mandala of Wild Rose.</figcaption>
      </figure>

      <section className="about-section">
        <h2 className="about-section__heading">Lewes, Phoenix Place &amp; legacy</h2>
        {ABOUT.legacy.map((p, i) => (
          <p key={i} className="about-paragraph">{p}</p>
        ))}
      </section>

      <div className="about-duo">
        <figure className="about-figure about-figure--in-duo">
          <img
            src={asset("/img/about/force-india-design.jpg")}
            alt="Stephen's sacred geometry design for the Sahara Force India Formula 1 car, 2014"
            loading="lazy"
          />
          <figcaption>
            Sacred geometry for the Sahara Force India F1 hospitality suite, 2014.
          </figcaption>
        </figure>
        <figure className="about-figure about-figure--in-duo">
          <img
            src={asset("/img/about/tree-of-wellbeing.jpg")}
            alt="The Tree of Wellbeing mandala — Medicine Wheel fused with the Celtic Tree of Life"
            loading="lazy"
          />
          <figcaption>
            The Tree of Wellbeing — distributed to 1,200 UK hospices and hospitals.
          </figcaption>
        </figure>
      </div>

      <blockquote className="about-pullquote">
        <p>{ABOUT.academyQuote}</p>
        <cite>— On TAGA, the Art of Geometry Academy</cite>
      </blockquote>

      <div className="about-duo">
        <figure className="about-figure about-figure--in-duo">
          <img
            src={asset("/img/about/taga-classroom.jpg")}
            alt="A TAGA class in session at Phoenix Place, Lewes"
            loading="lazy"
          />
          <figcaption>A TAGA class — Phoenix Place, Lewes.</figcaption>
        </figure>
        <figure className="about-figure about-figure--in-duo">
          <img
            src={asset("/img/about/taga-students.jpg")}
            alt="A group of TAGA students with Stephen"
            loading="lazy"
          />
          <figcaption>Over 250 students passed through TAGA in its first nine years.</figcaption>
        </figure>
      </div>

      <section className="about-section">
        <p className="about-paragraph">{ABOUT.palestine}</p>
      </section>

      <figure className="about-figure about-figure--wide">
        <img
          src={asset("/img/about/az-zarqa-students.jpg")}
          alt="Children at the Az-Zarqa School for Palestinian Orphans and Refugees, Jordan, with Stephen and the geometric work they made together"
          loading="lazy"
        />
        <figcaption>
          The Az-Zarqa School for Palestinian Orphans and Refugees, Jordan.
        </figcaption>
      </figure>

      <section className="about-section about-section--letter" aria-labelledby="letter-heading">
        <h2 id="letter-heading" className="about-section__heading">
          A letter to every student who passed through his door
        </h2>
        <p className="about-paragraph">{ABOUT.studentsIntro}</p>
        <blockquote className="students-letter">
          <p>{ABOUT.studentsLetter}</p>
          <cite>— Stephen Meakin</cite>
        </blockquote>
      </section>

      <figure className="about-figure about-figure--wide about-figure--final">
        <img
          src={asset("/img/about/studio-paintings.jpg")}
          alt="A wall of Stephen's mandalas in the studio"
          loading="lazy"
        />
      </figure>
    </main>

    <Footer />
  </div>
);
