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
      { label: "Hold a memory of someone", weights: { "enneagon-swans": 3 } },
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
      { label: "Wholeness", weights: { "orchis-7": 3, "flower-of-life": 2, "twelve-around-three": 2, "persian-flower-of-life": 2 } },
      { label: "Protection", weights: { "wild-rose": 2, "peacock-minerva": 2, "ophiuchus": 1, "celtic-shield": 2 } },
      { label: "Connection", weights: { "enneagon-swans": 3, "ophiuchus": 1 } },
      { label: "Abundance", weights: { "english-bluebells": 2, "slipper-orchids": 2, "wild-rose": 1 } },
    ],
  },
  {
    kicker: "Question 4 · Evening",
    prompt: "Your ideal evening looks like…",
    options: [
      { label: "Quiet, candlelit, a good book", weights: { "ophiuchus": 2, "orchis-7": 2 } },
      { label: "The night sky and a long walk", weights: { "tridecagon-moon-star": 3 } },
      { label: "A full table of people you love", weights: { "enneagon-swans": 2, "english-bluebells": 1, "wild-rose": 1 } },
      { label: "Making something with your hands", weights: { "flower-of-life": 2, "slipper-orchids": 2 } },
    ],
  },
  {
    kicker: "Question 5 · Form",
    prompt: "Which pattern does your eye rest on?",
    options: [
      { label: "Petals opening from a still centre", weights: { "wild-rose": 2, "english-bluebells": 1, "slipper-orchids": 1 } },
      { label: "Interlocking circles — the seed of life", weights: { "flower-of-life": 3, "orchis-7": 1, "twelve-around-three": 2, "persian-flower-of-life": 2 } },
      { label: "A star held inside a ring", weights: { "tridecagon-moon-star": 2 } },
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
      { label: "A calm reminder of what matters", weights: { "enneagon-swans": 2, "orchis-7": 1 } },
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
  "enneagon-swans":
    "Nine swans, circling: we are each other. For connection — the people you carry with you.",
  "celtic-shield":
    "Orbital — the Celtic Shield Mandala. Interlaced Insular knotwork turning around a still centre, like a shield held over the room. For beauty that also guards.",
  "twelve-around-three":
    "Twelve spheres around three — the Flower of Life in its oldest order, the geometry beneath every growing thing, drawn by hand. For quiet, structured wholeness.",
  "persian-flower-of-life":
    "Persian geometry meeting the medieval rose window — two of Stephen's four traditions held in one frame, keyed like a Kepler proof. For a love of order and the meeting of worlds.",
};

type Phase = "intro" | "quiz" | "reading" | "result";

interface Result {
  paintingId: PaintingId;
  colourwayName: string;
  colourwayImage: string;
  runnersUp: { id: PaintingId; title: string; image: string; name: string }[];
}

/** Rebuild a result straight from a painting id (a ?result= deep link) so a
 *  shared link opens DIRECTLY on the reveal — no intro flash, no transition.
 *  Runners-up are a simple catalogue fallback (the sharer's answers aren't in
 *  the link). Returns null for a missing/invalid/unpurchasable id. */
const buildResultFromId = (rid: string | null): Result | null => {
  if (!rid) return null;
  const p = PAINTINGS.find((x) => x.id === rid);
  const avail = p?.colourways.filter((c) => c.available) ?? [];
  if (!p || avail.length === 0) return null;
  const cover = avail.find((c) => c.isOriginal) ?? avail[0];
  const runnersUp = PAINTINGS.filter((x) => x.id !== p.id && x.colourways.some((c) => c.available))
    .slice(0, 2)
    .map((x) => {
      const a = x.colourways.filter((c) => c.available);
      const cw = a.find((c) => c.isOriginal) ?? a[0];
      return { id: x.id, title: x.title, image: cw.image, name: cw.name };
    });
  return { paintingId: p.id, colourwayName: cover.name, colourwayImage: cover.image, runnersUp };
};

/** The quiz can render as its own page OR embedded inside /for-you (FindAPrint).
 *  When `embedded`, it drops its own page chrome (backdrop / Seo / Nav / Footer)
 *  — the host page owns those — and the intro's "browse by colour" link becomes
 *  an in-page `onExit()` toggle instead of a route link. */
export const PrintQuiz = ({
  embedded = false,
  onExit,
}: { embedded?: boolean; onExit?: () => void } = {}) => {
  const reduce = useReducedMotion();
  const { formatPretty: fmtP } = useCurrency();

  const [params] = useSearchParams();
  // A ?result=<id> deep link opens DIRECTLY on the reveal — no intro flash, no
  // stalled transition (a shared result should land on the piece at once).
  const deepLinkResult = useMemo(() => buildResultFromId(params.get("result")), [params]);
  const [phase, setPhase] = useState<Phase>(deepLinkResult ? "result" : "intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUESTIONS.map(() => null));
  const [result, setResult] = useState<Result | null>(deepLinkResult);
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

  // ── Reveal derivations ────────────────────────────────────────────────────
  // The recommended colourway's OWN colour drives a soft halo behind the piece —
  // the artwork is the only colour on the black ground (gallery-grade, bespoke).
  const winnerColourway = winnerPainting?.colourways.find((c) => c.name === result?.colourwayName);
  const haloHex = winnerColourway?.hex ?? "#c97844";
  const pdpTo = result
    ? `/collections/${result.paintingId}?c=${encodeURIComponent(result.colourwayName)}`
    : "/collections";
  // Their own answer to "a word you'd like your home to whisper" (Q3), echoed
  // back as a personal epigraph so the reveal reads as a response to THEM — only
  // when they actually took the quiz (a shared deep link carries no answers).
  const whisperIdx = QUESTIONS.findIndex((q) => /whisper/i.test(q.prompt));
  const whisperAns = whisperIdx >= 0 ? answers[whisperIdx] : null;
  const whisperWord =
    whisperAns != null ? QUESTIONS[whisperIdx].options[whisperAns]?.label ?? null : null;
  // Staged reveal — each beat settles up a touch later (name → piece → reading).
  // NB: animate Y ONLY, never opacity — content must stay visible even if the
  // animation never runs (throttled rAF / reduced motion), so it can never get
  // stuck hidden (the site's known framer-opacity footgun). Instant under reduce.
  const beat = (i: number) =>
    reduce
      ? {}
      : {
          initial: { y: 14 },
          animate: { y: 0 },
          transition: { duration: 0.6, delay: 0.1 + i * 0.14, ease: EASE_SIGNATURE },
        };


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
    const url = `${SITE_URL}/for-you?result=${encodeURIComponent(result.paintingId)}`;
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
    <div className={cn("relative flex flex-col overflow-x-clip", embedded ? "" : "min-h-screen")}>
      {/* No opaque backdrop — the site-wide AmbientBackground mesh (App root,
          z-0) shows through so the quiz carries the same living colour wash as
          every other page (Hugo 2026-08-25: every page must have it). When
          embedded, the host (/for-you) already shows the same mesh. */}
      {!embedded && (
        <Seo
          title="Find your print — the quiz"
          description="Answer six short questions and discover which of Stephen Meakin's mandalas is right for you. A calm, guided way in — estate-stamped and made to order."
          url="/print-quiz"
        />
      )}
      {!embedded && <Nav />}

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
                {embedded ? (
                  <button
                    type="button"
                    onClick={onExit}
                    className="font-sans text-[14.5px] font-semibold text-ink-muted hover:text-accent transition-colors underline-offset-4 hover:underline"
                  >
                    Or browse by colour
                  </button>
                ) : (
                  <Link to="/for-you" className="font-sans text-[14.5px] font-semibold text-ink-muted hover:text-accent transition-colors underline-offset-4 hover:underline">
                    Or browse by colour
                  </Link>
                )}
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

          {/* ── RESULT — a centred, gallery-grade reveal ───────────────────────
              The mandala is the hero on the black ground, haloed in its own
              colour; the person's own answer is echoed back as an epigraph; the
              reading, price and one clear step follow in a single calm column.
              Staged beats (name → piece → reading) via beat(n). */}
          {phase === "result" && result && winnerPainting && (
            <motion.section key="result" {...fade} className="mx-auto w-full max-w-[840px] text-center">
              <motion.p {...beat(0)} className={cn(EYEBROW, "m-0")}>
                Your mandala
              </motion.p>

              {whisperWord && (
                <motion.p
                  {...beat(1)}
                  className="mx-auto mt-4 max-w-[36ch] font-display italic text-ink-muted text-[clamp(16px,0.7vw+11px,22px)] leading-[1.4]"
                  style={{ fontVariationSettings: '"opsz" 32, "wght" 400' }}
                >
                  You asked your home to whisper {whisperWord}.
                </motion.p>
              )}

              <motion.h2
                {...beat(2)}
                className="mx-auto mt-3 max-w-[15ch] font-display font-bold text-ink text-[clamp(34px,4.6vw,72px)] leading-[1.0] tracking-[-0.03em] text-balance"
                style={{ fontVariationSettings: '"opsz" 72, "wght" 700', textShadow: "0 2px 26px rgba(0,0,0,0.5)" }}
              >
                {winnerPainting.title}
              </motion.h2>
              <motion.p
                {...beat(2)}
                className="mt-3 font-display italic text-ink/80 text-[clamp(17px,0.8vw+11px,26px)]"
                style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}
              >
                in {result.colourwayName}
              </motion.p>

              {/* Hero — the piece, haloed in its own colour */}
              <motion.div {...beat(3)} className="relative mx-auto mt-9 md:mt-12 w-full max-w-[500px]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-12 -z-10 rounded-full opacity-60 blur-3xl"
                  style={{ background: `radial-gradient(closest-side, ${haloHex}, transparent 72%)` }}
                />
                <Link
                  to={pdpTo}
                  className="group block aspect-square overflow-hidden rounded-[2px] ring-1 ring-line shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
                  aria-label={`View ${winnerPainting.title}`}
                >
                  <AssetImage
                    src={result.colourwayImage}
                    alt={`${winnerPainting.title} — ${result.colourwayName}`}
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]"
                  />
                </Link>
              </motion.div>

              {/* The reading */}
              <motion.p
                {...beat(4)}
                className="mx-auto mt-9 md:mt-12 max-w-[34ch] font-display text-ink text-[clamp(21px,0.9vw+15px,32px)] leading-[1.42] text-balance"
                style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}
              >
                {REASONS[result.paintingId] ??
                  "A piece from Stephen's catalogue chosen to fit your answers."}
              </motion.p>

              {/* One clear next step — after the reading has landed */}
              <motion.div {...beat(5)} className="mt-10 md:mt-12">
                <p className={cn(EYEBROW_MUTED, "m-0")}>
                  Estate-stamped giclée · made to order{anchorPrice ? ` · from ${anchorPrice}` : ""}
                </p>
                <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5">
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
                  <Link to={pdpTo} className={cn(BTN_SECONDARY, "justify-center")}>
                    See this print
                  </Link>
                </div>

                {/* Quiet actions */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
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

                {/* Keepsake — a quiet hairline line, never a boxed form */}
                {emailStatus === "done" ? (
                  <p className={cn(EYEBROW_MUTED, "m-0 mt-6")}>
                    Sent — we've noted the piece that fits you. Keep an eye on your inbox.
                  </p>
                ) : (
                  <form
                    onSubmit={emailResult}
                    className="mx-auto mt-7 flex max-w-[360px] items-end gap-3 border-b border-line transition-colors focus-within:border-accent"
                  >
                    <label htmlFor="quiz-email" className="sr-only">
                      Email me my result
                    </label>
                    <input
                      id="quiz-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email me my result"
                      autoComplete="email"
                      className="min-w-0 flex-1 bg-transparent py-2.5 font-sans text-[15px] text-ink placeholder:text-ink/35 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={emailStatus === "sending"}
                      className="shrink-0 pb-2.5 font-sans text-[12.5px] font-bold uppercase tracking-[0.14em] text-ink-muted transition-colors hover:text-accent disabled:opacity-50"
                    >
                      {emailStatus === "sending" ? "…" : "Send"}
                    </button>
                  </form>
                )}
                {emailStatus === "error" && (
                  <p className="font-sans text-[13px] text-accent m-0 mt-2">Couldn't send just now — try again.</p>
                )}
              </motion.div>

              {/* Runners-up — quiet, curated, far smaller than the hero */}
              {result.runnersUp.length > 0 && (
                <motion.div {...beat(6)} className="mx-auto mt-16 md:mt-24 max-w-[520px] border-t border-line pt-8 md:pt-10">
                  <p className={cn(EYEBROW, "m-0 mb-6")}>Also close to you</p>
                  <div className="grid grid-cols-2 gap-5 md:gap-6">
                    {result.runnersUp.map((r) => (
                      <Link
                        key={r.id}
                        to={`/collections/${r.id}?c=${encodeURIComponent(r.name)}`}
                        className="group block"
                        aria-label={`View ${r.title}`}
                      >
                        <div className="aspect-square overflow-hidden rounded-[2px] ring-1 ring-line transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-lift">
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
                </motion.div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {!embedded && <Footer />}
    </div>
  );
};
