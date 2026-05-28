import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import {
  COLLECTIONS,
  ESTATE_AUTHENTICATION,
  EMBELLISHMENT_NOTE,
  getAnchorTier,
  getPaintingById,
  getPrintTiers,
  ORIGINAL_PRINT_SPEC,
  ORIGINAL_PROVENANCE,
  COLOURWAY_NOTE,
  formatGBP,
  type Colourway,
  type Painting,
  type PrintTier,
} from "../data/paintings";
import { asset, webp } from "../lib/asset";
import { cn } from "../lib/cn";
import { addItem } from "../lib/basket";
import { Seo } from "../components/Seo";
import { SITE_URL, absoluteUrl, firstSentence } from "../lib/seo";

/* =============================================================================
 * TYPE SCALE — Painting Detail page (canonical; propagate site-wide later)
 * -----------------------------------------------------------------------------
 * Hugo's note: "the type looks messy — too many different fonts." This page
 * now uses ONE tight scale. Anything not on this list shouldn't appear.
 *
 *   DISPLAY (font-display, Playfair) — used in EXACTLY two places:
 *     · Painting title (h1):  font-display font-bold tracking-[-0.04em]
 *                             text-[clamp(34px,4.4vw,52px)]
 *     · Price (the £ figure):  font-display font-bold tracking-[-0.02em]
 *                             text-[clamp(30px,3.4vw,40px)]
 *     (+ ONE deliberate exception: the artist quote, italic Playfair — a
 *      voice moment, see QUOTE below. Nothing else is big Playfair.)
 *
 *   EYEBROW (one treatment everywhere — "Order a print", "Colourways",
 *            "Add-ons", "Original print", collection-back link, section labels):
 *       font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-ink/55
 *     · A tighter micro variant (only where space is cramped — tier-card and
 *       fact labels) keeps the SAME size/weight, only the tracking eases:
 *       font-sans text-[11px] font-bold tracking-[0.22em] uppercase text-ink/55
 *
 *   BODY (font-sans, Inter):
 *     · Long-form description:  text-[16px] md:text-[17px] leading-[1.75]
 *     · Meta / spec / facts:    text-[13.5px] leading-[1.6]   (one value weight)
 *
 *   QUOTE (the one allowed extra display treatment — deliberate voice):
 *       font-display italic text-[clamp(18px,1.9vw,22px)] leading-[1.45]
 *
 *   CTA buttons:  font-sans text-[11px] font-bold tracking-[0.18em] uppercase
 * ========================================================================== */

const EYEBROW = "font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-ink/55";
const EYEBROW_TIGHT = "font-sans text-[11px] font-bold tracking-[0.22em] uppercase text-ink/55";
const META = "font-sans text-[13.5px] leading-[1.6] text-ink/70";

/**
 * SizePicker — the standard print tiers as radio cards. One-off tiers
 * (`isOneOff: true`) are NEVER rendered here; they're handed to OneOffCard
 * below the grid. In the narrow right column the cards stack one-per-row so
 * label / size / edition / price stay readable without squeezing.
 */
const SizePicker = ({
  tiers,
  selectedTier,
  onSelectTier,
}: {
  tiers: PrintTier[];
  selectedTier: PrintTier;
  onSelectTier: (id: PrintTier["id"]) => void;
}) => (
  <div role="radiogroup" aria-label="Print size" className="grid grid-cols-1 gap-2.5">
    {tiers.map((tier) => {
      const isSelected = tier.id === selectedTier.id;
      return (
        <button
          key={tier.id}
          type="button"
          role="radio"
          aria-checked={isSelected}
          onClick={() => onSelectTier(tier.id)}
          className={cn(
            "relative grid grid-cols-[1fr_auto] items-center gap-x-4 text-left bg-transparent border-0 px-4 py-3.5 cursor-pointer transition-all duration-300 ring-1",
            isSelected
              ? "ring-ink shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
              : "ring-white/15 hover:ring-white/40",
          )}
        >
          {tier.isAnchor && (
            <span
              aria-hidden="true"
              className="absolute -top-2 left-4 inline-flex items-center bg-bg px-2 py-0.5 font-sans text-[11px] font-bold tracking-[0.22em] uppercase text-accent rounded-full ring-1 ring-accent/40"
            >
              Most chosen
            </span>
          )}
          <span className="min-w-0">
            <span className={cn(EYEBROW_TIGHT, "block mb-1")}>{tier.label}</span>
            <span className="block font-sans text-[15px] font-medium leading-[1.25] text-ink">
              {tier.size}
            </span>
            <span className={cn(META, "block mt-0.5")}>{tier.editionLabel}</span>
          </span>
          <span className="font-display font-bold tracking-[-0.01em] text-[18px] text-ink justify-self-end">
            {formatGBP(tier.pricePence).replace(".00", "")}
          </span>
        </button>
      );
    })}
  </div>
);

/**
 * OneOffCard — the singular hand-painted piece (`isOneOff: true`). Rendered as
 * a distinct full-width feature card BELOW the size grid, never as a size
 * radio. Selecting it routes through the same `selectedTierId` state so
 * Add-to-basket / Buy-now carry the one-off id; the add-ons hide while it's
 * selected (a unique original isn't an add-on candidate). Defensive: the
 * caller only mounts this when such a tier actually exists.
 */
const OneOffCard = ({
  tier,
  isSelected,
  onSelect,
}: {
  tier: PrintTier;
  isSelected: boolean;
  onSelect: (id: PrintTier["id"]) => void;
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={isSelected}
    onClick={() => onSelect(tier.id)}
    className={cn(
      "relative w-full text-left bg-transparent p-5 cursor-pointer transition-all duration-300 ring-1",
      isSelected
        ? "ring-accent shadow-[0_4px_22px_rgba(0,0,0,0.4)]"
        : "ring-accent/35 hover:ring-accent/70",
    )}
  >
    <span className="flex items-baseline justify-between gap-4 mb-2">
      <span className="font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-accent">
        Unique · one of one
      </span>
      <span className="font-display font-bold tracking-[-0.01em] text-[20px] text-ink whitespace-nowrap">
        {formatGBP(tier.pricePence).replace(".00", "")}
      </span>
    </span>
    <span className="block font-sans text-[15px] font-medium leading-[1.3] text-ink mb-1">
      {tier.label}
    </span>
    <span className={cn(META, "block mb-1.5")}>{tier.size}</span>
    <span className={cn(META, "block")}>
      A singular work, hand-painted in Stephen&rsquo;s geometric tradition.
      Once it is taken, it is gone — there is only this one.
    </span>
  </button>
);

/**
 * Colourways — swatch row (hover-revealed name) + selected name caption.
 * Placed HIGH in the buy box (just under the size picker) so the buyer
 * reaches it without scrolling through the story. Single-colourway paintings
 * render a static swatch so the section keeps its shape.
 */
const Colourways = ({
  availableColourways,
  selected,
  onSelect,
}: {
  availableColourways: Colourway[];
  selected: Colourway;
  onSelect: (name: string) => void;
}) => {
  const hasAlternates = availableColourways.length > 1;
  return (
    <div>
      <p className={cn(EYEBROW, "m-0 mb-3")}>
        {hasAlternates ? `Colourways · ${availableColourways.length}` : "Original colourway"}
      </p>

      {hasAlternates && (
        <p className={cn(META, "m-0 mb-4")}>{COLOURWAY_NOTE}</p>
      )}

      {hasAlternates ? (
        <div role="radiogroup" aria-label="Colourway" className="flex flex-wrap gap-3.5 mb-4">
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
                onClick={() => onSelect(c.name)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                className={cn(
                  // `group` lets the sibling name caption respond to hover
                  // without an extra wrapper element.
                  "group relative block w-11 h-11 rounded-full cursor-pointer border-0 p-0 transition-shadow duration-300",
                  isSelected
                    ? "ring-2 ring-ink ring-offset-2 ring-offset-bg shadow-[0_6px_22px_rgba(0,0,0,0.55)]"
                    : "ring-1 ring-white/25 hover:ring-white/55 shadow-[0_3px_14px_rgba(0,0,0,0.4)]",
                )}
                style={{ background: c.hex, backgroundColor: c.hex }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-9 whitespace-nowrap bg-bg px-2.5 py-1 font-sans text-[11px] font-bold tracking-[0.18em] uppercase text-ink rounded-full ring-1 ring-white/10 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
                >
                  {c.name}
                </span>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div aria-hidden="true" className="flex mb-4">
          <span
            className="block w-11 h-11 rounded-full ring-1 ring-white/25 shadow-[0_3px_14px_rgba(0,0,0,0.4)]"
            style={{ background: selected.hex, backgroundColor: selected.hex }}
          />
        </div>
      )}

      <p className="font-sans text-[15px] font-medium text-ink m-0">
        {selected.name}
        {selected.isOriginal && (
          <span className="ml-3 font-sans text-[11px] font-bold tracking-[0.3em] uppercase text-accent">
            · original
          </span>
        )}
      </p>
    </div>
  );
};

/**
 * BuyBox — the right-hand purchase column (desktop) / first content block
 * (mobile). Order: title → facts → price → size picker → one-off card →
 * colourways → add-ons → CTAs → authentication + shipping. Holds the
 * `#order-print` anchor + the order sentinel so the StickyAddBar's
 * IntersectionObserver still works.
 *
 * Add-ons (framing + hand-finishing) are hidden when the selected tier is the
 * one-off original — a unique hand-painted piece isn't an add-on candidate.
 */
const BuyBox = ({
  painting,
  collection,
  availableColourways,
  selected,
  onSelectColourway,
  sizeTiers,
  oneOffTier,
  selectedTier,
  onSelectTier,
  framing,
  embellished,
  onFramingChange,
  onEmbellishedChange,
  orderSentinelRef,
}: {
  painting: Painting;
  collection?: { id: string; title: string };
  availableColourways: Colourway[];
  selected: Colourway;
  onSelectColourway: (name: string) => void;
  sizeTiers: PrintTier[];
  oneOffTier?: PrintTier;
  selectedTier: PrintTier;
  onSelectTier: (id: PrintTier["id"]) => void;
  framing: boolean;
  embellished: boolean;
  onFramingChange: (next: boolean) => void;
  onEmbellishedChange: (next: boolean) => void;
  orderSentinelRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  // The confirmation pill records *which* selection was last added + when.
  // Switching painting/colourway/tier silently invalidates a stale one.
  const [addedFor, setAddedFor] = useState<{
    paintingId: string;
    colourway: string;
    tierId: PrintTier["id"];
    at: number;
  } | null>(null);
  const fadeTimerRef = useRef<number | null>(null);

  const isOneOffSelected = selectedTier.isOneOff === true;
  const framingOffered =
    !isOneOffSelected && typeof selectedTier.framingPricePence === "number";
  const embellishOffered =
    !isOneOffSelected && typeof selectedTier.embellishmentPricePence === "number";
  // Add-ons only make sense on a multiple (framed / hand-finished print).
  const showAddOns = !isOneOffSelected;
  // Add-on prices read from the selected tier so they can never drift from
  // the data source (gotcha #9 — pricing must not be hand-typed).
  const framingPriceLabel =
    typeof selectedTier.framingPricePence === "number"
      ? formatGBP(selectedTier.framingPricePence).replace(".00", "")
      : null;
  const embellishPriceLabel =
    typeof selectedTier.embellishmentPricePence === "number"
      ? formatGBP(selectedTier.embellishmentPricePence).replace(".00", "")
      : null;

  const showAdded =
    addedFor !== null &&
    addedFor.paintingId === painting.id &&
    addedFor.colourway === selected.name &&
    addedFor.tierId === selectedTier.id;

  useEffect(() => () => {
    if (fadeTimerRef.current !== null) window.clearTimeout(fadeTimerRef.current);
  }, []);

  const onAdd = () => {
    addItem(
      painting.id,
      selected.name,
      selectedTier.id,
      framingOffered && framing,
      embellishOffered && embellished,
    );
    const stamp = Date.now();
    setAddedFor({
      paintingId: painting.id,
      colourway: selected.name,
      tierId: selectedTier.id,
      at: stamp,
    });
    if (fadeTimerRef.current !== null) window.clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = window.setTimeout(() => {
      setAddedFor((current) => (current?.at === stamp ? null : current));
      fadeTimerRef.current = null;
    }, 2500);
  };

  const onBuyNow = async () => {
    setStatus("loading");
    setErrorMsg("");
    // 15s ceiling so the button can never hang forever (the prior gotcha #3
    // symptom).
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paintingId: painting.id,
          colourwayName: selected.name,
          tierId: selectedTier.id,
          framing: framingOffered && framing,
          embellished: embellishOffered && embellished,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setStatus("error");
        setErrorMsg(body.error ?? "Couldn't start checkout. Please try again.");
        return;
      }
      window.location.href = body.url;
    } catch (err) {
      clearTimeout(timeoutId);
      setStatus("error");
      if (err instanceof Error && err.name === "AbortError") {
        setErrorMsg("Checkout took too long. Please try again.");
      } else {
        setErrorMsg("Network error. Please try again.");
      }
    }
  };

  return (
    <div className="flex flex-col">
      {/* 1 · COLLECTION BADGE + TITLE (h1) */}
      {collection && (
        <div className="mb-4">
          <Badge variant="accent">{collection.title}</Badge>
        </div>
      )}
      <h1 className="font-display font-bold tracking-[-0.04em] leading-[1.04] text-[clamp(34px,4.4vw,52px)] text-ink m-0 mb-5">
        {painting.title}
      </h1>

      {/* 2 · KEY FACTS — tight inline dl */}
      <dl className="grid grid-cols-[max-content_1fr] gap-x-5 gap-y-1.5 m-0 mb-7">
        {painting.year !== "[ DATE ]" && (
          <>
            <dt className={cn(EYEBROW_TIGHT, "pt-px")}>Date</dt>
            <dd className="m-0 font-sans text-[13.5px] leading-[1.6] text-ink">{painting.year}</dd>
          </>
        )}
        {painting.size && (
          <>
            <dt className={cn(EYEBROW_TIGHT, "pt-px")}>Size</dt>
            <dd className="m-0 font-sans text-[13.5px] leading-[1.6] text-ink">{painting.size}</dd>
          </>
        )}
        {painting.location && (
          <>
            <dt className={cn(EYEBROW_TIGHT, "pt-px")}>Painted in</dt>
            <dd className="m-0 font-sans text-[13.5px] leading-[1.6] text-ink">{painting.location}</dd>
          </>
        )}
        <dt className={cn(EYEBROW_TIGHT, "pt-px")}>Original</dt>
        <dd className="m-0 font-sans text-[13.5px] leading-[1.6] text-ink/75">{ORIGINAL_PROVENANCE}</dd>
      </dl>

      <Separator className="bg-white/10 mb-6" />

      {/* #order-print anchor + sentinel — StickyAddBar's IntersectionObserver
          tracks this element, so it must stay with the buy controls. */}
      <div id="order-print" className="scroll-mt-24">
        <div ref={orderSentinelRef} aria-hidden="true" className="h-px w-full" />

        {/* 3 · PRICE (tracks the selected size tier) + eyebrow */}
        <p className={cn(EYEBROW, "m-0 mb-3")}>Order a print</p>
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 mb-6">
          <p className="font-display font-bold tracking-[-0.02em] text-[clamp(30px,3.4vw,40px)] text-ink m-0">
            {formatGBP(selectedTier.pricePence).replace(".00", "")}
          </p>
          <p className={cn(META, "m-0")}>
            {selectedTier.size}
          </p>
        </div>

        {/* 4 · SIZE PICKER — standard tiers only */}
        <SizePicker tiers={sizeTiers} selectedTier={selectedTier} onSelectTier={onSelectTier} />

        {/* One-off feature card — only when Percival ships an isOneOff tier. */}
        {oneOffTier && (
          <div className="mt-3">
            <OneOffCard
              tier={oneOffTier}
              isSelected={selectedTier.id === oneOffTier.id}
              onSelect={onSelectTier}
            />
          </div>
        )}

        {/* 5 · COLOURWAYS — high in the column, easy to reach */}
        <div className="mt-7">
          <Colourways
            availableColourways={availableColourways}
            selected={selected}
            onSelect={onSelectColourway}
          />
        </div>

        {/* 6 · ADD-ONS — hidden on the one-off original */}
        {showAddOns && (
          <fieldset className="border-0 p-0 m-0 mt-7 flex flex-col gap-2.5">
            <legend className={cn(EYEBROW, "m-0 mb-2 p-0")}>Add-ons</legend>
            <label
              className={cn(
                "flex items-start gap-3 ring-1 px-4 py-3 cursor-pointer transition-all duration-300",
                framingOffered
                  ? framing
                    ? "ring-ink"
                    : "ring-white/15 hover:ring-white/40"
                  : "ring-white/8 opacity-55 cursor-not-allowed",
              )}
            >
              <input
                type="checkbox"
                checked={framingOffered && framing}
                disabled={!framingOffered}
                onChange={(e) => onFramingChange(e.target.checked)}
                className="mt-1 h-4 w-4 accent-ink shrink-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <span className="flex flex-col gap-1 font-sans text-[13.5px] leading-[1.55] text-ink/85">
                <span>
                  <strong className="text-ink">Add a hand-made frame</strong>
                  {" "}— black-stained oak, cast acrylic glazing for safe transit.
                  {framingPriceLabel ? ` +${framingPriceLabel} for this size, plus a small framed-shipping surcharge at checkout. Allow 2 weeks.` : ""}
                </span>
                {!framingOffered && (
                  <span className="font-sans text-[13.5px] text-ink/50">
                    Framing offered on A2 and A1 sizes only.
                  </span>
                )}
              </span>
            </label>
            <label
              className={cn(
                "flex items-start gap-3 ring-1 px-4 py-3 cursor-pointer transition-all duration-300",
                embellishOffered
                  ? embellished
                    ? "ring-ink"
                    : "ring-white/15 hover:ring-white/40"
                  : "ring-white/8 opacity-55 cursor-not-allowed",
              )}
            >
              <input
                type="checkbox"
                checked={embellishOffered && embellished}
                disabled={!embellishOffered}
                onChange={(e) => onEmbellishedChange(e.target.checked)}
                className="mt-1 h-4 w-4 accent-ink shrink-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <span className="flex flex-col gap-1 font-sans text-[13.5px] leading-[1.55] text-ink/85">
                <span>
                  <strong className="text-ink">Hand-finished by Polly Wedge</strong>
                  {embellishPriceLabel ? ` — adds ${embellishPriceLabel} for this size. Allow 4 weeks.` : " — Allow 4 weeks."}
                </span>
                <span className="font-sans text-[13.5px] leading-[1.55] text-ink/55">
                  {EMBELLISHMENT_NOTE}
                </span>
                {!embellishOffered && (
                  <span className="font-sans text-[13.5px] text-ink/50">
                    Hand-finishing offered on A2 and A1 sizes only.
                  </span>
                )}
              </span>
            </label>
          </fieldset>
        )}

        {/* 7 · CTAs */}
        <div className="flex flex-wrap items-center gap-3 mt-7">
          <button
            type="button"
            onClick={onAdd}
            disabled={status === "loading"}
            className="inline-flex items-center bg-ink text-bg px-7 py-3.5 font-sans text-[11px] font-bold tracking-[0.18em] uppercase rounded-full hover:bg-accent hover:text-ink transition-colors disabled:opacity-60"
          >
            Add to basket
          </button>
          <button
            type="button"
            onClick={onBuyNow}
            disabled={status === "loading"}
            className="inline-flex items-center text-ink ring-1 ring-accent/70 px-7 py-3.5 font-sans text-[11px] font-bold tracking-[0.18em] uppercase rounded-full hover:ring-accent hover:text-accent transition-all disabled:opacity-60"
          >
            {status === "loading" ? "Opening checkout…" : "Buy now"}
            <span aria-hidden="true" className="ml-2">→</span>
          </button>
        </div>
        {/* Microcopy confirmation — fades after 2.5s. Reserve space + opacity
            transition so the layout below doesn't jump. */}
        <p
          aria-live="polite"
          className={cn(
            "mt-3 font-sans text-[13.5px] tracking-[0.04em] text-ink/65 m-0 transition-opacity duration-500",
            showAdded ? "opacity-100" : "opacity-0",
          )}
        >
          {showAdded ? (
            <>
              Added —{" "}
              <Link to="/basket" className="text-accent underline underline-offset-4 hover:text-ink transition-colors">
                view basket
              </Link>
            </>
          ) : (
            " "
          )}
        </p>
        {status === "error" && (
          <p className="mt-2 font-sans text-[13.5px] text-accent m-0">{errorMsg}</p>
        )}

        {/* 8 · AUTHENTICATION + SHIPPING — single source ESTATE_AUTHENTICATION */}
        <Separator className="bg-white/10 mt-7 mb-6" />
        <p className={cn(META, "m-0 mb-4")}>
          {ESTATE_AUTHENTICATION.stamp}
          <span className="text-accent/80 mx-2" aria-hidden="true">·</span>
          {ESTATE_AUTHENTICATION.numbering}
          <span className="text-accent/80 mx-2" aria-hidden="true">·</span>
          {ESTATE_AUTHENTICATION.coa}
        </p>
        <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
          <li className={cn(META, "m-0")}>{ESTATE_AUTHENTICATION.printer}</li>
          <li className={cn(META, "m-0")}>Ships in 7–10 working days</li>
          <li className={cn(META, "m-0")}>UK £15 · Europe £35 · Worldwide £60 (unframed)</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Story — the long-form content read AFTER the buy controls: the artist
 * quote (the one allowed display-italic moment), the full description, and
 * the original-print spec. Centred below the two-column hero region on
 * desktop; flows directly after the buy box on mobile.
 */
const Story = ({ painting }: { painting: Painting }) => (
  <div className="max-w-[720px] mx-auto">
    {painting.artistQuote && (
      <Reveal as="div">
        <blockquote className="m-0 pl-6 border-l-2 border-accent py-2">
          <p className="font-display italic text-[clamp(18px,1.9vw,22px)] leading-[1.45] text-ink m-0 mb-3">
            &ldquo;{painting.artistQuote}&rdquo;
          </p>
          <cite className={cn(EYEBROW, "not-italic")}>— Stephen Meakin</cite>
        </blockquote>
      </Reveal>
    )}

    <Reveal
      as="div"
      className="mt-12 md:mt-14 flex flex-col gap-5 font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/90"
    >
      {painting.description.split("\n\n").map((para, i) => (
        <p key={i} className="m-0">{para}</p>
      ))}
    </Reveal>

    <Reveal as="div" className="mt-12 md:mt-16">
      <Separator className="bg-white/10 mb-7" />
      <p className={cn(EYEBROW, "m-0 mb-4")}>Original print</p>
      <p className="font-sans font-normal text-[16px] leading-[1.75] text-ink/85 m-0">
        {ORIGINAL_PRINT_SPEC}
      </p>
    </Reveal>
  </div>
);

// ─── StickyAddBar ──────────────────────────────────────────────────────────
// Floating "Add to basket" bar. Becomes visible after the user scrolls past
// the hero sentinel AND before the order block reaches the viewport, so the
// affordance is present during the long-form reading stretch where the
// right-column buy box has scrolled away. Two IntersectionObserver sentinels
// do the detection without scroll-event polling.
const StickyAddBar = ({
  painting,
  selected,
  selectedTier,
  framing,
  embellished,
  heroSentinelRef,
  orderSentinelRef,
}: {
  painting: Painting;
  selected: Colourway;
  selectedTier: PrintTier;
  framing: boolean;
  embellished: boolean;
  heroSentinelRef: React.RefObject<HTMLDivElement | null>;
  orderSentinelRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const reduceMotion = useReducedMotion();
  const [pastHero, setPastHero] = useState(false);
  const [atOrder, setAtOrder] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const heroEl = heroSentinelRef.current;
    const orderEl = orderSentinelRef.current;
    if (!heroEl || !orderEl) return;

    const heroObs = new IntersectionObserver(
      ([entry]) => {
        // `boundingClientRect.top < 0` means the sentinel is above the
        // viewport (i.e. we've scrolled past it).
        setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    heroObs.observe(heroEl);

    const orderObs = new IntersectionObserver(
      ([entry]) => {
        setAtOrder(entry.isIntersecting);
      },
      // -10% bottom margin so the bar disappears slightly before the order
      // block reaches the floor of the viewport (looks tidier).
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );
    orderObs.observe(orderEl);

    return () => {
      heroObs.disconnect();
      orderObs.disconnect();
    };
  }, [heroSentinelRef, orderSentinelRef]);

  const visible = pastHero && !atOrder;

  const isOneOffSelected = selectedTier.isOneOff === true;
  const framingOffered =
    !isOneOffSelected && typeof selectedTier.framingPricePence === "number";
  const embellishOffered =
    !isOneOffSelected && typeof selectedTier.embellishmentPricePence === "number";
  const onAdd = useCallback(() => {
    addItem(
      painting.id,
      selected.name,
      selectedTier.id,
      framingOffered && framing,
      embellishOffered && embellished,
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  }, [
    painting.id,
    selected.name,
    selectedTier.id,
    framingOffered,
    framing,
    embellishOffered,
    embellished,
  ]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="sticky-add-bar"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
          className="fixed bottom-5 right-5 z-40 hidden md:flex items-center gap-4 bg-bg/95 backdrop-blur-md ring-1 ring-white/12 shadow-[0_18px_50px_rgba(0,0,0,0.55)] pl-3 pr-2 py-2 rounded-full"
          role="region"
          aria-label="Quick add to basket"
        >
          <span
            aria-hidden="true"
            className="block w-7 h-7 rounded-full ring-1 ring-white/20 shrink-0"
            style={{ background: selected.hex }}
          />
          <span className="flex flex-col leading-tight">
            <span className="font-sans text-[11px] font-bold tracking-[0.22em] uppercase text-ink/55">
              {selected.name}
            </span>
            <span className="font-display font-bold tracking-[-0.01em] text-[15px] text-ink">
              {formatGBP(selectedTier.pricePence).replace(".00", "")}
            </span>
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center bg-ink text-bg px-5 py-2.5 font-sans text-[11px] font-bold tracking-[0.18em] uppercase rounded-full hover:bg-accent hover:text-ink transition-colors whitespace-nowrap"
          >
            {added ? "Added ✓" : "Add to basket"}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── HeroLightbox ──────────────────────────────────────────────────────────
// Fullscreen overlay that shows the painting at native resolution against a
// dark backdrop. Esc + backdrop click both close it. Body scroll is locked
// while open. Mobile pinch-zoom is native inside the overlay.
const HeroLightbox = ({
  open,
  onClose,
  imageSrc,
  alt,
}: {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  alt: string;
}) => {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="hero-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/97 backdrop-blur-sm cursor-zoom-out p-4 md:p-10"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close (Esc)"
            className="absolute top-4 right-4 md:top-6 md:right-6 inline-flex items-center gap-2 font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-ink/70 hover:text-accent transition-colors duration-300 bg-bg/60 backdrop-blur-sm px-3 py-2 rounded-full ring-1 ring-white/10"
          >
            Close <span aria-hidden="true">· Esc</span>
          </button>
          <motion.picture
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.36, ease: [0.22, 0.61, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="block max-w-full max-h-full"
          >
            <source srcSet={webp(imageSrc)} type="image/webp" />
            <img
              src={imageSrc}
              alt={alt}
              className="max-w-full max-h-full object-contain block"
              draggable={false}
            />
          </motion.picture>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const PaintingDetail = () => {
  const { id } = useParams();
  const painting = id ? getPaintingById(id) : undefined;

  const availableColourways = useMemo(
    () => painting?.colourways.filter((c) => c.available) ?? [],
    [painting],
  );

  const initialColourway =
    availableColourways.find((c) => c.isOriginal) ?? availableColourways[0];
  const [selectedName, setSelectedName] = useState<string | undefined>(
    initialColourway?.name,
  );

  // Tier ladder + size picker selection. Always preselect the anchor.
  const visibleTiers = useMemo(
    () => (painting ? getPrintTiers(painting) : []),
    [painting],
  );
  // Split the ladder: standard size tiers feed the radio grid; a one-off tier
  // (Percival's optional `isOneOff: true` £950 piece) is rendered separately.
  // Defensive — if no one-off tier exists, oneOffTier is undefined and the
  // feature card never mounts.
  const sizeTiers = useMemo(
    () => visibleTiers.filter((t) => !t.isOneOff),
    [visibleTiers],
  );
  const oneOffTier = useMemo(
    () => visibleTiers.find((t) => t.isOneOff),
    [visibleTiers],
  );
  const anchorTier = useMemo(
    () => (painting ? getAnchorTier(painting) : undefined),
    [painting],
  );
  const [selectedTierId, setSelectedTierId] = useState<PrintTier["id"] | undefined>(
    anchorTier?.id,
  );

  // Add-on state — lives on the parent so the sticky add bar and the BuyBox
  // share one source of truth.
  const [framing, setFraming] = useState(false);
  const [embellished, setEmbellished] = useState(false);

  // Fullscreen lightbox state for the hero image.
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  // Sticky bar sentinels — see StickyAddBar.
  const heroSentinelRef = useRef<HTMLDivElement>(null);
  const orderSentinelRef = useRef<HTMLDivElement>(null);

  if (!painting) return <Navigate to="/collections" replace />;
  const selected =
    availableColourways.find((c) => c.name === selectedName) ?? initialColourway;
  const collection = COLLECTIONS.find((c) => c.id === painting.collection);
  if (!selected) return <Navigate to="/collections" replace />;
  if (!anchorTier) return <Navigate to="/collections" replace />;

  const selectedTier =
    visibleTiers.find((t) => t.id === selectedTierId) ?? anchorTier;

  // Price strip always reflects the anchor — size picker drives the buttons.
  const pricePence = anchorTier.pricePence;

  const scrollToOrder = () => {
    const el = document.getElementById("order-print");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ---- SEO: per-painting title / description / OG image + structured data --
  // OG image is the original-colourway cover so shares look canonical even
  // while the buyer has a different swatch selected on-page.
  const ogColourway =
    painting.colourways.find((c) => c.isOriginal) ?? painting.colourways[0];
  const metaDescription = firstSentence(painting.description);
  const paintingPath = `/collections/${painting.id}`;
  const ogImagePath = ogColourway?.image ?? selected.image;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: painting.title,
    image: absoluteUrl(ogImagePath),
    description: metaDescription,
    brand: { "@type": "Brand", name: "The Art of Stephen Meakin" },
    offers: {
      "@type": "Offer",
      price: (anchorTier.pricePence / 100).toFixed(2),
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(paintingPath),
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Collections",
        item: absoluteUrl("/collections"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: painting.title,
        item: absoluteUrl(paintingPath),
      },
    ],
  };

  return (
    <div className="relative overflow-hidden">
      <Seo
        title={painting.title}
        description={metaDescription}
        url={paintingPath}
        image={ogImagePath}
        type="product"
        jsonLd={[productJsonLd, breadcrumbJsonLd]}
      />
      {/* Ambient backdrop — selected colourway painting blurred behind the
          page. Crossfades seamlessly between colourways as the user switches
          swatches. (gotcha #8: page carries `isolate` below to keep this
          backdrop from being re-ordered into the foreground by transforms.) */}
      <div className="painting-detail__ambient" aria-hidden>
        <AnimatePresence mode="sync">
          <motion.div
            key={selected.image}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
            className="painting-detail__ambient-bg"
            style={{
              backgroundImage: `url("${asset(webp(selected.image))}")`,
            }}
          />
        </AnimatePresence>
        <div className="painting-detail__ambient-veil" />
      </div>

      <div className="relative z-[1] isolate">
        <Nav />

        <main className="mx-auto max-w-[1240px] px-4 md:px-8 lg:px-12 pt-6 pb-20 md:pb-28">
          {/* Back link + jump-to-order strip — price floor stays visible from
              the top; the CTA scrolls to the buy box rather than duplicating
              the purchase actions (basket flow is the single source of truth). */}
          <div className="flex items-center justify-between gap-4 mb-8 md:mb-10">
            <Link
              to={collection ? `/collections#collection-${collection.id}` : "/collections"}
              className={cn(EYEBROW, "inline-flex items-center gap-2 transition-colors duration-300 hover:text-accent")}
            >
              ← {collection?.title ?? "All collections"}
            </Link>
            <button
              type="button"
              onClick={scrollToOrder}
              className="inline-flex items-center gap-2 font-sans text-[11px] font-bold tracking-[0.18em] uppercase text-ink/75 hover:text-accent transition-colors duration-300 whitespace-nowrap lg:hidden"
              aria-label="Jump to print order options"
            >
              <span className="font-display font-bold tracking-[-0.01em] text-ink normal-case text-[14px]">
                {formatGBP(pricePence).replace(".00", "")}
              </span>
              <span aria-hidden="true" className="text-ink/35">·</span>
              <span>Order print</span>
              <span aria-hidden="true" className="ml-0.5">↓</span>
            </button>
          </div>

          {/* TWO-COLUMN HERO REGION — sticky image (left) + scrolling buy box
              (right) on lg+. On mobile this collapses to a single column:
              image first, then the buy box (so buyers reach the controls
              quickly, before the story). */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-10 lg:gap-14 xl:gap-20 items-start">
            {/* LEFT — painting image. Sticky on desktop so it stays in view
                while the buy box scrolls. Click opens the fullscreen lightbox. */}
            <div className="lg:sticky lg:top-[88px]">
              <Reveal>
                <div className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    aria-label={`View ${painting.title} fullscreen`}
                    className="block w-full bg-transparent border-0 p-0 cursor-zoom-in"
                  >
                    <AnimatePresence mode="wait">
                      <motion.picture
                        key={selected.image}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
                        className="block w-full"
                      >
                        <source srcSet={asset(webp(selected.image))} type="image/webp" />
                        <img
                          src={asset(selected.image)}
                          alt={`${painting.title} — ${selected.name}`}
                          className="w-full h-auto block"
                        />
                      </motion.picture>
                    </AnimatePresence>
                  </button>
                </div>
              </Reveal>
              {/* Sentinel below the hero — drives the sticky add bar's "user
                  has scrolled past the painting" detection. */}
              <div ref={heroSentinelRef} aria-hidden="true" className="h-px w-full" />
            </div>

            {/* RIGHT — the buy box. */}
            <Reveal as="div" delay={0.05}>
              <BuyBox
                painting={painting}
                collection={collection}
                availableColourways={availableColourways}
                selected={selected}
                onSelectColourway={setSelectedName}
                sizeTiers={sizeTiers}
                oneOffTier={oneOffTier}
                selectedTier={selectedTier}
                onSelectTier={setSelectedTierId}
                framing={framing}
                embellished={embellished}
                onFramingChange={setFraming}
                onEmbellishedChange={setEmbellished}
                orderSentinelRef={orderSentinelRef}
              />
            </Reveal>
          </div>

          {/* THE STORY — below the two-column region, centred. Read after the
              buyer has seen the price + options. */}
          <div className="mt-16 md:mt-24">
            <Separator className="bg-white/10 mb-12 md:mb-16 max-w-[720px] mx-auto" />
            <Story painting={painting} />
          </div>
        </main>
        <FooterCatalogue />
        <Footer />
      </div>

      {/* Sticky add-to-basket bar — fixed bottom-right while the reader is
          between the hero and the order block (e.g. deep in the story with the
          right-column buy box scrolled away). */}
      <StickyAddBar
        painting={painting}
        selected={selected}
        selectedTier={selectedTier}
        framing={framing}
        embellished={embellished}
        heroSentinelRef={heroSentinelRef}
        orderSentinelRef={orderSentinelRef}
      />

      {/* Fullscreen lightbox — opens when the hero is clicked. */}
      <HeroLightbox
        open={lightboxOpen}
        onClose={closeLightbox}
        imageSrc={asset(selected.image)}
        alt={`${painting.title} — ${selected.name}`}
      />
    </div>
  );
};
