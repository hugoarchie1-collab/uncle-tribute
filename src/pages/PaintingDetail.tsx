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
import { asset } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";
import { cn } from "../lib/cn";
import { addItem } from "../lib/basket";

/**
 * Order-print block — size picker, authentication micro-list, price, and
 * the dual-action CTA.
 *
 * Two buttons side-by-side:
 *   1. "Add to basket" — primary, filled ink. Adds the painting + selected
 *      colourway + selected tier (+ optional framing / embellishment) to
 *      the localStorage-backed basket and shows a brief "Added — view
 *      basket" microcopy under the buttons.
 *   2. "Buy now" — secondary, outlined accent. Skips the basket and POSTs
 *      the single item straight to /api/checkout with the selected tier
 *      and add-ons.
 *
 * Two add-on checkboxes appear between the auth micro-list and the action
 * buttons: framing (hand-made oak frame) and hand-finishing by Polly Wedge.
 * Both are disabled on tiers that don't carry the corresponding add-on
 * price (currently A3 and A0).
 */
const OrderPrintBlock = ({
  painting,
  colourwayName,
  selectedTier,
  onSelectTier,
  tiers,
  framing,
  embellished,
  onFramingChange,
  onEmbellishedChange,
}: {
  painting: Painting;
  colourwayName: string;
  selectedTier: PrintTier;
  onSelectTier: (id: PrintTier["id"]) => void;
  tiers: PrintTier[];
  framing: boolean;
  embellished: boolean;
  onFramingChange: (next: boolean) => void;
  onEmbellishedChange: (next: boolean) => void;
}) => {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  // The confirmation pill records *which* selection was last added and at
  // what timestamp. When the buyer switches painting/colourway/tier we
  // treat the stale confirmation as silently invalidated.
  const [addedFor, setAddedFor] = useState<{
    paintingId: string;
    colourway: string;
    tierId: PrintTier["id"];
    at: number;
  } | null>(null);
  const fadeTimerRef = useRef<number | null>(null);

  const framingOffered = typeof selectedTier.framingPricePence === "number";
  const embellishOffered = typeof selectedTier.embellishmentPricePence === "number";

  const showAdded =
    addedFor !== null &&
    addedFor.paintingId === painting.id &&
    addedFor.colourway === colourwayName &&
    addedFor.tierId === selectedTier.id;

  useEffect(() => () => {
    if (fadeTimerRef.current !== null) window.clearTimeout(fadeTimerRef.current);
  }, []);

  const onAdd = () => {
    addItem(
      painting.id,
      colourwayName,
      selectedTier.id,
      framingOffered && framing,
      embellishOffered && embellished,
    );
    const stamp = Date.now();
    setAddedFor({
      paintingId: painting.id,
      colourway: colourwayName,
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
    // 15s ceiling so the button can never hang forever if the serverless
    // function stalls (the prior gotcha #3 symptom).
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paintingId: painting.id,
          colourwayName,
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
      // Hand off to Stripe-hosted checkout
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
    <>
      <Separator className="bg-white/10 mb-8" />
      <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/55 m-0 mb-3">
        Order a print
      </p>
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 mb-5">
        <p className="font-display font-bold tracking-[-0.02em] text-[clamp(28px,3vw,40px)] text-ink m-0">
          {formatGBP(selectedTier.pricePence)}
        </p>
        <p className="font-sans font-normal text-[13.5px] leading-[1.6] text-ink/65 m-0">
          {selectedTier.size} · {selectedTier.editionLabel}
        </p>
      </div>

      {/* SIZE PICKER — one card per visible tier. Anchor tier carries the
          "Most chosen" pill. Same restrained register as the colourway
          swatches above. */}
      <div
        role="radiogroup"
        aria-label="Print size"
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6"
      >
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
                "relative text-left bg-transparent border-0 p-4 cursor-pointer transition-all duration-300 ring-1",
                isSelected
                  ? "ring-ink shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
                  : "ring-white/15 hover:ring-white/40",
              )}
            >
              {tier.isAnchor && (
                <span
                  aria-hidden="true"
                  className="absolute -top-2 right-3 inline-flex items-center bg-bg px-2 py-0.5 font-sans text-[9px] font-bold tracking-[0.22em] uppercase text-accent rounded-full ring-1 ring-accent/40"
                >
                  Most chosen
                </span>
              )}
              <p className="font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-ink/55 m-0 mb-1.5">
                {tier.label}
              </p>
              <p className="font-display font-bold tracking-[-0.01em] text-[15px] leading-[1.25] text-ink m-0 mb-1">
                {tier.size}
              </p>
              <p className="font-sans text-[12px] leading-[1.5] text-ink/60 m-0 mb-2">
                {tier.editionLabel}
              </p>
              <p className="font-display font-bold tracking-[-0.01em] text-[16px] text-ink m-0">
                {formatGBP(tier.pricePence).replace(".00", "")}
              </p>
            </button>
          );
        })}
      </div>

      {/* AUTHENTICATION MICRO-LIST — single source of truth from
          ESTATE_AUTHENTICATION. Same shared lines surface in the basket
          line items and the order confirmation email. */}
      <p className="font-sans text-[12px] leading-[1.65] text-ink/65 m-0 mb-6">
        {ESTATE_AUTHENTICATION.stamp}
        <span className="text-accent/80 mx-2" aria-hidden="true">·</span>
        {ESTATE_AUTHENTICATION.numbering}
        <span className="text-accent/80 mx-2" aria-hidden="true">·</span>
        {ESTATE_AUTHENTICATION.coa}
      </p>

      {/* Three-line shipping/provenance note — each fact scannable on
          its own row instead of buried in a single prose paragraph. */}
      <ul className="list-none p-0 m-0 mb-6 flex flex-col gap-1.5 font-sans font-normal text-[13.5px] leading-[1.6] text-ink/65">
        <li className="m-0">{ESTATE_AUTHENTICATION.printer}</li>
        <li className="m-0">Ships in 7–10 working days</li>
        <li className="m-0">UK £15 · Europe £35 · Worldwide £60 (unframed)</li>
      </ul>

      {/* ADD-ONS — restrained ink/cream register, same visual weight as the
          size picker. Both checkboxes are disabled on tiers that don't
          carry the add-on price (currently A3 and A0). The label still
          surfaces the price band so the buyer can see what they'd be
          adding before they upgrade size. */}
      <fieldset className="border-0 p-0 m-0 mb-6 flex flex-col gap-2.5">
        <legend className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/55 m-0 mb-2 p-0">
          Add-ons
        </legend>
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
              {" "}— black-stained oak, cast acrylic glazing for safe transit. +£295 (A2) / +£395 (A1), plus a small framed-shipping surcharge at checkout. Allow 2 weeks.
            </span>
            {!framingOffered && (
              <span className="font-sans text-[11px] text-ink/50">
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
              {" "}— adds £350 (A2) / £495 (A1). Allow 4 weeks.
            </span>
            <span className="font-sans text-[12px] leading-[1.55] text-ink/55">
              {EMBELLISHMENT_NOTE}
            </span>
            {!embellishOffered && (
              <span className="font-sans text-[11px] text-ink/50">
                Hand-finishing offered on A2 and A1 sizes only.
              </span>
            )}
          </span>
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
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
      {/* Microcopy confirmation — fades after 2.5s. Reserve space so the
          layout below doesn't jump; opacity-only transition. */}
      <p
        aria-live="polite"
        className={cn(
          "mt-3 font-sans text-[12px] tracking-[0.04em] text-ink/65 m-0 transition-opacity duration-500",
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
        <p className="mt-2 font-sans text-[13px] text-accent m-0">{errorMsg}</p>
      )}
    </>
  );
};

// ─── StickyAddBar ──────────────────────────────────────────────────────────
// Desktop-only floating "Add to basket" bar. Becomes visible after the user
// scrolls past the hero AND before they reach the order block, so the
// affordance is present exactly during the long-form reading stretch where
// the inline CTA is offscreen. Two IntersectionObserver sentinels do the
// detection without any scroll-event polling.
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

    // The hero sentinel sits just below the painting hero. Once it leaves
    // the viewport upwards, the user has scrolled past the painting.
    const heroObs = new IntersectionObserver(
      ([entry]) => {
        // `boundingClientRect.top < 0` means the sentinel is above the
        // viewport (i.e. we've scrolled past it).
        setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    heroObs.observe(heroEl);

    // The order sentinel sits at the top of the order block. Once it
    // enters the viewport, we're at/in the order block so the bar can
    // step out of the way.
    const orderObs = new IntersectionObserver(
      ([entry]) => {
        setAtOrder(entry.isIntersecting);
      },
      // -10% bottom margin so the bar disappears slightly before the
      // order block reaches the floor of the viewport (looks tidier).
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );
    orderObs.observe(orderEl);

    return () => {
      heroObs.disconnect();
      orderObs.disconnect();
    };
  }, [heroSentinelRef, orderSentinelRef]);

  const visible = pastHero && !atOrder;

  const framingOffered = typeof selectedTier.framingPricePence === "number";
  const embellishOffered = typeof selectedTier.embellishmentPricePence === "number";
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
            <span className="font-sans text-[10px] font-bold tracking-[0.22em] uppercase text-ink/55">
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
// Fullscreen overlay that shows the painting at native resolution against
// a dark backdrop. Esc + backdrop click both close it. Body scroll is
// locked while open. Mobile pinch-zoom is native inside the overlay.
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
            className="absolute top-4 right-4 md:top-6 md:right-6 inline-flex items-center gap-2 font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/70 hover:text-accent transition-colors duration-300 bg-bg/60 backdrop-blur-sm px-3 py-2 rounded-full ring-1 ring-white/10"
          >
            Close <span aria-hidden="true">· Esc</span>
          </button>
          <motion.img
            src={imageSrc}
            alt={alt}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.36, ease: [0.22, 0.61, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain block"
            draggable={false}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const PaintingDetail = () => {
  const { id } = useParams();
  const painting = id ? getPaintingById(id) : undefined;

  usePageTitle(painting?.title);

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
  const anchorTier = useMemo(
    () => (painting ? getAnchorTier(painting) : undefined),
    [painting],
  );
  const [selectedTierId, setSelectedTierId] = useState<PrintTier["id"] | undefined>(
    anchorTier?.id,
  );

  // Add-on state — both checkboxes live on the parent so the sticky add bar
  // and the inline OrderPrintBlock share the same source of truth.
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

  const hasAlternateColourways = availableColourways.length > 1;
  // Price strip always reflects the anchor — size picker drives the buttons.
  const pricePence = anchorTier.pricePence;

  const scrollToOrder = () => {
    const el = document.getElementById("order-print");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative overflow-hidden">
      {/* Ambient backdrop — selected colourway painting blurred behind the
          page, matching the Collections-page backdrop style: blur(12px)
          saturate(1.15) brightness(0.92). Crossfades seamlessly between
          colourways as the user switches swatches. */}
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
              backgroundImage: `url("${asset(selected.image)}")`,
            }}
          />
        </AnimatePresence>
        <div className="painting-detail__ambient-veil" />
      </div>

      <div className="relative z-[1]">
        <Nav />

        <main className="mx-auto max-w-[820px] px-4 md:px-8 lg:px-12 pt-6 pb-20 md:pb-28">
          {/* Back link + persistent price/CTA strip — the price floor stays
              visible from the top of the PDP. The CTA scrolls down to the
              Add to basket / Buy now block rather than duplicating those
              actions inline (the basket flow is the single source of truth
              for purchase). */}
          <div className="flex items-center justify-between gap-4 mb-10">
            <Link
              to={collection ? `/collections#collection-${collection.id}` : "/collections"}
              className="inline-flex items-center gap-2 font-sans text-[10px] font-bold tracking-[0.34em] uppercase text-ink/60 transition-colors duration-300 hover:text-accent"
            >
              ← {collection?.title ?? "All collections"}
            </Link>
            <button
              type="button"
              onClick={scrollToOrder}
              className="inline-flex items-center gap-2 font-sans text-[11px] font-bold tracking-[0.18em] uppercase text-ink/75 hover:text-accent transition-colors duration-300 whitespace-nowrap"
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

          {/* HERO — painting in a strict square frame, no blur, no soft edges.
              Wrapped in a button that opens the fullscreen lightbox. */}
          <Reveal>
            <div className="mx-auto max-w-[760px] overflow-hidden">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label={`View ${painting.title} fullscreen`}
                className="block w-full bg-transparent border-0 p-0 cursor-zoom-in"
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={selected.image}
                    src={asset(selected.image)}
                    alt={`${painting.title} — ${selected.name}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
                    className="w-full h-auto block"
                  />
                </AnimatePresence>
              </button>
            </div>
          </Reveal>

          {/* Sentinel just below the hero — drives the sticky add bar's
              "user has scrolled past the painting" detection. */}
          <div ref={heroSentinelRef} aria-hidden="true" className="h-px w-full" />

          {/* TITLE BLOCK — centered, immediately under the painting */}
          <Reveal as="div" className="mt-12 md:mt-16 text-center max-w-[680px] mx-auto">
            {collection && (
              <div className="flex justify-center mb-5">
                <Badge variant="accent">{collection.title}</Badge>
              </div>
            )}
            <h1 className="font-display font-bold tracking-[-0.04em] leading-[1.02] text-[clamp(40px,5.2vw,68px)] text-ink m-0 mb-6">
              {painting.title}
            </h1>

            <dl className="inline-grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-[14px] text-left">
              {painting.year !== "[ DATE ]" && (
                <>
                  <dt className="font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-ink/55 pt-1">Date</dt>
                  <dd className="m-0 text-ink">{painting.year}</dd>
                </>
              )}
              {painting.size && (
                <>
                  <dt className="font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-ink/55 pt-1">Size</dt>
                  <dd className="m-0 text-ink">{painting.size}</dd>
                </>
              )}
              {painting.location && (
                <>
                  <dt className="font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-ink/55 pt-1">Painted in</dt>
                  <dd className="m-0 text-ink">{painting.location}</dd>
                </>
              )}
              {/* Quiet provenance line — a serious collector reads this and
                  knows the original isn't on the market. Surfaced as a
                  fourth dl row so it lives alongside Date / Size / Painted
                  in rather than as a separate banner. */}
              <dt className="font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-ink/55 pt-1">Original</dt>
              <dd className="m-0 text-ink/80">{ORIGINAL_PROVENANCE}</dd>
            </dl>
          </Reveal>

          {/* ARTIST QUOTE — if present */}
          {painting.artistQuote && (
            <Reveal as="div" className="mt-12 md:mt-16 max-w-[640px] mx-auto">
              <blockquote className="m-0 pl-6 border-l-2 border-accent py-2 text-center">
                <p className="font-display font-semibold text-[clamp(18px,1.9vw,22px)] leading-[1.4] text-ink m-0 mb-3">
                  &ldquo;{painting.artistQuote}&rdquo;
                </p>
                <cite className="not-italic font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/60">
                  — Stephen Meakin
                </cite>
              </blockquote>
            </Reveal>
          )}

          {/* DESCRIPTION — main body */}
          <Reveal as="div" className="mt-12 md:mt-16 max-w-[640px] mx-auto flex flex-col gap-5 font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink/90">
            {painting.description.split("\n\n").map((para, i) => (
              <p key={i} className="m-0">{para}</p>
            ))}
          </Reveal>

          {/* ORIGINAL PRINT SPEC */}
          <Reveal as="div" className="mt-14 md:mt-20 max-w-[640px] mx-auto">
            <Separator className="bg-white/10 mb-8" />
            <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/55 m-0 mb-4">
              Original Print
            </p>
            <p className="font-sans font-normal text-[15px] leading-[1.7] text-ink/85 m-0">
              {ORIGINAL_PRINT_SPEC}
            </p>
          </Reveal>

          {/* COLOURWAYS */}
          <Reveal as="div" className="mt-10 md:mt-14 max-w-[640px] mx-auto">
            <Separator className="bg-white/10 mb-8" />
            <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/55 m-0 mb-4">
              {hasAlternateColourways ? `Colourways · ${availableColourways.length}` : "Original colourway"}
            </p>

            {hasAlternateColourways && (
              <p className="font-display font-medium text-[15px] leading-[1.55] text-ink/85 m-0 mb-6">
                {COLOURWAY_NOTE}
              </p>
            )}

            {hasAlternateColourways ? (
              <div role="radiogroup" aria-label="Colourway" className="flex flex-wrap gap-4 mb-6">
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
                      onClick={() => setSelectedName(c.name)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.94 }}
                      className={cn(
                        // `group` lets the sibling name caption respond
                        // to hover without an extra wrapper element.
                        "group relative block w-12 h-12 rounded-full cursor-pointer border-0 p-0 transition-shadow duration-300",
                        isSelected
                          ? "ring-2 ring-ink ring-offset-2 ring-offset-bg shadow-[0_6px_22px_rgba(0,0,0,0.55)]"
                          : "ring-1 ring-white/25 hover:ring-white/55 shadow-[0_3px_14px_rgba(0,0,0,0.4)]",
                      )}
                      style={{
                        background: c.hex,
                        backgroundColor: c.hex,
                      }}
                    >
                      {/* Hover-revealed colourway name — buyer can scan
                          the row without clicking each swatch. Solid bg
                          pad so it stays legible over the painting
                          ambient backdrop. */}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-9 whitespace-nowrap bg-bg px-2.5 py-1 font-sans text-[10px] font-bold tracking-[0.18em] uppercase text-ink rounded-full ring-1 ring-white/10 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
                      >
                        {c.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              // Single-colourway: show a non-clickable swatch so the
              // section keeps the same visual structure as paintings
              // with multiple colourways.
              <div aria-hidden="true" className="flex mb-6">
                <span
                  className="block w-12 h-12 rounded-full ring-1 ring-white/25 shadow-[0_3px_14px_rgba(0,0,0,0.4)]"
                  style={{
                    background: selected.hex,
                    backgroundColor: selected.hex,
                  }}
                />
              </div>
            )}

            <p className="font-display font-bold tracking-[-0.02em] text-[clamp(22px,2vw,28px)] text-ink m-0">
              {selected.name}
              {selected.isOriginal && (
                <span className="ml-3 font-sans text-[10px] font-bold tracking-[0.3em] uppercase text-accent">
                  · original
                </span>
              )}
            </p>
          </Reveal>

          {/* ORDER PRINT — Stripe Checkout. Tier selection drives the price
              and the line item; the price strip at the top stays anchored
              to the recommended A2 Collector tier. */}
          <div id="order-print" className="scroll-mt-24">
            {/* Sentinel at the top of the order block — once it enters the
                viewport, the sticky add bar steps aside. */}
            <div ref={orderSentinelRef} aria-hidden="true" className="h-px w-full" />
            <Reveal as="div" className="mt-10 md:mt-14 max-w-[640px] mx-auto">
              <OrderPrintBlock
                painting={painting}
                colourwayName={selected.name}
                selectedTier={selectedTier}
                onSelectTier={setSelectedTierId}
                tiers={visibleTiers}
                framing={framing}
                embellished={embellished}
                onFramingChange={setFraming}
                onEmbellishedChange={setEmbellished}
              />
            </Reveal>
          </div>
        </main>
        <FooterCatalogue />
        <Footer />
      </div>

      {/* Sticky desktop add-to-basket bar — fixed bottom-right while the
          reader is between the hero and the order block. */}
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
