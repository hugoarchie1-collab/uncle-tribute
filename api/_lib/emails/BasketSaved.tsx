/**
 * Saved-basket email — sent when a browser-side viewer asks the estate to
 * email them their current basket so they can pick it up from any device.
 *
 * This is the "tone-appropriate abandoned-basket" play: instead of tracking
 * the visitor server-side (no DB on the project) and bombing their inbox
 * with a recovery sequence, we offer a quiet one-shot affordance on the
 * basket page that says "email this to me" and let the buyer save it
 * themselves. The basket page has a discreet "Save your basket" form +
 * an exit-intent toast (see ExitSaveBasket.tsx) that surfaces the same
 * action.
 *
 * Voice / palette match OrderConfirmation.tsx; gift card omitted (this is
 * a utility email, not a sales hand-off — saving the basket without buying
 * is not a milestone we reward). The Welcome email already carries any
 * first-time discount; layering one here would make us look pushy.
 *
 * Self-contained; inline styles only. Gotcha #5.
 */

import { palette, styles } from "./styles.js";

export interface BasketSavedEmailProps {
  /** Optional first name from the basket page input. */
  buyerName?: string | null;
  /** Pretty rendered lines of the basket (title + colourway + size + price). */
  lines: Array<{
    title: string;
    colourway: string;
    size: string;
    price: string;
  }>;
  /** Pre-formatted subtotal, e.g. "£360.00". */
  subtotal: string;
  /** Deep link back to /basket so the buyer can continue checkout. */
  basketUrl: string;
  /** Estate contact email shown in the footer. */
  estateEmail: string;
}

const firstName = (name?: string | null): string => {
  if (!name) return "there";
  const trimmed = name.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
};

export const BasketSavedEmail = ({
  buyerName,
  lines,
  subtotal,
  basketUrl,
  estateEmail,
}: BasketSavedEmailProps) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="dark only" />
        <meta name="supported-color-schemes" content="dark only" />
        <title>Your basket — The Art of Stephen Meakin</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,500&family=Inter:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={styles.page}>
        <div style={styles.shell}>
          <p style={styles.eyebrow}>The Mandala Company · The estate of Stephen Meakin</p>
          <h1 style={styles.heading}>Your basket, {firstName(buyerName)}.</h1>
          <p style={styles.body}>
            Here are the prints you set aside on the estate website. They live
            in this email now — open it on whichever device you'd like to use
            for checkout, follow the link, and you can pick up where you left
            off. The basket itself sits in your browser, so it will quietly
            wait until you're ready.
          </p>

          <hr style={styles.divider} />

          <p style={styles.eyebrow}>Your basket</p>
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
                <p style={styles.orderMeta}>{line.size}</p>
                <p
                  style={{
                    ...styles.orderMeta,
                    marginTop: 4,
                    color: palette.ink,
                  }}
                >
                  {line.price}
                </p>
              </div>
            ))}
            <hr style={{ ...styles.divider, margin: "18px 0 12px 0" }} />
            <p
              style={{
                ...styles.orderRow,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  color: palette.inkMuted,
                  letterSpacing: "0.18em",
                  fontSize: 11,
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Subtotal
              </span>
              <strong style={{ color: palette.ink, fontSize: 16 }}>
                {subtotal}
              </strong>
            </p>
            <p style={{ ...styles.small, margin: "8px 0 0 0" }}>
              Shipping calculated at checkout. UK £15 · Europe £35 · Worldwide £60.
            </p>
          </div>

          <p style={{ textAlign: "center" as const, margin: "28px 0 24px 0" }}>
            <a
              href={basketUrl}
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
              Open your basket
            </a>
          </p>

          <p style={styles.body}>
            Each print is individually made to order at a small UK atelier and
            hand-signed on behalf of the estate. If a colourway sells out
            between now and your visit, the basket will quietly drop the line
            and the rest will be waiting.
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
