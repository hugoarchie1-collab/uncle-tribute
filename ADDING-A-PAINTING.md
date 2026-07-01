# Adding a painting — themandalacompany.com

You do **not** touch design, HTML, or CSS. Every painting is pure data run through
one template. Adding one = **two text edits + one image**, ~5 minutes.

> Written assuming you remember nothing about the code. Follow the steps in order.

---

## The 3 things you touch

1. **One image** → `public/img/paintings/`
2. **The painting data** → `src/data/paintings.ts` (add one object)
3. **The buy allowlist** → `api/checkout.ts` (add one line — the *only* second place,
   because the checkout server can't read the app's data file)

Everything else — the product page, the Collections listing, the home featured
grid, pricing tiers, the certificate — happens automatically.

---

## Step 1 — Add the image

Put a **square, high-resolution** image in:

```
public/img/paintings/
```

- Format: **JPG**, colour profile **sRGB**
- Size: ideally **2000 × 2000 px** (square). Bigger is fine; it's displayed scaled.
- Filename: lowercase-with-dashes, e.g. `winter-light.jpg`
- (A matching `.webp` is served automatically if present — optional. JPG alone works.)

## Step 2 — Add the painting DATA

Open **`src/data/paintings.ts`**. Find the big list `export const PAINTINGS = [ … ]`.
Copy any existing painting object and paste a new one into the list. Fill it in:

```ts
{
  id: "winter-light",                 // lowercase-with-dashes, UNIQUE, no spaces
  title: "Mandala of Winter Light",
  year: "2019",
  collection: "genesis",              // one of: habundia | genesis | born-in-the-sky
  size: "60 × 60 cm",                 // optional, the physical size of the original
  description: "The full story / meaning of this piece, in Stephen's spirit.",
  artistQuote: "His own words about it, if you have them.",   // optional
  location: "Lewes, Sussex",          // optional
  colourways: [
    {
      name: "Original",
      image: "/img/paintings/winter-light.jpg",   // the file from Step 1
      hex: "#3a5f7a",                              // colour of the little swatch dot
      isOriginal: true,
      available: true,
    },
    // add more colourways here later if this painting has them
  ],
},
```

**You do NOT set prices here.** Every painting automatically uses the shared print
ladder (Open / Collector / Atelier / Heirloom editions) defined once in the same
file. Leave pricing alone.

## Step 3 — Allow it to be bought

Open **`api/checkout.ts`**. Near the top there's a list of allowed painting IDs.
Add the SAME `id` from Step 2 (e.g. `"winter-light"`) to that list — one line.

> If you skip this, the painting's page still shows, but clicking "Buy" will error.
> This is the only place the id must be repeated (the payment server is sandboxed
> away from the app data on purpose).

## Step 4 — Publish

Commit the three changes (image + `paintings.ts` + `checkout.ts`) and push to
`main`. Vercel rebuilds and deploys automatically (~2 minutes).

The new painting now:
- has its own page at **`/collections/winter-light`**
- appears in **Collections** under its collection
- is eligible for the **home featured grid**
- can be **bought**, with an estate certificate, like every other print

No page was created by hand. No design was touched.

---

## Worked example (filled in)

Image saved: `public/img/paintings/winter-light.jpg` (2000×2000 JPG)

In `src/data/paintings.ts`, added to `PAINTINGS`:

```ts
{
  id: "winter-light",
  title: "Mandala of Winter Light",
  year: "2019",
  collection: "genesis",
  size: "60 × 60 cm",
  description: "Drawn through the shortest days of the year — the geometry of stillness, light held in a dark season.",
  colourways: [
    { name: "Original", image: "/img/paintings/winter-light.jpg", hex: "#3a5f7a", isOriginal: true, available: true },
  ],
},
```

In `api/checkout.ts`, added `"winter-light"` to the allowed-ids list.

Pushed to `main`. Live at `/collections/winter-light` in ~2 minutes. Done.

---

## Troubleshooting

- **Page shows "not found":** the `id` in the URL doesn't match the `id` in
  `paintings.ts`. They must be identical.
- **Image is blank/broken:** the `image:` path must start with `/img/paintings/`
  and match the filename exactly (case-sensitive).
- **"Buy" errors:** you forgot Step 3 (the `api/checkout.ts` allowlist).
- **Two colourways look identical:** each colourway needs its own `image:` file.
