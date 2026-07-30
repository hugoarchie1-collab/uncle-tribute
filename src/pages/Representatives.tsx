import { useState, type FormEvent } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import {
  EYEBROW,
  EYEBROW_MUTED,
  EYEBROW_TIGHT,
  TITLE,
  SUBTITLE,
  META,
  BTN_PRIMARY,
} from "../components/ui/tokens";
import { cn } from "../lib/cn";

/**
 * /representatives — the estate's PRIVATE representatives programme (rebuilt
 * 2026-07-28 from a 3-agent panel: art direction + persuasion + sell-kit).
 *
 * Aimed at SELLERS: designers, hospitality specialists, property managers and
 * gallerists who place Stephen Meakin's work in hotels / projects and share in
 * every placement (10% · 15% on hospitality — stated plainly HERE because the
 * page is private).
 *
 * ⚠️ PRIVATE: intentionally UNLINKED (noindex + robots Disallow; not in
 * nav/footer/sitemap). It is the single link the estate hands a vetted prospect,
 * NOT a public affiliate scheme. Commission figures + the /trade/pricing toolkit
 * link must never appear on any public / linked surface.
 */

// ── Proof, before the money (hard credentials a hotel buyer trusts). ──
const PROOF: { title: string; body: string }[] = [
  {
    title: "Placed at scale",
    body: "A 3.6-metre Arista SunStar hangs behind Farmacy in Notting Hill — a single piece, scaled for the wall. The work belongs in rooms people remember.",
  },
  {
    title: "Authenticated by the estate",
    body: "Every piece is estate-stamped and hand-numbered within its edition, issued with a Certificate of Authenticity. Provenance the client keeps.",
  },
  {
    title: "The family carries it",
    body: "Produced, framed and delivered worldwide, invoiced by the estate — handled personally, in Stephen's own voice. You open the door; we carry the rest.",
  },
];

interface Reason {
  index: string;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
}

const REASONS: Reason[] = [
  {
    index: "01",
    eyebrow: "A singular body of work",
    title: "Work that carries its own story.",
    body: (
      <>
        Stephen Meakin spent his life on sacred geometry — mandalas built with the
        precision of ancient temples and Persian courts. The catalogue is finite
        and cannot be extended. It is not a print line you'll compete on: the story
        is true, and it sells on a name you can stand behind.
      </>
    ),
  },
  {
    index: "02",
    eyebrow: "Made for scale",
    title: "Built for whole rooms and whole properties.",
    body: (
      <>
        A single piece or a scheme across an entire hotel — at any size, from a
        standard edition to a <strong>bespoke piece scaled for a lobby wall</strong>.
        Bulk orders, custom sizes and whole-property schemes are all handled — every
        piece produced, framed, delivered worldwide and invoiced by the estate.
      </>
    ),
  },
  {
    index: "03",
    eyebrow: "A relationship, not a scheme",
    title: "Agreed once, honoured always.",
    body: (
      <>
        This is a professional courtesy between the estate and the people who place
        the work well — no public rate card, no dashboards, no small print. Terms
        are agreed with you at the outset and kept, personally, by the family.
      </>
    ),
  },
];

// The mechanics — turnkey on the estate's side.
const STEPS: { index: string; title: string; body: string }[] = [
  {
    index: "01",
    title: "Introduce",
    body: "Bring the estate a designer, a hospitality group, or a project — a room, a suite, a whole property. A single warm introduction is all it takes.",
  },
  {
    index: "02",
    title: "We take it from there",
    body: "The family confirms pricing, presents the work, and prepares a considered proposal for the client — handled personally, in the estate's own voice.",
  },
  {
    index: "03",
    title: "Made & delivered",
    body: "Each piece is estate-stamped and made to order, then delivered free worldwide — drop-shipped to the client or to site, timed to the install.",
  },
  {
    index: "04",
    title: "You're paid",
    body: "On the completed placement, your share is paid — promptly and privately, exactly as agreed at the outset.",
  },
];

// Earnings examples — all hospitality (15%), so the number scales in the mind.
const EARNINGS: { room: string; invoiced: string; share: string }[] = [
  { room: "A restaurant — a run of six pieces", invoiced: "£4,500", share: "£675" },
  { room: "A boutique hotel — twenty across rooms & lobby", invoiced: "£15,000", share: "£2,250" },
  { room: "A whole property — commission + scheme", invoiced: "five figures", share: "agreed with you" },
];

const SUITS: { title: string; body: string }[] = [
  {
    title: "Interior designers & consultants",
    body: "You specify art for residential and commercial schemes and want a distinctive, authored body of work to place with confidence.",
  },
  {
    title: "Hospitality & property managers",
    body: "You fit out hotels, restaurants and wellness spaces at scale, and know how much a coherent scheme of original work lifts a property.",
  },
  {
    title: "Gallerists & art advisors",
    body: "You advise collectors and rooms, and can present a finite, estate-authenticated catalogue with a genuine story behind it.",
  },
];

const PLACES = [
  "Hotels & hospitality",
  "Restaurants & bars",
  "Residential & property",
  "Galleries & advisory",
] as const;

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
      setErrorMsg("Please give your name and email so we can reply.");
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
          website: get("website"),
          reach: get("reach"), // "Where you place work" select
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
      setErrorMsg(
        body?.error ||
          "We couldn't send that just now — please try again, or write to us directly.",
      );
    } catch {
      setStatus("error");
      setErrorMsg(
        "We couldn't reach the estate just now — please try again, or email info@themandalacompany.com.",
      );
    }
  };

  const fieldLabel = "block font-sans text-[13px] font-bold tracking-[0.02em] text-ink/55 mb-2";
  const fieldInput =
    "w-full bg-bg ring-1 ring-line focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow";

  if (status === "success") {
    return (
      <div className="ring-1 ring-line bg-ink/[0.03] p-7 md:p-9 max-w-[760px]">
        <p className="font-display text-[clamp(24px,3vw,34px)] text-ink m-0 mb-3">
          Thank you.
        </p>
        <p className={cn(SUBTITLE, "max-w-none m-0")}>
          Your note is with the estate. We keep this circle small and read every
          one ourselves — we'll reply personally, in confidence, usually within a
          day or two. If it's pressing, write to{" "}
          <a
            href="mailto:info@themandalacompany.com?subject=Representatives"
            className="text-accent hover:underline"
          >
            info@themandalacompany.com
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="ring-1 ring-line bg-ink/[0.03] p-6 md:p-9 max-w-[860px]">
      <input
        type="text"
        name="botcheck"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
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
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <label className="block">
          <span className={fieldLabel}>Your name *</span>
          <input name="name" required autoComplete="name" className={fieldInput} placeholder="Jane Smith" />
        </label>
        <label className="block">
          <span className={fieldLabel}>Email *</span>
          <input name="email" type="email" required autoComplete="email" className={fieldInput} placeholder="jane@studio.com" />
        </label>
        <label className="block">
          <span className={fieldLabel}>Company / studio</span>
          <input name="company" autoComplete="organization" className={fieldInput} placeholder="If you have one" />
        </label>
        <label className="block">
          <span className={fieldLabel}>Website</span>
          <input name="website" autoComplete="url" className={fieldInput} placeholder="studio.com" />
        </label>
        <label className="block sm:col-span-2">
          <span className={fieldLabel}>Where you place work</span>
          <select name="reach" defaultValue="" className={cn(fieldInput, "appearance-none")}>
            <option value="">Select…</option>
            {PLACES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block mb-5">
        <span className={fieldLabel}>Who you'd open a door to</span>
        <textarea
          name="message"
          rows={4}
          className={cn(fieldInput, "leading-[1.6] resize-none")}
          placeholder="A project or client you have in mind — no detail needed yet."
        />
      </label>

      {errorMsg && <p className="mb-4 font-sans text-[14px] text-accent m-0">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className={cn(
          BTN_PRIMARY,
          "disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        )}
      >
        {status === "submitting" ? "Sending…" : "Request an introduction"}
        <span aria-hidden="true" className="ml-2">→</span>
      </button>
      <p className={cn(META, "mt-4 m-0 text-[14px]")}>
        Read by the family, replied to personally — usually within a day or two.
      </p>
    </form>
  );
};

export const Representatives = () => {
  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      {/* Bespoke luxe ground — deep near-black with a low, warm rust glow rising
          from the top. No photo (no repeats), no decorative SVG (no "AI" look):
          the type is the art. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(140% 95% at 50% -12%, rgba(201,120,68,0.20), rgba(10,9,8,0) 52%)",
            "radial-gradient(70% 55% at 88% 8%, rgba(201,120,68,0.10), transparent 60%)",
            "linear-gradient(180deg, #0c0a09 0%, #0a0908 42%, #080706 100%)",
          ].join(","),
        }}
      />
      <Seo
        title="Representatives"
        description="A private, by-invitation programme for representatives of the estate of Stephen Meakin."
        url="/representatives"
        noindex
      />
      <Nav />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] 4xl:max-w-[1880px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-12 pb-12 md:pb-16">
        {/* ── HERO ── screen-filling type on the bespoke ground: the type is the art. */}
        <Reveal as="header" className="min-h-[80svh] flex flex-col justify-center pt-14 md:pt-16 pb-10 md:pb-16">
          <p className={cn(EYEBROW, "m-0 mb-6 md:mb-8")}>Representatives · By invitation</p>
          <h1
            className="font-display font-bold text-ink m-0 text-balance"
            style={{
              fontVariationSettings: '"opsz" 48, "wght" 700',
              fontSize: "clamp(46px, 9vw, 176px)",
              lineHeight: 0.9,
              letterSpacing: "-0.035em",
              textShadow: "0 2px 26px rgba(0,0,0,0.5)",
            }}
          >
            For those who open{" "}
            <em
              className="italic font-normal"
              style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}
            >
              the right
            </em>{" "}
            doors.
          </h1>
          <div className="mt-9 md:mt-14 max-w-[66ch]">
            <div className="h-px w-16 bg-accent/70 mb-6 md:mb-7" />
            <p
              className="font-display font-normal tracking-[-0.01em] text-ink m-0"
              style={{
                fontVariationSettings: '"opsz" 32, "wght" 400',
                fontSize: "clamp(21px, 2.4vw, 33px)",
                lineHeight: 1.28,
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
              }}
            >
              The estate places a small number of representatives beside a finite,
              authored body of work — those who bring Stephen's work to the projects
              and properties it belongs in, and share in every placement. You open
              the door; everything behind it is ours to carry.
            </p>
            <p className={cn(EYEBROW_MUTED, "m-0 mt-6 leading-[1.7]")}>
              A finite body of work · Turnkey behind the door · Terms in confidence
            </p>
          </div>
        </Reveal>

        {/* ── PROOF ── */}
        <section className="py-6 md:py-8">
          <Reveal as="div" className="border-t border-line pt-4 md:pt-5 mb-5 md:mb-6">
            <p className={cn(EYEBROW, "m-0")}>The estate behind you</p>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-3 gap-x-8 lg:gap-x-12 gap-y-8 md:gap-y-0 items-start">
            {PROOF.map((p) => (
              <div key={p.title} className="md:border-l md:border-line md:pl-6 lg:pl-8 first:md:border-l-0 first:md:pl-0">
                <h3 className="font-display font-semibold tracking-[-0.03em] text-ink m-0 text-[clamp(19px,2vw,26px)] leading-[1.15]">
                  {p.title}
                </h3>
                <p className={cn(SUBTITLE, "max-w-none mt-2.5")}>{p.body}</p>
              </div>
            ))}
          </Reveal>
        </section>

        {/* ── WHY REPRESENT ── */}
        <section className="py-6 md:py-8">
          <Reveal as="div" className="border-t border-line pt-4 md:pt-5 mb-5 md:mb-6">
            <p className={cn(EYEBROW, "m-0")}>Why represent the estate</p>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-3 gap-x-8 lg:gap-x-12 gap-y-8 md:gap-y-0 items-start">
            {REASONS.map((item) => (
              <section
                key={item.index}
                className="md:border-l md:border-line md:pl-6 lg:pl-8 first:md:border-l-0 first:md:pl-0"
              >
                <div className="flex items-baseline gap-4">
                  <span
                    aria-hidden="true"
                    className="font-display font-semibold leading-none tracking-[-0.04em] text-ink/[0.18] select-none"
                    style={{ fontVariationSettings: '"opsz" 48, "wght" 600', fontSize: "clamp(40px,4.6vw,68px)" }}
                  >
                    {item.index}
                  </span>
                  <span className={cn(EYEBROW_TIGHT, "translate-y-[-0.2em]")}>{item.eyebrow}</span>
                </div>
                <h2 className="font-display font-semibold tracking-[-0.035em] text-balance text-ink m-0 mt-3.5 text-[clamp(23px,2.6vw,40px)] leading-[1.1]">
                  {item.title}
                </h2>
                <div className={cn(SUBTITLE, "max-w-none mt-3.5 md:mt-4")}>{item.body}</div>
              </section>
            ))}
          </Reveal>
        </section>

        {/* ── WHAT YOU EARN ── the money moment, in a quiet vitrine. */}
        <section className="py-6 md:py-8">
          <Reveal as="div" className="border-t border-line pt-4 md:pt-5 mb-5 md:mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <p className={cn(EYEBROW, "m-0")}>What you earn</p>
            <p className={cn(EYEBROW_MUTED, "m-0")}>Paid on completion, in confidence</p>
          </Reveal>

          <Reveal as="div" className="ring-1 ring-line bg-ink/[0.03] rounded-[2px] px-6 md:px-10 py-9 md:py-11">
            <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-x-12 gap-y-9 items-start">
              {/* Rate */}
              <div>
                <p className="font-display text-ink m-0 leading-[0.9] tracking-[-0.02em] tabular-nums text-[clamp(56px,7vw,112px)]">
                  10<span className="text-[0.62em] align-top">%</span>
                </p>
                <p className={cn(META, "m-0 mt-1 text-[15px] uppercase-none")}>of every placement</p>
                <div className="border-t border-line mt-6 pt-6">
                  <p className="font-display text-ink m-0 leading-[0.95] tracking-[-0.02em] tabular-nums text-[clamp(34px,4vw,60px)]">
                    15<span className="text-[0.62em] align-top">%</span>
                  </p>
                  <p className={cn(META, "m-0 mt-1 text-[15px]")}>on hospitality &amp; key accounts</p>
                </div>
              </div>

              {/* The worked ledger — hammer-price register. */}
              <div className="lg:border-l lg:border-line lg:pl-12">
                <p className={cn(EYEBROW_TIGHT, "m-0 mb-4")}>What a single introduction returns</p>
                <div className="flex flex-col gap-3.5">
                  {EARNINGS.map((e) => (
                    <div key={e.room} className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-b border-line pb-3.5">
                      <div>
                        <p className="font-sans text-ink m-0 text-[15px] leading-snug">{e.room}</p>
                        <p className={cn(META, "m-0 text-[13px]")}>estate invoices {e.invoiced}</p>
                      </div>
                      <p className="font-display text-ink m-0 tabular-nums whitespace-nowrap text-[clamp(22px,2.4vw,32px)] tracking-[-0.01em]">
                        {e.share}
                      </p>
                    </div>
                  ))}
                </div>
                <p className={cn(META, "mt-4 m-0 text-[14px]")}>
                  Stephen's work sells at project scale, so one warm introduction is
                  rarely small — and it's paid promptly on completion, held in
                  confidence.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="py-6 md:py-8">
          <Reveal as="div" className="border-t border-line pt-4 md:pt-5 mb-5 md:mb-6">
            <p className={cn(EYEBROW, "m-0")}>How it works</p>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 lg:gap-x-10 gap-y-8 items-start">
            {STEPS.map((step) => (
              <div key={step.index} className="lg:border-l lg:border-line lg:pl-6 first:lg:border-l-0 first:lg:pl-0">
                <span
                  aria-hidden="true"
                  className="font-display font-semibold leading-none tracking-[-0.04em] text-ink/[0.18] select-none block"
                  style={{ fontVariationSettings: '"opsz" 48, "wght" 600', fontSize: "clamp(34px,3.4vw,52px)" }}
                >
                  {step.index}
                </span>
                <h3 className="font-display font-semibold tracking-[-0.03em] text-ink m-0 mt-3 text-[clamp(19px,2vw,26px)] leading-[1.12]">
                  {step.title}
                </h3>
                <p className={cn(SUBTITLE, "max-w-none mt-2.5")}>{step.body}</p>
              </div>
            ))}
          </Reveal>
        </section>

        {/* ── WHO THIS SUITS ── */}
        <section className="py-6 md:py-8">
          <Reveal as="div" className="border-t border-line pt-4 md:pt-5 mb-5 md:mb-6">
            <p className={cn(EYEBROW, "m-0")}>Who this suits</p>
          </Reveal>
          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-3 gap-x-8 lg:gap-x-12 gap-y-8 md:gap-y-0 items-start">
            {SUITS.map((s) => (
              <div key={s.title} className="md:border-l md:border-line md:pl-6 lg:pl-8 first:md:border-l-0 first:md:pl-0">
                <h3 className="font-display font-semibold tracking-[-0.03em] text-ink m-0 text-[clamp(19px,2vw,26px)] leading-[1.15]">
                  {s.title}
                </h3>
                <p className={cn(SUBTITLE, "max-w-none mt-2.5")}>{s.body}</p>
              </div>
            ))}
          </Reveal>
        </section>

        {/* ── YOUR TOOLKIT ── discreet: equips the rep to actually quote (private). ── */}
        <section className="py-6 md:py-8">
          <Reveal as="div" className="border-t border-line pt-4 md:pt-5 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 items-start">
            <div className="lg:col-span-5">
              <p className={cn(EYEBROW, "m-0 mb-3.5")}>Your toolkit</p>
              <h2 className={cn(TITLE, "max-w-none m-0")}>
                Everything to quote with confidence.
              </h2>
            </div>
            <div className="lg:col-span-7 lg:border-l lg:border-line lg:pl-10">
              <p className={cn(SUBTITLE, "max-w-none m-0")}>
                Once you're on account, you carry the estate's private trade price
                sheet — bulk tiers, framing and finishes, lead times and free
                worldwide delivery — to quote any room or whole property. For a
                bespoke lobby centrepiece or a custom size, tell us the wall and we
                prepare it individually.
              </p>
              <p className={cn(META, "mt-4 m-0")}>
                Approved representatives receive the sheet's access link directly.
                Questions, or a project already in mind —{" "}
                <a
                  href="mailto:info@themandalacompany.com?subject=Representatives%20%E2%80%94%20project"
                  className="text-accent hover:underline"
                >
                  info@themandalacompany.com
                </a>
                .
              </p>
            </div>
          </Reveal>
        </section>

        {/* ── APPLY / CLOSE ── */}
        <section className="py-6 md:py-8">
          <Reveal as="div" className="border-t border-line pt-4 md:pt-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 items-start mb-8">
              <div className="lg:col-span-5">
                <p className={cn(EYEBROW, "m-0 mb-3.5")}>Apply to represent the estate</p>
                <h2 className={cn(TITLE, "max-w-none m-0")}>
                  Open a conversation.
                </h2>
              </div>
              <div className="lg:col-span-7 lg:border-l lg:border-line lg:pl-10">
                <p className={cn(SUBTITLE, "max-w-none m-0")}>
                  The estate keeps this circle small on purpose. If you have a room,
                  a property or a client where Stephen's work belongs, tell us — and
                  we'll take it from there. No rush, no rate card: only a
                  conversation, and generous private terms once it's a fit.
                </p>
              </div>
            </div>

            <RepresentativeApplication />
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
};
