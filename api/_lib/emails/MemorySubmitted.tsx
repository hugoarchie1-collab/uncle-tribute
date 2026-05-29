/**
 * MemorySubmitted — the internal notification the estate receives when a
 * visitor leaves a memory on /memories. Sent to the estate inbox by
 * /api/memories-submit (the visitor does NOT receive this).
 *
 * Two jobs:
 *   1. Let Hugo read the memory in full, in the inbox, in the estate's palette.
 *   2. Make approving it a copy-paste: the `pasteEntry` block is a ready-made
 *      `src/data/memories.ts` object. Paste it at the top of MEMORIES, commit,
 *      deploy — and it's live. Nothing publishes until that deliberate step.
 *
 * Inline styles only (webmail clients strip everything else) — same reasoning
 * as the other templates. Self-contained: imports only from ./styles.js
 * (gotcha #5 in CLAUDE.md — no imports outside /api).
 */

import { palette, styles } from "./styles.js";

export interface MemorySubmittedProps {
  /** Submitter's name. */
  name: string;
  /** How they knew Steve (optional). */
  relationship?: string;
  /** Where they're writing from (optional). */
  location?: string;
  /** Reply-to email if they left one (optional). */
  email?: string;
  /** The memory, paragraphs separated by blank lines. */
  message: string;
  /** Human-readable submission time, e.g. "29 May 2026, 14:32". */
  submittedAt: string;
  /** Ready-to-paste src/data/memories.ts object (already formatted). */
  pasteEntry: string;
  /** Estate inbox shown in the footer. */
  estateEmail: string;
}

export const MemorySubmitted = ({
  name,
  relationship,
  location,
  email,
  message,
  submittedAt,
  pasteEntry,
  estateEmail,
}: MemorySubmittedProps) => {
  const paragraphs = message.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const meta = [relationship, location].filter(Boolean).join(" · ");

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="dark only" />
        <meta name="supported-color-schemes" content="dark only" />
        <title>A new memory of Steve</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,500&family=Inter:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={styles.page}>
        <div style={styles.shell}>
          <p style={styles.eyebrow}>Book of Memories · New submission</p>
          <h1 style={styles.heading}>A memory of Steve.</h1>
          <p style={styles.body}>
            Someone has left a memory on the wall. It is <strong>not</strong> public
            yet — review it below, and if you'd like to publish it, paste the ready-made
            entry into <code>src/data/memories.ts</code> and deploy.
          </p>

          {/* The memory itself, in the same accent-bordered register the site
              uses for quotes. */}
          <div
            style={{
              ...styles.card,
              borderLeft: `2px solid ${palette.accent}`,
            }}
          >
            {paragraphs.map((p, i) => (
              <p
                key={i}
                style={{
                  ...styles.body,
                  color: palette.ink,
                  margin: i === paragraphs.length - 1 ? "0 0 14px 0" : "0 0 14px 0",
                }}
              >
                {p}
              </p>
            ))}
            <p style={{ ...styles.small, margin: 0, color: palette.inkSoft }}>
              — {name}
              {meta ? ` · ${meta}` : ""}
            </p>
          </div>

          <p style={styles.small}>
            Submitted {submittedAt}
            {email ? (
              <>
                {" · "}
                <a href={`mailto:${email}`} style={styles.link}>
                  {email}
                </a>{" "}
                (reply to thank them)
              </>
            ) : (
              " · no email left"
            )}
          </p>

          <hr style={styles.divider} />

          <p style={styles.subheading}>To publish this</p>
          <p style={styles.small}>
            Paste this at the top of the <code>MEMORIES</code> array in{" "}
            <code>src/data/memories.ts</code>, then commit &amp; push:
          </p>
          <pre
            style={{
              backgroundColor: palette.surface,
              border: `1px solid ${palette.divider}`,
              borderRadius: 4,
              padding: "16px 18px",
              margin: "12px 0 0 0",
              fontFamily: `"SF Mono", "Menlo", "Consolas", monospace`,
              fontSize: 12.5,
              lineHeight: 1.6,
              color: palette.inkSoft,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {pasteEntry}
          </pre>

          <hr style={styles.divider} />

          <p style={styles.footer}>
            Book of Memories · The Art of Stephen Meakin
            <br />
            <a href={`mailto:${estateEmail}`} style={styles.link}>
              {estateEmail}
            </a>
          </p>
        </div>
      </body>
    </html>
  );
};
