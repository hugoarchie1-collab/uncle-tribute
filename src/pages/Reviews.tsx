import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { EYEBROW, EYEBROW_MUTED, SUBTITLE, BTN_PRIMARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { PAINTINGS } from "../data/paintings";
import { publishedReviews, averageRating, reviewCount, type Review } from "../data/reviews";

/**
 * /reviews — the estate's customer reviews wall + a "leave a review" form.
 *
 * ⚠️ REAL REVIEWS ONLY. Renders src/data/reviews.ts (ships empty → a dignified
 * "be among the first" state; the aggregate rating shows ONLY when real reviews
 * exist — never an empty rating). New reviews POST kind:"review" to
 * /api/newsletter-subscribe, which emails the family to approve + paste in.
 */

// ── stars ────────────────────────────────────────────────────────────────────

const Stars = ({ value, size = 18 }: { value: number; size?: number }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <svg
        key={i}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={i <= value ? "text-accent" : "text-line"}
        fill="currentColor"
      >
        <path d="M12 2.5l2.9 6.06 6.6.79-4.87 4.5 1.28 6.55L12 17.7 6.09 20.9l1.28-6.55L2.5 9.35l6.6-.79L12 2.5z" />
      </svg>
    ))}
  </span>
);

const StarInput = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(i)}
          className="p-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg
            width={30}
            height={30}
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={cn("transition-colors", i <= shown ? "text-accent" : "text-line hover:text-accent/50")}
            fill="currentColor"
          >
            <path d="M12 2.5l2.9 6.06 6.6.79-4.87 4.5 1.28 6.55L12 17.7 6.09 20.9l1.28-6.55L2.5 9.35l6.6-.79L12 2.5z" />
          </svg>
        </button>
      ))}
    </div>
  );
};

// ── review card ──────────────────────────────────────────────────────────────

const ReviewCard = ({ r }: { r: Review }) => (
  <figure className="m-0 ring-1 ring-line bg-ink/[0.02] p-6 md:p-7 h-full flex flex-col">
    <Stars value={r.rating} />
    {r.title && (
      <figcaption className="font-display font-semibold tracking-[-0.02em] text-ink text-[clamp(18px,1.5vw,24px)] leading-[1.2] mt-4">
        {r.title}
      </figcaption>
    )}
    <blockquote className={cn(SUBTITLE, "max-w-none m-0 mt-3 text-[clamp(15px,1vw,18px)] flex-1")}>
      “{r.body}”
    </blockquote>
    <p className={cn(EYEBROW_MUTED, "m-0 mt-5")}>
      {r.name}
      {r.location ? ` · ${r.location}` : ""}
      {r.piece ? ` · ${r.piece}` : ""}
    </p>
  </figure>
);

// ── form ─────────────────────────────────────────────────────────────────────

type Status = "idle" | "submitting" | "success" | "error";

const LeaveAReview = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [rating, setRating] = useState(5);
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
    const message = get("message");
    if (!name || !email || !message) {
      setStatus("error");
      setErrorMsg("Please add your name, email and a few words.");
      return;
    }
    try {
      const res = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "review",
          name,
          email,
          rating,
          title: get("title"),
          location: get("location"),
          paintingTitle: get("piece"),
          message,
          botcheck: "",
        }),
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
        setRating(5);
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
      <div className="ring-1 ring-line bg-ink/[0.03] p-7 md:p-9">
        <p className="font-display text-[clamp(24px,3vw,34px)] text-ink m-0 mb-3">Thank you.</p>
        <p className={cn(SUBTITLE, "max-w-none m-0")}>
          Your review has reached the family. We read every one personally, and
          publish it here once we've had a chance to look. With our warmth.
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
      <div className="mb-5">
        <span className={fieldLabel}>Your rating</span>
        <StarInput value={rating} onChange={setRating} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <label className="block">
          <span className={fieldLabel}>Name</span>
          <input name="name" required autoComplete="name" className={fieldInput} placeholder="Jane S." />
        </label>
        <label className="block">
          <span className={fieldLabel}>Email</span>
          <input name="email" type="email" required autoComplete="email" className={fieldInput} placeholder="jane@example.com" />
        </label>
        <label className="block">
          <span className={fieldLabel}>Location (optional)</span>
          <input name="location" className={fieldInput} placeholder="London" />
        </label>
        <label className="block">
          <span className={fieldLabel}>Which piece? (optional)</span>
          <select name="piece" defaultValue="" className={cn(fieldInput, "appearance-none")}>
            <option value="">Select…</option>
            {PAINTINGS.map((p) => (
              <option key={p.id} value={p.title}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block mb-4">
        <span className={fieldLabel}>Headline (optional)</span>
        <input name="title" className={fieldInput} placeholder="Even better in person" />
      </label>
      <label className="block mb-5">
        <span className={fieldLabel}>Your review</span>
        <textarea name="message" rows={4} required className={cn(fieldInput, "leading-[1.6] resize-none")} placeholder="Tell us about your print — the colour, the framing, how it lives in your home." />
      </label>
      {errorMsg && <p className="mb-4 font-sans text-[14px] text-accent m-0">{errorMsg}</p>}
      <button type="submit" disabled={status === "submitting"} className={cn(BTN_PRIMARY, "w-full sm:w-auto disabled:opacity-60")}>
        {status === "submitting" ? "Sending…" : "Submit your review"}
        <span aria-hidden="true" className="ml-2">→</span>
      </button>
      <p className={cn(EYEBROW_MUTED, "m-0 mt-4")}>
        Reviews are read and published by the family — usually within a few days.
      </p>
    </form>
  );
};

// Honest trust signals (all documented estate facts — NOT reviews). Gives the
// page real substance in place of fabricated social proof.
const TRUST: { title: string; body: string }[] = [
  { title: "Estate-stamped & numbered", body: "Every print carries the estate stamp and a certificate of authenticity." },
  { title: "Made to order", body: "Printed one at a time on museum-grade giclée by a UK atelier." },
  { title: "Hand-framed to the room", body: "Finished, glazed and ready to hang — nothing off a shelf." },
  { title: "Free delivery worldwide", body: "Insured and delivered anywhere, at no cost to you." },
];

// ── page ─────────────────────────────────────────────────────────────────────

export const Reviews = () => {
  const reviews = useMemo(() => publishedReviews(), []);
  const avg = useMemo(() => averageRating(), []);
  const count = reviewCount();
  const hasReviews = reviews.length > 0;

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(140% 95% at 50% -12%, rgba(201,120,68,0.16), rgba(10,9,8,0) 52%)",
            "linear-gradient(180deg, #0c0a09 0%, #0a0908 42%, #080706 100%)",
          ].join(","),
        }}
      />
      <Seo
        title="Reviews"
        description="What collectors say about their Stephen Meakin prints — estate-stamped, hand-framed and made to order. Read reviews, or leave your own."
        url="/reviews"
      />
      <Nav />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1180px] 2xl:max-w-[1320px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-14 pb-16 md:pb-24">
        {/* HERO */}
        <Reveal as="header">
          <p className={cn(EYEBROW, "m-0 mb-6")}>Reviews</p>
          <h1
            className="font-display font-bold text-ink m-0 text-balance"
            style={{
              fontVariationSettings: '"opsz" 48, "wght" 700',
              fontSize: "clamp(40px, 6vw, 104px)",
              lineHeight: 0.94,
              letterSpacing: "-0.035em",
              textShadow: "0 2px 26px rgba(0,0,0,0.5)",
            }}
          >
            In collectors' <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>own words</em>.
          </h1>
          {hasReviews && avg != null && (
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Stars value={Math.round(avg)} size={22} />
              <p className="font-display font-semibold text-ink m-0 text-[clamp(20px,2vw,30px)]">
                {avg.toFixed(1)}{" "}
                <span className="font-sans font-normal text-ink-muted text-[15px]">
                  from {count} review{count === 1 ? "" : "s"}
                </span>
              </p>
            </div>
          )}
        </Reveal>

        {/* REVIEWS or EMPTY STATE */}
        <section className="mt-12 md:mt-16">
          {hasReviews ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 items-stretch">
              {reviews.map((r) => (
                <Reveal as="div" key={r.id} className="h-full">
                  <ReviewCard r={r} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal as="div" className="border-t border-line pt-10 md:pt-14 max-w-[60ch]">
              <h2 className="font-display font-semibold tracking-[-0.03em] text-ink m-0 text-[clamp(26px,3.4vw,46px)] leading-[1.06]">
                Be among the first.
              </h2>
              <p className={cn(SUBTITLE, "max-w-none mt-5")}>
                These prints are made to order, one at a time. If you've taken one
                of Stephen's pieces into your home, we'd be honoured to hear how it
                lives there — and your words will be the first shown here.
              </p>
              <Link to="/collections" className={cn(EYEBROW, "inline-flex items-center gap-2 mt-6 hover:text-ink transition-colors")}>
                See the collection <span aria-hidden="true">→</span>
              </Link>
            </Reveal>
          )}
        </section>

        {/* WHY COLLECTORS TRUST THE ESTATE — honest guarantees, always shown. */}
        <section className="mt-16 md:mt-24">
          <Reveal as="div" className="border-t border-line pt-10 md:pt-14 mb-8 md:mb-10">
            <p className={cn(EYEBROW, "m-0")}>Why collectors trust the estate</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {TRUST.map((t) => (
              <Reveal as="div" key={t.title} className="ring-1 ring-line bg-ink/[0.02] p-6 md:p-7 h-full">
                <h3 className="font-display font-semibold tracking-[-0.02em] text-ink m-0 text-[clamp(18px,1.4vw,24px)] leading-[1.14]">
                  {t.title}
                </h3>
                <p className={cn(SUBTITLE, "max-w-none mt-3 text-[clamp(15px,1vw,18px)]")}>{t.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* LEAVE A REVIEW */}
        <section className="mt-16 md:mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16 items-start border-t border-line pt-10 md:pt-16">
            <Reveal as="div">
              <p className={cn(EYEBROW, "m-0 mb-4")}>Leave a review</p>
              <h2 className="font-display font-semibold tracking-[-0.035em] text-ink m-0 mb-5 text-[clamp(28px,4vw,60px)] leading-[1.02]">
                Tell us how it lives with you.
              </h2>
              <p className={cn(SUBTITLE, "max-w-[46ch]")}>
                A few honest words help the next collector, and mean a great deal to
                Stephen's family. We publish every genuine review — the good and the
                gently critical alike.
              </p>
              <p className={cn(EYEBROW_MUTED, "m-0 mt-8")}>The Mandala Company · info@themandalacompany.com</p>
            </Reveal>
            <Reveal as="div">
              <LeaveAReview />
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
