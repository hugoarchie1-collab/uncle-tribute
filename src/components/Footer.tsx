import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { NewsletterSignup } from "./NewsletterSignup";

const YEAR = new Date().getFullYear();

export const Footer = () => (
  <footer
    role="contentinfo"
    className="relative border-t border-white/8 bg-bg text-ink-soft px-6 md:px-10 lg:px-16 pt-12 md:pt-14 pb-10"
  >
    <div className="mx-auto max-w-[1200px] grid grid-cols-1 md:grid-cols-4 gap-y-8 gap-x-10 mb-10 items-start">
      <div>
        <Logo size={32} wordmark />
        <p className="mt-5 max-w-[280px] font-sans font-normal text-[14px] leading-[1.65] text-ink/70 m-0">
          A tribute to the life and work of Stephen Meakin (SEM) — Mandala Artist &amp; Sacred Geometer, 1966&ndash;2021.
        </p>
        <p className="mt-3 max-w-[280px] font-sans font-medium text-[13px] leading-[1.6] text-ink/60 m-0">
          The estate of Stephen Meakin · The Mandala Company — Steve's immediate family.
        </p>
        <p className="mt-3 max-w-[280px] font-display italic text-[12px] leading-[1.65] text-ink/45 m-0">
          Written for The Mandala Company by Archie Hugo Charles Wedge (Stephen's nephew). Stephen's words are his own, drawn from his notebooks, interviews and the writings he left.
        </p>
      </div>

      <div>
        <h3 className="mb-5 font-sans text-[10px] font-medium tracking-[0.32em] uppercase text-ink/45">
          Site
        </h3>
        <ul className="flex flex-col gap-3 text-sm text-ink/70">
          <li><Link to="/" className="transition-colors hover:text-ink">Home</Link></li>
          <li><Link to="/collections" className="transition-colors hover:text-ink">Collections</Link></li>
          <li><Link to="/about" className="transition-colors hover:text-ink">About</Link></li>
        </ul>
      </div>

      <div>
        <h3 className="mb-5 font-sans text-[10px] font-medium tracking-[0.32em] uppercase text-ink/45">
          Studio
        </h3>
        <ul className="flex flex-col gap-3 text-sm text-ink/70">
          <li>Phoenix Place</li>
          <li>Lewes, East Sussex</li>
          <li>United Kingdom</li>
          <li>
            <a
              href="mailto:info@themandalacompany.com"
              className="transition-colors hover:text-ink"
            >
              info@themandalacompany.com
            </a>
          </li>
        </ul>
      </div>

      {/* Friends of the estate — quiet newsletter signup. Posts to
          /api/newsletter-subscribe. Same surface as the home / basket /
          About variants; different markup register for the footer column. */}
      <NewsletterSignup variant="footer" />
    </div>

    <div className="mx-auto max-w-[1200px] pt-8 border-t border-white/8 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-ink/45">
      <p className="m-0">
        © {YEAR} The estate of Stephen Meakin. All works and writings © the estate. All rights reserved.
      </p>
      <p className="m-0 flex items-center gap-2">
        <Link to="/privacy" className="text-ink/70 transition-colors hover:text-ink">Privacy</Link>
        <span aria-hidden="true">·</span>
        <Link to="/terms" className="text-ink/70 transition-colors hover:text-ink">Terms</Link>
      </p>
    </div>
  </footer>
);
