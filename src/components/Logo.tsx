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
  const url = `${import.meta.env.BASE_URL}logo/logo-seal-v3-w256.png`;
  return (
    <div className={`${wordmarkWrap ? "flex w-full" : "inline-flex"} items-center gap-3 leading-none ${className ?? ""}`}>
      {/*
        The Mandala Company wax-seal mark — a deep-red 3D Tudor-rose seal,
        rendered as a transparent PNG (the pure-black source background was
        keyed out with a feathered alpha so the soft seal edges dissolve onto
        any ground). Shown in its TRUE deep red — no white-forcing filter: the
        dark tone reads on the pale peacock/Mary-Pink scroll backdrops, and the
        soft warm glow below lifts it off the near-black sections. Square mark,
        so width === height. Never display:none'd; the wordmark now shows at
        EVERY width (it wraps to two lines on the smallest phones — Hugo: "add
        full logo with text on mobile too so it's not just the symbol").
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
          filter:
            "drop-shadow(0 1px 3px rgba(0,0,0,0.5)) drop-shadow(0 0 7px rgba(150,28,28,0.4))",
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
          className={`inline font-display text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.55)] ${wordmarkWrap ? "text-[16px] font-normal tracking-tight min-w-0 whitespace-normal leading-[1.2]" : "text-[clamp(15px,4vw,28px)] font-semibold tracking-[-0.015em] whitespace-normal sm:whitespace-nowrap leading-[1.1] sm:leading-none max-w-[44vw] sm:max-w-none"}`}
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
