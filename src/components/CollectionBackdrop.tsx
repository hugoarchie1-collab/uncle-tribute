// Atmospheric backdrops for each of the three collections.
// Earth → Water → Sky. Hand-drawn SVG layers + CSS.
//
// To swap in a real photograph, drop a JPG at:
//   /public/img/scenes/habundia.jpg       (Habundia, ancient British woodland)
//   /public/img/scenes/genesis.jpg        (Genesis, bioluminescent ocean)
//   /public/img/scenes/born-in-the-sky.jpg (Born in the Sky, Milky Way)
//
// Set the `photo` prop or update the Collection data — the component prefers
// the photo when one exists and falls back to the SVG scene otherwise.

import type { Collection } from "../data/paintings";

interface BackdropProps {
  collectionId: Collection["id"];
  photoUrl?: string;
}

export const CollectionBackdrop = ({ collectionId, photoUrl }: BackdropProps) => {
  if (photoUrl) {
    return (
      <div
        className="collection-backdrop collection-backdrop--photo"
        style={{ backgroundImage: `url("${photoUrl}")` }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={`collection-backdrop collection-backdrop--${collectionId}`} aria-hidden="true">
      {collectionId === "habundia" && <HabundiaScene />}
      {collectionId === "genesis" && <GenesisScene />}
      {collectionId === "born-in-the-sky" && <SkyScene />}
    </div>
  );
};

// =============================================================================
// HABUNDIA — Ancient British woodland, gold light shafts, mist
// =============================================================================
const HabundiaScene = () => (
  <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="scene">
    <defs>
      <linearGradient id="hab-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3d5a2c" />
        <stop offset="40%" stopColor="#5d7a3c" />
        <stop offset="80%" stopColor="#2a3a18" />
        <stop offset="100%" stopColor="#1a2410" />
      </linearGradient>
      <radialGradient id="hab-sun" cx="55%" cy="20%" r="50%">
        <stop offset="0%" stopColor="#fff5c4" stopOpacity="0.85" />
        <stop offset="50%" stopColor="#f8d97a" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#f8d97a" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="hab-shaft" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255, 235, 160, 0.45)" />
        <stop offset="100%" stopColor="rgba(255, 235, 160, 0)" />
      </linearGradient>
      <linearGradient id="hab-mist" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(180, 200, 170, 0)" />
        <stop offset="100%" stopColor="rgba(180, 200, 170, 0.6)" />
      </linearGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#hab-sky)" />
    <rect width="1600" height="900" fill="url(#hab-sun)" />

    {/* Distant tree silhouettes */}
    {[120, 280, 440, 600, 760, 920, 1080, 1240, 1400].map((x, i) => (
      <g key={`far-${i}`} opacity={0.55}>
        <rect x={x} y={250 - (i % 3) * 20} width="6" height="500" fill="#1a2410" />
        <ellipse cx={x + 3} cy={260} rx={45 + (i % 3) * 8} ry={80 + (i % 2) * 12} fill="#2a3a18" opacity={0.7} />
      </g>
    ))}

    {/* Light shafts through canopy */}
    {[
      { x: 280, w: 100, skew: -8 },
      { x: 540, w: 140, skew: -4 },
      { x: 800, w: 90, skew: 2 },
      { x: 1080, w: 130, skew: 6 },
      { x: 1320, w: 100, skew: 10 },
    ].map((shaft, i) => (
      <polygon
        key={`shaft-${i}`}
        points={`${shaft.x},0 ${shaft.x + shaft.w},0 ${shaft.x + shaft.w + shaft.skew + 30},900 ${shaft.x + shaft.skew - 30},900`}
        fill="url(#hab-shaft)"
        opacity={0.7 - i * 0.08}
      />
    ))}

    {/* Foreground trees */}
    {[60, 220, 380, 540, 780, 1020, 1240, 1480].map((x, i) => (
      <g key={`near-${i}`}>
        <rect x={x} y={300} width={14 + (i % 3) * 4} height="600" fill="#0e1808" />
        <ellipse cx={x + 7} cy={320} rx={70 + (i % 3) * 18} ry={130 + (i % 2) * 20} fill="#162410" opacity={0.95} />
      </g>
    ))}

    {/* Bluebell carpet — mist of indigo at base */}
    <ellipse cx="800" cy="850" rx="900" ry="100" fill="rgba(80, 90, 160, 0.45)" />
    <ellipse cx="800" cy="880" rx="1000" ry="80" fill="rgba(110, 120, 180, 0.55)" />

    {/* Ground mist */}
    <rect y="600" width="1600" height="300" fill="url(#hab-mist)" />
  </svg>
);

// =============================================================================
// GENESIS — Bioluminescent ocean, electric teal/cyan blooms
// =============================================================================
const GenesisScene = () => (
  <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="scene">
    <defs>
      <radialGradient id="gen-deep" cx="50%" cy="60%" r="80%">
        <stop offset="0%" stopColor="#0a2a4a" />
        <stop offset="60%" stopColor="#040c1a" />
        <stop offset="100%" stopColor="#000409" />
      </radialGradient>
      <radialGradient id="gen-bloom" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#5be8d0" stopOpacity="0.85" />
        <stop offset="30%" stopColor="#1aa0c8" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#0a2a4a" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="gen-bloom-blue" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#7ac4ff" stopOpacity="0.85" />
        <stop offset="30%" stopColor="#2a78d0" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#0a2a4a" stopOpacity="0" />
      </radialGradient>
      <filter id="gen-blur"><feGaussianBlur stdDeviation="14" /></filter>
    </defs>
    <rect width="1600" height="900" fill="url(#gen-deep)" />

    {/* Large soft blooms */}
    <circle cx="380" cy="380" r="240" fill="url(#gen-bloom)" />
    <circle cx="1180" cy="540" r="280" fill="url(#gen-bloom-blue)" />
    <circle cx="780" cy="280" r="160" fill="url(#gen-bloom)" opacity="0.7" />
    <circle cx="200" cy="700" r="180" fill="url(#gen-bloom-blue)" opacity="0.6" />
    <circle cx="1400" cy="200" r="120" fill="url(#gen-bloom)" opacity="0.55" />

    {/* Wave ripples — organic curves of glowing light */}
    <g filter="url(#gen-blur)" opacity="0.7">
      <path
        d="M 0 500 Q 200 460 400 500 T 800 510 T 1200 490 T 1600 500 L 1600 540 Q 1400 580 1200 540 T 800 540 T 400 540 T 0 540 Z"
        fill="#3acbd0"
        opacity="0.4"
      />
      <path
        d="M 0 620 Q 250 580 500 620 T 1000 625 T 1500 605 L 1600 620 L 1600 660 Q 1300 700 1000 660 T 500 660 T 0 660 Z"
        fill="#4aa8e0"
        opacity="0.35"
      />
    </g>

    {/* Tiny plankton speckle */}
    {[...Array(40)].map((_, i) => {
      const cx = (i * 137) % 1600;
      const cy = (i * 211) % 900;
      const r = 1.4 + (i % 3) * 0.6;
      return <circle key={i} cx={cx} cy={cy} r={r} fill="#a8f8ee" opacity={0.55} />;
    })}

    {/* Surface reflection sliver */}
    <ellipse cx="800" cy="0" rx="1000" ry="80" fill="rgba(100, 200, 220, 0.18)" />
  </svg>
);

// =============================================================================
// BORN IN THE SKY — Milky Way arc, deep indigo, dense star field
// =============================================================================
const SkyScene = () => (
  <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="scene">
    <defs>
      <linearGradient id="sky-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0a0822" />
        <stop offset="50%" stopColor="#160c2a" />
        <stop offset="100%" stopColor="#1a1010" />
      </linearGradient>
      <radialGradient id="milky-core" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stopColor="rgba(220, 200, 240, 0.7)" />
        <stop offset="30%" stopColor="rgba(160, 130, 200, 0.45)" />
        <stop offset="60%" stopColor="rgba(80, 60, 140, 0.25)" />
        <stop offset="100%" stopColor="rgba(30, 20, 60, 0)" />
      </radialGradient>
      <filter id="sky-blur"><feGaussianBlur stdDeviation="22" /></filter>
    </defs>
    <rect width="1600" height="900" fill="url(#sky-bg)" />

    {/* Milky Way arc — a curved band of glowing nebula */}
    <g transform="translate(0 -100) rotate(-12 800 450)">
      <ellipse cx="800" cy="350" rx="1100" ry="120" fill="url(#milky-core)" filter="url(#sky-blur)" />
      <ellipse cx="800" cy="350" rx="900" ry="60" fill="rgba(220, 180, 240, 0.35)" filter="url(#sky-blur)" />
      <ellipse cx="600" cy="370" rx="180" ry="80" fill="rgba(255, 180, 200, 0.25)" filter="url(#sky-blur)" />
      <ellipse cx="1000" cy="340" rx="220" ry="90" fill="rgba(180, 220, 255, 0.22)" filter="url(#sky-blur)" />
    </g>

    {/* Dense star field — three layers of varied size + brightness */}
    {[...Array(200)].map((_, i) => {
      const cx = (i * 73 + 11) % 1600;
      const cy = (i * 109 + 17) % 900;
      const r = 0.4 + (i % 7 === 0 ? 1.2 : 0.3);
      const op = 0.3 + (i % 5) * 0.14;
      return <circle key={i} cx={cx} cy={cy} r={r} fill="#fff" opacity={op} />;
    })}
    {/* Brighter named-feeling stars */}
    {[
      { cx: 240, cy: 200 },
      { cx: 1320, cy: 180 },
      { cx: 480, cy: 540 },
      { cx: 1120, cy: 620 },
      { cx: 800, cy: 760 },
      { cx: 1480, cy: 480 },
    ].map((s, i) => (
      <g key={`bright-${i}`}>
        <circle cx={s.cx} cy={s.cy} r="2.4" fill="#fff" />
        <circle cx={s.cx} cy={s.cy} r="8" fill="#fff" opacity="0.18" />
      </g>
    ))}

    {/* Faint horizon line */}
    <rect y="820" width="1600" height="80" fill="rgba(0,0,0,0.55)" />
  </svg>
);
