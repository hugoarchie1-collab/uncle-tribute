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
 * and those `/img/paintings/…` paths are the keys of COLOURWAY_TINTS. Pages with
 * little or no art fall back to a WARM brand palette (plum/terracotta/purple/rose
 * — deliberately NO blue). Mounted once at the app root, z-0, behind every route.
 */

/** Warm brand fallback palette (no blue) for pages with little/no artwork. */
const FALLBACK = ["#8a5fa6", "#b06a5a", "#9179b3", "#b16f8a", "#a173a5"];
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
 *  nearest-to-centre first, padded with the warm brand fallback. */
const pickPalette = (): string[] => {
  if (typeof document === "undefined") return FALLBACK.slice(0, BLOBS);
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
  while (pal.length < BLOBS) pal.push(FALLBACK[i++ % FALLBACK.length]);
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
    const apply = () => {
      const pal = pickPalette();
      for (let i = 0; i < BLOBS; i++) {
        if (lastPal.current[i] !== pal[i]) {
          el.style.setProperty(`--amb-c${i + 1}`, pal[i]);
          lastPal.current[i] = pal[i];
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
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
      window.removeEventListener("resize", schedule);
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
