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
      fontFamily: {
        // Two families only (#10). Fraunces = editorial display serif with a
        // true italic reserved for quotes; Hanken Grotesk = quiet body/UI
        // sans. Two weights each (loaded in index.html). No Newsreader/
        // Schibsted, no Playfair/Inter.
        display: ['"Fraunces"', "Georgia", '"Times New Roman"', "serif"],
        sans: [
          '"Hanken Grotesk"',
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
        hero: ["clamp(48px, 7.2vw, 96px)", { lineHeight: "1.04", letterSpacing: "-0.04em" }],
        h1: ["clamp(40px, 5.6vw, 80px)", { lineHeight: "1.05", letterSpacing: "-0.04em" }],
        h2: ["clamp(32px, 4.2vw, 56px)", { lineHeight: "1.1", letterSpacing: "-0.035em" }],
        h3: ["clamp(24px, 2.6vw, 36px)", { lineHeight: "1.2", letterSpacing: "-0.025em" }],
        body: ["18px", { lineHeight: "1.8" }],
        "body-sm": ["16px", { lineHeight: "1.75" }],
        label: ["12px", { lineHeight: "1.2", letterSpacing: "0.18em" }],
      },
      colors: {
        // Hybrid theme — dark shell + cream cards.
        // The four CANONICAL roles (bg / ink / ink.muted / accent + the warm
        // hairline) reference the CSS variables defined in global.css :root, so
        // the palette has ONE source of truth. The soft/elevated surface steps
        // and the ink alpha steps stay as literals (on-palette cream-alpha).
        bg: {
          DEFAULT: "var(--bg)",
          soft: "#14120f",
          elevated: "#1a1815",
        },
        ink: {
          DEFAULT: "var(--ink)",
          // The ONE muted ink — use `text-ink-muted` instead of inventing greys.
          muted: "var(--ink-muted)",
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
          DEFAULT: "var(--line)",
          strong: "#34302a",
        },
        accent: {
          DEFAULT: "var(--accent)",
          soft: "#d99466",
        },
      },
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
