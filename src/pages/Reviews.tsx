import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { ReviewForm } from "../components/ReviewForm";
import { EYEBROW, EYEBROW_MUTED, SUBTITLE, BTN_PRIMARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { PAINTINGS } from "../data/paintings";

/**
 * /reviews — the SITE-WIDE reviews wall. It reads the SAME live, moderated,
 * auto-published reviews the product pages use (GET /api/memories-submit?
 * kind=reviews) and shows every published review across the catalogue, each
 * linked back to its piece. Submission reuses the REAL per-product <ReviewForm>
 * (POSTs kind:"review" to /api/memories-submit) via a piece picker — so there is
 * ONE reviews system, not two.
 *
 * ⚠️ NOTHING is seeded or invented. Empty API → a dignified "be among the first"
 * state and NO aggregate rating (schema.org forbids an empty rating; fabricated
 * reviews are illegal — UK ASA / US FTC). Honest by construction.
 */

interface PublicReview {
  id: string;
  paintingId: string;
  rating: number;
  name: string;
  body: string;
  imageUrl?: string;
  mediaUrl?: string;
  mediaType?: "video" | "audio" | "image";
  createdAt: string;
}

const clampRating = (n: number): number => Math.max(0, Math.min(5, Math.round(n)));

const Stars = ({ value, size = 18 }: { value: number; size?: number }) => {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" className="block">
          <path
            d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.8l-5.8 3.06 1.1-6.46-4.69-4.58 6.49-.94L12 2.5z"
            fill={i <= full ? "rgb(var(--accent))" : "transparent"}
            stroke={i <= full ? "rgb(var(--accent))" : "currentColor"}
            strokeWidth="1.4"
            strokeLinejoin="round"
            className={i <= full ? "" : "text-ink/25"}
          />
        </svg>
      ))}
    </span>
  );
};

// Honest trust signals (documented estate facts — NOT reviews).
const TRUST: { title: string; body: string }[] = [
  { title: "Estate-stamped & numbered", body: "Every print carries the estate stamp and a certificate of authenticity." },
  { title: "Made to order", body: "Printed one at a time on museum-grade giclée by a UK atelier." },
  { title: "Hand-framed to the room", body: "Finished, glazed and ready to hang — nothing off a shelf." },
  { title: "Free delivery worldwide", body: "Insured and delivered anywhere, at no cost to you." },
];

const titleFor = (paintingId: string): string =>
  PAINTINGS.find((p) => p.id === paintingId)?.title ?? "A Stephen Meakin print";

const ReviewCard = ({ r }: { r: PublicReview }) => {
  const rating = clampRating(r.rating);
  const image = r.imageUrl || (r.mediaType === "image" ? r.mediaUrl : undefined);
  return (
    <figure className="m-0 break-inside-avoid ring-1 ring-line bg-ink/[0.02] p-6 md:p-7">
      <Stars value={rating} />
      <span className="sr-only">{`${rating} out of 5 stars`}</span>
      <blockquote className={cn(SUBTITLE, "max-w-none m-0 mt-4 text-[clamp(19px,1.05vw+5px,33px)]")}>
        “{r.body}”
      </blockquote>
      {image && (
        <div className="mt-4 overflow-hidden ring-1 ring-line">
          <img src={image} alt="Shared with this review" loading="lazy" decoding="async" className="block w-full h-auto max-h-[360px] object-contain bg-bg" />
        </div>
      )}
      <figcaption className={cn(EYEBROW_MUTED, "m-0 mt-5 flex flex-wrap items-center gap-x-2")}>
        <span className="text-ink font-semibold">{r.name}</span>
        <span aria-hidden="true" className="text-ink/25">·</span>
        <Link to={`/collections/${r.paintingId}`} className="hover:text-accent transition-colors">
          {titleFor(r.paintingId)}
        </Link>
      </figcaption>
    </figure>
  );
};

export const Reviews = () => {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pickerId, setPickerId] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(() => {
    let alive = true;
    fetch("/api/memories-submit?kind=reviews", { headers: { Accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : { reviews: [] }))
      .then((json: { reviews?: PublicReview[] }) => {
        if (!alive) return;
        const list = Array.isArray(json.reviews) ? json.reviews : [];
        setReviews(
          list.filter(
            (r) => r && typeof r.paintingId === "string" && typeof r.body === "string" && typeof r.name === "string" && typeof r.rating === "number",
          ),
        );
        setLoaded(true);
      })
      .catch(() => {
        if (!alive) return;
        setReviews([]);
        setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  const count = reviews.length;
  const average = useMemo(() => {
    if (count === 0) return 0;
    return reviews.reduce((s, r) => s + clampRating(r.rating), 0) / count;
  }, [reviews, count]);
  const ordered = useMemo(
    () => [...reviews].sort((a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0)),
    [reviews],
  );
  const avgLabel = average ? average.toFixed(average % 1 === 0 ? 0 : 1) : "0";

  const openPicker = () => {
    const id = pickerId || PAINTINGS[0]?.id || "";
    if (id) {
      setPickerId(id);
      setFormOpen(true);
    }
  };

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
          {count > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Stars value={average} size={22} />
              <p className="font-display font-semibold text-ink m-0 text-[clamp(20px,2vw,30px)]">
                {avgLabel}{" "}
                <span className="font-sans font-normal text-ink-muted text-[15px]">
                  from {count} review{count === 1 ? "" : "s"}
                </span>
              </p>
            </div>
          )}
          <p className={cn(EYEBROW_MUTED, "m-0 mt-6 max-w-[620px]")}>
            Reviews are posted by visitors and shown after moderation. We never write or buy reviews.
          </p>
        </Reveal>

        <section className="mt-12 md:mt-16">
          {count > 0 ? (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-5 md:gap-6 [&>figure]:mb-5 md:[&>figure]:mb-6">
              {ordered.map((r) => (
                <ReviewCard key={r.id} r={r} />
              ))}
            </div>
          ) : (
            <Reveal as="div" className="border-t border-line pt-10 md:pt-14 max-w-[60ch]">
              <h2 className="font-display font-semibold tracking-[-0.03em] text-ink m-0 text-[clamp(26px,3.4vw,46px)] leading-[1.06]">
                {loaded ? "Be among the first." : "Loading reviews…"}
              </h2>
              <p className={cn(SUBTITLE, "max-w-none mt-5")}>
                These prints are made to order, one at a time. If you've taken one of Stephen's
                pieces into your home, we'd be honoured to hear how it lives there — and your words
                will be the first shown here.
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
                <p className={cn(SUBTITLE, "max-w-none mt-3 text-[clamp(19px,1.05vw+5px,33px)]")}>{t.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* LEAVE A REVIEW — reuses the real per-product ReviewForm via a picker. */}
        <section className="mt-16 md:mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16 items-start border-t border-line pt-10 md:pt-16">
            <Reveal as="div">
              <p className={cn(EYEBROW, "m-0 mb-4")}>Leave a review</p>
              <h2 className="font-display font-semibold tracking-[-0.035em] text-ink m-0 mb-5 text-[clamp(28px,4vw,60px)] leading-[1.02]">
                Tell us how it lives with you.
              </h2>
              <p className={cn(SUBTITLE, "max-w-[46ch]")}>
                A few honest words help the next collector, and mean a great deal to Stephen's
                family. Choose the piece you own and share your thoughts — we publish every genuine
                review after a quick moderation check.
              </p>
              <p className={cn(EYEBROW_MUTED, "m-0 mt-8")}>The Mandala Company · info@themandalacompany.com</p>
            </Reveal>
            <Reveal as="div" className="ring-1 ring-line bg-ink/[0.03] p-6 md:p-9">
              <label className={cn(EYEBROW_MUTED, "block mb-2")} htmlFor="review-piece">
                Which piece are you reviewing?
              </label>
              <select
                id="review-piece"
                value={pickerId}
                onChange={(e) => setPickerId(e.target.value)}
                className="w-full bg-bg ring-1 ring-line focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[16px] text-ink appearance-none mb-5"
              >
                <option value="">Select a piece…</option>
                {PAINTINGS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <button type="button" onClick={openPicker} disabled={!pickerId} className={cn(BTN_PRIMARY, "w-full sm:w-auto disabled:opacity-50")}>
                Write your review
                <span aria-hidden="true" className="ml-2">→</span>
              </button>
            </Reveal>
          </div>
        </section>
      </main>

      {pickerId && (
        <ReviewForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          paintingId={pickerId}
          paintingTitle={titleFor(pickerId)}
          onPublished={() => load()}
        />
      )}

      <Footer />
    </div>
  );
};
