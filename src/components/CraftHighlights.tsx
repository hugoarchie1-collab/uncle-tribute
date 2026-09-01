import { Reveal } from "./Reveal";
import { cn } from "../lib/cn";
import { EYEBROW_MUTED } from "./ui/tokens";

/**
 * CraftHighlights — the DROOL "Exceptional print quality" + "Precision-milled
 * frames" benefit bands, in the estate's monochrome idiom: two scannable
 * checkmark lists that make the craft legible at a glance on the product page.
 *
 * ⚠️ Every bullet is literally true and traces to existing, vetted buyer copy
 * (the /faq answers + the buy-box material spec) — no upgraded or invented
 * claims. Monochrome (PDP rule); the tick is ink, not accent.
 */

const Check = () => (
  <svg
    viewBox="0 0 24 24"
    className="mt-[3px] h-[18px] w-[18px] shrink-0 text-ink/70"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const TickList = ({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string;
  title: string;
  items: string[];
}) => (
  <div>
    <p className={cn(EYEBROW_MUTED, "m-0 mb-2.5")}>{eyebrow}</p>
    <h3 className="font-display font-semibold tracking-[-0.02em] text-[clamp(21px,2.3vw,32px)] leading-[1.15] text-ink m-0 mb-6">
      {title}
    </h3>
    <ul className="list-none p-0 m-0 flex flex-col gap-3.5">
      {items.map((t) => (
        <li
          key={t}
          className="flex items-start gap-3 font-sans text-[15px] 3xl:text-[18px] 4xl:text-[21px] leading-[1.55] text-ink-soft m-0"
        >
          <Check />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  </div>
);

export const CraftHighlights = () => (
  <Reveal
    as="section"
    aria-label="Print quality and frames"
    className="mx-auto w-full max-w-[1180px] 2xl:max-w-[1320px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 mt-10 md:mt-14"
  >
    <div className="h-px w-full bg-line mb-9 md:mb-11" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 lg:gap-20">
      <TickList
        eyebrow="The print"
        title="Museum-quality giclée"
        items={[
          "Hahnemühle Photo Rag — 308gsm, 100% cotton archival paper",
          "Pigment inks on a 12-colour large-format giclée press",
          "Made to order at a Hahnemühle Certified Studio on the Sussex coast",
          "Archival, museum-grade lightfastness rated by the paper maker",
          "Also offered as a heavyweight 370gsm fine-art canvas print",
        ]}
      />
      <TickList
        eyebrow="The frame"
        title="Framed in solid wood"
        items={[
          "Solid-wood frame in oak, white or black — you choose",
          "A white window mount, included in the price",
          "Glazed with clear, edge-polished float glass",
          "One framed price whichever frame you pick — no upgrades",
          "Made to order, ready to hang, delivered free worldwide",
        ]}
      />
    </div>
  </Reveal>
);
