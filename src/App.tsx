import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { MotionConfig } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import { Welcome } from "./pages/Welcome";
import { CustomCursor } from "./components/CustomCursor";
import { BasketToast } from "./components/BasketToast";
import { ConsentBanner } from "./components/ConsentBanner";
import { PageTransition } from "./components/PageTransition";
import { SiteEntrance } from "./components/SiteEntrance";
import { applyDefaultHead, didSeoWrite } from "./lib/headMeta";
import { captureUtm } from "./lib/utm";
import { initTrackingIfConsented } from "./lib/tracking";
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
const Verify = lazy(() => import("./pages/Verify").then((m) => ({ default: m.Verify })));

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
          <Route path="/for-you" element={<FindAPrint />} />
          {/* Old /quiz URL preserved so existing links never 404. */}
          <Route path="/quiz" element={<Navigate to="/for-you" replace />} />
          <Route path="/about" element={<About />} />
          <Route path="/memories" element={<Memories />} />
          <Route path="/news" element={<News />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/gift" element={<Gift />} />
          <Route path="/trade" element={<Trade />} />
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
          <AnimatedRoutes />
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
          {/* Privacy-friendly, cookieless Vercel Web Analytics. No-ops until
              Hugo enables Web Analytics in the Vercel dashboard. */}
          <Analytics />
      </BrowserRouter>
    </MotionConfig>
  );
}

