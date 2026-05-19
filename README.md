# The Art of Stephen Meakin

A tribute and catalogue of the life's work of mandala artist and Sacred
Geometer Stephen Meakin (SEM, b. 1966), built as a static site.

## Site structure

- **`/`** — Scroll-trigger video intro → Welcome (the *"orbiting a Sun Star"* opening)
- **`/collections`** — The three collections: Habundia, Genesis, Born in the Sky
- **`/collections/:id`** — A single painting with colourway selector, story and acquire panel
- **`/about`** — Stephen's full biography, the Anegada beach moment, Phoenix Place / TAGA / legacy, the letter to every student
- **`/privacy`** & **`/terms`** — placeholder legal pages (replace before going live)
- **`*`** — 404 page

## Stack

React 19 + TypeScript + Vite + React Router. No backend, no database.
All content is in plain `.ts` files under `src/data/` — see
**`EDITING.md`** for the editing guide.

## Local dev

```bash
npm install
npm run dev    # localhost:5173
npm run build  # → dist/ (static, deploy anywhere)
```

## Deploy

A GitHub Actions workflow at `.github/workflows/deploy.yml` builds and
publishes the site to GitHub Pages on every push to `main` or to the
working branch. You can also drag `dist/` into Vercel, Netlify or
Cloudflare Pages.

## Editing without code

Every editable string, painting, colourway and price lives in one of
two files (`src/data/content.ts` and `src/data/paintings.ts`) and is
marked with `[TBD]` where things still need to be filled in (passing
date, Enneagon year, painting prices, sizing, framing).

See **`EDITING.md`** for the full guide.

## What's [TBD]

These were left blank intentionally — fill them in via the data files
when you're ready:

- `PASSING_DATE` in `src/data/content.ts`
- `year` on the Enneagon — The Swans painting in `src/data/paintings.ts`
- `sizing`, `framing`, `price`, `editionSize` on each colourway (none filled in yet)
- Social media URLs in `src/components/Footer.tsx`
- Privacy and Terms text in `src/pages/Legal.tsx`
