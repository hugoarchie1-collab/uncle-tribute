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

/**
 * /partners/terms — the GATED partner commission sheet (the SELL side; distinct
 * from /trade/pricing which is the trade BUY discount). Reachable ONLY via the
 * link + code the estate shares privately with an approved partner (never public
 * nav / footer / sitemap; noindex + robots Disallow).
 *
 * ⚠️ The commission FIGURES are assembled SERVER-SIDE and returned by the gate
 * ONLY after the code verifies (api/checkout.ts buildPartnerTerms, POST
 * kind:"partner-terms" vs PARTNER_TERMS_CODE). This client imports NO commission
 * numbers, so the rates never ship in the public JS bundle — they live only
 * behind the gate and on private agreements (the estate's price-silent posture).
 * A print stylesheet renders it clean on white so a partner can save a PDF.
 */

const LABEL = "font-sans text-[13px] 3xl:text-[16px] 4xl:text-[19px] font-semibold text-accent m-0";
const LABEL_MUTED = "font-sans text-[13px] 3xl:text-[16px] 4xl:text-[19px] font-medium text-ink-muted m-0";
const CARD_LABEL = "font-sans text-[15px] 3xl:text-[18px] 4xl:text-[21px] font-semibold text-ink m-0";
const COL_LABEL = "font-sans text-[13px] 3xl:text-[16px] 4xl:text-[19px] font-semibold text-ink-muted m-0";

// ── Server terms shape (mirror of api/checkout.ts buildPartnerTerms return) ──
interface PartnerTier {
  id: "associate" | "partner" | "key";
  label: string;
  shortLabel: string;
  ratePercent: number;
  note: string;
}
interface PartnerExample {
  salePence: number;
  commissions: Record<"associate" | "partner" | "key", number>;
}
interface PartnerTermsData {
  tiers: PartnerTier[];
  residualPercent: number;
  examples: PartnerExample[];
  basis: string;
}

const gbp = (pence: number): string =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(pence / 100);

type GateState = "checking" | "prompt" | "denied" | "granted";
const TERMS_KEY = "tasm.partner.terms";

export const PartnerTerms = () => {
  const [params] = useSearchParams();
  const [gate, setGate] = useState<GateState>("checking");
  const [terms, setTerms] = useState<PartnerTermsData | null>(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const devPreview = import.meta.env.DEV && params.has("preview");

  const verify = async (candidate: string): Promise<PartnerTermsData | null> => {
    const trimmed = candidate.trim();
    if (!trimmed) return null;
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "partner-terms", code: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; terms?: PartnerTermsData };
      if (res.ok && data.ok === true && data.terms) return data.terms;
      return null;
    } catch {
      return null;
    }
  };

  const grant = (t: PartnerTermsData) => {
    try {
      sessionStorage.setItem(TERMS_KEY, JSON.stringify(t));
    } catch {
      /* non-fatal */
    }
    setTerms(t);
    setGate("granted");
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (devPreview) {
        setTerms({
          tiers: [
            { id: "associate", label: "Associate", shortLabel: "Associate", ratePercent: 15, note: "Every approved partner, on every introduction." },
            { id: "partner", label: "Partner", shortLabel: "Partner", ratePercent: 20, note: "A single placement of £5,000+ in works, or £10,000 of introductions to date." },
            { id: "key", label: "Key partner", shortLabel: "Key", ratePercent: 25, note: "A single placement of £20,000+ in works, or £50,000 to date — hospitality & multi-room." },
          ],
          residualPercent: 10,
          examples: [
            { salePence: 250000, commissions: { associate: 37500, partner: 50000, key: 62500 } },
            { salePence: 500000, commissions: { associate: 75000, partner: 100000, key: 125000 } },
            { salePence: 1500000, commissions: { associate: 225000, partner: 300000, key: 375000 } },
          ],
          basis: "the net sale value — the price of the works only, excluding any tax and the (free) shipping — on completed orders that are not refunded.",
        });
        setGate("granted");
        return;
      }
      try {
        const cached = sessionStorage.getItem(TERMS_KEY);
        if (cached) {
          setTerms(JSON.parse(cached) as PartnerTermsData);
          setGate("granted");
          return;
        }
      } catch {
        /* fall through */
      }
      const linked = params.get("code");
      if (linked) {
        const t = await verify(linked);
        if (cancelled) return;
        if (t) {
          grant(t);
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
    const t = await verify(code);
    setSubmitting(false);
    if (t) grant(t);
    else setGate("denied");
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip partner-sheet-root">
      <SceneBackdrop src="/img/scenes/trade-scene-v3.webp" />
      <Seo
        title="Partner commission"
        description="Private commission terms for approved partners of the estate of Stephen Meakin."
        url="/partners/terms"
        noindex
      />
      <style>{PRINT_CSS}</style>
      <Nav />

      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1180px] 2xl:max-w-[1320px] 3xl:max-w-[92vw] 4xl:max-w-[94vw] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-12 pb-16 md:pb-20 partner-sheet-main">
        {gate === "checking" && (
          <div className="min-h-[42vh] flex items-center">
            <p className={cn(META, "m-0")}>Checking access…</p>
          </div>
        )}

        {(gate === "prompt" || gate === "denied") && (
          <Reveal as="div" className="max-w-[640px] 3xl:max-w-[858px] 4xl:max-w-[1037px] pt-6 md:pt-10 no-print">
            <PageMasthead
              eyebrow="Partners · By invitation"
              meta="Private"
              title={
                <>
                  Partner{" "}
                  <em className="italic font-normal" style={{ fontVariationSettings: '"opsz" 40, "wght" 400' }}>
                    terms
                  </em>
                  .
                </>
              }
            >
              <div className="mt-5 border-t border-line pt-5">
                <p className={cn(SUBTITLE, "max-w-none m-0")}>
                  These terms are shared privately with approved partners. Enter the access code the
                  estate sent you. If you'd like to become a partner, start with a{" "}
                  <Link to="/trade" className="text-accent hover:underline underline-offset-2">
                    conversation
                  </Link>
                  .
                </p>

                <form onSubmit={onSubmit} className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-end">
                  <label className="block flex-1">
                    <span className={cn(COL_LABEL, "block mb-2")}>Access code</span>
                    <input
                      ref={inputRef}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Your partner access code"
                      className="w-full bg-bg ring-1 ring-line focus:ring-accent focus:outline-none px-4 py-3 font-sans text-[15px] 3xl:text-[18px] 4xl:text-[21px] text-ink placeholder:text-ink/30 transition-shadow"
                    />
                  </label>
                  <button type="submit" disabled={submitting || !code.trim()} className={cn(BTN_PRIMARY, "disabled:opacity-55")}>
                    {submitting ? "Checking…" : "View terms"}
                    <span aria-hidden="true" className="ml-2">→</span>
                  </button>
                </form>

                {gate === "denied" && (
                  <p className={cn(META, "mt-4 m-0 text-accent")}>
                    That code wasn't recognised. Check it and try again, or reply to the estate's
                    email and we'll re-send it.
                  </p>
                )}
              </div>
            </PageMasthead>
          </Reveal>
        )}

        {gate === "granted" && terms && <TermsSheet terms={terms} />}
      </main>

      <Footer />
    </div>
  );
};

const TermsSheet = ({ terms }: { terms: PartnerTermsData }) => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="partner-sheet relative bg-[#0b0a09]/92 ring-1 ring-line rounded-sm px-5 py-8 sm:px-8 md:px-12 md:py-12 shadow-liftLg">
      <Reveal as="header" className="pt-1 md:pt-2">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <img src="/logo/logo-seal-v9-w256.png" alt="The Mandala Company" width={112} height={112} className="partner-seal h-14 w-14 mb-4 select-none" />
            <p className={cn(LABEL, "mb-2.5")}>The estate of Stephen Meakin · Partners</p>
            <h1 ref={headingRef} tabIndex={-1} className={cn(TITLE, "m-0 max-w-none outline-none")}>Partner commission.</h1>
          </div>
          <button type="button" onClick={() => window.print()} className={cn(BTN_PRIMARY, "no-print shrink-0")}>
            Save as PDF
            <span aria-hidden="true" className="ml-2">↧</span>
          </button>
        </div>
        <p className={cn(SUBTITLE, "max-w-[68ch] mt-5")}>
          You introduce a client or a room; the estate prices, makes, frames and delivers. You share
          in every placement — paid on {terms.basis} Held in confidence, between us.
        </p>
      </Reveal>

      {/* Tier legend */}
      <Reveal as="div" className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {terms.tiers.map((t) => (
          <div key={t.id} className="border border-line p-4 flex flex-col">
            <p className={cn(CARD_LABEL, "mb-1.5 leading-[1.3] min-h-[2.4em]")}>{t.label}</p>
            <p className="font-display text-ink m-0 text-[clamp(22px,2.4vw,30px)] leading-none">
              {t.ratePercent}% <span className="text-ink-muted text-[0.6em] align-middle">commission</span>
            </p>
            <p className={cn(META, "m-0 mt-2 text-[14px] 3xl:text-[17px] 4xl:text-[20px]")}>{t.note}</p>
          </div>
        ))}
      </Reveal>

      {/* Worked examples — what an introduction earns */}
      <Reveal as="div" className="mt-8 overflow-x-auto">
        <p className={cn(LABEL, "mb-3")}>What an introduction earns</p>
        <table className="w-full min-w-[560px] border-collapse text-left partner-table">
          <thead>
            <tr className="border-b border-ink/25">
              <th className={cn(COL_LABEL, "py-3 pr-4")}>Placement (works)</th>
              {terms.tiers.map((t) => (
                <th key={t.id} className={cn(COL_LABEL, "py-3 pl-4 text-right whitespace-nowrap")}>
                  {t.shortLabel}
                  <span className="block text-ink-muted font-normal tracking-normal normal-case text-[13px] 3xl:text-[16px] 4xl:text-[19px]">
                    {t.ratePercent}%
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {terms.examples.map((ex) => (
              <tr key={ex.salePence} className="border-b border-line align-baseline">
                <td className="py-3.5 pr-4 text-ink font-medium tabular-nums">{gbp(ex.salePence)}</td>
                {terms.tiers.map((t) => (
                  <td key={t.id} className={cn("py-3.5 pl-4 text-right tabular-nums whitespace-nowrap", t.id === "associate" ? "text-ink font-semibold" : "text-ink")}>
                    {gbp(ex.commissions[t.id])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>

      <Reveal as="div" className="font-sans text-[clamp(16px,0.55vw+9px,24px)] leading-[1.55] text-ink-muted mt-4 max-w-[72ch]">
        Associate applies to every approved partner. Partner and Key rates unlock with the placement
        size or your introductions to date (see each tier). Repeat orders from a client you first
        introduced carry a {terms.residualPercent}% residual for 24 months — so the accounts you open
        keep paying you as they reorder. Figures in GBP.
      </Reveal>

      {/* Terms */}
      <Reveal as="section" className="mt-12 border-t border-line pt-8">
        <p className={cn(LABEL, "mb-5")}>How it works</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-7">
          {HOW.map((t) => (
            <div key={t.title}>
              <h3 className="font-display text-ink m-0 text-[clamp(17px,1.7vw,21px)] leading-tight">{t.title}</h3>
              <p className={cn(SUBTITLE, "max-w-none mt-2")}>{t.body}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal as="div" className="mt-12 border-t border-line pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <p className={cn(CARD_LABEL, "text-ink-muted")}>The Mandala Company — the estate of Stephen Meakin</p>
          <p className={cn(LABEL_MUTED)}>info@themandalacompany.com · themandalacompany.com</p>
        </div>
        <p className="font-sans text-[clamp(16px,0.55vw+9px,24px)] leading-[1.55] text-ink-muted m-0 mt-3">
          Terms are confirmed in a short written agreement before any introduction is credited.
          Commission is calculated on completed, non-refunded orders and settled monthly.
        </p>
        <Link to="/trade" className={cn(META, "no-print inline-block mt-4 hover:text-accent transition-colors")}>
          ← Back to Partners
        </Link>
      </Reveal>
    </div>
  );
};

const HOW: { title: string; body: string }[] = [
  {
    title: "You're credited automatically",
    body: "Share your personal link (themandalacompany.com/?ref=YOUR-CODE). Any order it leads to is tagged to you — no forms, no chasing.",
  },
  {
    title: "The estate does the work",
    body: "Pricing, production, framing and worldwide delivery are all handled by the family. Your name opens the door; ours does the rest.",
  },
  {
    title: "Paid monthly, in confidence",
    body: "Commission on completed, non-refunded orders is settled to you monthly. Your clients stay yours; terms stay private.",
  },
  {
    title: "It compounds",
    body: "Bigger placements move you up a tier, and repeat orders from accounts you opened keep paying a residual — so the relationships you build keep earning.",
  },
];

const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 0; }
  *, *::before, *::after { background: transparent !important; box-shadow: none !important; }
  html, body { background: #ffffff !important; }
  .fixed { display: none !important; }
  body * { visibility: hidden !important; }
  .partner-sheet-main, .partner-sheet-main * { visibility: visible !important; }
  .partner-sheet-main, .partner-sheet-main * { opacity: 1 !important; transform: none !important; }
  .partner-sheet-root > *:not(.partner-sheet-main) { display: none !important; }
  .partner-sheet-main { display: block !important; padding: 15mm 16mm !important; margin: 0 !important; max-width: none !important; width: 100% !important; background: #ffffff !important; }
  .no-print, .no-print * { display: none !important; }
  .partner-sheet { position: static !important; background: #ffffff !important; box-shadow: none !important; border: 0 !important; border-radius: 0 !important; padding: 0 !important; margin: 0 !important; }
  .partner-sheet, .partner-sheet * { color: #1c1712 !important; text-shadow: none !important; letter-spacing: 0 !important; line-height: 1.45 !important; }
  .partner-sheet h1 { font-size: 25pt !important; line-height: 1.05 !important; margin: 0 0 6pt !important; letter-spacing: -0.02em !important; }
  .partner-sheet h3 { font-size: 12pt !important; line-height: 1.2 !important; margin: 0 0 3pt !important; }
  .partner-sheet p { font-size: 10.5pt !important; }
  .partner-sheet .grid > div.border { padding: 10pt 12pt !important; break-inside: avoid; }
  .partner-sheet p.font-display { font-size: 15pt !important; line-height: 1 !important; }
  .partner-table { font-size: 10.5pt !important; }
  .partner-table th { font-size: 8pt !important; padding: 4pt 6pt !important; color: #6a6152 !important; }
  .partner-table th span { font-size: 7.5pt !important; }
  .partner-table td { padding: 7pt 6pt !important; }
  .partner-table tbody tr { break-inside: avoid; }
  .partner-sheet .text-ink-muted, .partner-sheet [class*="text-ink-muted"] { color: #6a6152 !important; }
  .partner-sheet .border-line, .partner-sheet [class*="border-line"], .partner-sheet .border, .partner-table thead tr, .partner-table tbody tr, .partner-sheet [class*="border-t"] { border-color: #cfc7b6 !important; }
  .partner-table thead tr { border-bottom: 1.2pt solid #8a8272 !important; }
  .partner-sheet a { color: #1c1712 !important; text-decoration: none !important; }
  .partner-sheet section, .partner-sheet header { break-inside: avoid; }
}
`;
