/**
 * Legacy in-app path aliases → their canonical destination.
 *
 * ONE source of truth, used twice:
 *  1. App.tsx renders a `<Route element={<Navigate replace/>}>` for each entry,
 *     so an in-app link to an old path still lands correctly.
 *  2. PageTransition keys its AnimatePresence crossfade on `canonicalPath()`,
 *     NOT the raw pathname.
 *
 * ⚠️ (2) is load-bearing, not tidiness. AnimatePresence runs `mode="wait"`: a
 * changed key holds the OUTGOING subtree mounted until its exit finishes before
 * the incoming one enters. A route-level `<Navigate>` changes the key during
 * that very render, so the alias page exits while the element that replaced it
 * never enters — the reader is left on a BLANK page with only the site chrome.
 * (Reproduced 2026-09-02 on /verify and /gallery, which had shipped that way;
 * production hid it because vercel.json 301s these paths at the edge, so only
 * client-side navigation could reach the bug.) Mapping an alias to its target's
 * key means the key never changes across the redirect, so there is no exit /
 * enter cycle and the destination renders immediately.
 *
 * Keep every entry mirrored in vercel.json's `redirects` so a cold URL is
 * 301'd at the edge (crawlers, old emails, printed leaflets) rather than
 * relying on the SPA.
 */
export const LEGACY_REDIRECTS: Record<string, string> = {
  "/gallery": "/collections",
  "/verify": "/auth",
  "/representatives": "/trade",
  // 2026-09-02 page consolidation — the FAQ became an on-page accordion and the
  // three policy pages became one anchored /legal page.
  "/faq": "/contact#faq",
  "/privacy": "/legal#privacy",
  "/terms": "/legal#terms",
  "/returns": "/legal#returns",
};

/** The pathname a route crossfade should key on — an alias borrows its
 *  target's key so redirecting never triggers an exit/enter swap. */
export const canonicalPath = (pathname: string): string => {
  const target = LEGACY_REDIRECTS[pathname];
  return target ? target.split("#")[0] : pathname;
};
