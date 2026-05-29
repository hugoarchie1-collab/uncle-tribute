/**
 * Order confirmation email — sent immediately on `checkout.session.completed`.
 *
 * Voice: from the estate, not the platform. Steve's family writing to the
 * collector, NOT a generic Stripe-style receipt (Stripe sends its own
 * receipt separately for the paper trail). Cream/ink/accent palette mirrors
 * the site. Inline styles only — see ./styles.ts for the why.
 *
 * Includes:
 *   - order summary (one row per print line: title, colourway, tier label,
 *     size, edition label, framing sub-line if present, price)
 *   - authentication block (estate stamp + numbering + COA + printer)
 *   - estate-voice thank-you note
 *   - thank-you offer card (10% off a future print, valid one year)
 *   - dispatch expectation (7–10 working days from Point 101)
 *   - contact line for replies → info@themandalacompany.com
 *
 * Rendered server-side by `@react-email/render` inside the Vercel function.
 * Designed to render reliably across Gmail, Outlook, Apple Mail, iOS Mail.
 *
 * Authentication strings are inlined here verbatim (mirror of
 * src/data/paintings.ts ESTATE_AUTHENTICATION) because /api can't import
 * from /src — gotcha #5 in CLAUDE.md. Keep the two in sync when editing.
 */

import { palette, styles } from "./styles.js";

// Mirror of src/data/paintings.ts ESTATE_AUTHENTICATION — keep in sync.
const ESTATE_AUTHENTICATION = {
  stamp: "Estate-stamped by The Mandala Company",
  numbering: "Hand-numbered within the edition",
  coa: "Ships with a Certificate of Authenticity on estate letterhead",
  printer: "Printed at Point 101, London — the UK's leading giclée print atelier",
};

// Mirror of src/data/paintings.ts EMBELLISHMENT_NOTE — keep in sync.
const EMBELLISHMENT_NOTE =
  "Hand-finished in Stephen's geometric tradition by Polly Wedge (estate). Allow 4 weeks.";

export interface OrderConfirmationProps {
  /** Buyer's first name if Stripe captured it; falls back to "there". */
  buyerName?: string | null;
  /** Display reference shown at the foot. Truncated session id. */
  orderRef: string;
  /** One row per item — pre-formatted GBP price string (e.g. "£295.00"). */
  lines: Array<{
    title: string;
    colourway: string;
    /** Optional tier label e.g. "Collector". */
    tierLabel?: string;
    /** Optional edition label e.g. "Limited edition of 100". */
    editionLabel?: string;
    size: string;
    /** Optional framing sub-line ("Framed" or "Hand-finished frame"). */
    framing?: boolean;
    /** Optional hand-embellishment sub-line (Polly Wedge). */
    embellished?: boolean;
    price: string;
  }>;
  /** Pre-formatted GBP grand total including shipping, e.g. "£310.00". */
  total: string;
  /** Thank-you offer code shown in the gift card (e.g. "FRIENDS-AB12CD"). */
  thankYouCode: string;
  /** "10%" — kept abstract so we can tune copy later. */
  thankYouValue: string;
  /** ISO date the buyer must redeem by (e.g. "29 May 2027"). */
  thankYouExpiry: string;
  /** Estate contact email. */
  estateEmail: string;
}

const firstName = (name?: string | null): string => {
  if (!name) return "there";
  const trimmed = name.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
};

export const OrderConfirmation = ({
  buyerName,
  orderRef,
  lines,
  total,
  thankYouCode,
  thankYouValue,
  thankYouExpiry,
  estateEmail,
}: OrderConfirmationProps) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="dark only" />
        <meta name="supported-color-schemes" content="dark only" />
        <title>Your print is on its way — The Art of Stephen Meakin</title>
        {/* Google Fonts — Playfair Display for headings. Most webmail clients
           strip <link> tags from email <head>, so we rely on the system serif
           fallback in styles.ts to keep typography intentional even when the
           font fails to load. */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,500&family=Inter:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={styles.page}>
        <div style={styles.shell}>
          <p style={styles.eyebrow}>The Mandala Company · The estate of Stephen Meakin</p>
          <h1 style={styles.heading}>
            Thank you, {firstName(buyerName)}.
          </h1>
          <p style={styles.body}>
            Your order for an estate-stamped giclée from{" "}
            <em>The Art of Stephen Meakin</em> has been received. Each print
            is individually made to order at Point 101 in London, the UK's
            leading giclée print atelier, and dispatched within{" "}
            <strong style={{ color: palette.ink }}>seven to ten working days</strong>.
            You'll hear from us again when it ships, with a tracking link.
          </p>

          <hr style={styles.divider} />

          <p style={styles.eyebrow}>Your order</p>
          <div style={styles.card}>
            {lines.map((line, idx) => (
              <div
                key={idx}
                style={{
                  marginTop: idx === 0 ? 0 : 14,
                  paddingTop: idx === 0 ? 0 : 14,
                  borderTop: idx === 0 ? "0" : `1px solid ${palette.divider}`,
                }}
              >
                <p style={styles.orderRow}>
                  <strong style={{ color: palette.ink }}>{line.title}</strong>
                  {" — "}
                  <span style={{ color: palette.inkSoft }}>{line.colourway}</span>
                </p>
                {(line.tierLabel || line.editionLabel) && (
                  <p
                    style={{
                      ...styles.orderMeta,
                      color: palette.accent,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase" as const,
                      fontSize: 10,
                      fontWeight: 700,
                      marginTop: 4,
                    }}
                  >
                    {[line.tierLabel, line.size.split(" ")[0], line.editionLabel]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                <p style={{ ...styles.orderMeta, marginTop: 4 }}>{line.size}</p>
                {line.framing && (
                  <p style={{ ...styles.orderMeta, marginTop: 4 }}>
                    Framed — hand-finished frame included
                  </p>
                )}
                {line.embellished && (
                  <p style={{ ...styles.orderMeta, marginTop: 4 }}>
                    Hand-finished by Polly Wedge — {EMBELLISHMENT_NOTE}
                  </p>
                )}
                <p style={{ ...styles.orderMeta, marginTop: 4, color: palette.ink }}>
                  {line.price}
                </p>
              </div>
            ))}
            <hr style={{ ...styles.divider, margin: "18px 0 12px 0" }} />
            <p style={{ ...styles.orderRow, display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: palette.inkMuted, letterSpacing: "0.18em", fontSize: 11, textTransform: "uppercase", fontWeight: 700 }}>
                Total (incl. shipping)
              </span>
              <strong style={{ color: palette.ink, fontSize: 16 }}>{total}</strong>
            </p>
          </div>

          {/* Authentication block — quiet provenance summary, same lines that
             surface on the painting page and in the basket so the story
             reads identically everywhere. */}
          <p style={{ ...styles.eyebrow, marginTop: 28 }}>Authentication</p>
          <div style={styles.card}>
            <p style={{ ...styles.orderMeta, color: palette.ink, marginBottom: 8 }}>
              · {ESTATE_AUTHENTICATION.stamp}
            </p>
            <p style={{ ...styles.orderMeta, color: palette.ink, marginBottom: 8 }}>
              · {ESTATE_AUTHENTICATION.numbering}
            </p>
            <p style={{ ...styles.orderMeta, color: palette.ink, marginBottom: 8 }}>
              · {ESTATE_AUTHENTICATION.coa}
            </p>
            <p style={{ ...styles.orderMeta, color: palette.inkSoft }}>
              · {ESTATE_AUTHENTICATION.printer}
            </p>
          </div>

          {/* Thank-you offer — framed as a gift from the estate, not a coupon.
             We deliberately don't shout "DISCOUNT" anywhere; this is a private
             note to a first-time collector. */}
          <div style={styles.giftCard}>
            <p style={{ ...styles.eyebrow, color: palette.inkMuted, margin: "0 0 14px 0" }}>
              A note from the estate
            </p>
            <p style={{ ...styles.body, color: palette.ink, margin: "0 0 14px 0" }}>
              In thanks for being among the first to take one of Steve's prints
              into your home, please accept {thankYouValue} towards a future
              print, with our warmth.
            </p>
            <code style={styles.code}>{thankYouCode}</code>
            <p style={{ ...styles.small, margin: 0 }}>
              Apply at checkout. Valid for one year — until {thankYouExpiry}.
            </p>
          </div>

          <h2 style={styles.subheading}>What happens next</h2>
          <p style={styles.body}>
            We'll place your print with Point 101 in the next working day,
            and notify you the moment it leaves the studio. If anything about
            the colourway or sizing needs another look, just reply to this
            email — we read everything ourselves.
          </p>

          <p style={styles.signoff}>With love from the estate,</p>
          <p style={{ ...styles.body, fontStyle: "italic", margin: 0 }}>
            — Archie, for The Mandala Company
          </p>

          <hr style={styles.divider} />

          <p style={styles.footer}>
            Questions, or anything to flag —{" "}
            <a href={`mailto:${estateEmail}`} style={styles.link}>
              {estateEmail}
            </a>
            <br />
            Returns, refunds &amp; damages —{" "}
            <a
              href="https://themandalacompany.com/returns"
              style={styles.link}
            >
              themandalacompany.com/returns
            </a>
            <br />
            Reference: {orderRef}
            <br />
            The Art of Stephen Meakin · Lewes, East Sussex
          </p>
        </div>
      </body>
    </html>
  );
};
