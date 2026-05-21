# Site Punchlist

The single source of truth. Nothing gets touched that isn't on this list.

## Rules

1. **One section at a time, top to bottom.** No skipping. Current section is marked 🔧.
2. **Every item must be ✅ before moving to the next section.** No half-finished sections.
3. **If a new issue surfaces while working,** add it to the section's list (or to "Deferred" if it's polish). Don't lose it, don't act on it mid-pass.
4. **"Approved" means Hugo signed off after looking at the live site.** Not "Claude says it's done."

## Status legend
- ⬜ Not started
- 🔧 In progress (only one item at a time)
- 👀 Awaiting Hugo review on live site
- ✅ Approved
- 🚧 Blocked — needs Hugo input / asset / decision
- ⏭ Deferred to post-preview

## Working order
1. **Site foundation** (nav, footer, aura, fonts, spacing — affects every page)
2. **Home page** (top to bottom, section by section)
3. **Collections page**
4. **Painting Detail page**
5. **About page**
6. **Legal pages (Privacy / Terms / 404)**
7. **Final cross-page QA pass**

---

## ⚙ SITE FOUNDATION

### F1. Nav
- ⬜ Logo emblem renders (CSS-masked SVG, cream)
- ⬜ Wordmark "The Art of Stephen Meakin" beside emblem
- ⬜ Three links: Home · Collections · About
- ⬜ Active link underlined in accent
- ⬜ Bg becomes bg-bg/92 + backdrop-blur on scroll past 40px
- ⬜ Hover underline animation feels smooth

### F2. Footer
- ⬜ Logo + wordmark in left column
- ⬜ Tagline paragraph + Foundation attribution
- ⬜ "Site" column with three links
- ⬜ "Studio" column with Phoenix Place address
- ⬜ Copyright line + Privacy/Terms links
- 🚧 Real email address for Foundation contact

### F3. Ambient Aura (global)
- ⬜ Visible on Home (warm gold + copper)
- ⬜ Visible on Collections (rose + cool blue)
- ⬜ Visible on About (copper + deep violet)
- ⬜ Visible on Painting Detail (alongside colourway wash)
- ⬜ Blooms pulse / drift slowly — feels alive, not static
- ⬜ Brightness — strong enough to read against bg, not overwhelming

### F4. Typography scale (global)
- ⬜ H1 (hero only): clamp(40px, 5.6vw, 80px)
- ⬜ H2 (every section header): clamp(32px, 4vw, 56px)
- ⬜ H3 (cards): clamp(20-22px, 2vw, 26-28px)
- ⬜ Eyebrow: 11px tracking-0.36em uppercase text-accent
- ⬜ Body: 16-17px leading-1.75 text-ink/85
- ⬜ Display family: Bodoni Moda
- ⬜ Sans family: Inter
- ⬜ No third family anywhere

### F5. Section rhythm (global)
- ⬜ All content sections: py-20 md:py-28
- ⬜ Full-bleed image moments: tight padding by design
- ⬜ Section-to-section transitions feel intentional, not abrupt

---

## 🏠 HOME PAGE

### H0. Intro Video
- ⬜ Plays automatically muted on load
- ⬜ Boomerang (forward + 2× reverse) loops seamlessly
- ⬜ Quality crisp at fullscreen (2560×1440 source)
- ⬜ No pixelation
- ⬜ Reverse motion smooth (no jumpy frame skipping)
- ⬜ Fades out as user scrolls past
- ⬜ Poster shows correct first frame
- ⬜ Honors prefers-reduced-motion (poster only)

### H1. Hero — Ovalen split
- ⬜ Eyebrow: "In memoriam · 1966 — [DATE]"
- ⬜ H1: opening quote ("So here we are on Earth — orbiting a Sun Star…")
- ⬜ Body paragraph (reminder text)
- ⬜ CTA button: "Explore the collections →" (magnetic hover)
- ⬜ Wild Rose painting image on right
- ⬜ Stacks correctly on mobile
- 🚧 PASSING_DATE — fill in real date

### H2. Featured Works
- ⬜ H2: "Featured works"
- ⬜ "View all 11 →" link top-right
- ⬜ 4 paintings in 2-col mobile / 4-col desktop grid
- ⬜ Painting titles below image
- ⬜ Year captions when known
- ⬜ Hover lifts shadow / scales subtly

### H3. Press Strip
- ⬜ "Exhibited at" centred accent eyebrow
- ⬜ 6 venues with accent-coloured separators
- ⬜ Refined 13px tracking-0.18em uppercase

### H4. Passing Note
- ⬜ Gradient rule line above (transparent → accent → transparent)
- ⬜ "Steve passed away in [DATE]" in display medium
- ⬜ Matching rule line below
- 🚧 PASSING_DATE — fill in real date

### H5. Portrait + Invocation
- ⬜ Stephen portrait image (denim shirt) on left
- ⬜ Eyebrow: "In Steve's own words…"
- ⬜ H2 quote: "The Art of Mandala with internationally renowned mandala artist Stephen Meakin."
- ⬜ Bio paragraph 1
- ⬜ Items align vertically across grid

### H6. Studio (full-bleed image)
- ⬜ Stephen painting in studio image fills viewport width
- ⬜ Top + bottom edges fade (soft-edge-y)
- ⬜ Parallax on scroll

### H7. Generative Mandala (scroll-drawn)
- ⬜ 230vh section, sticky inner pinned to viewport
- ⬜ Lines draw one by one as user scrolls
- ⬜ No image, no rotation, no scale
- ⬜ No "scroll to draw" text
- ⬜ Cosmic dot-stars fade in first
- ⬜ Sunburst rays draw outward
- ⬜ Concentric framing circles
- ⬜ Band ticks + dots
- ⬜ Inner ring
- ⬜ Six petals draw in sequence
- ⬜ Inner petal echoes in accent gold
- ⬜ Six satellite circles + spirals
- ⬜ Central nucleus + spiral
- ⬜ Fully drawn by scroll progress = 0.5
- ⬜ Section bg transparent, aura shows through

### H8. Four Traditions (Sacred Geometry)
- ⬜ Eyebrow: "Sacred Geometry"
- ⬜ H2: "Four traditions, woven into one visual language."
- ⬜ 4 cards: I Insular Island Arts / II Rose Windows / III Persian Geometry / IV Tibetan Mandala
- ⬜ Accent top-border only — no boxed background
- ⬜ Hover brightens border
- ⬜ Closing bio paragraph centred below

### H9. Mandalas Wall (full-bleed image)
- ⬜ Collection of paintings image fills viewport width
- ⬜ Edges fade
- ⬜ Parallax

### H10. The Craft (Process)
- ⬜ Eyebrow: "The Craft"
- ⬜ H2: "Each painting is a ritual."
- ⬜ Drafting-table image on left (60% width)
- ⬜ Two body paragraphs
- ⬜ 6-item materials grid: Surface · Frame · Tools · Pigment · Time · Edition

### H11. Arista SunStar
- ⬜ Eyebrow: "Arista SunStar · 2016"
- ⬜ H2: "A 3.6-metre commission for Notting Hill."
- ⬜ Bio paragraph 3
- ⬜ SunStar image below, centred, max-w 520px, 16:9

### H12. Three Collections promo
- ⬜ H2: "Three collections"
- ⬜ "Explore all →" link
- ⬜ 3 cards: Habundia · Genesis · Born in the Sky
- ⬜ Each card: backdrop image + paintings count + title
- ⬜ No box outline (clean image then text)
- ⬜ Title shifts to accent on hover

### H13. Sacred Geometry closer (Earth limb)
- ⬜ Section transparent — aura shows through
- ⬜ Headline "Sacred / Geometry." sized to fill viewport width
- ⬜ No horizontal overflow on any screen
- ⬜ Earth image scaled large, anchored bottom
- ⬜ Earth top dissolves via mask into the aura (no hard edge)
- ⬜ Earth's curve scrapes the bottom of "Geometry."

### H14. The Estate (engagement cards)
- ⬜ Eyebrow: "The Estate"
- ⬜ H2: "Continue Stephen's work."
- ⬜ 3 cards: Prints · Visit · Foundation
- ⬜ Each card: eyebrow + title + body + CTA arrow
- ⬜ Accent top-border, brightens on hover
- 🚧 Real Prints contact email
- 🚧 Real Visit contact email
- 🚧 Real Foundation contact email

---

## 🖼 COLLECTIONS PAGE

### C1. Nav state
- ⬜ Transparent at top, scrolls to bg-bg/92

### C2. Backdrop layer (fixed)
- ⬜ Each collection has its own backdrop image
- ⬜ Backdrop blurred (12px) with saturation boost
- ⬜ Visible throughout each collection's scroll window
- ⬜ Crossfades between collections smoothly
- ⬜ Soft radial scrim for text legibility

### C3. Collection I — Habundia
- ⬜ Eyebrow: "I · N Paintings"
- ⬜ H2: collection title
- ⬜ Description paragraphs
- ⬜ Painting grid below (2-col mobile / 3-col desktop)
- ⬜ Painting tiles aspect-square with shadow + scale-on-hover

### C4. Collection II — Genesis
- ⬜ Same structure as Habundia
- ⬜ Sussex Milky Way backdrop visible

### C5. Collection III — Born in the Sky
- ⬜ Same structure
- ⬜ Helix Nebula backdrop visible
- ⬜ Odd painting (5th) centres correctly on its row

### C6. Hash-anchor navigation
- ⬜ /collections#collection-habundia scrolls to Habundia section
- ⬜ /collections#collection-genesis works
- ⬜ /collections#collection-born-in-the-sky works
- ⬜ Smooth scroll, not instant

---

## 🎨 PAINTING DETAIL PAGE

### P1. Ambient backdrop
- ⬜ Background tinted by selected colourway's hex
- ⬜ Colour switches when user picks new swatch
- ⬜ Smooth crossfade between colourways (not abrupt)
- ⬜ Visible behind painting + text
- ⬜ Doesn't overwhelm content readability

### P2. Back link
- ⬜ "← {Collection name}" at top-left of main
- ⬜ Hover shifts to accent
- ⬜ Links back to /collections#collection-{id}

### P3. Painting hero
- ⬜ Strict square / natural-ratio rectangle
- ⬜ No blur, no soft-edge mask, no heavy drop shadow
- ⬜ Crossfades when colourway changes
- ⬜ Image loads at full resolution

### P4. Title block
- ⬜ Collection badge centred
- ⬜ Painting title (H1, clamp 32-56px)
- ⬜ Metadata grid: Date · Size · Painted in

### P5. Artist quote (if present)
- ⬜ Centred quote with accent left-border
- ⬜ "— Stephen Meakin" attribution

### P6. Description body
- ⬜ Paragraphs separated by 1.25rem
- ⬜ 16-17px leading-1.75 ink/90
- ⬜ Max-w 640px centred

### P7. Original print spec
- ⬜ Separator above
- ⬜ "Original Print" eyebrow
- ⬜ Spec paragraph

### P8. Colourways
- ⬜ Separator above
- ⬜ "Colourways · N" / "Original colourway" label
- ⬜ COLOURWAY_NOTE paragraph when alt colourways exist
- ⬜ Swatches: w-12 round, show actual colour, not black
- ⬜ Selected swatch has ring-2 ring-ink with offset
- ⬜ Unselected have subtle ring-white/25
- ⬜ Click swatch → painting + ambient + name all update
- ⬜ Selected colourway name + Original badge below swatches

---

## 📖 ABOUT PAGE

### A1. Hero
- ⬜ Stephen at gallery photo (full-bleed)
- ⬜ Eyebrow at top: "In memoriam · 1966 — [DATE]"
- ⬜ H1: "Stephen<br/>Meakin"
- ⬜ Subtitle: "SEM · Mandala Artist & Sacred Geometer"

### A2. Opening pull
- ⬜ Centred display-medium paragraph
- ⬜ ABOUT.opening[0] text

### A3. Chapter I — Beginnings
- ⬜ Gradient gold Roman numeral "I"
- ⬜ Label "Beginnings · 1966 → 1995"
- ⬜ Headline: "A different aesthetic was always there to be found."
- ⬜ Gradient divider line below

### A4. 1966 Staffordshire (text only)
- ⬜ Year + place displayed prominently
- ⬜ Headline: "Born into a country of hedgerows and Georgian cities."
- ⬜ Body paragraph

### A5. 1986 Brighton (image right)
- ⬜ Image of working on a mandala (left, 60%)
- ⬜ Year + place
- ⬜ Headline + body

### A6. 1990 Bournemouth (big year)
- ⬜ Massive gradient "1990" left
- ⬜ Headline + body on right

### A7. 1990–1995 (text only, multi-location)
- ⬜ Year span + locations
- ⬜ Headline + body

### A8. Anegada interlude — divider
- ⬜ Accent line + "Interlude · The turning point" label

### A9. Anegada hero (full-screen)
- ⬜ Stephen on cairn image, parallax scaling
- ⬜ Eyebrow: "1995 · Anegada · Caribbean Sea"
- ⬜ Big gradient "1995" bottom-left
- ⬜ "Everything is connected." headline word-revealed bottom-right
- ⬜ Different bg tint (#0e0a08) so it visibly leaves the page

### A10. Anegada magazine body
- ⬜ Para 1 with drop cap + side pull-quote
- ⬜ Massive centred italic "Everything is connected." pull
- ⬜ Para 2 display-medium 10/12 offset
- ⬜ Para 3 narrow 7/12 indented column
- ⬜ Attribution right-aligned

### A11. Return divider
- ⬜ Accent line + "Return to the work" label

### A12. Chapter II — Practice
- ⬜ Gold "II" + label "Practice · 1996 → 2009" + headline

### A13. 1996 Brighton (text)
### A14. 1999 Brighton (big year)
### A15. 2002–2009 Lewes (image left)

### A16. Chapter III — Legacy
- ⬜ Gold "III" + label "Legacy · 2010 →" + headline

### A17. 2010 TAGA (quote variant)
- ⬜ Portrait of classroom (left)
- ⬜ Year + headline (right)
- ⬜ Accent-bordered academy quote
- ⬜ "— Stephen Meakin" attribution

### A18. 2014 Az-Zarqa (image right)
### A19. 2016 SunStar (big year)
### A20. [DATE] passing (text)

### A21. Student letter
- ⬜ Eyebrow: "To every student"
- ⬜ Intro headline
- ⬜ Accent left-border blockquote with full letter
- ⬜ TAGA group photo on right

### A22. Closing painting + CTA
- ⬜ Ophiuchus painting full-bleed
- ⬜ "Explore the collections →" magnetic button

---

## 📄 LEGAL / 404

- ⬜ Privacy page renders
- ⬜ Terms page renders
- ⬜ NotFound (404) shows fallback + link home

---

## 🎯 FINAL CROSS-PAGE QA

- ⬜ Browser tab title correct on every route
- ⬜ Open Graph meta image loads
- ⬜ All images have alt text
- ⬜ All external links open new tab where appropriate
- ⬜ No console errors
- ⬜ Lighthouse audit: performance + accessibility green
- ⬜ Mobile portrait works on iPhone 13 / 14 viewports
- ⬜ Mobile landscape doesn't break hero
- ⬜ Tablet (iPad) layout reasonable

---

## 🚧 BLOCKED — needs Hugo input

- 🚧 PASSING_DATE — real date for Steve's passing
- 🚧 Foundation / Prints / Visit email addresses
- 🚧 "[TBD]" painting dates (mum to fill in)
- 🚧 Any additional venues / exhibitions / press to add to press strip

---

## ⏭ DEFERRED — polish after family preview

(Add items here as we encounter them mid-pass.)
