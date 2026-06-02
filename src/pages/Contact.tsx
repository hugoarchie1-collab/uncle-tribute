import { useRef, useState, type FormEvent } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { Separator } from "../components/ui/separator";
import { Seo } from "../components/Seo";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { EYEBROW, EYEBROW_MUTED, TITLE, BTN_PRIMARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";

/**
 * /contact — full-page version of the EnquireModal form. Same mailto +
 * Web3Forms-optional submission path, same honeypot, mounted as a routed
 * page so it shows in the Nav / Footer and can be deep-linked from press,
 * partnerships, and customer enquiries.
 *
 * Visual register: a calm, well-spaced centred 640px column on the shared dark
 * shell — tuned to match the /memories header (a small display H1 + a compact
 * muted-sans intro, fluid clamp() rhythm), NOT the loud big-TITLE/large-SUBTITLE
 * stack. The form fields mirror the /memories share modal (solid bg-bg-soft,
 * py-3, named-token placeholder). Home design system throughout: Fraunces +
 * Hanken Grotesk, cream-on-near-black, accent reserved for eyebrow + focus/hover.
 */

type Status = "idle" | "submitting" | "success" | "error";

const SUBJECT = "Contact the estate";

export const Contact = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const firstFieldRef = useRef<HTMLInputElement>(null);

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
            subject: `${SUBJECT} — ${name}`,
            from_name: name,
            replyto: email,
            email,
            message,
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
    const href = `mailto:info@themandalacompany.com?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(composed)}`;
    window.location.href = href;
    setStatus("success");
    form.reset();
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <AmbientBackdrop opacity={0.4} />
      <Seo
        title="Contact the estate"
        description="Write to The Mandala Company, the estate of Stephen Meakin — questions about prints, editions, commissions or the work itself."
        url="/contact"
      />
      <Nav overlay />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[640px] 2xl:max-w-[720px] px-[clamp(1rem,5vw,2rem)] pt-[clamp(6rem,11vw,6.5rem)] pb-[clamp(3rem,7vw,4.5rem)]">
        <Reveal as="header">
          <p className={cn(EYEBROW, "m-0 mb-[clamp(0.625rem,2vw,0.875rem)]")}>
            Contact the estate
          </p>
          <h1 className={cn(TITLE, "m-0 !text-[clamp(26px,3.6vw,44px)] !leading-[1.05]")}>
            Write to the family.
          </h1>
          <p className="font-sans font-normal text-[14.5px] md:text-[15px] 2xl:text-[16px] leading-[1.55] text-ink-muted mt-[clamp(0.75rem,2vw,1.1rem)] m-0">
            For commissions, partnerships, press, or a question about a
            particular work, write to The Mandala Company. We are a small
            estate; every message is read by the family, and answered within a
            day or two.
          </p>
          <p className={cn(EYEBROW_MUTED, "mt-[clamp(1.1rem,3vw,1.5rem)] mb-[clamp(0.4rem,1.2vw,0.55rem)]")}>
            By post
          </p>
          <address className="font-sans font-normal not-italic text-[14px] leading-[1.55] text-ink-muted m-0">
            The Mandala Company — 213 Elm Drive, Hove,
            East Sussex, BN3 7JD, United Kingdom
          </address>
          <Separator className="bg-line mt-[clamp(1.25rem,3.5vw,2rem)]" />
        </Reveal>

        <Reveal as="section" className="mt-[clamp(1.25rem,3.5vw,2rem)]">
          {status === "success" ? (
            <div className="py-[clamp(0.5rem,2vw,1rem)]">
              <p className="font-display font-semibold tracking-[-0.025em] text-[clamp(22px,2.8vw,28px)] leading-[1.15] text-ink m-0 mb-[clamp(0.5rem,1.5vw,0.75rem)]">
                Thank you.
              </p>
              <p className="font-sans font-normal text-[14.5px] md:text-[15px] leading-[1.55] text-ink-muted m-0 max-w-[56ch]">
                Your message is on its way to{" "}
                <span className="text-ink">info@themandalacompany.com</span>.
                If your mail client did not open, we have copied the message to
                your clipboard; paste it into a new email from anywhere.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {/* Honeypot */}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <label className="block">
                  <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                    Name
                  </span>
                  <input
                    ref={firstFieldRef}
                    name="name"
                    required
                    autoComplete="name"
                    className="w-full bg-bg-soft ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink-faint transition-shadow"
                    placeholder="Jane Smith"
                  />
                </label>
                <label className="block">
                  <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                    Email
                  </span>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full bg-bg-soft ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink-faint transition-shadow"
                    placeholder="jane@example.com"
                  />
                </label>
              </div>

              <label className="block mb-5">
                <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                  Message
                </span>
                <textarea
                  name="message"
                  required
                  rows={6}
                  className="w-full bg-bg-soft ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] leading-[1.65] text-ink placeholder:text-ink-faint transition-shadow resize-none"
                  placeholder="A few lines about the work or enquiry."
                />
              </label>

              {errorMsg && (
                <p className="mb-4 font-sans text-[13px] text-accent m-0">{errorMsg}</p>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className={BTN_PRIMARY}
                >
                  {status === "submitting" ? "Sending…" : "Send your message"}
                  <span aria-hidden="true" className="ml-2">→</span>
                </button>
                <a
                  href="mailto:info@themandalacompany.com"
                  className="inline-flex items-center min-h-[44px] font-sans text-[14px] text-ink-muted hover:text-accent transition-colors"
                >
                  Or write directly
                  <span aria-hidden="true" className="ml-1.5">→</span>
                </a>
              </div>
            </form>
          )}
        </Reveal>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
