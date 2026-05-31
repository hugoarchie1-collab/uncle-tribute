import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { EYEBROW, EYEBROW_MUTED, TITLE, SUBTITLE, BTN_PRIMARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { MEMORIES, type Memory } from "../data/memories";
import { ABOUT } from "../data/content";

/**
 * /memories — the Book of Memories, rebuilt as an editorial memorial scroll
 * rather than a "book". Dark gallery register: generous negative space, the
 * artist's own words held as a slow full-bleed pull-quote, and visitor
 * memories rendered as quiet museum wall-labels down one elegant column.
 *
 * Two voices on the wall:
 *   • A PINNED founding entry — Stephen's own words to his students
 *     (ABOUT.studentsLetter), marked "From the artist · Pinned" and given the
 *     pull-quote treatment as the page's centrepiece.
 *   • Visitor memories — the file-based MEMORIES seed PLUS any memories that
 *     auto-published to Vercel KV, fetched at runtime from
 *     GET /api/memories-submit. If KV isn't configured the fetch returns an
 *     empty list and the page shows only the committed entries.
 *
 * Submitting POSTs to /api/memories-submit, which moderates with OpenAI's free
 * omni-moderation and auto-publishes clean, image-free memories (an attached
 * image always holds for the family's OK). The family is emailed either way.
 *
 * The wall is often sparse — sometimes just the pinned letter. It is composed
 * to read as intentional and moving even then; never empty or broken.
 *
 * Typography canon (no bespoke families): font-display = Fraunces (true italic
 * ONLY for genuine quotes), font-sans = Hanken Grotesk. Section headings use the
 * shared TITLE / SUBTITLE / EYEBROW tokens; muted text routes through the single
 * text-ink-muted token and hairlines through border-line / ring-line — no
 * invented greys, no cool white rules. Accent stays to eyebrows + hover/focus
 * only (never a fill or a wash). Fully fluid — clamp() for type + spacing, no
 * fixed px widths that can overflow; holds 360 → 1440.
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

// ---------------------------------------------------------------------------
// PinnedQuote — the centrepiece. Stephen's letter to his students, held as a
// slow, large, full-bleed pull-quote in the display serif (italic, because it
// is a genuine quote). On the dark field with generous space it reads as a
// gallery wall text rather than a card. Reveal short-circuits under reduced
// motion via the shared Reveal component.
// ---------------------------------------------------------------------------
const PinnedQuote = ({ memory }: { memory: WallMemory }) => {
  const paragraphs = splitParagraphs(memory.message);
  return (
    <section
      aria-labelledby="pinned-memory-heading"
      className="relative w-full border-t border-b border-line"
    >
      <div className="relative mx-auto w-full max-w-[min(100%,860px)] px-[clamp(1rem,5vw,3rem)] py-[clamp(3.5rem,9vw,7rem)]">
        <Reveal as="div">
          <p
            id="pinned-memory-heading"
            className={cn(EYEBROW, "m-0 mb-[clamp(1.25rem,3vw,2rem)]")}
          >
            From the artist · Pinned
          </p>
          <p className="font-sans text-[clamp(13px,1.4vw,15px)] leading-[1.6] text-ink-muted m-0 mb-[clamp(1.75rem,4vw,2.5rem)] max-w-[44ch]">
            {ABOUT.studentsIntro}
          </p>
        </Reveal>

        <Reveal as="figure" className="m-0" delay={0.06}>
          <blockquote className="m-0">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className={cn(
                  "font-display italic font-normal tracking-[-0.01em] text-[clamp(22px,3.4vw,38px)] leading-[1.42] text-ink m-0 text-balance",
                  i > 0 && "mt-[1em]",
                )}
              >
                {p}
              </p>
            ))}
          </blockquote>
          <figcaption className={cn(EYEBROW_MUTED, "not-italic mt-[clamp(1.75rem,4vw,2.5rem)]")}>
            — {memory.name}
          </figcaption>
        </Reveal>
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// WallLabel — a single visitor memory as a quiet museum wall-label. The message
// in a calm reading register; the attribution as a small uppercase label set
// off by a short hairline rule (the warm line token — accent is reserved for
// eyebrows + hover/focus). Down ONE editorial column (not masonry) with generous
// rhythm. Images, when present, use object-fit so nothing crops badly.
// ---------------------------------------------------------------------------
const WallLabel = ({ memory }: { memory: WallMemory }) => {
  const paragraphs = splitParagraphs(memory.message);
  const meta = [memory.relationship, memory.location].filter(Boolean).join(" · ");
  return (
    <figure className="m-0">
      <blockquote className="m-0">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className={cn(
              "font-sans font-normal text-[clamp(16px,1.8vw,19px)] leading-[1.75] text-ink/85 m-0",
              i > 0 && "mt-[0.9em]",
            )}
          >
            {p}
          </p>
        ))}
      </blockquote>

      {memory.imageUrl ? (
        <div className="mt-[clamp(1rem,2.5vw,1.5rem)] w-full max-w-[min(100%,460px)] overflow-hidden ring-1 ring-line bg-bg-soft">
          <img
            src={memory.imageUrl}
            alt={`A photograph shared by ${memory.name}`}
            loading="lazy"
            decoding="async"
            className="block w-full h-auto object-contain"
          />
        </div>
      ) : null}

      <figcaption className="mt-[clamp(1.25rem,3vw,1.75rem)] flex items-center gap-3.5">
        <span aria-hidden="true" className="h-px w-7 bg-line shrink-0" />
        <span className="font-sans text-[11px] font-bold tracking-[0.2em] uppercase leading-[1.5]">
          <span className="text-ink">{memory.name}</span>
          {meta ? <span className="text-ink-muted">{` · ${meta}`}</span> : null}
        </span>
      </figcaption>
    </figure>
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
                        ? "Your memory is now on Steve's wall, and the family has been let know. Thank you for taking the time."
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

        {/* 2 · THE PINNED QUOTE — the man's own words, as a slow full-bleed
            pull-quote moment. The centrepiece of the page. */}
        <PinnedQuote memory={ARTIST_MEMORY} />

        {/* 3 · THE WALL — visitor memories down ONE editorial column as quiet
            museum wall-labels, generously spaced. Sparse-safe: if there are
            none yet, an intentional, inviting empty state holds the space. */}
        <section
          aria-label="Memories shared by visitors"
          className="mx-auto w-full max-w-[min(100%,720px)] px-[clamp(1rem,5vw,3rem)] py-[clamp(3.5rem,8vw,6rem)]"
        >
          <Reveal as="div" className="mb-[clamp(2.5rem,6vw,4rem)] max-w-[44ch]">
            <p className={cn(EYEBROW_MUTED, "m-0")}>
              {hasVisitorMemories ? "From those who knew him" : "The wall"}
            </p>
          </Reveal>

          {hasVisitorMemories ? (
            // Each label reveals on its own as it scrolls into view. The shared
            // Reveal short-circuits under reduced motion; the divider rule below
            // each (except the last) gives the column its editorial rhythm.
            <div className="flex flex-col">
              {visitorMemories.map((memory, i) => (
                <Reveal
                  key={memory.id}
                  as="div"
                  className={cn(
                    i > 0 &&
                      "mt-[clamp(2.75rem,6vw,4.5rem)] pt-[clamp(2.75rem,6vw,4.5rem)] border-t border-line",
                  )}
                >
                  <WallLabel memory={memory} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal as="div" className="max-w-[48ch]">
              <p className="font-display italic font-normal text-[clamp(20px,2.6vw,28px)] leading-[1.5] text-ink-muted m-0 text-balance">
                This wall is quiet for now. Yours could be the first memory to
                rest here.
              </p>
              <div className="mt-[clamp(1.75rem,4vw,2.5rem)]">
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className={BTN_PRIMARY}
                >
                  Leave the first memory
                  <span aria-hidden="true" className="ml-2">→</span>
                </button>
              </div>
            </Reveal>
          )}
        </section>

        {/* 4 · CLOSING INVITATION — a gentle, generous call to add a memory.
            Hidden when the wall is still empty (the empty state already carries
            its own CTA, so we don't stack two). */}
        {hasVisitorMemories && (
          <section className="mx-auto w-full max-w-[min(100%,720px)] px-[clamp(1rem,5vw,3rem)] pb-[clamp(5rem,11vw,8rem)]">
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

        {/* A whisper of bottom space when the wall is empty so the footer never
            hugs the empty-state CTA. */}
        {!hasVisitorMemories && <div aria-hidden="true" className="h-[clamp(3rem,8vw,6rem)]" />}
      </main>

      <Footer />
      <ShareMemoryModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};
