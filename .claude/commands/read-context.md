---
description: Re-read CLAUDE.md + key data files and summarise the current project state
---

You are continuing work on **The Art of Stephen Meakin** — a memorial tribute website and Stripe-powered print shop. Re-read the project's source of truth and current data so you have an up-to-date picture before doing anything else.

## Step 1 — Read the source of truth

Read `CLAUDE.md` at the repo root in full. This is the authoritative handoff document covering:

- Tech stack, brand & design system
- Routes + Welcome page section order
- Stripe architecture + env vars + Point 101 fulfilment
- What's done vs pending
- Critical gotchas (Lenis, SplitReveal text-shadow, Stripe product images, vercel.json rewrite, cross-directory ESM imports, API version literals, Sacred Geometry clamp coupling, z-stacking isolation)
- **⚠️ Current live state callout near the top — read this first.**

## Step 2 — Read the live data files

These change more often than CLAUDE.md and are the actual current state:

1. `src/data/paintings.ts` — PAINTINGS array, COLLECTIONS, DEFAULT_PRINT (placeholder price), painting ID allowlist
2. `src/data/content.ts` — WELCOME and ABOUT page text
3. `api/checkout.ts` — Stripe Checkout session creator (note: must stay self-contained, no cross-directory imports)
4. `api/stripe-webhook.ts` — webhook receiver

## Step 3 — Summarise back to me

In under 250 words, tell me:

- **State**: what's deployed and verified working?
- **In flight**: anything mid-debug or unverified (cross-reference the "Current live state" section)
- **Pending**: the top 3 items from CLAUDE.md's "What's pending / next" list
- **Recent commits**: run `git log --oneline -5` and list them
- **Anything new** since CLAUDE.md was last touched (compare `git log -- CLAUDE.md | head -1` against `git log -1`)

End with: "Ready. What do you want to work on?"
