import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Logo } from "./Logo";
import { ReturningVisitorChip } from "./ReturningVisitorChip";
import { cn } from "../lib/cn";
import { useBasket } from "../lib/basket";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/collections", label: "Collections" },
  { to: "/for-you", label: "For You" },
  { to: "/about", label: "About" },
  { to: "/memories", label: "Memories" },
  { to: "/contact", label: "Contact" },
];

/**
 * Single-line SVG basket icon — kept inline so we don't pull in an icon
 * library for one glyph. Matches the nav's line-weight register.
 */
const BasketIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d="M5 8h14l-1.2 10.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

/**
 * Global site navigation (#4 redesign).
 *
 * Desktop (≥lg): a single minimal inline bar — small-caps links, generous
 * letter-spacing + breathing room, the current page indicated by a quiet accent
 * underline. With the catalogue trimmed to five links the inline nav now shows
 * from `lg` (was `xl`), so tablets/laptops get it instead of the menu.
 *
 * Mobile (<lg): one accessible menu — a dimmed backdrop + a panel that traps
 * focus, closes on Escape or backdrop click, locks body scroll while open, and
 * restores focus to the toggle on close. Keyboard navigable, ARIA-labelled.
 *
 * `overlay` — pin with `fixed` (vs `sticky`) so the bar floats over full-bleed
 * content (the home intro video) from the very top without reserving layout
 * space. A soft top scrim keeps the cream logo + links legible until scrolled.
 */
export const Nav = ({ overlay = false }: { overlay?: boolean } = {}) => {
  const [scrolled, setScrolled] = useState(false);
  const basket = useBasket();
  const basketCount = basket.length;
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Track the prior basket count so we pulse only on increments, exposing a
  // `pulseKey` that bumps every time a pulse should retrigger. Route changes
  // (when the basket is non-empty) also bump the key as a continuity reminder.
  const prevCountRef = useRef(basketCount);
  const prevPathRef = useRef(location.pathname);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    const countIncreased = basketCount > prevCountRef.current;
    const pathChanged = location.pathname !== prevPathRef.current;
    prevCountRef.current = basketCount;
    prevPathRef.current = location.pathname;
    if (countIncreased || (pathChanged && basketCount > 0)) {
      setPulseKey((k) => k + 1);
    }
  }, [basketCount, location.pathname]);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 40);
    handle();
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [location.pathname]);

  // Mobile menu a11y: Escape to close, Tab focus-trap, body-scroll lock, and
  // focus restored to the toggle on close. Only active while the menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = (): HTMLElement[] =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])',
        ) ?? [],
      );

    // Focus the first link once the panel is mounted.
    const focusTimer = window.setTimeout(() => focusables()[0]?.focus(), 20);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (e.key === "Tab") {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      menuButtonRef.current?.focus();
    };
  }, [menuOpen]);

  return (
    <header
      className={cn(
        overlay ? "fixed inset-x-0 top-0" : "sticky top-0",
        "z-50 px-4 sm:px-6 md:px-8 lg:px-12 transition-all duration-300 text-ink",
        scrolled
          ? "py-3 bg-[#0a0908]/92 backdrop-blur-md border-b border-white/5"
          : overlay
            ? "py-5 bg-gradient-to-b from-[#0a0908]/70 via-[#0a0908]/25 to-transparent border-b border-transparent"
            : "py-5 bg-transparent border-b border-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 sm:gap-6">
        <Link
          to="/"
          aria-label="The Art of Stephen Meakin — home"
          className="inline-flex items-center shrink-0"
        >
          <Logo size={32} wordmark />
        </Link>

        <div className="flex items-center gap-5 sm:gap-7 lg:gap-9">
          {/* Primary links — inline from `lg` up; collapsed into the accessible
              menu below `lg`. */}
          <nav
            className="hidden xl:flex items-center gap-8 2xl:gap-10"
            aria-label="Primary"
          >
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    "relative py-2 font-sans text-[11px] font-semibold tracking-[0.26em] uppercase transition-colors duration-300",
                    isActive ? "text-ink" : "text-ink/55 hover:text-ink",
                    "after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-accent after:scale-x-0 after:origin-left after:transition-transform after:duration-300",
                    isActive && "after:scale-x-100",
                    "hover:after:scale-x-100",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
            <ReturningVisitorChip />
          </nav>

          {/* Basket — icon + count badge (count appears only when ≥ 1). */}
          <NavLink
            to="/basket"
            aria-label={
              basketCount > 0
                ? `Basket, ${basketCount} item${basketCount === 1 ? "" : "s"}`
                : "Basket, empty"
            }
            className={({ isActive }) =>
              cn(
                "relative inline-flex items-center justify-center min-w-[44px] min-h-[44px] transition-colors duration-300",
                isActive ? "text-ink" : "text-ink/55 hover:text-accent",
              )
            }
          >
            <BasketIcon className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px]" />
            {basketCount > 0 && (
              <motion.span
                key={reduceMotion ? "static" : `pulse-${pulseKey}`}
                aria-hidden="true"
                initial={
                  reduceMotion
                    ? false
                    : { scale: 1, boxShadow: "0 0 0 0 rgba(201,120,68,0)" }
                }
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        scale: [1, 1.35, 1],
                        boxShadow: [
                          "0 0 0 0 rgba(201,120,68,0)",
                          "0 0 0 6px rgba(201,120,68,0.35)",
                          "0 0 0 0 rgba(201,120,68,0)",
                        ],
                      }
                }
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }
                }
                className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-[5px] inline-flex items-center justify-center rounded-full bg-accent text-bg font-sans text-[9px] font-bold leading-none"
              >
                {basketCount}
              </motion.span>
            )}
          </NavLink>

          {/* Hamburger — below `lg`. Toggles the accessible menu. */}
          <button
            ref={menuButtonRef}
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
            className="xl:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 text-ink/70 hover:text-ink transition-colors"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path d="M5 5 19 19M19 5 5 19" />
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu: dimmed backdrop (click to close) + focus-trapped panel. */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              tabIndex={-1}
              onClick={() => setMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="xl:hidden fixed inset-0 z-40 bg-[#0a0908]/70 backdrop-blur-sm"
            />
            <motion.nav
              ref={menuRef}
              id="mobile-menu"
              aria-label="Primary"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
              className="xl:hidden absolute top-full left-0 right-0 z-50 bg-bg border-b border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.55)] px-4 sm:px-6 flex flex-col max-h-[calc(100dvh-64px)] overflow-y-auto"
            >
              {NAV_LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    cn(
                      "py-4 font-sans text-[12px] font-semibold tracking-[0.26em] uppercase border-b border-white/5 last:border-0 transition-colors duration-200",
                      isActive ? "text-accent" : "text-ink/70 hover:text-ink",
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};
