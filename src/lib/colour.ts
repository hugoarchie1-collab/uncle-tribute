// =============================================================================
// COLOUR FAMILIES — buckets a colourway's real `hex` into a human family so the
// "Find a print" wayfinder can filter by tone. Pure functions, no deps; runs at
// render. Auto-adapts as new colourways are added (it reads their hex).
// =============================================================================

export type ColourFamily =
  | "reds"
  | "oranges"
  | "yellows"
  | "greens"
  | "blues"
  | "purples"
  | "neutrals"
  | "dark";

export const COLOUR_FAMILIES: { key: ColourFamily; label: string; swatch: string }[] = [
  { key: "reds", label: "Reds & pinks", swatch: "#b04a5e" },
  { key: "oranges", label: "Oranges & golds", swatch: "#c97844" },
  { key: "yellows", label: "Yellows", swatch: "#d9c56a" },
  { key: "greens", label: "Greens", swatch: "#88a37d" },
  { key: "blues", label: "Blues & teals", swatch: "#5f86b8" },
  { key: "purples", label: "Purples & violets", swatch: "#7d6da3" },
  { key: "neutrals", label: "Neutrals & sand", swatch: "#d2b07a" },
  { key: "dark", label: "Dark & indigo", swatch: "#262a52" },
];

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = Number.parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
};

/** Bucket a hex colour into one of the eight families. */
export const hexToFamily = (hex: string): ColourFamily => {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  // Genuinely dark tones (any hue) read as "dark & indigo".
  if (l < 0.2) return "dark";
  // Near-greyscale: only the truly dark end is "dark"; a light wash is a
  // neutral. A *mid*-lightness, low-saturation tone (e.g. Lulin's muted
  // sage-green #7da383, S≈0.17 L≈0.57) is NOT dark — it still carries a
  // legible hue, so let it fall through to the hue buckets below rather than
  // dumping it into "dark". (Threshold 0.12 keeps true greys here.)
  if (s < 0.12) return l > 0.6 ? "neutrals" : "dark";
  if (h < 18 || h >= 330) return "reds";
  if (h < 45) return "oranges";
  if (h < 70) return "yellows";
  if (h < 170) return "greens";
  if (h < 255) return "blues";
  return "purples";
};

// =============================================================================
// NAME-FIRST CLASSIFIER — `colourwayFamily(name, hex)`
//
// WHY: bucketing purely on `hex` mis-files muted / ambiguous tones. Stephen's
// own colourway NAMES state the intended colour ("Persian Indigo", "Sahara
// Sand Yellow", "Supernova Violet"), and that intent is what a buyer filters
// by — not the pixel average. So we derive the family from explicit colour
// words in the NAME first, and fall back to `hexToFamily(hex)` only for names
// that carry no colour word at all (e.g. "Original", "Kaleidoscope").
//
// HOW: an ORDERED rule list, checked top-to-bottom; the FIRST rule with a
// matching keyword wins. Order = specificity — the more specific / overriding
// rule sits ABOVE the broader one it must beat. Each rule is auditable: the
// family it yields and the exact words it matches are listed inline.
//
// Verified examples this ordering gets right (see audit in the PR notes):
//   "Sahara Sand Yellow" → neutrals (sand/sahara beats the trailing "yellow")
//   "Persian Indigo"     → dark     (indigo is a dark rule, no "blue" word)
//   "Supernova Violet"   → purples  (violet, not the hex's near-blue bucket)
// =============================================================================

/**
 * Ordered keyword → family rules. Each `words` entry is a lowercase substring
 * matched against the lowercased colourway name. ORDER MATTERS: rules higher
 * in the list win, so the most specific / overriding rule is placed first.
 */
const NAME_RULES: { family: ColourFamily; words: string[] }[] = [
  // 1. BLUES (specific) — "moonstone" is a blue gem and these names also carry
  //    the word "blue" (e.g. "Moonstone Blue"). It MUST sit above the neutrals
  //    rule, because "moonstone" contains the substring "stone" which the
  //    neutrals rule would otherwise claim. Pulled out here so the explicit
  //    blue intent wins; the rest of the blue words live in rule 9.
  { family: "blues", words: ["moonstone"] },
  // 2. NEUTRALS — sand/desert + true neutrals. MUST sit above `yellows` so
  //    "Sahara Sand Yellow" files as a neutral, not a yellow. ("moonstone" is
  //    already siphoned to blues by rule 1 above, so "stone" here is safe.)
  { family: "neutrals", words: ["sand", "sahara", "pearl", "cream", "stone", "ivory", "bone"] },
  // 3. DARK — deep indigo / black-blue / black tones. Above `blues` so
  //    "Persian Indigo" files as dark (its hex is a dark blue), and above
  //    `reds`/`oranges` so nothing deep leaks up.
  { family: "dark", words: ["indigo", "midnight", "onyx", "obsidian", "noir", "ophiuchus"] },
  // 4. PURPLES — violet family. Above `blues` so "Supernova Violet" /
  //    "Velvet Purple" file as purple rather than near-blue hexes.
  { family: "purples", words: ["purple", "violet", "amethyst", "velvet", "lilac"] },
  // 5. REDS & PINKS — incl. pink/rose/garnet/rubedo/blood/crimson/ruby.
  { family: "reds", words: ["pink", "rose", "garnet", "rubedo", "blood", "crimson", "ruby", "red"] },
  // 6. ORANGES & GOLDS — incl. gold/amber/copper/bronze/solstice/coral.
  //    "Coral Reef" matches "coral" here (warm), before "reef" reaches blue.
  { family: "oranges", words: ["orange", "gold", "amber", "copper", "bronze", "solstice", "coral"] },
  // 7. YELLOWS — plain yellow only (sand/sahara already siphoned by rule 2).
  { family: "yellows", words: ["yellow"] },
  // 8. GREENS — green/sage/jade/emerald.
  { family: "greens", words: ["green", "sage", "jade", "emerald"] },
  // 9. BLUES & TEALS — blue/teal/aqua/aquamarine/glacier/lightning/cyan. Sits
  //    last among colour rules so the more specific dark/purple overrides above
  //    take precedence on ambiguous blue-ish names. ("moonstone" handled by
  //    rule 1.)
  { family: "blues", words: ["blue", "teal", "aqua", "aquamarine", "glacier", "lightning", "cyan"] },
];

/**
 * Derive a colourway's family from its NAME first (explicit colour words,
 * checked via the ordered NAME_RULES table — most specific wins), falling back
 * to `hexToFamily(hex)` only when the name carries no recognised colour word
 * (e.g. "Original", "Kaleidoscope"). This is the function the "Find a print"
 * wayfinder should use so every painting surfaces under the family its
 * colourway names intend.
 */
export const colourwayFamily = (name: string, hex: string): ColourFamily => {
  const n = name.toLowerCase();
  for (const rule of NAME_RULES) {
    if (rule.words.some((w) => n.includes(w))) return rule.family;
  }
  // No colour word in the name — trust the pixel value.
  return hexToFamily(hex);
};
