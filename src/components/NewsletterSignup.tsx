import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { cn } from "../lib/cn";
import { EYEBROW_MUTED } from "./ui/tokens";

/**
 * Newsletter signup ("Friends & Family" list).
 *
 * Estate-register sign-up: name + email, POSTed to /api/newsletter-subscribe,
 * which sends a Resend-backed Welcome email and (optionally) mints a single-
 * use Stripe promo code. Returns a quiet inline confirmation — no popups,
 * no toasts, no "10% OFF" badges. Tone-matched to EnquireModal.
 *
 * Three visual variants:
 *   - "panel"   — full panel for the Welcome page Estate section / About page
 *   - "inline"  — single-row, used in the Basket page secondary area
 *   - "footer"  — slim row, intended for the Footer column
 *
 * The endpoint is the same for all three; the markup is the only thing that
 * changes. If the endpoint is missing (404 in local preview, or env vars
 * unconfigured), the form still resolves to a friendly success state — we
 * never reveal infra errors to a buyer.
 */

interface NewsletterSignupProps {
  variant?: "panel" | "inline" | "footer";
  /** Override the eyebrow above the title (panel variant only). */
  eyebrow?: string;
  /** Override the title (panel variant only). */
  title?: string;
  /** Override the intro paragraph (panel variant only). */
  intro?: string;
}

type Status = "idle" | "submitting" | "success" | "error";

const DEFAULT_EYEBROW = "Friends & Family";
const DEFAULT_TITLE = "A note when there's something to say.";
const DEFAULT_INTRO =
  "The Mandala Company sends a quiet quarterly note when a new edition is released or a Stephen Meakin painting goes on view. Leave your name to be told first.";

export const NewsletterSignup = ({
  variant = "panel",
  eyebrow = DEFAULT_EYEBROW,
  title = DEFAULT_TITLE,
  intro = DEFAULT_INTRO,
}: NewsletterSignupProps) => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    // Honeypot — bots fill the hidden field.
    if (String(data.get("botcheck") || "").length > 0) {
      setStatus("success");
      form.reset();
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      setErrorMsg("Please enter a valid email.");
      return;
    }

    try {
      const res = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, source: variant }),
      });
      // 200 / 202 / 204 → success. Anything else → friendly success too
      // (we don't want to confuse a collector with an infra error). The
      // operator sees the real outcome in Vercel function logs.
      if (res.ok) {
        try {
          window.localStorage.setItem("tasm.subscribed", "true");
          if (name) window.localStorage.setItem("tasm.subscriberName", name);
        } catch {
          /* private mode — non-fatal */
        }
        setStatus("success");
        form.reset();
        return;
      }
      // Soft-success even on non-ok — operator log captures the truth.
      setStatus("success");
      form.reset();
    } catch {
      // Network drop: treat as success in copy. The user can re-submit later
      // if it really failed (they'll know because no email arrived).
      setStatus("success");
      form.reset();
    }
  };

  // -----------------------------------------------------------------------
  // FOOTER variant — slim single-row, accent-only on focus.
  // -----------------------------------------------------------------------
  if (variant === "footer") {
    return (
      <div>
        <h3 className={cn(EYEBROW_MUTED, "mb-5")}>Friends &amp; Family</h3>
        {status === "success" ? (
          <p className="font-sans text-[13px] leading-[1.65] text-ink-muted m-0">
            Thank you. We'll be in touch when the next edition is released.
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <input
              type="text"
              name="botcheck"
              tabIndex={-1}
              autoComplete="off"
              style={{
                position: "absolute",
                width: "1px",
                height: "1px",
                padding: 0,
                margin: "-1px",
                overflow: "hidden",
                clip: "rect(0,0,0,0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
              aria-hidden="true"
            />
            <label className="block">
              <span className="block font-sans text-[13px] leading-[1.6] text-ink-muted mb-3">
                Quarterly notes on new editions and exhibitions.
              </span>
              <div className="flex w-full items-stretch ring-1 ring-line focus-within:ring-accent transition-shadow">
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="flex-1 min-w-0 bg-transparent px-3 py-2.5 font-sans text-[14px] text-ink placeholder:text-ink-faint focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="shrink-0 whitespace-nowrap px-4 font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-ink-muted hover:text-accent transition-colors disabled:opacity-60 bg-transparent border-0 border-l border-line cursor-pointer"
                >
                  {status === "submitting" ? "…" : "Subscribe"}
                </button>
              </div>
            </label>
            {errorMsg && (
              <p className="mt-2 font-sans text-[12px] text-accent m-0">{errorMsg}</p>
            )}
            <p className="font-sans text-[11px] italic text-ink-fade mt-3 m-0">
              By subscribing you agree to our{" "}
              <Link to="/privacy" className="underline transition-colors hover:text-ink">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // INLINE variant — for the empty-basket page and similar contexts.
  // -----------------------------------------------------------------------
  if (variant === "inline") {
    return (
      <div className="border-t border-white/10 pt-8 mt-8">
        <p className="font-sans text-[10px] font-bold tracking-[0.32em] uppercase text-ink/55 m-0 mb-3">
          {eyebrow}
        </p>
        {status === "success" ? (
          <p className="font-sans text-[14.5px] leading-[1.7] text-ink/75 m-0 max-w-[520px]">
            Thank you. Your name has been added to Friends &amp; Family. We'll write when
            the next edition is released.
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="max-w-[560px]">
            <input
              type="text"
              name="botcheck"
              tabIndex={-1}
              autoComplete="off"
              style={{
                position: "absolute",
                width: "1px",
                height: "1px",
                padding: 0,
                margin: "-1px",
                overflow: "hidden",
                clip: "rect(0,0,0,0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
              aria-hidden="true"
            />
            <p className="font-sans font-normal text-[14.5px] leading-[1.7] text-ink/75 m-0 mb-4">
              {intro}
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                name="name"
                type="text"
                autoComplete="name"
                aria-label="Your name"
                placeholder="Your name"
                className="flex-1 bg-bg ring-1 ring-white/12 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[14px] text-ink placeholder:text-ink/30 transition-shadow"
              />
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                aria-label="Email address"
                placeholder="you@example.com"
                className="flex-1 bg-bg ring-1 ring-white/12 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[14px] text-ink placeholder:text-ink/30 transition-shadow"
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className="inline-flex items-center justify-center bg-ink text-bg px-6 py-3 font-sans text-[10px] font-bold tracking-[0.22em] uppercase rounded-full hover:bg-accent hover:text-ink transition-colors disabled:opacity-60"
              >
                {status === "submitting" ? "Sending…" : "Subscribe"}
              </button>
            </div>
            {errorMsg && (
              <p className="mt-3 font-sans text-[13px] text-accent m-0">{errorMsg}</p>
            )}
            <p className="font-sans text-[11px] italic text-ink/55 mt-2 m-0">
              By subscribing you agree to our{" "}
              <Link to="/privacy" className="underline hover:text-ink/70">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // PANEL variant — default, for Welcome page Estate section / About page.
  // -----------------------------------------------------------------------
  return (
    <div className="border border-white/10 bg-bg-soft/30 p-7 sm:p-9 md:p-10 max-w-[640px]">
      <p className="font-sans text-[11px] font-bold tracking-[0.34em] uppercase text-accent m-0 mb-4">
        {eyebrow}
      </p>
      <h3 className="font-display font-bold tracking-[-0.025em] text-[clamp(22px,2.6vw,30px)] leading-[1.15] text-ink m-0 mb-5">
        {title}
      </h3>

      {status === "success" ? (
        <div>
          <p className="font-sans font-normal text-[14.5px] sm:text-[15.5px] leading-[1.7] text-ink/80 m-0 mb-2">
            Thank you. Your name has been added to Friends &amp; Family.
          </p>
          <p className="font-sans font-normal text-[14px] leading-[1.7] text-ink/65 m-0">
            A short welcome from the estate is on its way to your inbox.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <input
            type="text"
            name="botcheck"
            tabIndex={-1}
            autoComplete="off"
            style={{
              position: "absolute",
              width: "1px",
              height: "1px",
              padding: 0,
              margin: "-1px",
              overflow: "hidden",
              clip: "rect(0,0,0,0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
            aria-hidden="true"
          />

          <p className="font-sans font-normal text-[14.5px] sm:text-[15.5px] leading-[1.7] text-ink/75 m-0 mb-6">
            {intro}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="block font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-ink/55 mb-2">
                Name
              </span>
              <input
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Jane Smith"
                className="w-full bg-bg ring-1 ring-white/12 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
              />
            </label>
            <label className="block">
              <span className="block font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-ink/55 mb-2">
                Email
              </span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="jane@example.com"
                className="w-full bg-bg ring-1 ring-white/12 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
              />
            </label>
          </div>

          {errorMsg && (
            <p className="mb-3 font-sans text-[13px] text-accent m-0">{errorMsg}</p>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex items-center bg-ink text-bg px-7 py-3.5 font-sans text-[11px] font-bold tracking-[0.18em] uppercase rounded-full hover:bg-accent hover:text-ink transition-colors disabled:opacity-60"
            >
              {status === "submitting" ? "Subscribing…" : "Subscribe"}
              <span aria-hidden="true" className="ml-2">→</span>
            </button>
            <p className="font-sans text-[11px] leading-[1.5] text-ink/55 m-0">
              No more than four notes a year. Unsubscribe in a click.
            </p>
          </div>
          <p className="font-sans text-[11px] italic text-ink/55 mt-2 m-0">
            By subscribing you agree to our{" "}
            <Link to="/privacy" className="underline hover:text-ink/70">
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      )}
    </div>
  );
};
