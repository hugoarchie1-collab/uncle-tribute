import { useState } from "react";
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
  formatGBP,
  getAnchorTier,
  getPaintingById,
  getPrintTiers,
  COLLECTIONS,
  PAINTINGS,
  type PrintTier,
} from "../data/paintings";
import { useBasket, removeItem, type BasketItem } from "../lib/basket";
import { usePageTitle } from "../lib/usePageTitle";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_MUTED, EYEBROW_TIGHT, TITLE, SUBTITLE, BTN_PRIMARY, BTN_SECONDARY } from "../components/ui/tokens";

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
 * `buildShippingOptions`. Standard delivery is MANDATORY (the estate only
 * ships; there is no collection / free option), so under DMCC it must be shown
 * upfront with equal prominence, not first revealed at Stripe. Framed prints
 * carry a per-item surcharge that ACCUMULATES, which must also be visible the
 * moment a frame is in the basket:
 *   base    UK £15 / EU £35 / WW £60
 *   A2 framed +£15 UK, +£30 EU/WW   (intl surcharge doubles)
 *   A1 framed +£25 UK, +£50 EU/WW
 */
const shippingPreview = (lines: ResolvedLine[]) => {
  const framedUkSurchargePence = lines.reduce((acc, line) => {
    if (!line.item.framing) return acc;
    if (line.tier.id === "collector") return acc + 1500; // A2 framed +£15
    if (line.tier.id === "atelier-grande") return acc + 2500; // A1 framed +£25
    return acc;
  }, 0);
  const intlSurchargePence = framedUkSurchargePence * 2; // EU + WW double
  return {
    hasFramedItem: framedUkSurchargePence > 0,
    framedUkSurchargePence,
    intlSurchargePence,
    ukPence: 1500 + framedUkSurchargePence,
    euPence: 3500 + intlSurchargePence,
    wwPence: 6000 + intlSurchargePence,
  };
};

export const Basket = () => {
  usePageTitle("Your Basket");
  const items = useBasket();
  const lines = resolveLines(items);

  // Genuine PRE-discount subtotal — print + every selected add-on across all
  // lines. This is the honest "before any bundle saving" figure (DMCC: show
  // the real subtotal, then the discount, then the total).
  const subtotalPence = lines.reduce((sum, l) => sum + lineTotalPence(l), 0);

  // Bundle discount — content-derived percent that EQUALS the Stripe charge,
  // and the absolute £ saving it produces (rounded the same way the coupon's
  // percent_off rounds the line total).
  const bundleDiscountPercent = bundlePercentOff(lines);
  const bundleDiscountPence =
    bundleDiscountPercent > 0
      ? Math.round((subtotalPence * bundleDiscountPercent) / 100)
      : 0;
  const discountedSubtotalPence = subtotalPence - bundleDiscountPence;

  // Mandatory shipping (shown upfront, equal prominence) + framed surcharge.
  const shipping = shippingPreview(lines);

  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const onCheckout = async () => {
    if (lines.length === 0) return;
    setStatus("loading");
    setErrorMsg("");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({
            paintingId: l.paintingId,
            colourwayName: l.colourwayName,
            tierId: l.tier.id,
            framing: l.item.framing === true,
            embellished: l.item.embellished === true,
          })),
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
      <AmbientBackdrop opacity={0.4} />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[820px] 2xl:max-w-[960px] 3xl:max-w-[1040px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-16 pb-20 md:pb-28">
        <Reveal>
          <p className={cn(EYEBROW, "m-0 mb-5")}>
            Made to order
          </p>
          <h1 className={cn(TITLE, "m-0 mb-10 hero-text-shadow")}>
            Your basket.
          </h1>
        </Reveal>

        {lines.length === 0 ? (
          <Reveal as="div" className="max-w-[640px]">
            <Separator className="bg-line mb-8" />
            <p className={cn(SUBTITLE, "m-0 mb-8")}>
              Your basket is empty. Each print is made to order by a UK atelier and
              estate-stamped on behalf of The Mandala Company.
            </p>
            <Link to="/collections" className={cn(BTN_PRIMARY, "w-fit")}>
              View the collections <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <NewsletterSignup variant="inline" />
          </Reveal>
        ) : (
          <>
            <Reveal as="div">
              <Separator className="bg-line mb-8" />
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
                          className="block flex-shrink-0 w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] 2xl:w-[128px] 2xl:h-[128px] overflow-hidden ring-1 ring-white/8"
                          aria-label={`${line.title} — view painting`}
                        >
                          <AssetImage
                            src={line.image}
                            alt={`${line.title} — ${line.colourwayName}`}
                            className="w-full h-full object-cover object-top block"
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
                            className="font-display font-semibold tracking-[-0.025em] text-[clamp(18px,2vw,26px)] text-ink leading-tight hover:text-accent transition-colors"
                          >
                            {line.title}
                          </Link>
                          {/* Tier label — quiet muted-ink spec line.
                              Surfaces label · size · edition. */}
                          <p className={cn(EYEBROW_TIGHT, "m-0 mt-2")}>
                            {line.tier.label} · {line.tier.size.split(" ")[0]}
                            <span className="hidden sm:inline"> · {line.tier.editionLabel}</span>
                          </p>
                          <p className="font-sans font-normal text-[13px] leading-[1.6] text-ink-muted m-0 mt-1.5">
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
                        <p className="font-display font-semibold tracking-[-0.02em] text-[clamp(16px,1.6vw,24px)] text-ink m-0 flex-shrink-0">
                          {formatGBP(line.tier.pricePence)}
                        </p>
                      </div>

                      {/* Add-on line items — each shown explicitly with its
                          own per-size price, then a line subtotal. Rendered
                          only when at least one add-on is selected; the plain
                          print line above is already complete on its own. */}
                      {hasAddOns && (
                        <div className="mt-4 ml-0 sm:ml-[132px] flex flex-col gap-1.5">
                          <div className="flex items-baseline justify-between gap-4">
                            <span className="font-sans text-[13px] leading-[1.5] text-ink-muted min-w-0">
                              {line.tier.label} print ({line.tier.size.split(" ")[0]})
                            </span>
                            <span className="font-sans text-[13px] leading-[1.5] text-ink-muted tabular-nums flex-shrink-0">
                              {formatGBP(line.tier.pricePence)}
                            </span>
                          </div>
                          {framingPence > 0 && (
                            <div className="flex items-baseline justify-between gap-4">
                              <span className="font-sans text-[13px] leading-[1.5] text-ink-muted min-w-0">
                                Framing (black-stained oak)
                              </span>
                              <span className="font-sans text-[13px] leading-[1.5] text-ink-muted tabular-nums flex-shrink-0">
                                + {formatGBP(framingPence)}
                              </span>
                            </div>
                          )}
                          {embellishPence > 0 && (
                            <div className="flex items-baseline justify-between gap-4">
                              <span className="font-sans text-[13px] leading-[1.5] text-ink-muted min-w-0">
                                Hand-finished by Polly Wedge
                              </span>
                              <span className="font-sans text-[13px] leading-[1.5] text-ink-muted tabular-nums flex-shrink-0">
                                + {formatGBP(embellishPence)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-baseline justify-between gap-4 pt-1.5 mt-0.5 border-t border-line">
                            <span className="font-sans text-[11px] font-bold tracking-[0.16em] uppercase text-ink-muted min-w-0">
                              Line total
                            </span>
                            <span className="font-sans text-[13px] font-semibold text-ink tabular-nums flex-shrink-0">
                              {formatGBP(lineTotalPence(line))}
                            </span>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Reveal>

            <Reveal as="div" className="mt-10">
              <Separator className="bg-line mb-8" />

              {/* PRICE BREAKDOWN — DMCC #13: the genuine pre-discount subtotal,
                  the bundle discount (the SAME percent Stripe charges), the
                  net, then mandatory delivery — all shown upfront with equal
                  prominence, nothing first revealed at Stripe. */}
              <dl className="m-0 flex flex-col gap-2.5 mb-5">
                <div className="flex items-baseline justify-between gap-6">
                  <dt className="font-sans text-[14px] leading-[1.5] text-ink-muted m-0 min-w-0">
                    Subtotal{" "}
                    <span className="text-[12px]">(prints + selected add-ons)</span>
                  </dt>
                  <dd className="font-sans text-[15px] text-ink m-0 tabular-nums flex-shrink-0">
                    {formatGBP(subtotalPence)}
                  </dd>
                </div>
                {bundleDiscountPercent > 0 && (
                  <div className="flex items-baseline justify-between gap-6">
                    <dt className="font-sans text-[14px] leading-[1.5] text-accent m-0 min-w-0">
                      Estate bundle thank-you ({bundleDiscountPercent}%)
                    </dt>
                    <dd className="font-sans text-[15px] text-accent m-0 tabular-nums flex-shrink-0">
                      − {formatGBP(bundleDiscountPence)}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="flex items-baseline justify-between gap-6 mb-3">
                <p className={cn(EYEBROW_MUTED, "m-0 min-w-0")}>
                  {bundleDiscountPercent > 0 ? "Total before delivery" : "Subtotal"}
                </p>
                <p className="font-display font-semibold tracking-[-0.02em] text-[clamp(26px,3vw,44px)] text-ink m-0 tabular-nums flex-shrink-0">
                  {formatGBP(discountedSubtotalPence)}
                </p>
              </div>

              {/* MANDATORY DELIVERY — shown in full upfront (the estate only
                  ships; UK delivery is unavoidable). When a framed print is in
                  the basket the framed-shipping surcharge is folded into these
                  figures (and called out), so the rate the buyer sees here is
                  exactly the rate charged at Stripe. */}
              <div className="border border-line/70 rounded-2xl p-4 sm:p-5 mb-3">
                <p className={cn(EYEBROW_TIGHT, "m-0 mb-2.5")}>
                  Delivery — chosen at checkout
                </p>
                <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
                  <li className="flex items-baseline justify-between gap-4">
                    <span className="font-sans text-[13.5px] leading-[1.5] text-ink-muted min-w-0">
                      United Kingdom
                    </span>
                    <span className="font-sans text-[13.5px] leading-[1.5] text-ink tabular-nums flex-shrink-0">
                      {formatGBP(shipping.ukPence)}
                    </span>
                  </li>
                  <li className="flex items-baseline justify-between gap-4">
                    <span className="font-sans text-[13.5px] leading-[1.5] text-ink-muted min-w-0">
                      Europe
                    </span>
                    <span className="font-sans text-[13.5px] leading-[1.5] text-ink tabular-nums flex-shrink-0">
                      {formatGBP(shipping.euPence)}
                    </span>
                  </li>
                  <li className="flex items-baseline justify-between gap-4">
                    <span className="font-sans text-[13.5px] leading-[1.5] text-ink-muted min-w-0">
                      Worldwide
                    </span>
                    <span className="font-sans text-[13.5px] leading-[1.5] text-ink tabular-nums flex-shrink-0">
                      {formatGBP(shipping.wwPence)}
                    </span>
                  </li>
                </ul>
                {shipping.hasFramedItem ? (
                  <p className="font-sans font-normal text-[12.5px] leading-[1.55] text-ink-muted m-0 mt-3">
                    Includes the framed-delivery surcharge for the framed
                    print{lines.filter((l) => l.item.framing).length > 1 ? "s" : ""}{" "}
                    in your basket (UK +{formatGBP(shipping.framedUkSurchargePence)} ·
                    Europe / Worldwide +{formatGBP(shipping.intlSurchargePence)}).
                    These are the final delivery rates — nothing further is added
                    at checkout.
                  </p>
                ) : (
                  <p className="font-sans font-normal text-[12.5px] leading-[1.55] text-ink-muted m-0 mt-3">
                    Flat rates, nothing further added at checkout. Each print
                    ships within 7–10 working days.
                  </p>
                )}
              </div>

              <p className="font-sans font-normal text-[12px] leading-[1.6] text-ink-muted m-0 mb-8">
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
                <p role="alert" className="mt-4 font-sans text-[13px] text-accent m-0">{errorMsg}</p>
              )}
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
