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
import { useBasket, useGiftCards, removeItem, type BasketItem, type GiftBasketItem } from "../lib/basket";
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

/**
 * The bundle discount in pence the way STRIPE actually charges it — to the
 * penny — for ANY basket (bundle, add-ons, mixed). [gotcha #9]
 *
 * api/checkout.ts mints a single coupon with an INTEGER `percent_off` and lets
 * Stripe apply it. Stripe distributes a `percent_off` coupon by discounting
 * EACH line item independently — `round(lineAmount * percent / 100)` per line,
 * rounded to the nearest penny — then sums. The print, framing and
 * embellishment are SEPARATE line items there, so each is rounded on its own.
 *
 * The old preview rounded ONCE over the whole subtotal
 * (`round(subtotal * pct / 100)`), which can differ from the sum of per-line
 * roundings by 1–2p on a mixed basket. We now replicate the per-line-item
 * rounding exactly, so the displayed saving == the Stripe charge to the penny.
 */
const bundleDiscountPenceFor = (
  lines: ResolvedLine[],
  percent: number,
): number => {
  if (percent <= 0) return 0;
  let discount = 0;
  for (const line of lines) {
    for (const amount of stripeLineItemsFor(line)) {
      discount += Math.round((amount * percent) / 100);
    }
  }
  return discount;
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
const shippingPreview = (_lines: ResolvedLine[]) => ({
  ukPence: 0,
  euPence: 0,
  wwPence: 0,
});

export const Basket = () => {
  usePageTitle("Your Basket");
  const items = useBasket();
  const lines = resolveLines(items);

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
  const bundleDiscountPence = bundleDiscountPenceFor(lines, bundleDiscountPercent);
  const discountedSubtotalPence = subtotalPence - bundleDiscountPence;
  // Grand total = discounted prints + gift-card face values (delivery is free).
  const grandTotalPence = discountedSubtotalPence + giftTotalPence;

  // Mandatory shipping (shown upfront, equal prominence) + framed surcharge.
  const shipping = shippingPreview(lines);

  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const onCheckout = async () => {
    if (isEmpty) return;
    setStatus("loading");
    setErrorMsg("");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
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

        {isEmpty ? (
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
            {lines.length > 0 && (
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
                          className="block flex-shrink-0 w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] 2xl:w-[128px] 2xl:h-[128px] overflow-hidden ring-1 ring-line"
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
                        <div className="mt-4 ml-0 sm:ml-[132px] 2xl:ml-[156px] flex flex-col gap-1.5">
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
            )}

            {giftCards.length > 0 && (
              <Reveal as="div" className={lines.length > 0 ? "mt-2" : ""}>
                {lines.length === 0 && <Separator className="bg-line mb-8" />}
                <ul className="list-none p-0 m-0 flex flex-col">
                  {giftCards.map((g: GiftBasketItem) => (
                    <li
                      key={g.addedAt}
                      className="py-6 border-t border-line first:border-t-0"
                    >
                      <div className="flex gap-5 sm:gap-7 items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-semibold tracking-[-0.025em] text-[clamp(18px,2vw,26px)] text-ink leading-tight m-0">
                            Gift card
                          </p>
                          <p className={cn(EYEBROW_TIGHT, "m-0 mt-2")}>{g.label}</p>
                          {(g.recipientName || g.recipientEmail) && (
                            <p className="font-sans font-normal text-[13px] leading-[1.6] text-ink-muted m-0 mt-1.5">
                              For {g.recipientName || g.recipientEmail}
                            </p>
                          )}
                          {g.giftMessage && (
                            <p className="font-display italic text-[13px] leading-[1.55] text-ink/55 m-0 mt-1.5">
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
                        <p className="font-display font-semibold tracking-[-0.02em] text-[clamp(16px,1.6vw,24px)] text-ink m-0 flex-shrink-0">
                          {formatGBP(g.amountPence)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}

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
                {giftTotalPence > 0 && (
                  <div className="flex items-baseline justify-between gap-6">
                    <dt className="font-sans text-[14px] leading-[1.5] text-ink-muted m-0 min-w-0">
                      Gift cards
                    </dt>
                    <dd className="font-sans text-[15px] text-ink m-0 tabular-nums flex-shrink-0">
                      {formatGBP(giftTotalPence)}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="flex items-baseline justify-between gap-6 mb-3">
                <p className={cn(EYEBROW_MUTED, "m-0 min-w-0")}>
                  Total <span className="text-[12px] normal-case tracking-normal">(delivery free)</span>
                </p>
                <p className="font-display font-semibold tracking-[-0.02em] text-[clamp(26px,3vw,44px)] text-ink m-0 tabular-nums flex-shrink-0">
                  {formatGBP(grandTotalPence)}
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
                      <span className="font-sans text-[13.5px] leading-[1.5] text-ink-muted min-w-0">
                        {region}
                      </span>
                      <span className="font-sans text-[13.5px] leading-[1.5] text-ink tabular-nums flex-shrink-0">
                        {pence === 0 ? "Free" : formatGBP(pence)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="font-sans font-normal text-[12.5px] leading-[1.55] text-ink-muted m-0 mt-3">
                  Free delivery on every order — framed or unframed — with nothing
                  added at checkout. Each print ships within 7–10 working days.
                </p>
              </div>

              <p className="font-sans font-normal text-[12px] leading-[1.6] text-ink-muted m-0 mb-7">
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
