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
  if (l < 0.2) return "dark";
  if (s < 0.18) return l > 0.62 ? "neutrals" : "dark";
  if (h < 18 || h >= 330) return "reds";
  if (h < 45) return "oranges";
  if (h < 70) return "yellows";
  if (h < 170) return "greens";
  if (h < 255) return "blues";
  return "purples";
};
