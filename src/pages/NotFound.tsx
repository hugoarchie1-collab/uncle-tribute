import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { usePageTitle } from "../lib/usePageTitle";

export const NotFound = () => {
  usePageTitle("Page not found");
  return (
    <div className="error-page">
      <Nav />
      <main className="error-main">
        <div className="error-card">
          <p className="error-eyebrow">404</p>
          <p className="error-actions">
            <Link to="/" className="cta-link">
              Return home <span aria-hidden="true">→</span>
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};
