import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Logo } from "./Logo";
import { SearchBar } from "./SearchBar";
import { DeliverTo } from "./DeliverTo";
import { CurrencySelect } from "./CurrencySelect";
import { ReturningVisitorChip } from "./ReturningVisitorChip";
import { cn } from "../lib/cn";
import { useBasketLines } from "../lib/basket";

/**
 * Primary menu GROUPED so a visitor instantly knows where to BUY vs read his
 * story vs reach the estate (Hugo: "sub-categories… SHOP wording… so users
 * understand where to buy"). Library moved UP into "His story"; Gift cards
 * moved DOWN to the quiet secondary set; Trade sits under "Shop".
 */
type NavItem = { to: string; label: string; end?: boolean };
const NAV_GROUPS: { heading: string; links: NavItem[] }[] = [
  {
    heading: "Shop",
    links: [
      { to: "/collections", label: "Collections" },
      { to: "/gallery", label: "Virtual Gallery" },
      { to: "/for-you", label: "Find a print" },
      { to: "/trade", label: "Trade & Interiors" },
    ],
  },
  {
    heading: "His story",
    links: [
      { to: "/about", label: "About Stephen" },
      { to: "/news", label: "News" },
      { to: "/library", label: "The Library" },
    ],
  },
  {
    heading: "The estate",
    links: [
      { to: "/memories", label: "Memories" },
      { to: "/auth", label: "Authenticate" },
      { to: "/contact", label: "Contact" },
    ],
  },
];

/** Flat list (Home + every grouped link) for the hidden desktop inline nav. */
const NAV_LINKS: NavItem[] = [
  { to: "/", label: "Home", end: true },
  ...NAV_GROUPS.flatMap((g) => g.links),
];

/** Quiet drawer-footer set — Gift cards now lives HERE (Hugo: down with the
 *  others), beside account/orders + FAQ + legal. Basket has its own top-bar
 *  icon so it's intentionally absent. */
const SECONDARY_LINKS = [
  { to: "/gift", label: "Gift cards" },
  { to: "/account", label: "Your account" },
  { to: "/orders", label: "Orders & returns" },
  { to: "/faq", label: "FAQ" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/returns", label: "Returns" },
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
  // Smart hide-on-scroll (the premium pattern): the bar SLIDES AWAY on scroll
  // DOWN and slides back in on scroll UP, so the top panel is always cleanly
  // distinguished from the content moving under it — and never floats as a
  // persistent banner over the reading column. Transform + opacity only
  // (compositor-cheap); NO backdrop-filter on this always-mounted fixed element
  // (that re-samples the full-width strip every scroll frame — the "2005-lag").
  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef(0);
  // Count ALL basket lines — prints AND gift cards — so the badge reflects a
  // gift-only basket too.
  const basket = useBasketLines();
  const basketCount = basket.length;
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // User avatar (set on /account → localStorage "tasm.avatar") shown beside the
  // profile icon. Re-read on navigation (the upload-then-return flow) + on a
  // cross-tab storage change.
  const [avatar, setAvatar] = useState<string | null>(() => {
    try {
      return typeof localStorage !== "undefined" ? localStorage.getItem("tasm.avatar") : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvatar(localStorage.getItem("tasm.avatar"));
    } catch {
      /* storage unavailable */
    }
  }, [location.pathname]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "tasm.avatar") setAvatar(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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
    // Always reveal above this — the top zone (hero / intro film) shows the bar.
    const SHOW_ABOVE = 90;
    // Direction deadband so micro-jitter / trackpad inertia never flickers it.
    const DELTA = 6;
    let raf = 0;
    lastYRef.current = window.scrollY;
    const evaluate = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      if (y < SHOW_ABOVE) {
        // Top zone — always show.
        setHidden(false);
        lastYRef.current = y;
        return;
      }
      // Accumulate small scrolls: only RE-BASE lastYRef once the DELTA deadband
      // is crossed. (The old code re-based every frame, so a SLOW scroll-up never
      // built up enough delta to cross −DELTA — the bar only reappeared at the very
      // top. Now ANY scroll-up reveals it, fast or slow — Hugo's ask.)
      const delta = y - lastYRef.current;
      if (delta > DELTA) {
        setHidden(true); // scrolling down → slide away
        lastYRef.current = y;
      } else if (delta < -DELTA) {
        setHidden(false); // scrolling up → slide back in
        lastYRef.current = y;
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(evaluate);
    };
    evaluate();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
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

  return (
    <header
      className={cn(
        overlay ? "fixed inset-x-0 top-0" : "sticky top-0",
        "z-50 px-4 sm:px-6 md:px-8 lg:px-12 text-ink",
        // Slide-away on scroll-down / slide-in on scroll-up. Transform + opacity
        // are GPU-composited, so the hide/reveal costs nothing on the main
        // thread. Slightly slower reveal than hide reads as deliberate, premium.
        "transition-[transform,opacity,padding,background-color] duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] will-change-transform",
        // Keep the bar pinned while the mobile menu is open (the drawer needs its
        // toggle reachable) and whenever it's revealed.
        hidden && !menuOpen
          ? "-translate-y-full opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100",
        // Scrolled: a NEAR-SOLID dark fill (real CSS class — see global.css
        // .nav-bg-scrolled) so content moving under the bar is cleanly separated
        // and never bleeds through — the distinct "top panel" the brief asks for.
        // No backdrop-filter (the banned per-frame "2005-lag"); the fill keeps the
        // cream logo + links legible and the shadow softens the seam.
        scrolled
          ? "py-3 nav-bg-scrolled border-b border-white/10 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)]"
          // At the very top: a soft top-down scrim (real CSS) so the deep-red seal
          // + cream links never get swallowed by the busy peacock/photo backdrops,
          // while the hero/film still reads through. Overlay pages get a touch more.
          : overlay
            ? "py-5 nav-bg-top border-b border-transparent"
            : "py-5 nav-bg-top-plain border-b border-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[1840px] items-center justify-between gap-3 sm:gap-6">
        <Link
          to="/"
          aria-label="The Art of Stephen Meakin — home"
          className="press inline-flex items-center shrink-0"
        >
          <Logo size={50} wordmark />
        </Link>

        {/* Deliver-to — Amazon-pattern location control sitting left of the
            search. Free worldwide delivery, so it's an informational preference
            only (never touches pricing). lg+ in the bar; in the drawer below. */}
        <DeliverTo variant="header" className="hidden lg:flex shrink-0" />

        {/* Site search — Amazon-pattern (search anything on the site), skinned
            to the estate. Grows to fill the middle of the bar on md+; on mobile
            it drops into the drawer below. */}
        <SearchBar
          variant="header"
          className="hidden md:block flex-1 mx-4 lg:mx-8 max-w-[560px] lg:max-w-[720px]"
        />

        <div className="flex items-center gap-5 sm:gap-7 lg:gap-9">
          {/* Primary links live in the always-on MENU drawer now (Hugo: the
              inline bar "all overlaps" — 11 links never fit a single row, so they
              crammed/overlapped at wide widths). The hamburger below is shown at
              EVERY width and opens the full-screen drawer that lists every page.
              This inline nav is kept hidden (so the markup/chip stay available if
              we ever want a curated desktop subset). */}
          <nav
            className="hidden"
            aria-label="Primary"
          >
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    "relative py-2 font-sans text-[11px] font-semibold tracking-[0.04em] transition-colors duration-300",
                    isActive ? "text-ink" : "text-ink/55 hover:text-ink",
                    // DIRECTIONAL underline — grows in FROM the left (hover sets
                    // origin-left), and on hover-out the origin reverts to the
                    // base origin-right so the line collapses out THROUGH the
                    // right edge: one continuous direction of travel, never a
                    // rewind. The active page keeps its persistent underline.
                    "after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-accent after:scale-x-0 after:origin-right after:transition-transform after:duration-300",
                    isActive && "after:scale-x-100",
                    "hover:after:scale-x-100 hover:after:origin-left",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
            <ReturningVisitorChip />
          </nav>

          {/* Currency — presentment-currency picker. lg+ in the bar; in the
              drawer below. Converts every price live AND charges in the chosen
              currency at checkout (advertised == charged). */}
          <CurrencySelect variant="header" className="hidden lg:inline-block shrink-0" />

          {/* Account — Amazon "Account & Lists" entry. Reachable on md+; on
              small screens it lives in the drawer's links. */}
          <NavLink
            to="/account"
            aria-label="Your account"
            className={({ isActive }) =>
              cn(
                "press hidden md:inline-flex items-center justify-center min-w-[44px] min-h-[44px] transition-colors duration-300",
                isActive ? "text-ink" : "text-ink/55 hover:text-accent",
              )
            }
          >
            {avatar ? (
              <img
                src={avatar}
                alt=""
                className="w-[24px] h-[24px] sm:w-[26px] sm:h-[26px] rounded-full object-cover ring-1 ring-line"
              />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px]"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-3.4 3.6-6 8-6s8 2.6 8 6" />
              </svg>
            )}
          </NavLink>

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
                "press relative inline-flex items-center justify-center min-w-[44px] min-h-[44px] transition-colors duration-300",
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
            className="press inline-flex items-center justify-center w-11 h-11 -mr-2 text-ink/70 hover:text-ink transition-colors"
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

      {/* Menu (<xl) — a slide-in side panel (drawer) portalled to document.body
          so it layers cleanly above every page stacking context (incl. the
          film-grain at z-100). The site stays visible (dimmed) behind a
          translucent scrim, so the menu reads as a layer ON the site, not a
          separate page. Just clean links — no imagery. Focus-trapped +
          scroll-locked + route-change close (effects above), reduced-motion safe. */}
      <NavMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        menuRef={menuRef}
        reduceMotion={!!reduceMotion}
      />
    </header>
  );
};

/**
 * The <xl navigation menu — a slide-in side panel (drawer) portalled to
 * document.body so it layers above every page stacking context (incl. the
 * film-grain at z-100). Deliberately NOT a full-screen takeover: the site stays
 * visible (dimmed) behind a translucent scrim, so the menu reads as a layer ON
 * the site, not a separate page. Just clean links — no imagery. All a11y wiring
 * (focus-trap, Escape, scroll-lock, focus restore, route-change close) lives in
 * the Nav effects above and points `menuRef` at the panel.
 */
const NavMenu = ({
  open,
  onClose,
  menuRef,
  reduceMotion,
}: {
  open: boolean;
  onClose: () => void;
  menuRef: RefObject<HTMLDivElement | null>;
  reduceMotion: boolean;
}) => {
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* SCRIM — translucent, NOT opaque: the site shows through (dimmed),
              so the menu reads as a layer ON the site, not a separate page.
              Portalled + z above the film-grain (z-100) so nothing paints over
              the panel. Clicking it closes. */}
          <motion.div
            aria-hidden="true"
            onClick={onClose}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: EASE_SMOOTH }}
            className="fixed inset-0 z-[120] bg-black/60"
          />

          {/* PANEL — opaque drawer sliding in from the right. */}
          <motion.div
            ref={menuRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={reduceMotion ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: reduceMotion ? 0 : 0.42, ease: EASE_SMOOTH }}
            className="fixed top-0 right-0 z-[121] h-[100dvh] w-[min(380px,86vw)] bg-[#0a0908] text-ink border-l border-line flex flex-col"
          >
            {/* Top row — quiet label + close. */}
            <div className="flex items-center justify-between px-7 sm:px-8 py-5 border-b border-line/60">
              <span className="font-sans text-[11px] font-bold tracking-[0.04em] text-ink-muted">
                Menu
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={onClose}
                className="press inline-flex items-center justify-center w-11 h-11 -mr-2.5 text-ink/70 hover:text-ink transition-colors"
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

            {/* Primary links — clean Fraunces list; active = rust, hover = rust. */}
            <nav
              aria-label="Primary"
              className="flex-1 overflow-y-auto px-7 sm:px-8 py-7 flex flex-col gap-0.5"
            >
              {/* Search at the top of the drawer — committing a result closes it. */}
              <SearchBar variant="page" onNavigate={onClose} className="mb-4" />
              {/* Deliver-to + Currency — the header controls' drawer home on
                  small screens. */}
              <DeliverTo variant="menu" className="mb-3" />
              <CurrencySelect variant="menu" className="mb-5" />
              {NAV_GROUPS.map((group, gi) => (
                <div key={group.heading} className={gi > 0 ? "mt-5" : ""}>
                  <p className="mb-1 font-sans text-[11px] font-bold tracking-[0.04em] text-ink/45">
                    {group.heading}
                  </p>
                  {group.links.map((l, li) => (
                    <motion.div
                      key={l.to}
                      initial={reduceMotion ? false : { opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.4,
                        delay: reduceMotion ? 0 : 0.08 + gi * 0.1 + li * 0.04,
                        ease: EASE_SMOOTH,
                      }}
                    >
                      <NavLink
                        to={l.to}
                        className={({ isActive }) =>
                          cn(
                            "block py-2 font-display font-semibold tracking-[-0.015em] leading-[1.15] text-[clamp(24px,5.8vw,30px)] outline-none transition-colors duration-200",
                            isActive ? "text-accent" : "text-ink hover:text-accent",
                            "[&:focus-visible]:[outline:2px_solid_rgba(201,120,68,0.5)] [&:focus-visible]:[outline-offset:3px]",
                          )
                        }
                        style={{ fontVariationSettings: '"opsz" 32' }}
                      >
                        {l.label}
                      </NavLink>
                    </motion.div>
                  ))}
                </div>
              ))}
            </nav>

            {/* Footer — quiet secondary links + estate email. */}
            <div className="px-7 sm:px-8 pt-6 pb-safe-6 border-t border-line/60 flex flex-col gap-3">
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-sans text-[13px] text-ink-muted">
                {SECONDARY_LINKS.map((l, i) => (
                  <span key={l.to} className="inline-flex items-center gap-x-4">
                    {i > 0 && (
                      <span aria-hidden="true" className="text-ink-muted/40">
                        ·
                      </span>
                    )}
                    <Link
                      to={l.to}
                      className="inline-block py-1 transition-colors duration-200 hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </span>
                ))}
              </div>
              <a
                href="mailto:info@themandalacompany.com"
                className="inline-block font-sans text-[13px] text-ink-fade hover:text-ink transition-colors [overflow-wrap:anywhere]"
              >
                info@themandalacompany.com
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};
