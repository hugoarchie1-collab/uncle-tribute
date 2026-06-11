import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { subscribeToAdds, type AddNotification } from "../lib/basket";
import { getPaintingById } from "../data/paintings";

/**
 * BasketToast — the quiet on-screen confirmation shown whenever an item is
 * added to the basket (Hugo: "when you add to basket I need an animation …
 * so customers know when they added to basket — like 'Added to basket'").
 *
 * Design register: this is NOT a loud green SaaS success banner. It's a
 * small, dignified card in the site's dark-shell / cream-ink palette
 * (bg-bg-soft + warm hairline), Hanken text, a hairline-circled check in the
 * rust accent, and the painting's title beneath. Motion is restrained — a
 * short fade + a few-pixel slide, matched to the site's `ease-smooth` curve,
 * and fully disabled under `prefers-reduced-motion` (a straight fade only).
 *
 * Behaviour:
 *  - Mounted ONCE globally (in App.tsx, beside <Analytics/>). It listens to
 *    the basket store's add-notification side-channel (`subscribeToAdds`), so
 *    no individual "Add to basket" button needs any wiring — every add path
 *    (PaintingDetail buttons, "Buy now", bundle adds) flows through the
 *    store's `addItem` and therefore through here.
 *  - Auto-dismisses ~2.5s after the last add.
 *  - Rapid successive adds REFRESH the same toast in place (the content and
 *    the dismiss timer reset) rather than stacking — keyed on the
 *    notification id so the title cross-fades on each new add.
 *  - Carries a quiet "View basket →" link so the confirmation offers a next
 *    step, not a dead end. The link is keyboard-focusable but never steals
 *    focus, and it does NOT change the dismiss timing — the toast still
 *    auto-hides on the same 2.5s clock. Clicking it dismisses immediately
 *    (the reader is navigating to the basket; the toast's job is done).
 *
 * Positioning: bottom-centre, high z-index but deliberately BELOW modals
 * (z-200) and the custom cursor (z-250) — `z-[120]`.
 *
 * Accessibility: `role="status"` + `aria-live="polite"` announces "Added to
 * basket — <title>" without stealing focus.
 */

const DISMISS_MS = 2500;

interface ToastState {
  /** Notification id — drives the in-place refresh on rapid successive adds. */
  id: number;
  title: string;
}

export const BasketToast = () => {
  const reduce = useReducedMotion();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const clear = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const onAdd = (n: AddNotification) => {
      const painting = getPaintingById(n.item.paintingId);
      // Defensive fallback — the store reconciles against the catalogue, so a
      // missing painting here is near-impossible, but never show an empty card.
      const title = painting?.title ?? "Your print";
      setToast({ id: n.id, title });
      clear();
      timerRef.current = window.setTimeout(() => setToast(null), DISMISS_MS);
    };

    const unsubscribe = subscribeToAdds(onAdd);
    return () => {
      unsubscribe();
      clear();
    };
  }, []);

  // Slide distance collapses to 0 under reduced-motion (pure fade).
  const offset = reduce ? 0 : 14;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-5 z-[120] flex justify-center px-5"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: offset }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: offset }}
            transition={{ duration: 0.34, ease: [0.22, 0.61, 0.36, 1] }}
            className="pointer-events-auto flex max-w-[420px] items-center gap-3.5 bg-bg-soft ring-1 ring-line px-5 py-3.5 shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
          >
            {/* Hairline-circled check — rust accent, not a filled green badge. */}
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-accent/55 text-accent"
            >
              <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
                <path
                  d="M3.5 9.5 7.25 13 14.5 5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-ink-muted">
                Added to basket
              </span>
              <span className="mt-0.5 block truncate font-sans text-[14px] leading-snug text-ink">
                {toast.title}
              </span>
            </span>
            {/* Quiet next step — hairline-divided micro link to the basket.
                Focusable (global :focus-visible accent outline applies) but
                never focused programmatically; dismiss timing is untouched. */}
            <Link
              to="/basket"
              onClick={() => setToast(null)}
              className="ml-1 shrink-0 self-center whitespace-nowrap border-l border-line pl-3.5 font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted transition-colors duration-300 hover:text-accent"
            >
              View basket <span aria-hidden="true">→</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
