// =============================================================================
// The Mandala Company — Summer 2026 Catalogue — printed.com A4 Z-fold leaflet
// -----------------------------------------------------------------------------
// Emits two print-ready HTML sheets (outside.html + inside.html) at 303×216mm
// (A4 landscape 297×210 + 3mm bleed), backdrop cloned from the live /collections
// page, rendered to PDF by headless Chrome (render.sh). Data mirrored verbatim
// from src/data/paintings.ts / Gift.tsx / Collections — advertised == charged,
// and NO invented visible words (memorial site rule).
// =============================================================================
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = "/Users/archiehugo/Code/uncle-tribute";
const PUB = (p) => `file://${resolve(REPO, "public", p)}`;
const A = (p) => `file://${resolve(__dirname, "assets", p)}`;
const FONT = (f) => `file://${resolve(REPO, "public/fonts", f)}`;

const BG = "#0a0908", INK = "#ede6d6", ACCENT = "#c97844";
const INK_MUTED = "#b7ad99", LINE = "rgba(237,230,214,0.20)";

const CATALOGUE_NAME = "Summer 2026 Catalogue";

const TIERS = [
  { code: "A3", label: "Open Edition", size: "29.5 × 29.5 cm", price: "£245", ed: "Unnumbered, issued to order" },
  { code: "A2", label: "Collector Edition", size: "42 × 42 cm", price: "£450", ed: "Edition of 200, hand-numbered", anchor: true },
  { code: "A1", label: "Atelier Edition", size: "59.5 × 59.5 cm", price: "£850", ed: "Edition of 75, hand-numbered" },
  { code: "A0", label: "Heirloom Edition", size: "84 × 84 cm", price: "£1,750", ed: "Edition of 18, hand-numbered · optional gold-leaf detail" },
];
const FRAME_STYLES = [
  ["Natural oak", "#c9a368"], ["Stained black", "#1c1a18"], ["White", "#ede9e2"], ["Walnut tray", "#5a4030"],
];
const GIFT = [["A3", "£245"], ["A2", "£450"], ["A1", "£850"], ["A0", "£1,750"]];
const BUNDLES = [
  ["Complete a collection", "Every painting in a collection, together", "5–10% as a set"],
  ["Complete colourway set", "Every colourway of one painting", "12% as a set"],
  ["Compose your own set", "Choose any two or more mandalas to hang together", "5–10% as a set"],
  ["The Complete Catalogue", "One print of every painting — his life's work, in one collection", "15% as a set"],
];

const COLLECTIONS = [
  { id: "habundia", title: "Habundia",
    sub: "Seven Wild Flowers of the British Isles — each painted with oil pressed from the flower it depicts.",
    works: [
      { title: "Mandala of Wild Rose", year: "2018", img: "img/paintings/wild-rose-sussex-pink.jpg", colours: [["Sussex Pink", "#d9a3b5"]] },
      { title: "Mandala of English Bluebells", year: "2019", img: "img/paintings/english-bluebells-v3.jpg", colours: [["Sussex Blue", "#a9b9d6"]] },
    ] },
  { id: "genesis", title: "Genesis Mandalas",
    sub: "The earliest works, 1999–2001 — sacred number, divine encounter, and nature's rarest geometry.",
    works: [
      { title: "Mandala of Seven — Orchis 7 — Septagon", year: "1999", img: "img/paintings/orchis7-rubedo-red.jpg", colours: [["Rubedo Red", "#7a2a2e"]] },
      { title: "Mandala of Transformation — Flower of Life", year: "2000", img: "img/paintings/fol-kaleidoscope.jpg", colours: [["Kaleidoscope", "#4a3a78"]] },
      { title: "Mandala of 30 Slipper Orchids", year: "2001", img: "img/paintings/orchids30-nebula-purple.jpg", colours: [["Nebula Purple", "#4422a0"], ["Lightning Blue", "#9bb6e0"], ["Garnet Red", "#6b1a18"], ["Manipura Yellow", "#dfc56a"]] },
    ] },
  { id: "born-in-the-sky", title: "Born in the Sky",
    sub: "Five works of the night — a constellation left out, a comet on its only pass, nine stars in the shape of a swan.",
    works: [
      { title: "The Peacock Mandala — Shield of Minerva", year: "2006–2007", img: "img/paintings/peacock-persian-indigo.jpg", colours: [["Persian Indigo", "#2a3c7d"], ["Blood Moon Red", "#7a1d1c"], ["Sahara Sand Yellow", "#d2b07a"], ["Moroccan Purple", "#3d1e5e"], ["Mary Pink", "#e8a4be"]] },
      { title: "Ophiuchus", year: "2006", img: "img/paintings/ophiuchus-original.jpg", landscape: true, colours: [["Stained Glass", "#1a1330"]] },
      { title: "Tridecagon Moon Star — Star of Messier 13", year: "2007", img: "img/paintings/tridecagon-sage-green.jpg", colours: [["Sage Green", "#9bab86"], ["Moonstone Blue", "#b8c7d1"], ["Supernova Violet", "#8a7fd2"], ["Coral Reef", "#dcb39e"]] },
      { title: "Lulin", year: "2012", img: "img/paintings/lulin-original.jpg", colours: [["Lapis & Gold", "#caa54a"]] },
      { title: "Enneagon — The Swans", year: "", img: "img/paintings/enneagon-cygnus-gold.jpg", colours: [["Cygnus Gold", "#caa54a"], ["Glacier Blue", "#a8c8c5"], ["Solstice Orange", "#c97a3d"], ["Antique Pink", "#b48590"], ["Velvet Purple", "#5e3d6e"]] },
    ] },
];

const CREDENTIALS = [
  "Majlis Gallery, Dubai", "Trinity Gallery, London", "Unique Arts, Brighton",
  "Arista SunStar · Farmacy, Notting Hill", "Sahara Force India F1",
  "Tree of Wellbeing · 1,200 UK hospices & hospitals",
];
const PROVENANCE_CONVENTION =
  "This is the convention used by the estates of Picasso, Hepworth and Hilma af Klint, and is the standard for works released posthumously by an estate.";
const COLOURWAY_NOTE =
  "Each colourway was created by Stephen himself and discovered on his computer in his studio — his own variations of the work, exactly as he left them.";

const css = `
@font-face{font-family:'Fraunces';font-weight:100 900;font-style:normal;src:url('${FONT("fraunces-roman-latin.woff2")}') format('woff2');font-display:block}
@font-face{font-family:'Fraunces';font-weight:100 900;font-style:italic;src:url('${FONT("fraunces-italic-latin.woff2")}') format('woff2');font-display:block}
@font-face{font-family:'Schibsted';font-weight:300 700;font-style:normal;src:url('${FONT("schibsted-grotesk-latin-var-v1.woff2")}') format('woff2');font-display:block}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:303mm 216mm;margin:0}
html,body{width:303mm;height:216mm}
body{background:${BG};color:${INK};font-family:'Schibsted',sans-serif;-webkit-font-smoothing:antialiased;position:relative;overflow:hidden}
.sheet{position:absolute;inset:0;width:303mm;height:216mm;overflow:hidden}
.bg{position:absolute;inset:0;background-image:url('${A("backdrop-base.png")}');background-size:cover;background-position:center}
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,7,6,0.46) 0%,rgba(8,7,6,0.60) 45%,rgba(8,7,6,0.74) 100%)}
.grain{position:absolute;inset:0;opacity:.05;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.trim{position:absolute;left:3mm;top:3mm;width:297mm;height:210mm;display:grid;grid-template-columns:99mm 99mm 99mm}
.panel{position:relative;height:210mm;padding:9mm 8mm;display:flex;flex-direction:column;overflow:hidden}
.panel + .panel{border-left:0.3pt solid rgba(237,230,214,0.10)}
.serif{font-family:'Fraunces',serif}
.eyebrow{font-family:'Schibsted';font-size:6.6pt;font-weight:700;letter-spacing:.30em;text-transform:uppercase;color:${ACCENT}}
.eyebrow.muted{color:${INK_MUTED}}
.rust{color:${ACCENT}}
.hair{height:0.4pt;background:${LINE};border:0;width:100%}
.tabnum{font-variant-numeric:tabular-nums}
</style>`;

const head = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</head><body>`;
const foot = `</body></html>`;
const bg = `<div class="bg"></div><div class="scrim"></div>`;
const grain = `<div class="grain"></div>`;

const swatches = (colours) => {
  const dots = colours.map(([name, hex]) =>
    `<span title="${name}" style="width:3.1mm;height:3.1mm;border-radius:50%;background:${hex};box-shadow:0 0 0 0.4pt rgba(237,230,214,0.55);display:inline-block"></span>`).join("");
  const label = colours.length === 1 ? colours[0][0] : `${colours.length} colourways`;
  return `<div style="display:flex;align-items:center;gap:2mm;margin-top:1.6mm"><div style="display:flex;gap:1.4mm">${dots}</div><span style="font-size:6.4pt;letter-spacing:.06em;color:${INK_MUTED}">${label}</span></div>`;
};

// ── OUTSIDE ──────────────────────────────────────────────────────────────────
const backCover = `
<div class="panel" style="justify-content:space-between">
  <div>
    <div class="eyebrow muted">The Mandala Company</div>
    <div class="serif" style="font-size:13.5pt;font-weight:600;line-height:1.1;letter-spacing:-0.02em;margin-top:3mm">How each order is made</div>
    <div style="font-size:7pt;line-height:1.48;color:${INK_MUTED};margin-top:2.4mm">Every print is made to order at <b style="color:${INK};font-weight:600">Point 101, London</b> — one of the UK's leading giclée print ateliers — on 350gsm Hahnemühle archival paper with pigment inks. Lifespan under normal display conditions is in excess of 200 years.</div>
    <ul style="list-style:none;margin:3mm 0 0;display:grid;grid-template-columns:1fr 1fr;gap:2mm 3mm">
      ${["Estate-stamped by The Mandala Company","Hand-numbered within its edition","Certificate of Authenticity + Certificate ID","Sealed with the estate's wax rose","Enclosed with this printed catalogue","Dispatched within 7–10 working days"].map(x=>`<li style="font-size:6.5pt;line-height:1.32;color:${INK};display:flex;gap:1.4mm"><span class="rust" style="font-size:6pt;line-height:1.4">✦</span><span>${x}</span></li>`).join("")}
    </ul>
    <div style="font-size:6pt;line-height:1.42;color:${INK_MUTED};margin-top:2.6mm;font-style:italic">${PROVENANCE_CONVENTION}</div>
  </div>
  <div>
    <div class="hair" style="margin:0 0 3mm"></div>
    <div class="eyebrow muted" style="font-size:5.8pt">Exhibited &amp; commissioned</div>
    <div style="font-size:6.5pt;line-height:1.5;color:${INK};margin-top:1.6mm">${CREDENTIALS.join(`<span style="color:${INK_MUTED}"> · </span>`)}</div>
  </div>
  <div>
    <div class="hair" style="margin:0 0 3mm"></div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:4mm">
      <div style="min-width:0">
        <div class="eyebrow muted" style="font-size:5.8pt">Free worldwide delivery</div>
        <div style="font-size:6.4pt;line-height:1.44;color:${INK_MUTED};margin-top:1.6mm;max-width:52mm">Free worldwide — UK, Europe and beyond, framed or unframed, with nothing added at checkout. Prices shown in £ · $ · € · A$ · C$. Interior designers &amp; art consultants — the estate offers a trade programme.</div>
        <div style="font-size:7pt;margin-top:2.4mm;color:${INK}">info@themandalacompany.com<br><b style="color:${INK}">themandalacompany.com</b></div>
      </div>
      <div style="text-align:center;flex-shrink:0">
        <img src="${A("qr-site.png")}" style="width:18mm;height:18mm;display:block"/>
        <div style="font-size:5.4pt;letter-spacing:.12em;text-transform:uppercase;color:${INK_MUTED};margin-top:1.2mm">Scan to visit</div>
      </div>
    </div>
    <div class="hair" style="margin:3mm 0"></div>
    <div style="text-align:center">
      <div class="serif" style="font-size:8.6pt;font-style:italic;color:${INK_MUTED}">Stephen Meakin</div>
      <div style="font-size:6.4pt;letter-spacing:.18em;color:${INK_MUTED};margin-top:1mm">1966 — 2021 · IN MEMORIAM</div>
    </div>
  </div>
</div>`;

const editionsPanel = `
<div class="panel">
  <div class="eyebrow">The editions</div>
  <div class="serif" style="font-size:12.5pt;font-weight:600;letter-spacing:-0.015em;margin-top:1.6mm;line-height:1.05">Every painting,<br>four sizes</div>
  <div style="font-size:6.7pt;color:${INK_MUTED};margin-top:1.6mm;line-height:1.4">Each made to order, estate-stamped, with a Certificate of Authenticity.</div>
  <div style="margin-top:3.4mm;border-top:0.4pt solid ${LINE}">
    ${TIERS.map(t=>`
      <div style="display:flex;justify-content:space-between;gap:2mm;padding:2.5mm 0;border-bottom:0.4pt solid ${LINE}">
        <div style="min-width:0">
          <div style="display:flex;align-items:baseline;gap:2mm">
            <span class="serif" style="font-size:8.8pt;font-weight:600">${t.label}</span>
            ${t.anchor?`<span style="font-size:5.4pt;letter-spacing:.12em;text-transform:uppercase;color:${ACCENT}">Most chosen</span>`:""}
          </div>
          <div style="font-size:6.5pt;color:${INK_MUTED};margin-top:0.8mm">${t.code} · ${t.size}</div>
          <div style="font-size:6.2pt;color:${INK_MUTED};margin-top:0.4mm">${t.ed}</div>
        </div>
        <div class="serif tabnum" style="font-size:11pt;font-weight:600;white-space:nowrap">${t.price}</div>
      </div>`).join("")}
  </div>
  <div style="font-size:6.2pt;color:${INK_MUTED};margin-top:1.6mm">Custom size — price on application, by request.</div>
  <div class="eyebrow" style="margin-top:4mm">Framing &amp; finishing</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.4mm 3mm;margin-top:2mm">
    ${FRAME_STYLES.map(([n,hex])=>`<div style="font-size:6.7pt;color:${INK};display:flex;align-items:center;gap:1.6mm"><span style="width:2.6mm;height:2.6mm;border-radius:50%;background:${hex};box-shadow:0 0 0 0.4pt rgba(237,230,214,0.45)"></span>${n}</div>`).join("")}
  </div>
  <div style="font-size:6.3pt;color:${INK_MUTED};margin-top:1.8mm;line-height:1.4">Bespoke Point 101 frames on A2 &amp; A1 — any style, one price: <b style="color:${INK}">+£295 / +£395</b>. Glazing: art acrylic or anti-reflective museum glass, included.</div>
  <div style="font-size:6.3pt;color:${INK_MUTED};margin-top:1.8mm;line-height:1.4"><b style="color:${INK}">Hand-finished by Polly Wedge</b> in Stephen's geometric tradition, A2 &amp; A1 — <b style="color:${INK}">+£350 / +£495</b>.</div>
</div>`;

const frontCover = `
<div class="panel" style="justify-content:space-between;align-items:center;text-align:center">
  <div style="width:100%">
    <div class="eyebrow" style="font-size:6pt">${CATALOGUE_NAME}</div>
    <img src="${PUB("logo/logo-seal-v3-w512.png")}" style="width:21mm;height:21mm;object-fit:contain;margin:2.6mm auto 0;display:block"/>
    <div class="eyebrow muted" style="margin-top:2.6mm;font-size:6.6pt">The Mandala Company</div>
  </div>
  <div style="width:100%">
    <div class="serif" style="font-size:26pt;font-weight:600;line-height:0.98;letter-spacing:-0.02em">The complete<br><span style="font-style:italic;font-weight:400">works</span></div>
    <div style="font-size:7.2pt;letter-spacing:.06em;color:${INK_MUTED};margin-top:3mm;line-height:1.5;max-width:70mm;margin-left:auto;margin-right:auto">The sacred-geometry mandalas of<br><b style="color:${INK};font-weight:600">Stephen Meakin</b> · 1966 — 2021<br>estate-stamped giclée editions, from £245</div>
  </div>
  <div style="width:100%">
    <div style="aspect-ratio:1/1;width:58mm;margin:0 auto;overflow:hidden;box-shadow:0 0 0 0.4pt ${LINE},0 6mm 14mm rgba(0,0,0,0.5)"><img src="${PUB("img/paintings/wild-rose-sussex-pink.jpg")}" style="width:100%;height:100%;object-fit:cover;display:block"/></div>
    <div class="serif" style="font-size:7.4pt;font-style:italic;color:${INK_MUTED};margin-top:4mm;line-height:1.5;max-width:74mm;margin-left:auto;margin-right:auto">“Something totally cosmic is reflected in you.”</div>
    <div style="font-size:6pt;letter-spacing:.18em;color:${INK_MUTED};margin-top:1.6mm">SEM</div>
  </div>
</div>`;

const outside = head + `<div class="sheet">${bg}<div class="trim">${backCover}${editionsPanel}${frontCover}</div>${grain}</div>` + foot;

// ── INSIDE ───────────────────────────────────────────────────────────────────
const ALL = COLLECTIONS.flatMap((c) =>
  c.works.map((w, i) => ({ ...w, coll: c, isFirst: i === 0, roman: c.id === "habundia" ? "I" : c.id === "genesis" ? "II" : "III" })));

const gridTile = (w) => `
  <figure style="margin:0;position:relative">
    ${w.isFirst ? `<div style="position:absolute;top:-6.6mm;left:0;right:0">
        <div style="display:flex;align-items:baseline;gap:1.6mm"><span class="rust" style="font-size:6pt;font-weight:700;letter-spacing:.2em">${w.roman}</span><span class="serif" style="font-size:8.4pt;font-weight:600;letter-spacing:-0.01em">${w.coll.title}</span></div>
        <div style="height:0.5pt;background:${ACCENT};opacity:.5;margin-top:1mm"></div>
      </div>` : ""}
    <div style="aspect-ratio:1/1;overflow:hidden;box-shadow:0 0 0 0.4pt ${LINE},0 3mm 8mm rgba(0,0,0,0.42);display:flex;align-items:center;justify-content:center;background:#0a0908">
      <img src="${PUB(w.img)}" style="width:100%;${w.landscape ? "height:auto" : "height:100%"};object-fit:${w.landscape ? "contain" : "cover"};display:block"/>
    </div>
    <div class="serif" style="font-size:8pt;font-weight:600;line-height:1.1;letter-spacing:-0.01em;margin-top:1.8mm;min-height:8.8mm">${w.title}</div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:0.6mm">
      <span style="font-size:6pt;letter-spacing:.12em;text-transform:uppercase;color:${INK_MUTED}">${w.year || "—"}</span>
      <span style="font-size:6.6pt;color:${INK_MUTED}">from <b class="tabnum" style="color:${INK};font-weight:600">£245</b></span>
    </div>
    ${swatches(w.colours)}
  </figure>`;

const CARD_SCRIM = "radial-gradient(120% 130% at 50% 40%,rgba(9,7,6,0.90) 0%,rgba(9,7,6,0.80) 55%,rgba(9,7,6,0.30) 100%)";
const bundleRow = BUNDLES.map(([t, d, s]) => `
  <div style="flex:1;min-width:0">
    <div class="serif" style="font-size:8.4pt;font-weight:600;letter-spacing:-0.01em;line-height:1.1">${t}</div>
    <div style="font-size:6.3pt;line-height:1.34;color:${INK_MUTED};margin-top:1mm">${d}</div>
    <div style="font-size:6.4pt;color:${ACCENT};font-weight:600;margin-top:1.2mm">${s}</div>
  </div>`).join(`<div style="width:0.4pt;background:${LINE};margin:0 1mm"></div>`);

const setsBand = `
<div style="background:${CARD_SCRIM};padding:6mm 7mm;display:flex;gap:7mm;align-items:stretch">
  <div style="flex:2.9;min-width:0">
    <div class="eyebrow" style="font-size:6pt">Sets &amp; commissions</div>
    <div class="serif" style="font-size:11pt;font-weight:600;letter-spacing:-0.015em;margin-top:1mm">His life's work, gathered together</div>
    <div style="display:flex;margin-top:3mm">${bundleRow}</div>
    <div style="font-size:5.9pt;color:${INK_MUTED};margin-top:3mm">The set saving is applied automatically at checkout — the amount you see is the amount you pay.</div>
  </div>
  <div style="width:0.5pt;background:${LINE}"></div>
  <div style="flex:1.35;min-width:0;display:flex;flex-direction:column">
    <div class="eyebrow" style="font-size:6pt">Gift an edition</div>
    <div class="serif" style="font-size:9.4pt;font-weight:600;margin-top:1mm;line-height:1.08">Give a piece of<br>Stephen's work</div>
    <div style="display:flex;flex-wrap:wrap;gap:1.2mm 2mm;margin-top:2.4mm">${GIFT.map(([c, p]) => `<span style="font-size:6.4pt;color:${INK}"><b style="font-weight:600">${c}</b> <span class="tabnum">${p}</span></span>`).join(`<span style="color:${INK_MUTED}">·</span>`)}</div>
    <div style="font-size:6.1pt;color:${INK_MUTED};margin-top:2mm;line-height:1.4">Or any amount, £25–£5,000, with a personal message. Redeemable against any edition.</div>
    <div style="display:flex;align-items:center;gap:2.4mm;margin-top:auto;padding-top:3mm"><img src="${A("qr-gift.png")}" style="width:13mm;height:13mm"/><span style="font-size:5.8pt;letter-spacing:.12em;text-transform:uppercase;color:${INK_MUTED};line-height:1.4">themandalacompany.com/gift</span></div>
  </div>
</div>`;

const insideBody = `
<div style="position:absolute;left:3mm;top:3mm;width:297mm;height:210mm;padding:9mm 10mm;display:flex;flex-direction:column">
  <div style="display:flex;justify-content:space-between;align-items:flex-end">
    <div>
      <div class="eyebrow">${CATALOGUE_NAME}</div>
      <div class="serif" style="font-size:15pt;font-weight:600;letter-spacing:-0.02em;margin-top:1.4mm;line-height:1">Everything he finished — the complete works</div>
    </div>
    <div style="text-align:right;max-width:92mm">
      <div style="font-size:6.8pt;line-height:1.45;color:${INK_MUTED}">The finite body of Stephen Meakin's finished work, issued as estate-stamped giclée editions. Ten paintings; every colourway he left.</div>
      <div style="font-size:6.2pt;line-height:1.42;color:${INK_MUTED};font-style:italic;margin-top:1.2mm">${COLOURWAY_NOTE}</div>
      <div style="font-size:6.8pt;color:${INK_MUTED};margin-top:1.4mm">Each, from <b class="tabnum" style="color:${INK};font-weight:600">£245</b> · free worldwide delivery</div>
    </div>
  </div>
  <div class="hair" style="margin:4mm 0 8mm"></div>
  <div style="flex:1;display:grid;grid-template-columns:repeat(5,1fr);grid-auto-rows:1fr;column-gap:5mm;row-gap:9mm">${ALL.map(gridTile).join("")}</div>
  <div style="margin-top:7mm">${setsBand}</div>
</div>`;

const inside = head + `<div class="sheet">${bg}${insideBody}${grain}</div>` + foot;

writeFileSync(resolve(__dirname, "outside.html"), outside);
writeFileSync(resolve(__dirname, "inside.html"), inside);
console.log("wrote outside.html + inside.html");
