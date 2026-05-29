# SESSION HANDOVER — The Art of Stephen Meakin

_Written 2026-05-28. The complete record of a large build session. Read this + `CLAUDE.md` to resume with full context. Pair with `/read-context`._

---

## ⚡ TL;DR — where things stand

- **The site is functional and LIVE** at https://uncle-tribute.vercel.app. Everything is merged to `main` (HEAD = PR #70) and deployed.
- **Checkout WORKS.** The entire "Order print" saga that started this project is solved (it was three stacked bugs — see "The checkout saga" below).
- **The site is ~95% technically done.** The thing between you and a £1M company is **distribution, not more code** (press, a list, a gallery show, a monograph). Five expert agents independently agreed on this.
- **Your immediate to-dos are config + business actions, not code** — see "WHAT YOU NEED TO DO NEXT".

---

## 🔑 CREDENTIALS & WHERE EVERYTHING LIVES

| Thing | Where / detail |
|---|---|
| **Live site** | https://uncle-tribute.vercel.app (migrating → https://themandalacompany.com) |
| **GitHub repo** | https://github.com/hugoarchie1-collab/uncle-tribute · username `hugoarchie1-collab` |
| **Working branch** | `claude/memorial-website-scroll-intro-a8VOZ` (fully merged into `main`) |
| **Vercel** | team `the-mandala-company`, project `uncle-tribute`. Dashboard: https://vercel.com/the-mandala-company/uncle-tribute |
| **Stripe** | In **your name** (Hugo). Payout → Tide. Confirmed fine as a sole trader — register self-employed with HMRC. |
| **Tide bank** | ClearBank 04-06-05 …3798 (verify Stripe payout account name matches yours) |
| **Domain** | themandalacompany.com registered at **IONOS** (https://my.ionos.co.uk). Currently still serving the OLD Apache/WordPress site. |
| **Print fulfilment** | Point 101, London (https://point101.com) — **NO API, manual fulfilment** |
| **Etsy** | You HAVE a seller account. Listing pack ready (see Yvonne below). |
| **Email sending** | Resend (https://resend.com) — **NOT set up yet** |
| **GitHub PAT** | A 90-day classic token (`repo` scope) was created for pushes ("claude-push-4"). It's in your GitHub settings → Tokens. **Revoke it when the project's done.** Not stored in any file (security). |

### Vercel environment variables (Settings → Environment Variables)
| Key | Status | Value |
|---|---|---|
| `STRIPE_SECRET_KEY` | likely set (checkout reached Stripe) — **verify** | `sk_live_…` |
| `SITE_URL` | likely set — **verify** | `https://uncle-tribute.vercel.app` (change to themandalacompany.com after domain cutover) |
| `STRIPE_WEBHOOK_SECRET` | set | `whsec_…` |
| `RESEND_API_KEY` | **NOT set** — needed for ALL emails | `re_…` |
| `ADMIN_API_KEY` | **NOT set** — needed for the "mark shipped" endpoint | any long random string (`openssl rand -hex 32`) |
| `RESEND_AUDIENCE_ID` | optional | from Resend → Audiences |
| `NEWSLETTER_DISCOUNT_PCT` | optional (default 10) | e.g. `10` |
| `ESTATE_FROM_EMAIL` / `ESTATE_BCC_EMAIL` | optional (default info@themandalacompany.com) | |

---

## ✅ WHAT YOU NEED TO DO NEXT (detailed, in priority order)

### A. Turn the business ON (config — ~45 min total, all in dashboards)
1. **Verify Stripe env vars + do one real test purchase.** Painting → add to basket → checkout → pay (test card `4242 4242 4242 4242` in test mode, or a real £1-ish live order) → confirm you land on `/order/success` (not a 404) and the basket clears.
2. **Enable Vercel Web Analytics**: Vercel → uncle-tribute → Analytics tab → Enable. (Code's already in; this switches on measurement. You currently have ZERO analytics — this is the #1 strategic gap.)
3. **Set up Resend** (so confirmation/welcome/shipped emails actually fire):
   - Sign up at resend.com → add domain `themandalacompany.com` → copy the 3 TXT records into IONOS DNS → verify.
   - Create an API key → add as `RESEND_API_KEY` in Vercel (Production + Preview, Sensitive ON) → redeploy.
4. **Create `info@themandalacompany.com` mailbox in IONOS** → forward to your Gmail (so buyer replies don't bounce).
5. **Add `ADMIN_API_KEY` to Vercel** (long random string) — enables the "mark order shipped" endpoint that sends buyers tracking (chargeback prevention).
6. **(Optional) Create a `FRIENDS` promo code in Stripe** as a fallback for the thank-you discount.

### B. Stop having to merge (YOU must do this — I'm blocked from granting myself the permission)
Pick one:
- **Option A:** In Claude Code run `/permissions` → Allow → add `Bash(git push:*)`. OR create `/Users/archiehugo/Code/uncle-tribute/.claude/settings.local.json` with `{ "permissions": { "allow": ["Bash(git push:*)"] } }`. Then I push straight to `main` forever — no PRs.
- **Option B:** Vercel → Settings → Git → Production Branch → set to `claude/memorial-website-scroll-intro-a8VOZ`. Then my branch pushes deploy to production directly.

### C. Domain cutover (use Zachary's playbook — pasted in chat 2026-05-28)
**ORDER MATTERS — archive the old site FIRST or you lose it.**
1. `brew install wget` → tell me → I mirror the old site to `~/Desktop/mandala-archive/` for safekeeping.
2. Vercel: add `themandalacompany.com` + `www` (set apex primary, www→apex redirect).
3. IONOS DNS: point apex A-record + www CNAME at Vercel's shown values.
4. Change `SITE_URL` env → `https://themandalacompany.com` → redeploy.
5. Update the Stripe webhook endpoint URL to the new domain (mind the signing secret).
6. Smoke-test checkout on the new domain.

### D. Etsy (use Yvonne's pack — pasted in chat 2026-05-28)
- Set up shop (name, About, policies, shipping profile, Tide payout via Etsy Finances → Payment settings).
- List **A3 (£165) + A2 (£325) only** (Etsy fees ≈ 11–26%; price = own-site +~12%). Keep A1/A0/Studio own-site-only.
- Paste-ready titles/descriptions/13 tags/images for all 10 paintings are in the chat pack.
- Funnel: parcel insert card with the URL (you can't link out in Etsy listings).

### E. The £1M engine (off-site — the actual lever; none of this is code)
1. **Analytics on + verify a real purchase** (= A1/A2 above). You're flying blind otherwise.
2. **Build the Friends & Family list to 500+ — start with Stephen's 250+ TAGA students.** Ask Polly for the old class records THIS WEEK. Warmest audience that will ever exist for this work.
3. **Re-open the Farmacy / Al Fayed connection → commit to one physical show in 2026** (Ditchling Museum / Cromwell Place / a Lewes-Brighton gallery — Unique Arts hosted his final show). A room of prints + the press it generates beats a year of site tweaks.
- Then: founder-led PR to *The Simple Things / Resurgence / Kindred Spirit / Sussex Life / World of Interiors* (the story sells itself); a self-published monograph (500 copies) as the compounding asset.
- Realistic: £15–60k year one IF the list + a show happen; £1M is a 3–5 year outcome on list → repeat buyers → annual show → licensing → monograph → original sales.

### F. I OFFERED TO DRAFT THESE — you haven't taken me up yet (just ask):
- ✍️ The **TAGA-student re-contact email** (the note Polly sends to invite students to Friends & Family).
- ✍️ The **press pitch** (hook + per-title angle for the magazines above).

---

## 🧩 DEFERRED / OUTSTANDING (decisions or assets needed from you)

| Item | Needs |
|---|---|
| **`intro.mp4` is 39 MB** | Re-encode to ~3 MB (biggest perf cost). Your video editor, or ask me to do an ffmpeg pass. |
| **Painting images ~1 MB each, no `srcset`** | A proper image-compression pass (the original "WebP pass" didn't actually compress). |
| **Studio £950 one-off shows on ALL 10 paintings** | Decide: available on every painting (reword "one of one") or only select pieces? Then I gate it. |
| **Enneagon year = `[ DATE ]`** | Family to confirm the year (hidden from UI for now, safe). |
| **About Chapter I 1986 milestone** | Reuses Welcome's drafting-table image — needs a 1986 Brighton-era photo. |
| **A0 "Heirloom" £1,250 tier** | Hidden until you email Point 101 to confirm they print A0 on 350gsm Hahnemühle Photo Rag. Then flip `available:true` in paintings.ts + checkout.ts + email-basket.ts (gotcha #9). |
| **Gold leaf** | Wrights of Lymm 22ct transfer leaf (~£15-30/book) — buy when first A0/Studio order lands. |
| **Email templates hardcode `uncle-tribute.vercel.app`** | Update to themandalacompany.com after domain cutover (small code change). |
| **EnquireModal Web3Forms backend** | Optional — currently mailto fallback; add `VITE_WEB3FORMS_KEY` to enable real POST. |
| **Curatorial polish (Cordelia's brief)** | Voice/sequencing refinements we never fully revisited — optional. |

---

## 🤖 THE AGENTS — full roster + what each did (27 total)

**Round 1 — assessment**
1. **Alistair** — niche upgrade research (COA, deep zoom, editions, transactional email)
2. **Beatrice** — bug scan (found the 8 issues; site clean on load)
3. **Cordelia** — curatorial direction (estate vs shop register; the lane to occupy)

**Round 2 — build**
4. **Bertie** — basket flow + multi-item Stripe checkout
5. **Clive** — image pass (no-op: Desktop folder = the deployed library)
6. **Delphine** — section-by-section design audit
7. **Felix** — scroll-trigger proposals (research)
8. **Greta** — competitor pricing → the A2 £295 anchor ladder
9. **Hettie** — funnel components (newsletter/save-basket/exit/share)
10. **Iris** — integrated pricing + funnel wire-ups
11. **Jasper** — applied Felix's top-10 scroll-trigger animations
12. **Kit** — A0 + gold leaf + framing research
13. **Leonora** — Foundation→trading-name sweep + Polly add-on + framing UI
14. **Margot** — supply-chain / security / business / chargeback audit

**Round 3 — pre-launch**
15. **Nathaniel** — real Privacy/Terms/Returns + /contact + /faq + admin shipped-email endpoint + CORS + webhook dedup
16. **Orla** — two-column PDP + typography consolidation
17. **Percival** — "from £145" tiles + collection bundles + £950 Studio one-off tier
18. **Quentin** — scroll performance (GPU-promoted blur, fixed gradient animation)
19. **Rosalind** — mobile footer + "Friends & Family" rename + removed dead Phoenix Place address
20. **Sebastian** — converted the 4 remaining API handlers to Vercel Node signature (incl. webhook raw-body)

**Round 4 — full audit (the "million dollar" check)**
21. **Theodora** — performance / SEO / accessibility audit
22. **Ulysses** — functional + edge-case QA (found the Habundia bundle overcharge)
23. **Verity** — content/copy/factual proofread (found the webhook studio-tier + "signed" contradictions)
24. **Winston** — million-pound strategic gap analysis
25. **Xanthe** — applied the audit fix batch (bugs + per-route SEO + Product JSON-LD + Vercel Analytics + a11y + copy + dead-code cleanup)

**Round 5 — go-live ops**
26. **Yvonne** — complete Etsy launch pack (10 paste-ready listings + setup + strategy)
27. **Zachary** — go-live operations playbook (domain cutover, webhooks, Etsy→Tide, Point 101 workflow, old-site archive)

---

## 🩹 THE CHECKOUT SAGA (so it's never re-debugged from scratch)

The "Order print" button never worked end-to-end. It was THREE stacked bugs, found only once we could read live Vercel logs:
1. **`ERR_MODULE_NOT_FOUND`** — `/api` files used extensionless relative imports; with `"type":"module"`, Vercel's Node ESM resolver needs explicit `.js` extensions. (Fixed: added `.js` to all 9 imports.)
2. **Web-handler signature not delivering** — handlers used `(req: Request) => Response`; Vercel's runtime didn't deliver the returned Response → requests hung → 504/timeout. (Fixed: converted ALL `/api` handlers to Vercel Node `(req, res)` signature; webhook uses `bodyParser:false` + raw-body read for Stripe signature.)
3. **SPA fallback broken** — `cleanUrls:true` in vercel.json made every deep route (incl. `/order/success`) 404 on direct load. (Fixed: removed cleanUrls.)

---

## 💷 CURRENT PRICING (single source: src/data/paintings.ts `PRINT_TIERS`)
Mirror in 3 files when changing (gotcha #9): `paintings.ts`, `api/checkout.ts`, `api/email-basket.ts`.
- **Atelier** A3 £145 (open edition)
- **Collector** A2 £295 (ed. 100) — ANCHOR, "Most chosen"
- **Atelier Grande** A1 £595 (ed. 50)
- **Heirloom** A0 £1,250 (ed. 25) — HIDDEN (`available:false`) until Point 101 A0 confirmed
- **Studio** £950 hand-painted by Polly Wedge (one-of-one) — LIVE on all paintings (decide if intended)
- Add-ons (A2/A1): framing +£295/£395 (cast acrylic, +shipping surcharge); hand-finishing +£350/£495
- Bundle discount at checkout: 5% (2 items) / 10% (3+); collection bundles match this
- Prints are **estate-stamped + hand-numbered + COA — NOT signed** (artist deceased)

---

## 📋 EVERYTHING YOU ASKED FOR THIS SESSION (so nothing's forgotten)

**DONE:**
- ✅ 3 then 6+ agents, all named
- ✅ Bug scan + fixes
- ✅ Basket + checkout page + multi-item
- ✅ Checkout FIXED (the original blocker)
- ✅ Email/discount funnel (10% post-purchase code; pipeline built — needs Resend key to fire)
- ✅ Competitor + pricing (A2 £295 anchor)
- ✅ "from £145" on tiles
- ✅ Scroll-trigger animations + aesthetics
- ✅ Font consistency
- ✅ Two-column PDP (less scroll, side colourways)
- ✅ Polly hand-paint pricing option (£950 Studio)
- ✅ Originals "held privately by the estate" line
- ✅ Foundation→trading-name correction (legal)
- ✅ Author credit (Archie Hugo Charles Wedge)
- ✅ Al Fayed/SunStar photo credit
- ✅ Mobile footer shortened
- ✅ "Friends & Family" rename
- ✅ Phoenix Place dead-address removed
- ✅ Full site audit (perf/SEO/a11y/QA/copy/strategy)
- ✅ SEO (per-route meta + Product schema) + Vercel Analytics added
- ✅ Etsy launch pack (Yvonne)
- ✅ Go-live + supply-chain playbook (Zachary)
- ✅ Stripe-in-your-name confirmed OK

**NEEDS YOU / DEFERRED (above sections):**
- ⏳ Stop-merging permission rule (you add it)
- ⏳ Etsy actual listing (your account; pack ready)
- ⏳ Point 101 link — impossible to automate (no API); manual workflow documented
- ⏳ Stripe/Tide↔Etsy — Stripe can't run Etsy; Etsy Payments→Tide is the link (documented)
- ⏳ Domain cutover + webhook update (your dashboards; playbook ready)
- ⏳ Archive old site (needs `brew install wget`)
- ⏳ Resend + analytics + admin key (config)
- ⏳ intro.mp4 + image compression, A0 enable, Studio intent, Enneagon date, 1986 image

---

_Resume next session: read this + CLAUDE.md, run `/read-context`, then pick up at "WHAT YOU NEED TO DO NEXT"._
