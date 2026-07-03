import { useState, type FormEvent } from "react";
import type { BasketItem } from "../lib/basket";

/**
 * "Save your basket — we'll email it to you" affordance for the Basket page.
 *
 * Why this exists: localStorage baskets get lost when the buyer switches
 * device or clears storage. We don't track them server-side (no DB on the
 * project), so the dignified play is a quiet inline option: enter your
 * email, get the basket as an estate-branded email with a deep link back.
 * Cross-device pickup + a soft re-engagement touch without ever feeling
 * like an abandoned-basket pursuit.
 *
 * POSTs to /api/email-basket. The endpoint re-resolves prices against its
 * own allowlist — we never trust client-side titles/prices.
 *
 * Renders nothing if the basket is empty. The exit-intent toast (see
 * ExitSaveBasket.tsx) is a separate component that talks to the same
 * endpoint when triggered.
 */

interface EmailMyBasketProps {
  items: BasketItem[];
}

type Status = "idle" | "sending" | "success" | "error";

export const EmailMyBasket = ({ items }: EmailMyBasketProps) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (items.length === 0) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const name = String(data.get("name") || "").trim();

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
          name,
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
        return;
      }
      let msg = "Couldn't send right now. Please try again in a moment.";
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
      setErrorMsg("Network error. Please try again.");
    }
  };

  return (
    <div className="mt-10 pt-8 border-t border-line">
      {!open && status !== "success" && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-sans text-[13px] font-bold tracking-[0.04em] text-ink/55 hover:text-accent transition-colors bg-transparent border-0 p-0 cursor-pointer"
        >
          Save your basket — email it to me
          <span aria-hidden="true" className="ml-2">→</span>
        </button>
      )}

      {open && status !== "success" && (
        <div className="max-w-[560px]">
          <p className="font-sans text-[13px] font-bold tracking-[0.04em] text-ink/55 m-0 mb-3">
            Save your basket
          </p>
          <p className="font-sans font-normal text-[14px] leading-[1.7] text-ink/70 m-0 mb-4">
            We'll email this basket to you so you can pick it up from any
            device. The estate keeps no copy — the prints stay in your
            browser until you're ready to check out.
          </p>
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
              <input
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Your name (optional)"
                className="flex-1 bg-bg ring-1 ring-line focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[14px] text-ink placeholder:text-ink/30 transition-shadow"
              />
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="flex-1 bg-bg ring-1 ring-line focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[14px] text-ink placeholder:text-ink/30 transition-shadow"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex items-center bg-ink text-bg px-6 py-3 font-sans text-[13px] font-bold tracking-[0.04em] rounded-full hover:bg-accent hover:text-ink transition-colors disabled:opacity-60"
              >
                {status === "sending" ? "Sending…" : "Email me my basket"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setErrorMsg("");
                  setStatus("idle");
                }}
                className="font-sans text-[13px] tracking-[0.04em] text-ink/50 hover:text-ink transition-colors bg-transparent border-0 p-0 cursor-pointer"
              >
                Cancel
              </button>
            </div>
            {errorMsg && (
              <p className="mt-3 font-sans text-[13px] text-accent m-0">{errorMsg}</p>
            )}
          </form>
        </div>
      )}

      {status === "success" && (
        <p className="font-sans text-[14px] leading-[1.7] text-ink/75 m-0 max-w-[560px]">
          Sent. Check your inbox — the email carries a link straight back to
          your basket whenever you're ready.
        </p>
      )}
    </div>
  );
};
