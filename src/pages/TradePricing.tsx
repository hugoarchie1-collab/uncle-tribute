import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Reveal } from "../components/Reveal";
import { Seo } from "../components/Seo";
import { SceneBackdrop } from "../components/SceneBackdrop";
import { PageMasthead } from "../components/PageMasthead";
import { TITLE, SUBTITLE, META, BTN_PRIMARY } from "../components/ui/tokens";
import { cn } from "../lib/cn";

// Clean, un-tracked labels for the sheet — NO wide letter-spacing / uppercase
// "eyebrow" styling (Hugo dislikes it). Plain, tight, legible.
const LABEL = "font-sans text-[13px] 3xl:text-[16px] 4xl:text-[19px] font-semibold text-accent m-0";
const LABEL_MUTED = "font-sans text-[13px] 3xl:text-[16px] 4xl:text-[19px] font-medium text-ink-muted m-0";
const CARD_LABEL = "font-sans text-[15px] 3xl:text-[18px] 4xl:text-[21px] font-semibold text-ink m-0";
const COL_LABEL = "font-sans text-[13px] 3xl:text-[16px] 4xl:text-[19px] font-semibold text-ink-muted m-0";

/**
 * /trade/pricing — the GATED trade price sheet.
 *
 * Reachable ONLY via the link the estate shares with an approved designer
 * (never public nav / footer / sitemap; noindex + robots Disallow). Access is
 * gated by a shared code checked server-side against TRADE_ACCESS_CODE (POST
 * /api/checkout kind:"trade-access") — no user-auth system.
 *
 * ⚠️ The trade FIGURES are assembled SERVER-SIDE and returned by the gate ONLY
 * after the code verifies (see api/checkout.ts buildTradeSheet). This client
 * imports NO trade numbers or trade math from src/data/paintings.ts, so the
 * trade %s never ship in the public JS bundle — they live only behind the gate
 * and in the estate's Stripe invoices (Hugo's non-negotiable). advertised ==
 * charged is guaranteed by construction: the sheet and the billing endpoint
 * (kind:"trade-quote") read the SAME TIERS retail + tradePricePence in one file.
 *
 * A print stylesheet renders it clean on white so a closer can save it as a PDF.
 */

// ── Server sheet shape (mirror of api/checkout.ts buildTradeSheet return) ──
interface TradeTierLegend {
  id: "standard" | "project" | "key";
  label: string;
  shortLabel: string;
  discountPercent: number;
  note: string;
}
interface TradeSheetRow {
  aLabel: string;
  size: string;
  tierLabel: string;
  finishLabel: string;
  retailPence: number;
  prices: Record<"standard" | "project" | "key", number>;
}
interface TradeSheetData {
  tiers: TradeTierLegend[];
  rows: TradeSheetRow[];
  projectThresholdLabel: string;
  keyThresholdLabel: string;
}

// Local currency formatter — a generic Intl helper, carries no trade data (so
// nothing trade-specific is imported into this client chunk).
const gbp = (pence: number): string =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);

type GateState = "checking" | "prompt" | "denied" | "granted";
// The verified sheet is cached (per browser session) so a reload re-renders it
// instantly on the authorised device. Only ever populated by a successful
// server verify — a forged flag alone can't produce the numbers.
const SHEET_KEY = "tasm.trade.pricing.sheet";

export const TradePricing = () => {
  const [params] = useSearchParams();
  const [gate, setGate] = useState<GateState>("checking");
  const [sheet, setSheet] = useState<TradeSheetData | null>(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // DEV-ONLY preview: `import.meta.env.DEV` is statically false in production
  // builds, so Vite dead-code-eliminates this whole branch (including the sample
  // figures) — it can NEVER grant access or leak numbers on the live site. It
  // exists solely so the sheet layout can be eyeballed with `npm run dev`
  // (serverless functions aren't available locally).
  const devPreview = import.meta.env.DEV && params.has("preview");

  // Verify the code with the server; on success returns the assembled sheet,
  // else null. Never defaults to granted on any error.
  const verify = async (candidate: string): Promise<TradeSheetData | null> => {
    const trimmed = candidate.trim();
    if (!trimmed) return null;
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "trade-access", code: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        sheet?: TradeSheetData;
      };
      if (res.ok && data.ok === true && data.sheet) return data.sheet;
      return null;
    } catch {
      return null;
    }
  };

  const grant = (s: TradeSheetData) => {
    try {
      sessionStorage.setItem(SHEET_KEY, JSON.stringify(s));
    } catch {
      /* non-fatal */
    }
    setSheet(s);
    setGate("granted");
  };

  // On mount: honour a dev preview, a cached sheet, or a ?code= deep link.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (devPreview) {
        // Dev-only sample (real figures) so the layout can be checked locally —
        // dead-code-eliminated from production (see devPreview note above).
        setSheet({
          tiers: [
            { id: "standard", label: "Trade account", shortLabel: "Trade", discountPercent: 30, note: "Approved trade account" },
            { id: "project", label: "Project", shortLabel: "Project", discountPercent: 35, note: "Single project — retail value £5,000 or more" },
            { id: "key", label: "Key / hospitality account", shortLabel: "Key account", discountPercent: 40, note: "Key or hospitality account — retail value £15,000 or more" },
          ],
          rows: [
            { aLabel: "A3", size: "29.5 × 29.5 cm", tierLabel: "Open Edition", finishLabel: "Framed or canvas", retailPence: 44500, prices: { standard: 31150, project: 28925, key: 26700 } },
            { aLabel: "A2", size: "42 × 42 cm", tierLabel: "Collector Edition", finishLabel: "Framed or canvas", retailPence: 75000, prices: { standard: 52500, project: 48750, key: 45000 } },
            { aLabel: "A1", size: "59.5 × 59.5 cm", tierLabel: "Atelier Edition", finishLabel: "Framed or canvas", retailPence: 130000, prices: { standard: 91000, project: 84500, key: 78000 } },
          ],
          projectThresholdLabel: "£5,000",
          keyThresholdLabel: "£15,000",
        });
        setGate("granted");
        return;
      }
      try {
        const cached = sessionStorage.getItem(SHEET_KEY);
        if (cached) {
          setSheet(JSON.parse(cached) as TradeSheetData);
          setGate("granted");
          return;
        }
      } catch {
        /* sessionStorage may be unavailable / corrupt — fall through to prompt */
      }
      const linked = params.get("code");
      if (linked) {
        const s = await verify(linked);
        if (cancelled) return;
        if (s) {
          grant(s);
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
    const s = await verify(code);
    setSubmitting(false);
    if (s) grant(s);
    else setGate("denied");
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
          <Reveal as="div" className="max-w-[640px] 3xl:max-w-[858px] 4xl:max-w-[1037px] pt-6 md:pt-10 no-print">
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
                    <span className={cn(COL_LABEL, "block mb-2")}>
                      Access code
                    </span>
                    <input
                      ref={inputRef}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Your trade access code"
                      className="w-full bg-bg ring-1 ring-line focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] 3xl:text-[18px] 4xl:text-[21px] text-ink placeholder:text-ink/30 transition-shadow"
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

        {gate === "granted" && sheet && <TradeSheet sheet={sheet} />}
      </main>

      <Footer />
    </div>
  );
};

// ── The sheet itself (renders server-assembled data) ─────────────────────────
const TradeSheet = ({ sheet }: { sheet: TradeSheetData }) => {
  const project = sheet.tiers.find((t) => t.id === "project");
  const key = sheet.tiers.find((t) => t.id === "key");
  // Move focus to the sheet heading when it reveals, so keyboard / screen-reader
  // users are advanced from the gate to the newly shown document.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    // A solid "document" panel so the numbers read crisply as estate stationery
    // laid on the wall, rather than floating on the atmospheric scene. Print CSS
    // flips it to white (see PRINT_CSS).
    <div className="trade-sheet relative bg-[#0b0a09]/92 ring-1 ring-line rounded-sm px-5 py-8 sm:px-8 md:px-12 md:py-12 shadow-liftLg">
      {/* Letterhead — estate mark → eyebrow → title, with the Save button
          (screen only) floated right. */}
      <Reveal as="header" className="pt-1 md:pt-2">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <img
              src="/logo/logo-seal-v9-w256.png"
              alt="The Mandala Company"
              width={112}
              height={112}
              className="trade-seal h-14 w-14 mb-4 select-none"
            />
            <p className={cn(LABEL, "mb-2.5")}>The estate of Stephen Meakin · Trade</p>
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
        <p className={cn(SUBTITLE, "max-w-[68ch] mt-5")}>
          Trade pricing is available on account. The figures below are the trade
          price for each size and finish — every piece is estate-stamped,
          numbered within its edition, and made to order. Held in confidence for
          your studio.
        </p>
      </Reveal>

      {/* Tier legend */}
      <Reveal as="div" className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sheet.tiers.map((t) => (
          <div key={t.id} className="border border-line p-4 flex flex-col">
            {/* min-height reserves two label lines so the % baselines align
                across all three cards even when a label wraps. */}
            <p className={cn(CARD_LABEL, "mb-1.5 leading-[1.3] min-h-[2.4em]")}>{t.label}</p>
            <p className="font-display text-ink m-0 text-[clamp(22px,2.4vw,30px)] leading-none">
              {t.discountPercent}% <span className="text-ink-muted text-[0.6em] align-middle">off retail</span>
            </p>
            <p className={cn(META, "m-0 mt-2 text-[14px] 3xl:text-[17px] 4xl:text-[20px]")}>{t.note}</p>
          </div>
        ))}
      </Reveal>

      {/* Price table */}
      <Reveal as="div" className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[660px] border-collapse text-left trade-table">
          <thead>
            <tr className="border-b border-ink/25">
              <th className={cn(COL_LABEL, "py-3 pr-4")}>Size</th>
              <th className={cn(COL_LABEL, "py-3 pr-4")}>Finish</th>
              <th className={cn(COL_LABEL, "py-3 pr-4 text-right")}>Retail</th>
              {sheet.tiers.map((t) => (
                <th
                  key={t.id}
                  className={cn(COL_LABEL, "py-3 pl-4 text-right whitespace-nowrap")}
                >
                  {t.shortLabel}
                  <span className="block text-ink-muted font-normal tracking-normal normal-case text-[13px] 3xl:text-[16px] 4xl:text-[19px]">
                    {t.discountPercent}% off
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((r) => (
              <tr key={`${r.aLabel}-${r.finishLabel}`} className="border-b border-line align-baseline">
                <td className="py-3.5 pr-4">
                  <span className="text-ink font-medium">{r.aLabel}</span>
                  <span className="block text-ink-muted text-[13px] 3xl:text-[16px] 4xl:text-[19px]">{r.size}</span>
                  <span className="block text-ink-muted text-[13px] 3xl:text-[16px] 4xl:text-[19px]">{r.tierLabel}</span>
                </td>
                <td className="py-3.5 pr-4 text-ink-muted text-[14px] 3xl:text-[17px] 4xl:text-[20px]">{r.finishLabel}</td>
                <td className="py-3.5 pr-4 text-right text-ink-muted tabular-nums line-through decoration-ink/30">
                  {gbp(r.retailPence)}
                </td>
                {sheet.tiers.map((t) => (
                  <td
                    key={t.id}
                    className={cn(
                      "py-3.5 pl-4 text-right tabular-nums whitespace-nowrap",
                      t.id === "standard" ? "text-ink font-semibold" : "text-ink",
                    )}
                  >
                    {gbp(r.prices[t.id])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>

      <Reveal as="div" className={cn(META, "mt-4 max-w-[72ch]")}>
        Standard trade pricing applies to every approved account.
        {project ? ` Project pricing (${project.discountPercent}%) applies from ${sheet.projectThresholdLabel} retail value in a single order;` : ""}
        {key ? ` key / hospitality pricing (${key.discountPercent}%) from ${sheet.keyThresholdLabel}.` : ""}{" "}
        Prices in GBP; all figures exclude any local import duties.
      </Reveal>

      {/* Terms */}
      <Reveal as="section" className="mt-12 border-t border-line pt-8">
        <p className={cn(LABEL, "mb-5")}>Terms</p>
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

      {/* Estate footer — prints, so a designer can act on the PDF. */}
      <Reveal as="div" className="mt-12 border-t border-line pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <p className={cn(CARD_LABEL, "text-ink-muted")}>
            The Mandala Company — the estate of Stephen Meakin
          </p>
          <p className={cn(LABEL_MUTED)}>
            info@themandalacompany.com · themandalacompany.com
          </p>
        </div>
        <p className={cn(META, "m-0 mt-3 text-[14px] 3xl:text-[17px] 4xl:text-[20px]")}>
          To place an order, send us the pieces, sizes and finishes — the estate
          confirms the trade price and issues a secure payment link. Pricing held
          in confidence for your studio.
        </p>
        <Link
          to="/trade"
          className={cn(META, "no-print inline-block mt-4 hover:text-accent transition-colors")}
        >
          ← Back to trade
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

// Print stylesheet — turns the dark web page into clean estate stationery.
// Prints ONLY the sheet (every other element — nav, footer, scene, film grain,
// cursor, cookie banner, the "Save as PDF" button — is hidden), on white, in one
// restrained, consistent type scale, all in dark ink so nothing reads faint.
const PRINT_CSS = `
@media print {
  /* margin:0 + white body fills the whole sheet edge-to-edge (no transparent
     page-margin that some viewers render dark); the content is padded instead. */
  @page { size: A4; margin: 0; }
  /* Kill every dark background the app paints, then make the page plain paper.
     (Belt-and-braces: transparent everywhere means even "background graphics on"
     prints white.) Borders use border-color, so they survive this. */
  /* Do NOT force print-color-adjust:exact — that would make Chrome print the app's
     dark backdrops even with "Background graphics" off. Instead strip every fill so
     the page is plain paper regardless of the buyer's print settings. */
  *, *::before, *::after { background: transparent !important; box-shadow: none !important; }
  html, body { background: #ffffff !important; }
  /* Kill EVERY fixed layer — the app's ambient backdrop (rendered at #root, OUTSIDE
     this page) + the page's scene backdrop + consent banner + cursor + music button.
     position:fixed paints edge-to-edge (into the margins) in print; nothing we want
     on paper is fixed, so this is the decisive fix for the dark page. */
  .fixed { display: none !important; }

  /* Reveal ONLY the sheet: hide all painting (incl. app-level fixed chrome that
     lives outside the page — cursor, consent banner, film grain, music), then
     turn the sheet subtree back on. */
  body * { visibility: hidden !important; }
  .trade-sheet-main, .trade-sheet-main * { visibility: visible !important; }
  /* Defeat the on-scroll Reveal fade so EVERY section prints (not just what was
     scrolled into view) — force full opacity, no transform. */
  .trade-sheet-main, .trade-sheet-main * { opacity: 1 !important; transform: none !important; }
  /* Drop the non-sheet flow siblings entirely so the sheet starts at the page
     top with no blank pages (nav / footer / scene backdrop). */
  .trade-sheet-root > *:not(.trade-sheet-main) { display: none !important; }
  .trade-sheet-main { display: block !important; padding: 15mm 16mm !important; margin: 0 !important; max-width: none !important; width: 100% !important; background: #ffffff !important; }
  .no-print, .no-print * { display: none !important; }

  /* The dark document panel → plain white paper. */
  .trade-sheet {
    position: static !important;
    background: #ffffff !important;
    box-shadow: none !important;
    border: 0 !important;
    border-radius: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  /* One clean, dark, consistent type scale — overrides the screen's fluid
     clamp()/token sizes so nothing is oversized or faint on paper. */
  .trade-sheet, .trade-sheet * {
    color: #1c1712 !important;
    text-shadow: none !important;
    letter-spacing: 0 !important;
    line-height: 1.45 !important;
  }
  .trade-sheet h1 { font-size: 25pt !important; line-height: 1.05 !important; margin: 0 0 6pt !important; letter-spacing: -0.02em !important; }
  .trade-sheet h3 { font-size: 12pt !important; line-height: 1.2 !important; margin: 0 0 3pt !important; }
  /* NOTE: no letter-spacing override — everything stays tight (the old
     [class*=tracking-] rule was spreading the title + labels apart). */
  /* Intro + terms body copy. */
  .trade-sheet p { font-size: 10.5pt !important; }

  /* Tier legend cards. */
  .trade-sheet .grid > div.border { padding: 10pt 12pt !important; break-inside: avoid; }
  .trade-sheet p.font-display { font-size: 15pt !important; line-height: 1 !important; }

  /* Price table — the centrepiece. Crisp, aligned, dark. */
  .trade-table { font-size: 10.5pt !important; }
  .trade-table th { font-size: 8pt !important; padding: 4pt 6pt !important; color: #6a6152 !important; }
  .trade-table th span { font-size: 7.5pt !important; }
  .trade-table td { padding: 7pt 6pt !important; }
  .trade-table td span.block { font-size: 8.5pt !important; color: #6a6152 !important; }
  .trade-table tbody tr { break-inside: avoid; }
  /* No "sale"-style strikethrough on paper — retail is a quiet reference. */
  .trade-sheet .line-through { text-decoration: none !important; color: #8a8272 !important; }

  /* Secondary text: a legible warm grey, never the faint on-screen grey. */
  .trade-sheet .text-ink-muted, .trade-sheet [class*="text-ink-muted"] { color: #6a6152 !important; }
  /* Hairlines. */
  .trade-sheet .border-line, .trade-sheet [class*="border-line"],
  .trade-sheet .border, .trade-table thead tr, .trade-table tbody tr,
  .trade-sheet [class*="border-t"] { border-color: #cfc7b6 !important; }
  .trade-table thead tr { border-bottom: 1.2pt solid #8a8272 !important; }

  .trade-sheet a { color: #1c1712 !important; text-decoration: none !important; }
  .trade-sheet section, .trade-sheet header { break-inside: avoid; }
}
`;
