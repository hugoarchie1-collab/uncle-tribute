# Editing the site

This guide is for editing the site without touching design or layout.
Everything below can be done by anyone comfortable with a text editor —
no JavaScript knowledge required.

## Where the words live

All text on the site comes from two files:

- **`src/data/content.ts`** — Welcome page text, About page text, the passing date.
- **`src/data/paintings.ts`** — Every painting, every colourway, every sizing / framing / price detail.

Just find the line you want to change, edit the text inside the quotes
(`"..."`), save, commit, push. The site rebuilds and deploys automatically.

---

## Setting the passing date

Find this line near the top of `src/data/content.ts`:

```ts
export const PASSING_DATE = "[ DATE ]";
```

Replace `[ DATE ]` with the real date, for example:

```ts
export const PASSING_DATE = "March 2024";
```

For the **Enneagon — The Swans** date, open `src/data/paintings.ts`,
find the painting with `id: "enneagon-swans"`, and change:

```ts
year: "[ DATE ]",
```

to the real year.

---

## Adding sizing, framing and price for a colourway

In `src/data/paintings.ts`, every colourway object can have these optional fields:

```ts
{
  name: "Sussex Pink",
  image: "/img/paintings/wild-rose-sussex-pink.jpg",
  hex: "#d9a3b5",
  isOriginal: true,
  available: true,
  // ↓ fill these in whenever ready ↓
  sizing: "A1 (594 × 841 mm) giclée print on Hahnemühle Photo Rag 308gsm",
  framing: "Hand-finished oak frame with museum glass",
  price: "£450",
  editionSize: "Limited edition of 50, signed",
  colourwayNote: "This was the colourway Stephen kept on his studio computer..."
}
```

If a field is left out, that line simply doesn't appear on the site.
The "Acquire this print" panel will show a polite "details coming soon"
message until at least one of `sizing`, `framing`, `editionSize` or
`price` is filled in.

---

## Hiding a colourway temporarily

Set `available: false` on it. The swatch will disappear from the site
but the data stays in the file so you can put it back later.

---

## Adding a new colourway

Inside any painting's `colourways: [...]` array, add a new object:

```ts
{
  name: "New Colourway Name",
  image: "/img/paintings/new-image.jpg",   // file in public/img/paintings/
  hex: "#abcdef",                          // colour for the swatch dot
  isOriginal: false,
  available: true,
}
```

Then drop the matching image file into `public/img/paintings/`.

---

## Swapping any image for a higher-res master

Just overwrite the file in `public/` with the same filename — no code
change needed. The site picks it up on the next build.

Layout map:

```
public/
  favicon.svg               site favicon (the rose emblem)
  og-image.jpg              social share image (1200×630)
  robots.txt                search engines
  sitemap.xml               search engines
  logo/
    logo.svg                horizontal lockup (emblem + wordmark)
    logo-stacked.svg        stacked variant
    logo-emblem.svg         emblem only (used by Logo component)
    renders/*.png           4K raster exports
  video/
    intro.mp4               H.264 universal-compat (~10 MB)
    intro.webm              VP9 modern browsers (~5 MB)
    poster.jpg              first frame, shown before video plays
  img/
    paintings/              32 painting JPGs, one per colourway
    about/                  Stephen / studio / TAGA / gallery photos
    scenes/                 collection hero backdrops (habundia / genesis / born-in-the-sky)
```

---

## Replacing the intro video

Drop new files at `public/video/intro.mp4` and `public/video/intro.webm`
(same filenames). For the still poster shown while the video loads,
overwrite `public/video/poster.jpg`.

The intro plays muted on loop by browser policy — there is no audio
track in the current files.

---

## Replacing collection backdrops

Drop a JPG at:

- `public/img/scenes/habundia.jpg`
- `public/img/scenes/genesis.jpg`
- `public/img/scenes/born-in-the-sky.jpg`

These appear as the hero backdrop for each collection. The text is
rendered on top with a dark overlay, so anything works — landscapes,
abstracts, painted moods.

---

## Adding contact / social media links

Open `src/components/Footer.tsx`. Find the `socialLinks` array near the top:

```ts
const socialLinks: { label: string; href: string }[] = [
  { label: "Instagram", href: "#" },
  { label: "Pinterest", href: "#" },
  { label: "Email", href: "mailto:enquiries@example.com" },
];
```

Replace the `"#"` URLs with your real handles. Remove or add entries
as you like — the footer renders whatever's in the list.

---

## Running the site locally

You'll need Node.js v20 or newer: https://nodejs.org

```bash
git clone <repo-url>
cd uncle-tribute
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`).

To build a deployable version:

```bash
npm run build
```

The output goes in `dist/`. Drag that folder into Vercel, Netlify or
Cloudflare Pages to deploy — or push to the branch and the included
GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and
deploys to GitHub Pages automatically.

---

## Editing legal pages

`src/pages/Legal.tsx` contains placeholder Privacy and Terms text.
Edit the `PRIVACY_BODY` and `TERMS_BODY` arrays — each item is a
paragraph. Replace the placeholder wording with your final policies
before going live.

---

## Asking for help

Anything you can't find in here, ask. The whole site is designed so
the words and the design are separate — you change words, the design
holds.
