import { useRef, useState, type FormEvent } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Separator } from "../components/ui/separator";
import { Seo } from "../components/Seo";

/**
 * /contact — full-page version of the EnquireModal form. Same mailto +
 * Web3Forms-optional submission path, same honeypot, mounted as a routed
 * page so it shows in the Nav / Footer and can be deep-linked from press,
 * partnerships, and customer enquiries.
 *
 * Visual register: centred 720px column, eyebrow + h1 + intro, then the
 * form. Tone matches About / Legal pages, not the cinematic Welcome.
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
    <div className="min-h-screen flex flex-col bg-bg">
      <Seo
        title="Contact the estate"
        description="Write to The Mandala Company, the estate of Stephen Meakin — questions about prints, editions, commissions or the work itself."
        url="/contact"
      />
      <Nav />
      <main className="flex-1 mx-auto w-full max-w-[720px] px-6 md:px-10 py-24 md:py-32">
        <Reveal as="header" className="mb-10">
          <p className="font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-accent m-0 mb-5">
            Contact the estate
          </p>
          <h1 className="font-display font-bold tracking-[-0.04em] text-[clamp(40px,6vw,64px)] leading-[1.05] text-ink m-0">
            Get in touch.
          </h1>
          <p className="font-sans font-normal text-[16px] sm:text-[17px] leading-[1.75] text-ink/75 mt-7 m-0 max-w-[600px]">
            Write to The Mandala Company about a commission, a partnership,
            press, or simply to ask a question about a piece. We're a small
            estate and we read every message ourselves — usually back within a
            day or two.
          </p>
          <Separator className="bg-ink/15 mt-10" />
        </Reveal>

        <Reveal as="section" className="mt-2">
          {status === "success" ? (
            <div className="py-8">
              <p className="font-display font-bold text-[26px] text-ink m-0 mb-3">Thank you.</p>
              <p className="font-sans font-normal text-[15.5px] leading-[1.75] text-ink/75 m-0 max-w-[560px]">
                Your message has been sent on its way to{" "}
                <span className="text-ink">info@themandalacompany.com</span>.
                If your mail client didn't open, the message has been copied to
                your clipboard — paste it into a new email from anywhere.
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
                    className="w-full bg-bg-soft/40 ring-1 ring-white/12 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
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
                    className="w-full bg-bg-soft/40 ring-1 ring-white/12 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
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
                  rows={7}
                  className="w-full bg-bg-soft/40 ring-1 ring-white/12 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] leading-[1.65] text-ink placeholder:text-ink/30 transition-shadow resize-none"
                  placeholder="A few lines about what you're after."
                />
              </label>

              {errorMsg && (
                <p className="mb-4 font-sans text-[13px] text-accent m-0">{errorMsg}</p>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="inline-flex items-center justify-center bg-ink text-bg px-7 py-3.5 font-sans text-[11px] font-bold tracking-[0.18em] uppercase rounded-full hover:bg-accent hover:text-ink transition-colors disabled:opacity-60"
                >
                  {status === "submitting" ? "Sending…" : "Send"}
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
        </Reveal>
      </main>
      <Footer />
    </div>
  );
};
