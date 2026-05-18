// Hand-crafted SVG of Plato's allegory of the cave — three viewport-widths wide.
// Pans left-to-right under ScrollTrigger control.
//
// Composition (left to right):
//   [0%–25%]  far cave wall + shadows of objects projected by the fire
//   [25%–55%] chained prisoners seated facing the wall + the fire behind them
//   [55%–85%] the unbound figure ascends the rocky path toward the mouth
//   [85%–100%] the figure stands in sunlight at the cave's exit

export const CaveScene = () => (
  <svg
    className="cave-svg"
    viewBox="0 0 3000 1000"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
  >
    <defs>
      {/* Stone gradient that runs across the whole cave */}
      <linearGradient id="stoneBase" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#0a0806" />
        <stop offset="30%" stopColor="#181210" />
        <stop offset="55%" stopColor="#241915" />
        <stop offset="80%" stopColor="#3a2820" />
        <stop offset="100%" stopColor="#7a5a3a" />
      </linearGradient>
      <linearGradient id="stoneCeiling" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#000" />
        <stop offset="100%" stopColor="rgba(0,0,0,0)" />
      </linearGradient>
      <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(0,0,0,0)" />
        <stop offset="100%" stopColor="#000" />
      </linearGradient>
      {/* Fire glow — radial, pulsing in CSS */}
      <radialGradient id="fireGlow" cx="50%" cy="55%" r="60%">
        <stop offset="0%" stopColor="#ffb060" stopOpacity="1" />
        <stop offset="40%" stopColor="#d96a1a" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#1a0a02" stopOpacity="0" />
      </radialGradient>
      {/* Daylight aperture at the cave mouth */}
      <radialGradient id="daylight" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor="#fff6d8" stopOpacity="1" />
        <stop offset="40%" stopColor="#ffe4a0" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#ffe4a0" stopOpacity="0" />
      </radialGradient>
      <filter id="soften" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" />
      </filter>
    </defs>

    {/* base cave fill */}
    <rect width="3000" height="1000" fill="url(#stoneBase)" />
    <rect width="3000" height="280" fill="url(#stoneCeiling)" opacity="0.85" />
    <rect y="720" width="3000" height="280" fill="url(#floor)" opacity="0.85" />

    {/* =================================================================== */}
    {/* SECTION 1: shadow wall (0–900)                                       */}
    {/* =================================================================== */}
    {/* Shadows projected on the wall — silhouettes the prisoners see */}
    <g className="cave-shadows" opacity="0.55">
      {/* tall figure shadow */}
      <path
        d="M 180 760 L 180 380 Q 200 350 220 380 L 220 760 Z"
        fill="#000"
        filter="url(#soften)"
      />
      {/* head */}
      <circle cx="200" cy="350" r="34" fill="#000" filter="url(#soften)" />
      {/* horse-cart silhouette (the carriers' tools, in Plato's text) */}
      <path
        d="M 380 760 L 380 530 L 480 510 L 540 530 L 540 600 L 600 600 L 600 700 L 540 700 L 540 760 Z"
        fill="#000"
        filter="url(#soften)"
      />
      <circle cx="430" cy="760" r="34" fill="#000" filter="url(#soften)" />
      <circle cx="560" cy="760" r="34" fill="#000" filter="url(#soften)" />
      {/* another figure carrying something */}
      <path
        d="M 740 760 L 740 420 L 770 410 L 800 420 L 800 760 Z"
        fill="#000"
        filter="url(#soften)"
      />
      <circle cx="770" cy="395" r="26" fill="#000" filter="url(#soften)" />
      <rect x="800" y="450" width="80" height="20" fill="#000" filter="url(#soften)" />
    </g>

    {/* Cracks in the wall */}
    <g stroke="#000" strokeWidth="1.5" opacity="0.5" fill="none">
      <path d="M 60 200 L 90 350 L 70 480 L 110 620" />
      <path d="M 300 120 L 320 240 L 290 400" />
      <path d="M 650 180 L 670 320 L 640 460 L 680 590" />
    </g>

    {/* =================================================================== */}
    {/* SECTION 2: the fire + prisoners (900–1900)                           */}
    {/* =================================================================== */}
    {/* Fire glow ellipse */}
    <ellipse
      className="cave-fire"
      cx="1450"
      cy="660"
      rx="380"
      ry="280"
      fill="url(#fireGlow)"
    />

    {/* Fire pit + flames */}
    <g transform="translate(1380 600)">
      <ellipse cx="70" cy="120" rx="110" ry="22" fill="#0a0604" />
      <path
        d="M 30 110 Q 40 60 60 80 Q 50 30 80 60 Q 90 20 100 70 Q 120 40 110 100 Z"
        fill="#ffaa3a"
      >
        <animate
          attributeName="d"
          values="M 30 110 Q 40 60 60 80 Q 50 30 80 60 Q 90 20 100 70 Q 120 40 110 100 Z;
                  M 28 110 Q 42 50 64 76 Q 56 22 84 52 Q 88 14 102 64 Q 124 36 112 100 Z;
                  M 30 110 Q 40 60 60 80 Q 50 30 80 60 Q 90 20 100 70 Q 120 40 110 100 Z"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </path>
      <path
        d="M 50 105 Q 60 70 75 85 Q 70 50 90 75 Q 100 65 95 100 Z"
        fill="#fff0c0"
        opacity="0.85"
      >
        <animate
          attributeName="opacity"
          values="0.85;0.65;0.95;0.85"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </path>
    </g>

    {/* Chained prisoners seated facing left toward the wall — visible from behind */}
    <g transform="translate(1100 580)">
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${i * 90} 0)`}>
          {/* body */}
          <path
            d="M 0 200 L 0 90 Q 18 60 36 90 L 36 200 Z"
            fill="#0a0604"
          />
          {/* head */}
          <circle cx="18" cy="60" r="22" fill="#0a0604" />
          {/* chain from neck to floor */}
          <path
            d="M 18 80 Q 8 130 12 200"
            stroke="#3a2820"
            strokeWidth="2"
            fill="none"
            opacity="0.7"
          />
        </g>
      ))}
    </g>

    {/* =================================================================== */}
    {/* SECTION 3: the ascent + climbing figure (1900–2600)                  */}
    {/* =================================================================== */}
    {/* Rocky incline upward */}
    <path
      d="M 1900 800 L 2100 720 L 2280 620 L 2450 500 L 2620 380 L 2780 280 L 2900 220 L 3000 200 L 3000 1000 L 1900 1000 Z"
      fill="#1a1310"
    />
    <path
      d="M 1900 800 L 2100 720 L 2280 620 L 2450 500 L 2620 380 L 2780 280 L 2900 220"
      stroke="#2a1f18"
      strokeWidth="3"
      fill="none"
    />

    {/* Climbing figure — silhouette against the rising daylight */}
    <g transform="translate(2380 470)">
      {/* body */}
      <path d="M 0 100 L 0 30 Q 14 8 28 30 L 28 100 Z" fill="#1a1108" />
      {/* head */}
      <circle cx="14" cy="14" r="14" fill="#1a1108" />
      {/* arm reaching up */}
      <path
        d="M 24 40 L 50 12 L 56 0"
        stroke="#1a1108"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      {/* leg stepping */}
      <path
        d="M 8 100 L 0 145"
        stroke="#1a1108"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 22 100 L 32 140"
        stroke="#1a1108"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
    </g>

    {/* =================================================================== */}
    {/* SECTION 4: the cave mouth + daylight + figure in sunlight (2600–)   */}
    {/* =================================================================== */}
    <ellipse cx="2900" cy="180" rx="280" ry="220" fill="url(#daylight)" />

    {/* The freed figure, small at the very top of the climb */}
    <g transform="translate(2870 80)">
      <path d="M 0 100 L 0 30 Q 14 8 28 30 L 28 100 Z" fill="#ffe5a8" opacity="0.85" />
      <circle cx="14" cy="14" r="14" fill="#fff2c8" opacity="0.85" />
      {/* halo / sunlight aura */}
      <circle cx="14" cy="50" r="80" fill="none" stroke="#fff6d8" strokeWidth="0.5" opacity="0.4" />
    </g>

    {/* Vignette overlay — heavy at edges */}
    <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
      <stop offset="60%" stopColor="rgba(0,0,0,0)" />
      <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
    </radialGradient>
    <rect width="3000" height="1000" fill="url(#vignette)" pointerEvents="none" />
  </svg>
);
