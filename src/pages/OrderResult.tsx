import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { MagneticLink } from "../components/MagneticLink";
import { ShareTheEstate } from "../components/ShareTheEstate";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { EYEBROW, EYEBROW_MUTED, EYEBROW_TIGHT, META, SUBTITLE, BTN_PRIMARY, BTN_SECONDARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { asset, webp } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";
import { getBasket, clearBasket, useBasket, type BasketItem } from "../lib/basket";
import { getStoredUtm } from "../lib/utm";
import { useNoindexHead } from "../lib/useNoindexHead";
import {
  PAINTINGS,
  getPaintingById,
  getPaintingsByCollection,
  getAnchorTier,
  formatGBP,
  type Painting,
} from "../data/paintings";

/* =============================================================================
 * COMPANION PIECES — "Complete the set" post-purchase upsell
 * -----------------------------------------------------------------------------
 * A quiet, dignified suggestion shown AFTER a successful order: 2–3 works the
 * buyer might take next — other colourways of the piece they just bought, then
 * its collection-mates, then a calm catalogue fallback. Framed as estate
 * generosity ("Stephen often worked in pairs"), never a hard sell, never a
 * "SALE" / discount badge.
 *
 * ADVERTISED == CHARGED (gotcha #9): each card starts a FRESH, single-item
 * Stripe Checkout via the SAME `/api/checkout` client path PaintingDetail's
 * "Buy now" uses — the server prices it from the canonical PRINT_TIERS ladder.
 * The card NEVER invents a price: the figure it shows is the painting's anchor
 * tier price read straight from the data layer (getAnchorTier), and the request
 * posts that SAME `tierId`, so the £ shown equals the £ Stripe charges to the
 * penny. No client-side discounting; no thank-you code is fabricated here (the
 * 10% FRIENDS- code is minted server-side and only reaches the buyer via the
 * confirmation email — so we reference it warmly without printing a code).
 * ========================================================================== */

/** One companion suggestion: a painting + a specific colourway to surface. */
interface Companion {
  painting: Painting;
  colourwayName: string;
  image: string;
  /** Short, warm reason this piece is being suggested. */
  note: string;
}

/**
 * Build up to `max` companion suggestions from the paintings the buyer just
 * bought (snapshot taken before the basket is cleared). Order of preference:
 *   1. other available colourways of a just-bought painting (a true "companion")
 *   2. collection-mates of a just-bought painting
 *   3. a calm catalogue fallback (covers the single-item "Buy now" path, where
 *      the basket may be empty by the time we land here)
 * Never suggests a colourway/painting the buyer just bought.
 */
const buildCompanions = (justBought: BasketItem[], max = 3): Companion[] => {
  const out: Companion[] = [];
  const seen = new Set<string>(); // painting|colourway keys already chosen
  const boughtKeys = new Set(
    justBought.map((i) => `${i.paintingId}|${i.colourwayName}`),
  );
  const boughtPaintingIds = new Set(justBought.map((i) => i.paintingId));

  const tryAdd = (painting: Painting, colourwayName: string, note: string) => {
    if (out.length >= max) return;
    const key = `${painting.id}|${colourwayName}`;
    if (seen.has(key) || boughtKeys.has(key)) return;
    const cw = painting.colourways.find(
      (c) => c.name === colourwayName && c.available,
    );
    if (!cw) return;
    seen.add(key);
    out.push({ painting, colourwayName: cw.name, image: cw.image, note });
  };

  // 1 · other colourways of the works just bought — Stephen's own variations.
  for (const id of boughtPaintingIds) {
    const painting = getPaintingById(id);
    if (!painting) continue;
    for (const cw of painting.colourways) {
      if (!cw.available) continue;
      tryAdd(
        painting,
        cw.name,
        "Another of Stephen's own colourways for this work.",
      );
    }
  }

  // 2 · collection-mates of the works just bought — pieces made alongside it.
  for (const id of boughtPaintingIds) {
    const painting = getPaintingById(id);
    if (!painting) continue;
    for (const mate of getPaintingsByCollection(painting.collection)) {
      if (boughtPaintingIds.has(mate.id)) continue;
      const original =
        mate.colourways.find((c) => c.isOriginal && c.available) ??
        mate.colourways.find((c) => c.available);
      if (!original) continue;
      tryAdd(mate, original.name, "A companion from the same collection.");
    }
  }

  // 3 · graceful fallback — a quiet trio from the wider catalogue. Covers the
  // "Buy now" path (basket already empty) so the section is never empty.
  for (const painting of PAINTINGS) {
    if (boughtPaintingIds.has(painting.id)) continue;
    const original =
      painting.colourways.find((c) => c.isOriginal && c.available) ??
      painting.colourways.find((c) => c.available);
    if (!original) continue;
    tryAdd(painting, original.name, "From the estate collection.");
  }

  return out.slice(0, max);
};

/**
 * CompanionCard — one quiet suggestion. Clicking starts a NEW single-item
 * Stripe Checkout via the SAME `/api/checkout` client path used elsewhere, so
 * the new session is freshly + correctly priced by the server. The advertised
 * figure is the painting's anchor-tier price (data layer) and we POST that same
 * tierId — advertised == charged.
 */
const CompanionCard = ({ companion }: { companion: Companion }) => {
  const { painting, colourwayName, image, note } = companion;
  const anchor = getAnchorTier(painting);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Mirrors PaintingDetail's onBuyNow: a single-item POST the server prices.
  const onTake = async () => {
    setStatus("loading");
    setErrorMsg("");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    // First-touch attribution (tasm.utm.v1) rides along like every other
    // checkout body — the server validates + writes the session metadata.
    const utm = getStoredUtm();
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paintingId: painting.id,
          colourwayName,
          tierId: anchor.id,
          framing: false,
          embellished: false,
          ...(utm ? { utm } : {}),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setStatus("error");
        setErrorMsg(body.error ?? "Couldn't open checkout. Please try again.");
        return;
      }
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
    <div className="flex flex-col text-left ring-1 ring-line p-3.5 transition-all duration-300 hover:ring-ink/40">
      <div className="relative w-full aspect-square overflow-hidden bg-ink/[0.03] mb-3.5">
        <picture>
          <source srcSet={asset(webp(image))} type="image/webp" />
          <img
            src={asset(image)}
            alt={`${painting.title} — ${colourwayName}`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
      </div>
      <p className="font-sans text-[14px] font-semibold leading-[1.3] text-ink m-0">
        {painting.title}
      </p>
      <p className={cn(EYEBROW_TIGHT, "mt-1.5")}>{colourwayName}</p>
      <p className={cn(META, "mt-2 mb-3")}>{note}</p>
      <div className="mt-auto flex items-baseline justify-between gap-3">
        <span className="font-display font-semibold tracking-[-0.01em] text-[17px] text-ink">
          {formatGBP(anchor.pricePence).replace(".00", "")}
        </span>
        <span className={cn(EYEBROW_TIGHT)}>{anchor.size.split(" ")[0]}</span>
      </div>
      <button
        type="button"
        onClick={onTake}
        disabled={status === "loading"}
        className={cn(BTN_SECONDARY, "mt-3.5 w-full disabled:opacity-60")}
      >
        {status === "loading" ? "Opening checkout…" : "Take this one too"}
      </button>
      {status === "error" && (
        <p className="mt-2 font-sans text-[12.5px] font-semibold text-ink m-0">
          {errorMsg}
        </p>
      )}
    </div>
  );
};

/**
 * CompleteTheSet — the post-purchase companion block. Renders nothing if there
 * are no honest suggestions to make.
 */
const CompleteTheSet = ({ justBought }: { justBought: BasketItem[] }) => {
  const companions = useMemo(
    () => buildCompanions(justBought, 3),
    [justBought],
  );
  if (companions.length === 0) return null;

  return (
    <Reveal as="div" className="mt-12 md:mt-16 text-left">
      <div className="text-center mb-8">
        <p className={cn(EYEBROW_MUTED, "m-0 mb-4")}>Complete the set</p>
        <h2 className="font-display font-semibold tracking-[-0.02em] text-[clamp(24px,3vw,34px)] leading-[1.1] text-ink m-0 mb-3">
          A companion piece
        </h2>
        <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.75] text-ink-muted m-0 mx-auto max-w-[560px]">
          Stephen often worked in pairs and in series — a colourway beside its
          twin, a flower beside its collection. With no obligation, here are a
          few of his works that sit naturally alongside the one you&rsquo;ve
          just taken home.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {companions.map((c) => (
          <CompanionCard key={`${c.painting.id}|${c.colourwayName}`} companion={c} />
        ))}
      </div>
      {/* The thank-you 10% code is minted server-side and reaches the buyer via
          the confirmation email — we reference it warmly here, but never print
          a code we don't hold client-side (no fabrication; gotcha #9 register). */}
      <p className={cn(META, "text-center mt-7 mx-auto max-w-[560px]")}>
        Your order comes with a small thank-you towards a future print — look for
        it in the confirmation email Stripe is sending now, with our warmth.
      </p>
    </Reveal>
  );
};

/**
 * Post-checkout confirmation page. Stripe redirects here on a successful
 * payment with ?session_id=cs_… in the URL. The Stripe receipt email is
 * sent automatically by Stripe; we just acknowledge the order here.
 */
export const OrderSuccess = () => {
  usePageTitle("Order confirmed — The Art of Stephen Meakin");
  // Transactional route — noindex + default meta (see useNoindexHead).
  useNoindexHead();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  // Snapshot what was just bought BEFORE clearing the basket, so the companion
  // upsell can suggest other colourways / collection-mates of those works.
  // (On the single-item "Buy now" path the basket may already be empty — the
  // upsell falls back to a quiet catalogue trio in that case.)
  const [justBought] = useState<BasketItem[]>(() => getBasket());

  // Clear the basket once on mount. Stripe only redirects here after a
  // successful payment, so it's safe to wipe local state at this point.
  useEffect(() => {
    clearBasket();
  }, []);

  return (
    <div className="relative min-h-[100svh] flex flex-col">
      <AmbientBackdrop opacity={0.45} />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto max-w-[820px] 2xl:max-w-[960px] 3xl:max-w-[1040px] px-4 sm:px-6 md:px-8 lg:px-12 pt-14 md:pt-16 pb-14 md:pb-20 text-center">
        <Reveal>
          <p className={cn(EYEBROW, "m-0 mb-4")}>
            Order confirmed
          </p>
          <h1
            className="font-display font-bold tracking-[-0.045em] text-ink m-0 mx-auto leading-[0.82] hero-text-shadow"
            style={{ fontVariationSettings: '"opsz" 48, "wght" 700', fontSize: "clamp(64px, 12vw, 168px)" }}
          >
            Thank you.
          </h1>
          <p className={cn(SUBTITLE, "mt-6 md:mt-7 mb-5 mx-auto text-center max-w-[640px]")}>
            Your payment has been received. Stripe is sending your receipt now.
          </p>
          <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.75] text-ink-muted my-0 mb-7 mx-auto max-w-[640px]">
            Each print is made to order. We place yours with our atelier, Point 101 in London,
            within two working days, then ship to the address you gave at checkout. A tracking
            link follows the moment it leaves the studio.
          </p>
          {sessionId && (
            <p className="font-sans text-[13px] leading-[1.6] text-ink-muted m-0 mb-8">
              Reference: {sessionId.slice(0, 18)}…
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <MagneticLink
              to="/collections"
              className={BTN_PRIMARY}
              ariaLabel="See more of his work"
            >
              See more of his work <span aria-hidden="true" className="ml-2">→</span>
            </MagneticLink>
            <a href="mailto:info@themandalacompany.com" className={BTN_SECONDARY}>
              Contact us
            </a>
          </div>
          {/* Share the estate — quiet post-purchase share affordance.
              Framed as an introduction to Stephen's work, not a referral. */}
          <ShareTheEstate align="center" />
        </Reveal>

        {/* Complete the set — dignified post-purchase companion suggestions.
            Each card starts a FRESH single-item Stripe Checkout via the same
            /api/checkout client path, so the new session is server-priced
            (advertised == charged). Renders nothing if there's nothing honest
            to suggest. */}
        <CompleteTheSet justBought={justBought} />
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};

/**
 * Stripe redirects here if the buyer abandons checkout. No charge has been
 * taken; we just reassure them and offer the way back.
 */
export const OrderCancel = () => {
  usePageTitle("Order cancelled — The Art of Stephen Meakin");
  // Transactional route — noindex + default meta (see useNoindexHead).
  useNoindexHead();
  // The basket is only cleared on a SUCCESSFUL payment (OrderSuccess), so an
  // abandoned checkout still holds everything the buyer chose. When lines
  // remain, the primary way back is the basket itself — a quiet recovery
  // path, no pressure copy, no discounts. Empty basket (e.g. a single-item
  // "Buy now" abandon) falls back to the collections link.
  const basketItems = useBasket();
  const hasBasket = basketItems.length > 0;
  return (
    <div className="relative min-h-[100svh] flex flex-col">
      <AmbientBackdrop opacity={0.45} />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto max-w-[820px] 2xl:max-w-[960px] 3xl:max-w-[1040px] px-4 sm:px-6 md:px-8 lg:px-12 pt-14 md:pt-16 pb-14 md:pb-20 text-center">
        <Reveal>
          <p className={cn(EYEBROW, "m-0 mb-4")}>
            Order cancelled
          </p>
          <h1
            className="font-display font-bold tracking-[-0.045em] text-ink m-0 mx-auto leading-[0.82] hero-text-shadow"
            style={{ fontVariationSettings: '"opsz" 48, "wght" 700', fontSize: "clamp(56px, 10vw, 140px)" }}
          >
            No charge taken.
          </h1>
          <p className={cn(SUBTITLE, "mt-6 md:mt-7 mb-8 mx-auto text-center max-w-[640px]")}>
            You left checkout before completing the order, so nothing was charged.
            {hasBasket && " Your basket is saved — return when you're ready."}
            {" "}If a detail was unclear, or you would like help choosing a
            colourway, write to us.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {hasBasket ? (
              <MagneticLink
                to="/basket"
                className={BTN_PRIMARY}
                ariaLabel="Return to your basket"
              >
                Return to your basket <span aria-hidden="true" className="ml-2">→</span>
              </MagneticLink>
            ) : (
              <MagneticLink
                to="/collections"
                className={BTN_PRIMARY}
                ariaLabel="Back to collections"
              >
                Back to collections <span aria-hidden="true" className="ml-2">→</span>
              </MagneticLink>
            )}
            {hasBasket && (
              <MagneticLink
                to="/collections"
                className={BTN_SECONDARY}
                ariaLabel="Back to collections"
              >
                Back to collections
              </MagneticLink>
            )}
            <a href="mailto:info@themandalacompany.com" className={BTN_SECONDARY}>
              Ask a question
            </a>
          </div>
        </Reveal>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
