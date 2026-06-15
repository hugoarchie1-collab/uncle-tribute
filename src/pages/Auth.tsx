// src/pages/Auth.tsx — /auth and /auth/:certId — the Estate Registry lookup.
//
// An estate-issued, publicly verifiable record of every print issued within a
// controlled drop cycle is what lets a Certificate of Authenticity hold its
// provenance and resale value. A buyer enters the Certificate ID printed on
// their COA (or arrives via the QR code, which deep-links /auth/<id> with the
// id prefilled) and the registry returns the verified record.
//
// Source of truth: the estate ledger written by api/stripe-webhook.ts on every
// order, read back through GET /api/auth-lookup. If that store isn't
// provisioned in an environment, OR a certificate predates it, the page falls
// back to the static, hand-curated ledger in src/data/editions.ts — so a
// certificate is only ever reported "not found" when it is genuinely in neither.
//
// Register: minimal, institutional, archival — never an "invalid" error tone.
// Authentication copy is the single-source ESTATE_AUTHENTICATION constants.

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { Seo } from "../components/Seo";
import { Reveal } from "../components/Reveal";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_MUTED, EYEBROW_TIGHT, META } from "../components/ui/tokens";
import {
  ESTATE_AUTHENTICATION,
  CURRENT_DROP,
  PRINT_TIERS,
  getPaintingById,
} from "../data/paintings";
import { findByCertificate } from "../data/editions";

/** The unified, public provenance record shown by the registry — whether it
 *  came from the live estate ledger (KV) or the static editions.ts fallback. */
interface RegistryRecord {
  certificateId: string;
  artworkName: string;
  colourway?: string;
  dropLabel: string;
  tierLabel: string;
  printNumber: number | null;
  allocation: number | null;
  issuedDate?: string;
  status: string;
}

const STATUS = "Authenticated in Estate Registry";

/** "2026-06-15" / ISO → "15 June 2026"; falls back to the raw string. */
const formatIssued = (raw?: string): string => {
  if (!raw) return "—";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/** Map the api/auth-lookup record shape → RegistryRecord. */
const fromApi = (r: Record<string, unknown>): RegistryRecord => ({
  certificateId: String(r.certificate_id ?? ""),
  artworkName: String(r.artwork_name ?? ""),
  colourway: r.colourway ? String(r.colourway) : undefined,
  dropLabel: String(r.drop_label ?? CURRENT_DROP.label),
  tierLabel: String(r.tier_label ?? ""),
  printNumber: typeof r.print_number === "number" ? r.print_number : null,
  allocation: typeof r.allocation === "number" ? r.allocation : null,
  issuedDate: r.issued_date ? String(r.issued_date) : undefined,
  status: STATUS,
});

/** Map a static editions.ts Allocation → RegistryRecord (older / hand-curated
 *  certificates that predate the live ledger). */
const fromStatic = (cert: string): RegistryRecord | null => {
  const a = findByCertificate(cert);
  if (!a) return null;
  const painting = getPaintingById(a.paintingId);
  const tier = PRINT_TIERS.find((t) => t.id === a.tierId);
  return {
    certificateId: a.certificate,
    artworkName: painting?.title ?? a.paintingId,
    colourway: a.colourwayName,
    dropLabel: CURRENT_DROP.label,
    tierLabel: tier?.label ?? a.tierId,
    printNumber: a.number,
    allocation: tier?.editionTotal ?? null,
    issuedDate: a.dateISO,
    status: STATUS,
  };
};

type LookupResult =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "found"; record: RegistryRecord }
  | { state: "unlisted" }
  | { state: "unavailable" };

const AUTH_FACTS = [
  { label: ESTATE_AUTHENTICATION.stampLabel, body: ESTATE_AUTHENTICATION.stamp },
  { label: ESTATE_AUTHENTICATION.numberingLabel, body: ESTATE_AUTHENTICATION.numbering },
  { label: ESTATE_AUTHENTICATION.coaLabel, body: ESTATE_AUTHENTICATION.coa },
  { label: ESTATE_AUTHENTICATION.printerLabel, body: ESTATE_AUTHENTICATION.printer },
] as const;

/** The verified-record panel — the moment the registry pays off. Left-aligned,
 *  full-width, the print number set large in Fraunces; reads as an archival
 *  record, not a toast. */
const FoundCard = ({ record }: { record: RegistryRecord }) => {
  const numbered = record.printNumber !== null;
  return (
    <div className="border border-accent/30 bg-bg-soft/30 px-6 py-8 sm:px-9 sm:py-9">
      <div className="flex items-center gap-4 border-b border-line pb-4">
        <span className={EYEBROW}>{record.status}</span>
        <span aria-hidden className="h-px flex-1 bg-ink/15" />
      </div>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-6 items-end">
        <div className="lg:col-span-8">
          <h2 className="font-display font-semibold tracking-[-0.03em] text-[clamp(28px,3.6vw,46px)] leading-[1.05] text-ink text-pretty m-0">
            {record.artworkName}
          </h2>
          <p className={cn(META, "m-0 mt-3")}>
            {record.colourway ? <>{record.colourway} · </> : null}
            {record.tierLabel} · {record.dropLabel}
          </p>
        </div>
        <div className="lg:col-span-4 lg:text-right lg:border-l lg:border-line lg:pl-8">
          {numbered ? (
            <>
              <p
                className="font-display font-semibold tracking-[-0.03em] leading-[0.9] text-ink m-0"
                style={{
                  fontVariationSettings: '"opsz" 40, "wght" 600',
                  fontSize: "clamp(40px,5.5vw,72px)",
                }}
              >
                No.&nbsp;{record.printNumber}
              </p>
              {record.allocation ? (
                <p className={cn(EYEBROW_MUTED, "m-0 mt-2 lg:justify-end")}>
                  of {record.allocation} in {record.dropLabel}
                </p>
              ) : null}
            </>
          ) : (
            <p
              className="font-display font-normal tracking-[-0.02em] leading-[1] text-ink m-0"
              style={{
                fontVariationSettings: '"opsz" 36, "wght" 400',
                fontSize: "clamp(24px,3vw,40px)",
              }}
            >
              Open&nbsp;Edition
            </p>
          )}
        </div>
      </div>
      <dl className="mt-6 pt-5 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 m-0">
        <div>
          <dt className={cn(EYEBROW_TIGHT, "m-0 mb-1.5")}>Certificate ID</dt>
          <dd className="m-0 font-mono text-[14px] md:text-[15px] tracking-[0.06em] text-ink break-all">
            {record.certificateId}
          </dd>
        </div>
        <div>
          <dt className={cn(EYEBROW_TIGHT, "m-0 mb-1.5")}>Issued</dt>
          <dd className={cn(META, "m-0")}>{formatIssued(record.issuedDate)}</dd>
        </div>
      </dl>
    </div>
  );
};

/** Graceful copy for a Certificate ID in neither ledger — never an error tone. */
const UnlistedNote = () => (
  <div className="border border-line bg-bg-soft/20 px-6 py-8 sm:px-9 sm:py-9">
    <div className="flex items-center gap-4 border-b border-line pb-4">
      <span className={EYEBROW_MUTED}>Not found in the Estate Registry</span>
      <span aria-hidden className="h-px flex-1 bg-ink/15" />
    </div>
    <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.7] text-ink-soft text-pretty m-0 mt-5 max-w-[58ch]">
      The Estate Ledger records prints issued from June 2026 onward. For an
      earlier or unlisted Certificate ID, write to{" "}
      <a
        href="mailto:info@themandalacompany.com"
        className="underline underline-offset-4 hover:text-accent transition-colors"
      >
        info@themandalacompany.com
      </a>{" "}
      and the estate will confirm it for you directly.
    </p>
  </div>
);

/** Transient registry/network failure — kept DISTINCT from a genuine miss so a
 *  real certificate is never reported invalid during a blip. Invites a retry. */
const UnavailableNote = () => (
  <div className="border border-line bg-bg-soft/20 px-6 py-8 sm:px-9 sm:py-9">
    <div className="flex items-center gap-4 border-b border-line pb-4">
      <span className={EYEBROW_MUTED}>Registry temporarily unavailable</span>
      <span aria-hidden className="h-px flex-1 bg-ink/15" />
    </div>
    <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.7] text-ink-soft text-pretty m-0 mt-5 max-w-[58ch]">
      We couldn&rsquo;t reach the Estate Ledger just now. Please try again in a
      moment — your certificate may well be valid. If it persists, write to{" "}
      <a
        href="mailto:info@themandalacompany.com"
        className="underline underline-offset-4 hover:text-accent transition-colors"
      >
        info@themandalacompany.com
      </a>
      .
    </p>
  </div>
);

export const Auth = () => {
  const { certId } = useParams<{ certId?: string }>();
  const [certificate, setCertificate] = useState(certId ?? "");
  const [result, setResult] = useState<LookupResult>({ state: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  // Query the live estate ledger; fall back to the static editions.ts ledger.
  // A certificate is "unlisted" ONLY on a GENUINE miss (live ledger reachable +
  // empty, or unprovisioned, AND absent from the static ledger). A TRANSIENT
  // failure (KV error/timeout, network error, non-OK status) with no static
  // match shows "temporarily unavailable" — never a false "not found" for what
  // may be a real, issued certificate (the system's core invariant).
  const lookup = useCallback(async (raw: string) => {
    const query = raw.trim();
    if (!query) {
      setResult({ state: "idle" });
      inputRef.current?.focus();
      return;
    }
    setResult({ state: "loading" });
    try {
      const resp = await fetch(`/api/auth-lookup?cert=${encodeURIComponent(query)}`);
      if (resp.ok) {
        const json = (await resp.json()) as {
          found?: boolean;
          configured?: boolean;
          error?: boolean;
          record?: Record<string, unknown>;
        };
        if (json.found && json.record) {
          setResult({ state: "found", record: fromApi(json.record) });
          return;
        }
        const stat = fromStatic(query);
        if (stat) {
          setResult({ state: "found", record: stat });
          return;
        }
        // No live record + no static record. A transient KV error must NOT read
        // as a definitive "not found"; only a clean miss (configured:false /
        // found:false) is genuinely "unlisted".
        setResult({ state: json.error ? "unavailable" : "unlisted" });
        return;
      }
    } catch {
      /* network error — handled below as transient */
    }
    // Network error or a non-OK HTTP status: transient. A static match wins;
    // otherwise "temporarily unavailable", never a false "not found".
    const stat = fromStatic(query);
    setResult(stat ? { state: "found", record: stat } : { state: "unavailable" });
  }, []);

  // Deep-link from the COA QR code: /auth/<CERT_ID> auto-runs the lookup. The
  // input is already seeded from the param via useState above. The lookup is
  // deferred to a macrotask so its (loading) state update isn't dispatched
  // synchronously inside the effect body — no cascading render.
  useEffect(() => {
    if (!certId || !certId.trim()) return;
    const t = setTimeout(() => void lookup(certId), 0);
    return () => clearTimeout(t);
    // run once for the param the page loaded with
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void lookup(certificate);
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      <AmbientBackdrop opacity={0.4} />
      <Seo
        title="Authentication"
        description="The Mandala Company Estate Ledger — confirm the provenance of a Stephen Meakin estate print. Enter the Certificate ID from your Certificate of Authenticity to return its verified record: artwork, drop, tier, print number and issuance date."
        url="/auth"
      />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-14 pb-12 md:pb-16">
        <Reveal as="header">
          <div className="flex items-center gap-4 md:gap-6 border-b border-line pb-4 md:pb-5">
            <span className={EYEBROW}>Authentication</span>
            <span aria-hidden className="h-px flex-1 bg-ink/15" />
            <span className={cn(EYEBROW_MUTED, "shrink-0 hidden sm:inline")}>
              The estate ledger
            </span>
          </div>
          <h1
            className="font-display font-bold tracking-[-0.045em] text-ink m-0 mt-4 md:mt-6 leading-[0.86] text-balance"
            style={{
              fontVariationSettings: '"opsz" 48, "wght" 700',
              fontSize: "clamp(52px, 11vw, 168px)",
            }}
          >
            Estate<br />Registry.
          </h1>
        </Reveal>

        <div className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8 items-start border-t border-line pt-6 md:pt-8">
          <Reveal as="div" className="lg:col-span-7">
            <form onSubmit={handleSubmit} noValidate>
              <span className={cn(EYEBROW, "block mb-3")}>Certificate ID</span>
              <div className="flex w-full items-stretch ring-1 ring-line focus-within:ring-accent transition-shadow">
                <input
                  ref={inputRef}
                  type="text"
                  name="certificate"
                  value={certificate}
                  onChange={(e) => setCertificate(e.target.value)}
                  placeholder="e.g. MANDALA-OPI-7F3K91"
                  aria-label="Certificate ID"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="flex-1 min-w-0 bg-transparent px-4 py-3.5 font-sans text-[16px] md:text-[17px] text-ink placeholder:text-ink/30 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 whitespace-nowrap px-5 md:px-7 font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-ink-muted hover:text-accent transition-colors bg-transparent border-0 border-l border-line cursor-pointer"
                >
                  Authenticate
                </button>
              </div>

              <div aria-live="polite" className="mt-6 md:mt-8 empty:mt-0">
                {result.state === "loading" ? (
                  <p className={cn(META, "m-0")}>Searching the Estate Ledger…</p>
                ) : null}
                {result.state === "found" ? <FoundCard record={result.record} /> : null}
                {result.state === "unlisted" ? <UnlistedNote /> : null}
                {result.state === "unavailable" ? <UnavailableNote /> : null}
              </div>
            </form>
          </Reveal>

          <Reveal as="div" delay={0.06} className="lg:col-span-5">
            <p
              className="font-display font-normal tracking-[-0.01em] text-ink m-0 max-w-[34ch]"
              style={{
                fontVariationSettings: '"opsz" 32, "wght" 400',
                fontSize: "clamp(20px, 2.2vw, 30px)",
                lineHeight: 1.3,
              }}
            >
              The Estate Ledger is the estate&rsquo;s register of every print
              issued within its controlled drop cycles. Enter your Certificate ID
              to confirm its provenance and allocation.
            </p>
          </Reveal>
        </div>

        <section className="mt-9 md:mt-12">
          <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-8">
            <span className={EYEBROW_MUTED}>What every certificate carries</span>
            <span aria-hidden className="h-px flex-1 bg-ink/15" />
          </div>
          <Reveal as="div" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-10 gap-y-8">
            {AUTH_FACTS.map((fact) => (
              <div key={fact.label} className="border-t border-line pt-4">
                <p className={cn(EYEBROW_TIGHT, "m-0 mb-2.5")}>{fact.label}</p>
                <p className="font-sans font-normal text-[15px] md:text-[16px] leading-[1.6] text-ink-soft text-pretty m-0">
                  {fact.body}
                </p>
              </div>
            ))}
          </Reveal>
        </section>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
