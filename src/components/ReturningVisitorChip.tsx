import { useEffect, useState } from "react";

/**
 * Quiet "Welcome back" affordance for returning subscribers.
 *
 * If a visitor previously signed up via NewsletterSignup (which sets
 * `localStorage.tasm.subscribed = "true"` and optionally `tasm.subscriberName`)
 * this renders a single hairline line of text, intended to live in the Nav
 * area. One-shot per session — once dismissed (or once auto-cleared after
 * 8 seconds), it stays hidden until the next session.
 *
 * The chip is deliberately minimal — no badge, no animation, no CTA. The
 * estate is acknowledging you, not pushing you anywhere. If we ever decide
 * the register can take it, the chip could optionally surface a stored
 * thank-you code via a quiet link — for now it's pure recognition.
 *
 * Renders nothing on first visit, in private mode, or if the visitor has
 * never subscribed.
 */

const SUBSCRIBED_KEY = "tasm.subscribed";
const NAME_KEY = "tasm.subscriberName";
const SHOWN_KEY = "tasm.welcomeBack.shownThisSession";

/**
 * Resolve the chip's display state up-front (synchronous, render-time)
 * so we don't have to round-trip through useEffect + setState — which
 * trips react-hooks/set-state-in-effect. The localStorage / sessionStorage
 * reads are cheap and idempotent.
 */
const resolveInitialState = (): { visible: boolean; firstName: string | null } => {
  if (typeof window === "undefined") return { visible: false, firstName: null };
  try {
    if (window.localStorage.getItem(SUBSCRIBED_KEY) !== "true") {
      return { visible: false, firstName: null };
    }
    if (window.sessionStorage.getItem(SHOWN_KEY) === "true") {
      return { visible: false, firstName: null };
    }
    const name = window.localStorage.getItem(NAME_KEY);
    const trimmed = name?.trim().split(/\s+/)[0] ?? null;
    return { visible: true, firstName: trimmed && trimmed.length > 0 ? trimmed : null };
  } catch {
    return { visible: false, firstName: null };
  }
};

export const ReturningVisitorChip = () => {
  const [state, setState] = useState(resolveInitialState);
  const { visible, firstName } = state;

  useEffect(() => {
    if (typeof window === "undefined" || !visible) return;
    try {
      window.sessionStorage.setItem(SHOWN_KEY, "true");
    } catch {
      /* private mode — ignore */
    }
    const t = window.setTimeout(
      () => setState((s) => (s.visible ? { ...s, visible: false } : s)),
      8000,
    );
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      className="hidden md:inline-flex items-center font-sans text-[10px] tracking-[0.28em] uppercase text-ink/55 animate-[fadeIn_0.45s_ease-out]"
    >
      Welcome back{firstName ? `, ${firstName}` : ""}
    </span>
  );
};
