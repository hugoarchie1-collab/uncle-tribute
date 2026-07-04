# REBUILD: World-class "See it on your wall" AR — rebuild prompt

Paste the block below into a fresh Claude session (rested, NOT before a demo — this is the
biggest single piece of work on the site, not a polish pass). It is grounded in a forensic
diagnosis of the current code + research across WebXR, model-viewer/Quick Look, and the paid
SLAM SDKs (8th Wall / Zappar / MindAR / AR.js).

---

## The decision that's yours (read first)

- **Free native path — RECOMMENDED, primary in the prompt.** `<model-viewer>` → Apple **AR Quick
  Look (USDZ)** on iPhone + Google **Scene Viewer (GLB)** on Android, plus an optional in-page
  **WebXR** wall-anchored experience on Android Chrome. Real ARKit/ARCore wall detection, true
  physical size, no monthly cost, no app.
- **Paid upgrade — only if you want live-camera wall-lock IN the browser on iPhone.** **8th Wall**
  ($700/mo) is the only tool that does markerless vertical-wall SLAM inside iOS Safari. Its free
  tier forces a "Powered by 8th Wall" splash.
- **Do NOT use Zappar** ($315/mo): its web world-tracking is floor-oriented + drifty — cheaper *and*
  worse for walls. **MindAR / AR.js** are free but do image/marker only — no bare-wall SLAM.

**Hard platform fact (2026):** iPhone Safari has NO WebXR `immersive-ar` and never has. So pure
WebXR reaches Android only (~half of mobile, likely the minority for a UK art audience). iPhone =
AR Quick Look. Design around this split — it's the single most important architectural decision.

---

```
REBUILD: WORLD-CLASS "SEE IT ON YOUR WALL" AR — The Mandala Company
Repo: /Users/archiehugo/Code/uncle-tribute · deploy to main (confirm before each live push)

GOAL
Replace the current flawed AR with a genuinely best-in-class framed-print wall preview that LOCKS
a print onto a specific real wall at TRUE physical size, with colourway / size / frame options
that work and survive into the AR session, and framing that looks like a real framed print —
matching the quality of the rest of the site. Clone the best (IKEA Place, Houzz "View in My
Room", Saatchi/Artsy "View in a Room", theprintspace) and beat them on finish.

WHY THE CURRENT ONE IS BROKEN (verified against the code — fix every one):
1. PRIMARY "See it on your wall" button opens WallCamera.tsx — a getUserMedia video with the print
   as a CSS-absolutely-positioned <img> FLOATING over it. NO surface/plane detection anywhere.
   "Lock on wall" dead-reckons pixel translation from a hard-coded H_FOV_DEG = 62 + deviceorientation
   → the print DRIFTS off the wall on pan. Rotation only, zero positional tracking. Core complaint.
2. No true size in camera mode — initial width = 60% of screen (WallCamera.tsx:162); size picker
   only scales RELATIVELY (cm ratio), never real cm.
3. The "frame" is a fake CSS linear-gradient band (WallCamera.tsx:448, ModelViewerAR.tsx:238) — no
   moulding, depth, mat, glass or shadow. Reads as a sticker.
4. Real anchored AR EXISTS but is buried + broken: ModelViewerAR.tsx runs <model-viewer>
   reveal="manual" (kept invisible) purely to expose activateAR(); its GLB
   (public/models/wall/canvas-frameless-v1.glb, 2.9KB) embeds a PLACEHOLDER texture
   ("ArtworkPlaceholder"), NOT the painting — Quick Look / Scene Viewer show a blank shell.
5. Asset coverage is patchy: most colourways have NO USDZ (WALL_USDZ_KEYS ~one colourway per
   painting); `ophiuchus` has none; picking most frames silently falls back to the FRAMELESS USDZ
   (only 4 frames baked in WALL_FRAMED_KEYS). Options lie.
6. A BETTER, unused AR stack is dead code: src/components/ArtworkAR.tsx + src/lib/arAssets.ts +
   public/ar/* — including frame-shell GLBs (/ar/frame-*-v3.glb) with REAL frame geometry + mat +
   contact shadow. Harvest/promote these; delete the rest. Two divergent size/asset manifests
   (wallModels.ts vs arAssets.ts) must be unified into ONE source of truth.

PLATFORM REALITY (build to this — do not fight it):
• iPhone/iPad Safari: NO WebXR immersive-ar. iOS real AR = Apple AR Quick Look (USDZ), wall-anchored
  + true-size. This is the iOS hero path.
• Android Chrome: in-page WebXR immersive-ar (hit-test + anchors + vertical plane) AND/OR Scene
  Viewer via <model-viewer>. Offer both; feature-detect.
• Desktop: no camera AR worth shipping → show a QR that deep-links the phone into the AR session
  for THIS painting + selected colourway/size/frame (the missing desktop handoff).

TARGET ARCHITECTURE
A) Feature-detect + branch:
     const androidXR = await navigator.xr?.isSessionSupported('immersive-ar');
   - iOS / no-XR → <model-viewer> AR Quick Look (USDZ) + Scene Viewer.
   - Android XR → in-page WebXR wall-anchored session (below).
   - Desktop → QR handoff.
B) PRIMARY button routes into REAL anchored AR — never the fake camera overlay.
C) HONEST FALLBACK only when no native AR: tap-to-place drag + pinch-scale 2D preview over the
   camera, LABELLED as a rough preview ("drag to position · pinch to size") with a true-size
   reference ("this print is 42 cm — match it to something you know"). NEVER claim it "locks";
   DELETE the H_FOV_DEG gyro dead-reckoning entirely.

WEBXR PATH (Android) — the technical spine (three.js ARButton + XREstimatedLight is fastest):
  // session (from a user tap, over HTTPS):
  const session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['local','hit-test','anchors'],
    optionalFeatures: ['plane-detection','light-estimation','dom-overlay'],
    domOverlay: { root: document.getElementById('xr-overlay') }  // keep React controls as HTML
  });
  const localSpace  = await session.requestReferenceSpace('local');
  const viewerSpace = await session.requestReferenceSpace('viewer');
  const hitSource   = await session.requestHitTestSource({ space: viewerSpace });
  // per frame: cast ray from viewport centre, show reticle only on a WALL:
  //   • baseline: keep hits whose surface NORMAL is ~horizontal (points out of a wall),
  //     reject up-facing (floor/table) normals.
  //   • enhancement (Chrome 147+ plane-detection): frame.detectedPlanes, keep
  //     plane.orientation === 'vertical' or plane.semanticLabel === 'wall'.
  // on tap: results[0].createAnchor().then(a => weld the framed-print mesh to a.anchorSpace)
  //   — anchors re-solve pose each frame → NO drift (never IMU dead-reckoning).
  // light-estimation: requestLightProbe() → frame.getLightEstimate(probe) → SH ambient +
  //   primaryLightDirection/Intensity so the frame + glazing pick up the room light + cast a
  //   plausible shadow. (Three.js XREstimatedLight wires this automatically.)
  // Skip depth-sensing initially (marginal for a flat wall print; narrows support).

WORK IN WAVES (build → verify → screenshot/measure → report; confirm before each live push):

WAVE 1 — ASSET PIPELINE (the real fix; scripts/build-wall-models.mjs + build-ar-assets.mjs)
  - Bake the ACTUAL painting texture (per painting × per colourway) into each GLB and USDZ — kill
    ArtworkPlaceholder. Every available colourway × every size (A3/A2/A1/A0) gets a real model.
    Include ophiuchus. No silent frameless fallback.
  - True metric scale baked (USDZ true metres + #allowsContentScaling=0; GLB real size;
    model-viewer ar-scale="fixed"). Verify an A2 reads 42×42 cm in a real Quick Look session.
  - REAL frame geometry: harvest the dead /ar/frame-*-v3.glb moulding + mat + contact shadow; bake
    EVERY offered FRAME_STYLES id (not just 4) as framed variants, plus frameless.
  - Unify wallModels.ts + arAssets.ts into ONE manifest so coverage can't drift again. Fail the
    BUILD if any listed colourway/size/frame combo has no model (options must never lie).
  - ⚠️ /models, /ar, /video, /img, /logo are immutable-cached 1yr — new textures/models need NEW
    -vN filenames + every reference updated.

WAVE 2 — REROUTE + CAPABILITY (SeeOnYourWall.tsx, ModelViewerAR.tsx, arCapability.ts)
  - Make the PRIMARY CTA the real-AR launcher per platform. Reveal <model-viewer> as a real
    interactive 3D preview on the tile (drop reveal="manual"), not a flat <img> decoy.
  - Add the desktop→phone QR handoff carrying painting + colourway + size + frame in the deep link.

WAVE 3 — REALISTIC FRAMING (the "beat them" layer)
  - Moulding with depth + bevel, mat board, glass with a subtle glare, soft CONTACT shadow where
    the frame meets the wall. WebXR light-estimation drives shadow direction where available; baked
    soft shadow otherwise. Correct aspect (square art — no object-cover crop).

WAVE 4 — OPTIONS INTEGRITY
  - Colourway / size / frame each (a) update the live 3D preview AND (b) select the correct baked
    model for the AR handoff. Size picker shows true cm. Build-time guard from Wave 1 enforces coverage.

WAVE 5 — VERIFY (real devices, not just desktop preview)
  - Matrix: iPhone Safari (Quick Look anchors to wall, true size, correct colourway+frame),
    Android Chrome (Scene Viewer + WebXR wall-lock holds on move), desktop (QR works).
  - Acceptance: print ANCHORS to a chosen wall and stays put on pan/walk; true physical size;
    colourway/size/frame correct in-session; frame looks real; NO placeholder; every combo opens a
    real model; console clean; build + lint + `tsc -p api` green. Screen-record proof on both platforms.

HARD RULES (site-specific):
- Concurrency: Hugo runs ≥2 Claude sessions. Re-read files before editing; push ff-only (fetch+ff
  or a worktree off origin/main; reset --hard is blocked); verify the LIVE asset after push.
- Immutable cache: any changed model/texture/image needs a NEW -vN filename + all refs updated.
- Vercel Hobby caps a deploy at 12 Serverless Functions and the project is AT 12 — do NOT add a new
  api/*.ts file; fold any endpoint into an existing one via a `kind` branch.
- HTTPS + a real user-gesture tap are required to start any XR/AR session (Vercel is HTTPS already).
- Don't invent visible words; keep the site's monochrome, calm, memorial register.
- Confirm with Hugo before each live push.

ORCHESTRATION: heavy multi-agent on Opus 4.8 — one agent unifies the manifests + rewrites the bake
scripts, one builds the capability/routing + WebXR session, one the framing render; adversarially
verify true-size + wall-anchoring on real devices before shipping; then synthesise.

OPTIONAL PAID UPGRADE (only if Hugo says yes): 8th Wall (Niantic) SLAM WebAR ~$700/mo — the only
tool giving a unified in-browser live-camera wall-lock on ALL phones incl. iPhone (native can't).
Free tier forces a "Powered by 8th Wall" splash. NOT needed for a world-class result; the native
Quick Look + Scene Viewer + WebXR path above is free, anchored and true-size. Do NOT use Zappar
(floor-oriented/drifty) or MindAR/AR.js (image-target only, no wall SLAM). Flag cost/benefit first.
```
