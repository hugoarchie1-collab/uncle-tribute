import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { PageMasthead } from "../components/PageMasthead";
import {
  EYEBROW,
  EYEBROW_MUTED,
  EYEBROW_TIGHT,
  TITLE,
  SUBTITLE,
  META,
  BTN_PRIMARY,
} from "../components/ui/tokens";
import { cn } from "../lib/cn";
import {
  PRINT_TIERS,
  TRADE_TIERS,
  TRADE_TIER_ORDER,
  tradePricePence,
  tierRetailLinePence,
  formatGBP,
  type PrintTier,
  type TradeTierId,
} from "../data/paintings";

/**
 * /trade/pricing — the GATED trade price sheet.
 *
 * Reachable ONLY via the link the estate shares with an approved designer
 * (never public nav / footer / sitemap; noindex + robots Disallow). Access is
 * gated by a shared code checked server-side against TRADE_ACCESS_CODE (POST
 * /api/checkout kind:"trade-access") — no user-auth system, mirroring the
 * env-gated pattern used elsewhere. Wrong / absent code → a dignified "request
 * access" state pointing back to the trade application.
 *
 * Every trade PRICE is DERIVED LIVE from src/data/paintings.ts (PRINT_TIERS +
 * TRADE_TIERS) — there is never a second hardcoded price list. The 30/35/40%
 * tiers apply to the FULL retail line (base + finish). Because the admin billing
 * endpoint (kind:"trade-quote") mints its Stripe payment link from the SAME
 * formula off the SAME retail, the sheet figure equals the charge to the penny.
 *
 * A print stylesheet renders it clean on white so a closer can save it as a PDF.
 */

// A-series label per tier id, for a designer-legible size column.
const A_LABEL: Record<PrintTier["id"], string> = {
  atelier: "A3",
  collector: "A2",
  "atelier-grande": "A1",
  heirloom: "A0",
  studio: "",
};

interface SheetRow {
  key: string;
  aLabel: string;
  size: string;
  tierLabel: string;
  finishLabel: string;
  retailPence: number;
}

/**
 * The sheet rows, derived from PRINT_TIERS. Only AVAILABLE, non-one-off tiers
 * that offer a finish appear (so A0 auto-drops while hidden — "where
 * available"). Framed and canvas share a price today, so a size collapses to a
 * single "Framed or canvas" row; if the two ever diverge they split cleanly.
 */
const buildSheetRows = (): SheetRow[] => {
  const rows: SheetRow[] = [];
  for (const tier of PRINT_TIERS) {
    if (!tier.available || tier.isOneOff) continue;
    const framed = tierRetailLinePence(tier, "framed");
    const canvas = tierRetailLinePence(tier, "canvas");
    const entries: { label: string; pence: number }[] = [];
    if (framed !== null && canvas !== null && framed === canvas) {
      entries.push({ label: "Framed or canvas", pence: framed });
    } else {
      if (framed !== null) entries.push({ label: "Framed", pence: framed });
      if (canvas !== null) entries.push({ label: "Canvas", pence: canvas });
    }
    for (const e of entries) {
      rows.push({
        key: `${tier.id}-${e.label}`,
        aLabel: A_LABEL[tier.id] || "",
        size: tier.size,
        tierLabel: tier.label,
        finishLabel: e.label,
        retailPence: e.pence,
      });
    }
  }
  return rows;
};

type GateState = "checking" | "prompt" | "denied" | "granted";
const GRANT_KEY = "tasm.trade.pricing.granted";

export const TradePricing = () => {
  const [params] = useSearchParams();
  const [gate, setGate] = useState<GateState>("checking");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rows = useMemo(() => buildSheetRows(), []);

  // DEV-ONLY preview: `import.meta.env.DEV` is statically false in production
  // builds, so Vite dead-code-eliminates this whole branch — it can NEVER grant
  // access on the live site. It exists solely so the sheet can be visually
  // checked with `npm run dev` (serverless functions aren't available locally).
  const devPreview = import.meta.env.DEV && params.has("preview");

  const verify = async (candidate: string): Promise<boolean> => {
    const trimmed = candidate.trim();
    if (!trimmed) return false;
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "trade-access", code: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      return res.ok && data.ok === true;
    } catch {
      return false;
    }
  };

  // On mount: honour a dev preview, a remembered grant, or a ?code= deep link.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (devPreview) {
        setGate("granted");
        return;
      }
      try {
        if (sessionStorage.getItem(GRANT_KEY) === "1") {
          setGate("granted");
          return;
        }
      } catch {
        /* sessionStorage may be unavailable — fall through to the prompt */
      }
      const linked = params.get("code");
      if (linked) {
        const ok = await verify(linked);
        if (cancelled) return;
        if (ok) {
          try {
            sessionStorage.setItem(GRANT_KEY, "1");
          } catch {
            /* non-fatal */
          }
          setGate("granted");
          return;
        }
        setGate("denied");
        return;
      }
      setGate("prompt");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (gate === "prompt" || gate === "denied") inputRef.current?.focus();
  }, [gate]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = await verify(code);
    setSubmitting(false);
    if (ok) {
      try {
        sessionStorage.setItem(GRANT_KEY, "1");
      } catch {
        /* non-fatal */
      }
      setGate("granted");
    } else {
      setGate("denied");
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip trade-sheet-root">
      <SceneBackdrop src="/img/scenes/trade-scene-v3.webp" />
      <Seo
        title="Trade price sheet"
        description="Estate trade pricing for approved designers and hospitality accounts."
        url="/trade/pricing"
        noindex
      />
      {/* Print stylesheet — a closer saves the sheet as a clean white PDF. */}
      <style>{PRINT_CSS}</style>
      <Nav />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1180px] 2xl:max-w-[1320px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-12 pb-16 md:pb-20 trade-sheet-main">
        {gate === "checking" && (
          <div className="min-h-[42vh] flex items-center">
            <p className={cn(META, "m-0")}>Checking access…</p>
          </div>
        )}

        {(gate === "prompt" || gate === "denied") && (
          <Reveal as="div" className="max-w-[640px] pt-6 md:pt-10 no-print">
            <PageMasthead
              eyebrow="Trade & Interior Design"
              meta="By introduction"
              title={
                <>
                  Trade{" "}
                  <em
                    className="italic font-normal"
                    style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}
                  >
                    price sheet
                  </em>
                  .
                </>
              }
            >
              <div className="mt-5 border-t border-line pt-5">
                <p className={cn(SUBTITLE, "max-w-none m-0")}>
                  This sheet is shared privately with approved trade accounts.
                  Enter the access code the estate sent you. If you don't have
                  one yet, it comes with your{" "}
                  <Link
                    to="/trade"
                    className="text-accent hover:underline underline-offset-2"
                  >
                    trade application
                  </Link>
                  .
                </p>

                <form onSubmit={onSubmit} className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-end">
                  <label className="block flex-1">
                    <span
                      className={cn(EYEBROW_TIGHT, "block mb-2")}
                    >
                      Access code
                    </span>
                    <input
                      ref={inputRef}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Your trade access code"
                      className="w-full bg-bg ring-1 ring-line focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 transition-shadow"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={submitting || !code.trim()}
                    className={cn(BTN_PRIMARY, "disabled:opacity-55")}
                  >
                    {submitting ? "Checking…" : "View pricing"}
                    <span aria-hidden="true" className="ml-2">→</span>
                  </button>
                </form>

                {gate === "denied" && (
                  <p className={cn(META, "mt-4 m-0 text-accent")}>
                    That code wasn't recognised. Check it and try again, or reply
                    to the estate's email and we'll re-send it.
                  </p>
                )}

                <p className={cn(META, "mt-6 m-0")}>
                  Not set up on account yet?{" "}
                  <Link
                    to="/trade"
                    className="text-accent hover:underline underline-offset-2"
                  >
                    Make a trade application →
                  </Link>
                </p>
              </div>
            </PageMasthead>
          </Reveal>
        )}

        {gate === "granted" && <TradeSheet rows={rows} />}
      </main>

      <Footer />
    </div>
  );
};

// ── The sheet itself ─────────────────────────────────────────────────────────
const TradeSheet = ({ rows }: { rows: SheetRow[] }) => {
  const project = TRADE_TIERS.project;
  const key = TRADE_TIERS.key;
  const projectLabel = `£${(project.minRetailPence / 100).toLocaleString("en-GB")}`;
  const keyLabel = `£${(key.minRetailPence / 100).toLocaleString("en-GB")}`;
  // Move focus to the sheet heading when it reveals, so keyboard / screen-reader
  // users are advanced from the gate to the newly shown document.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    // A solid "document" panel so the numbers read crisply as estate stationery
    // laid on the wall, rather than floating on the atmospheric scene. The scene
    // stays visible around the panel + behind the nav. Print CSS flips it to
    // white (see PRINT_CSS).
    <div className="trade-sheet relative bg-[#0b0a09]/92 ring-1 ring-line rounded-sm px-5 py-8 sm:px-8 md:px-12 md:py-12 shadow-liftLg">
      {/* Header — kept simple so it prints cleanly. */}
      <Reveal as="header" className="pt-1 md:pt-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className={cn(EYEBROW, "m-0 mb-3")}>The estate of Stephen Meakin · Trade</p>
            <h1 ref={headingRef} tabIndex={-1} className={cn(TITLE, "m-0 max-w-none outline-none")}>Trade price sheet.</h1>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className={cn(BTN_PRIMARY, "no-print shrink-0")}
          >
            Save as PDF
            <span aria-hidden="true" className="ml-2">↧</span>
          </button>
        </div>
        <p className={cn(SUBTITLE, "max-w-[68ch] mt-4")}>
          Trade pricing is available on account. The figures below are the trade
          price for each size and finish — every piece is estate-stamped,
          numbered within its edition, and made to order. Held in confidence for
          your studio.
        </p>
      </Reveal>

      {/* Tier legend */}
      <Reveal as="div" className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TRADE_TIER_ORDER.map((id) => {
          const t = TRADE_TIERS[id];
          return (
            <div key={id} className="border border-line p-4">
              <p className={cn(EYEBROW_TIGHT, "m-0 mb-1.5")}>{t.label}</p>
              <p className="font-display text-ink m-0 text-[clamp(22px,2.4vw,30px)] leading-none">
                {t.discountPercent}% <span className="text-ink-muted text-[0.6em] align-middle">off retail</span>
              </p>
              <p className={cn(META, "m-0 mt-2 text-[14px]")}>{t.note}</p>
            </div>
          );
        })}
      </Reveal>

      {/* Price table */}
      <Reveal as="div" className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[660px] border-collapse text-left trade-table">
          <thead>
            <tr className="border-b border-ink/25">
              <th className={cn(EYEBROW_TIGHT, "py-3 pr-4 font-bold")}>Size</th>
              <th className={cn(EYEBROW_TIGHT, "py-3 pr-4 font-bold")}>Finish</th>
              <th className={cn(EYEBROW_TIGHT, "py-3 pr-4 font-bold text-right")}>Retail</th>
              {TRADE_TIER_ORDER.map((id) => (
                <th
                  key={id}
                  className={cn(EYEBROW_TIGHT, "py-3 pl-4 font-bold text-right whitespace-nowrap")}
                >
                  {TRADE_TIERS[id].shortLabel}
                  <span className="block text-ink-muted font-normal tracking-normal normal-case text-[12px]">
                    {TRADE_TIERS[id].discountPercent}% off
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-line align-baseline">
                <td className="py-3.5 pr-4">
                  <span className="text-ink font-medium">{r.aLabel}</span>
                  <span className="block text-ink-muted text-[13px]">{r.size}</span>
                  <span className="block text-ink-muted text-[12px]">{r.tierLabel}</span>
                </td>
                <td className="py-3.5 pr-4 text-ink-muted text-[14px]">{r.finishLabel}</td>
                <td className="py-3.5 pr-4 text-right text-ink-muted tabular-nums line-through decoration-ink/30">
                  {formatGBP(r.retailPence)}
                </td>
                {TRADE_TIER_ORDER.map((id) => (
                  <td
                    key={id}
                    className={cn(
                      "py-3.5 pl-4 text-right tabular-nums whitespace-nowrap",
                      id === "standard" ? "text-ink font-semibold" : "text-ink",
                    )}
                  >
                    {formatGBP(tradePricePence(r.retailPence, id as TradeTierId))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>

      <Reveal as="div" className={cn(META, "mt-4 max-w-[72ch]")}>
        Standard trade pricing applies to every approved account. Project pricing
        ({project.discountPercent}%) applies from {projectLabel} retail value in a
        single order; key / hospitality pricing ({key.discountPercent}%) from{" "}
        {keyLabel}. Prices in GBP; all figures exclude any local import duties.
      </Reveal>

      {/* Terms */}
      <Reveal as="section" className="mt-12 border-t border-line pt-8">
        <p className={cn(EYEBROW, "m-0 mb-5")}>Terms</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-7">
          {TERMS.map((t) => (
            <div key={t.title}>
              <h3 className="font-display text-ink m-0 text-[clamp(17px,1.7vw,21px)] leading-tight">
                {t.title}
              </h3>
              <p className={cn(SUBTITLE, "max-w-none mt-2")}>{t.body}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal as="div" className="mt-10 border-t border-line pt-6 flex flex-wrap items-center justify-between gap-4 no-print">
        <p className={cn(EYEBROW_MUTED, "m-0")}>
          The Mandala Company · info@themandalacompany.com
        </p>
        <Link
          to="/trade"
          className={cn(META, "hover:text-accent transition-colors")}
        >
          Back to trade →
        </Link>
      </Reveal>
    </div>
  );
};

const TERMS: { title: string; body: string }[] = [
  {
    title: "Lead times",
    body: "Every piece is made to order and dispatched within 7–10 working days. Hand-finishing adds up to a further two weeks; bespoke commissions are quoted with their own timeline, confirmed before any commitment.",
  },
  {
    title: "Delivery",
    body: "Free worldwide delivery is included on every order — we can drop-ship directly to your client or to site, timed to the install. International orders may still incur local import duties set by the destination.",
  },
  {
    title: "How to order",
    body: "Send us the pieces, sizes and finishes for the project. The estate confirms the trade price and issues a Stripe payment link (or invoice) for the order — no account setup or card details are taken on this page.",
  },
  {
    title: "Returns",
    body: "As made-to-order works produced to your specification, trade orders are not returnable once in production, save for our obligations where a piece arrives damaged or faulty — tell us within 48 hours of delivery and we will put it right.",
  },
];

// Print stylesheet — hide the atmosphere / nav / footer and lay the sheet on
// white so a closer's PDF reads like estate stationery, not a dark web page.
const PRINT_CSS = `
@media print {
  .trade-sheet-root { background: #ffffff !important; }
  .trade-sheet-root .no-print { display: none !important; }
  /* Hide the fixed scene backdrop, film grain, nav and footer. */
  .trade-sheet-root nav, .trade-sheet-root footer { display: none !important; }
  .trade-sheet-root [aria-hidden="true"].fixed, .trade-sheet-root .fixed { display: none !important; }
  .trade-sheet-main { padding: 0 !important; max-width: none !important; }
  /* The dark document panel flips to plain white estate stationery for print. */
  .trade-sheet {
    background: #ffffff !important;
    box-shadow: none !important;
    border: 0 !important;
    padding: 0 !important;
  }
  .trade-sheet, .trade-sheet * {
    color: #14110e !important;
    text-shadow: none !important;
  }
  .trade-sheet .text-ink-muted, .trade-sheet [class*="text-ink-muted"] { color: #5a544a !important; }
  .trade-sheet .border-line, .trade-sheet [class*="border-line"] { border-color: #d8cfbe !important; }
  .trade-table th, .trade-table td { padding-top: 8px !important; padding-bottom: 8px !important; }
  .trade-table thead tr, .trade-table tbody tr { border-color: #b9ad97 !important; }
  a { color: #14110e !important; text-decoration: none !important; }
}
`;
