import { Link } from "react-router-dom";
import { Logo } from "./Logo";

const YEAR = new Date().getFullYear();

/**
 * Site-wide footer. Minimal — logo, primary nav, studio address (from the
 * PDF), social/contact slots (placeholders the user fills in later) and
 * the copyright line. No invented taglines.
 *
 * Social media URLs are intentionally left as "#" placeholders — fill them
 * in `socialLinks` below when ready.
 */
const socialLinks: { label: string; href: string }[] = [
  { label: "Instagram", href: "#" }, // [TBD]
  { label: "Pinterest", href: "#" }, // [TBD]
  { label: "Email", href: "mailto:enquiries@example.com" }, // [TBD]
];

export const Footer = () => (
  <footer className="site-footer" role="contentinfo">
    <div className="site-footer__grid">
      <div className="site-footer__col site-footer__col--brand">
        <Logo size={28} wordmark />
      </div>

      <div className="site-footer__col">
        <h3 className="site-footer__heading">Site</h3>
        <ul className="site-footer__list">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/collections">Collections</Link></li>
          <li><Link to="/about">About</Link></li>
        </ul>
      </div>

      <div className="site-footer__col">
        <h3 className="site-footer__heading">Studio</h3>
        <ul className="site-footer__list">
          <li>Phoenix Place</li>
          <li>Lewes, East Sussex</li>
          <li>United Kingdom</li>
        </ul>
      </div>

      <div className="site-footer__col">
        <h3 className="site-footer__heading">Elsewhere</h3>
        <ul className="site-footer__list">
          {socialLinks.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target={s.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer noopener"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div className="site-footer__legal">
      <p>
        © {YEAR} The Art of Stephen Meakin. All works and writings ©
        the estate of Stephen Meakin. All rights reserved.
      </p>
      <p className="site-footer__legal-links">
        <Link to="/privacy">Privacy</Link>
        <span aria-hidden="true"> · </span>
        <Link to="/terms">Terms</Link>
      </p>
    </div>
  </footer>
);
