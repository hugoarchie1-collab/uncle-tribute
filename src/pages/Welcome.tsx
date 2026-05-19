import { VideoIntro } from "../components/VideoIntro";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { WELCOME } from "../data/content";
import { usePageTitle } from "../lib/usePageTitle";

/**
 * Homepage. Scroll-trigger video intro, then the verbatim Welcome text
 * from the source PDF: opening quote, the "Stephen Meakin said this not
 * to disorient…" paragraph, the passing-date line, "In Steve's own words…",
 * the bio paragraphs (SEM intro, Sacred Geometry / four-traditions, Arista
 * SunStar / Farmacy). Nothing added.
 */
export const Welcome = () => {
  usePageTitle();

  return (
    <>
      <VideoIntro />

      <div id="welcome-anchor" className="welcome-page">
        <Nav />

        <main className="welcome-main">
          <section className="welcome-hero">
            <blockquote className="welcome-quote">
              <p>{WELCOME.openingQuote}</p>
              <cite>— {WELCOME.openingAttribution}</cite>
            </blockquote>
          </section>

          <section className="welcome-body">
            <p className="welcome-paragraph">{WELCOME.reminder}</p>

            <p className="welcome-passing">{WELCOME.passingNote}</p>

            <p className="welcome-invocation">{WELCOME.invocation}</p>

            {WELCOME.bio.map((para, i) => (
              <p key={i} className="welcome-paragraph">
                {para}
              </p>
            ))}
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};
