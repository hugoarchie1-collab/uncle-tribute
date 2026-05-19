import { Link, NavLink } from "react-router-dom";
import { Logo } from "./Logo";

interface NavProps {
  /**
   * Kept for backwards compatibility with existing page calls.
   * The site is dark mode throughout; no light variant needed.
   */
  light?: boolean;
}

export const Nav = (_props: NavProps = {}) => (
  <header className="site-nav">
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
