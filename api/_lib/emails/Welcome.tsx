/**
 * Welcome email — sent to a new subscriber on /api/newsletter-subscribe.
 *
 * Voice: from the estate, not a marketing platform. Mirrors
 * OrderConfirmation.tsx's structure and uses the shared `styles.ts` palette
 * so the two emails feel like one body of work in the inbox.
 *
 * If a single-use thank-you code was minted at sign-up, it's surfaced in the
 * same "gift card" treatment as the post-purchase email — framed as a private
 * note, never as a "10% OFF" badge. If no code was minted (RESEND_API_KEY
 * present but Stripe coupon creation skipped or failed), the gift card is
 * omitted entirely.
 *
 * Inline styles only — same reasoning as OrderConfirmation.tsx. Self-
 * contained — no imports outside /api (gotcha #5 in CLAUDE.md).
 */

import { palette, styles } from "./styles.ts";

export interface WelcomeEmailProps {
  /** Optional first name from the sign-up form. */
  subscriberName?: string | null;
  /** Estate contact email shown in the footer. */
  estateEmail: string;
  /** URL back to the catalogue. */
  collectionsUrl: string;
  /** Optional thank-you code minted at sign-up. Omit to hide the gift card. */
  thankYouCode?: string;
  /** Display string for the code value, e.g. "10%". */
  thankYouValue?: string;
  /** Human-readable expiry, e.g. "29 May 2027". */
  thankYouExpiry?: string;
}

const firstName = (name?: string | null): string => {
  if (!name) return "there";
  const trimmed = name.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
};

export const WelcomeEmail = ({
  subscriberName,
  estateEmail,
  collectionsUrl,
  thankYouCode,
  thankYouValue,
  thankYouExpiry,
}: WelcomeEmailProps) => {
  const hasGift = !!(thankYouCode && thankYouValue && thankYouExpiry);
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="dark only" />
        <meta name="supported-color-schemes" content="dark only" />
        <title>Welcome to Friends &amp; Family — The Art of Stephen Meakin</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,500&family=Inter:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={styles.page}>
        <div style={styles.shell}>
          <p style={styles.eyebrow}>The Mandala Company · The estate of Stephen Meakin</p>
          <h1 style={styles.heading}>Thank you, {firstName(subscriberName)}.</h1>
          <p style={styles.body}>
            You've been added to Friends &amp; Family — a small list the
            family keeps for quarterly notes on new editions of{" "}
            <em>The Art of Stephen Meakin</em>, exhibitions, and the occasional
            piece of writing from the archive. No more than four notes a year,
            and never a marketing blast.
          </p>
          <p style={styles.body}>
            Stephen worked for over three decades in Lewes, East Sussex —
            mandalas, sacred geometry, and a lifelong study of pattern. We
            release a small number of estate-stamped giclée prints so his work
            can live in homes rather than only in archives. If
            anything catches your eye, the current catalogue is here:
          </p>

          <p style={{ textAlign: "center" as const, margin: "28px 0 24px 0" }}>
            <a
              href={collectionsUrl}
              style={{
                display: "inline-block",
                backgroundColor: palette.ink,
                color: palette.bg,
                padding: "12px 28px",
                fontFamily: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textDecoration: "none",
                borderRadius: 999,
              }}
            >
              See the collections
            </a>
          </p>

          {hasGift && (
            <div style={styles.giftCard}>
              <p
                style={{
                  ...styles.eyebrow,
                  color: palette.inkMuted,
                  margin: "0 0 14px 0",
                }}
              >
                A small note from the estate
              </p>
              <p
                style={{
                  ...styles.body,
                  color: palette.ink,
                  margin: "0 0 14px 0",
                }}
              >
                A small thank-you from the estate, for your first edition.{" "}
                {thankYouValue} towards any print, with our warmth.
              </p>
              <code style={styles.code}>{thankYouCode}</code>
              <p style={{ ...styles.small, margin: 0 }}>
                Apply at checkout. Valid for one year — until {thankYouExpiry}.
              </p>
            </div>
          )}

          <hr style={styles.divider} />

          <p style={styles.body}>
            If at any point you'd rather not hear from us, a single reply to
            this email saying so is enough — we read everything ourselves.
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
            The Art of Stephen Meakin · Lewes, East Sussex
          </p>
        </div>
      </body>
    </html>
  );
};
