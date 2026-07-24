import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  subscribeToAdds,
  getBasketTotalQuantity,
  type BasketItem,
} from "../lib/basket";
import {
  getPaintingById,
  getPrintTiers,
  getAnchorTier,
  type PrintTier,
} from "../data/paintings";
import { useCurrency } from "../lib/currency";
import { cn } from "../lib/cn";
import { BTN_PRIMARY } from "./ui/tokens";

/**
 * AddedConfirmation — the single, centered "Added to basket" confirmation shown
 * the instant a print is added (replaces the old right-edge CartDrawer). One
 * clean modal in the middle of the screen: a tick, the item, its quantity, and
 * two paths — go to the (basket + account) page, or keep browsing. The
 * best-in-class Nike/Apple pattern, in the estate's dark-shell / cream-ink
 * register. The nav basket button now links straight to /basket, so there is no
 * competing drawer.
 *
 * Pricing parity: the line total is computed the SAME way as Basket.tsx /
 * api/checkout.ts (tier.pricePence + billable add-ons) × quantity, off the
 * canonical PRINT_TIERS, so it can never mis-state what checkout will charge.
 */

const lineUnitPence = (item: BasketItem, tier: PrintTier): number => {
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

interface Resolved {
  title: string;
  colourwayName: string;
  image: string;
  tierLabel: string;
  size: string;
  addons: string[];
  quantity: number;
  linePence: number;
}

const resolve = (item: BasketItem): Resolved | null => {
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
  const quantity = item.quantity >= 1 ? item.quantity : 1;
  return {
    title: painting.title,
    colourwayName: colourway.name,
    image: colourway.image,
    tierLabel: tier.label,
    size: tier.size,
    addons,
    quantity,
    linePence: lineUnitPence(item, tier) * quantity,
  };
};

// How long the confirmation lingers before quietly auto-dismissing.
const AUTO_DISMISS_MS = 4200;

export const AddedConfirmation = () => {
  const reduce = useReducedMotion();
  const { format } = useCurrency();
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<Resolved | null>(null);
  const [basketCount, setBasketCount] = useState(0);
  const dismissTimer = useRef<number | null>(null);

  useEffect(() => {
    const unsub = subscribeToAdds((n) => {
      const resolved = resolve(n.item);
      if (!resolved) return; // never pop an empty confirmation
      setRow(resolved);
      setBasketCount(getBasketTotalQuantity());
      setOpen(true);
      if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current);
      dismissTimer.current = window.setTimeout(() => setOpen(false), AUTO_DISMISS_MS);
    });
    return () => {
      unsub();
      if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current);
    };
  }, []);

  // Escape closes; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <AnimatePresence>
      {open && row && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          {/* Scrim */}
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-black/65 cursor-default"
          />
          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Added to basket"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 10 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 6 }}
            transition={{ type: "tween", duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className="relative w-full max-w-[400px] bg-bg border border-line rounded-[12px] shadow-lift px-6 pt-6 pb-6"
          >
            {/* Close */}
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center text-ink-muted hover:text-ink transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Tick + heading */}
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M3.2 8.4l3 3 6.6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="font-display text-[19px] leading-none text-ink m-0">
                Added to basket
              </p>
            </div>

            {/* Item */}
            <div className="mt-5 flex gap-4">
              <img
                src={row.image}
                alt=""
                aria-hidden="true"
                className="h-20 w-20 shrink-0 object-cover ring-1 ring-line bg-bg-soft"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[16px] leading-tight text-ink m-0">
                  {row.title}
                </p>
                <p className="mt-1 font-sans text-[12px] leading-[1.5] text-ink-muted m-0">
                  {row.colourwayName} · {row.tierLabel} · {row.size}
                  {row.addons.length > 0 && ` · ${row.addons.join(" · ")}`}
                </p>
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <span className="font-sans text-[13px] text-ink-muted [font-variant-numeric:tabular-nums]">
                    Qty {row.quantity}
                  </span>
                  <span className="font-display text-[16px] text-ink [font-variant-numeric:tabular-nums]">
                    {format(row.linePence)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                to="/basket"
                onClick={close}
                className={cn(BTN_PRIMARY, "w-full")}
              >
                Go to basket
                {basketCount > 0 && (
                  <span aria-hidden="true" className="ml-2 [font-variant-numeric:tabular-nums]">
                    ({basketCount})
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={close}
                className="w-full font-sans text-[13px] text-ink-muted hover:text-ink transition-colors bg-transparent border-0 cursor-pointer py-1.5"
              >
                Continue browsing
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddedConfirmation;
