import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { AssetImage } from "../components/AssetImage";
import { EYEBROW, EYEBROW_MUTED, SUBTITLE, BTN_PRIMARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { PAINTINGS } from "../data/paintings";

/**
 * /trade — the estate's "Partners" programme, rebuilt 2026-08-03 into a
 * high-ticket SALES page (Hugo: "match a high-ticket sales page … exact style
 * 10/10") while staying inside the estate's non-negotiable register.
 *
 * ⚠️ PRICE-SILENT BY DESIGN. A memorial estate must never read as a commission
 * scheme, so there are NO commission %/earnings/"how much you make" figures
 * anywhere — the persuasion comes from the WORK, the operator taken off the
 * partner's plate, and the scarcity of an invitation, not from a number. Terms
 * are arranged privately, 1:1. This is the documented strategy in CLAUDE.md;
 * do not add money to this page.
 *
 * The page is a single long conversion narrative: HERO → work showcase (the
 * product IS the pitch) → positioning → who it's for → what the estate handles
 * (the value stack) → why it sells → the three-step role → objection-handling
 * FAQ → application. Application POSTs kind:"representative-application" to
 * /api/newsletter-subscribe (existing backend path — unchanged).
 */

// ── copy blocks ──────────────────────────────────────────────────────────────

const AUDIENCE: { title: string; body: string }[] = [
  { title: "Interior designers", body: "Specifying art for a scheme and wanting a signature piece that anchors the room." },
  { title: "Hospitality & hotels", body: "Lobbies, suites and restaurants that need work with presence and a story to tell." },
  { title: "Property & developers", body: "Show homes and residences where the art has to do quiet, lasting work." },
  { title: "Galleries & advisors", body: "Placing considered, collectible pieces with clients who buy on provenance." },
];

// The value stack — everything the estate carries so the partner carries almost
// nothing. This IS the high-ticket pitch: minimal effort, maximum object.
const STACK: { title: string; body: string }[] = [
  { title: "Pricing prepared for you", body: "A clean, private schedule per project — you never have to talk numbers off the cuff." },
  { title: "Made to order", body: "Museum-grade giclée, hand-finished and framed to the room. Nothing off a shelf." },
  { title: "Framed & delivered worldwide", body: "Production, framing and shipping handled end to end by the family. Free, everywhere." },
  { title: "Estate-stamped provenance", body: "Every piece numbered, stamped and issued with a certificate of authenticity." },
  { title: "One point of contact", body: "You speak to the family directly. No portal, no queue, no account manager." },
  { title: "Discretion, always", body: "Your client stays your client. We stay in the background unless you want us there." },
];

const STEPS: { index: string; title: string; body: string }[] = [
  { index: "01", title: "You introduce", body: "Bring the estate a client, a scheme or a room where Stephen's work belongs." },
  { index: "02", title: "We handle everything", body: "Pricing, production, framing and worldwide delivery — all carried by the family." },
  { index: "03", title: "You share in the placement", body: "Your part is agreed with you at the outset, privately, and kept quietly." },
];

const CREDENTIALS: { stat: string; label: string }[] = [
  { stat: "1966–2021", label: "The life's work of Stephen Meakin, held by his family" },
  { stat: "Made to order", label: "Nothing mass-produced — each piece printed for the room" },
  { stat: "Worldwide", label: "Framed, insured and delivered free, anywhere" },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "What does it cost me to become a partner?",
    a: "Nothing. There's no fee and no stock to hold. You introduce; the estate carries the rest.",
  },
  {
    q: "How are the terms decided?",
    a: "Privately, and in your favour. Partners share in every placement on terms agreed with you personally at the outset — never a fixed public rate.",
  },
  {
    q: "Do I have to handle the money or the making?",
    a: "No. Pricing, invoicing, production, framing and delivery are all handled by the family. Your name opens the door; ours does the work.",
  },
  {
    q: "Is this an open sign-up?",
    a: "No. The circle is kept small and by invitation, so every partner is looked after properly and the work stays placed with care.",
  },
];

type Status = "idle" | "submitting" | "success" | "error";

// ── application form ─────────────────────────────────────────────────────────

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

  const fieldLabel =
    "block font-sans text-[13px] 3xl:text-[16px] 4xl:text-[19px] font-bold tracking-[0.02em] text-ink/55 mb-2";
  const fieldInput =
    "w-full bg-bg ring-1 ring-line focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] 3xl:text-[18px] 4xl:text-[21px] text-ink placeholder:text-ink/30 transition-shadow";

  if (status === "success") {
    return (
      <div className="ring-1 ring-line bg-ink/[0.03] p-7 md:p-9">
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
    <form onSubmit={handleSubmit} noValidate className="ring-1 ring-line bg-ink/[0.03] p-6 md:p-9">
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
      {errorMsg && <p className="mb-4 font-sans text-[14px] 3xl:text-[17px] 4xl:text-[20px] text-accent m-0">{errorMsg}</p>}
      <button
        type="submit"
        disabled={status === "submitting"}
        className={cn(BTN_PRIMARY, "w-full sm:w-auto disabled:opacity-60")}
      >
        {status === "submitting" ? "Sending…" : "Request an introduction"}
        <span aria-hidden="true" className="ml-2">→</span>
      </button>
    </form>
  );
};

// ── page ─────────────────────────────────────────────────────────────────────

export const Representatives = () => {
  const applyRef = useRef<HTMLDivElement>(null);

  const scrollToApply = () => {
    applyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Showcase covers — the original colourway of each painting. The product IS
  // the pitch, so we lead with the work, sourced live from the catalogue.
  const showcase = useMemo(
    () =>
      PAINTINGS.map((p) => {
        const avail = p.colourways.filter((c) => c.available);
        const cover = avail.find((c) => c.isOriginal) ?? avail[0];
        return cover ? { id: p.id, title: p.title, name: cover.name, image: cover.image } : null;
      }).filter((x): x is { id: string; title: string; name: string; image: string } => Boolean(x)),
    [],
  );
  const hero = showcase[0];

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      {/* Bespoke luxe ground — deep near-black + a low warm-rust glow. */}
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
        description="A by-invitation programme for interior designers, hospitality and galleries who place the work of Stephen Meakin. You introduce; the estate handles pricing, framing and worldwide delivery."
        url="/trade"
      />
      <Nav />

      <main className="relative z-10 flex-1">
        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-[1320px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 pt-8 md:pt-12 pb-10 md:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
            <Reveal as="div">
              <p className={cn(EYEBROW, "m-0 mb-6")}>Partners · By invitation</p>
              <h1
                className="font-display font-bold text-ink m-0 text-balance"
                style={{
                  fontVariationSettings: '"opsz" 48, "wght" 700',
                  fontSize: "clamp(44px, 6.6vw, 118px)",
                  lineHeight: 0.92,
                  letterSpacing: "-0.035em",
                  textShadow: "0 2px 26px rgba(0,0,0,0.5)",
                }}
              >
                You know the rooms.{" "}
                <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>
                  We
                </em>{" "}
                make the work.
              </h1>
              <div className="mt-8 md:mt-10 max-w-[52ch]">
                <div className="h-px w-16 bg-accent/70 mb-6" />
                <p
                  className="font-display font-normal tracking-[-0.01em] text-ink m-0"
                  style={{
                    fontVariationSettings: '"opsz" 32, "wght" 400',
                    fontSize: "clamp(20px, 2.2vw, 30px)",
                    lineHeight: 1.32,
                    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                  }}
                >
                  Introduce Stephen Meakin's mandalas to your clients. The estate
                  prices, makes, frames and ships every piece worldwide — you keep
                  the relationship, and share in every placement.
                </p>
              </div>
              <div className="mt-9 md:mt-11 flex flex-wrap items-center gap-4">
                <button type="button" onClick={scrollToApply} className={cn(BTN_PRIMARY)}>
                  Request an introduction
                  <span aria-hidden="true" className="ml-2">→</span>
                </button>
                <Link
                  to="/collections"
                  className="font-sans text-[14.5px] font-semibold tracking-[0.01em] text-ink-muted hover:text-accent transition-colors underline-offset-4 hover:underline"
                >
                  See the work first
                </Link>
              </div>
              <p className={cn(EYEBROW_MUTED, "m-0 mt-7 flex flex-wrap items-center gap-x-3 gap-y-1")}>
                <span>No fee</span>
                <span aria-hidden="true" className="text-ink/25">·</span>
                <span>No stock to hold</span>
                <span aria-hidden="true" className="text-ink/25">·</span>
                <span>Terms arranged privately</span>
              </p>
            </Reveal>

            {/* Hero plate — the single strongest piece, framed like a gallery
                wall label. */}
            {hero && (
              <Reveal as="div" className="relative">
                <div className="relative mx-auto max-w-[520px] lg:max-w-none">
                  <div
                    aria-hidden="true"
                    className="absolute -inset-6 -z-10 rounded-full opacity-70 blur-3xl"
                    style={{ background: "radial-gradient(60% 60% at 50% 40%, rgba(201,120,68,0.22), transparent 70%)" }}
                  />
                  <div className="aspect-square overflow-hidden ring-1 ring-line shadow-lift">
                    <AssetImage
                      src={hero.image}
                      alt={`${hero.title} — ${hero.name}`}
                      loading="eager"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className={cn(EYEBROW_MUTED, "m-0 mt-4 text-center")}>
                    {hero.title} — estate-stamped giclée, made to order
                  </p>
                </div>
              </Reveal>
            )}
          </div>
        </section>

        {/* ── WORK SHOWCASE — a full-bleed rail of the catalogue. The product is
            the pitch. ─────────────────────────────────────────────────────── */}
        <section className="py-6 md:py-10">
          <Reveal as="div" className="mx-auto w-full max-w-[1320px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 mb-6">
            <p className={cn(EYEBROW, "m-0")}>The work you'd be placing</p>
          </Reveal>
          <div className="relative">
            <div className="flex gap-4 md:gap-5 overflow-x-auto px-4 sm:px-6 md:px-8 lg:px-12 pb-3 snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {showcase.map((s) => (
                <Link
                  key={s.id}
                  to={`/collections/${s.id}?c=${encodeURIComponent(s.name)}`}
                  className="group relative flex-none w-[230px] sm:w-[280px] md:w-[320px] snap-start"
                  aria-label={`View ${s.title}`}
                >
                  <div className="aspect-square overflow-hidden ring-1 ring-line transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-lift">
                    <AssetImage
                      src={s.image}
                      alt={`${s.title} — ${s.name}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  </div>
                  <p className="mt-3 font-display font-bold text-[15px] md:text-[17px] tracking-[-0.015em] text-ink m-0 group-hover:text-accent transition-colors">
                    {s.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── POSITIONING — the offer in one confident line. ───────────────── */}
        <section className="mx-auto w-full max-w-[1320px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-16">
          <Reveal as="div" className="border-t border-line pt-10 md:pt-14 max-w-[24ch]">
            <p className={cn(EYEBROW, "m-0 mb-6")}>The proposition</p>
            <h2
              className="font-display font-semibold tracking-[-0.035em] text-ink m-0 text-[clamp(30px,4.4vw,68px)] leading-[1.04]"
            >
              A rare body of work, placed with people who already have the room.
            </h2>
          </Reveal>
          <Reveal as="div" className="mt-8 md:mt-10 max-w-[62ch]">
            <p className={cn(SUBTITLE, "max-w-none")}>
              Stephen Meakin spent his life on a single, disciplined practice —
              sacred geometry rendered by hand. The estate now makes those
              mandalas as museum-grade editions. What it doesn't have is your
              clients, your schemes and your rooms. That's the whole of the
              partnership: your introduction, our object.
            </p>
          </Reveal>
        </section>

        {/* ── WHO IT'S FOR ─────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-[1320px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-16">
          <Reveal as="div" className="border-t border-line pt-10 md:pt-14 mb-8 md:mb-10">
            <p className={cn(EYEBROW, "m-0")}>Who partners with the estate</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {AUDIENCE.map((a) => (
              <Reveal as="div" key={a.title} className="ring-1 ring-line bg-ink/[0.02] p-6 md:p-7 h-full">
                <h3 className="font-display font-semibold tracking-[-0.02em] text-ink m-0 text-[clamp(19px,1.5vw,25px)] leading-[1.12]">
                  {a.title}
                </h3>
                <p className={cn(SUBTITLE, "max-w-none mt-3 text-[clamp(15px,1vw,18px)]")}>{a.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── VALUE STACK — everything the estate carries. ─────────────────── */}
        <section className="mx-auto w-full max-w-[1320px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-16">
          <Reveal as="div" className="border-t border-line pt-10 md:pt-14 max-w-[26ch] mb-10 md:mb-12">
            <p className={cn(EYEBROW, "m-0 mb-5")}>What you carry: almost nothing</p>
            <h2 className="font-display font-semibold tracking-[-0.035em] text-ink m-0 text-[clamp(28px,4vw,60px)] leading-[1.04]">
              The estate does the heavy lifting.
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 lg:gap-x-14 gap-y-9 md:gap-y-11">
            {STACK.map((s, i) => (
              <Reveal as="div" key={s.title} className="border-t border-line/60 pt-6">
                <span
                  aria-hidden="true"
                  className="font-display font-semibold leading-none tracking-[-0.04em] text-ink/[0.18] select-none block mb-4"
                  style={{ fontVariationSettings: '"opsz" 48, "wght" 600', fontSize: "clamp(28px,2.6vw,40px)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display font-semibold tracking-[-0.02em] text-ink m-0 text-[clamp(20px,1.7vw,28px)] leading-[1.12]">
                  {s.title}
                </h3>
                <p className={cn(SUBTITLE, "max-w-none mt-3 text-[clamp(15px,1vw,18px)]")}>{s.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── WHY IT SELLS — credibility band. ─────────────────────────────── */}
        <section className="mx-auto w-full max-w-[1320px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-16">
          <Reveal as="div" className="border-t border-line pt-10 md:pt-14 grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-9">
            {CREDENTIALS.map((c) => (
              <div key={c.label} className="sm:border-l sm:border-line sm:pl-7 first:sm:border-l-0 first:sm:pl-0">
                <p
                  className="font-display font-semibold tracking-[-0.03em] text-ink m-0 text-[clamp(28px,3vw,48px)] leading-[1]"
                  style={{ fontVariationSettings: '"opsz" 40, "wght" 600' }}
                >
                  {c.stat}
                </p>
                <p className={cn(SUBTITLE, "max-w-none mt-3 text-[clamp(15px,1vw,18px)]")}>{c.label}</p>
              </div>
            ))}
          </Reveal>
        </section>

        {/* ── HOW IT WORKS — three steps. ──────────────────────────────────── */}
        <section className="mx-auto w-full max-w-[1320px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-16">
          <Reveal as="div" className="border-t border-line pt-10 md:pt-14 mb-9 md:mb-12">
            <p className={cn(EYEBROW, "m-0")}>How it works</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 lg:gap-x-14 gap-y-10 md:gap-y-0">
            {STEPS.map((s) => (
              <Reveal
                as="div"
                key={s.index}
                className="md:border-l md:border-line md:pl-8 first:md:border-l-0 first:md:pl-0"
              >
                <span
                  aria-hidden="true"
                  className="font-display font-semibold leading-none tracking-[-0.04em] text-accent/80 select-none block"
                  style={{ fontVariationSettings: '"opsz" 48, "wght" 600', fontSize: "clamp(40px,4vw,64px)" }}
                >
                  {s.index}
                </span>
                <h3 className="font-display font-semibold tracking-[-0.03em] text-ink m-0 mt-4 text-[clamp(22px,2.2vw,32px)]">
                  {s.title}
                </h3>
                <p className={cn(SUBTITLE, "max-w-none mt-3 text-[clamp(15px,1vw,18px)]")}>{s.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── FAQ — objection handling. ────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-[1320px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-16">
          <Reveal as="div" className="border-t border-line pt-10 md:pt-14 mb-9 md:mb-12">
            <p className={cn(EYEBROW, "m-0")}>Before you ask</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-16 gap-y-9 md:gap-y-11">
            {FAQ.map((f) => (
              <Reveal as="div" key={f.q}>
                <h3 className="font-display font-semibold tracking-[-0.02em] text-ink m-0 text-[clamp(20px,1.7vw,28px)] leading-[1.15]">
                  {f.q}
                </h3>
                <p className={cn(SUBTITLE, "max-w-none mt-3 text-[clamp(15px,1vw,18px)]")}>{f.a}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── APPLY ────────────────────────────────────────────────────────── */}
        <section
          ref={applyRef}
          className="mx-auto w-full max-w-[1320px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-20 scroll-mt-24"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16 items-start border-t border-line pt-10 md:pt-16">
            <Reveal as="div">
              <p className={cn(EYEBROW, "m-0 mb-4")}>By invitation</p>
              <h2 className="font-display font-semibold tracking-[-0.035em] text-ink m-0 mb-5 text-[clamp(30px,4.4vw,68px)] leading-[1.0]">
                Open a conversation.
              </h2>
              <p className={cn(SUBTITLE, "max-w-[46ch]")}>
                If you have a room or a client where Stephen's work belongs, tell
                us. We keep this circle small, and reply personally — in
                confidence, and to your advantage.
              </p>
              <p className={cn(EYEBROW_MUTED, "m-0 mt-8")}>
                The Mandala Company · info@themandalacompany.com
              </p>
            </Reveal>
            <Reveal as="div">
              <RepresentativeApplication />
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
