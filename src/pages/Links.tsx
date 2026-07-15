import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { PageMasthead } from "../components/PageMasthead";
import { NewsletterSignup } from "../components/NewsletterSignup";
import { SOCIAL_PROFILES } from "../data/socials";
import { EYEBROW, EYEBROW_MUTED } from "../components/ui/tokens";
import { cn } from "../lib/cn";

/**
 * /links — the estate "link in bio" hub.
 *
 * The single tidy destination every social bio points at (Instagram, Facebook,
 * Pinterest, Etsy…). Built on the shared page shell — SAME masthead, backdrop,
 * fonts and tokens as /gift, /trade, /contact — so it reads as the estate's own
 * front door, never a rented third-party page (no Linktree branding, no ads,
 * lives on themandalacompany.com, and every tap lands in OUR shop).
 *
 * Layout: a mobile-first single column (the way a phone-bio visitor arrives)
 * that opens on lg into an editorial two-up — the primary link stack on the
 * left, a "Follow / Friends & Family" aside on the right — so desktop fills the
 * width instead of stranding a thin phone column in a void.
 *
 * The link list is a plain data array; add/remove a row in one place.
 */

// ── Etsy ────────────────────────────────────────────────────────────────────
// Paste the live Etsy shop URL here (e.g. "https://www.etsy.com/shop/…") and the
// Etsy card lights up automatically. Left empty = the card is simply not shown,
// so nothing broken ever ships. This is the ONLY thing gating the Etsy row.
const ETSY_URL = "";

// ── Inline line-icons (stroke 1.5, currentColor) — one visual family, matched
//    to the footer's hairline lock glyph. Kept local: they exist only here.
const iconClass = "h-[19px] w-[19px]";
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
  sub: string;
  icon: ReactNode;
  /** Internal route (SPA) — OR `href` for an external destination. */
  to?: string;
  href?: string;
  /** Visually promote this row (filled, top of the stack). */
  featured?: boolean;
}

const LINKS: LinkRow[] = [
  {
    label: "Shop the prints",
    sub: "Signed, editioned giclée reproductions",
    icon: IconFrame,
    to: "/collections",
    featured: true,
  },
  ...(ETSY_URL
    ? [
        {
          label: "Etsy shop",
          sub: "Also available on Etsy",
          icon: IconStore,
          href: ETSY_URL,
        } satisfies LinkRow,
      ]
    : []),
  { label: "Find a print", sub: "A short guided chooser", icon: IconCompass, to: "/for-you" },
  { label: "Gift an edition", sub: "Digital gift cards, any amount", icon: IconGift, to: "/gift" },
  { label: "About Stephen", sub: "His life, work & sacred geometry", icon: IconPerson, to: "/about" },
  { label: "Book of Memories", sub: "Read or leave a memory", icon: IconBook, to: "/memories" },
  { label: "News & editions", sub: "What's next from the estate", icon: IconBell, to: "/news" },
  { label: "Contact", sub: "Get in touch with the estate", icon: IconMail, to: "/contact" },
];

// Card recipe — one big, tappable, hairline-ringed row. Featured = filled ink.
const CARD_BASE =
  "group relative flex items-center gap-4 rounded-2xl px-5 py-4 md:px-6 md:py-5 transition-[transform,box-shadow,background-color,border-color] duration-300 ease-out hover:-translate-y-0.5 active:scale-[0.99] active:duration-100 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const CARD_QUIET =
  "ring-1 ring-line bg-bg-soft/40 hover:ring-accent/70 hover:bg-bg-soft/70";
const CARD_FEATURED = "bg-ink text-bg ring-1 ring-ink hover:bg-accent hover:ring-accent";

const LinkCardBody = ({ row }: { row: LinkRow }) => (
  <>
    <span
      className={cn(
        "flex h-11 w-11 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
        row.featured
          ? "bg-bg/15 text-bg group-hover:bg-ink/15 group-hover:text-ink"
          : "ring-1 ring-line text-ink/75 group-hover:text-accent group-hover:ring-accent/70",
      )}
    >
      {row.icon}
    </span>
    <span className="min-w-0 flex-1">
      <span
        className={cn(
          "block font-display font-semibold tracking-[-0.01em] leading-tight",
          "text-[clamp(17px,1.5vw,20px)]",
          row.featured ? "text-bg" : "text-ink",
        )}
        style={{ fontVariationSettings: '"opsz" 32, "wght" 600' }}
      >
        {row.label}
      </span>
      <span
        className={cn(
          "mt-0.5 block font-sans text-[13.5px] leading-snug",
          row.featured ? "text-bg/70" : "text-ink-muted",
        )}
      >
        {row.sub}
      </span>
    </span>
    <span
      aria-hidden="true"
      className={cn(
        "ml-auto shrink-0 text-[19px] leading-none transition-transform duration-300 group-hover:translate-x-1",
        row.featured ? "text-bg/80" : "text-ink/45 group-hover:text-accent",
      )}
    >
      {row.href ? "↗" : "→"}
    </span>
  </>
);

const LinkCard = ({ row }: { row: LinkRow }) => {
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
        <LinkCardBody row={row} />
      </a>
    );
  }
  return (
    <Link to={row.to!} className={cls}>
      <LinkCardBody row={row} />
    </Link>
  );
};

export const Links = () => (
  <div className="relative min-h-screen flex flex-col overflow-x-clip">
    <SceneBackdrop src="/img/scenes/contact-scene-v3.webp" />
    <Seo
      title="Links — The Mandala Company"
      description="Everything from the estate of Stephen Meakin (SEM) in one place — shop the signed prints, gift an edition, read his story, and follow along on Instagram, Facebook and Pinterest."
      url="/links"
    />
    <Nav />

    <main className="relative z-10 flex-1 mx-auto w-full max-w-[1180px] 2xl:max-w-[1320px] 3xl:max-w-[1480px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-12 pb-12 md:pb-16">
      <Reveal className="mb-8 md:mb-12">
        <PageMasthead
          eyebrow="The Mandala Company"
          meta="Links & shop"
          title={
            <>
              Everything, in <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>one</em> place.
            </>
          }
        >
          <p className="mt-5 md:mt-6 border-t border-line pt-5 font-sans text-[16px] md:text-[17px] leading-[1.7] text-ink-muted max-w-[62ch]">
            The estate of <span className="text-ink">Stephen Meakin</span> — signed
            giclée editions of his mandala paintings, direct from his family. Shop
            the prints, read his story, or follow along below.
          </p>
        </PageMasthead>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* ── Primary link stack ─────────────────────────────────────────── */}
        <Reveal as="section" className="lg:col-span-7 3xl:col-span-8">
          <h2 className={cn(EYEBROW_MUTED, "mb-4")}>Explore</h2>
          <ul className="flex flex-col gap-3 md:gap-3.5 m-0 p-0 list-none">
            {LINKS.map((row) => (
              <li key={row.label} className="m-0">
                <LinkCard row={row} />
              </li>
            ))}
          </ul>
        </Reveal>

        {/* ── Follow + Friends & Family aside ────────────────────────────── */}
        <Reveal as="section" className="lg:col-span-5 3xl:col-span-4 lg:sticky lg:top-24">
          <div className="rounded-2xl ring-1 ring-line bg-bg-soft/40 p-6 md:p-7">
            <h2 className={cn(EYEBROW, "m-0 mb-4")}>Follow the estate</h2>
            <ul className="flex items-center gap-3 m-0 p-0 list-none">
              {SOCIAL_PROFILES.map((s) => (
                <li key={s.label} className="m-0">
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${s.label} — The Mandala Company`}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full ring-1 ring-line text-ink-muted transition-[color,transform,box-shadow] duration-300 hover:text-accent hover:ring-accent/70 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {s.icon}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 font-sans text-[13.5px] leading-[1.65] text-ink-muted m-0">
              New work, exhibitions and the occasional glimpse of the studio.
            </p>
          </div>

          <div className="mt-6">
            <NewsletterSignup variant="panel" />
          </div>
        </Reveal>
      </div>
    </main>

    <FooterCatalogue />
    <Footer />
  </div>
);

export default Links;
