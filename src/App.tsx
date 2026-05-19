import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Welcome } from "./pages/Welcome";
import { Collections } from "./pages/Collections";
import { PaintingDetail } from "./pages/PaintingDetail";
import { About } from "./pages/About";
import { NotFound } from "./pages/NotFound";
import { Privacy, Terms } from "./pages/Legal";
import { useScrollReveal } from "./lib/useScrollReveal";
import "./styles/global.css";

// Strip the trailing slash so React Router treats "/" correctly under any base.
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

/** Scroll to the top on every navigation so route changes feel like page loads. */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
};

/** Wires up the scroll-reveal IntersectionObserver on every route. */
const RevealOnScroll = () => {
  useScrollReveal();
  return null;
};

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <ScrollToTop />
      <RevealOnScroll />
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/collections/:id" element={<PaintingDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
