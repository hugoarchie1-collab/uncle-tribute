/**
 * MemorySubmitted — the internal notification the estate receives when a
 * visitor leaves a memory on /memories. Sent to the estate inbox by
 * /api/memories-submit (the visitor does NOT receive this).
 *
 * Memories now AUTO-PUBLISH when they pass OpenAI moderation and carry no
 * image; this email tells the family which happened. Two jobs:
 *   1. Let Hugo read the memory in full, in the inbox, in the estate's palette.
 *   2. State clearly whether it went LIVE automatically or is HELD for review
 *      — and in the held case, still provide the ready-to-paste
 *      `src/data/memories.ts` object as the manual fallback path.
 *
 * Inline styles only (webmail clients strip everything else) — same reasoning
 * as the other templates. Self-contained: imports only from ./styles.js
 * (gotcha #5 in CLAUDE.md — no imports outside /api).
 */

import { palette, styles } from "./styles.ts";

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
  /** True if the memory auto-published to the live wall. */
  published?: boolean;
  /** If held (not published), the human-readable reason. */
  holdReason?: string;
  /** Whether the visitor attached an image. */
  hasImage?: boolean;
  /** Whether the image is attached to THIS email (vs. failed to decode). */
  imageAttached?: boolean;
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
  published = false,
  holdReason,
  hasImage = false,
  imageAttached = false,
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
          <p style={styles.eyebrow}>
            Book of Memories · {published ? "Published" : "Held for review"}
          </p>
          <h1 style={styles.heading}>A memory of Steve.</h1>

          {/* Status banner — live, or held with the reason. */}
          <div
            style={{
              ...styles.card,
              border: `1px solid ${published ? palette.accent : palette.divider}`,
              borderLeft: `3px solid ${published ? palette.accent : palette.inkMuted}`,
              margin: "0 0 8px 0",
            }}
          >
            {published ? (
              <p style={{ ...styles.body, margin: 0, color: palette.ink }}>
                <strong>This memory is now live</strong> on Steve's wall — it passed
                moderation automatically, so there's nothing you need to do. If you'd
                ever like to take it down, just let me know.
              </p>
            ) : (
              <p style={{ ...styles.body, margin: 0, color: palette.ink }}>
                <strong>This memory is being held</strong> — it is <em>not</em> public
                yet.{holdReason ? ` ${holdReason}` : ""} Review it below, and if you're
                happy, publish it manually (paste the ready-made entry into{" "}
                <code>src/data/memories.ts</code> and deploy).
              </p>
            )}
          </div>

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
            {hasImage ? (
              <p style={{ ...styles.small, margin: "0 0 12px 0", color: palette.inkSoft }}>
                {imageAttached
                  ? "A photo is attached to this email. If you publish this memory, upload the photo and add its URL to the entry below."
                  : "A photo was submitted but couldn't be attached (unsupported format / too large) — check the Vercel logs."}
              </p>
            ) : null}
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

          <p style={styles.subheading}>
            {published ? "If you ever need to re-add it manually" : "To publish this"}
          </p>
          <p style={styles.small}>
            Paste this at the top of the <code>MEMORIES</code> array in{" "}
            <code>src/data/memories.ts</code>, then commit &amp; push
            {published ? " (only needed if you move off auto-publish)" : ""}:
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
