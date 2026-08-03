import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { AssetImage } from "../components/AssetImage";
import { Seo } from "../components/Seo";
import { EYEBROW, EYEBROW_MUTED, SUBTITLE, BTN_PRIMARY, BTN_SECONDARY, EASE_SIGNATURE } from "../components/ui/tokens";
import { cn } from "../lib/cn";
import { useCurrency } from "../lib/currency";
import { PAINTINGS, getAnchorTier, getTierAdvertisedPricePence } from "../data/paintings";
import { addItem } from "../lib/basket";
import { colourwayFamily, type ColourFamily } from "../lib/colour";
import { SITE_URL } from "../lib/seo";

/**
 * /print-quiz — "Find your print" personality test (Hugo 2026-08-03: build a
 * printpersonalitytest-style Q&A that recommends a specific piece). A guided,
 * one-question-at-a-time flow with a progress bar, a brief "reading" beat, and
 * a result screen that names ONE recommended painting + colourway with an
 * honest reason, priced live and linking straight to the product.
 *
 * The recommendation is NOT random — each answer weights specific paintings by
 * the piece's OWN documented meaning (mirrors the intention map on /for-you),
 * and the chosen colour answer selects the matching colourway. Reverent
 * register throughout: a way in, never a hard sell; edition scarcity stays on
 * the product page.
 */

type PaintingId = string;

interface Option {
  label: string;
  sub?: string;
  // painting-id → weight (essence-based, never invented)
  weights?: Record<PaintingId, number>;
  // colour families this answer leans toward (picks the result colourway)
  colours?: ColourFamily[];
}

interface Question {
  kicker: string;
  prompt: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    kicker: "Question 1 · Why art",
    prompt: "What would you most want a piece to do in your home?",
    options: [
      { label: "Steady me — make the room feel safe", weights: { "wild-rose": 3, "ophiuchus": 2, "peacock-minerva": 1 } },
      { label: "Move me forward — mark a new chapter", weights: { "flower-of-life": 3, "tridecagon-moon-star": 2, "peacock-minerva": 1 } },
      { label: "Hold a memory of someone", weights: { "lulin": 3, "enneagon-swans": 2 } },
      { label: "Fill the room with life", weights: { "english-bluebells": 3, "slipper-orchids": 2, "wild-rose": 1 } },
    ],
  },
  {
    kicker: "Question 2 · Light",
    prompt: "Pick the light you'd want to wake up in.",
    options: [
      { label: "Warm rose and firelight", sub: "Reds, pinks, warm gold", colours: ["reds", "oranges"], weights: { "wild-rose": 1 } },
      { label: "Clear morning sky", sub: "Blues, teals, cool light", colours: ["blues"], weights: { "tridecagon-moon-star": 1 } },
      { label: "Deep dusk and indigo", sub: "Dark, violet, night", colours: ["dark", "purples"], weights: { "ophiuchus": 1 } },
      { label: "Meadow green and sand", sub: "Greens, neutrals, calm", colours: ["greens", "neutrals"], weights: { "english-bluebells": 1 } },
    ],
  },
  {
    kicker: "Question 3 · Temperament",
    prompt: "A word you'd like your home to whisper.",
    options: [
      { label: "Wholeness", weights: { "orchis-7": 3, "flower-of-life": 2 } },
      { label: "Protection", weights: { "wild-rose": 2, "peacock-minerva": 2, "ophiuchus": 1 } },
      { label: "Connection", weights: { "enneagon-swans": 3, "ophiuchus": 1 } },
      { label: "Abundance", weights: { "english-bluebells": 2, "slipper-orchids": 2, "wild-rose": 1 } },
    ],
  },
  {
    kicker: "Question 4 · Evening",
    prompt: "Your ideal evening looks like…",
    options: [
      { label: "Quiet, candlelit, a good book", weights: { "ophiuchus": 2, "orchis-7": 2 } },
      { label: "The night sky and a long walk", weights: { "tridecagon-moon-star": 3, "lulin": 1 } },
      { label: "A full table of people you love", weights: { "enneagon-swans": 2, "english-bluebells": 1, "wild-rose": 1 } },
      { label: "Making something with your hands", weights: { "flower-of-life": 2, "slipper-orchids": 2 } },
    ],
  },
  {
    kicker: "Question 5 · Form",
    prompt: "Which pattern does your eye rest on?",
    options: [
      { label: "Petals opening from a still centre", weights: { "wild-rose": 2, "english-bluebells": 1, "slipper-orchids": 1 } },
      { label: "Interlocking circles — the seed of life", weights: { "flower-of-life": 3, "orchis-7": 1 } },
      { label: "A star held inside a ring", weights: { "tridecagon-moon-star": 2, "lulin": 2 } },
      { label: "Feathers and watchful eyes", weights: { "peacock-minerva": 3 } },
    ],
  },
  {
    kicker: "Question 6 · Presence",
    prompt: "When you walk in, you want to be met by…",
    options: [
      { label: "Something that quietly protects the room", weights: { "wild-rose": 2, "ophiuchus": 2 } },
      { label: "A piece with real presence that holds the wall", weights: { "peacock-minerva": 3, "flower-of-life": 1 } },
      { label: "A soft, blooming warmth", weights: { "english-bluebells": 2, "slipper-orchids": 2 } },
      { label: "A calm reminder of what matters", weights: { "lulin": 2, "enneagon-swans": 2, "orchis-7": 1 } },
    ],
  },
];

// Honest, essence-based reason per recommended painting (claim-free).
const REASONS: Record<PaintingId, string> = {
  "wild-rose":
    "The wild rose keeps its thorns inside the circle — beauty that quietly protects. Yours is a home that should feel as safe as it is lovely.",
  "english-bluebells":
    "A whole woodland floor in bloom, held in one ring. You want life and softness — the feeling of spring kept all year.",
  "orchis-7":
    "Jung called the mandala the psyche's own picture of wholeness. Orchis 7 is that made visible — for someone reaching for clarity and completeness.",
  "flower-of-life":
    "The Mandala of Transformation — the pattern beneath every growing thing. For a threshold, a new chapter, a becoming.",
  "slipper-orchids":
    "Rare, patient and exquisitely made. For someone who loves the quiet luxury of detail done properly.",
  "peacock-minerva":
    "Wisdom and watchful beauty. A piece with genuine presence — it holds a room, and holds its own.",
  "ophiuchus":
    "The healer's constellation, ringed and still. For rest, recovery and a calm that settles a space.",
  "tridecagon-moon-star":
    "Moon and star turning in a thirteen-sided rhythm. For someone drawn to the night sky and to change.",
  "lulin":
    "A comet already gone, made permanent. For remembrance — a way to keep something loved close.",
  "enneagon-swans":
    "Nine swans, circling: we are each other. For connection — the people you carry with you.",
};

type Phase = "intro" | "quiz" | "reading" | "result";

interface Result {
  paintingId: PaintingId;
  colourwayName: string;
  colourwayImage: string;
  runnersUp: { id: PaintingId; title: string; image: string; name: string }[];
}

export const PrintQuiz = () => {
  const reduce = useReducedMotion();
  const { formatPretty: fmtP } = useCurrency();

  const [params] = useSearchParams();
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUESTIONS.map(() => null));
  const [result, setResult] = useState<Result | null>(null);
  // Result-screen conversion state.
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [email, setEmail] = useState("");

  const total = QUESTIONS.length;
  const progress = phase === "result" ? 1 : phase === "reading" ? 1 : (step) / total;

  const compute = (finalAnswers: (number | null)[]): Result => {
    const score = new Map<PaintingId, number>();
    const colourScore = new Map<ColourFamily, number>();
    finalAnswers.forEach((choice, qi) => {
      if (choice == null) return;
      const opt = QUESTIONS[qi].options[choice];
      if (opt.weights) {
        for (const [id, w] of Object.entries(opt.weights)) {
          score.set(id, (score.get(id) ?? 0) + w);
        }
      }
      if (opt.colours) {
        for (const c of opt.colours) colourScore.set(c, (colourScore.get(c) ?? 0) + 1);
      }
    });

    // Rank paintings that are actually purchasable, by score (stable by catalogue order).
    const ranked = PAINTINGS.map((p) => ({ p, s: score.get(p.id) ?? 0 }))
      .filter(({ p }) => p.colourways.some((c) => c.available))
      .sort((a, b) => b.s - a.s);

    const winner = ranked[0]?.p ?? PAINTINGS[0];
    const avail = winner.colourways.filter((c) => c.available);

    // Choose the colourway whose family best matches the colour answers; else original.
    const preferred = [...colourScore.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const original = avail.find((c) => c.isOriginal) ?? avail[0];
    const cover =
      (preferred && avail.find((c) => colourwayFamily(c.name, c.hex) === preferred)) || original;

    const runnersUp = ranked.slice(1, 3).map(({ p }) => {
      const a = p.colourways.filter((c) => c.available);
      const cw = a.find((c) => c.isOriginal) ?? a[0];
      return { id: p.id, title: p.title, image: cw.image, name: cw.name };
    });

    return {
      paintingId: winner.id,
      colourwayName: cover.name,
      colourwayImage: cover.image,
      runnersUp,
    };
  };

  const choose = (optIndex: number) => {
    const next = answers.slice();
    next[step] = optIndex;
    setAnswers(next);

    if (step + 1 < total) {
      setStep(step + 1);
    } else {
      // Last answer → brief reading beat, then result.
      const r = compute(next);
      setResult(r);
      setPhase("reading");
      window.setTimeout(() => setPhase("result"), reduce ? 200 : 1500);
    }
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
    else setPhase("intro");
  };

  // Keyboard control — press 1–4 or A–D to answer, Backspace/← to go back.
  // (Rebinds on phase/step change; the selection logic reads the current
  // question at bind time, so it never needs choose/back in the deps.)
  useEffect(() => {
    if (phase !== "quiz") return;
    const onKey = (e: KeyboardEvent) => {
      const opts = QUESTIONS[step].options;
      const key = e.key.toLowerCase();
      let idx = -1;
      if (/^[1-9]$/.test(key)) idx = parseInt(key, 10) - 1;
      else if (/^[a-d]$/.test(key)) idx = key.charCodeAt(0) - 97;
      if (idx >= 0 && idx < opts.length) {
        e.preventDefault();
        choose(idx);
        return;
      }
      if (e.key === "Backspace" || e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, step, answers]);

  const restart = () => {
    setAnswers(QUESTIONS.map(() => null));
    setStep(0);
    setResult(null);
    setPhase("intro");
  };

  const winnerPainting = useMemo(
    () => (result ? PAINTINGS.find((p) => p.id === result.paintingId) : null),
    [result],
  );
  const anchorPrice = winnerPainting
    ? fmtP(getTierAdvertisedPricePence(getAnchorTier(winnerPainting)))
    : "";

  // Shared-result deep link (?result=<paintingId>) — reopen straight on the
  // result screen without answering, so a partner or friend's share lands the
  // recipient on the recommended piece. Runs once on mount.
  useEffect(() => {
    const rid = params.get("result");
    if (!rid) return;
    const p = PAINTINGS.find((x) => x.id === rid);
    const avail = p?.colourways.filter((c) => c.available) ?? [];
    if (!p || avail.length === 0) return;
    const cover = avail.find((c) => c.isOriginal) ?? avail[0];
    const runnersUp = PAINTINGS.filter((x) => x.id !== p.id && x.colourways.some((c) => c.available))
      .slice(0, 2)
      .map((x) => {
        const a = x.colourways.filter((c) => c.available);
        const cw = a.find((c) => c.isOriginal) ?? a[0];
        return { id: x.id, title: x.title, image: cw.image, name: cw.name };
      });
    // One-time sync from the URL on mount (a shared-result deep link) — an
    // accepted external-state → React synchronisation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult({ paintingId: p.id, colourwayName: cover.name, colourwayImage: cover.image, runnersUp });
    setPhase("result");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add the recommended piece straight to the basket (anchor size, framed to
  // match the advertised floor — the two-product model has no bare sheet).
  const addResultToBasket = () => {
    if (!result || !winnerPainting) return;
    addItem(result.paintingId, result.colourwayName, getAnchorTier(winnerPainting).id, true);
    setAdded(true);
  };

  // Copy a shareable link to this result.
  const shareResult = async () => {
    if (!result) return;
    const url = `${SITE_URL}/print-quiz?result=${encodeURIComponent(result.paintingId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked — no-op (the See-this-print link is always available).
    }
  };

  // Optional: email the result (consent-based lead capture → newsletter/CRM).
  const emailResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result || !email.trim() || emailStatus === "sending") return;
    setEmailStatus("sending");
    try {
      const res = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: `quiz:${result.paintingId}` }),
      });
      setEmailStatus(res.ok ? "done" : "error");
    } catch {
      setEmailStatus("error");
    }
  };

  const fade = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -14 },
        transition: { duration: 0.45, ease: EASE_SIGNATURE },
      };

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip">
      {/* Luxe ground — deep near-black + a low warm-rust glow. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(140% 95% at 50% -12%, rgba(201,120,68,0.16), rgba(10,9,8,0) 52%)",
            "linear-gradient(180deg, #0c0a09 0%, #0a0908 42%, #080706 100%)",
          ].join(","),
        }}
      />
      <Seo
        title="Find your print — the quiz"
        description="Answer six short questions and discover which of Stephen Meakin's mandalas is right for you. A calm, guided way in — estate-stamped and made to order."
        url="/print-quiz"
      />
      <Nav />

      {/* Progress bar — hidden on the intro. */}
      {phase !== "intro" && (
        <div className="relative z-10 mx-auto w-full max-w-[820px] px-4 sm:px-6 md:px-8 mt-4">
          <div className="h-[3px] w-full bg-line/60 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              initial={false}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: reduce ? 0 : 0.5, ease: EASE_SIGNATURE }}
            />
          </div>
        </div>
      )}

      <main className="relative z-10 flex-1 mx-auto w-full max-w-[900px] px-4 sm:px-6 md:px-8 pt-8 md:pt-12 pb-16 md:pb-24 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* ── INTRO ─────────────────────────────────────────────────────── */}
          {phase === "intro" && (
            <motion.section key="intro" {...fade} className="text-center">
              <p className={cn(EYEBROW, "m-0 mb-6")}>The print quiz</p>
              <h1
                className="font-display font-bold text-ink m-0 text-balance"
                style={{
                  fontVariationSettings: '"opsz" 48, "wght" 700',
                  fontSize: "clamp(40px, 6.4vw, 104px)",
                  lineHeight: 0.94,
                  letterSpacing: "-0.035em",
                  textShadow: "0 2px 26px rgba(0,0,0,0.5)",
                }}
              >
                Which mandala is{" "}
                <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>
                  yours
                </em>
                ?
              </h1>
              <p className={cn(SUBTITLE, "mx-auto max-w-[52ch] mt-8")}>
                Six short questions. No wrong answers. At the end we'll show you the
                piece from Stephen's catalogue that fits you — and the colourway he
                made for it.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button type="button" onClick={() => setPhase("quiz")} className={cn(BTN_PRIMARY)}>
                  Begin
                  <span aria-hidden="true" className="ml-2">→</span>
                </button>
                <Link to="/for-you" className="font-sans text-[14.5px] font-semibold text-ink-muted hover:text-accent transition-colors underline-offset-4 hover:underline">
                  Or browse by colour
                </Link>
              </div>
              <p className={cn(EYEBROW_MUTED, "m-0 mt-8")}>Takes about a minute · No email needed</p>
            </motion.section>
          )}

          {/* ── QUIZ ──────────────────────────────────────────────────────── */}
          {phase === "quiz" && (
            <motion.section key={`q-${step}`} {...fade}>
              <div className="flex items-center justify-between mb-6">
                <p className={cn(EYEBROW, "m-0")}>{QUESTIONS[step].kicker}</p>
                <p className={cn(EYEBROW_MUTED, "m-0 tabular-nums")}>
                  {step + 1} / {total}
                </p>
              </div>
              <h2
                className="font-display font-semibold tracking-[-0.03em] text-ink m-0 text-[clamp(28px,4.2vw,60px)] leading-[1.05] text-balance"
              >
                {QUESTIONS[step].prompt}
              </h2>
              <div className="mt-8 md:mt-10 grid grid-cols-1 gap-3.5">
                {QUESTIONS[step].options.map((opt, i) => {
                  const selected = answers[step] === i;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => choose(i)}
                      className={cn(
                        "group text-left w-full ring-1 px-5 md:px-6 py-4 md:py-5 rounded-xl transition-all duration-300",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                        selected
                          ? "ring-accent bg-accent/[0.07] shadow-lift"
                          : "ring-line bg-ink/[0.02] hover:-translate-y-0.5 hover:ring-accent/50 hover:bg-ink/[0.04]",
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "flex-none grid place-items-center w-8 h-8 rounded-full ring-1 font-sans text-[13px] font-bold transition-colors",
                            selected ? "ring-accent text-accent" : "ring-line text-ink-muted group-hover:text-ink group-hover:ring-accent/50",
                          )}
                        >
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-display font-semibold tracking-[-0.01em] text-ink text-[clamp(17px,1.5vw,22px)] leading-[1.2]">
                            {opt.label}
                          </span>
                          {opt.sub && (
                            <span className="block font-sans text-[13px] md:text-[14px] text-ink-muted mt-1">{opt.sub}</span>
                          )}
                        </span>
                        <span aria-hidden="true" className="ml-auto text-ink/25 group-hover:text-accent transition-colors">→</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-8 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={back}
                  className="font-sans text-[14px] font-semibold text-ink-muted hover:text-accent transition-colors"
                >
                  ← Back
                </button>
                <p className={cn(EYEBROW_MUTED, "m-0 hidden sm:block")}>
                  Tip: press <kbd className="font-sans not-italic text-ink">1–4</kbd> or{" "}
                  <kbd className="font-sans not-italic text-ink">A–D</kbd>
                </p>
              </div>
            </motion.section>
          )}

          {/* ── READING ───────────────────────────────────────────────────── */}
          {phase === "reading" && (
            <motion.section key="reading" {...fade} className="text-center py-16">
              <motion.div
                aria-hidden="true"
                className="mx-auto w-14 h-14 rounded-full border border-accent/40 border-t-accent"
                animate={reduce ? {} : { rotate: 360 }}
                transition={{ duration: 1.1, ease: "linear", repeat: Infinity }}
              />
              <p className={cn(SUBTITLE, "mx-auto max-w-[40ch] mt-8")}>
                Reading your answers, and choosing the piece that fits…
              </p>
            </motion.section>
          )}

          {/* ── RESULT ────────────────────────────────────────────────────── */}
          {phase === "result" && result && winnerPainting && (
            <motion.section key="result" {...fade}>
              <p className={cn(EYEBROW, "m-0 mb-5 text-center")}>Your piece</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                <div className="relative">
                  <div
                    aria-hidden="true"
                    className="absolute -inset-6 -z-10 rounded-full opacity-70 blur-3xl"
                    style={{ background: "radial-gradient(60% 60% at 50% 40%, rgba(201,120,68,0.22), transparent 70%)" }}
                  />
                  <Link
                    to={`/collections/${result.paintingId}?c=${encodeURIComponent(result.colourwayName)}`}
                    className="block aspect-square overflow-hidden ring-1 ring-line shadow-lift group"
                    aria-label={`View ${winnerPainting.title}`}
                  >
                    <AssetImage
                      src={result.colourwayImage}
                      alt={`${winnerPainting.title} — ${result.colourwayName}`}
                      loading="eager"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  </Link>
                </div>
                <div>
                  <h2
                    className="font-display font-bold text-ink m-0 text-[clamp(28px,3.4vw,52px)] leading-[1.02] tracking-[-0.03em]"
                    style={{ fontVariationSettings: '"opsz" 40, "wght" 700' }}
                  >
                    {winnerPainting.title}
                  </h2>
                  <p className={cn(EYEBROW_MUTED, "m-0 mt-2")}>Colourway: {result.colourwayName}</p>
                  <p className={cn(SUBTITLE, "max-w-none mt-5 text-[clamp(16px,1.15vw,20px)]")}>
                    {REASONS[result.paintingId] ??
                      "A piece from Stephen's catalogue chosen to fit your answers."}
                  </p>
                  <p className={cn(EYEBROW_MUTED, "m-0 mt-6")}>
                    Estate-stamped giclée · made to order{anchorPrice ? ` · from ${anchorPrice}` : ""}
                  </p>
                  <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                    {added ? (
                      <Link to="/basket" className={cn(BTN_PRIMARY, "justify-center")}>
                        Added ✓ View basket
                        <span aria-hidden="true" className="ml-2">→</span>
                      </Link>
                    ) : (
                      <button type="button" onClick={addResultToBasket} className={cn(BTN_PRIMARY, "justify-center")}>
                        Add to basket
                        <span aria-hidden="true" className="ml-2">→</span>
                      </button>
                    )}
                    <Link
                      to={`/collections/${result.paintingId}?c=${encodeURIComponent(result.colourwayName)}`}
                      className={cn(BTN_SECONDARY, "justify-center")}
                    >
                      See this print
                    </Link>
                  </div>

                  {/* Secondary actions — share, retake, and optional email capture. */}
                  <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
                    <button
                      type="button"
                      onClick={shareResult}
                      className="font-sans text-[14px] font-semibold text-ink-muted hover:text-accent transition-colors"
                    >
                      {copied ? "Link copied ✓" : "Share your result"}
                    </button>
                    <button
                      type="button"
                      onClick={restart}
                      className="font-sans text-[14px] font-semibold text-ink-muted hover:text-accent transition-colors"
                    >
                      Retake the quiz
                    </button>
                  </div>

                  {emailStatus === "done" ? (
                    <p className={cn(EYEBROW_MUTED, "m-0 mt-6")}>
                      Sent — we've noted the piece that fits you. Keep an eye on your inbox.
                    </p>
                  ) : (
                    <form onSubmit={emailResult} className="mt-6 max-w-[420px]">
                      <label className={cn(EYEBROW_MUTED, "block mb-2")} htmlFor="quiz-email">
                        Want it saved? Email me my result
                      </label>
                      <div className="flex w-full items-stretch ring-1 ring-line focus-within:ring-accent transition-shadow">
                        <input
                          id="quiz-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          autoComplete="email"
                          className="flex-1 min-w-0 bg-transparent px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={emailStatus === "sending"}
                          className="press shrink-0 whitespace-nowrap px-5 font-sans text-[13.5px] font-bold tracking-[0.02em] uppercase text-bg bg-ink hover:bg-accent transition-colors border-0 cursor-pointer disabled:opacity-50"
                        >
                          {emailStatus === "sending" ? "…" : "Send"}
                        </button>
                      </div>
                      {emailStatus === "error" && (
                        <p className="font-sans text-[13px] text-accent m-0 mt-2">Couldn't send just now — try again.</p>
                      )}
                    </form>
                  )}
                </div>
              </div>

              {/* Runners-up */}
              {result.runnersUp.length > 0 && (
                <div className="mt-14 md:mt-20 border-t border-line pt-8">
                  <p className={cn(EYEBROW, "m-0 mb-6")}>You might also love</p>
                  <div className="grid grid-cols-2 gap-5 md:gap-6 max-w-[560px]">
                    {result.runnersUp.map((r) => (
                      <Link
                        key={r.id}
                        to={`/collections/${r.id}?c=${encodeURIComponent(r.name)}`}
                        className="group block"
                        aria-label={`View ${r.title}`}
                      >
                        <div className="aspect-square overflow-hidden ring-1 ring-line transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-lift">
                          <AssetImage
                            src={r.image}
                            alt={`${r.title} — ${r.name}`}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          />
                        </div>
                        <p className="mt-3 font-display font-bold text-[15px] md:text-[17px] tracking-[-0.015em] text-ink m-0 group-hover:text-accent transition-colors">
                          {r.title}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};
