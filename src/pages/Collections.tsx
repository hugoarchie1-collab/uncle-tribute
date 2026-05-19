import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { CollectionBackdrop } from "../components/CollectionBackdrop";
import { COLLECTIONS, PAINTINGS } from "../data/paintings";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

export const Collections = () => {
  usePageTitle("The Collections");
  return (
    <div className="collections-page">
      <Nav />
      <main className="collections-main">
        {COLLECTIONS.map((coll) => {
          const items = PAINTINGS.filter((p) => p.collection === coll.id);
          return (
            <section
              key={coll.id}
              className={`collection-section collection-section--${coll.id}`}
            >
              {/* Full-section backdrop — spans the description AND the painting grid */}
              <CollectionBackdrop
                collectionId={coll.id}
                photoUrl={coll.backdropImage ? asset(coll.backdropImage) : undefined}
              />
              <div className="collection-section__scrim" aria-hidden="true" />

              <div className="collection-section__inner">
                <header className="collection-hero" data-reveal>
                  <div className="collection-hero__card">
                    <h2 className="collection-title">{coll.title}</h2>
                    <div className="collection-description">
                      {coll.description.split("\n\n").map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  </div>
                </header>

                <div className="painting-grid" data-reveal>
                  {items.map((painting) => {
                    const cover =
                      painting.colourways.find((c) => c.isOriginal) ??
                      painting.colourways[0];
                    return (
                      <Link
                        key={painting.id}
                        to={`/collections/${painting.id}`}
                        className="painting-tile"
                      >
                        <div className="painting-tile__image-wrap">
                          <img
                            src={asset(cover.image)}
                            alt={painting.title}
                            loading="lazy"
                          />
                        </div>
                        <div className="painting-tile__meta">
                          <div className="painting-tile__title">{painting.title}</div>
                          <div className="painting-tile__year">{painting.year}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </main>
      <Footer />
    </div>
  );
};
