import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { COLOURWAY_TINTS } from "../lib/colourwayTints";

/**
 * AMBIENT BACKGROUND — the site-wide reactive Apple-mesh wallpaper.
 *
 * Five large, soft, overlapping radial blobs (see `.ambient-bg__*` in global.css)
 * blend into a flowing iOS-style mesh gradient over a near-black base. This file
 * feeds the blob COLOURS: it reads the HALO hues of every painting currently on
 * screen (nearest the viewport centre first) and writes them to `--amb-c1..5`, so
 * the mesh is a genuine, living reflection of whatever art is shown — a grid page
 * becomes a multi-colour wash of the works on it, and the palette eases to the
 * next as you scroll (Hugo 2026-08-06: "reactive to whatever colours are showing
 * … clone the most stunning Apple iPhone wallpapers").
 *
 * Colours come free from the DOM: every painting <img> renders its `.jpg` src,
 * and those `/img/paintings/…` paths are the keys of COLOURWAY_TINTS.
 * Mounted once at the app root, z-0, behind every route.
 *
 * ⚠️ PER-ROUTE PALETTES (Hugo, 2026-09-03: "I want every page to be a slightly
 * different colourway mix … I don't like how they are all the same this light
 * purple"). A page with art on screen still paints itself from that art — that
 * behaviour is untouched. The change is the FALLBACK: pages with little or no
 * artwork (legal, contact, account, the forms) all shared ONE warm plum palette,
 * which is why every quiet page looked identical. Each route now falls back to
 * its own mix instead.
 *
 * Every hue below is a REAL artwork halo lifted from COLOURWAY_TINTS, so a
 * fallback can never drift off-brand — the mesh is always wearing colours
 * Stephen actually mixed.
 *
 * 🔒 HOME IS UNCHANGED. `/` keeps the exact five hues this file has always used,
 * so the frozen home page renders byte-identically. Do not re-tune `/`.
 */

/** The original warm brand palette. Still the site-wide default, and the home
 *  page's palette verbatim — see the freeze note above. */
const FALLBACK = ["#8a5fa6", "#b06a5a", "#9179b3", "#b16f8a", "#a173a5"];

/** Route prefix → its own fallback mix, longest prefix wins. Anything not
 *  listed keeps FALLBACK. */
/** Rotate a `#rrggbb` around the HSL hue wheel and return `#rrggbb`.
 *  ⚠️ This exists so the scroll drift never needs a CSS `filter`. See the
 *  perf note on `applyHue` below — a filter on `.ambient-bg` is catastrophic. */
const rotateHex = (hex: string, deg: number): string => {
  if (!deg) return hex;
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = ((n >> 16) & 255) / 255;
  let g = ((n >> 8) & 255) / 255;
  let b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let sat = 0;
  if (d) {
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  h = (h + deg / 360) % 1;
  if (h < 0) h += 1;
  const chan = (pp: number, qq: number, t: number) => {
    let u = t;
    if (u < 0) u += 1;
    if (u > 1) u -= 1;
    if (u < 1 / 6) return pp + (qq - pp) * 6 * u;
    if (u < 1 / 2) return qq;
    if (u < 2 / 3) return pp + (qq - pp) * (2 / 3 - u) * 6;
    return pp;
  };
  const q2 = l < 0.5 ? l * (1 + sat) : l + sat - l * sat;
  const p2 = 2 * l - q2;
  r = chan(p2, q2, h + 1 / 3);
  g = chan(p2, q2, h);
  b = chan(p2, q2, h - 1 / 3);
  const hx = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  return `#${hx(r)}${hx(g)}${hx(b)}`;
};

const ROUTE_PALETTES: [string, string[]][] = [
  // Warm and personal — the portraits and the family photographs.
  ["/about", ["#a28043", "#b07750", "#b16f8a", "#9179b3", "#998542"]],
  // Tender: the rose and amethyst end of the catalogue.
  ["/memories", ["#b46f81", "#b16f8a", "#9b75ac", "#a173a5", "#b07750"]],
  // Fresher, greener — announcements and dates.
  ["/news", ["#729258", "#8e8945", "#a28043", "#7781bc", "#948743"]],
  // Calm and cool, so a form reads as quiet rather than urgent.
  ["/contact", ["#7183bd", "#6e84bd", "#9179b3", "#a173a5", "#578db2"]],
  // Deliberately the quietest on the site — long prose, nothing competing.
  ["/legal", ["#7f8e4e", "#8e8945", "#918844", "#a28043", "#729258"]],
  // Partners: indigo + gold. The most "business" ground on the site, and the
  // one page that should not look like the shop.
  ["/trade", ["#7183bd", "#5d89bb", "#a97c47", "#948743", "#9179b3"]],
  ["/partners", ["#7183bd", "#5d89bb", "#a97c47", "#948743", "#9179b3"]],
  // Celebratory — rose and gold.
  ["/gift", ["#b46f81", "#ab7b49", "#b16f8a", "#a97c47", "#9b75ac"]],
  // The money surfaces share one steady ground so the flow feels continuous.
  ["/basket", ["#9179b3", "#a173a5", "#7d7fbb", "#b07750", "#998542"]],
  ["/order", ["#9179b3", "#a173a5", "#7d7fbb", "#b07750", "#998542"]],
  ["/account", ["#9179b3", "#a173a5", "#7d7fbb", "#b07750", "#998542"]],
  ["/orders", ["#9179b3", "#a173a5", "#7d7fbb", "#b07750", "#998542"]],
  // The registry: deep and archival.
  ["/auth", ["#578db2", "#7183bd", "#9179b3", "#8e8945", "#a28043"]],
];

/** The fallback mix for a pathname. `/` is matched EXACTLY — a startsWith test
 *  would make the home entry swallow every route on the site. */
const paletteForRoute = (pathname: string): string[] => {
  if (pathname === "/") return FALLBACK;
  let best: string[] | null = null;
  let bestLen = 0;
  for (const [prefix, pal] of ROUTE_PALETTES) {
    if (pathname.startsWith(prefix) && prefix.length > bestLen) {
      best = pal;
      bestLen = prefix.length;
    }
  }
  return best ?? FALLBACK;
};

const BLOBS = 5;

/** "/img/paintings/<stem>" → the artwork's halo hue. */
const TINT_BY_STEM: Record<string, string> = Object.fromEntries(
  Object.entries(COLOURWAY_TINTS).map(([path, tint]) => [
    path.replace(/\.[a-z0-9]+$/i, ""),
    tint.halo,
  ]),
);

const tintForSrc = (src: string): string | null => {
  const m = src.match(/\/img\/paintings\/[^?#]+/);
  if (!m) return null;
  return TINT_BY_STEM[m[0].replace(/\.[a-z0-9]+$/i, "")] ?? null;
};

/** Up to BLOBS distinct artwork halo hues from paintings in/near the viewport,
 *  nearest-to-centre first, padded with THIS ROUTE's fallback mix. */
const pickPalette = (fallback: string[]): string[] => {
  if (typeof document === "undefined") return fallback.slice(0, BLOBS);
  const vh = window.innerHeight;
  const cy = vh / 2;
  const found: { c: string; d: number }[] = [];
  document.querySelectorAll<HTMLImageElement>('img[src*="/img/paintings/"]').forEach((img) => {
    const c = tintForSrc(img.getAttribute("src") || "");
    if (!c) return;
    const r = img.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= vh || r.width < 56 || r.height < 56) return;
    found.push({ c, d: Math.abs(r.top + r.height / 2 - cy) });
  });
  found.sort((a, b) => a.d - b.d);
  const pal: string[] = [];
  for (const f of found) {
    if (!pal.includes(f.c)) pal.push(f.c);
    if (pal.length >= BLOBS) break;
  }
  let i = 0;
  while (pal.length < BLOBS) pal.push(fallback[i++ % fallback.length]);
  return pal.slice(0, BLOBS);
};

export const AmbientBackground = () => {
  const { pathname } = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  // Last palette actually written to the DOM — so we NEVER re-set an unchanged
  // colour (each write restarts the 1.3s CSS ease = a full-viewport repaint of
  // all five gradient blobs; writing an identical value would repaint for
  // nothing). Persist across re-runs so a route change doesn't force a redundant
  // repaint when the palette is the same.
  const lastPal = useRef<string[]>([]);
  // Last hue-rotation (deg) written for the scroll drift — guarded the same way
  // so scrolling only writes on a real step change, never per frame.
  const lastHue = useRef<number>(0);

  // Drive --amb-c1..5 from whatever art is on screen. The mesh should re-tint as
  // NEW art scrolls into view — NOT on every scroll frame.
  //
  // ⚠️ PERF (Hugo 2026-08-25: "the entire site is so laggy it's unusable").
  // The old driver recomputed on every scroll event (throttled 200ms) and always
  // wrote all five --amb-c vars. Because `.ambient-bg` eases those vars over 1.3s,
  // each write repainted five viewport-sized color-mix gradients EVERY frame for
  // 1.3s — and scroll re-triggered it every 200ms, so the 1.3s repaints overlapped
  // into a CONTINUOUS full-viewport repaint storm for the whole duration of any
  // scroll, on every page (the mesh went site-wide in 2790318 — same moment the
  // lag appeared). Now: an IntersectionObserver recomputes ONLY when a painting
  // actually enters/leaves the viewport (a handful of times per scroll, coalesced
  // to one rAF), and we write only the channels that genuinely changed. The mesh
  // still hands off smoothly to the new art's palette — the repaint storm is gone.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    // The scroll drift's current rotation, applied to the palette HERE so there
    // is exactly ONE writer of --amb-c1..5 and the mesh needs no CSS filter.
    let hueDeg = 0;
    const apply = () => {
      const pal = pickPalette(paletteForRoute(pathname));
      for (let i = 0; i < BLOBS; i++) {
        const c = rotateHex(pal[i], hueDeg);
        if (lastPal.current[i] !== c) {
          el.style.setProperty(`--amb-c${i + 1}`, c);
          lastPal.current[i] = c;
        }
      }
    };
    apply();
    // Two delayed re-reads catch the incoming page's images finishing layout.
    const t1 = window.setTimeout(apply, 280);
    const t2 = window.setTimeout(apply, 720);

    // Recompute when art crosses the viewport — coalesced to one rAF so a burst
    // of simultaneous crossings (a grid scrolling in) costs a single recompute.
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        apply();
      });
    };
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(schedule, {
        // Trim the top/bottom so "on screen" means meaningfully visible, and a
        // few thresholds so a large artwork scrolling through still nudges the
        // palette as it passes centre.
        rootMargin: "-8% 0px -8% 0px",
        threshold: [0, 0.25, 0.6],
      });
      document
        .querySelectorAll('img[src*="/img/paintings/"]')
        .forEach((img) => io!.observe(img));
    }
    // A resize can change which art is on screen; recompute once (rAF-coalesced).
    window.addEventListener("resize", schedule, { passive: true });

    // SCROLL-DRIVEN HUE DRIFT (Hugo 2026-09-03: "I want it changing with the
    // scroll"). Each page starts on its OWN curated palette (hue 0 at the top,
    // so the per-route colours show exactly as designed) and gently rotates up
    // to ~+30deg by the foot — the mesh's colour visibly shifts as you move
    // down, while staying within Stephen's palette.
    //
    // ⚠️⚠️ THIS MUST NEVER GO BACK TO A CSS `filter` (Hugo 2026-09-03, on the
    // live site: "the lag on the entire scroll everytime you scroll nothing
    // comes up for at least 3 sec"). The first cut shipped
    // `filter: hue-rotate(var(--amb-hue))` on `.ambient-bg` — a FIXED,
    // FULL-VIEWPORT parent of five blobs inset -25%, THREE of which run
    // infinite drift animations. A filter there forces the browser to flatten
    // all five oversized layers into one filter render surface and re-rasterise
    // it EVERY FRAME, forever, because the children never stop animating; it
    // also strips the translate-only GPU compositing that made those blobs
    // free. On a 4K display that is five ~5760×3240 layers re-filtered per
    // frame. The JS throttling here was never the problem and tuning it would
    // not have helped.
    // The rotation is applied to the PALETTE in JS instead (rotateHex above):
    // identical on screen, quantised to 3deg, write-guarded, ~10 colour writes
    // per full-page scroll, each eased by the --amb-c transition that already
    // existed. Home ("/") and reduced-motion stay at 0.
    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const drift = pathname !== "/" && !reduce;
    const HUE_MAX = 30; // deg by the foot of the page
    const HUE_STEP = 3;
    let sTimer = 0;
    let sLast = 0;
    const applyHue = () => {
      const doc = document.documentElement;
      // Read the scroll position defensively (normal document scroll on this
      // site, but tolerate either scroll root).
      const y = window.scrollY || doc.scrollTop || document.body.scrollTop || 0;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, y / max));
      const q = Math.round((p * HUE_MAX) / HUE_STEP) * HUE_STEP;
      if (q !== lastHue.current) {
        lastHue.current = q;
        hueDeg = q;
        // Re-write the ROTATED colours. The 1.3s --amb-c easing that already
        // existed makes the quantised step read exactly as the filter did.
        apply();
      }
    };
    const onScroll = () => {
      if (sTimer) return;
      const wait = Math.max(0, 120 - (performance.now() - sLast));
      sTimer = window.setTimeout(() => {
        sTimer = 0;
        sLast = performance.now();
        applyHue();
      }, wait);
    };
    if (drift) {
      applyHue();
      window.addEventListener("scroll", onScroll, { passive: true });
    } else {
      // Frozen home + reduced-motion: pin the mesh to its true, un-rotated hue.
      lastHue.current = 0;
      hueDeg = 0;
    }

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
      window.removeEventListener("resize", schedule);
      if (sTimer) window.clearTimeout(sTimer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="ambient-bg fixed inset-0 z-0 pointer-events-none overflow-hidden"
    >
      <div className="ambient-bg__blob ambient-bg__blob--1" />
      <div className="ambient-bg__blob ambient-bg__blob--2" />
      <div className="ambient-bg__blob ambient-bg__blob--3" />
      <div className="ambient-bg__blob ambient-bg__blob--4" />
      <div className="ambient-bg__blob ambient-bg__blob--5" />
      <div className="ambient-bg__veil" />
    </div>
  );
};
