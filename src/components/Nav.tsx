import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Logo } from "./Logo";
import { AssetImage } from "./AssetImage";
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
 * Each primary link maps to ONE original-colourway painting (paths verified
 * against src/data/paintings.ts — every file exists as .jpg + .webp). Reference
 * the .jpg; AssetImage swaps to .webp via <picture>. The featured image in the
 * overlay's right column is keyed off the current route, swapped on hover/focus.
 * Ordered warm → cool → bridge → cool → unity → grounding for a deliberate
 * reveal arc, not a colour accident.
 */
const NAV_PAINTING: Record<string, string> = {
  "/": "/img/paintings/wild-rose-sussex-pink.jpg",
  "/collections": "/img/paintings/english-bluebells-v3.jpg",
  "/for-you": "/img/paintings/peacock-mary-pink.jpg",
  "/about": "/img/paintings/orchis7-aquamarine-blue.jpg",
  "/memories": "/img/paintings/fol-kaleidoscope.jpg",
  "/contact": "/img/paintings/lulin-original.jpg",
};

/** Estate meta secondary links — the quiet footer set (real routes only). */
const SECONDARY_LINKS = [
  { to: "/journal", label: "Journal" },
  { to: "/photo-book", label: "Photo Book" },
  { to: "/faq", label: "FAQ" },
  { to: "/basket", label: "Basket" },
];

/** Site canonical easing — mirrors tailwind transitionTimingFunction.smooth. */
const EASE_SMOOTH = [0.22, 0.61, 0.36, 1] as const;

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

  // The painting shown in the overlay's right column. Seeded from the current
  // route on open (so it's "just there", no entrance), then swapped on link
  // hover/focus. Never snaps back on leave — it rests on the last-hovered.
  const [featured, setFeatured] = useState<string>(
    NAV_PAINTING[location.pathname] ?? NAV_PAINTING["/"],
  );

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
    // Capture the toggle node now (stable for the menu's lifetime) so the
    // cleanup can restore focus to it without reading a ref at teardown time.
    const toggleBtn = menuButtonRef.current;

    const focusables = (): HTMLElement[] =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])',
        ) ?? [],
      );

    // Focus the FIRST primary nav link once the panel is mounted (not the
    // header logo) so a keyboard user lands on the menu proper.
    const focusTimer = window.setTimeout(() => {
      const firstLink = menuRef.current?.querySelector<HTMLElement>(
        'nav[aria-label="Primary"] a[href]',
      );
      (firstLink ?? focusables()[0])?.focus();
    }, 20);

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
      toggleBtn?.focus();
    };
  }, [menuOpen]);

  // On open, seed the featured painting from the CURRENT route so it's already
  // visible (no entrance animation), confident, "just there".
  useEffect(() => {
    if (menuOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFeatured(NAV_PAINTING[location.pathname] ?? NAV_PAINTING["/"]);
    }
  }, [menuOpen, location.pathname]);

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

      {/* Overlay menu (<xl) — an editorial split takeover rendered via a
          PORTAL to document.body so it escapes every page stacking context
          (the home <main> isolate + transformed sections). TWO sibling fixed
          layers: an OPAQUE solid scrim (zero alpha, zero blur — the documented
          bleed-through fix) under an opaque dialog. The dialog is the
          interactive surface; clicks on its empty padding close, but the inner
          content column + painting stopPropagation so link/painting clicks
          don't bubble to close. Focus-trapped + scroll-locked + route-change
          close (effects above), reduced-motion safe. */}
      <NavOverlay
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        menuRef={menuRef}
        featured={featured}
        setFeatured={setFeatured}
        reduceMotion={!!reduceMotion}
      />
    </header>
  );
};

/**
 * The <xl overlay menu, portalled to document.body. Kept as its own component
 * so the portal + AnimatePresence read cleanly and the header stays focused on
 * the inline bar. All a11y wiring (focus-trap, escape, scroll-lock, focus
 * restore, route-change close) lives in the Nav effects above and points
 * `menuRef` at the dialog.
 */
const NavOverlay = ({
  open,
  onClose,
  menuRef,
  featured,
  setFeatured,
  reduceMotion,
}: {
  open: boolean;
  onClose: () => void;
  menuRef: RefObject<HTMLDivElement | null>;
  featured: string;
  setFeatured: (path: string) => void;
  reduceMotion: boolean;
}) => {
  // Shared pad to keep the dialog's header row + footer strip aligned with the
  // real site header's horizontal rhythm.
  const PAD = "px-4 sm:px-6 md:px-8 lg:px-12";

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* (1) SCRIM — fully OPAQUE #0a0908, no alpha, no blur. Sits UNDER
              the dialog; clicking it closes. The single most important graft:
              this is the fix for the documented stacking-context bleed. */}
          <motion.div
            aria-hidden="true"
            onClick={onClose}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0 : open ? 0.28 : 0.2,
              ease: EASE_SMOOTH,
            }}
            className="xl:hidden fixed inset-0 z-[120] bg-[#0a0908]"
          />

          {/* (2) DIALOG — also fully opaque (belt + braces). Clicks on its
              empty padding close; the inner column + painting stop bubbling. */}
          <motion.div
            ref={menuRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            onClick={onClose}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0 : open ? 0.28 : 0.2,
              ease: EASE_SMOOTH,
            }}
            className="xl:hidden fixed inset-0 z-[121] bg-[#0a0908] text-ink grid grid-rows-[auto_1fr_auto] h-[100dvh] overflow-hidden"
          >
            {/* HEADER ROW — mirrors the nav bar exactly. */}
            <div
              className={cn(PAD, "flex items-center justify-between py-5")}
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                to="/"
                aria-label="The Art of Stephen Meakin — home"
                className="inline-flex items-center shrink-0"
              >
                <Logo size={32} wordmark />
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={onClose}
                className="inline-flex items-center justify-center w-11 h-11 -mr-2 text-ink/70 hover:text-ink transition-colors"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M5 5 19 19M19 5 5 19" />
                </svg>
              </button>
            </div>

            {/* BODY — stacked <768; side-by-side 44/56 grid ≥768 (the owner's
                ~1130px laptop view). Hairline divider on ≥768 only. min-h-0 so
                the grid row can shrink and the painting column scrolls nothing
                off-screen. */}
            <div className="min-h-0 flex flex-col overflow-y-auto md:grid md:grid-cols-[minmax(0,44%)_minmax(0,56%)] md:overflow-hidden">
              {/* LEFT — link list, vertically centred. */}
              <nav
                aria-label="Primary"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 flex flex-col justify-center pl-[clamp(1.5rem,5vw,6rem)] pr-8 py-6 md:py-8"
              >
                {NAV_LINKS.map((l, i) => (
                  <motion.div
                    key={l.to}
                    initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.4,
                      delay: reduceMotion ? 0 : 0.05 + i * 0.05,
                      ease: EASE_SMOOTH,
                    }}
                  >
                    <NavLink
                      to={l.to}
                      end={l.end}
                      onMouseEnter={() => setFeatured(NAV_PAINTING[l.to])}
                      onFocus={() => setFeatured(NAV_PAINTING[l.to])}
                      className="group flex items-baseline gap-3 py-2.5 outline-none [&.active>span:last-child]:text-accent [&:focus-visible]:[outline:2px_solid_rgba(201,120,68,0.5)] [&:focus-visible]:[outline-offset:3px]"
                    >
                      {/* Index numeral — muted, shifts to 40% rust on hover/focus
                          with a slight delay so the eye reads "link lit, then
                          watch the art". aria-hidden so SR reads only the label. */}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "font-sans text-[11px] font-normal text-ink-muted tabular-nums tracking-normal",
                          reduceMotion
                            ? "group-hover:[color:rgba(201,120,68,0.4)] group-focus-within:[color:rgba(201,120,68,0.4)]"
                            : "transition-[color] duration-200 delay-[50ms] group-hover:[color:rgba(201,120,68,0.4)] group-focus-within:[color:rgba(201,120,68,0.4)]",
                        )}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "font-display font-semibold leading-[1.1] tracking-[-0.015em] text-[clamp(28px,5.2vw,40px)] text-ink group-hover:text-accent",
                          reduceMotion
                            ? "duration-0"
                            : "transition-colors duration-200 ease-out",
                        )}
                        style={{ fontVariationSettings: '"opsz" 40' }}
                      >
                        {l.label}
                      </span>
                    </NavLink>
                  </motion.div>
                ))}
              </nav>

              {/* RIGHT (≥768) / BELOW (<768) — the featured painting. Hairline
                  divider only ≥768. Cross-dissolve two stacked images on
                  hover/focus; the current-route image is already at opacity 1
                  on mount (no entrance). Never cropped (object-contain). */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative md:border-l md:border-line flex items-center justify-center px-4 py-6 md:p-8 flex-1 min-h-[200px] md:min-h-0"
              >
                {reduceMotion ? (
                  <AssetImage
                    key={featured}
                    src={featured}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={featured}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="absolute inset-0 flex items-center justify-center px-4 md:p-8"
                    >
                      <AssetImage
                        src={featured}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* FOOTER META STRIP — top hairline + quiet estate meta and the
                secondary links. Stacked <768; one justify-between flex row
                ≥768 (meta left, secondary links right). */}
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.4,
                delay: reduceMotion ? 0 : 0.3,
                ease: EASE_SMOOTH,
              }}
              className={cn(
                PAD,
                "border-t border-line py-5 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-6 md:gap-y-2",
              )}
            >
              <address className="not-italic font-sans text-[13px] leading-[1.6] text-ink-muted flex flex-col md:flex-row md:gap-x-6">
                <a
                  href="mailto:info@themandalacompany.com"
                  className="inline-block py-1 transition-colors duration-200 hover:text-ink [overflow-wrap:anywhere]"
                >
                  info@themandalacompany.com
                </a>
                <span>213 Elm Drive, Hove, BN3 7JD</span>
              </address>
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-sans text-[13px] leading-[1.6] text-ink-muted">
                {SECONDARY_LINKS.map((l, i) => (
                  <span key={l.to} className="inline-flex items-center gap-x-4">
                    {i > 0 && (
                      <span aria-hidden="true" className="text-ink-muted/50">
                        ·
                      </span>
                    )}
                    <Link
                      to={l.to}
                      className="inline-block py-1.5 transition-colors duration-200 hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};
