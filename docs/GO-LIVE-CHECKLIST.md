# Go-live checklist — the stuff only Hugo can do

The **site + code are done and live** on themandalacompany.com. None of the below is code — it's dashboards, DNS and your bank, so Claude can't click them for you. Split into "before you take real money" and "before you spend on marketing". Tick as you go.

---

## A · Before you take a single real order (do these first)

- [ ] **Send one £25 test order through the LIVE site.** Buy the cheapest print with your own card, real address. This is the ONE thing that proves the whole money path works end-to-end (Stripe → payout → order email). Do it, then tell Claude the session id and it'll check the live logs confirm it fired clean.
- [ ] **Resend domain verify.** Log in to resend.com → Domains → add `themandalacompany.com` → copy the SPF + DKIM records it gives you into IONOS DNS. ~15 min to propagate. Until this is done your order-confirmation / newsletter emails land in spam. (Stripe still sends its own receipt regardless, so orders aren't blocked — but do this.)
- [ ] **Confirm the Stripe webhook points at the real domain.** Stripe dashboard → Developers → Webhooks → the endpoint should be `https://themandalacompany.com/api/stripe-webhook` (the old `.vercel.app` one still works, this is just tidy). Event: `checkout.session.completed`.
- [ ] **Confirm `SITE_URL` env var = `https://themandalacompany.com`** in Vercel → Settings → Environment Variables.
- [ ] **Point 101** — account open, Stephen's high-res files uploaded, and your leaflet + wax-seal sticker + box logo handed over so they add them to every order. (You said you're doing this now — good.)

## B · Before you spend a penny on ads

- [ ] **Google Search Console** — add + verify `themandalacompany.com`, submit the sitemap (`/sitemap.xml`). This is how Google finds all your pages. Free.
- [ ] **Google Merchant Center** — your product feed is already live at `themandalacompany.com/merchant-feed.xml` (96 products). Add it as a scheduled feed → this powers free Google Shopping listings + paid Shopping ads later. (You already fixed the UK-only geo — don't touch that.)
- [ ] **Turn on Vercel Web Analytics** — Vercel → your project → Analytics → Enable. Free, cookieless, tells you what people actually click. The `<Analytics/>` tag is already in the code, it just no-ops until you flip this.
- [ ] **Etsy → Tide payout** — Etsy → Settings → Finances → Payment account → set to your Tide current account, so Etsy sales land in the same place.
- [ ] **(Optional, when you want tracked ads)** add these Vercel env vars then redeploy: `VITE_META_PIXEL_ID`, `VITE_GA4_ID` (browser pixels), `META_PIXEL_ID` + `META_CAPI_ACCESS_TOKEN` (server-side purchase tracking). All the code is already there, dormant, waiting for the keys. Nothing breaks without them.
- [ ] **(Optional) Klarna / Clearpay** — one toggle in Stripe → Settings → Payment methods. Turn it on and buyers can pay in instalments. If you turn it on, tell Claude so it can add the Klarna/Clearpay marks to the payment row (they're deliberately left off until it's actually enabled).

## C · Don't-forget housekeeping

- [ ] **Do NOT cancel IONOS** until the old-site webspace export is confirmed saved (the Wayback archive is at `~/Code/mandala-archive`, but confirm the IONOS export too).
- [ ] Social profiles (Instagram / Facebook / Pinterest) are already wired into the site's brand schema — just keep posting so the "sameAs" signal stays strong.

---

**Bottom line:** the site is world-class and live right now — you can absolutely show your parents at 11am. Section A is the real "can I take money safely" gate; B is the "now grow it" gate. Everything in code is already done and deployed.
