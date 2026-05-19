import { useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import {
  COLLECTIONS,
  getPaintingById,
  ORIGINAL_PRINT_SPEC,
  COLOURWAY_NOTE,
} from "../data/paintings";
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

  const initialColourway =
    availableColourways.find((c) => c.isOriginal) ?? availableColourways[0];
  const [selectedName, setSelectedName] = useState<string | undefined>(
    initialColourway?.name,
  );

  if (!painting) return <Navigate to="/collections" replace />;

  const selected =
    availableColourways.find((c) => c.name === selectedName) ?? initialColourway;
  const collection = COLLECTIONS.find((c) => c.id === painting.collection);

  if (!selected) return <Navigate to="/collections" replace />;

  const hasAlternateColourways = availableColourways.length > 1;

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

            <dl className="painting-detail__specs">
              {painting.year !== "[ DATE ]" && (
                <>
                  <dt>Date</dt>
                  <dd>{painting.year}</dd>
                </>
              )}
              {painting.size && (
                <>
                  <dt>Size</dt>
                  <dd>{painting.size}</dd>
                </>
              )}
              {painting.location && (
                <>
                  <dt>Painted in</dt>
                  <dd>{painting.location}</dd>
                </>
              )}
            </dl>

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

            <div className="painting-detail__original-print">
              <p className="painting-detail__spec-label">Original Print</p>
              <p>{ORIGINAL_PRINT_SPEC}</p>
            </div>

            <div className="painting-detail__colourway-block">
              <p className="painting-detail__spec-label">
                {hasAlternateColourways ? "Colourways" : "Original colourway"}
              </p>

              {hasAlternateColourways && (
                <p className="painting-detail__colourway-note">{COLOURWAY_NOTE}</p>
              )}

              {hasAlternateColourways && (
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
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};
