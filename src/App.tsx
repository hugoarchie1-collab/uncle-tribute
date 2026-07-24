import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MotionConfig } from "framer-motion";
import { useMenuOpen, getDrawerWidthPx } from "./lib/menuStore";
import { Analytics } from "@vercel/analytics/react";
import { Welcome } from "./pages/Welcome";
import { CustomCursor } from "./components/CustomCursor";
import { AddedConfirmation } from "./components/AddedConfirmation";
import { ConsentBanner } from "./components/ConsentBanner";
import { UpdatePrompt } from "./components/UpdatePrompt";
import { BackgroundMusic } from "./components/BackgroundMusic";
import { PageTransition } from "./components/PageTransition";
import { SiteEntrance } from "./components/SiteEntrance";
import { AmbientBackdrop } from "./components/AmbientBackdrop";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { applyDefaultHead, didSeoWrite } from "./lib/headMeta";
import { captureUtm } from "./lib/utm";
import { initTrackingIfConsented } from "./lib/tracking";
import { CurrencyProvider } from "./components/CurrencyProvider";
import "./styles/global.css";

// Welcome (the landing page) loads eagerly so the cinematic intro paints
// immediately. Every other route is code-split and fetched on demand, so a
// first-time visitor downloads only the home page's JS up front.
const Collections = lazy(() => import("./pages/Collections").then((m) => ({ default: m.Collections })));
const PaintingDetail = lazy(() => import("./pages/PaintingDetail").then((m) => ({ default: m.PaintingDetail })));
const About = lazy(() => import("./pages/About").then((m) => ({ default: m.About })));
const Memories = lazy(() => import("./pages/Memories").then((m) => ({ default: m.Memories })));
const Basket = lazy(() => import("./pages/Basket").then((m) => ({ default: m.Basket })));
const OrderSuccess = lazy(() => import("./pages/OrderResult").then((m) => ({ default: m.OrderSuccess })));
const OrderCancel = lazy(() => import("./pages/OrderResult").then((m) => ({ default: m.OrderCancel })));
const NotFound = lazy(() => import("./pages/NotFound").then((m) => ({ default: m.NotFound })));
const Privacy = lazy(() => import("./pages/Legal").then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import("./pages/Legal").then((m) => ({ default: m.Terms })));
const Returns = lazy(() => import("./pages/Legal").then((m) => ({ default: m.Returns })));
const Contact = lazy(() => import("./pages/Contact").then((m) => ({ default: m.Contact })));
const FAQ = lazy(() => import("./pages/FAQ").then((m) => ({ default: m.FAQ })));
const FindAPrint = lazy(() => import("./pages/FindAPrint").then((m) => ({ default: m.FindAPrint })));
const News = lazy(() => import("./pages/News").then((m) => ({ default: m.News })));
const Trade = lazy(() => import("./pages/Trade").then((m) => ({ default: m.Trade })));
const Gift = lazy(() => import("./pages/Gift").then((m) => ({ default: m.Gift })));
const Auth = lazy(() => import("./pages/Auth").then((m) => ({ default: m.Auth })));
const Links = lazy(() => import("./pages/Links").then((m) => ({ default: m.Links })));
const Search = lazy(() => import("./pages/Search").then((m) => ({ default: m.Search })));
const Account = lazy(() => import("./pages/Account").then((m) => ({ default: m.Account })));
const Orders = lazy(() => import("./pages/Orders").then((m) => ({ default: m.Orders })));
// Print-only catalogue (not in nav) — rendered to PDF via headless Chrome.
const PrintCatalogue = lazy(() => import("./pages/PrintCatalogue").then((m) => ({ default: m.PrintCatalogue })));

const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

/**
 * Per-route head defaults (canonical + description/og/twitter resets) for
 * routes whose page does NOT mount its own <Seo> (Welcome, Basket, Legal,
 * OrderResult, NotFound…). Direct DOM upserts via lib/headMeta — the static
 * index.html tags are MUTATED in place, so the document always carries
 * exactly one of each tag (react-helmet-async was removed 2026-06-10: its
 * rAF-deferred commits were flaky-to-dead on React 19 and every URL was
 * presenting the homepage meta to crawlers).
 *
 * WRITE-ORDER CONTRACT (headMeta.ts): layout effects run CHILD-FIRST, so on
 * a direct load a page's <Seo> has already written (and flagged) its
 * specific meta by the time this parent effect runs — didSeoWrite() makes us
 * skip instead of clobbering it. On SPA navigations this fires on the
 * location-change commit (defaults), then the incoming page's <Seo>
 * overwrites with specifics when it mounts after the exit transition.
 * Titles are deliberately NOT touched here — pages own their title via
 * <Seo> or usePageTitle; pages with neither keep the static default.
 */
const RouteHeadDefaults = () => {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    if (didSeoWrite(pathname)) return;
    applyDefaultHead(pathname);
  }, [pathname]);
  return null;
};

// Transparent fallback (NOT bg-bg): a lazy chunk loading mid-navigation must
// never paint an opaque black screen OVER the persistent AmbientBackdrop — that
// opaque cover was the residual "glitches out every time you click a new page"
// flash the 2026-07-07 ambient layer couldn't fix on its own (the ambient sits
// BEHIND this fallback, so an opaque fallback hid it on every uncached nav).
// Transparent → the dissolve reads scene → soft atmosphere → scene, never
// scene → black → scene, on first visits too.
const LoadingFallback = () => (
  <div
    className="min-h-screen flex items-center justify-center"
    role="status"
    aria-label="Loading"
  >
    <span className="h-6 w-6 rounded-full border-2 border-ink/20 border-t-accent animate-spin" />
  </div>
);

/**
 * Routes wrapped in PageTransition — a dignified route crossfade (outgoing
 * fades out 160ms, incoming fades in 300ms on the house curve), with the
 * scroll reset relocated INTO the incoming page's pre-paint mount so there is
 * never a flash of the old scroll position. OPACITY ONLY on the animated
 * wrapper — never a transform: a transformed ancestor re-bases every page's
 * position:fixed backdrop and would break it (see PageTransition.tsx for the
 * full invariant list). POP + prefers-reduced-motion swap instantly.
 *
 * `<Routes location={location}>` (the explicit prop, not context) is what
 * lets AnimatePresence hold the OUTGOING page on its old location while it
 * fades — don't remove it.
 */
const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <PageTransition>
      <Suspense fallback={<LoadingFallback />}>
        {/* Declared in the canonical nav order so this list reads the same as
            the Nav / Footer / sitemap: primary pages first (Home · Collections
            · For You · About · Memories · News · Contact), then the secondary /
            utility pages (FAQ · Verify · Gift · Trade), then transactional, then
            legal (Privacy · Terms · Returns), then the catch-all. Route order is
            not functional in React Router 7 — paths are matched exactly — so
            this is purely for legibility, but it keeps every surface in step. */}
        <Routes location={location}>
          <Route path="/" element={<Welcome />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:id" element={<PaintingDetail />} />
          <Route path="/print-catalogue" element={<PrintCatalogue />} />
          {/* Old /gallery (Virtual Exhibition) retired — AR now lives in the
              "See on your wall" modal on each painting. Redirect legacy links. */}
          <Route path="/gallery" element={<Navigate to="/collections" replace />} />
          <Route path="/for-you" element={<FindAPrint />} />
          {/* Site-wide search — header SearchBar + this results page. */}
          <Route path="/search" element={<Search />} />
          {/* Old /quiz URL preserved so existing links never 404. */}
          <Route path="/quiz" element={<Navigate to="/for-you" replace />} />
          <Route path="/about" element={<About />} />
          <Route path="/memories" element={<Memories />} />
          <Route path="/news" element={<News />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/:certId" element={<Auth />} />
          <Route path="/links" element={<Links />} />
          {/* /verify kept as a permanent redirect to the renamed Authentication
              page so old links + printed certificates keep resolving. */}
          <Route path="/verify" element={<Navigate to="/auth" replace />} />
          <Route path="/gift" element={<Gift />} />
          <Route path="/trade" element={<Trade />} />
          {/* Account (passwordless) + Orders & Returns — Amazon-IA header. */}
          <Route path="/account" element={<Account />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/basket" element={<Basket />} />
          <Route path="/order/success" element={<OrderSuccess />} />
          <Route path="/order/cancel" element={<OrderCancel />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </PageTransition>
  );
};

/**
 * PAGE SHELL — wraps the routed page and SLIDES IT LEFT by the drawer's width
 * when the nav menu opens (the "push-content" effect Hugo asked for: the page
 * visibly readjusts to make room for the panel instead of being covered).
 *
 * Why this is now artefact-free (the earlier abandonment was a different impl):
 *  - The slide is a pure HORIZONTAL `translateX` — it never moves content
 *    vertically, so it cannot leave a "black gap above the content" at any
 *    scroll position (that bug came from translateY/scale attempts).
 *  - The translate is applied to THIS shell, which wraps EVERYTHING the page
 *    paints — including each page's `position:fixed` scene backdrop. Because a
 *    non-`none` transform makes this element the containing block for its fixed
 *    descendants, the backdrops slide WITH the page as one rigid unit, so there
 *    is no seam between a moved foreground and a stationary background.
 *  - We translate by a concrete PX value (`getDrawerWidthPx()`), the exact
 *    pixel width of the body-portaled drawer (both derive from the same
 *    constants in menuStore), so the page slides EXACTLY as far as the panel is
 *    wide — flush, no over/under-shoot. (A CSS `min(420px,86vw)` inside a
 *    `calc()` translate was observed to resolve to 0 — see menuStore.)
 *  - `body`/`html` are `overflow-x: clip`, so the slice that slides off the
 *    left is clipped, never a horizontal scrollbar.
 *
 * The off-canvas left edge is hidden by clip; the revealed right edge is filled
 * by the drawer panel. Reduced-motion users get the same end-state with no
 * transition.
 */
const PageShell = ({ children }: { children: ReactNode }) => {
  const menuOpen = useMenuOpen();
  // The drawer's exact pixel width for the CURRENT viewport — re-measured on
  // resize so a rotate / window-drag while the menu is open keeps the slide
  // flush with the panel.
  const [drawerPx, setDrawerPx] = useState(() => getDrawerWidthPx());
  useEffect(() => {
    const onResize = () => setDrawerPx(getDrawerWidthPx());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ⚠️ The shell must carry a transform ONLY while the drawer is open or the
  // close slide is still animating. A permanent `translateX(0)` (+ will-change)
  // makes this element the containing block for EVERY `position:fixed`
  // descendant — each page's fixed scene backdrop re-bases to the document top
  // and scrolls away (backdrop-goes-black), and the fixed overlay nav stops
  // being viewport-pinned. With `transform: none` at rest, fixed children work
  // normally 100% of browsing; during the slide they ride with the shell (the
  // drawer's dim scrim covers the brief re-base on scrolled pages).
  const [closing, setClosing] = useState(false);
  const prevOpenRef = useRef(menuOpen);
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = menuOpen;
    if (wasOpen && !menuOpen) {
      setClosing(true);
      // Fallback for interrupted transitions + reduced-motion (no transitionend
      // fires when motion-safe strips the transition): never stay transformed.
      const t = window.setTimeout(() => setClosing(false), 640);
      return () => window.clearTimeout(t);
    }
  }, [menuOpen]);
  const slides = menuOpen || closing;

  return (
    <div
      className={
        "min-h-[100dvh] motion-safe:transition-transform motion-safe:duration-[520ms]" +
        (slides ? " will-change-transform" : "")
      }
      style={{
        transform: slides
          ? menuOpen
            ? `translateX(-${drawerPx}px)`
            : "translateX(0)"
          : undefined,
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && e.propertyName === "transform" && !menuOpen) {
          setClosing(false);
        }
      }}
    >
      {children}
    </div>
  );
};

export default function App() {
  // One-time, render-free side effects:
  //  - captureUtm: persist first-touch campaign attribution (?utm_* / gclid /
  //    fbclid) to localStorage `tasm.utm.v1` — rides along on checkout bodies.
  //  - initTrackingIfConsented: a returning visitor with a STORED analytics
  //    accept gets GA4 + Meta Pixel initialised on load; everyone else gets
  //    nothing (the consent banner handles first-time accepts live).
  useEffect(() => {
    captureUtm();
    initTrackingIfConsented();
  }, []);

  // Capture mode (?bare): hide only the nav / cookie banner / cursor / grain so
  // a live page can be screenshotted clean for the print catalogue clone. Keeps
  // the fixed peacock backdrop + hero video intact (unlike printing-catalogue).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("bare")) {
      document.body.classList.add("cap-bare");
      const y = params.get("y");
      if (y) window.setTimeout(() => window.scrollTo(0, parseInt(y, 10) || 0), 500);
    }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter basename={basename}>
        <CurrencyProvider>
        <RouteHeadDefaults />
          {/* PERSISTENT atmospheric ground (2026-07-07, Hugo: "background
              glitches when you click a page" + "reveal it clearer like home").
              Every page's OWN backdrop sits INSIDE the route crossfade, so
              during a navigation both fade and the bare #0a0908 canvas flashed
              through — the "glitch". This one peacock layer lives OUTSIDE the
              transition, so the dissolve reads scene → soft atmosphere → scene
              instead of scene → black → scene. A page's own opaque backdrop
              covers it in normal viewing; it only shows in the transition gap
              (and behind any page that lacks its own). */}
          <AmbientBackdrop opacity={0.9} />
          {/* Premium custom cursor — fine-pointer + motion-allowed only;
              renders nothing (native cursor) on touch / reduced-motion. */}
          <CustomCursor />
          {/* Branded entrance — first visit per session only: a #0a0908 veil
              with the rose emblem breathing in, parting upward within 900ms.
              pointer-events:none for its whole life, unmounts completely.
              z-[180]: above grain/consent/toasts, below modals (z-200) and
              the cursor (z-250). Skipped on prefers-reduced-motion. */}
          <SiteEntrance />
          {/* Any uncaught render error below would otherwise unmount the whole
              root → a blank, frozen page. The boundary converts that into a
              dignified, recoverable fallback so the site can never silently die. */}
          <ErrorBoundary>
            {/* PageShell implements the PUSH drawer Hugo asked for: it slides
                the routed page left while the body-portaled drawer opens. At
                REST it is transform-free (see the PageShell comment) so the
                pages' position:fixed scene backdrops + the fixed overlay nav
                stay genuinely viewport-pinned; the transform exists only for
                the duration of the slide. Everything OUTSIDE it below (grain,
                cursor, entrance, toasts, consent, update, analytics) stays
                anchored to the viewport. */}
            <PageShell>
              <AnimatedRoutes />
            </PageShell>
          </ErrorBoundary>
          {/* Global centered "Added to basket ✓" confirmation. Listens to the
              basket store's add side-channel, so every add path triggers it
              with no per-button wiring. Mounted once. */}
          <AddedConfirmation />
          {/* Consent banner — quiet bottom bar, renders only while no
              decision exists in tasm.consent.v1. GA4 + Meta Pixel load ONLY
              after "Allow analytics"; the footer's "Cookie preferences" link
              clears the decision and re-opens it live. z-[110], below the
              toasts (z-[120]) + modals (z-200). */}
          <ConsentBanner />
          {/* Self-update prompt — when a NEWER build is deployed while this app
              is open (or stuck in a phone's cache), a quiet, dismissible
              "newer version ready — Refresh" bar appears on tab-focus. Never
              force-reloads, so it can't interrupt checkout. Permanent fix for a
              stale cached build hiding a fresh deploy. z-[115], between the
              consent bar (z-110) and toasts (z-120). */}
          <UpdatePrompt />
          {/* Looping ambient score (Hugo). Audible autoplay is blocked by every
              browser until the first user gesture, so it starts on first
              interaction, then loops; a bottom-left speaker toggle mutes it and
              the choice persists. Mounted once so it survives route changes. */}
          <BackgroundMusic />
          {/* Privacy-friendly, cookieless Vercel Web Analytics. No-ops until
              Hugo enables Web Analytics in the Vercel dashboard. */}
          <Analytics />
        </CurrencyProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}

