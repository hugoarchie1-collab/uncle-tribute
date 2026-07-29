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
 * /trade — Trade & Interior Design.
 *
 * A dignified, by-introduction page for interior designers, art consultants
 * and hospitality buyers (hotels, restaurants, wellness spaces). The estate
 * works directly with projects: estate-stamped editions of Stephen Meakin's
 * mandala paintings, framing, and bespoke commissions hand-painted in his
 * tradition by his sister Polly Wedge — the same hand behind the 3.6-metre
 * Arista SunStar at Farmacy, Notting Hill.
 *
 * ⚠️ PRICE-SILENT by design. This public page reveals ZERO numbers — no
 * percentages, no "discount" language. Broadcasting a trade discount destroys
 * the retail perceived value. All trade NUMBERS live ONLY behind the gate (the
 * /trade/pricing sheet, TRADE_ACCESS_CODE) and in the estate's Stripe invoices.
 * The single quiet signal here is "Trade pricing is available on account".
 *
 * Sections: BOLD left-aligned masthead → a "Working with the estate" process
 * strip (enquire → pricing prepared → made & delivered → invoiced, with the
 * advertised 7–10 day lead time) → the three ways in (editions / framing /
 * commissions) → the colourway-suite / schemes pitch → a proper TRADE
 * APPLICATION form (submits via /api/newsletter-subscribe kind:"trade-
 * application", the same no-new-infra path custom-size uses). Dense, restrained,
 * never a "trade discount" shout.
 */

interface Offering {
  index: string;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
}

const OFFERINGS: Offering[] = [
  {
    index: "01",
    eyebrow: "Editions for projects",
    title: "Estate prints, at project scale.",
    body: (
      <>
        Every work in the catalogue is available as an estate-stamped giclée
        print, numbered within its edition, on 350gsm Hahnemühle archival paper,
        printed to order at our London atelier. For multi-room schemes, repeat
        placements or a full suite across a property, volume and project
        pricing is offered <strong>on account</strong> — tell us the spaces
        and the scale and we will prepare a considered quotation.
      </>
    ),
  },
  {
    index: "02",
    eyebrow: "Framing & finishing",
    title: "Framed, glazed and delivery-ready.",
    body: (
      <>
        Prints can be supplied framed in a choice of solid-wood
        finishes (natural oak, stained black, white or walnut), with
        shatter-safe acrylic or an anti-reflective glass upgrade —
        specified for safe transit and ready to hang on install. Sizing,
        glazing and finish can be tailored to a project's specification; we
        will quote framing and crated delivery alongside the edition.
      </>
    ),
  },
  {
    index: "03",
    eyebrow: "Bespoke commissions",
    title: "New work, in Stephen's tradition.",
    body: (
      <>
        For a defining piece, the estate undertakes bespoke commissions —
        scaled, coloured and composed for the room. Each is hand-painted by{" "}
        <strong>Polly (Stephen's sister)</strong>, working in his own
        sacred-geometry tradition. Palette, dimensions and timeline are agreed
        with you from the outset, and lead times are confirmed before any
        commitment.
      </>
    ),
  },
];

// The process, in plain steps. Lead time = the site's advertised made-to-order
// window (7–10 working days), never the printer's name.
const STEPS: { index: string; title: string; body: string }[] = [
  {
    index: "01",
    title: "Enquire",
    body: "Tell us the project — the spaces, the scale, and whether you're after estate editions, framing or a bespoke commission. One considered note is all it takes to begin.",
  },
  {
    index: "02",
    title: "Trade pricing prepared",
    body: "The estate confirms your account and prepares considered trade pricing for the project, held in confidence for your studio. No public list, no negotiation in the open.",
  },
  {
    index: "03",
    title: "Made & delivered",
    body: "Each piece is estate-stamped and made to order, then delivered free worldwide — drop-shipped direct to your client or to site, timed to the install. Allow 7–10 working days; hand-finishing and commissions carry their own confirmed timeline.",
  },
  {
    index: "04",
    title: "Invoiced",
    body: "You're invoiced for the project through a secure payment link. Simple, personal, and handled quietly by the family.",
  },
];

const PROJECT_TYPES = ["Residential", "Hospitality", "Commercial"] as const;
const SCALE_BANDS = [
  "A single piece",
  "A few pieces",
  "A room or suite",
  "A whole property",
  "Not sure yet",
] as const;

type Status = "idle" | "submitting" | "success" | "error";

/**
 * The trade application — a proper capture (studio, website, contact, role,
 * project type, rough scale, optional VAT/company no.) that POSTs to the SAME
 * endpoint as the custom-size enquiry (kind:"trade-application"). No new email
 * infra; the estate is emailed the application via Resend, replyTo the
 * applicant. Price-silent: pricing is prepared offline, on account.
 */
const TradeApplication = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const get = (k: string) => String(data.get(k) || "").trim();

    // Honeypot — a bot fills the hidden field; silently "succeed" and send
    // nothing (mirrors the server-side botcheck guard).
    if (get("botcheck")) {
      setStatus("success");
      form.reset();
      return;
    }

    const name = get("name");
    const email = get("email");
    const studio = get("studio");
    if (!name || !email || !studio) {
      setStatus("error");
      setErrorMsg("Please give your name, studio and email so we can reply.");
      return;
    }

    try {
      const res = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "trade-application",
          name,
          email,
          studio,
          website: get("website"),
          role: get("role"),
          projectType: get("projectType"),
          scale: get("scale"),
          vatNumber: get("vatNumber"),
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
          "We couldn't send that just now — please try again, or email us directly.",
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
    "w-full bg-bg ring-1 ring-line focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[16px] text-ink placeholder:text-ink/30 transition-shadow";

  if (status === "success") {
    return (
      <div className="border border-line p-7 md:p-9 max-w-[720px]">
        <p className="font-display text-[clamp(24px,3vw,32px)] text-ink m-0 mb-3">
          Thank you.
        </p>
        <p className={cn(SUBTITLE, "max-w-none m-0")}>
          Your application is with the estate. We reply personally, usually
          within a day or two, with availability and trade pricing prepared for
          your project. If it's urgent, write to{" "}
          <a
            href="mailto:info@themandalacompany.com?subject=Trade%20application"
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
      {/* Honeypot — visually hidden; bots fill it, we reject. */}
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
          <span className={fieldLabel}>Studio / company *</span>
          <input name="studio" required autoComplete="organization" className={fieldInput} placeholder="Studio name" />
        </label>
        <label className="block">
          <span className={fieldLabel}>Website</span>
          <input name="website" autoComplete="url" className={fieldInput} placeholder="studio.com" />
        </label>
        <label className="block">
          <span className={fieldLabel}>Your name *</span>
          <input name="name" required autoComplete="name" className={fieldInput} placeholder="Jane Smith" />
        </label>
        <label className="block">
          <span className={fieldLabel}>Email *</span>
          <input name="email" type="email" required autoComplete="email" className={fieldInput} placeholder="jane@studio.com" />
        </label>
        <label className="block">
          <span className={fieldLabel}>Your role</span>
          <input name="role" autoComplete="organization-title" className={fieldInput} placeholder="Interior designer, art consultant…" />
        </label>
        <label className="block">
          <span className={fieldLabel}>Project type</span>
          <select name="projectType" defaultValue="" className={cn(fieldInput, "appearance-none")}>
            <option value="">Select…</option>
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={fieldLabel}>Rough scale</span>
          <select name="scale" defaultValue="" className={cn(fieldInput, "appearance-none")}>
            <option value="">Select…</option>
            {SCALE_BANDS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={fieldLabel}>VAT / company no. (optional)</span>
          <input name="vatNumber" autoComplete="off" className={fieldInput} placeholder="For your account" />
        </label>
      </div>

      <label className="block mb-5">
        <span className={fieldLabel}>About the project</span>
        <textarea
          name="message"
          rows={5}
          className={cn(fieldInput, "leading-[1.6] resize-none")}
          placeholder="The spaces, the scale, and whether you're after editions, framing or a commission."
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
          {status === "submitting" ? "Sending…" : "Submit trade application"}
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

export const Trade = () => {
  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      <SceneBackdrop src="/img/scenes/trade-scene-v3.webp" />
      <Seo
        title="Trade & Interior Design"
        description="For interior designers, art consultants and hospitality buyers. Estate-stamped prints of Stephen Meakin's mandala paintings, framing, and bespoke commissions hand-painted in his tradition by Polly (Stephen's sister) — the hand behind the 3.6-metre Arista SunStar at Farmacy, Notting Hill. Trade pricing on account."
        url="/trade"
      />
      <Nav />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] 4xl:max-w-[1880px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-12 pb-12 md:pb-16">
        {/* ── MASTHEAD ── */}
        <Reveal as="div" className="pb-4 md:pb-5">
          <PageMasthead
            eyebrow="Trade & Interior Design"
            meta="By introduction"
            title={
              <>
                For designers and <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>considered</em> spaces.
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
                The estate works directly with interior designers, art
                consultants and hospitality buyers — hotels, restaurants and
                wellness spaces. Whether you are placing a suite of
                estate-stamped prints across a property or commissioning a
                single defining piece, the conversation starts here and is
                handled, quietly and personally, by the family.
              </p>
              {/* The ONE discreet commercial signal — no figures. */}
              <p className={cn(META, "mt-4 m-0")}>
                Trade pricing is available on account.
              </p>
            </Reveal>
          </PageMasthead>
        </Reveal>

        {/* ── HOW IT WORKS ── a quiet four-step process strip. */}
        <section className="py-6 md:py-8">
          <Reveal as="div" className="border-t border-line pt-4 md:pt-5 mb-5 md:mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <p className={cn(EYEBROW, "m-0")}>Working with the estate</p>
            <p className={cn(EYEBROW_MUTED, "m-0")}>Four steps, personally handled</p>
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

        {/* ── WHAT'S OFFERED ── three ways in. */}
        <section className="py-6 md:py-8">
          <Reveal as="div" className="border-t border-line pt-4 md:pt-5 mb-5 md:mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <p className={cn(EYEBROW, "m-0")}>How the estate works with projects</p>
            <p className={cn(EYEBROW_MUTED, "m-0")}>Three ways in</p>
          </Reveal>

          <Reveal as="div" className="grid grid-cols-1 md:grid-cols-3 gap-x-8 lg:gap-x-12 gap-y-8 md:gap-y-0 items-start">
            {OFFERINGS.map((item) => (
              <section
                key={item.index}
                className="md:border-l md:border-line md:pl-6 lg:pl-8 first:md:border-l-0 first:md:pl-0"
              >
                <div className="flex items-baseline gap-4">
                  <span
                    aria-hidden="true"
                    className="font-display font-semibold leading-none tracking-[-0.04em] text-ink/[0.18] select-none"
                    style={{
                      fontVariationSettings: '"opsz" 48, "wght" 600',
                      fontSize: "clamp(40px,4.6vw,68px)",
                    }}
                  >
                    {item.index}
                  </span>
                  <span className={cn(EYEBROW_TIGHT, "translate-y-[-0.2em]")}>
                    {item.eyebrow}
                  </span>
                </div>
                <h2 className="font-display font-semibold tracking-[-0.035em] text-balance text-ink m-0 mt-3.5 text-[clamp(23px,2.6vw,40px)] leading-[1.1]">
                  {item.title}
                </h2>
                <div className={cn(SUBTITLE, "max-w-none mt-3.5 md:mt-4")}>
                  {item.body}
                </div>
              </section>
            ))}
          </Reveal>
        </section>

        {/* ── SETS & SCHEMES ── the colourway-suite pitch (price-silent). */}
        <section className="py-6 md:py-8">
          <Reveal as="div" className="border-t border-line pt-4 md:pt-5 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 items-start">
            <div className="lg:col-span-5">
              <p className={cn(EYEBROW, "m-0 mb-3.5")}>Sets & schemes</p>
              <h2 className={cn(TITLE, "max-w-none m-0")}>
                A palette that hangs together.
              </h2>
            </div>
            <div className="lg:col-span-7 lg:border-l lg:border-line lg:pl-10">
              <p className={cn(SUBTITLE, "max-w-none m-0")}>
                Stephen left many of the mandalas in more than one colourway —
                his own variations, discovered in his studio and issued exactly
                as he set them. For a scheme that should feel authored rather
                than assembled, a suite of colourways from a single work carries
                one hand — and one geometry — through a whole space: a run down a
                corridor, a grid in a lobby, a considered pairing in a suite.
              </p>
              <p className={cn(SUBTITLE, "max-w-none mt-4")}>
                We'll help you compose the set — across sizes, finishes and
                colourways — and prepare it as a single project.{" "}
                <Link to="/collections" className="text-accent hover:underline underline-offset-2">
                  See the collection <span aria-hidden="true">→</span>
                </Link>
              </p>
            </div>
          </Reveal>
        </section>

        {/* ── TRADE APPLICATION ── the proper capture, price-silent. */}
        <section className="py-6 md:py-8">
          <Reveal as="div" className="border-t border-line pt-4 md:pt-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 items-start mb-8">
              <div className="lg:col-span-5">
                <p className={cn(EYEBROW, "m-0 mb-3.5")}>Open a trade account</p>
                <h2 className={cn(TITLE, "max-w-none m-0")}>
                  Make a trade application.
                </h2>
              </div>
              <div className="lg:col-span-7 lg:border-l lg:border-line lg:pl-10">
                <p className={cn(SUBTITLE, "max-w-none m-0")}>
                  Tell us about your studio and the project. We reply personally,
                  usually within a day or two, with availability and trade
                  pricing prepared for the work — and, once you're on account,
                  the private price sheet.
                </p>
                <p className={cn(META, "mt-4 m-0")}>
                  Or write directly to{" "}
                  <a
                    href="mailto:info@themandalacompany.com?subject=Trade%20application"
                    className="text-accent hover:underline"
                  >
                    info@themandalacompany.com
                  </a>
                  .
                </p>
              </div>
            </div>

            <TradeApplication />
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
};
