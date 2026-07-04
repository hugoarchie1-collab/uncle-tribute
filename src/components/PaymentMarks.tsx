import { cn } from "../lib/cn";

/**
 * PaymentMarks — the monochrome card / wallet acceptance-mark row.
 *
 * Every top-tier storefront (Stripe, Apple, Nike) shows the networks it accepts
 * as recognisable MARKS, not just the words "Visa, Mastercard…". Until now this
 * site asserted the brands in prose only (Basket trust cluster, ReassuranceRow)
 * with no glyphs. This is the single reusable component that renders them, so
 * the Footer, Basket and PDP all draw from ONE source and never drift.
 *
 * DESIGN CONTRACT (matches the site's strictly-monochrome trust convention):
 *  • Each mark is a functional acceptance indicator — NOT a colour brand badge.
 *    Rendered in `currentColor` inside a hairline `border-line` chip so the row
 *    inherits whatever ink tone its parent sets (footer = text-ink-muted →
 *    hover:text-ink, basket = text-ink/70). No garish network colours.
 *  • Uniform chip height (h-6) + baseline so wordmarks (VISA/AMEX) and symbols
 *    (Mastercard rings, Apple) sit on one optical line — the authentic mixed
 *    row every checkout shows.
 *  • ONLY the networks actually enabled in Stripe: Visa, Mastercard, Amex,
 *    Apple Pay, Google Pay. Klarna / Clearpay are a dashboard toggle that is NOT
 *    live in the UI — do not add their marks until Hugo confirms the toggle.
 *  • Decorative: the row carries one visually-hidden label for screen readers
 *    ("Accepted payment methods: …") and each chip is aria-hidden, so assistive
 *    tech reads the list once, not eleven glyph fragments.
 */

type MarkProps = { className?: string };

/** Wordmark chip helper — VISA / AMEX set in the site sans, tightly tracked. */
const WordMark = ({
  children,
  italic,
  className,
}: {
  children: string;
  italic?: boolean;
  className?: string;
}) => (
  <span
    className={cn(
      "font-sans font-bold leading-none text-[12px] tracking-[0.02em]",
      italic && "italic",
      className,
    )}
  >
    {children}
  </span>
);

/** Mastercard — the two interlocking discs, the mark that reads even in mono. */
const Mastercard = ({ className }: MarkProps) => (
  <svg viewBox="0 0 30 18" className={className} fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="9" r="7" opacity="0.85" />
    <circle cx="18" cy="9" r="7" opacity="0.45" />
  </svg>
);

/** Apple logo glyph — paired with a "Pay" wordmark for the Apple Pay mark. */
const AppleGlyph = ({ className }: MarkProps) => (
  <svg viewBox="0 0 22 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 8.02 7.37c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.5 4.02zM13.15 4.3c.09 2.24-1.79 4.1-3.79 3.85-.24-1.99 1.85-4.15 3.79-3.85z" />
  </svg>
);

/** One hairline chip wrapper — uniform height, houses a wordmark or symbol. */
const Chip = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <span
    className="inline-flex h-6 min-w-[38px] items-center justify-center rounded-[4px] border border-line px-1.5"
    aria-hidden="true"
    data-payment-mark={label}
  >
    {children}
  </span>
);

const MARKS: { label: string; node: React.ReactNode }[] = [
  { label: "Visa", node: <WordMark italic>VISA</WordMark> },
  { label: "Mastercard", node: <Mastercard className="h-[15px] w-auto" /> },
  { label: "American Express", node: <WordMark className="tracking-[0.06em]">AMEX</WordMark> },
  {
    label: "Apple Pay",
    node: (
      <span className="inline-flex items-center gap-[3px] leading-none">
        <AppleGlyph className="h-[13px] w-auto" />
        <WordMark className="text-[11px] font-semibold">Pay</WordMark>
      </span>
    ),
  },
  {
    label: "Google Pay",
    node: (
      <span className="inline-flex items-center gap-[3px] leading-none">
        <WordMark className="text-[12px]">G</WordMark>
        <WordMark className="text-[11px] font-semibold">Pay</WordMark>
      </span>
    ),
  },
];

export const PaymentMarks = ({ className }: { className?: string }) => (
  <div className={cn("flex flex-wrap items-center gap-1.5", className)} role="img" aria-label="Accepted payment methods: Visa, Mastercard, American Express, Apple Pay and Google Pay">
    {MARKS.map((m) => (
      <Chip key={m.label} label={m.label}>
        {m.node}
      </Chip>
    ))}
  </div>
);
