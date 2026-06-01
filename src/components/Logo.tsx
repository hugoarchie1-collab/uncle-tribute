import { Link } from "react-router-dom";

interface LogoProps {
  size?: number;
  wordmark?: boolean;
  className?: string;
}

export const Logo = ({ size = 30, wordmark = true, className }: LogoProps) => {
  const url = `${import.meta.env.BASE_URL}logo/logo-emblem.svg`;
  return (
    <div className={`inline-flex items-center gap-3 leading-none ${className ?? ""}`}>
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
        style={{ width: size, height: size * (188.95 / 200) }}
      />
      {wordmark && (
        <span className="hidden sm:inline font-display text-[16px] font-normal tracking-tight text-ink whitespace-nowrap">
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
