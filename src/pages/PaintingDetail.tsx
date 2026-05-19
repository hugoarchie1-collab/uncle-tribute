import { useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { COLLECTIONS, getPaintingById } from "../data/paintings";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";

export const PaintingDetail = () => {
  const { id } = useParams();
  const painting = id ? getPaintingById(id) : undefined;

  usePageTitle(painting?.title);

  const availableColourways = useMemo(
    () => painting?.colourways.filter((c) => c.available) ?? [],
    [painting],
  );

  const initialColourway = availableColourways.find((c) => c.isOriginal) ?? availableColourways[0];
  const [selectedName, setSelectedName] = useState<string | undefined>(initialColourway?.name);

  if (!painting) return <Navigate to="/collections" replace />;

  const selected = availableColourways.find((c) => c.name === selectedName) ?? initialColourway;
  const collection = COLLECTIONS.find((c) => c.id === painting.collection);

  if (!selected) return <Navigate to="/collections" replace />;

  // Aggregate "do any colourways have any [TBD] details to show?"
  const hasAcquireInfo = Boolean(
    selected.sizing || selected.framing || selected.price || selected.editionSize,
  );

  return (
    <div className="painting-detail">
      <Nav />
      <main className="painting-detail__main">
        <Link to="/collections" className="back-link">
          ← All collections
        </Link>

        <div className="painting-detail__layout">
          <div className="painting-detail__hero">
            <img
              key={selected.image}
              src={asset(selected.image)}
              alt={`${painting.title} — ${selected.name}`}
              className="painting-detail__image"
            />
          </div>

          <aside className="painting-detail__sidebar">
            <div className="painting-detail__crumb">{collection?.title}</div>
            <h1 className="painting-detail__title">{painting.title}</h1>
            <div className="painting-detail__meta">
              {painting.year !== "[ DATE ]" && <span>{painting.year}</span>}
              {painting.location && <span> · {painting.location}</span>}
            </div>

            {availableColourways.length > 1 && (
              <div className="colourway-selector" role="radiogroup" aria-label="Colourway">
                {availableColourways.map((c) => {
                  const isSelected = c.name === selected.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={c.name}
                      title={c.name}
                      onClick={() => setSelectedName(c.name)}
                      className={`swatch ${isSelected ? "swatch--selected" : ""}`}
                      style={{ backgroundColor: c.hex }}
                    />
                  );
                })}
              </div>
            )}

            <div className="painting-detail__colourway-name">
              <em>{selected.name}</em>
              {selected.isOriginal && <span className="original-tag"> · original</span>}
            </div>

            {painting.artistQuote && (
              <blockquote className="painting-detail__quote">
                <p>&ldquo;{painting.artistQuote}&rdquo;</p>
                <cite>— Stephen Meakin</cite>
              </blockquote>
            )}

            <div className="painting-detail__description">
              {painting.description.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {selected.colourwayNote && (
              <div className="colourway-note">
                <h3>About this colourway</h3>
                <p>{selected.colourwayNote}</p>
              </div>
            )}

            <section className="acquire">
              <h3>Acquire this print</h3>
              {hasAcquireInfo ? (
                <dl className="acquire-grid">
                  {selected.sizing && (
                    <>
                      <dt>Size</dt>
                      <dd>{selected.sizing}</dd>
                    </>
                  )}
                  {selected.framing && (
                    <>
                      <dt>Framing</dt>
                      <dd>{selected.framing}</dd>
                    </>
                  )}
                  {selected.editionSize && (
                    <>
                      <dt>Edition</dt>
                      <dd>{selected.editionSize}</dd>
                    </>
                  )}
                  {selected.price && (
                    <>
                      <dt>Price</dt>
                      <dd>{selected.price}</dd>
                    </>
                  )}
                </dl>
              ) : (
                <p className="acquire-tbd">
                  Sizing, framing and pricing details coming soon. For enquiries please contact the studio.
                </p>
              )}
              <a
                className="acquire-enquire"
                href={`mailto:enquiries@example.com?subject=${encodeURIComponent(`Print enquiry: ${painting.title} — ${selected.name}`)}`}
              >
                Enquire about this print
              </a>
            </section>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};
