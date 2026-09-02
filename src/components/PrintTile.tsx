import { Link } from "react-router-dom";
import { AssetImage } from "./AssetImage";
import { useCurrency } from "../lib/currency";
import { cn } from "../lib/cn";
import { EYEBROW_MUTED, META } from "./ui/tokens";
import {
  getLowestTierPriceParts,
  paintingImageAlt,
  type Painting,
} from "../data/paintings";

/**
 * THE selling tile. ONE component, used by EVERY surface that offers a print:
 * /collections, /gift, the PDP "More from" rail, /search, /for-you, the quiz,
 * the home featured grid.
 *
 * ⚠️ WHY THIS EXISTS. The treatment used to be copy-pasted per page, so every
 * page drifted. Hugo caught it twice from the live site — first the PDP
 * companions, then /gift ("doesn't even show the products like on other pages,
 * for example the colourway options"). A tile is a PRICED OFFER: if it shows a
 * price it must also show what the buyer is choosing between. Copying the
 * markup to a new page is how that promise silently rots, so DON'T — import
 * this. A tile that needs a different size passes `basisClassName`/`sizes`,
 * never its own markup.
 *
 * The four rows are FIXED and always occupy their line, so a mixed row of dated
 * and undated works keeps one shared baseline:
 *   1 artwork (the chosen colourway) · 2 title · 3 year (or a spacer)
 *   4 price floor · 5 colourway dots (or a spacer)
 *
 * The price is the BUYABLE FLOOR (getLowestTierPriceParts — base + cheapest
 * finish), never the bare base: there are no unframed prints, so the base is
 * not checkoutable and showing it would advertise a price nobody can pay.
 * Parts (not a single total) so EUR/CAD convert per line exactly as the server
 * charges — see convertPartsFromGbpPence.
 */
export type PrintTileProps = {
  painting: Painting;
  /** Slot width for srcset. MUST mirror the basis, or the browser picks a source for the wrong slot. */
  sizes: string;
  /** Flex basis / width classes. The grid owns layout; the tile owns treatment. */
  basisClassName?: string;
  /** LCP tile only. */
  eager?: boolean;
  /** Controlled colourway (Collections lifts this so its set cards can read it). */
  selectedColourway?: string;
  onSelectColourway?: (paintingId: string, colourwayName: string) => void;
  /** Title scale. Defaults to the /collections size; rails pass a smaller step. */
  titleClassName?: string;
  /** Extra query appended to the PDP link (e.g. search attribution). */
  hrefSuffix?: string;
};

const SHADOW_TITLE = { textShadow: "0 2px 14px rgba(0,0,0,0.8)" };
const SHADOW_META = { textShadow: "0 1px 8px rgba(0,0,0,0.8)" };

export const PrintTile = ({
  painting,
  sizes,
  basisClassName,
  eager = false,
  selectedColourway,
  onSelectColourway,
  titleClassName = "text-[clamp(20px,1.45vw,30px)]",
  hrefSuffix = "",
}: PrintTileProps) => {
  const { formatPartsPretty: fmtPParts } = useCurrency();

  const availWays = painting.colourways.filter((c) => c.available);
  const cover =
    painting.colourways.find((c) => c.isOriginal && c.available) ??
    availWays[0] ??
    painting.colourways[0];

  // Uncontrolled tiles simply show the cover. Only Collections needs to lift
  // the choice (its set cards add the colourway the tile is showing), and it
  // passes both props; a tile given onSelect without a value would silently
  // ignore clicks, so the dots are only interactive when it is controlled.
  const chosenName = selectedColourway ?? cover?.name;
  const chosen = availWays.find((c) => c.name === chosenName) ?? cover;
  const interactive = typeof onSelectColourway === "function";

  const hasYear = !!painting.year && painting.year !== "[ DATE ]";
  const deepLink =
    chosen && cover && chosen.name !== cover.name
      ? `?c=${encodeURIComponent(chosen.name)}`
      : "";

  return (
    <figure className={cn("m-0 min-w-0", basisClassName)}>
      <Link
        to={`/collections/${painting.id}${deepLink}${
          deepLink ? hrefSuffix.replace(/^\?/, "&") : hrefSuffix
        }`}
        className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-[6px]"
        aria-label={`View ${painting.title}`}
      >
        <div className="aspect-square overflow-hidden ring-1 ring-line transition-all duration-500 group-hover:ring-accent/50 group-hover:shadow-liftLg">
          {/* Hover ZOOMS, never flicks to another colourway — the colourway
              changes only on a deliberate dot click (Hugo's rule). */}
          <div className="relative w-full h-full transition-transform duration-700 group-hover:scale-[1.04]">
            <AssetImage
              src={chosen?.image ?? ""}
              alt={paintingImageAlt(painting.title, chosen?.name)}
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              sizes={sizes}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <figcaption className="pt-3 md:pt-4 text-center">
          <h3
            className={cn(
              "font-display font-semibold leading-[1.2] tracking-[-0.025em] text-ink m-0 min-h-[2.4em] flex items-center justify-center transition-colors duration-300 group-hover:text-accent",
              titleClassName,
            )}
            style={SHADOW_TITLE}
          >
            {painting.title}
          </h3>
          {/* Undated works render an invisible spacer, never blank-looking copy. */}
          <p
            className={cn(EYEBROW_MUTED, "mt-1.5 m-0")}
            aria-hidden={!hasYear}
            style={SHADOW_META}
          >
            {hasYear ? painting.year : " "}
          </p>
          <p className={cn(META, "mt-2 m-0")} style={SHADOW_META}>
            Estate-stamped giclée, framed · from{" "}
            <span className="font-semibold text-ink [font-variant-numeric:tabular-nums]">
              {fmtPParts(getLowestTierPriceParts(painting))}
            </span>
          </p>
        </figcaption>
      </Link>
      {/* Colourway row. Sits OUTSIDE the Link (a button cannot nest in an
          anchor). Reserved h-5 keeps captions baseline-aligned across a row
          where some works have one colourway. Price is identical across
          colourways, so set totals never move when this changes. */}
      {availWays.length > 1 ? (
        <div
          role="group"
          aria-label={`Colourway for ${painting.title}`}
          className="mt-2.5 flex h-5 items-center justify-center gap-1.5"
        >
          {availWays.slice(0, 5).map((c) => {
            const sel = c.name === chosenName;
            return interactive ? (
              <button
                key={c.name}
                type="button"
                aria-pressed={sel}
                aria-label={`${painting.title} — ${c.name}`}
                title={c.name}
                onClick={() => onSelectColourway?.(painting.id, c.name)}
                className={cn(
                  "block h-2.5 w-2.5 rounded-full ring-1 transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  sel
                    ? "ring-2 ring-accent scale-125"
                    : "ring-line/80 hover:ring-accent/60",
                )}
                style={{ backgroundColor: c.hex }}
              />
            ) : (
              // Read-only surfaces still SHOW the choice exists — that is the
              // information the buyer is missing, and it is what makes the tile
              // legible as an offer. The whole tile links to the PDP to act on it.
              <span
                key={c.name}
                title={c.name}
                aria-hidden="true"
                className={cn(
                  "block h-2.5 w-2.5 rounded-full ring-1",
                  sel ? "ring-2 ring-accent scale-125" : "ring-line/80",
                )}
                style={{ backgroundColor: c.hex }}
              />
            );
          })}
          <span
            className="ml-1 font-sans text-[13px] 3xl:text-[14px] leading-none tracking-[0.04em] text-ink-muted"
            style={SHADOW_META}
          >
            {availWays.length} colourways
          </span>
        </div>
      ) : (
        <div aria-hidden="true" className="mt-2.5 h-5" />
      )}
    </figure>
  );
};
