// src/pages/Verify.tsx — /verify, certificate verification against the
// estate's edition ledger (src/data/editions.ts). The theprintspace /
// Guardian Print Shop model: an estate-issued, publicly verifiable record of
// every allocated edition number is what lets a certificate hold resale value.
//
// Register: quiet and dignified, CENTRED like /news. Entirely client-side —
// the ledger is a hand-curated array shipped with the site, so verification
// is a lookup, not an API call. A certificate that isn't found is NEVER an
// error ("invalid") — the register simply starts with the first allocations
// from June 2026, and earlier or unlisted certificates are confirmed by the
// estate over email.
//
// Layout follows News.tsx (the current content-page idiom): AmbientBackdrop +
// <Nav /> + centred header on the shared tokens + FooterCatalogue + Footer.
// Authentication copy is the single-source ESTATE_AUTHENTICATION constants —
// never re-typed.

import { useRef, useState } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { FooterCatalogue } from "../components/FooterCatalogue";
import { AmbientBackdrop } from "../components/AmbientBackdrop";
import { Seo } from "../components/Seo";
import { Reveal } from "../components/Reveal";
import { cn } from "../lib/cn";
import { EYEBROW, EYEBROW_MUTED, TITLE, SUBTITLE, META } from "../components/ui/tokens";
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

/** Calm confirmation card for a certificate recorded in the ledger. */
const FoundCard = ({ allocation }: { allocation: Allocation }) => {
  const painting = getPaintingById(allocation.paintingId);
  const tier = PRINT_TIERS.find((t) => t.id === allocation.tierId);
  return (
    <div className="mx-auto max-w-[560px] border border-white/10 bg-bg-soft/30 px-7 py-9 sm:px-10 sm:py-10 text-center">
      <p className={cn(EYEBROW_MUTED, "m-0 mb-5")}>Recorded in the estate ledger</p>
      <h2 className="font-display font-semibold tracking-[-0.03em] text-[clamp(26px,3.2vw,40px)] leading-[1.08] text-ink text-balance m-0">
        {painting?.title ?? allocation.paintingId}
      </h2>
      <p className={cn(META, "m-0 mt-3")}>
        {allocation.colourwayName}
        {tier ? <> · {tier.label} · {tier.size}</> : null}
      </p>
      <p className="font-sans text-[15px] leading-[1.6] text-ink m-0 mt-5">
        No. {allocation.number}
        {tier?.editionTotal ? <> of {tier.editionTotal}</> : null}
      </p>
      <p className={cn(META, "m-0 mt-2")}>
        Allocated {formatAllocationDate(allocation.dateISO)}
      </p>
    </div>
  );
};

/** Graceful copy for a certificate not yet in the online register. */
const UnlistedNote = () => (
  <div className="mx-auto max-w-[560px] text-center">
    <p className={cn(META, "m-0 text-[14.5px]")}>
      This certificate is not yet in the online register. Certificates appear
      here as editions are allocated from June 2026 onward. For an earlier or
      unlisted certificate, write to{" "}
      <a
        href="mailto:info@themandalacompany.com"
        className="underline underline-offset-4 hover:text-ink transition-colors"
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
      <main className="relative z-10 flex-1 mx-auto w-full max-w-[1320px] 2xl:max-w-[1500px] 3xl:max-w-[1720px] px-4 sm:px-6 md:px-8 lg:px-12 pt-10 md:pt-16 pb-20 md:pb-28">
        {/* HEADER — centred, matching the other content pages. */}
        <Reveal as="header" className="max-w-[760px] 2xl:max-w-[880px] mx-auto text-center mb-9 md:mb-12">
          <p className={cn(EYEBROW, "m-0 mb-5")}>Authentication</p>
          <h1 className={cn(TITLE, "mx-auto my-0 mb-6")}>Verify a certificate.</h1>
          <p className={cn(SUBTITLE, "mx-auto my-0")}>
            Every allocated print is recorded in the estate's edition ledger.
            Enter the number printed on your Certificate of Authenticity to
            confirm its place within the edition.
          </p>
        </Reveal>

        {/* AUTHENTICATION FACTS — the single-source estate copy, never re-typed. */}
        <Reveal as="div" delay={0.05} className="mx-auto max-w-[560px] text-center mb-10 md:mb-12">
          <ul className="list-none m-0 p-0 flex flex-col gap-2 border-y border-white/8 py-5">
            <li className={META}>{ESTATE_AUTHENTICATION.stamp}</li>
            <li className={META}>{ESTATE_AUTHENTICATION.numbering}</li>
            <li className={META}>{ESTATE_AUTHENTICATION.coa}</li>
          </ul>
        </Reveal>

        {/* THE LOOKUP — one input, one quiet button. Client-side only. */}
        <Reveal as="div" delay={0.08} className="mx-auto max-w-[560px] mb-12 md:mb-16">
          <form onSubmit={handleSubmit} noValidate>
            <label className="block">
              <span className={cn(EYEBROW_MUTED, "block text-left mb-3")}>
                Certificate number
              </span>
              <div className="flex w-full items-stretch ring-1 ring-line focus-within:ring-accent transition-shadow">
                <input
                  ref={inputRef}
                  type="text"
                  name="certificate"
                  value={certificate}
                  onChange={(e) => setCertificate(e.target.value)}
                  placeholder="As printed on your certificate"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="flex-1 min-w-0 bg-transparent px-4 py-3 font-sans text-[15px] text-ink placeholder:text-ink/30 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 whitespace-nowrap px-5 font-sans text-[10px] font-bold tracking-[0.28em] uppercase text-ink-muted hover:text-accent transition-colors bg-transparent border-0 border-l border-line cursor-pointer"
                >
                  Verify
                </button>
              </div>
            </label>
          </form>
        </Reveal>

        {/* RESULT — announced politely; never an error tone. */}
        <div aria-live="polite">
          {result.state === "found" ? <FoundCard allocation={result.allocation} /> : null}
          {result.state === "unlisted" ? <UnlistedNote /> : null}
        </div>
      </main>
      <FooterCatalogue />
      <Footer />
    </div>
  );
};
