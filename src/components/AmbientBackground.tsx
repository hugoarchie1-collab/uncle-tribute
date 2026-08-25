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

  // Drive --amb-c1..5 from whatever art is on screen. Runs on mount, on route
  // change (two delayed re-reads to catch the incoming page's layout), and on
  // scroll/resize (rAF-throttled). The CSS transition eases each palette change.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const apply = () => {
      const pal = pickPalette();
      for (let i = 0; i < BLOBS; i++) el.style.setProperty(`--amb-c${i + 1}`, pal[i]);
    };
    apply();
    const t1 = window.setTimeout(apply, 280);
    const t2 = window.setTimeout(apply, 720);
    // Perf (Hugo 2026-08-25: "fix how glitchy and laggy it all is"): `apply()`
    // calls getBoundingClientRect() on EVERY painting <img> (16+ on the home),
    // which forces a synchronous layout. Running that per animation-frame while
    // scrolling was thrashing layout 60×/s = the jank. The palette only needs to
    // ease as new art scrolls in, and the CSS transition already smooths it — so
    // recompute at most every ~200ms (trailing) instead of every frame.
    let timer = 0;
    let last = 0;
    const onScroll = () => {
      if (timer) return;
      const wait = Math.max(0, 200 - (performance.now() - last));
      timer = window.setTimeout(() => {
        timer = 0;
        last = performance.now();
        apply();
      }, wait);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
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
