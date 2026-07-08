import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.5rem",
        md: "2.5rem",
        lg: "4rem",
        xl: "5rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // (#15) Higher breakpoints so large laptops (16" MBP = 1728px), QHD/4K/TV
      // widen instead of freezing in a narrow column with vast dead margins
      // ("the page goes super gappy and spaced out on fullscreen"). 3xl LOWERED
      // 2200→1700 (2026-06-18) so the common 1728/1920 fullscreen case actually
      // gets the wide content widths + larger type, not the cramped 2xl column.
      // 4xl added for true 4K/ultrawide. Section wrappers step max-w at 2xl/3xl/4xl.
      screens: {
        "3xl": "1700px",
        "4xl": "2400px",
      },
      fontFamily: {
        // Two families only (#10). Fraunces = editorial display serif with a
        // true italic reserved for quotes; Schibsted Grotesk = distinctive
        // editorial body/UI sans (replaced Hanken Grotesk 2026-06-25 for a more
        // "high-fashion" body face). Variable wght, loaded in index.html.
        display: ['"Fraunces"', "Georgia", '"Times New Roman"', "serif"],
        sans: [
          '"Schibsted Grotesk"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.025em",
        tight: "-0.015em",
        normal: "0em",
        wide: "0.06em",
        wider: "0.14em",
        widest: "0.24em",
      },
      lineHeight: {
        crush: "1.0",
        tight: "1.08",
        snug: "1.2",
        relaxed: "1.6",
        loose: "1.8",
      },
      fontSize: {
        // 2026-06-20: ceilings + vw growth raised so type FILLS big screens
        // (Hugo: "increase font size + fill screen, too much spacing"). Mobile
        // floors barely move; large screens grow markedly bolder.
        hero: ["clamp(50px, 8.4vw, 152px)", { lineHeight: "1.02", letterSpacing: "-0.04em" }],
        h1: ["clamp(42px, 6.6vw, 124px)", { lineHeight: "1.04", letterSpacing: "-0.04em" }],
        h2: ["clamp(33px, 5vw, 92px)", { lineHeight: "1.08", letterSpacing: "-0.035em" }],
        h3: ["clamp(25px, 3.1vw, 56px)", { lineHeight: "1.18", letterSpacing: "-0.025em" }],
        // Fluid body — grows on large screens so prose scales with the viewport
        // (dynamic cross-platform unison) instead of looking tiny in a sea of
        // dead space at fullscreen. Mobile/laptop ≈ the old 18/16px.
        body: ["clamp(18px, 0.6vw + 14.3px, 29px)", { lineHeight: "1.7" }],
        "body-sm": ["clamp(16px, 0.44vw + 13px, 23px)", { lineHeight: "1.68" }],
        label: ["12px", { lineHeight: "1.2", letterSpacing: "0.18em" }],
      },
      colors: {
        // Hybrid theme — dark shell + cream cards.
        // ⚠️ bg / ink / accent reference RGB-CHANNEL vars (`--bg: 10 9 8` in
        // global.css :root) via `rgb(var(--x) / <alpha-value>)` so Tailwind
        // OPACITY MODIFIERS WORK: `border-ink/20`, `ring-accent/50`, `bg-bg/85`.
        // Before 2026-06-28 these were bare `var(--x)` full-hex, which Tailwind
        // cannot apply alpha to — so every `/N` variant was silently dropped and
        // fell back to Tailwind's defaults (cool gray-200 borders, BLUE-500
        // rings) sitewide. ink.soft/fade/faint stay literal rgba (parseColor can
        // alpha them directly). ink.muted + line are FUNCTION-FORM: bare = baked
        // cream alpha, `/N` = cream@N via the --ink channels — so an opacity
        // modifier NEVER breaks on them either. ONE source of truth.
        bg: {
          DEFAULT: "rgb(var(--bg) / <alpha-value>)",
          soft: "#14120f",
          elevated: "#1a1815",
        },
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          // The ONE muted ink — use `text-ink-muted` instead of inventing greys.
          // Function-form so BARE `text-ink-muted` keeps its baked 0.7 cream alpha,
          // yet `text-ink-muted/80` resolves to cream@0.8 via the --ink channels
          // instead of silently falling back. (bare → opacityVariable defined;
          // /N → opacityVariable undefined + literal opacityValue.)
          muted: ({
            opacityVariable,
            opacityValue,
          }: {
            opacityVariable?: string;
            opacityValue?: string;
          }) =>
            opacityVariable === undefined && opacityValue !== undefined
              ? `rgb(var(--ink) / ${opacityValue})`
              : "var(--ink-muted)",
          soft: "rgba(237, 230, 214, 0.85)",
          fade: "rgba(237, 230, 214, 0.55)",
          faint: "rgba(237, 230, 214, 0.35)",
        },
        cream: {
          DEFAULT: "#f5efe3",
          soft: "#ebe3d3",
          line: "#d9d1bf",
          ink: "#1a1612",
          "ink-soft": "#5a544a",
        },
        line: {
          // Warm cream-alpha hairline (the single divider token). Cool white/N
          // rules should migrate to `border-line` / `ring-line`.
          // Function-form: BARE `border-line` keeps the baked 0.12 cream alpha;
          // `border-line/40` / `ring-line/70` / `decoration-line/60` resolve to
          // cream@N via the --ink channels instead of silently dropping to
          // gray-200. So an opacity modifier on `line` is SAFE now (2026-06-28).
          DEFAULT: ({
            opacityVariable,
            opacityValue,
          }: {
            opacityVariable?: string;
            opacityValue?: string;
          }) =>
            opacityVariable === undefined && opacityValue !== undefined
              ? `rgb(var(--ink) / ${opacityValue})`
              : "var(--line)",
          strong: "#34302a",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          soft: "#d99466",
        },
      },
      // ⚠️ Full 0–100 opacity scale (2026-06-28). Tailwind only generates a
      // colour opacity modifier (`ring-white/8`, `bg-black/72`, `border-white/12`)
      // when the value is a KEY in theme.opacity. The default scale skips most
      // integers (8, 12, 45, 55, 65, 72, 85, 92 …), so those classes silently
      // failed to generate and fell back to Tailwind defaults — VISIBLE BLUE-500
      // rings + gray-200 borders + transparent fills across the site. Channel-var
      // colours (ink/accent/bg) dodge this via <alpha-value>, but built-in
      // white/black still need the scale. Enumerating every integer guarantees
      // no opacity utility can ever silently no-op again.
      opacity: Object.fromEntries(
        Array.from({ length: 101 }, (_, i) => [i, (i / 100).toFixed(2)]),
      ),
      boxShadow: {
        lift: "0 24px 60px rgba(0,0,0,0.45)",
        liftLg: "0 36px 80px rgba(0,0,0,0.55)",
        inner1: "inset 0 0 0 1px rgba(255,255,255,0.05)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
      keyframes: {
        scrollCue: {
          "0%":   { transform: "scaleY(0)", transformOrigin: "top" },
          "50%":  { transform: "scaleY(1)", transformOrigin: "top" },
          "51%":  { transform: "scaleY(1)", transformOrigin: "bottom" },
          "100%": { transform: "scaleY(0)", transformOrigin: "bottom" },
        },
      },
      animation: {
        scrollCue: "scrollCue 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
