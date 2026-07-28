import { useEffect, useState } from "react";

/**
 * useReviewStats — fetches the published, moderated reviews for ONE print from
 * the existing `/api/memories-submit?kind=reviews` endpoint and returns a small
 * aggregate `{ count, average }` for THIS painting.
 *
 * Used by PaintingDetail to add a TRUTHFUL Product `aggregateRating` to the
 * page's JSON-LD (⭐ star rich-snippets in search) — but ONLY when real reviews
 * exist. It NEVER invents data: no reviews (empty KV, an outage, or simply none
 * yet) → `{ count: 0, average: 0 }`, and the caller then omits `aggregateRating`
 * entirely. schema.org forbids an empty rating, and fabricated reviews are
 * illegal (UK ASA / US FTC) — the honest zero is the only correct default.
 *
 * Mirrors src/components/Reviews.tsx's fetch + filter + averaging EXACTLY, so
 * the schema's `ratingValue` can never disagree with the average the page shows.
 */

interface PublicReview {
  paintingId: string;
  rating: number;
  name: string;
  body: string;
}

export interface ReviewStats {
  count: number;
  /** Mean of the (1–5 clamped) ratings; 0 when there are no reviews. */
  average: number;
}

const clampRating = (n: number): number => Math.max(0, Math.min(5, Math.round(n)));

export const useReviewStats = (paintingId: string | undefined): ReviewStats => {
  const [stats, setStats] = useState<ReviewStats>({ count: 0, average: 0 });

  useEffect(() => {
    // No painting id (e.g. a render before the route resolves) → leave the
    // honest default {0,0}; never fetch or fabricate.
    if (!paintingId) return;
    let alive = true;
    fetch("/api/memories-submit?kind=reviews", {
      headers: { Accept: "application/json" },
    })
      .then((res) => (res.ok ? res.json() : { reviews: [] }))
      .then((json: { reviews?: PublicReview[] }) => {
        if (!alive) return;
        const list = Array.isArray(json.reviews) ? json.reviews : [];
        // Keep only valid reviews for THIS painting — guard every field so a
        // malformed entry can never skew the aggregate (mirrors Reviews.tsx).
        const mine = list.filter(
          (r) =>
            r &&
            r.paintingId === paintingId &&
            typeof r.rating === "number" &&
            typeof r.body === "string" &&
            typeof r.name === "string",
        );
        if (mine.length === 0) {
          setStats({ count: 0, average: 0 });
          return;
        }
        const sum = mine.reduce((acc, r) => acc + clampRating(r.rating), 0);
        setStats({ count: mine.length, average: sum / mine.length });
      })
      .catch(() => {
        // Network / parse failure behaves exactly like "no reviews yet" — the
        // schema must never invent a rating to fill a gap.
        if (alive) setStats({ count: 0, average: 0 });
      });
    return () => {
      alive = false;
    };
  }, [paintingId]);

  return stats;
};
