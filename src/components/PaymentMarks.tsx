import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * PaymentMarks — full-colour card / wallet acceptance marks on white chips.
 *
 * Colourised 2026-08-30 (Hugo: "the card symbols have no colour … they look so
 * much better" on other sites). Per the design-director agent, real full-colour
 * brand logos on small WHITE chips is BOTH what he wants AND the correct/compliant
 * answer — network brand guidelines (esp. Mastercard) mandate unmodified full
 * colour, and flat mono is exactly why the old row read dull. Each brand sits on
 * its own restrained white rounded chip so the true colours read crisp on the
 * dark footer, exactly like a real checkout. Only the networks live in Stripe:
 * Visa, Mastercard, Amex, Apple Pay, Google Pay. Used by Footer, Basket and PDP.
 */

const Visa = () => (
  <span className="font-sans font-bold italic text-[13px] tracking-[0.02em] leading-none text-[#1434CB]">
    VISA
  </span>
);

/** Mastercard — the interlocking red + amber discs, the mark that reads at any size. */
const Mastercard = () => (
  <svg viewBox="0 0 32 20" className="h-[15px] w-auto" aria-hidden="true">
    <circle cx="13" cy="10" r="8" fill="#EB001B" />
    <circle cx="19" cy="10" r="8" fill="#F79E1B" fillOpacity="0.9" />
  </svg>
);

/** American Express — the white wordmark reversed out of the network blue. */
const Amex = () => (
  <span className="inline-flex items-center rounded-[3px] bg-[#1F72CD] px-1 py-[2px] leading-none">
    <span className="font-sans font-bold text-[9px] tracking-[0.04em] text-white">AMEX</span>
  </span>
);

const ApplePay = () => (
  <span className="inline-flex items-center gap-[3px] leading-none text-[#111]">
    <svg viewBox="0 0 22 24" className="h-[14px] w-auto" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 8.02 7.37c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.5 4.02zM13.15 4.3c.09 2.24-1.79 4.1-3.79 3.85-.24-1.99 1.85-4.15 3.79-3.85z" />
    </svg>
    <span className="font-sans font-semibold text-[12px] leading-none">Pay</span>
  </span>
);

const GooglePay = () => (
  <span className="inline-flex items-center gap-[2px] leading-none">
    <span className="font-sans font-bold text-[13px] leading-none text-[#4285F4]">G</span>
    <span className="font-sans font-medium text-[12px] leading-none text-[#5F6368]">Pay</span>
  </span>
);

/** One white chip — uniform height, houses a colour brand mark. */
const Chip = ({ children, label }: { children: ReactNode; label: string }) => (
  <span
    className="inline-flex h-7 min-w-[42px] items-center justify-center rounded-[5px] bg-white px-2 ring-1 ring-black/5"
    aria-hidden="true"
    data-payment-mark={label}
  >
    {children}
  </span>
);

const MARKS: { label: string; node: ReactNode }[] = [
  { label: "Visa", node: <Visa /> },
  { label: "Mastercard", node: <Mastercard /> },
  { label: "American Express", node: <Amex /> },
  { label: "Apple Pay", node: <ApplePay /> },
  { label: "Google Pay", node: <GooglePay /> },
];

export const PaymentMarks = ({ className }: { className?: string }) => (
  <div
    className={cn("flex flex-wrap items-center gap-2", className)}
    role="img"
    aria-label="Accepted payment methods: Visa, Mastercard, American Express, Apple Pay and Google Pay"
  >
    {MARKS.map((m) => (
      <Chip key={m.label} label={m.label}>
        {m.node}
      </Chip>
    ))}
  </div>
);
