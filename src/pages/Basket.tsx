import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { AssetImage } from "../components/AssetImage";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { EmailMyBasket } from "../components/EmailMyBasket";
import { ExitSaveBasket } from "../components/ExitSaveBasket";
import { NewsletterSignup } from "../components/NewsletterSignup";
import {
  getAnchorTier,
  getLowestTierPricePence,
  getPaintingById,
  getPrintTiers,
  frameStyleLabel,
  glazingLabel,
  COLLECTIONS,
  PAINTINGS,
  type PrintTier,
} from "../data/paintings";
import { useCurrency, formatMinorUnits } from "../lib/currency";
import { useBasket, useGiftCards, removeItem, type BasketItem, type GiftBasketItem } from "../lib/basket";
import { restoreBasketFromUrl } from "../lib/basketRestore";
import { getStoredUtm } from "../lib/utm";
import { trackInitiateCheckout } from "../lib/tracking";
import { usePageTitle } from "../lib/usePageTitle";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_MUTED, EYEBROW_TIGHT, META, SUBTITLE, BTN_PRIMARY, BTN_SECONDARY } from "../components/ui/tokens";
import { useNoindexHead } from "../lib/useNoindexHead";
import { MASTHEAD_TITLE_STYLE } from "../components/ui/tokens";

/**
 * Hydrated basket line — joins a stored item against the live catalogue so
 * we only render lines whose painting + colourway + tier still exist. The
 * basket store already reconciles on read, but we double-check here to be
 * safe.
 */
interface ResolvedLine {
  item: BasketItem;
  paintingId: string;
  title: string;
  collectionTitle: string;
  colourwayName: string;
  image: string;
  tier: PrintTier;
}

const resolveLines = (items: BasketItem[]): ResolvedLine[] => {
  return items
    .map((item) => {
      const painting = getPaintingById(item.paintingId);
      if (!painting) return null;
      const colourway = painting.colourways.find(
        (c) => c.name === item.colourwayName && c.available,
      );
      if (!colourway) return null;
      const collection = COLLECTIONS.find((c) => c.id === painting.collection);
      const visibleTiers = getPrintTiers(painting);
      // Defensive fall-back: if the stored tier no longer exists in the
      // visible ladder, drop back to the anchor so we never show a
      // mis-priced line. (The basket reconciler will purge it on next read.)
      const tier =
        visibleTiers.find((t) => t.id === item.tierId) ?? getAnchorTier(painting);
      return {
        item,
        paintingId: painting.id,
        title: painting.title,
        collectionTitle: collection?.title ?? "",
        colourwayName: colourway.name,
        image: colourway.image,
        tier,
      } satisfies ResolvedLine;
    })
    .filter((line): line is ResolvedLine => line !== null);
};

// -----------------------------------------------------------------------------
// PRICING PREVIEW HELPERS — DMCC #13 (no drip-pricing): every figure the buyer
// sees here is computed the SAME way the server (api/checkout.ts) computes the
// real Stripe charge, so the basket never under- or over-states what is paid.
// -----------------------------------------------------------------------------

/** Whether an add-on is actually billable for a line (offered AND selected). */
const lineFramingPence = (line: ResolvedLine): number =>
  line.item.framing === true && typeof line.tier.framingPricePence === "number"
    ? line.tier.framingPricePence
    : 0;

const lineEmbellishPence = (line: ResolvedLine): number =>
  line.item.embellished === true &&
  typeof line.tier.embellishmentPricePence === "number"
    ? line.tier.embellishmentPricePence
    : 0;

/** Full pre-discount price of a line = print + framing + hand-finishing. */
const lineTotalPence = (line: ResolvedLine): number =>
  line.tier.pricePence + lineFramingPence(line) + lineEmbellishPence(line);

/**
 * The Stripe LINE ITEMS one basket line expands into (pence each). Mirrors the
 * way api/checkout.ts builds `line_items`: the print is one line item; framing
 * and hand-finishing — when billable — are SEPARATE line items, not folded
 * into the print. This split is what makes the discount round per-line the way
 * Stripe does (see bundleDiscountPenceFor below).
 */
const stripeLineItemsFor = (line: ResolvedLine): number[] => {
  const items = [line.tier.pricePence];
  const framing = lineFramingPence(line);
  if (framing > 0) items.push(framing);
  const embellish = lineEmbellishPence(line);
  if (embellish > 0) items.push(embellish);
  return items;
};

// Distinct-painting count for the complete-catalogue trigger. Mirrors
// api/checkout.ts CATALOGUE_PAINTING_COUNT (= the painting allowlist size).
const CATALOGUE_PAINTING_COUNT = PAINTINGS.length;

/**
 * Bundle discount percent derived from the basket CONTENTS — a byte-for-byte
 * mirror of api/checkout.ts `bundlePercentOff` (gotcha #9). This REPLACES the
 * old count-only preview (which displayed 5/10% while Stripe charged 12/15% —
 * a DMCC misleading-action risk). The previewed % now equals the charged %:
 *   • one line of EVERY painting (complete catalogue)  → 15%
 *   • all lines a single painting (complete colourway set) → 12%
 *   • 3+ mixed paintings → 10%; exactly 2 lines → 5%; fewer → 0%.
 */
const bundlePercentOff = (lines: ResolvedLine[]): number => {
  const count = lines.length;
  if (count < 2) return 0;
  const distinct = new Set(lines.map((l) => l.paintingId)).size;
  if (distinct >= CATALOGUE_PAINTING_COUNT) return 15; // complete catalogue
  if (distinct === 1) return 12; // complete colourway set
  return count >= 3 ? 10 : 5; // general / collection bundle
};

/**
 * Per-region SHIPPING preview — a mirror of api/checkout.ts
 * `buildShippingOptions`. FREE SHIPPING POLICY (2026-06-06): the estate absorbs
 * ALL delivery cost into the ~90% print margin, so EVERY region ships FREE —
 * unframed AND framed alike. api/checkout.ts now charges a £0 (free) rate per
 * region, so the previewed delivery here is £0 too (advertised == charged to the
 * penny — mirror invariant, gotcha #9). There is no framed-shipping surcharge
 * anymore, hence no DMCC drip-pricing disclosure to surface.
 */
const shippingPreview = () => ({
  ukPence: 0,
  euPence: 0,
  wwPence: 0,
});

// -----------------------------------------------------------------------------
// EMPTY-STATE MERCHANDISING — "Begin with these": three signature works quietly
// presented when the basket is empty (e.g. a saved-basket email opened after
// localStorage expired), so the page offers a way back into the collection
// instead of dead-ending. Calm gallery register — title + from-price only, no
// urgency copy. Shown in the ORIGINAL colourway (the PDP's default, so a plain
// /collections/:id link lands on the colourway pictured).
// -----------------------------------------------------------------------------
const BEGIN_WITH_IDS = ["wild-rose", "english-bluebells", "ophiuchus"] as const;

const BEGIN_WITH_PICKS = BEGIN_WITH_IDS.map((id) => {
  const painting = getPaintingById(id);
  if (!painting) return null;
  const cover =
    painting.colourways.find((c) => c.isOriginal && c.available) ??
    painting.colourways.find((c) => c.available) ??
    painting.colourways[0];
  return { painting, cover, fromPence: getLowestTierPricePence(painting) };
}).filter((p): p is NonNullable<typeof p> => p !== null);

export const Basket = () => {
  usePageTitle("Your Basket");
  // Transactional route — noindex + default meta (see useNoindexHead).
  useNoindexHead();
  // Presentment currency (header picker). `fmt` charges-parity formatting,
  // `fmtP` the pretty (no .00) variant; `currencyCode` rides along on the
  // checkout POST so Stripe charges in the SAME currency shown here.
  const { format: fmt, formatPretty: fmtP, convert, code: currencyCode } = useCurrency();
  const items = useBasket();
  const lines = resolveLines(items);

  // Saved-basket pickup (contract C2) — the save-basket email links back to
  // /basket?restore=<base64url payload>. On mount: decode, validate every
  // line against the live catalogue, merge without duplicating identical
  // lines, then strip the param. A no-op when no ?restore= is present.
  useEffect(() => {
    restoreBasketFromUrl();
  }, []);

  // Gift-card lines (digital e-vouchers). Excluded from the bundle-discount
  // maths (a gift card is not a print) + shipping (digital). Their face value
  // IS the Stripe charge (price_data.unit_amount), so it just adds to the total.
  const giftCards = useGiftCards();
  const giftTotalPence = giftCards.reduce((sum, g) => sum + g.amountPence, 0);
  const isEmpty = lines.length === 0 && giftCards.length === 0;

  // Genuine PRE-discount subtotal — print + every selected add-on across all
  // lines. This is the honest "before any bundle saving" figure (DMCC: show
  // the real subtotal, then the discount, then the total).
  const subtotalPence = lines.reduce((sum, l) => sum + lineTotalPence(l), 0);

  // Bundle discount — content-derived percent that EQUALS the Stripe charge,
  // and the absolute £ saving it produces. Computed PER STRIPE LINE ITEM (print
  // / framing / embellishment each rounded on its own, then summed) so it
  // matches Stripe's coupon distribution to the penny — not a single round over
  // the whole subtotal, which drifted 1–2p on mixed baskets (gotcha #9).
  const bundleDiscountPercent = bundlePercentOff(lines);

  // ── advertised == charged in EVERY currency (gotcha #9) ───────────────────
  // The server (api/checkout.ts) converts EACH Stripe line item to presentment
  // minor units FIRST (whole-major-unit rounding per line), THEN applies the
  // percent_off coupon per line. So the DISPLAYED totals must convert per line
  // too — converting a summed GBP total once drifts a unit or two per line in
  // non-GBP. These minor-unit aggregates mirror the server exactly; in GBP they
  // equal the pence figures (convert is identity-rounding for GBP). The single
  // per-line sub-amounts already convert once each, so they sum to these totals
  // to the penny.
  const lineMinorTotal = (line: ResolvedLine): number =>
    stripeLineItemsFor(line).reduce((sum, a) => sum + convert(a), 0);
  const subtotalMinor = lines.reduce((sum, l) => sum + lineMinorTotal(l), 0);
  const bundleDiscountMinor =
    bundleDiscountPercent <= 0
      ? 0
      : lines.reduce(
          (sum, l) =>
            sum +
            stripeLineItemsFor(l).reduce(
              (s, a) => s + Math.round((convert(a) * bundleDiscountPercent) / 100),
              0,
            ),
          0,
        );
  const giftMinor = giftCards.reduce((sum, g) => sum + convert(g.amountPence), 0);
  const grandTotalMinor = subtotalMinor - bundleDiscountMinor + giftMinor;
  const fmtMinor = (minor: number) => formatMinorUnits(minor, currencyCode);

  // Mandatory shipping (shown upfront, equal prominence) + framed surcharge.
  const shipping = shippingPreview();

  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const onCheckout = async () => {
    if (isEmpty) return;
    setStatus("loading");
    setErrorMsg("");
    // Marketing analytics (consent-gated no-op otherwise) — InitiateCheckout /
    // begin_checkout with the full pre-discount basket figure (the page's
    // "Subtotal" + gift-card face values) and the total line count.
    trackInitiateCheckout(
      subtotalPence + giftTotalPence,
      lines.length + giftCards.length,
    );
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
          // Prints AND gift cards travel in the SAME `items` array; the server
          // (api/checkout.ts) splits on `kind === "gift"`. Gift face value flows
          // through unchanged → Stripe price_data.unit_amount (advertised==charged).
          items: [
            ...lines.map((l) => ({
              paintingId: l.paintingId,
              colourwayName: l.colourwayName,
              tierId: l.tier.id,
              framing: l.item.framing === true,
              embellished: l.item.embellished === true,
              // Framing finishes (no price impact) — forwarded so the Stripe
              // line item names the frame the estate should order from Point 101.
              ...(l.item.framing === true && l.item.frameStyle
                ? { frameStyle: l.item.frameStyle }
                : {}),
              ...(l.item.framing === true && l.item.glazing
                ? { glazing: l.item.glazing }
                : {}),
            })),
            ...giftCards.map((g) => ({
              kind: "gift" as const,
              amountPence: g.amountPence,
              label: g.label,
              ...(g.recipientName ? { recipientName: g.recipientName } : {}),
              ...(g.recipientEmail ? { recipientEmail: g.recipientEmail } : {}),
              ...(g.giftMessage ? { giftMessage: g.giftMessage } : {}),
            })),
          ],
          // Presentment currency from the header picker — api/checkout.ts
          // converts every pence figure into it so the Stripe charge matches
          // the price shown on this page (advertised == charged, any currency).
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
      // Use .assign() instead of `window.location.href = …` — semantically
      // identical, but plays nicer with the react-hooks/immutability rule.
      window.location.assign(body.url);
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
    <div className="relative min-h-screen flex flex-col">
      <SceneBackdrop src="/img/scenes/basket-palm-galaxy-blur-v2.webp" />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[820px] 2xl:max-w-[960px] 3xl:max-w-[1040px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-14 pb-10 md:pb-14">
        {/* MASTHEAD — the refined estate register (see PageMasthead): the same
            eyebrow-left + hairline + muted-right meta rule, then the title in
            the composed display cut (MASTHEAD_TITLE_STYLE: opsz 144, wght 560,
            clamp ≤116px) instead of the old over-bold 700/opsz-48 logo. */}
        <Reveal as="div" className="mb-8 md:mb-10">
          <div className="flex items-center gap-4 md:gap-6 border-b border-line pb-4 md:pb-5">
            <span className={EYEBROW}>Made to order</span>
            <span aria-hidden className="h-px flex-1 bg-ink/15" />
            <span className={cn(EYEBROW_MUTED, "shrink-0")}>The Mandala Company</span>
          </div>
          <h1
            className="font-display text-ink m-0 mt-5 md:mt-7 text-balance text-pretty"
            style={MASTHEAD_TITLE_STYLE}
          >
            Your basket
          </h1>
        </Reveal>

        {isEmpty ? (
          <Reveal as="div" className="max-w-[640px] 3xl:max-w-[760px]">
            <p className={cn(SUBTITLE, "m-0 mb-7 md:mb-8")}>
              Your basket is empty. Each print is made to order by a UK atelier and
              estate-stamped on behalf of The Mandala Company.
            </p>
            <Link to="/collections" className={cn(BTN_PRIMARY, "w-fit")}>
              View the collections <span aria-hidden="true" className="ml-2">→</span>
            </Link>

            {/* BEGIN WITH THESE — quiet three-tile strip of signature works
                beneath the empty-state copy (see BEGIN_WITH_PICKS above). */}
            {BEGIN_WITH_PICKS.length > 0 && (
              <div className="mt-6 md:mt-8">
                <p className={cn(EYEBROW_MUTED, "m-0 mb-5")}>Begin with these</p>
                <ul className="list-none p-0 m-0 grid grid-cols-3 gap-3 sm:gap-4">
                  {BEGIN_WITH_PICKS.map(({ painting, cover, fromPence }) => (
                    <li key={painting.id} className="m-0 min-w-0">
                      <Link
                        to={`/collections/${painting.id}`}
                        className="group block"
                        aria-label={`${painting.title} — from ${fmtP(fromPence)}`}
                      >
                        <div className="relative aspect-square overflow-hidden ring-1 ring-line transition-all duration-500 group-hover:ring-accent/50">
                          <AssetImage
                            src={cover.image}
                            alt={`${painting.title} — ${cover.name}`}
                            loading="lazy"
                            decoding="async"
                            // The empty-state column is capped at 640px, so each
                            // of the three tiles renders ≤ ~200px. With this
                            // `sizes` the browser serves the small -w480 / -w800
                            // webp variants from the manifest (imageVariants.ts),
                            // never the full-size original.
                            sizes="(min-width: 640px) 200px, 30vw"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                          />
                        </div>
                        <h3 className="font-display font-semibold tracking-[-0.015em] text-[14px] sm:text-[clamp(16px,0.9vw,20px)] leading-[1.3] text-ink m-0 mt-3 group-hover:text-accent transition-colors duration-300">
                          {painting.title}
                        </h3>
                        <p className="font-sans font-normal text-[clamp(12.5px,0.72vw,15px)] leading-[1.5] text-ink-muted m-0 mt-1">
                          From {fmtP(fromPence)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <NewsletterSignup variant="inline" />
          </Reveal>
        ) : (
          <>
            {lines.length > 0 && (
            <Reveal as="div">
              <Separator className="bg-line mb-6" />
              <ul className="list-none p-0 m-0 flex flex-col">
                {lines.map((line, i) => {
                  const framingPence = lineFramingPence(line);
                  const embellishPence = lineEmbellishPence(line);
                  const hasAddOns = framingPence > 0 || embellishPence > 0;
                  return (
                    <li
                      key={line.item.addedAt}
                      className={
                        i === 0
                          ? "py-6 first:pt-0"
                          : "py-6 border-t border-line"
                      }
                    >
                      <div className="flex gap-5 sm:gap-7 items-start">
                        <Link
                          to={`/collections/${line.paintingId}`}
                          className="block flex-shrink-0 w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] 2xl:w-[128px] 2xl:h-[128px] overflow-hidden ring-1 ring-line"
                          aria-label={`${line.title} — view painting`}
                        >
                          <AssetImage
                            src={line.image}
                            alt={`${line.title} — ${line.colourwayName}`}
                            className="w-full h-full object-cover object-top block"
                            sizes="(min-width: 1536px) 128px, (min-width: 640px) 104px, 88px"
                            loading="lazy"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          {line.collectionTitle && (
                            <div className="mb-2">
                              <Badge variant="outline">
                                {line.collectionTitle.split(" — ")[0]}
                              </Badge>
                            </div>
                          )}
                          <Link
                            to={`/collections/${line.paintingId}`}
                            className="font-display font-semibold tracking-[-0.025em] text-[clamp(18px,2.2vw,30px)] text-ink leading-tight hover:text-accent transition-colors"
                          >
                            {line.title}
                          </Link>
                          {/* Tier label — quiet muted-ink spec line.
                              Surfaces label · size · edition. */}
                          <p className={cn(EYEBROW_TIGHT, "m-0 mt-2")}>
                            {line.tier.label} · {line.tier.size.split(" ")[0]}
                            <span className="hidden sm:inline"> · {line.tier.editionLabel}</span>
                          </p>
                          <p className="font-sans font-normal text-[clamp(13px,0.78vw,16px)] leading-[1.6] text-ink-muted m-0 mt-1.5">
                            {line.colourwayName}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeItem(line.item.addedAt)}
                            className="mt-2 inline-flex items-center min-h-[44px] font-sans text-[11px] font-bold tracking-[0.22em] uppercase text-ink-muted hover:text-accent transition-colors bg-transparent border-0 p-0 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                        {/* Print price for this size. When add-ons are present
                            this is the PRINT-ONLY figure and the line subtotal
                            is shown below — so nothing is hidden (DMCC #13:
                            no drip-pricing). */}
                        <p className="font-display font-semibold tracking-[-0.02em] text-[clamp(16px,1.7vw,27px)] text-ink m-0 flex-shrink-0">
                          {fmt(line.tier.pricePence)}
                        </p>
                      </div>

                      {/* Add-on line items — each shown explicitly with its
                          own per-size price, then a line subtotal. Rendered
                          only when at least one add-on is selected; the plain
                          print line above is already complete on its own. */}
                      {hasAddOns && (
                        <div className="mt-4 ml-0 sm:ml-[132px] 2xl:ml-[156px] flex flex-col gap-1.5">
                          <div className="flex items-baseline justify-between gap-4">
                            <span className="font-sans text-[clamp(13px,0.78vw,16px)] leading-[1.5] text-ink-muted min-w-0">
                              {line.tier.label} print ({line.tier.size.split(" ")[0]})
                            </span>
                            <span className="font-sans text-[clamp(13px,0.78vw,16px)] leading-[1.5] text-ink-muted tabular-nums flex-shrink-0">
                              {fmt(line.tier.pricePence)}
                            </span>
                          </div>
                          {framingPence > 0 && (
                            <div className="flex items-baseline justify-between gap-4">
                              <span className="font-sans text-[clamp(13px,0.78vw,16px)] leading-[1.5] text-ink-muted min-w-0">
                                Framing ({frameStyleLabel(line.item.frameStyle)} · {glazingLabel(line.item.glazing)})
                              </span>
                              <span className="font-sans text-[clamp(13px,0.78vw,16px)] leading-[1.5] text-ink-muted tabular-nums flex-shrink-0">
                                + {fmt(framingPence)}
                              </span>
                            </div>
                          )}
                          {embellishPence > 0 && (
                            <div className="flex items-baseline justify-between gap-4">
                              <span className="font-sans text-[clamp(13px,0.78vw,16px)] leading-[1.5] text-ink-muted min-w-0">
                                Hand-finished by Polly Wedge
                              </span>
                              <span className="font-sans text-[clamp(13px,0.78vw,16px)] leading-[1.5] text-ink-muted tabular-nums flex-shrink-0">
                                + {fmt(embellishPence)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-baseline justify-between gap-4 pt-1.5 mt-0.5 border-t border-line">
                            <span className="font-sans text-[11px] font-bold tracking-[0.16em] uppercase text-ink-muted min-w-0">
                              Line total
                            </span>
                            <span className="font-sans text-[clamp(13px,0.78vw,16px)] font-semibold text-ink tabular-nums flex-shrink-0">
                              {fmtMinor(lineMinorTotal(line))}
                            </span>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Reveal>
            )}

            {giftCards.length > 0 && (
              <Reveal as="div" className={lines.length > 0 ? "mt-2" : ""}>
                {lines.length === 0 && <Separator className="bg-line mb-6" />}
                <ul className="list-none p-0 m-0 flex flex-col">
                  {giftCards.map((g: GiftBasketItem) => (
                    <li
                      key={g.addedAt}
                      className="py-6 border-t border-line first:border-t-0"
                    >
                      <div className="flex gap-5 sm:gap-7 items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-semibold tracking-[-0.025em] text-[clamp(18px,2.2vw,30px)] text-ink leading-tight m-0">
                            Gift card
                          </p>
                          <p className={cn(EYEBROW_TIGHT, "m-0 mt-2")}>{g.label}</p>
                          {(g.recipientName || g.recipientEmail) && (
                            <p className="font-sans font-normal text-[clamp(13px,0.78vw,16px)] leading-[1.6] text-ink-muted m-0 mt-1.5">
                              For {g.recipientName || g.recipientEmail}
                            </p>
                          )}
                          {g.giftMessage && (
                            <p className="font-display italic text-[clamp(13px,0.78vw,16px)] leading-[1.55] text-ink/55 m-0 mt-1.5">
                              “{g.giftMessage}”
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => removeItem(g.addedAt)}
                            className="mt-2 inline-flex items-center min-h-[44px] font-sans text-[11px] font-bold tracking-[0.22em] uppercase text-ink-muted hover:text-accent transition-colors bg-transparent border-0 p-0 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                        <p className="font-display font-semibold tracking-[-0.02em] text-[clamp(16px,1.7vw,27px)] text-ink m-0 flex-shrink-0">
                          {fmt(g.amountPence)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}

            <Reveal as="div" className="mt-6">
              <Separator className="bg-line mb-6" />

              {/* PRICE BREAKDOWN — DMCC #13: the genuine pre-discount subtotal,
                  the bundle discount (the SAME percent Stripe charges), the
                  net, then mandatory delivery — all shown upfront with equal
                  prominence, nothing first revealed at Stripe. */}
              <dl className="m-0 flex flex-col gap-2.5 mb-5">
                <div className="flex items-baseline justify-between gap-6">
                  <dt className="font-sans text-[clamp(14px,0.82vw,17px)] leading-[1.5] text-ink-muted m-0 min-w-0">
                    Subtotal{" "}
                    <span className="text-[clamp(12px,0.7vw,15px)]">(prints + selected add-ons)</span>
                  </dt>
                  <dd className="font-sans text-[clamp(15px,0.88vw,18px)] text-ink m-0 tabular-nums flex-shrink-0">
                    {fmtMinor(subtotalMinor)}
                  </dd>
                </div>
                {bundleDiscountPercent > 0 && (
                  <div className="flex items-baseline justify-between gap-6">
                    <dt className="font-sans text-[clamp(14px,0.82vw,17px)] leading-[1.5] text-accent m-0 min-w-0">
                      Estate bundle thank-you ({bundleDiscountPercent}%)
                    </dt>
                    <dd className="font-sans text-[clamp(15px,0.88vw,18px)] text-accent m-0 tabular-nums flex-shrink-0">
                      − {fmtMinor(bundleDiscountMinor)}
                    </dd>
                  </div>
                )}
                {giftTotalPence > 0 && (
                  <div className="flex items-baseline justify-between gap-6">
                    <dt className="font-sans text-[clamp(14px,0.82vw,17px)] leading-[1.5] text-ink-muted m-0 min-w-0">
                      Gift cards
                    </dt>
                    <dd className="font-sans text-[clamp(15px,0.88vw,18px)] text-ink m-0 tabular-nums flex-shrink-0">
                      {fmtMinor(giftMinor)}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Quiet AOV nudge — the count ladder (mirrors bundlePercentOff /
                  Stripe to the penny). Shown only below the 10% rung; the special
                  colourway-set (12%) / catalogue (15%) bundles read ≥10 here so
                  they self-exclude. Informational — never a price claim. */}
              {lines.length >= 1 && bundleDiscountPercent < 10 && (
                <p className="m-0 -mt-1 mb-4 font-sans text-[clamp(13px,0.78vw,15.5px)] leading-[1.5] text-ink-muted">
                  {lines.length === 1
                    ? "Add one more print and your order saves 5% — and 10% on three or more."
                    : "One more print lifts your bundle saving to 10%."}
                </p>
              )}

              <div className="flex items-baseline justify-between gap-6 mb-3">
                <p className={cn(EYEBROW_MUTED, "m-0 min-w-0")}>
                  Total <span className="text-[clamp(12px,0.7vw,15px)] normal-case tracking-normal">(delivery free)</span>
                </p>
                <p className="font-display font-semibold tracking-[-0.02em] text-[clamp(26px,3.4vw,56px)] text-ink m-0 tabular-nums flex-shrink-0">
                  {fmtMinor(grandTotalMinor)}
                </p>
              </div>

              {/* DELIVERY — FREE everywhere, shown in full upfront. The estate
                  absorbs all delivery cost into the print margin, so every region
                  ships free, framed or unframed. These £0 figures mirror the £0
                  (free) rate api/checkout.ts charges at Stripe — advertised ==
                  charged to the penny (mirror invariant, gotcha #9). */}
              <div className="border border-line/70 rounded-2xl p-4 sm:p-5 mb-3">
                <p className={cn(EYEBROW_TIGHT, "m-0 mb-2.5")}>
                  Delivery — free worldwide
                </p>
                <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
                  {(
                    [
                      ["United Kingdom", shipping.ukPence],
                      ["Europe", shipping.euPence],
                      ["Worldwide", shipping.wwPence],
                    ] as const
                  ).map(([region, pence]) => (
                    <li
                      key={region}
                      className="flex items-baseline justify-between gap-4"
                    >
                      <span className="font-sans text-[clamp(13.5px,0.8vw,16px)] leading-[1.5] text-ink-muted min-w-0">
                        {region}
                      </span>
                      <span className="font-sans text-[clamp(13.5px,0.8vw,16px)] leading-[1.5] text-ink tabular-nums flex-shrink-0">
                        {pence === 0 ? "Free" : fmt(pence)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="font-sans font-normal text-[clamp(12.5px,0.74vw,15px)] leading-[1.55] text-ink-muted m-0 mt-3">
                  Free delivery on every order — framed or unframed — with nothing
                  added at checkout. Each print ships within 7–10 working days.
                </p>
              </div>

              <p className="font-sans font-normal text-[clamp(12px,0.68vw,14px)] leading-[1.6] text-ink-muted m-0 mb-7">
                International buyers may be charged local import duties on delivery.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onCheckout}
                  disabled={status === "loading"}
                  className={BTN_PRIMARY}
                >
                  {status === "loading" ? "Opening checkout…" : "Proceed to checkout"}
                  <span aria-hidden="true" className="ml-2">→</span>
                </button>
                <Link to="/collections" className={BTN_SECONDARY}>
                  Continue browsing
                </Link>
              </div>
              {status === "error" && (
                <p role="alert" className="mt-4 font-sans text-[clamp(13px,0.78vw,16px)] text-accent m-0">{errorMsg}</p>
              )}

              {/* TRUST CLUSTER AT THE MONEY CLICK — quiet, text-led reassurance
                  directly under the checkout button, in the house META register
                  (no badge images). Every claim is documented-true and mirrors
                  copy that already ships elsewhere: Stripe-hosted checkout +
                  the wallet/card marks Stripe Checkout presents
                  (ReassuranceRow "Payments by Stripe"), the estate stamp +
                  hand-numbering (ESTATE_AUTHENTICATION), free worldwide
                  delivery (the delivery panel above / FREE SHIPPING POLICY
                  2026-06-06) and the damaged-in-transit replacement
                  (/returns; ReassuranceRow). Deliberately NOT an unconditional
                  refund promise and NO fake SSL seal. */}
              <div className="mt-5 max-w-[560px]">
                <p className="m-0 flex items-start gap-2.5">
                  {/* Lock glyph — same hairline lock as ReassuranceRow. */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="w-[15px] h-[15px] mt-[3px] flex-shrink-0 text-ink/55"
                  >
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                  <span className={META}>
                    Secure checkout by Stripe — Visa, Mastercard, Amex,
                    Apple&nbsp;Pay &amp; Google&nbsp;Pay
                  </span>
                </p>
                {/* pl-[25px] = 15px glyph + 10px gap, so the second line
                    aligns with the first line's text, not the glyph. */}
                <p className="font-sans font-normal text-[clamp(12.5px,0.74vw,15px)] leading-[1.6] text-ink-muted m-0 mt-1.5 pl-[25px]">
                  Estate-stamped &amp; numbered within the edition · Free delivery worldwide ·
                  Damaged-in-transit replacement
                </p>
              </div>
              {/* Inline "save your basket" affordance — quiet link below
                  the subtotal block. Renders nothing when the basket is
                  empty (we're inside the non-empty branch anyway). */}
              <EmailMyBasket items={items} />
            </Reveal>
          </>
        )}
      </main>
      {/* Exit-intent toast — mounts globally on the basket page, fires
          only on top-edge mouse exit and only once per session. */}
      <ExitSaveBasket items={items} />
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
