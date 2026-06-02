import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { AuthenticationCard } from "../components/AuthenticationCard";
import { ReassuranceRow } from "../components/ReassuranceRow";
import { ProvenancePanel } from "../components/ProvenancePanel";
import { CredentialsStrip } from "../components/CredentialsStrip";
import { DimensionChip } from "../components/DimensionChip";
import {
  COLLECTIONS,
  EMBELLISHMENT_NOTE,
  getAnchorTier,
  getPaintingById,
  getPrintTiers,
  ORIGINAL_PRINT_SPEC,
  ORIGINAL_PROVENANCE,
  COLOURWAY_NOTE,
  formatGBP,
  getColourwaySetBundle,
  parseSizeCm,
  type Colourway,
  type Painting,
  type PrintTier,
} from "../data/paintings";
import { asset, webp } from "../lib/asset";
import { cn } from "../lib/cn";
import { addItem } from "../lib/basket";
import {
  EYEBROW_MUTED,
  EYEBROW_TIGHT,
  META,
  TITLE,
} from "../components/ui/tokens";
import { Seo } from "../components/Seo";
import { SITE_URL, absoluteUrl, firstSentence } from "../lib/seo";

/* =============================================================================
 * MONOCHROME CTAs (#7) — local, accent-free button recipes.
 * -----------------------------------------------------------------------------
 * The shared BTN_PRIMARY / BTN_SECONDARY tokens resolve their hover to the
 * orange accent (bg-accent / ring-accent / text-accent). This product page is
 * strictly monochrome, so it uses these local ink-only variants instead of the
 * shared tokens — same geometry/typography, hover expressed as an ink wash, no
 * colour. (The shared tokens stay accent-toned for the rest of the site.)
 * ========================================================================== */
const BTN_PRIMARY =
  "inline-flex items-center justify-center bg-ink text-bg px-6 py-3.5 font-sans text-[11px] font-bold tracking-[0.16em] uppercase rounded-full transition-colors duration-300 hover:bg-ink/85 disabled:opacity-60";
const BTN_SECONDARY =
  "inline-flex items-center justify-center ring-1 ring-ink/30 text-ink px-6 py-3.5 font-sans text-[11px] font-bold tracking-[0.16em] uppercase rounded-full transition-all duration-300 hover:ring-ink/60";

/* =============================================================================
 * TYPE SCALE — Painting Detail page
 * -----------------------------------------------------------------------------
 * Conformed to the home design system. The recurring recipes
 * (EYEBROW_MUTED / EYEBROW_TIGHT / META / TITLE / BTN_*) are imported from
 * `components/ui/tokens.ts` — never re-typed here. Fonts are the two house
 * families only: `font-display` (Fraunces) for the title, price figure and the
 * one deliberate italic artist-quote voice moment; `font-sans` (Hanken
 * Grotesk) for everything else.
 *
 * MONOCHROME (#7): this product page carries NO coloured/orange/rust text.
 * Hierarchy is conveyed by SIZE / WEIGHT / LETTER-SPACING only, on exactly two
 * tones — `text-ink` (the one primary) and `text-ink-muted` (the one muted
 * secondary), with hairlines via `border-line` / `ring-line`. There is no
 * resting accent and no accent on hover anywhere on this page; the shared
 * accent-carrying EYEBROW token is therefore NOT used here (EYEBROW_MUTED is
 * the monochrome eyebrow). The "Most chosen" indicator is kept but rendered in
 * ink, not orange. Tier names render straight from the data layer — never
 * hardcoded.
 * ========================================================================== */

/* =============================================================================
 * FRAMED-SHIPPING SURCHARGE — DISPLAY MIRROR of api/checkout.ts
 * -----------------------------------------------------------------------------
 * DMCC (Digital Markets, Competition & Consumers Act 2024, Part 4) requires
 * that any unavoidable charge for the chosen configuration is shown UPFRONT, at
 * equal prominence, the MOMENT the buyer selects it — not first revealed at the
 * Stripe checkout. So the instant a frame is ticked we must state the framed-
 * shipping surcharge here on the product page.
 *
 * These figures MIRROR `buildShippingOptions` in api/checkout.ts (the server is
 * the source of truth — gotcha #9). If the surcharge basis changes there, change
 * it here too. Read directly from that function on 2026-05-31:
 *   UK base £15;  framed A2 +£15 / framed A1 +£25
 *   EU base £35;  framed surcharge DOUBLES vs UK
 *   WW base £60;  framed surcharge DOUBLES vs UK
 * Glazing is cast acrylic, so one shipping band per region (no "with glass" tier).
 * ========================================================================== */
const SHIP_BASE_PENCE = { uk: 1500, eu: 3500, ww: 6000 } as const;
/** Per-framed-item UK surcharge by tier (pence). EU/WW double this. A3/A0/Studio = 0. */
const FRAMED_UK_SURCHARGE_PENCE: Partial<Record<PrintTier["id"], number>> = {
  collector: 1500, // A2 framed +£15
  "atelier-grande": 2500, // A1 framed +£25
};

/**
 * The framed-shipping totals (per region) for a SINGLE framed item of the given
 * tier — what the buyer will actually be charged for delivery when this one
 * framed print is in the basket. Mirrors api/checkout.ts buildShippingOptions.
 * Returns null when the tier carries no framed surcharge (A3/A0/Studio).
 */
const framedShippingForTier = (
  tierId: PrintTier["id"],
): { ukPence: number; euPence: number; wwPence: number } | null => {
  const ukSurcharge = FRAMED_UK_SURCHARGE_PENCE[tierId];
  if (!ukSurcharge) return null;
  const intlSurcharge = ukSurcharge * 2; // EU + WW double (api/checkout.ts)
  return {
    ukPence: SHIP_BASE_PENCE.uk + ukSurcharge,
    euPence: SHIP_BASE_PENCE.eu + intlSurcharge,
    wwPence: SHIP_BASE_PENCE.ww + intlSurcharge,
  };
};

/* =============================================================================
 * ADD-ON LEAD TIMES — the longest selected add-on governs the stated wait.
 * Frame: 2 weeks. Hand-finishing by Polly Wedge: 4 weeks. Mirrors the copy the
 * estate quotes elsewhere (EMBELLISHMENT_NOTE = "please allow 4 weeks").
 * ========================================================================== */
const FRAME_LEAD_WEEKS = 2;
const FINISH_LEAD_WEEKS = 4;

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
  <div role="radiogroup" aria-label="Print size" className="grid grid-cols-1 gap-2.5 gap-y-4">
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
              : "ring-line hover:ring-ink/40",
          )}
        >
          {tier.isAnchor && (
            <span
              aria-hidden="true"
              className="absolute -top-2 left-4 inline-flex items-center bg-ink text-bg px-2.5 py-0.5 font-sans text-[10px] font-bold tracking-[0.24em] uppercase rounded-full"
            >
              Most chosen
            </span>
          )}
          <span className="min-w-0">
            <span className={cn(EYEBROW_TIGHT, "block mb-1")}>{tier.label}</span>
            <span className="block font-sans text-[15px] font-semibold leading-[1.25] text-ink">
              {tier.size}
            </span>
            <span className={cn(META, "block mt-0.5")}>{tier.editionLabel}</span>
          </span>
          <span className="font-display font-semibold tracking-[-0.01em] text-[18px] text-ink justify-self-end">
            {formatGBP(tier.pricePence).replace(".00", "")}
          </span>
          {isSelected && !tier.isOneOff && (
            <span className={cn(META, "col-span-2 mt-3")}>
              {tier.editionLabel} · estate-stamped &amp; hand-numbered
              {tier.editionPromise ? ` · ${tier.editionPromise}` : ""}
            </span>
          )}
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
        ? "ring-ink shadow-[0_4px_22px_rgba(0,0,0,0.4)]"
        : "ring-line hover:ring-ink/40",
    )}
  >
    <span className="flex items-baseline justify-between gap-4 mb-2">
      <span className="font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-ink-muted">
        Unique · one of one
      </span>
      <span className="font-display font-semibold tracking-[-0.01em] text-[20px] text-ink whitespace-nowrap">
        {formatGBP(tier.pricePence).replace(".00", "")}
      </span>
    </span>
    <span className="block font-sans text-[15px] font-semibold leading-[1.3] text-ink mb-1">
      {tier.label}
    </span>
    <span className={cn(META, "block mb-1.5")}>{tier.size}</span>
    <span className={cn(META, "block")}>
      A singular work, hand-painted in Stephen&rsquo;s geometric tradition.
      There is only this one.
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
      <p className={cn(EYEBROW_MUTED, "m-0 mb-3")}>
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
                    : "ring-1 ring-line hover:ring-ink/40 shadow-[0_3px_14px_rgba(0,0,0,0.4)]",
                )}
                style={{ background: c.hex, backgroundColor: c.hex }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-9 whitespace-nowrap bg-bg px-2.5 py-1 font-sans text-[11px] font-bold tracking-[0.18em] uppercase text-ink rounded-full ring-1 ring-line opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
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
            className="block w-11 h-11 rounded-full ring-1 ring-line shadow-[0_3px_14px_rgba(0,0,0,0.4)]"
            style={{ background: selected.hex, backgroundColor: selected.hex }}
          />
        </div>
      )}

      <p className="font-sans text-[15px] font-semibold text-ink m-0">
        {selected.name}
        {selected.isOriginal && (
          <span className="ml-3 font-sans text-[11px] font-bold tracking-[0.3em] uppercase text-ink-muted">
            · original
          </span>
        )}
      </p>
    </div>
  );
};

/* =============================================================================
 * #11 TRUE SIZE — each painting shown at REAL size on a wall in a room.
 * -----------------------------------------------------------------------------
 * Replaces the old vector ScaleViewer ("to scale" diagram beside a doorway).
 * This is the data-driven version: a size selector swaps a room photograph in
 * which THIS painting hangs at its true printed size, so a buyer can read the
 * presence of A2 vs A1 against real furniture / a real wall.
 *
 * Images are expected at  /img/truesize/<paintingId>-<sizeSlug>.jpg  (with a
 * WebP sibling — the <picture> swaps automatically). sizeSlug is the lowercased
 * A-size token from the tier (a3/a2/a1/a0). Until those photographs exist the
 * slot shows a dignified coming-soon state with the real dimensions, so the
 * section keeps its shape and never looks broken.
 *
 * Presentational ONLY — it never touches price, the JSON-LD offer, or the
 * basket. Reduced-motion-safe by construction (a simple crossfade, no scroll
 * animation). ⚠️HUGO: drop the room photos in /public/img/truesize/ when ready;
 * confirm each painting's true sheet orientation against the printed file.
 * ========================================================================== */

/** Lowercased A-size slug from a tier's size string ("A2 (…)" → "a2"). */
const trueSizeSlug = (tier: PrintTier): string | null => {
  const token = tier.size.split(" ")[0]; // "A2", "A1", …
  return /^A\d$/.test(token) ? token.toLowerCase() : null;
};

const TrueSizeViewer = ({
  painting,
  sizeTiers,
  selectedTier,
  onSelectTier,
}: {
  painting: Painting;
  sizeTiers: PrintTier[];
  selectedTier: PrintTier;
  onSelectTier: (id: PrintTier["id"]) => void;
}) => {
  const reduceMotion = useReducedMotion();
  // Only standard A-size tiers can be shown to scale (a one-off / non-A size
  // has no room photo slot). Fall back to the first such tier if the currently
  // selected tier isn't a standard A-size.
  const scaleTiers = sizeTiers.filter((t) => trueSizeSlug(t) !== null);
  const activeTier =
    trueSizeSlug(selectedTier) !== null ? selectedTier : scaleTiers[0];
  if (!activeTier) return null;

  const slug = trueSizeSlug(activeTier);
  const dims = parseSizeCm(activeTier.size);
  // Room photo for this painting at this size. Image-state is tracked per src
  // so a missing file degrades to the coming-soon placeholder rather than a
  // broken-image icon.
  const roomSrc = slug ? `/img/truesize/${painting.id}-${slug}.jpg` : null;

  return (
    <figure className="m-0">
      {/* Size selector — swaps the room image. Mirrors the SizePicker's radio
          semantics but as a compact pill row so it sits cleanly above the
          photo. Selecting here drives the SAME selectedTier the buy box uses,
          so the size shown to scale is the size being ordered. */}
      <div
        role="radiogroup"
        aria-label="Show print to scale at size"
        className="inline-flex items-center gap-0.5 mb-4 p-0.5 ring-1 ring-line rounded-full"
      >
        {scaleTiers.map((t) => {
          const isActive = t.id === activeTier.id;
          const token = t.size.split(" ")[0];
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelectTier(t.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-full font-sans text-[10px] font-bold tracking-[0.18em] uppercase transition-colors",
                isActive ? "bg-ink text-bg" : "text-ink/55 hover:text-ink",
              )}
            >
              {token}
            </button>
          );
        })}
      </div>

      <TrueSizeRoom
        key={roomSrc ?? "no-room"}
        src={roomSrc}
        reduceMotion={!!reduceMotion}
        painting={painting}
        tier={activeTier}
      />

      <figcaption className="mt-3 text-center">
        <span className="block font-sans text-[13.5px] leading-[1.5] text-ink/70">
          {activeTier.label} · {activeTier.size}
          {dims ? ` — shown at true size on the wall` : ""}
        </span>
        <span className={cn(EYEBROW_TIGHT, "block mt-1.5")}>
          A guide to real-world presence · screen scale varies by device
        </span>
      </figcaption>
    </figure>
  );
};

/**
 * TrueSizeRoom — one room photograph slot. Attempts to load the dignified room
 * image; if it's absent (not yet shot) it shows a calm coming-soon panel with
 * the print's real dimensions, on-brand, never a broken-image glyph.
 */
const TrueSizeRoom = ({
  src,
  reduceMotion,
  painting,
  tier,
}: {
  src: string | null;
  reduceMotion: boolean;
  painting: Painting;
  tier: PrintTier;
}) => {
  // "ok" once the image loads; "missing" if it errors (file not dropped in
  // yet) or there's no slug. Start "loading" so we don't flash the placeholder.
  const [state, setState] = useState<"loading" | "ok" | "missing">(
    src ? "loading" : "missing",
  );
  const dims = parseSizeCm(tier.size);
  const inW = dims ? (dims.w / 2.54).toFixed(0) : null;
  const inH = dims ? (dims.h / 2.54).toFixed(0) : null;

  if (state === "missing" || !src) {
    return (
      <div className="relative w-full min-h-[clamp(300px,60vw,420px)] py-10 overflow-hidden ring-1 ring-line bg-ink/[0.03] flex flex-col items-center justify-center text-center px-6">
        {/* Proportional outline of the print, drawn from real cm, centred on a
            quiet ground — a dignified placeholder until the room photo exists. */}
        {dims && (
          <div
            aria-hidden="true"
            className="ring-1 ring-ink/25 mb-5"
            style={{
              width: `${Math.min(38, (dims.w / dims.h) * 38)}vmin`,
              height: `${Math.min(38, (dims.h / dims.w) * 38)}vmin`,
              maxWidth: "180px",
              maxHeight: "180px",
            }}
          />
        )}
        <p className={cn(EYEBROW_MUTED, "m-0 mb-2")}>To scale · coming soon</p>
        <p className="font-sans text-[13.5px] leading-[1.6] text-ink/70 m-0 max-w-[320px]">
          We&rsquo;re photographing {painting.title} on the wall at each size.
          {dims
            ? ` ${tier.size.split(" ")[0]} measures ${dims.w} × ${dims.h} cm${
                inW && inH ? ` (about ${inW} × ${inH} in)` : ""
              }.`
            : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[4/3] overflow-hidden ring-1 ring-line">
      <picture>
        <source srcSet={asset(webp(src))} type="image/webp" />
        <img
          src={asset(src)}
          alt={`${painting.title} shown at ${tier.size} on a wall, for true-size scale`}
          onLoad={() => setState("ok")}
          onError={() => setState("missing")}
          className={cn(
            "absolute inset-0 h-full w-full object-contain",
            reduceMotion ? "" : "transition-opacity duration-500",
            state === "ok" ? "opacity-100" : "opacity-0",
          )}
        />
      </picture>
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
  // Effective add-on selections — an add-on is only "on" if it's both offered
  // at this size AND ticked. Switching to a size that doesn't offer an add-on
  // silently turns it off for pricing/total/lead-time purposes (the box also
  // disables + unchecks visually).
  const framingActive = framingOffered && framing;
  const embellishActive = embellishOffered && embellished;

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

  // Running line total = print + (frame if active) + (hand-finish if active).
  // Updates live as the buyer ticks add-ons (DMCC: the running total must
  // reflect the chosen configuration before they commit).
  const lineTotalPence =
    selectedTier.pricePence +
    (framingActive ? selectedTier.framingPricePence ?? 0 : 0) +
    (embellishActive ? selectedTier.embellishmentPricePence ?? 0 : 0);
  const hasAddOnSelected = framingActive || embellishActive;

  // Stated lead time — the LONGEST selected add-on governs. Frame 2 wks,
  // hand-finishing 4 wks. Nothing selected → the standard print lead time.
  const leadWeeks = Math.max(
    framingActive ? FRAME_LEAD_WEEKS : 0,
    embellishActive ? FINISH_LEAD_WEEKS : 0,
  );

  // Framed-shipping surcharge for THIS size — shown upfront the moment the
  // frame is ticked (DMCC equal-prominence rule; figures mirror
  // api/checkout.ts buildShippingOptions, see top of file).
  const framedShipping = framedShippingForTier(selectedTier.id);

  // Complete colourway set — every available colourway of this painting at the
  // SELECTED size (gotcha #9 size-tiered deals: pass the selected tier id so the
  // advertised set price tracks the size the buyer is actually choosing). The
  // % ladder stays size-independent; only the £ figures recompute. Undefined for
  // single-colourway works, so the card simply doesn't render for them.
  const colourwaySet = getColourwaySetBundle(painting.id, selectedTier.id);
  const colourwaySetNames = colourwaySet
    ? colourwaySet.colourwayNames.length <= 1
      ? colourwaySet.colourwayNames.join("")
      : `${colourwaySet.colourwayNames.slice(0, -1).join(", ")} and ${
          colourwaySet.colourwayNames[colourwaySet.colourwayNames.length - 1]
        }`
    : "";

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
      framingActive,
      embellishActive,
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
          framing: framingActive,
          embellished: embellishActive,
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
          {/* Monochrome (#7): the collection tag is a quiet outlined chip in ink
              — no accent/orange. Distinguished from the title by size + tracking,
              not colour. */}
          <Badge variant="outline">{collection.title}</Badge>
        </div>
      )}
      <h1 className={cn(TITLE, "m-0 mb-5")}>
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
        <dd className="m-0 font-sans text-[13.5px] leading-[1.6] text-ink-muted">{ORIGINAL_PROVENANCE}</dd>
      </dl>

      <Separator className="bg-line mb-6" />

      {/* #order-print anchor + sentinel — StickyAddBar's IntersectionObserver
          tracks this element, so it must stay with the buy controls. */}
      <div id="order-print" className="scroll-mt-24">
        <div ref={orderSentinelRef} aria-hidden="true" className="h-px w-full" />

        {/* 3 · PRICE (tracks the selected size tier) + eyebrow. Monochrome (#7):
            the eyebrow is muted ink, the price is the display-serif figure — the
            jump in size/weight carries the hierarchy, not colour. */}
        <p className={cn(EYEBROW_MUTED, "m-0 mb-3")}>Order a print</p>
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 mb-6">
          <p className="font-display font-semibold tracking-[-0.02em] text-[clamp(30px,3.4vw,40px)] text-ink m-0">
            {formatGBP(selectedTier.pricePence).replace(".00", "")}
          </p>
          <p className={cn(META, "m-0")}>
            {selectedTier.size}
          </p>
        </div>

        {/* Dimension chip — instant size reassurance, updates with the tier */}
        <div className="mb-6 -mt-2">
          <DimensionChip tier={selectedTier} />
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

        {/* 5b · COMPLETE COLOURWAY SET — only for paintings with 2+ available
            colourways. Recomputed for the SELECTED size (#9 size-tiered deals):
            getColourwaySetBundle is passed selectedTier.id so the advertised set
            price + saving track whatever size the buyer has chosen. The button
            pushes one line PER colourway at that SAME tier, so advertised ==
            Stripe charge by construction. The complete-set 12% the checkout
            applies to an all-one-painting basket is size-independent. */}
        {colourwaySet && (
          <div className="mt-7 ring-1 ring-line px-4 py-4">
            <p className={cn(EYEBROW_MUTED, "m-0 mb-2")}>The complete colourway set</p>
            <p className="font-sans text-[13.5px] leading-[1.55] text-ink-muted m-0 mb-3">
              Every one of Stephen's {colourwaySet.colourwayNames.length} colourways
              for this work — {colourwaySetNames} — each an estate-stamped{" "}
              {selectedTier.label} {selectedTier.size.split(" ")[0]} print, the
              colours exactly as he left them.
            </p>
            <p className="font-sans text-[14px] text-ink m-0 mb-1.5">
              <span className="font-display font-semibold tracking-[-0.02em] text-[22px] mr-2.5">
                {formatGBP(colourwaySet.bundlePricePence).replace(".00", "")}
              </span>
              the complete set, together
            </p>
            <p className={cn(META, "m-0 mb-3.5")}>
              {formatGBP(colourwaySet.fullPricePence).replace(".00", "")} bought
              singly · a complete-set saving of{" "}
              {formatGBP(colourwaySet.savePence).replace(".00", "")}
            </p>
            <button
              type="button"
              onClick={() =>
                colourwaySet.colourwayNames.forEach((name) =>
                  addItem(painting.id, name, selectedTier.id),
                )
              }
              className={BTN_PRIMARY}
            >
              Add the complete set
              <span aria-hidden="true" className="ml-2">→</span>
            </button>
            <p className="font-sans text-[12px] leading-[1.5] text-ink-muted mt-2.5 m-0">
              The complete-set saving is applied automatically at checkout.
            </p>
          </div>
        )}

        {/* 6 · ADD-ONS (#12) — hidden on the one-off original. Both add-ons are
            OPT-IN (NEVER pre-ticked — DMCC no-default-selection rule). Each
            shows its price, its lead time, a short description; the frame ALSO
            shows the framed-shipping surcharge UPFRONT the moment it's ticked
            (DMCC equal-prominence — figures mirror api/checkout.ts). Selecting
            an add-on updates the running total + stated lead time below. */}
        {showAddOns && (
          <fieldset className="border-0 p-0 m-0 mt-7 flex flex-col gap-2.5">
            <legend className={cn(EYEBROW_MUTED, "m-0 mb-2 p-0")}>
              Add-ons · optional
            </legend>

            {/* FRAME */}
            <label
              className={cn(
                "flex items-start gap-3 ring-1 px-4 py-3 cursor-pointer transition-all duration-300",
                framingOffered
                  ? framingActive
                    ? "ring-ink"
                    : "ring-line hover:ring-ink/40"
                  : "ring-line opacity-55 cursor-not-allowed",
              )}
            >
              <input
                type="checkbox"
                checked={framingActive}
                disabled={!framingOffered}
                onChange={(e) => onFramingChange(e.target.checked)}
                className="mt-1 h-4 w-4 accent-ink shrink-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <span className="flex flex-col gap-1 font-sans text-[13.5px] leading-[1.55] text-ink/85 min-w-0">
                <span className="flex items-baseline justify-between gap-3">
                  <strong className="text-ink">Add a hand-made frame</strong>
                  {framingPriceLabel && (
                    <span className="font-sans text-[13.5px] font-semibold text-ink whitespace-nowrap">
                      +{framingPriceLabel}
                    </span>
                  )}
                </span>
                <span>
                  Black-stained oak with cast-acrylic glazing for safe transit,
                  ready to hang. Allow {FRAME_LEAD_WEEKS} weeks.
                </span>
                {/* DMCC: the framed-shipping surcharge for THIS size, shown the
                    moment the frame is ticked — exact regional totals, not a
                    vague "surcharge at checkout". */}
                {framingActive && framedShipping && (
                  <span className="font-sans text-[13px] leading-[1.5] text-ink/70 mt-0.5 ring-1 ring-line/70 px-2.5 py-1.5">
                    Framed prints ship at this size: UK{" "}
                    {formatGBP(framedShipping.ukPence).replace(".00", "")} · Europe{" "}
                    {formatGBP(framedShipping.euPence).replace(".00", "")} · Worldwide{" "}
                    {formatGBP(framedShipping.wwPence).replace(".00", "")}. Shown
                    again at checkout before you pay.
                  </span>
                )}
                {!framingOffered && (
                  <span className="font-sans text-[13.5px] text-ink-muted">
                    Framing offered on A2 and A1 sizes only.
                  </span>
                )}
              </span>
            </label>

            {/* HAND-FINISHING by Polly Wedge */}
            <label
              className={cn(
                "flex items-start gap-3 ring-1 px-4 py-3 cursor-pointer transition-all duration-300",
                embellishOffered
                  ? embellishActive
                    ? "ring-ink"
                    : "ring-line hover:ring-ink/40"
                  : "ring-line opacity-55 cursor-not-allowed",
              )}
            >
              <input
                type="checkbox"
                checked={embellishActive}
                disabled={!embellishOffered}
                onChange={(e) => onEmbellishedChange(e.target.checked)}
                className="mt-1 h-4 w-4 accent-ink shrink-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <span className="flex flex-col gap-1 font-sans text-[13.5px] leading-[1.55] text-ink/85 min-w-0">
                <span className="flex items-baseline justify-between gap-3">
                  <strong className="text-ink">Hand-finished by Polly Wedge</strong>
                  {embellishPriceLabel && (
                    <span className="font-sans text-[13.5px] font-semibold text-ink whitespace-nowrap">
                      +{embellishPriceLabel}
                    </span>
                  )}
                </span>
                <span className="text-ink/55">{EMBELLISHMENT_NOTE}</span>
                <span>Allow {FINISH_LEAD_WEEKS} weeks.</span>
                {!embellishOffered && (
                  <span className="font-sans text-[13.5px] text-ink-muted">
                    Hand-finishing offered on A2 and A1 sizes only.
                  </span>
                )}
              </span>
            </label>

            {/* RUNNING TOTAL + LEAD TIME — updates live as add-ons are ticked.
                DMCC: the buyer sees the full configured price (and the longest
                add-on lead time) before committing. Only shown once an add-on is
                selected, so the bare-print case stays clean. */}
            {hasAddOnSelected && (
              <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-line pt-3">
                <span className="flex flex-col gap-0.5">
                  <span className={cn(EYEBROW_TIGHT)}>
                    Your print · {selectedTier.size.split(" ")[0]}
                  </span>
                  <span className={cn(META)}>
                    Made to order · allow {leadWeeks} weeks
                  </span>
                </span>
                <span className="font-display font-semibold tracking-[-0.02em] text-[22px] text-ink whitespace-nowrap">
                  {formatGBP(lineTotalPence).replace(".00", "")}
                </span>
              </div>
            )}
          </fieldset>
        )}

        {/* 7 · CTAs */}
        <div className="flex flex-wrap items-center gap-3 mt-7">
          <button
            type="button"
            onClick={onAdd}
            disabled={status === "loading"}
            className={BTN_PRIMARY}
          >
            Add to basket
          </button>
          <button
            type="button"
            onClick={onBuyNow}
            disabled={status === "loading"}
            className={cn(BTN_SECONDARY, "disabled:opacity-60")}
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
            "mt-3 font-sans text-[13.5px] tracking-[0.04em] text-ink-muted m-0 transition-opacity duration-500",
            showAdded ? "opacity-100" : "opacity-0",
          )}
        >
          {showAdded ? (
            <>
              Added —{" "}
              <Link to="/basket" className="text-ink-muted underline underline-offset-4 hover:text-ink transition-colors">
                view basket
              </Link>
            </>
          ) : (
            " "
          )}
        </p>
        {status === "error" && (
          <p className="mt-2 font-sans text-[13.5px] font-semibold text-ink m-0">{errorMsg}</p>
        )}

        {/* 8 · AUTHENTICATION + REASSURANCE — structured trust cluster. All
            copy from single-source ESTATE_AUTHENTICATION (inside the card).
            Full provenance + shipping detail live in the ProvenancePanel
            below the Story so the buy box stays tight. */}
        <Separator className="bg-line mt-7 mb-6" />
        <AuthenticationCard />
        <div className="mt-5">
          <ReassuranceRow />
        </div>
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
        <blockquote className="m-0 pl-6 border-l-2 border-line py-2">
          <p className="font-display italic text-[clamp(18px,1.9vw,22px)] leading-[1.45] text-ink m-0 mb-3">
            &ldquo;{painting.artistQuote}&rdquo;
          </p>
          <cite className={cn(EYEBROW_MUTED, "not-italic")}>— Stephen Meakin</cite>
        </blockquote>
      </Reveal>
    )}

    <Reveal
      as="div"
      className="mt-12 md:mt-14 flex flex-col gap-5 font-sans font-normal text-[16px] md:text-[17px] leading-[1.8] text-ink/85"
    >
      {painting.description.split("\n\n").map((para, i) => (
        <p key={i} className="m-0">{para}</p>
      ))}
    </Reveal>

    <Reveal as="div" className="mt-12 md:mt-16">
      <Separator className="bg-line mb-7" />
      <p className={cn(EYEBROW_MUTED, "m-0 mb-4")}>Original print</p>
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
          className="fixed bottom-5 right-5 z-40 hidden md:flex items-center gap-4 bg-[#0a0908]/95 backdrop-blur-md ring-1 ring-line shadow-[0_18px_50px_rgba(0,0,0,0.55)] pl-3 pr-2 py-2 rounded-full"
          role="region"
          aria-label="Quick add to basket"
        >
          <span
            aria-hidden="true"
            className="block w-7 h-7 rounded-full ring-1 ring-line shrink-0"
            style={{ background: selected.hex }}
          />
          <span className="flex flex-col leading-tight min-w-0">
            <span className="font-sans text-[11px] font-bold tracking-[0.22em] uppercase text-ink/55 truncate">
              {selected.name}
            </span>
            <span className="font-display font-semibold tracking-[-0.01em] text-[15px] text-ink">
              {formatGBP(selectedTier.pricePence).replace(".00", "")}
            </span>
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center bg-ink text-bg px-5 py-2.5 font-sans text-[11px] font-bold tracking-[0.18em] uppercase rounded-full hover:bg-ink/85 transition-colors whitespace-nowrap"
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0908]/97 backdrop-blur-sm cursor-zoom-out p-4 md:p-10"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close (Esc)"
            className="absolute top-4 right-4 md:top-6 md:right-6 inline-flex items-center gap-2 font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-ink-muted hover:text-ink transition-colors duration-300 bg-[#0a0908]/60 backdrop-blur-sm px-3 py-2 rounded-full ring-1 ring-line"
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
  // Left-column view: the artwork itself, or the True Size room view (#11) —
  // the painting shown at its real printed size on a wall in a room.
  const [view, setView] = useState<"art" | "true-size">("art");

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

  // Hero intrinsic aspect — derived from the painting's known cm size so the
  // browser reserves the image slot's ratio BEFORE the file decodes (#23: kills
  // the first-paint CLS that pushed the buy box down, and keeps the slot from
  // collapsing during the colourway crossfade). Only the ratio matters here;
  // the rendered size is still governed by the h-auto/max-h classes. Falls back
  // to a square slot when the size string isn't in cm.
  const heroDims = parseSizeCm(painting.size ?? "") ?? { w: 1, h: 1 };

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
    // overflow-x-clip (NOT overflow-hidden): clips horizontal overflow without
    // creating a scroll container, so the sticky painting (below) still works.
    // overflow-hidden here silently disabled position:sticky and left a large
    // dark void beside the buy box on desktop. html/body already clip the X axis.
    <div className="relative overflow-x-clip">
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

        <main className="mx-auto max-w-[1240px] 2xl:max-w-[1480px] px-4 md:px-8 lg:px-12 pt-6 pb-20 md:pb-28">
          {/* Back link + jump-to-order strip — price floor stays visible from
              the top; the CTA scrolls to the buy box rather than duplicating
              the purchase actions (basket flow is the single source of truth). */}
          <div className="flex items-center justify-between gap-4 mb-8 md:mb-10">
            <Link
              to={collection ? `/collections#collection-${collection.id}` : "/collections"}
              className={cn(EYEBROW_MUTED, "inline-flex items-center gap-2 transition-colors duration-300 hover:text-ink")}
            >
              ← {collection?.title ?? "All collections"}
            </Link>
            <button
              type="button"
              onClick={scrollToOrder}
              className="inline-flex items-center gap-2 font-sans text-[11px] font-bold tracking-[0.18em] uppercase text-ink-muted hover:text-ink transition-colors duration-300 whitespace-nowrap lg:hidden"
              aria-label="Jump to print order options"
            >
              <span className="font-display font-semibold tracking-[-0.01em] text-ink normal-case text-[14px]">
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
              {/* View toggle — the artwork, or the True Size room view (#11). */}
              <div className="inline-flex items-center gap-0.5 mb-4 p-0.5 ring-1 ring-line rounded-full">
                {(["art", "true-size"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    aria-pressed={view === v}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full font-sans text-[10px] font-bold tracking-[0.18em] uppercase transition-colors",
                      view === v ? "bg-ink text-bg" : "text-ink/55 hover:text-ink",
                    )}
                  >
                    {v === "art" ? "Painting" : "True size"}
                  </button>
                ))}
              </div>
              {view === "true-size" ? (
                <TrueSizeViewer
                  painting={painting}
                  sizeTiers={sizeTiers}
                  selectedTier={selectedTier}
                  onSelectTier={setSelectedTierId}
                />
              ) : (
              <Reveal>
                <div className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    aria-label={`View ${painting.title} fullscreen`}
                    className="block w-full bg-transparent border-0 p-0 cursor-zoom-in"
                  >
                    <AnimatePresence mode="sync">
                      <motion.picture
                        key={selected.image}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
                        className="block w-full"
                      >
                        <source srcSet={asset(webp(selected.image))} type="image/webp" />
                        {/* Height-capped + centred so a square/portrait painting
                            never exceeds ~78% of the viewport. Without the cap a
                            square painting rendered full-width was ~940px tall on
                            tablet/half-screen widths — taller than the viewport —
                            pushing the price + buy controls 2+ screens down. On
                            lg+ the image sits in its ~600px column unchanged. */}
                        <img
                          src={asset(selected.image)}
                          alt={`${painting.title} — ${selected.name}`}
                          width={heroDims.w}
                          height={heroDims.h}
                          className="block mx-auto h-auto w-auto max-w-full max-h-[64vh] lg:max-h-[calc(100vh-88px-2rem)] 2xl:max-h-[86vh]"
                        />
                      </motion.picture>
                    </AnimatePresence>
                  </button>
                </div>
              </Reveal>
              )}
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
          <div className="mt-10 md:mt-20">
            <Separator className="bg-line mb-10 md:mb-14 max-w-[720px] mx-auto" />
            <Story painting={painting} />
            <ProvenancePanel />
          </div>
        </main>
        <CredentialsStrip />
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
