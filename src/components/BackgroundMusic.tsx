import { useCallback, useEffect, useRef, useState } from "react";
import { asset } from "../lib/asset";

/**
 * BackgroundMusic — a looping ambient score for the whole site (Hugo's choice:
 * "All Glory to Gaia Ma", the mix trimmed to start at 1:25 and loop forever).
 *
 * ⚠️ Browser reality: audible autoplay is BLOCKED everywhere until the visitor
 * interacts once (Chrome/Safari/Firefox autoplay policy — only *muted* media may
 * autoplay). So the track starts on the FIRST user gesture (pointer/scroll/key/
 * touch), then loops via the <audio loop> attribute. It streams (preload="none")
 * so the ~60MB file only loads as it plays — no upfront cost.
 *
 * A small speaker toggle (bottom-left, z-[118] — below modals/toasts) lets the
 * visitor mute/unmute at any time (WCAG 1.4.2: any audio over 3s needs a
 * control); the choice persists in localStorage so a returning visitor who
 * muted stays muted. Mounted once in App.tsx, so it survives SPA route changes
 * and never restarts on navigation.
 */
const KEY = "tasm.music.v1"; // "on" | "off" — absent => default on
const TIME_KEY = "tasm.music.t.v1"; // last playback position (seconds) for resume-on-reload
const TARGET_VOL = 0.5;

export const BackgroundMusic = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const startedRef = useRef(false);
  const wantsOnRef = useRef(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "off") wantsOnRef.current = false;
    } catch {
      /* private mode — default on */
    }
  }, []);

  // CONTINUITY (Hugo): the player is mounted once in App.tsx, so within the SPA
  // it already plays UNBROKEN across route changes (React never remounts it).
  // This adds belt-and-braces for a genuine page RELOAD: the current position is
  // saved to sessionStorage as it plays, and restored on the next load so the
  // track resumes exactly where it left off rather than restarting at 1:25.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const seekToSaved = () => {
      try {
        const t = parseFloat(sessionStorage.getItem(TIME_KEY) || "0");
        if (t > 0 && Number.isFinite(a.duration) && t < a.duration - 1) a.currentTime = t;
      } catch {
        /* ignore */
      }
    };
    let last = 0;
    const save = () => {
      const now = a.currentTime;
      if (Math.abs(now - last) < 3) return; // throttle to ~every 3s
      last = now;
      try {
        sessionStorage.setItem(TIME_KEY, String(now));
      } catch {
        /* ignore */
      }
    };
    const saveNow = () => {
      try {
        sessionStorage.setItem(TIME_KEY, String(a.currentTime));
      } catch {
        /* ignore */
      }
    };
    a.addEventListener("loadedmetadata", seekToSaved, { once: true });
    a.addEventListener("timeupdate", save);
    window.addEventListener("pagehide", saveNow);
    document.addEventListener("visibilitychange", saveNow);
    return () => {
      a.removeEventListener("loadedmetadata", seekToSaved);
      a.removeEventListener("timeupdate", save);
      window.removeEventListener("pagehide", saveNow);
      document.removeEventListener("visibilitychange", saveNow);
    };
  }, []);

  const fadeTo = useCallback((target: number) => {
    const a = audioRef.current;
    if (!a) return;
    const step = target > a.volume ? 0.04 : -0.06;
    const id = window.setInterval(() => {
      if (!a) return window.clearInterval(id);
      const next = a.volume + step;
      if ((step > 0 && next >= target) || (step < 0 && next <= target)) {
        a.volume = Math.max(0, Math.min(1, target));
        if (target === 0) a.pause();
        window.clearInterval(id);
      } else {
        a.volume = Math.max(0, Math.min(1, next));
      }
    }, 90);
  }, []);

  // Start on the first user gesture (audible autoplay is blocked before that).
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const events = ["pointerdown", "touchstart", "keydown", "scroll", "click"] as const;
    const remove = () => events.forEach((e) => window.removeEventListener(e, start));
    const start = () => {
      if (startedRef.current || !wantsOnRef.current) return remove();
      a.volume = 0;
      void a
        .play()
        .then(() => {
          startedRef.current = true;
          setPlaying(true);
          fadeTo(TARGET_VOL);
          remove();
        })
        .catch(() => {
          /* still blocked (e.g. Low Power Mode) — wait for the next gesture */
        });
    };
    events.forEach((e) => window.addEventListener(e, start, { passive: true }));
    return remove;
  }, [fadeTo]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      wantsOnRef.current = false;
      setPlaying(false);
      fadeTo(0);
      try {
        localStorage.setItem(KEY, "off");
      } catch {
        /* ignore */
      }
    } else {
      wantsOnRef.current = true;
      a.volume = 0;
      void a
        .play()
        .then(() => {
          startedRef.current = true;
          setPlaying(true);
          fadeTo(TARGET_VOL);
        })
        .catch(() => {});
      try {
        localStorage.setItem(KEY, "on");
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <>
      <audio ref={audioRef} src={asset("/audio/gaia-ma-ambient-v1.mp3")} loop preload="none" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Mute background music" : "Play background music"}
        aria-pressed={playing}
        className="fixed bottom-4 left-4 z-[118] inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0a0908]/70 text-ink ring-1 ring-line backdrop-blur-sm outline-none transition-colors duration-300 hover:bg-[#0a0908]/90 hover:text-accent focus-visible:ring-2 focus-visible:ring-accent print:hidden"
      >
        {playing ? (
          <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 8v4h3l4 3V5L7 8H4Z" fill="currentColor" />
            <path d="M14 7.5a3.5 3.5 0 0 1 0 5M16 5.5a6 6 0 0 1 0 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 8v4h3l4 3V5L7 8H4Z" fill="currentColor" />
            <path d="M14 8l4 4M18 8l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </>
  );
};
