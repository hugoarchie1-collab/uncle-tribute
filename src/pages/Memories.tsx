import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { EYEBROW, EYEBROW_MUTED, BTN_PRIMARY, META } from "../components/ui/tokens";
import { MASTHEAD_TITLE_STYLE } from "../components/ui/tokens";
import { Link } from "react-router-dom";
import { cn } from "../lib/cn";
import { asset } from "../lib/asset";
import { useAuth } from "../lib/auth";
import { MEMORIES, type Memory } from "../data/memories";
import { ABOUT, LIFE_DATES, TRIBUTE } from "../data/content";

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
// ScrollBackdrop — the single full-page atmospheric layer, cloned from the
// Collections treatment (src/pages/Collections.tsx ScrollBackdrop) but
// simplified for ONE image with no cross-fade. A blurred peacock-plumage scene
// sits behind the whole comments feed at full opacity, drifting ±6% as the user
// scrolls the document (parallax), so the page reads as part of the same world
// as Collections / Welcome rather than a flatter, separate microsite.
//
// Differences from Collections' ScrollBackdrop: there is only ONE backdrop, so
// it tracks the DOCUMENT scroll (useScroll() with no target) instead of a per-
// section ref, and holds at full opacity throughout (no in/out cross-fade).
// Everything else matches: inset-[-8%] overscan so the ±6% `y` shift can never
// expose an uncovered strip (the parent is overflow-hidden, so the overscan is
// clipped); bg-cover bg-center; and the EXACT shared scrim gradient on top.
//
// Reduced-motion: drop the parallax entirely and render the static div exactly
// like Collections' fallback (calm opacity, will-change:auto so no promoted
// compositing layer is held alive for motion that never runs).
// ---------------------------------------------------------------------------
const ScrollBackdrop = ({ photoUrl }: { photoUrl: string }) => {
  const reduceMotion = useReducedMotion();
  // Whole-document parallax — no `target`, so this tracks the page scroll.
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);

  if (reduceMotion) {
    return (
      <div
        style={{
          backgroundImage: `url("${photoUrl}")`,
          willChange: "auto",
        }}
        className="absolute inset-0 bg-cover bg-center"
        aria-hidden="true"
      />
    );
  }

  return (
    <motion.div
      style={{
        y,
        backgroundImage: `url("${photoUrl}")`,
        willChange: "transform",
      }}
      // OVERSCAN the layer 8% beyond every edge so the ±6% parallax `y` shift
      // can NEVER expose an uncovered strip at the top/bottom — the parent is
      // overflow-hidden, so the overscan is clipped (mirrors Collections).
      className="absolute inset-[-8%] bg-cover bg-center"
      aria-hidden="true"
    />
  );
};

// The pinned founding memory — Stephen's letter to his students, verbatim.
const ARTIST_MEMORY: WallMemory = {
  id: "from-the-artist-sem",
  name: "Stephen Meakin (SEM)",
  relationship: "In his own words, to his students",
  message: ABOUT.studentsLetter,
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
    className="shrink-0 inline-flex items-center justify-center rounded-full bg-bg-elevated ring-1 ring-line transition-colors duration-300 group-hover:ring-accent h-[clamp(34px,7.5vw,40px)] w-[clamp(34px,7.5vw,40px)]"
  >
    <span className="font-display font-semibold not-italic leading-none text-ink transition-colors duration-300 group-hover:text-accent text-[clamp(12.5px,3vw,14px)]">
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
  "font-sans font-normal text-[clamp(14px,1.6vw,19px)] leading-[1.5] text-ink-soft [overflow-wrap:anywhere] m-0";

const CommentRow = ({
  memory,
  pinned = false,
  tile = false,
}: {
  memory: WallMemory;
  pinned?: boolean;
  /** Masonry-tile variant: the visitor card register. The row sits on a subtle
   *  surface + hairline ring so the dense `columns` masonry reads as distinct
   *  framed cards instead of run-together text. Body rendering is unchanged. */
  tile?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const paragraphs = splitParagraphs(memory.message);
  const meta = [memory.relationship, memory.location].filter(Boolean).join(" · ");
  // The letter is ONE ~1632-char paragraph (zero newlines) so paragraph-count
  // folding never fires. Use line-clamp on the collapsed body for a true ~4-line
  // YouTube-style fold that reflows at every width.
  const plain = pinned ? memory.message.replace(/\s+/g, " ").trim() : "";
  const needsFold = pinned && plain.length > 280;
  return (
    <article
      className={cn(
        "group flex gap-[clamp(0.625rem,2vw,0.8rem)]",
        tile
          ? "rounded-2xl bg-bg-soft/70 ring-1 ring-line p-[clamp(0.85rem,2vw,1.1rem)] transition-colors duration-300 hover:ring-line-strong"
          : "py-[clamp(0.4rem,1.2vw,0.6rem)]",
      )}
    >
      {/* AVATAR GUTTER — the contributor's PUBLIC profile picture if they set
          one (shown to everyone, the point of "public" pics); otherwise the
          calm monogram. Same circular size for all. */}
      {memory.avatar ? (
        <img
          src={memory.avatar}
          alt={memory.name}
          className="shrink-0 rounded-full object-cover ring-1 ring-line transition-colors duration-300 group-hover:ring-accent h-[clamp(34px,7.5vw,40px)] w-[clamp(34px,7.5vw,40px)]"
        />
      ) : (
        <Monogram name={memory.name} />
      )}
      {/* BODY COLUMN — min-w-0 stops long words overflowing the flex track */}
      <div className="min-w-0 flex-1">
        {pinned ? (
          <span className="mb-1 inline-flex items-center gap-1.5 font-sans text-[10.5px] font-bold tracking-[0.04em] text-accent">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M14 4l6 6-3 1-4 4-1 5-2-2-4 4-1-1 4-4-2-2 5-1 4-4 1-3z" />
            </svg>
            Pinned
          </span>
        ) : null}
        {/* HEADER LINE — bold name + quiet inline meta on one wrapping baseline */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-sans font-semibold text-[clamp(14.5px,1.7vw,19px)] leading-[1.3] text-ink break-words">
            {memory.name}
          </span>
          {meta ? (
            <span className="font-sans font-normal text-[clamp(12.5px,1.5vw,15px)] leading-[1.3] text-ink-muted break-words">
              {meta}
            </span>
          ) : null}
        </div>
        {/* BODY — upright sans for EVERY row incl. the letter. NEVER italic / serif */}
        <div className="mt-1">
          {needsFold && !expanded ? (
            <p className={cn(BODY_CLASS, "line-clamp-4")}>{plain}</p>
          ) : (
            paragraphs.map((p, i) => (
              <p key={i} className={cn(BODY_CLASS, i > 0 && "mt-2")}>
                {p}
              </p>
            ))
          )}
        </div>
        {needsFold ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-1.5 -mb-3 inline-flex items-center min-h-[44px] font-sans text-[clamp(13px,1.5vw,15.5px)] font-semibold text-ink-muted hover:text-accent transition-colors"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        ) : null}
        {/* OPTIONAL IMAGE — inline comment attachment scale, not a hero. The one
            allowed ring (on the image, never on the row). */}
        {memory.imageUrl ? (
          <div className="mt-2.5 block w-full md:inline-block overflow-hidden rounded-xl ring-1 ring-line bg-bg md:max-w-[clamp(200px,60%,400px)]">
            <img
              src={memory.imageUrl}
              alt={`A photograph shared by ${memory.name}`}
              loading="lazy"
              decoding="async"
              className="block w-full h-auto object-cover object-top md:max-h-[clamp(220px,42vw,380px)]"
            />
          </div>
        ) : null}
      </div>
    </article>
  );
};

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
                        <span className="inline-flex items-center ring-1 ring-ink/30 px-4 py-2.5 font-sans text-[11px] font-bold tracking-[0.04em] rounded-full hover:ring-accent hover:text-accent transition-all">
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
  <section className="relative px-[clamp(1rem,5vw,3rem)] pt-14 md:pt-20 pb-[clamp(1.25rem,3vw,2.25rem)]">
    <div className="mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] 4xl:max-w-[2040px] flex flex-col items-center text-center">
      <Reveal as="div" className="w-full flex items-center gap-4 md:gap-6 border-b border-line pb-2.5 md:pb-3">
        <span aria-hidden className="h-px flex-1 bg-ink/15" />
        <span
          className={cn(EYEBROW, "shrink-0")}
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
        >
          The Pin Board
        </span>
        <span aria-hidden className="h-px flex-1 bg-ink/15" />
        <span className={cn(EYEBROW_MUTED, "shrink-0")}>{LIFE_DATES}</span>
        <span aria-hidden className="h-px flex-1 bg-ink/15" />
      </Reveal>

      <Reveal as="div" className="mt-3 md:mt-4 w-full">
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
        <ScrollBackdrop photoUrl={asset("/img/scenes/memories-scene-v2.webp")} />
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

        {/* 2 · THE WALL — full-width now (NOT a stranded 640px channel). The
            pinned artist comment leads as ONE wide feature row; visitor
            memories then TILE into a balanced CSS-`columns` masonry so they
            fill the width as dense framed cards (PAGE NOTE: tile densely, not a
            tall single column). Container widths track the rest of the site
            (max-w-[1320px]→[1720px]) so the wall reads edge-to-edge, never a
            lonely ribbon on a 4K screen. */}
        <section
          aria-label="Memories of Steve"
          className="mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] 4xl:max-w-[2040px] px-[clamp(1rem,5vw,3rem)] pb-[clamp(2.5rem,5vw,4rem)]"
        >
          {/* a · PINNED artist comment — Stephen's own words lead the wall as a
              single wide feature row (its long letter folds; it would never
              tile cleanly in a column). Composer sits inline to its right on
              lg+ so the share affordance + the founding voice share one band —
              no separate full-width composer strip eating vertical air. */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-[clamp(1.5rem,3vw,2.5rem)] gap-y-4 items-start border-b border-line pb-[clamp(1rem,2vw,1.5rem)]">
            <Reveal as="div" delay={0} className="lg:col-span-8">
              <CommentRow memory={ARTIST_MEMORY} pinned />
            </Reveal>
            {/* composer — the "add a comment" box (X / YouTube idiom): a generic
                avatar + a rounded input placeholder that opens the share modal,
                held in a quiet panel beside the pinned voice. */}
            <div className="lg:col-span-4">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="group w-full flex items-center gap-[clamp(0.625rem,2vw,0.8rem)] text-left rounded-2xl bg-bg-soft/70 ring-1 ring-line p-[clamp(0.85rem,2vw,1.05rem)] transition-colors hover:ring-line-strong"
              >
                <span
                  aria-hidden="true"
                  className="shrink-0 inline-flex items-center justify-center rounded-full h-[clamp(34px,7.5vw,40px)] w-[clamp(34px,7.5vw,40px)] bg-bg-elevated ring-1 ring-line text-ink-muted transition-colors group-hover:ring-accent group-hover:text-accent"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1 font-sans text-[clamp(13.5px,1.6vw,17px)] text-ink-muted transition-colors group-hover:text-ink">
                  Share a memory of Steve…
                </span>
              </button>
            </div>
          </div>

          {/* a2 · THE FAMILY'S FAREWELL — Polly Wedge's funeral tribute, the
              cornerstone family memory. Featured full-width like the pinned
              voice (a 4-paragraph tribute would never tile cleanly as a masonry
              card, and it carries too much weight to sit among the visitor
              tiles). Moved here from the About page at Hugo's direction; reads
              as her posted memory of Steve. Shown in full — never folded. */}
          <Reveal as="div" className="mt-[clamp(1rem,2vw,1.5rem)] border-b border-line pb-[clamp(1rem,2vw,1.5rem)]">
            <CommentRow memory={FAMILY_TRIBUTE} />
          </Reveal>

          {/* b · quiet section eyebrow — a thread divider under the pinned band */}
          <Reveal as="div" className="mt-[clamp(1.1rem,2.5vw,1.9rem)] mb-[clamp(0.75rem,1.5vw,1.1rem)]">
            <p className={cn(EYEBROW_MUTED, "m-0")}>
              {hasVisitorMemories ? "From those who knew him" : "The wall"}
            </p>
          </Reveal>

          {/* c · visitor comments TILED into a balanced masonry. CSS `columns`
              (1 → 2 → 3 → 4 with width) packs the cards densely; each tile is
              break-inside-avoid so a card never splits across a column. Each
              reveals with a small staggered delay capped at 0.2s so a long wall
              never accumulates visible lag; Reveal short-circuits under reduced
              motion. The CommentRow body rendering of the verbatim memory text
              is unchanged — only the row's surface (the `tile` variant) frames
              it inside the column. */}
          {hasVisitorMemories ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 2xl:columns-4 4xl:columns-5 gap-[clamp(0.625rem,1.4vw,0.9rem)] [column-fill:_balance]">
              {visitorMemories.map((memory, i) => (
                <Reveal
                  key={memory.id}
                  as="div"
                  delay={Math.min(i * 0.04, 0.2)}
                  className="mb-[clamp(0.625rem,1.4vw,0.9rem)] break-inside-avoid"
                >
                  <CommentRow memory={memory} tile />
                </Reveal>
              ))}
            </div>
          ) : (
            // Empty state recast in the tile idiom — one card in the same
            // grammar, a dashed-ring "+" avatar + a SANS invitation (no italic).
            // Composed, not broken; sits left so it never floats centred.
            <Reveal as="div" delay={0.08}>
              <article className="flex gap-[clamp(0.625rem,2vw,0.8rem)] rounded-2xl bg-bg-soft/70 ring-1 ring-line p-[clamp(1rem,2.4vw,1.3rem)] max-w-[480px]">
                <span
                  aria-hidden="true"
                  className="shrink-0 inline-flex items-center justify-center rounded-full h-[clamp(34px,7.5vw,40px)] w-[clamp(34px,7.5vw,40px)] border border-dashed border-line bg-bg-elevated"
                >
                  <span className="font-display not-italic text-ink-faint text-[clamp(12.5px,3vw,14px)] leading-none">
                    +
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-sans font-normal text-[clamp(14px,1.6vw,18px)] leading-[1.55] text-ink-muted m-0">
                    No memories have been shared yet — be the first to leave one
                    for Steve, using the box above.
                  </p>
                </div>
              </article>
            </Reveal>
          )}
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
