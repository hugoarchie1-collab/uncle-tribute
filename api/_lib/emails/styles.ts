/**
 * Shared inline styles for transactional emails.
 *
 * Email clients (Gmail, Outlook, Apple Mail) don't reliably support Tailwind,
 * external stylesheets, or even <style> blocks — so every visual decision has
 * to be a per-element inline `style` attribute. We keep these objects here so
 * the templates themselves stay readable.
 *
 * Palette mirrors the site (`tailwind.config.ts`):
 *   bg     #0a0908  (near-black)
 *   ink    #ede6d6  (cream)
 *   accent #c97844  (warm orange)
 *
 * NOTE: this file is intentionally tiny and self-contained — gotcha #5 in
 * CLAUDE.md warns about cross-directory imports into /api. Anything imported
 * from outside `/api` is forbidden.
 */

import type { CSSProperties } from "react";

export const palette = {
  bg: "#0a0908",
  ink: "#ede6d6",
  inkSoft: "rgba(237, 230, 214, 0.78)",
  inkMuted: "rgba(237, 230, 214, 0.55)",
  accent: "#c97844",
  divider: "rgba(237, 230, 214, 0.18)",
  surface: "#15120f",
} as const;

// Playfair Display via Google Fonts — wrapped in a serif fallback so clients
// that block remote fonts (most webmail clients do) still render gracefully.
const displayStack = `"Playfair Display", Georgia, "Times New Roman", serif`;
const sansStack = `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;

export const styles: Record<string, CSSProperties> = {
  page: {
    backgroundColor: palette.bg,
    margin: 0,
    padding: "32px 16px",
    fontFamily: sansStack,
    color: palette.ink,
    WebkitFontSmoothing: "antialiased",
  },
  shell: {
    maxWidth: 560,
    margin: "0 auto",
    backgroundColor: palette.bg,
    padding: 0,
  },
  eyebrow: {
    fontFamily: sansStack,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.34em",
    textTransform: "uppercase",
    color: palette.accent,
    margin: "0 0 18px 0",
  },
  heading: {
    fontFamily: displayStack,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    fontSize: 36,
    lineHeight: 1.1,
    color: palette.ink,
    margin: "0 0 24px 0",
  },
  subheading: {
    fontFamily: displayStack,
    fontWeight: 700,
    letterSpacing: "-0.01em",
    fontSize: 20,
    lineHeight: 1.25,
    color: palette.ink,
    margin: "32px 0 12px 0",
  },
  body: {
    fontFamily: sansStack,
    fontSize: 15,
    lineHeight: 1.7,
    color: palette.inkSoft,
    margin: "0 0 16px 0",
  },
  small: {
    fontFamily: sansStack,
    fontSize: 12,
    lineHeight: 1.65,
    color: palette.inkMuted,
    margin: "0 0 10px 0",
  },
  divider: {
    border: 0,
    borderTop: `1px solid ${palette.divider}`,
    margin: "28px 0",
  },
  card: {
    backgroundColor: palette.surface,
    border: `1px solid ${palette.divider}`,
    borderRadius: 4,
    padding: "20px 22px",
    margin: "20px 0",
  },
  // Stand-out card for the thank-you offer code — heavier weight on the code
  // glyph itself, accent border so it reads as a gift not a coupon.
  giftCard: {
    backgroundColor: palette.surface,
    border: `1px solid ${palette.accent}`,
    borderRadius: 4,
    padding: "24px 22px",
    margin: "28px 0",
    textAlign: "center" as const,
  },
  code: {
    fontFamily: `"SF Mono", "Menlo", "Consolas", monospace`,
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: "0.22em",
    color: palette.accent,
    margin: "8px 0 12px 0",
    display: "block",
  },
  orderRow: {
    fontFamily: sansStack,
    fontSize: 14,
    lineHeight: 1.55,
    color: palette.ink,
    margin: "0 0 4px 0",
  },
  orderMeta: {
    fontFamily: sansStack,
    fontSize: 12,
    color: palette.inkMuted,
    margin: 0,
  },
  signoff: {
    fontFamily: displayStack,
    fontStyle: "italic" as const,
    fontSize: 16,
    color: palette.ink,
    margin: "24px 0 4px 0",
  },
  footer: {
    fontFamily: sansStack,
    fontSize: 11,
    lineHeight: 1.7,
    color: palette.inkMuted,
    textAlign: "center" as const,
    margin: "32px 0 0 0",
  },
  link: {
    color: palette.accent,
    textDecoration: "underline",
  },
};
