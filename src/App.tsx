import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
  type TransitionEvent,
} from "react";
import { MotionConfig } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import { Welcome } from "./pages/Welcome";
import { CustomCursor } from "./components/CustomCursor";
import { BasketToast } from "./components/BasketToast";
import { ConsentBanner } from "./components/ConsentBanner";
import { UpdatePrompt } from "./components/UpdatePrompt";
import { PageTransition } from "./components/PageTransition";
import { SiteEntrance } from "./components/SiteEntrance";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { applyDefaultHead, didSeoWrite } from "./lib/headMeta";
import { captureUtm } from "./lib/utm";
import { initTrackingIfConsented } from "./lib/tracking";
import { CurrencyProvider } from "./components/CurrencyProvider";
import { useMenuOpen } from "./lib/menuStore";
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
const Search = lazy(() => import("./pages/Search").then((m) => ({ default: m.Search })));
const Account = lazy(() => import("./pages/Account").then((m) => ({ default: m.Account })));
const Orders = lazy(() => import("./pages/Orders").then((m) => ({ default: m.Orders })));
const Gallery = lazy(() => import("./pages/Gallery").then((m) => ({ default: m.Gallery })));

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

const LoadingFallback = () => (
  <div
    className="min-h-screen bg-bg flex items-center justify-center"
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
          {/* Virtual Gallery / Exhibition — cinematic online viewing room + AR. */}
          <Route path="/gallery" element={<Gallery />} />
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
 * PUSH-CONTENT SHELL — wraps the routed page so that, when the nav drawer opens
 * (useMenuOpen, the shared lib/menuStore boolean), the WHOLE page slides LEFT by
 * the drawer's width to reveal the body-portaled panel sitting at the right edge
 * (Hugo's ask: "the whole page slides left and readjusts"). On close it slides
 * back. The slide is a GPU-composited `translateX` on the smooth house curve.
 *
 * ⚠️ Deliberate, documented consequence: a `transform` on this shell re-bases
 * every `position:fixed` / `sticky` descendant to the shell's box, so the fixed
 * Nav + any sticky add-to-basket bars shift LEFT WITH the page — which IS the
 * push effect we want (they travel with the page, the menu button stays on
 * screen + clickable). The drawer, scrim, film-grain, custom cursor, toasts,
 * consent banner + modals are ALL portaled/mounted to document.body OUTSIDE this
 * shell, so they stay anchored to the viewport and never get dragged sideways.
 *
 * `will-change-transform` keeps it on its own layer; the transform is removed
 * (translate-x-0) when closed so it never permanently re-bases fixed children.
 */
const PageShell = ({ children }: { children: ReactNode }) => {
  const menuOpen = useMenuOpen();

  // `slid` mirrors `menuOpen` but LAGS it on close so the page can animate back
  // to translateX(0) BEFORE we drop the transform to `none`.
  //
  // ⚠️ Why this dance: ANY transform value — including translateX(0) — AND a
  // standing `will-change: transform` each establish a containing block for
  // `position:fixed` descendants, which would permanently re-base every page's
  // fixed peacock/scene backdrop onto this shell and break it sitewide (the
  // hard invariant PageTransition documents). So when fully idle we emit
  // `transform: none` + NO will-change, leaving the closed page byte-identical
  // to before this drawer existed. The re-basing (and the push effect it
  // creates for the fixed Nav + sticky bars) is intentional ONLY while open.
  //
  // Open  → set transform immediately (re-base + slide in).
  // Close → keep translateX(0) for the transition, then a transitionend (with a
  //         belt-and-braces timeout) flips us back to `transform: none`.
  const [slid, setSlid] = useState(false);
  useEffect(() => {
    if (menuOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlid(true);
      return;
    }
    // Closing: animate to translateX(0) now; the transitionend handler clears
    // `slid` → `transform: none`. Fallback timeout covers reduced-motion /
    // interrupted transitions where transitionend may not fire.
    const t = window.setTimeout(() => setSlid(false), 520);
    return () => window.clearTimeout(t);
  }, [menuOpen]);

  const transformed = menuOpen || slid;

  const onTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    // Only react to OUR transform transition ending while closed.
    if (e.propertyName === "transform" && !menuOpen) setSlid(false);
  };

  return (
    <div
      onTransitionEnd={onTransitionEnd}
      style={{
        // When the drawer opens we DON'T translate the page off-screen (that
        // shoved the left edge — up to 86vw on phones — past the viewport, which
        // is the "menu cuts half the text off" Hugo reported). Instead the whole
        // page SHRINKS to 90% and hugs the left, so it visibly "readjusts" to
        // make room for the right-edge drawer while every pixel stays on-screen.
        // translateX(-5vw) cancels the centre-origin scale's left margin so the
        // page's left edge lands exactly at 0 — nothing is ever clipped.
        transform: menuOpen
          ? "translateX(-5vw) scale(0.9)"
          : slid
            ? "translateX(0) scale(1)"
            : "none",
        transformOrigin: "center center",
        borderRadius: transformed ? 14 : undefined,
        overflow: transformed ? "hidden" : undefined,
        willChange: transformed ? "transform" : "auto",
      }}
      className="min-h-[100dvh] transition-transform duration-[420ms] ease-smooth motion-reduce:transition-none"
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

  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter basename={basename}>
        <CurrencyProvider>
        <RouteHeadDefaults />
          {/* Sitewide film-grain texture — sits above content at z-100,
              opacity tuned low so it textures without obscuring. */}
          <div aria-hidden="true" className="film-grain" />
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
            {/* PageShell slides the routed page LEFT when the nav drawer opens
                (the push-content effect). Everything OUTSIDE it below (grain,
                cursor, entrance, toasts, consent, update, analytics) stays
                anchored to the viewport. */}
            <PageShell>
              <AnimatedRoutes />
            </PageShell>
          </ErrorBoundary>
          {/* Global "Added to basket" confirmation toast. Listens to the
              basket store's add side-channel, so every add path triggers it
              with no per-button wiring. Mounted once; sits at z-[120], below
              modals (z-200) + cursor (z-250). */}
          <BasketToast />
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
          {/* Privacy-friendly, cookieless Vercel Web Analytics. No-ops until
              Hugo enables Web Analytics in the Vercel dashboard. */}
          <Analytics />
        </CurrencyProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}

