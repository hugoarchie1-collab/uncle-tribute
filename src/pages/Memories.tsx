import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { EYEBROW, EYEBROW_MUTED, EYEBROW_TIGHT, TITLE, SUBTITLE, BTN_PRIMARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { MEMORIES, type Memory } from "../data/memories";
import { ABOUT } from "../data/content";

/**
 * /memories — the Book of Memories, rebuilt as "The Stream": a clean, modern,
 * card-based feed rather than a "book". A single centred ~640px channel (the
 * page deliberately steps IN from the 860px header band) carries a stack of
 * discrete, self-contained memory cards — each a monogram avatar, a bold name
 * with quiet meta beside it, the message at a comfortable reading size, an
 * optional image, and a hairline footer. Dignified, never social: no counts,
 * no follow, no reactions, no icons.
 *
 * Two voices in the feed:
 *   • A PINNED founding entry — Stephen's own words to his students
 *     (ABOUT.studentsLetter), shown as the FEATURED lead card: elevated surface
 *     + stronger ring + larger lift, the only true italic on the page, with the
 *     letter's tail folded behind an instant (reduced-motion-safe) read-more.
 *   • Visitor memories — the file-based MEMORIES seed PLUS any memories that
 *     auto-published to Vercel KV, fetched at runtime from
 *     GET /api/memories-submit. If KV isn't configured the fetch returns an
 *     empty list and the page shows only the committed entries. Each renders as
 *     a calm bg-soft card with a cream monogram.
 *
 * Submitting POSTs to /api/memories-submit, which moderates with OpenAI's free
 * omni-moderation and auto-publishes clean, image-free memories (an attached
 * image always holds for the family's OK). The family is emailed either way.
 *
 * The feed is often sparse — sometimes just the pinned card. A dignified ghost
 * card (dashed-ring monogram + an italic invitation) holds the empty state so
 * the live page reads as composed, not broken.
 *
 * Typography canon (no bespoke families): font-display = Fraunces (true italic
 * ONLY for genuine quotes + the empty-state aside; non-italic for the page
 * title, monograms and card names), font-sans = Hanken Grotesk for all running
 * prose. Hierarchy inside a card brightest→quietest: NAME (text-ink) > MESSAGE
 * (text-ink-soft) > META + footer (text-ink-muted). Accent appears as TEXT in
 * exactly two earned spots — the page header eyebrow and the pinned eyebrow;
 * everywhere else accent is hover/focus only (the monogram warms on hover, the
 * card ring strengthens). Hairlines route through border-line / ring-line — no
 * invented greys. Fully fluid — clamp() type + spacing, no fixed px that can
 * overflow; holds 320 → 1920 with zero horizontal scroll. Reduced-motion safe
 * via the shared <Reveal>.
 */

type Status = "idle" | "submitting" | "success" | "error";

/** A memory plus an optional published image URL (from KV). */
type WallMemory = Memory & { imageUrl?: string };

// The pinned founding memory — Stephen's letter to his students, verbatim.
const ARTIST_MEMORY: WallMemory = {
  id: "from-the-artist-sem",
  name: "Stephen Meakin (SEM)",
  relationship: "In his own words, to his students",
  message: ABOUT.studentsLetter,
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
// Monogram — the avatar of the card system (no real photos exist). A calm
// cream-on-near-black circle holding the person's initials in the display
// serif. It NEVER carries an accent fill; it only WARMS (ring + initials →
// accent) on the card's group-hover / focus-within. Sized via prop: `md` for
// visitor cards, `lg` for the featured pinned card.
// ---------------------------------------------------------------------------
const Monogram = ({ name, size = "md" }: { name: string; size?: "md" | "lg" }) => (
  <span
    aria-hidden="true"
    className={cn(
      "shrink-0 inline-flex items-center justify-center rounded-full bg-bg-elevated ring-1 ring-line transition-colors duration-300 group-hover:ring-accent",
      size === "lg"
        ? "h-[clamp(52px,7vw,64px)] w-[clamp(52px,7vw,64px)]"
        : "h-[clamp(40px,9vw,52px)] w-[clamp(40px,9vw,52px)]",
    )}
  >
    <span
      className={cn(
        "font-display font-semibold not-italic leading-none text-ink transition-colors duration-300 group-hover:text-accent",
        size === "lg" ? "text-[clamp(18px,2.4vw,22px)]" : "text-[clamp(15px,3.5vw,18px)]",
      )}
    >
      {initialsOf(name)}
    </span>
  </span>
);

// ---------------------------------------------------------------------------
// PinnedCard — the FEATURED lead of the feed. Same card grammar as a visitor
// card, elevated three ways (brighter bg-bg-elevated surface, ring-line-strong,
// shadow-liftLg) so the artist visibly outranks "those who knew him". Stephen's
// letter is the only true italic on the page, tamed to clamp(18,24) with the
// tail past the third paragraph folded behind an instant read-more (a layout
// slice swap — inherently reduced-motion safe). This is the fix for the old
// "giant italic wall": his words still LEAD the feed, contained.
// ---------------------------------------------------------------------------
const PinnedCard = ({ memory }: { memory: WallMemory }) => {
  const paragraphs = splitParagraphs(memory.message);
  const [expanded, setExpanded] = useState(false);
  // The letter is often a SINGLE long paragraph (no blank-line breaks), so we
  // cannot fold on paragraph COUNT (the old guard never fired → the whole letter
  // showed → the "giant italic wall" the redesign had to kill). Instead build a
  // short collapsed PREVIEW from the running text (~2–3 sentences, trimmed to a
  // word boundary) and reveal the full formatted letter on demand. Guarantees a
  // CONTAINED pinned card for any letter, single- or multi-paragraph.
  const plain = memory.message.replace(/\s+/g, " ").trim();
  const PREVIEW_CHARS = 240;
  const needsFold = plain.length > PREVIEW_CHARS + 60;
  const previewText =
    plain.slice(0, PREVIEW_CHARS).replace(/\s+\S*$/, "").replace(/[\s,;:.—-]+$/, "") + "…";
  const showFull = expanded || !needsFold;
  const shown = showFull ? paragraphs : [previewText];
  return (
    <Reveal as="div" delay={0}>
      <article
        aria-labelledby="pinned-memory-heading"
        className="group bg-bg-elevated ring-1 ring-line-strong rounded-2xl shadow-liftLg p-[clamp(1.5rem,5vw,2.5rem)]"
      >
        {/* eyebrow — the ONE earned accent text on the card */}
        <p id="pinned-memory-heading" className={cn(EYEBROW, "m-0 mb-[clamp(1rem,2.5vw,1.25rem)]")}>
          From the artist · Pinned
        </p>

        {/* header row with LARGE monogram */}
        <div className="flex items-start gap-[clamp(0.75rem,2vw,1rem)]">
          <Monogram name={memory.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-semibold not-italic tracking-[-0.02em] leading-[1.2] text-[clamp(19px,2.6vw,24px)] text-ink m-0 break-words">
              {memory.name}
            </h2>
            <p className="mt-1 font-sans text-[clamp(12px,1.4vw,13.5px)] leading-[1.5] text-ink-muted m-0">
              In his own words, to his students
            </p>
          </div>
        </div>

        {/* framing note */}
        <p className="mt-[clamp(1rem,2.5vw,1.25rem)] font-sans text-[clamp(13px,1.5vw,14.5px)] leading-[1.6] text-ink-muted m-0 max-w-[52ch]">
          {ABOUT.studentsIntro}
        </p>

        {/* THE LETTER — genuine quote, TRUE ITALIC, but tamed in size */}
        <blockquote className="mt-[clamp(1.25rem,3vw,1.5rem)] m-0">
          {shown.map((p, i) => (
            <p
              key={i}
              className={cn(
                "font-display italic font-normal tracking-[-0.01em] text-[clamp(18px,2.2vw,24px)] leading-[1.5] text-ink m-0 text-balance",
                i > 0 && "mt-[0.85em]",
              )}
            >
              {p}
            </p>
          ))}
        </blockquote>

        {/* read-more disclosure — shown whenever the letter is long enough to
            fold (keyed on content length, not paragraph count). */}
        {needsFold ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className={cn(
              EYEBROW_TIGHT,
              "mt-[clamp(1rem,2.5vw,1.25rem)] inline-flex items-center gap-2 hover:text-accent transition-colors",
            )}
          >
            {expanded ? "Show less" : "Read the rest of Steve's letter"}
          </button>
        ) : null}

        {/* quiet hairline footer */}
        <div className="mt-[clamp(1.25rem,3vw,1.5rem)] pt-[clamp(0.75rem,2vw,1rem)] border-t border-line flex items-center gap-2.5">
          <span aria-hidden="true" className="h-px w-5 bg-line shrink-0" />
          <span className={cn(EYEBROW_TIGHT, "leading-none")}>Pinned · From the artist</span>
        </div>
      </article>
    </Reveal>
  );
};

// ---------------------------------------------------------------------------
// MemoryCard — a single visitor memory as a self-contained card in the stream.
// Header row: monogram + bold name with quiet meta beneath. Body: the message
// as calm sans prose (NOT italic — italic is reserved for the artist's genuine
// quote). Optional image is object-cover with a clamped max-height so a portrait
// can't tower. A hairline footer carries one quiet "A memory of Steve" label —
// no counts, no icons. Hover is colour + shadow by default (dignified, reduced-
// motion-trivial); the single 2px lift is gated behind motion-safe.
// ---------------------------------------------------------------------------
const MemoryCard = ({ memory }: { memory: WallMemory }) => {
  const paragraphs = splitParagraphs(memory.message);
  const meta = [memory.relationship, memory.location].filter(Boolean).join(" · ");
  return (
    <article
      className={cn(
        "group bg-bg-soft ring-1 ring-line rounded-2xl shadow-lift p-[clamp(1.25rem,4vw,2rem)]",
        "transition-[box-shadow,transform,border-color] duration-300 ease-smooth",
        "hover:ring-line-strong hover:shadow-liftLg focus-within:ring-line-strong",
        "motion-safe:hover:-translate-y-0.5",
      )}
    >
      {/* HEADER ROW */}
      <div className="flex items-start gap-[clamp(0.75rem,2vw,1rem)]">
        <Monogram name={memory.name} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold not-italic tracking-[-0.02em] leading-[1.25] text-[clamp(17px,2.4vw,20px)] text-ink m-0 break-words">
            {memory.name}
          </h3>
          {meta ? (
            <p className="mt-1 font-sans text-[clamp(12px,1.4vw,13.5px)] leading-[1.5] text-ink-muted m-0 break-words">
              {meta}
            </p>
          ) : null}
        </div>
      </div>

      {/* MESSAGE — plain prose, NOT italic */}
      <div className="mt-[clamp(1rem,2.5vw,1.25rem)]">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className={cn(
              "font-sans font-normal text-[clamp(15px,1.8vw,17px)] leading-[1.7] text-ink-soft m-0 [overflow-wrap:anywhere]",
              i > 0 && "mt-[0.85em]",
            )}
          >
            {p}
          </p>
        ))}
      </div>

      {/* OPTIONAL IMAGE — object-cover + clamped max-height so a portrait can't tower */}
      {memory.imageUrl ? (
        <div className="mt-[clamp(1rem,2.5vw,1.25rem)] w-full overflow-hidden rounded-xl ring-1 ring-line bg-bg">
          <img
            src={memory.imageUrl}
            alt={`A photograph shared by ${memory.name}`}
            loading="lazy"
            decoding="async"
            className="block w-full h-auto object-cover max-h-[clamp(240px,46vw,420px)]"
          />
        </div>
      ) : null}

      {/* QUIET HAIRLINE FOOTER — NO metrics, NO icons */}
      <div className="mt-[clamp(1rem,2.5vw,1.25rem)] pt-[clamp(0.75rem,2vw,1rem)] border-t border-line flex items-center gap-2.5">
        <span aria-hidden="true" className="h-px w-5 bg-line shrink-0" />
        <span className={cn(EYEBROW_TIGHT, "leading-none")}>A memory of Steve</span>
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
}: {
  open: boolean;
  onClose: () => void;
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
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setErrorMsg("");
      setAutoPublished(false);
      setImageName("");
      setImageError("");
      imageDataRef.current = "";
      return;
    }
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
            className="absolute inset-0 bg-black/72 backdrop-blur-md cursor-pointer"
          />

          <motion.div
            ref={panelRef}
            className="relative w-full max-w-[600px] bg-bg-soft ring-1 ring-line shadow-[0_40px_120px_rgba(0,0,0,0.7)] max-h-[90vh] overflow-y-auto"
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
                    className="font-display font-semibold tracking-[-0.025em] text-[clamp(24px,3vw,32px)] leading-[1.15] text-ink m-0"
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
                    <p className="font-display font-semibold text-[24px] text-ink m-0 mb-3">
                      Thank you.
                    </p>
                    <p className="font-sans font-normal text-[15px] leading-[1.7] text-ink-muted m-0 max-w-[480px]">
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
                ) : (
                  <form onSubmit={handleSubmit} noValidate>
                    {/* Honeypot — bots fill the hidden field; we drop them. */}
                    <input
                      type="text"
                      name="botcheck"
                      tabIndex={-1}
                      autoComplete="off"
                      style={{ position: "absolute", left: "-9999px" }}
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
                          className="w-full bg-bg ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
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
                          className="w-full bg-bg ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
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
                          className="w-full bg-bg ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
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
                          className="w-full bg-bg ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
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
                        className="w-full bg-bg ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] leading-[1.65] text-ink placeholder:text-ink/30 transition-shadow resize-none"
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
                        <span className="inline-flex items-center ring-1 ring-ink/30 px-4 py-2.5 font-sans text-[11px] font-bold tracking-[0.16em] uppercase rounded-full hover:ring-accent hover:text-accent transition-all">
                          Choose image
                        </span>
                        <input
                          type="file"
                          name="image"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={handleImageChange}
                          className="sr-only"
                        />
                        <span className="font-sans text-[13px] text-ink-muted truncate max-w-[200px]">
                          {imageName || "No file chosen"}
                        </span>
                      </label>
                      <p className="mt-2 font-sans text-[12px] leading-[1.55] text-ink-muted m-0">
                        Memories with a photo are held for the family to approve before
                        they appear.
                      </p>
                      {imageError && (
                        <p className="mt-2 font-sans text-[13px] text-accent m-0">{imageError}</p>
                      )}
                    </div>

                    {errorMsg && (
                      <p className="mb-4 font-sans text-[13px] text-accent m-0">{errorMsg}</p>
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
                      <p className="font-sans text-[12px] leading-[1.55] text-ink-muted m-0 max-w-[240px]">
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

export const Memories = () => {
  const [modalOpen, setModalOpen] = useState(false);
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

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      <AmbientBackdrop opacity={0.35} />
      <Seo
        title="Book of Memories"
        description="A wall of memories of Stephen Meakin (SEM, 1966–2021) — mandala artist and sacred geometer. Share a memory of Steve with the family and his students."
        url="/memories"
      />
      <Nav overlay />

      <main className="relative z-10 flex-1">
        {/* 1 · HEADER — the dignified opening. Eyebrow + display title + the
            "names he answered to" intro + a gentle first invitation. */}
        <header className="mx-auto w-full max-w-[min(100%,860px)] px-[clamp(1rem,5vw,3rem)] pt-[clamp(7rem,14vw,11rem)] pb-[clamp(3rem,7vw,5rem)]">
          <Reveal as="div" className="max-w-[42ch]">
            <p className={cn(EYEBROW, "m-0 mb-[clamp(1.25rem,3vw,1.75rem)]")}>
              Book of Memories
            </p>
            <h1 className={cn(TITLE, "m-0")}>
              Memories of Steve.
            </h1>
          </Reveal>

          <Reveal as="div" className="mt-[clamp(1.75rem,4vw,2.5rem)] max-w-[58ch]" delay={0.05}>
            <p className={cn(SUBTITLE, "m-0 max-w-[58ch]")}>
              Stephen to some, SEM to the art world, Steve to his family, Semster
              to the friends who knew him longest. He taught, he painted, he sat
              across the table from a great many people — students, fellow artists,
              and those who simply stood before a canvas and felt something move.
            </p>
            <p className={cn(SUBTITLE, "mt-[1em] m-0 max-w-[58ch]")}>
              If he touched your life, leave a memory here. The family reads every one.
            </p>
            <div className="mt-[clamp(1.75rem,4vw,2.5rem)]">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className={BTN_PRIMARY}
              >
                Share a memory
                <span aria-hidden="true" className="ml-2">→</span>
              </button>
            </div>
          </Reveal>
        </header>

        {/* 2 · THE STREAM — a single centred ~640px channel the page steps INTO
            (narrower than the 860px header band) so the feed reads as a focused
            stream. The pinned artist card always leads; visitor cards (or a
            dignified empty-state ghost card) follow under a quiet eyebrow. */}
        <section
          aria-label="Memories of Steve"
          className="mx-auto w-full max-w-[640px] px-[clamp(1rem,5vw,2rem)] pb-[clamp(5rem,11vw,8rem)]"
        >
          {/* a · the featured pinned card — always rendered, the page is never empty */}
          <PinnedCard memory={ARTIST_MEMORY} />

          {/* b · section eyebrow */}
          <Reveal
            as="div"
            delay={0.04}
            className="mt-[clamp(2.5rem,6vw,4rem)] mb-[clamp(1.25rem,3vw,2rem)]"
          >
            <p className={cn(EYEBROW_MUTED, "m-0")}>
              {hasVisitorMemories ? "From those who knew him" : "The wall"}
            </p>
          </Reveal>

          {/* c · the card list, or the empty-state ghost card */}
          {hasVisitorMemories ? (
            // Discrete cards separated by the bg-soft fill + dark gutter (not
            // dividers). Each reveals with a small staggered delay capped at
            // 0.2s so a long wall never accumulates visible lag; Reveal
            // short-circuits under reduced motion.
            <div className="space-y-[clamp(1.25rem,3vw,2rem)]">
              {visitorMemories.map((memory, i) => (
                <Reveal key={memory.id} as="div" delay={Math.min(i * 0.04, 0.2)}>
                  <MemoryCard memory={memory} />
                </Reveal>
              ))}
            </div>
          ) : (
            // Empty state: a ghost card matching the visitor-card chrome, with a
            // dashed-ring monogram and an italic invitation. Composed, not broken.
            <Reveal as="div" delay={0.08}>
              <article className="bg-bg-soft ring-1 ring-line rounded-2xl shadow-lift p-[clamp(1.5rem,5vw,2.5rem)]">
                <div className="flex items-start gap-[clamp(0.75rem,2vw,1rem)]">
                  <span
                    aria-hidden="true"
                    className="shrink-0 inline-flex items-center justify-center rounded-full h-[clamp(40px,9vw,52px)] w-[clamp(40px,9vw,52px)] border border-dashed border-line bg-bg-elevated"
                  >
                    <span className="font-display text-ink-faint text-[clamp(15px,3.5vw,18px)] leading-none">
                      +
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display italic font-normal text-[clamp(18px,2.4vw,24px)] leading-[1.45] text-ink-muted m-0 text-balance">
                      This wall is quiet for now. Yours could be the first memory
                      to rest here.
                    </p>
                    <div className="mt-[clamp(1.25rem,3vw,1.75rem)]">
                      <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className={BTN_PRIMARY}
                      >
                        Leave the first memory
                        <span aria-hidden="true" className="ml-2">→</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            </Reveal>
          )}
        </section>

        {/* 3 · CLOSING INVITATION — a gentle, generous call to add a memory.
            Matches the stream's 640px channel. Hidden when the wall is still
            empty (the empty-state ghost card already carries its own CTA, so we
            don't stack two on a sparse page). */}
        {hasVisitorMemories && (
          <section className="mx-auto w-full max-w-[640px] px-[clamp(1rem,5vw,2rem)] pb-[clamp(5rem,11vw,8rem)]">
            <Reveal as="div" className="border-t border-line pt-[clamp(3rem,7vw,5rem)] max-w-[52ch]">
              <p className={cn(EYEBROW, "m-0 mb-[clamp(1.25rem,3vw,1.75rem)]")}>
                Leave a memory
              </p>
              <h2 className={cn(TITLE, "m-0")}>
                Add yours to the wall.
              </h2>
              <p className={cn(SUBTITLE, "mt-[clamp(1.25rem,3vw,1.75rem)] m-0 max-w-[48ch]")}>
                A moment with Steve, something he said, what his work has come to
                mean to you. A line or a page, all of it is welcome. Each memory
                is read before it joins the wall.
              </p>
              <div className="mt-[clamp(1.75rem,4vw,2.5rem)]">
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className={BTN_PRIMARY}
                >
                  Share a memory
                  <span aria-hidden="true" className="ml-2">→</span>
                </button>
              </div>
            </Reveal>
          </section>
        )}
      </main>

      <Footer />
      <ShareMemoryModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};
