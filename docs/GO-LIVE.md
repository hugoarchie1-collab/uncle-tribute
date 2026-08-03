# Go-live runbook — turning on revenue

The site's code is complete. What's left is **operational**: connecting your own
third-party accounts by pasting their keys into Vercel. Nothing here needs code
changes. Every feature **degrades gracefully** when its key is absent — the site
never errors, it just stays quiet until the key exists.

**Where to paste keys:** Vercel → project `uncle-tribute` → Settings →
Environment Variables → add for **Production _and_ Preview** (turn on
"Sensitive" for secrets). Anything starting with **`VITE_`** is baked in at
build time — after setting those, **Redeploy** (Deployments → ⋯ → Redeploy) or
they won't take effect. Non-`VITE_` keys apply on the next request, no redeploy
needed.

Do them in this order — highest impact first.

---

## 1. Upstash (KV) — unlocks the live reviews wall, memories auto-publish, webhook dedup  ⏱️ ~5 min

Without this, submitted reviews are held/emailed but the public reviews wall
stays empty, and the memories wall falls back to its seed list.

1. In Vercel → **Storage** → **Create Database** → **Upstash Redis** (the
   marketplace integration). Connect it to the `uncle-tribute` project.
2. Vercel injects the credentials automatically. Confirm these exist under
   Environment Variables (either naming works — the code accepts both):
   `KV_REST_API_URL` + `KV_REST_API_TOKEN`, **or**
   `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.
3. Done — reviews now auto-publish after moderation, and `/reviews` + product
   pages fill from real submissions.

## 2. Resend — turns on every email  ⏱️ ~15 min (incl. DNS wait)

Order confirmations, dispatch + "leave a review" emails, quiz email capture,
abandoned-basket recovery, newsletter welcome — all silent until this is set.

1. Create an account at **https://resend.com** (3,000 emails/month free).
2. **Domains → Add** `themandalacompany.com`. Copy the SPF/DKIM records Resend
   shows into **IONOS** DNS. Wait ~15 min for it to verify. *(Skipping domain
   verification means Gmail junks your mail — don't skip it.)*
3. **API Keys → Create**, copy the `re_…` value once.
4. In Vercel set:
   - `RESEND_API_KEY` = `re_…`
   - `ESTATE_FROM_EMAIL` = `info@themandalacompany.com` (optional; this is the default)
   - `ESTATE_BCC_EMAIL` = `info@themandalacompany.com` (optional; your paper-trail copy)

## 3. Klaviyo — CRM, abandoned-cart + quiz-lead nurture  ⏱️ ~10 min

Captures the emails the quiz + newsletter collect and runs automated flows.

1. Create a **Klaviyo** account. Create a list (e.g. "Friends of the estate") →
   copy its **List ID**.
2. Settings → API Keys: copy the **Private API key** and the **Public (site) ID**.
3. In Vercel set:
   - `KLAVIYO_API_KEY` = the private key (server events + list subscribe)
   - `KLAVIYO_LIST_ID` = the list id
   - `VITE_KLAVIYO_COMPANY_ID` = the public site id *(VITE_ → redeploy)*

## 4. Analytics — so you can measure and optimise  ⏱️ ~15 min

Nothing in the funnel is measurable until these exist. All consent-gated
already (UK PECR-safe).

- **GA4:** create a property → copy the Measurement ID (`G-XXXX`) →
  `VITE_GA4_ID` *(VITE_ → redeploy)*.
- **Meta Pixel (browser):** create a Pixel → copy its ID → `VITE_META_PIXEL_ID`
  *(VITE_ → redeploy)*.
- **Meta Conversions API (server-side Purchase):** in Events Manager create a
  CAPI access token → set both `META_PIXEL_ID` and `META_CAPI_ACCESS_TOKEN`.
  *(The browser deliberately does NOT fire Purchase — CAPI is the sole source,
  so there's no double-count.)*

## 5. Stripe dashboard — buy-now-pay-later  ⏱️ ~2 min

In the Stripe dashboard → Settings → Payment methods, enable **Klarna** and
**Clearpay/Afterpay**. Already wired in checkout — just toggle them on. Lifts
AOV on the higher-priced editions.

## 6. Partner (affiliate) programme — your decision, then two settings

- **Attribution already works:** a partner shares `themandalacompany.com/?ref=THEIR-CODE`.
  On any resulting order, `partner_ref` appears in the Stripe order's metadata —
  that's how you know whom to pay. No setup needed.
- **Commission terms:** decide the actual rate/arrangement (only you can — it's a
  real financial commitment). Today the Partners page keeps this **private and
  price-silent** by design, and terms are arranged 1:1 by email, which is the
  recommended posture for a memorial estate. If you later want a gated partner
  terms sheet with figures, tell me the numbers and I'll build it behind an
  access code (same pattern as `/trade/pricing`).
- `TRADE_ACCESS_CODE` (optional) un-gates the `/trade/pricing` trade sheet for
  approved buyers.

---

## Reviews — how they fill (no fabrication, ever)

The reviews wall is empty on purpose until real customers write. After Upstash
(step 1) + Resend (step 2) are on, the loop runs itself:

1. You mark an order shipped (`/admin/order-shipped.html`). The dispatch email
   now includes a **"leave a review"** link.
2. The customer submits a rating + words (+ optional photo) on the product page
   or `/reviews`. It's **moderated**, then **auto-published** to the wall (KV).
3. Their words appear on `/reviews`, the product page, and — once real ratings
   exist — as ⭐ star rich-snippets in Google (the schema is already wired,
   emitted only when genuine reviews exist).

Never paste invented reviews. Fake reviews are illegal in the UK (DMCC Act 2024)
and would damage Stephen's name far more than an empty wall.

---

## One-line status

Everything on the site is coded, live, and honest. Revenue turns on as you paste
the keys above — roughly a 45-minute afternoon, most of it waiting on DNS.
