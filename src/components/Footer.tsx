import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { NewsletterSignup } from "./NewsletterSignup";
import { cn } from "../lib/cn";
import { EYEBROW_MUTED } from "./ui/tokens";

const YEAR = new Date().getFullYear();

/** One link recipe shared by every footer link: muted at rest → full ink on
 *  hover. Keeps the whole footer on a single link colour system. */
const FOOTER_LINK = "transition-colors duration-300 hover:text-ink";

/** Site links — mirrors the top-nav order (Home · Collections · For You ·
 *  About · Memories · Contact), then the FAQ / Returns utility links. */
const SITE_LINKS = [
  { to: "/", label: "Home" },
  { to: "/collections", label: "Collections" },
  { to: "/for-you", label: "For You" },
  { to: "/about", label: "About" },
  { to: "/memories", label: "Memories" },
  { to: "/contact", label: "Contact" },
  { to: "/faq", label: "FAQ" },
  { to: "/returns", label: "Returns" },
];

export const Footer = () => (
  <footer
    role="contentinfo"
    className="relative border-t border-line bg-bg text-ink-muted px-4 sm:px-6 md:px-8 lg:px-12 pt-12 md:pt-16 pb-10 md:pb-12"
  >
    <div className="mx-auto max-w-[1400px] grid grid-cols-2 md:grid-cols-4 gap-x-8 md:gap-x-10 gap-y-10 md:gap-y-0 items-start">
      <div className="col-span-2 md:col-span-1">
        <Logo size={32} wordmark />
        <p className="mt-5 max-w-[280px] font-sans font-normal text-[13.5px] md:text-[14px] leading-[1.65] text-ink-muted m-0">
          A tribute to the life and work of Stephen Meakin (SEM) — Mandala Artist &amp; Sacred Geometer, 1966&ndash;2021.
        </p>
        <p className="mt-3 max-w-[280px] font-sans font-normal text-[13px] leading-[1.6] text-ink-fade m-0">
          The estate of Stephen Meakin · The Mandala Company — Steve's immediate family.
        </p>
        {/* Author credit — desktop only. On mobile it lengthens the footer
            tail with detail a phone reader rarely needs; the estate line
            above already carries attribution. */}
        <p className="hidden md:block mt-3 max-w-[280px] font-display italic text-[12px] leading-[1.65] text-ink-faint m-0">
          Written for The Mandala Company by Archie Hugo Charles Wedge (Stephen's nephew). Stephen's words are his own, drawn from his notebooks, interviews and the writings he left.
        </p>
      </div>

      {/* Site + Enquiries go full-width (stacked) on mobile and 4-up on
          desktop. On mobile a half-width column (~160px) is too narrow for the
          26-char enquiries email — forcing it to wrap mid-word. Full width lets
          the address sit on one clean line at every breakpoint down to 320px. */}
      <nav aria-label="Footer" className="col-span-2 md:col-span-1">
        <h3 className={cn(EYEBROW_MUTED, "mb-5")}>Site</h3>
        <ul className="flex flex-col gap-3 font-sans text-[14px] leading-none text-ink-muted m-0 p-0 list-none">
          {SITE_LINKS.map((l) => (
            <li key={l.to} className="m-0">
              <Link to={l.to} className={FOOTER_LINK}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="col-span-2 md:col-span-1">
        <h3 className={cn(EYEBROW_MUTED, "mb-5")}>Enquiries</h3>
        <ul className="flex flex-col gap-3 font-sans text-[14px] leading-none text-ink-muted m-0 p-0 list-none">
          <li className="m-0">
            <a
              href="mailto:info@themandalacompany.com"
              className={cn(FOOTER_LINK, "[overflow-wrap:anywhere]")}
            >
              info@themandalacompany.com
            </a>
          </li>
          <li className="m-0">
            <Link to="/contact" className={FOOTER_LINK}>
              Send an enquiry
            </Link>
          </li>
          <li className="m-0 leading-[1.6] text-ink-fade">
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

    <div className="mx-auto max-w-[1400px] mt-12 md:mt-16 pt-8 border-t border-line flex flex-col md:flex-row md:items-center md:justify-between gap-3 font-sans text-[12px] leading-[1.6] text-ink-fade">
      <p className="m-0">
        © {YEAR} The estate of Stephen Meakin. All works and writings © the estate. All rights reserved.
      </p>
      <p className="m-0 flex items-center gap-2">
        <Link to="/privacy" className={FOOTER_LINK}>Privacy</Link>
        <span aria-hidden="true">·</span>
        <Link to="/terms" className={FOOTER_LINK}>Terms</Link>
        <span aria-hidden="true">·</span>
        <Link to="/returns" className={FOOTER_LINK}>Returns</Link>
      </p>
    </div>
  </footer>
);
