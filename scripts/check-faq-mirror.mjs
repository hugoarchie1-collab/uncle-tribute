// =============================================================================
// FAQ MIRROR CHECK — fails the build if the search index drifts from /faq.
// -----------------------------------------------------------------------------
// WHY THIS EXISTS
//   `FAQ_SEEDS` in src/lib/search.ts is a hand-typed plain-text copy of `FAQS`
//   in src/data/faqs.tsx. Nothing structurally kept them in step, and they
//   drifted: the site widened to worldwide shipping in July 2026 (specifically
//   because Stephen's collector base is Gulf/Dubai), the FAQ was updated, and
//   the search index went on telling buyers for six weeks that the estate
//   shipped only to "the UK, Europe, North America, Australia and New Zealand".
//   Searching "uae" returned nothing at all.
//
// WHY A CHECK RATHER THAN DERIVING IT
//   The obvious fix is to lift FAQS into a data module both files import. But
//   FAQ answers are JSX (`ReactNode`), and src/lib/search.ts is imported by
//   SearchBar, which is in the site-wide Nav — so deriving would pull every FAQ
//   answer's JSX into the nav bundle on every page, to fix a mirror that is
//   currently verified exact. This check makes the drift IMPOSSIBLE TO SHIP at
//   zero runtime cost, which is the better trade. If the FAQ ever grows large
//   enough that hand-mirroring is genuinely unmanageable, revisit the lift.
//
// HOW IT WORKS
//   Parses both files as TEXT — no React, no bundler, no import cycle. Flattens
//   the JSX answers to plain prose and compares them to the mirror verbatim.
//
// USAGE   node scripts/check-faq-mirror.mjs        (exit 1 on divergence)
//         Wired into `npm run build` via `prebuild`.
// =============================================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FAQ_PATH = path.join(ROOT, "src/data/faqs.tsx");
const SEARCH_PATH = path.join(ROOT, "src/lib/search.ts");

/** Slice out a top-level `const NAME ... = [ ... \n];` array literal. */
const sliceArray = (src, marker, label) => {
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`Could not find "${marker}" in ${label}.`);
  const end = src.indexOf("\n];", start);
  if (end === -1) throw new Error(`Unterminated array after "${marker}" in ${label}.`);
  return src.slice(start, end + 3);
};

const unescape = (s) => s.replace(/\\'/g, "'").replace(/\\"/g, '"');

/**
 * Normalise prose for comparison.
 *
 * ⚠️ The space-before-punctuation squeeze is REQUIRED, not cosmetic. Stripping
 * a JSX element boundary — `…our <Link>Authentication page</Link>.` — leaves
 * "page ." where the rendered DOM shows "page.". Without this, every answer
 * containing an inline link reports a false divergence.
 */
const normalise = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();

/** FAQ.tsx: pull each question + flatten its JSX answer to plain prose. */
const readSource = () => {
  const block = sliceArray(
    fs.readFileSync(FAQ_PATH, "utf8"),
    "export const FAQS: QA[] = [",
    "FAQ.tsx",
  );
  const re =
    /question:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*,\s*answer:\s*\(\s*<>([\s\S]*?)<\/>\s*\),/g;
  const out = [];
  let m;
  while ((m = re.exec(block))) {
    const answer = m[3]
      .replace(/\{"\s*"\}/g, " ") // the {" "} spacer idiom
      .replace(/<br\s*\/?>/g, " ")
      .replace(/<[^>]+>/g, "") // strip tags, keep their text children
      .replace(/\{[^{}]*\}/g, ""); // strip remaining JSX expressions
    out.push({ question: unescape(m[1] ?? m[2]), answer: normalise(answer) });
  }
  return out;
};

/** search.ts: pull the hand-typed mirror. */
const readMirror = () => {
  const block = sliceArray(
    fs.readFileSync(SEARCH_PATH, "utf8"),
    "const FAQ_SEEDS: FaqSeed[] = [",
    "search.ts",
  );
  const re =
    /question:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*,\s*answer:\s*\n?\s*"((?:[^"\\]|\\.)*)"/g;
  const out = [];
  let m;
  while ((m = re.exec(block))) {
    out.push({ question: unescape(m[1] ?? m[2]), answer: normalise(unescape(m[3])) });
  }
  return out;
};

const firstDiff = (a, b) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
};

const source = readSource();
const mirror = readMirror();

if (source.length === 0) {
  console.error("[faq-mirror] Parsed 0 questions from FAQ.tsx — the parser is stale, not the copy.");
  process.exit(1);
}

let problems = 0;
for (let i = 0; i < Math.max(source.length, mirror.length); i++) {
  const a = source[i];
  const b = mirror[i];
  if (!a || !b) {
    console.error(
      `[faq-mirror] #${i} present on one side only:\n    FAQ.tsx  : ${a?.question ?? "—"}\n    search.ts: ${b?.question ?? "—"}`,
    );
    problems++;
    continue;
  }
  if (a.question !== b.question) {
    console.error(
      `[faq-mirror] #${i} QUESTION differs:\n    FAQ.tsx  : ${a.question}\n    search.ts: ${b.question}`,
    );
    problems++;
  }
  if (a.answer !== b.answer) {
    const k = firstDiff(a.answer, b.answer);
    console.error(
      `[faq-mirror] #${i} ANSWER differs (${a.question})\n    FAQ.tsx  …${a.answer.slice(Math.max(0, k - 40), k + 80)}\n    search.ts…${b.answer.slice(Math.max(0, k - 40), k + 80)}`,
    );
    problems++;
  }
}

if (problems > 0) {
  console.error(
    `\n[faq-mirror] ${problems} divergence(s). The search index no longer matches /faq.\n` +
      `Update FAQ_SEEDS in src/lib/search.ts so every question and answer is VERBATIM\n` +
      `from FAQS in src/data/faqs.tsx, then re-run. Do not paraphrase.\n`,
  );
  process.exit(1);
}

console.log(`[faq-mirror] ${source.length} FAQ entries — search index matches /faq exactly.`);
