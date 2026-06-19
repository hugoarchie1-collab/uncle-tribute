import { asset } from "../lib/asset";
import { cn } from "../lib/cn";

/**
 * ScanToVisit — a reusable "scan chip": a CREAM tile holding the homepage QR
 * plus the URL, for print/footer surfaces where a phone camera bridges paper
 * (or a dark page) to themandalacompany.com.
 *
 * ⚠️ The chip is the ONE place the ink flips: the site ground is #0a0908 with
 * cream ink, but here the tile is CREAM, so all text uses the cream-ink tokens
 * (text-cream-ink / text-cream-ink-soft). NEVER use text-ink here — that token
 * is cream and would be invisible on the cream chip.
 *
 * SCANNABILITY: the QR is always dark-on-cream and sits on the cream tile —
 * never inverted. The branded (rose) variant is the default; pass `plain` for
 * the unbranded QR (slightly higher contrast for the smallest reproductions).
 *
 * Reduced-motion safe: no essential motion (a CSS hover tint only).
 *
 * Variants:
 *   footer — compact horizontal lockup (QR left, two lines right), ~260px.
 *   card   — centred, larger QR + the estate tagline. The default.
 *   inline — centred, mid-size, no tagline.
 */
export function ScanToVisit({
  variant = "card",
  label = "Scan to visit",
  plain = false,
  className,
}: {
  variant?: "footer" | "card" | "inline";
  label?: string;
  plain?: boolean;
  className?: string;
}) {
  const src = asset(plain ? "/img/qr/qr-home-plain-v1.svg" : "/img/qr/qr-home-rose-v1.svg");
  const qrSize = variant === "footer" ? 96 : 128;

  const qr = (
    <img
      src={src}
      width={qrSize}
      height={qrSize}
      alt="QR code linking to themandalacompany.com"
      loading="lazy"
      decoding="async"
      className="block rounded-lg"
      style={{ width: qrSize, height: qrSize }}
    />
  );

  const eyebrow = (
    <span className="font-sans text-[11px] font-bold tracking-[0.28em] uppercase text-cream-ink-soft">
      {label}
    </span>
  );

  const url = (
    <span className="font-display text-cream-ink leading-[1.1]">themandalacompany.com</span>
  );

  if (variant === "footer") {
    return (
      <a
        href="https://themandalacompany.com"
        className={cn(
          "group inline-flex items-center gap-4 max-w-[260px]",
          "bg-cream rounded-2xl ring-1 ring-cream-ink/10 p-4",
          "no-underline transition-colors duration-300 hover:ring-cream-ink/20",
          className,
        )}
      >
        <span className="shrink-0 bg-cream rounded-lg p-1.5">{qr}</span>
        <span className="flex flex-col gap-1 min-w-0">
          {eyebrow}
          <span className="text-[15px]">{url}</span>
        </span>
      </a>
    );
  }

  // card + inline: centred lockup.
  return (
    <a
      href="https://themandalacompany.com"
      className={cn(
        "group inline-flex flex-col items-center text-center gap-3",
        "bg-cream rounded-2xl ring-1 ring-cream-ink/10 p-5",
        "no-underline transition-colors duration-300 hover:ring-cream-ink/20",
        className,
      )}
    >
      <span className="bg-cream rounded-lg p-2">{qr}</span>
      <span className="flex flex-col items-center gap-1.5">
        {eyebrow}
        <span className="text-[17px]">{url}</span>
        {variant === "card" && (
          <span className="font-sans text-[12px] leading-[1.5] text-cream-ink-soft mt-0.5">
            the art of stephen meakin.
          </span>
        )}
      </span>
    </a>
  );
}
