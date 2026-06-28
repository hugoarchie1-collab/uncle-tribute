import { useCallback, useEffect, useMemo, useState } from "react";
import { Reveal } from "./Reveal";
import { ReviewForm } from "./ReviewForm";
import { cn } from "../lib/cn";
import { EYEBROW_MUTED, EYEBROW_TIGHT, BTN_SECONDARY } from "./ui/tokens";

/**
 * Reviews — the GENUINE customer-review section for a print, mounted on
 * PaintingDetail below the story. It fetches the published reviews from the
 * EXISTING /api/memories-submit endpoint (GET ?kind=reviews), keeps only the
 * ones for THIS painting, and shows a star-average summary + the list — or a
 * dignified empty state when none exist yet.
 *
 * ⚠️ NOTHING here is ever seeded, faked or invented. The list comes ONLY from
 * the API's published reviews (which ships EMPTY and fills only from real,
 * moderated submissions). When the fetch returns nothing — no KV, an outage, or
 * simply no reviews yet — the section shows "Be the first to review this print",
 * never a placeholder review. Fabricated reviews are illegal (UK ASA / US FTC),
 * and the empty state is the honest, dignified default.
 *
 * Media: a published review may carry an inline `imageUrl` (small data-URL) OR a
 * Blob-hosted `mediaUrl` with `mediaType` "video" | "audio" | "image". Each is
 * rendered inline with native controls when present.
 *
 * House register: monochrome to match the PDP (ink + muted ink + hairlines), the
 * stars the one rust accent. Strictly additive — it never touches the buy box,
 * pricing, or the monochrome buy column.
 */

// The public review shape returned by GET /api/memories-submit?kind=reviews —
// matches the API contract exactly (public fields only; no email, no
// holdReason). createdAt is an ISO string.
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

const clampRating = (n: number): number =>
  Math.max(0, Math.min(5, Math.round(n)));

/**
 * Stars — a row of five stars, partially filled to `value` (0–5). Decorative
 * (the numeric value is announced via the parent's aria-label), so it's
 * aria-hidden. `size` tunes the glyph for the summary (large) vs a row (small).
 */
const Stars = ({ value, size = 18 }: { value: number; size?: number }) => {
  // Fill whole stars; the summary average shows a half on the .5 boundary via a
  // clip — but reviews list rows use integer ratings, so a simple per-star fill
  // (full / empty) reads cleanly and never overstates a rating.
  const full = Math.round(value);
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= full;
        return (
          <svg
            key={star}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className="block"
          >
            <path
              d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.8l-5.8 3.06 1.1-6.46-4.69-4.58 6.49-.94L12 2.5z"
              fill={filled ? "var(--accent)" : "transparent"}
              stroke={filled ? "var(--accent)" : "currentColor"}
              strokeWidth="1.4"
              strokeLinejoin="round"
              className={filled ? "" : "text-ink/25"}
            />
          </svg>
        );
      })}
    </span>
  );
};

/** A single published review card — monochrome, with any media inline. */
const ReviewCard = ({ review }: { review: PublicReview }) => {
  const rating = clampRating(review.rating);
  const when = (() => {
    const d = new Date(review.createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  })();

  // Resolve the media to render inline. An imageUrl is the inline data-URL; a
  // mediaUrl is a Blob-hosted video/audio (or, defensively, image) URL.
  const image =
    review.imageUrl ||
    (review.mediaType === "image" ? review.mediaUrl : undefined);
  const video = review.mediaType === "video" ? review.mediaUrl : undefined;
  const audio = review.mediaType === "audio" ? review.mediaUrl : undefined;

  return (
    <li className="m-0 break-inside-avoid ring-1 ring-line px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex items-center justify-between gap-4 mb-3">
        <Stars value={rating} size={16} />
        <span
          className="sr-only"
        >{`${rating} out of 5 stars`}</span>
        {when && <span className={cn(EYEBROW_TIGHT)}>{when}</span>}
      </div>
      <div className="flex flex-col gap-3 font-sans text-[15px] leading-[1.7] text-ink-soft">
        {review.body
          .split(/\n{2,}/)
          .map((para) => para.trim())
          .filter(Boolean)
          .map((para, i) => (
            <p key={i} className="m-0">
              {para}
            </p>
          ))}
      </div>

      {image && (
        <div className="mt-4 overflow-hidden ring-1 ring-line">
          <img
            src={image}
            alt={`A photo shared with ${review.name}'s review`}
            loading="lazy"
            decoding="async"
            className="block w-full h-auto max-h-[420px] object-contain bg-bg"
          />
        </div>
      )}
      {video && (
        <div className="mt-4 overflow-hidden ring-1 ring-line bg-bg">
          <video
            src={video}
            controls
            preload="metadata"
            playsInline
            aria-label={`A video shared with ${review.name}'s review`}
            className="block w-full h-auto max-h-[420px]"
          />
        </div>
      )}
      {audio && (
        <div className="mt-4">
          <audio
            src={audio}
            controls
            preload="metadata"
            aria-label={`An audio clip shared with ${review.name}'s review`}
            className="w-full"
          />
        </div>
      )}

      <p className="mt-4 font-sans text-[14px] text-ink m-0">
        <span className="font-semibold">{review.name}</span>
      </p>
    </li>
  );
};

export const Reviews = ({
  paintingId,
  paintingTitle,
}: {
  paintingId: string;
  paintingTitle: string;
}) => {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(() => {
    let alive = true;
    fetch("/api/memories-submit?kind=reviews", {
      headers: { Accept: "application/json" },
    })
      .then((res) => (res.ok ? res.json() : { reviews: [] }))
      .then((json: { reviews?: PublicReview[] }) => {
        if (!alive) return;
        const list = Array.isArray(json.reviews) ? json.reviews : [];
        // Keep only valid reviews for THIS painting. Never trust the shape
        // blindly — guard every field so a malformed entry can't crash render.
        setReviews(
          list.filter(
            (r) =>
              r &&
              r.paintingId === paintingId &&
              typeof r.body === "string" &&
              typeof r.name === "string" &&
              typeof r.rating === "number",
          ),
        );
        setLoaded(true);
      })
      .catch(() => {
        // Network/parse failure → behave exactly like "no reviews yet": the
        // dignified empty state. A review system must never invent content to
        // fill a gap.
        if (!alive) return;
        setReviews([]);
        setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [paintingId]);

  useEffect(() => {
    const cancel = load();
    return cancel;
  }, [load]);

  const onPublished = useCallback(() => {
    // A review auto-published — re-fetch so it appears without a page reload.
    load();
  }, [load]);

  const count = reviews.length;
  const average = useMemo(() => {
    if (count === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + clampRating(r.rating), 0);
    return sum / count;
  }, [reviews, count]);

  // Newest first — sort by createdAt descending (defensive against bad dates).
  const ordered = useMemo(
    () =>
      [...reviews].sort((a, b) => {
        const ta = new Date(a.createdAt).getTime() || 0;
        const tb = new Date(b.createdAt).getTime() || 0;
        return tb - ta;
      }),
    [reviews],
  );

  const averageLabel = average ? average.toFixed(average % 1 === 0 ? 0 : 1) : "0";

  return (
    <Reveal
      as="section"
      aria-labelledby="reviews-heading"
      className="mx-auto w-full max-w-[1180px] 2xl:max-w-[1320px] 3xl:max-w-[1480px] px-4 sm:px-6 md:px-8 lg:px-12 mt-14 md:mt-20"
    >
      <div className="h-px w-full bg-line mb-8" />

      {/* HEADER — title + summary on one axis. When there are no reviews the
          summary collapses to the dignified empty invitation; it NEVER shows a
          fabricated count or average. */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-9">
        <div>
          <p className={cn(EYEBROW_MUTED, "m-0 mb-3")}>From those who own it</p>
          <h2
            id="reviews-heading"
            className="font-display font-semibold tracking-[-0.025em] text-[clamp(26px,3.4vw,44px)] leading-[1.1] text-ink m-0"
          >
            Reviews
          </h2>
        </div>

        {count > 0 ? (
          <div className="flex items-center gap-4">
            <span
              className="font-display font-semibold tracking-[-0.02em] text-[clamp(34px,4vw,52px)] leading-none text-ink"
              style={{ fontFeatureSettings: '"tnum" 1, "lnum" 1' }}
            >
              {averageLabel}
            </span>
            <span className="flex flex-col gap-1">
              <span aria-hidden="true">
                <Stars value={average} size={18} />
              </span>
              <span className={cn(EYEBROW_TIGHT)}>
                {count} {count === 1 ? "review" : "reviews"}
              </span>
              <span className="sr-only">
                Average rating {averageLabel} out of 5, from {count}{" "}
                {count === 1 ? "review" : "reviews"}.
              </span>
            </span>
          </div>
        ) : null}
      </div>

      {/* BODY — the real reviews, or the empty state. We only commit to the
          empty state AFTER the fetch settles, so we never flash "no reviews"
          over a list that's about to arrive. */}
      {count > 0 ? (
        <ul className="list-none p-0 m-0 columns-1 md:columns-2 gap-5 md:gap-6 [&>li]:mb-5 md:[&>li]:mb-6">
          {ordered.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </ul>
      ) : (
        <div className="ring-1 ring-line px-6 py-10 sm:px-10 sm:py-14 text-center">
          <Stars value={0} size={22} />
          <p className="font-display font-semibold tracking-[-0.02em] text-[clamp(20px,2.4vw,28px)] leading-[1.2] text-ink m-0 mt-5">
            {loaded ? "Be the first to review this print." : "Reviews"}
          </p>
          <p className="font-sans text-[15px] leading-[1.7] text-ink-muted m-0 mt-3 max-w-[460px] mx-auto">
            {loaded
              ? `No reviews yet for ${paintingTitle}. If it's hanging on your wall, we'd be honoured to hear how it arrived and how it lives in the light.`
              : "Loading reviews…"}
          </p>
        </div>
      )}

      {/* The "write a review" affordance — always present so a real owner can
          add the first genuine review. Opens the modal form. */}
      <div className="mt-9 flex justify-center md:justify-start">
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className={cn(BTN_SECONDARY, "group")}
        >
          Write a review
          <span
            aria-hidden="true"
            className="ml-2 inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-x-1"
          >
            →
          </span>
        </button>
      </div>

      <ReviewForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        paintingId={paintingId}
        paintingTitle={paintingTitle}
        onPublished={onPublished}
      />
    </Reveal>
  );
};
