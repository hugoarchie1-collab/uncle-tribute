# The checklist — the stuff only Hugo can do

**Last updated 2026-09-02.** The site and code are done and live on
themandalacompany.com. Nothing below is code — it's dashboards, DNS and your
bank, so Claude can't click any of it for you. Everything is ordered by how
much money it unlocks. Tick as you go.

Anything marked ✅ is already confirmed done — left in so you don't redo it.

---

## A · Money path — do these before you push the page anywhere

- [ ] **Send one real test order through the LIVE site.** Cheapest print, your
      own card, real address. This is the ONE thing that proves the whole path
      end to end: Stripe → payout → order email → certificate. Do it, then tell
      Claude the session id and it will read the live logs and confirm it fired
      clean.
- [ ] **Check all seven Stripe webhook events are subscribed.** Stripe →
      Developers → Webhooks → your `themandalacompany.com/api/stripe-webhook`
      endpoint. The code handles seven; the endpoint was originally set up with
      only `checkout.session.completed`. Any that are missing, the site simply
      never hears about:
      `checkout.session.expired`, `checkout.session.async_payment_succeeded`,
      `checkout.session.async_payment_failed`, `charge.refunded`,
      `charge.dispute.created`, `charge.dispute.closed`.
      *(Without these: abandoned baskets are never recovered, delayed payments
      never fulfil, and a refund or dispute never revokes the gift code it
      paid for.)*
- [ ] **Confirm `ESTATE_BCC_EMAIL` is set in Vercel.** Every enquiry — trade
      projects, introducers, custom sizes — is sent to it. If it's unset they
      all go to the *from* address instead, which is not an inbox you read.
- [ ] **Confirm `SITE_URL` = `https://themandalacompany.com`** in Vercel, and
      that the Stripe webhook points at that domain rather than the old
      `.vercel.app` one. Both resolve, so this is tidy-up, not breakage.
- ✅ **Resend domain verified** — order, dispatch and enquiry emails land.
- ✅ **Upstash / KV live** — the estate registry, reviews and memories work.
      *(Verify any time with `curl "https://themandalacompany.com/api/auth-lookup?cert=X"` —*
      *`{"found":false}` means it's on; `{"configured":false}` means it's off.)*
- ✅ **`TRADE_ACCESS_CODE` set** — the gated trade price sheet opens.

## B · The Partners page — your biggest intended earner

`/trade` was rebuilt on 2026-09-02 into the bulk-order buyer page (hotels,
wellness, workplace, healthcare, restaurants, developers), with the introducer
door kept as a quieter section lower down. It is deliberately **price-silent**.

- [ ] **Set `PARTNER_TERMS_CODE` in Vercel.** Until it exists, the
      `/partners/terms` commission sheet is gated shut for everyone — including
      partners you've approved. Then share
      `themandalacompany.com/partners/terms` plus the code, privately.
- [ ] **Decide and confirm in writing with the print studio**, because the page
      deliberately promises none of it until you do:
      acrylic glazing for guest rooms and clinical spaces · sealed frame backs ·
      a lead-time matrix by size for projects · a written sample/proof policy.
      Tell Claude the answers and the copy goes in.
- [ ] **Get one photograph of a real installed piece.** The page currently
      leans on the Farmacy SunStar because it's the only genuine installed
      photo the estate has. One real hotel or spa wall is worth more than
      anything else you could add to that page.
- [ ] **Your own in-room images** (the Canva ones). When they're ready, hand
      them over — they need NEW filenames, because assets are cached for a year.
- [ ] **Recruit introducers offline.** The page can't do this for you; five to
      ten credible designers or consultants is the actual accelerator.

## C · Before you spend a penny on ads

- [ ] **Google Search Console** — add and verify the domain, submit
      `/sitemap.xml`. Free, and it's how Google finds every page.
- [ ] **Google Merchant Center** — the feed is live at
      `themandalacompany.com/merchant-feed.xml`. Add it as a scheduled feed for
      free Shopping listings. *(Don't touch the UK-only geo setting — it was
      broken once and is now correct.)*
- [ ] **Turn on Vercel Web Analytics** — project → Analytics → Enable. The tag
      is already in the code, dormant.
- [ ] **Etsy → Tide payout** — Etsy → Settings → Finances → Payment account.
- [ ] **(Optional) ad tracking** — add `VITE_META_PIXEL_ID`, `VITE_GA4_ID`,
      `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN` in Vercel, then **Redeploy**
      (anything starting `VITE_` is baked in at build time). All the code is
      there, dormant, and nothing breaks without them.
- [ ] **(Optional) Klaviyo** — `KLAVIYO_API_KEY`, `KLAVIYO_LIST_ID`,
      `VITE_KLAVIYO_COMPANY_ID`.

## D · Housekeeping

- [ ] **If Klarna / Clearpay are on in Stripe, tell Claude** so the marks get
      added to the payment row — they're deliberately left off the site until
      you confirm, so buyers are never shown a method that isn't there.
- [ ] **Don't cancel IONOS** until the old-site export is confirmed saved
      (Wayback archive is at `~/Code/mandala-archive`).
- [ ] Keep posting on the socials — they're wired into the site's brand schema,
      so the `sameAs` signal stays strong.

---

## What Claude needs from you to go further

These are decisions, not tasks — each one unblocks copy that is currently
withheld because it would otherwise be a claim the estate can't stand behind:

1. The glazing / backs / lead-time / sample answers in section B.
2. Whether the product page keeps its drawn scale diagram (a wall + sofa
   outline) or loses it along with the room mock-ups.
3. Whether commissions by Polly are offered as **new original work**, or only
   as hand-finishing on top of an existing print. The site currently says both
   in different places; the Partners page uses the narrower, safer wording.

**Bottom line:** the code is done and deployed. Section A is the "can I take
money safely" gate, B is the "make the Partners page earn" gate, C is the
"now grow it" gate.
