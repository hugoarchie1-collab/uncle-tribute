# The Art of Stephen Meakin — Project Source of Truth

A memorial tribute website and direct-to-buyer print shop for **Stephen Meakin** (SEM, 1966–2021), British mandala artist and sacred geometer. Built by his nephew on behalf of **The Mandala Company Foundation** (the estate, run by Steve's immediate family). Sells signed giclée print reproductions of his paintings direct from the site (via Stripe) and via Etsy.

This document is the project's running source of truth — paste it at the start of any new AI chat to skip a full re-explanation.

---

## Quick facts

| | |
|---|---|
| **Live URL** | https://uncle-tribute.vercel.app (migrating to https://themandalacompany.com once IONOS DNS is set up) |
| **Repo** | https://github.com/hugoarchie1-collab/uncle-tribute |
| **Production branch** | `main` (auto-deploys to Vercel on push) |
| **Working branch** | `claude/memorial-website-scroll-intro-a8VOZ` |
| **Hosting** | Vercel — project `uncle-tribute` |
| **Bank** | Tide UK — payout via ClearBank 04-06-05 …3798 |
| **Contact** | info@themandalacompany.com |
| **Owner** | Hugo Archie Wedge (hugoarchie1@gmail.com) |
| **Stripe account rep** | Polly Wedge (Hove address on file) |

---

## ⚠️ Current live state (read this first)

The Stripe **Order Print** button is in active debug as of this handoff:

- PR #57 added the integration (deployed)
- PR #59 fixed TypeScript compile errors (deployed)
- PR #60 made the function self-contained and removed the `product_data.images` fetch that was probably hanging the call (deployed but **not yet verified by the owner**)

**First task for any continuing AI:** ask Hugo to hard-refresh a painting page and try clicking *Order print*. If it redirects to Stripe Checkout in 1-2 seconds, the integration works. If it still hangs on "Opening checkout…" or shows a network error, check Vercel function logs (Vercel dashboard → Deployments → latest → Functions → /api/checkout → Logs) for the actual error message.

Everything else on the site is shipped and working.

---

## Commands

```bash
npm install            # install deps (first time / after lockfile changes)
npm run dev            # local dev server at http://localhost:5173
npm run build          # tsc + vite build → outputs to dist/
npm run lint           # ESLint
npm run preview        # preview the production build locally
```

Vercel auto-deploys on push to `main`. Preview deployments fire for every PR.

To test serverless functions locally you'd need `vercel dev` (Vercel CLI) — not currently set up.

---

## Quick-reference dashboards

| Tool | URL |
|---|---|
| Vercel project | https://vercel.com/the-mandala-company/uncle-tribute |
| Stripe dashboard | https://dashboard.stripe.com |
| Tide app | https://www.tide.co (mobile app for sort code / account number) |
| Point 101 (print fulfilment) | https://point101.com |
| GitHub repo | https://github.com/hugoarchie1-collab/uncle-tribute |
| Web3Forms (optional, for real form POST backend) | https://web3forms.com |
| IONOS (custom domain registrar) | https://my.ionos.co.uk |

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript + Vite 8 |
| Routing | React Router 7 (BrowserRouter, SPA) |
| Styling | Tailwind CSS 3 (custom config in `tailwind.config.ts`) |
| Display font | Playfair Display (Google Fonts, italic + black weights) |
| Body font | Inter |
| Animation | Framer Motion 12 |
| Hosting | Vercel (static SPA + serverless functions in `/api`) |
| Payments | Stripe Checkout (hosted) + Stripe Webhooks |
| Images | WebP with JPG fallback via `<picture>` (60+ JPGs all pre-converted) |
| Smooth scroll | Native browser only — **don't add Lenis** (tried, removed, broke things) |

---

## Brand & design system

**Colours** (Tailwind extended palette):
- `bg.DEFAULT` `#0a0908` — deep near-black background
- `ink.DEFAULT` `#ede6d6` — cream body text
- `accent.DEFAULT` `#c97844` — warm orange, used sparingly for eyebrows + the period in "Sacred Geometry."

**Typography**:
- Display: Playfair Display, font-black, tracking-[-0.04em], `clamp()` sizes up to 540px (Sacred Geometry finale)
- Body: Inter, normal weight, generous line-height (1.7–1.8)
- Eyebrows: `font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-accent`

**Imagery treatment**:
- Soft-edge masks on full-bleed images (`.soft-edge`, `.soft-edge-y` in global.css)
- `.hero-text-shadow` utility for headline legibility on photo backdrops
- Film grain texture overlay (fixed, z-100, opacity 0.045, `mix-blend-mode: overlay`)
- Peacock backdrop crossfade on Welcome (3 colourways, scroll-driven via `useScroll`)

---

## Routes

```
/                            Welcome (9-section home, video intro + scroll experience)
/collections                 Browse all 3 collections (Habundia, Genesis, Born in the Sky)
/collections/:id             Painting detail (colourway picker + Order print button)
/about                       Long-form bio (Anegada chapter, TAGA, students letter)
/privacy, /terms             Legal placeholders
/order/success?session_id=…  Post-checkout confirmation
/order/cancel                Abandoned-checkout landing
*                            NotFound
```

---

## Welcome page sections (in scroll order)

1. **Video intro** — sticky 100vh boomerang video, dissolves into hero (only 5% bottom fade)
2. **Hero** — "So here we are on Earth — orbiting a Sun Star at about 67,062 miles an hour" (Stephen's words). Wild Rose painting on the easel on right. CTAs: Explore collections / Our story
3. **Meet Stephen** — portrait + IN STEVE'S OWN WORDS… eyebrow + opening bio
4. **Studio** — full-bleed cinematic image
5. **Featured Works** — 3×2 grid of signature paintings linking to detail pages
6. **Each painting is a ritual** — Craft scrim card with process narrative + materials grid
7. **Sacred Geometry — four traditions** — 4-card grid (Insular Island / Rose Windows / Persian / Tibetan)
8. **Arista SunStar** — text-left, framed photo right (the 3.6m commission for Farmacy Notting Hill)
9. **The Estate** — Prints + Foundation engagement cards (open EnquireModal)
10. **Sacred Geometry (Earth)** — finale: giant display type with Earth horizon brushing the descender of "Geometry"

(Section 7 = Mandalas Wall and section 9 = Three Collections were both cut — kept their assets on disk for future use, e.g. About page.)

---

## Data files (single source of truth)

### `src/data/content.ts`
- `WELCOME` — hero quote, reminder, invocation, bio paragraphs
- `ABOUT` — full About page (opening, earlyLife, anegada, legacy, academyQuote, palestine, studentsIntro, studentsLetter)
- `PASSING_DATE` `"2021"`

### `src/data/paintings.ts`
- `PAINTINGS` — array of 10 paintings (id / title / year / collection / description / colourways / optional artistQuote / location)
- `COLLECTIONS` — 3 collections (habundia, genesis, born-in-the-sky) with backdrop image paths
- `DEFAULT_PRINT` — placeholder price (£180 = 18000 pence) + size for prints
- Helpers: `getPaintingById`, `getPrintPricePence`, `getPrintSize`, `formatGBP`, `ORIGINAL_PRINT_SPEC`, `COLOURWAY_NOTE`

**Painting IDs:**
```
wild-rose, english-bluebells, orchis-7, flower-of-life, slipper-orchids,
peacock-minerva, ophiuchus, tridecagon-moon-star, lulin, enneagon-swans
```

Each painting has multiple `colourways` (e.g. Wild Rose has Sussex Pink + Deep Forest Red). One is marked `isOriginal: true`.

---

## Components

| Component | Purpose |
|---|---|
| `Nav` | Sticky header, mobile-responsive padding |
| `Footer` | 3-col footer with site links + studio info + email |
| `Logo` | Rose-mark SVG, wordmark hidden on mobile |
| `VideoIntro` | Sticky 100vh boomerang, dissolves on scroll |
| `Reveal` | Framer Motion fade-up on scroll-into-view |
| `ImageReveal` | Parallax + soft-edge image, wraps in `<picture>` for WebP |
| `AssetImage` | Drop-in `<img>` replacement that wraps in `<picture>` |
| `MagneticLink` | Cursor-following hover on key links |
| `EnquireModal` | Cinematic enquiry form (mailto fallback + Web3Forms-ready) |

---

## Stripe print sales — architecture

```
Painting page → "Order print" button → fetch POST /api/checkout
                                       ↓
                  Vercel serverless creates Stripe Checkout session
                                       ↓
                       returns checkout URL → browser redirect
                                       ↓
                       Stripe-hosted checkout (card + address)
                                       ↓
            Stripe → buyer receipt email + seller notification email
                                       ↓
                  /api/stripe-webhook (signed) logs the order
                                       ↓
                  Owner manually places print order on Point 101
                                       ↓
                  Stripe payout (weekly Monday) → Tide bank
```

### Serverless functions

- **`api/checkout.ts`** — creates Stripe Checkout Session. **Self-contained** (no cross-directory imports — Vercel's bundler struggles with imports outside `/api`). Allowlist of valid painting IDs + title map embedded. £180 flat default price (placeholder).
- **`api/stripe-webhook.ts`** — verifies signature with `STRIPE_WEBHOOK_SECRET`, logs `checkout.session.completed` events to Vercel function logs with buyer name + address + painting metadata.

### Shipping (flat rates hardcoded in `api/checkout.ts`)
- UK: £15
- Europe: £35
- Worldwide: £60

### Required Vercel env vars
(Settings → Environment Variables, all for Production + Preview, Sensitive ON for secrets)

| Key | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `SITE_URL` | `https://uncle-tribute.vercel.app` |

### Stripe dashboard config (already done)
- Account activated, Mandala Company entity
- Tide added as payout bank (ClearBank 04-06-05 …3798), weekly Monday payout
- Webhook endpoint `https://uncle-tribute.vercel.app/api/stripe-webhook` listening for `checkout.session.completed`
- Statement descriptor: `THE MANDALA COMPANY` / shortened `MANDALA`
- Customer support phone on file
- **Stripe Tax: OFF** (under £90k UK VAT threshold)
- **Stripe Climate: OFF** (revisit if desired; can donate to a UK environmental charity directly for tax-deductible benefit instead)
- Notifications → successful payment email → info@themandalacompany.com

### Fulfilment — Point 101
Point 101 is a high-end UK giclée print atelier (no API). When an order email arrives:
1. Log into Point 101
2. Place a print order with the buyer's shipping address (from the Stripe order notification)
3. Point 101 prints + ships

Lead time advertised to buyers: 7–10 working days.

---

## Etsy

Etsy is a **parallel** sales channel — completely separate from the website's Stripe setup. To send Etsy earnings to the same Tide bank:
- Etsy → Settings → Finances → Payment account → set to the Tide Current account.
- Print sales then payout to Tide on Etsy's normal schedule.

---

## What's done

- Full website: Welcome / Collections / PaintingDetail / About / Legal / NotFound / Order success+cancel
- 9-section Welcome with cinematic video intro
- All paintings + colourways + descriptions populated from source PDFs
- WebP image performance pass (every JPG has a WebP sibling, served via `<picture>`)
- Mobile pass at 375 / 414 / 768 / 1440 widths (verified via Playwright screenshots)
- Favicon (cream emblem visible on dark and light browser tabs)
- Meta tags + OpenGraph for social sharing (og-image.jpg 1200×630)
- JSON-LD Person schema for SEO
- Sitemap.xml + robots.txt
- Film grain texture overlay
- Email contact wired (info@themandalacompany.com) via mailto + EnquireModal
- Stripe Checkout serverless integration (currently deployed; debugging the live POST hang)
- Privacy/Terms placeholder pages
- Logo pack (rose emblem) in 6 PNG variants + SVG

---

## What's pending / next

1. **Verify Stripe Checkout works end-to-end** — last action was deploying a self-contained `api/checkout.ts` rewrite to fix an "Opening checkout…" button hang
2. **IONOS → Vercel custom domain setup** for `themandalacompany.com`
3. **Update `SITE_URL` env var + Stripe webhook endpoint URL** to the new domain once DNS works
4. **Real print prices** from Hugo's spreadsheet (currently £180 placeholder in `DEFAULT_PRINT` + `api/checkout.ts DEFAULT_PRICE_PENCE`)
5. **Point 101 account** + upload Stephen's high-res files
6. **Etsy → Tide payout** (set bank in Etsy Finances)
7. **About page polish** — `/public/img/welcome/04-paintings-collection.jpg` is kept on disk specifically for an About-page section we discussed but haven't built
8. **Optional: Web3Forms backend for EnquireModal** — currently falls back to mailto + clipboard; add `VITE_WEB3FORMS_KEY` env var to enable real POSTed form submission

---

## Repo structure

```
/api                          Vercel serverless functions
  checkout.ts                 Stripe Checkout session creator (SELF-CONTAINED)
  stripe-webhook.ts           Stripe webhook receiver (signed)

/public
  /img
    /paintings                Painting cover images (each JPG has matching WebP)
    /welcome                  Hero / studio / portrait / SunStar (JPG + WebP)
    /about                    About-page imagery (JPG + WebP)
    /scenes                   Collection backdrop scenes + Earth cutout PNG
    /art                      Misc art assets
  /logo                       Rose-mark SVGs + PNG renders (6 variants)
  /video                      intro.mp4 + poster.jpg / poster.webp
  favicon.svg
  og-image.jpg
  robots.txt
  sitemap.xml

/src
  /components                 Reusable UI (Nav, Footer, Reveal, ImageReveal, etc.)
  /data
    content.ts                WELCOME + ABOUT text
    paintings.ts              PAINTINGS + COLLECTIONS + DEFAULT_PRINT + helpers
  /lib
    asset.ts                  asset() URL helper + webp() extension swap
    cn.ts                     classnames helper
    usePageTitle.ts           document.title hook
  /pages                      Route components (Welcome, Collections, etc.)
  /styles
    global.css                Base layer, film grain, video intro masks

/index.html                   Meta tags + font preload + JSON-LD
/vercel.json                  Rewrite + cache headers (api/* EXCLUDED from SPA rewrite)
/tailwind.config.ts           Custom palette, fonts, clamp() text sizes
/package.json                 Deps: react 19, vite 8, framer-motion 12, stripe, tailwind 3
```

---

## Key conventions

- **Pence not pounds** — all prices in `DEFAULT_PRINT.pricePence` are integer pence. `formatGBP(18000)` → `"£180.00"`.
- **Painting IDs must match** between `src/data/paintings.ts` and `api/checkout.ts` allowlist. When adding a painting, update **both**.
- **Image paths always reference `.jpg`** in code — the `<picture>` wrapper swaps to `.webp` automatically. Don't reference `.webp` directly in `<img src>`.
- **Section comments are numbered** in `Welcome.tsx` (e.g. `{/* 4 · FEATURED WORKS */}`) — renumber if reordering sections.
- **Sensitive Vercel env vars** are write-only after save. Keep a copy of `sk_live_…` and `whsec_…` in 1Password / a secure note.

---

## Critical gotchas (debugged once — don't repeat)

1. **Don't add Lenis smooth scroll** — was added then removed. Broke `ScrollToTop` route-change behaviour and Framer Motion `useScroll` peacock backdrop.
2. **Don't use `text-shadow` on a per-character `SplitReveal` wrapper** — clips the shadow to each glyph's box, creates visible "blocky" backgrounds. The `SplitReveal` component was deleted; if reintroducing, apply shadow via `filter: drop-shadow` on the parent instead.
3. **Stripe `product_data.images` in checkout sessions** — synchronously fetched by Stripe before returning the session URL. If the image URL is slow / unreachable from Stripe's side, the whole call hangs. Currently disabled in `api/checkout.ts`. Re-add only via Stripe-hosted product images, not raw image URLs.
4. **API functions in `/api`** — `vercel.json` rewrite uses negative lookahead `(?!api/)` to exclude `/api/*` from the SPA fallback. Don't simplify the rewrite to `/(.*)` — that breaks every serverless function.
5. **Cross-directory ESM imports into `/api`** are flaky on Vercel. Keep `/api/*.ts` files self-contained.
6. **Stripe API version literals** like `"2025-09-30.clover"` may not match the installed SDK's exported type union. Omit `apiVersion` and let the SDK use its pinned default.
7. **Sacred Geometry headline** uses `clamp(60px, 20vw, 520px)` for the font size. Earth image uses a negative margin tied to the *same* clamp expression so overlap stays proportional at every viewport. If editing one, edit the other.
8. **Z-stacking on the home page** — `<main>` carries `isolate` and Sacred Geometry section also carries `isolate` to prevent Framer Motion transforms from re-ordering the peacock backdrop into the foreground during scroll.

---

## How to continue work in a new chat / different AI tool

1. Paste this entire document at the top of the new conversation
2. State the specific task you want done + link any relevant screenshots
3. If the AI doesn't have GitHub MCP tools (e.g., generic ChatGPT), it can still draft code changes — ask Hugo to push the branch and merge PRs manually via github.com
4. The repo is the source of truth — re-read `src/data/paintings.ts` and `src/pages/Welcome.tsx` for current state if anything in this doc is stale

---

_Last updated: 2026-05-27 (handoff document creation). Keep this file in sync with major architectural changes; line-level bug fixes don't need updates here._
