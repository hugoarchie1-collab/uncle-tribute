import { useState, type FormEvent } from "react";
import { IntroFilmHeader } from "../components/IntroFilmHeader";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Separator } from "../components/ui/separator";
import { Seo } from "../components/Seo";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { EYEBROW, EYEBROW_MUTED, BTN_PRIMARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { MEMORIES, type Memory } from "../data/memories";

/**
 * /memories — the Book of Memories. A moderated wall of memories of Stephen,
 * plus a form to leave one. Submissions POST to /api/memories-submit, which
 * emails the estate; nothing appears here until it's added to
 * src/data/memories.ts and deployed (see that file's header). The page reads
 * only from MEMORIES, so the moderation model is entirely file-based.
 *
 * Register: the quieter routed-page voice (About / Contact / Legal), not the
 * cinematic Welcome. Centred column, eyebrow + h1 + intro, the wall as an
 * accent-bordered masonry of quotes, then the contribution form.
 */

type Status = "idle" | "submitting" | "success" | "error";

const MemoryCard = ({ memory }: { memory: Memory }) => {
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
      <figcaption className="mt-4 font-sans text-[12px] tracking-[0.04em] text-ink/55">
        <span className="text-ink/80">— {memory.name}</span>
        {meta ? <span className="text-ink/45">{` · ${meta}`}</span> : null}
      </figcaption>
    </figure>
  );
};

export const Memories = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

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
        body: JSON.stringify({ name, message, relationship, location, email, botcheck }),
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
        return;
      }
      const bodyJson = await res.json().catch(() => ({}));
      setStatus("error");
      setErrorMsg(
        bodyJson?.error ||
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
    <div className="relative min-h-screen flex flex-col">
      <AmbientBackdrop opacity={0.4} />
      <Seo
        title="Book of Memories"
        description="A wall of memories of Stephen Meakin (SEM, 1966–2021) — mandala artist and sacred geometer. Share a memory of Steve with the family and his students."
        url="/memories"
      />
      <IntroFilmHeader />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[860px] px-4 sm:px-6 md:px-8 lg:px-12 py-24 md:py-32">
        <Reveal as="header" className="mb-12 max-w-[720px]">
          <p className={cn(EYEBROW, "m-0 mb-5")}>Book of Memories</p>
          <h1 className="font-display font-bold tracking-[-0.04em] text-[clamp(40px,6vw,64px)] leading-[1.05] text-ink m-0">
            Memories of Steve.
          </h1>
          <p className="font-sans font-normal text-[16px] sm:text-[17px] leading-[1.75] text-ink/75 mt-7 m-0">
            Steve touched a great many lives — students, friends, fellow artists,
            the people who simply stood in front of his work and felt something
            shift. If he touched yours, we'd be honoured if you'd leave a memory
            here. The family reads every one.
          </p>
          <Separator className="bg-ink/15 mt-10" />
        </Reveal>

        {/* The wall */}
        {MEMORIES.length > 0 ? (
          <Reveal as="section" className="columns-1 lg:columns-2 gap-x-10">
            {MEMORIES.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} />
            ))}
          </Reveal>
        ) : (
          <Reveal as="section" className="py-6">
            <p className="font-display italic text-[20px] sm:text-[22px] leading-[1.5] text-ink/70 m-0 max-w-[560px]">
              Steve's wall is waiting for its first memory. If you have one to
              share, yours could be the first.
            </p>
          </Reveal>
        )}

        {/* Contribution form */}
        <Reveal as="section" className="mt-16 md:mt-20 max-w-[720px]">
          <Separator className="bg-ink/15 mb-12" />
          <p className={cn(EYEBROW, "m-0 mb-5")}>Leave a memory</p>
          <h2 className="font-display font-bold tracking-[-0.03em] text-[clamp(28px,4vw,40px)] leading-[1.1] text-ink m-0">
            Share something of Steve.
          </h2>

          {status === "success" ? (
            <div className="py-8">
              <p className="font-display font-bold text-[26px] text-ink m-0 mb-3">
                Thank you.
              </p>
              <p className="font-sans font-normal text-[15.5px] leading-[1.75] text-ink/75 m-0 max-w-[560px]">
                Your memory has reached the family. With your blessing, we'll add
                it to Steve's wall — it won't appear straight away, because we
                read and place each one ourselves. Thank you for taking the time.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-7">
              {/* Honeypot */}
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
                    name="name"
                    required
                    autoComplete="name"
                    className="w-full bg-bg-soft/40 ring-1 ring-white/12 focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3.5 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
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
                    className="w-full bg-bg-soft/40 ring-1 ring-white/12 focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3.5 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
                    placeholder="Student, friend, collector…"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <label className="block">
                  <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                    Where from <span className="normal-case tracking-normal text-ink/35">(optional)</span>
                  </span>
                  <input
                    name="location"
                    autoComplete="off"
                    className="w-full bg-bg-soft/40 ring-1 ring-white/12 focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3.5 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
                    placeholder="Lewes, East Sussex"
                  />
                </label>
                <label className="block">
                  <span className={cn(EYEBROW_MUTED, "block mb-2")}>
                    Email <span className="normal-case tracking-normal text-ink/35">(optional, never shown)</span>
                  </span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="w-full bg-bg-soft/40 ring-1 ring-white/12 focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3.5 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
                    placeholder="So the family can thank you"
                  />
                </label>
              </div>

              <label className="block mb-5">
                <span className="block font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-ink/55 mb-2">
                  Your memory
                </span>
                <textarea
                  name="message"
                  required
                  rows={7}
                  className="w-full bg-bg-soft/40 ring-1 ring-white/12 focus:ring-2 focus:ring-accent focus:outline-none px-4 py-3.5 font-sans text-[15px] leading-[1.65] text-ink placeholder:text-ink/30 transition-shadow resize-none"
                  placeholder="A moment with Steve, something he said, what his work means to you…"
                />
              </label>

              {errorMsg && (
                <p className="mb-4 font-sans text-[13px] text-accent m-0">{errorMsg}</p>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
                <button type="submit" disabled={status === "submitting"} className={BTN_PRIMARY}>
                  {status === "submitting" ? "Sending…" : "Share this memory"}
                  <span aria-hidden="true" className="ml-2">→</span>
                </button>
                <p className="font-sans text-[12px] leading-[1.6] text-ink/45 m-0 max-w-[280px]">
                  We read every memory before it appears, so yours won't show up
                  straight away.
                </p>
              </div>
            </form>
          )}
        </Reveal>
      </main>
      <Footer />
    </div>
  );
};
