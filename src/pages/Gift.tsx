import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { Separator } from "../components/ui/separator";
import { Seo } from "../components/Seo";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import {
  PRINT_TIERS,
  formatGBP,
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
  TITLE,
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

/** The metadata label a denomination carries into the basket / Stripe. */
const denominationCardLabel = (d: Denomination): string =>
  `${d.sizeShort} ${d.label} — ${formatGBP(d.amountPence)}`;

type Selection = { kind: "tier"; id: PrintTier["id"] } | { kind: "custom" };

export const Gift = () => {
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
      return { amountPence: d.amountPence, label: denominationCardLabel(d) };
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
    return { amountPence, label: `Custom amount — ${formatGBP(amountPence)}` };
  }, [selection, customAmount, denominations]);

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
      <AmbientBackdrop opacity={0.4} />
      <Seo
        title="Gift an edition"
        description="Give a piece of Stephen Meakin's work. A digital gift card towards any estate-stamped edition — choose a size-pegged amount or a custom value, add a personal message, and let the recipient choose the print that speaks to them."
        url="/gift"
      />
      <Nav overlay />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[720px] 2xl:max-w-[820px] 3xl:max-w-[900px] px-[clamp(1rem,5vw,2rem)] pt-[clamp(6rem,11vw,6.5rem)] pb-[clamp(3rem,7vw,4.5rem)]">
        {/* Header */}
        <Reveal as="header" className="mb-[clamp(1.5rem,4vw,2.5rem)]">
          <p className={cn(EYEBROW, "m-0 mb-[clamp(0.625rem,2vw,0.875rem)]")}>
            Gift an edition
          </p>
          <h1 className={cn(TITLE, "m-0 !text-[clamp(26px,3.6vw,44px)] !leading-[1.05]")}>
            Give a piece of Stephen's work.
          </h1>
          <p className="font-sans font-normal text-[14.5px] md:text-[15px] 2xl:text-[16px] leading-[1.6] text-ink-muted mt-[clamp(0.75rem,2vw,1.1rem)] m-0 max-w-[60ch]">
            A gift towards any estate-stamped edition of Stephen Meakin's
            mandala paintings. Choose an amount pegged to a print size — or set
            your own — add a few words if you wish, and let the person you're
            thinking of choose the work that speaks to them.
          </p>
          <Separator className="bg-line mt-[clamp(1.25rem,3.5vw,2rem)]" />
        </Reveal>

        {added ? (
          // ---- Confirmation ---------------------------------------------
          <Reveal as="section" className="py-[clamp(0.5rem,2vw,1rem)]">
            <p className="font-display font-semibold tracking-[-0.025em] text-[clamp(22px,2.8vw,30px)] leading-[1.15] text-ink m-0 mb-[clamp(0.5rem,1.5vw,0.75rem)]">
              Added to your basket.
            </p>
            <p className="font-sans font-normal text-[14.5px] md:text-[15px] leading-[1.6] text-ink-muted m-0 max-w-[56ch]">
              A gift card of{" "}
              <span className="text-ink">{formatGBP(added.amountPence)}</span> is
              in your basket. The amount you see is exactly what you'll pay —
              nothing is added at checkout. You can add another, or proceed when
              you're ready.
            </p>
            <div className="mt-[clamp(1.25rem,3vw,1.75rem)] flex flex-col sm:flex-row sm:items-center gap-4">
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
          </Reveal>
        ) : (
          <>
            {/* Denomination picker */}
            <Reveal as="section" className="mb-[clamp(1.5rem,4vw,2.25rem)]">
              <p className={cn(EYEBROW_MUTED, "m-0 mb-[clamp(0.75rem,2vw,1rem)]")}>
                Choose an amount
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        "text-left rounded-2xl px-5 py-4 transition-all duration-300 bg-bg-soft",
                        "ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        isSelected
                          ? "ring-accent ring-2"
                          : "ring-line hover:ring-ink/40",
                      )}
                    >
                      <span className={cn(EYEBROW_MUTED, "block m-0 mb-1.5")}>
                        {d.sizeShort} · {d.label}
                      </span>
                      <span className="font-display font-semibold tracking-[-0.02em] text-[clamp(20px,2.4vw,28px)] text-ink leading-none">
                        {formatGBP(d.amountPence)}
                      </span>
                    </button>
                  );
                })}

                {/* Custom amount */}
                <button
                  type="button"
                  onClick={() => {
                    setSelection({ kind: "custom" });
                    setError("");
                  }}
                  aria-pressed={selection.kind === "custom"}
                  className={cn(
                    "text-left rounded-2xl px-5 py-4 transition-all duration-300 bg-bg-soft sm:col-span-2",
                    "ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    selection.kind === "custom"
                      ? "ring-accent ring-2"
                      : "ring-line hover:ring-ink/40",
                  )}
                >
                  <span className={cn(EYEBROW_MUTED, "block m-0 mb-1.5")}>
                    Custom amount
                  </span>
                  <span className="font-sans font-normal text-[14px] text-ink-muted">
                    Any whole-pound value from {formatGBP(GIFT_MIN_PENCE)} to{" "}
                    {formatGBP(GIFT_MAX_PENCE)}.
                  </span>
                </button>
              </div>

              {selection.kind === "custom" && (
                <label className="block mt-4 max-w-[280px]">
                  <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                    Amount (£)
                  </span>
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute left-4 top-1/2 -translate-y-1/2 font-sans text-[15px] text-ink-muted"
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
                      className="w-full bg-bg-soft ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none pl-8 pr-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink-faint transition-shadow"
                      placeholder={String(minPounds)}
                    />
                  </div>
                </label>
              )}
            </Reveal>

            {/* Recipient + message (all optional) */}
            <Reveal as="section" className="mb-[clamp(1.5rem,4vw,2.25rem)]">
              <Separator className="bg-line mb-[clamp(1.25rem,3.5vw,2rem)]" />
              <p className={cn(EYEBROW_MUTED, "m-0 mb-[clamp(0.75rem,2vw,1rem)]")}>
                For someone in particular?{" "}
                <span className="font-normal tracking-normal normal-case text-ink-faint">
                  Optional
                </span>
              </p>
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
                    className="w-full bg-bg-soft ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink-faint transition-shadow"
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
                    className="w-full bg-bg-soft ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink-faint transition-shadow"
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
                  className="w-full bg-bg-soft ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] leading-[1.65] text-ink placeholder:text-ink-faint transition-shadow resize-none"
                  placeholder="A few words to go with the gift."
                />
              </label>
              <p className="font-sans font-normal text-[12.5px] leading-[1.55] text-ink-muted m-0 mt-2.5 max-w-[56ch]">
                Leave these blank to gift the card to yourself to pass on by
                hand. The amount is charged at checkout exactly as shown — there
                is no delivery cost on a gift card.
              </p>
            </Reveal>

            {/* Add to basket */}
            <Reveal as="section">
              <Separator className="bg-line mb-[clamp(1.25rem,3.5vw,2rem)]" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className={cn(EYEBROW_MUTED, "m-0 mb-1.5")}>Your gift</p>
                  <p className="font-display font-semibold tracking-[-0.02em] text-[clamp(24px,3vw,38px)] text-ink m-0 leading-none">
                    {resolved ? formatGBP(resolved.amountPence) : "—"}
                  </p>
                </div>
                <button type="button" onClick={handleAdd} className={BTN_PRIMARY}>
                  Add gift card to basket
                  <span aria-hidden="true" className="ml-2">→</span>
                </button>
              </div>
              {error && (
                <p role="alert" className="mt-4 font-sans text-[13px] text-accent m-0">
                  {error}
                </p>
              )}
            </Reveal>
          </>
        )}
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
