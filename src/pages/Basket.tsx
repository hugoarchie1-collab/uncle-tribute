import { useState } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
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
  type PrintTier,
} from "../data/paintings";
import { useBasket, removeItem, type BasketItem } from "../lib/basket";
import { usePageTitle } from "../lib/usePageTitle";

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

export const Basket = () => {
  usePageTitle("Your Basket");
  const items = useBasket();
  const lines = resolveLines(items);
  // Subtotal includes add-ons (framing + hand-finishing) so the buyer sees
  // the same number on the basket page as on Stripe Checkout.
  const subtotalPence = lines.reduce((sum, l) => {
    let lineTotal = l.tier.pricePence;
    if (l.item.framing && typeof l.tier.framingPricePence === "number") {
      lineTotal += l.tier.framingPricePence;
    }
    if (l.item.embellished && typeof l.tier.embellishmentPricePence === "number") {
      lineTotal += l.tier.embellishmentPricePence;
    }
    return sum + lineTotal;
  }, 0);

  // Bundle discount preview — Stripe does the actual math; we only show
  // the policy line so the buyer knows the discount is coming.
  const bundleDiscountPercent =
    lines.length >= 3 ? 10 : lines.length === 2 ? 5 : 0;

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
      <Nav />
      <main className="flex-1 mx-auto w-full max-w-[820px] px-4 md:px-8 lg:px-12 pt-6 pb-20 md:pb-28">
        <Reveal>
          <p className="font-sans text-[10px] font-bold tracking-[0.34em] uppercase text-ink/60 m-0 mb-5">
            The Estate
          </p>
          <h1 className="font-display font-bold tracking-[-0.04em] leading-[1.02] text-[clamp(36px,5vw,64px)] text-ink m-0 mb-10">
            Your Basket
          </h1>
        </Reveal>

        {lines.length === 0 ? (
          <Reveal as="div" className="max-w-[640px]">
            <Separator className="bg-white/10 mb-8" />
            <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/85 m-0 mb-8">
              Your basket is empty. Each print is individually made to order by a UK atelier,
              estate-stamped on behalf of The Mandala Company.
            </p>
            <Link
              to="/collections"
              className="inline-flex items-center bg-ink text-bg px-7 py-3.5 font-sans text-[11px] font-bold tracking-[0.18em] uppercase rounded-full hover:bg-accent hover:text-ink transition-colors"
            >
              Browse the collections <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <NewsletterSignup variant="inline" />
          </Reveal>
        ) : (
          <>
            <Reveal as="div">
              <Separator className="bg-white/10 mb-8" />
              <ul className="list-none p-0 m-0 flex flex-col">
                {lines.map((line, i) => (
                  <li
                    key={line.item.addedAt}
                    className={
                      i === 0
                        ? "py-6 first:pt-0"
                        : "py-6 border-t border-white/10"
                    }
                  >
                    <div className="flex gap-5 sm:gap-7 items-start">
                      <Link
                        to={`/collections/${line.paintingId}`}
                        className="block flex-shrink-0 w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] overflow-hidden"
                        aria-label={`${line.title} — view painting`}
                      >
                        <AssetImage
                          src={line.image}
                          alt={`${line.title} — ${line.colourwayName}`}
                          className="w-full h-full object-cover block"
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
                          className="font-display font-bold tracking-[-0.02em] text-[clamp(18px,2vw,22px)] text-ink leading-tight hover:text-accent transition-colors"
                        >
                          {line.title}
                        </Link>
                        {/* Tier eyebrow — same register as the collection
                            badge above. Surfaces label · size · edition. */}
                        <p className="font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-accent/80 m-0 mt-2">
                          {line.tier.label} · {line.tier.size.split(" ")[0]} · {line.tier.editionLabel}
                        </p>
                        <p className="font-sans font-normal text-[13px] leading-[1.6] text-ink/65 m-0 mt-1.5">
                          {line.colourwayName}
                          {line.item.framing && (
                            <span className="ml-2 text-ink/55">· framed</span>
                          )}
                          {line.item.embellished && (
                            <span className="ml-2 text-ink/55">· hand-finished by Polly</span>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeItem(line.item.addedAt)}
                          className="mt-3 inline-flex items-center font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-ink/55 hover:text-accent transition-colors bg-transparent border-0 p-0 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                      <p className="font-display font-bold tracking-[-0.02em] text-[clamp(16px,1.6vw,20px)] text-ink m-0 flex-shrink-0">
                        {formatGBP(line.tier.pricePence)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal as="div" className="mt-10">
              <Separator className="bg-white/10 mb-8" />
              {bundleDiscountPercent > 0 && (
                <p className="font-sans italic text-[13px] leading-[1.6] text-accent/80 m-0 mb-3">
                  Estate bundle thank-you — {bundleDiscountPercent}% applied at checkout.
                </p>
              )}
              <div className="flex items-baseline justify-between gap-6 mb-3">
                <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/55 m-0">
                  Subtotal
                </p>
                <p className="font-display font-bold tracking-[-0.02em] text-[clamp(26px,3vw,36px)] text-ink m-0">
                  {formatGBP(subtotalPence)}
                </p>
              </div>
              <p className="font-sans font-normal text-[13.5px] leading-[1.65] text-ink/65 m-0 mb-2">
                Shipping calculated at checkout. UK £15 · Europe £35 · Worldwide £60.
                Each print ships within 7–10 working days.
              </p>
              <p className="font-sans italic text-[12px] leading-[1.6] text-ink/50 m-0 mb-8">
                International buyers may be charged local import duties on delivery.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onCheckout}
                  disabled={status === "loading"}
                  className="inline-flex items-center bg-ink text-bg px-7 py-3.5 font-sans text-[11px] font-bold tracking-[0.18em] uppercase rounded-full hover:bg-accent hover:text-ink transition-colors disabled:opacity-60"
                >
                  {status === "loading" ? "Opening checkout…" : "Proceed to checkout"}
                  <span aria-hidden="true" className="ml-2">→</span>
                </button>
                <Link
                  to="/collections"
                  className="inline-flex items-center text-ink ring-1 ring-ink/30 px-7 py-3.5 font-sans text-[11px] font-bold tracking-[0.18em] uppercase rounded-full hover:ring-accent hover:text-accent transition-all"
                >
                  Continue browsing
                </Link>
              </div>
              {status === "error" && (
                <p className="mt-4 font-sans text-[13px] text-accent m-0">{errorMsg}</p>
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
      <Footer />
    </div>
  );
};
