import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { ImageReveal } from "../components/ImageReveal";
import { LoopFilm } from "../components/LoopFilm";
import { AssetImage } from "../components/AssetImage";
import { MagneticLink } from "../components/MagneticLink";
import { WELCOME } from "../data/content";
import { PAINTINGS, getLowestTierPricePence, paintingImageAlt, EMBELLISHMENT_NOTE } from "../data/paintings";
import { asset } from "../lib/asset";
import { cn } from "../lib/cn";
import { useCurrency } from "../lib/currency";
import { EYEBROW, TITLE, SUBTITLE, EYEBROW_TIGHT } from "../components/ui/tokens";
import { Seo } from "../components/Seo";

// The home backdrop is the shared PavoBackdrop tapestry (see
// components/PavoBackdrop.tsx): ALL FIVE Pavo colourways, each shown WHOLE
// and zoomed out on its own ambient fill, crossfading on page scroll — Hugo
// 2026-07-02, replacing the zoomed-in blurred washes ("multi coloured blurry
// mess"). About renders the exact same component, so home + About share one
// sky by construction.

// The peak section H2s ("Six paintings…", "Each painting is a ritual.", "Four
// traditions…", + the Meet-Stephen and Arista heads) all use the shared TITLE
// token from ui/tokens (Fraunces, opsz 48 / wght 700, clamp(52px,8.2vw,92px)),
// so every section heading on the home is ONE canonical voice — never a bespoke
// per-section clamp. TITLE already pins the '"opsz" 48, "wght" 700' cut, so no
// local style override is needed (the old PEAK_H2_STYLE constant is retired).

/**
 * CosmicInterlude — a Veo-generated film, the cinematic breath under the
 * wordmark. LAZY: an IntersectionObserver mounts the <video> only when the panel
 * is ~300px from the viewport. Muted / looping / playsInline so it autoplays
 * everywhere. Reduced-motion users skip it.
 *
 * 2026-07-01 (Hugo): now a FULL-BLEED BANNER — edge-to-edge width, a fixed
 * banner height with object-cover, feathered on all four sides (two intersected
 * linear-gradient masks) so it melts into the peacock wash like the photos
 * below. A negative top margin pulls it UP under the "…Stephen Meakin" lockup to
 * kill the gap under the wordmark. Source `garden-galaxy-v1.mp4` — a "garden →
 * galaxy" camera move (Stephen's mandala on an easel rising up through the trees
 * into a spiral galaxy), a SEAMLESS BOOMERANG baked offline (forward, then a
 * 1.35×-sped reverse back) that loops endlessly; the Earth limb + Veo watermark
 * are cropped out of the source entirely. Kept the LIGHT 4.9 MB v1 mp4 (not the
 * 13 MB v2) so it buffers fast enough to autoplay on mobile data. Autoplay is
 * forced robustly (imperative muted + play() on canplay + first-interaction
 * fallback) so it loops with NO play button on iOS too — see the play effect.
 */
const CosmicInterlude = () => {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduceMotion]);

  // Robust autoplay — endless, no play button, on mobile AND desktop (Hugo).
  // The bare autoPlay attribute is unreliable on iOS Safari: it only honours
  // muted-autoplay when the element is GENUINELY muted (the React `muted` prop
  // isn't always reflected onto the DOM property), and a freshly-mounted video
  // usually still needs an explicit play() call. So force muted imperatively,
  // load(), and kick play() on mount + loadedmetadata + canplay; a one-time
  // first-interaction fallback (touch/scroll/tap) starts the loop even when iOS
  // blocks programmatic autoplay outright (e.g. Low Power Mode). Same recipe as
  // the VideoIntro film, which autoplays reliably everywhere.
  useEffect(() => {
    if (!near) return;
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;
    video.setAttribute("muted", "");
    video.load();
    const tryPlay = () => {
      void video.play?.().catch(() => {});
    };
    tryPlay();
    video.addEventListener("loadedmetadata", tryPlay);
    video.addEventListener("canplay", tryPlay);
    const goEvents = ["touchstart", "pointerdown", "click", "scroll", "keydown"] as const;
    for (const ev of goEvents) window.addEventListener(ev, tryPlay, { passive: true });
    return () => {
      video.removeEventListener("loadedmetadata", tryPlay);
      video.removeEventListener("canplay", tryPlay);
      for (const ev of goEvents) window.removeEventListener(ev, tryPlay);
    };
  }, [near]);

  if (reduceMotion) return null;

  return (
    <section
      aria-label="From the garden to the galaxy — the order beneath all things"
      // z-30 lifts the banner ABOVE the fixed peacock backdrop (z-0) that covers
      // the whole viewport — without it the film paints behind the wash and reads
      // as a blank gap. The masthead clears the same backdrop with its own z-20.
      // The masthead now hugs its content in portrait (see its min-h note), so
      // the lockup always sits at the masthead's bottom and the banner follows
      // with only a hairline gap — no negative pull needed (a fixed pull would
      // overlap the wordmark on the screens where content fills the masthead).
      // The soft top feather melts the seam either way.
      // SYMMETRIC breathing room (Hugo: "right up to the text… not too close…
      // make symmetrical"): EQUAL mt/mb so the film sits just under the lockup
      // with matched space above and below — no longer a tiny gap above + a big
      // one below. The masthead's justify-end places the lockup at the viewport
      // foot, so mt is the whole visible gap up to the wordmark. Tightened so
      // the (now larger) film sits RIGHT up under "The Art of Stephen Meakin"
      // without touching it.
      className="relative z-30 w-full mt-[clamp(12px,2svh,28px)] mb-[clamp(12px,2svh,28px)]"
    >
      {/* FULL-BLEED BANNER (Hugo: "fill the entire edges of screen so it's like
          a banner", edges softened like the photos below). Edge-to-edge width,
          a fixed banner height with object-cover, and a feathered mask on ALL
          four sides (the two linear gradients are intersected) so the film melts
          into the peacock wash with no hard rectangle. The clip is a seamless
          boomerang (garden → galaxy, then a sped reverse back) that loops
          forever; the Earth limb is cropped out of the source entirely. */}
      <figure ref={ref} className="relative m-0 w-full">
        {/* Warm outer glow — the same rust note as the finale horizon. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -inset-y-8 -z-10"
          style={{
            background:
              "radial-gradient(70% 75% at 50% 50%, rgba(201,120,68,0.10) 0%, rgba(9,7,13,0) 72%)",
          }}
        />
        {/* Feather the top + bottom with a SINGLE-LAYER mask (no mask-composite):
            a full-bleed banner already touches the screen edges horizontally, so
            it only needs a vertical fade — and a single gradient can NEVER hit
            the two-gradient "union instead of intersect" bug that left a HARD top
            seam on engines which silently drop the composite keyword. Same soft
            dissolve as the .soft-edge-y photos elsewhere on the page. */}
        {/* CINEMATIC HEIGHT (Hugo 2026-07-02: the 24vw/38svh strip read as "a
            tiny bar, which is ridiculous"; 2026-07-05: "have video larger" — the
            film is now a commanding ~66svh band): a genuinely large full-bleed
            banner on every device. The 440px floor keeps it substantial on short
            landscape phones; the 1240px ceiling stops a 4K wall becoming taller
            than the film can resolve while still ~62svh there. object-cover + the
            vertical feather handle every ratio. */}
        <div
          className="relative w-full overflow-hidden bg-transparent h-[clamp(300px,44svh,440px)] md:h-[clamp(360px,58svh,720px)] 2xl:h-[clamp(420px,58svh,820px)] 3xl:h-[clamp(440px,56svh,900px)] 4xl:h-[clamp(460px,54svh,960px)]"
        >
          {near && (
            <video
              // Muted set synchronously on mount (React's `muted` prop is
              // unreliable; iOS needs a genuinely-muted element to autoplay
              // with no tap) — the play() kicks below are the fallback.
              ref={(el) => {
                videoRef.current = el;
                if (el) {
                  el.defaultMuted = true;
                  el.muted = true;
                }
              }}
              className="absolute inset-0 h-full w-full object-cover"
              poster={asset("/video/poster-garden-galaxy-v3.webp")}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
            >
              <source src={asset("/video/garden-galaxy-v3.webm")} type="video/webm" />
              <source src={asset("/video/garden-galaxy-v3.mp4")} type="video/mp4" />
            </video>
          )}
          {/* Gentle inner vignette for depth. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(135% 135% at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.28) 100%)",
            }}
          />
        </div>
      </figure>
    </section>
  );
};

export const Welcome = () => {
  const reduceMotion = useReducedMotion();
  // Presentment currency — the "from £…" chips convert with the header picker.
  const { formatPretty: fmtPrice } = useCurrency();

  // The five-colourway Pavo tapestry crossfade (incl. scroll-jank layer
  // culling) lives in PavoBackdrop; the fade windows below are tuned so
  // Persian Indigo opens at FULL opacity from the very top (never bare black
  // before the first scroll) and Mary Pink holds through the Sacred Geometry
  // finale (the finale invariant).

  // Six featured paintings in a 3×2 grid. A FRESH random six — each on a random
  // colourway — is drawn on EVERY home-page mount (first visit, hard refresh, or
  // navigating back to "/"), so "Six paintings from a lifetime at the compass" is
  // never the same twice. Hugo: "give you a random 6 … I want this to last
  // forever." The set stays stable across re-renders within a single mount (no
  // reshuffle on scroll), and Fisher–Yates runs on a COPY so the shared
  // PAINTINGS array is never mutated.
  // A useState LAZY INITIALISER (not useMemo): the factory runs exactly once per
  // mount, which is precisely the "fresh random six on every home-page mount"
  // contract — and, unlike a useMemo factory, a lazy initialiser is the React-
  // sanctioned place for a one-time impure draw (Math.random), so the purity
  // lint rule is satisfied without changing behaviour.
  const [featuredPicks] = useState<{ id: string; colourway?: string }[]>(() => {
    const pool = [...PAINTINGS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    // 6, NOT 3: the section's verbatim H2 is "Six paintings from a lifetime at
    // the compass." — a 3-tile grid under it is a visible contradiction (the
    // 07-01 6→3 scroll-length cut broke this; restored 2026-07-02).
    return pool.slice(0, 6).map((p) => {
      // Only draw from AVAILABLE colourways so a tile never shows a hidden one.
      const avail = p.colourways.filter((c) => c.available);
      return {
        id: p.id,
        colourway: avail[Math.floor(Math.random() * avail.length)]?.name,
      };
    });
  });
  const featured = featuredPicks
    .map((pick) => {
      const painting = PAINTINGS.find((p) => p.id === pick.id);
      if (!painting) return null;
      const avail = painting.colourways.filter((c) => c.available);
      const cover =
        (pick.colourway ? avail.find((c) => c.name === pick.colourway) : undefined) ??
        avail.find((c) => c.isOriginal) ??
        avail[0] ??
        painting.colourways[0];
      return { painting, cover };
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  // "A reminder" lead — split reminderLong[0] at its first sentence so the
  // opening CLAUSE can be set as a large flush-left display lede (illuminated by
  // the existing rust drop-cap) with the rest of the SAME verbatim paragraph
  // dropping to reading size beneath. Both halves are Stephen's verbatim words —
  // never re-typed; the full paragraph still appears once, in order.
  const reminderLead = WELCOME.reminderLong[0];
  const reminderLeadSplit = reminderLead.indexOf(". ");
  const reminderLeadHead = (
    reminderLeadSplit > 0 ? reminderLead.slice(0, reminderLeadSplit + 1) : reminderLead
    // Glue the final two words with a non-breaking space so a short last word
    // (e.g. "us.") can NEVER orphan onto its own line (Hugo). Words unchanged —
    // only the inter-word space becomes non-breaking.
  ).replace(/ (\S+)$/, " $1");
  const reminderLeadBody =
    reminderLeadSplit > 0 ? reminderLead.slice(reminderLeadSplit + 2) : "";

  // Pull-quote first sentence ("There is a star inside each one of us.") — set on
  // TWO lines, breaking after "inside", so it never reads as one over-long line on
  // a wide desktop (Hugo 2026-08-26). Derived from the verbatim reminderLong[3] —
  // the words are never re-typed; only the line break is inserted.
  const starSentence = WELCOME.reminderLong[3].split(". ")[0] + ".";
  const starBreakAt = starSentence.indexOf("inside ");
  const starLine1 =
    starBreakAt >= 0 ? starSentence.slice(0, starBreakAt + "inside".length) : starSentence;
  const starLine2 =
    starBreakAt >= 0 ? starSentence.slice(starBreakAt + "inside ".length) : "";

  return (
    <>
      {/* The home page is the strongest URL on the domain — give it a
          buyer-intent <title> + description (it previously ran a bare
          usePageTitle() that targeted no commercial term). The on-screen H1
          stays Stephen's poetic line; this only feeds <head>. Title already
          names "Stephen Meakin" so pageTitle() returns it verbatim (no brand
          suffix). ⚠️ "estate-stamped", never "signed" — Stephen is deceased. */}
      <Seo
        title="Mandala & Sacred Geometry Art Prints — The Art of Stephen Meakin"
        description="Estate-stamped giclée prints of British mandala artist Stephen Meakin's sacred-geometry paintings. Made to order in London — free delivery worldwide."
      />
      {/* Nav overlays the intro video (fixed) so the logo + links stay pinned
          to the top of the screen from the very first frame — and remain there
          when scrolling back up from anywhere on the page. Every other page
          uses the in-flow sticky Nav. */}
      <Nav overlay />

      {/* ── THE SUN — opening bookend to the Earth finale ──────────────────────
          The estate's sun pinned to the VERY TOP of the page, flipped to face
          DOWNWARD (limb curving into the page), its black sky baked transparent
          (alpha = luminance) so only the lit sun composites onto the deep bg —
          the EXACT mirror of the natural Earth limb that closes the page
          (bottom-pinned there; top-pinned, inverted here). The REAL sun photo in
          a controlled-height limb band (warm, never blown-out) with the big
          two-tier "THE MANDALA COMPANY" wordmark reading clearly BELOW it on the
          dark painting — the estate statement that opens the page. */}
      <section
        // PORTRAIT (phones + tablets) hugs its content — min-h-0 — so the
        // "…Stephen Meakin" lockup always sits at the section's bottom and the
        // film below tucks right under it (kills the "huge gap": on tall portrait
        // screens the old min-h-80svh left 100–400px of dead space below the
        // lockup that no fixed margin could track). — Hugo, 2026-07-01.
        // ⚠️ DURABLE (2026-07-03, Hugo: "why did you cut off the earth — it was
        // so good before"): LANDSCAPE/desktop is the FULL-VIEWPORT Earth open —
        // min-h-[100svh], NEVER a 40-ish svh band. A shorter section clips the
        // absolute limb image mid-atmosphere at the overflow-hidden edge (a
        // razor-hard horizontal cut through the Earth's glow on any tall
        // desktop window) because the limb's radial dissolve only completes at
        // ~96% of the IMAGE height. Full-viewport gives the arc + its dissolve
        // room to finish, exactly like the finale's Sun mirror.
        // ⚠️ DURABLE (2026-07-02, Hugo's clipped-"THE" screenshot): the wordmark
        // must clear the FIXED overlay nav — the pt floor is 6rem because 8svh
        // alone puts the first line UNDER the red bar on short windows — and its
        // font-size is capped by HEIGHT (16svh, below) as well as width; a
        // 14vw-only size overflows every wide-short window (the 06-29 failure).
        // ⚠️ DURABLE (2026-07-03, Hugo: "video right up to the Art of Stephen
        // Meakin text"): landscape is BOTTOM-ANCHORED (justify-end), NOT
        // justify-center. The section stays a full 100svh (the Earth limb's
        // dissolve needs it — see below), but centring the block left a dead
        // void UNDER the lockup that GREW with viewport height (240px@900 →
        // 446px@1440) and shoved the film half a screen down. justify-end sits
        // the wordmark/lockup at the viewport foot so the film tucks right
        // beneath it with a constant, symmetric gap (the masthead pb + the
        // film's own mt), and the tall wordmark rises to brush the Earth limb —
        // the intended open composition. Portrait keeps min-h-0 (hugs content),
        // so justify-end is a no-op there and the film already tucks under.
        // 2026-07-16 (Hugo: "SEM Experience is way too far down, want more of
        // the video on first look"): landscape masthead shortened 78svh → 68svh
        // so the bottom-anchored wordmark rises ~10svh and ~10svh more of the
        // film band below tucks into the first viewport. Held at 68 (NOT ≤64,
        // which crowds/hides the Earth limb per the durable note above) — the
        // balance point between the defended Earth open and showing more film.
        // 2026-07-31 CINEMATIC-OPEN REBUILD (Hugo: the masthead "looks so bad
        // over the earth", title "too small", "glow cuts off unnaturally"). The
        // section was regressed to 42svh — far shorter than the Earth limb's own
        // rendered height (the 2000×541 asset is ~360–560px tall on desktop), so
        // the section's overflow-hidden SLICED the limb mid-dissolve (the "hard
        // glow cutoff") AND the bottom-anchored wordmark landed right on that cut.
        // Restored to a full-viewport cinematic frame that gives the limb + its
        // radial dissolve room to complete into the backdrop with NO seam.
        // 2026-07-31 (LATER — Hugo, overriding the "title centred IN the glow"
        // note above): the title must read CLEARLY BELOW the Earth + its glow,
        // NOT nestled into the fading atmosphere. So landscape is now BOTTOM-
        // ANCHORED (justify-end): the Earth stays top-pinned + full-size (its
        // absolute open-Earth invariant is untouched), the title drops to the
        // lower portion of the full-viewport frame, and the dark space between
        // the glow's fade and the title is the intended breathing room — Earth
        // above, a clear gap, then the wordmark reading under the planet. min-h
        // stays 90svh (the limb dissolve still needs the full frame — a shorter
        // section would slice it, the 42svh regression); pb lifts the title off
        // the section foot so it sits low but composed, never jammed to the edge.
        // Portrait keeps its content-hugging justify-end + pt (mobile already
        // reads Earth-then-title); pt nudged up a touch for a cleaner gap there.
        // ── SINGLE RESPONSIVE MODEL (rebuilt 2026-08-23) ────────────────────────
        // The masthead is CONTENT-HUGGING: Earth limb in normal flow at the top,
        // wordmark locked directly beneath it. No min-h cap, no justify-end, no
        // portrait/landscape split, no absolute-vs-section height mismatch — that
        // stack of ~15 contradictory patches is what made the open look DIFFERENT
        // on every device (mobile: 80px void; 4K: title overlapping the Earth).
        // Now the Earth→wordmark relationship is IDENTICAL at every width (it is the
        // exact mirror of the finale foot Earth), compact, and fills the frame with
        // no dead space. pt clears the fixed overlay nav; pb is a small even foot.
        // To retune the open, change ONLY the earth width classes + the wordmark's
        // -mt below — do not reintroduce section-height/anchor logic.
        className="relative z-20 isolate w-full overflow-hidden flex flex-col items-center pt-[max(4.75rem,6svh)] pb-[clamp(18px,2.6vh,44px)]"
        aria-label="The SEM Experience"
      >
        {/* Softening scrim — a gentle, mostly-even veil so the indigo peacock
            backdrop reads continuously up to the Earth limb; the wordmark keeps
            its own heavy text-shadow for legibility. z-0, below the limb (z-1)
            + the text (z-10). (NOTE: a 2026-06-28 cinematic-open attempt that
            put the Veo film here as a full-viewport sky was reverted — that
            film is a BRIGHT daylit garden scene, so as the open's sky it
            out-shouted the cream wordmark and buried the Earth limb, breaking
            Hugo's brightness rule + his defended open composition.) */}
        {/* NO masthead scrim — Hugo 2026-07-23, emphatic: the rectangular dark
            panel over the masthead section read as the "black box behind THE SEM
            EXPERIENCE" he has repeatedly banned. Legibility comes ONLY from the
            wordmark's own multi-layer text-shadow; if the backdrop needs calming
            it's darkened UNIFORMLY page-wide on the PavoBackdrop (no rectangle),
            never a panel over just this section. */}
        {/* Earth limb pinned to the TOP — the natural Earth SPUN AROUND (scaleY -1)
            so the limb sits up top and curves DOWN into the page (the exact mirror
            of the SUN that now closes the page at the finale). Its black space is
            baked transparent (alpha = luminance); the same radial mask the finale
            uses is flipped with the image, so it stays solid at the pinned TOP edge
            and dissolves into the peacock painting below. (Swapped 2026-06-19 at
            Hugo's direction: Earth opens, Sun closes — keep text placement.) */}
        {/* Earth limb — shown WHOLE, NEVER cropped in ANY direction, on ANY device
            (Hugo 2026-08-23: "i dont want the earth cut off in any direction on any
            device"). w-full = exactly 100% width → the full limb spans edge-to-edge with
            NOTHING clipped off the sides (no overscan). h-auto = natural height → the
            ENTIRE curve + glow show, no object-cover top/bottom crop, no height cap.
            scaleY(-1) curves it down from the top; a GENTLE radial feather softly blends
            only its outer/lower edge into the backdrop — a soft dissolve, not a hard cut. */}
        <div
          aria-hidden="true"
          className="pointer-events-none relative z-[1] w-full overflow-hidden -mt-[1.25rem] md:-mt-[4rem] h-[clamp(150px,23vw,480px)]"
        >
          <img
            src={asset("/img/scenes/earth-cutout-v2.webp")}
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
            // SMALLER Earth (Hugo 2026-08-24: "both earths are way too big"), but
            // STILL edge-to-edge (his earlier "hitting the edge 100%"). A fixed-aspect
            // full-bleed image can't be both whole AND short, so this is a capped-height
            // BAND: w-full keeps both edges touched; object-cover trims only the darker
            // planet body, and object-position keeps the luminous LIMB (the hero of the
            // image) — never a hard cut through the bright rim. The wrapper's -mt bleeds
            // the top up behind the fixed nav so there's no hard top edge.
            className="block select-none w-full h-full object-cover"
            style={{
              maxWidth: "none",
              objectPosition: "center top",
              // scaleY(-1): the bright limb RIM sits at the BOTTOM of the curve with
              // the surface above (Hugo: the natural-up version was "flipped the wrong
              // way"). The mask feathers only the lower edge into the page; the top
              // bleeds off behind the nav — no hard cut anywhere.
              transform: "scaleY(-1)",
              WebkitMaskImage:
                "linear-gradient(to bottom, #000 62%, transparent 100%)",
              maskImage:
                "linear-gradient(to bottom, #000 62%, transparent 100%)",
            }}
          />
        </div>

        {/* THE WORDMARK — back where it belongs: the estate statement reading
            over the lower sun, BIG + clearly legible (on the feathered dark sun +
            painting), the two-tier Fraunces composition mirroring the Earth close. */}
        <div className="relative z-10 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[2360px] 4xl:max-w-[3300px] px-4 sm:px-6 md:px-8 lg:px-12 text-center mt-[clamp(10px,2.4svh,36px)]">
          {/* NO local halo behind the wordmark — Hugo 2026-07-23: "a weird black
              text box behind that i never asked for and advised clearly against".
              The soft radial that used to back the text read as a dark box; it is
              removed. Legibility comes ONLY from the wordmark's own multi-layer
              text-shadow + the soft, EVEN, edge-to-edge scrim above (never a box). */}
          <Reveal delay={0}>
            {/* Decorative brand wordmark — a <div>, NOT a heading, so the page's
                real <h1> (the hero quote below) is the first heading a screen
                reader meets (no H1→below-H1 ordering inversion). */}
            <div className="font-display m-0">
              {/* "THE MANDALA COMPANY" — the DOMINANT statement, the biggest type
                  on the open. opsz 48 keeps the strokes clean at this scale. */}
              {/* "THE MANDALA COMPANY" — the DOMINANT estate statement, set to
                  MATCH the Sacred Geometry finale EXACTLY (Hugo: "same boldness +
                  font as sacred geometry; the earth text must match the sun
                  font"): true Fraunces 700 at a controlled opsz 48, UPPERCASE,
                  identical tracking / line-height to the finale title. Replaces
                  the thin opsz-144 / wght-560 sentence-case + swashy-italic cut
                  Hugo rejected ("the earth text is soo bad"). A touch stronger
                  shadow than the finale because this sits on the bright Earth
                  atmosphere rim. */}
              {/* The wordmark resolves word-by-word on arrival — a dignified
                  staggered rise (opacity + a few px lift) that makes the open
                  feel AUTHORED, like a title card (Cartier/Hermès kinetic-serif
                  intro). The text, scale, position and FINAL state are
                  byte-identical to before — only the entrance animates; reduced
                  motion renders the static wordmark exactly as today. */}
              {reduceMotion ? (
                <span
                  className="block text-balance"
                  style={{
                    fontVariationSettings: '"opsz" 48, "wght" 700',
                    fontWeight: 700,
                    // THE most dominant statement on the entire site (Hugo
                    // 2026-08-01: "fill all empty space… match if not bigger than
                    // the subtitle below the video… most dominant writing on the
                    // whole site"). It now WRAPS into a screen-filling two/three-
                    // line block (THE SEM / EXPERIENCE) that rises to brush the
                    // Earth limb and closes the empty band above it. Per-line size
                    // exceeds the hero headline (11vw/176px) and every other title;
                    // svh-capped so a short landscape window can't overflow.
                    fontSize: "min(clamp(52px, 13.5vw, 248px), 27svh)",
                    letterSpacing: "-0.035em",
                    lineHeight: 0.86,
                    textTransform: "uppercase",
                    overflowWrap: "normal",
                    wordBreak: "keep-all",
                    color: "#ede6d6",
                    textShadow:
                      "0 0 1px rgba(8,6,12,0.9), 0 1px 3px rgba(8,6,12,0.8), 0 3px 14px rgba(8,6,12,0.5)",
                  }}
                >
                  The SEM Experience
                </span>
              ) : (
                <span
                  className="block text-balance"
                  style={{
                    fontVariationSettings: '"opsz" 48, "wght" 700',
                    fontWeight: 700,
                    // THE most dominant statement on the whole site — see the
                    // reduced-motion twin above for the full rationale. Identical
                    // size/leading/wrap; only the entrance animates.
                    fontSize: "min(clamp(52px, 13.5vw, 248px), 27svh)",
                    letterSpacing: "-0.035em",
                    lineHeight: 0.86,
                    textTransform: "uppercase",
                    overflowWrap: "normal",
                    wordBreak: "keep-all",
                    color: "#ede6d6",
                    // Box-free legibility (Hugo 2026-07-29 #4): tight, letter-hugging
                    // layers that CARVE the wordmark off the atmosphere so it commands
                    // — a near-glyph dark outline + two short drops. Max blur ≤14px so
                    // it can NEVER read as a scrim/box behind the type.
                    textShadow:
                      "0 0 1px rgba(8,6,12,0.9), 0 1px 3px rgba(8,6,12,0.8), 0 3px 14px rgba(8,6,12,0.5)",
                  }}
                >
                  {["The", "SEM", "Experience"].map((word, i) => (
                    <span
                      key={word}
                      className="masthead-word"
                      style={{ animationDelay: `${0.15 + i * 0.1}s` }}
                    >
                      {word}
                      {i < 2 ? " " : ""}
                    </span>
                  ))}
                </span>
              )}
              {/* The "The Art of Stephen Meakin" wax-seal + wordmark lockup that
                  used to sit under "THE SEM EXPERIENCE" was REMOVED (Hugo
                  2026-07-22: "remove the Art of Stephen Meakin text/logo
                  underneath the SEM Experience text"). The masthead is now the
                  single "THE SEM EXPERIENCE" statement. */}
            </div>
          </Reveal>
        </div>
      </section>

      <div id="welcome-anchor" className="relative">
        {/* BACKGROUND = the global drifting AmbientBackground mesh (Hugo 2026-08-24:
            "the home needs the same dynamic, changing background as the basket page").
            The home was the ONLY page still painting its own static PavoBackdrop
            peacock OVER the mesh; every other page retired its photo backdrop in the
            calm pass (SceneBackdrop CALM_BACKDROPS) so the App-root AmbientBackground
            (slowly-drifting iPhone-style colour glows, reactive to the on-screen art)
            shows through. Dropping the PavoBackdrop here lets that same living mesh be
            the home's ground too. (PavoBackdrop is still used by /about.) */}

        {/* ONE vertical rhythm for the whole page. Each section's gap is the
            SAME at every breakpoint (space-y), instead of being the sum of two
            neighbours' paddings — which is what produced the uneven 64→176px
            jumps Hugo flagged. Sections no longer carry their own py; the gap
            lives here so it can never double up or collapse. */}
        <main className="relative isolate z-10 overflow-x-clip space-y-10 md:space-y-12 lg:space-y-14 pb-8 md:pb-10">
          {/* 1 · HERO — HORIZONTAL headline across the top, the beloved
              studio photo MAXIMISED full content-width beneath it (Hugo: "make
              it horizontal so the full image can be maximised below — I hate the
              blank space around it"). No side column, no text-over-image overlap:
              the headline sits ABOVE the photo; the photo owns the full width. */}
          <section className="relative isolate w-full overflow-hidden pt-4 md:pt-6">
            <div className="mx-auto flex flex-col w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[2360px] 4xl:max-w-[3300px] px-4 sm:px-6 md:px-8 lg:px-12">
              {/* Order (Hugo 2026-07-24): PHOTO first (order-1), THEN the "So here
                  we are" text + His story (order-2), THEN the video below — so the
                  photo and video are separated by the text, never touching. */}
              <Reveal as="div" className="order-2 mt-8 md:mt-10 text-center">
                <h1 className="font-display tracking-[-0.03em] text-ink m-0 mx-auto max-w-[1280px] 2xl:max-w-[1520px] 3xl:max-w-[1780px] 4xl:max-w-[2040px] text-balance hero-text-shadow">
                  {/* THE key visualiser (Hugo 2026-07-28: "boldness to match if
                      not bigger, more impactful"). True Fraunces 700 at opsz 48 —
                      the SAME bold display cut as the masthead — set large. */}
                  <span
                    className="block text-[clamp(56px,11vw,176px)] leading-[0.94]"
                    style={{ fontVariationSettings: '"opsz" 48, "wght" 700', fontWeight: 700 }}
                  >
                    So here we are on Earth
                  </span>
                  <span className="block font-normal italic text-[clamp(30px,5vw,72px)] leading-[1.06] mt-4 md:mt-6 text-ink/95">
                    &mdash; orbiting a Sun Star at about 67,062 miles an hour.
                  </span>
                </h1>
                <div className="mt-6 md:mt-7 flex flex-wrap items-center justify-center gap-3">
                  <MagneticLink
                    to="/collections"
                    className="press group inline-flex w-fit items-center bg-ink text-bg px-7 py-3.5 font-sans text-[14px] font-bold tracking-[0.02em] rounded-full transition-colors duration-300 hover:bg-accent hover:text-ink whitespace-nowrap"
                    ariaLabel="See the collection"
                  >
                    See the collection <span aria-hidden="true" className="ml-2 inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-x-1">&rarr;</span>
                  </MagneticLink>
                  <MagneticLink
                    to="/about"
                    className="press inline-flex w-fit items-center justify-center text-ink border border-[rgba(237,230,214,0.35)] px-7 py-3.5 font-sans text-[14px] font-bold tracking-[0.02em] rounded-full transition-colors duration-300 hover:border-accent hover:text-accent whitespace-nowrap"
                    ariaLabel="About Stephen"
                  >
                    His story
                  </MagneticLink>
                </div>
              </Reveal>

              {/* The studio photo — MAXIMISED full content width beneath the
                  headline, large + crisp, soft-edged (no frame box, no side voids). */}
              <Reveal as="figure" className="order-1 m-0 mt-2 md:mt-3 mx-auto w-full max-w-[min(1400px,116svh)] 2xl:max-w-[min(1680px,116svh)] 3xl:max-w-[min(2100px,116svh)] 4xl:max-w-[min(2600px,116svh)]">
                {/* Width-capped so the 3:2 photo NEVER exceeds the viewport height
                    (Hugo 2026-07-08: "no image should take up the full screen") —
                    at 1180px it's ~73svh tall, still large, and shown WHOLE (no crop,
                    per his standing "stop cropping my main image" rule). The peacock
                    backdrop fills the space either side, never a grey void. */}
                {/* The studio photo shows WHOLE — its box matches the source's
                    native 3:2 ratio (1200×800) AND it renders at zoom={1} with
                    parallax OFF, so NOTHING is cropped: no object-cover slice (the
                    ratios are identical) and no scale-[1.04] edge trim (the default
                    parallax bleed that was still shaving ~2% off every side — Hugo:
                    "stop cropping my main image after so here we are"). The full
                    1200×800 frame reads edge-to-edge; the soft-edge feather just
                    melts it into the page. */}
                <ImageReveal
                  src="/img/welcome/01-painting-wild-rose.jpg"
                  alt="Stephen Meakin painting Wild Rose at his studio desk, beside a large circular wall mandala"
                  eager
                  aspect="aspect-[3/2]"
                  edges="none"
                  parallax={0}
                  zoom={1}
                  objectPosition="center"
                  shadow=""
                  sizes="(min-width: 1400px) 1320px, 92vw"
                />
              </Reveal>
            </div>
          </section>

          {/* COSMIC INTERLUDE — the garden→galaxy film, moved BELOW the hero
              photo of Stephen (Hugo 2026-07-23: "swap the first photo of Steve
              with the video"). The real photo of the artist now opens the page;
              the film follows it. Lazy + reduced-motion safe. */}
          <CosmicInterlude />

          {/* 2 · A REMINDER — the hero carries only a tight lead; here Hugo's
              full five-paragraph passage runs VERBATIM as a bold editorial
              spread (mapped from WELCOME.reminderLong so nothing is re-typed).
              P1 leads large; P2–P4 settle into a balanced two-column measure on
              lg+ so it reads as a designed essay on a 4K screen, not a lonely
              phone-width ribbon; P5 lands after a hairline as a two-tier
              Fraunces close echoing the Sacred Geometry finale, its closing
              period the one rust note. Over the shared peacock backdrop like
              every section (no opaque card — gotcha); legibility for the
              READING tiers comes from the local radial scrim below (edges fade
              to fully transparent so it can never read as a card) — the double
              hero-text-shadow stays ONLY on the display-scale pull-quote +
              close, never on body-size glyphs where it fuzzed the edges.
              Fraunces opsz held ≤48 (finale invariant); whole-element Reveals
              only (gotcha #2). */}
          <section className="relative isolate mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[2360px] 4xl:max-w-[3300px] px-4 sm:px-6 md:px-8 lg:px-12">
            {/* NO local reading scrim. Hugo flagged the old radial deepening
                here as "black boxes behind the text" — at the wide essay measure
                the soft-edged radial still read as a dark rectangle sitting on
                the peacock wash. The reminder now sits DIRECTLY on the backdrop;
                legibility comes ONLY from a subtle per-tier text-shadow (the
                `.reminder-shadow` utility below + the display-scale
                hero-text-shadow already on the pull-quote + close), never a
                hard dark card. */}
            {/* Left-aligned to establish the RAIL the pull-quote below breaks
                against (the section's one off-axis spine). */}
            <Reveal as="header" className="mb-3 md:mb-4 text-center">
              <p className={cn(EYEBROW, "m-0 mb-3")}>A reminder</p>
              {/* Illuminated opening CLAUSE — reminderLong[0]'s first sentence as
                  a large flush-left display lede (the rust drop-cap now
                  illuminates a whole clause), then the remainder of that SAME
                  verbatim paragraph drops to reading size beneath. The .drop-cap
                  recipe (global.css, @supports initial-letter:2) scales for free.
                  Words untouched; the full paragraph still appears once, in order. */}
              <p
                className="font-display font-semibold tracking-[-0.03em] text-ink m-0 mx-auto max-w-[30ch] text-balance"
                style={{
                  fontVariationSettings: '"opsz" 48, "wght" 600',
                  fontSize: "clamp(32px, 5.2vw, 64px)",
                  lineHeight: 1.04,
                  textShadow: "0 1px 18px rgba(10,9,8,0.5), 0 1px 3px rgba(10,9,8,0.4)",
                }}
              >
                {reminderLeadHead}
              </p>
              {reminderLeadBody && (
                <p
                  className="font-sans font-normal text-[clamp(20px,0.7vw+13px,30px)] leading-[1.5] text-ink-soft m-0 mt-3 md:mt-4 mx-auto max-w-[1280px] 2xl:max-w-[1520px] 3xl:max-w-[1780px] 4xl:max-w-[2040px] text-pretty text-justify [text-align-last:center] hyphens-auto"
                  style={{ textShadow: "0 1px 12px rgba(10,9,8,0.45)" }}
                >
                  {reminderLeadBody}
                </p>
              )}
            </Reveal>

            {/* Pull-quote — THE emotional punch of the section (Hugo: make it
                "much more significant and standout", real presence, its own
                breathing room, a confident two-tier treatment). reminderLong[3]'s
                OPENING two sentences are lifted to a big centred Fraunces feature:
                the first sentence ("There is a star inside each one of us.") is the
                dominant tier; the second ("Quite literally.") lands beneath it,
                smaller + rust-period, as the quiet confirmation. The two-column
                body below then renders only the REMAINDER of that paragraph (see
                the slice in the map), so the full passage appears exactly once.
                Both halves are DERIVED from the same verbatim slice — never
                re-typed. Generous my-12→my-20 gives it real air on the page. */}
            {/* THE asymmetric fulcrum — the ONE off-axis chord on the whole home
                (every other section stays centred, so this lands like a held
                note). Stephen's verbatim "There is a star inside each one of us."
                breaks LEFT and screen-filling against the section's left rail;
                the confirming "Quite literally." answers on the opposite (right)
                axis. Both halves are the SAME verbatim reminderLong[3] slice —
                never re-typed. (Bold redesign 2026-06-28, agent cherry-pick:
                Hermès / Avant Arte asymmetric editorial scale — the missing
                "wow", and the antidote to the centred-stack monotony.) */}
            <Reveal delay={0.05} className="my-10 md:my-14 text-center">
              <blockquote className="m-0 hero-text-shadow">
                {/* Dominant tier — CENTRED (Hugo, repeatedly: the reminder must be
                    centred, not broken to one side). opsz held at 48 (finale). */}
                <span
                  className="block mx-auto font-display font-semibold text-ink"
                  style={{
                    fontVariationSettings: '"opsz" 48, "wght" 600',
                    fontWeight: 600,
                    fontSize: "clamp(44px, 8vw, 104px)",
                    letterSpacing: "-0.045em",
                    lineHeight: 0.98,
                  }}
                >
                  {starLine1}
                  {starLine2 && (
                    <span className="block">{starLine2}</span>
                  )}
                </span>
                {/* Subordinate — "Quite literally." centred beneath, its closing
                    period the one rust note. */}
                <span
                  className="block mx-auto font-display font-normal italic text-ink/90"
                  style={{
                    fontVariationSettings: '"opsz" 40, "wght" 400',
                    fontWeight: 400,
                    fontSize: "clamp(28px, 5.5vw, 60px)",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                    marginTop: "clamp(12px, 1.8vw, 28px)",
                  }}
                >
                  {WELCOME.reminderLong[3].split(". ")[1]}
                  <span className="not-italic">.</span>
                </span>
              </blockquote>
            </Reveal>

            {/* TWO-COLUMN essay body — reminderLong[1..3] VERBATIM, flowed into
                two balanced columns on md+ so the passage reads as a designed
                magazine spread and takes ~half the vertical space (Hugo: less
                scrolling + more aesthetic). break-inside-avoid keeps each
                paragraph whole across the column break; text-pretty +
                hyphens-auto (with lang="en-GB") treat the rag at the ~46ch
                column measure. Ink = the 0.85 ink-soft TOKEN (was a bespoke
                /85 alpha — same value, token discipline). Legibility now comes
                from a subtle per-paragraph text-shadow (the reading-scrim card
                was removed — Hugo read it as black boxes), never a dark box. */}
            <Reveal as="div" className="mx-auto max-w-[1280px] 2xl:max-w-[1520px] 3xl:max-w-[1780px] 4xl:max-w-[2040px] text-center">
              {WELCOME.reminderLong.slice(1, 4).map((para) => {
                // reminderLong[3]'s first two sentences are the pull-quote above,
                // so render only the remainder here — the paragraph is shown once
                // across the feature + body, with none of Stephen's words lost.
                const text =
                  para === WELCOME.reminderLong[3]
                    ? para.split(". ").slice(2).join(". ")
                    : para;
                return (
                  <p
                    key={para.slice(0, 24)}
                    lang="en-GB"
                    // Opened leading (1.72→1.85) + more generous paragraph gap
                    // (mb-6→mb-8 on md) so the passage breathes now that the dark
                    // scrim card is gone (Hugo: "space the reminder out better").
                    className="font-sans font-normal text-[clamp(20px,0.7vw+13px,30px)] leading-[1.5] text-ink-soft m-0 mb-4 md:mb-5 last:mb-0 text-pretty text-justify [text-align-last:center] hyphens-auto"
                    style={{
                      // Subtle legibility halo on the peacock backdrop — soft
                      // enough to never fuzz the body glyphs, no dark box.
                      textShadow: "0 1px 12px rgba(10,9,8,0.45)",
                    }}
                  >
                    {text}
                  </p>
                );
              })}
            </Reveal>

            {/* Closing premise (P5), VERBATIM — pulled out as a two-tier
                Fraunces close: a dominant first sentence above a smaller
                subordinate clause, the closing rust period the one accent note.
                Split at the single ". " boundary in reminderLong[4]; both halves
                stay verbatim. */}
            <Reveal delay={0.1} className="mt-10 md:mt-14 text-center">
              <p className="m-0 mx-auto max-w-[1280px] 2xl:max-w-[1520px] 3xl:max-w-[1780px] 4xl:max-w-[2040px] text-center hero-text-shadow">
                <span
                  className="block font-display text-ink text-balance mx-auto"
                  style={{
                    fontVariationSettings: '"opsz" 48, "wght" 600',
                    fontWeight: 600,
                    fontSize: "clamp(42px, 10.5vw, 68px)",
                    letterSpacing: "-0.03em",
                    lineHeight: 1.02,
                  }}
                >
                  {WELCOME.reminderLong[4].split(". ")[0]}
                  <span className="text-accent">.</span>
                </span>
                <span
                  className="block font-display font-normal italic text-ink-muted text-balance mx-auto mt-4 md:mt-6"
                  style={{
                    fontVariationSettings: '"opsz" 36, "wght" 400',
                    fontWeight: 400,
                    fontSize: "clamp(25px, 6.2vw, 44px)",
                    letterSpacing: "-0.015em",
                    lineHeight: 1.2,
                  }}
                >
                  {WELCOME.reminderLong[4].split(". ").slice(1).join(". ")}
                </span>
              </p>
            </Reveal>
          </section>

          {/* 3 · MEET STEPHEN — cinematic LEFT-bleed, mirroring the hero's
              right-bleed for an alternating rhythm. The portrait fills the
              left ~44% of the viewport at full height, bleeding to the screen
              edge; the invocation + bio sit to the right, melting out of the
              photo's inner edge. Stacks to portrait-then-text below md. */}
          {/* 3 · MEET STEPHEN — contained, balanced. The portrait COVER-FILLS its
              column to the text's exact height (items-stretch) so there is NO gap
              above or below it (Hugo: "huge gap above and below, looks crap"). The
              descriptive title is a SMALL heading along the top of the copy — not
              the screen-filling display title it briefly became. */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[2360px] 4xl:max-w-[3300px] px-4 sm:px-6 md:px-8 lg:px-12">
            {/* TWO-COLUMN — portrait BESIDE the text, the copy paragraphed against the
                margin next to it (Hugo 2026-08-24, emphatic: "i cant have that isolated
                portrait in the middle — it leaves gaps either side — revert to how it was
                before, perfectly paragraphed placed beside the margin"). The portrait
                cover-fills its column to the copy's exact height (items-stretch) so the
                two columns line up top AND bottom; object-[center_top] keeps his head. */}
            <Reveal
              as="div"
              className="grid grid-cols-1 md:grid-cols-[clamp(400px,34vw,540px)_1fr] items-stretch gap-8 md:gap-12 lg:gap-16"
            >
              {/* Portrait COVER-FILLS its column to the exact height of the copy beside
                  it (items-stretch + h-full + object-cover) so there is NO gap below the
                  text — Hugo's hard rule against gaps. object-[center_28%] biases the
                  crop UP so his face + upper body always stay in frame (only a little
                  studio floor is trimmed off the bottom). Mobile shows the whole 2:3
                  portrait (aspect box, stacked). */}
              <figure className="relative m-0 h-[clamp(300px,48svh,460px)] md:h-auto overflow-hidden rounded-[4px] ring-1 ring-line">
                <AssetImage
                  src="/img/welcome/02-portrait-denim.jpg"
                  alt="Stephen Meakin"
                  width={800}
                  height={1200}
                  sizes="(min-width:768px) 34vw, 100vw"
                  className="block w-full h-full object-cover object-[center_22%] md:absolute md:inset-0 md:h-full md:w-full md:object-[center_28%]"
                />
              </figure>
              {/* Copy = ONE cohesive block, TOP-aligned so the eyebrow sits level with the
                  top of the portrait — the same top-aligned image-left / text-right pattern
                  as the ritual section below, for consistency across the page (Hugo 2026-08-26:
                  "in Steve's own words is way below … I want consistency"). NOT justify-between
                  (that flung the eyebrow away from the title). Type scales up 2xl→4xl. */}
              <div className="w-full flex flex-col items-start justify-start text-left gap-4 md:gap-5 3xl:gap-7 4xl:gap-9">
                <p className={cn(EYEBROW, "m-0")}>{WELCOME.invocation}</p>
                <h2
                  className="font-display font-semibold tracking-[-0.02em] text-[clamp(28px,2.4vw,44px)] 3xl:text-[clamp(44px,2.5vw,60px)] 4xl:text-[clamp(56px,2.4vw,74px)] leading-[1.14] text-ink text-balance hero-text-shadow m-0"
                  style={{ fontVariationSettings: '"opsz" 40, "wght" 600' }}
                >
                  The art of Stephen Meakin — mandala artist and sacred geometer.
                </h2>
                <p className={cn(SUBTITLE, "reading-shadow m-0 text-left 2xl:text-[22px] 3xl:text-[27px] 4xl:text-[32px] 3xl:leading-[1.6]")}>{WELCOME.bio[0]}</p>
                <p className={cn(SUBTITLE, "reading-shadow m-0 text-left 2xl:text-[22px] 3xl:text-[27px] 4xl:text-[32px] 3xl:leading-[1.6]")}>{WELCOME.bio[1]}</p>
              </div>
            </Reveal>
          </section>

          {/* 4 · STUDIO — full-bleed cinematic break. ⚠️ Keep this a REAL band:
              the 07-02 4/1–5/1 letterbox squashed it to a sliver on wide
              screens and Hugo rejected it hard ("ruined the sizing… it's
              tiny"). These are the June-03 proportions he approved — shorter
              than a raw 3:2 on 4K, but still a substantial cinematic moment. */}
          {/* FULL-BLEED cinematic band, edge-to-edge (Hugo 2026-08-24: "hitting the
              edge of screen 100%"; images small = "huge blank space either side"). A
              direct child of <main> so w-full spans the whole viewport; the band is
              svh-capped so it fills the width WITHOUT becoming a full-screen-tall wall
              (object-cover a wide band — atmosphere, not the do-not-crop hero). */}
          {/* CONTAINED-WHOLE, BIG (Hugo 2026-08-25: "zoomed out so you can see all —
              his face and brush — but still not taking up the screen"). A matched-
              aspect box + zoom:1 shows the WHOLE photo (zero crop) at ~67svh tall — big,
              but never a full-screen wall. NO soft-edge-y (that top feather read as a
              "faint black box darkening above the image" — Hugo); a clean hairline ring
              frames it on the mesh instead. */}
          {/* FULL-BLEED edge-to-edge band, ~62svh (Hugo 2026-08-25: "I want it hitting
              the edges like before — you were just cropping it terribly"). Crop
              positioned to keep Stephen (lower-centre) in frame. */}
          <Reveal as="figure" className="m-0 w-full">
            <div className="relative w-full overflow-hidden h-[clamp(300px,44svh,440px)] md:h-[clamp(400px,62svh,760px)] 2xl:h-[clamp(440px,62svh,860px)] 3xl:h-[clamp(480px,60svh,960px)] 4xl:h-[clamp(520px,58svh,1040px)]">
              <ImageReveal
                src="/img/welcome/03-painting-in-studio.jpg"
                alt="Stephen painting in the studio"
                fill
                edges="none"
                parallax={0}
                zoom={1}
                objectPosition="center 60%"
                shadow=""
                sizes="100vw"
                className="h-full"
              />
            </div>
          </Reveal>

          {/* 5 · FEATURED WORKS — 3×2 grid of signature paintings */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[2360px] 4xl:max-w-[3300px] px-4 sm:px-6 md:px-8 lg:px-12">
            <Reveal as="div" className="text-center mb-4 md:mb-5">
              <p className={cn(EYEBROW, "m-0 mb-3")}>
                From the hand
              </p>
              <h2 className={cn(TITLE, "my-0 max-w-[1280px] 2xl:max-w-[1520px] 3xl:max-w-[1780px] 4xl:max-w-[2040px] mx-auto hero-text-shadow")}>
                Six paintings from a lifetime at the compass.
              </h2>
            </Reveal>
            {/* UNIFORM GRID (Hugo: "make it in rows like before" — the salon-hang
                big-lead-plus-satellites read as a glitched, uneven layout). All
                six tiles are the SAME size in clean rows: 2-up on mobile, 3-up on
                desktop (3×2). min-w-0 stops a long title token widening a column. */}
            <Reveal as="div" className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-6 md:gap-x-6 md:gap-y-7 mb-5 md:mb-6">
              {featured.map(({ painting, cover }) => {
                // Subtitle = the YEAR only, consistently (Hugo 2026-07-24: the
                // grid was "messy — some have dates, some don't"). Previously a
                // painting with no year on file fell back to its COLLECTION name,
                // which made that one card the odd one out. Now a missing year
                // simply shows no subtitle. ⚠️ enneagon-swans still has a
                // "[ DATE ]" placeholder — needs Polly's real year to match.
                const hasYear = painting.year && painting.year !== "[ DATE ]";
                const fromPrice = getLowestTierPricePence(painting);
                return (
                  <Link
                    key={painting.id}
                    // Carry the colourway shown on THIS card through to the
                    // detail page (?c=…) so clicking e.g. the Blood Moon Red
                    // peacock lands on that exact colourway, not the original.
                    to={`/collections/${painting.id}?c=${encodeURIComponent(cover.name)}`}
                    // Spell the price into the link's accessible name — the visual
                    // price chip below is aria-hidden (it animates in), so without
                    // this a screen-reader user would get no price for any tile.
                    aria-label={`${painting.title}${hasYear ? `, ${painting.year}` : ""} — from ${fmtPrice(fromPrice)}`}
                    // Uniform tile — every painting the same size in a clean grid
                    // (Hugo wants even rows, not a scaled salon hang).
                    className="group block min-w-0"
                  >
                    {/* Quiet gallery frame — only the ring warms to accent on
                        hover; no lift-shadow, no zoom (restraint pass). */}
                    <div className="relative aspect-square overflow-hidden bg-ink/5 ring-1 ring-line transition-[box-shadow] duration-500 group-hover:ring-accent/50">
                      <AssetImage
                        src={cover.image}
                        alt={paintingImageAlt(painting.title, cover.name)}
                        loading="lazy"
                        decoding="async"
                        sizes="(min-width: 1400px) 420px, (min-width: 640px) 30vw, 90vw"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    {/* Museum WALL-LABEL (2026-06-28 bold redesign) — the price
                        comes OFF the image (the floating rounded pill was the one
                        Shopify-template tell on the page) and folds into a quiet
                        typographic caption: title + year/collection on the left,
                        the existing "From £…" as a tabular figure on the right,
                        across a hairline rule. The Link's aria-label still spells
                        the price, so a11y is unchanged. */}
                    <div className="pt-4 border-t border-line">
                      <h3 className="font-display font-bold text-[18px] md:text-[22px] 2xl:text-[26px] 3xl:text-[30px] tracking-[-0.015em] text-ink m-0 leading-[1.2] group-hover:text-accent transition-colors duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)]">
                        {painting.title}
                      </h3>
                      {/* Gallery caption — the WORK leads: title + year only. The
                          repeated "From £445" price chip was dropped from the home
                          tiles (Hugo 2026-07-29: a gallery leads with the art, not a
                          shop shelf of identical prices) — the price still lives on
                          the PDP + Collections, and the Link's aria-label still
                          spells it (`fromPrice`), so a11y is unchanged. */}
                      {hasYear && (
                        <p className={cn(EYEBROW_TIGHT, "tracking-[0.02em] m-0 mt-2")}>
                          {painting.year}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </Reveal>

            <Reveal as="div" className="text-center">
              {/* Quiet text link — the hero pill is the page's single filled
                  CTA; this repeat is demoted to an underlined-on-hover link. */}
              <MagneticLink
                to="/collections"
                className="press group inline-flex items-center gap-2 font-sans text-[14px] font-bold tracking-[0.02em] text-ink transition-colors duration-300 hover:text-accent"
                ariaLabel="See the collection"
              >
                See the collection <span aria-hidden="true" className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-x-0.5">→</span>
              </MagneticLink>
            </Reveal>
          </section>

          {/* 5a · THE ARCHIVE — legacy statement (Hugo, 2026-07-16): a
              confident band right after the featured grid making clear that
              what's shown is less than a tenth of Stephen's work, with more
              issued quarterly, and placing him among the great traditions he
              drew from. Verbatim from WELCOME.archiveStatement (content.ts) —
              no words are typed inline here. Transparent over the peacock
              backdrop like every section; hero-text-shadow keeps it legible. */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[2360px] 4xl:max-w-[3300px] px-4 sm:px-6 md:px-8 lg:px-12">
            <div className="border-t border-line pt-6 md:pt-8">
              {/* CENTRED to match every other home section (Hugo 2026-08-03:
                  "it's all centred wrong — I want consistency and cleanness above
                  all"). The 2026-08-03 asymmetric editorial spread was the one
                  off-axis block on the page; it now follows the SAME centred
                  rhythm as "Six paintings…" and "Each painting is a ritual":
                  centred eyebrow → centred TITLE → contained centred photo →
                  centred reading measure. Verbatim from WELCOME.archiveStatement. */}
              <Reveal as="div" className="text-center mb-5 md:mb-7">
                <h2 className={cn(TITLE, "my-0 max-w-[1280px] 2xl:max-w-[1520px] 3xl:max-w-[1780px] 4xl:max-w-[2040px] mx-auto hero-text-shadow")}>
                  {(() => {
                    const { headline, emphasis } = WELCOME.archiveStatement;
                    const [before, after] = headline.split(emphasis);
                    return (
                      <>
                        {before}
                        <em className="italic font-normal">{emphasis}</em>
                        {after}
                      </>
                    );
                  })()}
                </h2>
              </Reveal>

              {/* FULL-BLEED cinematic band — breaks out of the padded section to hit
                  both screen edges (w-screen + centred-container breakout); svh-capped
                  so it's a band, not a full-screen wall. */}
              {/* CONTAINED at the photo's own 3:2 so the WHOLE frame shows — his full
                  body at the easel, head to legs (Hugo 2026-08-25: "I want to see his
                  face and hand and brush and his legs"). zoom:1 = zero crop. */}
              <Reveal as="figure" delay={0.08} className="mt-0 mb-0 mr-0 w-screen ml-[calc(50%-50vw)]">
                <div className="relative w-full overflow-hidden h-[clamp(300px,44svh,440px)] md:h-[clamp(400px,62svh,760px)] 2xl:h-[clamp(440px,62svh,860px)] 3xl:h-[clamp(480px,60svh,960px)] 4xl:h-[clamp(520px,58svh,1040px)]">
                  <ImageReveal
                    src="/img/welcome/stephen-painting-denim-v1.jpg"
                    alt="Stephen Meakin painting a mandala at the easel, a finished mandala on the wall behind him"
                    fill
                    edges="none"
                    parallax={0}
                    zoom={1}
                    objectPosition="center 40%"
                    shadow=""
                    sizes="100vw"
                    className="h-full"
                  />
                </div>
              </Reveal>

              {/* Reading body — centred measure, matching the reminder essay. */}
              <Reveal as="div" delay={0.08} className="mx-auto max-w-[1280px] 2xl:max-w-[1520px] 3xl:max-w-[1780px] 4xl:max-w-[2040px] mt-6 md:mt-8 space-y-4 md:space-y-5 text-center">
                {WELCOME.archiveStatement.body.map((para, i) => (
                  <p key={i} className={cn(SUBTITLE, "reading-shadow m-0 text-justify [text-align-last:center] hyphens-auto")}>
                    {para}
                  </p>
                ))}
              </Reveal>
            </div>
          </section>

          {/* 5b · HAND-FINISHED UPSELL — the estate's highest-margin add-on,
              given its own commercial moment right after the buyable grid. Real
              footage of the hand-finishing (dots of paint + individually-placed
              sequins) on the left; a clear "what you get + from-price + CTA" on
              the right. Sits FLAT on the backdrop like every other section (the
              frosted-glass panel was removed — restraint pass); a plain hairline
              divider gives separation. */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[2360px] 4xl:max-w-[3300px] px-4 sm:px-6 md:px-8 lg:px-12">
            {/* FROSTED-GLASS PANEL background (Hugo 2026-08-24: "you removed its
                background") — restored from before the restraint pass: a rounded,
                translucent-dark card + hairline ring + soft lift so the hand-finished
                upsell sits on its own premium surface, like the "ritual" island below.
                0.28 alpha is a subtle frost, NOT a hard black box. */}
            <div className="relative overflow-hidden rounded-[24px] md:rounded-[32px] bg-[rgba(12,10,9,0.28)] ring-1 ring-line shadow-[0_40px_110px_-50px_rgba(0,0,0,0.6)] p-6 sm:p-7 md:p-8 lg:p-10">
              {/* TWO-COLUMN — reel BESIDE the copy, paragraphed against the margin next
                  to it (Hugo 2026-08-24, emphatic: no isolated centred media leaving side
                  gaps — "revert to how it was before, beside the margin"). The reel cover-
                  fills its column to the copy's height (items-stretch); below md it stacks
                  as its natural 9:16, width-capped. */}
              <Reveal as="div" className="grid grid-cols-1 md:grid-cols-[clamp(200px,13.5vw,235px)_1fr] items-center gap-8 md:gap-12 lg:gap-16">
                {/* Reel — shown WHOLE at its native 9:16 (Hugo 2026-08-24: "zoom that
                    video out so you can actually see the sequins placed on the work").
                    A 9:16 box + object-cover on a 9:16 video = NO crop, the full frame
                    shows. items-center sits the copy level beside it. */}
                <figure className="relative m-0 mx-auto md:mx-0 w-full max-w-[340px] aspect-[9/16] overflow-hidden rounded-[6px] ring-1 ring-line">
                  <LoopFilm
                    src="/video/hand-finishing-loop-v1.mp4"
                    poster="/img/welcome/hand-finishing-v1.jpg"
                    label="Hands finishing a mandala print by hand — dots of paint and Swarovski crystals placed one by one"
                    aspect="h-full"
                    edges="none"
                    className="absolute inset-0"
                  />
                </figure>
                {/* Copy sized UP to FILL the panel beside the tall reel (Hugo
                    2026-08-25: "I need that whole text larger to fill its box so it's
                    not gappy"). */}
                <div className="w-full flex flex-col items-start justify-center text-left">
                  <p className={cn(EYEBROW, "m-0 mb-5 text-[clamp(14px,0.95vw,18px)]")}>The hand-finished edition</p>
                  <h2
                    className="font-display font-semibold tracking-[-0.02em] text-[clamp(32px,3.3vw,58px)] leading-[1.1] text-ink text-balance hero-text-shadow m-0 mb-5 md:mb-6"
                    style={{ fontVariationSettings: '"opsz" 40, "wght" 600' }}
                  >
                    Take a print further — finished by hand.
                  </h2>
                  <p className={cn(SUBTITLE, "reading-shadow m-0 mb-7 text-left text-[clamp(19px,1.35vw,27px)] leading-[1.5] max-w-[62ch]")}>{EMBELLISHMENT_NOTE}</p>
                  <ul className="list-none p-0 m-0 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3.5 text-left">
                    {[
                      "Dots of paint, applied by hand",
                      "Swarovski crystals placed one by one, symmetrically",
                      "In Stephen's geometric tradition",
                      "One of one — no two alike",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2.5 font-sans text-[clamp(16px,1.1vw,21px)] leading-[1.5] text-ink-muted">
                        <span aria-hidden className="shrink-0 text-ink-muted">·</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-3">
                    <MagneticLink
                      to="/collections"
                      className="press group inline-flex items-center gap-2 rounded-full bg-ink text-bg px-7 py-3.5 font-sans text-[14px] font-bold tracking-[0.02em] transition-colors duration-300 hover:bg-accent hover:text-ink"
                      ariaLabel="Choose a print to hand-finish"
                    >
                      Choose a print to finish
                      <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                    </MagneticLink>
                    {/* Marketing anchor — mirrors the A2 embellishmentPricePence
                        (£595) in paintings.ts; the real per-size price shows on the
                        product page. */}
                    <span className="font-sans text-[clamp(13px,0.8vw,15px)] tracking-[0.02em] text-ink-muted">
                      From £595 · on the Collector &amp; Atelier prints · allow 2 weeks
                    </span>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* 6 · CRAFT — Each painting is a ritual.
              ⚠️ This section is DELIBERATELY the one "island" on the page: a
              rounded, translucent-dark card with a warm cream hairline ring +
              lift-shadow (NO backdrop-blur — scroll-jank gotcha). Hugo explicitly
              RESTORED "the cool island with the image of him painting + the
              details" on 2026-07-28 (see the figure note below), so do NOT strip
              the card wrapper back to a flat section — that would revert an owner
              decision. It holds the heading + intro + the full-width craft photo
              + two paragraphs + the 6-row material ledger. */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[2360px] 4xl:max-w-[3300px] px-4 sm:px-6 md:px-8 lg:px-12">
            <div className="relative overflow-hidden rounded-[22px] md:rounded-[32px] bg-[rgba(12,10,9,0.72)] ring-1 ring-line shadow-[0_50px_140px_-40px_rgba(0,0,0,0.85)] px-6 sm:px-10 md:px-12 lg:px-16 py-10 md:py-14 lg:py-16">
              {/* Section title ONLY above the image (consistent with every other
                  centred section title); the intro line moved DOWN into the text
                  column so no body copy bleeds above/below the photo (Hugo 2026-08-26:
                  "I hate how you bleed paragraph text below and above the ritual image
                  — I want consistency"). */}
              <Reveal as="div" className="text-center mb-8 md:mb-10">
                <h2 className={cn(TITLE, "my-0 max-w-[1280px] 2xl:max-w-[1520px] 3xl:max-w-[1780px] 4xl:max-w-[2040px] mx-auto hero-text-shadow")}>
                  Each painting is a ritual.
                </h2>
              </Reveal>
              {/* The ritual itself — Stephen painting a mandala at the easel —
                  beside the process prose + the material spec ledger, all held in
                  the island card (Hugo 2026-07-28: restore "the cool island with
                  the image of him painting + the details"). NO backdrop-blur on the
                  panel (scroll-lag gotcha) — the translucent fill + ring + shadow
                  give the island lift on their own. */}
              {/* items-stretch + the photo cover-filling its column to the text's
                  full height (lg:h-full) — Hugo 2026-07-28: the old items-center
                  floated the shorter photo with "gaps above and below". Now the
                  image is a flush full-bleed panel down the card's left half, level
                  with the prose. Mobile keeps its natural 4:3 (aspect-[4/3], no crop,
                  stacked). object-center keeps the two of them + the mandala. */}
              {/* TWO-COLUMN (Hugo 2026-08-25, big desktop: "the ritual image has huge
                  gaps either side — reshuffle it like the Steve's-own-words portrait
                  section, image beside the text, image to the left"). The photo fills
                  the LEFT column edge-to-edge (w-full → no side gaps), whole and never
                  cropped; the process prose + material ledger sit in the RIGHT column,
                  level with it. Stacks image-then-text below lg. */}
              <Reveal
                as="div"
                className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-stretch gap-8 lg:gap-12 xl:gap-16"
              >
                {/* The photo COVER-FILLS its column to the exact height of the prose
                    beside it (items-stretch + h-full + object-cover) so there is NO empty
                    band above/below/beside it — Hugo's hard rule: never leave gaps. The
                    prose column is only the intro + two paragraphs (the spec ledger moved
                    to a full-width strip below), so the two heights nearly match and the
                    cover-crop is tiny — object-center keeps the two of them + the mandala.
                    Mobile keeps the whole 4:3 frame (aspect box, stacked). */}
                <figure className="relative m-0 lg:h-full overflow-hidden rounded-[16px] md:rounded-[20px] ring-1 ring-line">
                  <AssetImage
                    src="/img/welcome/steve-and-collaborator-painting-v1.jpg"
                    alt="Stephen Meakin and a collaborator hand-finishing a large blue-and-gold mandala together at the studio table, the garden beyond the open doors"
                    loading="lazy"
                    decoding="async"
                    width={1800}
                    height={1350}
                    sizes="(min-width: 1024px) 55vw, 100vw"
                    className="block w-full h-auto lg:absolute lg:inset-0 lg:h-full lg:w-full lg:object-cover lg:object-center"
                  />
                </figure>
                {/* RIGHT — prose + spec, left-aligned beside the image (fills the width,
                    no dead space). Type scales up on 2xl→4xl so it reads level with the
                    photo on a huge screen. */}
                <div className="flex flex-col gap-5 md:gap-6">
                  <p className={cn(SUBTITLE, "reading-shadow m-0 text-left font-medium text-ink 2xl:text-[22px] 3xl:text-[27px] 4xl:text-[32px] 3xl:leading-[1.6]")}>
                    Each canvas hand-stretched, primed, and painted over hundreds of hours — compass, rule and brush translating sacred geometry into a singular visual language.
                  </p>
                  <p className={cn(SUBTITLE, "reading-shadow m-0 text-left 2xl:text-[21px] 3xl:text-[26px] 4xl:text-[31px] 3xl:leading-[1.6]")}>
                    Each canvas was hand-stretched on a deep wooden frame and painted over hundreds of hours. Stephen began every work with compass and rule, constructing the underlying sacred geometry before a single colour was laid down.
                  </p>
                  <p className={cn(SUBTITLE, "reading-shadow m-0 text-left 2xl:text-[21px] 3xl:text-[26px] 4xl:text-[31px] 3xl:leading-[1.6]")}>
                    When a painting depicted a flower, the oil pressed from that flower went into the paint itself — the <em>Mandala of Wild Rose</em> contains the rose. Each composition carries its own number, rhythm, cadence and tone.
                  </p>
                </div>
              </Reveal>
              {/* Material ledger — a full-width spec strip BELOW the image + prose, so
                  the two columns line up (the landscape photo is shorter than three
                  paragraphs; a balanced 2×3 spec table under both reads as a clean
                  footer, never paragraph text bleeding below the image). */}
              <ul className="list-none p-0 m-0 mt-9 md:mt-12 grid grid-cols-1 sm:grid-cols-2 gap-x-10 md:gap-x-16">
                {[
                  ["Time", "Hundreds of hours per canvas"],
                  ["Edition", "Individually made to order"],
                  ["Surface", "350gsm archival canvas"],
                  ["Frame", "Hand-stretched, deep wooden"],
                  ["Tools", "Compass · rule · brush"],
                  ["Pigment", "Hand-pressed oils + pigment inks"],
                ].map(([label, value]) => (
                  <li
                    key={label}
                    className="m-0 flex items-baseline justify-between gap-6 py-2.5 3xl:py-3.5 border-t border-line"
                  >
                    <span className={cn(EYEBROW_TIGHT, "shrink-0 uppercase")}>{label}</span>
                    <span className="text-right font-sans font-normal text-[15px] md:text-[16px] 3xl:text-[20px] 4xl:text-[24px] leading-[1.4] text-ink">{value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* THE RITUAL, IN MOTION — archive film of Stephen painting a mandala,
              seen from above: hundreds of hours of the compass-and-brush ritual
              the section above describes, in motion. Contained 16:9 plate,
              muted/looping/lazy, feathered into the backdrop; reduced-motion
              holds the poster still. */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[2360px] 4xl:max-w-[3300px] px-4 sm:px-6 md:px-8 lg:px-12">
            {/* Capped so this cinematic plate stays LARGE but never fills the
                whole screen (Hugo 2026-07-22: "no image should take up the full
                screen — check across the site"). */}
            {/* CONTAINED at the film's own 16:9 so the WHOLE frame plays — no cover-
                crop zoom, no letterbox bars (Hugo 2026-08-25: "zoom the video out so we
                can see the full video"). */}
            <Reveal as="figure" className="mt-0 mb-0 mr-0 w-screen ml-[calc(50%-50vw)]">
              <div className="relative w-full overflow-hidden h-[clamp(300px,44svh,440px)] md:h-[clamp(400px,62svh,760px)] 2xl:h-[clamp(440px,62svh,860px)] 3xl:h-[clamp(480px,60svh,960px)] 4xl:h-[clamp(520px,58svh,1040px)]">
                <LoopFilm
                  src="/video/studio-mandala-v1.mp4"
                  poster="/video/poster-studio-mandala-v1.jpg"
                  label="Stephen Meakin painting a mandala, filmed from above"
                  aspect="h-full"
                  edges="none"
                  objectPosition="center 30%"
                  className="absolute inset-0"
                />
              </div>
            </Reveal>
          </section>

          {/* 7 · SACRED GEOMETRY — 4-card grid of traditions */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[2360px] 4xl:max-w-[3300px] px-4 sm:px-6 md:px-8 lg:px-12">
            <Reveal as="div" className="text-center mb-4 md:mb-5">
              <p className={cn(EYEBROW, "m-0 mb-3")}>
                Sacred Geometry
              </p>
              <h2 className={cn(TITLE, "my-0 max-w-[1280px] 2xl:max-w-[1520px] 3xl:max-w-[1780px] 4xl:max-w-[2040px] mx-auto hero-text-shadow")}>
                Four traditions, one language.
              </h2>
            </Reveal>

            {/* The four traditions read as a CURATED EDITORIAL INDEX, not boxed
                chips: each is a hairline-ruled column in the page's own ledger
                language (the materials list below uses the same border-t rule),
                so the section fills the width as a confident canon rather than
                four generic grey cards. The oversized ghost Roman numeral was
                removed (restraint pass) — the name carries the canon; name + rule
                warm to accent on hover. */}
            <Reveal as="ul" className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 md:gap-x-12 gap-y-6 md:gap-y-7 list-none p-0 mb-4 md:mb-6">
              {[
                { tag: "I", name: "Insular Island Arts", note: "Celtic interlace, illuminated manuscript" },
                { tag: "II", name: "Rose Windows", note: "The great cathedrals of medieval Europe" },
                { tag: "III", name: "Persian Geometry", note: "Tessellation, girih, the courts of Isfahan" },
                { tag: "IV", name: "Tibetan Mandala", note: "Sacred diagram, meditation, visual henosis" },
              ].map((item) => (
                <li
                  key={item.tag}
                  className="group m-0 border-t border-line pt-4 md:pt-5 transition-colors duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:border-accent"
                >
                  <p
                    className="font-display text-ink text-[clamp(22px,2.6vw,36px)] tracking-[-0.02em] leading-[1.1] m-0 mb-2 transition-colors duration-300 group-hover:text-accent"
                    style={{ fontVariationSettings: '"opsz" 48, "wght" 700', fontWeight: 700 }}
                  >
                    {item.name}
                  </p>
                  <p className="font-sans font-normal text-[14px] leading-[1.5] text-ink/70 m-0">
                    {item.note}
                  </p>
                </li>
              ))}
            </Reveal>

            <Reveal>
              <p className={cn(SUBTITLE, "reading-shadow max-w-[1280px] 2xl:max-w-[1520px] 3xl:max-w-[1780px] 4xl:max-w-[2040px] mx-auto my-0 text-justify [text-align-last:center] hyphens-auto")}>
                {WELCOME.bio[1]}
              </p>
            </Reveal>
          </section>

          {/* 8 · ARISTA SUNSTAR — text, then the archive photograph BELOW it,
              enlarged (Hugo). It was a small image BESIDE the text, which left
              two blank columns; now the copy leads and the photo sits under it
              at a generous width. The soft-edge feather is REMOVED
              (edges="none") because it read as "blurry/murky" dissolving into
              the peacock wash — a clean ring frame lifts the photo OFF the busy
              backdrop into a crisp gallery object. The source is low-res
              (641×353, 16:9), so the width is capped (~920px) rather than blown
              full-bleed where it would go soft. */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[2360px] 4xl:max-w-[3300px] px-4 sm:px-6 md:px-8 lg:px-12">
            <Reveal as="div" className="mx-auto max-w-[1280px] 2xl:max-w-[1520px] 3xl:max-w-[1780px] 4xl:max-w-[2040px] text-center">
              <p className={cn(EYEBROW, "m-0 mb-3")}>
                Arista SunStar · 2016
              </p>
              <h2 className={cn(TITLE, "m-0 mb-3 hero-text-shadow")}>
                A 3.6&#8209;metre commission for Notting Hill.
              </h2>
              {/* Key-fact strip — surfaces the commission's provenance up
                  front instead of burying it in prose. */}
              <p className="font-sans text-[13px] font-bold tracking-[0.02em] text-ink/70 m-0">
                Diameter 3.6m <span className="text-ink/35 mx-1">·</span> Commissioned 2016
              </p>
            </Reveal>

            {/* Archive FILM — moved DIRECTLY under "Commissioned 2016" (Hugo
                2026-07-04: "put video underneath commissioned 2016 … so it's
                separated") and enlarged to match the other home film — the clip
                is 720p, so it holds up big. The prose + the (now small) archive
                photo sit BELOW, so the film and the photo are never stacked
                adjacent. Muted / looping / lazy, feathered like the other film. */}
            {/* FULL-BLEED band, edge-to-edge, ~55svh (Hugo 2026-08-25: "to the edges
                like before, not full screen"). Uses arista-timelapse-V2 — the baked-in
                160px pillarbox black bars were PHYSICALLY CROPPED out of the file
                (v1 1280×720 pillarboxed → v2 960×720 clean 4:3), so at full width the
                cover-crop shows the footage with NO black bars. */}
            <Reveal as="figure" className="mt-6 md:mt-8 mb-0 mr-0 w-screen ml-[calc(50%-50vw)]">
              <div className="relative w-full overflow-hidden h-[clamp(300px,44svh,440px)] md:h-[clamp(400px,62svh,760px)] 2xl:h-[clamp(440px,62svh,860px)] 3xl:h-[clamp(480px,60svh,960px)] 4xl:h-[clamp(520px,58svh,1040px)]">
                <LoopFilm
                  src="/video/arista-timelapse-v2.mp4"
                  poster="/video/poster-arista-timelapse-v2.jpg"
                  label="The Arista SunStar being painted, in timelapse"
                  aspect="h-full"
                  edges="none"
                  objectPosition="center 70%"
                  className="absolute inset-0"
                />
              </div>
            </Reveal>

            {/* The commission prose, between the film and the photo. */}
            <Reveal as="div" className="mx-auto max-w-[1280px] 2xl:max-w-[1520px] 3xl:max-w-[1780px] 4xl:max-w-[2040px] text-center mt-6 md:mt-8">
              <p className={cn(SUBTITLE, "reading-shadow m-0 mx-auto max-w-[1280px] 2xl:max-w-[1520px] 3xl:max-w-[1780px] 4xl:max-w-[2040px] text-justify [text-align-last:center] hyphens-auto")}>
                {WELCOME.bio[2]}
              </p>
            </Reveal>

            {/* Archive photo — enlarged (Hugo 2026-07-24: "ridiculously small,
                fix"). The source is only 641×353 so we cap the upscale ~1.3× and
                lean on the soft-edge feather to keep it from reading as pixelated;
                bigger so it fills the section. Never cropped; ring frame kept. */}
            {/* Arista SunStar PHOTO — a low-res archive scan (641×353). Kept SMALL,
                capped BELOW its native width so it's downscaled + sharp rather than
                upscaled + soft (Hugo 2026-08-25: "make it smaller, quality is terrible").
                Never let its display width exceed ~600px. */}
            <Reveal as="figure" className="relative m-0 mt-8 md:mt-10 mx-auto w-full max-w-[440px] md:max-w-[540px] 2xl:max-w-[600px]">
              {/* (Removed the cream glow that sat behind the photo + caption —
                  Hugo 2026-07-30: "that background behind the writing, remove it".
                  The caption now sits directly on the peacock backdrop.) */}
              <div className="overflow-hidden">
                <AssetImage
                  src="/img/welcome/05-arista-sunstar-v3.jpg"
                  alt="Stephen standing beside the full 3.6-metre Arista SunStar painting at the Farmacy restaurant, Notting Hill"
                  loading="lazy"
                  decoding="async"
                  className="block w-full h-auto"
                />
              </div>
              <figcaption className="font-sans text-[13px] md:text-[14px] font-bold tracking-[0.02em] text-ink/80 mt-4 text-center">
                Farmacy · Notting Hill · London
              </figcaption>
              <p className="font-display italic text-[17px] md:text-[19px] leading-[1.6] text-ink/85 mt-2.5 text-center">
                Photograph from Stephen's archive, c. 2016.
              </p>
            </Reveal>
          </section>

          {/* ── GAS-GIANT CLOSE · "as above, so below" ─────────────────────
              The page OPENS on the EARTH (masthead, top) and CLOSES on JUPITER
              (here, foot) — Hugo 2026-07-24: "replace the bottom earth with
              another planet … that matches the earth's glow and hardness and
              shape." Earth stays at the top. The moon/sun were both rejected
              (dull / too bright); the coherent answer is a REAL photographed
              gas-giant limb (NASA Juno PIA22946, public domain — the full Jupiter
              globe on black). Its warm cream/orange TOP CAP is cut to the SAME
              wide-shallow limb proportions + transparent-space RGBA + radial
              feather as the Earth cutout, so it behaves identically: the limb
              curves UP from the foot, the body bleeding below the fold, mirroring
              the Earth's limb curving DOWN at the top. The warm bands echo the
              rust accent. v2 (2026-07-24, Hugo: "too big + no glow like earth"):
              re-cut SHALLOWER/gentler (thin limb, not a dome) to match the Earth's
              proportion, and a bright warm ATMOSPHERIC RIM GLOW baked along the limb
              (outer bloom + inner rim) so it glows like the top Earth. Processed by
              ImageMagick (shallow crop → transparent black → alpha-feather → baked
              wide+edge warm glow → warm modulate); regenerate under a new -vN
              filename (immutable /img cache). Decorative only (aria-hidden). */}
          {/* ⚠️ Jupiter foot (v12, 2026-07-27) — Hugo: "we wanna SEE the spot to
              know it's even Jupiter". The Great Red Spot sits LOW on the globe, so a
              thin top-cap limb (like the Earth) can never show it — the limb has to
              be taller to include it. v12 is the final limb shape: cropped rim →
              just past the Great Red Spot, its flat-black space keyed to TRANSPARENCY
              (so the peacock shows through above the limb — no black bar, the v9 bug)
              + a warm ATMOSPHERIC RIM GLOW baked along the limb edge (matching the
              masthead Earth's luminous limb). Rendered IN-FLOW full-bleed so it
              scales consistently at every width and the spot is always visible.
              Verified via peacock composite (rim glow + bands + Great Red Spot +
              peacock above + flush catalogue, no black bar). It is deliberately
              taller than the top Earth limb — that is the cost of showing the spot. */}
          <section
            aria-hidden="true"
            /* mb cancels <main>'s pb-8/md:pb-10 (+1px) so the Jupiter limb butts
               FLUSH against the red footer — no near-black page-bg band showing
               between the globe and the footer (Hugo 2026-07-27). */
            className="relative z-20 isolate w-full overflow-hidden !mt-[clamp(64px,9vh,150px)] !-mb-8 md:!-mb-10"
          >
            {/* (Removed the warm halo band that sat above the Earth limb — Hugo
                2026-07-30: it read as a "line of shading above the earth". The
                earth-cutout asset already carries its own baked rim glow, so the
                planet still glows without this extra gradient band.) */}
            <img
              // ⚠️ THE FOOT IS NOW THE EXACT MIRROR OF THE TOP EARTH (Hugo
              // 2026-07-28, after ~14 rejected Jupiter re-crops: "I need it to be
              // JUST LIKE EARTH IN SHAPE SIZE ETC"). Every Jupiter asset was a
              // taller/domed limb (to fit the Great Red Spot) and so could never
              // match the thin top Earth. The only way to GUARANTEE identical
              // shape + size + glow is to reuse the SAME approved earth-cutout-v2
              // asset with the SAME width classes as the masthead — here in its
              // NATURAL orientation (no scaleY flip) so the limb curves UP from
              // the foot, a true vertical reflection of the Earth curving DOWN at
              // the top. "As above, so below" — Earth above, Earth mirrored below.
              src={asset("/img/scenes/earth-cutout-v2.webp")}
              alt=""
              loading="lazy"
              decoding="async"
              // FILLS THE FULL WIDTH + SIDES like the top Earth (Hugo 2026-08-03:
              // "the earth at the bottom doesn't fill the screen and sides like
              // the top does"). The old md:w-[92%] left 4% side gaps and the 82%
              // radial mask cut the two TOP corners (against the ambient), so the
              // foot read narrower than the pinned top limb. Now it overscans past
              // both edges and the mask is wide enough to keep the sides + corners
              // solid — only the very top-centre feathers into the backdrop.
              // WHOLE, SMALLER, CENTRED — the exact mirror of the top Earth (Hugo
              // 2026-08-23: the foot Earth was "way too big"). Height-capped, natural
              // aspect (never cropped), centred with mx-auto; no overscan, no crop.
              // SMALLER, edge-to-edge BAND — the exact mirror of the masthead Earth
              // (Hugo 2026-08-24: "both earths are way too big"). w-full keeps both
              // edges touched; object-cover trims only the darker planet, object-
              // position keeps the luminous limb curving up from the footer.
              className="relative z-[1] block select-none w-full h-[clamp(150px,23vw,480px)] object-cover"
              style={{
                maxWidth: "none",
                objectPosition: "center top",
                // CONSISTENT WITH THE TOP EARTH (Hugo 2026-08-24: "decide one and apply
                // to both"). Chosen treatment: the bright limb reads CRISP/solid where
                // it faces the page, softening only where it meets the bar. So the top
                // rim gets only a whisper of feather (was 38% → semi-transparent, which
                // is the mismatch he flagged) and the surface stays solid + flush into
                // the footer — the exact mirror of the masthead's crisp rim tucking
                // under the nav.
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, #000 11%)",
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, #000 11%)",
              }}
            />
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};
