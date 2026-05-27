import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EnquireModalProps {
  open: boolean;
  onClose: () => void;
  /** Eyebrow above the modal title — e.g. "Prints", "Foundation". */
  eyebrow: string;
  /** Big title — e.g. "Print enquiries". */
  title: string;
  /** Subject line pre-filled into the email body. */
  subject: string;
  /** Optional intro paragraph above the form. */
  intro?: string;
}

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Cinematic enquiry modal — collects name / email / message and submits it.
 *
 * If `VITE_WEB3FORMS_KEY` is configured (free signup at web3forms.com), the
 * form POSTs to api.web3forms.com which then emails info@themandalacompany.com.
 * If the key is unset, the form falls back to a `mailto:` link prefilled
 * with the user's message body, AND copies the same body to the clipboard
 * so users without a configured mail client can paste it into webmail.
 *
 * To enable real form submission:
 *   1. Sign up at https://web3forms.com (free, no credit card)
 *   2. Add `VITE_WEB3FORMS_KEY=<your-access-key>` in the Vercel project's
 *      environment variables (Settings → Environment Variables)
 *   3. Redeploy.
 */
export const EnquireModal = ({
  open,
  onClose,
  eyebrow,
  title,
  subject,
  intro,
}: EnquireModalProps) => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Close on Escape, lock body scroll while open, focus first field on open.
  // onClose is read via a ref so the effect doesn't re-run (and reset the
  // form mid-submit) when the parent re-creates its arrow function.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) {
      // Open transitioned to false — reset to idle so the next open is fresh.
      setStatus("idle");
      setErrorMsg("");
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 80);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [open]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();

    if (!name || !email || !message) {
      setStatus("error");
      setErrorMsg("Please fill in all fields.");
      return;
    }

    const accessKey = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined;

    // Path A — Web3Forms backend (real email send).
    if (accessKey) {
      try {
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            access_key: accessKey,
            subject: `${subject} — ${name}`,
            from_name: name,
            replyto: email,
            email,
            message,
            // Spam honeypot — bots fill the hidden "botcheck" field.
            botcheck: data.get("botcheck") || "",
          }),
        });
        if (res.ok) {
          setStatus("success");
          form.reset();
          return;
        }
        const body = await res.json().catch(() => ({}));
        setStatus("error");
        setErrorMsg(body?.message || "Couldn't send right now. Please try again or email us directly.");
        return;
      } catch {
        // Fall through to the mailto path on network failure.
      }
    }

    // Path B — mailto + clipboard fallback. Works without any backend setup.
    const composed = `From: ${name} <${email}>\n\n${message}`;
    try {
      await navigator.clipboard?.writeText(composed);
    } catch {
      /* clipboard may be unavailable on insecure contexts — non-fatal */
    }
    const href = `mailto:info@themandalacompany.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(composed)}`;
    window.location.href = href;
    setStatus("success");
    form.reset();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="enquire-title"
        >
          {/* Backdrop — click anywhere to dismiss */}
          <button
            type="button"
            aria-label="Close enquiry form"
            onClick={onClose}
            className="absolute inset-0 bg-black/72 backdrop-blur-md cursor-pointer"
          />

          {/* Modal panel */}
          <motion.div
            className="relative w-full max-w-[560px] bg-bg-soft ring-1 ring-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.7)] max-h-[90vh] overflow-y-auto"
            initial={{ y: 24, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="px-7 sm:px-9 py-9 sm:py-11">
              <div className="flex items-start justify-between gap-4 mb-7">
                <div>
                  <p className="font-sans text-[11px] font-bold tracking-[0.34em] uppercase text-accent m-0 mb-3">
                    {eyebrow}
                  </p>
                  <h2
                    id="enquire-title"
                    className="font-display font-bold tracking-[-0.025em] text-[clamp(24px,3vw,32px)] leading-[1.15] text-ink m-0"
                  >
                    {title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="shrink-0 text-ink/55 hover:text-ink transition-colors w-9 h-9 -mr-2 -mt-2 inline-flex items-center justify-center rounded-full hover:bg-white/5"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M3 3 15 15M15 3 3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {intro && (
                <p className="font-sans font-normal text-[14px] sm:text-[15px] leading-[1.7] text-ink/75 m-0 mb-7">
                  {intro}
                </p>
              )}

              {status === "success" ? (
                <div className="py-6">
                  <p className="font-display font-bold text-[22px] text-ink m-0 mb-3">Thank you.</p>
                  <p className="font-sans font-normal text-[14.5px] leading-[1.7] text-ink/75 m-0">
                    Your message has been sent on its way to{" "}
                    <span className="text-ink">info@themandalacompany.com</span>. If your mail
                    client didn't open, the message has been copied to your clipboard — paste it
                    into a new email from anywhere.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-7 inline-flex items-center bg-ink text-bg px-6 py-3 font-sans text-[11px] font-bold tracking-[0.2em] uppercase rounded-full hover:bg-accent hover:text-ink transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  {/* Honeypot — visually hidden, bots fill it, we reject if present */}
                  <input
                    type="text"
                    name="botcheck"
                    tabIndex={-1}
                    autoComplete="off"
                    style={{ position: "absolute", left: "-9999px" }}
                    aria-hidden="true"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <label className="block">
                      <span className="block font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-ink/55 mb-2">
                        Name
                      </span>
                      <input
                        ref={firstFieldRef}
                        name="name"
                        required
                        autoComplete="name"
                        className="w-full bg-bg ring-1 ring-white/10 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
                        placeholder="Jane Smith"
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
                        className="w-full bg-bg ring-1 ring-white/10 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
                        placeholder="jane@example.com"
                      />
                    </label>
                  </div>

                  <label className="block mb-5">
                    <span className="block font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-ink/55 mb-2">
                      Message
                    </span>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      className="w-full bg-bg ring-1 ring-white/10 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] leading-[1.6] text-ink placeholder:text-ink/30 transition-shadow resize-none"
                      placeholder="A few lines about what you're after."
                    />
                  </label>

                  {errorMsg && (
                    <p className="mb-4 font-sans text-[13px] text-accent m-0">{errorMsg}</p>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
                    <button
                      type="submit"
                      disabled={status === "submitting"}
                      className="inline-flex items-center justify-center bg-ink text-bg px-7 py-3.5 font-sans text-[11px] font-bold tracking-[0.18em] uppercase rounded-full hover:bg-accent hover:text-ink transition-colors disabled:opacity-60"
                    >
                      {status === "submitting" ? "Sending…" : "Send"}{" "}
                      <span aria-hidden="true" className="ml-2">→</span>
                    </button>
                    <a
                      href="mailto:info@themandalacompany.com"
                      className="font-sans text-[12px] tracking-[0.06em] text-ink/55 hover:text-ink transition-colors"
                    >
                      Or write directly →
                    </a>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
