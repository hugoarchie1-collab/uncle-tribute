import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Logo } from "./Logo";

interface NavProps {
  /** kept for back-compat; site is dark mode throughout. */
  light?: boolean;
}

/**
 * Sticky site nav. Transparent at the very top of the page, then turns
 * into a translucent dark bar with backdrop-blur once the user scrolls
 * past ~40px. The transition is short and quiet (200ms) so it never
 * draws attention to itself.
 */
export const Nav = (_props: NavProps = {}) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 40);
    handle();
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  return (
    <header className={`site-nav${scrolled ? " site-nav--scrolled" : ""}`}>
      <Link to="/" className="site-nav__brand" aria-label="The Art of Stephen Meakin — home">
        <Logo size={30} wordmark />
      </Link>
      <nav className="site-nav__links" aria-label="Primary">
        <NavLink to="/" end className="site-nav__link">
          Home
        </NavLink>
        <NavLink to="/collections" className="site-nav__link">
          Collections
        </NavLink>
        <NavLink to="/about" className="site-nav__link">
          About
        </NavLink>
      </nav>
    </header>
  );
};
