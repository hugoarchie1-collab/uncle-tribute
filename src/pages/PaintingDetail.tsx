import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useParams, useSearchParams, Link, Navigate } from "react-router-dom";
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
import { CloserLook } from "../components/CloserLook";
import {
  COLLECTIONS,
  EMBELLISHMENT_NOTE,
  getAnchorTier,
  getEmbellishmentPricePence,
  getFramingPricePence,
  getLowestTierPricePence,
  getPaintingById,
  getPrintTiers,
  paintingImageAlt,
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
// THE ESTATE LEDGER — hand-curated allocation register (src/data/editions.ts,
// curated by Hugo per fulfilled order; ships empty). nextNumber(paintingId,
// colourwayName, tierId) = allocatedCount + 1 — the next certificate number
// the estate would allocate for that edition. Read-only here.
import { nextNumber } from "../data/editions";
import { useCurrency } from "../lib/currency";
import { asset, webp, webpSrcSet } from "../lib/asset";
import { IMAGE_VARIANT_WIDTHS } from "../lib/imageVariants";
import { cn } from "../lib/cn";
import { addItem } from "../lib/basket";
import { getStoredUtm } from "../lib/utm";
import { trackAddToCart, trackViewContent } from "../lib/tracking";
import {
  EYEBROW_MUTED,
  EYEBROW_TIGHT,
  META,
  TITLE,
} from "../components/ui/tokens";
import { Seo } from "../components/Seo";
import { SITE_URL, absoluteUrl, firstSentence } from "../lib/seo";

// Rolling ~12-month price-validity horizon for the Product Offer JSON-LD
// (Rich Results recommended field — keeps the cached price from looking stale).
// Computed ONCE at module load (a date ~1yr out, refreshed each deploy/session)
// so it stays pure during render — `Date.now()` in the component body trips the
// react-hooks/purity rule and the value sits after the early returns anyway. It
// carries no money value, so it can't drift from the pricing mirror (gotcha #9).
const PRICE_VALID_UNTIL = new Date(Date.now() + 365 * 864e5)
  .toISOString()
  .slice(0, 10);

// True-Size room view needs a composited room photo per painting at
// /public/img/truesize/<id>-<size>.jpg(+webp). NONE exist yet, so the "True
// size" toggle is gated to this allowlist — until a painting's asset lands the
// toggle is hidden, rather than offering a "To scale · coming soon" dead-end on
// a £245–£1,750 page (audit fix). ⚠️HUGO: add a painting id here the moment its
// room composite is in /public/img/truesize/, and the toggle self-enables.
const TRUESIZE_PAINTING_IDS = new Set<string>([]);

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
 * SHIPPING — FREE on everything (DISPLAY MIRROR of api/checkout.ts)
 * -----------------------------------------------------------------------------
 * FREE SHIPPING POLICY (2026-06-06): the estate absorbs ALL delivery cost into
 * the ~90% print margin — every region (UK / Europe / Worldwide) ships FREE, for
 * both unframed AND framed orders. So there is NO unavoidable delivery charge to
 * disclose: `api/checkout.ts` `buildShippingOptions` now returns a £0 (free) rate
 * per region, and the basket / product-page previews simply say "Free". The old
 * framed-shipping surcharge — and the DMCC equal-prominence drip-pricing
 * disclosure it required the moment a frame was ticked — is therefore GONE: a
 * frame no longer adds any delivery cost, so there is nothing left to surface.
 * Advertised £0 == charged £0 (mirror invariant, gotcha #9).
 * ========================================================================== */

/* =============================================================================
 * ADD-ON LEAD TIMES — the longest selected add-on governs the stated wait.
 * Frame: 2 weeks. Hand-finishing by Polly Wedge: 2 weeks max. Mirrors the copy
 * the estate quotes elsewhere (EMBELLISHMENT_NOTE = "please allow up to two
 * weeks").
 * ========================================================================== */
const FRAME_LEAD_WEEKS = 2;
const FINISH_LEAD_WEEKS = 2;

/**
 * Ambient backdrop source — the page-wide blurred wash behind the PDP. It's a
 * CSS backgroundImage (no srcset possible), sits behind a 14px blur + the
 * ambient veil, and renders at background-size: cover — so the -w480 variant
 * (~49–112KB) is visually identical to the full ~2000px webp (0.4–1.27MB)
 * there. Falls back to the full-size webp for any path without a -w480
 * sibling (manifest: IMAGE_VARIANT_WIDTHS).
 */
const ambientBackdropUrl = (jpgPath: string): string =>
  jpgPath.endsWith(".jpg") && IMAGE_VARIANT_WIDTHS[jpgPath]?.includes(480)
    ? asset(`${jpgPath.slice(0, -4)}-w480.webp`)
    : asset(webp(jpgPath));

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
  paintingId,
  colourwayName,
}: {
  tiers: PrintTier[];
  selectedTier: PrintTier;
  onSelectTier: (id: PrintTier["id"]) => void;
  /** For the allocation line — the edition register is per painting + colourway + tier. */
  paintingId: string;
  colourwayName: string;
}) => {
  const { formatPretty: fmtP } = useCurrency();
  return (
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
            {fmtP(tier.pricePence)}
          </span>
          {/* Selected summary — the card's own editionLabel line already sits
              two lines above, so it is NOT repeated here (mobile made the
              duplication conspicuous). The summary carries only what the card
              doesn't already say. */}
          {isSelected && !tier.isOneOff && (
            <span className={cn(META, "col-span-2 mt-3")}>
              Estate-stamped
              {tier.editionTotal !== null ? " · numbered within its edition" : ""}
              {tier.editionPromise ? ` · ${tier.editionPromise}` : ""}
            </span>
          )}
          {/* Allocation register line — dignified provenance, never urgency.
              Reads from the estate ledger (data/editions.ts); recomputes as the
              buyer switches size or colourway. Skipped for the Open Edition
              (editionTotal null, not numbered) and one-off pieces. GATED at
              >= 5: until an edition has genuine momentum, "No. 1 of 200" broadcasts
              "nobody has bought this" to a cautious high-AOV buyer — the neutral
              "numbered within its edition" summary above already conveys the
              provenance, so the explicit number only appears once it reassures
              rather than deters. (Audit fix — never fabricate allocations.) */}
          {isSelected &&
            !tier.isOneOff &&
            tier.editionTotal !== null &&
            (() => {
              const allocated = nextNumber(paintingId, colourwayName, tier.id);
              return allocated >= 5 ? (
                <span className={cn(META, "col-span-2 mt-1 text-ink-muted")}>
                  Next to be allocated in this edition: No. {allocated} of{" "}
                  {tier.editionTotal}
                </span>
              ) : null;
            })()}
        </button>
      );
    })}
  </div>
  );
};

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
}) => {
  const { formatPretty: fmtP } = useCurrency();
  return (
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
        {fmtP(tier.pricePence)}
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
};

/**
 * Colourways — swatch row (hover-revealed name) + selected name caption.
 * Placed HIGH in the buy box (just under the size picker) so the buyer
 * reaches it without scrolling through the story. Single-colourway paintings
 * render a static swatch so the section keeps its shape.
 */
/**
 * RegisterOriginalInterest — the hushed waitlist for the privately-held
 * original (Avant Arte's register mechanic, without the hype). The original
 * canvas is "held privately by the estate — not currently for sale"
 * (ORIGINAL_PROVENANCE); this is the one quiet line that lets a serious
 * collector raise a hand. Expands inline (no modal) to a single email field
 * and posts to the EXISTING /api/newsletter-subscribe endpoint
 * ({ email, source }) tagged "original-interest:<paintingId>", so the
 * interest list lives with the Friends & Family list and surfaces in the
 * estate's inbox/CRM with the painting attached. Mirrors NewsletterSignup's
 * friendly-success contract: only a network failure shows an error — an
 * infra non-200 still reads as success to the collector (the operator sees
 * the truth in the Vercel function logs).
 */
const RegisterOriginalInterest = ({ paintingId }: { paintingId: string }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    try {
      await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          source: `original-interest:${paintingId}`,
        }),
      });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <p className={cn(META, "m-0 mb-7 -mt-4")} role="status" aria-live="polite">
        Noted, with thanks — we&rsquo;ll write to you first.
      </p>
    );
  }

  return (
    <div className="-mt-4 mb-7">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            META,
            // Tap target: the bare text line measured 22px tall — py-3 grows
            // the hit area to ≥44px (WCAG 2.5.8 comfort size) while -my-3
            // cancels it visually, so the hairline-link look is unchanged.
            "inline-flex items-center bg-transparent border-0 px-0 py-3 -my-3 min-h-[44px] cursor-pointer underline underline-offset-4 hover:text-ink transition-colors",
          )}
        >
          Register interest in the original →
        </button>
      ) : (
        <form onSubmit={submit} noValidate className="max-w-[420px]">
          <label htmlFor={`original-interest-${paintingId}`} className="sr-only">
            Email address
          </label>
          <div className="flex w-full items-stretch ring-1 ring-line focus-within:ring-ink/40 transition-shadow">
            <input
              id={`original-interest-${paintingId}`}
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 min-w-0 bg-transparent px-3 py-2.5 font-sans text-[14px] text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="shrink-0 bg-transparent border-0 border-l border-line px-4 font-sans text-[11px] font-bold tracking-[0.24em] uppercase text-ink cursor-pointer hover:bg-ink/5 transition-colors disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : "Send"}
            </button>
          </div>
          <p className={cn(META, "m-0 mt-2")} aria-live="polite">
            {status === "error"
              ? "That didn't take — check the address, or write to info@themandalacompany.com."
              : "Should the estate ever part with the original, you'll hear first."}
          </p>
        </form>
      )}
    </div>
  );
};

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
        <span className="block font-sans text-[clamp(13.5px,0.8vw,17px)] leading-[1.5] text-ink/70">
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
      <div className="relative w-full min-h-[clamp(280px,48vw,380px)] py-8 overflow-hidden ring-1 ring-line bg-ink/[0.03] flex flex-col items-center justify-center text-center px-6">
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
        <p className="font-sans text-[clamp(13.5px,0.8vw,17px)] leading-[1.6] text-ink/70 m-0 max-w-[320px] 3xl:max-w-[400px]">
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
  const { formatPretty: fmtP, code: currencyCode } = useCurrency();
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
  // Framing / hand-finishing are offered ONLY at the sizes the data layer prices
  // them for — A2 (Collector) + A1 (Atelier). getFramingPricePence /
  // getEmbellishmentPricePence return null elsewhere, so the "Finish your piece"
  // step renders only on those tiers (the brief: A2/A1 only).
  const framingOffered =
    !isOneOffSelected && getFramingPricePence(selectedTier) !== null;
  const embellishOffered =
    !isOneOffSelected && getEmbellishmentPricePence(selectedTier) !== null;
  // The promoted "Finish your piece" step appears only when at least one finish
  // is actually offered at the selected size (and never on the one-off original,
  // which IS the finished work). On A3/A0 the step is simply absent.
  const showAddOns = !isOneOffSelected && (framingOffered || embellishOffered);
  // Effective add-on selections — an add-on is only "on" if it's both offered
  // at this size AND ticked. Switching to a size that doesn't offer an add-on
  // silently turns it off for pricing/total/lead-time purposes (the box also
  // disables + unchecks visually).
  const framingActive = framingOffered && framing;
  const embellishActive = embellishOffered && embellished;

  // Add-on prices read from the data layer's helpers so they can never drift
  // from the source ladder (gotcha #9 — pricing must not be hand-typed). The
  // helpers return null at sizes that don't offer the add-on (A3/A0).
  const framingPricePence = getFramingPricePence(selectedTier);
  const embellishPricePence = getEmbellishmentPricePence(selectedTier);
  const framingPriceLabel =
    framingPricePence !== null
      ? fmtP(framingPricePence)
      : null;
  const embellishPriceLabel =
    embellishPricePence !== null
      ? fmtP(embellishPricePence)
      : null;

  // Running line total = print + (frame if active) + (hand-finish if active).
  // Updates live as the buyer ticks add-ons (DMCC: the running total must
  // reflect the chosen configuration before they commit). Add-on pence come
  // from the data-layer helpers, so the figure can never drift from the ladder.
  const lineTotalPence =
    selectedTier.pricePence +
    (framingActive ? framingPricePence ?? 0 : 0) +
    (embellishActive ? embellishPricePence ?? 0 : 0);
  const hasAddOnSelected = framingActive || embellishActive;

  // Stated lead time — the LONGEST selected add-on governs. Frame 2 wks,
  // hand-finishing 4 wks. Nothing selected → the standard print lead time.
  const leadWeeks = Math.max(
    framingActive ? FRAME_LEAD_WEEKS : 0,
    embellishActive ? FINISH_LEAD_WEEKS : 0,
  );

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
    // Marketing analytics (consent-gated no-op otherwise) — AddToCart /
    // add_to_cart at the SELECTED tier's print price.
    trackAddToCart(
      { id: painting.id, title: painting.title },
      selectedTier.pricePence,
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
    // First-touch attribution (tasm.utm.v1) rides along as the optional `utm`
    // field — the server validates it and writes the session metadata.
    const utm = getStoredUtm();
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
          currency: currencyCode,
          ...(utm ? { utm } : {}),
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
          <Badge variant="outline">{collection.title.split(" — ")[0]}</Badge>
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
            <dd className="m-0 font-sans text-[clamp(13.5px,0.75vw,16px)] leading-[1.6] text-ink">{painting.year}</dd>
          </>
        )}
        {painting.size && (
          <>
            <dt className={cn(EYEBROW_TIGHT, "pt-px")}>Size</dt>
            <dd className="m-0 font-sans text-[clamp(13.5px,0.75vw,16px)] leading-[1.6] text-ink">{painting.size}</dd>
          </>
        )}
        {painting.location && (
          <>
            <dt className={cn(EYEBROW_TIGHT, "pt-px")}>Painted in</dt>
            <dd className="m-0 font-sans text-[clamp(13.5px,0.75vw,16px)] leading-[1.6] text-ink">{painting.location}</dd>
          </>
        )}
        <dt className={cn(EYEBROW_TIGHT, "pt-px")}>Original</dt>
        <dd className="m-0 font-sans text-[clamp(13.5px,0.8vw,17px)] leading-[1.6] text-ink-muted">{ORIGINAL_PROVENANCE}</dd>
      </dl>

      {/* Hushed register for the privately-held original — sits directly
          under the provenance fact it relates to. */}
      <RegisterOriginalInterest paintingId={painting.id} />

      <Separator className="bg-line mb-6" />

      {/* #order-print anchor + sentinel — StickyAddBar's IntersectionObserver
          tracks this element, so it must stay with the buy controls. */}
      <div id="order-print" className="scroll-mt-24">
        <div ref={orderSentinelRef} aria-hidden="true" className="h-px w-full" />

        {/* 3 · PRICE (tracks the selected size tier) + eyebrow. Monochrome (#7):
            the eyebrow is muted ink, the price is the display-serif figure — the
            jump in size/weight carries the hierarchy, not colour. */}
        <p className={cn(EYEBROW_MUTED, "m-0 mb-3")}>Order a print</p>
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 mb-3">
          <p className="font-display font-semibold tracking-[-0.02em] text-[clamp(30px,3.4vw,52px)] text-ink m-0">
            {fmtP(selectedTier.pricePence)}
          </p>
          <p className={cn(META, "m-0")}>
            {selectedTier.size}
          </p>
        </div>

        {/* Free shipping — advertised upfront beside the price. Mirrors the £0
            (free) rate api/checkout.ts now charges in every region; framed or
            unframed, nothing is added at checkout (mirror invariant, gotcha #9). */}
        <p className={cn(EYEBROW_TIGHT, "m-0 mb-6")}>
          Free delivery worldwide
        </p>

        {/* Dimension chip — instant size reassurance, updates with the tier */}
        <div className="mb-6 -mt-2">
          <DimensionChip tier={selectedTier} />
        </div>

        {/* 4 · SIZE PICKER — standard tiers only */}
        <SizePicker
          tiers={sizeTiers}
          selectedTier={selectedTier}
          onSelectTier={onSelectTier}
          paintingId={painting.id}
          colourwayName={selected.name}
        />

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
            <p className={cn(EYEBROW_MUTED, "m-0 mb-2.5")}>The complete colourway set</p>
            <p className="font-sans text-[clamp(14.5px,0.6vw,18px)] leading-[1.65] text-ink-muted m-0 mb-4">
              Every one of Stephen's {colourwaySet.colourwayNames.length} colourways
              for this work — {colourwaySetNames} — each an estate-stamped{" "}
              {selectedTier.label} {selectedTier.size.split(" ")[0]} print, the
              colours exactly as he left them.
            </p>
            <p className="font-sans text-[14px] text-ink m-0 mb-1.5">
              <span className="font-display font-semibold tracking-[-0.02em] text-[22px] mr-2.5">
                {fmtP(colourwaySet.bundlePricePence)}
              </span>
              the complete set, together
            </p>
            <p className={cn(META, "m-0 mb-3.5")}>
              {fmtP(colourwaySet.fullPricePence)} bought
              singly · a complete-set saving of{" "}
              {fmtP(colourwaySet.savePence)}
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
              The set saving is applied automatically at checkout.
            </p>
          </div>
        )}

        {/* 6 · FINISH YOUR PIECE (#12) — the PROMOTED add-on step (King & McGaw
            / Lumas pattern). Lifted out of a buried "optional add-ons" list into
            a distinct, dignified purchase step that sits DIRECTLY ABOVE the
            Add-to-basket CTA, so a frame / hand-finish is offered at the natural
            moment of decision, not discovered afterwards.

            Renders ONLY on the sizes the data layer prices a finish for — A2
            (Collector) + A1 (Atelier) — via `showAddOns` (getFramingPricePence /
            getEmbellishmentPricePence return null elsewhere), and never on the
            one-off original. On A3/A0 the step is simply absent.

            MONOCHROME (#7): ink + muted ink + hairlines only — no accent badge.
            The "Most collectors choose hand-framed" line is a QUIET lead to the
            eye, NOT a pre-selected box: both finishes stay OPT-IN (DMCC
            no-default-selection rule). Each option shows its price, its lead
            time and a short description. Delivery is FREE on everything (incl.
            framed), so there is NO framed-shipping surcharge to disclose — a
            frame only adds its own add-on price, nothing more. Ticking either
            updates the running total + stated lead time below. The selections
            flow to addItem / Buy-now unchanged — only the placement +
            presentation moved. */}
        {showAddOns && (
          <fieldset className="border-0 p-0 m-0 mt-8 ring-1 ring-line px-4 py-4 sm:px-5 sm:py-5">
            <legend className="float-none p-0 mb-2.5 w-full">
              <span className={cn(EYEBROW_MUTED, "block")}>
                Finish your piece
              </span>
            </legend>
            <p className="font-sans text-[clamp(14.5px,0.6vw,18px)] leading-[1.65] text-ink/70 m-0 mb-5">
              Take it further than the print alone — framed ready to hang, or
              hand-finished by the estate. Both are optional and made to order.
            </p>

            {/* Quiet lead to the eye — guidance, NOT a default selection. Sits
                above the framing option it points to (DMCC: no pre-tick). */}
            {framingOffered && (
              <p
                className={cn(EYEBROW_TIGHT, "m-0 mb-2.5 flex items-center gap-2")}
              >
                <span aria-hidden="true" className="text-ink/40">—</span>
                Most collectors choose hand-framed
              </p>
            )}

            <div className="flex flex-col gap-2.5">
              {/* FRAME */}
              {framingOffered && (
                <label
                  className={cn(
                    "flex items-start gap-3 ring-1 px-4 py-3.5 cursor-pointer transition-all duration-300",
                    framingActive ? "ring-ink" : "ring-line hover:ring-ink/40",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={framingActive}
                    onChange={(e) => onFramingChange(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-ink shrink-0 cursor-pointer"
                  />
                  <span className="flex flex-col gap-1 font-sans text-[13.5px] leading-[1.55] text-ink/85 min-w-0">
                    <span className="flex items-baseline justify-between gap-3">
                      <strong className="text-ink">Bespoke framing</strong>
                      {framingPriceLabel && (
                        <span className="font-sans text-[13.5px] font-semibold text-ink whitespace-nowrap">
                          +{framingPriceLabel}
                        </span>
                      )}
                    </span>
                    <span>
                      Black-stained oak with cast-acrylic glazing for safe
                      transit, ready to hang. Allow {FRAME_LEAD_WEEKS} weeks.
                    </span>
                    {/* Free delivery applies to framed prints too — reassurance
                        shown the moment a frame is ticked. There is no framed-
                        shipping surcharge (the estate absorbs delivery), so this
                        is a positive note, not a DMCC drip-pricing disclosure. */}
                    {framingActive && (
                      <span className="font-sans text-[13px] leading-[1.5] text-ink/70 mt-0.5 ring-1 ring-line/70 px-2.5 py-1.5">
                        Framed and delivered free — UK, Europe and Worldwide.
                        No delivery charge is added at checkout.
                      </span>
                    )}
                  </span>
                </label>
              )}

              {/* HAND-FINISHING by Polly Wedge */}
              {embellishOffered && (
                <label
                  className={cn(
                    "flex items-start gap-3 ring-1 px-4 py-3.5 cursor-pointer transition-all duration-300",
                    embellishActive ? "ring-ink" : "ring-line hover:ring-ink/40",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={embellishActive}
                    onChange={(e) => onEmbellishedChange(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-ink shrink-0 cursor-pointer"
                  />
                  <span className="flex flex-col gap-1 font-sans text-[13.5px] leading-[1.55] text-ink/85 min-w-0">
                    <span className="flex items-baseline justify-between gap-3">
                      <strong className="text-ink">
                        Hand-finished by Polly Wedge
                      </strong>
                      {embellishPriceLabel && (
                        <span className="font-sans text-[13.5px] font-semibold text-ink whitespace-nowrap">
                          +{embellishPriceLabel}
                        </span>
                      )}
                    </span>
                    <span className="text-ink/55">{EMBELLISHMENT_NOTE}</span>
                    <span>Allow {FINISH_LEAD_WEEKS} weeks.</span>
                  </span>
                </label>
              )}
            </div>

            {/* RUNNING TOTAL + LEAD TIME — updates live as finishes are ticked.
                DMCC: the buyer sees the full configured price (and the longest
                add-on lead time) before committing. Only shown once a finish is
                selected, so the bare-print case stays clean. */}
            {hasAddOnSelected && (
              <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-3">
                <span className="flex flex-col gap-0.5">
                  <span className={cn(EYEBROW_TIGHT)}>
                    Your piece · {selectedTier.size.split(" ")[0]}
                  </span>
                  <span className={cn(META)}>
                    Made to order · allow {leadWeeks} weeks
                  </span>
                </span>
                <span className="font-display font-semibold tracking-[-0.02em] text-[22px] text-ink whitespace-nowrap">
                  {fmtP(lineTotalPence)}
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
  <div className="max-w-[720px] 2xl:max-w-[820px] 3xl:max-w-[920px] 4xl:max-w-[1040px] mx-auto">
    {painting.artistQuote && (
      <Reveal as="div">
        {/* AboutMasthead grammar adapted to the monochrome PDP: a full-measure
            hairline + muted-ink eyebrow, then the artist quote lifted to a
            confident Fraunces statement (opsz ≤48, real italic 400) — the
            page's bold prose header. COPY IS VERBATIM from paintings.ts
            (painting.artistQuote), never re-typed. */}
        <div aria-hidden className="h-px w-full bg-line" />
        <p className={cn(EYEBROW_MUTED, "m-0 mt-5 mb-5")}>In Stephen&rsquo;s words</p>
        <blockquote className="m-0">
          <p
            className="font-display italic font-normal tracking-[-0.015em] text-[clamp(24px,3.3vw,52px)] leading-[1.25] text-ink m-0 mb-4 text-balance"
            style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}
          >
            &ldquo;{painting.artistQuote}&rdquo;
          </p>
          <cite className={cn(EYEBROW_MUTED, "not-italic block")}>— Stephen Meakin</cite>
        </blockquote>
      </Reveal>
    )}

    <Reveal
      as="div"
      className="mt-7 md:mt-9 flex flex-col gap-5 md:gap-6 font-sans font-normal text-[clamp(16px,1vw,21px)] md:text-[clamp(17px,1.05vw,22px)] leading-[1.8] text-ink/85"
    >
      {painting.description.split("\n\n").map((para, i) => (
        <p key={i} className="m-0">{para}</p>
      ))}
    </Reveal>

    <Reveal as="div" className="mt-7 md:mt-9">
      <Separator className="bg-line mb-7" />
      <p className={cn(EYEBROW_MUTED, "m-0 mb-4")}>Original print</p>
      <p className="font-sans font-normal text-[clamp(16px,1vw,20px)] leading-[1.75] text-ink/85 m-0">
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
  const { formatPretty: fmtP } = useCurrency();
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
    // Same consent-gated AddToCart as the buy box — this bar is just the
    // floating twin of that handler.
    trackAddToCart(
      { id: painting.id, title: painting.title },
      selectedTier.pricePence,
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  }, [
    painting.id,
    painting.title,
    selected.name,
    selectedTier.id,
    selectedTier.pricePence,
    framingOffered,
    framing,
    embellishOffered,
    embellished,
  ]);

  return (
    <AnimatePresence>
      {visible && (
        <>
        {/* MOBILE — full-width compact bottom bar (below md). Same sentinel
            logic + add handler as the desktop pill; geometry adapted for
            thumbs: 44px+ CTA, env(safe-area-inset-bottom) padding so the bar
            clears the iPhone home indicator (index.html sets
            viewport-fit=cover). z-40 keeps it under the modals (CloserLook
            z-[200], mobile menu z-[60], consent banner z-[110]). */}
        <motion.div
          key="sticky-add-bar-mobile"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
          className="fixed bottom-0 inset-x-0 z-40 flex md:hidden items-center gap-3 bg-[#0a0908]/97 border-t border-line shadow-[0_-14px_44px_rgba(0,0,0,0.5)] px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]"
          role="region"
          aria-label="Quick add to basket"
        >
          <span
            aria-hidden="true"
            className="block w-8 h-8 rounded-full ring-1 ring-line shrink-0"
            style={{ background: selected.hex }}
          />
          <span className="flex flex-col leading-tight min-w-0 flex-1">
            <span className="font-sans text-[11px] font-bold tracking-[0.18em] uppercase text-ink/55 truncate">
              {selected.name}
            </span>
            <span className="font-display font-semibold tracking-[-0.01em] text-[15px] text-ink">
              {fmtP(selectedTier.pricePence)}
            </span>
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center justify-center min-h-[44px] bg-ink text-bg px-5 font-sans text-[11px] font-bold tracking-[0.18em] uppercase rounded-full hover:bg-ink/85 transition-colors whitespace-nowrap shrink-0"
          >
            {added ? "Added ✓" : "Add to basket"}
          </button>
        </motion.div>

        {/* DESKTOP — the original bottom-right pill (md and up). */}
        <motion.div
          key="sticky-add-bar"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
          className="fixed bottom-5 right-5 z-40 hidden md:flex items-center gap-4 bg-[#0a0908]/97 ring-1 ring-line shadow-[0_18px_50px_rgba(0,0,0,0.55)] pl-3 pr-2 py-2 rounded-full"
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
              {fmtP(selectedTier.pricePence)}
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
        </>
      )}
    </AnimatePresence>
  );
};

export const PaintingDetail = () => {
  const { formatPretty: fmtP } = useCurrency();
  const { id } = useParams();
  const painting = id ? getPaintingById(id) : undefined;

  const availableColourways = useMemo(
    () => painting?.colourways.filter((c) => c.available) ?? [],
    [painting],
  );

  // Optional deep-link: /collections/:id?c=<colourway name>. Lets a featured
  // card / catalogue tile open the page on the EXACT colourway it showed,
  // rather than always resetting to the original. Matched case-insensitively
  // against the available colourways; falls back to the original otherwise.
  const [searchParams] = useSearchParams();
  const colourwayParam = searchParams.get("c");
  const colourwayFromParam = useMemo(
    () =>
      colourwayParam
        ? availableColourways.find(
            (c) => c.name.toLowerCase() === colourwayParam.toLowerCase(),
          )
        : undefined,
    [colourwayParam, availableColourways],
  );

  const initialColourway =
    colourwayFromParam ??
    availableColourways.find((c) => c.isOriginal) ??
    availableColourways[0];
  const [selectedName, setSelectedName] = useState<string | undefined>(
    initialColourway?.name,
  );

  // Re-sync the selected colourway when the painting OR the ?c= param changes.
  // React Router reuses this component instance across /collections/:id
  // navigations, so the useState initialiser alone wouldn't pick up the new
  // painting / colourway — this effect does (and fixes a stale selection when
  // hopping straight from one painting's card to another).
  // Intentional: re-sync the selection to the new painting/colourway on nav.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedName(
      (colourwayFromParam ??
        availableColourways.find((c) => c.isOriginal) ??
        availableColourways[0])?.name,
    );
    // painting?.id keys the reset to an actual painting change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [painting?.id, colourwayParam]);

  // Tier ladder + size picker selection. Always preselect the anchor.
  const visibleTiers = useMemo(
    () => (painting ? getPrintTiers(painting) : []),
    [painting],
  );
  // Split the ladder: standard size tiers feed the radio grid; a one-off tier
  // (the optional `isOneOff: true` £2,450 piece) is rendered separately.
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

  // Marketing analytics — ViewContent / view_item once per painting viewed
  // (consent-gated; a silent no-op without an accept + configured IDs). The
  // value is the anchor-tier price — the figure the page itself leads with.
  // Keyed on the painting id: refiring on colourway / tier changes would
  // inflate view counts.
  useEffect(() => {
    if (!painting || !anchorTier) return;
    trackViewContent(
      { id: painting.id, title: painting.title },
      anchorTier.pricePence,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [painting?.id]);

  // Add-on state — lives on the parent so the sticky add bar and the BuyBox
  // share one source of truth.
  const [framing, setFraming] = useState(false);
  const [embellished, setEmbellished] = useState(false);

  // Deep-zoom viewer state for the hero image — plus a ref on the on-page
  // artwork <img> so the viewer can FLIP-lift from its measured rect (and read
  // the already-decoded source's natural pixel size).
  const [viewerOpen, setViewerOpen] = useState(false);
  const closeViewer = useCallback(() => setViewerOpen(false), []);
  const heroImgRef = useRef<HTMLImageElement>(null);
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
  // Commercial, keyword-front-loaded meta description + <title> — the SERP
  // click-drivers. The visible H1 stays painting.title; these only feed <head>.
  // They lead with medium + provenance + artist + "from £…" so the snippet
  // reads like a product, not the poetic story opener firstSentence() returned.
  // ⚠️ "estate-stamped" is the ONE provenance claim true across EVERY visible
  // tier. Do NOT say "signed" (Stephen is deceased — estate stamp + COA, not a
  // hand signature) and do NOT say "numbered"/"limited edition" here: the
  // from-price tier is the Open Edition (no cap, NOT numbered) under the edition
  // model (PRINT_TIERS / ESTATE_AUTHENTICATION / GLOBAL_DROP_NOTE).
  const fromPriceLabel = formatGBP(getLowestTierPricePence(painting));
  const metaDescription = `Estate-stamped giclée print of ${painting.title} by British mandala artist Stephen Meakin — sacred geometry, made to order, from ${fromPriceLabel}. Free worldwide delivery.`;
  // Title leads with buyer intent AND names the artist, so pageTitle() returns
  // it verbatim (it already contains "Stephen Meakin" → no brand suffix appended,
  // avoiding "…by Stephen Meakin · The Art of Stephen Meakin").
  const pageTitleText = `${painting.title} — Mandala Art Print by Stephen Meakin`;
  // Product JSON-LD carries a fuller description: the commercial lead + the
  // painting's own opening line (keeps firstSentence in play, adds richness for
  // rich results / AI extraction without bloating the SERP meta description).
  const productDescription = `${metaDescription} ${firstSentence(painting.description)}`;
  const paintingPath = `/collections/${painting.id}`;
  const ogImagePath = ogColourway?.image ?? selected.image;
  // VisualArtwork dateCreated — only emit a real 4-digit year (painting.year can
  // be a range like "2006–2007" → take the first year, or "[ DATE ]" TBD → omit).
  const artworkYear = painting.year.match(/\d{4}/)?.[0];
  // Original-work dimensions (cm) for the VisualArtwork node, when catalogued.
  const artworkDims = parseSizeCm(painting.size ?? "");

  // AggregateOffer bounds — derived from the SAME visible ladder the page
  // renders (getPrintTiers → available tiers only), so the markup can never
  // drift from the on-page prices or the per-tier SKUs in /merchant-feed.xml
  // (gotcha #9: advertised price == charged price, here too).
  const tierPricesPence =
    visibleTiers.length > 0
      ? visibleTiers.map((t) => t.pricePence)
      : [anchorTier.pricePence]; // defensive — never emit Infinity
  const lowPricePence = Math.min(...tierPricesPence);
  const highPricePence = Math.max(...tierPricesPence);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: painting.title,
    image: absoluteUrl(ogImagePath),
    description: productDescription,
    // Reference the entity-grounded Organization + Person nodes (index.html
    // @ids) instead of loose literals — ties every product to the verified
    // brand AND to the artist, the strongest entity signal for an estate.
    brand: { "@id": `${SITE_URL}/#organization` },
    creator: { "@id": `${SITE_URL}/#person` },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: (lowPricePence / 100).toFixed(2),
      highPrice: (highPricePence / 100).toFixed(2),
      offerCount: tierPricesPence.length,
      priceCurrency: "GBP",
      priceValidUntil: PRICE_VALID_UNTIL,
      availability: "https://schema.org/InStock",
      url: absoluteUrl(paintingPath),
      // FREE delivery (policy 2026-06-06): api/checkout.ts charges a £0 rate
      // in every region, framed or unframed — mirrored here as a £0
      // shippingRate. GB is declared as the destination (Google requires a
      // country code; delivery is equally free worldwide, but DefinedRegion
      // has no "worldwide" token). Handling mirrors the advertised
      // made-to-order lead: "ships within 7–10 working days".
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "GBP" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "GB" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 7,
            maxValue: 10,
            unitCode: "DAY",
          },
        },
      },
      // Returns — mirrors /returns (src/pages/Legal.tsx RETURNS; facts only,
      // never invented terms): the limited-edition and framed / hand-finished
      // The per-tier returns reality is mixed (most prints are made-to-order
      // and reg-28 exempt from the 14-day change-of-mind right, but Legal.tsx
      // documents the statutory right where it applies) — so NO blanket
      // returnPolicyCategory is declared here: a single category on an
      // AggregateOffer spanning all tiers would be false for one of them
      // (gate finding 2026-06-12). Defect handling + the full policy link
      // carry the truthful, tier-independent facts.
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "GB",
        itemDefectReturnFees: "https://schema.org/FreeReturn",
        merchantReturnLink: absoluteUrl("/returns"),
      },
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

  // The original work as a VisualArtwork, linked to the artist Person node — so
  // Google understands the catalogue as fine art by a named creator, not just a
  // poster SKU. Every field is sourced from paintings.ts; dateCreated + the
  // dimensions are gated so we never emit a placeholder year or a 1×1 fallback.
  // artMedium is deliberately omitted (it varies per work — do not invent).
  const visualArtworkJsonLd = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: painting.title,
    creator: { "@id": `${SITE_URL}/#person` },
    artform: "Mandala painting",
    image: absoluteUrl(ogImagePath),
    url: absoluteUrl(paintingPath),
    ...(artworkYear ? { dateCreated: artworkYear } : {}),
    ...(artworkDims
      ? {
          width: {
            "@type": "QuantitativeValue",
            value: artworkDims.w,
            unitCode: "CMT",
            unitText: "cm",
          },
          height: {
            "@type": "QuantitativeValue",
            value: artworkDims.h,
            unitCode: "CMT",
            unitText: "cm",
          },
        }
      : {}),
  };

  return (
    // overflow-x-clip (NOT overflow-hidden): clips horizontal overflow without
    // creating a scroll container, so the sticky painting (below) still works.
    // overflow-hidden here silently disabled position:sticky and left a large
    // dark void beside the buy box on desktop. html/body already clip the X axis.
    <div className="relative overflow-x-clip">
      <Seo
        title={pageTitleText}
        description={metaDescription}
        url={paintingPath}
        image={ogImagePath}
        type="product"
        jsonLd={[productJsonLd, visualArtworkJsonLd, breadcrumbJsonLd]}
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
              // -w480 variant — blurred + veiled, so full-res here was pure
              // wasted transfer (the hero <picture> no longer fetches it either).
              backgroundImage: `url("${ambientBackdropUrl(selected.image)}")`,
            }}
          />
        </AnimatePresence>
        <div className="painting-detail__ambient-veil" />
      </div>

      <div className="relative z-[1] isolate">
        <Nav />

        <main className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-4 md:pt-6 pb-14 md:pb-16">
          {/* Back link + jump-to-order strip — price floor stays visible from
              the top; the CTA scrolls to the buy box rather than duplicating
              the purchase actions (basket flow is the single source of truth). */}
          <div className="flex items-center justify-between gap-4 mb-5 md:mb-6">
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
                {fmtP(pricePence)}
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
          <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-6 lg:gap-14 xl:gap-20 items-start">
            {/* LEFT — painting image. Sticky on desktop so it stays in view
                while the buy box scrolls. Click opens the fullscreen lightbox. */}
            <div className="lg:sticky lg:top-[88px]">
              {/* View toggle — the artwork, or the True Size room view (#11).
                  Shown ONLY when this painting has a real room composite (see
                  TRUESIZE_PAINTING_IDS); otherwise hidden so the buyer never
                  hits the "coming soon" placeholder on an expensive page. */}
              {TRUESIZE_PAINTING_IDS.has(painting.id) && (
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
              )}
              {view === "true-size" ? (
                <TrueSizeViewer
                  painting={painting}
                  sizeTiers={sizeTiers}
                  selectedTier={selectedTier}
                  onSelectTier={setSelectedTierId}
                />
              ) : (
              <>
              <Reveal>
                <div className="relative overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setViewerOpen(true)}
                    aria-label="Explore the painting in detail"
                    data-cursor-label="Closer look"
                    className="block w-full bg-transparent border-0 p-0 cursor-zoom-in"
                  >
                    <AnimatePresence mode="popLayout">
                      <motion.picture
                        key={selected.image}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
                        className="block w-full"
                      >
                        {/* Responsive variants (#perf): webpSrcSet advertises the
                            -w480/-w800/-w1200/-w1600 siblings + the ~2000w full
                            webp, with an honest sizes attr (the image fills
                            ~92vw of a phone, ~55% of the container on lg+). A
                            390w DPR-2 phone now fetches -w800 (~107–261KB)
                            instead of the 0.4–1.27MB full-res file; retina
                            desktop still reaches the 2000w candidate. CloserLook
                            does its own progressive load (-w800 → full-res), so
                            the hero no longer needs to warm the full-res cache. */}
                        <source
                          srcSet={webpSrcSet(selected.image) ?? asset(webp(selected.image))}
                          sizes="(min-width: 1024px) 55vw, 92vw"
                          type="image/webp"
                        />
                        {/* Height-capped + centred so a square/portrait painting
                            never exceeds ~78% of the viewport. Without the cap a
                            square painting rendered full-width was ~940px tall on
                            tablet/half-screen widths — taller than the viewport —
                            pushing the price + buy controls 2+ screens down. On
                            lg+ the image sits in its ~600px column unchanged. */}
                        <img
                          ref={heroImgRef}
                          src={asset(selected.image)}
                          alt={paintingImageAlt(painting.title, selected.name)}
                          width={heroDims.w}
                          height={heroDims.h}
                          className="block mx-auto h-auto w-auto max-w-full max-h-[64vh] lg:max-h-[calc(100vh-88px-2rem)] 2xl:max-h-[86vh]"
                        />
                      </motion.picture>
                    </AnimatePresence>
                  </button>
                </div>
              </Reveal>
              {/* Closer-look affordance — the quiet invitation under the
                  artwork: a hairline-bordered pill in the muted register. Opens
                  the same viewer the artwork itself opens. */}
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setViewerOpen(true)}
                  className={cn(
                    EYEBROW_TIGHT,
                    "inline-flex items-center gap-2.5 bg-transparent cursor-pointer rounded-full ring-1 ring-line px-4 py-2 transition-all duration-300 hover:text-ink hover:ring-ink/40",
                  )}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                    className="shrink-0"
                  >
                    <path
                      d="M6 1.5v9M1.5 6h9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  Take a closer look
                </button>
              </div>
              </>
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
          <div className="mt-12 md:mt-14">
            <Separator className="bg-line mb-8 max-w-[720px] 2xl:max-w-[820px] 3xl:max-w-[920px] 4xl:max-w-[1040px] mx-auto" />
            <Story painting={painting} />
            <ProvenancePanel />
          </div>
        </main>
        {/* Exhibited & commissioned — Stephen's real, documented provenance
            (Majlis Gallery · Farmacy/Fayed · Force India · 1,200 hospices).
            For a cold-start estate with no reviews yet, this is the legitimate
            trust signal that underwrites a £245–£1,750 purchase; it was built
            but mounted nowhere (audit fix). Quiet, reverent, text-only. */}
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

      {/* Closer-look viewer — opens from the artwork (or its caption) and always
          shows the SELECTED colourway's full-resolution source. When the
          colourway picker changes while it's open, `selected.image` updates and
          the viewer re-fits the new colourway. */}
      <CloserLook
        open={viewerOpen}
        onClose={closeViewer}
        imageSrc={selected.image}
        alt={`${painting.title} — ${selected.name}, full-resolution detail`}
        paintingTitle={painting.title}
        colourwayName={selected.name}
        sourceImgRef={heroImgRef}
      />
    </div>
  );
};
