import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  useBasketLines,
  removeItem,
  isGiftItem,
  subscribeToAdds,
  getLastAddNotification,
  type BasketItem,
  type GiftBasketItem,
} from "../lib/basket";
import { subscribeToCartOpen } from "../lib/cartDrawer";
import {
  getPaintingById,
  getPrintTiers,
  getAnchorTier,
  type PrintTier,
} from "../data/paintings";
import { useCurrency } from "../lib/currency";
import { cn } from "../lib/cn";

/**
 * CartDrawer — the slide-in basket the site opens the instant a print is added
 * (and when the Nav basket button is tapped). Replaces the old bottom-centre
 * BasketToast: instead of a 2.5s corner card, the buyer gets a real cart preview
 * — the added line highlighted, every line with its price, a remove control, the
 * subtotal, and one clear path to checkout — without leaving the product page.
 * The best-in-class shop pattern, in the site's dark-shell / cream-ink register.
 *
 * Pricing parity: each line's total is computed the SAME way as Basket.tsx /
 * api/checkout.ts (tier.pricePence + billable framing/embellishment/canvas
 * add-ons), off the canonical PRINT_TIERS, so the drawer can never mis-state
 * what the basket or Stripe will charge. The subtotal shown is the honest
 * pre-bundle-discount figure (the /basket page then shows any bundle saving).
 *
 * Behaviour: opens on add (subscribeToAdds) + on manual request
 * (subscribeToCartOpen); Escape / scrim / close-button dismiss; body scroll is
 * locked while open; focus moves to the panel on open; motion is a right-edge
 * slide + scrim fade, collapsing to a plain fade under reduced-motion.
 */

// Add-on total for a print line — mirrors Basket.tsx's line maths exactly.
const lineTotalPence = (item: BasketItem, tier: PrintTier): number => {
  const framing =
    item.framing === true && typeof tier.framingPricePence === "number"
      ? tier.framingPricePence
      : 0;
  const embellish =
    item.embellished === true && typeof tier.embellishmentPricePence === "number"
      ? tier.embellishmentPricePence
      : 0;
  const canvas =
    item.canvas === true && typeof tier.canvasPricePence === "number"
      ? tier.canvasPricePence
      : 0;
  return tier.pricePence + framing + embellish + canvas;
};

interface ResolvedPrint {
  kind: "print";
  addedAt: number;
  title: string;
  colourwayName: string;
  image: string;
  tier: PrintTier;
  addons: string[];
  pricePence: number;
}
interface ResolvedGift {
  kind: "gift";
  addedAt: number;
  label: string;
  recipientName?: string;
  pricePence: number;
}
type ResolvedRow = ResolvedPrint | ResolvedGift;

const resolvePrint = (item: BasketItem): ResolvedPrint | null => {
  const painting = getPaintingById(item.paintingId);
  if (!painting) return null;
  const colourway = painting.colourways.find(
    (c) => c.name === item.colourwayName && c.available,
  );
  if (!colourway) return null;
  const tiers = getPrintTiers(painting);
  const tier = tiers.find((t) => t.id === item.tierId) ?? getAnchorTier(painting);
  const addons: string[] = [];
  if (item.canvas === true && tier.canvasPricePence) addons.push("Stretched canvas");
  if (item.framing === true && tier.framingPricePence) addons.push("Hand-framed");
  if (item.embellished === true && tier.embellishmentPricePence)
    addons.push("Hand-finished");
  return {
    kind: "print",
    addedAt: item.addedAt,
    title: painting.title,
    colourwayName: colourway.name,
    image: colourway.image,
    tier,
    addons,
    pricePence: lineTotalPence(item, tier),
  };
};

const resolveGift = (g: GiftBasketItem): ResolvedGift => ({
  kind: "gift",
  addedAt: g.addedAt,
  label: g.label,
  recipientName: g.recipientName,
  pricePence: g.amountPence,
});

export const CartDrawer = () => {
  const reduce = useReducedMotion();
  const lines = useBasketLines();
  const { format } = useCurrency();
  const [open, setOpen] = useState(false);
  // addedAt of the line most recently added — briefly highlighted on open.
  const [flashKey, setFlashKey] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const flashTimer = useRef<number | null>(null);

  // Open on add (highlight the added line) + on manual request.
  useEffect(() => {
    const flash = (addedAt: number | null) => {
      setFlashKey(addedAt);
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
      if (addedAt !== null) {
        flashTimer.current = window.setTimeout(() => setFlashKey(null), 2200);
      }
    };
    const unsubAdd = subscribeToAdds((n) => {
      setOpen(true);
      flash(n.item.addedAt);
    });
    const unsubOpen = subscribeToCartOpen(() => {
      setOpen(true);
      flash(getLastAddNotification()?.item.addedAt ?? null);
    });
    return () => {
      unsubAdd();
      unsubOpen();
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    };
  }, []);

  // Escape to close + lock body scroll while open + focus the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [open]);

  const rows: ResolvedRow[] = lines
    .map((line) =>
      isGiftItem(line) ? resolveGift(line) : resolvePrint(line as BasketItem),
    )
    .filter((r): r is ResolvedRow => r !== null);

  const subtotalPence = rows.reduce((sum, r) => sum + r.pricePence, 0);
  const count = rows.length;
  const close = () => setOpen(false);

  const slideX = reduce ? 0 : "100%";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[150]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Scrim */}
          <button
            type="button"
            aria-label="Close basket"
            onClick={close}
            className="absolute inset-0 bg-black/60 cursor-default"
          />
          {/* Panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Your basket"
            tabIndex={-1}
            initial={{ x: slideX }}
            animate={{ x: 0 }}
            exit={{ x: slideX }}
            transition={{ type: "tween", duration: 0.36, ease: [0.22, 0.61, 0.36, 1] }}
            className="absolute right-0 top-0 h-full w-full max-w-[420px] bg-bg border-l border-line flex flex-col shadow-[-24px_0_70px_rgba(0,0,0,0.55)] outline-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-[19px] text-ink leading-none">
                  Your basket
                </span>
                {count > 0 && (
                  <span className="font-sans text-[13px] text-ink-muted leading-none">
                    {count} {count === 1 ? "item" : "items"}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center -mr-1.5 text-ink-muted hover:text-ink transition-colors"
              >
                <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Body */}
            {count === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-4">
                <p className="font-display text-[20px] text-ink m-0">Your basket is empty</p>
                <p className="font-sans text-[14px] leading-[1.6] text-ink-muted m-0 max-w-[260px]">
                  Nothing set aside yet. Explore the estate and add a piece to begin.
                </p>
                <Link
                  to="/collections"
                  onClick={close}
                  className="mt-1 inline-flex items-center bg-ink text-bg px-6 py-3 font-sans text-[13px] font-bold tracking-[0.06em] uppercase rounded-full hover:bg-accent hover:text-ink transition-colors"
                >
                  Browse the collection
                </Link>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {rows.map((r) => (
                  <div
                    key={r.addedAt}
                    className={cn(
                      "flex gap-3.5 py-4 border-b border-line/70 last:border-b-0 transition-colors duration-500",
                      flashKey === r.addedAt && "bg-accent/[0.07]",
                    )}
                  >
                    {r.kind === "print" ? (
                      <img
                        src={r.image}
                        alt=""
                        aria-hidden="true"
                        className="h-16 w-16 shrink-0 object-cover ring-1 ring-line bg-bg-soft"
                        loading="lazy"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-16 w-16 shrink-0 items-center justify-center ring-1 ring-line bg-bg-soft font-display text-accent text-[20px]"
                      >
                        ✦
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-display text-[15px] leading-tight text-ink m-0 truncate">
                          {r.kind === "print" ? r.title : r.label}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeItem(r.addedAt)}
                          aria-label={`Remove ${r.kind === "print" ? r.title : "gift card"}`}
                          className="shrink-0 -mt-0.5 -mr-1 flex h-6 w-6 items-center justify-center text-ink-faint hover:text-accent transition-colors"
                        >
                          <svg width="13" height="13" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                      {r.kind === "print" ? (
                        <>
                          <p className="mt-1 font-sans text-[12px] tracking-[0.08em] uppercase text-accent m-0">
                            {r.colourwayName}
                          </p>
                          <p className="mt-0.5 font-sans text-[12px] leading-[1.5] text-ink-muted m-0">
                            {r.tier.label} · {r.tier.size}
                            {r.addons.length > 0 && (
                              <span className="text-ink-faint"> · {r.addons.join(" · ")}</span>
                            )}
                          </p>
                        </>
                      ) : (
                        r.recipientName && (
                          <p className="mt-1 font-sans text-[12px] leading-[1.5] text-ink-muted m-0">
                            For {r.recipientName}
                          </p>
                        )
                      )}
                      <p className="mt-1.5 font-display text-[14px] text-ink m-0 [font-variant-numeric:tabular-nums]">
                        {format(r.pricePence)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            {count > 0 && (
              <div className="shrink-0 border-t border-line px-5 pt-4 pb-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-sans text-[12px] font-bold tracking-[0.12em] uppercase text-ink-muted">
                    Subtotal
                  </span>
                  <span className="font-display text-[19px] text-ink [font-variant-numeric:tabular-nums]">
                    {format(subtotalPence)}
                  </span>
                </div>
                <p className="font-sans text-[12px] leading-[1.5] text-ink-faint m-0 mb-4">
                  Delivery free worldwide · any bundle saving is applied at checkout.
                </p>
                <Link
                  to="/basket"
                  onClick={close}
                  className="flex items-center justify-center w-full bg-ink text-bg px-6 py-3.5 font-sans text-[13px] font-bold tracking-[0.08em] uppercase rounded-full hover:bg-accent hover:text-ink transition-colors"
                >
                  Go to checkout
                  <span aria-hidden="true" className="ml-2">→</span>
                </Link>
                <button
                  type="button"
                  onClick={close}
                  className="block w-full mt-2.5 font-sans text-[13px] text-ink-muted hover:text-ink transition-colors bg-transparent border-0 cursor-pointer py-1"
                >
                  Continue browsing
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
