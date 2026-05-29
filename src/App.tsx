import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Analytics } from "@vercel/analytics/react";
import { Welcome } from "./pages/Welcome";
import "./styles/global.css";

// Welcome (the landing page) loads eagerly so the cinematic intro paints
// immediately. Every other route is code-split and fetched on demand, so a
// first-time visitor downloads only the home page's JS up front.
const Collections = lazy(() => import("./pages/Collections").then((m) => ({ default: m.Collections })));
const PaintingDetail = lazy(() => import("./pages/PaintingDetail").then((m) => ({ default: m.PaintingDetail })));
const About = lazy(() => import("./pages/About").then((m) => ({ default: m.About })));
const Basket = lazy(() => import("./pages/Basket").then((m) => ({ default: m.Basket })));
const OrderSuccess = lazy(() => import("./pages/OrderResult").then((m) => ({ default: m.OrderSuccess })));
const OrderCancel = lazy(() => import("./pages/OrderResult").then((m) => ({ default: m.OrderCancel })));
const NotFound = lazy(() => import("./pages/NotFound").then((m) => ({ default: m.NotFound })));
const Privacy = lazy(() => import("./pages/Legal").then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import("./pages/Legal").then((m) => ({ default: m.Terms })));
const Returns = lazy(() => import("./pages/Legal").then((m) => ({ default: m.Returns })));
const Contact = lazy(() => import("./pages/Contact").then((m) => ({ default: m.Contact })));
const FAQ = lazy(() => import("./pages/FAQ").then((m) => ({ default: m.FAQ })));

const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

/**
 * Scroll behaviour on route change:
 *  - POP (browser back/forward): let the browser restore its scroll position
 *  - PUSH / REPLACE with hash: poll for the target element (page may still be
 *    mounting + fixed backdrop layer settling), then scroll it into view
 *  - PUSH / REPLACE without hash: scroll to top
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType === "POP") return;

    if (hash) {
      const id = hash.replace(/^#/, "");
      let attempts = 0;
      const maxAttempts = 30; // 30 × 100ms = 3s max
      let cancelled = false;

      const tryScroll = () => {
        if (cancelled) return;
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (attempts < maxAttempts) {
          attempts += 1;
          window.setTimeout(tryScroll, 100);
        }
      };

      // First attempt after a short delay so the new page has a chance to mount
      const t = window.setTimeout(tryScroll, 80);
      return () => {
        cancelled = true;
        window.clearTimeout(t);
      };
    }

    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash, navType]);

  return null;
};

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter basename={basename}>
        <ScrollToTop />
        {/* Sitewide film-grain texture — sits above content at z-100,
            opacity tuned low so it textures without obscuring. */}
        <div aria-hidden="true" className="film-grain" />
        <Suspense
          fallback={
            <div
              className="min-h-screen bg-bg flex items-center justify-center"
              role="status"
              aria-label="Loading"
            >
              <span className="h-6 w-6 rounded-full border-2 border-ink/20 border-t-accent animate-spin" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/collections/:id" element={<PaintingDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/basket" element={<Basket />} />
            <Route path="/order/success" element={<OrderSuccess />} />
            <Route path="/order/cancel" element={<OrderCancel />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        {/* Privacy-friendly, cookieless Vercel Web Analytics. No-ops until
            Hugo enables Web Analytics in the Vercel dashboard. */}
        <Analytics />
      </BrowserRouter>
    </HelmetProvider>
  );
}

