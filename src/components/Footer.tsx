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
 *  node uses this (or the 11px eyebrow header / 13px fine-print bottom-bar /
 *  the serif wordmark) so the footer reads as ONE consistent system. */
const FOOTER_TEXT = "font-sans text-[14px] leading-[1.6]";

/** Official estate social profiles. The SAME three URLs are wired into the
 *  Organization `sameAs` array in index.html — the strongest cross-web signal
 *  tying the brand together (Knowledge-Panel / entity grounding). Icons are
 *  inline SVG on `currentColor` so they ride the FOOTER_LINK muted→ink hover. */
const SOCIALS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/theartofstephenmeakin/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
        <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.42.56.21.96.47 1.38.89.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.43-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.89.43-.17 1.06-.37 2.23-.42 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07c-1.27.06-2.15.26-2.91.56-.79.3-1.46.71-2.13 1.38S.94 3.35.63 4.14c-.3.76-.5 1.64-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0z" />
        <path d="M12 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84M12 16a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" />
        <circle cx="18.41" cy="5.59" r="1.44" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61590902138021",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
        <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07c0 6.03 4.39 11.03 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.01 1.79-4.68 4.53-4.68 1.31 0 2.69.24 2.69.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
      </svg>
    ),
  },
  {
    label: "Pinterest",
    href: "https://www.pinterest.com/theartofstephenmeakin/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.43 7.63 11.18-.11-.95-.2-2.41.04-3.45.22-.93 1.4-5.94 1.4-5.94s-.36-.72-.36-1.78c0-1.67.97-2.91 2.17-2.91 1.02 0 1.51.77 1.51 1.69 0 1.03-.65 2.56-1 3.99-.28 1.2.6 2.18 1.79 2.18 2.15 0 3.8-2.27 3.8-5.54 0-2.9-2.08-4.92-5.06-4.92-3.44 0-5.47 2.58-5.47 5.25 0 1.04.4 2.16.9 2.76.1.12.11.23.08.35-.09.38-.3 1.2-.34 1.36-.05.22-.18.27-.41.16-1.53-.71-2.48-2.94-2.48-4.74 0-3.86 2.81-7.41 8.1-7.41 4.25 0 7.56 3.03 7.56 7.08 0 4.22-2.66 7.62-6.36 7.62-1.24 0-2.41-.65-2.81-1.41l-.76 2.91c-.28 1.06-1.02 2.39-1.52 3.2C9.57 23.81 10.76 24 12 24c6.63 0 12-5.37 12-12S18.63 0 12 0z" />
      </svg>
    ),
  },
];

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
    className="relative border-t border-line bg-bg text-ink-muted px-4 sm:px-6 md:px-8 lg:px-12 pt-6 md:pt-7 pb-6 md:pb-7"
  >
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
          className="max-w-[280px] mb-5 [&>span]:leading-[1.4]"
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
        {/* Follow the estate — official social profiles (mirrored into the
            Organization sameAs in index.html). Inline SVG glyphs, each in a
            40px hit-area (a11y), muted→ink with a soft lift on hover. */}
        <div className="mt-4">
          <h2 className={cn(EYEBROW_MUTED, "mb-2.5")}>Follow</h2>
          <ul className="flex items-center gap-1 -ml-2 m-0 p-0 list-none">
            {SOCIALS.map((s) => (
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
