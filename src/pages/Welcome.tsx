import { Link } from "react-router-dom";
import { VideoIntro } from "../components/VideoIntro";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { WELCOME } from "../data/content";
import { PAINTINGS } from "../data/paintings";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

const CAPTION_TBD = "(n/a)";

/**
 * Welcome / Home page — restructured to a Hero + Featured Grid + Narrow
 * Narrative rhythm (Globe-Trotter / Luxora pattern), so the page no longer
 * reads like a vertical essay.
 *
 * Every line of PDF text is preserved. Every welcome image is preserved.
 * What changed: where they sit on the page and how they group up.
 */
export const Welcome = () => {
  usePageTitle();

  // Three featured paintings — bring the collection up onto the home page.
  const featuredIds = ["wild-rose", "peacock-minerva", "enneagon-swans"];
  const featured = featuredIds
    .map((id) => PAINTINGS.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <>
      <VideoIntro />

      <div id="welcome-anchor" className="welcome-page">
        <Nav />

        <main className="welcome-main">
          {/* ─── HERO — 2-column editorial: quote left, portrait right ─── */}
          <section className="welcome-hero welcome-hero--split" data-reveal>
            <blockquote className="welcome-quote">
              <p>{WELCOME.openingQuote}</p>
              <cite>— {WELCOME.openingAttribution}</cite>
            </blockquote>
            <figure className="welcome-hero__portrait">
              <img
                src={asset("/img/welcome/02-portrait-denim.jpg")}
                alt="Stephen Meakin"
                loading="eager"
              />
            </figure>
          </section>

          {/* ─── FEATURED COLLECTION — 3-painting grid on a cream card ─── */}
          <section className="welcome-featured" data-reveal>
            <div className="welcome-featured__grid">
              {featured.map((p) => {
                const cover =
                  p.colourways.find((c) => c.isOriginal) ?? p.colourways[0];
                return (
                  <Link
                    key={p.id}
                    to={`/collections/${p.id}`}
                    className="featured-card"
                  >
                    <div className="featured-card__image">
                      <img src={asset(cover.image)} alt={p.title} loading="lazy" />
                    </div>
                    <div className="featured-card__meta">
                      <span className="featured-card__title">{p.title}</span>
                      {p.year !== "[ DATE ]" && (
                        <span className="featured-card__year">{p.year}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ─── PASSING + INVOCATION — centred minimal strip ─── */}
          <section className="welcome-passing-band" data-reveal>
            <p className="welcome-paragraph welcome-paragraph--reminder">
              {WELCOME.reminder}
            </p>
            <p className="welcome-passing">{WELCOME.passingNote}</p>
            <p className="welcome-invocation">{WELCOME.invocation}</p>
          </section>

          {/* ─── NARROW NARRATIVE — bio with images at small / inline size ─── */}
          <section className="welcome-narrative" data-reveal>
            <p className="welcome-paragraph">{WELCOME.bio[0]}</p>

            <figure className="welcome-figure welcome-figure--inline" data-reveal>
              <img
                src={asset("/img/welcome/01-painting-wild-rose.jpg")}
                alt="Stephen at his drafting table"
                loading="lazy"
              />
              <figcaption>{CAPTION_TBD}</figcaption>
            </figure>

            <p className="welcome-paragraph">{WELCOME.bio[1]}</p>

            <figure className="welcome-figure welcome-figure--inline" data-reveal>
              <img
                src={asset("/img/welcome/03-painting-in-studio.jpg")}
                alt="Stephen painting in the studio"
                loading="lazy"
              />
              <figcaption>{CAPTION_TBD}</figcaption>
            </figure>

            <figure className="welcome-figure welcome-figure--inline" data-reveal>
              <img
                src={asset("/img/welcome/04-paintings-collection.jpg")}
                alt="A wall of Stephen's mandalas"
                loading="lazy"
              />
              <figcaption>{CAPTION_TBD}</figcaption>
            </figure>

            <p className="welcome-paragraph">{WELCOME.bio[2]}</p>
          </section>

          {/* ─── CLOSING — Arista SunStar gets its own wide moment ─── */}
          <figure className="welcome-figure welcome-figure--full" data-reveal>
            <img
              src={asset("/img/welcome/05-arista-sunstar.jpg")}
              alt="Stephen beside the 3.6-metre Arista SunStar at the Farmacy restaurant, Notting Hill"
              loading="lazy"
            />
            <figcaption>{CAPTION_TBD}</figcaption>
          </figure>
        </main>

        <Footer />
      </div>
    </>
  );
};
