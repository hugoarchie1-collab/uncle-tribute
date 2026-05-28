/**
 * Order shipped email — sent MANUALLY by Hugo once the print leaves Point 101.
 *
 * STATUS: SCAFFOLD.
 * This template is wired enough to render but is NOT triggered automatically.
 * The intended trigger is a small admin endpoint (TODO below) that Hugo hits
 * with the order reference + tracking URL + carrier, e.g.:
 *
 *   POST /api/admin/order-shipped
 *     { sessionId, trackingUrl, carrier, dispatchedAt }
 *
 * That endpoint isn't built yet — for the initial launch Hugo sends shipping
 * notifications by hand from his own inbox. Building it later is a small lift:
 * fetch the Stripe session by id (for buyer email + line items), render this
 * template with the tracking info, send via Resend. See the matching TODO in
 * api/stripe-webhook.ts and the "What's pending / next" list in CLAUDE.md.
 */

import { palette, styles } from "./styles";

export interface OrderShippedProps {
  /** Buyer first name; falls back to "there". */
  buyerName?: string | null;
  /** Display reference (truncated session id). */
  orderRef: string;
  /** One row per dispatched line. Carrier may differ per line in future. */
  lines: Array<{ title: string; colourway: string }>;
  /** Carrier display name, e.g. "Royal Mail Tracked 48". */
  carrier: string;
  /** Tracking URL — opens in the buyer's browser. */
  trackingUrl: string;
  /** Human-readable dispatch date, e.g. "29 May 2026". */
  dispatchedAt: string;
  /** Estate contact email. */
  estateEmail: string;
}

const firstName = (name?: string | null): string => {
  if (!name) return "there";
  const trimmed = name.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
};

export const OrderShipped = ({
  buyerName,
  orderRef,
  lines,
  carrier,
  trackingUrl,
  dispatchedAt,
  estateEmail,
}: OrderShippedProps) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="dark only" />
        <title>Your print has left the studio — The Art of Stephen Meakin</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,500&family=Inter:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={styles.page}>
        <div style={styles.shell}>
          <p style={styles.eyebrow}>The Mandala Company · The estate of Stephen Meakin</p>
          <h1 style={styles.heading}>
            Your print is on its way, {firstName(buyerName)}.
          </h1>
          <p style={styles.body}>
            Your giclée left the atelier on{" "}
            <strong style={{ color: palette.ink }}>{dispatchedAt}</strong> via{" "}
            {carrier}. You can follow it from here:
          </p>

          <div style={{ ...styles.giftCard, textAlign: "left" as const }}>
            <p style={{ ...styles.small, margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.18em" }}>
              Tracking
            </p>
            <a href={trackingUrl} style={{ ...styles.link, fontSize: 15 }}>
              {trackingUrl}
            </a>
          </div>

          <hr style={styles.divider} />

          <p style={styles.eyebrow}>What's shipped</p>
          <div style={styles.card}>
            {lines.map((line, idx) => (
              <p key={idx} style={{ ...styles.orderRow, margin: idx === 0 ? 0 : "8px 0 0 0" }}>
                <strong style={{ color: palette.ink }}>{line.title}</strong>
                {" — "}
                <span style={{ color: palette.inkSoft }}>{line.colourway}</span>
              </p>
            ))}
          </div>

          <p style={styles.body}>
            Each print is packed in archival tissue and shipped in a rigid mailer
            for protection. Once it lands, the colourway will settle into the
            paper over the first few days — give it light, air, and a wall it'll
            be loved on.
          </p>

          <p style={styles.signoff}>With warmth,</p>
          <p style={{ ...styles.body, fontStyle: "italic", margin: 0 }}>
            — Archie, for The Mandala Company
          </p>

          <hr style={styles.divider} />

          <p style={styles.footer}>
            Anything not quite right —{" "}
            <a href={`mailto:${estateEmail}`} style={styles.link}>
              {estateEmail}
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
