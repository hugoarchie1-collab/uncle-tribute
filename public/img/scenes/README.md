# Collection backdrop images

Drop real photographs in this folder to replace the hand-drawn atmospheric
SVG scenes on the Collections page.

The site automatically prefers a real photo if the `backdropImage` field
is set in `src/data/paintings.ts`. Until then, the SVG scene shows.

## What to source

The classical trinity: Earth → Water → Sky.

### `habundia.jpg` — Habundia
**Ancient British woodland** — shafts of gold light breaking through oak
and beech canopy, bluebell carpet at mist level. English, mossy, sacred.
Dawn light through a hidden grove.

Unsplash search:
- `bluebell wood England`
- `ancient British forest sunlight`
- `English woodland mist`

### `genesis.jpg` — Genesis Mandalas
**Bioluminescent ocean at night** — deep teal and electric blue light
blooming in organic patterns from within dark water. Primordial, glowing,
between earth and sky. The feeling of the first living form emerging.

Unsplash search:
- `bioluminescent ocean night`
- `bioluminescent waves dark`
- `glowing plankton sea`

### `born-in-the-sky.jpg` — Born in the Sky
**The Milky Way arching over a dark horizon** — dense star field, deep
indigo-black, long exposure. Rich and celestial. The literal home of the
Peacock, the Serpent Bearer, the Swans.

Unsplash search:
- `Milky Way long exposure`
- `star field deep indigo night sky`
- `constellation photography dark`

## How to wire them in

After saving the JPG in this folder, open `src/data/paintings.ts` and add
a `backdropImage` field to the matching collection, e.g.:

```ts
{
  id: "habundia",
  title: "...",
  description: "...",
  backdropImage: "/img/scenes/habundia.jpg",
}
```

That's it. The SVG fallback will swap to your real photo automatically.

## Image specs

- Format: JPG (or WebP) — keep file size under ~500KB for fast loading
- Resolution: at least 1920×1080; 2560×1440 is ideal
- Orientation: landscape, with focal interest in the centre
- The site darkens the image slightly so heavily-lit photos work fine
