// Inline SVG rosette + wordmark. Drop in a real high-res logo later by
// replacing this component or accepting `<img>` here instead.

interface LogoProps {
  size?: number;
  wordmark?: boolean;
  light?: boolean;
}

export const Logo = ({ size = 32, wordmark = true, light = false }: LogoProps) => {
  const stroke = light ? "#f5f1e8" : "#1a1612";

  return (
    <div className="logo" style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        stroke={stroke}
        strokeWidth="0.9"
        aria-hidden="true"
      >
        {/* Eight-petal Tudor-rose / rosette inspired by the Meakin mark.
            Concentric geometry built from circles and a star. */}
        <circle cx="50" cy="50" r="46" />
        <circle cx="50" cy="50" r="36" />
        <circle cx="50" cy="50" r="22" />
        <circle cx="50" cy="50" r="6" />
        {[...Array(8)].map((_, i) => {
          const a = (i * 360) / 8;
          return (
            <g key={i} transform={`rotate(${a} 50 50)`}>
              <path d="M 50 14 C 56 26, 56 38, 50 50 C 44 38, 44 26, 50 14 Z" />
              <line x1="50" y1="4" x2="50" y2="14" />
            </g>
          );
        })}
        {[...Array(16)].map((_, i) => {
          const a = (i * 360) / 16 + 11.25;
          return (
            <line
              key={`r-${i}`}
              x1="50"
              y1="50"
              x2="50"
              y2="6"
              transform={`rotate(${a} 50 50)`}
              opacity="0.35"
            />
          );
        })}
      </svg>
      {wordmark && (
        <span
          className="logo-wordmark"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 16,
            letterSpacing: "0.05em",
            color: stroke,
            whiteSpace: "nowrap",
          }}
        >
          The Art of Stephen Meakin
        </span>
      )}
    </div>
  );
};
