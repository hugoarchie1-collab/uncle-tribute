import { Link } from "react-router-dom";

interface LogoProps {
  size?: number;
  wordmark?: boolean;
  /** Show the wordmark even on the smallest screens (used in the footer, where
   *  the brand column is full-width — avoids an orphaned emblem on phones). */
  wordmarkAlwaysOn?: boolean;
  /** Let the wordmark WRAP within its container instead of forcing one line.
   *  Used in the footer 4-col grid, where the column gets narrower than the
   *  one-line wordmark below ~1400px and the nowrap text spilled into the
   *  next ("SITE") column. With this on, the brand box fills its column and
   *  the wordmark breaks cleanly to two lines rather than overlapping. */
  wordmarkWrap?: boolean;
  className?: string;
}

export const Logo = ({ size = 30, wordmark = true, wordmarkAlwaysOn = false, wordmarkWrap = false, className }: LogoProps) => {
  const url = `${import.meta.env.BASE_URL}logo/logo-emblem.svg`;
  return (
    <div className={`${wordmarkWrap ? "flex w-full" : "inline-flex"} items-center gap-3 leading-none ${className ?? ""}`}>
      {/*
        The emblem is a plain <img> of an SVG whose own `fill` is the cream ink
        (#ede6d6). Earlier this was a `bg-ink` <span> shaped by `mask-image` of
        the SVG — but WebKit/iOS Safari resolves the mask SVG's `currentColor`
        against the (transparent) mask resource context, so the mask went fully
        transparent and the emblem VANISHED on iPhone/iPad while rendering fine
        on desktop Chromium. Rendering the SVG directly sidesteps that whole
        mask bug class and is identical across engines. The mark must stay
        visible at every width (it is never display:none'd); only the wordmark
        beside it hides on the smallest screens.
      */}
      <img
        src={url}
        alt=""
        aria-hidden="true"
        width={size}
        height={Math.round(size * (188.95 / 200))}
        decoding="async"
        className="block shrink-0"
        style={{
          width: size,
          height: size * (188.95 / 200),
          // Force the emblem to pure WHITE + a soft shadow so it stays legible
          // on every backdrop across the site — the dark sections AND the pale
          // areas of the peacock / Mary-Pink scroll backdrops. brightness(0)
          // invert(1) maps the SVG's cream fill to white regardless of source.
          filter:
            "brightness(0) invert(1) drop-shadow(0 1px 3px rgba(0,0,0,0.45))",
        }}
      />
      {wordmark && (
        <span className={`${wordmarkAlwaysOn ? "inline" : "hidden sm:inline"} font-display text-[16px] font-normal tracking-tight text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.55)] ${wordmarkWrap ? "min-w-0 whitespace-normal leading-[1.2]" : "whitespace-nowrap leading-none"}`}>
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
