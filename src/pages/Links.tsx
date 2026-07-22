import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { SOCIAL_PROFILES } from "../data/socials";
import { cn } from "../lib/cn";

/**
 * /links — the estate "link in bio" hub.
 *
 * Rebuilt 2026-07-22 to the CLEAN, CENTRED "Linktree register" (Hugo: a lot of
 * brands do the super-clean single-column bio page — make ours look like that,
 * but on our own domain, in our own type + the wax-seal rose, so it never reads
 * as a rented third-party page). Deliberately NO site nav / footer / catalogue
 * strip: a phone-bio visitor arrives here, taps ONE link, and is gone — the
 * page is just the rose, the name, and a single stack of tappable buttons.
 *
 * The link list is a plain data array; add/remove a row in one place.
 */

// ── Etsy ────────────────────────────────────────────────────────────────────
// Paste the live Etsy shop URL here (e.g. "https://www.etsy.com/shop/…") and the
// Etsy button lights up automatically. Left empty = the button is simply not
// shown, so nothing broken ever ships. This is the ONLY thing gating the Etsy row.
const ETSY_URL = "";

// ── Inline line-icons (stroke 1.5, currentColor) — one visual family, matched
//    to the footer's hairline register. Kept local: they exist only here.
const iconClass = "h-[18px] w-[18px]";
const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconFrame = (
  <svg viewBox="0 0 24 24" className={iconClass} {...stroke} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <rect x="7" y="7" width="10" height="10" rx="0.5" />
  </svg>
);
const IconCompass = (
  <svg viewBox="0 0 24 24" className={iconClass} {...stroke} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5 13 13l-4.5 2.5L11 11z" />
  </svg>
);
const IconGift = (
  <svg viewBox="0 0 24 24" className={iconClass} {...stroke} aria-hidden="true">
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M5 12v8h14v-8M12 8v12" />
    <path d="M12 8S10.5 3 8 4.5 12 8 12 8zM12 8s1.5-5 4-3.5S12 8 12 8z" />
  </svg>
);
const IconPerson = (
  <svg viewBox="0 0 24 24" className={iconClass} {...stroke} aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
  </svg>
);
const IconBook = (
  <svg viewBox="0 0 24 24" className={iconClass} {...stroke} aria-hidden="true">
    <path d="M12 6C9 4 5 4 3 5v14c2-1 6-1 9 1 3-2 7-2 9-1V5c-2-1-6-1-9 1z" />
    <path d="M12 6v14" />
  </svg>
);
const IconBell = (
  <svg viewBox="0 0 24 24" className={iconClass} {...stroke} aria-hidden="true">
    <path d="M18 8a6 6 0 1 0-12 0c0 6-2 8-2 8h16s-2-2-2-8" />
    <path d="M10 21a2 2 0 0 0 4 0" />
  </svg>
);
const IconMail = (
  <svg viewBox="0 0 24 24" className={iconClass} {...stroke} aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);
const IconStore = (
  <svg viewBox="0 0 24 24" className={iconClass} {...stroke} aria-hidden="true">
    <path d="M4 9h16l-1-4H5zM4 9v11h16V9M4 9l-1 1M20 9l1 1" />
    <path d="M9 20v-6h6v6" />
  </svg>
);

interface LinkRow {
  label: string;
  icon: ReactNode;
  /** Internal route (SPA) — OR `href` for an external destination. */
  to?: string;
  href?: string;
  /** Visually promote this row (filled, top of the stack). */
  featured?: boolean;
}

const LINKS: LinkRow[] = [
  { label: "Shop the prints", icon: IconFrame, to: "/collections", featured: true },
  ...(ETSY_URL
    ? [{ label: "Etsy shop", icon: IconStore, href: ETSY_URL } satisfies LinkRow]
    : []),
  { label: "Find a print", icon: IconCompass, to: "/for-you" },
  { label: "Gift an edition", icon: IconGift, to: "/gift" },
  { label: "About Stephen", icon: IconPerson, to: "/about" },
  { label: "Book of Memories", icon: IconBook, to: "/memories" },
  { label: "News & editions", icon: IconBell, to: "/news" },
  { label: "Contact", icon: IconMail, to: "/contact" },
];

// One big, centred, tappable pill. Featured = filled ink; the rest = a hairline
// outline that warms to the accent on hover. Full-width, evenly stacked.
const CARD_BASE =
  "press group relative flex items-center justify-center gap-2.5 w-full rounded-full px-6 py-[15px] text-center transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const CARD_QUIET =
  "ring-1 ring-ink/25 bg-bg/35 text-ink hover:ring-accent hover:text-accent hover:bg-bg/55 backdrop-blur-[2px]";
const CARD_FEATURED =
  "bg-ink text-bg ring-1 ring-ink hover:bg-accent hover:ring-accent";

const CardBody = ({ row }: { row: LinkRow }) => (
  <>
    <span className="shrink-0 opacity-90">{row.icon}</span>
    <span
      className="font-display font-semibold tracking-[-0.01em] text-[clamp(16px,4.4vw,18px)] leading-none"
      style={{ fontVariationSettings: '"opsz" 28, "wght" 600' }}
    >
      {row.label}
    </span>
    {row.href && (
      <span aria-hidden="true" className="absolute right-6 text-[15px] opacity-60">
        ↗
      </span>
    )}
  </>
);

const LinkPill = ({ row }: { row: LinkRow }) => {
  const cls = cn(CARD_BASE, row.featured ? CARD_FEATURED : CARD_QUIET);
  if (row.href) {
    return (
      <a
        href={row.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${row.label} — opens in a new tab`}
        className={cls}
      >
        <CardBody row={row} />
      </a>
    );
  }
  return (
    <Link to={row.to!} className={cls}>
      <CardBody row={row} />
    </Link>
  );
};

export const Links = () => (
  <div className="relative min-h-[100dvh] flex flex-col overflow-x-clip">
    <SceneBackdrop src="/img/scenes/contact-scene-v3.webp" />
    <Seo
      title="Links — The Mandala Company"
      description="Everything from the estate of Stephen Meakin (SEM) in one place — shop the signed prints, gift an edition, read his story, and follow the estate on Instagram, Facebook and Pinterest."
      url="/links"
    />

    <main className="relative z-10 flex-1 flex flex-col items-center px-5 sm:px-6 pt-14 pb-16 sm:pt-20">
      <Reveal className="w-full max-w-[452px] flex flex-col items-center">
        {/* Rose → home. The one way back into the full site from the top. */}
        <Link
          to="/"
          aria-label="The Mandala Company — enter the site"
          className="press inline-flex"
        >
          <Logo size={76} wordmark={false} />
        </Link>

        {/* Name + descriptor */}
        <h1
          className="mt-5 text-center font-display font-semibold tracking-[-0.015em] text-ink leading-[1.05] text-[clamp(26px,7vw,34px)]"
          style={{ fontVariationSettings: '"opsz" 40, "wght" 600' }}
        >
          The Mandala Company
        </h1>
        <p className="mt-1.5 font-sans text-[13.5px] font-bold uppercase tracking-[0.22em] text-accent">
          The Art of Stephen Meakin
        </p>

        {/* One-line bio */}
        <p className="mt-4 text-center font-sans text-[14.5px] leading-[1.6] text-ink-muted max-w-[34ch]">
          Signed giclée editions of his mandala paintings — direct from his
          family, shipped worldwide.
        </p>

        {/* Socials — a quiet centred row */}
        {SOCIAL_PROFILES.length > 0 && (
          <ul className="mt-6 flex items-center justify-center gap-3 m-0 p-0 list-none">
            {SOCIAL_PROFILES.map((s) => (
              <li key={s.label} className="m-0">
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.label} — The Mandala Company`}
                  className="press inline-flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-ink/25 text-ink-muted transition-[color,transform,box-shadow] duration-300 hover:text-accent hover:ring-accent hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {s.icon}
                </a>
              </li>
            ))}
          </ul>
        )}

        {/* The link stack — the whole point of the page */}
        <ul className="mt-8 w-full flex flex-col gap-3 m-0 p-0 list-none">
          {LINKS.map((row) => (
            <li key={row.label} className="m-0">
              <LinkPill row={row} />
            </li>
          ))}
        </ul>

        {/* Quiet foot — a way into the full site + the estate address */}
        <Link
          to="/"
          className="mt-10 font-sans text-[13.5px] tracking-[0.02em] text-ink-muted hover:text-ink transition-colors"
        >
          Enter the full site →
        </Link>
        <a
          href="mailto:info@themandalacompany.com"
          className="mt-2 font-sans text-[13px] text-ink-fade hover:text-ink transition-colors [overflow-wrap:anywhere]"
        >
          info@themandalacompany.com
        </a>
      </Reveal>
    </main>
  </div>
);

export default Links;
