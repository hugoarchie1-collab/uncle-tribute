import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CaveScene } from "./CaveScene";
import { GardenScene } from "./GardenScene";

gsap.registerPlugin(ScrollTrigger);

interface CaveIntroProps {
  onComplete?: () => void;
}

// ~40s for a relaxed scroll, ~15s for a fast scroll.
// Scroll distance in vh; longer = slower pan.
const SCROLL_DISTANCE_VH = 350;

export const CaveIntro = ({ onComplete }: CaveIntroProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const caveRef = useRef<HTMLDivElement>(null);
  const gardenRef = useRef<HTMLDivElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!sectionRef.current || !caveRef.current || !gardenRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: `+=${SCROLL_DISTANCE_VH}vh`,
          scrub: 1.2,                  // smoothing
          pin: true,
          anticipatePin: 1,
          onLeave: () => {
            setDone(true);
            onComplete?.();
          },
        },
      });

      // PHASE 1: horizontal pan across the cave (0 -> 0.65 of timeline)
      // The cave SVG is 300vw wide; translate from 0 to -200vw.
      tl.to(caveRef.current, {
        xPercent: -66.67,
        ease: "none",
        duration: 0.65,
      }, 0);

      // PHASE 2 (overlapping tail of pan): fade cave out (0.55 -> 0.7)
      tl.to(caveRef.current, {
        opacity: 0,
        duration: 0.15,
        ease: "power2.in",
      }, 0.55);

      // PHASE 3: fade in garden + easel + chair (0.55 -> 0.8)
      tl.fromTo(
        gardenRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: "power2.out" },
        0.55,
      );

      // PHASE 4: slow zoom into the chair scene (0.65 -> 1.0)
      tl.fromTo(
        gardenRef.current,
        { scale: 1.02 },
        { scale: 1.0, duration: 0.35, ease: "none" },
        0.65,
      );

      // PHASE 5: hold (chair beat) — the timeline just keeps going at constant
      // opacity to provide the lock period. Tight ~40s pace = ~2 seconds at top.
      tl.to(gardenRef.current, { opacity: 1, duration: 0.2 }, 0.8);

      // Subtle grain pulse the whole way through
      if (grainRef.current) {
        gsap.to(grainRef.current, {
          backgroundPosition: "200px 200px",
          duration: 1.8,
          ease: "none",
          repeat: -1,
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [onComplete]);

  return (
    <>
      <section
        ref={sectionRef}
        className="cave-intro"
        aria-label="Cinematic introduction: Plato's allegory of the cave"
      >
        <div className="intro-stage">
          {/* Cave layer */}
          <div ref={caveRef} className="cave-layer">
            <CaveScene />
          </div>

          {/* Garden / chair layer, fades in */}
          <div ref={gardenRef} className="garden-layer">
            <GardenScene />
          </div>

          {/* Film grain overlay */}
          <div ref={grainRef} className="film-grain" aria-hidden="true" />
          {/* Cinematic vignette */}
          <div className="cinematic-vignette" aria-hidden="true" />
        </div>

        {/* Scroll cue — only visible on first load */}
        {!done && (
          <div className="scroll-cue" aria-hidden="true">
            <span className="scroll-cue-line" />
          </div>
        )}
      </section>
    </>
  );
};
