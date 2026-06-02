import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { NewsletterSignup } from "./NewsletterSignup";
import { cn } from "../lib/cn";
import { EYEBROW_MUTED } from "./ui/tokens";

const YEAR = new Date().getFullYear();

/** One link recipe shared by every footer link: muted at rest → full ink on
 *  hover. Keeps the whole footer on a single link colour system. */
const FOOTER_LINK = "transition-colors duration-300 hover:text-ink";

/** ONE body/link type recipe for the whole footer — Hanken 13.5px. Every
 *  text node uses this (or the 11px eyebrow header / 12px fine-print / the
 *  serif wordmark) so the footer reads as ONE consistent system instead of
 *  the old eight-size, two-family jumble. */
const FOOTER_TEXT = "font-sans text-[13.5px] leading-[1.6]";

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
    className="relative border-t border-line bg-bg text-ink-muted px-4 sm:px-6 md:px-8 lg:px-12 pt-11 md:pt-14 pb-8 md:pb-10"
  >
    <div className="mx-auto max-w-[1400px] grid grid-cols-2 md:grid-cols-4 gap-x-8 md:gap-x-10 gap-y-9 md:gap-y-0 items-start">
      {/* Brand */}
      <div className="col-span-2 md:col-span-1">
        <Logo size={30} wordmark />
        <p className={cn(FOOTER_TEXT, "mt-5 max-w-[280px] text-ink-muted m-0")}>
          A tribute to the life and work of Stephen Meakin (SEM) — Mandala Artist &amp; Sacred Geometer, 1966&ndash;2021.
        </p>
        <p className={cn(FOOTER_TEXT, "mt-3 max-w-[280px] text-ink-fade m-0")}>
          The estate of Stephen Meakin · The Mandala Company — Steve's immediate family.
        </p>
        {/* Author credit — desktop only. Now matched to the footer's single
            sans system (was a stray serif-italic that made the type read
            "messy"); kept small + faint so it stays a quiet footnote. */}
        <p className="hidden md:block font-sans text-[12px] leading-[1.55] text-ink-faint mt-3 max-w-[280px] m-0">
          Written for The Mandala Company by Archie Hugo Charles Wedge (Stephen's nephew). Stephen's words are his own, drawn from his notebooks, interviews and the writings he left.
        </p>
      </div>

      {/* Site */}
      <nav aria-label="Footer" className="col-span-2 md:col-span-1">
        <h3 className={cn(EYEBROW_MUTED, "mb-4")}>Site</h3>
        <ul className={cn(FOOTER_TEXT, "flex flex-col gap-2.5 leading-none text-ink-muted m-0 p-0 list-none")}>
          {SITE_LINKS.map((l) => (
            <li key={l.to} className="m-0">
              <Link to={l.to} className={FOOTER_LINK}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Enquiries — full width on mobile so the 26-char email never wraps
          mid-word in a half-width column; 1-up from md. */}
      <div className="col-span-2 md:col-span-1">
        <h3 className={cn(EYEBROW_MUTED, "mb-4")}>Enquiries</h3>
        <ul className={cn(FOOTER_TEXT, "flex flex-col gap-2.5 text-ink-muted m-0 p-0 list-none")}>
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
          <li className="m-0 text-ink-fade">
            213 Elm Drive, Hove<br />East Sussex, BN3 7JD, UK
          </li>
        </ul>
      </div>

      {/* Friends & Family — quiet newsletter signup. Posts to
          /api/newsletter-subscribe. Spans both columns on mobile. */}
      <div className="col-span-2 md:col-span-1">
        <NewsletterSignup variant="footer" />
      </div>
    </div>

    <div className="mx-auto max-w-[1400px] mt-9 md:mt-11 pt-6 border-t border-line flex flex-col md:flex-row md:items-center md:justify-between gap-3 font-sans text-[12px] leading-[1.5] text-ink-fade">
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
