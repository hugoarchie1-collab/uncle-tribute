import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { NewsletterSignup } from "./NewsletterSignup";
import { cn } from "../lib/cn";
import { EYEBROW_MUTED } from "./ui/tokens";

const YEAR = new Date().getFullYear();

export const Footer = () => (
  <footer
    role="contentinfo"
    className="relative border-t border-white/8 bg-bg text-ink-soft px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-14 pb-8 md:pb-10"
  >
    <div className="mx-auto max-w-[1400px] grid grid-cols-2 md:grid-cols-4 gap-y-8 md:gap-y-8 gap-x-8 md:gap-x-10 mb-8 md:mb-10 items-start">
      <div className="col-span-2 md:col-span-1">
        <Logo size={32} wordmark />
        <p className="mt-4 md:mt-5 max-w-[280px] font-sans font-normal text-[13.5px] md:text-[14px] leading-[1.6] md:leading-[1.65] text-ink/70 m-0">
          A tribute to the life and work of Stephen Meakin (SEM) — Mandala Artist &amp; Sacred Geometer, 1966&ndash;2021.
        </p>
        <p className="mt-3 max-w-[280px] font-sans font-medium text-[13px] leading-[1.6] text-ink/60 m-0">
          The estate of Stephen Meakin · The Mandala Company — Steve's immediate family.
        </p>
        {/* Author credit — desktop only. On mobile it lengthens the footer
            tail with detail a phone reader rarely needs; the estate line
            above already carries attribution. */}
        <p className="hidden md:block mt-3 max-w-[280px] font-display italic text-[12px] leading-[1.65] text-ink/55 m-0">
          Written for The Mandala Company by Archie Hugo Charles Wedge (Stephen's nephew). Stephen's words are his own, drawn from his notebooks, interviews and the writings he left.
        </p>
      </div>

      <div>
        <h3 className={cn(EYEBROW_MUTED, "mb-4 md:mb-5")}>
          Site
        </h3>
        <ul className="flex flex-col gap-2.5 md:gap-3 text-[14px] text-ink/70">
          <li><Link to="/" className="transition-colors hover:text-ink">Home</Link></li>
          <li><Link to="/collections" className="transition-colors hover:text-ink">Collections</Link></li>
          <li><Link to="/about" className="transition-colors hover:text-ink">About</Link></li>
          <li><Link to="/memories" className="transition-colors hover:text-ink">Memories</Link></li>
          <li><Link to="/contact" className="transition-colors hover:text-ink">Contact</Link></li>
          <li><Link to="/faq" className="transition-colors hover:text-ink">FAQ</Link></li>
          <li><Link to="/returns" className="transition-colors hover:text-ink">Returns</Link></li>
        </ul>
      </div>

      <div>
        <h3 className={cn(EYEBROW_MUTED, "mb-4 md:mb-5")}>
          Enquiries
        </h3>
        <ul className="flex flex-col gap-2.5 md:gap-3 text-[14px] text-ink/70">
          <li>
            <a
              href="mailto:info@themandalacompany.com"
              className="break-words transition-colors hover:text-ink"
            >
              info@themandalacompany.com
            </a>
          </li>
          <li><Link to="/contact" className="transition-colors hover:text-ink">Send an enquiry</Link></li>
          <li className="not-italic leading-[1.6] text-ink/55 pt-1">
            213 Elm Drive, Hove<br />East Sussex, BN3 7JD, UK
          </li>
        </ul>
      </div>

      {/* Friends & Family — quiet newsletter signup. Posts to
          /api/newsletter-subscribe. Same surface as the home / basket /
          About variants; different markup register for the footer column.
          Spans both columns on mobile so the input isn't cramped. */}
      <div className="col-span-2 md:col-span-1">
        <NewsletterSignup variant="footer" />
      </div>
    </div>

    <div className="mx-auto max-w-[1400px] pt-6 md:pt-8 border-t border-white/8 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[12px] text-ink/55">
      <p className="m-0">
        © {YEAR} The estate of Stephen Meakin. All works and writings © the estate. All rights reserved.
      </p>
      <p className="m-0 flex items-center gap-2">
        <Link to="/privacy" className="text-ink/70 transition-colors hover:text-ink">Privacy</Link>
        <span aria-hidden="true">·</span>
        <Link to="/terms" className="text-ink/70 transition-colors hover:text-ink">Terms</Link>
        <span aria-hidden="true">·</span>
        <Link to="/returns" className="text-ink/70 transition-colors hover:text-ink">Returns</Link>
      </p>
    </div>
  </footer>
);
