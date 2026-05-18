import { Link, NavLink } from "react-router-dom";
import { Logo } from "./Logo";

interface NavProps {
  /** if true, render in dark-on-light style; if false, light-on-dark */
  light?: boolean;
}

export const Nav = ({ light = false }: NavProps) => (
  <header className={`site-nav ${light ? "site-nav--light" : ""}`}>
    <Link to="/" className="site-nav__brand" aria-label="Home">
      <Logo size={28} light={light} />
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
