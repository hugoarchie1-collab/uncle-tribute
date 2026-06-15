import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { EYEBROW, EYEBROW_MUTED, EYEBROW_TIGHT, META, BTN_PRIMARY } from "../components/ui/tokens";
import { asset } from "../lib/asset";
import { cn } from "../lib/cn";

// Single backdrop scene for /contact — a blurred autumn tree with raked leaf
// circles. webp referenced directly because it's a CSS background-image (this
// matches Collections; the <picture> jpg-swap rule applies only to <img> tags).
const BACKDROP = asset("/img/scenes/contact-autumn-tree-blur-v4.webp");

/**
 * Fixed full-page backdrop, cloned from Collections' ScrollBackdrop treatment
 * but simplified for ONE static image (no cross-fade between sections). One
 * bg-cover layer at full opacity drifts ±6% over the whole document scroll —
 * useScroll() with no target tracks the page, y "6%"→"-6%" — and is overscanned
 * inset-[-8%] so the parallax can never expose an uncovered strip (the parent is
 * overflow-hidden, so the overscan is clipped). The EXACT shared scrim gradient
 * Collections uses sits on top so the cream copy stays legible.
 *
 * Reduced-motion: drop the parallax entirely, hold a calm static layer, and
 * release the GPU promotion (will-change:auto) — identical short-circuit to
 * Collections' ScrollBackdrop.
 */
const ContactBackdrop = () => {
  const reduceMotion = useReducedMotion();
  // No `target` — track the whole document scroll for one page-wide drift.
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {reduceMotion ? (
        <div
          style={{
            backgroundImage: `url("${BACKDROP}")`,
            willChange: "auto",
          }}
          className="absolute inset-0 bg-cover bg-center"
          aria-hidden="true"
        />
      ) : (
        <motion.div
          style={{
            y,
            backgroundImage: `url("${BACKDROP}")`,
            willChange: "transform",
          }}
          // OVERSCAN 8% beyond every edge so the ±6% parallax `y` shift can NEVER
          // expose an uncovered strip at the top/bottom — same guard Collections
          // uses. The parent is overflow-hidden, so the overscan is clipped.
          className="absolute inset-[-8%] bg-cover bg-center"
          aria-hidden="true"
        />
      )}
      {/* Shared scrim — the EXACT gradient Collections uses, so /contact reads as
          part of the same world and the cream copy stays legible over the photo. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,7,6,0.38) 0%, rgba(8,7,6,0.60) 42%, rgba(8,7,6,0.80) 100%)",
        }}
      />
    </div>
  );
};

/**
 * /contact — full-page version of the EnquireModal form. Same mailto +
 * Web3Forms-optional submission path, same honeypot, mounted as a routed
 * page so it shows in the Nav / Footer and can be deep-linked from press,
 * partnerships, and customer enquiries.
 *
 * Visual register (rebuilt 2026-06-15 to the About-page LAW): NO timid centred
 * 640px column, NO blank space. A BOLD left-aligned masthead — a meta rule
 * (eyebrow + hairline + place tag), then "Write to / the family." set ENORMOUS
 * edge-to-edge (Fraunces 700, opsz 48, font-synthesis none) filling the width,
 * the intro packed immediately beneath under a border-t. Below, a DENSE
 * asymmetric two-column working surface: the form fills the wide left column
 * while the estate details (by post / direct line / our promise) sit packed in
 * a hairline rail on the right — no centred void on either flank. Compressed
 * vertical rhythm (pt-28 md:pt-36, py-9..py-12), never the old clamp(6rem,…)
 * spacer. Commerce-free page, but the SUBMISSION PATH is untouched: same
 * Web3Forms POST, same honeypot, same mailto + clipboard fallback, same
 * verbatim postal address. Home design system throughout: Fraunces + Hanken
 * Grotesk, cream-on-near-black, accent reserved for eyebrow + focus/hover.
 */

type Status = "idle" | "submitting" | "success" | "error";

const SUBJECT = "Contact the estate";

export const Contact = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // When the form is swapped for the success message, move focus to it so a
  // keyboard / screen-reader user isn't silently dropped on <body> — and the
  // region is announced via role=status / aria-live.
  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

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
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      <ContactBackdrop />
      <Seo
        title="Contact the estate"
        description="Write to The Mandala Company, the estate of Stephen Meakin — questions about prints, editions, commissions or the work itself."
        url="/contact"
      />
      <Nav overlay />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-28 md:pt-36 pb-8 md:pb-20">
        {/* MASTHEAD — bold left-aligned front cover (no timid centred header).
            A meta rule, then "Write to / the family." set ENORMOUS edge-to-edge
            (Fraunces 700, opsz 48, font-synthesis none), the intro packed
            immediately beneath under a border-t. Copy floats over the photo
            backdrop, so each tier carries the EXACT legibility text-shadows
            Collections uses on its intro header — no invented values. */}
        <header>
          <Reveal as="div" className="flex items-center gap-4 md:gap-6 border-b border-line pb-4 md:pb-5">
            <span className={EYEBROW} style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>
              Contact the estate
            </span>
            <span aria-hidden className="h-px flex-1 bg-ink/15" />
            <span
              className={cn(EYEBROW_MUTED, "shrink-0")}
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
            >
              The Mandala Company
            </span>
          </Reveal>

          <Reveal as="div" className="mt-4 md:mt-6">
            <h1
              className="font-display font-bold tracking-[-0.045em] text-ink m-0 leading-[0.84]"
              style={{
                fontVariationSettings: '"opsz" 48, "wght" 700',
                fontSynthesis: "none",
                fontSize: "clamp(60px, 13vw, 220px)",
                textShadow: "0 3px 28px rgba(0,0,0,0.7)",
              }}
            >
              Write to<br />the family.
            </h1>
          </Reveal>

          <div className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-5 items-start border-t border-line pt-6 md:pt-8">
            <Reveal as="div" className="lg:col-span-3">
              <p
                className={cn(EYEBROW_MUTED, "m-0 leading-[1.8]")}
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
              >
                Commissions · partnerships · press
              </p>
            </Reveal>
            <Reveal as="div" delay={0.06} className="lg:col-span-9">
              <p
                className="font-display font-normal tracking-[-0.01em] text-ink m-0 max-w-[34ch]"
                style={{
                  fontVariationSettings: '"opsz" 32, "wght" 400',
                  fontSize: "clamp(22px, 2.6vw, 36px)",
                  lineHeight: 1.3,
                  textShadow: "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)",
                }}
              >
                For commissions, partnerships, press, or a question about a
                particular work, write to The Mandala Company. We are a small
                estate; every message is read by the family, and answered within
                a day or two.
              </p>
            </Reveal>
          </div>
        </header>

        {/* THE WORKING SURFACE — a dense, asymmetric two-column block: the form
            fills the wide left column; the estate details (by post / the direct
            line / our promise) sit packed in a hairline rail on the right, so
            neither flank is a centred void. On success the form is swapped for
            the thank-you region in the same left column. */}
        <section className="mt-10 md:mt-14 lg:grid lg:grid-cols-12 lg:gap-x-12 xl:gap-x-16 items-start">
          <Reveal as="div" className="lg:col-span-7">
            <p className={cn(EYEBROW, "m-0 mb-6 md:mb-7")} style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>
              {status === "success" ? "Message sent" : "Send a message"}
            </p>
            {status === "success" ? (
              <div
                ref={successRef}
                tabIndex={-1}
                role="status"
                aria-live="polite"
                className="outline-none"
              >
                <p
                  className="font-display font-semibold tracking-[-0.025em] text-[clamp(30px,4vw,52px)] leading-[1.05] text-ink m-0 mb-4 md:mb-5"
                  style={{ textShadow: "0 3px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
                >
                  Thank you.
                </p>
                <p
                  className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.65] text-ink-muted m-0 max-w-[56ch]"
                  style={{ textShadow: "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
                >
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

                {/* Each label is a focus-within `group`: the muted eyebrow above
                    a field eases to full ink while its input is focused — the
                    label answers the focus, not just the input ring. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <label className="group block">
                    <span
                      className={cn(
                        EYEBROW_MUTED,
                        "block mb-2 transition-colors duration-200 group-focus-within:text-ink",
                      )}
                      style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
                    >
                      Name
                    </span>
                    <input
                      ref={firstFieldRef}
                      name="name"
                      required
                      autoComplete="name"
                      className="w-full bg-bg-soft ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[16px] text-ink placeholder:text-ink-faint transition-shadow"
                      placeholder="Jane Smith"
                    />
                  </label>
                  <label className="group block">
                    <span
                      className={cn(
                        EYEBROW_MUTED,
                        "block mb-2 transition-colors duration-200 group-focus-within:text-ink",
                      )}
                      style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
                    >
                      Email
                    </span>
                    <input
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="w-full bg-bg-soft ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[16px] text-ink placeholder:text-ink-faint transition-shadow"
                      placeholder="jane@example.com"
                    />
                  </label>
                </div>

                <label className="group block mb-5">
                  <span
                    className={cn(
                      EYEBROW_MUTED,
                      "block mb-2 transition-colors duration-200 group-focus-within:text-ink",
                    )}
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
                  >
                    Message
                  </span>
                  <textarea
                    name="message"
                    required
                    rows={8}
                    className="w-full bg-bg-soft ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[16px] leading-[1.65] text-ink placeholder:text-ink-faint transition-shadow resize-none"
                    placeholder="A few lines about the work or enquiry."
                  />
                </label>

                {errorMsg && (
                  <p role="alert" className="mb-4 font-sans text-[13px] text-accent m-0">{errorMsg}</p>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className={cn(BTN_PRIMARY, "group")}
                  >
                    {status === "submitting" ? "Sending…" : "Send your message"}
                    <span
                      aria-hidden="true"
                      className="ml-2 inline-block transition-transform duration-300 ease-smooth group-hover:translate-x-[3px]"
                    >
                      →
                    </span>
                  </button>
                  <a
                    href="mailto:info@themandalacompany.com"
                    className="group inline-flex items-center min-h-[44px] font-sans text-[14px] text-ink-muted hover:text-accent transition-colors"
                    style={{ textShadow: "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
                  >
                    Or write directly
                    <span
                      aria-hidden="true"
                      className="ml-1.5 inline-block transition-transform duration-300 ease-smooth group-hover:translate-x-[2px]"
                    >
                      →
                    </span>
                  </a>
                </div>
              </form>
            )}
          </Reveal>

          {/* ESTATE DETAILS RAIL — packs the right flank so the form never
              floats next to empty space. A hairline ledger of dt/dd facts:
              the direct line, the verbatim postal address, and the response
              promise. Drops below the form on a single column. */}
          <Reveal as="div" delay={0.08} className="mt-12 lg:mt-0 lg:col-span-4 lg:col-start-9">
            <p className={cn(EYEBROW, "m-0 mb-6 md:mb-7")} style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>
              The estate
            </p>
            <dl className="m-0 lg:border-l lg:border-line lg:pl-7">
              <div className="border-t border-line pt-4 pb-5">
                <dt
                  className={cn(EYEBROW_TIGHT, "m-0 mb-2")}
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
                >
                  Direct line
                </dt>
                <dd className="m-0">
                  <a
                    href="mailto:info@themandalacompany.com"
                    className="font-sans text-[15px] md:text-[16px] text-ink hover:text-accent transition-colors break-words"
                    style={{ textShadow: "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
                  >
                    info@themandalacompany.com
                  </a>
                </dd>
              </div>
              <div className="border-t border-line pt-4 pb-5">
                <dt
                  className={cn(EYEBROW_TIGHT, "m-0 mb-2")}
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
                >
                  By post
                </dt>
                <dd className="m-0">
                  <address
                    className={cn(META, "not-italic m-0 text-ink-soft")}
                    style={{ textShadow: "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
                  >
                    The Mandala Company — 213 Elm Drive, Hove,
                    East Sussex, BN3 7JD, United Kingdom
                  </address>
                </dd>
              </div>
              <div className="border-t border-b border-line pt-4 pb-5">
                <dt
                  className={cn(EYEBROW_TIGHT, "m-0 mb-2")}
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
                >
                  Our promise
                </dt>
                <dd
                  className={cn(META, "m-0 text-ink-soft")}
                  style={{ textShadow: "0 2px 14px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)" }}
                >
                  Every message is read by the family, and answered within a day
                  or two.
                </dd>
              </div>
            </dl>
          </Reveal>
        </section>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
