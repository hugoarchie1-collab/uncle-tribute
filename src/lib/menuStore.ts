// =============================================================================
// MENU STORE  ·  global open/closed state for the push-content nav drawer
// =============================================================================
// A deliberately TINY hand-rolled pub/sub (the same pattern basket.ts uses) so
// two distant components can share ONE source of truth for "is the menu open":
//
//   • Nav.tsx          — owns the menu button + renders the body-portaled drawer
//   • App.tsx          — wraps the routed page in a shell that slides LEFT by the
//                        drawer's width whenever the menu is open (the push effect)
//
// Before this, Nav held `menuOpen` in a local `useState`, which App had no way
// to read — so App could never translate the page. Lifting it to a module-level
// store (read via `useMenuOpen()`) lets BOTH subscribe with zero prop-drilling
// and zero Context provider, and keeps Nav's existing a11y wiring (focus-trap,
// scroll-lock, Escape, route-change close) working untouched — those effects
// just key off this shared boolean instead of a local one.
//
// No Redux/Zustand/Context — `useSyncExternalStore` + a Set of listeners is
// plenty for a single boolean. SSR-safe: getServerSnapshot returns `false`.
// =============================================================================

import { useSyncExternalStore } from "react";

/**
 * The drawer's width — the SINGLE source of truth shared by Nav (the panel's
 * own `width`) and App (the distance the routed-page shell slides LEFT to
 * reveal it). They MUST agree or the page would slide too far / not far enough
 * and leave a seam, so both import THIS constant rather than hard-coding it.
 * `min(420px, 86vw)` keeps a comfortable reading panel on desktop while never
 * exceeding 86% of a narrow phone (a sliver of the page stays visible at the
 * left as the affordance that tapping it closes the menu).
 */
export const DRAWER_WIDTH = "min(420px, 86vw)";

/** The numeric cap (px) and viewport fraction behind DRAWER_WIDTH. */
const DRAWER_MAX_PX = 420;
const DRAWER_VW_FRACTION = 0.86;

/**
 * The pixel resolution of DRAWER_WIDTH for the CURRENT viewport — the exact
 * px the page shell must slide LEFT.
 *
 * ⚠️ Why App slides by THIS (px) instead of reusing the CSS string in the
 * shell's transform: a `transform: translateX(calc(-1 * min(420px, 86vw)))`
 * was observed to resolve to ZERO in-engine (the `vw` unit inside `min()`
 * inside a `calc()` multiplication computed to 0 px of translation — the page
 * never moved), even though the IDENTICAL `min(420px, 86vw)` resolves
 * correctly for the panel's `width`. Translating by a concrete px value
 * sidesteps that entirely and is guaranteed to equal the panel width because
 * both derive from the same two constants here. SSR-safe (falls back to the
 * max cap when there's no window).
 */
export const getDrawerWidthPx = (): number => {
  if (typeof window === "undefined") return DRAWER_MAX_PX;
  return Math.min(DRAWER_MAX_PX, DRAWER_VW_FRACTION * window.innerWidth);
};

let open = false;
const listeners = new Set<() => void>();

const emit = (): void => {
  for (const fn of listeners) fn();
};

/** Imperative read — the current menu-open boolean. */
export const getMenuOpen = (): boolean => open;

/**
 * Imperative write. Accepts either a literal boolean or an updater function
 * (mirrors React's setState ergonomics so `setMenuOpen((o) => !o)` works as a
 * drop-in for the old local `useState` toggle). No-ops + skips notifying when
 * the value is unchanged, so a redundant set never triggers a render storm.
 */
export const setMenuOpen = (next: boolean | ((prev: boolean) => boolean)): void => {
  const value = typeof next === "function" ? next(open) : next;
  if (value === open) return;
  open = value;
  emit();
};

/** Subscribe to open/close changes. Returns an unsubscribe fn. */
export const subscribe = (callback: () => void): (() => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

const getServerSnapshot = (): boolean => false;

/**
 * Reactive hook — re-renders the caller whenever the menu opens or closes.
 * Used by Nav (button label / aria-expanded / drawer render) and App (the
 * page-shell slide). Referentially stable: `getMenuOpen` returns a primitive,
 * so useSyncExternalStore never loops.
 */
export const useMenuOpen = (): boolean =>
  useSyncExternalStore(subscribe, getMenuOpen, getServerSnapshot);
