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
}: {
  /** Anchor id (e.g. "faq" so /contact#faq lands here). */
  id?: string;
  /** Override the default self-contained container (e.g. when the parent
   *  already provides the page gutter). */
  className?: string;
}) => (
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

    <ul className="list-none p-0 m-0 border-t border-line max-w-[860px] 3xl:max-w-[1100px]">
      {FAQS.map((qa) => (
        <li key={qa.question} className="m-0 border-b border-line">
          <details className="group">
            <summary className="flex items-center justify-between gap-5 cursor-pointer list-none py-5 [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded-sm">
              <span className="font-display font-semibold text-[clamp(17px,1.7vw,23px)] leading-[1.25] text-ink">
                {qa.question}
              </span>
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
  </Reveal>
);
