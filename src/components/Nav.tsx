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
  { to: "/about", label: "About" },
  { to: "/journal", label: "Journal" },
  { to: "/memories", label: "Memories" },
  { to: "/photo-book", label: "Photo Book" },
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
 * `overlay` — pin the nav with `fixed` instead of `sticky` so it floats over
 * full-bleed content (the home intro video) from the very top, without
 * reserving layout space. Used by the Welcome page; every other page leaves it
 * off and gets the normal in-flow sticky header. When overlaying and not yet
 * scrolled, a soft top scrim keeps the cream logo + links legible over video.
 */
export const Nav = ({ overlay = false }: { overlay?: boolean } = {}) => {
  const [scrolled, setScrolled] = useState(false);
  const basket = useBasket();
  const basketCount = basket.length;
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);

  // Track the prior basket count so we can pulse only on increments, and
  // expose a `pulseKey` to Framer Motion that bumps every time a pulse
  // should retrigger. Route changes (when the basket is non-empty) also
  // bump the key as a gentle continuity reminder.
  const prevCountRef = useRef(basketCount);
  const prevPathRef = useRef(location.pathname);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    const countIncreased = basketCount > prevCountRef.current;
    const pathChanged = location.pathname !== prevPathRef.current;
    prevCountRef.current = basketCount;
    prevPathRef.current = location.pathname;
    // Only bump the pulse key when we actually want a pulse — gates the
    // setState so the lint rule (and React) only see it fire on real
    // increments or genuine route changes with a non-empty basket.
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

  // Close the mobile menu whenever the route changes. Synchronising a
  // transient UI flag to a navigation event is a legitimate effect; the rule's
  // cascading-render concern doesn't apply to this one-shot close.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={cn(
        overlay ? "fixed inset-x-0 top-0" : "sticky top-0",
        "z-50 px-4 sm:px-6 md:px-8 lg:px-12 transition-all duration-300 text-ink",
        scrolled
          ? "py-3 bg-bg/92 backdrop-blur-md border-b border-white/5"
          : overlay
            ? "py-5 bg-gradient-to-b from-bg/70 via-bg/25 to-transparent border-b border-transparent"
            : "py-5 bg-transparent border-b border-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 sm:gap-6">
      <Link to="/" aria-label="The Art of Stephen Meakin — home" className="inline-flex items-center">
        <Logo size={32} wordmark />
      </Link>

      <div className="flex items-center gap-5 sm:gap-7 md:gap-10">
        {/* Primary links — inline from `xl` up; collapsed into the hamburger
            menu below `xl`. (Seven links + the wordmark overflow below ~1280px,
            so tablets and smaller laptops get the menu.) */}
        <nav className="hidden xl:flex items-center gap-6 2xl:gap-8" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "relative py-2 font-sans text-[11px] font-medium tracking-[0.22em] uppercase transition-colors duration-300",
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
          {/* Returning-subscriber recognition — quiet hairline text that
              appears once per session if the visitor previously joined
              Friends & Family. Self-hiding. */}
          <ReturningVisitorChip />
        </nav>

        {/* Basket — icon + count badge (count appears only when ≥ 1). Always
            visible at every width. */}
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
                reduceMotion ? undefined : { duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }
              }
              className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-[5px] inline-flex items-center justify-center rounded-full bg-accent text-bg font-sans text-[9px] font-bold leading-none"
            >
              {basketCount}
            </motion.span>
          )}
        </NavLink>

        {/* Hamburger — mobile only. Toggles the dropdown menu below. */}
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((o) => !o)}
          className="xl:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 text-ink/70 hover:text-ink transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
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

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="mobile-menu"
            aria-label="Primary mobile"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            className="xl:hidden absolute top-full left-0 right-0 bg-bg/97 backdrop-blur-md border-b border-white/10 px-4 flex flex-col max-h-[calc(100vh-64px)] overflow-y-auto"
          >
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    "py-3.5 font-sans text-[11px] font-medium tracking-[0.22em] uppercase border-b border-white/5 last:border-0 transition-colors duration-200",
                    isActive ? "text-accent" : "text-ink/70 hover:text-ink",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};
