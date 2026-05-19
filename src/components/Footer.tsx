import { Link } from "react-router-dom";
import { Logo } from "./Logo";

const YEAR = new Date().getFullYear();

const socialLinks: { label: string; href: string }[] = [
  { label: "Instagram", href: "#" },
  { label: "Pinterest", href: "#" },
  { label: "Email", href: "mailto:enquiries@example.com" },
];

export const Footer = () => (
  <footer
    role="contentinfo"
    className="relative mt-32 border-t border-line bg-bg text-ink-soft px-6 md:px-10 lg:px-16 pt-24 pb-12"
  >
    <div className="mx-auto max-w-[1200px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-y-12 gap-x-10 mb-16 items-start">
      <div>
        <Logo size={30} wordmark />
      </div>

      <div>
        <h3 className="mb-5 font-sans text-[11px] font-medium tracking-widest uppercase text-ink/45">
          Site
        </h3>
        <ul className="flex flex-col gap-3 text-sm text-ink/70">
          <li><Link to="/" className="transition-colors hover:text-ink">Home</Link></li>
          <li><Link to="/collections" className="transition-colors hover:text-ink">Collections</Link></li>
          <li><Link to="/about" className="transition-colors hover:text-ink">About</Link></li>
        </ul>
      </div>

      <div>
        <h3 className="mb-5 font-sans text-[11px] font-medium tracking-widest uppercase text-ink/45">
          Studio
        </h3>
        <ul className="flex flex-col gap-3 text-sm text-ink/70">
          <li>Phoenix Place</li>
          <li>Lewes, East Sussex</li>
          <li>United Kingdom</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-5 font-sans text-[11px] font-medium tracking-widest uppercase text-ink/45">
          Elsewhere
        </h3>
        <ul className="flex flex-col gap-3 text-sm text-ink/70">
          {socialLinks.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target={s.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer noopener"
                className="transition-colors hover:text-ink"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div className="mx-auto max-w-[1200px] pt-8 border-t border-line flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs text-ink/45">
      <p className="m-0">
        © {YEAR} The Art of Stephen Meakin. All works and writings ©
        the estate of Stephen Meakin. All rights reserved.
      </p>
      <p className="m-0 flex items-center gap-2">
        <Link to="/privacy" className="text-ink/70 transition-colors hover:text-ink">Privacy</Link>
        <span aria-hidden="true">·</span>
        <Link to="/terms" className="text-ink/70 transition-colors hover:text-ink">Terms</Link>
      </p>
    </div>
  </footer>
);
