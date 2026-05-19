import { Link } from "react-router-dom";
import { VideoIntro } from "../components/VideoIntro";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { WELCOME } from "../data/content";
import { PAINTINGS } from "../data/paintings";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

/**
 * Homepage. Scroll-trigger video intro, then the welcome content rises
 * underneath. Ends with a "Garden of geometry" featured-works grid that
 * links into the collections page.
 */
export const Welcome = () => {
  usePageTitle();

  // Six featured paintings for the home grid — easy to change here.
  const featuredIds = [
    "wild-rose",
    "english-bluebells",
    "orchis-7",
    "flower-of-life",
    "peacock-minerva",
    "enneagon-swans",
  ];
  const featured = featuredIds
    .map((id) => PAINTINGS.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

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

          <section className="welcome-garden" aria-labelledby="garden-heading">
            <header className="welcome-garden__header">
              <span className="welcome-garden__eyebrow">A garden of geometry</span>
              <h2 id="garden-heading" className="welcome-garden__title">
                Six paintings from a life's work
              </h2>
            </header>

            <div className="welcome-garden__grid">
              {featured.map((p) => {
                const cover =
                  p.colourways.find((c) => c.isOriginal) ?? p.colourways[0];
                return (
                  <Link
                    key={p.id}
                    to={`/collections/${p.id}`}
                    className="welcome-garden__tile"
                  >
                    <div className="welcome-garden__image-wrap">
                      <img src={asset(cover.image)} alt={p.title} loading="lazy" />
                    </div>
                    <div className="welcome-garden__meta">
                      <span className="welcome-garden__name">{p.title}</span>
                      {p.year !== "[ DATE ]" && (
                        <span className="welcome-garden__year">{p.year}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="welcome-garden__more">
              <Link to="/collections" className="cta-link">
                All ten paintings <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};
