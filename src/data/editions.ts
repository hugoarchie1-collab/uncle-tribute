// =============================================================================
// THE EDITION LEDGER — single source of truth for allocated edition numbers
// -----------------------------------------------------------------------------
// Mirrors how news.ts / memories.ts / paintings.ts already drive their pages:
// one typed, hand-edited array — no database. Hugo edits THIS file when an
// order is fulfilled and redeploys; the /verify page reads it client-side.
//
// WHAT THIS IS:
//   The estate's public register of allocated edition numbers — the
//   theprintspace / Guardian Print Shop model. Every fulfilled print is
//   estate-stamped, hand-numbered within its edition, and ships with a
//   Certificate of Authenticity on estate letterhead. Recording each
//   allocation here lets any future holder verify their certificate at
//   /verify, which is what holds resale value.
//
// HOW TO ADD AN ALLOCATION (when you fulfil an order):
//   1. Find the order in Stripe — it tells you the painting, colourway and
//      tier (size) bought.
//   2. Work out the number: it is simply the next unallocated number for that
//      painting + colourway + tier — i.e. count the matching entries below and
//      add one (the `nextNumber` helper at the foot of this file computes the
//      same thing). Write that number on the print and on the certificate.
//   3. Add ONE object to ALLOCATIONS below (newest at the top), then deploy.
//
// Template (copy, uncomment, fill in from the real order):
//   {
//     paintingId: "wild-rose",          // must match an id in paintings.ts
//     colourwayName: "Sussex Pink",     // exactly as named in paintings.ts
//     tierId: "collector",              // atelier (A3) | collector (A2) |
//                                       // atelier-grande (A1) | heirloom (A0) |
//                                       // studio (one-of-one)
//     number: 1,                        // the hand-written edition number
//     certificate: "SEM-0001",          // the certificate number EXACTLY as
//                                       //   printed on the COA (matching is
//                                       //   forgiving: case, spaces and
//                                       //   dashes are ignored)
//     dateISO: "2026-06-15",            // the date you allocated it (YYYY-MM-DD)
//   },
//
// RULES:
//   - Never re-issue a number or a certificate — one entry per fulfilled print.
//   - Never remove an entry once its print has shipped (the register is the
//     point). A genuine correction (typo) is fine.
//   - paintingId / colourwayName / tierId must match paintings.ts exactly —
//     the /verify page looks the painting and tier up by these.
// =============================================================================

export interface Allocation {
  /** Must match a painting `id` in paintings.ts. */
  paintingId: string;
  /** Exactly as the colourway is named in paintings.ts. */
  colourwayName: string;
  /** Tier id from the PRINT_TIERS ladder in paintings.ts. */
  tierId: "atelier" | "collector" | "atelier-grande" | "heirloom" | "studio";
  /** The hand-written edition number on the print + certificate. */
  number: number;
  /** The certificate number exactly as printed on the COA. */
  certificate: string;
  /** Allocation date, YYYY-MM-DD. */
  dateISO: string;
}

/**
 * Hand-curated by Hugo, one entry per fulfilled order — see the template in
 * the file header. EMPTY today: the register begins with the first
 * allocations from June 2026.
 */
export const ALLOCATIONS: Allocation[] = [];

/**
 * How many prints of this painting + colourway + tier have been allocated.
 * Colourway matching is case-insensitive so a casing slip in an entry never
 * silently splits an edition's count.
 */
export const allocatedCount = (
  paintingId: string,
  colourwayName: string,
  tierId: Allocation["tierId"],
): number =>
  ALLOCATIONS.filter(
    (a) =>
      a.paintingId === paintingId &&
      a.colourwayName.toLowerCase() === colourwayName.toLowerCase() &&
      a.tierId === tierId,
  ).length;

/** The next edition number to hand-write for this painting + colourway + tier. */
export const nextNumber = (
  paintingId: string,
  colourwayName: string,
  tierId: Allocation["tierId"],
): number => allocatedCount(paintingId, colourwayName, tierId) + 1;

/**
 * Certificate matching is deliberately forgiving — trimmed, case-insensitive,
 * and spaces / dashes are ignored — so "sem 0001" finds "SEM-0001". A
 * certificate holder typing from paper should never fail on punctuation.
 */
const normaliseCertificate = (certificate: string): string =>
  certificate.trim().toLowerCase().replace(/[\s-]/g, "");

export const findByCertificate = (
  certificate: string,
): Allocation | undefined => {
  const needle = normaliseCertificate(certificate);
  if (!needle) return undefined;
  return ALLOCATIONS.find(
    (a) => normaliseCertificate(a.certificate) === needle,
  );
};
