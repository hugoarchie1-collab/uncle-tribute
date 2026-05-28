import { useEffect, useState, type FormEvent } from "react";
import type { BasketItem } from "../lib/basket";

/**
 * Gentle exit-intent affordance for the basket page ONLY.
 *
 * Trigger: the buyer's cursor moves toward the top of the viewport (i.e.
 * toward the browser chrome / tab strip — a strong signal of "about to
 * leave") while they have items in their basket. We show a non-modal toast
 * at the bottom-right of the page that says "Save your basket — we'll
 * email it to you." Single dismissal kills it for the session.
 *
 * Crucially this is NOT a modal — no scroll lock, no backdrop, no
 * interruption of browsing. The toast is dismissable in two ways: the X
 * button, or simply by ignoring it. Once shown it does not re-appear in
 * the same session (sessionStorage flag).
 *
 * Targets a different sensory channel than the inline "Save your basket"
 * link in EmailMyBasket.tsx — same endpoint, different surface area.
 *
 * Mobile: skipped — there's no mouse leaving "up" to detect, and exit-
 * intent on touch devices is universally annoying.
 */

interface ExitSaveBasketProps {
  items: BasketItem[];
}

type Status = "idle" | "sending" | "success" | "error";

const SHOWN_KEY = "tasm.exitToast.shownThisSession";

const isMouseDevice = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

export const ExitSaveBasket = ({ items }: ExitSaveBasketProps) => {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (items.length === 0) return;
    if (typeof window === "undefined") return;
    if (!isMouseDevice()) return;
    try {
      if (window.sessionStorage.getItem(SHOWN_KEY) === "true") return;
    } catch {
      /* private mode — ignore and continue */
    }

    let armed = true;
    // We arm only after a small delay — don't fire on page load (e.g. if
    // the buyer arrived with their mouse near the top of the window).
    const armTimer = window.setTimeout(() => {
      armed = true;
    }, 4000);
    armed = false;

    const onMouseLeave = (e: MouseEvent) => {
      if (!armed) return;
      // Only fire on top-edge exits — left/right/bottom are typically the
      // buyer reaching for the side panel or scrollbar, not leaving.
      if (e.clientY > 12) return;
      setVisible(true);
      try {
        window.sessionStorage.setItem(SHOWN_KEY, "true");
      } catch {
        /* non-fatal */
      }
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
    };

    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    return () => {
      window.clearTimeout(armTimer);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [items.length]);

  if (!visible || items.length === 0) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      setErrorMsg("Please enter a valid email.");
      return;
    }

    try {
      const res = await fetch("/api/email-basket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          items: items.map((item) => ({
            paintingId: item.paintingId,
            colourwayName: item.colourwayName,
            tierId: item.tierId,
            framing: item.framing,
            embellished: item.embellished,
          })),
        }),
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
        window.setTimeout(() => setVisible(false), 4000);
        return;
      }
      let msg = "Couldn't send. Please try again.";
      try {
        const body = (await res.json()) as { error?: string };
        if (body.error) msg = body.error;
      } catch {
        /* non-JSON response */
      }
      setStatus("error");
      setErrorMsg(msg);
    } catch {
      setStatus("error");
      setErrorMsg("Network error.");
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[80] max-w-[360px] bg-bg-soft ring-1 ring-white/12 shadow-[0_24px_70px_rgba(0,0,0,0.6)] p-5 pr-9 animate-[fadeInUp_0.35s_ease-out]"
    >
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        className="absolute top-2 right-2 text-ink/45 hover:text-ink transition-colors w-7 h-7 inline-flex items-center justify-center bg-transparent border-0 cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M3 3 15 15M15 3 3 15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-accent m-0 mb-2">
        Save your basket
      </p>
      {status === "success" ? (
        <p className="font-sans text-[13.5px] leading-[1.6] text-ink/80 m-0">
          Sent. The email's on its way — pick up from any device.
        </p>
      ) : (
        <>
          <p className="font-sans text-[13.5px] leading-[1.6] text-ink/75 m-0 mb-3">
            We'll email this basket to you so you can come back to it whenever
            suits.
          </p>
          <form onSubmit={handleSubmit} noValidate className="flex gap-2">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="flex-1 bg-bg ring-1 ring-white/12 focus:ring-accent focus:outline-none px-3 py-2 font-sans text-[13px] text-ink placeholder:text-ink/30 transition-shadow"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="bg-ink text-bg px-4 font-sans text-[10px] font-bold tracking-[0.22em] uppercase hover:bg-accent hover:text-ink transition-colors disabled:opacity-60 border-0 cursor-pointer"
            >
              {status === "sending" ? "…" : "Send"}
            </button>
          </form>
          {errorMsg && (
            <p className="mt-2 font-sans text-[12px] text-accent m-0">{errorMsg}</p>
          )}
        </>
      )}
    </div>
  );
};
