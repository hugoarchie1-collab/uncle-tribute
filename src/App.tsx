import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import { useEffect } from "react";
import { Welcome } from "./pages/Welcome";
import { Collections } from "./pages/Collections";
import { PaintingDetail } from "./pages/PaintingDetail";
import { About } from "./pages/About";
import { OrderSuccess, OrderCancel } from "./pages/OrderResult";
import { Basket } from "./pages/Basket";
import { NotFound } from "./pages/NotFound";
import { Privacy, Terms } from "./pages/Legal";
import "./styles/global.css";

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
    <BrowserRouter basename={basename}>
      <ScrollToTop />
      {/* Sitewide film-grain texture — sits above content at z-100,
          opacity tuned low so it textures without obscuring. */}
      <div aria-hidden="true" className="film-grain" />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

