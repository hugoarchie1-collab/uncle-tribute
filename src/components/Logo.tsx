import { Link } from "react-router-dom";
import { asset } from "../lib/asset";

interface LogoProps {
  size?: number;
  wordmark?: boolean;
  /** Let the wordmark WRAP within its container instead of forcing one line.
   *  Used in the footer 4-col grid, where the column gets narrower than the
   *  one-line wordmark below ~1400px and the nowrap text spilled into the
   *  next ("SITE") column. With this on, the brand box fills its column and
   *  the wordmark breaks cleanly to two lines rather than overlapping. */
  wordmarkWrap?: boolean;
  /** Override the wordmark text. Defaults to the estate name; the top banner
   *  passes "The SEM Experience" while the footer keeps the full name. */
  wordmarkText?: string;
  className?: string;
}

/**
 * THE GLOBAL LOGO — the deep-red wax-seal Tudor rose MARK locked up with the
 * "The Art of Stephen Meakin" wordmark set in the site's main display face
 * (Fraunces, true bold 700 — the SAME cut as the masthead / section titles), so
 * the brand reads as one recognisable emblem everywhere (Hugo 2026-08-03: "use
 * the rose wax-seal logo next to the name, in the main bold font, proportions
 * matched so it's perfect"). The seal is sized to the wordmark's two-line cap
 * block so the mark and the name share a height — a balanced, classic
 * emblem-and-logotype lockup.
 */
export const Logo = ({
  size = 30,
  wordmark = true,
  wordmarkWrap = false,
  wordmarkText = "The Art of Stephen Meakin",
  className,
}: LogoProps) => {
  void size;
  return (
    <div
      className={`${wordmarkWrap ? "flex w-full" : "inline-flex min-w-0"} items-center gap-2.5 sm:gap-3 leading-none ${className ?? ""}`}
    >
      {/* The estate's OWN wax-seal Tudor rose MARK beside the name. Decorative
          (the wordmark + the LogoLink aria-label carry the accessible name). */}
      <img
        src={asset("/logo/logo-seal-v9-w256.png")}
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        className="shrink-0 h-[clamp(38px,7.4vw,52px)] w-auto select-none [filter:drop-shadow(0_1px_4px_rgba(0,0,0,0.5))]"
      />
      {wordmark && (
        // Wordmark in the MAIN BOLD DISPLAY FACE (Fraunces 700 — matches the
        // masthead). Sits on two tight lines so the name block's height matches
        // the seal, giving a balanced emblem-and-logotype lockup. Wraps in the
        // narrow footer column too (wordmarkWrap).
        <span
          className={`font-display font-bold text-ink tracking-[-0.01em] [font-variation-settings:'opsz'_40,'wght'_700] [text-shadow:0_1px_6px_rgba(0,0,0,0.5)] leading-[1.02] ${
            wordmarkWrap
              ? "text-[clamp(15px,3.2vw,20px)] min-w-0 whitespace-normal"
              : "text-[clamp(15px,3.4vw,20px)] whitespace-normal min-w-0 max-w-full"
          }`}
        >
          {wordmarkText}
        </span>
      )}
    </div>
  );
};

export const LogoLink = ({ size = 30, wordmark = true }: LogoProps) => (
  <Link to="/" aria-label="The Art of Stephen Meakin — home" className="inline-flex">
    <Logo size={size} wordmark={wordmark} />
  </Link>
);
