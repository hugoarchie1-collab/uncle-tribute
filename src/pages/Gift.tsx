import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { PrintTile } from "../components/PrintTile";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { PageMasthead } from "../components/PageMasthead";
import { useCurrency } from "../lib/currency";
import {
  PAINTINGS,
  PRINT_TIERS,
  getTierAdvertisedPricePence,
  type PrintTier,
} from "../data/paintings";
import {
  addGiftCard,
  GIFT_MIN_PENCE,
  GIFT_MAX_PENCE,
  GIFT_MESSAGE_MAX,
  GIFT_NAME_MAX,
  GIFT_EMAIL_MAX,
} from "../lib/basket";
import {
  EYEBROW,
  EYEBROW_MUTED,
  TITLE,
  SUBTITLE,
  META,
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
 * the shared ambient backdrop, Fraunces + Schibsted Grotesk, accent reserved for
 * eyebrows + interaction. Memorial-estate tone throughout, never a loud
 * "GIFT CARD" sale.
 */

// The size-pegged denominations: every AVAILABLE, non-one-off tier on the
// canonical ladder. Each card is labelled by its size + edition label, and
// carries the tier's ADVERTISED price as its face value. Derived from
// PRINT_TIERS so a catalogue price change flows here automatically
// (advertised == charged).
interface Denomination {
  /** Stable key — the tier id it's pegged to. */
  id: PrintTier["id"];
  /**
   * The tier's size string, VERBATIM from `tier.size` — which is the real
   * print dimensions, e.g. "42 × 42 cm", NOT an A-series token. The A-series
   * naming ("A2") is retired in buyer-facing copy; this field only ever shows
   * whatever the catalogue holds.
   */
  sizeShort: string;
  /** Tier label, e.g. "Collector Edition". */
  label: string;
  /** Face value in pence — the tier's ADVERTISED (buyable) price. */
  amountPence: number;
}

// ⚠️ The face value MUST be the ADVERTISED (buyable) price, not `tier.pricePence`.
// The bare base is a GHOST price — there are no unframed prints, so the cheapest
// a buyer can actually complete is base + the cheaper finish (see
// getTierAdvertisedPricePence in paintings.ts). Pegging to the base shipped a
// card labelled "Collector Edition — £525" that could not buy a Collector
// Edition (£750), leaving the recipient £225 short; the gap ran £75–£325 across
// the four rungs. Every other surface on the site routes through this helper —
// this page must too, or the "pegged to a print size" promise is false.
const tierToDenomination = (tier: PrintTier): Denomination => ({
  id: tier.id,
  sizeShort: tier.size,
  label: tier.label,
  amountPence: getTierAdvertisedPricePence(tier),
});

/**
 * The label a denomination carries into the basket / Stripe, e.g.
 * "Collector Edition".
 *
 * ⚠️ MUST NOT contain a formatted money figure. The label is a STRING, frozen
 * at add-time and persisted to localStorage; the basket's price column is
 * recomputed live from `amountPence` against the active currency. Baking the
 * figure in meant a card added in GBP and viewed in USD rendered
 * "Custom amount — £250.00" on the same line as "$330" — two different numbers
 * for one charge, on the money surface. The amount is the basket's job; this
 * string only says WHICH denomination it was.
 *
 * ⚠️ MUST NOT contain DIGITS EITHER. `normaliseGift` in api/checkout.ts rejects
 * any client label matching /[£$€¥]|\d{2,}/ — a defence against a crafted
 * "£5,000 gift card" label printing a false figure on the estate's own Stripe
 * receipt — and substitutes a server-derived "£750 gift card". The old label
 * was `${tier.size} ${tier.label}` ("42 × 42 cm Collector Edition"), whose "42"
 * tripped that guard, so the denomination the buyer picked was silently
 * discarded on the way to Stripe. The tier label alone carries no digits, names
 * the denomination unambiguously, and survives the guard verbatim — so what the
 * basket shows is what Stripe records. The SIZE is still shown on the
 * denomination card itself (`{d.sizeShort} · {d.label}`); it just doesn't
 * travel in the label. Keep this string digit-free and symbol-free.
 */
const denominationCardLabel = (d: Denomination): string => d.label;

type Selection = { kind: "tier"; id: PrintTier["id"] } | { kind: "custom" };

/** Roving-tabindex key for the custom rung (tier ids can never collide with it). */
const CUSTOM_KEY = "__custom";

// The gift window in whole pounds, formatted once. These are the figures the
// SERVER validates against (api/checkout.ts re-checks amountPence against the
// same GBP window), so they are stated in GBP wherever the input is stated in
// GBP — never silently converted, or the posted value would fail the guard.
const MIN_POUNDS_LABEL = (GIFT_MIN_PENCE / 100).toLocaleString("en-GB");
const MAX_POUNDS_LABEL = (GIFT_MAX_PENCE / 100).toLocaleString("en-GB");

export const Gift = () => {
  // Presentment currency — every figure on this page (and the label carried into
  // the basket) reads in the buyer's chosen currency; the same conversion is
  // applied server-side at checkout, so advertised == charged.
  // Only `formatPretty` is used. `format` was dropped with the baked-in label
  // figure: the page previously showed the same amount twice in two different
  // formats ("£525" from formatPretty above "…Collector Edition — £525.00"
  // from format). One figure, one formatter.
  const { formatPretty: fmtP, code } = useCurrency();

  // Four real works, drawn once per mount from the live catalogue so this band
  // can never advertise something the estate no longer sells.
  //
  // ⚠️ Lazy useState, not useMemo: the lint rule forbids an impure call inside
  // a memo (a memo may legitimately re-run), and this is the same lazy-initial
  // draw the home page's random-six grid uses. Fisher–Yates on a COPY — a
  // `sort(() => Math.random() - 0.5)` comparator is a biased shuffle and, with
  // an inconsistent comparator, is not even guaranteed to terminate sensibly.
  const [giftableWorks] = useState(() => {
    const pool = [...PAINTINGS];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 4);
  });

  // Size-pegged denominations: available, non-one-off tiers, in ladder order.
  const denominations = useMemo<Denomination[]>(
    () =>
      PRINT_TIERS.filter((t) => t.available && !t.isOneOff).map(
        tierToDenomination,
      ),
    [],
  );

  // Preselect the anchor (Collector) denomination if present, else the first.
  const initialSelection = useMemo<Selection>(() => {
    const anchor = denominations.find((d) => d.id === "collector");
    return { kind: "tier", id: (anchor ?? denominations[0])?.id ?? "collector" };
  }, [denominations]);

  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [customAmount, setCustomAmount] = useState(""); // whole pounds, as typed
  const [customTouched, setCustomTouched] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [error, setError] = useState("");
  const [added, setAdded] = useState<{ amountPence: number; label: string } | null>(
    null,
  );
  // Announced to assistive tech when a card lands in the basket. The whole form
  // is unmounted at that moment (see the `added` branch below), so without a
  // PERSISTENT live region + a focus move a keyboard / screen-reader buyer got
  // no signal at all that the purchase step had succeeded (WCAG 2.4.3 / 4.1.3).
  const [statusMessage, setStatusMessage] = useState("");

  // One add per click. `added` swaps the form out, but a genuine double-click
  // can fire two click events before React re-renders — and two gift lines
  // created in the same millisecond used to share an `addedAt`, which is the
  // basket's LINE IDENTITY (removing one would remove both).
  const addLockRef = useRef(false);
  const confirmHeadingRef = useRef<HTMLParagraphElement | null>(null);
  const customInputRef = useRef<HTMLInputElement | null>(null);

  const minPounds = GIFT_MIN_PENCE / 100;
  const maxPounds = GIFT_MAX_PENCE / 100;

  // ⚠️ CURRENCY vs THE SERVER CONTRACT.
  // Every FIGURE on this page reads in the buyer's currency (the denominations
  // convert, the "Your gift" panel converts, the basket converts). The custom
  // AMOUNT FIELD cannot: api/checkout.ts validates `amountPence` against a
  // whole-GBP-pound window, so a value typed in USD would either fail that
  // guard or have to be back-converted — and back-conversion rounds, which is
  // exactly how advertised != charged happens. So the FIELD stays GBP (the
  // unit the server checks) and the currency relationship is stated in full:
  // the GBP window the server enforces, plus the exact converted window the
  // buyer will actually be charged in, using the same conversion the server
  // applies (currency.ts / checkout.ts share CURRENCY_FX_VERSION).
  const gbpRangeLabel = `£${MIN_POUNDS_LABEL} to £${MAX_POUNDS_LABEL}`;
  const chargedRangeLabel = `${fmtP(GIFT_MIN_PENCE)} to ${fmtP(GIFT_MAX_PENCE)}`;
  const amountConstraint =
    code === "GBP"
      ? `Whole pounds, from ${gbpRangeLabel}.`
      : `Whole pounds, from ${gbpRangeLabel} — charged as ${chargedRangeLabel} in ${code}.`;
  // ⚠️ THE ADVERTISED RANGE MUST AGREE WITH THE FIELD.
  // The caption rail used to advertise the window in the buyer's currency ALONE
  // ("$33 – $6,600"), while the only place you can type an amount is a GBP field
  // the server validates in whole pounds. A US buyer read the dollar ceiling,
  // typed 6000 — inside it — and was refused. The rail now LEADS in the unit the
  // field accepts and carries the converted window after it, so the ceiling a
  // buyer reads is the ceiling they can type. (Money unchanged: the converted
  // figures are still what Stripe charges.)
  const windowRailLabel =
    code === "GBP"
      ? `£${MIN_POUNDS_LABEL} – £${MAX_POUNDS_LABEL}`
      : `£${MIN_POUNDS_LABEL} – £${MAX_POUNDS_LABEL} · charged as ${fmtP(GIFT_MIN_PENCE)} – ${fmtP(GIFT_MAX_PENCE)}`;

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
    return { amountPence, label: "Custom amount" };
  }, [selection, customAmount, denominations]);

  // A typed value that cannot become a gift. Kept separate from `error` so the
  // message can live AT the input (aria-describedby) as well as in the summary
  // panel — the old page surfaced it only on submit, in a different grid
  // column, while the panel showed a large, plausible, entirely fictional £25.
  const customInvalid =
    selection.kind === "custom" && customAmount.trim() !== "" && resolved === null;
  const showCustomError = customInvalid && customTouched;
  // The message speaks in the SAME unit as the field it belongs to (whole
  // pounds), and — off GBP — restates the converted window so a buyer who was
  // refused can see immediately what their currency ceiling really is. Reuses
  // the "charged as … in <code>" construction already used at the field.
  const amountErrorText =
    code === "GBP"
      ? `Please enter a whole-pound amount between £${MIN_POUNDS_LABEL} and £${MAX_POUNDS_LABEL}.`
      : `Please enter a whole-pound amount between £${MIN_POUNDS_LABEL} and £${MAX_POUNDS_LABEL} — charged as ${chargedRangeLabel} in ${code}.`;

  // ---- Denomination ladder as a real radio group ---------------------------
  // Was a row of `aria-pressed` toggle buttons: nothing announced the group's
  // purpose or "2 of 5". Now radiogroup + radio with a roving tabindex and
  // arrow-key selection, the WAI-ARIA pattern.
  const optionKeys = useMemo<string[]>(
    () => [...denominations.map((d) => String(d.id)), CUSTOM_KEY],
    [denominations],
  );
  const selectedKey = selection.kind === "custom" ? CUSTOM_KEY : String(selection.id);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const selectKey = (key: string) => {
    setError("");
    if (key === CUSTOM_KEY) setSelection({ kind: "custom" });
    else setSelection({ kind: "tier", id: key as PrintTier["id"] });
  };

  const onLadderKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = optionKeys.indexOf(selectedKey);
    if (i < 0) return;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % optionKeys.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (i - 1 + optionKeys.length) % optionKeys.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = optionKeys.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const key = optionKeys[next];
    selectKey(key);
    optionRefs.current[key]?.focus();
  };

  // Move focus to the confirmation heading the moment the form is replaced.
  // The button that had focus is unmounted by that swap, so without this focus
  // falls to <body> and a keyboard buyer must tab from the top of the document
  // to reach "Go to basket".
  useEffect(() => {
    if (added) confirmHeadingRef.current?.focus();
  }, [added]);

  const handleAdd = () => {
    if (addLockRef.current) return; // a double-click must not add two cards
    setError("");
    if (!resolved) {
      setCustomTouched(true);
      // ⚠️ On the custom rung the error is ALREADY rendered beside the field
      // (`showCustomError`), so setting it here too rendered the identical
      // sentence in two visible role="alert" nodes — announced twice by a
      // screen reader, and shown twice on screen ~750px apart. The summary
      // panel carries only errors that have no field of their own.
      if (selection.kind === "custom") {
        setError("");
        // Send the buyer to the thing they have to change. Focus was landing on
        // <body> after a failed submit, so a keyboard user had to tab back up
        // the page to find out what was wrong.
        customInputRef.current?.focus();
      } else {
        setError("Please choose an amount.");
      }
      return;
    }
    // Optional recipient email — validate only if provided.
    // ⚠️ MIRROR: this is GIFT_EMAIL_RE from api/checkout.ts, byte-for-byte. The
    // server now REJECTS the whole checkout on a malformed gift address (the
    // code would otherwise be posted into the void), so a looser client regex
    // would let a buyer through /gift and fail them at the money click instead.
    // The old client pattern allowed commas / semicolons / pipes; the server
    // does not. Change both together.
    if (
      recipientEmail.trim() &&
      !/^[^\s@,;|]+@[^\s@,;|.]+(\.[^\s@,;|.]+)+$/.test(recipientEmail.trim())
    ) {
      setError("Please enter a valid recipient email, or leave it blank.");
      return;
    }
    addLockRef.current = true;
    const ok = addGiftCard({
      amountPence: resolved.amountPence,
      label: resolved.label,
      recipientName: recipientName.trim() || undefined,
      recipientEmail: recipientEmail.trim() || undefined,
      giftMessage: giftMessage.trim() || undefined,
    });
    if (!ok) {
      addLockRef.current = false;
      setError("That amount isn't available. Please choose another.");
      return;
    }
    setStatusMessage(
      `A gift card of ${fmtP(resolved.amountPence)} is in your basket.`,
    );
    setAdded(resolved);
    // Reset the personal fields so a second gift starts clean; keep the
    // denomination selection so adding several of the same is quick.
    setRecipientName("");
    setRecipientEmail("");
    setGiftMessage("");
    setCustomAmount("");
    setCustomTouched(false);
  };

  const addAnother = () => {
    addLockRef.current = false;
    setStatusMessage("");
    setAdded(null);
  };

  // Clamped at 0. `maxLength` stops normal typing and pasting, but a value set
  // programmatically (autofill, a password manager, a restored draft) can
  // exceed it — and the counter then read "-1 of 400 characters remaining",
  // which is nonsense rather than guidance.
  const messageRemaining = Math.max(0, GIFT_MESSAGE_MAX - giftMessage.length);

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      <SceneBackdrop src="/img/scenes/gift-scene-v4.webp" />
      <Seo
        title="Gift an edition"
        description="Give a piece of Stephen Meakin's work. A digital gift card towards any estate-stamped print — choose a size-pegged amount or a custom value, add a personal message, and let the recipient choose the print that speaks to them."
        url="/gift"
      />
      <Nav />
      {/* Canonical centred envelope (1320/1500/1720/1880) — the SAME axis +
          measure as Collections + About, so /gift sits on the one centred
          vertical axis the rest of the site shares (Hugo: "nothing is centred
          properly"). */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-12 pb-10 md:pb-12">
        {/* PERSISTENT live region — mounted for the life of the page so a
            message written into it is reliably announced. (A live region that
            MOUNTS with its own content is not, which is why the confirmation
            block below cannot be the announcer.) */}
        <p role="status" aria-live="polite" className="sr-only">
          {statusMessage}
        </p>

        {/* ── MASTHEAD ─────────────────────────────────────────────────────
            The refined shared <PageMasthead>: a composed Fraunces statement
            (wght 560, one italic emphasis word, NOT a bold logo) → the
            supporting passage beneath under a border-t.
            ⚠️ PageMasthead RENDERS NEITHER `eyebrow` NOR `meta` — both props are
            accepted and deliberately dropped (the owner had the eyebrow/meta
            rule removed from every masthead, 2026-07-18). This page used to
            pass the £25–£5,000 range as `meta` and claim in a comment that it
            was "surfaced in the meta row": it was not surfaced anywhere. The
            range now lives in the caption rail below, which really does render.
            `eyebrow` is still passed only because the prop is required. */}
        <Reveal className="mb-7 md:mb-10">
          <PageMasthead
            eyebrow="Gift an edition"
            title={
              <>
                Give a <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>piece</em> of
                Stephen's work.
              </>
            }
          >
            {/* Lead passage spans the full envelope width on its own line, then
                a balanced caption rail sits beneath the hairline — the old
                col-span-3 / col-span-9 split left a near-empty eyebrow rail
                stranded beside a full block. The statement now fills the page
                axis edge-to-edge; the caption, range and reassurance share an
                even three-up row, none of them half-empty. */}
            <div className="mt-4 md:mt-5 border-t border-line pt-4 md:pt-5">
              <p
                className="font-display font-normal tracking-[-0.01em] text-ink m-0 max-w-[58ch] lg:max-w-[68ch] 2xl:max-w-[76ch] 3xl:max-w-[88ch] 4xl:max-w-[96ch]"
                style={{
                  fontVariationSettings: '"opsz" 32, "wght" 400',
                  fontSize: "clamp(20px, 2.2vw, 34px)",
                  lineHeight: 1.28,
                }}
              >
                A gift towards any estate-stamped print of Stephen Meakin's
                mandala paintings. Choose an amount pegged to a print size — or
                set your own — add a few words if you wish, and let the person
                you're thinking of choose the work that speaks to them.
              </p>
              <div className="mt-4 md:mt-5 grid grid-cols-1 sm:grid-cols-3 gap-x-10 2xl:gap-x-16 gap-y-3 border-t border-line pt-3 md:pt-4">
                <p className={cn(EYEBROW_MUTED, "m-0 leading-[1.7]")}>
                  A digital gift card · redeemed against any edition
                </p>
                {/* The gift window, LIVE from GIFT_MIN/MAX_PENCE — never
                    re-typed. ⚠️ Leads in the unit the FIELD accepts (see
                    windowRailLabel): advertising "$33 – $6,600" over a GBP
                    input meant a US buyer read the dollar ceiling, typed 6000,
                    and was refused. */}
                <p className={cn(EYEBROW_MUTED, "m-0 leading-[1.7] sm:text-center tabular-nums")}>
                  {windowRailLabel}
                </p>
                <p className={cn(EYEBROW_MUTED, "m-0 leading-[1.7] sm:text-right")}>
                  Estate-stamped giclée · free delivery
                </p>
              </div>
            </div>
          </PageMasthead>
        </Reveal>

        {added ? (
          // ---- Confirmation ---------------------------------------------
          // Centred on the page axis (was a left-biased col-span-3/9 split that
          // stranded the eyebrow in a near-empty rail and held the message to a
          // narrow 64ch column with a wide empty right margin). The eyebrow now
          // sits above the statement on the same centred axis; the headline
          // fills a confident measure toward the envelope edges.
          <Reveal as="section" className="mx-auto max-w-[1040px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] text-center py-6 md:py-8">
            <p className={cn(EYEBROW, "m-0 mb-4 md:mb-5")}>In your basket</p>
            <p
              ref={confirmHeadingRef}
              tabIndex={-1}
              className={cn(TITLE, "m-0 max-w-[18ch] mx-auto outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-[6px]")}
            >
              A gift card of{" "}
              <span className="text-accent">
                {fmtP(added.amountPence)}
              </span>{" "}
              is in your basket.
            </p>
            <p className={cn(SUBTITLE, "m-0 mt-5 md:mt-6 max-w-[64ch] mx-auto")}>
              The amount you see is exactly what you'll pay — nothing is added
              at checkout. You can add another, or proceed when you're ready.
            </p>
            <div className="mt-6 md:mt-7 flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4">
              <Link to="/basket" className={BTN_PRIMARY}>
                Go to basket
                <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <button
                type="button"
                onClick={addAnother}
                className={BTN_SECONDARY}
              >
                Add another gift card
              </button>
            </div>
          </Reveal>
        ) : (
          // ── DENSE TWO-COLUMN EDITORIAL BODY ───────────────────────────────
          // Left rail = the denomination grid (the headline act, packed into a
          // tighter 2/3-up grid that fills the width). Right rail = the
          // optional recipient details + a sticky "your gift" summary. Section
          // headings carry a numeral so the two acts read as a deliberate
          // sequence, not a stack of separators floating in air. Act 03 spans
          // the full envelope beneath both rails.
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 2xl:gap-x-16 gap-y-10 md:gap-y-12">
            {/* ACT 01 — Choose an amount (the denser denomination grid) */}
            <Reveal as="section" className="lg:col-span-7">
              <div className="flex items-baseline gap-3 border-t border-line pt-3 mb-3 md:mb-4">
                <span className={cn(EYEBROW, "shrink-0")}>01</span>
                <span id="gift-amount-group-label" className={cn(EYEBROW_MUTED, "shrink-0")}>
                  Choose an amount
                </span>
              </div>
              {/* FOUR size-pegged denominations (A0/Heirloom + Original are
                  retired; Emblem was added 2026-08-29). The count must divide
                  the column evenly or the last card is stranded alone on row
                  two — so 2×2, never 3-up (correct for three tiers, orphaned
                  the moment Emblem landed).
                  ⚠️ Do NOT "improve" this to 4-across. This grid sits in the
                  narrow left column beside the sticky summary: measured at a
                  1280px viewport a 4-up card is only 159px wide, and the
                  40.96px Fraunces amount wraps "£1,300" onto two lines. 2×2
                  keeps every amount on one line at every width, and stacks
                  1-up on phones. The custom rung below spans the full row. */}
              <div
                role="radiogroup"
                aria-labelledby="gift-amount-group-label"
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3 3xl:gap-4"
              >
                {denominations.map((d) => {
                  const key = String(d.id);
                  const isSelected =
                    selection.kind === "tier" && selection.id === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={selectedKey === key ? 0 : -1}
                      ref={(el) => {
                        optionRefs.current[key] = el;
                      }}
                      onClick={() => selectKey(key)}
                      onKeyDown={onLadderKeyDown}
                      className={cn(
                        // ⚠️ NO OPAQUE SLAB. This read `bg-bg-soft/85` (#14120f at 85%) — /gift
                        // was the ONLY buying surface using it: 7 occurrences here
                        // against 0 on /for-you, the PDP, /collections and /basket,
                        // and at 390px the four cards became full-width near-black
                        // bars, the heaviest dark mass on any buying page, sitting
                        // on top of the ambient wash every reference page keeps
                        // visible. This is the Collections / FindAPrint treatment:
                        // a hairline ring and a barely-there tint that lets the
                        // ground through. Never a scrim.
                        "group text-left rounded-[12px] px-4 py-3.5 md:px-5 md:py-4 transition-all duration-300",
                        "ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        isSelected
                          ? "ring-accent ring-2 bg-accent/[0.07]"
                          : "ring-line bg-ink/[0.02] hover:ring-accent/50 hover:bg-ink/[0.035]",
                      )}
                    >
                      <span className={cn(EYEBROW_MUTED, "block m-0 mb-1.5")}>
                        {d.sizeShort} · {d.label}
                      </span>
                      <span
                        className={cn(
                          "font-display font-bold [font-variation-settings:'opsz'_48,'wght'_700] tracking-[-0.025em] text-[clamp(28px,3.2vw,48px)] leading-none block",
                          isSelected ? "text-accent" : "text-ink",
                        )}
                      >
                        {fmtP(d.amountPence)}
                      </span>
                    </button>
                  );
                })}

                {/* Custom amount — spans the full grid width as the wide rung
                    that closes the ladder. */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={selection.kind === "custom"}
                  tabIndex={selectedKey === CUSTOM_KEY ? 0 : -1}
                  ref={(el) => {
                    optionRefs.current[CUSTOM_KEY] = el;
                  }}
                  onClick={() => selectKey(CUSTOM_KEY)}
                  onKeyDown={onLadderKeyDown}
                  className={cn(
                    "text-left rounded-[12px] px-4 py-3.5 md:px-5 md:py-4 transition-all duration-300 col-span-1 sm:col-span-2",
                    "ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    // Matches the denomination cards above — see the ⚠️ note there.
                    selection.kind === "custom"
                      ? "ring-accent ring-2 bg-accent/[0.07]"
                      : "ring-line bg-ink/[0.02] hover:ring-accent/50 hover:bg-ink/[0.035]",
                  )}
                >
                  <span className={cn(EYEBROW_MUTED, "block m-0 mb-1.5")}>
                    Custom amount
                  </span>
                  {/* ⚠️ Only while UNSELECTED. Selecting this rung reveals the
                      amount field below, which carries the same sentence at the
                      point of entry — so rendering it here too showed the
                      identical helper line twice on screen at once. On the card
                      it is a preview of what the option is; at the field it is
                      the rule you are typing against. Never both. */}
                  {selection.kind !== "custom" && (
                    <span className={cn(META, "block")}>{amountConstraint}</span>
                  )}
                </button>
              </div>

              {selection.kind === "custom" && (
                <div className="mt-4 max-w-[420px] 3xl:max-w-[520px]">
                  <label className="block">
                    <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                      Amount (GBP)
                    </span>
                    <div className="relative">
                      <span
                        aria-hidden="true"
                        className="absolute left-4 top-1/2 -translate-y-1/2 font-sans text-[16px] 3xl:text-[22px] 4xl:text-[26px] text-ink-muted"
                      >
                        £
                      </span>
                      <input
                        ref={customInputRef}
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
                        onBlur={() => setCustomTouched(true)}
                        aria-invalid={showCustomError || undefined}
                        aria-describedby={
                          showCustomError
                            ? "gift-amount-help gift-amount-error"
                            : "gift-amount-help"
                        }
                        className={cn(
                          "w-full bg-ink/[0.04] ring-1 focus:ring-2 focus:ring-accent focus:outline-none pl-8 pr-4 py-3 font-sans text-[16px] 3xl:text-[22px] 4xl:text-[26px] text-ink placeholder:text-ink-fade transition-shadow [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                          showCustomError ? "ring-accent" : "ring-line",
                        )}
                        placeholder={String(minPounds)}
                      />
                    </div>
                  </label>
                  {/* The constraint lives WITH the field and is always readable,
                      not only after a failed submit — and it names the currency
                      the GBP figure is charged in. */}
                  <p id="gift-amount-help" className={cn(META, "m-0 mt-2")}>
                    {amountConstraint}
                  </p>
                  {showCustomError && (
                    <p
                      id="gift-amount-error"
                      role="alert"
                      className={cn(META, "m-0 mt-1.5 text-accent")}
                    >
                      {amountErrorText}
                    </p>
                  )}
                </div>
              )}

              {/* Recipient + message (all optional) — packed directly under
                  the ladder so the left rail reads as one continuous act. */}
              <div className="flex items-baseline gap-3 border-t border-line pt-3 mt-5 md:mt-6 mb-3 md:mb-4">
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
                    maxLength={GIFT_NAME_MAX}
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full bg-ink/[0.04] ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[16px] 3xl:text-[22px] 4xl:text-[26px] text-ink placeholder:text-ink-fade transition-shadow"
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
                    maxLength={GIFT_EMAIL_MAX}
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full bg-ink/[0.04] ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[16px] 3xl:text-[22px] 4xl:text-[26px] text-ink placeholder:text-ink-fade transition-shadow"
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
                  rows={3}
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  maxLength={GIFT_MESSAGE_MAX}
                  aria-describedby="gift-message-count"
                  className="w-full bg-ink/[0.04] ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[16px] 3xl:text-[22px] 4xl:text-[26px] leading-[1.65] text-ink placeholder:text-ink-fade transition-shadow resize-none"
                  placeholder="A few words to go with the gift."
                />
              </label>
              {/* The field simply stopped accepting keystrokes at 400 with no
                  explanation. The count is in the textarea's aria-describedby
                  so it's read on focus; it is NOT a live region (announcing
                  every keystroke would be unusable). */}
              <p
                id="gift-message-count"
                className={cn(META, "m-0 mt-2 tabular-nums")}
              >
                {messageRemaining} of {GIFT_MESSAGE_MAX} characters remaining
              </p>
              <p className={cn("font-sans leading-[1.55] text-ink-muted text-[clamp(16px,0.55vw+9px,24px)]", "m-0 mt-2 max-w-[72ch] 3xl:max-w-none")}>
                Leave these blank to gift the card to yourself to pass on by
                hand. If you give an email, the card is sent to that address as
                soon as your payment goes through — it cannot be held for a
                later date. The amount is charged at checkout exactly as shown —
                there is no delivery cost on a gift card.
              </p>
            </Reveal>

            {/* ACT — the running "your gift" summary, a sticky panel on the
                right rail so the figure + the add button travel with the
                reader as they move down the long left column. */}
            <Reveal as="div" className="lg:col-span-5 lg:col-start-8">
              <div className="lg:sticky lg:top-28 rounded-[12px] bg-ink/[0.03] ring-1 ring-line p-6 md:p-8">
                <p className={cn(EYEBROW_MUTED, "m-0 mb-3")}>Your gift</p>
                {/* ⚠️ NEVER render a plausible amount here when nothing valid is
                    chosen. This slot used to fall back to fmtP(GIFT_MIN_PENCE),
                    so typing 5001 / 24 / 0 / -5 / 25.50 all showed a large,
                    confident "£25" — a figure the buyer never chose and would
                    never be charged, distinguished from a real selection only
                    by a muted colour. An em rule + the constraint, never a
                    number. */}
                {resolved ? (
                  <p
                    className="font-display font-bold tracking-[-0.035em] text-[clamp(48px,7vw,116px)] text-ink m-0 leading-[0.85]"
                    style={{ fontVariationSettings: '"opsz" 48, "wght" 700' }}
                  >
                    {fmtP(resolved.amountPence)}
                  </p>
                ) : (
                  <p
                    aria-hidden="true"
                    className="font-display font-bold tracking-[-0.035em] text-[clamp(48px,7vw,116px)] text-ink-fade m-0 leading-[0.85]"
                    style={{ fontVariationSettings: '"opsz" 48, "wght" 700' }}
                  >
                    —
                  </p>
                )}
                {/* Echo the chosen denomination label (existing `resolved.label`
                    state — no new copy) so the sticky rail carries figure +
                    label + reassurance + button instead of stranding a void.
                    With nothing valid chosen, the same slot carries the
                    constraint the buyer has to satisfy. */}
                <p className={cn(META, "m-0 mt-3 border-t border-line pt-3")}>
                  {resolved ? resolved.label : amountConstraint}
                </p>
                <p className={cn("font-sans leading-[1.55] text-ink-muted text-[clamp(16px,0.55vw+9px,24px)]", "m-0 mt-5 max-w-[40ch] 3xl:max-w-none")}>
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
                  <p role="alert" className={cn(META, "mt-4 m-0 text-accent")}>
                    {error}
                  </p>
                )}
              </div>
            </Reveal>

            {/* ACT 03 — what actually lands, and when. A gift buyer was asked
                for a name, an email and 400 characters with no statement of
                what the recipient receives or when it reaches them.
                ⚠️ EVERY claim below is checked against the gift email renderer
                in api/stripe-webhook.ts (renderGiftHtml + the send block) and
                the coupon minter (GIFT_VALID_DAYS = 365, single-use amount_off,
                GIFT-XXXXXX code, sent to gift.recipientEmail when present and
                otherwise to the buyer, with the personal note included only on
                the recipient send). Nothing here is promised that the code does
                not do — in particular there is NO scheduled send. */}
            <Reveal as="section" className="lg:col-span-12">
              <div className="flex items-baseline gap-3 border-t border-line pt-3 mb-3 md:mb-4">
                <span className={cn(EYEBROW, "shrink-0")}>03</span>
                <span className={cn(EYEBROW_MUTED, "shrink-0")}>
                  What the recipient receives
                </span>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 2xl:gap-x-16 gap-y-6 m-0">
                {(
                  [
                    [
                      "What arrives",
                      "An email carrying a single-use gift code, valid for twelve months from the day you buy it.",
                    ],
                    [
                      "When it's sent",
                      "As soon as your payment goes through. There is no send-later date — for a gift you're planning ahead, leave the email blank and pass the card on by hand.",
                    ],
                    [
                      "Who it goes to",
                      "The recipient's inbox if you give their email, with your message in it. Leave the email blank and it comes to you instead.",
                    ],
                    [
                      "How it's spent",
                      "The code is entered at checkout and the gift value comes off the order total. If the print costs more, they pay the difference; if less, the gift covers it in full. Any value not spent on that order is not carried over, and is not refunded.",
                    ],
                  ] as const
                ).map(([term, detail]) => (
                  <div key={term} className="border-t border-line pt-3">
                    <dt className={cn(EYEBROW_MUTED, "m-0 mb-1.5")}>{term}</dt>
                    <dd className={cn(META, "m-0")}>{detail}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            {/* ⚠️ THE WORK ITSELF. /gift carried ZERO images of Stephen's
                paintings — against 4 on /collections and 7 on a product page —
                so a buyer was asked for up to £5,000, and a name, an email and
                four hundred words, without ever being shown a single mandala.
                On the estate of a visual artist that was the defining gap on
                this page.

                Deliberately restrained, and deliberately LAST: it sits after
                the form so it never competes with the money step, and it
                reuses the /collections tile verbatim (AssetImage → <picture>
                with the .webp sibling, the same caption, the same price line
                from SEARCH.tilePriceLine's source) rather than inventing a new
                image pattern. NO new buyer-visible words: the works carry their
                own titles and years, and the only other string is the price
                line already live on /collections and /for-you. */}
            <Reveal as="section" className="lg:col-span-12 mt-10 md:mt-14">
              <div className="flex items-baseline gap-3 border-t border-line pt-3 mb-4 md:mb-5">
                <span className={cn(EYEBROW, "shrink-0")}>04</span>
                <span className={cn(EYEBROW_MUTED, "shrink-0")}>
                  What it can be spent on
                </span>
              </div>
              {/* ⚠️ Uses the SHARED PrintTile — the same offer treatment as
                  /collections, the PDP rail and /search. This grid used to
                  hand-roll its own cut-down tile (image, title, price) and so
                  hid the colourway choice and the year; Hugo caught it from the
                  live page. Never re-inline a tile here — see PrintTile.tsx. */}
              <div className="flex flex-wrap justify-center gap-x-5 md:gap-x-7 gap-y-5 md:gap-y-6">
                {giftableWorks.map((p) => (
                  <PrintTile
                    key={p.id}
                    painting={p}
                    basisClassName="flex-[0_1_clamp(260px,30%,460px)]"
                    sizes="(min-width:1400px) min(30vw,460px), (min-width:640px) 30vw, 90vw"
                    titleClassName="text-[clamp(18px,1.2vw,26px)]"
                  />
                ))}
              </div>
            </Reveal>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};
