import { useEffect } from "react";

/**
 * Scroll-reveal animation for any descendant of <body> that has the
 * `data-reveal` attribute. On first paint elements sit at opacity 0 +
 * translateY(24px); as they enter the viewport they fade to opacity 1
 * + translateY(0) over 700ms ease-out.
 *
 * Children that share a parent get staggered 100ms apart via inline
 * transition-delay so they don't all snap together.
 *
 * Respects prefers-reduced-motion by revealing everything immediately.
 */
export const useScrollReveal = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Apply initial styles to every reveal target.
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    if (reduce) {
      // Skip the dance entirely
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

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const idx = childIndex.get(el) ?? 0;
            el.style.transitionDelay = `${Math.min(idx * 100, 500)}ms`;
            el.classList.add("is-revealed");
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });
};
