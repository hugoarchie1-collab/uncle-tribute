import { useEffect, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useLocation } from "react-router-dom";
import { COLOURWAY_TINTS } from "../lib/colourwayTints";

/** Cosmic-blue BASE hue where no artwork is on screen (mirrors the CSS
 *  @property --amb-ctx initial-value). Keeps the masthead + text sections a
 *  living atmospheric blue instead of dead black. */
const AMBIENT_BASE_HALO = "#5d89bb";

/**
 * AMBIENT BACKGROUND — the site-wide base "wallpaper" layer.
 *
 * Hugo hates plain black: every page should feel like a calm, subtle iPhone-style
 * dark wallpaper — mostly near-black (#0a0908) with a WHISPER of soft colour that
 * slowly drifts as you scroll, never busy, never bright enough to out-shout the
 * cream text.
 *
 * This is a FIXED, full-viewport, pointer-events-none layer mounted ONCE at the
 * app root, BEHIND every route. It carries an opaque near-black base plus three
 * very large, very soft radial colour glows (deep indigo · warm rust · muted
 * violet) as the calm HOUSE floor, PLUS a fourth "context" glow whose hue is
 * borrowed from the artwork nearest the viewport centre — so the wash quietly
 * takes on the colour of whatever painting is on screen and HANDS OFF to the
 * next as you scroll (the "in-context, living" iPhone-wallpaper feel Hugo asked
 * for). The house bands drift a few percent on scroll; the context hue eases via
 * a registered @property <color> (--amb-ctx) with the CSS transition living on
 * `.ambient-bg`. Motion is scroll-linked and kept to `transform` / `opacity`
 * (GPU-composited, per the house rule). `prefers-reduced-motion` pins it static
 * (the context tint is still set once, just without the scroll handoff).
 *
 * The context hue needs ZERO per-page wiring: every painting <img> on the site
 * renders its `.jpg` src (the WebP lives only in the <picture>'s <source>), and
 * those `/img/paintings/…` paths are exactly the keys of COLOURWAY_TINTS. So the
 * wash reads "what's on screen" straight from the DOM — home featured grid,
 * collections, PDP, for-you, and the FooterCatalogue strip present at the foot of
 * almost every page. Pages with no artwork ease back to the calm house DEFAULT.
 *
 * LAYERING: it sits at `z-0`, mounted directly after `AmbientBackdrop`, so it is
 * the effective base on pages that carry NO backdrop of their own. Pages that DO
 * own a backdrop (home `PavoBackdrop`, PDP `.pd-*`, collection/scene backdrops)
 * render later in the DOM at `z-0` and paint OVER this base, exactly as before.
 */

/** Map "/img/paintings/<stem>" → the artwork's halo colour (the tint hue). */
const TINT_BY_STEM: Record<string, string> = Object.fromEntries(
  Object.entries(COLOURWAY_TINTS).map(([path, tint]) => [
    path.replace(/\.[a-z0-9]+$/i, ""),
    tint.halo,
  ]),
);

/** Resolve a painting <img> src to its halo colour, tolerant of a deploy base
 *  prefix and of .jpg/.webp — we key only on the `/img/paintings/<stem>` slug. */
const tintForSrc = (src: string): string | null => {
  const m = src.match(/\/img\/paintings\/[^?#]+/);
  if (!m) return null;
  const stem = m[0].replace(/\.[a-z0-9]+$/i, "");
  return TINT_BY_STEM[stem] ?? null;
};

/** The artwork nearest the viewport centre wins the wash — returns BOTH its halo
 *  hue (for the colour orbs) AND its image src (for the "continued print" echo,
 *  Hugo 2026-08-06: "not just the colour but the continued print"). Ignores
 *  off-screen and thumbnail-sized images so a tiny footer tile never beats the
 *  hero on screen. */
const pickContextArt = (): { halo: string; src: string | null } => {
  if (typeof document === "undefined") return { halo: AMBIENT_BASE_HALO, src: null };
  const vh = window.innerHeight;
  const cy = vh / 2;
  let bestHalo: string | null = null;
  let bestSrc: string | null = null;
  let bestDist = Infinity;
  document.querySelectorAll<HTMLImageElement>('img[src*="/img/paintings/"]').forEach((img) => {
    const src = img.getAttribute("src") || "";
    const halo = tintForSrc(src);
    if (!halo) return;
    const r = img.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= vh || r.width < 56 || r.height < 56) return;
    const dist = Math.abs(r.top + r.height / 2 - cy);
    if (dist < bestDist) {
      bestDist = dist;
      bestHalo = halo;
      bestSrc = src;
    }
  });
  return { halo: bestHalo ?? AMBIENT_BASE_HALO, src: bestSrc };
};

/** Strength of the continued-print echo (behind the colour orbs + legibility
 *  veils). High enough that the mandala clearly CONTINUES into the page, low
 *  enough the cream text over it still reads. */
const PRINT_ECHO_OPACITY = "0.55";

export const AmbientBackground = () => {
  const reduced = useReducedMotion();
  const { pathname } = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  // Two crossfading layers for the "continued print" echo — the nearest on-
  // screen painting, blurred + breathing, extended behind the page. We ping-pong
  // between A and B so a change cross-dissolves (never a hard swap). Direct-DOM
  // (like --amb-ctx) so a scroll handoff never re-renders React.
  const printARef = useRef<HTMLDivElement>(null);
  const printBRef = useRef<HTMLDivElement>(null);
  const printActive = useRef(0);
  const printSrc = useRef("");

  // Whole-page scroll progress (0 at the top → 1 at the foot). No target ref =
  // the document scroll, so the wash breathes across the entire read.
  const { scrollYProgress } = useScroll();

  // Gentle, opposed vertical drift — a few percent of the viewport across the
  // ENTIRE page scroll, so the colour slowly shifts as you read. Never fast,
  // never far (edges are over-sized so the drift can't reveal a seam).
  const driftDown = useTransform(scrollYProgress, [0, 1], ["-4%", "9%"]);
  const driftUp = useTransform(scrollYProgress, [0, 1], ["5%", "-8%"]);
  // The violet band merely breathes its presence — a slow opacity swell that
  // peaks mid-page — so the wash feels alive without moving.
  const violetOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.55, 1, 0.6]);
  // The context glow drifts gently the opposite way to the indigo, so the two
  // tinted bands cross as the hue hands off.
  const contextDrift = useTransform(scrollYProgress, [0, 1], ["4%", "-7%"]);

  // Drive --amb-ctx from whatever artwork is on screen. Runs on mount, on route
  // change (with two delayed re-reads to catch the incoming page's layout), and
  // — unless reduced-motion — on scroll/resize (rAF-throttled). The CSS
  // transition on `.ambient-bg` eases each hue change into the next.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    // Cross-dissolve the continued-print echo between the two layers on change.
    const applyPrint = (src: string | null) => {
      const a = printARef.current;
      const b = printBRef.current;
      if (!a || !b) return;
      if (!src) {
        a.style.opacity = "0";
        b.style.opacity = "0";
        printSrc.current = "";
        return;
      }
      if (src === printSrc.current) return;
      printSrc.current = src;
      const showingA = printActive.current === 0;
      const incoming = showingA ? b : a;
      const outgoing = showingA ? a : b;
      incoming.style.backgroundImage = `url("${src}")`;
      incoming.style.opacity = PRINT_ECHO_OPACITY;
      outgoing.style.opacity = "0";
      printActive.current = showingA ? 1 : 0;
    };
    const apply = () => {
      const { halo, src } = pickContextArt();
      el.style.setProperty("--amb-ctx", halo);
      applyPrint(src);
    };

    apply();
    const t1 = window.setTimeout(apply, 280);
    const t2 = window.setTimeout(apply, 720);

    if (reduced) {
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        apply();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname, reduced]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="ambient-bg fixed inset-0 z-0 pointer-events-none overflow-hidden"
    >
      {/* Continued-print echo — the nearest on-screen painting, blurred +
          breathing, extended behind the page (Hugo 2026-08-06: "not just the
          colour but the continued print"). Two layers cross-dissolve as you
          scroll between artworks. Sits BEHIND the colour orbs + legibility veils
          so the mandala continues into the page without out-shouting the text. */}
      <div ref={printARef} className="ambient-bg__print" />
      <div ref={printBRef} className="ambient-bg__print" />
      {/* Deep indigo — top-biased; drifts DOWN as you scroll. */}
      <motion.div
        className="ambient-bg__glow ambient-bg__glow--indigo"
        style={reduced ? undefined : { y: driftDown }}
      />
      {/* Warm rust (the house accent, kept faint) — foot-biased; drifts UP, so
          it and the indigo pass each other slowly. */}
      <motion.div
        className="ambient-bg__glow ambient-bg__glow--rust"
        style={reduced ? undefined : { y: driftUp }}
      />
      {/* Muted violet — central; a slow opacity swell rather than a move. */}
      <motion.div
        className="ambient-bg__glow ambient-bg__glow--violet"
        style={reduced ? undefined : { opacity: violetOpacity }}
      />
      {/* Context tint — hue borrowed from the on-screen artwork (--amb-ctx),
          easing between paintings as you scroll. Gentle opposed drift. */}
      <motion.div
        className="ambient-bg__glow ambient-bg__glow--context"
        style={reduced ? undefined : { y: contextDrift }}
      />
      {/* Second bloom of the same hue, foot-biased + drifting the other way, so
          the two read as a soft iPhone-style mesh gradient. */}
      <motion.div
        className="ambient-bg__glow ambient-bg__glow--context2"
        style={reduced ? undefined : { y: driftDown }}
      />
    </div>
  );
};
