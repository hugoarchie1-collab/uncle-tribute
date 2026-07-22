import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { SceneReveal } from "../components/SceneReveal";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { EYEBROW, EYEBROW_MUTED, BTN_PRIMARY, META } from "../components/ui/tokens";
import { MASTHEAD_TITLE_STYLE } from "../components/ui/tokens";
import { Link } from "react-router-dom";
import { cn } from "../lib/cn";
import { asset } from "../lib/asset";
import { useAuth } from "../lib/auth";
import { MEMORIES, type Memory } from "../data/memories";
import { ABOUT, TRIBUTE } from "../data/content";

/**
 * /memories — the Book of Memories. A refined masthead (a meta rule, then the
 * page statement in the shared MASTHEAD_TITLE_STYLE display cut — Fraunces
 * opsz 144 / wght 560, "Steve" in true italic — with the invitation packed
 * immediately beneath under a border-t) opens the page, replacing the earlier
 * over-bold Fraunces-700 logo the owner found "too bold and unprofessional".
 * Below it the wall TILES
 * DENSELY: the pinned artist comment leads as a single wide feature; visitor
 * memories then flow into a balanced MASONRY (CSS `columns`) so they fill the
 * width as dense editorial cards instead of one endless thin single column.
 *
 * The atom is still one shared <CommentRow>: a circular monogram avatar in a
 * left gutter, then a header line (bold NAME + a quieter relationship/location
 * meta on the same baseline), then the message BODY, then an optional inline
 * image. Dense, scannable, dignified — no fabricated engagement (no
 * like/reply/share counts, no fake timestamps). Visitor rows tile inside the
 * masonry with break-inside-avoid; the pinned + composer rows stay full-width.
 *
 * Two voices in one feed, SAME row format:
 *   • A PINNED founding comment — Stephen's own words to his students
 *     (ABOUT.studentsLetter), rendered by the identical <CommentRow> with a
 *     small "Pinned" badge (YouTube's "Pinned by …" idiom). It is privileged
 *     ONLY by position (first) + the badge — never by type. The letter is ONE
 *     long (~1632-char) paragraph, so it is line-clamped to ~4 lines on load
 *     with an inline "Read more" that expands IN PLACE (a layout slice swap,
 *     inherently reduced-motion safe). It is NEVER a wall on load.
 *   • Visitor comments — the file-based MEMORIES seed PLUS any memories that
 *     auto-published to Vercel KV, fetched at runtime from
 *     GET /api/memories-submit. If KV isn't configured the fetch returns an
 *     empty list and the page shows only the committed entries. Each renders as
 *     the same comment row, in full (visitor messages are short).
 *
 * Submitting POSTs to /api/memories-submit, which moderates with OpenAI's free
 * omni-moderation and auto-publishes clean, image-free memories (an attached
 * image always holds for the family's OK). The family is emailed either way.
 *
 * The feed is often sparse — sometimes just the pinned comment. A dignified
 * empty-state row (dashed-ring "+" avatar + a sans invitation, NO italic) holds
 * the empty state so the live page reads as composed, not broken.
 *
 * NO ITALIC, NO SERIF on any body. Every comment body — the artist's letter and
 * every visitor message alike — is font-sans (Hanken Grotesk), UPRIGHT, normal
 * weight, comfortable comment size (~14–16px). Fraunces (font-display) survives
 * ONLY on the page H1/H2 furniture and inside the monogram initials (a glyph in
 * an avatar, exactly like YouTube's avatar letter — never a body). Hierarchy per
 * row brightest→quietest: NAME (text-ink) > BODY (text-ink-soft) > META
 * (text-ink-muted). Accent (rust) appears at rest ONLY on the "Pinned" badge;
 * everywhere else it is hover/focus only (the monogram warms, "Read more"
 * brightens). Hairlines route through divide-line / border-line — no invented
 * greys. Fully fluid — clamp() type + spacing, every body column min-w-0 so long
 * words never overflow the flex track; holds 320 → 1920 with zero horizontal
 * scroll. Reduced-motion safe via the shared <Reveal>.
 */

type Status = "idle" | "submitting" | "success" | "error";

/** A memory plus an optional published image URL (from KV). */
type WallMemory = Memory & { imageUrl?: string; avatar?: string };

// ---------------------------------------------------------------------------
// ScrollBackdrop — the single full-page atmospheric layer. A blurred peacock-
// plumage scene sits behind the whole comments feed at full opacity, held as a
// plain STATIC bg-cover layer. (The old scroll-parallax + inset-[-8%] overscan
// jumped to a stale scroll position on route transitions, reading as a
// zoom+jump — so it's a static image now.)
// ---------------------------------------------------------------------------
const ScrollBackdrop = ({ photoUrl }: { photoUrl: string }) => (
  <div
    style={{
      backgroundImage: `url("${photoUrl}")`,
      willChange: "auto",
    }}
    className="absolute inset-0 bg-cover bg-center"
    aria-hidden="true"
  />
);

// The pinned founding memory — Stephen's letter to his students, verbatim.
const ARTIST_MEMORY: WallMemory = {
  id: "from-the-artist-sem",
  name: "Stephen Meakin (SEM)",
  relationship: "In his own words, to his students",
  message: ABOUT.studentsLetter,
  // Stephen with his TAGA workshop students, each holding a mandala they
  // painted — moved here from the About page (Hugo) to sit with his own words
  // to those students.
  imageUrl: "/img/about/08-taga-group.jpg",
};

// The family's farewell — Polly Wedge's funeral tribute, moved here from the
// About page (Hugo, 2026-06-29: a bio page is the wrong home for it; it belongs
// on the wall as her posted memory of Steve). Sourced VERBATIM from content.ts
// TRIBUTE so the words live in exactly ONE place and stay untouched; joined with
// blank lines so CommentRow's splitParagraphs renders the four paragraphs. It is
// featured (not tiled) directly under the pinned artist voice — the cornerstone
// family memory, never folded.
const FAMILY_TRIBUTE: WallMemory = {
  id: "family-tribute-polly-wedge",
  name: "Polly Wedge",
  relationship: "Written for Stephen's funeral",
  message: TRIBUTE.paragraphs.join("\n\n"),
  // Stephen with Polly — moved here from the About page (Hugo) so her farewell
  // carries a photo of them together.
  imageUrl: "/img/about/23-costume-evening.jpg",
};

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB — matches the endpoint's cap

const splitParagraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

// Derive 1–2 initials from a name for the monogram avatar. Single word → first
// letter; multiple → first + last. Empty / whitespace → a quiet middot.
const initialsOf = (name: string) => {
  // Drop parentheticals like "(SEM)" first, then take letter-only tokens — so
  // "Stephen Meakin (SEM)" → "SM" (not "S(" or "SS"). Empty → a quiet middot.
  const parts = name.replace(/\([^)]*\)/g, " ").match(/\p{L}+/gu) ?? [];
  const first = parts[0]?.[0];
  if (!first) return "·";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
};

// ---------------------------------------------------------------------------
// Monogram — the avatar of the comment row (no real photos exist). A calm
// cream-on-near-black circle holding the person's initials in the display
// serif — the ONE sanctioned in-row Fraunces use, a glyph in an avatar exactly
// like YouTube's avatar letter, never a body. It NEVER carries an accent fill;
// it only WARMS (ring + initials → accent) on the row's group-hover /
// focus-within. Comment scale, ONE size for everyone — the pinned avatar is NOT
// enlarged (rank is the "Pinned" chip, per real YouTube/X). The size prop is
// kept in the signature for safety but no caller passes it.
// ---------------------------------------------------------------------------
const Monogram = ({ name }: { name: string; size?: "md" | "lg" }) => (
  <span
    aria-hidden="true"
    className="shrink-0 inline-flex items-center justify-center rounded-full bg-bg-elevated ring-1 ring-line transition-colors duration-300 group-hover:ring-accent h-[clamp(40px,4vw,46px)] w-[clamp(40px,4vw,46px)]"
  >
    <span className="font-display font-semibold not-italic leading-none text-ink transition-colors duration-300 group-hover:text-accent text-[clamp(15px,3vw,17px)]">
      {initialsOf(name)}
    </span>
  </span>
);

// ---------------------------------------------------------------------------
// CommentRow — the ONE shared row of the comments feed. `pinned` makes it the
// artist's row (a "Pinned" badge, YouTube-style); otherwise it is a visitor
// comment. Identical grammar either way: a monogram avatar in a left gutter,
// then a header line (bold NAME + quiet inline relationship/location meta on one
// wrapping baseline), then the BODY, then an optional inline image attachment.
//
// EVERY body — the artist's letter and every visitor message alike — uses
// BODY_CLASS: font-sans (Hanken Grotesk), UPRIGHT, normal weight, comfortable
// comment size. NEVER italic, NEVER font-display/serif, NEVER a <blockquote>.
// The letter is privileged only by position + the badge, never by type.
//
// FLAT row — no card chrome: no ring on the row, no rounded surface, no shadow,
// no bg fill. Rows are separated solely by the divide-y hairlines of the list.
// The min-w-0 on the body column is MANDATORY so long words can't overflow the
// flex track. Only the pinned row folds (line-clamp-4 + inline Read more, a
// layout slice swap, reduced-motion safe); visitor messages render in full.
// No per-row footer, no "A memory of Steve" label, no metrics / icons / reply /
// share — the avatar+name+meta+divider structure carries the comments idiom.
// ---------------------------------------------------------------------------
const BODY_CLASS =
  "font-sans font-normal text-[clamp(16px,1.5vw,18px)] leading-[1.6] text-ink-soft [overflow-wrap:anywhere] m-0";

// ---------------------------------------------------------------------------
// PhotoLightbox — the X.com-style photo viewer. Tapping any attached photo in
// the feed lifts it out of the card onto a dimmed, blurred backdrop as a large
// centered "island" that springs up (Hugo 2026-07-21: "click expansion on the
// image and it looks all neat with an island coming up like X would"). Dark
// scrim + backdrop-blur behind; the photo is shown WHOLE (object-contain, up to
// 90vh × 92vw) so a face is never sliced even at full size; a round close
// button top-right; click-outside / Escape / the close button all dismiss it;
// body scroll is locked while open and focus returns to the opener. Sits at
// z-[210], ABOVE the z-[200] share modal. Reduced-motion → instant fade, no
// spring. Self-contained: each PostCard owns one, opened from its own media.
// ---------------------------------------------------------------------------
const PhotoLightbox = ({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}) => {
  const reduce = useReducedMotion();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (opener && document.contains(opener)) opener.focus?.();
    };
  }, [open]);

  // Rendered through a PORTAL to <body> — the card ancestors run framer-motion
  // transforms, and a `position: fixed` element nested under a transformed
  // ancestor re-bases to that ancestor (not the viewport), which dropped the
  // island below the fold. Portalling to body guarantees it centres on the
  // viewport. (SSR/prerender guard: no document → render nothing.)
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Photograph"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.22 }}
        >
          {/* Dimmed, blurred backdrop — the feed recedes behind the island. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />
          {/* Round close control, top-right (X idiom). */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close photo"
            className="absolute right-4 top-4 z-[2] inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-ink ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-white/20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          {/* The photo island — springs up, shown whole (never cropped). */}
          <motion.img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="relative z-[1] block h-auto max-h-[90vh] w-auto max-w-[92vw] rounded-[10px] object-contain shadow-[0_40px_120px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 8 }}
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 260, damping: 26 }
            }
          />
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

// ---------------------------------------------------------------------------
// PostCard — the ONE self-contained social POST of the feed (Instagram/Threads/
// X idiom). Replaces the old flat CommentRow. `pinned` makes it the artist's
// founding post (a warm ring + a "Pinned" chip + top position — never enlarged,
// never a different surface). Otherwise it is the family tribute or a visitor
// memory, IDENTICAL grammar.
//
// The card is `overflow-hidden rounded-[20px]` so the attached media can BLEED
// edge-to-edge to the card's rounded corners — the fix for images reading as
// "not attached". Header + body get horizontal padding; the media does NOT, so
// it sits flush to the card edge under a hairline `border-t` seam, exactly like
// a photo attached to an IG/Threads post.
//
// MEDIA is `object-contain` on a dark matte with a `max-h` cap (NEVER `cover`,
// NEVER a forced aspect ratio): the group + couple photos must never slice a
// face (hard memorial rule), and the height cap kills the old "massive" full-
// width max-h-[600px] treatment — a shared photo now reads as a normal in-feed
// image, not a page-dominating slab.
//
// The pinned artist letter (~1632 chars, one paragraph) still folds to ~4 lines
// with an inline "Read more" that expands IN PLACE (a layout slice swap,
// reduced-motion safe). Visitor + family posts render in full.
// ---------------------------------------------------------------------------
const PostCard = ({
  memory,
  pinned = false,
}: {
  memory: WallMemory;
  pinned?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(false);
  const paragraphs = splitParagraphs(memory.message);
  const meta = [memory.relationship, memory.location].filter(Boolean).join(" · ");
  // EVERY long post folds now (Hugo 2026-07-21: "add a see more to see more or
  // less of text"), not just the pinned artist letter. The collapsed view is a
  // true ~4-line line-clamp of the whitespace-normalised text that reflows at
  // every width; expanding restores the real paragraph breaks.
  const plain = memory.message.replace(/\s+/g, " ").trim();
  const needsFold = plain.length > 280;
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[20px] bg-bg-soft/92 backdrop-blur-[3px] ring-1 ring-line transition-colors duration-300 hover:ring-line-strong",
        pinned && "ring-accent/40 hover:ring-accent/55",
      )}
    >
      {/* HEADER — avatar + name over a quiet meta "handle" line (STACKED, the
          key "reads as a post" lever), + the Pinned chip. Text is padded; the
          media below will run flush to the card edge. */}
      <header className="flex items-center gap-[clamp(0.6rem,1.6vw,0.8rem)] px-[clamp(1rem,2.4vw,1.4rem)] pt-[clamp(1rem,2.4vw,1.35rem)]">
        {/* The contributor's PUBLIC profile picture if they set one; else the
            calm monogram. Same circular size for all. */}
        {memory.avatar ? (
          <img
            src={memory.avatar}
            alt={memory.name}
            className="shrink-0 rounded-full object-cover ring-1 ring-line transition-colors duration-300 group-hover:ring-accent h-[clamp(40px,4vw,46px)] w-[clamp(40px,4vw,46px)]"
          />
        ) : (
          <Monogram name={memory.name} />
        )}
        <div className="min-w-0 flex-1">
          <p className="m-0 font-sans font-semibold text-[clamp(15.5px,1.5vw,18px)] leading-[1.25] text-ink truncate">
            {memory.name}
          </p>
          {meta ? (
            <p className="m-0 font-sans text-[clamp(13px,1.3vw,15px)] leading-[1.3] text-ink-muted truncate">
              {meta}
            </p>
          ) : null}
        </div>
        {pinned ? (
          <span className="shrink-0 ml-auto inline-flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-1 font-sans text-[13px] font-bold tracking-[0.05em] uppercase text-accent">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M14 4l6 6-3 1-4 4-1 5-2-2-4 4-1-1 4-4-2-2 5-1 4-4 1-3z" />
            </svg>
            Pinned
          </span>
        ) : null}
      </header>

      {/* BODY — upright sans for EVERY post incl. the letter. NEVER italic/serif */}
      <div className="px-[clamp(1rem,2.4vw,1.4rem)] pt-[clamp(0.7rem,1.4vw,0.9rem)] pb-[clamp(0.9rem,1.8vw,1.15rem)]">
        {needsFold && !expanded ? (
          <p className={cn(BODY_CLASS, "line-clamp-4")}>{plain}</p>
        ) : (
          paragraphs.map((p, i) => (
            <p key={i} className={cn(BODY_CLASS, i > 0 && "mt-2.5")}>
              {p}
            </p>
          ))
        )}
        {needsFold ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-1.5 inline-flex items-center min-h-[44px] font-sans text-[clamp(14.5px,1.5vw,16px)] font-semibold text-ink-muted hover:text-accent transition-colors"
          >
            {expanded ? "See less" : "See more"}
          </button>
        ) : null}
      </div>

      {/* ATTACHED MEDIA — reads as a real social upload (Hugo 2026-07-21: "the
          layering of the images is terrible, they don't look like uploads").
          The whole photo is shown (object-contain — a face is NEVER sliced) but
          a BLURRED copy of itself fills the frame behind it, so there are no
          dead dark letterbox bars: the media block always fills the card width
          cleanly, exactly like an in-feed X / Instagram photo. The whole photo
          is a button — tapping it opens the PhotoLightbox island. A round expand
          glyph fades in on hover to signal it. */}
      {memory.imageUrl ? (
        <>
          <figure className="m-0 border-t border-line/60">
            <button
              type="button"
              onClick={() => setZoom(true)}
              aria-label={`Expand the photograph shared by ${memory.name}`}
              className="group/media relative block w-full cursor-zoom-in overflow-hidden bg-bg"
            >
              {/* Blurred self-fill — kills the letterbox bars behind any aspect. */}
              <img
                src={memory.imageUrl}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-45 blur-2xl"
              />
              {/* The real photo, whole + centered, gently zooming on hover. */}
              <img
                src={memory.imageUrl}
                alt={`A photograph shared by ${memory.name}`}
                loading="lazy"
                decoding="async"
                className="relative mx-auto block h-auto max-h-[560px] w-auto max-w-full object-contain transition-transform duration-500 ease-out group-hover/media:scale-[1.015] motion-reduce:transform-none"
              />
              {/* Expand affordance (X idiom) — rises in on hover. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-3 inline-flex h-9 w-9 translate-y-1 items-center justify-center rounded-full bg-black/45 text-white opacity-0 ring-1 ring-white/20 backdrop-blur transition-all duration-300 group-hover/media:translate-y-0 group-hover/media:opacity-100"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </span>
            </button>
          </figure>
          <PhotoLightbox
            src={memory.imageUrl}
            alt={`A photograph shared by ${memory.name}`}
            open={zoom}
            onClose={() => setZoom(false)}
          />
        </>
      ) : null}
    </article>
  );
};

// ---------------------------------------------------------------------------
// ComposerCard — the "add a post" affordance in the PostCard surface (X /
// Threads idiom): a pencil-glyph avatar + a placeholder line + a quiet "Post"
// pill. The whole card is a button that opens the share modal. Lives in a rail
// on desktop and as the first feed item on mobile.
// ---------------------------------------------------------------------------
const ComposerCard = ({ onShare }: { onShare: () => void }) => (
  <button
    type="button"
    onClick={onShare}
    className="group w-full flex items-center gap-[clamp(0.6rem,1.6vw,0.8rem)] text-left rounded-[20px] bg-bg-soft/92 backdrop-blur-[2px] ring-1 ring-line p-[clamp(1rem,2.4vw,1.35rem)] transition-colors hover:ring-line-strong"
  >
    <span
      aria-hidden="true"
      className="shrink-0 inline-flex items-center justify-center rounded-full h-[clamp(40px,4vw,46px)] w-[clamp(40px,4vw,46px)] bg-bg-elevated ring-1 ring-line text-ink-muted transition-colors group-hover:ring-accent group-hover:text-accent"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </span>
    <span className="min-w-0 flex-1 font-sans text-[clamp(14.5px,1.6vw,17px)] text-ink-muted transition-colors group-hover:text-ink">
      Share a memory of Steve…
    </span>
    <span
      aria-hidden="true"
      className="shrink-0 inline-flex items-center rounded-full bg-accent/12 px-3.5 py-1.5 font-sans text-[13px] font-bold tracking-[0.04em] uppercase text-accent"
    >
      Post
    </span>
  </button>
);

// ---------------------------------------------------------------------------
// EmptyStateCard — the feed's empty state in the PostCard surface, so an empty
// wall reads as "a feed waiting for its first post": a dashed-ring "+" avatar +
// a sans invitation (NO italic). Composed, not broken.
// ---------------------------------------------------------------------------
const EmptyStateCard = () => (
  <article className="flex items-center w-full gap-[clamp(0.75rem,2vw,1.1rem)] rounded-[20px] bg-bg-soft/92 backdrop-blur-[2px] ring-1 ring-line p-[clamp(1.1rem,2.6vw,1.6rem)]">
    <span
      aria-hidden="true"
      className="shrink-0 inline-flex items-center justify-center rounded-full h-[clamp(40px,4vw,46px)] w-[clamp(40px,4vw,46px)] border border-dashed border-line bg-bg-elevated"
    >
      <span className="font-display not-italic text-ink-faint text-[clamp(15px,3vw,17px)] leading-none">
        +
      </span>
    </span>
    <div className="min-w-0 flex-1">
      <p className="font-sans font-normal text-[clamp(15px,1.6vw,18px)] leading-[1.55] text-ink-muted m-0">
        No memories have been shared yet — be the first to leave one for Steve,
        using the box above.
      </p>
    </div>
  </article>
);

// ---------------------------------------------------------------------------
// Share-a-memory modal — preserved from the original implementation (focus
// trap, Escape, body-scroll lock, honeypot, aria-live status, optional image
// upload, all fields + validation + success/error states). Behaviour unchanged.
// ---------------------------------------------------------------------------
const ShareMemoryModal = ({
  open,
  onClose,
  signedIn,
  accountEmail,
}: {
  open: boolean;
  onClose: () => void;
  signedIn: boolean;
  accountEmail: string | null;
}) => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [autoPublished, setAutoPublished] = useState(false);
  const [imageName, setImageName] = useState("");
  const [imageError, setImageError] = useState("");
  const imageDataRef = useRef<string>("");
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const onCloseRef = useRef(onClose);
  // Keep the ref pointing at the latest onClose so the keydown handler can call
  // it without re-subscribing. Mirrored in an effect (not during render) per the
  // react-hooks/refs rule — behaviour is identical to the prior render-time
  // assignment. Modal focus-trap behaviour is otherwise UNCHANGED.
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      // Intentional synchronous reset when the modal closes — the form must be
      // blank the next time it opens. This is the documented exception to
      // set-state-in-effect (syncing to an external "open" prop), not a
      // cascading-render bug, so the rule is disabled for these resets only.
      /* eslint-disable react-hooks/set-state-in-effect */
      setStatus("idle");
      setErrorMsg("");
      setAutoPublished(false);
      setImageName("");
      setImageError("");
      /* eslint-enable react-hooks/set-state-in-effect */
      imageDataRef.current = "";
      return;
    }
    // Capture the opener so focus returns to the trigger on close (a11y).
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input:not([type="hidden"]):not([tabindex="-1"]), select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 80);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    imageDataRef.current = "";
    setImageName("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("That image is over 4MB — please choose a smaller one.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      imageDataRef.current = typeof reader.result === "string" ? reader.result : "";
      setImageName(file.name);
    };
    reader.onerror = () => {
      setImageError("Couldn't read that image — please try another.");
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Belt to the sign-in gate above: never accept an anonymous submission.
    if (!signedIn) {
      setStatus("error");
      setErrorMsg("Please sign in to share a memory.");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const message = String(data.get("message") || "").trim();
    const relationship = String(data.get("relationship") || "").trim();
    const location = String(data.get("location") || "").trim();
    const email = String(data.get("email") || "").trim();
    const botcheck = String(data.get("botcheck") || "");

    if (!name || !message) {
      setStatus("error");
      setErrorMsg("Please add your name and a memory to share.");
      return;
    }

    // The signed-in contributor's PUBLIC profile picture (set on /account)
    // rides along so their face shows beside their words on the wall.
    let avatar: string | undefined;
    try {
      avatar = localStorage.getItem("tasm.avatar") || undefined;
    } catch {
      avatar = undefined;
    }

    try {
      const res = await fetch("/api/memories-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name,
          message,
          relationship,
          location,
          email,
          botcheck,
          image: imageDataRef.current || undefined,
          avatar,
        }),
      });
      if (res.ok) {
        const json = (await res.json().catch(() => ({}))) as { published?: boolean };
        setAutoPublished(!!json.published);
        setStatus("success");
        form.reset();
        return;
      }
      const bodyJson = await res.json().catch(() => ({}));
      setStatus("error");
      setErrorMsg(
        (bodyJson as { error?: string })?.error ||
          "Something went wrong sending your memory. Please try again, or email it to us directly.",
      );
    } catch {
      setStatus("error");
      setErrorMsg(
        "We couldn't reach the estate just now. Please try again in a moment, or email your memory to info@themandalacompany.com.",
      );
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-memory-title"
        >
          <button
            type="button"
            aria-label="Close the share-a-memory form"
            onClick={onClose}
            className="absolute inset-0 bg-black/72 backdrop-blur-sm cursor-pointer"
          />

          <motion.div
            ref={panelRef}
            className="relative w-full max-w-[680px] bg-bg-soft ring-1 ring-line shadow-[0_40px_120px_rgba(0,0,0,0.7)] max-h-[90vh] overflow-y-auto"
            initial={{ y: 24, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="px-7 sm:px-9 py-9 sm:py-11">
              <div className="flex items-start justify-between gap-4 mb-7">
                <div>
                  <p className={cn(EYEBROW, "m-0 mb-3")}>Leave a memory</p>
                  <h2
                    id="share-memory-title"
                    className="font-display font-bold [font-variation-settings:'opsz'_48,'wght'_700] tracking-[-0.04em] text-[clamp(24px,3vw,32px)] leading-[1.1] text-ink m-0"
                  >
                    Share something of Steve.
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="shrink-0 text-ink-muted hover:text-accent transition-colors w-9 h-9 -mr-2 -mt-2 inline-flex items-center justify-center rounded-full hover:bg-white/5"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M3 3 15 15M15 3 3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div aria-live="polite">
                {status === "success" ? (
                  <div className="py-4">
                    <p className="font-display font-bold [font-variation-settings:'opsz'_48,'wght'_700] tracking-[-0.04em] text-[clamp(24px,3vw,32px)] leading-[1.1] text-ink m-0 mb-3">
                      Thank you.
                    </p>
                    <p className={cn(META, "m-0 max-w-[480px]")}>
                      {autoPublished
                        ? "Your memory is now on Steve's wall, and the family has been told. Thank you for taking the time."
                        : "Your memory has reached the family. We read each one with care before it joins the wall — so yours may not appear straight away. Thank you for sharing it."}
                    </p>
                    <button
                      type="button"
                      onClick={onClose}
                      className={cn(BTN_PRIMARY, "mt-7")}
                    >
                      Close
                    </button>
                  </div>
                ) : !signedIn ? (
                  // SIGN-IN GATE — a memory can only be left by a signed-in
                  // visitor (Hugo: "they have to sign in to contribute a
                  // message"). No anonymous wall posts; the account also gives
                  // the family a real person behind each memory.
                  <div className="py-2">
                    <p className={cn(META, "m-0 max-w-[480px]")}>
                      To keep Steve's wall personal and free of spam, memories are
                      shared from a signed-in account. Sign in with your email — it
                      takes a moment — and your name will sit beside your words.
                    </p>
                    <Link
                      to="/account"
                      onClick={onClose}
                      className={cn(BTN_PRIMARY, "mt-7 inline-flex w-fit")}
                    >
                      Sign in to leave a memory
                      <span aria-hidden="true" className="ml-2">→</span>
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate>
                    {/* Honeypot — bots fill the hidden field; we drop them. */}
                    <input
                      type="text"
                      name="botcheck"
                      tabIndex={-1}
                      autoComplete="off"
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
                      aria-hidden="true"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <label className="block">
                        <span className={cn(EYEBROW_MUTED, "block mb-2")}>Your name</span>
                        <input
                          ref={firstFieldRef}
                          name="name"
                          required
                          autoComplete="name"
                          className="w-full bg-bg ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[16px] md:text-[clamp(16px,0.9vw,20px)] text-ink placeholder:text-ink/30 transition-shadow"
                          placeholder="Jane Smith"
                        />
                      </label>
                      <label className="block">
                        <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                          How did you know Steve?
                        </span>
                        <input
                          name="relationship"
                          autoComplete="off"
                          className="w-full bg-bg ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[16px] md:text-[clamp(16px,0.9vw,20px)] text-ink placeholder:text-ink/30 transition-shadow"
                          placeholder="Student, friend, collector…"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <label className="block">
                        <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                          Where from{" "}
                          <span className="normal-case tracking-normal text-ink-muted">(optional)</span>
                        </span>
                        <input
                          name="location"
                          autoComplete="off"
                          className="w-full bg-bg ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[16px] md:text-[clamp(16px,0.9vw,20px)] text-ink placeholder:text-ink/30 transition-shadow"
                          placeholder="Lewes, East Sussex"
                        />
                      </label>
                      <label className="block">
                        <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                          Email{" "}
                          <span className="normal-case tracking-normal text-ink-muted">(optional, never shown)</span>
                        </span>
                        <input
                          name="email"
                          type="email"
                          autoComplete="email"
                          defaultValue={accountEmail ?? undefined}
                          className="w-full bg-bg ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[16px] md:text-[clamp(16px,0.9vw,20px)] text-ink placeholder:text-ink/30 transition-shadow"
                          placeholder="So the family can thank you"
                        />
                      </label>
                    </div>

                    <label className="block mb-4">
                      <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                        Your memory
                      </span>
                      <textarea
                        name="message"
                        required
                        rows={6}
                        className="w-full bg-bg ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[16px] md:text-[clamp(16px,0.9vw,20px)] leading-[1.65] text-ink placeholder:text-ink/30 transition-shadow resize-none"
                        placeholder="A moment with Steve, something he said, what his work means to you…"
                      />
                    </label>

                    {/* Optional image upload */}
                    <div className="mb-5">
                      <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                        A photo{" "}
                        <span className="normal-case tracking-normal text-ink-muted">(optional)</span>
                      </span>
                      <label className="inline-flex items-center gap-3 cursor-pointer">
                        <span className="inline-flex items-center ring-1 ring-ink/30 px-4 py-2.5 font-sans text-[13px] font-bold tracking-[0.04em] rounded-full hover:ring-accent hover:text-accent transition-all">
                          Choose image
                        </span>
                        <input
                          type="file"
                          name="image"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={handleImageChange}
                          className="sr-only"
                        />
                        <span className={cn(META, "truncate max-w-[200px]")}>
                          {imageName || "No file chosen"}
                        </span>
                      </label>
                      <p className={cn(META, "mt-2 m-0")}>
                        Memories with a photo are held for the family to approve before
                        they appear.
                      </p>
                      {imageError && (
                        <p className={cn(META, "mt-2 m-0 text-accent")}>{imageError}</p>
                      )}
                    </div>

                    {errorMsg && (
                      <p className={cn(META, "mb-4 m-0 text-accent")}>{errorMsg}</p>
                    )}

                    <p className={cn(META, "mb-4 m-0")}>
                      Your name and memory will be shown publicly on this wall.
                      Your email stays private and is only used if we need to
                      reach you.
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
                      <button
                        type="submit"
                        disabled={status === "submitting"}
                        className={BTN_PRIMARY}
                      >
                        {status === "submitting" ? "Sending…" : "Share this memory"}
                        <span aria-hidden="true" className="ml-2">→</span>
                      </button>
                      <p className={cn(META, "m-0 max-w-[240px]")}>
                        Your email stays private — it's only so the family can thank you.
                      </p>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ---------------------------------------------------------------------------
// MemoriesMasthead — the refined front cover of the Book of Memories. A meta
// rule, then the page statement set in the shared MASTHEAD_TITLE_STYLE cut
// (Fraunces opsz 144 / wght 560, the elegant high-contrast display master —
// authority through RESTRAINT, never the old crude 700 logo the owner flagged
// as "too bold and unprofessional"), with "Steve" carried in true-italic
// regular weight as the one emphasised word. The "names he answered to"
// invitation packs immediately beneath as the lead under a border-t. No timid
// sub-scale centred title floating in a narrow band; no dead vertical air.
// `onShare` opens the same modal the composer does, surfaced as a primary CTA
// in the masthead so the share affordance reads from the very first screen.
// ---------------------------------------------------------------------------
const MemoriesMasthead = ({ onShare }: { onShare: () => void }) => (
  <section className="relative px-[clamp(1rem,5vw,3rem)] pt-9 md:pt-12 pb-[clamp(1rem,2.5vw,1.75rem)]">
    <div className="mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] 4xl:max-w-[2040px] flex flex-col items-center text-center">
      <Reveal as="div" className="w-full">
        <h1
          className="font-display text-ink m-0 text-balance"
          style={{
            ...MASTHEAD_TITLE_STYLE,
            textShadow: "0 3px 28px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.55)",
          }}
        >
          Memories of <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>Steve</em>
        </h1>
      </Reveal>

      <div className="mt-3 md:mt-4 w-full flex flex-col items-center border-t border-line pt-3 md:pt-4">
        <Reveal as="div">
          <p
            className={cn(EYEBROW_MUTED, "m-0 mb-3 leading-[1.6]")}
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
          >
            A pin board, in his own words &amp; yours
          </p>
        </Reveal>
        <Reveal as="div" delay={0.1} className="mx-auto max-w-[920px] 3xl:max-w-[1040px]">
          <p
            className="font-display font-normal tracking-[-0.01em] text-ink m-0 text-pretty"
            style={{
              fontVariationSettings: '"opsz" 32, "wght" 400',
              fontSize: "clamp(20px, 2vw, 34px)",
              lineHeight: 1.3,
              textShadow: "0 2px 14px rgba(0,0,0,0.7)",
            }}
          >
            Stephen to some, SEM to the art world, Steve to his family. If he
            touched your life, add a memory below — the family reads every one.
          </p>
        </Reveal>
        <Reveal as="div" delay={0.06} className="mt-4 md:mt-5">
          <button type="button" onClick={onShare} className={cn(BTN_PRIMARY, "w-fit")}>
            Share a memory <span aria-hidden="true" className="ml-2">→</span>
          </button>
        </Reveal>
      </div>
    </div>
  </section>
);

export const Memories = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const auth = useAuth();
  const signedIn = auth.status === "signedIn";
  const [published, setPublished] = useState<WallMemory[]>([]);

  // Fetch auto-published memories from KV (via the GET endpoint). Graceful:
  // any failure (or unprovisioned KV) leaves `published` empty and the page
  // shows only the committed file-based MEMORIES.
  useEffect(() => {
    let alive = true;
    fetch("/api/memories-submit", { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : { memories: [] }))
      .then((json: { memories?: WallMemory[] }) => {
        if (alive && Array.isArray(json.memories)) setPublished(json.memories);
      })
      .catch(() => {
        /* unreachable / unprovisioned — fall back to file-based wall */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Wall order: auto-published first (newest from KV), then the committed
  // file-based seed. De-dupe by id (and skip the pinned id so it can never
  // double up) so a memory that was both auto-published AND later pasted into
  // the file doesn't appear twice.
  const seen = new Set<string>([ARTIST_MEMORY.id]);
  const visitorMemories: WallMemory[] = [];
  for (const m of [...published, ...MEMORIES]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    visitorMemories.push(m);
  }
  const hasVisitorMemories = visitorMemories.length > 0;

  // Root is overflow-x-CLIP, never -hidden: `hidden` makes this div a scroll
  // container, which becomes the sticky Nav's scroll ancestor — and since this
  // div never scrolls itself (the window does), the bar silently stopped
  // sticking and could never slide back in on scroll-up. `clip` gives the same
  // no-horizontal-overflow guarantee with NO scroll container (the html/body
  // convention in global.css).
  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      {/* FIXED BACKDROP LAYER — a single full-page blurred aurora-beach scene
          drifting with the document scroll, cloned from the Collections
          treatment (one image, no cross-fade). The whole feed reads over it at
          relative z-10. The z-[200] share modal sits well above this z-0 layer,
          so its stacking is undisturbed. */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <ScrollBackdrop photoUrl={asset("/img/scenes/memories-scene-v3.webp")} />
        {/* Shared scrim — the EXACT site-wide gradient (matches Collections /
            Welcome) so the cream copy stays legible over the photo while the
            backdrop reads as a subdued, moody texture. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,7,6,0.42) 0%, rgba(8,7,6,0.56) 45%, rgba(8,7,6,0.70) 100%)",
          }}
        />
        {/* Cursor-clarity reveal — the scene brightens/clears where the pointer
            is, the same affordance as the home/About backdrop. */}
        <SceneReveal photoUrl={asset("/img/scenes/memories-scene-v3.webp")} />
      </div>
      <Seo
        title="Memories"
        description="A wall of memories of Stephen Meakin (SEM, 1966–2021) — mandala artist and sacred geometer. Share a memory of Steve with the family and his students."
        url="/memories"
      />
      <Nav />

      <main className="relative z-10 flex-1">
        {/* 1 · MASTHEAD — bold left-aligned front cover (the AboutMasthead
            recipe). Replaces the old timid 640px-band centred header that
            floated a sub-scale h1 in dead horizontal space. */}
        <MemoriesMasthead onShare={() => setModalOpen(true)} />

        {/* 2 · THE FEED — ONE narrow, centred column, the true Instagram /
            Threads / X atom (Hugo, 2026-07-22: "the images are so wide even at
            default view, it doesn't look like instagram threads or x.com").
            NO side rails, NO masonry, NO wide multi-column grid — just the
            composer at the top (like X's compose box) then the posts stacked, all
            capped to a social ~600px measure so a shared photo never sprawls the
            width of the screen. */}
        <section
          aria-label="Memories of Steve"
          className="mx-auto w-full max-w-[600px] px-[clamp(1rem,5vw,1.5rem)] pb-[clamp(2rem,4vw,3.5rem)] text-left"
        >
          <div className="flex flex-col gap-[clamp(0.85rem,1.8vw,1.2rem)]">
            {/* Composer at the TOP of the feed — the "leave a memory" box. */}
            <ComposerCard onShare={() => setModalOpen(true)} />

            {/* PINNED — Stephen's own words to his students (its long letter
                folds). Rank = position + warm ring + chip only. */}
            <Reveal as="div" delay={0}>
              <PostCard memory={ARTIST_MEMORY} pinned />
            </Reveal>

            {/* FAMILY — Polly Wedge's funeral tribute lives HERE, on the memories
                wall (Hugo: keep it on memories only, not About). Shown in full. */}
            <Reveal as="div" delay={0.05}>
              <PostCard memory={FAMILY_TRIBUTE} />
            </Reveal>

            {hasVisitorMemories ? (
              <Reveal as="div" className="pt-[clamp(0.5rem,1.2vw,0.9rem)]">
                <p className={cn(EYEBROW_MUTED, "m-0")}>From those who knew him</p>
              </Reveal>
            ) : null}

            {hasVisitorMemories ? (
              visitorMemories.map((memory, i) => (
                <Reveal key={memory.id} as="div" delay={Math.min(i * 0.05, 0.25)}>
                  <PostCard memory={memory} />
                </Reveal>
              ))
            ) : (
              <Reveal as="div" delay={0.08}>
                <EmptyStateCard />
              </Reveal>
            )}
          </div>
        </section>

      </main>

      <FooterCatalogue />
      <Footer />
      <ShareMemoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        signedIn={signedIn}
        accountEmail={auth.status === "signedIn" ? auth.email : null}
      />
    </div>
  );
};
