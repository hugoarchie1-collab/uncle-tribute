import { Link } from "react-router-dom";
import { EYEBROW_TIGHT, META } from "./ui/tokens";
import { cn } from "../lib/cn";

/**
 * ReassuranceRow — three honest, documented reassurances under the buy box.
 * Every claim is literally true for this stack: payments via Stripe,
 * damaged-in-transit replacement (see /returns), and free worldwide delivery
 * with estate dispatch in 7–10 days (see /faq — FREE SHIPPING POLICY 2026-06-06,
 * the estate absorbs all delivery cost into the print margin). Deliberately NOT
 * an unconditional 14-day refund (made-to-order, UK CCR 2013 reg 28) and NO
 * fake SSL/badge.
 */
type IconProps = { className?: string };
const baseSvg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};
const LockIcon = ({ className }: IconProps) => (
  <svg {...baseSvg} className={className}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
const ReturnIcon = ({ className }: IconProps) => (
  <svg {...baseSvg} className={className}>
    <path d="M9 5 4 10l5 5" />
    <path d="M4 10h11a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H8" />
  </svg>
);
const ParcelIcon = ({ className }: IconProps) => (
  <svg {...baseSvg} className={className}>
    <path d="M3.3 7 12 11l8.7-4M12 11v9.5" />
    <path d="m3.3 7 8.7-4 8.7 4v9.3L12 20.5 3.3 16.3Z" />
  </svg>
);

export const ReassuranceRow = () => (
  <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-4">
    <div className="flex flex-col gap-1.5">
      <LockIcon className="w-[18px] h-[18px] text-ink/55" />
      <span className={EYEBROW_TIGHT}>Secure checkout</span>
      <span className={META}>Cards, Apple&nbsp;Pay &amp; Google&nbsp;Pay via Stripe</span>
    </div>
    <div className="flex flex-col gap-1.5">
      <ReturnIcon className="w-[18px] h-[18px] text-ink/55" />
      <span className={EYEBROW_TIGHT}>Damaged in transit</span>
      <Link to="/returns" className={cn(META, "underline underline-offset-4 hover:text-ink transition-colors")}>
        Replacement guaranteed →
      </Link>
    </div>
    <div className="flex flex-col gap-1.5">
      <ParcelIcon className="w-[18px] h-[18px] text-ink/55" />
      <span className={EYEBROW_TIGHT}>Free delivery</span>
      <Link to="/faq" className={cn(META, "underline underline-offset-4 hover:text-ink transition-colors")}>
        Worldwide · ships in 7–10 days →
      </Link>
    </div>
  </div>
);
