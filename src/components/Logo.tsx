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
  className?: string;
}

export const Logo = ({ size = 30, wordmark = true, wordmarkWrap = false, className }: LogoProps) => {
  const url = `${import.meta.env.BASE_URL}logo/logo-seal-v6-w256.png`;
  return (
    <div className={`${wordmarkWrap ? "flex w-full" : "inline-flex"} items-center gap-3 leading-none ${className ?? ""}`}>
      {/*
        The Mandala Company wax-seal mark — a deep-red 3D Tudor-rose seal with
        THIN WHITE LINEWORK tracing the rose's petals + centre (v6, 2026-06-28).
        Hugo's brief, refined: "I want a white outline around the red rose mandala
        candle-wax logo but showing details of the rose in thin white so the logo
        doesn't just look like a red circle from a distance" (the v5 outer-ring-
        only keyline was rejected for exactly this — from afar it still read as a
        red disc). The white line-rose is the SAME Tudor-rose art used by the
        cursor (cursor-rose-v2), its baked square tile-box removed (a circular
        DstIn mask) and aligned at 0.97 over the seal — so the petal/centre detail
        reads in thin white at every size and the mark is legible as a ROSE, not a
        blob, on near-black AND the pale peacock/Mary-Pink scroll backdrops. Square
        mark, so width === height. Never display:none'd; the wordmark shows at
        EVERY width (wraps to two lines on the smallest phones — Hugo: "add full
        logo with text on mobile too so it's not just the symbol").
      */}
      <img
        src={url}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        decoding="async"
        className="block shrink-0"
        style={{
          width: size,
          height: size,
          // A single soft depth-shadow lifts the mark; the baked-in white
          // linework now does the "stand out" + "reads as a rose" work, so the
          // old red glow (which would muddy the crisp white lines) is dropped.
          filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.45))",
        }}
      />
      {wordmark && (
        // NAV wordmark sized to MATCH the weight of the deep-red seal beside it
        // (Hugo: the old 16px/normal text read small + un-impactful). In the nav
        // it's bold Fraunces that grows responsively across the screen
        // (clamp 20→28px, opsz 28, semibold). The FOOTER (wordmarkWrap) keeps the
        // original tidy 16px/normal so it still wraps cleanly to two lines inside
        // the narrow brand column — only the header logo gets the big treatment.
        <span
          className={`inline font-display text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.55)] ${wordmarkWrap ? "text-[16px] font-normal tracking-tight min-w-0 whitespace-normal leading-[1.2]" : "text-[clamp(19px,5vw,28px)] font-bold sm:font-semibold tracking-[-0.015em] whitespace-normal sm:whitespace-nowrap leading-[1.08] sm:leading-none max-w-[60vw] sm:max-w-none"}`}
          style={wordmarkWrap ? undefined : { fontVariationSettings: '"opsz" 28' }}
        >
          The Art of Stephen Meakin
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
