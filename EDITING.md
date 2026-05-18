# Editing the site

This is a guide for editing content without touching the design or layout.
Everything below can be done by anyone comfortable with a text editor.

## Where the words live

All text on the site comes from two files:

- **`src/data/content.ts`** — Welcome page text, About page text, and the passing date.
- **`src/data/paintings.ts`** — Every painting, every colourway, every sizing / framing / price detail.

You don't need to know JavaScript. Just find the line you want to change,
edit the text inside the quotes (`"..."`), save, commit, push.

---

## Setting the passing dates

Find this line in `src/data/content.ts`:

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

In `src/data/paintings.ts`, every colourway object has these optional fields:

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

## Replacing a low-resolution image with a higher-res master

Just overwrite the file in `public/img/paintings/` with the same filename.
No code change needed. The current low-res ones to replace when you get masters:

- `enneagon-cygnus-gold.jpg` (1080×1080 → ideally 2048+)
- `lulin-original.jpg` (1080×1080 → ideally 2048+)
- `orchis7-amethyst-purple.jpg` (1080×1080 → ideally 2048+)
- `peacock-blood-moon-red.jpg` (1084×1080 → ideally 2048+)

---

## Adding the intro audio file

Source a "singing bowl wind chimes meditation" audio file
(Pixabay or Freesound, free / CC0). Save it as:

```
public/audio/intro.mp3
```

Length: ideally 3–5 minutes; the player loops it automatically. The site
will quietly skip the audio if the file isn't there.

---

## Adding a real photograph of the easel + empty chair scene

If you find or take a real photograph of the Wild Rose mandala on an easel
outside with the empty chair beside it, save it as:

```
public/img/scenes/easel-chair.jpg
```

and tell whoever is editing to swap the contents of
`src/components/GardenScene.tsx` for a single `<img>` tag pointing at it.

---

## Running the site locally

You'll need Node.js (v20 or newer) installed once: https://nodejs.org

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
Cloudflare Pages to deploy.

---

## Asking for help

Anything you can't find in here, ask me (or Claude). The whole site is
designed so the words and the design are separate — you change words,
the design holds.
