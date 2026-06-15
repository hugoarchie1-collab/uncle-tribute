import { Link } from "react-router-dom";
import { ESTATE_AUTHENTICATION } from "../data/paintings";
import { EYEBROW_TIGHT, META } from "./ui/tokens";
import { cn } from "../lib/cn";

/**
 * AuthenticationCard — the buy box's trust anchor. Four estate-authentication
 * facts as a scannable list, ALL copy from the single-source
 * ESTATE_AUTHENTICATION constant (never hand-typed here), plus a quiet fifth
 * row linking to /verify so the COA claim is self-evidencing at the point of
 * purchase (same idiom as ProvenancePanel's link). Static, no motion.
 * Reverent: provenance facts, not badges or guarantees.
 */
type IconProps = { className?: string };

const baseSvg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const StampIcon = ({ className }: IconProps) => (
  <svg {...baseSvg} className={className}>
    <circle cx="12" cy="9" r="5" />
    <path d="M12 14v3M7 21h10M9 21l.5-4M15 21l-.5-4" />
  </svg>
);
const HashIcon = ({ className }: IconProps) => (
  <svg {...baseSvg} className={className}>
    <path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" />
  </svg>
);
const CertIcon = ({ className }: IconProps) => (
  <svg {...baseSvg} className={className}>
    <path d="M6 3h9l3 3v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    <path d="M8 8h6M8 11h6M8 14h3" />
    <circle cx="16" cy="18" r="3" />
    <path d="M14.5 20.5 13 23l3-1 3 1-1.5-2.5" />
  </svg>
);
const PrinterIcon = ({ className }: IconProps) => (
  <svg {...baseSvg} className={className}>
    <path d="M6 9V3h12v6" />
    <path d="M6 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1" />
    <path d="M7 15h10v6H7z" />
  </svg>
);

const ROWS = [
  { Icon: StampIcon, label: ESTATE_AUTHENTICATION.stampLabel, detail: ESTATE_AUTHENTICATION.stamp },
  { Icon: HashIcon, label: ESTATE_AUTHENTICATION.numberingLabel, detail: ESTATE_AUTHENTICATION.numbering },
  { Icon: CertIcon, label: ESTATE_AUTHENTICATION.coaLabel, detail: ESTATE_AUTHENTICATION.coa },
  { Icon: PrinterIcon, label: ESTATE_AUTHENTICATION.printerLabel, detail: ESTATE_AUTHENTICATION.printer },
];

export const AuthenticationCard = () => (
  <div className="ring-1 ring-line p-5">
    <ul className="list-none m-0 p-0 divide-y divide-line">
      {ROWS.map(({ Icon, label, detail }) => (
        <li
          key={label}
          className="grid grid-cols-[16px_1fr] gap-3 items-start py-2.5 first:pt-0"
        >
          <Icon className="w-4 h-4 mt-0.5 text-ink/55" />
          <span className="min-w-0">
            <span className={cn(EYEBROW_TIGHT, "block")}>{label}</span>
            <span className={cn(META, "block mt-0.5")}>{detail}</span>
          </span>
        </li>
      ))}
      {/* Quiet fifth row — the proof one click from the claim (mirrors the
          ProvenancePanel link's monochrome idiom; PaintingDetail stays
          accent-free). */}
      <li className="grid grid-cols-[16px_1fr] gap-3 items-start pt-2.5">
        <span aria-hidden="true" />
        <Link
          to="/auth"
          className={cn(
            META,
            "underline underline-offset-4 hover:text-ink transition-colors",
          )}
        >
          Authenticate this print →
        </Link>
      </li>
    </ul>
  </div>
);
