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
            animate={{ opacity: 0.45 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            className="painting-detail__ambient-img"
          />
        </AnimatePresence>
        <div className="painting-detail__ambient-veil" />
      </div>

      <div className="relative z-[1]">
        <Nav />

        <main className="mx-auto max-w-[1400px] px-6 md:px-10 lg:px-16 pt-8 pb-24 md:pb-32">
          <Link
            to="/collections"
            className="inline-flex items-center gap-2 mb-12 font-sans text-[10px] font-medium tracking-[0.32em] uppercase text-ink/55 transition-colors duration-300 hover:text-accent"
          >
            ← All collections
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-20 items-start">
            <Reveal as="div" className="lg:sticky lg:top-[100px]">
              <div className="aspect-square overflow-hidden bg-black/40 ring-1 ring-white/10 shadow-[0_28px_72px_rgba(0,0,0,0.55)]">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={selected.image}
                    src={asset(selected.image)}
                    alt={`${painting.title} — ${selected.name}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
                    className="w-full h-full object-cover"
                  />
                </AnimatePresence>
              </div>
            </Reveal>

            <Reveal as="article" delay={0.1} className="flex flex-col gap-6">
              {collection && <Badge variant="accent">{collection.title}</Badge>}

              <h1 className="font-display font-light italic tracking-[-0.02em] leading-[1.05] text-[clamp(36px,4.5vw,64px)] text-ink m-0">
                {painting.title}
              </h1>

              <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-[14px]">
                {painting.year !== "[ DATE ]" && (
                  <>
                    <dt className="font-sans text-[10px] font-medium tracking-[0.28em] uppercase text-ink/45 pt-1">Date</dt>
                    <dd className="m-0 text-ink">{painting.year}</dd>
                  </>
                )}
                {painting.size && (
                  <>
                    <dt className="font-sans text-[10px] font-medium tracking-[0.28em] uppercase text-ink/45 pt-1">Size</dt>
                    <dd className="m-0 text-ink">{painting.size}</dd>
                  </>
                )}
                {painting.location && (
                  <>
                    <dt className="font-sans text-[10px] font-medium tracking-[0.28em] uppercase text-ink/45 pt-1">Painted in</dt>
                    <dd className="m-0 text-ink">{painting.location}</dd>
                  </>
                )}
              </dl>

              {painting.artistQuote && (
                <blockquote className="my-4 pl-6 border-l-2 border-accent py-2">
                  <p className="font-display italic font-light text-[18px] leading-[1.65] text-ink m-0 mb-3">
                    &ldquo;{painting.artistQuote}&rdquo;
                  </p>
                  <cite className="not-italic font-sans text-[10px] font-medium tracking-[0.28em] uppercase text-ink/55">
                    — Stephen Meakin
                  </cite>
                </blockquote>
              )}

              <div className="flex flex-col gap-4 font-sans font-light text-[17px] leading-[1.85] text-ink/85">
                {painting.description.split("\n\n").map((para, i) => (
                  <p key={i} className="m-0">{para}</p>
                ))}
              </div>

              <Separator className="bg-white/10 mt-6" />

              <div className="pt-2">
                <p className="font-sans text-[10px] font-medium tracking-[0.28em] uppercase text-ink/45 m-0 mb-3">
                  Original Print
                </p>
                <p className="font-sans font-light text-[15px] leading-[1.7] text-ink/85 m-0">
                  {ORIGINAL_PRINT_SPEC}
                </p>
              </div>

              <Separator className="bg-white/10" />

              <div className="pt-2">
                <p className="font-sans text-[10px] font-medium tracking-[0.28em] uppercase text-ink/45 m-0 mb-3">
                  {hasAlternateColourways ? "Colourways" : "Original colourway"}
                </p>

                {hasAlternateColourways && (
                  <p className="font-display italic font-light text-[15px] leading-[1.6] text-ink/80 m-0 mb-5">
                    {COLOURWAY_NOTE}
                  </p>
                )}

                {hasAlternateColourways && (
                  <div role="radiogroup" aria-label="Colourway" className="flex flex-wrap gap-3 mb-5">
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
                            "w-8 h-8 rounded-full cursor-pointer transition-all duration-300",
                            isSelected
                              ? "ring-2 ring-ink ring-offset-2 ring-offset-bg"
                              : "ring-1 ring-white/15 hover:ring-white/40",
                          )}
                          style={{ backgroundColor: c.hex }}
                        />
                      );
                    })}
                  </div>
                )}

                <p className="font-display italic font-light text-[22px] text-ink m-0">
                  {selected.name}
                  {selected.isOriginal && (
                    <span className="not-italic ml-3 font-sans text-[10px] font-medium tracking-[0.28em] uppercase text-accent">
                      · original
                    </span>
                  )}
                </p>
              </div>
            </Reveal>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};
