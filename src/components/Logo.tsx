import { Link } from "react-router-dom";

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

export const Logo = ({
  size = 30,
  wordmark = true,
  wordmarkWrap = false,
  wordmarkText = "The Art of Stephen Meakin",
  className,
}: LogoProps) => {
  // 2026-07-30 (Hugo "everything live" / full consistency): the wax seal was
  // dropped from the header, so the footer is aligned to MATCH — the plain
  // grotesk wordmark, no seal. The `size` prop is retained for API-compat but
  // there's no longer a mark to size. The seal still lives on certificates +
  // the favicon (where it's big enough to read + means authenticity). Restore
  // the <img> here if the estate wants the seal back as a footer signature.
  void size;
  return (
    <div className={`${wordmarkWrap ? "flex w-full" : "inline-flex min-w-0"} items-center leading-none ${className ?? ""}`}>
      {wordmark && (
        // Footer wordmark — the SAME clean grotesk wordmark as the nav header, so
        // the brand reads identically top + bottom. Wraps in the narrow footer
        // brand column (wordmarkWrap).
        <span
          className={`inline font-sans font-medium text-ink tracking-[0.005em] [text-shadow:0_1px_6px_rgba(0,0,0,0.55)] ${wordmarkWrap ? "text-[clamp(17px,3.6vw,23px)] min-w-0 whitespace-normal leading-[1.1]" : "text-[clamp(18px,4.4vw,26px)] whitespace-normal sm:whitespace-nowrap leading-[1.12] min-w-0 max-w-full sm:max-w-none"}`}
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
