import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
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
import { EYEBROW } from "../components/ui/tokens";
import { Seo } from "../components/Seo";

// Four Peacock colourways used as the home page's seamlessly-blending
// backdrop layer (yellow removed — text was unreadable against it).
// Pre-blurred 800px JPGs (~17KB each) — blur / saturate / brightness
// baked into the file offline, zero runtime filter cost.
// Pre-blurred WebP backdrops (~7-12KB each) — even smaller than the JPG
// originals while keeping identical visual softness baked into the file.
// Four Peacock colourways crossfade on page-scroll. Moroccan Purple closes
// the page — it holds through the Sacred Geometry finale (Hugo's direction:
// revert the brief Mary-Pink close back to the extended purple).
const PEACOCK_BACKDROPS = [
  // PERFECTION PASS: these washes are σ8-blurred, so 1200px was massively
  // oversampled. Served at 600px (`-sm`, the SAME darkened v3/v11 assets just
  // downscaled — mean luminance verified identical) they upscale to fill the
  // viewport with ZERO visible difference at ~4× less GPU texture memory per
  // composited layer. The 600px file is the texture the compositor samples on
  // every scroll frame, so a smaller texture is a cheaper, cache-friendlier
  // composite. Full-size originals kept on disk for the immutable-cache rule.
  { url: "/img/paintings/peacock-persian-indigo-blur-v12-sm.webp", name: "Persian Indigo" },
  { url: "/img/paintings/peacock-blood-moon-red-blur-v12-sm.webp", name: "Blood Moon Red" },
  { url: "/img/paintings/peacock-moroccan-purple-blur-v12-sm.webp", name: "Moroccan Purple" },
  // Mary Pink closes the page — the newest colourway, carried into the Sacred
  // Geometry finale so its backdrop blends seamlessly with the rest of the home.
  { url: "/img/paintings/peacock-mary-pink-blur-v12-sm.webp", name: "Mary Pink" },
];

/**
 * CosmicInterlude — a Veo-generated space-nebula film, the cinematic breath
 * between the Arista commission and the Sacred Geometry close (Hugo: "put the
 * intro video in the space in between"). LAZY: an IntersectionObserver mounts
 * the <video> only when the band is ~300px from the viewport, so it costs ZERO
 * bytes (and zero compositing) until scrolled near — protecting the home's
 * scroll performance. Muted / looping / playsInline so it autoplays everywhere.
 * Reduced-motion users skip it entirely (the gap is already closed by spacing).
 * Soft top/bottom edge-dissolve melts it into the peacock wash. Swap the source
 * filename to drop in a different Veo export.
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

  useEffect(() => {
    const v = videoRef.current;
    if (near && v) {
      v.load();
      v.play().catch(() => {});
    }
  }, [near]);

  if (reduceMotion) return null;

  return (
    <section
      aria-label="The cosmos — the order beneath all things"
      className="relative w-full px-4 sm:px-6 md:px-8 lg:px-12 my-10 md:my-14"
    >
      <div
        ref={ref}
        className="relative mx-auto w-full max-w-[1500px] 3xl:max-w-[1720px] overflow-hidden rounded-[3px] ring-1 ring-line/55 shadow-[0_40px_120px_rgba(0,0,0,0.55)] h-[clamp(300px,52svh,640px)] bg-[#0a0810]"
      >
        {near && (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            // Slight zoom anchored toward the top-left so the bottom-right "Veo"
            // generator watermark is pushed beyond the overflow-hidden band and
            // clipped away — a clean, un-branded film (Hugo hates anything that
            // "looks AI"). The 1.22× scale on an atmospheric pan is imperceptible.
            style={{ transform: "scale(1.22)", transformOrigin: "22% 18%" }}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
          >
            <source src={asset("/video/nebula-intro-v1.mp4")} type="video/mp4" />
          </video>
        )}
        {/* Soft top + bottom dissolve so the film melts into the peacock wash. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(9,7,13,0.55) 0%, rgba(9,7,13,0) 20%, rgba(9,7,13,0) 80%, rgba(9,7,13,0.55) 100%)",
          }}
        />
      </div>
    </section>
  );
};

export const Welcome = () => {
  const reduceMotion = useReducedMotion();
  // Presentment currency — the "from £…" chips convert with the header picker.
  const { formatPretty: fmtPrice } = useCurrency();

  // Whole-page scroll drives three peacock backdrops crossfading in turn:
  // Indigo → Blood-Moon Red → Moroccan Purple, the purple holding through the
  // Sacred Geometry finale so its sky matches the rest of the home.
  const { scrollYProgress } = useScroll();
  // Persian Indigo opens at FULL opacity from the very top (scroll progress 0) —
  // NOT fading up from 0 — so the page is never bare black before the first
  // scroll (Hugo: "before scrolling the blue background isn't there, it's
  // black"). It only starts crossfading to Blood-Moon Red at 0.22.
  const indigoOpacity = useTransform(scrollYProgress, [0, 0.22, 0.30], [1, 1, 0]);
  const redOpacity = useTransform(scrollYProgress, [0.22, 0.30, 0.46, 0.54], [0, 1, 1, 0]);
  const purpleOpacity = useTransform(scrollYProgress, [0.46, 0.54, 0.72, 0.80], [0, 1, 1, 0]);
  const maryPinkOpacity = useTransform(scrollYProgress, [0.72, 0.80, 0.97, 1], [0, 1, 1, 1]);
  const backdropOpacities = [indigoOpacity, redOpacity, purpleOpacity, maryPinkOpacity];
  // SCROLL-JANK FIX (Hugo: "heavy/stuttery scroll, esp. home"): the four
  // full-viewport peacock layers are sequenced so AT MOST TWO ever overlap during
  // a crossfade — but the other two sit at opacity 0 and were still being
  // composited (each is a filtered, full-screen GPU layer) on every scroll frame.
  // Flip a layer to `visibility: hidden` the instant it's fully transparent so the
  // compositor drops it entirely, ~halving the worst-case per-frame full-screen
  // compositing on the home page. Look is identical — a layer only hides once it
  // is already invisible, and re-shows before it ramps back up.
  const toVis = (v: number): "visible" | "hidden" => (v < 0.004 ? "hidden" : "visible");
  const indigoVis = useTransform(indigoOpacity, toVis);
  const redVis = useTransform(redOpacity, toVis);
  const purpleVis = useTransform(purpleOpacity, toVis);
  const maryPinkVis = useTransform(maryPinkOpacity, toVis);
  const backdropVisibilities = [indigoVis, redVis, purpleVis, maryPinkVis];

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
        className="relative z-20 isolate w-full overflow-hidden flex flex-col items-center min-h-[44svh] md:min-h-[62svh] pb-[2svh]"
        aria-label="The Mandala Company"
      >
        {/* The home's own peacock painting shows THROUGH the transparent sun
            (no bg-bg) — the sun composites onto the painting exactly like the
            Earth limb composites onto it at the close. */}
        {/* Softening scrim — a GENTLE, mostly-even veil so the indigo peacock
            backdrop reads continuously right up to the sun (Hugo: "I want the
            background up to the sun like the Earth finale" — the old scrim ramped
            to 0.82 at the foot and buried it into a black block below the
            wordmark). Light enough that the indigo shows like the finale's pink;
            the wordmark keeps its own heavy text-shadow for legibility. A plain
            dark gradient, NOT backdrop-blur (banned here for the scroll-lag it
            causes); z-0, below the sun (z-1) + the text (z-10). */}
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
            className="block h-auto select-none"
            style={{
              display: "block",
              width: "124%",
              maxWidth: "none",
              marginLeft: "-12%",
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
        <div className="relative z-10 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 text-center mt-[10svh] sm:mt-[23svh] md:mt-[25svh]">
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
              <span
                className="block text-balance"
                style={{
                  fontVariationSettings: '"opsz" 48, "wght" 700',
                  fontWeight: 700,
                  fontSize: "clamp(60px, 14.5vw, 196px)",
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
                  src={`${import.meta.env.BASE_URL}logo/logo-seal-v2-w256.png`}
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

      {/* COSMIC INTERLUDE — the Veo space-nebula film is the SOLE website intro
          now (Hugo: "just one video at the top underneath Mandala Company"),
          playing right under the wordmark; the old swirling-mandala boomerang
          (VideoIntro) was removed from the home. Lazy + reduced-motion safe. */}
      <CosmicInterlude />

      <div id="welcome-anchor" className="relative">
        {/* PEACOCK BACKDROP LAYER — four colourways crossfading on
            page-scroll, identical blur/saturation/brightness recipe to
            the Collections ScrollBackdrop. Sits behind all content. */}
        <div
          aria-hidden="true"
          className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
        >
          {PEACOCK_BACKDROPS.map((bd, i) => (
            <motion.div
              key={bd.url}
              className="absolute inset-0 bg-cover bg-center"
              style={{
                // prefers-reduced-motion: short-circuit the scroll-driven
                // crossfade (CLAUDE.md convention) — hold a single static
                // backdrop (the opening indigo) instead of colour-shifting the
                // whole viewport on every scroll frame.
                opacity: reduceMotion ? (i === 0 ? 1 : 0) : backdropOpacities[i],
                // Cull this layer from compositing while it's fully transparent
                // (see the toVis note above) — the per-frame scroll-jank fix.
                visibility: reduceMotion
                  ? i === 0
                    ? "visible"
                    : "hidden"
                  : backdropVisibilities[i],
                backgroundImage: `url("${asset(bd.url)}")`,
                // Promote to its own GPU layer so the scroll-driven crossfade
                // composites the (pre-blurred) image instead of repainting it.
                // translateZ(0) forces a composited layer so iOS doesn't
                // re-rasterise the fixed cover bitmap every scroll frame.
                willChange: "opacity",
                transform: "translateZ(0)",
                // Darken + gently desaturate every backdrop so the bright,
                // near-WHITE blotches in the blurred peacock images can never
                // wash out the cream text (Hugo: "too much white, can't read
                // the text"), while keeping each colourway's warm character.
                filter: "brightness(0.74) saturate(1.06)",
              }}
            />
          ))}
          {/* Backdrop legibility veil — a warm PLUM-ROSE radial (NOT neutral
              black), so the centre "darkening" that grounds the cream type reads
              as a RICHER pink rather than a grey/dark wash (Hugo: deepen the
              veil only where cream sits, never grey the pink). Deepest at the
              centre where running copy lives, dissolving to clear at the edges
              so the bright rose petal pattern still shows through. */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 105% at 50% 40%, rgba(34,10,22,0.42) 0%, rgba(34,10,22,0.26) 55%, rgba(34,10,22,0.16) 100%)",
            }}
          />
          {/* Bottom + top grounding band — darkens the very top strip (under the
              fixed white nav wordmark) and the very bottom (finale + footer
              seam) so cream never washes out on the brightest colourway zones. */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(10,9,8,0.36) 0%, rgba(10,9,8,0.05) 24%, rgba(10,9,8,0.05) 66%, rgba(10,9,8,0.46) 100%)",
            }}
          />
          {/* Mary-Pink darken — fades in ONLY over the final ~25% of scroll
              (tied to the existing maryPinkOpacity, not mutating the crossfade),
              pulling the pale dusty rose down to a deep dusk so the finale's
              cream type never sits on near-white. Above the backdrop images +
              veil, below the z-10 content. */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              opacity: reduceMotion ? 0 : maryPinkOpacity,
              // PERFECTION PASS: bring this finale darken layer to parity with the
              // backdrop layers. (1) `visibility: hidden` while its opacity is 0
              // (the first ~72% of scroll) so it is NOT composited at all until the
              // finale; (2) translateZ(0) + will-change:opacity so when it fades in
              // over the last 25% its opacity animates on the compositor rather than
              // repainting this full-screen gradient every scroll frame. Was the
              // only scroll-animated full-screen layer still painting per frame.
              visibility: reduceMotion ? "hidden" : maryPinkVis,
              willChange: "opacity",
              transform: "translateZ(0)",
              background:
                "linear-gradient(to bottom, rgba(40,12,28,0.14) 0%, rgba(34,11,24,0.26) 100%)",
            }}
          />
        </div>

        {/* ONE vertical rhythm for the whole page. Each section's gap is the
            SAME at every breakpoint (space-y), instead of being the sum of two
            neighbours' paddings — which is what produced the uneven 64→176px
            jumps Hugo flagged. Sections no longer carry their own py; the gap
            lives here so it can never double up or collapse. */}
        <main className="relative isolate z-10 space-y-6 md:space-y-8">
          {/* 1 · HERO — Kaya-inspired composition:
              text LEFT (two-style headline, body, CTAs),
              image RIGHT, well-framed and uncropped. */}
          {/* Tight seam between the intro film and the hero. On PORTRAIT phones
              the film is a short 16:9 card (not full-height), so a large top
              pad here reads as a dead black band directly under the video (the
              reported gap). The clamp now starts SMALL (~18px on a phone) and
              only opens up via the vw term on wider screens where the film is
              full-height and the hero sits a full scroll below. The fixed Nav
              always floats over the film at the very top, never over the hero,
              so the hero needs no nav-clearance padding of its own. */}
          {/* 1 · HERO — cinematic right-bleed. The studio photo fills the
              right ~55% of the viewport at full height, bleeding to the screen
              edge for real scale; the headline floats out of its dark-melted
              inner edge on the left. Landscape composition preserved
              (object-cover center on a wide box — only the sacrificial outer
              margins trim). Stacks to text-then-image below md. */}
          {/* The intro film flows straight into the hero — the video's own 5%
              bottom mask-feather IS the seam, so no extra top padding (the old
              pt-[12svh] md:pt-[15svh] opened a dark dead band between the film
              and the headline). A small uniform pad just keeps the type off the
              film edge. */}
          <section className="relative isolate w-full overflow-hidden pt-6 md:pt-0">
            {/* DESKTOP/TABLET — image bleeding to the right edge. Reined in
                2026-06-03 (Hugo: "images way too big, take up the entire
                screen") — the parallel session's full-viewport bleed was the
                screen-filling culprit; width + section height trimmed so it's
                a strong framed photo, not an edge-to-edge wall. */}
            <figure className="m-0 hidden md:block absolute top-1/2 right-4 sm:right-6 md:right-8 lg:right-12 -translate-y-1/2 h-[62svh] w-[54%] lg:w-[52%]">
              <ImageReveal
                src="/img/welcome/01-painting-wild-rose.jpg"
                alt="Stephen Meakin painting Wild Rose at his studio desk, beside a large circular wall mandala"
                eager
                fill
                edges="y"
                parallax={0.1}
                objectPosition="center"
                shadow=""
              />
              {/* Inner-left melt — the photo dissolves into the page so the
                  headline reads cleanly over its left edge (no hard seam). */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-1/2"
                style={{
                  background:
                    "linear-gradient(to right, #0a0908 0%, rgba(10,9,8,0.82) 26%, rgba(10,9,8,0.30) 64%, rgba(10,9,8,0) 100%)",
                }}
              />
              {/* One warm seam where type meets photo. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
                style={{
                  background:
                    "linear-gradient(to right, rgba(201,120,68,0.12) 0%, rgba(201,120,68,0) 72%)",
                }}
              />
            </figure>

            {/* Text column — vertically centred against the photo so the
                headline sits opposite the easel, not crammed into a short top
                strip. min-h matches the photo's 68svh frame; items-center does
                the centring (no more clamp top-pad — that was fighting the old
                dark band). */}
            <div
              className="relative z-10 mx-auto flex max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] items-center px-4 sm:px-6 md:px-8 lg:px-12 pb-8 md:min-h-[60svh] md:pb-0"
              style={{ paddingTop: "clamp(1.125rem, 4vw, 2.5rem)" }}
            >
              <Reveal as="div" className="w-full md:max-w-[50%] lg:max-w-[48%]">
                <h1 className="font-display tracking-[-0.045em] text-ink m-0 mb-4 text-balance hero-text-shadow">
                  <span className="block font-semibold text-[clamp(60px,11vw,140px)] leading-[1.0]">
                    So here we are on Earth
                  </span>
                  <span className="block font-normal italic text-[clamp(46px,8vw,82px)] leading-[1.15] sm:leading-[1.05] mt-4 sm:mt-3 text-ink/90">
                    — orbiting a Sun Star at about 67,062 miles an hour.
                  </span>
                </h1>

                {/* Hero is headline + CTAs only (Hugo: delete the top reminder
                    line — the reminder lives once, in the "A reminder" section
                    below). */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <MagneticLink
                    to="/collections"
                    className="inline-flex w-fit items-center bg-ink text-bg px-6 py-3.5 font-sans text-[11px] font-bold tracking-[0.04em] rounded-full transition-colors duration-300 hover:bg-accent hover:text-ink whitespace-nowrap"
                    ariaLabel="See the collection"
                  >
                    See the collection <span aria-hidden="true" className="ml-2">→</span>
                  </MagneticLink>
                  <MagneticLink
                    to="/about"
                    className="inline-flex w-fit items-center justify-center text-ink border border-ink/35 px-8 py-3.5 font-sans text-[11px] font-bold tracking-[0.04em] rounded-full transition-colors duration-300 hover:border-accent hover:text-accent whitespace-nowrap"
                    ariaLabel="About Stephen"
                  >
                    His story
                  </MagneticLink>
                </div>

                {/* MOBILE image — below the copy, full landscape, soft-edged. */}
                <Reveal as="figure" className="m-0 mt-6 md:hidden max-w-[560px]">
                  <ImageReveal
                    src="/img/welcome/01-painting-wild-rose.jpg"
                    alt="Stephen Meakin painting Wild Rose at his studio desk, beside a large circular wall mandala"
                    eager
                    aspect="aspect-[4/3]"
                    edges="all"
                    parallax={0.12}
                    objectPosition="center"
                    shadow="shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
                  />
                </Reveal>
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
            <Reveal as="header" className="mb-4 md:mb-6 mx-auto max-w-[1180px] 2xl:max-w-[1280px] 3xl:max-w-[1440px]">
              <p className={cn(EYEBROW, "m-0 mb-4 text-center")}>A reminder</p>
              {/* Lead-in — reminderLong[0] VERBATIM, set as an art-book lead:
                  Fraunces opsz 40, generous leading, a rust drop cap (pure
                  CSS — the word itself is untouched). The cap recipe lives in
                  global.css `.drop-cap`: the hand-tuned ::first-letter float
                  everywhere, upgraded via @supports to `initial-letter: 2`
                  (engine-locked cap sizing/baseline) on Safari/Chrome.
                  text-pretty so the rag flows cleanly around the cap. */}
              <p
                className="drop-cap font-display font-normal tracking-[-0.012em] text-ink m-0 mx-auto max-w-[34ch] text-pretty"
                style={{
                  fontVariationSettings: '"opsz" 40, "wght" 400',
                  fontSize: "clamp(30px, 7vw, 40px)",
                  // More open leading now there's no scrim card — the lead reads
                  // as an art-book opener with air around each line.
                  lineHeight: 1.5,
                  // Subtle soft halo for legibility directly on the peacock wash
                  // (replaces the removed reading-scrim card — never a box).
                  textShadow: "0 1px 18px rgba(10,9,8,0.5), 0 1px 3px rgba(10,9,8,0.4)",
                }}
              >
                {WELCOME.reminderLong[0]}
              </p>
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
            <Reveal delay={0.05} className="my-12 md:my-20 mx-auto max-w-[1280px] 2xl:max-w-[1400px] 3xl:max-w-[1560px] text-center">
              <blockquote className="m-0 hero-text-shadow">
                {/* Dominant tier — the first sentence, big roman Fraunces. */}
                <span
                  className="block font-display font-semibold text-ink text-balance mx-auto"
                  style={{
                    fontVariationSettings: '"opsz" 48, "wght" 600',
                    fontWeight: 600,
                    fontSize: "clamp(48px, 11vw, 116px)",
                    letterSpacing: "-0.035em",
                    lineHeight: 0.98,
                  }}
                >
                  {WELCOME.reminderLong[3].split(". ")[0] + "."}
                </span>
                {/* Subordinate tier — "Quite literally.", a fraction of the
                    title size, italic, its closing period the one rust note. */}
                <span
                  className="block font-display font-normal italic text-ink/90 text-balance mx-auto"
                  style={{
                    fontVariationSettings: '"opsz" 40, "wght" 400',
                    fontWeight: 400,
                    fontSize: "clamp(26px, 5vw, 52px)",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                    marginTop: "clamp(10px, 1.4vw, 22px)",
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
                    className="font-sans font-normal text-[20px] md:text-[20px] 2xl:text-[21px] 3xl:text-[clamp(21px,1.18vw,26px)] leading-[1.85] text-ink-soft m-0 mb-6 md:mb-8 last:mb-0 text-pretty hyphens-auto"
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
            <Reveal delay={0.1}>
              <div aria-hidden="true" className="mt-4 md:mt-6 mb-3 h-px w-12 bg-ink/15" />
              <p className="m-0 mx-auto max-w-[1180px] 2xl:max-w-[1320px] 3xl:max-w-[1500px] hero-text-shadow">
                <span
                  className="block font-display text-ink text-balance"
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
                  className="block font-display font-normal italic text-ink-muted text-balance mt-3 md:mt-4"
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
              <ImageReveal
                src="/img/welcome/02-portrait-denim.jpg"
                alt="Stephen Meakin"
                fill
                edges="y"
                parallax={0.1}
                objectPosition="center 35%"
                shadow=""
              />
              {/* Inner-right melt — the portrait dissolves into the page so the
                  text reads cleanly over its right edge (no hard seam). */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
                style={{
                  background:
                    "linear-gradient(to left, #0a0908 0%, rgba(10,9,8,0.82) 26%, rgba(10,9,8,0.30) 64%, rgba(10,9,8,0) 100%)",
                }}
              />
            </figure>

            {/* Text column — right of the portrait, vertically centred. */}
            <div className="relative z-10 mx-auto flex max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] items-center justify-end px-4 sm:px-6 md:px-8 lg:px-12 py-6 md:min-h-[42svh] md:py-0">
              <Reveal as="div" className="w-full md:max-w-[50%] lg:max-w-[46%]">
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
                <h2 className="font-display font-bold tracking-[-0.035em] text-[clamp(40px,8.4vw,68px)] leading-[1.02] text-ink m-0 mb-4 md:mb-6 hero-text-shadow">
                  The art of Stephen Meakin — mandala artist and sacred geometer.
                </h2>
                <p className="font-sans font-normal text-[21px] md:text-[23px] 2xl:text-[25px] 3xl:text-[clamp(25px,1.42vw,30px)] leading-[1.65] text-ink/85 m-0">
                  {WELCOME.bio[0]}
                </p>
              </Reveal>
            </div>
          </section>

          {/* 4 · STUDIO — full-bleed cinematic break. Letterboxed shorter on
              wide screens (lg+) so a 3:2 frame doesn't fill an entire 4K
              viewport top-to-bottom (Hugo: "some images are way too big"). */}
          <Reveal as="figure" className="m-0 w-full px-4 sm:px-6 md:px-8 lg:px-12">
            <ImageReveal
              src="/img/welcome/03-painting-in-studio.jpg"
              alt="Stephen painting in the studio"
              aspect="aspect-[3/2] md:aspect-[2/1] 2xl:aspect-[21/9]"
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
            <Reveal as="div" className="text-center mb-4 md:mb-7">
              <p className={cn(EYEBROW, "m-0 mb-4")}>
                From the hand
              </p>
              <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(52px,6.8vw,104px)] leading-[0.98] text-ink my-0 max-w-[1180px] mx-auto text-balance hero-text-shadow">
                Six paintings from a lifetime at the compass.
              </h2>
            </Reveal>
            {/* Orphan-centring pattern: flex-wrap + justify-center, each card
                flex:0 1 clamp(MIN,BASIS,MAX). With 6 picks this matches the old
                2-up (mobile) / 3-up (desktop) rhythm, but if the featured count
                ever becomes odd / not a multiple of the column count, the
                leftover tile(s) centre on the last row at every breakpoint
                instead of left-aligning. min-w-0 on each card stops a long
                title token from widening the row past the viewport. */}
            <Reveal as="div" className="flex flex-wrap justify-center gap-4 md:gap-5 mb-5 md:mb-9">
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
                    className="group block min-w-0 flex-[0_1_clamp(280px,30%,420px)]"
                  >
                    <div className="relative aspect-square overflow-hidden bg-ink/5 ring-1 ring-white/8 transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
                      {/* Gentle zoom on hover only — a small scale-up of the
                          cover. Hugo: hover should zoom in a little, never flick
                          to another colourway. */}
                      <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.05]">
                        <AssetImage
                          src={cover.image}
                          alt={paintingImageAlt(painting.title, cover.name)}
                          loading="lazy"
                          decoding="async"
                          sizes="(min-width: 1400px) 420px, (min-width: 640px) 30vw, 90vw"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                      {/* Price chip — scroll-revealed (visible on mobile,
                          where there's no hover, and on desktop as soon as
                          the tile enters view). Advertises the LOWEST visible
                          tier (A3 Gallery £245) to lower the click barrier —
                          the £450 anchor still converts on the product page. */}
                      <motion.span
                        aria-hidden="true"
                        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{
                          duration: 0.55,
                          delay: 0.15,
                          ease: [0.22, 0.61, 0.36, 1],
                        }}
                        className="absolute bottom-3 right-3 inline-flex items-center bg-[#0a0908]/90 px-3 py-1.5 font-sans text-[10px] font-bold tracking-[0.04em] text-ink rounded-full"
                      >
                        From {fmtPrice(fromPrice)}
                      </motion.span>
                    </div>
                    <div className="pt-4">
                      <h3 className="font-display font-bold text-[18px] md:text-[22px] tracking-[-0.015em] text-ink m-0 leading-[1.25] group-hover:text-accent transition-colors duration-300">
                        {painting.title}
                      </h3>
                      <p className="font-sans text-[11px] font-bold tracking-[0.04em] text-ink/55 mt-2 m-0">
                        {hasYear ? painting.year : collectionTitle}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </Reveal>

            <Reveal as="div" className="text-center">
              <MagneticLink
                to="/collections"
                className="inline-flex items-center gap-2 ring-1 ring-ink/40 px-7 py-3.5 font-sans text-[11px] font-bold tracking-[0.04em] rounded-full text-ink transition-all duration-300 hover:ring-accent hover:text-accent"
                ariaLabel="See every painting"
              >
                See every painting <span aria-hidden="true" className="ml-1">↗</span>
              </MagneticLink>
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
            <div className="relative overflow-hidden rounded-[24px] md:rounded-[32px] bg-[rgba(12,10,9,0.9)] ring-1 ring-white/10 shadow-[0_50px_140px_-40px_rgba(0,0,0,0.85)] px-6 sm:px-8 md:px-10 lg:px-14 py-6 md:py-10 lg:py-12">
              <Reveal as="div" className="text-center mb-5 md:mb-8">
                <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(52px,6.8vw,100px)] leading-[0.98] text-ink my-0 max-w-[860px] mx-auto text-balance hero-text-shadow">
                  Each painting is a ritual.
                </h2>
                <p className="font-sans font-normal text-[21px] md:text-[23px] 2xl:text-[25px] 3xl:text-[clamp(25px,1.42vw,30px)] leading-[1.65] text-ink/85 my-0 mt-5 md:mt-6 max-w-[1080px] 2xl:max-w-[1180px] 3xl:max-w-[1320px] mx-auto">
                  Each canvas hand-stretched, primed, and painted over hundreds of hours — compass, rule and brush translating sacred geometry into a singular visual language.
                </p>
              </Reveal>
              {/* FEATURE IMAGE — full width of the panel so it reads large and
                  leaves NO dead blank space beside a short side-by-side frame
                  (Hugo: "too small, lots of blank space"). A gentle 16:10 crop of
                  the 4:3 documentary source (sm+) trims only a sliver of ceiling
                  and foreground — the subjects + mandala are never touched, and
                  full 4:3 shows on phones. Clean feather, no box-shadow. */}
              <Reveal as="figure" className="m-0 mb-5 md:mb-8">
                <ImageReveal
                  src="/img/about/02-painting-table.jpg"
                  alt="Stephen at his drafting table, drawing the underlying geometry"
                  aspect="aspect-[4/3] sm:aspect-[3/2]"
                  edges="all"
                  parallax={0.08}
                  // Inside the max-w-[1320px]→[1720px] Craft panel, full panel
                  // width minus section + panel padding: ~the container at wide
                  // widths, near-full viewport on phones.
                  sizes="(min-width: 1400px) 1200px, 92vw"
                />
              </Reveal>

              {/* Two paragraphs in a balanced two-column measure below the image —
                  same body register as the rest of the page. */}
              <Reveal as="div" className="grid md:grid-cols-2 gap-x-10 lg:gap-x-14 gap-y-5 md:gap-y-6">
                <p className="font-sans font-normal text-[21px] md:text-[23px] 2xl:text-[25px] 3xl:text-[clamp(25px,1.42vw,30px)] leading-[1.65] text-ink/85 m-0">
                  Each canvas was hand-stretched on a deep wooden frame and painted over hundreds of hours. Stephen began every work with compass and rule, constructing the underlying sacred geometry before a single colour was laid down.
                </p>
                <p className="font-sans font-normal text-[21px] md:text-[23px] 2xl:text-[25px] 3xl:text-[clamp(25px,1.42vw,30px)] leading-[1.65] text-ink/85 m-0">
                  When a painting depicted a flower, the oil pressed from that flower went into the paint itself — the <em>Mandala of Wild Rose</em> contains the rose. Each composition carries its own number, rhythm, cadence and tone.
                </p>
              </Reveal>

              {/* Materials ledger — FULL-WIDTH spec strip BELOW the image+text
                  row (it used to be nested in the right column, leaving a dead
                  void to its left where the shorter image ended — Hugo's "gap
                  next to highlighted"). Three columns on md+ so the six facts
                  read as a clean ledger across the whole panel. */}
              <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-8 md:gap-x-12 gap-y-0 list-none p-0 mt-5 md:mt-8 items-start">
                    {/* ONE consistent register for all six facts — same eyebrow
                        label + same Hanken value at one size, no mixed serif/
                        italic lines (Hugo: "different sizes, different fonts,
                        some italics — messy"). Reads as a clean, even ledger. */}
                    {[
                      ["Time", "Hundreds of hours per canvas"],
                      ["Edition", "Individually made to order"],
                      ["Surface", "350gsm archival canvas"],
                      ["Frame", "Hand-stretched, deep wooden"],
                      ["Tools", "Compass · rule · brush"],
                      ["Pigment", "Hand-pressed oils + pigment inks"],
                    ].map(([label, value]) => (
                      <li key={label} className="m-0 py-4 border-t border-ink/15">
                        <p className="font-sans text-[11px] font-bold tracking-[0.04em] text-ink/55 m-0 mb-2">{label}</p>
                        <p className="font-sans font-normal text-[17px] md:text-[18px] leading-[1.4] text-ink m-0">{value}</p>
                      </li>
                    ))}
              </ul>
            </div>
          </section>

          {/* 7 · SACRED GEOMETRY — 4-card grid of traditions */}
          <section className="mx-auto max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12">
            <Reveal as="div" className="text-center mb-5 md:mb-7">
              <p className={cn(EYEBROW, "m-0 mb-4")}>
                Sacred Geometry
              </p>
              <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(52px,6.8vw,104px)] leading-[0.98] text-ink my-0 max-w-[1180px] mx-auto text-balance hero-text-shadow">
                Four traditions, one language.
              </h2>
            </Reveal>

            <Reveal as="ul" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-5 list-none p-0 mb-5 md:mb-8">
              {[
                { tag: "I", name: "Insular Island Arts", note: "Celtic interlace, illuminated manuscript" },
                { tag: "II", name: "Rose Windows", note: "The great cathedrals of medieval Europe" },
                { tag: "III", name: "Persian Geometry", note: "Tessellation, girih, the courts of Isfahan" },
                { tag: "IV", name: "Tibetan Mandala", note: "Sacred diagram, meditation, visual henosis" },
              ].map((item) => (
                <li
                  key={item.tag}
                  className="bg-bg-soft ring-1 ring-white/8 p-5 md:p-6 transition-all duration-500 hover:ring-accent/50 hover:-translate-y-1"
                >
                  <p className="font-display font-bold text-ink/45 text-[clamp(40px,4.6vw,48px)] leading-none m-0 mb-3 tracking-tight">
                    {item.tag}
                  </p>
                  <p className="font-sans text-[16px] font-bold tracking-tight text-ink m-0 mb-2 leading-[1.25]">
                    {item.name}
                  </p>
                  <p className="font-sans font-normal text-[15px] leading-[1.5] text-ink/65 m-0">
                    {item.note}
                  </p>
                </li>
              ))}
            </Reveal>

            <Reveal>
              <p className="font-sans font-normal text-[21px] md:text-[23px] 2xl:text-[25px] 3xl:text-[clamp(25px,1.42vw,30px)] leading-[1.65] text-ink/85 max-w-[1240px] 2xl:max-w-[1360px] 3xl:max-w-[1500px] mx-auto my-0 text-center">
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
              <p className={cn(EYEBROW, "m-0 mb-5")}>
                Arista SunStar · 2016
              </p>
              <h2 className="font-display font-bold tracking-[-0.04em] text-[clamp(40px,5.2vw,58px)] leading-[1.08] text-ink m-0 mb-5 text-balance">
                A 3.6&#8209;metre commission for Notting Hill.
              </h2>
              {/* Key-fact strip — surfaces the commission's provenance up
                  front instead of burying it in prose. */}
              <p className="font-sans text-[11px] font-bold tracking-[0.04em] text-ink/70 m-0 mb-6">
                Diameter 3.6m <span className="text-ink/35 mx-1">·</span> Commissioned 2016
              </p>
              <p className="font-sans font-normal text-[21px] md:text-[23px] 2xl:text-[25px] 3xl:text-[clamp(25px,1.42vw,30px)] leading-[1.65] text-ink/85 m-0 mx-auto max-w-[68ch]">
                {WELCOME.bio[2]}
              </p>
            </Reveal>
            <Reveal as="figure" className="m-0 mt-5 md:mt-6 mx-auto max-w-[960px] 2xl:max-w-[1040px] 3xl:max-w-[1120px]">
              <div className="overflow-hidden rounded-[3px] ring-1 ring-line/70 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
                <ImageReveal
                  src="/img/welcome/05-arista-sunstar.jpg"
                  alt="Stephen beside the 3.6-metre Arista SunStar at the Farmacy restaurant, Notting Hill"
                  aspect="aspect-[16/9]"
                  edges="none"
                  parallax={0.06}
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

          {/* 9 · SACRED GEOMETRY — the bold closing statement.

              The confident, screen-filling editorial close. The headline is
              large and bold in a TRUE Fraunces 700 (loaded; never synthesised
              now that font-synthesis is off) at a CONTROLLED optical size
              (opsz 48 — even, heavy strokes; never the opsz-144 hairline
              "scribble"). Background is JUST the home's own peacock backdrop,
              closing on the MARY PINK colourway (the fixed crossfade layer
              behind the page) — same dusty-rose treatment as every other
              section. Updated 2026-06-03 (Hugo): the green Earth limb + rust
              horizon glow were removed so the finale shows ONLY the pink
              backdrop, matching the rest of the home (supersedes the Earth
              invariants in gotcha #7). Stephen's words stay verbatim. Section
              fills the viewport (min-h-100svh) with the content centered;
              isolate + overflow-hidden retained (gotcha #8). */}
          {/* min-h trimmed (was 72/80svh) + lighter BOTTOM pad than top: the
              content is centred in the box, so an oversized min-h pushed a big
              dead band BELOW the close before the catalogue (Hugo's gap). The
              section still breathes (generous top pad + the Earth limb's curve)
              but no longer leaves a void under it. The Earth limb stays pinned
              to bottom-0 (its own absolute layer), uncropped. */}
          <section
            className="relative isolate flex min-h-[48svh] md:min-h-[52svh] w-full items-center overflow-hidden pt-0 pb-8 md:pt-0 md:pb-10 lg:pt-0 lg:pb-12"
            aria-label="Sacred Geometry"
          >

            {/* THE MOON — closes the page (Hugo: "instead of the sun at the
                bottom… the highest-definition moon, in the same exact position").
                A clean full-moon disc rising from the bottom edge, where the sun's
                glow used to sit. Source: NASA SVS "Dial-a-Moon" render (frame 0570,
                the full phase) — genuinely PUBLIC DOMAIN, no attribution needed.
                Its black space is baked TRANSPARENT (alpha = luminance) so ONLY the
                lit disc + a soft cool halo composite onto the deep-rose backdrop —
                a luminous circle (a sacred-geometry echo) with NO dark box. z-[1],
                below the content (z-10). */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[44svh] md:h-[48svh] overflow-hidden"
            >
              {/* Faint cool moon-glow behind the disc at the BOTTOM — atmosphere
                  only; the rust period in the finale type stays the one accent. */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-[55%]"
                style={{
                  background:
                    "radial-gradient(120% 85% at 50% 100%, rgba(206,214,236,0.12) 0%, rgba(206,214,236,0) 70%)",
                }}
              />
              <img
                src={asset("/img/scenes/moon-finale-v1.webp")}
                alt=""
                loading="eager"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-bottom select-none"
                style={{
                  // No flip — a moon disc reads upright. Bottom-pinned so it rises
                  // from the lower edge; gently dimmed so it never out-shouts the
                  // cream type (Hugo's brightness rule — the local text scrim does
                  // the rest of the legibility work).
                  filter: "brightness(0.92) saturate(0.98)",
                }}
              />
            </div>

            {/* Content column — centered flow. Layer order: pink backdrop
                (z-0, the shared fixed peacock layer) → sun limb (z-[1]) →
                LOCAL TEXT SCRIM (the soft ellipse below, behind the text only) →
                content (z-10). Whole-element Reveals (gotcha #2). */}
            <div className="relative z-10 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 text-center py-1 md:py-2">
              {/* TIGHT LOCAL TEXT SCRIM — Hugo: "you literally can't read it" on
                  the bright sun. A soft radial ellipse sits ONLY behind the
                  centred text block, NOT over the whole sun (the sun stays
                  bright). Every edge ends at alpha 0, so it never reads as a box
                  — it just pools enough warm-dark under the cream type for it to
                  read crisply over the bright limb. Sits inside the z-10 content
                  column (above the z-[1] sun) but behind the actual glyphs via
                  -z-10 within the column's own stacking context. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                  background:
                    "radial-gradient(70% 62% at 50% 50%, rgba(9,7,11,0.62) 0%, rgba(9,7,11,0.42) 42%, rgba(9,7,11,0.16) 72%, rgba(9,7,11,0) 100%)",
                }}
              />
              {/* The statement is the HERO of the close — the biggest thing on
                  the page (Hugo's direction). No eyebrow competes above it.
                  True Fraunces 700 at a controlled opsz 48 so strokes stay clean
                  even at this scale (opsz is the dial, not the size — opsz ≤48
                  avoids the hairline "scribble"). */}
              <Reveal delay={0}>
                <h2 className="font-display m-0">
                  {/* "Sacred geometry" — the DOMINANT title, the biggest type on
                      the page (Hugo: it must be larger than the clause beneath).
                      opsz 48 keeps the strokes clean at this scale. */}
                  <span
                    className="block"
                    style={{
                      fontVariationSettings: '"opsz" 48, "wght" 700',
                      fontWeight: 700,
                      // Sized so the longest word (GEOMETRY, 8 caps) fits on ONE
                      // line at every width — no orphaned "Y". Big + caps + 700
                      // reads as the screen-filling brand statement.
                      fontSize: "clamp(58px, 14.5vw, 240px)",
                      letterSpacing: "-0.03em",
                      lineHeight: 0.92,
                      textTransform: "uppercase",
                      color: "#ede6d6",
                      // Stronger triple halo so the cream caps read crisply over
                      // the bright sun (Hugo: unreadable) — a tight inner shadow
                      // for edge definition + two wider glows to ground it.
                      textShadow:
                        "0 1px 3px rgba(8,6,12,0.9), 0 2px 18px rgba(8,6,12,0.85), 0 2px 52px rgba(8,6,12,0.7)",
                    }}
                  >
                    Sacred{" "}
                    <em
                      style={{
                        fontStyle: "normal",
                        fontVariationSettings: '"opsz" 48, "wght" 700',
                        fontWeight: 700,
                      }}
                    >
                      geometry
                    </em>
                  </span>
                  {/* "— the order beneath all things." — the SUBORDINATE clause,
                      deliberately a fraction of the title size. */}
                  <span
                    className="block text-balance"
                    style={{
                      fontVariationSettings: '"opsz" 36, "wght" 600',
                      fontWeight: 600,
                      fontSize: "clamp(22px, 3.4vw, 54px)",
                      letterSpacing: "-0.005em",
                      lineHeight: 1.1,
                      color: "#ede6d6",
                      marginTop: "clamp(4px, 0.8vw, 14px)",
                      // Heavy dark halo so the subordinate line stays crisp even
                      // when it crosses the Earth's bright atmosphere rim (Hugo:
                      // "barely read it against the white part of earth").
                      textShadow:
                        "0 2px 16px rgba(8,6,12,0.96), 0 1px 3px rgba(8,6,12,0.9), 0 0 40px rgba(8,6,12,0.55)",
                    }}
                  >
                    &mdash; the order beneath all things
                    <span style={{ color: "#c97844" }}>.</span>
                  </span>
                </h2>
              </Reveal>

              {/* Hairline rule — one breath between the estate's statement
                  and Stephen's own voice. */}
              <Reveal delay={0.16}>
                <div aria-hidden="true" className="mx-auto my-5 md:my-8 h-px w-12 bg-ink/15" />
              </Reveal>

              {/* Stephen's voice — VERBATIM register. His documented words are
                  "everything is connected" (content.ts MEMORIAL_QUOTE); never
                  an invented near-quote. True Fraunces italic, opsz 24. */}
              <Reveal delay={0.22}>
                <p
                  className="font-display text-ink text-balance m-0 mb-6"
                  style={{
                    fontStyle: "italic",
                    fontVariationSettings: '"opsz" 24, "wght" 400',
                    fontSize: "clamp(20px, 2.4vw, 26px)",
                    lineHeight: 1.5,
                    // Strong halo — this line sits low over the brightest part of
                    // the sun and was unreadable; tight + wide shadow grounds it.
                    textShadow:
                      "0 1px 3px rgba(9,7,11,0.92), 0 2px 16px rgba(9,7,11,0.85), 0 0 34px rgba(9,7,11,0.6)",
                  }}
                >
                  &ldquo;I realised that everything is connected.&rdquo;
                  <span
                    style={{
                      fontStyle: "normal",
                      // Full cream + a halo so the SEM label reads on the bright
                      // sun (muted vanished); sentence-case per the type pass.
                      color: "#ede6d6",
                      textShadow:
                        "0 1px 3px rgba(9,7,11,0.92), 0 1px 12px rgba(9,7,11,0.8)",
                    }}
                    className="font-sans text-[11px] tracking-[0.04em] ml-3 align-middle"
                  >
                    SEM
                  </span>
                </p>
              </Reveal>

              {/* Quiet exit — a text link, never a pill. The colophon ends on a
                  soft door into the shop. */}
              <Reveal delay={0.3}>
                <Link
                  to="/collections"
                  // Full cream + a legibility halo so the exit link reads on the
                  // bright sun; sentence-case per the type pass.
                  className="font-sans text-[11px] font-bold tracking-[0.04em] text-ink transition-colors hover:text-accent"
                  style={{
                    textShadow:
                      "0 1px 3px rgba(9,7,11,0.9), 0 1px 14px rgba(9,7,11,0.75)",
                  }}
                >
                  Explore the collection{" "}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </Reveal>
            </div>
          </section>
        </main>

        <FooterCatalogue />
        <Footer />
      </div>
    </>
  );
};
