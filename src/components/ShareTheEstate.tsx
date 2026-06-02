import { useState } from "react";

/**
 * "Share the estate" — quiet post-purchase share affordance for OrderSuccess.
 *
 * After a buyer's first print purchase, we offer three small share buttons
 * (Email · Copy link · X / Twitter) framed as introducing Stephen's work to
 * a friend — never as "refer a friend for £10 off". The estate's register
 * is custody of an oeuvre, not a viral loop.
 *
 * No tracking, no UTM blast — just a clean URL. A real referral-tracking
 * mechanism (unique codes per buyer, attribution on the next purchase, a
 * percentage credit) would need a database to durably store the mapping,
 * and we don't have one. Flagged as a follow-up in the brief.
 *
 * Props let the caller theme the surrounding container (the OrderSuccess
 * page uses a centred / cream-on-bg layout; the About page might surface
 * a left-aligned variant later).
 */

interface ShareTheEstateProps {
  /** Optional override URL — defaults to https://themandalacompany.com */
  shareUrl?: string;
  /** Optional override share text. */
  shareText?: string;
  /** Centre the layout (OrderSuccess) or left-align it (default). */
  align?: "center" | "left";
}

const DEFAULT_URL = "https://themandalacompany.com";
const DEFAULT_TEXT =
  "The Art of Stephen Meakin — mandalas and sacred geometry, from the estate of a British painter (1966–2021).";

export const ShareTheEstate = ({
  shareUrl = DEFAULT_URL,
  shareText = DEFAULT_TEXT,
  align = "left",
}: ShareTheEstateProps) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Older browsers / insecure contexts — fall back to a prompt.
      window.prompt("Copy the link:", shareUrl);
    }
  };

  const emailHref = `mailto:?subject=${encodeURIComponent(
    "The Art of Stephen Meakin",
  )}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText,
  )}&url=${encodeURIComponent(shareUrl)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl,
  )}`;

  const wrapAlign = align === "center" ? "text-center" : "text-left";
  const rowAlign =
    align === "center"
      ? "justify-center"
      : "justify-start";

  return (
    <div className={`mt-10 ${wrapAlign}`}>
      <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/55 m-0 mb-3">
        Share the estate
      </p>
      <p className="font-sans font-normal text-[14px] leading-[1.7] text-ink/65 my-0 mb-5 max-w-[520px] mx-auto">
        If you know someone who'd appreciate Stephen's work, the estate is
        grateful for the introduction.
      </p>
      <div className={`flex flex-wrap items-center gap-2.5 ${rowAlign}`}>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center font-sans text-[10px] font-bold tracking-[0.24em] uppercase text-ink/75 hover:text-accent ring-1 ring-white/15 hover:ring-accent transition-all px-4 py-2.5 bg-transparent border-0 cursor-pointer"
        >
          {copied ? "Link copied" : "Copy link"}
        </button>
        <a
          href={emailHref}
          className="inline-flex items-center font-sans text-[10px] font-bold tracking-[0.24em] uppercase text-ink/75 hover:text-accent ring-1 ring-white/15 hover:ring-accent transition-all px-4 py-2.5 no-underline"
        >
          Email
        </a>
        <a
          href={twitterHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center font-sans text-[10px] font-bold tracking-[0.24em] uppercase text-ink/75 hover:text-accent ring-1 ring-white/15 hover:ring-accent transition-all px-4 py-2.5 no-underline"
        >
          Twitter
        </a>
        <a
          href={facebookHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center font-sans text-[10px] font-bold tracking-[0.24em] uppercase text-ink/75 hover:text-accent ring-1 ring-white/15 hover:ring-accent transition-all px-4 py-2.5 no-underline"
        >
          Facebook
        </a>
      </div>
    </div>
  );
};
