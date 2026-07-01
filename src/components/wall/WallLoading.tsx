// =============================================================================
// WallLoading — the Suspense fallback shown while the "See on Your Wall" modal
// chunk (and model-viewer) load. Portalled to <body> so it escapes the app
// shell's transform containing block (same reason SeeOnYourWall portals), and so
// the customer ALWAYS gets immediate feedback on tap — never a dead "nothing
// happened" gap on a slow connection.
// =============================================================================

import { createPortal } from "react-dom";

export const WallLoading = () =>
  createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="Opening the wall preview"
    >
      <span className="flex flex-col items-center gap-3">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-accent"
          aria-hidden="true"
        />
        <span className="font-sans text-[13px] tracking-[0.04em] text-ink/85">Opening…</span>
      </span>
    </div>,
    document.body,
  );

export default WallLoading;
