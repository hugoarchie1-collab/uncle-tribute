import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { NewsletterSignup } from "./NewsletterSignup";
import { cn } from "../lib/cn";
import { clearConsent } from "../lib/consent";
import { EYEBROW_MUTED } from "./ui/tokens";
import { PaymentMarks } from "./PaymentMarks";
import { SOCIAL_PROFILES } from "../data/socials";

const YEAR = new Date().getFullYear();

/** One link recipe shared by every footer link: muted at rest → full ink on
 *  hover. Keeps the whole footer on a single link colour system. */
const FOOTER_LINK = "transition-colors duration-300 hover:text-ink";

/** ONE body/link type recipe for the whole footer — Hanken 14px. Every text
 *  node uses this (or the 11px eyebrow header / 13px fine-print bottom-bar /
 *  the serif wordmark) so the footer reads as ONE consistent system. */
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
// Mirror the grouped site menu (Nav.tsx NAV_GROUPS) so the footer never drifts
// from the nav — "Shop" = where to buy; the second column gathers His story +
// Connect + utility.
const EXPLORE_LINKS = [
  { to: "/", label: "Home" },
  { to: "/collections", label: "Collections" },
  { to: "/for-you", label: "Find a print" },
  { to: "/trade", label: "Trade & Interiors" },
  { to: "/gift", label: "Gift cards" },
];

const ESTATE_LINKS = [
  { to: "/about", label: "About Stephen" },
  { to: "/news", label: "News" },
  { to: "/memories", label: "Memories" },
  { to: "/auth", label: "Authenticate" },
  { to: "/contact", label: "Contact" },
  { to: "/faq", label: "FAQ" },
];

const LinkColumn = ({
  heading,
  links,
}: {
  heading: string;
  links: { to: string; label: string }[];
}) => (
  <nav aria-label={heading}>
    <h2 className={cn(EYEBROW_MUTED, "mb-4")}>{heading}</h2>
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
    className="nav-bg-scrolled relative border-t border-[rgba(120,30,30,0.5)] text-ink-muted px-4 sm:px-6 md:px-8 lg:px-12 pt-6 md:pt-7 pb-6 md:pb-7"
  >
    {/* FEATHERED SEAM — dissolves the top edge of the RED footer band up into
        the section above (Hugo 2026-07-24: "bottom bar the same red as the top
        panel"). Fades from the footer's own deep wax-seal red → transparent. */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-28 -translate-y-full bg-gradient-to-t from-[rgba(34,6,7,0.98)] via-[rgba(40,8,9,0.5)] to-transparent"
    />
    <div className="mx-auto max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[1840px] grid grid-cols-2 md:grid-cols-4 gap-x-8 md:gap-x-10 gap-y-6 md:gap-y-0 items-start">
      {/* Brand + enquiries fine-print. The emblem + two-line wordmark form ONE
          tidy lockup capped to the tribute measure (max-w-[280px]) so it never
          reaches the link columns. A short tagline + the estate email +
          required trader address sit beneath it — the long author credit that
          used to live here belongs on /about, not on every page's footer. */}
      <div className="col-span-2 md:col-span-1">
        <Logo
          size={28}
          wordmark
          wordmarkWrap
          wordmarkText="The Art of Stephen Meakin"
          className="max-w-[280px] mb-5"
        />
        <p className={cn(FOOTER_TEXT, "max-w-[280px] text-ink-muted m-0")}>
          A tribute to the life and work of Stephen Meakin (SEM) — Mandala
          Artist &amp; Sacred Geometer, 1966&ndash;2021.
        </p>
        <p className={cn(FOOTER_TEXT, "text-ink-muted mt-4 max-w-[280px] m-0")}>
          <a
            href="mailto:info@themandalacompany.com"
            className={cn(FOOTER_LINK, "[overflow-wrap:anywhere]")}
          >
            info@themandalacompany.com
          </a>
          <br />
          213 Elm Drive, Hove, East Sussex, BN3 7JD, UK
        </p>
        <p className="font-sans text-[13px] leading-[1.5] text-ink-muted mt-3 max-w-[280px] m-0">
          The Mandala Company is a trading name of Hugo Archie Charles Wedge.
        </p>
        {/* Follow the estate — official social profiles (mirrored into the
            Organization sameAs in index.html). Inline SVG glyphs, each in a
            40px hit-area (a11y), muted→ink with a soft lift on hover. */}
        <div className="mt-4">
          <h2 className={cn(EYEBROW_MUTED, "mb-2.5")}>Follow</h2>
          <ul className="flex items-center gap-1 -ml-2 m-0 p-0 list-none">
            {SOCIAL_PROFILES.map((s) => (
              <li key={s.label} className="m-0">
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.label} — The Mandala Company`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-[color,transform] duration-300 hover:text-ink hover:-translate-y-0.5 focus-visible:text-ink"
                >
                  {s.icon}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Explore — the primary pages (canonical nav order, minus Home). */}
      <div className="md:col-span-1">
        <LinkColumn heading="Shop" links={EXPLORE_LINKS} />
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

    {/* Trust row — secure-payment reassurance + the monochrome card/wallet
        acceptance marks. Every top-tier storefront closes the footer with the
        networks it accepts; until now this site named them in prose only (on
        the PDP/Basket) and showed NOTHING in the footer. The marks inherit the
        footer's muted→ink ink via currentColor. Copy is literally true —
        payments run on Stripe (Cards / Apple Pay / Google Pay). */}
    <div className="mx-auto max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[1840px] mt-5 md:mt-6 pt-5 border-t border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <p className={cn(FOOTER_TEXT, "flex items-center gap-2 text-ink-muted m-0")}>
        <svg
          viewBox="0 0 24 24"
          className="h-[15px] w-[15px] shrink-0 text-ink/55"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Secure checkout by Stripe
      </p>
      <PaymentMarks className="text-ink-muted" />
    </div>

    {/* Bottom bar — copyright + the SOLE legal link row (Privacy · Terms ·
        Returns appear ONLY here, never also in a column above). */}
    <div className="mx-auto max-w-[1400px] 2xl:max-w-[1600px] 3xl:max-w-[1840px] mt-5 md:mt-6 pt-4 border-t border-line flex flex-col md:flex-row md:items-center md:justify-between gap-3 font-sans text-[13px] leading-[1.5] text-ink-muted">
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
            "bg-transparent border-0 p-0 cursor-pointer font-sans text-[13px] leading-[1.5] text-ink-muted",
          )}
        >
          Cookie preferences
        </button>
      </p>
    </div>
  </footer>
);
