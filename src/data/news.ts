// =============================================================================
// NEWS & RELEASES — single source of truth for the /news estate calendar
// -----------------------------------------------------------------------------
// Mirrors how journal.ts / memories.ts / paintings.ts already drive their pages:
// one typed, hand-edited array — no database. The family edits THIS file and
// redeploys, the same deliberate file-based flow as everywhere else on the site.
//
// HOW TO EDIT (read before changing copy):
//   - Newest / soonest first WITHIN each status; the page renders array order.
//   - `status` buckets the entry into the forward spine: "next" (coming next,
//     the imminent horizon) -> "soon" (on the horizon) -> "recent" (already
//     arrived, so the feed has a past as well as a future).
//   - RELEASES (type: "release") get album-cover energy — set `kind` and `cover`
//     to a REAL /img/paintings/<stem>.jpg path. IMPORTANT: the cover stem is NOT
//     always "<id>-<colourway>". The real on-disk stems are: wild-rose-*,
//     english-bluebells-v3, orchis7-*, fol-* (Flower of Life), orchids30-*
//     (Slipper Orchids), peacock-* (Peacock / Minerva), ophiuchus-original,
//     tridecagon-*, lulin-original, enneagon-* . Always .jpg here — AssetImage
//     swaps the .webp sibling via <picture>; NEVER reference .webp in this file.
//     Every cover below is verified present on disk with its .webp sibling.
//   - Dates are HUMAN and reverent ("Coming soon", "Dates to be announced",
//     "In the new year"). NEVER a hard date that reads as a firm commitment, and
//     NEVER a SaaS relative timestamp ("3 days ago").
//   - `isoDate` is OPTIONAL and only for a genuinely confirmed date — it powers
//     an OPTIONAL <time dateTime> for SEO. Leave it undefined while the date is
//     soft; the page never renders isoDate as visible copy.
//   - ctaTo "#notify" scrolls to the Friends & Family sign-up at the foot; a
//     real route (e.g. "/collections") links out where the page genuinely
//     exists. A missing CTA simply leans on the page's notify-me.
//   - These seeds are honest, family-editable PLACEHOLDERS — not announcements
//     of confirmed events. Never weaponise scarcity; never invent firm venues or
//     dates; never attribute invented words to Stephen ("Steve") or Polly.
// =============================================================================

export type NewsType =
  | "release"
  | "announcement"
  | "exhibition"
  | "workshop"
  | "event";

/** Release sub-kind — a Collection releases like an album, a Single like a single. */
export type ReleaseKind = "collection" | "single";

/** Forward-looking status spine. "next" = coming next, "soon" = on the horizon,
 *  "recent" = already arrived. */
export type NewsStatus = "next" | "soon" | "recent";

export interface NewsEntry {
  /** Stable unique id — React key + filter anchor. */
  id: string;
  type: NewsType;
  /** Only meaningful when type === "release". */
  kind?: ReleaseKind;
  status: NewsStatus;
  title: string;
  /** HUMAN, reverent state line for the left date-rail — never a raw timestamp,
   *  never a relative "3 days ago", never a fake firm date. */
  displayDate: string;
  /** Optional machine date — ONLY set once a date is genuinely confirmed; powers
   *  an OPTIONAL <time dateTime> for SEO. Leave undefined while the date is soft
   *  (the page never renders this as visible copy). */
  isoDate?: string;
  /** One or two reverent lines of context. */
  summary: string;
  /** Square cover for RELEASE entries (album-cover energy). .jpg only — see the
   *  stem note in the file header. Omit for text-led entries. */
  cover?: string;
  /** Optional quiet place / collection tag, e.g. "Lewes, East Sussex". */
  location?: string;
  /** Optional CTA. "#notify" scrolls to the foot sign-up; a real route links
   *  out. Omit to lean on the page's notify-me. */
  ctaLabel?: string;
  ctaTo?: string;
}

/** Fixed forward order for the status-grouped spine. */
export const STATUS_ORDER: NewsStatus[] = ["next", "soon", "recent"];

/** Display heading + quiet reverent sub-note for each status group. The heading
 *  is rendered in Fraunces (institutional season-programme authority); the note
 *  is a muted one-liner beside it. */
export const STATUS_META: Record<
  NewsStatus,
  { heading: string; note: string }
> = {
  next: { heading: "Coming next", note: "The closest of the programme" },
  soon: { heading: "On the horizon", note: "Taking shape now" },
  recent: { heading: "Recently", note: "Lately from the estate" },
};

/** Human label for the type pill — releases show their kind, not the word. */
export const TYPE_LABEL: Record<NewsType, string> = {
  release: "Release",
  announcement: "Announcement",
  exhibition: "Exhibition",
  workshop: "Workshop",
  event: "Pop-up events",
};

/** The label shown on a pill: Collection / Single for releases, else the type. */
export const pillLabel = (e: NewsEntry): string =>
  e.type === "release"
    ? e.kind === "collection"
      ? "Collection"
      : "Single"
    : TYPE_LABEL[e.type];

/** Filter axis for the tab row (Beeper's type tabs, restyled as eyebrow pills).
 *  "all" is handled in the component. */
export const NEWS_FILTERS: { id: NewsType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "release", label: "Releases" },
  { id: "exhibition", label: "Exhibitions" },
  { id: "workshop", label: "Workshops" },
  { id: "event", label: "Pop-up events" },
];

export const isRelease = (e: NewsEntry): boolean => e.type === "release";

/** The single most imminent release — the featured next-release hero. One hero,
 *  never a carousel: the first "next" release, else the first "next" entry. */
export const getFeaturedEntry = (entries: NewsEntry[]): NewsEntry | undefined =>
  entries.find((e) => e.status === "next" && e.type === "release") ??
  entries.find((e) => e.status === "next");

/** Entries grouped into the fixed forward order, preserving authoring order
 *  within each group. `excludeId` keeps the featured hero from doubling up. */
export const groupByStatus = (
  entries: NewsEntry[],
  excludeId?: string,
): { status: NewsStatus; heading: string; note: string; entries: NewsEntry[] }[] =>
  STATUS_ORDER.map((status) => ({
    status,
    heading: STATUS_META[status].heading,
    note: STATUS_META[status].note,
    entries: entries.filter((e) => e.status === status && e.id !== excludeId),
  })).filter((g) => g.entries.length > 0);

// -----------------------------------------------------------------------------
// ENTRIES. Soonest/most-meaningful first WITHIN each `status`. Do NOT invent
// dates, venues, or words attributed to Steve/Polly; keep displayDate human and
// honest ("Coming soon"), never a fabricated firm date. A RELEASE entry only
// shows its album cover when `cover` points at a real /img/paintings/<stem>.jpg
// on disk (AssetImage swaps the .webp sibling) — omit `cover` for a colourway
// whose print image isn't prepared yet and the row renders lean (text-led).
//
// Template (copy + fill in a real announcement):
//   {
//     id: "unique-id",
//     type: "release",            // release | announcement | exhibition | workshop | event
//     kind: "collection",         // releases only: collection | single
//     status: "next",             // next | soon | recent
//     title: "…",
//     displayDate: "Coming soon", // human + honest — never a fabricated firm date
//     summary: "…",
//     cover: "/img/paintings/wild-rose-sussex-pink.jpg", // releases only, real file
//     ctaLabel: "Be the first to know",
//     ctaTo: "#notify",
//   },
// -----------------------------------------------------------------------------
export const NEWS: NewsEntry[] = [
  {
    // Orchis 7's Aquamarine colourway — Stephen's own sea-glass variation of the
    // septagon mandala, kept in his studio files. The cover is verified present
    // on disk (orchis7-aquamarine-blue.jpg + its .webp sibling).
    id: "orchis-7-aquamarine",
    type: "release",
    kind: "single",
    status: "soon",
    title: "Orchis 7 — Aquamarine",
    displayDate: "Coming soon",
    summary:
      "Stephen's septagon mandala of thirty Lady's Slipper Orchids, in the cool aquamarine colourway he kept in his own studio files — sea-glass blues set against gold leaf. Issued as a numbered edition.",
    cover: "/img/paintings/orchis7-aquamarine-blue.jpg",
    ctaLabel: "Be the first to know",
    ctaTo: "#notify",
  },
  {
    // Wild Rose's Black Rose colourway — in preparation. Cover is the real
    // Black Rose mandala (Hugo, 2026-06-16); AssetImage swaps to the .webp.
    id: "wild-rose-black-rose",
    type: "release",
    kind: "single",
    status: "next",
    title: "Wild Rose — Black Rose",
    displayDate: "Coming soon",
    summary:
      "A new Black Rose colourway of the Wild Rose mandala — the opening flower of the Habundia series, painted with wild rose oil — is being prepared. Quiet, and issued in a numbered edition.",
    cover: "/img/paintings/wild-rose-black-rose.jpg",
    ctaLabel: "Be the first to know",
    ctaTo: "#notify",
  },
];
