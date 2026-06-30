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
import { Separator } from "../components/ui/separator";
import { AuthenticationCard } from "../components/AuthenticationCard";
import { ReassuranceRow } from "../components/ReassuranceRow";
import { ProvenancePanel } from "../components/ProvenancePanel";
import { CredentialsStrip } from "../components/CredentialsStrip";
import { DimensionChip } from "../components/DimensionChip";
import { CloserLook } from "../components/CloserLook";
import { EnquireModal } from "../components/EnquireModal";
import { Reviews } from "../components/Reviews";
import { AssetImage } from "../components/AssetImage";
import {
  COLLECTIONS,
  PAINTINGS,
  EMBELLISHMENT_NOTE,
  ESTATE_AUTHENTICATION,
  FRAME_STYLES,
  GLAZING_OPTIONS,
  DEFAULT_FRAME_STYLE,
  DEFAULT_GLAZING,
  getAnchorTier,
  getEmbellishmentPricePence,
  getFramingPricePence,
  getLowestTierPricePence,
  getPaintingById,
  getPaintingsByCollection,
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
import { useConsent } from "../lib/consent";
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
} from "../components/ui/tokens";
import { Seo } from "../components/Seo";
import { SITE_URL, absoluteUrl, firstSentence } from "../lib/seo";

// Frame-ready dimensions — append inches to a "… (42 × 42 cm)" size string so
// international buyers (US/CA/AU) can match a standard off-the-shelf frame
// without doing the maths. Display-only; derived from parseSizeCm so it can
// never drift from the canonical cm. "A2 (42 × 42 cm)" → "… cm · 16.5 × 16.5 in)".
const cmToIn = (cm: number) => Math.round((cm / 2.54) * 10) / 10;
const sizeWithInches = (size: string): string => {
  const d = parseSizeCm(size);
  if (!d) return size;
  return size.replace(/\)\s*$/, ` · ${cmToIn(d.w)} × ${cmToIn(d.h)} in)`);
};

// Rolling ~12-month price-validity horizon for the Product Offer JSON-LD
// (Rich Results recommended field — keeps the cached price from looking stale).
// Computed ONCE at module load (a date ~1yr out, refreshed each deploy/session)
// so it stays pure during render — `Date.now()` in the component body trips the
// react-hooks/purity rule and the value sits after the early returns anyway. It
// carries no money value, so it can't drift from the pricing mirror (gotcha #9).
const PRICE_VALID_UNTIL = new Date(Date.now() + 365 * 864e5)
  .toISOString()
  .slice(0, 10);

// True-Size room view needs composited room photos in /public/img/truesize/,
// one per colourway × A-size, keyed by the colourway's image stem
// (e.g. peacock-persian-indigo-a2.jpg + .webp — see scripts/truesize-compose.mjs).
// The "True size" toggle is gated to this allowlist so a painting whose assets
// aren't generated yet stays on the artwork view rather than offering a "To
// scale · coming soon" dead-end on a £245–£1,750 page (audit fix). ⚠️HUGO: add a
// painting id here the moment its room composites land, and the toggle self-enables.
const TRUESIZE_PAINTING_IDS = new Set<string>([
  "english-bluebells", "wild-rose", "orchis-7", "flower-of-life",
  "slipper-orchids", "peacock-minerva", "ophiuchus", "tridecagon-moon-star",
  "lulin", "enneagon-swans",
]);

/* =============================================================================
 * MONOCHROME CTAs (#7) — local, accent-free button recipes.
 * -----------------------------------------------------------------------------
 * The shared BTN_PRIMARY / BTN_SECONDARY tokens resolve their hover to the
 * orange accent (bg-accent / ring-accent / text-accent). This product page is
 * strictly monochrome, so it uses these local ink-only variants instead of the
 * shared tokens — same geometry/typography, hover expressed as an ink wash, no
 * colour. (The shared tokens stay accent-toned for the rest of the site.)
 * ========================================================================== */
// The PDP buy-box title cut — PDP-NATIVE, never the shared centered-section
// TITLE token (clamp(40px,5.7vw,92px), opsz-144 master), which renders ~75–85px
// and wraps long titles to 3 lines in this ~450px column, dwarfing the price.
// This is the museum wall-label idiom: the work's name in TRUE Fraunces italic
// at a controlled opsz 40 (clean strokes, gotcha #7), one tier above the price.
const PDP_TITLE =
  "font-display italic font-semibold tracking-[-0.02em] text-[clamp(28px,3.1vw,46px)] leading-[1.06] text-ink text-balance";
// One ledger-card geometry for every secondary buy-box card (one-off / custom
// size / colourway set / finish) so the column reads as one authored system.
const CARD = "ring-1 ring-line px-5 py-5";
const BTN_PRIMARY =
  "inline-flex items-center justify-center bg-ink text-bg px-7 py-[18px] font-sans text-[15px] md:text-[16px] font-semibold tracking-[0.02em] rounded-full transition-colors duration-300 hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60";
const BTN_SECONDARY =
  "inline-flex items-center justify-center ring-1 ring-ink/30 text-ink px-7 py-[18px] font-sans text-[15px] md:text-[16px] font-semibold tracking-[0.02em] rounded-full transition-all duration-300 hover:ring-ink/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

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

/**
 * WAI-ARIA radio-group keyboard pattern (#8): one tab stop per group (roving
 * tabindex), Arrow/Home/End move + select, focus follows. Robust to wrapper
 * markup — focuses the next [role=radio] within the closest radiogroup by DOM
 * order. Callers add tabIndex={selected ? 0 : -1} + onKeyDown to each radio.
 */
const onRadioKey = (
  e: React.KeyboardEvent<HTMLElement>,
  count: number,
  index: number,
  pick: (next: number) => void,
) => {
  let next: number;
  switch (e.key) {
    case "ArrowRight":
    case "ArrowDown":
      next = (index + 1) % count;
      break;
    case "ArrowLeft":
    case "ArrowUp":
      next = (index - 1 + count) % count;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = count - 1;
      break;
    default:
      return;
  }
  e.preventDefault();
  pick(next);
  const group = e.currentTarget.closest('[role="radiogroup"]');
  const el = group?.querySelectorAll('[role="radio"]')[next];
  if (el instanceof HTMLElement) el.focus();
};

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
  <div role="radiogroup" aria-label="Print size" className="grid grid-cols-1 gap-0 border-b border-line">
    {tiers.map((tier, i) => {
      const isSelected = tier.id === selectedTier.id;
      return (
        <button
          key={tier.id}
          type="button"
          role="radio"
          aria-checked={isSelected}
          tabIndex={isSelected ? 0 : -1}
          onKeyDown={(e) => onRadioKey(e, tiers.length, i, (n) => onSelectTier(tiers[n].id))}
          onClick={() => onSelectTier(tier.id)}
          className={cn(
            "relative grid grid-cols-[1fr_auto] items-center gap-x-4 text-left bg-transparent border-0 border-t border-line px-1 py-4 cursor-pointer transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
            isSelected
              ? "border-l-2 border-l-ink pl-3 bg-ink/[0.03]"
              : "hover:bg-ink/[0.02]",
          )}
        >
          <span className="min-w-0">
            <span className={cn(EYEBROW_TIGHT, "flex items-center gap-2 mb-1")}>
              {tier.label}
              {tier.isAnchor && (
                <span className="font-sans text-[9.5px] font-semibold tracking-[0.04em] text-ink/80">
                  · most chosen
                </span>
              )}
            </span>
            <span className="block font-sans text-[15px] font-semibold leading-[1.25] text-ink">
              {sizeWithInches(tier.size)}
            </span>
            <span className={cn(META, "block mt-0.5")}>{tier.editionLabel}</span>
          </span>
          <span
            className={cn(
              "font-display font-semibold tracking-[-0.01em] text-ink justify-self-end",
              isSelected ? "text-[22px]" : "text-[19px]",
            )}
            style={{ fontVariationSettings: '"opsz" 28, "wght" 600', fontFeatureSettings: '"tnum" 1, "lnum" 1' }}
          >
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
      <span className="font-sans text-[11px] font-bold tracking-[0.04em] text-ink-muted">
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
      <p className={cn(META, "m-0 mb-8")} role="status" aria-live="polite">
        Noted, with thanks — we&rsquo;ll write to you first.
      </p>
    );
  }

  return (
    <div className="mb-8">
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
              className="flex-1 min-w-0 bg-transparent px-3 py-2.5 font-sans text-[16px] text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="shrink-0 bg-transparent border-0 border-l border-line px-4 font-sans text-[11px] font-bold tracking-[0.04em] text-ink cursor-pointer hover:bg-ink/5 transition-colors disabled:opacity-50"
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

/**
 * CustomSizeRequest — the BESPOKE option above the standard A3–A0 editions
 * (Hugo: "add custom size order request as the highest pricing option that auto
 * pings to my email"). Not a purchasable tier — there is no fixed price — so it
 * renders as a distinct feature card BELOW the size grid (reading as the option
 * beyond A0), expanding inline to a short request form. On submit it POSTs to
 * /api/newsletter-subscribe with kind:"custom-size" — the handler is FOLDED INTO
 * that function (NOT its own file) to stay within Vercel's Hobby 12-Serverless-
 * Function cap; it emails the estate inbox so the request pings Hugo directly and
 * he can reply with a quotation. Friendly-success contract mirrors
 * RegisterOriginalInterest: only a network failure shows an error.
 */
const CustomSizeRequest = ({
  paintingId,
  paintingTitle,
  colourwayName,
}: {
  paintingId: string;
  paintingTitle: string;
  colourwayName: string;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot — humans leave empty
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    try {
      // POSTs to the shared newsletter endpoint with kind:"custom-size" — the
      // custom-size handler is folded into that function to stay within Vercel's
      // Hobby 12-Serverless-Function cap (a standalone 13th /api file fails the
      // whole deploy). The estate is emailed the request (replyTo the buyer).
      await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "custom-size",
          name: name.trim(),
          email: trimmedEmail,
          paintingId,
          paintingTitle,
          colourwayName,
          dimensions: dimensions.trim(),
          message: message.trim(),
          company,
        }),
      });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  const fieldId = (k: string) => `custom-${k}-${paintingId}`;
  const INPUT =
    "w-full bg-transparent ring-1 ring-line focus:ring-ink/40 px-3 py-2.5 font-sans text-[16px] text-ink placeholder:text-ink-faint focus:outline-none transition-shadow";

  return (
    <div className="mt-3">
      <div
        className={cn(
          "relative w-full ring-1 transition-all duration-300",
          open
            ? "ring-ink/40 shadow-[0_4px_22px_rgba(0,0,0,0.4)]"
            : "ring-line hover:ring-ink/40",
        )}
      >
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="block w-full text-left bg-transparent p-5 cursor-pointer"
          >
            <span className="flex items-baseline justify-between gap-4 mb-2">
              <span className="font-sans text-[11px] font-bold tracking-[0.04em] text-ink-muted">
                Bespoke · by request
              </span>
              <span className="font-display font-semibold tracking-[-0.01em] text-[18px] text-ink whitespace-nowrap">
                Price on application
              </span>
            </span>
            <span className="block font-sans text-[15px] font-semibold leading-[1.3] text-ink mb-1">
              Custom size
            </span>
            <span className={cn(META, "block mb-3")}>
              Larger than A0, or a bespoke format for a particular wall. Tell the
              estate the size you have in mind and we&rsquo;ll write back with a
              quotation.
            </span>
            <span
              className={cn(
                META,
                "inline-flex items-center underline underline-offset-4 text-ink",
              )}
            >
              Request a custom size →
            </span>
          </button>
        ) : status === "done" ? (
          <div className="p-5" role="status" aria-live="polite">
            <p className="font-sans text-[11px] font-bold tracking-[0.04em] text-ink-muted m-0 mb-2">
              Custom size · by request
            </p>
            <p className="font-sans text-[15px] leading-[1.5] text-ink m-0">
              Request received, with thanks. The estate will write to you with a
              quotation for a custom{paintingTitle ? ` ${paintingTitle}` : ""}{" "}
              print.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="p-5">
            <p className="font-sans text-[11px] font-bold tracking-[0.04em] text-ink-muted m-0 mb-1">
              Custom size · by request
            </p>
            <p className={cn(META, "m-0 mb-4")}>
              {paintingTitle}
              {colourwayName ? ` · ${colourwayName}` : ""}
            </p>

            {/* Honeypot — off-screen; bots fill it, humans don't. */}
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="absolute left-[-9999px] w-px h-px opacity-0"
            />

            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor={fieldId("size")} className={cn(META, "block mb-1.5")}>
                  Size you have in mind
                </label>
                <input
                  id={fieldId("size")}
                  type="text"
                  placeholder="e.g. 120 × 120 cm, or describe the wall"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  className={INPUT}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor={fieldId("name")} className={cn(META, "block mb-1.5")}>
                    Your name <span className="text-ink-faint">(optional)</span>
                  </label>
                  <input
                    id={fieldId("name")}
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor={fieldId("email")} className={cn(META, "block mb-1.5")}>
                    Email
                  </label>
                  <input
                    id={fieldId("email")}
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={INPUT}
                  />
                </div>
              </div>
              <div>
                <label htmlFor={fieldId("message")} className={cn(META, "block mb-1.5")}>
                  Anything else <span className="text-ink-faint">(optional)</span>
                </label>
                <textarea
                  id={fieldId("message")}
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={cn(INPUT, "resize-y")}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <button
                type="submit"
                disabled={status === "sending"}
                className={BTN_PRIMARY}
              >
                {status === "sending" ? "Sending…" : "Send request"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="bg-transparent border-0 cursor-pointer font-sans text-[13px] text-ink-muted underline underline-offset-4 hover:text-ink transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className={cn(META, "m-0 mt-3")} aria-live="polite">
              {status === "error"
                ? "That didn't send — check the address, or email info@themandalacompany.com."
                : "Goes straight to the estate. We reply by email with a quotation — no obligation."}
            </p>
          </form>
        )}
      </div>
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
          {availableColourways.map((c, i) => {
            const isSelected = c.name === selected.name;
            return (
              <motion.button
                key={c.name}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={c.name}
                title={c.name}
                tabIndex={isSelected ? 0 : -1}
                onKeyDown={(e) => onRadioKey(e, availableColourways.length, i, (n) => onSelect(availableColourways[n].name))}
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
                {/* Hover-name tooltip — guarded to wide screens with a FINE
                    pointer (mouse). On touch / narrow widths it clipped at the
                    column edge and overlapped the copy, and a hover bubble has
                    no meaning without a cursor anyway; the selected colourway
                    already prints in the caption below, so nothing is lost.
                    `hidden` by default, shown only on sm+ AND (pointer:fine). */}
                <span
                  aria-hidden="true"
                  className="hidden sm:[@media(pointer:fine)]:block pointer-events-none absolute left-1/2 -translate-x-1/2 -top-9 whitespace-nowrap bg-bg px-2.5 py-1 font-sans text-[11px] font-bold tracking-[0.04em] text-ink rounded-full ring-1 ring-line opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
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
          <span className="ml-3 font-sans text-[11px] font-bold tracking-[0.04em] text-ink-muted">
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
  colourwayImage,
}: {
  painting: Painting;
  sizeTiers: PrintTier[];
  selectedTier: PrintTier;
  onSelectTier: (id: PrintTier["id"]) => void;
  /** The selected colourway's source image — so the wall view shows the SAME
   *  colourway the buyer is looking at. Room files are keyed by this stem. */
  colourwayImage?: string;
}) => {
  const reduceMotion = useReducedMotion();
  // Only standard A-size tiers can be shown to scale (a one-off / non-A size
  // has no room photo slot). Fall back to the first such tier if the currently
  // selected tier isn't a standard A-size.
  const scaleTiers = sizeTiers.filter((t) => trueSizeSlug(t) !== null);
  const activeTier =
    trueSizeSlug(selectedTier) !== null ? selectedTier : scaleTiers[0];
  if (!activeTier) return null;

  const dims = parseSizeCm(activeTier.size);

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
        {scaleTiers.map((t, i) => {
          const isActive = t.id === activeTier.id;
          const token = t.size.split(" ")[0];
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={(e) => onRadioKey(e, scaleTiers.length, i, (n) => onSelectTier(scaleTiers[n].id))}
              onClick={() => onSelectTier(t.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-full font-sans text-[10px] font-bold tracking-[0.04em] transition-colors",
                isActive ? "bg-ink text-bg" : "text-ink/55 hover:text-ink",
              )}
            >
              {token}
            </button>
          );
        })}
      </div>

      <TrueSizeRoom
        key={`${painting.id}-${activeTier.id}`}
        colourwayImage={colourwayImage}
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
 * TrueSizeRoom — the print shown at EXACT real-world scale on a wall, with a
 * 3-seater sofa drawn at true scale as a SAME-DEPTH reference, so the size reads
 * truthfully. (The old deep-perspective room photos compared a far-wall print
 * against a big foreground candle/table — perspective shrank every print and it
 * read as stamped-on.) Rendered purely from the real painting image + cm, so it
 * works for every painting/size/colourway, the proportions are mathematically
 * exact, there's ONE soft contact shadow, and nothing looks pasted-on.
 *
 * The scene is a 280×210cm slice of wall in a 4:3 box (280:210 = 4:3 → uniform
 * px/cm on both axes, so a square print renders square and the sofa + print
 * share ONE scale). The print hangs a hand's-width above the sofa back; toggling
 * A3→A0 grows it live against the fixed sofa, which is the whole point.
 */
const TrueSizeRoom = ({
  colourwayImage,
  reduceMotion,
  painting,
  tier,
}: {
  colourwayImage?: string;
  reduceMotion: boolean;
  painting: Painting;
  tier: PrintTier;
}) => {
  const dims = parseSizeCm(tier.size);
  const SCENE_W = 280;
  const SCENE_H = 210;
  const SOFA_W = 200; // a standard 3-seater — the universally readable reference
  const SOFA_H = 82;
  const pctW = (cm: number) => (cm / SCENE_W) * 100;
  const pctH = (cm: number) => (cm / SCENE_H) * 100;
  const printBottomCm = SOFA_H + 26; // hang a hand-width above the sofa back

  if (!dims || !colourwayImage) {
    return (
      <div className="relative w-full aspect-[4/3] overflow-hidden ring-1 ring-line bg-ink/[0.03] flex items-center justify-center text-center px-6">
        <p className={cn(EYEBROW_MUTED, "m-0")}>{tier.size}</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full aspect-[4/3] overflow-hidden ring-1 ring-line"
      style={{
        background:
          "radial-gradient(90% 70% at 50% 6%, rgba(255,250,240,0.07), rgba(255,250,240,0) 58%), linear-gradient(180deg, #524b41 0%, #463f36 58%, #3a342c 100%)",
      }}
      aria-label={`${painting.title} at ${tier.size}, shown to true scale above a 200cm sofa`}
    >
      {/* Floor — a quieter warm band the sofa stands on, with a hairline where it
          meets the wall, so the scene reads as a real corner of a room. */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: `${pctH(26)}%`,
          background: "linear-gradient(180deg, #322c25, #28231d)",
          boxShadow: "inset 0 1px 0 rgba(255,250,240,0.06)",
        }}
      />
      {/* Sofa — drawn at TRUE 200cm scale at the SAME depth as the print: the
          reference the eye measures the print against. Soft filled silhouette. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 82"
        preserveAspectRatio="xMidYMax meet"
        className="absolute"
        style={{
          width: `${pctW(SOFA_W)}%`,
          left: "50%",
          bottom: 0,
          transform: "translateX(-50%)",
        }}
      >
        <defs>
          <linearGradient id="ts-sofa" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2f2922" />
            <stop offset="1" stopColor="#1d1813" />
          </linearGradient>
        </defs>
        <g fill="url(#ts-sofa)">
          <rect x="2" y="20" width="30" height="54" rx="13" />
          <rect x="168" y="20" width="30" height="54" rx="13" />
          <rect x="12" y="4" width="176" height="44" rx="13" />
          <rect x="8" y="42" width="184" height="32" rx="11" />
          <rect x="22" y="72" width="9" height="9" rx="2" />
          <rect x="169" y="72" width="9" height="9" rx="2" />
        </g>
        {/* a whisper of light on the back top edge → form, not a flat blob */}
        <rect x="14" y="5" width="172" height="3" rx="1.5" fill="rgba(255,250,240,0.07)" />
      </svg>
      {/* The print — the REAL painting at its exact printed size, with ONE soft
          contact shadow (down + a touch right) so it reads as a canvas standing
          a few cm off the wall, never a sticker. Grows live when the size
          toggles, against the fixed sofa. */}
      <div
        className={cn(
          "absolute ring-1 ring-black/25",
          reduceMotion ? "" : "transition-all duration-500 ease-smooth",
        )}
        style={{
          width: `${pctW(dims.w)}%`,
          aspectRatio: `${dims.w} / ${dims.h}`,
          left: "50%",
          bottom: `${pctH(printBottomCm)}%`,
          transform: "translateX(-50%)",
          boxShadow:
            "0 calc(0.5vw + 5px) calc(1.4vw + 13px) -8px rgba(0,0,0,0.6), 0 2px 6px -2px rgba(0,0,0,0.45)",
        }}
      >
        <picture>
          <source srcSet={asset(webp(colourwayImage))} type="image/webp" />
          <img
            src={asset(colourwayImage)}
            alt={`${painting.title} printed at ${tier.size}, to scale on a wall above a sofa`}
            className="block h-full w-full object-cover"
          />
        </picture>
      </div>
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
  frameStyle,
  glazing,
  onFramingChange,
  onEmbellishedChange,
  onFrameStyleChange,
  onGlazingChange,
  orderSentinelRef,
  orderEndSentinelRef,
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
  frameStyle: string;
  glazing: string;
  onFramingChange: (next: boolean) => void;
  onEmbellishedChange: (next: boolean) => void;
  onFrameStyleChange: (next: string) => void;
  onGlazingChange: (next: string) => void;
  orderSentinelRef: React.RefObject<HTMLDivElement | null>;
  /** END-of-order sentinel — see StickyAddBar. Sits after the final buy
   * control so the floating bar stays suppressed for the WHOLE time any buy
   * affordance is on screen, not just at the top of the order block. */
  orderEndSentinelRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const { formatPretty: fmtP, code: currencyCode } = useCurrency();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [enquireOpen, setEnquireOpen] = useState(false);
  // The confirmation pill records *which* selection was last added + when.
  // Switching painting/colourway/tier silently invalidates a stale one.
  const [addedFor, setAddedFor] = useState<{
    paintingId: string;
    colourway: string;
    tierId: PrintTier["id"];
    at: number;
  } | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  // The "complete colourway set" CTA does a MULTI-add, so the global basket
  // toast (which titles itself off a single line) under-reads it — give it its
  // own local confirmation pill, the same grammar as the primary CTA's.
  const [colourwaySetAdded, setColourwaySetAdded] = useState(false);
  const setFadeTimerRef = useRef<number | null>(null);

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
  // hand-finishing 2 wks. Nothing selected → the standard print lead time.
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
    if (setFadeTimerRef.current !== null) window.clearTimeout(setFadeTimerRef.current);
  }, []);

  const onAdd = () => {
    addItem(
      painting.id,
      selected.name,
      selectedTier.id,
      framingActive,
      embellishActive,
      framingActive ? frameStyle : undefined,
      framingActive ? glazing : undefined,
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

  const onAddColourwaySet = () => {
    if (!colourwaySet) return;
    colourwaySet.colourwayNames.forEach((name) =>
      addItem(painting.id, name, selectedTier.id),
    );
    // One AddToCart for the set (at its bundle price) — parity with onAdd, which
    // fires it for a single print; the set path previously fired none.
    trackAddToCart(
      { id: painting.id, title: painting.title },
      colourwaySet.bundlePricePence,
    );
    setColourwaySetAdded(true);
    if (setFadeTimerRef.current !== null) window.clearTimeout(setFadeTimerRef.current);
    setFadeTimerRef.current = window.setTimeout(() => {
      setColourwaySetAdded(false);
      setFadeTimerRef.current = null;
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
          ...(framingActive ? { frameStyle, glazing } : {}),
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
      {/* 1 · COLLECTION OVERLINE + TITLE (h1) + ARTIST BYLINE. The gallery
          wall-label idiom: a bare tracked series overline (no pill), the work's
          name in TRUE Fraunces italic (PDP_TITLE), then the artist + life-dates
          byline in roman — restoring the title → artist → facts hierarchy. */}
      {collection && (
        <p className="font-sans text-[11px] font-bold tracking-[0.04em] text-ink-muted m-0 mb-3">
          {collection.title.split(" — ")[0]}
        </p>
      )}
      <h1
        className={cn(PDP_TITLE, "m-0 mb-2")}
        style={{ fontVariationSettings: '"opsz" 40, "wght" 600' }}
      >
        {painting.title}
      </h1>
      <p className="font-sans text-[15px] tracking-[0.01em] text-ink m-0 mb-7">
        Stephen Meakin <span className="text-ink-muted">· 1966&ndash;2021</span>
      </p>

      {/* 2 · KEY FACTS — a legible wall-label spec table: one value size + tone,
          11px cap-labels baseline-aligned to the value, generous row rhythm. */}
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 m-0 mb-3">
        {painting.year !== "[ DATE ]" && (
          <>
            <dt className={cn(EYEBROW_TIGHT, "pt-[3px]")}>Date</dt>
            <dd className="m-0 font-sans text-[15px] leading-[1.55] text-ink">{painting.year}</dd>
          </>
        )}
        {painting.size && (
          <>
            <dt className={cn(EYEBROW_TIGHT, "pt-[3px]")}>Size</dt>
            <dd className="m-0 font-sans text-[15px] leading-[1.55] text-ink">{painting.size}</dd>
          </>
        )}
        {painting.location && (
          <>
            <dt className={cn(EYEBROW_TIGHT, "pt-[3px]")}>Painted in</dt>
            <dd className="m-0 font-sans text-[15px] leading-[1.55] text-ink">{painting.location}</dd>
          </>
        )}
        {painting.pigmentNote && (
          <>
            <dt className={cn(EYEBROW_TIGHT, "pt-[3px]")}>Pigment</dt>
            <dd className="m-0 font-sans text-[15px] leading-[1.55] text-ink-muted">{painting.pigmentNote}</dd>
          </>
        )}
        <dt className={cn(EYEBROW_TIGHT, "pt-[3px]")}>Original</dt>
        <dd className="m-0 font-sans text-[15px] leading-[1.55] text-ink-muted">{ORIGINAL_PROVENANCE}</dd>
      </dl>

      {/* Hushed register for the privately-held original — sits directly
          under the provenance fact it relates to. */}
      <RegisterOriginalInterest paintingId={painting.id} />

      <Separator className="bg-line mb-6" />

      {/* #order-print anchor + sentinel — StickyAddBar's IntersectionObserver
          tracks this element, so it must stay with the buy controls. */}
      <div id="order-print" className="scroll-mt-24">
        <div ref={orderSentinelRef} aria-hidden="true" className="h-px w-full" />

        {/* 3 · PRICE (tracks the selected size tier). The eyebrow EARNS the
            price by stating the format/edition truth (the CTAs already say
            "order"); the figure reads as a co-lead with the title — opsz 40 +
            tabular-lining numerals so stacked prices align. Monochrome (#7):
            size/weight carries the hierarchy, never colour. */}
        <p className={cn(EYEBROW_MUTED, "m-0 mb-3")}>
          {selectedTier.label} · {selectedTier.size.split(" ")[0]}
        </p>
        {/* The price figure stands ALONE on its baseline — size is already
            stated by the eyebrow above and the DimensionChip below, so the old
            sizeWithInches restatement on the price's baseline (which competed
            with the opsz-40 figure) was removed. */}
        <div className="mb-3">
          <p
            className="font-display font-semibold tracking-[-0.015em] text-[clamp(34px,3vw,52px)] text-ink m-0"
            style={{ fontVariationSettings: '"opsz" 40, "wght" 600', fontFeatureSettings: '"tnum" 1, "lnum" 1' }}
          >
            {fmtP(selectedTier.pricePence)}
          </p>
        </div>

        {/* Free delivery — quiet sentence-case reassurance beside the price (was
            a third stacked all-caps eyebrow). Mirrors the £0 rate api/checkout.ts
            charges in every region; framed or unframed (mirror invariant #9). */}
        <p className={cn(META, "m-0 mb-6")}>Free delivery worldwide.</p>

        {/* Dimension chip — instant size reassurance, updates with the tier. */}
        <div className="mb-6">
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

        {/* CUSTOM SIZE — the bespoke option ABOVE the standard editions (Hugo's
            "highest pricing option"). Price on application; submitting pings the
            estate inbox via /api/newsletter-subscribe (kind:"custom-size" — the
            handler is folded into that function to stay under Vercel's 12-function
            cap). Not a purchasable tier, so it sits as a feature card below the
            size grid. */}
        <CustomSizeRequest
          paintingId={painting.id}
          paintingTitle={painting.title}
          colourwayName={selected.name}
        />

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
          <div className={cn("mt-8", CARD)}>
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
              onClick={onAddColourwaySet}
              className={BTN_PRIMARY}
            >
              Add the complete set
              <span aria-hidden="true" className="ml-2">→</span>
            </button>
            {/* Local confirmation — reserves space (always-rendered, opacity-only)
                so the layout never jumps, matching the primary CTA's pill. */}
            <p
              aria-live="polite"
              className={cn(
                "mt-2.5 font-sans text-[13px] tracking-[0.04em] text-ink-muted m-0 transition-opacity duration-500",
                colourwaySetAdded ? "opacity-100" : "opacity-0",
              )}
            >
              {colourwaySetAdded ? (
                <>
                  Complete set added —{" "}
                  <Link
                    to="/basket"
                    className="text-ink-muted underline underline-offset-4 hover:text-ink transition-colors"
                  >
                    view basket
                  </Link>
                </>
              ) : (
                " "
              )}
            </p>
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
          <fieldset className={cn("border-0 m-0 mt-8", CARD)}>
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
                      Made to order by Point 101 in the finish of your choice —
                      solid-wood or contemporary tray frame, with optional
                      anti-reflective museum-grade glazing (all shatter-safe for
                      transit), conservation-mounted and ready to hang. Every
                      finish is included. Allow {FRAME_LEAD_WEEKS} weeks.
                    </span>
                    {/* Free delivery applies to framed prints too — reassurance
                        shown the moment a frame is ticked. There is no framed-
                        shipping surcharge (the estate absorbs delivery), so this
                        is a positive note, not a DMCC drip-pricing disclosure. */}
                    {framingActive && (
                      <span className="font-sans text-[13px] leading-[1.5] text-ink/70 mt-0.5 ring-1 ring-ink/70 px-2.5 py-1.5">
                        Framed and delivered free — UK, Europe and Worldwide.
                        No delivery charge is added at checkout.
                      </span>
                    )}
                  </span>
                </label>
              )}

              {/* FRAMING FINISH PICKERS — frame style + glazing, shown once
                  framing is ticked. Included-in-price preferences (NO upcharge):
                  the choice rides to checkout so the estate orders the right
                  frame from Point 101. OUTSIDE the checkbox <label> so picking a
                  finish never toggles the framing checkbox. Monochrome (#7). */}
              {framingActive && (
                <div className="flex flex-col gap-3 ring-1 ring-line px-4 py-3.5">
                  <p className="font-sans text-[12.5px] leading-[1.5] text-ink/55 m-0">
                    Choose your finish — every option is included, no extra
                    charge.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <span className={cn(EYEBROW_TIGHT, "text-ink/55")}>Frame</span>
                    <div className="flex flex-wrap gap-1.5">
                      {FRAME_STYLES.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => onFrameStyleChange(f.id)}
                          aria-pressed={frameStyle === f.id}
                          title={f.note}
                          className={cn(
                            "inline-flex items-center gap-2 font-sans text-[12.5px] leading-none px-3 py-2 ring-1 transition-all duration-200",
                            frameStyle === f.id
                              ? "ring-ink text-ink"
                              : "ring-line text-ink/60 hover:ring-ink/40 hover:text-ink/85",
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className="h-3.5 w-3.5 rounded-full ring-1 ring-ink/15 shrink-0"
                            style={{ backgroundColor: f.swatch }}
                          />
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className={cn(EYEBROW_TIGHT, "text-ink/55")}>
                      Glazing
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {GLAZING_OPTIONS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => onGlazingChange(g.id)}
                          aria-pressed={glazing === g.id}
                          title={g.note}
                          className={cn(
                            "font-sans text-[12.5px] leading-none px-3 py-2 ring-1 transition-all duration-200",
                            glazing === g.id
                              ? "ring-ink text-ink"
                              : "ring-line text-ink/60 hover:ring-ink/40 hover:text-ink/85",
                          )}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
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

        {/* 7 · CTAs — one dominant action with a quiet ghost beneath (the Aesop
            "single confident action" pattern), full-width so they never wrap
            awkwardly in the narrow column. */}
        <div className="flex flex-col gap-3 mt-8">
          <button
            type="button"
            onClick={onAdd}
            disabled={status === "loading"}
            className={cn(BTN_PRIMARY, "w-full")}
          >
            Add to basket
          </button>
          <button
            type="button"
            onClick={onBuyNow}
            disabled={status === "loading"}
            // Quiet alternate, NOT a co-primary: shorter (!py-3) so the filled
            // "Add to basket" clearly leads (the single-confident-action
            // pattern), but full-ink legible — height carries the hierarchy,
            // not dimmed text. The express path is still one tap.
            className={cn(BTN_SECONDARY, "group w-full !py-3 hover:text-accent disabled:opacity-60")}
          >
            {status === "loading" ? "Opening checkout…" : "Buy now"}
            <span aria-hidden="true" className="ml-2 inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-x-1">→</span>
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

        {/* Made-to-order reassurance — surfaces the REAL 24-hour goodwill
            cancellation window (Legal.tsx "Your right to cancel") so the
            no-returns rule on custom sizes doesn't scare a first-time buyer. */}
        <p className={cn(META, "mt-4 m-0")}>
          Changed your mind?{" "}
          <Link
            to="/returns"
            className="underline underline-offset-4 decoration-ink/60 hover:text-ink transition-colors"
          >
            Cancel free within 24 hours
          </Link>
          , before your print enters production.
        </p>

        {/* A quiet path to ask before committing to a £245–£1,750 piece —
            opens the existing estate enquiry modal, painting-specific. */}
        <button
          type="button"
          onClick={() => setEnquireOpen(true)}
          className={cn(META, "mt-4 inline-flex items-center gap-1.5 underline underline-offset-4 decoration-ink/60 hover:text-ink transition-colors")}
        >
          A question before you order?
          <span aria-hidden="true">→</span>
        </button>

        {/* 8 · AUTHENTICATION + REASSURANCE — structured trust cluster. All
            copy from single-source ESTATE_AUTHENTICATION (inside the card).
            Full provenance + shipping detail live in the ProvenancePanel
            below the Story so the buy box stays tight. */}
        <Separator className="bg-line mt-8 mb-6" />
        <AuthenticationCard />
        <div className="mt-5">
          <ReassuranceRow />
        </div>
        <EnquireModal
          open={enquireOpen}
          onClose={() => setEnquireOpen(false)}
          eyebrow="Prints"
          title="A question before you order?"
          subject={`Enquiry — ${painting.title} (${selected.name}, ${selectedTier.size})`}
          intro="Ask us anything about this piece — paper, colour, framing, sizing, or timing. We're glad to send a higher-resolution preview or talk it through before you order."
        />

        {/* END-of-order sentinel — pairs with the start sentinel at the top of
            this block (#order-print). StickyAddBar suppresses the floating bar
            for the WHOLE span between the two, so it can never reappear over the
            CTA / reassurance / custom-size cluster at the foot of the buy box. */}
        <div ref={orderEndSentinelRef} aria-hidden="true" className="h-px w-full" />
      </div>
    </div>
  );
};

/**
 * Companions from the estate — a quiet cross-sell rail at the foot of a product
 * page. The PDP previously had no pre-purchase sideways path except the
 * desktop-only full FooterCatalogue. Collection-mates first, padded from the
 * wider catalogue, capped at 3 — a multi-item basket then qualifies for the
 * 5–15% bundle discount. Monochrome to match the PDP register; tiles mirror the
 * Basket "Begin with these" pattern.
 */
const CompanionWorks = ({
  painting,
  collectionTitle,
}: {
  painting: Painting;
  collectionTitle?: string;
}) => {
  const { formatPretty: fmtP } = useCurrency();
  const companions = useMemo(() => {
    const mates = getPaintingsByCollection(painting.collection).filter(
      (p) => p.id !== painting.id,
    );
    const fill = PAINTINGS.filter(
      (p) => p.id !== painting.id && p.collection !== painting.collection,
    );
    return [...mates, ...fill].slice(0, 3);
  }, [painting.id, painting.collection]);

  if (companions.length === 0) return null;

  return (
    <Reveal
      as="section"
      className="mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 mt-16 md:mt-20"
    >
      <p className={cn(EYEBROW_MUTED, "m-0 mb-6 text-center")}>
        More from {collectionTitle ?? "the estate"}
      </p>
      <ul className="list-none p-0 m-0 grid grid-cols-3 gap-3 sm:gap-5 md:gap-8">
        {companions.map((p) => {
          const cover =
            p.colourways.find((c) => c.isOriginal) ?? p.colourways[0];
          const fromPence = getLowestTierPricePence(p);
          return (
            <li key={p.id} className="m-0 min-w-0">
              <Link
                to={`/collections/${p.id}`}
                className="group block"
                aria-label={`${p.title} — from ${fmtP(fromPence)}`}
              >
                <div className="relative aspect-square overflow-hidden ring-1 ring-line transition-all duration-500 group-hover:ring-accent/50">
                  <AssetImage
                    src={cover.image}
                    alt={`${p.title} — ${cover.name}`}
                    loading="lazy"
                    decoding="async"
                    sizes="(min-width: 768px) 360px, 30vw"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                  />
                </div>
                <h3 className="font-display font-semibold tracking-[-0.015em] text-[14px] sm:text-[clamp(16px,1vw,22px)] leading-[1.3] text-ink m-0 mt-3 group-hover:text-accent transition-colors duration-300">
                  {p.title}
                </h3>
                <p className="font-sans font-normal text-[clamp(12.5px,0.72vw,15px)] leading-[1.5] text-ink-muted m-0 mt-1">
                  From {fmtP(fromPence)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </Reveal>
  );
};

/**
 * Story — the long-form content read AFTER the buy controls: the artist
 * quote (the one allowed display-italic moment), the full description, and
 * the original-print spec.
 *
 * LAYOUT (Awwwards fill-the-width pass): on lg+ this is an EDITORIAL TWO-COLUMN
 * SPREAD on ONE shared axis with the rest of the page — the artist quote runs
 * full measure as the bold display lead, then the description (primary, wider
 * reading column) sits LEFT with the estate spec blocks ("How each order
 * arrives" + "Original print") as a hairline-framed aside RIGHT. This fills the
 * side-margin voids that the old single centred 720px column left, balances the
 * two columns (long prose ↔ framed spec) and keeps each text at a readable
 * measure. Below lg it stacks in reading order. COPY IS VERBATIM from
 * paintings.ts (artistQuote / description) — never re-typed or reworded.
 */
const Story = ({ painting }: { painting: Painting }) => (
  <div className="max-w-[1180px] 2xl:max-w-[1320px] 3xl:max-w-[1480px] mx-auto">
    {painting.artistQuote && (
      <Reveal as="div" className="max-w-[940px] 2xl:max-w-[1040px]">
        {/* AboutMasthead grammar adapted to the monochrome PDP: a full-measure
            hairline + muted-ink eyebrow, then the artist quote lifted to a
            confident Fraunces statement (opsz ≤48, real italic 400) — the
            page's bold prose header. COPY IS VERBATIM from paintings.ts
            (painting.artistQuote), never re-typed. */}
        <div aria-hidden className="h-px w-full bg-line" />
        <p className={cn(EYEBROW_MUTED, "m-0 mt-5 mb-5")}>In Stephen&rsquo;s words</p>
        <blockquote className="m-0">
          <p
            className="font-display italic font-normal tracking-[-0.015em] text-[clamp(24px,3vw,48px)] leading-[1.26] text-ink m-0 mb-4 text-balance"
            style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}
          >
            &ldquo;{painting.artistQuote}&rdquo;
          </p>
          <cite className={cn(EYEBROW_MUTED, "not-italic block")}>— Stephen Meakin</cite>
        </blockquote>
      </Reveal>
    )}

    {/* TWO-COLUMN EDITORIAL SPREAD — description (primary, left) + estate spec
        aside (right) share one axis and fill the width on lg+. The aside is
        sticky so the eye keeps it while the longer prose scrolls; the grid
        columns are balanced (1.55fr ↔ 1fr) so neither reads half-empty. */}
    <div className="mt-9 md:mt-12 grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-x-12 xl:gap-x-16 gap-y-12 items-start">
      {/* PRIMARY — the painting's own words (verbatim description). Capped at a
          comfortable measure so the line length stays readable even as the
          column widens. */}
      <Reveal
        as="div"
        className="max-w-[68ch] flex flex-col gap-5 md:gap-6 font-sans font-normal text-[clamp(16px,1vw,21px)] md:text-[clamp(17px,1.05vw,22px)] leading-[1.8] text-ink/85"
      >
        {painting.description.split("\n\n").map((para, i) => (
          <p key={i} className="m-0">{para}</p>
        ))}
      </Reveal>

      {/* ASIDE — the estate's quiet ledger: how each order arrives + the
          original-print spec, framed as a hairline card so the right column
          reads as authored, not as leftover empty space. Sticky on lg+. */}
      <Reveal
        as="section"
        className="lg:sticky lg:top-[88px] ring-1 ring-line px-6 py-7 md:px-7 md:py-8"
      >
        {/* HOW EACH ORDER ARRIVES — Hugo's presentation note. Made to order,
            hand-rolled by Point 101, sealed with the wax-seal sticker, posted
            with a printed catalogue. printer line reuses
            ESTATE_AUTHENTICATION.printer verbatim; monochrome ledger idiom. */}
        <p className={cn(EYEBROW_MUTED, "m-0 mb-4")}>How each order arrives</p>
        <p className="font-sans font-normal text-[clamp(15px,0.95vw,18px)] leading-[1.7] text-ink/90 m-0 mb-6">
          Every print is made to order &mdash; never warehoused. When your order
          is placed it is hand-rolled and prepared by Point&nbsp;101 in London,
          the United Kingdom&rsquo;s leading giclée atelier, the same studio
          Stephen trusted with his own work. It is packed to be opened slowly.
        </p>
        <dl className="grid grid-cols-1 gap-y-4 m-0 border-t border-line pt-5">
          <div>
            <dt className={cn(EYEBROW_TIGHT, "mb-1.5")}>Prepared by</dt>
            <dd className="m-0 font-sans text-[15px] leading-[1.55] text-ink">
              {ESTATE_AUTHENTICATION.printer} &mdash; each print checked,
              interleaved and hand-rolled.
            </dd>
          </div>
          <div>
            <dt className={cn(EYEBROW_TIGHT, "mb-1.5")}>Sealed with</dt>
            <dd className="m-0 font-sans text-[15px] leading-[1.55] text-ink">
              The estate&rsquo;s deep-red wax-seal &mdash; the Mandala rose,
              pressed as a sticker over the wrapping.
            </dd>
          </div>
          <div>
            <dt className={cn(EYEBROW_TIGHT, "mb-1.5")}>Enclosed</dt>
            <dd className="m-0 font-sans text-[15px] leading-[1.55] text-ink-muted">
              A printed catalogue of Stephen&rsquo;s paintings, so your piece
              arrives in the company of the wider body of work.
            </dd>
          </div>
        </dl>

        <Separator className="bg-line my-7" />
        <p className={cn(EYEBROW_MUTED, "m-0 mb-3.5")}>Original print</p>
        <p className="font-sans font-normal text-[clamp(15px,0.95vw,18px)] leading-[1.7] text-ink/85 m-0">
          {ORIGINAL_PRINT_SPEC}
        </p>
      </Reveal>
    </div>
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
  frameStyle,
  glazing,
  heroSentinelRef,
  orderSentinelRef,
  orderEndSentinelRef,
}: {
  painting: Painting;
  selected: Colourway;
  selectedTier: PrintTier;
  framing: boolean;
  embellished: boolean;
  frameStyle: string;
  glazing: string;
  heroSentinelRef: React.RefObject<HTMLDivElement | null>;
  orderSentinelRef: React.RefObject<HTMLDivElement | null>;
  orderEndSentinelRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const { formatPretty: fmtP } = useCurrency();
  const reduceMotion = useReducedMotion();
  // While consent is undecided the ConsentBanner occupies the foot of the
  // viewport — lift the mobile bar above it so the two never overlap. null =
  // undecided (lib/consent.ts), so this is true only on a visitor's first visit.
  const consentUndecided = useConsent() === null;
  const [pastHero, setPastHero] = useState(false);
  // The buy-box region spans the START sentinel (top of #order-print) to the
  // END sentinel (after the CTA / reassurance / custom-size cluster). While ANY
  // buy control is on screen the floating bar must stay hidden, so we track both
  // edges: the region is "open" once the start has entered the viewport and not
  // yet fully exited the top, and "closed" once the end sentinel passes the top.
  const [startPassed, setStartPassed] = useState(false);
  const [endPassed, setEndPassed] = useState(false);
  // The top sentinel of the order block — when it is still below the bottom of
  // the viewport the buy box hasn't been reached at all (atOrderTop), so the bar
  // shouldn't show yet either.
  const [atOrderTop, setAtOrderTop] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const heroEl = heroSentinelRef.current;
    const orderEl = orderSentinelRef.current;
    const orderEndEl = orderEndSentinelRef.current;
    if (!heroEl || !orderEl || !orderEndEl) return;

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
        // `atOrderTop` — the start sentinel is within the (slightly inset)
        // viewport: the buy box is on screen, so don't float the bar.
        setAtOrderTop(entry.isIntersecting);
        // `startPassed` — the top of the order block has crossed above the
        // viewport top, i.e. we are at or below the start of the buy region.
        setStartPassed(entry.boundingClientRect.top < 0);
      },
      // -10% bottom margin so the bar disappears slightly before the order
      // block reaches the floor of the viewport (looks tidier).
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );
    orderObs.observe(orderEl);

    const orderEndObs = new IntersectionObserver(
      ([entry]) => {
        // `endPassed` — the LAST buy control has scrolled above the viewport
        // top; only then is it safe to float the bar again.
        setEndPassed(entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    orderEndObs.observe(orderEndEl);

    return () => {
      heroObs.disconnect();
      orderObs.disconnect();
      orderEndObs.disconnect();
    };
  }, [heroSentinelRef, orderSentinelRef, orderEndSentinelRef]);

  // The buy box is on screen for the whole span between the start sentinel
  // entering the viewport and the end sentinel leaving the top — suppress the
  // floating bar for that entire region so it can never reappear over the
  // controls at the foot of the box (the overlap Hugo screenshotted).
  const inOrderRegion = startPassed && !endPassed;
  const visible = pastHero && !atOrderTop && !inOrderRegion;

  const isOneOffSelected = selectedTier.isOneOff === true;
  const framingOffered =
    !isOneOffSelected && typeof selectedTier.framingPricePence === "number";
  const embellishOffered =
    !isOneOffSelected && typeof selectedTier.embellishmentPricePence === "number";
  const onAdd = useCallback(() => {
    const framed = framingOffered && framing;
    addItem(
      painting.id,
      selected.name,
      selectedTier.id,
      framed,
      embellishOffered && embellished,
      framed ? frameStyle : undefined,
      framed ? glazing : undefined,
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
    frameStyle,
    glazing,
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
          // bottom-0 normally; lifted clear of the (variable-height) ConsentBanner
          // on a first visit while the cookie choice is undecided, so the bar is
          // never occluded by the banner. Reverts to bottom-0 once decided.
          style={consentUndecided ? { bottom: "9.5rem" } : undefined}
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
            <span className="font-sans text-[11px] font-bold tracking-[0.04em] text-ink/55 truncate">
              {selected.name}
            </span>
            <span className="font-display font-semibold tracking-[-0.01em] text-[17px] text-ink [font-variant-numeric:tabular-nums]">
              {fmtP(selectedTier.pricePence)}
            </span>
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center justify-center min-h-[44px] bg-ink text-bg px-6 font-sans text-[13px] font-bold tracking-[0.04em] rounded-full hover:bg-ink/85 transition-colors whitespace-nowrap shrink-0"
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
            <span className="font-sans text-[11px] font-bold tracking-[0.04em] text-ink/55 truncate">
              {selected.name}
            </span>
            <span className="font-display font-semibold tracking-[-0.01em] text-[16px] text-ink">
              {fmtP(selectedTier.pricePence)}
            </span>
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center bg-ink text-bg px-6 py-3 font-sans text-[13px] font-bold tracking-[0.04em] rounded-full hover:bg-ink/85 transition-colors whitespace-nowrap"
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
  const [frameStyle, setFrameStyle] = useState<string>(DEFAULT_FRAME_STYLE);
  const [glazing, setGlazing] = useState<string>(DEFAULT_GLAZING);

  // Re-sync the SIZE + add-ons when the painting changes (SPA nav between works
  // keeps this component mounted). The colourway already re-syncs above; without
  // this the selected size and add-on ticks silently carried onto the next
  // painting (#19). Reset to the anchor size with no add-ons — a clean slate.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSelectedTierId(anchorTier?.id);
    setFraming(false);
    setEmbellished(false);
    setFrameStyle(DEFAULT_FRAME_STYLE);
    setGlazing(DEFAULT_GLAZING);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [painting?.id]);

  // Deep-zoom viewer state for the hero image — plus a ref on the on-page
  // artwork <img> so the viewer can FLIP-lift from its measured rect (and read
  // the already-decoded source's natural pixel size).
  const [viewerOpen, setViewerOpen] = useState(false);
  const closeViewer = useCallback(() => setViewerOpen(false), []);
  const heroImgRef = useRef<HTMLImageElement>(null);
  // Left-column view: the artwork itself, or the True Size room view (#11) —
  // the painting shown at its real printed size on a wall in a room.
  const [view, setView] = useState<"art" | "true-size">("art");

  // Sticky bar sentinels — see StickyAddBar. The order block has TWO: a start
  // sentinel at the top of #order-print and an end sentinel after the last buy
  // control, so the floating bar is suppressed for the whole buy-box span.
  const heroSentinelRef = useRef<HTMLDivElement>(null);
  const orderSentinelRef = useRef<HTMLDivElement>(null);
  const orderEndSentinelRef = useRef<HTMLDivElement>(null);

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

        <main className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-4 md:pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-16">
          {/* Back link + jump-to-order strip — price floor stays visible from
              the top; the CTA scrolls to the buy box rather than duplicating
              the purchase actions (basket flow is the single source of truth). */}
          <div className="flex items-center justify-between gap-4 mb-5 md:mb-6">
            <Link
              to={collection ? `/collections#collection-${collection.id}` : "/collections"}
              className="font-sans text-[12px] md:text-[13px] font-semibold tracking-[0.04em] text-ink-muted inline-flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-[58vw] sm:max-w-none transition-colors duration-300 hover:text-ink"
            >
              ← {collection ? collection.title.split(" — ")[0] : "All collections"}
            </Link>
            <button
              type="button"
              onClick={scrollToOrder}
              className="inline-flex items-center gap-2 font-sans text-[11px] font-bold tracking-[0.04em] text-ink-muted hover:text-ink transition-colors duration-300 whitespace-nowrap lg:hidden"
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
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_minmax(380px,1fr)] gap-6 lg:gap-10 xl:gap-14 items-start">
            {/* LEFT — painting image. Sticky on desktop so it stays in view
                while the buy box scrolls. Click opens the fullscreen lightbox. */}
            <div className="lg:sticky lg:top-[72px]">
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
                        "px-3.5 py-1.5 rounded-full font-sans text-[10px] font-bold tracking-[0.04em] transition-colors",
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
                  colourwayImage={selected.image}
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
                          className="block mx-auto h-auto w-auto max-w-full max-h-[64vh] lg:max-h-[calc(100vh-72px-2rem)] 2xl:max-h-[86vh]"
                        />
                      </motion.picture>
                    </AnimatePresence>
                  </button>
                </div>
              </Reveal>
              {/* Plate caption — the gallery wall-label idiom directly under the
                  artwork: a hairline rule, the work · year · original size on the
                  left, and the "closer look" affordance pulled inline-right (it
                  opens the same deep-zoom viewer the artwork itself opens). */}
              <div className="mt-4 pt-4 border-t border-line flex items-center justify-between gap-4">
                <p className="m-0 font-sans text-[12px] md:text-[12.5px] leading-[1.5] text-ink-muted min-w-0">
                  <span className="text-ink">{painting.title}</span>
                  {painting.year !== "[ DATE ]" && <>, {painting.year}</>}
                  {painting.size && (
                    <span className="hidden sm:inline"> · {painting.size}</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setViewerOpen(true)}
                  className={cn(
                    EYEBROW_TIGHT,
                    "shrink-0 inline-flex items-center gap-2 bg-transparent cursor-pointer rounded-full ring-1 ring-line px-3.5 py-2 transition-all duration-300 hover:text-ink hover:ring-ink/40",
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
                  Closer look
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
                frameStyle={frameStyle}
                glazing={glazing}
                onFramingChange={setFraming}
                onEmbellishedChange={setEmbellished}
                onFrameStyleChange={setFrameStyle}
                onGlazingChange={setGlazing}
                orderSentinelRef={orderSentinelRef}
                orderEndSentinelRef={orderEndSentinelRef}
              />
            </Reveal>
          </div>

          {/* THE STORY — below the two-column region, on the SAME centred axis
              as the hero/page so the editorial spread fills the width instead
              of collapsing to a narrow column. Read after the buyer has seen
              the price + options. */}
          <div className="mt-12 md:mt-14">
            <Separator className="bg-line mb-8 max-w-[1180px] 2xl:max-w-[1320px] 3xl:max-w-[1480px] mx-auto" />
            <Story painting={painting} />
            <ProvenancePanel />
          </div>
        </main>
        {/* REVIEWS — genuine, moderated customer reviews of THIS print, keyed by
            the painting id. Strictly additive: it ships EMPTY (a dignified
            "be the first to review" state) and fills only from real submissions
            via the existing /api/memories-submit (kind:"review"). Never seeded —
            fabricated reviews are illegal (UK ASA / US FTC). Lives below the
            story so it never disturbs the monochrome buy box or pricing. */}
        <Reviews paintingId={painting.id} paintingTitle={painting.title} />
        <CompanionWorks painting={painting} collectionTitle={collection?.title} />
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
        frameStyle={frameStyle}
        glazing={glazing}
        heroSentinelRef={heroSentinelRef}
        orderSentinelRef={orderSentinelRef}
        orderEndSentinelRef={orderEndSentinelRef}
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
