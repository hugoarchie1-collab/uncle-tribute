import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { CollectionBackdrop } from "../components/CollectionBackdrop";
import { COLLECTIONS, PAINTINGS } from "../data/paintings";

export const Collections = () => (
  <div className="collections-page">
    <Nav light />
    <main className="collections-main">
      <header className="collections-hero">
        <h1 className="collections-title">The Collections</h1>
        <p className="collections-subtitle">
          Three bodies of work. Earth, water, sky.
        </p>
      </header>

      {COLLECTIONS.map((coll) => {
        const items = PAINTINGS.filter((p) => p.collection === coll.id);
        return (
          <section key={coll.id} className={`collection-section collection-section--${coll.id}`}>
            <div className="collection-hero">
              <CollectionBackdrop collectionId={coll.id} photoUrl={coll.backdropImage} />
              <div className="collection-hero__overlay" />
              <div className="collection-hero__content">
                <h2 className="collection-title">{coll.title}</h2>
                <div className="collection-description">
                  {coll.description.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="painting-grid">
              {items.map((painting) => {
                const cover = painting.colourways.find((c) => c.isOriginal) ?? painting.colourways[0];
                return (
                  <Link
                    key={painting.id}
                    to={`/collections/${painting.id}`}
                    className="painting-tile"
                  >
                    <div className="painting-tile__image-wrap">
                      <img src={cover.image} alt={painting.title} loading="lazy" />
                    </div>
                    <div className="painting-tile__meta">
                      <div className="painting-tile__title">{painting.title}</div>
                      <div className="painting-tile__year">{painting.year}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  </div>
);
