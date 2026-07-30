import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { PageMasthead } from "../components/PageMasthead";
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
 * /representatives — the estate's PRIVATE representative programme.
 *
 * Aimed at SELLERS (not buyers): interior designers, art consultants, hospitality
 * specialists and gallerists who introduce / place Stephen Meakin's work with
 * trade & hospitality clients and share in every placement.
 *
 * ⚠️ PRIVATE + PRICE-SILENT by design (from a 3-angle strategy panel):
 *  - Intentionally UNLINKED: not in nav / footer / sitemap; `noindex` + robots
 *    Disallow. It is the single dignified link the estate hands a vetted prospect,
 *    NOT a public recruitment drive — a memorial estate must never publicly read
 *    as a commission scheme.
 *  - NO commission figures / percentages / "earn"/"affiliate" language anywhere
 *    on the page (same discipline as /trade's price-silence). Terms are arranged
 *    privately, 1:1, after a conversation. Words used: representative, placement,
 *    by arrangement, in confidence, professional courtesy. Never: affiliate,
 *    referral link, earn, commission %, sign up, payout.
 *  - Separate from /trade (buyers) — opposite money-flows never cohabit.
 *
 * Reuses the /trade design + the application-form pattern; the form POSTs
 * kind:"representative-application" to /api/newsletter-subscribe (a new branch on
 * the existing email path — zero new backend, respects the 12-function cap).
 */

interface Reason {
  index: string;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
}

// Why this is worth a serious representative's time — leans into SCALE and
// READINESS (turnkey, hospitality, whole-property) so it attracts people who can
// bring project-sized placements, without a single number on the page.
const REASONS: Reason[] = [
  {
    index: "01",
    eyebrow: "A singular body of work",
    title: "Work that carries its own story.",
    body: (
      <>
        Stephen Meakin spent his life on sacred geometry — mandalas built with the
        precision of ancient temples and Persian courts. The catalogue is finite
        and estate-authenticated, hand-numbered within its editions. It is not
        another print line; it is a legacy, and it sells on the strength of the
        story you already believe in.
      </>
    ),
  },
  {
    index: "02",
    eyebrow: "Made for scale",
    title: "Built for whole rooms and whole properties.",
    body: (
      <>
        A single piece or a suite across an entire hotel — the work reads at any
        scale, from an A3 to the 3.6-metre Arista SunStar at Farmacy in Notting
        Hill. Every piece is produced, framed, delivered worldwide and invoiced by
        the estate. You open the door; the family handles everything behind it.
      </>
    ),
  },
  {
    index: "03",
    eyebrow: "Generous, private terms",
    title: "You share in every placement.",
    body: (
      <>
        Representatives are paid a considered share of every placement they bring —
        agreed with you personally, at the outset, and held in confidence. No
        public rate card, no scheme: a professional courtesy between the estate and
        the people who place the work well.
      </>
    ),
  },
];

// The mechanics, in plain steps — turnkey on the estate's side.
const STEPS: { index: string; title: string; body: string }[] = [
  {
    index: "01",
    title: "Introduce",
    body: "Bring the estate a designer, a hospitality group, or a project — a room, a suite, a whole property. A single warm introduction is all it takes to begin.",
  },
  {
    index: "02",
    title: "The estate prepares",
    body: "The family confirms pricing, presents the work, and prepares a considered proposal for the client — handled personally, in the estate's own voice.",
  },
  {
    index: "03",
    title: "Made & delivered",
    body: "Each piece is estate-stamped and made to order, then delivered free worldwide — drop-shipped to the client or to site, timed to the install. Nothing for you to manage.",
  },
  {
    index: "04",
    title: "You're paid",
    body: "On the completed placement, your share is paid — promptly and privately, exactly as agreed at the outset.",
  },
];

// Who the estate is looking for.
const SUITS: { title: string; body: string }[] = [
  {
    title: "Interior designers & consultants",
    body: "You specify art for residential and commercial schemes and want a distinctive, authored body of work to place with confidence.",
  },
  {
    title: "Hospitality & hotel-group specialists",
    body: "You fit out hotels, restaurants and wellness spaces at scale, and know how much a coherent scheme of original work lifts a property.",
  },
  {
    title: "Gallerists & art advisors",
    body: "You advise collectors and rooms, and can present a finite, estate-authenticated catalogue with a genuine story behind it.",
  },
];

type Status = "idle" | "submitting" | "success" | "error";

/**
 * The representative application — captures name / email / company / website /
 * background / who they reach / a note. POSTs kind:"representative-application"
 * to /api/newsletter-subscribe (emails the estate, replyTo the applicant).
 * Price-silent: terms are arranged privately.
 */
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
          background: get("background"),
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
      <div className="border border-line p-7 md:p-9 max-w-[720px]">
        <p className="font-display text-[clamp(24px,3vw,32px)] text-ink m-0 mb-3">
          Thank you.
        </p>
        <p className={cn(SUBTITLE, "max-w-none m-0")}>
          Your note is with the estate. We keep this group small and read every
          application ourselves — we'll reply personally, in confidence, usually
          within a day or two. If it's pressing, write to{" "}
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
    <form onSubmit={handleSubmit} noValidate className="max-w-[820px]">
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
        <label className="block">
          <span className={fieldLabel}>What you do</span>
          <input name="background" className={fieldInput} placeholder="Interior designer, art consultant, hospitality…" />
        </label>
        <label className="block">
          <span className={fieldLabel}>The clients or rooms you reach</span>
          <input name="reach" className={fieldInput} placeholder="Hotels, restaurants, private residences…" />
        </label>
      </div>

      <label className="block mb-5">
        <span className={fieldLabel}>A little about you</span>
        <textarea
          name="message"
          rows={5}
          className={cn(fieldInput, "leading-[1.6] resize-none")}
          placeholder="Who you'd introduce the estate to, and why it's a fit."
        />
      </label>

      {errorMsg && <p className="mb-4 font-sans text-[14px] text-accent m-0">{errorMsg}</p>}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button
          type="submit"
          disabled={status === "submitting"}
          className={cn(
            BTN_PRIMARY,
            "disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          )}
        >
          {status === "submitting" ? "Sending…" : "Apply in confidence"}
          <span aria-hidden="true" className="ml-2">→</span>
        </button>
        <Link
          to="/contact"
          className={cn(META, "inline-flex items-center min-h-[44px] hover:text-accent transition-colors")}
        >
          Or use the contact page →
        </Link>
      </div>
    </form>
  );
};

export const Representatives = () => {
  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      <SceneBackdrop src="/img/scenes/trade-scene-v3.webp" />
      {/* Private + unlinked: noindex, not in nav / footer / sitemap. The single
          dignified link the estate hands a vetted prospect. */}
      <Seo
        title="Representatives"
        description="A private, by-invitation programme for representatives of the estate of Stephen Meakin."
        url="/representatives"
        noindex
      />
      <Nav />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] 4xl:max-w-[1880px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-12 pb-12 md:pb-16">
        {/* ── MASTHEAD ── */}
        <Reveal as="div" className="pb-4 md:pb-5">
          <PageMasthead
            eyebrow="Representatives"
            meta="By invitation"
            title={
              <>
                For those who open <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>the right</em> doors.
              </>
            }
          >
            <Reveal as="div" className="mt-4 md:mt-5 border-t border-line pt-4 md:pt-5">
              <p className={cn(EYEBROW_MUTED, "m-0 mb-3 leading-[1.8]")}>
                The estate of Stephen Meakin · SEM
              </p>
              <p
                className="font-display font-normal tracking-[-0.01em] text-ink m-0 max-w-[68ch]"
                style={{
                  fontVariationSettings: '"opsz" 32, "wght" 400',
                  fontSize: "clamp(21px, 2.5vw, 34px)",
                  lineHeight: 1.26,
                  textShadow: "0 1px 2px rgba(0,0,0,0.55), 0 2px 10px rgba(0,0,0,0.42)",
                }}
              >
                The estate works with a small, private group of representatives —
                designers, consultants and hospitality specialists who bring
                Stephen's work to the projects and properties it belongs in, and
                share in every placement. By invitation, arranged in confidence.
              </p>
              <p className={cn(META, "mt-4 m-0")}>
                Terms are generous, and arranged privately.
              </p>
            </Reveal>
          </PageMasthead>
        </Reveal>

        {/* ── WHY REPRESENT THE ESTATE ── */}
        <section className="py-6 md:py-8">
          <Reveal as="div" className="border-t border-line pt-4 md:pt-5 mb-5 md:mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <p className={cn(EYEBROW, "m-0")}>Why represent the estate</p>
            <p className={cn(EYEBROW_MUTED, "m-0")}>Worth a serious hand</p>
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

        {/* ── HOW IT WORKS ── */}
        <section className="py-6 md:py-8">
          <Reveal as="div" className="border-t border-line pt-4 md:pt-5 mb-5 md:mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <p className={cn(EYEBROW, "m-0")}>How it works</p>
            <p className={cn(EYEBROW_MUTED, "m-0")}>Turnkey, on the estate's side</p>
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
          <Reveal as="div" className="border-t border-line pt-4 md:pt-5 mb-5 md:mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <p className={cn(EYEBROW, "m-0")}>Who this suits</p>
            <p className={cn(EYEBROW_MUTED, "m-0")}>People with the right rooms</p>
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

        {/* ── APPLICATION ── */}
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
                  Tell us who you are and the rooms you reach. We keep this group
                  small and personal — if it's a fit, we'll reply in confidence and
                  agree terms directly with you.
                </p>
                <p className={cn(META, "mt-4 m-0")}>
                  Or write directly to{" "}
                  <a
                    href="mailto:info@themandalacompany.com?subject=Representatives"
                    className="text-accent hover:underline"
                  >
                    info@themandalacompany.com
                  </a>
                  .
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
