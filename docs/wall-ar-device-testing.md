# "See on Your Wall" — manual real-device test checklist

Automated tests cover the maths, manifest and state logic. They CANNOT prove
physical AR accuracy or on-device rendering. Run this before public release.

## A. Physical-scale verification (the important one)

For each size, confirm the AR model matches a real measured marker.

1. On a wall, mark a square with tape at the exact size:
   - A3 → **29.5 × 29.5 cm**
   - A2 → **42 × 42 cm**
   - A1 → **59.5 × 59.5 cm**
   - A0 → **84 × 84 cm**
2. Open a product page → **See on your wall** → select the matching size → launch AR.
3. Place the artwork over the taped square. The virtual edges must line up with the tape.
4. Record any deviation. If a size is wrong, the model dimensions are wrong — check
   `src/lib/artworkSizes.ts` (the single source of truth) and re-run `npm run build:wall`.

Expected: the artwork is LOCKED to size (ar-scale="fixed") — you can move it on the
wall but cannot pinch it larger/smaller.

## B. Device / browser matrix

| Device / browser | Expect |
|---|---|
| Recent iPhone · Safari | AR button → Quick Look opens the USDZ, wall placement, fixed size |
| Older supported iPhone · Safari | Same; slower load acceptable |
| iPad (if available) · Safari | Same |
| Recent Samsung Galaxy · Chrome | AR button → Scene Viewer, wall placement, fixed size |
| Google Pixel · Chrome | Same (WebXR or Scene Viewer) |
| Samsung Internet | AR launches or a clear message + working photo fallback |
| Desktop Chrome | 3D preview rotates; no AR button; photo fallback available |
| Desktop Safari | Same as desktop Chrome |
| Instagram / Facebook in-app browser | "Open in Safari/Chrome" message + working photo fallback (never a dead AR button) |

## C. Behaviour

- [ ] Product page loads WITHOUT any camera permission prompt.
- [ ] AR only launches after tapping the AR button (never automatically).
- [ ] Portrait AND landscape orientation both usable; rotating mid-session doesn't break the UI.
- [ ] Denied camera / AR permission → graceful message, photo fallback still works.
- [ ] Slow connection → loading state shows, then the model (or a clear error, never a stack trace).
- [ ] Missing asset (e.g. Ophiuchus, non-square) → no broken AR; the photo fallback is offered.
- [ ] Every print size (A3/A2/A1/A0) launches and is correctly scaled.
- [ ] Changing size inside the modal updates the buy box selection on the product page.
- [ ] Closing the modal returns you to the same product, same colourway, same size — basket untouched.
- [ ] Escape closes the modal; focus returns to the "See on your wall" button.

## D. Photo fallback

- [ ] Upload / take a photo → "Approximate preview" badge shows.
- [ ] Mark two points on a known reference, enter its real cm, Apply → "Calibrated preview".
- [ ] The square artwork scales sensibly relative to the reference after calibration.
- [ ] Drag with finger/mouse; nudge with arrow keys; the overlay stays in bounds.
- [ ] "Save photo" produces a local image; nothing is uploaded (check network tab — no photo POST).
- [ ] Replace photo / Reset work.

## E. Known limitations to confirm before launch

- **Canvas depth** `CANVAS_DEPTH_M = 0.03 m` in `src/lib/artworkSizes.ts` is a flagged
  nominal value (these are paper giclée prints, not stretched canvas). Confirm the
  intended framed/mounted depth. Front artwork dimensions are exact regardless.
- **Ophiuchus** has no AR model (its source is landscape 2000×1622, not square). Supply
  a 1:1 square master to `public/img/paintings/` and re-run `npm run build:wall` to enable it.
- **iOS USDZ coverage**: this build generated the ORIGINAL colourway of each painting × 4
  sizes. For iOS AR on other colourways, run `npm run build:wall -- --all-colourways`
  (Android/WebXR already covers every colourway via the shared GLB shell + runtime texture).
