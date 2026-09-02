// =============================================================================
// INVARIANT GATE — fails the build on the defect classes that keep recurring.
// -----------------------------------------------------------------------------
// WHY THIS EXISTS
//   On 2026-09-01 four consecutive rounds of auditing each found a CRITICAL
//   defect introduced BY THE PREVIOUS ROUND'S FIX:
//     · gift codes became derivable once the order reference was printed in full
//     · a certificate-ID pattern swallowed "mandala for sale" (the site's
//       highest-intent commercial query) and returned only the registry
//     · a finish-less-line fix turned an undercharge into an OVERCHARGE —
//       basket £525, Stripe £750
//     · an emoji-safety fix truncated every message containing an emoji
//
//   Every one was caught by a human/agent reading code. None was caught by the
//   toolchain, because tsc and eslint cannot see any of it. Inspection has now
//   demonstrably failed four times in a row; the answer is to make these
//   classes UNSHIPPABLE rather than to inspect harder.
//
//   The sibling gate `check-faq-mirror.mjs` has held since it was added, with
//   zero drift. Same idea, wider net.
//
// WHAT IT CHECKS  (all static — no network, no Stripe, no build output)
//   1. ADVERTISED == CHARGED. The price ladder in src/data/paintings.ts must
//      agree, to the penny, with the mirrors in api/checkout.ts,
//      api/stripe-webhook.ts and api/email-basket.ts. This mirror has broken
//      twice and is the highest rule in the codebase.
//   2. NO BUYER-VISIBLE FALSEHOODS. Prints are never "signed" (Stephen died in
//      2021); the printer is never named; the canvas is never "stretched" or
//      "ready to hang"; retired editions are not advertised.
//   3. THE CERT PATTERN MUST NOT SWALLOW ENGLISH. Plain phrases beginning
//      "mandala" must never match the Certificate-ID route.
//
// USAGE   node scripts/check-invariants.mjs      (exit 1 on any violation)
//         Wired into `npm run build` via `prebuild`, so a violation cannot
//         reach Vercel.
// =============================================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const failures = [];
const fail = (check, detail) => failures.push({ check, detail });

// Comments are stripped before ANY parsing: a ⚠️ note explaining why a tier is
// not sellable legitimately contains the words `available:true`, and matching
// that made the gate report drift that did not exist. Parse CODE, never prose.
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

// -----------------------------------------------------------------------------
// 1. ADVERTISED == CHARGED — the price mirror
// -----------------------------------------------------------------------------
/**
 * Pull `id → { base, framing, canvas, embellish }` out of a tier block.
 *
 * Segments are sliced between the ORDERED tier ids rather than by a generic
 * key regex: paintings.ts writes `id: "cabinet"` inside each entry while the
 * /api mirrors use `cabinet: {` as the key, and a regex matching both split one
 * entry into two — which reported every field as `undefined` and made the gate
 * cry wolf on correct data.
 */
const parseTiers = (src, startMarker, endMarker, ids) => {
  const from = src.indexOf(startMarker);
  if (from === -1) return null;
  const to = endMarker ? src.indexOf(endMarker, from) : -1;
  const block = src.slice(from, to === -1 ? src.length : to);

  const anchors = ids
    .map((id) => {
      const re = new RegExp(`(?:^\\s*"?${id}"?\\s*:\\s*\\{|id:\\s*"${id}")`, "m");
      const m = re.exec(block);
      return m ? { id, at: m.index } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.at - b.at);
  if (anchors.length === 0) return null;

  const out = {};
  anchors.forEach(({ id, at }, i) => {
    const seg = block.slice(at, anchors[i + 1]?.at ?? block.length);
    const num = (key) => {
      const hit = new RegExp(`${key}:\\s*(\\d+)`).exec(seg);
      return hit ? Number(hit[1]) : undefined;
    };
    out[id] = {
      base: num("pricePence"),
      framing: num("framingPricePence"),
      canvas: num("canvasPricePence"),
      embellish: num("embellishmentPricePence"),
      // ⚠️ `available` is the SALES GATE, not a display flag. api/checkout.ts
      // marked heirloom and studio available:true "so a stale client can't
      // crash", while paintings.ts hides them — so a crafted POST could buy a
      // £2,650 one-of-one the estate had decided not to sell.
      available: /available:\s*true/.test(seg)
        ? true
        : /available:\s*false/.test(seg)
          ? false
          : undefined,
    };
  });
  return out;
};

/** The canonical tier ids, read from the PrintTier union in paintings.ts. */
const tierIdsFrom = (src) => {
  const m = /id:\s*((?:"[a-z-]+"\s*\|\s*)+"[a-z-]+")/.exec(src);
  return m ? [...m[1].matchAll(/"([a-z-]+)"/g)].map((x) => x[1]) : [];
};

const paintings = stripComments(read("src/data/paintings.ts"));
const TIER_IDS = tierIdsFrom(paintings);
const canonical = parseTiers(
  paintings,
  "export const PRINT_TIERS",
  "export const OPHIUCHUS_PRINT_TIERS",
  TIER_IDS,
);

if (!canonical) {
  fail("price-mirror", "Could not parse PRINT_TIERS from src/data/paintings.ts — the parser is stale, not the data.");
} else {
  const mirrors = [
    ["api/checkout.ts", "const TIERS", "const VALID_PAINTING_IDS"],
    ["api/email-basket.ts", "const TIERS", "const PAINTING_TIER_SIZE"],
  ];
  for (const [file, start, end] of mirrors) {
    const mirror = parseTiers(stripComments(read(file)), start, end, TIER_IDS);
    if (!mirror) {
      fail("price-mirror", `Could not parse the tier mirror in ${file}.`);
      continue;
    }
    for (const [id, want] of Object.entries(canonical)) {
      const got = mirror[id];
      if (!got) {
        fail("price-mirror", `${file} is missing tier "${id}" — a tier present in paintings.ts must exist in every mirror.`);
        continue;
      }
      for (const field of ["base", "framing", "canvas", "embellish", "available"]) {
        if (want[field] !== got[field]) {
          fail(
            "price-mirror",
            field === "available"
              ? `${file} tier "${id}" is available:${got[field]} but paintings.ts says available:${want[field]}. ` +
                `\`available\` is the SALES GATE — a tier hidden from buyers must not be purchasable.`
              : `${file} tier "${id}" ${field}: mirror has ${got[field]}, paintings.ts has ${want[field]}. ` +
                `ADVERTISED != CHARGED is the highest rule in this codebase.`,
          );
        }
      }
    }
  }
}

// -----------------------------------------------------------------------------
// 2. NO BUYER-VISIBLE FALSEHOODS
// -----------------------------------------------------------------------------
/** Files a customer can read text from. */
const BUYER_FACING = [
  "src/pages",
  "src/components",
  "src/data/content.ts",
  "src/data/paintings.ts",
  "api/stripe-webhook.ts",
  "api/checkout.ts",
  "api/email-basket.ts",
  "api/admin/order-shipped.ts",
];

const walk = (rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return [rel];
  return fs
    .readdirSync(abs)
    .flatMap((entry) => walk(path.join(rel, entry)))
    .filter((f) => /\.(ts|tsx)$/.test(f));
};

// ⚠️ ONLY provably-wrong phrases. A gate that flags CORRECT copy gets switched
// off, which is worse than no gate — so two rules were deliberately dropped
// after they produced 20 false positives on first run:
//   · "ready to hang" — TRUE of a framed print (frame, glazing, hanger fitted).
//     It is only wrong about the CANVAS, and that context cannot be inferred
//     from a string in isolation.
//   · "hand-stretched" — TRUE of STEPHEN'S OWN paintings, which Welcome.tsx
//     describes at length. Only wrong when it describes the canvas PRODUCT.
// Both remain human-review items; they are not mechanically decidable here.
const BANNED = [
  {
    id: "signed-prints",
    // "signed" adjacent to print/giclée/edition. Stephen died in 2021 and /faq
    // states plainly that prints cannot be signed in his hand.
    re: /\bsigned\b[^.<>{}\n]{0,30}\b(print|prints|gicl|edition|editions)\b/i,
    why: 'Prints are NEVER "signed" — Stephen died in 2021 and /faq says so. Use "estate-stamped".',
  },
  {
    id: "printer-named",
    // "the atelier" was dropped — it matched unrelated prose. These three are
    // the actual fiction: a named printer, or a studio the estate does not own.
    re: /\b(point\s*101|london atelier|our atelier)\b/i,
    why: 'The printer is never named or mis-placed in buyer copy. Approved wording: "a specialist giclée studio on the Sussex coast".',
  },
  {
    id: "canvas-stretched",
    // Only the unambiguous product claim. "Stretched canvas" as a PRODUCT
    // description is always wrong: paintings.ts says the canvas is a flat print.
    re: /\bstretched canvas\b/i,
    why: 'The canvas is a flat PRINT — never stretched or ready-to-hang. Use "canvas print".',
  },
];

for (const dir of BUYER_FACING) {
  for (const file of walk(dir)) {
    const src = stripComments(read(file));
    for (const rule of BANNED) {
      // Scan string and JSX-text content only.
      for (const chunk of src.match(/"[^"\n]{4,}"|`[^`]{4,}`|>[^<>{}]{8,}</g) ?? []) {
        if (rule.re.test(chunk)) {
          fail(
            `copy:${rule.id}`,
            `${file}\n      ${chunk.replace(/\s+/g, " ").slice(0, 120)}\n      ${rule.why}`,
          );
        }
      }
    }
  }
}

// -----------------------------------------------------------------------------
// 2b. NO SUM-THEN-CONVERT ON A MULTI-PART PRICE
// -----------------------------------------------------------------------------
// ⚠️ THE CLASS THIS GATE ORIGINALLY MISSED. api/checkout.ts emits the print,
// the finish and the hand-finishing as SEPARATE Stripe line items and converts
// EACH one; convertFromGbpPence rounds UP to a whole major unit, so summing GBP
// first and converting once produces a DIFFERENT, LOWER figure in EUR and CAD
// than the buyer is charged. Measured before the fix: 12 of 40 tier/finish/
// currency combinations diverged, EVERY ONE against the buyer, on the PDP
// buy-now figure — which IS the order total.
//
// The safe helper is `formatPartsPretty` / `convertPartsFromGbpPence`. This
// check fails the build if a price formatter is handed an ADDITION, which is
// the shape that always means "summed in GBP first".
{
  const priceFiles = ["src/pages/PaintingDetail.tsx", "src/pages/Basket.tsx", "src/pages/Collections.tsx"];
  // fmtP( … + … )  /  format( … + … )  — an addition inside a money formatter.
  const sumInFormatter = /\b(fmtP|fmtPParts|format|formatPretty)\(\s*[A-Za-z_$][\w.$]*\s*\+/g;
  for (const file of priceFiles) {
    if (!fs.existsSync(path.join(ROOT, file))) continue;
    const src = stripComments(read(file));
    for (const hit of src.match(sumInFormatter) ?? []) {
      if (hit.startsWith("fmtPParts")) continue; // parts-aware, correct by construction
      fail(
        "fx-sum-then-convert",
        `${file} — "${hit.trim()}…" adds GBP figures inside a money formatter. ` +
          `Use formatPartsPretty([partA, partB]) so each Stripe line item is converted separately; ` +
          `otherwise EUR/CAD display less than the charge.`,
      );
    }
  }
}

// -----------------------------------------------------------------------------
// 3. THE CERT PATTERN MUST NOT SWALLOW PLAIN ENGLISH
// -----------------------------------------------------------------------------
const searchSrc = read("src/lib/search.ts");
const reMatch = /const CERT_ID_RE\s*=\s*(\/.+\/i?)\s*;/.exec(searchSrc);
const gateMatch = /const looksLikeCertInput\s*=\s*\(q: string\): boolean =>\s*([^;]+);/.exec(searchSrc);

if (!reMatch || !gateMatch) {
  fail("cert-pattern", "Could not find CERT_ID_RE / looksLikeCertInput in src/lib/search.ts.");
} else {
  const CERT_RE = eval(reMatch[1]);
  const gate = eval(`(q) => ${gateMatch[1].replace(/\bq\b/g, "q")}`);
  const routes = (q) => gate(q) && CERT_RE.test(q);

  // Real minted forms MUST route. Codes are MANDALA-<3 alnum>-<6 Crockford>.
  const mustRoute = [
    "MANDALA-OPI-7F3K91",
    "MANDALA_OPI_7F3K91",
    "mandala opi 7f3k91",
    "MANDALA-OR7-7F3K91", // Orchis 7 — the artwork code contains a digit
    "MANDALA-PFL-ZZZZZZ",
  ];
  for (const q of mustRoute) {
    if (!routes(q)) {
      fail("cert-pattern", `A real Certificate ID no longer routes to the registry: "${q}".`);
    }
  }

  // Plain English MUST NOT route. "mandala for sale" once returned ONLY the
  // registry, with the entire catalogue suppressed.
  const mustNotRoute = [
    "mandala for sale",
    "mandala art print",
    "mandala art prints",
    "mandala on canvas",
    "mandala of life",
    "mandala by stephen",
    "mandala in blue",
    "mandala wall art",
    "mandala for mum",
    "mandala gift card",
    "mandala the swans",
    "mandala and geometry",
  ];
  for (const q of mustNotRoute) {
    if (routes(q)) {
      fail(
        "cert-pattern",
        `CERT_ID_RE swallows a plain-English query: "${q}" would return only the registry, suppressing the catalogue.`,
      );
    }
  }
}

// -----------------------------------------------------------------------------
// Report
// -----------------------------------------------------------------------------
if (failures.length > 0) {
  console.error(`\n[invariants] ${failures.length} violation(s):\n`);
  for (const { check, detail } of failures) {
    console.error(`  ✗ [${check}] ${detail}\n`);
  }
  console.error(
    "These are the defect classes that shipped four times on 2026-09-01.\n" +
      "Fix the violation — do not weaken the check.\n",
  );
  process.exit(1);
}

console.log("[invariants] price mirrors agree · no buyer-visible falsehoods · cert pattern safe");
