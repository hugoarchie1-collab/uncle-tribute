// =============================================================================
// PHOTO BOOK — "Steve's Photo Book by Polly Wedge"
// -----------------------------------------------------------------------------
// Personal photographs of Stephen through the years, from the photo book Polly
// made. This is the single source of truth for the /photo-book gallery.
//
// ADDING PHOTOS (once the images are saved under /public/img/photobook/):
//   { src: "/img/photobook/01-steve-studio.jpg", alt: "Steve painting in his
//     studio", caption: "Phoenix Place, Lewes", year: "2015" },
//
// - `src` is a path under /public (JPG/PNG/WebP all fine — the gallery uses a
//   plain lazy <img>, so no WebP sibling is required for screenshots).
// - `alt` is required (accessibility) — a short factual description.
// - `caption` + `year` are optional and shown beneath the photo.
// Order in the array is the order shown (roughly chronological reads best).
// =============================================================================

export interface PhotoBookImage {
  /** Path under /public, e.g. "/img/photobook/01.jpg". */
  src: string;
  /** Short factual description for accessibility. Required. */
  alt: string;
  /** Optional caption shown beneath the photo. */
  caption?: string;
  /** Optional year / era, e.g. "1998" or "Early 2000s". */
  year?: string;
}

// Awaiting Polly's photographs — Hugo will paste the photo-book screenshots in.
// Until then the page shows a dignified "coming soon" state.
export const PHOTOBOOK: PhotoBookImage[] = [];
