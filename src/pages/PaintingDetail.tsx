import { useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import {
  COLLECTIONS,
  getPaintingById,
  ORIGINAL_PRINT_SPEC,
  COLOURWAY_NOTE,
} from "../data/paintings";
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";
import { cn } from "../lib/cn";

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
    <div className="relative isolate bg-bg overflow-hidden">
      {/* Ambient backdrop — selected colourway, blurred behind everything */}
      <div className="painting-detail__ambient" aria-hidden>
        <AnimatePresence mode="sync">
          <motion.img
            key={selected.image}
            src={asset(selected.image)}
            alt=""
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.65 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            className="painting-detail__ambient-img"
          />
        </AnimatePresence>
        <div className="painting-detail__ambient-veil" />
      </div>

      <div className="relative z-[1]">
        <Nav />

        <main className="mx-auto max-w-[820px] px-4 md:px-8 lg:px-12 pt-6 pb-20 md:pb-28">
          <Link
            to={collection ? `/collections#collection-${collection.id}` : "/collections"}
            className="inline-flex items-center gap-2 mb-10 font-sans text-[10px] font-bold tracking-[0.34em] uppercase text-ink/60 transition-colors duration-300 hover:text-accent"
          >
            ← {collection?.title ?? "All collections"}
          </Link>

          {/* HERO — painting image at its natural aspect ratio, centered, soft edges */}
          <Reveal>
            <div className="mx-auto max-w-[760px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)] soft-edge">
              <AnimatePresence mode="wait">
                <motion.img
                  key={selected.image}
                  src={asset(selected.image)}
                  alt={`${painting.title} — ${selected.name}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
                  className="w-full h-auto block"
                />
              </AnimatePresence>
            </div>
          </Reveal>

          {/* TITLE BLOCK — centered, immediately under the painting */}
          <Reveal as="div" className="mt-12 md:mt-16 text-center max-w-[680px] mx-auto">
            {collection && (
              <div className="flex justify-center mb-5">
                <Badge variant="accent">{collection.title}</Badge>
              </div>
            )}
            <h1 className="font-display font-bold tracking-[-0.04em] leading-[1.02] text-[clamp(32px,4.4vw,56px)] text-ink m-0 mb-6">
              {painting.title}
            </h1>

            <dl className="inline-grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-[14px] text-left">
              {painting.year !== "[ DATE ]" && (
                <>
                  <dt className="font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-ink/55 pt-1">Date</dt>
                  <dd className="m-0 text-ink">{painting.year}</dd>
                </>
              )}
              {painting.size && (
                <>
                  <dt className="font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-ink/55 pt-1">Size</dt>
                  <dd className="m-0 text-ink">{painting.size}</dd>
                </>
              )}
              {painting.location && (
                <>
                  <dt className="font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-ink/55 pt-1">Painted in</dt>
                  <dd className="m-0 text-ink">{painting.location}</dd>
                </>
              )}
            </dl>
          </Reveal>

          {/* ARTIST QUOTE — if present */}
          {painting.artistQuote && (
            <Reveal as="div" className="mt-12 md:mt-16 max-w-[640px] mx-auto">
              <blockquote className="m-0 pl-6 border-l-2 border-accent py-2 text-center">
                <p className="font-display font-semibold text-[clamp(18px,1.9vw,22px)] leading-[1.4] text-ink m-0 mb-3">
                  &ldquo;{painting.artistQuote}&rdquo;
                </p>
                <cite className="not-italic font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/60">
                  — Stephen Meakin
                </cite>
              </blockquote>
            </Reveal>
          )}

          {/* DESCRIPTION — main body */}
          <Reveal as="div" className="mt-12 md:mt-16 max-w-[640px] mx-auto flex flex-col gap-5 font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/90">
            {painting.description.split("\n\n").map((para, i) => (
              <p key={i} className="m-0">{para}</p>
            ))}
          </Reveal>

          {/* ORIGINAL PRINT SPEC */}
          <Reveal as="div" className="mt-14 md:mt-20 max-w-[640px] mx-auto">
            <Separator className="bg-white/10 mb-8" />
            <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/55 m-0 mb-4">
              Original Print
            </p>
            <p className="font-sans font-normal text-[15px] leading-[1.7] text-ink/85 m-0">
              {ORIGINAL_PRINT_SPEC}
            </p>
          </Reveal>

          {/* COLOURWAYS */}
          <Reveal as="div" className="mt-10 md:mt-14 max-w-[640px] mx-auto">
            <Separator className="bg-white/10 mb-8" />
            <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/55 m-0 mb-4">
              {hasAlternateColourways ? `Colourways · ${availableColourways.length}` : "Original colourway"}
            </p>

            {hasAlternateColourways && (
              <p className="font-display font-medium text-[15px] leading-[1.55] text-ink/85 m-0 mb-6">
                {COLOURWAY_NOTE}
              </p>
            )}

            {hasAlternateColourways && (
              <div role="radiogroup" aria-label="Colourway" className="flex flex-wrap gap-4 mb-6">
                {availableColourways.map((c) => {
                  const isSelected = c.name === selected.name;
                  return (
                    <motion.button
                      key={c.name}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={c.name}
                      title={c.name}
                      onClick={() => setSelectedName(c.name)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.94 }}
                      className={cn(
                        "block w-12 h-12 rounded-full cursor-pointer border-0 p-0 transition-shadow duration-300",
                        isSelected
                          ? "ring-2 ring-ink ring-offset-2 ring-offset-bg shadow-[0_6px_22px_rgba(0,0,0,0.55)]"
                          : "ring-1 ring-white/25 hover:ring-white/55 shadow-[0_3px_14px_rgba(0,0,0,0.4)]",
                      )}
                      style={{
                        background: c.hex,
                        backgroundColor: c.hex,
                      }}
                    />
                  );
                })}
              </div>
            )}

            <p className="font-display font-bold tracking-[-0.02em] text-[clamp(22px,2vw,28px)] text-ink m-0">
              {selected.name}
              {selected.isOriginal && (
                <span className="ml-3 font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-accent">
                  · original
                </span>
              )}
            </p>
          </Reveal>
        </main>
        <Footer />
      </div>
    </div>
  );
};
