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

/** The artwork nearest the viewport centre wins the wash. Ignores off-screen and
 *  thumbnail-sized images so a tiny footer tile never beats the hero on screen. */
const pickContextTint = (): string => {
  if (typeof document === "undefined") return AMBIENT_BASE_HALO;
  const vh = window.innerHeight;
  const cy = vh / 2;
  let best: string | null = null;
  let bestDist = Infinity;
  document.querySelectorAll<HTMLImageElement>('img[src*="/img/paintings/"]').forEach((img) => {
    const halo = tintForSrc(img.getAttribute("src") || "");
    if (!halo) return;
    const r = img.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= vh || r.width < 56 || r.height < 56) return;
    const dist = Math.abs(r.top + r.height / 2 - cy);
    if (dist < bestDist) {
      bestDist = dist;
      best = halo;
    }
  });
  return best ?? AMBIENT_BASE_HALO;
};

export const AmbientBackground = () => {
  const reduced = useReducedMotion();
  const { pathname } = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);

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
    const apply = () => el.style.setProperty("--amb-ctx", pickContextTint());

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
