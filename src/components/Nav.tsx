import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { SearchBar } from "./SearchBar";
import { DeliverTo } from "./DeliverTo";
import { CurrencySelect } from "./CurrencySelect";
import { ReturningVisitorChip } from "./ReturningVisitorChip";
import { cn } from "../lib/cn";
import { useBasketTotalQuantity } from "../lib/basket";
import { useMenuOpen, setMenuOpen, DRAWER_WIDTH } from "../lib/menuStore";

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
      { to: "/for-you", label: "Find a print" },
      { to: "/gift", label: "Gift cards" },
      { to: "/trade", label: "Trade & Interiors" },
    ],
  },
  {
    heading: "His story",
    links: [
      { to: "/about", label: "About Stephen" },
      { to: "/news", label: "News" },
    ],
  },
  {
    heading: "Connect",
    links: [
      { to: "/memories", label: "Memories" },
      { to: "/links", label: "Links & socials" },
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

/** Quiet drawer-footer set — account/orders + FAQ + legal. Gift cards moved UP
 *  into the Shop group (Hugo: it belongs in the shop menu). Basket has its own
 *  top-bar icon so it's intentionally absent. */
const SECONDARY_LINKS = [
  { to: "/basket", label: "Basket & account" },
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
  // Total physical items — sum of print quantities + gift lines — so the badge
  // reflects quantity, not just distinct lines.
  const basketCount = useBasketTotalQuantity();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  // Menu open/closed lives in a tiny module-level store (lib/menuStore) — NOT a
  // local useState — so App.tsx can read the SAME boolean and slide the routed
  // page LEFT to reveal the drawer (the push-content effect). `setMenuOpen` is
  // the store's imperative writer; it accepts a boolean OR an updater, so every
  // existing call site (toggle + the effect closes) is a drop-in.
  const menuOpen = useMenuOpen();
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
    // Always reveal above this — the top zone (hero / intro film) shows the bar.
    const SHOW_ABOVE = 90;
    // Direction deadband so micro-jitter / trackpad inertia never flickers it.
    const DELTA = 6;
    let raf = 0;
    lastYRef.current = Math.max(0, window.scrollY);
    const evaluate = () => {
      // Clamp: iOS rubber-band overscroll can report NEGATIVE scrollY at the
      // top (and jitter around 0). A negative base would need a large fake
      // "scroll down" before the deadband maths behaved again — clamp so the
      // top zone + deltas are always computed from real document positions.
      const y = Math.max(0, window.scrollY);
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
      } else if (delta < -2) {
        // Scrolling UP → slide back in. Deliberately EAGER (−2px, not −DELTA):
        // Hugo wants the top bar to reappear on ANY scroll-up on every page,
        // including the small, momentum-y scroll-ups mobile produces.
        setHidden(false);
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

  // Close the menu whenever the route changes. (setMenuOpen here is the
  // module-store writer, not a useState dispatcher, so no set-state-in-effect
  // disable is needed.)
  useEffect(() => {
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

  const header = (
    <header
      className={cn(
        overlay ? "fixed inset-x-0 top-0" : "sticky top-0",
        "z-50 px-4 sm:px-6 md:px-8 lg:px-12 text-ink",
        // Slide-away on scroll-down / slide-in on scroll-up. Transform + opacity
        // are GPU-composited, so the hide/reveal costs nothing on the main
        // thread. Slightly slower reveal than hide reads as deliberate, premium.
        "transition-[transform,opacity,padding] duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] will-change-transform",
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
          ? "py-3 nav-bg-scrolled border-b border-ink/25 shadow-[0_14px_40px_-20px_rgba(0,0,0,0.95)]"
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
          className="press inline-flex items-center min-w-0"
        >
          {/* The "The Art of Stephen Meakin" LOCKUP — wax-seal rose + Fraunces
              wordmark (Hugo 2026-07-22: "replace [the nav seal] with the longer
              one that was underneath the SEM Experience — I want it on the top
              [nav] + footer, not underneath the masthead"). This is the same
              rose+text lockup that used to sit under "THE SEM EXPERIENCE". */}
          <span className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <img
              src={`${import.meta.env.BASE_URL}logo/logo-seal-v9-w256.png`}
              alt=""
              aria-hidden="true"
              width={40}
              height={40}
              className="h-[32px] w-[32px] sm:h-[38px] sm:w-[38px] shrink-0 object-contain"
              style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.6))" }}
            />
            <span
              className="font-display font-bold text-ink tracking-[-0.015em] leading-none whitespace-nowrap text-[clamp(15px,1.35vw,22px)] [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]"
              style={{ fontVariationSettings: '"opsz" 32, "wght" 700' }}
            >
              The Art of Stephen Meakin
            </span>
          </span>
        </Link>

        {/* Deliver-to — Amazon-pattern location control sitting left of the
            search. Free delivery, so it's an informational preference
            only (never touches pricing). lg+ in the bar; in the drawer below. */}
        <DeliverTo variant="header" className="hidden 3xl:flex shrink-0" />

        {/* Desktop search — a compact header field filling the middle of the bar
            (Hugo: "add a search bar on the top bar" for full-screen desktop). The
            container is the flex-1 spacer that keeps the logo left + icons hard
            right at every width; the field itself only appears from lg up, so the
            phone/tablet bar stays uncluttered (search still lives in the drawer). */}
        {/* Desktop search — a LONG bar, shown only from 2xl where the row has
            genuine room for it beside the wordmark; below that it lives in the
            drawer. NEVER collapses to a circular "dot" and NEVER overlaps the
            logo (Hugo): the flex-1 spacer stays min-w-0 so when the bar is hidden
            the space fully collapses, and when shown it only appears at a width
            that fits a min-[320px] long field without crowding the logo. */}
        <div className="flex-1 min-w-0 flex justify-center px-3 lg:px-6">
          <SearchBar variant="header" className="hidden lg:block w-full min-w-[180px] max-w-[340px]" />
        </div>

        <div className="flex shrink-0 items-center gap-4 sm:gap-7 lg:gap-9">
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
                    "relative py-2 font-sans text-[15px] font-semibold tracking-[0.03em] transition-colors duration-300",
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

          {/* Basket — links straight to the full basket + account page (the
              "two-in-one"). Adds are confirmed by the centered AddedConfirmation
              modal, so there is no competing slide-in drawer. */}
          <NavLink
            to="/basket"
            aria-label={
              basketCount > 0
                ? `Basket, ${basketCount} item${basketCount === 1 ? "" : "s"}`
                : "Basket, empty"
            }
            className="press relative inline-flex items-center justify-center min-w-[44px] min-h-[44px] transition-colors duration-300 text-ink/55 hover:text-accent"
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
                className="absolute -top-1.5 -right-2 min-w-[19px] h-[19px] px-[6px] inline-flex items-center justify-center rounded-full bg-accent text-bg font-sans text-[11px] font-bold leading-none"
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

  // OVERLAY mode (`fixed` bar — Welcome / Search) is PORTALLED to document.body.
  // WHY (the mobile "bar never comes back down" bug): App's PageShell carries a
  // permanent `transform: translateX(0)` + `will-change-transform` for the
  // push-drawer, and ANY non-none transform/will-change makes that shell the
  // CONTAINING BLOCK for `position: fixed` descendants — so this "fixed" bar
  // was really positioned like `absolute` at the top of the document: it
  // scrolled away with the page and the slide-in-on-scroll-up transform toggled
  // invisibly off-screen (and the hamburger became unreachable mid-page).
  // Portalling to body restores true viewport-fixed behaviour. The drawer +
  // its scrim already portal to body and layer above (z-120/121 vs z-50), and
  // overlay mode never reserved layout space, so nothing else shifts. STICKY
  // mode stays in-flow (it reserves layout space on every content page, and
  // `sticky` is NOT affected by transformed ancestors — only by
  // overflow-hidden ancestors, fixed at the page-root level).
  return overlay ? createPortal(header, document.body) : header;
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
          {/* BACKDROP — a dim layer OVER the shifted page (the whole site has
              slid LEFT by the panel width). Portalled to body so it never
              itself shifts; z above the film-grain (z-100) but BELOW the panel
              (z-121). Clicking it — i.e. anywhere on the pushed-aside page —
              closes the menu, which is the conventional drawer affordance. */}
          <motion.div
            aria-hidden="true"
            onClick={onClose}
            initial={reduceMotion ? false : { opacity: 0, pointerEvents: "none" }}
            animate={{ opacity: 1, pointerEvents: "auto" }}
            // pointerEvents SNAPS to none the instant the close begins (framer
            // applies non-tweenable props immediately). CRITICAL: if the exit
            // fade ever fails to finish + unmount (observed: a route-change via a
            // menu link, and headless/background tabs where rAF is throttled),
            // the scrim could linger as an INVISIBLE full-page click-trap that
            // killed every link on every page. Snapping pointer-events off on
            // exit makes a lingering scrim harmless. (Hugo: "most links on the
            // entire site don't work".)
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: EASE_SMOOTH }}
            className="fixed inset-0 z-[120] bg-black/55"
          />

          {/* PANEL — a STATIC right-side drawer (fixed right-0, inset-y-0). It
              does NOT slide; the routed PAGE slides left (App's shell) to reveal
              it, so the panel just fades in here. Width is the shared
              DRAWER_WIDTH so App can slide the page by exactly this much. */}
          <motion.div
            ref={menuRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={reduceMotion ? false : { opacity: 0, pointerEvents: "none" }}
            animate={{ opacity: 1, pointerEvents: "auto" }}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={{ duration: reduceMotion ? 0 : 0.32, ease: EASE_SMOOTH }}
            style={{
              width: DRAWER_WIDTH,
              // Heal the red-bar → drawer seam: the nav is ALWAYS the seal-red
              // wash, so when the menu opens it sat flush above a near-black
              // panel = a hard red-to-black cut along the drawer's top edge on
              // every page. The panel now carries the SAME seal-red at its very
              // top, fading into the near-black ground by ~300px — one
              // continuous wash from bar into drawer.
              backgroundImage:
                "linear-gradient(180deg, rgba(64,13,13,0.97) 0%, rgba(40,8,9,0.985) 120px, #0a0908 300px)",
            }}
            className="fixed inset-y-0 right-0 z-[121] h-[100dvh] bg-[#0a0908] text-ink border-l border-line flex flex-col"
          >
            {/* Top row — quiet label + close. */}
            <div className="flex items-center justify-between px-7 sm:px-8 py-5 border-b border-ink/60">
              <span
                className="font-display font-bold text-[clamp(21px,3.6vw,27px)] tracking-[-0.015em] text-ink leading-none"
                style={{ fontVariationSettings: '"opsz" 40, "wght" 700' }}
              >
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
              {/* Home — a standalone primary link at the top of the drawer (Hugo:
                  "add the home page to the menu"); `end` so it's only active on
                  exactly "/". Same big-Fraunces treatment as the grouped links. */}
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  cn(
                    "block py-2 mb-4 font-display font-bold tracking-[-0.03em] leading-[1.02] text-[clamp(30px,7.4vw,42px)] outline-none transition-colors duration-200",
                    isActive ? "text-accent" : "text-ink hover:text-accent",
                    "[&:focus-visible]:[outline:2px_solid_rgba(201,120,68,0.5)] [&:focus-visible]:[outline-offset:3px]",
                  )
                }
                style={{ fontVariationSettings: '"opsz" 40, "wght" 700' }}
              >
                Home
              </NavLink>
              {NAV_GROUPS.map((group, gi) => (
                <div key={group.heading} className={gi > 0 ? "mt-6" : ""}>
                  <p className="mb-2 font-display italic font-normal text-[clamp(15px,1.5vw,18px)] tracking-[0.005em] text-ink-muted">
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
                            "block py-2 font-display font-bold tracking-[-0.03em] leading-[1.02] text-[clamp(30px,7.4vw,42px)] outline-none transition-colors duration-200",
                            isActive ? "text-accent" : "text-ink hover:text-accent",
                            "[&:focus-visible]:[outline:2px_solid_rgba(201,120,68,0.5)] [&:focus-visible]:[outline-offset:3px]",
                          )
                        }
                        style={{ fontVariationSettings: '"opsz" 40, "wght" 700' }}
                      >
                        {l.label}
                      </NavLink>
                    </motion.div>
                  ))}
                </div>
              ))}
            </nav>

            {/* Footer — quiet secondary links + estate email. */}
            <div className="px-7 sm:px-8 pt-6 pb-safe-6 border-t border-ink/60 flex flex-col gap-3">
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-sans text-[13px] text-ink-muted">
                {SECONDARY_LINKS.map((l, i) => (
                  <span key={l.to} className="inline-flex items-center gap-x-4">
                    {i > 0 && (
                      <span aria-hidden="true" className="text-ink/40">
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
