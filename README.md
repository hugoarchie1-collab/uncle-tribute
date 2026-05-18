# The Art of Stephen Meakin

A tribute and catalogue of the life's work of mandala artist and sacred
geometer Stephen Meakin (SEM, b. 1966), built as a static site.

## Site structure

- **`/`** — Cinematic intro (Plato's allegory of the cave, scroll-driven) →
  Welcome to The Mandala Company
- **`/collections`** — The three collections: Habundia, Genesis, Born in the Sky
- **`/collections/:id`** — A single painting with colourway selector, story and
  acquire panel
- **`/about`** — Stephen's full biography, the Anegada beach moment, Phoenix
  Place / TAGA / legacy, and his letter to every student

## Stack

React + TypeScript + Vite + GSAP/ScrollTrigger + React Router.
All content is in plain `.ts` files under `src/data/` —
see **`EDITING.md`** for the editing guide.

## Local dev

```bash
npm install
npm run dev    # localhost:5173
npm run build  # → dist/ (static, deploy anywhere)
```

## Editing without code

Every editable string, painting, colourway and price lives in one of two
files (`src/data/content.ts` and `src/data/paintings.ts`) and is clearly
marked with `[TBD]` where things still need to be filled in.

See **`EDITING.md`** for the full guide.
