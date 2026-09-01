import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { MagneticLink } from "../components/MagneticLink";
import { ShareTheEstate } from "../components/ShareTheEstate";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { MASTHEAD_TITLE_STYLE } from "../components/ui/tokens";
import { EYEBROW, EYEBROW_MUTED, EYEBROW_TIGHT, META, SUBTITLE, BTN_PRIMARY, BTN_SECONDARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { useCurrency } from "../lib/currency";
import { asset, webp } from "../lib/asset";
import { usePageTitle } from "../lib/usePageTitle";
import { getBasket, clearBasket, useBasket, type BasketItem } from "../lib/basket";
import { getStoredUtm } from "../lib/utm";
import { getStoredRef } from "../lib/ref";
import { useNoindexHead } from "../lib/useNoindexHead";
import {
  PAINTINGS,
  getPaintingById,
  getPaintingsByCollection,
  getAnchorTier,
  getTierAdvertisedPricePence,
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
  const { formatPretty: fmtP, code: currencyCode } = useCurrency();
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
    const ref = getStoredRef();
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paintingId: painting.id,
          colourwayName,
          tierId: anchor.id,
          // Framed to match the advertised framed floor (getTierAdvertisedPricePence)
          // AND the two-product model — every piece is framed or canvas, never a
          // bare sheet. Was `false`, which under-charged (base only) and shipped an
          // unframed print that no PDP size rung is even buyable at.
          framing: true,
          embellished: false,
          currency: currencyCode,
          ...(utm ? { utm } : {}),
          ...(ref ? { ref } : {}),
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
      <p className="font-sans text-[15px] 3xl:text-[18px] 4xl:text-[21px] font-semibold leading-[1.3] text-ink m-0">
        {painting.title}
      </p>
      <p className={cn(EYEBROW_TIGHT, "mt-1.5")}>{colourwayName}</p>
      <p className={cn(META, "mt-2 mb-3")}>{note}</p>
      <div className="mt-auto flex items-baseline justify-between gap-3">
        <span className="font-display font-semibold tracking-[-0.01em] text-[17px] 3xl:text-[23px] 4xl:text-[27px] text-ink">
          from {fmtP(getTierAdvertisedPricePence(anchor))}
        </span>
        <span className={cn(EYEBROW_TIGHT)}>{anchor.size}</span>
      </div>
      <button
        type="button"
        onClick={onTake}
        disabled={status === "loading"}
        aria-label={`Take ${painting.title} in ${colourwayName} too`}
        className={cn(BTN_SECONDARY, "mt-3.5 w-full disabled:opacity-60")}
      >
        {status === "loading" ? "Opening checkout…" : "Take this one too"}
      </button>
      <p aria-live="polite" className="m-0 empty:hidden">
        {status === "error" && (
          <span className="mt-2 block font-sans text-[14px] 3xl:text-[17px] 4xl:text-[20px] font-semibold text-ink">
            {errorMsg}
          </span>
        )}
      </p>
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
    <Reveal as="div" className="mt-8 md:mt-10 text-left">
      <div className="text-center mb-7 md:mb-8">
        <p className={cn(EYEBROW_MUTED, "m-0 mb-4")}>Complete the set</p>
        <h2 className="font-display font-semibold tracking-[-0.02em] text-[clamp(24px,3vw,34px)] leading-[1.1] text-ink m-0">
          A companion piece
        </h2>
        <p className="font-sans font-normal text-[clamp(18px,1.1vw,25px)] leading-[1.6] text-ink-muted m-0 mt-5 md:mt-6 mx-auto max-w-[600px] 3xl:max-w-[804px] 4xl:max-w-[972px]">
          Stephen often worked in pairs and in series — a colourway beside its
          twin, a flower beside its collection. With no obligation, here are a
          few of his works that sit naturally alongside the one you&rsquo;ve
          just taken home.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
        {companions.map((c) => (
          <CompanionCard key={`${c.painting.id}|${c.colourwayName}`} companion={c} />
        ))}
      </div>
      {/* The thank-you 10% code is minted server-side and reaches the buyer via
          the confirmation email — we reference it warmly here, but never print
          a code we don't hold client-side (no fabrication; gotcha #9 register). */}
      <p className={cn(META, "text-center mt-7 mx-auto max-w-[560px] 3xl:max-w-[750px] 4xl:max-w-[907px]")}>
        Your order comes with a small thank-you towards a future print — look for
        it in the confirmation email Stripe is sending now, with our warmth.
      </p>
    </Reveal>
  );
};

/* =============================================================================
 * WHAT WAS ACTUALLY BOUGHT — the gift branch
 * -----------------------------------------------------------------------------
 * ⚠️ This page used to state THREE things that are false after a gift-card-only
 * order: (a) that a print is being placed with a studio and shipped to the
 * address given at checkout, (b) a "companion piece" block written around "the
 * one you've just taken home", and (c) that the order carries a thank-you code.
 * None of them hold: a gift order has no print, no address, and — by design —
 * no thank-you code (api/stripe-webhook.ts: `skipThankYou = isGiftOrder || …`,
 * the second half of the gift-farming guard).
 *
 * The page holds only `session_id`, so it asks the EXISTING public lookup what
 * the session contains: GET /api/order-status?ref=<session_id> resolves a
 * session to a safe, public item summary that is gift-aware (`giftSummary` in
 * api/order-status.ts appends "Gift card — <amount>" lines). No new serverless
 * function — the project is AT Vercel's 12-function cap.
 *
 * FAILURE MUST DEGRADE TO SOMETHING TRUE. A failed / slow / not-found lookup
 * never falls back to the print copy: it falls back to the one line that holds
 * for every order. The only exception is a LOCAL fact that needs no network —
 * a non-empty basket snapshot at redirect time proves the session carried
 * prints (a gift-only checkout leaves getBasket() empty), so print copy is
 * still correct in that case.
 * ========================================================================== */

/** A gift line as api/order-status.ts formats it ("Gift card — £250.00"). */
const GIFT_LINE_RE = /^Gift card\b/;

type OrderLookup =
  | { phase: "loading" }
  /** The lookup answered: these are the order's public line summaries. */
  | { phase: "found"; items: string[]; total: string }
  /** No answer we can trust (network error, timeout, unknown reference). */
  | { phase: "unknown" };

/**
 * Resolve the Stripe session to its public line summary. Read-only, public,
 * and already deployed (the /orders tracking page uses the same endpoint), so
 * this adds a GET and nothing else to what the client sends.
 */
const useOrderLookup = (sessionId: string | null): OrderLookup => {
  // The no-session case is DERIVED, not set from inside the effect — calling
  // setState synchronously in an effect body triggers a cascading render (and
  // trips react-hooks/set-state-in-effect). `sessionId` is read once from the
  // URL on mount and cannot change while this page is alive, so a lazy initial
  // value is the whole answer.
  const [state, setState] = useState<OrderLookup>(() =>
    sessionId ? { phase: "loading" } : { phase: "unknown" },
  );
  useEffect(() => {
    if (!sessionId) return;
    let live = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const run = async () => {
      try {
        const res = await fetch(
          `/api/order-status?ref=${encodeURIComponent(sessionId)}`,
          { signal: controller.signal },
        );
        const body = (await res.json()) as {
          found?: boolean;
          order?: { items?: unknown; total?: unknown };
        };
        if (!live) return;
        const rawItems = body.order?.items;
        if (res.ok && body.found && body.order) {
          setState({
            phase: "found",
            items: Array.isArray(rawItems)
              ? rawItems.filter((i): i is string => typeof i === "string" && i.trim() !== "")
              : [],
            total: typeof body.order.total === "string" ? body.order.total : "",
          });
        } else {
          setState({ phase: "unknown" });
        }
      } catch {
        if (live) setState({ phase: "unknown" });
      } finally {
        clearTimeout(timeoutId);
      }
    };
    void run();
    return () => {
      live = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [sessionId]);
  return state;
};

/**
 * Post-checkout confirmation page. Stripe redirects here on a successful
 * payment with ?session_id=cs_… in the URL. The Stripe receipt email is
 * sent automatically by Stripe; we just acknowledge the order here — and,
 * since 2026-09-01, we acknowledge the RIGHT order (print / gift / both).
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

  // Clear the basket once on mount — but ONLY for a real Stripe redirect, which
  // always carries a session_id. A session-less arrival (browser back/forward,
  // bookmark, shared link, stale tab) must NOT wipe the basket (audit 2026-07-28).
  useEffect(() => {
    if (sessionId) clearBasket();
  }, [sessionId]);

  // Ask the existing public lookup what this session actually contains.
  const lookup = useOrderLookup(sessionId);

  // A non-empty basket snapshot at redirect time is LOCAL PROOF the session
  // carried prints — a gift-only checkout leaves getBasket() empty (gift lines
  // are a separate list, see getGiftCards in lib/basket.ts). It is therefore
  // safe to keep the print copy even when the network lookup fails.
  const hadPrintsLocally = justBought.length > 0;
  const giftLines =
    lookup.phase === "found" ? lookup.items.filter((l) => GIFT_LINE_RE.test(l)) : [];
  const printLines =
    lookup.phase === "found" ? lookup.items.filter((l) => !GIFT_LINE_RE.test(l)) : [];

  // Print copy: whenever we KNOW there is a print, or can prove it locally.
  const showPrintCopy =
    lookup.phase === "found" ? printLines.length > 0 : hadPrintsLocally;
  // Gift copy: only on a confirmed gift line. Never inferred.
  const showGiftCopy = giftLines.length > 0;
  // Neither → say only what holds for every order.
  const showNeutralCopy = !showPrintCopy && !showGiftCopy;

  // ⚠️ The thank-you code is minted server-side for every order EXCEPT a
  // gift-only one (`skipThankYou = isGiftOrder || amount_total === 0`), and
  // `order_kind: "gift"` is written only for a gift-ONLY basket. So the block
  // that references it — and the companion suggestions written around a print
  // the buyer "just took home" — ride on exactly the print condition.
  const showCompanions = showPrintCopy;

  // …and such an arrival must never show a false "payment received" — bounce it
  // home rather than confirm a payment that never happened. (Every real Stripe /
  // "Buy now" redirect carries session_id, so the happy path is unchanged.)
  if (!sessionId) return <Navigate to="/" replace />;

  return (
    <div className="relative min-h-[100svh] flex flex-col">
      <SceneBackdrop src="/img/scenes/order-nile-scene-v4.webp" />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 pt-12 md:pt-14 pb-12 md:pb-14 text-center">
        <Reveal>
          <p className={cn(EYEBROW, "m-0 mb-4")}>
            Order confirmed
          </p>
          <h1
            className="font-display text-ink m-0 mx-auto hero-text-shadow"
            style={MASTHEAD_TITLE_STYLE}
          >
            Thank you.
          </h1>
          <p className={cn(SUBTITLE, "mt-5 md:mt-6 mb-6 mx-auto text-center max-w-[640px] 2xl:max-w-[740px] 3xl:max-w-[858px] 4xl:max-w-[1037px]")}>
            Your payment has been received. Stripe is sending your receipt now.
          </p>
          {/* ⚠️ SUPPLIER TRUTH (2026-08-28). The printer is NEVER named, and
              NEVER placed anywhere but the Sussex coast, in buyer copy. This
              line said "our London atelier" — the last surviving instance of
              the old fiction, on the one page every buyer sees after paying.
              The wording below is the approved phrasing already used verbatim
              in paintings.ts (ESTATE_AUTHENTICATION.printer), FAQ.tsx and
              CraftHighlights.tsx. Do not re-name or re-place it.
              ⚠️ AND it is now GATED (2026-09-01): a gift-card order has no
              print and no shipping address, so this paragraph must never be
              the default. See the gift branch below. */}
          {showPrintCopy && (
            <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink-muted m-0 mb-6 mx-auto max-w-[640px] 2xl:max-w-[740px] 3xl:max-w-[858px] 4xl:max-w-[1037px]">
              Each print is made to order. We place yours with a specialist giclée
              studio on the Sussex coast within two working days, then ship to the
              address you gave at checkout. A tracking link follows the moment it
              leaves the studio.
            </p>
          )}
          {/* GIFT BRANCH. Every clause below is checked against the gift
              minter + sender in api/stripe-webhook.ts (createGiftCard with
              GIFT_VALID_DAYS = 365 and a single-use GIFT-XXXXXX code;
              processGiftCards sends to gift.recipientEmail when present, with
              the buyer's note, and the buyer ALWAYS receives their own copy —
              via `needsBuyerCopy` on a mixed basket, or the gift-only
              confirmation that "restates every code"). There is NO scheduled
              send and NO thank-you code. The wording reuses the vetted /gift
              "What the recipient receives" copy. */}
          {showGiftCopy && (
            <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink-muted m-0 mb-6 mx-auto max-w-[640px] 2xl:max-w-[740px] 3xl:max-w-[858px] 4xl:max-w-[1037px]">
              There is nothing to ship. An email carrying a single-use gift code,
              valid for twelve months from the day you buy it, is sent as soon as
              your payment goes through — to the recipient&rsquo;s inbox if you
              gave their email, with your message in it, and a copy comes to you
              either way. The code is entered at checkout and the gift value
              comes off the order total.
            </p>
          )}
          {/* Nothing confirmed either way (lookup still in flight, or it
              failed / didn't recognise the reference, on a session we can't
              prove locally). Say only what holds for EVERY order. */}
          {showNeutralCopy && (
            <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.75] text-ink-muted m-0 mb-6 mx-auto max-w-[640px] 2xl:max-w-[740px] 3xl:max-w-[858px] 4xl:max-w-[1037px]">
              A confirmation from the estate follows by email with the details of
              this order.
            </p>
          )}
          {/* What the session actually holds, in the currency it was charged
              in — straight from the lookup, never re-typed or re-priced here.
              (api/order-status.ts formats both the lines and the total from the
              Stripe session itself, so advertised == charged is preserved.) */}
          {lookup.phase === "found" && lookup.items.length > 0 && (
            <div className="mt-7 md:mt-8 mb-6 mx-auto max-w-[640px] 2xl:max-w-[740px] 3xl:max-w-[858px] 4xl:max-w-[1037px] text-left ring-1 ring-line rounded-[12px] px-5 py-5 md:px-7 md:py-6">
              <p className={cn(EYEBROW_MUTED, "m-0 mb-3")}>Your order</p>
              <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                {lookup.items.map((line, i) => (
                  <li key={`${line}-${i}`} className={cn(META, "m-0")}>
                    {line}
                  </li>
                ))}
              </ul>
              {lookup.total && (
                <p className="m-0 mt-3 border-t border-line pt-3 flex items-baseline justify-between gap-4">
                  <span className={cn(EYEBROW_MUTED)}>Total</span>
                  <span className="font-sans font-semibold text-[15px] 3xl:text-[17px] 4xl:text-[19px] text-ink [font-variant-numeric:tabular-nums]">
                    {lookup.total}
                  </span>
                </p>
              )}
            </div>
          )}
          {sessionId && (
            <p className="font-sans text-[14.5px] leading-[1.6] text-ink-muted m-0 mb-6">
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
            to suggest — and nothing at all unless the order really did carry a
            print: its copy ("the one you've just taken home") and its closing
            thank-you-code line are both false on a gift-only order. */}
        {showCompanions && <CompleteTheSet justBought={justBought} />}
      </main>
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
      <SceneBackdrop src="/img/scenes/order-nile-scene-v4.webp" />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 pt-12 md:pt-14 pb-12 md:pb-14 text-center">
        <Reveal>
          <p className={cn(EYEBROW, "m-0 mb-4")}>
            Order cancelled
          </p>
          <h1
            className="font-display text-ink m-0 mx-auto hero-text-shadow"
            style={MASTHEAD_TITLE_STYLE}
          >
            No charge taken.
          </h1>
          <p className={cn(SUBTITLE, "mt-5 md:mt-6 mb-8 mx-auto text-center max-w-[640px] 2xl:max-w-[740px] 3xl:max-w-[858px] 4xl:max-w-[1037px]")}>
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
      <Footer />
    </div>
  );
};
