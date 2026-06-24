import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

// ── Stale-deploy auto-recovery ──────────────────────────────────────────────
// After a new deploy, the content-hashed JS/CSS chunks from the PREVIOUS build
// are gone. A browser holding a stale index.html (or a long-lived tab) then
// requests a chunk that now 404s — a lazy route won't load and the app appears
// to "glitch out", and the user has to refresh by hand to make it work (Hugo).
// The HTML is already `max-age=0, must-revalidate` (vercel.json) so a fresh load
// gets new hashes; this is the belt-and-braces for an in-flight/cached tab:
// when a dynamic import fails we force a ONE-TIME hard reload (gated by
// sessionStorage so a genuinely persistent error can NEVER become an infinite
// reload loop) — the reload revalidates the HTML and pulls the new chunks, so
// the user never has to refresh manually.
const RELOAD_FLAG = "tasm.chunkReload.v1";
// Match ONLY genuine code-split chunk-load failures — NOT generic "Failed to
// fetch" (analytics/API/network blips), which must never trigger a reload.
// "Failed to fetch dynamically imported module" is caught via the specific
// "dynamically imported module" alternative.
const isChunkError = (msg: string): boolean =>
  /Loading chunk \d|Loading CSS chunk|dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
    msg,
  );
const recover = (reason: string): void => {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return; // already retried this session
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    /* storage blocked (lockdown) — fall through and reload once anyway */
  }
  console.warn("[stale-deploy] chunk load failed → reloading:", reason);
  window.location.reload();
};

// Vite fires this when a <link rel=modulepreload> / dynamic import() fails.
window.addEventListener("vite:preloadError", (e: Event) => {
  e.preventDefault(); // stop Vite from rethrowing; we handle it by reloading
  recover("vite:preloadError");
});
window.addEventListener("error", (e: ErrorEvent) => {
  if (e?.message && isChunkError(e.message)) recover(e.message);
});
window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
  const msg =
    (e?.reason && (e.reason.message as string)) || String(e?.reason ?? "");
  if (isChunkError(msg)) recover(msg);
});
// Once the app has run stably for a few seconds, clear the retry gate so a
// LATER stale deploy in the same session can recover again.
setTimeout(() => {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* ignore */
  }
}, 5000);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
