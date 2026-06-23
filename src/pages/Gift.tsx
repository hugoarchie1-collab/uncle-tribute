import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { PageMasthead } from "../components/PageMasthead";
import { useCurrency } from "../lib/currency";
import {
  PRINT_TIERS,
  type PrintTier,
} from "../data/paintings";
import {
  addGiftCard,
  GIFT_MIN_PENCE,
  GIFT_MAX_PENCE,
} from "../lib/basket";
import {
  EYEBROW,
  EYEBROW_MUTED,
  BTN_PRIMARY,
  BTN_SECONDARY,
} from "../components/ui/tokens";
import { cn } from "../lib/cn";

/**
 * /gift — Gift an edition.
 *
 * A dignified "give a piece of Stephen's work" page: the buyer picks a
 * denomination (each pegged to a print SIZE's exact price, read live from
 * PRINT_TIERS so the figures can never drift from the catalogue) OR enters a
 * custom whole-pound amount (£25–£5,000), optionally addresses it to a
 * recipient with a personal message, and adds a digital gift card to the
 * basket. Checkout is the existing Stripe flow (api/checkout.ts emits the gift
 * line via price_data with unit_amount === the chosen amount, so the price
 * shown here equals the Stripe charge to the penny).
 *
 * Register: the FAQ / Trade / Contact long-form shell — a readable column on
 * the shared ambient backdrop, Fraunces + Hanken Grotesk, accent reserved for
 * eyebrows + interaction. Memorial-estate tone throughout, never a loud
 * "GIFT CARD" sale.
 */

// The size-pegged denominations: every AVAILABLE, non-one-off tier on the
// canonical ladder. Each is labelled by its size short-name + edition label +
// price, e.g. "A2 · Collector's Edition — £450". Derived from PRINT_TIERS so a
// catalogue price change flows here automatically (advertised == charged).
interface Denomination {
  /** Stable key — the tier id it's pegged to. */
  id: PrintTier["id"];
  /** Short size token, e.g. "A2". */
  sizeShort: string;
  /** Tier label, e.g. "Collector's Edition". */
  label: string;
  /** Face value in pence. */
  amountPence: number;
}

const tierToDenomination = (tier: PrintTier): Denomination => ({
  id: tier.id,
  sizeShort: tier.size.split(" ")[0],
  label: tier.label,
  amountPence: tier.pricePence,
});

/**
 * The metadata label a denomination carries into the basket / Stripe. Takes the
 * active currency formatter (from useCurrency) so the label reads in the buyer's
 * chosen presentment currency — the figure shown equals the figure charged.
 */
const denominationCardLabel = (
  d: Denomination,
  fmt: (gbpPence: number) => string,
): string => `${d.sizeShort} ${d.label} — ${fmt(d.amountPence)}`;

type Selection = { kind: "tier"; id: PrintTier["id"] } | { kind: "custom" };

export const Gift = () => {
  // Presentment currency — every figure on this page (and the label carried into
  // the basket) reads in the buyer's chosen currency; the same conversion is
  // applied server-side at checkout, so advertised == charged.
  const { format: fmt, formatPretty: fmtP } = useCurrency();

  // Size-pegged denominations: available, non-one-off tiers, in ladder order.
  const denominations = useMemo<Denomination[]>(
    () =>
      PRINT_TIERS.filter((t) => t.available && !t.isOneOff).map(
        tierToDenomination,
      ),
    [],
  );

  // Preselect the anchor (Collector A2) denomination if present, else the first.
  const initialSelection = useMemo<Selection>(() => {
    const anchor = denominations.find((d) => d.id === "collector");
    return { kind: "tier", id: (anchor ?? denominations[0])?.id ?? "collector" };
  }, [denominations]);

  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [customAmount, setCustomAmount] = useState(""); // whole pounds, as typed
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [error, setError] = useState("");
  const [added, setAdded] = useState<{ amountPence: number; label: string } | null>(
    null,
  );

  const minPounds = GIFT_MIN_PENCE / 100;
  const maxPounds = GIFT_MAX_PENCE / 100;

  // Resolve the currently-chosen amount (pence) + display label, or null when
  // the custom field is empty / invalid. This is the SINGLE source of the
  // figure we show AND the figure we add to the basket — so the buyer can
  // never be shown one number and charged another.
  const resolved = useMemo<{ amountPence: number; label: string } | null>(() => {
    if (selection.kind === "tier") {
      const d = denominations.find((x) => x.id === selection.id);
      if (!d) return null;
      return { amountPence: d.amountPence, label: denominationCardLabel(d, fmt) };
    }
    // Custom — parse whole pounds.
    const pounds = Number.parseInt(customAmount, 10);
    if (!Number.isFinite(pounds)) return null;
    const amountPence = pounds * 100;
    if (
      amountPence < GIFT_MIN_PENCE ||
      amountPence > GIFT_MAX_PENCE ||
      String(pounds) !== customAmount.trim() // reject "25.5" / "25abc"
    ) {
      return null;
    }
    return { amountPence, label: `Custom amount — ${fmt(amountPence)}` };
  }, [selection, customAmount, denominations, fmt]);

  const handleAdd = () => {
    setError("");
    if (!resolved) {
      setError(
        selection.kind === "custom"
          ? `Please enter a whole-pound amount between £${minPounds} and £${maxPounds.toLocaleString()}.`
          : "Please choose an amount.",
      );
      return;
    }
    // Optional recipient email — validate only if provided.
    if (recipientEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) {
      setError("Please enter a valid recipient email, or leave it blank.");
      return;
    }
    const ok = addGiftCard({
      amountPence: resolved.amountPence,
      label: resolved.label,
      recipientName: recipientName.trim() || undefined,
      recipientEmail: recipientEmail.trim() || undefined,
      giftMessage: giftMessage.trim() || undefined,
    });
    if (!ok) {
      setError("That amount isn't available. Please choose another.");
      return;
    }
    setAdded(resolved);
    // Reset the personal fields so a second gift starts clean; keep the
    // denomination selection so adding several of the same is quick.
    setRecipientName("");
    setRecipientEmail("");
    setGiftMessage("");
    setCustomAmount("");
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      <SceneBackdrop src="/img/scenes/gift-taj-mahal-blur-v2.webp" />
      <Seo
        title="Gift an edition"
        description="Give a piece of Stephen Meakin's work. A digital gift card towards any estate-stamped print — choose a size-pegged amount or a custom value, add a personal message, and let the recipient choose the print that speaks to them."
        url="/gift"
      />
      <Nav overlay />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1180px] 2xl:max-w-[1320px] 3xl:max-w-[1500px] 4xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-24 md:pt-28 pb-8 md:pb-12">
        {/* ── MASTHEAD ─────────────────────────────────────────────────────
            The refined shared <PageMasthead>: eyebrow + hairline meta rule →
            a composed Fraunces statement (wght 560, one italic emphasis word,
            NOT a bold logo) → the supporting passage beneath under a border-t.
            The denomination range is surfaced in the meta row as a quiet
            commerce fact (figures read LIVE from GIFT_MIN/MAX_PENCE in the
            buyer's currency — never re-typed). */}
        <Reveal className="mb-6 md:mb-8">
          <PageMasthead
            eyebrow="Gift an edition"
            meta={
              <>
                {fmtP(GIFT_MIN_PENCE)} – {fmtP(GIFT_MAX_PENCE)}
              </>
            }
            title={
              <>
                Give a <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>piece</em> of
                Stephen's work.
              </>
            }
          >
            <div className="mt-5 md:mt-6 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-4 items-start border-t border-line pt-5 md:pt-6">
              <p className={cn(EYEBROW_MUTED, "m-0 lg:col-span-3 leading-[1.8]")}>
                A digital gift card · redeemed against any edition
              </p>
              <p
                className="font-display font-normal tracking-[-0.01em] text-ink m-0 lg:col-span-9"
                style={{
                  fontVariationSettings: '"opsz" 32, "wght" 400',
                  fontSize: "clamp(21px, 2.6vw, 40px)",
                  lineHeight: 1.3,
                }}
              >
                A gift towards any estate-stamped print of Stephen Meakin's
                mandala paintings. Choose an amount pegged to a print size — or
                set your own — add a few words if you wish, and let the person
                you're thinking of choose the work that speaks to them.
              </p>
            </div>
          </PageMasthead>
        </Reveal>

        {added ? (
          // ---- Confirmation ---------------------------------------------
          <Reveal as="section" className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-5 items-start">
            <p className={cn(EYEBROW, "m-0 lg:col-span-3 lg:pt-3")}>In your basket</p>
            <div className="lg:col-span-9 max-w-[64ch]">
              <p
                className="font-display font-semibold tracking-[-0.025em] text-[clamp(28px,4.2vw,64px)] leading-[1.05] text-ink m-0"
                style={{ fontVariationSettings: '"opsz" 40, "wght" 600' }}
              >
                A gift card of{" "}
                <span className="text-accent">
                  {fmtP(added.amountPence)}
                </span>{" "}
                is in your basket.
              </p>
              <p className="font-sans font-normal text-[clamp(16px,1vw,21px)] leading-[1.65] text-ink-muted m-0 mt-5 md:mt-6">
                The amount you see is exactly what you'll pay — nothing is added
                at checkout. You can add another, or proceed when you're ready.
              </p>
              <div className="mt-5 md:mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <Link to="/basket" className={BTN_PRIMARY}>
                  Go to basket
                  <span aria-hidden="true" className="ml-2">→</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setAdded(null)}
                  className={BTN_SECONDARY}
                >
                  Add another gift card
                </button>
              </div>
            </div>
          </Reveal>
        ) : (
          // ── DENSE TWO-COLUMN EDITORIAL BODY ───────────────────────────────
          // Left rail = the denomination grid (the headline act, packed into a
          // tighter 2/3-up grid that fills the width). Right rail = the
          // optional recipient details + a sticky "your gift" summary. Section
          // headings carry a numeral so the two acts read as a deliberate
          // sequence, not a stack of separators floating in air.
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 2xl:gap-x-16 gap-y-8 md:gap-y-10">
            {/* ACT 01 — Choose an amount (the denser denomination grid) */}
            <Reveal as="section" className="lg:col-span-7">
              <div className="flex items-baseline gap-3 border-t border-line pt-4 mb-5 md:mb-6">
                <span className={cn(EYEBROW, "shrink-0")}>01</span>
                <span className={cn(EYEBROW_MUTED, "shrink-0")}>Choose an amount</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 3xl:grid-cols-4 gap-2.5 md:gap-3 3xl:gap-4">
                {denominations.map((d) => {
                  const isSelected =
                    selection.kind === "tier" && selection.id === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setSelection({ kind: "tier", id: d.id });
                        setError("");
                      }}
                      aria-pressed={isSelected}
                      className={cn(
                        "group text-left rounded-2xl px-4 py-4 md:px-5 md:py-5 transition-all duration-300 bg-bg-soft",
                        "ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        isSelected
                          ? "ring-accent ring-2"
                          : "ring-line hover:ring-ink/40",
                      )}
                    >
                      <span className={cn(EYEBROW_MUTED, "block m-0 mb-2")}>
                        {d.sizeShort} · {d.label}
                      </span>
                      <span className="font-display font-semibold tracking-[-0.025em] text-[clamp(24px,3vw,46px)] text-ink leading-none block">
                        {fmtP(d.amountPence)}
                      </span>
                    </button>
                  );
                })}

                {/* Custom amount — spans the full grid width as the wide rung
                    that closes the ladder. */}
                <button
                  type="button"
                  onClick={() => {
                    setSelection({ kind: "custom" });
                    setError("");
                  }}
                  aria-pressed={selection.kind === "custom"}
                  className={cn(
                    "text-left rounded-2xl px-4 py-4 md:px-5 md:py-5 transition-all duration-300 bg-bg-soft col-span-2 sm:col-span-3 3xl:col-span-4",
                    "ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    selection.kind === "custom"
                      ? "ring-accent ring-2"
                      : "ring-line hover:ring-ink/40",
                  )}
                >
                  <span className={cn(EYEBROW_MUTED, "block m-0 mb-2")}>
                    Custom amount
                  </span>
                  <span className="font-sans font-normal text-[clamp(14px,0.85vw,18px)] text-ink-muted">
                    Any whole-pound value from {fmtP(GIFT_MIN_PENCE)} to{" "}
                    {fmtP(GIFT_MAX_PENCE)}.
                  </span>
                </button>
              </div>

              {selection.kind === "custom" && (
                <label className="block mt-4 max-w-[280px] 3xl:max-w-[340px]">
                  <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                    Amount (£)
                  </span>
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute left-4 top-1/2 -translate-y-1/2 font-sans text-[clamp(15px,0.85vw,18px)] text-ink-muted"
                    >
                      £
                    </span>
                    <input
                      name="customAmount"
                      type="number"
                      inputMode="numeric"
                      min={minPounds}
                      max={maxPounds}
                      step={1}
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setError("");
                      }}
                      className="w-full bg-bg-soft ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none pl-8 pr-4 py-3 font-sans text-[clamp(15px,0.85vw,18px)] text-ink placeholder:text-ink-faint transition-shadow [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder={String(minPounds)}
                    />
                  </div>
                </label>
              )}

              {/* Recipient + message (all optional) — packed directly under
                  the ladder so the left rail reads as one continuous act. */}
              <div className="flex items-baseline gap-3 border-t border-line pt-4 mt-6 md:mt-8 mb-5 md:mb-6">
                <span className={cn(EYEBROW, "shrink-0")}>02</span>
                <span className={cn(EYEBROW_MUTED, "shrink-0")}>
                  For someone in particular?{" "}
                  <span className="font-normal tracking-normal normal-case text-ink-muted">
                    Optional
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <label className="block">
                  <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                    Recipient's name
                  </span>
                  <input
                    name="recipientName"
                    autoComplete="name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full bg-bg-soft ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[clamp(15px,0.85vw,18px)] text-ink placeholder:text-ink-faint transition-shadow"
                    placeholder="Their name"
                  />
                </label>
                <label className="block">
                  <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                    Recipient's email
                  </span>
                  <input
                    name="recipientEmail"
                    type="email"
                    autoComplete="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full bg-bg-soft ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[clamp(15px,0.85vw,18px)] text-ink placeholder:text-ink-faint transition-shadow"
                    placeholder="them@example.com"
                  />
                </label>
              </div>
              <label className="block">
                <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                  A personal message
                </span>
                <textarea
                  name="giftMessage"
                  rows={4}
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  maxLength={400}
                  className="w-full bg-bg-soft ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[clamp(15px,0.85vw,18px)] leading-[1.65] text-ink placeholder:text-ink-faint transition-shadow resize-none"
                  placeholder="A few words to go with the gift."
                />
              </label>
              <p className="font-sans font-normal text-[clamp(12.5px,0.7vw,15px)] leading-[1.55] text-ink-muted m-0 mt-2.5 max-w-[56ch]">
                Leave these blank to gift the card to yourself to pass on by
                hand. The amount is charged at checkout exactly as shown — there
                is no delivery cost on a gift card.
              </p>
            </Reveal>

            {/* ACT — the running "your gift" summary, a sticky panel on the
                right rail so the figure + the add button travel with the
                reader as they move down the long left column. */}
            <Reveal as="div" className="lg:col-span-5 lg:col-start-8">
              <div className="lg:sticky lg:top-28 rounded-2xl bg-bg-soft ring-1 ring-line p-6 md:p-8">
                <p className={cn(EYEBROW_MUTED, "m-0 mb-3")}>Your gift</p>
                <p className="font-display font-bold tracking-[-0.035em] text-[clamp(48px,7vw,116px)] text-ink m-0 leading-[0.85]"
                   style={{ fontVariationSettings: '"opsz" 48, "wght" 700' }}>
                  {resolved ? fmtP(resolved.amountPence) : "—"}
                </p>
                <p className="font-sans font-normal text-[clamp(13.5px,0.8vw,17px)] leading-[1.6] text-ink-muted m-0 mt-5 max-w-[40ch]">
                  The figure you choose is exactly what you pay — nothing is
                  added at checkout, and a gift card carries no delivery cost.
                </p>
                <button
                  type="button"
                  onClick={handleAdd}
                  className={cn(BTN_PRIMARY, "mt-6 w-full")}
                >
                  Add gift card to basket
                  <span aria-hidden="true" className="ml-2">→</span>
                </button>
                {error && (
                  <p role="alert" className="mt-4 font-sans text-[clamp(13px,0.75vw,16px)] text-accent m-0">
                    {error}
                  </p>
                )}
              </div>
            </Reveal>
          </div>
        )}
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
