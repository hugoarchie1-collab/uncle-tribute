import { Link } from "react-router-dom";
import { FAQS } from "../data/faqs";
import { Reveal } from "./Reveal";
import { cn } from "../lib/cn";
import { EYEBROW_MUTED } from "./ui/tokens";

/**
 * FaqAccordion — the frequently-asked questions rendered INLINE on the product
 * page, DROOL-style, so a buyer never has to leave the page to answer "is this
 * real / how long / can I frame it / do you ship to me?". Mounted on
 * PaintingDetail below the Reviews section.
 *
 * ⚠️ Copy is NOT duplicated: it renders the SAME verbatim `FAQS` array from
 * src/data/faqs.tsx that /contact#faq also mounts (the old /faq page was
 * retired 2026-09-02 and redirects there), so the surfaces can never drift and
 * there are no invented words. Native <details>/<summary> — zero deps,
 * keyboard-accessible, works with JS off. Monochrome to match the PDP; the only
 * colour is the accent on the answers' own links (an interaction state).
 */
export const FaqAccordion = ({
  id,
  className,
  variant = "all",
}: {
  /** Anchor id (e.g. "faq" so /contact#faq lands here). */
  id?: string;
  /** Override the default self-contained container (e.g. when the parent
   *  already provides the page gutter). */
  className?: string;
  /**
   * "all" — every Q&A, for the support surface at /contact#faq.
   * "pdp" — the curated buy-point subset, in `pdp` order (see QA.pdp).
   *
   * ⚠️ The product page must NOT render the full list. It was doing so, which
   * put four gift-card questions and a second-print discount under the buy
   * button — including one answer that names a cheaper £250 print to someone
   * about to spend £750.
   */
  variant?: "all" | "pdp";
}) => {
  const items =
    variant === "pdp"
      ? FAQS.filter((qa) => qa.pdp !== undefined).sort(
          (a, b) => (a.pdp ?? 0) - (b.pdp ?? 0),
        )
      : FAQS;
  return (
  <Reveal
    as="section"
    id={id}
    aria-labelledby="faq-heading"
    className={cn(
      "scroll-mt-24",
      className ??
        "mx-auto w-full max-w-[1180px] 2xl:max-w-[1320px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 mt-8 md:mt-10",
    )}
  >
    <div className="h-px w-full bg-line mb-8" />

    <p className={cn(EYEBROW_MUTED, "m-0 mb-3")}>Good to know</p>
    <h2
      id="faq-heading"
      className="font-display font-semibold tracking-[-0.025em] text-[clamp(26px,3.4vw,44px)] leading-[1.1] text-ink m-0 mb-8"
    >
      Questions &amp; answers
    </h2>

    <ul className="list-none p-0 m-0 border-t border-line max-w-[1000px] 2xl:max-w-[1120px] 3xl:max-w-[1280px] 4xl:max-w-[1400px]">
      {items.map((qa) => (
        <li key={qa.question} className="m-0 border-b border-line">
          <details className="group">
            {/* ⚠️ The question is a real <h3>, not a <span>. Screen-reader users
                navigate a page by its headings; as bare spans these 8-15
                questions were invisible to that, leaving an unlabelled run of
                disclosure widgets under a single "Questions & answers" heading.
                The <h3> wraps INSIDE <summary> (valid, and keeps the whole row
                the click target) and carries no extra styling of its own. */}
            <summary className="flex items-center justify-between gap-5 cursor-pointer list-none py-5 [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded-sm">
              <h3 className="font-display font-semibold text-[clamp(17px,1.7vw,23px)] leading-[1.25] text-ink m-0">
                {qa.question}
              </h3>
              <span
                aria-hidden="true"
                className="shrink-0 text-[24px] leading-none text-ink-muted transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="pb-6 pr-6 sm:pr-10 max-w-[68ch] font-sans text-[15px] 3xl:text-[18px] 4xl:text-[21px] leading-[1.7] text-ink-soft [&_a]:underline [&_a]:underline-offset-2">
              {qa.answer}
            </div>
          </details>
        </li>
      ))}
    </ul>

    {/* The curated buy-point list is deliberately short, so it must hand off
        to the full set rather than dead-end. /faq was retired 2026-09-02 and
        the complete list now lives on /contact#faq. */}
    {variant === "pdp" ? (
      <p className="m-0 mt-6">
        <Link
          to="/contact#faq"
          className="font-sans text-[15px] 3xl:text-[17px] text-ink-muted underline underline-offset-4 hover:text-ink transition-colors"
        >
          All questions &amp; answers →
        </Link>
      </p>
    ) : null}
  </Reveal>
  );
};
