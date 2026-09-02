import { SOCIAL_PROFILES } from "../data/socials";
import { cn } from "../lib/cn";

/**
 * THE social row. ONE component, used by the footer, /account and /links.
 *
 * ⚠️ WHY THIS EXISTS. Hugo, from the live site: "the design isn't consistent
 * with the social media logos compared to the bank card logos, which IS
 * consistent." He was right, and the cause was three hand-rolled copies —
 * the footer drew flat glyphs, /account drew 40px grey outline CIRCLES, /links
 * drew a third thing. Whatever a page does to this row, every page must do.
 *
 * The chip geometry below is COPIED DELIBERATELY from PaymentMarks' `Chip`
 * (h-7 · min-w-[42px] · px-2 · rounded-[5px] · bg-white · ring-black/5). That is
 * the site's one "brand mark" container, and it is white for the reason that
 * file documents: a brand mark is only correct on its own ground. Instagram's
 * magenta, TikTok's cyan and YouTube's red are defined against white — dropped
 * straight onto the dark footer, four of the five read as one red smear and
 * TikTok's cyan all but vanished. If the payment chip changes, change it HERE
 * in the same commit, or the two rows drift apart again.
 */

const BRAND: Record<string, string> = {
  Instagram: "#E4405F",
  TikTok: "#25F4EE",
  YouTube: "#FF0000",
  Facebook: "#1877F2",
  Pinterest: "#E60023",
};

export type SocialMarksProps = {
  /** Wrapper classes — spacing is the page's business, the chip is not. */
  className?: string;
};

export const SocialMarks = ({ className }: SocialMarksProps) => {
  if (SOCIAL_PROFILES.length === 0) return null;
  return (
    <ul
      className={cn(
        // gap-1.5 (not the payment row's gap-2): five chips at the card's
        // 42px floor must clear the footer's narrow brand column on one line —
        // a lone Pinterest wrapping to a second row was the visible symptom.
        "flex flex-wrap items-center gap-1.5 m-0 p-0 list-none",
        className,
      )}
    >
      {SOCIAL_PROFILES.map((s) => (
        <li key={s.label} className="m-0">
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${s.label} — The Mandala Company (opens in a new tab)`}
            style={{ ["--brand" as string]: BRAND[s.label] ?? "currentColor" }}
            className="inline-flex h-7 min-w-[42px] items-center justify-center rounded-[5px] bg-white px-2 ring-1 ring-black/5 text-[color:var(--brand)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {s.icon}
          </a>
        </li>
      ))}
    </ul>
  );
};
