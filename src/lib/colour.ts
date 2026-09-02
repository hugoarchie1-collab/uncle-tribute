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
  { key: "neutrals", label: "Neutrals & sand", swatch: "#c9b79a" },
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
// =============================================================================
// MULTI-FAMILY (2026-09-01). A colourway genuinely belongs to EVERY family it
// fits — not just one. The old first-rule-wins classifier filed each colourway
// under a single family, so buyers missed obvious matches: "Persian Indigo"
// was ONLY "dark" (absent from Blues), "Sahara Sand Yellow" ONLY a neutral
// (absent from Yellows), the golds ONLY oranges (absent from Yellows), "Coral
// Reef" absent from Reds & pinks, and "Terracotta Brown" was WRONGLY a red.
// Now every matching colour word contributes its families, and a word that
// names an in-between tone (indigo, gold, coral, tanzanite, terracotta) maps to
// BOTH of the families a buyer would look under. Each rule is auditable.
// =============================================================================
const NAME_FAMILIES: { words: string[]; families: ColourFamily[]; unless?: string[] }[] = [
  // Gems / minerals with a definite hue
  { words: ["moonstone"], families: ["blues"] },
  { words: ["tanzanite"], families: ["purples", "blues"] }, // blue-violet gem
  { words: ["lapis"], families: ["blues"] },
  // Neutrals & sand (a sand-YELLOW is also a yellow — see the yellow rule).
  // `unless: moonstone` — "stone" would otherwise substring-match inside
  // "Moonstone Blue" and wrongly file a pale blue gem under neutrals.
  { words: ["sand", "sahara", "pearl", "cream", "stone", "ivory", "bone", "linen"], families: ["neutrals"], unless: ["moonstone"] },
  // Dark & indigo — indigo is a DEEP BLUE, so it is a blue too
  { words: ["indigo"], families: ["dark", "blues"] },
  { words: ["midnight", "onyx", "obsidian", "noir", "ophiuchus", "black"], families: ["dark"] },
  // Purples & violets
  { words: ["purple", "violet", "amethyst", "velvet", "lilac", "lavender", "mauve"], families: ["purples"] },
  // Reds & pinks
  { words: ["pink", "rose", "garnet", "rubedo", "blood", "crimson", "ruby", "red", "magenta"], families: ["reds"] },
  // Coral sits between orange and pink — file under both
  { words: ["coral", "peach", "salmon"], families: ["oranges", "reds"] },
  // Oranges & golds; gold/saffron/amber are yellow-orange — file under both
  { words: ["orange", "copper", "bronze", "solstice", "tangerine"], families: ["oranges"] },
  { words: ["gold", "saffron", "amber", "honey"], families: ["oranges", "yellows"] },
  // Browns / earth (terracotta, rust, clay) are warm earth tones — NOT reds
  { words: ["terracotta", "brown", "rust", "clay", "sienna", "umber", "ochre"], families: ["oranges", "neutrals"] },
  // Yellows
  { words: ["yellow", "lemon", "citrine", "manipura"], families: ["yellows"] },
  // Greens
  { words: ["green", "sage", "jade", "emerald", "olive", "moss", "aurora"], families: ["greens"] },
  // Blues & teals
  { words: ["blue", "teal", "aqua", "aquamarine", "glacier", "lightning", "cyan", "cerulean"], families: ["blues"] },
];

/**
 * EVERY family a colourway belongs to, from the colour words in its NAME (all
 * matching rules contribute), falling back to `hexToFamily(hex)` only when the
 * name carries no recognised colour word (e.g. "Original", "Kaleidoscope",
 * "Stained Glass"). This is what the "Find a print" colour lens and the quiz
 * should use, so a buyer filtering Blues sees Persian Indigo and Lapis, a
 * buyer filtering Yellows sees the golds and Sahara Sand, etc.
 */
// ARTWORK overrides (2026-09-01, from a tile-by-tile audit). A colourway's
// `hex` is one representative pixel and its NAME describes the mandala — but
// a buyer filters by what they SEE in the whole tile, ground included. These
// are ADDITIVE only (they never remove a name-expected family), keyed by the
// lowercased colourway name, each with the reason it earns the extra family.
const ARTWORK_FAMILIES: Record<string, ColourFamily[]> = {
  // Flower of Life "Kaleidoscope": hex hue 255.5° sits ½° past the blue cut-off
  // and files purple-only, yet the tile is a strong periwinkle/cornflower-blue ground.
  kaleidoscope: ["blues"],
  // Ophiuchus "Stained Glass": hex is the near-black night sky; the tile is
  // dominated by a rust-orange/terracotta frame and bright cobalt blues.
  "stained glass": ["blues", "oranges"],
  // Peacock "Sahara Sand Yellow": hex hue 37° is squarely gold-orange (the
  // "Oranges & golds" swatch is its nearest), warm peach-gold lattice border.
  "sahara sand yellow": ["oranges"],
  // Swans "Glacier Blue": mint mandala on a DEEP PURPLE ground — the site's
  // own colourwayTints measurement puts the dominant hue at 324° (purple).
  "glacier blue": ["purples"],
};

export const colourwayFamilies = (name: string, hex: string): ColourFamily[] => {
  const n = name.toLowerCase();
  const out = new Set<ColourFamily>();
  for (const rule of NAME_FAMILIES) {
    if (rule.unless?.some((w) => n.includes(w))) continue; // e.g. "stone" must not hit "moonstone"
    if (rule.words.some((w) => n.includes(w))) rule.families.forEach((f) => out.add(f));
  }
  // No colour word in the name — trust the pixel value.
  if (out.size === 0) out.add(hexToFamily(hex));
  // What the whole tile actually shows (ground included) — additive.
  ARTWORK_FAMILIES[n]?.forEach((f) => out.add(f));
  return [...out];
};

/** Primary (first) family — kept for any single-value caller. Prefer
 *  `colourwayFamilies` for filtering, which honours every family a tone fits. */
export const colourwayFamily = (name: string, hex: string): ColourFamily =>
  colourwayFamilies(name, hex)[0];
