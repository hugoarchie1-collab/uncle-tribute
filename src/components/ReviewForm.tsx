import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_MUTED, BTN_PRIMARY } from "./ui/tokens";

/**
 * ReviewForm — the "leave a review" modal for a print, modelled byte-for-byte on
 * the Book-of-Memories share modal (focus trap, Escape, body-scroll lock,
 * honeypot, aria-live status, optional file upload, success/error states). It
 * POSTs to the EXISTING /api/memories-submit endpoint with `kind:"review"` and
 * the painting id, so no new serverless function is added (the Hobby plan is at
 * its 12-function cap).
 *
 * A review carries: a 1–5 STAR rating (required), a written BODY (required), a
 * NAME (required), an optional EMAIL (so the family can thank the buyer), and
 * ONE optional media attachment — a photo (inlined small, like the memory
 * avatar) OR a short video/audio clip (uploaded to Vercel Blob server-side, or
 * held by email when Blob isn't configured). The API moderates every
 * submission; clean text auto-publishes, anything with media holds for the
 * family's one-tap OK. NOTHING is ever fabricated — a review only exists once a
 * real person submits it.
 *
 * House register: dark bg-bg-soft panel, cream ink, rust accent on
 * focus/hover/the stars, Fraunces heading + Schibsted-Grotesk body. Inputs are
 * ≥16px so iOS never auto-zooms. Reduced-motion is honoured by the modal's
 * short opacity transition.
 */

// 4MB — matches the endpoint's cap for BOTH the inline image and the
// Blob-or-hold video/audio clip (base64 inflates ~33%, so the server caps the
// data-URL length at ~5.6M chars ≈ 4MB).
const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

type Status = "idle" | "submitting" | "success" | "error";
type MediaKind = "image" | "video" | "audio" | null;

const STAR_LABELS = [
  "",
  "Poor",
  "Fair",
  "Good",
  "Very good",
  "Exceptional",
] as const;

/**
 * StarPicker — an accessible 1–5 rating control. A real radiogroup (one tab
 * stop, arrow keys move + select) so it's keyboard-operable and announced
 * correctly; hover/focus previews the rating, the committed value persists. The
 * stars are the one rust-accent moment in the form, matching the email's stars.
 */
const StarPicker = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) => {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  const onKey = (e: React.KeyboardEvent<HTMLButtonElement>, star: number) => {
    let next: number;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = Math.min(5, (value || star) + 1);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = Math.max(1, (value || star) - 1);
        break;
      case "Home":
        next = 1;
        break;
      case "End":
        next = 5;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(next);
  };

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Your rating, from 1 to 5 stars"
        className="inline-flex items-center gap-1.5"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= shown;
          const isSelected = star === value;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${star} ${star === 1 ? "star" : "stars"}${
                STAR_LABELS[star] ? ` — ${STAR_LABELS[star]}` : ""
              }`}
              tabIndex={value ? (isSelected ? 0 : -1) : star === 1 ? 0 : -1}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHover(star)}
              onFocus={() => setHover(star)}
              onBlur={() => setHover(0)}
              onKeyDown={(e) => onKey(e, star)}
              className="bg-transparent border-0 p-1 -m-0.5 cursor-pointer rounded-sm transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="block"
              >
                <path
                  d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.8l-5.8 3.06 1.1-6.46-4.69-4.58 6.49-.94L12 2.5z"
                  fill={filled ? "rgb(var(--accent))" : "transparent"}
                  stroke={filled ? "rgb(var(--accent))" : "currentColor"}
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                  className={filled ? "" : "text-ink/35"}
                />
              </svg>
            </button>
          );
        })}
      </div>
      <p
        aria-live="polite"
        className="mt-2 font-sans text-[13px] leading-[1.5] text-ink-muted m-0 min-h-[1.2em]"
      >
        {shown ? `${shown} of 5 — ${STAR_LABELS[shown]}` : "Tap a star to rate"}
      </p>
    </div>
  );
};

export const ReviewForm = ({
  open,
  onClose,
  paintingId,
  paintingTitle,
  onPublished,
}: {
  open: boolean;
  onClose: () => void;
  paintingId: string;
  paintingTitle: string;
  /** Called when a review auto-publishes, so the section can refresh its list. */
  onPublished?: () => void;
}) => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [autoPublished, setAutoPublished] = useState(false);
  const [rating, setRating] = useState(0);
  const [mediaName, setMediaName] = useState("");
  const [mediaKind, setMediaKind] = useState<MediaKind>(null);
  const [mediaError, setMediaError] = useState("");
  // The base64 data-URL of the chosen file lives in a ref (not state) so a large
  // string never re-renders the form on every keystroke — mirrors the memory
  // composer's imageDataRef pattern.
  const mediaDataRef = useRef<string>("");
  const firstFieldRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const resetMedia = useCallback(() => {
    mediaDataRef.current = "";
    setMediaName("");
    setMediaKind(null);
    setMediaError("");
  }, []);

  useEffect(() => {
    if (!open) {
      // Synchronous reset when the modal closes — the form must be blank next
      // open. The documented set-state-in-effect exception (syncing to the
      // external `open` prop), exactly as the memory modal does it.
      /* eslint-disable react-hooks/set-state-in-effect */
      setStatus("idle");
      setErrorMsg("");
      setAutoPublished(false);
      setRating(0);
      setMediaName("");
      setMediaKind(null);
      setMediaError("");
      /* eslint-enable react-hooks/set-state-in-effect */
      mediaDataRef.current = "";
      return;
    }
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

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetMedia();
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/");
    if (!isImage && !isVideo && !isAudio) {
      setMediaError("Please choose an image, video or audio file.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_MEDIA_BYTES) {
      setMediaError("That file is over 4MB — please choose a smaller one.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      mediaDataRef.current =
        typeof reader.result === "string" ? reader.result : "";
      setMediaName(file.name);
      setMediaKind(isImage ? "image" : isVideo ? "video" : "audio");
    };
    reader.onerror = () => {
      setMediaError("Couldn't read that file — please try another.");
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const body = String(data.get("body") || "").trim();
    const email = String(data.get("email") || "").trim();
    const botcheck = String(data.get("botcheck") || "");

    if (!rating) {
      setStatus("error");
      setErrorMsg("Please choose a rating from 1 to 5 stars.");
      return;
    }
    if (!name) {
      setStatus("error");
      setErrorMsg("Please add your name.");
      return;
    }
    if (body.length < 2) {
      setStatus("error");
      setErrorMsg("Please write a few words about the print.");
      return;
    }

    setStatus("submitting");

    // ONE attachment: an image inlines, a video/audio clip rides the `media`
    // field for the server's Blob-or-hold path. Match the API's exact contract.
    const dataUrl = mediaDataRef.current || undefined;
    const payload: Record<string, unknown> = {
      kind: "review",
      paintingId,
      rating,
      name,
      body,
      email,
      botcheck,
    };
    if (dataUrl && mediaKind === "image") {
      payload.image = dataUrl;
    } else if (dataUrl && (mediaKind === "video" || mediaKind === "audio")) {
      payload.media = dataUrl;
      payload.mediaType = mediaKind;
    }

    try {
      const res = await fetch("/api/memories-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          published?: boolean;
        };
        const published = !!json.published;
        setAutoPublished(published);
        setStatus("success");
        form.reset();
        if (published) onPublished?.();
        return;
      }
      const bodyJson = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      setStatus("error");
      setErrorMsg(
        bodyJson?.error ||
          "Something went wrong sending your review. Please try again, or email it to info@themandalacompany.com.",
      );
    } catch {
      setStatus("error");
      setErrorMsg(
        "We couldn't reach the estate just now. Please try again in a moment, or email your review to info@themandalacompany.com.",
      );
    }
  };

  const INPUT =
    "w-full bg-bg ring-1 ring-line focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[16px] md:text-[clamp(16px,0.9vw,20px)] text-ink placeholder:text-ink/30 transition-shadow";

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
          aria-labelledby="review-form-title"
        >
          <button
            type="button"
            aria-label="Close the review form"
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
                  <p className={cn(EYEBROW, "m-0 mb-3")}>Leave a review</p>
                  <h2
                    id="review-form-title"
                    className="font-display font-semibold tracking-[-0.025em] text-[clamp(24px,3vw,32px)] leading-[1.15] text-ink m-0"
                  >
                    Review {paintingTitle}.
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="shrink-0 text-ink-muted hover:text-accent transition-colors w-9 h-9 -mr-2 -mt-2 inline-flex items-center justify-center rounded-full hover:bg-white/5"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 3 15 15M15 3 3 15"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
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
                        ? "Your review is now on this print's page, and the family has been told. Thank you for taking the time."
                        : "Your review has reached the family. We read each one with care before it appears — so yours may not show straight away. Thank you for sharing it."}
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

                    {/* STAR RATING — required, the one rust moment in the form. */}
                    <div className="mb-5">
                      <span className={cn(EYEBROW_MUTED, "block mb-2.5")}>
                        Your rating
                      </span>
                      <StarPicker value={rating} onChange={setRating} />
                    </div>

                    <label className="block mb-4">
                      <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                        Your review
                      </span>
                      <textarea
                        ref={firstFieldRef}
                        name="body"
                        required
                        rows={5}
                        className={cn(INPUT, "leading-[1.65] resize-none")}
                        placeholder="How does the print look on your wall? The colour, the paper, the framing, how it arrived…"
                      />
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                      <label className="block">
                        <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                          Your name
                        </span>
                        <input
                          name="name"
                          required
                          autoComplete="name"
                          className={INPUT}
                          placeholder="Jane Smith"
                        />
                      </label>
                      <label className="block">
                        <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                          Email{" "}
                          <span className="normal-case tracking-normal text-ink-muted">
                            (optional, never shown)
                          </span>
                        </span>
                        <input
                          name="email"
                          type="email"
                          autoComplete="email"
                          className={INPUT}
                          placeholder="So the family can thank you"
                        />
                      </label>
                    </div>

                    {/* Optional ONE media attachment — photo, video or audio. */}
                    <div className="mb-5">
                      <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                        Add a photo, video or audio clip{" "}
                        <span className="normal-case tracking-normal text-ink-muted">
                          (optional)
                        </span>
                      </span>
                      <label className="inline-flex items-center gap-3 cursor-pointer">
                        <span className="inline-flex items-center ring-1 ring-ink/30 px-4 py-2.5 font-sans text-[13px] font-bold tracking-[0.04em] rounded-full hover:ring-accent hover:text-accent transition-all">
                          Choose file
                        </span>
                        <input
                          type="file"
                          name="media"
                          accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg"
                          onChange={handleMediaChange}
                          className="sr-only"
                        />
                        <span className="font-sans text-[13px] text-ink-muted truncate max-w-[200px]">
                          {mediaName || "No file chosen"}
                        </span>
                      </label>
                      <p className="mt-2 font-sans text-[14px] leading-[1.55] text-ink-muted m-0">
                        Reviews with a photo, video or audio clip are held for the
                        family to approve before they appear. Keep files under 4MB.
                      </p>
                      {mediaError && (
                        <p className="mt-2 font-sans text-[13px] text-accent m-0">
                          {mediaError}
                        </p>
                      )}
                    </div>

                    {errorMsg && (
                      <p className="mb-4 font-sans text-[13px] text-accent m-0">
                        {errorMsg}
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
                      <button
                        type="submit"
                        disabled={status === "submitting"}
                        className={BTN_PRIMARY}
                      >
                        {status === "submitting" ? "Sending…" : "Share this review"}
                        <span aria-hidden="true" className="ml-2">
                          →
                        </span>
                      </button>
                      <p className="font-sans text-[14px] leading-[1.55] text-ink-muted m-0 max-w-[240px]">
                        Your email stays private — it's only so the family can
                        thank you.
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
