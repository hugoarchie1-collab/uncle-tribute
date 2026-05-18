import { Nav } from "../components/Nav";
import { ABOUT } from "../data/content";

export const About = () => (
  <div className="about-page">
    <Nav light />
    <main className="about-main">
      <header className="about-hero">
        <h1 className="about-title">Stephen Meakin</h1>
        <p className="about-tagline">
          <em>SEM</em> · Mandala artist · 1966 — present
        </p>
      </header>

      <figure className="about-portrait">
        <img src="/img/branding/stephen-portrait.jpg" alt="Stephen Meakin with his work" />
      </figure>

      <section className="about-section">
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

      <figure className="about-figure">
        <img src="/img/branding/stephen-hand-painting.jpg" alt="Stephen painting the Mandala of Wild Rose" />
        <figcaption>Painting the Mandala of Wild Rose.</figcaption>
      </figure>

      <section className="about-section about-section--anegada">
        <h2 className="about-section__heading">Anegada, 1995 — in Stephen's own words</h2>
        {ABOUT.anegada.map((p, i) => (
          <blockquote key={i} className="anegada-quote">
            <p>{p}</p>
          </blockquote>
        ))}
      </section>

      <section className="about-section">
        <h2 className="about-section__heading">Lewes, Phoenix Place &amp; legacy</h2>
        {ABOUT.legacy.map((p, i) => (
          <p key={i} className="about-paragraph">{p}</p>
        ))}

        <blockquote className="about-pullquote">
          <p>{ABOUT.academyQuote}</p>
        </blockquote>

        <p className="about-paragraph">{ABOUT.palestine}</p>
      </section>

      <section className="about-section about-section--letter">
        <h2 className="about-section__heading">A letter to every student who passed through his door</h2>
        <p className="about-paragraph">{ABOUT.studentsIntro}</p>
        <blockquote className="students-letter">
          <p>{ABOUT.studentsLetter}</p>
          <cite>— Stephen Meakin</cite>
        </blockquote>
      </section>
    </main>
  </div>
);
