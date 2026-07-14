import { type ReactNode } from "react";

/**
 * FrameWrap — a live, CSS-rendered framed preview for the product hero. When a
 * buyer ticks framing and picks a moulding, the print is shown INSIDE that frame,
 * updating per selection (Hugo). NO white mount/mat — the moulding sits directly
 * on the print edge, print recessed in the rebate, the way Point 101 frames it.
 *
 * ⚠️ SIZE INVARIANT (Hugo): the framed preview occupies the SAME footprint as the
 * unframed print — the moulding is drawn INSIDE the box (box-sizing: border-box +
 * padding), so the PRINT shrinks to make room and the outer size never changes.
 * The outer takes the print's aspect-ratio + the same max-height caps the bare
 * <img> used, so bare↔framed swap keeps the hero the exact same size.
 *
 * Moulding look (as close to a real solid-wood / painted frame as CSS allows,
 * no per-combo asset): a diagonal light→dark gradient = a lit top-left / shadowed
 * bottom-right bevelled face; wood styles carry a faint vertical grain; a crisp
 * dark outer edge; an inset rebate shadow recesses the print; a drop-shadow floats
 * it off the wall; the walnut TRAY style adds its signature dark float reveal.
 */
type FrameMeta = { face: string; light: string; dark: string; grain?: boolean; tray?: boolean };

// Keyed to FRAME_STYLES ids in paintings.ts.
const FRAME_META: Record<string, FrameMeta> = {
  "natural-oak": { face: "#c9a368", light: "#e7ca95", dark: "#7f5f34", grain: true },
  "stained-black": { face: "#1b1917", light: "#34302a", dark: "#040302" },
  white: { face: "#ece7df", light: "#ffffff", dark: "#bdb7ab" },
  "walnut-tray": { face: "#5a4030", light: "#835f48", dark: "#291d13", grain: true, tray: true },
};

export const FrameWrap = ({
  active,
  frameStyle,
  aspectRatio,
  children,
}: {
  active: boolean;
  frameStyle: string;
  aspectRatio: number;
  children: ReactNode;
}) => {
  if (!active) return <>{children}</>;
  const m = FRAME_META[frameStyle] ?? FRAME_META["natural-oak"];
  const moulding = "clamp(15px, 2.6vw, 40px)";
  const grain = m.grain
    ? "repeating-linear-gradient(93deg, rgba(0,0,0,0.055) 0 1px, rgba(255,255,255,0.045) 1px 2px, rgba(0,0,0,0) 2px 6px), "
    : "";
  return (
    <div
      className="mx-auto block max-w-full max-h-[80vh] lg:max-h-[calc(100vh-72px-2rem)] 2xl:max-h-[86vh]"
      style={{
        aspectRatio: String(aspectRatio || 1),
        boxSizing: "border-box",
        padding: moulding,
        background: `${grain}linear-gradient(135deg, ${m.light} 0%, ${m.face} 45%, ${m.dark} 100%)`,
        boxShadow:
          `0 30px 58px rgba(0,0,0,0.55), inset 0 0 0 1px ${m.dark}, ` +
          "inset 2px 2px 3px rgba(255,255,255,0.22), inset -3px -3px 7px rgba(0,0,0,0.5)",
        borderRadius: "2px",
      }}
    >
      {/* Rebate — the print recessed into the frame (no mat). Tray floats it on a
          thin dark reveal. `relative` + `overflow-hidden` make it the positioning
          context for the absolutely-filled print, so the print's intrinsic size
          can't push the box taller than its aspect-ratio (keeps the frame the
          exact unframed footprint). */}
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
      </div>
    </div>
  );
};
