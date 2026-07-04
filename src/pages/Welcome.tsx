import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { ImageReveal } from "../components/ImageReveal";
import { AssetImage } from "../components/AssetImage";
import { MagneticLink } from "../components/MagneticLink";
import { WELCOME } from "../data/content";
import { PAINTINGS, COLLECTIONS, getLowestTierPricePence, paintingImageAlt } from "../data/paintings";
import { asset } from "../lib/asset";
import { cn } from "../lib/cn";
import { useCurrency } from "../lib/currency";
import { EYEBROW, TITLE, SUBTITLE, EYEBROW_TIGHT } from "../components/ui/tokens";
import { Seo } from "../components/Seo";
import { PavoBackdrop } from "../components/PavoBackdrop";

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
      // make symmetrical"): equal mt/mb so the film sits just under the lockup
      // with matched space above and below — no longer a tiny gap above + a big
      // one below. The masthead's justify-end places the lockup at the viewport
      // foot, so mt is the whole visible gap up to the wordmark.
      className="relative z-30 w-full mt-[clamp(22px,4svh,52px)] mb-[clamp(22px,4svh,52px)]"
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
            tiny bar, which is ridiculous"): ~62% of the viewport height on every
            device — a genuinely large full-bleed band. The 340px floor keeps it
            substantial on short landscape phones; the 1200px ceiling stops a 4K
            wall becoming taller than the film can resolve while still ~55svh
            there. object-cover + the vertical feather handle every ratio. */}
        <div
          className="relative w-full overflow-hidden bg-transparent h-[clamp(380px,70svh,1360px)]"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
          }}
        >
          {near && (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              poster={asset("/video/poster-garden-galaxy-v1.jpg")}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
            >
              <source src={asset("/video/garden-galaxy-v1.mp4")} type="video/mp4" />
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

/**
 * LoopFilm — a reusable muted/looping autoplay video for the home page's
 * archive footage (Stephen at work). Same robust playback contract as
 * CosmicInterlude: lazy-mounts via IntersectionObserver, forces muted +
 * imperative play() on mount / metadata / canplay + a first-interaction
 * fallback so it loops with NO play button on iOS too. Reduced-motion holds
 * the poster still (never null — the section must keep its visual). The box
 * is driven by `aspect` (Tailwind class); `edges` feathers y / all / none;
 * `frame` draws the archive-plate ring.
 */
const LoopFilm = ({
  src,
  poster,
  label,
  aspect,
  edges = "y",
  frame = false,
  className,
}: {
  src: string;
  poster: string;
  label: string;
  aspect: string;
  edges?: "y" | "all" | "none";
  frame?: boolean;
  className?: string;
}) => {
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
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduceMotion]);

  useEffect(() => {
    if (!near) return;
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;
    video.setAttribute("muted", "");
    video.load();
    const tryPlay = () => void video.play?.().catch(() => {});
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

  const mask =
    edges === "y"
      ? {
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, #000 9%, #000 91%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, #000 9%, #000 91%, transparent 100%)",
        }
      : edges === "all"
        ? {
            WebkitMaskImage:
              "radial-gradient(120% 120% at 50% 50%, #000 62%, transparent 100%)",
            maskImage:
              "radial-gradient(120% 120% at 50% 50%, #000 62%, transparent 100%)",
          }
        : undefined;

  return (
    <div
      ref={ref}
      className={cn(
        "relative w-full overflow-hidden bg-transparent",
        aspect,
        frame && "rounded-[3px] ring-1 ring-ink/70 shadow-[0_30px_80px_rgba(0,0,0,0.5)]",
        className,
      )}
      style={frame ? undefined : mask}
    >
      {/* Poster paints immediately (and is the reduced-motion still). */}
      <img
        src={asset(poster)}
        alt={label}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {!reduceMotion && near && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          poster={asset(poster)}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label={label}
        >
          <source src={asset(src)} type="video/mp4" />
        </video>
      )}
    </div>
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
        description="Estate-stamped giclée prints of British mandala artist Stephen Meakin's sacred-geometry paintings. Made to order in Lewes — free worldwide delivery."
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
        className="relative z-20 isolate w-full overflow-hidden flex flex-col items-center min-h-0 landscape:min-h-[100svh] justify-end pt-[max(6rem,10svh)] sm:pt-[max(6rem,9svh)] pb-[clamp(16px,3svh,38px)]"
        aria-label="The Mandala Company"
      >
        {/* Softening scrim — a gentle, mostly-even veil so the indigo peacock
            backdrop reads continuously up to the Earth limb; the wordmark keeps
            its own heavy text-shadow for legibility. z-0, below the limb (z-1)
            + the text (z-10). (NOTE: a 2026-06-28 cinematic-open attempt that
            put the Veo film here as a full-viewport sky was reverted — that
            film is a BRIGHT daylit garden scene, so as the open's sky it
            out-shouted the cream wordmark and buried the Earth limb, breaking
            Hugo's brightness rule + his defended open composition.) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(9,7,13,0.34) 0%, rgba(9,7,13,0.12) 45%, rgba(9,7,13,0) 100%)",
          }}
        />
        {/* Earth limb pinned to the TOP — the natural Earth SPUN AROUND (scaleY -1)
            so the limb sits up top and curves DOWN into the page (the exact mirror
            of the SUN that now closes the page at the finale). Its black space is
            baked transparent (alpha = luminance); the same radial mask the finale
            uses is flipped with the image, so it stays solid at the pinned TOP edge
            and dissolves into the peacock painting below. (Swapped 2026-06-19 at
            Hugo's direction: Earth opens, Sun closes — keep text placement.) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] overflow-hidden"
        >
          {/* Warm rim halo behind the limb at the TOP — atmosphere only. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[45%]"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 0%, rgba(201,120,68,0.14) 0%, rgba(201,120,68,0) 72%)",
            }}
          />
          {/* Hugo's natural Earth limb, the same asset that closes the page — here
              top-pinned + scaleY(-1) so it curves down from the top. width 124% +
              -12% marginLeft centres a slightly-overscanned limb reaching both
              edges; maxWidth:none lifts the global img clamp (gotcha). */}
          <img
            src={asset("/img/scenes/earth-cutout.png")}
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
            // The limb is a fixed-ratio wide image — tall on a wide screen but a
            // thin sliver on a narrow phone, which left a gap above the wordmark.
            // Scale it UP on smaller widths so it anchors the top and the limb
            // reads as a real Earth curve, not a hairline (the marginLeft keeps
            // it centred: ml = -(width-100)/2). Settles to 124% on md+.
            className="block h-auto select-none w-[230%] ml-[-65%] sm:w-[150%] sm:ml-[-25%] md:w-[124%] md:ml-[-12%]"
            style={{
              display: "block",
              maxWidth: "none",
              height: "auto",
              // SPIN AROUND — limb at the top, curving down into the page.
              transform: "scaleY(-1)",
              // Same radial dissolve as the finale Earth; scaleY(-1) flips it so it
              // is solid at the pinned TOP edge and melts into the backdrop below.
              WebkitMaskImage:
                "radial-gradient(82% 135% at 50% 100%, #000 50%, rgba(0,0,0,0.35) 77%, transparent 96%)",
              maskImage:
                "radial-gradient(82% 135% at 50% 100%, #000 50%, rgba(0,0,0,0.35) 77%, transparent 96%)",
            }}
          />
        </div>

        {/* THE WORDMARK — back where it belongs: the estate statement reading
            over the lower sun, BIG + clearly legible (on the feathered dark sun +
            painting), the two-tier Fraunces composition mirroring the Earth close. */}
        <div className="relative z-10 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 text-center">
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
                    fontSize: "min(clamp(60px, 14vw, 200px), 16svh)",
                    letterSpacing: "-0.03em",
                    lineHeight: 0.92,
                    textTransform: "uppercase",
                    color: "#ede6d6",
                    textShadow:
                      "0 2px 42px rgba(8,6,12,0.9), 0 1px 4px rgba(8,6,12,0.85), 0 0 60px rgba(8,6,12,0.5)",
                  }}
                >
                  The Mandala Company
                </span>
              ) : (
                <motion.span
                  className="block text-balance"
                  style={{
                    fontVariationSettings: '"opsz" 48, "wght" 700',
                    fontWeight: 700,
                    fontSize: "min(clamp(60px, 14vw, 200px), 16svh)",
                    letterSpacing: "-0.03em",
                    lineHeight: 0.92,
                    textTransform: "uppercase",
                    color: "#ede6d6",
                    textShadow:
                      "0 2px 42px rgba(8,6,12,0.9), 0 1px 4px rgba(8,6,12,0.85), 0 0 60px rgba(8,6,12,0.5)",
                  }}
                  initial="hidden"
                  animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } }}
                >
                  {["The", "Mandala", "Company"].map((word, i) => (
                    <motion.span
                      key={word}
                      style={{ display: "inline-block" }}
                      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                      transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
                    >
                      {word}
                      {i < 2 ? " " : ""}
                    </motion.span>
                  ))}
                </motion.span>
              )}
              {/* "The Art of Stephen Meakin" lockup — the red wax-seal rose +
                  the title-case wordmark (matches the nav brand; Hugo). */}
              <span
                className="flex flex-wrap items-center justify-center gap-x-[clamp(8px,1vw,18px)] gap-y-1 text-balance"
                style={{
                  fontVariationSettings: '"opsz" 36, "wght" 600',
                  fontWeight: 600,
                  fontSize: "clamp(22px, 4vw, 42px)",
                  letterSpacing: "-0.005em",
                  lineHeight: 1.1,
                  color: "#f1ead9",
                  marginTop: "clamp(10px, 1.2vw, 20px)",
                  textShadow:
                    "0 1px 2px rgba(8,6,12,0.95), 0 2px 18px rgba(8,6,12,0.95), 0 0 40px rgba(8,6,12,0.6)",
                }}
              >
                <img
                  src={`${import.meta.env.BASE_URL}logo/logo-seal-v9-w256.png`}
                  alt=""
                  aria-hidden="true"
                  className="h-[1.4em] w-[1.4em] shrink-0 object-contain"
                  style={{ filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.65))" }}
                />
                <span style={{ fontFamily: '"Fraunces", serif' }}>
                  The Art of Stephen Meakin
                </span>
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* COSMIC INTERLUDE — the garden→galaxy boomerang film in a museum-framed
          expanded plate right under the wordmark. Lazy + reduced-motion safe. */}
      <CosmicInterlude />

      <div id="welcome-anchor" className="relative">
        {/* PAVO TAPESTRY BACKDROP — all five colourways, each shown WHOLE and
            zoomed out, crossfading on page-scroll. Shared with About. Fade
            windows: indigo holds the hero, Mary Pink holds the finale. */}
        <PavoBackdrop
          fades={[
            [0.16, 0.24],
            [0.36, 0.44],
            [0.56, 0.64],
            [0.76, 0.84],
          ]}
        />

        {/* ONE vertical rhythm for the whole page. Each section's gap is the
            SAME at every breakpoint (space-y), instead of being the sum of two
            neighbours' paddings — which is what produced the uneven 64→176px
            jumps Hugo flagged. Sections no longer carry their own py; the gap
            lives here so it can never double up or collapse. */}
        <main className="relative isolate z-10 space-y-5 md:space-y-6 lg:space-y-7 pb-8 md:pb-10">
          {/* 1 · HERO — HORIZONTAL headline across the top, the beloved
              studio photo MAXIMISED full content-width beneath it (Hugo: "make
              it horizontal so the full image can be maximised below — I hate the
              blank space around it"). No side column, no text-over-image overlap:
              the headline sits ABOVE the photo; the photo owns the full width. */}
          <section className="relative isolate w-full overflow-hidden pt-4 md:pt-6">
            <div className="mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12">
              <Reveal as="div" className="text-center">
                <h1 className="font-display tracking-[-0.045em] text-ink m-0 mx-auto text-balance hero-text-shadow">
                  <span className="block font-semibold text-[clamp(48px,8.4vw,120px)] leading-[0.98]">
                    So here we are on Earth
                  </span>
                  <span className="block font-normal italic text-[clamp(26px,4.4vw,56px)] leading-[1.12] mt-3 md:mt-4 text-ink/90">
                    &mdash; orbiting a Sun Star at about 67,062 miles an hour.
                  </span>
                </h1>
                <div className="mt-6 md:mt-7 flex flex-wrap items-center justify-center gap-3">
                  <MagneticLink
                    to="/collections"
                    className="press group inline-flex w-fit items-center bg-ink text-bg px-6 py-3.5 font-sans text-[13px] font-bold tracking-[0.04em] rounded-full transition-colors duration-300 hover:bg-accent hover:text-ink whitespace-nowrap"
                    ariaLabel="See the collection"
                  >
                    See the collection <span aria-hidden="true" className="ml-2 inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-x-1">&rarr;</span>
                  </MagneticLink>
                  <MagneticLink
                    to="/about"
                    className="press inline-flex w-fit items-center justify-center text-ink border border-[rgba(237,230,214,0.35)] px-8 py-3.5 font-sans text-[13px] font-bold tracking-[0.04em] rounded-full transition-colors duration-300 hover:border-accent hover:text-accent whitespace-nowrap"
                    ariaLabel="About Stephen"
                  >
                    His story
                  </MagneticLink>
                </div>
              </Reveal>

              {/* The studio photo — MAXIMISED full content width beneath the
                  headline, large + crisp, soft-edged (no frame box, no side voids). */}
              <Reveal as="figure" className="m-0 mt-6 md:mt-7">
                {/* The studio photo shows WHOLE — its box matches the source's
                    native 3:2 ratio (1200×800), so object-cover fits it edge-to-
                    edge with no crop (the earlier aspect-[3/1] sliced away the
                    top + bottom third — Hugo: "stop cropping my main image").
                    The soft-edge feather hides the tiny scale-[1.04] parallax
                    bleed, so the full frame reads. */}
                <ImageReveal
                  src="/img/welcome/01-painting-wild-rose.jpg"
                  alt="Stephen Meakin painting Wild Rose at his studio desk, beside a large circular wall mandala"
                  eager
                  aspect="aspect-[3/2]"
                  edges="all"
                  parallax={0.08}
                  objectPosition="center"
                  shadow="shadow-[0_40px_110px_rgba(0,0,0,0.55)]"
                  sizes="(min-width: 1400px) 1320px, 92vw"
                />
              </Reveal>
            </div>
          </section>

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
          <section className="relative isolate mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12">
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
            <Reveal as="header" className="mb-3 md:mb-4 text-left">
              <p className={cn(EYEBROW, "m-0 mb-3")}>A reminder</p>
              {/* Illuminated opening CLAUSE — reminderLong[0]'s first sentence as
                  a large flush-left display lede (the rust drop-cap now
                  illuminates a whole clause), then the remainder of that SAME
                  verbatim paragraph drops to reading size beneath. The .drop-cap
                  recipe (global.css, @supports initial-letter:2) scales for free.
                  Words untouched; the full paragraph still appears once, in order. */}
              <p
                className="drop-cap font-display font-semibold tracking-[-0.03em] text-ink m-0 max-w-[26ch] text-balance"
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
                  className="font-sans font-normal text-[20px] md:text-[22px] 2xl:text-[24px] leading-[1.5] text-ink-soft m-0 mt-3 md:mt-4 max-w-[72ch] text-pretty"
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
            <Reveal delay={0.05} className="my-5 md:my-7 text-left">
              <blockquote className="m-0 hero-text-shadow">
                {/* Dominant tier — breaks LEFT, oversized, stacks 3-4 commanding
                    lines against the rail. opsz held at 48 (finale invariant). */}
                <span
                  className="block font-display font-semibold text-ink max-w-[18ch]"
                  style={{
                    fontVariationSettings: '"opsz" 48, "wght" 600',
                    fontWeight: 600,
                    fontSize: "clamp(50px, 10.5vw, 132px)",
                    letterSpacing: "-0.045em",
                    lineHeight: 0.92,
                  }}
                >
                  {WELCOME.reminderLong[3].split(". ")[0] + "."}
                </span>
                {/* Subordinate — "Quite literally." answers on the RIGHT axis,
                    its closing period the one rust note. */}
                <span
                  className="block w-fit ml-auto text-right font-display font-normal italic text-ink/90"
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
                  <span className="text-accent not-italic">.</span>
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
            <Reveal as="div" className="mx-auto max-w-[1180px] 2xl:max-w-[1320px] 3xl:max-w-[1500px] columns-1 md:columns-2 gap-x-10 lg:gap-x-16 2xl:gap-x-20 [column-fill:_balance]">
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
                    className="font-sans font-normal text-[clamp(20px,0.6vw+17px,25px)] leading-[1.45] text-ink-soft m-0 mb-3 md:mb-4 last:mb-0 text-pretty hyphens-auto"
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
            <Reveal delay={0.1} className="mt-5 md:mt-7 text-center">
              <div aria-hidden="true" className="mx-auto mb-3 md:mb-4 h-px w-16 bg-ink/20" />
              <p className="m-0 mx-auto max-w-[1180px] 2xl:max-w-[1320px] 3xl:max-w-[1500px] text-center hero-text-shadow">
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
          <section className="relative isolate w-full overflow-hidden">
            {/* DESKTOP/TABLET — portrait bleeding to the LEFT edge. Reined in
                2026-06-03 (Hugo: images too big) to match the trimmed hero —
                a contained framed portrait, not a full-viewport takeover. */}
            <figure className="m-0 hidden md:block absolute top-0 bottom-0 left-4 sm:left-6 md:left-8 lg:left-12 w-[44%] lg:w-[42%]">
              {/* EVEN melt: feather the portrait on ALL FOUR sides (was y-only,
                  which left a hard rectangular left/right edge against the page
                  gutter). With edges="all" it dissolves into the page identically
                  top, bottom, left and right — the mirror of the hero figure's
                  "melts even" treatment, no single hard seam. */}
              <ImageReveal
                src="/img/welcome/02-portrait-denim.jpg"
                alt="Stephen Meakin"
                fill
                edges="all"
                parallax={0.1}
                objectPosition="center 35%"
                shadow=""
              />
              {/* Inner-right calm zone — a SOFT elliptical wash anchored at the
                  portrait's inner-right (where the copy overlaps), fading to FULLY
                  TRANSPARENT (alpha 0) at every edge so it can never read as a box
                  or a one-sided dark strip. Replaces the old one-directional melt
                  that started at solid #0a0908 and quieted only the right half —
                  now it quiets the area under the text evenly, the same recipe the
                  hero figure uses (mirrored to the inner-right). */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(95% 100% at 110% 50%, rgba(10,9,8,0.46) 0%, rgba(10,9,8,0.24) 22%, rgba(10,9,8,0.08) 46%, rgba(10,9,8,0) 66%)",
                }}
              />
            </figure>

            {/* Text column — right of the portrait, vertically centred. */}
            <div className="relative z-10 mx-auto flex max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] items-center justify-end px-4 sm:px-6 md:px-8 lg:px-12 py-4 md:min-h-[22svh] md:py-0">
              <Reveal as="div" className="w-full md:max-w-[52%] lg:max-w-[50%]">
                {/* MOBILE portrait — above the copy. */}
                <figure className="m-0 mb-6 md:hidden max-w-[460px]">
                  <ImageReveal
                    src="/img/welcome/02-portrait-denim.jpg"
                    alt="Stephen Meakin"
                    aspect="aspect-[4/5]"
                    edges="all"
                    parallax={0.12}
                    objectPosition="center"
                    shadow="shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
                  />
                </figure>
                <p className={cn(EYEBROW, "m-0 mb-4")}>
                  {WELCOME.invocation}
                </p>
                <h2 className={cn(TITLE, "m-0 mb-3 md:mb-4 hero-text-shadow")}>
                  The art of Stephen Meakin — mandala artist and sacred geometer.
                </h2>
                <p className={cn(SUBTITLE, "m-0")}>
                  {WELCOME.bio[0]}
                </p>
              </Reveal>
            </div>
          </section>

          {/* 4 · STUDIO — full-bleed cinematic break. ⚠️ Keep this a REAL band:
              the 07-02 4/1–5/1 letterbox squashed it to a sliver on wide
              screens and Hugo rejected it hard ("ruined the sizing… it's
              tiny"). These are the June-03 proportions he approved — shorter
              than a raw 3:2 on 4K, but still a substantial cinematic moment. */}
          <Reveal as="figure" className="m-0 w-full px-4 sm:px-6 md:px-8 lg:px-12">
            <ImageReveal
              src="/img/welcome/03-painting-in-studio.jpg"
              alt="Stephen painting in the studio"
              aspect="aspect-[5/3] md:aspect-[12/5] 2xl:aspect-[5/2]"
              edges="y"
              parallax={0.06}
              objectPosition="center 62%"
              shadow=""
              // Full-bleed minus the px-4→px-12 page gutter — effectively the
              // viewport width; the appended 2000w original covers wide screens.
              sizes="100vw"
            />
          </Reveal>

          {/* 5 · FEATURED WORKS — 3×2 grid of signature paintings */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12">
            <Reveal as="div" className="text-center mb-4 md:mb-5">
              <p className={cn(EYEBROW, "m-0 mb-3")}>
                From the hand
              </p>
              <h2 className={cn(TITLE, "my-0 max-w-[1180px] mx-auto hero-text-shadow")}>
                Six paintings from a lifetime at the compass.
              </h2>
            </Reveal>
            {/* UNIFORM GRID (Hugo: "make it in rows like before" — the salon-hang
                big-lead-plus-satellites read as a glitched, uneven layout). All
                six tiles are the SAME size in clean rows: 2-up on mobile, 3-up on
                desktop (3×2). min-w-0 stops a long title token widening a column. */}
            <Reveal as="div" className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-6 md:gap-x-6 md:gap-y-7 mb-5 md:mb-6">
              {featured.map(({ painting, cover }) => {
                const collectionTitle = COLLECTIONS.find((c) => c.id === painting.collection)?.title.split(" — ")[0] ?? "";
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
                    <div className="relative aspect-square overflow-hidden bg-ink/5 ring-1 ring-line transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-[0_30px_72px_rgba(0,0,0,0.6)]">
                      {/* Gentle zoom on hover only — a small scale-up of the
                          cover. Hugo: hover should zoom in a little, never flick
                          to another colourway. */}
                      <div className="absolute inset-0 transition-transform duration-[900ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.03]">
                        <AssetImage
                          src={cover.image}
                          alt={paintingImageAlt(painting.title, cover.name)}
                          loading="lazy"
                          decoding="async"
                          sizes="(min-width: 1400px) 420px, (min-width: 640px) 30vw, 90vw"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    {/* Museum WALL-LABEL (2026-06-28 bold redesign) — the price
                        comes OFF the image (the floating rounded pill was the one
                        Shopify-template tell on the page) and folds into a quiet
                        typographic caption: title + year/collection on the left,
                        the existing "From £…" as a tabular figure on the right,
                        across a hairline rule. The Link's aria-label still spells
                        the price, so a11y is unchanged. */}
                    <div className="flex items-baseline justify-between gap-4 pt-4 border-t border-line">
                      <div className="min-w-0">
                        <h3 className="font-display font-bold text-[18px] md:text-[22px] tracking-[-0.015em] text-ink m-0 leading-[1.2] group-hover:text-accent transition-colors duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)]">
                          {painting.title}
                        </h3>
                        <p className={cn(EYEBROW_TIGHT, "tracking-[0.08em] mt-1.5 m-0")}>
                          {hasYear ? painting.year : collectionTitle}
                        </p>
                      </div>
                      <span className="shrink-0 font-sans text-[13px] font-bold [font-variant-numeric:tabular-nums] text-ink-muted whitespace-nowrap group-hover:text-ink transition-colors duration-300">
                        From {fmtPrice(fromPrice)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </Reveal>

            <Reveal as="div" className="text-center">
              <MagneticLink
                to="/collections"
                className="press group inline-flex items-center gap-2 ring-1 ring-ink/40 px-7 py-3.5 font-sans text-[13px] font-bold tracking-[0.04em] rounded-full text-ink transition-all duration-300 hover:ring-accent hover:text-accent"
                ariaLabel="See every painting"
              >
                See every painting <span aria-hidden="true" className="ml-1 inline-block transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
              </MagneticLink>
            </Reveal>
          </section>

          {/* STEPHEN AT WORK — Hugo's supplied studio photograph: Stephen
              painting at the easel with a finished mandala on the wall behind.
              A full-content-width plate at native 3:2 (shown WHOLE, no crop)
              that leads into the "ritual" section. */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12">
            <Reveal as="figure" className="m-0">
              <ImageReveal
                src="/img/welcome/stephen-painting-denim-v1.jpg"
                alt="Stephen Meakin painting a mandala at the easel, a finished mandala on the wall behind him"
                aspect="aspect-[3/2]"
                edges="all"
                parallax={0.08}
                objectPosition="center"
                shadow="shadow-[0_40px_110px_rgba(0,0,0,0.55)]"
                sizes="(min-width: 1400px) 1320px, 92vw"
              />
            </Reveal>
          </section>

          {/* 6 · CRAFT — Each painting is a ritual.
              REFINED CONTAINER (Hugo 2026-06-03): this dense section (heading +
              intro + image + two paragraphs + a 6-item materials grid) needs a
              container or the text reads "all over the place" over the busy
              backdrop. The original hard, sharp, near-opaque black rectangle
              (`bg-[rgba(10,9,8,0.88)]` + square corners) was the "isn't smooth"
              problem — removing it entirely was an over-correction. This is the
              right answer: a premium frosted-glass panel — generous rounding,
              a translucent dark fill that lets the blurred mandala glow
              through, a hairline luminous border, and a soft ambient shadow
              that lifts it off the page (Apple/Stripe register). */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12">
            <div className="relative overflow-hidden rounded-[24px] md:rounded-[32px] bg-[rgba(12,10,9,0.28)] ring-1 ring-white/10 shadow-[0_40px_110px_-50px_rgba(0,0,0,0.6)] px-6 sm:px-8 md:px-10 lg:px-14 py-5 md:py-6 lg:py-7">
              <Reveal as="div" className="text-center mb-4 md:mb-6">
                <h2 className={cn(TITLE, "my-0 max-w-[860px] mx-auto hero-text-shadow")}>
                  Each painting is a ritual.
                </h2>
                <p className={cn(SUBTITLE, "my-0 mt-3 md:mt-4 max-w-[1080px] 2xl:max-w-[1180px] 3xl:max-w-[1320px] mx-auto")}>
                  Each canvas hand-stretched, primed, and painted over hundreds of hours — compass, rule and brush translating sacred geometry into a singular visual language.
                </p>
              </Reveal>
              {/* FEATURE IMAGE — full width of the panel so it reads large with
                  no dead space beside it. ⚠️ CROP (Hugo 2026-07-02: "you cut his
                  whole head off"): the source is 4:3 (2048×1536) with Stephen's
                  + his companion's heads in the TOP ~8–35% of the frame — the
                  old aspect-[5/2]/[3/1] centre crop kept only the middle 44%,
                  beheading both. Phones now show the (near-)full 4:3 frame;
                  md+ uses a gentler 16:9 anchored toward the top
                  (objectPosition "center 18%") so the heads AND the mandala on
                  the table stay in frame at every breakpoint — only ceiling
                  shelf + foreground floor are trimmed. */}
              <Reveal as="figure" className="m-0 mb-4 md:mb-6">
                <ImageReveal
                  src="/img/about/02-painting-table.jpg"
                  alt="Stephen and a companion working over a large mandala print at his drafting table"
                  aspect="aspect-[4/3] md:aspect-[16/9]"
                  edges="all"
                  parallax={0.08}
                  objectPosition="center 18%"
                  // Inside the max-w-[1320px]→[1720px] Craft panel, full panel
                  // width minus section + panel padding: ~the container at wide
                  // widths, near-full viewport on phones.
                  sizes="(min-width: 1400px) 1200px, 92vw"
                />
              </Reveal>

              {/* DOSSIER spread (2026-06-28 bold redesign, agent cherry-pick:
                  Hermès craftsmanship register) — the process PROSE runs as a
                  left text well; the six material facts become a RIGHT vertical
                  SPEC LEDGER (label · value rows on hairlines) instead of a flat
                  full-width strip. Asymmetric 7/5. Every sentence is verbatim +
                  intact (nothing deleted); the frosted panel chrome is Hugo's
                  standing choice, unchanged. */}
              <Reveal as="div" className="grid lg:grid-cols-12 gap-x-10 xl:gap-x-16 gap-y-8 lg:gap-y-0 items-start">
                <div className="lg:col-span-7 flex flex-col gap-y-4 md:gap-y-5">
                  <p className={cn(SUBTITLE, "m-0 max-w-[68ch]")}>
                    Each canvas was hand-stretched on a deep wooden frame and painted over hundreds of hours. Stephen began every work with compass and rule, constructing the underlying sacred geometry before a single colour was laid down.
                  </p>
                  <p className={cn(SUBTITLE, "m-0 max-w-[68ch]")}>
                    When a painting depicted a flower, the oil pressed from that flower went into the paint itself — the <em>Mandala of Wild Rose</em> contains the rose. Each composition carries its own number, rhythm, cadence and tone.
                  </p>
                </div>
                {/* Vertical spec ledger — one even register, label left / value
                    right on a hairline, the gutter the prose well doesn't fill. */}
                <ul className="lg:col-span-5 list-none p-0 m-0">
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
                      className="m-0 flex items-baseline justify-between gap-6 py-3.5 border-t border-[rgba(237,230,214,0.16)]"
                    >
                      <span className={cn(EYEBROW_TIGHT, "shrink-0 uppercase")}>{label}</span>
                      <span className="text-right font-sans font-normal text-[16px] md:text-[17px] leading-[1.4] text-ink">{value}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </section>

          {/* THE RITUAL, IN MOTION — archive film of Stephen painting a mandala,
              seen from above: hundreds of hours of the compass-and-brush ritual
              the section above describes, in motion. Contained 16:9 plate,
              muted/looping/lazy, feathered into the backdrop; reduced-motion
              holds the poster still. */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12">
            <Reveal as="figure" className="m-0">
              <LoopFilm
                src="/video/studio-mandala-v1.mp4"
                poster="/video/poster-studio-mandala-v1.jpg"
                label="Stephen Meakin painting a mandala, filmed from above"
                aspect="aspect-[4/3] sm:aspect-[16/9]"
                edges="all"
              />
            </Reveal>
          </section>

          {/* 7 · SACRED GEOMETRY — 4-card grid of traditions */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12">
            <Reveal as="div" className="text-center mb-4 md:mb-5">
              <p className={cn(EYEBROW, "m-0 mb-3")}>
                Sacred Geometry
              </p>
              <h2 className={cn(TITLE, "my-0 max-w-[1180px] mx-auto hero-text-shadow")}>
                Four traditions, one language.
              </h2>
            </Reveal>

            {/* The four traditions read as a CURATED EDITORIAL INDEX, not boxed
                chips: each is a hairline-ruled column in the page's own ledger
                language (the materials list below uses the same border-t rule),
                so the section fills the width as a confident canon rather than
                four generic grey cards. The Roman numeral is demoted to a small
                accent index; the name is promoted into the Fraunces display
                register; both name + rule warm to accent on hover. */}
            <Reveal as="ul" className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 md:gap-x-12 gap-y-6 md:gap-y-7 list-none p-0 mb-4 md:mb-6">
              {[
                { tag: "I", name: "Insular Island Arts", note: "Celtic interlace, illuminated manuscript" },
                { tag: "II", name: "Rose Windows", note: "The great cathedrals of medieval Europe" },
                { tag: "III", name: "Persian Geometry", note: "Tessellation, girih, the courts of Isfahan" },
                { tag: "IV", name: "Tibetan Mandala", note: "Sacred diagram, meditation, visual henosis" },
              ].map((item) => (
                <li
                  key={item.tag}
                  className="group m-0 border-t border-[rgba(237,230,214,0.22)] pt-4 md:pt-5 transition-colors duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:border-accent"
                >
                  {/* Oversized GHOST numeral — the architectural anchor of each
                      column (Cartier/Pentagram index-numeral system): a whisper at
                      rest (ink/15), warming to accent on hover. opsz held at 48. */}
                  <span
                    aria-hidden="true"
                    className="block font-display text-[clamp(44px,5vw,88px)] leading-[0.85] tracking-[-0.02em] text-ink/15 group-hover:text-accent/40 transition-colors duration-500 select-none"
                    style={{ fontVariationSettings: '"opsz" 48, "wght" 700' }}
                  >
                    {item.tag}
                  </span>
                  <p
                    className="font-display text-ink text-[clamp(22px,2.6vw,36px)] tracking-[-0.02em] leading-[1.1] m-0 mt-1 mb-2 transition-colors duration-300 group-hover:text-accent"
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
              <p className={cn(SUBTITLE, "max-w-[1240px] 2xl:max-w-[1360px] 3xl:max-w-[1500px] mx-auto my-0 text-center")}>
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
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12">
            <Reveal as="div" className="mx-auto max-w-[1180px] 2xl:max-w-[1300px] 3xl:max-w-[1460px] text-center">
              <p className={cn(EYEBROW, "m-0 mb-3")}>
                Arista SunStar · 2016
              </p>
              <h2 className={cn(TITLE, "m-0 mb-3 hero-text-shadow")}>
                A 3.6&#8209;metre commission for Notting Hill.
              </h2>
              {/* Key-fact strip — surfaces the commission's provenance up
                  front instead of burying it in prose. */}
              <p className="font-sans text-[13px] font-bold tracking-[0.04em] text-ink/70 m-0 mb-4">
                Diameter 3.6m <span className="text-ink/35 mx-1">·</span> Commissioned 2016
              </p>
              <p className={cn(SUBTITLE, "m-0 mx-auto max-w-[72ch]")}>
                {WELCOME.bio[2]}
              </p>
            </Reveal>
            {/* Archive FILM — the 3.6-metre SunStar itself being painted
                (timelapse from Stephen's studio archive): the making that
                precedes the installed piece shown below. Framed like the
                archive plate; muted / looping / lazy, reduced-motion holds the
                poster. */}
            <Reveal as="figure" className="m-0 mt-4 md:mt-5 mx-auto w-full max-w-[720px] md:max-w-[900px]">
              <LoopFilm
                src="/video/arista-timelapse-v1.mp4"
                poster="/video/poster-arista-timelapse-v1.jpg"
                label="The Arista SunStar being painted, in timelapse"
                aspect="aspect-[16/9]"
                edges="none"
                frame
              />
            </Reveal>

            {/* Archive photo — UNCROPPED at natural aspect (Hugo 2026-07-02:
                the old 3/1 object-cover chopped Stephen's head; never re-crop)
                but CAPPED near the source's real resolution (641×353): the
                07-02 full-content-width version upscaled it ~2× and Hugo
                rejected it ("way too huge, the quality is terrible"). 820px
                ≈ 1.28× — prominent without visible softness. Ring frame kept. */}
            <Reveal as="figure" className="m-0 mt-4 md:mt-5 mx-auto w-full max-w-[720px] md:max-w-[820px]">
              <div className="overflow-hidden rounded-[3px] ring-1 ring-ink/70 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
                <AssetImage
                  src="/img/welcome/05-arista-sunstar.jpg"
                  alt="Stephen standing beside the full 3.6-metre Arista SunStar painting at the Farmacy restaurant, Notting Hill"
                  loading="lazy"
                  decoding="async"
                  className="block w-full h-auto"
                />
              </div>
              <figcaption className="font-sans text-[13px] md:text-[14px] font-bold tracking-[0.04em] text-ink/65 mt-4 text-center">
                Farmacy · Notting Hill · London
              </figcaption>
              <p className="font-display italic text-[17px] md:text-[19px] leading-[1.6] text-ink/70 mt-2.5 text-center">
                Photograph from Stephen's archive, c. 2016.
              </p>
            </Reveal>
          </section>

          {/* Sacred Geometry finale REMOVED 2026-06-30 (Hugo): keep the
              garden->galaxy "as above so below" video, but drop the sun +
              the SACRED GEOMETRY close entirely. The home now ends on the
              Arista SunStar archive photo above, into the footer. */}
        </main>

        <FooterCatalogue />
        <Footer />
      </div>
    </>
  );
};
