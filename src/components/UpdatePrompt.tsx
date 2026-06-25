import { useEffect, useRef, useState } from "react";

// The build id baked into THIS bundle at compile time (vite `define` in
// vite.config.ts). In dev it is still defined (Vite applies `define` in dev too),
// but dist/version.json doesn't exist, so the fetch 404s and nothing is shown.
declare const __APP_BUILD_ID__: string;

const VERSION_URL = `${import.meta.env.BASE_URL}version.json`;
// Don't hammer the endpoint when a tab is focused/blurred rapidly.
const MIN_CHECK_INTERVAL_MS = 30_000;

/**
 * Self-update prompt — the permanent fix for "my phone shows the old site".
 *
 * The SPA's index.html is served `must-revalidate`, but a browser (especially
 * mobile, or a tab that was backgrounded for a while) can keep a running app
 * that BOOTED from an older deploy until the user manually reloads — so a fresh
 * deploy stays invisible. This polls a tiny no-cache `/version.json` (written at
 * build time with this build's id) whenever the tab regains focus, and if the
 * LIVE build id differs from the one THIS bundle booted with, shows a quiet,
 * dismissible "a newer version is ready — refresh" bar.
 *
 * Safety: it NEVER force-reloads (so it can never interrupt a checkout) — the
 * visitor taps Refresh. Any network/parse error is swallowed (fail-safe: if in
 * doubt, show nothing). No backdrop-filter (house rule for fixed elements).
 */
export const UpdatePrompt = () => {
  const [ready, setReady] = useState(false);
  const lastCheck = useRef(0);
  const dismissed = useRef(false);

  useEffect(() => {
    const booted = typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : "";
    if (!booted) return; // id missing → never prompt

    let cancelled = false;

    const check = async () => {
      if (dismissed.current || cancelled) return;
      const now = Date.now();
      if (now - lastCheck.current < MIN_CHECK_INTERVAL_MS) return;
      lastCheck.current = now;
      try {
        const res = await fetch(`${VERSION_URL}?_=${now}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { id?: unknown };
        const live = typeof data?.id === "string" ? data.id : "";
        if (live && live !== booted && !cancelled) setReady(true);
      } catch {
        /* offline / non-JSON / parse error → ignore */
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", () => void check());
    // One check shortly after mount catches a deploy that landed moments ago.
    const t = window.setTimeout(() => void check(), 8_000);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearTimeout(t);
    };
  }, []);

  if (!ready) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[115] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none"
    >
      <div className="pointer-events-auto flex items-center gap-3 sm:gap-4 rounded-full border border-line bg-[#0a0908]/95 px-5 py-3 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)]">
        <span className="font-sans text-[13px] leading-snug text-ink">
          A newer version of the site is ready.
        </span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-full bg-accent px-4 py-1.5 font-sans text-[12px] font-bold uppercase tracking-[0.12em] text-bg transition-opacity duration-300 hover:opacity-90"
        >
          Refresh
        </button>
        <button
          type="button"
          aria-label="Dismiss update notice"
          onClick={() => {
            dismissed.current = true;
            setReady(false);
          }}
          className="shrink-0 text-ink-muted hover:text-ink transition-colors duration-300 text-[18px] leading-none"
        >
          &times;
        </button>
      </div>
    </div>
  );
};
