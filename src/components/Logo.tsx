import { Link } from "react-router-dom";

interface LogoProps {
  size?: number;
  wordmark?: boolean;
  className?: string;
}

/**
 * The Art of Stephen Meakin — heraldic rose emblem + wordmark.
 *
 * Uses the traced Tudor-rose SVG from /public/logo/. The colour is set by
 * the parent's `color` CSS property (the SVG uses `currentColor`).
 *
 * The wordmark is rendered as text rather than inlined SVG so it can be
 * selected, copied, and resized cleanly on every device.
 */
export const Logo = ({ size = 32, wordmark = true, className }: LogoProps) => (
  <div
    className={`logo${className ? " " + className : ""}`}
    style={{ display: "inline-flex", alignItems: "center", gap: 14, lineHeight: 1 }}
  >
    <img
      src={`${import.meta.env.BASE_URL}logo/logo-emblem.svg`}
      alt=""
      width={size}
      height={size * (188.95 / 200)}
      style={{ display: "block" }}
    />
    {wordmark && (
      <span className="logo-wordmark">The Art of Stephen Meakin</span>
    )}
  </div>
);

/** Brand link to home — wraps the logo with a Link to "/". */
export const LogoLink = ({ size = 32, wordmark = true }: LogoProps) => (
  <Link to="/" aria-label="The Art of Stephen Meakin — home" style={{ display: "inline-flex" }}>
    <Logo size={size} wordmark={wordmark} />
  </Link>
);
