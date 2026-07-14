import { Link } from "react-router-dom";
import {
  ESTATE_AUTHENTICATION,
  ORIGINAL_PROVENANCE,
  ORIGINAL_PRINT_SPEC,
} from "../data/paintings";
import { EYEBROW_MUTED, META } from "./ui/tokens";
import { cn } from "../lib/cn";

/**
 * ProvenancePanel — the provenance / materials / shipping detail below the Story.
 * Was three COLLAPSED <details> accordions in a narrow 720px centred column,
 * which stranded big empty side margins and read as empty/badly-formatted
 * (Hugo). Now it's a FULL-WIDTH, three-column OPEN spec block: every fact is
 * visible at once, the row fills the measure, and there is no dead space. All
 * copy from single-source data.
 */
export const ProvenancePanel = () => (
  <div className="max-w-[1180px] 2xl:max-w-[1320px] 3xl:max-w-[1480px] mx-auto mt-10 md:mt-12 border-t border-line pt-8 md:pt-10 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 lg:gap-14">
    <section>
      <p className={cn(EYEBROW_MUTED, "m-0 mb-4")}>Authentication &amp; provenance</p>
      <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
        <li className={META}>{ESTATE_AUTHENTICATION.stamp}</li>
        <li className={META}>{ESTATE_AUTHENTICATION.numbering}</li>
        <li className={META}>{ESTATE_AUTHENTICATION.coa}</li>
        <li className={META}>{ESTATE_AUTHENTICATION.printer}</li>
        <li className={cn(META, "text-ink/55")}>Original · {ORIGINAL_PROVENANCE}</li>
        <li className={META}>
          <Link to="/auth" className="underline underline-offset-4 hover:text-ink transition-colors">
            Authenticate a print →
          </Link>
        </li>
      </ul>
    </section>
    <section>
      <p className={cn(EYEBROW_MUTED, "m-0 mb-4")}>The edition &amp; materials</p>
      <p className={cn(META, "m-0")}>{ORIGINAL_PRINT_SPEC}</p>
    </section>
    <section>
      <p className={cn(EYEBROW_MUTED, "m-0 mb-4")}>Shipping &amp; care</p>
      <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
        <li className={META}>Each print is made to order and ships within 7–10 working days.</li>
        <li className={META}>Delivery is free worldwide — UK, Europe and beyond, framed or unframed — with nothing added at checkout.</li>
        <li className={META}>
          Damaged or lost in transit? See{" "}
          <Link to="/returns" className="underline underline-offset-4 hover:text-ink transition-colors">
            returns &amp; damages
          </Link>
          .
        </li>
      </ul>
    </section>
  </div>
);
