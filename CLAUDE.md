# The Art of Stephen Meakin — Project Source of Truth

A memorial tribute website and direct-to-buyer print shop for **Stephen Meakin** (SEM, 1966–2021), British mandala artist and sacred geometer. Built by his nephew on behalf of **The Mandala Company** (the estate, run by Steve's immediate family — Mandala Company is a trading name, not a registered Foundation or charity). Sells signed giclée print reproductions of his paintings direct from the site (via Stripe) and via Etsy.

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
| SEO / meta | `react-helmet-async` (`<HelmetProvider>` in App.tsx) — per-route `<title>` + meta + per-painting OG + Product/Breadcrumb JSON-LD via `src/components/Seo.tsx` |
| Analytics | `@vercel/analytics` — `<Analytics />` mounted once in App.tsx; cookieless, GDPR-friendly, no-ops until Web Analytics is enabled in the Vercel dashboard |
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
/collections/:id             Painting detail (colourway picker + Add to basket / Buy now)
/about                       Long-form bio (Anegada chapter, TAGA, students letter)
/basket                      Multi-item basket (localStorage) + Proceed to checkout
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
3. **Meet Stephen** — portrait + IN STEVE'S OWN WORDS… eyebrow + opening bio
4. **Studio** — full-bleed cinematic image
5. **Featured Works** — 3×2 grid of signature paintings linking to detail pages
6. **Each painting is a ritual** — Craft scrim card with process narrative + materials grid
7. **Sacred Geometry — four traditions** — 4-card grid (Insular Island / Rose Windows / Persian / Tibetan)
8. **Arista SunStar** — text-left, framed photo right (the 3.6m commission for Farmacy Notting Hill)
9. **The Estate** — Prints + Friends-of-the-estate engagement cards (open EnquireModal) + `NewsletterSignup variant="panel"` mounted below the cards
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
- `PRINT_TIERS` — **canonical four-tier price ladder** (Atelier A3 £145 / Collector A2 £295 anchor / Atelier Grande A1 £595 / Heirloom A0 £1,250 — hidden until A0 fulfilment confirmed). Each A2/A1 tier carries `framingPricePence` (£295/£395) and `embellishmentPricePence` (£350/£495) for the two paid add-ons. Source of truth for site-side pricing.
- `ESTATE_AUTHENTICATION` — single source for stamp / numbering / COA / printer copy. Surfaces on PaintingDetail, Basket, and the OrderConfirmation email. Updated 2026-05-28: copy says "The Mandala Company" (NOT "The Mandala Company Foundation" — it's a trading name, not a registered Foundation).
- `ORIGINAL_PROVENANCE` — single dignified line surfaced on PaintingDetail's key-fact dl ("Original · Held privately by the estate — the original is not currently for sale."). The originals are kept in the family's legal name and aren't for sale.
- `EMBELLISHMENT_NOTE` — copy for the hand-finishing add-on (Polly Wedge finishes A2/A1 prints by hand; allow 4 weeks). Mirrored into `api/_lib/emails/OrderConfirmation.tsx`.
- `DEFAULT_PRINT` — legacy default (now £295, mirrors the anchor tier). Kept for the home page "from £…" chip and any straggling callers.
- Helpers: `getPaintingById`, `getPrintTiers`, `getAnchorTier`, `getFramingPricePence`, `getEmbellishmentPricePence`, `getPrintPricePence` (legacy), `getPrintSize` (legacy), `formatGBP`, `ORIGINAL_PRINT_SPEC`, `ORIGINAL_PROVENANCE`, `EMBELLISHMENT_NOTE`, `COLOURWAY_NOTE`

**Pricing mirror**: `api/checkout.ts` carries a `TIERS` map that mirrors `PRINT_TIERS` (gotcha #5 forbids cross-directory imports into `/api`). `api/stripe-webhook.ts` also carries small per-tier label / price / size / edition lookups for the OrderConfirmation email — these now include the `studio` row (£950 one-off) so a Studio purchase renders the correct label/size/edition/price. When updating a tier price, update **all three** in the same commit — see gotcha #9.

**Collection-bundle discount mirror**: `getCollectionBundle` in `paintings.ts` advertises the SAME discount the checkout applies, derived from the painting count via `bundleDiscountPercentForCount(count)` = `count >= 3 ? 10 : 5` — mirroring `api/checkout.ts`'s coupon (5% at 2 items, 10% at 3+). So a 2-painting collection (Habundia) advertises 5% (NOT a flat 10%) and the card's save/net equals the Stripe charge. Keep the two in sync (part of gotcha #9).

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
| `Nav` | Sticky header, mobile-responsive padding, inline SVG basket icon + count badge, mounts `ReturningVisitorChip` |
| `Footer` | 4-col footer with site links + studio info + email + `NewsletterSignup variant="footer"` |
| `Logo` | Rose-mark SVG, wordmark hidden on mobile |
| `VideoIntro` | Sticky 100vh boomerang, dissolves on scroll |
| `Reveal` | Framer Motion fade-up on scroll-into-view |
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
| `FooterCatalogue` | 5×2 (mobile) / 10×1 (desktop) grid of every painting, mounted above `<Footer />` on every page (Welcome / Collections / About / PaintingDetail). Lets a reader who scrolled to the bottom step sideways into any other piece without travelling back up to the nav. Whole-grid `whileInView` fade-up; reduced-motion renders statically. |

### Lib utilities

| Module | Purpose |
|---|---|
| `lib/asset.ts` | `asset()` URL helper + `webp()` extension swap |
| `lib/cn.ts` | classnames helper |
| `lib/usePageTitle.ts` | `document.title` hook — still used by Welcome / Basket / OrderResult / Legal / NotFound. Pages with richer SEO needs (PaintingDetail / Collections / About / FAQ / Contact) use `<Seo>` instead — **don't double-set titles** (a page uses one OR the other, never both) |
| `lib/seo.ts` | `SITE_URL` constant + `absoluteUrl()` / `pageTitle()` / `firstSentence()` helpers for the meta system |
| `lib/basket.ts` | localStorage-backed basket store + `useBasket()` hook (no Redux/Zustand) |

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

  **Bundle discount**: when items count ≥ 2, programmatically mints a single-use Stripe coupon — 5% off for 2 items, 10% off for 3+, `duration: "once"`, name "Estate bundle thank-you" — applied via `discounts: [{ coupon: id }]`. Wrapped in try/catch; mint failures fall back to the un-discounted session (never block checkout). When a bundle discount is applied, `allow_promotion_codes` is omitted (Stripe disallows both together); without a bundle, promo codes stay enabled so the thank-you code remains redeemable.

  Single-item metadata keys preserved + extended with `tier_id`, `tier_label`, `framing`. Multi-item metadata adds `tier_ids`, `tier_labels`, `framing_flags` (comma-joined, truncated to Stripe's 500-char per-value cap).
- **`api/stripe-webhook.ts`** — verifies signature with `STRIPE_WEBHOOK_SECRET`. On `checkout.session.completed`: (1) logs the order to Vercel function logs, (2) mints a single-use Stripe coupon + promotion code (10% off, 1-year validity, prefix `FRIENDS-`), (3) sends the buyer the estate-branded `OrderConfirmation` email via Resend (BCC info@themandalacompany.com). **Always returns 200** even if email / coupon creation fail — Stripe must not retry on downstream errors. Imports email templates from `api/_lib/emails/` (same Vercel bundle — gotcha #5 OK).
- **`api/_lib/emails/OrderConfirmation.tsx`** — React Email template, inline-styled in cream/ink/accent palette, Playfair Display + Inter via Google Fonts. Includes order summary, estate-voice thank-you, gift card showing the thank-you code, dispatch expectations, contact line. Rendered server-side by `@react-email/render`.
- **`api/_lib/emails/OrderShipped.tsx`** — wired to `POST /api/admin/order-shipped` (below). Sent when Hugo posts a tracking number for a dispatched session.
- **`api/admin/order-shipped.ts`** — manual admin endpoint Hugo hits when a Point 101 dispatch goes out. Authenticated with `ADMIN_API_KEY` (Vercel env var). Body: `{ sessionId, trackingUrl, carrier, secret }`. Looks up the Stripe session (for buyer email + per-line metadata), renders `OrderShipped` and sends via Resend (BCC the estate inbox). Example:
  ```bash
  curl -X POST https://uncle-tribute.vercel.app/api/admin/order-shipped \
    -H "Content-Type: application/json" \
    -d '{ "sessionId": "cs_live_…", "trackingUrl": "https://…", "carrier": "Royal Mail Tracked 48", "secret": "$ADMIN_API_KEY" }'
  ```
  A tiny one-page HTML admin form on top of this would be a small future lift.
- **`api/_lib/emails/styles.ts`** — shared inline-style objects (palette mirrors `tailwind.config.ts`).
- **`api/_lib/thankYouCode.ts`** — creates the per-order Stripe Coupon + PromotionCode pair. 10% off, single use, 365-day validity. Suffix is 6 random chars from an unambiguous alphabet (no 0/O/1/I).

### Thank-you discount — the dignified register

The estate sends a **single-use 10% promotion code** to every first-time buyer inside the order confirmation email — NOT a banner, popup, or "10% OFF" badge on the site. Framing: *"In thanks for being among the first to take one of Steve's prints into your home, please accept 10% towards a future print, with our warmth."* Valid for one year. Code shape: `FRIENDS-AB12CD`.

**Fallback**: if the dynamic coupon mint fails, the webhook falls back to a static reusable code (env var `THANK_YOU_CODE_FALLBACK`, default `FRIENDS`). For the fallback to actually grant a discount, Hugo must create a matching promotion code in the Stripe dashboard: Dashboard → Products → Coupons → New (10% off, "Once", no expiry) → attach a promotion code with that name. Otherwise leave the fallback unused — the dynamic path is the production design.

### Shipping (flat rates hardcoded in `api/checkout.ts`)
- UK: £15
- Europe: £35
- Worldwide: £60

### Required Vercel env vars
(Settings → Environment Variables, all for Production + Preview, Sensitive ON for secrets)

| Key | Required | Value |
|---|---|---|
| `STRIPE_SECRET_KEY` | yes | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | yes | `whsec_…` |
| `SITE_URL` | yes | `https://uncle-tribute.vercel.app` |
| `RESEND_API_KEY` | optional | `re_…` — without it, confirmation emails are skipped silently (Stripe still sends its own receipt) |
| `ESTATE_FROM_EMAIL` | optional | sender address (default `info@themandalacompany.com`); must be on a Resend-verified domain |
| `ESTATE_BCC_EMAIL` | optional | BCC for the paper trail (default `info@themandalacompany.com`); auto-skipped if same as `from` |
| `THANK_YOU_CODE_FALLBACK` | optional | static code used if dynamic coupon mint fails (default `FRIENDS`) |
| `ADMIN_API_KEY` | required for `/api/admin/order-shipped` | shared secret Hugo passes in the request body to authenticate the shipped-email admin endpoint |

### Resend setup (Hugo — before going live with emails)

1. Create a free Resend account at https://resend.com (3,000 emails/month free).
2. **Verify the domain** `themandalacompany.com` in Resend → Domains → Add — copy the SPF/DKIM TXT records into IONOS DNS. Allow ~15 min for DNS propagation. Without domain verification, Resend will only let you send from `onboarding@resend.dev` (fine for testing, never for production — Gmail will junk it).
3. Create an API key (Resend → API Keys → Create), copy the `re_…` value once (Resend won't show it again).
4. Add `RESEND_API_KEY` to Vercel env vars for Production + Preview.
5. Optionally create the sender alias `info@themandalacompany.com` in your mail host (IONOS) so replies route somewhere — Resend itself only sends, it doesn't receive.

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
4. **Resend domain verification** for `themandalacompany.com` — required before order confirmation / newsletter welcome emails will land in inboxes (Gmail will junk anything from `onboarding@resend.dev` in production). See the Resend setup recipe above.
5. **A0 enablement (needs Agent K research outcome)** — confirm Point 101 fulfilment capability + optional gold-leaf detail sourcing. When ready, flip `available: true` on the `heirloom` tier in `src/data/paintings.ts PRINT_TIERS` AND in `api/checkout.ts TIERS["heirloom"]`. Agent K is researching framed-shipping math in parallel — outcome may affect shipping rates on A1 framed items.
6. **Point 101 account** + upload Stephen's high-res files
7. **Etsy → Tide payout** (set bank in Etsy Finances)
8. **About page polish** — `/public/img/welcome/04-paintings-collection.jpg` is kept on disk specifically for an About-page section we discussed but haven't built
9. **Optional: Web3Forms backend for EnquireModal** — currently falls back to mailto + clipboard; add `VITE_WEB3FORMS_KEY` env var to enable real POSTed form submission
10. **Update `api/email-basket.ts` to be tier-aware** — currently still references the legacy £180 / A2 spec for rendering the saved-basket email. Low priority — the basket page no longer surfaces a mis-priced number, but the saved-basket email will read £180 until updated.
11. **P2 — webhook dedup needs Vercel KV.** `api/stripe-webhook.ts` deduplicates Stripe event ids in-memory (24h TTL, 5000-entry cap). This catches the common case (network blip retry while the warm instance is still in memory) but won't survive cold starts or cross-region replication. Full fix: move to Vercel KV or a tiny DB keyed by `event.id`.

---

## Repo structure

```
/api                          Vercel serverless functions
  checkout.ts                 Stripe Checkout session creator (SELF-CONTAINED)
  stripe-webhook.ts           Stripe webhook receiver (signed, in-memory dedup)
  newsletter-subscribe.ts     Friends-of-the-estate sign-up (CORS-allowlisted)
  email-basket.ts             Save-your-basket email (CORS-allowlisted)
  /admin
    order-shipped.ts          Manual shipped-email trigger (ADMIN_API_KEY auth)
  /_lib
    emails/                   React-Email templates (OrderConfirmation, OrderShipped, Welcome, BasketSaved)
    thankYouCode.ts           Stripe coupon + promo-code minting

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
5. **Cross-directory ESM imports into `/api`** are flaky on Vercel. Keep `/api/*.ts` files self-contained.
6. **Stripe API version literals** like `"2025-09-30.clover"` may not match the installed SDK's exported type union. Omit `apiVersion` and let the SDK use its pinned default.
7. **Sacred Geometry headline** uses `clamp(60px, 20vw, 520px)` for the font size. Earth image uses a negative margin tied to the *same* clamp expression so overlap stays proportional at every viewport. If editing one, edit the other.
8. **Z-stacking on the home page** — `<main>` carries `isolate` and Sacred Geometry section also carries `isolate` to prevent Framer Motion transforms from re-ordering the peacock backdrop into the foreground during scroll.
9. **Pricing lives in two places** — `src/data/paintings.ts PRINT_TIERS` is the canonical ladder, AND `api/checkout.ts TIERS` map mirrors it inline (gotcha #5 forbids cross-directory imports into `/api`). When updating a tier price (or adding / removing a tier), edit **both** in the same commit. `api/stripe-webhook.ts` also carries small per-tier lookups (TIER_LABEL / TIER_SIZE / TIER_EDITION / TIER_PRICE_PENCE) for rendering the OrderConfirmation email — those need updating too if labels / sizes change.

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

_Last updated: 2026-05-28 (Nathaniel pre-launch cleanup: real Privacy / Terms / Returns pages, /contact + /faq routes, admin shipped-email endpoint, CORS allowlist on newsletter + basket APIs, in-memory webhook event-id dedup, newsletter consent microcopy, customs disclosure on /basket). Keep this file in sync with major architectural changes; line-level bug fixes don't need updates here._
