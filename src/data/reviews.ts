// src/data/reviews.ts — the estate's customer reviews (single source of truth).
//
// ⚠️ REAL REVIEWS ONLY. This file ships EMPTY. Never invent entries or ratings —
// CLAUDE.md forbids fabricated review counts, and an empty rating must never be
// emitted as schema. Reviews are collected via the "leave a review" form on
// /reviews (POSTs kind:"review" to /api/newsletter-subscribe), which emails the
// family. When you approve one, paste it here as an object (newest first) and it
// appears on /reviews automatically. Until at least one real review exists, the
// page shows a dignified "be among the first" state and NO aggregate rating.
//
// Paste-ready template (copy, fill from the approval email, put newest at top):
//   {
//     id: "2026-08-jane-s",           // any stable unique slug
//     name: "Jane S.",                 // display name (initial-only is fine)
//     location: "London",             // optional
//     rating: 5,                       // 1–5, whole number
//     title: "Even better in person",  // optional short headline
//     body: "The framing is impeccable and the colour is extraordinary…",
//     piece: "Mandala of Wild Rose",   // optional — the painting title
//     date: "2026-08-01",             // optional ISO date, for ordering/schema
//   },

export interface Review {
  id: string;
  name: string;
  location?: string;
  rating: number; // 1–5, whole number
  title?: string;
  body: string;
  piece?: string;
  date?: string; // ISO
}

/** Approved reviews, newest first. Ships empty — add real entries only. */
export const REVIEWS: Review[] = [];

/** Only genuinely-usable reviews (a real body + a valid 1–5 rating). */
export const publishedReviews = (): Review[] =>
  REVIEWS.filter((r) => r.body.trim().length > 0 && r.rating >= 1 && r.rating <= 5);

/** Mean rating, or null when there are no reviews (never emit an empty rating). */
export const averageRating = (): number | null => {
  const r = publishedReviews();
  if (r.length === 0) return null;
  return r.reduce((sum, x) => sum + x.rating, 0) / r.length;
};

/** Count of published reviews. */
export const reviewCount = (): number => publishedReviews().length;
