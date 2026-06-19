// =============================================================================
// ExhibitionProgress — the fixed right-edge act index (NN / 10 + 10 ticks).
// -----------------------------------------------------------------------------
// A lg-only progress rail pinned to the right of the viewing room: a two-digit
// "NN / 10" count above ten ticks, the active act's tick filled with accent.
// Each tick is a tiny button that scrolls to its act. Driven by ONE
// IntersectionObserver over the ten acts (the sentinel/observer pattern the rest
// of the site uses for scroll-tied visibility), so it costs no scroll listener.
//
// HARD CONSTRAINTS (CLAUDE.md):
//   - It is fixed + ALWAYS mounted → NEVER backdrop-filter (the scroll-lag cause).
//   - The wrapper is pointer-events-none; only the tick buttons re-enable pointer
//     events, so the rail never eats clicks on the art beneath it.
//   - Static under reduced motion: scrollIntoView uses behavior "auto", and there
//     are no scroll-tied transforms here at all (IO is event-driven, not motion).
//   - Hidden below lg (the art needs the full width on narrow viewports).
// =============================================================================

import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";

interface ExhibitionProgressProps {
  /** Painting ids in exhibition order — each maps to an `act-${id}` section. */
  paintingIds: string[];
  /** Human titles, parallel to paintingIds, for the tick aria-labels. */
  titles: string[];
}

export const ExhibitionProgress = ({ paintingIds, titles }: ExhibitionProgressProps) => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections = paintingIds
      .map((id) => document.getElementById(`act-${id}`))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    // ONE observer over all ten acts. Whichever act is most centred in the
    // viewport (largest intersection ratio while crossing the middle band) is
    // the active one. rootMargin pulls the trigger band to the viewport centre
    // so the index flips as a work takes the screen, not at its top edge.
    const visible = new Map<number, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = sections.indexOf(entry.target as HTMLElement);
          if (idx === -1) continue;
          if (entry.isIntersecting) visible.set(idx, entry.intersectionRatio);
          else visible.delete(idx);
        }
        if (visible.size === 0) return;
        let bestIdx = active;
        let bestRatio = -1;
        for (const [idx, ratio] of visible) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIdx = idx;
          }
        }
        setActive(bestIdx);
      },
      {
        // The trigger band is the centre third of the viewport.
        rootMargin: "-40% 0px -40% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );
    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // active is intentionally omitted — it's only a fallback seed for bestIdx,
    // not a dependency that should re-create the observer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintingIds]);

  const scrollToAct = (idx: number) => {
    const target = document.getElementById(`act-${paintingIds[idx]}`);
    if (!target) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const total = paintingIds.length;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <nav
      aria-label="Exhibition progress"
      className="pointer-events-none fixed right-4 2xl:right-6 top-1/2 -translate-y-1/2 z-40 hidden 2xl:flex flex-col items-end gap-3"
    >
      {/* NN / 10 — the live count. */}
      <p
        className="m-0 font-sans text-[11px] font-bold tracking-[0.18em] uppercase text-ink-muted"
        style={{ textShadow: "0 1px 8px rgba(0,0,0,0.85)" }}
      >
        <span className="text-ink">{pad(active + 1)}</span>
        <span className="mx-1 text-ink/35">/</span>
        {pad(total)}
      </p>

      {/* Ten ticks — active filled with accent. Each is a real button. */}
      <div className="flex flex-col items-end gap-2">
        {paintingIds.map((id, idx) => {
          const isActive = idx === active;
          return (
            <button
              key={id}
              type="button"
              onClick={() => scrollToAct(idx)}
              aria-label={`Go to ${titles[idx] ?? `work ${idx + 1}`}`}
              className={cn(
                "pointer-events-auto block h-px rounded-full transition-all duration-500",
                "focus:outline-none focus-visible:ring-1 focus-visible:ring-accent",
                isActive
                  ? "w-7 bg-accent"
                  : "w-4 bg-ink/30 hover:w-6 hover:bg-ink/60",
              )}
            />
          );
        })}
      </div>
    </nav>
  );
};
