import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Separator } from "../components/ui/separator";
import { Seo } from "../components/Seo";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { EYEBROW, EYEBROW_MUTED, BTN_PRIMARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { MEMORIES, type Memory } from "../data/memories";
import { ABOUT } from "../data/content";

/**
 * /memories — the Book of Memories. A moderated-but-auto-publishing wall of
 * memories of Stephen, plus a modal form to leave one.
 *
 * Two voices on the wall:
 *   • A PINNED founding entry — Stephen's own words to his students
 *     (ABOUT.studentsLetter), marked "From the artist".
 *   • Visitor memories — the file-based MEMORIES seed PLUS any memories that
 *     auto-published to Vercel KV, fetched at runtime from
 *     GET /api/memories-submit. If KV isn't configured the fetch returns an
 *     empty list and the page shows only the committed entries.
 *
 * Submitting POSTs to /api/memories-submit, which moderates with OpenAI's free
 * omni-moderation and auto-publishes clean, image-free memories (an attached
 * image always holds for the family's OK). The family is emailed either way.
 *
 * Register: the quieter routed-page voice (About / Contact / Legal), not the
 * cinematic Welcome. Centred column, eyebrow + h1 + intro, the wall as an
 * accent-bordered masonry of quotes, then the contribution CTA + modal.
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

const MemoryCard = ({ memory }: { memory: WallMemory }) => {
  const paragraphs = memory.message.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const meta = [memory.relationship, memory.location].filter(Boolean).join(" · ");
  return (
    <figure className="break-inside-avoid mb-6 border-l-2 border-accent/55 pl-5 sm:pl-6 py-1">
      <blockquote className="m-0">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className={cn(
              "font-sans font-normal text-[15.5px] sm:text-[16px] leading-[1.75] text-ink/85 m-0",
              i > 0 && "mt-3.5",
            )}
          >
            {p}
          </p>
        ))}
      </blockquote>
      {memory.imageUrl ? (
        <img
          src={memory.imageUrl}
          alt={`Shared by ${memory.name}`}
          loading="lazy"
          className="mt-4 w-full max-w-[420px] rounded-sm ring-1 ring-white/10"
        />
      ) : null}
      <figcaption className="mt-4 font-sans text-[12px] tracking-[0.04em] text-ink/55">
        <span className="text-ink/80">— {memory.name}</span>
        {meta ? <span className="text-ink/45">{` · ${meta}`}</span> : null}
      </figcaption>
    </figure>
  );
};

/** The pinned founding entry — visually distinct, marked "From the artist". */
const ArtistMemoryCard = ({ memory }: { memory: WallMemory }) => {
  const paragraphs = memory.message.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <figure className="relative mb-12 border border-accent/35 bg-accent/[0.04] rounded-sm pl-6 sm:pl-8 pr-5 sm:pr-7 py-7 sm:py-8">
      <p className={cn(EYEBROW, "m-0 mb-5 flex items-center gap-2")}>
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
        />
        From the artist · Pinned
      </p>
      <p className="font-sans text-[13px] tracking-[0.04em] text-ink/55 m-0 mb-5">
        {ABOUT.studentsIntro}
      </p>
      <blockquote className="m-0">
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className={cn(
              "font-display italic text-[18px] sm:text-[20px] leading-[1.6] text-ink/90 m-0",
              i > 0 && "mt-4",
            )}
          >
            {p}
          </p>
        ))}
      </blockquote>
      <figcaption className="mt-6 font-sans text-[12px] tracking-[0.06em] text-ink/65">
        — {memory.name}
      </figcaption>
    </figure>
  );
};

// ---------------------------------------------------------------------------
// Share-a-memory modal — mirrors EnquireModal's pattern (focus trap, Escape,
// body-scroll lock, honeypot, aria-live status), with the memorial fields +
// an optional image upload.
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
            className="relative w-full max-w-[600px] bg-bg-soft ring-1 ring-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.7)] max-h-[90vh] overflow-y-auto"
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
                    className="font-display font-bold tracking-[-0.025em] text-[clamp(24px,3vw,32px)] leading-[1.15] text-ink m-0"
                  >
                    Share something of Steve.
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="shrink-0 text-ink/55 hover:text-ink transition-colors w-9 h-9 -mr-2 -mt-2 inline-flex items-center justify-center rounded-full hover:bg-white/5"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M3 3 15 15M15 3 3 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div aria-live="polite">
                {status === "success" ? (
                  <div className="py-4">
                    <p className="font-display font-bold text-[24px] text-ink m-0 mb-3">
                      Thank you.
                    </p>
                    <p className="font-sans font-normal text-[15px] leading-[1.7] text-ink/75 m-0 max-w-[480px]">
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
                          className="w-full bg-bg ring-1 ring-white/10 focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
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
                          className="w-full bg-bg ring-1 ring-white/10 focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
                          placeholder="Student, friend, collector…"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <label className="block">
                        <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                          Where from{" "}
                          <span className="normal-case tracking-normal text-ink/35">(optional)</span>
                        </span>
                        <input
                          name="location"
                          autoComplete="off"
                          className="w-full bg-bg ring-1 ring-white/10 focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
                          placeholder="Lewes, East Sussex"
                        />
                      </label>
                      <label className="block">
                        <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                          Email{" "}
                          <span className="normal-case tracking-normal text-ink/35">(optional, never shown)</span>
                        </span>
                        <input
                          name="email"
                          type="email"
                          autoComplete="email"
                          className="w-full bg-bg ring-1 ring-white/10 focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
                          placeholder="So the family can thank you"
                        />
                      </label>
                    </div>

                    <label className="block mb-4">
                      <span className="block font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-ink/55 mb-2">
                        Your memory
                      </span>
                      <textarea
                        name="message"
                        required
                        rows={6}
                        className="w-full bg-bg ring-1 ring-white/10 focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] leading-[1.65] text-ink placeholder:text-ink/30 transition-shadow resize-none"
                        placeholder="A moment with Steve, something he said, what his work means to you…"
                      />
                    </label>

                    {/* Optional image upload */}
                    <div className="mb-5">
                      <span className="block font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-ink/55 mb-2">
                        A photo{" "}
                        <span className="normal-case tracking-normal text-ink/35">(optional)</span>
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
                        <span className="font-sans text-[13px] text-ink/55 truncate max-w-[200px]">
                          {imageName || "No file chosen"}
                        </span>
                      </label>
                      <p className="mt-2 font-sans text-[12px] leading-[1.55] text-ink/40 m-0">
                        Memories with a photo are held for the family to OK before they
                        appear.
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
                      <p className="font-sans text-[12px] leading-[1.55] text-ink/45 m-0 max-w-[240px]">
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

  // Wall order: pinned artist memory, then auto-published (newest first from
  // KV), then the committed file-based seed. De-dupe by id so a memory that
  // was both auto-published AND later pasted into the file doesn't double up.
  const seen = new Set<string>([ARTIST_MEMORY.id]);
  const visitorMemories: WallMemory[] = [];
  for (const m of [...published, ...MEMORIES]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    visitorMemories.push(m);
  }
  const hasVisitorMemories = visitorMemories.length > 0;

  return (
    <div className="relative min-h-screen flex flex-col">
      <AmbientBackdrop opacity={0.4} />
      <Seo
        title="Book of Memories"
        description="A wall of memories of Stephen Meakin (SEM, 1966–2021) — mandala artist and sacred geometer. Share a memory of Steve with the family and his students."
        url="/memories"
      />
      <Nav overlay />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[860px] px-4 sm:px-6 md:px-8 lg:px-12 py-24 md:py-32">
        <Reveal as="header" className="mb-12 max-w-[720px]">
          <p className={cn(EYEBROW, "m-0 mb-5")}>Book of Memories</p>
          <h1 className="font-display font-bold tracking-[-0.04em] text-[clamp(40px,6vw,64px)] leading-[1.05] text-ink m-0">
            Memories of Steve.
          </h1>
          <p className="font-sans font-normal text-[16px] sm:text-[17px] leading-[1.75] text-ink/75 mt-7 m-0">
            He answered to a few names. Stephen to some, SEM to the art world,
            Steve to his family, and Semster to the close, hippie friends who knew
            him deepest. Whichever name you knew him by, he touched a great many
            lives — students, friends, fellow artists, the people who simply stood
            in front of his work and felt something shift.
          </p>
          <p className="font-sans font-normal text-[16px] sm:text-[17px] leading-[1.75] text-ink/75 mt-5 m-0">
            If he touched yours, we'd be honoured if you'd leave a memory here. The
            family reads every one.
          </p>
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={BTN_PRIMARY}
            >
              Share a memory
              <span aria-hidden="true" className="ml-2">→</span>
            </button>
          </div>
          <Separator className="bg-ink/15 mt-10" />
        </Reveal>

        {/* The pinned founding memory — from the man himself. */}
        <Reveal as="section">
          <ArtistMemoryCard memory={ARTIST_MEMORY} />
        </Reveal>

        {/* The wall of visitor memories */}
        {hasVisitorMemories ? (
          <Reveal as="section" className="columns-1 lg:columns-2 gap-x-10">
            {visitorMemories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} />
            ))}
          </Reveal>
        ) : (
          <Reveal as="section" className="py-6">
            <p className="font-display italic text-[20px] sm:text-[22px] leading-[1.5] text-ink/70 m-0 max-w-[560px]">
              Steve's wall is waiting for its first visitor memory. If you have one
              to share, yours could be the first.
            </p>
          </Reveal>
        )}

        {/* Contribution CTA */}
        <Reveal as="section" className="mt-16 md:mt-20 max-w-[720px]">
          <Separator className="bg-ink/15 mb-12" />
          <p className={cn(EYEBROW, "m-0 mb-5")}>Leave a memory</p>
          <h2 className="font-display font-bold tracking-[-0.03em] text-[clamp(28px,4vw,40px)] leading-[1.1] text-ink m-0">
            Add yours to the wall.
          </h2>
          <p className="font-sans font-normal text-[16px] leading-[1.75] text-ink/75 mt-6 m-0 max-w-[560px]">
            A moment with Steve, something he said, what his work means to you — a
            line or a page, all of it is welcome. We gently check each memory before
            it joins the wall.
          </p>
          <div className="mt-8">
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
      </main>
      <Footer />
      <ShareMemoryModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};
