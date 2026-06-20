import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { asset } from "../lib/asset";

/**
 * SiteEntrance — the branded arrival moment, once per browser session.
 *
 * A full-screen #0a0908 veil with the rose emblem quietly BREATHING (an opacity
 * pulse — never a spin), which fades out over ~500ms the instant the app has
 * mounted AND either the fonts are ready (`document.fonts.ready`) or a 900ms
 * cap is reached — whichever comes first. The page content paints normally
 * BENEATH it the whole time, so the veil hides nothing from a crawler and can
 * never delay an LCP fetch — it is a pure visual overlay.
 *
 * Invariants:
 *  - pointer-events: none for the ENTIRE lifetime — the veil is purely visual
 *    and never blocks a click, not even during its first frames.
 *  - z-[180]: above the film grain (z-100), consent banner (z-[110]) and toasts
 *    (z-[120]); below the modals (z-200) and the custom cursor (z-250).
 *  - The emblem is an <img> of /logo/logo-emblem.svg — NOT a CSS mask (WebKit
 *    resolves currentColor inside a mask resource as transparent; that gotcha
 *    already bit the Nav logo once). The SVG's own fill is black, so
 *    brightness(0) invert(1) forces it to a clean white — the same trick the
 *    .cc-flower cursor uses.
 *  - prefers-reduced-motion → renders nothing at all (no veil, no delay).
 *  - sessionStorage "tasm.entrance.v1" gates it to the first mount per session;
 *    the READ is in the lazy state initialiser (no side effects there —
 *    StrictMode double-invokes it) and the WRITE in a mount effect.
 *  - Unmounts completely once the fade-out finishes (plus a hard safety timeout
 *    in case an animation-complete callback is ever swallowed).
 */

const SESSION_KEY = "tasm.entrance.v1";

/** Hard cap before the veil lifts regardless of fonts — keeps arrival snappy. */
const READY_CAP_MS = 900;
/** Fade-out duration once the veil is told to lift. */
const FADE_MS = 0.5;
/** House deceleration curve. */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const shouldPlay = (): boolean => {
  if (typeof window === "undefined") return false;
  // Reduced-motion users skip the entrance entirely — straight to the site.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === null;
  } catch {
    // Storage unavailable (rare lockdown modes) — fail closed, no veil.
    return false;
  }
};

export const SiteEntrance = () => {
  const [playing, setPlaying] = useState(shouldPlay);
  // `lifting` flips true the moment we're cleared to fade out; the veil then
  // animates opacity 1 → 0 and unmounts on completion.
  const [lifting, setLifting] = useState(false);

  useEffect(() => {
    if (!playing) return;
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Best effort — without storage the veil simply plays again next load.
    }

    let cancelled = false;
    const lift = () => {
      if (!cancelled) setLifting(true);
    };

    // Lift on whichever fires first: fonts ready, or the hard cap. Fonts ready
    // means the emblem-adjacent type beneath is settled, so nothing reflows as
    // the veil clears; the cap guarantees we never stall on a slow font fetch.
    const cap = window.setTimeout(lift, READY_CAP_MS);
    const fontsReady = (
      document as Document & { fonts?: { ready?: Promise<unknown> } }
    ).fonts?.ready;
    if (fontsReady && typeof fontsReady.then === "function") {
      fontsReady.then(lift).catch(() => {});
    }

    // Final safety net: unmount even if the fade's animation-complete callback
    // never fires (e.g. the tab is backgrounded and rAF is throttled).
    const safety = window.setTimeout(() => {
      if (!cancelled) setPlaying(false);
    }, READY_CAP_MS + 900);

    return () => {
      cancelled = true;
      window.clearTimeout(cap);
      window.clearTimeout(safety);
    };
  }, [playing]);

  if (!playing) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-0 z-[180] pointer-events-none flex items-center justify-center bg-[#0a0908]"
      initial={{ opacity: 1 }}
      animate={{ opacity: lifting ? 0 : 1 }}
      transition={{ duration: FADE_MS, ease: EASE }}
      onAnimationComplete={() => {
        if (lifting) setPlaying(false);
      }}
    >
      {/* The emblem breathes — a slow, gentle opacity pulse (no spin, no scale
          travel beyond a hair) — while the veil holds. */}
      <motion.img
        src={asset("/logo/logo-seal-v2-w512.png")}
        alt=""
        width={512}
        height={512}
        className="h-20 w-20 md:h-28 md:w-28"
        style={{
          filter:
            "drop-shadow(0 2px 10px rgba(0,0,0,0.55)) drop-shadow(0 0 18px rgba(150,28,28,0.45))",
        }}
        initial={{ opacity: 0.55, scale: 0.985 }}
        animate={{ opacity: [0.55, 0.95, 0.55], scale: [0.985, 1, 0.985] }}
        transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
      />
    </motion.div>
  );
};
