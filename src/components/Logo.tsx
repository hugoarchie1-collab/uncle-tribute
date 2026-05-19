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
      <span
        aria-hidden="true"
        className="block bg-ink"
        style={{
          width: size,
          height: size * (188.95 / 200),
          WebkitMaskImage: `url(${url})`,
          maskImage: `url(${url})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
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
