import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { NewsletterSignup } from "./NewsletterSignup";
import { cn } from "../lib/cn";
import { clearConsent } from "../lib/consent";
import { EYEBROW_MUTED } from "./ui/tokens";

const YEAR = new Date().getFullYear();

/** One link recipe shared by every footer link: muted at rest → full ink on
 *  hover. Keeps the whole footer on a single link colour system. */
const FOOTER_LINK = "transition-colors duration-300 hover:text-ink";

/** ONE body/link type recipe for the whole footer — Hanken 14px. Every text
 *  node uses this (or the 11px eyebrow header / 12px fine-print / the serif
 *  wordmark) so the footer reads as ONE consistent system. */
const FOOTER_TEXT = "font-sans text-[14px] leading-[1.6]";

/** Footer navigation — TWO short columns, not one tall 12-item stack.
 *
 *  EXPLORE leads with Home (the wordmark also links home, but Hugo wants Home
 *  explicit in the footer site map) then mirrors the primary nav order
 *  (Nav.tsx NAV_LINKS). ESTATE gathers the secondary / utility pages and is the
 *  ONLY place /gift and /trade are linked anywhere in the chrome, so those
 *  routes aren't orphaned. Legal (Privacy · Terms · Returns) lives ONLY in the
 *  bottom bar below — never duplicated up here. Keep both lists in the same
 *  canonical order the nav uses so the surfaces never drift. */
const EXPLORE_LINKS = [
  { to: "/", label: "Home" },
  { to: "/collections", label: "Collections" },
  { to: "/for-you", label: "For You" },
  { to: "/about", label: "About" },
  { to: "/memories", label: "Memories" },
  { to: "/news", label: "News" },
];

const ESTATE_LINKS = [
  { to: "/contact", label: "Contact" },
  { to: "/faq", label: "FAQ" },
  { to: "/auth", label: "Authentication" },
  { to: "/gift", label: "Gift cards" },
  { to: "/trade", label: "Trade & interiors" },
];

const LinkColumn = ({
  heading,
  links,
}: {
  heading: string;
  links: { to: string; label: string }[];
}) => (
  <nav aria-label={heading}>
    <h3 className={cn(EYEBROW_MUTED, "mb-4")}>{heading}</h3>
    <ul
      className={cn(
        FOOTER_TEXT,
        "flex flex-col gap-2.5 text-ink-muted m-0 p-0 list-none",
      )}
    >
      {links.map((l) => (
        <li key={l.to} className="m-0">
          <Link to={l.to} className={FOOTER_LINK}>
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);

export const Footer = () => (
  <footer
    role="contentinfo"
    className="relative border-t border-line bg-bg text-ink-muted px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-12 pb-7 md:pb-9"
  >
    <div className="mx-auto max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[1840px] grid grid-cols-2 md:grid-cols-4 gap-x-8 md:gap-x-10 gap-y-9 md:gap-y-0 items-start">
      {/* Brand + enquiries fine-print. The emblem + two-line wordmark form ONE
          tidy lockup capped to the tribute measure (max-w-[280px]) so it never
          reaches the link columns. A short tagline + the estate email +
          required trader address sit beneath it — the long author credit that
          used to live here belongs on /about, not on every page's footer. */}
      <div className="col-span-2 md:col-span-1">
        <Logo
          size={28}
          wordmark
          wordmarkAlwaysOn
          wordmarkWrap
          className="max-w-[280px] mb-6 [&>span]:leading-[1.4]"
        />
        <div aria-hidden="true" className="h-px w-10 bg-line mb-6" />
        <p className={cn(FOOTER_TEXT, "max-w-[280px] text-ink-muted m-0")}>
          A tribute to the life and work of Stephen Meakin (SEM) — Mandala
          Artist &amp; Sacred Geometer, 1966&ndash;2021.
        </p>
        <p className="font-sans text-[12px] leading-[1.6] text-ink-fade mt-4 max-w-[280px] m-0">
          <a
            href="mailto:info@themandalacompany.com"
            className={cn(FOOTER_LINK, "[overflow-wrap:anywhere]")}
          >
            info@themandalacompany.com
          </a>
          <br />
          213 Elm Drive, Hove, East Sussex, BN3 7JD, UK
        </p>
      </div>

      {/* Explore — the primary pages (canonical nav order, minus Home). */}
      <div className="md:col-span-1">
        <LinkColumn heading="Explore" links={EXPLORE_LINKS} />
      </div>

      {/* Estate — secondary / utility pages; sole home of /gift + /trade. */}
      <div className="md:col-span-1">
        <LinkColumn heading="Estate" links={ESTATE_LINKS} />
      </div>

      {/* Friends & Family — quiet newsletter signup. Posts to
          /api/newsletter-subscribe. Spans both columns on mobile. */}
      <div className="col-span-2 md:col-span-1">
        <NewsletterSignup variant="footer" />
      </div>
    </div>

    {/* Bottom bar — copyright + the SOLE legal link row (Privacy · Terms ·
        Returns appear ONLY here, never also in a column above). */}
    <div className="mx-auto max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[1840px] mt-8 md:mt-10 pt-5 border-t border-line flex flex-col md:flex-row md:items-center md:justify-between gap-3 font-sans text-[12px] leading-[1.5] text-ink-fade">
      <p className="m-0">
        © {YEAR} The estate of Stephen Meakin. All works and writings © the
        estate. All rights reserved.
      </p>
      <p className="m-0 flex items-center gap-2 flex-wrap">
        <Link to="/privacy" className={FOOTER_LINK}>
          Privacy
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/terms" className={FOOTER_LINK}>
          Terms
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/returns" className={FOOTER_LINK}>
          Returns
        </Link>
        <span aria-hidden="true">·</span>
        {/* Clears the tasm.consent.v1 decision — the consent banner subscribes
            to the consent store, so it re-opens immediately, no reload. */}
        <button
          type="button"
          onClick={clearConsent}
          className={cn(
            FOOTER_LINK,
            "bg-transparent border-0 p-0 cursor-pointer font-sans text-[12px] leading-[1.5] text-ink-fade",
          )}
        >
          Cookie preferences
        </button>
      </p>
    </div>
  </footer>
);
