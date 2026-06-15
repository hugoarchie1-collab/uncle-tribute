// src/pages/Verify.tsx — /verify, certificate verification against the
// estate's edition ledger (src/data/editions.ts). The theprintspace /
// Guardian Print Shop model: an estate-issued, publicly verifiable record of
// every allocated edition number is what lets a certificate hold resale value.
//
// Register: dignified but BOLD, matching the redesigned About masthead — a
// meta rule, a large left-aligned Fraunces statement, and the lookup packed
// immediately beside it (no thin centred column floating in dead air).
// Entirely client-side — the ledger is a hand-curated array shipped with the
// site, so verification is a lookup, not an API call. A certificate that isn't
// found is NEVER an error ("invalid") — the register simply starts with the
// first allocations from June 2026, and earlier or unlisted certificates are
// confirmed by the estate over email.
//
// Authentication copy is the single-source ESTATE_AUTHENTICATION constants —
// never re-typed. The lookup logic (handleSubmit / findByCertificate) is kept
// byte-identical to the shipped behaviour.

import { useRef, useState } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { Seo } from "../components/Seo";
import { Reveal } from "../components/Reveal";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_MUTED, EYEBROW_TIGHT, META } from "../components/ui/tokens";
import { ESTATE_AUTHENTICATION, PRINT_TIERS, getPaintingById } from "../data/paintings";
import { findByCertificate, type Allocation } from "../data/editions";

/** "2026-06-15" → "15 June 2026" — falls back to the raw string if unparsable. */
const formatAllocationDate = (dateISO: string): string => {
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return dateISO;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

type LookupResult =
  | { state: "idle" }
  | { state: "found"; allocation: Allocation }
  | { state: "unlisted" };

/** The three authentication facts — single-source estate copy, rendered as a
 *  dense labelled grid (never a thin centred bullet list, never re-typed). The
 *  `*Label` short forms were unused before this redesign; they earn their keep
 *  as the column heads so the facts read as an editorial spec strip. */
const AUTH_FACTS = [
  { label: ESTATE_AUTHENTICATION.stampLabel, body: ESTATE_AUTHENTICATION.stamp },
  { label: ESTATE_AUTHENTICATION.numberingLabel, body: ESTATE_AUTHENTICATION.numbering },
  { label: ESTATE_AUTHENTICATION.coaLabel, body: ESTATE_AUTHENTICATION.coa },
  { label: ESTATE_AUTHENTICATION.printerLabel, body: ESTATE_AUTHENTICATION.printer },
] as const;

/** Confirmation panel for a certificate recorded in the ledger. Left-aligned,
 *  full-width, with the edition number set large in Fraunces — the moment the
 *  register pays off, so it reads as a record, not a toast. */
const FoundCard = ({ allocation }: { allocation: Allocation }) => {
  const painting = getPaintingById(allocation.paintingId);
  const tier = PRINT_TIERS.find((t) => t.id === allocation.tierId);
  return (
    <div className="border border-accent/30 bg-bg-soft/30 px-6 py-8 sm:px-9 sm:py-9">
      <div className="flex items-center gap-4 border-b border-line pb-4">
        <span className={EYEBROW}>Recorded in the estate ledger</span>
        <span aria-hidden className="h-px flex-1 bg-ink/15" />
      </div>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-6 items-end">
        <div className="lg:col-span-8">
          <h2 className="font-display font-semibold tracking-[-0.03em] text-[clamp(28px,3.6vw,46px)] leading-[1.05] text-ink text-pretty m-0">
            {painting?.title ?? allocation.paintingId}
          </h2>
          <p className={cn(META, "m-0 mt-3")}>
            {allocation.colourwayName}
            {tier ? <> · {tier.label} · {tier.size}</> : null}
          </p>
        </div>
        <div className="lg:col-span-4 lg:text-right lg:border-l lg:border-line lg:pl-8">
          <p
            className="font-display font-semibold tracking-[-0.03em] leading-[0.9] text-ink m-0"
            style={{
              fontVariationSettings: '"opsz" 40, "wght" 600',
              fontSize: "clamp(40px,5.5vw,72px)",
            }}
          >
            No.&nbsp;{allocation.number}
          </p>
          {tier?.editionTotal ? (
            <p className={cn(EYEBROW_MUTED, "m-0 mt-2 lg:justify-end")}>
              of {tier.editionTotal}
            </p>
          ) : null}
        </div>
      </div>
      <p className={cn(META, "m-0 mt-6 pt-5 border-t border-line")}>
        Allocated {formatAllocationDate(allocation.dateISO)}
      </p>
    </div>
  );
};

/** Graceful copy for a certificate not yet in the online register — never an
 *  error tone. Left-aligned to sit in the same column as the found state. */
const UnlistedNote = () => (
  <div className="border border-line bg-bg-soft/20 px-6 py-8 sm:px-9 sm:py-9">
    <div className="flex items-center gap-4 border-b border-line pb-4">
      <span className={EYEBROW_MUTED}>Not yet in the online register</span>
      <span aria-hidden className="h-px flex-1 bg-ink/15" />
    </div>
    <p className="font-sans font-normal text-[16px] md:text-[17px] leading-[1.7] text-ink-soft text-pretty m-0 mt-5 max-w-[58ch]">
      Certificates appear here as editions are allocated from June 2026 onward.
      For an earlier or unlisted certificate, write to{" "}
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

export const Verify = () => {
  const [certificate, setCertificate] = useState("");
  const [result, setResult] = useState<LookupResult>({ state: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  // No reload, no API — the ledger ships with the site. Enter submits the
  // form (the button is type="submit"); an empty field simply refocuses.
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = certificate.trim();
    if (!query) {
      setResult({ state: "idle" });
      inputRef.current?.focus();
      return;
    }
    const allocation = findByCertificate(query);
    setResult(allocation ? { state: "found", allocation } : { state: "unlisted" });
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      <AmbientBackdrop opacity={0.4} />
      <Seo
        title="Verify a certificate"
        description="Check a Certificate of Authenticity against the estate's edition ledger — every estate-stamped, hand-numbered print of Stephen Meakin's paintings is recorded as it is allocated."
        url="/verify"
      />
      <Nav />
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-14 pb-12 md:pb-16">
        {/* MASTHEAD — bold, left-aligned, packed. Meta rule → giant Fraunces
            statement → the lookup form packed immediately beneath on a border-t,
            beside the framing copy. No thin centred column, no dead air. */}
        <Reveal as="header">
          <div className="flex items-center gap-4 md:gap-6 border-b border-line pb-4 md:pb-5">
            <span className={EYEBROW}>Authentication</span>
            <span aria-hidden className="h-px flex-1 bg-ink/15" />
            <span className={cn(EYEBROW_MUTED, "shrink-0 hidden sm:inline")}>
              The estate edition ledger
            </span>
          </div>
          <h1
            className="font-display font-bold tracking-[-0.045em] text-ink m-0 mt-4 md:mt-6 leading-[0.86] text-balance"
            style={{
              fontVariationSettings: '"opsz" 48, "wght" 700',
              fontSize: "clamp(52px, 11vw, 168px)",
            }}
          >
            Verify a<br />certificate.
          </h1>
        </Reveal>

        {/* LOOKUP + FRAMING — two columns under a border-t, packed tight. The
            input column is the action; the right column carries the framing
            copy so the masthead never floats over emptiness. */}
        <div className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8 items-start border-t border-line pt-6 md:pt-8">
          <Reveal as="div" className="lg:col-span-7">
            <form onSubmit={handleSubmit} noValidate>
              <span className={cn(EYEBROW, "block mb-3")}>Certificate number</span>
              <div className="flex w-full items-stretch ring-1 ring-line focus-within:ring-accent transition-shadow">
                <input
                  ref={inputRef}
                  type="text"
                  name="certificate"
                  value={certificate}
                  onChange={(e) => setCertificate(e.target.value)}
                  placeholder="As printed on your certificate"
                  aria-label="Certificate number"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="flex-1 min-w-0 bg-transparent px-4 py-3.5 font-sans text-[16px] md:text-[17px] text-ink placeholder:text-ink/30 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 whitespace-nowrap px-5 md:px-7 font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-ink-muted hover:text-accent transition-colors bg-transparent border-0 border-l border-line cursor-pointer"
                >
                  Verify
                </button>
              </div>

              {/* RESULT — announced politely; never an error tone. Sits directly
                  under the input it answers, in the same column. */}
              <div aria-live="polite" className="mt-6 md:mt-8 empty:mt-0">
                {result.state === "found" ? <FoundCard allocation={result.allocation} /> : null}
                {result.state === "unlisted" ? <UnlistedNote /> : null}
              </div>
            </form>
          </Reveal>

          <Reveal as="div" delay={0.06} className="lg:col-span-5">
            <p className="font-display font-normal tracking-[-0.01em] text-ink m-0 max-w-[34ch]"
              style={{
                fontVariationSettings: '"opsz" 32, "wght" 400',
                fontSize: "clamp(20px, 2.2vw, 30px)",
                lineHeight: 1.3,
              }}
            >
              Every allocated print is recorded in the estate&rsquo;s edition
              ledger. Enter the number on your Certificate of Authenticity to
              confirm its place within the edition.
            </p>
          </Reveal>
        </div>

        {/* AUTHENTICATION FACTS — the single-source estate copy, never re-typed,
            laid as a dense 2×2 / 4-up labelled grid (no thin bullet list). The
            `*Label` short forms head each cell; the full sentence sits beneath. */}
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
