import { type ReactNode } from "react";

/**
 * FrameWrap + the glazing sheen for the product hero. When a buyer ticks framing
 * and picks a moulding, the print shows INSIDE that frame (no mat); when they
 * pick a glazing the glass reads differently (glossy acrylic vs clean
 * anti-reflective). All update live per selection (Hugo).
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
  "walnut-tray": { face: "#5a4030", light: "#835f48", dark: "#291d13", grain: true },
};

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
          ? // A natural gallery-glass reflection: a soft specular bloom in the
            // top-left corner + a broad, heavily-feathered diagonal light wash
            // fading to clear by the lower-right, over a gentle top-down veil.
            // No hard band — reads like real light on acrylic, not a painted stripe.
            "radial-gradient(135% 100% at 11% 5%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 24%, rgba(255,255,255,0) 48%), " +
            "linear-gradient(117deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.075) 20%, rgba(255,255,255,0.03) 40%, rgba(255,255,255,0.008) 58%, rgba(255,255,255,0) 72%), " +
            "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.008) 55%, rgba(255,255,255,0) 100%)"
          : // anti-reflective: NO glare — the whole point. Just a whisper so it
            // still reads as glazed.
            "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.004) 100%)",
      }}
    />
  );
};

export const FrameWrap = ({
  active,
  frameStyle,
  glazing,
  aspectRatio,
  children,
}: {
  active: boolean;
  frameStyle: string;
  glazing: string;
  aspectRatio: number;
  children: ReactNode;
}) => {
  if (!active) return <>{children}</>;

  const sizerClass =
    "mx-auto block max-w-full max-h-[72svh] lg:max-h-[70svh] 2xl:max-h-[72svh]";

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
          filled print + glazing, so the print's intrinsic size can't push the
          box taller than its aspect-ratio (keeps the frame the exact unframed
          footprint). Tray floats it on a thin dark reveal. */}
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
        <GlazingOverlay glazing={glazing} />
      </div>
    </div>
  );
};
