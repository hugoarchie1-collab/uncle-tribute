# The Art of Stephen Meakin — Project Source of Truth

A memorial tribute website and direct-to-buyer print shop for **Stephen Meakin** (SEM, 1966–2021), British mandala artist and sacred geometer. Built by his nephew on behalf of **The Mandala Company** (the estate, run by Steve's immediate family — Mandala Company is a trading name, not a registered Foundation or charity). Sells signed giclée print reproductions of his paintings direct from the site (via Stripe) and via Etsy.

This document is the project's running source of truth — paste it at the start of any new AI chat to skip a full re-explanation.

---

## Quick facts

| | |
|---|---|
| **Live URL** | https://themandalacompany.com (canonical, live on IONOS→Vercel DNS) — https://uncle-tribute.vercel.app still resolves as the Vercel fallback |
| **Repo** | https://github.com/hugoarchie1-collab/uncle-tribute |
| **Production branch** | `main` (auto-deploys to Vercel on push) |
| **Working branch** | `claude/memorial-website-scroll-intro-a8VOZ` |
| **Hosting** | Vercel — project `uncle-tribute` |
| **Bank** | Tide UK (sort code + account in Hugo's 1Password) |
| **Contact** | info@themandalacompany.com |
| **Owner** | Hugo Archie Wedge (hugoarchie1@gmail.com) |
| **Stripe account rep** | Polly Wedge (Hove address on file) |

---

## ⚠️ Current live state (read this first)

The Stripe **Order Print** → Checkout flow is **verified working** (Hugo confirmed the live redirect on 2026-05-29). The earlier `product_data.images` hang (PRs #57/#59/#60) is resolved — don't re-add raw image URLs to the checkout session (gotcha #3).

**As of 2026-05-30 the working tree is clean and everything is shipped to `main` (in sync with origin — nothing in-flight, nothing mid-debug).** The features the previous note listed as uncommitted have all landed:
- Book of Memories (`/memories`) — live, now **auto-publishing** (see below)
- Journal (`/journal`, `/journal/:slug`) — live
- Admin "mark as shipped" form (`/admin/order-shipped.html`) — live

**Biggest architecture change since the last sync — Memories is no longer "moderated by deploy".** `/api/memories-submit` now MODERATES each submission (OpenAI omni-moderation, with a built-in slur/spam blocklist fallback when `OPENAI_API_KEY` is absent) and AUTO-PUBLISHES clean, image-free text to **Vercel KV** so the wall updates instantly. Images always HOLD for the family's one-tap OK (emailed as an attachment, placed by hand). The file-based `src/data/memories.ts` array is now a *seed/fallback* the page merges under the KV-published entries. The family is still emailed on every submission. The moderation + KV store + notification email are inlined directly in `/api/memories-submit.ts` (no shared module — gotcha #5).

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
| Display font | Fraunces (Google Fonts variable: `opsz 9..144`, `wght 400/600/700`, true italic at 400/600). 700 is the bold, screen-filling FINALE display weight — real, never synthesised (`font-synthesis: none` is set, so any unloaded weight fails visibly instead of faux-rendering). NOT Playfair. |
| Body font | Hanken Grotesk (`400/600`). NOT Inter. |
| Animation | Framer Motion 12 |
| Hosting | Vercel (static SPA + serverless functions in `/api`) |
| Payments | Stripe Checkout (hosted) + Stripe Webhooks |
| Images | WebP with JPG fallback via `<picture>` (60+ JPGs all pre-converted) |
| SEO / meta | **`src/lib/headMeta.ts` — zero-dep direct-DOM head manager** (react-helmet-async REMOVED 2026-06-10: flaky-to-dead on React 19, every URL presented homepage meta to crawlers). Per-route `<title>` + meta + per-painting OG + Product/Breadcrumb JSON-LD via `src/components/Seo.tsx` (same props API); App-level `RouteHeadDefaults` resets non-Seo routes. Static index.html tags are MUTATED in place — never add a second canonical/og tag. ⚠️ Write-order contract documented in headMeta.ts (child-first layout effects + the `seoWroteFor` flag). |
| Analytics | `@vercel/analytics` — `<Analytics />` mounted once in App.tsx; cookieless, GDPR-friendly, no-ops until Web Analytics is enabled in the Vercel dashboard |
| Smooth scroll | Native browser only — **don't add Lenis** (tried, removed, broke things) |

---

## Brand & design system

**Colours** (Tailwind extended palette):
- `bg.DEFAULT` `#0a0908` — deep near-black background
- `ink.DEFAULT` `#ede6d6` — cream body text
- `accent.DEFAULT` `#c97844` — warm rust, used sparingly for eyebrows + the rust period in "Sacred Geometry." + the finale's horizon glow. **PaintingDetail is strictly monochrome** — no accent *text* there (eyebrows use the muted-ink `EYEBROW_MUTED`); accent is reserved for interaction states (focus/hover) sitewide.

**Typography** (Fraunces + Hanken Grotesk — two families, two weights each):
- Display: **Fraunces** (variable serif). The Sacred Geometry finale is a **BOLD, screen-filling, TWO-TIER closing statement** (live 2026-06-03, on top of the cinematic hero). **"Sacred geometry"** is the dominant title — TRUE Fraunces **700** at `font-variation-settings: "opsz" 48, "wght" 700`, `clamp(58px, 15vw, 232px)`, lineHeight 0.86, italic *geometry* — sitting **above** a deliberately ~4× smaller subordinate clause **"— the order beneath all things."** (`opsz 36 / wght 600`, `clamp(22px, 3.6vw, 58px)`) whose closing period is the one rust note (`#c97844`). It fills a `min-h-[100svh]` centered section. Below: a hairline rule, Stephen's verbatim words (italic `opsz 24`), and a quiet "Explore the collection →" text link. The background is ONLY the pink Mary-Pink peacock backdrop + a soft radial scrim for legibility on the rose sky — the Earth limb + rust horizon glow were **REMOVED 2026-06-03 (Hugo: "remove the green part… only the pink")** so the finale matches every other section's plain backdrop; **NO** Earth, **NO** rust glow, **NO** rose emblem, **NO** eyebrow, **NO** mandala-ring SVG. `font-synthesis: none` makes the 700 real, never faux. See gotcha #7 for the full finale invariant list.
- Body: **Hanken Grotesk**, normal weight, generous line-height (1.7–1.8)
- Eyebrows: `font-sans text-[11px] font-bold tracking-[0.32em] uppercase text-accent` (token `EYEBROW`); muted variant `EYEBROW_MUTED` (text-ink-muted) on PaintingDetail and quiet captions

**Imagery treatment**:
- Soft-edge masks on full-bleed images (`.soft-edge`, `.soft-edge-y` in global.css)
- `.hero-text-shadow` utility for headline legibility on photo backdrops
- Film grain texture overlay (fixed, z-100, opacity 0.045, `mix-blend-mode: overlay`)
- Peacock backdrop crossfade on Welcome (4 colourways — Persian Indigo → Blood-Moon Red → Moroccan Purple → **Mary Pink** `peacock-mary-pink-blur-v2.webp` (dusty rose), scroll-driven via `useScroll`; the rose closes the page under the finale)

---

## Routes

```
/                            Welcome (10-section home, video intro + scroll experience)
/collections                 Browse all 3 collections (Habundia, Genesis, Born in the Sky)
/collections/:id             Painting detail (colourway picker + Add to basket / Buy now). Accepts an optional `?c=<colourway name>` deep-link — featured-grid / catalogue tiles pass the colourway they show so the page opens on THAT colourway, not the original (matched case-insensitively; falls back to original).
/for-you                     "Find a print" guided chooser (/quiz 301-redirects here)
/about                       Long-form bio (Anegada chapter, TAGA, students letter, "The body of work" image section)
/memories                    Book of Memories — moderated wall of memories + "leave a memory" form
/news                        News & releases — Beeper-style estate calendar (upcoming collection/single "drops", announcements, exhibitions, TAGA workshop, events). Reads src/data/news.ts. In primary Nav + Footer. IntroFilmHeader + Seo. (NEW 2026-06-04)
/trade                       Interior designers / art consultants enquiry page (price-silent)
/gift                        Gift e-vouchers — size-priced denominations or custom £25–£5,000
/verify                      Certificate verification — looks a COA number up in the hand-curated edition ledger (src/data/editions.ts). Linked from ProvenancePanel + FAQ. (NEW 2026-06-10)
/basket                      Multi-item basket (localStorage; ?restore=<payload> rebuilds it cross-device) + Proceed to checkout
(REMOVED: /journal, /journal/:slug, /photo-book — pages + data deleted; do not re-document)
/contact                     Full-page contact form (same submission path as EnquireModal)
/faq                         8-section frequently asked
/privacy                     UK GDPR Art 13–14 privacy policy (updated 2026-05-28)
/terms                       Terms of sale (UK CCR 2013 reg 28 made-to-order exemption)
/returns                     Returns, refunds & damages (plain-English summary)
/order/success?session_id=…  Post-checkout confirmation (clears basket on mount)
/order/cancel                Abandoned-checkout landing
*                            NotFound
```

---

## Welcome page sections (in scroll order)

1. **Video intro** — sticky 100vh boomerang video, dissolves into hero (only 5% bottom fade)
2. **Hero** — "So here we are on Earth — orbiting a Sun Star at about 67,062 miles an hour" (Stephen's words). Wild Rose painting on the easel on right. CTAs: Explore collections / Our story
3. **A reminder** — NEW 2026-06-04. The hero now carries only a tight verbatim lead (`WELCOME.reminderLead`); this dedicated bold editorial section runs Hugo's full five-paragraph "reminder" passage VERBATIM (mapped from `WELCOME.reminderLong[]` in content.ts — never re-typed in JSX). P1 leads large; P2–P4 in a two-column measure on lg+; P5 lands after a hairline as a two-tier Fraunces close (dominant sentence + smaller subordinate clause, one rust period) echoing the finale. Over the shared peacock backdrop; Fraunces opsz held ≤48; whole-element Reveals. (The ONLY normalisation to the supplied copy was "Steven"→"Stephen".)
4. **Meet Stephen** — portrait + IN STEVE'S OWN WORDS… eyebrow + opening bio
5. **Studio** — full-bleed cinematic image
6. **Featured Works** — 3×2 grid of signature paintings linking to detail pages
7. **Each painting is a ritual** — Craft section, transparent over the peacock backdrop like every other section (the near-opaque `bg-[rgba(10,9,8,0.88)]` dark scrim card was removed 2026-06-03 — it read as a hard black rectangle that broke the smooth pink wash), with process narrative + materials grid
8. **Sacred Geometry — four traditions** — 4-card grid (Insular Island / Rose Windows / Persian / Tibetan)
9. **Arista SunStar** — text-left, framed photo right (the 3.6m commission for Farmacy Notting Hill)
10. **The Estate** — Prints + Friends-of-the-estate engagement cards (open EnquireModal) + `NewsletterSignup variant="panel"` mounted below the cards
11. **Sacred Geometry (closing statement)** — finale: **BOLD, screen-filling, TWO-TIER statement (live 2026-06-03, layered on top of the cinematic hero).** A `min-h-[100svh]` centered `flex items-center` section: **"Sacred geometry"** is the dominant title (Fraunces 700, `opsz 48`, `clamp(58px,15vw,232px)`, italic *geometry*) sitting ABOVE a deliberately ~4× smaller subordinate clause **"— the order beneath all things."** (`opsz 36 / wght 600`, `clamp(22px,3.6vw,58px)`, rust period) — Hugo's direction: "Sacred geometry needs to be larger than the order beneath all things." → hairline → Stephen's verbatim "everything is connected" (italic `opsz 24`, cite SEM) → a quiet "Explore the collection →" link. Background is the home's 4-colourway peacock crossfade closing on **Mary Pink** (`peacock-mary-pink-blur-v2.webp`, dusty rose); a soft radial scrim grounds the type — the **Earth limb + rust horizon glow were REMOVED 2026-06-03** (Hugo) so the finale shows ONLY the pink backdrop, matching the rest of the home. **NO** Earth, **NO** rust glow, **NO** rose emblem, **NO** eyebrow, **NO** mandala-ring SVG. `isolate` + `overflow-hidden` retained (gotcha #8); whole-element Reveals only (gotcha #2).

(Section 7 = Mandalas Wall and section 9 = Three Collections were both cut — kept their assets on disk for future use, e.g. About page.)

---

## Data files (single source of truth)

### `src/data/content.ts`
- `WELCOME` — hero quote, reminder, invocation, bio paragraphs. **2026-06-04:** added `reminderLead` (tight verbatim hero lead) + `reminderLong: string[]` (Hugo's full 5-paragraph "reminder" passage, displayed VERBATIM in the new home **A reminder** section — only normalisation was "Steven"→"Stephen"). The old short `reminder` field is kept (no longer rendered in the hero, which now binds `reminderLead`).
- `ABOUT` — full About page (opening, earlyLife, anegada, legacy, academyQuote, palestine, studentsIntro, studentsLetter)
- `PASSING_DATE` `"2021"`

### `src/data/memories.ts`
- `MEMORIES` — array of Book-of-Memories entries (`id` / `name` / optional `relationship` / optional `location` / `message`; `Memory` type exported alongside). **No longer the sole gate.** As of 2026-05-30 this array is the *seed / fallback* the `/memories` page renders **underneath** the live KV-published entries it fetches from `GET /api/memories-submit`. Submissions that pass moderation auto-publish to KV and appear instantly (see `/api/memories-submit` below); this file is for permanent / hand-curated entries and as the graceful fallback when KV isn't provisioned. The submission notification email still contains a ready-to-paste entry shaped exactly like these objects, so a held memory can be added here by hand. Newest at the top.

### `src/data/photobook.ts`
- `PHOTOBOOK` — array of personal photographs for the `/photo-book` gallery (`src` / `alt` / optional `caption` / `year`; `PhotoBookImage` type). Empty until Hugo pastes the photo-book screenshots under `/public/img/photobook/`; the page shows a dignified coming-soon state meanwhile. The gallery uses a plain lazy `<img>`, so any format (JPG/PNG/WebP) works without a WebP sibling.

### content.ts memorial constants
- `BIRTH_DATE` `"2 March 1966"`, `DEATH_DATE` `"12 December 2021"`, `LIFE_DATES` (the en-dash range), `MEMORIAL_QUOTE` (Stephen's "everything is connected" words), and `TRIBUTE` (Polly Wedge's funeral tribute — `eyebrow` / `paragraphs[]` / `attribution`). Surfaced in the About "In loving memory" section. PASSING_DATE stays the YEAR for the 1966–2021 ranges. ⚠️ Four phrases in `TRIBUTE.paragraphs` are kept verbatim pending Polly's confirmation of the exact wording (see the comment block in content.ts) — do not invent replacements.

### `src/data/news.ts` (NEW 2026-06-04)
- `NEWS` — array of `NewsEntry` for the `/news` "estate calendar" (Beeper-style changelog feed). Fields: `id` / `type` (`release` | `announcement` | `exhibition` | `workshop` | `event`) / optional `kind` (`collection` | `single`, releases only) / `status` (`next` | `soon` | `recent`) / `title` / `displayDate` (HUMAN, e.g. "Coming soon" — never a fabricated firm date) / optional `isoDate` / `summary` / optional `cover` (release album-cover; **.jpg** path under /img/paintings, AssetImage swaps webp — stems are NOT always `<id>-<colourway>`, see the file header) / optional `location` / `ctaLabel` + `ctaTo` (`#notify` scrolls to the foot Friends & Family sign-up; a real route links out). Helpers: `STATUS_ORDER`, `STATUS_META`, `TYPE_LABEL`, `pillLabel`, `NEWS_FILTERS`, `isRelease`, `getFeaturedEntry`, `groupByStatus`. Seeds are honest family-editable PLACEHOLDERS (no fabricated venues/dates, no weaponised scarcity). Rendered by `src/pages/News.tsx`.

### `src/data/journal.ts`
- `JOURNAL` — array of writings-archive articles (`slug` / `title` / `excerpt` / optional `kind` / `date` / `isoDate` / `author` / `body: string[]` / `pullQuote` / `coverImage` / `draft`; `JournalArticle` type exported). Newest first. **The SEO layer**: each article is a real indexable page (`/journal/:slug`) with its own meta + Article JSON-LD — the fix for the SPA being near-invisible to crawlers. `draft: true` hides an article from the index AND 404s its route, for safe staging. Helpers: `publishedArticles`, `getPublishedArticle`, `articleAuthor` (defaults byline to the estate), `readingMinutes`. File header carries a paste-ready authoring template. Seeded with one estate-written intro + one draft template.

### `src/data/paintings.ts`
- `PAINTINGS` — array of 10 paintings (id / title / year / collection / description / colourways / optional artistQuote / location)
- `COLLECTIONS` — 3 collections (habundia, genesis, born-in-the-sky) with backdrop image paths
- `PRINT_TIERS` — **canonical price ladder** (display labels renamed 2026-06-01 for pricing psychology; **prices/editions/sizes UNCHANGED**, internal tier ids unchanged): **Gallery Edition** A3 £245 (id `atelier`, now a LIMITED edition of 150 — was open) / **Collector's Edition** A2 £450 anchor (id `collector`, ed. 100) / **Atelier Edition** A1 £850 (id `atelier-grande`, ed. 50) / **Heirloom Edition** A0 £1,750 (id `heirloom`, ed. 25, hidden until A0 fulfilment confirmed) / **Original — One of One** (id `studio`, £2,450 unique hand-painted — **HIDDEN 2026-06-03 via `available:false`, like Heirloom: Hugo isn't selling unique originals until their value rises. The `api/checkout.ts` `studio` pricing row is deliberately kept intact so a stale client posting `tierId=studio` can't crash checkout; the FAQ £2,450 sentence was removed too**). [Ladder rethought 2026-06-02 — research-backed uplift; was £145/£295/£595/£1,250/£950.] Each A2/A1 tier carries `framingPricePence` (£295/£395) and `embellishmentPricePence` (£350/£495) for the two paid add-ons. Source of truth for site-side pricing. Labels mirror into `api/checkout.ts` + `api/stripe-webhook.ts` (gotcha #9).
- `ESTATE_AUTHENTICATION` — single source for stamp / numbering / COA / printer copy. Surfaces on PaintingDetail, Basket, and the OrderConfirmation email. Updated 2026-05-28: copy says "The Mandala Company" (NOT "The Mandala Company Foundation" — it's a trading name, not a registered Foundation).
- `ORIGINAL_PROVENANCE` — single dignified line surfaced on PaintingDetail's key-fact dl ("Original · Held privately by the estate — the original is not currently for sale."). The originals are kept in the family's legal name and aren't for sale.
- `EMBELLISHMENT_NOTE` — copy for the hand-finishing add-on (Polly Wedge finishes A2/A1 prints by hand; **allow up to 2 weeks** — reduced from 4 weeks 2026-06-04 at Hugo's request, kept consistent across FAQ, `PaintingDetail.tsx` `FINISH_LEAD_WEEKS`, and `Legal.tsx`). Mirrored into the inline order-confirmation email in `api/stripe-webhook.ts`.
- `DEFAULT_PRINT` — legacy default (now £450, mirrors the anchor tier). Kept for the home page "from £…" chip and any straggling callers.
- Helpers: `getPaintingById`, `getPrintTiers`, `getAnchorTier`, `getFramingPricePence`, `getEmbellishmentPricePence`, `getPrintPricePence` (legacy), `getPrintSize` (legacy), `formatGBP`, `ORIGINAL_PRINT_SPEC`, `ORIGINAL_PROVENANCE`, `EMBELLISHMENT_NOTE`, `COLOURWAY_NOTE`

**Pricing mirror**: `api/checkout.ts` carries a `TIERS` map that mirrors `PRINT_TIERS` (gotcha #5 forbids cross-directory imports into `/api`). `api/stripe-webhook.ts` also carries small per-tier label / price / size / edition lookups for the OrderConfirmation email — these now include the `studio` row (£2,450 one-off) so a Studio purchase renders the correct label/size/edition/price. When updating a tier price, update **all three** in the same commit — see gotcha #9.

**Collection-bundle discount mirror**: `getCollectionBundle` in `paintings.ts` advertises the SAME discount the checkout applies, derived from the painting count via `bundleDiscountPercentForCount(count)` = `count >= 3 ? 10 : 5` — mirroring `api/checkout.ts`'s coupon (5% at 2 items, 10% at 3+). So a 2-painting collection (Habundia) advertises 5% (NOT a flat 10%) and the card's save/net equals the Stripe charge. Keep the two in sync (part of gotcha #9).

**Deeper bundle discounts — content-derived, mirrored into `/api` (2026-05-29 pricing research).** Two flagged set bundles sit above the count ladder, depths chosen to maximise total profit (COGS is only ~10–12% of retail, so the discount is a demand lever kept prestige-safe at ≤15%, escalating with set size):
- **Colourway-set bundle** (`getColourwaySetBundle` → `COLOURWAY_SET_DISCOUNT_PERCENT = 12`, surfaced as the "complete colourway set" card on PaintingDetail): every available colourway of ONE painting at the anchor A2 tier, **12% off** (paintings with <2 available colourways show no card).
- **Complete-catalogue bundle** (`getCompleteCatalogueBundle` → `COMPLETE_CATALOGUE_DISCOUNT_PERCENT = 15`, surfaced as "The complete catalogue" panel at the foot of `/collections`): one anchor A2 print of EVERY painting, **15% off**, framed as a dignified set price with the individual total as a quiet anchor + the saving in absolute £ (never a "% OFF" badge).

These are NOT count-based, so `api/checkout.ts` now derives the percent from the basket CONTENTS via `bundlePercentOff(items)`: all lines one painting → 12%; one line of every painting (distinct ids === `CATALOGUE_PAINTING_COUNT`) → 15%; else the count ladder (3+ → 10%, 2 → 5%). The "add the set / add the catalogue" buttons push exactly the lines that trigger the matching percent, so advertised price == Stripe charge by construction. **Mirror obligation (gotcha #9):** the 12% and 15% live in BOTH `paintings.ts` (the constants) and `api/checkout.ts` (`bundlePercentOff`) — change them together. (This supersedes the earlier choice to keep the colourway set on the plain count ladder with no `/api` change.)

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
| `Nav` | Header with logo + links (Home · Collections · For You · About · Memories · Contact) + basket badge, mounts `ReturningVisitorChip`. `sticky top-0` by default; pass `overlay` to make it `fixed` (floats over the intro film, with a top scrim for legibility — used via `IntroFilmHeader`). Inline links show at `xl`+; hamburger below `xl`. **Mobile menu redesigned 2026-06-02** from the cramped sans dropdown panel (whose backdrop click-off was unreliable + "looked out of place") to a FULL-SCREEN brand takeover (`fixed inset-0 z-[60]`): rose emblem + close X up top, large centred Fraunces links, staggered entrance. Tapping ANYWHERE that isn't a link closes it (overlay `onClick`), as do the X / Escape / navigating. Focus-trap + scroll-lock retained. |
| `IntroFilmHeader` | The cinematic intro film (`VideoIntro`) as a page header + the overlay `Nav` floating above it. Drop-in replacement for a bare `<Nav />` on content pages so the intro can be reached by scrolling up from anywhere — used on Welcome, Collections, About, Journal, JournalArticle, Memories, Contact, FAQ, PhotoBook. NOT on transactional/utility pages (Basket, Order result, Legal, 404) or PaintingDetail. Collapses the film as the reader scrolls into content, driven by `lib/useHideOnScroll.ts` (reduced-motion safe). |
| `Footer` | 4-col footer with site links + studio info + email + `NewsletterSignup variant="footer"` |
| `Logo` | Rose-mark SVG, wordmark hidden on mobile |
| `VideoIntro` | Sticky 100vh boomerang, dissolves on scroll. Originally Welcome-only; now also the shared header element behind `IntroFilmHeader` on every content page. |
| `Reveal` | Fade-up on scroll-into-view. **Rewritten 2026-06-02** from framer `whileInView` to a RAW `IntersectionObserver` + an immediate on-mount in-view check, because framer's wrapper was leaving figures stuck at opacity 0 on iOS (the "image vanish" → tall BLACK GAPS that read as missing images). Now content can never get stuck hidden; the gentle CSS fade-up is preserved; reduced-motion / no-IO short-circuit to visible. `RevealStagger` is unchanged (still framer). |
| `ImageReveal` | Parallax + soft-edge image, wraps in `<picture>` for WebP |
| `AssetImage` | Drop-in `<img>` replacement that wraps in `<picture>` |
| `MagneticLink` | Cursor-following hover on key links |
| `EnquireModal` | Cinematic enquiry form (mailto fallback + Web3Forms-ready) |
| `NewsletterSignup` | "Friends of the estate" signup — three variants (`panel` on Welcome / About, `inline` on empty Basket, `footer` in the Footer column). POSTs to `/api/newsletter-subscribe`. Sets `localStorage.tasm.subscribed` on success. |
| `EmailMyBasket` | Inline "Save your basket — email it to me" link on the Basket page. POSTs to `/api/email-basket`. Renders nothing on empty basket. |
| `ExitSaveBasket` | Bottom-right exit-intent toast on the Basket page. Fires once per session on top-edge mouse exit (desktop only). Same endpoint as `EmailMyBasket`. |
| `ReturningVisitorChip` | "Welcome back, {name}" hairline in the Nav for returning subscribers. Once per session, then self-hides. |
| `ShareTheEstate` | Quiet post-purchase share row (Copy link · Email · Twitter · Facebook) on OrderSuccess. No referral tracking — just an introduction. |
| `Seo` | Per-route `<title>` + `<meta name="description">` + OG/Twitter overrides + optional `jsonLd` (schema.org) via `react-helmet-async`. PaintingDetail passes per-painting OG image (original colourway, absolute URL) + Product & BreadcrumbList JSON-LD. Title logic mirrors `usePageTitle` so output is identical. |
| `FooterCatalogue` | A single row of all 10 paintings (10×1 from `md` up; `hidden` below `md`), mounted above `<Footer />` on every page **except `/collections` and `/for-you`** (those pages already present the full catalogue, so the strip would be redundant — removed 2026-06-02 at Hugo's request). Tile basis is `flex-[0_1_calc(10%-9px)]` so all ten fit one line at every width from `md`. Lets a reader who scrolled to the bottom step sideways into any other piece without travelling back up to the nav. Whole-grid `whileInView` fade-up; reduced-motion renders statically. |

### Lib utilities

| Module | Purpose |
|---|---|
| `lib/asset.ts` | `asset()` URL helper + `webp()` extension swap |
| `lib/cn.ts` | classnames helper |
| `lib/usePageTitle.ts` | `document.title` hook — still used by Welcome / Basket / OrderResult / Legal / NotFound. Pages with richer SEO needs (PaintingDetail / Collections / About / FAQ / Contact) use `<Seo>` instead — **don't double-set titles** (a page uses one OR the other, never both) |
| `lib/seo.ts` | `SITE_URL` constant + `absoluteUrl()` / `pageTitle()` / `firstSentence()` helpers for the meta system |
| `lib/basket.ts` | localStorage-backed basket store + `useBasket()` hook (no Redux/Zustand) |
| `lib/useHideOnScroll.ts` | Boolean hook driving the intro film's hide-on-scroll behaviour in `IntroFilmHeader` (collapses the video header as the reader scrolls into content). Reduced-motion safe. |

---

## Stripe print sales — architecture

```
Painting page → "Add to basket"  → localStorage basket  → /basket → "Proceed to checkout"
                "Buy now"        → /api/checkout (single-item legacy path)
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
                  /order/success page clears the basket
                                       ↓
                  Owner manually places print order on Point 101
                                       ↓
                  Stripe payout (weekly Monday) → Tide bank
```

### Basket

- **Storage**: `localStorage` key `tasm.basket.v1`, persisted across reloads, synced across tabs via the `storage` event.
- **Implementation**: `src/lib/basket.ts` — tiny pub/sub + `useSyncExternalStore` `useBasket()` hook. No Redux/Zustand/Context.
- **Item shape**: `{ paintingId, colourwayName, addedAt }`. Quantity is always 1 per line — buying two of the same print is two separate lines.
- **Reconciliation**: on every read, lines pointing to a removed painting or an unavailable colourway are silently dropped (then re-persisted).
- **PaintingDetail buttons**: "Add to basket" (filled ink, primary) + "Buy now" (outlined accent, secondary — preserves the original single-item flow byte-for-byte).
- **Cleared**: in `OrderSuccess` mount effect (Stripe only redirects there on a successful payment).

### Serverless functions

- **`api/checkout.ts`** — creates Stripe Checkout Session. **Self-contained** (no cross-directory imports — Vercel's bundler struggles with imports outside `/api`). Allowlist of valid painting IDs + title map + **TIERS map mirroring `PRINT_TIERS`** embedded. Tier-aware: `tierId` selects a price ladder rung (defaults to `"collector"` anchor when missing — preserves existing client compat during deploy lag). Accepts two body shapes:
  - **Single-item** (legacy / "Buy now"): `{ paintingId, colourwayName, tierId?, framing? }`
  - **Multi-item** (basket): `{ items: [{ paintingId, colourwayName, tierId?, framing? }, ...] }` — up to 20 items per session

  **Framing**: optional `framing: true` on an A2 or A1 item creates a separate Stripe line item priced from the tier's `framingPricePence` (cleaner accounting + buyer sees framing explicitly). Silently ignored on tiers that don't offer framing.

  **Bundle discount**: `bundlePercentOff(items)` derives the percent from the basket CONTENTS — **15%** when one line of every painting is present (complete catalogue), **12%** when all lines are a single painting (complete colourway set), else **10%** on 3+ / **5%** on 2 — then mints a single-use Stripe coupon (`duration: "once"`, name "Estate bundle thank-you") applied via `discounts: [{ coupon: id }]`. Mirrors the `paintings.ts` discount constants (gotcha #9). Wrapped in try/catch; mint failures fall back to the un-discounted session (never block checkout). When a bundle discount is applied, `allow_promotion_codes` is omitted (Stripe disallows both together); without a bundle, promo codes stay enabled so the thank-you code remains redeemable.

  Single-item metadata keys preserved + extended with `tier_id`, `tier_label`, `framing`. Multi-item metadata adds `tier_ids`, `tier_labels`, `framing_flags` (comma-joined, truncated to Stripe's 500-char per-value cap).
- **`api/stripe-webhook.ts`** — verifies signature with `STRIPE_WEBHOOK_SECRET`. On `checkout.session.completed`: (1) logs the order to Vercel function logs, (2) mints a single-use Stripe coupon + promotion code (10% off, 1-year validity, prefix `FRIENDS-`), (3) sends the buyer the estate-branded order-confirmation email via Resend (BCC info@themandalacompany.com). **Always returns 200** even if email / coupon creation fail — Stripe must not retry on downstream errors. **Self-contained (gotcha #5):** the thank-you-code minter (`createThankYouCode`) and the order-confirmation email (an inline HTML-string builder, dark cream/ink/accent palette, order summary + authentication block + thank-you gift card + dispatch note) are inlined directly in this file — NOT imported. As of 2026-05-30 `@react-email/render` is no longer used by the API; emails are plain HTML strings.
- **`api/admin/order-shipped.ts`** — manual admin endpoint Hugo hits when a Point 101 dispatch goes out. Authenticated with `ADMIN_API_KEY` (Vercel env var). Body: `{ sessionId, trackingUrl, carrier, secret }`. Looks up the Stripe session (for buyer email + per-line metadata), renders an inline shipped-email HTML string and sends via Resend (BCC the estate inbox). Self-contained (gotcha #5). Example:
  ```bash
  curl -X POST https://uncle-tribute.vercel.app/api/admin/order-shipped \
    -H "Content-Type: application/json" \
    -d '{ "sessionId": "cs_live_…", "trackingUrl": "https://…", "carrier": "Royal Mail Tracked 48", "secret": "$ADMIN_API_KEY" }'
  ```
  A one-page HTML admin form now sits on top of this at **`/admin/order-shipped.html`** (static file in `public/admin/`, served outside the SPA — same-origin so the endpoint needs no CORS; `noindex` + `Disallow: /admin/` in robots.txt). Fields: session id, tracking URL, carrier, admin key (optionally remembered in localStorage). POSTs the same body the curl example shows.
- **Thank-you code minting** — each function that needs it inlines the logic: a per-order Stripe Coupon + PromotionCode pair (10% off, single use, 365-day validity; suffix 6 random chars from an unambiguous alphabet, no 0/O/1/I). Currently only `stripe-webhook.ts` mints these. (Was `api/_lib/thankYouCode.ts` before the gotcha-#5 self-containment.)
- **Email styling** — every inline email builder repeats the same small palette/style constants (cream `#ede6d6` / bg `#0a0908` / accent `#c97844`, Playfair + Inter stacks). No shared `styles` module — gotcha #5. (Was `api/_lib/emails/styles.ts`.)

### Thank-you discount — the dignified register

The estate sends a **single-use 10% promotion code** to every first-time buyer inside the order confirmation email — NOT a banner, popup, or "10% OFF" badge on the site. Framing: *"In thanks for being among the first to take one of Steve's prints into your home, please accept 10% towards a future print, with our warmth."* Valid for one year. Code shape: `FRIENDS-AB12CD`.

**Fallback**: if the dynamic coupon mint fails, the webhook falls back to a static reusable code (env var `THANK_YOU_CODE_FALLBACK`, default `FRIENDS`). For the fallback to actually grant a discount, Hugo must create a matching promotion code in the Stripe dashboard: Dashboard → Products → Coupons → New (10% off, "Once", no expiry) → attach a promotion code with that name. Otherwise leave the fallback unused — the dynamic path is the production design.

### Shipping — FREE worldwide (policy 2026-06-06)
The estate absorbs **all** delivery cost into the ~90% print margin, so every region ships **FREE**, framed or unframed. `api/checkout.ts` `buildShippingOptions` returns a single £0 rate per region (UK / Europe / Worldwide) — advertised == charged to the penny (mirror invariant, gotcha #9). All customer-facing surfaces say "Free delivery worldwide": PaintingDetail, Basket, ReassuranceRow, FAQ, Legal (Delivery + returns), and the save-your-basket email. There is **no** framed-shipping surcharge. (Was flat-rate UK £15 / Europe £35 / Worldwide £60 before 2026-06-06.) International buyers may still owe local import duties / VAT, set by their own customs authority — disclosed on Basket, FAQ and Legal.

### Required Vercel env vars
(Settings → Environment Variables, all for Production + Preview, Sensitive ON for secrets)

| Key | Required | Value |
|---|---|---|
| `STRIPE_SECRET_KEY` | yes | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | yes | `whsec_…` |
| `SITE_URL` | yes | `https://themandalacompany.com` |
| `RESEND_API_KEY` | optional | `re_…` — without it, confirmation emails are skipped silently (Stripe still sends its own receipt) |
| `ESTATE_FROM_EMAIL` | optional | sender address (default `info@themandalacompany.com`); must be on a Resend-verified domain |
| `ESTATE_BCC_EMAIL` | optional | BCC for the paper trail (default `info@themandalacompany.com`); auto-skipped if same as `from` |
| `THANK_YOU_CODE_FALLBACK` | optional | static code used if dynamic coupon mint fails (default `FRIENDS`) |
| `ADMIN_API_KEY` | required for `/api/admin/order-shipped` | shared secret Hugo passes in the request body to authenticate the shipped-email admin endpoint |
| `OPENAI_API_KEY` | optional (Memories) | `sk-…` for OpenAI omni-moderation of memory submissions. **Absent → fail-safe**: a built-in slur/spam blocklist moderates instead (clean text still auto-publishes; the API path just adds image moderation + nuance). |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | optional (Memories) | Vercel KV / Upstash Redis REST creds for the auto-published memories wall. `UPSTASH_REDIS_REST_URL` / `_TOKEN` are also accepted (the integration may inject either name). Absent → publishing is skipped, the page falls back to the committed `MEMORIES` array, family still emailed. |
| `VITE_META_PIXEL_ID` | optional (ads) | Meta Pixel id. **BUILD-time** var — set in Vercel then redeploy. The pixel is consent-gated (see "Marketing & tracking layer" below); absent → no pixel, zero console errors. |
| `VITE_GA4_ID` | optional (ads) | GA4 measurement id. **BUILD-time** var. gtag.js under Consent Mode v2 (defaults denied), consent-gated. Absent → no GA4. |
| `META_PIXEL_ID` + `META_CAPI_ACCESS_TOKEN` | optional (ads) | Server-side Meta **Conversions API** Purchase event from `api/stripe-webhook.ts` on `checkout.session.completed` (`event_id` = the Stripe session id; the browser deliberately does NOT fire Purchase — CAPI is the sole Purchase source, no double-count). Either absent → clean silent no-op. |
| `KLAVIYO_API_KEY` / `KLAVIYO_LIST_ID` | optional (CRM) | Klaviyo "Placed Order" events + newsletter list subscribe (wired 86257b8). Absent → silent no-op. |
| `VITE_KLAVIYO_COMPANY_ID` | optional (CRM) | Klaviyo PUBLIC site id for onsite klaviyo.js — **BUILD-time** var. Consent-gated browser events "Viewed Product" / "Added to Cart" / "Started Checkout" (src/lib/tracking.ts) — what makes abandoned-cart/browse flows fire. NOT the private API key. |
| (KV vars above) | optional (webhook) | The same `KV_REST_API_*` / `UPSTASH_*` creds also power DURABLE Stripe webhook event dedup (`stripe_evt:` keys, SET-NX, 24h TTL, fail-open to in-memory) — resolves old pending #11/P2 automatically once set. |

### Marketing & tracking layer (NEW 2026-06-10 — "Track A")

Everything is **env-guarded and consent-gated**, shipped dormant; it activates as Hugo supplies the IDs above. UK PECR-compliant by construction:

- **Consent**: `src/lib/consent.ts` — localStorage `tasm.consent.v1` `{marketing, decidedAt}`, pub/sub + `useConsent()` hook (basket-store pattern). `src/components/ConsentBanner.tsx` is a dignified house-styled bottom bar (z-[110]), rendered only while undecided; Footer has a quiet "Cookie preferences" link that clears the record and reopens the banner live. **NO marketing script loads or fires before an explicit accept** — declining loads nothing, absent IDs load nothing.
- **Pixels**: `src/lib/tracking.ts` — Meta Pixel + GA4 (Consent Mode v2, defaults denied→granted post-consent). Events: fbq `ViewContent`/GA4 `view_item` (PaintingDetail, once per painting id, anchor-tier value), fbq `AddToCart`/`add_to_cart` (both add handlers, selected-tier print price), fbq `InitiateCheckout`/`begin_checkout` (Basket proceed, pre-discount subtotal). **No browser Purchase event** — server CAPI only (dedup key = session id).
- **UTM first-touch attribution**: `src/lib/utm.ts` — captures `utm_*`/`gclid`/`fbclid` once into `tasm.utm.v1` (first touch wins, no consent needed — first-party, leaves the device only inside the buyer's own checkout request). Attached as optional top-level `utm` on every checkout POST; `api/checkout.ts` validates (string/trim/≤200 chars) and writes `utm_source…utm_landing` session metadata.
- **Abandoned-checkout recovery**: `api/checkout.ts` adds `after_expiration.recovery.enabled` + `consent_collection.promotions:"auto"` (with a one-shot retry WITHOUT those params if Stripe ever rejects them — additive params can never fail a sale). `api/stripe-webhook.ts` handles `checkout.session.expired`: sends ONE quiet "your basket is still held" email (inline HTML, house palette, zero pressure/discounts) ONLY when recovery URL exists + buyer email exists + `consent.promotions === "opt_in"` + Resend configured.
- **Cross-device saved basket**: `api/email-basket.ts` links to `/basket?restore=<base64url(JSON items)>` (≤1,800 chars, else bare `/basket` fallback); `src/lib/basketRestore.ts` decodes, validates every line against PAINTINGS/tiers, set-merges into `tasm.basket.v2` (writes storage directly + synthetic StorageEvent — do NOT loop `addItem`, it collides `addedAt` stamps), strips the param.
- **Google Merchant Center feed**: `scripts/merchant-feed.ts` + a Vite plugin in `vite.config.ts` emit `dist/merchant-feed.xml` (RSS 2.0 `g:` namespace, 100 SKUs = painting × available colourway × available tier, prices derived from PRINT_TIERS at build time) on every build → live at `/merchant-feed.xml`. Zero new deps.
- **SEO host hygiene**: per-route `<link rel="canonical">` (App-level default + `Seo.tsx` override; static index.html default removed on React mount), absolute og/twitter images, `vercel.json` 308 redirect www→apex + `X-Robots-Tag: noindex` on `uncle-tribute.vercel.app` (SPA rewrite untouched — gotcha #4), sitemap reconciled with real routes (+ `/for-you`, `/gift`, `/trade`).
- **OrderCancel** now offers a quiet "Your basket is saved — return when you're ready" path back to `/basket` (shown only when lines remain).
- **Privacy page** gained a factual "Cookies & analytics" section matching the above exactly.
- ⚠️ `api/tsconfig.json` now sets `"noEmit": true` — a bare `tsc -p api` used to emit `api/*.js` siblings which, committed, would deploy as duplicate/shadow Vercel routes. Never commit `api/*.js`.

### Awwwards-calibre quality layer (NEW 2026-06-10 — "Track B"; Hugo's standing direction: match Awwwards-winner calibre, do NOT actually submit)

Two sessions co-built this in one tree (media + srcset + deferred video by one, transitions/entrance + integration debugging by the other):

- **CloserLook deep-zoom viewer** (`src/components/CloserLook.tsx`, the signature interactive moment): full-screen z-[200] viewer on PaintingDetail — click the artwork or the "Explore the painting in detail" button. Cursor-anchored wheel zoom / pinch / double-tap fit↔1:1 / keyboard ±+arrows; images render at NATIVE pixel size scaled DOWN by transform (zoom sharpens toward native pixels); progressive load (-w800 variant first, full-res crossfades in); house focus-trap/scroll-lock/Escape conventions; PaintingDetail-monochrome chrome; reduced-motion = instant entrance. Always shows the SELECTED colourway.
- **Page transitions** (`src/components/PageTransition.tsx` wrapping Routes in App.tsx): pure-opacity crossfade (exit 160ms → enter 300ms house curve). HARD INVARIANTS documented in the file: opacity ONLY (a transformed ancestor re-bases the pages' `position:fixed` backdrops); scroll resets inside the INCOMING page's `useLayoutEffect` (pre-paint, via ScrollManager taking location as PROPS not hooks); POP + reduced-motion are instant swaps; `AnimatePresence initial={false}`.
- **Branded entrance** (`src/components/SiteEntrance.tsx`): once per session (`tasm.entrance.v1`), rose-emblem breathing on a #0a0908 veil, lifts on fonts-ready or 900ms cap, hard-unmounts ≤1.8s, pointer-events none throughout, z-[180], skipped on reduced-motion. Emblem is an `<img>` (NOT a CSS mask — WebKit gotcha).
- **Media v2** (⚠️ /video is immutable-cached 1yr — ANY re-encode needs NEW filenames + every reference updated, incl. the index.html preload): `intro-v2.webm` **1.36MB** VP9 two-pass (was 3.76MB) + `intro-v2.mp4` **2.25MB** H.264 denoised (was 4.15MB) + `poster-v2.webp/jpg` **~100KB** (was 469KB/912KB; denoised — the film-grain overlay re-textures it). VideoIntro now DEFERS the media fetch (preload="none"; sources mount on window-load/idle/first-interaction) so first paint costs ZERO video bytes, and crossfades the film in on 'playing'. ⚠️ TDZ gotcha fixed 2026-06-10: in that defer effect, `goEvents` MUST be declared before the readyState check — `fire()` runs synchronously when the document is already complete, and its cleanup reading a later const crashed the ENTIRE React tree (blank site, no console error).
- **Responsive images**: `scripts/optimize-paintings.mjs` generated `-w480/-w800/-w1200/-w1600` webp siblings for every painting (+ scenes/about/welcome at -w800/-w1400/-w2000); `src/lib/imageVariants.ts` is the AUTO-GENERATED manifest; `webpSrcSet()` in `lib/asset.ts` builds the srcset; `AssetImage`/`ImageReveal` accept a `sizes` prop (conservative "100vw" default — pass accurate slot sizes, see FooterCatalogue/Collections/Welcome for reasoned examples). PDP hero deliberately stays full-res (it warms the CloserLook cache).
- **Micro-interactions** (global.css): `press` class + native-button :active settle (independent `scale` property so framer transforms compose), link colour/underline transitions (NO opacity — framer writes it per-frame), all zeroed under reduced-motion.
- ✅ **FIXED same day**: the pre-existing react-helmet-async/React-19 SEO bug (every URL presenting homepage meta on direct loads — verified pre-existing on the 058ee1e deployment). react-helmet-async is REMOVED; `src/lib/headMeta.ts` now does deterministic synchronous DOM upserts that mutate the static index.html tags in place (one canonical, one description, one og set — duplicates impossible). `Seo.tsx` keeps its exact props API; `RouteHeadDefaults` in App.tsx resets routes without a Seo. Verified in visible Chrome: direct-load painting page carries full per-painting title/OG/`og:type product`/Product+Breadcrumb JSON-LD/canonical; SPA nav to /basket resets everything; SPA back re-applies. (`.npmrc` legacy-peer-deps kept — harmless — but react-helmet-async was its only documented reason.)

### Resend setup (Hugo — before going live with emails)

1. Create a free Resend account at https://resend.com (3,000 emails/month free).
2. **Verify the domain** `themandalacompany.com` in Resend → Domains → Add — copy the SPF/DKIM TXT records into IONOS DNS. Allow ~15 min for DNS propagation. Without domain verification, Resend will only let you send from `onboarding@resend.dev` (fine for testing, never for production — Gmail will junk it).
3. Create an API key (Resend → API Keys → Create), copy the `re_…` value once (Resend won't show it again).
4. Add `RESEND_API_KEY` to Vercel env vars for Production + Preview.
5. Optionally create the sender alias `info@themandalacompany.com` in your mail host (IONOS) so replies route somewhere — Resend itself only sends, it doesn't receive.

### Stripe dashboard config (already done)
- Account activated, Mandala Company entity
- Tide added as payout bank, weekly Monday payout
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
- Stripe Checkout serverless integration (deployed + verified working end-to-end 2026-05-29)
- Privacy/Terms placeholder pages
- Logo pack (rose emblem) in 6 PNG variants + SVG

---

## What's pending / next

1. ✅ **DONE — Stripe Checkout verified end-to-end** (Hugo confirmed the live redirect 2026-05-29; the self-contained `api/checkout.ts` rewrite fixed the "Opening checkout…" hang).
2. ✅ **DONE — IONOS → Vercel custom domain** is live at `themandalacompany.com`.
3. **Verify `SITE_URL` env var + Stripe webhook endpoint URL point at the custom domain.** The webhook URL in this doc still shows `uncle-tribute.vercel.app` — confirm in the Stripe + Vercel dashboards whether it was migrated to `themandalacompany.com` (the `.vercel.app` host still resolves, so checkout works either way; this is a tidy-up).
4. **Resend domain verification** for `themandalacompany.com` — the real next blocker. Required before order-confirmation, memory-notification and newsletter-welcome emails will land in inboxes (Gmail will junk anything from `onboarding@resend.dev` in production). See the Resend setup recipe above.
5. **A0 enablement (needs Agent K research outcome)** — confirm Point 101 fulfilment capability + optional gold-leaf detail sourcing. When ready, flip `available: true` on the `heirloom` tier in `src/data/paintings.ts PRINT_TIERS` AND in `api/checkout.ts TIERS["heirloom"]`. Agent K is researching framed-shipping math in parallel — outcome may affect shipping rates on A1 framed items.
6. **Point 101 account** + upload Stephen's high-res files
7. **Etsy → Tide payout** (set bank in Etsy Finances)
8. **About page polish** — `/public/img/welcome/04-paintings-collection.jpg` is kept on disk specifically for an About-page section we discussed but haven't built
9. **Optional: Web3Forms backend for EnquireModal** — currently falls back to mailto + clipboard; add `VITE_WEB3FORMS_KEY` env var to enable real POSTed form submission
10. **Update `api/email-basket.ts` to be tier-aware** — currently still references the legacy £180 / A2 spec for rendering the saved-basket email. Low priority — the basket page no longer surfaces a mis-priced number, but the saved-basket email will read £180 until updated.
11. ✅ **RESOLVED 2026-06-10 — webhook dedup is now KV-durable.** `api/stripe-webhook.ts` claims each event id in Vercel KV/Upstash (`SET stripe_evt:<id> 1 NX EX 86400`, fail-open, ~2s timeout) before side effects, with the in-memory Map kept as layer 2. Activates automatically once the Memories KV env vars exist; without them behaviour is unchanged (in-memory only).

---

## Repo structure

```
/api                          Vercel serverless functions — EVERY file is fully
                              self-contained (zero local imports; gotcha #5).
                              There is NO api/_lib (deleted 2026-05-30 — Vercel
                              wouldn't bundle it; everything is inlined).
  checkout.ts                 Stripe Checkout session creator
  stripe-webhook.ts           Stripe webhook receiver (signed, in-memory dedup) + inline thank-you-code minter + inline order-confirmation email
  newsletter-subscribe.ts     Friends-of-the-estate sign-up (CORS-allowlisted) + inline welcome email
  email-basket.ts             Save-your-basket email (CORS-allowlisted) + inline saved-basket email
  memories-submit.ts          Book-of-Memories: POST moderates + auto-publishes clean text to KV; GET serves the published wall. Estate emailed on every submission (CORS-allowlisted, honeypot). Inlines the moderation + KV store + notification email
  /admin
    order-shipped.ts          Manual shipped-email trigger (ADMIN_API_KEY auth) + inline shipped email
  tsconfig.json               Node-ESM tsconfig for the functions (NodeNext; for type-checking `tsc -p api`)

/public
  /img
    /paintings                Painting cover images (each JPG has matching WebP)
    /welcome                  Hero / studio / portrait / SunStar (JPG + WebP)
    /about                    About-page imagery (JPG + WebP)
    /scenes                   Collection backdrop scenes + Earth cutout PNG
    /art                      Misc art assets
  /logo                       Rose-mark SVGs + PNG renders (6 variants)
  /video                      intro.mp4 + poster.jpg / poster.webp
  /admin
    order-shipped.html        Static estate tool — posts to /api/admin/order-shipped (noindex)
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
/package.json                 Deps: react 19, vite 8, framer-motion 12, stripe, tailwind 3, react-helmet-async (SEO), @vercel/analytics. (gsap + lucide-react removed — were unused.)
/.npmrc                        legacy-peer-deps=true — react-helmet-async@2 declares a React 16–18 peer range but works on React 19; this lets npm + Vercel install it without ERESOLVE
```

---

## Key conventions

- **Pence not pounds** — all prices in `DEFAULT_PRINT.pricePence` are integer pence. `formatGBP(18000)` → `"£180.00"`.
- **Painting IDs must match** between `src/data/paintings.ts` and `api/checkout.ts` allowlist. When adding a painting, update **both**.
- **Image paths always reference `.jpg`** in code — the `<picture>` wrapper swaps to `.webp` automatically. Don't reference `.webp` directly in `<img src>`.
- **Section comments are numbered** in `Welcome.tsx` (e.g. `{/* 4 · FEATURED WORKS */}`) — renumber if reordering sections.
- **Sensitive Vercel env vars** are write-only after save. Keep a copy of `sk_live_…` and `whsec_…` in 1Password / a secure note.
- **Scroll-driven visibility uses sentinel divs + IntersectionObserver, not scroll listeners.** Pattern lives in `PaintingDetail.tsx` (the sticky "Add to basket" bar): a zero-height `<div ref={...} className="h-px w-full" />` is placed at the start and end of the region where the affordance should be visible, and two IntersectionObservers track when the user has scrolled past the start sentinel and not yet reached the end sentinel. Cheaper than `useScroll` for boolean visibility, and survives layout reflow without re-measuring.
- **Scroll-driven animations use Framer Motion only** — `useScroll` / `useTransform` / `useInView` / `useMotionValue` / `useMotionValueEvent` / `useMotionTemplate`. No Lenis, GSAP, or ScrollMagic (gotcha #1). Every scroll-driven animation must short-circuit on `useReducedMotion()` — either skip the transform entirely or render a static fallback. Keep scroll-driven properties to `transform` / `opacity` for GPU compositing — the only exceptions in the repo today are the ChapterIntro gradient string (`useMotionTemplate`) and the Nav basket badge `boxShadow` pulse, both confined to tiny paint areas.

---

## Critical gotchas (debugged once — don't repeat)

1. **Don't add Lenis smooth scroll** — was added then removed. Broke `ScrollToTop` route-change behaviour and Framer Motion `useScroll` peacock backdrop.
2. **Don't use `text-shadow` on a per-character `SplitReveal` wrapper** — clips the shadow to each glyph's box, creates visible "blocky" backgrounds. The `SplitReveal` component was deleted; if reintroducing, apply shadow via `filter: drop-shadow` on the parent instead.
3. **Stripe `product_data.images` in checkout sessions** — synchronously fetched by Stripe before returning the session URL. If the image URL is slow / unreachable from Stripe's side, the whole call hangs. Currently disabled in `api/checkout.ts`. Re-add only via Stripe-hosted product images, not raw image URLs.
4. **API functions in `/api`** — `vercel.json` rewrite uses negative lookahead `(?!api/)` to exclude `/api/*` from the SPA fallback. Don't simplify the rewrite to `/(.*)` — that breaks every serverless function.
5. **`/api` functions must be FULLY self-contained — ZERO local imports (this includes `api/_lib/*`).** Vercel's `@vercel/node` builder compiles only each function's entrypoint and does NOT bundle sibling local files into the lambda. Any local import — `./_lib/…`, `../_lib/…`, or anything under `/src` — crashes the function at **cold start** with `ERR_MODULE_NOT_FOUND`. ⚠️ This bit hard on 2026-05-30: **five of six functions** (stripe-webhook, memories-submit, newsletter-subscribe, email-basket, admin/order-shipped) were silently returning 500 in production because they imported React-Email templates + helpers from `api/_lib/`; only `checkout.ts` (no local imports) worked. **No config fixes it** — an `api/tsconfig.json` (NodeNext + jsx), and even importing by real `.tsx`/`.ts` extension with `rewriteRelativeImportExtensions`, were both tried and **preview-verified still failing**. The only fix is to inline everything a function needs into its own `.ts` file. `api/_lib/` has been deleted; each email is now an inline HTML-string builder inside its function, and `thankYouCode` / `memoryStore` are inlined into stripe-webhook / memories-submit respectively. **Consequence:** when you change an email's markup or a shared helper, you must edit it in EACH function that uses it (there is no shared module anymore).
6. **Stripe API version literals** like `"2025-09-30.clover"` may not match the installed SDK's exported type union. Omit `apiVersion` and let the SDK use its pinned default.
7. **Sacred Geometry finale — BOLD, screen-filling, TWO-TIER (CURRENT; live 2026-06-03 on top of the cinematic hero, commit `2643763`).** **⚠️ UPDATE 2026-06-03 — PINK-ONLY: the Earth limb + rust horizon glow were REMOVED from the finale (Hugo: "remove the green part… only the pink background to match how the rest of the backgrounds are"). It now shows ONLY the Mary-Pink peacock backdrop + the soft legibility scrim. Every Earth-present / rust-glow detail in the description below (opacity 0.7, mask-image, `earth-limb.webp`, the horizon-coupling history) NO LONGER APPLIES. The TYPE invariants below — opsz ≤48, two-tier hierarchy (dominant title → ~4× smaller clause → SEM line), ONE rust period, verbatim SEM quote, single text-shadow pass, `isolate` + `overflow-hidden`, whole-element Reveal — STILL HOLD.** Hugo's approved finale: **"Sacred geometry"** is the dominant title (TRUE Fraunces **700**; `font-synthesis: none` makes it real, never faux; `opsz 48`, `clamp(58px, 15vw, 232px)`, lineHeight 0.86, italic *geometry*) sitting **ABOVE** a deliberately ~4× smaller subordinate clause **"— the order beneath all things."** (`opsz 36 / wght 600`, `clamp(22px, 3.6vw, 58px)`, closing rust period) — his words: "Sacred geometry needs to be larger than the order beneath all things." It fills a `min-h-[100svh]` vertically-centered section. (A brief 2026-06-02 COMPACT rose-emblem colophon on the purple sky was a detour — HISTORY.) Background = the home's own peacock backdrop crossfade extended with a 4th **Mary Pink** colourway (`peacock-mary-pink-blur-v2.webp` — a deeper dusty rose, cropped from the artwork's pink-petal background, cache-busted v2) that closes the page (4 `PEACOCK_BACKDROPS` ↔ 4 opacity transforms incl. `maryPinkOpacity`); the Earth horizon is PRESENT (opacity 0.7) and the decorative mandala-ring SVG is REMOVED (read as "AI"). The ONLY invariant that still holds from the old design: keep opsz moderate (≤~56) so large display type stays clean. The historical note that follows describes the prior 2026-06-01 restrained colophon and is kept for context only — its "never bold/large/screen-filling" rules NO LONGER apply. (Historical, 2026-06-01:) The old finale set the headline at `clamp(64px,22vw,560px)` and tied the Earth image's negative `marginTop` to the *same* clamp so the overlap stayed proportional — that coupling no longer exists. The redesigned finale is Fraunces **opsz 40 / wght 400** at `clamp(34px,6vw,74px)` in normal centered flow, and the Earth is the lightweight **earth-limb.webp** rendered as an **absolutely bottom-pinned background layer** sized by width classes + a fixed `opacity 0.34` / `brightness 0.72` / mask-image, with **ZERO reference to the headline font-size**. There is no shared clamp and no negative margin anymore, so changing the headline size can NEVER break the Earth overlap. **Finale invariants (bake these in — they prevent the "ornate/scribbly" regression Hugo flagged):** (1) NEVER use Fraunces opsz above ~48 in the finale — opsz 144's hairline-to-stem contrast + swashy terminals at display scale was the "scribble"; lock to opsz 40 (statement) / opsz 24 (quote). opsz is the dial, not weight or colour. (2) The TITLE tier ("Sacred geometry") is intentionally large + screen-filling (`clamp(58px,15vw,232px)`) — opsz (NOT size) is the dial that keeps strokes clean, so a big size at opsz 48 is fine; the subordinate clause stays ~4× smaller so the hierarchy reads. (3) ONE text-shadow pass max (`0 1px 24px rgba(10,9,8,0.6)`, legibility only) — the old 4-layer "carved" stack is banned at this scale. (4) Type NEVER sits on a literal photo — imagery is atmosphere only (opacity ≤0.35, brightness ≤0.75, edge-dissolved into `#0a0908` via mask-image). (5) Real hierarchy (dominant title → ~4× smaller subordinate clause → Stephen's-voice line), never two floating words; no eyebrow. (6) ONE accent note only: the rust period `#c97844`; everything else is the `#ede6d6` ink token + `text-ink-muted`. (7) Stephen's voice is VERBATIM — only his documented "everything is connected" (content.ts `MEMORIAL_QUOTE`), never invented near-quotes; en-dashes not hyphens; cite "SEM". (8) Decouple type + image structurally (this gotcha). (9) Whole-element Reveal only (gotcha #2); section keeps `isolate` + `overflow-hidden` (gotcha #8); reduced-motion renders the full static composition (Reveal guarantees this). (10) Keep it light: earth-limb.webp (34KB) not earth-cutout.png (861KB); the mandala-ring ground is pure SVG at strokeOpacity 0.05 (whisper threshold — ≤0.07 or it becomes the busy/decorative failure it's meant to avoid). `earth-cutout.png` stays on disk (no longer used by the finale; kept for About).
8. **Z-stacking on the home page** — `<main>` carries `isolate` and Sacred Geometry section also carries `isolate` to prevent Framer Motion transforms from re-ordering the peacock backdrop into the foreground during scroll.
9. **Pricing lives in FOUR places** — `src/data/paintings.ts PRINT_TIERS` is the canonical ladder, AND it is mirrored inline (gotcha #5 forbids cross-directory imports into `/api`) in: (1) `api/checkout.ts TIERS` (the charged price), (2) `api/stripe-webhook.ts` per-tier lookups TIER_PRICE_PENCE / TIER_LABEL / TIER_SIZE / TIER_EDITION (OrderConfirmation email), and (3) `api/email-basket.ts TIERS` (the saved-basket email — made tier-aware + brought to the rethought ladder 2026-06-02; this used to be stale/legacy). When updating a tier price/edition/label, edit **ALL FOUR** in the same commit, then `npm run build` + grep the four files for the pence values to confirm they agree (advertised price MUST equal the Stripe charge). **Bundle discounts mirror too:** the colourway-set 12% (`COLOURWAY_SET_DISCOUNT_PERCENT`) and complete-catalogue 15% (`COMPLETE_CATALOGUE_DISCOUNT_PERCENT`) live in `paintings.ts` AND in `api/checkout.ts` `bundlePercentOff` — change both together (the count-based 5/10% ladder is also duplicated in both).

---

## How to continue work in a new chat / different AI tool

1. Paste this entire document at the top of the new conversation
2. State the specific task you want done + link any relevant screenshots
3. If the AI doesn't have GitHub MCP tools (e.g., generic ChatGPT), it can still draft code changes — ask Hugo to push the branch and merge PRs manually via github.com
4. The repo is the source of truth — re-read `src/data/paintings.ts` and `src/pages/Welcome.tsx` for current state if anything in this doc is stale

---

## Keeping this document in sync — rule for future sessions

**This document is treated as source-of-truth, not after-the-fact documentation.** When you make a change that affects the architecture, you update CLAUDE.md in the same commit / PR — never as a follow-up.

A `PostToolUse` hook at `.claude/hooks/claude-md-sync-reminder.sh` prints a nudge whenever Claude edits one of these files:

| File touched | CLAUDE.md section to update |
|---|---|
| `api/*` | "Stripe print sales — architecture" |
| `src/data/*` | "Data files (single source of truth)" |
| `src/App.tsx` | "Routes" table |
| `src/pages/Welcome.tsx` | "Welcome page sections (in scroll order)" |
| `src/components/*` | "Components" table |
| `vercel.json` | "Required Vercel env vars" / rewrite gotcha |
| `package.json` | "Tech stack" table |
| `tailwind.config.ts` | "Brand & design system" |

The hook is advisory — it doesn't block edits. The expectation is that Claude reads its output and updates CLAUDE.md if the change is architectural. Cosmetic fixes and line-level bug fixes don't need updates here.

A `SessionStart` hook at `.claude/hooks/session-start.sh` runs `npm install` (idempotent) and prints a one-line confirmation that CLAUDE.md is loaded as project context. Native Claude Code already auto-loads root-level CLAUDE.md, so this is belt-and-braces.

Run **`/read-context`** at any point to have Claude re-read CLAUDE.md plus the live data files (`src/data/paintings.ts`, `src/data/content.ts`, `api/checkout.ts`, `api/stripe-webhook.ts`) and summarise the current state of the project including recent commits.

---

_Last updated: 2026-06-10 night (**Wave 3 — estate-prestige features.** (1) **Edition register**: `src/data/editions.ts` hand-curated allocation ledger (paste-ready template for Hugo per fulfilled order; ships empty) + the buy box's quiet "Next to be allocated: No. X of N" line per selected tier+colourway (skips open editions/one-offs). (2) **`/verify` certificate page** (theprintspace model) — looks a COA number up in the ledger (trim/case/space-dash-forgiving), dignified found-card / graceful not-found, linked from ProvenancePanel + a new FAQ entry, in sitemap. (3) **Register interest in the original** — hushed inline email capture under the provenance fact on PaintingDetail, POSTs the existing newsletter endpoint with `source: original-interest:<paintingId>`; friendly-success contract mirrors NewsletterSignup. (4) **Klaviyo onsite** as the third consent-gated pixel in tracking.ts (`VITE_KLAVIYO_COMPANY_ID`; Viewed Product / Added to Cart / Started Checkout — abandoned-cart flows fire once keys exist). (5) **KV-durable webhook dedup** (pending #11 resolved — fail-open SET-NX, in-memory layer 2 kept). (6) **About "The body of work"** image-led section using 04-paintings-collection (the shot kept on disk since May), factual caption only. Routes table corrected (Journal/Photo Book removed; /for-you /gift /trade /verify added). Sub-agent session limits killed 5 of 8 fleet agents mid-wave; the orchestrating session completed PDP integration + all verification inline (build/tsc/eslint green; pricing mirrors + verbatim untouched; PDP still monochrome; visually verified in Chrome: allocation line recomputes on tier switch, register form, /verify found/not-found, About section).**) Previously 2026-06-10 later same day (**"Track B" Awwwards-calibre quality layer — see the new "Awwwards-calibre quality layer" section.** CloserLook deep-zoom viewer (the signature moment — verified zooming to 281% on real brushwork in live Chrome), pure-opacity page transitions + ScrollManager, once-per-session rose-emblem entrance, media v2 (webm 3.76→1.36MB, mp4 4.15→2.25MB, poster 469→~100KB, deferred fetch = zero video bytes at first paint), responsive -wNNN webp variants + sizes-aware AssetImage/ImageReveal, press micro-interactions. Debugged in-flight: a TDZ ReferenceError in the deferred-video effect was crashing the WHOLE tree to a blank page (goEvents declared after a synchronous fire() path — see the Track B section gotcha); 2 lint errors fixed; a duplicate unwired viewer deleted in favour of CloserLook. DISCOVERED + DOCUMENTED a pre-existing SEO bug: react-helmet-async@2 on React 19 fails to commit per-route title/meta/JSON-LD/canonical on direct loads (verified identical on the pre-Track-A 058ee1e deployment — NOT a regression from today) — fix planned via React 19 native metadata hoisting. Verification environment notes for future sessions: hidden/headless tabs freeze rAF, which stalls framer exits (mode="wait"), helmet-async commits AND video playback — verify motion/SEO/media in a VISIBLE browser tab; separately, this Mac's Chrome had a crashed media process today (even the live site's video stalled at readyState 0 — Chrome restart fixes it).**) Previously 2026-06-10 (**"Track A" growth/tracking layer — see the new "Marketing & tracking layer" section for the full spec.** Built by a 5-agent fleet with disjoint file ownership + build verification: consent-gated Meta Pixel + GA4 (Consent Mode v2) behind a house-styled ConsentBanner; server-side Meta CAPI Purchase from the webhook (event_id = session id, browser fires NO Purchase); first-touch UTM capture → checkout session metadata; Stripe abandoned-checkout recovery (`after_expiration` + `consent_collection.promotions`, defensive retry-without) + a consent-gated quiet "basket held" email on `checkout.session.expired`; cross-device saved-basket restore links (`/basket?restore=` base64url, 1,800-char guard); build-time Google Merchant Center feed (100 SKUs at `/merchant-feed.xml`); canonical tags + www→apex 308 + vercel.app noindex + sitemap reconciliation; OrderCancel return-to-basket path; privacy-policy "Cookies & analytics" section. All env-guarded/dormant until Hugo sets VITE_META_PIXEL_ID / VITE_GA4_ID / META_PIXEL_ID / META_CAPI_ACCESS_TOKEN / KLAVIYO_*. `api/tsconfig.json` now `noEmit` (stray `api/*.js` tsc artifacts would deploy as shadow routes — never commit them). Same day, a parallel session removed the Friends & Family UI (`509da2a`) + disabled the newsletter thank-you code (`4a99020`); earlier the uncommitted free-shipping copy sweep finally landed (`058ee1e`). Hugo decisions on record: ad budget £500–1,500/mo for the first 90 days; Awwwards = match the calibre, do NOT submit; "millions in 30 days" debunked with honest math — realistic base £3–6k by day 30, £25–50k by day 90 on the back of ~90% margins (breakeven ROAS 1.11×). Outstanding Hugo-only cluster unchanged: Resend domain verification, Point 101 account + files, Klaviyo keys, Klarna/Clearpay toggle, Vercel Analytics toggle, end-to-end test order, IONOS archive BEFORE cancelling.**) Previously 2026-06-03 (**Welcome polish batch — Hugo's 5 fixes, deployed to `main`.** (1) **Removed the "Original — One of One" `studio` tier** site-wide (`available:false` in paintings.ts; `api/checkout.ts` `studio` pricing row kept intact so a stale client can't crash checkout) + removed its £2,450 sentence from FAQ — Hugo isn't selling unique originals until their value rises. (2) **Custom cursor is now the Mandala Company rose-mark** (white flower emblem `/logo/logo-emblem.svg` as a CSS `background-image` — NOT a mask, so it dodges the WebKit currentColor-in-mask gotcha) replacing the cream dot + hollow ring; single `.cc-flower` element (22px, blooms to 32px over interactive elements), `z-index:250` so it sits above the z-200 modals. CustomCursor.tsx + global.css `.cc-flower` rules. (3) **Sacred Geometry finale is now PINK-ONLY** — the green Earth limb `<figure>` + the rust horizon glow were removed so only the Mary-Pink peacock backdrop + soft scrim remain (supersedes the Earth-present invariants in gotcha #7 + Welcome sections #6/#10; `webp` import dropped from Welcome.tsx). (4) **Craft "Each painting is a ritual" card made transparent** (dropped `bg-[rgba(10,9,8,0.88)]` + `ring-1 ring-white/8` that read as a hard black rectangle) so it blends like every other transparent section. (5) **Body copy stepped up on wide screens** (16–17px → 17/18px + `2xl:text-[20px]`) and **oversized images capped** (studio full-bleed letterboxed `md:aspect-[12/5] 2xl:aspect-[5/2]`; mobile portrait + craft figures capped `md:max-w-[440px] xl:max-w-[500px]`). **Deployed NON-DESTRUCTIVELY:** branched off live `origin/main` (preserving a parallel session's `e040350` cinematic LEFT-bleed Meet-Stephen + `1b70256` slide-in side-nav), cherry-picked the 5-file change, resolved the lone Welcome.tsx Meet-Stephen conflict by KEEPING the live left-bleed (the obsolete portrait-cap targeted the old grid layout `finale-land` still had — dropped it). Verified via 3 parallel adversarial review agents + computed-style/DOM checks (Earth gone, Craft bg `rgba(0,0,0,0)`, mary-pink backdrop opacity 1 at foot, no console errors); `tsc + vite build` green. KNOWN items for Hugo to eyeball live: Craft body text now relies on the soft global scrim like the other transparent sections; the capped portrait/craft images leave editorial whitespace on 4K (no `3xl` step); the hero + Meet-Stephen full-height cinematic bleeds were initially left intact. **FOLLOW-UP (same day — Hugo asked me to re-audit the last 48h and judge whether I'd failed him): reined the bleeds in.** The 48h pattern is unambiguous — Hugo repeatedly rejects screen-filling treatments (bold finale read "long/massive/tedious" → made compact in `5abb176`; full-screen nav menu "read as a separate page" → slide-in drawer in `1b70256`; "enlarge craft spec text"), yet sessions kept re-inflating: a parallel session made the hero a full-viewport bleed UNREQUESTED (`80f7df0` "Replace the contained 7-col/4:3 hero with a screen-filling cinematic composition") and mirrored it on Meet-Stephen (`e040350`). Those were the literal "images that take up the entire screen". Fix: hero photo capped to **62svh, vertically centred with soft y-edges** (was ~80svh — its height was driven by the tall headline, so the earlier `md:min-h` cut was a no-op until the image height was decoupled) + width 60→52%; Meet-Stephen 72→54svh + width 46→42%. Both are now contained framed photos, not edge-to-edge full-screen walls. Build green; verified at 1680px (hero img 62%/52% of screen, portrait 54%/42%, no h-overflow). Previously 2026-06-03 (**Bold two-tier Sacred Geometry finale + dusty-rose Mary-Pink backdrop shipped live (commit `2643763`, on top of the parallel cinematic-hero work `80f7df0`).** The finale was restored from the compact colophon to the BOLD screen-filling close, then refined to Hugo's two-tier hierarchy: **"Sacred geometry"** dominant (Fraunces 700, opsz 48, `clamp(58px,15vw,232px)`) sitting ABOVE a ~4× smaller **"— the order beneath all things."** (`clamp(22px,3.6vw,58px)`, rust period); rose emblem + "thread through every piece" eyebrow REMOVED; Earth limb back (opacity 0.7) + rust glow + soft scrim; 4-colourway backdrop closing on `peacock-mary-pink-blur-v2.webp` (deeper dusty rose, cache-busted v2). Landed via a surgical splice onto the latest `main` so the diff was **Welcome.tsx finale + backdrop ONLY** — the cinematic hero/nav/footer were a parallel session's work and stayed untouched. `npm run build` green; verified live on themandalacompany.com (new bundle `index-Dp4KWN6t.js` has the two-tier finale + v2 backdrop, all finale assets HTTP 200, compact eyebrow gone). NOTE: a parallel session was force-pushing its own hero to `main` during this; the finale is also preserved on branch `wip-finale-08a828c` + `/tmp/finale-safety/` against a clobbering force-push.). Previously 2026-06-02 (**Mobile polish batch (Hugo's screenshots) — branch `claude/readcontext-XZOAe`.** Two rounds of device feedback fixed: **(1) Intro film** — strengthened iOS autoplay (kick on touch/pointer/click/scroll/keydown + visibilitychange) AND hid the native iOS play-button overlay via `::-webkit-media-controls-start-playback-button` so a Low-Power-Mode phone never shows a tap-to-play glyph (first scroll starts it); tightened the hero top-pad clamp (`4.375rem`→`1.125rem` min) to kill the black gap under the portrait-mode 16:9 film. **(2) Finale** — replaced the bold `min-h-100svh` banner with a COMPACT brand-led close (rose emblem + opsz-40 statement ≤60px + verbatim line + link, `py-20 md:py-28`); removed the huge gap above it; reverted the Mary-Pink backdrop close to the extended Moroccan-Purple (back to 3 PEACOCK_BACKDROPS); removed the Earth limb + rust glow to declutter (gotcha #7 superseded again). **(3) `Reveal` rewritten** framer-`whileInView`→raw `IntersectionObserver` + on-mount in-view check — fixes the iOS "image vanish" that left figures (Craft `02-painting-table`, Meet-Stephen text, etc.) at opacity 0 = tall BLACK GAPS the user read as missing images / blank space. **(4) Mobile menu** redesigned to a full-screen brand takeover (large Fraunces links, tap-anywhere-to-close) — old cramped dropdown's click-off was unreliable + off-aesthetic. **(5) Colourway deep-link** — Welcome featured tiles pass `?c=<colourway>`; PaintingDetail reads it (+ re-syncs on nav) so clicking e.g. Blood Moon Red lands on that colourway, not the original. **(6) English Bluebells re-cropped** v2→v3: v2 was over-zoomed INTO the mandala (corners lost); v3 removes ONLY the lavender border off the raw original so the full mandala + sky corners show with Wild Rose's breathing room. `tsc -b` + `vite build` + eslint(changed files) all green; merged onto main's pricing-ladder uplift and deployed to main.). Previously 2026-06-02 (**Pricing ladder rethought + uplifted (research-backed) — committed locally, awaiting Hugo's deploy OK.** New ladder: Gallery A3 **£245** (now a LIMITED edition of 150, was open £145), Collector's A2 **£450** anchor (was £295), Atelier A1 **£850** (was £595), Heirloom A0 **£1,750** (was £1,250, still hidden behind A0 fulfilment), Original one-of-one **£2,450** (was £950 — raised above the A0 so the unique hand-painted piece tops the ladder). Trigger: Hugo's signal that Stephen's smallest ORIGINALS sold £230–£550. Validated by a deep-research pass (Lever Gallery signed/numbered giclée £250–£500 at A2 = closest comp; Old Town Editions chart puts A1≈median, A0 within range; unique/embellished comps e.g. Ashvin Harrison £2,155–£2,972). Two research refinements applied to the initial picks: (a) A3 made a numbered LIMITED edition because an *open* A3 at £245 was the one conversion red flag ("open prints should be poster-priced"), and (b) the one-of-one lifted £1,950→£2,450 for clear separation above the £1,750 A0 (a £200 gap collapsed the unique-vs-edition hierarchy). Mirrored across ALL FOUR price locations (paintings.ts, api/checkout.ts, api/stripe-webhook.ts, api/email-basket.ts — the last was stale/legacy, now tier-aware, resolving old pending #10) + FAQ copy + entry/anchor comments. Framing (£295/£395) + embellishment (£350/£495) add-ons unchanged; bundle discounts are %, so they scale automatically. Build clean; 4-mirror pence values verified equal (advertised == Stripe charge).). Previously 2026-06-02 (**Cross-platform overhaul + bold finale redesign, deployed to main.** (1) **Bluebell** image re-cropped (centre 1620²→2000²) so the mandala fills the frame like its siblings; WebP regenerated. (2) **Footer + catalogue rebuilt** into one consistent system — all column headers on the single EYEBROW_MUTED token, invented alpha-greys migrated to named ink/line tokens, **"For You" added** to the Site links in nav order, enquiries email no longer breaks mid-word (Site+Enquiries go full-width on mobile so it sits on one line), catalogue+footer share one container/rhythm. (3) **42-item responsive overhaul (320px→4K)** from a ~17-agent audit + 9-agent implementation: the "mega-zoomed video" fixed (portrait shows the full 16:9 frame via `@media (max-aspect-ratio:1/1)` height/aspect, not a tall cover-crop); **faux-weight overlap fixed** (base headings 700→600, `font-synthesis:none`, hero `font-black/medium`→real 600/400, Nav/button/badge off font-medium); the **`Reveal` image-vanish root cause** fixed (whileInView amount 0.15→0.01, no negative margin — tall figures were staying invisible on short screens); About hero portrait-in-landscape crop fixed; PaintingDetail hero/TrueSizeRoom crop + CLS fixed; honeypots hardened to the clip technique; a new **`3xl` (2200px) breakpoint** + container widening + lifted type ceilings so the site fills a 4K TV instead of stranding a 1400px column. (4) **Contact** retuned to the calm Memories register. (5) **Sacred Geometry finale redesigned** (Hugo's direction — supersedes gotcha #7): bold screen-filling Fraunces **700** headline (`opsz 48`, clamp max 132px) in a `min-h-100svh` centered section, background blends the home peacock backdrop closing on a new **Mary Pink** 4th colourway, Earth horizon strengthened (opacity 0.6), decorative mandala-ring SVG removed. Pre-deploy: a 3-agent adversarial review (diff correctness + build/types + commerce-route safety) returned GO with 0 blockers; `tsc -b && vite build` clean; /api, Stripe, pricing, basket all untouched. PENDING for Hugo's review: a deeper creative-copy pass on AI microcopy (held back to avoid touching his/Stephen's verbatim words); confirm the bold finale + Mary Pink read well on his own devices.). Previously 2026-06-01 (Reference-grade polish + finale + mobile-video pass, all shipped to `main` & live-verified. **(1) Site-wide "Stripe/Nike-grade" polish**: fixed the iOS mobile-logo vanish (the emblem SVG was a CSS `mask-image` with `fill="currentColor"`, which WebKit resolves transparent in a mask resource → masked span painted nothing; set the SVG fill to solid black, fixes Nav + Footer); centred the /for-you orphan grid; killed the scroll-lag compositing layers; **renamed the tier labels** for pricing psychology (Gallery / Collector's / Atelier / Original — One of One / Heirloom — prices/editions/ids UNCHANGED, mirrored across paintings.ts + checkout.ts + stripe-webhook.ts). **(2) "Carved horizon" Sacred Geometry finale**: replaced the faux-bolded `font-black` headline (only 400/600 Fraunces load, so 900 synthesised + muddied) with genuine `opsz 144 / wght 600` + a carved shadow stack + rust horizon glow; type scaled to `clamp(64px,22vw,560px)`; per gotcha #7 the Earth's coupled negative margin was re-tuned `-0.44→-0.40` IN TANDEM so overlap is identical at every width. **(3) Mobile video autoplay**: removed the `isLowPowerViewport()` poster gate in VideoIntro.tsx so the `<video>` mounts + autoplays + loops on every device (only `prefers-reduced-motion` falls back to the poster), with an iOS play() kick on mount/loadedmetadata/canplay + a one-time first-interaction fallback. **(4) English Bluebells** painting image re-cropped to a 2000² edge-bleed (removed the old uncropped purple border). **(5) PaintingDetail now strictly monochrome**: ProvenancePanel + CredentialsStrip switched from the accent `EYEBROW` token to `EYEBROW_MUTED` (chevrons/dots → ink) — the last 7 at-rest orange text nodes removed. **(6) robots.txt** Sitemap directive made absolute. **18-agent reference-grade live QA sweep** (Claude Preview across 320–1920) PASSED finale (real opsz144/wght600, rust period, no overflow), mobile video (currentTime advancing, looping, no play button at 360/390), responsive (no h-overflow any width, hero not skewed, logo visible), grid centring, and console/a11y (no errors, single h1, all imgs alt). Live `/api/checkout` verified minting real `cs_live_…` Stripe sessions (single + multi-item). NOTE: the QA "finale footer-gap at desktop" was a measurement artifact — the 209px band is the intentional `FooterCatalogue` (10-painting strip, `hidden md:block`), not a void; the adversarial-verify phase correctly excluded it. FONTS corrected throughout this doc: the live site is Fraunces + Hanken Grotesk, NOT Playfair/Inter.). Previously 2026-05-31 (CRITICAL FIX — all /api functions made self-contained. Discovered via Vercel runtime logs that 5 of 6 serverless functions (stripe-webhook, memories-submit, newsletter-subscribe, email-basket, admin/order-shipped) were silently returning 500 `ERR_MODULE_NOT_FOUND` at cold start in production — they imported React-Email templates + helpers from `api/_lib/`, which Vercel's @vercel/node builder does NOT bundle (only `checkout.ts`, with no local imports, worked). Real impact: NO order-confirmation emails / thank-you codes were sending (Stripe still sent its own receipt; payments unaffected), memory submissions 500'd, newsletter/save-basket/shipped emails 500'd. Tried + preview-verified-FAILING: api/tsconfig.json (NodeNext+jsx), and real-extension imports + rewriteRelativeImportExtensions — neither makes Vercel bundle local files. FIX: inlined everything into each function (HTML-string email builders replacing the React-Email templates + @react-email/render; thankYouCode inlined into stripe-webhook; memoryStore moderation+KV inlined into memories-submit). Deleted api/_lib entirely. Added a clean api/tsconfig.json (NodeNext, for type-checking). Rewrote gotcha #5 to the hard truth: ZERO local imports in /api, edit shared email/helper code in every function. Verified live on themandalacompany.com: /api/memories-submit GET→200, /api/stripe-webhook GET→405 (loads), /api/checkout GET→405; the other three use the identical self-contained pattern and are verified on the live site immediately after this merge.). Previously 2026-05-30 (Doc-sync pass after the memorial batch shipped to `main`. Everything previously flagged "in-flight / uncommitted" is now live; working tree clean, in sync with origin. **Memories rebuilt from "moderated by deploy" to auto-publish**: POST /api/memories-submit moderates each submission (OpenAI omni-moderation `omni-moderation-latest`, text+image; built-in slur/spam blocklist fallback when OPENAI_API_KEY absent) and auto-publishes clean image-free text to Vercel KV (Upstash REST; accepts KV_REST_API_* OR UPSTASH_REDIS_REST_* names); images always HOLD for the family's one-tap OK (emailed as attachment); GET serves the published wall; src/data/memories.ts MEMORIES is now the seed/fallback rendered under the KV entries; new api/_lib/memoryStore.ts (self-contained, raw fetch, zero new deps). New lib/useHideOnScroll.ts drives the intro-film hide-on-scroll in IntroFilmHeader. Mary Pink colourway added to peacock-minerva (5 colourways now). 3 low-res painting JP/WebPs (enneagon-cygnus-gold, lulin-original, peacock-blood-moon-red) upgraded to 2000px. Pending list updated: checkout + custom domain done; verify SITE_URL/webhook host + Resend domain verification are the live next steps.). Previously 2026-05-29 (Book of Memories: new /memories route + Memories page, src/data/memories.ts single-source-of-truth wall, /api/memories-submit notification endpoint + MemorySubmitted email, Nav + Footer "Memories" links. Moderated by deploy — no database, same ethos as the newsletter endpoint. Journal: /journal + /journal/:slug routes, Journal + JournalArticle pages, src/data/journal.ts writings archive with draft support + Article/Blog JSON-LD for SEO, Nav + Footer "Journal" links. Admin: public/admin/order-shipped.html one-page form over /api/admin/order-shipped, robots Disallow /admin/. Stripe checkout confirmed working — gift flow now unblocked. Intro film as a global header: new `IntroFilmHeader` (VideoIntro + overlay Nav) on Welcome + all content pages (Collections, About, Journal, JournalArticle, Memories, Contact, FAQ) so the video is reachable by scrolling up from anywhere; Nav gained an `overlay` (fixed) mode + a top scrim, and its inline links now switch to the hamburger below `lg` (six links overflowed tablets). Colourways trimmed in src/data/paintings.ts: removed Deep Forest Red (Wild Rose); Amethyst Purple / Vespa Violet / Citrine Neon (Orchis 7); Phoenix Orange / Jade Green / Pearl Pink (Flower of Life); Rose Quartz (Tridecagon) — originals untouched. NOT on transactional pages (Basket, Order, Legal, 404) or PaintingDetail. Nav inline-links breakpoint later raised lg→xl when a 7th link was added. About "In loving memory" section: Polly Wedge's funeral tribute + Stephen's "everything is connected" pull-quote + full life dates (content.ts BIRTH_DATE/DEATH_DATE/LIFE_DATES/MEMORIAL_QUOTE/TRIBUTE) — 4 tribute phrases kept verbatim pending Polly's confirmation. New /photo-book page ("Steve's Photo Book by Polly Wedge") + src/data/photobook.ts (empty, awaiting screenshots) + Nav/Footer "Photo Book" link before Contact. Bundle pricing (2026-05-29 research, "max-profit discount via agents"): complete-catalogue bundle getCompleteCatalogueBundle (15% off — "The complete catalogue" panel at foot of /collections) + colourway-set getColourwaySetBundle deepened to 12% ("complete colourway set" card on PaintingDetail), both now CONTENT-derived + mirrored server-side in api/checkout.ts bundlePercentOff (15% = one line of every painting; 12% = all lines one painting; else 10%/5% count ladder) — supersedes the earlier count-based no-/api-change approach. Depths chosen for max total profit (COGS ~10–12% of retail; ≤15% prestige cap). PENDING ASSETS: photo-book images (awaiting Hugo's screenshots) — Mary Pink colourway has since been added (2026-05-30)). Previously 2026-05-28 (Nathaniel pre-launch cleanup: real Privacy / Terms / Returns pages, /contact + /faq routes, admin shipped-email endpoint, CORS allowlist on newsletter + basket APIs, in-memory webhook event-id dedup, newsletter consent microcopy, customs disclosure on /basket). Keep this file in sync with major architectural changes; line-level bug fixes don't need updates here._
