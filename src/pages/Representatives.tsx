import { useState, type FormEvent } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { EYEBROW, EYEBROW_MUTED, SUBTITLE, BTN_PRIMARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";

/**
 * /trade — the estate's "Partners" programme (Hugo 2026-07-30: this REPLACED the
 * old buyer-facing /trade page; it now lives at /trade and "/representatives"
 * redirects here. Menu label = "Partners"; indexed + in the sitemap).
 *
 * Dignified and SPARE by design: a memorial estate must never read as a
 * commission scheme. NO commission figures / earnings / "how much you make"
 * anywhere on the page — terms are arranged privately, 1:1. Concise, quiet,
 * confident. Application POSTs kind:"representative-application" to
 * /api/newsletter-subscribe (existing backend path — kept as-is).
 */

const ROLE: { title: string; body: string }[] = [
  {
    title: "You introduce.",
    body: "A designer, a hotel, a restaurant, a property. You open the door; that's your part.",
  },
  {
    title: "The estate does the rest.",
    body: "Pricing, production, framing, worldwide delivery — all handled by the family.",
  },
  {
    title: "You're looked after.",
    body: "Partners share in every placement, on terms agreed with you privately.",
  },
];

const STEPS: { index: string; title: string; body: string }[] = [
  { index: "01", title: "Introduce", body: "Bring the estate a client or a project." },
  { index: "02", title: "We handle it", body: "Made to order, framed, delivered worldwide." },
  { index: "03", title: "You share in it", body: "Your part agreed at the outset, kept quietly." },
];

type Status = "idle" | "submitting" | "success" | "error";

const RepresentativeApplication = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    const form = e.currentTarget;
    const data = new FormData(form);
    const get = (k: string) => String(data.get(k) || "").trim();

    if (get("botcheck")) {
      setStatus("success");
      form.reset();
      return;
    }
    const name = get("name");
    const email = get("email");
    if (!name || !email) {
      setStatus("error");
      setErrorMsg("Please add your name and email.");
      return;
    }
    try {
      const res = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "representative-application",
          name,
          email,
          company: get("company"),
          reach: get("reach"),
          message: get("message"),
          botcheck: "",
        }),
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus("error");
      setErrorMsg(body?.error || "Couldn't send just now — try again, or email us.");
    } catch {
      setStatus("error");
      setErrorMsg("Couldn't reach the estate — try again, or email info@themandalacompany.com.");
    }
  };

  const fieldLabel = "block font-sans text-[13px] font-bold tracking-[0.02em] text-ink/55 mb-2";
  const fieldInput =
    "w-full bg-bg ring-1 ring-line focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow";

  if (status === "success") {
    return (
      <div className="ring-1 ring-line bg-ink/[0.03] p-7 md:p-9 max-w-[680px]">
        <p className="font-display text-[clamp(24px,3vw,34px)] text-ink m-0 mb-3">Thank you.</p>
        <p className={cn(SUBTITLE, "max-w-none m-0")}>
          We'll be in touch, personally and in confidence. If it's pressing, write to{" "}
          <a href="mailto:info@themandalacompany.com?subject=Partners" className="text-accent hover:underline">
            info@themandalacompany.com
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="ring-1 ring-line bg-ink/[0.03] p-6 md:p-9 max-w-[720px]">
      <input
        type="text"
        name="botcheck"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <label className="block">
          <span className={fieldLabel}>Name</span>
          <input name="name" required autoComplete="name" className={fieldInput} placeholder="Jane Smith" />
        </label>
        <label className="block">
          <span className={fieldLabel}>Email</span>
          <input name="email" type="email" required autoComplete="email" className={fieldInput} placeholder="jane@studio.com" />
        </label>
        <label className="block">
          <span className={fieldLabel}>Company</span>
          <input name="company" autoComplete="organization" className={fieldInput} placeholder="If you have one" />
        </label>
        <label className="block">
          <span className={fieldLabel}>Where you place work</span>
          <select name="reach" defaultValue="" className={cn(fieldInput, "appearance-none")}>
            <option value="">Select…</option>
            <option>Hotels &amp; hospitality</option>
            <option>Restaurants &amp; bars</option>
            <option>Residential &amp; property</option>
            <option>Galleries &amp; advisory</option>
          </select>
        </label>
      </div>
      <label className="block mb-5">
        <span className={fieldLabel}>Anything you'd like to add</span>
        <textarea name="message" rows={3} className={cn(fieldInput, "leading-[1.6] resize-none")} placeholder="A client or project you have in mind." />
      </label>
      {errorMsg && <p className="mb-4 font-sans text-[14px] text-accent m-0">{errorMsg}</p>}
      <button
        type="submit"
        disabled={status === "submitting"}
        className={cn(BTN_PRIMARY, "disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg")}
      >
        {status === "submitting" ? "Sending…" : "Request an introduction"}
        <span aria-hidden="true" className="ml-2">→</span>
      </button>
    </form>
  );
};

export const Representatives = () => {
  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      {/* Bespoke luxe ground — deep near-black + a low warm-rust glow. No photo,
          no decorative SVG. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(140% 95% at 50% -12%, rgba(201,120,68,0.18), rgba(10,9,8,0) 52%)",
            "linear-gradient(180deg, #0c0a09 0%, #0a0908 42%, #080706 100%)",
          ].join(","),
        }}
      />
      <Seo
        title="Partners"
        description="A by-invitation programme for those who place the work of Stephen Meakin with trade and hospitality clients."
        url="/trade"
      />
      <Nav />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1180px] 2xl:max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-12 pb-16 md:pb-24">
        {/* ── HERO ── the type is the art. Natural height (NO forced min-h /
            centering — that left a dead gap under the lede on tall screens,
            which Hugo hates); the section below follows immediately. */}
        <Reveal as="header" className="pt-6 md:pt-10 pb-2 md:pb-4">
          <p className={cn(EYEBROW, "m-0 mb-6")}>Partners · By invitation</p>
          <h1
            className="font-display font-bold text-ink m-0 text-balance"
            style={{
              fontVariationSettings: '"opsz" 48, "wght" 700',
              fontSize: "clamp(46px, 9vw, 172px)",
              lineHeight: 0.9,
              letterSpacing: "-0.035em",
              textShadow: "0 2px 26px rgba(0,0,0,0.5)",
            }}
          >
            Open <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>the right</em> doors.
          </h1>
          <div className="mt-9 md:mt-12 max-w-[56ch]">
            <div className="h-px w-16 bg-accent/70 mb-6" />
            <p
              className="font-display font-normal tracking-[-0.01em] text-ink m-0"
              style={{ fontVariationSettings: '"opsz" 32, "wght" 400', fontSize: "clamp(21px, 2.4vw, 32px)", lineHeight: 1.3, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
            >
              The estate works with a few trusted partners who place Stephen's
              work in the rooms it belongs in.
            </p>
          </div>
        </Reveal>

        {/* ── THE ROLE ── three short lines. */}
        <section className="py-8 md:py-10">
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-3 gap-x-10 lg:gap-x-14 gap-y-9 md:gap-y-0 items-start border-t border-line pt-8">
            {ROLE.map((r) => (
              <div key={r.title} className="md:border-l md:border-line md:pl-7 first:md:border-l-0 first:md:pl-0">
                <h2 className="font-display font-semibold tracking-[-0.03em] text-ink m-0 text-[clamp(24px,2.8vw,38px)] leading-[1.08]">
                  {r.title}
                </h2>
                <p className={cn(SUBTITLE, "max-w-none mt-3")}>{r.body}</p>
              </div>
            ))}
          </Reveal>
        </section>

        {/* ── HOW ── three short steps. */}
        <section className="py-8 md:py-10">
          <Reveal as="div" className="border-t border-line pt-6 mb-6">
            <p className={cn(EYEBROW, "m-0")}>How it works</p>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-8">
            {STEPS.map((s) => (
              <div key={s.index}>
                <span
                  aria-hidden="true"
                  className="font-display font-semibold leading-none tracking-[-0.04em] text-ink/[0.18] select-none block"
                  style={{ fontVariationSettings: '"opsz" 48, "wght" 600', fontSize: "clamp(34px,3.4vw,54px)" }}
                >
                  {s.index}
                </span>
                <h3 className="font-display font-semibold tracking-[-0.03em] text-ink m-0 mt-3 text-[clamp(20px,2vw,27px)]">
                  {s.title}
                </h3>
                <p className={cn(SUBTITLE, "max-w-none mt-2")}>{s.body}</p>
              </div>
            ))}
          </Reveal>
        </section>

        {/* ── APPLY ── */}
        <section className="py-8 md:py-10">
          <Reveal as="div" className="border-t border-line pt-8">
            <p className={cn(EYEBROW, "m-0 mb-4")}>By invitation</p>
            <h2 className="font-display font-semibold tracking-[-0.035em] text-ink m-0 mb-4 text-[clamp(28px,4vw,58px)] leading-[1.02] max-w-[16ch]">
              Open a conversation.
            </h2>
            <p className={cn(SUBTITLE, "max-w-[54ch] mb-8")}>
              If you have a room or a client where Stephen's work belongs, tell us.
              We keep this circle small, and reply personally.
            </p>
            <RepresentativeApplication />
            <p className={cn(EYEBROW_MUTED, "m-0 mt-6")}>The Mandala Company · info@themandalacompany.com</p>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
};
