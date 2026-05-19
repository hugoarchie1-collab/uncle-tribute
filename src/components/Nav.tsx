import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Logo } from "./Logo";
import { cn } from "../lib/cn";

export const Nav = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 40);
    handle();
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex items-center justify-between gap-6 px-6 md:px-10 lg:px-16 transition-all duration-300 text-ink",
        scrolled
          ? "py-3 bg-bg/92 backdrop-blur-md border-b border-white/5"
          : "py-5 bg-transparent border-b border-transparent",
      )}
    >
      <Link to="/" aria-label="The Art of Stephen Meakin — home" className="inline-flex items-center">
        <Logo size={32} wordmark />
      </Link>
      <nav className="flex items-center gap-7 md:gap-10" aria-label="Primary">
        {[
          { to: "/", label: "Home", end: true },
          { to: "/collections", label: "Collections" },
          { to: "/about", label: "About" },
        ].map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              cn(
                "relative py-2 font-sans text-[11px] font-medium tracking-[0.22em] uppercase transition-colors duration-300",
                isActive ? "text-ink" : "text-ink/55 hover:text-ink",
                "after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-accent after:scale-x-0 after:origin-left after:transition-transform after:duration-300",
                isActive && "after:scale-x-100",
                "hover:after:scale-x-100",
              )
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
};
