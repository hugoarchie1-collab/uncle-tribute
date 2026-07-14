import { type ReactNode } from "react";

/**
 * FrameWrap — a live, CSS-rendered framed preview for the product hero. When a
 * buyer ticks framing and picks a moulding, the print is shown INSIDE that frame,
 * updating per selection (Hugo). NO white mount/mat — the moulding sits directly
 * on the print edge, the way Point 101 frames it (print recessed in the rebate).
 *
 * The moulding is drawn purely in CSS so it's instant and needs no per-combo
 * asset: a diagonal light→dark gradient in the frame's own colour gives the
 * bevelled solid-wood/painted face; layered inset shadows read as the lit top-left
 * edge + shadowed bottom-right; an inner inset shadow recesses the print into the
 * rebate; a drop-shadow floats the whole frame off the wall. The walnut TRAY style
 * adds a thin dark float gap (its signature look). Reduced-motion-safe (static).
 */
type FrameMeta = { face: string; light: string; dark: string; tray?: boolean };

// Keyed to FRAME_STYLES ids in paintings.ts. light/dark are the bevel highlight +
// shadow tones derived from each swatch.
const FRAME_META: Record<string, FrameMeta> = {
  "natural-oak": { face: "#c9a368", light: "#e6c893", dark: "#8a6837" },
  "stained-black": { face: "#1c1a18", light: "#3a352f", dark: "#050403" },
  white: { face: "#ece7df", light: "#ffffff", dark: "#c2bcb0" },
  "walnut-tray": { face: "#5a4030", light: "#82604a", dark: "#2e2015", tray: true },
};

export const FrameWrap = ({
  active,
  frameStyle,
  children,
}: {
  active: boolean;
  frameStyle: string;
  children: ReactNode;
}) => {
  if (!active) return <>{children}</>;
  const m = FRAME_META[frameStyle] ?? FRAME_META["natural-oak"];
  const moulding = "clamp(16px, 2.7vw, 42px)";
  return (
    <div
      className="mx-auto w-fit max-w-full"
      style={{ filter: "drop-shadow(0 30px 58px rgba(0,0,0,0.55))" }}
    >
      {/* MOULDING — the frame face: diagonal light→dark gradient (bevel) in the
          frame's colour, with a lit top-left / shadowed bottom-right edge. */}
      <div
        style={{
          padding: moulding,
          background: `linear-gradient(135deg, ${m.light} 0%, ${m.face} 46%, ${m.dark} 100%)`,
          boxShadow: `inset 0 0 0 1px ${m.dark}, inset 3px 3px 4px rgba(255,255,255,0.18), inset -3px -3px 6px rgba(0,0,0,0.45)`,
          borderRadius: "2px",
        }}
      >
        {/* REBATE — the print recessed into the frame. The tray style floats the
            print on a thin dark reveal; every style recesses it with an inset
            shadow. NO mat. */}
        <div
          style={{
            background: m.tray ? "#0b0a09" : undefined,
            padding: m.tray ? "clamp(7px, 1.6vw, 20px)" : undefined,
            boxShadow:
              "inset 0 3px 8px rgba(0,0,0,0.6), inset 0 -1px 3px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,0,0,0.55)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
