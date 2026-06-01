import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ESTATE_AUTHENTICATION,
  ORIGINAL_PROVENANCE,
  ORIGINAL_PRINT_SPEC,
} from "../data/paintings";
import { EYEBROW_MUTED, META } from "./ui/tokens";
import { cn } from "../lib/cn";

/**
 * ProvenancePanel — the full provenance / materials / shipping detail, kept
 * OUT of the buy box (which stays tight) and placed below the Story as three
 * accessible native <details> disclosures. All copy from single-source data.
 * Chevron rotation is the only motion and is reduced-motion-safe.
 */
const Disclosure = ({ summary, children }: { summary: string; children: ReactNode }) => (
  <details className="group border-b border-white/8">
    <summary
      className={cn(
        EYEBROW_MUTED,
        "cursor-pointer list-none flex items-center justify-between py-4 [&::-webkit-details-marker]:hidden",
      )}
    >
      {summary}
      <span
        aria-hidden="true"
        className="text-ink/40 text-[18px] leading-none transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
      >
        ⌄
      </span>
    </summary>
    <div className="pb-5 pt-1">{children}</div>
  </details>
);

export const ProvenancePanel = () => (
  <div className="max-w-[720px] mx-auto mt-14 md:mt-20">
    <Disclosure summary="Authentication & provenance">
      <ul className="list-none m-0 p-0 flex flex-col gap-2">
        <li className={META}>{ESTATE_AUTHENTICATION.stamp}</li>
        <li className={META}>{ESTATE_AUTHENTICATION.numbering}</li>
        <li className={META}>{ESTATE_AUTHENTICATION.coa}</li>
        <li className={META}>{ESTATE_AUTHENTICATION.printer}</li>
        <li className={cn(META, "text-ink/55")}>Original · {ORIGINAL_PROVENANCE}</li>
      </ul>
    </Disclosure>
    <Disclosure summary="The edition & materials">
      <p className={cn(META, "m-0")}>{ORIGINAL_PRINT_SPEC}</p>
    </Disclosure>
    <Disclosure summary="Shipping & care">
      <ul className="list-none m-0 p-0 flex flex-col gap-2">
        <li className={META}>Each print is made to order and ships within 7–10 working days.</li>
        <li className={META}>UK £15 · Europe £35 · Worldwide £60 (unframed; framed orders carry a small surcharge).</li>
        <li className={META}>
          Damaged or lost in transit? See{" "}
          <Link to="/returns" className="underline underline-offset-4 hover:text-ink transition-colors">
            returns &amp; damages
          </Link>
          .
        </li>
      </ul>
    </Disclosure>
  </div>
);
