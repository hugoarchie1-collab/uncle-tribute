import { type ReactNode } from "react";

/**
 * FrameWrap + the two print FINISHES (glazing sheen + Polly's hand-embellishment)
 * for the product hero. When a buyer ticks framing and picks a moulding, the
 * print shows INSIDE that frame (no mat); when they pick a glazing the glass
 * reads differently (glossy acrylic vs clean anti-reflective); when they tick
 * "hand-finished by Polly Wedge" the print gains symmetrically-placed sequins +
 * fine dots of paint on the detail. All update live per selection (Hugo).
 *
 * ⚠️ SIZE INVARIANT (Hugo): the framed preview occupies the SAME footprint as the
 * unframed print — the moulding is drawn INSIDE the box (box-sizing: border-box +
 * padding), so the PRINT shrinks to make room and the outer size never changes.
 * The outer takes the print's aspect-ratio + the same max-height caps the bare
 * <img> used; the media is absolutely-filled so its intrinsic size can't push the
 * box past its aspect-ratio.
 *
 * Moulding look (as close to a real solid-wood / painted frame as CSS allows,
 * no per-combo asset): a diagonal light→dark bevelled face; wood styles carry a
 * faint vertical grain; a crisp dark outer edge + a faint light keyline so a dark
 * frame separates from the near-black wall; an inset rebate shadow recesses the
 * print; a drop-shadow floats it off the wall; the walnut TRAY adds its dark float.
 */
type FrameMeta = { face: string; light: string; dark: string; grain?: boolean; tray?: boolean };

// Keyed to FRAME_STYLES ids in paintings.ts.
const FRAME_META: Record<string, FrameMeta> = {
  // stained-black is a charcoal, NOT pure black — a true-black face disappears
  // into the near-black page wall (#0a0908). Lifted face + a bright lit bevel
  // edge keep it clearly readable as a frame.
  "natural-oak": { face: "#c9a368", light: "#e7ca95", dark: "#7f5f34", grain: true },
  "stained-black": { face: "#2b2824", light: "#565049", dark: "#070605" },
  white: { face: "#ece7df", light: "#ffffff", dark: "#bdb7ab" },
  "walnut-tray": { face: "#5a4030", light: "#835f48", dark: "#291d13", grain: true, tray: true },
};

/* ── Polly's hand-embellishment ─────────────────────────────────────────────
 * Sequins are placed on concentric rings at even angular steps so the pattern
 * is radially symmetric across the mandala (as Polly applies them by hand); the
 * finer "paint dots" sit on tighter rings, catching the detail. Three subtly
 * iridescent sequin tints are cycled so each disc catches light a little
 * differently ("uniquely and individually", Hugo) while the placement stays
 * perfectly symmetric. Rendered in a 100×100 viewBox centred on the mandala. */
const pt = (r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
};
const ring = (r: number, n: number, off: number, size: number) =>
  Array.from({ length: n }, (_, i) => {
    const [cx, cy] = pt(r, off + (360 / n) * i);
    return { cx, cy, size, i };
  });

const SEQUINS = [
  ...ring(45, 12, 0, 2.7),
  ...ring(37, 12, 15, 2.3),
  ...ring(28.5, 8, 0, 2.7),
  ...ring(19, 8, 22.5, 2.2),
  { cx: 50, cy: 50, size: 2.9, i: 0 }, // centre stone
];
const PAINT_DOTS = [
  ...ring(41, 24, 7.5, 0.95),
  ...ring(33, 24, 0, 0.85),
  ...ring(23.5, 16, 11.25, 0.95),
  ...ring(13, 12, 0, 0.8),
];
const SEQUIN_TINTS = ["url(#seqGold)", "url(#seqRose)", "url(#seqPearl)"];

export const EmbellishmentOverlay = () => (
  <svg
    className="pointer-events-none absolute inset-0 h-full w-full"
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="seqGold" cx="0.35" cy="0.32" r="0.75">
        <stop offset="0" stopColor="#fffdf5" />
        <stop offset="0.35" stopColor="#f4dfa0" />
        <stop offset="0.7" stopColor="#d9a94e" />
        <stop offset="1" stopColor="#8a6a2c" />
      </radialGradient>
      <radialGradient id="seqRose" cx="0.35" cy="0.32" r="0.75">
        <stop offset="0" stopColor="#fff6f2" />
        <stop offset="0.4" stopColor="#f3cdc0" />
        <stop offset="0.7" stopColor="#d98f86" />
        <stop offset="1" stopColor="#9c5a52" />
      </radialGradient>
      <radialGradient id="seqPearl" cx="0.35" cy="0.32" r="0.75">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.4" stopColor="#eef1f4" />
        <stop offset="0.7" stopColor="#cfd6dd" />
        <stop offset="1" stopColor="#9aa4ad" />
      </radialGradient>
      <radialGradient id="paintGold" cx="0.35" cy="0.32" r="0.8">
        <stop offset="0" stopColor="#ffe9b0" />
        <stop offset="0.5" stopColor="#e6b85a" />
        <stop offset="1" stopColor="#a8792e" />
      </radialGradient>
    </defs>

    {/* fine dots of paint on the detail — raised gold droplets */}
    <g style={{ filter: "drop-shadow(0 0.3px 0.35px rgba(0,0,0,0.4))" }}>
      {PAINT_DOTS.map((d, k) => (
        <g key={`p${k}`}>
          <circle cx={d.cx} cy={d.cy} r={d.size} fill="url(#paintGold)" />
          <circle cx={d.cx - d.size * 0.3} cy={d.cy - d.size * 0.35} r={d.size * 0.34} fill="#fffbe9" opacity={0.85} />
        </g>
      ))}
    </g>

    {/* sequins — individually placed, symmetric, each catching light */}
    <g style={{ filter: "drop-shadow(0 0.5px 0.6px rgba(0,0,0,0.5))" }}>
      {SEQUINS.map((s, k) => (
        <g key={`s${k}`} opacity={0.96}>
          <circle
            cx={s.cx}
            cy={s.cy}
            r={s.size}
            fill={SEQUIN_TINTS[k % SEQUIN_TINTS.length]}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth={0.25}
          />
          {/* pin-prick specular highlight */}
          <circle cx={s.cx - s.size * 0.34} cy={s.cy - s.size * 0.4} r={s.size * 0.3} fill="#ffffff" opacity={0.85} />
        </g>
      ))}
    </g>
  </svg>
);

/* ── Glazing ────────────────────────────────────────────────────────────────
 * Art acrylic: a real, visible glass glare — a diagonal reflection band + a
 * top-left window highlight (mix-blend screen, like light bouncing off glass).
 * Anti-reflective (museum): near-invisible, NO streak — the whole point of the
 * upgrade — just the faintest even veil so it still reads as glazed. Showing the
 * two side by side makes the difference obvious (Hugo). */
export const GlazingOverlay = ({ glazing }: { glazing: string }) => {
  const acrylic = glazing !== "museum-glass"; // default (art-acrylic) is the glossy one
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        mixBlendMode: "screen",
        background: acrylic
          ? // a defined diagonal reflection band (a bright "window glare" streak)
            // + a strong top-left corner highlight — obviously glossy glass.
            "linear-gradient(122deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.24) 33%, rgba(255,255,255,0.34) 39%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0) 57%, rgba(255,255,255,0) 82%, rgba(255,255,255,0.10) 94%, rgba(255,255,255,0.16) 100%), radial-gradient(150% 120% at 10% 4%, rgba(255,255,255,0.26), rgba(255,255,255,0) 42%)"
          : // anti-reflective: NO glare — the whole point. Just a whisper so it
            // still reads as glazed.
            "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.004) 100%)",
      }}
    />
  );
};

export const FrameWrap = ({
  active,
  frameStyle,
  glazing,
  embellished,
  aspectRatio,
  children,
}: {
  active: boolean;
  frameStyle: string;
  glazing: string;
  embellished: boolean;
  aspectRatio: number;
  children: ReactNode;
}) => {
  // No finish at all → the bare print, byte-for-byte untouched.
  if (!active && !embellished) return <>{children}</>;

  // The finish overlays that sit OVER the print surface (sequins) and in FRONT
  // of it (glass). Order: print → embellishment (on the paper) → glazing (glass).
  const overlays = (
    <>
      {embellished && <EmbellishmentOverlay />}
      {active && <GlazingOverlay glazing={glazing} />}
    </>
  );

  const sizerClass =
    "mx-auto block max-w-full max-h-[80vh] lg:max-h-[calc(100vh-72px-2rem)] 2xl:max-h-[86vh]";

  // Embellished but UNFRAMED — a plain print box (same aspect + caps as the bare
  // <img>), print absolutely filled, sequins over it. No moulding, no glass.
  if (!active) {
    return (
      <div
        className={`relative overflow-hidden ${sizerClass}`}
        style={{ aspectRatio: String(aspectRatio || 1), boxSizing: "border-box" }}
      >
        {children}
        {overlays}
      </div>
    );
  }

  // FRAMED (optionally also embellished/glazed).
  const m = FRAME_META[frameStyle] ?? FRAME_META["natural-oak"];
  const moulding = "clamp(15px, 2.6vw, 40px)";
  const grain = m.grain
    ? "repeating-linear-gradient(93deg, rgba(0,0,0,0.055) 0 1px, rgba(255,255,255,0.045) 1px 2px, rgba(0,0,0,0) 2px 6px), "
    : "";
  return (
    <div
      className={sizerClass}
      style={{
        aspectRatio: String(aspectRatio || 1),
        boxSizing: "border-box",
        padding: moulding,
        background: `${grain}linear-gradient(135deg, ${m.light} 0%, ${m.face} 45%, ${m.dark} 100%)`,
        boxShadow:
          // faint light outer keyline first — separates a dark frame from the
          // near-black wall; drop-shadow (invisible on black bg) for depth on
          // light walls; then the bevel: crisp inner edge + lit top-left / shaded
          // bottom-right.
          "0 0 0 1.5px rgba(237,230,214,0.14), 0 30px 58px rgba(0,0,0,0.55), " +
          `inset 0 0 0 1px ${m.dark}, ` +
          "inset 3px 3px 4px rgba(255,255,255,0.28), inset -4px -4px 8px rgba(0,0,0,0.55)",
        borderRadius: "2px",
      }}
    >
      {/* Rebate — the print recessed into the frame (no mat). `relative` +
          `overflow-hidden` make it the positioning context for the absolutely-
          filled print + finish overlays, so the print's intrinsic size can't
          push the box taller than its aspect-ratio (keeps the frame the exact
          unframed footprint). Tray floats it on a thin dark reveal. */}
      <div
        className="relative w-full h-full overflow-hidden"
        style={{
          boxSizing: "border-box",
          background: m.tray ? "#0b0a09" : undefined,
          padding: m.tray ? "clamp(6px, 1.5vw, 18px)" : undefined,
          boxShadow:
            "inset 0 3px 8px rgba(0,0,0,0.62), inset 0 -1px 3px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,0,0,0.55)",
        }}
      >
        {children}
        {overlays}
      </div>
    </div>
  );
};
