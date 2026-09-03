---
description: Re-read CLAUDE.md + the live data files and summarise the current project state
---

You are continuing work on **The Art of Stephen Meakin** (themandalacompany.com) — a memorial tribute site and Stripe-powered print shop for the late British mandala artist **Stephen Meakin (SEM, 1966–2021)**, run by his family as **The Mandala Company** (a trading name, not a charity). Built by his nephew Hugo. Re-read the source of truth before doing anything else.

## Step 1 — the source of truth

Read **`CLAUDE.md`** at the repo root in full. Start with the **⚠️ Current live state** callout at the top — it is dated, newest first, and supersedes anything further down. It covers the tech stack, brand and design system, every route, the Stripe architecture, env vars, what is done vs pending, and the critical gotchas.

## Step 2 — the live data files

These move faster than CLAUDE.md and are the actual current state:

| File | What it holds |
|---|---|
| `src/data/paintings.ts` | `PAINTINGS`, `COLLECTIONS`, `PRINT_TIERS` (the price ladder), `ESTATE_AUTHENTICATION`, frame/glazing/paper options. **The money source of truth.** |
| `src/data/content.ts` | `WELCOME` / `ABOUT` prose, `CREDENTIALS`, `MEMORIAL_QUOTE`, `TRIBUTE` (Polly's funeral words — untouchable) |
| `src/data/faqs.tsx` | The single FAQ set, rendered on `/contact#faq` and every product page |
| `api/checkout.ts` | Stripe Checkout + trade quoting + the gated partner/trade sheets |
| `api/stripe-webhook.ts` | Order fulfilment, gift-code minting, dispute handling |
| `api/newsletter-subscribe.ts` | Newsletter **and** the trade / introducer application forms |

## Step 3 — the rules that are not in the code

Read these before proposing anything; each was learned the hard way.

**Money is the highest rule.** Advertised price must equal charged price, to the penny. The ladder in `paintings.ts` is mirrored by hand into `api/checkout.ts`, `api/stripe-webhook.ts` and `api/email-basket.ts` — change one, change all four. `npm run build` runs `check-invariants.mjs` + `check-faq-mirror.mjs` and fails on drift; never bypass them.

**Never claim buyer-visible things that aren't true.** Prints are estate-stamped, never *signed* (Stephen died in 2021). The printer (Giclee & Co, Brighton) is **never named** to buyers — say "a specialist giclée studio on the Sussex coast". Nothing is ever rolled: flat and boxed only. Canvas is a flat print, not stretched or ready to hang.

**`/trade` (nav label "Partners") is price-silent.** No percentages, no discount or commission figures, and never the words affiliate / referral / earn. Trade and introducer numbers live only behind the gated `/trade/pricing` and `/partners/terms`.

**Hugo's standing design rules.** Content must FILL the screen — he works on a 4K display and hates empty space and small text. No plain black, no black boxes behind text (legibility comes from `.reading-shadow`, never a scrim). Eyebrows are Fraunces sentence-case, never uppercase letter-spaced sans. Never invent visible words — titles and captions come from `content.ts`. **Never add in-room / on-the-wall mock-up images** — he is making those himself in Canva.

**Verify in a browser before saying anything is done.** A green build and a clean lint are not verification; he treats an unverified claim as a lie.

## Step 4 — traps that cost real time

- **`useSearchParams` scroll-jumps the page to the top.** `ScrollManager` in `PageTransition.tsx` keys on `search`. In-page tabs and filters must use `history.replaceState`.
- **`window.scrollTo` is a no-op** — the page roots are `overflow-x-clip`. Use `scrollIntoView` on a real element. (When testing in the browser tool, click the page once to give it focus, then press End.)
- **`border-line/N` is not a softer hairline** — it resolves to cream at N%, ~6× brighter than bare `border-line`. For a softer rule use `border-ink/8`.
- **Assets are cached immutable for a year.** Changing an image REQUIRES a new filename.
- **Vercel Hobby caps a deploy at 12 Serverless Functions and the project is at 12.** A new endpoint must fold into an existing file behind a `kind` branch.
- **A lead-capture endpoint must never return 200 when it did not deliver** — see the `trade-application` branch.
- **Hugo runs two or more sessions in ONE working tree.** NEVER `git add -A` or bare-commit: you will sweep another session's half-finished files. Stage only your own paths, or do multi-step work in a `git worktree` off `origin/main`. Push fast-forward only.

## Step 5 — report back

In under 250 words:

- **State** — what is deployed and verified working
- **In flight** — anything mid-debug or unverified, cross-referenced against the Current live state callout
- **Pending** — the top 3 from CLAUDE.md's "What's pending / next"
- **Recent commits** — `git log --oneline -5`
- **Drift** — anything newer than CLAUDE.md itself (`git log -1 -- CLAUDE.md` vs `git log -1`), and whether the working tree is dirty from a parallel session (`git status --short`)

End with: "Ready. What do you want to work on?"
