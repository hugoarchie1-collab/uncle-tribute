import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scroll-reveal animation for any descendant of <body> that has the
 * `data-reveal` attribute. On first paint elements sit at opacity 0 +
 * translateY(24px); as they enter the viewport they fade to opacity 1
 * + translateY(0) over 1000ms ease-out.
 *
 * Children that share a parent get staggered 100ms apart via inline
 * transition-delay so they don't all snap together.
 *
 * Re-runs on every route change so new pages pick up their reveal
 * targets reliably.
 *
 * Safety net: after 1.2s anything still un-revealed gets force-revealed,
 * so the page can never get stuck invisible if the observer misfires.
 *
 * Respects prefers-reduced-motion by revealing everything immediately.
 */
export const useScrollReveal = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-revealed)"),
    );

    if (targets.length === 0) return;

    if (reduce) {
      targets.forEach((el) => el.classList.add("is-revealed"));
      return;
    }

    // Stagger siblings by their DOM order within their parent
    const childIndex = new WeakMap<Element, number>();
    targets.forEach((el) => {
      if (el.parentElement) {
        const siblings = Array.from(el.parentElement.children).filter(
          (c) => c instanceof HTMLElement && c.hasAttribute("data-reveal"),
        );
        const idx = siblings.indexOf(el);
        if (idx >= 0) childIndex.set(el, idx);
      }
    });

    const reveal = (el: HTMLElement) => {
      const idx = childIndex.get(el) ?? 0;
      el.style.transitionDelay = `${Math.min(idx * 100, 500)}ms`;
      el.classList.add("is-revealed");
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target as HTMLElement);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -10% 0px" },
    );

    targets.forEach((el) => observer.observe(el));

    // Safety net — if anything is still hidden 1.2s after route mount, force it
    // visible. Prevents content from being stranded if the observer misfires
    // (route hydration timing, scroll-restore race, etc).
    const safety = window.setTimeout(() => {
      document
        .querySelectorAll<HTMLElement>("[data-reveal]:not(.is-revealed)")
        .forEach((el) => {
          el.classList.add("is-revealed");
          observer.unobserve(el);
        });
    }, 1200);

    return () => {
      window.clearTimeout(safety);
      observer.disconnect();
    };
  }, [pathname]);
};
