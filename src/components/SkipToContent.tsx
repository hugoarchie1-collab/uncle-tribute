import { useState, type CSSProperties } from "react";

/**
 * SkipToContent — the WCAG 2.4.1 "bypass blocks" control (audit 2026-07-28).
 * Visually hidden until it receives keyboard focus, at which point it becomes
 * the first thing a keyboard user sees on every route: one Tab + Enter jumps
 * focus past the header/nav straight to the page's <main>.
 *
 * Reveal is driven by focus/blur STATE (not CSS pseudo-classes) so it is
 * bulletproof across Tailwind's variant layering — focused ? visible pill :
 * screen-reader-only. Finds the current page's <main> at activation time, so no
 * id is needed on all ~20 page <main> elements. Purely additive.
 */
const HIDDEN: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

export const SkipToContent = () => {
  const [focused, setFocused] = useState(false);

  const jump = (e: React.MouseEvent | React.KeyboardEvent) => {
    if ("key" in e && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    const main = document.querySelector("main");
    if (!main) return;
    main.setAttribute("tabindex", "-1");
    (main as HTMLElement).focus();
    main.scrollIntoView({ block: "start" });
  };

  return (
    <a
      href="#main"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClick={jump}
      onKeyDown={jump}
      className={
        focused
          ? "fixed top-3 left-3 z-[200] inline-flex items-center rounded-full bg-ink px-5 py-2.5 font-sans text-[14px] font-bold tracking-[0.01em] text-bg no-underline shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7)] outline-none ring-2 ring-accent"
          : undefined
      }
      style={focused ? undefined : HIDDEN}
    >
      Skip to content
    </a>
  );
};
